import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Item } from '../../api'
import { HeaderData } from '../../components/header/headerData'
import { ItemList } from '../../components/items/itemList'
import { CardSkeleton, ErrorState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'

export function ItemSeeker() {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.api.items.$get({ query: {} })
      if (!res.ok) throw new Error('request failed')
      setItems((await res.json()).items)
    } catch {
      setError('We could not load the catalogue. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderData />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <section className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Borrow what you need
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Calculators, lab coats, drafting kits and more, lent by fellow students.
          </p>
        </section>

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState title="Could not load items" message={error} onRetry={() => void load()} />
          ) : (
            <ItemList
              items={items}
              emptyAction={
                <Link to={isAuthenticated ? '/dashboard' : '/login'} className="btn-accent">
                  {isAuthenticated ? 'List an item' : 'Log in to lend'}
                </Link>
              }
            />
          )}
        </div>
      </main>
    </div>
  )
}
