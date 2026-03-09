import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../Components/Navbar'
import backgroundImg from '../Assets/Background.jpg'

const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700',
  confirmed:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
}

function ReviewForm({ booking, userId, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('idle')

  async function handleSubmit() {
    if (rating === 0) return
    setStatus('submitting')
    const { error } = await supabase.from('reviews').insert({
      client_id: userId,
      tasker_id: booking.tasker_id,
      booking_id: booking.id,
      rating,
      comment,
      service: booking.service,
    })
    setStatus(error ? 'error' : 'success')
    if (!error) onSuccess()
  }

  if (status === 'success') {
    return <p className="text-sm font-semibold text-green-600 mt-3">Thank you for your review! ⭐</p>
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-600">Leave a Review</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-2xl leading-none transition-colors"
          >
            <span className={(hovered || rating) >= star ? 'text-orange-500' : 'text-gray-300'}>★</span>
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience... (optional)"
        rows={2}
        className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-700 resize-none outline-none focus:border-orange-400"
      />
      {status === 'error' && <p className="text-xs text-red-500">Failed to submit. Please try again.</p>}
      <button
        onClick={handleSubmit}
        disabled={rating === 0 || status === 'submitting'}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  )
}

function BookingCard({ booking, userId, onCancel }) {
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [hasReview, setHasReview] = useState(true)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    setCancelling(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
    setCancelling(false)
    setConfirmCancel(false)
    if (!error) onCancel()
  }

  useEffect(() => {
    if (booking.status !== 'completed') return
    supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasReview(!!data)
      })
  }, [booking.id, booking.status])

  const statusLabel = booking.status?.replace('_', ' ') ?? 'pending'
  const statusClass = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-gray-800 capitalize text-lg">{booking.service}</p>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {[
          ['Tasker',     booking.taskerName ?? '—'],
          ['Date & Time', booking.scheduled_date
            ? `${booking.scheduled_date}${booking.scheduled_time ? ' at ' + booking.scheduled_time : ''}`
            : '—'],
          ['Task Size',  booking.task_size ?? '—'],
          ['Address',    booking.address ?? '—'],
          ['Reference',  booking.reference_number ?? '—'],
        ].map(([label, val]) => (
          <div key={label} className="flex gap-2">
            <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
            <span className="text-gray-700">{val}</span>
          </div>
        ))}
      </div>

      {booking.status === 'pending' && (
        <div className="pt-1">
          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="text-sm font-semibold text-red-500 hover:text-red-600 underline"
            >
              Cancel Booking
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600">Are you sure?</p>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1 rounded-lg transition-colors"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Keep Booking
              </button>
            </div>
          )}
        </div>
      )}

      {booking.status === 'completed' && !hasReview && !reviewSubmitted && (
        <>
          {!showReviewForm ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className="mt-1 text-sm font-semibold text-orange-500 hover:text-orange-600 underline"
            >
              Leave a Review
            </button>
          ) : (
            <ReviewForm
              booking={booking}
              userId={userId}
              onSuccess={() => { setReviewSubmitted(true); setShowReviewForm(false) }}
            />
          )}
        </>
      )}
      {reviewSubmitted && (
        <p className="text-sm font-semibold text-green-600 mt-1">Thank you for your review! ⭐</p>
      )}
    </div>
  )
}

function Dashboard() {
  const [bookings, setBookings] = useState([])
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function load(uid) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', uid)
      .order('created_at', { ascending: false })

    if (error || !data) return

    const taskerIds = [...new Set(data.map((b) => b.tasker_id).filter(Boolean))]
    let taskerMap = {}
    if (taskerIds.length > 0) {
      const { data: taskers } = await supabase
        .from('taskers')
        .select('id, name')
        .in('id', taskerIds)
      taskers?.forEach((t) => { taskerMap[t.id] = t.name })
    }

    setBookings(data.map((b) => ({ ...b, taskerName: taskerMap[b.tasker_id] ?? '—' })))
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }
      const uid = session.user.id
      setUserId(uid)
      await load(uid)
      setLoading(false)
    }
    init()
  }, [])

  return (
    <div
      className="min-h-screen"
      style={{ backgroundImage: `url(${backgroundImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold text-white text-center mb-8 drop-shadow">My Bookings</h1>

        {loading ? (
          <div className="flex justify-center mt-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center space-y-4 mt-20">
            <p className="text-white text-lg font-medium">You have no bookings yet.</p>
            <Link
              to="/#services"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Browse Services
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} userId={userId} onCancel={() => load(userId)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
