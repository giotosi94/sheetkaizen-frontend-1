import { ClipboardList, Target } from 'lucide-react'

const RAMI = {
  people: 'People',
  machine: 'Machine',
  methods: 'Methods',
  materials: 'Materials',
  measurement: 'Measurement',
  environment: 'Environment',
}

export default function FiveWhysFlowChart({
  rami = {},
  effetto = '',
  onCreateActionPlan,
}) {
  const catene = []

  Object.entries(rami).forEach(([ramoId, cause]) => {
    if (!Array.isArray(cause)) return

    cause.forEach(causa => {
      const totalNodes = countTreeNodes(causa)
      const maxDepth = getTreeDepth(causa)
      const rootCauses = findAllRootCauses(causa)

      catene.push({
        ramo: ramoId,
        ramoLabel: RAMI[ramoId] || ramoId,
        causaLabel: causa.label,
        tree: causa,
        totalNodes,
        maxDepth,
        rootCauses,
      })
    })
  })

  const catenePopolate = catene.filter(catena => catena.totalNodes > 1)
  const cateneVuote = catene.filter(catena => catena.totalNodes <= 1)

  if (catene.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
        Nessuna causa identificata nello Step 2. Vai a compilare
        l&apos;Ishikawa per visualizzare qui l&apos;albero dei 5 Perché.
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="bg-white rounded-xl shadow p-4 border-l-4 border-primary">
        <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
          Effetto / Problema
        </label>

        <div className="text-lg font-bold text-gray-800">
          {effetto || '(non specificato)'}
        </div>
      </div>

      {catenePopolate.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase text-gray-600">
            Alberi dei 5 Perché ({catenePopolate.length})
          </h3>

          {catenePopolate.map((catena, index) => (
            <CatenaCard
              key={`${catena.ramo}_${catena.tree.id}_${index}`}
              catena={catena}
              effetto={effetto}
              onCreateActionPlan={onCreateActionPlan}
            />
          ))}
        </div>
      )}

      {cateneVuote.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-3 text-sm">
          <div className="font-semibold text-yellow-800 mb-1">
            {cateneVuote.length}{' '}
            {cateneVuote.length === 1
              ? 'causa senza perché esplorati'
              : 'cause senza perché esplorati'}
          </div>

          <div className="text-xs text-yellow-700">
            Torna allo Step 2 e usa il pulsante <strong>+</strong> sulla causa
            per aggiungere uno o più Perché.
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {cateneVuote.map((catena, index) => (
              <span
                key={`${catena.ramo}_${catena.tree.id}_${index}`}
                className="text-xs bg-white border border-yellow-300 px-2 py-1 rounded"
              >
                <span className="text-[10px] uppercase opacity-60">
                  {catena.ramoLabel}
                </span>

                <span className="ml-1 font-medium">
                  {catena.causaLabel || '(causa senza descrizione)'}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CatenaCard({
  catena,
  effetto,
  onCreateActionPlan,
}) {
  const {
    ramoLabel,
    tree,
    maxDepth,
    totalNodes,
    rootCauses,
  } = catena

  const whyLevels = Math.max(0, maxDepth - 1)
  const whyCount = Math.max(0, totalNodes - 1)

  return (
    <div className="w-full min-w-0 bg-white rounded-xl shadow p-4">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {ramoLabel}
        </span>

        <span className="text-xs text-gray-400">·</span>

        <span className="text-sm text-gray-600">
          {whyLevels}{' '}
          {whyLevels === 1
            ? 'livello di Perché'
            : 'livelli di Perché'}
        </span>

        <span className="text-xs text-gray-400">·</span>

        <span className="text-sm text-gray-600">
          {whyCount}{' '}
          {whyCount === 1 ? 'Perché inserito' : 'Perché inseriti'}
        </span>

        {rootCauses.length > 0 && (
          <span className="ml-auto text-[10px] uppercase font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
            <Target size={10} />

            {rootCauses.length === 1
              ? 'Root Cause individuata'
              : `${rootCauses.length} Root Cause individuate`}
          </span>
        )}
      </div>

      <div className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto pb-4">
        <div className="inline-block min-w-max pr-8">
          <CausalTreeNode
            node={tree}
            depth={0}
          />
        </div>
      </div>

      {rootCauses.length > 0 && onCreateActionPlan && (
        <div className="mt-4 pt-3 border-t space-y-2">
          <div className="text-xs font-bold uppercase text-gray-500">
            Root Cause individuate
          </div>

          {rootCauses.map(rootCause => (
            <div
              key={rootCause.id}
              className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-2"
            >
              <Target
                size={14}
                className="text-red-600 flex-shrink-0"
              />

              <span className="flex-1 text-sm font-medium text-red-900">
                {rootCause.label || '(Root Cause senza descrizione)'}
              </span>

              <button
                type="button"
                onClick={() => onCreateActionPlan(
                  rootCause,
                  effetto || catena.causaLabel
                )}
                className="flex-shrink-0 text-xs px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1.5 font-medium"
              >
                <ClipboardList size={13} />
                Crea Action Plan
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CausalTreeNode({
  node,
  depth,
}) {
  const children = Array.isArray(node.children)
    ? node.children
    : []

  const hasChildren = children.length > 0
  const isRoot = node.is_root_cause === true

  return (
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div
          className={`relative min-w-[180px] max-w-[220px] border-2 rounded-lg p-3 ${
            isRoot
              ? 'border-red-500 bg-red-50'
              : depth === 0
                ? 'border-primary bg-yellow-50'
                : 'border-gray-300 bg-white'
          }`}
        >
          <div
            className={`text-[9px] font-bold uppercase mb-1 ${
              isRoot
                ? 'text-red-700'
                : depth === 0
                  ? 'text-primary'
                  : 'text-gray-500'
            }`}
          >
            {isRoot
              ? 'Root Cause'
              : depth === 0
                ? 'Causa'
                : `Perché livello ${depth}`}
          </div>

          <div
            className={`text-sm break-words ${
              isRoot
                ? 'font-bold text-red-900'
                : 'text-gray-800'
            }`}
          >
            {node.label || '(vuoto)'}
          </div>

          {node.voti > 0 && (
            <div className="flex gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map(value => (
                <div
                  key={value}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: value <= node.voti
                      ? '#A9791C'
                      : '#e5e7eb',
                  }}
                />
              ))}
            </div>
          )}

          {hasChildren && (
            <span className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center z-10">
              {children.length}
            </span>
          )}
        </div>
      </div>

      {hasChildren && (
        <>
          <div className="w-10 h-px bg-gray-400 flex-shrink-0" />

          <div className="relative flex flex-col gap-3 py-2">
            {children.length > 1 && (
              <div className="absolute left-0 top-[24px] bottom-[24px] w-px bg-gray-400" />
            )}

            {children.map(child => (
              <div
                key={child.id}
                className="relative flex items-center"
              >
                <div className="w-8 h-px bg-gray-400 flex-shrink-0" />

                <CausalTreeNode
                  node={child}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function countTreeNodes(node) {
  const children = Array.isArray(node.children)
    ? node.children
    : []

  return 1 + children.reduce(
    (total, child) => total + countTreeNodes(child),
    0
  )
}

function getTreeDepth(node) {
  const children = Array.isArray(node.children)
    ? node.children
    : []

  if (children.length === 0) {
    return 1
  }

  return 1 + Math.max(
    ...children.map(child => getTreeDepth(child))
  )
}

function findAllRootCauses(node) {
  const results = []

  if (node.is_root_cause === true) {
    results.push(node)
  }

  const children = Array.isArray(node.children)
    ? node.children
    : []

  children.forEach(child => {
    results.push(...findAllRootCauses(child))
  })

  return results
}
