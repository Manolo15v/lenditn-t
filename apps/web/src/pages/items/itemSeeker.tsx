import { useCallback, useEffect, useState } from 'react'
import { api, type Item } from '../../api'
import { HeaderData } from '../../components/header/headerData'
import { ItemList } from '../../components/items/itemList'
import { cn } from '../../lib/cn'

export function ItemSeeker() {
  const [items, setItems] = useState<Item[]>([])

  const load = useCallback(async () => {
    try {
      const res = await api.api.items.$get({ query: {} })
      if (!res.ok) throw new Error('failed')
      setItems((await res.json()).items)
    } catch {
    } finally {
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
        <ItemList items={items} />
      </main>
    </div>
  )
}
