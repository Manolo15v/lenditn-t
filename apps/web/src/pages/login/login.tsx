import { CircleAlert, Loader2, Package } from 'lucide-react'
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

    if (err) setError(err)
    else navigate('/items', { replace: true })

    setBusy(false)
  }

  const isSignup = mode === 'signup'

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="animate-fade-in w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-ink">
            <Package className="size-5 text-white" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {isSignup
              ? 'Join the campus lending community.'
              : 'Sign in to browse and lend equipment.'}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit(new FormData(event.currentTarget))
          }}
          className="card mt-6 flex flex-col gap-4 p-6"
        >
          {isSignup && (
            <div>
              <label htmlFor="name" className="label">
                Full name
              </label>
              <input
                id="name"
                name="name"
                className="field"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="Manuel Velazco"
                disabled={busy}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="field"
              required
              autoComplete="email"
              placeholder="name@university.edu"
              disabled={busy}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="field"
              required
              minLength={isSignup ? 8 : undefined}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              disabled={busy}
            />
            {isSignup && (
              <p className="mt-1.5 text-[11px] text-ink-faint">At least 8 characters.</p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3
                py-2 text-sm text-red-700"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <button type="submit" className="btn-accent w-full" disabled={busy} aria-busy={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? 'Please wait' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-soft">
          {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
          <button
            type="button"
            className="font-medium text-accent hover:text-accent-hover hover:underline"
            onClick={() => {
              setMode(isSignup ? 'login' : 'signup')
              setError(null)
            }}
            disabled={busy}
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
