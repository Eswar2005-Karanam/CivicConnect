import { useEffect, useMemo, useState } from 'react'
import { Search, CheckCircle2, Clock3, AlertTriangle, BarChart3, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Issue, IssueStatus } from '../types'
import IssueCard from '../components/IssueCard'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [issues, setIssues] = useState<Issue[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<IssueStatus | 'all'>('all')

  async function load() {
    let dbIssues: Issue[] = []
    try {
      const { data } = await supabase.from('issues').select('*, reporter:profiles!issues_reporter_id_fkey(*)').order('created_at', { ascending: false })
      if (data) dbIssues = data as Issue[]
    } catch {}

    const localIssues: Issue[] = JSON.parse(localStorage.getItem('civic_local_issues') || '[]')
    const map = new Map<string, Issue>()
    localIssues.forEach(i => map.set(i.id, i))
    dbIssues.forEach(i => map.set(i.id, i))

    const all = Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setIssues(all)
  }

  useEffect(() => { load() }, [])

  const counts = useMemo(() => ({
    total: issues.length,
    active: issues.filter(i => !['resolved', 'rejected'].includes(i.status)).length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    urgent: issues.filter(i => ['submitted', 'under_review'].includes(i.status)).length
  }), [issues])

  const filtered = issues.filter(i =>
    (status === 'all' || i.status === status) &&
    `${i.title} ${i.complaint_code} ${i.location_text || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="admin-heading">
        <div>
          <div className="eyebrow">Municipality operations</div>
          <h1>Admin dashboard</h1>
          <p>Monitor incoming civic issues and move them through resolution.</p>
        </div>
        <div className="admin-chip"><Users size={16} /> {profile?.full_name}</div>
      </div>

      <div className="admin-stats">
        <div><BarChart3 /><span>Total complaints</span><strong>{counts.total}</strong></div>
        <div><Clock3 /><span>Active</span><strong>{counts.active}</strong></div>
        <div><AlertTriangle /><span>Needs review</span><strong>{counts.urgent}</strong></div>
        <div><CheckCircle2 /><span>Resolved</span><strong>{counts.resolved}</strong></div>
      </div>

      <div className="section-head">
        <div><div className="eyebrow">Operations queue</div><h2>All complaints</h2></div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={17} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search complaints…" />
        </div>
        <div className="filter-box">
          <select value={status} onChange={e => setStatus(e.target.value as IssueStatus | 'all')}>
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {filtered.length ? (
        <div className="issue-grid">{filtered.map(i => <IssueCard key={i.id} issue={i} admin />)}</div>
      ) : (
        <div className="empty-state">
          <CheckCircle2 size={30} />
          <h3>No complaints in this view</h3>
          <p>The queue is clear for the selected filter.</p>
        </div>
      )}
    </div>
  )
}