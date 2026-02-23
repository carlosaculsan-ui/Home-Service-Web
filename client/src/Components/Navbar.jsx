function Navbar() {
  return (
    <nav className="bg-white shadow-md px-8 py-4 flex items-center justify-between">
      
      {/* Logo */}
      <div className="text-3xl font-extrabold text-blue-600">
        Vortex Elite
      </div>

      {/* Nav Links */}
      <div className="flex gap-8 text-gray-600 font-medium">
        <a href="#" className="hover:text-blue-600">Home</a>
        <a href="#" className="hover:text-blue-600">Services</a>
        <a href="#" className="hover:text-blue-600">How It Works</a>
        <a href="#" className="hover:text-blue-600">About</a>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 items-center">
        <a href="#" className="text-blue-600 font-semibold hover:underline">
          Become a Tasker
        </a>
        <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
          Log In
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Sign Up
        </button>
      </div>

    </nav>
  )
}

export default Navbar