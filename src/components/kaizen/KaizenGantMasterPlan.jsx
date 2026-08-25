import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import { Plus, Trash2 } from 'lucide-react'

const ROW_TYPES = [
  { id: 'planned', label: 'Pianificato', color: '#2563eb' },
  { id: 'completed', label: 'Completato', color: '#10b981' },
]

// Granularità configurabile dall'utente
const GRANULARITIES = [
  { id: 'day', label: 'Giorno' },
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
  { id: 'quarter', label: 'Trimestre' },
]

function getDefaultGantData() {
  const currentYear = new Date().getFullYear()
  const today = new Date().toISOString().slice(0, 10)

  return {
    steps: [
      { id: 's1', num: 1, label: 'Analisi del problema' },
      { id: 's2', num: 2, label: 'Implementazione contromisure' },
      { id: 's3', num: 3, label: 'Verifica e validazione' },
      { id: 's4', num: 4, label: 'Standardizzazione' },
    ],
    cells: {},
    start_year: currentYear,
    end_year: currentYear,
    start_date: today,
    duration_count: 12,
    granularity: 'month',
  }
}

// Genera le colonne in base alla granularità
function getWeekNumber(date) {
  const value = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ))

  const dayNumber = value.getUTCDay() || 7
  value.setUTCDate(value.getUTCDate() + 4 - dayNumber)

  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1))

  return Math.ceil((((value - yearStart) / 86400000) + 1) / 7)
}

