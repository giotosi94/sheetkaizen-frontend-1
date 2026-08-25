import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import { Plus, Trash2 } from 'lucide-react'

const ROW_TYPES = [
  { id: 'planned', label: 'Pianificato', color: '#10b981' },
  { id: 'completed', label: 'Completato', color: '#2563eb' },
]

// Granularità configurabile dall'utente
const GRANULARITIES = [
  { id: 'week',    label: 'Settimana' },
  { id: 'month',   label: 'Mese' },
  { id: 'quarter', label: 'Trimestre' },
]

function getDefaultGantData() {
  const currentYear = new Date().getFullYear()
  return {
    steps: [
      { id: 's1', num: 1, label: 'Analisi del problema' },
      { id: 's2', num: 2, label: 'Implementazione contromisure' },
      { id: 's3', num: 3, label: 'Verifica e validazione' },
      { id: 's4', num: 4, label: 'Standardizzazione' },
    ],
    cells: {},
    start_year: currentYear,
    end_year: currentYear,  // default solo 1 anno
    granularity: 'month',   // default mese
  }
}

// Genera le colonne in base alla granularità
function buildColumns(granularity, startYear, endYear) {
  const cols = []
  for (let y = startYear; y <= endYear; y++) {
    if (granularity === 'week') {
      // 52 settimane per anno
      for (let w = 1; w <= 52; w++) {
        cols.push({ year: y, period: w, label: `W${w}`, group: String(y) })
      }
    } else if (granularity === 'month') {
      // 12 mesi per anno
      const labels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
      for (let m = 1; m <= 12; m++) {
        cols.push({ year: y, period: m, label: labels[m - 1], group: String(y) })
      }
    } else {
      // 4 trimestri per anno
      for (let q = 1; q <= 4; q++) {
        cols.push({ year: y, period: q, label: `Q${q}`, group: String(y) })
      }
    }
  }
  return cols
}

// Raggruppa le colonne per anno (per il sub-header)
function groupColsByYear(columns) {
  const groups = {}
  columns.forEach(c => {
    if (!groups[c.group]) groups[c.group] = 0
    groups[c.group]++
  })
  return Object.entries(groups).map(([year, count]) => ({ year, count }))
}

/**
 * KaizenGantMasterPlan — Gant configurabile (settimana/mese/trimestre)
 */
