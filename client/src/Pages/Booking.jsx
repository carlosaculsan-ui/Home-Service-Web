import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import backgroundImg from '../Assets/Background.jpg'
import gcashLogo from '../Assets/GCash_logo.png'
import mayaLogo from '../Assets/Maya_logo.png'
import { supabase } from '../supabase'
import LocationMap from '../Components/LocationMap'
import Groq from 'groq-sdk'
import { ClipboardList, Users, CalendarDays, Pencil, User, Phone, Mail, MapPin, Info, CheckCircle2, Smartphone, CreditCard, Bot, Home, FileText, Star, Wallet, Mic } from 'lucide-react'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
})

const STEPS = [
  { label: 'Describe your task' },
  { label: 'Choose a Tasker' },
  { label: 'Schedule' },
  { label: 'Confirm' },
]


const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const SHORT_MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

const TIME_SLOTS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']
const BUFFER_HOURS = 1
const END_OF_DAY = 17

function formatTimeSlot(slot) {
  const h = parseInt(slot.split(':')[0])
  const suffix = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:00 ${suffix}`
}

function getTaskDuration(taskOptions) {
  if (!taskOptions) return 8
  const service = taskOptions.service
  if (service === 'Cleaning') {
    if (taskOptions.type === 'Deep Cleaning') return 8
    if (taskOptions.area === 'Large (whole house)') return 8
    if (taskOptions.area === 'Medium (2-3 rooms)') return 5
    if (taskOptions.area === 'Small (1 room)') return 3
    return 8
  }
  if (service === 'Carpentry') {
    if (taskOptions.type === 'Install') return 4
    if (taskOptions.type === 'Repair') return 3
    return 8
  }
  if (service === 'Electrical') {
    if (taskOptions.type === 'Repair Wiring') return 8
    if (taskOptions.type === 'Install Lights') return 3
    if (taskOptions.type === 'Install Outlet') return 2
    return 8
  }
  if (service === 'Plumbing Repair') {
    if (taskOptions.problem === 'Pipe Repair') return 8
    if (taskOptions.problem === 'Clogged Drain') return 3
    if (taskOptions.problem === 'Leaking Faucet') return 2
    return 8
  }
  if (service === 'Painting') {
    if (taskOptions.area === 'Small') return 4
    return 8
  }
  if (service === 'Aircon Maintenance') {
    if (taskOptions.units >= 5) return 8
    if (taskOptions.units >= 3) return 6
    return 3
  }
  return 8
}

function isSlotAvailable(slotHour, existingBookings, taskOptions) {
  const newDuration = getTaskDuration(taskOptions) + BUFFER_HOURS
  for (const booking of existingBookings) {
    const existingStart = parseInt(booking.scheduled_time.split(':')[0])
    const existingDuration = (booking.duration_hours || 8) + BUFFER_HOURS
    if (slotHour + newDuration > existingStart && slotHour < existingStart + existingDuration) return false
  }
  return true
}

function buildPriceBreakdown(taskOptions) {
  if (!taskOptions) return []
  const { service } = taskOptions
  const lines = []
  const EXTRAS_LOOKUP = {
    'Cleaning':          { 'With Laundry': 200, 'With Appliances': 250 },
    'Carpentry':         { 'Materials Included': 500, 'Varnishing / Finishing': 350, 'Hauling / Debris Removal': 200 },
    'Electrical':        { 'Materials Included': 400, 'Additional Outlet/Switch': 300, 'Circuit Breaker Check': 250 },
    'Aircon Maintenance':{ 'Same Day Service': 300 },
    'Painting':          { 'Primer Coat': 400, 'Two Coats': 500, 'Wall Putty / Patching': 300 },
    'Plumbing Repair':   { 'Materials Included': 400, 'Multiple Points (2+ faucets/drains)': 300, 'Waterproofing': 500 },
  }

  if (service === 'Cleaning') {
    lines.push({ label: `${taskOptions.type} (${taskOptions.area})`, price: taskOptions.base_price })
  } else if (service === 'Carpentry') {
    lines.push({ label: `${taskOptions.type} — ${taskOptions.category ?? taskOptions.item ?? ''}`, price: taskOptions.base_price })
  } else if (service === 'Electrical') {
    lines.push({ label: taskOptions.type, price: taskOptions.base_price })
  } else if (service === 'Aircon Maintenance') {
    const u = taskOptions.units || 1
    lines.push({ label: `${taskOptions.aircon_type} × ${u} unit${u > 1 ? 's' : ''} (${taskOptions.service_type})`, price: taskOptions.base_price })
  } else if (service === 'Painting') {
    const paintLabel = taskOptions.what_to_paint === 'Furniture'
      ? `Furniture Painting — ${taskOptions.furniture_category} × ${taskOptions.furniture_pieces}`
      : `${taskOptions.what_to_paint} Painting (${taskOptions.area})`
    lines.push({ label: paintLabel, price: taskOptions.base_price })
    if (taskOptions.paint_cost > 0) {
      lines.push({ label: 'Paint (by Tasker)', price: taskOptions.paint_cost })
    }
  } else if (service === 'Plumbing Repair') {
    lines.push({ label: taskOptions.problem, price: taskOptions.base_price })
  }

  const extrasMap = EXTRAS_LOOKUP[service] || {}
  ;(taskOptions.extras || []).forEach((extra) => {
    const p = service === 'Aircon Maintenance' && extra === 'Freon Recharge'
      ? 500 * (taskOptions.units || 1)
      : (extrasMap[extra] ?? 0)
    lines.push({ label: extra, price: p, isExtra: true })
  })

  if ((taskOptions.helper_fee ?? 0) > 0) {
    const perHelper = taskOptions.is_heavy ? 600 : 300
    const helperCount = Math.round(taskOptions.helper_fee / perHelper)
    const helperLabel = `${helperCount} Helper${helperCount > 1 ? 's' : ''} (${taskOptions.is_heavy ? 'Full' : 'Half'} Day)`
    lines.push({ label: helperLabel, price: taskOptions.helper_fee, isExtra: true })
  }

  return lines
}

function formatReviews(n) {
  if (n >= 1000000000) return (n / 1000000000).toFixed(0) + 'B'
  if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}


function ScheduleModal({ tasker, taskOptions, onClose, onConfirm }) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const isUrgentPlumbing = taskOptions?.is_urgent === true
  const taskDuration = getTaskDuration(taskOptions)
  const isFullDay = taskDuration >= 8

  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [leaveDates, setLeaveDates] = useState(new Set())
  const [bookingsByDate, setBookingsByDate] = useState({})
  const [loadingDates, setLoadingDates] = useState(true)
  const [taskerAvailability, setTaskerAvailability] = useState(null)

  useEffect(() => {
    async function fetchAvailability() {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      }

      const [bookingsRes, leavesRes, availResult] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/bookings?tasker_id=eq.${tasker.id}&status=in.(confirmed,accepted,on_the_way,in_progress)&select=scheduled_date,scheduled_time,duration_hours`,
          { headers }
        ),
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tasker_leaves?tasker_id=eq.${tasker.id}&status=eq.approved&select=leave_dates`,
          { headers }
        ),
        supabase.from('taskers').select('availability').eq('id', tasker.id).single(),
      ])

      const [bookingsData, leavesData] = await Promise.all([bookingsRes.json(), leavesRes.json()])
      setTaskerAvailability(availResult.data?.availability ?? null)

      // Group bookings by date
      const byDate = {}
      if (Array.isArray(bookingsData)) {
        bookingsData.forEach((b) => {
          const d = b.scheduled_date?.slice(0, 10)
          if (!d) return
          if (!byDate[d]) byDate[d] = []
          byDate[d].push({ scheduled_time: b.scheduled_time, duration_hours: b.duration_hours || 8 })
        })
      }
      setBookingsByDate(byDate)

      // Parse leave dates
      const leaveSet = new Set()
      if (Array.isArray(leavesData)) {
        leavesData.forEach((r) => {
          try {
            const dates = JSON.parse(r.leave_dates)
            if (Array.isArray(dates)) dates.forEach((d) => leaveSet.add(d.slice(0, 10)))
          } catch { /* skip malformed rows */ }
        })
      }
      setLeaveDates(leaveSet)
      setLoadingDates(false)
    }
    fetchAvailability()
  }, [tasker.id])

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const getDateKey = (d) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${viewYear}-${mm}-${dd}`
  }

  const getDateObj = (d) => new Date(viewYear, viewMonth, d)
  const isPast = (d) => isUrgentPlumbing ? getDateObj(d) < todayStart : getDateObj(d) <= todayStart
  const isToday = (d) => getDateObj(d).getTime() === todayStart.getTime()

  const isBlocked = (d) => {
    if (!d) return false
    const dateKey = getDateKey(d)
    if (leaveDates.has(dateKey)) return true
    const dayBookings = bookingsByDate[dateKey] || []
    // Existing full-day booking blocks the date for everyone
    if (dayBookings.some((b) => b.duration_hours >= 8)) return true
    // Full day task: any existing booking blocks the date
    if (isFullDay && dayBookings.length > 0) return true
    return false
  }

  const isSelected = (d) =>
    selectedDate &&
    selectedDate.getDate() === d &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear

  const canGoPrev =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth > now.getMonth())

  const goToPrevMonth = () => {
    if (!canGoPrev) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const handleDayClick = (d) => {
    if (!d || isPast(d) || isBlocked(d) || (isUrgentPlumbing && !isToday(d))) return
    setSelectedDate(getDateObj(d))
    setSelectedSlot(null)
  }

  const selectedDateKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null
  const selectedDateBookings = selectedDateKey ? (bookingsByDate[selectedDateKey] || []) : []

  const formatSummaryDate = () => {
    if (!selectedDate) return '—'
    if (isFullDay) return `${SHORT_MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}, 7:00 am`
    if (!selectedSlot) return `${SHORT_MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}, —`
    return `${SHORT_MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${formatTimeSlot(selectedSlot).toLowerCase()}`
  }

  const canConfirm = selectedDate && (isFullDay || selectedSlot)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none font-bold"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-5">
          {tasker.profile_photo ? (
            <img
              src={tasker.profile_photo.startsWith('http') ? tasker.profile_photo : supabase.storage.from('tasker-files').getPublicUrl(tasker.profile_photo).data.publicUrl}
              alt={tasker.name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400">
              <User size={22} />
            </div>
          )}
          <h2 className="text-base font-bold text-gray-800">{tasker.name}'s Availability</h2>
        </div>

        {loadingDates ? (
          <p className="text-sm text-gray-400 text-center py-6">Loading availability...</p>
        ) : (
          <>
            {/* Calendar */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={goToPrevMonth}
                disabled={!canGoPrev}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-30 text-lg"
              >
                ‹
              </button>
              <span className="font-bold text-gray-800">{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <button
                onClick={goToNextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg"
              >
                ›
              </button>
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
                      onClick={() => handleDayClick(d)}
                      disabled={isPast(d) || isBlocked(d) || (isUrgentPlumbing && !isToday(d))}
                      className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors
                        ${isSelected(d)
                          ? 'bg-orange-500 text-white font-bold'
                          : isUrgentPlumbing && !isToday(d)
                          ? 'text-gray-300 cursor-not-allowed'
                          : isBlocked(d) && !isPast(d)
                          ? 'bg-red-100 text-red-300 cursor-not-allowed'
                          : isPast(d)
                          ? 'text-gray-300 cursor-not-allowed'
                          : isToday(d)
                          ? isUrgentPlumbing
                            ? 'ring-2 ring-red-500 bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer'
                            : 'ring-2 ring-orange-400 text-orange-600 font-bold hover:bg-orange-100 cursor-pointer'
                          : 'text-gray-700 hover:bg-orange-100 cursor-pointer'
                        }`}
                    >
                      {d}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Select a Time</p>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const h = parseInt(slot.split(':')[0])
                    const available = isSlotAvailable(h, selectedDateBookings, taskOptions)
                    const avail = taskerAvailability
                    const blockedByAvail = avail === 'Part Time - AM' ? h >= 13
                      : avail === 'Part Time - PM' ? h <= 12
                      : false
                    const selectedIsToday = selectedDate && selectedDate.getTime() === todayStart.getTime()
                    const isPastSlotToday = isUrgentPlumbing && selectedIsToday && h <= now.getHours() + 1
                    const isPickedSlot = selectedSlot === slot
                    const isDisabled = !available || blockedByAvail || isPastSlotToday
                    return (
                      <button
                        key={slot}
                        disabled={isDisabled}
                        onClick={() => setSelectedSlot(slot)}
                        title={blockedByAvail ? 'Not Available' : undefined}
                        style={blockedByAvail ? { opacity: 0.4 } : undefined}
                        className={`py-2 px-1 rounded-lg text-xs font-medium border transition-colors
                          ${isPickedSlot
                            ? 'bg-orange-500 text-white border-orange-500'
                            : !isDisabled
                            ? 'bg-white text-gray-700 border-gray-200 hover:border-orange-400 hover:text-orange-500'
                            : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          }`}
                      >
                        {formatTimeSlot(slot)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mb-4">
              Choose your task date and start time. You can chat to adjust task details or change start time after confirming.
            </p>

            <div className="border-t border-gray-100 mb-3" />

            <div className="flex items-center justify-between mb-5">
              <span className="text-sm text-gray-500">Request for:</span>
              <span className="text-sm font-semibold text-gray-700">{formatSummaryDate()}</span>
            </div>

            <button
              onClick={() => {
                if (!canConfirm) return
                const displayTime = isFullDay ? '7:00 AM' : formatTimeSlot(selectedSlot)
                onConfirm(tasker, selectedDate, displayTime, taskDuration)
              }}
              disabled={!canConfirm}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-base"
            >
              Select &amp; Continue
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function TeamDetailsModal({ tasker, taskersNeeded, onClose }) {
  const [helpersBySlot, setHelpersBySlot] = useState({})
  const [loadingHelpers, setLoadingHelpers] = useState(true)

  useEffect(() => {
    if (!tasker?.id) { setLoadingHelpers(false); return }
    supabase
      .from('tasker_helpers')
      .select('slot, helpers(name)')
      .eq('tasker_id', tasker.id)
      .order('slot', { ascending: true })
      .then(({ data }) => {
        const map = {}
        for (const row of data ?? []) {
          map[row.slot] = row.helpers?.name ?? null
        }
        setHelpersBySlot(map)
        setLoadingHelpers(false)
      })
  }, [tasker?.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-orange-500" />
          <p className="font-bold text-gray-800 text-base">Team Details</p>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <User size={16} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-800">{tasker.name}</p>
              <p className="text-xs text-orange-500">Lead Tasker</p>
            </div>
          </div>

          {taskersNeeded >= 2 && (
            <div className="flex items-center gap-3">
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {loadingHelpers ? '—' : (helpersBySlot[1] ?? 'Hanap.ph Staff')}
                </p>
                <p className="text-xs text-gray-400">Assistant{taskersNeeded >= 3 ? ' 1' : ''}</p>
              </div>
            </div>
          )}

          {taskersNeeded >= 3 && (
            <div className="flex items-center gap-3">
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {loadingHelpers ? '—' : (helpersBySlot[2] ?? 'Hanap.ph Staff')}
                </p>
                <p className="text-xs text-gray-400">Assistant 2</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
          {taskersNeeded === 1
            ? 'This task only requires 1 tasker. No additional helpers needed.'
            : taskersNeeded === 2
            ? 'This task requires additional help. A Hanap.ph helper will be assigned to assist your tasker.'
            : 'This task requires additional help. 2 Hanap.ph helpers will be assigned to assist your tasker.'}
        </p>
      </div>
    </div>
  )
}

function getTaskOptionsSummary(taskOptions) {
  if (!taskOptions) return null
  const { service } = taskOptions
  let label = ''
  if (service === 'Cleaning')          label = `${taskOptions.type} · ${taskOptions.area}`
  else if (service === 'Carpentry')    label = `${taskOptions.type} · ${taskOptions.category ?? taskOptions.item ?? ''}`
  else if (service === 'Electrical')   label = `${taskOptions.type} · ${taskOptions.sub_option ?? ''}`
  else if (service === 'Aircon Maintenance') label = taskOptions.aircon_type === 'Install'
    ? `Install · ${taskOptions.hp_tier}`
    : `${taskOptions.aircon_type} · ${taskOptions.service_type}`
  else if (service === 'Painting')     label = taskOptions.what_to_paint === 'Furniture'
    ? `Furniture Painting · ${taskOptions.furniture_category} × ${taskOptions.furniture_pieces}`
    : `${taskOptions.what_to_paint} Painting · ${taskOptions.area}`
  else if (service === 'Plumbing Repair') label = `${taskOptions.problem} · ${taskOptions.sub_option ?? ''}`
  return { label, extras: taskOptions.extras ?? [] }
}

const REVIEW_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function ReviewsModal({ tasker, onClose }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('reviews')
      .select('rating, comment, reviewer_name, created_at')
      .eq('tasker_id', tasker.id)
      .eq('is_hidden', false)
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews(data ?? [])
        setLoading(false)
      })
  }, [tasker.id])

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const avg = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
    : null

  function fmtReviewDate(str) {
    if (!str) return ''
    const d = new Date(str)
    return `${REVIEW_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold transition-colors"
        >
          ✕
        </button>

        <div className="mb-4">
          <p className="font-bold text-gray-800 text-base">{tasker.name}</p>
          {avg && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold text-gray-800">{avg}</span>
              <span className="text-sm text-gray-400">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4 overflow-y-auto flex-1 space-y-4">
          {loading && <p className="text-sm text-gray-400 text-center py-4">Loading reviews...</p>}
          {!loading && reviews.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No reviews yet.</p>
          )}
          {!loading && reviews.map((r, i) => (
            <div key={i} className="border-b border-gray-50 pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-500 text-sm">{'★'.repeat(r.rating ?? 0)}<span className="text-gray-200">{'★'.repeat(5 - (r.rating ?? 0))}</span></span>
              </div>
              {r.comment && <p className="text-sm text-gray-700 leading-relaxed">{r.comment}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 font-medium">{r.reviewer_name || 'Anonymous'}</span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs text-gray-400">{fmtReviewDate(r.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TaskerCard({ tasker, onSelect, taskersNeeded, estimatedTotal, taskOptions }) {
  const [expanded, setExpanded] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const bio = tasker.bio ?? ''
  const shortBio = bio.length > 90 ? bio.slice(0, 90) + '...' : bio
  const summary = getTaskOptionsSummary(taskOptions)
  const showPrice = estimatedTotal > 0

  return (
    <>
      {showTeamModal && (
        <TeamDetailsModal
          tasker={tasker}
          taskersNeeded={taskersNeeded ?? 1}
          onClose={() => setShowTeamModal(false)}
        />
      )}
      {showReviewsModal && (
        <ReviewsModal tasker={tasker} onClose={() => setShowReviewsModal(false)} />
      )}

      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex gap-4">
          {tasker.profile_photo ? (
            <img
              src={tasker.profile_photo.startsWith('http') ? tasker.profile_photo : supabase.storage.from('tasker-files').getPublicUrl(tasker.profile_photo).data.publicUrl}
              alt={tasker.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400">
              <User size={28} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <p className="font-bold text-gray-800 text-base leading-tight">{tasker.name}</p>
              <button
                onClick={() => setShowTeamModal(true)}
                className="flex items-center gap-1 border border-orange-500 text-orange-500 rounded-full px-3 py-0.5 text-xs font-semibold hover:bg-orange-500 hover:text-white transition cursor-pointer whitespace-nowrap mt-0.5 flex-shrink-0"
              >
                <FileText size={12} />
                details
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-1">{tasker.role}</p>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold">{(tasker.rating ?? 0).toFixed(1)}</span>
              <button
                onClick={() => setShowReviewsModal(true)}
                className="flex items-center gap-1 border border-orange-500 text-orange-500 rounded-full px-3 py-0.5 text-xs font-semibold hover:bg-orange-500 hover:text-white transition cursor-pointer"
              >
                <Star size={12} />
                {formatReviews(tasker.reviews ?? 0)} reviews
              </button>
              <span className="text-gray-300">•</span>
              <span>✅ {(tasker.tasks ?? 0).toLocaleString()} completed jobs</span>
            </div>
            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${tasker.availability === 'Part Time - AM' || tasker.availability === 'Part Time - PM' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {tasker.availability === 'Part Time - AM' ? 'PART TIME · AM' : tasker.availability === 'Part Time - PM' ? 'PART TIME · PM' : 'FULL TIME'}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <MapPin size={11} className="text-orange-400 flex-shrink-0" />
              {tasker.service_area || 'Area not set'}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          {expanded ? bio : shortBio}
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-orange-500 font-medium hover:underline"
          >
            {expanded ? 'Read Less' : 'Read More'}
          </button>
        </div>

        {showPrice && (
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">Estimated Total</p>
              <p className="text-xl font-bold text-orange-500">₱{estimatedTotal.toLocaleString()}</p>
              {summary && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-gray-400">{summary.label}</p>
                  {summary.extras.map((e) => (
                    <p key={e} className="text-xs text-gray-400">+ {e}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => onSelect(tasker)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors text-base"
        >
          Select &amp; Continue
        </button>

        <div className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <ClipboardList size={16} className="mt-0.5 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500">
            Next, confirm your details to get connected with your Tasker.
          </p>
        </div>
      </div>
    </>
  )
}

const CITY_COORDS = {
  'Manila':       { lat: 14.5995, lng: 120.9842 },
  'Quezon City':  { lat: 14.6760, lng: 121.0437 },
  'Caloocan':     { lat: 14.6499, lng: 120.9673 },
  'Las Piñas':    { lat: 14.4453, lng: 120.9830 },
  'Makati':       { lat: 14.5547, lng: 121.0244 },
  'Malabon':      { lat: 14.6627, lng: 120.9570 },
  'Mandaluyong':  { lat: 14.5794, lng: 121.0359 },
  'Marikina':     { lat: 14.6507, lng: 121.1029 },
  'Muntinlupa':   { lat: 14.4081, lng: 121.0415 },
  'Navotas':      { lat: 14.6667, lng: 120.9417 },
  'Parañaque':    { lat: 14.4793, lng: 121.0198 },
  'Pasay':        { lat: 14.5378, lng: 121.0014 },
  'Pasig':        { lat: 14.5764, lng: 121.0851 },
  'Pateros':      { lat: 14.5442, lng: 121.0688 },
  'San Juan':     { lat: 14.6019, lng: 121.0355 },
  'Taguig':       { lat: 14.5243, lng: 121.0792 },
  'Valenzuela':   { lat: 14.7011, lng: 120.9830 },
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function detectCustomerCity(address) {
  if (!address) return null
  const cleaned = address.toLowerCase().replace(/metro\s+manila/gi, '')
  const cities = Object.keys(CITY_COORDS).sort((a, b) => b.length - a.length)
  return cities.find(city => cleaned.includes(city.toLowerCase())) ?? null
}

function Step2({ onSelect, onBack, taskers, loadingTaskers, taskersError, taskersNeeded, estimatedTotal, taskOptions, taskAddress }) {
  const [nearestActive, setNearestActive] = useState(false)
  const [travelWarningTasker, setTravelWarningTasker] = useState(null)

  const customerCity = detectCustomerCity(taskAddress)

  const handleTaskerSelect = (tasker) => {
    if (customerCity && tasker.service_area && tasker.service_area !== customerCity) {
      setTravelWarningTasker(tasker)
    } else {
      onSelect(tasker)
    }
  }

  const displayedTaskers = nearestActive ? (() => {
    const customerCity = detectCustomerCity(taskAddress)
    const customerCoords = customerCity ? CITY_COORDS[customerCity] : null
    if (!customerCoords) return taskers
    return [...taskers].sort((a, b) => {
      const coordsA = CITY_COORDS[a.service_area]
      const coordsB = CITY_COORDS[b.service_area]
      const distA = coordsA ? haversineKm(customerCoords.lat, customerCoords.lng, coordsA.lat, coordsA.lng) : Infinity
      const distB = coordsB ? haversineKm(customerCoords.lat, customerCoords.lng, coordsB.lat, coordsB.lng) : Infinity
      return distA - distB
    })
  })() : taskers

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <Users size={24} className="text-blue-400 flex-shrink-0" />
        <p className="text-sm text-gray-600">
          Filter and sort to find your Tasker. Then view their availability to request your date and time.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {!nearestActive ? (
          <button
            onClick={() => setNearestActive(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <MapPin size={15} />
            Detect Nearest Tasker
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium rounded-lg">
              <MapPin size={13} />
              Sorted: Nearest to your location
            </span>
            <button
              onClick={() => setNearestActive(false)}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {travelWarningTasker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: '380px', padding: '28px 24px' }}>
            <h3 style={{ fontWeight: 800, fontSize: '17px', color: '#111827', margin: '0 0 10px' }}>Travel Fee Notice</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }}>
              <strong style={{ color: '#111827' }}>{travelWarningTasker.name}</strong> is based in{' '}
              <strong style={{ color: '#f97316' }}>{travelWarningTasker.service_area}</strong>, which is outside your area.
              A <strong style={{ color: '#111827' }}>₱500 travel fee</strong> will be added to your total.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setTravelWarningTasker(null)}
                style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', fontWeight: 600, fontSize: '14px', color: '#374151', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { onSelect(travelWarningTasker); setTravelWarningTasker(null) }}
                style={{ flex: 1, padding: '10px', background: '#f97316', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', color: '#fff', cursor: 'pointer' }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
        {loadingTaskers && (
          <p className="text-sm text-gray-400 text-center py-8">Loading taskers...</p>
        )}
        {taskersError && (
          <p className="text-sm text-red-400 text-center py-8">Failed to load taskers. Please try again.</p>
        )}
        {!loadingTaskers && !taskersError && displayedTaskers.map((tasker) => (
          <TaskerCard
            key={tasker.name}
            tasker={tasker}
            onSelect={handleTaskerSelect}
            taskersNeeded={taskersNeeded}
            estimatedTotal={estimatedTotal}
            taskOptions={taskOptions}
          />
        ))}
      </div>

      <button
        onClick={onBack}
        className="text-sm text-gray-400 hover:text-gray-600 underline"
      >
        ← Back
      </button>
    </div>
  )
}

function DetailRow({ label, value, valueClass = '' }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-400 w-24 md:w-36 flex-shrink-0">{label}</span>
      <span className={`text-sm text-gray-800 flex-1 ${valueClass}`}>{value}</span>
    </div>
  )
}

function Step3({ service, tasker, date, time, taskSize, taskAddress, taskLandmark, taskDetails, taskOptions, taskersNeeded, taskDuration, travelFee = 0, onBack, onContinue }) {
  const navigate = useNavigate()

  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formPhoneError, setFormPhoneError] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [showReviewsModal, setShowReviewsModal] = useState(false)

  const PH_PHONE_RE = /^(09|\+639)\d{9}$/
  const validatePhone = (val) => PH_PHONE_RE.test(val.trim())

  useEffect(() => {
    let settled = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        setProfileLoading(false)
        setShowInlineForm(true)
      }
    }, 5000)

    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          settled = true
          clearTimeout(timeout)
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
          navigate('/login')
          return
        }
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single()
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          setUserProfile({ email: user.email, full_name: profile?.full_name || '', phone: profile?.phone || '' })
          setProfileLoading(false)
        }
      } catch {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          setProfileLoading(false)
          setShowInlineForm(true)
        }
      }
    }
    loadProfile()

    return () => { settled = true; clearTimeout(timeout) }
  }, [])

  async function handleSaveProfile() {
    if (!formName.trim() || !formPhone.trim()) {
      setFormError('Both name and phone are required.')
      return
    }
    if (!validatePhone(formPhone)) {
      setFormPhoneError('Please enter a valid Philippine phone number (e.g. 09171234567 or +639171234567)')
      return
    }
    setFormSaving(true)
    setFormError('')

    const timeoutId = setTimeout(() => {
      setFormSaving(false)
      setFormError('Save timed out. Please check your connection and try again.')
    }, 8000)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Could not get user session.')

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: formName.trim(), phone: formPhone.trim() })

      clearTimeout(timeoutId)

      if (error) {
        setFormError('Failed to save profile. Please try again.')
        setFormSaving(false)
        return
      }

      setUserProfile((prev) => ({ ...prev, full_name: formName.trim(), phone: formPhone.trim() }))
      setShowInlineForm(false)
      setFormSaving(false)
    } catch {
      clearTimeout(timeoutId)
      setFormError('Failed to save profile. Please try again.')
      setFormSaving(false)
    }
  }

  const profileIncomplete = !profileLoading && (!userProfile?.full_name || !userProfile?.phone)

  const formattedDate = date
    ? taskDuration >= 8
      ? `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} (Full Day)`
      : `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${time}`
    : ''
  const summaryDate = date
    ? `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${time?.toLowerCase()}`
    : ''

  return (
    <div className="space-y-5">
      {/* Section 1 – Booking Summary banner */}
      <div className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-xl p-4">
        <CalendarDays size={24} className="text-orange-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-800">Booking Summary</p>
          <p className="text-sm text-gray-600 mt-0.5">
            <span className="font-medium">{tasker?.name}</span> · {summaryDate}
          </p>
        </div>
        <span className="text-xs text-gray-400 capitalize whitespace-nowrap">{service}</span>
      </div>

      {/* Section 2 – Booking Details */}
      <div className="border border-gray-200 rounded-xl p-5">
        <p className="font-bold text-gray-800 text-base mb-3">Booking Details</p>
        <DetailRow label="Service" value={service} valueClass="capitalize" />
        <DetailRow label="Tasker" value={tasker?.name} />
        <DetailRow label="Date &amp; Time" value={formattedDate} />
        {taskDuration && <DetailRow label="Est. Duration" value={`${taskDuration} hours`} />}
        <DetailRow label="Address" value={taskAddress} />
        {taskLandmark && <DetailRow label="Landmark" value={taskLandmark} />}
        <DetailRow label="Task Description" value={taskDetails} />
        {taskOptions && taskOptions.service === 'Cleaning' && (
          <>
            <DetailRow label="Type" value={taskOptions.type} />
            <DetailRow label="Area" value={taskOptions.area} />
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Helpers Assigned" value={taskersNeeded - 1 === 0 ? 'None' : taskersNeeded - 1 === 1 ? '1 Helper' : '2 Helpers'} />
            <DetailRow label="Total Price" value={`₱${taskOptions.total_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Carpentry' && (
          <>
            <DetailRow label="Type of Work" value={taskOptions.type} />
            <DetailRow label="Furniture Category" value={taskOptions.category ?? taskOptions.item} />
            {taskOptions.furniture_dimensions && <DetailRow label="Dimensions" value={taskOptions.furniture_dimensions} />}
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Helpers Assigned" value={taskersNeeded - 1 === 0 ? 'None' : taskersNeeded - 1 === 1 ? '1 Helper' : '2 Helpers'} />
            <DetailRow label="Total Price" value={`₱${taskOptions.total_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Electrical' && (
          <>
            <DetailRow label="Type of Work" value={taskOptions.type} />
            {taskOptions.sub_option && <DetailRow label="Specify Work" value={taskOptions.sub_option} />}
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Helpers Assigned" value={taskersNeeded - 1 === 0 ? 'None' : taskersNeeded - 1 === 1 ? '1 Helper' : '2 Helpers'} />
            <DetailRow label="Total Price" value={`₱${taskOptions.total_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Aircon Maintenance' && (
          <>
            <DetailRow label="Aircon Type" value={taskOptions.aircon_type} />
            <DetailRow label="HP Tier" value={taskOptions.hp_tier} />
            <DetailRow label="Number of Units" value={String(taskOptions.units)} />
            {taskOptions.aircon_type !== 'Install' && <DetailRow label="Service Type" value={taskOptions.service_type} />}
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Helpers Assigned" value={taskersNeeded - 1 === 0 ? 'None' : taskersNeeded - 1 === 1 ? '1 Helper' : '2 Helpers'} />
            <DetailRow label="Total Price" value={`₱${taskOptions.total_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Painting' && (
          <>
            <DetailRow label="What to Paint" value={taskOptions.what_to_paint} />
            {taskOptions.what_to_paint === 'Furniture' ? (
              <>
                <DetailRow label="Furniture Category" value={taskOptions.furniture_category} />
                <DetailRow label="Number of Pieces" value={taskOptions.furniture_pieces} />
              </>
            ) : (
              <DetailRow label="Area Size" value={taskOptions.area} />
            )}
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Helpers Assigned" value={taskersNeeded - 1 === 0 ? 'None' : taskersNeeded - 1 === 1 ? '1 Helper' : '2 Helpers'} />
            <DetailRow label="Total Price" value={`₱${taskOptions.total_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Plumbing Repair' && (
          <>
            <DetailRow label="Problem" value={taskOptions.problem} />
            {taskOptions.sub_option && <DetailRow label="Specify Problem" value={taskOptions.sub_option} />}
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Helpers Assigned" value={taskersNeeded - 1 === 0 ? 'None' : taskersNeeded - 1 === 1 ? '1 Helper' : '2 Helpers'} />
            <DetailRow label="Total Price" value={`₱${taskOptions.total_price?.toLocaleString()}`} />
          </>
        )}
        {travelFee > 0 && (
          <>
            <DetailRow label="Travel Fee" value="₱500" />
            <DetailRow label="Grand Total" value={`₱${((taskOptions?.total_price ?? 0) + travelFee).toLocaleString()}`} />
          </>
        )}
      </div>

      {showReviewsModal && tasker && (
        <ReviewsModal tasker={tasker} onClose={() => setShowReviewsModal(false)} />
      )}

      {/* Section 3 – Tasker Information */}
      <div className="border border-gray-200 rounded-xl p-5">
        <p className="font-bold text-gray-800 text-base mb-4">Your Tasker</p>
        <div className="flex gap-4 mb-4">
          {tasker?.profile_photo ? (
            <img
              src={tasker.profile_photo.startsWith('http') ? tasker.profile_photo : supabase.storage.from('tasker-files').getPublicUrl(tasker.profile_photo).data.publicUrl}
              alt={tasker.name}
              className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400">
              <User size={28} />
            </div>
          )}
          <div>
            <p className="font-bold text-gray-800 text-base leading-tight">{tasker?.name}</p>
            <p className="text-sm text-orange-500 font-medium">{tasker?.role}</p>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold">{(tasker?.rating ?? 0).toFixed(1)}</span>
              <button
                onClick={() => setShowReviewsModal(true)}
                className="flex items-center gap-1 border border-orange-500 text-orange-500 rounded-full px-3 py-0.5 text-xs font-semibold hover:bg-orange-500 hover:text-white transition cursor-pointer"
              >
                <Star size={12} />
                {formatReviews(tasker?.reviews ?? 0)} reviews
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 – Your Information */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-800 text-base">Your Information</p>
          <button
            type="button"
            onClick={() => setShowInlineForm((v) => !v)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            <Pencil size={15} />
          </button>
        </div>

        {profileLoading ? (
          <p className="text-sm text-gray-400">Loading your profile...</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <User size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-400">Name:</span>
                {userProfile?.full_name
                  ? <span>{userProfile.full_name}</span>
                  : <span className="italic text-red-400">Not set</span>}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-400">Phone:</span>
                {userProfile?.phone
                  ? <span>{userProfile.phone}</span>
                  : <span className="italic text-red-400">Not set</span>}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-400">Email:</span>
                <span>{userProfile?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-400">Address:</span>
                <span>{taskAddress}</span>
              </div>
            </div>

            {profileIncomplete && !showInlineForm && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  Please complete your profile before proceeding. We need your name and phone number to confirm your booking.
                </p>
                <button
                  onClick={() => { setFormName(userProfile?.full_name || ''); setFormPhone(userProfile?.phone || ''); setShowInlineForm(true) }}
                  className="text-sm font-semibold text-orange-500 hover:text-orange-600 underline"
                >
                  Complete Profile
                </button>
              </div>
            )}

            {showInlineForm && (
              <div className="mt-4 border border-orange-200 rounded-xl p-4 bg-orange-50 space-y-3">
                <p className="text-sm font-bold text-gray-800">Complete Your Profile</p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => { setFormPhone(e.target.value); setFormPhoneError('') }}
                    onKeyDown={(e) => { if (!/[0-9+]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab') e.preventDefault() }}
                    onBlur={() => {
                      if (formPhone && !validatePhone(formPhone))
                        setFormPhoneError('Please enter a valid Philippine phone number (e.g. 09171234567 or +639171234567)')
                      else
                        setFormPhoneError('')
                    }}
                    placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                    className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 ${formPhoneError ? 'border-red-400' : formPhone && validatePhone(formPhone) ? 'border-green-400' : 'border-gray-200'}`}
                  />
                  {formPhoneError && <p className="text-xs text-red-500 mt-1">{formPhoneError}</p>}
                </div>
                {formError && <p className="text-xs text-red-500">{formError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={formSaving}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
                  >
                    {formSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setShowInlineForm(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Note box */}
      <div className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-xl p-4">
        <Info size={18} className="text-orange-400 flex-shrink-0" />
        <p className="text-sm text-gray-600">
          Your contact information will be shared with your Tasker once payment is confirmed. Please proceed to payment to finalize your booking.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3 pt-1">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 underline text-center md:text-left"
        >
          ← Back
        </button>
        <button
          onClick={onContinue}
          disabled={profileIncomplete || profileLoading}
          className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-colors text-base"
        >
          Proceed to Payment
        </button>
      </div>
    </div>
  )
}

function ProgressTracker({ step }) {
  return (
    <div className="w-full px-1 mb-2">
      <div className="relative flex items-center w-full">
        <div className="absolute left-0 right-0 h-[2px] bg-gray-300" />
        <div
          className="absolute left-0 h-[2px] bg-orange-500 transition-all"
          style={{ width: step === 0 ? '0%' : `${(step / (STEPS.length - 1)) * 100}%` }}
        />
        <div className="relative flex justify-between w-full">
          {STEPS.map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              {i < step ? (
                <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-500" />
              ) : i === step ? (
                <div className="w-5 h-5 rounded-full border-2 border-orange-500 bg-white" />
              ) : (
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex justify-between w-full mt-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex flex-col items-center" style={{ width: `${100 / STEPS.length}%` }}>
            {i === step && (
              <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
                {i + 1}: {s.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const NOMINATIM_BASE_BOOKING = '/nominatim'

function MapFlyTo({ coords }) {
  const map = useMap()
  useEffect(() => { if (coords) map.flyTo(coords, 17) }, [coords])
  return null
}

function InteractiveAddressMap({ address, onLandmarkFound }) {
  const [coords, setCoords] = useState([12.8797, 121.7740])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedPin, setSelectedPin] = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)
  const searchDebounce = useRef(null)
  const geocodeDebounce = useRef(null)

  useEffect(() => {
    if (!address) return
    clearTimeout(geocodeDebounce.current)
    geocodeDebounce.current = setTimeout(() => {
      fetch(`${NOMINATIM_BASE_BOOKING}/search?format=json&q=${encodeURIComponent(address)}&countrycodes=ph`)
        .then(r => r.json())
        .then(data => {
          if (data?.length > 0) {
            const pos = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
            setCoords(pos)
            setFlyTarget(pos)
          }
        })
        .catch(() => {})
    }, 1000)
  }, [address])

  function handleSearchInput(val) {
    setSearchQuery(val)
    setSearchResults([])
    clearTimeout(searchDebounce.current)
    if (!val.trim()) return
    searchDebounce.current = setTimeout(() => {
      setSearching(true)
      fetch(`${NOMINATIM_BASE_BOOKING}/search?format=json&q=${encodeURIComponent(val)}&countrycodes=ph&limit=5`)
        .then(r => r.json())
        .then(data => setSearchResults(data || []))
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 1000)
  }

  function handleSelectResult(result) {
    const pos = [parseFloat(result.lat), parseFloat(result.lon)]
    const name = result.name || result.display_name.split(',')[0]
    setSelectedPin(pos)
    setFlyTarget(pos)
    setSearchQuery(name)
    setSearchResults([])
    onLandmarkFound(name)
  }

  const pinIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;background:#f97316;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
    className: '', iconSize: [14, 14], iconAnchor: [7, 7],
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearchInput(e.target.value)}
          placeholder="Search for a landmark or place..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          autoComplete="off"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Searching…</span>
        )}
        {searchResults.length > 0 && (
          <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((r, i) => (
              <li
                key={i}
                onMouseDown={() => handleSelectResult(r)}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 border-b border-gray-100 last:border-0"
              >
                <span className="font-medium text-gray-800">{r.name || r.display_name.split(',')[0]}</span>
                <span className="block text-xs text-gray-400 truncate">{r.display_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="relative">
        <MapContainer center={coords} zoom={6} className="w-full h-48 rounded-xl" style={{ zIndex: 1 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={coords}>
            <Popup>{address}</Popup>
          </Marker>
          {selectedPin && (
            <Marker position={selectedPin} icon={pinIcon}>
              <Popup>{searchQuery}</Popup>
            </Marker>
          )}
          {flyTarget && <MapFlyTo coords={flyTarget} />}
        </MapContainer>
      </div>
    </div>
  )
}

function Step1({ service, onContinue, initialState }) {
  const [address, setAddress] = useState(initialState?.address ?? '')
  const [landmark, setLandmark] = useState(initialState?.landmark ?? '')
  const [size] = useState('Medium')
  const [details, setDetails] = useState(initialState?.details ?? '')
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [micDenied, setMicDenied] = useState(false)
  const [unsupportedToast, setUnsupportedToast] = useState(false)
  const recognitionRef = useRef(null)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isSpeechSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  const shouldShowMic = isSpeechSupported && !(isIOS && isSafari)

  function toggleRecording() {
    if (!isSpeechSupported) {
      setUnsupportedToast(true)
      setTimeout(() => setUnsupportedToast(false), 3000)
      return
    }
    if (isRecording) {
      recognitionRef.current?.stop()
      return
    }
    setMicDenied(false)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-PH'
    rec.onresult = (e) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      if (final) setDetails((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + final)
      setInterimText(interim)
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setMicDenied(true)
      setIsRecording(false)
      setInterimText('')
    }
    rec.onend = () => { setIsRecording(false); setInterimText('') }
    recognitionRef.current = rec
    rec.start()
    setIsRecording(true)
  }

  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState(initialState?.imagePreview ?? null)
  const [analyzing, setAnalyzing] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validatingDescription, setValidatingDescription] = useState(false)
  const [imageError, setImageError] = useState('')
  const [aiResult, setAiResult] = useState(initialState?.aiResult ?? '')
  const [fileInputKey, setFileInputKey] = useState(0)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [addressError, setAddressError] = useState('')

  function validateAddress(val) {
    const v = val.trim()
    if (v.length < 10) return 'Please enter a valid address (e.g., 123 Rizal St, Brgy Poblacion, Quezon City)'
    if (!/\d/.test(v)) return 'Your address should include a house/unit/lot number (e.g., 123 Rizal St)'
    if (v.split(/\s+/).filter(Boolean).length < 2) return 'Please enter a complete address with a street or barangay'
    if (/^[\d\s\W]+$/.test(v)) return 'Please enter a valid address (e.g., 123 Rizal St, Brgy Poblacion, Quezon City)'
    const keywords = /\b(st|street|ave|avenue|blvd|boulevard|road|rd|lane|ln|dr|drive|ext|unit|apt|block|blk|lot|floor|flr|room|rm|barangay|brgy|bgy|subdivision|subd|village|vill|compound|building|bldg|quezon|manila|makati|pasig|taguig|marikina|caloocan|malabon|navotas|valenzuela|paranaque|las\s*pinas|muntinlupa|mandaluyong|san\s*juan|pasay|pateros|cebu|davao|iloilo|zamboanga|antipolo|bacoor|imus|dasmariñas|dasmarinas|general\s*trias|cavite|laguna|bulacan|rizal|batangas|pampanga|bataan|nueva\s*ecija|tarlac|pangasinan|palawan|bohol|leyte|samar|bukidnon|misamis|cagayan|isabela|nueva\s*vizcaya|north|south|east|west|upper|lower|highway|hiway|hway)\b/i
    if (!keywords.test(v)) return 'Please include a street, barangay, or city name (e.g., 123 Rizal St, Brgy Poblacion, Quezon City)'
    return ''
  }
  const [cleaningType, setCleaningType] = useState(initialState?.cleaningType ?? '')
  const [cleaningArea, setCleaningArea] = useState(initialState?.cleaningArea ?? '')
  const [cleaningExtras, setCleaningExtras] = useState(initialState?.cleaningExtras ?? [])
  const [carpentryType, setCarpentryType] = useState(initialState?.carpentryType ?? '')
  const [carpentryCategory, setCarpentryCategory] = useState(initialState?.carpentryCategory ?? '')
  const [carpentryDimensions, setCarpentryDimensions] = useState(initialState?.carpentryDimensions ?? '')
  const [carpentryExtras, setCarpentryExtras] = useState(initialState?.carpentryExtras ?? [])
  const [electricalType, setElectricalType] = useState(initialState?.electricalType ?? '')
  const [electricalSubOption, setElectricalSubOption] = useState(initialState?.electricalSubOption ?? '')
  const [electricalUrgency, setElectricalUrgency] = useState(initialState?.electricalUrgency ?? '')
  const [electricalExtras, setElectricalExtras] = useState(initialState?.electricalExtras ?? [])
  const [airconType, setAirconType] = useState(initialState?.airconType ?? '')
  const [airconUnits, setAirconUnits] = useState(initialState?.airconUnits ?? 1)
  const [airconServiceType, setAirconServiceType] = useState(initialState?.airconServiceType ?? '')
  const [airconExtras, setAirconExtras] = useState(initialState?.airconExtras ?? [])
  const [airconHpTier, setAirconHpTier] = useState(initialState?.airconHpTier ?? '')
  const [airconServiceCategory, setAirconServiceCategory] = useState(initialState?.airconServiceCategory ?? '')
  const [paintingWhat, setPaintingWhat] = useState(initialState?.paintingWhat ?? '')
  const [paintingArea, setPaintingArea] = useState(initialState?.paintingArea ?? '')
  const [paintingFurnitureCategory, setPaintingFurnitureCategory] = useState(initialState?.paintingFurnitureCategory ?? '')
  const [paintingFurniturePieces, setPaintingFurniturePieces] = useState(initialState?.paintingFurniturePieces ?? 1)
  const [paintingPaintProvided, setPaintingPaintProvided] = useState('')
  const [paintingExtras, setPaintingExtras] = useState(initialState?.paintingExtras ?? [])
  const [plumbingProblem, setPlumbingProblem] = useState(initialState?.plumbingProblem ?? '')
  const [plumbingSubOption, setPlumbingSubOption] = useState(initialState?.plumbingSubOption ?? '')
  const [plumbingUrgency, setPlumbingUrgency] = useState('')
  const [plumbingExtras, setPlumbingExtras] = useState(initialState?.plumbingExtras ?? [])

  const [taskPrices, setTaskPrices] = useState(null)
  const [pricesFetchError, setPricesFetchError] = useState(false)

  useEffect(() => {
    supabase.from('task_prices').select('*').then(({ data, error }) => {
      if (error || !data) { setPricesFetchError(true); setTaskPrices({}); return }
      const map = {}
      data.forEach(r => { map[`${r.service_name}:${r.task_size}`] = Number(r.price) })
      setTaskPrices(map)
    })
  }, [])

  function tp(svc, size) {
    return taskPrices?.[`${svc}:${size}`] ?? 0
  }

  const BASE_PRICES = {
    'Basic Cleaning':  {
      'Small (1 room)':      tp('Cleaning', 'Basic Cleaning - Small (1 room)'),
      'Medium (2-3 rooms)':  tp('Cleaning', 'Basic Cleaning - Medium (2-3 rooms)'),
      'Large (whole house)': tp('Cleaning', 'Basic Cleaning - Large (whole house)'),
    },
    'Deep Cleaning': {
      'Small (1 room)':      tp('Cleaning', 'Deep Cleaning - Small (1 room)'),
      'Medium (2-3 rooms)':  tp('Cleaning', 'Deep Cleaning - Medium (2-3 rooms)'),
      'Large (whole house)': tp('Cleaning', 'Deep Cleaning - Large (whole house)'),
    },
  }
  const EXTRAS_PRICES = {
    'With Laundry':    tp('Cleaning', 'Extra - With Laundry'),
    'With Appliances': tp('Cleaning', 'Extra - With Appliances'),
  }

  const CARPENTRY_CATEGORIES = [
    { value: 'Single Seat',        example: 'e.g. Chair, Stool, Rocking Chair, Bar Stool, Accent Chair',          prices: { Repair: 450,  Install: 600 } },
    { value: 'Multiple Seats',     example: 'e.g. Bench, Sofa, Loveseat, Sectional Sofa, Church Pew',             prices: { Repair: 650,  Install: 850 } },
    { value: 'Sleeping / Lying',   example: 'e.g. Bed Frame, Bunk Bed, Daybed, Cot, Trundle Bed',                 prices: { Repair: 700,  Install: 900 } },
    { value: 'Tables',             example: 'e.g. Dining Table, Coffee Table, Study Desk, Side Table, Console Table', prices: { Repair: 550, Install: 700 } },
    { value: 'Storage',            example: 'e.g. Cabinet, Drawer, Bookshelf, Wardrobe, Shoe Rack',               prices: { Repair: 600,  Install: 800 } },
    { value: 'Religious',          example: 'e.g. Altar, Prayer Table, Oratory',                                  prices: { Repair: 500,  Install: 650 } },
    { value: 'Entertainment',      example: 'e.g. TV Stand, Display Cabinet, Bar Counter',                        prices: { Repair: 550,  Install: 700 } },
    { value: 'Campaign / Outdoor', example: 'e.g. Folding Table, Folding Chair, Picnic Bench',                    prices: { Repair: 400,  Install: 550 } },
  ]

  const CARPENTRY_EXTRAS_PRICES = {
    'Materials Included':       tp('Carpentry', 'Extra - Materials Included'),
    'Varnishing / Finishing':   tp('Carpentry', 'Extra - Varnishing / Finishing'),
    'Hauling / Debris Removal': tp('Carpentry', 'Extra - Hauling / Debris Removal'),
  }

  const ELECTRICAL_TYPES = [
    { value: 'Install Outlet', price: tp('Electrical', 'Install Outlet') },
    { value: 'Repair Wiring',  price: tp('Electrical', 'Repair Wiring') },
    { value: 'Install Lights', price: tp('Electrical', 'Install Lights') },
  ]
  const ELECTRICAL_SUB_OPTIONS = {
    'Install Outlet': ['Standard Wall Outlet', 'USB Outlet', 'Outdoor/Weatherproof Outlet', 'Extension Box Installation'],
    'Repair Wiring':  ['Tripping Breaker', 'Dead Outlet / Switch', 'Exposed / Damaged Wiring', 'Flickering Lights'],
    'Install Lights': ['Ceiling Light / Downlight', 'Wall Sconce', 'LED Strip Lights', 'Outdoor / Security Light'],
  }
  const ELECTRICAL_EXTRAS_PRICES = {
    'Materials Included':       tp('Electrical', 'Extra - Materials Included'),
    'Additional Outlet/Switch': tp('Electrical', 'Extra - Additional Outlet/Switch'),
    'Circuit Breaker Check':    tp('Electrical', 'Extra - Circuit Breaker Check'),
  }

  const AIRCON_PRICES = {
    'Window Type': {
      'Cleaning':           tp('Aircon Maintenance', 'Window Type - Cleaning'),
      'Cleaning + Checkup': tp('Aircon Maintenance', 'Window Type - Cleaning + Checkup'),
    },
    'Split Type': {
      'Cleaning':           tp('Aircon Maintenance', 'Split Type - Cleaning'),
      'Cleaning + Checkup': tp('Aircon Maintenance', 'Split Type - Cleaning + Checkup'),
    },
  }

  const AIRCON_HP_MODIFIERS = {
    'Small (0.5–1.0 HP)':  0,
    'Medium (1.5–2.5 HP)': 200,
    'Large (3–4 HP)':      400,
  }

  const AIRCON_INSTALL_PRICES = {
    'Small (0.5–1.0 HP)':  1500,
    'Medium (1.5–2.5 HP)': 2000,
    'Large (3–4 HP)':      2800,
  }

  const PLUMBING_PROBLEMS = [
    { value: 'Leaking Faucet', price: tp('Plumbing Repair', 'Leaking Faucet') },
    { value: 'Clogged Drain',  price: tp('Plumbing Repair', 'Clogged Drain') },
    { value: 'Pipe Repair',    price: tp('Plumbing Repair', 'Pipe Repair') },
  ]
  const PLUMBING_SUB_OPTIONS = {
    'Leaking Faucet': ['Kitchen Faucet', 'Bathroom Faucet', 'Shower Head', 'Outdoor Faucet'],
    'Clogged Drain':  ['Kitchen Sink', 'Bathroom Sink', 'Floor Drain', 'Toilet Bowl'],
    'Pipe Repair':    ['Minor Leak (visible drip)', 'Burst Pipe', 'Pipe Joint Repair', 'Water Pressure Issue'],
  }
  const PLUMBING_EXTRAS_PRICES = {
    'Materials Included':                   tp('Plumbing Repair', 'Extra - Materials Included'),
    'Multiple Points (2+ faucets/drains)':  tp('Plumbing Repair', 'Extra - Multiple Points (2+ faucets/drains)'),
    'Waterproofing':                        tp('Plumbing Repair', 'Extra - Waterproofing'),
  }

  const PAINTING_BASE_PRICES = {
    'Wall':           { 'Small': tp('Painting', 'Wall - Small'),    'Medium': tp('Painting', 'Wall - Medium'),    'Large': tp('Painting', 'Wall - Large') },
    'Ceiling / Roof': { 'Small': tp('Painting', 'Ceiling - Small'), 'Medium': tp('Painting', 'Ceiling - Medium'), 'Large': tp('Painting', 'Ceiling - Large') },
  }
  const PAINTING_FURNITURE_PRICES = {
    'Single Seat':        200,
    'Multiple Seats':     350,
    'Sleeping / Lying':   400,
    'Tables':             300,
    'Storage':            350,
    'Religious':          250,
    'Entertainment':      300,
    'Campaign / Outdoor': 200,
  }
  const PAINTING_FURNITURE_CATEGORIES = [
    { value: 'Single Seat',        example: 'e.g. Chair, Stool, Rocking Chair, Bar Stool, Accent Chair' },
    { value: 'Multiple Seats',     example: 'e.g. Bench, Sofa, Loveseat, Sectional Sofa, Church Pew' },
    { value: 'Sleeping / Lying',   example: 'e.g. Bed Frame, Bunk Bed, Daybed, Cot, Trundle Bed' },
    { value: 'Tables',             example: 'e.g. Dining Table, Coffee Table, Study Desk, Side Table, Console Table' },
    { value: 'Storage',            example: 'e.g. Cabinet, Drawer, Bookshelf, Wardrobe, Shoe Rack' },
    { value: 'Religious',          example: 'e.g. Altar, Prayer Table, Oratory' },
    { value: 'Entertainment',      example: 'e.g. TV Stand, Display Cabinet, Bar Counter' },
    { value: 'Campaign / Outdoor', example: 'e.g. Folding Table, Folding Chair, Picnic Bench' },
  ]
  const PAINTING_PAINT_COSTS = {
    'Small':  tp('Painting', 'Paint Cost - Small'),
    'Medium': tp('Painting', 'Paint Cost - Medium'),
    'Large':  tp('Painting', 'Paint Cost - Large'),
  }
  const PAINTING_EXTRAS_PRICES = {
    'Primer Coat':           tp('Painting', 'Extra - Primer Coat'),
    'Two Coats':             tp('Painting', 'Extra - Two Coats'),
    'Wall Putty / Patching': tp('Painting', 'Extra - Wall Putty / Patching'),
  }

  // Cleaning pricing
  const basePrice = cleaningType && cleaningArea ? BASE_PRICES[cleaningType]?.[cleaningArea] ?? 0 : 0
  const extrasTotal = cleaningExtras.reduce((sum, e) => sum + (EXTRAS_PRICES[e] ?? 0), 0)
  const finalPrice = basePrice + extrasTotal

  // Carpentry pricing
  const carpentryBasePrice = (carpentryType && carpentryCategory)
    ? (CARPENTRY_CATEGORIES.find(c => c.value === carpentryCategory)?.prices?.[carpentryType] ?? 0)
    : 0
  const carpentryExtrasTotal = carpentryExtras.reduce((sum, e) => sum + (CARPENTRY_EXTRAS_PRICES[e] ?? 0), 0)
  const carpentryFinalPrice = carpentryBasePrice + carpentryExtrasTotal

  // Electrical pricing
  const electricalBasePrice = ELECTRICAL_TYPES.find(t => t.value === electricalType)?.price ?? 0
  const electricalUrgencySurcharge = 0
  const electricalExtrasTotal = electricalExtras.reduce((sum, e) => sum + (ELECTRICAL_EXTRAS_PRICES[e] ?? 0), 0)
  const electricalFinalPrice = electricalBasePrice + electricalExtrasTotal

  // Aircon pricing
  const airconHpModifier = (airconType && airconType !== 'Install') ? (AIRCON_HP_MODIFIERS[airconHpTier] ?? 0) : 0
  const airconPricePerUnit = airconType === 'Install'
    ? (airconHpTier ? (AIRCON_INSTALL_PRICES[airconHpTier] ?? 0) : 0)
    : (airconType && airconServiceType ? (AIRCON_PRICES[airconType]?.[airconServiceType] ?? 0) : 0)
  const airconBasePrice = (airconPricePerUnit + airconHpModifier) * airconUnits
  const airconFreonTotal = airconExtras.includes('Freon Recharge') ? 500 * airconUnits : 0
  const airconSameDayTotal = airconExtras.includes('Same Day Service') ? 300 : 0
  const airconExtrasTotal = airconFreonTotal + airconSameDayTotal
  const airconFinalPrice = airconBasePrice + airconExtrasTotal

  // Plumbing pricing
  const plumbingBasePrice = PLUMBING_PROBLEMS.find(p => p.value === plumbingProblem)?.price ?? 0
  const plumbingUrgencySurcharge = plumbingUrgency === 'urgent' ? 500 : 0
  const plumbingExtrasTotal = plumbingExtras.reduce((sum, e) => sum + (PLUMBING_EXTRAS_PRICES[e] ?? 0), 0)
  const plumbingFinalPrice = plumbingBasePrice + plumbingExtrasTotal + plumbingUrgencySurcharge

  // Painting pricing
  const paintingIsFurniture = paintingWhat === 'Furniture'
  const paintingBasePrice = paintingIsFurniture
    ? (paintingFurnitureCategory ? (PAINTING_FURNITURE_PRICES[paintingFurnitureCategory] ?? 0) * paintingFurniturePieces : 0)
    : (paintingWhat && paintingArea ? (PAINTING_BASE_PRICES[paintingWhat]?.[paintingArea] ?? 0) : 0)
  const paintingPaintCost = 0
  const paintingExtrasTotal = paintingExtras.reduce((sum, e) => sum + (PAINTING_EXTRAS_PRICES[e] ?? 0), 0)
  const paintingFinalPrice = paintingBasePrice + paintingPaintCost + paintingExtrasTotal

  const taskersNeeded = (() => {
    const isCleaning = service?.toLowerCase() === 'cleaning'
    const isCarpentry = service?.toLowerCase() === 'carpentry'
    const isElectrical = service?.toLowerCase() === 'electrical'
    const isAircon = service?.toLowerCase() === 'aircon cleaning'
    if (isCleaning) {
      if (!cleaningType || !cleaningArea) return 1
      if (cleaningArea === 'Large (whole house)' && cleaningExtras.length > 0) return 3
      if (cleaningArea === 'Large (whole house)') return 2
      if (cleaningType === 'Deep Cleaning' && cleaningArea === 'Medium (2-3 rooms)') return 2
      return 1
    }
    if (isCarpentry) {
      if (!carpentryType || !carpentryCategory) return 1
      const twoTaskerCategories = ['Multiple Seats', 'Storage', 'Sleeping / Lying']
      return twoTaskerCategories.includes(carpentryCategory) ? 2 : 1
    }
    if (isElectrical) {
      return electricalType === 'Repair Wiring' ? 2 : 1
    }
    if (isAircon) {
      if (airconUnits >= 5) return 3
      if (airconUnits >= 3) return 2
      return 1
    }
    const isPainting = service?.toLowerCase() === 'painting'
    if (isPainting) {
      if (paintingIsFurniture) {
        if (paintingFurniturePieces >= 3) return 2
        return 1
      }
      if (paintingArea === 'Large') return 3
      if (paintingArea === 'Medium') return 2
      return 1
    }
    const isPlumbing = service?.toLowerCase() === 'plumbing repair'
    if (isPlumbing) {
      return plumbingProblem === 'Pipe Repair' ? 2 : 1
    }
    return 1
  })()

  const helpers = taskersNeeded - 1
  const currentPartialOptions = (() => {
    if (service?.toLowerCase() === 'cleaning' && cleaningType && cleaningArea)
      return { service: 'Cleaning', type: cleaningType, area: cleaningArea }
    if (service?.toLowerCase() === 'carpentry' && carpentryType && carpentryCategory) {
      return { service: 'Carpentry', type: carpentryType }
    }
    if (service?.toLowerCase() === 'electrical' && electricalType)
      return { service: 'Electrical', type: electricalType }
    if (service?.toLowerCase() === 'aircon cleaning')
      return { service: 'Aircon Maintenance', units: airconUnits }
    if (service?.toLowerCase() === 'painting' && (paintingArea || paintingFurnitureCategory))
      return { service: 'Painting', area: paintingIsFurniture ? (paintingFurniturePieces >= 3 ? 'Large' : 'Small') : paintingArea }
    if (service?.toLowerCase() === 'plumbing repair' && plumbingProblem)
      return { service: 'Plumbing Repair', problem: plumbingProblem }
    return null
  })()
  const isHeavy = currentPartialOptions ? getTaskDuration(currentPartialOptions) >= 8 : false
  const helperFee = helpers > 0 ? helpers * (isHeavy ? 600 : 300) : 0
  const helperLabel = helpers > 0
    ? `${helpers} Helper${helpers > 1 ? 's' : ''} (${isHeavy ? 'Full' : 'Half'} Day)`
    : ''

  const handleDetectLocation = () => {
    setDetectingLocation(true)
    setLocationError('')

    const onSuccess = async (position) => {
      try {
        const { latitude, longitude } = position.coords
        const res = await fetch(
          `/nominatim/reverse?format=json&lat=${latitude}&lon=${longitude}`
        )
        const data = await res.json()
        if (data?.display_name) {
          setAddress(data.display_name)
          setAddressError('')
        } else {
          setLocationError('Could not determine address from location.')
        }
      } catch {
        setLocationError('Reverse geocoding failed.')
      } finally {
        setDetectingLocation(false)
      }
    }

    const onError = async () => {
      try {
        const res = await fetch(
          `http://api.ipstack.com/check?access_key=${import.meta.env.VITE_IPSTACK_API_KEY}`
        )
        const data = await res.json()
        const parts = [data.city, data.region_name, data.country_name].filter(Boolean)
        if (parts.length > 0) {
          setAddress(parts.join(', '))
          setAddressError('')
        } else {
          setLocationError('Could not detect location. Please enter your address manually.')
        }
      } catch {
        setLocationError('Could not detect location. Please enter your address manually.')
      } finally {
        setDetectingLocation(false)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, { timeout: 10000 })
    } else {
      onError()
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setAiResult('')
    setImageError('')
    setFileInputKey((k) => k + 1)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      setImagePreview(base64)
      setAiResult('')
      setImageError('')

      // Step 1: Validate image relevance
      setValidating(true)
      let passedValidation = true
      try {
        const validationResponse = await groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: base64 }
                },
                {
                  type: 'text',
                  text: `Look at this image. The user is booking a ${service} service. Is this image relevant to that service? It should show a home, room, appliance, fixture, wall, pipe, furniture, or any area/object that reasonably relates to ${service}. Answer ONLY with a JSON object: { "relevant": true or false, "reason": "short reason" }. Do not add any other text.`
                }
              ]
            }
          ]
        })
        const raw = validationResponse.choices[0].message.content.trim()
        try {
          const json = JSON.parse(raw.replace(/```json|```/g, '').trim())
          if (json.relevant === false) {
            passedValidation = false
            setImagePreview(null)
            setFileInputKey((k) => k + 1)
            setImageError(`⚠️ That image doesn't seem related to ${service}. Please upload a photo of the area or item you need serviced (e.g., your room, appliance, wall, etc.).`)
          }
        } catch {
          // Unparseable response — fail open, allow image through
        }
      } catch {
        // Validation API error — fail open, allow image through
      } finally {
        setValidating(false)
      }

      if (!passedValidation) return

      // Step 2: Full AI analysis
      setAnalyzing(true)
      try {
        const response = await groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: base64 }
                },
                {
                  type: 'text',
                  text: 'You are a home damage assessment AI for hanap.ph, a Philippine home services platform. Analyze this image and identify any home damage or issues. Respond in this exact format with no numbering or bullet points:\n\nDetected Issue: [brief issue name]\nRecommended Service: [one of: Cleaning, Plumbing, Electrical, Carpentry, Painting, or Aircon Cleaning]\nDescription: [1-2 sentence practical description for a booking form]\n\nKeep it short and practical.'
                }
              ]
            }
          ]
        })
        const result = response.choices[0].message.content
        setAiResult(result)
      } catch {
        setAiResult('error')
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleContinue = async () => {
    if (taskPrices === null) {
      setError('Prices are still loading, please wait.')
      return
    }
    if (pricesFetchError) {
      setError('Could not load prices. Please refresh the page.')
      return
    }
    if (!details.trim()) {
      setError('Please fill in all required fields')
      return
    }
    const addrErr = validateAddress(address)
    if (addrErr) {
      setAddressError(addrErr)
      setError('Please fix the address before continuing.')
      return
    }
    if (service?.toLowerCase() === 'cleaning' && (!cleaningType || !cleaningArea)) {
      setError('Please complete all required task options before continuing.')
      return
    }
    if (service?.toLowerCase() === 'carpentry' && (!carpentryType || !carpentryCategory)) {
      setError('Please complete all required task options before continuing.')
      return
    }
    if (service?.toLowerCase() === 'electrical' && (!electricalType || !electricalSubOption)) {
      setError('Please complete all required task options before continuing.')
      return
    }
    if (service?.toLowerCase() === 'aircon cleaning') {
      if (!airconServiceCategory || !airconType || !airconHpTier || (airconServiceCategory === 'maintenance' && !airconServiceType)) {
        setError('Please complete all required task options before continuing.')
        return
      }
      if (!imagePreview) {
        setError('A photo of the service area is required for Aircon bookings. Please upload an image before continuing.')
        return
      }
    }
    if (service?.toLowerCase() === 'painting') {
      const furnitureIncomplete = paintingWhat === 'Furniture' && !paintingFurnitureCategory
      const areaIncomplete = paintingWhat !== 'Furniture' && !paintingArea
      if (!paintingWhat || furnitureIncomplete || areaIncomplete) {
        setError('Please complete all required task options before continuing.')
        return
      }
    }
    if (service?.toLowerCase() === 'plumbing repair' && (!plumbingProblem || !plumbingSubOption)) {
      setError('Please complete all required task options before continuing.')
      return
    }
    setError('')

    // Groq description validation
    setValidatingDescription(true)
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a validation assistant. Your only job is to determine if a user-provided task description is meaningful and readable, or if it is gibberish, random characters, nonsensical input, or too vague to be useful. Respond ONLY with a JSON object in this exact format: { "valid": true } or { "valid": false }. No other text.'
          },
          {
            role: 'user',
            content: `Task description: "${details.trim()}"`
          }
        ],
        max_tokens: 20,
      })
      const raw = response.choices[0].message.content.trim()
      try {
        const json = JSON.parse(raw.replace(/```json|```/g, '').trim())
        if (json.valid === false) {
          setError('Please provide a clear description of the task. We need enough detail to match you with the right tasker.')
          setValidatingDescription(false)
          return
        }
      } catch {
        // Unparseable response — fail open and proceed
      }
    } catch {
      // API error — fail open and proceed
    }
    setValidatingDescription(false)

    const aiImageAnalysis = aiResult && aiResult !== 'error' ? aiResult : null
    const isCleaning = service?.toLowerCase() === 'cleaning'
    const isCarpentry = service?.toLowerCase() === 'carpentry'
    const isElectrical = service?.toLowerCase() === 'electrical'
    const isAircon = service?.toLowerCase() === 'aircon cleaning'
    const isPainting = service?.toLowerCase() === 'painting'
    const isPlumbing = service?.toLowerCase() === 'plumbing repair'
    onContinue({
      address: address.trim(),
      landmark: landmark.trim(),
      size,
      details: details.trim(),
      aiImageAnalysis,
      ...(isCleaning && cleaningType && cleaningArea ? {
        taskOptions: {
          service: 'Cleaning',
          type: cleaningType,
          area: cleaningArea,
          extras: cleaningExtras,
          base_price: basePrice,
          extras_total: extrasTotal,
          final_price: finalPrice,
          helper_fee: helperFee,
          total_price: finalPrice + helperFee,
          is_heavy: isHeavy,
        },
        taskersNeeded,
        estimatedTotal: finalPrice + helperFee,
      } : {}),
      ...(isCarpentry && carpentryType && carpentryCategory ? {
        taskOptions: {
          service: 'Carpentry',
          type: carpentryType,
          category: carpentryCategory,
          furniture_dimensions: carpentryDimensions.trim() || null,
          extras: carpentryExtras,
          base_price: carpentryBasePrice,
          extras_total: carpentryExtrasTotal,
          final_price: carpentryFinalPrice,
          helper_fee: helperFee,
          total_price: carpentryFinalPrice + helperFee,
          is_heavy: isHeavy,
        },
        taskersNeeded,
        estimatedTotal: carpentryFinalPrice + helperFee,
      } : {}),
      ...(isElectrical && electricalType && electricalSubOption ? {
        taskOptions: {
          service: 'Electrical',
          type: electricalType,
          sub_option: electricalSubOption,
          extras: electricalExtras,
          base_price: electricalBasePrice,
          extras_total: electricalExtrasTotal,
          final_price: electricalFinalPrice,
          helper_fee: helperFee,
          total_price: electricalFinalPrice + helperFee,
          is_heavy: isHeavy,
        },
        taskersNeeded,
        estimatedTotal: electricalFinalPrice + helperFee,
      } : {}),
      ...(isAircon && airconType && airconHpTier && (airconType === 'Install' || airconServiceType) ? {
        taskOptions: {
          service: 'Aircon Maintenance',
          aircon_type: airconType,
          units: airconUnits,
          service_type: airconType !== 'Install' ? airconServiceType : 'Install',
          hp_tier: airconHpTier,
          extras: airconExtras,
          price_per_unit: airconPricePerUnit,
          hp_modifier: airconHpModifier,
          base_price: airconBasePrice,
          extras_total: airconExtrasTotal,
          final_price: airconFinalPrice,
          helper_fee: helperFee,
          total_price: airconFinalPrice + helperFee,
          is_heavy: isHeavy,
        },
        taskersNeeded,
        estimatedTotal: airconFinalPrice + helperFee,
      } : {}),
      ...(isPainting && paintingWhat && (paintingWhat === 'Furniture' ? paintingFurnitureCategory : paintingArea) ? {
        taskOptions: {
          service: 'Painting',
          what_to_paint: paintingWhat,
          area: paintingWhat === 'Furniture' ? null : paintingArea,
          furniture_category: paintingWhat === 'Furniture' ? paintingFurnitureCategory : null,
          furniture_pieces: paintingWhat === 'Furniture' ? paintingFurniturePieces : null,
          extras: paintingExtras,
          base_price: paintingBasePrice,
          extras_total: paintingExtrasTotal,
          final_price: paintingFinalPrice,
          helper_fee: helperFee,
          total_price: paintingFinalPrice + helperFee,
          is_heavy: isHeavy,
        },
        taskersNeeded,
        estimatedTotal: paintingFinalPrice + helperFee,
      } : {}),
      ...(isPlumbing && plumbingProblem && plumbingSubOption ? {
        taskOptions: {
          service: 'Plumbing Repair',
          problem: plumbingProblem,
          sub_option: plumbingSubOption,
          extras: plumbingExtras,
          base_price: plumbingBasePrice,
          extras_total: plumbingExtrasTotal,
          urgency_surcharge: plumbingUrgencySurcharge,
          final_price: plumbingFinalPrice,
          helper_fee: helperFee,
          total_price: plumbingFinalPrice + helperFee,
          is_heavy: isHeavy,
          is_urgent: plumbingUrgency === 'urgent',
        },
        taskersNeeded,
        estimatedTotal: plumbingFinalPrice + helperFee,
      } : {}),
      _draft: {
        address, landmark, details, imagePreview, aiResult,
        cleaningType, cleaningArea, cleaningExtras,
        carpentryType, carpentryCategory, carpentryDimensions, carpentryExtras,
        electricalType, electricalSubOption, electricalUrgency, electricalExtras,
        airconType, airconUnits, airconServiceType, airconExtras, airconHpTier, airconServiceCategory,
        paintingWhat, paintingArea, paintingFurnitureCategory, paintingFurniturePieces, paintingExtras,
        plumbingProblem, plumbingSubOption, plumbingExtras,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-gray-800 text-base">Your task location</span>
          <Pencil size={15} className="text-gray-400 cursor-pointer" />
        </div>
        <div className={`flex flex-col md:flex-row md:items-center gap-2 rounded-lg transition-colors ${
          addressError ? 'ring-1 ring-red-400' : address.trim() && !validateAddress(address) ? 'ring-1 ring-green-400' : ''
        }`}>
          <div className="flex items-center gap-2 flex-1">
            <MapPin size={20} className="text-orange-400 flex-shrink-0" />
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); if (addressError) setAddressError(validateAddress(e.target.value)) }}
              onBlur={() => setAddressError(validateAddress(address))}
              placeholder="Enter your address"
              className="flex-1 text-base text-gray-700 outline-none placeholder-gray-400"
            />
            {address.trim() && !validateAddress(address) && (
              <span className="text-green-500 text-base flex-shrink-0">✓</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detectingLocation}
            className="flex items-center justify-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 disabled:opacity-50 w-full md:w-auto whitespace-nowrap"
          >
            {detectingLocation ? (
              <span className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
            ) : <MapPin size={20} className="text-orange-400" />}
            {detectingLocation ? 'Detecting…' : 'Detect my location'}
          </button>
        </div>
        {addressError && (
          <p className="text-xs text-red-500 mt-1">{addressError}</p>
        )}
        {locationError && (
          <p className="text-xs text-red-500 mt-1">{locationError}</p>
        )}
        {address.length > 5 && (
          <div className="mt-3">
            <InteractiveAddressMap address={address} onLandmarkFound={(val) => setLandmark(val)} />
          </div>
        )}
      </div>

      {/* Landmark */}
      <div className="border border-gray-200 rounded-xl p-5">
        <label className="block font-bold text-gray-800 text-base mb-3">
          Nearest Landmark <span className="text-gray-400 font-normal text-sm">(optional)</span>
        </label>
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-orange-400 flex-shrink-0" />
          <input
            type="text"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. near 7-Eleven, beside Jollibee"
            className="flex-1 text-base text-gray-700 outline-none placeholder-gray-400"
          />
        </div>
      </div>

      {service?.toLowerCase() === 'cleaning' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="font-bold text-gray-800 text-base">Task Options</p>

          {/* Section 1: Type of Cleaning — always visible */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">Type of Cleaning <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {[
                { value: 'Basic Cleaning', price: '₱750', sub: 'Sweeping, mopping, wiping surfaces, dusting, and trash removal' },
                { value: 'Deep Cleaning', price: '₱1,200', sub: 'Everything in Basic plus scrubbing tiles, disinfecting bathrooms and kitchen, cleaning inside appliances, and hard-to-reach areas' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-start justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${cleaningType === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="cleaningType"
                      value={opt.value}
                      checked={cleaningType === opt.value}
                      onChange={() => { setCleaningType(opt.value); setCleaningArea(''); setCleaningExtras([]) }}
                      className="accent-orange-500 w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 shrink-0">{opt.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Area Size — appears after type selected */}
          <div style={{ overflow: 'hidden', maxHeight: cleaningType ? '400px' : '0', opacity: cleaningType ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Area Size <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {[
                { value: 'Small (1 room)',      label: 'Small (1 room / up to 20 sqm)' },
                { value: 'Medium (2-3 rooms)',   label: 'Medium (2–3 rooms / 21–50 sqm)' },
                { value: 'Large (whole house)',  label: 'Large (whole house / 51 sqm and above)' },
              ].map((area) => (
                <label key={area.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${cleaningArea === area.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="cleaningArea"
                    value={area.value}
                    checked={cleaningArea === area.value}
                    onChange={() => { setCleaningArea(area.value); setCleaningExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{area.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Extras — appears after area selected */}
          <div style={{ overflow: 'hidden', maxHeight: cleaningArea ? '300px' : '0', opacity: cleaningArea ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Extras <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="space-y-2">
              {[
                { value: 'With Laundry', price: '+₱200' },
                { value: 'With Appliances', price: '+₱250' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${cleaningExtras.includes(opt.value) ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={cleaningExtras.includes(opt.value)}
                      onChange={(e) => {
                        setCleaningExtras(prev =>
                          e.target.checked ? [...prev, opt.value] : prev.filter(x => x !== opt.value)
                        )
                      }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-orange-500 font-medium">{opt.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Breakdown — appears after area selected */}
          <div style={{ overflow: 'hidden', maxHeight: cleaningArea ? '300px' : '0', opacity: cleaningArea ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{cleaningType}</span>
                <span>₱{basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{cleaningArea}</span>
                <span></span>
              </div>
              {cleaningExtras.map((e) => (
                <div key={e} className="flex justify-between text-gray-600">
                  <span>{e}</span>
                  <span>+₱{EXTRAS_PRICES[e].toLocaleString()}</span>
                </div>
              ))}
              {taskersNeeded > 1 && (
                <div className="flex justify-between text-gray-600">
                  <span>{helperLabel}</span>
                  <span className="text-orange-500 font-medium">+₱{helperFee.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">
                  {pricesFetchError ? 'Price unavailable' : taskPrices === null ? 'Loading…' : `₱${(finalPrice + helperFee).toLocaleString()}`}
                </span>
              </div>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>{taskersNeeded - 1 === 1
                  ? 'This task requires additional help. A Hanap.ph helper will be assigned to assist your tasker.'
                  : 'This task requires additional help. 2 Hanap.ph helpers will be assigned to assist your tasker.'
                }</p>
              </div>
            )}
          </div>
        </div>
      )}

      {service?.toLowerCase() === 'carpentry' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="font-bold text-gray-800 text-base">Task Options</p>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <Info size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <p>Hanap.ph Carpentry services are for <strong>wood-based items only</strong>. Metal, glass, and other materials are not covered.</p>
          </div>

          {/* Section 1: Type of Work — always visible */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">Type of Work <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {['Repair', 'Install'].map((type) => (
                <label key={type} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${carpentryType === type ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="carpentryType"
                    value={type}
                    checked={carpentryType === type}
                    onChange={() => { setCarpentryType(type); setCarpentryCategory(''); setCarpentryDimensions(''); setCarpentryExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Furniture Category — appears after type selected */}
          <div style={{ overflow: 'hidden', maxHeight: carpentryType ? '700px' : '0', opacity: carpentryType ? 1 : 0, transition: 'max-height 0.35s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Furniture Category <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {CARPENTRY_CATEGORIES.map((opt) => (
                <label key={opt.value} className={`flex items-start justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${carpentryCategory === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="carpentryCategory"
                      value={opt.value}
                      checked={carpentryCategory === opt.value}
                      onChange={() => { setCarpentryCategory(opt.value); setCarpentryDimensions(''); setCarpentryExtras([]) }}
                      className="accent-orange-500 w-4 h-4 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.example}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 flex-shrink-0">₱{opt.prices[carpentryType]?.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dimensions — optional free text, appears after category selected */}
          <div style={{ overflow: 'hidden', maxHeight: carpentryCategory ? '120px' : '0', opacity: carpentryCategory ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Dimensions <span className="text-gray-400 font-normal">(optional)</span></p>
            <input
              type="text"
              value={carpentryDimensions}
              onChange={(e) => setCarpentryDimensions(e.target.value)}
              placeholder="e.g. 3x6 feet, 5x5 inches"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />
          </div>

          {/* Section 3: Extras — appears after category selected */}
          <div style={{ overflow: 'hidden', maxHeight: carpentryCategory ? '350px' : '0', opacity: carpentryCategory ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Extras <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="space-y-2">
              {[
                { value: 'Varnishing / Finishing', price: '+₱350' },
                { value: 'Hauling / Debris Removal', price: '+₱200' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${carpentryExtras.includes(opt.value) ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={carpentryExtras.includes(opt.value)}
                      onChange={(e) => {
                        setCarpentryExtras(prev =>
                          e.target.checked ? [...prev, opt.value] : prev.filter(x => x !== opt.value)
                        )
                      }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-orange-500 font-medium">{opt.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Breakdown — appears after category selected */}
          <div style={{ overflow: 'hidden', maxHeight: carpentryCategory ? '350px' : '0', opacity: carpentryCategory ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{carpentryType} — {carpentryCategory}</span>
                <span>₱{carpentryBasePrice.toLocaleString()}</span>
              </div>
              {carpentryExtras.map((e) => (
                <div key={e} className="flex justify-between text-gray-600">
                  <span>{e}</span>
                  <span>+₱{CARPENTRY_EXTRAS_PRICES[e].toLocaleString()}</span>
                </div>
              ))}
              {taskersNeeded > 1 && (
                <div className="flex justify-between text-gray-600">
                  <span>{helperLabel}</span>
                  <span className="text-orange-500 font-medium">+₱{helperFee.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">
                  {pricesFetchError ? 'Price unavailable' : taskPrices === null ? 'Loading…' : `₱${(carpentryFinalPrice + helperFee).toLocaleString()}`}
                </span>
              </div>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>{taskersNeeded - 1 === 1
                  ? 'This task requires additional help. A Hanap.ph helper will be assigned to assist your tasker.'
                  : 'This task requires additional help. 2 Hanap.ph helpers will be assigned to assist your tasker.'
                }</p>
              </div>
            )}
          </div>
        </div>
      )}

      {service?.toLowerCase() === 'electrical' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="font-bold text-gray-800 text-base">Task Options</p>

          {/* Section 1: Type of Work — always visible */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">Type of Work <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {ELECTRICAL_TYPES.map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${electricalType === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="electricalType"
                      value={opt.value}
                      checked={electricalType === opt.value}
                      onChange={() => { setElectricalType(opt.value); setElectricalSubOption(''); setElectricalUrgency(''); setElectricalExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-gray-500">₱{opt.price.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 1.5: Sub-option — appears after type selected */}
          <div style={{ overflow: 'hidden', maxHeight: electricalType ? '350px' : '0', opacity: electricalType ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Specify Work <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {(ELECTRICAL_SUB_OPTIONS[electricalType] ?? []).map((sub) => (
                <label key={sub} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${electricalSubOption === sub ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="electricalSubOption"
                    value={sub}
                    checked={electricalSubOption === sub}
                    onChange={() => { setElectricalSubOption(sub); setElectricalUrgency(''); setElectricalExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{sub}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Extras — appears after sub-option selected */}
          <div style={{ overflow: 'hidden', maxHeight: electricalSubOption ? '350px' : '0', opacity: electricalSubOption ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Extras <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="space-y-2">
              {[
                { value: 'Additional Outlet/Switch', price: '+₱300' },
                { value: 'Circuit Breaker Check', price: '+₱250' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${electricalExtras.includes(opt.value) ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={electricalExtras.includes(opt.value)}
                      onChange={(e) => {
                        setElectricalExtras(prev =>
                          e.target.checked ? [...prev, opt.value] : prev.filter(x => x !== opt.value)
                        )
                      }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-orange-500 font-medium">{opt.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Breakdown — appears after sub-option selected */}
          <div style={{ overflow: 'hidden', maxHeight: electricalSubOption ? '350px' : '0', opacity: electricalSubOption ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{electricalType}</span>
                <span>₱{electricalBasePrice.toLocaleString()}</span>
              </div>
              {electricalExtras.map((e) => (
                <div key={e} className="flex justify-between text-gray-600">
                  <span>{e}</span>
                  <span>+₱{ELECTRICAL_EXTRAS_PRICES[e].toLocaleString()}</span>
                </div>
              ))}
              {taskersNeeded > 1 && (
                <div className="flex justify-between text-gray-600">
                  <span>{helperLabel}</span>
                  <span className="text-orange-500 font-medium">+₱{helperFee.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">
                  {pricesFetchError ? 'Price unavailable' : taskPrices === null ? 'Loading…' : `₱${(electricalFinalPrice + helperFee).toLocaleString()}`}
                </span>
              </div>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>{taskersNeeded - 1 === 1
                  ? 'This task requires additional help. A Hanap.ph helper will be assigned to assist your tasker.'
                  : 'This task requires additional help. 2 Hanap.ph helpers will be assigned to assist your tasker.'
                }</p>
              </div>
            )}
          </div>
        </div>
      )}

      {service?.toLowerCase() === 'aircon cleaning' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="font-bold text-gray-800 text-base">Task Options</p>

          {/* Section 1: What do you need? — always visible */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">What do you need? <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {[
                { value: 'maintenance', label: 'Cleaning / Maintenance', desc: 'Clean or check your existing aircon unit' },
                { value: 'installation', label: 'Installation', desc: 'Install a new aircon unit' },
              ].map(({ value, label, desc }) => (
                <label key={value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${airconServiceCategory === value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="airconServiceCategory"
                    value={value}
                    checked={airconServiceCategory === value}
                    onChange={() => {
                      setAirconServiceCategory(value)
                      setAirconType(value === 'installation' ? 'Install' : '')
                      setAirconUnits(1)
                      setAirconHpTier('')
                      setAirconServiceType('')
                      setAirconExtras([])
                    }}
                    className="accent-orange-500 w-4 h-4 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Installation disclaimer */}
          {airconServiceCategory === 'installation' && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <Info size={16} className="mt-0.5 flex-shrink-0" />
              <p>A photo of the installation area is required for Installation bookings. Please upload a clear image showing where the aircon unit will be installed.</p>
            </div>
          )}

          {/* Section 2: Aircon Type — Cleaning/Maintenance only */}
          <div style={{ overflow: 'hidden', maxHeight: airconServiceCategory === 'maintenance' ? '200px' : '0', opacity: airconServiceCategory === 'maintenance' ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Aircon Type <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {['Window Type', 'Split Type'].map((type) => (
                <label key={type} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${airconType === type ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="airconType"
                    value={type}
                    checked={airconType === type}
                    onChange={() => { setAirconType(type); setAirconHpTier(''); setAirconServiceType(''); setAirconExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Number of Units — appears once airconType is set */}
          <div style={{ overflow: 'hidden', maxHeight: airconType ? '150px' : '0', opacity: airconType ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-3">Number of Units</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAirconUnits(u => Math.max(1, u - 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 text-gray-600 font-bold text-lg flex items-center justify-center hover:border-orange-400 hover:text-orange-500 transition-colors"
              >
                −
              </button>
              <span className="w-10 text-center text-base font-semibold text-gray-800">{airconUnits}</span>
              <button
                type="button"
                onClick={() => setAirconUnits(u => Math.min(5, u + 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 text-gray-600 font-bold text-lg flex items-center justify-center hover:border-orange-400 hover:text-orange-500 transition-colors"
              >
                +
              </button>
              <span className="text-xs text-gray-400 ml-1">max 5 units</span>
            </div>
          </div>

          {/* Section 4: HP Tier — content differs by category */}
          <div style={{ overflow: 'hidden', maxHeight: airconType ? '300px' : '0', opacity: airconType ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">HP Tier <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {airconServiceCategory === 'installation'
                ? Object.entries(AIRCON_INSTALL_PRICES).map(([tier, price]) => (
                    <label key={tier} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${airconHpTier === tier ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="airconHpTier" value={tier} checked={airconHpTier === tier} onChange={() => setAirconHpTier(tier)} className="accent-orange-500 w-4 h-4" />
                        <span className="text-sm font-medium text-gray-700">{tier}</span>
                      </div>
                      <span className="text-sm text-gray-500">₱{price.toLocaleString()}/unit</span>
                    </label>
                  ))
                : Object.entries(AIRCON_HP_MODIFIERS).map(([tier, mod]) => (
                    <label key={tier} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${airconHpTier === tier ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="airconHpTier" value={tier} checked={airconHpTier === tier} onChange={() => setAirconHpTier(tier)} className="accent-orange-500 w-4 h-4" />
                        <span className="text-sm font-medium text-gray-700">{tier}</span>
                      </div>
                      <span className="text-sm text-gray-500">{mod === 0 ? '+₱0' : `+₱${mod.toLocaleString()}/unit`}</span>
                    </label>
                  ))
              }
            </div>
          </div>

          {/* Section 5: Service Type — Cleaning/Maintenance only */}
          <div style={{ overflow: 'hidden', maxHeight: (airconType && airconType !== 'Install') ? '250px' : '0', opacity: (airconType && airconType !== 'Install') ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Service Type <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {Object.entries(AIRCON_PRICES[airconType] ?? {}).map(([svc, price]) => (
                <label key={svc} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${airconServiceType === svc ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="airconServiceType"
                      value={svc}
                      checked={airconServiceType === svc}
                      onChange={() => { setAirconServiceType(svc); setAirconExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{svc}</span>
                  </div>
                  <span className="text-sm text-gray-500">₱{price.toLocaleString()}/unit</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 6: Extras — Cleaning/Maintenance only, after service type selected */}
          <div style={{ overflow: 'hidden', maxHeight: airconServiceType ? '300px' : '0', opacity: airconServiceType ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Extras <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="space-y-2">
              {[
                { value: 'Freon Recharge', label: 'Freon Recharge', price: `+₱${(500 * airconUnits).toLocaleString()} (₱500 × ${airconUnits})` },
                { value: 'Same Day Service', label: 'Same Day Service', price: '+₱300' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${airconExtras.includes(opt.value) ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={airconExtras.includes(opt.value)}
                      onChange={(e) => {
                        setAirconExtras(prev =>
                          e.target.checked ? [...prev, opt.value] : prev.filter(x => x !== opt.value)
                        )
                      }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  </div>
                  <span className="text-sm text-orange-500 font-medium">{opt.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Breakdown — appears when enough is selected */}
          <div style={{ overflow: 'hidden', maxHeight: (airconServiceType || (airconServiceCategory === 'installation' && airconHpTier)) ? '400px' : '0', opacity: (airconServiceType || (airconServiceCategory === 'installation' && airconHpTier)) ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              {airconServiceCategory === 'installation' ? (
                <div className="flex justify-between text-gray-700">
                  <span>Installation — {airconHpTier}</span>
                  <span>₱{airconPricePerUnit.toLocaleString()} × {airconUnits} = ₱{airconBasePrice.toLocaleString()}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-gray-700">
                    <span>{airconType} — {airconServiceType}</span>
                    <span>₱{airconPricePerUnit.toLocaleString()} × {airconUnits} = ₱{(airconPricePerUnit * airconUnits).toLocaleString()}</span>
                  </div>
                  {airconHpModifier > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>HP Tier ({airconHpTier})</span>
                      <span>+₱{airconHpModifier.toLocaleString()} × {airconUnits} = +₱{(airconHpModifier * airconUnits).toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              {airconExtras.includes('Freon Recharge') && (
                <div className="flex justify-between text-gray-600">
                  <span>Freon Recharge</span>
                  <span>₱500 × {airconUnits} = ₱{airconFreonTotal.toLocaleString()}</span>
                </div>
              )}
              {airconExtras.includes('Same Day Service') && (
                <div className="flex justify-between text-gray-600">
                  <span>Same Day Service</span>
                  <span>+₱300</span>
                </div>
              )}
              {taskersNeeded > 1 && (
                <div className="flex justify-between text-gray-600">
                  <span>{helperLabel}</span>
                  <span className="text-orange-500 font-medium">+₱{helperFee.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">
                  {pricesFetchError ? 'Price unavailable' : taskPrices === null ? 'Loading…' : `₱${(airconFinalPrice + helperFee).toLocaleString()}`}
                </span>
              </div>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>{taskersNeeded - 1 === 1
                  ? 'This task requires additional help. A Hanap.ph helper will be assigned to assist your tasker.'
                  : 'This task requires additional help. 2 Hanap.ph helpers will be assigned to assist your tasker.'
                }</p>
              </div>
            )}
          </div>
        </div>
      )}

      {service?.toLowerCase() === 'painting' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="font-bold text-gray-800 text-base">Task Options</p>

          {/* Section 1: What to Paint — always visible */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">What to Paint <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {['Wall', 'Ceiling / Roof', 'Furniture'].map((opt) => (
                <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paintingWhat === opt ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="paintingWhat"
                    value={opt}
                    checked={paintingWhat === opt}
                    onChange={() => { setPaintingWhat(opt); setPaintingArea(''); setPaintingFurnitureCategory(''); setPaintingFurniturePieces(1); setPaintingPaintProvided(''); setPaintingExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2a: Area Size — for Wall / Ceiling / Roof */}
          <div style={{ overflow: 'hidden', maxHeight: (paintingWhat && !paintingIsFurniture) ? '350px' : '0', opacity: (paintingWhat && !paintingIsFurniture) ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Area Size <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {[
                { value: 'Small',  label: 'Small (up to 10 sqm)' },
                { value: 'Medium', label: 'Medium (11–25 sqm)' },
                { value: 'Large',  label: 'Large (26 sqm and above)' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paintingArea === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paintingArea"
                      value={opt.value}
                      checked={paintingArea === opt.value}
                      onChange={() => { setPaintingArea(opt.value); setPaintingPaintProvided(''); setPaintingExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {paintingWhat ? `₱${(PAINTING_BASE_PRICES[paintingWhat]?.[opt.value] ?? 0).toLocaleString()}` : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2b: Furniture Category + Piece Count — for Furniture */}
          <div style={{ overflow: 'hidden', maxHeight: paintingIsFurniture ? '900px' : '0', opacity: paintingIsFurniture ? 1 : 0, transition: 'max-height 0.4s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Furniture Category <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {PAINTING_FURNITURE_CATEGORIES.map((opt) => (
                <label key={opt.value} className={`flex items-start justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paintingFurnitureCategory === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paintingFurnitureCategory"
                      value={opt.value}
                      checked={paintingFurnitureCategory === opt.value}
                      onChange={() => { setPaintingFurnitureCategory(opt.value); setPaintingPaintProvided(''); setPaintingExtras([]) }}
                      className="accent-orange-500 w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.example}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 shrink-0">₱{(PAINTING_FURNITURE_PRICES[opt.value] ?? 0).toLocaleString()}/pc</span>
                </label>
              ))}
            </div>

            {/* Piece Count — appears after category selected */}
            <div style={{ overflow: 'hidden', maxHeight: paintingFurnitureCategory ? '180px' : '0', opacity: paintingFurnitureCategory ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }} className="mt-4">
              <p className="font-semibold text-gray-700 text-sm mb-2">Number of Pieces <span className="text-red-400">*</span></p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPaintingFurniturePieces(p => Math.max(1, p - 1))}
                  className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:border-orange-400 hover:text-orange-500 transition-colors font-bold text-lg"
                >−</button>
                <span className="w-8 text-center font-semibold text-gray-800 text-base">{paintingFurniturePieces}</span>
                <button
                  type="button"
                  onClick={() => setPaintingFurniturePieces(p => Math.min(8, p + 1))}
                  className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:border-orange-400 hover:text-orange-500 transition-colors font-bold text-lg"
                >+</button>
                <span className="text-sm text-gray-500 ml-1">
                  {paintingFurnitureCategory
                    ? `× ₱${(PAINTING_FURNITURE_PRICES[paintingFurnitureCategory] ?? 0).toLocaleString()} = ₱${((PAINTING_FURNITURE_PRICES[paintingFurnitureCategory] ?? 0) * paintingFurniturePieces).toLocaleString()}`
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Extras — appears after area or furniture category selected */}
          <div style={{ overflow: 'hidden', maxHeight: (paintingArea || paintingFurnitureCategory) ? '350px' : '0', opacity: (paintingArea || paintingFurnitureCategory) ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Extras <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="space-y-2">
              {[
                { value: 'Primer Coat',           price: '+₱400' },
                { value: 'Two Coats',             price: '+₱500' },
                { value: 'Wall Putty / Patching', price: '+₱300' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paintingExtras.includes(opt.value) ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={paintingExtras.includes(opt.value)}
                      onChange={(e) => {
                        setPaintingExtras(prev =>
                          e.target.checked ? [...prev, opt.value] : prev.filter(x => x !== opt.value)
                        )
                      }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-orange-500 font-medium">{opt.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Breakdown — appears after area or furniture category selected */}
          <div style={{ overflow: 'hidden', maxHeight: (paintingArea || paintingFurnitureCategory) ? '400px' : '0', opacity: (paintingArea || paintingFurnitureCategory) ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>
                  {paintingIsFurniture
                    ? `Furniture Painting — ${paintingFurnitureCategory} × ${paintingFurniturePieces}`
                    : `${paintingWhat} Painting (${paintingArea})`}
                </span>
                <span>₱{paintingBasePrice.toLocaleString()}</span>
              </div>
              {paintingExtras.map((e) => (
                <div key={e} className="flex justify-between text-gray-600">
                  <span>{e}</span>
                  <span>+₱{PAINTING_EXTRAS_PRICES[e].toLocaleString()}</span>
                </div>
              ))}
              {taskersNeeded > 1 && (
                <div className="flex justify-between text-gray-600">
                  <span>{helperLabel}</span>
                  <span className="text-orange-500 font-medium">+₱{helperFee.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">
                  {pricesFetchError ? 'Price unavailable' : taskPrices === null ? 'Loading…' : `₱${(paintingFinalPrice + helperFee).toLocaleString()}`}
                </span>
              </div>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>{taskersNeeded - 1 === 1
                  ? 'This task requires additional help. A Hanap.ph helper will be assigned to assist your tasker.'
                  : 'This task requires additional help. 2 Hanap.ph helpers will be assigned to assist your tasker.'
                }</p>
              </div>
            )}
          </div>
        </div>
      )}

      {service?.toLowerCase() === 'plumbing repair' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="font-bold text-gray-800 text-base">Task Options</p>

          {/* Section 1: Problem — always visible */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">Problem <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {PLUMBING_PROBLEMS.map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${plumbingProblem === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="plumbingProblem"
                      value={opt.value}
                      checked={plumbingProblem === opt.value}
                      onChange={() => { setPlumbingProblem(opt.value); setPlumbingSubOption(''); setPlumbingUrgency(''); setPlumbingExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-gray-500">₱{opt.price.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 1.5: Sub-option — appears after problem selected */}
          <div style={{ overflow: 'hidden', maxHeight: plumbingProblem ? '350px' : '0', opacity: plumbingProblem ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Specify Problem <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {(PLUMBING_SUB_OPTIONS[plumbingProblem] ?? []).map((sub) => (
                <label key={sub} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${plumbingSubOption === sub ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="plumbingSubOption"
                    value={sub}
                    checked={plumbingSubOption === sub}
                    onChange={() => { setPlumbingSubOption(sub); setPlumbingUrgency(''); setPlumbingExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{sub}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 1.8: Urgency — appears after sub-option selected */}
          <div style={{ overflow: 'hidden', maxHeight: plumbingSubOption ? '200px' : '0', opacity: plumbingSubOption ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Urgency</p>
            <label className={`flex items-start justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${plumbingUrgency === 'urgent' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={plumbingUrgency === 'urgent'}
                  onChange={(e) => setPlumbingUrgency(e.target.checked ? 'urgent' : '')}
                  className="accent-red-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="text-sm font-semibold text-red-600">🚨 Urgent — Same-Day Emergency</span>
                  <p className="text-xs text-gray-500 mt-0.5">Burst pipe? Flooding? Book for today. A tasker will be dispatched as soon as possible.</p>
                </div>
              </div>
              <span className="text-sm text-red-500 font-semibold flex-shrink-0">+₱500</span>
            </label>
          </div>

          {/* Section 2: Extras — appears after sub-option selected */}
          <div style={{ overflow: 'hidden', maxHeight: plumbingSubOption ? '350px' : '0', opacity: plumbingSubOption ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Extras <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="space-y-2">
              {[
                { value: 'Multiple Points (2+ faucets/drains)', price: '+₱300' },
                { value: 'Waterproofing',                       price: '+₱500' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${plumbingExtras.includes(opt.value) ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={plumbingExtras.includes(opt.value)}
                      onChange={(e) => {
                        setPlumbingExtras(prev =>
                          e.target.checked ? [...prev, opt.value] : prev.filter(x => x !== opt.value)
                        )
                      }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-orange-500 font-medium">{opt.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Breakdown — appears after sub-option selected */}
          <div style={{ overflow: 'hidden', maxHeight: plumbingSubOption ? '350px' : '0', opacity: plumbingSubOption ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{plumbingProblem}</span>
                <span>₱{plumbingBasePrice.toLocaleString()}</span>
              </div>
              {plumbingExtras.map((e) => (
                <div key={e} className="flex justify-between text-gray-600">
                  <span>{e}</span>
                  <span>+₱{PLUMBING_EXTRAS_PRICES[e].toLocaleString()}</span>
                </div>
              ))}
              {plumbingUrgency === 'urgent' && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>🚨 Urgent Same-Day</span>
                  <span>+₱500</span>
                </div>
              )}
              {taskersNeeded > 1 && (
                <div className="flex justify-between text-gray-600">
                  <span>{helperLabel}</span>
                  <span className="text-orange-500 font-medium">+₱{helperFee.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">
                  {pricesFetchError ? 'Price unavailable' : taskPrices === null ? 'Loading…' : `₱${(plumbingFinalPrice + helperFee).toLocaleString()}`}
                </span>
              </div>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>{taskersNeeded - 1 === 1
                  ? 'This task requires additional help. A Hanap.ph helper will be assigned to assist your tasker.'
                  : 'This task requires additional help. 2 Hanap.ph helpers will be assigned to assist your tasker.'
                }</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl p-5">
        <p className="font-bold text-gray-800 mb-2 text-base">Tell us the details of your task</p>
        <p className="text-sm text-gray-400 italic mb-3">
          Start the conversation and tell your Tasker what you need done. This helps us show you only qualified and available Taskers for the job.
        </p>
        <div className="relative">
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe your task..."
            className="w-full border border-gray-200 rounded-lg p-3 pb-10 text-base text-gray-700 resize-none outline-none focus:border-orange-400"
            style={{ minHeight: '140px' }}
          />

          {/* Interim speech preview */}
          {interimText && (
            <p className="absolute left-3 right-20 text-sm text-gray-400 italic pointer-events-none" style={{ bottom: '44px' }}>
              {interimText}
            </p>
          )}

          {/* Bottom-right controls */}
          {shouldShowMic && (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
              {/* Mic button */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isRecording ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                  {isRecording ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <Mic size={14} />
                    </span>
                  ) : (
                    <Mic size={14} />
                  )}
                </button>

                {/* Hover tooltip — only when not denied */}
                {!micDenied && (
                  <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
                    <div className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                      Speak your task details
                    </div>
                  </div>
                )}

                {/* Mic denied tooltip — always visible when denied */}
                {micDenied && (
                  <div className="absolute bottom-full right-0 mb-1.5 z-10 pointer-events-none" style={{ width: '210px' }}>
                    <div className="bg-red-600 text-white text-xs rounded-lg px-2.5 py-2 shadow-lg leading-snug">
                      Microphone access denied. Please allow mic access in your browser settings.
                    </div>
                  </div>
                )}

                {/* Unsupported browser tooltip — safety net */}
                {unsupportedToast && (
                  <div className="absolute bottom-full right-0 mb-1.5 z-10 pointer-events-none" style={{ width: '230px' }}>
                    <div className="bg-red-600 text-white text-xs rounded-lg px-2.5 py-2 shadow-lg leading-snug">
                      Voice input is not supported on this browser. Please use Chrome for this feature.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-600 mb-2">
            {service?.toLowerCase() === 'aircon cleaning'
              ? <><span className="text-red-500">*</span> Required: Upload a photo of your aircon unit / area</>
              : 'Optional: Upload a photo of the damage'
            }
          </p>
          {service?.toLowerCase() !== 'aircon cleaning' && (
            <p className="text-sm italic text-gray-400 mt-1 mb-3">Let Hanap AI detect and analyze your home issue automatically!</p>
          )}
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer"
          />

          {imagePreview && (
            <div className="mt-3 relative">
              <img
                src={imagePreview}
                alt="Uploaded preview"
                className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold leading-none"
              >
                ✕
              </button>
            </div>
          )}

          {validating && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <svg className="animate-spin w-4 h-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Checking image...
            </div>
          )}

          {imageError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {imageError}
            </div>
          )}

          {analyzing && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <svg className="animate-spin w-4 h-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Hanap AI is analyzing your image...
            </div>
          )}

          {aiResult && !analyzing && aiResult !== 'error' && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <span className="font-semibold">AI Suggestion: </span>{aiResult}
            </div>
          )}

          {aiResult === 'error' && !analyzing && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              Could not analyze image. Please describe your task manually.
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-base">{error}</p>}

      {validatingDescription && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="animate-spin w-4 h-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Checking your description...
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={validatingDescription}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-xl transition-colors"
      >
        Continue
      </button>
    </div>
  )
}

function Step4({ service, tasker, date, time, taskSize, taskAddress, taskLandmark, taskDetails, aiImageAnalysis, bookingImagePreview, taskOptions, taskersNeeded, taskDuration, estimatedTotal: estimatedTotalProp, travelFee = 0, isRebook, rebookOriginalId, onBack }) {
  const [paymentMethod, setPaymentMethod] = useState('')
  const [cardDetails, setCardDetails] = useState('')
  const [cardErrors, setCardErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [pollingError, setPollingError] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const pollingIntervalRef = useRef(null)
  const submitButtonRef = useRef(null)
  const cardNumberRef = useRef(null)
  const expMonthRef = useRef(null)
  const expYearRef = useRef(null)
  const cvcRef = useRef(null)

  useEffect(() => {
    async function fetchWalletBalance() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', session.user.id)
        .single()
      setWalletBalance(Number(data?.wallet_balance) || 0)
    }
    fetchWalletBalance()
  }, [])

const rate = parseInt(tasker?.price?.replace(/[^0-9]/g, '') || '0')
  const estimatedTotal = estimatedTotalProp && estimatedTotalProp > 0 ? estimatedTotalProp : rate * (taskSize === 'Small' ? 1 : taskSize === 'Large' ? 4 : 2)
  const estHours = taskSize === 'Small' ? '1 hr' : taskSize === 'Large' ? '4+ hrs' : '2-3 hrs'
  const estTotal =
    taskSize === 'Small'
      ? `₱${rate.toLocaleString()}`
      : taskSize === 'Large'
      ? `₱${(rate * 4).toLocaleString()}+`
      : `₱${(rate * 2).toLocaleString()} – ₱${(rate * 3).toLocaleString()}`

  const formattedDate = date
    ? taskDuration >= 8
      ? `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} (Full Day)`
      : `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${time}`
    : ''

  const priceBreakdown = buildPriceBreakdown(taskOptions)

  const rawFinalAmount = (taskOptions?.total_price ?? estimatedTotal) + travelFee
  const walletDeduction = useWallet ? Math.min(walletBalance, rawFinalAmount) : 0
  const remainingAmount = rawFinalAmount - walletDeduction


  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [])

  if (isProcessingPayment) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
        <svg className="animate-spin h-14 w-14 text-[#EA580C] mb-6" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-xl font-bold text-gray-800">Processing payment...</p>
        <p className="text-sm text-gray-400 mt-2">Charging your card via PayMongo</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* QR Payment Modal — GCash / PayMaya */}
      {showQrModal && (paymentMethod === 'gcash' || paymentMethod === 'paymaya') && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-4 relative">
            <button
              onClick={() => { setShowQrModal(false); setPaymentMethod('') }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold text-gray-800">
              {paymentMethod === 'gcash' ? 'Pay via GCash' : 'Pay via PayMaya'}
            </h2>
            <img
              src={paymentMethod === 'gcash'
                ? 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HANAP-GCASH-PAYMENT'
                : 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HANAP-PAYMAYA-PAYMENT'}
              alt="QR Code"
              className="w-48 h-48 rounded-xl border border-gray-100"
            />
            <p className="text-sm text-gray-600 text-center">
              {paymentMethod === 'gcash'
                ? 'Scan with your GCash app to pay'
                : 'Scan with your PayMaya app to pay'}
            </p>
            <p className="text-xs text-gray-400 text-center">
              This is a simulation — proceed to confirm your payment below
            </p>
            <button
              onClick={() => submitButtonRef.current?.click()}
              disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-70 text-white font-semibold py-3 rounded-lg transition-colors text-base flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing...
                </>
              ) : 'Confirm & Pay'}
            </button>
          </div>
        </div>
      )}

      {/* Section 1 – Order Summary */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={20} className="text-orange-400 flex-shrink-0" />
          <p className="font-bold text-gray-800 text-base">Order Summary</p>
        </div>
        <div className="space-y-1 text-sm text-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-500">Service</span>
            <span className="capitalize">{service}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tasker</span>
            <span>{tasker?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date &amp; Time</span>
            <span>{formattedDate}</span>
          </div>
        </div>
        <div className="border-t border-orange-200 pt-3 space-y-1 text-sm text-gray-700">
          {priceBreakdown.map((line, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-500">{line.label}</span>
              <span>{line.isExtra ? `+₱${line.price.toLocaleString()}` : `₱${line.price.toLocaleString()}`}</span>
            </div>
          ))}
          {travelFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Travel Fee</span>
              <span>₱500</span>
            </div>
          )}
          <div className={`flex justify-between font-bold text-gray-800 text-base ${priceBreakdown.length > 0 ? 'border-t border-orange-200 mt-1 pt-2' : 'pt-1'}`}>
            <span>{travelFee > 0 ? 'Grand Total' : 'Estimated Total'}</span>
            <span className="text-orange-500">₱{rawFinalAmount.toLocaleString()}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">Price is fixed based on your selected options.</p>
      </div>

      {/* Wallet Balance Card */}
      {walletBalance > 0 && (
        <div className="border border-orange-300 bg-orange-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-orange-500 flex-shrink-0" />
            <p className="font-bold text-gray-800 text-sm">
              Hanap.ph Wallet Balance:{' '}
              <span className="text-orange-500">
                ₱{walletBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useWallet}
              onChange={(e) => setUseWallet(e.target.checked)}
              className="accent-orange-500 w-4 h-4"
            />
            <span className="text-sm text-gray-700 font-medium">Use my wallet balance for this booking</span>
          </label>
          {useWallet && (
            <div className="text-sm space-y-1 pt-1 border-t border-orange-200">
              <p className="text-orange-600 font-medium">
                ₱{walletDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} will be deducted from your wallet
              </p>
              {remainingAmount === 0 ? (
                <p className="text-green-600 font-semibold">
                  ✓ Your wallet covers the full amount! No additional payment needed.
                </p>
              ) : (
                <p className="text-gray-600">
                  Remaining balance to pay:{' '}
                  <span className="font-semibold text-gray-800">
                    ₱{remainingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section 2 – Payment Method */}
      {(!useWallet || remainingAmount > 0) && (
      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <p className="font-bold text-gray-800 text-base">Select Payment Method</p>

        {/* GCash option */}
        <label className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${paymentMethod === 'gcash' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
          <input
            type="radio"
            name="payment"
            value="gcash"
            checked={paymentMethod === 'gcash'}
            onChange={() => { setPaymentMethod('gcash'); setShowQrModal(true) }}
            className="accent-orange-500 mt-0.5 w-4 h-4"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <img src={gcashLogo} alt="GCash" className="h-5 w-auto" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">You'll be redirected to a secure PayMongo checkout to pay via GCash.</p>
          </div>
        </label>

        {/* PayMaya option */}
        <label className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${paymentMethod === 'paymaya' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
          <input
            type="radio"
            name="payment"
            value="paymaya"
            checked={paymentMethod === 'paymaya'}
            onChange={() => { setPaymentMethod('paymaya'); setShowQrModal(true) }}
            className="accent-orange-500 mt-0.5 w-4 h-4"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <img src={mayaLogo} alt="PayMaya" className="h-5 w-auto" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">You'll be redirected to a secure PayMongo checkout to pay via PayMaya.</p>
          </div>
        </label>

        {/* Credit/Debit Card option */}
        <label className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
          <input
            type="radio"
            name="payment"
            value="card"
            checked={paymentMethod === 'card'}
            onChange={() => setPaymentMethod('card')}
            className="accent-orange-500 mt-0.5 w-4 h-4"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-gray-500" />
              <span className="font-semibold text-gray-800">Credit / Debit Card</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Visa, Mastercard accepted — enter details securely on PayMongo checkout.</p>
          </div>
        </label>

        {/* Inline card fields */}
        {paymentMethod === 'card' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 mt-1">

            {/* Card Number */}
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">Card number</label>
              <div className="relative">
                <input
                  ref={cardNumberRef}
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  value={cardDetails.number}
                  onChange={e => { setCardDetails(p => ({ ...p, number: e.target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim() })); setCardErrors(p => ({ ...p, number: '' })) }}
                  className={`w-full bg-gray-50 border rounded-lg px-4 py-3 text-gray-900 text-sm outline-none focus:border-orange-400 tracking-widest pr-36 placeholder:text-gray-400 ${cardErrors.number ? 'border-red-400' : 'border-gray-300'}`}
                />
                {/* Card network badges */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {/* Mastercard */}
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    <div className="w-4 h-4 rounded-full bg-orange-400 -ml-2" />
                  </div>
                  {/* Visa */}
                  <span className="text-[10px] font-black italic text-blue-600 tracking-tight">VISA</span>
                  {/* Amex */}
                  <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-1 py-0.5 rounded">AMEX</span>
                  {/* JCB */}
                  <span className="text-[10px] font-black text-green-700 bg-green-100 px-1 py-0.5 rounded">JCB</span>
                </div>
              </div>
              {cardErrors.number && <p className="text-xs text-red-500 mt-1">{cardErrors.number}</p>}
            </div>

            {/* Expiration + Security Code side by side */}
            <div className="grid grid-cols-2 gap-4">

              {/* Expiration Date */}
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Expiration date</label>
                <div className={`flex items-center gap-1 bg-gray-50 border rounded-lg px-4 py-3 focus-within:border-orange-400 ${cardErrors.exp_month || cardErrors.exp_year ? 'border-red-400' : 'border-gray-300'}`}>
                  <input
                    ref={expMonthRef}
                    type="text"
                    placeholder="12"
                    maxLength={2}
                    value={cardDetails.exp_month}
                    onChange={e => { setCardDetails(p => ({ ...p, exp_month: e.target.value.replace(/\D/g, '') })); setCardErrors(p => ({ ...p, exp_month: '' })) }}
                    className="w-8 bg-transparent text-gray-900 text-sm outline-none text-center placeholder:text-gray-400"
                  />
                  <span className="text-gray-400 text-sm select-none">/</span>
                  <input
                    ref={expYearRef}
                    type="text"
                    placeholder="28"
                    maxLength={4}
                    value={cardDetails.exp_year}
                    onChange={e => { setCardDetails(p => ({ ...p, exp_year: e.target.value.replace(/\D/g, '') })); setCardErrors(p => ({ ...p, exp_year: '' })) }}
                    className="flex-1 bg-transparent text-gray-900 text-sm outline-none text-center placeholder:text-gray-400"
                  />
                </div>
                {cardErrors.exp_month && <p className="text-xs text-red-500 mt-1">{cardErrors.exp_month}</p>}
                {!cardErrors.exp_month && cardErrors.exp_year && <p className="text-xs text-red-500 mt-1">{cardErrors.exp_year}</p>}
              </div>

              {/* Security Code */}
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Security code</label>
                <div className="relative">
                  <input
                    ref={cvcRef}
                    type="text"
                    placeholder="123"
                    maxLength={3}
                    value={cardDetails.cvc}
                    onChange={e => { setCardDetails(p => ({ ...p, cvc: e.target.value.replace(/\D/g, '') })); setCardErrors(p => ({ ...p, cvc: '' })) }}
                    className={`w-full bg-gray-50 border rounded-lg px-4 py-3 text-gray-900 text-sm outline-none focus:border-orange-400 pr-10 placeholder:text-gray-400 ${cardErrors.cvc ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {cardErrors.cvc && <p className="text-xs text-red-500 mt-1">{cardErrors.cvc}</p>}
              </div>

            </div>
          </div>
        )}
      </div>
      )}

      {/* Buttons */}
      {saveError && (
        <p className="text-sm text-red-500 text-center">
          {paymentMethod === 'card'
            ? 'Payment failed. Please check your card details and try again.'
            : saveError}
        </p>
      )}
      {pollingError && (
        <p className="text-sm text-red-500 text-center">{pollingError}</p>
      )}
      <div className="flex items-start gap-3 bg-orange-50 border border-orange-300 rounded-xl px-4 py-3.5">
        <Info size={20} className="flex-shrink-0 mt-0.5 text-orange-500" />
        <span className="text-sm font-bold text-orange-700">Your tasker may contact you before the job to confirm details. Please keep your phone available.</span>
      </div>
      <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3 pt-1">
        <button
          onClick={onBack}
          disabled={saving}
          className="text-sm text-gray-400 hover:text-gray-600 underline disabled:opacity-50 text-center md:text-left"
        >
          ← Back
        </button>
        <button
          ref={submitButtonRef}
          onClick={async () => {
            // Card validation — runs before any API call
            if (paymentMethod === 'card') {
              const errors = {}
              const rawNumber = (cardDetails.number ?? '').replace(/\s/g, '')
              const luhnValid = (num) => {
                let sum = 0
                let shouldDouble = false
                for (let i = num.length - 1; i >= 0; i--) {
                  let d = parseInt(num[i])
                  if (shouldDouble) { d *= 2; if (d > 9) d -= 9 }
                  sum += d
                  shouldDouble = !shouldDouble
                }
                return sum % 10 === 0
              }
              if (!/^\d{16}$/.test(rawNumber) || !luhnValid(rawNumber)) {
                errors.number = 'Please enter a valid 16-digit card number.'
              }
              const month = (cardDetails.exp_month ?? '').trim()
              if (!/^\d{2}$/.test(month) || parseInt(month) < 1 || parseInt(month) > 12) {
                errors.exp_month = 'Please enter a valid expiry month (01-12).'
              }
              const yearRaw = (cardDetails.exp_year ?? '').trim()
              if (!/^\d{2}$/.test(yearRaw) && !/^\d{4}$/.test(yearRaw)) {
                errors.exp_year = 'Please enter a valid expiry year.'
              } else {
                const fullYear = yearRaw.length === 2 ? 2000 + parseInt(yearRaw) : parseInt(yearRaw)
                if (fullYear < new Date().getFullYear()) {
                  errors.exp_year = 'Please enter a valid expiry year.'
                }
              }
              const cvc = (cardDetails.cvc ?? '').trim()
              if (!/^\d{3}$/.test(cvc)) {
                errors.cvc = 'Please enter a valid 3-digit security code.'
              }
              if (Object.keys(errors).length > 0) {
                setCardErrors(errors)
                const firstRef = errors.number ? cardNumberRef
                  : errors.exp_month ? expMonthRef
                  : errors.exp_year ? expYearRef
                  : cvcRef
                firstRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                firstRef.current?.focus()
                return
              }
              setCardErrors({})
            }

            setSaving(true)
            setSaveError('')
            setPollingError('')
            try {
              const { data: { session } } = await supabase.auth.getSession()
              const client_id = session?.user?.id ?? null

              let customerName = null
              let customerPhone = null
              if (client_id) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('full_name, phone')
                  .eq('id', client_id)
                  .single()
                customerName = profileData?.full_name ?? null
                customerPhone = profileData?.phone ?? null
              }

              const ref = 'VE-' + Date.now()
              const finalAmount = rawFinalAmount
              const baseServicePrice = taskOptions?.final_price ?? estimatedTotal
              const helperFeeAmount = taskOptions?.helper_fee ?? 0
              const platformFee = Math.round(baseServicePrice * 0.1)
              const taskerPayout = Math.round(baseServicePrice * 0.9)

              let helperNames = []
              const helperSlotCount = taskersNeeded - 1
              if (tasker?.id && helperSlotCount > 0) {
                const { data: helperRows } = await supabase
                  .from('tasker_helpers')
                  .select('slot, helpers(name)')
                  .eq('tasker_id', tasker.id)
                  .order('slot', { ascending: true })
                for (const row of helperRows ?? []) {
                  if (row.slot <= helperSlotCount && row.helpers?.name) {
                    helperNames.push({ slot: row.slot, name: row.helpers.name })
                  }
                }
              }

              let bookingImageUrl = null
              if (bookingImagePreview) {
                try {
                  const res = await fetch(bookingImagePreview)
                  const blob = await res.blob()
                  const ext = blob.type.split('/')[1] || 'jpg'
                  const path = `booking-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                  const { error: uploadError } = await supabase.storage
                    .from('tasker-files')
                    .upload(path, blob, { contentType: blob.type })
                  if (!uploadError) {
                    bookingImageUrl = supabase.storage.from('tasker-files').getPublicUrl(path).data.publicUrl
                  }
                } catch {}
              }

              const { error: insertError } = await supabase.from('bookings').insert({
                client_id,
                tasker_id: tasker?.id,
                service,
                task_size: taskOptions
                  ? (taskOptions.furniture_category
                      ? `${taskOptions.what_to_paint} — ${taskOptions.furniture_category} × ${taskOptions.furniture_pieces}`
                      : (taskOptions.area || taskOptions.type || taskOptions.problem || taskOptions.what_to_paint || taskOptions.aircon_type || taskOptions.service_type || 'N/A'))
                  : taskSize,
                task_description: taskDetails,
                address: taskAddress,
                landmark: taskLandmark || null,
                scheduled_date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null,
                scheduled_time: time,
                payment_method: paymentMethod,
                reference_number: ref,
                ai_image_analysis: aiImageAnalysis ?? null,
                booking_image_url: bookingImageUrl,
                customer_name: customerName,
                customer_phone: customerPhone,
                task_options: taskOptions ? JSON.stringify(taskOptions) : null,
                taskers_needed: taskersNeeded,
                estimated_total: finalAmount,
                platform_fee: platformFee,
                tasker_payout: taskerPayout,
                helper_fee: helperFeeAmount,
                helper_names: helperNames.length > 0 ? JSON.stringify(helperNames) : null,
                duration_hours: taskDuration ?? 8,
                wallet_amount_used: useWallet ? walletDeduction : 0,
                status: 'pending_payment',
                ...(isRebook ? { is_rebook: true, original_booking_id: rebookOriginalId } : {}),
              })
              if (insertError) {
                setSaveError(`Error saving booking: ${insertError.message}`)
                setSaving(false)
                return
              }

              // Wallet deduction
              if (useWallet && walletDeduction > 0) {
                const { error: deductError } = await supabase.rpc('deduct_wallet_balance', {
                  target_user_id: client_id,
                  deduct_amount: walletDeduction,
                })
                if (deductError) {
                  setSaveError('Insufficient wallet balance. Please try again.')
                  setSaving(false)
                  return
                }
                await supabase.from('wallet_transactions').insert({
                  user_id: client_id,
                  booking_id: null,
                  amount: walletDeduction,
                  type: 'debit',
                  description: `Wallet payment for booking #${ref}`,
                })
              }

              // Full wallet payment — skip PayMongo entirely
              if (useWallet && remainingAmount === 0) {
                await supabase.from('bookings').update({ status: 'confirmed' }).eq('reference_number', ref)
                window.location.href = `${window.location.origin}/booking-confirmation?wallet_payment=true&booking_ref=${ref}`
                return
              }

              // Notify tasker of new booking
              if (tasker?.id) {
                const { data: taskerProfile } = await supabase
                  .from('taskers')
                  .select('user_id')
                  .eq('id', tasker.id)
                  .single()
                if (taskerProfile?.user_id) {
                  await supabase.from('notifications').insert({
                    user_id: taskerProfile.user_id,
                    title: 'New Booking Assigned',
                    message: `You have a new ${service} booking on ${formattedDate} at ${taskAddress}.`,
                    is_read: false,
                  })
                }
              }

              // Step 7 — Create Payment Intent
              if (paymentMethod === 'card') setIsProcessingPayment(true)
              const piRes = await fetch('https://api.paymongo.com/v1/payment_intents', {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(import.meta.env.VITE_PAYMONGO_SECRET_KEY + ':')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  data: {
                    attributes: {
                      amount: Math.round(remainingAmount * 100),
                      currency: 'PHP',
                      payment_method_allowed: [paymentMethod],
                      capture_type: 'automatic',
                    },
                  },
                }),
              })
              const piData = await piRes.json()
              if (!piRes.ok) {
                if (paymentMethod === 'card') await supabase.from('bookings').update({ status: 'cancelled' }).eq('reference_number', ref)
                setSaveError(piData?.errors?.[0]?.detail || 'Failed to create payment. Please try again.')
                setSaving(false)
                setIsProcessingPayment(false)
                return
              }
              const piId = piData.data.id

              // Step 8 — Create Payment Method
              const expYear = parseInt(cardDetails.exp_year)
              const fullExpYear = expYear < 100 ? 2000 + expYear : expYear
              const pmRes = await fetch('https://api.paymongo.com/v1/payment_methods', {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(import.meta.env.VITE_PAYMONGO_PUBLIC_KEY + ':')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  data: {
                    attributes: paymentMethod === 'card'
                      ? {
                          type: 'card',
                          details: {
                            card_number: cardDetails.number.replace(/\s/g, ''),
                            exp_month: parseInt(cardDetails.exp_month),
                            exp_year: fullExpYear,
                            cvc: cardDetails.cvc
                          }
                        }
                      : { type: paymentMethod }
                  }
                }),
              })
              const pmData = await pmRes.json()
              if (!pmRes.ok) {
                if (paymentMethod === 'card') await supabase.from('bookings').update({ status: 'cancelled' }).eq('reference_number', ref)
                setSaveError(pmData?.errors?.[0]?.detail || 'Failed to create payment method. Please try again.')
                setSaving(false)
                setIsProcessingPayment(false)
                return
              }
              const pmId = pmData.data.id

              // Step 9 — Attach Payment Method to Payment Intent
              const returnUrl = paymentMethod === 'card'
                ? `${window.location.origin}/booking-confirmation`
                : `${window.location.origin}/payment-complete`
              const attachRes = await fetch(`https://api.paymongo.com/v1/payment_intents/${piId}/attach`, {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(import.meta.env.VITE_PAYMONGO_SECRET_KEY + ':')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  data: {
                    attributes: {
                      payment_method: pmId,
                      return_url: returnUrl,
                    },
                  },
                }),
              })
              const attachData = await attachRes.json()
              if (!attachRes.ok) {
                if (paymentMethod === 'card') await supabase.from('bookings').update({ status: 'cancelled' }).eq('reference_number', ref)
                setSaveError(attachData?.errors?.[0]?.detail || 'Failed to process payment. Please try again.')
                setSaving(false)
                setIsProcessingPayment(false)
                return
              }

              const attachStatus = attachData.data?.attributes?.status

              // Step 10 — Open PayMongo in new tab (GCash / PayMaya) and poll main tab
              if (attachStatus === 'awaiting_next_action') {
                window.open(attachData.data.attributes.next_action.redirect.url, '_blank')
                setShowQrModal(false)
                setSaving(false)
                const capturedPiId = piId
                const startTime = Date.now()
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = setInterval(async () => {
                  if (Date.now() - startTime > 10 * 60 * 1000) {
                    clearInterval(pollingIntervalRef.current)
                    pollingIntervalRef.current = null
                    setPollingError('Payment not detected. Please refresh and try again.')
                    return
                  }
                  try {
                    const piRes = await fetch(`https://api.paymongo.com/v1/payment_intents/${capturedPiId}`, {
                      headers: {
                        'Authorization': `Basic ${btoa(import.meta.env.VITE_PAYMONGO_SECRET_KEY + ':')}`,
                      },
                    })
                    const piData = await piRes.json()
                    const piStatus = piData?.data?.attributes?.status
                    if (piStatus === 'succeeded') {
                      clearInterval(pollingIntervalRef.current)
                      pollingIntervalRef.current = null
                      window.location.href = `${window.location.origin}/booking-confirmation?payment_intent_id=${capturedPiId}`
                    } else if (piStatus === 'failed' || piStatus === 'cancelled') {
                      clearInterval(pollingIntervalRef.current)
                      pollingIntervalRef.current = null
                      setPollingError('Payment failed. Please try again.')
                    }
                  } catch (_) {}
                }, 3000)
                console.log('polling started', capturedPiId)
              // Step 11 — Payment succeeded immediately (card payments)
              // Do NOT update to 'confirmed' here — BookingConfirmation.jsx finds the
              // 'pending_payment' booking and confirms it after verifying with PayMongo.
              } else if (attachStatus === 'succeeded') {
                window.location.href = `${window.location.origin}/booking-confirmation?payment_intent_id=${piId}`
              } else {
                if (paymentMethod === 'card') {
                  await supabase.from('bookings').update({ status: 'cancelled' }).eq('reference_number', ref)
                }
                setSaveError('Payment could not be processed. Please try again.')
                setSaving(false)
                setIsProcessingPayment(false)
              }
            } catch (err) {
              if (paymentMethod === 'card') await supabase.from('bookings').update({ status: 'cancelled' }).eq('reference_number', ref).catch(() => {})
              setSaveError(err?.message || 'Payment setup failed. Please try again.')
              setSaving(false)
              setIsProcessingPayment(false)
            }
          }}
          disabled={saving || (remainingAmount > 0 && !paymentMethod)}
          className={`w-full md:w-auto bg-orange-500 hover:bg-orange-600 disabled:opacity-70 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-base flex items-center justify-center gap-2 ${remainingAmount === 0 ? '' : (paymentMethod === 'gcash' || paymentMethod === 'paymaya' ? 'hidden' : '')}`}
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Processing...
            </>
          ) : remainingAmount === 0 ? 'Confirm Booking' : 'Confirm & Pay'}
        </button>
      </div>
    </div>
  )
}

function Booking() {
  const { service } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(0)
  const [isRebook, setIsRebook] = useState(false)
  const [rebookOriginalId, setRebookOriginalId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      supabase.from('profiles').select('role').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data?.role === 'tasker') navigate('/tasker-dashboard')
          if (data?.role === 'admin') navigate('/admin')
        })
    })
  }, [])

  // Step 1 data
  const [step1Draft, setStep1Draft] = useState(null)
  const [taskAddress, setTaskAddress] = useState('')
  const [taskLandmark, setTaskLandmark] = useState('')
  const [taskSize, setTaskSize] = useState('')
  const [taskDetails, setTaskDetails] = useState('')
  const [aiImageAnalysis, setAiImageAnalysis] = useState(null)
  const [bookingImagePreview, setBookingImagePreview] = useState(null)
  const [taskOptions, setTaskOptions] = useState(null)
  const [travelFee, setTravelFee] = useState(0)
  const [taskersNeeded, setTaskersNeeded] = useState(1)
  const [estimatedTotal, setEstimatedTotal] = useState(0)

  // Rebook init — runs once on mount if navigated here from Dashboard "Rebook"
  useEffect(() => {
    const state = location.state
    if (!state?.is_rebook) return
    setIsRebook(true)
    setRebookOriginalId(state.original_booking_id ?? null)
    if (state.taskers_needed) setTaskersNeeded(state.taskers_needed)
    try {
      const opts = typeof state.task_options === 'string'
        ? JSON.parse(state.task_options)
        : state.task_options
      if (opts) setTaskOptions(opts)
    } catch {}
    if (state.tasker_id) {
      supabase.from('taskers').select('*').eq('id', state.tasker_id).single()
        .then(({ data: t }) => {
          if (!t) return
          setModalTasker({
            id: t.id,
            name: t.name,
            role: t.role,
            rating: t.rating,
            reviews: t.reviews_count,
            tasks: 0,
            price: `₱${t.hourly_rate}/hr`,
            bio: t.bio,
          })
          setStep(1)
        })
    }
  }, [])

  // Tasker list (fetched from Supabase)
  const [taskers, setTaskers] = useState([])
  const [loadingTaskers, setLoadingTaskers] = useState(true)
  const [taskersError, setTaskersError] = useState(false)

  useEffect(() => {
    async function fetchTaskers() {
      const serviceToRole = {
        'Plumbing Repair': 'Plumbing',
        'Electrical Repair': 'Electrical',
        'Aircon Cleaning': 'Aircon Cleaning',
        'Cleaning': 'Cleaning',
        'Carpentry': 'Carpentry',
        'Painting': 'Painting',
      }
      const role = serviceToRole[service] || service
      const { data, error } = await supabase
        .from('taskers')
        .select('*')
        .ilike('role', role)
        .eq('status', 'approved')
      if (error) {
        setTaskersError(true)
      } else {
        const taskerIds = data.map(t => t.id)
        const [{ data: completedBookings }, { data: reviewsData }] = await Promise.all([
          supabase.from('bookings').select('tasker_id').eq('status', 'completed'),
          supabase.from('reviews').select('tasker_id, rating').in('tasker_id', taskerIds).eq('is_hidden', false).eq('is_flagged', false),
        ])
        const taskCountMap = {}
        completedBookings?.forEach(b => {
          taskCountMap[b.tasker_id] = (taskCountMap[b.tasker_id] || 0) + 1
        })
        const reviewCountMap = {}
        const reviewSumMap = {}
        reviewsData?.forEach(r => {
          reviewCountMap[r.tasker_id] = (reviewCountMap[r.tasker_id] || 0) + 1
          reviewSumMap[r.tasker_id]   = (reviewSumMap[r.tasker_id]   || 0) + (r.rating ?? 0)
        })
        setTaskers(data.map((t) => ({
          id: t.id,
          name: t.name,
          role: t.role,
          rating: reviewCountMap[t.id] ? reviewSumMap[t.id] / reviewCountMap[t.id] : 0,
          reviews: reviewCountMap[t.id] ?? 0,
          tasks: taskCountMap[t.id] || 0,
          price: `₱${t.hourly_rate}/hr`,
          bio: t.bio,
          profile_photo: t.profile_photo ?? null,
          availability: t.availability?.trim() ?? null,
          service_area: t.service_area ?? null,
        })))
      }
      setLoadingTaskers(false)
    }
    fetchTaskers()
  }, [])

  // Clear modal on unmount to prevent backdrop getting stuck
  useEffect(() => () => setModalTasker(null), [])

  // Step 2 modal + tasker selection
  const [modalTasker, setModalTasker] = useState(null)
  const [selectedTasker, setSelectedTasker] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [taskDuration, setTaskDuration] = useState(8)

  const handleStep1Continue = (data) => {
    setTaskAddress(data.address)
    setTaskLandmark(data.landmark ?? '')
    setTaskSize(data.size)
    setTaskDetails(data.details)
    setAiImageAnalysis(data.aiImageAnalysis)
    if (data._draft?.imagePreview) setBookingImagePreview(data._draft.imagePreview)
    if (data.taskOptions) setTaskOptions(data.taskOptions)
    if (data.taskersNeeded) setTaskersNeeded(data.taskersNeeded)
    if (data.estimatedTotal) setEstimatedTotal(data.estimatedTotal)
    if (data._draft) setStep1Draft(data._draft)
    setStep(1)
  }

  const handleOpenModal = (tasker) => setModalTasker(tasker)
  const handleCloseModal = () => setModalTasker(null)

  const handleScheduleConfirm = (tasker, date, time, durationHours) => {
    setSelectedTasker(tasker)
    setSelectedDate(date)
    setSelectedTime(time)
    setTaskDuration(durationHours ?? 8)
    setModalTasker(null)
    const customerCity = detectCustomerCity(taskAddress)
    setTravelFee(customerCity && tasker.service_area && tasker.service_area !== customerCity ? 500 : 0)
    setStep(2)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 relative"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Schedule modal */}
      {modalTasker && (
        <ScheduleModal
          tasker={modalTasker}
          taskOptions={taskOptions}
          onClose={handleCloseModal}
          onConfirm={handleScheduleConfirm}
        />
      )}

      {/* Card */}
      <div className="relative z-10 w-full max-w-[830px] bg-white rounded-2xl shadow-2xl p-4 md:p-10">
        {/* Card header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <span className="text-base font-bold text-orange-500 tracking-wide flex items-center gap-1"><Home size={16} />hanap.ph</span>
            </Link>
            <p className="text-sm text-gray-400 capitalize">{service}</p>
          </div>
          <ProgressTracker step={step} />
        </div>

        {isRebook && (
          <div className="mb-5 flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 font-medium">
            🔄 Rebooking — please select a new date and time
          </div>
        )}

        {step === 0 && <Step1 service={service} onContinue={handleStep1Continue} initialState={step1Draft} />}

        {step === 1 && (
          (() => {
            const taskDurationForFilter = getTaskDuration(taskOptions)
            const isFullDayTask = taskDurationForFilter >= 8
            const visibleTaskers = isFullDayTask
              ? taskers.filter(t => !t.availability || t.availability.trim() === 'Full Time')
              : taskers
            return (
              <Step2
                onSelect={handleOpenModal}
                onBack={() => setStep(0)}
                taskers={visibleTaskers}
                loadingTaskers={loadingTaskers}
                taskersError={taskersError}
                taskersNeeded={taskersNeeded}
                estimatedTotal={estimatedTotal}
                taskOptions={taskOptions}
                taskAddress={taskAddress}
              />
            )
          })()
        )}

        {step === 2 && (
          <Step3
            service={service}
            tasker={selectedTasker}
            date={selectedDate}
            time={selectedTime}
            taskSize={taskSize}
            taskAddress={taskAddress}
            taskLandmark={taskLandmark}
            taskDetails={taskDetails}
            taskOptions={taskOptions}
            taskersNeeded={taskersNeeded}
            taskDuration={taskDuration}
            travelFee={travelFee}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <Step4
            service={service}
            tasker={selectedTasker}
            date={selectedDate}
            time={selectedTime}
            taskSize={taskSize}
            taskAddress={taskAddress}
            taskLandmark={taskLandmark}
            taskDetails={taskDetails}
            aiImageAnalysis={aiImageAnalysis}
            bookingImagePreview={bookingImagePreview}
            taskOptions={taskOptions}
            taskersNeeded={taskersNeeded}
            taskDuration={taskDuration}
            estimatedTotal={estimatedTotal}
            travelFee={travelFee}
            isRebook={isRebook}
            rebookOriginalId={rebookOriginalId}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  )
}

export default Booking
