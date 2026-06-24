import { useState, useMemo } from 'react'
import { Plus, X, Settings as SettingsIcon, ChevronLeft, ChevronRight } from 'lucide-react'

// Stati default
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

  // Cambia stato di una cella (ciclando)
  function cycleCell(partecipante, data) {
    const key = `${partecipante}_${data}`
    const currentStato = presenze[key]
    const currentIdx = stati.findIndex(s => s.id === currentStato)
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % (stati.length + 1)

    const newPresenze = { ...presenze }
    if (nextIdx === stati.length) {
      delete newPresenze[key]  // dopo l'ultimo stato → vuoto
    } else {
      newPresenze[key] = stati[nextIdx].id
    }
    onChange?.({ ...config, presenze: newPresenze })
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

  // Statistiche presenze per partecipante
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
          className="text-gray-500 hover:bg-gray-100 p-1 rounded widget-action-btn"
          onMouseDown={(e) => e.stopPropagation()}
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
                className="text-primary hover:underline text-xs widget-action-btn"
                onMouseDown={(e) => e.stopPropagation()}
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
                  <th key={d} className="border-r border-b p-1 text-center font-medium text-[10px] min-w-[36px]">
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
                            onClick={() => cycleCell(p, d)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="widget-action-btn w-full h-full hover:opacity-75 transition-opacity"
                            style={{
                              backgroundColor: bg || 'transparent',
                              minHeight: '24px',
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
              <div
                className="w-3 h-3 rounded border"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border bg-white" />
            <span>Non registrato</span>
          </div>
          <span className="ml-auto text-gray-400 italic">
            Click su cella per cambiare stato
          </span>
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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateText, setDateText] = useState(
    (config?.date || []).join('\n')
  )
  const [stati, setStati] = useState(config?.stati || DEFAULT_STATI)

  function generaDateRange() {
    if (!dateFrom || !dateTo) {
      alert('Inserisci data inizio e fine')
      return
    }
    const start = new Date(dateFrom)
    const end = new Date(dateTo)
    if (start > end) {
      alert('Data inizio deve essere prima della fine')
      return
    }
    const dates = []
    const current = new Date(start)
    while (current <= end) {
      // Salta sabato (6) e domenica (0) — solo giorni feriali
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(current.toISOString().slice(0, 10))
      }
      current.setDate(current.getDate() + 1)
    }
    // Aggiunge alle date esistenti senza duplicati
    const existing = dateText.split('\n').filter(d => d.trim())
    const merged = [...new Set([...existing, ...dates])].sort()
    setDateText(merged.join('\n'))
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
    const date = dateText.split('\n').map(d => d.trim()).filter(Boolean).sort()
    onSave({
      ...config,
      titolo,
      partecipanti,
      date,
      stati,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="bg-primary text-white px-5 py-3 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg font-bold">Configura Calendario Presenze</h2>
          <button onClick={onClose} className="hover:bg-primary-light p-1 rounded">
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
              className="w-full border rounded-lg px-3 py-2"
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
              rows={6}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder={'Mario Rossi\nLuca Verdi\nAntonio Palma\nGiovanni Tosi'}
            />
          </div>

          {/* Date — generatore range */}
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <div className="bg-gray-50 p-3 rounded-lg mb-2 border">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Genera date in automatico (solo giorni feriali)
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Da</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">A</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <button
                  onClick={generaDateRange}
                  className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary-light"
                >
                  + Aggiungi
                </button>
              </div>
            </div>
            <textarea
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder={'2026-06-17\n2026-06-18\n2026-06-19'}
            />
            <div className="text-xs text-gray-500 mt-1">
              Una data per riga (formato YYYY-MM-DD). Puoi anche modificare manualmente.
            </div>
          </div>

          {/* Stati configurabili */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Stati e colori
            </label>
            <div className="space-y-2">
              {stati.map((s, idx) => (
                <div key={s.id} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) => updateStato(idx, 'color', e.target.value)}
                    className="w-12 h-8 border rounded cursor-pointer"
                  />
                  <input
                    value={s.label}
                    onChange={(e) => updateStato(idx, 'label', e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="Nome stato"
                  />
                  <button
                    onClick={() => removeStato(idx)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Elimina stato"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addStato}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Aggiungi stato
              </button>
            </div>
          </div>

          {/* Bottoni */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light"
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
