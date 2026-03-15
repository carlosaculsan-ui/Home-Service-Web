import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import backgroundImg from '../Assets/Background.jpg'
import { supabase } from '../supabase'
import LocationMap from '../Components/LocationMap'
import Groq from 'groq-sdk'

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

function formatReviews(n) {
  if (n >= 1000000000) return (n / 1000000000).toFixed(0) + 'B'
  if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

function generateTimeOptions() {
  const options = []
  for (let h = 6; h <= 17; h++) {
    const suffix = h < 12 ? 'AM' : 'PM'
    const hour = h === 12 ? 12 : h <= 12 ? h : h - 12
    options.push(`${hour}:00 ${suffix}`)
  }
  return options
}

function getDefaultTime() {
  const now = new Date()
  let h = now.getHours() + 1
  if (h > 17) h = 17
  if (h < 6) h = 6
  const suffix = h < 12 ? 'AM' : 'PM'
  const hour = h === 12 ? 12 : h <= 12 ? h : h - 12
  return `${hour}:00 ${suffix}`
}

function ScheduleModal({ tasker, onClose, onConfirm }) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(getDefaultTime())
  const [bookedDates, setBookedDates] = useState(new Set())

  useEffect(() => {
    async function fetchBookedDates() {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      }

      const [bookingsRes, leavesRes] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/bookings?tasker_id=eq.${tasker.id}&status=in.(accepted,in_progress)&select=scheduled_date`,
          { headers }
        ),
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tasker_leaves?tasker_id=eq.${tasker.id}&status=eq.approved&select=leave_dates`,
          { headers }
        ),
      ])

      const [bookingsData, leavesData] = await Promise.all([bookingsRes.json(), leavesRes.json()])

      const dateSet = new Set()

      if (Array.isArray(bookingsData)) {
        bookingsData
          .filter((r) => r.scheduled_date)
          .forEach((r) => dateSet.add(r.scheduled_date.slice(0, 10)))
      }

      if (Array.isArray(leavesData)) {
        leavesData.forEach((r) => {
          try {
            const dates = JSON.parse(r.leave_dates)
            if (Array.isArray(dates)) dates.forEach((d) => dateSet.add(d.slice(0, 10)))
          } catch { /* skip malformed rows */ }
        })
      }

      setBookedDates(dateSet)
    }
    fetchBookedDates()
  }, [tasker.id])

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const timeOptions = generateTimeOptions()

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const getDateObj = (d) => new Date(viewYear, viewMonth, d)
  const isPast = (d) => getDateObj(d) < todayStart
  const isToday = (d) => getDateObj(d).getTime() === todayStart.getTime()
  const isBooked = (d) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return bookedDates.has(`${viewYear}-${mm}-${dd}`)
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
    if (!d || isPast(d) || isBooked(d)) return
    setSelectedDate(getDateObj(d))
  }

  const formatSummaryDate = () => {
    if (!selectedDate) return '—'
    return `${SHORT_MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedTime.toLowerCase()}`
  }

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
          <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xl text-gray-400">
            👤
          </div>
          <h2 className="text-base font-bold text-gray-800">{tasker.name}'s Availability</h2>
        </div>

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
                  disabled={isPast(d) || isBooked(d)}
                  className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors
                    ${isSelected(d)
                      ? 'bg-orange-500 text-white font-bold'
                      : isBooked(d)
                      ? 'bg-red-500 text-white cursor-not-allowed'
                      : isToday(d)
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

        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none mb-3 focus:border-orange-400"
        >
          {timeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <p className="text-xs text-gray-400 mb-4">
          Choose your task date and start time. You can chat to adjust task details or change start time after confirming.
        </p>

        <div className="border-t border-gray-100 mb-3" />

        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">Request for:</span>
          <span className="text-sm font-semibold text-gray-700">{formatSummaryDate()}</span>
        </div>
        <p className="text-right text-sm font-bold text-gray-800 mb-5">This Tasker requires 2 hour min</p>

        <button
          onClick={() => { if (selectedDate) onConfirm(tasker, selectedDate, selectedTime) }}
          disabled={!selectedDate}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-base"
        >
          Select &amp; Continue
        </button>
      </div>
    </div>
  )
}

