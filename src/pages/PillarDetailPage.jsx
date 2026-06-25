import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, User, Calendar, Users, Edit2, Plus, Trash2, ClipboardList, Link2, AlertCircle, CheckSquare, Bug, TrendingUp, Shield, Wrench } from 'lucide-react'
import ActionPlanFormShared from '../components/ActionPlanFormShared'
import ActionPlanDetailPanel from '../components/ActionPlanDetailPanel'
import PresenzeWidget from '../components/widgets/PresenzeWidget'

export default function PillarDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pillar, setPillar] = useState(null)
  const [stats, setStats] = useState(null)
  const [kaizens, setKaizens] = useState([])
  const [actionPlans, setActionPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('anagrafica')

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    setLoading(true)
    try {
      const [pillarRes, statsRes, kaizensRes, apsRes] = await Promise.all([
        api.get(`/pillars/${id}`),
        api.get(`/pillars/${id}/stats`),
        api.get(`/pillars/${id}/kaizens`),
        api.get(`/action-plans/?pillar_id=${id}`),
      ])
      setPillar(pillarRes.data)
      setStats(statsRes.data)
      setKaizens(kaizensRes.data || [])
      setActionPlans(apsRes.data || [])
    } catch (err) {
      console.error(err)
      alert('Errore caricamento pillar')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">Caricamento pillar...</div>
  if (!pillar) {
    return (
      <div className="bg-white rounded-xl shadow p-12 text-center">
        <h3 className="font-semibold mb-2">Pillar non trovato</h3>
        <button onClick={() => navigate('/pillars')} className="text-primary hover:underline">← Torna ai Pillars</button>
      </div>
    )
  }

  const color = pillar.color || '#6366f1'
  const stepsCompleted = stats?.steps_completed || 0
  const stepsTotal = stats?.steps_total || 5

  const tabs = [
    { id: 'anagrafica', label: 'Anagrafica' },
    { id: 'kpi', label: `5 Step KPI (${stepsCompleted}/${stepsTotal})` },
    { id: 'masterplan', label: 'Master Plan' },
    { id: 'kaizen', label: `Kaizen (${kaizens.length})` },
    { id: 'action_plan', label: `Action Plan (${actionPlans.length})` },
    { id: 'maturity', label: 'Maturity Grid' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/pillars')} className="flex items-center gap-1 hover:text-primary">
          <ArrowLeft size={16} /> Pillars
        </button>
        <span>/</span>
        <span className="font-medium text-gray-700">{pillar.sigla}</span>
      </div>

      <div className="rounded-xl shadow overflow-hidden" style={{ borderTop: `6px solid ${color}` }}>
        <div className="px-6 py-5" style={{ backgroundColor: `${color}15` }}>
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-20 h-20 rounded-xl flex items-center justify-center text-5xl flex-shrink-0 shadow-md" style={{ backgroundColor: color, color: 'white' }}>
                {pillar.icon || pillar.sigla?.charAt(0) || 'P'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono font-black text-3xl" style={{ color }}>{pillar.sigla}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pillar.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {pillar.attivo ? 'Attivo' : 'Disattivo'}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-gray-800 mb-2">{pillar.label}</h1>
                {pillar.descrizione && <p className="text-sm text-gray-600 mb-3">{pillar.descrizione}</p>}
                <div className="flex flex-wrap gap-4 text-sm">
                  {pillar.leader && (
                    <div className="flex items-center gap-1 text-gray-700">
                      <User size={14} className="text-gray-400" /><strong>{pillar.leader}</strong>
                    </div>
                  )}
                  {pillar.anno && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar size={14} /> Anno {pillar.anno}
                    </div>
                  )}
                  {pillar.members?.length > 0 && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users size={14} /> Team: {pillar.members.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => navigate('/settings')} className="px-3 py-1.5 bg-white border-2 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1 flex-shrink-0" style={{ borderColor: color, color }}>
              <Edit2 size={14} /> Modifica
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-4 bg-white border-t">
            <StatBlock label="Kaizen Totali" value={stats.totale_kaizen} color="indigo" />
            <StatBlock label="Quick" value={stats.quick} color="green" />
            <StatBlock label="Standard" value={stats.standard} color="blue" />
            <StatBlock label="Major" value={stats.major} color="purple" />
            <StatBlock label="5 Step Progress" value={`${stepsCompleted}/${stepsTotal}`} color="orange" />
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-b-2 text-primary' : 'text-gray-500 hover:text-gray-700'}`} style={activeTab === tab.id ? { borderColor: color, color } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'anagrafica' && <AnagraficaTab pillar={pillar} />}
      {activeTab === 'kpi' && <KpiManagementTab pillar={pillar} color={color} onSaved={loadAll} />}
      {activeTab === 'masterplan' && <MasterPlanTab pillar={pillar} color={color} onSaved={loadAll} />}
      {activeTab === 'kaizen' && <KaizenList kaizens={kaizens} pillar={pillar} />}
      {activeTab === 'action_plan' && <ActionPlanTab actionPlans={actionPlans} pillar={pillar} color={color} onReload={loadAll} />}
      {activeTab === 'maturity' && <MaturityPlaceholder color={color} />}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// TAB ACTION PLAN — Nuovo layout stile Action Plan Management
// ──────────────────────────────────────────────────────────
const STATO_COLORS_AP = {
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

function AvatarAP({ name }) {
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

function ActionPlanTab({ actionPlans, pillar, color, onReload }) {
  const [showForm, setShowForm] = useState(false)
  const [editingAP, setEditingAP] = useState(null)
  const [filterStato, setFilterStato] = useState('')
  const [selectedAP, setSelectedAP] = useState(null)  // 🆕 pannello dettaglio

  const prefilledPillar = {
    parent_type: 'pillar',
    parent_id: pillar._id,
    parent_label: pillar.sigla,
    pillar_id: pillar._id,
  }

  function handleSaved() {
    setShowForm(false)
    setEditingAP(null)
    onReload()
  }

  async function changeStato(apId, nuovoStato) {
    try {
      await api.patch(`/action-plans/${apId}/stato`, { stato: nuovoStato })
      onReload()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function unlinkAP(apId, apNumero) {
    if (!confirm(`Scollegare ${apNumero} dal Pillar ${pillar.sigla}?\nL'AP rimane nel sistema ma non sarà più collegato a questo Pillar.`)) return
    try {
      await api.put(`/action-plans/${apId}`, {
        parent_type: 'standalone',
        parent_id: null,
        parent_label: null,
        pillar_id: null,
      })
      onReload()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function deleteAP(apId, apNumero) {
    if (!confirm(`ELIMINA ${apNumero}?\n\nQuesto rimuove l'Action Plan in modo permanente. Conferma solo se sei sicuro.`)) return
    try {
      await api.delete(`/action-plans/${apId}`)
      onReload()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function cancelAP(plan) {
    const reason = prompt(
      `Annullare l'Action Plan "${plan.numero} - ${plan.titolo}"?\n\nInserisci il motivo (obbligatorio):`
    )
    if (!reason || !reason.trim()) return
    try {
      await api.post(`/action-plans/${plan._id}/cancel`, {
        reason: reason.trim(),
        user: 'Default User',
      })
      onReload()
    } catch (err) {
      alert('Errore annullamento: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function restoreAP(plan) {
    if (!confirm(`Ripristinare l'Action Plan "${plan.numero}"?\n\nTornerà tra gli attivi.`)) return
    try {
      await api.post(`/action-plans/${plan._id}/restore`)
      onReload()
    } catch (err) {
      alert('Errore ripristino: ' + (err.response?.data?.detail || err.message))
    }
  }

  const counts = {
    totale: actionPlans.length,
    da_valutare: actionPlans.filter(a => a.stato === 'Da Valutare').length,
    in_corso: actionPlans.filter(a => a.stato === 'In Corso').length,
    done: actionPlans.filter(a => a.stato === 'Done').length,
    overdue: actionPlans.filter(a => a.stato_visuale === 'In Ritardo').length,
  }

  const actionPlansFiltrati = actionPlans.filter(ap => {
    if (filterStato && ap.stato !== filterStato) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ClipboardList size={20} style={{ color }} />
              Action Plan collegati a {pillar.sigla}
            </h3>
            <div className="flex gap-4 text-xs text-gray-500 mt-1">
              <span>Totale: <strong className="text-gray-700">{counts.totale}</strong></span>
              <span>Da valutare: <strong className="text-gray-700">{counts.da_valutare}</strong></span>
              <span>In corso: <strong className="text-blue-600">{counts.in_corso}</strong></span>
              <span>Done: <strong className="text-green-600">{counts.done}</strong></span>
              {counts.overdue > 0 && (
                <span>Scaduti: <strong className="text-red-600">{counts.overdue}</strong></span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setEditingAP(null); setShowForm(true) }}
            className="text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
            style={{ backgroundColor: color }}
          >
            <Plus size={16} /> Nuovo Action Plan
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-2 pt-3 border-t">
          <span className="text-xs font-medium text-gray-600">Filtri:</span>
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
          {filterStato && (
            <button
              onClick={() => setFilterStato('')}
              className="text-xs px-2 py-1 border rounded text-gray-600 hover:bg-gray-100"
            >
              Reset
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">
            {actionPlansFiltrati.length} azion{actionPlansFiltrati.length === 1 ? 'e' : 'i'} visualizzate
          </span>
        </div>
      </div>

      {actionPlansFiltrati.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <ClipboardList className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-400 mb-3">
            {actionPlans.length === 0
              ? 'Nessun Action Plan collegato a questo pillar'
              : 'Nessun risultato per i filtri impostati'}
          </p>
          {actionPlans.length === 0 && (
            <>
              <p className="text-xs text-gray-400 mb-4">
                Crea un AP qui per averlo automaticamente collegato a <strong>{pillar.sigla}</strong>
              </p>
              <button
                onClick={() => { setEditingAP(null); setShowForm(true) }}
                className="text-primary hover:underline text-sm"
              >
                + Crea il primo Action Plan
              </button>
            </>
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
                <th className="px-3 py-2 text-center w-32">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {actionPlansFiltrati.map(ap => {
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
                      <AvatarAP name={ap.responsabile} />
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ap.stato || 'Aperto'}
                        onChange={(e) => changeStato(ap._id, e.target.value)}
                        className={`text-xs px-1.5 py-1 rounded border font-medium ${STATO_COLORS_AP[ap.stato] || 'bg-gray-100 text-gray-700'}`}
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
                          title="Scollega dal Pillar"
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

      {showForm && (
        <ActionPlanFormShared
          plan={editingAP}
          prefilledKaizen={null}
          prefilledParent={editingAP ? null : prefilledPillar}
          onClose={() => { setShowForm(false); setEditingAP(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* Pannello dettaglio AP (cliccando una riga) */}
      {selectedAP && (
        <ActionPlanDetailPanel
          plan={selectedAP}
          onClose={() => setSelectedAP(null)}
          onUpdated={onReload}
          onEdit={(p) => { setSelectedAP(null); setEditingAP(p); setShowForm(true) }}
          onCancel={async (p) => { await cancelAP(p); setSelectedAP(null) }}
          onRestore={async (p) => { await restoreAP(p); setSelectedAP(null) }}
          onDelete={async (apId) => { await deleteAP(apId, selectedAP.numero); setSelectedAP(null) }}
        />
      )}
    </div>
  )
}

function StatBlock({ label, value, color = 'gray' }) {
  const colors = { gray: 'text-gray-700', indigo: 'text-indigo-700', green: 'text-emerald-700', blue: 'text-blue-700', purple: 'text-purple-700', orange: 'text-orange-700' }
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${colors[color]}`}>{value ?? '—'}</div>
      <div className="text-xs text-gray-500 uppercase">{label}</div>
    </div>
  )
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-gray-500 text-xs uppercase">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function AnagraficaTab({ pillar }) {
  const [savingPresenze, setSavingPresenze] = useState(false)

  async function handlePresenzeChange(newConfig) {
    setSavingPresenze(true)
    try {
      await api.put(`/pillars/${pillar._id}`, {
        presenze_config: newConfig,
      })
    } catch (err) {
      console.error('Errore salvataggio presenze:', err)
      alert('Errore salvataggio: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSavingPresenze(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Riga 1: Info + Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-4">Informazioni Pillar</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Sigla" value={pillar.sigla} mono />
            <InfoRow label="Nome completo" value={pillar.label} />
            <InfoRow label="Anno di riferimento" value={pillar.anno || '—'} />
            <InfoRow label="Codice colore" value={pillar.color || '—'} mono />
            <InfoRow label="Stato" value={pillar.attivo ? 'Attivo' : 'Disattivo'} />
            {pillar.descrizione && (
              <div>
                <div className="text-gray-500 text-xs uppercase mb-1">Descrizione</div>
                <div className="bg-gray-50 p-3 rounded text-sm">{pillar.descrizione}</div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-4">Team del Pillar</h3>
          <div className="space-y-3">
            {pillar.leader && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                <div className="text-xs text-yellow-700 font-bold uppercase mb-1">Pillar Leader</div>
                <div className="font-semibold text-gray-800">{pillar.leader}</div>
              </div>
            )}
            {pillar.members?.length > 0 ? (
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-2">Membri del Team ({pillar.members.length})</div>
                <div className="space-y-1">
                  {pillar.members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                      <User size={14} className="text-gray-400" />{m}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic text-center py-4">Nessun membro nel team</div>
            )}
          </div>
        </div>
      </div>

      {/* Note (se presente, full width) */}
      {pillar.note && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-3">Note</h3>
          <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap">{pillar.note}</div>
        </div>
      )}

      {/* Calendario Presenze (full width) */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">Calendario Presenze riunioni Pillar</h3>
          {savingPresenze && <span className="text-xs text-blue-600">Salvataggio...</span>}
        </div>
        <div style={{ minHeight: '300px' }}>
          <PresenzeWidget
            config={pillar.presenze_config || {}}
            editMode={true}
            onChange={handlePresenzeChange}
          />
        </div>
      </div>
    </div>
  )
}
    setSavingPresenze(true)
    try {
      await api.put(`/pillars/${pillar._id}`, {
        presenze_config: newConfig,
      })
    } catch (err) {
      console.error('Errore salvataggio presenze:', err)
      alert('Errore salvataggio: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSavingPresenze(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Riga 1: Info + Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-4">Informazioni Pillar</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Sigla" value={pillar.sigla} mono />
            <InfoRow label="Nome completo" value={pillar.label} />
            <InfoRow label="Anno di riferimento" value={pillar.anno || '—'} />
            <InfoRow label="Codice colore" value={pillar.color || '—'} mono />
            <InfoRow label="Stato" value={pillar.attivo ? 'Attivo' : 'Disattivo'} />
            {pillar.descrizione && (
              <div>
                <div className="text-gray-500 text-xs uppercase mb-1">Descrizione</div>
                <div className="bg-gray-50 p-3 rounded text-sm">{pillar.descrizione}</div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-4">Team del Pillar</h3>
          <div className="space-y-3">
            {pillar.leader && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                <div className="text-xs text-yellow-700 font-bold uppercase mb-1">Pillar Leader</div>
                <div className="font-semibold text-gray-800">{pillar.leader}</div>
              </div>
            )}
            {pillar.members?.length > 0 ? (
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-2">Membri del Team ({pillar.members.length})</div>
                <div className="space-y-1">
                  {pillar.members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                      <User size={14} className="text-gray-400" />{m}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic text-center py-4">Nessun membro nel team</div>
            )}
          </div>

      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-lg mb-4">Team del Pillar</h3>
        <div className="space-y-3">
          {pillar.leader && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
              <div className="text-xs text-yellow-700 font-bold uppercase mb-1">Pillar Leader</div>
              <div className="font-semibold text-gray-800">{pillar.leader}</div>
            </div>
          )}
          {pillar.members?.length > 0 ? (
            <div>
              <div className="text-xs text-gray-500 uppercase font-medium mb-2">Membri del Team ({pillar.members.length})</div>
              <div className="space-y-1">
                {pillar.members.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <User size={14} className="text-gray-400" />{m}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic text-center py-4">Nessun membro nel team</div>
          )}
        </div>
      </div>
      {pillar.note && (
        <div className="bg-white rounded-xl shadow p-6 md:col-span-2">
          <h3 className="font-bold text-lg mb-3">Note</h3>
          <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap">{pillar.note}</div>
        </div>
      )}
    </div>
  )
}

const KPI_STEPS = [
  { id: 'step1_kpi_definition', num: 1, title: 'KPI / KMI Definition', desc: 'Definisci il KPI principale del Pillar' },
  { id: 'step2_pareto_analysis', num: 2, title: 'Pareto Analysis & Loss Identification', desc: 'Identifica e prioritizza le perdite' },
  { id: 'step3_target_definition', num: 3, title: 'Project Planning & Assignment', desc: 'Pianifica progetti per chiudere il gap' },
  { id: 'step4_implementation', num: 4, title: 'Project Implementation', desc: 'Esegui e monitora i progetti' },
  { id: 'step5_close_the_loop', num: 5, title: 'Gap Analysis & Close the Loop', desc: 'Bridge chart target vs actual' },
]

const PROGETTO_STATUS = [
  { value: 'planned', label: 'Planned', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 border-yellow-400' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700 border-green-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-300' },
]

const ACTUAL_STATUS = [
  { value: 'not_started', label: 'Not started', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 border-yellow-400' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700 border-green-400' },
  { value: 'blocked', label: 'Blocked', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-300' },
]
function KpiManagementTab({ pillar, color, onSaved }) {
  const [stepsData, setStepsData] = useState(() => {
    const initial = {}
    KPI_STEPS.forEach(s => { initial[s.id] = pillar[s.id] || { completato: false, note: '' } })
    return initial
  })
  const [expandedStep, setExpandedStep] = useState(KPI_STEPS[0].id)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const dataRef = useRef(stepsData)

  useEffect(() => { dataRef.current = stepsData }, [stepsData])

  async function doSave(silent = false) {
    if (!silent) setSaving(true)
    try {
      await api.put(`/pillars/${pillar._id}`, dataRef.current)
      if (!silent) { setLastSaved(new Date()); setHasUnsavedChanges(false) }
    } catch (err) {
      console.error(err)
      if (!silent) alert('Errore salvataggio: ' + (err.response?.data?.detail || err.message))
    } finally {
      if (!silent) setSaving(false)
    }
  }

  useEffect(() => {
    const original = {}
    KPI_STEPS.forEach(s => { original[s.id] = pillar[s.id] || { completato: false, note: '' } })
    if (JSON.stringify(stepsData) === JSON.stringify(original)) return
    setHasUnsavedChanges(true)
    const timer = setTimeout(() => doSave(false), 600)
    return () => clearTimeout(timer)
  }, [stepsData])

  function updateStep(stepId, updates) {
    setStepsData(prev => {
      const newData = { ...prev }
      newData[stepId] = { ...prev[stepId], ...updates }
      return newData
    })
  }

  const completedCount = Object.values(stepsData).filter(s => s.completato).length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">5 Step KPI Management</h3>
            <p className="text-sm text-gray-500">Metodologia ufficiale Lindt FI Pillar per il <strong>{pillar.sigla}</strong></p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color }}>{completedCount}/5</div>
            <div className="text-xs text-gray-500 uppercase">Step Completati</div>
            <div className="text-xs mt-1">
              {saving ? <span className="text-blue-600">Salvataggio...</span> :
               hasUnsavedChanges ? <span className="text-orange-600">Non salvato</span> :
               lastSaved ? <span className="text-green-600">Salvato {lastSaved.toLocaleTimeString('it-IT')}</span> :
               <span className="text-gray-400">Pronto</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {KPI_STEPS.map((step, idx) => {
            const isCompleted = stepsData[step.id]?.completato
            const isExpanded = expandedStep === step.id
            return (
              <div key={step.id} className="flex-1 flex items-center">
                <button onClick={() => setExpandedStep(isExpanded ? null : step.id)} className={`flex flex-col items-center flex-shrink-0 transition-all ${isExpanded ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow ${isCompleted ? 'text-white' : 'bg-white border-2 text-gray-400'}`} style={isCompleted ? { backgroundColor: color } : { borderColor: color }}>
                    {isCompleted ? '✓' : step.num}
                  </div>
                  <div className={`text-xs mt-1 font-medium ${isExpanded ? '' : 'text-gray-500'}`} style={isExpanded ? { color } : {}}>Step {step.num}</div>
                </button>
                {idx < KPI_STEPS.length - 1 && <div className="flex-1 h-1 mx-1 rounded" style={{ backgroundColor: isCompleted ? color : '#e5e7eb' }} />}
              </div>
            )
          })}
        </div>
      </div>

      {KPI_STEPS.map(step => {
        const data = stepsData[step.id]
        const isExpanded = expandedStep === step.id
        const isCompleted = data?.completato
        return (
          <div key={step.id} className="bg-white rounded-xl shadow overflow-hidden transition-all" style={{ borderLeft: `4px solid ${isCompleted ? color : '#e5e7eb'}` }}>
            <button onClick={() => setExpandedStep(isExpanded ? null : step.id)} className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0 ${isCompleted ? 'text-white' : 'bg-gray-100 text-gray-500'}`} style={isCompleted ? { backgroundColor: color } : {}}>
                {isCompleted ? '✓' : step.num}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold flex items-center gap-2">
                  STEP {step.num} — {step.title}
                  {isCompleted && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Completato</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{step.desc}</div>
              </div>
              <div className="text-gray-400">{isExpanded ? '▲' : '▼'}</div>
            </button>
            {isExpanded && (
              <div className="px-5 pb-5 pt-2 border-t bg-gray-50">
                <StepContent step={step} data={data} color={color} onUpdate={(updates) => updateStep(step.id, updates)} allStepsData={stepsData} />
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 uppercase mb-1">Note dello step</label>
                    <textarea value={data.note || ''} onChange={(e) => updateStep(step.id, { note: e.target.value })} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:bg-gray-50" style={{ borderColor: isCompleted ? color : '#e5e7eb' }}>
                    <input type="checkbox" checked={isCompleted} onChange={(e) => updateStep(step.id, { completato: e.target.checked })} className="w-5 h-5" style={{ accentColor: color }} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{isCompleted ? 'Step Completato' : 'Marca come completato'}</div>
                      <div className="text-xs text-gray-500">{isCompleted ? 'Lo step è considerato concluso.' : 'Spunta quando hai finito le attività di questo step.'}</div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StepContent({ step, data, color, onUpdate, allStepsData }) {
  if (step.id === 'step1_kpi_definition') return <Step1Content data={data} color={color} onUpdate={onUpdate} />
  if (step.id === 'step2_pareto_analysis') return <Step2Content data={data} color={color} onUpdate={onUpdate} />
  if (step.id === 'step3_target_definition') return <Step3Content data={data} color={color} onUpdate={onUpdate} lossesStep2={allStepsData?.step2_pareto_analysis?.losses || []} />
  if (step.id === 'step4_implementation') return <Step4Content data={data} color={color} onUpdate={onUpdate} allStepsData={allStepsData} />
  if (step.id === 'step5_close_the_loop') return <Step5Content data={data} color={color} onUpdate={onUpdate} allStepsData={allStepsData} />
  return null
}

function Step1Content({ data, color, onUpdate }) {
  const kpiPrincipale = data.kpi_principale || { label: '', baseline: '', target: '', unit: '%', owner: '', descrizione: '' }
  const kmis = data.kmis || []
  function updateKpiPrincipale(field, value) {
    const newKpi = { ...kpiPrincipale }
    newKpi[field] = value
    onUpdate({ kpi_principale: newKpi })
  }
  function addKmi() { onUpdate({ kmis: [...kmis, { id: Date.now().toString(), label: '', baseline: '', target: '', unit: '%', owner: '' }] }) }
  function updateKmi(id, updates) { onUpdate({ kmis: kmis.map(k => k.id === id ? { ...k, ...updates } : k) }) }
  function removeKmi(id) { onUpdate({ kmis: kmis.filter(k => k.id !== id) }) }

  return (
    <div className="space-y-4 mt-3">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">
        <strong>Cosa fare:</strong> Definisci il KPI principale (es. OEE, MTBF) con baseline e target. I KMI sono indicatori secondari opzionali di supporto.
      </div>
      <div className="bg-white p-4 rounded-lg border-2" style={{ borderColor: color }}>
        <h4 className="font-bold text-sm uppercase mb-3" style={{ color }}>KPI Principale (obbligatorio)</h4>
        <div className="grid grid-cols-12 gap-2 mb-2">
          <div className="col-span-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome KPI <span className="text-red-500">*</span></label>
            <input className="w-full border rounded px-3 py-2 text-sm font-bold" value={kpiPrincipale.label} onChange={(e) => updateKpiPrincipale('label', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Baseline</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={kpiPrincipale.baseline} onChange={(e) => updateKpiPrincipale('baseline', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Target</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={kpiPrincipale.target} onChange={(e) => updateKpiPrincipale('target', e.target.value)} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Unità</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={kpiPrincipale.unit} onChange={(e) => updateKpiPrincipale('unit', e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Owner</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={kpiPrincipale.owner} onChange={(e) => updateKpiPrincipale('owner', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descrizione (opzionale)</label>
          <input className="w-full border rounded px-3 py-2 text-sm" value={kpiPrincipale.descrizione} onChange={(e) => updateKpiPrincipale('descrizione', e.target.value)} />
        </div>
        {kpiPrincipale.baseline && kpiPrincipale.target && (
          <div className="mt-3 pt-3 border-t flex items-center gap-3 text-sm">
            <span className="text-gray-500">Gap da chiudere:</span>
            <span className="font-mono text-lg font-bold" style={{ color }}>
              {kpiPrincipale.baseline} → {kpiPrincipale.target} {kpiPrincipale.unit}
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
              Δ {(parseFloat(kpiPrincipale.target) - parseFloat(kpiPrincipale.baseline)).toFixed(1)} {kpiPrincipale.unit}
            </span>
          </div>
        )}
      </div>
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-bold text-sm uppercase text-gray-700">KMI — Key Management Indicators</h4>
            <p className="text-xs text-gray-500">Indicatori secondari opzionali di supporto al KPI principale</p>
          </div>
          <button onClick={addKmi} className="text-xs px-3 py-1 text-white rounded shadow" style={{ backgroundColor: color }}>+ Aggiungi KMI</button>
        </div>
        {kmis.length === 0 ? (
          <div className="text-center text-xs text-gray-400 italic py-3">Nessun KMI definito. Sono opzionali — aggiungi solo se servono.</div>
        ) : (
          <div className="space-y-2">
            {kmis.map((kmi, idx) => (
              <div key={kmi.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-1 text-center text-xs font-bold text-gray-400">#{idx + 1}</div>
                <input className="col-span-4 border rounded px-2 py-1 text-sm" value={kmi.label} onChange={(e) => updateKmi(kmi.id, { label: e.target.value })} />
                <input className="col-span-2 border rounded px-2 py-1 text-sm" value={kmi.baseline} onChange={(e) => updateKmi(kmi.id, { baseline: e.target.value })} placeholder="Baseline" />
                <input className="col-span-2 border rounded px-2 py-1 text-sm" value={kmi.target} onChange={(e) => updateKmi(kmi.id, { target: e.target.value })} placeholder="Target" />
                <input className="col-span-2 border rounded px-2 py-1 text-sm" value={kmi.owner} onChange={(e) => updateKmi(kmi.id, { owner: e.target.value })} placeholder="Owner" />
                <button onClick={() => removeKmi(kmi.id)} className="col-span-1 text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Step2Content({ data, color, onUpdate }) {
  const losses = data.losses || []
  function addLoss() { onUpdate({ losses: [...losses, { id: Date.now().toString(), label: '', percent_impact: '', magnitude: 'medio' }] }) }
  function updateLoss(id, updates) { onUpdate({ losses: losses.map(l => l.id === id ? { ...l, ...updates } : l) }) }
  function removeLoss(id) { onUpdate({ losses: losses.filter(l => l.id !== id) }) }
  const sortedLosses = [...losses].sort((a, b) => (parseFloat(b.percent_impact) || 0) - (parseFloat(a.percent_impact) || 0))

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">
        <strong>Cosa fare:</strong> Elenca le perdite che impattano il KPI con la loro % di impatto. Le perdite più alte sono il "vital few" su cui focalizzarti.
      </div>
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-sm uppercase text-gray-700">Top Losses</h4>
        <button onClick={addLoss} className="text-xs px-3 py-1 text-white rounded shadow" style={{ backgroundColor: color }}>+ Aggiungi Loss</button>
      </div>
      {sortedLosses.length === 0 ? (
        <div className="bg-white p-6 rounded-lg text-center text-sm text-gray-400 italic">Nessuna perdita identificata.</div>
      ) : (
        <div className="space-y-2">
          {sortedLosses.map((loss, idx) => (
            <div key={loss.id} className="bg-white p-3 rounded-lg border">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-1 text-center font-bold text-gray-400">#{idx + 1}</div>
                <input className="col-span-5 border rounded px-2 py-1 text-sm font-medium" value={loss.label} onChange={(e) => updateLoss(loss.id, { label: e.target.value })} />
                <input type="number" className="col-span-2 border rounded px-2 py-1 text-sm" value={loss.percent_impact} onChange={(e) => updateLoss(loss.id, { percent_impact: e.target.value })} placeholder="%" />
                <select className="col-span-3 border rounded px-2 py-1 text-sm" value={loss.magnitude} onChange={(e) => updateLoss(loss.id, { magnitude: e.target.value })}>
                  <option value="alto">Alto</option>
                  <option value="medio">Medio</option>
                  <option value="basso">Basso</option>
                </select>
                <button onClick={() => removeLoss(loss.id)} className="col-span-1 text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
              </div>
              {loss.percent_impact && (
                <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full" style={{ width: `${Math.min(100, parseFloat(loss.percent_impact) || 0)}%`, backgroundColor: color }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Step3Content({ data, color, onUpdate, lossesStep2 = [] }) {
  const progetti = data.progetti || []

  function addProject() {
    onUpdate({
      progetti: [...progetti, {
        id: Date.now().toString(),
        origine: 'step3', label: '', loss_target_id: '', loss_target_label: '',
        kaizen_numero: '', saving_planned: '', owner: '', deadline: '', status: 'planned',
      }]
    })
  }
  function updateProject(id, updates) { onUpdate({ progetti: progetti.map(p => p.id === id ? { ...p, ...updates } : p) }) }
  function removeProject(id) { onUpdate({ progetti: progetti.filter(p => p.id !== id) }) }
  function handleLossChange(projectId, lossId) {
    const loss = lossesStep2.find(l => l.id === lossId)
    updateProject(projectId, { loss_target_id: lossId, loss_target_label: loss?.label || '' })
  }
  const totalPlanned = progetti.reduce((sum, p) => sum + (parseFloat(p.saving_planned) || 0), 0)

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">
        <strong>Cosa fare:</strong> Pianifica i progetti (Kaizen) che chiuderanno il gap del KPI.
      </div>
      {progetti.length > 0 && (
        <div className="bg-white p-3 rounded-lg border-2 border-dashed flex justify-between items-center">
          <span className="text-sm text-gray-600">Saving totale pianificato:</span>
          <span className="text-2xl font-bold" style={{ color }}>{totalPlanned.toLocaleString('it-IT')} €</span>
        </div>
      )}
      {lossesStep2.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-3 text-sm text-yellow-800">
          Non hai ancora compilato lo <strong>Step 2 (Pareto)</strong>.
        </div>
      )}
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-sm uppercase text-gray-700">Progetti pianificati ({progetti.length})</h4>
        <button onClick={addProject} className="text-xs px-3 py-1 text-white rounded shadow" style={{ backgroundColor: color }}>+ Pianifica progetto</button>
      </div>
      {progetti.length === 0 ? (
        <div className="bg-white p-6 rounded-lg text-center text-sm text-gray-400 italic">Nessun progetto pianificato.</div>
      ) : (
        <div className="space-y-2">
          {progetti.map((p, idx) => {
            const status = p.status || 'planned'
            const statusInfo = PROGETTO_STATUS.find(s => s.value === status) || PROGETTO_STATUS[0]
            return (
              <div key={p.id} className="bg-white p-3 rounded-lg border-l-4 border" style={{ borderLeftColor: color }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-gray-400 text-sm">#{idx + 1}</span>
                  <input className="flex-1 border rounded px-2 py-1 text-sm font-medium" value={p.label} onChange={(e) => updateProject(p.id, { label: e.target.value })} />
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${statusInfo.color}`}>{statusInfo.label}</span>
                  <button onClick={() => removeProject(p.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Loss target (da Step 2)</label>
                    <select className="w-full border rounded px-2 py-1 text-xs" value={p.loss_target_id || ''} onChange={(e) => handleLossChange(p.id, e.target.value)}>
                      <option value="">— Seleziona loss —</option>
                      {lossesStep2.map(l => <option key={l.id} value={l.id}>{l.label || 'Senza nome'} ({l.percent_impact || 0}%)</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Kaizen #</label>
                    <input className="w-full border rounded px-2 py-1 text-xs font-mono" value={p.kaizen_numero} onChange={(e) => updateProject(p.id, { kaizen_numero: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Saving Planned €</label>
                    <input type="number" className="w-full border rounded px-2 py-1 text-xs" value={p.saving_planned !== undefined ? p.saving_planned : (p.saving_atteso || '')} onChange={(e) => updateProject(p.id, { saving_planned: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Deadline</label>
                    <input type="date" className="w-full border rounded px-2 py-1 text-xs" value={p.deadline} onChange={(e) => updateProject(p.id, { deadline: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Owner</label>
                    <input className="w-full border rounded px-2 py-1 text-xs" value={p.owner || ''} onChange={(e) => updateProject(p.id, { owner: e.target.value })} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Step4Content({ data, color, onUpdate, allStepsData }) {
  const step3Progetti = allStepsData?.step3_target_definition?.progetti || []
  const progettiActual = data.progetti_actual || []

  useEffect(() => {
    const existingStep3Ids = new Set(progettiActual.filter(p => p.source === 'step3').map(p => p.step3_project_id))
    const newOnes = step3Progetti
      .filter(p => p.status !== 'cancelled' && !existingStep3Ids.has(p.id))
      .map(p => ({
        id: `s4_${p.id}_${Date.now()}`, source: 'step3', step3_project_id: p.id,
        label: '', loss_target_label: '', kaizen_numero: '', saving_planned: '', owner: '', deadline: '',
        actual_status: 'not_started', actual_saving: '', actual_completion_date: '', notes_implementation: '',
      }))
    if (newOnes.length > 0) onUpdate({ progetti_actual: [...progettiActual, ...newOnes] })
  }, [step3Progetti.length])

  function updateActual(id, updates) { onUpdate({ progetti_actual: progettiActual.map(p => p.id === id ? { ...p, ...updates } : p) }) }
  function removeActual(id) {
    if (!confirm('Rimuovere questo progetto dal tracking Step 4?')) return
    onUpdate({ progetti_actual: progettiActual.filter(p => p.id !== id) })
  }
  function addNewProject() {
    onUpdate({ progetti_actual: [...progettiActual, {
      id: `s4new_${Date.now()}`, source: 'step4_new', step3_project_id: null,
      label: '', loss_target_label: '', kaizen_numero: '', saving_planned: '', owner: '', deadline: '',
      actual_status: 'not_started', actual_saving: '', actual_completion_date: '', notes_implementation: '',
    }] })
  }

  function getPlannedData(p) {
    if (p.source === 'step3') {
      const step3p = step3Progetti.find(s => s.id === p.step3_project_id)
      return {
        label: step3p?.label || '(progetto Step 3 rimosso)',
        loss_target_label: step3p?.loss_target_label || '',
        kaizen_numero: step3p?.kaizen_numero || '',
        saving_planned: step3p?.saving_planned || '',
        owner: step3p?.owner || '', deadline: step3p?.deadline || '',
        step3_status: step3p?.status, step3_exists: !!step3p,
      }
    }
    return { label: p.label, loss_target_label: p.loss_target_label, kaizen_numero: p.kaizen_numero,
      saving_planned: p.saving_planned, owner: p.owner, deadline: p.deadline, step3_status: null, step3_exists: true }
  }

  const summary = {
    pianificati: progettiActual.filter(p => p.source === 'step3').length,
    aggiunti: progettiActual.filter(p => p.source === 'step4_new').length,
    completati: progettiActual.filter(p => p.actual_status === 'done').length,
    in_corso: progettiActual.filter(p => p.actual_status === 'in_progress').length,
    bloccati: progettiActual.filter(p => p.actual_status === 'blocked').length,
    totalPlanned: progettiActual.reduce((sum, p) => sum + (parseFloat(getPlannedData(p).saving_planned) || 0), 0),
    totalActual: progettiActual.reduce((sum, p) => sum + (parseFloat(p.actual_saving) || 0), 0),
  }
  const totalGap = summary.totalActual - summary.totalPlanned
  const gapPercent = summary.totalPlanned > 0 ? (totalGap / summary.totalPlanned) * 100 : 0

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">
        <strong>Cosa fare:</strong> Monitora l'implementazione dei progetti pianificati nello Step 3.
      </div>
      {progettiActual.length > 0 && (
        <div className="bg-white rounded-lg border-2 p-4" style={{ borderColor: color }}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <SummaryBlock label="Pianificati" value={summary.pianificati} color="indigo" />
            <SummaryBlock label="Aggiunti" value={summary.aggiunti} color="purple" />
            <SummaryBlock label="In corso" value={summary.in_corso} color="yellow" />
            <SummaryBlock label="Completati" value={summary.completati} color="green" />
            <SummaryBlock label="Bloccati" value={summary.bloccati} color="orange" />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center"><div className="text-xs text-gray-500 uppercase">Total Planned €</div><div className="text-xl font-bold text-gray-700">{summary.totalPlanned.toLocaleString('it-IT')} €</div></div>
            <div className="text-center"><div className="text-xs text-gray-500 uppercase">Total Actual €</div><div className="text-xl font-bold" style={{ color }}>{summary.totalActual.toLocaleString('it-IT')} €</div></div>
            <div className="text-center"><div className="text-xs text-gray-500 uppercase">Gap</div><div className={`text-xl font-bold ${totalGap >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalGap >= 0 ? '+' : ''}{totalGap.toLocaleString('it-IT')} €<span className="text-xs ml-1">({gapPercent >= 0 ? '+' : ''}{gapPercent.toFixed(1)}%)</span></div></div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-sm uppercase text-gray-700">Tracking implementazione ({progettiActual.length})</h4>
        <button onClick={addNewProject} className="text-xs px-3 py-1 text-white rounded shadow" style={{ backgroundColor: color }}>+ Aggiungi progetto nuovo</button>
      </div>
      {progettiActual.length === 0 ? (
        <div className="bg-white p-6 rounded-lg text-center text-sm text-gray-400 italic">Nessun progetto in tracking.</div>
      ) : (
        <div className="space-y-2">
          {progettiActual.map((p, idx) => {
            const planned = getPlannedData(p)
            const statusInfo = ACTUAL_STATUS.find(s => s.value === (p.actual_status || 'not_started')) || ACTUAL_STATUS[0]
            const actualSaving = parseFloat(p.actual_saving) || 0
            const plannedSaving = parseFloat(planned.saving_planned) || 0
            const gap = actualSaving - plannedSaving
            const isOrphan = p.source === 'step3' && !planned.step3_exists
            return (
              <div key={p.id} className="bg-white p-3 rounded-lg border-l-4 border" style={{ borderLeftColor: isOrphan ? '#ef4444' : color }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-gray-400 text-sm">#{idx + 1}</span>
                  {p.source === 'step3' ? <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold whitespace-nowrap">Pianificato</span> : <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold whitespace-nowrap">Aggiunto in Step 4</span>}
                  {isOrphan && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold whitespace-nowrap">Step 3 rimosso</span>}
                  {p.source === 'step3' ? (
                    <div className="flex-1 px-2 py-1 text-sm font-medium text-gray-700">{planned.label || '(senza titolo)'}{planned.kaizen_numero && <span className="ml-2 font-mono text-xs text-gray-500">[{planned.kaizen_numero}]</span>}</div>
                  ) : (
                    <input className="flex-1 border rounded px-2 py-1 text-sm font-medium" value={p.label} onChange={(e) => updateActual(p.id, { label: e.target.value })} />
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${statusInfo.color}`}>{statusInfo.label}</span>
                  <button onClick={() => removeActual(p.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                </div>
                {p.source === 'step3' && !isOrphan && (
                  <div className="grid grid-cols-12 gap-2 mb-2 text-xs bg-gray-50 rounded p-2">
                    <div className="col-span-3"><span className="text-gray-500 uppercase text-[10px] block">Loss target</span><span className="font-medium">{planned.loss_target_label || '—'}</span></div>
                    <div className="col-span-3"><span className="text-gray-500 uppercase text-[10px] block">Planned €</span><span className="font-mono font-bold">{plannedSaving.toLocaleString('it-IT')} €</span></div>
                    <div className="col-span-3"><span className="text-gray-500 uppercase text-[10px] block">Owner</span><span>{planned.owner || '—'}</span></div>
                    <div className="col-span-3"><span className="text-gray-500 uppercase text-[10px] block">Deadline</span><span>{planned.deadline || '—'}</span></div>
                  </div>
                )}
                {p.source === 'step4_new' && (
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-3"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Loss target</label><input className="w-full border rounded px-2 py-1 text-xs" value={p.loss_target_label} onChange={(e) => updateActual(p.id, { loss_target_label: e.target.value })} /></div>
                    <div className="col-span-2"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Kaizen #</label><input className="w-full border rounded px-2 py-1 text-xs font-mono" value={p.kaizen_numero} onChange={(e) => updateActual(p.id, { kaizen_numero: e.target.value })} /></div>
                    <div className="col-span-2"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Planned €</label><input type="number" className="w-full border rounded px-2 py-1 text-xs" value={p.saving_planned} onChange={(e) => updateActual(p.id, { saving_planned: e.target.value })} /></div>
                    <div className="col-span-2"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Deadline</label><input type="date" className="w-full border rounded px-2 py-1 text-xs" value={p.deadline} onChange={(e) => updateActual(p.id, { deadline: e.target.value })} /></div>
                    <div className="col-span-3"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Owner</label><input className="w-full border rounded px-2 py-1 text-xs" value={p.owner} onChange={(e) => updateActual(p.id, { owner: e.target.value })} /></div>
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Actual Status</label><select className="w-full border rounded px-2 py-1 text-xs" value={p.actual_status || 'not_started'} onChange={(e) => updateActual(p.id, { actual_status: e.target.value })}>{ACTUAL_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                  <div className="col-span-2"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Actual Saving €</label><input type="number" className="w-full border rounded px-2 py-1 text-xs" value={p.actual_saving} onChange={(e) => updateActual(p.id, { actual_saving: e.target.value })} /></div>
                  <div className="col-span-2"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Gap vs Planned</label><div className={`w-full border rounded px-2 py-1 text-xs font-bold text-center ${gap >= 0 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'}`}>{gap >= 0 ? '+' : ''}{gap.toLocaleString('it-IT')} €</div></div>
                  <div className="col-span-2"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Completion Date</label><input type="date" className="w-full border rounded px-2 py-1 text-xs" value={p.actual_completion_date || ''} onChange={(e) => updateActual(p.id, { actual_completion_date: e.target.value })} /></div>
                  <div className="col-span-3"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Note implementazione</label><input className="w-full border rounded px-2 py-1 text-xs" value={p.notes_implementation || ''} onChange={(e) => updateActual(p.id, { notes_implementation: e.target.value })} /></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryBlock({ label, value, color = 'gray' }) {
  const colors = { gray: 'text-gray-700 bg-gray-50', indigo: 'text-indigo-700 bg-indigo-50', purple: 'text-purple-700 bg-purple-50', yellow: 'text-yellow-700 bg-yellow-50', green: 'text-green-700 bg-green-50', orange: 'text-orange-700 bg-orange-50' }
  return (
    <div className={`text-center rounded-lg py-2 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase font-medium">{label}</div>
    </div>
  )
}

function Step5Content({ data, color, onUpdate, allStepsData }) {
  const kpiPrincipale = allStepsData?.step1_kpi_definition?.kpi_principale || {}
  const kmis = allStepsData?.step1_kpi_definition?.kmis || []
  const step3Progetti = allStepsData?.step3_target_definition?.progetti || []
  const step4Actual = allStepsData?.step4_implementation?.progetti_actual || []
  const overrides = data.bridge_overrides || {}

  const totalPlanned = step3Progetti.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + (parseFloat(p.saving_planned) || 0), 0)
  const totalActual = step4Actual.filter(p => p.actual_status === 'done').reduce((sum, p) => sum + (parseFloat(p.actual_saving) || 0), 0)

  const bridgeRows = [
    { key: 'principale', label: kpiPrincipale.label || 'KPI Principale', unit: kpiPrincipale.unit || '', auto_baseline: kpiPrincipale.baseline || '', auto_target: kpiPrincipale.target || '', auto_planned_saving: totalPlanned, auto_actual_saving: totalActual, isMain: true },
    ...kmis.map(k => ({ key: `kmi_${k.id}`, label: k.label || 'KMI', unit: k.unit || '', auto_baseline: k.baseline || '', auto_target: k.target || '', auto_planned_saving: 0, auto_actual_saving: 0, isMain: false })),
  ]

  function updateOverride(key, field, value) { onUpdate({ bridge_overrides: { ...overrides, [key]: { ...(overrides[key] || {}), [field]: value } } }) }
  function resetOverride(key, field) {
    const rowOverride = { ...(overrides[key] || {}) }
    delete rowOverride[field]
    onUpdate({ bridge_overrides: { ...overrides, [key]: rowOverride } })
  }
  function getValue(key, field, autoValue) { const ov = overrides[key]?.[field]; return ov !== undefined && ov !== '' ? ov : autoValue }
  function isOverridden(key, field) { const ov = overrides[key]?.[field]; return ov !== undefined && ov !== '' }

  const mainPlanned = parseFloat(getValue('principale', 'planned', totalPlanned)) || 0
  const mainActual = parseFloat(getValue('principale', 'actual', totalActual)) || 0
  const mainGap = mainActual - mainPlanned
  const coveragePercent = mainPlanned > 0 ? (mainActual / mainPlanned) * 100 : 0

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">
        <strong>Cosa fare:</strong> Il Bridge chart si compila automaticamente dagli step precedenti.
      </div>
      <div className="bg-white rounded-lg border-2 p-4" style={{ borderColor: color }}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-sm uppercase" style={{ color }}>Risultato globale — KPI {kpiPrincipale.label || 'Principale'}</h4>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${coveragePercent >= 100 ? 'bg-green-100 text-green-700' : coveragePercent >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
            {coveragePercent >= 100 ? 'Target raggiunto' : coveragePercent >= 80 ? 'Vicino al target' : 'Sotto target'}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center bg-gray-50 rounded p-2"><div className="text-[10px] uppercase text-gray-500">Planned</div><div className="text-xl font-bold text-gray-700">{mainPlanned.toLocaleString('it-IT')} €</div></div>
          <div className="text-center bg-blue-50 rounded p-2"><div className="text-[10px] uppercase text-blue-600">Actual (done)</div><div className="text-xl font-bold text-blue-700">{mainActual.toLocaleString('it-IT')} €</div></div>
          <div className={`text-center rounded p-2 ${mainGap >= 0 ? 'bg-green-50' : 'bg-red-50'}`}><div className={`text-[10px] uppercase ${mainGap >= 0 ? 'text-green-600' : 'text-red-600'}`}>Gap</div><div className={`text-xl font-bold ${mainGap >= 0 ? 'text-green-700' : 'text-red-700'}`}>{mainGap >= 0 ? '+' : ''}{mainGap.toLocaleString('it-IT')} €</div></div>
          <div className="text-center rounded p-2" style={{ backgroundColor: `${color}15` }}><div className="text-[10px] uppercase" style={{ color }}>Copertura</div><div className="text-xl font-bold" style={{ color }}>{coveragePercent.toFixed(1)}%</div></div>
        </div>
      </div>
      {!kpiPrincipale.label && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-3 text-sm text-yellow-800">Non hai ancora definito il KPI principale nello Step 1.</div>
      )}
      <h4 className="font-semibold text-sm uppercase text-gray-700 mt-4">Bridge Chart per KPI / KMI</h4>
      {bridgeRows.length === 0 ? (
        <div className="bg-white p-6 rounded-lg text-center text-sm text-gray-400 italic">Nessun KPI definito.</div>
      ) : (
        <div className="space-y-2">
          {bridgeRows.map(row => {
            const baseline = getValue(row.key, 'baseline', row.auto_baseline)
            const planned = getValue(row.key, 'planned', row.auto_planned_saving)
            const actual = getValue(row.key, 'actual', row.auto_actual_saving)
            const gapReason = overrides[row.key]?.gap_reason || ''
            const rowGap = (parseFloat(actual) || 0) - (parseFloat(planned) || 0)
            return (
              <div key={row.key} className="bg-white p-3 rounded-lg border-l-4" style={{ borderLeftColor: row.isMain ? color : '#9ca3af' }}>
                <div className="flex items-center gap-2 mb-2">
                  {row.isMain ? <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold whitespace-nowrap">KPI Principale</span> : <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-bold whitespace-nowrap">KMI</span>}
                  <span className="font-bold text-sm">{row.label}</span>
                  {row.unit && <span className="text-xs text-gray-500">[{row.unit}]</span>}
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <BridgeCell label="Baseline" value={baseline} autoValue={row.auto_baseline} isOverridden={isOverridden(row.key, 'baseline')} onChange={(v) => updateOverride(row.key, 'baseline', v)} onReset={() => resetOverride(row.key, 'baseline')} colSpan="col-span-3" />
                  <BridgeCell label={row.isMain ? 'Σ Planned (Step 3)' : 'Planned'} value={planned} autoValue={row.auto_planned_saving} isOverridden={isOverridden(row.key, 'planned')} onChange={(v) => updateOverride(row.key, 'planned', v)} onReset={() => resetOverride(row.key, 'planned')} colSpan="col-span-3" suffix={row.isMain ? '€' : ''} />
                  <BridgeCell label={row.isMain ? 'Σ Actual (Step 4 done)' : 'Actual'} value={actual} autoValue={row.auto_actual_saving} isOverridden={isOverridden(row.key, 'actual')} onChange={(v) => updateOverride(row.key, 'actual', v)} onReset={() => resetOverride(row.key, 'actual')} colSpan="col-span-3" suffix={row.isMain ? '€' : ''} />
                  <div className="col-span-3"><label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Gap</label><div className={`w-full border rounded px-2 py-1 text-xs font-bold text-center ${rowGap >= 0 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'}`}>{rowGap >= 0 ? '+' : ''}{rowGap.toLocaleString('it-IT')}</div></div>
                </div>
                {rowGap < 0 && (
                  <div className="mt-2"><label className="block text-[10px] font-medium text-red-600 uppercase mb-0.5">Motivo del gap</label><input className="w-full border border-red-300 rounded px-2 py-1 text-xs" value={gapReason} onChange={(e) => updateOverride(row.key, 'gap_reason', e.target.value)} /></div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div className="bg-white p-3 rounded-lg border mt-4">
        <label className="block text-xs font-medium text-gray-600 uppercase mb-1">Lezioni apprese (Close the Loop)</label>
        <textarea value={data.lezioni_apprese || ''} onChange={(e) => onUpdate({ lezioni_apprese: e.target.value })} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
    </div>
  )
}

function BridgeCell({ label, value, autoValue, isOverridden, onChange, onReset, colSpan = 'col-span-3', suffix = '' }) {
  return (
    <div className={colSpan}>
      <div className="flex items-center justify-between mb-0.5">
        <label className="block text-[10px] font-medium text-gray-500 uppercase">{label}</label>
        {isOverridden && <button onClick={onReset} className="text-[10px] text-blue-600 hover:underline" title="Ripristina automatico">↺ auto</button>}
      </div>
      <div className="relative">
        <input type="number" className={`w-full border rounded px-2 py-1 text-xs ${isOverridden ? 'bg-yellow-50 border-yellow-400 font-bold' : 'bg-gray-50'}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={autoValue ? String(autoValue) : '0'} />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">{suffix}</span>}
      </div>
      {!isOverridden && autoValue !== '' && autoValue !== 0 && <div className="text-[9px] text-gray-400 mt-0.5">auto: {Number(autoValue).toLocaleString('it-IT')}</div>}
    </div>
  )
}
function KaizenList({ kaizens, pillar }) {
  if (kaizens.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-12 text-center">
        <h3 className="font-semibold mb-1">Nessun Kaizen collegato</h3>
        <p className="text-sm text-gray-500 mb-3">Crea un Kaizen e collegalo al Pillar <strong>{pillar.sigla}</strong></p>
        <Link to="/kaizen" className="text-primary hover:underline text-sm">Vai a Kaizen</Link>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-bold">Kaizen collegati al Pillar {pillar.sigla} <span className="text-xs font-normal text-gray-500">({kaizens.length})</span></h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2 text-left w-24">Numero</th>
            <th className="px-4 py-2 text-left">Titolo</th>
            <th className="px-4 py-2 text-left w-32">Livello</th>
            <th className="px-4 py-2 text-left w-28">Stato</th>
            <th className="px-4 py-2 text-left w-32">Reparto</th>
            <th className="px-4 py-2 text-right w-24">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {kaizens.map(k => {
            const livello = k.livello || (k.tipo?.includes('Major') ? 'Major' : k.tipo?.includes('Standard') ? 'Standard' : 'Quick')
            const livelloColor = livello === 'Major' ? 'bg-purple-100 text-purple-700' : livello === 'Standard' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
            return (
              <tr key={k._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-primary font-bold">{k.numero}</td>
                <td className="px-4 py-2">{k.titolo}</td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${livelloColor}`}>{livello}</span></td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${k.stato === 'Aperto' ? 'bg-blue-100 text-blue-700' : k.stato === 'In Corso' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{k.stato}</span></td>
                <td className="px-4 py-2 text-xs text-gray-600">{k.reparto || '—'}</td>
                <td className="px-4 py-2 text-right"><Link to={`/kaizen/${k._id}`} className="text-primary hover:underline text-xs">Apri →</Link></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MaturityPlaceholder({ color }) {
  return (
    <div className="bg-white rounded-xl shadow p-8 text-center">
      <h2 className="text-2xl font-bold mb-1">Maturity Grid</h2>
      <p className="text-sm text-gray-500 mb-4">Audit JIPM World-Class Manufacturing</p>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 p-4 rounded-r-lg max-w-lg mx-auto">
        <div className="font-bold text-blue-900 mb-1">In sviluppo futuro</div>
      </div>
    </div>
  )
}

const CELL_STATES = [
  { value: 0, label: 'Vuoto', color: '' },
  { value: 1, label: 'Pianificato', color: '#10b981' },
  { value: 2, label: 'Completato', color: '#2563eb' },
]

function getDefaultMasterplan() {
  const currentYear = new Date().getFullYear()
  return {
    steps: [
      { id: 's1', num: 1, label: 'Define Target & Vision on Volume & Productivity' },
      { id: 's2', num: 2, label: 'Deploy and Attack Machine Productivity losses' },
      { id: 's3', num: 3, label: 'Deploy and Attack Labour Organizational losses' },
      { id: 's4', num: 4, label: 'Improve Resource Saturation at Macro Level' },
      { id: 's5', num: 5, label: 'Improve Resource Saturation at Micro Level' },
      { id: 's6', num: 6, label: 'Develop the daily control system to hold the gains' },
    ],
    cells: {}, start_year: currentYear - 1, end_year: currentYear + 5,
  }
}

function MasterPlanTab({ pillar, color, onSaved }) {
  const savedMasterplan = pillar.gantt_items?.find(i => i?.type === 'masterplan')?.data
  const [data, setData] = useState(savedMasterplan || getDefaultMasterplan())
  const [editingStepId, setEditingStepId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const dataRef = useRef(data)

  useEffect(() => { dataRef.current = data }, [data])

  async function doSave(silent = false) {
    if (!silent) setSaving(true)
    try {
      await api.put(`/pillars/${pillar._id}`, { gantt_items: [{ type: 'masterplan', data: dataRef.current }] })
      if (!silent) { setLastSaved(new Date()); setHasUnsavedChanges(false) }
    } catch (err) {
      console.error(err)
      if (!silent) alert('Errore salvataggio: ' + (err.response?.data?.detail || err.message))
    } finally { if (!silent) setSaving(false) }
  }

  useEffect(() => {
    if (JSON.stringify(data) === JSON.stringify(savedMasterplan || getDefaultMasterplan())) return
    setHasUnsavedChanges(true)
    const timer = setTimeout(() => doSave(false), 700)
    return () => clearTimeout(timer)
  }, [data])

  function getCellValue(stepId, year, quarter) { return data.cells[`${stepId}_${year}_${quarter}`] || 0 }
  function cycleCell(stepId, year, quarter) {
    const key = `${stepId}_${year}_${quarter}`
    const current = data.cells[key] || 0
    const next = (current + 1) % CELL_STATES.length
    setData(prev => { const newCells = { ...prev.cells }; newCells[key] = next; return { ...prev, cells: newCells } })
  }
  function clearRow(stepId) {
    if (!confirm('Pulire tutte le celle di questa riga?')) return
    setData(prev => { const newCells = { ...prev.cells }; Object.keys(newCells).forEach(k => { if (k.startsWith(`${stepId}_`)) delete newCells[k] }); return { ...prev, cells: newCells } })
  }
  function updateStepLabel(stepId, newLabel) { setData(prev => ({ ...prev, steps: prev.steps.map(s => s.id === stepId ? { ...s, label: newLabel } : s) })) }
  function addStep() {
    const newId = `s${Date.now()}`
    const newNum = data.steps.length + 1
    setData(prev => ({ ...prev, steps: [...prev.steps, { id: newId, num: newNum, label: `Step ${newNum} — Nuovo` }] }))
  }
  function removeStep(stepId) {
    if (!confirm('Eliminare questo step e tutte le sue celle?')) return
    setData(prev => {
      const newCells = { ...prev.cells }
      Object.keys(newCells).forEach(k => { if (k.startsWith(`${stepId}_`)) delete newCells[k] })
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
      const tmp = newSteps[idx]; newSteps[idx] = newSteps[newIdx]; newSteps[newIdx] = tmp
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
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg">Pillar Master Plan</h3>
            <p className="text-xs text-gray-500">Pianificazione multi-anno per trimestri — Pillar <strong>{pillar.sigla}</strong></p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {saving ? <span className="text-blue-600">Salvataggio...</span> : hasUnsavedChanges ? <span className="text-orange-600 font-medium">Non salvato</span> : lastSaved ? <span className="text-green-600">Salvato {lastSaved.toLocaleTimeString('it-IT')}</span> : <span className="text-gray-400">Pronto</span>}
            <button onClick={() => doSave(false)} disabled={saving} className="text-white px-3 py-1 rounded text-xs shadow" style={{ backgroundColor: color }}>Salva ora</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-3 border-t">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Anno inizio</label><input type="number" min="2000" max="2100" value={data.start_year} onChange={(e) => updateYearRange('start_year', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Anno fine</label><input type="number" min="2000" max="2100" value={data.end_year} onChange={(e) => updateYearRange('end_year', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
          <button onClick={addStep} className="text-white px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center gap-1 shadow" style={{ backgroundColor: color }}><Plus size={14} /> Aggiungi Step</button>
        </div>
        <div className="flex gap-3 mt-3 pt-3 border-t text-xs items-center flex-wrap">
          <span className="font-medium text-gray-600">Stati cella:</span>
          {CELL_STATES.map(s => (
            <div key={s.value} className="flex items-center gap-1"><div className="w-4 h-4 border rounded" style={{ backgroundColor: s.color || 'white' }} /><span>{s.label}</span></div>
          ))}
          <span className="ml-auto text-gray-500 italic">Click su cella per cambiare stato</span>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <div style={{ minWidth: years.length * 80 + 412 }}>
          <div className="flex border-b bg-gray-100 sticky top-0 z-10">
            <div className="w-12 px-2 py-2 text-xs font-bold text-center border-r"></div>
            <div className="w-80 px-3 py-2 text-xs font-bold border-r">PILLAR Steps</div>
            <div className="w-20 px-1 py-2 text-xs font-bold text-center border-r">Azioni</div>
            {years.map(year => (
              <div key={year} className="flex-1 min-w-[80px] border-r last:border-r-0">
                <div className="text-center font-bold text-xs py-1 border-b" style={{ backgroundColor: `${color}15`, color }}>{year}</div>
                <div className="flex">{quarters.map(q => <div key={q} className="flex-1 text-center text-[10px] font-medium text-gray-500 py-0.5 border-r last:border-r-0">{q}</div>)}</div>
              </div>
            ))}
          </div>
          {data.steps.map((step, idx) => (
            <div key={step.id} className="flex border-b hover:bg-gray-50">
              <div className="w-12 px-2 py-2 text-sm font-bold text-center border-r flex items-center justify-center" style={{ backgroundColor: `${color}25`, color }}>{step.num}</div>
              <div className="w-80 px-2 py-1 border-r flex items-center">
                {editingStepId === step.id ? (
                  <input autoFocus value={step.label} onChange={(e) => updateStepLabel(step.id, e.target.value)} onBlur={() => setEditingStepId(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingStepId(null)} className="w-full border rounded px-2 py-1 text-xs" />
                ) : (
                  <div onClick={() => setEditingStepId(step.id)} className="text-xs cursor-pointer hover:bg-yellow-50 px-2 py-1 rounded w-full" title="Click per modificare">{step.label}</div>
                )}
              </div>
              <div className="w-20 px-1 border-r flex items-center justify-center gap-0.5">
                <button onClick={() => moveStep(step.id, 'up')} disabled={idx === 0} className="text-xs px-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Sposta su">▲</button>
                <button onClick={() => moveStep(step.id, 'down')} disabled={idx === data.steps.length - 1} className="text-xs px-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Sposta giù">▼</button>
                <button onClick={() => clearRow(step.id)} className="text-xs px-1 hover:bg-yellow-100 rounded text-yellow-600" title="Pulisci riga">⌫</button>
                <button onClick={() => removeStep(step.id)} className="p-0.5 hover:bg-red-100 rounded text-red-600" title="Elimina step"><Trash2 size={11} /></button>
              </div>
              {years.map(year => (
                <div key={year} className="flex-1 min-w-[80px] border-r last:border-r-0 flex">
                  {quarters.map((q, qIdx) => {
                    const val = getCellValue(step.id, year, qIdx + 1)
                    const state = CELL_STATES[val]
                    return (
                      <button key={q} onClick={() => cycleCell(step.id, year, qIdx + 1)} className="flex-1 border-r last:border-r-0 hover:opacity-75 transition-opacity" style={{ backgroundColor: state.color || 'transparent', minHeight: '32px' }} title={`${year} ${q}: ${state.label}`} />
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
