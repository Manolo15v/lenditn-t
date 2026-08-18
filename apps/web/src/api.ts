// Type-only: erased at build time, so no server code reaches the bundle.
import type { AppType } from '@lendit/api'
import { hc, type InferResponseType } from 'hono/client'

export const api = hc<AppType>('/')

// Inferred from the route, never re-declared. A column added to the browse
// projection shows up here; a hand-written interface would drift silently and
// the compiler would not say a word. The status argument matters — without it
// the type unions in the 401 body.
export type Item = InferResponseType<typeof api.api.items.$get, 200>['items'][number]
