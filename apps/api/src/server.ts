import { serve } from '@hono/node-server'
import { app } from './app.ts'

const port = Number(process.env.API_PORT ?? 3000)

serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`api listening on http://localhost:${port}`)
})
