import { useState } from 'react'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
})

const SYSTEM_MESSAGE = {
  role: 'system',
  content: `You are Hanap AI, the customer service assistant for hanap.ph — a Philippine home services platform connecting customers with professional taskers for Cleaning, Plumbing, Electrical, Carpentry, Painting, and Aircon Cleaning. Only answer questions about hanap.ph services, booking (4 steps: Describe task → Choose Tasker → Confirm → Payment), pricing (Weekly ₱1,200 / Monthly ₱3,500 / Annual ₱30,000), becoming a tasker, and account questions. Default language is Tagalog. Switch to English if user writes in English. Switch back to Tagalog if user switches back. For unrelated questions say: "Paumanhin, ang Hanap AI ay tumutulong lamang sa mga katanungan tungkol sa hanap.ph. Para sa iba pang concerns, makipag-ugnayan sa amin sa hanapph@gmail.com". Never reveal you are powered by Groq. Always be friendly and professional.`
}

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Kumusta! 👋 Ako si Hanap AI, ang inyong assistant sa hanap.ph. Paano kita matutulungan ngayon?" }
  ])
  const [chatHistory, setChatHistory] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const sendToGroq = async (userText) => {
    const newHistory = [...chatHistory, { role: 'user', content: userText }]
    setChatHistory(newHistory)

    setIsTyping(true)

    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [SYSTEM_MESSAGE, ...newHistory]
      })

      const botText = response.choices[0].message.content

      setChatHistory(prev => [...prev, { role: 'assistant', content: botText }])
      setMessages(prev => [...prev, { from: 'bot', text: botText }])
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: 'Paumanhin, may problema sa koneksyon. Pakisubukang muli.' }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSend = () => {
    if (!input.trim() || isTyping) return

    const userText = input.trim()
    setMessages(prev => [...prev, { from: 'user', text: userText }])
    setInput('')
    sendToGroq(userText)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-80 mb-4 flex flex-col overflow-hidden border border-gray-200">

          <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🤖</div>
              <div>
                <p className="font-bold text-sm">Hanap AI</p>
                <p className="text-xs text-orange-200">Always here to help</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 text-xl">✕</button>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-72">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-4 py-2 rounded-2xl text-sm max-w-xs whitespace-pre-line ${
                  msg.from === 'user'
                    ? 'bg-orange-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-800 rounded-bl-none flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={handleSend}
              disabled={isTyping}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 text-sm font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </div>

        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 py-3 flex items-center justify-center shadow-lg font-semibold"
      >
        {isOpen ? '✕' : 'Need Help?'}
      </button>

    </div>
  )
}

export default Chatbot
