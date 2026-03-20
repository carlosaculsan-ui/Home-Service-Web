import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Navbar from '../Components/Navbar'
import backgroundImg from '../Assets/Background.jpg'
import LocationMap from '../Components/LocationMap'
import { Phone, Bot, Car, Wrench, CheckCircle2 } from 'lucide-react'

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
  on_the_way:  'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-600',
  cancelled:   'bg-gray-100 text-gray-500',
}

const getTaskLabel = (booking) => {
  const opts = booking.task_options
  if (!opts) return booking.task_size || 'N/A'
  return opts.type || opts.problem || opts.what_to_paint || opts.aircon_type || opts.service_type || booking.task_size || 'N/A'
}

function TaskCard({ booking, onStatusChange }) {
  const [actionLoading, setActionLoading] = useState(null)
  const [statusError, setStatusError] = useState('')
  const statusLabel = booking.status?.replace('_', ' ') ?? 'pending'
  const statusClass = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending

  async function handleAction(newStatus) {
    if (newStatus === 'completed') {
      if (!window.confirm('Mark this job as complete? The customer will be notified to leave a review.')) return
    }
    setActionLoading(newStatus)
    setStatusError('')
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id)
    setActionLoading(null)
    if (error) {
      setStatusError('Failed to update status. Try again.')
      return
    }
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
          ['Task Size',   getTaskLabel(booking)],
          ['Address',     booking.address ?? '—'],
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

        {/* Phone — visible only after acceptance */}
        <div className="flex gap-2">
          <span className="text-gray-400 w-28 flex-shrink-0">Phone</span>
          {['accepted', 'on_the_way', 'in_progress', 'completed'].includes(booking.status) ? (
            booking.customer_phone
              ? <a href={`tel:${booking.customer_phone}`} className="text-orange-500 underline font-medium flex items-center gap-1"><Phone size={14} />{booking.customer_phone}</a>
              : <span className="text-gray-700">Not provided</span>
          ) : (
            <span className="text-gray-400 italic text-xs self-center">Available after acceptance</span>
          )}
        </div>
      </div>

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

      {booking.address && (
        <LocationMap address={booking.address} />
      )}

      {/* Accept / Reject — confirmed only */}
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

      {statusError && (
        <p className="text-xs text-red-500">{statusError}</p>
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
        {submitError && (
          <p className="text-xs text-red-500 mt-2">{submitError}</p>
        )}
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

function TaskerDashboard() {
  const [bookings, setBookings] = useState([])
  const [taskerId, setTaskerId] = useState(null)
  const [loading, setLoading] = useState(true)

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
        console.log('session user id:', session.user.id)

        const { data: tasker, error: taskerError } = await supabase
          .from('taskers')
          .select('id, name, user_id')
          .eq('user_id', session.user.id)
          .maybeSingle()

        console.log('tasker row:', tasker, 'tasker error:', taskerError)

        if (!tasker) { setLoading(false); return }

        setTaskerId(tasker.id)
        await load(tasker.id)
      } catch (err) {
        console.error('TaskerDashboard init error:', err)
      } finally {
        setLoading(false)
      }
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
