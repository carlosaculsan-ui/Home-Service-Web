import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Navbar from '../Components/Navbar'
import backgroundImg from '../Assets/Background.jpg'
import LocationMap from '../Components/LocationMap'

const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700',
  confirmed:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
}

const NEXT_STATUSES = {
  pending:     ['confirmed'],
  confirmed:   ['in_progress'],
  in_progress: ['completed'],
}

function TaskCard({ booking, onStatusChange }) {
  const [updating, setUpdating] = useState(false)
  const statusLabel = booking.status?.replace('_', ' ') ?? 'pending'
  const statusClass = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending
  const nextStatuses = NEXT_STATUSES[booking.status] ?? []

  async function handleChange(e) {
    const newStatus = e.target.value
    if (!newStatus) return
    setUpdating(true)
    await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id)
    setUpdating(false)
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

      {booking.address && (
        <LocationMap address={booking.address} />
      )}

      {nextStatuses.length > 0 && (
        <div className="pt-1">
          <select
            key={booking.status}
            disabled={updating}
            defaultValue=""
            onChange={handleChange}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-orange-400 disabled:opacity-50"
          >
            <option value="" disabled>Update status…</option>
            {nextStatuses.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
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
      </div>
    </div>
  )
}

export default TaskerDashboard
