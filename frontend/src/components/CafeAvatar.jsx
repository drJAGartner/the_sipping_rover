import { useState } from 'react'

const PALETTE = [
  '#6F4E37', '#8B5E3C', '#A0522D', '#7B4B2A',
  '#5C4033', '#795548', '#4E342E', '#3E2723',
]

function nameToColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function initials(name) {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

const SOCIAL_DOMAINS = ['instagram.com', 'facebook.com', 'tiktok.com', 'yelp.com', 'twitter.com', 'x.com', 'linktr.ee']

function logoUrlFromWebsite(website) {
  if (!website) return null
  try {
    const url = website.startsWith('http') ? website : `https://${website}`
    const { hostname } = new URL(url)
    const isSocial = SOCIAL_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d))
    if (isSocial) return null
    // Google's favicon service — reliable for any website, no API key required
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
  } catch {
    return null
  }
}

const avatarStyle = (size) => ({
  width: size,
  height: size,
  borderRadius: 8,
  flexShrink: 0,
})

export default function CafeAvatar({ name, photoUrl, website, size = 40 }) {
  const [failed, setFailed] = useState(false)

  const imgSrc = !failed && (photoUrl || logoUrlFromWebsite(website))

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={name}
        onError={() => setFailed(true)}
        style={{ ...avatarStyle(size), objectFit: 'contain', background: '#f5f5f5' }}
      />
    )
  }

  return (
    <div
      style={{
        ...avatarStyle(size),
        background: nameToColor(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: size * 0.35,
        letterSpacing: '0.02em',
        userSelect: 'none',
      }}
    >
      {initials(name)}
    </div>
  )
}
