// NOTE: Run this SQL in Supabase if not already done:
// ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { MapPin, Wrench, Camera, MessageSquare, CalendarCheck, Star, UserCog, Headset, LogOut, Menu, X, Home } from 'lucide-react'
import ChatModal from '../Components/ChatModal'

const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700',
  confirmed:   'bg-amber-100 text-amber-700',
  accepted:    'bg-green-100 text-green-700',
  on_the_way:  'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-500',
  rejected:    'bg-red-100 text-red-600',
}

const STATUS_LABELS = {
  confirmed:   'Awaiting Tasker',
  accepted:    'Accepted',
  on_the_way:  'Tasker On The Way',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  rejected:    'Rejected',
}

async function moderateReview(comment) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 10,
        messages: [
          {
            role: 'system',
            content: `You are a content moderator for a Philippine home services app. Analyze the given review comment and respond with ONLY one word: "clean" if the content is appropriate, or "flagged" if it contains any of the following: profanity or swear words in English or Filipino/Tagalog, hate speech or discrimination, threats or violent language, sexually explicit content, spam or gibberish, personal attacks or harassment. Respond with ONLY "clean" or "flagged". Nothing else.`,
          },
          { role: 'user', content: comment },
        ],
      }),
    })
    const data = await response.json()
    const result = data.choices?.[0]?.message?.content?.trim()?.toLowerCase()
    return result === 'flagged' ? 'flagged' : 'clean'
  } catch (error) {
    console.error('Moderation error:', error)
    return 'clean'
  }
}

function ReviewModal({ booking, userId, onClose, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [photos, setPhotos] = useState([])

  async function handleSubmit() {
    if (rating === 0 || !comment.trim()) return
    setStatus('submitting')
    setSubmitMessage('Checking your review...')

    const moderationResult = await moderateReview(comment.trim())
    const isFlagged = moderationResult === 'flagged'

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    let publicUrls = []
    if (photos.length > 0) {
      setSubmitMessage('Uploading photos...')
      for (const file of photos) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${booking.id}_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(fileName, file)
        if (uploadError) { setStatus('error'); setSubmitMessage(''); return }
        const { data } = supabase.storage
          .from('review-images')
          .getPublicUrl(fileName)
        publicUrls.push(data.publicUrl)
      }
    }

    const { error } = await supabase
      .from('reviews')
      .insert({
        client_id: userId,
        reviewer_name: profile?.full_name ?? 'Anonymous',
        tasker_id: booking.tasker_id,
        booking_id: booking.id,
        rating,
        comment: comment.trim(),
        service: booking.service,
        featured: false,
        is_hidden: isFlagged,
        is_flagged: isFlagged,
        images: publicUrls.length > 0 ? publicUrls : null,
      })

    if (error) { setStatus('error'); setSubmitMessage(''); return }
    setStatus('success')
    setSubmitMessage(
      isFlagged
        ? 'Your review has been submitted and is currently under review by our team. It will be published once approved.'
        : 'Your review has been published successfully!'
    )
    setTimeout(() => { onSuccess(); onClose() }, isFlagged ? 3000 : 1200)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
        >
          ✕
        </button>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Rate &amp; Review</h2>
        <p className="text-sm text-gray-500 mb-4">{booking.service} · {booking.taskerName}</p>

        <p className="text-sm font-semibold text-gray-600 mb-2">Your Rating <span className="text-red-400">*</span></p>
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="text-3xl leading-none transition-colors"
            >
              <span className={(hovered || rating) >= star ? 'text-orange-500' : 'text-gray-200'}>★</span>
            </button>
          ))}
        </div>

        <p className="text-sm font-semibold text-gray-600 mb-1">Your Comment <span className="text-red-400">*</span></p>
        <textarea
          value={comment}
          onChange={(e) => { setComment(e.target.value); if (status === 'error') setStatus('idle') }}
          placeholder="Share your experience..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none outline-none focus:border-orange-400 mb-3"
        />

        <div className="mb-3">
          <p className="text-sm font-semibold text-gray-600 mb-2">
            Add Photos <span className="text-xs text-gray-400 font-normal">(optional, max 2)</span>
          </p>
          {photos.length > 0 && (
            <div className="flex gap-2 mb-2">
              {photos.map((file, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 hover:bg-gray-900 text-white rounded-full text-xs flex items-center justify-center leading-none"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 2 && (
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 transition-colors">
              <Camera size={14} />
              Add Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setPhotos((prev) => [...prev, file].slice(0, 2))
                  e.target.value = ''
                }}
              />
            </label>
          )}
        </div>

        {status === 'submitting' && submitMessage && (
          <p className="text-xs text-gray-500 mb-2">{submitMessage}</p>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-500 mb-2">Failed to submit. Please try again.</p>
        )}
        {status === 'success' && (
          <p className="text-sm font-semibold text-green-600 mb-2">{submitMessage}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || !comment.trim() || status === 'submitting' || status === 'success'}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  )
}

