import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from './env.ts'
import { resolveSession, SESSION_COOKIE } from './lib/session.ts'

export const attachUser = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  c.set('user', token ? await resolveSession(token) : null)
  await next()
})
