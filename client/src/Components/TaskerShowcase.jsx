import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Tasker1 from '../Assets/Tasker1.jpg'
import Tasker2 from '../Assets/Tasker2.jpg'
import Tasker3 from '../Assets/Tasker3.jpg'
import Tasker4 from '../Assets/Tasker4.jpg'
import Tasker5 from '../Assets/Tasker5.jpg'
import Tasker6 from '../Assets/Tasker6.jpg'
import Tasker7 from '../Assets/Tasker7.jpg'
import Tasker8 from '../Assets/Tasker8.jpg'

const taskerImages = {
  'Tasker1.jpg': Tasker1,
  'Tasker2.jpg': Tasker2,
  'Tasker3.jpg': Tasker3,
  'Tasker4.jpg': Tasker4,
  'Tasker5.jpg': Tasker5,
  'Tasker6.jpg': Tasker6,
  'Tasker7.jpg': Tasker7,
  'Tasker8.jpg': Tasker8,
}

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
          avatar_url: t.avatar_url,
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

  if (!fetchError && taskers.length === 0) {
    return (
      <div
        className="py-16 px-8 text-white text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)' }}
      >
        <div className="flex items-center justify-center gap-1 mb-2">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="absolute left-1/2 -translate-x-1/2" style={{ top: 0 }} width="52" height="26" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="20" y1="2" x2="1" y2="19" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="20" y1="2" x2="39" y2="19" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="26" y="4" width="4" height="7" fill="#6b7280" rx="0.5" />
            </svg>
            <span className="text-orange-500 font-black text-5xl leading-none">h</span>
          </div>
          <span style={{ color: '#6b7280' }} className="font-bold text-lg leading-none">anap.ph</span>
        </div>
        <p className="text-white font-semibold text-xl mb-6 -mt-6">Taskers</p>
        <p className="text-gray-400 mb-8">No taskers available at the moment.</p>
        <Link to="/become-a-tasker">
          <button
            className="text-white px-8 py-3 rounded-lg font-semibold"
            style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)', boxShadow: '0 0 18px rgba(249,115,22,0.4)', border: 'none', cursor: 'pointer' }}
          >
            Become a Tasker
          </button>
        </Link>
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
    <div
      className="py-16 px-8 text-white text-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)' }}
    >
      {/* Logo + heading */}
      <div className="flex items-center justify-center gap-1 mb-2">
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

      <div className="flex items-center justify-center gap-6" style={{ perspective: '1200px' }}>

        <button
          onClick={() => slide('left')}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl flex-shrink-0 z-10"
          style={{ boxShadow: '0 0 14px rgba(249,115,22,0.5)' }}
        >
          ←
        </button>

        <div
          className="flex items-center justify-center gap-8 w-full max-w-4xl overflow-hidden"
          style={{ perspective: '1200px' }}
        >
          {getVisible().filter(({ tasker }) => tasker).map(({ tasker, position }, i) => {
            const isCenter = position === 'center'
            const rotateY = position === 'left' ? 'rotateY(-20deg)' : position === 'right' ? 'rotateY(20deg)' : 'rotateY(0deg)'
            const scale = isCenter ? 'scale(1.05)' : 'scale(0.93)'
            const responsiveClass =
              position === 'left'  ? 'hidden lg:block lg:w-[27%]' :
              position === 'right' ? 'hidden md:block md:w-[50%] lg:w-[27%]' :
                                     'w-full md:w-[50%] lg:w-[32%]'
            return (
              <div
                key={i}
                className={`rounded-xl overflow-hidden flex-shrink-0 ${responsiveClass}`}
                style={{
                  opacity: isCenter ? 1 : 0.6,
                  transform: `${scale} ${rotateY} ${getSlideStyle(position)}`,
                  transition: 'transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease',
                  transformStyle: 'preserve-3d',
                  background: isCenter
                    ? 'linear-gradient(160deg, #1f2937 0%, #111827 100%)'
                    : 'linear-gradient(160deg, #1a1f2b 0%, #0e1117 100%)',
                  border: isCenter
                    ? '1.5px solid rgba(249,115,22,0.3)'
                    : '1.5px solid rgba(255,255,255,0.06)',
                  boxShadow: isCenter
                    ? '0 0 18px rgba(249,115,22,0.25), 0 8px 32px rgba(0,0,0,0.6)'
                    : '0 4px 16px rgba(0,0,0,0.4)',
                }}
              >
                {taskerImages[tasker.avatar_url] ? (
                  <img
                    src={taskerImages[tasker.avatar_url]}
                    alt={tasker.name}
                    className="w-full object-cover"
                    style={{ height: isCenter ? '200px' : '165px' }}
                  />
                ) : (
                  <div style={{
                    height: isCenter ? '200px' : '165px',
                    background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#f97316',
                  }}>
                    {tasker.name?.charAt(0) ?? '?'}
                  </div>
                )}

                <div className="p-4 text-left">
                  <h3 className="font-bold text-base text-white">{tasker.name}</h3>
                  <p className="text-orange-400 text-sm mb-2">{tasker.role}</p>
                  <p className="text-yellow-400 text-sm mb-3">
                    ★ {tasker.rating} ({tasker.reviews.toLocaleString()} reviews)
                  </p>
                  <button
                    className="w-full text-white py-2 rounded-lg font-semibold text-sm"
                    style={{
                      background: 'linear-gradient(90deg, #f97316, #ea580c)',
                      boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    View Profile
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => slide('right')}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl flex-shrink-0 z-10"
          style={{ boxShadow: '0 0 14px rgba(249,115,22,0.5)' }}
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
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: i === index ? '24px' : '12px',
              background: i === index ? '#f97316' : '#4b5563',
              boxShadow: i === index ? '0 0 8px rgba(249,115,22,0.6)' : 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      <Link to="/become-a-tasker" className="mt-8 inline-block">
        <button
          className="text-white px-8 py-3 rounded-lg font-semibold"
          style={{
            background: 'linear-gradient(90deg, #f97316, #ea580c)',
            boxShadow: '0 0 18px rgba(249,115,22,0.4)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Become a Tasker
        </button>
      </Link>

    </div>
  )
}

export default TaskerShowcase