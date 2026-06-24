import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { Plus, Filter, X, Trash2, Edit2, Link2, AlertCircle, CheckSquare, Bug, TrendingUp, Shield, Wrench } from 'lucide-react'
import ActionPlanFormShared from '../ActionPlanFormShared'
import ActionPlanDetailPanel from '../ActionPlanDetailPanel'

const STATO_COLORS = {
  'Da Valutare': 'bg-gray-100 text-gray-700 border-gray-300',
  'Aperto': 'bg-blue-100 text-blue-700 border-blue-300',
  'In Corso': 'bg-indigo-100 text-indigo-700 border-indigo-300',
  'In Verifica': 'bg-purple-100 text-purple-700 border-purple-300',
  'Done': 'bg-green-100 text-green-700 border-green-300',
  'Cancelled': 'bg-gray-200 text-gray-500 border-gray-300',
}

const PRIORITA_BG = {
  Lowest: 'bg-gray-100 text-gray-700',
  Low: 'bg-blue-100 text-blue-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
}

const TIPO_ICONS = {
  Task: CheckSquare,
  Bug: Bug,
  Improvement: TrendingUp,
  Audit: Shield,
  Manutenzione: Wrench,
  Sicurezza: AlertCircle,
}

const TIPO_COLORS = {
  Task: 'text-blue-600',
  Bug: 'text-red-600',
  Improvement: 'text-green-600',
  Audit: 'text-purple-600',
  Manutenzione: 'text-orange-600',
  Sicurezza: 'text-yellow-600',
}

