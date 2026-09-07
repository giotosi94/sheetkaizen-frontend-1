import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Lightbulb, ExternalLink, Plus } from 'lucide-react'

const LIVELLO_COLOR = {
  Quick: 'bg-emerald-100 text-emerald-700',
  Standard: 'bg-blue-100 text-blue-700',
  Major: 'bg-purple-100 text-purple-700',
}

const STATO_COLOR = {
  Aperto: 'bg-blue-100 text-blue-700',
  'In Corso': 'bg-yellow-100 text-yellow-700',
  Chiuso: 'bg-gray-200 text-gray-700',
}

export default function KaizenWidget({ dashboardId, dashboardName, title = 'Kaizen collegati' }) {
  const [kaizens, setKaizens] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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

  const apriNuovoKaizen = (e) => {
    e.stopPropagation()
    const params = new URLSearchParams({
      new: '1',
      dashboard_id: dashboardId || '',
      dashboard_nome: dashboardName || '',
    })
    navigate(`/kaizen?${params.toString()}`)
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
          onClick={apriNuovoKaizen}
          className="widget-action-btn bg-primary text-white rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-primary-light flex-shrink-0"
        >
          <Plus size={13} /> Nuovo
        </button>
      </div>

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
                {(k.livello || k.tipo) && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${LIVELLO_COLOR[k.livello] || 'bg-gray-100 text-gray-600'}`}>
                    {k.livello || 'Quick'}
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
