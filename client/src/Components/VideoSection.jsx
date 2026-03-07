function VideoSection() {
  return (
    <div className="bg-white py-16 px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="relative flex items-center justify-center h-96">
          {/* Left Photo Placeholder - Larger */}
          <div className="absolute left-0 w-full md:w-2/3 h-80 bg-gray-300 rounded-lg shadow-lg z-10"></div>

          {/* Right Photo Placeholder - Smaller, Overlapping */}
          <div className="absolute right-0 w-full md:w-1/2 h-64 bg-gray-300 rounded-lg shadow-lg z-20 flex items-center justify-center">
            {/* Orange Play Button */}
            <button className="flex items-center justify-center w-20 h-20 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors text-white shadow-lg">
              <span className="text-3xl ml-1">▶</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoSection
