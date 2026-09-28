# MimiChat API showcase

This is a separate, credential-free demonstration of the 2024 MimiChat authentication service. It retains the recognizable `MimiChatAuthorizer`, `MimiChatUserCreator`, account-scoped `MimiChatUserIdGenerator`, Monday query shapes, and two original API routes. The original repository and its Git history are **not** included.

## Run locally

Requires Node.js 20 or newer. No Monday or Firebase account is needed.

```sh
npm ci
npm run build
npm test
npm start
```

The API listens on `http://localhost:8080`. The default allowed browser origin is `http://localhost:3000`, and the only accepted OAuth redirect is `http://localhost:3000/oauth/callback`. Set `PORT`, `ALLOWED_ORIGINS`, and `ALLOWED_REDIRECT_URIS` as shell environment variables to change the public demo settings; `.env.example` lists them for reference. Origins and redirect URLs are exact allowlists; HTTP is accepted only for local loopback addresses.

Try the original token-authentication route:

```sh
curl -sS -X POST http://localhost:8080/auth \
  -H 'Content-Type: application/json' \
  -d '{"token":"demo-monday-token"}'
```

Try the OAuth-code route:

```sh
curl -sS -X POST http://localhost:8080/mondayAuth \
  -H 'Content-Type: application/json' \
  -d '{"code":"demo-valid-code","redirectUri":"http://localhost:3000/oauth/callback"}'
```

Both routes return a demo UID and a **mock** Firebase token marker. The OAuth route never returns the Monday token. Requests with invalid tokens or codes, unlisted origins or redirects, malformed JSON, extra fields, or wrong methods are rejected. Browser preflight requests use the same origin allowlist. Responses containing tokens use `Cache-Control: no-store`; request values and exception details are not logged.

## What is mocked

- `MockMonday` accepts only the public fixtures `demo-monday-token` and `demo-valid-code`. It returns a fixed, fictional user and makes no network calls.
- `MockFirebase` stores users and profiles in memory. Its `mock-firebase-token:*` value is a marker, not a signed JWT and cannot authenticate against Firebase.
- The process starts with an empty user store; restarting it clears state.

No client ID, client secret, Firebase service account, real account data, or production configuration is needed or included. The source repository had a Monday client secret in its Git history; the owner should **rotate or revoke it if it may still be valid**. This repository starts with fresh history and must never import the original history or credential values.

## Security scope

This is an API example for review, **not production security certified**. It deliberately has no real Monday/Firebase adapters, OAuth state or PKCE flow, durable storage, abuse protection, Firebase security rules, deployment configuration, or production dependency review. Before a real deployment, implement and review those controls and keep all credentials in server-side secret storage. Keep this repository private until its finished content and sensitive-data review are approved for publication.
