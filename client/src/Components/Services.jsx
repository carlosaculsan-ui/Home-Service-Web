const services = [
  { icon: "🧹", title: "Cleaning", description: "Professional home and office cleaning services." },
  { icon: "🔧", title: "Plumbing", description: "Fix leaks, pipes, and plumbing installations." },
  { icon: "⚡", title: "Electrical", description: "Safe and reliable electrical repairs and wiring." },
  { icon: "🪚", title: "Carpentry", description: "Custom furniture, repairs, and woodwork." },
  { icon: "🎨", title: "Painting", description: "Interior and exterior painting services." },
  { icon: "❄️", title: "HVAC", description: "Air conditioning and heating repair and installation." },
]

function Services() {
  return (
    <div className="py-16 px-8 bg-gray-50">
      
      {/* Section Title */}
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
        Our Services
      </h2>
      <p className="text-center text-gray-500 mb-12">
        Choose from a wide range of home services
      </p>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {services.map((service, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-8 text-center hover:shadow-xl transition-shadow cursor-pointer">
            <div className="text-5xl mb-4">{service.icon}</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{service.title}</h3>
            <p className="text-gray-500">{service.description}</p>
            <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Book Now
            </button>
          </div>
        ))}
      </div>

    </div>
  )
}

export default Services