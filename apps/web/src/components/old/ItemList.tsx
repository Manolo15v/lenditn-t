import { ITEM_CATEGORIES } from '@lendit/shared'
import { useState } from 'react'
import type { Item } from '../../api.ts'

interface ItemListProps {
  items: Item[]
  currentUserId: string
  onBorrowRequest: (item: Item) => void
  onEdit: (item: Item) => void
  onArchive: (item: Item) => void
}

// Client-side only, over the page already fetched. Text search across the whole
// catalogue is a server concern and is deferred past M7 — this must not grow
// into it.
const ALL = 'All'

export function ItemList({
  items,
  currentUserId,
  onBorrowRequest,
  onEdit,
  onArchive,
}: ItemListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const query = searchQuery.trim().toLowerCase()

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === ALL || item.category === selectedCategory
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      !!item.description?.toLowerCase().includes(query)
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

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[ALL, ...ITEM_CATEGORIES].map((cat) => (
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
                  selectedCategory === cat ? 'var(--primary)' : 'rgba(124, 58, 237, 0.08)',
                color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                border: selectedCategory === cat ? 'none' : '1px solid var(--border-color)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div
          className="glass-panel"
          style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}
        >
          <p style={{ fontSize: '1.1rem' }}>
            {items.length === 0
              ? 'Nothing listed yet. Be the first to lend something.'
              : 'No items found matching your filters.'}
          </p>
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
                    : item.isAvailable
                      ? '4px solid var(--success)'
                      : '4px solid var(--warning)',
                }}
              >
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

                  {/* Availability is computed by the server from active loans —
                      there is no column behind this badge. */}
                  {item.archivedAt ? (
                    <span className="badge badge-archived">Archived</span>
                  ) : item.isAvailable ? (
                    <span className="badge badge-available">Available</span>
                  ) : (
                    <span className="badge badge-borrowed">On Loan</span>
                  )}
                </div>

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
                  Lent by {isOwner ? 'you' : item.ownerName}
                </p>

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

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1rem',
                    marginTop: 'auto',
                  }}
                >
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
                          onClick={() => onArchive(item)}
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
                      onClick={() => onBorrowRequest(item)}
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                      disabled={!item.isAvailable || !!item.archivedAt}
                    >
                      Request
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
