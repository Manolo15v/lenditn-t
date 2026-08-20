import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'

//Pages
import { ItemDashboard } from '../pages/items/itemDashboard'
import { ItemSeeker } from '../pages/items/itemSeeker'
import { Login } from '../pages/login/login'

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  return <Navigate to={isAuthenticated ? '/items' : '/login'} replace />
}

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/items" element={<ItemSeeker />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<ItemDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
