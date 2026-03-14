import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import StatCard from '../../components/StatCard'
import AlertBanner from '../../components/AlertBanner'
import PlotlyChart from '../../components/PlotlyChart'
import {
  getCentre, getRecords, createRecord,
  getPredictions, refreshPredictions,
  getAlerts, markAlertsRead,
} from '../../api/centres'

export default function CentreDashboard() {
  const { user } = useAuth()
  const centreId = user?.centre_id

  const [centre, setCentre] = useState(null)
  const [records, setRecords] = useState([])
  const [predictions, setPredictions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    vaccines_done: '', emergencies_real: '', stock_used: '', notes: '',
  })
  const [formMsg, setFormMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    const [c, r, p, a] = await Promise.all([
      getCentre(centreId),
      getRecords(centreId, 30),
      getPredictions(centreId),
      getAlerts(centreId),
    ])
    setCentre(c.data)
    setRecords(r.data)
    setPredictions(p.data)
    setAlerts(a.data)
  }

  useEffect(() => {
    if (!centreId) return
    load().finally(() => setLoading(false))
  }, [centreId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMsg(null)
    setSubmitting(true)
    try {
      await createRecord(centreId, {
        vaccines_done:    parseInt(form.vaccines_done)    || 0,
        emergencies_real: parseInt(form.emergencies_real) || 0,
        stock_used:       parseInt(form.stock_used)       || 0,
        notes: form.notes,
      })
      setFormMsg({ ok: true, text: 'Saisie enregistrée.' })
      setForm({ vaccines_done: '', emergencies_real: '', stock_used: '', notes: '' })
      await load()
    } catch (err) {
      setFormMsg({ ok: false, text: err.response?.data?.error || 'Erreur.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshMsg({ ok: null, text: 'Calcul ML...' })
    setRefreshing(true)
    try {
      await refreshPredictions(centreId)
      const p = await getPredictions(centreId)
      setPredictions(p.data)
      setRefreshMsg({ ok: true, text: 'À jour.' })
    } catch (err) {
      setRefreshMsg({ ok: false, text: err.response?.data?.error || 'Erreur ML.' })
    } finally {
      setRefreshing(false)
    }
  }

  const handleMarkRead = async () => {
    await markAlertsRead(centreId)
    setAlerts([])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium animate-pulse">
        Chargement...
      </div>
    )
  }

  const todayRecord = records[records.length - 1]
  const stockColor = centre?.stock_actuel < 20 ? 'red' : centre?.stock_actuel < 50 ? 'yellow' : 'green'

  // --- Plotly Traces ---
  const areaTraces = [
    {
      x: records.map(r => r.date),
      y: records.map(r => r.vaccines_done),
      name: 'Vaccins',
      type: 'scatter',
      mode: 'lines',
      fill: 'tozeroy',
      line: { color: '#3b82f6', shape: 'spline', smoothing: 1.3 },
      fillcolor: 'rgba(59, 130, 246, 0.2)'
    },
    {
      x: records.map(r => r.date),
      y: records.map(r => r.emergencies_real),
      name: 'Urgences',
      type: 'scatter',
      mode: 'lines',
      fill: 'tozeroy',
      line: { color: '#f59e0b', shape: 'spline', smoothing: 1.3 },
      fillcolor: 'rgba(245, 158, 11, 0.2)'
    },
    {
      x: records.map(r => r.date),
      y: records.map(r => r.stock_used),
      name: 'Stock Utilisé',
      type: 'scatter',
      mode: 'lines',
      fill: 'tozeroy',
      line: { color: '#10b981', shape: 'spline', smoothing: 1.3 },
      fillcolor: 'rgba(16, 185, 129, 0.2)'
    }
  ]

  const gaugeTrace = centre ? [
    {
      type: "indicator",
      mode: "gauge+number",
      value: centre.stock_actuel,
      title: { text: "Stock actuel", font: { size: 14, color: '#64748b' } },
      number: { font: { size: 40, color: '#1e293b', family: 'Outfit' } },
      gauge: {
        axis: { range: [0, Math.max(100, centre.stock_actuel * 1.5)], tickwidth: 1, tickcolor: "#cbd5e1" },
        bar: { color: centre.stock_actuel < 20 ? "#ef4444" : centre.stock_actuel < 50 ? "#f59e0b" : "#10b981" },
        bgcolor: "rgba(0,0,0,0)",
        borderwidth: 0,
        steps: [
          { range: [0, 20], color: "rgba(239, 68, 68, 0.1)" },
          { range: [20, 50], color: "rgba(245, 158, 11, 0.1)" },
          { range: [50, 1000], color: "rgba(16, 185, 129, 0.1)" }
        ]
      }
    }
  ] : []

  const predTraces = predictions.length > 0 ? [
    {
      x: predictions.map(p => p.date),
      y: predictions.map(p => p.pred_vaccines),
      name: 'Vaccins Prédits',
      type: 'bar',
      marker: { color: '#3b82f6', borderRadius: 4 }
    },
    {
      x: predictions.map(p => p.date),
      y: predictions.map(p => p.pred_emergencies),
      name: 'Urgences Prédites',
      type: 'bar',
      marker: { color: '#f59e0b', borderRadius: 4 }
    },
    {
      x: predictions.map(p => p.date),
      y: predictions.map(p => p.confidence ? p.confidence * 100 : null).filter(c => c !== null),
      name: 'Confiance ML (%)',
      type: 'scatter',
      mode: 'lines+markers',
      yaxis: 'y2',
      line: { color: '#8b5cf6', width: 3, dash: 'dot' },
      marker: { size: 8 }
    }
  ] : []

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar title={centre ? `Centre ${centre.nom}` : "Chargement..."} />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* Alertes */}
        {alerts.length > 0 && (
          <AlertBanner alerts={alerts} onMarkRead={handleMarkRead} />
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Stock actuel"
            value={centre?.stock_actuel}
            color={stockColor}
            sub="doses disponibles"
          />
          <StatCard
            label="Capacité / jour"
            value={centre?.capacite_jour}
            color="blue"
            sub="max vaccins/jour"
          />
          <StatCard
            label="Vaccins aujourd'hui"
            value={todayRecord?.vaccines_done ?? '—'}
            color="green"
          />
          <StatCard
            label="Urgences aujourd'hui"
            value={todayRecord?.emergencies_real ?? '—'}
            color="yellow"
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2">Historique — 30 derniers jours</h2>
            {records.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucune donnée disponible.</p>
            ) : (
              <div style={{ height: 300 }}>
                <PlotlyChart
                  data={areaTraces}
                  layout={{
                    xaxis: { tickfont: { size: 11 }, tickangle: -30 },
                    yaxis: { title: { text: 'Nombre', font: { size: 12 } } },
                    margin: { l: 45, r: 15, t: 10, b: 60 },
                    hovermode: 'x unified',
                    showlegend: true,
                    legend: { orientation: 'h', y: -0.2 }
                  }}
                />
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-6 flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2 self-start w-full">Niveau de Stock</h2>
            <div style={{ width: '100%', height: 260 }}>
              <PlotlyChart
                data={gaugeTrace}
                layout={{ margin: { t: 50, b: 20, l: 30, r: 30 } }}
              />
            </div>
          </div>
        </div>

        {/* Prédictions ML */}
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">
              Prédictions ML — 7 prochains jours
            </h2>
            <div className="flex items-center gap-3">
              {refreshMsg && (
                <span className={`text-sm ${refreshMsg.ok === false ? 'text-red-600' : 'text-slate-500 font-medium'}`}>
                  {refreshMsg.text}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/50 hover:bg-white text-blue-700 text-sm px-4 py-2 rounded-xl border border-blue-200 shadow-sm transition-all font-medium disabled:opacity-50"
              >
                Actualiser le modèle
              </button>
            </div>
          </div>

          {predictions.length === 0 ? (
            <p className="text-slate-400 text-sm">
              Aucune prédiction disponible. Cliquez sur{' '}
              <strong>Actualiser le modèle</strong> pour interroger l'API ML configurée.
            </p>
          ) : (
            <>
              <div style={{ height: 280 }}>
                <PlotlyChart
                  data={predTraces}
                  layout={{
                    barmode: 'group',
                    xaxis: { tickfont: { size: 11 } },
                    yaxis: { title: { text: 'Doses / Urgences', font: { size: 12 } } },
                    yaxis2: {
                      title: { text: 'Confiance (%)', font: { size: 12 } },
                      overlaying: 'y',
                      side: 'right',
                      range: [0, 105],
                      showgrid: false
                    },
                    margin: { l: 45, r: 45, t: 10, b: 40 },
                    legend: { orientation: 'h', y: -0.15 }
                  }}
                />
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200/50 text-left">
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium text-right">Vaccins</th>
                      <th className="py-2 pr-4 font-medium text-right">Urgences</th>
                      <th className="py-2 pr-4 font-medium text-right">Mensuel</th>
                      <th className="py-2 pr-4 font-medium text-right shadow-sm bg-white/30 rounded-t-lg">Confiance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p) => (
                      <tr key={p.date} className="border-b border-slate-200/50 last:border-0 hover:bg-white/40 transition-colors">
                        <td className="py-2.5 pr-4 font-medium">{p.date}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-700">{p.pred_vaccines ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-700">{p.pred_emergencies ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-700">{p.pred_vaccines_month ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-right font-semibold text-indigo-700 bg-white/30 shadow-sm rounded-b-lg">
                          {p.confidence != null ? `${(p.confidence * 100).toFixed(0)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Formulaire de saisie journalière */}
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-4">Saisie Journalière</h2>
          <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vaccinations Effectuées</label>
                <input
                  type="number" min="0" required
                  value={form.vaccines_done}
                  onChange={(e) => setForm(f => ({ ...f, vaccines_done: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Urgences Identifiées</label>
                <input
                  type="number" min="0" required
                  value={form.emergencies_real}
                  onChange={(e) => setForm(f => ({ ...f, emergencies_real: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Doses Utilisées</label>
                <input
                  type="number" min="0" required
                  value={form.stock_used}
                  onChange={(e) => setForm(f => ({ ...f, stock_used: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 placeholder-slate-400"
                placeholder="Explications, incidents..."
              />
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-slate-200/50">
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50"
              >
                Enregistrer
              </button>
              {formMsg && (
                <span className={`text-sm font-medium ${formMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {formMsg.text}
                </span>
              )}
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
