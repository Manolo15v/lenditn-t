import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { isForeignKeyViolation, pgErrorCode } from './errors.ts'
import { db } from './index.ts'
import { itemIsAvailable } from './queries.ts'
import { items, loans, users } from './schema.ts'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

class Rollback extends Error {}

// Every case runs inside a transaction that is always rolled back, so the
// suite can be pointed at a developer database without eating its rows.
async function inRollback(body: (tx: Tx) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await body(tx)
      throw new Rollback()
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
}

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

// Asserts through the same helper the API uses to turn a violation into a
// status code, so a change to drizzle's error wrapping fails here first.
async function failureCode(query: Promise<unknown>) {
  try {
    await query
  } catch (error) {
    return pgErrorCode(error)
  }
  throw new Error('expected the query to be rejected, but it succeeded')
}

async function seedOwnerBorrowerItem(tx: Tx) {
  const [owner] = await tx
    .insert(users)
    .values({ name: 'Owner', email: `${createId()}@uni.edu`, passwordHash: 'x' })
    .returning({ id: users.id })
  const [borrower] = await tx
    .insert(users)
    .values({ name: 'Borrower', email: `${createId()}@uni.edu`, passwordHash: 'x' })
    .returning({ id: users.id })
  if (!owner || !borrower) throw new Error('seed failed')

  const [item] = await tx
    .insert(items)
    .values({ ownerId: owner.id, name: 'Casio fx-991', pricePerDayCents: 500 })
    .returning({ id: items.id })
  if (!item) throw new Error('seed failed')

  return { ownerId: owner.id, borrowerId: borrower.id, itemId: item.id }
}

describe.skipIf(!process.env.DATABASE_URL)('database constraints', () => {
  test('a second active loan on one item is impossible', async () => {
    await inRollback(async (tx) => {
      const { ownerId, borrowerId, itemId } = await seedOwnerBorrowerItem(tx)

      await tx.insert(loans).values({
        itemId,
        borrowerId,
        status: 'active',
        pricePerDayCents: 500,
        dueAt: daysFromNow(3),
        startedAt: new Date(),
      })

      const code = await failureCode(
        tx.insert(loans).values({
          itemId,
          borrowerId: ownerId,
          status: 'active',
          pricePerDayCents: 500,
          dueAt: daysFromNow(1),
          startedAt: new Date(),
        }),
      )

      expect(code).toBe('23505')
    })
  })

  test('any number of pending requests may sit on one item', async () => {
    await inRollback(async (tx) => {
      const { ownerId, borrowerId, itemId } = await seedOwnerBorrowerItem(tx)

      const inserted = await tx
        .insert(loans)
        .values([
          { itemId, borrowerId, pricePerDayCents: 500, dueAt: daysFromNow(2) },
          { itemId, borrowerId: ownerId, pricePerDayCents: 500, dueAt: daysFromNow(2) },
        ])
        .returning({ id: loans.id })

      expect(inserted).toHaveLength(2)
    })
  })

  test('emails collide regardless of case', async () => {
    await inRollback(async (tx) => {
      const local = createId()
      await tx.insert(users).values({ name: 'Ana', email: `${local}@uni.edu`, passwordHash: 'x' })

      const code = await failureCode(
        tx
          .insert(users)
          .values({ name: 'Imposter', email: `${local.toUpperCase()}@UNI.EDU`, passwordHash: 'x' }),
      )

      expect(code).toBe('23505')
    })
  })

  test('a negative price is refused', async () => {
    await inRollback(async (tx) => {
      const { ownerId } = await seedOwnerBorrowerItem(tx)

      const code = await failureCode(
        tx.insert(items).values({ ownerId, name: 'Bad price', pricePerDayCents: -1 }),
      )

      expect(code).toBe('23514')
    })
  })

  test('a due date before the request is refused', async () => {
    await inRollback(async (tx) => {
      const { borrowerId, itemId } = await seedOwnerBorrowerItem(tx)

      const code = await failureCode(
        tx.insert(loans).values({
          itemId,
          borrowerId,
          pricePerDayCents: 500,
          dueAt: daysFromNow(-1),
        }),
      )

      expect(code).toBe('23514')
    })
  })

  test('deleting a user who owns rows is refused', async () => {
    await inRollback(async (tx) => {
      const { ownerId } = await seedOwnerBorrowerItem(tx)

      // 23001 restrict_violation, not 23503 — the FKs are ON DELETE RESTRICT.
      const code = await failureCode(tx.delete(users).where(eq(users.id, ownerId)))

      expect(code).toBe('23001')
      expect(isForeignKeyViolation({ cause: { code } })).toBe(true)
    })
  })

  test('availability is derived from active loans, not stored', async () => {
    await inRollback(async (tx) => {
      const { borrowerId, itemId } = await seedOwnerBorrowerItem(tx)

      const availability = () =>
        tx.select({ available: itemIsAvailable }).from(items).where(eq(items.id, itemId))

      expect((await availability())[0]?.available).toBe(true)

      await tx.insert(loans).values({
        itemId,
        borrowerId,
        status: 'active',
        pricePerDayCents: 500,
        dueAt: daysFromNow(3),
        startedAt: new Date(),
      })

      expect((await availability())[0]?.available).toBe(false)

      await tx
        .update(loans)
        .set({ status: 'returned', returnedAt: new Date() })
        .where(eq(loans.itemId, itemId))

      expect((await availability())[0]?.available).toBe(true)
    })
  })
})
