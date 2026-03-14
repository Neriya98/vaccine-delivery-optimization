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

        {/* Tableau récapitulatif des zones */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Récapitulatif par zone</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b text-left">
                  <th className="py-2 pr-4 font-medium">Zone</th>
                  <th className="py-2 pr-4 font-medium">Région</th>
                  <th className="py-2 pr-4 font-medium">Département</th>
                  <th className="py-2 pr-4 font-medium text-right">Centres</th>
                  <th className="py-2 pr-4 font-medium text-right">Stocks critiques</th>
                  <th className="py-2 font-medium text-right">Vaccins (30j)</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => {
                  const lowStock = z.centres.filter((c) => c.stock_actuel < 20).length
                  return (
                    <tr key={z.zone_id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium">{z.nom}</td>
                      <td className="py-2 pr-4 text-gray-600">{z.region}</td>
                      <td className="py-2 pr-4 text-gray-600">{z.departement}</td>
                      <td className="py-2 pr-4 text-right">{z.nb_centres}</td>
                      <td className="py-2 pr-4 text-right">
                        {lowStock > 0 ? (
                          <span className="text-red-600 font-semibold">{lowStock}</span>
                        ) : (
                          <span className="text-green-600">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-semibold text-blue-700">
                        {z.total_vaccines_30j?.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
