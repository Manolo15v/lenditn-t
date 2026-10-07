import { createHash, randomBytes } from 'node:crypto'
import { cache } from '@lendit/cache'
import { db, sessions, users } from '@lendit/db'
import { and, eq, gt, lt } from 'drizzle-orm'

export const SESSION_COOKIE = 'lendit_session'
const TTL_MS = 30 * 24 * 60 * 60 * 1000
const CACHE_TTL_MS = 5 * 60 * 1000

// The cookie holds the token; the table holds only its digest. A database dump
// therefore contains no usable session. A fast hash is right here — the token
// is 256 random bits, so there is nothing to brute-force.
const digest = (token: string) => createHash('sha256').update(token).digest('hex')

const cacheKey = (id: string) => `session:${id}`

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
  const id = digest(token)
  const cached = await cache.read<SessionUser | null>(cacheKey(id))
  if (cached !== undefined) return cached

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1)

  if (!row) return null

  const { expiresAt, ...user } = row
  const resolved = { ...user, createdAt: user.createdAt.toISOString() }
  const ttl = Math.min(CACHE_TTL_MS, expiresAt.getTime() - Date.now())
  await cache.write(cacheKey(id), resolved, ttl, { ifAbsent: true })
  return resolved
}

// A null tombstone rather than a delete: a resolve already in flight would
// otherwise re-cache the session after logout. Its ifAbsent write loses to this.
export async function destroySession(token: string) {
  const id = digest(token)
  await db.delete(sessions).where(eq(sessions.id, id))
  await cache.write(cacheKey(id), null, CACHE_TTL_MS)
}

// Expiry is already enforced at read time, so this only reclaims rows. Returning
// the ids keeps the count typed without reaching into the driver result.
export const purgeExpiredSessions = () =>
  db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id })
