export default function AdminMetricCard({ item }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 font-medium">{item.label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1">{item.value}</p>
      {item.change && (
        <p className="text-xs text-gray-400 mt-1">{item.change}</p>
      )}
    </div>
  );
}
