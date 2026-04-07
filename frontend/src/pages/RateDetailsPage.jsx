import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyVisitForCafe, updateVisit } from '../api/visits'
import './RateDetailsPage.css'

const SCREENS = [
  {
    title: 'The Brew',
    characteristics: [
      { key: 'coffee_quality', label: 'Coffee Quality', hint: 'How good is the coffee?' },
      { key: 'food', label: 'Food & Snacks', hint: 'Worth ordering?' },
      { key: 'price', label: 'Price', hint: 'Value for what you get?' },
    ],
  },
  {
    title: 'The Vibe',
    characteristics: [
      { key: 'noise', label: 'Noise Level', hint: 'Quiet enough to think?' },
      { key: 'crowd', label: 'Crowd', hint: 'Too packed or just right?' },
      { key: 'aesthetic', label: 'Aesthetic', hint: 'Instagrammable? Cozy?' },
    ],
  },
  {
    title: 'The Setup',
    characteristics: [
      { key: 'comfort', label: 'Comfort', hint: 'Could you sit for hours?' },
      { key: 'wifi', label: 'WiFi', hint: 'Can you actually get work done?' },
      { key: 'privacy', label: 'Privacy', hint: 'Can you take a call?' },
    ],
  },
]

const RATING_OPTIONS = [
  { value: 1, label: 'Meh', stars: '★☆☆' },
  { value: 2, label: 'Ok', stars: '★★☆' },
  { value: 3, label: 'Great', stars: '★★★' },
]

export default function RateDetailsPage() {
  const { cafeId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: visit, isLoading } = useQuery({
    queryKey: ['my-visit', cafeId],
    queryFn: () => getMyVisitForCafe(cafeId).then((r) => r.data).catch(() => null),
  })

  const [screen, setScreen] = useState(0)
  const [scores, setScores] = useState({
    coffee_quality: 2,
    food: 2,
    price: 2,
    noise: 2,
    crowd: 2,
    aesthetic: 2,
    comfort: 2,
    wifi: 2,
    privacy: 2,
  })
  const [saving, setSaving] = useState(false)

  // Once visit loads, initialize scores from existing values
  const [initialized, setInitialized] = useState(false)
  if (visit && !initialized) {
    setInitialized(true)
    setScores({
      coffee_quality: visit.coffee_quality ?? 2,
      food: visit.food ?? 2,
      price: visit.price ?? 2,
      noise: visit.noise ?? 2,
      crowd: visit.crowd ?? 2,
      aesthetic: visit.aesthetic ?? 2,
      comfort: visit.comfort ?? 2,
      wifi: visit.wifi ?? 2,
      privacy: visit.privacy ?? 2,
    })
  }

  const isLast = screen === SCREENS.length - 1

  const handleNext = () => {
    if (isLast) {
      handleSave()
    } else {
      setScreen((s) => s + 1)
    }
  }

  const handleSave = async () => {
    if (!visit) return
    setSaving(true)
    try {
      await updateVisit(visit.id, { ...scores, has_details: true })
      queryClient.invalidateQueries({ queryKey: ['my-visit', cafeId] })
      queryClient.invalidateQueries({ queryKey: ['cafe-reviews', cafeId] })
      navigate(`/cafe/${cafeId}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <div className="page-loading">Loading...</div>
  if (!visit) return <div className="page-loading">No visit found. Rate this cafe first.</div>

  const current = SCREENS[screen]

  return (
    <div className="rate-details-page">
      <header className="rate-details-header">
        <button className="back-link" onClick={() => screen === 0 ? navigate(-1) : setScreen((s) => s - 1)}>
          ← Back
        </button>
        <div className="rate-details-progress">
          {SCREENS.map((_, i) => (
            <div key={i} className={`progress-dot ${i <= screen ? 'active' : ''}`} />
          ))}
        </div>
      </header>

      <div className="rate-details-screen">
        <h1 className="screen-title">{current.title}</h1>

        <div className="characteristics-list">
          {current.characteristics.map(({ key, label, hint }) => (
            <div key={key} className="characteristic-row">
              <div className="characteristic-labels">
                <span className="characteristic-name">{label}</span>
                <span className="characteristic-hint">{hint}</span>
              </div>
              <div className="rating-buttons">
                {RATING_OPTIONS.map(({ value, label: optLabel, stars }) => (
                  <button
                    key={value}
                    className={`rating-btn ${scores[key] === value ? 'active' : ''}`}
                    onClick={() => setScores((s) => ({ ...s, [key]: value }))}
                  >
                    <span className="rating-stars">{stars}</span>
                    <span className="rating-label">{optLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rate-details-footer">
        <button
          className="btn-primary next-btn"
          onClick={handleNext}
          disabled={saving}
        >
          {isLast ? (saving ? 'Saving...' : 'Save Details') : 'Next →'}
        </button>
      </div>
    </div>
  )
}