function buildColumns(granularity, startDateValue, durationCount) {
  const cols = []
  const monthLabels = [
    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
  ]

  const startDate = startDateValue
    ? new Date(`${startDateValue}T12:00:00`)
    : new Date()

  const count = Math.max(1, parseInt(durationCount) || 1)

  for (let index = 0; index < count; index++) {
    const date = new Date(startDate)

    if (granularity === 'day') {
      date.setDate(startDate.getDate() + index)

      cols.push({
        year: date.getFullYear(),
        period: date.toISOString().slice(0, 10),
        label: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
        group: String(date.getFullYear()),
        fullDate: date.toISOString().slice(0, 10),
      })
    }

    if (granularity === 'week') {
      date.setDate(startDate.getDate() + (index * 7))

      cols.push({
        year: date.getFullYear(),
        period: `${date.getFullYear()}-W${getWeekNumber(date)}`,
        label: `W${getWeekNumber(date)}`,
        group: String(date.getFullYear()),
        fullDate: date.toISOString().slice(0, 10),
      })
    }

    if (granularity === 'month') {
      date.setMonth(startDate.getMonth() + index)

      cols.push({
        year: date.getFullYear(),
        period: `${date.getFullYear()}-${date.getMonth() + 1}`,
        label: monthLabels[date.getMonth()],
        group: String(date.getFullYear()),
        fullDate: date.toISOString().slice(0, 10),
      })
    }

    if (granularity === 'quarter') {
      date.setMonth(startDate.getMonth() + (index * 3))

      cols.push({
        year: date.getFullYear(),
        period: `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`,
        label: `Q${Math.floor(date.getMonth() / 3) + 1}`,
        group: String(date.getFullYear()),
        fullDate: date.toISOString().slice(0, 10),
      })
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
  const [dragState, setDragState] = useState(null)
  const dataRef = useRef(data)

  useEffect(() => { dataRef.current = data }, [data])

  useEffect(() => {
    const handleMouseUp = () => {
      if (dragState) {
        finishDrag()
      }
    }

    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState])

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
  function getStepInterval(step, rowType) {
  const interval = step?.[rowType]

  if (interval?.start && interval?.end) {
    return interval
  }

  const activeColumns = columns.filter(col =>
    getCellValue(step.id, rowType, col.year, col.period)
  )

  if (activeColumns.length === 0) {
    return {
      start: null,
      end: null,
    }
  }

  return {
    start: activeColumns[0].fullDate,
    end: activeColumns[activeColumns.length - 1].fullDate,
  }
}

function updateStepInterval(stepId, rowType, start, end) {
  setData(prev => ({
    ...prev,
    steps: prev.steps.map(step => {
      if (step.id !== stepId) return step

      const updatedStep = { ...step }

      Reflect.set(updatedStep, rowType, {
        start,
        end,
      })

      return updatedStep
    }),
  }))
}

function clearStepInterval(stepId, rowType) {
  updateStepInterval(stepId, rowType, null, null)
}

function findColumnIndexByDate(date) {
  if (!date) return -1

  const exactIndex = columns.findIndex(column => column.fullDate === date)

  if (exactIndex >= 0) {
    return exactIndex
  }

  return columns.findIndex((column, index) => {
    const nextColumn = columns[index + 1]

    if (!nextColumn) {
      return date >= column.fullDate
    }

    return date >= column.fullDate && date < nextColumn.fullDate
  })
}

function startDrag(step, rowType, columnIndex, event) {
  event.preventDefault()

  const interval = getStepInterval(step, rowType)
  const startIndex = findColumnIndexByDate(interval.start)
  const endIndex = findColumnIndexByDate(interval.end)
  const hasInterval = startIndex >= 0 && endIndex >= 0

  let mode = 'create'

  if (hasInterval && columnIndex >= startIndex && columnIndex <= endIndex) {
    if (startIndex !== endIndex && columnIndex === startIndex) {
      mode = 'resize-start'
    } else if (startIndex !== endIndex && columnIndex === endIndex) {
      mode = 'resize-end'
    } else {
      mode = 'move'
    }
  }

  setDragState({
    stepId: step.id,
    rowType,
    mode,
    anchorIndex: columnIndex,
    currentIndex: columnIndex,
    originalStartIndex: hasInterval ? startIndex : columnIndex,
    originalEndIndex: hasInterval ? endIndex : columnIndex,
  })
}

function updateDrag(stepId, rowType, columnIndex) {
  setDragState(prev => {
    if (!prev) return prev
    if (prev.stepId !== stepId) return prev
    if (prev.rowType !== rowType) return prev

    return {
      ...prev,
      currentIndex: columnIndex,
    }
  })
}

function getDragIndexes(state) {
  if (!state) {
    return {
      startIndex: -1,
      endIndex: -1,
    }
  }

  if (state.mode === 'create') {
    return {
      startIndex: Math.min(state.anchorIndex, state.currentIndex),
      endIndex: Math.max(state.anchorIndex, state.currentIndex),
    }
  }

  if (state.mode === 'resize-start') {
    return {
      startIndex: Math.min(state.currentIndex, state.originalEndIndex),
      endIndex: state.originalEndIndex,
    }
  }

  if (state.mode === 'resize-end') {
    return {
      startIndex: state.originalStartIndex,
      endIndex: Math.max(state.currentIndex, state.originalStartIndex),
    }
  }

  const offset = state.currentIndex - state.anchorIndex
  const originalLength = state.originalEndIndex - state.originalStartIndex

  let startIndex = state.originalStartIndex + offset
  let endIndex = startIndex + originalLength

  if (startIndex < 0) {
    startIndex = 0
    endIndex = originalLength
  }

  if (endIndex >= columns.length) {
    endIndex = columns.length - 1
    startIndex = Math.max(0, endIndex - originalLength)
  }

  return {
    startIndex,
    endIndex,
  }
}

function finishDrag() {
  setDragState(currentDrag => {
    if (!currentDrag) return null

    const indexes = getDragIndexes(currentDrag)
    const firstColumn = columns[indexes.startIndex]
    const lastColumn = columns[indexes.endIndex]

    if (firstColumn && lastColumn) {
      updateStepInterval(
        currentDrag.stepId,
        currentDrag.rowType,
        firstColumn.fullDate,
        lastColumn.fullDate
      )
    }

    return null
  })
}

function getDisplayInterval(step, rowType) {
  if (
    dragState &&
    dragState.stepId === step.id &&
    dragState.rowType === rowType
  ) {
    const indexes = getDragIndexes(dragState)

    return {
      start: columns[indexes.startIndex]?.fullDate || null,
      end: columns[indexes.endIndex]?.fullDate || null,
    }
  }

  return getStepInterval(step, rowType)
}

function isColumnInInterval(column, interval) {
  if (!interval?.start || !interval?.end) return false

  return (
    column.fullDate >= interval.start &&
    column.fullDate <= interval.end
  )
}

function getDurationLabel(interval) {
  if (!interval?.start || !interval?.end) return ''

  const start = new Date(`${interval.start}T12:00:00`)
  const end = new Date(`${interval.end}T12:00:00`)
  const days = Math.round((end - start) / 86400000) + 1

  if (granularity === 'day') {
    return `${days} giorni`
  }

  if (granularity === 'week') {
    const weeks = Math.max(1, Math.round(days / 7))
    return `${weeks} settimane`
  }

  if (granularity === 'month') {
    const months = Math.max(
      1,
      ((end.getFullYear() - start.getFullYear()) * 12)
        + end.getMonth()
        - start.getMonth()
        + 1
    )

    return `${months} mesi`
  }

  const quarters = Math.max(
    1,
    Math.round(
      (
        ((end.getFullYear() - start.getFullYear()) * 12)
        + end.getMonth()
        - start.getMonth()
      ) / 3
    ) + 1
  )

  return `${quarters} trimestri`
}
  function clearRow(stepId) {
    if (!confirm('Pulire pianificato e completato di questa attività?')) return

    setData(prev => {
      const newCells = { ...prev.cells }

      Object.keys(newCells).forEach(key => {
        if (key.startsWith(`${stepId}_`)) {
          delete newCells[key]
        }
      })

      return {
        ...prev,
        cells: newCells,
        steps: prev.steps.map(step => {
          if (step.id !== stepId) return step

          return {
            ...step,
            planned: {
              start: null,
              end: null,
            },
            completed: {
              start: null,
              end: null,
            },
          }
        }),
      }
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
    steps: [
      ...prev.steps,
      {
        id: newId,
        num: newNum,
        label: `Step ${newNum}`,
        planned: {
          start: null,
          end: null,
        },
        completed: {
          start: null,
          end: null,
        },
      },
    ],
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
    const defaultDuration = g === 'day'
      ? 30
      : g === 'week'
        ? 17
        : g === 'month'
          ? 12
          : 4

    setData(prev => ({
      ...prev,
      granularity: g,
      duration_count: defaultDuration,
    }))
  }

  function setStartDate(value) {
    if (!value) return

    const selectedDate = new Date(`${value}T12:00:00`)

    setData(prev => ({
      ...prev,
      start_date: value,
      start_year: selectedDate.getFullYear(),
    }))
  }

  function setDurationCount(value) {
    const parsed = parseInt(value)

    if (isNaN(parsed)) return

    const maximum = granularity === 'day'
      ? 366
      : granularity === 'week'
        ? 104
        : granularity === 'month'
          ? 60
          : 20

    setData(prev => ({
      ...prev,
      duration_count: Math.min(Math.max(parsed, 1), maximum),
    }))
  }

  const granularity = data.granularity || 'month'
  const startDate = data.start_date || `${data.start_year || new Date().getFullYear()}-01-01`
  const durationCount = data.duration_count || (
    granularity === 'day'
      ? 30
      : granularity === 'week'
        ? 17
        : granularity === 'month'
          ? 12
          : 4
  )

  const columns = buildColumns(
    granularity,
    startDate,
    durationCount
  )

  const yearGroups = groupColsByYear(columns)

  const CELL_WIDTH = granularity === 'day'
    ? 42
    : granularity === 'week'
      ? 38
      : granularity === 'month'
        ? 54
        : 72

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
            <label className="block text-xs font-medium text-gray-600 mb-1">Data iniziale</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          {/* Anno fine */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Numero di {
                granularity === 'day'
                  ? 'giorni'
                  : granularity === 'week'
                    ? 'settimane'
                    : granularity === 'month'
                      ? 'mesi'
                      : 'trimestri'
              }
            </label>

            <input
              type="number"
              min="1"
              max={
                granularity === 'day'
                  ? 366
                  : granularity === 'week'
                    ? 104
                    : granularity === 'month'
                      ? 60
                      : 20
              }
              value={durationCount}
              onChange={(e) => setDurationCount(e.target.value)}
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
          <span className="ml-auto text-gray-500 italic">Trascina sul vuoto per creare, al centro per spostare, sui bordi per ridimensionare</span>
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
                  ⌫
                </button>

                <button
                  onClick={() => removeStep(step.id)}
                  className="p-0.5 hover:bg-red-100 rounded text-red-600"
                  title="Elimina step"
                >
                  <Trash2 size={11} />
                </button>
              </div>

                            <div className="flex flex-col select-none">
                {ROW_TYPES.map(row => {
                  const interval = getDisplayInterval(step, row.id)
                  const durationLabel = getDurationLabel(interval)

                  return (
                    <div
                      key={row.id}
                      className={`flex ${row.id === 'planned' ? 'border-b' : ''}`}
                    >
                      {columns.map((col, columnIndex) => {
                        const active = isColumnInInterval(col, interval)
                        const isStart = active && col.fullDate === interval?.start
                        const isEnd = active && col.fullDate === interval?.end

                        let cursor = 'crosshair'

                        if (active) {
                          if (isStart && !isEnd) {
                            cursor = 'w-resize'
                          } else if (isEnd && !isStart) {
                            cursor = 'e-resize'
                          } else {
                            cursor = 'grab'
                          }
                        }

                        const currentOperation =
                          dragState?.stepId === step.id &&
                          dragState?.rowType === row.id
                            ? dragState.mode
                            : null

                        return (
                          <button
                            key={`${row.id}_${columnIndex}`}
                            type="button"
                            onMouseDown={(event) => startDrag(
                              step,
                              row.id,
                              columnIndex,
                              event
                            )}
                            onMouseEnter={() => updateDrag(
                              step.id,
                              row.id,
                              columnIndex
                            )}
                            className="relative border-r transition-opacity hover:opacity-90"
                            style={{
                              width: CELL_WIDTH,
                              minWidth: CELL_WIDTH,
                              height: '24px',
                              backgroundColor: active
                                ? row.color
                                : 'transparent',
                              borderRightColor: active
                                ? row.color
                                : undefined,
                              borderTopLeftRadius: isStart
                                ? '6px'
                                : '0',
                              borderBottomLeftRadius: isStart
                                ? '6px'
                                : '0',
                              borderTopRightRadius: isEnd
                                ? '6px'
                                : '0',
                              borderBottomRightRadius: isEnd
                                ? '6px'
                                : '0',
                              cursor,
                            }}
                            title={
                              active
                                ? `${row.label}: ${interval.start} - ${interval.end} (${durationLabel})`
                                : `${row.label}: trascina per creare`
                            }
                          >
                            {isStart && active && !isEnd && (
                              <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-white bg-opacity-70 rounded-l pointer-events-none" />
                            )}

                            {isEnd && active && !isStart && (
                              <span className="absolute right-0 top-0 bottom-0 w-1.5 bg-white bg-opacity-70 rounded-r pointer-events-none" />
                            )}

                            {isStart && active && (
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-white whitespace-nowrap pointer-events-none">
                                {durationLabel}
                              </span>
                            )}

                            {currentOperation && active && (
                              <span className="absolute inset-0 ring-2 ring-yellow-300 ring-inset pointer-events-none" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
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
