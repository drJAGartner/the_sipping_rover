import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getFeed } from '../api/users'
import './FeedPage.css'

function FeedItem({ visit }) {
  const date = visit.last_checkin_at
    ? new Date(visit.last_checkin_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : new Date(visit.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="feed-item">
      <div className="feed-item-header">
        <Link to={`/profile/${visit.user_id}`} className="feed-user-name">
          {visit.user_display_name}
        </Link>
        <span className="feed-date">{date}</span>
      </div>
      <Link to={`/cafe/${visit.cafe_id}`} className="feed-cafe-row">
        <span className="feed-thumb">
          {visit.thumb === 'up' ? '👍' : visit.thumb === 'down' ? '👎' : '—'}
        </span>
        <span className="feed-cafe-name">{visit.cafe_name}</span>
      </Link>
      {visit.notes && <p className="feed-notes">{visit.notes}</p>}
    </div>
  )
}

export default function FeedPage() {
  const { data: feed, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => getFeed().then((r) => r.data),
  })

  return (
    <div className="feed-page">
      <header className="page-header">
        <div className="page-header-row">
          <h1>Feed</h1>
        </div>
      </header>

      {isLoading && <p className="page-loading">Loading…</p>}

      {!isLoading && feed?.length === 0 && (
        <div className="feed-empty">
          <p>Nothing here yet.</p>
          <p className="muted">Follow other users to see their reviews.</p>
        </div>
      )}

      {feed?.length > 0 && (
        <div className="feed-list">
          {feed.map((visit) => (
            <FeedItem key={visit.id} visit={visit} />
          ))}
        </div>
      )}
    </div>
  )
}
