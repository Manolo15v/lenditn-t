import { useEffect, useState } from 'react'
import { api } from './api.ts'

type Health = { status: string; db: boolean }

export function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // The client knows /api/health answers with either 200 {ok,true} or
    // 503 {degraded,false} — both branches have to be handled to typecheck.
    async function check() {
      try {
        const res = await api.api.health.$get()
        setHealth(await res.json())
      } catch (e) {
        setError(String(e))
      }
    }
    void check()
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Lendit</h1>
      <p>
        {error
          ? `api unreachable: ${error}`
          : health
            ? `api ${health.status} · database ${health.db ? 'connected' : 'down'}`
            : 'checking…'}
      </p>
    </main>
  )
}
