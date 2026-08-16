import { zValidator } from '@hono/zod-validator'
import { db, isUniqueViolation, users } from '@lendit/db'
import { loginInput, signupInput } from '@lendit/db/validation'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppEnv } from '../env.ts'
import { DECOY_HASH, hashPassword, verifyPassword } from '../lib/password.ts'
import { createSession, destroySession, SESSION_COOKIE } from '../lib/session.ts'

const cookieOptions = (expires: Date) =>
  ({
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  }) as const

export const auth = new Hono<AppEnv>()
  .post('/signup', zValidator('json', signupInput), async (c) => {
    const { name, email, password } = c.req.valid('json')
    const passwordHash = await hashPassword(password)

    try {
      const [user] = await db.insert(users).values({ name, email, passwordHash }).returning({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      if (!user) throw new Error('insert returned no row')

      const { token, expiresAt } = await createSession(user.id)
      setCookie(c, SESSION_COOKIE, token, cookieOptions(expiresAt))

      return c.json({ user: { ...user, createdAt: user.createdAt.toISOString() } }, 201)
    } catch (e) {
      if (isUniqueViolation(e)) return c.json({ error: 'email_taken' } as const, 409)
      throw e
    }
  })

  .post('/login', zValidator('json', loginInput), async (c) => {
    const { email, password } = c.req.valid('json')

    // Matched through lower(email) so the functional unique index is used.
    const [found] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1)

    const ok = await verifyPassword(found?.passwordHash ?? DECOY_HASH, password)
    if (!found || !ok) return c.json({ error: 'invalid_credentials' } as const, 401)

    const { token, expiresAt } = await createSession(found.id)
    setCookie(c, SESSION_COOKIE, token, cookieOptions(expiresAt))

    return c.json({ ok: true } as const)
  })

  .post('/logout', async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) await destroySession(token)
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.json({ ok: true } as const)
  })

  .get('/me', (c) => c.json({ user: c.get('user') }))
