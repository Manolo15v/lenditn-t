# Lendit

A peer-to-peer app for students to lend each other physical things — calculators, lab coats,
drafting kits, soldering irons — with a daily rental fee.

The problem it solves isn't matching people to objects. It's the absence of a record: who has my
thing, when is it coming back, and did they pay.

## Requirements

| Tool | Version | Why |
|---|---|---|
| Node | 22+ | `--env-file` and native TS-adjacent tooling |
| pnpm | 10+ | workspaces; the version is pinned in `packageManager` |
| Docker | any | runs Postgres only — OrbStack, Docker Desktop, or Colima all work |
| Tilt | 0.37+ | brings the pieces up in dependency order |

## Running it

```bash
cp .env.example .env
pnpm install
tilt up
```

Then open the Tilt dashboard at **http://localhost:10350** and watch four resources go green in
order: `postgres` → `migrate` → `api` → `web`.

| | |
|---|---|
| App | http://localhost:5173 |
| API | http://localhost:3000/api/health |
| Postgres | `localhost:5433`, user/password/database all `lendit` |
| Tilt | http://localhost:10350 |

`Ctrl-C` stops Tilt; `tilt down` also removes the Postgres container. The `seed` resource is a
manual trigger in the Tilt UI — a "reset data" button.

Postgres is on **5433**, not 5432, so it never collides with a Postgres already installed on your
machine.

### Without Tilt

```bash
docker compose up -d      # postgres
pnpm db:push              # apply the schema
pnpm dev:api              # http://localhost:3000
pnpm dev:web              # http://localhost:5173
```

## Scripts

| Command | Does |
|---|---|
| `pnpm lint` | Biome — formatting and lint, read-only |
| `pnpm format` | Biome with `--write`, fixes what it can |
| `pnpm typecheck` | `tsc --noEmit` in every workspace |
| `pnpm test` | Vitest across all packages |
| `pnpm db:push` | Apply the schema to the dev database |
| `pnpm db:studio` | Drizzle Studio, a browser UI over the data |
| `pnpm db:seed` | Wipe and reseed |

## Layout

```
packages/db       drizzle schema, client, generated validation, constraint tests
packages/shared   code shared by api and web — depends on nothing
apps/api          hono; serves the built client in production
apps/web          vite + react
```

`web` must never depend on `packages/db`, or the Postgres driver ends up in the browser bundle.
pnpm's strict `node_modules` enforces it at install time. `web` gets the API's types through a
**type-only** import of `AppType`, which costs zero bytes at runtime.

Internal packages have **no build step** — their `exports` point at `./src/index.ts` and Vite and
tsx compile across workspace boundaries directly.

## Tests

```bash
pnpm test
```

Three suites. Two are pure — Zod input parsing, and argon2 hashing. The third talks to Postgres and
asserts the things the database itself guarantees:

- a second `active` loan on one item is rejected (`23505`)
- unlimited *pending* requests on one item are accepted — requesting is not reserving
- `ANA@uni.edu` collides with `ana@uni.edu`
- negative prices and impossible dates are rejected (`23514`)
- deleting a user who owns rows is rejected (`23001`)
- availability computes from active loans rather than a stored column

Every case runs inside a transaction that is rolled back, so pointing the suite at your development
database will not eat your data. Without `DATABASE_URL` set, that suite skips itself rather than
failing — which is why CI applies the schema before running tests.

## Design rules

Five decisions hold the rest of the app together. `HANDOFF.md` has the reasoning.

1. **Current state is derived; historical facts are stored.** No `available` column, no `overdue`
   flag. An item is available when it has no active loan. The inverse applies to money: the daily
   price is snapshotted onto the loan, and the total is frozen at return.
2. **The one-active-loan rule lives in Postgres.** A partial unique index on
   `loans (item_id) where status = 'active'` makes a double-booking physically un-insertable.
   Application-level checks have a race window; a constraint has none.
3. **Money is integer cents**, everywhere, formatted only at display time.
4. **No roles.** Authorization follows ownership.
5. **Requesting is not reserving.** Approval allocates, and declines its siblings in the same
   transaction.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: lint, typecheck,
schema push against a Postgres service container, tests, and a production build of the client.
