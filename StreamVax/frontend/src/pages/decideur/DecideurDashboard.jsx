import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import StatCard from '../../components/StatCard'
import { getNational, getMapData } from '../../api/dashboard'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export default function DecideurDashboard() {
  const [national, setNational] = useState(null)
  const [zones, setZones]       = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([getNational(), getMapData()])
      .then(([n, m]) => {
        setNational(n.data)
        setZones(m.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chargement…
      </div>
    )
  }

  const totalLowStock = zones.reduce(
    (sum, z) => sum + z.centres.filter((c) => c.stock_actuel < 20).length,
    0
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Vue Nationale" />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* KPIs nationaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Vaccins — 30 jours"
            value={national?.total_vaccines_30j?.toLocaleString('fr-FR')}
            color="blue"
          />
          <StatCard
            label="Urgences — 30 jours"
            value={national?.total_emergencies_30j?.toLocaleString('fr-FR')}
            color="yellow"
          />
          <StatCard
            label="Centres actifs"
            value={national?.nb_centres}
            color="green"
          />
          <StatCard
            label="Stocks critiques"
            value={totalLowStock}
            color={totalLowStock > 0 ? 'red' : 'green'}
            sub="centres < 20 doses"
          />
        </div>

        {/* Graphique par zone */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Vaccinations par zone — 30 derniers jours
          </h2>
          {zones.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune donnée disponible.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={zones}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_vaccines_30j" fill="#3b82f6" name="Vaccins" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cartes récapitulatives par zone */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Récapitulatif par zone</h2>
          {(() => {
            const maxVax = Math.max(...zones.map((z) => z.total_vaccines_30j || 0), 1)
            return (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.map((z) => {
                  const lowStock = z.centres.filter((c) => c.stock_actuel < 20).length
                  const critical = lowStock > 0
                  const pct      = Math.round(((z.total_vaccines_30j || 0) / maxVax) * 100)

                  return (
                    <div
                      key={z.zone_id}
                      className={`bg-white rounded-xl shadow border-l-4 p-5 flex flex-col gap-4 ${
                        critical ? 'border-red-500' : 'border-green-500'
                      }`}
                    >
                      {/* En-tête */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900 leading-tight">{z.nom}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {z.region}
                            {z.departement && ` · Dép. ${z.departement}`}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            critical
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {critical ? `${lowStock} alerte${lowStock > 1 ? 's' : ''}` : 'OK'}
                        </span>
                      </div>

                      {/* Métriques */}
                      <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
                        <div className="pr-2">
                          <p className="text-2xl font-bold text-gray-800">{z.nb_centres}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Centres</p>
                        </div>
                        <div className="px-2">
                          <p className={`text-2xl font-bold ${critical ? 'text-red-600' : 'text-gray-300'}`}>
                            {lowStock}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">Critiques</p>
                        </div>
                        <div className="pl-2">
                          <p className="text-2xl font-bold text-blue-700">
                            {(z.total_vaccines_30j || 0).toLocaleString('fr-FR')}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">Vaccins 30j</p>
                        </div>
                      </div>

                      {/* Barre de progression relative */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Activité vaccinale</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Grille des centres par zone */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            État des stocks par zone
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((z) => (
              <div key={z.zone_id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-1">{z.nom}</h3>
                <p className="text-xs text-gray-400 mb-3">{z.region} · {z.nb_centres} centre(s)</p>
                <ul className="space-y-1.5">
                  {z.centres.map((c) => (
                    <li key={c.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 truncate mr-2">{c.nom}</span>
                      <span
                        className={`font-semibold shrink-0 ${
                          c.stock_actuel < 20 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {c.stock_actuel} doses
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
