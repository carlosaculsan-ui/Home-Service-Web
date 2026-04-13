import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { FaLock, FaLockOpen } from 'react-icons/fa'
import backgroundImg from '../Assets/Background.jpg'
import './AuthForm.css'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    const timeout = setTimeout(() => {
      setSessionReady((ready) => {
        if (!ready) setSessionError(true)
        return ready
      })
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      navigate(profile?.role === 'tasker' ? '/tasker' : '/login')
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
        {/* Verifying state */}
        {!sessionReady && !sessionError && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{
              width: 36, height: 36, border: '4px solid #fdf84c',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
            }} />
            <p style={{ color: '#fff', fontWeight: 600 }}>Verifying your reset link...</p>
          </div>
        )}

        {/* Error state */}
        {sessionError && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p className="auth-error" style={{ marginBottom: '1rem' }}>
              This reset link is invalid or has expired.
            </p>
            <Link to="/forgot-password" className="auth-link">
              Request a new reset link
            </Link>
          </div>
        )}

        {/* Ready state */}
        {sessionReady && (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(249,115,22,0.15)',
                border: '1px solid rgba(249,115,22,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 0.75rem',
              }}>
                <FaLock style={{ color: '#f97316', fontSize: '1.3rem' }} />
              </div>
              <h1 className="auth-title" style={{ marginBottom: '0.25rem' }}>Reset Password</h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
                Enter your new password below.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div
                className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
                style={{ '--i': 1 }}
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  required
                  className="auth-input"
                />
                <label>New Password</label>
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
                className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
                style={{ '--i': 2 }}
              >
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder=" "
                  required
                  className="auth-input"
                />
                <label>Confirm Password</label>
                <FaLock className="auth-icon" />
              </div>

              {error && <p className="auth-error">{error}</p>}

              <div
                className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
                style={{ '--i': 3 }}
              >
                <button type="submit" disabled={loading} className="auth-btn">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>

            <div className="auth-regi-link" style={{ marginTop: '1.2rem' }}>
              <Link to="/login" className="auth-link">← Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
