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
    <nav className="sticky top-0 z-50 glass border-b border-white/40 px-6 py-4 flex items-center justify-between mb-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 ring-white/50">
          S
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
            StreamVax
          </span>
          {title && (
            <span className="text-slate-500 text-sm hidden sm:inline ml-2 font-medium">/ {title}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-slate-800 leading-tight">{user?.nom}</p>
          <p className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block border border-blue-100">{ROLE_LABELS[user?.role]}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-white/50 hover:bg-white text-slate-700 hover:text-red-600 text-sm px-4 py-2 rounded-xl transition-all font-medium border border-slate-200 shadow-sm hover:shadow"
        >
          Déconnexion
        </button>
      </div>
    </nav>
  )
}
