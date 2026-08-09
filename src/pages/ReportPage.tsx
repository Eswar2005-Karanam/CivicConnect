import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, MapPin, Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { categories } from '../lib/constants'
import type { IssueCategory } from '../types'

export default function ReportPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<IssueCategory>('garbage')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [locationText, setLocationText] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  function captureLocation() {
    if (!navigator.geolocation) return setMessage('GPS is not supported by this browser.')
    setGpsLoading(true); setMessage('')
    navigator.geolocation.getCurrentPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); setLocationText(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`); setGpsLoading(false) },
      e => { setMessage(e.message || 'Unable to access your location.'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function selectFile(f?: File) {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!title || !description) return setMessage('Please provide a title and description.')
    setBusy(true); setMessage('')

    try {
      let imageUrl: string | null = null
      if (file) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${profile.id}/${crypto.randomUUID()}.${ext}`
        const upload = await supabase.storage.from('issue-images').upload(path, file, { upsert: false })
        if (upload.error) throw upload.error
        imageUrl = supabase.storage.from('issue-images').getPublicUrl(path).data.publicUrl
      }

      const { data: issue, error } = await supabase.from('issues').insert({
        reporter_id: profile.id, category, title, description,
        image_url: imageUrl, latitude: lat, longitude: lng, location_text: locationText || null
      }).select().single()

      if (error) throw error
      await supabase.from('issue_updates').insert({ issue_id: issue.id, status: 'submitted', note: 'Complaint submitted by citizen.', updated_by: profile.id })
      navigate(`/issues/${issue.id}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to submit report.')
    } finally { setBusy(false) }
  }

  return (
    <div className="page narrow">
      <div className="page-title"><div className="eyebrow">Civic report</div><h1>Report an issue</h1><p>Give the response team enough evidence to act quickly.</p></div>
      <form className="form-card" onSubmit={submit}>
        <div className="form-section">
          <h3>1. What is the problem?</h3>
          <div className="category-grid">
            {categories.map(c => <button type="button" key={c.value} className={category === c.value ? 'category-btn selected' : 'category-btn'} onClick={() => setCategory(c.value)}><span>{c.icon === 'Trash2' ? '♻️' : c.icon === 'Construction' ? '🛣️' : c.icon === 'Waves' ? '🌊' : c.icon === 'Droplets' ? '💧' : c.icon === 'Lightbulb' ? '💡' : '⚠️'}</span>{c.label}</button>)}
          </div>
          <label>Short title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Garbage overflowing near main road" /></label>
          <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Explain what you observed, how severe it is, and any useful landmark details." /></label>
        </div>

        <div className="form-section">
          <h3>2. Add evidence</h3>
          <div className="upload-box" onClick={() => fileRef.current?.click()}>
            {preview ? <img src={preview} alt="Selected evidence" /> : <><Camera size={30} /><strong>Upload a photo</strong><span>JPG, PNG or WEBP</span></>}
          </div>
          <input ref={fileRef} hidden type="file" accept="image/*" capture="environment" onChange={e => selectFile(e.target.files?.[0])} />
        </div>

        <div className="form-section">
          <h3>3. Where is it?</h3>
          <button type="button" className="location-btn" onClick={captureLocation}><MapPin size={18} /> {gpsLoading ? 'Getting GPS location…' : lat ? 'GPS location captured' : 'Use my current location'}</button>
          <label>Location / landmark<input value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="Street, area, landmark or GPS coordinates" /></label>
          {lat && <div className="gps-pill"><CheckCircle2 size={15} /> Coordinates: {lat.toFixed(6)}, {lng?.toFixed(6)}</div>}
        </div>

        {message && <div className="error-box">{message}</div>}
        <button className="primary-btn full submit-btn" disabled={busy}>{busy ? <><Loader2 className="spin" size={18} /> Submitting…</> : <><Upload size={18} /> Submit civic report</>}</button>
      </form>
    </div>
  )
}