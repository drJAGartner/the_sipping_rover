import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import './AuthPage.css'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await register(email, password, displayName)
      await signIn(res.data.access_token)
      navigate('/onboarding')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-header">
        <h1 className="auth-logo">☕ The Sipping Rover</h1>
        <p className="auth-tagline">Find your next great cafe.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Join the crew</h2>
        {error && <p className="auth-error">{error}</p>}
        <label>
          Name
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="How should we call you?" />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
        </label>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Setting up...' : 'Create Account'}
        </button>
        <p className="auth-switch">Already a rover? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  )
}
