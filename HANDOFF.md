# Lendit — Session Handoff

**Last updated:** 16 Aug 2026
**Repo state:** M0 scaffolded and installed. Workspace, Tilt, Compose, four packages, health endpoint. `pnpm typecheck` and `pnpm --filter @lendit/web build` both pass. The Tilt chain has not been run end-to-end yet — needs the container runtime up.
**Full PRD:** https://claude.ai/code/artifact/2ea6b7b3-f8ad-4404-a1e1-08368179adac

---

## What this is

A peer-to-peer app for students to lend each other physical materials — calculators, lab coats, drafting kits, soldering irons — with a daily rental fee. University elective course project.

The problem isn't matching people to objects. It's the **absence of a record**: who has my thing, when is it coming back, and did they pay.

---

## Decisions already made

Do not re-litigate these. They were settled across several rounds of discussion.

| Area | Decision |
|---|---|
| Lending model | Peer-to-peer with rental fees. Every user is both lender and borrower. |
| Auth | Email + password, server-side sessions. No SSO. |
| Scope | MVP only, sharply bounded. See non-goals below. |
| Language | TypeScript, **English** domain names (`Item`, `Loan`, `User` — not the original `Articulo`). |
| Repo | pnpm workspaces monorepo. |
| Dev env | Tilt + Docker Postgres. |
| Database | Postgres. |
| Schema | Drizzle ORM. |
| Primary keys | **cuid2** (`@paralleldrive/cuid2`), `text` columns, generated in JS via `$defaultFn`. Decided 16 Aug 2026 over Postgres 18's `uuidv7()`. Consequence: no database-side default, so raw SQL inserts must supply an id, and ids are not creation-ordered — use `created_at` to sort. `sessions.id` is exempt: it is a credential, minted with a CSPRNG. |
| API | Hono (typed RPC client). |
| Validation | Zod, in a shared package. |
| Client | Vite + React. |
| Deploy | Single container, API serves the built client. One public URL. |
| Product name | **Lendit** (from the repo name `lenditn't`). |
| Doc language | English. Code stays English regardless. |

---

## The five rules that make it hard to break

These are the load-bearing design decisions. Everything else is negotiable.

### 1. Current state is derived. Historical facts are stored.

There is **no `available` column** and **no `overdue` flag**.

- An item is available ⟺ it has no `active` loan.
- A loan is overdue ⟺ `due_at < now()` and it hasn't been returned.

Both computed at read time. A stored availability flag must be kept in sync by every code path that touches either table, and the day one path forgets, the app says a borrowed item is free. A stored overdue flag is wrong from midnight until some job fixes it.

The **inverse** applies to money: `price_per_day_cents` is snapshotted onto the loan at request time, and `total_cents` is frozen at return. If the total were recomputed from the item's current price, an owner raising their rate would retroactively change what a past borrower owes.

### 2. The one-active-loan rule lives in Postgres, not in code.

```sql
create unique index loans_one_active_per_item
  on loans (item_id) where status = 'active';
```

A partial unique index. A second active loan on the same item is physically impossible to insert. Catch the `23505` unique-violation error and return a 409 → "someone just borrowed this."

This is the only real concurrency hazard in the product. A check-then-insert in application code has a race window no matter how it's written; a constraint has none.

### 3. Money is integer cents. Everywhere.

No float, no double, anywhere in the money path. Format to decimals only at display time.

### 4. No roles. Authorization follows ownership.

No admin, no role column, no permission table. Four predicates:

- You may modify an item if you own it.
- You may approve/decline a request if you own the item.
- You may cancel a request if you made it.
- You may see a loan if you're one of its two parties.

### 5. Requesting is not reserving.

Any number of people can have a pending request on the same item. **Approval** is what allocates it, and approving one request declines all siblings in the same transaction. The alternative (first request locks the item) lets an unresponsive student block an item until you build a timeout to unblock it.

---

## Data model

Four tables. Struck-through fields are deliberately omitted, not forgotten.

```
users     id, name, email (unique, lowercased), password_hash, created_at
          ~~role~~

items     id, owner_id → users, name, description, category,
          price_per_day_cents, created_at, archived_at (nullable)
          ~~available~~

loans     id, item_id → items, borrower_id → users, status,
          price_per_day_cents (snapshot), requested_at, due_at,
          started_at?, returned_at?, total_cents?, settled_at?, note
          ~~overdue~~

sessions  id (random token), user_id → users, created_at, expires_at
```

