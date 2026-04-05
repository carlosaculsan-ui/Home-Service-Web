import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { ShieldCheck, Bell } from 'lucide-react'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isApprovedTasker, setIsApprovedTasker] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [notifications, setNotifications] = useState([])
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

  async function checkAdminRole(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    setIsAdmin(data?.role === 'admin')
  }

  useEffect(() => {
    let notifChannel = null

    if (session?.user?.id) {
      checkTaskerStatus(session.user.id)
      checkAdminRole(session.user.id)

      ;(async () => {
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', session.user.id)
          .lt('created_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())

        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        setNotifications(data ?? [])
        setUnreadCount(data?.filter(n => !n.is_read).length ?? 0)

        notifChannel = supabase
          .channel('navbar-notifs')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          }, () => {
            supabase
              .from('notifications')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(10)
              .then(({ data }) => {
                setNotifications(data ?? [])
                setUnreadCount(data?.filter(n => !n.is_read).length ?? 0)
              })
          })
          .subscribe()
      })()
    } else {
      setIsApprovedTasker(false)
      setIsAdmin(false)
      setNotifications([])
      setUnreadCount(0)
    }

    return () => {
      if (notifChannel) supabase.removeChannel(notifChannel)
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

  useEffect(() => {
    const handler = () => {
      if (showNotifDropdown) setShowNotifDropdown(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showNotifDropdown])

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
        <Link
          to="/"
          className="hover:opacity-80 transition-opacity cursor-pointer block"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
        >
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

            {/* Notification Bell */}
            <div className="relative mr-2" onClick={e => e.stopPropagation()}>
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  setShowNotifDropdown(v => !v)
                  if (unreadCount > 0) {
                    await supabase.from('notifications')
                      .update({ is_read: true })
                      .eq('user_id', session.user.id)
                    setUnreadCount(0)
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                  }
                }}
                className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-orange-400 transition-colors"
              >
                <Bell size={20} className="text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="font-bold text-gray-800 text-sm">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          await supabase.from('notifications')
                            .update({ is_read: true })
                            .eq('user_id', session.user.id)
                          setUnreadCount(0)
                          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                        }}
                        className="text-xs text-gray-400 hover:text-orange-500"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No notifications yet.</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={async () => {
                            if (!n.is_read) {
                              await supabase.from('notifications')
                                .update({ is_read: true }).eq('id', n.id)
                              setUnreadCount(c => Math.max(0, c - 1))
                              setNotifications(prev => prev.map(x =>
                                x.id === n.id ? { ...x, is_read: true } : x))
                            }
                          }}
                          className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-orange-50' : 'bg-white'}`}
                        >
                          <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                {!isAdmin && !isApprovedTasker && (
                  <Link
                    to="/become-a-tasker"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                  >
                    Become a Tasker
                  </Link>
                )}
                {!isAdmin && !isApprovedTasker && (
                  <Link
                    to="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                  >
                    My Bookings
                  </Link>
                )}
                {isApprovedTasker && (
                  <Link
                    to="/tasker-dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                  >
                    My Tasks
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors border-t border-gray-100"
                  >
                    <ShieldCheck size={14} className="inline mr-1" />Admin Panel
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
              {!isAdmin && !isApprovedTasker && (
                <Link
                  to="/become-a-tasker"
                  onClick={() => setMenuOpen(false)}
                  className="text-white font-medium hover:text-orange-200"
                >
                  Become a Tasker
                </Link>
              )}
              {!isAdmin && !isApprovedTasker && (
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="text-white font-medium hover:text-orange-200"
                >
                  My Bookings
                </Link>
              )}
              {isApprovedTasker && (
                <Link
                  to="/tasker-dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="text-white font-medium hover:text-orange-200"
                >
                  My Tasks
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="text-yellow-200 font-semibold hover:text-yellow-100"
                >
                  <ShieldCheck size={14} className="inline mr-1" />Admin Panel
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
