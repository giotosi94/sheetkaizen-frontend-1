import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import DocumentUpload from '../../../DocumentUpload'

const EMPTY_CONTROL = {
  id: '',
  elemento: '',
  metodo_controllo: '',
  frequenza: '',
  responsabile: '',
  limite_reazione: '',
  azione_reazione: '',
  stato: 'Da attivare',
}

const EMPTY_TRAINING = {
  id: '',
  persona_ruolo: '',
  standard_opl: '',
  data_formazione: '',
  competenza_verificata: false,
  verificato_da: '',
  note: '',
}

const EMPTY_CHECK = {
  id: '',
  descrizione: '',
  obbligatorio: true,
  completato: false,
  evidenza: '',
}

export default function SustainmentPlan({ stepData, onChange }) {
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(buildForm(stepData?.dati || {}))
  }, [stepData?.dati])

  const summary = useMemo(() => {
    const controlliAttivi = form.control_plan.filter(item => item.stato === 'Attivo').length
    const personeFormate = form.formazione.filter(item => item.data_formazione).length
    const competenzeVerificate = form.formazione.filter(item => item.competenza_verificata).length
    const checkObbligatori = form.check_chiusura.filter(item => item.obbligatorio)
    const checkCompletati = checkObbligatori.filter(item => item.completato).length
    const percentualeChiusura = checkObbligatori.length > 0
      ? (checkCompletati / checkObbligatori.length) * 100
      : 0

    return {
      controlliAttivi,
      personeFormate,
      competenzeVerificate,
      checkCompletati,
      checkObbligatori: checkObbligatori.length,
      percentualeChiusura,
    }
  }, [form.control_plan, form.formazione, form.check_chiusura])

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
    if (!form.standard_definitivo.trim()) return alert('Descrivi lo standard definitivo')
    if (form.control_plan.length === 0) return alert('Inserisci almeno un controllo nel Control Plan')
    if (!form.periodo_sostenibilita.trim()) return alert('Definisci il periodo di verifica della sostenibilità')
    if (form.check_chiusura.some(item => item.obbligatorio && !item.completato)) {
      return alert('Completa tutti i controlli obbligatori prima della chiusura')
    }

    setSaving(true)
    try {
      await onChange({
        dati: {
          ...form,
          riepilogo: summary,
        },
        output_compilati: {
          action_plan_completati: form.check_chiusura.some(item => item.descrizione.toLowerCase().includes('action plan') && item.completato),
          standard_definitivo: Boolean(form.standard_definitivo.trim()),
          opl_collegate: form.documenti_opl.length > 0,
          checklist: form.check_chiusura.length > 0,
          evidenze_formazione: form.formazione.length > 0,
          competenze_verificate: summary.competenzeVerificate > 0,
          kpi_finale: form.kpi_finale !== '',
          saving_previsto: form.saving_previsto !== '',
          saving_verificato: form.saving_verificato !== '',
          control_plan: form.control_plan.length > 0,
          verifica_efficacia: Boolean(form.verifica_efficacia.trim()),
          verifica_sostenibilita: Boolean(form.verifica_sostenibilita.trim()),
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
        <h3 className="font-bold text-gray-800 mb-4">Standardizzazione finale</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TextAreaField label="Standard definitivo" value={form.standard_definitivo} onChange={value => updateField('standard_definitivo', value)} placeholder="Descrivi il metodo definitivo approvato, i parametri e le responsabilità" required />
          <TextAreaField label="Modifiche rispetto allo standard precedente" value={form.modifiche_standard} onChange={value => updateField('modifiche_standard', value)} placeholder="Riassumi le modifiche introdotte e il motivo" />
        </div>
        <div className="mt-5">
          <DocumentUpload documents={form.documenti_standard} onChange={value => updateField('documenti_standard', value)} />
        </div>
        <div className="mt-5">
          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">OPL collegate</div>
          <DocumentUpload documents={form.documenti_opl} onChange={value => updateField('documenti_opl', value)} />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Control Plan</h3>
            <p className="text-xs text-gray-500 mt-1">Definisci cosa controllare, frequenza, responsabilità e reazione alle deviazioni.</p>
          </div>
          <button type="button" onClick={() => addItem('control_plan', EMPTY_CONTROL, 'control')} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi controllo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Elemento controllato</th>
                <th className="p-2 text-left">Metodo di controllo</th>
                <th className="p-2 text-left">Frequenza</th>
                <th className="p-2 text-left">Responsabile</th>
                <th className="p-2 text-left">Limite / soglia</th>
                <th className="p-2 text-left">Piano di reazione</th>
                <th className="p-2 text-left">Stato</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.control_plan.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-400">Nessun controllo inserito</td></tr>
              ) : form.control_plan.map(item => (
                <tr key={item.id} className="border-t">
                  <TableInput value={item.elemento} onChange={value => updateItem('control_plan', item.id, 'elemento', value)} />
                  <TableInput value={item.metodo_controllo} onChange={value => updateItem('control_plan', item.id, 'metodo_controllo', value)} />
                  <TableInput value={item.frequenza} onChange={value => updateItem('control_plan', item.id, 'frequenza', value)} />
                  <TableInput value={item.responsabile} onChange={value => updateItem('control_plan', item.id, 'responsabile', value)} />
                  <TableInput value={item.limite_reazione} onChange={value => updateItem('control_plan', item.id, 'limite_reazione', value)} />
                  <TableInput value={item.azione_reazione} onChange={value => updateItem('control_plan', item.id, 'azione_reazione', value)} />
                  <TableSelect value={item.stato} onChange={value => updateItem('control_plan', item.id, 'stato', value)} options={['Da attivare', 'Attivo', 'Sospeso']} />
                  <DeleteCell onClick={() => removeItem('control_plan', item.id)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Formazione e verifica competenze</h3>
            <p className="text-xs text-gray-500 mt-1">Registra formazione sul nuovo standard e conferma la competenza.</p>
          </div>
          <button type="button" onClick={() => addItem('formazione', EMPTY_TRAINING, 'training')} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi persona
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Persona / ruolo</th>
                <th className="p-2 text-left">Standard / OPL</th>
                <th className="p-2 text-left">Data formazione</th>
                <th className="p-2 text-center">Competenza verificata</th>
                <th className="p-2 text-left">Verificato da</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.formazione.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-400">Nessuna formazione registrata</td></tr>
              ) : form.formazione.map(item => (
                <tr key={item.id} className="border-t">
                  <TableInput value={item.persona_ruolo} onChange={value => updateItem('formazione', item.id, 'persona_ruolo', value)} />
                  <TableInput value={item.standard_opl} onChange={value => updateItem('formazione', item.id, 'standard_opl', value)} />
                  <TableInput type="date" value={item.data_formazione} onChange={value => updateItem('formazione', item.id, 'data_formazione', value)} />
                  <td className="p-2 text-center"><input type="checkbox" checked={item.competenza_verificata} onChange={event => updateItem('formazione', item.id, 'competenza_verificata', event.target.checked)} className="w-4 h-4" /></td>
                  <TableInput value={item.verificato_da} onChange={value => updateItem('formazione', item.id, 'verificato_da', value)} />
                  <TableInput value={item.note} onChange={value => updateItem('formazione', item.id, 'note', value)} />
                  <DeleteCell onClick={() => removeItem('formazione', item.id)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Risultati e sostenibilità</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="KPI finale" type="number" value={form.kpi_finale} onChange={value => updateField('kpi_finale', value)} />
          <InputField label="Saving previsto" type="number" value={form.saving_previsto} onChange={value => updateField('saving_previsto', value)} />
          <InputField label="Saving verificato" type="number" value={form.saving_verificato} onChange={value => updateField('saving_verificato', value)} />
          <InputField label="Periodo sostenibilità" value={form.periodo_sostenibilita} onChange={value => updateField('periodo_sostenibilita', value)} placeholder="Es. 8 settimane" required />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <TextAreaField label="Verifica efficacia" value={form.verifica_efficacia} onChange={value => updateField('verifica_efficacia', value)} placeholder="Confronta baseline, target e risultato finale" />
          <TextAreaField label="Verifica sostenibilità" value={form.verifica_sostenibilita} onChange={value => updateField('verifica_sostenibilita', value)} placeholder="Descrivi andamento del risultato nel periodo definito" />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Checklist di chiusura</h3>
            <p className="text-xs text-gray-500 mt-1">I controlli obbligatori devono essere completati prima della chiusura dello step.</p>
          </div>
          <button type="button" onClick={() => addItem('check_chiusura', EMPTY_CHECK, 'check')} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi controllo
          </button>
        </div>
        <div className="space-y-2">
          {form.check_chiusura.map(item => (
            <div key={item.id} className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-3 items-center border rounded-lg p-3">
              <input type="checkbox" checked={item.completato} onChange={event => updateItem('check_chiusura', item.id, 'completato', event.target.checked)} className="w-4 h-4" />
              <input value={item.descrizione} onChange={event => updateItem('check_chiusura', item.id, 'descrizione', event.target.value)} placeholder="Controllo di chiusura" className="border rounded px-3 py-2 text-sm" />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={item.obbligatorio} onChange={event => updateItem('check_chiusura', item.id, 'obbligatorio', event.target.checked)} /> Obbligatorio</label>
              <input value={item.evidenza} onChange={event => updateItem('check_chiusura', item.id, 'evidenza', event.target.value)} placeholder="Evidenza / riferimento" className="border rounded px-3 py-2 text-sm" />
              <button type="button" onClick={() => removeItem('check_chiusura', item.id)} className="text-red-600 p-1"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <SummaryCard label="Controlli attivi" value={summary.controlliAttivi} />
          <SummaryCard label="Persone formate" value={summary.personeFormate} />
          <SummaryCard label="Competenze verificate" value={summary.competenzeVerificate} />
          <SummaryCard label="Check completati" value={`${summary.checkCompletati}/${summary.checkObbligatori}`} />
          <SummaryCard label="Chiusura" value={`${summary.percentualeChiusura.toFixed(0)}%`} positive={summary.percentualeChiusura === 100} />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Step salvato</span>}
        <button type="button" onClick={save} disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Sostenere'}
        </button>
      </div>
    </div>
  )
}

function buildForm(data) {
  const defaultChecks = [
    { ...EMPTY_CHECK, id: createId('check'), descrizione: 'Action Plan obbligatori chiusi' },
    { ...EMPTY_CHECK, id: createId('check'), descrizione: 'KPI finale registrato' },
    { ...EMPTY_CHECK, id: createId('check'), descrizione: 'Confronto baseline, target e finale completato' },
    { ...EMPTY_CHECK, id: createId('check'), descrizione: 'Standard definitivo approvato' },
    { ...EMPTY_CHECK, id: createId('check'), descrizione: 'Formazione completata' },
    { ...EMPTY_CHECK, id: createId('check'), descrizione: 'Competenze verificate' },
    { ...EMPTY_CHECK, id: createId('check'), descrizione: 'Risultato sostenuto per il periodo definito' },
    { ...EMPTY_CHECK, id: createId('check'), descrizione: 'Saving validato' },
  ]

  return {
    standard_definitivo: data.standard_definitivo || '',
    modifiche_standard: data.modifiche_standard || '',
    documenti_standard: Array.isArray(data.documenti_standard) ? data.documenti_standard : [],
    documenti_opl: Array.isArray(data.documenti_opl) ? data.documenti_opl : [],
    control_plan: mapItems(data.control_plan, EMPTY_CONTROL, 'control'),
    formazione: mapItems(data.formazione, EMPTY_TRAINING, 'training'),
    kpi_finale: valueOrEmpty(data.kpi_finale),
    saving_previsto: valueOrEmpty(data.saving_previsto),
    saving_verificato: valueOrEmpty(data.saving_verificato),
    periodo_sostenibilita: data.periodo_sostenibilita || '',
    verifica_efficacia: data.verifica_efficacia || '',
    verifica_sostenibilita: data.verifica_sostenibilita || '',
    check_chiusura: Array.isArray(data.check_chiusura) && data.check_chiusura.length > 0
      ? mapItems(data.check_chiusura, EMPTY_CHECK, 'check')
      : defaultChecks,
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

function valueOrEmpty(value) {
  return value === null || value === undefined ? '' : value
}

function InputField({ label, value, onChange, type = 'text', placeholder = '', required = false }) {
  return <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label><input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} step={type === 'number' ? 'any' : undefined} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
}

function TextAreaField({ label, value, onChange, placeholder, required = false }) {
  return <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label><textarea rows="4" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
}

function TableInput({ value, onChange, type = 'text' }) {
  return <td className="p-2"><input type={type} value={value} onChange={event => onChange(event.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></td>
}

function TableSelect({ value, onChange, options }) {
  return <td className="p-2"><select value={value} onChange={event => onChange(event.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">{options.map(option => <option key={option} value={option}>{option}</option>)}</select></td>
}

function DeleteCell({ onClick }) {
  return <td className="p-2"><button type="button" onClick={onClick} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={15} /></button></td>
}

function SummaryCard({ label, value, positive = false }) {
  return <div className={`rounded-lg p-3 ${positive ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-800'}`}><div className="text-xs uppercase opacity-70">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div>
}
