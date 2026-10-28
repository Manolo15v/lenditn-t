import { zValidator } from '@hono/zod-validator'
import { db, items } from '@lendit/db'
import { ITEM_CATEGORIES, type ItemCategory } from '@lendit/shared'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Document } from 'mongodb'
import { z } from 'zod'
import type { AppEnv } from '../env.ts'
import { type ItemSpecs, itemSpecs } from '../lib/mongo.ts'
import { requireUser } from '../middleware.ts'

// The only free-form part of the document. Its shape is the owner's call.
const specsInput = z.object({ attributes: z.record(z.string(), z.unknown()) })

const conditionInput = z.object({
  kind: z.enum(['handover', 'return', 'inspection']),
  condition: z.enum(['new', 'good', 'worn', 'damaged']),
  loanId: z.string().optional(),
  checklist: z.record(z.string(), z.boolean()).optional(),
  notes: z.string().max(500).optional(),
})

const searchInput = z
  .object({
    category: z.enum(ITEM_CATEGORIES).optional(),
    // Dotted paths are fine (temperatureC.max); operators are not. A key
    // starting with $ would turn the query string into a query injection.
    key: z
      .string()
      .regex(/^[A-Za-z]\w*(\.[A-Za-z]\w*)*$/)
      .optional(),
    value: z.string().optional(),
  })
  .refine((v) => !v.value || v.key, { message: 'value requires key' })

const publicSpecs = (doc: ItemSpecs) => ({
  itemId: doc._id,
  category: doc.category,
  attributes: doc.attributes,
  conditionLog: doc.conditionLog.map((e) => ({ ...e, at: e.at.toISOString() })),
  updatedAt: doc.updatedAt.toISOString(),
})

// A query string is always text, but the stored attribute may be 65 or true.
const coerce = (v: string) => {
  if (v === 'true') return true
  if (v === 'false') return false
  if (v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return v
}

// Ownership is decided by Postgres. Mongo has no idea who owns what.
async function ownedItem(itemId: string, userId: string) {
  const [row] = await db
    .select({ ownerId: items.ownerId, category: items.category, archivedAt: items.archivedAt })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1)

  if (!row) return { error: 'not_found', status: 404 } as const
  if (row.ownerId !== userId) return { error: 'not_owner', status: 403 } as const
  return { row }
}

export const itemSpecsRoutes = new Hono<AppEnv>()
  // GET /api/specs?category=Soldering%20Irons&key=watts&value=65
  .get('/', zValidator('query', searchInput), async (c) => {
    const { category, key, value } = c.req.valid('query')
    const filter: Document = {}
    if (category) filter.category = category
    if (key) filter[`attributes.${key}`] = value === undefined ? { $exists: true } : coerce(value)

    const docs = await itemSpecs.find(filter).sort({ updatedAt: -1 }).limit(50).toArray()
    return c.json({ specs: docs.map(publicSpecs) })
  })

  .get('/:itemId', async (c) => {
    const doc = await itemSpecs.findOne({ _id: c.req.param('itemId') })
    if (!doc) return c.json({ error: 'not_found' } as const, 404)
    return c.json({ specs: publicSpecs(doc) })
  })

  .put('/:itemId', requireUser, zValidator('json', specsInput), async (c) => {
    const user = c.get('user')
    if (!user) throw new Error('route is missing requireUser')
    const itemId = c.req.param('itemId')

    const owned = await ownedItem(itemId, user.id)
    if ('error' in owned) return c.json({ error: owned.error }, owned.status)
    if (owned.row.archivedAt) return c.json({ error: 'archived' } as const, 409)

    // Category is copied from Postgres, never read from the body, so the two
    // stores cannot disagree about what kind of item this is.
    const doc = await itemSpecs.findOneAndUpdate(
      { _id: itemId },
      {
        $set: {
          category: (owned.row.category ?? 'Other') as ItemCategory,
          attributes: c.req.valid('json').attributes,
          updatedAt: new Date(),
        },
        $setOnInsert: { conditionLog: [] },
      },
      { upsert: true, returnDocument: 'after' },
    )
    if (!doc) throw new Error('upsert returned no document')
    return c.json({ specs: publicSpecs(doc) })
  })

  .post('/:itemId/condition', requireUser, zValidator('json', conditionInput), async (c) => {
    const user = c.get('user')
    if (!user) throw new Error('route is missing requireUser')
    const itemId = c.req.param('itemId')

    const owned = await ownedItem(itemId, user.id)
    if ('error' in owned) return c.json({ error: owned.error }, owned.status)

    // Archived items still accept entries: a loan can be returned after archiving.
    const entry = { ...c.req.valid('json'), at: new Date(), byUserId: user.id }
    const doc = await itemSpecs.findOneAndUpdate(
      { _id: itemId },
      { $push: { conditionLog: entry }, $set: { updatedAt: entry.at } },
      { returnDocument: 'after' },
    )
    if (!doc) return c.json({ error: 'no_specs' } as const, 404)
    return c.json({ specs: publicSpecs(doc) }, 201)
  })
