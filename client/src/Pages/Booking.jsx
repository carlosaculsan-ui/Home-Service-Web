import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import backgroundImg from '../Assets/Background.jpg'
import { supabase } from '../supabase'
import LocationMap from '../Components/LocationMap'
import Groq from 'groq-sdk'
import { ClipboardList, Users, CalendarDays, Pencil, User, Phone, Mail, MapPin, Info, CheckCircle2, Smartphone, CreditCard, Bot, Home } from 'lucide-react'

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
    if (taskOptions.type === 'Custom Build') {
      if (['Bed Frame', 'Ceiling / Wall Panel'].includes(taskOptions.item)) return 8
      return 6
    }
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

function isSlotAvailable(slotHour, existingBookings) {
  for (const booking of existingBookings) {
    const bookedStart = parseInt(booking.scheduled_time.split(':')[0])
    const bookedEnd = bookedStart + (booking.duration_hours || 8) + BUFFER_HOURS
    if (slotHour >= bookedStart && slotHour < bookedEnd) return false
  }
  return true
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
  const taskDuration = getTaskDuration(taskOptions)
  const isFullDay = taskDuration >= 8

  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [leaveDates, setLeaveDates] = useState(new Set())
  const [bookingsByDate, setBookingsByDate] = useState({})
  const [loadingDates, setLoadingDates] = useState(true)

  useEffect(() => {
    async function fetchAvailability() {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      }

      const [bookingsRes, leavesRes] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/bookings?tasker_id=eq.${tasker.id}&status=in.(confirmed,accepted,on_the_way,in_progress)&select=scheduled_date,scheduled_time,duration_hours`,
          { headers }
        ),
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tasker_leaves?tasker_id=eq.${tasker.id}&status=eq.approved&select=leave_dates`,
          { headers }
        ),
      ])

      const [bookingsData, leavesData] = await Promise.all([bookingsRes.json(), leavesRes.json()])

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
  const isPast = (d) => getDateObj(d) < todayStart
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
    if (!d || isPast(d) || isBlocked(d)) return
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
          <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400">
            <User size={22} />
          </div>
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
                      disabled={isPast(d) || isBlocked(d)}
                      className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors
                        ${isSelected(d)
                          ? 'bg-orange-500 text-white font-bold'
                          : isBlocked(d)
                          ? 'bg-red-100 text-red-300 cursor-not-allowed'
                          : isToday(d)
                          ? 'ring-2 ring-orange-400 text-orange-600 font-bold hover:bg-orange-100 cursor-pointer'
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

            {/* Time slots */}
            {selectedDate && (
              <div className="mb-4">
                {isFullDay ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 text-sm text-blue-700">
                    <Info size={16} className="mt-0.5 flex-shrink-0" />
                    <span>The tasker will be fully booked for this entire day. No other bookings will be accepted on this date.</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Select a Time</p>
                    <div className="grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const h = parseInt(slot.split(':')[0])
                        const available = isSlotAvailable(h, selectedDateBookings)
                        const isPickedSlot = selectedSlot === slot
                        return (
                          <button
                            key={slot}
                            disabled={!available}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-1 rounded-lg text-xs font-medium border transition-colors
                              ${isPickedSlot
                                ? 'bg-orange-500 text-white border-orange-500'
                                : available
                                ? 'bg-white text-gray-700 border-gray-200 hover:border-orange-400 hover:text-orange-500'
                                : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              }`}
                          >
                            {formatTimeSlot(slot)}
                          </button>
                        )
                      })}
                    </div>
                    {selectedSlot && (
                      <p className="text-xs text-gray-400 mt-2">
                        Estimated duration: {taskDuration} hours (including {BUFFER_HOURS} hour buffer time)
                      </p>
                    )}
                  </>
                )}
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
                <p className="text-sm font-semibold text-gray-800">Hanap.ph Staff</p>
                <p className="text-xs text-gray-400">Assistant{taskersNeeded >= 3 ? ' 1' : ''}</p>
              </div>
            </div>
          )}

          {taskersNeeded >= 3 && (
            <div className="flex items-center gap-3">
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Hanap.ph Staff</p>
                <p className="text-xs text-gray-400">Assistant 2</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
          {taskersNeeded === 1
            ? 'This task only requires 1 tasker.'
            : taskersNeeded === 2
            ? 'This task requires 2 taskers. The lead tasker will be assisted by 1 Hanap.ph staff member.'
            : 'This task requires 3 taskers. The lead tasker will be assisted by 2 Hanap.ph staff members.'}
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
  else if (service === 'Carpentry')    label = `${taskOptions.type} · ${taskOptions.item}`
  else if (service === 'Electrical')   label = `${taskOptions.type} · ${taskOptions.urgency}`
  else if (service === 'Aircon Maintenance') label = `${taskOptions.aircon_type} · ${taskOptions.service_type}`
  else if (service === 'Painting')     label = `${taskOptions.what_to_paint} Painting · ${taskOptions.area}`
  else if (service === 'Plumbing Repair') label = `${taskOptions.problem} · ${taskOptions.urgency}`
  return { label, extras: taskOptions.extras ?? [] }
}

function TaskerCard({ tasker, onSelect, taskersNeeded, estimatedTotal, taskOptions }) {
  const [expanded, setExpanded] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
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

      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400">
            <User size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <p className="font-bold text-gray-800 text-base leading-tight">{tasker.name}</p>
              <button
                onClick={() => setShowTeamModal(true)}
                className="text-xs text-gray-400 underline hover:text-gray-600 whitespace-nowrap mt-0.5 flex-shrink-0"
              >
                details
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-1">{tasker.role}</p>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold">{(tasker.rating ?? 0).toFixed(1)}</span>
              <span className="text-gray-400">({formatReviews(tasker.reviews ?? 0)} reviews)</span>
              <span className="text-gray-300">•</span>
              <span>{(tasker.tasks ?? 0).toLocaleString()} tasks</span>
            </div>
            <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
              2 HOUR MINIMUM
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

function Step2({ onSelect, onBack, taskers, loadingTaskers, taskersError, taskersNeeded, estimatedTotal, taskOptions }) {
  return (
    <div className="space-y-4">
      {taskersNeeded >= 2 && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-sm text-blue-700">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <p>This job requires {taskersNeeded} taskers. You are selecting the lead tasker. Additional Hanap.ph staff will be assigned.</p>
        </div>
      )}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <Users size={24} className="text-blue-400 flex-shrink-0" />
        <p className="text-sm text-gray-600">
          Filter and sort to find your Tasker. Then view their availability to request your date and time.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['Date: Within A Week', 'Time: I\'m Flexible', '₱150 - ₱500/hr'].map((label) => (
          <button
            key={label}
            className="px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:border-orange-400 hover:text-orange-500 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="font-medium">Sorted by:</span>
        <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none">
          <option>Recommended</option>
          <option>Highest Rated</option>
          <option>Most Reviews</option>
          <option>Price: Low to High</option>
          <option>Price: High to Low</option>
        </select>
      </div>

      <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
        {loadingTaskers && (
          <p className="text-sm text-gray-400 text-center py-8">Loading taskers...</p>
        )}
        {taskersError && (
          <p className="text-sm text-red-400 text-center py-8">Failed to load taskers. Please try again.</p>
        )}
        {!loadingTaskers && !taskersError && taskers.map((tasker) => (
          <TaskerCard
            key={tasker.name}
            tasker={tasker}
            onSelect={onSelect}
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

function Step3({ service, tasker, date, time, taskSize, taskAddress, taskDetails, taskOptions, taskersNeeded, taskDuration, onBack, onContinue }) {
  const navigate = useNavigate()

  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formPhoneError, setFormPhoneError] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

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
    ? `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${time}`
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
        {taskDuration && <DetailRow label="Est. Duration" value={`${taskDuration} hrs + 1 hr buffer`} />}
        <DetailRow label="Task Size" value={taskSize} />
        <DetailRow label="Address" value={taskAddress} />
        <DetailRow label="Task Description" value={taskDetails} />
        {taskOptions && taskOptions.service === 'Cleaning' && (
          <>
            <DetailRow label="Type" value={taskOptions.type} />
            <DetailRow label="Area" value={taskOptions.area} />
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Taskers Needed" value={String(taskersNeeded)} />
            <DetailRow label="Estimated Total" value={`₱${taskOptions.final_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Carpentry' && (
          <>
            <DetailRow label="Type of Work" value={taskOptions.type} />
            <DetailRow label="Item" value={taskOptions.item} />
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Taskers Needed" value={String(taskersNeeded)} />
            <DetailRow label="Estimated Total" value={`₱${taskOptions.final_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Electrical' && (
          <>
            <DetailRow label="Type of Work" value={taskOptions.type} />
            <DetailRow label="Urgency" value={taskOptions.urgency} />
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Taskers Needed" value={String(taskersNeeded)} />
            <DetailRow label="Estimated Total" value={`₱${taskOptions.final_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Aircon Maintenance' && (
          <>
            <DetailRow label="Aircon Type" value={taskOptions.aircon_type} />
            <DetailRow label="Number of Units" value={String(taskOptions.units)} />
            <DetailRow label="Service Type" value={taskOptions.service_type} />
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Taskers Needed" value={String(taskersNeeded)} />
            <DetailRow label="Estimated Total" value={`₱${taskOptions.final_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Painting' && (
          <>
            <DetailRow label="What to Paint" value={taskOptions.what_to_paint} />
            <DetailRow label="Area Size" value={taskOptions.area} />
            <DetailRow label="Paint Provided" value={taskOptions.paint_provided ? 'Yes' : 'No'} />
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Taskers Needed" value={String(taskersNeeded)} />
            <DetailRow label="Estimated Total" value={`₱${taskOptions.final_price?.toLocaleString()}`} />
          </>
        )}
        {taskOptions && taskOptions.service === 'Plumbing Repair' && (
          <>
            <DetailRow label="Problem" value={taskOptions.problem} />
            <DetailRow label="Urgency" value={taskOptions.urgency} />
            {taskOptions.extras?.length > 0 && <DetailRow label="Extras" value={taskOptions.extras.join(', ')} />}
            <DetailRow label="Taskers Needed" value={String(taskersNeeded)} />
            <DetailRow label="Estimated Total" value={`₱${taskOptions.final_price?.toLocaleString()}`} />
          </>
        )}
      </div>

      {/* Section 3 – Tasker Information */}
      <div className="border border-gray-200 rounded-xl p-5">
        <p className="font-bold text-gray-800 text-base mb-4">Your Tasker</p>
        <div className="flex gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400">
            <User size={28} />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-base leading-tight">{tasker?.name}</p>
            <p className="text-sm text-orange-500 font-medium">{tasker?.role}</p>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold">{(tasker?.rating ?? 0).toFixed(1)}</span>
              <span className="text-gray-400">({formatReviews(tasker?.reviews ?? 0)} reviews)</span>
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

function Step1({ service, onContinue }) {
  const [address, setAddress] = useState('')
  const [size] = useState('Medium')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [cleaningType, setCleaningType] = useState('')
  const [cleaningArea, setCleaningArea] = useState('')
  const [cleaningExtras, setCleaningExtras] = useState([])
  const [carpentryType, setCarpentryType] = useState('')
  const [carpentryItem, setCarpentryItem] = useState('')
  const [carpentryExtras, setCarpentryExtras] = useState([])
  const [electricalType, setElectricalType] = useState('')
  const [electricalUrgency, setElectricalUrgency] = useState('')
  const [electricalExtras, setElectricalExtras] = useState([])
  const [airconType, setAirconType] = useState('')
  const [airconUnits, setAirconUnits] = useState(1)
  const [airconServiceType, setAirconServiceType] = useState('')
  const [airconExtras, setAirconExtras] = useState([])
  const [paintingWhat, setPaintingWhat] = useState('')
  const [paintingArea, setPaintingArea] = useState('')
  const [paintingPaintProvided, setPaintingPaintProvided] = useState('')
  const [paintingExtras, setPaintingExtras] = useState([])
  const [plumbingProblem, setPlumbingProblem] = useState('')
  const [plumbingUrgency, setPlumbingUrgency] = useState('')
  const [plumbingExtras, setPlumbingExtras] = useState([])

  const BASE_PRICES = {
    'Basic Cleaning':  { 'Small (1 room)': 750, 'Medium (2-3 rooms)': 1500, 'Large (whole house)': 2250 },
    'Deep Cleaning':   { 'Small (1 room)': 1200, 'Medium (2-3 rooms)': 2400, 'Large (whole house)': 3600 },
  }
  const EXTRAS_PRICES = { 'With Laundry': 200, 'With Appliances': 250 }

  const CARPENTRY_ITEMS = {
    'Repair': [
      { value: 'Door / Window', price: 500 },
      { value: 'Cabinet / Drawer', price: 450 },
      { value: 'Table / Chair', price: 400 },
      { value: 'Bed Frame', price: 550 },
      { value: 'Ceiling / Wall Panel', price: 600 },
    ],
    'Install': [
      { value: 'Door / Window', price: 800 },
      { value: 'Cabinet', price: 750 },
      { value: 'Shelves', price: 600 },
      { value: 'Bed Frame', price: 700 },
      { value: 'Ceiling / Wall Panel', price: 900 },
    ],
    'Custom Build': [
      { value: 'Cabinet', price: 2500 },
      { value: 'Shelves', price: 1500 },
      { value: 'Table', price: 2000 },
      { value: 'Bed Frame', price: 3000 },
      { value: 'Ceiling / Wall Panel', price: 3500 },
    ],
  }
  const CARPENTRY_EXTRAS_PRICES = { 'Materials Included': 500, 'Varnishing / Finishing': 350, 'Hauling / Debris Removal': 200 }

  const ELECTRICAL_TYPES = [
    { value: 'Install Outlet', price: 600 },
    { value: 'Repair Wiring', price: 800 },
    { value: 'Install Lights', price: 700 },
  ]
  const ELECTRICAL_EXTRAS_PRICES = { 'Materials Included': 400, 'Additional Outlet/Switch': 300, 'Circuit Breaker Check': 250 }

  const AIRCON_PRICES = {
    'Window Type': { 'Cleaning': 500, 'Cleaning + Checkup': 700 },
    'Split Type':  { 'Cleaning': 700, 'Cleaning + Checkup': 950 },
  }

  const PLUMBING_PROBLEMS = [
    { value: 'Leaking Faucet', price: 500 },
    { value: 'Clogged Drain',  price: 600 },
    { value: 'Pipe Repair',    price: 900 },
  ]
  const PLUMBING_EXTRAS_PRICES = { 'Materials Included': 400, 'Multiple Points (2+ faucets/drains)': 300, 'Waterproofing': 500 }

  const PAINTING_BASE_PRICES = {
    'Wall':      { 'Small': 800,  'Medium': 1500, 'Large': 2500 },
    'Ceiling':   { 'Small': 900,  'Medium': 1700, 'Large': 2800 },
    'Furniture': { 'Small': 600,  'Medium': 1000, 'Large': 1800 },
  }
  const PAINTING_PAINT_COSTS = { 'Small': 500, 'Medium': 1000, 'Large': 1800 }
  const PAINTING_EXTRAS_PRICES = { 'Primer Coat': 400, 'Two Coats': 500, 'Wall Putty / Patching': 300 }

  // Cleaning pricing
  const basePrice = cleaningType && cleaningArea ? BASE_PRICES[cleaningType]?.[cleaningArea] ?? 0 : 0
  const extrasTotal = cleaningExtras.reduce((sum, e) => sum + (EXTRAS_PRICES[e] ?? 0), 0)
  const finalPrice = basePrice + extrasTotal

  // Carpentry pricing
  const carpentryItemPrice = carpentryType && carpentryItem
    ? (CARPENTRY_ITEMS[carpentryType]?.find(i => i.value === carpentryItem)?.price ?? 0)
    : 0
  const carpentryExtrasTotal = carpentryExtras.reduce((sum, e) => sum + (CARPENTRY_EXTRAS_PRICES[e] ?? 0), 0)
  const carpentryFinalPrice = carpentryItemPrice + carpentryExtrasTotal

  // Electrical pricing
  const electricalBasePrice = ELECTRICAL_TYPES.find(t => t.value === electricalType)?.price ?? 0
  const electricalUrgencySurcharge = electricalUrgency === 'Urgent' ? Math.round(electricalBasePrice * 0.5) : 0
  const electricalExtrasTotal = electricalExtras.reduce((sum, e) => sum + (ELECTRICAL_EXTRAS_PRICES[e] ?? 0), 0)
  const electricalFinalPrice = electricalBasePrice + electricalUrgencySurcharge + electricalExtrasTotal

  // Aircon pricing
  const airconPricePerUnit = airconType && airconServiceType ? (AIRCON_PRICES[airconType]?.[airconServiceType] ?? 0) : 0
  const airconBasePrice = airconPricePerUnit * airconUnits
  const airconFreonTotal = airconExtras.includes('Freon Recharge') ? 500 * airconUnits : 0
  const airconSameDayTotal = airconExtras.includes('Same Day Service') ? 300 : 0
  const airconExtrasTotal = airconFreonTotal + airconSameDayTotal
  const airconFinalPrice = airconBasePrice + airconExtrasTotal

  // Plumbing pricing
  const plumbingBasePrice = PLUMBING_PROBLEMS.find(p => p.value === plumbingProblem)?.price ?? 0
  const plumbingUrgencySurcharge = plumbingUrgency === 'Urgent' ? 200 : 0
  const plumbingExtrasTotal = plumbingExtras.reduce((sum, e) => sum + (PLUMBING_EXTRAS_PRICES[e] ?? 0), 0)
  const plumbingFinalPrice = plumbingBasePrice + plumbingUrgencySurcharge + plumbingExtrasTotal

  // Painting pricing
  const paintingBasePrice = paintingWhat && paintingArea ? (PAINTING_BASE_PRICES[paintingWhat]?.[paintingArea] ?? 0) : 0
  const paintingPaintCost = paintingPaintProvided === 'No' ? (PAINTING_PAINT_COSTS[paintingArea] ?? 0) : 0
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
      if (!carpentryType || !carpentryItem) return 1
      let n = carpentryType === 'Custom Build' && (carpentryItem === 'Bed Frame' || carpentryItem === 'Ceiling / Wall Panel') ? 2 : 1
      if (carpentryExtras.includes('Materials Included')) n += 1
      return n
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

  const handleDetectLocation = () => {
    setDetectingLocation(true)
    setLocationError('')

    const onSuccess = async (position) => {
      try {
        const { latitude, longitude } = position.coords
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        )
        const data = await res.json()
        if (data?.display_name) {
          setAddress(data.display_name)
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
      navigator.geolocation.getCurrentPosition(onSuccess, onError)
    } else {
      onError()
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setAiResult('')
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

  const handleContinue = () => {
    if (!address.trim() || !details.trim()) {
      setError('Please fill in all required fields')
      return
    }
    if (service?.toLowerCase() === 'cleaning' && (!cleaningType || !cleaningArea)) {
      setError('Please complete all required task options before continuing.')
      return
    }
    if (service?.toLowerCase() === 'carpentry' && (!carpentryType || !carpentryItem)) {
      setError('Please complete all required task options before continuing.')
      return
    }
    if (service?.toLowerCase() === 'electrical' && (!electricalType || !electricalUrgency)) {
      setError('Please complete all required task options before continuing.')
      return
    }
    if (service?.toLowerCase() === 'aircon cleaning' && (!airconType || !airconServiceType)) {
      setError('Please complete all required task options before continuing.')
      return
    }
    if (service?.toLowerCase() === 'painting' && (!paintingWhat || !paintingArea || paintingPaintProvided === '')) {
      setError('Please complete all required task options before continuing.')
      return
    }
    if (service?.toLowerCase() === 'plumbing repair' && (!plumbingProblem || !plumbingUrgency)) {
      setError('Please complete all required task options before continuing.')
      return
    }
    setError('')
    const aiImageAnalysis = aiResult && aiResult !== 'error' ? aiResult : null
    const isCleaning = service?.toLowerCase() === 'cleaning'
    const isCarpentry = service?.toLowerCase() === 'carpentry'
    const isElectrical = service?.toLowerCase() === 'electrical'
    const isAircon = service?.toLowerCase() === 'aircon cleaning'
    const isPainting = service?.toLowerCase() === 'painting'
    const isPlumbing = service?.toLowerCase() === 'plumbing repair'
    onContinue({
      address: address.trim(),
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
        },
        taskersNeeded,
        estimatedTotal: finalPrice,
      } : {}),
      ...(isCarpentry && carpentryType && carpentryItem ? {
        taskOptions: {
          service: 'Carpentry',
          type: carpentryType,
          item: carpentryItem,
          extras: carpentryExtras,
          base_price: carpentryItemPrice,
          extras_total: carpentryExtrasTotal,
          final_price: carpentryFinalPrice,
        },
        taskersNeeded,
        estimatedTotal: carpentryFinalPrice,
      } : {}),
      ...(isElectrical && electricalType && electricalUrgency ? {
        taskOptions: {
          service: 'Electrical',
          type: electricalType,
          urgency: electricalUrgency,
          extras: electricalExtras,
          base_price: electricalBasePrice,
          urgency_surcharge: electricalUrgencySurcharge,
          extras_total: electricalExtrasTotal,
          final_price: electricalFinalPrice,
        },
        taskersNeeded,
        estimatedTotal: electricalFinalPrice,
      } : {}),
      ...(isAircon && airconType && airconServiceType ? {
        taskOptions: {
          service: 'Aircon Maintenance',
          aircon_type: airconType,
          units: airconUnits,
          service_type: airconServiceType,
          extras: airconExtras,
          price_per_unit: airconPricePerUnit,
          base_price: airconBasePrice,
          extras_total: airconExtrasTotal,
          final_price: airconFinalPrice,
        },
        taskersNeeded,
        estimatedTotal: airconFinalPrice,
      } : {}),
      ...(isPainting && paintingWhat && paintingArea && paintingPaintProvided !== '' ? {
        taskOptions: {
          service: 'Painting',
          what_to_paint: paintingWhat,
          area: paintingArea,
          paint_provided: paintingPaintProvided === 'Yes',
          extras: paintingExtras,
          base_price: paintingBasePrice,
          paint_cost: paintingPaintCost,
          extras_total: paintingExtrasTotal,
          final_price: paintingFinalPrice,
        },
        taskersNeeded,
        estimatedTotal: paintingFinalPrice,
      } : {}),
      ...(isPlumbing && plumbingProblem && plumbingUrgency ? {
        taskOptions: {
          service: 'Plumbing Repair',
          problem: plumbingProblem,
          urgency: plumbingUrgency,
          extras: plumbingExtras,
          base_price: plumbingBasePrice,
          urgency_surcharge: plumbingUrgencySurcharge,
          extras_total: plumbingExtrasTotal,
          final_price: plumbingFinalPrice,
        },
        taskersNeeded,
        estimatedTotal: plumbingFinalPrice,
      } : {}),
    })
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-gray-800 text-base">Your task location</span>
          <Pencil size={15} className="text-gray-400 cursor-pointer" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <MapPin size={20} className="text-orange-400 flex-shrink-0" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your address"
              className="flex-1 text-base text-gray-700 outline-none placeholder-gray-400"
            />
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
        {locationError && (
          <p className="text-xs text-red-500 mt-1">{locationError}</p>
        )}
        {address.length > 5 && (
          <div className="mt-3">
            <LocationMap address={address} />
          </div>
        )}
      </div>

      {service?.toLowerCase() === 'cleaning' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="font-bold text-gray-800 text-base">Task Options</p>

          {/* Section 1: Type of Cleaning — always visible */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">Type of Cleaning <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {[
                { value: 'Basic Cleaning', price: '₱750' },
                { value: 'Deep Cleaning', price: '₱1,200' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${cleaningType === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="cleaningType"
                      value={opt.value}
                      checked={cleaningType === opt.value}
                      onChange={() => { setCleaningType(opt.value); setCleaningArea(''); setCleaningExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-gray-500">{opt.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Area Size — appears after type selected */}
          <div style={{ overflow: 'hidden', maxHeight: cleaningType ? '400px' : '0', opacity: cleaningType ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Area Size <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {['Small (1 room)', 'Medium (2-3 rooms)', 'Large (whole house)'].map((area) => (
                <label key={area} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${cleaningArea === area ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="cleaningArea"
                    value={area}
                    checked={cleaningArea === area}
                    onChange={() => { setCleaningArea(area); setCleaningExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{area}</span>
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
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">₱{finalPrice.toLocaleString()}</span>
              </div>
              <p className="text-gray-400">Taskers needed: {taskersNeeded}</p>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>This job requires {taskersNeeded} taskers. You are selecting the lead tasker. Additional Hanap.ph staff will be assigned.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {service?.toLowerCase() === 'carpentry' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="font-bold text-gray-800 text-base">Task Options</p>

          {/* Section 1: Type of Work — always visible */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">Type of Work <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {['Repair', 'Install', 'Custom Build'].map((type) => (
                <label key={type} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${carpentryType === type ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="carpentryType"
                    value={type}
                    checked={carpentryType === type}
                    onChange={() => { setCarpentryType(type); setCarpentryItem(''); setCarpentryExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Item Selection — appears after type selected */}
          <div style={{ overflow: 'hidden', maxHeight: carpentryType ? '500px' : '0', opacity: carpentryType ? 1 : 0, transition: 'max-height 0.35s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Item <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {(CARPENTRY_ITEMS[carpentryType] || []).map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${carpentryItem === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="carpentryItem"
                      value={opt.value}
                      checked={carpentryItem === opt.value}
                      onChange={() => { setCarpentryItem(opt.value); setCarpentryExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-gray-500">₱{opt.price.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Extras — appears after item selected */}
          <div style={{ overflow: 'hidden', maxHeight: carpentryItem ? '350px' : '0', opacity: carpentryItem ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Extras <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="space-y-2">
              {[
                { value: 'Materials Included', price: '+₱500' },
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

          {/* Price Breakdown — appears after item selected */}
          <div style={{ overflow: 'hidden', maxHeight: carpentryItem ? '350px' : '0', opacity: carpentryItem ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{carpentryType}</span>
                <span></span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>{carpentryItem}</span>
                <span>₱{carpentryItemPrice.toLocaleString()}</span>
              </div>
              {carpentryExtras.map((e) => (
                <div key={e} className="flex justify-between text-gray-600">
                  <span>{e}</span>
                  <span>+₱{CARPENTRY_EXTRAS_PRICES[e].toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">₱{carpentryFinalPrice.toLocaleString()}</span>
              </div>
              <p className="text-gray-400">Taskers needed: {taskersNeeded}</p>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>This job requires {taskersNeeded} taskers. You are selecting the lead tasker. Additional Hanap.ph staff will be assigned.</p>
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
                      onChange={() => { setElectricalType(opt.value); setElectricalUrgency(''); setElectricalExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-gray-500">₱{opt.price.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Urgency — appears after type selected */}
          <div style={{ overflow: 'hidden', maxHeight: electricalType ? '300px' : '0', opacity: electricalType ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Urgency <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {[
                { value: 'Normal', label: 'Normal', sub: 'No extra charge' },
                { value: 'Urgent', label: 'Urgent', sub: `+₱${Math.round(electricalBasePrice * 0.5).toLocaleString()} (50% surcharge)` },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${electricalUrgency === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="electricalUrgency"
                      value={opt.value}
                      checked={electricalUrgency === opt.value}
                      onChange={() => { setElectricalUrgency(opt.value); setElectricalExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                      <p className="text-xs text-gray-400">{opt.sub}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Extras — appears after urgency selected */}
          <div style={{ overflow: 'hidden', maxHeight: electricalUrgency ? '350px' : '0', opacity: electricalUrgency ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Extras <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="space-y-2">
              {[
                { value: 'Materials Included', price: '+₱400' },
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

          {/* Price Breakdown — appears after urgency selected */}
          <div style={{ overflow: 'hidden', maxHeight: electricalUrgency ? '350px' : '0', opacity: electricalUrgency ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{electricalType}</span>
                <span>₱{electricalBasePrice.toLocaleString()}</span>
              </div>
              {electricalUrgencySurcharge > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Urgent surcharge</span>
                  <span>+₱{electricalUrgencySurcharge.toLocaleString()}</span>
                </div>
              )}
              {electricalExtras.map((e) => (
                <div key={e} className="flex justify-between text-gray-600">
                  <span>{e}</span>
                  <span>+₱{ELECTRICAL_EXTRAS_PRICES[e].toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">₱{electricalFinalPrice.toLocaleString()}</span>
              </div>
              <p className="text-gray-400">Taskers needed: {taskersNeeded}</p>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>This job requires {taskersNeeded} taskers. You are selecting the lead tasker. Additional Hanap.ph staff will be assigned.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {service?.toLowerCase() === 'aircon cleaning' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="font-bold text-gray-800 text-base">Task Options</p>

          {/* Section 1: Aircon Type — always visible */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">Aircon Type <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {['Window Type', 'Split Type'].map((type) => (
                <label key={type} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${airconType === type ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="airconType"
                    value={type}
                    checked={airconType === type}
                    onChange={() => { setAirconType(type); setAirconUnits(1); setAirconServiceType(''); setAirconExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Number of Units — appears after type selected */}
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

          {/* Section 3: Service Type — appears after type selected */}
          <div style={{ overflow: 'hidden', maxHeight: airconType ? '250px' : '0', opacity: airconType ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
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

          {/* Section 4: Extras — appears after service type selected */}
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

          {/* Price Breakdown — appears after service type selected */}
          <div style={{ overflow: 'hidden', maxHeight: airconServiceType ? '350px' : '0', opacity: airconServiceType ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{airconType} — {airconServiceType}</span>
                <span>₱{airconPricePerUnit.toLocaleString()} × {airconUnits} = ₱{airconBasePrice.toLocaleString()}</span>
              </div>
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
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">₱{airconFinalPrice.toLocaleString()}</span>
              </div>
              <p className="text-gray-400">Taskers needed: {taskersNeeded}</p>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>This job requires {taskersNeeded} taskers. You are selecting the lead tasker. Additional Hanap.ph staff will be assigned.</p>
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
              {['Wall', 'Ceiling', 'Furniture'].map((opt) => (
                <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paintingWhat === opt ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="paintingWhat"
                    value={opt}
                    checked={paintingWhat === opt}
                    onChange={() => { setPaintingWhat(opt); setPaintingArea(''); setPaintingPaintProvided(''); setPaintingExtras([]) }}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Area Size — appears after what selected */}
          <div style={{ overflow: 'hidden', maxHeight: paintingWhat ? '350px' : '0', opacity: paintingWhat ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Area Size <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {[
                { value: 'Small',  label: 'Small' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Large',  label: 'Large' },
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

          {/* Section 3: Paint Provided — appears after area selected */}
          <div style={{ overflow: 'hidden', maxHeight: paintingArea ? '350px' : '0', opacity: paintingArea ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Paint Provided? <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {[
                { value: 'Yes', label: 'Yes (I will provide the paint)', sub: 'No extra charge' },
                { value: 'No',  label: 'No (Hanap.ph provides paint)',   sub: `+₱${(PAINTING_PAINT_COSTS[paintingArea] ?? 0).toLocaleString()} extra` },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paintingPaintProvided === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paintingPaintProvided"
                      value={opt.value}
                      checked={paintingPaintProvided === opt.value}
                      onChange={() => { setPaintingPaintProvided(opt.value); setPaintingExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                      <p className="text-xs text-gray-400">{opt.sub}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 4: Extras — appears after paint provided selected */}
          <div style={{ overflow: 'hidden', maxHeight: paintingPaintProvided ? '350px' : '0', opacity: paintingPaintProvided ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
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

          {/* Price Breakdown — appears after paint provided selected */}
          <div style={{ overflow: 'hidden', maxHeight: paintingPaintProvided ? '400px' : '0', opacity: paintingPaintProvided ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{paintingWhat} Painting ({paintingArea})</span>
                <span>₱{paintingBasePrice.toLocaleString()}</span>
              </div>
              {paintingPaintCost > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Paint (not provided)</span>
                  <span>+₱{paintingPaintCost.toLocaleString()}</span>
                </div>
              )}
              {paintingExtras.map((e) => (
                <div key={e} className="flex justify-between text-gray-600">
                  <span>{e}</span>
                  <span>+₱{PAINTING_EXTRAS_PRICES[e].toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">₱{paintingFinalPrice.toLocaleString()}</span>
              </div>
              <p className="text-gray-400">Taskers needed: {taskersNeeded}</p>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>This job requires {taskersNeeded} taskers. You are selecting the lead tasker. Additional Hanap.ph staff will be assigned.</p>
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
                      onChange={() => { setPlumbingProblem(opt.value); setPlumbingUrgency(''); setPlumbingExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.value}</span>
                  </div>
                  <span className="text-sm text-gray-500">₱{opt.price.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Urgency — appears after problem selected */}
          <div style={{ overflow: 'hidden', maxHeight: plumbingProblem ? '300px' : '0', opacity: plumbingProblem ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Urgency <span className="text-red-400">*</span></p>
            <div className="space-y-2">
              {[
                { value: 'Normal', label: 'Normal', sub: 'No extra charge' },
                { value: 'Urgent', label: 'Urgent', sub: '+₱200 flat' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${plumbingUrgency === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="plumbingUrgency"
                      value={opt.value}
                      checked={plumbingUrgency === opt.value}
                      onChange={() => { setPlumbingUrgency(opt.value); setPlumbingExtras([]) }}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                      <p className="text-xs text-gray-400">{opt.sub}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Extras — appears after urgency selected */}
          <div style={{ overflow: 'hidden', maxHeight: plumbingUrgency ? '350px' : '0', opacity: plumbingUrgency ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <p className="font-semibold text-gray-700 text-sm mb-2">Extras <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="space-y-2">
              {[
                { value: 'Materials Included',                  price: '+₱400' },
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

          {/* Price Breakdown — appears after urgency selected */}
          <div style={{ overflow: 'hidden', maxHeight: plumbingUrgency ? '350px' : '0', opacity: plumbingUrgency ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{plumbingProblem}</span>
                <span>₱{plumbingBasePrice.toLocaleString()}</span>
              </div>
              {plumbingUrgencySurcharge > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Urgent</span>
                  <span>+₱{plumbingUrgencySurcharge.toLocaleString()}</span>
                </div>
              )}
              {plumbingExtras.map((e) => (
                <div key={e} className="flex justify-between text-gray-600">
                  <span>{e}</span>
                  <span>+₱{PLUMBING_EXTRAS_PRICES[e].toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                <span>Estimated Total</span>
                <span className="text-orange-500">₱{plumbingFinalPrice.toLocaleString()}</span>
              </div>
              <p className="text-gray-400">Taskers needed: {taskersNeeded}</p>
            </div>
            {taskersNeeded >= 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mt-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>This job requires {taskersNeeded} taskers. You are selecting the lead tasker. Additional Hanap.ph staff will be assigned.</p>
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
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe your task..."
          className="w-full border border-gray-200 rounded-lg p-3 text-base text-gray-700 resize-none outline-none focus:border-orange-400"
          style={{ minHeight: '140px' }}
        />

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-600 mb-2">Optional: Upload a photo of the damage</p>
          <p className="text-sm italic text-gray-400 mt-1 mb-3">Let Hanap AI detect and analyze your home issue automatically!</p>
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

      <button
        onClick={handleContinue}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 text-base rounded-xl transition-colors"
      >
        Continue
      </button>
    </div>
  )
}

function Step4({ service, tasker, date, time, taskSize, taskAddress, taskDetails, aiImageAnalysis, taskOptions, taskersNeeded, taskDuration, estimatedTotal: estimatedTotalProp, onBack }) {
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState('gcash')
  const [promoCode, setPromoCode] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [bookingRef, setBookingRef] = useState('')
  const [paymentPending, setPaymentPending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Detect PayMongo redirect back with ?payment=success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      const ref = params.get('ref') || sessionStorage.getItem('pendingBookingRef') || ''
      setBookingRef(ref)
      setConfirmed(true)
      sessionStorage.removeItem('pendingBookingRef')
    }
  }, [])

const rate = parseInt(tasker?.price?.replace(/[^0-9]/g, '') || '0')
  const estHours = taskSize === 'Small' ? '1 hr' : taskSize === 'Large' ? '4+ hrs' : '2-3 hrs'
  const estimatedTotal = estimatedTotalProp && estimatedTotalProp > 0 ? estimatedTotalProp : rate * (taskSize === 'Small' ? 1 : taskSize === 'Large' ? 4 : 2)
  const estTotal =
    taskSize === 'Small'
      ? `₱${rate.toLocaleString()}`
      : taskSize === 'Large'
      ? `₱${(rate * 4).toLocaleString()}+`
      : `₱${(rate * 2).toLocaleString()} – ₱${(rate * 3).toLocaleString()}`

  const formattedDate = date
    ? `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${time}`
    : ''

  if (confirmed) {
    return (
      <div className="flex flex-col items-center text-center py-8 space-y-5">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 size={44} className="text-green-500" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">Booking Confirmed!</p>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Thank you for booking with hanap.ph! Your tasker has been notified and will contact you shortly.
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-3">
          <p className="text-xs text-gray-400 mb-1">Booking Reference</p>
          <p className="text-lg font-bold text-orange-500 tracking-widest">{bookingRef}</p>
        </div>
        <div className="w-full border border-gray-100 rounded-xl p-5 text-left space-y-2">
          <p className="font-semibold text-gray-700 text-sm mb-3">Booking Summary</p>
          {[
            ['Service', service],
            ['Tasker', tasker?.name],
            ['Date & Time', formattedDate],
            ['Task Size', taskSize],
            ['Address', taskAddress],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-3 text-sm">
              <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
              <span className="text-gray-800 capitalize">{val}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors text-base"
        >
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
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
          <div className="flex justify-between">
            <span className="text-gray-500">Hourly Rate</span>
            <span>{tasker?.price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Estimated Hours</span>
            <span>{estHours}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-800 text-base pt-1">
            <span>Estimated Total</span>
            <span className="text-orange-500">{estTotal}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">Final price may vary based on actual hours worked.</p>
      </div>

      {/* Section 2 – Payment Method */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <p className="font-bold text-gray-800 text-base">Select Payment Method</p>

        {/* GCash option */}
        <label className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${paymentMethod === 'gcash' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
          <input
            type="radio"
            name="payment"
            value="gcash"
            checked={paymentMethod === 'gcash'}
            onChange={() => setPaymentMethod('gcash')}
            className="accent-orange-500 mt-0.5 w-4 h-4"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-blue-500" />
              <span className="font-semibold text-gray-800">GCash</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">You'll be redirected to a secure PayMongo checkout to pay via GCash.</p>
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
      </div>

      {/* Section 3 – Promo Code */}
      <div className="border border-gray-200 rounded-xl p-5">
        <p className="font-bold text-gray-800 text-base mb-3">Promo Code</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter promo code"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-orange-400"
          />
          <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
            Apply
          </button>
        </div>
      </div>

      {/* Buttons */}
      {saveError && (
        <p className="text-sm text-red-500 text-center">{saveError}</p>
      )}
      <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3 pt-1">
        <button
          onClick={onBack}
          disabled={saving}
          className="text-sm text-gray-400 hover:text-gray-600 underline disabled:opacity-50 text-center md:text-left"
        >
          ← Back
        </button>
        <button
          onClick={async () => {
            const paymentWindow = window.open('', '_blank')
            setSaving(true)
            setSaveError('')
            try {
              const { data: { session } } = await supabase.auth.getSession()
              const client_id = session?.user?.id ?? null

              // Fetch customer's own profile for name/phone (user reads their own row — no RLS block)
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

              // SQL to run in Supabase if not already done:
              // ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name text;
              // ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone text;

              // Save booking to Supabase first
              const { error } = await supabase.from('bookings').insert({
                client_id,
                tasker_id: tasker?.id,
                service,
                task_size: taskSize,
                task_description: taskDetails,
                address: taskAddress,
                scheduled_date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null,
                scheduled_time: time,
                payment_method: paymentMethod,
                status: 'pending_payment',
                reference_number: ref,
                ai_image_analysis: aiImageAnalysis ?? null,
                customer_name: customerName,
                customer_phone: customerPhone,
                task_options: taskOptions ? JSON.stringify(taskOptions) : null,
                taskers_needed: taskersNeeded,
                estimated_total: estimatedTotal,
                duration_hours: taskDuration ?? 8,
              })
              if (error) {
                paymentWindow.close()
                setSaveError(`Error saving booking: ${error.message}`)
                setSaving(false)
                return
              }

              // Store ref so we can retrieve it after redirect
              sessionStorage.setItem('pendingBookingRef', ref)

              // Create PayMongo payment link
              const pmResponse = await fetch('https://api.paymongo.com/v1/links', {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(import.meta.env.VITE_PAYMONGO_SECRET_KEY + ':')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  data: {
                    attributes: {
                      amount: Math.round(estimatedTotal * 100),
                      description: `hanap.ph booking - ${service}`,
                      remarks: ref,
                    },
                  },
                }),
              })
              const pmData = await pmResponse.json()
              if (!pmResponse.ok) {
                paymentWindow.close()
                const errMsg = pmData?.errors?.[0]?.detail || 'Payment setup failed. Please try again.'
                setSaveError(errMsg)
                setSaving(false)
                return
              }
              const checkoutUrl = pmData.data.attributes.checkout_url
              paymentWindow.location.href = checkoutUrl
              setSaving(false)
              setPaymentPending(true)
            } catch (err) {
              paymentWindow.close()
              setSaveError('Payment setup failed. Please try again.')
              setSaving(false)
            }
          }}
          disabled={saving || paymentPending}
          className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 disabled:opacity-70 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Creating payment link...
            </>
          ) : 'Confirm & Pay'}
        </button>

        {paymentPending && (
          <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-3">
            <p className="text-blue-800 font-semibold text-sm flex items-center justify-center gap-1"><CreditCard size={16} /> Complete your payment in the new tab.</p>
            <p className="text-blue-600 text-sm">Once done, click the button below to confirm your booking.</p>
            <button
              onClick={async () => {
                setVerifying(true)
                const ref = sessionStorage.getItem('pendingBookingRef')
                await supabase
                  .from('bookings')
                  .update({ status: 'confirmed' })
                  .eq('reference_number', ref)
                setBookingRef(ref)
                setConfirmed(true)
                sessionStorage.removeItem('pendingBookingRef')
              }}
              disabled={verifying}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2 mx-auto"
            >
              {verifying ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Confirming...
                </>
              ) : "I've completed my payment"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Booking() {
  const { service } = useParams()
  const [step, setStep] = useState(0)

  // Step 1 data
  const [taskAddress, setTaskAddress] = useState('')
  const [taskSize, setTaskSize] = useState('Medium')
  const [taskDetails, setTaskDetails] = useState('')
  const [aiImageAnalysis, setAiImageAnalysis] = useState(null)
  const [taskOptions, setTaskOptions] = useState(null)
  const [taskersNeeded, setTaskersNeeded] = useState(1)
  const [estimatedTotal, setEstimatedTotal] = useState(0)

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
        const { data: completedBookings } = await supabase
          .from('bookings')
          .select('tasker_id')
          .eq('status', 'completed')
        const taskCountMap = {}
        completedBookings?.forEach(b => {
          taskCountMap[b.tasker_id] = (taskCountMap[b.tasker_id] || 0) + 1
        })
        setTaskers(data.map((t) => ({
          id: t.id,
          name: t.name,
          role: t.role,
          rating: t.rating,
          reviews: t.reviews_count,
          tasks: taskCountMap[t.id] || 0,
          price: `₱${t.hourly_rate}/hr`,
          bio: t.bio,
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
    setTaskSize(data.size)
    setTaskDetails(data.details)
    setAiImageAnalysis(data.aiImageAnalysis)
    if (data.taskOptions) setTaskOptions(data.taskOptions)
    if (data.taskersNeeded) setTaskersNeeded(data.taskersNeeded)
    if (data.estimatedTotal) setEstimatedTotal(data.estimatedTotal)
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

        {step === 0 && <Step1 service={service} onContinue={handleStep1Continue} />}

        {step === 1 && (
          <Step2
            onSelect={handleOpenModal}
            onBack={() => setStep(0)}
            taskers={taskers}
            loadingTaskers={loadingTaskers}
            taskersError={taskersError}
            taskersNeeded={taskersNeeded}
            estimatedTotal={estimatedTotal}
            taskOptions={taskOptions}
          />
        )}

        {step === 2 && (
          <Step3
            service={service}
            tasker={selectedTasker}
            date={selectedDate}
            time={selectedTime}
            taskSize={taskSize}
            taskAddress={taskAddress}
            taskDetails={taskDetails}
            taskOptions={taskOptions}
            taskersNeeded={taskersNeeded}
            taskDuration={taskDuration}
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
            taskDetails={taskDetails}
            aiImageAnalysis={aiImageAnalysis}
            taskOptions={taskOptions}
            taskersNeeded={taskersNeeded}
            taskDuration={taskDuration}
            estimatedTotal={estimatedTotal}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  )
}

export default Booking
