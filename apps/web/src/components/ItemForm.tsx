import { useState } from 'react'

export interface ItemFormData {
  name: string
  description: string
  category: string
  pricePerDayCents: number
}

interface ItemFormProps {
  initialData?: ItemFormData
  onSubmit: (data: ItemFormData) => void
  onCancel: () => void
  busy?: boolean
}

export function ItemForm({ initialData, onSubmit, onCancel, busy = false }: ItemFormProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    category: initialData?.category ?? 'Other',
    pricePerDayCents: initialData?.pricePerDayCents ?? 0,
  })

  // State to hold display price in dollars/decimals
  const [displayPrice, setDisplayPrice] = useState<string>(
    initialData ? (initialData.pricePerDayCents / 100).toFixed(2) : '0.00',
  )

  const categories = ['Calculators', 'Lab Coats', 'Drafting Kits', 'Soldering Irons', 'Other']

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawVal = e.target.value
    setDisplayPrice(rawVal)

    // Convert to cents
    const floatVal = parseFloat(rawVal)
    if (!Number.isNaN(floatVal) && floatVal >= 0) {
      setFormData((prev) => ({
        ...prev,
        pricePerDayCents: Math.round(floatVal * 100),
      }))
    }
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
              backgroundImage: 'radial-gradient(circle, var(--text-muted) 10%, transparent 10%)',
            }}
          >
            {categories.map((cat) => (
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
          <label htmlFor="displayPrice" className="form-label">
            Daily Rental Fee (USD)
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }}>
              $
            </span>
            <input
              id="displayPrice"
              name="displayPrice"
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              style={{ paddingLeft: '2rem', width: '100%' }}
              placeholder="0.00"
              value={displayPrice}
              onChange={handlePriceChange}
              required
              disabled={busy}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Equivalent to {formData.pricePerDayCents} integer cents in database.
          </span>
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
            disabled={busy}
          />
        </div>

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
