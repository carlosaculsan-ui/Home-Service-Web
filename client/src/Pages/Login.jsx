import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // OTP verification state (new Google sign-ups only)
  const [otpScreen, setOtpScreen] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSending, setOtpSending] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const [notice, setNotice] = useState(location.state?.notice || '')

  function isNewGoogleUser(session) {
    const created = new Date(session.user.created_at).getTime()
    return (Date.now() - created) < 120000 // created within last 2 minutes = brand new account
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
      console.log('[Auth] event:', event)
      if (event === 'SIGNED_IN' && session) {
        const googleInitiated = sessionStorage.getItem('google_oauth_initiated')
        const created = new Date(session.user.created_at).getTime()
        const ageMs = Date.now() - created
        console.log('[Auth] googleInitiated flag:', googleInitiated)
        console.log('[Auth] account age (ms):', ageMs, '— new?', ageMs < 120000)
        console.log('[Auth] provider:', session.user.app_metadata?.provider)

        if (googleInitiated && isNewGoogleUser(session)) {
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

  const handleSubmit = async (e) => {
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

  const handleGoogleLogin = async () => {
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

  if (otpScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{
          backgroundImage: `url(${backgroundImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 w-full max-w-md rounded-2xl p-10"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-orange-500/20 border border-orange-400/40 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✉️</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Verify your email</h1>
            <p className="text-gray-300 text-sm">
              We sent a one-time code to<br />
              <span className="text-orange-300 font-semibold">{otpEmail}</span>
            </p>
          </div>

          {otpSending ? (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                placeholder="Enter 8-digit code"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 text-center text-xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              />

              {otpError && <p className="text-red-300 text-sm text-center">{otpError}</p>}

              <button
                onClick={handleOtpVerify}
                disabled={otpLoading || otp.length < 8}
                className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-semibold text-lg disabled:opacity-50 transition-colors"
              >
                {otpLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <p className="text-center text-gray-400 text-sm">
                Didn't receive it?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-orange-300 hover:text-orange-200 font-semibold"
                >
                  Resend code
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl p-10"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white">Login</h1>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white text-sm"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-300">
              <input type="checkbox" className="accent-orange-500" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-orange-300 hover:text-orange-200">Forgot password?</Link>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-semibold text-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          {notice && (
            <p style={{ fontSize: '0.85rem', color: '#86efac', background: 'rgba(134,239,172,0.1)', border: '1px solid rgba(134,239,172,0.3)', borderRadius: '8px', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
              {notice}
            </p>
          )}
          {error && <p className="text-red-300 text-sm">{error}</p>}

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 border-t border-white/20"></div>
            <span className="text-gray-300 text-sm">or</span>
            <div className="flex-1 border-t border-white/20"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="relative z-10 w-full py-3 rounded-lg font-medium flex items-center justify-center gap-3 transition-colors text-white bg-white/10 hover:bg-white/20 cursor-pointer"
            style={{ border: '1px solid rgba(255,255,255,0.25)' }}
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 pointer-events-none" />
            Continue with Google
          </button>
        </div>

        <p className="text-center text-gray-300 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-300 font-semibold hover:text-orange-200">Sign Up</Link>
        </p>

      </div>
    </div>
  )
}

export default Login