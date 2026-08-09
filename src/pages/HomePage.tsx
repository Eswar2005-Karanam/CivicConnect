import { Link } from 'react-router-dom'
import { ArrowRight, Camera, MapPin, ShieldCheck, TrendingUp, PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import IssueCard from '../components/IssueCard'
import type { Issue } from '../types'

export default function HomePage() {
  const { profile } = useAuth()
  const [issues, setIssues] = useState<Issue[]>([])
  const [stats, setStats] = useState({ total: 0, resolved: 0, active: 0 })

  useEffect(() => {
    if (!profile) return
    const userProfile = profile

    async function loadData() {
      let dbIssues: Issue[] = []
      try {
        const { data } = await supabase.from('issues').select('*').eq('reporter_id', userProfile.id).order('created_at', { ascending: false })
        if (data) dbIssues = data as Issue[]
      } catch {}

      const localIssues: Issue[] = JSON.parse(localStorage.getItem('civic_local_issues') || '[]')

      // Merge unique by ID
      const map = new Map<string, Issue>()
      localIssues.forEach(i => map.set(i.id, i))
      dbIssues.forEach(i => map.set(i.id, i))

      const all = Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const userAll = all.filter(i => i.reporter_id === userProfile.id || userProfile.id.startsWith('00000000'))

      setIssues(userAll.slice(0, 4))
      setStats({
        total: userAll.length,
        resolved: userAll.filter(x => x.status === 'resolved').length,
        active: userAll.filter(x => !['resolved', 'rejected'].includes(x.status)).length
      })
    }

    loadData()
  }, [profile])

  return (
    <div className="page">
      <section className="hero">
        <div>
          <div className="eyebrow"><TrendingUp size={15} /> Citizen-powered civic action</div>
          <h1>See a problem?<br /><span>Report it. Track it.</span></h1>
          <p>From overflowing drains to damaged roads, turn local problems into trackable municipal action.</p>
          <div className="hero-actions">
            <Link className="primary-btn" to="/report">Report an issue <ArrowRight size={18} /></Link>
            <Link className="secondary-btn" to="/my-issues">View my reports</Link>
          </div>
        </div>
        <div className="hero-art">
          <div className="leaf-blob">🌿</div>
          <div className="floating-card fc-one"><Camera size={18} /><span>Capture evidence</span></div>
          <div className="floating-card fc-two"><MapPin size={18} /><span>Pin the location</span></div>
          <div className="floating-card fc-three"><ShieldCheck size={18} /><span>Track resolution</span></div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card"><span>Total reports</span><strong>{stats.total}</strong></div>
        <div className="stat-card"><span>Active reports</span><strong>{stats.active}</strong></div>
        <div className="stat-card"><span>Resolved</span><strong>{stats.resolved}</strong></div>
      </section>

      <section className="section-head">
        <div><div className="eyebrow">Your activity</div><h2>Recent reports</h2></div>
        <Link to="/my-issues" className="text-link">See all <ArrowRight size={15} /></Link>
      </section>

      {issues.length ? <div className="issue-grid">{issues.map(i => <IssueCard key={i.id} issue={i} />)}</div> : (
        <div className="empty-state">
          <PlusCircle size={30} />
          <h3>No reports yet</h3>
          <p>Be the first to report a civic issue in your neighborhood.</p>
          <Link className="primary-btn" to="/report">Create first report</Link>
        </div>
      )}
    </div>
  )
}