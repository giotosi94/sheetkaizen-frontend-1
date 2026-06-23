import { useState, useEffect } from 'react'
import { Settings, Plus, Edit2, Trash2, Eye, EyeOff, X, Save, Search, GripVertical, ChevronRight, ChevronDown, Info, Factory, Cpu } from 'lucide-react'
import api from '../services/api'

// ──────────────────────────────────────────────────────────
// CONFIG: definisce le sezioni raggruppate
// ──────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'struttura',
    label: 'Struttura Aziendale',
    icon: '🏗️',
    color: 'indigo',
    tabs: [
      {
        id: 'pillars',
        label: 'Pillars',
        icon: '🏛️',
        color: 'indigo',
        isPillar: true,
        description: 'Pilastri TPM Lindt (FI, AM, PM, QM, ecc.)',
        usedIn: ['Kaizen', '5 Step KPI Management', 'Master Plan', 'Action Plan (transitivo)'],
        examples: 'FI (Focused Improvement), AM (Autonomous Maintenance), PM (Planned Maintenance)',
      },
      {
        id: 'reparti_linee',
        label: 'Reparti → Linee → Macchine',
        icon: '🏭',
        color: 'indigo',
        isRepartiTree: true,  // 🆕 placeholder per F2
        description: 'Struttura gerarchica della fabbrica (3 livelli)',
        usedIn: ['Action Plan', 'Kaizen', 'Documenti', 'Filtri'],
        examples: 'Reparto Cioccolato → Linea Bindler 11 → Macchina Conca 1',
      },
    ],
  },
  {
    id: 'action_plan',
    label: 'Action Plan',
    icon: '🎯',
    color: 'green',
    tabs: [
      {
        id: 'tipi_action_plan',
        label: 'Tipo',
        icon: '🏷️',
        color: 'green',
        description: 'Tipologia funzionale dell\'Action Plan',
        usedIn: ['Form Action Plan (campo "Tipo")', 'Filtri /action-plan'],
        examples: 'Sicurezza, Productivity, Manutenzione, Qualità, Ambiente',
      },
      {
        id: 'priorita_ap',
        label: 'Priorità',
        icon: '🎚️',
        color: 'green',
        description: 'Livelli di priorità per l\'Action Plan',
        usedIn: ['Form Action Plan (campo "Priorità")', 'Filtri /action-plan', 'Kanban color'],
        examples: 'Low, Medium, High, Critical',
      },
      {
        id: 'stato_ap',
        label: 'Stato',
        icon: '📍',
        color: 'green',
        description: 'Stati del flusso di lavoro Action Plan',
        usedIn: ['Form Action Plan', 'Kanban board', 'Filtri'],
        examples: 'Da Valutare, Aperto, In Corso, In Verifica, Done',
      },
    ],
  },
  {
    id: 'kaizen',
    label: 'Kaizen',
    icon: '📋',
    color: 'red',
    tabs: [
      {
        id: 'categorie_perdita',
        label: 'Categoria Perdita (TPM)',
        icon: '💥',
        color: 'red',
        description: 'Le 6 grandi perdite TPM — condivisa Kaizen + Action Plan',
        usedIn: ['Kaizen (Ishikawa)', 'Action Plan', 'Step 2 Pareto Pillar'],
        examples: 'OEE, Guasti, Setup, Microfermate, Scarti, Riavvii',
      },
      {
        id: 'argomenti',
        label: 'Argomenti / Tag',
        icon: '🏷️',
        color: 'pink',
        description: 'Tag trasversali per #hashtag in Kaizen e Action Plan',
        usedIn: ['Kaizen (hashtag)', 'Action Plan (tag)', 'Ricerca globale'],
        examples: 'sicurezza, efficienza, OEE, 5S, leantools',
      },
    ],
  },
  {
    id: 'documenti',
    label: 'Documenti',
    icon: '📄',
    color: 'purple',
    tabs: [
      {
        id: 'categorie_documento',
        label: 'Categorie Documenti',
        icon: '📂',
        color: 'purple',
        description: 'Categorizzazione dei documenti OPL/SOP/WI',
        usedIn: ['Documenti', 'Filtri Document Manager'],
        examples: 'Operativa, Sicurezza, Manutenzione, Qualità',
      },
    ],
  },
]

