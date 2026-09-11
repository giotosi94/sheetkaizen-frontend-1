import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'

const EMPTY_ANOMALY = {
  id: '',
  anomalia: '',
  categoria: '',
  frequenza: '',
  impatto: '',
  causa_sospetta: '',
  prioritaria: false,
}

const EMPTY_ROOT_CAUSE = {
  id: '',
  anomalia_riferimento: '',
  causa: '',
  metodo_validazione: '',
  evidenza: '',
  validata: false,
}

const EMPTY_COUNTERMEASURE = {
  id: '',
  causa_riferimento: '',
  contromisura: '',
  responsabile: '',
  scadenza: '',
  stato: 'Da avviare',
  risultato_test: '',
  ricorrenze_prima: '',
  ricorrenze_dopo: '',
}

export default function AnomalyAnalysis({ stepData, onChange }) {
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(buildForm(stepData?.dati || {}))
  }, [stepData?.dati])

  const summary = useMemo(() => {
    const anomalieTotali = form.anomalie.reduce((sum, item) => sum + toNumber(item.frequenza), 0)
    const causeValidate = form.cause_radice.filter(item => item.validata).length
    const contromisureCompletate = form.contromisure.filter(item => item.stato === 'Completata').length
    const ricorrenzePrima = form.contromisure.reduce((sum, item) => sum + toNumber(item.ricorrenze_prima), 0)
    const ricorrenzeDopo = form.contromisure.reduce((sum, item) => sum + toNumber(item.ricorrenze_dopo), 0)
    const riduzioneRicorrenze = ricorrenzePrima > 0
      ? ((ricorrenzePrima - ricorrenzeDopo) / ricorrenzePrima) * 100
      : 0

    return {
      anomalieTotali,
      causeValidate,
      contromisureCompletate,
      ricorrenzePrima,
      ricorrenzeDopo,
      riduzioneRicorrenze,
    }
  }, [form.anomalie, form.cause_radice, form.contromisure])

  const pareto = useMemo(() => {
    const totale = form.anomalie.reduce((sum, item) => sum + toNumber(item.frequenza), 0)
    let cumulata = 0

    return [...form.anomalie]
      .sort((a, b) => toNumber(b.frequenza) - toNumber(a.frequenza))
      .map(item => {
        const frequenza = toNumber(item.frequenza)
        cumulata += frequenza
        return {
          ...item,
          percentuale: totale > 0 ? (frequenza / totale) * 100 : 0,
          cumulata: totale > 0 ? (cumulata / totale) * 100 : 0,
        }
      })
  }, [form.anomalie])

  const updateField = (field, value) => {
    setSaved(false)
    setForm(current => ({ ...current, [field]: value }))
  }

  const addItem = (field, template, prefix) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      [field]: [...current[field], { ...template, id: createId(prefix) }],
    }))
  }

  const updateItem = (field, id, key, value) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      [field]: current[field].map(item =>
        item.id === id ? { ...item, [key]: value } : item
      ),
    }))
  }

  const removeItem = (field, id) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      [field]: current[field].filter(item => item.id !== id),
    }))
  }

  const save = async () => {
    if (form.anomalie.length === 0) return alert('Inserisci almeno una anomalia')
    if (!form.anomalie.some(item => item.prioritaria)) return alert('Seleziona almeno una anomalia prioritaria')
    if (form.cause_radice.length === 0) return alert('Inserisci almeno una causa radice')
    if (form.contromisure.length === 0) return alert('Inserisci almeno una contromisura')

    setSaving(true)
    try {
      await onChange({
        dati: {
          ...form,
          pareto_anomalie: pareto,
          riepilogo: summary,
        },
        output_compilati: {
          pareto_anomalie: pareto.length > 0,
          analisi_cause: Boolean(form.analisi_cause.trim()),
          cause_radice_validate: summary.causeValidate > 0,
          contromisure: form.contromisure.length > 0,
          risultati_test: form.contromisure.some(item => item.risultato_test.trim()),
          tabella_ricorrenze: form.contromisure.some(item => item.ricorrenze_prima !== ''),
          verifica_non_ricorrenza: summary.ricorrenzePrima > 0 && summary.ricorrenzeDopo < summary.ricorrenzePrima,
          standard_aggiornato: Boolean(form.standard_aggiornato.trim()),
        },
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Pareto delle anomalie</h3>
            <p className="text-xs text-gray-500 mt-1">Registra frequenza e impatto, poi seleziona le anomalie prioritarie.</p>
          </div>
          <button type="button" onClick={() => addItem('anomalie', EMPTY_ANOMALY, 'anomaly')} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi anomalia
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Anomalia</th>
                <th className="p-2 text-left">Categoria</th>
                <th className="p-2 text-left">Frequenza</th>
                <th className="p-2 text-left">Impatto</th>
                <th className="p-2 text-left">Causa sospetta</th>
                <th className="p-2 text-center">Prioritaria</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.anomalie.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-400">Nessuna anomalia inserita</td></tr>
              ) : form.anomalie.map(item => (
                <tr key={item.id} className="border-t">
                  <TableInput value={item.anomalia} onChange={value => updateItem('anomalie', item.id, 'anomalia', value)} />
                  <TableInput value={item.categoria} onChange={value => updateItem('anomalie', item.id, 'categoria', value)} />
                  <TableInput type="number" value={item.frequenza} onChange={value => updateItem('anomalie', item.id, 'frequenza', value)} />
                  <TableInput value={item.impatto} onChange={value => updateItem('anomalie', item.id, 'impatto', value)} />
                  <TableInput value={item.causa_sospetta} onChange={value => updateItem('anomalie', item.id, 'causa_sospetta', value)} />
                  <td className="p-2 text-center"><input type="checkbox" checked={item.prioritaria} onChange={event => updateItem('anomalie', item.id, 'prioritaria', event.target.checked)} className="w-4 h-4" /></td>
                  <DeleteCell onClick={() => removeItem('anomalie', item.id)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pareto.length > 0 && (
          <div className="space-y-3 mt-5">
            {pareto.map(item => (
              <div key={item.id}>
                <div className="flex justify-between gap-3 text-xs mb-1">
                  <span className="font-medium">{item.anomalia || 'Anomalia senza nome'}</span>
                  <span>{item.percentuale.toFixed(1)}% · cumulata {item.cumulata.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(item.percentuale, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Analisi delle cause</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TextAreaField label="Sintesi analisi cause" value={form.analisi_cause} onChange={value => updateField('analisi_cause', value)} placeholder="Riporta le conclusioni di Ishikawa, 5 Perché, 4M/5M o altre metodologie utilizzate" />
          <TextAreaField label="Evidenze e test sperimentali" value={form.evidenze_test} onChange={value => updateField('evidenze_test', value)} placeholder="Descrivi prove, misure e osservazioni usate per validare le cause" />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-800">Cause radice</h3>
          <button type="button" onClick={() => addItem('cause_radice', EMPTY_ROOT_CAUSE, 'cause')} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi causa
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Anomalia</th>
                <th className="p-2 text-left">Causa radice</th>
                <th className="p-2 text-left">Metodo di validazione</th>
                <th className="p-2 text-left">Evidenza</th>
                <th className="p-2 text-center">Validata</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.cause_radice.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-400">Nessuna causa radice inserita</td></tr>
              ) : form.cause_radice.map(item => (
                <tr key={item.id} className="border-t">
                  <TableInput value={item.anomalia_riferimento} onChange={value => updateItem('cause_radice', item.id, 'anomalia_riferimento', value)} />
                  <TableInput value={item.causa} onChange={value => updateItem('cause_radice', item.id, 'causa', value)} />
                  <TableInput value={item.metodo_validazione} onChange={value => updateItem('cause_radice', item.id, 'metodo_validazione', value)} />
                  <TableInput value={item.evidenza} onChange={value => updateItem('cause_radice', item.id, 'evidenza', value)} />
                  <td className="p-2 text-center"><input type="checkbox" checked={item.validata} onChange={event => updateItem('cause_radice', item.id, 'validata', event.target.checked)} className="w-4 h-4" /></td>
                  <DeleteCell onClick={() => removeItem('cause_radice', item.id)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-800">Contromisure e non ricorrenza</h3>
          <button type="button" onClick={() => addItem('contromisure', EMPTY_COUNTERMEASURE, 'countermeasure')} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi contromisura
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Causa</th>
                <th className="p-2 text-left">Contromisura</th>
                <th className="p-2 text-left">Responsabile</th>
                <th className="p-2 text-left">Scadenza</th>
                <th className="p-2 text-left">Stato</th>
                <th className="p-2 text-left">Risultato test</th>
                <th className="p-2 text-left">Ricorrenze prima</th>
                <th className="p-2 text-left">Ricorrenze dopo</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.contromisure.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center text-gray-400">Nessuna contromisura inserita</td></tr>
              ) : form.contromisure.map(item => (
                <tr key={item.id} className="border-t">
                  <TableInput value={item.causa_riferimento} onChange={value => updateItem('contromisure', item.id, 'causa_riferimento', value)} />
                  <TableInput value={item.contromisura} onChange={value => updateItem('contromisure', item.id, 'contromisura', value)} />
                  <TableInput value={item.responsabile} onChange={value => updateItem('contromisure', item.id, 'responsabile', value)} />
                  <TableInput type="date" value={item.scadenza} onChange={value => updateItem('contromisure', item.id, 'scadenza', value)} />
                  <TableSelect value={item.stato} onChange={value => updateItem('contromisure', item.id, 'stato', value)} options={['Da avviare', 'In corso', 'Completata', 'Bloccata']} />
                  <TableInput value={item.risultato_test} onChange={value => updateItem('contromisure', item.id, 'risultato_test', value)} />
                  <TableInput type="number" value={item.ricorrenze_prima} onChange={value => updateItem('contromisure', item.id, 'ricorrenze_prima', value)} />
                  <TableInput type="number" value={item.ricorrenze_dopo} onChange={value => updateItem('contromisure', item.id, 'ricorrenze_dopo', value)} />
                  <DeleteCell onClick={() => removeItem('contromisure', item.id)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <SummaryCard label="Cause validate" value={summary.causeValidate} />
          <SummaryCard label="Contromisure completate" value={summary.contromisureCompletate} />
          <SummaryCard label="Ricorrenze dopo" value={summary.ricorrenzeDopo} alert={summary.ricorrenzeDopo > 0} />
          <SummaryCard label="Riduzione ricorrenze" value={`${summary.riduzioneRicorrenze.toFixed(1)}%`} />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <TextAreaField label="Standard aggiornato" value={form.standard_aggiornato} onChange={value => updateField('standard_aggiornato', value)} placeholder="Descrivi le modifiche introdotte nello standard dopo la stabilizzazione" />
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Step salvato</span>}
        <button type="button" onClick={save} disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Stabilizzare'}
        </button>
      </div>
    </div>
  )
}

function buildForm(data) {
  return {
    anomalie: mapItems(data.anomalie, EMPTY_ANOMALY, 'anomaly'),
    analisi_cause: data.analisi_cause || '',
    evidenze_test: data.evidenze_test || '',
    cause_radice: mapItems(data.cause_radice, EMPTY_ROOT_CAUSE, 'cause'),
    contromisure: mapItems(data.contromisure, EMPTY_COUNTERMEASURE, 'countermeasure'),
    standard_aggiornato: data.standard_aggiornato || '',
  }
}

function mapItems(items, template, prefix) {
  return Array.isArray(items)
    ? items.map(item => ({ ...template, ...item, id: item.id || createId(prefix) }))
    : []
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}</label><textarea rows="4" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
}

function TableInput({ value, onChange, type = 'text' }) {
  return <td className="p-2"><input type={type} value={value} onChange={event => onChange(event.target.value)} step={type === 'number' ? 'any' : undefined} className="w-full border rounded px-2 py-1.5 text-sm" /></td>
}

function TableSelect({ value, onChange, options }) {
  return <td className="p-2"><select value={value} onChange={event => onChange(event.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">{options.map(option => <option key={option} value={option}>{option}</option>)}</select></td>
}

function DeleteCell({ onClick }) {
  return <td className="p-2"><button type="button" onClick={onClick} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={15} /></button></td>
}

function SummaryCard({ label, value, alert = false }) {
  return <div className={`rounded-lg p-3 ${alert ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-800'}`}><div className="text-xs uppercase opacity-70">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div>
}
