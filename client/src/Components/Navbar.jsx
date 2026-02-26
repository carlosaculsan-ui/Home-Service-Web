import { useState } from 'react'
import { Link } from 'react-router-dom'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow-md px-8 py-4">
      
      <div className="flex items-center justify-between">
    
        <div className="text-3xl font-extrabold text-blue-600">
          Vortex Elite
        </div>

    
        <div className="hidden md:flex gap-8 text-gray-600 font-medium">
          <a href="#" className="hover:text-blue-600">Home</a>
          <a href="#" className="hover:text-blue-600">Services</a>
          <a href="#" className="hover:text-blue-600">How It Works</a>
          <a href="#" className="hover:text-blue-600">About</a>
        </div>

    
        <div className="hidden md:flex gap-3 items-center">
          <a href="#" className="text-blue-600 font-semibold hover:underline">
            Become a Tasker
          </a>
          <Link to="/login">
            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
              Log In
            </button>
          </Link>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Sign Up
          </button>
        </div>

   
        <button
          className="md:hidden text-gray-600 focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

   
      {menuOpen && (
        <div className="md:hidden mt-4 flex flex-col gap-4 text-gray-600 font-medium border-t pt-4">
          <a href="#" className="hover:text-blue-600">Home</a>
          <a href="#" className="hover:text-blue-600">Services</a>
          <a href="#" className="hover:text-blue-600">How It Works</a>
          <a href="#" className="hover:text-blue-600">About</a>
          <a href="#" className="text-blue-600 font-semibold">Become a Tasker</a>
          <Link to="/login">
            <button className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
              Log In
            </button>
          </Link>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Sign Up
          </button>
        </div>
      )}

    </nav>
  )
}

export default Navbar