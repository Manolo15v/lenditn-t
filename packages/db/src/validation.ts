import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { users } from './schema.ts'

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

export type SignupInput = z.infer<typeof signupInput>
export type LoginInput = z.infer<typeof loginInput>