const TAB_COLORS = {
  blue: 'bg-blue-100 text-blue-700 border-blue-300',
  green: 'bg-green-100 text-green-700 border-green-300',
  purple: 'bg-purple-100 text-purple-700 border-purple-300',
  red: 'bg-red-100 text-red-700 border-red-300',
  orange: 'bg-orange-100 text-orange-700 border-orange-300',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  pink: 'bg-pink-100 text-pink-700 border-pink-300',
}

const SECTION_BG = {
  indigo: 'bg-indigo-50',
  green: 'bg-green-50',
  red: 'bg-red-50',
  purple: 'bg-purple-50',
}

// Lookup tutti i tab (flat)
const ALL_TABS = SECTIONS.flatMap(s => s.tabs)

// ──────────────────────────────────────────────────────────
// MAIN PAGE — Sidebar split layout
// ──────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTabId, setActiveTabId] = useState(ALL_TABS[0].id)
  const [stats, setStats] = useState({})

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    try {
      const res = await api.get('/configurazioni/stats')
      setStats(res.data)
    } catch (err) { console.error(err) }
  }

  const currentTab = ALL_TABS.find(t => t.id === activeTabId)

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings size={28} /> Settings
        </h1>
        <p className="text-gray-500 text-sm">
          Configura tutte le voci di sistema raggruppate per dominio
        </p>
      </div>

      {/* LAYOUT SPLIT: Sidebar + Detail */}
      <div className="grid grid-cols-12 gap-4">
        {/* === SIDEBAR === */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-4">
            {SECTIONS.map(section => (
              <div key={section.id} className="border-b last:border-b-0">
                {/* Section header */}
                <div className={`px-3 py-2 ${SECTION_BG[section.color]} border-l-4 border-${section.color}-500`}
                  style={{ borderLeftColor: section.color === 'indigo' ? '#6366f1' : 
                            section.color === 'green' ? '#10b981' : 
                            section.color === 'red' ? '#ef4444' : '#a855f7' }}>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-600 flex items-center gap-1">
                    <span>{section.icon}</span> {section.label}
                  </div>
                </div>
                {/* Section tabs */}
                <div className="py-1">
                  {section.tabs.map(tab => {
                    const isActive = activeTabId === tab.id
                    const count = stats[tab.id]?.attive || 0
                    const totale = stats[tab.id]?.totale || 0
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-sm transition-all ${
                          isActive
                            ? `${TAB_COLORS[tab.color]} font-semibold border-l-2`
                            : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{tab.icon}</span>
                          <span className="truncate">{tab.label}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {totale > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-white bg-opacity-70' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {count}
                            </span>
                          )}
                          {isActive && <ChevronRight size={14} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* === DETAIL === */}
        <div className="col-span-12 md:col-span-9 lg:col-span-9 space-y-4">
          {/* Info box */}
          <div className={`p-4 rounded-lg border-l-4 ${TAB_COLORS[currentTab.color]}`}>
            <div className="flex items-start gap-3">
              <Info size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-base mb-1">
                  {currentTab.icon} {currentTab.label}
                </div>
                <p className="text-sm mb-2">{currentTab.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-semibold uppercase opacity-70 mb-0.5">📍 Usato in:</div>
                    <ul className="list-disc list-inside ml-1 space-y-0.5">
                      {currentTab.usedIn.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold uppercase opacity-70 mb-0.5">💡 Esempi:</div>
                    <p className="italic ml-1">{currentTab.examples}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENUTO */}
          {currentTab.isPillar ? (
            <PillarsManager onChange={loadStats} />
          ) : currentTab.isRepartiTree ? (
            <RepartiTreePlaceholder />
          ) : (
            <ConfigManager
              key={currentTab.id}
              tipo={currentTab.id}
              label={currentTab.label}
              color={currentTab.color}
              onChange={loadStats}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// REPARTI TREE — Reparti → Linee → Macchine (gerarchico)
// ──────────────────────────────────────────────────────────
function RepartiTreePlaceholder() {
  const [reparti, setReparti] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedReparti, setExpandedReparti] = useState(new Set())
  const [expandedLinee, setExpandedLinee] = useState(new Set())
  const [showRepartoForm, setShowRepartoForm] = useState(false)
  const [editingReparto, setEditingReparto] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/reparti/')
      setReparti(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function toggleReparto(id) {
    setExpandedReparti(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleLinea(key) {
    setExpandedLinee(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleDeleteReparto(reparto) {
    if (!confirm(`🗑️ Eliminare il reparto "${reparto.nome}" e tutte le sue linee/macchine?`)) return
    try {
      await api.delete(`/reparti/${reparto._id}`)
      load()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function handleToggleAttivoReparto(reparto) {
    try {
      await api.put(`/reparti/${reparto._id}`, { attivo: !reparto.attivo })
      load()
    } catch (err) {
      alert('Errore: ' + err.message)
    }
  }

  // Filtro ricerca
  const filtered = search.trim()
    ? reparti.filter(r =>
        r.nome?.toLowerCase().includes(search.toLowerCase()) ||
        r.codice?.toLowerCase().includes(search.toLowerCase()) ||
        r.linee?.some(l =>
          l.nome?.toLowerCase().includes(search.toLowerCase()) ||
          l.macchine?.some(m => m.nome?.toLowerCase().includes(search.toLowerCase()))
        )
      )
    : reparti

  // Counters totali
  const totLinee = reparti.reduce((sum, r) => sum + (r.linee?.length || 0), 0)
  const totMacchine = reparti.reduce(
    (sum, r) => sum + (r.linee?.reduce((s, l) => s + (l.macchine?.length || 0), 0) || 0),
    0
  )

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Toolbar */}
      <div className="p-4 border-b flex justify-between items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca reparto, linea o macchina..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500 flex gap-3">
            <span>🏭 {reparti.length} Reparti</span>
            <span>🔹 {totLinee} Linee</span>
            <span>⚙️ {totMacchine} Macchine</span>
          </div>
          <button
            onClick={() => { setEditingReparto(null); setShowRepartoForm(true) }}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light text-sm font-medium"
          >
            <Plus size={16} /> Aggiungi Reparto
          </button>
        </div>
      </div>

      {/* Lista gerarchica */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">⏳ Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-6xl mb-2">🏭</div>
          <p className="text-gray-500 mb-3">
            {search ? 'Nessun risultato' : 'Nessun reparto configurato'}
          </p>
          {!search && (
            <>
              <p className="text-xs text-gray-400 mb-3">
                💡 Configura la struttura aziendale a 3 livelli: Reparti → Linee → Macchine
              </p>
              <button
                onClick={() => { setEditingReparto(null); setShowRepartoForm(true) }}
                className="text-primary hover:underline"
              >
                + Aggiungi il primo Reparto
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {filtered.map(reparto => (
            <RepartoCard
              key={reparto._id}
              reparto={reparto}
              expanded={expandedReparti.has(reparto._id)}
              onToggle={() => toggleReparto(reparto._id)}
              expandedLinee={expandedLinee}
              onToggleLinea={toggleLinea}
              onEdit={() => { setEditingReparto(reparto); setShowRepartoForm(true) }}
              onDelete={() => handleDeleteReparto(reparto)}
              onToggleAttivo={() => handleToggleAttivoReparto(reparto)}
              onChange={load}
            />
          ))}
        </div>
      )}

      {/* Modal Reparto */}
      {showRepartoForm && (
        <RepartoFormModal
          reparto={editingReparto}
          onClose={() => { setShowRepartoForm(false); setEditingReparto(null) }}
          onSaved={() => { setShowRepartoForm(false); setEditingReparto(null); load() }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// CARD REPARTO (espandibile)
// ──────────────────────────────────────────────────────────
function RepartoCard({ reparto, expanded, onToggle, expandedLinee, onToggleLinea, onEdit, onDelete, onToggleAttivo, onChange }) {
  const [showLineaForm, setShowLineaForm] = useState(false)
  const [editingLinea, setEditingLinea] = useState(null)
  const linee = reparto.linee || []
  const totMacchine = linee.reduce((s, l) => s + (l.macchine?.length || 0), 0)

  async function handleDeleteLinea(linea) {
    if (!confirm(`🗑️ Eliminare la linea "${linea.nome}" e tutte le sue macchine?`)) return
    try {
      await api.delete(`/reparti/${reparto._id}/linee/${linea.id}`)
      onChange()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${!reparto.attivo ? 'opacity-60' : ''}`}>
      {/* Header reparto */}
      <div className="bg-indigo-50 border-l-4 border-indigo-500 px-3 py-2 flex items-center gap-2">
        <button onClick={onToggle} className="p-1 hover:bg-indigo-100 rounded">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <Factory size={20} className="text-indigo-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-900">{reparto.nome}</span>
            {reparto.codice && (
              <span className="font-mono text-xs px-1.5 py-0.5 bg-indigo-200 text-indigo-700 rounded">
                {reparto.codice}
              </span>
            )}
            <span className="text-xs text-gray-500">
              · {linee.length} linee · {totMacchine} macchine
            </span>
          </div>
          {reparto.descrizione && (
            <div className="text-xs text-gray-600 truncate">{reparto.descrizione}</div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleAttivo}
            className={`p-1 rounded hover:bg-white ${reparto.attivo ? 'text-green-600' : 'text-gray-400'}`}
            title={reparto.attivo ? 'Disattiva' : 'Attiva'}
          >
            {reparto.attivo ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button onClick={onEdit} className="p-1 hover:bg-yellow-100 rounded text-yellow-600" title="Modifica">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-100 rounded text-red-600" title="Elimina">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Linee espanse */}
      {expanded && (
        <div className="p-3 bg-white space-y-1.5">
          {linee.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400 italic">
              Nessuna linea. Aggiungi la prima!
            </div>
          ) : (
            linee.map(linea => (
              <LineaCard
                key={linea.id}
                reparto={reparto}
                linea={linea}
                expanded={expandedLinee.has(`${reparto._id}_${linea.id}`)}
                onToggle={() => onToggleLinea(`${reparto._id}_${linea.id}`)}
                onEdit={() => { setEditingLinea(linea); setShowLineaForm(true) }}
                onDelete={() => handleDeleteLinea(linea)}
                onChange={onChange}
              />
            ))
          )}
          <button
            onClick={() => { setEditingLinea(null); setShowLineaForm(true) }}
            className="w-full text-xs text-blue-600 hover:bg-blue-50 py-1.5 rounded border-2 border-dashed border-blue-200 flex items-center justify-center gap-1"
          >
            <Plus size={14} /> Aggiungi Linea
          </button>
        </div>
      )}

      {/* Modal Linea */}
      {showLineaForm && (
        <LineaFormModal
          reparto={reparto}
          linea={editingLinea}
          onClose={() => { setShowLineaForm(false); setEditingLinea(null) }}
          onSaved={() => { setShowLineaForm(false); setEditingLinea(null); onChange() }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// CARD LINEA (espandibile)
// ──────────────────────────────────────────────────────────
function LineaCard({ reparto, linea, expanded, onToggle, onEdit, onDelete, onChange }) {
  const [showMacchinaForm, setShowMacchinaForm] = useState(false)
  const [editingMacchina, setEditingMacchina] = useState(null)
  const macchine = linea.macchine || []

  async function handleDeleteMacchina(macchina) {
    if (!confirm(`🗑️ Eliminare la macchina "${macchina.nome}"?`)) return
    try {
      await api.delete(`/reparti/${reparto._id}/linee/${linea.id}/macchine/${macchina.id}`)
      onChange()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div className={`border-l-2 border-blue-300 ml-2 rounded transition-all ${!linea.attivo ? 'opacity-50' : ''}`}>
      {/* Header linea */}
      <div className="bg-blue-50 px-3 py-1.5 flex items-center gap-2 rounded-r">
        <button onClick={onToggle} className="p-0.5 hover:bg-blue-100 rounded">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="text-blue-600">🔹</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-900 text-sm">{linea.nome}</span>
            {linea.codice && (
              <span className="font-mono text-[10px] px-1 py-0.5 bg-blue-200 text-blue-700 rounded">
                {linea.codice}
              </span>
            )}
            <span className="text-[10px] text-gray-500">· {macchine.length} macchine</span>
          </div>
          {linea.descrizione && (
            <div className="text-[10px] text-gray-600 truncate">{linea.descrizione}</div>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={onEdit} className="p-0.5 hover:bg-yellow-100 rounded text-yellow-600" title="Modifica">
            <Edit2 size={12} />
          </button>
          <button onClick={onDelete} className="p-0.5 hover:bg-red-100 rounded text-red-600" title="Elimina">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Macchine espanse */}
      {expanded && (
        <div className="p-2 bg-white space-y-1 ml-2">
          {macchine.length === 0 ? (
            <div className="text-center py-2 text-[10px] text-gray-400 italic">
              Nessuna macchina. Aggiungi la prima!
            </div>
          ) : (
            macchine.map(m => (
              <div key={m.id} className={`flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-xs ${!m.attivo ? 'opacity-50' : ''}`}>
                <Cpu size={12} className="text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{m.nome}</span>
                  {m.codice && (
                    <span className="font-mono text-[10px] ml-2 px-1 py-0.5 bg-gray-200 text-gray-700 rounded">
                      {m.codice}
                    </span>
                  )}
                  {m.descrizione && (
                    <span className="text-[10px] text-gray-500 ml-2">· {m.descrizione}</span>
                  )}
                </div>
                <button
                  onClick={() => { setEditingMacchina(m); setShowMacchinaForm(true) }}
                  className="p-0.5 hover:bg-yellow-100 rounded text-yellow-600"
                  title="Modifica"
                >
                  <Edit2 size={11} />
                </button>
                <button
                  onClick={() => handleDeleteMacchina(m)}
                  className="p-0.5 hover:bg-red-100 rounded text-red-600"
                  title="Elimina"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
          <button
            onClick={() => { setEditingMacchina(null); setShowMacchinaForm(true) }}
            className="w-full text-[10px] text-gray-500 hover:bg-gray-100 py-1 rounded border border-dashed border-gray-300 flex items-center justify-center gap-1"
          >
            <Plus size={11} /> Aggiungi Macchina
          </button>
        </div>
      )}

      {/* Modal Macchina */}
      {showMacchinaForm && (
        <MacchinaFormModal
          reparto={reparto}
          linea={linea}
          macchina={editingMacchina}
          onClose={() => { setShowMacchinaForm(false); setEditingMacchina(null) }}
          onSaved={() => { setShowMacchinaForm(false); setEditingMacchina(null); onChange() }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// MODAL REPARTO
// ──────────────────────────────────────────────────────────
function RepartoFormModal({ reparto, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: reparto?.nome || '',
    codice: reparto?.codice || '',
    descrizione: reparto?.descrizione || '',
    attivo: reparto?.attivo !== false,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) return alert('Nome obbligatorio')
    setSaving(true)
    try {
      if (reparto?._id) {
        await api.put(`/reparti/${reparto._id}`, form)
      } else {
        await api.post('/reparti/', { ...form, linee: [] })
      }
      onSaved()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-indigo-600 text-white px-5 py-3 flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            <Factory size={20} /> {reparto ? `Modifica Reparto` : 'Nuovo Reparto'}
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome <span className="text-red-500">*</span></label>
            <input
              required
              autoFocus
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Es: Reparto Cioccolato"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Codice <span className="text-xs text-gray-500 font-normal ml-1">(opzionale)</span>
            </label>
            <input
              value={form.codice}
              onChange={(e) => setForm({ ...form, codice: e.target.value.toUpperCase() })}
              className="w-full border rounded-lg px-3 py-2 font-mono"
              placeholder="Es: CIO"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Es: Produzione cioccolato fondente e al latte"
            />
          </div>
          <label className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg cursor-pointer">
            <input type="checkbox" checked={form.attivo} onChange={(e) => setForm({ ...form, attivo: e.target.checked })} className="w-4 h-4" />
            <span className="text-sm">Attivo</span>
          </label>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Annulla</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              <Save size={16} />
              {saving ? 'Salvataggio...' : (reparto ? 'Salva' : 'Crea')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// MODAL LINEA
// ──────────────────────────────────────────────────────────
function LineaFormModal({ reparto, linea, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: linea?.nome || '',
    codice: linea?.codice || '',
    descrizione: linea?.descrizione || '',
    attivo: linea?.attivo !== false,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) return alert('Nome obbligatorio')
    setSaving(true)
    try {
      if (linea?.id) {
        await api.put(`/reparti/${reparto._id}/linee/${linea.id}`, {
          ...form,
          id: linea.id,
          macchine: linea.macchine || [],
        })
      } else {
        await api.post(`/reparti/${reparto._id}/linee`, { ...form, macchine: [] })
      }
      onSaved()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-blue-600 text-white px-5 py-3 flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            🔹 {linea ? 'Modifica Linea' : 'Nuova Linea'} <span className="text-xs opacity-70">in {reparto.nome}</span>
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome <span className="text-red-500">*</span></label>
            <input
              required
              autoFocus
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Es: Linea Bindler 11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Codice <span className="text-xs text-gray-500 font-normal ml-1">(opzionale)</span>
            </label>
            <input
              value={form.codice}
              onChange={(e) => setForm({ ...form, codice: e.target.value.toUpperCase() })}
              className="w-full border rounded-lg px-3 py-2 font-mono"
              placeholder="Es: B11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Es: Tavolette 100g cioccolato fondente"
            />
          </div>
          <label className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg cursor-pointer">
            <input type="checkbox" checked={form.attivo} onChange={(e) => setForm({ ...form, attivo: e.target.checked })} className="w-4 h-4" />
            <span className="text-sm">Attiva</span>
          </label>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Annulla</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              <Save size={16} />
              {saving ? 'Salvataggio...' : (linea ? 'Salva' : 'Crea')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// MODAL MACCHINA
// ──────────────────────────────────────────────────────────
function MacchinaFormModal({ reparto, linea, macchina, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: macchina?.nome || '',
    codice: macchina?.codice || '',
    descrizione: macchina?.descrizione || '',
    attivo: macchina?.attivo !== false,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) return alert('Nome obbligatorio')
    setSaving(true)
    try {
      if (macchina?.id) {
        await api.put(`/reparti/${reparto._id}/linee/${linea.id}/macchine/${macchina.id}`, {
          ...form,
          id: macchina.id,
        })
      } else {
        await api.post(`/reparti/${reparto._id}/linee/${linea.id}/macchine`, form)
      }
      onSaved()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-gray-600 text-white px-5 py-3 flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            <Cpu size={20} /> {macchina ? 'Modifica Macchina' : 'Nuova Macchina'} 
            <span className="text-xs opacity-70">in {linea.nome}</span>
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome <span className="text-red-500">*</span></label>
            <input
              required
              autoFocus
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Es: Conca 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Codice <span className="text-xs text-gray-500 font-normal ml-1">(opzionale)</span>
            </label>
            <input
              value={form.codice}
              onChange={(e) => setForm({ ...form, codice: e.target.value.toUpperCase() })}
              className="w-full border rounded-lg px-3 py-2 font-mono"
              placeholder="Es: CON-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Es: Conca rotativa 2000kg"
            />
          </div>
          <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer">
            <input type="checkbox" checked={form.attivo} onChange={(e) => setForm({ ...form, attivo: e.target.checked })} className="w-4 h-4" />
            <span className="text-sm">Attiva</span>
          </label>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Annulla</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
              <Save size={16} />
              {saving ? 'Salvataggio...' : (macchina ? 'Salva' : 'Crea')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// CONFIG MANAGER (CRUD generico per tutti i tab)
// ──────────────────────────────────────────────────────────
function ConfigManager({ tipo, label, color, onChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { load() }, [tipo, search])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tipo })
      if (search) params.append('search', search)
      const res = await api.get(`/configurazioni/?${params.toString()}`)
      setItems(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, itemLabel) {
    if (!confirm(`Eliminare "${itemLabel}"?`)) return
    try {
      await api.delete(`/configurazioni/${id}`)
      load()
      onChange?.()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function handleToggle(id) {
    try {
      await api.patch(`/configurazioni/${id}/toggle`)
      load()
      onChange?.()
    } catch (err) {
      alert('Errore: ' + err.message)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Toolbar */}
      <div className="p-4 border-b flex justify-between items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cerca in ${label.toLowerCase()}...`}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light text-sm font-medium"
        >
          <Plus size={16} /> Aggiungi voce
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">⏳ Caricamento...</div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-6xl mb-2">📭</div>
          <p className="text-gray-500 mb-3">
            {search ? 'Nessun risultato' : `Nessuna voce ancora configurata`}
          </p>
          {!search && (
            <button
              onClick={() => { setEditing(null); setShowForm(true) }}
              className="text-primary hover:underline"
            >
              + Aggiungi la prima voce
            </button>
          )}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left w-12"></th>
              <th className="px-3 py-2 text-left w-16">Icon</th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-left w-32">Codice</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left w-20">Stato</th>
              <th className="px-3 py-2 text-center w-32">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item._id} className={`border-b hover:bg-gray-50 ${!item.attivo ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 text-gray-300">
                  <GripVertical size={16} />
                </td>
                <td className="px-3 py-2 text-2xl">{item.icon || '—'}</td>
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    {item.color && (
                      <span 
                        className="w-3 h-3 rounded-full inline-block" 
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    {item.label}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.codice}</td>
                <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-md">{item.descrizione || '—'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleToggle(item._id)}
                    className={`px-2 py-1 rounded-full text-xs ${
                      item.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {item.attivo ? '✅ Attivo' : '⏸️ Disattivo'}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => handleToggle(item._id)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title={item.attivo ? 'Disattiva' : 'Attiva'}
                    >
                      {item.attivo ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => { setEditing(item); setShowForm(true) }}
                      className="p-1 hover:bg-yellow-100 rounded text-yellow-600"
                      title="Modifica"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id, item.label)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                      title="Elimina"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Form Modal */}
      {showForm && (
        <ConfigForm
          tipo={tipo}
          label={label}
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); onChange?.() }}
        />
      )}
    </div>
  )
}
// ──────────────────────────────────────────────────────────
// FORM CREATE/EDIT
// ──────────────────────────────────────────────────────────
function ConfigForm({ tipo, label, item, onClose, onSaved }) {
  const [form, setForm] = useState({
    label: item?.label || '',
    codice: item?.codice || '',
    descrizione: item?.descrizione || '',
    icon: item?.icon || '',
    color: item?.color || '',
    attivo: item?.attivo !== false,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.label.trim()) return alert('Label obbligatoria')
    setSaving(true)
    try {
      const payload = {
        ...form,
        tipo,
        codice: form.codice.trim() || null,
      }
      if (item?._id) {
        await api.put(`/configurazioni/${item._id}`, payload)
      } else {
        await api.post('/configurazioni/', payload)
      }
      onSaved()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="bg-primary text-white px-5 py-3 flex justify-between items-center">
          <h2 className="font-semibold">
            {item ? '✏️ Modifica' : '➕ Nuova voce'} — {label}
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              required
              autoFocus
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Es: Sicurezza"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Codice
              <span className="text-xs text-gray-500 font-normal ml-1">(auto se vuoto)</span>
            </label>
            <input
              value={form.codice}
              onChange={(e) => setForm({ ...form, codice: e.target.value.toUpperCase() })}
              className="w-full border rounded-lg px-3 py-2 font-mono"
              placeholder="Es: SIC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Es: Interventi per sicurezza sul lavoro"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Icon <span className="text-xs text-gray-500 font-normal">(emoji)</span>
              </label>
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-2xl text-center"
                placeholder="📋"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Colore</label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={form.color || '#3b82f6'}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-12 h-10 border rounded cursor-pointer"
                />
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="flex-1 border rounded-lg px-2 py-2 text-sm font-mono"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={form.attivo}
              onChange={(e) => setForm({ ...form, attivo: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">
              Attivo <span className="text-xs text-gray-500">(visibile nei menu/tendine)</span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Salvataggio...' : (item ? 'Salva' : 'Crea')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// PILLARS MANAGER (componente dedicato per Pillar TPM)
// ──────────────────────────────────────────────────────────
function PillarsManager({ onChange }) {
  const [pillars, setPillars] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { load() }, [search])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const res = await api.get(`/pillars/?${params.toString()}`)
      setPillars(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(pillar) {
    const confirmMsg = `🗑️ Eliminare il Pillar "${pillar.sigla} - ${pillar.label}"?\n\n⚠️ I Kaizen collegati a questo pillar perderanno il riferimento (ma non saranno eliminati).`
    if (!confirm(confirmMsg)) return
    try {
      const res = await api.delete(`/pillars/${pillar._id}`)
      alert(`✅ Pillar eliminato. ${res.data?.kaizens_scollegati || 0} Kaizen scollegati.`)
      load()
      onChange?.()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function handleToggleActive(pillar) {
    try {
      await api.put(`/pillars/${pillar._id}`, { attivo: !pillar.attivo })
      load()
      onChange?.()
    } catch (err) {
      alert('Errore: ' + err.message)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Toolbar */}
      <div className="p-4 border-b flex justify-between items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca pillar per sigla, nome o descrizione..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light text-sm font-medium"
        >
          <Plus size={16} /> Aggiungi Pillar
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">⏳ Caricamento...</div>
      ) : pillars.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-6xl mb-2">🏛️</div>
          <p className="text-gray-500 mb-3">
            {search ? 'Nessun pillar trovato' : 'Nessun pillar configurato'}
          </p>
          {!search && (
            <>
              <p className="text-xs text-gray-400 mb-3">
                💡 I Pillar sono le funzioni TPM (FI, AM, PM, ecc.) che organizzano i Kaizen e il 5 Step KPI Management
              </p>
              <button
                onClick={() => { setEditing(null); setShowForm(true) }}
                className="text-primary hover:underline"
              >
                + Aggiungi il primo Pillar
              </button>
            </>
          )}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left w-16">Icon</th>
              <th className="px-3 py-2 text-left w-24">Sigla</th>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left w-40">Leader</th>
              <th className="px-3 py-2 text-left w-24">Anno</th>
              <th className="px-3 py-2 text-left w-20">Stato</th>
              <th className="px-3 py-2 text-center w-32">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pillars.map(p => (
              <tr key={p._id} className={`border-b hover:bg-gray-50 ${!p.attivo ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 text-2xl">{p.icon || '🏛️'}</td>
                <td className="px-3 py-2 font-mono font-bold text-primary">
                  {p.color && (
                    <span 
                      className="inline-block w-2 h-2 rounded-full mr-1" 
                      style={{ backgroundColor: p.color }}
                    />
                  )}
                  {p.sigla}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{p.label}</div>
                  {p.descrizione && (
                    <div className="text-xs text-gray-500 truncate max-w-md">{p.descrizione}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{p.leader || '—'}</td>
                <td className="px-3 py-2 text-xs">{p.anno || '—'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleToggleActive(p)}
                    className={`px-2 py-1 rounded-full text-xs ${
                      p.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {p.attivo ? '✅ Attivo' : '⏸️ Disattivo'}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => handleToggleActive(p)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title={p.attivo ? 'Disattiva' : 'Attiva'}
                    >
                      {p.attivo ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => { setEditing(p); setShowForm(true) }}
                      className="p-1 hover:bg-yellow-100 rounded text-yellow-600"
                      title="Modifica"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                      title="Elimina"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Form */}
      {showForm && (
        <PillarForm
          pillar={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); onChange?.() }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// PILLAR FORM (create/edit) — invariato dal tuo file
// ──────────────────────────────────────────────────────────
function PillarForm({ pillar, onClose, onSaved }) {
  const [form, setForm] = useState({
    sigla: pillar?.sigla || '',
    label: pillar?.label || '',
    descrizione: pillar?.descrizione || '',
    icon: pillar?.icon || '🏛️',
    color: pillar?.color || '#6366f1',
    leader: pillar?.leader || '',
    leader_email: pillar?.leader_email || '',
    members: pillar?.members?.join(', ') || '',
    anno: pillar?.anno || new Date().getFullYear(),
    note: pillar?.note || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.sigla.trim()) return alert('Sigla obbligatoria')
    if (!form.label.trim()) return alert('Nome obbligatorio')
    setSaving(true)
    try {
      const payload = {
        ...form,
        sigla: form.sigla.trim().toUpperCase(),
        members: form.members.split(',').map(m => m.trim()).filter(Boolean),
        anno: parseInt(form.anno) || new Date().getFullYear(),
      }
      if (pillar?._id) {
        await api.put(`/pillars/${pillar._id}`, payload)
      } else {
        await api.post('/pillars/', payload)
      }
      onSaved()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="bg-indigo-600 text-white px-5 py-3 flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            🏛️ {pillar ? `Modifica Pillar ${pillar.sigla}` : 'Nuovo Pillar'}
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Sigla <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 font-normal ml-1">(2-4 lettere)</span>
              </label>
              <input
                required
                autoFocus
                maxLength={6}
                value={form.sigla}
                onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase() })}
                className="w-full border rounded-lg px-3 py-2 font-mono font-bold text-lg uppercase"
                placeholder="FI"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Anno di riferimento
              </label>
              <input
                type="number"
                value={form.anno}
                onChange={(e) => setForm({ ...form, anno: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                min="2020"
                max="2050"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Focused Improvement"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Es: Pilastro focalizzato sull'eliminazione delle perdite tramite progetti mirati"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Icon <span className="text-xs text-gray-500 font-normal">(emoji)</span>
              </label>
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-2xl text-center"
                placeholder="🎯"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Colore</label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={form.color || '#6366f1'}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-12 h-10 border rounded cursor-pointer"
                />
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="flex-1 border rounded-lg px-2 py-2 text-sm font-mono"
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Leader</label>
              <input
                value={form.leader}
                onChange={(e) => setForm({ ...form, leader: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Maurizio Rota"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email Leader</label>
              <input
                type="email"
                value={form.leader_email}
                onChange={(e) => setForm({ ...form, leader_email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="mrota@lindt.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Membri del team
              <span className="text-xs text-gray-500 font-normal ml-1">(separati da virgola)</span>
            </label>
            <input
              value={form.members}
              onChange={(e) => setForm({ ...form, members: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Giovanni Tosi, Antonio Palma, Mirko De Simone"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Note opzionali..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Salvataggio...' : (pillar ? 'Salva' : 'Crea Pillar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
