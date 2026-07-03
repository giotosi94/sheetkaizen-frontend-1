import { useState, useEffect, useMemo, Fragment } from 'react'
import { Plus, Trash2, Users, Calendar, Copy, Settings as SettingsIcon, X } from 'lucide-react'
import api from '../../services/api'
import { useAllConfigurations } from '../../hooks/useConfigurations'
import UserPicker from '../UserPicker'
import SkillRadarChart from './SkillRadarChart'

const LIVELLI = [
  { v: 1, label: 'Non conoscere la teoria', color: '#fee2e2', text: '#991b1b' },
  { v: 2, label: 'Conoscere la teoria', color: '#fef3c7', text: '#92400e' },
  { v: 3, label: 'STD', color: '#dbeafe', text: '#1e40af' },
  { v: 4, label: 'NON STD', color: '#d1fae5', text: '#065f46' },
  { v: 5, label: 'Saper insegnare', color: '#a7f3d0', text: '#064e3b' },
]

export default function SkillMatrixTab({ pillar, color }) {
  const { configs } = useAllConfigurations()
  const categorieConfig = configs.categoria_skill || []

  const [availableYears, setAvailableYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [matrix, setMatrix] = useState(null)
  const [competenze, setCompetenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfigCompetenze, setShowConfigCompetenze] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [showAddMember, setShowAddMember] = useState(false)

  useEffect(() => {
    loadYears()
    loadCompetenze()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillar._id])

  useEffect(() => {
    if (selectedYear) loadMatrix()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, pillar._id])

  async function loadYears() {
    try {
      const res = await api.get(`/pillars/${pillar._id}/skill-matrix`)
      setAvailableYears(res.data || [])
    } catch (err) { console.error(err) }
  }

  async function loadCompetenze() {
    try {
      const res = await api.get(`/pillars/${pillar._id}/skill-competenze`)
      setCompetenze(res.data || [])
    } catch (err) { console.error(err) }
  }

  async function loadMatrix() {
    setLoading(true)
    try {
      const res = await api.get(`/pillars/${pillar._id}/skill-matrix/${selectedYear}`)
      setMatrix(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function saveMatrix(updates) {
    setSaving(true)
    try {
      const res = await api.put(`/pillars/${pillar._id}/skill-matrix/${selectedYear}`, updates)
      setMatrix(res.data)
      loadYears()
    } catch (err) {
      alert('Errore salvataggio: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  async function duplicateFromPrevious(fromYear) {
    try {
      await api.post(`/pillars/${pillar._id}/skill-matrix/${selectedYear}/duplicate-from/${fromYear}`)
      loadMatrix()
      loadYears()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function createNewYear() {
    const newYear = prompt('Anno per nuova skill matrix:', new Date().getFullYear())
    if (!newYear) return
    const y = parseInt(newYear)
    if (isNaN(y) || y < 2020 || y > 2050) {
      alert('Anno non valido')
      return
    }
    setSelectedYear(y)
  }

  function updateCella(memberId, competenzaId, field, value) {
    const key = `${memberId}_${competenzaId}`
    const currentVal = matrix.valori?.[key] || {}
    const newCell = { ...currentVal }
    newCell[field] = value === '' ? null : parseInt(value)

    const newValori = { ...(matrix.valori || {}) }
    newValori[key] = newCell

    setMatrix({ ...matrix, valori: newValori })

    if (window._skillMatrixSaveTimer) clearTimeout(window._skillMatrixSaveTimer)
    window._skillMatrixSaveTimer = setTimeout(() => {
      saveMatrix({ valori: newValori })
    }, 500)
  }

  function addMember(selected) {
    if (!selected) return
    const currentMembers = matrix?.members || []
    if (currentMembers.find(m => m.user_id === selected.id)) {
      alert('Utente già presente')
      return
    }
    const newMembers = [...currentMembers, { user_id: selected.id, user_name: selected.name }]
    saveMatrix({ members: newMembers })
    setShowAddMember(false)
  }

  function removeMember(userId) {
    if (!confirm('Rimuovere questo utente dalla matrice?')) return
    const newMembers = (matrix?.members || []).filter(m => m.user_id !== userId)
    const newValori = { ...(matrix?.valori || {}) }
    Object.keys(newValori).forEach(k => {
      if (k.startsWith(`${userId}_`)) delete newValori[k]
    })
    saveMatrix({ members: newMembers, valori: newValori })
  }

  const radarDataForMember = useMemo(() => {
    if (!matrix || !selectedMemberId) return []
    return categorieConfig.filter(c => c.attivo !== false).map(cat => {
      const catId = cat._id
      const catCompetenze = competenze.filter(c => c.categoria_id === catId)
      let sSum = 0, cSum = 0, tSum = 0, count = 0
      catCompetenze.forEach(comp => {
        const key = `${selectedMemberId}_${comp._id}`
        const cell = matrix.valori?.[key]
        if (cell) {
          const s = Number(cell.starting)
          const c = Number(cell.current)
          const t = Number(cell.target)
          if (!isNaN(s) && s > 0) sSum += s
          if (!isNaN(c) && c > 0) cSum += c
          if (!isNaN(t) && t > 0) tSum += t
          if (!isNaN(s) || !isNaN(c) || !isNaN(t)) count++
        }
      })
      return {
        categoria: cat.label,
        starting: count > 0 ? sSum / count : 0,
        current: count > 0 ? cSum / count : 0,
        target: count > 0 ? tSum / count : 0,
      }
    })
  }, [matrix, selectedMemberId, competenze, categorieConfig])

  const radarDataForPillar = useMemo(() => {
    if (!matrix || !matrix.members || matrix.members.length === 0) return []
    return categorieConfig.filter(c => c.attivo !== false).map(cat => {
      const catId = cat._id
      const catCompetenze = competenze.filter(c => c.categoria_id === catId)
      let totS = 0, totC = 0, totT = 0, count = 0
      matrix.members.forEach(m => {
        catCompetenze.forEach(comp => {
          const key = `${m.user_id}_${comp._id}`
          const cell = matrix.valori?.[key]
          if (cell) {
            if (cell.starting !== null && cell.starting !== undefined) totS += cell.starting
            if (cell.current !== null && cell.current !== undefined) totC += cell.current
            if (cell.target !== null && cell.target !== undefined) totT += cell.target
            count++
          }
        })
      })
      return {
        categoria: cat.label,
        starting: count > 0 ? totS / count : 0,
        current: count > 0 ? totC / count : 0,
        target: count > 0 ? totT / count : 0,
      }
    })
  }, [matrix, competenze, categorieConfig])

  if (loading || !matrix) {
    return <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">Caricamento skill matrix...</div>
  }

  const members = matrix.members || []

  const competenzePerCategoria = {}
  categorieConfig.filter(c => c.attivo !== false).forEach(cat => {
    competenzePerCategoria[cat._id] = {
      categoria: cat,
      items: competenze.filter(c => c.categoria_id === cat._id),
    }
  })

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-gray-600" />
            <label className="text-sm font-medium">Anno:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border rounded-lg px-3 py-1.5 text-sm font-bold"
            >
              {availableYears.map(y => (
                <option key={y.anno} value={y.anno}>{y.anno}</option>
              ))}
              {!availableYears.find(y => y.anno === selectedYear) && (
                <option value={selectedYear}>{selectedYear} (nuovo)</option>
              )}
            </select>
            <button
              onClick={createNewYear}
              className="text-xs px-3 py-1.5 border-2 rounded-lg hover:bg-gray-50"
              style={{ borderColor: color, color }}
            >
              <Plus size={12} className="inline mr-1" /> Nuovo anno
            </button>
            {availableYears.length > 1 && (
              <button
                onClick={() => {
                  const prev = availableYears.find(y => y.anno < selectedYear)
                  if (prev && confirm(`Duplicare dati dall'anno ${prev.anno}? Il Current diventerà il nuovo Starting.`)) {
                    duplicateFromPrevious(prev.anno)
                  }
                }}
                className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50"
              >
                <Copy size={12} className="inline mr-1" /> Duplica anno precedente
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{members.length} membri</span>
            <span>·</span>
            <span>{competenze.length} competenze</span>
            {saving && <span className="text-blue-600 ml-2">Salvataggio...</span>}
          </div>

          <button
            onClick={() => setShowConfigCompetenze(true)}
            className="px-3 py-1.5 rounded-lg text-sm text-white flex items-center gap-2"
            style={{ backgroundColor: color }}
          >
            <SettingsIcon size={14} /> Configura Competenze
          </button>
        </div>
      </div>

      {competenze.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-4 text-sm text-yellow-800">
          <strong>Nessuna competenza configurata.</strong> Clicca "Configura Competenze" per definire le skill di questo pillar.
        </div>
      )}

      {members.length === 0 && competenze.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-4 text-sm text-yellow-800">
          <strong>Nessun membro nella matrice.</strong>{' '}
          <button
            onClick={() => setShowAddMember(true)}
            className="underline font-medium hover:text-yellow-900"
          >
            Aggiungi il primo membro
          </button>
        </div>
      )}

      {/* MATRICE */}
      {competenze.length > 0 && members.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 border-b border-r p-2 text-left font-bold min-w-[200px]">
                  Membri
                </th>
                {Object.values(competenzePerCategoria).map(({ categoria, items }) => (
                  items.length > 0 && (
                    <th
                      key={categoria._id}
                      colSpan={items.length * 3}
                      className="border-b p-2 text-center font-bold text-white text-[11px]"
                      style={{ backgroundColor: categoria.color || '#6366f1' }}
                    >
                      {categoria.icon ? `${categoria.icon} ` : ''}{categoria.label}
                    </th>
                  )
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 bg-gray-50 z-10 border-b border-r p-2"></th>
                {Object.values(competenzePerCategoria).map(({ items }) => (
                  items.map(comp => (
                    <th
                      key={comp._id}
                      colSpan={3}
                      className="border-b border-r p-1 text-[10px] font-medium text-gray-700 bg-gray-50"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', height: 120, minWidth: 90 }}
                      title={comp.label}
                    >
                      {comp.codice && <span className="text-gray-400 font-mono">{comp.codice} </span>}
                      {comp.label}
                    </th>
                  ))
                ))}
              </tr>
              <tr className="bg-gray-100 text-[9px] font-bold text-gray-600 uppercase">
                <th className="sticky left-0 bg-gray-100 z-10 border-b border-r p-1 text-left">Nome</th>
                {Object.values(competenzePerCategoria).map(({ items }) => (
                  items.map(comp => (
                    <Fragment key={`${comp._id}_head_sct`}>
                      <th className="border-b p-1 text-center bg-red-50 text-red-700">S</th>
                      <th className="border-b p-1 text-center bg-amber-50 text-amber-700">C</th>
                      <th className="border-b border-r p-1 text-center bg-emerald-50 text-emerald-700">T</th>
                    </Fragment>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.user_id}>
                  <td className="sticky left-0 bg-white z-10 border-b border-r p-2 font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedMemberId(selectedMemberId === m.user_id ? null : m.user_id)}
                        className={`flex-1 text-left hover:underline ${selectedMemberId === m.user_id ? 'font-bold' : ''}`}
                        style={selectedMemberId === m.user_id ? { color } : {}}
                      >
                        {m.user_name}
                      </button>
                      <button
                        onClick={() => removeMember(m.user_id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                        title="Rimuovi"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                  {Object.values(competenzePerCategoria).map(({ items }) => (
                    items.map(comp => {
                      const key = `${m.user_id}_${comp._id}`
                      const cell = matrix.valori?.[key] || {}
                      return (
                        <Fragment key={key}>
                          <LevelCell value={cell.starting} onChange={(v) => updateCella(m.user_id, comp._id, 'starting', v)} bg="bg-red-50" />
                          <LevelCell value={cell.current} onChange={(v) => updateCella(m.user_id, comp._id, 'current', v)} bg="bg-amber-50" />
                          <LevelCell value={cell.target} onChange={(v) => updateCella(m.user_id, comp._id, 'target', v)} bg="bg-emerald-50" borderR />
                        </Fragment>
                      )
                    })
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-3 border-t bg-gray-50">
            <button
              onClick={() => setShowAddMember(true)}
              className="text-xs px-3 py-1.5 border-2 border-dashed rounded-lg hover:bg-white"
              style={{ borderColor: color, color }}
            >
              <Plus size={12} className="inline mr-1" /> Aggiungi membro
            </button>
          </div>
        </div>
      )}

      {/* RADAR CHARTS */}
      {competenze.length > 0 && members.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkillRadarChart
            data={radarDataForPillar}
            title={`${pillar.sigla} — Skill Matrix Pillar`}
            subtitle={`Media team · Anno ${selectedYear}`}
          />
          {selectedMemberId ? (
            <SkillRadarChart
              data={radarDataForMember}
              title={`Skill Radar Personale`}
              subtitle={members.find(m => m.user_id === selectedMemberId)?.user_name || ''}
            />
          ) : (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-400 flex items-center justify-center">
              <div>
                <Users size={40} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Clicca su un nome nella tabella per vedere il suo radar personale</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal config competenze */}
      {showConfigCompetenze && (
        <ConfigCompetenzeModal
          pillar={pillar}
          color={color}
          competenze={competenze}
          categorieConfig={categorieConfig}
          onClose={() => setShowConfigCompetenze(false)}
          onSaved={() => { loadCompetenze(); loadMatrix() }}
        />
      )}

      {/* Modal aggiungi membro */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-5 py-3 border-b flex justify-between items-center" style={{ backgroundColor: color, color: 'white' }}>
              <h3 className="font-bold">Aggiungi membro</h3>
              <button onClick={() => setShowAddMember(false)} className="hover:bg-white hover:bg-opacity-20 p-1 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <UserPicker
                value={null}
                onChange={addMember}
                mode="single"
                placeholder="Cerca utente da aggiungere..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// LEVEL CELL
// ─────────────────────────────────────────────

function LevelCell({ value, onChange, bg = '', borderR = false }) {
  const livello = LIVELLI.find(l => l.v === value)
  return (
    <td
      className={`border-b p-0 ${borderR ? 'border-r' : ''} ${bg}`}
      style={{ minWidth: 30, width: 30 }}
    >
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full px-1 py-1 text-center text-xs font-bold border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
        style={{
          backgroundColor: livello?.color || 'transparent',
          color: livello?.text || '#6b7280',
        }}
      >
        <option value="">—</option>
        {LIVELLI.map(l => (
          <option key={l.v} value={l.v}>{l.v}</option>
        ))}
      </select>
    </td>
  )
}

// ─────────────────────────────────────────────
// CONFIG COMPETENZE MODAL
// ─────────────────────────────────────────────

function ConfigCompetenzeModal({ pillar, color, competenze, categorieConfig, onClose, onSaved }) {
  const [items, setItems] = useState(competenze)

  async function addCompetenza(categoria_id) {
    try {
      const res = await api.post(`/pillars/${pillar._id}/skill-competenze`, {
        label: 'Nuova competenza',
        codice: '',
        categoria_id,
        ordine: items.length,
      })
      setItems([...items, res.data])
    } catch (err) {
      alert('Errore: ' + err.message)
    }
  }

  async function updateCompetenza(id, updates) {
    try {
      const res = await api.put(`/pillars/${pillar._id}/skill-competenze/${id}`, updates)
      setItems(items.map(i => i._id === id ? res.data : i))
    } catch (err) {
      alert('Errore: ' + err.message)
    }
  }

  async function removeCompetenza(id) {
    if (!confirm('Eliminare questa competenza?')) return
    try {
      await api.delete(`/pillars/${pillar._id}/skill-competenze/${id}`)
      setItems(items.filter(i => i._id !== id))
    } catch (err) {
      alert('Errore: ' + err.message)
    }
  }

  function handleClose() {
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-3 border-b flex justify-between items-center sticky top-0 z-10" style={{ backgroundColor: color, color: 'white' }}>
          <h3 className="font-bold">Configura Competenze — {pillar.sigla}</h3>
          <button onClick={handleClose} className="hover:bg-white hover:bg-opacity-20 p-1 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600">
            Le competenze sono organizzate per categoria (definite in Settings → Skill Matrix).
            Aggiungi una competenza per ogni skill valutabile del pillar.
          </div>

          {categorieConfig.filter(c => c.attivo !== false).map(cat => {
            const catItems = items.filter(i => i.categoria_id === cat._id)
            return (
              <div key={cat._id} className="border rounded-lg overflow-hidden">
                <div
                  className="px-3 py-2 flex justify-between items-center text-white font-bold text-sm"
                  style={{ backgroundColor: cat.color || '#6366f1' }}
                >
                  <span>{cat.icon ? `${cat.icon} ` : ''}{cat.label}</span>
                  <button
                    onClick={() => addCompetenza(cat._id)}
                    className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Plus size={12} /> Aggiungi
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {catItems.length === 0 ? (
                    <div className="text-xs text-gray-400 italic py-2 text-center">
                      Nessuna competenza in questa categoria
                    </div>
                  ) : (
                    catItems.map(item => (
                      <div key={item._id} className="grid grid-cols-12 gap-2 items-center p-1 hover:bg-gray-50 rounded">
                        <input
                          value={item.codice || ''}
                          onChange={(e) => updateCompetenza(item._id, { codice: e.target.value })}
                          className="col-span-2 border rounded px-2 py-1 text-xs font-mono"
                          placeholder="Codice"
                        />
                        <input
                          value={item.label}
                          onChange={(e) => updateCompetenza(item._id, { label: e.target.value })}
                          className="col-span-8 border rounded px-2 py-1 text-sm"
                          placeholder="Nome competenza"
                        />
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={item.livello_target_default || ''}
                          onChange={(e) => updateCompetenza(item._id, { livello_target_default: e.target.value ? parseInt(e.target.value) : null })}
                          className="col-span-1 border rounded px-2 py-1 text-xs text-center"
                          placeholder="T"
                          title="Target default"
                        />
                        <button
                          onClick={() => removeCompetenza(item._id)}
                          className="col-span-1 text-red-500 hover:bg-red-50 p-1 rounded justify-self-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {categorieConfig.length === 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-800 rounded-r-lg">
              <strong>Nessuna categoria configurata.</strong> Vai in Settings → Skill Matrix → Categorie Competenze per aggiungerle.
            </div>
          )}

          <div className="flex justify-end pt-3 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: color }}
            >
              Fatto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
