import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchCafes } from '../api/cafes'
import { createVisit } from '../api/visits'
import client from '../api/client'
import { useAuth } from '../hooks/useAuth'
import './OnboardingPage.css'

const REQUIRED = 3

export default function OnboardingPage() {
  const [step, setStep] = useState('search') // search | rate
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedCafe, setSelectedCafe] = useState(null)
  const [rated, setRated] = useState([]) // list of cafe names
  const [thumb, setThumb] = useState(null)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await searchCafes(query)
      setResults(res.data)
    } finally {
      setSearching(false)
    }
  }

  const selectCafe = (cafe) => {
    setSelectedCafe(cafe)
    setThumb(null)
    setStep('rate')
  }

  const submitRating = async () => {
    if (!thumb) return
    setSubmitting(true)
    try {
      await createVisit({ cafe_id: selectedCafe.id, thumb })
      const newRated = [...rated, selectedCafe.name]
      setRated(newRated)

      if (newRated.length >= REQUIRED) {
        await client.patch('/users/me', { onboarding_complete: true })
        const meRes = await client.get('/users/me')
        setUser(meRes.data)
        navigate('/')
      } else {
        setStep('search')
        setSelectedCafe(null)
        setQuery('')
        setResults([])
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <h1>☕ Welcome, Rover!</h1>
        <p>Before we brew your first recommendations, tell us about cafes you already know.</p>
        <div className="progress-dots">
          {Array.from({ length: REQUIRED }).map((_, i) => (
            <span key={i} className={`dot ${i < rated.length ? 'filled' : ''}`} />
          ))}
        </div>
        <p className="progress-label">{rated.length} of {REQUIRED} rated</p>
      </div>

      {step === 'search' && (
        <div className="onboarding-search">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for a cafe you know..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" disabled={searching}>{searching ? '...' : 'Search'}</button>
          </form>
          <ul className="cafe-results">
            {results.map((cafe) => (
              <li key={cafe.id} onClick={() => selectCafe(cafe)}>
                <strong>{cafe.name}</strong>
                <span>{cafe.address}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'rate' && selectedCafe && (
        <div className="onboarding-rate">
          <h2>{selectedCafe.name}</h2>
          <p className="cafe-address">{selectedCafe.address}</p>
          <p className="rate-prompt">How was it overall?</p>
          <div className="thumb-buttons">
            <button
              className={`thumb-btn ${thumb === 'up' ? 'selected' : ''}`}
              onClick={() => setThumb('up')}
            >👍 Good vibes</button>
            <button
              className={`thumb-btn ${thumb === 'down' ? 'selected' : ''}`}
              onClick={() => setThumb('down')}
            >👎 Not for me</button>
          </div>
          <button className="btn-primary" onClick={submitRating} disabled={!thumb || submitting}>
            {submitting ? 'Saving...' : rated.length + 1 < REQUIRED ? 'Next cafe →' : 'Finish & Brew →'}
          </button>
          <button className="btn-back" onClick={() => setStep('search')}>← Back to search</button>
        </div>
      )}
    </div>
  )
}
