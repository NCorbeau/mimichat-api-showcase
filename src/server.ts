import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { MimiChatAuthorizer } from "./auth/MimiChatAuthorizer";
import { FirebaseService, MockFirebase } from "./mocks/MockFirebase";
import { AuthenticationError, MondayService, MockMonday } from "./mocks/MockMonday";

const MAX_BODY_BYTES = 4096;
const MAX_FIELD_LENGTH = 2048;

export interface ServerConfig {
  allowedOrigins: readonly string[];
  allowedRedirectUris: readonly string[];
}

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function validUrl(value: string, originOnly: boolean): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash || !url.hostname) return false;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname))) return false;
    if (originOnly) return value === url.origin && url.pathname === "/" && !url.search;
    return value === url.href;
  } catch { return false; }
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim());
  const allowedRedirectUris = (env.ALLOWED_REDIRECT_URIS ?? "http://localhost:3000/oauth/callback").split(",").map((s) => s.trim());
  if (!allowedOrigins.length || allowedOrigins.some((url) => !validUrl(url, true))) throw new Error("Invalid ALLOWED_ORIGINS");
  if (!allowedRedirectUris.length || allowedRedirectUris.some((url) => !validUrl(url, false))) throw new Error("Invalid ALLOWED_REDIRECT_URIS");
  return { allowedOrigins, allowedRedirectUris };
}

function json(response: ServerResponse, status: number, data: object): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(data));
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new RequestError(415, "Expected application/json");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new RequestError(413, "Request too large");
    chunks.push(buffer);
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (body === null || Array.isArray(body) || typeof body !== "object") throw new Error("Not an object");
    return body as Record<string, unknown>;
  } catch { throw new RequestError(400, "Invalid JSON object"); }
}

function fields(body: Record<string, unknown>, expected: readonly string[]): string[] {
  if (Object.keys(body).length !== expected.length || Object.keys(body).some((key) => !expected.includes(key))) {
    throw new RequestError(400, "Invalid request fields");
  }
  return expected.map((key) => {
    const value = body[key];
    if (typeof value !== "string" || !value.trim() || value.length > MAX_FIELD_LENGTH) {
      throw new RequestError(400, `Invalid ${key}`);
    }
    return value;
  });
}

export function createServer(
  config: ServerConfig = configFromEnv(),
  monday: MondayService = new MockMonday(),
  firebase: FirebaseService = new MockFirebase()
) {
  const authorizer = new MimiChatAuthorizer(monday, firebase);
  return createHttpServer(async (request, response) => {
    response.setHeader("Vary", "Origin");
    response.setHeader("Cache-Control", "no-store");
    const origin = request.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      json(response, 403, { error: "Origin not allowed" });
      return;
    }
    if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
    if (request.method === "OPTIONS") {
      response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.statusCode = 204;
      response.end();
      return;
    }
    if (request.url !== "/auth" && request.url !== "/mondayAuth") {
      json(response, 404, { error: "Not found" });
      return;
    }
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST, OPTIONS");
      json(response, 405, { error: "Method not allowed" });
      return;
    }
    try {
      const body = await readBody(request);
      if (request.url === "/mondayAuth") {
        const [code, redirectUri] = fields(body, ["code", "redirectUri"]);
        if (!config.allowedRedirectUris.includes(redirectUri)) {
          json(response, 400, { error: "Redirect URI not allowed" });
          return;
        }
        const mondayToken = await monday.exchangeCode(code, redirectUri);
        const result = await authorizer.authorize(mondayToken);
        json(response, 200, { uid: result.userId, mimiToken: result.mimiToken });
      } else {
        const [token] = fields(body, ["token"]);
        const result = await authorizer.authorize(token);
        json(response, 200, { uid: result.userId, mimiToken: result.mimiToken });
      }
    } catch (error) {
      if (error instanceof RequestError) json(response, error.status, { error: error.message });
      else if (error instanceof AuthenticationError) json(response, 401, { error: "Authentication failed" });
      else json(response, 500, { error: "Internal error" });
      // Never log request bodies, Monday tokens, OAuth codes, or exception details.
    }
  });
}
