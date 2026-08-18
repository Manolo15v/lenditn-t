import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { items, users } from './schema.ts'

// Normalise first, validate second: z.email() rejects surrounding whitespace,
// so trimming after it would never run on a pasted address.
const emailInput = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .pipe(z.email().max(254))

// name and email are derived from the table, so a column change surfaces here.
// password is hand-written: it is not a column, and passwordHash must never
// be accepted from a client.
const userInsert = createInsertSchema(users, {
  name: (s) => s.trim().min(1).max(80),
  email: emailInput,
})

export const signupInput = userInsert
  .pick({ name: true, email: true })
  .extend({ password: z.string().min(8).max(200) })

export const loginInput = z.object({
  email: emailInput,
  password: z.string().min(1).max(200),
})

// ---------------------------------------------------------------- items

// Refinement callbacks get the column's *unwrapped* schema — `description` is
// nullable, and it still arrives here as a ZodString; drizzle-zod re-applies the
// null and the optionality afterwards. Verified, not assumed.
//
// pricePerDayCents needs the explicit min: drizzle-zod derives int4's range, so
// -5 parses fine and would only be stopped by the check constraint, which is a
// 500 rather than a 400.
const itemInsert = createInsertSchema(items, {
  name: (s) => s.trim().min(1).max(80),
  description: (s) => s.trim().max(2000),
  category: (s) => s.trim().min(1).max(40),
  pricePerDayCents: (s) => s.min(0).max(100_000_000),
})

// ownerId is absent on purpose: the owner comes from the session, never from
// the body, or anyone could list an item under someone else's name.
// pricePerDayCents is optional because the column defaults to 0 — omitting it
// is how a free loan is expressed.
//
// `category` is only shape-checked here. Its *vocabulary* is ITEM_CATEGORIES in
// @lendit/shared, which this package cannot import — shared is the wire contract
// the browser also reads. The route composes the two, and that is the only place
// they meet.
//
// The explicit .partial() is not redundant. drizzle-zod already makes these
// three optional at *runtime* — nullable columns and columns with a default —
// but its TypeScript types do not carry that through, so the RPC client would
// infer them as required and the browser would be forced to send a price it is
// not supposed to know about. Re-marking them in zod makes the inferred wire
// type match what the validator actually accepts.
export const itemInput = itemInsert
  .pick({
    name: true,
    description: true,
    category: true,
    pricePerDayCents: true,
  })
  .partial({ description: true, category: true, pricePerDayCents: true })

export type SignupInput = z.infer<typeof signupInput>
export type LoginInput = z.infer<typeof loginInput>
export type ItemInput = z.infer<typeof itemInput>
