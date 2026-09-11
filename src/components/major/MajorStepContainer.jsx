import { useState } from 'react'
import { getStepComponent } from './componentRegistry'

const INNER_TABS = [
  { key: 'lavoro', label: 'Lavoro' },
  { key: 'evidenze', label: 'Evidenze' },
  { key: 'gate', label: 'Gate' },
]

export default function MajorStepContainer({
  step,
  stepData,
  onSaveStep,
  onApproveGate,
  allStepsData = {},
}) {
  const [innerTab, setInnerTab] = useState('lavoro')
  const StepComponent = getStepComponent(step.componente)
  const sd = stepData || {}
  const metodologieUsate = sd.metodologie_usate || []

  const toggleMetodologia = metodologia => {
    const next = metodologieUsate.includes(metodologia)
      ? metodologieUsate.filter(item => item !== metodologia)
      : [...metodologieUsate, metodologia]

    onSaveStep({
      metodologie_usate: next,
      stato: sd.stato === 'completato' ? 'completato' : 'in_corso',
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-800">
              {step.ordine}. {step.titolo}
            </h2>

            <div className="mt-2 space-y-2">
              {step.obiettivo && (
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {step.obiettivo}
                </p>
              )}

              {step.istruzioni && step.istruzioni !== step.obiettivo && (
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {step.istruzioni}
                </p>
              )}
            </div>

            {(step.metodologie || []).length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Metodologie previste
                </div>
                <div className="flex flex-wrap gap-2">
                  {step.metodologie.map(metodologia => {
                    const utilizzata = metodologieUsate.includes(metodologia)

                    return (
                      <button
                        key={metodologia}
                        type="button"
                        onClick={() => toggleMetodologia(metodologia)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          utilizzata
                            ? 'bg-primary text-white border-primary'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary'
                        }`}
                        title={
                          utilizzata
                            ? 'Metodologia utilizzata. Clicca per deselezionare.'
                            : 'Clicca per indicare che la metodologia è stata utilizzata.'
                        }
                      >
                        {metodologia}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <span
            className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
              sd.stato === 'completato'
                ? 'bg-green-100 text-green-700'
                : sd.stato === 'in_corso'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            {sd.stato === 'completato'
              ? 'Completato'
              : sd.stato === 'in_corso'
                ? 'In corso'
                : 'Non iniziato'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200 flex-wrap">
        {INNER_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setInnerTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              innerTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {innerTab === 'lavoro' && (
        <StepComponent
          step={step}
          stepData={sd}
          allStepsData={allStepsData}
          onChange={changes =>
            onSaveStep({
              ...changes,
              stato: sd.stato === 'completato' ? 'completato' : 'in_corso',
            })
          }
        />
      )}

      {innerTab === 'evidenze' && (
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Output obbligatori
          </div>

          {(step.output_obbligatori || []).length === 0 ? (
            <div className="text-sm text-gray-400">
              Nessun output obbligatorio configurato.
            </div>
          ) : (
            <ul className="space-y-2">
              {step.output_obbligatori.map(output => {
                const completato = Boolean(sd.output_compilati?.[output])

                return (
                  <li
                    key={output}
                    className="flex items-center gap-3 text-sm rounded-lg border px-3 py-2"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        completato ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className={completato ? 'text-gray-800' : 'text-gray-600'}>
                      {output}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {innerTab === 'gate' && (
        <div className="bg-white rounded-lg border p-4">
          <div className="font-bold text-gray-800 mb-3">
            {step.gate?.titolo || 'Gate'}
          </div>

          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Criteri
          </div>

          <ul className="space-y-2 mb-4">
            {(step.gate?.criteri || []).map(criterio => (
              <li key={criterio} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                <span>{criterio}</span>
              </li>
            ))}
          </ul>

          <div className="text-xs text-gray-500 mb-3">
            Approvatori: {(step.gate?.approvatori || []).join(', ') || '—'}
          </div>

          {sd.gate?.approvato ? (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              Gate approvato
              {sd.gate?.approvato_da ? ` da ${sd.gate.approvato_da}` : ''}
            </div>
          ) : (
            <button
              type="button"
              onClick={onApproveGate}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
            >
              Approva Gate e completa step
            </button>
          )}
        </div>
      )}
    </div>
  )
}
