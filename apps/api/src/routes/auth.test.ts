import { db, sessions, users } from '@lendit/db'
import { eq, inArray, sql } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { SESSION_COOKIE } from '../lib/session.ts'
import {
  cookieFrom,
  databaseIsReachable,
  freshEmail,
  json,
  type SessionUserBody,
  send,
  tokenFrom,
  useFixtures,
} from '../testing.ts'

const { signup, userIds } = useFixtures()

const post = (path: string, body: unknown, cookie?: string) => send('POST', path, body, cookie)

const me = async (cookie?: string) => {
  const res = await send('GET', '/api/auth/me', undefined, cookie)
  return json<{ user: SessionUserBody | null }>(res)
}

describe.skipIf(!(await databaseIsReachable()))('auth routes', () => {
  test('signup creates an account and returns a session cookie', async () => {
    const { res, email } = await signup()

    expect(res.status).toBe(201)
    const cookie = cookieFrom(res)
    expect(cookie).toContain(`${SESSION_COOKIE}=`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')

    expect(await me(tokenFrom(res))).toMatchObject({ user: { name: 'Ana Ruiz', email } })
  })

  test('the session cookie survives a reload, because the server resolves it', async () => {
    const { cookie } = await signup()

    // Two independent requests carrying only the cookie: nothing in memory ties
    // them together, which is what "persists a reload" actually means.
    expect((await me(cookie)).user).not.toBeNull()
    expect((await me(cookie)).user).not.toBeNull()
  })

  test('neither the response nor the table holds the password', async () => {
    const { res, password } = await signup()

    const body = await res.text()
    expect(body).not.toContain(password)
    expect(body).not.toContain('passwordHash')

    const [row] = await db
      .select({ hash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userIds[0] ?? ''))
    expect(row?.hash.startsWith('$argon2id$')).toBe(true)
  })

  test('the table stores a digest, not the token in the cookie', async () => {
    const { cookie } = await signup()
    const token = cookie.split('=')[1] ?? ''

    // A stolen database dump must not yield a usable session.
    const [row] = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, token))
    expect(token).not.toBe('')
    expect(row).toBeUndefined()
  })

  test('a taken email is a 409, whatever its case', async () => {
    const { email } = await signup()

    const clash = await post('/api/auth/signup', {
      name: 'Someone Else',
      email: email.toUpperCase(),
      password: 'another-password',
    })

    expect(clash.status).toBe(409)
    expect(await json(clash)).toEqual({ error: 'email_taken' })
  })

  test('email is trimmed and folded before it is stored', async () => {
    const raw = freshEmail().replace('@uni.edu', '@UNI.edu')
    const { res } = await signup({ email: `  ${raw} ` })
    expect(res.status).toBe(201)

    const { user } = await json<{ user: SessionUserBody }>(res)
    expect(user.email).toBe(raw.toLowerCase())

    const login = await post('/api/auth/login', {
      email: raw.toUpperCase(),
      password: 'correct-horse',
    })
    expect(login.status).toBe(200)
  })

  test('a short password is refused by the server, not only by the form', async () => {
    const { res } = await signup({ password: 'short' })
    expect(res.status).toBe(400)
  })

  test('login accepts the right password and rejects a wrong one', async () => {
    const { email, password } = await signup()

    const ok = await post('/api/auth/login', { email, password })
    expect(ok.status).toBe(200)
    expect(cookieFrom(ok)).toContain(`${SESSION_COOKIE}=`)
    expect((await me(tokenFrom(ok))).user?.email).toBe(email)

    // Login answers with the user, so the client needs no follow-up /me — which
    // is exactly why the hash must be destructured out of the row it selects.
    const body = await ok.clone().text()
    expect(body).not.toContain('passwordHash')
    expect(body).not.toContain('$argon2id$')
    expect((await json<{ user: SessionUserBody }>(ok)).user.email).toBe(email)

    const wrong = await post('/api/auth/login', { email, password: 'correct-hors' })
    expect(wrong.status).toBe(401)
    expect(await json(wrong)).toEqual({ error: 'invalid_credentials' })
  })

  test('an unknown email fails exactly like a wrong password', async () => {
    const res = await post('/api/auth/login', { email: freshEmail(), password: 'correct-horse' })

    expect(res.status).toBe(401)
    expect(await json(res)).toEqual({ error: 'invalid_credentials' })
  })

  test('logout deletes the session server-side, not just the cookie', async () => {
    const { cookie } = await signup()

    const out = await post('/api/auth/logout', {}, cookie)
    expect(out.status).toBe(200)

    // Replaying the same cookie must fail: clearing it client-side would leave a
    // token that still resolves.
    expect((await me(cookie)).user).toBeNull()

    const rows = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(inArray(sessions.userId, userIds))
    expect(rows).toHaveLength(0)
  })

  test('me returns a null user with no cookie and with a junk one', async () => {
    expect(await me()).toEqual({ user: null })
    expect(await me(`${SESSION_COOKIE}=not-a-real-token`)).toEqual({ user: null })
  })

  test('an expired session no longer resolves', async () => {
    const { cookie } = await signup()

    await db
      .update(sessions)
      .set({ expiresAt: sql`now() - interval '1 second'` })
      .where(inArray(sessions.userId, userIds))

    expect((await me(cookie)).user).toBeNull()
  })
})
