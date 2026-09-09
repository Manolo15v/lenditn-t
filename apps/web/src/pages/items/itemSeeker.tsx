import { useCallback, useEffect, useState } from 'react'
import { api, type Item } from '../../api'
import { HeaderData } from '../../components/header/headerData'
import { ItemList } from '../../components/items/itemList'
import { cn } from '../../lib/cn'

export function ItemSeeker() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.api.items.$get({ query: {} })
      if (!res.ok) throw new Error('No se pudo conectar con el servidor')
      setItems((await res.json()).items)
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al cargar los productos. Por favor intenta nuevamente.')
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

      <main className="lendit-container flex w-full flex-1 flex-col gap-8">
        <section className="flex flex-col items-center gap-3 pt-4 text-center sm:pt-8">
          <span
            className={cn(
              'rounded-full border border-[var(--border-color)] bg-[rgba(124,58,237,0.08)]',
              'px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-widest text-[var(--text-secondary)]',
            )}
          >
            Community lending
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Borrow what you need
          </h1>
          <p className="max-w-xl text-sm text-[var(--text-secondary)] sm:text-base">
            Calculators, lab coats, drafting kits and more — lent by fellow students, free.
          </p>
        </section>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
            <p className="mt-4 text-base font-medium text-[var(--text-secondary)]">
              Cargando productos disponibles...
            </p>
            <div className="mt-8 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-[var(--radius-sm)] border border-[var(--primary)]/10 bg-white/60 p-8 shadow-sm"
                >
                  <div className="mx-auto h-6 w-3/4 rounded bg-neutral-200" />
                  <div className="mx-auto mt-4 h-4 w-1/2 rounded bg-neutral-100" />
                  <div className="mx-auto mt-12 h-8 w-24 rounded-full bg-neutral-100" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center shadow-sm">
            <span className="text-4xl">⚠️</span>
            <h2 className="mt-3 text-lg font-bold text-red-900">Error al cargar datos</h2>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="btn btn-primary mt-6 text-sm"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <ItemList items={items} />
        )}
      </main>
    </div>
  )
}
