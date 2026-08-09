import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Leaf, Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function sendOtp() {
    setBusy(true)
    setMessage('')

    const cleanEmail = email.trim().toLowerCase()

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        data: {
          full_name: name.trim() || 'Civic User',
        },
      },
    })

    setBusy(false)

    if (error) {
      setMessage(error.message)
    } else {
      setStep('otp')
      setMessage(`OTP sent to ${cleanEmail}`)
    }
  }

  async function verifyOtp() {
    setBusy(true)
    setMessage('')

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'email',
    })

    setBusy(false)

    if (error) {
      setMessage(error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="brand-mark">
          <Leaf size={24} />
          <span>CivicConnect</span>
        </div>

        <div className="hero-copy">
          <h1>
            Report it.
            <br />
            Resolve it.
          </h1>

          <p>
            A direct digital bridge between citizens and the teams responsible
            for keeping our neighborhoods clean, safe and functional.
          </p>

          <div className="hero-features">
            <div>
              <ShieldCheck size={18} />
              GPS-enabled reporting
            </div>

            <div>
              <ShieldCheck size={18} />
              Transparent status tracking
            </div>

            <div>
              <ShieldCheck size={18} />
              Municipality response workflow
            </div>
          </div>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <Leaf size={30} />
        </div>

        <h2>
          {mode === 'login'
            ? 'Welcome back'
            : 'Join the community'}
        </h2>

        <p className="auth-subtitle">
          {step === 'email'
            ? 'Sign in with email'
            : 'Verify your email'}
        </p>

        <p className="auth-description">
          {step === 'email'
            ? 'We will send a one-time verification code.'
            : `Enter the OTP sent to ${email}.`}
        </p>

        <div className="auth-form">
          {step === 'email' ? (
            <>
              {mode === 'signup' && (
                <label>
                  Full name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </label>
              )}

              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>

              {message && (
                <div className="form-message">
                  {message}
                </div>
              )}

              <button
                className="primary-btn full"
                disabled={busy || !email.trim()}
                onClick={sendOtp}
              >
                {busy ? 'Sending…' : 'Send OTP'}
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <label>
                One-time password
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>

              {message && (
                <div className="form-message">
                  {message}
                </div>
              )}

              <button
                className="primary-btn full"
                disabled={busy || !otp.trim()}
                onClick={verifyOtp}
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
                <ArrowRight size={18} />
              </button>

              <button
                className="text-btn"
                onClick={() => {
                  setStep('email')
                  setOtp('')
                  setMessage('')
                }}
              >
                Change email address
              </button>
            </>
          )}

          <div className="auth-switch">
            {mode === 'login'
              ? 'New to CivicConnect?'
              : 'Already registered?'}

            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setStep('email')
                setMessage('')
                setOtp('')
              }}
            >
              {mode === 'login'
                ? 'Create account'
                : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}