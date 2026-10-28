import { type Context, Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import type { AppEnv } from '../env.ts'
import {
  isCurrentSession,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  SESSION_COOKIE,
} from '../lib/session.ts'
import { requireUser } from '../middleware.ts'

// requireUser has already turned away a caller without a live session, so both
// the user and the cookie that resolved to them are present here. The throw is
// for the guard going missing, as in the items routes.
function caller(c: Context<AppEnv>) {
  const user = c.get('user')
  const token = getCookie(c, SESSION_COOKIE)
  if (!user || !token) throw new Error('route is missing requireUser')
  return { user, token }
}

// Every route here acts on the caller's own sessions, so the guard is mounted
// once for the whole group instead of per route.
export const sessionsRoutes = new Hono<AppEnv>()
  .use('*', requireUser)

  .get('/', async (c) => {
    const { user, token } = caller(c)
    return c.json({ sessions: await listSessions(user.id, token) })
  })

  .delete('/:id', async (c) => {
    const { user, token } = caller(c)
    const id = c.req.param('id')

    // Ending the session you are using is logout, which also clears the cookie.
    // Doing it here would leave the browser holding a dead token.
    if (isCurrentSession(id, token)) return c.json({ error: 'current_session' } as const, 409)

    // A 404 for someone else's session as well as a missing one: unlike an
    // item, a session's existence is nobody else's business.
    if (!(await revokeSession(user.id, id))) return c.json({ error: 'not_found' } as const, 404)
    return c.json({ ok: true } as const)
  })

  .delete('/', async (c) => {
    const { user, token } = caller(c)
    return c.json({ revoked: await revokeOtherSessions(user.id, token) })
  })
