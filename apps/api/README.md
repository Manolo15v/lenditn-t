# `@lendit/api`

Hono HTTP server for Lendit. It authenticates students, lists items to lend, and stores item photos. Postgres and Valkey are reached through `@lendit/db` and `@lendit/cache`; this package owns the HTTP surface only.

`src/server.ts` binds `app.fetch` with `@hono/node-server` on `API_PORT` (default 3000) and, once, deletes expired session rows. A failed purge does not stop the process.

`src/app.ts` is the typed app (`AppType`). Every request runs `attachUser` first, then:

| Path | Handler |
|---|---|
| `/api/health` | `select 1` plus cache status. `200 { status: "ok" }` or `503 { status: "degraded" }` |
| `/api/auth/*` | signup, login, logout, `/me` |
| `/api/items/*` | catalogue, mutations, photos |

## Auth (`src/routes/auth.ts`)

Sessions are cookies named `lendit_session` (`src/lib/session.ts`): 32 random bytes in the cookie, SHA-256 of that token in the `sessions` table, 30-day TTL. Logout deletes the row and writes a cache tombstone so a concurrent resolve cannot re-cache the session.

| Method | Path | Body | Result |
|---|---|---|---|
| `POST` | `/api/auth/signup` | `{ name, email, password }` | `201` user + session. `409 email_taken` on unique email |
| `POST` | `/api/auth/login` | `{ email, password }` | `200` user + session. `401 invalid_credentials` |
| `POST` | `/api/auth/logout` | — | `{ ok: true }`, cookie cleared |
| `GET` | `/api/auth/me` | — | `{ user }` or `{ user: null }` |

Passwords are argon2id (`src/lib/password.ts`). Login verifies against a decoy hash when the email is unknown so timing does not leak whether the account exists. `passwordHash` is never returned.

`src/middleware.ts` splits two jobs: `attachUser` always sets `c.get('user')`; `requireUser` returns `401 unauthenticated` if that value is null.

## Items (`src/routes/items.ts`)

JSON bodies are validated with `itemInput` from `@lendit/db/validation` plus the shared category list. `ownerId` is always the session user.

The public item JSON includes `isAvailable` (derived: no `active` loan), ISO dates, and `imageUrl` (`/api/items/:id/image` or `null`). `imagePath` stays off the wire.

| Method | Path | Auth | Behaviour |
|---|---|---|---|
| `GET` | `/api/items` | no | Non-archived catalogue, cached 60s |
| `GET` | `/api/items?mine=true` | yes | That owner's items, including archived |
| `GET` | `/api/items/:id` | no | One item, cached 60s. `404 not_found` |
| `POST` | `/api/items` | yes | Create. Owner from session. `201` |
| `PATCH` | `/api/items/:id` | owner | Edit. `403 not_owner`, `409 archived`, `400` if body empty |
| `POST` | `/api/items/:id/archive` | owner | Sets `archivedAt` once. Browse hides it; `?mine=true` still shows it |
| `GET` | `/api/items/:id/image` | no | WebP bytes, or `404` |
| `POST` | `/api/items/:id/image` | owner | Multipart field `image`. Max 2 MiB |
| `DELETE` | `/api/items/:id/image` | owner | Clears photo |

Writes call `invalidateItems` (`src/lib/item-cache.ts`) so browse and detail caches drop.

## Photos (`src/lib/item-image.ts`)

Accepts JPEG, PNG, or WebP, exactly 800×800, at most 2 MiB. Re-encodes to `{itemId}.webp` under `apps/api/uploads/items`. Rejects with `missing`, `too_large`, `unsupported_type`, `invalid_image`, or `wrong_dimensions`.

## `src/`

```
app.ts              Hono app + AppType
server.ts           listen + session purge
env.ts              AppEnv: Variables.user
middleware.ts       attachUser, requireUser
routes/auth.ts
routes/items.ts
lib/password.ts     argon2id + decoy hash
lib/session.ts      cookie token, digest, cache
lib/item-cache.ts   browse/item keys, invalidate
lib/item-image.ts   validate, store, read, delete
```

`src/*.test.ts` and `src/testing.ts` drive the same `app` through `app.request` (no listening port).
