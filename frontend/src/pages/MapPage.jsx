import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { getNearbyCafes } from '../api/cafes'
import 'leaflet/dist/leaflet.css'
import './MapPage.css'

// Fix Leaflet default icon path issue with Vite
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, shadowUrl: markerShadow })

const AUSTIN_CENTER = [30.267, -97.743]

export default function MapPage() {
  const [position, setPosition] = useState(null)
  const [cafes, setCafes] = useState([])
  const [locationError, setLocationError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Location not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setPosition([latitude, longitude])
        getNearbyCafes(latitude, longitude, 2000)
          .then((r) => setCafes(r.data))
          .catch(() => {})
      },
      () => setLocationError('Location permission denied'),
      { enableHighAccuracy: true }
    )
  }, [])

  const center = position || AUSTIN_CENTER

  return (
    <div className="map-page">
      <header className="page-header">
        <h1>Map</h1>
        {locationError && <p className="map-location-error">{locationError}</p>}
      </header>
      <div className="map-container">
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {cafes.map((cafe) => cafe.lat && cafe.lng && (
            <Marker key={cafe.id} position={[cafe.lat, cafe.lng]}>
              <Popup>
                <strong>{cafe.name}</strong><br />
                {cafe.address}<br />
                <Link to={`/cafe/${cafe.id}`}>View details</Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
