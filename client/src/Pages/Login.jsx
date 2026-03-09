import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const redirect = sessionStorage.getItem('redirectAfterLogin')
        if (redirect) {
          sessionStorage.removeItem('redirectAfterLogin')
          navigate(redirect)
        } else {
          navigate('/')
        }
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
    }
    // navigation handled by onAuthStateChange
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
    if (error) setError(error.message)
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

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 text-gray-300" style={{ background: 'transparent' }}>or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-3 transition-colors text-white hover:bg-white/20"
            style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)' }}
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
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