import { MapPin, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Issue } from '../types'
import { categoryLabel, formatDate } from '../lib/constants'
import StatusBadge from './StatusBadge'

export default function IssueCard({ issue, admin = false }: { issue: Issue; admin?: boolean }) {
  return (
    <Link className="issue-card" to={admin ? `/admin/issues/${issue.id}` : `/issues/${issue.id}`}>
      <div className="issue-image">
        {issue.image_url ? <img src={issue.image_url} alt={issue.title} /> : <div className="image-placeholder">No photo</div>}
        <StatusBadge status={issue.status} />
      </div>
      <div className="issue-body">
        <div className="issue-category">{categoryLabel(issue.category)}</div>
        <h3>{issue.title}</h3>
        <p>{issue.description}</p>
        <div className="issue-meta">
          <span><Clock size={14} /> {formatDate(issue.created_at)}</span>
          {issue.location_text && <span><MapPin size={14} /> {issue.location_text}</span>}
        </div>
        <div className="issue-footer">
          <strong>{issue.complaint_code}</strong>
          <span>View details <ArrowRight size={15} /></span>
        </div>
      </div>
    </Link>
  )
}