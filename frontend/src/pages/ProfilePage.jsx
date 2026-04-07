import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import client from '../api/client'
import './ProfilePage.css'

const ORDERING_PRESETS = {
  'Lock In': [7, 0, 8, 6, 2, 1, 3, 4, 5],
  Social: [4, 3, 5, 0, 1, 2, 6, 7, 8],
}

export default function ProfilePage() {
  const { userId } = useParams()
  const { user: me, setUser, signOut } = useAuth()
  const navigate = useNavigate()
  const targetId = userId || me?.id
  const isSelf = !userId || userId === me?.id

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [homeCafeQuery, setHomeCafeQuery] = useState('')
  const [homeCafeResults, setHomeCafeResults] = useState([])
  const [notifyFollower, setNotifyFollower] = useState(me?.notify_new_follower ?? true)
  const [notifyRating, setNotifyRating] = useState(me?.notify_followed_rating ?? true)
  const [notifyRecap, setNotifyRecap] = useState(me?.notify_monthly_recap ?? true)
  const [notifyInactivity, setNotifyInactivity] = useState(me?.notify_inactivity ?? true)
  const [defaultVisibility, setDefaultVisibility] = useState(me?.default_review_visibility ?? 'public')
  const [selectedPreset, setSelectedPreset] = useState(null)

  const { data: profile } = useQuery({
    queryKey: ['profile', targetId],
    queryFn: () => client.get(`/users/${targetId}`).then((r) => r.data),
    enabled: !!targetId,
  })

const searchHomeCafe = async (e) => {
    e.preventDefault()
    if (!homeCafeQuery.trim()) return
    const res = await client.get(`/cafes/search?q=${encodeURIComponent(homeCafeQuery)}`)
    setHomeCafeResults(res.data)
  }

  const setHomeCafe = async (cafe) => {
    const res = await client.patch('/users/me', { home_cafe_id: cafe.id })
    setUser(res.data)
    setHomeCafeResults([])
    setHomeCafeQuery('')
  }

  const clearHomeCafe = async () => {
    const res = await client.patch('/users/me', { home_cafe_id: null })
    setUser(res.data)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const ordering = selectedPreset ? ORDERING_PRESETS[selectedPreset] : me.characteristic_ordering
      const res = await client.patch('/users/me', {
        notify_new_follower: notifyFollower,
        notify_followed_rating: notifyRating,
        notify_monthly_recap: notifyRecap,
        notify_inactivity: notifyInactivity,
        default_review_visibility: defaultVisibility,
        characteristic_ordering: ordering,
      })
      setUser(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  if (!profile) return <div className="page-loading">Loading...</div>

  return (
    <div className="profile-page">
      <header className="profile-header">
        <h1>{profile.display_name}</h1>
        <div className="profile-stats">
          <span><strong>{profile.follower_count}</strong> followers</span>
          <span><strong>{profile.following_count}</strong> following</span>
        </div>
      </header>

      <section className="profile-section">
        <h2>Home Cafe</h2>
        {me?.home_cafe_id ? (
          <div className="home-cafe-set">
            <Link to={`/cafe/${me.home_cafe_id}`} className="home-cafe-link">
              {me.home_cafe_name || 'Your home cafe'} →
            </Link>
            {isSelf && <button className="home-cafe-clear" onClick={clearHomeCafe}>Clear</button>}
          </div>
        ) : isSelf ? (
          <div className="home-cafe-search">
            <form onSubmit={searchHomeCafe} className="home-cafe-form">
              <input
                type="text"
                placeholder="Search for your home cafe..."
                value={homeCafeQuery}
                onChange={(e) => setHomeCafeQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>
            {homeCafeResults.length > 0 && (
              <ul className="home-cafe-results">
                {homeCafeResults.map((cafe) => (
                  <li key={cafe.id} onClick={() => setHomeCafe(cafe)}>
                    <strong>{cafe.name}</strong>
                    <span>{cafe.address}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="muted">No home cafe set.</p>
        )}
      </section>

      {isSelf && (
        <>
          <section className="profile-section">
            <h2>Discovery Mode</h2>
            <p className="settings-hint">Preset ordering for recommendations.</p>
            <div className="preset-buttons">
              {Object.keys(ORDERING_PRESETS).map((name) => (
                <button
                  key={name}
                  className={`preset-btn ${selectedPreset === name ? 'active' : ''}`}
                  onClick={() => setSelectedPreset(name)}
                >{name}</button>
              ))}
            </div>
          </section>

          <section className="profile-section">
            <h2>Default Review Visibility</h2>
            <div className="toggle-row">
              <button className={`visibility-btn ${defaultVisibility === 'public' ? 'active' : ''}`} onClick={() => setDefaultVisibility('public')}>Public</button>
              <button className={`visibility-btn ${defaultVisibility === 'private' ? 'active' : ''}`} onClick={() => setDefaultVisibility('private')}>Private</button>
            </div>
          </section>

          <section className="profile-section">
            <h2>Notifications</h2>
            {[
              ['New follower', notifyFollower, setNotifyFollower],
              ['Followed user rates a cafe', notifyRating, setNotifyRating],
              ['Monthly tier list recap', notifyRecap, setNotifyRecap],
              ['Inactivity reminder', notifyInactivity, setNotifyInactivity],
            ].map(([label, value, setter]) => (
              <div key={label} className="toggle-row">
                <span>{label}</span>
                <button className={`toggle-btn ${value ? 'on' : 'off'}`} onClick={() => setter(!value)}>
                  {value ? 'On' : 'Off'}
                </button>
              </div>
            ))}
          </section>

          <div className="profile-actions">
            <button className="btn-primary save-btn" onClick={handleSave} disabled={saving}>
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
          </div>
        </>
      )}
    </div>
  )
}
