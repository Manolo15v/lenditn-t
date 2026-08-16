import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs with cwd = packages/db, so resolve the root .env explicitly.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set (expected in the root .env)')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url },
  // `push` in dev only. Deployed databases get generate + migrate — push would
  // happily drop columns to make the database match the schema file.
  strict: true,
})
