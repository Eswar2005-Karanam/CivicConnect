import { useEffect, useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import IssueCard from '../components/IssueCard'
import type { Issue, IssueStatus } from '../types'

export default function MyIssuesPage() {
  const { profile } = useAuth()
  const [issues, setIssues] = useState<Issue[]>([])
  const [status, setStatus] = useState<IssueStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!profile) return

    async function loadData() {
      let dbIssues: Issue[] = []
      try {
        const { data } = await supabase.from('issues').select('*').eq('reporter_id', profile.id).order('created_at', { ascending: false })
        if (data) dbIssues = data as Issue[]
      } catch {}

      const localIssues: Issue[] = JSON.parse(localStorage.getItem('civic_local_issues') || '[]')
      const map = new Map<string, Issue>()
      localIssues.forEach(i => map.set(i.id, i))
      dbIssues.forEach(i => map.set(i.id, i))

      const all = Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const userAll = all.filter(i => i.reporter_id === profile.id || profile.id.startsWith('00000000'))
      setIssues(userAll)
    }

    loadData()
  }, [profile])

  const filtered = issues.filter(i =>
    (status === 'all' || i.status === status) &&
    `${i.title} ${i.complaint_code} ${i.description}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-title"><div className="eyebrow">Your civic activity</div><h1>My reports</h1><p>Track every issue you have submitted.</p></div>
      <div className="toolbar">
        <div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search complaint ID or title…" /></div>
        <div className="filter-box"><Filter size={16} /><select value={status} onChange={e => setStatus(e.target.value as IssueStatus | 'all')}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="under_review">Under Review</option><option value="assigned">Assigned</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select></div>
      </div>
      {filtered.length ? <div className="issue-grid">{filtered.map(i => <IssueCard key={i.id} issue={i} />)}</div> : <div className="empty-state"><Search size={28} /><h3>No matching reports</h3><p>Try another search or status filter.</p></div>}
    </div>
  )
}