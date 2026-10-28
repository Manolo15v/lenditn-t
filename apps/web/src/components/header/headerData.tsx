import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'

export function HeaderData() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false

    const savedTheme = localStorage.getItem('lendit-theme')
    if (savedTheme) return savedTheme === 'dark'

    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
    localStorage.setItem('lendit-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const clickNavigate = (next: string) => {
    if (location.pathname === next) return
    navigate(next)
  }

  return (
    <header
      className={cn(
        'glass-panel sticky top-0 z-10 flex h-14 items-center justify-between',
        'rounded-none rounded-b-[var(--radius-md)] border-x-0 border-t-0',
        'bg-[rgba(255,255,255,0.85)] px-4 backdrop-blur-xl sm:px-8',
      )}
    >
      <button
        type="button"
        className="flex min-w-0 items-center gap-2.5"
        onClick={() => navigate('/items')}
        aria-label="Lendit home"
      >
        <span className="size-2.5 shrink-0 rounded-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary-glow)] sm:size-3" />
        <span className="truncate text-lg font-extrabold tracking-tight text-[var(--text-primary)] sm:text-xl">
          Lendit
        </span>
      </button>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="theme-toggle btn btn-secondary flex h-9 w-9 items-center justify-center rounded-full px-0 py-0 text-base sm:h-10 sm:w-10"
          onClick={() => setIsDark((current) => !current)}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {user ? (
          <>
            <span className="hidden text-xs text-[var(--text-secondary)] sm:inline md:text-sm">
              Logged in as <strong className="text-[var(--text-primary)]">{user.name}</strong>
            </span>
            <button
              type="button"
              className="btn btn-secondary px-3 py-2 text-xs sm:px-4 sm:text-sm"
              onClick={() => clickNavigate('/dashboard')}
            >
              Admin
            </button>
            <button
              type="button"
              className="btn btn-secondary px-3 py-2 text-xs sm:px-4 sm:text-sm"
              onClick={logout}
            >
              Log out
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-sm"
            onClick={() => clickNavigate('/login')}
          >
            Log in
          </button>
        )}
      </div>
    </header>
  )
}
