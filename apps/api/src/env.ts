import type { SessionUser } from './lib/session.ts'

export type AppEnv = {
  Variables: {
    user: SessionUser | null
  }
}
