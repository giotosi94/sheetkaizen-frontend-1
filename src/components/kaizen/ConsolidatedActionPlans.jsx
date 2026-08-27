import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import api from '../../services/api'
import KaizenAzioniList from './KaizenAzioniList'

const CLOSED_STATUSES = ['Chiuso', 'Done', 'Completato', 'Cancelled', 'Annullato']

function isCompleted(plan) {
  return CLOSED_STATUSES.includes(plan.stato)
}

function isLate(plan) {
  if (!plan.data_scadenza || isCompleted(plan)) return false
  return new Date(plan.data_scadenza) < new Date()
}

function formatDate(value) {
  if (!value) return 'Nessuna scadenza'

  return new Date(value).toLocaleDateString('it-IT')
}

export default function ConsolidatedActionPlans({
  kaizen,
  kaizenId,
  kaizenNumero,
  onUpdate,
}) {
  const [children, setChildren] = useState([])
  const [plansByChild, setPlansByChild] = useState({})
  const [expandedChildren, setExpandedChildren] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [kaizenId])

  const loadData = async () => {
    setLoading(true)

    try {
      const childrenResponse = await api.get(`/kaizens/${kaizenId}/children`)
      const quickKaizens = childrenResponse.data || []

      const plansEntries = await Promise.all(
        quickKaizens.map(async child => {
          try {
            const response = await api.get(`/kaizens/${child._id}/action-plans`)
            return [child._id, response.data || []]
          } catch {
            return [child._id, []]
          }
        })
      )

      setChildren(quickKaizens)
      setPlansByChild(Object.fromEntries(plansEntries))
    } catch (error) {
      console.error('Errore caricamento Action Plan consolidati:', error)
      setChildren([])
      setPlansByChild({})
    } finally {
      setLoading(false)
    }
  }

  const toggleChild = childId => {
    setExpandedChildren(prev => ({
      ...prev,
      !prev[childId],
    }))
  }

  const handleGeneralUpdate = async () => {
    await loadData()
    onUpdate?.()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
        Caricamento Action Plan...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">
          Action Plan consolidati
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Azioni generali del progetto e azioni dei Quick Kaizen collegati.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-primary">
        <h3 className="font-bold text-gray-800 mb-4">
          Azioni generali del progetto
        </h3>

        <KaizenAzioniList
          kaizen={kaizen}
          kaizenId={kaizenId}
          kaizenNumero={kaizenNumero}
          onUpdate={handleGeneralUpdate}
        />
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-gray-800">
            Azioni dei Quick Kaizen
          </h3>

          <p className="text-xs text-gray-500 mt-1">
            Seleziona una card per visualizzare le relative azioni.
          </p>
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-sm text-gray-400">
            Nessun Quick Kaizen collegato al progetto.
          </div>
        ) : (
          children.map(child => {
            const plans = plansByChild[child._id] || []
            const completed = plans.filter(isCompleted).length
            const late = plans.filter(isLate).length
            const expanded = expandedChildren[child._id] === true

            return (
              <div
                key={child._id}
                className="bg-white rounded-xl shadow overflow-hidden border-l-4 border-green-500"
              >
                <button
                  type="button"
                  onClick={() => toggleChild(child._id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50"
                >
                  {expanded ? (
                    <ChevronDown size={18} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-500" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {child.numero}
                      </span>

                      <span className="font-semibold text-sm text-gray-800 truncate">
                        {child.titolo || 'Senza titolo'}
                      </span>
                    </div>

                    {child.team_leader_nome && (
                      <div className="text-xs text-gray-500 mt-1">
                        Leader: {child.team_leader_nome}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                      {plans.length} azioni
                    </span>

                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {completed} completate
                    </span>

                    {late > 0 && (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {late} in ritardo
                      </span>
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t">
                    {plans.length === 0 ? (
                      <div className="p-5 text-sm text-gray-400 text-center">
                        Nessuna azione collegata a questo Quick Kaizen.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {plans.map(plan => (
                          <div
                            key={plan._id}
                            className="px-5 py-3 flex items-center gap-4"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-primary">
                                  {plan.numero}
                                </span>

                                <span className="text-sm font-medium text-gray-800 truncate">
                                  {plan