export default function KaizenGantMasterPlan({ kaizen, onSaved, value, onChange }) {
  const isControlled = typeof onChange === 'function'
  const savedGant = isControlled ? (value || null) : (kaizen?.gant_master_plan || null)
  const [data, setData] = useState(savedGant || getDefaultGantData())
  const [editingStepId, setEditingStepId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const dataRef = useRef(data)

  useEffect(() => { dataRef.current = data }, [data])

  async function doSave(silent = false) {
    // Modalità controlled (widget): salva via onChange, no chiamata API
    if (isControlled) {
      onChange(dataRef.current)
      if (!silent) {
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
      }
      return
    }
    if (!silent) setSaving(true)
    try {
      await api.put(`/kaizens/${kaizen._id}`, {
        gant_master_plan: dataRef.current,
      })
      if (!silent) {
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
      }
      onSaved?.()
    } catch (err) {
      console.error(err)
      if (!silent) alert('Errore salvataggio: ' + (err.response?.data?.detail || err.message))
    } finally {
      if (!silent) setSaving(false)
    }
  }

  // Auto-save debounced
  useEffect(() => {
    if (JSON.stringify(data) === JSON.stringify(savedGant || getDefaultGantData())) return
    setHasUnsavedChanges(true)
    const timer = setTimeout(() => doSave(false), 700)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // CRUD celle / steps
  function getCellValue(stepId, rowType, year, period) {
    const key = `${stepId}_${rowType}_${year}_${period}`

    if (Object.prototype.hasOwnProperty.call(data.cells, key)) {
      return data.cells[key] === true
    }

    const legacyKey = `${stepId}_${year}_${period}`
    const legacyValue = data.cells[legacyKey] || 0

    if (rowType === 'planned') {
      return legacyValue === 1 || legacyValue === 2
    }

    return legacyValue === 2
  }

  function toggleCell(stepId, rowType, year, period) {
    const key = `${stepId}_${rowType}_${year}_${period}`

    setData(prev => {
      const currentValue = getCellValue(stepId, rowType, year, period)
      const newCells = { ...prev.cells }

      Reflect.set(newCells, key, !currentValue)

      return { ...prev, cells: newCells }
    })
  }
  function clearRow(stepId) {
    if (!confirm('Pulire tutte le celle di questa riga?')) return
    setData(prev => {
      const newCells = { ...prev.cells }
      Object.keys(newCells).forEach(k => {
        if (k.startsWith(`${stepId}_`)) delete newCells[k]
      })
      return { ...prev, cells: newCells }
    })
  }
  function updateStepLabel(stepId, newLabel) {
    setData(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, label: newLabel } : s),
    }))
  }
  function addStep() {
    const newId = `s${Date.now()}`
    const newNum = data.steps.length + 1
    setData(prev => ({
      ...prev,
      steps: [...prev.steps, { id: newId, num: newNum, label: `Step ${newNum}` }],
    }))
  }
  function removeStep(stepId) {
    if (!confirm('Eliminare questo step e tutte le sue celle?')) return
    setData(prev => {
      const newCells = { ...prev.cells }
      Object.keys(newCells).forEach(k => {
        if (k.startsWith(`${stepId}_`)) delete newCells[k]
      })
      const filteredSteps = prev.steps.filter(s => s.id !== stepId)
      const renumbered = filteredSteps.map((s, i) => ({ ...s, num: i + 1 }))
      return { ...prev, steps: renumbered, cells: newCells }
    })
  }
  function moveStep(stepId, direction) {
    setData(prev => {
      const idx = prev.steps.findIndex(s => s.id === stepId)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.steps.length) return prev
      const newSteps = [...prev.steps]
      const tmp = newSteps[idx]
      newSteps[idx] = newSteps[newIdx]
      newSteps[newIdx] = tmp
      const renumbered = newSteps.map((s, i) => ({ ...s, num: i + 1 }))
      return { ...prev, steps: renumbered }
    })
  }
  function updateYearRange(field, value) {
    const v = parseInt(value) || 0
    if (v < 2000 || v > 2100) return
    setData(prev => ({ ...prev, [field]: v }))
  }
  function setGranularity(g) {
    setData(prev => ({ ...prev, granularity: g }))
  }

  const granularity = data.granularity || 'month'
  const columns = buildColumns(granularity, data.start_year, data.end_year)
  const yearGroups = groupColsByYear(columns)

  // Dimensione cella dinamica
  const CELL_WIDTH = granularity === 'week' ? 32 : granularity === 'month' ? 50 : 70

  return (
    <div className="space-y-4">
      {/* Header config */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-start mb-3">
          <p className="text-xs text-gray-500">Pianificazione multi-anno per macro-fasi del Kaizen</p>
          <div className="flex items-center gap-3 text-xs">
            {saving ? <span className="text-blue-600">Salvataggio...</span> :
             hasUnsavedChanges ? <span className="text-orange-600 font-medium">Non salvato</span> :
             lastSaved ? <span className="text-green-600">Salvato {lastSaved.toLocaleTimeString('it-IT')}</span> :
             <span className="text-gray-400">Pronto</span>}
            <button
              onClick={() => doSave(false)}
              disabled={saving}
              className="bg-primary text-white px-3 py-1 rounded text-xs"
            >
              Salva ora
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end pt-3 border-t">
          {/* Granularità */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Granularità</label>
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {GRANULARITIES.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGranularity(g.id)}
                  className={`flex-1 px-2 py-1 text-xs rounded-md transition-all ${
                    granularity === g.id
                      ? 'bg-white text-primary shadow-sm font-medium'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Anno inizio */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Anno inizio</label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={data.start_year}
              onChange={(e) => updateYearRange('start_year', e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          {/* Anno fine */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Anno fine</label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={data.end_year}
              onChange={(e) => updateYearRange('end_year', e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          {/* Aggiungi step */}
          <button
            onClick={addStep}
            className="bg-primary text-white px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center gap-1"
          >
            <Plus size={14} /> Aggiungi step
          </button>
        </div>

        <div className="flex gap-3 mt-3 pt-3 border-t text-xs items-center flex-wrap">
          {ROW_TYPES.map(row => (
            <div key={row.id} className="flex items-center gap-1">
              <div className="w-4 h-4 border rounded" style={{ backgroundColor: row.color }} />
              <span>{row.label}</span>
            </div>
          ))}
          <span className="ml-auto text-gray-500 italic">Riga superiore pianificata, riga inferiore completata</span>
        </div>
      </div>

      {/* Griglia Gant */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <div style={{ minWidth: columns.length * CELL_WIDTH + 412 }}>
          {/* Header anni */}
          <div className="flex border-b bg-primary text-white sticky top-0 z-10">
            <div className="w-12 px-2 py-2 text-xs font-bold text-center border-r border-blue-700"></div>
            <div className="w-80 px-3 py-2 text-xs font-bold border-r border-blue-700">Step macro</div>
            <div className="w-20 px-1 py-2 text-xs font-bold text-center border-r border-blue-700">Azioni</div>
            {yearGroups.map((yg, i) => (
              <div
                key={i}
                className="border-r border-blue-700 text-center font-bold text-xs py-2"
                style={{ width: yg.count * CELL_WIDTH }}
              >
                {yg.year}
              </div>
            ))}
          </div>

          {/* Header periodi */}
          <div className="flex border-b bg-gray-50">
            <div className="w-12 border-r" />
            <div className="w-80 border-r" />
            <div className="w-20 border-r" />
            {columns.map((col, ci) => (
              <div
                key={ci}
                className="border-r flex flex-col items-center justify-center text-[10px] text-gray-500 py-1"
                style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
              >
                {col.label}
              </div>
            ))}
          </div>

          {/* Righe steps */}
          {data.steps.map((step, idx) => (
            <div key={step.id} className="flex border-b hover:bg-gray-50">
              <div className="w-12 px-2 py-2 text-sm font-bold text-center border-r flex items-center justify-center bg-blue-50 text-primary">
                {step.num}
              </div>

              <div className="w-80 px-2 py-1 border-r flex items-center">
                {editingStepId === step.id ? (
                  <input
                    autoFocus
                    value={step.label}
                    onChange={(e) => updateStepLabel(step.id, e.target.value)}
                    onBlur={() => setEditingStepId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingStepId(null)}
                    className="w-full border rounded px-2 py-1 text-xs"
                  />
                ) : (
                  <div
                    onClick={() => setEditingStepId(step.id)}
                    className="text-xs cursor-pointer hover:bg-yellow-50 px-2 py-1 rounded w-full"
                    title="Click per modificare"
                  >
                    {step.label}
                  </div>
                )}
              </div>

              <div className="w-20 px-1 border-r flex items-center justify-center gap-0.5">
                <button
                  onClick={() => moveStep(step.id, 'up')}
                  disabled={idx === 0}
                  className="text-xs px-1 hover:bg-gray-200 rounded disabled:opacity-30"
                  title="Sposta su"
                >
                  ▲
                </button>

                <button
                  onClick={() => moveStep(step.id, 'down')}
                  disabled={idx === data.steps.length - 1}
                  className="text-xs px-1 hover:bg-gray-200 rounded disabled:opacity-30"
                  title="Sposta giù"
                >
                  ▼
                </button>

                <button
                  onClick={() => clearRow(step.id)}
                  className="text-xs px-1 hover:bg-yellow-100 rounded text-yellow-600"
                  title="Pulisci riga"
                >
          

          {data.steps.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>Nessuno step. Aggiungi il primo!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
