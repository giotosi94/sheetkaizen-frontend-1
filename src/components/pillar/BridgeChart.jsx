import { useMemo } from 'react'
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts'

/**
 * Bridge Chart con supporto:
 * - Side-by-side: improvementsPlanned a sinistra, improvementsActual a destra
 * - Zoom asse Y manuale (yAxisMin, yAxisMax)
 * - Linea target orizzontale
 */
export default function BridgeChart({
  baseline = { label: 'Baseline', value: 0 },
  improvements = [],          // usati come improvements pianificati (compatibile col passato)
  improvementsActual = null,  // se passato, attiva side-by-side
  forecast = null,
  actual = null,
  target = null,
  unit = '%',
  title = 'Bridge Chart',
  subtitle = '',
  yAxisMin = null,
  yAxisMax = null,
}) {
  const chartData = useMemo(() => {
    const data = []
    const baseValue = parseFloat(baseline.value) || 0

    // 1) Baseline iniziale
    data.push({
      name: baseline.label || 'Baseline',
      start: 0,
      gain: baseValue,
      total: baseValue,
      color: '#9CA3AF',
      isTotal: true,
      displayValue: baseValue,
    })

    // 2) Improvements PIANIFICATI (a sinistra)
    let runningPlanned = baseValue
    improvements.forEach((imp, idx) => {
      const impValue = parseFloat(imp.value) || 0
      if (impValue === 0) return
      const isGain = impValue > 0
      data.push({
        name: imp.label || `P${idx + 1}`,
        start: isGain ? runningPlanned : runningPlanned + impValue,
        gain: Math.abs(impValue),
        total: runningPlanned + impValue,
        color: imp.color || '#FBBF24',
        isTotal: false,
        displayValue: impValue,
      })
      runningPlanned += impValue
    })

    // 3) Forecast Pianificato
    if (forecast) {
      const fValue = parseFloat(forecast.value) || runningPlanned
      data.push({
        name: forecast.label || 'Pianificato',
        start: 0,
        gain: fValue,
        total: fValue,
        color: '#FBBF24',
        isTotal: true,
        displayValue: fValue,
      })
    }

    // 4) Improvements REALI (a destra) — solo se passati
    if (improvementsActual && improvementsActual.length > 0) {
      let runningActual = baseValue
      improvementsActual.forEach((imp, idx) => {
        const impValue = parseFloat(imp.value) || 0
        if (impValue === 0) return
        const isGain = impValue > 0
        data.push({
          name: imp.label || `A${idx + 1}`,
          start: isGain ? runningActual : runningActual + impValue,
          gain: Math.abs(impValue),
          total: runningActual + impValue,
          color: imp.color || '#F97316',
          isTotal: false,
          displayValue: impValue,
        })
        runningActual += impValue
      })
    }

    // 5) Actual finale
    if (actual) {
      const aValue = parseFloat(actual.value) || 0
      data.push({
        name: actual.label || 'Reale',
        start: 0,
        gain: aValue,
        total: aValue,
        color: '#F97316',
        isTotal: true,
        displayValue: aValue,
      })
    }

    return data
  }, [baseline, improvements, improvementsActual, forecast, actual])

  // Domain Y: usa min/max manuali se forniti, altrimenti auto
  const yDomain = useMemo(() => {
    if (yAxisMin !== null && yAxisMax !== null && !isNaN(yAxisMin) && !isNaN(yAxisMax)) {
      return [Number(yAxisMin), Number(yAxisMax)]
    }
    const allValues = chartData.map(d => d.total).filter(v => !isNaN(v))
    if (allValues.length === 0) return [0, 100]
    const max = Math.max(...allValues)
    const min = Math.min(...allValues)
    const range = max - min || 1
    return [
      Math.max(0, Math.floor(min - range * 0.3)),
      Math.ceil(max + range * 0.2),
    ]
  }, [chartData, yAxisMin, yAxisMax])

  const targetValue = target ? parseFloat(target.value) || 0 : null

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
        <p className="text-sm">Nessun dato disponibile</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
      <div className="bg-blue-600 text-white px-4 py-3 text-center">
        <div className="font-bold text-lg">{title}</div>
        {subtitle && <div className="text-xs opacity-90 mt-0.5">{subtitle}</div>}
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={chartData} margin={{ top: 30, right: 60, left: 20, bottom: 100 }}>
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
              type="number"
              domain={yDomain}
              allowDataOverflow={true}
              label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8 }}
              formatter={(value, name, props) => {
                if (name === 'start') return null
                const d = props.payload
                if (d.isTotal) return [`${d.displayValue} ${unit}`, 'Valore']
                return [`${d.displayValue > 0 ? '+' : ''}${d.displayValue} ${unit}`, 'Δ']
              }}
            />

            <Bar dataKey="start" stackId="bridge" fill="transparent" />
            <Bar dataKey="gain" stackId="bridge" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} stroke={entry.isTotal ? '#444' : 'none'} strokeWidth={entry.isTotal ? 1 : 0} />
              ))}
              <LabelList
                dataKey="displayValue"
                position="top"
                formatter={(val) => val !== 0 ? `${val > 0 && val < 10 ? '+' : ''}${val}` : ''}
                style={{ fontSize: 11, fontWeight: 600 }}
              />
            </Bar>

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
          <span>Punto di partenza</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FBBF24' }} />
          <span>Pianificato</span>
        </div>
        {improvementsActual && improvementsActual.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }} />
            <span>Reale (Actual)</span>
          </div>
        )}
        {targetValue !== null && (
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-4 h-1 bg-green-500" />
            <span>Target</span>
          </div>
        )}
      </div>
    </div>
  )
}
