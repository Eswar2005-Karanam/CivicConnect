import type { IssueCategory, IssueStatus } from '../types'

export const categories: { value: IssueCategory; label: string; icon: string }[] = [
  { value: 'garbage', label: 'Garbage & Waste', icon: 'Trash2' },
  { value: 'road_damage', label: 'Road Damage', icon: 'Construction' },
  { value: 'drainage', label: 'Drainage / Canal', icon: 'Waves' },
  { value: 'water', label: 'Water Issue', icon: 'Droplets' },
  { value: 'streetlight', label: 'Streetlight', icon: 'Lightbulb' },
  { value: 'other', label: 'Other Civic Issue', icon: 'CircleAlert' }
]

export const statusMeta: Record<IssueStatus, { label: string; description: string }> = {
  submitted: { label: 'Submitted', description: 'Complaint received.' },
  under_review: { label: 'Under Review', description: 'The municipality is reviewing the report.' },
  assigned: { label: 'Assigned', description: 'The issue has been assigned to a responsible team.' },
  in_progress: { label: 'In Progress', description: 'Work is currently being carried out.' },
  resolved: { label: 'Resolved', description: 'The reported issue has been marked completed.' },
  rejected: { label: 'Rejected', description: 'The complaint was rejected after review.' }
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

export function categoryLabel(value: IssueCategory) {
  return categories.find(c => c.value === value)?.label ?? 'Other Civic Issue'
}