### Loan lifecycle

```
requested ──approve──> active ──mark returned──> returned ──settle──> settled
    │
    ├──decline (owner)──> declined
    └──cancel (borrower)─> cancelled
```

Nothing leaves `active` except a return — you can't cancel a loan of an object someone is physically holding. Loan rows are never deleted; items are archived, never deleted.

### DB constraints to write

- Partial unique index on `loans(item_id) where status = 'active'`
- Unique index on `lower(users.email)`
- `check (due_at > requested_at)`
- `check (returned_at is null or returned_at >= started_at)`
- `check (price_per_day_cents >= 0)`, same for `total_cents`
- All FKs `on delete restrict`

---

## Monorepo layout

```
lendit/
  pnpm-workspace.yaml
  tsconfig.base.json
  Tiltfile
  docker-compose.yml      # postgres only, host port 5433
  .env                    # one file at root, everything reads it
  packages/
    db/                   # drizzle schema, client, migrations, seed
    shared/               # zod wire schemas — depends on nothing
  apps/
    api/                  # hono
    web/                  # vite + react
```

**Dependency rule:** `web` must NEVER depend on `packages/db`, or the Postgres driver ends up in the browser bundle. pnpm's strict `node_modules` enforces this at install time. `web` imports `shared` normally and gets the API's `AppType` via a **type-only** import.

**No build step for internal packages.** Point their `exports` at `./src/index.ts`, not `./dist`. Vite and tsx compile TS across workspace boundaries directly. This is the biggest iteration-speed decision in the repo and it's free. Only add builds if publishing to npm.

---

## Tilt

Tilt's job here is the **dependency graph of the dev environment**, not containerization. Postgres runs in Docker; everything else runs as a native process for fast HMR.

```python
docker_compose('docker-compose.yml')          # postgres, with healthcheck

local_resource('migrate',
  cmd='pnpm --filter @lendit/db push',
  deps=['packages/db/src/schema.ts'],          # edit schema → auto re-push
  resource_deps=['postgres'])

local_resource('api',
  serve_cmd='pnpm --filter @lendit/api dev',
  readiness_probe=probe(http_get=http_get_action(port=3000, path='/api/health')),
  resource_deps=['migrate'])

local_resource('web',
  serve_cmd='pnpm --filter @lendit/web dev',
  resource_deps=['api'])

local_resource('seed',
  cmd='pnpm --filter @lendit/db seed',
  resource_deps=['migrate'],
  trigger_mode=TRIGGER_MODE_MANUAL, auto_init=False)
```

The two lines that matter: `deps=['schema.ts']` means editing the schema auto-migrates and restarts the API. `resource_deps` means migrations wait for Postgres to be *healthy*, not merely started.

`seed` as a manual resource becomes a "reset data" button in the Tilt UI at `localhost:10350`.

Needs a trivial `GET /api/health` that pings the DB — the readiness probe is what makes the ordering real.

### Drizzle: two modes, don't cross them

- **Dev:** `drizzle-kit push` — diffs schema straight onto the DB, no migration file. This is what Tilt runs.
- **Deployed:** `drizzle-kit generate` to commit a real migration, then `migrate` on boot.

`push` against the deployed database will happily drop columns to make reality match your schema.

### Gotchas

- Don't put `node_modules` or whole directories in Tilt `deps` — restart loops.
- **`push` must be non-interactive.** `strict: true` in `drizzle.config.ts` makes it prompt for confirmation, and a Tilt `local_resource` has no TTY, so the `migrate` resource dies with "Interactive prompts require a TTY". The script is `drizzle-kit push --force`. Safe only because push is dev-only; the deployed path is `generate` + `migrate`.
- **Postgres 18 moved the data directory.** Mount `/var/lib/postgresql`, not `.../data` — the image uses a major-version subdirectory so `pg_upgrade --link` works. The volume is `pg18data`.
- Postgres on host port **5433** so it never collides with an existing local Postgres.
- `local_resource` commands run from the Tiltfile's directory; `pnpm --filter` needs that to be the repo root.
- One `.env` at root, loaded by the processes that need it — `tsx --env-file=../../.env`, and `drizzle.config.ts` resolves it relative to its own URL. **Tilt's `dotenv()` is an extension, not a builtin**; calling it bare fails with `undefined: dotenv`. Nothing in the Tiltfile reads env vars, so it isn't loaded at all.
- `tsconfig.base.json` with `moduleResolution: "bundler"`, each package extends it.

