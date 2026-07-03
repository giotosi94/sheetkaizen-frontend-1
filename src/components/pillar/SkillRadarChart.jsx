import { useMemo } from 'react'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'

// Custom tick per colorare le label dei vertici
function ColoredAxisTick(props) {
  const { payload, x, y, cx, cy, data } = props
  const entry = data.find(d => d.categoria === payload.value)
  const color = entry?.color || '#374151'
  const icon = entry?.icon || ''

  // Calcolo la direzione del testo per non farlo sovrapporre al centro
  const dx = x - cx
  const dy = y - cy
  let textAnchor = 'middle'
  if (dx > 10) textAnchor = 'start'
  else if (dx < -10) textAnchor = 'end'

  // Spezzo il testo se troppo lungo
  const words = String(payload.value).split(' ')
  const lines = []
  let currentLine = ''
  words.forEach(w => {
    if ((currentLine + ' ' + w).trim().length > 22) {
      if (currentLine) lines.push(currentLine.trim())
      currentLine = w
    } else {
      currentLine += ' ' + w
    }
  })
  if (currentLine) lines.push(currentLine.trim())

  return (
    <g>
      {/* Pallino colorato accanto al testo */}
      <circle
        cx={x + (textAnchor === 'end' ? -6 : textAnchor === 'start' ? 6 : 0)}
        cy={y - (lines.length - 1) * 6 - 4}
        r={4}
        fill={color}
      />
      <text
        x={x + (textAnchor === 'end' ? -14 : textAnchor === 'start' ? 14 : 0)}
        y={y - (lines.length - 1) * 6}
        textAnchor={textAnchor}
        fill={color}
        fontWeight="bold"
        fontSize={11}
      >
        {lines.map((line, i) => (
          <tspan key={i} x={x + (textAnchor === 'end' ? -14 : textAnchor === 'start' ? 14 : 0)} dy={i === 0 ? 0 : 13}>
            {i === 0 && icon ? `${icon} ${line}` : line}
          </tspan>
        ))}
      </text>
    </g>
  )
}

export default function SkillRadarChart({
  data = [],
  title = 'Skill Radar',
  subtitle = '',
  height = 450,
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
          <RadarChart data={data} outerRadius="65%">
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="categoria"
              tick={(props) => <ColoredAxisTick {...props} data={data} />}
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
              formatter={(value) => value !== null && value !== undefined ? Number(value).toFixed(2) : '—'}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

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
