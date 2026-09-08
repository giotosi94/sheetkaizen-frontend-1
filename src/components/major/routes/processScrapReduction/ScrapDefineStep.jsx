import { useMemo } from 'react'

const TIPOLOGIE_SCARTO = [
  'Scarto di processo',
  'Scarto di prodotto',
  'Rilavorazione',
  'Fuori specifica',
  'Perdita di materiale',
  'Altro',
]

function Field({ label, children, required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  )
}

function NumberField({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      step="any"
      value={value ?? ''}
      onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}
      placeholder={placeholder}
      className="w-full border rounded-lg px-3 py-2 text-sm"
    />
  )
}

export default function ScrapDefineStep({ stepData, onChange }) {
  const dati = stepData?.dati || {}

  const update = changes => {
    onChange({ dati: { ...dati, ...changes } })
  }

  const completamento = useMemo(() => {
    const required = [
      dati.problema,
      dati.perimetro,
      dati.kpi_principale,
      dati.unita_misura,
      dati.baseline,
      dati.target,
      dati.periodo_riferimento,
      dati.fonte_dati,
      dati.categoria_prioritaria,
    ]
    return Math.round((required.filter(value => value !== null && value !== undefined && value !== '').length / required.length) * 100)
  }, [dati])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Definizione del problema</h3>
            <p className="text-xs text-gray-500 mt-1">Delimita il fenomeno, il processo interessato e la priorità di intervento.</p>
          </div>
          <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">
            Completezza {completamento}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Problema" required>
              <textarea
                rows={3}
                value={dati.problema || ''}
                onChange={event => update({ problema: event.target.value })}
                placeholder="Descrivi cosa accade, dove accade e quale impatto produce"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="Processo o perimetro" required>
            <input
              value={dati.perimetro || ''}
              onChange={event => update({ perimetro: event.target.value })}
              placeholder="Linea, fase, macchina o area interessata"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Prodotto o famiglia">
            <input
              value={dati.prodotto_famiglia || ''}
              onChange={event => update({ prodotto_famiglia: event.target.value })}
              placeholder="Prodotto, formato o famiglia"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Tipologia di scarto">
            <select
              value={dati.tipologia_scarto || ''}
              onChange={event => update({ tipologia_scarto: event.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleziona</option>
              {TIPOLOGIE_SCARTO.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>

          <Field label="Categoria prioritaria" required>
            <input
              value={dati.categoria_prioritaria || ''}
              onChange={event => update({ categoria_prioritaria: event.target.value })}
              placeholder="Categoria emersa dal Pareto"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Baseline e target</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Field label="KPI principale" required>
            <input
              value={dati.kpi_principale || ''}
              onChange={event => update({ kpi_principale: event.target.value })}
              placeholder="Esempio: scarto processo"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Unità di misura" required>
            <input
              value={dati.unita_misura || ''}
              onChange={event => update({ unita_misura: event.target.value })}
              placeholder="kg, %, pezzi, euro"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Baseline" required>
            <NumberField value={dati.baseline} onChange={value => update({ baseline: value })} placeholder="Valore iniziale" />
          </Field>

          <Field label="Target" required>
            <NumberField value={dati.target} onChange={value => update({ target: value })} placeholder="Valore obiettivo" />
          </Field>

          <Field label="Costo baseline">
            <NumberField value={dati.costo_baseline} onChange={value => update({ costo_baseline: value })} placeholder="Costo iniziale" />
          </Field>

          <Field label="Costo target">
            <NumberField value={dati.costo_target} onChange={value => update({ costo_target: value })} placeholder="Costo obiettivo" />
          </Field>

          <Field label="Periodo di riferimento" required>
            <input
              value={dati.periodo_riferimento || ''}
              onChange={event => update({ periodo_riferimento: event.target.value })}
              placeholder="Esempio: gennaio-marzo 2026"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Fonte dati" required>
            <input
              value={dati.fonte_dati || ''}
              onChange={event => update({ fonte_dati: event.target.value })}
              placeholder="MES, SAP, Excel, rilevazione manuale"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Pareto iniziale</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sintesi del Pareto">
            <textarea
              rows={4}
              value={dati.pareto_sintesi || ''}
              onChange={event => update({ pareto_sintesi: event.target.value })}
              placeholder="Riporta categorie principali, quantità e incidenza percentuale"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Motivazione della priorità">
            <textarea
              rows={4}
              value={dati.motivazione_priorita || ''}
              onChange={event => update({ motivazione_priorita: event.target.value })}
              placeholder="Spiega perché questa categoria è stata scelta"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
