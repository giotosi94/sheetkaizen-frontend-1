import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { Plus, Filter, ChevronDown, AlertCircle, CheckSquare, Bug, TrendingUp, Shield, Wrench } from 'lucide-react'
import ActionPlanFormShared from '../ActionPlanFormShared'
import ActionPlanDetailPanel from '../ActionPlanDetailPanel'

const PRIORITA_BG = {
  Lowest: 'bg-gray-100 text-gray-700',
  Low: 'bg-blue-100 text-blue-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
}

const TIPO_ICONS = {
  Task: CheckSquare, Bug: Bug, Improvement: TrendingUp,
  Audit: Shield, Manutenzione: Wrench, Sicurezza: AlertCircle,
}

const TIPO_COLORS = {
  Task: 'text-blue-600', Bug: 'text-red-600', Improvement: 'text-green-600',
  Audit: 'text-purple-600', Manutenzione: 'text-orange-600', Sicurezza: 'text-yellow-600',
}

function Avatar({ name }) {
  if (!name) return null
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500', 'bg-orange-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`${color} text-white rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ width: 20, height: 20, fontSize: 9 }}
      title={name}>
      {initials}
    </div>
  )
}

export default function ActionPlanWidget({ filterReparto, filterStato, dashboardId, dashboardName, title = "Action Plan" }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list')  // 'list' | 'calendar'
  const [calendarDays, setCalendarDays] = useState(30)
  const [showForm, setShowForm] = useState(false)
  const [editingAP, setEditingAP] = useState(null)
  const [selectedAP, setSelectedAP] = useState(null)

  useEffect(() => { load() }, [filterReparto, filterStato, dashboardId])

  const load = async () => {
    setLoading(true)
    try {
      // 🆕 Filtro per dashboard_id se presente, così il widget mostra solo gli AP della sua dashboard
      const params = new URLSearchParams()
      if (dashboardId) params.append('dashboard_id', dashboardId)
      if (filterReparto) params.append('reparto', filterReparto)
      if (filterStato) params.append('stato', filterStato)

      const res = await api.get(`/action-plans/?${params.toString()}`)
      setPlans(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function changeStato(apId, nuovoStato) {
    try {
      await api.patch(`/action-plans/${apId}/stato`, { stato: nuovoStato })
      load()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function deleteAP(apId, apNumero) {
    if (!confirm(`Eliminare ${apNumero}?\nQuesto rimuove l'Action Plan definitivamente.`)) return
    try {
      await api.delete(`/action-plans/${apId}`)
      load()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function cancelAP(plan) {
    const reason = prompt(`Annullare ${plan.numero} - ${plan.titolo}?\nInserisci il motivo:`)
    if (!reason || !reason.trim()) return
    try {
      await api.post(`/action-plans/${plan._id}/cancel`, {
        reason: reason.trim(),
        user: 'Default User',
      })
      load()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function restoreAP(plan) {
    if (!confirm(`Ripristinare ${plan.numero}?`)) return
    try {
      await api.post(`/action-plans/${plan._id}/restore`)
      load()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  // Helper: prefilled parent per il form (dashboard)
  const prefilledParent = dashboardId ? {
    parent_type: 'dashboard',
    parent_id: dashboardId,
    parent_label: dashboardName,
    dashboard_id: dashboardId,
  } : null

  // Statistiche
  const counts = {
    totale: plans.length,
    overdue: plans.filter(p => p.stato_visuale === 'In Ritardo').length,
  }

  return (
    <div className="bg-white rounded-xl shadow p-3 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 border-b pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3 className="font-bold text-gray-800 text-sm truncate">{title}</h3>
          <span className="text-xs text-gray-500">({counts.totale})</span>
          {counts.overdue > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-1.5 rounded font-bold">
              {counts.overdue} in ritardo
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Toggle Vista */}
          <div className="bg-gray-100 rounded p-0.5 flex gap-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-0.5 text-[10px] rounded ${
                viewMode === 'list' ? 'bg-white shadow-sm text-primary font-medium' : 'text-gray-600'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2 py-0.5 text-[10px] rounded ${
                viewMode === 'calendar' ? 'bg-white shadow-sm text-primary font-medium' : 'text-gray-600'
              }`}
            >
              Calendario
            </button>
          </div>
          {/* + Nuovo AP */}
          <button
            onClick={() => { setEditingAP(null); setShowForm(true) }}
            className="text-primary hover:bg-blue-50 p-1 rounded widget-action-btn"
            title="Aggiungi action plan"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="text-center text-gray-400 py-4 text-xs">Caricamento...</div>
        ) : plans.length === 0 ? (
          <div className="text-center text-gray-400 py-4 text-xs">
            Nessun action plan
            <div className="mt-2">
              <button
                onClick={() => { setEditingAP(null); setShowForm(true) }}
                className="text-primary hover:underline text-xs"
                onMouseDown={(e) => e.stopPropagation()}
              >
                + Crea il primo
              </button>
            </div>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarWidgetView
            plans={plans}
            calendarDays={calendarDays}
            setCalendarDays={setCalendarDays}
            onSelect={setSelectedAP}
          />
        ) : (
          <ListWidgetView
            plans={plans}
            onSelect={setSelectedAP}
            onChangeStato={changeStato}
          />
        )}
      </div>

      {/* Modal form AP */}
      {showForm && (
        <ActionPlanFormShared
          plan={editingAP}
          prefilledKaizen={null}
          prefilledParent={editingAP ? null : prefilledParent}
          onClose={() => { setShowForm(false); setEditingAP(null) }}
          onSaved={() => { setShowForm(false); setEditingAP(null); load() }}
        />
      )}

      {/* Pannello dettaglio AP */}
      {selectedAP && (
        <ActionPlanDetailPanel
          plan={selectedAP}
          onClose={() => setSelectedAP(null)}
          onUpdated={load}
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
// Lista compatta dei task
// ──────────────────────────────────────────────────────────
function ListWidgetView({ plans, onSelect, onChangeStato }) {
  return (
    <ul className="space-y-1">
      {plans.map(p => {
        const TipoIcon = TIPO_ICONS[p.tipo] || CheckSquare
        const isOverdue = p.stato_visuale === 'In Ritardo'
        const isCancelled = p.is_cancelled
        return (
          <li
            key={p._id}
            onClick={() => onSelect(p)}
            className={`p-2 rounded border text-xs cursor-pointer hover:bg-gray-50 transition-colors ${
              isCancelled ? 'opacity-60 border-gray-300' :
              isOverdue ? 'border-red-300 bg-red-50' :
              p.stato === 'Done' ? 'border-green-300 bg-green-50' :
              'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="font-mono text-[10px] text-primary font-bold">{p.numero}</span>
                  {p.priorita && (
                    <span className={`text-[9px] px-1 rounded ${PRIORITA_BG[p.priorita] || ''}`}>
                      {p.priorita}
                    </span>
                  )}
                </div>
                <p className="font-medium truncate">{p.titolo}</p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {p.tipo && (
                    <span className={`flex items-center gap-0.5 text-[10px] ${TIPO_COLORS[p.tipo] || ''}`}>
                      <TipoIcon size={10} />{p.tipo}
                    </span>
                  )}
                  {p.responsabile && (
                    <div className="flex items-center gap-1">
                      <Avatar name={p.responsabile} />
                      <span className="text-[10px] text-gray-600 truncate">{p.responsabile}</span>
                    </div>
                  )}
                  {p.data_scadenza && (
                    <span className={`text-[10px] ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                      {new Date(p.data_scadenza).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ──────────────────────────────────────────────────────────
// Vista Calendario compatta per il widget
// ──────────────────────────────────────────────────────────
function CalendarWidgetView({ plans, calendarDays, setCalendarDays, onSelect }) {
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

  const fineSettimana = new Date(oggi)
  fineSettimana.setDate(fineSettimana.getDate() + (7 - oggi.getDay()))
  fineSettimana.setHours(23, 59, 59, 999)

  const fineProssimePeriodo = new Date(fineSettimana)
  fineProssimePeriodo.setDate(fineProssimePeriodo.getDate() + calendarDays)

  const apsAttivi = plans.filter(p => !p.is_cancelled && p.stato !== 'Done')

  const scaduti = []
  const oggiAPs = []
  const settimanaAPs = []
  const prossimeAPs = []

  apsAttivi.forEach(ap => {
    if (!ap.data_scadenza) return
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
    }
  })

  const sortByDate = (a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)
  scaduti.sort(sortByDate)
  oggiAPs.sort(sortByDate)
  settimanaAPs.sort(sortByDate)
  prossimeAPs.sort(sortByDate)

  const colonne = [
    { id: 'scaduti', label: 'Scaduti', headerBg: 'bg-red-100', headerText: 'text-red-700', border: 'border-red-300', plans: scaduti },
    { id: 'oggi', label: 'Oggi', headerBg: 'bg-orange-100', headerText: 'text-orange-700', border: 'border-orange-300', plans: oggiAPs },
    { id: 'settimana', label: 'Settimana', headerBg: 'bg-yellow-100', headerText: 'text-yellow-700', border: 'border-yellow-300', plans: settimanaAPs },
    { id: 'prossime', label: `Prossimi ${calendarDays}gg`, headerBg: 'bg-blue-100', headerText: 'text-blue-700', border: 'border-blue-300', plans: prossimeAPs },
  ]

  return (
    <div className="space-y-2">
      {/* Periodo configurabile */}
      <div className="flex items-center gap-1 text-[10px]">
        <span className="text-gray-600">Prossimi:</span>
        {[7, 14, 30, 60].map(d => (
          <button
            key={d}
            onClick={() => setCalendarDays(d)}
            className={`px-1.5 py-0.5 rounded ${
              calendarDays === d ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {d}gg
          </button>
        ))}
      </div>

      {/* 4 colonne (responsive grid) */}
      <div className="grid grid-cols-2 gap-2">
        {colonne.map(col => (
          <div key={col.id} className={`rounded border ${col.border} bg-white flex flex-col`}>
            <div className={`${col.headerBg} ${col.headerText} px-2 py-1 rounded-t font-bold text-[10px] flex justify-between items-center`}>
              <span>{col.label}</span>
              <span className="bg-white bg-opacity-70 px-1 py-0.5 rounded-full text-[10px] font-bold">
                {col.plans.length}
              </span>
            </div>
            <div className="flex-1 p-1 space-y-1 overflow-y-auto" style={{ maxHeight: '200px' }}>
              {col.plans.length === 0 ? (
                <div className="text-center text-[10px] text-gray-400 py-2 italic">—</div>
              ) : (
                col.plans.map(ap => (
                  <CalendarWidgetCard key={ap._id} ap={ap} onClick={() => onSelect(ap)} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarWidgetCard({ ap, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded p-1.5 shadow-sm border cursor-pointer hover:shadow transition-all text-[10px]"
    >
      <div className="flex justify-between items-start mb-0.5">
        <span className="font-mono text-[9px] text-primary font-bold">{ap.numero}</span>
        {ap.priorita && (
          <span className={`text-[9px] px-1 rounded ${PRIORITA_BG[ap.priorita] || ''}`}>
            {ap.priorita}
          </span>
        )}
      </div>
      <div className="font-medium line-clamp-2 mb-1">{ap.titolo}</div>
      <div className="flex items-center justify-between">
        {ap.responsabile && (
          <div className="flex items-center gap-0.5">
            <Avatar name={ap.responsabile} />
          </div>
        )}
        {ap.data_scadenza && (
          <span className={ap._giorniRitardo > 0 ? 'text-red-600 font-bold' : 'text-gray-500'}>
            {ap._giorniRitardo > 0
              ? `-${ap._giorniRitardo}gg`
              : new Date(ap.data_scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
            }
          </span>
        )}
      </div>
    </div>
  )
}
