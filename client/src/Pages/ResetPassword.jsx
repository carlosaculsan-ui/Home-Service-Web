import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FaLock, FaLockOpen } from 'react-icons/fa'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'
import '../Pages/AuthForm.css'

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
    const timer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(timer)
  }, [])

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
        {!sessionReady && !sessionError && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Verifying your reset link...</p>
          </div>
        )}

        {sessionError && (
          <div className="text-center py-8">
            <p className="text-red-300 mb-4">This reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="auth-link">
              Request a new reset link
            </Link>
          </div>
        )}

        {sessionReady && (
          <>
            <h2 className="auth-title">Reset Password</h2>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '-0.6rem', marginBottom: '1.4rem' }}>
              Enter your new password below.
            </p>

            <form onSubmit={handleSubmit}>
              <div
                className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
                style={{ '--i': 1 }}
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder=" "
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
                  required
                  placeholder=" "
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

            <div className="auth-regi-link">
              <p>
                <Link to="/login" className="auth-link">Back to Login</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
