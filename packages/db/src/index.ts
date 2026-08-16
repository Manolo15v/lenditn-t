import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set (expected in the root .env)')

export const pg = postgres(url)
export const db = drizzle(pg, { schema })

export * from './errors.ts'
export * from './schema.ts'
