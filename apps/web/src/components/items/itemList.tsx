import { ITEM_CATEGORIES } from '@lendit/shared'
import { PackageOpen, Search, X } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import type { Item } from '../../api'
import { cn } from '../../lib/cn'
import { EmptyState } from '../ui/States'
import { ItemInfo } from './itemInfo'

interface ItemListProps {
  items: Item[]
  className?: string
  emptyAction?: ReactNode
  onEdit?: (item: Item) => void
  onArchive?: (item: Item) => void
}

type CategoryFilter = 'all' | (typeof ITEM_CATEGORIES)[number]

export function ItemList({ items, className, emptyAction, onEdit, onArchive }: ItemListProps) {
  const [seek, setSeek] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')

  const filtered = useMemo(() => {
    const query = seek.trim().toLowerCase()
    return items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false)
      const matchesCategory = category === 'all' || item.category === category
      return matchesQuery && matchesCategory
    })
  }, [items, seek, category])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items)
      map.set(item.category ?? 'Other', (map.get(item.category ?? 'Other') ?? 0) + 1)
    return map
  }, [items])

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            className="field pl-10 pr-10"
            placeholder="Search by name or description"
            value={seek}
            onChange={(e) => setSeek(e.target.value)}
            aria-label="Search items"
          />
          {seek && (
            <button
              type="button"
              onClick={() => setSeek('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint
                hover:bg-line-soft hover:text-ink"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <FilterChip
            active={category === 'all'}
            onClick={() => setCategory('all')}
            label="All"
            count={items.length}
          />
          {ITEM_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
              label={cat}
              count={counts.get(cat) ?? 0}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={items.length === 0 ? 'Nothing listed yet' : 'No matches'}
          message={
            items.length === 0
              ? 'Be the first to lend something to the community.'
              : 'Try a different keyword or category.'
          }
          action={items.length === 0 ? emptyAction : undefined}
        />
      ) : (
        <>
          <p className="text-xs text-ink-soft">
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <ItemInfo key={item.id} item={item} onEdit={onEdit} onArchive={onArchive} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'chip shrink-0 whitespace-nowrap transition-colors',
        active
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink',
      )}
    >
      {label}
      <span className={cn('text-[11px]', active ? 'text-white/60' : 'text-ink-faint')}>
        {count}
      </span>
    </button>
  )
}
