import { cache } from '@lendit/cache'
import { pg } from '@lendit/db'
import { Hono } from 'hono'
import type { AppEnv } from './env.ts'
import { mongoDb } from './lib/mongo.ts'
import { attachUser } from './middleware.ts'
import { auth } from './routes/auth.ts'
import { itemSpecsRoutes } from './routes/item-specs.ts'
import { itemsRoutes } from './routes/items.ts'
import { sessionsRoutes } from './routes/sessions.ts'

const health = new Hono<AppEnv>().get('/health', async (c) => {
  const [db, mongo, cacheStatus] = await Promise.all([
    pg`select 1`.then(
      () => true,
      () => false,
    ),
    mongoDb.command({ ping: 1 }).then(
      () => true,
      () => false,
    ),
    cache.status(),
  ])
  // The cache is reported but does not decide the status: every cached read
  // falls back to Postgres, so a missing Valkey slows the API down without
  // breaking it. Postgres and Mongo hold data that exists nowhere else.
  const ok = db && mongo
  return c.json(
    { status: ok ? 'ok' : 'degraded', db, mongo, cache: cacheStatus } as const,
    ok ? 200 : 503,
  )
})

export const app = new Hono<AppEnv>()
  .use('*', attachUser)
  .route('/api', health)
  .route('/api/auth', auth)
  .route('/api/items', itemsRoutes)
  .route('/api/specs', itemSpecsRoutes)
  .route('/api/sessions', sessionsRoutes)

export type AppType = typeof app
