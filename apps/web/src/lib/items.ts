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

// The API stores every listing at 0 cents today, so "Free" is the honest label
// rather than a discount on an invented list price.
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)} / day`
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso))
