import { ClipboardList, Target } from 'lucide-react'

const RAMI = {
  people: 'People',
  machine: 'Machine',
  methods: 'Methods',
  materials: 'Materials',
  measurement: 'Measurement',
  environment: 'Environment',
}

/**
 * FiveWhysFlowChart — Visualizzazione read-only delle catene 5 Perché
 * 
 * Estrae automaticamente dalle cause dell'Ishikawa (rami) tutte le catene
 * causa → perché → perché → ... → root cause
 * 
 * Props:
 *   - rami: { people: [...], machine: [...], ... }  (dall'Ishikawa)
 *   - effetto: stringa, problema principale
 *   - onCreateActionPlan: callback(rootCauseNode, problema) quando click "Crea AP"
 */
export default function FiveWhysFlowChart({ rami = {}, effetto = '', onCreateActionPlan }) {
  // Estrai tutte le catene da ogni ramo
  const catene = []
  Object.entries(rami).forEach(([ramoId, cause]) => {
    cause.forEach(causa => {
      // Estrai la catena più profonda che termina con la root cause (o l'ultima foglia)
      const chain = buildChain(causa)
      if (chain.length > 0) {
        catene.push({
          ramo: ramoId,
          ramoLabel: RAMI[ramoId] || ramoId,
          causaLabel: causa.label,
          chain,
          rootCause: chain.find(n => n.is_root_cause) || null,
        })
      }
    })
  })

  const catenePopolate = catene.filter(c => c.chain.length > 1) // solo quelle con almeno un perché
  const cateneVuote = catene.filter(c => c.chain.length <= 1)

  if (catene.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
        Nessuna causa identificata nello Step 2.
        Vai a compilare l'Ishikawa per veder apparire qui le catene dei 5 Perché.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con effetto */}
      <div className="bg-white rounded-xl shadow p-4 border-l-4 border-primary">
        <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
          Effetto / Problema
        </label>
        <div className="text-lg font-bold text-gray-800">
          {effetto || '(non specificato)'}
        </div>
      </div>

      {/* Catene popolate */}
      {catenePopolate.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase text-gray-600">
            Catene 5 Perché ({catenePopolate.length})
          </h3>
          {catenePopolate.map((c, idx) => (
            <CatenaCard
              key={`${c.ramo}_${idx}`}
              catena={c}
              effetto={effetto}
              onCreateActionPlan={onCreateActionPlan}
            />
          ))}
        </div>
      )}

      {/* Cause senza perché esplorati */}
      {cateneVuote.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-3 text-sm">
          <div className="font-semibold text-yellow-800 mb-1">
            {cateneVuote.length} cause senza perché esplorati
          </div>
          <div className="text-xs text-yellow-700">
            Torna allo Step 2 e usa il bottone <strong>+</strong> per aggiungere i Perché:
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {cateneVuote.map((c, idx) => (
              <span key={idx} className="text-xs bg-white border border-yellow-300 px-2 py-1 rounded">
                <span className="text-[10px] uppercase opacity-60">{c.ramoLabel}</span>
                <span className="ml-1 font-medium">{c.causaLabel}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Card di una singola catena (con frecce)
// ──────────────────────────────────────────────────────────
function CatenaCard({ catena, effetto, onCreateActionPlan }) {
  const { ramoLabel, chain, rootCause } = catena

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {ramoLabel}
        </span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-sm text-gray-600">{chain.length - 1} livelli di Perché</span>
        {rootCause && (
          <span className="ml-auto text-[10px] uppercase font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
            <Target size={10} /> ROOT CAUSE individuata
          </span>
        )}
      </div>

      {/* Catena orizzontale con frecce */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
        {chain.map((nodo, idx) => {
          const isFirst = idx === 0
          const isLast = idx === chain.length - 1
          const isRoot = nodo.is_root_cause
          
          return (
            <div key={nodo.id} className="flex items-center flex-shrink-0">
              {/* Box nodo */}
              <div
                className={`min-w-[160px] max-w-[200px] border-2 rounded-lg p-2 ${
                  isRoot
                    ? 'border-red-500 bg-red-50'
                    : isFirst
                    ? 'border-primary bg-blue-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className={`text-[9px] font-bold uppercase mb-1 ${
                  isRoot ? 'text-red-700' : isFirst ? 'text-primary' : 'text-gray-500'
                }`}>
                  {isRoot ? 'ROOT CAUSE' : isFirst ? 'Causa' : `Perché #${idx}`}
                </div>
                <div className={`text-sm ${isRoot ? 'font-bold text-red-900' : 'text-gray-800'}`}>
                  {nodo.label || '(vuoto)'}
                </div>
                {nodo.voti > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div
                        key={n}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: n <= nodo.voti ? '#1e3a8a' : '#e5e7eb',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Freccia */}
              {!isLast && (
                <div className="text-gray-400 px-1 text-xl font-bold">→</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottone "Crea Action Plan" sotto la catena (solo se c'è root cause) */}
      {rootCause && onCreateActionPlan && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2">
          <span className="text-xs text-gray-600">
            Azione da intraprendere su <strong className="text-red-700">{rootCause.label}</strong>:
          </span>
          <button
            onClick={() => onCreateActionPlan(rootCause, effetto || catena.causaLabel)}
            className="ml-auto text-xs px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1.5 font-medium"
          >
            <ClipboardList size={13} />
            Crea Action Plan
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Costruisce la catena dal nodo causa fino alla foglia più profonda.
 * Se trova un nodo "is_root_cause" termina lì.
 * Strategia: cerca il percorso che contiene la root cause; se non c'è root cause,
 * scende seguendo il primo figlio fino alla foglia.
 */
function buildChain(causaNode) {
  // Prima cerca il percorso con root cause
  const pathWithRoot = findPathToRootCause(causaNode)
  if (pathWithRoot) return pathWithRoot
  
  // Altrimenti: percorso lineare seguendo il primo figlio (catena più profonda)
  const path = []
  let current = causaNode
  while (current) {
    path.push(current)
    current = current.children?.[0] || null
  }
  return path
}

function findPathToRootCause(node, path = []) {
  const newPath = [...path, node]
  if (node.is_root_cause) return newPath
  if (!node.children?.length) return null
  
  for (const child of node.children) {
    const result = findPathToRootCause(child, newPath)
    if (result) return result
  }
  return null
}
