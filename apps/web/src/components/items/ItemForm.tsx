import { ITEM_CATEGORIES, type ItemCategory } from '@lendit/shared'
import { useState } from 'react'

export interface ItemFormData {
  name: string
  description: string
  category: ItemCategory
}

interface ItemFormProps {
  initialData?: ItemFormData
  onSubmit: (data: ItemFormData) => void
  onCancel: () => void
  busy?: boolean
  error?: string | null
}

export function ItemForm({
  initialData,
  onSubmit,
  onCancel,
  busy = false,
  error = null,
}: ItemFormProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    category: initialData?.category ?? 'Other',
  })

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSubmit(formData)
  }

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{ padding: '2rem', maxWidth: '32rem', width: '100%', margin: '0 auto' }}
    >
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {initialData ? 'Edit Item' : 'Lend a New Item'}
      </h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Item Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="form-input"
            placeholder="e.g. Texas Instruments TI-84 Plus"
            value={formData.name}
            onChange={handleInputChange}
            required
            maxLength={80}
            disabled={busy}
          />
        </div>

        <div className="form-group">
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <select
            id="category"
            name="category"
            className="form-input"
            value={formData.category}
            onChange={handleInputChange}
            disabled={busy}
            style={{
              appearance: 'none',
            }}
          >
            {ITEM_CATEGORIES.map((cat) => (
              <option
                key={cat}
                value={cat}
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description / Instructions
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="form-input"
            style={{ resize: 'vertical' }}
            placeholder="Condition, pickup location, or specific requirements..."
            value={formData.description}
            onChange={handleInputChange}
            maxLength={2000}
            disabled={busy}
          />
        </div>

        {error && (
          <p
            role="alert"
            style={{
              fontSize: '0.85rem',
              color: 'var(--danger)',
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={busy}
            style={{ minWidth: '8rem' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !formData.name.trim()}
            style={{ minWidth: '8rem' }}
          >
            {busy ? 'Saving...' : initialData ? 'Save Changes' : 'List Item'}
          </button>
        </div>
      </form>
    </div>
  )
}
