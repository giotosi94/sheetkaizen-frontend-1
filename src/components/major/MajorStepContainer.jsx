import { useState } from 'react'
import { getStepComponent } from './componentRegistry'

const INNER_TABS = [
  { key: 'attivita', label: 'Attivita' },
  { key: 'dati', label: 'Dati' },
  { key: 'metodologie', label: 'Metodologie' },
  { key: 'evidenze', label: 'Evidenze' },
  { key: 'gate', label: 'Gate' },
]

export default function MajorStepContainer({ step, stepData, onSaveStep, onApproveGate }) {
  const [innerTab, setInnerTab] = useState('attivita')
  const StepComponent = getStepComponent(step.componente)
  const sd = stepData || {}

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {step.ordine}. {step.titolo}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{step.obiettivo}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
            sd.stato === 'completato' ? 'bg-green-100 text-green-700' :
            sd.stato === 'in_corso' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {sd.stato === 'completato' ? 'Completato' : sd.stato === 'in_corso' ? 'In corso' : 'Non iniziato'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200 flex-wrap">
        {INNER_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setInnerTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              innerTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {innerTab === 'attivita' && (
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-700 whitespace-pre-line mb-3">{step.istruzioni}</div>
          <label className="block text-sm font-medium mb-1">Note attivita</label>
          <textarea
            rows={4}
            value={sd.attivita?.note || ''}
            onChange={(e) => onSaveStep({ attivita: { ...(sd.attivita || {}), note: e.target.value }, stato: 'in_corso' })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      )}

      {innerTab === 'dati' && (
        <StepComponent
          step={step}
          stepData={sd}
          onChange={(changes) => onSaveStep({ ...changes, stato: sd.stato === 'completato' ? 'completato' : 'in_corso' })}
        />
      )}

      {innerTab === 'metodologie' && (
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Metodologie suggerite</div>
          <div className="flex flex-wrap gap-2">
            {(step.metodologie || []).map(m => {
              const attiva = (sd.metodologie_usate || []).includes(m)
              return (
                <button
                  key={m}
                  onClick={() => {
                    const current = sd.metodologie_usate || []
                    const next = attiva ? current.filter(x => x !== m) : [...current, m]
                    onSaveStep({ metodologie_usate: next })
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${
                    attiva ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {innerTab === 'evidenze' && (
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Output obbligatori</div>
          <ul className="space-y-1">
            {(step.output_obbligatori || []).map(o => (
              <li key={o} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {innerTab === 'gate' && (
        <div className="bg-white rounded-lg border p-4">
          <div className="font-bold text-gray-800 mb-2">{step.gate?.titolo || 'Gate'}</div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Criteri</div>
          <ul className="space-y-1 mb-4">
            {(step.gate?.criteri || []).map(c => (
              <li key={c} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {c}
              </li>
            ))}
          </ul>
          <div className="text-xs text-gray-500 mb-3">
            Approvatori: {(step.gate?.approvatori || []).join(', ') || '—'}
          </div>
          {sd.gate?.approvato ? (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              Gate approvato{sd.gate?.approvato_da ? ` da ${sd.gate.approvato_da}` : ''}
            </div>
          ) : (
            <button
              onClick={() => onApproveGate()}
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
