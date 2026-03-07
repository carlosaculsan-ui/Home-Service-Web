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
        {/* Logo placeholder */}
        <div style={{height: '55px', width: '165px', border: '1px dashed rgba(255,255,255,0.3)', marginBottom: '20px'}}></div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
          YOUR HOME, OUR
        </h1>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-orange-500">
          EXPERTISE.
        </h1>
        <p className="text-xs sm:text-sm md:text-base mb-8 md:mb-10 text-white">
          Hindi basta serbisyo — professional service talaga. Through proper training and trusted partnerships, we make sure every job is done right the first time.
        </p>

        {/* Our Services Button */}
        <button className="mb-8 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-lg">
          Our Services
        </button>
      </div>

    </div>
  )
}

export default Hero