import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const FALLBACK_REVIEWS = [
  {
    name: "Danica Flores",
    location: "Manila, PH",
    rating: 5,
    comment: "Vortex Elite is amazing! The cleaning crew arrived on time and did an incredible job. My house has never looked this clean. Highly recommended!",
    service: "Cleaning",
    avatar: "DF",
    time: "",
  },
  {
    name: "Joanna Montanez",
    location: "Quezon City, PH",
    rating: 5,
    comment: "Had a plumbing emergency late at night and they sent someone within the hour. Very professional and fixed the issue quickly. Will definitely use again!",
    service: "Plumbing",
    avatar: "JM",
    time: "",
  },
  {
    name: "Manny John Paul Vargas",
    location: "Makati, PH",
    rating: 5,
    comment: "The electrician was very knowledgeable and explained everything clearly. Fair pricing and excellent work. Vortex Elite is now my go-to for home services!",
    service: "Electrical",
    avatar: "MV",
    time: "",
  },
  {
    name: "Ahron Gainsan",
    location: "Pasig, PH",
    rating: 5,
    comment: "Needed some carpentry work done and the tasker exceeded my expectations. Beautiful craftsmanship and very friendly. 10/10 experience!",
    service: "Carpentry",
    avatar: "AG",
    time: "",
  },
]

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} mo ago`
  return `${Math.floor(diff / 31536000)} yr ago`
}

function Reviews() {
  const [reviews, setReviews] = useState(FALLBACK_REVIEWS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles(full_name), taskers(name, role)')
        .order('created_at', { ascending: false })
        .limit(8)

      if (!error && data) {
        const fetchedReviews = data.map((r) => {
          const fullName = r.profiles?.full_name || 'Anonymous'
          const initials = fullName
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() || '')
            .join('')
          return {
            name: fullName,
            location: '',
            rating: r.rating,
            comment: r.comment || '',
            service: r.service || '',
            avatar: initials,
            time: relativeTime(r.created_at),
          }
        })
        const combined = [...fetchedReviews, ...FALLBACK_REVIEWS]
        setReviews(combined.slice(0, 8))
      }
      setLoading(false)
    }
    fetchReviews()
  }, [])

  return (
    <div className="py-16 px-8 bg-gray-50">

      <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
        What Our Customers Say
      </h2>
      <p className="text-center text-gray-500 mb-12">
        Trusted by thousands of happy homeowners
      </p>

      {loading ? (
        <p className="text-center text-gray-400">Loading reviews...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {reviews.map((review, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">

              <div className="flex gap-1 mb-3">
                {[...Array(review.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-lg">★</span>
                ))}
              </div>

              <p className="text-gray-600 text-sm mb-4">"{review.comment}"</p>

              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
                {review.service}
              </span>

              <div className="flex items-center gap-3 mt-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                  {review.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{review.name}</p>
                  <p className="text-gray-400 text-xs">
                    {review.location || review.time}
                  </p>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default Reviews
