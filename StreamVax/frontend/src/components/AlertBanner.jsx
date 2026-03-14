const TYPE_STYLES = {
  stock_low:    'bg-red-50    border-red-300    text-red-800',
  surge_risk:   'bg-orange-50 border-orange-300 text-orange-800',
  missed_entry: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  delivery_due: 'bg-blue-50   border-blue-300   text-blue-800',
}

const TYPE_LABELS = {
  stock_low:    'Stock critique',
  surge_risk:   'Risque de surcharge',
  missed_entry: 'Saisie manquante',
  delivery_due: 'Livraison à venir',
}

export default function AlertBanner({ alerts, onMarkRead }) {
  if (!alerts?.length) return null

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`flex justify-between items-start border rounded-lg px-4 py-3 ${TYPE_STYLES[a.type] ?? 'bg-gray-50 border-gray-300 text-gray-800'}`}
        >
          <div>
            <span className="font-semibold text-sm">{TYPE_LABELS[a.type] ?? a.type}</span>
            <p className="text-sm mt-0.5">{a.message}</p>
          </div>
          <span className="text-xs opacity-60 ml-4 shrink-0">
            {new Date(a.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      ))}
      {onMarkRead && (
        <button
          onClick={onMarkRead}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Tout marquer comme lu
        </button>
      )}
    </div>
  )
}
