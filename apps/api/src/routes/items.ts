import { zValidator } from '@hono/zod-validator'
import { db, items, users } from '@lendit/db'
import { itemIsAvailable } from '@lendit/db/queries'
import { itemInput } from '@lendit/db/validation'
import { ITEM_CATEGORIES } from '@lendit/shared'
import { and, desc, eq, isNull, type SQL } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../env.ts'
import { requireUser } from '../middleware.ts'

// Where the column shape from @lendit/db meets the wire vocabulary from
// @lendit/shared. The category list is fixed here and nowhere else on the server.
const category = z.enum(ITEM_CATEGORIES).nullish()

const createInput = itemInput.extend({ category })

// Every field optional, but at least one present: an empty body would otherwise
// be a successful no-op that reads as a saved edit.
const patchInput = createInput
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' })

// isAvailable is derived, never stored — the single definition of it lives in
// @lendit/db/queries. mapWith gives the projected `not exists` a boolean type;
// without it the column comes back as unknown.
const columns = {
  id: items.id,
  ownerId: items.ownerId,
  ownerName: users.name,
  name: items.name,
  description: items.description,
  category: items.category,
  pricePerDayCents: items.pricePerDayCents,
  createdAt: items.createdAt,
  archivedAt: items.archivedAt,
  isAvailable: itemIsAvailable.mapWith(Boolean),
}

type Row = { createdAt: Date; archivedAt: Date | null }

const publicItem = <T extends Row>(row: T) => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  archivedAt: row.archivedAt?.toISOString() ?? null,
})

// cuid2 ids are not creation-ordered, so newest-first has to come from the
// timestamp. Sorting by id would look right and be arbitrary.
const listItems = (where: SQL) =>
  db
    .select(columns)
    .from(items)
    .innerJoin(users, eq(users.id, items.ownerId))
    .where(where)
    .orderBy(desc(items.createdAt))

// requireUser has already refused an anonymous caller, but AppEnv still types
// the variable as nullable. Throwing here turns "the guard was not mounted"
// into a 500 during development rather than a route that quietly acts as no one.
function currentUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) throw new Error('route is missing requireUser')
  return user
}

async function ownedItem(id: string, userId: string) {
  const [row] = await db
    .select({ id: items.id, ownerId: items.ownerId, archivedAt: items.archivedAt })
    .from(items)
    .where(eq(items.id, id))
    .limit(1)

  if (!row) return { error: 'not_found' } as const
  // Rule 4: no roles. You may modify an item if you own it. A 403 rather than a
  // 404 because browse is public — the item's existence is not a secret.
  if (row.ownerId !== userId) return { error: 'not_owner' } as const
  return { row }
}

async function readItem(id: string) {
  const [row] = await listItems(eq(items.id, id)).limit(1)
  return row
}

export const itemsRoutes = new Hono<AppEnv>()
  .get('/', zValidator('query', z.object({ mine: z.literal('true').optional() })), async (c) => {
    const user = c.get('user')

    // Browse hides archived items from everyone. `?mine=true` is the owner's
    // view and deliberately includes them, so archiving is not a one-way door.
    if (c.req.valid('query').mine) {
      if (!user) return c.json({ error: 'unauthenticated' } as const, 401)
      const rows = await listItems(eq(items.ownerId, user.id))
      return c.json({ items: rows.map(publicItem) })
    }

    const rows = await listItems(isNull(items.archivedAt))
    return c.json({ items: rows.map(publicItem) })
  })

  .post('/', requireUser, zValidator('json', createInput), async (c) => {
    const user = currentUser(c)

    // ownerId comes from the session. createInput has no such field, so a body
    // carrying one is stripped rather than honoured.
    const [created] = await db
      .insert(items)
      .values({ ...c.req.valid('json'), ownerId: user.id, pricePerDayCents: 0 }) //Arreglen el pricePerDaysCents
      .returning({ id: items.id })
    if (!created) throw new Error('insert returned no row')

    const row = await readItem(created.id)
    if (!row) throw new Error('inserted item did not read back')
    return c.json({ item: publicItem(row) }, 201)
  })

  .patch('/:id', requireUser, zValidator('json', patchInput), async (c) => {
    const user = currentUser(c)
    const id = c.req.param('id')
    const owned = await ownedItem(id, user.id)
    if ('error' in owned) return c.json(owned, owned.error === 'not_found' ? 404 : 403)
    if (owned.row.archivedAt) return c.json({ error: 'archived' } as const, 409)

    await db.update(items).set(c.req.valid('json')).where(eq(items.id, id))

    const row = await readItem(id)
    if (!row) throw new Error('updated item did not read back')
    return c.json({ item: publicItem(row) })
  })

  .post('/:id/archive', requireUser, async (c) => {
    const user = currentUser(c)
    const id = c.req.param('id')
    const owned = await ownedItem(id, user.id)
    if ('error' in owned) return c.json(owned, owned.error === 'not_found' ? 404 : 403)

    // Archiving an item that is out on loan is allowed: it hides the listing,
    // it does not end the loan. Only unarchived rows are stamped, so a repeat
    // call cannot rewrite the original archive time.
    if (!owned.row.archivedAt) {
      await db
        .update(items)
        .set({ archivedAt: new Date() })
        .where(and(eq(items.id, id), isNull(items.archivedAt)))
    }

    const row = await readItem(id)
    if (!row) throw new Error('archived item did not read back')
    return c.json({ item: publicItem(row) })
  })
