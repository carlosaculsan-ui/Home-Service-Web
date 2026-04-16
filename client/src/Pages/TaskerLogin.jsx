import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { Briefcase } from 'lucide-react'
import { FaEnvelope, FaLock, FaLockOpen } from 'react-icons/fa'
import backgroundImg from '../Assets/Background.jpg'
import './AuthForm.css'

function TaskerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
      
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'tasker') {
      navigate('/tasker-dashboard', { replace: true })
    } else {
      await supabase.auth.signOut()
      setEmail('')
      setPassword('')
      setError('Access denied. This login is for taskers only.')
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
            <Briefcase size={24} style={{ color: '#f97316' }} />
          </div>
          <h1 className="auth-title" style={{ marginBottom: '0.25rem' }}>Tasker Login</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
            Sign in to your tasker dashboard.
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

          <div
            className={`auth-field ${show ? 'auth-field-visible' : ''}`}
            style={{ '--i': 3, textAlign: 'right', marginBottom: '1rem' }}
          >
            <Link to="/forgot-password" className="auth-link" style={{ fontSize: '0.82rem' }}>
              Forgot Password?
            </Link>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div
            className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
            style={{ '--i': 4 }}
          >
            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <div className="auth-regi-link" style={{ marginTop: '1.2rem' }}>
          <Link to="/" className="auth-link">← Back to homepage</Link>
        </div>
      </div>
    </div>
  )
}

export default TaskerLogin
