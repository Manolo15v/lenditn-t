import { cache } from '@lendit/cache'
import { pg } from '@lendit/db'
import { Hono } from 'hono'
import type { AppEnv } from './env.ts'
import { attachUser } from './middleware.ts'
import { auth } from './routes/auth.ts'
import { itemsRoutes } from './routes/items.ts'

const health = new Hono<AppEnv>().get('/health', async (c) => {
  const cacheStatus = await cache.status()
  try {
    await pg`select 1`
    return c.json({ status: 'ok', db: true, cache: cacheStatus } as const)
  } catch {
    return c.json({ status: 'degraded', db: false, cache: cacheStatus } as const, 503)
  }
})

export const app = new Hono<AppEnv>()
  .use('*', attachUser)
  .route('/api', health)
  .route('/api/auth', auth)
  .route('/api/items', itemsRoutes)

export type AppType = typeof app
