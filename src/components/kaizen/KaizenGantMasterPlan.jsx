import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import { Plus, Trash2 } from 'lucide-react'

const CELL_STATES = [
  { value: 0, label: 'Vuoto', color: '' },
  { value: 1, label: 'Pianificato', color: '#10b981' },
  { value: 2, label: 'Completato', color: '#2563eb' },
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
    end_year: currentYear + 1,
  }
}

/**
 * KaizenGantMasterPlan — Gant stile Master Plan per Standard/Major Kaizen
 *
 * Props:
 *   - kaizen: oggetto kaizen
 *   - onSaved: callback dopo save (per reload)
 */
export default function KaizenGantMasterPlan({ kaizen, onSaved }) {
  const savedGant = kaizen.gant_master_plan || null
  const [data, setData] = useState(savedGant || getDefaultGantData())
  const [editingStepId, setEditingStepId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const dataRef = useRef(data)

  useEffect(() => { dataRef.current = data }, [data])

  async function doSave(silent = false) {
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

  useEffect(() => {
    if (JSON.stringify(data) === JSON.stringify(savedGant || getDefaultGantData())) return
    setHasUnsavedChanges(true)
    const timer = setTimeout(() => doSave(false), 700)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // CRUD celle e steps
  function getCellValue(stepId, year, quarter) {
    return data.cells[`${stepId}_${year}_${quarter}`] || 0
  }
  function cycleCell(stepId, year, quarter) {
    const key = `${stepId}_${year}_${quarter}`
    const current = data.cells[key] || 0
    const next = (current + 1) % CELL_STATES.length
    setData(prev => {
      const newCells = { ...prev.cells }
      newCells[key] = next
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

  const years = []
  for (let y = data.start_year; y <= data.end_year; y++) years.push(y)
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']

  return (
    <div className="space-y-4">
      {/* Header config */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-gray-500">Pianificazione multi-anno per trimestri delle macro-fasi del Kaizen</p>
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-3 border-t">
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
          <button
            onClick={addStep}
            className="bg-primary text-white px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center gap-1"
          >
            <Plus size={14} /> Aggiungi step
          </button>
        </div>
        <div className="flex gap-3 mt-3 pt-3 border-t text-xs items-center flex-wrap">
          <span className="font-medium text-gray-600">Stati cella:</span>
          {CELL_STATES.map(s => (
            <div key={s.value} className="flex items-center gap-1">
              <div className="w-4 h-4 border rounded" style={{ backgroundColor: s.color || 'white' }} />
              <span>{s.label}</span>
            </div>
          ))}
          <span className="ml-auto text-gray-500 italic">Click su cella per cambiare stato</span>
        </div>
      </div>

      {/* Griglia Gant */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <div style={{ minWidth: years.length * 80 + 412 }}>
          <div className="flex border-b bg-gray-100 sticky top-0 z-10">
            <div className="w-12 px-2 py-2 text-xs font-bold text-center border-r"></div>
            <div className="w-80 px-3 py-2 text-xs font-bold border-r">Step macro</div>
            <div className="w-20 px-1 py-2 text-xs font-bold text-center border-r">Azioni</div>
            {years.map(year => (
              <div key={year} className="flex-1 min-w-[80px] border-r last:border-r-0">
                <div
                  className="text-center font-bold text-xs py-1 border-b bg-primary text-white"
                >
                  {year}
                </div>
                <div className="flex">
                  {quarters.map(q => (
                    <div key={q} className="flex-1 text-center text-[10px] font-medium text-gray-500 py-0.5 border-r last:border-r-0">
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
                <button onClick={() => moveStep(step.id, 'up')} disabled={idx === 0} className="text-xs px-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Sposta su">▲</button>
                <button onClick={() => moveStep(step.id, 'down')} disabled={idx === data.steps.length - 1} className="text-xs px-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Sposta giù">▼</button>
                <button onClick={() => clearRow(step.id)} className="text-xs px-1 hover:bg-yellow-100 rounded text-yellow-600" title="Pulisci riga">⌫</button>
                <button onClick={() => removeStep(step.id)} className="p-0.5 hover:bg-red-100 rounded text-red-600" title="Elimina step">
                  <Trash2 size={11} />
                </button>
              </div>
              {years.map(year => (
                <div key={year} className="flex-1 min-w-[80px] border-r last:border-r-0 flex">
                  {quarters.map((q, qIdx) => {
                    const val = getCellValue(step.id, year, qIdx + 1)
                    const state = CELL_STATES[val]
                    return (
                      <button
                        key={q}
                        onClick={() => cycleCell(step.id, year, qIdx + 1)}
                        className="flex-1 border-r last:border-r-0 hover:opacity-75 transition-opacity"
                        style={{
                          backgroundColor: state.color || 'transparent',
                          minHeight: '32px',
                        }}
                        title={`${year} ${q}: ${state.label}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
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
