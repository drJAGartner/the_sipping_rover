import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTierList } from '../api/tierLists'
import CafeAvatar from '../components/CafeAvatar'
import './TierListViewPage.css'

const TIERS = ['S', 'A', 'B', 'C', 'D', 'F']
const TIER_COLORS = { S: '#D4A017', A: '#4CAF50', B: '#2196F3', C: '#FF9800', D: '#FF5722', F: '#9E9E9E' }

export default function TierListViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shared, setShared] = useState(false)

  const { data: tierList, isLoading } = useQuery({
    queryKey: ['tier-list', id],
    queryFn: () => getTierList(id).then((r) => r.data),
  })

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: tierList.name, url })
    } else {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  if (isLoading) return <div className="page-loading">Loading…</div>
  if (!tierList) return <div className="page-loading">List not found.</div>

  const entriesByTier = TIERS.reduce((acc, t) => {
    acc[t] = tierList.entries.filter((e) => e.tier === t)
    return acc
  }, {})

  const hasAnyEntries = tierList.entries.length > 0

  return (
    <div className="tier-list-view-page">
      <header className="tier-view-header">
        <button className="back-link" onClick={() => navigate(-1)}>← Back</button>
        <div className="tier-view-title-row">
          <h1>{tierList.name}</h1>
          <button className="share-btn" onClick={handleShare}>
            {shared ? '✓ Copied!' : '↑ Share'}
          </button>
        </div>
      </header>

      {!hasAnyEntries ? (
        <div className="tier-view-empty">
          <p>No cafes tiered yet.</p>
        </div>
      ) : (
        <div className="tier-view-board">
          {TIERS.map((tier) => {
            const entries = entriesByTier[tier]
            if (!entries.length) return null
            return (
              <div key={tier} className="tier-view-row">
                <div className="tier-view-label" style={{ background: TIER_COLORS[tier] }}>{tier}</div>
                <div className="tier-view-chips">
                  {entries.map((e) => (
                    <div key={e.id} className="tier-view-chip">
                      <CafeAvatar name={e.cafe_name} website={e.cafe_website} photoUrl={e.cafe_photo_url} size={28} />
                      <span>{e.cafe_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
