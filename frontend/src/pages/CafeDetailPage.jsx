import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getCafe, fetchCafeLogo } from '../api/cafes'
import { getPublicVisitsForCafe, getMyVisitForCafe } from '../api/visits'
import './CafeDetailPage.css'

const CHARACTERISTICS = [
  ['coffee_quality', 'Coffee'],
  ['food', 'Food'],
  ['price', 'Price'],
  ['noise', 'Noise'],
  ['crowd', 'Crowd'],
  ['aesthetic', 'Aesthetic'],
  ['comfort', 'Comfort'],
  ['wifi', 'WiFi'],
  ['privacy', 'Privacy'],
]

const STARS = { 1: '★☆☆', 2: '★★☆', 3: '★★★' }

const YELP_SEARCH = (name, address) =>
  `https://www.yelp.com/search?find_desc=${encodeURIComponent(name)}&find_loc=${encodeURIComponent(address)}`

function ReviewCard({ review, isOwn, cafeId }) {
  return (
    <div className="review-card">
      <div className="review-thumb">{review.thumb === 'up' ? '👍' : review.thumb === 'down' ? '👎' : '—'}</div>
      <div className="review-body">
        {isOwn && <div className="review-byline">Your review</div>}
        {review.has_details && (
          <div className="review-scores">
            {CHARACTERISTICS.map(([key, label]) => (
              <div key={key} className="review-score-row">
                <span className="score-label">{label}</span>
                <span className="score-stars">{STARS[review[key]] || '★★☆'}</span>
              </div>
            ))}
          </div>
        )}
        {isOwn && (
          <Link to={`/cafe/${cafeId}/rate-details`} className="add-details-link">
            {review.has_details ? 'Edit details →' : 'Add details →'}
          </Link>
        )}
        {review.notes && <p className="review-notes">{review.notes}</p>}
      </div>
    </div>
  )
}

export default function CafeDetailPage() {
  const { cafeId } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: cafe } = useQuery({
    queryKey: ['cafe', cafeId],
    queryFn: async () => {
      const r = await getCafe(cafeId)
      const cafe = r.data
      // Lazily scrape logo if the cafe has a website but no photo yet
      if (cafe.website && !cafe.photo_url) {
        fetchCafeLogo(cafeId).then((res) => {
          if (res.data.photo_url) {
            queryClient.setQueryData(['cafe', cafeId], res.data)
          }
        }).catch(() => {})
      }
      return cafe
    },
  })

  const { data: myVisit } = useQuery({
    queryKey: ['my-visit', cafeId],
    queryFn: () => getMyVisitForCafe(cafeId).then((r) => r.data).catch(() => null),
    enabled: !!user,
  })

  const { data: reviews } = useQuery({
    queryKey: ['cafe-reviews', cafeId],
    queryFn: () => getPublicVisitsForCafe(cafeId).then((r) => r.data),
  })

  if (!cafe) return <div className="page-loading">Loading...</div>

  const showYelp = (cafe.platform_rating_count || 0) < 5
  const othersReviews = (reviews || []).filter((r) => r.id !== myVisit?.id)

  return (
    <div className="cafe-detail-page">
      <header className="cafe-detail-header">
        <Link to="/" className="back-link">← Back</Link>
        <h1>{cafe.name}</h1>
        <p className="cafe-detail-address">{cafe.address}</p>
        {showYelp && (
          <a
            href={YELP_SEARCH(cafe.name, cafe.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="yelp-link"
          >
            View on Yelp →
          </a>
        )}
      </header>

      <section className="cafe-reviews">
        {myVisit && (
          <ReviewCard review={myVisit} isOwn={true} cafeId={cafeId} />
        )}

        {othersReviews.length > 0 && (
          <>
            {myVisit && <div className="reviews-divider">Other reviews</div>}
            {othersReviews.map((review) => (
              <ReviewCard key={review.id} review={review} isOwn={false} cafeId={cafeId} />
            ))}
          </>
        )}

        {!myVisit && othersReviews.length === 0 && (
          <div className="cafe-no-reviews">
            <p>No reviews yet. Be the first to rate this cafe!</p>
          </div>
        )}
      </section>
    </div>
  )
}
