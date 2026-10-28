import { ITEM_CATEGORIES, type ItemCategory } from '@lendit/shared'
import { CircleAlert, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { dollarsToCents, formatCents } from '../../lib/items'
import { ImageField, type ImageFieldValue } from './ImageField'

export interface ItemFormData {
  name: string
  description: string
  category: ItemCategory
  // Kept as the raw input string so a half-typed "1." does not fight the field.
  pricePerDay: string
  // Same, and blank means no offer.
  offerPricePerDay: string
  image: ImageFieldValue
}

// What an edit starts from: the stored photo is a URL to show, not a file the
// form owns, so it comes in alongside the fields rather than as one of them.
export type ItemFormInitialData = Omit<ItemFormData, 'image'> & { imageUrl?: string | null }

interface ItemFormProps {
  initialData?: ItemFormInitialData
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
    offerPricePerDay: initialData?.offerPricePerDay ?? '',
    image: { file: null, cleared: false },
  })

  // Mirrors the server's rule so the owner sees the problem while typing, not
  // as a failed save. Compared in cents, as sent: $0.499 against $0.50 looks
  // lower here but rounds to the same 50 on the wire. The field is only offered
  // once there is a price to cut.
  const priceCents = dollarsToCents(formData.pricePerDay)
  const offerCents = dollarsToCents(formData.offerPricePerDay)
  const hasOffer = priceCents > 0 && formData.offerPricePerDay.trim() !== ''
  const offerError =
    hasOffer && !(offerCents > 0 && offerCents < priceCents)
      ? `The offer has to be above $0 and below ${formatCents(priceCents)}.`
      : null

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim() || offerError || busy) return
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

      {priceCents > 0 && (
        <div>
          <label htmlFor="offerPricePerDay" className="label">
            Offer price per day <span className="font-normal text-ink-faint">(optional)</span>
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
              id="offerPricePerDay"
              name="offerPricePerDay"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              className="field pl-7"
              placeholder="No offer"
              value={formData.offerPricePerDay}
              onChange={handleChange}
              disabled={busy}
              aria-invalid={offerError !== null}
              aria-describedby="offerPricePerDay-hint"
            />
          </div>
          <p
            id="offerPricePerDay-hint"
            className={cn('mt-1.5 text-[11px]', offerError ? 'text-red-600' : 'text-ink-faint')}
          >
            {offerError ??
              'A reduced rate shown next to the regular one. Clear it to end the offer.'}
          </p>
        </div>
      )}

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

      <ImageField
        existingUrl={initialData?.imageUrl}
        value={formData.image}
        onChange={(image) => setFormData((prev) => ({ ...prev, image }))}
        disabled={busy}
      />

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
        <button type="button" className="btn-outline" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn-accent"
          disabled={busy || !formData.name.trim() || offerError !== null}
          aria-busy={busy}
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {busy ? 'Saving' : initialData ? 'Save changes' : 'List item'}
        </button>
      </div>
    </form>
  )
}
