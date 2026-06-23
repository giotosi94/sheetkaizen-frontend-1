import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Plus, Search, Filter, User, AlertCircle, CheckCircle2, Clock, X, Edit2,
  Trash2, MessageSquare, TrendingUp, Link2, Tag, AtSign, ChevronDown,
  Calendar, Flag, Activity, CheckSquare, Square, Send, MoreHorizontal,
  Shield, Zap, Bug, Wrench, Eye
} from 'lucide-react'
import api from '../services/api'
import { useAllConfigurations } from '../hooks/useConfigurations'
import ActionPlanFormShared from '../components/ActionPlanFormShared'

const STATI = ['Da Valutare', 'Aperto', 'In Corso', 'In Verifica', 'Done', 'Cancelled']
const PRIORITA = ['Lowest', 'Low', 'Medium', 'High', 'Critical']
const TIPI = ['Task', 'Bug', 'Improvement', 'Audit', 'Manutenzione', 'Sicurezza']

const STATO_COLORS = {
  'Da Valutare': 'bg-gray-100 text-gray-700 border-gray-300',
  Aperto: 'bg-blue-100 text-blue-700 border-blue-300',
  'In Corso': 'bg-indigo-100 text-indigo-700 border-indigo-300',
  'In Verifica': 'bg-purple-100 text-purple-700 border-purple-300',
  Done: 'bg-green-100 text-green-700 border-green-300',
  Cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
  'In Ritardo': 'bg-red-100 text-red-700 border-red-300',
  'In Scadenza': 'bg-yellow-100 text-yellow-700 border-yellow-300',
}

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

