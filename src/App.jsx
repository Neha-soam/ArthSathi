import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { configured } from './lib/supabase'
import Layout from './components/Layout.jsx'
import { PageSkeleton } from './components/Skeleton.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
const Budgeting = lazy(() => import('./pages/Budgeting.jsx')) // loaded on demand: keeps the first screen fast on mobile data
const Scam = lazy(() => import('./pages/Scam.jsx')) // loaded on demand: keeps the first screen fast on mobile data
const Invest = lazy(() => import('./pages/Invest.jsx')) // loaded on demand: keeps the first screen fast on mobile data
const Tax = lazy(() => import('./pages/Tax.jsx')) // loaded on demand: keeps the first screen fast on mobile data
const Market = lazy(() => import('./pages/Market.jsx')) // loaded on demand: keeps the first screen fast on mobile data
const Business = lazy(() => import('./pages/Business.jsx')) // loaded on demand: keeps the first screen fast on mobile data
const Profile = lazy(() => import('./pages/Profile.jsx')) // loaded on demand: keeps the first screen fast on mobile data
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

function Protected({ children }) {
  const { user, loading, recovery } = useAuth()
  if (loading) return <div className="mx-auto max-w-5xl p-6"><PageSkeleton /></div>
  if (user && recovery) return <Navigate to="/reset-password" replace /> // recovery session may only set a new password
  return user ? children : <Navigate to="/login" replace />
}
export default function App() {
  if (!configured) return <div className="m-6 card text-sm">Missing <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>. Copy <code>.env.example</code> to <code>.env.local</code>, fill it in, and restart <code>npm run dev</code>.</div>
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/budgeting" element={<Budgeting />} />
        <Route path="/scam" element={<Scam />} />
        <Route path="/invest" element={<Invest />} />
        <Route path="/tax" element={<Tax />} />
        <Route path="/market" element={<Market />} />
        <Route path="/business" element={<Business />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
