# API Key Access

This project now supports API-key based authentication for external API requests.

## Overview

- API keys are created by authenticated admin users (`admin`, `super_admin`, `ultra_admin`).
- The server stores only a SHA-256 hash of the API key.
- API keys can be passed in either:
  - `Authorization: Bearer <token>`
  - `x-api-key: <token>`

## Available endpoints

### Protected external endpoint

- `GET /api/protected/ping`
- `POST /api/protected/echo`

These routes are protected by API key middleware and are useful for external integrations.

## Generate API keys

API key generation is done through the existing tRPC router at `apiKeys.create`.
This is available to admin, super_admin, and ultra_admin users.

### Example using tRPC client

```js
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

const client = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
    }),
  ],
});

const response = await client.apiKeys.create.mutate({
  label: 'integration-key',
  expiresInDays: 30,
});

console.log('API key token (store securely):', response.token);
```

> The returned `token` is shown only once. Store it securely, because only the hashed value is kept in the database.

## List API keys

Use the `apiKeys.list` tRPC procedure to see keys created by the current user.

```js
const keys = await client.apiKeys.list.query();
console.log(keys);
```

## Revoke an API key

Use the `apiKeys.revoke` procedure.

```js
await client.apiKeys.revoke.mutate({ id: 123 });
```

## Call the external protected endpoint

### Using `Authorization` header

```bash
curl -H "Authorization: Bearer YOUR_API_KEY_TOKEN" \
  http://localhost:3000/api/protected/ping
```

### Using `x-api-key` header

```bash
curl -H "x-api-key: YOUR_API_KEY_TOKEN" \
  http://localhost:3000/api/protected/ping
```

### Example POST request

```bash
curl -X POST http://localhost:3000/api/protected/echo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_TOKEN" \
  -d '{"message":"hello"}'
```

## Notes

- API keys are only valid while not revoked and before their expiration date.
- The API key middleware will reject revoked or expired keys with HTTP `401 Unauthorized`.
- If you want API-key-only enforcement on an express route, use the `requireApiKey` middleware in `server/_core/apiKeyAuth.ts`.
