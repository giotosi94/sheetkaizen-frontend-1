import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function MajorHeader({ major }) {
  const navigate = useNavigate()
  const kpi = major.kpi || {}

  return (
    <div className="bg-primary text-white rounded-xl p-6 mb-4">
      <button
        onClick={() => navigate('/kaizen')}
        className="flex items-center gap-2 text-white text-opacity-90 hover:text-opacity-100 mb-4 text-sm"
      >
        <ArrowLeft size={18} /> Torna ai Kaizen
      </button>

      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm bg-white/20 px-2 py-0.5 rounded">{major.numero}</span>
            <span className="text-xs bg-purple-300/30 px-2 py-0.5 rounded font-medium">Major</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{major.stato}</span>
          </div>
          <h1 className="text-2xl font-bold mt-2">{major.titolo}</h1>
          <div className="text-sm text-white/80 mt-1">
            {major.route_nome} &middot; v{major.route_versione}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/70 uppercase">Completamento</div>
          <div className="text-3xl font-bold">{major.percentuale_completamento || 0}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <HeaderInfo label="Plant" value={major.plant_id} />
        <HeaderInfo label="Reparto" value={major.reparto} />
        <HeaderInfo label="Linea" value={major.linea} />
        <HeaderInfo label="Macchina" value={major.macchina} />
        <HeaderInfo label="Baseline" value={kpi.baseline} />
        <HeaderInfo label="Target" value={kpi.target} />
        <HeaderInfo label="Attuale" value={kpi.actual} />
        <HeaderInfo label="Saving" value={kpi.saving_verificato} />
      </div>
    </div>
  )
}

function HeaderInfo({ label, value }) {
  return (
    <div className="bg-white/10 rounded-lg px-3 py-2">
      <div className="text-[10px] text-white/70 uppercase">{label}</div>
      <div className="text-sm font-medium truncate">
        {value !== null && value !== undefined && value !== '' ? value : '—'}
      </div>
    </div>
  )
}
