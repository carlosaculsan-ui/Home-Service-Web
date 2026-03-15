import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isApprovedTasker, setIsApprovedTasker] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  function handleNavClick(e, sectionId) {
    e.preventDefault()
    setMenuOpen(false)
    if (!sectionId) {
      navigate('/')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/')
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  async function checkTaskerStatus(userId) {
    const { data } = await supabase
      .from('taskers')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .maybeSingle()
    setIsApprovedTasker(!!data)
  }

  useEffect(() => {
    if (session?.user?.id) {
      checkTaskerStatus(session.user.id)
    } else {
      setIsApprovedTasker(false)
    }
  }, [session])

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
    setMenuOpen(false)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
    window.location.href = '/'
  }

  const avatarLabel = session?.user?.email?.slice(0, 2).toUpperCase() ?? ''

  return (
    <nav className="relative shadow-md w-full flex flex-wrap sticky top-0 z-50 min-h-[5vh] bg-white">
      {/* left white section */}
      <div className="w-[30%] bg-white min-h-[70px] flex items-center pl-4">
        <Link to="/" className="hover:opacity-80 transition-opacity cursor-pointer block">
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Roof SVG: two lines meeting at peak + chimney */}
          <svg
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 0 }}
            width="52"
            height="26"
            viewBox="0 0 40 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left slope */}
            <line x1="20" y1="2" x2="1" y2="19" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
            {/* Right slope */}
            <line x1="20" y1="2" x2="39" y2="19" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
            {/* Chimney */}
            <rect x="26" y="4" width="4" height="7" fill="#6b7280" rx="0.5" />
          </svg>
          <span className="text-orange-500 font-black text-5xl leading-none">h</span>
        </div>
        </Link>
      </div>

      {/* right orange section */}
      <div
        className="w-[70%] bg-orange-500 flex items-center justify-between px-10 py-5 min-h-[70px]"
        style={{ clipPath: 'polygon(40px 0%, 100% 0%, 100% 100%, 40px 100%, 0% 50%)' }}
      >
        <div className="hidden md:flex justify-evenly flex-1 pr-36 text-white font-medium text-base">
          <a href="/" onClick={(e) => handleNavClick(e, null)} className="hover:text-orange-200 cursor-pointer">Home</a>
          <a href="/#services" onClick={(e) => handleNavClick(e, 'services')} className="hover:text-orange-200 cursor-pointer">Services</a>
          <a href="/#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')} className="hover:text-orange-200 cursor-pointer">How It Works</a>
          <a href="/#about" onClick={(e) => handleNavClick(e, 'about')} className="hover:text-orange-200 cursor-pointer">About</a>
          <a href="/#contact" onClick={(e) => handleNavClick(e, 'contact')} className="hover:text-orange-200 cursor-pointer">Contact Us Now</a>
        </div>

        <button
          className="md:hidden text-white text-xl focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* avatar / login — hidden on mobile when menu is open */}
      <div className={`absolute right-4 top-1/2 -translate-y-1/2 z-[10000] flex-shrink-0 ${menuOpen ? 'hidden md:flex' : 'flex'}`}>
        {session ? (
          <>
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
                {isApprovedTasker && (
                  <Link
                    to="/tasker-dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                  >
                    My Tasks
                  </Link>
                )}
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

      {/* Mobile menu — full width below the navbar bar, high z-index */}
      {menuOpen && (
        <div className="md:hidden w-full flex flex-col gap-0 bg-orange-500 z-[9999]">
          {/* Nav links */}
          <div className="flex flex-col gap-4 text-white font-medium px-8 py-6 border-b border-orange-400">
            <a href="/" onClick={(e) => handleNavClick(e, null)} className="hover:text-orange-200 cursor-pointer">Home</a>
            <a href="/#services" onClick={(e) => handleNavClick(e, 'services')} className="hover:text-orange-200 cursor-pointer">Services</a>
            <a href="/#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')} className="hover:text-orange-200 cursor-pointer">How It Works</a>
            <a href="/#about" onClick={(e) => handleNavClick(e, 'about')} className="hover:text-orange-200 cursor-pointer">About</a>
            <a href="/#contact" onClick={(e) => handleNavClick(e, 'contact')} className="hover:text-orange-200 cursor-pointer">Contact Us Now</a>
          </div>

          {/* Account section */}
          {session ? (
            <div className="flex flex-col px-8 py-4 gap-3">
              <p className="text-orange-200 text-xs truncate">{session.user.email}</p>
              <Link
                to="/become-a-tasker"
                onClick={() => setMenuOpen(false)}
                className="text-white font-medium hover:text-orange-200"
              >
                Become a Tasker
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-white font-medium hover:text-orange-200"
              >
                My Bookings
              </Link>
              {isApprovedTasker && (
                <Link
                  to="/tasker-dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="text-white font-medium hover:text-orange-200"
                >
                  My Tasks
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="text-left text-red-200 hover:text-red-100 font-medium"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="px-8 py-4">
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                <button className="w-full px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold border border-white">
                  Log In →
                </button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
