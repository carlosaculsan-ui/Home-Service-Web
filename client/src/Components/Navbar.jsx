import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    setDropdownOpen(false)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
    window.location.href = '/'
  }

  const avatarLabel = session?.user?.email?.slice(0, 2).toUpperCase() ?? ''

  return (
    <nav className="relative shadow-md w-full flex sticky top-0 z-50 min-h-[5vh] bg-white">
      {/* left white section */}
      <div className="w-[30%] bg-white min-h-[70px]"></div>

      {/* right orange section */}
      <div
        className="w-[70%] bg-orange-500 flex items-center justify-between px-10 py-5 min-h-[70px]"
        style={{ clipPath: 'polygon(40px 0%, 100% 0%, 100% 100%, 40px 100%, 0% 50%)' }}
      >
        <div className="hidden md:flex justify-evenly flex-1 pr-36 text-white font-medium text-base">
          <a href="#home" className="hover:text-orange-200">Home</a>
          <a href="#services" className="hover:text-orange-200">Services</a>
          <a href="#how-it-works" className="hover:text-orange-200">How It Works</a>
          <a href="#about" className="hover:text-orange-200">About</a>
          <a href="#contact" className="hover:text-orange-200">Contact Us Now</a>
        </div>

        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* avatar / login — absolute to avoid clip-path cutoff */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[10000] flex-shrink-0">
        {session ? (
          <>
            {/* backdrop — closes dropdown when clicking outside */}
            {dropdownOpen && (
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setDropdownOpen(false)}
              />
            )}

            <button
              type="button"
              onClick={() => setDropdownOpen(prev => !prev)}
              className="relative z-[10001] w-10 h-10 rounded-full bg-white text-orange-500 font-bold text-sm flex items-center justify-center hover:bg-orange-100 transition-colors"
            >
              {avatarLabel}
            </button>

            {dropdownOpen && (
              <div className="fixed w-52 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[10001]" style={{ top: '70px', right: '16px' }}>
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                </div>
                <Link
                  to="/become-a-tasker"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                >
                  Become a Tasker
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                >
                  My Bookings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </>
        ) : (
          <Link to="/login">
            <button className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold border border-white flex items-center gap-2">
              Log In <span>→</span>
            </button>
          </Link>
        )}
      </div>

      {menuOpen && (
        <div className="md:hidden flex flex-col gap-4 text-white font-medium px-8 py-6 bg-orange-500">
          <a href="#home" className="hover:text-orange-200">Home</a>
          <a href="#services" className="hover:text-orange-200">Services</a>
          <a href="#how-it-works" className="hover:text-orange-200">How It Works</a>
          <a href="#about" className="hover:text-orange-200">About</a>
          <a href="#contact" className="hover:text-orange-200">Contact Us Now</a>
          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-left text-red-200 hover:text-red-100"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
