import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

config({ path: fileURLToPath(new URL('.env', import.meta.url)), quiet: true })

export default defineConfig({
  test: {
    include: ['{apps,packages}/*/src/**/*.test.ts'],
    // argon2 and the database round-trips are slower than the 5s default.
    testTimeout: 20_000,
  },
})