---

## Build order

Ordered so something runnable exists from M0, and the riskiest rule is proven before any UI depends on it.

- [x] **M0 — Monorepo + Tilt.** Postgres up on 5433, schema pushes cleanly.
- [x] **M1 — Schema + constraints.** Four tables live. Nine cases run against the real database on 16 Aug 2026: the second active loan on one item fails `23505`, `ANA@uni.edu` collides with `ana@uni.edu`, all three checks fire, deleting a referenced user fails `23503`, two *pending* requests on one item both succeed, and availability computes correctly as a `not exists` over active loans.
- [ ] **M2 — Accounts.** Sign up, log in, log out. Sessions persist a reload. Hashes only.
- [ ] **M3 — Listings.** Create, edit, archive items. Browse with live availability.
- [ ] **M4 — Borrow loop.** Request, approve, decline, cancel, return. Competing requests resolve correctly.
- [ ] **M5 — Money.** Price snapshot, total frozen on return, settlement recorded, integer cents.
- [ ] **M6 — Views + polish.** My items / borrowing / requests. Works on a phone.
- [ ] **M7 — Deploy.** Public URL, seeded demo data, no setup needed.

Deferred until after M7: text search over items, and the "total owed / owed to me" summary.

---

## Non-goals — do not build these

Each is a plausible feature deliberately excluded. Building any before M7 is scope failure.

Payment processing · ratings/reviews/reputation · in-app messaging · email or push notifications · photos and file uploads · calendar reservations (an item is borrowed *now*, not booked for March) · security deposits, late fees, damage claims · dispute resolution · admin panel · password reset, email verification, SSO · native mobile apps · multi-campus or multi-currency.

**Fees are recorded, not processed.** The app computes what's owed and tracks a `settled_at`; the actual money moves in cash or whatever transfer app the students already use. This single decision is what makes a fee-bearing marketplace finishable in a semester.

---

## Open questions — still unanswered

Each changes something concrete. Get answers before the milestone that needs them.

1. **Should free lending be allowed?** A price of zero is valid data, but if most students expect to lend free, the fee stops being the product's centre and the UI should treat it as optional. *Needed by M3.*
2. **What happens to an overdue loan?** Currently nothing — it's labelled and left alone. Blocking the borrower from new requests would give the label teeth. *Needed by M4.*
3. **Calendar days or 24-hour periods?** Borrowing at 11pm and returning at 1am is either one day or two. Both defensible; the choice must be visible in the UI. *Needed by M5.*
4. **Scoped to one university?** No campus field, so everyone sees everything. Fine for a course project, wrong for real use. Decides whether tenancy is needed later.
5. **Who is the real audience?** If only graded, the deployed URL is enough. If actual students will use it, password reset and email verification stop being acceptable gaps.

---

## Working notes

- **When Manuel asks "how", explain — don't write files.** He wants the reasoning and the design tradeoffs so he can make the call himself. Wait for an explicit "build it" before scaffolding. Answering clarifying questions about a stack is not approval to start building.
- **Don't touch his machine.** No installers, no launching apps, no probing what's installed. Write and verify code; tell him what to start.
- `type.ts` stays deleted. Decided 16 Aug 2026 — the `Articulo` interface is superseded by the English domain model.
- Container runtime is **OrbStack**. Postgres is on host port 5433; Compose project name is pinned to `lendit` because `lenditn't` is not a legal project name.
- Resolved versions run ahead of what the PRD assumed: TypeScript 7, Vite 8, React 19.2, Zod 4, Node 24, drizzle-orm 0.45, Hono 4.13.

### What M0 actually contains

`packages/db/src/schema.ts` is deliberately empty — `drizzle-kit push` against an empty schema is a valid no-op, which is what lets the whole Tilt chain run before M1 exists. `packages/shared/src/index.ts` likewise.

The API splits `app.ts` (routes, exports `AppType`) from `server.ts` (calls `serve`). The split is load-bearing: `web` type-imports `app.ts`, and if the listener lived in the same module a stray value import would boot a server inside the client build.

Verified: the production bundle contains no `postgres`, `drizzle`, or `node:` references. The dependency rule holds.

### First command next session

    tilt up          # then watch localhost:10350

Expect: postgres healthy → migrate (no-op) → api ready on /api/health → web on 5173 showing "api ok · database connected".
