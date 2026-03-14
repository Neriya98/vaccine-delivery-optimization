import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import CentreDashboard from './pages/centre/CentreDashboard'
import ZoneDashboard from './pages/zone/ZoneDashboard'
import DecideurDashboard from './pages/decideur/DecideurDashboard'
import PrivateRoute from './components/PrivateRoute'

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'centre')  return <Navigate to="/centre"  replace />
  if (user.role === 'zone')    return <Navigate to="/zone"    replace />
  if (user.role === 'decideur') return <Navigate to="/decideur" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRedirect />} />
          <Route
            path="/centre"
            element={<PrivateRoute role="centre"><CentreDashboard /></PrivateRoute>}
          />
          <Route
            path="/zone"
            element={<PrivateRoute role="zone"><ZoneDashboard /></PrivateRoute>}
          />
          <Route
            path="/decideur"
            element={<PrivateRoute role="decideur"><DecideurDashboard /></PrivateRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
