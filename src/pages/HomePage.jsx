import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  ClipboardList, AlertTriangle, Calendar, FileText, Layers,
  User, Briefcase, Factory, MapPin, ChevronRight, CheckCircle2, Clock
} from 'lucide-react'
import ActionPlanDetailPanel from '../components/ActionPlanDetailPanel'

export default function HomePage() {
  const { user, isAdmin, isManager, isOffice, isOperator } = useAuth()

  const [actionPlans, setActionPlans] = useState([])
  const [kaizens, setKaizens] = useState([])
  const [pillars, setPillars] = useState([])
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAP, setSelectedAP] = useState(null)

  useEffect(() => { loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const [apsRes, kaizensRes, pillarsRes, dashboardsRes] = await Promise.all([
        api.get('/action-plans/').catch(() => ({ data: [] })),
        api.get('/kaizens/').catch(() => ({ data: [] })),
        api.get('/pillars/').catch(() => ({ data: [] })),
        api.get('/dashboards/').catch(() => ({ data: [] })),
      ])
      setActionPlans(apsRes.data || [])
      setKaizens(kaizensRes.data || [])
      setPillars(pillarsRes.data || [])
      setDashboards(dashboardsRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null
  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">Caricamento dashboard personale...</div>
    )
  }

  // ──────────────────────────────────────────
  // FILTRI per "le mie cose" in base al ruolo
  // ──────────────────────────────────────────

  // AP responsabile = user.full_name (per ora confronto sui nomi)
  const myActionPlans = actionPlans.filter(ap => {
    if (ap.is_cancelled) return false
    // Match per nome responsabile (compatibilità retro)
    if (ap.responsabile && ap.responsabile === user.full_name) return true
    // Match per @mention nei tag o descrizione
    if (ap.mentions?.includes(user.username)) return true
    return false
  })

  // Operatore: AP del proprio reparto/linea/macchine
  const myAreaActionPlans = actionPlans.filter(ap => {
    if (ap.is_cancelled) return false
    if (user.reparto && ap.reparto === user.reparto) return true
    if (user.linee?.length > 0 && user.linee.includes(ap.linea)) return true
    if (user.macchine?.length > 0 && user.macchine.includes(ap.macchina)) return true
    return false
  })

  // Pillar dove sono Leader o Membro (fonte unica: il Pillar stesso)
  const myPillars = pillars.filter(p => {
    if (p.leader_id === user.id) return true
    if (p.members_ids?.includes(user.id)) return true
    // Fallback per dati legacy che hanno solo i nomi
    if (p.leader === user.full_name) return true
    if (p.members?.includes(user.full_name)) return true
    return false
  })

  // Kaizen dove sono coinvolto (fonte unica: il Kaizen stesso con campi ID)
  const myKaizens = kaizens.filter(k => {
    if (k.stato === 'Chiuso' || k.stato === 'Cancelled') return false

    // 🆕 Match per ID utente (nuova architettura)
    if (k.creatore_id === user.id) return true
    if (k.team_leader_id === user.id) return true
    if ((k.team_members_ids || []).includes(user.id)) return true

    // Fallback per dati legacy (nome)
    if (k.creatore_nome === user.full_name) return true
    if (k.team_leader_nome === user.full_name) return true
    if ((k.team_members_nomi || []).includes(user.full_name)) return true
    if (k.leader === user.full_name) return true
    if ((k.team_members || []).includes(user.full_name)) return true

    // Per operatore: kaizen del suo reparto
    if (isOperator && user.reparto && k.reparto === user.reparto) return true

    return false
  })

  // Meetings di oggi (filtra le dashboard tipo "meeting" con data odierna)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ──────────────────────────────────────────
  // Classifica AP per scadenza
  // ──────────────────────────────────────────
  function classifyByDeadline(ap) {
    if (!ap.data_scadenza) return 'no-date'
    const scadenza = new Date(ap.data_scadenza)
    scadenza.setHours(0, 0, 0, 0)
    if (scadenza < today) return 'overdue'
    if (scadenza.getTime() === today.getTime()) return 'today'
    const inSevenDays = new Date(today)
    inSevenDays.setDate(inSevenDays.getDate() + 7)
    if (scadenza <= inSevenDays) return 'week'
    return 'future'
  }

  // Per operatore mostra AP della sua area, per altri mostra "miei"
  const targetActionPlans = isOperator ? myAreaActionPlans : myActionPlans

  const apOverdue = targetActionPlans.filter(ap => classifyByDeadline(ap) === 'overdue')
  const apToday = targetActionPlans.filter(ap => classifyByDeadline(ap) === 'today')
  const apWeek = targetActionPlans.filter(ap => classifyByDeadline(ap) === 'week')
  const apFuture = targetActionPlans.filter(ap => classifyByDeadline(ap) === 'future' || classifyByDeadline(ap) === 'no-date')

  const roleLabels = {
    admin: 'Amministratore',
    manager: 'Manager',
    office: 'Ufficio',
    operator: 'Operatore'
  }
  const roleColors = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-purple-100 text-purple-700',
    office: 'bg-blue-100 text-blue-700',
    operator: 'bg-green-100 text-green-700'
  }

  return (
    <div className="space-y-6">
      {/* HEADER PERSONALE */}
      <div className="bg-gradient-to-r from-primary to-primary-light text-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              Ciao {user.full_name?.split(' ')[0] || user.username}!
            </h1>
            <p className="text-white text-opacity-90 text-sm">
              {user.job_title || roleLabels[user.role] || 'Utente LPW System'}
            </p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                {roleLabels[user.role] || user.role}
              </span>
              {user.reparto && (
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <Factory size={12} /> {user.reparto}
                </span>
              )}
              {user.linee?.length > 0 && (
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <MapPin size={12} /> {user.linee.join(', ')}
                </span>
              )}
              {user.team && (
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <Briefcase size={12} /> {user.team}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">{new Date().toLocaleDateString('it-IT', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}</div>
          </div>
        </div>
      </div>

      {/* RIASSUNTO RAPIDO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Scaduti"
          value={apOverdue.length}
          color="red"
          link="/action-plan"
        />
        <StatCard
          icon={Clock}
          label="Oggi"
          value={apToday.length}
          color="orange"
          link="/action-plan"
        />
        <StatCard
          icon={Calendar}
          label="Settimana"
          value={apWeek.length}
          color="yellow"
          link="/action-plan"
        />
        <StatCard
          icon={CheckCircle2}
          label="AP totali"
          value={targetActionPlans.length}
          color="green"
          link="/action-plan"
        />
      </div>

      {/* LE MIE ACTION PLAN */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList size={20} className="text-primary" />
              {isOperator ? 'Action Plan della mia area' : 'Le mie Action Plan'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isOperator
                ? `Filtrate per reparto/linea/macchine assegnate`
                : `Dove sei responsabile o menzionato`
              }
            </p>
          </div>
          <Link to="/action-plan" className="text-primary text-sm hover:underline flex items-center gap-1">
            Vedi tutte <ChevronRight size={14} />
          </Link>
        </div>

        {targetActionPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClipboardList size={48} className="mx-auto opacity-30 mb-2" />
            <p>Nessuna Action Plan al momento</p>
            <p className="text-xs">Quando ne avrai una, apparirà qui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apOverdue.length > 0 && (
              <APGroup title="Scaduti" color="red" icon={AlertTriangle} aps={apOverdue.slice(0, 5)} onClick={setSelectedAP} />
            )}
            {apToday.length > 0 && (
              <APGroup title="Da fare oggi" color="orange" icon={Clock} aps={apToday.slice(0, 5)} onClick={setSelectedAP} />
            )}
            {apWeek.length > 0 && (
              <APGroup title="Questa settimana" color="yellow" icon={Calendar} aps={apWeek.slice(0, 5)} onClick={setSelectedAP} />
            )}
            {apFuture.length > 0 && (
              <APGroup title="Prossime" color="green" icon={CheckCircle2} aps={apFuture.slice(0, 5)} onClick={setSelectedAP} />
            )}
            {apOverdue.length === 0 && apToday.length === 0 && apWeek.length === 0 && apFuture.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-sm">
                Nessun AP attivo al momento. Bel lavoro!
              </div>
            )}
          </div>
        )}
      </div>

      {/* I MIEI PILLAR + I MIEI KAIZEN (lato fianco) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PILLAR (solo per office/manager/admin) */}
        {!isOperator && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" />
                I miei Pillar
                <span className="text-sm text-gray-400 font-normal">({myPillars.length})</span>
              </h2>
              <Link to="/pillars" className="text-primary text-sm hover:underline flex items-center gap-1">
                Vedi tutti <ChevronRight size={14} />
              </Link>
            </div>
            {myPillars.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Non sei coinvolto in alcun Pillar</p>
            ) : (
              <div className="space-y-2">
                {myPillars.slice(0, 5).map(p => {
                  const isLeader = p.leader_id === user.id || p.leader === user.full_name
                  return (
                    <Link
                      key={p._id}
                      to={`/pillars/${p._id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: p.color || '#6366f1' }}
                      >
                        {p.icon_image ? (
                          React.createElement('img', {
                            src: p.icon_image,
                            alt: p.sigla,
                            className: 'w-full h-full object-contain',
                          })
                        ) : (
                          p.icon || p.sigla?.charAt(0) || 'P'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-bold" style={{ color: p.color || '#6366f1' }}>
                          {p.sigla}
                        </div>
                        <div className="text-sm text-gray-700 truncate">{p.label}</div>
                      </div>
                      {isLeader && (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          Leader
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* KAIZEN */}
        <div className={`bg-white rounded-xl shadow p-6 ${isOperator ? 'md:col-span-2' : ''}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-emerald-600" />
              {isOperator ? 'Kaizen della mia linea' : 'I miei Kaizen'}
              <span className="text-sm text-gray-400 font-normal">({myKaizens.length})</span>
            </h2>
            <Link to="/kaizen" className="text-primary text-sm hover:underline flex items-center gap-1">
              Vedi tutti <ChevronRight size={14} />
            </Link>
          </div>
          {myKaizens.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Nessun Kaizen attivo</p>
          ) : (
            <div className="space-y-2">
              {myKaizens.slice(0, 5).map(k => {
                const livello = k.livello || (k.tipo?.includes('Major') ? 'Major' : k.tipo?.includes('Standard') ? 'Standard' : 'Quick')
                const livelloColor = {
                  Major: 'bg-purple-100 text-purple-700',
                  Standard: 'bg-blue-100 text-blue-700',
                  Quick: 'bg-emerald-100 text-emerald-700'
                }[livello] || 'bg-gray-100 text-gray-700'
                return (
                  <Link
                    key={k._id}
                    to={`/kaizen/${k._id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-primary font-bold">{k.numero}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${livelloColor}`}>
                          {livello}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 truncate">{k.titolo}</div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* MEETINGS / DASHBOARD */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={18} className="text-purple-600" />
            I miei Meetings
            <span className="text-sm text-gray-400 font-normal">({dashboards.length})</span>
          </h2>
          <Link to="/dashboard" className="text-primary text-sm hover:underline flex items-center gap-1">
            Vedi tutti <ChevronRight size={14} />
          </Link>
        </div>
        {dashboards.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Nessun Meeting configurato</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboards.slice(0, 6).map(d => (
              <Link
                key={d._id}
                to={`/dashboard/${d._id}`}
                className="p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm text-gray-700">{d.nome || d.label || 'Meeting'}</div>
                {d.tipo && <div className="text-xs text-gray-500 mt-0.5">{d.tipo}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>
{/* Pannello dettaglio AP (cliccando una riga) */}
      {selectedAP && (
        <ActionPlanDetailPanel
          plan={selectedAP}
          onClose={() => setSelectedAP(null)}
          onUpdated={loadData}
          onEdit={() => setSelectedAP(null)}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// HELPER: StatCard
// ──────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, link }) {
  const colors = {
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
  }
  return (
    <Link to={link || '#'} className="bg-white rounded-xl shadow p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-lg ${colors[color] || 'bg-gray-100 text-gray-600'}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </Link>
  )
}

// ──────────────────────────────────────────
// HELPER: Gruppo di AP per categoria scadenza
// ──────────────────────────────────────────
function APGroup({ title, color, icon: Icon, aps, onClick }) {
  const colors = {
    red: 'text-red-700 bg-red-50 border-red-200',
    orange: 'text-orange-700 bg-orange-50 border-orange-200',
    yellow: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    green: 'text-green-700 bg-green-50 border-green-200',
  }
  return (
    <div>
      <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg border ${colors[color]}`}>
        <Icon size={14} />
        <span className="text-xs font-bold uppercase">{title} ({aps.length})</span>
      </div>
      <div className="space-y-1.5">
        {aps.map(ap => (
          <div
            key={ap._id}
            onClick={() => onClick?.(ap)}
            className="flex items-center gap-2 p-2 rounded border hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
          >
            <span className="font-mono text-xs text-primary font-bold flex-shrink-0">{ap.numero}</span>
            <span className="text-sm flex-1 truncate">{ap.titolo}</span>
            {ap.data_scadenza && (
              <span className="text-xs text-gray-500 flex-shrink-0">
                {new Date(ap.data_scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
