import type { ItemCategory } from '@lendit/shared'
import { MongoClient } from 'mongodb'

const url = process.env.MONGO_URL
if (!url) throw new Error('MONGO_URL is not set (expected in the root .env)')

// The driver connects on first use, so there is no connect() to await at boot.
export const mongo = new MongoClient(url)
// Database name comes from the URL path (/lendit).
export const mongoDb = mongo.db()

export type ConditionEntry = {
  at: Date
  kind: 'handover' | 'return' | 'inspection'
  loanId?: string
  byUserId: string
  condition: 'new' | 'good' | 'worn' | 'damaged'
  checklist?: Record<string, boolean>
  notes?: string
}

// _id is items.id from Postgres. Mongo holds the spec sheet, never the item itself.
export type ItemSpecs = {
  _id: string
  category: ItemCategory
  attributes: Record<string, unknown>
  conditionLog: ConditionEntry[]
  updatedAt: Date
}

export const itemSpecs = mongoDb.collection<ItemSpecs>('item_specs')