function BookingCard({ booking, userId, onCancel }) {
  const navigate = useNavigate()
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [hasReview, setHasReview] = useState(true)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedProposedDate, setSelectedProposedDate] = useState(null)
  const [proposalLoading, setProposalLoading] = useState(null)
  const [toast, setToast] = useState('')

  const proposedDates = (() => {
    try { return JSON.parse(booking.proposed_dates) } catch { return [] }
  })()

  async function handleAcceptProposal() {
    if (!selectedProposedDate) return
    setProposalLoading('accept')
    const dateLabel = `${selectedProposedDate.date}${selectedProposedDate.time ? ' at ' + selectedProposedDate.time : ''}`
    await supabase.from('bookings').update({
      scheduled_date: selectedProposedDate.date,
      scheduled_time: selectedProposedDate.time || null,
      rebook_status: 'accepted',
      status: 'confirmed',
    }).eq('id', booking.id)
    await supabase.from('messages').insert({
      booking_id: booking.id,
      sender_id: userId,
      receiver_id: booking.taskerUserId,
      content: `I have accepted your proposed date: ${dateLabel}. See you then!`,
      is_read: false,
    })
    setProposalLoading(null)
    setToast(`Booking confirmed for ${dateLabel}!`)
    setTimeout(() => setToast(''), 3000)
    onCancel()
  }

  async function handleDeclineProposal() {
    setProposalLoading('decline')
    await supabase.from('bookings').update({
      rebook_status: 'declined',
      status: 'cancelled',
    }).eq('id', booking.id)
    await supabase.from('messages').insert({
      booking_id: booking.id,
      sender_id: userId,
      receiver_id: booking.taskerUserId,
      content: 'I have declined your proposed dates.',
      is_read: false,
    })
    setProposalLoading(null)
    setToast('Proposal declined.')
    setTimeout(() => setToast(''), 3000)
    onCancel()
  }

  useEffect(() => {
    if (booking.status === 'cancelled') return
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', booking.id)
      .eq('receiver_id', userId)
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0))

    const channel = supabase
      .channel(`unread-customer-${booking.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${booking.id}`,
      }, (payload) => {
        if (payload.new.receiver_id === userId && !payload.new.is_read) {
          setUnreadCount((n) => n + 1)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [booking.id, booking.status, userId])

  async function handleCancel() {
    setCancelling(true)
    setCancelError('')
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
    setCancelling(false)
    if (error) {
      setCancelError('Failed to cancel booking. Please try again.')
      return
    }
    setConfirmCancel(false)
    onCancel()
  }

  async function handleRebook() {
    const { data } = await supabase
      .from('taskers')
      .select('id')
      .eq('id', booking.tasker_id)
      .eq('status', 'approved')
      .maybeSingle()
    if (!data) {
      alert('This tasker is no longer available. Please make a new booking.')
      return
    }
    navigate(`/booking/${booking.service}`, {
      state: {
        service: booking.service,
        tasker_id: booking.tasker_id,
        task_options: booking.task_options,
        taskers_needed: booking.taskers_needed,
        is_rebook: true,
        original_booking_id: booking.id,
      },
    })
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

  const statusLabel = STATUS_LABELS[booking.status] ?? (booking.status?.replace('_', ' ') ?? 'pending')
  const statusClass = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending

  return (
    <>
      {showReviewModal && (
        <ReviewModal
          booking={booking}
          userId={userId}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => { setReviewSubmitted(true); setHasReview(true) }}
        />
      )}

      {showChat && booking.taskerUserId && (
        <ChatModal
          bookingId={booking.id}
          currentUserId={userId}
          otherUserId={booking.taskerUserId}
          otherUserName={booking.taskerName}
          onClose={() => { setShowChat(false); setUnreadCount(0) }}
        />
      )}

      {toast && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          {toast}
        </div>
      )}

      {booking.rebook_status === 'proposed' && proposedDates.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">🗓️ Your tasker proposed alternative dates:</p>
          <div className="flex flex-wrap gap-2">
            {proposedDates.map((opt, i) => {
              const isSelected = selectedProposedDate === opt
              return (
                <button
                  key={i}
                  onClick={() => setSelectedProposedDate(opt)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-blue-300 text-blue-700 hover:border-blue-500'
                  }`}
                >
                  {opt.date}{opt.time ? ' at ' + opt.time : ''}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAcceptProposal}
              disabled={!selectedProposedDate || proposalLoading !== null}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white transition-colors"
            >
              {proposalLoading === 'accept' ? 'Confirming…' : 'Accept'}
            </button>
            <button
              onClick={handleDeclineProposal}
              disabled={proposalLoading !== null}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-white border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {proposalLoading === 'decline' ? 'Declining…' : 'Decline'}
            </button>
          </div>
        </div>
      )}

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

        {booking.status === 'on_the_way' && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
            <MapPin size={16} />
            <span>Your tasker is heading to your location</span>
          </div>
        )}

        {booking.status === 'in_progress' && (
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
            <Wrench size={16} />
            <span>Your tasker is currently working</span>
          </div>
        )}

        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <div className="pt-1">
            {!confirmCancel ? (
              <button
                onClick={() => { setConfirmCancel(true); setCancelError('') }}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 px-3 py-1 rounded-lg transition-colors"
              >
                Cancel Booking
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Are you sure you want to cancel this booking? This action cannot be undone.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => { setConfirmCancel(false); setCancelError(''); handleRebook() }}
                    className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    🔄 Rebook Instead
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="text-sm font-semibold text-red-500 hover:text-red-600 border border-red-400 hover:border-red-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                  <button
                    onClick={() => { setConfirmCancel(false); setCancelError('') }}
                    className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Keep Booking
                  </button>
                </div>
                {cancelError && <p className="text-xs text-red-500">{cancelError}</p>}
              </div>
            )}
          </div>
        )}

        {booking.status === 'completed' && (
          <div className="space-y-2 pt-1">
            <p className="text-sm text-gray-500">
              Thank you for using Hanap.ph! We hope you're happy with the service.
              Leave a review to help others find great taskers.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {!hasReview && !reviewSubmitted && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="text-sm font-semibold text-orange-500 hover:text-orange-600 underline"
                >
                  Rate &amp; Review
                </button>
              )}
              {reviewSubmitted && (
                <p className="text-sm font-semibold text-green-600">Thank you for your review! ⭐</p>
              )}
              <button
                onClick={handleRebook}
                className="text-sm font-semibold text-orange-500 hover:text-orange-600 border border-orange-400 hover:border-orange-500 bg-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Rebook
              </button>
            </div>
          </div>
        )}

        {booking.status === 'cancelled' && (
          <div className="pt-1">
            <button
              onClick={handleRebook}
              className="text-sm font-semibold text-orange-500 hover:text-orange-600 border border-orange-400 hover:border-orange-500 bg-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Rebook
            </button>
          </div>
        )}

        {booking.status !== 'cancelled' && booking.taskerUserId && (
          <div className="pt-1">
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-600 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors relative"
            >
              <MessageSquare size={15} />
              Message Tasker
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── My Reviews Tab ──────────────────────────────────────────────────────────

function ReviewStars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className={`w-4 h-4 ${s <= rating ? 'text-orange-400' : 'text-gray-200'}`}>
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  )
}

function CustomerReviews({ userId }) {
  const [reviews, setReviews] = useState([])
  const [revLoading, setRevLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    async function fetchReviews() {
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('id, booking_id, tasker_id, rating, comment, images, created_at')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })

      if (!reviewRows || reviewRows.length === 0) {
        setRevLoading(false)
        return
      }

      // Fetch tasker names + photos
      const taskerIds = [...new Set(reviewRows.map((r) => r.tasker_id).filter(Boolean))]
      let taskerMap = {}
      if (taskerIds.length > 0) {
        const { data: taskers } = await supabase
          .from('taskers')
          .select('id, name, profile_photo')
          .in('id', taskerIds)
        ;(taskers ?? []).forEach((t) => {
          const photo = t.profile_photo
            ? (t.profile_photo.startsWith('http')
                ? t.profile_photo
                : supabase.storage.from('tasker-files').getPublicUrl(t.profile_photo).data.publicUrl)
            : null
          taskerMap[t.id] = { name: t.name, photo }
        })
      }

      // Fetch service types from bookings
      const bookingIds = [...new Set(reviewRows.map((r) => r.booking_id).filter(Boolean))]
      let serviceMap = {}
      if (bookingIds.length > 0) {
        const { data: bkgs } = await supabase
          .from('bookings')
          .select('id, service')
          .in('id', bookingIds)
        ;(bkgs ?? []).forEach((b) => { serviceMap[b.id] = b.service })
      }

      setReviews(reviewRows.map((r) => ({
        ...r,
        taskerName: taskerMap[r.tasker_id]?.name ?? 'Unknown Tasker',
        taskerPhoto: taskerMap[r.tasker_id]?.photo ?? null,
        service: serviceMap[r.booking_id] ?? '—',
      })))
      setRevLoading(false)
    }
    fetchReviews()
  }, [userId])

  if (revLoading) {
    return (
      <div className="flex justify-center mt-20">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 gap-4 text-center">
        <p className="text-gray-400 text-base font-medium">
          You haven't written any reviews yet.<br />Complete a booking to leave a review!
        </p>
        <Link
          to="/"
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          Browse Services
        </Link>
      </div>
    )
  }

  const avg = reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length

  return (
    <div className="space-y-5">

      {/* Section 1 — Summary */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-6 flex-wrap">
        <div className="flex flex-col items-center">
          <p className="text-4xl font-extrabold text-gray-800 leading-none">{avg.toFixed(1)}</p>
          <ReviewStars rating={Math.round(avg)} />
          <p className="text-xs text-gray-400 mt-1">avg rating given</p>
        </div>
        <div className="h-12 w-px bg-gray-100 hidden sm:block" />
        <div className="flex flex-col items-center">
          <p className="text-4xl font-extrabold text-orange-500 leading-none">{reviews.length}</p>
          <p className="text-xs text-gray-400 mt-1">review{reviews.length !== 1 ? 's' : ''} written</p>
        </div>
      </div>

      {/* Section 2 — Review Cards */}
      <div className="space-y-4">
        {reviews.map((r) => {
          const images = (() => {
            if (!r.images) return []
            if (Array.isArray(r.images)) return r.images
            try { return JSON.parse(r.images) } catch { return [] }
          })()
          const dateStr = r.created_at
            ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
            : '—'

          return (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                {r.taskerPhoto ? (
                  <img src={r.taskerPhoto} alt={r.taskerName}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-500">{(r.taskerName[0] ?? '?').toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm leading-tight">{r.taskerName}</p>
                  <p className="text-xs text-gray-400 capitalize">{r.service}</p>
                </div>
                <p className="text-xs text-gray-400 ml-auto flex-shrink-0">{dateStr}</p>
              </div>

              {/* Stars */}
              <ReviewStars rating={r.rating ?? 0} />

              {/* Comment */}
              {r.comment && (
                <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
              )}

              {/* Images */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((src, i) => (
                    <img key={i} src={src} alt={`Review photo ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}

// ─── Navigation ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'bookings', label: 'My Bookings',     icon: CalendarCheck },
  { key: 'reviews',  label: 'My Reviews',      icon: Star },
  { key: 'profile',  label: 'Profile Settings',icon: UserCog },
  { key: 'support',  label: 'Contact Support', icon: Headset },
]

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function CustomerSidebar({ tab, setTab, customerName, customerEmail, onLogout, onClose }) {
  return (
    <div className="w-[260px] min-h-screen bg-orange-500 flex flex-col">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-orange-400">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden mr-1 p-1 rounded-lg text-white/70 hover:text-white hover:bg-orange-600 transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          )}
          <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
            <svg
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: 0 }}
              width="40"
              height="20"
              viewBox="0 0 40 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="20" y1="2" x2="1" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="20" y1="2" x2="39" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="26" y="4" width="4" height="7" fill="white" rx="0.5" />
            </svg>
            <span className="text-white font-black text-3xl leading-none">h</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Hanap.ph</p>
            <p className="text-orange-200 text-xs">My Account</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); onClose?.() }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              tab === key
                ? 'bg-white text-orange-600'
                : 'text-white hover:bg-orange-600'
            }`}
          >
            <Icon size={17} className="flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pt-4 pb-6 border-t border-orange-400">
        {(customerName || customerEmail) && (
          <div className="px-4 mb-2">
            {customerName && <p className="text-white text-xs font-semibold truncate">{customerName}</p>}
            {customerEmail && <p className="text-orange-200 text-xs truncate">{customerEmail}</p>}
          </div>
        )}
        <Link
          to="/"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/80 hover:bg-orange-600 hover:text-white transition-colors"
        >
          <Home size={17} className="flex-shrink-0" />
          Back to Home
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-200 hover:bg-orange-600 hover:text-white transition-colors"
        >
          <LogOut size={17} className="flex-shrink-0" />
          Logout
        </button>
      </div>

    </div>
  )
}

// ─── Profile Settings Tab ─────────────────────────────────────────────────────

function CustomerProfile({ userId, userEmail }) {
  const [profile, setProfile] = useState(null)
  const [profLoading, setProfLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null) // { type: 'success'|'error', msg: string }

  useEffect(() => {
    if (!userId) return
    async function fetchProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url, address, created_at')
        .eq('id', userId)
        .single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
        setPhone(data.phone ?? '')
        setAddress(data.address ?? '')
        setAvatarUrl(data.avatar_url ?? null)
      }
      setProfLoading(false)
    }
    fetchProfile()
  }, [userId])

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `customer-${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setUploading(false)
      showToast('error', 'Photo upload failed. Please try again.')
      return
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
    setAvatarUrl(publicUrl)
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim(), address: address.trim() })
      .eq('id', userId)
    setSaving(false)
    if (error) {
      showToast('error', 'Failed to save changes. Please try again.')
    } else {
      showToast('success', 'Profile updated successfully!')
    }
  }

  if (profLoading) {
    return (
      <div className="flex justify-center mt-20">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const initials = (fullName || userEmail || '?')[0].toUpperCase()
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
    : '—'

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Section 1 — Avatar */}
      <div className="bg-white rounded-2xl shadow-sm p-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f3f4f6' }}
            />
          ) : (
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#f3f4f6', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f97316' }}>{initials}</span>
            </div>
          )}
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <label className={`cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
          uploading
            ? 'opacity-50 pointer-events-none border-gray-200 text-gray-400'
            : 'border-orange-400 text-orange-500 hover:bg-orange-50'
        }`}>
          {uploading ? 'Uploading…' : 'Upload Photo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Section 2 — Personal Information */}
      <div className="bg-white rounded-2xl shadow-sm p-6 pl-8">
        <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-4">Personal Information</h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem 2rem' }}>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 09171234567"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input
              type="text"
              value={userEmail}
              readOnly
              className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Your address"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Joined Date — full width */}
          <div style={{ gridColumn: 'span 2' }}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Member Since</label>
            <input
              type="text"
              value={joinedDate}
              readOnly
              className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
          </div>

        </div>
      </div>

      {/* Section 3 — Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

    </div>
  )
}

// ─── Coming Soon placeholder ──────────────────────────────────────────────────

function CustomerComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">This section is under construction.</p>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function Dashboard() {
  const [tab, setTab] = useState('bookings')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bookings, setBookings] = useState([])
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
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
        .select('id, name, user_id')
        .in('id', taskerIds)
      taskers?.forEach((t) => { taskerMap[t.id] = { name: t.name, user_id: t.user_id } })
    }

    setBookings(data.map((b) => ({
      ...b,
      taskerName: taskerMap[b.tasker_id]?.name ?? '—',
      taskerUserId: taskerMap[b.tasker_id]?.user_id ?? null,
    })))
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)
      setCustomerEmail(session.user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', uid)
        .single()
      setCustomerName(profile?.full_name ?? '')
      await load(uid)
      setLoading(false)
    }
    init()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const activeLabel = NAV_ITEMS.find((n) => n.key === tab)?.label ?? 'My Bookings'

  return (
    <div className="flex min-h-screen">

      {/* Desktop sidebar — fixed */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-30 overflow-y-auto">
        <CustomerSidebar
          tab={tab}
          setTab={setTab}
          customerName={customerName}
          customerEmail={customerEmail}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 left-0 h-screen z-40 md:hidden overflow-y-auto">
            <CustomerSidebar
              tab={tab}
              setTab={setTab}
              customerName={customerName}
              customerEmail={customerEmail}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 md:ml-[260px] bg-gray-50 min-h-screen">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <p className="font-semibold text-gray-800 text-sm flex-1">{activeLabel}</p>
          <Link to="/" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Home size={20} />
          </Link>
        </div>

        <div className="p-4 sm:p-6">

          {tab === 'bookings' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">My Bookings</h2>
              {loading ? (
                <div className="flex justify-center mt-20">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center space-y-4 mt-20">
                  <p className="text-gray-400 text-lg font-medium">You have no bookings yet.</p>
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
            </>
          )}

          {tab === 'reviews' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">My Reviews</h2>
              <CustomerReviews userId={userId} />
            </>
          )}

          {tab === 'profile' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Profile Settings</h2>
              <CustomerProfile userId={userId} userEmail={customerEmail} />
            </>
          )}

          {tab === 'support' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Contact Support</h2>
              <CustomerComingSoon />
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default Dashboard
