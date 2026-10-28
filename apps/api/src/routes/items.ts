import { zValidator } from '@hono/zod-validator'
import { cache } from '@lendit/cache'
import { db, isCheckViolation, items, users } from '@lendit/db'
import { itemIsAvailable } from '@lendit/db/queries'
import { itemInput, offerFitsPrice } from '@lendit/db/validation'
import { ITEM_CATEGORIES } from '@lendit/shared'
import { and, desc, eq, isNull, type SQL } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import type { AppEnv } from '../env.ts'
import { browseKey, ITEM_CACHE_TTL_MS, invalidateItems, itemKey } from '../lib/item-cache.ts'
import {
  ITEM_IMAGE_MAX_BYTES,
  readStoredImage,
  removeStoredImage,
  validateAndStoreItemImage,
} from '../lib/item-image.ts'
import { requireUser } from '../middleware.ts'

// Where the column shape from @lendit/db meets the wire vocabulary from
// @lendit/shared. The category list is fixed here and nowhere else on the server.
const category = z.enum(ITEM_CATEGORIES).nullish()

const itemFields = itemInput.extend({ category })

// A new item has no stored row, so the whole offer rule can be checked here and
// a bad offer is a 400 rather than a check-constraint 500.
const createInput = itemFields.refine(
  (v) => offerFitsPrice(v.pricePerDayCents ?? 0, v.offerPricePerDayCents ?? null),
  { message: 'offer must be below the price', path: ['offerPricePerDayCents'] },
)

// Every field optional, but at least one present: an empty body would otherwise
// be a successful no-op that reads as a saved edit. Built from itemFields, not
// createInput — zod will not make a refined object partial.
const patchInput = itemFields
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' })

const imageForm = z.object({
  image: z.instanceof(File, { message: 'image required' }),
})

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
  offerPricePerDayCents: items.offerPricePerDayCents,
  imagePath: items.imagePath,
  createdAt: items.createdAt,
  archivedAt: items.archivedAt,
  isAvailable: itemIsAvailable.mapWith(Boolean),
}

type Row = {
  id: string
  imagePath: string | null
  createdAt: Date
  archivedAt: Date | null
}

