import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts'

/**
 * Pareto Chart compatto — stile coerente con BridgeChart
 */
export default function ParetoChart({
  losses = [],
  title = 'Pareto Losses Deployment',
  subtitle = '',
  targetPercent = 80,
  unit = '%',
}) {
  const sortedData = useMemo(() => {
    const valid = losses.filter(l => l.value !== null && l.value !== undefined && l.value !== '')
    const sorted = [...valid]
      .map(l => ({ ...l, value: parseFloat(l.value) || 0 }))
      .filter(l => l.value > 0)
      .sort((a, b) => b.value - a.value)

    const total = sorted.reduce((sum, l) => sum + l.value, 0)
    let cum = 0
    return sorted.map((l) => {
      cum += l.value
      const cumPercent = total > 0 ? (cum / total) * 100 : 0
      return {
        ...l,
        cumPercent: parseFloat(cumPercent.toFixed(1)),
        percent: total > 0 ? parseFloat(((l.value / total) * 100).toFixed(1)) : 0,
      }
    })
  }, [losses])

  const total = useMemo(() =>
    sortedData.reduce((sum, l) => sum + l.value, 0)
  , [sortedData])

  const defaultColors = ['#5B9BD5', '#ED7D31', '#A5A5A5', '#FFC000', '#4472C4', '#70AD47', '#264478', '#9E480E', '#C5A5CF', '#7B7B7B']

  if (sortedData.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-gray-400">
        <p className="text-sm">Aggiungi perdite per visualizzare il Pareto chart</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 text-center">
        <div className="font-bold text-lg">{title}</div>
        {subtitle && <div className="text-xs opacity-90 mt-0.5">{subtitle}</div>}
      </div>

      {/* Indicatore totale */}
      <div className="bg-blue-50 px-4 py-2 border-b flex justify-between items-center text-xs">
        <span className="font-semibold text-blue-900">
          Totale: <strong>{total.toLocaleString('it-IT')} {unit}</strong>
        </span>
        <span className="text-blue-700">
          Σ = {sortedData.length} categorie
        </span>
      </div>

      {/* Chart principale */}
      <div className="p-3">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={sortedData} margin={{ top: 20, right: 50, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              angle={-35}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 10 }}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#3b82f6"
              tick={{ fontSize: 10 }}
              label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#10b981"
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              label={{ value: '%', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8, fontSize: 12 }}
              formatter={(value, name) => {
                if (name === 'Cumulativa %') return [`${value}%`, 'Cumulativa']
                if (name === 'Perdite') return [`${value} ${unit}`, 'Perdita']
                return [value, name]
              }}
            />

            <Bar yAxisId="left" dataKey="value" name="Perdite" radius={[4, 4, 0, 0]}>
              {sortedData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color || defaultColors[idx % defaultColors.length]} />
              ))}
              <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 600 }} />
            </Bar>

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumPercent"
              stroke="#10b981"
              strokeWidth={2.5}
              name="Cumulativa %"
              dot={{ fill: '#10b981', r: 4 }}
            />

            <ReferenceLine
              yAxisId="right"
              y={targetPercent}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: `${targetPercent}%`, position: 'right', fill: '#ef4444', fontSize: 10, fontWeight: 600 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda compatta in fondo */}
      <div className="border-t bg-gray-50 px-4 py-2 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#5B9BD5' }} />
          <span>Perdite</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-1 bg-green-500" />
          <span>Cumulativa %</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <div className="w-4 h-1 border-t-2 border-dashed border-red-500" />
          <span>Target {targetPercent}%</span>
        </div>
      </div>
    </div>
  )
}
