import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import MajorHeader from '../components/major/MajorHeader'
import MajorRouteNavigator from '../components/major/MajorRouteNavigator'
import MajorOverview from '../components/major/MajorOverview'
import MajorStepContainer from '../components/major/MajorStepContainer'

export default function MajorKaizenDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [major, setMajor] = useState(null)
  const [activeKey, setActiveKey] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/major-kaizen/${id}`)
      setMajor(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveMajor = async (changes) => {
    try {
      const res = await api.put(`/major-kaizen/${id}`, changes)
      setMajor(res.data)
      return true
    } catch (err) {
      console.error(err)
      alert('Errore salvataggio Major: ' + (err.response?.data?.detail || err.message))
      return false
    }
  }

  const snapshot = major?.route_snapshot || {}
  const steps = snapshot.steps || []
  const stepsData = major?.steps_data || {}
  const activeStep = steps.find(s => s.step_id === activeKey)

  const saveStep = async (changes) => {
    try {
      const res = await api.patch(`/major-kaizen/${id}/step/${activeKey}`, changes)
      setMajor(res.data)
    } catch (err) {
      console.error(err)
      alert('Errore salvataggio step: ' + (err.response?.data?.detail || err.message))
    }
  }

  const approveGate = async () => {
    if (!confirm('Approvare il Gate e completare lo step?')) return
    try {
      const res = await api.patch(`/major-kaizen/${id}/step/${activeKey}/gate`, {
        approvato: true,
        approvato_da: user?.full_name || user?.username || 'Utente',
        note: '',
      })
      setMajor(res.data)
    } catch (err) {
      console.error(err)
      alert('Errore approvazione gate: ' + (err.response?.data?.detail || err.message))
    }
  }

  if (loading) return <div className="text-center py-8">Caricamento...</div>
  if (!major) return <div className="text-center py-8 text-gray-400">Major Kaizen non trovato</div>

  return (
    <div>
      <MajorHeader major={major} />
      <MajorRouteNavigator
        steps={steps}
        stepsData={stepsData}
        activeKey={activeKey}
        onSelect={setActiveKey}
      />
      {activeKey === 'overview' ? (
        <MajorOverview major={major} onSave={saveMajor} />
      ) : activeStep ? (
        <MajorStepContainer
          step={activeStep}
          stepData={stepsData[activeStep.step_id]}
          allStepsData={stepsData}
          major={major}
          onSaveStep={saveStep}
          onApproveGate={approveGate}
        />
      ) : (
        <div className="text-center py-8 text-gray-400">Step non trovato</div>
      )}
    </div>
  )
}
