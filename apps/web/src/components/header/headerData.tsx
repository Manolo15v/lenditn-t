import { LayoutGrid, LogIn, LogOut, Package } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-line-soft text-ink' : 'text-ink-soft hover:bg-line-soft hover:text-ink',
  )

export function HeaderData() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/items" className="flex shrink-0 items-center gap-2" aria-label="Lendit home">
          <span className="flex size-7 items-center justify-center rounded-lg bg-ink">
            <Package className="size-4 text-white" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight text-ink">Lendit</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          <NavLink to="/items" className={navLinkClass}>
            Browse
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={navLinkClass}>
              <LayoutGrid className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">My items</span>
            </NavLink>
          )}
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-sm text-ink-soft sm:flex">
              <span
                className="flex size-7 items-center justify-center rounded-full bg-accent-soft
                  text-xs font-semibold text-accent"
                aria-hidden="true"
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              {user.name}
            </span>
            <button type="button" onClick={handleLogout} className="btn-ghost">
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-primary">
            <LogIn className="size-4" aria-hidden="true" />
            Log in
          </Link>
        )}
      </div>
    </header>
  )
}
