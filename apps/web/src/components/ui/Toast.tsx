import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'

export type ToastKind = 'success' | 'info' | 'error'
export type ToastMessage = { text: string; kind: ToastKind }

const STYLES: Record<ToastKind, { icon: typeof Info; accent: string }> = {
  success: { icon: CircleCheck, accent: 'text-emerald-600' },
  info: { icon: Info, accent: 'text-accent' },
  error: { icon: CircleAlert, accent: 'text-red-600' },
}

export function Toast({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  const { icon: Icon, accent } = STYLES[message.kind]

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-in fixed inset-x-4 bottom-4 z-50 flex items-start gap-3 rounded-xl
        border border-line bg-surface px-4 py-3 shadow-lg sm:inset-x-auto sm:right-6 sm:max-w-sm"
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', accent)} aria-hidden="true" />
      <p className="flex-1 text-sm text-ink">{message.text}</p>
      <button type="button" onClick={onDismiss} className="btn-ghost -mr-1.5 -mt-1 p-1.5">
        <X className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  )
}
