import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Plus, Search, Filter, X, ChevronDown
} from 'lucide-react'
import api from '../services/api'
import { useAllConfigurations } from '../hooks/useConfigurations'
import ActionPlanFormShared from '../components/ActionPlanFormShared'
import ActionPlanDetailPanel from '../components/ActionPlanDetailPanel'
import ActionPlanViews from '../components/ActionPlanViews'

export default function ActionPlanPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [calendarDays, setCalendarDays] = useState(30)  // giorni "prossime settimane"
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

  useEffect(() => {
    loadData()
  }, [filters])

  useEffect(() => {
    const actionPlanId = searchParams.get('open')

    if (!actionPlanId) return

    const loadSelectedActionPlan = async () => {
      try {
        const response = await api.get(`/action-plans/${actionPlanId}`)
        setSelectedPlan(response.data)
      } catch (error) {
        console.error('Errore apertura Action Plan da notifica:', error)

        alert(
          'Impossibile aprire l’Action Plan: ' +
          (error.response?.data?.detail || error.message)
        )

        setSearchParams({}, { replace: true })
      }
    }

    loadSelectedActionPlan()
  }, [searchParams, setSearchParams])

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
          <button onClick={() => { setEditingPlan(null); setShowForm(true) }}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light shadow-sm">
            <Plus size={20} /> Nuovo Action Plan
          </button>
        </div>
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
              <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block"> Vista</label>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={!filters.only_cancelled && !filters.include_cancelled && !filters.overdue}
                  onClick={() => setFilters({ ...filters, only_cancelled: false, include_cancelled: false, overdue: false })}
                  label="Attivi"
                />
                <FilterChip
                  active={filters.overdue}
                  onClick={() => setFilters({ ...filters, overdue: !filters.overdue, only_cancelled: false })}
                  label="Scaduti"
                />
                <FilterChip
                  active={filters.include_cancelled && !filters.only_cancelled}
                  onClick={() => setFilters({ ...filters, include_cancelled: true, only_cancelled: false })}
                  label="Mostra anche annullati"
                />
                <FilterChip
                  active={filters.only_cancelled}
                  onClick={() => setFilters({ ...filters, only_cancelled: true, include_cancelled: false })}
                  label="Solo annullati"
                  variant="danger"
                />
              </div>
            </div>

            {/* Riga 2: Classificazione */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">🏷️ Classificazione</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={filters.stato} onChange={(e) => setFilters({ ...filters, stato: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Tutti gli stati</option>
                  {statiConfig.map(s => <option key={s._id} value={s.label}>{s.icon ? `${s.icon} ` : ''}{s.label}</option>)}
                </select>
                <select value={filters.tipo} onChange={(e) => setFilters({ ...filters, tipo: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Tutti i tipi</option>
                  {tipiConfig.map(t => <option key={t._id} value={t.label}>{t.icon ? `${t.icon} ` : ''}{t.label}</option>)}
                </select>
                <select value={filters.priorita} onChange={(e) => setFilters({ ...filters, priorita: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Tutte le priorità</option>
                  {prioritaConfig.map(p => <option key={p._id} value={p.label}>{p.icon ? `${p.icon} ` : ''}{p.label}</option>)}
                </select>
                <select value={filters.categoria_perdita} onChange={(e) => setFilters({ ...filters, categoria_perdita: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Tutte categorie perdita</option>
                  {(configs.categorie_perdita || []).map(c => <option key={c._id} value={c.label}>{c.icon ? `${c.icon} ` : ''}{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Riga 3: Struttura aziendale */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">🏭 Struttura aziendale</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={filters.reparto} onChange={(e) => setFilters({ ...filters, reparto: e.target.value, linea: '', macchina: '' })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Tutti i reparti</option>
                  {reparti.filter(r => r.attivo !== false).map(r => <option key={r._id} value={r.nome}>{r.nome}{r.codice ? ` [${r.codice}]` : ''}</option>)}
                </select>
                <select value={filters.linea} onChange={(e) => setFilters({ ...filters, linea: e.target.value, macchina: '' })} disabled={!filters.reparto} className="border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">{filters.reparto ? '🔹 Tutte le linee' : '— prima il reparto —'}</option>
                  {lineeFiltrate.filter(l => l.attivo !== false).map(l => <option key={l.id} value={l.nome}>{l.nome}{l.codice ? ` [${l.codice}]` : ''}</option>)}
                </select>
                <select value={filters.macchina} onChange={(e) => setFilters({ ...filters, macchina: e.target.value })} disabled={!filters.linea} className="border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">{filters.linea ? 'Tutte le macchine' : '— prima la linea —'}</option>
                  {macchineFiltrate.filter(m => m.attivo !== false).map(m => <option key={m.id} value={m.nome}>{m.nome}{m.codice ? ` [${m.codice}]` : ''}</option>)}
                </select>
                <select value={filters.quinta_m} onChange={(e) => setFilters({ ...filters, quinta_m: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Tutte le 5M</option>
                  <option value="Machine">Machine</option>
                  <option value="Manodopera">Manodopera</option>
                  <option value="Metodo">Metodo</option>
                  <option value="Materiale">Materiale</option>
                  <option value="Misurazione">Misurazione</option>
                </select>
              </div>
            </div>

            {/* Riga 4: Contesto */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">🔗 Contesto</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select value={filters.pillar_id} onChange={(e) => setFilters({ ...filters, pillar_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Tutti i pillars</option>
                  {pillars.filter(p => p.attivo !== false).map(p => (
                    <option key={p._id} value={p._id}>{p.icon ? `${p.icon} ` : ''}{p.sigla} — {p.label}</option>
                  ))}
                </select>
                <select value={filters.dashboard_id} onChange={(e) => setFilters({ ...filters, dashboard_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Tutte le dashboard</option>
                  {dashboards.map(d => (
                    <option key={d._id} value={d._id}>{d.icon ? `${d.icon} ` : '📊 '}{d.nome || d.label || d.titolo || 'Dashboard'}</option>
                  ))}
                </select>
                <input type="text" list="responsabili-list" placeholder="Responsabile" value={filters.responsabile}
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
      ) : (
        <ActionPlanViews
          plans={plans}
          statiConfig={statiConfig}
          onSelectAP={setSelectedPlan}
          onEditAP={(p) => { setEditingPlan(p); setShowForm(true) }}
          onDeleteAP={(p) => handleDelete(p._id)}
          onChangeStato={(ap, nuovoStato) => quickStateChange(ap._id, nuovoStato)}
          showCollegato={true}
          showKanban={true}
          showCalendar={true}
          defaultView={viewMode}
          emptyMessage="Nessun Action Plan trovato"
          emptyAction={{ label: 'Creane uno nuovo →', onClick: () => setShowForm(true) }}
        />
      )}

      {showForm && (
        <ActionPlanFormShared
          plan={editingPlan}
          onClose={() => { setShowForm(false); setEditingPlan(null) }}
          onSaved={(saved) => { setShowForm(false); setEditingPlan(null); loadData(); if (saved) setSelectedPlan(saved) }}
        />
      )}
      {selectedPlan && (
        <ActionPlanDetailPanel
  plan={selectedPlan}
  onClose={() => {
    setSelectedPlan(null)

    if (searchParams.get('open')) {
      setSearchParams({}, { replace: true })
    }
  }}
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
      
