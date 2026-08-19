import {useState } from 'react'
import {type Item } from '../../api'
import { ItemInfo } from './itemInfo'
import { cn } from '../../lib/cn' 

interface ItemListProps {
  items: Item[],
  className?: string
}

export function ItemList({items, className}: ItemListProps) {
  const [seek, setSeek] = useState('')

  const query = seek.trim().toLowerCase()

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      !!item.description?.toLowerCase().includes(query)
    return matchesSearch

  })
  return (
    <div className="flex min-h-screen flex-col gap-y-6">

        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center gap-4 rounded-[var(--radius-md)] border-2 border-[var(--primary)] bg-white px-6 py-6 shadow-[var(--shadow-lg)]">
            <svg
              className="size-6 shrink-0 text-[var(--primary)] sm:size-7" /* Ícono más grande */
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.34-4.34M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
              />
            </svg>
            <input
              type="text"
              className={cn(
                'w-full bg-transparent text-lg text-[var(--text-primary)] outline-none', // Texto base más grande (lg)
                'placeholder:text-[var(--text-muted)] sm:text-xl', // Texto responsivo más grande en pantallas medianas (xl)
              )}
              placeholder="Search items by name or description..."
              value={seek}
              onChange={(e) => setSeek(e.target.value)}
              aria-label="Search items"
            />
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <div className="mx-auto w-full max-w-md rounded-[var(--radius-md)] border border-[var(--primary)]/30 bg-white px-6 py-12 text-center shadow-[var(--shadow-md)]">
            <p className="text-lg font-semibold text-[var(--text-primary)]">Nothing found</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Try a different keyword, or be the first to lend something.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <ItemInfo key={item.id} item={item} />
            ))}
          </div>
        )}
    </div>
  )
}
