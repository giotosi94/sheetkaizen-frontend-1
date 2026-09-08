export default function MajorOverview({ major }) {
  const snapshot = major.route_snapshot || {}
  const steps = snapshot.steps || []
  const stepsData = major.steps_data || {}
  const kpi = major.kpi || {}
  const ruoli = major.ruoli_progetto || {}

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-bold text-gray-800 mb-2">Project Charter</h3>
        <div className="text-sm text-gray-700 whitespace-pre-line">
          {major.descrizione || 'Nessuna descrizione'}
        </div>
        {major.motivo_strategico && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-500 uppercase">Motivo strategico</div>
            <div className="text-sm text-gray-700">{major.motivo_strategico}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-bold text-gray-800 mb-3">KPI</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <KpiRow label="KPI" value={kpi.nome_kpi} />
            <KpiRow label="Unita" value={kpi.unita} />
            <KpiRow label="Baseline" value={kpi.baseline} />
            <KpiRow label="Target" value={kpi.target} />
            <KpiRow label="Attuale" value={kpi.actual} />
            <KpiRow label="Finale" value={kpi.valore_finale} />
            <KpiRow label="Saving previsto" value={kpi.saving_previsto} />
            <KpiRow label="Saving verificato" value={kpi.saving_verificato} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-bold text-gray-800 mb-3">Team di progetto</h3>
          <div className="space-y-1.5 text-sm">
            <TeamRow label="Sponsor" persona={ruoli.sponsor} />
            <TeamRow label="Project Leader" persona={ruoli.project_leader} />
            <TeamRow label="Process Owner" persona={ruoli.process_owner} />
            <TeamRow label="Pillar Coach" persona={ruoli.pillar_coach} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-bold text-gray-800 mb-3">Stato degli step</h3>
        <div className="space-y-2">
          {steps.map(step => {
            const sd = stepsData[step.step_id] || {}
            const stato = sd.stato || 'non_iniziato'
            return (
              <div key={step.step_id} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                  {step.ordine}
                </span>
                <span className="flex-1">{step.titolo}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  stato === 'completato' ? 'bg-green-100 text-green-700' :
                  stato === 'in_corso' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {stato === 'non_iniziato' ? 'Non iniziato' : stato === 'in_corso' ? 'In corso' : 'Completato'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function KpiRow({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-gray-500 uppercase">{label}</div>
      <div className="font-medium">{value !== null && value !== undefined && value !== '' ? value : '—'}</div>
    </div>
  )
}

function TeamRow({ label, persona }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{persona?.nome || '—'}</span>
    </div>
  )
}
