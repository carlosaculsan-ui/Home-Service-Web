import heroImg from '../Assets/hero.jpg'



function Hero() {

  return (
    <div
      className="relative text-white py-16 md:py-24 pl-6 md:pl-12 lg:pl-16 pr-6 text-left"
      style={{
        backgroundImage: `url(${heroImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Black overlay */}
      <div className="absolute inset-0 bg-black opacity-40"></div>

      {/* top-left space for logo (empty) */}

      <div className="relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">
          YOUR HOME, OUR
        </h1>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-orange-500">
          EXPERTISE.
        </h1>
        <p className="text-base sm:text-lg md:text-xl mb-8 md:mb-10 text-white">
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