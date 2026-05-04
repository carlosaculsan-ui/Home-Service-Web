import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { FaEnvelope, FaLock } from 'react-icons/fa'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'
import '../Pages/AuthForm.css'

// ─── Admin Login Form ────────────────────────────────────────────────────────

function AdminLoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(timer)
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
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
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
          zIndex: 1,
          width: '100%',
          maxWidth: '420px',
          background: '#2a323f',
          border: '2px solid #fdf84c',
          boxShadow: '0 0 30px rgba(253, 248, 76, 0.3)',
          borderRadius: '20px',
          padding: '40px 45px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(253,248,76,0.1)', border: '1px solid rgba(253,248,76,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaLock style={{ fontSize: '1.2rem', color: '#fdf84c' }} />
          </div>
        </div>
        <h2 className="auth-title">Admin Login</h2>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '-0.6rem', marginBottom: '1.4rem' }}>
          Restricted access. Authorized personnel only.
        </p>

        <form onSubmit={handleSubmit}>
          <div
            className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
            style={{ '--i': 1 }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              required
              placeholder=" "
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
              required
              placeholder=" "
              className="auth-input"
            />
            <label>Password</label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="auth-icon"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div
            className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
            style={{ '--i': 3 }}
          >
            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? 'Signing In...' : 'Login'}
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
