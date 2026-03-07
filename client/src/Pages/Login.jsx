import { useState } from 'react'
import { Link } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    alert(`Logged in as ${email}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-orange-500">Vortex Elite</h1>
          <p className="text-gray-500 mt-2">Welcome back! Please log in.</p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-gray-800"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600">
              <input type="checkbox" className="accent-orange-500" />
              Remember me
            </label>
            <a href="#" className="text-orange-500 hover:underline">Forgot password?</a>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-semibold text-lg"
          >
            Log In
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-400">or</span>
            </div>
          </div>

          <button className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-3">
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
            Continue with Google
          </button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-500 font-semibold hover:underline">Sign Up</Link>
        </p>

      </div>
    </div>
  )
}

export default Login