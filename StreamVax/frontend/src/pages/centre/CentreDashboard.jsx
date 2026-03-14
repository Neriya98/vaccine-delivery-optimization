import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import StatCard from '../../components/StatCard'
import AlertBanner from '../../components/AlertBanner'
import {
  getCentre, getRecords, createRecord,
  getPredictions, refreshPredictions,
  getAlerts, markAlertsRead,
} from '../../api/centres'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

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
  const [refreshMsg, setRefreshMsg] = useState(null)

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
    try {
      await createRecord(centreId, {
        vaccines_done:    parseInt(form.vaccines_done)    || 0,
        emergencies_real: parseInt(form.emergencies_real) || 0,
        stock_used:       parseInt(form.stock_used)       || 0,
        notes: form.notes,
      })
      setFormMsg({ ok: true, text: 'Saisie enregistrée avec succès.' })
      setForm({ vaccines_done: '', emergencies_real: '', stock_used: '', notes: '' })
      await load()
    } catch (err) {
      setFormMsg({ ok: false, text: err.response?.data?.error || 'Erreur lors de la saisie.' })
    }
  }

  const handleRefresh = async () => {
    setRefreshMsg({ ok: null, text: 'Interrogation du modèle ML…' })
    try {
      await refreshPredictions(centreId)
      const p = await getPredictions(centreId)
      setPredictions(p.data)
      setRefreshMsg({ ok: true, text: 'Prédictions mises à jour.' })
    } catch (err) {
      setRefreshMsg({ ok: false, text: err.response?.data?.error || 'Modèle ML inaccessible.' })
    }
  }

  const handleMarkRead = async () => {
    await markAlertsRead(centreId)
    setAlerts([])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chargement…
      </div>
    )
  }

  const todayRecord = records[records.length - 1]
  const stockColor = centre?.stock_actuel < 20 ? 'red' : centre?.stock_actuel < 50 ? 'yellow' : 'green'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title={centre?.nom} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

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

        {/* Formulaire de saisie journalière */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Saisie journalière</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'vaccines_done',    label: 'Vaccins réalisés' },
              { key: 'emergencies_real', label: 'Urgences réelles' },
              { key: 'stock_used',       label: 'Stock utilisé' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-sm text-gray-600 block mb-1">{label}</label>
                <input
                  type="number" min="0"
                  value={form[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="text-sm text-gray-600 block mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2 md:col-span-4 flex items-center gap-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Enregistrer
              </button>
              {formMsg && (
                <span className={`text-sm ${formMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {formMsg.text}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Graphique historique 30 jours */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Historique 30 jours</h2>
          {records.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune donnée disponible.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={records}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="vaccines_done"    stroke="#3b82f6" name="Vaccins"       dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="emergencies_real" stroke="#f59e0b" name="Urgences"      dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="stock_used"       stroke="#10b981" name="Stock utilisé" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Prédictions ML */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Prédictions du modèle ML — 7 prochains jours
            </h2>
            <div className="flex items-center gap-3">
              {refreshMsg && (
                <span className={`text-sm ${refreshMsg.ok === false ? 'text-red-600' : 'text-gray-500'}`}>
                  {refreshMsg.text}
                </span>
              )}
              <button
                onClick={handleRefresh}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
              >
                Actualiser le modèle
              </button>
            </div>
          </div>

          {predictions.length === 0 ? (
            <p className="text-gray-400 text-sm">
              Aucune prédiction disponible. Cliquez sur{' '}
              <strong>Actualiser le modèle</strong> pour interroger l'API ML configurée
              via <code className="bg-gray-100 px-1 rounded">ML_API_BASE_URL</code>.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={predictions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pred_vaccines"    fill="#3b82f6" name="Vaccins prédits"  />
                  <Bar dataKey="pred_emergencies" fill="#f59e0b" name="Urgences prédites" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 overflow-x-auto">
                <table className="text-sm w-full">
                  <thead>
                    <tr className="text-gray-500 border-b text-left">
                      <th className="py-1 pr-4 font-medium">Date</th>
                      <th className="py-1 pr-4 font-medium text-right">Vaccins</th>
                      <th className="py-1 pr-4 font-medium text-right">Urgences</th>
                      <th className="py-1 pr-4 font-medium text-right">Mensuel</th>
                      <th className="py-1 font-medium text-right">Confiance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p) => (
                      <tr key={p.date} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-1.5 pr-4">{p.date}</td>
                        <td className="py-1.5 pr-4 text-right">{p.pred_vaccines ?? '—'}</td>
                        <td className="py-1.5 pr-4 text-right">{p.pred_emergencies ?? '—'}</td>
                        <td className="py-1.5 pr-4 text-right">{p.pred_vaccines_month ?? '—'}</td>
                        <td className="py-1.5 text-right">
                          {p.confidence != null
                            ? `${(p.confidence * 100).toFixed(0)}%`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
