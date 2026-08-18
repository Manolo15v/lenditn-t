import { zValidator } from '@hono/zod-validator'
import { db, isUniqueViolation, users } from '@lendit/db'
import { loginInput, signupInput } from '@lendit/db/validation'
import { sql } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppEnv } from '../env.ts'
import { DECOY_HASH, hashPassword, verifyPassword } from '../lib/password.ts'
import { createSession, destroySession, SESSION_COOKIE } from '../lib/session.ts'

// The one place a session becomes a cookie, so signup and login cannot drift
// apart on flags. Lax rather than Strict: the cookie must survive arriving from
// an external link, and the API only accepts JSON bodies anyway.
async function issueSession(c: Context<AppEnv>, userId: string) {
  const { token, expiresAt } = await createSession(userId)

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

const columns = {
  id: users.id,
  name: users.name,
  email: users.email,
  createdAt: users.createdAt,
}

// Dates cross the wire as ISO strings; passwordHash is not in `columns` at all,
// so it cannot leak by forgetting to strip it here.
const publicUser = (row: { createdAt: Date }) => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
})

export const auth = new Hono<AppEnv>()
  .post('/signup', zValidator('json', signupInput), async (c) => {
    const { name, email, password } = c.req.valid('json')
    const passwordHash = await hashPassword(password)

    try {
      const [user] = await db.insert(users).values({ name, email, passwordHash }).returning(columns)
      if (!user) throw new Error('insert returned no row')

      await issueSession(c, user.id)
      return c.json({ user: publicUser(user) }, 201)
    } catch (e) {
      if (isUniqueViolation(e)) return c.json({ error: 'email_taken' } as const, 409)
      throw e
    }
  })

  .post('/login', zValidator('json', loginInput), async (c) => {
    const { email, password } = c.req.valid('json')

    // Matched through lower(email) so the functional unique index is used.
    const [found] = await db
      .select({ ...columns, passwordHash: users.passwordHash })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1)

    const ok = await verifyPassword(found?.passwordHash ?? DECOY_HASH, password)
    if (!found || !ok) return c.json({ error: 'invalid_credentials' } as const, 401)

    await issueSession(c, found.id)

    // Returns the user, like signup: the client then needs no follow-up /me.
    const { passwordHash: _, ...user } = found
    return c.json({ user: publicUser(user) })
  })

  .post('/logout', async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) await destroySession(token)
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.json({ ok: true } as const)
  })

  .get('/me', (c) => c.json({ user: c.get('user') }))
