import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api'

type User = { id: string; name: string; email: string; createdAt: string }

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  signup: (name: string, email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const messages: Record<string, string> = {
  email_taken: 'That email is already registered.',
  invalid_credentials: 'Wrong email or password.',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.api.auth.me
      .$get()
      .then(async (res) => {
        if (!res.ok) return
        const { user: signedIn } = (await res.json()) as { user: User | null }
        setUser(signedIn)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.api.auth.login.$post({ json: { email, password } })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        return messages[body.error ?? ''] ?? 'Something went wrong.'
      }
      const { user: signedIn } = (await res.json()) as { user: User }
      setUser(signedIn)
      return null
    } catch {
      return 'Could not reach the server.'
    }
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await api.api.auth.signup.$post({ json: { name, email, password } })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        return messages[body.error ?? ''] ?? 'Something went wrong.'
      }
      const { user: signedUp } = (await res.json()) as { user: User }
      setUser(signedUp)
      return null
    } catch {
      return 'Could not reach the server.'
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.api.auth.logout.$post()
    } catch {
      // The server is unreachable; the client session still ends locally.
    }
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: user !== null, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
