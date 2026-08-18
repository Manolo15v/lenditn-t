import { Hono } from 'hono'
import { describe, expect, test } from 'vitest'
import type { AppEnv } from './env.ts'
import { SESSION_COOKIE } from './lib/session.ts'
import { attachUser, requireUser } from './middleware.ts'

// No database: attachUser only queries when a cookie is actually present, so the
// anonymous cases — the ones that decide whether a route leaks — run anywhere.
const guarded = new Hono<AppEnv>()
  .use('*', attachUser)
  .use('*', requireUser)
  .get('/secret', (c) => c.json({ seen: c.get('user') }))

describe('requireUser', () => {
  test('a request with no cookie is refused', async () => {
    const res = await guarded.request('/secret')

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthenticated' })
  })

  test('an empty cookie header is refused too', async () => {
    const res = await guarded.request('/secret', { headers: { cookie: `${SESSION_COOKIE}=` } })

    expect(res.status).toBe(401)
  })

  test('the handler never runs when the caller is anonymous', async () => {
    let reached = false
    const app = new Hono<AppEnv>()
      .use('*', attachUser)
      .use('*', requireUser)
      .get('/secret', (c) => {
        reached = true
        return c.json({ ok: true })
      })

    await app.request('/secret')
    expect(reached).toBe(false)
  })
})
