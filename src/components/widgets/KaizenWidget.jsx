import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Lightbulb, ExternalLink, Plus, X } from 'lucide-react'

const LIVELLO_COLOR = {
  Quick: 'bg-emerald-100 text-emerald-700',
  Standard: 'bg-blue-100 text-blue-700',
  Major: 'bg-purple-100 text-purple-700',
}

const STATO_COLOR = {
  Aperto: 'bg-yellow-100 text-yellow-700',
  'In Corso': 'bg-blue-100 text-blue-700',
  Chiuso: 'bg-green-100 text-green-700',
}

const LIVELLI = ['Quick', 'Standard', 'Major']

export default function KaizenWidget({ dashboardId, dashboardName, title = 'Kaizen collegati' }) {
  const [kaizens, setKaizens] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [nuovoTitolo, setNuovoTitolo] = useState('')
  const [nuovoLivello, setNuovoLivello] = useState('Quick')
  const navigate = useNavigate()

  const savedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })()

  useEffect(() => { load() }, [dashboardId])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/kaizens')
      const all = res.data || []
      const filtered = dashboardId
        ? all.filter(k => k.dashboard_id === dashboardId)
        : []
      setKaizens(filtered)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const creaKaizen = async () => {
    const titolo = nuovoTitolo.trim()
    if (!titolo) return
    setCreating(true)
    try {
      const payload = {
        titolo,
        livello: nuovoLivello,
        dashboard_id: dashboardId,
        dashboard_nome: dashboardName || '',
        creatore_id: savedUser.id || savedUser._id || null,
        creatore_nome: savedUser.name || savedUser.nome || savedUser.full_name || null,
      }
      const res = await api.post('/kaizens', payload)
      const newId = res.data?.id
      if (newId) {
        navigate(`/kaizen/${newId}`)
      } else {
        await load()
        setShowForm(false)
      }
    } catch (err) {
      console.error(err)
      alert('Errore creazione Kaizen: ' + (err.response?.data?.detail || err.message))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-3 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-2 border-b pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Lightbulb size={16} className="text-emerald-600 flex-shrink-0" />
          <h3 className="font-bold text-gray-800 text-sm truncate">{title}</h3>
          <span className="text-xs text-gray-500">({kaizens.length})</span>
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setShowForm(v => !v); setNuovoTitolo(''); setNuovoLivello('Quick') }}
          className="widget-action-btn bg-primary text-white rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-primary-light flex-shrink-0"
        >
          <Plus size={13} /> Nuovo
        </button>
      </div>

      {showForm && (
        <div className="mb-2 border rounded-lg p-2 bg-gray-50 space-y-2" onMouseDown={(e) => e.stopPropagation()}>
          <input
            value={nuovoTitolo}
            onChange={(e) => setNuovoTitolo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') creaKaizen() }}
            placeholder="Titolo del Kaizen..."
            className="w-full border rounded px-2 py-1.5 text-sm"
            autoFocus
          />
          <div className="flex gap-2 items-center">
            <select
              value={nuovoLivello}
              onChange={(e) => setNuovoLivello(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm flex-1"
            >
              {LIVELLI.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button
              type="button"
              onClick={creaKaizen}
              disabled={creating || !nuovoTitolo.trim()}
              className="bg-primary text-white rounded px-3 py-1.5 text-sm hover:bg-primary-light disabled:opacity-50"
            >
              {creating ? '...' : 'Crea e apri'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="text-center text-gray-400 py-4 text-xs">Caricamento...</div>
        ) : kaizens.length === 0 ? (
          <div className="text-center text-gray-400 py-6 text-xs">Nessun Kaizen collegato a questo meeting</div>
        ) : (
          <div className="divide-y">
            {kaizens.map(k => (
              <div
                key={k._id}
                className="py-2 px-1 flex items-center gap-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/kaizen/${k._id}`)}
              >
                <span className="font-mono text-xs font-bold text-primary w-16 flex-shrink-0">{k.numero}</span>
                <span className="flex-1 text-sm text-gray-700 truncate">{k.titolo}</span>
                {k.livello && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${LIVELLO_COLOR[k.livello] || 'bg-gray-100 text-gray-600'}`}>
                    {k.livello}
                  </span>
                )}
                {k.stato && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${STATO_COLOR[k.stato] || 'bg-gray-100 text-gray-600'}`}>
                    {k.stato}
                  </span>
                )}
                <ExternalLink size={13} className="text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
