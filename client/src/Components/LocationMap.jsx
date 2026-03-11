import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function LocationMap({ address }) {
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
          <div className="text-3xl">📍</div>
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

export default LocationMap
