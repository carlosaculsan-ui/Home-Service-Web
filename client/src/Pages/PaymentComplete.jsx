import { useEffect, useState } from 'react'

function PaymentComplete() {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      window.close()
      // If window.close() was blocked, show the manual button
      setTimeout(() => setBlocked(true), 300)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-2xl font-bold text-gray-800">✅ Payment confirmed!</p>
      <p className="text-sm text-gray-400">This tab will close automatically.</p>
      {blocked && (
        <button
          onClick={() => window.close()}
          className="mt-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Close this tab
        </button>
      )}
    </div>
  )
}

export default PaymentComplete
