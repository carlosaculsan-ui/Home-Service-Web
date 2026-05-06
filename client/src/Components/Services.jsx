import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { getServiceIcon } from '../utils/serviceIcons'
import { toDisplayName } from '../utils/serviceNames'
import background2Img from '../Assets/Background2.jpg'
import cleaningImg from '../Assets/Cleaning.png'
import plumbingImg from '../Assets/Plumbing.png'
import electricianImg from '../Assets/Electrician.png'
import carpentryImg from '../Assets/Carpentry.png'
import paintingImg from '../Assets/Painting.png'
import airconImg from '../Assets/Aircon Maintenance.png'

const IMAGE_MAP = {
  'Cleaning': cleaningImg,
  'Plumbing Repair': plumbingImg,
  'Electrical': electricianImg,
  'Carpentry': carpentryImg,
  'Painting': paintingImg,
  'Aircon Cleaning': airconImg,
  'Aircon Maintenance': airconImg,
}

function Services() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      supabase.from('profiles').select('role').eq('id', session.user.id).single()
        .then(({ data }) => setRole(data?.role ?? null))
    })
  }, [])

  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      setServices(
        (data ?? []).map((s) => ({
          ...s,
          description: (() => {
            try { return JSON.parse(s.description) } catch { return [s.description] }
          })(),
        }))
      )
      setLoading(false)
    }
    fetchServices()
  }, [])

  return (
    <div className="py-16 px-8" style={{ backgroundImage: `url(${background2Img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>

      <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
        The Best Service For You
      </h2>

      {loading ? (
        <div className="flex justify-center mt-8">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-xl border border-gray-200 shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
              {/* Header with icon and stars */}
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">
                  {getServiceIcon(service.icon, { size: 40, className: 'text-orange-500' }) ?? service.icon}
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-500">★</span>
                  ))}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-4">{toDisplayName(service.title)}</h3>

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
                <img
                  src={IMAGE_MAP[service.title]}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Circular orange arrow button */}
              {role !== 'tasker' && role !== 'admin' && role !== 'helper' && (
                <div className="flex justify-end">
                  <Link to={`/booking/${service.title}`} className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors font-bold text-lg">
                    →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default Services
