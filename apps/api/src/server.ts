import { serve } from '@hono/node-server'
import { app } from './app.ts'
import { purgeExpiredSessions } from './lib/session.ts'

const port = Number(process.env.API_PORT ?? 3000)

serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`api listening on http://localhost:${port}`)
})

// Swept at boot rather than on a schedule: one container, and a database that is
// briefly unreachable must not stop the server from coming up to report it.
purgeExpiredSessions()
  .then((purged) => purged.length && console.log(`purged ${purged.length} expired sessions`))
  .catch(() => {})
