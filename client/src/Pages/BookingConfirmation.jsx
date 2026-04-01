import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { CheckCircle2 } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function BookingConfirmation() {
  const navigate = useNavigate()
  const hasSaved = useRef(false)
  const [status, setStatus] = useState('loading')
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    if (hasSaved.current) return
    hasSaved.current = true

    async function confirm() {
      const params = new URLSearchParams(window.location.search)
      const piId = params.get('payment_intent_id')
      if (!piId) { setStatus('failed'); return }

      const piRes = await fetch(`https://api.paymongo.com/v1/payment_intents/${piId}`, {
        headers: { Authorization: 'Basic ' + btoa(import.meta.env.VITE_PAYMONGO_SECRET_KEY + ':') }
      })
      const piData = await piRes.json()
      const piStatus = piData?.data?.attributes?.status

      if (piStatus !== 'succeeded') { setStatus('failed'); return }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setStatus('failed'); return }

      const { data: bookingRow } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', session.user.id)
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!bookingRow) { setStatus('failed'); return }

      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingRow.id)
      setBooking(bookingRow)
      setStatus('confirmed')
    }

    confirm()
  }, [])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin h-10 w-10 text-orange-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <p className="text-gray-500 text-sm">Verifying your payment...</p>
      </div>
    </div>
  )

  if (status === 'failed') return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-xl font-bold text-gray-800">Payment Failed</p>
        <p className="text-sm text-gray-500">Something went wrong. Please try again.</p>
        <button onClick={() => navigate('/')} className="bg-orange-500 text-white font-semibold px-6 py-3 rounded-xl">Go Home</button>
      </div>
    </div>
  )

  const [year, month, day] = (booking?.scheduled_date || '').split('-').map(Number)
  const formattedDate = booking?.scheduled_date
    ? `${MONTHS[month - 1]} ${day}, ${year} at ${booking.scheduled_time}`
    : ''

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-5">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={44} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">Booking Confirmed!</p>
          <p className="text-sm text-gray-500">Thank you for booking with hanap.ph! Your tasker has been notified.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-3">
            <p className="text-xs text-gray-400 mb-1">Booking Reference</p>
            <p className="text-lg font-bold text-orange-500 tracking-widest">{booking?.reference_number}</p>
          </div>
        </div>
        <div className="border border-gray-100 rounded-xl p-5 space-y-2">
          <p className="font-semibold text-gray-700 text-sm mb-3">Order Summary</p>
          {[
            ['Service', booking?.service],
            ['Date & Time', formattedDate],
            ['Address', booking?.address],
            ['Estimated Total', `₱${booking?.estimated_total?.toLocaleString()}`],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-3 text-sm border-b border-gray-50 pb-2 last:border-0">
              <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
              <span className="text-gray-800">{val}</span>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
          Back to Home
        </button>
      </div>
    </div>
  )
}
