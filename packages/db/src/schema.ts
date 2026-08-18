import { createId } from '@paralleldrive/cuid2'
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Generated in JS, not by the database — raw SQL inserts must pass an id.
const primaryId = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => createId())

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

// ---------------------------------------------------------------- users

export const users = pgTable(
  'users',
  {
    id: primaryId(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // Uniqueness on the folded value, not the raw column: "A@x.edu" and
    // "a@x.edu" are one account no matter what the signup path stores.
    uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`),
  ],
)

// ---------------------------------------------------------------- items

export const items = pgTable(
  'items',
  {
    id: primaryId(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    // Lending is free unless the owner says otherwise. The default lives in the
    // database so a raw insert and the seed agree with the API on what "free"
    // means, and so the column can be omitted from the wire entirely.
    pricePerDayCents: integer('price_per_day_cents').notNull().default(0),
    createdAt: createdAt(),
    // Items are archived, never deleted — loan history has to stay readable.
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    index('items_owner_idx').on(t.ownerId),
    check('items_price_non_negative', sql`${t.pricePerDayCents} >= 0`),
  ],
)

// ---------------------------------------------------------------- loans

export const loanStatus = pgEnum('loan_status', [
  'requested',
  'active',
  'returned',
  'settled',
  'declined',
  'cancelled',
])

export const loans = pgTable(
  'loans',
  {
    id: primaryId(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'restrict' }),
    borrowerId: text('borrower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: loanStatus('status').notNull().default('requested'),
    // Snapshot, not a lookup. An owner raising their rate must not change what
    // a past borrower owes.
    pricePerDayCents: integer('price_per_day_cents').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    // Frozen at return. Never recomputed.
    totalCents: integer('total_cents'),
    settledAt: timestamp('settled_at', { withTimezone: true }),
    note: text('note'),
  },
  (t) => [
    // The load-bearing constraint. A second active loan on one item is
    // physically un-insertable; a check-then-insert in app code has a race
    // window no matter how it is written. Catch 23505 and return 409.
    uniqueIndex('loans_one_active_per_item').on(t.itemId).where(sql`${t.status} = 'active'`),
    index('loans_item_idx').on(t.itemId),
    index('loans_borrower_idx').on(t.borrowerId),
    check('loans_due_after_request', sql`${t.dueAt} > ${t.requestedAt}`),
    check(
      'loans_returned_after_start',
      sql`${t.returnedAt} is null or ${t.returnedAt} >= ${t.startedAt}`,
    ),
    check('loans_price_non_negative', sql`${t.pricePerDayCents} >= 0`),
    check('loans_total_non_negative', sql`${t.totalCents} is null or ${t.totalCents} >= 0`),
  ],
)

// ------------------------------------------------------------- sessions

export const sessions = pgTable(
  'sessions',
  {
    // Deliberately no cuid default: a session id is a credential, minted by
    // the API with a CSPRNG.
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

// ------------------------------------------------------------------ types

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Item = typeof items.$inferSelect
export type NewItem = typeof items.$inferInsert
export type Loan = typeof loans.$inferSelect
export type NewLoan = typeof loans.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type LoanStatus = (typeof loanStatus.enumValues)[number]
