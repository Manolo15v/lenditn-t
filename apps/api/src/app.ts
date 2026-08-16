import { Hono } from 'hono'
import { pg } from '@lendit/db'

// Routes are declared on sub-apps and mounted with .route() so the chained
// types survive — that chain is what `hc<AppType>` on the client reads.
const health = new Hono().get('/health', async (c) => {
  try {
    await pg`select 1`
    return c.json({ status: 'ok', db: true } as const)
  } catch {
    return c.json({ status: 'degraded', db: false } as const, 503)
  }
})

export const app = new Hono().route('/api', health)

// The client's only import from this package, and it is type-only.
export type AppType = typeof app