function TaskerCard({ tasker, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const bio = tasker.bio ?? ''
  const shortBio = bio.length > 90 ? bio.slice(0, 90) + '...' : bio

  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-2xl text-gray-400">
          👤
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-gray-800 text-base leading-tight">{tasker.name}</p>
            <span className="text-orange-500 font-bold text-sm whitespace-nowrap">{tasker.price}</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">{tasker.role}</p>
          <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
            2 HOUR MINIMUM
          </span>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <span className="text-yellow-500">★</span>
            <span className="font-semibold">{(tasker.rating ?? 0).toFixed(1)}</span>
            <span className="text-gray-400">({formatReviews(tasker.reviews ?? 0)} reviews)</span>
            <span className="text-gray-300">•</span>
            <span>{(tasker.tasks ?? 0).toLocaleString()} tasks</span>
          </div>
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

      <button
        onClick={() => onSelect(tasker)}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors text-base"
      >
        Select &amp; Continue
      </button>

      <div className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
        <span className="text-base mt-0.5">📋</span>
        <p className="text-xs text-gray-500">
          Next, confirm your details to get connected with your Tasker.
        </p>
      </div>
    </div>
  )
}

function Step2({ onSelect, onBack, taskers, loadingTaskers, taskersError }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <span className="text-2xl">👥</span>
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
          <TaskerCard key={tasker.name} tasker={tasker} onSelect={onSelect} />
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

function Step3({ service, tasker, date, time, taskSize, taskAddress, taskDetails, onBack, onContinue }) {
  const navigate = useNavigate()

  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

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
    setFormSaving(true)
    setFormError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: formName.trim(), phone: formPhone.trim() })
      .eq('id', user.id)
    if (error) {
      setFormError('Failed to save. Please try again.')
      setFormSaving(false)
      return
    }
    setUserProfile((prev) => ({ ...prev, full_name: formName.trim(), phone: formPhone.trim() }))
    setShowInlineForm(false)
    setFormSaving(false)
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
        <span className="text-2xl">📅</span>
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
        <DetailRow label="Task Size" value={taskSize} />
        <DetailRow label="Address" value={taskAddress} />
        <DetailRow label="Task Description" value={taskDetails} />
      </div>

      {/* Section 3 – Tasker Information */}
      <div className="border border-gray-200 rounded-xl p-5">
        <p className="font-bold text-gray-800 text-base mb-4">Your Tasker</p>
        <div className="flex gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-2xl text-gray-400">
            👤
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
            ✏️
          </button>
        </div>

        {profileLoading ? (
          <p className="text-sm text-gray-400">Loading your profile...</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>👤</span>
                <span className="text-gray-400">Name:</span>
                {userProfile?.full_name
                  ? <span>{userProfile.full_name}</span>
                  : <span className="italic text-red-400">Not set</span>}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>📞</span>
                <span className="text-gray-400">Phone:</span>
                {userProfile?.phone
                  ? <span>{userProfile.phone}</span>
                  : <span className="italic text-red-400">Not set</span>}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>📧</span>
                <span className="text-gray-400">Email:</span>
                <span>{userProfile?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>📍</span>
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
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 09171234567"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400"
                  />
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
        <span className="text-lg">ℹ️</span>
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
          {STEPS.map((s, i) => (
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

function Step1({ onContinue }) {
  const [address, setAddress] = useState('')
  const [size, setSize] = useState('Medium')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')

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
    setError('')
    onContinue(address.trim(), size, details.trim(), aiResult && aiResult !== 'error' ? aiResult : null)
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-gray-800 text-base">Your task location</span>
          <span className="text-gray-400 cursor-pointer text-lg">✏️</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl">📍</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your address"
            className="flex-1 text-base text-gray-700 outline-none placeholder-gray-400"
          />
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detectingLocation}
            className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
          >
            {detectingLocation ? (
              <span className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
            ) : '📍'}
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

      <div className="border border-gray-200 rounded-xl p-5">
        <p className="font-bold text-gray-800 mb-2 text-base">Task options</p>
        <p className="font-semibold text-gray-700 text-base mb-3">How big is your task?</p>
        <div className="space-y-3">
          {[
            { value: 'Small', label: 'Small', sub: 'Est. 1 hr' },
            { value: 'Medium', label: 'Medium', sub: 'Est. 2-3 hrs' },
            { value: 'Large', label: 'Large', sub: 'Est. 4+ hrs' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="size"
                value={opt.value}
                checked={size === opt.value}
                onChange={() => setSize(opt.value)}
                className="accent-orange-500 w-5 h-5"
              />
              <span className="text-base text-gray-700">
                <span className="font-medium">{opt.label}</span>
                <span className="text-gray-400 ml-1">- {opt.sub}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

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

function Step4({ service, tasker, date, time, taskSize, taskAddress, taskDetails, aiImageAnalysis, onBack }) {
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
  const estimatedTotal = rate * (taskSize === 'Small' ? 1 : taskSize === 'Large' ? 4 : 2)
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
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl">
          ✅
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
          <span className="text-xl">📋</span>
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
              <span className="text-lg">💙</span>
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
              <span className="text-lg">💳</span>
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
            setSaving(true)
            setSaveError('')
            try {
              const { data: { session } } = await supabase.auth.getSession()
              const client_id = session?.user?.id ?? null
              const ref = 'VE-' + Date.now()

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
                estimated_total: estimatedTotal,
                status: 'pending_payment',
                reference_number: ref,
                ai_image_analysis: aiImageAnalysis ?? null,
              })
              if (error) {
                setSaveError(`Error saving booking: ${error.message}`)
                setSaving(false)
                return
              }

              // Store ref so we can retrieve it after redirect
              sessionStorage.setItem('pendingBookingRef', ref)

              // Create PayMongo payment link
              const successUrl = `${window.location.origin}${window.location.pathname}?payment=success&ref=${ref}`
              const failedUrl = `${window.location.origin}${window.location.pathname}?payment=failed`
              const pmResponse = await fetch('https://api.paymongo.com/v1/links', {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(import.meta.env.VITE_PAYMONGO_SECRET_KEY + ':')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  data: {
                    attributes: {
                      amount: estimatedTotal * 100,
                      description: `hanap.ph booking - ${service}`,
                      remarks: ref,
                    },
                  },
                }),
              })
              const pmData = await pmResponse.json()
              if (!pmResponse.ok) {
                const errMsg = pmData?.errors?.[0]?.detail || 'Payment setup failed. Please try again.'
                setSaveError(errMsg)
                setSaving(false)
                return
              }
              const checkoutUrl = pmData.data.attributes.checkout_url
              window.open(checkoutUrl, '_blank')
              setSaving(false)
              setPaymentPending(true)
            } catch (err) {
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
            <p className="text-blue-800 font-semibold text-sm">💳 Complete your payment in the new tab.</p>
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

  const handleStep1Continue = (address, size, details, aiResult) => {
    setTaskAddress(address)
    setTaskSize(size)
    setTaskDetails(details)
    setAiImageAnalysis(aiResult)
    setStep(1)
  }

  const handleOpenModal = (tasker) => setModalTasker(tasker)
  const handleCloseModal = () => setModalTasker(null)

  const handleScheduleConfirm = (tasker, date, time) => {
    setSelectedTasker(tasker)
    setSelectedDate(date)
    setSelectedTime(time)
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
              <span className="text-base font-bold text-orange-500 tracking-wide">🏠 hanap.ph</span>
            </Link>
            <p className="text-sm text-gray-400 capitalize">{service}</p>
          </div>
          <ProgressTracker step={step} />
        </div>

        {step === 0 && <Step1 onContinue={handleStep1Continue} />}

        {step === 1 && (
          <Step2
            onSelect={handleOpenModal}
            onBack={() => setStep(0)}
            taskers={taskers}
            loadingTaskers={loadingTaskers}
            taskersError={taskersError}
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
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  )
}

export default Booking
