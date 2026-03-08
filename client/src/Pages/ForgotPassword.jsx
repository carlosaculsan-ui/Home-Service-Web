import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'http://localhost:5173/reset-password' })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Password reset email sent! Check your inbox.')
    }
    setLoading(false)
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
          <h1 className="text-3xl font-extrabold text-white">Forgot Password</h1>
          <p className="text-gray-300 mt-2 text-sm">Enter your email and we'll send you a reset link.</p>
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

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-semibold text-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send Reset Email'}
          </button>

          {error && <p className="text-red-300 text-sm">{error}</p>}
          {success && <p className="text-green-300 text-sm">{success}</p>}
        </div>

        <p className="text-center text-gray-300 text-sm mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-orange-300 font-semibold hover:text-orange-200">Back to Login</Link>
        </p>

      </div>
    </div>
  )
}

export default ForgotPassword
