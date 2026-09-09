import { ITEM_CATEGORIES, type ItemCategory } from '@lendit/shared'
import { CircleAlert, Loader2 } from 'lucide-react'
import { useState } from 'react'

export interface ItemFormData {
  name: string
  description: string
  category: ItemCategory
  // Kept as the raw input string so a half-typed "1." does not fight the field.
  pricePerDay: string
}

interface ItemFormProps {
  initialData?: ItemFormData
  onSubmit: (data: ItemFormData) => void
  onCancel: () => void
  busy?: boolean
  error?: string | null
}

const NAME_MAX = 80
const DESCRIPTION_MAX = 2000

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
    pricePerDay: initialData?.pricePerDay ?? '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim() || busy) return
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="label">
          Item name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className="field"
          placeholder="e.g. Texas Instruments TI-84 Plus"
          value={formData.name}
          onChange={handleChange}
          required
          maxLength={NAME_MAX}
          disabled={busy}
          // biome-ignore lint/a11y/noAutofocus: the form only ever renders inside a dialog the user just opened.
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="category" className="label">
          Category
        </label>
        <select
          id="category"
          name="category"
          className="field"
          value={formData.category}
          onChange={handleChange}
          disabled={busy}
        >
          {ITEM_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pricePerDay" className="label">
          Price per day
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm
              text-ink-faint"
            aria-hidden="true"
          >
            $
          </span>
          <input
            id="pricePerDay"
            name="pricePerDay"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="field pl-7"
            placeholder="0.00"
            value={formData.pricePerDay}
            onChange={handleChange}
            disabled={busy}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-ink-faint">Leave empty to lend it for free.</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="description" className="label">
            Description
          </label>
          <span className="text-[11px] text-ink-faint">
            {formData.description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="field resize-y"
          placeholder="Condition, pickup spot, or anything a borrower should know."
          value={formData.description}
          onChange={handleChange}
          maxLength={DESCRIPTION_MAX}
          disabled={busy}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2
            text-sm text-red-700"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn-accent"
          disabled={busy || !formData.name.trim()}
          aria-busy={busy}
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {busy ? 'Saving' : initialData ? 'Save changes' : 'List item'}
        </button>
      </div>
    </form>
  )
}
