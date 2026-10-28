import { cache } from '@lendit/cache'

export const ITEM_CACHE_TTL_MS = 60_000

export const browseKey = 'items:browse'
export const itemKey = (id: string) => `item:${id}`

// Availability is derived from loans, so anything that changes a loan's status
// has to call this too, not only the item routes.
export const invalidateItems = (...ids: string[]) => cache.forget(browseKey, ...ids.map(itemKey))
