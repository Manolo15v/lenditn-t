import type { ItemCategory } from '@lendit/shared'
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Link2,
  Loader2,
  Pencil,
  Tag,
  User,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Item } from '../../api'
import { HeaderData } from '../../components/header/headerData'
import { ItemForm, type ItemFormData } from '../../components/items/ItemForm'
import { Modal } from '../../components/ui/Modal'
import { ErrorState, Spinner } from '../../components/ui/States'
import { Toast, type ToastMessage } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import { categoryIcon, formatDate, formatPrice, itemStatus } from '../../lib/items'

const messages: Record<string, string> = {
  not_owner: 'That item belongs to someone else.',
  not_found: 'That item no longer exists.',
  archived: 'That item is archived, so it cannot be edited.',
  unauthenticated: 'Your session expired. Sign in again.',
}

async function errorFrom(res: Response) {
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return messages[body.error ?? ''] ?? 'Something went wrong. Please try again.'
}

const toBody = (data: ItemFormData) => {
  const dollars = Number.parseFloat(data.pricePerDay)
  return {
    name: data.name.trim(),
    description: data.description.trim() || null,
    category: data.category,
    pricePerDayCents: Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0,
  }
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [item, setItem] = useState<Item | null>(null)
  const [related, setRelated] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async (itemId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.api.items[':id'].$get({ param: { id: itemId } })
      if (!res.ok) {
        setError(
          res.status === 404
            ? 'This item is not in the catalogue.'
            : 'We could not load this item. Please try again.',
        )
        return
      }

      const data = await res.json()
      if (!('item' in data)) {
        setError('This item is not in the catalogue.')
        return
      }
      const loaded = data.item as Item
      setItem(loaded)

      // Same category first so "related" means something; falls back to filling
      // the row with anything else rather than showing an empty section.
      const listRes = await api.api.items.$get({ query: {} })
      if (listRes.ok) {
        const { items: all } = await listRes.json()
        const others = all.filter((i: Item) => i.id !== itemId)
        const sameCategory = others.filter((i: Item) => i.category === loaded.category)
        const rest = others.filter((i: Item) => i.category !== loaded.category)
        setRelated([...sameCategory, ...rest].slice(0, 3))
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) void load(id)
  }, [id, load])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleEdit(data: ItemFormData) {
    if (!item) return
    setBusy(true)
    setFormError(null)
    try {
      const res = await api.api.items[':id'].$patch({
        param: { id: item.id },
        json: toBody(data),
      })
      if (!res.ok) {
        setFormError(await errorFrom(res))
        return
      }
      const { item: updated } = await res.json()
      setItem(updated as Item)
      setEditOpen(false)
      setToast({ text: 'Item updated.', kind: 'success' })
    } catch {
      setFormError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function handleArchive() {
    if (!item) return
    setBusy(true)
    try {
      const res = await api.api.items[':id'].archive.$post({ param: { id: item.id } })
      if (!res.ok) {
        setToast({ text: await errorFrom(res), kind: 'error' })
        return
      }
      const { item: updated } = await res.json()
      setItem(updated as Item)
      setArchiveOpen(false)
      setToast({ text: 'Item archived.', kind: 'info' })
    } catch {
      setToast({ text: 'Could not reach the server.', kind: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      setToast({ text: 'Could not copy the link.', kind: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <HeaderData />
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="flex min-h-screen flex-col">
        <HeaderData />
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-12">
          <ErrorState
            title="Item not found"
            message={error ?? 'This item may have been removed.'}
            onRetry={() => navigate('/items')}
          />
        </main>
      </div>
    )
  }

  const status = itemStatus(item)
  const Icon = categoryIcon(item.category)
  const isOwner = user?.id === item.ownerId
  const isArchived = Boolean(item.archivedAt)

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderData />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Link to="/items" className="inline-flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Browse
          </Link>
          <ChevronRight className="size-3 text-ink-faint" aria-hidden="true" />
          <span>{item.category ?? 'Other'}</span>
          <ChevronRight className="size-3 text-ink-faint" aria-hidden="true" />
          <span className="truncate text-ink">{item.name}</span>
        </nav>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-center border-b border-line bg-canvas py-14">
                <span
                  className="flex size-24 items-center justify-center rounded-2xl bg-surface
                    ring-1 ring-line"
                  aria-hidden="true"
                >
                  <Icon className="size-10 text-accent" strokeWidth={1.5} />
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('chip', status.chip)}>
                    <span className={cn('size-1.5 rounded-full', status.dot)} aria-hidden="true" />
                    {status.label}
                  </span>
                  <span className="chip border-line bg-line-soft text-ink-soft">
                    <Tag className="size-3" aria-hidden="true" />
                    {item.category ?? 'Other'}
                  </span>
                </div>

                <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  {item.name}
                </h1>

                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {item.description || 'The owner has not added a description for this item.'}
                </p>

                <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-line pt-5 sm:grid-cols-2">
                  <Detail icon={User} label="Lent by" value={item.ownerName} />
                  <Detail icon={Tag} label="Category" value={item.category ?? 'Other'} />
                  <Detail icon={CalendarDays} label="Listed" value={formatDate(item.createdAt)} />
                  <Detail
                    icon={Archive}
                    label="Archived"
                    value={item.archivedAt ? formatDate(item.archivedAt) : 'No'}
                  />
                </dl>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-1">
            <div className="card sticky top-20 p-5">
              <p className="text-2xl font-semibold tracking-tight text-ink">
                {formatPrice(item.pricePerDayCents)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {item.pricePerDayCents === 0
                  ? 'Lent free by a fellow student.'
                  : 'Charged per day of the loan.'}
              </p>

              <div className="mt-5 border-t border-line pt-5">
                {isArchived ? (
                  <p className="flex items-start gap-2 text-sm text-ink-soft">
                    <CircleAlert
                      className="mt-0.5 size-4 shrink-0 text-ink-faint"
                      aria-hidden="true"
                    />
                    This item is archived and not available to borrow.
                  </p>
                ) : item.isAvailable ? (
                  <p className="text-sm text-ink-soft">
                    Available now. Contact{' '}
                    <span className="font-medium text-ink">{item.ownerName}</span> to arrange the
                    hand-off.
                  </p>
                ) : (
                  <p className="text-sm text-ink-soft">
                    Currently out on loan. Check back once it is returned.
                  </p>
                )}
              </div>

              {isOwner ? (
                <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5">
                  <p className="text-xs font-medium text-ink-soft">You own this item</p>
                  <button
                    type="button"
                    className="btn-outline w-full"
                    onClick={() => {
                      setFormError(null)
                      setEditOpen(true)
                    }}
                    disabled={isArchived}
                    title={isArchived ? 'Archived items cannot be edited' : undefined}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit details
                  </button>
                  {!isArchived && (
                    <button
                      type="button"
                      className="btn-quiet-danger w-full"
                      onClick={() => setArchiveOpen(true)}
                    >
                      <Archive className="size-4" aria-hidden="true" />
                      Archive item
                    </button>
                  )}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void copyLink()}
                className="btn-ghost mt-4 w-full justify-center"
              >
                {copied ? (
                  <Check className="size-4 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Link2 className="size-4" aria-hidden="true" />
                )}
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-12 border-t border-line pt-8">
            <h2 className="text-sm font-semibold text-ink">More from the catalogue</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((rel) => {
                const RelIcon = categoryIcon(rel.category)
                const relStatus = itemStatus(rel)
                return (
                  <Link
                    key={rel.id}
                    to={`/items/${rel.id}`}
                    className="card group flex flex-col p-4 transition-colors hover:border-ink-faint"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="flex size-8 items-center justify-center rounded-lg bg-accent-soft"
                        aria-hidden="true"
                      >
                        <RelIcon className="size-4 text-accent" />
                      </span>
                      <span className={cn('chip', relStatus.chip)}>{relStatus.label}</span>
                    </div>
                    <h3 className="mt-3 line-clamp-1 text-sm font-medium text-ink group-hover:text-accent">
                      {rel.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-soft">{rel.category ?? 'Other'}</p>
                    <p className="mt-3 text-sm font-semibold text-ink">
                      {formatPrice(rel.pricePerDayCents)}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <Modal
        open={editOpen}
        title="Edit item"
        description="Changes are visible to borrowers right away."
        onClose={() => setEditOpen(false)}
      >
        <ItemForm
          key={item.id}
          initialData={{
            name: item.name,
            description: item.description ?? '',
            category: (item.category ?? 'Other') as ItemCategory,
            pricePerDay:
              item.pricePerDayCents === 0 ? '' : (item.pricePerDayCents / 100).toFixed(2),
          }}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
          busy={busy}
          error={formError}
        />
      </Modal>

      <Modal open={archiveOpen} title="Archive this item?" onClose={() => setArchiveOpen(false)}>
        <p className="text-sm leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">{item.name}</span> stops appearing in browse.
          Nothing is deleted, and any open loan stays as it is.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn-outline"
            onClick={() => setArchiveOpen(false)}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-quiet-danger"
            onClick={() => void handleArchive()}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Archive className="size-4" aria-hidden="true" />
            )}
            Archive
          </button>
        </div>
      </Modal>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function Detail({
  icon: DetailIcon,
  label,
  value,
}: {
  icon: typeof User
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <DetailIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-soft">{label}</dt>
        <dd className="truncate text-sm font-medium text-ink">{value}</dd>
      </div>
    </div>
  )
}
