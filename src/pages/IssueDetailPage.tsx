import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { statusMeta, formatDate, categoryLabel } from '../lib/constants'
import type { Issue, IssueUpdate } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function IssueDetailPage() {
  const { id } = useParams()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [updates, setUpdates] = useState<IssueUpdate[]>([])

  useEffect(() => {
    if (!id) return

    async function loadData() {
      // 1. Try Supabase
      try {
        const { data } = await supabase.from('issues').select('*').eq('id', id).single()
        if (data) {
          setIssue(data as Issue)
          const { data: u } = await supabase.from('issue_updates').select('*').eq('issue_id', id).order('created_at', { ascending: true })
          setUpdates((u || []) as IssueUpdate[])
          return
        }
      } catch {}

      // 2. Local fallback
      const localIssues: Issue[] = JSON.parse(localStorage.getItem('civic_local_issues') || '[]')
      const found = localIssues.find(i => i.id === id)
      if (found) {
        setIssue(found)
        const u: IssueUpdate[] = JSON.parse(localStorage.getItem(`civic_updates_${id}`) || '[]')
        setUpdates(u)
      }
    }

    loadData()
  }, [id])

  if (!issue) return <div className="loading">Loading report…</div>

  return (
    <div className="page narrow">
      <Link to="/my-issues" className="back-link"><ArrowLeft size={16} /> Back to my reports</Link>
      <div className="detail-header">
        <div>
          <div className="eyebrow">{categoryLabel(issue.category)} · {issue.complaint_code}</div>
          <h1>{issue.title}</h1>
          <p>{issue.description}</p>
        </div>
        <StatusBadge status={issue.status} />
      </div>

      <div className="detail-grid">
        <div>
          {issue.image_url && <img className="detail-image" src={issue.image_url} alt={issue.title} />}
          {issue.resolution_image_url && (
            <div className="resolution-photo">
              <div className="eyebrow">Resolution evidence</div>
              <img className="detail-image" src={issue.resolution_image_url} alt="Resolution evidence" />
            </div>
          )}
        </div>

        <aside className="info-card">
          <h3>Report information</h3>
          <div className="info-row">
            <Clock size={17} />
            <span><small>Reported</small>{formatDate(issue.created_at)}</span>
          </div>
          {issue.location_text && (
            <div className="info-row">
              <MapPin size={17} />
              <span><small>Location</small>{issue.location_text}</span>
            </div>
          )}
          {issue.admin_response && (
            <div className="admin-note">
              <strong>Admin response</strong>
              <p>{issue.admin_response}</p>
            </div>
          )}
        </aside>
      </div>

      <div className="timeline-card">
        <div className="eyebrow">Live progress</div>
        <h2>Complaint timeline</h2>
        <div className="timeline">
          {updates.map((u, idx) => (
            <div className="timeline-item" key={u.id}>
              <div className={`timeline-dot ${idx === updates.length - 1 ? 'current' : ''}`}>
                {idx === updates.length - 1 ? <CheckCircle2 size={15} /> : ''}
              </div>
              <div>
                <strong>{statusMeta[u.status].label}</strong>
                <small>{formatDate(u.created_at)}</small>
                {u.note && <p>{u.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}