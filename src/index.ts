import { createServer, configFromEnv } from "./server";

const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
createServer(configFromEnv()).listen(port, () => {
  console.log(`MimiChat mock API listening on http://localhost:${port}`);
});
