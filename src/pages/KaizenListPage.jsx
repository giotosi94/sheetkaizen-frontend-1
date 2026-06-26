import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Plus, Search, Trash2, CheckCircle, RotateCcw } from 'lucide-react'
import { useAllConfigurations } from '../hooks/useConfigurations'
import { usePillars } from '../hooks/usePillars'
import { useAuth } from '../context/AuthContext'
import UserPicker from '../components/UserPicker'

const TIPOLOGIE_KAIZEN = [
  { value: 'Quick', label: 'Quick Kaizen', desc: 'Risoluzione rapida (1-3 giorni)' },
  { value: 'Standard', label: 'Standard Kaizen', desc: 'Progetto strutturato (1-4 settimane)' },
  { value: 'Major', label: 'Major Kaizen', desc: 'Iniziativa Pillar (1-3 mesi)' },
]

const INITIAL_KAIZEN = {
  titolo: '',
  tipo: 'Quick',
  reparto: '',
  linea: '',
  macchina: '',
  tipo_perdita: '',
  pillar_id: '',
  // Team
  team_leader_id: null,
  team_leader_nome: '',
  team_members_ids: [],
  team_members_nomi: [],
  team_members_data: [],
}

function giorniDaApertura(dataApertura) {
  if (!dataApertura) return null
  const apertura = new Date(dataApertura)
  const oggi = new Date()
  return Math.floor((oggi - apertura) / (1000 * 60 * 60 * 24))
}

function GiorniBadge({ giorni, stato }) {
  if (giorni === null) return <span className="text-gray-400">—</span>
  if (stato === 'Chiuso') return <span className="text-xs text-gray-500">Chiuso</span>

  let colorClass = 'text-green-700 bg-green-50'
  if (giorni > 30) colorClass = 'text-red-700 bg-red-50'
  else if (giorni > 7) colorClass = 'text-yellow-700 bg-yellow-50'

  const label = giorni === 0 ? 'oggi' : `${giorni} giorni`
  return <span className={`text-xs px-2 py-0.5 rounded ${colorClass}`}>{label}</span>
}

