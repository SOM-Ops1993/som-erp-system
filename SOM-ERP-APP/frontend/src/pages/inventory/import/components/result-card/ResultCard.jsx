export default function ResultCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-green-200">
      <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>
      <div className="text-gray-600 text-xs mt-0.5">{label}</div>
    </div>
  )
}
