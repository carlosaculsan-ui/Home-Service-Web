import { useState, useEffect } from 'react'

const taskers = [
  { name: "Mark C. Quite", role: "Appliance Repair Professional", rating: 4.3, reviews: 240 },
  { name: "Lee B. Maborrang", role: "Pest Control Professional", rating: 4.9, reviews: 316 },
  { name: "Joan M. Batungbakal", role: "Cleaning Specialist", rating: 4.9, reviews: 0 },
  { name: "Ahron Gainsan", role: "Electrical Professional", rating: 5.0, reviews: 1000000 },
  { name: "Danica Flores", role: "Plumbing Specialist", rating: 5.0, reviews: 1 },
  { name: "Manny John Paul Vargas", role: "Carpentry Professional", rating: 4.6, reviews: 1000000000 },
]

function TaskerShowcase() {
  const [index, setIndex] = useState(1)
  const [sliding, setSliding] = useState(null)

  const slide = (direction) => {
    setSliding(direction)
    setTimeout(() => {
      setIndex((prev) =>
        direction === 'left'
          ? prev === 0 ? taskers.length - 1 : prev - 1
          : prev === taskers.length - 1 ? 0 : prev + 1
      )
      setSliding(null)
    }, 300)
  }

  const getVisible = () => {
    const left = (index - 1 + taskers.length) % taskers.length
    const center = index
    const right = (index + 1) % taskers.length
    return [
      { tasker: taskers[left], position: 'left' },
      { tasker: taskers[center], position: 'center' },
      { tasker: taskers[right], position: 'right' },
    ]
  }

  const getSlideStyle = (position) => {
    if (!sliding) return 'translateX(0)'
    if (sliding === 'right') {
      if (position === 'left') return 'translateX(-120%)'
      if (position === 'center') return 'translateX(-40%)'
      if (position === 'right') return 'translateX(-40%)'
    }
    if (sliding === 'left') {
      if (position === 'right') return 'translateX(120%)'
      if (position === 'center') return 'translateX(40%)'
      if (position === 'left') return 'translateX(40%)'
    }
    return 'translateX(0)'
  }

  return (
    <div className="bg-gray-900 py-16 px-8 text-white text-center overflow-hidden">

      <h2 className="text-3xl font-bold mb-10">Vortex Elite Taskers</h2>

      <div className="flex items-center justify-center gap-6">

        <button
          onClick={() => slide('left')}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl flex-shrink-0 z-10"
        >
          ←
        </button>

        <div className="flex items-center justify-center gap-8 w-full max-w-4xl overflow-hidden">
          {getVisible().map(({ tasker, position }, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
              style={{
                width: position === 'center' ? '32%' : '27%',
                opacity: position === 'center' ? 1 : 0.6,
                transform: `${position === 'center' ? 'scale(1.05)' : 'scale(0.93)'} ${getSlideStyle(position)}`,
                transition: 'transform 0.3s ease, opacity 0.3s ease',
              }}
            >
              <div
                className="bg-gray-600 w-full"
                style={{ height: position === 'center' ? '200px' : '165px' }}
              ></div>
              <div className="p-4 text-left">
                <h3 className="font-bold text-base">{tasker.name}</h3>
                <p className="text-orange-400 text-sm mb-2">{tasker.role}</p>
                <p className="text-yellow-400 text-sm mb-3">
                  ★ {tasker.rating} ({tasker.reviews.toLocaleString()} reviews)
                </p>
                <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-semibold text-sm">
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => slide('right')}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl flex-shrink-0 z-10"
        >
          →
        </button>

      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-8">
        {taskers.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-3 rounded-full transition-all duration-300 ${
              i === index ? 'bg-orange-500 w-6' : 'bg-gray-500 w-3'
            }`}
          />
        ))}
      </div>

      <button className="mt-8 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold">
        Become a Tasker
      </button>

    </div>
  )
}

export default TaskerShowcase