import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { supabase } from '../supabase'
import backgroundImg from '../Assets/Background.jpg'

// ─── Admin Login Form ────────────────────────────────────────────────────────

function AdminLoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Step 1 — authenticate
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    // Step 2 — check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin') {
      // Step 3 — success: parent will re-render via onAuthStateChange
      onLoginSuccess()
    } else {
      // Step 4 — not admin: sign out and show error
      await supabase.auth.signOut()
      setEmail('')
      setPassword('')
      setError('Unauthorized access. This login is for administrators only.')
    }

    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-10"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Lock size={24} className="text-orange-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Admin Login</h1>
          <p className="text-gray-300 text-sm mt-1">Restricted access. Authorized personnel only.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="Email"
              required
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Password"
              required
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

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-semibold text-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── AdminRoute ──────────────────────────────────────────────────────────────

function AdminRoute({ children }) {
  // 'loading' | 'notLoggedIn' | 'notAdmin' | 'allowed'
  const [status, setStatus] = useState('loading')

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setStatus('notLoggedIn')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()

    setStatus(profile?.role === 'admin' ? 'allowed' : 'notAdmin')
  }

  useEffect(() => {
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Checking authorization...</p>
      </div>
    )
  }

  if (status === 'notLoggedIn') {
    return <AdminLoginForm onLoginSuccess={() => setStatus('allowed')} />
  }

  if (status === 'notAdmin') {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