export default function KaizenListPage() {
  const [kaizens, setKaizens] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newKaizen, setNewKaizen] = useState(INITIAL_KAIZEN)
  const [filterTipo, setFilterTipo] = useState('')
  const [filterPillar, setFilterPillar] = useState('')
  const [filterStato, setFilterStato] = useState('')

  const { configs } = useAllConfigurations()
  const { pillars } = usePillars()
  const { user } = useAuth()

  // Carico reparti gerarchici (con linee + macchine annidate)
  const [reparti, setReparti] = useState([])
  useEffect(() => {
    api.get('/reparti/').then(res => setReparti(res.data || [])).catch(() => setReparti([]))
  }, [])

  // Linee/Macchine filtrate dinamicamente
  const lineeDisponibili = useMemo(() => {
    if (!newKaizen.reparto) return []
    const rep = reparti.find(r => r.nome === newKaizen.reparto)
    return rep?.linee?.filter(l => l.attivo !== false) || []
  }, [newKaizen.reparto, reparti])

  const macchineDisponibili = useMemo(() => {
    if (!newKaizen.linea) return []
    const linea = lineeDisponibili.find(l => l.nome === newKaizen.linea)
    return linea?.macchine?.filter(m => m.attivo !== false) || []
  }, [newKaizen.linea, lineeDisponibili])

  function handleRepartoChange(nuovoReparto) {
    setNewKaizen(k => ({ ...k, reparto: nuovoReparto, linea: '', macchina: '' }))
  }
  function handleLineaChange(nuovaLinea) {
    setNewKaizen(k => ({ ...k, linea: nuovaLinea, macchina: '' }))
  }

  useEffect(() => { loadKaizens() }, [])

  const loadKaizens = async () => {
    try {
      const res = await api.get('/kaizens')
      setKaizens(res.data)
    } catch (err) { console.error(err) }
  }

  const createKaizen = async () => {
    if (!newKaizen.titolo.trim()) return alert('Inserisci un titolo')
    if (!newKaizen.tipo) return alert('Seleziona una tipologia Kaizen')
    try {
      // Rimuovi team_members_data dal payload (solo per UI)
      const { team_members_data, ...formClean } = newKaizen

      // Default Leader/Members per Quick Kaizen
      let team_leader_id = newKaizen.team_leader_id
      let team_leader_nome = newKaizen.team_leader_nome
      let team_members_ids = newKaizen.team_members_ids
      let team_members_nomi = newKaizen.team_members_nomi

      if (newKaizen.tipo === 'Quick') {
        // Se non specificato, leader = utente loggato
        if (!team_leader_id && user?.id) {
          team_leader_id = user.id
          team_leader_nome = user.full_name || user.username || ''
        }
        // Se nessun membro, almeno il creator
        if ((!team_members_ids || team_members_ids.length === 0) && user?.id) {
          team_members_ids = [user.id]
          team_members_nomi = [user.full_name || user.username || '']
        }
      }

      const payload = {
        ...formClean,
        livello: newKaizen.tipo,                  // 'Quick' | 'Standard' | 'Major'
        tipo: `${newKaizen.tipo} Kaizen`,         // 'Quick Kaizen' | ...
        // Creatore = utente loggato
        creatore_id: user?.id || null,
        creatore_nome: user?.full_name || user?.username || 'Default User',
        // Team
        team_leader_id,
        team_leader_nome,
        team_members_ids,
        team_members_nomi,
      }

      const res = await api.post('/kaizens', payload)

      if (newKaizen.pillar_id && res.data?.id) {
        try {
          await api.post(`/pillars/${newKaizen.pillar_id}/link-kaizen`, {
            kaizen_id: res.data.id,
            kaizen_numero: res.data.numero,
            kaizen_titolo: newKaizen.titolo,
          })
        } catch (linkErr) {
          console.warn('Link pillar fallito (ma kaizen creato):', linkErr)
        }
      }

      setShowModal(false)
      setNewKaizen(INITIAL_KAIZEN)
      loadKaizens()
    } catch (err) {
      console.error(err)
      alert('Errore creazione: ' + (err.response?.data?.detail || err.message))
    }
  }

  const chiudiKaizen = async (kaizen, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Chiudere il Kaizen "${kaizen.numero} - ${kaizen.titolo}"?\n\nLo stato passerà a "Chiuso".`)) return
    try {
      await api.put(`/kaizens/${kaizen._id}`, { stato: 'Chiuso' })
      loadKaizens()
    } catch (err) {
      console.error(err)
      alert('Errore chiusura: ' + (err.response?.data?.detail || err.message))
    }
  }

  const riapriKaizen = async (kaizen, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Riaprire il Kaizen "${kaizen.numero} - ${kaizen.titolo}"?\n\nLo stato tornerà a "Aperto" e sarà nuovamente modificabile.`)) return
    try {
      await api.put(`/kaizens/${kaizen._id}`, { stato: 'Aperto' })
      loadKaizens()
    } catch (err) {
      console.error(err)
      alert('Errore riapertura: ' + (err.response?.data?.detail || err.message))
    }
  }

  const deleteKaizen = async (kaizen, e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const apRes = await api.get(`/kaizens/${kaizen._id}/action-plans`)
      const apCount = apRes.data?.length || 0
      const childrenRes = await api.get(`/kaizens/${kaizen._id}/children`)
      const childrenCount = childrenRes.data?.length || 0

      let confirmMsg = `Eliminare "${kaizen.numero} - ${kaizen.titolo}"?`
      if (apCount > 0 || childrenCount > 0) {
        confirmMsg += `\n\nATTENZIONE:`
        if (apCount > 0) confirmMsg += `\n- ${apCount} Action Plan collegati`
        if (childrenCount > 0) confirmMsg += `\n- ${childrenCount} Kaizen figli`
        confirmMsg += `\n\nGli AP rimarranno ma perderanno il link.\nI Kaizen figli diventeranno top-level.`
      }
      confirmMsg += `\n\nProcedere?`
      if (!confirm(confirmMsg)) return

      await api.delete(`/kaizens/${kaizen._id}`)
      loadKaizens()
    } catch (err) {
      console.error(err)
      alert('Errore eliminazione: ' + (err.response?.data?.detail || err.message))
    }
  }

  const filtered = kaizens.filter(k => {
    const matchSearch = k.titolo?.toLowerCase().includes(search.toLowerCase()) ||
                        k.numero?.toLowerCase().includes(search.toLowerCase())
    const tipoNormalizzato = k.livello || (k.tipo?.includes('Major') ? 'Major' : k.tipo?.includes('Standard') ? 'Standard' : 'Quick')
    const matchTipo = !filterTipo || tipoNormalizzato === filterTipo
    const matchPillar = !filterPillar || k.pillar_id === filterPillar
    const matchStato = !filterStato || k.stato === filterStato
    return matchSearch && matchTipo && matchPillar && matchStato
  })

  const getTipoStyle = (tipo) => {
    const t = tipo || ''
    if (t.includes('Major')) return { bg: 'bg-purple-100', color: 'text-purple-700', label: 'Major' }
    if (t.includes('Standard')) return { bg: 'bg-blue-100', color: 'text-blue-700', label: 'Standard' }
    return { bg: 'bg-emerald-100', color: 'text-emerald-700', label: 'Quick' }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kaizen Sheet</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light"
        >
          <Plus size={18} /> Nuovo Kaizen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per titolo o numero..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tutte le tipologie</option>
          {TIPOLOGIE_KAIZEN.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select value={filterStato} onChange={(e) => setFilterStato(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tutti gli stati</option>
          <option value="Aperto">Aperto</option>
          <option value="In Corso">In Corso</option>
          <option value="Chiuso">Chiuso</option>
        </select>
        <select value={filterPillar} onChange={(e) => setFilterPillar(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tutti i pillar</option>
          {pillars.map(p => (
            <option key={p._id} value={p._id}>{p.sigla} — {p.label}</option>
          ))}
        </select>
        <div className="text-sm text-gray-500 self-center">{filtered.length} kaizen</div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-4">Numero</th>
              <th className="p-4">Titolo</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Pillar</th>
              <th className="p-4">Stato</th>
              <th className="p-4">Reparto</th>
              <th className="p-4">Linea</th>
              <th className="p-4">Aperto da</th>
              <th className="p-4 text-center w-28">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((k) => {
              const tipoStyle = getTipoStyle(k.livello || k.tipo)
              const giorni = giorniDaApertura(k.data_apertura)
              const isChiuso = k.stato === 'Chiuso'
              return (
                <tr key={k._id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <Link to={`/kaizen/${k._id}`} className="text-primary font-mono hover:underline">{k.numero}</Link>
                  </td>
                  <td className="p-4 font-medium">{k.titolo}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${tipoStyle.bg} ${tipoStyle.color}`}>
                      {tipoStyle.label}
                    </span>
                  </td>
                  <td className="p-4">
                    {k.pillar_sigla ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold bg-indigo-100 text-indigo-700">
                        {k.pillar_sigla}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      k.stato === 'Aperto' ? 'bg-blue-100 text-blue-700' :
                      k.stato === 'In Corso' ? 'bg-yellow-100 text-yellow-700' :
                      k.stato === 'Chiuso' ? 'bg-gray-200 text-gray-700' :
                      'bg-green-100 text-green-700'
                    }`}>{k.stato}</span>
                  </td>
                  <td className="p-4 text-xs">{k.reparto || '—'}</td>
                  <td className="p-4 text-xs">{k.linea || '—'}</td>
                  <td className="p-4">
                    <GiorniBadge giorni={giorni} stato={k.stato} />
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      {!isChiuso ? (
                        <button
                          onClick={(e) => chiudiKaizen(k, e)}
                          className="text-green-600 hover:bg-green-50 p-2 rounded-full transition-colors"
                          title="Chiudi Kaizen"
                        >
                          <CheckCircle size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => riapriKaizen(k, e)}
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                          title="Riapri Kaizen"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                      <button
                        onClick={(e) => deleteKaizen(k, e)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                        title="Elimina Kaizen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p>Nessun kaizen trovato</p>
            <button onClick={() => setShowModal(true)} className="text-primary hover:underline mt-2">
              Creane uno nuovo
            </button>
          </div>
        )}
      </div>

      {/* MODAL Nuovo Kaizen */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-primary text-white px-5 py-3 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-lg font-bold">Nuovo Kaizen</h2>
              <button onClick={() => setShowModal(false)} className="hover:bg-primary-light p-1 rounded">✕</button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Titolo <span className="text-red-500">*</span>
                </label>
                <input
                  value={newKaizen.titolo}
                  onChange={(e) => setNewKaizen({ ...newKaizen, titolo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipologia Kaizen <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOLOGIE_KAIZEN.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setNewKaizen({ ...newKaizen, tipo: t.value })}
                      className={`border-2 rounded-lg p-3 text-center transition-all ${
                        newKaizen.tipo === t.value
                          ? 'border-primary bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className={`font-bold text-sm ${
                        newKaizen.tipo === t.value ? 'text-primary' : 'text-gray-700'
                      }`}>
                        {t.value}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reparto → Linea → Macchina */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Reparto</label>
                  <select
                    value={newKaizen.reparto}
                    onChange={(e) => handleRepartoChange(e.target.value)}
                    className="w-full border rounded-lg px-2 py-2 text-sm"
                  >
                    <option value="">Seleziona</option>
                    {reparti.length === 0 ? (
                      <option disabled>Configura in Settings → Reparti</option>
                    ) : (
                      reparti.filter(r => r.attivo !== false).map(r => (
                        <option key={r._id} value={r.nome}>
                          {r.nome}{r.codice ? ` [${r.codice}]` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Linea</label>
                  <select
                    value={newKaizen.linea}
                    onChange={(e) => handleLineaChange(e.target.value)}
                    disabled={!newKaizen.reparto}
                    className="w-full border rounded-lg px-2 py-2 text-sm disabled:bg-gray-100"
                  >
                    <option value="">
                      {!newKaizen.reparto ? 'Prima il reparto' : 'Seleziona'}
                    </option>
                    {lineeDisponibili.map(l => (
                      <option key={l.id} value={l.nome}>
                        {l.nome}{l.codice ? ` [${l.codice}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Macchina</label>
                  <select
                    value={newKaizen.macchina}
                    onChange={(e) => setNewKaizen({ ...newKaizen, macchina: e.target.value })}
                    disabled={!newKaizen.linea}
                    className="w-full border rounded-lg px-2 py-2 text-sm disabled:bg-gray-100"
                  >
                    <option value="">
                      {!newKaizen.linea ? 'Prima la linea' : 'Seleziona'}
                    </option>
                    {macchineDisponibili.map(m => (
                      <option key={m.id} value={m.nome}>
                        {m.nome}{m.codice ? ` [${m.codice}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Categoria Perdita (TPM)</label>
                <select
                  value={newKaizen.tipo_perdita}
                  onChange={(e) => setNewKaizen({ ...newKaizen, tipo_perdita: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Nessuna</option>
                  {(configs.categorie_perdita || []).map(p => (
                    <option key={p._id} value={p.label}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pillar di appartenenza</label>
                <select
                  value={newKaizen.pillar_id}
                  onChange={(e) => setNewKaizen({ ...newKaizen, pillar_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Nessuno (kaizen autonomo)</option>
                  {pillars.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.sigla} — {p.label}
                      {p.leader ? ` (${p.leader})` : ''}
                    </option>
                  ))}
                </select>
                {pillars.length === 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    Nessun Pillar configurato. Vai su <strong>Settings → Pillars</strong> per crearli.
                  </div>
                )}
              </div>

              {/* TEAM KAIZEN */}
              <div className="bg-blue-50 rounded-lg p-3 space-y-3 border border-blue-200">
                <div className="text-xs font-bold uppercase text-blue-800">Team Kaizen</div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Team Leader
                    {newKaizen.tipo === 'Quick' && (
                      <span className="text-xs text-gray-500 font-normal ml-1">
                        (di default: tu come creatore)
                      </span>
                    )}
                  </label>
                  <UserPicker
                    value={
                      newKaizen.team_leader_id
                        ? { id: newKaizen.team_leader_id, name: newKaizen.team_leader_nome }
                        : null
                    }
                    onChange={(selected) => {
                      if (selected) {
                        setNewKaizen({
                          ...newKaizen,
                          team_leader_id: selected.id,
                          team_leader_nome: selected.name,
                        })
                      } else {
                        setNewKaizen({
                          ...newKaizen,
                          team_leader_id: null,
                          team_leader_nome: '',
                        })
                      }
                    }}
                    mode="single"
                    placeholder="Cerca team leader..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Team Members
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      ({newKaizen.team_members_data?.length || 0})
                    </span>
                  </label>
                  <UserPicker
                    value={newKaizen.team_members_data || []}
                    onChange={(selected) => {
                      setNewKaizen({
                        ...newKaizen,
                        team_members_data: selected,
                        team_members_ids: selected.map(s => s.id),
                        team_members_nomi: selected.map(s => s.name),
                      })
                    }}
                    mode="multi"
                    placeholder="Aggiungi membri al team..."
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">
                  Annulla
                </button>
                <button onClick={createKaizen} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light">
                  Crea Kaizen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
