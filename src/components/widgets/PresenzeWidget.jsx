import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, X, Settings as SettingsIcon } from 'lucide-react'

const DEFAULT_STATI = [
  { id: 'presente', label: 'Presente', color: '#10b981' },
  { id: 'assente', label: 'Assente', color: '#ef4444' },
  { id: 'giustificato', label: 'Giustificato', color: '#9ca3af' },
]

export default function PresenzeWidget({ config, editMode, onChange }) {
  const titolo = config?.titolo || 'Calendario presenze'
  const partecipanti = config?.partecipanti || []
  const date = config?.date || []
  const presenze = config?.presenze || {}
  const stati = config?.stati || DEFAULT_STATI

  const [showSettings, setShowSettings] = useState(false)
  const [activeCell, setActiveCell] = useState(null)  // {partecipante, data} per dropdown
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0 })
  const dropdownRef = useRef(null)

  // Chiudi dropdown se click fuori
  useEffect(() => {
    if (!activeCell) return
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveCell(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeCell])

  function openCellMenu(partecipante, data, e) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setDropdownPos({ x: rect.left, y: rect.bottom + 4 })
    setActiveCell({ partecipante, data })
  }

  function setStatoCell(statoId) {
    if (!activeCell) return
    const key = `${activeCell.partecipante}_${activeCell.data}`
    const newPresenze = { ...presenze }
    if (statoId === null) {
      delete newPresenze[key]  // svuota
    } else {
      newPresenze[key] = statoId
    }
    onChange?.({ ...config, presenze: newPresenze })
    setActiveCell(null)
  }

  function getColorForCell(partecipante, data) {
    const key = `${partecipante}_${data}`
    const statoId = presenze[key]
    if (!statoId) return ''
    const stato = stati.find(s => s.id === statoId)
    return stato?.color || ''
  }

  function getLabelForCell(partecipante, data) {
    const key = `${partecipante}_${data}`
    const statoId = presenze[key]
    if (!statoId) return 'Non registrato'
    const stato = stati.find(s => s.id === statoId)
    return stato?.label || '—'
  }

  // Statistiche presenze: conta TUTTI gli stati "positivi" (default: solo presente)
  const statsPerPartecipante = useMemo(() => {
    const result = {}
    partecipanti.forEach(p => {
      const totale = date.length
      const presenti = date.filter(d => presenze[`${p}_${d}`] === 'presente').length
      const percentuale = totale > 0 ? Math.round((presenti / totale) * 100) : 0
      result[p] = { presenti, totale, percentuale }
    })
    return result
  }, [partecipanti, date, presenze])

  return (
    <div className="bg-white rounded-xl shadow p-3 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 border-b pb-2">
        <h3 className="font-bold text-gray-800 text-sm truncate">{titolo}</h3>
        <button
          onClick={() => setShowSettings(true)}
          onMouseDown={(e) => e.stopPropagation()}
          className="widget-action-btn text-gray-500 hover:bg-gray-100 p-1 rounded"
          title="Configura"
        >
          <SettingsIcon size={14} />
        </button>
      </div>

      {/* Tabella presenze */}
      <div className="flex-1 overflow-auto">
        {partecipanti.length === 0 || date.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-xs">
            Nessun partecipante o data configurati
            <div className="mt-2">
              <button
                onClick={() => setShowSettings(true)}
                onMouseDown={(e) => e.stopPropagation()}
                className="widget-action-btn text-primary hover:underline text-xs"
              >
                + Configura
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="border-r border-b p-1 text-left font-semibold sticky left-0 bg-gray-50 min-w-[120px]">
                  Partecipante
                </th>
                {date.map(d => (
                  <th key={d} className="border-r border-b p-1 text-center font-medium text-[10px]" style={{ width: '40px', minWidth: '40px' }}>
                    {formatShortDate(d)}
                  </th>
                ))}
                <th className="border-b p-1 text-center font-semibold text-[10px] min-w-[60px]">
                  Presenze
                </th>
              </tr>
            </thead>
            <tbody>
              {partecipanti.map(p => {
                const stats = statsPerPartecipante[p]
                return (
                  <tr key={p}>
                    <td className="border-r border-b p-1 font-medium text-[11px] sticky left-0 bg-white">
                      {p}
                    </td>
                    {date.map(d => {
                      const bg = getColorForCell(p, d)
                      return (
                        <td key={d} className="border-r border-b p-0">
                          <button
                            <button
                            onClick={(e) => openCellMenu(p, d, e)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="widget-action-btn hover:opacity-75 transition-opacity rounded mx-auto block"
                            style={{
                              backgroundColor: bg || 'transparent',
                              border: bg ? 'none' : '1px solid #e5e7eb',
                              width: '28px',
                              height: '28px',
                            }}
                            title={`${p} · ${formatShortDate(d)}: ${getLabelForCell(p, d)}`}
                          />
                        </td>
                      )
                    })}
                    <td className="border-b p-1 text-center text-[10px] font-bold">
                      <span className={
                        stats.percentuale >= 80 ? 'text-green-600' :
                        stats.percentuale >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }>
                        {stats.presenti}/{stats.totale}
                      </span>
                      <div className="text-[9px] text-gray-500">
                        {stats.percentuale}%
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Legenda */}
      {partecipanti.length > 0 && date.length > 0 && (
        <div className="mt-2 pt-2 border-t flex flex-wrap gap-2 text-[10px]">
          {stati.map(s => (
            <div key={s.id} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border" style={{ backgroundColor: s.color }} />
              <span>{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border bg-white" />
            <span>Non registrato</span>
          </div>
          <span className="ml-auto text-gray-400 italic">
            Click su cella per scegliere stato
          </span>
        </div>
      )}

      {/* Dropdown menu (popup vicino alla cella cliccata) */}
      {activeCell && (
        <div
          ref={dropdownRef}
          className="widget-action-btn fixed bg-white rounded-lg shadow-2xl border-2 border-gray-200 p-2 z-50 min-w-[160px]"
          style={{ left: dropdownPos.x, top: dropdownPos.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1 px-2">
            {activeCell.partecipante} · {formatShortDate(activeCell.data)}
          </div>
          <div className="space-y-1">
            {stati.map(s => (
              <button
                key={s.id}
                onClick={() => setStatoCell(s.id)}
                className="widget-action-btn w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-xs"
              >
                <div
                  className="w-4 h-4 rounded border flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.label}</span>
              </button>
            ))}
            <button
              onClick={() => setStatoCell(null)}
              className="widget-action-btn w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-xs text-gray-500 italic border-t mt-1 pt-2"
            >
              <div className="w-4 h-4 rounded border border-gray-300 bg-white flex-shrink-0" />
              <span>Non registrato</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Settings */}
      {showSettings && (
        <PresenzeSettingsModal
          config={config}
          onClose={() => setShowSettings(false)}
          onSave={(newConfig) => {
            onChange?.(newConfig)
            setShowSettings(false)
          }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Modal di configurazione
// ──────────────────────────────────────────────────────────
function PresenzeSettingsModal({ config, onClose, onSave }) {
  const [titolo, setTitolo] = useState(config?.titolo || 'Calendario presenze')
  const [partecipantiText, setPartecipantiText] = useState(
    (config?.partecipanti || []).join('\n')
  )
  const [date, setDate] = useState(config?.date || [])
  const [nuovaData, setNuovaData] = useState('')
  const [stati, setStati] = useState(config?.stati || DEFAULT_STATI)

  function aggiungiData() {
    if (!nuovaData) {
      alert('Seleziona una data')
      return
    }
    if (date.includes(nuovaData)) {
      alert('Data già presente')
      return
    }
    const nuove = [...date, nuovaData].sort()
    setDate(nuove)
    setNuovaData('')
  }

  function rimuoviData(d) {
    setDate(date.filter(x => x !== d))
  }

  function updateStato(idx, field, value) {
    setStati(stati.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function addStato() {
    setStati([...stati, { id: `stato_${Date.now()}`, label: 'Nuovo', color: '#3b82f6' }])
  }

  function removeStato(idx) {
    if (stati.length <= 1) {
      alert('Devi avere almeno uno stato')
      return
    }
    if (!confirm('Eliminare questo stato?')) return
    setStati(stati.filter((_, i) => i !== idx))
  }

  function handleSave() {
    const partecipanti = partecipantiText.split('\n').map(p => p.trim()).filter(Boolean)
    onSave({
      ...config,
      titolo,
      partecipanti,
      date: date.sort(),
      stati,
    })
  }

  return (
    <div
      className="widget-action-btn fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="widget-action-btn bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="bg-primary text-white px-5 py-3 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg font-bold">Configura Calendario Presenze</h2>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            className="widget-action-btn hover:bg-primary-light p-1 rounded"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Titolo */}
          <div>
            <label className="block text-sm font-medium mb-1">Titolo</label>
            <input
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className="widget-action-btn w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Partecipanti */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Partecipanti <span className="text-gray-500 font-normal">(uno per riga)</span>
            </label>
            <textarea
              value={partecipantiText}
              onChange={(e) => setPartecipantiText(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              rows={5}
              className="widget-action-btn w-full border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <div className="flex gap-2 items-center mb-2">
              <input
                type="date"
                value={nuovaData}
                onChange={(e) => setNuovaData(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="widget-action-btn flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={aggiungiData}
                onMouseDown={(e) => e.stopPropagation()}
                className="widget-action-btn bg-primary text-white px-4 py-2 rounded text-sm hover:bg-primary-light flex items-center gap-1"
              >
                <Plus size={14} /> Aggiungi data
              </button>
            </div>

            {date.length === 0 ? (
              <div className="text-xs text-gray-400 italic text-center py-3 bg-gray-50 rounded border">
                Nessuna data aggiunta
              </div>
            ) : (
              <div className="bg-gray-50 rounded border p-2 max-h-48 overflow-y-auto">
                <div className="text-xs text-gray-600 mb-2">
                  {date.length} dat{date.length === 1 ? 'a' : 'e'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {date.map(d => (
                    <span
                      key={d}
                      className="bg-white border rounded px-2 py-1 text-xs flex items-center gap-1"
                    >
                      {new Date(d).toLocaleDateString('it-IT')}
                      <button
                        onClick={() => rimuoviData(d)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="widget-action-btn text-red-500 hover:bg-red-50 rounded p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stati */}
          <div>
            <label className="block text-sm font-medium mb-1">Stati e colori</label>
            <div className="space-y-2">
              {stati.map((s, idx) => (
                <div key={s.id} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) => updateStato(idx, 'color', e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="widget-action-btn w-12 h-8 border rounded cursor-pointer"
                  />
                  <input
                    value={s.label}
                    onChange={(e) => updateStato(idx, 'label', e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="widget-action-btn flex-1 border rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => removeStato(idx)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="widget-action-btn p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addStato}
                onMouseDown={(e) => e.stopPropagation()}
                className="widget-action-btn text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Aggiungi stato
              </button>
            </div>
          </div>

          {/* Bottoni */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="widget-action-btn px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              onMouseDown={(e) => e.stopPropagation()}
              className="widget-action-btn px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper
function formatShortDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}
