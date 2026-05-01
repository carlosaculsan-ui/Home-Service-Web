// NOTE: Run this SQL in Supabase if not already done:
// ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

import { useState, useEffect, useRef, useCallback } from 'react'
import { toPng } from 'html-to-image'
import confetti from 'canvas-confetti'
import gcashLogo from '../Assets/GCash_logo.png'
import mayaLogo from '../Assets/Maya_logo.png'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { MapPin, Wrench, Camera, MessageSquare, CalendarCheck, Star, UserCog, Headset, LogOut, Menu, X, Home, Package, XCircle, CreditCard, RefreshCw, AlertTriangle, MessageCircle, Send, Bot, Bell, Wallet, Info, CheckCircle2, Smile, Trash2 } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import ChatModal from '../Components/ChatModal'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

const STATUS_STYLES = {
  pending:          'bg-yellow-100 text-yellow-700',
  pending_payment:  'bg-pink-100 text-pink-700',
  confirmed:        'bg-amber-100 text-amber-700',
  accepted:         'bg-green-100 text-green-700',
  on_the_way:       'bg-blue-100 text-blue-700',
  in_progress:          'bg-orange-100 text-orange-700',
  pending_confirmation: 'bg-purple-100 text-purple-700',
  completed:            'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  rejected:    'bg-red-100 text-red-600',
}

const STATUS_LABELS = {
  pending_payment:  'Payment Incomplete',
  confirmed:        'Awaiting Tasker',
  accepted:         'Accepted',
  on_the_way:       'Tasker On The Way',
  in_progress:          'In Progress',
  pending_confirmation: 'Confirm Completion',
  completed:            'Completed',
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

const VIDEO_MAX_BYTES = 20 * 1024 * 1024 // 20 MB

function ReviewModal({ booking, userId, onClose, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [photos, setPhotos] = useState([])
  const [video, setVideo] = useState(null)
  const [videoError, setVideoError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const pickerRef = useRef(null)
  const commentRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  function handleEmojiClick(emojiData) {
    setComment((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
    commentRef.current?.focus()
  }

  function handleVideoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > VIDEO_MAX_BYTES) {
      setVideoError('Video must be 20 MB or less.')
      return
    }
    setVideoError('')
    setVideo(file)
  }

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

    let videoUrl = null
    if (video) {
      setSubmitMessage('Uploading video...')
      const fileExt = video.name.split('.').pop()
      const fileName = `vid_${booking.id}_${Date.now()}.${fileExt}`
      const { error: vidUploadError } = await supabase.storage
        .from('review-images')
        .upload(fileName, video)
      if (vidUploadError) { setStatus('error'); setSubmitMessage(''); return }
      const { data: vidData } = supabase.storage
        .from('review-images')
        .getPublicUrl(fileName)
      videoUrl = vidData.publicUrl
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
        video: videoUrl,
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
        <div className="relative mb-3">
          <textarea
            ref={commentRef}
            value={comment}
            onChange={(e) => { setComment(e.target.value); if (status === 'error') setStatus('idle') }}
            placeholder="Share your experience..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none outline-none focus:border-orange-400"
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker((p) => !p)}
            className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg text-gray-400 hover:text-orange-500 transition-colors"
          >
            <Smile size={18} />
          </button>
          {showEmojiPicker && (
            <div ref={pickerRef} className="absolute bottom-10 right-0 z-50">
              <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={380} previewConfig={{ showPreview: false }} />
            </div>
          )}
        </div>

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

        <div className="mb-3">
          <p className="text-sm font-semibold text-gray-600 mb-2">
            Add Video <span className="text-xs text-gray-400 font-normal">(optional, max 20 MB)</span>
          </p>
          {video ? (
            <div className="relative">
              <video
                src={URL.createObjectURL(video)}
                controls
                className="w-full rounded-lg border border-gray-200 max-h-40"
              />
              <button
                type="button"
                onClick={() => setVideo(null)}
                className="absolute top-1.5 right-1.5 w-5 h-5 bg-gray-700 hover:bg-gray-900 text-white rounded-full text-xs flex items-center justify-center leading-none"
              >✕</button>
            </div>
          ) : (
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              Add Video
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={handleVideoChange}
              />
            </label>
          )}
          {videoError && <p className="text-xs text-red-500 mt-1">{videoError}</p>}
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

const NOMINATIM_BASE = import.meta.env.DEV ? '/nominatim' : 'https://nominatim.openstreetmap.org'

// ─── Track Tasker Map ────────────────────────────────────────────────────────

function calcBearing([lat1, lng1], [lat2, lng2]) {
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function makeArrowIcon(bearing) {
  return L.divIcon({
    html: `<div style="width:46px;height:46px;background:#1e3a8a;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;transform:rotate(${bearing}deg)"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M12 3 L20 21 L12 16 L4 21 Z" fill="white"/></svg></div>`,
    className: '',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  })
}

function calcPathDist(points) {
  let d = 0
  for (let i = 1; i < points.length; i++) d += haversineDist(points[i - 1], points[i])
  return d
}

function formatETA(seconds) {
  const mins = Math.round(seconds / 60)
  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// Haversine distance in meters between two [lat, lng] points
function haversineDist([lat1, lng1], [lat2, lng2]) {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Snap pos to nearest point on route, return remaining slice
function getRemainingPoints(pos, points) {
  if (!points.length) return [pos]
  let idx = 0, best = Infinity
  for (let i = 0; i < points.length; i++) {
    const d = haversineDist(pos, points[i])
    if (d < best) { best = d; idx = i }
  }
  return [pos, ...points.slice(idx)]
}

function LiveMapContent({ taskerPos, customerPos, onRouteUpdate }) {
  const map = useMap()
  const taskerMarkerRef   = useRef(null)
  const customerMarkerRef = useRef(null)
  const fullPolyRef       = useRef(null)
  const remainPolyRef     = useRef(null)
  const routePointsRef    = useRef([])
  const totalDistRef      = useRef(0)
  const totalDurRef       = useRef(0)
  const fetchedRef        = useRef(false)
  const prevPosRef        = useRef(null)
  const bearingRef        = useRef(0)

  // Markers + bounds
  useEffect(() => {
    if (!customerPos) return

    if (!customerMarkerRef.current) {
      const icon = L.divIcon({ html: '🏠', className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
      customerMarkerRef.current = L.marker(customerPos, { icon }).addTo(map)
        .bindPopup('Your location')
    }

    if (taskerPos) {
      // Update bearing when tasker moves more than 3 m
      if (prevPosRef.current && haversineDist(prevPosRef.current, taskerPos) > 3) {
        bearingRef.current = calcBearing(prevPosRef.current, taskerPos)
      }
      prevPosRef.current = taskerPos

      if (!taskerMarkerRef.current) {
        taskerMarkerRef.current = L.marker(taskerPos, { icon: makeArrowIcon(bearingRef.current) })
          .addTo(map)
          .bindPopup('Tasker location')
      } else {
        taskerMarkerRef.current.setLatLng(taskerPos)
        taskerMarkerRef.current.setIcon(makeArrowIcon(bearingRef.current))
      }
      map.fitBounds([taskerPos, customerPos], { padding: [50, 50] })
    } else {
      map.setView(customerPos, 15)
    }
  }, [taskerPos, customerPos])

  // Fetch OSRM once when both positions first become available
  useEffect(() => {
    if (!taskerPos || !customerPos || fetchedRef.current) return
    fetchedRef.current = true

    const [taskerLat, taskerLng] = taskerPos
    const [customerLat, customerLng] = customerPos

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${taskerLng},${taskerLat};${customerLng},${customerLat}?overview=full&geometries=geojson&steps=true&annotations=false`,
      { headers: { 'User-Agent': 'HanapPH/1.0' } }
    )
      .then(r => r.json())
      .then(data => {
        if (data?.code !== 'Ok') throw new Error('bad response')
        const route  = data.routes[0]
        totalDistRef.current = route.distance
        totalDurRef.current  = route.duration
        const points = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        routePointsRef.current = points

        // Full route — grey background
        if (!fullPolyRef.current) {
          fullPolyRef.current = L.polyline(points, { color: '#9ca3af', weight: 6, opacity: 0.35 }).addTo(map)
        } else {
          fullPolyRef.current.setLatLngs(points)
        }

        // Initial remaining route — orange
        const remaining = getRemainingPoints(taskerPos, points)
        if (!remainPolyRef.current) {
          remainPolyRef.current = L.polyline(remaining, { color: '#f97316', weight: 5 }).addTo(map)
        } else {
          remainPolyRef.current.setLatLngs(remaining)
        }

        const remainDist = calcPathDist(remaining)
        const remainSec  = route.duration > 0 ? (remainDist / route.distance) * route.duration : 0
        onRouteUpdate?.(remainDist, remainSec)
      })
      .catch(() => {
        // Silent fallback: straight dashed line
        if (!remainPolyRef.current) {
          remainPolyRef.current = L.polyline([taskerPos, customerPos], { color: '#f97316', weight: 3, dashArray: '6,6' }).addTo(map)
        }
        onRouteUpdate?.(haversineDist(taskerPos, customerPos), null)
      })
  }, [taskerPos, customerPos])

  // Trim remaining route as tasker moves — no re-fetch
  useEffect(() => {
    if (!taskerPos || !routePointsRef.current.length || !remainPolyRef.current) return
    const remaining  = getRemainingPoints(taskerPos, routePointsRef.current)
    remainPolyRef.current.setLatLngs(remaining)
    const remainDist = calcPathDist(remaining)
    const remainSec  = totalDistRef.current > 0
      ? (remainDist / totalDistRef.current) * totalDurRef.current
      : null
    onRouteUpdate?.(remainDist, remainSec)
  }, [taskerPos])

  return null
}

function TrackTaskerModal({ booking, onClose, onArrived }) {
  const [customerPos, setCustomerPos] = useState(null)
  const [taskerPos, setTaskerPos] = useState(
    booking.tasker_lat && booking.tasker_lng
      ? [Number(booking.tasker_lat), Number(booking.tasker_lng)]
      : null
  )
  const [remainDist, setRemainDist] = useState(null)
  const [remainSec,  setRemainSec]  = useState(null)

  const handleRouteUpdate = useCallback((dist, sec) => {
    setRemainDist(dist)
    setRemainSec(sec)
  }, [])

  // Resolve customer position — prefer GPS coords from detect-location, fall back to Nominatim
  useEffect(() => {
    const custLat = booking.task_options?.customer_lat
    const custLng = booking.task_options?.customer_lng
    if (custLat && custLng) {
      setCustomerPos([Number(custLat), Number(custLng)])
      return
    }
    if (!booking.address) return
    const timer = setTimeout(() => {
      fetch(`${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(booking.address)}&countrycodes=ph`)
        .then(r => r.json())
        .then(data => {
          if (data?.length > 0) setCustomerPos([parseFloat(data[0].lat), parseFloat(data[0].lon)])
        })
        .catch(() => {})
    }, 800)
    return () => clearTimeout(timer)
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
              🔵 {booking.taskerName ?? 'Your tasker'} is on the way!
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
                <LiveMapContent taskerPos={taskerPos} customerPos={customerPos} onRouteUpdate={handleRouteUpdate} />
              </MapContainer>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #f3f4f6', gap: '0' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: '26px', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
                {remainDist != null ? (remainDist / 1000).toFixed(1) : '—'}
              </p>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>km away</p>
            </div>
            <div style={{ width: '1px', height: '40px', background: '#e5e7eb' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: '26px', fontWeight: 900, color: '#f97316', lineHeight: 1 }}>
                {remainSec != null ? formatETA(remainSec) : '—'}
              </p>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>est. arrival</p>
            </div>
            <div style={{ width: '1px', height: '40px', background: '#e5e7eb' }} />
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '16px', fontSize: '12px', color: '#6b7280' }}>
              <span>🔵 Tasker</span>
              <span>🏠 You</span>
              {!taskerPos && <span style={{ color: '#f97316', fontSize: '11px' }}>Waiting…</span>}
            </div>
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

function CancelBookingModal({ onClose, onConfirm, cancelling, cancelError, estimatedTotal }) {
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
              <h2 className="text-xl font-bold text-gray-800 mb-3">Cancelling your booking?</h2>
              <p className="text-sm text-gray-600 mb-2">
                Your payment will be refunded to your Hanap.ph E-Wallet instantly.
              </p>
              <p className="text-sm text-green-600 font-medium mb-1">
                You can use your wallet balance on your next booking.
              </p>
              <p className="text-sm text-amber-600 font-medium">
                This action cannot be undone.
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

            <div className="flex items-start gap-2 bg-blue-50 text-blue-600 rounded-lg px-3 py-2.5 mt-3 mb-1">
              <Info size={15} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-snug">
                Your payment of{' '}
                <span className="font-semibold">
                  ₱{Number(estimatedTotal ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>{' '}
                will be automatically credited to your Hanap.ph E-Wallet once the cancellation is processed.
              </p>
            </div>

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

// ─── Receipt helpers ──────────────────────────────────────────────────────────
const RECEIPT_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmtReceiptDate(dateStr, timeStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  const base = `${RECEIPT_MONTHS[m - 1]} ${d}, ${y}`
  if (!timeStr) return base
  const [h, min] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  const minutes = min === 0 ? '' : `:${String(min).padStart(2, '0')}`
  return `${base} at ${hour}${minutes} ${ampm}`
}

function fmtReceiptPaymentMethod(method) {
  if (!method) return '—'
  if (method === 'gcash') return 'GCash'
  if (method === 'paymaya') return 'PayMaya'
  if (method === 'card') return 'Credit/Debit Card'
  return method.charAt(0).toUpperCase() + method.slice(1)
}

function maskReceiptPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return phone
  const visible = digits.slice(0, 2) + '*'.repeat(digits.length - 5) + digits.slice(-3)
  return phone.startsWith('+') ? '+' + visible : visible
}

const RECEIPT_EXTRAS_LOOKUP = {
  'Cleaning':           { 'With Laundry': 200, 'With Appliances': 250 },
  'Carpentry':          { 'Materials Included': 500, 'Varnishing / Finishing': 350, 'Hauling / Debris Removal': 200 },
  'Electrical':         { 'Materials Included': 400, 'Additional Outlet/Switch': 300, 'Circuit Breaker Check': 250 },
  'Aircon Maintenance': { 'Same Day Service': 300 },
  'Painting':           { 'Primer Coat': 400, 'Two Coats': 500, 'Wall Putty / Patching': 300 },
  'Plumbing Repair':    { 'Materials Included': 400, 'Multiple Points (2+ faucets/drains)': 300, 'Waterproofing': 500 },
}

function buildReceiptBreakdown(taskOptions, helperFee, helperCount) {
  if (!taskOptions) return []
  const { service } = taskOptions
  const lines = []
  const combinedBase = (taskOptions.base_price ?? 0) + (helperFee ?? 0)
  if (service === 'Cleaning') {
    lines.push({ label: `${taskOptions.type} (${taskOptions.area})`, price: combinedBase })
  } else if (service === 'Carpentry') {
    lines.push({ label: `${taskOptions.type} — ${taskOptions.category ?? taskOptions.item ?? ''}`, price: combinedBase })
  } else if (service === 'Electrical') {
    lines.push({ label: taskOptions.sub_option ? `${taskOptions.type} — ${taskOptions.sub_option}` : taskOptions.type, price: combinedBase })
    lines.push({ label: `Urgency (${taskOptions.urgency})`, price: taskOptions.urgency_surcharge ?? 0 })
  } else if (service === 'Aircon Maintenance') {
    const u = taskOptions.units || 1
    lines.push({ label: `${taskOptions.aircon_type} × ${u} unit${u > 1 ? 's' : ''} (${taskOptions.service_type})`, price: combinedBase })
  } else if (service === 'Painting') {
    lines.push({ label: `${taskOptions.what_to_paint} Painting (${taskOptions.area})`, price: combinedBase })
    if (taskOptions.paint_cost > 0) lines.push({ label: 'Paint (by Tasker)', price: taskOptions.paint_cost })
  } else if (service === 'Plumbing Repair') {
    lines.push({ label: taskOptions.sub_option ? `${taskOptions.problem} — ${taskOptions.sub_option}` : taskOptions.problem, price: combinedBase })
    lines.push({ label: `Urgency (${taskOptions.urgency})`, price: taskOptions.urgency_surcharge ?? 0 })
  }
  if (helperFee > 0 && helperCount > 0)
    lines.push({ label: `Helpers: ${helperCount} helper${helperCount > 1 ? 's' : ''} assigned`, price: null, isHelperInfo: true })
  const extrasMap = RECEIPT_EXTRAS_LOOKUP[service] || {}
  ;(taskOptions.extras || []).forEach((extra) => {
    const p = service === 'Aircon Maintenance' && extra === 'Freon Recharge'
      ? 500 * (taskOptions.units || 1)
      : (extrasMap[extra] ?? 0)
    lines.push({ label: extra, price: p, isExtra: true })
  })
  return lines
}

function ReceiptModal({ booking, onClose }) {
  const [downloading, setDownloading] = useState(false)
  const receiptId = `receipt-modal-${booking.id}`

  const taskOptions = (() => {
    try { return booking?.task_options ? JSON.parse(booking.task_options) : null } catch { return null }
  })()
  const helperFee   = booking?.helper_fee ?? 0
  const helperCount = (booking?.taskers_needed ?? 1) > 1 ? (booking.taskers_needed - 1) : 0
  const breakdown   = buildReceiptBreakdown(taskOptions, helperFee, helperCount)

  const receiptDate = booking?.created_at
    ? (() => {
        const d = new Date(booking.created_at)
        const mo = d.getMonth(); const day = d.getDate(); const yr = d.getFullYear()
        let h = d.getHours(); const min = d.getMinutes()
        const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12
        const mins = min === 0 ? '' : `:${String(min).padStart(2, '0')}`
        return `${RECEIPT_MONTHS[mo]} ${day}, ${yr} at ${h}${mins} ${ampm}`
      })()
    : '—'

  async function handleDownload() {
    setDownloading(true)
    const node = document.getElementById(receiptId)
    toPng(node, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `Hanap-Receipt-${booking?.reference_number ?? 'receipt'}.png`
        link.click()
        URL.revokeObjectURL(dataUrl)
      })
      .catch((err) => console.error('Download failed:', err))
      .finally(() => setDownloading(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div id={receiptId} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-5 pt-5 pb-7 flex flex-col items-center text-center text-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="14" viewBox="0 0 20 18" fill="none">
                  <path d="M10 1L1 8.5V17H7V12H13V17H19V8.5L10 1Z" fill="white" stroke="white" strokeWidth="0.4" strokeLinejoin="round"/>
                  <rect x="8" y="12" width="4" height="5" rx="0.5" fill="#f97316"/>
                  <rect x="13" y="3.2" width="2.4" height="3.8" rx="0.4" fill="white" opacity="0.85"/>
                </svg>
              </div>
              <span className="text-white font-bold text-base tracking-tight">Hanap.ph</span>
            </div>
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            <p className="text-xl font-bold">Booking Confirmed!</p>
            <p className="text-orange-100 text-xs mt-0.5">Payment Successful</p>
            <div className="mt-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2 w-full">
              <p className="text-orange-100 text-xs uppercase tracking-widest mb-0.5">Reference Number</p>
              <p className="text-lg font-bold tracking-widest">{booking?.reference_number ?? '—'}</p>
            </div>
          </div>

          {/* Tear edge */}
          <div className="relative h-4 bg-white">
            <div className="absolute -top-3 left-0 right-0 flex justify-between px-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-5 h-5 rounded-full bg-gray-50" />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-5 pb-5 space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest text-center pt-2">Receipt Details</p>
            <div className="space-y-3 text-sm">
              {[
                ['Receipt Date',  receiptDate],
                ['Customer',      booking?.customer_name ?? '—'],
                ['Service',       booking?.service ?? '—'],
                ['Tasker',        booking?.taskerName ?? '—'],
                ['Scheduled',     fmtReceiptDate(booking?.scheduled_date, booking?.scheduled_time)],
                ['Address',       booking?.address ?? '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-gray-800 text-right">{val}</span>
                </div>
              ))}
              {/* Payment method */}
              <div className="flex justify-between gap-4 items-start">
                <span className="text-gray-400 flex-shrink-0">Payment Method</span>
                <div className="text-right space-y-1">
                  {(() => {
                    const method    = booking?.payment_method
                    const walletUsed = Number(booking?.wallet_amount_used) || 0
                    if (!method) return (
                      <span className="text-gray-800 flex items-center justify-end gap-1">
                        <Wallet size={14} className="text-orange-500 flex-shrink-0" /> Hanap.ph E-Wallet
                      </span>
                    )
                    if (walletUsed > 0) return (
                      <>
                        <span className="text-gray-800 flex items-center justify-end gap-1">
                          <Wallet size={14} className="text-orange-500 flex-shrink-0" />
                          Hanap.ph E-Wallet + {fmtReceiptPaymentMethod(method)}
                        </span>
                        {['gcash','paymaya','maya'].includes(method.toLowerCase()) && booking?.customer_phone && (
                          <p className="text-gray-400 text-xs">{maskReceiptPhone(booking.customer_phone)}</p>
                        )}
                      </>
                    )
                    return (
                      <>
                        <span className="text-gray-800">{fmtReceiptPaymentMethod(method)}</span>
                        {['gcash','paymaya','maya'].includes(method.toLowerCase()) && booking?.customer_phone && (
                          <p className="text-gray-400 text-xs">{maskReceiptPhone(booking.customer_phone)}</p>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            {breakdown.length > 0 && (
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Price Breakdown</p>
                {breakdown.map((line, i) => (
                  line.isHelperInfo
                    ? <div key={i} className="text-xs text-gray-400">{line.label}</div>
                    : <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-500">{line.label}</span>
                        <span className="text-gray-700">{line.isExtra ? `+₱${line.price.toLocaleString()}` : `₱${line.price.toLocaleString()}`}</span>
                      </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <span className="font-bold text-gray-800">Total Paid</span>
              <span className="font-bold text-orange-500 text-lg">₱{Number(booking?.estimated_total ?? 0).toLocaleString()}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60"
              >
                {downloading ? 'Downloading...' : 'Download Receipt'}
              </button>
              <button
                onClick={onClose}
                className="w-full bg-white border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl transition-colors text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BookingCard({ booking, userId, onCancel }) {
  const navigate = useNavigate()
  const bookingTaskOpts = typeof booking.task_options === 'string'
    ? (() => { try { return JSON.parse(booking.task_options) } catch { return {} } })()
    : (booking.task_options ?? {})
  const isUrgentBooking = bookingTaskOpts?.is_urgent === true
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [hasReview, setHasReview] = useState(true)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedProposedDate, setSelectedProposedDate] = useState(null)
  const [proposalLoading, setProposalLoading] = useState(null)
  const [toast, setToast] = useState('')
  const [showTrackModal, setShowTrackModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showCompletionPhotoModal, setShowCompletionPhotoModal] = useState(false)

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

  async function handleConfirmComplete() {
    setConfirming(true)
    const platform_fee = booking.estimated_total != null ? booking.estimated_total * 0.10 : null
    const tasker_payout = booking.estimated_total != null ? booking.estimated_total * 0.90 : null
    const updatePayload = { status: 'completed' }
    if (platform_fee != null) {
      updatePayload.platform_fee = platform_fee
      updatePayload.tasker_payout = tasker_payout
    }
    const { error } = await supabase.from('bookings').update(updatePayload).eq('id', booking.id)
    if (!error && tasker_payout && booking.taskerUserId) {
      await supabase.rpc('increment_wallet_balance', {
        target_user_id: booking.taskerUserId,
        increment_amount: tasker_payout,
      })
      await supabase.from('wallet_transactions').insert({
        user_id: booking.taskerUserId,
        booking_id: booking.id,
        amount: tasker_payout,
        type: 'credit',
        description: `Earnings from booking ${booking.reference_number ?? booking.id}`,
      })
    }
    if (!error && booking.taskerUserId) {
      await supabase.from('notifications').insert({
        user_id: booking.taskerUserId,
        title: 'Job Confirmed',
        message: 'The customer has confirmed the job is complete. Your earnings have been added to your wallet.',
        is_read: false,
      })
    }
    setConfirming(false)
    if (!error) onCancel()
  }

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

      supabase.from('bookings').update({ is_refunded: true }).eq('id', booking.id)
        .then(({ error: refundFlagErr }) => { if (refundFlagErr) console.error('is_refunded flag failed:', refundFlagErr) })
    }

    setCancelling(false)
    setShowCancelModal(false)
    onCancel()
  }

  async function handleRebook() {
    if (!isUrgentBooking) {
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
    }
    navigate(`/booking/${booking.service}`, {
      state: {
        service: booking.service,
        tasker_id: isUrgentBooking ? null : booking.tasker_id,
        ...(isUrgentBooking ? { excluded_tasker_id: booking.tasker_id } : {}),
        task_options: booking.task_options,
        taskers_needed: booking.taskers_needed,
        is_rebook: true,
        original_booking_id: booking.id,
        prefill_address: booking.address ?? '',
        prefill_landmark: booking.landmark ?? '',
        prefill_details: booking.task_description ?? '',
        prefill_size: booking.task_size ?? '',
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
          estimatedTotal={booking.estimated_total}
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

      {showReceiptModal && (
        <ReceiptModal booking={booking} onClose={() => setShowReceiptModal(false)} />
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

        <div className="space-y-1 text-sm">
          <div className="flex gap-2 items-start">
            <span className="text-gray-400 w-28 flex-shrink-0">Task Schedule</span>
            <span className="font-semibold text-blue-600">{(() => {
              if (!booking.scheduled_date) return '—'
              const d = new Date(booking.scheduled_date + 'T00:00:00')
              const datePart = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              if (!booking.scheduled_time) return datePart
              const [h, m] = booking.scheduled_time.split(':')
              const t = new Date(); t.setHours(+h, +m)
              return `${datePart} at ${t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
            })()}</span>
          </div>
          {[
            ['Booked on',  booking.created_at
              ? new Date(booking.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
                ' at ' +
                new Date(booking.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              : '—'],
            ['Tasker',     booking.taskerName ?? '—'],
            ['Task Size',  booking.task_size ?? '—'],
            ...(booking.task_options?.service === 'Carpentry' && booking.task_options?.category
              ? [['Furniture Category', booking.task_options.category]]
              : []),
            ...(booking.task_options?.service === 'Carpentry' && booking.task_options?.furniture_dimensions
              ? [['Dimensions', booking.task_options.furniture_dimensions]]
              : []),
            ...(booking.task_options?.service === 'Painting' && booking.task_options?.what_to_paint === 'Furniture' && booking.task_options?.furniture_category
              ? [['Furniture Category', booking.task_options.furniture_category], ['Number of Pieces', booking.task_options.furniture_pieces]]
              : []),
            ...(booking.task_options?.service === 'Plumbing Repair' && booking.task_options?.sub_option
              ? [['Specify Problem', booking.task_options.sub_option]]
              : []),
            ...(booking.task_options?.service === 'Electrical' && booking.task_options?.sub_option
              ? [['Specify Work', booking.task_options.sub_option]]
              : []),
            ['Address',    booking.address ?? '—'],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-2 items-start">
              <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
              <span className="text-gray-700">{val}</span>
            </div>
          ))}
          <div className="flex gap-2 items-start pt-1">
            <span className="text-gray-400 w-28 flex-shrink-0">Reference</span>
            <span className="text-gray-700">{booking.reference_number ?? '—'}</span>
          </div>
        </div>

        {/* Price breakdown */}
        {(booking.platform_fee != null || booking.tasker_payout != null) && (() => {
          const fmt = (n) => `₱${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          const helperFee = booking.helper_fee ?? 0
          const totalPaid = (booking.tasker_payout ?? 0) + (booking.platform_fee ?? 0) + helperFee
          const helperCount = booking.taskers_needed > 1 ? booking.taskers_needed - 1 : 0
          return (
            <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Base Price</span>
                <span>{fmt(totalPaid)}</span>
              </div>
              {helperFee > 0 && helperCount > 0 && (
                <div className="text-gray-400 text-xs">
                  {helperCount} helper{helperCount > 1 ? 's' : ''} assigned
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-800 border-t border-gray-100 pt-1.5">
                <span>Total Paid</span>
                <span>{fmt(totalPaid)}</span>
              </div>
              {booking.payment_method && (
                <div className="flex justify-between text-gray-400 text-xs pt-0.5">
                  <span>Payment Method</span>
                  <span className="capitalize">{booking.payment_method === 'gcash' ? 'GCash' : booking.payment_method === 'paymaya' ? 'PayMaya' : booking.payment_method === 'card' ? 'Credit/Debit Card' : booking.payment_method}</span>
                </div>
              )}
            </div>
          )
        })()}

        {booking.status === 'pending_payment' && (
          <div className="space-y-2 pt-1">
            <p className="text-sm text-pink-600 bg-pink-50 border border-pink-100 rounded-lg px-3 py-2">
              Your payment was not completed. This booking is incomplete and has not been submitted to a tasker.
            </p>
            <button
              onClick={() => navigate(`/booking/${booking.service}`, {
                state: {
                  is_continue_payment: true,
                  booking_id: booking.id,
                  booking_ref: booking.reference_number,
                  tasker_id: booking.tasker_id,
                  taskers_needed: booking.taskers_needed,
                  task_options: booking.task_options,
                  prefill_address: booking.address ?? '',
                  prefill_landmark: booking.landmark ?? '',
                  prefill_details: booking.task_description ?? '',
                  prefill_size: booking.task_size ?? '',
                  prefill_duration: booking.duration_hours ?? 8,
                  prefill_estimated_total: booking.estimated_total ?? 0,
                  prefill_date: booking.scheduled_date ?? null,
                  prefill_time: booking.scheduled_time ?? null,
                },
              })}
              className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-4 py-1.5 rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        )}

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

        {booking.status === 'pending_confirmation' && (
          <div className="space-y-2 pt-1">
            <p className="text-sm text-gray-600">
              Your tasker has marked this job as complete. Please confirm to finalize the booking.
            </p>
            {booking.completion_photo_url && (
              <>
                <button
                  onClick={() => setShowCompletionPhotoModal(true)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
                >
                  <img src={booking.completion_photo_url} alt="Completion photo" className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
                  View completion photo
                </button>
                {showCompletionPhotoModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setShowCompletionPhotoModal(false)}
                  >
                    <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setShowCompletionPhotoModal(false)}
                        className="absolute -top-3 -right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-600 hover:text-gray-900 font-bold text-lg leading-none"
                      >
                        ×
                      </button>
                      <img src={booking.completion_photo_url} alt="Completion photo" className="w-full rounded-xl shadow-lg" />
                    </div>
                  </div>
                )}
              </>
            )}
            <button
              onClick={handleConfirmComplete}
              disabled={confirming}
              className="text-sm font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
            >
              {confirming ? 'Confirming…' : '✓ I Confirm Job is Done'}
            </button>
          </div>
        )}

        {booking.status === 'completed' && (
          <div className="space-y-2 pt-1">
            <p className="text-sm text-gray-500">
              Thank you for using Hanap.ph! We hope you're happy with the service.
              Leave a review to help others find great taskers.
            </p>
            {booking.completion_photo_url && (
              <>
                <button
                  onClick={() => setShowCompletionPhotoModal(true)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
                >
                  <img src={booking.completion_photo_url} alt="Completion photo" className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
                  View completion photo
                </button>
                {showCompletionPhotoModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setShowCompletionPhotoModal(false)}
                  >
                    <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setShowCompletionPhotoModal(false)}
                        className="absolute -top-3 -right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-600 hover:text-gray-900 font-bold text-lg leading-none"
                      >
                        ×
                      </button>
                      <img src={booking.completion_photo_url} alt="Completion photo" className="w-full rounded-xl shadow-lg" />
                    </div>
                  </div>
                )}
              </>
            )}
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
              {isUrgentBooking ? 'Find Another Tasker' : 'Rebook'}
            </button>
          </div>
        )}

        {booking.reference_number && booking.status !== 'pending_payment' && (
          <div className="pt-1">
            <button
              onClick={() => setShowReceiptModal(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-orange-500 transition-colors"
            >
              <CheckCircle2 size={15} />
              View Receipt
            </button>
          </div>
        )}

        {booking.status !== 'cancelled' && booking.status !== 'rejected' && booking.status !== 'pending_payment' && booking.taskerUserId && (
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
  const [lightboxSrc, setLightboxSrc] = useState(null)

  async function fetchReviews(showLoading = false) {
    if (showLoading) setRevLoading(true)
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('id, booking_id, tasker_id, rating, comment, images, video, created_at, service')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })

    if (!reviewRows || reviewRows.length === 0) {
      setReviews([])
      setRevLoading(false)
      return
    }

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

    setReviews(reviewRows.map((r) => ({
      ...r,
      taskerName: taskerMap[r.tasker_id]?.name ?? 'Unknown Tasker',
      taskerPhoto: taskerMap[r.tasker_id]?.photo ?? null,
      service: r.service || '—',
    })))
    setRevLoading(false)
  }

  useEffect(() => {
    if (!userId) return
    fetchReviews(true)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`customer-reviews-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `client_id=eq.${userId}` },
        () => { fetchReviews(false) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function deleteReview(reviewId) {
    await supabase.from('reviews').delete().eq('id', reviewId)
    setReviews((prev) => prev.filter((r) => r.id !== reviewId))
  }

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

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="Review photo" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
        </div>
      )}

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
                <div className="ml-auto flex items-center gap-3 flex-shrink-0">
                  <p className="text-xs text-gray-400">{dateStr}</p>
                  <button
                    onClick={() => deleteReview(r.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete review"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
                      onClick={() => setLightboxSrc(src)}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity" />
                  ))}
                </div>
              )}

              {/* Video */}
              {r.video && (
                <video
                  src={r.video}
                  controls
                  className="w-full max-w-xs rounded-xl border border-gray-100 max-h-48"
                />
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
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [profLoading, setProfLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')
  const [pwResetSent, setPwResetSent] = useState(false)
  const [pwResetLoading, setPwResetLoading] = useState(false)

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
    if (!fullName.trim()) { showToast('error', 'Full name is required.'); return }
    if (phone.trim() && !/^09\d{9}$/.test(phone.trim())) {
      showToast('error', 'Phone must be a valid PH number (e.g. 09171234567).')
      return
    }
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

  async function handlePasswordReset() {
    setPwResetLoading(true)
    await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo: `${window.location.origin}/reset-password` })
    setPwResetLoading(false)
    setPwResetSent(true)
    setTimeout(() => setPwResetSent(false), 20000)
  }

  async function handleDeactivate() {
    setDeactivateError('')
    setDeactivating(true)
    const { data: active } = await supabase
      .from('bookings')
      .select('id')
      .eq('client_id', userId)
      .in('status', ['confirmed', 'accepted', 'on_the_way', 'in_progress'])
      .limit(1)
    if (active && active.length > 0) {
      setDeactivateError('You have active bookings. Please complete or cancel them before deactivating your account.')
      setDeactivating(false)
      return
    }
    await supabase.from('profiles').update({ is_archived: true }).eq('id', userId)
    await supabase.auth.signOut()
    navigate('/')
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
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-[120px] h-[120px] rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <div className="w-[120px] h-[120px] rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              <span className="text-[2.5rem] font-bold text-orange-500">{initials}</span>
            </div>
          )}
          {avatarUrl && !uploading && (
            <button
              onClick={handleRemoveAvatar}
              className="absolute top-1 right-1 w-[22px] h-[22px] rounded-full bg-red-500 border-2 border-white flex items-center justify-center cursor-pointer"
              title="Remove photo"
            >
              <span className="text-white text-[0.65rem] font-bold leading-none">✕</span>
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
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
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-4">Personal Information</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">

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
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Member Since</label>
            <p className="text-sm text-gray-400 py-1">{joinedDate}</p>
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

      {/* Section 4 — Change Password */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">Change Password</h4>
        <p className="text-xs text-gray-400 mb-4">We'll send a password reset link to <span className="text-gray-500 font-medium">{userEmail}</span>.</p>
        <button
          onClick={handlePasswordReset}
          disabled={pwResetSent || pwResetLoading}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-orange-300 text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pwResetSent ? 'Reset email sent!' : pwResetLoading ? 'Sending…' : 'Send Reset Email'}
        </button>
        {pwResetSent && (
          <p className="text-xs text-green-600 mt-3">Check your email inbox and click the link to set a new password.</p>
        )}
      </div>

      {/* Section 5 — Deactivate */}
      <div className="border border-gray-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Deactivate Account</p>
        <p className="text-xs text-gray-400 mb-4">Once deactivated, you will be logged out and your account will be disabled.</p>
        <button
          onClick={() => { setDeactivateError(''); setShowDeactivateModal(true) }}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Deactivate Account
        </button>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-gray-800">Deactivate Account?</h3>
            <p className="text-sm text-gray-500">Your account will be deactivated and you will be logged out immediately. This action cannot be undone from the app.</p>
            {deactivateError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deactivateError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowDeactivateModal(false); setDeactivateError('') }}
                disabled={deactivating}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {deactivating ? 'Deactivating…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

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
- When a booking is cancelled, the full payment amount is automatically credited to their Hanap.ph E-Wallet instantly — no need to contact support for a refund
- If a tasker rejects a booking, the full payment is also automatically credited to their Hanap.ph E-Wallet instantly
- Their E-Wallet balance can be found in the E-Wallet tab in the Dashboard and can be used for future bookings
- For special cases, they should use "Talk to Admin"

"Payment Issue":
- Hanap.ph accepts GCash, PayMaya, and Credit/Debit Card via PayMongo
- Advise the customer to: (1) double-check their payment details, (2) make sure they have sufficient balance, (3) try a different payment method
- If the issue persists, they should contact admin support directly through the Contact Support tab in their Dashboard
- If payment was deducted but the booking was not confirmed, tell them to contact admin immediately via the Contact Support tab with their reference number
- The reference number starts with VE- and can be found on their booking card

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

  // Cashout modal state
  const [cashoutOpen, setCashoutOpen] = useState(false)
  const [cashoutScreen, setCashoutScreen] = useState(1)
  const [cashoutMethod, setCashoutMethod] = useState('')
  const [cashoutNumber, setCashoutNumber] = useState('')
  const [cashoutName, setCashoutName] = useState('')
  const [cashoutAmount, setCashoutAmount] = useState('')
  const [cashoutErrors, setCashoutErrors] = useState({})
  const [cashoutApiError, setCashoutApiError] = useState('')
  const [cashoutRef, setCashoutRef] = useState('')
  const [cashoutTimestamp, setCashoutTimestamp] = useState('')
  const [cashoutFinalAmount, setCashoutFinalAmount] = useState(0)
  const [txnFilter, setTxnFilter] = useState('all')

  useEffect(() => {
    if (!userId) return
    async function fetchWallet() {
      setLoading(true)
      const [{ data: profile }, { data: txns }] = await Promise.all([
        supabase.from('profiles').select('wallet_balance').eq('id', userId).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      ])
      setBalance(Number(profile?.wallet_balance) || 0)
      setTransactions(txns ?? [])
      setLoading(false)
    }
    fetchWallet()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`customer-wallet-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` },
        async () => {
          const [{ data: profile }, { data: txns }] = await Promise.all([
            supabase.from('profiles').select('wallet_balance').eq('id', userId).single(),
            supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
          ])
          setBalance(Number(profile?.wallet_balance) || 0)
          setTransactions(txns ?? [])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const formatAmount = (amount) =>
    Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })

  function openCashout() {
    setCashoutScreen(1)
    setCashoutMethod('')
    setCashoutNumber('')
    setCashoutName('')
    setCashoutAmount('')
    setCashoutErrors({})
    setCashoutApiError('')
    setCashoutOpen(true)
  }

  function closeCashout() {
    if (cashoutScreen === 2) return // non-dismissable during processing
    setCashoutOpen(false)
  }

  async function handleCashoutProceed() {
    const errors = {}
    if (!cashoutMethod) errors.method = 'Please select a cashout method.'
    const ph = cashoutNumber.trim()
    if (!ph) errors.number = 'Account number is required.'
    else if (!/^09\d{9}$/.test(ph)) errors.number = 'Must be an 11-digit number starting with 09.'
    if (!cashoutName.trim()) errors.name = 'Account name is required.'
    const amt = parseFloat(cashoutAmount)
    if (!cashoutAmount || isNaN(amt)) errors.amount = 'Please enter an amount.'
    else if (amt < 80) errors.amount = 'Minimum cashout amount is ₱80.'
    else if (amt > balance) errors.amount = 'Amount exceeds your available balance.'
    if (Object.keys(errors).length > 0) { setCashoutErrors(errors); return }

    setCashoutErrors({})
    setCashoutApiError('')
    setCashoutFinalAmount(amt)
    const ref = String(Math.floor(Math.random() * 900000000000) + 100000000000)
    const ts = new Date().toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
    setCashoutRef(ref)
    setCashoutTimestamp(ts)
    setCashoutScreen(2)

    await new Promise((resolve) => setTimeout(resolve, 2500))

    const methodLabel = cashoutMethod === 'gcash' ? 'GCash' : 'PayMaya'
    const maskedNumber = `09XX-XXX-${cashoutNumber.slice(-4)}`

    const { error: rpcError } = await supabase.rpc('increment_wallet_balance', {
      target_user_id: userId,
      increment_amount: -amt,
    })
    if (rpcError) {
      setCashoutApiError('Failed to process cashout. Please try again.')
      setCashoutScreen(1)
      return
    }

    const { error: txnError } = await supabase.from('wallet_transactions').insert({
      user_id: userId,
      booking_id: null,
      amount: amt,
      type: 'debit',
      description: `Cashout via ${methodLabel} — ${maskedNumber}`,
      created_at: new Date().toISOString(),
    })
    if (txnError) {
      setCashoutApiError('Cashout sent but transaction log failed. Contact support if your history is missing.')
    }

    setBalance((prev) => prev - amt)
    setTransactions((prev) => [{
      id: `co-${Date.now()}`,
      user_id: userId,
      booking_id: null,
      amount: amt,
      type: 'debit',
      description: `Cashout via ${methodLabel} — ${maskedNumber}`,
      created_at: new Date().toISOString(),
    }, ...prev])

    setCashoutScreen(3)
  }

  const maskedDisplay = cashoutNumber.length >= 4
    ? `09XX-XXX-${cashoutNumber.slice(-4)}`
    : cashoutNumber || '—'

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">E-Wallet</h2>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 mb-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-white" />
            <p className="text-white font-semibold text-base">Hanap.ph Wallet Balance</p>
          </div>
          <button
            onClick={openCashout}
            disabled={loading || balance === null || balance < 80}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/30 transition-colors"
          >
            Withdraw
          </button>
        </div>
        {loading ? (
          <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin my-1" />
        ) : (
          <p className="text-white text-4xl font-bold tracking-tight">₱{formatAmount(balance)}</p>
        )}
        <p className="text-orange-100 text-sm mt-2">Use your balance on your next booking</p>
        {!loading && balance !== null && balance < 80 && (
          <p className="text-orange-200 text-xs mt-1">Minimum ₱80 balance required to withdraw</p>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-base font-bold text-gray-800">Transaction History</h3>
          <div className="flex gap-2">
            {['all', 'credit', 'debit'].map((f) => (
              <button
                key={f}
                onClick={() => setTxnFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${txnFilter === f ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'}`}
              >
                {f === 'all' ? 'All' : f === 'credit' ? 'Credits' : 'Debits'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No wallet activity yet. Refunds and credits will appear here.</p>
          </div>
        ) : (() => {
          const filtered = txnFilter === 'all' ? transactions : transactions.filter((t) => t.type === txnFilter)
          return filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No {txnFilter === 'credit' ? 'credit' : 'debit'} transactions found.</p>
          ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((txn) => (
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
          )
        })()}
      </div>

      {/* ── Cashout Modal ─────────────────────────────────────────────── */}
      {cashoutOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
          onClick={cashoutScreen !== 2 ? closeCashout : undefined}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── Screen 1: Select Method & Enter Details ── */}
            {cashoutScreen === 1 && (
              <>
                <button
                  onClick={closeCashout}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors text-lg font-bold"
                >✕</button>

                <h3 className="text-lg font-bold text-gray-800 mb-5">Cash Out</h3>

                {cashoutApiError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                    {cashoutApiError}
                  </div>
                )}

                {/* Method selector */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Select Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setCashoutMethod('gcash'); setCashoutErrors((p) => ({ ...p, method: undefined })) }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${cashoutMethod === 'gcash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-green-300'}`}
                    >
                      <img src={gcashLogo} alt="GCash" className="h-5 w-auto" />
                    </button>
                    <button
                      onClick={() => { setCashoutMethod('paymaya'); setCashoutErrors((p) => ({ ...p, method: undefined })) }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${cashoutMethod === 'paymaya' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-purple-300'}`}
                    >
                      <img src={mayaLogo} alt="PayMaya" className="h-5 w-auto" />
                    </button>
                  </div>
                  {cashoutErrors.method && <p className="text-red-500 text-xs mt-1">{cashoutErrors.method}</p>}
                </div>

                {/* Account Number */}
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {cashoutMethod === 'paymaya' ? 'PayMaya Number' : 'GCash Number'}
                  </label>
                  <input
                    type="tel"
                    value={cashoutNumber}
                    onChange={(e) => { setCashoutNumber(e.target.value.replace(/\D/g, '').slice(0, 11)); setCashoutErrors((p) => ({ ...p, number: undefined })) }}
                    placeholder="09XX XXX XXXX"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${cashoutErrors.number ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {cashoutErrors.number && <p className="text-red-500 text-xs mt-1">{cashoutErrors.number}</p>}
                </div>

                {/* Account Name */}
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={cashoutName}
                    onChange={(e) => { setCashoutName(e.target.value); setCashoutErrors((p) => ({ ...p, name: undefined })) }}
                    placeholder="Enter account name"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${cashoutErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {cashoutErrors.name && <p className="text-red-500 text-xs mt-1">{cashoutErrors.name}</p>}
                </div>

                {/* Amount */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount to Cash Out</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱</span>
                    <input
                      type="number"
                      min="100"
                      max={balance ?? 0}
                      value={cashoutAmount}
                      onChange={(e) => { setCashoutAmount(e.target.value); setCashoutErrors((p) => ({ ...p, amount: undefined })) }}
                      placeholder="Enter amount"
                      className={`w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${cashoutErrors.amount ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Available balance: ₱{formatAmount(balance ?? 0)} · Min ₱80</p>
                  {cashoutErrors.amount && <p className="text-red-500 text-xs mt-1">{cashoutErrors.amount}</p>}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeCashout}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCashoutProceed}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
                  >
                    Proceed
                  </button>
                </div>
              </>
            )}

            {/* ── Screen 2: Processing ── */}
            {cashoutScreen === 2 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6" />
                <p className="text-base font-bold text-gray-800 mb-1">Processing your cashout...</p>
                <p className="text-sm text-gray-400">Please wait, do not close this window.</p>
              </div>
            )}

            {/* ── Screen 3: Success ── */}
            {cashoutScreen === 3 && (
              <>
                <div className="flex flex-col items-center text-center mb-5">
                  <CheckCircle2 className="w-14 h-14 text-green-500 mb-3" />
                  <h3 className="text-lg font-bold text-gray-800">Cashout Successful!</h3>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm mb-5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Sent</span>
                    <span className="font-bold text-gray-800">₱{formatAmount(cashoutFinalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">To</span>
                    <span className="font-semibold text-gray-800">
                      {cashoutMethod === 'gcash' ? 'GCash' : 'PayMaya'} · {maskedDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-semibold text-gray-800">{cashoutName}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2.5">
                    <span className="text-gray-500">Remaining Balance</span>
                    <span className="font-bold text-orange-600">₱{formatAmount((balance ?? 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reference No.</span>
                    <span className="font-mono text-xs text-gray-700">{cashoutRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date &amp; Time</span>
                    <span className="text-gray-700 text-xs text-right">{cashoutTimestamp}</span>
                  </div>
                </div>

                {cashoutApiError && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{cashoutApiError}</p>
                )}

                <button
                  onClick={closeCashout}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
                >
                  Done
                </button>
              </>
            )}

          </div>
        </div>
      )}
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
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'bookings')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bookings, setBookings] = useState([])
  const [bookingFilter, setBookingFilter] = useState('all')
  const [bookingSearch, setBookingSearch] = useState('')
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [showNotifBanner, setShowNotifBanner] = useState(false)
  const [notifToast, setNotifToast] = useState(null)
  const [interviewNotif, setInterviewNotif] = useState(null)
  const [welcomeNotif, setWelcomeNotif] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') setShowNotifBanner(true)
  }, [])

  async function handleEnableNotifications() {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    setShowNotifBanner(false)
    if (permission === 'granted') {
      setNotifToast('Notifications enabled!')
      setTimeout(() => setNotifToast(null), 3000)
    } else {
      setNotifToast('Notifications blocked. You can enable them in browser settings.')
      setTimeout(() => setNotifToast(null), 4000)
    }
  }

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

    const mapped = data.map((b) => ({
      ...b,
      taskerName: taskerMap[b.tasker_id]?.name ?? '—',
      taskerUserId: taskerMap[b.tasker_id]?.user_id ?? null,
    }))

    // Auto-cancel confirmed bookings where tasker didn't respond within 30 minutes
    const noResponseOverdue = mapped.filter(b =>
      b.status === 'confirmed' &&
      b.confirmed_at &&
      new Date(b.confirmed_at) < new Date(Date.now() - 30 * 60 * 1000)
    )
    for (const b of noResponseOverdue) {
      const refundAmount = Number(b.estimated_total) || 0
      const updatePayload = {
        status: 'cancelled',
        cancellation_reason: 'Tasker did not respond within 30 minutes',
        ...(refundAmount > 0 ? { is_refunded: true } : {}),
      }
      const { error: cancelErr } = await supabase.from('bookings').update(updatePayload).eq('id', b.id)
      if (!cancelErr) {
        if (refundAmount > 0) {
          await supabase.rpc('increment_wallet_balance', { target_user_id: uid, increment_amount: refundAmount })
          await supabase.from('wallet_transactions').insert({
            user_id: uid,
            booking_id: b.id,
            amount: refundAmount,
            type: 'credit',
            description: `Auto-refund — tasker did not respond within 30 minutes (Booking ${b.reference_number ?? b.id})`,
          })
        }
        await supabase.from('notifications').insert({
          user_id: uid,
          title: 'Booking Auto-Cancelled',
          message: `Your booking (${b.reference_number ?? b.id}) was automatically cancelled because the tasker did not respond within 30 minutes.${refundAmount > 0 ? ` A full refund of ₱${refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been credited to your Hanap.ph E-wallet.` : ''}`,
          is_read: false,
        })
        if (b.taskerUserId) {
          await supabase.from('notifications').insert({
            user_id: b.taskerUserId,
            title: 'Booking Auto-Cancelled',
            message: `Booking ${b.reference_number ?? b.id} (${b.service ?? ''}) was automatically cancelled because you did not respond within 30 minutes.`,
            is_read: false,
          })
        }
      }
    }
    if (noResponseOverdue.length > 0) { load(uid); return }

    // Auto-complete any pending_confirmation booking that has been waiting > 24 hours
    const overdue = mapped.filter(b =>
      b.status === 'pending_confirmation' &&
      b.pending_confirmation_at &&
      new Date(b.pending_confirmation_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
    )
    for (const b of overdue) {
      const platform_fee = b.estimated_total != null ? b.estimated_total * 0.10 : null
      const tasker_payout = b.estimated_total != null ? b.estimated_total * 0.90 : null
      const updatePayload = { status: 'completed' }
      if (platform_fee != null) {
        updatePayload.platform_fee = platform_fee
        updatePayload.tasker_payout = tasker_payout
      }
      const { error } = await supabase.from('bookings').update(updatePayload).eq('id', b.id)
      if (!error && tasker_payout && b.taskerUserId) {
        await supabase.rpc('increment_wallet_balance', { target_user_id: b.taskerUserId, increment_amount: tasker_payout })
        await supabase.from('wallet_transactions').insert({
          user_id: b.taskerUserId,
          booking_id: b.id,
          amount: tasker_payout,
          type: 'credit',
          description: `Auto-completed earnings from booking ${b.reference_number ?? b.id}`,
        })
        await supabase.from('notifications').insert({
          user_id: b.taskerUserId,
          title: 'Job Auto-Confirmed',
          message: 'Your job has been automatically confirmed after 24 hours. Your earnings have been added to your wallet.',
          is_read: false,
        })
      }
    }
    if (overdue.length > 0) { load(uid); return }

    setBookings(mapped)
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/'); return }
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

      const { data: taskerRow } = await supabase
        .from('taskers')
        .select('id')
        .eq('user_id', uid)
        .eq('status', 'interview_scheduled')
        .maybeSingle()

      if (taskerRow) {
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', uid)
          .ilike('title', '%Interview Scheduled%')
          .order('created_at', { ascending: false })
          .limit(1)
        if (notifs?.[0]) setInterviewNotif(notifs[0])
      }

      const { data: approvedRow } = await supabase
        .from('taskers')
        .select('id')
        .eq('user_id', uid)
        .eq('status', 'approved')
        .maybeSingle()

      if (approvedRow) {
        const { data: welcomeNotifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', uid)
          .ilike('title', '%Welcome to the Team%')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(1)
        if (welcomeNotifs?.[0]) setWelcomeNotif(welcomeNotifs[0])
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!welcomeNotif) return
    const duration = 3500
    const end = Date.now() + duration
    const colors = ['#f97316', '#facc15', '#34d399', '#60a5fa', '#f472b6', '#a78bfa']
    ;(function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    })()
  }, [welcomeNotif])

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
      }, (payload) => {
        fetchNotifications()
        if (payload.eventType === 'INSERT' && 'Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(payload.new.title ?? 'New Notification', {
            body: payload.new.message ?? '',
            icon: '/LOGO.svg',
            badge: '/LOGO.svg',
            tag: payload.new.id,
          })
          n.onclick = () => {
            window.focus()
            const isInterview = (payload.new.title ?? '').includes('Interview Scheduled')
            setTab(isInterview ? 'notifications' : 'bookings')
          }
        }
      })
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

  async function deleteNotif(id) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id)
      if (target && !target.is_read) setUnreadNotifCount((c) => Math.max(0, c - 1))
      return prev.filter((n) => n.id !== id)
    })
  }

  async function handleLogout() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      await supabase.from('user_sessions')
        .update({ time_out: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .is('time_out', null)
    }
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

      {/* Welcome to the Team Modal */}
      {welcomeNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-5 text-white text-center">
              <p className="text-3xl mb-1">🎉</p>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-0.5">Tasker Application</p>
              <h2 className="text-lg font-bold">Welcome to the Team!</h2>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>{welcomeNotif.message}</p>
              <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 text-xs text-orange-700">
                Your tasker profile is now live. You can start accepting bookings right away!
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={async () => {
                  await supabase.from('notifications').update({ is_read: true }).eq('id', welcomeNotif.id)
                  setWelcomeNotif(null)
                }}
                className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
              >Let's Go!</button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Scheduled Modal */}
      {interviewNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-orange-500 px-5 py-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-0.5">Tasker Application Update</p>
              <h2 className="text-base font-bold">You've Passed the Initial Screening!</h2>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>{interviewNotif.message}</p>
              <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 text-xs text-orange-700">
                Please bring a valid government-issued ID on the day of your interview.
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setInterviewNotif(null)}
                className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
              >Got it!</button>
            </div>
          </div>
        </div>
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

        {/* Push notification permission banner */}
        {showNotifBanner && (
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border-b border-orange-100">
            <Bell size={18} className="text-orange-500 flex-shrink-0" />
            <p className="text-sm text-gray-700 flex-1">Get notified about your bookings in real time.</p>
            <button
              onClick={handleEnableNotifications}
              className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              Enable Notifications
            </button>
            <button
              onClick={() => setShowNotifBanner(false)}
              className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              Maybe Later
            </button>
          </div>
        )}

        {/* Notification toast */}
        {notifToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg pointer-events-none">
            {notifToast}
          </div>
        )}

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
                  {/* Search bar */}
                  <div className="relative mb-4">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="Search by service, tasker name or reference number…"
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                    {bookingSearch && (
                      <button
                        onClick={() => setBookingSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Status filter toggles */}
                  <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                      { value: 'all',             label: 'All' },
                      { value: 'pending_payment', label: 'Payment Incomplete' },
                      { value: 'confirmed',       label: 'Pending Booking' },
                      { value: 'accepted',        label: 'Accepted' },
                      { value: 'on_the_way',      label: 'On The Way' },
                      { value: 'in_progress',     label: 'In Progress' },
                      { value: 'completed',       label: 'Completed' },
                      { value: 'cancelled',       label: 'Cancelled' },
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
                    {(() => {
                      const q = bookingSearch.trim().toLowerCase()
                      const filtered = bookings.filter((b) => {
                        const matchesStatus = bookingFilter === 'all' || b.status === bookingFilter
                        const matchesSearch = !q ||
                          (b.service ?? '').toLowerCase().includes(q) ||
                          (b.tasker_name ?? '').toLowerCase().includes(q) ||
                          (b.reference_number ?? '').toLowerCase().includes(q)
                        return matchesStatus && matchesSearch
                      })
                      if (filtered.length === 0) return (
                        <p className="text-center text-gray-400 py-10">
                          {bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your search.'}
                        </p>
                      )
                      return filtered.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} userId={userId} onCancel={() => load(userId)} />
                      ))
                    })()}
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
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markOneNotifRead(n.id)
                        const isStay = (n.title ?? '').includes('📢') || (n.title ?? '').includes('Interview Scheduled') || (n.title ?? '').includes('Welcome')
                        if (!isStay) setTab('bookings')
                      }}
                      className={`w-full text-left rounded-2xl px-4 py-4 border transition-colors cursor-pointer ${
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
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotif(n.id) }}
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors text-xs font-bold leading-none"
                            title="Dismiss"
                          >✕</button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>
                    </div>
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
