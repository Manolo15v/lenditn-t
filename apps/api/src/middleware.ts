import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from './env.ts'
import { resolveSession, SESSION_COOKIE } from './lib/session.ts'

export const attachUser = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  c.set('user', token ? await resolveSession(token) : null)
  await next()
})

// Resolving and requiring are separate: `/me` has to answer for an anonymous
// caller, while every route that acts on someone's behalf must refuse one.
// Mount after attachUser, and read c.get('user') downstream — it is non-null there.
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('user')) return c.json({ error: 'unauthenticated' } as const, 401)
  await next()
})
