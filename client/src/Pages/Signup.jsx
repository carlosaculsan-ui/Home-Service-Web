import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import signupImage from '../Assets/SignupImage.jpg'
import backgroundImg from '../Assets/Background.jpg'

function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      alert('Check your email for confirmation')
      navigate('/login')
    }
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
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
      <div className="relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden flex"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Left - Form */}
        <div className="w-full md:w-1/2 p-10">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-white">Sign Up</h1>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            />

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

            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white text-sm"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-semibold text-lg disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing up...' : 'Create Account'}
            </button>

            {error && <p className="text-red-300 text-sm">{error}</p>}

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 text-gray-300">or sign up with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignup}
              className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-3 transition-colors text-white hover:bg-white/20"
              style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)' }}
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
              Continue with Google
            </button>
          </div>

          <p className="text-center text-gray-300 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-300 font-semibold hover:text-orange-200">Log In</Link>
          </p>
        </div>

        {/* Right - Image */}
        <div className="hidden md:block w-1/2">
          <img
            src={signupImage}
            alt="Signup"
            className="w-full h-full object-cover"
          />
        </div>

      </div>
    </div>
  )
}

export default Signup