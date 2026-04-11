import { useState, useEffect, useRef } from 'react'
import { X, Send, Phone } from 'lucide-react'
import { supabase } from '../supabase'

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function ChatModal({ bookingId, currentUserId, otherUserId, otherUserName, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const [bookingInfo, setBookingInfo] = useState(null)
  const [isCustomer, setIsCustomer] = useState(false)
  const [taskerPhone, setTaskerPhone] = useState(null)

  // ── Fetch booking info + user role for intro message ───────────────────────
  useEffect(() => {
    if (!bookingId || !currentUserId) return

    async function fetchIntroData() {
      const [{ data: booking }, { data: profile }, { data: tasker }] = await Promise.all([
        supabase
          .from('bookings')
          .select('service, scheduled_date, scheduled_time, reference_number')
          .eq('id', bookingId)
          .single(),
        supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUserId)
          .single(),
        supabase
          .from('taskers')
          .select('phone')
          .eq('user_id', otherUserId)
          .maybeSingle(),
      ])
      if (booking) setBookingInfo(booking)
      if (profile?.role === 'customer') setIsCustomer(true)
      if (tasker?.phone) setTaskerPhone(tasker.phone)
    }

    fetchIntroData()
  }, [bookingId, currentUserId])

  // ── Fetch messages ──────────────────────────────────────────────────────────
  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  // ── Mark incoming messages as read ─────────────────────────────────────────
  async function markAsRead() {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('booking_id', bookingId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false)
  }

  // ── Init: fetch + mark read + focus input ──────────────────────────────────
  useEffect(() => {
    fetchMessages().then(markAsRead)
    inputRef.current?.focus()
  }, [bookingId, currentUserId])

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    const channelName = bookingId
      ? `messages-booking-${bookingId}`
      : `messages-convo-${[currentUserId, otherUserId].sort().join('-')}`

    const eventConfig = bookingId
      ? { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` }
      : { event: 'INSERT', schema: 'public', table: 'messages' }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        eventConfig,
        (payload) => {
          const msg = payload.new

          // For support chats (null bookingId), filter client-side to this conversation pair
          if (!bookingId) {
            if (msg.booking_id !== null) return
            const isThisConvo =
              (msg.sender_id === currentUserId && msg.receiver_id === otherUserId) ||
              (msg.sender_id === otherUserId && msg.receiver_id === currentUserId)
            if (!isThisConvo) return
          }

          // Only add if it involves the current user
          if (msg.sender_id === currentUserId || msg.receiver_id === currentUserId) {
            setMessages((prev) => {
              // Avoid duplicates (our own send already optimistically added)
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            // Mark as read if we're the receiver
            if (msg.receiver_id === currentUserId) {
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', msg.id)
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId, currentUserId, otherUserId])

  // ── Auto-scroll on new messages ─────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ─────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')

    await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: text,
      is_read: false,
    })

    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col"
          style={{ height: '560px', maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <p className="font-bold text-gray-800 text-base">Chat with {otherUserName}</p>
              <p className="text-xs text-gray-400 mt-0.5">Booking #{bookingId?.slice(0, 8)}</p>
            </div>
            <div className="flex items-center gap-2">
              {taskerPhone && (
                <div className="relative group">
                  <a
                    href={`tel:${taskerPhone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold transition-colors"
                  >
                    <Phone size={13} />
                    Call
                  </a>
                  <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
                    <div className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                      Call tasker directly
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Intro message — customer only */}
          {isCustomer && bookingInfo && (() => {
            const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
            const d = new Date(bookingInfo.scheduled_date + 'T00:00:00')
            const dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
            const timeStr = bookingInfo.scheduled_time
              ? (() => {
                  const [h, min] = bookingInfo.scheduled_time.split(':').map(Number)
                  const suffix = h < 12 ? 'AM' : 'PM'
                  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
                  return `${hour}:${String(min).padStart(2, '0')} ${suffix}`
                })()
              : ''
            const formattedDate = timeStr ? `${dateStr} at ${timeStr}` : dateStr
            return (
              <div className="mx-4 mt-4 mb-2 bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm">
                <p className="font-semibold text-gray-800 mb-1">📋 You're connected with {otherUserName}</p>
                <p className="text-gray-600">Service: <span className="font-medium">{bookingInfo.service}</span></p>
                <p className="text-gray-600">Scheduled: <span className="font-medium">{formattedDate}</span></p>
                <p className="text-gray-600">Reference: <span className="font-medium text-orange-500">{bookingInfo.reference_number}</span></p>
                <p className="text-xs text-gray-400 mt-2">The tasker will respond as soon as possible.</p>
              </div>
            )
          })()}

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
                const isMine = msg.sender_id === currentUserId
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? 'bg-orange-500 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 px-1">
                      {isMine ? 'You' : otherUserName} · {formatTime(msg.created_at)}
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
              <Send size={17} />
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
