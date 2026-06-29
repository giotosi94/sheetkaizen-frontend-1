import { useMemo } from 'react'
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts'

/**
 * Bridge Chart — Lindt Step 3 (Target Definition)
 *
 * Mostra come dal baseline (es. OEE 79%) si arriva al forecast/target
 * attraverso i contributi di ogni progetto Kaizen.
 *
 * Props:
 *   baseline: { label, value } — es. { label: '2025 Estimation', value: 79 }
 *   improvements: Array di { id, label, value, color? } — gain di ogni progetto
 *   forecast: { label, value } — es. { label: 'Forecast after improvements', value: 81.5 }
 *   target: { label, value } — es. { label: '2026 Target', value: 81 }
 *   unit: '%' | 'nr' | '€' | ...
 *   title: titolo grafico
 *   subtitle: sottotitolo
 *   yAxisMin, yAxisMax: range Y opzionale
 */
export default function BridgeChart({
  baseline = { label: 'Baseline', value: 0 },
  improvements = [],
  forecast = null,
  target = null,
  unit = '%',
  title = 'Bridge Chart',
  subtitle = '',
  yAxisMin = null,
  yAxisMax = null,
}) {
  // Prepara dati per grafico
  // Ogni barra ha: name, start, value (gain), color, isTotal (true per baseline/forecast/target)
  const chartData = useMemo(() => {
    const data = []

    // Baseline (barra piena dal 0)
    const baseValue = parseFloat(baseline.value) || 0
    data.push({
      name: baseline.label || 'Baseline',
      start: 0,
      gain: baseValue,
      total: baseValue,
      color: '#9CA3AF',  // grigio
      isTotal: true,
      displayValue: baseValue,
    })

    // Improvements (barre flottanti)
    let running = baseValue
    improvements.forEach((imp, idx) => {
      const impValue = parseFloat(imp.value) || 0
      if (impValue === 0) return  // skip zero
      const isGain = impValue > 0
      data.push({
        name: imp.label || `Improvement ${idx + 1}`,
        start: isGain ? running : running + impValue,
        gain: Math.abs(impValue),
        total: running + impValue,
        color: imp.color || (isGain ? '#60A5FA' : '#F87171'),
        isTotal: false,
        displayValue: impValue,
      })
      running += impValue
    })

    // Forecast (barra piena dal 0)
    if (forecast) {
      const fValue = parseFloat(forecast.value) || running
      data.push({
        name: forecast.label || 'Forecast',
        start: 0,
        gain: fValue,
        total: fValue,
        color: '#FBBF24',  // giallo/arancio
        isTotal: true,
        displayValue: fValue,
      })
    }

    // Target (barra piena dal 0)
    if (target) {
      const tValue = parseFloat(target.value) || 0
      data.push({
        name: target.label || 'Target',
        start: 0,
        gain: tValue,
        total: tValue,
        color: '#F59E0B',  // arancio scuro
        isTotal: true,
        displayValue: tValue,
      })
    }

    return data
  }, [baseline, improvements, forecast, target])

  // Calcola auto-range Y se non specificato
  const yDomain = useMemo(() => {
    if (yAxisMin !== null && yAxisMax !== null) return [yAxisMin, yAxisMax]
    const allValues = chartData.map(d => d.total)
    if (allValues.length === 0) return [0, 100]
    const max = Math.max(...allValues)
    const min = Math.min(...allValues)
    const range = max - min
    return [
      Math.max(0, Math.floor(min - range * 0.3)),
      Math.ceil(max + range * 0.2),
    ]
  }, [chartData, yAxisMin, yAxisMax])

  const targetValue = target ? parseFloat(target.value) || 0 : null

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-sm">Aggiungi una baseline e dei progetti per visualizzare il Bridge chart</p>
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

      {/* Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={chartData} margin={{ top: 30, right: 40, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis
              domain={yDomain}
              label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8 }}
              formatter={(value, name, props) => {
                if (name === 'start') return null  // nascondi
                const data = props.payload
                if (data.isTotal) {
                  return [`${data.displayValue} ${unit}`, 'Valore']
                }
                return [
                  `${data.displayValue > 0 ? '+' : ''}${data.displayValue} ${unit}`,
                  'Δ Improvement'
                ]
              }}
            />

            {/* Barra invisibile per offset (stacked) */}
            <Bar dataKey="start" stackId="bridge" fill="transparent" />

            {/* Barra colorata visibile */}
            <Bar dataKey="gain" stackId="bridge" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} stroke={entry.isTotal ? '#444' : 'none'} strokeWidth={entry.isTotal ? 1 : 0} />
              ))}
              <LabelList
                dataKey="displayValue"
                position="top"
                formatter={(val) => val !== 0 ? `${val > 0 && chartData.find(d => d.displayValue === val && !d.isTotal) ? '+' : ''}${val}` : ''}
                style={{ fontSize: 11, fontWeight: 600 }}
              />
            </Bar>

            {/* Linea target verde orizzontale */}
            {targetValue !== null && (
              <ReferenceLine
                y={targetValue}
                stroke="#10b981"
                strokeWidth={3}
                label={{
                  value: `Target: ${targetValue} ${unit}`,
                  position: 'right',
                  fill: '#10b981',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda compatta */}
      <div className="border-t bg-gray-50 px-4 py-2 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9CA3AF' }} />
          <span>Baseline</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-400" />
          <span>Improvement (gain)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-400" />
          <span>Loss (perdita)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FBBF24' }} />
          <span>Forecast</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }} />
          <span>Target</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <div className="w-4 h-1 bg-green-500" />
          <span>Linea target</span>
        </div>
      </div>
    </div>
  )
}