function Avatar({ name }) {
  if (!name) return <span className="text-xs text-gray-400 italic">— Non assegnato</span>
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500', 'bg-orange-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${color} text-white rounded-full flex items-center justify-center font-bold flex-shrink-0`}
        style={{ width: 24, height: 24, fontSize: 10 }}
      >
        {initials}
      </div>
      <span className="text-xs">{name}</span>
    </div>
  )
}

export default function KaizenAzioniList({ kaizen, kaizenId, kaizenNumero, onUpdate }) {
  const [azioni, setAzioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStep, setFilterStep] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingAP, setEditingAP] = useState(null)
  const [selectedAP, setSelectedAP] = useState(null)
  const [viewMode, setViewMode] = useState('list')  // 🆕 'list' | 'calendar'
  const [calendarDays, setCalendarDays] = useState(30)

  const steps = kaizen?.gant_master_plan?.steps || []

  useEffect(() => { loadAzioni() }, [kaizenId])

  const loadAzioni = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/kaizens/${kaizenId}/action-plans`)
      setAzioni(res.data || [])
    } catch (err) {
      console.error('Errore caricamento AP:', err)
    } finally {
      setLoading(false)
    }
  }

  const changeStepAP = async (apId, stepId) => {
    try {
      await api.put(`/action-plans/${apId}`, {
        gant_step_id: stepId || null,
      })
      loadAzioni()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  const changeStato = async (apId, nuovoStato) => {
    try {
      await api.patch(`/action-plans/${apId}/stato`, { stato: nuovoStato })
      loadAzioni()
    } catch (err) {
      alert('Errore cambio stato: ' + (err.response?.data?.detail || err.message))
    }
  }

  const unlinkAP = async (apId, apNumero) => {
    if (!confirm(`Scollegare ${apNumero} dal Kaizen ${kaizenNumero}?\nL'AP rimane nel sistema ma non sarà più collegato a questo Kaizen.`)) return
    try {
      await api.delete(`/action-plans/${apId}/link-kaizen/${kaizenId}`)
      loadAzioni()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  const deleteAP = async (apId, apNumero) => {
    if (!confirm(`ELIMINA ${apNumero}?\n\nQuesto rimuove l'Action Plan in modo permanente. Conferma solo se sei sicuro.`)) return
    try {
      await api.delete(`/action-plans/${apId}`)
      loadAzioni()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  const cancelAP = async (plan) => {
    const reason = prompt(
      `Annullare l'Action Plan "${plan.numero} - ${plan.titolo}"?\n\nInserisci il motivo (obbligatorio):`
    )
    if (!reason || !reason.trim()) return
    try {
      await api.post(`/action-plans/${plan._id}/cancel`, {
        reason: reason.trim(),
        user: 'Default User',
      })
      loadAzioni()
    } catch (err) {
      alert('Errore annullamento: ' + (err.response?.data?.detail || err.message))
    }
  }

  const restoreAP = async (plan) => {
    if (!confirm(`Ripristinare l'Action Plan "${plan.numero}"?\n\nTornerà tra gli attivi.`)) return
    try {
      await api.post(`/action-plans/${plan._id}/restore`)
      loadAzioni()
    } catch (err) {
      alert('Errore ripristino: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleNewAP = () => {
    setEditingAP(null)
    setShowForm(true)
  }

  const stats = useMemo(() => ({
    totale: azioni.length,
    perStep: steps.map(s => ({
      ...s,
      count: azioni.filter(a => a.gant_step_id === s.id).length,
    })),
  }), [azioni, steps])

  const azioniFiltrate = useMemo(() => {
    return azioni.filter(ap => {
      if (filterStep && ap.gant_step_id !== filterStep) return false
      if (filterStato && ap.stato !== filterStato) return false
      return true
    })
  }, [azioni, filterStep, filterStato])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="font-bold text-sm uppercase text-gray-700">Azioni del Kaizen</h4>
            <p className="text-xs text-gray-500">Azioni concrete, legate o meno a uno step del Gant macro</p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Toggle Vista */}
            <div className="bg-white border rounded-lg p-1 flex gap-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  viewMode === 'calendar' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Calendario
              </button>
            </div>
            <button
              onClick={handleNewAP}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light text-sm font-medium flex items-center gap-1"
            >
              <Plus size={14} /> Crea Action Plan
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-2 pt-3 border-t">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-600">Filtri:</span>
          <select
            value={filterStep}
            onChange={(e) => setFilterStep(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="">Tutti gli step ({stats.totale})</option>
            {stats.perStep.map(s => (
              <option key={s.id} value={s.id}>
                Step {s.num}: {s.label} ({s.count})
              </option>
            ))}
          </select>
          <select
            value={filterStato}
            onChange={(e) => setFilterStato(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="">Tutti gli stati</option>
            <option>Da Valutare</option>
            <option>Aperto</option>
            <option>In Corso</option>
            <option>In Verifica</option>
            <option>Done</option>
            <option>Cancelled</option>
          </select>
          {(filterStep || filterStato) && (
            <button
              onClick={() => { setFilterStep(''); setFilterStato('') }}
              className="text-xs px-2 py-1 border rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1"
            >
              <X size={10} /> Reset
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">
            {azioniFiltrate.length} azion{azioniFiltrate.length === 1 ? 'e' : 'i'} visualizzate
          </span>
        </div>
      </div>

      {/* Tabella */}
      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Caricamento...</div>
      ) : azioniFiltrate.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-500 mb-3">
            {azioni.length === 0
              ? 'Nessuna azione collegata a questo Kaizen'
              : 'Nessun risultato per i filtri impostati'}
          </p>
          {azioni.length === 0 && (
            <button onClick={handleNewAP} className="text-primary hover:underline text-sm">
              + Crea la prima azione
            </button>
          )}
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarKaizenView
          azioni={azioniFiltrate}
          onSelect={setSelectedAP}
          calendarDays={calendarDays}
          setCalendarDays={setCalendarDays}
        />
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left w-24">Numero</th>
                <th className="px-3 py-2 text-left">Titolo</th>
                <th className="px-3 py-2 text-left w-24">Tipo</th>
                <th className="px-3 py-2 text-left w-24">Priorità</th>
                <th className="px-3 py-2 text-left w-40">Responsabile</th>
                <th className="px-3 py-2 text-left w-32">Stato</th>
                <th className="px-3 py-2 text-left w-28">Scadenza</th>
                <th className="px-3 py-2 text-left w-48">Step Gant</th>
                <th className="px-3 py-2 text-center w-32">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {azioniFiltrate.map(ap => {
                const TipoIcon = TIPO_ICONS[ap.tipo] || CheckSquare
                const isOverdue = ap.stato_visuale === 'In Ritardo'
                const isCancelled = ap.is_cancelled
                return (
                  <tr
                    key={ap._id}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${isCancelled ? 'opacity-60' : ''}`}
                    onClick={() => setSelectedAP(ap)}
                  >
                    <td className="px-3 py-2 font-mono text-primary text-xs font-bold">
                      {ap.numero}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium truncate max-w-md">{ap.titolo}</div>
                    </td>
                    <td className="px-3 py-2">
                      {ap.tipo ? (
                        <div className={`flex items-center gap-1 text-xs ${TIPO_COLORS[ap.tipo] || 'text-gray-500'}`}>
                          <TipoIcon size={14} />
                          <span>{ap.tipo}</span>
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {ap.priorita ? (
                        <span className={`px-2 py-0.5 rounded text-xs ${PRIORITA_BG[ap.priorita] || 'bg-gray-100 text-gray-700'}`}>
                          {ap.priorita}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <Avatar name={ap.responsabile} />
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ap.stato || 'Aperto'}
                        onChange={(e) => changeStato(ap._id, e.target.value)}
                        className={`text-xs px-1.5 py-1 rounded border font-medium ${STATO_COLORS[ap.stato] || 'bg-gray-100 text-gray-700'}`}
                      >
                        <option>Da Valutare</option>
                        <option>Aperto</option>
                        <option>In Corso</option>
                        <option>In Verifica</option>
                        <option>Done</option>
                        <option>Cancelled</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {ap.data_scadenza ? (
                        <div className={isOverdue ? 'text-red-600 font-bold' : 'text-gray-700'}>
                          {new Date(ap.data_scadenza).toLocaleDateString('it-IT')}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ap.gant_step_id || ''}
                        onChange={(e) => changeStepAP(ap._id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded border w-full ${
                          ap.gant_step_id
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        <option value="">— Nessuno step —</option>
                        {steps.map(s => (
                          <option key={s.id} value={s.id}>
                            Step {s.num}: {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => { setEditingAP(ap); setShowForm(true) }}
                          className="p-1 hover:bg-yellow-100 rounded text-yellow-600"
                          title="Modifica"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => unlinkAP(ap._id, ap.numero)}
                          className="p-1 hover:bg-orange-100 rounded text-orange-600"
                          title="Scollega dal Kaizen"
                        >
                          <Link2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteAP(ap._id, ap.numero)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Elimina definitivamente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <ActionPlanFormShared
          plan={editingAP}
          prefilledKaizen={{ kaizen_id: kaizenId, kaizen_numero: kaizenNumero }}
          onClose={() => { setShowForm(false); setEditingAP(null) }}
          onSaved={() => {
            setShowForm(false)
            setEditingAP(null)
            loadAzioni()
            onUpdate?.()
          }}
        />
      )}

      {/* Pannello dettaglio AP (cliccando una riga) */}
      {selectedAP && (
        <ActionPlanDetailPanel
          plan={selectedAP}
          onClose={() => setSelectedAP(null)}
          onUpdated={loadAzioni}
          onEdit={(p) => { setSelectedAP(null); setEditingAP(p); setShowForm(true) }}
          onCancel={async (p) => { await cancelAP(p); setSelectedAP(null) }}
          onRestore={async (p) => { await restoreAP(p); setSelectedAP(null) }}
          onDelete={async (apId) => { await deleteAP(apId, selectedAP.numero); setSelectedAP(null) }}
        />
      )}
    </div>
  )
}
// ──────────────────────────────────────────────────────────
// CALENDAR VIEW per Kaizen — Raggruppato per scadenza
// ──────────────────────────────────────────────────────────
function CalendarKaizenView({ azioni, onSelect, calendarDays, setCalendarDays }) {
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

  const fineSettimana = new Date(oggi)
  fineSettimana.setDate(fineSettimana.getDate() + (7 - oggi.getDay()))
  fineSettimana.setHours(23, 59, 59, 999)

  const fineProssimePeriodo = new Date(fineSettimana)
  fineProssimePeriodo.setDate(fineProssimePeriodo.getDate() + calendarDays)

  // Filtra solo gli AP NON cancellati e NON done
  const apsAttivi = azioni.filter(p => !p.is_cancelled && p.stato !== 'Done')

  const scaduti = []
  const oggiAPs = []
  const settimanaAPs = []
  const prossimeAPs = []
  const senzaScadenza = []

  apsAttivi.forEach(ap => {
    if (!ap.data_scadenza) {
      senzaScadenza.push(ap)
      return
    }
    const scadenza = new Date(ap.data_scadenza)
    scadenza.setHours(0, 0, 0, 0)

    if (scadenza < oggi) {
      const giorniRitardo = Math.floor((oggi - scadenza) / (1000 * 60 * 60 * 24))
      scaduti.push({ ...ap, _giorniRitardo: giorniRitardo })
    } else if (scadenza.getTime() === oggi.getTime()) {
      oggiAPs.push(ap)
    } else if (scadenza <= fineSettimana) {
      settimanaAPs.push(ap)
    } else if (scadenza <= fineProssimePeriodo) {
      prossimeAPs.push(ap)
    } else {
      senzaScadenza.push(ap)
    }
  })

  const sortByDate = (a, b) => {
    if (!a.data_scadenza) return 1
    if (!b.data_scadenza) return -1
    return new Date(a.data_scadenza) - new Date(b.data_scadenza)
  }
  scaduti.sort(sortByDate)
  oggiAPs.sort(sortByDate)
  settimanaAPs.sort(sortByDate)
  prossimeAPs.sort(sortByDate)

  const colonne = [
    { id: 'scaduti', label: 'Scaduti', headerBg: 'bg-red-100', headerText: 'text-red-700', border: 'border-red-300', plans: scaduti },
    { id: 'oggi', label: 'Oggi', headerBg: 'bg-orange-100', headerText: 'text-orange-700', border: 'border-orange-300', plans: oggiAPs },
    { id: 'settimana', label: 'Questa settimana', headerBg: 'bg-yellow-100', headerText: 'text-yellow-700', border: 'border-yellow-300', plans: settimanaAPs },
    { id: 'prossime', label: `Prossimi ${calendarDays} giorni`, headerBg: 'bg-blue-100', headerText: 'text-blue-700', border: 'border-blue-300', plans: prossimeAPs },
  ]

  return (
    <div className="space-y-4">
      {/* Configurazione periodo */}
      <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-600 uppercase">Periodo "Prossimi giorni":</span>
        <div className="flex gap-1">
          {[7, 14, 30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setCalendarDays(d)}
              className={`px-3 py-1 text-xs rounded transition-all ${
                calendarDays === d ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {d}gg
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-auto">Solo AP attivi (esclusi Done e Annullati)</span>
      </div>

      {/* 4 colonne */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {colonne.map(col => (
          <div key={col.id} className={`rounded-lg border-2 ${col.border} bg-white flex flex-col`}>
            <div className={`${col.headerBg} ${col.headerText} px-3 py-2 rounded-t-md font-semibold text-sm flex justify-between items-center`}>
              <span>{col.label}</span>
              <span className="bg-white bg-opacity-70 px-2 py-0.5 rounded-full text-xs font-bold">
                {col.plans.length}
              </span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ minHeight: '300px', maxHeight: '70vh' }}>
              {col.plans.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-8 italic">Nessuna AP</div>
              ) : (
                col.plans.map(ap => <CalendarKaizenCard key={ap._id} ap={ap} onClick={() => onSelect(ap)} />)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sezione "Senza scadenza o Lontane" */}
      {senzaScadenza.length > 0 && (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-bold text-gray-700">Senza scadenza o lontane</h3>
            <span className="text-xs bg-white px-2 py-0.5 rounded-full font-bold text-gray-700">
              {senzaScadenza.length}
            </span>
            <span className="text-xs text-gray-500 italic">— AP senza data o oltre i {calendarDays} giorni</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {senzaScadenza.map(ap => (
              <CalendarKaizenCard key={ap._id} ap={ap} onClick={() => onSelect(ap)} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarKaizenCard({ ap, onClick, compact }) {
  const TipoIcon = TIPO_ICONS[ap.tipo] || CheckSquare
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-md p-3 shadow-sm border cursor-pointer hover:shadow-md transition-all ${
        compact ? 'opacity-80 hover:opacity-100' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-mono text-xs text-primary font-bold">{ap.numero}</span>
        {ap.priorita && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITA_BG[ap.priorita] || ''}`}>
            {ap.priorita}
          </span>
        )}
      </div>
      <div className="font-medium text-sm mb-2 line-clamp-2">{ap.titolo}</div>
      {ap.tipo && (
        <div className={`flex items-center gap-1 text-xs mb-2 ${TIPO_COLORS[ap.tipo] || ''}`}>
          <TipoIcon size={12} />
          <span>{ap.tipo}</span>
        </div>
      )}
      <div className="flex justify-between items-center pt-2 border-t mt-2 text-xs">
        {ap.responsabile ? (
          <div className="flex items-center gap-1">
            <Avatar name={ap.responsabile} />
          </div>
        ) : (
          <span className="text-gray-400">— Non assegnato</span>
        )}
      </div>
      {ap.data_scadenza && (
        <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {new Date(ap.data_scadenza).toLocaleDateString('it-IT')}
          </span>
          {ap._giorniRitardo && ap._giorniRitardo > 0 && (
            <span className="text-red-600 font-bold">
              Da {ap._giorniRitardo} {ap._giorniRitardo === 1 ? 'giorno' : 'giorni'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
