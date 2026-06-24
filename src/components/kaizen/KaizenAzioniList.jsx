import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { Plus, Filter, X, Trash2 } from 'lucide-react'-100 text-green-700',import { Plus, Filter, X, Trash2 } from 'lucide-react'
  'Cancelled': 'bg-gray-200 text-gray-500',
}

/**
 * KaizenAzioniList — Lista AP con filtro per step del Gant
 */
export default function KaizenAzioniList({ kaizen, kaizenId, kaizenNumero, onUpdate }) {
  const [azioni, setAzioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStep, setFilterStep] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingAP, setEditingAP] = useState(null)

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
        gant_step_id: stepId === 'none' || !stepId ? null : stepId,
      })
      loadAzioni()
    } catch (err) {
      console.error(err)
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  const changeStato = async (apId, nuovoStato) => {
    try {
      await api.patch(`/action-plans/${apId}/stato`, { stato: nuovoStato })
      loadAzioni()
    } catch (err) {
      console.error(err)
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

  const handleNewAP = () => {
    setEditingAP(null)
    setShowForm(true)
  }

  // Statistiche
  const stats = useMemo(() => ({
    totale: azioni.length,
    standalone: azioni.filter(a => !a.gant_step_id).length,
    perStep: steps.map(s => ({
      ...s,
      count: azioni.filter(a => a.gant_step_id === s.id).length,
    })),
  }), [azioni, steps])

  const azioniFiltrate = useMemo(() => {
    return azioni.filter(ap => {
      if (filterStep === 'none' && ap.gant_step_id) return false
      if (filterStep && filterStep !== 'none' && ap.gant_step_id !== filterStep) return false
      if (filterStato && ap.stato !== filterStato) return false
      return true
    })
  }, [azioni, filterStep, filterStato])

  const getStepLabel = (stepId) => {
    if (!stepId) return null
    const step = steps.find(s => s.id === stepId)
    return step ? `Step ${step.num}: ${step.label}` : 'Step rimosso'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="font-bold text-sm uppercase text-gray-700">Azioni del Kaizen</h4>
            <p className="text-xs text-gray-500">Azioni concrete, eventualmente legate a uno step del Gant macro</p>
          </div>
          <button
            onClick={handleNewAP}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light text-sm font-medium flex items-center gap-1"
          >
            <Plus size={14} /> Crea Action Plan
          </button>
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
            <option value="none">Standalone — Senza step ({stats.standalone})</option>
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

      {/* Lista */}
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
            <button
              onClick={handleNewAP}
              className="text-primary hover:underline text-sm"
            >
              + Crea la prima azione
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {azioniFiltrate.map(ap => {
            const isOverdue = ap.stato_visuale === 'In Ritardo'
            const isCancelled = ap.is_cancelled
            return (
              <div
                key={ap._id}
                className={`bg-white rounded-xl shadow p-3 border-l-4 ${
                  isCancelled ? 'border-gray-400 opacity-60' :
                  isOverdue ? 'border-red-500' :
                  'border-primary'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-primary font-bold">{ap.numero}</span>
                      <h4 className="font-semibold truncate">{ap.titolo}</h4>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {ap.responsabile && <span className="text-gray-600">{ap.responsabile}</span>}
                      {ap.tipo && <span className="text-gray-500">{ap.tipo}</span>}
                      {ap.priorita && <span className="text-gray-500">{ap.priorita}</span>}
                      {ap.data_scadenza && (
                        <span className={isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}>
                          Scadenza: {new Date(ap.data_scadenza).toLocaleDateString('it-IT')}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] uppercase text-gray-500 font-bold">Step Gant:</span>
                      <select
                        value={ap.gant_step_id || 'none'}
                        onChange={(e) => changeStepAP(ap._id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded border ${
                          ap.gant_step_id
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        <option value="none">— Standalone (nessuno step) —</option>
                        {steps.map(s => (
                          <option key={s.id} value={s.id}>
                            Step {s.num}: {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <select
                      value={ap.stato || 'Aperto'}
                      onChange={(e) => changeStato(ap._id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded border font-medium ${STATO_COLORS[ap.stato] || 'bg-gray-100 text-gray-700'}`}
                    >
                      <option>Da Valutare</option>
                      <option>Aperto</option>
                      <option>In Corso</option>
                      <option>In Verifica</option>
                      <option>Done</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                  <button
                    onClick={() => { setEditingAP(ap); setShowForm(true) }}
                    className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded text-blue-700"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => unlinkAP(ap._id, ap.numero)}
                    className="text-xs px-3 py-1 bg-yellow-50 hover:bg-yellow-100 rounded text-yellow-700"
                    title="Scollega dal Kaizen (l'AP resta nel sistema)"
                  >
                    Scollega
                  </button>
                  <button
                    onClick={() => deleteAP(ap._id, ap.numero)}
                    className="text-xs px-3 py-1 bg-red-50 hover:bg-red-100 rounded text-red-700 flex items-center gap-1"
                    title="Elimina definitivamente l'Action Plan"
                  >
                    <Trash2 size={12} /> Elimina
                  </button>
                </div>
              </div>
            )
          })}
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
    </div>
  )
}
import ActionPlanFormShared from '../ActionPlanFormShared'

const STATO_COLORS = {
  'Da Valutare': 'bg-gray-100 text-gray-700',
  'Aperto': 'bg-blue-100 text-blue-700',
  'In Corso': 'bg-yellow-100 text-yellow-700',
  'In Verifica': 'bg-purple-100 text-purple-700',
