import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core'
import { useAuth } from '../hooks/useAuth'
import { getMyVisits } from '../api/visits'
import { createTierList } from '../api/tierLists'
import CafeAvatar from '../components/CafeAvatar'
import './TierListPage.css'

const TIERS = ['S', 'A', 'B', 'C', 'D', 'F']
const TIER_COLORS = { S: '#D4A017', A: '#4CAF50', B: '#2196F3', C: '#FF9800', D: '#FF5722', F: '#9E9E9E' }

// ── Seed picker ──────────────────────────────────────────────────────────────

function SeedPicker({ onPick }) {
  const now = new Date()
  const monthName = now.toLocaleString('default', { month: 'long' })
  const year = now.getFullYear()

  return (
    <div className="seed-picker">
      <h1>New Tier List</h1>
      <p className="seed-subtitle">How do you want to seed it?</p>
      <div className="seed-options">
        <button className="seed-card" onClick={() => onPick('month')}>
          <span className="seed-icon">📅</span>
          <div className="seed-card-text">
            <strong>This Month's Check-ins</strong>
            <span>Cafes you visited in {monthName} {year}</span>
          </div>
        </button>
        <button className="seed-card" onClick={() => onPick('city')}>
          <span className="seed-icon">📍</span>
          <div className="seed-card-text">
            <strong>My Likes from a City</strong>
            <span>All thumbs-up cafes in a specific city</span>
          </div>
        </button>
        <button className="seed-card" onClick={() => onPick('custom')}>
          <span className="seed-icon">✏️</span>
          <div className="seed-card-text">
            <strong>Custom List</strong>
            <span>Start from all your rated cafes</span>
          </div>
        </button>
      </div>
    </div>
  )
}

// ── City input ───────────────────────────────────────────────────────────────

function CityInput({ onConfirm }) {
  const [city, setCity] = useState('')
  return (
    <div className="city-input-screen">
      <h2>Which city?</h2>
      <p className="seed-subtitle">We'll pull your liked cafes from that city.</p>
      <input
        className="city-input"
        type="text"
        placeholder="e.g. Austin"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        autoFocus
      />
      <button className="btn-primary" disabled={!city.trim()} onClick={() => onConfirm(city.trim())}>
        Build List
      </button>
    </div>
  )
}

// ── DnD primitives ───────────────────────────────────────────────────────────

function DraggableTierChip({ cafeId, cafeName, photoUrl, website, fromTier }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cafeId,
    data: { fromTier },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="tier-chip"
      style={{ opacity: isDragging ? 0.25 : 1, touchAction: 'none' }}
    >
      <CafeAvatar name={cafeName} photoUrl={photoUrl} website={website} size={22} />
      <span>{cafeName}</span>
    </div>
  )
}

