import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Plus, Search, Trash2 } from 'lucide-react'
import { useAllConfigurations } from '../hooks/useConfigurations'

export default function KaizenListPage() {
  const [kaizens, setKaizens] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newKaizen, setNewKaizen] = useState({
    titolo: '',
    tipo: '',
    reparto: '',
    linea: '',
    macchina: '',
    tipo_perdita: '',
  })
  const [filterTipo, setFilterTipo] = useState('')
  const { configs } = useAllConfigurations()

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
      await api.post('/kaizens', newKaizen)
      setShowModal(false)
      setNewKaizen({ titolo: '', tipo: '', reparto: '', linea: '', macchina: '', tipo_perdita: '' })
      loadKaizens()
    } catch (err) {
      console.error(err)
      alert('Errore creazione: ' + (err.response?.data?.detail || err.message))
    }
  }

  const deleteKaizen = async (kaizen, e) => {
    // Stop propagazione per evitare di navigare al detail quando clicchi sul cestino
    e.preventDefault()
    e.stopPropagation()
    
    // Prima controllo se ha Action Plan collegati
    try {
      const apRes = await api.get(`/kaizens/${kaizen._id}/action-plans`)
      const apCount = apRes.data?.length || 0
      
      // Controllo anche se ha figli (per kaizen polimorfici)
      const childrenRes = await api.get(`/kaizens/${kaizen._id}/children`)
      const childrenCount = childrenRes.data?.length || 0
      
      let confirmMsg = `🗑️ Eliminare "${kaizen.numero} - ${kaizen.titolo}"?`
      
      if (apCount > 0 || childrenCount > 0) {
        confirmMsg += `\n\n⚠️ ATTENZIONE:`
        if (apCount > 0) confirmMsg += `\n• ${apCount} Action Plan collegati`
        if (childrenCount > 0) confirmMsg += `\n• ${childrenCount} Kaizen figli`
        confirmMsg += `\n\nGli AP rimarranno ma perderanno il link.\nI Kaizen figli diventeranno top-level.`
      }
      
      confirmMsg += `\n\nProcedere?`
      
      if (!confirm(confirmMsg)) return
      
      await api.delete(`/kaizens/${kaizen._id}`)
      alert(`✅ Kaizen ${kaizen.numero} eliminato`)
      loadKaizens()
    } catch (err) {
      console.error(err)
      alert('❌ Errore eliminazione: ' + (err.response?.data?.detail || err.message))
    }
  }

  // Color/icon helper per i tipi kaizen
  const getTipoBadge = (tipo) => {
    const conf = (configs.tipi_kaizen || []).find(t => t.label === tipo)
    if (conf) {
      return { icon: conf.icon, color: conf.color }
    }
    return { icon: '📋', color: '#6b7280' }
  }

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kaizen Sheet</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light"
        >
          <Plus size={18} /> Nuovo Kaizen
        </button>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per titolo o numero..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tutte le tipologie</option>
          {(configs.tipi_kaizen || []).map(t => (
            <option key={t._id} value={t.label}>
              {t.icon ? `${t.icon} ` : ''}{t.label}
            </option>
          ))}
        </select>
        <div className="text-sm text-gray-500 self-center">
          📊 {filtered.length} kaizen{filtered.length !== 1 ? '' : ''}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-4">Numero</th>
              <th className="p-4">Titolo</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Stato</th>
              <th className="p-4">Reparto</th>
              <th className="p-4">Linea</th>
              <th className="p-4">Data</th>
              <th className="p-4 text-center w-20">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((k) => {
              const tipoBadge = getTipoBadge(k.tipo)
              return (
                <tr key={k._id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <Link to={`/kaizen/${k._id}`} className="text-primary font-mono hover:underline">
                      {k.numero}
                    </Link>
                  </td>
                  <td className="p-4 font-medium">{k.titolo}</td>
                  <td className="p-4">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1"
                      style={{ 
                        backgroundColor: tipoBadge.color ? `${tipoBadge.color}20` : '#f3f4f6',
                        color: tipoBadge.color || '#6b7280',
                      }}
                    >
                      {tipoBadge.icon} {k.tipo}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      k.stato === 'Aperto' ? 'bg-blue-100 text-blue-700' :
                      k.stato === 'In Corso' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>{k.stato}</span>
                  </td>
                  <td className="p-4 text-xs">{k.reparto || '—'}</td>
                  <td className="p-4 text-xs">{k.linea || '—'}</td>
                  <td className="p-4 text-gray-500 text-xs">{k.data_apertura?.slice(0, 10)}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={(e) => deleteKaizen(k, e)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                      title="Elimina Kaizen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                  </tr>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-5xl mb-2">📋</div>
            <p>Nessun kaizen trovato</p>
            <button onClick={() => setShowModal(true)} className="text-primary hover:underline mt-2">
              Creane uno nuovo →
            </button>
          </div>
        )}
      </div>

      {/* MODAL Nuovo Kaizen */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-primary text-white px-5 py-3 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold">➕ Nuovo Kaizen</h2>
              <button onClick={() => setShowModal(false)} className="hover:bg-primary-light p-1 rounded">✕</button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Titolo <span className="text-red-500">*</span>
                </label>
                <input
                  value={newKaizen.titolo}
                  onChange={(e) => setNewKaizen({...newKaizen, titolo: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Es: Riduzione microfermate linea 2"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipologia Kaizen <span className="text-red-500">*</span>
                </label>
                <select
                  value={newKaizen.tipo}
                  onChange={(e) => setNewKaizen({...newKaizen, tipo: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">— Seleziona —</option>
                  {(configs.tipi_kaizen || []).map(t => (
                    <option key={t._id} value={t.label}>
                      {t.icon ? `${t.icon} ` : ''}{t.label}
                    </option>
                  ))}
                </select>
                {(configs.tipi_kaizen || []).length === 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    ⚠️ Nessuna tipologia configurata. Vai su <strong>Settings → Tipologie Kaizen</strong> per crearle.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Reparto</label>
                  <select
                    value={newKaizen.reparto}
                    onChange={(e) => setNewKaizen({...newKaizen, reparto: e.target.value})}
                    className="w-full border rounded-lg px-2 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {(configs.reparti || []).map(r => (
                      <option key={r._id} value={r.label}>
                        {r.icon ? `${r.icon} ` : ''}{r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Linea</label>
                  <select
                    value={newKaizen.linea}
                    onChange={(e) => setNewKaizen({...newKaizen, linea: e.target.value})}
                    className="w-full border rounded-lg px-2 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {(configs.linee || []).map(l => (
                      <option key={l._id} value={l.label}>
                        {l.icon ? `${l.icon} ` : ''}{l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Macchina</label>
                  <select
                    value={newKaizen.macchina}
                    onChange={(e) => setNewKaizen({...newKaizen, macchina: e.target.value})}
                    className="w-full border rounded-lg px-2 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {(configs.macchine || []).map(m => (
                      <option key={m._id} value={m.label}>
                        {m.icon ? `${m.icon} ` : ''}{m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo Perdita (TPM)</label>
                <select
                  value={newKaizen.tipo_perdita}
                  onChange={(e) => setNewKaizen({...newKaizen, tipo_perdita: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">— Nessuna —</option>
                  {(configs.tipi_perdita || []).map(p => (
                    <option key={p._id} value={p.label}>
                      {p.icon ? `${p.icon} ` : ''}{p.label}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  💡 Collega il kaizen a una perdita TPM per le analytics OEE
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Annulla
                </button>
                <button
                  onClick={createKaizen}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light"
                >
                  ➕ Crea Kaizen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