export default function ActionPlanPage() {
  const [plans, setPlans] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [filters, setFilters] = useState({
    search: '', stato: '', tipo: '', priorita: '',
    categoria_perdita: '', quinta_m: '',
    responsabile: '', reparto: '', linea: '', macchina: '',
    pillar_id: '', dashboard_id: '',
    tag: '', overdue: false,
    include_cancelled: false,
    only_cancelled: false,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [reparti, setReparti] = useState([])
  const [pillars, setPillars] = useState([])
  const [dashboards, setDashboards] = useState([])

  const { configs } = useAllConfigurations()
  const statiConfig = configs.stato_ap || []
  const prioritaConfig = configs.priorita_ap || []
  const tipiConfig = configs.tipi_action_plan || []

  useEffect(() => { loadData() }, [filters])

  useEffect(() => {
    Promise.all([
      api.get('/reparti/').then(r => r.data).catch(() => []),
      api.get('/pillars/').then(r => r.data).catch(() => []),
      api.get('/dashboards/').then(r => r.data).catch(() => []),
    ]).then(([rep, pil, dsh]) => {
      setReparti(rep || [])
      setPillars(pil || [])
      setDashboards(dsh || [])
    })
  }, [])

  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => {
    if (['search'].includes(k)) return false
    if (typeof v === 'boolean') return v === true
    return v !== '' && v !== null && v !== undefined
  }).length

  const lineeFiltrate = filters.reparto
    ? (reparti.find(r => r.nome === filters.reparto)?.linee || [])
    : []
  const macchineFiltrate = filters.linea
    ? (lineeFiltrate.find(l => l.nome === filters.linea)?.macchine || [])
    : []

  const responsabiliUnici = [...new Set(plans.map(p => p.responsabile).filter(Boolean))].sort()

  function resetFilters() {
    setFilters({
      search: filters.search,
      stato: '', tipo: '', priorita: '',
      categoria_perdita: '', quinta_m: '',
      responsabile: '', reparto: '', linea: '', macchina: '',
      pillar_id: '', dashboard_id: '',
      tag: '', overdue: false,
      include_cancelled: false,
      only_cancelled: false,
    })
  }

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v === true) params.append(k, 'true')
        else if (v) params.append(k, v)
      })
      const [plansRes, statsRes] = await Promise.all([
        api.get(`/action-plans/?${params.toString()}`),
        api.get('/action-plans/stats/summary'),
      ])
      setPlans(plansRes.data)
      setStats(statsRes.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDelete(id) {
    if (!confirm('🗑️ Eliminare definitivamente questo Action Plan?\n\n(Sparisce dalla UI ma resta in DB per audit)')) return
    await api.delete(`/action-plans/${id}`)
    loadData()
  }

  async function handleCancel(plan) {
    const reason = prompt(
      `🚫 Annullare l'Action Plan "${plan.numero} - ${plan.titolo}"?\n\n` +
      `Inserisci il motivo (obbligatorio):`
    )
    if (!reason || !reason.trim()) return
    try {
      await api.post(`/action-plans/${plan._id}/cancel`, {
        reason: reason.trim(),
        user: 'Default User',
      })
      loadData()
    } catch (err) {
      alert('Errore annullamento: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function handleRestore(plan) {
    if (!confirm(`♻️ Ripristinare l'Action Plan "${plan.numero}"?\n\nTornerà tra gli attivi.`)) return
    try {
      await api.post(`/action-plans/${plan._id}/restore`)
      loadData()
    } catch (err) {
      alert('Errore ripristino: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function quickStateChange(planId, newStato) {
    await api.patch(`/action-plans/${planId}/stato`, { stato: newStato })
    loadData()
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">🎯 Action Plan Management</h1>
          <p className="text-gray-500 text-sm">Gestione piani d'azione trasversali</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="bg-white border rounded-lg p-1 flex gap-1 shadow-sm">
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-all ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>📋 Lista</button>
            <button onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-all ${viewMode === 'kanban' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>🎯 Kanban</button>
          </div>
          <button onClick={() => { setEditingPlan(null); setShowForm(true) }}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light shadow-sm">
            <Plus size={20} /> Nuovo Action Plan
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Totale" value={stats.totale || 0} color="gray" icon={Activity}
          onClick={() => setFilters({...filters, stato: '', overdue: false})}
          active={!filters.stato && !filters.overdue} />
        <StatCard label="Da Valutare" value={stats.per_stato?.['Da Valutare'] || 0} color="gray" icon={Clock}
          onClick={() => setFilters({...filters, stato: 'Da Valutare', overdue: false})}
          active={filters.stato === 'Da Valutare'} />
        <StatCard label="In Corso" value={stats.per_stato?.['In Corso'] || 0} color="indigo" icon={TrendingUp}
          onClick={() => setFilters({...filters, stato: 'In Corso', overdue: false})}
          active={filters.stato === 'In Corso'} />
        <StatCard label="In Verifica" value={stats.per_stato?.['In Verifica'] || 0} color="purple" icon={Eye}
          onClick={() => setFilters({...filters, stato: 'In Verifica', overdue: false})}
          active={filters.stato === 'In Verifica'} />
        <StatCard label="Done" value={stats.per_stato?.Done || 0} color="green" icon={CheckCircle2}
          onClick={() => setFilters({...filters, stato: 'Done', overdue: false})}
          active={filters.stato === 'Done'} />
        <StatCard label="Overdue" value={stats.overdue || 0} color="red" icon={AlertCircle}
          onClick={() => setFilters({...filters, stato: '', overdue: !filters.overdue})}
          active={filters.overdue} />
      </div>

      {/* SEARCH + FILTRI AVANZATI */}
      <div className="bg-white p-3 rounded-lg shadow-sm">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca titolo, numero, tag, descrizione..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 border-2 transition-all ${
              showFilters || activeFiltersCount > 0
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white border-gray-200 hover:border-primary text-gray-700'
            }`}
          >
            <Filter size={16} />
            Filtri avanzati
            {activeFiltersCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                showFilters ? 'bg-white text-primary' : 'bg-primary text-white'
              }`}>
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-lg text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
              title="Pulisci tutti i filtri"
            >
              🔄 Reset
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Riga 1: Vista */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">📦 Vista</label>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={!filters.only_cancelled && !filters.include_cancelled && !filters.overdue}
                  onClick={() => setFilters({ ...filters, only_cancelled: false, include_cancelled: false, overdue: false })}
                  label="✅ Solo attivi"
                />
                <FilterChip
                  active={filters.overdue}
                  onClick={() => setFilters({ ...filters, overdue: !filters.overdue, only_cancelled: false })}
                  label="⏰ Solo scaduti"
                />
                <FilterChip
                  active={filters.include_cancelled && !filters.only_cancelled}
                  onClick={() => setFilters({ ...filters, include_cancelled: true, only_cancelled: false })}
                  label="👁️ Mostra anche annullati"
                />
                <FilterChip
                  active={filters.only_cancelled}
                  onClick={() => setFilters({ ...filters, only_cancelled: true, include_cancelled: false })}
                  label="🚫 Solo annullati"
                  variant="danger"
                />
              </div>
            </div>

            {/* Riga 2: Classificazione */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">🏷️ Classificazione</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={filters.stato} onChange={(e) => setFilters({ ...filters, stato: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">📍 Tutti gli stati</option>
                  {statiConfig.map(s => <option key={s._id} value={s.label}>{s.icon ? `${s.icon} ` : ''}{s.label}</option>)}
                </select>
                <select value={filters.tipo} onChange={(e) => setFilters({ ...filters, tipo: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">🏷️ Tutti i tipi</option>
                  {tipiConfig.map(t => <option key={t._id} value={t.label}>{t.icon ? `${t.icon} ` : ''}{t.label}</option>)}
                </select>
                <select value={filters.priorita} onChange={(e) => setFilters({ ...filters, priorita: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">🎚️ Tutte le priorità</option>
                  {prioritaConfig.map(p => <option key={p._id} value={p.label}>{p.icon ? `${p.icon} ` : ''}{p.label}</option>)}
                </select>
                <select value={filters.categoria_perdita} onChange={(e) => setFilters({ ...filters, categoria_perdita: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">💥 Tutte categorie perdita</option>
                  {(configs.categorie_perdita || []).map(c => <option key={c._id} value={c.label}>{c.icon ? `${c.icon} ` : ''}{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Riga 3: Struttura aziendale */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">🏭 Struttura aziendale</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={filters.reparto} onChange={(e) => setFilters({ ...filters, reparto: e.target.value, linea: '', macchina: '' })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">🏭 Tutti i reparti</option>
                  {reparti.filter(r => r.attivo !== false).map(r => <option key={r._id} value={r.nome}>{r.nome}{r.codice ? ` [${r.codice}]` : ''}</option>)}
                </select>
                <select value={filters.linea} onChange={(e) => setFilters({ ...filters, linea: e.target.value, macchina: '' })} disabled={!filters.reparto} className="border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">{filters.reparto ? '🔹 Tutte le linee' : '— prima il reparto —'}</option>
                  {lineeFiltrate.filter(l => l.attivo !== false).map(l => <option key={l.id} value={l.nome}>{l.nome}{l.codice ? ` [${l.codice}]` : ''}</option>)}
                </select>
                <select value={filters.macchina} onChange={(e) => setFilters({ ...filters, macchina: e.target.value })} disabled={!filters.linea} className="border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">{filters.linea ? '⚙️ Tutte le macchine' : '— prima la linea —'}</option>
                  {macchineFiltrate.filter(m => m.attivo !== false).map(m => <option key={m.id} value={m.nome}>{m.nome}{m.codice ? ` [${m.codice}]` : ''}</option>)}
                </select>
                <select value={filters.quinta_m} onChange={(e) => setFilters({ ...filters, quinta_m: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">🧩 Tutte le 5M</option>
                  <option value="Machine">⚙️ Machine</option>
                  <option value="Manodopera">👷 Manodopera</option>
                  <option value="Metodo">📋 Metodo</option>
                  <option value="Materiale">📦 Materiale</option>
                  <option value="Misurazione">📏 Misurazione</option>
                </select>
              </div>
            </div>

            {/* Riga 4: Contesto */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">🔗 Contesto</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select value={filters.pillar_id} onChange={(e) => setFilters({ ...filters, pillar_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">🏛️ Tutti i pillars</option>
                  {pillars.filter(p => p.attivo !== false).map(p => (
                    <option key={p._id} value={p._id}>{p.icon ? `${p.icon} ` : ''}{p.sigla} — {p.label}</option>
                  ))}
                </select>
                <select value={filters.dashboard_id} onChange={(e) => setFilters({ ...filters, dashboard_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">📊 Tutte le dashboard</option>
                  {dashboards.map(d => (
                    <option key={d._id} value={d._id}>{d.icon ? `${d.icon} ` : '📊 '}{d.nome || d.label || d.titolo || 'Dashboard'}</option>
                  ))}
                </select>
                <input type="text" list="responsabili-list" placeholder="👤 Responsabile" value={filters.responsabile}
                  onChange={(e) => setFilters({ ...filters, responsabile: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm" />
                <datalist id="responsabili-list">
                  {responsabiliUnici.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* LISTA/KANBAN */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-400">⏳ Caricamento...</div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-400">
          <div className="text-5xl mb-2">📋</div>
          <p>Nessun Action Plan trovato</p>
          <button onClick={() => setShowForm(true)} className="text-primary hover:underline mt-2">Creane uno nuovo →</button>
        </div>
      ) : viewMode === 'list' ? (
        <ListView plans={plans} onSelect={setSelectedPlan}
          onEdit={(p) => { setEditingPlan(p); setShowForm(true) }}
          onDelete={handleDelete}
          onCancel={handleCancel}
          onRestore={handleRestore}
          onQuickStateChange={quickStateChange}
          statiConfig={statiConfig} />
      ) : (
        <KanbanView plans={plans} onSelect={setSelectedPlan} onStateChange={quickStateChange} reload={loadData}
          statiConfig={statiConfig}
          onCancel={handleCancel}
          onRestore={handleRestore} />
      )}

      {showForm && (
        <ActionPlanFormShared
          plan={editingPlan}
          onClose={() => { setShowForm(false); setEditingPlan(null) }}
          onSaved={(saved) => { setShowForm(false); setEditingPlan(null); loadData(); if (saved) setSelectedPlan(saved) }}
        />
      )}
      {selectedPlan && (
        <ActionPlanDetail plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onUpdated={() => loadData()}
          onEdit={(p) => { setSelectedPlan(null); setEditingPlan(p); setShowForm(true) }}
          onCancel={async (p) => { await handleCancel(p); setSelectedPlan(null) }}
          onRestore={async (p) => { await handleRestore(p); setSelectedPlan(null) }}
          onDelete={async (id) => { await handleDelete(id); setSelectedPlan(null) }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ──────────────────────────────────────────────────────────
function FilterChip({ active, onClick, label, variant = 'primary' }) {
  const styles = {
    primary: active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:border-primary',
    danger: active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200 hover:border-red-400',
  }
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${styles[variant]}`}>
      {label}
    </button>
  )
}

function Avatar({ name, size = 24 }) {
  if (!name) return null
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.45 }}
      className={`${color} text-white rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      title={name}>{initials}</div>
  )
}

function StatCard({ label, value, color, icon: Icon, onClick, active }) {
  const colors = {
    gray: 'border-gray-200 text-gray-700', blue: 'border-blue-200 text-blue-700',
    indigo: 'border-indigo-200 text-indigo-700', purple: 'border-purple-200 text-purple-700',
    green: 'border-green-200 text-green-700', red: 'border-red-200 text-red-700',
  }
  return (
    <button onClick={onClick}
      className={`p-3 rounded-lg border-2 bg-white hover:shadow-md transition-all text-left ${active ? `${colors[color]} shadow-md scale-105` : 'border-gray-100'}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs uppercase text-gray-500">{label}</span>
        <Icon size={16} className="opacity-50" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </button>
  )
}

function HealthBadge({ score }) {
  let color = 'bg-red-500'
  if (score >= 75) color = 'bg-green-500'
  else if (score >= 50) color = 'bg-yellow-500'
  else if (score >= 25) color = 'bg-orange-500'
  return (
    <div className="flex items-center gap-1" title={`Health: ${score}/100`}>
      <div className="w-12 bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-600">{score}</span>
    </div>
  )
}

function ActionPlanDetail({ plan, onClose, onUpdated, onEdit, onCancel, onRestore, onDelete }) {
  const [detail, setDetail] = useState(plan)
  const [nuovoCommento, setNuovoCommento] = useState('')
  const [nuovoChecklistItem, setNuovoChecklistItem] = useState('')

  useEffect(() => {
    api.get(`/action-plans/${plan._id}`).then(res => setDetail(res.data)).catch(() => {})
  }, [plan._id])

  async function reload() {
    const res = await api.get(`/action-plans/${plan._id}`)
    setDetail(res.data)
    onUpdated()
  }

  async function addCommento() {
    if (!nuovoCommento.trim()) return
    await api.post(`/action-plans/${plan._id}/commenti`, { testo: nuovoCommento, autore: 'Default User' })
    setNuovoCommento('')
    reload()
  }

  async function addChecklistItem() {
    if (!nuovoChecklistItem.trim()) return
    await api.post(`/action-plans/${plan._id}/checklist`, { testo: nuovoChecklistItem })
    setNuovoChecklistItem('')
    reload()
  }

  async function toggleChecklist(itemId, completato) {
    await api.patch(`/action-plans/${plan._id}/checklist/${itemId}`, { completato })
    reload()
  }

  async function removeChecklist(itemId) {
    await api.delete(`/action-plans/${plan._id}/checklist/${itemId}`)
    reload()
  }

  async function changeStato(stato) {
    await api.patch(`/action-plans/${plan._id}/stato`, { stato })
    reload()
  }

  const TipoIcon = TIPO_ICONS[detail.tipo] || CheckSquare
  const checklistCompletati = detail.checklist?.filter(c => c.completato).length || 0
  const checklistTotali = detail.checklist?.length || 0
  const checklistPercent = checklistTotali ? Math.round((checklistCompletati / checklistTotali) * 100) : 0

  return (
    <Modal title="" onClose={onClose} wide noPadding>
      <div className="grid grid-cols-3 gap-0 h-[85vh]">
        <div className="col-span-2 overflow-y-auto border-r">
          <div className="bg-gradient-to-r from-primary to-primary-light text-white p-4">
            <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
              <TipoIcon size={16} />
              <span>{detail.tipo}</span>
              <span>·</span>
              <span className="font-mono">{detail.numero}</span>
              <span>·</span>
              <HealthBadge score={detail.health_score || 0} />
            </div>
            <h2 className="text-xl font-bold">{detail.titolo}</h2>
          </div>

          <div className="p-6 space-y-6">
            <Section title="📝 Descrizione">
              {detail.descrizione ? (
                <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                  {renderWithMentionsTags(detail.descrizione)}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">Nessuna descrizione</div>
              )}
            </Section>

            {(detail.tags?.length > 0 || detail.mentions?.length > 0) && (
              <Section title="🏷️ Tags & Mentions">
                <div className="flex flex-wrap gap-2">
                  {detail.tags?.map(t => (
                    <span key={t} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">#{t}</span>
                  ))}
                  {detail.mentions?.map(m => (
                    <span key={m} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1">
                      <AtSign size={10} />{m}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            <Section title={`✅ Checklist ${checklistTotali > 0 ? `(${checklistCompletati}/${checklistTotali})` : ''}`}>
              {checklistTotali > 0 && (
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${checklistPercent}%` }} />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {(detail.checklist || []).map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button onClick={() => toggleChecklist(item.id, !item.completato)}>
                      {item.completato ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} className="text-gray-400" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.completato ? 'line-through text-gray-400' : ''}`}>{item.testo}</span>
                    <button onClick={() => removeChecklist(item.id)} className="opacity-0 group-hover:opacity-100 text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={nuovoChecklistItem} onChange={(e) => setNuovoChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                  placeholder="Aggiungi item..." className="flex-1 border rounded px-3 py-1.5 text-sm" />
                <button onClick={addChecklistItem} className="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300">+ Item</button>
              </div>
            </Section>

            <Section title={`💬 Commenti (${detail.commenti?.length || 0})`}>
              <div className="space-y-3 mb-3">
                {(detail.commenti || []).slice().reverse().map(c => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar name={c.autore} size={32} />
                    <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <strong className="text-sm">{c.autore}</strong>
                        <span className="text-xs text-gray-400">{new Date(c.timestamp).toLocaleString('it-IT')}</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{renderWithMentionsTags(c.testo)}</div>
                    </div>
                  </div>
                ))}
                {(!detail.commenti || detail.commenti.length === 0) && (
                  <div className="text-sm text-gray-400 italic">Nessun commento ancora — sii il primo!</div>
                )}
              </div>
              <div className="flex gap-2">
                <textarea value={nuovoCommento} onChange={(e) => setNuovoCommento(e.target.value)}
                  placeholder="Scrivi un commento... usa @nome per taggare e #argomento per categorizzare"
                  rows={2} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <button onClick={addCommento} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light self-end">
                  <Send size={16} />
                </button>
              </div>
            </Section>
          </div>
        </div>

        <div className="overflow-y-auto bg-gray-50 p-4 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <span className="text-sm font-medium">Dettagli</span>
            <div className="flex gap-1">
              {!detail.is_cancelled && onCancel && (
                <button onClick={() => onCancel(detail)} className="p-1.5 hover:bg-orange-100 rounded text-orange-600" title="🚫 Annulla Action Plan">🚫</button>
              )}
              {detail.is_cancelled && onRestore && (
                <button onClick={() => onRestore(detail)} className="p-1.5 hover:bg-green-100 rounded text-green-600" title="♻️ Ripristina">♻️</button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(detail._id)} className="p-1.5 hover:bg-red-100 rounded text-red-600" title="🗑️ Elimina definitivamente">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => onEdit(detail)} className="p-1.5 hover:bg-gray-200 rounded" title="Modifica"><Edit2 size={14} /></button>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded" title="Chiudi"><X size={14} /></button>
            </div>
          </div>

          {detail.is_cancelled && (
            <div className="bg-red-100 border border-red-300 rounded p-2 text-xs">
              <div className="font-bold text-red-800 mb-1">🚫 Action Plan annullato</div>
              {detail.cancelled_reason && <div className="text-red-700 italic">"{detail.cancelled_reason}"</div>}
              {detail.cancelled_at && (
                <div className="text-red-600 mt-1">
                  📅 {new Date(detail.cancelled_at).toLocaleDateString('it-IT')}
                  {detail.cancelled_by && ` da ${detail.cancelled_by}`}
                </div>
              )}
            </div>
          )}

          <SidebarRow label="Stato">
            <select value={detail.stato} onChange={(e) => changeStato(e.target.value)}
              className={`text-xs px-2 py-1 rounded border ${STATO_COLORS[detail.stato_visuale] || STATO_COLORS[detail.stato] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
              {STATI.map(s => <option key={s}>{s}</option>)}
            </select>
          </SidebarRow>

          <SidebarRow label="Priorità">
            <span className={`px-2 py-0.5 rounded text-xs ${PRIORITA_BG[detail.priorita] || ''}`}>
              {detail.priorita === 'Critical' && '🔥 '}{detail.priorita}
            </span>
          </SidebarRow>

          <SidebarRow label="Tipo">
            <span className={`text-xs flex items-center gap-1 ${TIPO_COLORS[detail.tipo] || ''}`}>
              <TipoIcon size={12} /> {detail.tipo}
            </span>
          </SidebarRow>

          <SidebarRow label="Responsabile">
            {detail.responsabile ? (
              <div className="flex items-center gap-1">
                <Avatar name={detail.responsabile} size={20} />
                <span className="text-xs">{detail.responsabile}</span>
              </div>
            ) : <span className="text-xs text-gray-400">—</span>}
          </SidebarRow>

          <SidebarRow label="Reporter">
            <span className="text-xs">{detail.reporter || '—'}</span>
          </SidebarRow>

          <SidebarRow label="Scadenza">
            <span className={`text-xs ${detail.stato_visuale === 'In Ritardo' ? 'text-red-600 font-bold' : ''}`}>
              {detail.data_scadenza ? new Date(detail.data_scadenza).toLocaleDateString('it-IT') : '—'}
            </span>
          </SidebarRow>

          <SidebarRow label="Categoria Perdita">
            <span className="text-xs">{detail.categoria_perdita || detail.tipo_perdita || '—'}</span>
          </SidebarRow>

          {(detail.reparto || detail.linea || detail.macchina) && (
            <SidebarRow label="Location">
              <div className="text-xs text-right">
                {detail.reparto && <div>🏭 {detail.reparto}</div>}
                {detail.linea && <div>📍 {detail.linea}</div>}
                {detail.macchina && <div>⚙️ {detail.macchina}</div>}
              </div>
            </SidebarRow>
          )}

          {detail.links?.length > 0 && (
            <SidebarRow label={`Links (${detail.links.length})`}>
              <div className="text-xs space-y-1">
                {detail.links.map((l, i) => (
                  <div key={i} className="bg-white px-2 py-1 rounded border">
                    <span className="text-gray-500">{l.entity_type}:</span> {l.entity_label || l.entity_id}
                  </div>
                ))}
              </div>
            </SidebarRow>
          )}

          <div className="pt-3 border-t">
            <div className="text-xs font-medium mb-2">📜 Attività</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(detail.feed || []).slice().reverse().slice(0, 20).map((f, i) => (
                <div key={i} className="text-xs border-l-2 border-primary pl-2">
                  <div className="text-gray-500">{new Date(f.timestamp).toLocaleString('it-IT')}</div>
                  <div><strong>{f.utente}</strong> · {f.azione}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
function ListView({ plans, onSelect, onEdit, onDelete, onCancel, onRestore, onQuickStateChange, statiConfig = [] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left w-24">Numero</th>
            <th className="px-3 py-2 text-left">Titolo</th>
            <th className="px-3 py-2 text-left w-20">Tipo</th>
            <th className="px-3 py-2 text-left w-24">Priorità</th>
            <th className="px-3 py-2 text-left w-32">Responsabile</th>
            <th className="px-3 py-2 text-left w-32">Stato</th>
            <th className="px-3 py-2 text-left w-28">Scadenza</th>
            <th className="px-3 py-2 text-left w-20">Health</th>
            <th className="px-3 py-2 text-center w-40">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {plans.map(p => {
            const TipoIcon = TIPO_ICONS[p.tipo] || CheckSquare
            return (
              <tr key={p._id}
                className={`border-b hover:bg-gray-50 cursor-pointer ${p.is_cancelled ? 'bg-red-50 opacity-70' : ''}`}
                onClick={() => onSelect(p)}
                title={p.is_cancelled ? `🚫 Annullato — ${p.cancelled_reason || 'senza motivo'}` : ''}
              >
                <td className="px-3 py-2 font-mono text-primary text-xs">{p.numero}</td>
                <td className="px-3 py-2">
                  <div className="font-medium truncate max-w-md">{p.titolo}</div>
                  {(p.tags?.length > 0 || p.mentions?.length > 0 || p.links?.length > 0 || p.commenti?.length > 0) && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {p.tags?.slice(0, 3).map(t => (
                        <span key={t} className="text-xs bg-purple-50 text-purple-700 px-1.5 rounded">#{t}</span>
                      ))}
                      {p.mentions?.slice(0, 2).map(m => (
                        <span key={m} className="text-xs bg-blue-50 text-blue-700 px-1.5 rounded">@{m}</span>
                      ))}
                      {p.links?.length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 rounded flex items-center gap-0.5">
                          <Link2 size={10} /> {p.links.length}
                        </span>
                      )}
                      {p.commenti?.length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 rounded flex items-center gap-0.5">
                          <MessageSquare size={10} /> {p.commenti.length}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className={`flex items-center gap-1 text-xs ${TIPO_COLORS[p.tipo] || ''}`}>
                    <TipoIcon size={14} /><span>{p.tipo}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${PRIORITA_BG[p.priorita] || ''}`}>
                    {p.priorita === 'Critical' && '🔥 '}{p.priorita}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {p.responsabile ? (
                    <div className="flex items-center gap-1">
                      <Avatar name={p.responsabile} size={20} />
                      <span className="text-xs truncate">{p.responsabile}</span>
                    </div>
                  ) : <span className="text-xs text-gray-400">— Non assegnato</span>}
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <select value={p.stato} onChange={(e) => onQuickStateChange(p._id, e.target.value)}
                    className={`text-xs px-1.5 py-1 rounded border ${STATO_COLORS[p.stato_visuale] || STATO_COLORS[p.stato] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                    {statiConfig.length === 0 ? (
                      <option value={p.stato}>{p.stato || '— Configura stati —'}</option>
                    ) : (
                      statiConfig.map(s => (
                        <option key={s._id} value={s.label}>{s.icon ? `${s.icon} ` : ''}{s.label}</option>
                      ))
                    )}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs">
                  {p.data_scadenza ? (
                    <div className={p.stato_visuale === 'In Ritardo' ? 'text-red-600 font-bold' : ''}>
                      {new Date(p.data_scadenza).toLocaleDateString('it-IT')}
                    </div>
                  ) : '—'}
                </td>
                <td className="px-3 py-2"><HealthBadge score={p.health_score || 0} /></td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center gap-1">
                    <button onClick={() => onSelect(p)} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="Dettaglio"><Eye size={14} /></button>
                    {!p.is_cancelled && (
                      <>
                        <button onClick={() => onEdit(p)} className="p-1 hover:bg-yellow-100 rounded text-yellow-600" title="Modifica"><Edit2 size={14} /></button>
                        <button onClick={() => onCancel(p)} className="p-1 hover:bg-orange-100 rounded text-orange-600" title="🚫 Annulla AP">🚫</button>
                      </>
                    )}
                    {p.is_cancelled && (
                      <button onClick={() => onRestore(p)} className="p-1 hover:bg-green-100 rounded text-green-600" title="♻️ Ripristina">♻️</button>
                    )}
                    <button onClick={() => onDelete(p._id)} className="p-1 hover:bg-red-100 rounded text-red-600" title="🗑️ Elimina definitivamente"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const KANBAN_PALETTE = [
  { color: 'bg-gray-50 border-gray-300', headerColor: 'bg-gray-200 text-gray-700' },
  { color: 'bg-blue-50 border-blue-200', headerColor: 'bg-blue-200 text-blue-800' },
  { color: 'bg-indigo-50 border-indigo-200', headerColor: 'bg-indigo-200 text-indigo-800' },
  { color: 'bg-purple-50 border-purple-200', headerColor: 'bg-purple-200 text-purple-800' },
  { color: 'bg-green-50 border-green-200', headerColor: 'bg-green-200 text-green-800' },
  { color: 'bg-yellow-50 border-yellow-200', headerColor: 'bg-yellow-200 text-yellow-800' },
  { color: 'bg-orange-50 border-orange-200', headerColor: 'bg-orange-200 text-orange-800' },
  { color: 'bg-red-50 border-red-200', headerColor: 'bg-red-200 text-red-800' },
  { color: 'bg-pink-50 border-pink-200', headerColor: 'bg-pink-200 text-pink-800' },
]

function KanbanView({ plans, onSelect, onStateChange, reload, statiConfig = [], onCancel, onRestore }) {
  const columns = statiConfig.length > 0
    ? statiConfig.map((s, idx) => {
        const palette = KANBAN_PALETTE[idx % KANBAN_PALETTE.length]
        return {
          id: s.label,
          label: `${s.icon || '📍'} ${s.label}`,
          color: palette.color,
          headerColor: palette.headerColor,
        }
      })
    : []

  const cancelledPlans = plans.filter(p => p.is_cancelled)
  const activePlans = plans.filter(p => !p.is_cancelled)

  const grouped = columns.reduce((acc, col) => {
    acc[col.id] = activePlans.filter(p => p.stato === col.id)
    return acc
  }, {})

  const knownStati = new Set(columns.map(c => c.id))
  const orphans = activePlans.filter(p => !knownStati.has(p.stato))
  if (orphans.length > 0) {
    columns.push({
      id: '__orphans__',
      label: '⚠️ Stato non riconosciuto',
      color: 'bg-red-50 border-red-300',
      headerColor: 'bg-red-200 text-red-800',
    })
    grouped['__orphans__'] = orphans
  }

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId) return
    if (destination.droppableId === '__orphans__') return
    await onStateChange(draggableId, destination.droppableId)
  }

  if (statiConfig.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <div className="text-6xl mb-3">⚙️</div>
        <h3 className="font-bold text-lg mb-2">Nessuno stato configurato</h3>
        <p className="text-sm text-gray-500 mb-4">
          Per usare la vista Kanban devi prima configurare gli <strong>Stati Action Plan</strong> nelle Settings.
        </p>
        <a href="/settings" className="inline-block bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light text-sm">
          → Vai in Settings → Action Plan → Stato
        </a>
      </div>
    )
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3" style={{ minHeight: '70vh' }}>
          {columns.map(col => (
            <div key={col.id} className={`flex-shrink-0 w-72 rounded-lg border-2 ${col.color} flex flex-col`}>
              <div className={`${col.headerColor} px-3 py-2 rounded-t-md font-semibold text-sm flex justify-between items-center`}>
                <span>{col.label}</span>
                <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded-full text-xs">{grouped[col.id].length}</span>
              </div>
              <Droppable droppableId={col.id} isDropDisabled={col.id === '__orphans__'}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`flex-1 p-2 space-y-2 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-white bg-opacity-50' : ''}`}
                    style={{ minHeight: '300px' }}>
                    {grouped[col.id].length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-center text-xs text-gray-400 py-8">Trascina qui</div>
                    )}
                    {grouped[col.id].map((plan, index) => (
                      <Draggable key={plan._id} draggableId={plan._id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            onClick={() => !snapshot.isDragging && onSelect(plan)}
                            className={`bg-white rounded-md p-3 shadow-sm border cursor-pointer hover:shadow-md transition-all ${snapshot.isDragging ? 'rotate-2 shadow-2xl ring-2 ring-primary' : ''}`}>
                            <KanbanCard plan={plan} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {cancelledPlans.length > 0 && (
        <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🚫</span>
            <h3 className="font-bold text-red-800">Action Plan annullati ({cancelledPlans.length})</h3>
            <span className="text-xs text-red-600">— Click su ♻️ per ripristinare</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {cancelledPlans.map(plan => (
              <div key={plan._id} onClick={() => onSelect(plan)}
                className="bg-white rounded-md p-3 shadow-sm border border-red-300 cursor-pointer hover:shadow-md transition-all opacity-75 hover:opacity-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs text-red-600 font-bold">{plan.numero}</span>
                  {onRestore && (
                    <button onClick={(e) => { e.stopPropagation(); onRestore(plan) }}
                      className="text-green-600 hover:bg-green-100 p-0.5 rounded text-xs" title="♻️ Ripristina">
                      ♻️
                    </button>
                  )}
                </div>
                <div className="font-medium text-sm mb-1 line-clamp-2">{plan.titolo}</div>
                {plan.cancelled_reason && (
                  <div className="text-xs text-red-700 italic mt-2 bg-red-100 px-2 py-1 rounded">
                    💬 {plan.cancelled_reason}
                  </div>
                )}
                {plan.cancelled_at && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    📅 {new Date(plan.cancelled_at).toLocaleDateString('it-IT')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function KanbanCard({ plan }) {
  const TipoIcon = TIPO_ICONS[plan.tipo] || CheckSquare
  const checklistCompletati = plan.checklist?.filter(c => c.completato).length || 0
  const checklistTotali = plan.checklist?.length || 0
  const isOverdue = plan.stato_visuale === 'In Ritardo'
  const isScadenza = plan.stato_visuale === 'In Scadenza'

  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-xs text-primary font-bold">{plan.numero}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITA_BG[plan.priorita] || ''}`}>
          {plan.priorita === 'Critical' && '🔥'}
          {plan.priorita === 'High' && '⬆️'}
          {plan.priorita === 'Medium' && '➖'}
          {plan.priorita === 'Low' && '⬇️'}
          {plan.priorita === 'Lowest' && '⏬'}
        </span>
      </div>
      <div className="font-medium text-sm mb-2 line-clamp-2">{plan.titolo}</div>
      <div className={`flex items-center gap-1 text-xs mb-2 ${TIPO_COLORS[plan.tipo] || ''}`}>
        <TipoIcon size={12} /><span>{plan.tipo}</span>
      </div>
      {plan.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {plan.tags.slice(0, 3).map(t => (
            <span key={t} className="text-xs bg-purple-50 text-purple-700 px-1.5 rounded">#{t}</span>
          ))}
          {plan.tags.length > 3 && <span className="text-xs text-gray-400">+{plan.tags.length - 3}</span>}
        </div>
      )}
      {checklistTotali > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
            <span>✓ {checklistCompletati}/{checklistTotali}</span>
            <span>{Math.round((checklistCompletati / checklistTotali) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-green-500 h-1 rounded-full" style={{ width: `${(checklistCompletati / checklistTotali) * 100}%` }} />
          </div>
        </div>
      )}
      <div className="flex justify-between items-center pt-2 border-t mt-2">
        <div className="flex items-center gap-1">
          {plan.responsabile ? <Avatar name={plan.responsabile} size={20} /> : <span className="text-xs text-gray-400">—</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {plan.commenti?.length > 0 && (
            <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {plan.commenti.length}</span>
          )}
          {plan.links?.length > 0 && (
            <span className="flex items-center gap-0.5"><Link2 size={10} /> {plan.links.length}</span>
          )}
          {plan.data_scadenza && (
            <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-red-600 font-bold' : isScadenza ? 'text-yellow-600' : ''}`}>
              <Calendar size={10} />
              {new Date(plan.data_scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </>
  )
}

function Modal({ title, children, onClose, wide = false, noPadding = false }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl ${wide ? 'max-w-6xl' : 'max-w-3xl'} w-full max-h-[95vh] overflow-hidden`}>
        {title && (
          <div className="bg-primary text-white px-6 py-3 flex justify-between items-center">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="hover:bg-primary-light p-1 rounded"><X size={20} /></button>
          </div>
        )}
        <div className={noPadding ? '' : 'p-6'}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-bold mb-2">{title}</h3>
      {children}
    </div>
  )
}

function SidebarRow({ label, children }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600 text-xs uppercase">{label}</span>
      <div>{children}</div>
    </div>
  )
}

function renderWithMentionsTags(text) {
  if (!text) return null
  const parts = text.split(/(@[a-zA-Z0-9._-]+|#[a-zA-Z0-9_-]+)/g)
  return parts.map((p, i) => {
    if (p.startsWith('@')) return <span key={i} className="text-blue-600 font-medium">{p}</span>
    if (p.startsWith('#')) return <span key={i} className="text-purple-600 font-medium">{p}</span>
    return p
  })
}
      
