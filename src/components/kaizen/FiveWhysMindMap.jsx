import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Plus, X, Target, ClipboardList } from 'lucide-react'

/**
 * FiveWhysMindMap — Mind map radiale dei 5 Perché
 *
 * Props:
 *   - alberi: array di alberi (uno per ogni causa esplorata dall'Ishikawa)
 *     [{ id, problema, root: { id, perche, voti, is_root_cause, children: [...] } }]
 *   - onChange: callback(alberi) con la nuova struttura
 *   - onCreateActionPlan: callback(rootCause, alberoProblema) quando clicco "Crea AP"
 *   - newPromosso: opzionale, causa da Ishikawa appena promossa → crea nuovo albero
 *
 * I nodi React Flow vengono generati ad ogni render da "alberi".
 * Quando l'utente modifica un nodo, aggiorniamo "alberi" e onChange viene chiamato.
 */
export default function FiveWhysMindMap({ alberi = [], onChange, onCreateActionPlan, newPromosso = null }) {
  const [localAlberi, setLocalAlberi] = useState(alberi)
  const [selectedAlberoId, setSelectedAlberoId] = useState(alberi[0]?.id || null)
  const isFirstRender = useRef(true)

  // Quando il padre passa una causa promossa dall'Ishikawa, creo un nuovo albero
  useEffect(() => {
    if (!newPromosso) return
    const newAlbero = {
      id: `t_${Date.now()}`,
      problema: newPromosso.label || 'Nuova causa da esplorare',
      root: {
        id: `n_${Date.now()}`,
        perche: '',
        voti: 0,
        is_root_cause: false,
        children: [],
      },
    }
    setLocalAlberi(prev => [...prev, newAlbero])
    setSelectedAlberoId(newAlbero.id)
  }, [newPromosso])

  // Notifica il padre quando cambia
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onChange?.(localAlberi)
  }, [localAlberi])

  // ──────────────────────────────────────────
  // CRUD alberi
  // ──────────────────────────────────────────
  function addAlbero() {
    const newAlbero = {
      id: `t_${Date.now()}`,
      problema: '',
      root: {
        id: `n_${Date.now()}`,
        perche: '',
        voti: 0,
        is_root_cause: false,
        children: [],
      },
    }
    setLocalAlberi(prev => [...prev, newAlbero])
    setSelectedAlberoId(newAlbero.id)
  }

  function removeAlbero(alberoId) {
    if (!confirm('Eliminare questo albero dei 5 Perché?')) return
    setLocalAlberi(prev => {
      const next = prev.filter(t => t.id !== alberoId)
      if (selectedAlberoId === alberoId && next.length > 0) {
        setSelectedAlberoId(next[0].id)
      } else if (next.length === 0) {
        setSelectedAlberoId(null)
      }
      return next
    })
  }

  function updateAlbero(alberoId, updates) {
    setLocalAlberi(prev =>
      prev.map(t => t.id === alberoId ? { ...t, ...updates } : t)
    )
  }

  const selectedAlbero = localAlberi.find(t => t.id === selectedAlberoId)

  return (
    <div className="space-y-4">
      {/* Lista alberi (tabs orizzontali) */}
      <div className="bg-white rounded-xl shadow p-3">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-bold uppercase text-gray-600">Alberi 5 Perché</h3>
          <button
            onClick={addAlbero}
            className="ml-auto text-xs px-2 py-1 bg-primary text-white rounded flex items-center gap-1 hover:bg-primary-light"
          >
            <Plus size={12} /> Nuovo albero
          </button>
        </div>

        {localAlberi.length === 0 ? (
          <div className="text-xs text-gray-400 italic text-center py-3">
            Nessun albero. Aggiungine uno o esplora una causa dall'Ishikawa.
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {localAlberi.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedAlberoId(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border ${
                  selectedAlberoId === t.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary'
                }`}
              >
                <span className="font-medium truncate max-w-[200px]">
                  {t.problema || '(senza titolo)'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor albero selezionato */}
      {selectedAlbero && (
        <ReactFlowProvider>
          <AlberoEditor
            albero={selectedAlbero}
            onUpdate={(updates) => updateAlbero(selectedAlbero.id, updates)}
            onDelete={() => removeAlbero(selectedAlbero.id)}
            onCreateActionPlan={onCreateActionPlan}
          />
        </ReactFlowProvider>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Editor di un singolo albero (mind map con React Flow)
// ──────────────────────────────────────────────────────────
function AlberoEditor({ albero, onUpdate, onDelete, onCreateActionPlan }) {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])

  // Genera nodi/edges dall'albero ad ogni cambio
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = albero2Graph(albero)
    setNodes(newNodes)
    setEdges(newEdges)
  }, [albero])

  // Handlers per modifiche posizione/zoom (React Flow)
  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [])
  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
  }, [])

  // ──────────────────────────────────────────
  // CRUD nodi dell'albero
  // ──────────────────────────────────────────
  function addChildToNode(parentId) {
    const newChild = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      perche: '',
      voti: 0,
      is_root_cause: false,
      children: [],
    }
    const newRoot = aggiungiChild(albero.root, parentId, newChild)
    onUpdate({ root: newRoot })
  }

  function updateNode(nodeId, updates) {
    const newRoot = updateNodo(albero.root, nodeId, updates)
    onUpdate({ root: newRoot })
  }

  function removeNode(nodeId) {
    if (!confirm('Rimuovere questo nodo e tutti i suoi figli?')) return
    const newRoot = rimuoviNodo(albero.root, nodeId)
    if (!newRoot) {
      alert('Non puoi rimuovere il nodo radice. Elimina l\'intero albero invece.')
      return
    }
    onUpdate({ root: newRoot })
  }

  function toggleRootCause(nodeId) {
    // Solo un nodo per albero può essere "root cause"
    const newRoot = setRootCause(albero.root, nodeId)
    onUpdate({ root: newRoot })
  }

  // Custom node type
  const nodeTypes = useMemo(() => ({
    perche: (props) => (
      <PercheNode
        {...props}
        onAddChild={addChildToNode}
        onUpdate={updateNode}
        onRemove={removeNode}
        onToggleRootCause={toggleRootCause}
        onCreateActionPlan={() => {
          const rootCauseNode = trovaRootCause(albero.root)
          if (rootCauseNode) {
            onCreateActionPlan?.(rootCauseNode, albero.problema)
          }
        }}
      />
    ),
  }), [albero])

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      {/* Header con problema modificabile */}
      <div className="bg-gray-50 border-b p-3 flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
            Problema da analizzare
          </label>
          <input
            value={albero.problema}
            onChange={(e) => onUpdate({ problema: e.target.value })}
            className="w-full border-2 border-gray-200 rounded px-3 py-1.5 text-sm font-bold focus:border-primary focus:outline-none"
          />
        </div>
        <button
          onClick={onDelete}
          className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Elimina albero
        </button>
      </div>

      {/* Mind map React Flow */}
      <div style={{ height: 600 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
        >
          <Background gap={20} color="#e5e7eb" />
          <Controls />
          <MiniMap nodeColor={(n) => n.data?.is_root_cause ? '#ef4444' : '#3b82f6'} />
        </ReactFlow>
      </div>

      {/* Legenda */}
      <div className="p-3 bg-gray-50 border-t text-[10px] text-gray-500 flex flex-wrap gap-3 items-center">
        <span><b>Trascina</b> per spostare i nodi</span>
        <span>·</span>
        <span><b>Scroll</b> per zoomare</span>
        <span>·</span>
        <span>Click sull'icona <Target size={10} className="inline" /> per segnare la ROOT CAUSE</span>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Nodo "Perché?" custom
// ──────────────────────────────────────────────────────────
function PercheNode({ id, data }) {
  const { perche, voti, is_root_cause, isRoot, onAddChild, onUpdate, onRemove, onToggleRootCause, onCreateActionPlan } = data

  return (
    <div
      className={`bg-white border-2 rounded-lg shadow-md p-2 min-w-[220px] ${
        is_root_cause
          ? 'border-red-500 ring-4 ring-red-200'
          : isRoot
          ? 'border-primary'
          : 'border-gray-300'
      }`}
    >
      <Handle type="target" position={Position.Top} />

      {/* Badge tipo */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
          is_root_cause
            ? 'bg-red-100 text-red-700'
            : isRoot
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {is_root_cause ? 'ROOT CAUSE' : isRoot ? 'Perché #1' : 'Perché'}
        </span>

        {!isRoot && (
          <button
            onClick={() => onRemove(id)}
            className="text-red-400 hover:bg-red-50 rounded p-0.5"
            title="Rimuovi nodo"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Textarea per il "perché?" */}
      <textarea
        value={perche || ''}
        onChange={(e) => onUpdate(id, { perche: e.target.value })}
        placeholder="Perché?"
        rows={2}
        className="w-full text-xs border rounded p-1 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Voting */}
      <div className="flex items-center justify-between mt-1.5">
        <VotingPallini
          value={voti || 0}
          onChange={(v) => onUpdate(id, { voti: v })}
          color="#3b82f6"
        />

        <div className="flex gap-1">
          {/* Toggle root cause */}
          <button
            onClick={() => onToggleRootCause(id)}
            className={`p-1 rounded text-[10px] ${
              is_root_cause
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={is_root_cause ? 'Rimuovi ROOT CAUSE' : 'Segna come ROOT CAUSE'}
          >
            <Target size={11} />
          </button>

          {/* Aggiungi figlio */}
          <button
            onClick={() => onAddChild(id)}
            className="p-1 rounded bg-primary text-white hover:bg-primary-light"
            title="Aggiungi un Perché figlio"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Bottone "Crea AP" SOLO se è la root cause */}
      {is_root_cause && (
        <button
          onClick={onCreateActionPlan}
          className="w-full mt-2 text-[10px] px-2 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 flex items-center justify-center gap-1 font-bold"
        >
          <ClipboardList size={11} />
          Crea Action Plan da questa causa
        </button>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Voting 1-5 pallini (riutilizzato dall'Ishikawa)
// ──────────────────────────────────────────────────────────
function VotingPallini({ value, onChange, color = '#3b82f6' }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? 0 : n)}
          className="w-2.5 h-2.5 rounded-full border transition-all"
          style={{
            backgroundColor: n <= value ? color : 'transparent',
            borderColor: n <= value ? color : '#d1d5db',
          }}
        />
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// HELPERS — albero ↔ grafo React Flow
// ──────────────────────────────────────────────────────────

/**
 * Trasforma un albero (struttura ricorsiva) in nodes + edges per React Flow.
 * Calcola la posizione automatica con layout "tree" semplice.
 */
function albero2Graph(albero) {
  const nodes = []
  const edges = []
  const xSpacing = 280
  const ySpacing = 160

  function walk(nodo, depth, xOffset, isRoot) {
    const x = xOffset
    const y = depth * ySpacing

    nodes.push({
      id: nodo.id,
      type: 'perche',
      position: { x, y },
      data: {
        perche: nodo.perche,
        voti: nodo.voti,
        is_root_cause: nodo.is_root_cause,
        isRoot,
      },
    })

    const children = nodo.children || []
    if (children.length === 0) return { width: xSpacing }

    let totalWidth = 0
    children.forEach((child, idx) => {
      const childResult = walk(child, depth + 1, xOffset + totalWidth, false)
      edges.push({
        id: `e_${nodo.id}_${child.id}`,
        source: nodo.id,
        target: child.id,
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      })
      totalWidth += childResult.width
    })

    return { width: Math.max(xSpacing, totalWidth) }
  }

  walk(albero.root, 0, 0, true)
  return { nodes, edges }
}

/**
 * Aggiunge un nuovo figlio a un nodo specifico (ricerca ricorsiva).
 */
function aggiungiChild(nodo, parentId, newChild) {
  if (nodo.id === parentId) {
    return { ...nodo, children: [...(nodo.children || []), newChild] }
  }
  return {
    ...nodo,
    children: (nodo.children || []).map(c => aggiungiChild(c, parentId, newChild)),
  }
}

/**
 * Aggiorna un nodo specifico (ricerca ricorsiva).
 */
function updateNodo(nodo, nodeId, updates) {
  if (nodo.id === nodeId) {
    return { ...nodo, ...updates }
  }
  return {
    ...nodo,
    children: (nodo.children || []).map(c => updateNodo(c, nodeId, updates)),
  }
}

/**
 * Rimuove un nodo dall'albero (ricerca ricorsiva).
 * Ritorna null se si tenta di rimuovere la radice.
 */
function rimuoviNodo(nodo, nodeId) {
  if (nodo.id === nodeId) return null  // non si può rimuovere la radice
  return {
    ...nodo,
    children: (nodo.children || [])
      .filter(c => c.id !== nodeId)
      .map(c => rimuoviNodo(c, nodeId))
      .filter(Boolean),
  }
}

/**
 * Marca un nodo come ROOT CAUSE.
 * Toglie il flag a tutti gli altri nodi (solo 1 per albero).
 */
function setRootCause(nodo, nodeId) {
  const isTarget = nodo.id === nodeId
  return {
    ...nodo,
    is_root_cause: isTarget ? !nodo.is_root_cause : false,
    children: (nodo.children || []).map(c => setRootCause(c, nodeId)),
  }
}

/**
 * Trova il nodo segnato come ROOT CAUSE.
 */
function trovaRootCause(nodo) {
  if (nodo.is_root_cause) return nodo
  for (const child of nodo.children || []) {
    const found = trovaRootCause(child)
    if (found) return found
  }
  return null
}
