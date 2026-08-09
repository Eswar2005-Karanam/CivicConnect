import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff, ArrowRight, Camera, MapPin, ShieldCheck, Loader2, UserCheck, ShieldAlert } from 'lucide-react'
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

  async function handleDemoLogin(demoEmail: string, demoPass: string, demoName: string) {
    setEmail(demoEmail)
    setPassword(demoPass)
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      // 1. Try signing in
      let err = await signIn(demoEmail, demoPass)
      
      // 2. If user doesn't exist, auto-register the demo account on the fly!
      if (err && (err.includes('INVALID_CREDENTIALS') || err.toLowerCase().includes('invalid login') || err.toLowerCase().includes('user not found'))) {
        const { error: signUpErr } = await signUp(demoEmail, demoPass, demoName)
        if (!signUpErr) {
          err = await signIn(demoEmail, demoPass)
        } else if (signUpErr.toLowerCase().includes('signups not allowed')) {
          setError('⚠️ Signups are disabled in Supabase. Please copy and run the SQL Script in Supabase SQL Editor to create database tables and demo accounts.')
          return
        }
      }

      if (err === 'EMAIL_NOT_CONFIRMED') {
        setError('⚠️ Account exists but Email is unconfirmed. Run the SQL script in Supabase SQL Editor to confirm all users automatically.')
      } else if (err) {
        setError('⚠️ Demo account not found. Please run the SQL Script in Supabase SQL Editor to initialize database tables & demo accounts.')
      } else {
        navigate('/')
      }
    } finally {
      setBusy(false)
    }
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
            '⚠️ Email is not confirmed yet. Run the SQL script in Supabase SQL Editor to instantly confirm all accounts.'
          )
        } else if (err === 'INVALID_CREDENTIALS') {
          setError('Incorrect email or password. Please check your credentials or try Demo accounts below.')
        } else if (err) {
          setError(err)
        } else {
          navigate('/')
        }
      } else {
        const { error: err, needsConfirmation } = await signUp(email, password, fullName)
        if (err === 'ALREADY_EXISTS') {
          setError('An account with this email already exists. Please sign in instead.')
        } else if (err && err.toLowerCase().includes('signups not allowed')) {
          setError(
            '⚠️ Signups are disabled in your Supabase project settings. Please run the SQL Script in Supabase SQL Editor to create tables and users.'
          )
        } else if (err) {
          setError(err)
        } else if (needsConfirmation) {
          setSuccess(
            '✅ Account registered! Run the SQL script in Supabase SQL Editor if email confirmation blocks login.'
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

        {/* Demo Quick Access Card */}
        <div style={{
          marginTop: 40, padding: 18, borderRadius: 16, background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 2
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--yellow)', marginBottom: 8 }}>
            ⚡ Hackathon Quick Login
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            Instant access with pre-configured accounts:
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleDemoLogin('citizen@civicconnect.com', 'password123', 'Test Citizen')}
              className="secondary-btn"
              style={{ padding: '8px 12px', fontSize: 12, flex: 1 }}
            >
              <UserCheck size={14} /> Citizen Login
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin@civicconnect.com', 'password123', 'Municipal Admin')}
              className="secondary-btn"
              style={{ padding: '8px 12px', fontSize: 12, flex: 1, borderColor: 'var(--yellow)', color: 'var(--yellow-light)' }}
            >
              <ShieldAlert size={14} /> Admin Login
            </button>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-card-wrap">
        <div className="auth-card">
          {/* Mobile brand */}
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
                {error}
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

          {/* Quick Demo Access for Mobile */}
          <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Quick Login:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleDemoLogin('citizen@civicconnect.com', 'password123', 'Test Citizen')}
                style={{ flex: 1, padding: 8, fontSize: 11, background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8 }}
              >
                👤 Citizen Login
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@civicconnect.com', 'password123', 'Municipal Admin')}
                style={{ flex: 1, padding: 8, fontSize: 11, background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--yellow)', borderRadius: 8 }}
              >
                🛡️ Admin Login
              </button>
            </div>
          </div>

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
