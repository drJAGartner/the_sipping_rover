import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMyVisits, createVisit, updateVisit } from '../api/visits'
import { searchCafes, createCafe } from '../api/cafes'
import client from '../api/client'
import './JournalPage.css'

const THUMB_LABEL = { up: '👍', down: '👎' }

// ── Inline notes editor ───────────────────────────────────────────────────────

function InlineNotesEditor({ initialNotes, onSave, onClose }) {
  const [value, setValue] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(value) } finally { setSaving(false) }
  }

  return (
    <div className="notes-editor">
      <textarea
        className="notes-textarea"
        placeholder="Notes (250 chars max)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={250}
        autoFocus
        rows={3}
      />
      <div className="notes-editor-actions">
        <button className="notes-cancel-btn" onClick={onClose}>Cancel</button>
        <button className="notes-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Journal item ──────────────────────────────────────────────────────────────

function JournalItem({ visit, isHome }) {
  const [editingNotes, setEditingNotes] = useState(false)
  const queryClient = useQueryClient()

  const saveNotes = async (value) => {
    await updateVisit(visit.id, { notes: value || null })
    queryClient.invalidateQueries({ queryKey: ['my-visits'] })
    setEditingNotes(false)
  }

  return (
    <li className="journal-item">
      <Link to={`/cafe/${visit.cafe_id}`} className="journal-cafe-row">
        <span className="journal-thumb">{THUMB_LABEL[visit.thumb] || '—'}</span>
        <div className="journal-info">
          <span className="journal-cafe-name">
            {isHome && <span className="home-pin">🏠 </span>}
            {visit.cafe_name || visit.cafe_id}
          </span>
        </div>
        <span className={`journal-visibility ${visit.visibility}`}>{visit.visibility}</span>
      </Link>

      {editingNotes ? (
        <InlineNotesEditor
          initialNotes={visit.notes}
          onSave={saveNotes}
          onClose={() => setEditingNotes(false)}
        />
      ) : (
        <div className="journal-notes-row" onClick={() => setEditingNotes(true)}>
          {visit.notes
            ? <p className="journal-notes">{visit.notes}</p>
            : <span className="journal-add-note">+ Add note</span>
          }
        </div>
      )}
    </li>
  )
}

// ── Add entry panel ───────────────────────────────────────────────────────────

function AddEntryPanel({ onClose }) {
  const [step, setStep] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [selectedCafe, setSelectedCafe] = useState(null)
  const [newAddress, setNewAddress] = useState('')
  const [thumb, setThumb] = useState(null)
  const [notes, setNotes] = useState('')
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await searchCafes(query)
      setResults(res.data)
      setSearched(true)
    } finally {
      setSearching(false)
    }
  }

  const handleAddCafe = async () => {
    setSaving(true)
    try {
      const res = await createCafe({ name: query.trim(), address: newAddress.trim() || 'Unknown location' })
      setSelectedCafe(res.data)
      setStep('rate')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!thumb) return
    setSaving(true)
    try {
      await createVisit({ cafe_id: selectedCafe.id, thumb, notes: notes || null })
      queryClient.invalidateQueries({ queryKey: ['my-visits'] })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="add-entry-panel">
      <div className="add-entry-header">
        <span className="add-entry-title">
          {step === 'rate' ? selectedCafe.name : step === 'add-cafe' ? `Add "${query}"` : 'New Entry'}
        </span>
        <button className="add-entry-close" onClick={onClose}>✕</button>
      </div>

      {step === 'search' && (
        <>
          <form onSubmit={handleSearch} className="add-entry-search-form">
            <input
              type="text"
              placeholder="Search for a cafe…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearched(false); setResults([]) }}
              autoFocus
            />
            <button type="submit" disabled={searching || !query.trim()}>{searching ? '…' : 'Go'}</button>
          </form>
          {searched && results.length === 0 && (
            <p className="add-entry-no-results">No results for "{query}".</p>
          )}
          {results.length > 0 && (
            <ul className="add-entry-results">
              {results.map((cafe) => (
                <li key={cafe.id} onClick={() => { setSelectedCafe(cafe); setStep('rate') }}>
                  <strong>{cafe.name}</strong>
                  <span>{cafe.address}</span>
                </li>
              ))}
            </ul>
          )}
          {searched && (
            <div className="add-entry-not-found">
              <button className="add-entry-manual-btn" onClick={() => setStep('add-cafe')}>
                + Add "{query}" manually
              </button>
            </div>
          )}
        </>
      )}

      {step === 'add-cafe' && (
        <div className="add-entry-rate">
          <p className="add-entry-address">Include city & state so it shows up in city filters.</p>
          <input
            className="add-cafe-address-input"
            type="text"
            placeholder="e.g. 3004 Norfolk Dr, Austin, TX 78702"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            autoFocus
          />
          {newAddress.trim() && !newAddress.includes(',') && (
            <p className="add-cafe-address-hint">Tip: add the city too — e.g. "Austin, TX"</p>
          )}
          <button className="btn-primary" onClick={handleAddCafe} disabled={saving}>
            {saving ? 'Adding…' : 'Add Cafe & Rate It →'}
          </button>
          <button className="add-entry-back" onClick={() => setStep('search')}>← Back</button>
        </div>
      )}

      {step === 'rate' && (
        <div className="add-entry-rate">
          <p className="add-entry-address">{selectedCafe.address}</p>
          <div className="add-entry-thumbs">
            <button className={`thumb-btn ${thumb === 'up' ? 'selected' : ''}`} onClick={() => setThumb('up')}>
              👍 Good vibes
            </button>
            <button className={`thumb-btn ${thumb === 'down' ? 'selected' : ''}`} onClick={() => setThumb('down')}>
              👎 Not for me
            </button>
          </div>
          <textarea
            className="notes-textarea"
            placeholder="Notes (optional, 250 chars max)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={250}
            rows={3}
          />
          <button className="btn-primary" onClick={handleSave} disabled={!thumb || saving}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
          <button className="add-entry-back" onClick={() => setStep('search')}>← Back</button>
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [showAddEntry, setShowAddEntry] = useState(false)

  const { data: visits, isLoading } = useQuery({
    queryKey: ['my-visits'],
    queryFn: () => getMyVisits().then((r) => r.data),
  })

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => client.get('/users/me').then((r) => r.data),
  })

  const { data: tierLists } = useQuery({
    queryKey: ['tier-lists', me?.id],
    queryFn: () => client.get(`/tier-lists/user/${me.id}`).then((r) => r.data),
    enabled: !!me?.id,
  })

  const sortedVisits = useMemo(() => {
    if (!visits) return []
    const homeCafeId = me?.home_cafe_id
    if (!homeCafeId) return visits
    return [...visits].sort((a, b) => {
      if (a.cafe_id === homeCafeId) return -1
      if (b.cafe_id === homeCafeId) return 1
      return 0
    })
  }, [visits, me?.home_cafe_id])

  return (
    <div className="journal-page">
      <header className="page-header">
        <div className="page-header-row">
          <h1>My Journal</h1>
          <button className="add-entry-btn" onClick={() => setShowAddEntry(true)}>+ New</button>
        </div>
      </header>

      {showAddEntry && <AddEntryPanel onClose={() => setShowAddEntry(false)} />}

      {isLoading && <p className="page-loading">Loading…</p>}

      {!isLoading && !visits?.length && !showAddEntry && (
        <div className="journal-empty">
          <p>No visits logged yet.</p>
          <p className="muted">Tap <strong>+ New</strong> to add your first entry.</p>
        </div>
      )}

      {sortedVisits.length > 0 && (
        <ul className="journal-list">
          {sortedVisits.map((visit) => (
            <JournalItem
              key={visit.id}
              visit={visit}
              isHome={visit.cafe_id === me?.home_cafe_id}
            />
          ))}
        </ul>
      )}

      <section className="journal-section">
        <div className="journal-section-header">
          <h2>Tier Lists</h2>
          <Link to="/tier-list" className="journal-section-action">+ New</Link>
        </div>
        {tierLists?.length > 0 ? (
          <ul className="tier-list-previews">
            {tierLists.map((tl) => (
              <li key={tl.id} className="tier-list-preview">
                <Link to={`/tier-list/${tl.id}`} className="tier-list-preview-name">{tl.name}</Link>
                <span className={`visibility-badge ${tl.visibility}`}>{tl.visibility}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No tier lists yet.</p>
        )}
      </section>
    </div>
  )
}