const publicItem = <T extends Row>(row: T) => {
  const { imagePath, createdAt, archivedAt, ...rest } = row
  return {
    ...rest,
    // Public URL, not the on-disk filename. Clients never see uploads/.
    imageUrl: imagePath ? (`/api/items/${row.id}/image` as const) : null,
    createdAt: createdAt.toISOString(),
    archivedAt: archivedAt?.toISOString() ?? null,
  }
}

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
    .select({
      id: items.id,
      ownerId: items.ownerId,
      archivedAt: items.archivedAt,
      pricePerDayCents: items.pricePerDayCents,
      offerPricePerDayCents: items.offerPricePerDayCents,
      imagePath: items.imagePath,
    })
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

    const rows = await cache.remember(browseKey, ITEM_CACHE_TTL_MS, async () =>
      (await listItems(isNull(items.archivedAt))).map(publicItem),
    )
    return c.json({ items: rows })
  })

  .get('/:id/image', async (c) => {
    const id = c.req.param('id')
    const [row] = await db
      .select({ imagePath: items.imagePath })
      .from(items)
      .where(eq(items.id, id))
      .limit(1)

    if (!row?.imagePath) return c.json({ error: 'not_found' } as const, 404)

    try {
      const bytes = await readStoredImage(row.imagePath)
      return c.body(bytes, 200, {
        'content-type': 'image/webp',
        'cache-control': 'public, max-age=86400',
      })
    } catch {
      return c.json({ error: 'not_found' } as const, 404)
    }
  })

  .get('/:id', async (c) => {
    const id = c.req.param('id')
    const item = await cache.remember(itemKey(id), ITEM_CACHE_TTL_MS, async () => {
      const row = await readItem(id)
      return row ? publicItem(row) : null
    })
    if (!item) return c.json({ error: 'not_found' } as const, 404)
    return c.json({ item })
  })

  .post('/', requireUser, zValidator('json', createInput), async (c) => {
    const user = currentUser(c)

    // ownerId comes from the session. createInput has no such field, so a body
    // carrying one is stripped rather than honoured.
    //
    // pricePerDayCents is passed through from the validated body: it is optional
    // there, and the column defaults to 0, so omitting it still means a free
    // loan. Forcing 0 here made every listing free regardless of what the owner
    // set, including the seeded fixtures.
    const [created] = await db
      .insert(items)
      .values({ ...c.req.valid('json'), ownerId: user.id })
      .returning({ id: items.id })
    if (!created) throw new Error('insert returned no row')
    await invalidateItems(created.id)

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

    // A patch may move either side of the offer rule alone — dropping the price
    // under a standing offer, or offering on a free item — so it is checked
    // against the row as it will be after the write, not against the body.
    const patch = c.req.valid('json')
    const nextPrice = patch.pricePerDayCents ?? owned.row.pricePerDayCents
    const nextOffer =
      patch.offerPricePerDayCents === undefined
        ? owned.row.offerPricePerDayCents
        : patch.offerPricePerDayCents
    if (!offerFitsPrice(nextPrice, nextOffer)) {
      return c.json({ error: 'offer_not_below_price' } as const, 400)
    }

    // The check above read the row before writing it; two concurrent patches
    // can still meet in the middle, and the constraint is what catches that.
    try {
      await db.update(items).set(patch).where(eq(items.id, id))
    } catch (e) {
      if (isCheckViolation(e)) return c.json({ error: 'offer_not_below_price' } as const, 400)
      throw e
    }
    await invalidateItems(id)

    const row = await readItem(id)
    if (!row) throw new Error('updated item did not read back')
    return c.json({ item: publicItem(row) })
  })

  .post(
    '/:id/image',
    requireUser,
    bodyLimit({
      maxSize: ITEM_IMAGE_MAX_BYTES,
      onError: (c) => c.json({ error: 'too_large' } as const, 413),
    }),
    zValidator('form', imageForm),
    async (c) => {
      const user = currentUser(c)
      const id = c.req.param('id')
      const owned = await ownedItem(id, user.id)
      if ('error' in owned) return c.json(owned, owned.error === 'not_found' ? 404 : 403)
      if (owned.row.archivedAt) return c.json({ error: 'archived' } as const, 409)

      const { image } = c.req.valid('form')
      const stored = await validateAndStoreItemImage(id, image)
      if (!stored.ok) {
        const status = stored.error === 'too_large' ? 413 : 400
        return c.json({ error: stored.error } as const, status)
      }

      // Drop the previous file only after the new one landed, so a failed write
      // does not leave the listing without a photo.
      if (owned.row.imagePath && owned.row.imagePath !== stored.filename) {
        await removeStoredImage(owned.row.imagePath)
      }

      await db.update(items).set({ imagePath: stored.filename }).where(eq(items.id, id))
      await invalidateItems(id)

      const row = await readItem(id)
      if (!row) throw new Error('updated item did not read back')
      return c.json({ item: publicItem(row) })
    },
  )

  .delete('/:id/image', requireUser, async (c) => {
    const user = currentUser(c)
    const id = c.req.param('id')
    const owned = await ownedItem(id, user.id)
    if ('error' in owned) return c.json(owned, owned.error === 'not_found' ? 404 : 403)
    if (owned.row.archivedAt) return c.json({ error: 'archived' } as const, 409)

    if (owned.row.imagePath) {
      await removeStoredImage(owned.row.imagePath)
      await db.update(items).set({ imagePath: null }).where(eq(items.id, id))
      await invalidateItems(id)
    }

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
      await invalidateItems(id)
    }

    const row = await readItem(id)
    if (!row) throw new Error('archived item did not read back')
    return c.json({ item: publicItem(row) })
  })