function DroppableTierRow({ tier, cafes }) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-${tier}` })
  return (
    <div className={`tier-row ${isOver ? 'tier-row-over' : ''}`}>
      <div className="tier-label" style={{ background: TIER_COLORS[tier] }}>{tier}</div>
      <div ref={setNodeRef} className="tier-chips">
        {cafes.map((c) => (
          <DraggableTierChip
            key={c.cafe_id}
            cafeId={c.cafe_id}
            cafeName={c.cafe_name}
            photoUrl={c.photo_url}
            website={c.cafe_website}
            fromTier={tier}
          />
        ))}
      </div>
    </div>
  )
}

function DraggableUntieredRow({ visit }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: visit.cafe_id,
    data: { fromTier: null },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`untiered-row ${isDragging ? 'untiered-row-dragging' : ''}`}
      style={{ touchAction: 'none' }}
    >
      <CafeAvatar name={visit.cafe_name} photoUrl={visit.photo_url} website={visit.cafe_website} size={40} />
      <span className="untiered-cafe-name">{visit.cafe_name}</span>
    </div>
  )
}

function DroppableUntiered({ children, isOver }) {
  const { setNodeRef } = useDroppable({ id: 'untiered' })
  return (
    <div ref={setNodeRef} className={`untiered-section ${isOver ? 'untiered-section-over' : ''}`}>
      {children}
    </div>
  )
}

// ── Tier editor ──────────────────────────────────────────────────────────────

function TierEditor({ cafes, defaultName, onSave }) {
  const [name, setName] = useState(defaultName)
  const [tierMap, setTierMap] = useState({})
  const [activeId, setActiveId] = useState(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const untiered = cafes.filter((c) => !tierMap[c.cafe_id])
  const tieredCount = Object.keys(tierMap).length
  const activeCafe = cafes.find((c) => c.cafe_id === activeId)

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const cafeId = active.id
    if (over.id === 'untiered') {
      setTierMap((prev) => { const n = { ...prev }; delete n[cafeId]; return n })
    } else {
      const tier = over.id.replace('tier-', '')
      setTierMap((prev) => ({ ...prev, [cafeId]: tier }))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const entries = Object.entries(tierMap).map(([cafeId, tier], i) => ({
        cafe_id: cafeId, tier, position: i,
      }))
      await onSave(name, entries)
    } finally {
      setSaving(false)
    }
  }

  // Track if the active drag is over the untiered zone (for highlighting)
  // We'll use the DragOverlay approach — isOver computed in DroppableUntiered itself

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="tier-editor">
        <div className="tier-name-row">
          <input
            className="tier-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name..."
          />
          <span className="tier-progress">{tieredCount}/{cafes.length}</span>
        </div>

        <div className="tier-board">
          {TIERS.map((tier) => (
            <DroppableTierRow
              key={tier}
              tier={tier}
              cafes={cafes.filter((c) => tierMap[c.cafe_id] === tier)}
            />
          ))}
        </div>

        {untiered.length > 0 && (
          <DroppableUntiered>
            <p className="untiered-label">Untiered · {untiered.length} left — drag to a tier above</p>
            {untiered.map((c) => (
              <DraggableUntieredRow key={c.cafe_id} visit={c} />
            ))}
          </DroppableUntiered>
        )}

        <div className="tier-footer">
          <button className="btn-primary" onClick={handleSave} disabled={saving || tieredCount === 0}>
            {saving ? 'Saving...' : 'Save & Share'}
          </button>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCafe ? (
          <div className="tier-chip drag-overlay">
            <CafeAvatar name={activeCafe.cafe_name} photoUrl={activeCafe.photo_url} website={activeCafe.cafe_website} size={22} />
            <span>{activeCafe.cafe_name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TierListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const now = new Date()
  const [step, setStep] = useState('seed')
  const [mode, setMode] = useState(null)
  const [city, setCity] = useState(null)

  const { data: visits } = useQuery({
    queryKey: ['my-visits'],
    queryFn: () => getMyVisits().then((r) => r.data),
    enabled: !!user,
  })

  const cafes = useMemo(() => {
    if (!visits) return []
    const seen = new Set()
    const unique = visits.filter((v) => {
      if (seen.has(v.cafe_id)) return false
      seen.add(v.cafe_id)
      return true
    })
    if (mode === 'month') {
      return unique.filter((v) => {
        if (!v.last_checkin_at) return false
        const d = new Date(v.last_checkin_at)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
    }
    if (mode === 'city' && city) {
      const q = city.toLowerCase()
      return unique.filter(
        (v) => v.thumb === 'up' && (
          !v.cafe_address ||
          v.cafe_address.toLowerCase().includes(q)
        )
      )
    }
    return unique
  }, [visits, mode, city])

  const defaultName = useMemo(() => {
    if (mode === 'month') return now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear()
    if (mode === 'city' && city) return `${city} Favorites`
    return 'My Tier List'
  }, [mode, city])

  const handlePick = (m) => {
    setMode(m)
    setStep(m === 'city' ? 'city' : 'editor')
  }

  const handleSave = async (name, entries) => {
    await createTierList({ name, entries, visibility: 'public' })
    queryClient.invalidateQueries({ queryKey: ['tier-lists', user.id] })
    navigate('/journal')
  }

  const goBack = () => {
    if (step === 'editor' && mode === 'city') setStep('city')
    else setStep('seed')
  }

  return (
    <div className="tier-list-page">
      <header className="page-header">
        <div className="page-header-row">
          {step !== 'seed' && <button className="back-link" onClick={goBack}>←</button>}
          <h1>Tier List</h1>
        </div>
      </header>

      {step === 'seed' && <SeedPicker onPick={handlePick} />}
      {step === 'city' && <CityInput onConfirm={(c) => { setCity(c); setStep('editor') }} />}
      {step === 'editor' && cafes.length === 0 && (
        <div className="tier-empty">
          <p>No cafes found for this filter.</p>
          <button className="back-link" onClick={() => setStep('seed')}>Try a different seed</button>
        </div>
      )}
      {step === 'editor' && cafes.length > 0 && (
        <TierEditor cafes={cafes} defaultName={defaultName} onSave={handleSave} />
      )}
    </div>
  )
}
