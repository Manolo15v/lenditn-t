import { useState } from 'react'
import { ItemForm, type ItemFormData } from './ItemForm.tsx'
import { type Item, ItemList } from './ItemList.tsx'

interface ItemsDashboardProps {
  currentUserId: string
  currentUserName: string
}

// Pre-seeded mock items for preview
const INITIAL_MOCK_ITEMS: Item[] = [
  {
    id: 'item_1',
    ownerId: 'user_bob',
    ownerName: 'Bob Jenkins',
    name: 'Texas Instruments TI-84 Plus CE',
    description:
      'Graphing calculator in great condition. Backlight screen works perfectly. Includes charging cable.',
    category: 'Calculators',
    pricePerDayCents: 150, // $1.50
    createdAt: new Date().toISOString(),
    isAvailable: true,
  },
  {
    id: 'item_2',
    ownerId: 'user_alice',
    ownerName: 'Alice Smith',
    name: 'Chemistry Lab Coat (Size M)',
    description:
      'White, heavy-duty cotton lab coat. Cleaned and ironed. Fits medium/large sizes. Needed for CHEM-101.',
    category: 'Lab Coats',
    pricePerDayCents: 100, // $1.00
    createdAt: new Date().toISOString(),
    isAvailable: true,
  },
  {
    id: 'item_3',
    ownerId: 'user_manolo', // Current user's items
    ownerName: 'Manuel Velazco',
    name: 'Professional Soldering Iron Kit',
    description:
      'Adjustable temperature soldering iron (60W). Comes with solder wire, desoldering pump, and 5 tips.',
    category: 'Soldering Irons',
    pricePerDayCents: 300, // $3.00
    createdAt: new Date().toISOString(),
    isAvailable: false, // Simulated active loan
  },
  {
    id: 'item_4',
    ownerId: 'user_charlie',
    ownerName: 'Charlie Brown',
    name: 'Standard Drafting Board & Kit',
    description:
      'Parallel motion drafting board (A3 size), set squares, and drawing clips. Ideal for engineering graphics course.',
    category: 'Drafting Kits',
    pricePerDayCents: 200, // $2.00
    createdAt: new Date().toISOString(),
    isAvailable: true,
  },
]

export function ItemsDashboard({ currentUserId, currentUserName }: ItemsDashboardProps) {
  const [items, setItems] = useState<Item[]>(INITIAL_MOCK_ITEMS)
  const [isAdding, setIsAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)
  const [notification, setNotification] = useState<{
    text: string
    type: 'success' | 'info'
  } | null>(null)

  function triggerNotification(text: string, type: 'success' | 'info' = 'success') {
    setNotification({ text, type })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  function handleCreateItem(data: ItemFormData) {
    setBusy(true)
    // Simulate API delay
    setTimeout(() => {
      const newItem: Item = {
        id: `item_${Date.now()}`,
        ownerId: currentUserId,
        ownerName: currentUserName,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        pricePerDayCents: data.pricePerDayCents,
        createdAt: new Date().toISOString(),
        isAvailable: true,
      }

      setItems((prev) => [newItem, ...prev])
      setIsAdding(false)
      setBusy(false)
      triggerNotification(`"${data.name}" listed successfully!`)
    }, 800)
  }

  function handleEditItem(data: ItemFormData) {
    if (!editingItem) return
    setBusy(true)
    // Simulate API delay
    setTimeout(() => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItem.id
            ? {
                ...it,
                name: data.name,
                description: data.description || null,
                category: data.category || null,
                pricePerDayCents: data.pricePerDayCents,
              }
            : it,
        ),
      )
      setEditingItem(null)
      setBusy(false)
      triggerNotification(`Updated "${data.name}" successfully!`, 'info')
    }, 800)
  }

  function handleArchiveItem(itemId: string) {
    const item = items.find((it) => it.id === itemId)
    if (!item) return

    if (
      confirm(
        `Are you sure you want to archive "${item.name}"? It will hide the item from new rentals.`,
      )
    ) {
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, archivedAt: new Date().toISOString() } : it)),
      )
      triggerNotification(`"${item.name}" archived.`, 'info')
    }
  }

  function handleBorrowRequest(itemId: string) {
    const item = items.find((it) => it.id === itemId)
    if (!item) return

    // Simulate request creation
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, isAvailable: false } : it)))
    triggerNotification(`Request sent to borrow "${item.name}"! Wait for owner approval.`)
  }

  return (
    <div className="lendit-container">
      {/* Top Banner / Heading */}
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
              background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Available Materials
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Find calculators, lab coats, drafting kits, and more from other students.
          </p>
        </div>

        {!isAdding && !editingItem && (
          <button type="button" className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Lend an Item
          </button>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            borderLeft:
              notification.type === 'success'
                ? '4px solid var(--success)'
                : '4px solid var(--primary)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'fadeIn var(--transition-fast) forwards',
          }}
        >
          <span
            style={{
              color: notification.type === 'success' ? 'var(--success)' : 'var(--primary)',
              fontWeight: 'bold',
            }}
          >
            {notification.type === 'success' ? '✓' : 'ℹ'}
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notification.text}</span>
        </div>
      )}

      {/* Main Area */}
      {isAdding ? (
        <ItemForm onSubmit={handleCreateItem} onCancel={() => setIsAdding(false)} busy={busy} />
      ) : editingItem ? (
        <ItemForm
          initialData={{
            name: editingItem.name,
            description: editingItem.description ?? '',
            category: editingItem.category ?? 'Other',
            pricePerDayCents: editingItem.pricePerDayCents,
          }}
          onSubmit={handleEditItem}
          onCancel={() => setEditingItem(null)}
          busy={busy}
        />
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
