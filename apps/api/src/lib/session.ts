import { createHash, randomBytes } from 'node:crypto'
import { db, sessions, users } from '@lendit/db'
import { and, eq, gt, lt } from 'drizzle-orm'

export const SESSION_COOKIE = 'lendit_session'
const TTL_MS = 30 * 24 * 60 * 60 * 1000

// The cookie holds the token; the table holds only its digest. A database dump
// therefore contains no usable session. A fast hash is right here — the token
// is 256 random bits, so there is nothing to brute-force.
const digest = (token: string) => createHash('sha256').update(token).digest('hex')

export type SessionUser = {
  id: string
  name: string
  email: string
  createdAt: string
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + TTL_MS)
  await db.insert(sessions).values({ id: digest(token), userId, expiresAt })
  return { token, expiresAt }
}

export async function resolveSession(token: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, digest(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)

  if (!row) return null
  return { ...row, createdAt: row.createdAt.toISOString() }
}

export async function destroySession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, digest(token)))
}

// Expiry is already enforced at read time, so this only reclaims rows. Returning
// the ids keeps the count typed without reaching into the driver result.
export const purgeExpiredSessions = () =>
  db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id })
