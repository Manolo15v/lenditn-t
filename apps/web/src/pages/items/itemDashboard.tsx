import type { ItemCategory } from '@lendit/shared'
import { Archive, Loader2, PackagePlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type Item } from '../../api'
import { HeaderData } from '../../components/header/headerData'
import { ItemForm, type ItemFormData } from '../../components/items/ItemForm'
import { ItemList } from '../../components/items/itemList'
import { Modal } from '../../components/ui/Modal'
import { CardSkeleton, ErrorState } from '../../components/ui/States'
import { Toast, type ToastMessage } from '../../components/ui/Toast'

// Dollars in the form, cents on the wire. Math.round keeps 0.07 from arriving
// as 6 cents, and a blank or unparseable field means a free loan.
const toBody = (data: ItemFormData) => {
  const dollars = Number.parseFloat(data.pricePerDay)
  return {
    name: data.name.trim(),
    description: data.description.trim() || null,
    category: data.category,
    pricePerDayCents: Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0,
  }
}

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

export function ItemDashboard() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [archiving, setArchiving] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.api.items.$get({ query: { mine: 'true' } })
      if (!res.ok) throw new Error('request failed')
      setItems((await res.json()).items)
    } catch {
      setLoadError('We could not load your items. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const announce = useCallback((text: string, kind: ToastMessage['kind'] = 'success') => {
    setToast({ text, kind })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const stats = useMemo(() => {
    const active = items.filter((i) => !i.archivedAt)
    return {
      total: active.length,
      available: active.filter((i) => i.isAvailable).length,
      onLoan: active.filter((i) => !i.isAvailable).length,
      archived: items.length - active.length,
    }
  }, [items])

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setFormError(null)
  }

  async function handleSubmit(data: ItemFormData) {
    setBusy(true)
    setFormError(null)
    try {
      const res = editing
        ? await api.api.items[':id'].$patch({ param: { id: editing.id }, json: toBody(data) })
        : await api.api.items.$post({ json: toBody(data) })

      if (!res.ok) {
        setFormError(await errorFrom(res))
        return
      }

      const label = data.name.trim()
      closeForm()
      await load()
      announce(editing ? `Updated "${label}".` : `"${label}" is now listed.`, 'success')
    } catch {
      setFormError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function handleArchive() {
    if (!archiving) return
    setBusy(true)
    try {
      const res = await api.api.items[':id'].archive.$post({ param: { id: archiving.id } })
      if (!res.ok) {
        announce(await errorFrom(res), 'error')
        return
      }
      const label = archiving.name
      setArchiving(null)
      await load()
      announce(`"${label}" archived.`, 'info')
    } catch {
      announce('Could not reach the server.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderData />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">My items</h1>
            <p className="mt-2 text-sm text-ink-soft">
              List new items to lend, edit details, or archive what you no longer share.
            </p>
          </div>
          <button
            type="button"
            className="btn-accent"
            onClick={() => {
              setEditing(null)
              setFormError(null)
              setFormOpen(true)
            }}
          >
            <PackagePlus className="size-4" aria-hidden="true" />
            List an item
          </button>
        </div>

        {!loading && !loadError && items.length > 0 && (
          <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Listed" value={stats.total} />
            <Stat label="Available" value={stats.available} />
            <Stat label="On loan" value={stats.onLoan} />
            <Stat label="Archived" value={stats.archived} />
          </dl>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : loadError ? (
            <ErrorState
              title="Could not load your items"
              message={loadError}
              onRetry={() => void load()}
            />
          ) : (
            <ItemList
              items={items}
              emptyAction={
                <button type="button" className="btn-accent" onClick={() => setFormOpen(true)}>
                  <PackagePlus className="size-4" aria-hidden="true" />
                  List an item
                </button>
              }
              onEdit={(item) => {
                setEditing(item)
                setFormError(null)
                setFormOpen(true)
              }}
              onArchive={(item) => setArchiving(item)}
            />
          )}
        </div>
      </main>

      <Modal
        open={formOpen}
        title={editing ? 'Edit item' : 'List an item'}
        description={
          editing ? 'Changes are visible to borrowers right away.' : 'All loans are free to borrow.'
        }
        onClose={closeForm}
      >
        <ItemForm
          // Remounts on target change so the fields reflect the item being edited.
          key={editing?.id ?? 'new'}
          initialData={
            editing
              ? {
                  name: editing.name,
                  description: editing.description ?? '',
                  category: (editing.category ?? 'Other') as ItemCategory,
                  pricePerDay:
                    editing.pricePerDayCents === 0
                      ? ''
                      : (editing.pricePerDayCents / 100).toFixed(2),
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={closeForm}
          busy={busy}
          error={formError}
        />
      </Modal>

      <Modal
        open={archiving !== null}
        title="Archive this item?"
        onClose={() => setArchiving(null)}
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">{archiving?.name}</span> stops appearing in browse.
          Nothing is deleted, and any open loan stays as it is.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setArchiving(null)}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-4 py-3">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  )
}
