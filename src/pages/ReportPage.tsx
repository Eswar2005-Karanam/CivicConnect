import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, MapPin, Upload, CheckCircle2, Loader2, RefreshCw, X, Video } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { categories } from '../lib/constants'
import type { Issue, IssueCategory } from '../types'

export default function ReportPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  
  // States
  const [category, setCategory] = useState<IssueCategory>('garbage')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [locationText, setLocationText] = useState('')
  const [lat, setLat] = useState<number | null>(17.385044)
  const [lng, setLng] = useState<number | null>(78.486671)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  // Evidence Tab & Live Camera States
  const [evidenceMode, setEvidenceMode] = useState<'upload' | 'camera'>('upload')
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Leaflet Map Refs
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  // Dynamically load Leaflet on mount
  useEffect(() => {
    if ((window as any).L) {
      initMap()
      return
    }

    const cssLink = document.createElement('link')
    cssLink.rel = 'stylesheet'
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(cssLink)

    const jsScript = document.createElement('script')
    jsScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    jsScript.onload = () => {
      initMap()
    }
    document.body.appendChild(jsScript)

    return () => {
      stopCamera()
    }
  }, [])

  // Sync map center/marker position whenever lat/lng coordinates change
  useEffect(() => {
    const L = (window as any).L
    if (L && mapRef.current && markerRef.current && lat && lng) {
      mapRef.current.setView([lat, lng], 16)
      markerRef.current.setLatLng([lat, lng])
    }
  }, [lat, lng])

  function initMap() {
    const L = (window as any).L
    if (!L) return

    const initialLat = lat || 17.385044
    const initialLng = lng || 78.486671

    // If container already initialized
    const mapEl = document.getElementById('report-map')
    if (!mapEl || (mapEl as any)._leaflet_id) return

    const map = L.map('report-map').setView([initialLat, initialLng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map)

    marker.on('dragend', () => {
      const position = marker.getLatLng()
      setLat(position.lat)
      setLng(position.lng)
      setLocationText(`${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`)
    })

    map.on('click', (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng
      marker.setLatLng([clickLat, clickLng])
      setLat(clickLat)
      setLng(clickLng)
      setLocationText(`${clickLat.toFixed(6)}, ${clickLng.toFixed(6)}`)
    })

    mapRef.current = map
    markerRef.current = marker
  }

  function captureLocation() {
    if (!navigator.geolocation) return setMessage('GPS is not supported by this browser.')
    setGpsLoading(true)
    setMessage('')
    navigator.geolocation.getCurrentPosition(
      p => {
        setLat(p.coords.latitude)
        setLng(p.coords.longitude)
        setLocationText(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`)
        setGpsLoading(false)
      },
      e => {
        setMessage(e.message || 'Unable to access your location. Default coordinates set.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Webcam controls
  async function startCamera() {
    setMessage('')
    setFile(null)
    setPreview('')
    try {
      setCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setMessage('Unable to access webcam camera. Please use File Upload mode instead.')
      setCameraActive(false)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  function captureSnapshot() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg')
      setPreview(dataUrl)

      // Convert canvas photo to Blob File for upload
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const f = new File([blob], `cam-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
          setFile(f)
        })
    }
    stopCamera()
  }

  function selectFile(f?: File) {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clearPreview() {
    setFile(null)
    setPreview('')
    stopCamera()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!title.trim() || !description.trim()) return setMessage('Please provide a title and description.')
    setBusy(true)
    setMessage('')

    try {
      let imageUrl: string | null = null

      if (file) {
        try {
          const ext = file.name.split('.').pop() || 'jpg'
          const path = `${profile.id}/${crypto.randomUUID()}.${ext}`
          const upload = await supabase.storage.from('issue-images').upload(path, file, { upsert: false })
          if (upload.error) throw upload.error
          imageUrl = supabase.storage.from('issue-images').getPublicUrl(path).data.publicUrl
        } catch {
          // Fallback: Convert image file to base64 Data URL
          imageUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        }
      }

      const issueId = crypto.randomUUID()
      const code = 'CIV-' + Math.random().toString(36).substring(2, 10).toUpperCase()

      const newIssue: Issue = {
        id: issueId,
        complaint_code: code,
        reporter_id: profile.id,
        category,
        title,
        description,
        image_url: imageUrl || preview || null,
        latitude: lat,
        longitude: lng,
        location_text: locationText || 'Location provided by reporter',
        status: 'submitted',
        admin_response: null,
        assigned_to: null,
        resolution_image_url: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // 1. Save to Supabase DB if accessible
      try {
        const { data: issue, error } = await supabase.from('issues').insert({
          reporter_id: profile.id,
          category,
          title,
          description,
          image_url: imageUrl,
          latitude: lat,
          longitude: lng,
          location_text: locationText || null
        }).select().single()

        if (!error && issue) {
          try {
            await supabase.from('issue_updates').insert({
              issue_id: issue.id,
              status: 'submitted',
              note: 'Complaint submitted by citizen.',
              updated_by: profile.id
            })
          } catch {}

          navigate(`/issues/${issue.id}`)
          return
        }
      } catch {}

      // 2. Fallback local persistence
      const existing = JSON.parse(localStorage.getItem('civic_local_issues') || '[]')
      existing.unshift(newIssue)
      localStorage.setItem('civic_local_issues', JSON.stringify(existing))

      const updates = JSON.parse(localStorage.getItem(`civic_updates_${issueId}`) || '[]')
      updates.push({
        id: crypto.randomUUID(),
        issue_id: issueId,
        status: 'submitted',
        note: 'Complaint submitted by citizen.',
        updated_by: profile.id,
        created_at: new Date().toISOString()
      })
      localStorage.setItem(`civic_updates_${issueId}`, JSON.stringify(updates))

      navigate(`/issues/${issueId}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to submit report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <div className="page-title">
        <div className="eyebrow">Civic report</div>
        <h1>Report an issue</h1>
        <p>Give the response team enough evidence to act quickly.</p>
      </div>

      <form className="form-card" onSubmit={submit}>
        <div className="form-section">
          <h3>1. What is the problem?</h3>
          <div className="category-grid">
            {categories.map(c => (
              <button
                type="button"
                key={c.value}
                className={category === c.value ? 'category-btn selected' : 'category-btn'}
                onClick={() => setCategory(c.value)}
              >
                <span>{c.icon === 'Trash2' ? '♻️' : c.icon === 'Construction' ? '🛣️' : c.icon === 'Waves' ? '🌊' : c.icon === 'Droplets' ? '💧' : c.icon === 'Lightbulb' ? '💡' : '⚠️'}</span>
                {c.label}
              </button>
            ))}
          </div>
          <label>
            Short title
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Garbage overflowing near main road"
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              placeholder="Explain what you observed, how severe it is, and any useful landmark details."
            />
          </label>
        </div>

        <div className="form-section">
          <h3>2. Add evidence</h3>
          
          <div className="camera-tab-btns">
            <button
              type="button"
              className={evidenceMode === 'upload' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => {
                setEvidenceMode('upload')
                stopCamera()
              }}
            >
              <Upload size={14} style={{ marginRight: 6 }} /> Upload File
            </button>
            <button
              type="button"
              className={evidenceMode === 'camera' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => {
                setEvidenceMode('camera')
                if (!preview) startCamera()
              }}
            >
              <Camera size={14} style={{ marginRight: 6 }} /> Live Camera
            </button>
          </div>

          {evidenceMode === 'upload' ? (
            <div className="upload-box" onClick={() => fileRef.current?.click()}>
              {preview ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <img src={preview} alt="Selected evidence" />
                  <button type="button" className="camera-clear-btn" onClick={(e) => { e.stopPropagation(); clearPreview(); }}><X size={16} /></button>
                </div>
              ) : (
                <>
                  <Camera size={32} />
                  <strong>Upload a photo</strong>
                  <span>JPG, PNG or WEBP</span>
                </>
              )}
            </div>
          ) : (
            <div>
              {cameraActive ? (
                <div className="camera-container">
                  <video ref={videoRef} autoPlay playsInline className="camera-video" />
                  <div className="camera-controls">
                    <button type="button" className="primary-btn" onClick={captureSnapshot} style={{ background: 'var(--blue)' }}><Camera size={16} /> Take Photo</button>
                    <button type="button" className="secondary-btn" onClick={stopCamera} style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}>Cancel</button>
                  </div>
                </div>
              ) : preview ? (
                <div className="camera-preview-wrapper">
                  <img src={preview} alt="Live captured evidence" />
                  <button type="button" className="camera-clear-btn" onClick={clearPreview}><X size={16} /></button>
                </div>
              ) : (
                <button type="button" className="location-btn" onClick={startCamera}>
                  <Video size={16} /> Start Webcam Camera
                </button>
              )}
            </div>
          )}

          <input
            ref={fileRef}
            hidden
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => selectFile(e.target.files?.[0])}
          />
        </div>

        <div className="form-section">
          <h3>3. Where is it?</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="location-btn" onClick={captureLocation}>
              <MapPin size={18} /> {gpsLoading ? 'Getting GPS location…' : 'Use my current location'}
            </button>
          </div>
          
          {/* Leaflet interactive map */}
          <div id="report-map" className="map-container"></div>
          
          <label>
            Location / landmark
            <input
              value={locationText}
              onChange={e => setLocationText(e.target.value)}
              placeholder="Street, area, landmark or GPS coordinates"
            />
          </label>
          {lat && (
            <div className="gps-pill">
              <CheckCircle2 size={15} /> Pin Coordinates: {lat.toFixed(6)}, {lng?.toFixed(6)}
            </div>
          )}
        </div>

        {message && <div className="error-box">{message}</div>}

        <button className="primary-btn full submit-btn" disabled={busy}>
          {busy ? (
            <><Loader2 className="spin" size={18} /> Submitting…</>
          ) : (
            <><Upload size={18} /> Submit civic report</>
          )}
        </button>
      </form>
    </div>
  )
}