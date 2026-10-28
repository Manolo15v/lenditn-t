import type { ItemCategory } from '@lendit/shared'
import {
  Archive,
  Calculator,
  CircleDashed,
  Compass,
  type LucideIcon,
  Package,
  Shirt,
  Zap,
} from 'lucide-react'
import type { Item } from '../api'
import type { ItemFormData } from '../components/items/ItemForm'

const CATEGORY_ICONS: Record<ItemCategory, LucideIcon> = {
  Calculators: Calculator,
  'Lab Coats': Shirt,
  'Drafting Kits': Compass,
  'Soldering Irons': Zap,
  Other: Package,
}

export function categoryIcon(category: string | null): LucideIcon {
  return CATEGORY_ICONS[category as ItemCategory] ?? Package
}

export type ItemStatus = {
  label: string
  icon: LucideIcon
  chip: string
  dot: string
}

// Archived wins over availability: an archived item is off the board regardless
// of whether a loan is open against it.
export function itemStatus(item: Pick<Item, 'archivedAt' | 'isAvailable'>): ItemStatus {
  if (item.archivedAt) {
    return {
      label: 'Archived',
      icon: Archive,
      chip: 'border-line bg-line-soft text-ink-soft',
      dot: 'bg-ink-faint',
    }
  }
  if (item.isAvailable) {
    return {
      label: 'Available',
      icon: CircleDashed,
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    }
  }
  return {
    label: 'On loan',
    icon: CircleDashed,
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  }
}

export const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`

// A price of 0 is a free loan, so "Free" is the honest label rather than a
// discount on an invented list price.
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `${formatCents(cents)} / day`
}

// The database keeps an offer strictly between 0 and the price, so the result
// is always 1–99 and the division can never be by zero.
export const offerDiscountPercent = (priceCents: number, offerCents: number) =>
  Math.max(1, Math.round((1 - offerCents / priceCents) * 100))

// Dollars in the form, cents on the wire. Math.round keeps 0.07 from arriving
// as 6 cents, and a blank or unparseable field means a free loan. Shared by
// every screen that submits the item form — and by the form's own offer check,
// which has to compare the cents that will be sent, not the dollars typed.
export const dollarsToCents = (raw: string) => {
  const dollars = Number.parseFloat(raw)
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0
}

export function itemBody(data: ItemFormData) {
  const price = dollarsToCents(data.pricePerDay)
  const offer = dollarsToCents(data.offerPricePerDay)
  return {
    name: data.name.trim(),
    description: data.description.trim() || null,
    category: data.category,
    pricePerDayCents: price,
    // Always sent, null included: a cleared field has to end the offer, not
    // leave the stored one standing. A free item never carries one.
    offerPricePerDayCents: price > 0 && offer > 0 ? offer : null,
  }
}

const centsToField = (cents: number | null) => (cents ? (cents / 100).toFixed(2) : '')

export function itemFormData(item: Item): ItemFormData {
  return {
    name: item.name,
    description: item.description ?? '',
    category: (item.category ?? 'Other') as ItemCategory,
    pricePerDay: centsToField(item.pricePerDayCents),
    offerPricePerDay: centsToField(item.offerPricePerDayCents),
  }
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso))
