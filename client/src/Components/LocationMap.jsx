import { useState, useEffect, useRef } from 'react'
import { MapPin, Clock, ExternalLink } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix broken Leaflet default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const HQ_ADDRESS = 'St. Clare College of Caloocan, Zabarte Road, Barangay 172, Zone 15, Camarin, District 1, Caloocan, Northern Manila District, Metro Manila, 1422, Philippines'
const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(HQ_ADDRESS)}`

// ── Small reusable map (used in Booking, BecomeATasker, TaskerDashboard) ──────
function AddressMap({ address }) {
  const [coords, setCoords] = useState(null)

  useEffect(() => {
    if (!address) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=ph`
        )
        const data = await res.json()
        if (data && data.length > 0) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)])
        } else {
          setCoords(null)
        }
      } catch {
        setCoords(null)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [address])

  if (!coords) {
    return (
      <div className="w-full h-48 bg-gray-200 rounded-xl flex items-center justify-center border border-gray-200">
        <div className="text-center">
          <MapPin size={32} className="text-gray-400" />
          <p className="text-sm text-gray-400">Locating address...</p>
        </div>
      </div>
    )
  }

  return (
    <MapContainer
      center={coords}
      zoom={15}
      className="w-full h-48 rounded-xl"
      style={{ zIndex: 1 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={coords}>
        <Popup>{address}</Popup>
      </Marker>
    </MapContainer>
  )
}

// ── Homepage "Find Us Here" section ───────────────────────────────────────────
function HQSection() {
  const [coords, setCoords] = useState(null)
  const [visible, setVisible] = useState(false)
  const sectionRef = useRef(null)

  // Fade-up on scroll
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Geocode HQ address
  useEffect(() => {
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(HQ_ADDRESS)}&countrycodes=ph`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data && data.length > 0) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)])
        }
      })
      .catch(() => {})
  }, [])

  return (
    <section className="bg-gray-900 py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">

        {/* Section header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-black text-white">
            Find Us <span className="text-orange-500">Here</span>
          </h2>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">

          {/* Left — info panel */}
          <div
            className={`flex flex-col gap-6 transition-all duration-700 delay-200 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Address card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex gap-4">
              <div className="shrink-0 w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mt-0.5">
                <MapPin size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Headquarters</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{HQ_ADDRESS}</p>
              </div>
            </div>

            {/* Hours card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex gap-4">
              <div className="shrink-0 w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mt-0.5">
                <Clock size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Operating Hours</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Monday – Sunday</span>
                  <span className="text-white font-semibold ml-6">7:00 AM – 5:00 PM</span>
                </div>
              </div>
            </div>

            {/* Google Maps button */}
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors duration-200"
            >
              <ExternalLink size={18} />
              Open in Google Maps
            </a>
          </div>

          {/* Right — map panel */}
          <div
            className={`transition-all duration-700 delay-300 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {coords ? (
              <MapContainer
                center={coords}
                zoom={16}
                className="w-full h-full min-h-[320px] rounded-2xl"
                style={{ zIndex: 1 }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={coords}>
                  <Popup>
                    <strong>Hanap.ph Headquarters</strong>
                    <br />
                    {HQ_ADDRESS}
                  </Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className="w-full min-h-[320px] rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3">
                <MapPin size={36} className="text-orange-400 animate-pulse" />
                <p className="text-gray-400 text-sm">Loading map…</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Main export — dual-purpose ────────────────────────────────────────────────
function LocationMap({ address }) {
  if (address) return <AddressMap address={address} />
  return <HQSection />
}

export default LocationMap
