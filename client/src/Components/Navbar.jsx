import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setDropdownOpen(false)
    navigate('/')
  }

  const avatarLabel = session?.user?.email?.slice(0, 2).toUpperCase() ?? ''

  return (
    <nav className="relative shadow-md w-full flex sticky top-0 z-50 min-h-[5vh] bg-white">
      {/* left white section - 30% width, logo placeholder */}
      <div className="w-[30%] bg-white min-h-[70px]"></div>

      {/* right orange section - 70% width with arrow shape */}
      <div
        className="w-[70%] bg-orange-500 flex items-center justify-between px-10 py-5 min-h-[70px]"
        style={{ clipPath: 'polygon(40px 0%, 100% 0%, 100% 100%, 40px 100%, 0% 50%)' }}
      >
        {/* desktop nav links distributed evenly */}
        <div className="hidden md:flex justify-evenly flex-1 pr-36 text-white font-medium text-base">
          <a href="#home" className="hover:text-orange-200">Home</a>
          <a href="#services" className="hover:text-orange-200">Services</a>
          <a href="#how-it-works" className="hover:text-orange-200">How It Works</a>
          <a href="#about" className="hover:text-orange-200">About</a>
          <a href="#contact" className="hover:text-orange-200">Contact Us Now</a>
        </div>

        {/* mobile toggle */}
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* login button / avatar — absolute on nav to avoid clip-path cutoff */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex-shrink-0" ref={dropdownRef}>
        {session ? (
          <>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 h-10 rounded-full bg-white text-orange-500 font-bold text-sm flex items-center justify-center hover:bg-orange-100 transition-colors"
            >
              {avatarLabel}
            </button>

            {dropdownOpen && (
              <div className="fixed w-52 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[9999]" style={{ top: '70px', right: '16px' }}>
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
