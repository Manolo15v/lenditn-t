import { randomUUID } from 'node:crypto'
import { db, items, loans, sessions, users } from '@lendit/db'
import { inArray } from 'drizzle-orm'
import { afterEach } from 'vitest'
import { app } from './app.ts'

// Shared harness for the route suites. Everything here exists because both
// suites need it and getting it subtly wrong is silent: the teardown order, the
// cookie extraction, and the fact that a request without a body must not carry
// a content-type header.

// Re-exported so a suite needs one import to gate itself, not two.
export { databaseIsReachable } from '@lendit/db/testing'

export type SessionUserBody = { id: string; name: string; email: string; createdAt: string }

export type ItemBody = {
  id: string
  ownerId: string
  ownerName: string
  name: string
  description: string | null
  category: string | null
  pricePerDayCents: number
  createdAt: string
  archivedAt: string | null
  isAvailable: boolean
}

// Routes are exercised through app.request, not a listening server: same
// middleware chain and same validators, no port to bind.
export const send = (method: string, path: string, body?: unknown, cookie?: string) =>
  app.request(path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

export const json = async <T>(res: Response) => (await res.json()) as T

export const cookieFrom = (res: Response) => res.headers.get('set-cookie') ?? ''

// Just the name=value pair: the rest of Set-Cookie is flags, and sending them
// back as a Cookie header is not what a browser does.
export const tokenFrom = (res: Response) => cookieFrom(res).split(';')[0] ?? ''

export const freshEmail = () => `${randomUUID()}@uni.edu`

type SignupOverrides = Partial<Record<'name' | 'email' | 'password', string>>

/**
 * Registers an afterEach that deletes everything the test made. Call it once at
 * the top of a describe-less scope; the returned helpers track their own rows.
 */
export function useFixtures() {
  const userIds: string[] = []
  const itemIds: string[] = []
  const loanIds: string[] = []

  afterEach(async () => {
    // Strict child-to-parent order. Every FK in this schema is ON DELETE
    // RESTRICT, so a row left behind blocks its parent instead of cascading —
    // and the failure surfaces as a confusing 23001 in an unrelated test.
    const [l, i, u] = [loanIds.splice(0), itemIds.splice(0), userIds.splice(0)]

    if (l.length) await db.delete(loans).where(inArray(loans.id, l))
    if (i.length) await db.delete(items).where(inArray(items.id, i))
    if (u.length) {
      await db.delete(sessions).where(inArray(sessions.userId, u))
      await db.delete(users).where(inArray(users.id, u))
    }
  })

  async function signup(overrides: SignupOverrides = {}) {
    const body = { name: 'Ana Ruiz', email: freshEmail(), password: 'correct-horse', ...overrides }
    const res = await send('POST', '/api/auth/signup', body)

    // Clone before reading: the caller still needs an unconsumed body.
    if (res.status === 201) {
      const { user } = await json<{ user: SessionUserBody }>(res.clone())
      userIds.push(user.id)
    }

    return { res, cookie: tokenFrom(res), ...body }
  }

  /** Signs up and returns the parts a test that only needs an actor cares about. */
  async function actor(overrides: SignupOverrides = {}) {
    const { res, cookie } = await signup(overrides)
    const { user } = await json<{ user: SessionUserBody }>(res)
    return { cookie, user }
  }

  async function createItem(cookie: string, body: Record<string, unknown> = {}) {
    const res = await send('POST', '/api/items', { name: 'TI-84 Plus', ...body }, cookie)

    if (res.status === 201) {
      const { item } = await json<{ item: ItemBody }>(res.clone())
      itemIds.push(item.id)
    }

    return res
  }

  /** The 201 path, unwrapped — most tests want the row, not the response. */
  async function item(cookie: string, body: Record<string, unknown> = {}) {
    const res = await createItem(cookie, body)
    return (await json<{ item: ItemBody }>(res)).item
  }

  /**
   * Loans are inserted directly: M4 owns the routes that create them, and the
   * availability rule has to be testable before they exist.
   */
  async function insertLoan(values: Omit<typeof loans.$inferInsert, 'id'>) {
    const [row] = await db.insert(loans).values(values).returning({ id: loans.id })
    if (!row) throw new Error('loan insert returned no row')
    loanIds.push(row.id)
    return row
  }

  return { signup, actor, createItem, item, insertLoan, userIds, itemIds, loanIds }
}
