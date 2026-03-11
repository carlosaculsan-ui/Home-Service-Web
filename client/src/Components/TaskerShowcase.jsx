import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

function TaskerShowcase() {
  const [taskers, setTaskers] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [index, setIndex] = useState(1)
  const [sliding, setSliding] = useState(null)

  useEffect(() => {
    async function fetchTaskers() {
      const { data, error } = await supabase.from('taskers').select('*')
      if (error) {
        setFetchError(true)
      } else {
        setTaskers(data.map((t) => ({
          name: t.name,
          role: t.role,
          rating: t.rating,
          reviews: t.reviews_count,
        })))
      }
      setLoading(false)
    }
    fetchTaskers()
  }, [])

  const slide = (direction) => {
    setSliding(direction)
    setTimeout(() => {
      setIndex((prev) =>
        direction === 'left'
          ? prev === 0 ? taskers.length - 1 : prev - 1
          : prev === taskers.length - 1 ? 0 : prev + 1
      )
      setSliding(null)
    }, 300)
  }

  const getVisible = () => {
    const left = (index - 1 + taskers.length) % taskers.length
    const center = index
    const right = (index + 1) % taskers.length
    return [
      { tasker: taskers[left], position: 'left' },
      { tasker: taskers[center], position: 'center' },
      { tasker: taskers[right], position: 'right' },
    ]
  }

  const getSlideStyle = (position) => {
    if (!sliding) return 'translateX(0)'
    if (sliding === 'right') {
      if (position === 'left') return 'translateX(-120%)'
      if (position === 'center') return 'translateX(-40%)'
      if (position === 'right') return 'translateX(-40%)'
    }
    if (sliding === 'left') {
      if (position === 'right') return 'translateX(120%)'
      if (position === 'center') return 'translateX(40%)'
      if (position === 'left') return 'translateX(40%)'
    }
    return 'translateX(0)'
  }

  if (loading) {
    return (
      <div className="bg-gray-900 py-16 px-8 text-white text-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="bg-gray-900 py-16 px-8 text-white text-center">
        <p className="text-red-400">Failed to load taskers</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 py-16 px-8 text-white text-center overflow-hidden">

      <div className="flex items-center justify-center gap-1 mb-10">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 0 }}
            width="52"
            height="26"
            viewBox="0 0 40 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="20" y1="2" x2="1" y2="19" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="20" y1="2" x2="39" y2="19" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="26" y="4" width="4" height="7" fill="#6b7280" rx="0.5" />
          </svg>
          <span className="text-orange-500 font-black text-5xl leading-none">h</span>
        </div>
        <span style={{ color: '#6b7280' }} className="font-bold text-lg leading-none">anap.ph</span>
      </div>
      <p className="text-white font-semibold text-xl mb-10 -mt-6">Taskers</p>

      <div className="flex items-center justify-center gap-6">

        <button
          onClick={() => slide('left')}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl flex-shrink-0 z-10"
        >
          ←
        </button>

        <div className="flex items-center justify-center gap-8 w-full max-w-4xl overflow-hidden">
          {getVisible().map(({ tasker, position }, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
              style={{
                width: position === 'center' ? '32%' : '27%',
                opacity: position === 'center' ? 1 : 0.6,
                transform: `${position === 'center' ? 'scale(1.05)' : 'scale(0.93)'} ${getSlideStyle(position)}`,
                transition: 'transform 0.3s ease, opacity 0.3s ease',
              }}
            >
              <div
                className="bg-gray-600 w-full"
                style={{ height: position === 'center' ? '200px' : '165px' }}
              ></div>
              <div className="p-4 text-left">
                <h3 className="font-bold text-base">{tasker.name}</h3>
                <p className="text-orange-400 text-sm mb-2">{tasker.role}</p>
                <p className="text-yellow-400 text-sm mb-3">
                  ★ {tasker.rating} ({tasker.reviews.toLocaleString()} reviews)
                </p>
                <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-semibold text-sm">
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => slide('right')}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl flex-shrink-0 z-10"
        >
          →
        </button>

      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-8">
        {taskers.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-3 rounded-full transition-all duration-300 ${
              i === index ? 'bg-orange-500 w-6' : 'bg-gray-500 w-3'
            }`}
          />
        ))}
      </div>

      <Link to="/become-a-tasker" className="mt-8 inline-block">
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold">
          Become a Tasker
        </button>
      </Link>

    </div>
  )
}

export default TaskerShowcase