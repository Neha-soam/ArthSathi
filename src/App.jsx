import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { configured } from './lib/supabase'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Budgeting from './pages/Budgeting.jsx'
import Scam from './pages/Scam.jsx'
import Invest from './pages/Invest.jsx'
import Tax from './pages/Tax.jsx'
import Market from './pages/Market.jsx'
import Business from './pages/Business.jsx'
import Profile from './pages/Profile.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

function Protected({ children }) {
  const { user, loading, recovery } = useAuth()
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>
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
