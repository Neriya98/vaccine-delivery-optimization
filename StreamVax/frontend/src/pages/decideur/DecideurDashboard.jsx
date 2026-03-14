import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import StatCard from '../../components/StatCard'
import PlotlyChart from '../../components/PlotlyChart'
import FranceMap from '../../components/FranceMap'
import { getNational, getMapData } from '../../api/dashboard'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1']

export default function DecideurDashboard() {
  const [national, setNational] = useState(null)
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)

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

  const allCentres = zones.flatMap((z) => z.centres ?? [])
  const totalLowStock = allCentres.filter((c) => c.stock_actuel < 20).length

  /* ---- Bar chart data ---- */
  const barData = [
    {
      type: 'bar',
      x: zones.map((z) => z.nom),
      y: zones.map((z) => z.total_vaccines_30j),
      marker: {
        color: zones.map((_, i) => COLORS[i % COLORS.length]),
        line: { width: 0 },
        cornerradius: 6,
      },
      hovertemplate: '<b>%{x}</b><br>%{y} vaccins<extra></extra>',
      name: 'Vaccins 30j',
    },
  ]

  /* ---- Pie chart data ---- */
  const pieData = [
    {
      type: 'pie',
      labels: zones.map((z) => z.nom),
      values: zones.map((z) => z.total_vaccines_30j),
      marker: {
        colors: zones.map((_, i) => COLORS[i % COLORS.length]),
      },
      hole: 0.45,
      textinfo: 'percent+label',
      textposition: 'outside',
      textfont: { size: 11 },
      hovertemplate: '<b>%{label}</b><br>%{value} vaccins<br>%{percent}<extra></extra>',
    },
  ]

  /* ---- Stock distribution ---- */
  const stockCategories = [
    { label: 'Critique (<20)', count: allCentres.filter((c) => c.stock_actuel < 20).length, color: '#ef4444' },
    { label: 'Modéré (20-50)', count: allCentres.filter((c) => c.stock_actuel >= 20 && c.stock_actuel < 50).length, color: '#f59e0b' },
    { label: 'Bon (≥50)', count: allCentres.filter((c) => c.stock_actuel >= 50).length, color: '#22c55e' },
  ]

  const stockPieData = [
    {
      type: 'pie',
      labels: stockCategories.map((s) => s.label),
      values: stockCategories.map((s) => s.count),
      marker: { colors: stockCategories.map((s) => s.color) },
      hole: 0.5,
      textinfo: 'value+percent',
      textfont: { size: 12 },
      hovertemplate: '<b>%{label}</b><br>%{value} centres<extra></extra>',
    },
  ]

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar title="Vue Nationale" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

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

        {/* Row: Bar chart + Pie chart */}
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2">
              Vaccinations par zone — 30 derniers jours
            </h2>
            {zones.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune donnée disponible.</p>
            ) : (
              <div style={{ height: 300 }}>
                <PlotlyChart
                  data={barData}
                  layout={{
                    xaxis: { tickangle: -30, tickfont: { size: 11 } },
                    yaxis: { title: { text: 'Vaccins', font: { size: 12 } } },
                    showlegend: false,
                    margin: { l: 55, r: 15, t: 10, b: 80 },
                  }}
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-2 glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2">
              Répartition par zone
            </h2>
            {zones.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune donnée.</p>
            ) : (
              <div style={{ height: 300 }}>
                <PlotlyChart
                  data={pieData}
                  layout={{
                    showlegend: false,
                    margin: { l: 10, r: 10, t: 10, b: 10 },
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Row: France Map + Stock distribution */}
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2">
              Carte des centres de vaccination
            </h2>
            <FranceMap centres={allCentres} title="" />
          </div>

          <div className="lg:col-span-2 glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2">
              État des stocks
            </h2>
            <div style={{ height: 280 }}>
              <PlotlyChart
                data={stockPieData}
                layout={{
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.1, x: 0.5, xanchor: 'center', font: { size: 11 } },
                  margin: { l: 10, r: 10, t: 10, b: 40 },
                  annotations: [
                    {
                      text: `<b>${allCentres.length}</b><br>centres`,
                      showarrow: false,
                      font: { size: 16, color: '#374151' },
                    },
                  ],
                }}
              />
            </div>

            {/* Mini recap table */}
            <div className="mt-4 border-t border-slate-200/50 pt-4">
              <div className="space-y-2">
                {stockCategories.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-600">{s.label}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tableau récapitulatif des zones */}
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-4">Récapitulatif par zone</h2>
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
                  const lowStock = (z.centres ?? []).filter((c) => c.stock_actuel < 20).length
                  return (
                    <tr key={z.zone_id} className="border-b border-slate-200/50 last:border-0 hover:bg-white/40 transition-colors">
                      <td className="py-2.5 pr-4 font-medium">{z.nom}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{z.region}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{z.departement}</td>
                      <td className="py-2.5 pr-4 text-right">{z.nb_centres}</td>
                      <td className="py-2.5 pr-4 text-right">
                        {lowStock > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded-full text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {lowStock}
                          </span>
                        ) : (
                          <span className="text-green-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-blue-700">
                        {z.total_vaccines_30j?.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
