import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ReportPage from './pages/ReportPage'
import MyIssuesPage from './pages/MyIssuesPage'
import IssueDetailPage from './pages/IssueDetailPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminIssuePage from './pages/AdminIssuePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/report" element={<Layout><ReportPage /></Layout>} />
      <Route path="/my-issues" element={<Layout><MyIssuesPage /></Layout>} />
      <Route path="/issues/:id" element={<Layout><IssueDetailPage /></Layout>} />
      <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
      <Route path="/admin/issues/:id" element={<Layout><AdminIssuePage /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
