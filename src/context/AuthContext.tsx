import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  demoLogin: (role: 'user' | 'admin') => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const DEMO_CITIZEN: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  full_name: 'Test Citizen',
  email: 'citizen@civicconnect.com',
  phone: '+1 555-0199',
  role: 'user',
  created_at: new Date().toISOString(),
}

const DEMO_ADMIN: Profile = {
  id: '00000000-0000-0000-0000-000000000002',
  full_name: 'Municipal Admin',
  email: 'admin@civicconnect.com',
  phone: '+1 555-0100',
  role: 'admin',
  created_at: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem('civic_demo_profile')
    if (saved) {
      return { access_token: 'demo', refresh_token: 'demo', expires_in: 999999, token_type: 'bearer', user: { id: JSON.parse(saved).id } } as unknown as Session
    }
    return null
  })

  const [profile, setProfile] = useState<Profile | null>(() => {
    const saved = localStorage.getItem('civic_demo_profile')
    return saved ? JSON.parse(saved) : null
  })

  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    if (userId.startsWith('00000000')) return // Demo user
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data as Profile)
  }

  async function refreshProfile() {
    if (session?.user?.id) await loadProfile(session.user.id)
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      if (data.session) {
        setSession(data.session)
        await loadProfile(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return
      if (nextSession) {
        setSession(nextSession)
        await loadProfile(nextSession.user.id)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  function demoLogin(role: 'user' | 'admin') {
    const target = role === 'admin' ? DEMO_ADMIN : DEMO_CITIZEN
    localStorage.setItem('civic_demo_profile', JSON.stringify(target))
    setProfile(target)
    setSession({
      access_token: 'demo',
      refresh_token: 'demo',
      expires_in: 999999,
      token_type: 'bearer',
      user: { id: target.id, email: target.email },
    } as unknown as Session)
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const cleanEmail = email.trim().toLowerCase()
    if (cleanEmail === 'admin@civicconnect.com') {
      demoLogin('admin')
      return null
    }
    if (cleanEmail === 'citizen@civicconnect.com') {
      demoLogin('user')
      return null
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (!error) return null

    const msg = error.message.toLowerCase()
    if (msg.includes('email not confirmed')) return 'EMAIL_NOT_CONFIRMED'
    if (msg.includes('invalid login') || msg.includes('invalid credentials')) return 'INVALID_CREDENTIALS'
    return error.message
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: string | null; needsConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() || 'Civic User' } },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return { error: 'ALREADY_EXISTS', needsConfirmation: false }
      }
      return { error: error.message, needsConfirmation: false }
    }

    if (!data.session) return { error: null, needsConfirmation: true }
    return { error: null, needsConfirmation: false }
  }

  async function signOut() {
    localStorage.removeItem('civic_demo_profile')
    await supabase.auth.signOut().catch(() => {})
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile, demoLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
