import { and, eq, notExists, sql } from 'drizzle-orm'
import { db } from './index.ts'
import { items, loans } from './schema.ts'

// The one definition of availability. Build it with drizzle's query builder,
// never a hand-written `sql` string: interpolating ${items.id} into a raw
// subquery emits an unqualified "id", which silently binds to loans.id and
// makes every item look available.
export const itemIsAvailable = notExists(
  db
    .select({ one: sql`1` })
    .from(loans)
    .where(and(eq(loans.itemId, items.id), eq(loans.status, 'active'))),
)
