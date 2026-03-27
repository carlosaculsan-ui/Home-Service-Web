import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import LocationMap from '../Components/LocationMap'
import {
  Phone, Bot, Car, Wrench, CheckCircle2,
  CalendarCheck, CalendarOff, Wallet, Star, UserCog, History,
  LogOut, Menu, X,
} from 'lucide-react'
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
  confirmed:   'bg-blue-100 text-blue-700',
  accepted:    'bg-green-100 text-green-700',
  on_the_way:  'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-600',
  cancelled:   'bg-gray-100 text-gray-500',
}

const NAV_ITEMS = [
  { key: 'bookings',       label: 'Bookings',                     icon: CalendarCheck },
  { key: 'leave',          label: 'Leave Request',                icon: CalendarOff },
  { key: 'earnings',       label: 'Earnings Summary',             icon: Wallet },
  { key: 'reviews',        label: 'Reviews',                      icon: Star },
  { key: 'profile',        label: 'Profile Management',           icon: UserCog },
  { key: 'history',        label: 'Booking History',              icon: History },
]

const getTaskLabel = (booking) => {
  const opts = booking.task_options
  if (!opts) return booking.task_size || 'N/A'
  return opts.type || opts.problem || opts.what_to_paint || opts.aircon_type || opts.service_type || booking.task_size || 'N/A'
}

// ─── Task Card ──────────────────────────────────────────────────────────────

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
    const updatePayload = { status: newStatus }
    if (newStatus === 'completed' && booking.estimated_total != null) {
      updatePayload.platform_fee = booking.estimated_total * 0.15
      updatePayload.tasker_payout = booking.estimated_total * 0.85
    }
    const { error } = await supabase.from('bookings').update(updatePayload).eq('id', booking.id)
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

// ─── Leave Request Section ───────────────────────────────────────────────────

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

