import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

type Mode = 'login' | 'signup'

export function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { login, signup, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/items', { replace: true })
  }, [isAuthenticated, navigate])

  async function submit(form: FormData) {
    setError(null)
    setBusy(true)

    const name = String(form.get('name') ?? '')
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')

    const err =
      mode === 'signup' ? await signup(name, email, password) : await login(email, password)

    if (err) {
      setError(err)
    } else {
      navigate('/items', { replace: true })
    }

    setBusy(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
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
              background: 'linear-gradient(135deg, #fff 0%, var(--primary) 100%)',
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
