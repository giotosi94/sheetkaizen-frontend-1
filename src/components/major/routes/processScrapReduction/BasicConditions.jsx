import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import ImageUpload from '../../../ImageUpload'
import DocumentUpload from '../../../DocumentUpload'

const EMPTY_ANOMALY = {
  id: '',
  descrizione: '',
  area_componente: '',
  priorita: 'Media',
  stato: 'Aperta',
  responsabile: '',
  scadenza: '',
  note: '',
}

const EMPTY_PARAMETER = {
  id: '',
  parametro: '',
  valore_standard: '',
  unita: '',
  valore_rilevato: '',
  conforme: '',
  note: '',
}

export default function BasicConditions({ stepData, onChange }) {
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(buildForm(stepData?.dati || {}))
  }, [stepData?.dati])

  const summary = useMemo(() => {
    const totale = form.anomalie.length
    const aperte = form.anomalie.filter(item => item.stato !== 'Chiusa').length
    const criticheAperte = form.anomalie.filter(
      item => item.priorita === 'Critica' && item.stato !== 'Chiusa'
    ).length
    const parametriNonConformi = form.parametri_critici.filter(
      item => item.conforme === 'No'
    ).length

    return {
      totale,
      aperte,
      criticheAperte,
      parametriNonConformi,
    }
  }, [form.anomalie, form.parametri_critici])

  const updateField = (field, value) => {
    setSaved(false)
    setForm(current => ({ ...current, [field]: value }))
  }

  const addAnomaly = () => {
    setSaved(false)
    setForm(current => ({
      ...current,
      anomalie: [
        ...current.anomalie,
        { ...EMPTY_ANOMALY, id: createId('anomaly') },
      ],
    }))
  }

  const updateAnomaly = (id, field, value) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      anomalie: current.anomalie.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeAnomaly = id => {
    setSaved(false)
    setForm(current => ({
      ...current,
      anomalie: current.anomalie.filter(item => item.id !== id),
    }))
  }

  const addParameter = () => {
    setSaved(false)
    setForm(current => ({
      ...current,
      parametri_critici: [
        ...current.parametri_critici,
        { ...EMPTY_PARAMETER, id: createId('parameter') },
      ],
    }))
  }

  const updateParameter = (id, field, value) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      parametri_critici: current.parametri_critici.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeParameter = id => {
    setSaved(false)
    setForm(current => ({
      ...current,
      parametri_critici: current.parametri_critici.filter(item => item.id !== id),
    }))
  }

  const save = async () => {
    if (!form.migliore_pratica_attuale.trim()) {
      return alert('Descrivi la migliore pratica attuale')
    }
    if (!form.standard_corrente.trim()) {
      return alert('Descrivi lo standard corrente')
    }
    if (form.anomalie.length === 0) {
      return alert('Inserisci almeno una anomalia o conferma che non ne sono state rilevate nelle note')
    }

    setSaving(true)
    try {
      await onChange({
        dati: {
          ...form,
          riepilogo: summary,
        },
        output_compilati: {
          elenco_anomalie: form.anomalie.length > 0,
          registro_tag: form.anomalie.some(item => item.area_componente.trim()),
          fotografie_prima_dopo: form.immagini_prima.length > 0 && form.immagini_dopo.length > 0,
          action_plan_ripristino: form.anomalie.some(item => item.responsabile.trim()),
          parametri_critici: form.parametri_critici.length > 0,
          standard_corrente: Boolean(form.standard_corrente.trim()),
          evidenza_formazione: !form.formazione_necessaria || form.evidenze_formazione.length > 0,
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
        <h3 className="font-bold text-gray-800 mb-4">Condizioni di base e standard corrente</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TextAreaField
            label="Migliore pratica attuale"
            value={form.migliore_pratica_attuale}
            onChange={value => updateField('migliore_pratica_attuale', value)}
            placeholder="Descrivi come dovrebbe essere eseguito oggi il processo nelle migliori condizioni note"
            required
          />
          <TextAreaField
            label="Standard corrente"
            value={form.standard_corrente}
            onChange={value => updateField('standard_corrente', value)}
            placeholder="Descrivi lo standard iniziale disponibile prima del ripristino"
            required
          />
          <TextAreaField
            label="Condizioni originali da ripristinare"
            value={form.condizioni_originali}
            onChange={value => updateField('condizioni_originali', value)}
            placeholder="Elenca le condizioni nominali, tecniche e operative da recuperare"
          />
          <TextAreaField
            label="Standard di pulizia e ispezione"
            value={form.standard_pulizia_ispezione}
            onChange={value => updateField('standard_pulizia_ispezione', value)}
            placeholder="Definisci frequenza, modalità, punti da controllare e responsabilità"
          />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Registro anomalie e tag</h3>
            <p className="text-xs text-gray-500 mt-1">Registra anomalie evidenti, priorità, responsabilità e stato del ripristino.</p>
          </div>
          <button type="button" onClick={addAnomaly} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi anomalia
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Anomalia</th>
                <th className="p-2 text-left">Area / componente</th>
                <th className="p-2 text-left">Priorità</th>
                <th className="p-2 text-left">Stato</th>
                <th className="p-2 text-left">Responsabile</th>
                <th className="p-2 text-left">Scadenza</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.anomalie.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-400">Nessuna anomalia registrata</td></tr>
              ) : (
                form.anomalie.map(item => (
                  <tr key={item.id} className="border-t align-top">
                    <TableInput value={item.descrizione} onChange={value => updateAnomaly(item.id, 'descrizione', value)} placeholder="Descrizione" />
                    <TableInput value={item.area_componente} onChange={value => updateAnomaly(item.id, 'area_componente', value)} placeholder="Tag o componente" />
                    <TableSelect value={item.priorita} onChange={value => updateAnomaly(item.id, 'priorita', value)} options={['Bassa', 'Media', 'Alta', 'Critica']} />
                    <TableSelect value={item.stato} onChange={value => updateAnomaly(item.id, 'stato', value)} options={['Aperta', 'Pianificata', 'In corso', 'Chiusa']} />
                    <TableInput value={item.responsabile} onChange={value => updateAnomaly(item.id, 'responsabile', value)} placeholder="Nome" />
                    <TableInput type="date" value={item.scadenza} onChange={value => updateAnomaly(item.id, 'scadenza', value)} />
                    <TableInput value={item.note} onChange={value => updateAnomaly(item.id, 'note', value)} />
                    <td className="p-2"><button type="button" onClick={() => removeAnomaly(item.id)} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={15} /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <SummaryCard label="Totale anomalie" value={summary.totale} />
          <SummaryCard label="Anomalie aperte" value={summary.aperte} />
          <SummaryCard label="Critiche aperte" value={summary.criticheAperte} alert={summary.criticheAperte > 0} />
          <SummaryCard label="Parametri non conformi" value={summary.parametriNonConformi} alert={summary.parametriNonConformi > 0} />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Parametri critici</h3>
            <p className="text-xs text-gray-500 mt-1">Confronta il valore rilevato con lo standard iniziale.</p>
          </div>
          <button type="button" onClick={addParameter} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi parametro
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Parametro</th>
                <th className="p-2 text-left">Valore standard</th>
                <th className="p-2 text-left">Unità</th>
                <th className="p-2 text-left">Valore rilevato</th>
                <th className="p-2 text-left">Conforme</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.parametri_critici.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-400">Nessun parametro inserito</td></tr>
              ) : (
                form.parametri_critici.map(item => (
                  <tr key={item.id} className="border-t">
                    <TableInput value={item.parametro} onChange={value => updateParameter(item.id, 'parametro', value)} />
                    <TableInput value={item.valore_standard} onChange={value => updateParameter(item.id, 'valore_standard', value)} />
                    <TableInput value={item.unita} onChange={value => updateParameter(item.id, 'unita', value)} />
                    <TableInput value={item.valore_rilevato} onChange={value => updateParameter(item.id, 'valore_rilevato', value)} />
                    <TableSelect value={item.conforme} onChange={value => updateParameter(item.id, 'conforme', value)} options={['', 'Sì', 'No']} labels={{ '': 'Da verificare' }} />
                    <TableInput value={item.note} onChange={value => updateParameter(item.id, 'note', value)} />
                    <td className="p-2"><button type="button" onClick={() => removeParameter(item.id)} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={15} /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Evidenze prima e dopo</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImageUpload images={form.immagini_prima} onChange={value => updateField('immagini_prima', value)} label="Prima del ripristino" maxImages={10} />
          <ImageUpload images={form.immagini_dopo} onChange={value => updateField('immagini_dopo', value)} label="Dopo il ripristino" maxImages={10} />
        </div>
        <div className="mt-6">
          <DocumentUpload documents={form.documenti_standard} onChange={value => updateField('documenti_standard', value)} />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Formazione</h3>
        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={form.formazione_necessaria} onChange={event => updateField('formazione_necessaria', event.target.checked)} className="w-4 h-4" />
          È necessaria formazione per applicare lo standard ripristinato
        </label>
        {form.formazione_necessaria && (
          <div className="space-y-4">
            <TextAreaField label="Piano di formazione" value={form.piano_formazione} onChange={value => updateField('piano_formazione', value)} placeholder="Indica destinatari, contenuti e modalità" />
            <DocumentUpload documents={form.evidenze_formazione} onChange={value => updateField('evidenze_formazione', value)} />
          </div>
        )}
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Step salvato</span>}
        <button type="button" onClick={save} disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Ripristinare'}
        </button>
      </div>
    </div>
  )
}

function buildForm(data) {
  return {
    migliore_pratica_attuale: data.migliore_pratica_attuale || '',
    standard_corrente: data.standard_corrente || '',
    condizioni_originali: data.condizioni_originali || '',
    standard_pulizia_ispezione: data.standard_pulizia_ispezione || '',
    anomalie: Array.isArray(data.anomalie)
      ? data.anomalie.map(item => ({ ...EMPTY_ANOMALY, ...item, id: item.id || createId('anomaly') }))
      : [],
    parametri_critici: Array.isArray(data.parametri_critici)
      ? data.parametri_critici.map(item => ({ ...EMPTY_PARAMETER, ...item, id: item.id || createId('parameter') }))
      : [],
    immagini_prima: Array.isArray(data.immagini_prima) ? data.immagini_prima : [],
    immagini_dopo: Array.isArray(data.immagini_dopo) ? data.immagini_dopo : [],
    documenti_standard: Array.isArray(data.documenti_standard) ? data.documenti_standard : [],
    formazione_necessaria: Boolean(data.formazione_necessaria),
    piano_formazione: data.piano_formazione || '',
    evidenze_formazione: Array.isArray(data.evidenze_formazione) ? data.evidenze_formazione : [],
  }
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function TextAreaField({ label, value, onChange, placeholder, required = false }) {
  return <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label><textarea rows="4" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
}

function TableInput({ value, onChange, type = 'text', placeholder = '' }) {
  return <td className="p-2"><input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full border rounded px-2 py-1.5 text-sm" /></td>
}

function TableSelect({ value, onChange, options, labels = {} }) {
  return <td className="p-2"><select value={value} onChange={event => onChange(event.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">{options.map(option => <option key={option || 'empty'} value={option}>{labels[option] || option}</option>)}</select></td>
}

function SummaryCard({ label, value, alert = false }) {
  return <div className={`rounded-lg p-3 ${alert ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-800'}`}><div className="text-xs uppercase opacity-70">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div>
}
