import { type ReactNode, useEffect, useState } from 'react'
import { api } from './api.ts'

type User = { id: string; name: string; email: string; createdAt: string }
type Mode = 'login' | 'signup'

const messages: Record<string, string> = {
  email_taken: 'That email is already registered.',
  invalid_credentials: 'Wrong email or password.',
}

export function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.api.auth.me
      .$get()
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function submit(form: FormData) {
    setError(null)
    setBusy(true)

    const name = String(form.get('name') ?? '')
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')

    try {
      const res =
        mode === 'signup'
          ? await api.api.auth.signup.$post({ json: { name, email, password } })
          : await api.api.auth.login.$post({ json: { email, password } })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        setError(messages[body.error ?? ''] ?? 'Something went wrong.')
        return
      }

      const me = await (await api.api.auth.me.$get()).json()
      setUser(me.user)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    await api.api.auth.logout.$post()
    setUser(null)
  }

  if (loading) return <Shell>Loading…</Shell>

  if (user) {
    return (
      <Shell>
        <p>
          Signed in as <strong>{user.name}</strong> ({user.email}).
        </p>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit(new FormData(event.currentTarget))
        }}
      >
        {mode === 'signup' && (
          <label>
            Name
            <input name="name" required maxLength={80} autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={mode === 'signup' ? 8 : undefined}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </label>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={busy}>
          {mode === 'signup' ? 'Create account' : 'Log in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login')
          setError(null)
        }}
      >
        {mode === 'login' ? 'Need an account?' : 'Already have one?'}
      </button>
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '22rem',
        margin: '4rem auto',
        padding: '0 1rem',
        display: 'grid',
        gap: '1rem',
      }}
    >
      <h1 style={{ margin: 0 }}>Lendit</h1>
      {children}
    </main>
  )
}
