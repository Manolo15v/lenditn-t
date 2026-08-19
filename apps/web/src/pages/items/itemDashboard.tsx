import { ItemsDashboard } from '../../components/ItemsDashboard'
import { useAuth } from '../../context/AuthContext'

export function ItemDashboard() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div>
      <header
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void logout()}
          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
        >
          Log out
        </button>
      </header>
      <ItemsDashboard currentUserId={user.id} />
    </div>
  )
}
