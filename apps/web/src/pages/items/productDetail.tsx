import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Item } from '../../api'
import { HeaderData } from '../../components/header/headerData'
import { cn } from '../../lib/cn'

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [item, setItem] = useState<Item | null>(null)
  const [relatedItems, setRelatedItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Interactive gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Buy Box state
  const [rentalDays, setRentalDays] = useState(3)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loanRequested, setLoanRequested] = useState(false)
  const [borrowerNote, setBorrowerNote] = useState('')
  const [savedToWishlist, setSavedToWishlist] = useState(false)

  // Fetch product data
  const loadProduct = useCallback(async (itemId: string) => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch the specific item
      const res = await api.api.items[':id'].$get({ param: { id: itemId } })
      if (!res.ok) {
        if (res.status === 404) {
          setError('Product not found in campus inventory.')
        } else {
          setError('Failed to load product details.')
        }
        setLoading(false)
        return
      }

      const data = await res.json()
      if ('item' in data) {
        setItem(data.item as Item)
      } else {
        setError('Product not found.')
      }

      // 2. Fetch catalogue for related products
      const listRes = await api.api.items.$get({ query: {} })
      if (listRes.ok) {
        const listData = await listRes.json()
        setRelatedItems(listData.items.filter((i: Item) => i.id !== itemId).slice(0, 4))
      }
    } catch (err) {
      console.error(err)
      setError('Unable to connect to service. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      void loadProduct(id)
      setLoanRequested(false)
      setIsModalOpen(false)
      setActiveImageIndex(0)
    }
  }, [id, loadProduct])

  // Pricing calculations
  const pricePerDay = (item?.pricePerDayCents ?? 0) / 100
  const totalPrice = (pricePerDay * rentalDays).toFixed(2)
  const isFree = (item?.pricePerDayCents ?? 0) === 0

  // Simulated estimated delivery date (Tomorrow)
  const deliveryDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  }, [])

  // Dynamic gallery previews depending on item category
  const galleryImages = useMemo(() => {
    return [
      {
        id: 0,
        label: 'Front View',
        badge: 'Main',
        icon: '📦',
        desc: 'Front and full equipment view',
      },
      {
        id: 1,
        label: 'Profile / Details',
        badge: 'Angle',
        icon: '📐',
        desc: 'Side profile, ports, and condition check',
      },
      {
        id: 2,
        label: 'Included Accessories',
        badge: 'Accessories',
        icon: '🔌',
        desc: 'Original cables, accessories, and protective sleeve',
      },
      {
        id: 3,
        label: 'Campus Certified',
        badge: 'Verified',
        icon: '🎓',
        desc: 'Clean condition, certified ready for coursework and labs',
      },
    ]
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#fdfdfd]">
        <HeaderData />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
            <p className="text-sm font-medium text-neutral-600">Loading product details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="flex min-h-screen flex-col bg-[#fdfdfd]">
        <HeaderData />
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <span className="text-5xl">🔍</span>
            <h1 className="mt-4 text-2xl font-bold text-neutral-900">Product Not Found</h1>
            <p className="mt-2 text-neutral-600">
              {error ?? 'The item you are looking for might have been removed or is unavailable.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/items')}
                className="rounded-full bg-[#ffd814] px-6 py-2.5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-[#f7ca00]"
              >
                Back to Item Catalogue
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const isArchived = Boolean(item.archivedAt)
  const isAvailable = !isArchived && item.isAvailable

  return (
    <div className="flex min-h-screen flex-col bg-[#fdfdfd] text-[#0f1111]">
      <HeaderData />

      {/* Amazon-style Breadcrumbs Bar */}
      <nav
        aria-label="Breadcrumb"
        className="border-b border-neutral-200 bg-white px-4 py-2 text-xs sm:px-8"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-neutral-600">
            <Link
              to="/items"
              className="inline-flex items-center gap-1 font-medium text-[var(--primary)] hover:underline"
            >
              <span>‹</span> Back to results
            </Link>
            <span className="text-neutral-400">|</span>
            <Link to="/items" className="hover:underline">
              Campus Lending
            </Link>
            <span>›</span>
            <span className="font-medium text-neutral-800">{item.category ?? 'Academic Gear'}</span>
            <span>›</span>
            <span className="truncate max-w-[200px] sm:max-w-xs text-neutral-500">{item.name}</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-500">
            <span>
              Item ID: <strong className="font-mono text-neutral-700">{item.id.slice(0, 8)}</strong>
            </span>
          </div>
        </div>
      </nav>

      {/* Main Amazon 3-Column Layout */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ================= COLUMN 1: Image Showcase & Gallery (5 cols) ================= */}
          <section className="lg:col-span-5">
            <div className="sticky top-20 flex flex-col-reverse gap-4 sm:flex-row">
              {/* Vertical Thumbnail Strip (Amazon hallmark) */}
              <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
                {galleryImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageIndex(img.id)}
                    className={cn(
                      'flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 flex-col items-center justify-center rounded-lg border-2 bg-neutral-50 p-1 text-center transition-all',
                      activeImageIndex === img.id
                        ? 'border-[#e77600] shadow-sm ring-1 ring-[#e77600] bg-orange-50/20'
                        : 'border-neutral-200 hover:border-neutral-400 bg-white',
                    )}
                  >
                    <span className="text-2xl">{img.icon}</span>
                    <span className="mt-1 text-[10px] font-medium leading-tight text-neutral-600 line-clamp-1">
                      {img.badge}
                    </span>
                  </button>
                ))}
              </div>

              {/* Main Interactive Product Viewer Box */}
              <div className="relative flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 p-8 shadow-sm">
                {/* Amazon's Choice / Campus Pick Tag */}
                <div className="absolute left-4 top-4 z-10">
                  <div className="inline-flex items-center rounded-sm bg-[#232f3e] px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                    <span className="text-[#febd69] mr-1">★</span>
                    <span>Lendit's Choice</span>
                    <span className="ml-1 text-neutral-300 font-normal">
                      for "{item.category ?? 'Gear'}"
                    </span>
                  </div>
                </div>

                {/* Status Overlay Badge */}
                <div className="absolute right-4 top-4 z-10">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm',
                      isArchived
                        ? 'bg-neutral-200 text-neutral-700'
                        : isAvailable
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300',
                    )}
                  >
                    {isArchived ? 'Archived' : isAvailable ? 'Available Now' : 'On Loan'}
                  </span>
                </div>

                {/* Simulated High-Res Product Hero Graphic */}
                <div className="flex h-80 sm:h-96 w-full flex-col items-center justify-center text-center select-none group">
                  <div className="relative flex size-48 sm:size-56 items-center justify-center rounded-3xl bg-white shadow-[0_10px_35px_rgba(0,0,0,0.06)] border border-neutral-100 transition-transform duration-300 group-hover:scale-105">
                    <span className="text-7xl sm:text-8xl filter drop-shadow-md">
                      {galleryImages[activeImageIndex]?.icon}
                    </span>

                    {/* Subtle watermarked verification seal */}
                    <div
                      className="absolute -bottom-2 -right-2 flex size-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md text-xs font-bold"
                      title="Lendit Verified Campus Gear"
                    >
                      ✓
                    </div>
                  </div>

                  <p className="mt-6 text-xs font-medium text-neutral-500">
                    {galleryImages[activeImageIndex]?.desc}
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-400 italic">
                    Roll over image to zoom in • Verified student equipment
                  </p>
                </div>

                {/* Share and Wishlist quick action */}
                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href)
                        alert('Product link copied to clipboard!')
                      }
                    }}
                    className="inline-flex items-center gap-1.5 hover:text-neutral-900 transition-colors"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                    Share this item
                  </button>

                  <span className="text-[11px] text-neutral-400">
                    Listed {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ================= COLUMN 2: Product Core Details (4 cols) ================= */}
          <section className="lg:col-span-4 flex flex-col gap-4">
            {/* Owner Store Link */}
            <div>
              <Link
                to="/items"
                className="text-xs font-medium text-[var(--primary)] hover:underline hover:text-[var(--primary-hover)]"
              >
                Visit the {item.ownerName}'s Student Locker
              </Link>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold leading-tight text-[#0f1111] sm:text-3xl">
              {item.name}
            </h1>

            {/* Ratings, Reviews & Social Proof */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center text-[#de7921]">
                <span className="font-bold mr-1 text-neutral-900">4.9</span>
                <span>★★★★★</span>
              </div>
              <a
                href="#reviews"
                className="text-xs font-medium text-[var(--primary)] hover:underline"
              >
                48 ratings
              </a>
              <span className="text-neutral-300">|</span>
              <a href="#qa" className="text-xs font-medium text-[var(--primary)] hover:underline">
                15 answered questions
              </a>
            </div>

            {/* Amazon-style Popularity / Social Proof Pill */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 bg-neutral-100 w-fit px-2.5 py-1 rounded">
              <span className="text-orange-600 font-bold">🔥 30+ students</span> borrowed this
              equipment this semester
            </div>

            <hr className="border-neutral-200 my-1" />

            {/* Price Box */}
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                {isFree ? (
                  <>
                    <span className="rounded bg-[#cc0c39] px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                      Free Loan
                    </span>
                    <div className="flex items-start text-[#0f1111]">
                      <span className="text-sm font-semibold mt-1">$</span>
                      <span className="text-3xl font-extrabold tracking-tight">0</span>
                      <span className="text-sm font-semibold mt-1">.00</span>
                      <span className="ml-1.5 self-center text-sm font-normal text-neutral-600">
                        / day
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="rounded bg-[#cc0c39] px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                      -20% Student Rate
                    </span>
                    <div className="flex items-start text-[#0f1111]">
                      <span className="text-sm font-semibold mt-1">$</span>
                      <span className="text-3xl font-extrabold tracking-tight">
                        {Math.floor(pricePerDay)}
                      </span>
                      <span className="text-sm font-semibold mt-1">
                        .{String(item.pricePerDayCents % 100).padStart(2, '0')}
                      </span>
                      <span className="ml-1.5 self-center text-sm font-normal text-neutral-600">
                        / day
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-xs text-neutral-500">
                {isFree ? (
                  <span>
                    Typical retail rental: <span className="line-through">$18.50/day</span>. 100%
                    covered by Lendit Community.
                  </span>
                ) : (
                  <span>
                    Regular shop rate:{' '}
                    <span className="line-through">${(pricePerDay * 1.3).toFixed(2)}</span>
                  </span>
                )}
              </div>

              {/* Prime-style badge */}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-700">
                <span className="rounded bg-[#007185] px-1.5 py-0.5 text-[10px] font-black text-white tracking-wide">
                  PRIME STUDENT
                </span>
                <span className="font-semibold text-neutral-800">FREE Campus Pickup</span>
                <span>on eligible student handshakes.</span>
              </div>
            </div>

            {/* Amazon 4-Pillar Features Strip */}
            <div className="grid grid-cols-4 gap-2 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 text-center text-xs">
              <div className="flex flex-col items-center">
                <span className="text-lg">📍</span>
                <span className="mt-1 font-semibold text-neutral-800 text-[11px] leading-tight">
                  Campus Pickup
                </span>
                <span className="text-[10px] text-neutral-500">Library / Hub</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg">🛡️</span>
                <span className="mt-1 font-semibold text-neutral-800 text-[11px] leading-tight">
                  Verified
                </span>
                <span className="text-[10px] text-neutral-500">Peer inspected</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg">🔄</span>
                <span className="mt-1 font-semibold text-neutral-800 text-[11px] leading-tight">
                  Easy Return
                </span>
                <span className="text-[10px] text-neutral-500">Zero penalties</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg">🔒</span>
                <span className="mt-1 font-semibold text-neutral-800 text-[11px] leading-tight">
                  Secure Pledge
                </span>
                <span className="text-[10px] text-neutral-500">By Community</span>
              </div>
            </div>

            <hr className="border-neutral-200 my-1" />

            {/* Specifications Key-Value Table (Amazon style) */}
            <div>
              <h2 className="text-sm font-bold text-neutral-900 mb-2">Product specifications</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <dt className="text-neutral-500 font-medium">Category</dt>
                <dd className="text-neutral-900 font-semibold">
                  {item.category ?? 'General Equipment'}
                </dd>

                <dt className="text-neutral-500 font-medium">Lender</dt>
                <dd className="text-neutral-900 font-semibold">{item.ownerName}</dd>

                <dt className="text-neutral-500 font-medium">Item Condition</dt>
                <dd className="text-emerald-700 font-semibold">Excellent / Fully Tested</dd>

                <dt className="text-neutral-500 font-medium">Daily Cost</dt>
                <dd className="text-neutral-900 font-semibold">
                  {isFree ? 'Free ($0.00)' : `$${pricePerDay.toFixed(2)}/day`}
                </dd>

                <dt className="text-neutral-500 font-medium">Availability</dt>
                <dd
                  className={cn(
                    'font-semibold',
                    isAvailable ? 'text-emerald-700' : 'text-amber-700',
                  )}
                >
                  {isAvailable ? 'In Stock (Instant handover)' : 'On Loan (Reserve queue)'}
                </dd>

                <dt className="text-neutral-500 font-medium">Campus ID</dt>
                <dd className="font-mono text-neutral-700 text-[11px]">
                  LDT-{item.id.slice(0, 10)}
                </dd>
              </dl>
            </div>

            <hr className="border-neutral-200 my-1" />

            {/* "About this item" Bullet Points (Amazon's signature section) */}
            <div>
              <h2 className="text-base font-bold text-[#0f1111] mb-2">About this item</h2>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-700">
                <li>
                  <strong className="text-neutral-900 font-semibold">Genuine Student Gear:</strong>{' '}
                  Carefully maintained by {item.ownerName} for coursework, laboratory sessions, or
                  project work.
                </li>
                <li>
                  <strong className="text-neutral-900 font-semibold">Description & Notes:</strong>{' '}
                  {item.description ||
                    'Clean, operational, and supplied with all necessary attachments for university coursework.'}
                </li>
                <li>
                  <strong className="text-neutral-900 font-semibold">Handover Guarantee:</strong>{' '}
                  Pickup takes place safely at authorized campus common rooms or library study
                  desks.
                </li>
                <li>
                  <strong className="text-neutral-900 font-semibold">Care Policy:</strong> Please
                  return the equipment in the same condition with all included accessories.
                </li>
              </ul>
            </div>
          </section>

          {/* ================= COLUMN 3: Amazon "Buy Box" / "Borrow Box" (3 cols) ================= */}
          <section className="lg:col-span-3">
            <div className="sticky top-20 rounded-xl border border-neutral-300 bg-white p-5 shadow-sm">
              {/* Buy Box Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-semibold text-neutral-600">$</span>
                <span className="text-2xl font-extrabold text-[#0f1111]">
                  {isFree ? '0.00' : pricePerDay.toFixed(2)}
                </span>
                <span className="text-xs text-neutral-500">/ day</span>
              </div>

              {/* Delivery Details */}
              <div className="mt-3 text-xs text-neutral-700 space-y-1">
                <p>
                  FREE pickup <strong className="text-neutral-900 font-bold">{deliveryDate}</strong>
                  .
                </p>
                <p className="text-neutral-500">
                  Request within <strong className="text-emerald-700">4 hrs 32 mins</strong>
                </p>
              </div>

              {/* Deliver to campus location */}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline cursor-pointer">
                <span>📍</span>
                <span className="truncate">Deliver to University Central Library</span>
              </div>

              {/* In Stock Notice */}
              <div className="mt-4">
                {isArchived ? (
                  <p className="text-sm font-bold text-neutral-600">Currently unavailable.</p>
                ) : isAvailable ? (
                  <p className="text-base font-bold text-[#007600]">In Stock.</p>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-amber-700">Currently on loan.</p>
                    <p className="text-xs text-neutral-500">You can reserve a priority slot.</p>
                  </div>
                )}
              </div>

              {/* Rental Duration Selector */}
              <div className="mt-4">
                <label
                  htmlFor="duration-select"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Loan Duration:
                </label>
                <select
                  id="duration-select"
                  value={rentalDays}
                  onChange={(e) => setRentalDays(Number(e.target.value))}
                  disabled={isArchived}
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-900 focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] focus:outline-none"
                >
                  <option value={1}>
                    1 Day {isFree ? '($0.00)' : `($${(pricePerDay * 1).toFixed(2)})`}
                  </option>
                  <option value={3}>
                    3 Days {isFree ? '($0.00)' : `($${(pricePerDay * 3).toFixed(2)})`}
                  </option>
                  <option value={7}>
                    7 Days (1 Week) {isFree ? '($0.00)' : `($${(pricePerDay * 7).toFixed(2)})`}
                  </option>
                  <option value={14}>
                    14 Days (2 Weeks) {isFree ? '($0.00)' : `($${(pricePerDay * 14).toFixed(2)})`}
                  </option>
                  <option value={30}>30 Days (Semester Special)</option>
                </select>
              </div>

              {/* Cost Summary */}
              <div className="mt-3 rounded bg-neutral-50 p-2 text-xs text-neutral-600 flex justify-between items-center border border-neutral-200">
                <span>
                  Total ({rentalDays} {rentalDays === 1 ? 'day' : 'days'}):
                </span>
                <span className="font-bold text-neutral-900 text-sm">
                  {isFree ? 'FREE ($0.00)' : `$${totalPrice}`}
                </span>
              </div>

              {/* Primary Amazon Action Buttons */}
              <div className="mt-5 space-y-2.5">
                {/* Yellow "Buy Now" button */}
                <button
                  type="button"
                  disabled={isArchived}
                  onClick={() => setIsModalOpen(true)}
                  className={cn(
                    'w-full rounded-full py-2.5 px-4 text-xs font-semibold shadow-sm transition-all text-black',
                    isArchived
                      ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                      : isAvailable
                        ? 'bg-[#ffd814] hover:bg-[#f7ca00] active:scale-[0.99]'
                        : 'bg-[#ffa41c] hover:bg-[#f39800] text-black',
                  )}
                >
                  {isArchived
                    ? 'Unavailable'
                    : isAvailable
                      ? 'Borrow Now (Request Item)'
                      : 'Join Waitlist / Reserve'}
                </button>

                {/* Secondary Wishlist button */}
                <button
                  type="button"
                  onClick={() => setSavedToWishlist(!savedToWishlist)}
                  className={cn(
                    'w-full rounded-full border py-2 px-4 text-xs font-semibold transition-all',
                    savedToWishlist
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-neutral-300 bg-[#f0f2f2] hover:bg-[#e3e6e6] text-neutral-900',
                  )}
                >
                  {savedToWishlist ? '✓ Saved to Campus Wishlist' : 'Add to Wish List'}
                </button>
              </div>

              {/* Buy Box Security & Trust Metadata */}
              <div className="mt-5 border-t border-neutral-200 pt-3 text-[11px] text-neutral-600 space-y-1.5">
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <span className="text-neutral-500">🔒</span>
                  <span>Secure peer-to-peer transaction</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Dispatched from</span>
                  <span className="font-medium text-neutral-800">Lendit Campus Hub</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Lent by</span>
                  <span className="font-medium text-neutral-800">{item.ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Return Policy</span>
                  <span className="font-medium text-[var(--primary)]">Free within loan terms</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ================= RELATED ITEMS CAROUSEL (Amazon Style) ================= */}
        {relatedItems.length > 0 && (
          <section className="mt-14 border-t border-neutral-200 pt-8">
            <h2 className="text-xl font-bold text-[#0f1111]">
              Students who viewed this also borrowed
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Frequently requested equipment on your campus
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {relatedItems.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/producto/${rel.id}`}
                  className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-[var(--primary)] hover:shadow-md"
                >
                  <div className="flex h-36 w-full items-center justify-center rounded-lg bg-neutral-50 text-4xl group-hover:scale-105 transition-transform">
                    {rel.category === 'Calculators'
                      ? '🧮'
                      : rel.category === 'Lab Coats'
                        ? '🥼'
                        : '📦'}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-neutral-900 group-hover:text-[var(--primary)] line-clamp-1">
                    {rel.name}
                  </h3>
                  <p className="text-xs text-neutral-500">{rel.category ?? 'General'}</p>

                  <div className="mt-2 flex items-center text-xs text-[#de7921]">
                    <span>★★★★★</span>
                    <span className="ml-1 text-neutral-500">(24)</span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-neutral-100">
                    <span className="text-sm font-bold text-neutral-900">
                      {rel.pricePerDayCents === 0
                        ? 'FREE'
                        : `$${(rel.pricePerDayCents / 100).toFixed(2)}/day`}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--primary)] group-hover:underline">
                      View ›
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ================= CUSTOMER REVIEWS SECTION (Amazon Breakdown) ================= */}
        <section id="reviews" className="mt-14 border-t border-neutral-200 pt-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left: Star Breakdown */}
            <div className="lg:col-span-4">
              <h2 className="text-xl font-bold text-[#0f1111]">Customer reviews</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-lg text-[#de7921]">★★★★★</span>
                <span className="text-sm font-bold text-neutral-900">4.9 out of 5</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">48 global campus ratings</p>

              {/* Progress Bars */}
              <div className="mt-4 space-y-2 text-xs">
                {[
                  { star: '5 star', pct: 88 },
                  { star: '4 star', pct: 9 },
                  { star: '3 star', pct: 2 },
                  { star: '2 star', pct: 1 },
                  { star: '1 star', pct: 0 },
                ].map((row) => (
                  <div key={row.star} className="flex items-center gap-2 text-neutral-600">
                    <span className="w-12">{row.star}</span>
                    <div className="h-4 flex-1 rounded bg-neutral-100 overflow-hidden border border-neutral-200">
                      <div
                        className="h-full bg-[#ffa41c] rounded"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium">{row.pct}%</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-neutral-200 pt-4">
                <h3 className="text-sm font-bold text-neutral-900">Review this product</h3>
                <p className="text-xs text-neutral-600 mt-1">
                  Share your thoughts with other students
                </p>
                <button
                  type="button"
                  onClick={() => alert('Thanks for rating this lender!')}
                  className="mt-3 w-full rounded-lg border border-neutral-300 bg-white py-2 text-xs font-semibold text-neutral-900 shadow-sm hover:bg-neutral-50"
                >
                  Write a community review
                </button>
              </div>
            </div>

            {/* Right: Individual Review Cards */}
            <div className="lg:col-span-8 space-y-6">
              <h3 className="text-base font-bold text-neutral-900">
                Top reviews from student borrowers
              </h3>

              <div className="border-b border-neutral-200 pb-5">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    MC
                  </div>
                  <span className="text-xs font-bold text-neutral-900">Mateo C.</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-[#de7921]">★★★★★</span>
                  <span className="font-bold text-neutral-900">Saved my exam week!</span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Reviewed on campus •{' '}
                  <span className="text-emerald-700 font-medium">Verified Borrower</span>
                </p>
                <p className="mt-2 text-xs text-neutral-700 leading-relaxed">
                  The {item.name} was in impeccable condition. {item.ownerName} handed it over right
                  outside the campus library in less than 5 minutes. 10/10 service.
                </p>
              </div>

              <div className="border-b border-neutral-200 pb-5">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    VL
                  </div>
                  <span className="text-xs font-bold text-neutral-900">Valeria L.</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-[#de7921]">★★★★★</span>
                  <span className="font-bold text-neutral-900">Exactly as described</span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Reviewed last month •{' '}
                  <span className="text-emerald-700 font-medium">Verified Borrower</span>
                </p>
                <p className="mt-2 text-xs text-neutral-700 leading-relaxed">
                  Clean, tested, and reliable. Didn't have to buy a costly commercial tool for a
                  single lab project. Very grateful to this community!
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ================= LOAN REQUEST MODAL (Amazon-Style Quick Checkout) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-fade-in">
            {loanRequested ? (
              <div className="text-center py-4">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                  ✓
                </div>
                <h3 className="mt-4 text-xl font-bold text-neutral-900">
                  Request Sent Successfully!
                </h3>
                <p className="mt-2 text-xs text-neutral-600">
                  {item.ownerName} has been notified. You will receive a message to arrange the
                  campus hand-off at your selected location.
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mt-6 w-full rounded-full bg-[#ffd814] py-2.5 text-xs font-bold text-black hover:bg-[#f7ca00]"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="text-base font-bold text-neutral-900">Confirm Loan Request</h3>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-neutral-400 hover:text-neutral-700 text-lg font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 flex gap-3 items-center rounded-lg bg-neutral-50 p-3 border border-neutral-200">
                  <div className="text-3xl">📦</div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-neutral-900 truncate">{item.name}</h4>
                    <p className="text-[11px] text-neutral-500">Lender: {item.ownerName}</p>
                    <p className="text-[11px] font-semibold text-emerald-700">
                      Duration: {rentalDays} days • Total: {isFree ? 'FREE' : `$${totalPrice}`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label
                      htmlFor="handoff-location"
                      className="block text-xs font-medium text-neutral-700 mb-1"
                    >
                      Campus Hand-off Location:
                    </label>
                    <input
                      id="handoff-location"
                      type="text"
                      defaultValue="Main Library - Common Hallway"
                      className="w-full rounded-lg border border-neutral-300 p-2 text-xs text-neutral-800 focus:border-[#e77600] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="borrower-note"
                      className="block text-xs font-medium text-neutral-700 mb-1"
                    >
                      Note to {item.ownerName} (optional):
                    </label>
                    <textarea
                      id="borrower-note"
                      rows={2}
                      placeholder="e.g., Hi! I need this for my Thursday physics lab..."
                      value={borrowerNote}
                      onChange={(e) => setBorrowerNote(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 p-2 text-xs text-neutral-800 focus:border-[#e77600] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-full border border-neutral-300 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanRequested(true)}
                    className="flex-1 rounded-full bg-[#ffd814] py-2.5 text-xs font-bold text-black hover:bg-[#f7ca00] shadow-sm"
                  >
                    Confirm Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-neutral-300 bg-[#232f3e] text-white py-10 px-4 text-center text-xs">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="flex justify-center gap-6 text-neutral-300">
            <Link to="/items" className="hover:underline">
              Home
            </Link>
            <Link to="/items" className="hover:underline">
              All Products
            </Link>
            <Link to="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <a href="#privacy" className="hover:underline">
              Campus Conditions of Use
            </a>
          </div>
          <p className="text-neutral-400">
            © {new Date().getFullYear()} Lendit University Peer Network. Amazon-styled layout for
            student item lending.
          </p>
        </div>
      </footer>
    </div>
  )
}
