import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

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
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white">Reset Password</h1>
          <p className="text-gray-300 mt-2">Enter your new password below</p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-semibold text-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="text-center mt-4">
            <Link to="/login" className="text-orange-400 hover:text-orange-300 hover:underline text-sm">Back to Login</Link>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ResetPassword