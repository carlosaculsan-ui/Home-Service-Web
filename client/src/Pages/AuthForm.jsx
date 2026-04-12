import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { FaEnvelope, FaLock, FaLockOpen } from 'react-icons/fa'
import Background from '../Assets/Background.jpg'
import './AuthForm.css'

function AuthForm() {
  const location = useLocation()
  const [isLogin, setIsLogin] = useState(location.pathname !== '/signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')

  // OTP verification state (new Google sign-ups only)
  const [otpScreen, setOtpScreen] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSending, setOtpSending] = useState(false)

  const navigate = useNavigate()

  // Trigger entrance animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(timer)
  }, [])

  function isNewGoogleUser(session) {
    const created = new Date(session.user.created_at).getTime()
    return (Date.now() - created) < 120000
  }

  async function routeByRole(session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = profile?.role

    if (role === 'tasker') {
      navigate('/tasker-dashboard')
      return
    }

    if (role === 'admin') {
      await supabase.auth.signOut()
      setError('Admins must log in through the Admin Login page.')
      setLoading(false)
      return
    }

    const redirect = sessionStorage.getItem('redirectAfterLogin')
    if (redirect) {
      sessionStorage.removeItem('redirectAfterLogin')
      navigate(redirect)
    } else {
      navigate('/')
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const googleInitiated = sessionStorage.getItem('google_oauth_initiated')
        const ageMs = Date.now() - new Date(session.user.created_at).getTime()

        if (googleInitiated && ageMs < 120000) {
          sessionStorage.removeItem('google_oauth_initiated')
          const userEmail = session.user.email
          await supabase.auth.signOut()
          setOtpSending(true)
          await supabase.auth.signInWithOtp({ email: userEmail })
          setOtpSending(false)
          setOtpEmail(userEmail)
          setOtpScreen(true)
          return
        }

        sessionStorage.removeItem('google_oauth_initiated')
        await routeByRole(session)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // role check and navigation handled by onAuthStateChange
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirmPassword) return setError('Passwords do not match')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      alert('Check your email for confirmation!')
      setIsLogin(true)
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    sessionStorage.setItem('google_oauth_initiated', 'true')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) {
      sessionStorage.removeItem('google_oauth_initiated')
      setError(error.message)
    }
  }

  const handleOtpVerify = async () => {
    if (!otp.trim()) { setOtpError('Please enter the code.'); return }
    setOtpLoading(true)
    setOtpError('')
    const { error } = await supabase.auth.verifyOtp({
      email: otpEmail,
      token: otp.trim(),
      type: 'email',
    })
    if (error) {
      setOtpError('Invalid or expired code. Please try again.')
      setOtpLoading(false)
    }
    // On success onAuthStateChange fires with SIGNED_IN and routes normally
  }

  const handleResendOtp = async () => {
    setOtpError('')
    setOtp('')
    setOtpSending(true)
    await supabase.auth.signInWithOtp({ email: otpEmail })
    setOtpSending(false)
  }

  const toggleForm = () => {
    setIsLogin(!isLogin)
    setError('')
  }

  return (
    <div
      className="auth-page"
      style={{
        backgroundImage: `url(${Background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="auth-overlay" />

      <div
        className={`auth-box auth-box-enter ${show ? 'auth-box-visible' : ''} ${!isLogin ? 'auth-active' : ''}`}
      >
        <div className="auth-curve1" />
        <div className="auth-curve2" />

        {/* OTP Screen */}
        {otpScreen && (
          <div className="auth-otp-screen">
            <div className="auth-otp-icon">✉️</div>
            <h2 className="auth-otp-title">Verify your email</h2>
            <p className="auth-otp-sub">
              We sent a one-time code to<br />
              <span className="auth-otp-email">{otpEmail}</span>
            </p>

            {otpSending ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
                <div style={{ width: 32, height: 32, border: '4px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                  placeholder="Enter 8-digit code"
                  className="auth-otp-input"
                />
                {otpError && <p className="auth-otp-error">{otpError}</p>}
                <button
                  onClick={handleOtpVerify}
                  disabled={otpLoading || otp.length < 8}
                  className="auth-otp-btn"
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Continue'}
                </button>
                <p className="auth-otp-resend">
                  Didn't receive it?{' '}
                  <button type="button" onClick={handleResendOtp} className="auth-otp-resend-btn">
                    Resend code
                  </button>
                </p>
              </>
            )}
          </div>
        )}

        {/* LOGIN FORM — left */}
        <div
          className={`auth-form auth-form-login ${isLogin ? 'auth-form-visible' : 'auth-form-gone'}`}
        >
          <h2 className="auth-title">Login</h2>
          <form onSubmit={handleLogin}>
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
            <div
              className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
              style={{ '--i': 2 }}
            >
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {error && isLogin && <p className="auth-error">{error}</p>}
            <div
              className={`auth-input-box auth-field ${show ? 'auth-field-visible' : ''}`}
              style={{ '--i': 3 }}
            >
              <button type="submit" disabled={loading} className="auth-btn">
                {loading ? 'Signing In...' : 'Login'}
              </button>
            </div>
            <div
              className={`auth-field ${show ? 'auth-field-visible' : ''}`}
              style={{ '--i': 4 }}
            >
              <div className="auth-divider"><span>or</span></div>
              <button type="button" onClick={handleGoogle} className="auth-google-btn">
                <img src="https://www.google.com/favicon.ico" width="16" height="16" />
                Continue with Google
              </button>
              <div className="auth-regi-link">
                <p>
                  Don't have an account?{' '}
                  <button type="button" onClick={toggleForm} className="auth-link">Sign Up</button>
                </p>
                <p style={{ marginTop: '0.3rem' }}>
                  <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* SIGNUP FORM — right */}
        <div
          className={`auth-form auth-form-signup ${!isLogin ? 'auth-form-visible' : 'auth-form-gone-right'}`}
        >
          <h2 className="auth-title">Sign Up</h2>
          <form onSubmit={handleSignup}>
            <div className="auth-input-box">
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
            <div className="auth-input-box">
              <input
                type={showSignupPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="auth-input"
              />
              <label>Password</label>
              <button
                type="button"
                onClick={() => setShowSignupPassword(!showSignupPassword)}
                className="auth-icon"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showSignupPassword ? <FaLockOpen /> : <FaLock />}
              </button>
            </div>
            <div className="auth-input-box">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
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
            {error && !isLogin && <p className="auth-error">{error}</p>}
            <div className="auth-input-box">
              <button type="submit" disabled={loading} className="auth-btn">
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>
            <div className="auth-divider"><span>or</span></div>
            <button type="button" onClick={handleGoogle} className="auth-google-btn">
              <img src="https://www.google.com/favicon.ico" width="16" height="16" />
              Continue with Google
            </button>
            <div className="auth-regi-link">
              <p>
                Already have an account?{' '}
                <button type="button" onClick={toggleForm} className="auth-link">Sign In</button>
              </p>
            </div>
          </form>
        </div>

        {/* INFO — right (login state) */}
        <div
          className={`auth-info auth-info-right ${isLogin ? 'auth-info-visible' : 'auth-info-hidden-right'}`}
        >
          <h2 className="auth-info-title">WELCOME BACK!</h2>
          <p className="auth-info-text">
            Access your account to continue your amazing journey with us.
          </p>
        </div>

        {/* INFO — left (signup state) */}
        <div
          className={`auth-info auth-info-left ${!isLogin ? 'auth-info-visible' : 'auth-info-hidden-left'}`}
        >
          <h2 className="auth-info-title">
            JOIN<br />WITH US!
          </h2>
          <p className="auth-info-text">
            Create your account and start your amazing journey with us today!
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthForm
