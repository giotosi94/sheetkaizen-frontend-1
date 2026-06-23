import { useState, useEffect, useRef } from 'react'
import { Plus, X, ChevronRight, ChevronDown, Target } from 'lucide-react'

// I 6 rami dell'Ishikawa (6M)
const RAMI = [
  { id: 'people',      label: 'People',      color: '#3b82f6' },  // blu
  { id: 'machine',     label: 'Machine',     color: '#ef4444' },  // rosso
  { id: 'methods',     label: 'Methods',     color: '#10b981' },  // verde
  { id: 'materials',   label: 'Materials',   color: '#f59e0b' },  // arancione
  { id: 'measurement', label: 'Measurement', color: '#8b5cf6' },  // viola
  { id: 'environment', label: 'Environment', color: '#06b6d4' },  // ciano
]

/**
 * IshikawaDiagram — Diagramma a spina di pesce interattivo
 * 
 * Props:
 *   - effetto: stringa, il "problema" centrale
 *   - rami: { people: [...], machine: [...], ... }
 *   - onChange: callback con { effetto, rami } aggiornati
 *   - onExploraInFiveWhys: callback(causa) quando l'utente vuole esplorare una causa nei 5 Perché
 * 
 * Struttura di una causa:
 *   { id, label, voti (0-5), subcauses: [...], promosso_a_5why: bool }
 */
export default function IshikawaDiagram({ effetto = '', rami = {}, onChange, onExploraInFiveWhys }) {
  const [localEffetto, setLocalEffetto] = useState(effetto)
  const [localRami, setLocalRami] = useState(() => {
    const init = {}
    RAMI.forEach(r => { init[r.id] = rami[r.id] || [] })
    return init
  })
  const [expandedCauses, setExpandedCauses] = useState(new Set())
  
  // Refs per onChange senza loop
  const isFirstRender = useRef(true)
  
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onChange?.({ effetto: localEffetto, rami: localRami })
  }, [localEffetto, localRami])
  
  // ──────────────────────────────────────────
  // Helpers per modificare cause/sotto-cause
  // ──────────────────────────────────────────
  function addCausa(ramoId) {
    const newCausa = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: '',
      voti: 0,
      subcauses: [],
      promosso_a_5why: false,
    }
    setLocalRami(prev => ({
      ...prev,
      [ramoId]: [...(prev[ramoId] || []), newCausa],
    }))
  }
  
  function updateCausa(ramoId, causaId, updates) {
    setLocalRami(prev => ({
      ...prev,
      [ramoId]: prev[ramoId].map(c => c.id === causaId ? { ...c, ...updates } : c),
    }))
  }
  
  function removeCausa(ramoId, causaId) {
    if (!confirm('Rimuovere questa causa e le sue sotto-cause?')) return
    setLocalRami(prev => ({
      ...prev,
      [ramoId]: prev[ramoId].filter(c => c.id !== causaId),
    }))
  }
  
  function addSubcausa(ramoId, causaId) {
    const newSub = {
      id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: '',
      voti: 0,
    }
    setLocalRami(prev => ({
      ...prev,
      [ramoId]: prev[ramoId].map(c =>
        c.id === causaId ? { ...c, subcauses: [...(c.subcauses || []), newSub] } : c
      ),
    }))
    // Auto-espandi quando aggiungi sotto-causa
    setExpandedCauses(prev => new Set(prev).add(causaId))
  }
  
  function updateSubcausa(ramoId, causaId, subId, updates) {
    setLocalRami(prev => ({
      ...prev,
      [ramoId]: prev[ramoId].map(c =>
        c.id === causaId
          ? { ...c, subcauses: c.subcauses.map(s => s.id === subId ? { ...s, ...updates } : s) }
          : c
      ),
    }))
  }
  
  function removeSubcausa(ramoId, causaId, subId) {
    setLocalRami(prev => ({
      ...prev,
      [ramoId]: prev[ramoId].map(c =>
        c.id === causaId ? { ...c, subcauses: c.subcauses.filter(s => s.id !== subId) } : c
      ),
    }))
  }
  
  function toggleExpand(causaId) {
    setExpandedCauses(prev => {
      const next = new Set(prev)
      if (next.has(causaId)) next.delete(causaId)
      else next.add(causaId)
      return next
    })
  }
  
  // ──────────────────────────────────────────
  // Statistiche
  // ──────────────────────────────────────────
  const totalCauses = Object.values(localRami).reduce((sum, arr) => sum + arr.length, 0)
  const totalSubcauses = Object.values(localRami).reduce(
    (sum, arr) => sum + arr.reduce((s, c) => s + (c.subcauses?.length || 0), 0),
    0
  )
  
  return (
    <div className="space-y-4">
      {/* Header con effetto + statistiche */}
      <div className="bg-white rounded-xl shadow p-4 border-l-4 border-primary">
        <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
          Effetto / Problema da analizzare
        </label>
        <input
          value={localEffetto}
          onChange={(e) => setLocalEffetto(e.target.value)}
          className="w-full text-lg font-bold border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-primary focus:outline-none"
        />
        <div className="flex gap-3 mt-2 text-xs text-gray-500">
          <span>{totalCauses} cause</span>
          <span>·</span>
          <span>{totalSubcauses} sotto-cause</span>
        </div>
      </div>
      
      {/* Layout 2 colonne: Cards a sinistra, SVG a destra */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* === COLONNA SINISTRA: Cards 6M === */}
        <div className="space-y-3">
          {RAMI.map(ramo => (
            <RamoCard
              key={ramo.id}
              ramo={ramo}
              cause={localRami[ramo.id] || []}
              expandedCauses={expandedCauses}
              onAddCausa={() => addCausa(ramo.id)}
              onUpdateCausa={(causaId, updates) => updateCausa(ramo.id, causaId, updates)}
              onRemoveCausa={(causaId) => removeCausa(ramo.id, causaId)}
              onAddSubcausa={(causaId) => addSubcausa(ramo.id, causaId)}
              onUpdateSubcausa={(causaId, subId, updates) => updateSubcausa(ramo.id, causaId, subId, updates)}
              onRemoveSubcausa={(causaId, subId) => removeSubcausa(ramo.id, causaId, subId)}
              onToggleExpand={toggleExpand}
              onExplora={(causa) => onExploraInFiveWhys?.({ ...causa, ramo: ramo.label })}
            />
          ))}
        </div>
        
        {/* === COLONNA DESTRA: SVG Fishbone === */}
        <div className="bg-white rounded-xl shadow p-4 sticky top-4 self-start">
          <div className="text-xs font-bold uppercase text-gray-600 mb-2">
            Diagramma a spina di pesce
          </div>
          <FishboneSVG effetto={localEffetto} rami={RAMI} causeMap={localRami} />
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Card di un ramo (con le sue cause e sotto-cause)
// ──────────────────────────────────────────────────────────
function RamoCard({
  ramo, cause, expandedCauses,
  onAddCausa, onUpdateCausa, onRemoveCausa,
  onAddSubcausa, onUpdateSubcausa, onRemoveSubcausa,
  onToggleExpand, onExplora,
}) {
  return (
    <div
      className="bg-white rounded-lg shadow border-l-4"
      style={{ borderLeftColor: ramo.color }}
    >
      {/* Header del ramo */}
      <div
        className="px-4 py-2 flex items-center justify-between rounded-t-lg"
        style={{ backgroundColor: ramo.color + '15' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: ramo.color }}
          />
          <span className="font-bold" style={{ color: ramo.color }}>
            {ramo.label}
          </span>
          {cause.length > 0 && (
            <span className="text-xs bg-white px-2 py-0.5 rounded-full font-medium" style={{ color: ramo.color }}>
              {cause.length}
            </span>
          )}
        </div>
        <button
          onClick={onAddCausa}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:opacity-80 text-white"
          style={{ backgroundColor: ramo.color }}
        >
          <Plus size={12} /> Aggiungi causa
        </button>
      </div>
      
      {/* Lista cause */}
      <div className="p-3 space-y-2">
        {cause.length === 0 ? (
          <div className="text-xs text-gray-400 italic text-center py-2">
            Nessuna causa
          </div>
        ) : (
          cause.map(causa => (
            <CausaItem
              key={causa.id}
              causa={causa}
              ramoColor={ramo.color}
              expanded={expandedCauses.has(causa.id)}
              onUpdate={(updates) => onUpdateCausa(causa.id, updates)}
              onRemove={() => onRemoveCausa(causa.id)}
              onAddSubcausa={() => onAddSubcausa(causa.id)}
              onUpdateSubcausa={(subId, updates) => onUpdateSubcausa(causa.id, subId, updates)}
              onRemoveSubcausa={(subId) => onRemoveSubcausa(causa.id, subId)}
              onToggleExpand={() => onToggleExpand(causa.id)}
              onExplora={() => onExplora(causa)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Singola causa (con voting, sub-cause espandibili, esplora 5 perché)
// ──────────────────────────────────────────────────────────
function CausaItem({
  causa, ramoColor, expanded,
  onUpdate, onRemove,
  onAddSubcausa, onUpdateSubcausa, onRemoveSubcausa,
  onToggleExpand, onExplora,
}) {
  const hasSubs = causa.subcauses?.length > 0
  
  return (
    <div className="border rounded-lg overflow-hidden bg-gray-50">
      {/* Riga causa */}
      <div className="p-2 flex items-center gap-2">
        <button
          onClick={onToggleExpand}
          className="text-gray-400 hover:text-gray-700 flex-shrink-0"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        
        <input
          value={causa.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="flex-1 text-sm border-0 bg-transparent focus:outline-none focus:bg-white focus:border focus:rounded px-2 py-1"
        />
        
        {/* Voting 1-5 */}
        <VotingPallini
          value={causa.voti || 0}
          onChange={(v) => onUpdate({ voti: v })}
          color={ramoColor}
        />
        
        {/* Bottone esplora nei 5 perché */}
        <button
          onClick={onExplora}
          className={`p-1.5 rounded text-xs flex items-center gap-1 ${
            causa.promosso_a_5why
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
          title="Esplora con i 5 Perché"
        >
          <Target size={12} />
        </button>
        
        <button
          onClick={onRemove}
          className="p-1 text-red-500 hover:bg-red-50 rounded"
        >
          <X size={14} />
        </button>
      </div>
      
      {/* Sotto-cause (se espanso o se ce ne sono) */}
      {(expanded || hasSubs) && (
        <div className="px-2 pb-2 pl-8 space-y-1">
          {causa.subcauses?.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 bg-white border rounded p-1.5">
              <span className="text-gray-300">└─</span>
              <input
                value={sub.label}
                onChange={(e) => onUpdateSubcausa(sub.id, { label: e.target.value })}
                className="flex-1 text-xs border-0 focus:outline-none px-1"
              />
              <VotingPallini
                value={sub.voti || 0}
                onChange={(v) => onUpdateSubcausa(sub.id, { voti: v })}
                color={ramoColor}
                size="sm"
              />
              <button
                onClick={() => onRemoveSubcausa(sub.id)}
                className="p-0.5 text-red-500 hover:bg-red-50 rounded"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          
          <button
            onClick={onAddSubcausa}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 pl-2"
          >
            <Plus size={11} /> Aggiungi sotto-causa
          </button>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Voting 1-5 pallini
// ──────────────────────────────────────────────────────────
function VotingPallini({ value, onChange, color = '#3b82f6', size = 'md' }) {
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? 0 : n)}
          className={`${dotSize} rounded-full border transition-all`}
          style={{
            backgroundColor: n <= value ? color : 'transparent',
            borderColor: n <= value ? color : '#d1d5db',
          }}
          title={`Voto ${n}/5`}
        />
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Fishbone SVG (lato destro)
// ──────────────────────────────────────────────────────────
function FishboneSVG({ effetto, rami, causeMap }) {
  const width = 600
  const height = 500
  const centerY = height / 2
  const spineStart = 50
  const spineEnd = width - 100
  
  // 6 rami: 3 sopra, 3 sotto
  const ramiSopra = rami.slice(0, 3)
  const ramiSotto = rami.slice(3, 6)
  
  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Spina centrale */}
        <line
          x1={spineStart}
          y1={centerY}
          x2={spineEnd}
          y2={centerY}
          stroke="#374151"
          strokeWidth="3"
        />
        
        {/* Freccia finale */}
        <polygon
          points={`${spineEnd},${centerY - 10} ${spineEnd + 25},${centerY} ${spineEnd},${centerY + 10}`}
          fill="#374151"
        />
        
        {/* Box effetto */}
        <rect
          x={spineEnd + 30}
          y={centerY - 25}
          width="100"
          height="50"
          fill="#1e3a8a"
          rx="6"
        />
        <foreignObject
          x={spineEnd + 30}
          y={centerY - 25}
          width="100"
          height="50"
        >
          <div style={{
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '4px',
            textAlign: 'center',
            lineHeight: '1.2',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            wordBreak: 'break-word',
          }}>
            {effetto || 'Effetto'}
          </div>
        </foreignObject>
        
        {/* Rami sopra (people, machine, methods) */}
        {ramiSopra.map((ramo, i) => {
          const ramoX = spineStart + 100 + i * 150
          const ramoYStart = centerY
          const ramoYEnd = 60
          const ramoXEnd = ramoX - 80
          const cause = causeMap[ramo.id] || []
          
          return (
            <g key={ramo.id}>
              {/* Linea ramo principale */}
              <line
                x1={ramoX}
                y1={ramoYStart}
                x2={ramoXEnd}
                y2={ramoYEnd}
                stroke={ramo.color}
                strokeWidth="2"
              />
              {/* Label ramo */}
              <rect
                x={ramoXEnd - 50}
                y={ramoYEnd - 18}
                width="100"
                height="22"
                fill={ramo.color}
                rx="4"
              />
              <text
                x={ramoXEnd}
                y={ramoYEnd - 3}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="bold"
              >
                {ramo.label}
              </text>
              {/* Cause (lische più piccole) */}
              {cause.slice(0, 4).map((causa, j) => {
                const t = (j + 1) / 5
                const cx1 = ramoX - (ramoX - ramoXEnd) * t
                const cy1 = ramoYStart - (ramoYStart - ramoYEnd) * t
                const cx2 = cx1 - 40
                const cy2 = cy1 + 5
                return (
                  <g key={causa.id}>
                    <line x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke={ramo.color} strokeWidth="1" opacity="0.7" />
                    <text x={cx2 - 4} y={cy2 + 3} textAnchor="end" fontSize="9" fill="#374151">
                      {(causa.label || '—').slice(0, 20)}
                    </text>
                  </g>
                )
              })}
              {cause.length > 4 && (
                <text x={ramoXEnd} y={ramoYEnd + 14} textAnchor="middle" fontSize="9" fill="#6b7280">
                  +{cause.length - 4}
                </text>
              )}
            </g>
          )
        })}
        
        {/* Rami sotto (materials, measurement, environment) */}
        {ramiSotto.map((ramo, i) => {
          const ramoX = spineStart + 100 + i * 150
          const ramoYStart = centerY
          const ramoYEnd = height - 60
          const ramoXEnd = ramoX - 80
          const cause = causeMap[ramo.id] || []
          
          return (
            <g key={ramo.id}>
              <line
                x1={ramoX}
                y1={ramoYStart}
                x2={ramoXEnd}
                y2={ramoYEnd}
                stroke={ramo.color}
                strokeWidth="2"
              />
              <rect
                x={ramoXEnd - 50}
                y={ramoYEnd}
                width="100"
                height="22"
                fill={ramo.color}
                rx="4"
              />
              <text
                x={ramoXEnd}
                y={ramoYEnd + 15}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="bold"
              >
                {ramo.label}
              </text>
              {cause.slice(0, 4).map((causa, j) => {
                const t = (j + 1) / 5
                const cx1 = ramoX - (ramoX - ramoXEnd) * t
                const cy1 = ramoYStart + (ramoYEnd - ramoYStart) * t
                const cx2 = cx1 - 40
                const cy2 = cy1 - 5
                return (
                  <g key={causa.id}>
                    <line x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke={ramo.color} strokeWidth="1" opacity="0.7" />
                    <text x={cx2 - 4} y={cy2 + 3} textAnchor="end" fontSize="9" fill="#374151">
                      {(causa.label || '—').slice(0, 20)}
                    </text>
                  </g>
                )
              })}
              {cause.length > 4 && (
                <text x={ramoXEnd} y={ramoYEnd - 4} textAnchor="middle" fontSize="9" fill="#6b7280">
                  +{cause.length - 4}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
