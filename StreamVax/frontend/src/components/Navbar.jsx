import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const ROLE_LABELS = {
  centre: 'Agent Centre',
  zone: 'Point Focal Zone',
  decideur: 'Décideur National',
}

export default function Navbar({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold tracking-tight">StreamVax</span>
        {title && (
          <span className="text-blue-300 text-sm hidden sm:inline">/ {title}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium leading-tight">{user?.nom}</p>
          <p className="text-xs text-blue-300">{ROLE_LABELS[user?.role]}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-blue-600 hover:bg-blue-800 text-sm px-3 py-1.5 rounded-lg transition"
        >
          Déconnexion
        </button>
      </div>
    </nav>
  )
}
