// NOTE: Run this SQL in Supabase if not already done:
// ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { MapPin, Wrench, Camera, MessageSquare, CalendarCheck, Star, UserCog, Headset, LogOut, Menu, X, Home, Package, XCircle, CreditCard, RefreshCw, AlertTriangle, MessageCircle, Send, Bot, Bell, Wallet } from 'lucide-react'
import ChatModal from '../Components/ChatModal'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700',
  confirmed:   'bg-amber-100 text-amber-700',
  accepted:    'bg-green-100 text-green-700',
  on_the_way:  'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  rejected:    'bg-red-100 text-red-600',
}

const STATUS_LABELS = {
  confirmed:   'Awaiting Tasker',
  accepted:    'Accepted',
  on_the_way:  'Tasker On The Way',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  rejected:    'Rejected by Tasker',
}

function timeAgo(dateString) {
  if (!dateString) return ''
  const diff = Date.now() - new Date(dateString).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
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

    const { data: taskerData } = await supabase
      .from('taskers')
      .select('user_id')
      .eq('id', booking.tasker_id)
      .single()

    if (taskerData?.user_id) {
      await supabase.from('notifications').insert({
        user_id: taskerData.user_id,
        title: 'New Review Received',
        message: 'A customer has left you a review!',
        is_read: false,
      })
    }

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

// ─── Track Tasker Map ────────────────────────────────────────────────────────

function LiveMapContent({ taskerPos, customerPos }) {
  const map = useMap()
  const taskerMarkerRef = useRef(null)
  const customerMarkerRef = useRef(null)
  const polylineRef = useRef(null)

  useEffect(() => {
    if (!customerPos) return

    // Customer (house) marker — orange house emoji
    if (!customerMarkerRef.current) {
      const icon = L.divIcon({ html: '🏠', className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
      customerMarkerRef.current = L.marker(customerPos, { icon }).addTo(map)
        .bindPopup('Your location')
    }

    // Tasker (red circle) marker
    if (taskerPos) {
      if (!taskerMarkerRef.current) {
        const icon = L.divIcon({
          html: '<div style="width:16px;height:16px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
        taskerMarkerRef.current = L.marker(taskerPos, { icon }).addTo(map)
          .bindPopup('Tasker location')
      } else {
        taskerMarkerRef.current.setLatLng(taskerPos)
      }

      // Polyline
      if (!polylineRef.current) {
        polylineRef.current = L.polyline([taskerPos, customerPos], { color: '#f97316', weight: 3, dashArray: '6,6' }).addTo(map)
      } else {
        polylineRef.current.setLatLngs([taskerPos, customerPos])
      }

      map.fitBounds([taskerPos, customerPos], { padding: [50, 50] })
    } else {
      map.setView(customerPos, 15)
    }
  }, [taskerPos, customerPos])

  return null
}

function TrackTaskerModal({ booking, onClose, onArrived }) {
  const [customerPos, setCustomerPos] = useState(null)
  const [taskerPos, setTaskerPos] = useState(
    booking.tasker_lat && booking.tasker_lng
      ? [Number(booking.tasker_lat), Number(booking.tasker_lng)]
      : null
  )

  // Geocode customer address
  useEffect(() => {
    if (!booking.address) return
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(booking.address)}&countrycodes=ph`)
      .then(r => r.json())
      .then(data => {
        if (data?.length > 0) setCustomerPos([parseFloat(data[0].lat), parseFloat(data[0].lon)])
      })
      .catch(() => {})
  }, [booking.address])

  // Realtime: live tasker location + status change to in_progress
  useEffect(() => {
    const locationChannel = supabase
      .channel(`tasker-location-${booking.id}`)
      .on('broadcast', { event: 'location' }, ({ payload }) => {
        if (payload?.lat && payload?.lng) setTaskerPos([payload.lat, payload.lng])
      })
      .subscribe()

    const statusChannel = supabase
      .channel(`track-booking-status-${booking.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${booking.id}`,
      }, (payload) => {
        if (payload.new?.status === 'in_progress') {
          onArrived()
          onClose()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(locationChannel)
      supabase.removeChannel(statusChannel)
    }
  }, [booking.id])

  const mapCenter = taskerPos ?? customerPos ?? [14.5995, 120.9842]

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000 }}
        onClick={onClose}
      />
      {/* Modal */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div
          style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: '520px', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontWeight: 700, fontSize: '16px', color: '#1f2937' }}>
              🔴 {booking.taskerName ?? 'Your tasker'} is on the way!
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
              Live location updates automatically
            </p>
          </div>

          {/* Map */}
          <div style={{ height: '340px', position: 'relative' }}>
            {!customerPos && !taskerPos ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', flexDirection: 'column', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', border: '4px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>Locating positions…</p>
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <LiveMapContent taskerPos={taskerPos} customerPos={customerPos} />
              </MapContainer>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', borderTop: '1px solid #f3f4f6', fontSize: '12px', color: '#6b7280' }}>
            <span>🔴 Tasker</span>
            <span>🏠 Your location</span>
            {!taskerPos && <span style={{ color: '#f97316' }}>Waiting for tasker to start sharing…</span>}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6' }}>
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', color: '#374151', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const CANCEL_REASONS = [
  'I made a mistake in my booking',
  'I found another service provider',
  'The schedule doesn\'t work anymore',
  'It\'s taking too long to get a tasker',
  'I no longer need the service',
  'Other',
]

function CancelBookingModal({ onClose, onConfirm, cancelling, cancelError }) {
  const [screen, setScreen] = useState(1)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  const isOther = reason === 'Other'
  const canConfirm = reason !== '' && (!isOther || note.trim() !== '')

  function handleConfirm() {
    if (isOther && !note.trim()) {
      setNoteError('Please describe your reason since you selected "Other".')
      return
    }
    setNoteError('')
    onConfirm(reason, note)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">

        {/* ── Screen 1 — Warning ── */}
        {screen === 1 && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="text-5xl mb-4">💰</div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Cancelling your booking?</h2>
              <p className="text-sm text-gray-600 mb-2">
                Your payment will be refunded to your Hanap.ph E-Wallet instantly.
              </p>
              <p className="text-sm text-green-600 font-medium mb-1">
                💰 You can use your wallet balance on your next booking.
              </p>
              <p className="text-sm text-amber-600 font-medium">
                ⚠️ This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => setScreen(2)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                Continue to Cancel
              </button>
            </div>
          </>
        )}

        {/* ── Screen 2 — Reason ── */}
        {screen === 2 && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Why are you cancelling?</h2>

            <div className="space-y-2 mb-4">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => { setReason(r); setNoteError('') }}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-gray-700">{r}</span>
                </label>
              ))}
            </div>

            <p className="text-sm font-semibold text-gray-600 mb-1">
              Additional message{' '}
              {isOther
                ? <span className="text-red-400">*</span>
                : <span className="text-gray-400 font-normal">(optional)</span>}
            </p>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); if (noteError) setNoteError('') }}
              placeholder="Share any additional details..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none outline-none focus:border-orange-400 mb-1"
            />

            {noteError && <p className="text-xs text-red-500 mt-1 mb-2">{noteError}</p>}
            {cancelError && <p className="text-xs text-red-500 mb-2">{cancelError}</p>}

            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setScreen(1)}
                className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm || cancelling}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

function BookingCard({ booking, userId, onCancel }) {
  const navigate = useNavigate()
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [hasReview, setHasReview] = useState(true)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedProposedDate, setSelectedProposedDate] = useState(null)
  const [proposalLoading, setProposalLoading] = useState(null)
  const [toast, setToast] = useState('')
  const [showTrackModal, setShowTrackModal] = useState(false)

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

  async function handleCancel(reason, note) {
    setCancelling(true)
    setCancelError('')
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancellation_note: note || null,
      })
      .eq('id', booking.id)
    if (error) {
      setCancelling(false)
      setCancelError('Failed to cancel booking. Please try again.')
      return
    }
    if (booking.taskerUserId) {
      await supabase.from('notifications').insert({
        user_id: booking.taskerUserId,
        title: 'Booking Cancelled',
        message: `A customer has cancelled their booking. Reason: ${reason}`,
        is_read: false,
      })
    }

    const refundAmount = Number(booking.estimated_total) || 0
    if (refundAmount > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single()
      const currentBalance = Number(profileData?.wallet_balance) || 0
      await supabase
        .from('profiles')
        .update({ wallet_balance: currentBalance + refundAmount })
        .eq('id', userId)

      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        booking_id: booking.id,
        amount: refundAmount,
        type: 'credit',
        description: `Refund for cancelled booking #${booking.reference_number ?? booking.id}`,
      })

      setToast(`Booking cancelled. ₱${refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been added to your Hanap.ph wallet.`)
      setTimeout(() => setToast(''), 4000)
    }

    setCancelling(false)
    setShowCancelModal(false)
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
      {showCancelModal && (
        <CancelBookingModal
          onClose={() => { setShowCancelModal(false); setCancelError('') }}
          onConfirm={handleCancel}
          cancelling={cancelling}
          cancelError={cancelError}
        />
      )}

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

      {showTrackModal && (
        <TrackTaskerModal
          booking={booking}
          onClose={() => setShowTrackModal(false)}
          onArrived={() => {
            setToast('Your tasker has arrived!')
            setTimeout(() => setToast(''), 4000)
          }}
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
            ['Date & Time', (() => {
              if (!booking.scheduled_date) return '—'
              const d = new Date(booking.scheduled_date + 'T00:00:00')
              const datePart = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              if (!booking.scheduled_time) return datePart
              const [h, m] = booking.scheduled_time.split(':')
              const t = new Date(); t.setHours(+h, +m)
              return `${datePart} at ${t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
            })()],
            ['Task Size',  booking.task_size ?? '—'],
            ['Address',    booking.address ?? '—'],
            ['Booked on',  booking.created_at
              ? new Date(booking.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
                ' At ' +
                new Date(booking.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              : '—'],
            ['Reference',  booking.reference_number ?? '—'],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
              <span className="text-gray-700">{val}</span>
            </div>
          ))}
        </div>

        {booking.status === 'on_the_way' && (
          <div className="flex items-center justify-between gap-3 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2 flex-wrap">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>Your tasker is heading to your location</span>
            </div>
            <button
              onClick={() => setShowTrackModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 border border-orange-400 hover:bg-orange-50 px-3 py-1 rounded-lg transition-colors flex-shrink-0"
            >
              <MapPin size={13} />
              Track Tasker
            </button>
          </div>
        )}

        {booking.status === 'in_progress' && (
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
            <Wrench size={16} />
            <span>Your tasker is currently working</span>
          </div>
        )}

        {booking.status === 'confirmed' && (
          <div className="pt-1">
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-sm font-semibold text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 px-3 py-1 rounded-lg transition-colors"
            >
              Cancel Booking
            </button>
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
            </div>
          </div>
        )}

        {booking.status === 'cancelled' && (
          <div className="space-y-2 pt-1">
            {booking.cancellation_reason && (
              <div className="text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 space-y-1">
                <p className="text-gray-700">❌ <span className="font-medium">Reason:</span> {booking.cancellation_reason}</p>
                {booking.cancellation_note && (
                  <p className="text-gray-700">📝 <span className="font-medium">Note:</span> {booking.cancellation_note}</p>
                )}
              </div>
            )}
            <button
              onClick={handleRebook}
              className="text-sm font-semibold text-orange-500 hover:text-orange-600 border border-orange-400 hover:border-orange-500 bg-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Rebook
            </button>
          </div>
        )}

        {booking.status === 'rejected' && (
          <div className="space-y-2 pt-1">
            {booking.rejection_reason && (
              <div className="text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 space-y-1">
                <p className="text-gray-700">❌ <span className="font-medium">Reason:</span> {booking.rejection_reason}</p>
                {booking.rejection_note && (
                  <p className="text-gray-700">📝 <span className="font-medium">Note:</span> {booking.rejection_note}</p>
                )}
              </div>
            )}
            <button
              onClick={handleRebook}
              className="text-sm font-semibold text-orange-500 hover:text-orange-600 border border-orange-400 hover:border-orange-500 bg-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Rebook
            </button>
          </div>
        )}

        {booking.status !== 'cancelled' && booking.status !== 'rejected' && booking.taskerUserId && (
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
  { key: 'notifications',  label: 'Notifications',     icon: Bell },
  { key: 'bookings',       label: 'My Bookings',       icon: CalendarCheck },
  { key: 'wallet',         label: 'E-Wallet',          icon: Wallet },
  { key: 'reviews',        label: 'My Reviews',        icon: Star },
  { key: 'profile',        label: 'Profile Settings',  icon: UserCog },
  { key: 'support',        label: 'Contact Support',   icon: Headset },
]

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function CustomerSidebar({ tab, setTab, customerName, customerEmail, onLogout, onClose, unreadNotifCount = 0 }) {
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
            <span className="flex-1">{label}</span>
            {key === 'notifications' && unreadNotifCount > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
              </span>
            )}
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
    const path = `customer-avatars/${userId}/avatar`
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
    showToast('success', 'Profile photo updated!')
  }

  async function handleRemoveAvatar() {
    const path = `customer-avatars/${userId}/avatar`
    await supabase.storage.from('avatars').remove([path])
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
    setAvatarUrl(null)
    showToast('success', 'Profile photo removed')
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
          {avatarUrl && !uploading && (
            <button
              onClick={handleRemoveAvatar}
              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}
              title="Remove photo"
            >
              <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>✕</span>
            </button>
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

// ─── Support Inline Chat (customer ↔ admin, no booking) ──────────────────────

function SupportInlineChat({ customerId, adminId, onBack }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .is('booking_id', null)
      .or(`sender_id.eq.${customerId},receiver_id.eq.${customerId}`)
      .order('created_at', { ascending: true })
    setMessages((data ?? []).filter(
      (m) => (m.sender_id === customerId && m.receiver_id === adminId) ||
             (m.sender_id === adminId && m.receiver_id === customerId)
    ))
  }

  useEffect(() => {
    fetchMessages()
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [customerId, adminId])

  useEffect(() => {
    const channel = supabase
      .channel(`support-chat-${customerId}-${adminId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        if (
          msg.booking_id === null &&
          ((msg.sender_id === customerId && msg.receiver_id === adminId) ||
           (msg.sender_id === adminId && msg.receiver_id === customerId))
        ) {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
          if (msg.receiver_id === customerId) {
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [customerId, adminId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    await supabase.from('messages').insert({
      booking_id: null,
      sender_id: customerId,
      receiver_id: adminId,
      content: text,
      is_read: false,
    })
    setSending(false)
    inputRef.current?.focus()
  }

  const fmtTime = (iso) => iso
    ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''

  return (
    <div className="support-chat-box">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem', padding: '4px 6px', lineHeight: 1, flexShrink: 0 }}>←</button>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageCircle size={17} color="#f97316" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '0.875rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Admin Support</p>
          <p style={{ fontSize: '0.68rem', color: '#9ca3af', margin: 0 }}>Hanap.ph Support Team</p>
        </div>
      </div>

      {/* Intro message */}
      <div className="mx-4 mt-4 mb-2 bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm">
        <p className="font-semibold text-gray-800 mb-1">👋 You're connected with Hanap.ph Support</p>
        <p className="text-gray-600">Please describe your concern and our team will get back to you as soon as possible.</p>
        <p className="text-xs text-gray-400 mt-2">For urgent matters, expect a response within 24 hours.</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center' }}>No messages yet.<br />Send a message to get help!</p>
          </div>
        ) : messages.map((msg) => {
          const isMine = msg.sender_id === customerId
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '82%' }}>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMine ? '#f97316' : '#f3f4f6',
                  color: isMine ? '#fff' : '#1f2937',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
                <p style={{ fontSize: '0.62rem', color: '#9ca3af', marginTop: '3px', textAlign: isMine ? 'right' : 'left' }}>
                  {fmtTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px', flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a message..."
          style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '10px', padding: '9px 12px', fontSize: '16px', outline: 'none', color: '#1f2937', minWidth: 0 }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{ background: input.trim() && !sending ? '#f97316' : '#e5e7eb', border: 'none', borderRadius: '10px', padding: '9px 14px', cursor: input.trim() && !sending ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Send size={16} color={input.trim() && !sending ? '#fff' : '#9ca3af'} />
        </button>
      </div>
    </div>
  )
}

// ─── Support AI Chat ──────────────────────────────────────────────────────────

const AI_RESPONSES = {
  'Track my Booking': 'You can track your booking status in the My Bookings tab. Your booking will show its current status: Pending, Accepted, On The Way, In Progress or Completed.',
  'Cancel a Booking': 'You can cancel a booking from the My Bookings tab. Click on your booking and select Cancel Booking. Note: cancellations may be subject to our cancellation policy.',
  'Payment Issue': 'For payment concerns, please provide your booking reference number and describe the issue. Our team will review it within 24 hours.',
  'Review Issue': 'Reviews can be submitted after a booking is completed. If you have an issue with an existing review, please describe it below and we\'ll look into it.',
  'Rebooking Help': 'You can rebook a completed or cancelled booking from the My Bookings tab. Click the Rebook button on the booking card to get started.',
  'Report a Tasker': 'We take tasker conduct seriously. Please describe the incident below including your booking reference number and we\'ll investigate within 48 hours.',
}

function SupportAIChat({ topic, onBack, onTalkToAdmin }) {
  const [messages, setMessages] = useState([
    { role: 'bot', content: AI_RESPONSES[topic] }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  async function handleSend() {
    const text = input.trim()
    if (!text || thinking) return
    setInput('')
    const updated = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setThinking(true)
    try {
      const history = updated.map((m) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      }))
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 200,
          messages: [
            { role: 'system', content: `You are a helpful customer support assistant for Hanap.ph, a home services platform in the Philippines. Help customers with their questions about bookings, payments, taskers, and services. Be concise, friendly and helpful.

QUICK REPLY RESPONSES:
When a customer selects one of these quick reply topics, respond accordingly:

"Track my Booking":
- Tell the customer to go to the "My Bookings" tab in their dashboard
- Explain the booking status flow: pending_payment → confirmed → accepted → on_the_way → in_progress → completed
- Each status means: confirmed = payment received, accepted = tasker accepted the job, on_the_way = tasker is coming, in_progress = work has started, completed = job done
- They also receive real-time notifications for every status change

"Cancel a Booking":
- Tell the customer they can cancel by clicking the "Cancel Booking" button on their booking card in the "My Bookings" tab
- Only bookings that are still pending or confirmed can be cancelled
- Once a tasker is on the way or has started, cancellation may not be possible
- For special cases, they should use "Talk to Admin"

"Payment Issue":
- Ask them to check their GCash or PayMaya transaction history for the reference number
- The reference number starts with VE- and can be found in their booking card
- If the payment was deducted but booking is not confirmed, tell them to contact admin via "Talk to Admin" with their reference number
- Payment is processed securely by PayMongo

"Review Issue":
- Reviews can only be submitted after a booking is marked as completed
- They can leave a review from the "My Bookings" tab by clicking the review button on a completed booking
- Reviews are moderated for appropriate content
- If they cannot see the review button, the booking may not be completed yet

"Rebooking Help":
- Customers can rebook a previous service directly from their "My Bookings" tab
- Click the "Rebook" button on any completed or cancelled booking
- The system will pre-fill their previous task details and they just need to select a new date and tasker
- Pricing remains the same as the original booking

"Report a Tasker":
- Take this seriously and respond with empathy
- Ask the customer to describe what happened
- Remind them their concern will be handled professionally
- Direct them to click "Talk to Admin" to escalate the issue directly to the Hanap.ph team
- Assure them that Hanap.ph takes tasker conduct seriously` },
            ...history,
          ],
        }),
      })
      const json = await res.json()
      const reply = json.choices?.[0]?.message?.content?.trim() ?? 'Sorry, I couldn\'t get a response. Please try again or talk to an admin.'
      setMessages((prev) => [...prev, { role: 'bot', content: reply }])
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', content: 'Something went wrong. Please try again or contact admin support.' }])
    }
    setThinking(false)
  }

  return (
    <div className="support-chat-box">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem', padding: '4px 6px', lineHeight: 1, flexShrink: 0 }}>←</button>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot size={17} color="#f97316" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '0.875rem', margin: 0 }}>Hanap.ph Assistant</p>
          <p style={{ fontSize: '0.68rem', color: '#9ca3af', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Topic: {topic}</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', WebkitOverflowScrolling: 'touch' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '7px', alignItems: 'flex-end' }}>
            {msg.role === 'bot' && (
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={13} color="#f97316" />
              </div>
            )}
            <div style={{
              maxWidth: '82%',
              padding: '8px 12px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#f97316' : '#f3f4f6',
              color: msg.role === 'user' ? '#fff' : '#1f2937',
              fontSize: '0.85rem',
              lineHeight: 1.55,
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '7px' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={13} color="#f97316" />
            </div>
            <div style={{ padding: '9px 13px', borderRadius: '16px 16px 16px 4px', background: '#f3f4f6', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0,1,2].map((j) => (
                <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af', animation: `bounce 1.2s ease-in-out ${j * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px', flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a follow-up..."
          style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '10px', padding: '9px 12px', fontSize: '16px', outline: 'none', color: '#1f2937', minWidth: 0 }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || thinking}
          style={{ background: input.trim() && !thinking ? '#f97316' : '#e5e7eb', border: 'none', borderRadius: '10px', padding: '9px 14px', cursor: input.trim() && !thinking ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Send size={16} color={input.trim() && !thinking ? '#fff' : '#9ca3af'} />
        </button>
      </div>

      {/* Escalation */}
      <div style={{ padding: '0 12px 12px', flexShrink: 0 }}>
        <button
          onClick={onTalkToAdmin}
          style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #fdba74', background: '#fff7ed', color: '#f97316', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <MessageCircle size={13} /> Still need help? Talk to Admin
        </button>
      </div>
    </div>
  )
}

// ─── Customer Support Tab ─────────────────────────────────────────────────────

const SUPPORT_TOPICS = [
  { key: 'Track my Booking',  icon: Package,       label: 'Track my Booking' },
  { key: 'Cancel a Booking',  icon: XCircle,        label: 'Cancel a Booking' },
  { key: 'Payment Issue',     icon: CreditCard,     label: 'Payment Issue' },
  { key: 'Review Issue',      icon: Star,           label: 'Review Issue' },
  { key: 'Rebooking Help',    icon: RefreshCw,      label: 'Rebooking Help' },
  { key: 'Report a Tasker',   icon: AlertTriangle,  label: 'Report a Tasker' },
]

function CustomerSupport({ userId }) {
  const [view, setView] = useState('menu') // 'menu' | 'ai' | 'admin'
  const [topic, setTopic] = useState(null)
  const [adminId, setAdminId] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)

  async function openAdminChat() {
    if (adminId) { setView('admin'); return }
    setAdminLoading(true)
    const { data } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).maybeSingle()
    setAdminId(data?.id ?? null)
    setAdminLoading(false)
    setView('admin')
  }

  function selectTopic(key) {
    setTopic(key)
    setView('ai')
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .support-chat-box {
          display: flex;
          flex-direction: column;
          height: clamp(420px, 62vh, 520px);
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f3f4f6;
          overflow: hidden;
        }
        .support-topic-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .support-topic-btn:active {
          border-color: #f97316;
          box-shadow: 0 0 0 2px rgba(249,115,22,0.12);
        }
        @media (hover: hover) {
          .support-topic-btn:hover {
            border-color: #f97316;
            box-shadow: 0 0 0 2px rgba(249,115,22,0.12);
          }
        }
        @media (max-width: 400px) {
          .support-chat-box {
            height: clamp(380px, 65vh, 460px);
            border-radius: 12px;
          }
          .support-topic-btn {
            padding: 10px;
            gap: 8px;
          }
        }
      `}</style>

      {view === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header card */}
          <div style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', borderRadius: '16px', padding: '20px 16px', color: '#fff', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <Headset size={24} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 5px' }}>How can we help you?</h2>
            <p style={{ fontSize: '0.82rem', opacity: 0.85, margin: 0 }}>Get instant answers or chat with our support team</p>
          </div>

          {/* Quick reply grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
            {SUPPORT_TOPICS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => selectTopic(key)}
                className="support-topic-btn"
              >
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color="#f97316" />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', lineHeight: 1.3, wordBreak: 'break-word' }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Talk to Admin button */}
          <button
            onClick={openAdminChat}
            disabled={adminLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '13px', background: adminLoading ? '#e5e7eb' : '#f97316', border: 'none', borderRadius: '12px', cursor: adminLoading ? 'default' : 'pointer', color: '#fff', fontWeight: 700, fontSize: '0.875rem', touchAction: 'manipulation' }}
          >
            <MessageCircle size={17} />
            {adminLoading ? 'Connecting...' : 'Talk to Admin'}
          </button>
        </div>
      )}

      {view === 'ai' && topic && (
        <SupportAIChat
          topic={topic}
          onBack={() => setView('menu')}
          onTalkToAdmin={openAdminChat}
        />
      )}

      {view === 'admin' && adminId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => setView('menu')}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontWeight: 600, fontSize: '0.85rem', padding: '4px 0', touchAction: 'manipulation' }}
          >
            ← Back to Support Menu
          </button>
          <SupportInlineChat customerId={userId} adminId={adminId} onBack={() => setView('menu')} />
        </div>
      )}

      {view === 'admin' && !adminId && !adminLoading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          <p style={{ fontWeight: 600 }}>Admin not available right now.</p>
          <button onClick={() => setView('menu')} style={{ marginTop: 12, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>← Back</button>
        </div>
      )}
    </div>
  )
}

// ─── E-Wallet Tab ─────────────────────────────────────────────────────────────

function EWalletTab({ userId }) {
  const [balance, setBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    async function fetchWallet() {
      setLoading(true)
      const [{ data: profile }, { data: txns }] = await Promise.all([
        supabase.from('profiles').select('wallet_balance').eq('id', userId).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ])
      setBalance(Number(profile?.wallet_balance) || 0)
      setTransactions(txns ?? [])
      setLoading(false)
    }
    fetchWallet()
  }, [userId])

  const formatAmount = (amount) =>
    Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">E-Wallet</h2>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 mb-6 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-8 h-8 text-white" />
          <p className="text-white font-semibold text-base">Hanap.ph Wallet Balance</p>
        </div>
        {loading ? (
          <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin my-1" />
        ) : (
          <p className="text-white text-4xl font-bold tracking-tight">₱{formatAmount(balance)}</p>
        )}
        <p className="text-orange-100 text-sm mt-2">Use your balance on your next booking</p>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">Transaction History</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No wallet transactions yet. Cancel a booking to receive your refund.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-700 leading-snug">{txn.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(txn.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-sm font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {txn.type === 'credit' ? '+' : '-'}₱{formatAmount(txn.amount)}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${txn.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {txn.type === 'credit' ? 'Credit' : 'Debit'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

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
  const [bookingFilter, setBookingFilter] = useState('all')
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
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

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`customer-bookings-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `client_id=eq.${userId}` },
        () => { load(userId) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    async function fetchNotifications() {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      const rows = data ?? []
      setNotifications(rows)
      setUnreadNotifCount(rows.filter((n) => !n.is_read).length)
    }

    fetchNotifications()

    const channel = supabase
      .channel(`customer-notifications-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => { fetchNotifications() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function markAllNotifsRead() {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadNotifCount(0)
  }

  async function markOneNotifRead(id) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
    )
    setUnreadNotifCount((c) => Math.max(0, c - 1))
  }

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
          unreadNotifCount={unreadNotifCount}
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
              unreadNotifCount={unreadNotifCount}
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
                <>
                  {/* Status filter toggles */}
                  <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                      { value: 'all',         label: 'All' },
                      { value: 'confirmed',   label: 'Pending' },
                      { value: 'accepted',    label: 'Accepted' },
                      { value: 'on_the_way',  label: 'On The Way' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'completed',   label: 'Completed' },
                      { value: 'cancelled',   label: 'Cancelled' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setBookingFilter(value)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                          bookingFilter === value
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-orange-500 border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {(bookingFilter === 'all' ? bookings : bookings.filter((b) => b.status === bookingFilter)).map((booking) => (
                      <BookingCard key={booking.id} booking={booking} userId={userId} onCancel={() => load(userId)} />
                    ))}
                    {bookingFilter !== 'all' && bookings.filter((b) => b.status === bookingFilter).length === 0 && (
                      <p className="text-center text-gray-400 py-10">No bookings with this status.</p>
                    )}
                  </div>
                </>
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

          {tab === 'wallet' && (
            <EWalletTab userId={userId} />
          )}

          {tab === 'support' && (
            <CustomerSupport userId={userId} />
          )}

          {tab === 'notifications' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
                {notifications.some((n) => !n.is_read) && (
                  <button
                    onClick={markAllNotifsRead}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No notifications yet.</p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { if (!n.is_read) markOneNotifRead(n.id) }}
                      className={`w-full text-left rounded-2xl px-4 py-4 border transition-colors ${
                        n.is_read
                          ? 'bg-white border-gray-100 hover:bg-gray-50'
                          : 'bg-orange-50 border-orange-100 hover:bg-orange-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm leading-snug">{n.title}</p>
                          {n.message && (
                            <p className="text-gray-500 text-sm mt-0.5 leading-relaxed">{n.message}</p>
                          )}
                        </div>
                        {!n.is_read && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default Dashboard
