import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { Plus, Filter, X, Trash2, Edit2, Link2, AlertCircle, CheckSquare, Bug, TrendingUp, Shield, Wrench, Eye } from 'lucide-react'
import ActionPlanFormShared from '../ActionPlanFormShared'

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

// Avatar circolare con iniziali
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

      {/* Tabella stile Action Plan Management */}
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
                    className={`border-b hover:bg-gray-50 ${isCancelled ? 'opacity-60' : ''}`}
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
                    <td className="px-3 py-2">
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
                    <td className="px-3 py-2">
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
                    <td className="px-3 py-2">
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

      {/* Modal */}
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
