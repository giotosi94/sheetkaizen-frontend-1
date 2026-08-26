import { ClipboardList, AlertTriangle } from 'lucide-react'

const RAMI_LABEL = {
  people: 'People',
  machine: 'Machine',
  methods: 'Methods',
  materials: 'Materials',
  measurement: 'Measurement',
  environment: 'Environment',
}

function calcRpn(node) {
  const s = parseInt(node?.severity) || 0
  const o = parseInt(node?.occurrence) || 0
  const d = parseInt(node?.detection) || 0
  return s * o * d
}

function rpnClass(rpn) {
  if (rpn >= 200) return { label: 'CRITICO', color: '#dc2626', badge: 'bg-red-600 text-white' }
  if (rpn >= 100) return { label: 'ALTO', color: '#f97316', badge: 'bg-orange-500 text-white' }
  if (rpn >= 40) return { label: 'MEDIO', color: '#eab308', badge: 'bg-yellow-500 text-white' }
  if (rpn > 0) return { label: 'BASSO', color: '#22c55e', badge: 'bg-green-500 text-white' }
  return { label: '—', color: '#cbd5e1', badge: 'bg-gray-200 text-gray-600' }
}

function suggestPriority(node, rpn) {
  const s = parseInt(node?.severity) || 0
  if (rpn >= 200 || s >= 9) return 'Critical'
  if (rpn >= 100) return 'High'
  if (rpn >= 40) return 'Medium'
  return 'Low'
}

function collectRiskNodes(rami) {
  const result = []

  const walk = (node, ramoId) => {
    if (!node) return
    const rpn = calcRpn(node)
    if (rpn > 0) {
      result.push({
        id: node.id,
        label: node.label || '(senza descrizione)',
        ramo: RAMI_LABEL[ramoId] || ramoId,
        severity: parseInt(node.severity) || 0,
        occurrence: parseInt(node.occurrence) || 0,
        detection: parseInt(node.detection) || 0,
        rpn,
        isRoot: node.is_root_cause === true,
        node,
      })
    }
    ;(node.children || []).forEach(child => walk(child, ramoId))
  }

  Object.entries(rami || {}).forEach(([ramoId, cause]) => {
    if (Array.isArray(cause)) cause.forEach(node => walk(node, ramoId))
  })

  return result.sort((a, b) => b.rpn - a.rpn)
}

export default function RiskPrioritizationChart({ rami = {}, effetto = '', onCreateActionPlan }) {
  const risks = collectRiskNodes(rami)

  if (risks.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center text-sm text-gray-400">
        Nessun rischio valutato. Assegna Severità, Occorrenza e Rilevabilità alle cause nei 5 Perché per generare la priorità.
      </div>
    )
  }

  const maxRpn = Math.max(...risks.map(r => r.rpn), 1)
  const critici = risks.filter(r => r.rpn >= 200).length
  const alti = risks.filter(r => r.rpn >= 100 && r.rpn < 200).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase">Rischi valutati</div>
          <div className="text-2xl font-bold text-primary">{risks.length}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-xs text-red-600 uppercase">Critici</div>
          <div className="text-2xl font-bold text-red-700">{critici}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <div className="text-xs text-orange-600 uppercase">Alti</div>
          <div className="text-2xl font-bold text-orange-700">{alti}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase">RPN massimo</div>
          <div className="text-2xl font-bold text-gray-700">{maxRpn}</div>
        </div>
      </div>
      </div>

      <div>
        <h4 className="font-bold text-sm text-gray-700 mb-3">Matrice Severità × Occorrenza</h4>
        <div className="overflow-x-auto">
          <div className="inline-flex">
            <div className="flex flex-col justify-between py-2 pr-2 text-[10px] text-gray-500">
              <span>10</span>
              <span className="rotate-[-90deg] whitespace-nowrap font-semibold">Severità</span>
              <span>1</span>
            </div>

            <div>
              <div
                className="grid border-l border-b border-gray-300"
                style={{ gridTemplateColumns: 'repeat(10, 28px)', gridTemplateRows: 'repeat(10, 28px)' }}
              >
                {Array.from({ length: 10 }).map((_, rowIdx) => {
                  const severity = 10 - rowIdx
                  return Array.from({ length: 10 }).map((__, colIdx) => {
                    const occurrence = colIdx + 1
                    const cellRisks = risks.filter(r => r.severity === severity && r.occurrence === occurrence)
                    const product = severity * occurrence
                    const bg =
                      product >= 64 ? 'rgba(220,38,38,0.15)' :
                      product >= 32 ? 'rgba(249,115,22,0.15)' :
                      product >= 12 ? 'rgba(234,179,8,0.12)' :
                      'rgba(34,197,94,0.08)'

                    return (
                      <div
                        key={`${severity}_${occurrence}`}
                        className="border-r border-t border-gray-200 flex items-center justify-center relative"
                        style={{ backgroundColor: bg }}
                        title={`Severità ${severity} · Occorrenza ${occurrence}`}
                      >
                        {cellRisks.length > 0 && (
                          <span
                            className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                            style={{ backgroundColor: rpnClass(cellRisks[0].rpn).color }}
                            title={cellRisks.map(r => r.label).join(', ')}
                          >
                            {cellRisks.length}
                          </span>
                        )}
                      </div>
                    )
                  })
                })}
              </div>

              <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
                <span>1</span>
                <span className="font-semibold">Occorrenza</span>
                <span>10</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm text-gray-700 mb-3">Tabella priorità</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase text-gray-600">
                <th className="p-2 border-b">Causa</th>
                <th className="p-2 border-b">Ramo</th>
                <th className="p-2 border-b text-center">S</th>
                <th className="p-2 border-b text-center">O</th>
                <th className="p-2 border-b text-center">D</th>
                <th className="p-2 border-b text-center">RPN</th>
                <th className="p-2 border-b text-center">Priorità</th>
                <th className="p-2 border-b"></th>
              </tr>
            </thead>
            <tbody>
              {risks.map(risk => {
                const info = rpnClass(risk.rpn)
                const priority = suggestPriority(risk.node, risk.rpn)

                return (
                  <tr key={risk.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {risk.isRoot && <AlertTriangle size={12} className="inline text-red-600 mr-1" />}
                      {risk.label}
                    </td>
                    <td className="p-2 text-xs text-gray-500">{risk.ramo}</td>
                    <td className="p-2 text-center">{risk.severity}</td>
                    <td className="p-2 text-center">{risk.occurrence}</td>
                    <td className="p-2 text-center">{risk.detection}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-xs ${info.badge}`}>{risk.rpn}</span>
                    </td>
                    <td className="p-2 text-center text-xs font-medium">{priority}</td>
                    <td className="p-2 text-center">
                      {onCreateActionPlan && (
                        <button
                          onClick={() => onCreateActionPlan(risk.node, effetto)}
                          className="text-xs px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1.5 font-medium mx-auto"
                        >
                          <ClipboardList size={13} />
                          Action Plan
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
