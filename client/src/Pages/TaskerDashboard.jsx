import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Navbar from '../Components/Navbar'
import backgroundImg from '../Assets/Background.jpg'
import LocationMap from '../Components/LocationMap'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const LEAVE_STATUS_STYLES = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700',
  confirmed:   'bg-blue-100 text-blue-700',
  accepted:    'bg-green-100 text-green-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-600',
  cancelled:   'bg-red-100 text-red-600',
}

const FORWARD_STATUSES = ['accepted', 'in_progress', 'completed']

function TaskCard({ booking, onStatusChange }) {
  const [updating, setUpdating] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // 'accepted' | 'rejected' | null
  const statusLabel = booking.status?.replace('_', ' ') ?? 'pending'
  const statusClass = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending
  const currentIdx = FORWARD_STATUSES.indexOf(booking.status)

  async function handleChange(e) {
    const newStatus = e.target.value
    if (!newStatus) return
    setUpdating(true)
    await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id)
    setUpdating(false)
    onStatusChange()
  }

  async function handleAction(newStatus) {
    setActionLoading(newStatus)
    await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id)
    setActionLoading(null)
    onStatusChange()
  }

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
          ['Date & Time', booking.scheduled_date
            ? `${booking.scheduled_date}${booking.scheduled_time ? ' at ' + booking.scheduled_time : ''}`
            : '—'],
          ['Task Size',   booking.task_size ?? '—'],
          ['Address',     booking.address ?? '—'],
          ['Reference',   booking.reference_number ?? '—'],
          ['Customer',    booking.customerEmail ?? '—'],
        ].map(([label, val]) => (
          <div key={label} className="flex gap-2">
            <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
            <span className="text-gray-700">{val}</span>
          </div>
        ))}
      </div>

      {booking.task_description && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-gray-400 font-medium">Task Description: </span>{booking.task_description}
        </div>
      )}

      {booking.ai_image_analysis && (
        <div className="text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-800">
          <span className="font-semibold">🤖 AI Analysis: </span>{booking.ai_image_analysis}
        </div>
      )}

      {booking.address && (
        <LocationMap address={booking.address} />
      )}

      {booking.status === 'confirmed' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => handleAction('accepted')}
            disabled={actionLoading !== null}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
          >
            {actionLoading === 'accepted' ? 'Accepting…' : 'Accept'}
          </button>
          <button
            onClick={() => handleAction('rejected')}
            disabled={actionLoading !== null}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
          >
            {actionLoading === 'rejected' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      )}

      {currentIdx !== -1 && (
        <div className="pt-1">
          <select
            key={booking.status}
            disabled={updating}
            value={booking.status}
            onChange={handleChange}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-orange-400 disabled:opacity-50"
          >
            {FORWARD_STATUSES.map((s, idx) => (
              <option key={s} value={s} disabled={idx < currentIdx}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      )}

      {booking.status === 'completed' && (
        <span className="inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
          Completed
        </span>
      )}

      {booking.status === 'rejected' && (
        <span className="inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-600">
          Rejected
        </span>
      )}
    </div>
  )
}

function LeaveRequestSection({ taskerId }) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [selectedDates, setSelectedDates] = useState(new Set())
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [leaves, setLeaves] = useState([])
  const [leavesLoading, setLeavesLoading] = useState(true)

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
    setSubmitting(true)
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
    <div className="mt-12">
      <h2 className="text-2xl font-extrabold text-white text-center mb-6 drop-shadow">Leave Requests</h2>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
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
            {selectedDates.size} date{selectedDates.size > 1 ? 's' : ''} selected: {[...selectedDates].sort().join(', ')}
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
      </div>

      {leavesLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leaves.length === 0 ? (
        <p className="text-center text-white/70 text-sm">No leave requests yet.</p>
      ) : (
        <div className="space-y-3">
          {leaves.map((leave) => {
            const dates = (() => { try { return JSON.parse(leave.leave_dates) } catch { return [] } })()
            const statusClass = LEAVE_STATUS_STYLES[leave.status] ?? 'bg-gray-100 text-gray-600'
            return (
              <div key={leave.id} className="bg-white rounded-2xl shadow-md p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    {dates.length} day{dates.length !== 1 ? 's' : ''}: {dates.join(', ')}
                  </p>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusClass}`}>
                    {leave.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{leave.reason}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TaskerDashboard() {
  const [bookings, setBookings] = useState([])
  const [taskerId, setTaskerId] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load(tid) {
    console.log('load() called with tasker_id:', tid)
    const { data: bookingRows, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('tasker_id', tid)
      .order('created_at', { ascending: false })

    console.log('bookingRows:', bookingRows)
    console.log('bookingError:', bookingError)

    if (!bookingRows || bookingRows.length === 0) {
      setBookings([])
      return
    }

    const clientIds = [...new Set(bookingRows.map((b) => b.client_id).filter(Boolean))]
    let emailMap = {}
    if (clientIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', clientIds)
      profiles?.forEach((p) => { emailMap[p.id] = p.email })
    }

    setBookings(bookingRows.map((b) => ({ ...b, customerEmail: emailMap[b.client_id] ?? '—' })))
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      console.log('session user id:', session.user.id)

      const { data: tasker, error: taskerError } = await supabase
        .from('taskers')
        .select('id, name, user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      console.log('tasker row:', tasker)
      console.log('tasker error:', taskerError)

      if (!tasker) return

      setTaskerId(tasker.id)
      await load(tasker.id)
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
        <h1 className="text-3xl font-extrabold text-white text-center mb-8 drop-shadow">My Tasks</h1>

        {loading ? (
          <div className="flex justify-center mt-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-white text-lg font-medium">No tasks assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <TaskCard key={booking.id} booking={booking} onStatusChange={() => load(taskerId)} />
            ))}
          </div>
        )}

        {!loading && taskerId && <LeaveRequestSection taskerId={taskerId} />}
      </div>
    </div>
  )
}

export default TaskerDashboard
