import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Loader2 } from 'lucide-react'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import ReportPage from './pages/ReportPage'
import MyIssuesPage from './pages/MyIssuesPage'
import IssueDetailPage from './pages/IssueDetailPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminIssuePage from './pages/AdminIssuePage'

/** Redirects to /login if user is not authenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--green)' }} />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Redirects to / if user is not an admin */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--green)' }} />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* Protected citizen routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout><HomePage /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/report"
        element={
          <RequireAuth>
            <Layout><ReportPage /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/my-issues"
        element={
          <RequireAuth>
            <Layout><MyIssuesPage /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/issues/:id"
        element={
          <RequireAuth>
            <Layout><IssueDetailPage /></Layout>
          </RequireAuth>
        }
      />

      {/* Protected admin routes */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <Layout><AdminDashboard /></Layout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/issues/:id"
        element={
          <RequireAdmin>
            <Layout><AdminIssuePage /></Layout>
          </RequireAdmin>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
