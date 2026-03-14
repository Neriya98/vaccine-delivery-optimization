const COLORS = {
  blue:   'bg-blue-50/50   border-blue-200/50   text-blue-700 hover:shadow-blue-200/50',
  green:  'bg-green-50/50  border-green-200/50  text-green-700 hover:shadow-green-200/50',
  red:    'bg-red-50/50    border-red-200/50    text-red-700 hover:shadow-red-200/50',
  yellow: 'bg-yellow-50/50 border-yellow-200/50 text-yellow-700 hover:shadow-yellow-200/50',
}

export default function StatCard({ label, value, color = 'blue', sub }) {
  return (
    <div className={`rounded-2xl border p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${COLORS[color] ?? COLORS.blue} animate-fade-in`}>
      <p className="text-sm font-semibold tracking-wide uppercase opacity-70 mb-1">{label}</p>
      <p className="text-4xl font-black tracking-tight">{value ?? '—'}</p>
      {sub && <p className="text-xs mt-2 font-medium opacity-75">{sub}</p>}
    </div>
  )
}
