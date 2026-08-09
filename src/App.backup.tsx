import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import ReportPage from './pages/ReportPage'
import MyIssuesPage from './pages/MyIssuesPage'
import IssueDetailPage from './pages/IssueDetailPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminIssuePage from './pages/AdminIssuePage'

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="loading">Loading CivicConnect…</div>
  return session ? <Layout>{children}</Layout> : <Navigate to="/auth" replace />
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="loading">Loading…</div>
  return profile?.role === 'admin' ? <Layout>{children}</Layout> : <Navigate to="/" replace />
}

export default function App() {
  return <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/" element={<Protected><HomePage /></Protected>} />
    <Route path="/report" element={<Protected><ReportPage /></Protected>} />
    <Route path="/my-issues" element={<Protected><MyIssuesPage /></Protected>} />
    <Route path="/issues/:id" element={<Protected><IssueDetailPage /></Protected>} />
    <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
    <Route path="/admin/issues/:id" element={<AdminOnly><AdminIssuePage /></AdminOnly>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}