import { useState, useEffect, useRef } from 'react'
import { Users, BadgeCheck, TrendingUp } from 'lucide-react'
import { supabase } from '../supabase'

function useCountUp(target, duration, isVisible) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!isVisible || target === 0) return
    setValue(0)
    const timeoutId = setTimeout(() => {
      const start = performance.now()
      function step(now) {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }, 500)
    return () => {
      clearTimeout(timeoutId)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isVisible, target, duration])

  return value
}

function WhyChooseUs() {
  const features = [
    {
      icon: <Users size={32} className="text-white" />,
      title: "Skilled Professionals",
      description: "100+ trained professionals delivering reliable, high-quality service across all offerings."
    },
    {
      icon: <BadgeCheck size={32} className="text-white" />,
      title: "Quality Work",
      description: "Tasks are completed with precision, care, and consistency, ensuring top-notch service every time."
    },
    {
      icon: <TrendingUp size={32} className="text-white" />,
      title: "Empowering Filipinos",
      description: "We help Filipinos grow their careers by providing training, mentorship, and real-world experience across our services."
    }
  ]

  const [statsData, setStatsData] = useState({ bookings: 0, rating: 0, taskers: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const statsRef = useRef(null)

  useEffect(() => {
    async function fetchStats() {
      const [
        { count: bookings },
        { data: reviews },
        { count: taskers },
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('reviews').select('rating').eq('is_hidden', false).eq('is_flagged', false),
        supabase.from('taskers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      ])

      const avg = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
        : 0

      setStatsData({
        bookings: bookings ?? 0,
        rating: Math.round(avg * 10),   // store as integer (e.g. 47 = 4.7), animate then divide
        taskers: taskers ?? 0,
      })
    }
    fetchStats()
  }, [])

  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const animatedBookings = useCountUp(statsData.bookings, 4000, isVisible)
  const animatedRating   = useCountUp(statsData.rating,   4000, isVisible)   // e.g. 47
  const animatedTaskers  = useCountUp(statsData.taskers,  4000, isVisible)
  const animatedServices = useCountUp(6,                  4000, isVisible)

  const displayRating = (animatedRating / 10).toFixed(1)  // e.g. "4.7"

  return (
    <div className="bg-white py-16 px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <h2 className="text-4xl font-bold mb-12">
          <span className="text-gray-900">Introduction To </span>
          <span className="text-orange-500">Best Services</span>
          <span className="text-gray-900"> Provider.</span>
        </h2>

        {/* Feature Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="border border-gray-300 rounded-lg p-8 text-center hover:shadow-lg transition-shadow"
            >
              {/* Circular Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center">
                  {feature.icon}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Live Stats Row */}
        <div
          ref={statsRef}
          className="mt-10 rounded-xl px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          style={{ backgroundColor: '#ea580c' }}
        >
          <div>
            <div className="flex items-end justify-center gap-1 leading-none">
              <span className="text-3xl md:text-4xl font-bold text-white">{animatedBookings.toLocaleString()}</span>
              <span className="text-2xl text-orange-200 pb-0.5">+</span>
            </div>
            <p className="text-xs md:text-sm text-orange-100 mt-2">Bookings Completed</p>
          </div>

          <div>
            <div className="flex items-end justify-center gap-1 leading-none">
              <span className="text-3xl md:text-4xl font-bold text-white">{displayRating}</span>
              <span className="text-2xl text-orange-200 pb-0.5">★</span>
            </div>
            <p className="text-xs md:text-sm text-orange-100 mt-2">Average Rating</p>
          </div>

          <div>
            <div className="flex items-end justify-center gap-1 leading-none">
              <span className="text-3xl md:text-4xl font-bold text-white">{animatedTaskers.toLocaleString()}</span>
            </div>
            <p className="text-xs md:text-sm text-orange-100 mt-2">Verified Taskers</p>
          </div>

          <div>
            <div className="flex items-end justify-center gap-1 leading-none">
              <span className="text-3xl md:text-4xl font-bold text-white">{animatedServices}</span>
            </div>
            <p className="text-xs md:text-sm text-orange-100 mt-2">Services Available</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhyChooseUs
