import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff, ArrowRight, Camera, MapPin, ShieldCheck, Loader2, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { session, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--blue)' }} />
      </div>
    )
  }

  if (session) return <Navigate to="/" replace />

  function switchMode(m: 'login' | 'register') {
    setMode(m)
    setError('')
    setSuccess('')
    setPassword('')
    setFullName('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) return setError('Please enter your email address.')
    if (!password) return setError('Please enter your password.')
    if (mode === 'register' && !fullName.trim()) return setError('Please enter your full name.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')

    setBusy(true)

    try {
      if (mode === 'login') {
        const err = await signIn(email, password)
        if (err === 'EMAIL_NOT_CONFIRMED') {
          setError(
            '⚠️ Your email is not confirmed yet. Please check your inbox and click the confirmation link. ' +
            'Or ask your admin to disable email confirmation in Supabase Dashboard → Authentication → Settings.'
          )
        } else if (err === 'INVALID_CREDENTIALS') {
          setError('Incorrect email or password. Please try again.')
        } else if (err) {
          setError(err)
        } else {
          navigate('/')
        }
      } else {
        const { error: err, needsConfirmation } = await signUp(email, password, fullName)
        if (err === 'ALREADY_EXISTS') {
          setError('An account with this email already exists. Please sign in instead.')
        } else if (err) {
          setError(err)
        } else if (needsConfirmation) {
          setSuccess(
            '✅ Account created! Please check your email inbox and click the confirmation link to activate your account.'
          )
        } else {
          setSuccess('Account created! Signing you in…')
          setTimeout(() => navigate('/'), 800)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      {/* ── Left visual panel ── */}
      <div className="auth-visual">
        <div className="auth-orb orb-one" />
        <div className="auth-orb orb-two" />
        <Leaf size={28} style={{ position: 'relative', zIndex: 2 }} />
        <h1>
          Report it.<br />
          <span>Resolve it.</span>
        </h1>
        <p>
          A direct digital bridge between citizens and the teams responsible
          for keeping our neighborhoods clean, safe, and functional.
        </p>
        <div className="auth-points">
          <div><Camera size={16} /> GPS-enabled photo reporting</div>
          <div><MapPin size={16} /> Precise location tracking</div>
          <div><ShieldCheck size={16} /> Live resolution status</div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-card-wrap">
        <div className="auth-card">
          {/* Mobile-only brand */}
          <div className="mobile-brand">
            <span className="brand-mark" style={{ width: 32, height: 32 }}>
              <Leaf size={16} />
            </span>
            CivicConnect
          </div>

          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {mode === 'login' ? 'Welcome back' : 'Join the community'}
          </div>
          <h2>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'Report and track civic issues in your neighbourhood.'
              : 'Start reporting civic issues and see them resolved.'}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <label>
                Full name
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  disabled={busy}
                />
              </label>
            )}

            <label>
              Email address
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={busy}
              />
            </label>

            <label>
              Password
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : 'Your password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  disabled={busy}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                    color: 'var(--muted)', cursor: 'pointer', padding: 0,
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {error && (
              <div className="error-box" role="alert">
                {error.startsWith('⚠️') && (
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={15} />
                    <strong>Email confirmation required</strong>
                  </div>
                )}
                {error.replace('⚠️ ', '')}
              </div>
            )}
            {success && (
              <div className="success-box" role="status">
                {success}
              </div>
            )}

            <button
              id="auth-submit"
              className="primary-btn full"
              type="submit"
              disabled={busy}
              style={{ marginTop: 22 }}
            >
              {busy
                ? <><Loader2 className="spin" size={17} /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></>
              }
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? 'New to CivicConnect?' : 'Already have an account?'}
            <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
