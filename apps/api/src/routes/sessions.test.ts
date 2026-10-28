import { randomBytes } from 'node:crypto'
import { db, sessions } from '@lendit/db'
import { describe, expect, test } from 'vitest'
import { app } from '../app.ts'
import {
  databaseIsReachable,
  json,
  type SessionBody,
  type SessionUserBody,
  send,
  tokenFrom,
  useFixtures,
} from '../testing.ts'

const { signup } = useFixtures()

const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1'

// A second device is a second login carrying its own user agent. `send` sets no
// user-agent at all, which is what the null case below relies on.
async function loginFrom(userAgent: string, email: string, password: string) {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': userAgent },
    body: JSON.stringify({ email, password }),
  })
  expect(res.status).toBe(200)
  return tokenFrom(res)
}

const list = async (cookie: string) =>
  (await json<{ sessions: SessionBody[] }>(await send('GET', '/api/sessions', undefined, cookie)))
    .sessions

const me = async (cookie: string) =>
  (
    await json<{ user: SessionUserBody | null }>(
      await send('GET', '/api/auth/me', undefined, cookie),
    )
  ).user

describe.skipIf(!(await databaseIsReachable()))('session routes', () => {
  test('lists the caller’s live sessions and marks the one in use', async () => {
    const { cookie, email, password } = await signup()
    const phone = await loginFrom(PHONE, email, password)

    const fromLaptop = await list(cookie)
    expect(fromLaptop).toHaveLength(2)
    expect(fromLaptop.filter((s) => s.current)).toHaveLength(1)
    expect(fromLaptop.find((s) => s.current)?.userAgent).toBeNull()
    expect(fromLaptop.find((s) => !s.current)?.userAgent).toBe(PHONE)

    // Same two rows from the other side; only the marker moves.
    const fromPhone = await list(phone)
    expect(fromPhone.find((s) => s.current)?.userAgent).toBe(PHONE)
    expect(fromPhone.map((s) => s.id).sort()).toEqual(fromLaptop.map((s) => s.id).sort())
  })

  test('another user’s sessions are not in the list', async () => {
    const ana = await signup()
    await signup()

    expect(await list(ana.cookie)).toHaveLength(1)
  })

  test('expired sessions are not listed', async () => {
    const { res, cookie } = await signup()
    const { user } = await json<{ user: SessionUserBody }>(res)

    await db.insert(sessions).values({
      id: randomBytes(32).toString('hex'),
      userId: user.id,
      expiresAt: new Date(Date.now() - 1000),
    })

    expect(await list(cookie)).toHaveLength(1)
  })

  test('revoking a session ends it server-side and leaves the current one alone', async () => {
    const { cookie, email, password } = await signup()
    const phone = await loginFrom(PHONE, email, password)
    const target = (await list(cookie)).find((s) => !s.current)

    const res = await send('DELETE', `/api/sessions/${target?.id}`, undefined, cookie)
    expect(res.status).toBe(200)

    // The phone's cookie must stop resolving — that is the whole point.
    expect(await me(phone)).toBeNull()
    expect(await me(cookie)).not.toBeNull()
    expect(await list(cookie)).toHaveLength(1)
  })

  test('the current session cannot be revoked here; that is what logout is for', async () => {
    const { cookie } = await signup()
    const [current] = await list(cookie)

    const res = await send('DELETE', `/api/sessions/${current?.id}`, undefined, cookie)
    expect(res.status).toBe(409)
    expect(await json(res)).toEqual({ error: 'current_session' })
    expect(await me(cookie)).not.toBeNull()
  })

  test('someone else’s session is a 404, and it survives the attempt', async () => {
    const owner = await signup()
    const attacker = await signup()
    const [victim] = await list(owner.cookie)

    const res = await send('DELETE', `/api/sessions/${victim?.id}`, undefined, attacker.cookie)
    expect(res.status).toBe(404)
    expect(await me(owner.cookie)).not.toBeNull()

    const missing = await send('DELETE', '/api/sessions/does-not-exist', undefined, owner.cookie)
    expect(missing.status).toBe(404)
  })

  test('signing out everywhere else keeps only the current session', async () => {
    const { cookie, email, password } = await signup()
    const phone = await loginFrom(PHONE, email, password)
    const tablet = await loginFrom('Mozilla/5.0 (iPad) Safari/604.1', email, password)
    const stranger = await signup()

    const res = await send('DELETE', '/api/sessions', undefined, cookie)
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ revoked: 2 })

    expect(await me(phone)).toBeNull()
    expect(await me(tablet)).toBeNull()
    expect(await me(cookie)).not.toBeNull()
    // Scoped to the caller: nobody else gets signed out.
    expect(await me(stranger.cookie)).not.toBeNull()
  })

  test('an anonymous caller gets a 401 from every route', async () => {
    expect((await send('GET', '/api/sessions')).status).toBe(401)
    expect((await send('DELETE', '/api/sessions')).status).toBe(401)
    expect((await send('DELETE', '/api/sessions/anything')).status).toBe(401)
  })
})
