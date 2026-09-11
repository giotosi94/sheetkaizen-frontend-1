import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Plus, Save, Search, Trash2, X } from 'lucide-react'
import api from '../../../../services/api'
import UserPicker from '../../../UserPicker'
import DocumentUpload from '../../../DocumentUpload'

const LEVELS = [
  { value: 1, label: '1 - Non conosce la teoria' },
  { value: 2, label: '2 - Conosce la teoria' },
  { value: 3, label: '3 - Applica secondo standard' },
  { value: 4, label: '4 - Applica in autonomia fuori standard' },
  { value: 5, label: '5 - Sa insegnare' },
]

const EMPTY_IMPLEMENTATION = {
  id: '',
  source_id: '',
  azione: '',
  responsabile: '',
  scadenza: '',
  stato: 'Da avviare',
  risultato: '',
}

const EMPTY_SKILL = {
  id: '',
  persona_id: '',
  persona_nome: '',
  competenza: '',
  iniziale: '',
  target: '',
  finale: '',
  data_formazione: '',
  verificato_da: '',
}

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

const EMPTY_CHECK = {
  id: '',
  descrizione: '',
  obbligatorio: true,
  completato: false,
  evidenza: '',
}

export default function SustainmentPlan({ stepData, onChange, allStepsData = {} }) {
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [documents, setDocuments] = useState([])
  const [showOplModal, setShowOplModal] = useState(false)
  const [oplSearch, setOplSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const step5Activities = allStepsData?.step_5?.dati?.attivita || []

  useEffect(() => {
    setForm(buildForm(stepData?.dati || {}))
  }, [stepData?.dati])

  useEffect(() => {
    api.get('/documenti', { params: { tipo: 'OPL' } })
      .then(response => setDocuments((response.data || []).filter(item => item.tipo === 'OPL')))
      .catch(() => setDocuments([]))
  }, [])

  useEffect(() => {
    if (step5Activities.length === 0) return
    setForm(current => {
      const existingIds = new Set(current.piano_implementazione.map(item => item.source_id).filter(Boolean))
      const imported = step5Activities
        .filter(item => item.descrizione_futura?.trim() && !existingIds.has(item.id))
        .map(item => ({
          ...EMPTY_IMPLEMENTATION,
          id: createId('implementation'),
          source_id: item.id,
          azione: item.descrizione_futura,
          responsabile: item.responsabile || '',
          stato: mapImplementationStatus(item.stato),
        }))
      return imported.length > 0
        ? { ...current, piano_implementazione: [...current.piano_implementazione, ...imported] }
        : current
    })
  }, [step5Activities])

  const summary = useMemo(() => {
    const azioniCompletate = form.piano_implementazione.filter(item => item.stato === 'Completata' || item.stato === 'Verificata').length
    const competenzeTarget = form.skill_matrix.filter(item => Number(item.finale) >= Number(item.target) && Number(item.target) > 0).length
    const gapAperti = form.skill_matrix.filter(item => Number(item.finale || item.iniziale) < Number(item.target) && Number(item.target) > 0).length
    const controlliAttivi = form.control_plan.filter(item => item.stato === 'Attivo').length
    const obbligatori = form.check_chiusura.filter(item => item.obbligatorio)
    const completati = obbligatori.filter(item => item.completato).length
    return {
      azioniCompletate,
      azioniTotali: form.piano_implementazione.length,
      competenzeTarget,
      gapAperti,
      controlliAttivi,
      chiusura: obbligatori.length > 0 ? (completati / obbligatori.length) * 100 : 0,
    }
  }, [form])

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
      [field]: current[field].map(item => item.id === id ? { ...item, [key]: value } : item),
    }))
  }

  const removeItem = (field, id) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      [field]: current[field].filter(item => item.id !== id),
    }))
  }

  const addPerson = selected => {
    if (!selected) return
    if (form.persone_coinvolte.some(item => item.id === selected.id)) return
    updateField('persone_coinvolte', [...form.persone_coinvolte, { id: selected.id, nome: selected.name }])
  }

  const addSkillPerson = selected => {
    if (!selected) return
    addSkillRow({ persona_id: selected.id, persona_nome: selected.name })
  }

  const addSkillRow = values => {
    setSaved(false)
    setForm(current => ({
      ...current,
      skill_matrix: [...current.skill_matrix, { ...EMPTY_SKILL, ...values, id: createId('skill') }],
    }))
  }

  const toggleOpl = document => {
    const exists = form.opl_collegate.some(item => item.id === document._id)
    updateField(
      'opl_collegate',
      exists
        ? form.opl_collegate.filter(item => item.id !== document._id)
        : [...form.opl_collegate, {
            id: document._id,
            numero: document.numero,
            titolo: document.titolo,
            versione: document.versione,
            stato: document.stato,
          }]
    )
  }

  const save = async () => {
    if (form.piano_implementazione.length === 0) return alert('Inserisci almeno una azione da implementare')
    if (!form.standard_definitivo.trim()) return alert('Descrivi lo standard definitivo')
    if (form.control_plan.length === 0) return alert('Inserisci almeno un controllo nel Control Plan')
    if (!form.periodo_sostenibilita.trim()) return alert('Definisci il periodo di sostenibilità')
    setSaving(true)
    try {
      await onChange({
        dati: { ...form, riepilogo: summary },
        output_compilati: {
          piano_azioni: form.piano_implementazione.length > 0,
          azioni_implementate: summary.azioniCompletate > 0,
          opl_collegate: form.opl_collegate.length > 0,
          standard_definitivo: Boolean(form.standard_definitivo.trim()),
          visual_management: Boolean(form.visual_management.trim()),
          tabellone_macchina: Boolean(form.tabellone_macchina.trim()),
          skill_matrix: form.skill_matrix.length > 0,
          competenze_verificate: summary.competenzeTarget > 0,
          control_plan: form.control_plan.length > 0,
          verifica_sostenibilita: Boolean(form.verifica_sostenibilita.trim()),
        },
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const filteredOpl = documents.filter(item => {
    const search = oplSearch.trim().toLowerCase()
    return !search || `${item.numero || ''} ${item.titolo || ''} ${item.reparto || ''} ${item.linea || ''}`.toLowerCase().includes(search)
  })

  return (
    <div className="space-y-4">
      <Section title="Piano di implementazione delle azioni">
        <SectionHeader text="Le azioni del metodo futuro definite nello Step 5 vengono riportate automaticamente." onAdd={() => addItem('piano_implementazione', EMPTY_IMPLEMENTATION, 'implementation')} addLabel="Aggiungi azione" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr><Th>Azione</Th><Th>Responsabile</Th><Th>Scadenza</Th><Th>Stato</Th><Th>Risultato</Th><th className="w-10" /></tr></thead>
            <tbody>
              {form.piano_implementazione.map(item => (
                <tr key={item.id} className="border-t">
                  <TableInput value={item.azione} onChange={value => updateItem('piano_implementazione', item.id, 'azione', value)} />
                  <TableInput value={item.responsabile} onChange={value => updateItem('piano_implementazione', item.id, 'responsabile', value)} />
                  <TableInput type="date" value={item.scadenza} onChange={value => updateItem('piano_implementazione', item.id, 'scadenza', value)} />
                  <TableSelect value={item.stato} onChange={value => updateItem('piano_implementazione', item.id, 'stato', value)} options={['Da avviare', 'In corso', 'Completata', 'Verificata', 'Bloccata']} />
                  <TableInput value={item.risultato} onChange={value => updateItem('piano_implementazione', item.id, 'risultato', value)} />
                  <DeleteCell onClick={() => removeItem('piano_implementazione', item.id)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="OPL collegate">
        <div className="flex justify-between items-center gap-3 mb-3">
          <p className="text-sm text-gray-500">Collega OPL già presenti nel Document Manager.</p>
          <button type="button" onClick={() => setShowOplModal(true)} className="px-3 py-2 bg-primary text-white rounded-lg text-sm">Collega OPL</button>
        </div>
        {form.opl_collegate.length === 0 ? <Empty text="Nessuna OPL collegata" /> : (
          <div className="divide-y border rounded-lg">
            {form.opl_collegate.map(item => (
              <div key={item.id} className="p-3 flex items-center gap-3">
                <div className="flex-1"><div className="font-mono text-xs font-bold text-primary">{item.numero}</div><div className="text-sm font-medium">{item.titolo}</div></div>
                <a href={`/documenti?opl=${item.id}`} className="p-2 text-primary" title="Apri"><ExternalLink size={16} /></a>
                <button type="button" onClick={() => toggleOpl({ _id: item.id })} className="p-2 text-red-600"><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Standard e visual management">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TextAreaField label="Standard definitivo" value={form.standard_definitivo} onChange={value => updateField('standard_definitivo', value)} required />
          <TextAreaField label="Modifiche introdotte" value={form.modifiche_standard} onChange={value => updateField('modifiche_standard', value)} />
          <TextAreaField label="Visual management" value={form.visual_management} onChange={value => updateField('visual_management', value)} placeholder="Checklist, etichette, segnali visivi e controlli sul posto" />
          <TextAreaField label="Tabellone Macchina" value={form.tabellone_macchina} onChange={value => updateField('tabellone_macchina', value)} placeholder="KPI, frequenza aggiornamento, proprietario e posizione" />
        </div>
        <div className="mt-4"><DocumentUpload documents={form.documenti_standard} onChange={value => updateField('documenti_standard', value)} /></div>
      </Section>

      <Section title="Persone coinvolte e formazione">
        <div className="max-w-xl mb-4"><UserPicker value={null} onChange={addPerson} mode="single" placeholder="Aggiungi persona coinvolta..." /></div>
        <div className="flex flex-wrap gap-2 mb-4">
          {form.persone_coinvolte.map(item => <span key={item.id} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm flex items-center gap-2">{item.nome}<button type="button" onClick={() => updateField('persone_coinvolte', form.persone_coinvolte.filter(person => person.id !== item.id))}><X size={13} /></button></span>)}
        </div>
        <TextAreaField label="Piano di formazione" value={form.piano_formazione} onChange={value => updateField('piano_formazione', value)} placeholder="Contenuti, modalità, date e responsabilità" />
      </Section>

      <Section title="Skill Matrix del progetto">
        <div className="flex justify-between items-center gap-3 mb-3">
          <p className="text-sm text-gray-500">Scala 1-5 coerente con la Skill Matrix Pillar.</p>
          <button type="button" onClick={() => addSkillRow({})} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2"><Plus size={15} /> Aggiungi riga</button>
        </div>
        <div className="max-w-xl mb-4"><UserPicker value={null} onChange={addSkillPerson} mode="single" placeholder="Aggiungi persona alla matrice..." /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr><Th>Persona</Th><Th>Competenza</Th><Th>Iniziale</Th><Th>Target</Th><Th>Finale</Th><Th>Gap</Th><Th>Data formazione</Th><Th>Verificato da</Th><th className="w-10" /></tr></thead>
            <tbody>
              {form.skill_matrix.map(item => {
                const finalValue = Number(item.finale || item.iniziale || 0)
                const gap = Number(item.target || 0) - finalValue
                return <tr key={item.id} className="border-t">
                  <TableInput value={item.persona_nome} onChange={value => updateItem('skill_matrix', item.id, 'persona_nome', value)} />
                  <TableInput value={item.competenza} onChange={value => updateItem('skill_matrix', item.id, 'competenza', value)} />
                  <LevelCell value={item.iniziale} onChange={value => updateItem('skill_matrix', item.id, 'iniziale', value)} />
                  <LevelCell value={item.target} onChange={value => updateItem('skill_matrix', item.id, 'target', value)} />
                  <LevelCell value={item.finale} onChange={value => updateItem('skill_matrix', item.id, 'finale', value)} />
                  <td className={`p-2 text-center font-bold ${gap > 0 ? 'text-red-600' : 'text-green-600'}`}>{item.target ? gap : '—'}</td>
                  <TableInput type="date" value={item.data_formazione} onChange={value => updateItem('skill_matrix', item.id, 'data_formazione', value)} />
                  <TableInput value={item.verificato_da} onChange={value => updateItem('skill_matrix', item.id, 'verificato_da', value)} />
                  <DeleteCell onClick={() => removeItem('skill_matrix', item.id)} />
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Control Plan">
        <SectionHeader text="Definisci controlli, soglie e piano di reazione." onAdd={() => addItem('control_plan', EMPTY_CONTROL, 'control')} addLabel="Aggiungi controllo" />
        <div className="overflow-x-auto"><table className="w-full min-w-[1300px] text-sm"><thead className="bg-gray-50 text-gray-600"><tr><Th>Elemento</Th><Th>Metodo</Th><Th>Frequenza</Th><Th>Responsabile</Th><Th>Limite</Th><Th>Piano di reazione</Th><Th>Stato</Th><th className="w-10" /></tr></thead><tbody>{form.control_plan.map(item => <tr key={item.id} className="border-t"><TableInput value={item.elemento} onChange={value => updateItem('control_plan', item.id, 'elemento', value)} /><TableInput value={item.metodo_controllo} onChange={value => updateItem('control_plan', item.id, 'metodo_controllo', value)} /><TableInput value={item.frequenza} onChange={value => updateItem('control_plan', item.id, 'frequenza', value)} /><TableInput value={item.responsabile} onChange={value => updateItem('control_plan', item.id, 'responsabile', value)} /><TableInput value={item.limite_reazione} onChange={value => updateItem('control_plan', item.id, 'limite_reazione', value)} /><TableInput value={item.azione_reazione} onChange={value => updateItem('control_plan', item.id, 'azione_reazione', value)} /><TableSelect value={item.stato} onChange={value => updateItem('control_plan', item.id, 'stato', value)} options={['Da attivare', 'Attivo', 'Sospeso']} /><DeleteCell onClick={() => removeItem('control_plan', item.id)} /></tr>)}</tbody></table></div>
      </Section>

      <Section title="Risultati e sostenibilità">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><InputField label="KPI finale" type="number" value={form.kpi_finale} onChange={value => updateField('kpi_finale', value)} /><InputField label="Periodo sostenibilità" value={form.periodo_sostenibilita} onChange={value => updateField('periodo_sostenibilita', value)} /><TextAreaField label="Verifica sostenibilità" value={form.verifica_sostenibilita} onChange={value => updateField('verifica_sostenibilita', value)} /></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4"><SummaryCard label="Azioni completate" value={`${summary.azioniCompletate}/${summary.azioniTotali}`} /><SummaryCard label="Competenze a target" value={summary.competenzeTarget} /><SummaryCard label="Gap aperti" value={summary.gapAperti} /><SummaryCard label="Controlli attivi" value={summary.controlliAttivi} /><SummaryCard label="Chiusura" value={`${summary.chiusura.toFixed(0)}%`} /></div>
      </Section>

      <Section title="Checklist di chiusura">
        <SectionHeader text="Completa i controlli richiesti per la chiusura." onAdd={() => addItem('check_chiusura', EMPTY_CHECK, 'check')} addLabel="Aggiungi controllo" />
        <div className="space-y-2">{form.check_chiusura.map(item => <div key={item.id} className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-3 items-center border rounded-lg p-3"><input type="checkbox" checked={item.completato} onChange={event => updateItem('check_chiusura', item.id, 'completato', event.target.checked)} /><input value={item.descrizione} onChange={event => updateItem('check_chiusura', item.id, 'descrizione', event.target.value)} className="border rounded px-3 py-2 text-sm" /><label className="text-xs"><input type="checkbox" checked={item.obbligatorio} onChange={event => updateItem('check_chiusura', item.id, 'obbligatorio', event.target.checked)} /> Obbligatorio</label><input value={item.evidenza} onChange={event => updateItem('check_chiusura', item.id, 'evidenza', event.target.value)} className="border rounded px-3 py-2 text-sm" placeholder="Evidenza" /><button type="button" onClick={() => removeItem('check_chiusura', item.id)} className="text-red-600"><Trash2 size={15} /></button></div>)}</div>
      </Section>

      <div className="flex justify-end gap-3">{saved && <span className="text-sm text-green-700 self-center">Step salvato</span>}<button type="button" onClick={save} disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Implementare e sostenere'}</button></div>

      {showOplModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"><div className="bg-primary text-white p-4 rounded-t-xl flex justify-between"><h3 className="font-bold">Collega OPL</h3><button type="button" onClick={() => setShowOplModal(false)}><X size={18} /></button></div><div className="p-4 border-b relative"><Search size={16} className="absolute left-7 top-7 text-gray-400" /><input value={oplSearch} onChange={event => setOplSearch(event.target.value)} className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" placeholder="Cerca numero, titolo, reparto o linea..." /></div><div className="overflow-y-auto p-4 divide-y">{filteredOpl.map(item => { const selected = form.opl_collegate.some(opl => opl.id === item._id); return <div key={item._id} className="p-3 flex items-center gap-3"><div className="flex-1"><div className="font-mono text-xs font-bold text-primary">{item.numero}</div><div className="text-sm font-medium">{item.titolo}</div><div className="text-xs text-gray-500">{[item.reparto, item.linea, `v${item.versione || 1}`, item.stato].filter(Boolean).join(' · ')}</div></div><button type="button" onClick={() => toggleOpl(item)} className={`px-3 py-2 rounded-lg text-sm ${selected ? 'bg-red-50 text-red-700' : 'bg-primary text-white'}`}>{selected ? 'Scollega' : 'Collega'}</button></div>})}</div></div></div>}
    </div>
  )
}

function buildForm(data) {
  const defaultChecks = ['Azioni di miglioramento implementate', 'OPL collegate', 'Standard aggiornato', 'Visual management predisposto', 'Formazione completata', 'Skill target verificata', 'Tabellone Macchina predisposto', 'Control Plan attivo', 'Risultato sostenuto nel periodo definito']
  return {
    piano_implementazione: mapItems(data.piano_implementazione, EMPTY_IMPLEMENTATION, 'implementation'),
    opl_collegate: Array.isArray(data.opl_collegate) ? data.opl_collegate : [],
    standard_definitivo: data.standard_definitivo || '',
    modifiche_standard: data.modifiche_standard || '',
    visual_management: data.visual_management || '',
    tabellone_macchina: data.tabellone_macchina || '',
    documenti_standard: Array.isArray(data.documenti_standard) ? data.documenti_standard : [],
    persone_coinvolte: Array.isArray(data.persone_coinvolte) ? data.persone_coinvolte : [],
    piano_formazione: data.piano_formazione || '',
    skill_matrix: mapItems(data.skill_matrix, EMPTY_SKILL, 'skill'),
    control_plan: mapItems(data.control_plan, EMPTY_CONTROL, 'control'),
    kpi_finale: valueOrEmpty(data.kpi_finale),
    periodo_sostenibilita: data.periodo_sostenibilita || '',
    verifica_sostenibilita: data.verifica_sostenibilita || '',
    check_chiusura: Array.isArray(data.check_chiusura) && data.check_chiusura.length > 0 ? mapItems(data.check_chiusura, EMPTY_CHECK, 'check') : defaultChecks.map(descrizione => ({ ...EMPTY_CHECK, id: createId('check'), descrizione })),
  }
}

function mapImplementationStatus(value) { return value === 'Verificata' ? 'Verificata' : value === 'Implementata' ? 'Completata' : value === 'Approvata' || value === 'Proposta' ? 'In corso' : 'Da avviare' }
function mapItems(items, template, prefix) { return Array.isArray(items) ? items.map(item => ({ ...template, ...item, id: item.id || createId(prefix) })) : [] }
function createId(prefix) { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}` }
function valueOrEmpty(value) { return value === null || value === undefined ? '' : value }
function Section({ title, children }) { return <section className="bg-white rounded-xl border p-4"><h3 className="font-bold text-gray-800 mb-4">{title}</h3>{children}</section> }
function SectionHeader({ text, onAdd, addLabel }) { return <div className="flex justify-between items-center gap-3 mb-4"><p className="text-sm text-gray-500">{text}</p><button type="button" onClick={onAdd} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2"><Plus size={15} /> {addLabel}</button></div> }
function Empty({ text }) { return <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-gray-400">{text}</div> }
function Th({ children }) { return <th className="p-2 text-left">{children}</th> }
function InputField({ label, value, onChange, type = 'text' }) { return <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}</label><input type={type} value={value} onChange={event => onChange(event.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div> }
function TextAreaField({ label, value, onChange, placeholder = '', required = false }) { return <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label><textarea rows="4" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full border rounded-lg px-3 py-2 text-sm" /></div> }
function TableInput({ value, onChange, type = 'text' }) { return <td className="p-2"><input type={type} value={value} onChange={event => onChange(event.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></td> }
function TableSelect({ value, onChange, options }) { return <td className="p-2"><select value={value} onChange={event => onChange(event.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">{options.map(option => <option key={option} value={option}>{option}</option>)}</select></td> }
function LevelCell({ value, onChange }) { return <td className="p-2"><select value={value} onChange={event => onChange(event.target.value)} className="w-full border rounded px-2 py-1.5 text-sm"><option value="">—</option>{LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}</select></td> }
function DeleteCell({ onClick }) { return <td className="p-2"><button type="button" onClick={onClick} className="text-red-600 p-1"><Trash2 size={15} /></button></td> }
function SummaryCard({ label, value }) { return <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs uppercase text-gray-500">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div> }
