import type { IssueStatus } from '../types'
import { statusMeta } from '../lib/constants'

export default function StatusBadge({ status }: { status: IssueStatus }) {
  return <span className={`status status-${status}`}>{statusMeta[status].label}</span>
}