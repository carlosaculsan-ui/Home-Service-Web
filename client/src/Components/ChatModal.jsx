import { useState, useEffect, useRef } from 'react'
import { X, Send } from 'lucide-react'
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
    const channel = supabase
      .channel(`messages:booking_id=eq.${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const msg = payload.new
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
  }, [bookingId, currentUserId])

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

    const optimistic = {
      id: `optimistic-${Date.now()}`,
      booking_id: bookingId,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

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
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

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
