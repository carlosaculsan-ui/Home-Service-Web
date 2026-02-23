import { useState } from 'react'

const botReplies = {
  "hello": "Hi there! 👋 Welcome to Vortex Elite! How can I help you today?",
  "hi": "Hey! 😊 Looking for a home service? I can help you find the right professional!",
  "cleaning": "🧹 We have top-rated cleaning professionals available! Would you like to book a session today?",
  "plumbing": "🔧 Got a plumbing issue? Our licensed plumbers are ready to help! Want to schedule a visit?",
  "electrical": "⚡ Electrical problems can be dangerous! Let our certified electricians handle it safely. Book now?",
  "carpentry": "🪚 Need carpentry work done? Our skilled carpenters are at your service! Shall I find one near you?",
  "price": "💰 Prices vary depending on the service and location. You can get a free quote by booking a professional!",
  "book": "📅 To book a service, simply browse our Services section, pick a professional, and choose your schedule!",
  "help": "I can help you with: \n• Finding services \n• Booking professionals \n• Pricing info \n• Becoming a Tasker \n\nWhat do you need?",
}

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! 👋 I'm Vortex AI, your home service assistant. How can I help you today?" }
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage = { from: 'user', text: input }
    const keyword = input.toLowerCase().trim()
    const reply = Object.keys(botReplies).find(key => keyword.includes(key))
    const botMessage = {
      from: 'bot',
      text: reply ? botReplies[reply] : "🤔 I'm not sure about that yet, but our team can help! You can contact us or browse our services."
    }

    setMessages(prev => [...prev, userMessage, botMessage])
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-80 mb-4 flex flex-col overflow-hidden border border-gray-200">
          
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🤖</div>
              <div>
                <p className="font-bold text-sm">Vortex AI</p>
                <p className="text-xs text-blue-200">Always here to help</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 text-xl">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-72">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-4 py-2 rounded-2xl text-sm max-w-xs whitespace-pre-line ${
                  msg.from === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSend}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
            >
              Send
            </button>
          </div>

        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg text-3xl"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

    </div>
  )
}

export default Chatbot