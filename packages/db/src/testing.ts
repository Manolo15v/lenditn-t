import { pg } from './index.ts'

// Suites that need a live database gate on this. In CI it always returns true:
// a Postgres service that failed to start has to turn the build red, not
// silently delete the coverage that matters most. On a machine that has not run
// `tilt up`, skipping beats a wall of ECONNREFUSED.

//TODO: Move the test and CI to pglite to run all in memory and not require a live database.
// This is a temporary measure to get the coverage back up.

export async function databaseIsReachable() {
  if (process.env.CI) return true

  try {
    await pg`select 1`
    return true
  } catch {
    return false
  }
}
