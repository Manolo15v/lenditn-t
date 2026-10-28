import type { Item } from '../../api'
import { cn } from '../../lib/cn'
import { formatCents, formatPrice, offerDiscountPercent } from '../../lib/items'

interface ItemPriceProps {
  item: Pick<Item, 'pricePerDayCents' | 'offerPricePerDayCents'>
  size?: 'sm' | 'lg'
  className?: string
}

const SIZES = {
  sm: { current: 'text-sm', regular: 'text-xs' },
  lg: { current: 'text-2xl tracking-tight', regular: 'text-sm' },
}

// The one place a price is drawn, so a card, the detail page and the related
// row cannot show an offer three different ways. The root is always the same
// flex box, offer or not, so a caller's margin applies either way.
export function ItemPrice({ item, size = 'sm', className }: ItemPriceProps) {
  const sizes = SIZES[size]
  const offer = item.offerPricePerDayCents

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2 gap-y-1', className)}>
      {offer === null ? (
        <span className={cn('font-semibold text-ink', sizes.current)}>
          {formatPrice(item.pricePerDayCents)}
        </span>
      ) : (
        <>
          <span className={cn('font-semibold text-accent', sizes.current)}>
            {formatPrice(offer)}
          </span>
          <s className={cn('text-ink-faint', sizes.regular)}>
            <span className="sr-only">Regular price </span>
            {formatCents(item.pricePerDayCents)}
          </s>
          <span className="chip self-center border-accent/20 bg-accent-soft text-accent">
            −{offerDiscountPercent(item.pricePerDayCents, offer)}%
          </span>
        </>
      )}
    </span>
  )
}
