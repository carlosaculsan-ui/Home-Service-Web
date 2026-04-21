import { useState, useEffect, useRef } from 'react'
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
  const [rememberMe, setRememberMe] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // OTP verification state (new Google sign-ups only)
  const [otpScreen, setOtpScreen] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpTimer, setOtpTimer] = useState(120)

  const navigate = useNavigate()
  const signingUpRef = useRef(false)

  // OTP countdown
  useEffect(() => {
    if (!otpScreen || otpSending || otpTimer <= 0) return
    const id = setTimeout(() => setOtpTimer(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [otpScreen, otpSending, otpTimer])

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

    if (role === 'helper') {
      navigate('/helper-dashboard')
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
      if (event === 'SIGNED_IN' && session && !signingUpRef.current) {
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
    signingUpRef.current = true
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      await supabase.auth.signOut()
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setSuccessMsg('shown')
    }
    signingUpRef.current = false
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
    setOtpTimer(120)
    setOtpSending(true)
    await supabase.auth.signInWithOtp({ email: otpEmail })
    setOtpSending(false)
  }

  const toggleForm = () => {
    setIsLogin(!isLogin)
    setError('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
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
                  disabled={otpTimer <= 0}
                />
                <p style={{
                  fontSize: '0.82rem',
                  textAlign: 'center',
                  marginBottom: '0.75rem',
                  color: otpTimer <= 0 ? '#ff6b6b' : otpTimer <= 30 ? '#f97316' : 'rgba(255,255,255,0.55)',
                }}>
                  {otpTimer > 0
                    ? `Code expires in ${Math.floor(otpTimer / 60)}:${String(otpTimer % 60).padStart(2, '0')}`
                    : 'OTP expired, please resend.'}
                </p>
                {otpError && <p className="auth-otp-error">{otpError}</p>}
                <button
                  onClick={handleOtpVerify}
                  disabled={otpLoading || otp.length < 8 || otpTimer <= 0}
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
                autoComplete="off"
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
                placeholder=" "
                autoComplete="off"
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
                autoComplete="off"
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
                placeholder=" "
                autoComplete="off"
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
                placeholder=" "
                autoComplete="off"
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
            {/* Remember Me */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: '8px 0 4px', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#f97316', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ color: '#ccc', fontSize: '13px' }}>Remember Me</span>
            </label>

            {/* Terms and Conditions */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', margin: '4px 0 8px', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={() => { if (!agreedToTerms) setShowTermsModal(true); else setAgreedToTerms(false) }}
                style={{ width: '16px', height: '16px', accentColor: '#f97316', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
              />
              <span style={{ color: '#ccc', fontSize: '13px' }}>
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  style={{ color: '#f5c518', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Terms and Conditions
                </button>
              </span>
            </label>

            {error && !isLogin && <p className="auth-error">{error}</p>}
            <div className="auth-input-box">
              <button type="submit" disabled={loading || !agreedToTerms} className="auth-btn">
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

      {/* Account Created Modal */}
      {successMsg && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.75)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', width: '100%', maxWidth: '400px', padding: '32px 28px', textAlign: 'center' }}>
            <h2 style={{ fontWeight: 800, fontSize: '20px', color: '#111827', margin: '0 0 12px' }}>Account Created Successfully</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 24px' }}>
              Your account has been created. Please check your email to confirm your account before logging in.
            </p>
            <button
              type="button"
              onClick={() => { setSuccessMsg(''); setIsLogin(true) }}
              style={{ width: '100%', padding: '12px', background: '#f5c518', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '15px', color: '#111827', cursor: 'pointer' }}
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.75)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <h2 style={{ fontWeight: 800, fontSize: '18px', color: '#111827', margin: 0 }}>Terms and Conditions</h2>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Hanap.ph — Effective Date: January 1, 2025</p>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', padding: '20px', fontSize: '13px', color: '#374151', lineHeight: '1.6', flex: 1 }}>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>1. Acceptance of Terms</p>
                <p>By creating an account or using the Hanap.ph platform (the "Platform"), you agree to be bound by these Terms and Conditions ("Terms") and all applicable laws and regulations of the Republic of the Philippines. If you do not agree to these Terms, you must not access or use the Platform. Hanap.ph reserves the right to modify these Terms at any time. Continued use of the Platform after changes are posted constitutes your acceptance of the revised Terms.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>2. Service Description</p>
                <p>Hanap.ph is an online marketplace that connects customers ("Customers") with independent home service providers ("Taskers") for various household services including but not limited to cleaning, carpentry, plumbing, electrical work, aircon servicing, and other related services. Hanap.ph acts solely as an intermediary platform and is not a direct service provider. The actual services are rendered by independent Taskers who are not employees, agents, or contractors of Hanap.ph.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>3. Account Registration</p>
                <p>You must be at least 18 years old to register an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must notify Hanap.ph immediately of any unauthorized use of your account. Hanap.ph reserves the right to suspend or terminate accounts that violate these Terms.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>4. Booking and Payment Policies</p>
                <p>Bookings are confirmed upon receipt of full payment through the Platform's accepted payment methods. Service rates are set by individual Taskers and displayed on their profiles. Hanap.ph charges a platform fee of 10% of the total booking value, which is deducted from the Tasker's payout. Customers are required to pay the full service fee prior to service commencement. All transactions are processed in Philippine Peso (PHP). Hanap.ph uses third-party payment processors and does not store credit card information on its servers. Prices are inclusive of applicable taxes unless otherwise stated.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>5. Refund Policy</p>
                <p>Customers may request a full refund if a booking is cancelled before the Tasker has been dispatched. Once a Tasker has been assigned and is on the way to the service location, cancellations may be subject to a cancellation fee equivalent to 20% of the total booking value. Refunds for unsatisfactory service must be raised within 24 hours of service completion and are subject to review by Hanap.ph. Approved refunds will be credited to the Customer's Hanap.ph e-wallet within 3–5 business days. Refunds to the original payment method may take 7–14 business days depending on the payment provider. Hanap.ph reserves the right to deny refund requests that do not meet the eligibility criteria.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>6. User Responsibilities</p>
                <p>As a Customer, you agree to: (a) provide accurate service location and task descriptions; (b) ensure a safe and accessible environment for the Tasker; (c) not request services that are illegal, hazardous, or outside the scope of the Platform; (d) treat Taskers with respect and courtesy; (e) not attempt to circumvent the Platform by engaging Taskers directly for future services discovered through Hanap.ph; and (f) comply with all applicable Philippine laws and regulations in connection with your use of the Platform.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>7. Tasker Responsibilities</p>
                <p>Taskers registered on the Platform agree to: (a) provide accurate professional information, credentials, and service capabilities; (b) fulfill accepted bookings promptly and with professional quality; (c) maintain appropriate licenses or permits required by Philippine law for their respective trade; (d) carry their own tools, materials, and equipment unless otherwise agreed with the Customer; (e) not solicit Customers outside of the Platform for services facilitated through Hanap.ph; and (f) comply with all applicable laws including but not limited to the Labor Code of the Philippines and relevant local ordinances.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>8. Privacy Policy Summary</p>
                <p>Hanap.ph collects personal information including your name, email address, mobile number, and location data for the purposes of account management, service delivery, and platform improvement. Your information may be shared with Taskers solely for the purpose of completing your booked service. Hanap.ph does not sell your personal data to third parties. Location data is collected during active bookings to enable navigation and real-time tracking features. By using the Platform, you consent to the collection and processing of your personal data in accordance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>9. Prohibited Conduct</p>
                <p>The following conduct is strictly prohibited on the Platform: (a) posting false, misleading, or fraudulent information; (b) harassing, threatening, or discriminating against other users or Taskers; (c) attempting to hack, disrupt, or interfere with the Platform's systems or infrastructure; (d) using the Platform for money laundering or any other illegal financial activity; (e) creating multiple accounts to circumvent suspensions or bans; (f) posting or transmitting offensive, obscene, or defamatory content in reviews or messages; and (g) engaging in any conduct that violates the rights of other users, Taskers, or third parties. Violations may result in immediate account suspension and referral to appropriate Philippine law enforcement authorities.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>10. Limitation of Liability</p>
                <p>Hanap.ph provides the Platform on an "as is" and "as available" basis. To the maximum extent permitted by applicable Philippine law, Hanap.ph shall not be liable for: (a) any indirect, incidental, special, or consequential damages arising from your use of the Platform; (b) the quality, safety, legality, or fitness for purpose of any service performed by a Tasker; (c) property damage or personal injury occurring during or after a service engagement; (d) any technical failures, service interruptions, or data loss; or (e) losses resulting from unauthorized access to your account. Hanap.ph's total liability to you for any claim shall not exceed the total fees paid by you for the specific booking giving rise to the claim.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>11. Intellectual Property</p>
                <p>All content on the Hanap.ph Platform, including but not limited to logos, trademarks, design, text, graphics, and software, is the exclusive property of Hanap.ph and is protected under applicable intellectual property laws of the Philippines. You may not reproduce, distribute, modify, or create derivative works from any Platform content without prior written consent from Hanap.ph.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>12. Dispute Resolution</p>
                <p>In the event of a dispute between a Customer and a Tasker, Hanap.ph may, at its discretion, facilitate mediation between the parties. However, Hanap.ph is not obligated to resolve disputes and its decision in any mediation is non-binding. Any unresolved disputes arising from the use of the Platform shall be submitted to the appropriate courts or alternative dispute resolution bodies in Caloocan City, Metro Manila, Philippines.</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>13. Governing Law</p>
                <p>These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines, including but not limited to the Civil Code of the Philippines, the Electronic Commerce Act (Republic Act No. 8792), the Consumer Act of the Philippines (Republic Act No. 7394), and the Data Privacy Act of 2012 (Republic Act No. 10173). Any legal action or proceeding relating to your access to, or use of, the Platform shall be instituted in a court of competent jurisdiction in Caloocan City, Metro Manila.</p>
              </div>

              <div>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>14. Contact Information</p>
                <p>If you have questions or concerns about these Terms and Conditions, please contact us at: Hanap.ph Support, St. Clare College of Caloocan, Zabarte Road, Camarin, Caloocan City, Metro Manila, Philippines. Email: support@hanap.ph. Operating Hours: Monday to Sunday, 7:00 AM – 5:00 PM.</p>
              </div>

              {/* Agreement radio — must scroll here to reach */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px', padding: '14px 16px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="termsAgree"
                  onChange={() => { setAgreedToTerms(true); setShowTermsModal(false) }}
                  style={{ accentColor: '#f97316', width: '18px', height: '18px', flexShrink: 0 }}
                />
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#c2410c' }}>Yes, I agree to the Terms and Conditions.</span>
              </label>

            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                style={{ width: '100%', padding: '10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', fontWeight: 600, fontSize: '14px', color: '#374151', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default AuthForm
