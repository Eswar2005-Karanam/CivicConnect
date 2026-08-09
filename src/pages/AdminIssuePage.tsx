import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MapPin, Clock, Save, Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { categoryLabel, formatDate, statusMeta } from '../lib/constants'
import type { Issue, IssueStatus, IssueUpdate } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function AdminIssuePage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [issue, setIssue] = useState<Issue | null>(null)
  const [updates, setUpdates] = useState<IssueUpdate[]>([])
  const [status, setStatus] = useState<IssueStatus>('submitted')
  const [response, setResponse] = useState('')
  const [resolutionFile, setResolutionFile] = useState<File | null>(null)
  const [resolutionPreview, setResolutionPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  async function load() {
    if (!id) return
    const { data } = await supabase
      .from('issues')
      .select('*, reporter:profiles!issues_reporter_id_fkey(*)')
      .eq('id', id)
      .single()
    if (data) {
      setIssue(data as Issue)
      setStatus(data.status)
      setResponse(data.admin_response || '')
    }
    const { data: u } = await supabase
      .from('issue_updates')
      .select('*')
      .eq('issue_id', id)
      .order('created_at', { ascending: true })
    setUpdates((u || []) as IssueUpdate[])
  }

  useEffect(() => { load() }, [id])

  function selectResolutionFile(f?: File) {
    if (!f) return
    setResolutionFile(f)
    setResolutionPreview(URL.createObjectURL(f))
  }

  async function save() {
    if (!issue || !profile) return
    setBusy(true)
    setMessage('')

    try {
      let resolutionUrl = issue.resolution_image_url

      // Upload resolution photo if provided
      if (resolutionFile) {
        const ext = resolutionFile.name.split('.').pop() || 'jpg'
        const path = `resolutions/${issue.id}-${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('issue-images')
          .upload(path, resolutionFile)
        if (uploadErr) throw uploadErr
        resolutionUrl = supabase.storage.from('issue-images').getPublicUrl(path).data.publicUrl
      }

      // Update the issue
      const { error } = await supabase.from('issues').update({
        status,
        admin_response: response.trim() || null,
        resolution_image_url: resolutionUrl,
        resolved_at: status === 'resolved'
          ? (issue.resolved_at || new Date().toISOString())
          : null,
      }).eq('id', issue.id)

      if (error) throw error

      // Insert status update history entry
      await supabase.from('issue_updates').insert({
        issue_id: issue.id,
        status,
        note: response.trim() || statusMeta[status].description,
        updated_by: profile.id,
      })

      await load()
      setResolutionFile(null)
      setResolutionPreview('')
      setMessageType('success')
      setMessage('Complaint updated successfully.')
    } catch (err) {
      setMessageType('error')
      setMessage(err instanceof Error ? err.message : 'Unable to update complaint.')
    } finally {
      setBusy(false)
    }
  }

  if (!issue) {
    return (
      <div className="loading">
        <Loader2 className="spin" size={28} style={{ color: 'var(--green)' }} />
      </div>
    )
  }

  return (
    <div className="page narrow">
      <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to dashboard</Link>

      <div className="detail-header">
        <div>
          <div className="eyebrow">{categoryLabel(issue.category)} · {issue.complaint_code}</div>
          <h1>{issue.title}</h1>
          <p>{issue.description}</p>
        </div>
        <StatusBadge status={issue.status} />
      </div>

      <div className="admin-detail-grid">
        {/* Left column: images + info + history */}
        <div>
          {issue.image_url && (
            <img className="detail-image" src={issue.image_url} alt={issue.title} />
          )}

          <div className="info-card report-info" style={{ marginTop: 18 }}>
            <h3>Citizen report</h3>
            <div className="info-row">
              <Clock size={17} />
              <span><small>Reported</small>{formatDate(issue.created_at)}</span>
            </div>
            <div className="info-row">
              <MapPin size={17} />
              <span>
                <small>Location</small>
                {issue.location_text || 'Location not supplied'}
                {issue.latitude && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                  >
                    Open in map
                  </a>
                )}
              </span>
            </div>
            <div className="info-row">
              <span>
                <small>Reporter</small>
                {issue.reporter?.full_name || 'Citizen'}
                {issue.reporter?.email && ` · ${issue.reporter.email}`}
              </span>
            </div>
            {issue.latitude && (
              <div className="info-row">
                <span>
                  <small>GPS coordinates</small>
                  {issue.latitude.toFixed(6)}, {issue.longitude?.toFixed(6)}
                </span>
              </div>
            )}
          </div>

          {/* Resolution photo preview */}
          {(issue.resolution_image_url || resolutionPreview) && (
            <div className="resolution-photo">
              <div className="eyebrow">Resolution evidence</div>
              <img
                className="detail-image"
                src={resolutionPreview || issue.resolution_image_url!}
                alt="Resolution evidence"
                style={{ marginTop: 8 }}
              />
            </div>
          )}

          {/* Status history timeline */}
          {updates.length > 0 && (
            <div className="timeline-card" style={{ marginTop: 20 }}>
              <div className="eyebrow">History</div>
              <h2>Previous actions</h2>
              <div className="timeline">
                {updates.map((u, idx) => (
                  <div className="timeline-item" key={u.id}>
                    <div className={`timeline-dot ${idx === updates.length - 1 ? 'current' : ''}`}>
                      {idx === updates.length - 1 ? <CheckCircle2 size={12} /> : ''}
                    </div>
                    <div>
                      <strong><StatusBadge status={u.status} /></strong>
                      <small style={{ display: 'block', marginTop: 4 }}>{formatDate(u.created_at)}</small>
                      {u.note && <p>{u.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: admin action form */}
        <aside className="admin-form">
          <div className="eyebrow">Municipality action</div>
          <h2>Update complaint</h2>

          <label>
            Status
            <select value={status} onChange={e => setStatus(e.target.value as IssueStatus)}>
              {Object.entries(statusMeta).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>
          </label>

          <label>
            Admin response / note
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              rows={6}
              placeholder="Explain what the team has done or what happens next…"
            />
          </label>

          <label>
            Resolution photo
            <button
              type="button"
              className="upload-mini"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} />
              {resolutionFile ? resolutionFile.name : 'Choose photo (optional)'}
            </button>
          </label>
          <input
            hidden
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={e => selectResolutionFile(e.target.files?.[0])}
          />

          {message && (
            <div className={messageType === 'success' ? 'success-box' : 'error-box'}>
              {message}
            </div>
          )}

          <button
            className="primary-btn full"
            style={{ marginTop: 18 }}
            disabled={busy}
            onClick={save}
          >
            {busy
              ? <><Loader2 className="spin" size={17} /> Saving…</>
              : <><Save size={18} /> Save update</>
            }
          </button>
          <p className="form-hint" style={{ marginTop: 10 }}>
            The citizen will immediately see the updated status and your response when they view their complaint.
          </p>
        </aside>
      </div>
    </div>
  )
}