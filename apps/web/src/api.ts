// Type-only: erased at build time, so no server code reaches the bundle.
import type { AppType } from '@lendit/api'
import { hc } from 'hono/client'

export const api = hc<AppType>('/')
