import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaEnvelope, FaLock, FaLockOpen } from 'react-icons/fa'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'
import '../Pages/AuthForm.css'

function TaskerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(timer)
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
        <h2 className="auth-title">Tasker Login</h2>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '-0.6rem', marginBottom: '1.4rem' }}>
          Sign in to your tasker dashboard.
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
              {loading ? 'Signing In...' : 'Login'}
            </button>
          </div>
        </form>

        <div className="auth-regi-link">
          <p>
            <a href="/forgot-password" className="auth-link">Forgot Password?</a>
          </p>
          <p style={{ marginTop: '0.3rem' }}>
            <Link to="/" className="auth-link">← Back to homepage</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default TaskerLogin
