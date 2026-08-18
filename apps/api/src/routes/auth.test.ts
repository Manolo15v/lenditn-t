import { randomUUID } from 'node:crypto'
import { db, sessions, users } from '@lendit/db'
import { databaseIsReachable } from '@lendit/db/testing'
import { eq, inArray, sql } from 'drizzle-orm'
import { afterEach, describe, expect, test } from 'vitest'
import { app } from '../app.ts'
import { SESSION_COOKIE } from '../lib/session.ts'

type SessionUserBody = { id: string; name: string; email: string; createdAt: string }

// Routes are exercised through app.request, not a listening server: same
// middleware chain and same validators, no port to bind.
const post = (path: string, body: unknown, cookie?: string) =>
  app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })

const json = async <T>(res: Response) => (await res.json()) as T

const me = async (cookie?: string) => {
  const res = await app.request('/api/auth/me', { headers: cookie ? { cookie } : {} })
  return json<{ user: SessionUserBody | null }>(res)
}

const cookieFrom = (res: Response) => res.headers.get('set-cookie') ?? ''
const tokenFrom = (res: Response) => cookieFrom(res).split(';')[0] ?? ''

const freshEmail = () => `${randomUUID()}@uni.edu`
const created: string[] = []

async function signup(overrides: Partial<Record<'name' | 'email' | 'password', string>> = {}) {
  const body = { name: 'Ana Ruiz', email: freshEmail(), password: 'correct-horse', ...overrides }
  const res = await post('/api/auth/signup', body)

  if (res.status === 201) {
    const { user } = await json<{ user: SessionUserBody }>(res.clone())
    created.push(user.id)
  }

  return { res, ...body }
}

afterEach(async () => {
  const ids = created.splice(0)
  if (!ids.length) return
  // Sessions first: every FK in this schema is ON DELETE RESTRICT.
  await db.delete(sessions).where(inArray(sessions.userId, ids))
  await db.delete(users).where(inArray(users.id, ids))
})

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
    const { res } = await signup()
    const cookie = tokenFrom(res)

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
      .where(eq(users.id, created[0] ?? ''))
    expect(row?.hash.startsWith('$argon2id$')).toBe(true)
  })

  test('the table stores a digest, not the token in the cookie', async () => {
    const { res } = await signup()
    const token = tokenFrom(res).split('=')[1] ?? ''

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
    const raw = `${randomUUID()}@UNI.edu`
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
    const res = await post('/api/auth/signup', {
      name: 'Ana',
      email: freshEmail(),
      password: 'short',
    })

    expect(res.status).toBe(400)
  })

  test('login accepts the right password and rejects a wrong one', async () => {
    const { email, password } = await signup()

    const ok = await post('/api/auth/login', { email, password })
    expect(ok.status).toBe(200)
    expect(cookieFrom(ok)).toContain(`${SESSION_COOKIE}=`)
    expect((await me(tokenFrom(ok))).user?.email).toBe(email)

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
    const { res } = await signup()
    const cookie = tokenFrom(res)

    const out = await post('/api/auth/logout', {}, cookie)
    expect(out.status).toBe(200)

    // Replaying the same cookie must fail: clearing it client-side would leave a
    // token that still resolves.
    expect((await me(cookie)).user).toBeNull()

    const rows = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(inArray(sessions.userId, created))
    expect(rows).toHaveLength(0)
  })

  test('me returns a null user with no cookie and with a junk one', async () => {
    expect(await me()).toEqual({ user: null })
    expect(await me(`${SESSION_COOKIE}=not-a-real-token`)).toEqual({ user: null })
  })

  test('an expired session no longer resolves', async () => {
    const { res } = await signup()
    const cookie = tokenFrom(res)

    await db
      .update(sessions)
      .set({ expiresAt: sql`now() - interval '1 second'` })
      .where(inArray(sessions.userId, created))

    expect((await me(cookie)).user).toBeNull()
  })
})
