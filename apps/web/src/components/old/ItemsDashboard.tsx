import { useCallback, useEffect, useState } from 'react'
import { api, type Item } from '../api.ts'
import { ItemForm, type ItemFormData } from './items/ItemForm.tsx'
import { ItemList } from './old/ItemList.tsx'

interface ItemsDashboardProps {
  currentUserId: string
}

type Scope = 'all' | 'mine'
type Notice = { text: string; type: 'success' | 'info' | 'error' }

const messages: Record<string, string> = {
  not_owner: 'That item belongs to someone else.',
  not_found: 'That item no longer exists.',
  archived: 'That item is archived, so it cannot be edited.',
  unauthenticated: 'Your session expired. Sign in again.',
}

// The form works in strings; the wire wants null for "not provided", because an
// empty description is absence, not the empty string.
const toBody = (data: ItemFormData) => ({
  name: data.name.trim(),
  description: data.description.trim() || null,
  category: data.category,
})

export function ItemsDashboard({ currentUserId }: ItemsDashboardProps) {
  const [items, setItems] = useState<Item[]>([])
  const [scope, setScope] = useState<Scope>('all')
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const announce = useCallback((text: string, type: Notice['type'] = 'success') => {
    setNotice({ text, type })
    setTimeout(() => setNotice(null), 4000)
  }, [])

  const load = useCallback(
    async (next: Scope) => {
      setLoading(true)
      try {
        const res = await api.api.items.$get({ query: next === 'mine' ? { mine: 'true' } : {} })
        if (!res.ok) throw new Error('failed')
        setItems((await res.json()).items)
      } catch {
        announce('Could not load items.', 'error')
      } finally {
        setLoading(false)
      }
    },
    [announce],
  )

  useEffect(() => {
    void load(scope)
  }, [load, scope])

  async function afterMutation(text: string, type: Notice['type'] = 'success') {
    setIsAdding(false)
    setEditingItem(null)
    setFormError(null)
    await load(scope)
    announce(text, type)
  }

  async function failed(res: Response) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    return messages[body.error ?? ''] ?? 'Something went wrong.'
  }

  async function handleCreateItem(data: ItemFormData) {
    setBusy(true)
    setFormError(null)
    try {
      const res = await api.api.items.$post({ json: toBody(data) })
      if (!res.ok) return setFormError(await failed(res))
      await afterMutation(`"${data.name.trim()}" listed successfully.`)
    } catch {
      setFormError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEditItem(data: ItemFormData) {
    if (!editingItem) return
    setBusy(true)
    setFormError(null)
    try {
      const res = await api.api.items[':id'].$patch({
        param: { id: editingItem.id },
        json: toBody(data),
      })
      if (!res.ok) return setFormError(await failed(res))
      await afterMutation(`Updated "${data.name.trim()}".`, 'info')
    } catch {
      setFormError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function handleArchiveItem(item: Item) {
    if (!confirm(`Archive "${item.name}"? It stops appearing in browse. Nothing is deleted.`))
      return

    try {
      const res = await api.api.items[':id'].archive.$post({ param: { id: item.id } })
      if (!res.ok) return announce(await failed(res), 'error')
      await afterMutation(`"${item.name}" archived.`, 'info')
    } catch {
      announce('Could not reach the server.', 'error')
    }
  }

  function handleBorrowRequest(item: Item) {
    announce(`Requesting "${item.name}" arrives with the borrow loop.`, 'info')
  }

  return (
    <div className="lendit-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #2e1065 0%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {scope === 'mine' ? 'My Items' : 'Available Materials'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {scope === 'mine'
              ? 'Everything you have listed, archived items included.'
              : 'Borrow calculators, lab coats, drafting kits and more from other students. Free.'}
          </p>
        </div>

        {!isAdding && !editingItem && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {(['all', 'mine'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn"
                  onClick={() => setScope(s)}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    backgroundColor: scope === s ? 'var(--primary)' : 'rgba(124, 58, 237, 0.08)',
                    color: scope === s ? '#fff' : 'var(--text-secondary)',
                    border: scope === s ? 'none' : '1px solid var(--border-color)',
                  }}
                >
                  {s === 'all' ? 'Browse' : 'Mine'}
                </button>
              ))}
            </div>

            <button type="button" className="btn btn-primary" onClick={() => setIsAdding(true)}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Lend an Item
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            borderLeft: `4px solid ${
              notice.type === 'success'
                ? 'var(--success)'
                : notice.type === 'error'
                  ? 'var(--danger)'
                  : 'var(--primary)'
            }`,
            boxShadow: '0 10px 40px rgba(124, 58, 237, 0.25)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'fadeIn var(--transition-fast) forwards',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>
            {notice.type === 'success' ? '✓' : notice.type === 'error' ? '!' : 'ℹ'}
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notice.text}</span>
        </div>
      )}

      {isAdding ? (
        <ItemForm
          onSubmit={handleCreateItem}
          onCancel={() => {
            setIsAdding(false)
            setFormError(null)
          }}
          busy={busy}
          error={formError}
        />
      ) : editingItem ? (
        <ItemForm
          initialData={{
            name: editingItem.name,
            description: editingItem.description ?? '',
            category: (editingItem.category ?? 'Other') as ItemFormData['category'],
          }}
          onSubmit={handleEditItem}
          onCancel={() => {
            setEditingItem(null)
            setFormError(null)
          }}
          busy={busy}
          error={formError}
        />
      ) : loading ? (
        <div
          className="glass-panel"
          style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}
        >
          <p>Loading items...</p>
        </div>
      ) : (
        <ItemList
          items={items}
          currentUserId={currentUserId}
          onBorrowRequest={handleBorrowRequest}
          onEdit={setEditingItem}
          onArchive={handleArchiveItem}
        />
      )}
    </div>
  )
}
