export type UserRole = 'user' | 'admin'
export type IssueStatus = 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'resolved' | 'rejected'
export type IssueCategory = 'garbage' | 'road_damage' | 'drainage' | 'water' | 'streetlight' | 'other'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: UserRole
  created_at: string
}

export interface Issue {
  id: string
  complaint_code: string
  reporter_id: string
  category: IssueCategory
  title: string
  description: string
  image_url: string | null
  latitude: number | null
  longitude: number | null
  location_text: string | null
  status: IssueStatus
  admin_response: string | null
  assigned_to: string | null
  resolution_image_url: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  reporter?: Profile
}

export interface IssueUpdate {
  id: string
  issue_id: string
  status: IssueStatus
  note: string | null
  updated_by: string | null
  created_at: string
}