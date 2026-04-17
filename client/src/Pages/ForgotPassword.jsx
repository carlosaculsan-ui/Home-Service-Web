import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaEnvelope, FaLock, FaLockOpen } from 'react-icons/fa'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'
import '../Pages/AuthForm.css'

function hasRecoveryToken() {
  const hash = window.location.hash
  const query = window.location.search
  return hash.includes('type=recovery') || query.includes('type=recovery')
}

function ForgotPassword() {
  // step: 'email' | 'sent' | 'loading' | 'reset' | 'invalid'
  const [step, setStep] = useState(hasRecoveryToken() ? 'loading' : 'email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('reset')
      }
    })

    let timeout = null
    if (hasRecoveryToken()) {
      timeout = setTimeout(() => {
        setStep(s => s === 'loading' ? 'invalid' : s)
      }, 8000)
    }

    return () => {
      subscription.unsubscribe()
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  const handleSendEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setStep('sent')
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
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
      setLoading(false)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      navigate(
        profile?.role === 'tasker' ? '/tasker' : '/login',
        { state: { notice: 'Password reset successfully! Please log in.' } }
      )
    }
  }

  const cardStyle = {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '420px',
    background: '#2a323f',
    border: '2px solid #fdf84c',
    boxShadow: '0 0 30px rgba(253, 248, 76, 0.3)',
    borderRadius: '20px',
    padding: '40px 45px',
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

      <div className={`auth-box-enter ${show ? 'auth-box-visible' : ''}`} style={cardStyle}>

        {/* Step 1 — Email input */}
        {step === 'email' && (
          <>
            <h2 className="auth-title">Forgot Password</h2>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '-0.6rem', marginBottom: '1.4rem' }}>
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSendEmail}>
              <div
                className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
                style={{ '--i': 1 }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder=" "
                  className="auth-input"
                />
                <label>Email</label>
                <FaEnvelope className="auth-icon" />
              </div>
              {error && <p className="auth-error">{error}</p>}
              <div
                className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
                style={{ '--i': 2 }}
              >
                <button type="submit" disabled={loading} className="auth-btn">
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </div>
            </form>
            <div className="auth-regi-link">
              <p>
                Remember your password?{' '}
                <Link to="/login" className="auth-link">Back to Login</Link>
              </p>
            </div>
          </>
        )}

        {/* Step 2 — Email sent */}
        {step === 'sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✉️</div>
            <h2 className="auth-title">Check Your Email</h2>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Reset link sent! Please check your email and click the link to reset your password.
            </p>
            <div className="auth-regi-link">
              <p>
                <Link to="/login" className="auth-link">Back to Login</Link>
              </p>
            </div>
          </div>
        )}

        {/* Step 3a — Loading / verifying token */}
        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ color: '#fff', fontWeight: 600 }}>Verifying your reset link...</p>
          </div>
        )}

        {/* Step 3b — Invalid / expired token */}
        {step === 'invalid' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>This reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="auth-link">Request a new reset link</Link>
          </div>
        )}

        {/* Step 3c — New password form */}
        {step === 'reset' && (
          <>
            <h2 className="auth-title">Reset Password</h2>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '-0.6rem', marginBottom: '1.4rem' }}>
              Enter your new password below.
            </p>
            <form onSubmit={handleResetPassword}>
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
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder=" "
                  className="auth-input"
                />
                <label>Confirm Password</label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="auth-icon"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showConfirmPassword ? <FaLockOpen /> : <FaLock />}
                </button>
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

export default ForgotPassword