function TaskerSidebar({ tab, setTab, taskerName, taskerEmail, onLogout, onClose }) {
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
        {(taskerName || taskerEmail) && (
          <div className="px-4 mb-2">
            {taskerName && <p className="text-white text-xs font-semibold truncate">{taskerName}</p>}
            {taskerEmail && <p className="text-orange-200 text-xs truncate">{taskerEmail}</p>}
          </div>
        )}
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

function EarningsSummary({ taskerId }) {
  const [completedBookings, setCompletedBookings] = useState([])
  const [earningsLoading, setEarningsLoading] = useState(true)

  useEffect(() => {
    async function fetchEarnings() {
      const { data } = await supabase
        .from('bookings')
        .select('id, scheduled_date, customer_name, service, duration_hours, estimated_total, tasker_payout')
        .eq('tasker_id', taskerId)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })
      setCompletedBookings(data ?? [])
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

  // ── Last 6 months chart data ───────────────────────────────────────────────
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const yr = d.getFullYear()
    const mo = d.getMonth()
    const total = completedBookings
      .filter((b) => {
        if (!b.scheduled_date) return false
        const bd = new Date(b.scheduled_date)
        return bd.getFullYear() === yr && bd.getMonth() === mo
      })
      .reduce((sum, b) => sum + (b.tasker_payout ?? 0), 0)
    return { month: SHORT_MONTHS[mo], total }
  })

  return (
    <div className="space-y-6">

      {/* Section 1 — Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Earned',    value: PHP(totalEarned) },
          { label: 'This Month',      value: PHP(thisMonth) },
          { label: 'Completed Jobs',  value: completedCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-extrabold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Section 2 — Bar Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Monthly Earnings (Last 6 Months)</h3>
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
          <h3 className="font-bold text-gray-800">Completed Bookings Breakdown</h3>
        </div>
        {completedBookings.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">No completed bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                  <th className="text-left px-5 py-3 font-semibold">Customer</th>
                  <th className="text-left px-5 py-3 font-semibold">Service</th>
                  <th className="text-right px-5 py-3 font-semibold">Duration</th>
                  <th className="text-right px-5 py-3 font-semibold">Amount Paid</th>
                  <th className="text-right px-5 py-3 font-semibold">Your Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{b.scheduled_date ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-700 font-medium">{b.customer_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{b.service ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600 text-right whitespace-nowrap">
                      {b.duration_hours != null ? `${b.duration_hours} hr${b.duration_hours !== 1 ? 's' : ''}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-700 text-right whitespace-nowrap">{PHP(b.estimated_total)}</td>
                    <td className="px-5 py-3 font-semibold text-orange-600 text-right whitespace-nowrap">{PHP(b.tasker_payout)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
        .select('id, rating, comment, images, is_flagged, is_hidden, created_at, customer_id')
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
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(null)
  const [reviewCount, setReviewCount] = useState(0)

  useEffect(() => {
    async function fetchProfile() {
      // Same query as Admin Applicants tab — select('*') from taskers, filtered to this user
      const { data: tasker } = await supabase
        .from('taskers')
        .select('*')
        .eq('user_id', taskerUserId)
        .maybeSingle()

      // Fetch full_name from profiles (same column used across the app)
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', taskerUserId)
        .maybeSingle()

      // Fetch reviews for avg rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('tasker_id', taskerId)

      const ratingList = (reviews ?? []).map((r) => r.rating ?? 0)
      setReviewCount(ratingList.length)
      setAvgRating(ratingList.length > 0 ? ratingList.reduce((s, v) => s + v, 0) / ratingList.length : null)

      setProfile({ ...(tasker ?? {}), full_name: prof?.full_name ?? null })
      setProfileLoading(false)
    }
    fetchProfile()
  }, [taskerId, taskerUserId])

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

  const arrayOrString = (val) =>
    Array.isArray(val) ? val.join(', ') : (val || 'Not provided')

  // Resolve profile photo URL from Supabase storage if it's a path (not a full URL)
  const photoUrl = profile.profile_photo
    ? profile.profile_photo.startsWith('http')
      ? profile.profile_photo
      : supabase.storage.from('tasker-files').getPublicUrl(profile.profile_photo).data.publicUrl
    : null

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Section 1 — Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center text-center gap-3">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={fullName}
            className="w-28 h-28 rounded-full object-cover border-4 border-orange-100"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-3xl font-bold text-orange-400">
              {(profile.first_name?.[0] ?? '?').toUpperCase()}
            </span>
          </div>
        )}

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
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-4">Personal Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="Age"         value={profile.age} />
          <InfoField label="Gender"      value={profile.gender} />
          <InfoField label="Email"       value={profile.email} />
          <InfoField label="Phone"       value={profile.phone} />
          <InfoField label="Address"     value={profile.address} />
          <InfoField label="Postal Code" value={profile.postal_code} />
        </div>
      </div>

      {/* Section 3 — Work Information */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-4">Work Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="Working Hours" value={arrayOrString(profile.working_hours)} />
          <InfoField label="Availability"  value={arrayOrString(profile.availability)} />
          <div className="col-span-1 sm:col-span-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Bio</p>
            <p className="text-sm text-gray-800 leading-relaxed">{profile.bio || 'Not provided'}</p>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Placeholder Tab ─────────────────────────────────────────────────────────

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">This section is under construction.</p>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function TaskerDashboard() {
  const [tab, setTab] = useState('bookings')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bookings, setBookings] = useState([])
  const [taskerId, setTaskerId] = useState(null)
  const [taskerUserId, setTaskerUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [taskerName, setTaskerName] = useState('')
  const [taskerEmail, setTaskerEmail] = useState('')
  const navigate = useNavigate()

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
      } catch (err) {
        console.error('TaskerDashboard init error:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const activeLabel = NAV_ITEMS.find((n) => n.key === tab)?.label ?? 'Dashboard'

  return (
    <div className="flex min-h-screen">

      {/* Desktop sidebar — fixed */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-30 overflow-y-auto">
        <TaskerSidebar
          tab={tab}
          setTab={setTab}
          taskerName={taskerName}
          taskerEmail={taskerEmail}
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
            <TaskerSidebar
              tab={tab}
              setTab={setTab}
              taskerName={taskerName}
              taskerEmail={taskerEmail}
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
          <p className="font-semibold text-gray-800 text-sm">{activeLabel}</p>
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
                <div className="text-center mt-20">
                  <p className="text-gray-400 text-lg font-medium">No tasks assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <TaskCard key={booking.id} booking={booking} onStatusChange={() => load(taskerId)} />
                  ))}
                </div>
              )}
            </>
          )}

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
                <EarningsSummary taskerId={taskerId} />
              ) : (
                <p className="text-center text-gray-400 mt-20">Tasker profile not found.</p>
              )}
            </>
          )}

          {tab === 'reviews' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Reviews</h2>
              {loading ? (
                <div className="flex justify-center mt-20">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : taskerId ? (
                <TaskerReviews taskerId={taskerId} />
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
              <ComingSoon />
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default TaskerDashboard
