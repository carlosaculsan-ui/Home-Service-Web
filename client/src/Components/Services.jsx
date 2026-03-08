import { Link } from 'react-router-dom'
import cleaningImg from '../Assets/Cleaning.png'
import plumbingImg from '../Assets/Plumbing.png'
import electricianImg from '../Assets/Electrician.png'
import carpentryImg from '../Assets/Carpentry.png'
import paintingImg from '../Assets/Painting.png'
import airconImg from '../Assets/Aircon Maintenance.png'

const services = [
  {
    icon: "🧹",
    title: "Cleaning",
    image: cleaningImg,
    description: [
      "Professional home cleaning",
      "Office space cleaning",
      "Deep cleaning services"
    ]
  },
  {
    icon: "🔧",
    title: "Plumbing Repair",
    image: plumbingImg,
    description: [
      "Fix leaks and pipes",
      "Plumbing installations",
      "Emergency repairs"
    ]
  },
  {
    icon: "⚡",
    title: "Electrical",
    image: electricianImg,
    description: [
      "Safe electrical repairs",
      "Wiring installations",
      "Circuit upgrades"
    ]
  },
  {
    icon: "🪚",
    title: "Carpentry",
    image: carpentryImg,
    description: [
      "Custom furniture",
      "Structural repairs",
      "Woodwork projects"
    ]
  },
  {
    icon: "🎨",
    title: "Painting",
    image: paintingImg,
    description: [
      "Interior painting",
      "Exterior painting",
      "Surface preparation"
    ]
  },
  {
    icon: "❄️",
    title: "Aircon Cleaning",
    image: airconImg,
    description: [
      "Air conditioning maintenance",
      "Filter replacement",
      "System repairs"
    ]
  },
]

function Services() {
  return (
    <div className="py-16 px-8 bg-gray-50">


      <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
        The Best Service For You
      </h2>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {services.map((service, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
            {/* Header with icon and stars */}
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{service.icon}</div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-500">★</span>
                ))}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>

            {/* Bullet point descriptions */}
            <ul className="text-sm text-gray-600 mb-6 space-y-2">
              {service.description.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Service image */}
            <div className="h-32 rounded-lg mb-4 overflow-hidden">
              <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
            </div>

            {/* Circular orange arrow button */}
            <div className="flex justify-end">
              <Link to={`/booking/${service.title}`} className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors font-bold text-lg">
                →
              </Link>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

export default Services
