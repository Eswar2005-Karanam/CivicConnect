import { Link, useLocation } from 'react-router-dom'
import { Leaf, LogOut, LayoutDashboard, PlusCircle, ClipboardList, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const admin = profile?.role === 'admin'

  const links = admin
    ? [{ to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard }]
    : [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/report', label: 'Report Issue', icon: PlusCircle },
        { to: '/my-issues', label: 'My Reports', icon: ClipboardList }
      ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to={admin ? '/admin' : '/'} className="brand">
          <span className="brand-mark"><Leaf size={20} /></span>
          <span>Civic<span>Connect</span></span>
        </Link>

        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} className={location.pathname === to ? 'nav-link active' : 'nav-link'} to={to}>
              <Icon size={17} /> {label}
            </Link>
          ))}
        </nav>

        <div className="profile-menu">
          <div className="avatar">{(profile?.full_name || 'U').charAt(0).toUpperCase()}</div>
          <div className="profile-text">
            <strong>{profile?.full_name || 'Civic User'}</strong>
            <small>{admin ? 'Municipality Admin' : profile?.phone || 'Citizen'}</small>
          </div>
          <button className="icon-btn" onClick={signOut} title="Sign out"><LogOut size={18} /></button>
        </div>
      </header>
      <main>{children}</main>
      <footer><Leaf size={14} /> CivicConnect · Better neighborhoods start with better reporting.</footer>
    </div>
  )
}