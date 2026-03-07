import videoSectionImage from '../Assets/VideoSectionImage.jpg'
import videoSectionVideo from '../Assets/VideoSectionVideo.mp4'

function VideoSection() {
  return (
    <div className="bg-white py-16 px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="relative flex items-center justify-center h-96">
          {/* Left Photo - Larger */}
          <div className="absolute left-0 w-full md:w-[73%] h-[352px] rounded-lg shadow-lg z-10 overflow-hidden">
            <img src={videoSectionImage} alt="Home Service" className="w-full h-full object-cover" />
          </div>

          {/* Right Video - Smaller, Overlapping */}
          <div className="absolute right-0 w-full md:w-1/2 h-64 rounded-lg shadow-lg z-20 overflow-hidden">
            <video
              src={videoSectionVideo}
              className="w-full h-full object-cover"
              controls
              loop
              muted
              playsInline
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoSection