import { useMemo } from 'react'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'

/**
 * SkillRadarChart
 * Mostra 3 poligoni sovrapposti: Starting / Current / Target
 *
 * Props:
 *   data: array di { categoria: 'LPW Concetti Base', starting: 3.2, current: 3.8, target: 4.5 }
 *   title: titolo del grafico
 *   subtitle: sottotitolo opzionale
 *   height: altezza (default 400)
 *   showStarting: default true
 *   showCurrent: default true
 *   showTarget: default true
 */
export default function SkillRadarChart({
  data = [],
  title = 'Skill Radar',
  subtitle = '',
  height = 400,
  showStarting = true,
  showCurrent = true,
  showTarget = true,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
        <p className="text-sm">Nessun dato disponibile per il radar chart</p>
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
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="categoria"
              tick={{ fontSize: 11, fill: '#374151' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tickCount={6}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
            />

            {showStarting && (
              <Radar
                name="Starting"
                dataKey="starting"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            )}

            {showCurrent && (
              <Radar
                name="Current"
                dataKey="current"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            )}

            {showTarget && (
              <Radar
                name="Target"
                dataKey="target"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.15}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => value !== null && value !== undefined ? value.toFixed(2) : '—'}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda livelli */}
      <div className="border-t bg-gray-50 px-4 py-3">
        <div className="text-xs font-bold uppercase text-gray-600 mb-2">Legenda livelli</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px] text-gray-600">
          <div><span className="font-bold text-gray-700">1</span> — Non conoscere la teoria</div>
          <div><span className="font-bold text-gray-700">2</span> — Conoscere la teoria (DOCEBO)</div>
          <div><span className="font-bold text-gray-700">3</span> — Saper fare in condizioni STD</div>
          <div><span className="font-bold text-gray-700">4</span> — Saper fare in condizioni NON STD</div>
          <div><span className="font-bold text-gray-700">5</span> — Saper insegnare</div>
        </div>
      </div>
    </div>
  )
}
