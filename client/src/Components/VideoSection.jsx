import { useRef, useEffect } from 'react'
import videoSectionImage from '../Assets/VideoSectionImage.jpg'
import videoSectionVideo from '../Assets/VideoSectionVideo.mp4'

function VideoSection() {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play()
        } else {
          video.pause()
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-white py-16 px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 md:relative md:flex md:flex-row md:items-center md:justify-center md:h-96 md:gap-0">
          {/* Left Photo - Larger */}
          <div className="w-full h-64 md:absolute md:left-0 md:w-[73%] md:h-[352px] rounded-lg shadow-lg md:z-10 overflow-hidden">
            <img src={videoSectionImage} alt="Home Service" className="w-full h-full object-cover" />
          </div>

          {/* Right Video - Smaller, Overlapping */}
          <div className="w-full h-56 md:absolute md:right-0 md:w-1/2 md:h-64 rounded-lg shadow-lg md:z-20 overflow-hidden">
            <video
              ref={videoRef}
              src={videoSectionVideo}
              className="w-full h-full object-cover"
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
