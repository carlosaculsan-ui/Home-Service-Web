import { useState, useEffect, useRef, useCallback } from 'react'
import confetti from 'canvas-confetti'
import gcashLogo from '../Assets/GCash_logo.png'
import mayaLogo from '../Assets/Maya_logo.png'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import LocationMap from '../Components/LocationMap'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  Phone, Bot, Car, Wrench, CheckCircle2, MapPin,
  CalendarCheck, CalendarOff, Wallet, Star, UserCog, History,
  LogOut, Menu, X, MessageSquare, Headset, Home, Bell, ChevronLeft, ChevronRight, Gamepad2,
} from 'lucide-react'
import ChatModal from '../Components/ChatModal'
import BreakRoom from '../Components/BreakRoom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const LEAVE_STATUS_STYLES = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700',
  confirmed:   'bg-amber-100 text-amber-700',
  accept:      'bg-blue-100 text-blue-700',
  accepted:    'bg-green-100 text-green-700',
  on_the_way:  'bg-blue-100 text-blue-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-gray-100 text-gray-600',
  rejected:    'bg-red-100 text-red-600',
  cancelled:   'bg-gray-100 text-gray-500',
}

const STATUS_LABELS = {
  confirmed:   'New Booking',
  accepted:    'Accepted',
  on_the_way:  'On The Way',
  in_progress: 'In Progress',
  completed:   'Completed',
  rejected:    'Rejected',
}

const NAV_ITEMS = [
  { key: 'notifications',  label: 'Notifications',     icon: Bell },
  { key: 'bookings',       label: 'Bookings',          icon: CalendarCheck },
  { key: 'leave',          label: 'Leave Request',     icon: CalendarOff },
  { key: 'earnings',       label: 'Earnings Summary',  icon: Wallet },
  { key: 'profile',        label: 'Profile Management',icon: UserCog },
  { key: 'history',        label: 'Booking History',   icon: History },
  { key: 'contact-admin',  label: 'Contact Admin',     icon: Headset },
]

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

const getTaskLabel = (booking) => {
  const opts = booking.task_options
  if (!opts) return booking.task_size || 'N/A'
  return opts.type || opts.problem || opts.what_to_paint || opts.aircon_type || opts.service_type || booking.task_size || 'N/A'
}

// ─── Propose Modal ──────────────────────────────────────────────────────────

function ProposeModal({ booking, taskerUserId, onClose, onSuccess }) {
  const [options, setOptions] = useState([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' },
  ])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  function updateOption(index, field, value) {
    setOptions((prev) => prev.map((o, i) => i === index ? { ...o, [field]: value } : o))
  }

  async function handleSend() {
    const filled = options.filter((o) => o.date.trim())
    if (filled.length === 0) {
      setError('Please fill in at least one date option.')
      return
    }
    setSending(true)
    setError('')

    const dateList = filled
      .map((o, i) => `Option ${i + 1}: ${o.date}${o.time ? ' at ' + o.time : ''}`)
      .join(', ')
    const content = `Your rebook request was declined. I'd like to propose these alternative dates: ${dateList}.${message.trim() ? ' ' + message.trim() : ''}`

    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        rebook_status: 'proposed',
        proposed_dates: JSON.stringify(filled),
      })
      .eq('id', booking.id)

    if (updateErr) {
      setError('Failed to send proposal. Try again.')
      setSending(false)
      return
    }

    await supabase.from('messages').insert({
      booking_id: booking.id,
      sender_id: taskerUserId,
      receiver_id: booking.client_id,
      content,
      is_read: false,
    })

    setSending(false)
    onSuccess()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="font-bold text-gray-800 text-base">Propose Alternative Dates</p>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: '65vh' }}>
            {options.map((opt, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-600">Option {i + 1}</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={opt.date}
                    onChange={(e) => updateOption(i, 'date', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400 transition-colors"
                  />
                  <input
                    type="time"
                    value={opt.time}
                    onChange={(e) => updateOption(i, 'time', e.target.value)}
                    className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400 transition-colors"
                  />
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-gray-600">
                Add a message to the customer <span className="text-xs text-gray-400 font-normal">(optional)</span>
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. I'm unavailable on your requested date but happy to help on any of these!"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400 transition-colors resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {sending ? 'Sending…' : 'Send Proposal'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Reject Modal ────────────────────────────────────────────────────────────

const REJECT_REASONS = [
  'I am unavailable on this date',
  'The location is too far',
  'The task is outside my expertise',
  'I already have too many bookings',
  'The task details are incomplete',
  'Other',
]

function RejectModal({ onClose, onConfirm, loading }) {
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

        {/* Screen 1 — Warning */}
        {screen === 1 && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Reject this booking?</h2>
              <p className="text-sm text-gray-600 mb-1">
                The customer will be notified of your rejection.
              </p>
              <p className="text-sm text-gray-500">
                Please provide a reason so the customer understands.
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
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Screen 2 — Reason */}
        {screen === 2 && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Why are you rejecting?</h2>

            <div className="space-y-2 mb-4">
              {REJECT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reject-reason"
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
              Additional note{' '}
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

            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setScreen(1)}
                className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm || loading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Task Card ──────────────────────────────────────────────────────────────

// ─── Navigation Overlay (Angkas / MoveIt style) ──────────────────────────────

function haversineDist([lat1, lng1], [lat2, lng2]) {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getRemainingPoints(pos, points) {
  if (!points.length) return [pos]
  let idx = 0, best = Infinity
  for (let i = 0; i < points.length; i++) {
    const d = haversineDist(pos, points[i])
    if (d < best) { best = d; idx = i }
  }
  return [pos, ...points.slice(idx)]
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

// Inner map component — runs inside MapContainer via useMap
function NavigationMapContent({ taskerPos, customerPos, onRouteUpdate }) {
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

  // Place / move markers and fit bounds
  useEffect(() => {
    if (taskerPos) {
      // Update bearing if we have a previous position and moved meaningfully
      if (prevPosRef.current && haversineDist(prevPosRef.current, taskerPos) > 3) {
        bearingRef.current = calcBearing(prevPosRef.current, taskerPos)
      }
      prevPosRef.current = taskerPos

      if (!taskerMarkerRef.current) {
        taskerMarkerRef.current = L.marker(taskerPos, { icon: makeArrowIcon(bearingRef.current) })
          .addTo(map)
          .bindPopup('You are here')
      } else {
        taskerMarkerRef.current.setLatLng(taskerPos)
        taskerMarkerRef.current.setIcon(makeArrowIcon(bearingRef.current))
      }
    }
    if (customerPos && !customerMarkerRef.current) {
      const icon = L.divIcon({
        html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">🏠</div>',
        className: '', iconSize: [32, 32], iconAnchor: [16, 16],
      })
      customerMarkerRef.current = L.marker(customerPos, { icon }).addTo(map).bindPopup('Customer')
    }
    if (taskerPos && customerPos) {
      map.fitBounds([taskerPos, customerPos], { padding: [80, 80] })
    } else if (taskerPos) {
      map.setView(taskerPos, 16)
    }
  }, [taskerPos, customerPos])

  // Fetch OSRM once when both positions are known
  useEffect(() => {
    if (!taskerPos || !customerPos || fetchedRef.current) return
    fetchedRef.current = true
    const [tLat, tLng] = taskerPos
    const [cLat, cLng] = customerPos
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${tLng},${tLat};${cLng},${cLat}?overview=full&geometries=geojson&steps=true&annotations=false`,
      { headers: { 'User-Agent': 'HanapPH/1.0' } }
    )
      .then(r => r.json())
      .then(data => {
        if (data?.code !== 'Ok') throw new Error()
        const route  = data.routes[0]
        totalDistRef.current = route.distance
        totalDurRef.current  = route.duration
        const points = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        routePointsRef.current = points

        if (!fullPolyRef.current) {
          fullPolyRef.current = L.polyline(points, { color: '#9ca3af', weight: 8, opacity: 0.25 }).addTo(map)
        } else {
          fullPolyRef.current.setLatLngs(points)
        }

        const remaining = getRemainingPoints(taskerPos, points)
        if (!remainPolyRef.current) {
          remainPolyRef.current = L.polyline(remaining, { color: '#f97316', weight: 6 }).addTo(map)
        } else {
          remainPolyRef.current.setLatLngs(remaining)
        }

        const remainDist = calcPathDist(remaining)
        const remainSec  = route.duration > 0 ? (remainDist / route.distance) * route.duration : 0
        onRouteUpdate(remainDist, remainSec)
      })
      .catch(() => {
        // Fallback — straight dashed line, straight-line distance
        if (taskerPos && customerPos) {
          if (!remainPolyRef.current)
            remainPolyRef.current = L.polyline([taskerPos, customerPos], { color: '#f97316', weight: 4, dashArray: '8,8' }).addTo(map)
          onRouteUpdate(haversineDist(taskerPos, customerPos), null)
        }
      })
  }, [taskerPos, customerPos])

  // Trim remaining route on every GPS tick — no re-fetch
  useEffect(() => {
    if (!taskerPos || !routePointsRef.current.length || !remainPolyRef.current) return
    const remaining  = getRemainingPoints(taskerPos, routePointsRef.current)
    remainPolyRef.current.setLatLngs(remaining)
    const remainDist = calcPathDist(remaining)
    const remainSec  = totalDistRef.current > 0
      ? (remainDist / totalDistRef.current) * totalDurRef.current
      : null
    onRouteUpdate(remainDist, remainSec)
  }, [taskerPos])

  return null
}

let _geocodeSlot = 0  // shared slot counter — staggers Nominatim requests 1.2 s apart
const NOMINATIM_BASE = import.meta.env.DEV ? '/nominatim' : 'https://nominatim.openstreetmap.org'

// Full-screen navigation overlay — Angkas / MoveIt style
function NavigationOverlay({ address, onClose, onStartJob, actionLoading }) {
  const [taskerPos,  setTaskerPos]  = useState(null)
  const [customerPos, setCustomerPos] = useState(null)
  const [remainDist, setRemainDist] = useState(null)   // metres
  const [remainSec,  setRemainSec]  = useState(null)   // seconds
  const watchIdRef = useRef(null)

  // Own GPS — read-only, does NOT touch the broadcast channel
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (pos) => setTaskerPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    watchIdRef.current = id
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // Customer geocoding — full address, slotted to avoid Nominatim rate-limit
  useEffect(() => {
    if (!address) return
    const slot  = _geocodeSlot++
    const delay = 800 + slot * 1200
    const timer = setTimeout(() => {
      fetch(`${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&countrycodes=ph`)
        .then(r => r.json())
        .then(data => {
          if (data?.length > 0) setCustomerPos([parseFloat(data[0].lat), parseFloat(data[0].lon)])
        })
        .catch(() => {})
    }, delay)
    return () => clearTimeout(timer)
  }, [address])

  const handleRouteUpdate = useCallback((dist, sec) => {
    setRemainDist(dist)
    setRemainSec(sec)
  }, [])

  const center   = taskerPos ?? customerPos ?? [14.5995, 120.9842]
  const distKm   = remainDist != null ? (remainDist / 1000).toFixed(1) : '—'
  const etaLabel = remainSec  != null ? formatETA(remainSec) : '—'

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
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontWeight: 700, fontSize: '16px', color: '#1f2937' }}>
              🔵 Navigating to customer
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
              Live route updates as you move
            </p>
          </div>

          {/* Map */}
          <div style={{ height: '340px', position: 'relative' }}>
            {!taskerPos && !customerPos ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', flexDirection: 'column', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', border: '4px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>Getting your location…</p>
              </div>
            ) : (
              <MapContainer
                center={center}
                zoom={14}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <NavigationMapContent
                  taskerPos={taskerPos}
                  customerPos={customerPos}
                  onRouteUpdate={handleRouteUpdate}
                />
              </MapContainer>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: '26px', fontWeight: 900, color: '#111827', lineHeight: 1 }}>{distKm}</p>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>km away</p>
            </div>
            <div style={{ width: '1px', height: '40px', background: '#e5e7eb' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: '26px', fontWeight: 900, color: '#f97316', lineHeight: 1 }}>{etaLabel}</p>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>est. arrival</p>
            </div>
            <div style={{ width: '1px', height: '40px', background: '#e5e7eb' }} />
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={14} style={{ color: '#f97316', flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: '#374151', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{address}</p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={onStartJob}
              disabled={actionLoading}
              style={{ flex: 1, padding: '10px', background: '#f97316', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
            >
              {actionLoading ? 'Updating…' : "I've Arrived — Start Job"}
            </button>
            <button
              onClick={onClose}
              style={{ padding: '10px 16px', background: '#f3f4f6', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', color: '#374151', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function TaskCard({ booking, onStatusChange, currentUserId }) {
  const [actionLoading, setActionLoading] = useState(null)
  const [statusError, setStatusError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showProposeModal, setShowProposeModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [toast, setToast] = useState('')
  const [sharingLocation, setSharingLocation] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const watchIdRef = useRef(null)
  const locationChannelRef = useRef(null)

  function startLocationSharing() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted — start watching
        const channel = supabase.channel(`tasker-location-${booking.id}`)
        channel.subscribe()
        locationChannelRef.current = channel

        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords
            // Broadcast to Realtime
            channel.send({ type: 'broadcast', event: 'location', payload: { lat, lng } })
            // Persist to DB
            supabase.from('bookings').update({ tasker_lat: lat, tasker_lng: lng }).eq('id', booking.id)
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        )
        watchIdRef.current = watchId
        setSharingLocation(true)
      },
      () => {
        alert('Location permission is required to share your location with the customer.')
      }
    )
  }

  function stopLocationSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (locationChannelRef.current) {
      supabase.removeChannel(locationChannelRef.current)
      locationChannelRef.current = null
    }
    setSharingLocation(false)
  }

  // Stop sharing if booking moves away from on_the_way
  useEffect(() => {
    if (booking.status !== 'on_the_way' && sharingLocation) {
      stopLocationSharing()
    }
  }, [booking.status])

  function handleProposeSent() {
    setShowProposeModal(false)
    setToast('Proposal sent to customer!')
    setTimeout(() => setToast(''), 3000)
    onStatusChange()
  }
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status?.replace('_', ' ') ?? 'pending'
  const statusClass = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending

  useEffect(() => {
    if (booking.status === 'cancelled' || !currentUserId) return
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', booking.id)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0))

    const channel = supabase
      .channel(`unread-tasker-${booking.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${booking.id}`,
      }, (payload) => {
        if (payload.new.receiver_id === currentUserId && !payload.new.is_read) {
          setUnreadCount((n) => n + 1)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [booking.id, booking.status, currentUserId])

  async function handleAction(newStatus) {
    if (newStatus === 'completed') {
      if (!window.confirm('Mark this job as complete? The customer will be notified to leave a review.')) return
    }
    setActionLoading(newStatus)
    setStatusError('')
    const updatePayload = { status: newStatus }
    if (newStatus === 'completed' && booking.estimated_total != null) {
      updatePayload.platform_fee = booking.estimated_total * 0.10
      updatePayload.tasker_payout = booking.estimated_total * 0.90
    }
    const { error } = await supabase.from('bookings').update(updatePayload).eq('id', booking.id)
    setActionLoading(null)
    if (error) {
      setStatusError('Failed to update status. Try again.')
      return
    }

    // Credit tasker wallet on completion
    if (newStatus === 'completed' && updatePayload.tasker_payout && currentUserId) {
      const payout = updatePayload.tasker_payout
      await supabase.rpc('increment_wallet_balance', {
        target_user_id: currentUserId,
        increment_amount: payout,
      })
      await supabase.from('wallet_transactions').insert({
        user_id: currentUserId,
        booking_id: booking.id,
        amount: payout,
        type: 'credit',
        description: `Earnings from booking ${booking.reference_number ?? booking.id}`,
      })
    }

    // Notify customer of status change
    if (booking.client_id) {
      const statusMessages = {
        accepted: 'Your booking has been accepted by your tasker.',
        rejected: 'Your booking has been declined by your tasker.',
        on_the_way: 'Your tasker is on the way to your location.',
        in_progress: 'Your tasker has started working on your task.',
        completed: 'Your task has been completed. Please leave a review!',
      }
      await supabase.from('notifications').insert({
        user_id: booking.client_id,
        title: 'Booking Update',
        message: statusMessages[newStatus] ?? `Your booking status is now ${newStatus}.`,
        is_read: false,
      })
    }

    if (newStatus === 'on_the_way') startLocationSharing()
    if (newStatus === 'in_progress') stopLocationSharing()
    onStatusChange()
  }

  async function handleReject(reason, note) {
    setActionLoading('rejected')
    setStatusError('')
    const { error } = await supabase.from('bookings').update({
      status: 'rejected',
      rejection_reason: reason,
      rejection_note: note || null,
    }).eq('id', booking.id)
    setActionLoading(null)
    if (error) {
      setStatusError('Failed to reject booking. Try again.')
      return
    }

    // Auto-refund to customer's Hanap.ph wallet
    const refundAmount = Number(booking.estimated_total) || 0
    const customerId = booking.client_id
    if (refundAmount > 0 && customerId) {
      try {
        await supabase.rpc('increment_wallet_balance', {
          target_user_id: customerId,
          increment_amount: refundAmount,
        })

        await supabase.from('wallet_transactions').insert({
          user_id: customerId,
          booking_id: booking.id,
          amount: refundAmount,
          type: 'credit',
          description: 'Refund issued — tasker rejected your booking',
          created_at: new Date().toISOString(),
        })

        await supabase.from('bookings').update({ is_refunded: true }).eq('id', booking.id)
      } catch (refundErr) {
        console.error('Auto-refund failed (rejection still processed):', refundErr)
      }
    }

    const refundNote = refundAmount > 0
      ? ` A full refund of ₱${refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been credited to your Hanap.ph E-wallet.`
      : ''
    if (customerId) {
      await supabase.from('notifications').insert({
        user_id: customerId,
        title: 'Booking Rejected',
        message: `Your booking has been rejected by the tasker. Reason: ${reason}.${refundNote}`,
        is_read: false,
      })
    }

    setShowRejectModal(false)
    onStatusChange()
  }

  return (
    <>
      {showChat && booking.client_id && (
        <ChatModal
          bookingId={booking.id}
          currentUserId={currentUserId}
          otherUserId={booking.client_id}
          otherUserName={booking.customer_name ?? 'Customer'}
          onClose={() => { setShowChat(false); setUnreadCount(0) }}
        />
      )}

      {showProposeModal && (
        <ProposeModal
          booking={booking}
          taskerUserId={currentUserId}
          onClose={() => setShowProposeModal(false)}
          onSuccess={handleProposeSent}
        />
      )}

      {showRejectModal && (
        <RejectModal
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
          loading={actionLoading === 'rejected'}
        />
      )}

      {showNav && booking.address && (
        <NavigationOverlay
          address={booking.address}
          onClose={() => setShowNav(false)}
          onStartJob={() => { handleAction('in_progress'); setShowNav(false) }}
          actionLoading={actionLoading === 'in_progress'}
        />
      )}

    <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
      {toast && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="font-bold text-gray-800 capitalize text-lg">{booking.service}</p>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
          booking.status === 'cancelled' ? 'bg-red-100 text-red-600' : statusClass
        }`}>
          {booking.status === 'cancelled' ? 'Cancelled by Customer' : statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {[
          ['Date & Time', fmtHistoryDate(booking.scheduled_date, booking.scheduled_time)],
          ['Booked on',  booking.created_at
            ? (() => { const d = new Date(booking.created_at); return `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` })()
            : '—'],
          ['Task Size',   getTaskLabel(booking)],
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
          ['Address',     booking.address ?? '—'],
          ...(booking.landmark ? [['Landmark', booking.landmark]] : []),
          ['Reference',   booking.reference_number ?? '—'],
        ].map(([label, val]) => (
          <div key={label} className="flex gap-2">
            <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
            <span className="text-gray-700">{val}</span>
          </div>
        ))}

        {/* Customer name — always visible */}
        <div className="flex gap-2">
          <span className="text-gray-400 w-28 flex-shrink-0">Customer</span>
          <span className="text-gray-700">{booking.customer_name ?? 'Unknown'}</span>
        </div>

        {/* Phone */}
        <div className="flex gap-2">
          <span className="text-gray-400 w-28 flex-shrink-0">Phone</span>
          {booking.customer_phone
            ? <a href={`tel:${booking.customer_phone}`} className="text-orange-500 underline font-medium flex items-center gap-1"><Phone size={14} />{booking.customer_phone}</a>
            : <span className="text-gray-700">Not provided</span>
          }
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
            <div className="flex justify-between text-green-700 font-medium">
              <span>Your Payout (90%)</span>
              <span>{fmt(booking.tasker_payout)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Platform Fee (10%)</span>
              <span>{fmt(booking.platform_fee)}</span>
            </div>
          </div>
        )
      })()}

      {booking.task_description && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-gray-400 font-medium">Task Description: </span>{booking.task_description}
        </div>
      )}

      {booking.ai_image_analysis && (
        <div className="text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-800">
          <span className="font-semibold flex items-center gap-1 inline-flex"><Bot size={14} /> AI Analysis: </span>{booking.ai_image_analysis}
        </div>
      )}

      {booking.status === 'cancelled' && booking.cancellation_reason && (
        <div className="text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 space-y-1">
          <p className="text-gray-700">❌ <span className="font-medium">Reason:</span> {booking.cancellation_reason}</p>
          {booking.cancellation_note && (
            <p className="text-gray-700">📝 <span className="font-medium">Note:</span> {booking.cancellation_note}</p>
          )}
        </div>
      )}

      {booking.address && (
        booking.status === 'on_the_way'
          ? (
            <button
              onClick={() => setShowNav(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Car size={17} />
              Open Navigation
            </button>
          )
          : <LocationMap address={booking.address} />
      )}

      {/* Accept / Reject — confirmed only */}
      {booking.status === 'confirmed' && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleAction('accepted')}
            disabled={actionLoading !== null}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
          >
            {actionLoading === 'accepted' ? 'Accepting…' : 'Accept'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={actionLoading !== null}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
          >
            Reject
          </button>
          {booking.is_rebook && (
            <button
              onClick={() => setShowProposeModal(true)}
              disabled={actionLoading !== null}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg border border-orange-400 text-orange-500 bg-white hover:bg-orange-50 disabled:opacity-50 transition-colors"
            >
              Reject &amp; Propose
            </button>
          )}
        </div>
      )}

      {/* Reject & Propose — pending rebook only */}
      {booking.status === 'pending' && booking.is_rebook && (
        <div className="pt-1">
          <button
            onClick={() => setShowProposeModal(true)}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg border border-orange-400 text-orange-500 bg-white hover:bg-orange-50 transition-colors"
          >
            Reject &amp; Propose
          </button>
        </div>
      )}

      {/* I'm On My Way — accepted only */}
      {booking.status === 'accepted' && (
        <div className="pt-1">
          <button
            onClick={() => handleAction('on_the_way')}
            disabled={actionLoading !== null}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {actionLoading === 'on_the_way' ? 'Updating…' : <span className="flex items-center gap-1"><Car size={15} />I'm On My Way</span>}
          </button>
        </div>
      )}

      {/* Start Job — on_the_way only */}
      {booking.status === 'on_the_way' && (
        <div className="pt-1">
          <button
            onClick={() => handleAction('in_progress')}
            disabled={actionLoading !== null}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {actionLoading === 'in_progress' ? 'Updating…' : <span className="flex items-center gap-1"><Wrench size={15} />Start Job</span>}
          </button>
        </div>
      )}

      {/* Complete Job — in_progress only */}
      {booking.status === 'in_progress' && (
        <div className="pt-1">
          <button
            onClick={() => handleAction('completed')}
            disabled={actionLoading !== null}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
          >
            {actionLoading === 'completed' ? 'Updating…' : <span className="flex items-center gap-1"><CheckCircle2 size={15} />Complete Job</span>}
          </button>
        </div>
      )}

      {sharingLocation && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
          <span>📍 Your location is being shared with the customer</span>
          <button
            onClick={stopLocationSharing}
            className="text-xs font-semibold text-green-700 underline hover:text-green-900 flex-shrink-0"
          >
            Stop Sharing
          </button>
        </div>
      )}

      {statusError && (
        <p className="text-xs text-red-500">{statusError}</p>
      )}

      {booking.status !== 'cancelled' && booking.client_id && (
        <div className="pt-1">
          <button
            onClick={() => setShowChat(true)}
            className="flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-600 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors relative"
          >
            <MessageSquare size={15} />
            Message Customer
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

// ─── Leave Request Section ───────────────────────────────────────────────────

function formatDateRanges(isoDateArray) {
  if (!isoDateArray.length) return ''
  const sorted = [...isoDateArray].sort()
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  // Group consecutive dates into ranges
  const ranges = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(prev + 'T00:00:00')
    const currDate = new Date(sorted[i] + 'T00:00:00')
    const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24)
    if (diffDays === 1) {
      prev = sorted[i]
    } else {
      ranges.push([start, prev])
      start = sorted[i]
      prev = sorted[i]
    }
  }
  ranges.push([start, prev])

  return ranges.map(([from, to]) => {
    const d1 = new Date(from + 'T00:00:00')
    const d2 = new Date(to + 'T00:00:00')
    if (from === to) {
      return `${MONTHS[d1.getMonth()]} ${d1.getDate()}`
    }
    if (d1.getMonth() === d2.getMonth()) {
      return `${MONTHS[d1.getMonth()]} ${d1.getDate()}-${d2.getDate()}`
    }
    return `${MONTHS[d1.getMonth()]} ${d1.getDate()} – ${MONTHS[d2.getMonth()]} ${d2.getDate()}`
  }).join(', ')
}

function LeaveRequestSection({ taskerId }) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [selectedDates, setSelectedDates] = useState(new Set())
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [leaves, setLeaves] = useState([])
  const [leavesLoading, setLeavesLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState('')

  async function handleCancelLeave(id) {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return
    setCancellingId(id)
    setCancelError('')
    const { error } = await supabase.from('tasker_leaves').delete().eq('id', id)
    setCancellingId(null)
    if (error) {
      setCancelError('Failed to cancel. Please try again.')
      return
    }
    setLeaves((prev) => prev.filter((l) => l.id !== id))
  }

  async function loadLeaves() {
    const { data } = await supabase
      .from('tasker_leaves')
      .select('*')
      .eq('tasker_id', taskerId)
      .order('created_at', { ascending: false })
    setLeaves(data ?? [])
    setLeavesLoading(false)
  }

  useEffect(() => { loadLeaves() }, [taskerId])

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const toISO = (d) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${viewYear}-${mm}-${dd}`
  }
  const isPast = (d) => new Date(viewYear, viewMonth, d) < todayStart
  const isSelected = (d) => selectedDates.has(toISO(d))

  const toggleDate = (d) => {
    if (!d || isPast(d)) return
    const iso = toISO(d)
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(iso)) next.delete(iso)
      else next.add(iso)
      return next
    })
  }

  const canGoPrev = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth())
  const goToPrev = () => {
    if (!canGoPrev) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  async function handleSubmit() {
    if (selectedDates.size === 0 || !reason.trim()) return
    setSubmitError('')
    setSubmitting(true)

    const { data: existing } = await supabase
      .from('tasker_leaves')
      .select('leave_dates')
      .eq('tasker_id', taskerId)
      .in('status', ['pending', 'approved'])

    const existingDates = (existing ?? []).flatMap((r) => {
      try { return JSON.parse(r.leave_dates) } catch { return [] }
    })

    const conflicts = [...selectedDates].filter((d) => existingDates.includes(d))
    if (conflicts.length > 0) {
      setSubmitError(`You already have a leave request for: ${conflicts.sort().join(', ')}. Please remove those dates before submitting.`)
      setSubmitting(false)
      return
    }

    const sorted = [...selectedDates].sort()
    await supabase.from('tasker_leaves').insert({
      tasker_id: taskerId,
      leave_dates: JSON.stringify(sorted),
      reason: reason.trim(),
      status: 'pending',
    })
    setSelectedDates(new Set())
    setReason('')
    setSubmitting(false)
    loadLeaves()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-gray-800 text-lg mb-4">Select Leave Dates</h3>

        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPrev}
            disabled={!canGoPrev}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-30 text-lg"
          >‹</button>
          <span className="font-bold text-gray-800">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button
            onClick={goToNext}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg"
          >›</button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 mb-4">
          {cells.map((d, i) => (
            <div key={i} className="flex items-center justify-center">
              {d ? (
                <button
                  onClick={() => toggleDate(d)}
                  disabled={isPast(d)}
                  className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors
                    ${isSelected(d)
                      ? 'bg-orange-500 text-white font-bold'
                      : isPast(d)
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-orange-100 cursor-pointer'
                    }`}
                >
                  {d}
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {selectedDates.size > 0 && (
          <p className="text-xs text-orange-600 font-medium mb-3">
            {selectedDates.size} date{selectedDates.size > 1 ? 's' : ''} selected: {formatDateRanges([...selectedDates])}
          </p>
        )}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for leave..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 resize-none mb-3"
        />

        <button
          onClick={handleSubmit}
          disabled={submitting || selectedDates.size === 0 || !reason.trim()}
          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Leave Request'}
        </button>
        {submitError && (
          <p className="text-xs text-red-500 mt-2">{submitError}</p>
        )}
      </div>

      {leavesLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leaves.length === 0 ? (
        <p className="text-center text-gray-400 text-sm">No leave requests yet.</p>
      ) : (
        <div className="space-y-3">
          {leaves.map((leave) => {
            const dates = (() => { try { return JSON.parse(leave.leave_dates) } catch { return [] } })()
            const statusClass = LEAVE_STATUS_STYLES[leave.status] ?? 'bg-gray-100 text-gray-600'
            return (
              <div key={leave.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    {dates.length} day{dates.length !== 1 ? 's' : ''}: {dates.join(', ')}
                  </p>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusClass}`}>
                    {leave.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{leave.reason}</p>
                {leave.status === 'pending' && (
                  <div className="flex items-center justify-end mt-3 gap-2">
                    {cancelError && cancellingId === null && (
                      <p className="text-xs text-red-500">{cancelError}</p>
                    )}
                    <button
                      onClick={() => handleCancelLeave(leave.id)}
                      disabled={cancellingId === leave.id}
                      className="text-xs font-semibold text-gray-500 border border-gray-300 hover:border-gray-400 hover:text-gray-700 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {cancellingId === leave.id ? 'Cancelling…' : 'Cancel Request'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function TaskerSidebar({ tab, setTab, taskerName, taskerEmail, taskerUserId, onLogout, onClose, unreadNotifCount = 0, setUnreadNotifCount, setNotifTabOpen }) {
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
            <p className="text-orange-200 text-xs">Tasker Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={async () => {
              setTab(key);
              onClose?.();
              if (key === 'notifications') {
                setUnreadNotifCount(0);
                await supabase
                  .from('notifications')
                  .update({ is_read: true })
                  .eq('user_id', taskerUserId)
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                setNotifTabOpen(true);
              } else {
                setNotifTabOpen(false);
              }
            }}
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
        {(taskerName || taskerEmail) && (
          <div className="px-4 mb-2">
            {taskerName && <p className="text-white text-xs font-semibold truncate">{taskerName}</p>}
            {taskerEmail && <p className="text-orange-200 text-xs truncate">{taskerEmail}</p>}
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

// ─── Earnings Summary Tab ────────────────────────────────────────────────────

const PHP = (amount) =>
  '₱' + Number(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function EarningsSummary({ taskerId, taskerUserId }) {
  const [completedBookings, setCompletedBookings] = useState([])
  const [earningsLoading, setEarningsLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [chartWindow, setChartWindow] = useState(new Date().getMonth() < 6 ? 0 : 1)
  const [earningsSubtab, setEarningsSubtab] = useState('overview')

  useEffect(() => {
    async function fetchEarnings() {
      const [{ data: bookingData }, { data: reviewData }] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, scheduled_date, customer_name, service, duration_hours, estimated_total, tasker_payout, platform_fee, created_at')
          .eq('tasker_id', taskerId)
          .eq('status', 'completed')
          .order('scheduled_date', { ascending: false }),
        supabase
          .from('reviews')
          .select('rating')
          .eq('tasker_id', taskerId)
          .eq('is_hidden', false),
      ])
      setCompletedBookings(bookingData ?? [])
      setReviews(reviewData ?? [])
      setEarningsLoading(false)
    }
    fetchEarnings()
  }, [taskerId])

  if (earningsLoading) {
    return (
      <div className="flex justify-center mt-20">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Performance calculations ────────────────────────────────────────────────
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
    : 0
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  // ── Stat calculations ──────────────────────────────────────────────────────
  const now = new Date()
  const totalEarned = completedBookings.reduce((sum, b) => sum + (b.tasker_payout ?? 0), 0)
  const thisMonth = completedBookings
    .filter((b) => {
      if (!b.scheduled_date) return false
      const d = new Date(b.scheduled_date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((sum, b) => sum + (b.tasker_payout ?? 0), 0)
  const completedCount = completedBookings.length

  // ── Chart data (window 0 = Jan–Jun, window 1 = Jul–Dec) ─────────────────
  const chartWindowStart = chartWindow === 0 ? 0 : 6
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const yr = now.getFullYear()
    const mo = chartWindowStart + i
    const total = completedBookings
      .filter((b) => {
        if (!b.scheduled_date) return false
        const bd = new Date(b.scheduled_date)
        return bd.getFullYear() === yr && bd.getMonth() === mo
      })
      .reduce((sum, b) => sum + (b.tasker_payout ?? 0), 0)
    return { month: SHORT_MONTHS[mo], total }
  })
  const chartWindowLabel = chartWindow === 0 ? 'January – June' : 'July – December'

  function fmtEarningsDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
  }

  return (
    <div className="space-y-6">

      {/* Subtab toggle */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'ewallet', label: 'E-Wallet' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setEarningsSubtab(key)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              earningsSubtab === key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {earningsSubtab === 'ewallet' && <TaskerEWallet userId={taskerUserId} />}

      {earningsSubtab === 'overview' && <>

      {/* Performance Overview */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        {/* Average score */}
        <div className="flex flex-col items-center flex-shrink-0 min-w-[100px]">
          <p className="text-6xl font-extrabold text-gray-800 leading-none">{avgRating.toFixed(1)}</p>
          <StarRow rating={Math.round(avgRating)} />
          <p className="text-sm text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Breakdown bars */}
        <div className="flex-1 w-full space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Performance Overview</p>
          {ratingBreakdown.map(({ star, count }) => {
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-4 text-right flex-shrink-0">{star}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-orange-400 flex-shrink-0">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-gray-400 w-4 text-right flex-shrink-0">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 1 — Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { emoji: '💵', label: 'Total Earned',   value: PHP(totalEarned),   isAmount: true },
          { emoji: '📅', label: 'This Month',     value: PHP(thisMonth),     isAmount: true },
          { emoji: '✅', label: 'Completed Jobs', value: completedCount,     isAmount: false },
        ].map(({ emoji, label, value, isAmount }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-lg">
              {emoji}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-extrabold mt-0.5 ${isAmount ? 'text-orange-500' : 'text-orange-500'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Section 2 — Bar Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Monthly Earnings ({chartWindowLabel})</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChartWindow(0)}
              disabled={chartWindow === 0}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Previous window"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setChartWindow(1)}
              disabled={chartWindow === 1}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Next window"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip
              formatter={(value) => [PHP(value), 'Earnings']}
              contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="total" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Section 3 — Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Booking Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Date</th>
                <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Customer</th>
                <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Service</th>
                <th className="text-right px-5 py-3 font-semibold whitespace-nowrap">Duration</th>
                <th className="text-right px-5 py-3 font-semibold whitespace-nowrap">Amount Paid</th>
                <th className="text-right px-5 py-3 font-semibold whitespace-nowrap">Your Earnings (90%)</th>
                <th className="text-right px-5 py-3 font-semibold whitespace-nowrap">Platform Fee (10%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {completedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                    No completed bookings yet.
                  </td>
                </tr>
              ) : (
                completedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{fmtEarningsDate(b.scheduled_date)}</td>
                    <td className="px-5 py-3 text-gray-700 font-medium whitespace-nowrap">{b.customer_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600 capitalize whitespace-nowrap">{b.service ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600 text-right whitespace-nowrap">
                      {b.duration_hours != null ? `${b.duration_hours} hr${b.duration_hours !== 1 ? 's' : ''}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-700 text-right whitespace-nowrap">{PHP(b.estimated_total)}</td>
                    <td className="px-5 py-3 font-semibold text-orange-600 text-right whitespace-nowrap">{PHP(b.tasker_payout)}</td>
                    <td className="px-5 py-3 text-gray-500 text-right whitespace-nowrap">{PHP(b.platform_fee)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      </>}

    </div>
  )
}

// ─── Tasker E-Wallet ─────────────────────────────────────────────────────────

function TaskerEWallet({ userId }) {
  const [balance, setBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

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
    if (cashoutScreen === 2) return
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
    else if (amt < 100) errors.amount = 'Minimum cashout amount is ₱100.'
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
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 mb-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-white" />
            <p className="text-white font-semibold text-base">Hanap.ph Wallet Balance</p>
          </div>
          <button
            onClick={openCashout}
            disabled={loading || balance === null || balance < 100}
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
        <p className="text-orange-100 text-sm mt-2">Your earnings from completed bookings</p>
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
            <p className="text-gray-400 text-sm">No wallet transactions yet. Earnings appear here after completing a booking.</p>
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
            {/* Screen 1: Select Method & Enter Details */}
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
                  <p className="text-xs text-gray-400 mt-1">Available balance: ₱{formatAmount(balance ?? 0)} · Min ₱100</p>
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

            {/* Screen 2: Processing */}
            {cashoutScreen === 2 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6" />
                <p className="text-base font-bold text-gray-800 mb-1">Processing your cashout...</p>
                <p className="text-sm text-gray-400">Please wait, do not close this window.</p>
              </div>
            )}

            {/* Screen 3: Success */}
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
                    <span className="font-bold text-orange-600">₱{formatAmount(balance ?? 0)}</span>
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

// ─── Reviews Tab ─────────────────────────────────────────────────────────────

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={`w-4 h-4 ${s <= rating ? 'text-orange-400' : 'text-gray-200'}`}
          fill="currentColor"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  )
}

function TaskerReviews({ taskerId }) {
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, images, video, is_flagged, is_hidden, created_at, customer_id')
        .eq('tasker_id', taskerId)
        .order('created_at', { ascending: false })

      if (!data || data.length === 0) {
        setReviews([])
        setReviewsLoading(false)
        return
      }

      // Fetch customer names from profiles
      const customerIds = [...new Set(data.map((r) => r.customer_id).filter(Boolean))]
      let nameMap = {}
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', customerIds)
        ;(profiles ?? []).forEach((p) => { nameMap[p.id] = p.full_name })
      }

      setReviews(data.map((r) => ({ ...r, customerName: nameMap[r.customer_id] ?? 'Anonymous' })))
      setReviewsLoading(false)
    }
    fetchReviews()
  }, [taskerId])

  if (reviewsLoading) {
    return (
      <div className="flex justify-center mt-20">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-base font-semibold">No reviews yet.</p>
        <p className="text-sm mt-1">Completed jobs will show reviews here.</p>
      </div>
    )
  }

  // ── Stat calculations ──────────────────────────────────────────────────────
  const avg = reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  return (
    <div className="space-y-6">

      {/* Section 1 — Rating Overview */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        {/* Average score */}
        <div className="flex flex-col items-center flex-shrink-0">
          <p className="text-6xl font-extrabold text-gray-800 leading-none">{avg.toFixed(1)}</p>
          <StarRow rating={Math.round(avg)} />
          <p className="text-sm text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Breakdown bars */}
        <div className="flex-1 w-full space-y-2">
          {breakdown.map(({ star, count }) => {
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-4 text-right flex-shrink-0">{star}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-orange-400 flex-shrink-0">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-orange-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-gray-400 w-4 text-right flex-shrink-0">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 2 — Review Cards */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const images = (() => {
            if (!review.images) return []
            if (Array.isArray(review.images)) return review.images
            try { return JSON.parse(review.images) } catch { return [] }
          })()

          const formattedDate = review.created_at
            ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : '—'

          const badge = review.is_flagged
            ? { label: 'Pending Approval', cls: 'bg-orange-100 text-orange-600' }
            : review.is_hidden
            ? { label: 'Hidden', cls: 'bg-red-100 text-red-600' }
            : { label: 'Live', cls: 'bg-green-100 text-green-600' }

          return (
            <div key={review.id} className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{review.customerName}</p>
                  <p className="text-xs text-gray-400">{formattedDate}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>

              {/* Stars */}
              <StarRow rating={review.rating ?? 0} />

              {/* Comment */}
              {review.comment && (
                <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
              )}

              {/* Images */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Review image ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                    />
                  ))}
                </div>
              )}

              {/* Video */}
              {review.video && (
                <video
                  src={review.video}
                  controls
                  className="w-full rounded-xl border border-gray-100 max-h-48"
                />
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}

// ─── Profile Management Tab ──────────────────────────────────────────────────


function InfoField({ label, value, wide = false }) {
  return (
    <div className={wide ? 'col-span-2 w-full' : 'w-full'}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || 'Not provided'}</p>
    </div>
  )
}

function ProfileManagement({ taskerId, taskerUserId, taskerName }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(null)
  const [reviewCount, setReviewCount] = useState(0)

  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingWork, setEditingWork] = useState(false)
  const [personalFields, setPersonalFields] = useState({ phone: '', address: '', service_area: '' })
  const [workFields, setWorkFields] = useState({ working_hours: '', availability: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [toast, setToast] = useState(null)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function fetchProfile() {
      const { data: tasker } = await supabase
        .from('taskers')
        .select('*')
        .eq('user_id', taskerUserId)
        .maybeSingle()

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', taskerUserId)
        .maybeSingle()

      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('tasker_id', taskerId)

      const ratingList = (reviews ?? []).map((r) => r.rating ?? 0)
      setReviewCount(ratingList.length)
      setAvgRating(ratingList.length > 0 ? ratingList.reduce((s, v) => s + v, 0) / ratingList.length : null)

      const merged = { ...(tasker ?? {}), full_name: prof?.full_name ?? null, phone: prof?.phone ?? tasker?.phone ?? null }
      setProfile(merged)
      setPersonalFields({
        phone: merged.phone ?? '',
        address: merged.address ?? '',
        service_area: merged.service_area ?? '',
      })
      const availVal = Array.isArray(merged.availability) ? merged.availability.join(', ') : (merged.availability ?? '')
      const wHours = Array.isArray(merged.working_hours) ? merged.working_hours.join(', ') : (merged.working_hours ?? '')
      setWorkFields({ working_hours: wHours, availability: availVal, bio: merged.bio ?? '' })
      setProfileLoading(false)
    }
    fetchProfile()
  }, [taskerId, taskerUserId])

  async function handleSavePersonal() {
    setSaving(true)
    const [taskerRes, profileRes] = await Promise.all([
      supabase.from('taskers').update({
        address: personalFields.address,
        service_area: personalFields.service_area,
      }).eq('user_id', taskerUserId),
      supabase.from('profiles').update({
        phone: personalFields.phone,
      }).eq('id', taskerUserId),
    ])
    setSaving(false)
    if (taskerRes.error || profileRes.error) {
      showToast('Failed to update profile.', 'error')
      return
    }
    setProfile(prev => ({ ...prev, phone: personalFields.phone, address: personalFields.address, service_area: personalFields.service_area }))
    setEditingPersonal(false)
    showToast('Profile updated successfully!')
  }

  async function handleSaveWork() {
    setSaving(true)
    const { error } = await supabase.from('taskers').update({
      working_hours: workFields.working_hours,
      availability: workFields.availability,
      bio: workFields.bio,
    }).eq('user_id', taskerUserId)
    setSaving(false)
    if (error) {
      showToast('Failed to update profile.', 'error')
      return
    }
    setProfile(prev => ({ ...prev, working_hours: workFields.working_hours, availability: workFields.availability, bio: workFields.bio }))
    setEditingWork(false)
    showToast('Profile updated successfully!')
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `profile-photos/${taskerId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('tasker-files')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setPhotoUploading(false)
      showToast('Photo upload failed. Please try again.', 'error')
      return
    }
    const { data: urlData } = supabase.storage.from('tasker-files').getPublicUrl(path)
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
    await supabase.from('taskers').update({ profile_photo: publicUrl }).eq('id', taskerId)
    setProfile(prev => ({ ...prev, profile_photo: publicUrl }))
    setPhotoUploading(false)
    showToast('Profile photo updated!')
  }

  async function handleRemovePhoto() {
    const photo = profile.profile_photo
    if (photo && !photo.startsWith('http')) {
      await supabase.storage.from('tasker-files').remove([photo])
    }
    await supabase.from('taskers').update({ profile_photo: null }).eq('id', taskerId)
    setProfile(prev => ({ ...prev, profile_photo: null }))
    showToast('Profile photo removed')
  }

  async function handleDeactivate() {
    setDeactivateError('')
    setDeactivating(true)
    const { data: active } = await supabase
      .from('bookings')
      .select('id')
      .eq('tasker_id', taskerId)
      .in('status', ['confirmed', 'accepted', 'on_the_way', 'in_progress'])
      .limit(1)
    if (active && active.length > 0) {
      setDeactivateError('You have active bookings. Please complete or cancel them before deactivating your account.')
      setDeactivating(false)
      return
    }
    await supabase.from('profiles').update({ is_archived: true }).eq('id', taskerUserId)
    await supabase.auth.signOut()
    navigate('/')
  }

  if (profileLoading) {
    return (
      <div className="flex justify-center mt-20">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return <p className="text-center text-gray-400 mt-20">Profile not found.</p>
  }

  const fullName = taskerName || profile.full_name?.trim() || 'Not provided'

  const photoUrl = profile.profile_photo
    ? profile.profile_photo.startsWith('http')
      ? profile.profile_photo
      : supabase.storage.from('tasker-files').getPublicUrl(profile.profile_photo).data.publicUrl
    : null

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300'

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Section 1 — Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center text-center gap-3">
        <div style={{ position: 'relative' }}>
          {photoUrl ? (
            <img src={photoUrl} alt={fullName} className="w-28 h-28 rounded-full object-cover border-4 border-orange-100" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-3xl font-bold text-orange-400">{(profile.first_name?.[0] ?? '?').toUpperCase()}</span>
            </div>
          )}
          {photoUrl && !photoUploading && (
            <button
              onClick={handleRemovePhoto}
              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}
              title="Remove photo"
            >
              <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>✕</span>
            </button>
          )}
          {photoUploading && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <label className={`cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
          photoUploading
            ? 'opacity-50 pointer-events-none border-gray-200 text-gray-400'
            : 'border-orange-400 text-orange-500 hover:bg-orange-50'
        }`}>
          {photoUploading ? 'Uploading…' : 'Upload Photo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
            disabled={photoUploading}
          />
        </label>
        <div>
          <h3 className="text-2xl font-extrabold text-gray-800">{fullName}</h3>
          {profile.service_type && (
            <p className="text-sm text-orange-500 font-semibold mt-0.5 capitalize">{profile.service_type}</p>
          )}
          {avgRating !== null && (
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                    className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'text-orange-400' : 'text-gray-200'}`}>
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 2 — Personal Information */}
      <div className="bg-white rounded-2xl shadow-sm p-6 pl-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Personal Information</h4>
          {!editingPersonal && (
            <button
              onClick={() => setEditingPersonal(true)}
              className="text-xs font-semibold text-orange-500 border border-orange-300 px-3 py-1 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem 2rem' }}>
          <InfoField label="Age"    value={profile.age} />
          <InfoField label="Gender" value={profile.gender} />
          <InfoField label="Email"  value={profile.email} />

          {/* Phone */}
          <div className="w-full">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
            {editingPersonal ? (
              <input
                type="text"
                value={personalFields.phone}
                onChange={e => setPersonalFields(prev => ({ ...prev, phone: e.target.value }))}
                className={inputCls}
                placeholder="Phone number"
              />
            ) : (
              <p className="text-sm text-gray-800 font-medium">{profile.phone || 'Not provided'}</p>
            )}
          </div>

          {/* Address */}
          <div className="w-full">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
            {editingPersonal ? (
              <input
                type="text"
                value={personalFields.address}
                onChange={e => setPersonalFields(prev => ({ ...prev, address: e.target.value }))}
                className={inputCls}
                placeholder="Address"
              />
            ) : (
              <p className="text-sm text-gray-800 font-medium">{profile.address || 'Not provided'}</p>
            )}
          </div>

          {/* Service Area */}
          <div className="w-full">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Service Area</p>
            {editingPersonal ? (
              <input
                type="text"
                value={personalFields.service_area}
                onChange={e => setPersonalFields(prev => ({ ...prev, service_area: e.target.value }))}
                className={inputCls}
                placeholder="Service area"
              />
            ) : (
              <p className="text-sm text-gray-800 font-medium">{profile.service_area || 'Not provided'}</p>
            )}
          </div>
        </div>

        {editingPersonal && (
          <div className="flex gap-2 mt-5 justify-end">
            <button
              onClick={() => {
                setPersonalFields({ phone: profile.phone ?? '', address: profile.address ?? '', service_area: profile.service_area ?? '' })
                setEditingPersonal(false)
              }}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePersonal}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Section 3 — Work Information */}
      <div className="bg-white rounded-2xl shadow-sm p-6 pl-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Work Information</h4>
          {!editingWork && (
            <button
              onClick={() => setEditingWork(true)}
              className="text-xs font-semibold text-orange-500 border border-orange-300 px-3 py-1 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem 2rem' }}>

          {/* Availability */}
          <div className="w-full">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Availability</p>
            {editingWork ? (
              <select
                value={workFields.availability}
                onChange={e => setWorkFields(prev => ({ ...prev, availability: e.target.value }))}
                className={inputCls}
              >
                <option value="">Select availability</option>
                <option value="Full Time">Full Time</option>
                <option value="Part Time - AM">Part Time - AM</option>
                <option value="Part Time - PM">Part Time - PM</option>
              </select>
            ) : (
              <p className="text-sm text-gray-800 font-medium">{profile.availability ? (Array.isArray(profile.availability) ? profile.availability.join(', ') : profile.availability) : 'Not provided'}</p>
            )}
          </div>

          {/* Bio */}
          <div className="col-span-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Bio</p>
            {editingWork ? (
              <textarea
                value={workFields.bio}
                onChange={e => setWorkFields(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className={inputCls}
                placeholder="Tell customers about yourself…"
              />
            ) : (
              <p className="text-sm text-gray-800 leading-relaxed">{profile.bio || 'Not provided'}</p>
            )}
          </div>
        </div>

        {editingWork && (
          <div className="flex gap-2 mt-5 justify-end">
            <button
              onClick={() => {
                const availVal = Array.isArray(profile.availability) ? profile.availability.join(', ') : (profile.availability ?? '')
                const wHours = Array.isArray(profile.working_hours) ? profile.working_hours.join(', ') : (profile.working_hours ?? '')
                setWorkFields({ working_hours: wHours, availability: availVal, bio: profile.bio ?? '' })
                setEditingWork(false)
              }}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveWork}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Deactivate Account */}
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

// ─── Contact Admin Tab ───────────────────────────────────────────────────────

function ContactAdminChat({ taskerUserId }) {
  const [adminUserId, setAdminUserId] = useState(null)
  const [adminLoading, setAdminLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch admin user_id
  useEffect(() => {
    async function fetchAdmin() {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle()
      setAdminUserId(data?.id ?? null)
      setAdminLoading(false)
    }
    fetchAdmin()
  }, [])

  // Fetch messages once admin id is known
  async function fetchMessages(adminId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .is('booking_id', null)
      .or(`sender_id.eq.${taskerUserId},receiver_id.eq.${taskerUserId}`)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  async function markAsRead(adminId) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .is('booking_id', null)
      .eq('receiver_id', taskerUserId)
      .eq('is_read', false)
  }

  useEffect(() => {
    if (!adminUserId) return
    fetchMessages(adminUserId).then(() => markAsRead(adminUserId))
    inputRef.current?.focus()
  }, [adminUserId])

  // Realtime subscription
  useEffect(() => {
    if (!adminUserId) return
    const channel = supabase
      .channel(`admin-chat-${taskerUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new
        if (
          msg.booking_id === null &&
          (msg.sender_id === taskerUserId || msg.receiver_id === taskerUserId)
        ) {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
          if (msg.receiver_id === taskerUserId) {
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [adminUserId, taskerUserId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !adminUserId) return
    setSending(true)
    setInput('')
    await supabase.from('messages').insert({
      booking_id: null,
      sender_id: taskerUserId,
      receiver_id: adminUserId,
      content: text,
      is_read: false,
    })
    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const fmtTime = (iso) => iso
    ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''

  if (adminLoading) {
    return (
      <div className="flex justify-center mt-20">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!adminUserId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-base font-semibold">Unable to reach admin at this time.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm flex flex-col" style={{ height: '560px', maxHeight: '75vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          <Headset size={17} className="text-orange-500" />
        </div>
        <div>
          <p className="font-bold text-gray-800 text-sm">Admin Support</p>
          <p className="text-xs text-gray-400">Send a message to the Hanap.ph admin team</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm text-center">
              No messages yet.<br />Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === taskerUserId
            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMine
                    ? 'bg-orange-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <p className="text-xs text-gray-400 mt-1 px-1">
                  {isMine ? 'You' : 'Admin'} · {fmtTime(msg.created_at)}
                </p>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-40 flex-shrink-0"
        >
          <MessageSquare size={17} />
        </button>
      </div>
    </div>
  )
}

// ─── Placeholder Tab ─────────────────────────────────────────────────────────

// ─── Booking History ─────────────────────────────────────────────────────────

const HISTORY_FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'accepted',    label: 'Accepted' },
  { key: 'on_the_way',  label: 'On The Way' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'cancelled',   label: 'Cancelled' },
]

const HISTORY_STATUS_STYLES = {
  confirmed:   'bg-amber-100 text-amber-700',
  accepted:    'bg-green-100 text-green-700',
  on_the_way:  'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  pending:     'bg-yellow-100 text-yellow-700',
  rejected:    'bg-red-100 text-red-600',
}

function fmtHistoryDate(dateStr, timeStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  const datePart = d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
  if (!timeStr) return datePart
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const suffix = hour < 12 ? 'AM' : 'PM'
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${datePart} At ${display}:${m} ${suffix}`
}

function getHistoryTaskLabel(booking) {
  try {
    const opts = typeof booking.task_options === 'string'
      ? JSON.parse(booking.task_options)
      : booking.task_options
    if (opts) return opts.type || opts.problem || opts.what_to_paint || opts.aircon_type || opts.service_type || booking.task_size || '—'
  } catch {}
  return booking.task_size || '—'
}

function ReviewModal({ bookingId, onClose }) {
  const [review, setReview] = useState(null)
  const [revLoading, setRevLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('reviews')
      .select('id, rating, comment, images, video, is_flagged, is_hidden, created_at')
      .eq('booking_id', bookingId)
      .maybeSingle()
      .then(({ data }) => { setReview(data); setRevLoading(false) })
  }, [bookingId])

  const images = (() => {
    if (!review?.images) return []
    if (Array.isArray(review.images)) return review.images
    try { return JSON.parse(review.images) } catch { return [] }
  })()

  const formattedDate = review?.created_at
    ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
    : null

  const badge = review
    ? review.is_flagged
      ? { label: 'Pending Approval', cls: 'bg-orange-100 text-orange-600' }
      : review.is_hidden
      ? { label: 'Hidden', cls: 'bg-red-100 text-red-600' }
      : { label: 'Live', cls: 'bg-green-100 text-green-600' }
    : null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="font-bold text-gray-800 text-base">Customer Review</p>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 overflow-y-auto" style={{ maxHeight: '65vh' }}>
            {revLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !review ? (
              <p className="text-center text-gray-400 text-sm py-10">No review submitted for this booking yet.</p>
            ) : (
              <div className="space-y-4">
                {/* Stars + badge */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <StarRow rating={review.rating ?? 0} />
                  {badge && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                )}

                {/* Images */}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Review image ${i + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                      />
                    ))}
                  </div>
                )}

                {/* Video */}
                {review.video && (
                  <video
                    src={review.video}
                    controls
                    className="w-full rounded-xl border border-gray-100 max-h-48"
                  />
                )}

                {/* Date */}
                {formattedDate && (
                  <p className="text-xs text-gray-400">Posted on {formattedDate}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function BookingHistory({ taskerId, taskerUserId }) {
  const [allBookings, setAllBookings] = useState([])
  const [histLoading, setHistLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [openChatId, setOpenChatId] = useState(null)
  const [openReviewId, setOpenReviewId] = useState(null)

  useEffect(() => {
    if (!taskerId) return
    supabase
      .from('bookings')
      .select('id, status, service, task_options, task_size, duration_hours, customer_name, scheduled_date, scheduled_time, estimated_total, tasker_payout, platform_fee, helper_fee, taskers_needed, is_rebook, created_at, client_id, reference_number')
      .eq('tasker_id', taskerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAllBookings(data ?? [])
        setHistLoading(false)
      })
  }, [taskerId])

  const displayed = allBookings
    .filter((b) => {
      if (filter === 'all') return true
      if (filter === 'pending') return b.status === 'pending' || b.status === 'confirmed'
      return b.status === filter
    })
    .filter((b) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (b.customer_name ?? '').toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
      )
    })

  const openChat = openChatId ? allBookings.find((b) => b.id === openChatId) : null

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {HISTORY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filter === key
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-orange-500 border-orange-300 hover:border-orange-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by customer name or booking ID..."
        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-400 transition-colors"
      />

      {/* Chat modal */}
      {openChat && (
        <ChatModal
          bookingId={openChat.id}
          currentUserId={taskerUserId}
          otherUserId={openChat.client_id}
          otherUserName={openChat.customer_name ?? 'Customer'}
          onClose={() => setOpenChatId(null)}
        />
      )}

      {/* Review modal */}
      {openReviewId && (
        <ReviewModal bookingId={openReviewId} onClose={() => setOpenReviewId(null)} />
      )}

      {/* Content */}
      {histLoading ? (
        <div className="flex justify-center mt-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex justify-center mt-20">
          <p className="text-gray-400 text-base font-medium">No bookings found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((b) => {
            const statusStyle = HISTORY_STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-500'
            const statusLabel = STATUS_LABELS[b.status] ?? b.status?.replace(/_/g, ' ') ?? '—'
            const refId = 'VE-' + b.id.slice(0, 13).toUpperCase()
            const taskLabel = getHistoryTaskLabel(b)
            return (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                {/* Top row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-orange-500">{refId}</span>
                    {b.is_rebook && (
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        🔄 Rebook
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusStyle}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  {[
                    ['Service',    b.service ?? '—'],
                    ['Task',       taskLabel],
                    ['Duration',   b.duration_hours ? `${b.duration_hours} hr${b.duration_hours !== 1 ? 's' : ''}` : '—'],
                    ['Customer',   b.customer_name ?? '—'],
                    ['Scheduled',  fmtHistoryDate(b.scheduled_date, b.scheduled_time)],
                    ['Booked on',  b.created_at ? new Date(b.created_at).toLocaleString('en-US', { month: 'long', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-2">
                      <span className="text-gray-400 w-24 flex-shrink-0">{label}</span>
                      <span className="text-gray-700">{val}</span>
                    </div>
                  ))}
                </div>

                {(b.platform_fee != null || b.tasker_payout != null) && (() => {
                  const fmt = (n) => `₱${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  const helperFee = b.helper_fee ?? 0
                  const totalPaid = (b.tasker_payout ?? 0) + (b.platform_fee ?? 0) + helperFee
                  const helperCount = b.taskers_needed > 1 ? b.taskers_needed - 1 : 0
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
                      <div className="flex justify-between text-green-700 font-medium">
                        <span>Your Payout (90%)</span>
                        <span>{fmt(b.tasker_payout)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Platform Fee (10%)</span>
                        <span>{fmt(b.platform_fee)}</span>
                      </div>
                    </div>
                  )
                })()}

                <div className="flex flex-wrap gap-2">
                  {b.status !== 'cancelled' && b.client_id && (
                    <button
                      onClick={() => setOpenChatId(b.id)}
                      className="flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-600 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <MessageSquare size={15} />
                      Message Customer
                    </button>
                  )}
                  {b.status === 'completed' && (
                    <button
                      onClick={() => setOpenReviewId(b.id)}
                      className="text-sm font-semibold text-orange-500 hover:text-orange-600 border border-orange-400 hover:border-orange-500 bg-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View Review
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function TaskerDashboard() {
  const location = useLocation()
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(location.search)
    const tabParam = params.get('tab')
    return tabParam && NAV_ITEMS.some((item) => item.key === tabParam) ? tabParam : 'bookings'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bookings, setBookings] = useState([])
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all')
  const [taskerId, setTaskerId] = useState(null)
  const [taskerUserId, setTaskerUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [taskerName, setTaskerName] = useState('')
  const [taskerEmail, setTaskerEmail] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [notifTabOpen, setNotifTabOpen] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [showNotifBanner, setShowNotifBanner] = useState(false)
  const [notifToast, setNotifToast] = useState(null)
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

  async function load(tid) {
    console.log('load() called with tasker_id:', tid)

    const { data: bookingRows, error: bookingError } = await supabase
      .from('bookings')
      .select('*, task_options, task_size, taskers_needed, duration_hours, customer_name, customer_phone')
      .eq('tasker_id', tid)
      .order('created_at', { ascending: false })

    console.log('bookingRows:', bookingRows, 'error:', bookingError)

    if (!bookingRows || bookingRows.length === 0) {
      setBookings([])
      return
    }

    setBookings(bookingRows)
  }

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setLoading(false); return }
        setTaskerEmail(session.user.email ?? '')
        console.log('session user id:', session.user.id)

        const { data: tasker, error: taskerError } = await supabase
          .from('taskers')
          .select('id, name, user_id')
          .eq('user_id', session.user.id)
          .maybeSingle()

        console.log('tasker row:', tasker, 'tasker error:', taskerError)

        if (!tasker) { setLoading(false); return }

        setTaskerId(tasker.id)
        setTaskerUserId(tasker.user_id)
        setTaskerName(tasker.name || '')
        await load(tasker.id)

        const { data: welcomeNotifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .ilike('title', '%Welcome to the Team%')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(1)
        if (welcomeNotifs?.[0]) setWelcomeNotif(welcomeNotifs[0])
      } catch (err) {
        console.error('TaskerDashboard init error:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!taskerId) return
    const channel = supabase
      .channel(`tasker-bookings-${taskerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `tasker_id=eq.${taskerId}` },
        () => { load(taskerId) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [taskerId])

  useEffect(() => {
    if (!taskerUserId) return

    async function fetchNotifications() {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', taskerUserId)
        .lt('created_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())

      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', taskerUserId)
        .order('created_at', { ascending: false })
        .limit(20)
      const { data: announcementData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      setNotifications(notifData ?? [])
      setAnnouncements(announcementData ?? [])
      if (!notifTabOpen) {
        setUnreadNotifCount((notifData?.filter(n => !n.is_read).length ?? 0) + (announcementData?.length ?? 0))
      }
    }

    async function fetchAnnouncements() {
      const { data: announcementData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', taskerUserId)
        .order('created_at', { ascending: false })
        .limit(20)
      setAnnouncements(announcementData ?? [])
      setNotifications(notifData ?? [])
      if (!notifTabOpen) {
        setUnreadNotifCount((notifData?.filter(n => !n.is_read).length ?? 0) + (announcementData?.length ?? 0))
      }
    }

    fetchNotifications()

    const channel = supabase
      .channel(`tasker-notifications-${taskerUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${taskerUserId}`,
      }, (payload) => {
        fetchNotifications()
        if (payload.eventType === 'INSERT') {
          if (payload.new.title?.toLowerCase().includes('welcome to the team') && !payload.new.is_read) {
            setWelcomeNotif(payload.new)
          }
          if ('Notification' in window && Notification.permission === 'granted') {
            const n = new Notification(payload.new.title ?? 'New Notification', {
              body: payload.new.message ?? '',
              icon: '/vite.svg',
              badge: '/vite.svg',
              tag: payload.new.id,
            })
            n.onclick = () => { window.focus(); setTab('bookings') }
          }
        }
      })
      .subscribe()

    const announcementsChannel = supabase
      .channel('tasker-announcements')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements',
      }, () => { fetchAnnouncements() })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(announcementsChannel)
    }
  }, [taskerUserId])

  async function markAllNotifsRead() {
    if (!taskerUserId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', taskerUserId)
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

  const activeLabel = NAV_ITEMS.find((n) => n.key === tab)?.label ?? 'Dashboard'

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

  return (
    <div className="flex min-h-screen">

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

      {/* Desktop sidebar — fixed */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-30 overflow-y-auto">
        <TaskerSidebar
          tab={tab}
          setTab={setTab}
          taskerName={taskerName}
          taskerEmail={taskerEmail}
          taskerUserId={taskerUserId}
          onLogout={handleLogout}
          unreadNotifCount={unreadNotifCount}
          setUnreadNotifCount={setUnreadNotifCount}
          setNotifTabOpen={setNotifTabOpen}
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
            <TaskerSidebar
              tab={tab}
              setTab={setTab}
              taskerName={taskerName}
              taskerEmail={taskerEmail}
              taskerUserId={taskerUserId}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
              unreadNotifCount={unreadNotifCount}
              setUnreadNotifCount={setUnreadNotifCount}
              setNotifTabOpen={setNotifTabOpen}
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
          <p className="font-semibold text-gray-800 text-sm">{activeLabel}</p>
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

          {tab === 'bookings' && (() => {
            const STATUS_FILTER_TABS = [
              { key: 'all',        label: 'All' },
              { key: 'pending',    label: 'Pending' },
              { key: 'confirmed',  label: 'Confirmed' },
              { key: 'on_the_way', label: 'On the Way' },
              { key: 'completed',  label: 'Completed' },
              { key: 'cancelled',  label: 'Cancelled' },
            ]
            const q = bookingSearch.trim().toLowerCase()
            const filteredBookings = bookings.filter((b) => {
              const matchesStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter
              const matchesSearch = !q ||
                (b.customer_name ?? '').toLowerCase().includes(q) ||
                (b.reference_number ?? '').toLowerCase().includes(q)
              return matchesStatus && matchesSearch
            })
            return (
              <>
                <h2 className="text-xl font-bold text-gray-800 mb-4">My Bookings</h2>

                {/* Search bar */}
                <div className="relative mb-4">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search by customer name or reference number…"
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

                {/* Status filter tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {STATUS_FILTER_TABS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setBookingStatusFilter(s.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        bookingStatusFilter === s.key
                          ? 'bg-orange-500 text-white'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300 hover:text-orange-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex justify-center mt-20">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center mt-20">
                    <p className="text-gray-400 text-lg font-medium">
                      {bookings.length === 0 ? 'No tasks assigned yet.' : 'No bookings match your search.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                      <TaskCard key={booking.id} booking={booking} onStatusChange={() => load(taskerId)} currentUserId={taskerUserId} />
                    ))}
                  </div>
                )}
              </>
            )
          })()}

          {tab === 'leave' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Leave Request / Availability Calendar</h2>
              {loading ? (
                <div className="flex justify-center mt-20">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : taskerId ? (
                <LeaveRequestSection taskerId={taskerId} />
              ) : (
                <p className="text-center text-gray-400 mt-20">Tasker profile not found.</p>
              )}
            </>
          )}

          {tab === 'earnings' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Earnings Summary</h2>
              {loading ? (
                <div className="flex justify-center mt-20">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : taskerId ? (
                <EarningsSummary taskerId={taskerId} taskerUserId={taskerUserId} />
              ) : (
                <p className="text-center text-gray-400 mt-20">Tasker profile not found.</p>
              )}
            </>
          )}

          {tab === 'profile' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Profile Management</h2>
              {loading ? (
                <div className="flex justify-center mt-20">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : taskerId && taskerUserId ? (
                <ProfileManagement taskerId={taskerId} taskerUserId={taskerUserId} taskerName={taskerName} />
              ) : (
                <p className="text-center text-gray-400 mt-20">Tasker profile not found.</p>
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Booking History</h2>
              {loading ? (
                <div className="flex justify-center mt-20">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : taskerId ? (
                <BookingHistory taskerId={taskerId} taskerUserId={taskerUserId} />
              ) : (
                <p className="text-center text-gray-400 mt-20">Tasker profile not found.</p>
              )}
            </>
          )}

          {tab === 'contact-admin' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Contact Admin</h2>
              {loading ? (
                <div className="flex justify-center mt-20">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : taskerUserId ? (
                <ContactAdminChat taskerUserId={taskerUserId} />
              ) : (
                <p className="text-center text-gray-400 mt-20">Tasker profile not found.</p>
              )}
            </>
          )}

          {tab === 'break-room' && (
            <BreakRoom taskerId={taskerId} />
          )}

         {tab === 'notifications' && (
  <>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
      {notifications.some((n) => !n.is_read) && (
        <button
          onClick={async () => {
            await supabase
              .from('notifications')
              .update({ is_read: true })
              .eq('user_id', taskerUserId)
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadNotifCount(0)
          }}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Mark all as read
        </button>
      )}
    </div>

    {/* Section 1 — Admin Announcements */}
    {announcements.length > 0 && (
      <div className="mb-6">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">📢 Admin Announcements</p>
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-2xl px-4 py-4 bg-yellow-50 border border-yellow-200">
              <div className="flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">📢</span>
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 text-sm leading-snug">{a.title}</p>
                  <p className="text-gray-600 text-sm mt-0.5 leading-relaxed">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Section 2 — Your Notifications */}
    <div>
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">🔔 Your Notifications</p>
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
    </div>
          </>
          )}

        </div>
      </div>
    </div>
  )
}

export default TaskerDashboard
