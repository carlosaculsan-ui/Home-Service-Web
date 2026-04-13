import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import { FaEnvelope, FaLock, FaLockOpen } from 'react-icons/fa'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'
import './AuthForm.css'

// ─── Admin Login Form ────────────────────────────────────────────────────────

function AdminLoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Step 1 — authenticate
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    // Step 2 — check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin') {
      // Step 3 — success: parent will re-render via onAuthStateChange
      onLoginSuccess()
    } else {
      // Step 4 — not admin: sign out and show error
      await supabase.auth.signOut()
      setEmail('')
      setPassword('')
      setError('Unauthorized access. This login is for administrators only.')
    }

    setLoading(false)
  }

  return (
    <div
      className="auth-page"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="auth-overlay" />

      <div
        className={`auth-box-enter ${show ? 'auth-box-visible' : ''}`}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '420px',
          background: '#2a323f',
          border: '2px solid #fdf84c',
          boxShadow: '0 0 30px rgba(253,248,76,0.3)',
          borderRadius: '20px',
          padding: '2.5rem',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 0.75rem',
          }}>
            <Lock size={24} style={{ color: '#f97316' }} />
          </div>
          <h1 className="auth-title" style={{ marginBottom: '0.25rem' }}>Admin Login</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
            Restricted access. Authorized personnel only.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div
            className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
            style={{ '--i': 1 }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder=" "
              required
              className="auth-input"
            />
            <label>Email</label>
            <FaEnvelope className="auth-icon" />
          </div>

          <div
            className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
            style={{ '--i': 2 }}
          >
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder=" "
              required
              className="auth-input"
            />
            <label>Password</label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="auth-icon"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {showPassword ? <FaLockOpen /> : <FaLock />}
            </button>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div
            className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
            style={{ '--i': 3 }}
          >
            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── AdminRoute ──────────────────────────────────────────────────────────────

function AdminRoute({ children }) {
  // 'loading' | 'notLoggedIn' | 'notAdmin' | 'allowed'
  const [status, setStatus] = useState('loading')

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setStatus('notLoggedIn')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()

    setStatus(profile?.role === 'admin' ? 'allowed' : 'notAdmin')
  }

  useEffect(() => {
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Checking authorization...</p>
      </div>
    )
  }

  if (status === 'notLoggedIn') {
    return <AdminLoginForm onLoginSuccess={() => setStatus('allowed')} />
  }

  if (status === 'notAdmin') {
    return <AdminLoginForm onLoginSuccess={() => setStatus('allowed')} />
  }

  return children
}

export default AdminRoute
