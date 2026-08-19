import type { Item } from '../../api'
import { cn } from '../../lib/cn'

interface ItemInfoProps {
  item: Item
  className?: string
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function ItemInfo({ item, className }: ItemInfoProps) {
  const status = item.archivedAt
    ? { label: 'Archived', classes: 'bg-slate-500/10 text-slate-600 border-slate-500/20' }
    : item.isAvailable
      ? { label: 'Available', classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' }
      : { label: 'On Loan', classes: 'bg-amber-500/10 text-amber-700 border-amber-500/20' }

  return (
    <article
      className={cn(
        'animate-fade-in group relative flex h-full flex-col',
        'bg-white',
        'border border-[var(--primary)]/30 rounded-[var(--radius-sm)]',
        'shadow-[var(--shadow-md)] transition-colors hover:border-[var(--primary)] hover:shadow-[var(--shadow-lg)]',
        'px-8 py-10 sm:px-12 sm:py-12',
        className,
      )}
    >
      <h3 className="text-center text-2xl font-bold leading-snug text-[var(--text-primary)] sm:text-3xl">
        {item.name}
      </h3>

      <p className="mt-6 flex-1 text-center text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
        {item.description || <em>No description provided.</em>}
      </p>

      {/* Margen superior añadido para separar del contenido previo */}
      <div className='mt-8 text-center'>
        <span className={cn('badge text-sm sm:text-base whitespace-nowrap', status.classes)}>
          Status: {status.label}
        </span>
      </div>

      <footer className="mt-10 border-t border-[var(--border-color)] pt-8">
        {/* Bloque alineado a la izquierda pero centrado en la tarjeta */}
        <div className="mx-auto flex w-fit flex-col gap-y-5 text-left">
          <div>
            <p className="text-base font-medium text-[var(--text-secondary)] sm:text-lg">
               Lent by <span className="font-semibold text-[var(--text-primary)]">{item.ownerName}</span>
            </p>
          </div>

          <div>
            <time
              dateTime={item.createdAt}
              className="block text-base font-medium text-[var(--text-secondary)] sm:text-lg"
            >
            Listed: {dateFormatter.format(new Date(item.createdAt))}
            </time>
          </div>

          <div>
            <p className="text-base font-medium text-[var(--text-secondary)] sm:text-lg">
              Category: {item.category ?? 'Other'}
            </p>
          </div>
        </div>
      </footer>
    </article>
  )
}
