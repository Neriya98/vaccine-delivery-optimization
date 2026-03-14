import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import StatCard from '../../components/StatCard'
import { getZoneCentres, getDeliveries, createDelivery, updateDeliveryStatus } from '../../api/zones'

const STATUT_META = {
  planifie:   { label: 'Planifié',    color: 'bg-blue-100 text-blue-700' },
  en_transit: { label: 'En transit',  color: 'bg-yellow-100 text-yellow-700' },
  livre:      { label: 'Livré',       color: 'bg-green-100 text-green-700' },
}

export default function ZoneDashboard() {
  const { user } = useAuth()
  const zoneId = user?.zone_id

  const [centres, setCentres]     = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading]     = useState(true)

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
        centre_id:      parseInt(form.centre_id),
        date_livraison: form.date_livraison,
        quantite:       parseInt(form.quantite),
        notes:          form.notes,
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
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chargement…
      </div>
    )
  }

  const totalAlerts  = centres.reduce((s, c) => s + (c.unread_alerts || 0), 0)
  const lowStockCount = centres.filter((c) => c.stock_actuel < 20).length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Tableau de bord Zone" />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Centres"            value={centres.length}    color="blue" />
          <StatCard label="Alertes non lues"   value={totalAlerts}       color={totalAlerts  > 0 ? 'red'   : 'green'} />
          <StatCard label="Stocks critiques"   value={lowStockCount}     color={lowStockCount > 0 ? 'red'  : 'green'} sub="centres < 20 doses" />
          <StatCard label="Livraisons en cours" value={deliveries.length} color="blue" />
        </div>

        {/* Tableau des centres */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Centres de la zone</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b text-left">
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
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{c.nom}</td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{c.adresse}</td>
                    <td className={`py-2 pr-4 text-right font-semibold ${c.stock_actuel < 20 ? 'text-red-600' : 'text-green-600'}`}>
                      {c.stock_actuel}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-600">{c.capacite_jour}</td>
                    <td className="py-2 pr-4 text-right">
                      {c.pred_vaccines_tomorrow != null ? c.pred_vaccines_tomorrow : '—'}
                    </td>
                    <td className="py-2 text-right">
                      {c.unread_alerts > 0 ? (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
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
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Planifier une livraison</h2>
            <form onSubmit={handleCreateDelivery} className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Centre destinataire</label>
                <select
                  value={form.centre_id}
                  onChange={(e) => setForm((f) => ({ ...f, centre_id: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Sélectionner…</option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Date de livraison</label>
                <input
                  type="date"
                  value={form.date_livraison}
                  onChange={(e) => setForm((f) => ({ ...f, date_livraison: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Quantité (doses)</label>
                <input
                  type="number" min="1"
                  value={form.quantite}
                  onChange={(e) => setForm((f) => ({ ...f, quantite: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition"
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
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Livraisons planifiées / en transit</h2>
            {deliveries.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune livraison en cours.</p>
            ) : (
              <div className="space-y-3">
                {deliveries.map((d) => {
                  const centre = centres.find((c) => c.id === d.centre_id)
                  const meta   = STATUT_META[d.statut]
                  return (
                    <div key={d.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{centre?.nom ?? `Centre #${d.centre_id}`}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {d.date_livraison} · {d.quantite} doses
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta?.color}`}>
                          {meta?.label}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {d.statut === 'planifie' && (
                          <button
                            onClick={() => handleUpdateStatus(d.id, 'en_transit')}
                            className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200 transition"
                          >
                            Mettre en transit
                          </button>
                        )}
                        {d.statut === 'en_transit' && (
                          <button
                            onClick={() => handleUpdateStatus(d.id, 'livre')}
                            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition"
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
