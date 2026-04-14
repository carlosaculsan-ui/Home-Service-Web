import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaEnvelope } from 'react-icons/fa'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'
import '../Pages/AuthForm.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(timer)
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
        <h2 className="auth-title">Forgot Password</h2>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '-0.6rem', marginBottom: '1.4rem' }}>
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleSubmit}>
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
          {success && <p style={{ fontSize: '0.8rem', color: '#86efac', marginBottom: '0.5rem' }}>{success}</p>}

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
      </div>
    </div>
  )
}

export default ForgotPassword
