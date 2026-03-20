import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ChevronLeft, ChevronRight, Camera, X } from 'lucide-react'

const PAGE_SIZE = 8

function Lightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-sm font-medium flex items-center gap-1 hover:text-orange-400 transition-colors"
        >
          <X size={18} /> Close
        </button>
        <img
          src={src}
          alt="Review photo"
          className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />
      </div>
    </div>
  )
}

function Reviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedReview, setSelectedReview] = useState(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)

  useEffect(() => {
    async function fetchReviews() {
      // Fetch all non-hidden, non-flagged reviews — featured ones float to the top
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_hidden', false)
        .eq('is_flagged', false)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })

      if (error || !data) { setLoading(false); return }

      setReviews(data)
      setLoading(false)
    }
    fetchReviews()
  }, [])

  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE))
  const pageReviews = reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      {selectedReview && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 py-4"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 sm:p-6 relative overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedReview(null)}
              className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl font-bold rounded-full hover:bg-gray-100 transition-colors"
            >✕</button>

            <div className="flex gap-1 mb-3">
              {[...Array(selectedReview.rating ?? 5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-lg">★</span>
              ))}
            </div>

            <p className="text-gray-700 text-sm mb-4">"{selectedReview.comment}"</p>

            {selectedReview.images?.length === 1 && (
              <div className="block mb-4">
                <img
                  src={selectedReview.images[0]}
                  alt="Review photo"
                  onClick={() => setLightboxSrc(selectedReview.images[0])}
                  className="w-full rounded-xl object-cover max-h-64 hover:opacity-90 transition-opacity cursor-zoom-in"
                />
              </div>
            )}
            {selectedReview.images?.length >= 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {selectedReview.images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="Review photo"
                    onClick={() => setLightboxSrc(url)}
                    className="w-full rounded-xl object-cover max-h-48 hover:opacity-90 transition-opacity cursor-zoom-in"
                  />
                ))}
              </div>
            )}

            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
              {selectedReview.service}
            </span>

            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                {(selectedReview.reviewer_name || 'Anonymous')[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{selectedReview.reviewer_name || 'Anonymous'}</p>
                <p className="text-gray-400 text-xs">{selectedReview.location ?? 'Philippines'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {pageReviews.map((review) => {
                const name = review.reviewer_name || 'Anonymous'
                const initial = name[0]?.toUpperCase() ?? 'A'
                const hasImages = review.images?.length > 0
                return (
                  <div
                    key={review.id}
                    onClick={() => hasImages && setSelectedReview(review)}
                    className={`bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow relative ${hasImages ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex gap-1 mb-3">
                      {[...Array(review.rating ?? 5)].map((_, i) => (
                        <span key={i} className="text-yellow-400 text-lg">★</span>
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">"{review.comment}"</p>
                    {hasImages && (
                      <div className="relative mb-3 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                        <img
                          src={review.images[0]}
                          alt="Review photo"
                          className="w-full object-cover"
                          style={{ maxHeight: '80px' }}
                        />
                        {review.images.length >= 2 && (
                          <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                            +1 more
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
                      {review.service}
                    </span>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                        {initial}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{name}</p>
                        <p className="text-gray-400 text-xs">{review.location ?? 'Philippines'}</p>
                      </div>
                    </div>
                    {hasImages && (
                      <div className="absolute bottom-4 right-4 flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        <Camera size={11} />
                        <span>{review.images.length}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold border border-orange-300 text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold border border-orange-300 text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  )
}

export default Reviews
