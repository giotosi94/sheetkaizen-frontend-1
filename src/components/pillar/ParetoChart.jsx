import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
  PieChart, Pie, Cell as PieCell,
} from 'recharts'

/**
 * Pareto Chart — Lindt FI Pillar style
 *
 * Props:
 *   losses: Array di { id, label, value, color?, unit? }
 *   title: titolo del grafico
 *   subtitle: sottotitolo opzionale
 *   targetPercent: linea target cumulativa (default 80)
 *   unit: unità di misura (%, nr, €, min, ...)
 */
export default function ParetoChart({
  losses = [],
  title = 'Pareto Losses Deployment',
  subtitle = '',
  targetPercent = 80,
  unit = '%',
}) {
  // Ordina per valore decrescente e calcola cumulativa
  const sortedData = useMemo(() => {
    const valid = losses.filter(l => l.value !== null && l.value !== undefined && l.value !== '')
    const sorted = [...valid]
      .map(l => ({ ...l, value: parseFloat(l.value) || 0 }))
      .filter(l => l.value > 0)
      .sort((a, b) => b.value - a.value)

    const total = sorted.reduce((sum, l) => sum + l.value, 0)
    let cum = 0
    return sorted.map((l, i) => {
      cum += l.value
      const cumPercent = total > 0 ? (cum / total) * 100 : 0
      return {
        ...l,
        cumPercent: parseFloat(cumPercent.toFixed(1)),
        percent: total > 0 ? parseFloat(((l.value / total) * 100).toFixed(1)) : 0,
      }
    })
  }, [losses])

  const total = useMemo(() => {
    return sortedData.reduce((sum, l) => sum + l.value, 0)
  }, [sortedData])

  // Default colori se non specificati
  const defaultColors = ['#5B9BD5', '#ED7D31', '#A5A5A5', '#FFC000', '#4472C4', '#70AD47', '#264478', '#9E480E', '#C5A5CF', '#7B7B7B']

  if (sortedData.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
        <div className="text-4xl mb-2">📊</div>
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
      <div className="bg-blue-50 px-4 py-2 border-b flex justify-between items-center text-sm">
        <span className="font-semibold text-blue-900">
          Totale: <strong>{total.toLocaleString('it-IT')} {unit}</strong>
        </span>
        <span className="text-blue-700">
          Σ = {sortedData.length} categorie
        </span>
      </div>

      {/* Chart principale */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={sortedData} margin={{ top: 20, right: 60, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#3b82f6"
              label={{ value: `Perdite (${unit})`, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#10b981"
              domain={[0, 100]}
              label={{ value: 'Cumulativa (%)', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8 }}
              formatter={(value, name) => {
                if (name === 'cumPercent') return [`${value}%`, 'Cumulativa']
                return [`${value} ${unit}`, 'Perdita']
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 10 }} />

            {/* Barre verticali colorate */}
            <Bar yAxisId="left" dataKey="value" name="Perdite" radius={[4, 4, 0, 0]}>
              {sortedData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color || defaultColors[idx % defaultColors.length]} />
              ))}
              <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 600 }} />
            </Bar>

            {/* Curva cumulativa */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumPercent"
              stroke="#10b981"
              strokeWidth={3}
              name="Cumulativa %"
              dot={{ fill: '#10b981', r: 5 }}
            />

            {/* Linea target (rossa orizzontale) */}
            <ReferenceLine
              yAxisId="right"
              y={targetPercent}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: `Target ${targetPercent}%`, position: 'right', fill: '#ef4444', fontSize: 11, fontWeight: 600 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart riepilogativa */}
      <div className="border-t bg-gray-50 p-4">
        <div className="text-xs font-bold uppercase text-gray-600 mb-2">Ripartizione percentuale</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={sortedData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={(entry) => `${entry.percent}%`}
              labelLine={false}
            >
              {sortedData.map((entry, idx) => (
                <PieCell key={idx} fill={entry.color || defaultColors[idx % defaultColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} ${unit}`} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
