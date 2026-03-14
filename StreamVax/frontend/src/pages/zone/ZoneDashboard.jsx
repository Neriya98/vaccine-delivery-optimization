import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import StatCard from '../../components/StatCard'
import PlotlyChart from '../../components/PlotlyChart'
import FranceMap from '../../components/FranceMap'
import { getZoneCentres, getDeliveries, createDelivery, updateDeliveryStatus } from '../../api/zones'

const STATUT_META = {
  planifie: { label: 'Planifié', color: 'bg-blue-100 text-blue-700' },
  en_transit: { label: 'En transit', color: 'bg-yellow-100 text-yellow-700' },
  livre: { label: 'Livré', color: 'bg-green-100 text-green-700' },
}

export default function ZoneDashboard() {
  const { user } = useAuth()
  const zoneId = user?.zone_id

  const [centres, setCentres] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    centre_id: '', date_livraison: '', quantite: '', notes: '',
  })
  const [formMsg, setFormMsg] = useState(null)

  const loadDeliveries = async () => {
    const d = await getDeliveries(zoneId)
    setDeliveries(d.data)
  }

  useEffect(() => {
    if (!zoneId) return
    Promise.all([getZoneCentres(zoneId), getDeliveries(zoneId)])
      .then(([c, d]) => {
        setCentres(c.data)
        setDeliveries(d.data)
      })
      .finally(() => setLoading(false))
  }, [zoneId])

  const handleCreateDelivery = async (e) => {
    e.preventDefault()
    setFormMsg(null)
    try {
      await createDelivery(zoneId, {
        centre_id: parseInt(form.centre_id),
        date_livraison: form.date_livraison,
        quantite: parseInt(form.quantite),
        notes: form.notes,
      })
      setFormMsg({ ok: true, text: 'Livraison planifiée avec succès.' })
      setForm({ centre_id: '', date_livraison: '', quantite: '', notes: '' })
      await loadDeliveries()
    } catch (err) {
      setFormMsg({ ok: false, text: err.response?.data?.error || 'Erreur lors de la planification.' })
    }
  }

  const handleUpdateStatus = async (id, statut) => {
    await updateDeliveryStatus(id, statut)
    await loadDeliveries()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium animate-pulse">
        Chargement...
      </div>
    )
  }

  const totalAlerts = centres.reduce((s, c) => s + (c.unread_alerts || 0), 0)
  const lowStockCount = centres.filter((c) => c.stock_actuel < 20).length

  /* ---- Horizontal bar chart: stock by centre ---- */
  const sortedCentres = [...centres].sort((a, b) => a.stock_actuel - b.stock_actuel)
  const stockBarData = [
    {
      type: 'bar',
      y: sortedCentres.map((c) => c.nom),
      x: sortedCentres.map((c) => c.stock_actuel),
      orientation: 'h',
      marker: {
        color: sortedCentres.map((c) =>
          c.stock_actuel < 20 ? '#ef4444' : c.stock_actuel < 50 ? '#f59e0b' : '#22c55e'
        ),
        cornerradius: 4,
      },
      hovertemplate: '<b>%{y}</b><br>%{x} doses en stock<extra></extra>',
      name: 'Stock',
    },
  ]

  /* ---- Capacity usage bar chart ---- */
  const capacityData = centres.length > 0 ? [
    {
      type: 'bar',
      x: centres.map((c) => c.nom),
      y: centres.map((c) => c.capacite_jour),
      name: 'Capacité/jour',
      marker: { color: '#3b82f6', cornerradius: 4 },
      hovertemplate: '<b>%{x}</b><br>%{y} vaccins/jour<extra></extra>',
    },
    {
      type: 'bar',
      x: centres.map((c) => c.nom),
      y: centres.map((c) => c.pred_vaccines_tomorrow ?? 0),
      name: 'Prédiction demain',
      marker: { color: '#8b5cf6', cornerradius: 4 },
      hovertemplate: '<b>%{x}</b><br>%{y} prédits demain<extra></extra>',
    },
  ] : []

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar title="Tableau de bord Zone" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Centres" value={centres.length} color="blue" />
          <StatCard label="Alertes non lues" value={totalAlerts} color={totalAlerts > 0 ? 'red' : 'green'} />
          <StatCard label="Stocks critiques" value={lowStockCount} color={lowStockCount > 0 ? 'red' : 'green'} sub="centres < 20 doses" />
          <StatCard label="Livraisons en cours" value={deliveries.length} color="blue" />
        </div>

        {/* Row: Stock chart + Mini map */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2">
              Niveaux de stock par centre
            </h2>
            {centres.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucun centre.</p>
            ) : (
              <div style={{ height: Math.max(250, sortedCentres.length * 40) }}>
                <PlotlyChart
                  data={stockBarData}
                  layout={{
                    xaxis: { title: { text: 'Doses en stock', font: { size: 12 } } },
                    yaxis: { automargin: true, tickfont: { size: 11 } },
                    margin: { l: 140, r: 15, t: 10, b: 50 },
                    showlegend: false,
                    shapes: [
                      {
                        type: 'line',
                        x0: 20, x1: 20,
                        y0: -0.5, y1: sortedCentres.length - 0.5,
                        line: { color: '#ef4444', width: 2, dash: 'dash' },
                      },
                    ],
                    annotations: [
                      {
                        x: 20,
                        y: sortedCentres.length - 0.5,
                        text: 'Seuil critique',
                        showarrow: false,
                        font: { size: 10, color: '#ef4444' },
                        xanchor: 'left',
                        xshift: 5,
                      },
                    ],
                  }}
                />
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2">
              Localisation des centres
            </h2>
            <FranceMap centres={centres} title="" />
          </div>
        </div>

        {/* Capacity vs Prediction */}
        {centres.length > 0 && (
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2">
              Capacité journalière vs Prédiction demain
            </h2>
            <div style={{ height: 280 }}>
              <PlotlyChart
                data={capacityData}
                layout={{
                  barmode: 'group',
                  xaxis: { tickangle: -20, tickfont: { size: 11 } },
                  yaxis: { title: { text: 'Vaccins', font: { size: 12 } } },
                  margin: { l: 55, r: 15, t: 10, b: 70 },
                }}
              />
            </div>
          </div>
        )}

        {/* Tableau des centres */}
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-4">Centres de la zone</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200/50 text-left">
                  <th className="py-2 pr-4 font-medium">Centre</th>
                  <th className="py-2 pr-4 font-medium">Adresse</th>
                  <th className="py-2 pr-4 font-medium text-right">Stock actuel</th>
                  <th className="py-2 pr-4 font-medium text-right">Capacité/j</th>
                  <th className="py-2 pr-4 font-medium text-right">Prédiction demain</th>
                  <th className="py-2 font-medium text-right">Alertes</th>
                </tr>
              </thead>
              <tbody>
                {centres.map((c) => (
                  <tr key={c.id} className="border-b border-slate-200/50 last:border-0 hover:bg-white/40 transition-colors">
                    <td className="py-2.5 pr-4 font-medium">{c.nom}</td>
                    <td className="py-2.5 pr-4 text-slate-500 text-xs">{c.adresse}</td>
                    <td className={`py-2.5 pr-4 text-right font-bold ${c.stock_actuel < 20 ? 'text-red-500 drop-shadow-sm' : 'text-emerald-500'}`}>
                      {c.stock_actuel}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-slate-700">{c.capacite_jour}</td>
                    <td className="py-2.5 pr-4 text-right font-medium text-slate-800">
                      {c.pred_vaccines_tomorrow != null ? c.pred_vaccines_tomorrow : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      {c.unread_alerts > 0 ? (
                        <span className="bg-red-500 text-white shadow-sm ring-2 ring-red-200/50 px-2 py-0.5 rounded-full text-xs font-bold">
                          {c.unread_alerts}
                        </span>
                      ) : (
                        <span className="text-green-600 text-xs">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Formulaire de livraison */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-4">Planifier une livraison</h2>
            <form onSubmit={handleCreateDelivery} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Centre destinataire</label>
                <select
                  value={form.centre_id}
                  onChange={(e) => setForm((f) => ({ ...f, centre_id: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white/50 transition-all"
                >
                  <option value="">Sélectionner…</option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Date de livraison</label>
                <input
                  type="date"
                  value={form.date_livraison}
                  onChange={(e) => setForm((f) => ({ ...f, date_livraison: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white/50 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Quantité (doses)</label>
                <input
                  type="number" min="1"
                  value={form.quantite}
                  onChange={(e) => setForm((f) => ({ ...f, quantite: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white/50 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-slate-200/50 mt-2">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
                >
                  Planifier
                </button>
                {formMsg && (
                  <span className={`text-sm ${formMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {formMsg.text}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Liste des livraisons en cours */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-4">Livraisons planifiées / en transit</h2>
            {deliveries.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucune livraison en cours.</p>
            ) : (
              <div className="space-y-4">
                {deliveries.map((d) => {
                  const centre = centres.find((c) => c.id === d.centre_id)
                  const meta = STATUT_META[d.statut]
                  return (
                    <div key={d.id} className="border border-slate-200/50 bg-white/40 rounded-xl p-4 hover:shadow-md hover:bg-white/60 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-slate-800">{centre?.nom ?? `Centre #${d.centre_id}`}</p>
                          <p className="text-xs text-slate-500 mt-1 font-medium">
                            {d.date_livraison} · <span className="text-indigo-600">{d.quantite} doses</span>
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm border border-white/50 ${meta?.color}`}>
                          {meta?.label}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200/50">
                        {d.statut === 'planifie' && (
                          <button
                            onClick={() => handleUpdateStatus(d.id, 'en_transit')}
                            className="text-xs font-semibold bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm hover:shadow px-3 py-1.5 rounded-lg transition-all"
                          >
                            Mettre en transit
                          </button>
                        )}
                        {d.statut === 'en_transit' && (
                          <button
                            onClick={() => handleUpdateStatus(d.id, 'livre')}
                            className="text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm hover:shadow px-3 py-1.5 rounded-lg transition-all"
                          >
                            Marquer livré
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
