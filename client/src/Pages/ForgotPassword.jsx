import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { FaEnvelope } from 'react-icons/fa'
import backgroundImg from '../Assets/Background.jpg'
import './AuthForm.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://home-service-web-five.vercel.app/reset-password' })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Password reset email sent! Check your inbox.')
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
            <FaEnvelope style={{ color: '#f97316', fontSize: '1.4rem' }} />
          </div>
          <h1 className="auth-title" style={{ marginBottom: '0.25rem' }}>Forgot Password</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
            Enter your email and we'll send you a reset link.
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
              className="auth-input"
            />
            <label>Email</label>
            <FaEnvelope className="auth-icon" />
          </div>

          {error && <p className="auth-error">{error}</p>}
          {success && <p style={{ fontSize: '0.8rem', color: '#4ade80', marginBottom: '0.5rem' }}>{success}</p>}

          <div
            className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
            style={{ '--i': 2 }}
          >
            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </div>
        </form>

        <div className="auth-regi-link" style={{ marginTop: '1.2rem' }}>
          Remember your password?{' '}
          <Link to="/login" className="auth-link">Back to Login</Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
