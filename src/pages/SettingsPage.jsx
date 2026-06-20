import { useState, useEffect } from 'react'
import { Settings, Plus, Edit2, Trash2, Eye, EyeOff, X, Save, Search, GripVertical } from 'lucide-react'
import api from '../services/api'

// ──────────────────────────────────────────────────────────
// CONFIG: definisce i 7 tab disponibili
// ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'tipi_kaizen', label: 'Tipologie Kaizen', icon: '📋', color: 'blue', 
    hint: 'Es: Quick Kaizen, Standard Kaizen, Major Kaizen' },
  { id: 'categorie_action_plan', label: 'Categorie Action Plan', icon: '🎯', color: 'green',
    hint: 'Es: Sicurezza, Qualità, Manutenzione, 5S' },
  { id: 'categorie_documento', label: 'Categorie Documenti', icon: '📚', color: 'purple',
    hint: 'Es: Operativa, Sicurezza, Manutenzione' },
  { id: 'tipi_perdita', label: 'Tipi Perdita', icon: '💥', color: 'red',
    hint: 'Es: Guasto, Setup, Microfermata, Scarti (16 Big Losses TPM)' },
  { id: 'categorie_perdita', label: 'Categorie Perdita', icon: '🟥', color: 'orange',
    hint: 'Es: Disponibilità, Prestazione, Qualità, Organizzative' },
  { id: 'reparti', label: 'Reparti', icon: '🏭', color: 'indigo',
    hint: 'Es: Confezionamento, Cioccolato, Qualità' },
  { id: 'argomenti', label: 'Argomenti / Tag', icon: '🏷️', color: 'pink',
    hint: 'Es: sicurezza, efficienza, OEE, 5S (per #hashtag nei kaizen e action plan)' },
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

// ──────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const [stats, setStats] = useState({})

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    try {
      const res = await api.get('/configurazioni/stats')
      setStats(res.data)
    } catch (err) { console.error(err) }
  }

  const currentTab = TABS.find(t => t.id === activeTab)

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings size={28} /> Settings
          </h1>
          <p className="text-gray-500 text-sm">
            Configura tipologie, categorie e voci di sistema
          </p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="bg-white rounded-lg shadow-sm p-2 flex flex-wrap gap-1">
        {TABS.map(tab => {
          const count = stats[tab.id]?.attive || 0
          const totale = stats[tab.id]?.totale || 0
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                isActive
                  ? `${TAB_COLORS[tab.color]} border-2 shadow-sm`
                  : 'text-gray-600 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
              {totale > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white bg-opacity-70' : 'bg-gray-200'
                }`}>
                  {count}
                  {totale !== count && ` / ${totale}`}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* HINT del tab corrente */}
      <div className={`p-3 rounded-lg border-l-4 ${TAB_COLORS[currentTab.color]} bg-opacity-30`}>
        <div className="text-sm">
          <strong>{currentTab.icon} {currentTab.label}:</strong> {currentTab.hint}
        </div>
      </div>

      {/* CONTENUTO TAB */}
      <ConfigManager
        key={activeTab}
        tipo={activeTab}
        label={currentTab.label}
        color={currentTab.color}
        onChange={loadStats}
      />
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
          <Plus size={16} /> Aggiungi {label.replace('Tipologie ', '').replace('Categorie ', '').slice(0, -1)}
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
