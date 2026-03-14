import heroImg from '../Assets/hero.jpg'



function Hero() {

  return (
    <div
      className="relative text-white text-left overflow-hidden"
      style={{
        backgroundImage: `url(${heroImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '112vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Black overlay */}
      <div className="absolute inset-0 bg-black opacity-40"></div>

      {/* Left triangular overlay */}
      <div className="absolute inset-0" style={{clipPath: 'polygon(0 0, 0 100%, 45% 100%)', backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 5}}></div>

      {/* Right triangular overlay */}
      <div className="absolute inset-0" style={{clipPath: 'polygon(100% 0, 55% 0, 100% 100%)', backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 5}}></div>

      {/* top-left space for logo (empty) */}

      <div className="relative z-10" style={{paddingLeft: '60px', maxWidth: '50%'}}>
        {/* Logo */}
        <div className="flex items-center gap-1 mb-5">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: 0 }}
              width="52"
              height="26"
              viewBox="0 0 40 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="20" y1="2" x2="1" y2="19" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="20" y1="2" x2="39" y2="19" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="26" y="4" width="4" height="7" fill="#6b7280" rx="0.5" />
            </svg>
            <span className="text-orange-500 font-black text-5xl leading-none">h</span>
          </div>
          <span style={{ color: '#6b7280' }} className="font-bold text-lg leading-none">anap.ph</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
          YOUR HOME, OUR
        </h1>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-orange-500">
          EXPERTISE.
        </h1>
        <p className="text-xs sm:text-sm md:text-base mb-8 md:mb-10 text-white">
          Hindi basta serbisyo — professional service talaga. Through proper training and trusted partnerships, we make sure every job is done right the first time.
        </p>

        {/* Get Started Button */}
        <button
          onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
          className="mb-8 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-lg"
        >
          Get Started
        </button>
      </div>

    </div>
  )
}

export default Hero