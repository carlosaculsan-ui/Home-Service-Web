import { useState, useEffect, useRef } from 'react'
import { X, Send, Phone, Smile, Mic, Camera, Video, Trash2 } from 'lucide-react'
import { supabase } from '../supabase'
import EmojiPicker from 'emoji-picker-react'
import { createDailyRoom } from '../utils/dailyCall'

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
  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const [bookingInfo, setBookingInfo] = useState(null)
  const [taskerPhone, setTaskerPhone] = useState(null)
  const [customerPhone, setCustomerPhone] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [micDenied, setMicDenied] = useState(false)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaError, setMediaError] = useState('')
  const [callStatus, setCallStatus] = useState(null)
  const [callRoomUrl, setCallRoomUrl] = useState(null)
  const [callType, setCallType] = useState(null)
  const [callId, setCallId] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [callError, setCallError] = useState('')
  const callIdRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const pickerRef = useRef(null)
  const recognitionRef = useRef(null)
  const isSpeechSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  const shouldShowMic = isSpeechSupported && !(/iPad|iPhone|iPod/.test(navigator.userAgent) && /^((?!chrome|android).)*safari/i.test(navigator.userAgent))

  // ── Fetch booking info + user role for intro message ───────────────────────
  useEffect(() => {
    if (!bookingId || !currentUserId) return

    async function fetchIntroData() {
      const [{ data: booking }, { data: tasker }] = await Promise.all([
        supabase
          .from('bookings')
          .select('service, scheduled_date, scheduled_time, reference_number, customer_phone')
          .eq('id', bookingId)
          .single(),
        supabase
          .from('taskers')
          .select('phone')
          .eq('user_id', otherUserId)
          .maybeSingle(),
      ])
      if (booking) {
        setBookingInfo(booking)
        if (booking.customer_phone) setCustomerPhone(booking.customer_phone)
      }
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

  async function deleteMessage(msgId) {
    await supabase.from('messages').delete().eq('id', msgId)
    setMessages(prev => prev.filter(m => m.id !== msgId))
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
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId, currentUserId, otherUserId])

  // ── Auto-scroll on new messages ─────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => { callIdRef.current = callId }, [callId])

  useEffect(() => {
    return () => {
      if (callIdRef.current) supabase.from('calls').update({ status: 'ended' }).eq('id', callIdRef.current)
    }
  }, [])

  useEffect(() => {
    if (!currentUserId || !otherUserId) return
    const channel = supabase
      .channel(`vcall-modal-${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, (payload) => {
        const c = payload.new
        if (c.receiver_id === currentUserId && c.caller_id === otherUserId && c.status === 'ringing')
          setIncomingCall({ id: c.id, roomUrl: c.room_url, type: c.room_url?.includes('?video=0') ? 'voice' : 'video' })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls' }, (payload) => {
        const c = payload.new
        const isOurs = (c.caller_id === currentUserId && c.receiver_id === otherUserId) ||
                       (c.caller_id === otherUserId && c.receiver_id === currentUserId)
        if (!isOurs) return
        if (c.status === 'active' && c.caller_id === currentUserId) setCallStatus('active')
        if (c.status === 'ended' || c.status === 'declined') {
          setCallStatus(null); setCallRoomUrl(null); setCallId(null); setCallType(null); setIncomingCall(null)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, otherUserId])

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaError('')
    if (file.type.startsWith('video/')) {
      const vid = document.createElement('video')
      vid.preload = 'metadata'
      vid.onloadedmetadata = () => {
        window.URL.revokeObjectURL(vid.src)
        if (vid.duration > 10) { setMediaError('Video must be 10 seconds or less.'); return }
        setMediaFile(file)
        setMediaPreview(URL.createObjectURL(file))
      }
      vid.src = URL.createObjectURL(file)
    } else {
      setMediaFile(file)
      setMediaPreview(URL.createObjectURL(file))
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim()
    if ((!text && !mediaFile) || sending) return
    setSending(true)
    setInput('')

    if (mediaFile) {
      const ext = mediaFile.name.split('.').pop()
      const path = `dispute-evidence/${currentUserId}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('booking-assets').upload(path, mediaFile)
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('booking-assets').getPublicUrl(path)
        const isVideo = mediaFile.type.startsWith('video/')
        const mediaContent = isVideo ? `[video:${urlData.publicUrl}]` : `[image:${urlData.publicUrl}]`
        await supabase.from('messages').insert({
          booking_id: bookingId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: mediaContent,
          is_read: false,
        })
      }
      setMediaFile(null)
      setMediaPreview(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
      if (videoInputRef.current) videoInputRef.current.value = ''
    }

    if (text) {
      await supabase.from('messages').insert({
        booking_id: bookingId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        content: text,
        is_read: false,
      })
    }

    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  function handleEmojiClick(emojiData) {
    setInput((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  async function startCall(type) {
    setCallError('')
    try {
      const roomUrl = await createDailyRoom()
      const effectiveUrl = type === 'voice' ? `${roomUrl}?video=0` : roomUrl
      const { data, error } = await supabase.from('calls')
        .insert({ room_url: effectiveUrl, caller_id: currentUserId, receiver_id: otherUserId, status: 'ringing' })
        .select('id').single()
      if (error) throw error
      setCallRoomUrl(effectiveUrl); setCallId(data.id); setCallType(type); setCallStatus('calling')
    } catch {
      setCallError('Could not start call. Try again.')
      setTimeout(() => setCallError(''), 4000)
    }
  }

  async function acceptCall() {
    await supabase.from('calls').update({ status: 'active' }).eq('id', incomingCall.id)
    setCallRoomUrl(incomingCall.roomUrl); setCallId(incomingCall.id); setCallType(incomingCall.type); setCallStatus('active'); setIncomingCall(null)
  }

  async function declineCall() {
    await supabase.from('calls').update({ status: 'declined' }).eq('id', incomingCall.id)
    setIncomingCall(null)
  }

  async function endCall() {
    if (callIdRef.current) await supabase.from('calls').update({ status: 'ended' }).eq('id', callIdRef.current)
    setCallStatus(null); setCallRoomUrl(null); setCallId(null); setCallType(null)
  }

  function toggleRecording() {
    if (isRecording) { recognitionRef.current?.stop(); return }
    setMicDenied(false)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-PH'
    rec.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      if (final) setInput((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + final)
      setInterimText(interim)
    }
    rec.onerror = (e) => { if (e.error === 'not-allowed') setMicDenied(true); setIsRecording(false); setInterimText('') }
    rec.onend = () => { setIsRecording(false); setInterimText('') }
    recognitionRef.current = rec
    rec.start()
    setIsRecording(true)
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
              {bookingInfo && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {[
                    bookingInfo.service,
                    bookingInfo.scheduled_date && (() => {
                      const d = new Date(bookingInfo.scheduled_date + 'T00:00:00')
                      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      if (!bookingInfo.scheduled_time) return dateStr
                      const [h, min] = bookingInfo.scheduled_time.split(':').map(Number)
                      const suffix = h < 12 ? 'AM' : 'PM'
                      const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
                      return `${dateStr} at ${hour}:${String(min).padStart(2, '0')} ${suffix}`
                    })(),
                    bookingInfo.reference_number,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startCall('voice')}
                disabled={!!callStatus || !!incomingCall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold transition-colors disabled:opacity-40"
              >
                <Phone size={13} />
                Voice
              </button>
              <button
                onClick={() => startCall('video')}
                disabled={!!callStatus || !!incomingCall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-semibold transition-colors disabled:opacity-40"
              >
                <Video size={13} />
                Video
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {incomingCall && (
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                {incomingCall?.type === 'voice' ? <Phone size={15} className="text-blue-600 animate-pulse" /> : <Video size={15} className="text-blue-600 animate-pulse" />}
                <p className="text-sm font-semibold text-blue-800">Incoming {incomingCall?.type === 'voice' ? 'voice' : 'video'} call from {otherUserName}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={acceptCall} className="px-3 py-1.5 rounded-full bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors">Accept</button>
                <button onClick={declineCall} className="px-3 py-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold transition-colors">Decline</button>
              </div>
            </div>
          )}
          {callStatus === 'calling' && (
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse inline-block" />
                <p className="text-sm font-semibold text-blue-800">{callType === 'voice' ? 'Voice calling' : 'Video calling'} {otherUserName}…</p>
              </div>
              <button onClick={endCall} className="px-3 py-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold transition-colors">Cancel</button>
            </div>
          )}
          {callError && <p className="text-xs text-red-500 px-4 py-2 bg-red-50 border-b border-red-100 flex-shrink-0">{callError}</p>}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4" onTouchStart={() => setHoveredMsgId(null)}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-sm text-center">
                  No messages yet.<br />Start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId
                  const isImage = msg.content?.startsWith('[image:')
                  const isVideo = msg.content?.startsWith('[video:')
                  const mediaUrl = (isImage || isVideo) ? msg.content.replace(/^\[(image|video):/, '').replace(/\]$/, '') : null
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      onMouseEnter={() => isMine && setHoveredMsgId(msg.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                      onTouchStart={(e) => { if (isMine) { e.stopPropagation(); setHoveredMsgId(prev => prev === msg.id ? null : msg.id) } }}
                    >
                      <div className="flex items-center gap-1.5">
                        {isMine && hoveredMsgId === msg.id && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5 flex-shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl text-sm leading-relaxed overflow-hidden ${
                            mediaUrl ? '' : 'px-4 py-2.5'
                          } ${
                            isMine
                              ? 'bg-orange-500 text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          }`}
                        >
                          {isImage && <img src={mediaUrl} alt="attachment" className="max-w-[200px] max-h-[200px] block rounded-2xl" />}
                          {isVideo && <video src={mediaUrl} controls className="max-w-[200px] block rounded-2xl" />}
                          {!mediaUrl && msg.content}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 px-1">
                        {isMine ? 'You' : otherUserName} · {formatTime(msg.created_at)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Media preview */}
          {mediaPreview && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 flex-shrink-0">
              {mediaFile?.type.startsWith('video/') ? (
                <video src={mediaPreview} className="w-12 h-12 object-cover rounded-lg border border-gray-200" muted />
              ) : (
                <img src={mediaPreview} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
              )}
              <button
                onClick={() => { setMediaFile(null); setMediaPreview(null); if (imageInputRef.current) imageInputRef.current.value = ''; if (videoInputRef.current) videoInputRef.current.value = '' }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          )}
          {mediaError && (
            <p className="text-xs text-red-500 px-4 pb-1 flex-shrink-0">{mediaError}</p>
          )}

          {/* Interim speech preview */}
          {interimText && (
            <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100 flex-shrink-0">
              <p className="text-xs text-gray-400 italic truncate">{interimText}…</p>
            </div>
          )}

          {/* Input */}
          <div className="relative flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
            {showEmojiPicker && (
              <div ref={pickerRef} className="absolute bottom-16 right-4 z-50">
                <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={380} previewConfig={{ showPreview: false }} />
              </div>
            )}
            <label className="cursor-pointer flex-shrink-0 text-gray-400 hover:text-orange-500 transition-colors" title="Attach photo">
              <Camera size={20} />
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </label>
            <label className="cursor-pointer flex-shrink-0 text-gray-400 hover:text-orange-500 transition-colors" title="Attach video (max 10s)">
              <Video size={20} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
            </label>
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
              type="button"
              onClick={() => setShowEmojiPicker((p) => !p)}
              className="p-2.5 rounded-xl text-gray-400 hover:text-orange-500 transition-colors flex-shrink-0"
            >
              <Smile size={20} />
            </button>
            {shouldShowMic && (
              <button
                type="button"
                onClick={toggleRecording}
                title={micDenied ? 'Microphone access denied' : isRecording ? 'Stop recording' : 'Speak your message'}
                className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${isRecording ? 'text-red-500' : 'text-gray-400 hover:text-orange-500'}`}
              >
                {isRecording ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <Mic size={18} />
                  </span>
                ) : (
                  <Mic size={18} />
                )}
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !mediaFile) || sending}
              className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <Send size={17} />
            </button>
          </div>

        </div>
      </div>
      {callStatus === 'active' && callRoomUrl && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl flex flex-col rounded-2xl overflow-hidden shadow-2xl" style={{ height: '80vh' }}>
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 flex-shrink-0">
              <p className="text-white text-sm font-semibold">{callType === 'voice' ? 'Voice' : 'Video'} call with {otherUserName}</p>
              <button onClick={endCall} className="px-4 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">End Call</button>
            </div>
            <iframe src={callRoomUrl} allow="camera; microphone; fullscreen; display-capture" className="flex-1 w-full border-0" />
          </div>
        </div>
      )}
    </>
  )
}
