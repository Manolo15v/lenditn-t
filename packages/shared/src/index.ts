// Constants both sides of the wire must agree on. Not validation — that is
// server-side only, in @lendit/db/validation, so pg-core stays out of the
// browser bundle. This is the only package `web` may import at runtime.

// Fixed rather than free text: left open, "Calculators" / "calculator" / "calc"
// become three categories by week two and the browse filter silently splits.
// The column stays plain text — this list is the wire vocabulary, enforced by
// the route that accepts it, not by a Postgres enum that needs a migration to
// grow.
export const ITEM_CATEGORIES = [
  'Calculators',
  'Lab Coats',
  'Drafting Kits',
  'Soldering Irons',
  'Other',
] as const

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]
