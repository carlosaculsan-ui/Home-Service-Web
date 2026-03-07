import { useState } from 'react'

const taskers = [
  {
    name: "Mark C. Quite",
    title: "Appliance Repair Professional",
    rating: 4.9,
    reviews: 128
  },
  {
    name: "Lee B. Maborrang",
    title: "Pest Control Professional",
    rating: 5.0,
    reviews: 95
  },
  {
    name: "Joan M. Batungbakal",
    title: "Cleaning Specialist",
    rating: 4.8,
    reviews: 156
  }
]

function TaskerShowcase() {
  const [currentIndex, setCurrentIndex] = useState(1)

  return (
    <div className="bg-gray-900 py-16 px-6 md:px-8">
      <h2 className="text-4xl font-bold text-white text-center mb-12">
        Vortex Elite
      </h2>

      {/* Tasker Cards */}
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-6 mb-12">
        {taskers.map((tasker, index) => {
          const isCenter = index === currentIndex
          return (
            <div
              key={index}
              className={`transition-all ${
                isCenter
                  ? 'w-full md:w-80 scale-100'
                  : 'w-full md:w-64 scale-75 md:scale-100 opacity-60'
              }`}
            >
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Photo Placeholder */}
                <div className="bg-gray-300 h-48 w-full"></div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {tasker.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {tasker.title}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-orange-500">★</span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {tasker.rating} ({tasker.reviews} reviews)
                    </span>
                  </div>

                  {/* View Profile Button */}
                  <button className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors">
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Become a Tasker Button */}
      <div className="flex justify-center mb-8">
        <button className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-lg transition-colors">
          Become a Tasker
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2">
        {taskers.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentIndex ? 'bg-orange-500' : 'bg-gray-600'
            }`}
          ></button>
        ))}
      </div>
    </div>
  )
}

export default TaskerShowcase
