import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getBrewToday } from '../api/discovery'
import { getFriendBlend } from '../api/discovery'
import './BrewTodayPage.css'

const MODES = [
  { id: 'brew', label: "What's on Brew Today" },
  { id: 'blend', label: 'Your Friend Blend' },
]

function CafeCard({ cafe, label }) {
  if (!cafe) return null
  return (
    <Link to={`/cafe/${cafe.id}`} className="cafe-card">
      <span className="cafe-card-label">{label}</span>
      <h3 className="cafe-card-name">{cafe.name}</h3>
      <p className="cafe-card-address">{cafe.address}</p>
      {cafe.yelp_link && (
        <span className="cafe-card-yelp">View on Yelp →</span>
      )}
    </Link>
  )
}

export default function BrewTodayPage() {
  const [mode, setMode] = useState('brew')

  const brewQuery = useQuery({
    queryKey: ['brew-today'],
    queryFn: () => getBrewToday().then((r) => r.data),
    enabled: mode === 'brew',
  })

  const blendQuery = useQuery({
    queryKey: ['friend-blend'],
    queryFn: () => getFriendBlend().then((r) => r.data),
    enabled: mode === 'blend',
  })

  const data = mode === 'brew' ? brewQuery.data : blendQuery.data
  const isLoading = mode === 'brew' ? brewQuery.isLoading : blendQuery.isLoading

  return (
    <div className="brew-page">
      <header className="brew-header">
        <h1>☕ The Sipping Rover</h1>
      </header>

      <div className="mode-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-tab ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="brew-content">
        {isLoading && <p className="brew-loading">Brewing recommendations...</p>}

        {!isLoading && mode === 'brew' && data && (
          <>
            {!data.unlocked && (
              <div className="brew-locked">
                <p>{data.message}</p>
                <Link to="/journal" className="btn-primary">Rate a cafe</Link>
              </div>
            )}
            {data.unlocked && (
              <div className="brew-cards">
                <CafeCard cafe={data.revisit} label="Your next revisit" />
                <CafeCard cafe={data.new_place} label="Somewhere new" />
              </div>
            )}
          </>
        )}

        {!isLoading && mode === 'blend' && data && (
          <>
            {data.empty && (
              <div className="brew-locked">
                <p>{data.message}</p>
                {data.fallback && brewQuery.data?.unlocked && (
                  <div className="brew-fallback">
                    <p className="fallback-label">Meanwhile, from your brew:</p>
                    <CafeCard cafe={brewQuery.data?.new_place} label="Somewhere new" />
                  </div>
                )}
              </div>
            )}
            {!data.empty && data.recommendation && (
              <div className="brew-cards">
                <CafeCard cafe={data.recommendation} label="Your network loves this" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
