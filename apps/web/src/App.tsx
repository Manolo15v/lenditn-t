import { useEffect, useState } from 'react'
import { api } from './api.ts'
import { ItemsDashboard } from './components/ItemsDashboard.tsx'

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

      // Both routes answer with the user, so there is no follow-up /me here. The
      // cookie is already set; /me exists for the reload path only.
      const { user: signedIn } = (await res.json()) as { user: User }
      setUser(signedIn)
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

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        <p style={{ fontSize: '1.2rem', fontWeight: 500, letterSpacing: '0.05em' }}>
          Loading Lendit...
        </p>
      </div>
    )
  }

  if (user) {
    return (
      <div
        className="animate-fade-in"
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Sticky Premium Header */}
        <header
          className="glass-panel"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(11, 15, 25, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                boxShadow: '0 0 10px var(--primary-glow)',
              }}
            />
            <span
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#fff',
              }}
            >
              Lendit
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Logged in as <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={logout}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Log out
            </button>
          </div>
        </header>

        {/* Dashboard */}
        <main style={{ flexGrow: 1 }}>
          <ItemsDashboard currentUserId={user.id} />
        </main>
      </div>
    )
  }

  return (
    <div
      className="login-page"
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="glass-panel login-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '26rem',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #172033 0%, var(--primary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
            }}
          >
            Lendit
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {mode === 'signup'
              ? 'Create an account to start lending'
              : 'Sign in to access student materials'}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit(new FormData(event.currentTarget))
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {mode === 'signup' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                className="form-input"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="e.g. Manuel Velazco"
                disabled={busy}
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              required
              autoComplete="email"
              placeholder="name@university.edu"
              disabled={busy}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              disabled={busy}
            />
          </div>

          {error && (
            <p
              role="alert"
              style={{
                fontSize: '0.85rem',
                color: 'var(--danger)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                textAlign: 'center',
                margin: '0.5rem 0',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {busy ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1.25rem',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.9rem' }}
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
            }}
            disabled={busy}
          >
            {mode === 'login' ? 'Need a new account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
