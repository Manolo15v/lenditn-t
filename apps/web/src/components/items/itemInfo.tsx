import { Archive, ArrowRight, Pencil, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Item } from '../../api'
import { cn } from '../../lib/cn'
import { categoryIcon, formatDate, formatPrice, itemStatus } from '../../lib/items'

interface ItemInfoProps {
  item: Item
  className?: string
  onEdit?: (item: Item) => void
  onArchive?: (item: Item) => void
}

export function ItemInfo({ item, className, onEdit, onArchive }: ItemInfoProps) {
  const status = itemStatus(item)
  const Icon = categoryIcon(item.category)
  const isArchived = Boolean(item.archivedAt)
  const showActions = Boolean(onEdit || onArchive)

  return (
    <article
      className={cn(
        'animate-fade-in card group flex h-full flex-col p-5 transition-colors hover:border-ink-faint',
        isArchived && 'bg-canvas',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft"
          aria-hidden="true"
        >
          <Icon className="size-4.5 text-accent" />
        </span>
        <span className={cn('chip', status.chip)}>
          <span className={cn('size-1.5 rounded-full', status.dot)} aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <h3 className="mt-3.5 text-sm font-semibold leading-snug text-ink">
        <Link to={`/items/${item.id}`} className="hover:text-accent">
          {item.name}
        </Link>
      </h3>

      <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-soft">
        {item.description || 'No description provided.'}
      </p>

      <dl className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
        <div className="flex items-center gap-1.5">
          <User className="size-3.5 text-ink-faint" aria-hidden="true" />
          <dt className="sr-only">Lender</dt>
          <dd>{item.ownerName}</dd>
        </div>
        <span className="text-line" aria-hidden="true">
          •
        </span>
        <div>
          <dt className="sr-only">Category</dt>
          <dd>{item.category ?? 'Other'}</dd>
        </div>
        <span className="text-line" aria-hidden="true">
          •
        </span>
        <div>
          <dt className="sr-only">Listed</dt>
          <dd>
            <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
          </dd>
        </div>
      </dl>

      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
        <span className="text-sm font-semibold text-ink">{formatPrice(item.pricePerDayCents)}</span>

        {showActions ? (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                disabled={isArchived}
                title={isArchived ? 'Archived items cannot be edited' : 'Edit item'}
                className="btn-ghost p-2 disabled:opacity-40"
              >
                <Pencil className="size-4" aria-hidden="true" />
                <span className="sr-only">Edit {item.name}</span>
              </button>
            )}
            {onArchive && !isArchived && (
              <button
                type="button"
                onClick={() => onArchive(item)}
                title="Archive item"
                className="btn-ghost p-2 hover:text-red-600"
              >
                <Archive className="size-4" aria-hidden="true" />
                <span className="sr-only">Archive {item.name}</span>
              </button>
            )}
            <Link to={`/items/${item.id}`} className="btn-ghost p-2">
              <ArrowRight className="size-4" aria-hidden="true" />
              <span className="sr-only">View {item.name}</span>
            </Link>
          </div>
        ) : (
          <Link
            to={`/items/${item.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent
              hover:text-accent-hover"
          >
            View details
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        )}
      </footer>
    </article>
  )
}
