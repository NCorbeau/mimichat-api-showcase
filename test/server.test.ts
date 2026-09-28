import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createServer, configFromEnv } from "../src/server";

const server = createServer(configFromEnv({
  ALLOWED_ORIGINS: "http://localhost:3000",
  ALLOWED_REDIRECT_URIS: "http://localhost:3000/oauth/callback"
}));
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });

async function post(path: string, body: unknown, origin?: string) {
  return fetch(baseUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify(body)
  });
}

test("valid Monday token creates the account-scoped Firebase user", async () => {
  const response = await post("/auth", { token: "demo-monday-token" }, "http://localhost:3000");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    uid: "monday@7@42", mimiToken: "mock-firebase-token:monday@7@42"
  });
});

test("existing user can authenticate again", async () => {
  const response = await post("/auth", { token: "demo-monday-token" });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { uid: string }).uid, "monday@7@42");
});

test("OAuth code exchange succeeds only for an allowlisted redirect and hides the Monday token", async () => {
  const response = await post("/mondayAuth", {
    code: "demo-valid-code", redirectUri: "http://localhost:3000/oauth/callback"
  });
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /mock-firebase-token/);
  assert.doesNotMatch(body, /demo-monday-token|demo-valid-code/);
});

test("invalid Monday token and invalid OAuth code are rejected without echoing them", async () => {
  const badToken = "rejected-token-marker";
  const auth = await post("/auth", { token: badToken });
  assert.equal(auth.status, 401);
  assert.doesNotMatch(await auth.text(), /rejected-token-marker/);
  const oauth = await post("/mondayAuth", {
    code: "rejected-code-marker", redirectUri: "http://localhost:3000/oauth/callback"
  });
  assert.equal(oauth.status, 401);
  assert.doesNotMatch(await oauth.text(), /rejected-code-marker/);
});

test("unlisted redirect, lookalike redirect, and unlisted origin are rejected", async () => {
  for (const redirectUri of [
    "https://attacker.example/callback",
    "http://localhost:3000/oauth/callback?next=https://attacker.example"
  ]) {
    const response = await post("/mondayAuth", { code: "demo-valid-code", redirectUri });
    assert.equal(response.status, 400);
  }
  const response = await post("/auth", { token: "demo-monday-token" }, "https://attacker.example");
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("invalid fields, content type, and method are rejected", async () => {
  assert.equal((await post("/auth", { token: "" })).status, 400);
  assert.equal((await post("/auth", { token: "demo-monday-token", extra: true })).status, 400);
  assert.equal((await fetch(baseUrl + "/auth", { method: "POST", body: "not json" })).status, 415);
  assert.equal((await fetch(baseUrl + "/auth", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{broken"
  })).status, 400);
  assert.equal((await fetch(baseUrl + "/auth")).status, 405);
});

test("CORS preflight allows only the configured origin", async () => {
  const allowed = await fetch(baseUrl + "/auth", { method: "OPTIONS", headers: { Origin: "http://localhost:3000" } });
  assert.equal(allowed.status, 204);
  const denied = await fetch(baseUrl + "/auth", { method: "OPTIONS", headers: { Origin: "https://attacker.example" } });
  assert.equal(denied.status, 403);
});

test("startup rejects unsafe origin and redirect configuration", () => {
  assert.throws(() => configFromEnv({
    ALLOWED_ORIGINS: "*", ALLOWED_REDIRECT_URIS: "http://localhost:3000/oauth/callback"
  }), /ALLOWED_ORIGINS/);
  assert.throws(() => configFromEnv({
    ALLOWED_ORIGINS: "http://localhost:3000", ALLOWED_REDIRECT_URIS: "http://attacker.example/callback"
  }), /ALLOWED_REDIRECT_URIS/);
});
