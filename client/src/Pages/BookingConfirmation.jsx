import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { CheckCircle2, Wallet } from 'lucide-react'
import { toPng } from 'html-to-image'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmtDate(dateStr, timeStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  const base = `${MONTHS[m - 1]} ${d}, ${y}`
  if (!timeStr) return base
  const [h, min] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  const minutes = min === 0 ? '' : `:${String(min).padStart(2, '0')}`
  return `${base} at ${hour}${minutes} ${ampm}`
}

function fmtNow() {
  const now = new Date()
  const m = now.getMonth()
  const d = now.getDate()
  const y = now.getFullYear()
  let h = now.getHours()
  const min = now.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const minutes = min === 0 ? '' : `:${String(min).padStart(2, '0')}`
  return `${MONTHS[m]} ${d}, ${y} at ${h}${minutes} ${ampm}`
}

function capitalize(str) {
  if (!str) return '—'
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function fmtPaymentMethod(method) {
  if (!method) return '—'
  if (method === 'gcash') return 'GCash'
  if (method === 'paymaya') return 'PayMaya'
  if (method === 'card') return 'Credit/Debit Card'
  return capitalize(method)
}

function maskPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return phone
  const visible = digits.slice(0, 2) + '*'.repeat(digits.length - 5) + digits.slice(-3)
  return phone.startsWith('+') ? '+' + visible : visible
}

const EXTRAS_LOOKUP = {
  'Cleaning':           { 'With Laundry': 200, 'With Appliances': 250 },
  'Carpentry':          { 'Materials Included': 500, 'Varnishing / Finishing': 350, 'Hauling / Debris Removal': 200 },
  'Electrical':         { 'Materials Included': 400, 'Additional Outlet/Switch': 300, 'Circuit Breaker Check': 250 },
  'Aircon Maintenance': { 'Same Day Service': 300 },
  'Painting':           { 'Primer Coat': 400, 'Two Coats': 500, 'Wall Putty / Patching': 300 },
  'Plumbing Repair':    { 'Materials Included': 400, 'Multiple Points (2+ faucets/drains)': 300, 'Waterproofing': 500 },
}

function buildPriceBreakdown(taskOptions, helperFee, helperCount) {
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
  } else if (service === 'Aircon Maintenance') {
    const u = taskOptions.units || 1
    lines.push({ label: `${taskOptions.aircon_type} × ${u} unit${u > 1 ? 's' : ''} (${taskOptions.service_type})`, price: combinedBase })
  } else if (service === 'Painting') {
    lines.push({ label: `${taskOptions.what_to_paint} Painting (${taskOptions.area})`, price: combinedBase })
    if (taskOptions.paint_cost > 0) {
      lines.push({ label: 'Paint (by Tasker)', price: taskOptions.paint_cost })
    }
  } else if (service === 'Plumbing Repair') {
    lines.push({ label: taskOptions.sub_option ? `${taskOptions.problem} — ${taskOptions.sub_option}` : taskOptions.problem, price: combinedBase })
    if ((taskOptions.urgency_surcharge ?? 0) > 0) {
      lines.push({ label: 'Urgency (Urgent)', price: taskOptions.urgency_surcharge })
    }
  }

  if (helperFee > 0 && helperCount > 0) {
    lines.push({ label: `Helpers: ${helperCount} helper${helperCount > 1 ? 's' : ''} assigned`, price: null, isHelperInfo: true })
  }

  const extrasMap = EXTRAS_LOOKUP[service] || {}
  ;(taskOptions.extras || []).forEach((extra) => {
    const p = service === 'Aircon Maintenance' && extra === 'Freon Recharge'
      ? 500 * (taskOptions.units || 1)
      : (extrasMap[extra] ?? 0)
    lines.push({ label: extra, price: p, isExtra: true })
  })

  return lines
}

export default function BookingConfirmation() {
  const navigate = useNavigate()
  const hasSaved = useRef(false)
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'failed'
  const [booking, setBooking] = useState(null)
  const [taskerName, setTaskerName] = useState('—')
  const [receiptDate] = useState(fmtNow())
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadReceipt() {
    setDownloading(true)
    const node = document.getElementById('receipt-content')
    toPng(node, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `Hanap-Receipt-${booking?.reference_number ?? 'receipt'}.png`
        link.click()
        URL.revokeObjectURL(dataUrl)
      })
      .catch((err) => {
        console.error('Download receipt failed:', err)
      })
      .finally(() => {
        setDownloading(false)
      })
  }

  useEffect(() => {
    if (hasSaved.current) return
    hasSaved.current = true

    async function confirm() {
      const params = new URLSearchParams(window.location.search)

      // ── Wallet payment path ───────────────────────────────────────────────────
      const isWalletPayment = params.get('wallet_payment') === 'true'
      const bookingRef = params.get('booking_ref')
      if (isWalletPayment) {
        try {
          if (!bookingRef) { setStatus('failed'); return }
          const { data: bookingRow, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('reference_number', bookingRef)
            .eq('status', 'confirmed')
            .single()
          if (error || !bookingRow) { setStatus('failed'); return }
          if (bookingRow.tasker_id) {
            const { data: taskerData } = await supabase
              .from('taskers')
              .select('name')
              .eq('id', bookingRow.tasker_id)
              .single()
            if (taskerData?.name) setTaskerName(taskerData.name)
          }
          window.history.replaceState({}, '', window.location.pathname)
          setBooking(bookingRow)
          setStatus('success')
        } catch {
          setStatus('failed')
        }
        return
      }
      // ── End wallet payment path ───────────────────────────────────────────────

      const piId = params.get('payment_intent_id')
      if (!piId) {
        setStatus('failed')
        return
      }

      try {
        const piRes = await fetch(`/api/paymongo/get-intent/${piId}`)
        const piData = await piRes.json()
        const piStatus = piData?.status
        const paymentId = piData?.payment_id ?? piId

        if (piStatus !== 'succeeded') {
          setStatus('failed')
          window.history.replaceState({}, '', window.location.pathname)
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setStatus('failed')
          return
        }

        // Check if this payment was already confirmed (e.g. 3DS new-tab already processed it)
        const { data: alreadyConfirmed } = await supabase
          .from('bookings')
          .select('*')
          .eq('client_id', session.user.id)
          .eq('paymongo_payment_id', paymentId)
          .eq('status', 'confirmed')
          .maybeSingle()

        if (alreadyConfirmed) {
          if (alreadyConfirmed.tasker_id) {
            const { data: taskerData } = await supabase
              .from('taskers')
              .select('name')
              .eq('id', alreadyConfirmed.tasker_id)
              .single()
            if (taskerData?.name) setTaskerName(taskerData.name)
          }
          window.history.replaceState({}, '', window.location.pathname)
          setBooking(alreadyConfirmed)
          setStatus('success')
          return
        }

        const { data: bookingRow, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('client_id', session.user.id)
          .eq('status', 'pending_payment')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error || !bookingRow) {
          setStatus('failed')
          return
        }

        await supabase.from('bookings').update({ status: 'confirmed', paymongo_payment_id: paymentId, confirmed_at: new Date().toISOString() }).eq('id', bookingRow.id)

        if (bookingRow.tasker_id) {
          const { data: taskerData } = await supabase
            .from('taskers')
            .select('name')
            .eq('id', bookingRow.tasker_id)
            .single()
          if (taskerData?.name) setTaskerName(taskerData.name)
        }

        window.history.replaceState({}, '', window.location.pathname)
        setBooking(bookingRow)
        setStatus('success')
      } catch (err) {
        console.error('BookingConfirmation error:', err)
        setStatus('failed')
      }
    }

    confirm()
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-gray-500 text-sm font-medium">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-xl font-bold text-gray-800">Payment Failed</p>
          <p className="text-sm text-gray-500">Something went wrong. Please try again.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const taskOptions = (() => {
    try { return booking?.task_options ? JSON.parse(booking.task_options) : null }
    catch { return null }
  })()

  const bookingHelperFee = booking?.helper_fee ?? 0
  const bookingHelperCount = (booking?.taskers_needed ?? 1) > 1 ? (booking.taskers_needed - 1) : 0
  const priceBreakdown = buildPriceBreakdown(taskOptions, bookingHelperFee, bookingHelperCount)

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">

        <div id="receipt-content" className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 pt-8 pb-10 flex flex-col items-center text-center text-white">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="16" viewBox="0 0 20 18" fill="none">
                  <path d="M10 1L1 8.5V17H7V12H13V17H19V8.5L10 1Z" fill="white" stroke="white" strokeWidth="0.4" strokeLinejoin="round" />
                  <rect x="8" y="12" width="4" height="5" rx="0.5" fill="#f97316" />
                  <rect x="13" y="3.2" width="2.4" height="3.8" rx="0.4" fill="white" opacity="0.85" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Hanap.ph</span>
            </div>
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4">
              <CheckCircle2 size={44} className="text-white" />
            </div>
            <p className="text-2xl font-bold">Booking Confirmed!</p>
            <p className="text-orange-100 text-sm mt-1">Payment Successful</p>
            <div className="mt-4 bg-white/10 border border-white/20 rounded-xl px-6 py-3 w-full">
              <p className="text-orange-100 text-xs uppercase tracking-widest mb-1">Reference Number</p>
              <p className="text-xl font-bold tracking-widest">{booking?.reference_number ?? '—'}</p>
            </div>
          </div>

          {/* Tear edge decoration */}
          <div className="relative h-4 bg-white">
            <div className="absolute -top-3 left-0 right-0 flex justify-between px-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-5 h-5 rounded-full bg-gray-50" />
              ))}
            </div>
          </div>

          {/* Receipt body */}
          <div className="bg-white px-6 pb-6 space-y-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest text-center pt-2">Receipt Details</p>

            <div className="space-y-3 text-sm">
              {[
                ['Receipt Date', receiptDate],
                ['Customer',     booking?.customer_name ?? '—'],
                ['Service',      booking?.service ?? '—'],
                ['Tasker',       taskerName],
                ['Scheduled',    fmtDate(booking?.scheduled_date, booking?.scheduled_time)],
                ['Address',      booking?.address ?? '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-gray-800 text-right">{val}</span>
                </div>
              ))}

              {/* Payment Method */}
              <div className="flex justify-between gap-4 items-start">
                <span className="text-gray-400 flex-shrink-0">Payment Method</span>
                <div className="text-right space-y-1">
                  {(() => {
                    const method = booking?.payment_method
                    const walletUsed = Number(booking?.wallet_amount_used) || 0

                    // Full wallet — no payment method recorded
                    if (!method) {
                      return (
                        <span className="text-gray-800 flex items-center justify-end gap-1">
                          <Wallet size={14} className="text-orange-500 flex-shrink-0" />
                          Hanap.ph E-Wallet
                        </span>
                      )
                    }

                    // Partial wallet + payment method
                    if (walletUsed > 0) {
                      return (
                        <>
                          <span className="text-gray-800 flex items-center justify-end gap-1">
                            <Wallet size={14} className="text-orange-500 flex-shrink-0" />
                            Hanap.ph E-Wallet + {fmtPaymentMethod(method)}
                          </span>
                          {['gcash', 'paymaya', 'maya'].includes(method.toLowerCase()) && booking?.customer_phone && (
                            <p className="text-gray-400 text-xs mt-0.5">{maskPhone(booking.customer_phone)}</p>
                          )}
                        </>
                      )
                    }

                    // Normal payment — no wallet used
                    return (
                      <>
                        <span className="text-gray-800">{fmtPaymentMethod(method)}</span>
                        {['gcash', 'paymaya', 'maya'].includes(method.toLowerCase()) && booking?.customer_phone && (
                          <p className="text-gray-400 text-xs mt-0.5">{maskPhone(booking.customer_phone)}</p>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            {priceBreakdown.length > 0 && (
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Price Breakdown</p>
                {priceBreakdown.map((line, i) => (
                  line.isHelperInfo
                    ? <div key={i} className="text-xs text-gray-400">{line.label}</div>
                    : <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-500">{line.label}</span>
                        <span className="text-gray-700">
                          {line.isExtra ? `+₱${line.price.toLocaleString()}` : `₱${line.price.toLocaleString()}`}
                        </span>
                      </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <span className="font-bold text-gray-800">Total Paid</span>
              <span className="font-bold text-orange-500 text-lg">
                ₱{Number(booking?.estimated_total ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors text-base"
              >
                My Bookings
              </button>
              <button
                onClick={handleDownloadReceipt}
                disabled={downloading}
                className="w-full bg-white border border-orange-500 text-orange-500 font-semibold py-3 rounded-xl transition-colors text-base hover:bg-orange-50 disabled:opacity-60"
              >
                {downloading ? 'Downloading...' : 'Download Receipt'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
