import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Item } from '../../api'
import { HeaderData } from '../../components/header/headerData'
import { ItemForm, type ItemFormData } from '../../components/items/ItemForm'
import { ItemList } from '../../components/items/itemList'

type Notice = { text: string; type: 'success' | 'info' | 'error' }

const toBody = (data: ItemFormData) => ({
  name: data.name.trim(),
  description: data.description.trim() || null,
  category: data.category,
})

const messages: Record<string, string> = {
  not_owner: 'That item belongs to someone else.',
  not_found: 'That item no longer exists.',
  archived: 'That item is archived, so it cannot be edited.',
  unauthenticated: 'Your session expired. Sign in again.',
}

export function ItemDashboard() {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [_loading, setLoading] = useState(true)
  const [items, setItems] = useState<Item[]>([])
  const [_isAdding, setIsAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.api.items.$get({ query: { mine: 'true' } })
      if (!res.ok) throw new Error('failed')
      setItems((await res.json()).items)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const announce = useCallback((text: string, type: Notice['type'] = 'success') => {
    setNotice({ text, type })
    setTimeout(() => setNotice(null), 4000)
  }, [])

  async function failed(res: Response) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    return messages[body.error ?? ''] ?? 'Something went wrong.'
  }

  async function afterMutation(text: string, type: Notice['type'] = 'success') {
    setIsAdding(false)
    setEditingItem(null)
    setFormError(null)
    await load()
    announce(text, type)
  }

  async function handleCreateItem(data: ItemFormData) {
    try {
      setBusy(true)
      setFormError(null)
      setModalOpen(false)
      const res = await api.api.items.$post({ json: toBody(data) })
      if (!res.ok) return setFormError(await failed(res))
      await afterMutation(`"${data.name.trim()}" listed successfully.`)
    } catch {
      setFormError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function _handleEditItem(data: ItemFormData) {
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

  async function _handleArchiveItem(item: Item) {
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

  const clickFuntion = () => {
    setModalOpen(false)
    setIsAdding(true)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderData />

      <main className="lendit-container flex w-full flex-1 flex-col gap-8">
        <div className="flex justify-end">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/items')}>
            Go to community items
          </button>
        </div>

        <section className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">
            Add new items to lend or edit existing ones.
          </p>
        </section>

        <div className="flex justify-end">
          <button className="btn btn-primary" type="button" onClick={() => setModalOpen(true)}>
            Add new Item
          </button>
        </div>

        <ItemList items={items} />
      </main>

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          role="dialog"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setModalOpen(false)
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-md)] bg-white p-8 shadow-[var(--shadow-lg)]"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
              }
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Add new Item</h2>
              <button
                type="button"
                className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                onClick={() => clickFuntion()}
                aria-label="Close modal"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ItemForm
              onSubmit={handleCreateItem}
              onCancel={() => {
                setIsAdding(false)
                setFormError(null)
                setModalOpen(false)
              }}
              busy={busy}
              error={formError}
            />
          </div>
        </div>
      )}

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
    </div>
  )
}
