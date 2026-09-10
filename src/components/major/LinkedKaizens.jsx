import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Link2, Search, Unlink, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function LinkedKaizens({ majorId }) {
  const navigate = useNavigate()
  const [linked, setLinked] = useState([])
  const [available, setAvailable] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [workingId, setWorkingId] = useState(null)

  useEffect(() => {
    loadLinked()
  }, [majorId])

  const loadLinked = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/major-kaizen/${majorId}/linked-kaizens`)
      setLinked(res.data || [])
    } catch (err) {
      console.error('Errore caricamento Kaizen collegati:', err)
      setLinked([])
    } finally {
      setLoading(false)
    }
  }

  const openModal = async () => {
    setShowModal(true)
    setSearch('')
    setTypeFilter('all')
    setLoadingAvailable(true)
    try {
      const res = await api.get('/kaizens')
      setAvailable(res.data || [])
    } catch (err) {
      console.error('Errore caricamento Kaizen disponibili:', err)
      setAvailable([])
      alert('Errore caricamento Kaizen disponibili: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoadingAvailable(false)
    }
  }

  const filteredAvailable = useMemo(() => {
    const linkedIds = new Set(linked.map(item => item._id))
    const query = search.trim().toLowerCase()

    return available.filter(item => {
      const livello = normalizeLevel(item)
      const validLevel = livello === 'Quick' || livello === 'Standard'
      const notLinkedHere = !linkedIds.has(item._id)
      const availableForMajor = !item.major_parent_id || item.major_parent_id === majorId
      const matchType = typeFilter === 'all' || livello === typeFilter
      const matchSearch =
        !query ||
        (item.numero || '').toLowerCase().includes(query) ||
        (item.titolo || '').toLowerCase().includes(query) ||
        (item.reparto || '').toLowerCase().includes(query) ||
        (item.linea || '').toLowerCase().includes(query)

      return validLevel && notLinkedHere && availableForMajor && matchType && matchSearch
    })
  }, [available, linked, majorId, search, typeFilter])

  const linkKaizen = async item => {
    setWorkingId(item._id)
    try {
      await api.post(`/major-kaizen/${majorId}/link-kaizen`, {
        kaizen_id: item._id,
      })
      await loadLinked()
      setAvailable(prev => prev.filter(current => current._id !== item._id))
    } catch (err) {
      console.error('Errore collegamento Kaizen:', err)
      alert('Errore collegamento: ' + (err.response?.data?.detail || err.message))
    } finally {
      setWorkingId(null)
    }
  }

  const unlinkKaizen = async item => {
    if (!confirm(`Scollegare ${item.numero || item.titolo} dal Major?\n\nIl Kaizen non verrà eliminato.`)) return
    setWorkingId(item._id)
    try {
      await api.delete(`/major-kaizen/${majorId}/link-kaizen/${item._id}`)
      await loadLinked()
    } catch (err) {
      console.error('Errore scollegamento Kaizen:', err)
      alert('Errore scollegamento: ' + (err.response?.data?.detail || err.message))
    } finally {
      setWorkingId(null)
    }
  }

  const quick = linked.filter(item => normalizeLevel(item) === 'Quick')
  const standard = linked.filter(item => normalizeLevel(item) === 'Standard')

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-gray-800">Progetti collegati</h3>
          <p className="text-xs text-gray-500 mt-1">
            Quick e Standard Kaizen coordinati da questo Major
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-primary-light"
        >
          <Link2 size={16} /> Collega Kaizen
        </button>
      </div>

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-8">Caricamento...</div>
      ) : linked.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg py-8 text-center">
          <div className="text-sm text-gray-500">Nessun Quick o Standard collegato</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LinkedGroup title="Quick Kaizen" items={quick} color="green" workingId={workingId} onOpen={id => navigate(`/kaizen/${id}`)} onUnlink={unlinkKaizen} />
          <LinkedGroup title="Standard Kaizen" items={standard} color="blue" workingId={workingId} onOpen={id => navigate(`/kaizen/${id}`)} onUnlink={unlinkKaizen} />
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-primary text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">Collega Quick o Standard Kaizen</h2>
                <p className="text-xs text-white text-opacity-80 mt-1">
                  Sono disponibili soltanto i Kaizen non collegati ad altri Major
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-white hover:bg-opacity-20">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Cerca per numero, titolo, reparto o linea..."
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Tutti' },
                  { value: 'Quick', label: 'Quick' },
                  { value: 'Standard', label: 'Standard' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTypeFilter(option.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${
                      typeFilter === option.value
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {loadingAvailable ? (
                <div className="text-center text-sm text-gray-400 py-10">Caricamento...</div>
              ) : filteredAvailable.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-10">Nessun Kaizen disponibile</div>
              ) : (
                <div className="divide-y border rounded-lg">
                  {filteredAvailable.map(item => {
                    const livello = normalizeLevel(item)
                    return (
                      <div key={item._id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          livello === 'Standard'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {livello}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">{item.numero}</span>
                            <span className="text-xs text-gray-500">{item.stato || 'Aperto'}</span>
                          </div>
                          <div className="text-sm font-semibold text-gray-800 truncate mt-1">{item.titolo || 'Senza titolo'}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {[item.reparto, item.linea, item.macchina].filter(Boolean).join(' · ') || 'Ambito non specificato'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => linkKaizen(item)}
                          disabled={workingId === item._id}
                          className="bg-primary text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                        >
                          {workingId === item._id ? 'Collegamento...' : 'Collega'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LinkedGroup({ title, items, color, workingId, onOpen, onUnlink }) {
  const style = color === 'blue'
    ? 'border-blue-200 bg-blue-50 text-blue-800'
    : 'border-green-200 bg-green-50 text-green-800'

  return (
    <div className={`border rounded-lg overflow-hidden ${style}`}>
      <div className="px-3 py-2 font-semibold text-sm flex justify-between">
        <span>{title}</span>
        <span>{items.length}</span>
      </div>
      <div className="bg-white divide-y">
        {items.length === 0 ? (
          <div className="px-3 py-5 text-xs text-gray-400 text-center">Nessun progetto</div>
        ) : (
          items.map(item => (
            <div key={item._id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs font-bold text-primary">{item.numero}</div>
                <div className="text-sm font-medium text-gray-800 truncate">{item.titolo || 'Senza titolo'}</div>
                <div className="text-xs text-gray-500 mt-1">{item.stato || 'Aperto'}</div>
              </div>
              <button type="button" onClick={() => onOpen(item._id)} className="p-2 text-primary hover:bg-blue-50 rounded" title="Apri">
                <ExternalLink size={16} />
              </button>
              <button type="button" onClick={() => onUnlink(item)} disabled={workingId === item._id} className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50" title="Scollega">
                <Unlink size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function normalizeLevel(item) {
  if (item.livello === 'Standard' || item.tipo?.includes('Standard')) return 'Standard'
  return 'Quick'
}
