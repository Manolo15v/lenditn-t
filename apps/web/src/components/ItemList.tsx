import { useState } from 'react'

export interface Item {
  id: string
  ownerId: string
  ownerName?: string
  name: string
  description?: string | null
  category?: string | null
  pricePerDayCents: number
  createdAt: string
  archivedAt?: string | null
  isAvailable?: boolean // derived: has no active loans
}

interface ItemListProps {
  items: Item[]
  currentUserId: string
  onBorrowRequest: (itemId: string) => void
  onEdit: (item: Item) => void
  onArchive: (itemId: string) => void
}

export function ItemList({
  items,
  currentUserId,
  onBorrowRequest,
  onEdit,
  onArchive,
}: ItemListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const categories = [
    'All',
    'Calculators',
    'Lab Coats',
    'Drafting Kits',
    'Soldering Irons',
    'Other',
  ]

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      !!item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Filtering and Search Controls */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 300px', display: 'flex', position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '1rem' }}
            placeholder="Search items by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="btn"
              style={{
                padding: '0.4rem 1rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor:
                  selectedCategory === cat ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                border: selectedCategory === cat ? 'none' : '1px solid var(--border-color)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout of Cards */}
      {filteredItems.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <p style={{ fontSize: '1.1rem' }}>No items found matching your filters.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredItems.map((item) => {
            const isOwner = item.ownerId === currentUserId
            const displayPrice = (item.pricePerDayCents / 100).toFixed(2)

            return (
              <div
                key={item.id}
                className="glass-panel animate-fade-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.5rem',
                  position: 'relative',
                  borderTop: item.archivedAt
                    ? '4px solid var(--text-muted)'
                    : item.isAvailable !== false
                      ? '4px solid var(--success)'
                      : '4px solid var(--warning)',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      background: 'rgba(99, 102, 241, 0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    {item.category ?? 'Other'}
                  </span>

                  {item.archivedAt ? (
                    <span className="badge badge-archived">Archived</span>
                  ) : item.isAvailable !== false ? (
                    <span className="badge badge-available">Available</span>
                  ) : (
                    <span className="badge badge-borrowed">On Loan</span>
                  )}
                </div>

                {/* Name & Owner */}
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {item.name}
                </h3>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.75rem',
                  }}
                >
                  Lent by {isOwner ? 'you' : (item.ownerName ?? 'another student')}
                </p>

                {/* Description */}
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4',
                    marginBottom: '1.25rem',
                    flexGrow: 1,
                  }}
                >
                  {item.description || <em>No description provided.</em>}
                </p>

                {/* Footer price & actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1rem',
                    marginTop: 'auto',
                  }}
                >
                  <div>
                    <span
                      style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}
                    >
                      ${displayPrice}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ day</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          disabled={!!item.archivedAt}
                        >
                          Edit
                        </button>
                        {!item.archivedAt && (
                          <button
                            type="button"
                            onClick={() => onArchive(item.id)}
                            className="btn btn-danger"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          >
                            Archive
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onBorrowRequest(item.id)}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        disabled={item.isAvailable === false || !!item.archivedAt}
                      >
                        Request
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
