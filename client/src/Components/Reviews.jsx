import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Reviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(5)
      setReviews(data ?? [])
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
        <div className="flex justify-center mt-8">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-gray-400 mt-8">No reviews yet. Be the first to review!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {reviews.map((review) => {
            const name = review.reviewer_name ?? review.profiles?.full_name ?? 'Anonymous'
            const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={review.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex gap-1 mb-3">
                  {[...Array(review.rating ?? 5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-600 text-sm mb-4">"{review.comment}"</p>
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
                  {review.service}
                </span>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{name}</p>
                    <p className="text-gray-400 text-xs">{review.location ?? 'Philippines'}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Reviews
