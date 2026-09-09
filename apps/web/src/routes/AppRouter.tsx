import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { Spinner } from '../components/ui/States'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ItemDashboard } from '../pages/items/itemDashboard'
import { ItemSeeker } from '../pages/items/itemSeeker'
import { ProductDetail } from '../pages/items/productDetail'
import { Login } from '../pages/login/login'

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  return <Navigate to={isAuthenticated ? '/items' : '/login'} replace />
}

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}

// /items/:id is the canonical product URL. The older aliases stay as redirects
// so links already shared keep resolving instead of falling through to "*".
function LegacyItemRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/items/${id}`} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/items" element={<ItemSeeker />} />
          <Route path="/items/:id" element={<ProductDetail />} />

          <Route path="/product/:id" element={<LegacyItemRedirect />} />
          <Route path="/producto/:id" element={<LegacyItemRedirect />} />
          <Route path="/productp/:id" element={<LegacyItemRedirect />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<ItemDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
