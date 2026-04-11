import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import BrewTodayPage from './pages/BrewTodayPage'
import JournalPage from './pages/JournalPage'
import ProfilePage from './pages/ProfilePage'
import CafeDetailPage from './pages/CafeDetailPage'
import SettingsPage from './pages/SettingsPage'
import TierListPage from './pages/TierListPage'
import RateDetailsPage from './pages/RateDetailsPage'
import TierListViewPage from './pages/TierListViewPage'
import FeedPage from './pages/FeedPage'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">Brewing...</div>
  if (!user) return <Navigate to="/login" replace />
  if (!user.onboarding_complete) return <Navigate to="/onboarding" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<RequireAuth><BrewTodayPage /></RequireAuth>} />
<Route path="/journal" element={<RequireAuth><JournalPage /></RequireAuth>} />
        <Route path="/feed" element={<RequireAuth><FeedPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/profile/:userId" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/cafe/:cafeId" element={<RequireAuth><CafeDetailPage /></RequireAuth>} />
        <Route path="/cafe/:cafeId/rate-details" element={<RequireAuth><RateDetailsPage /></RequireAuth>} />
        <Route path="/tier-list" element={<RequireAuth><TierListPage /></RequireAuth>} />
        <Route path="/tier-list/:id" element={<RequireAuth><TierListViewPage /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
