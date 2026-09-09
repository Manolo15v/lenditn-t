import { type LucideIcon, RotateCcw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-line border-t-accent',
        className,
      )}
    />
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="card mx-auto w-full max-w-md px-6 py-10 text-center">
      <TriangleAlert className="mx-auto size-6 text-red-500" aria-hidden="true" />
      <h2 className="mt-3 text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-5">
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="card mx-auto w-full max-w-md px-6 py-12 text-center">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-line-soft">
        <Icon className="size-5 text-ink-faint" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card animate-pulse p-5">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-line-soft" />
        <div className="h-4 w-2/5 rounded bg-line-soft" />
      </div>
      <div className="mt-4 h-3 w-full rounded bg-line-soft" />
      <div className="mt-2 h-3 w-3/5 rounded bg-line-soft" />
      <div className="mt-6 h-8 w-full rounded-lg bg-line-soft" />
    </div>
  )
}
