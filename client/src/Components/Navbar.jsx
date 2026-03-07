import { useState } from 'react'
import { Link } from 'react-router-dom'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="relative shadow-md w-full flex">
      {/* left white section - 30% width, logo placeholder */}
      <div className="w-[30%] bg-white"></div>

      {/* right orange section - 70% width with arrow shape */}
      <div
        className="w-[70%] bg-orange-500 flex items-center justify-between px-10"
        style={{ clipPath: 'polygon(40px 0%, 100% 0%, 100% 100%, 40px 100%, 0% 50%)' }}
      >
        {/* desktop nav links distributed evenly */}
        <div className="hidden md:flex justify-evenly flex-1 text-white font-medium">
          <a href="#" className="hover:text-orange-200">Home</a>
          <a href="#" className="hover:text-orange-200">Services</a>
          <a href="#" className="hover:text-orange-200">How It Works</a>
          <a href="#" className="hover:text-orange-200">About</a>
          <a href="#" className="hover:text-orange-200">Contact Us Now</a>
        </div>

        {/* login button pinned to far right */}
        <div className="flex-shrink-0">
          <Link to="/login">
            <button className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold border border-white flex items-center gap-2">
              Log In <span>→</span>
            </button>
          </Link>
        </div>

        {/* mobile toggle */}
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden flex flex-col gap-4 text-white font-medium px-8 pb-4 bg-orange-500">
          <a href="#" className="hover:text-orange-200">Home</a>
          <a href="#" className="hover:text-orange-200">Services</a>
          <a href="#" className="hover:text-orange-200">How It Works</a>
          <a href="#" className="hover:text-orange-200">About</a>
          <a href="#" className="hover:text-orange-200">Contact Us Now</a>
          <Link to="/login">
            <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold">
              Log In →
            </button>
          </Link>
        </div>
      )}
    </nav>
  )
}

export default Navbar