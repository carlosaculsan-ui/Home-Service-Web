import { useState } from 'react'
import heroImg from '../Assets/hero.jpg'

const suggestions = [
  { icon: "🧹", label: "Cleaning" },
  { icon: "🔧", label: "Plumbing" },
  { icon: "⚡", label: "Electrical" },
  { icon: "🪚", label: "Carpentry" },
  { icon: "🎨", label: "Painting" },
  { icon: "❄️", label: "HVAC" },
]

function Hero() {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const filtered = suggestions.filter(s =>
    s.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (label) => {
    setQuery(label)
    setShowDropdown(false)
  }

  return (
    <div
      className="relative text-white py-16 md:py-24 px-6 md:px-8 text-center"
      style={{
        backgroundImage: `url(${heroImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >


      {/* Content */}
      <div className="relative z-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
          Home Services, Done Right
        </h1>
        <p className="text-base sm:text-lg md:text-xl mb-8 md:mb-10 text-blue-100 max-w-xl mx-auto">
          Book trusted professionals for cleaning, plumbing, electrical, and more.
        </p>

        {/* Search Bar */}
        <div className="relative flex justify-center max-w-2xl mx-auto">
          <div className="relative w-full">
            <input
              type="text"
              value={query}
              placeholder="What service do you need?"
              className="w-full px-4 md:px-6 py-3 md:py-4 rounded-l-lg bg-white text-gray-800 text-base md:text-lg focus:outline-none"
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />

            {/* Dropdown */}
            {showDropdown && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-b-lg shadow-xl z-50 overflow-hidden">
                {filtered.map((service, index) => (
                  <div
                    key={index}
                    onMouseDown={() => handleSelect(service.label)}
                    className="flex items-center gap-3 px-4 md:px-6 py-3 hover:bg-blue-50 cursor-pointer text-gray-800 text-left"
                  >
                    <span className="text-2xl">{service.icon}</span>
                    <span className="font-medium">{service.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-5 md:px-8 py-3 md:py-4 rounded-r-lg text-base md:text-lg whitespace-nowrap">
            Search
          </button>
        </div>
      </div>

    </div>
  )
}

export default Hero