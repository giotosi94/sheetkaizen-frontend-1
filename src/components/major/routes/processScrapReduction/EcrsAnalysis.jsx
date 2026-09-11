import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'

const EMPTY_ACTIVITY = {
  id: '',
  numero: '',
  descrizione: '',
  classificazione: 'NVA',
  tempo_attuale: '',
  distanza_attuale: '',
  perdita_osservata: '',
  why_what: false,
  where: false,
  when: false,
  who: false,
  how: false,
  idea: '',
  eliminare: false,
  combinare: false,
  riorganizzare: false,
  semplificare: false,
  descrizione_futura: '',
  tempo_obiettivo: '',
  distanza_obiettivo: '',
  responsabile: '',
  stato: 'Da valutare',
}

export default function EcrsAnalysis({ stepData, onChange }) {
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(buildForm(stepData?.dati || {}))
  }, [stepData?.dati])

  const summary = useMemo(() => {
    const tempoAttuale = form.attivita.reduce((sum, item) => sum + toNumber(item.tempo_attuale), 0)
    const tempoObiettivo = form.attivita.reduce((sum, item) => sum + toNumber(item.tempo_obiettivo), 0)
    const distanzaAttuale = form.attivita.reduce((sum, item) => sum + toNumber(item.distanza_attuale), 0)
    const distanzaObiettivo = form.attivita.reduce((sum, item) => sum + toNumber(item.distanza_obiettivo), 0)
    const nvaAttuali = form.attivita.filter(item => item.classificazione === 'NVA').length
    const attivitaConEcrs = form.attivita.filter(hasEcrsAction).length
    const eliminate = form.attivita.filter(item => item.eliminare).length

    return {
      tempoAttuale,
      tempoObiettivo,
      distanzaAttuale,
      distanzaObiettivo,
      riduzioneTempo: percentageReduction(tempoAttuale, tempoObiettivo),
      riduzioneDistanza: percentageReduction(distanzaAttuale, distanzaObiettivo),
      nvaAttuali,
      attivitaConEcrs,
      eliminate,
    }
  }, [form.attivita])

  const updateField = (field, value) => {
    setSaved(false)
    setForm(current => ({ ...current, [field]: value }))
  }

  const addActivity = () => {
    setSaved(false)
    setForm(current => ({
      ...current,
      attivita: [
        ...current.attivita,
        {
          ...EMPTY_ACTIVITY,
          id: createId(),
          numero: String(current.attivita.length + 1),
        },
      ],
    }))
  }

  const updateActivity = (id, field, value) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      attivita: current.attivita.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeActivity = id => {
    setSaved(false)
    setForm(current => ({
      ...current,
      attivita: current.attivita
        .filter(item => item.id !== id)
        .map((item, index) => ({ ...item, numero: String(index + 1) })),
    }))
  }

  const save = async () => {
    if (!form.oggetto_analisi.trim()) return alert('Definisci il ciclo o processo analizzato')
    if (form.attivita.length === 0) return alert('Inserisci almeno una attività')
    if (!form.attivita.every(item => item.descrizione.trim())) return alert('Completa la descrizione di tutte le attività')
    if (!form.attivita.some(hasQuestion)) return alert('Applica almeno una domanda 5W+1H')
    if (!form.attivita.some(hasEcrsAction)) return alert('Seleziona almeno una azione ECRS')
    if (!form.attivita.some(item => item.descrizione_futura.trim())) return alert('Descrivi almeno una attività del metodo futuro')

    setSaving(true)
    try {
      await onChange({
        dati: {
          ...form,
          riepilogo: summary,
        },
        output_compilati: {
          tabella_attivita: form.attivita.length > 0,
          classificazione_ecrs: form.attivita.some(hasEcrsAction),
          opportunita_miglioramento: form.attivita.some(item => item.idea.trim()),
          metodo_futuro: form.attivita.some(item => item.descrizione_futura.trim()),
          confronto_prima_dopo: summary.tempoAttuale > 0 && summary.tempoObiettivo >= 0,
          standard_aggiornato: Boolean(form.standard_aggiornato.trim()),
          target_aggiornato: Boolean(form.target_aggiornato.trim()),
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
        <h3 className="font-bold text-gray-800 mb-4">Perimetro dell'analisi ECRS</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TextAreaField label="Ciclo o processo analizzato" value={form.oggetto_analisi} onChange={value => updateField('oggetto_analisi', value)} placeholder="Es. ciclo di pulizia, cambio formato, operazione di confezionamento" required />
          <TextAreaField label="Problema o perdita da ridurre" value={form.perdita_target} onChange={value => updateField('perdita_target', value)} placeholder="Scarto, attesa, movimento, trasporto, microfermata o altra perdita" />
          <TextAreaField label="Condizione e metodo attuale" value={form.metodo_attuale} onChange={value => updateField('metodo_attuale', value)} placeholder="Descrivi sinteticamente il metodo osservato prima dell'analisi" />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Tabella ECRS</h3>
            <p className="text-xs text-gray-500 mt-1">Dettaglia le attività, applica 5W+1H, scegli le azioni ECRS e costruisci il metodo futuro.</p>
          </div>
          <button type="button" onClick={addActivity} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi attività
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs">
          <InfoCard title="1. Situazione attuale" text="Scomponi il ciclo in attività elementari e misura tempo, distanza e perdita osservata." />
          <InfoCard title="2. Domande 5W+1H" text="Spunta le domande la cui risposta non è soddisfacente per mettere in discussione ogni dettaglio." />
          <InfoCard title="3. Metodo futuro" text="Applica Eliminare, Combinare/Cambiare, Riorganizzare/Ridurre o Semplificare e definisci il risultato atteso." />
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full min-w-[2400px] text-xs">
            <thead>
              <tr>
                <th colSpan="7" className="p-2 bg-orange-100 text-orange-900 border-r">Situazione attuale</th>
                <th colSpan="5" className="p-2 bg-purple-100 text-purple-900 border-r">5W + 1H</th>
                <th className="p-2 bg-purple-100 text-purple-900 border-r">Idea</th>
                <th colSpan="4" className="p-2 bg-gray-200 text-gray-800 border-r">Azioni ECRS</th>
                <th colSpan="6" className="p-2 bg-green-100 text-green-900">Metodo futuro</th>
              </tr>
              <tr className="text-gray-700">
                <HeaderCell>N.</HeaderCell>
                <HeaderCell>Attività</HeaderCell>
                <HeaderCell>VA / PVA / NVA</HeaderCell>
                <HeaderCell>Tempo</HeaderCell>
                <HeaderCell>Distanza</HeaderCell>
                <HeaderCell>Perdita osservata</HeaderCell>
                <HeaderCell>Note</HeaderCell>
                <HeaderCell>Why / What</HeaderCell>
                <HeaderCell>Where</HeaderCell>
                <HeaderCell>When</HeaderCell>
                <HeaderCell>Who</HeaderCell>
                <HeaderCell>How</HeaderCell>
                <HeaderCell>Idea di miglioramento</HeaderCell>
                <HeaderCell>Eliminare</HeaderCell>
                <HeaderCell>Combinare / Cambiare</HeaderCell>
                <HeaderCell>Riorganizzare / Ridurre</HeaderCell>
                <HeaderCell>Semplificare</HeaderCell>
                <HeaderCell>Attività futura</HeaderCell>
                <HeaderCell>Tempo obiettivo</HeaderCell>
                <HeaderCell>Distanza obiettivo</HeaderCell>
                <HeaderCell>Responsabile</HeaderCell>
                <HeaderCell>Stato</HeaderCell>
                <HeaderCell />
              </tr>
            </thead>
            <tbody>
              {form.attivita.length === 0 ? (
                <tr><td colSpan="23" className="p-10 text-center text-gray-400">Nessuna attività inserita</td></tr>
              ) : form.attivita.map(item => (
                <tr key={item.id} className="border-t align-top">
                  <td className="p-2 text-center font-bold bg-orange-50">{item.numero}</td>
                  <TableInput value={item.descrizione} onChange={value => updateActivity(item.id, 'descrizione', value)} className="bg-orange-50" />
                  <TableSelect value={item.classificazione} onChange={value => updateActivity(item.id, 'classificazione', value)} options={['VA', 'PVA', 'NVA']} className="bg-orange-50" />
                  <TableInput type="number" value={item.tempo_attuale} onChange={value => updateActivity(item.id, 'tempo_attuale', value)} className="bg-orange-50" />
                  <TableInput type="number" value={item.distanza_attuale} onChange={value => updateActivity(item.id, 'distanza_attuale', value)} className="bg-orange-50" />
                  <TableInput value={item.perdita_osservata} onChange={value => updateActivity(item.id, 'perdita_osservata', value)} className="bg-orange-50" />
                  <TableInput value={item.note} onChange={value => updateActivity(item.id, 'note', value)} className="bg-orange-50" />
                  <CheckCell checked={item.why_what} onChange={value => updateActivity(item.id, 'why_what', value)} className="bg-purple-50" />
                  <CheckCell checked={item.where} onChange={value => updateActivity(item.id, 'where', value)} className="bg-purple-50" />
                  <CheckCell checked={item.when} onChange={value => updateActivity(item.id, 'when', value)} className="bg-purple-50" />
                  <CheckCell checked={item.who} onChange={value => updateActivity(item.id, 'who', value)} className="bg-purple-50" />
                  <CheckCell checked={item.how} onChange={value => updateActivity(item.id, 'how', value)} className="bg-purple-50" />
                  <TableInput value={item.idea} onChange={value => updateActivity(item.id, 'idea', value)} className="bg-purple-50" />
                  <CheckCell checked={item.eliminare} onChange={value => updateActivity(item.id, 'eliminare', value)} className="bg-gray-50" />
                  <CheckCell checked={item.combinare} onChange={value => updateActivity(item.id, 'combinare', value)} className="bg-gray-50" />
                  <CheckCell checked={item.riorganizzare} onChange={value => updateActivity(item.id, 'riorganizzare', value)} className="bg-gray-50" />
                  <CheckCell checked={item.semplificare} onChange={value => updateActivity(item.id, 'semplificare', value)} className="bg-gray-50" />
                  <TableInput value={item.descrizione_futura} onChange={value => updateActivity(item.id, 'descrizione_futura', value)} className="bg-green-50" />
                  <TableInput type="number" value={item.tempo_obiettivo} onChange={value => updateActivity(item.id, 'tempo_obiettivo', value)} className="bg-green-50" />
                  <TableInput type="number" value={item.distanza_obiettivo} onChange={value => updateActivity(item.id, 'distanza_obiettivo', value)} className="bg-green-50" />
                  <TableInput value={item.responsabile} onChange={value => updateActivity(item.id, 'responsabile', value)} className="bg-green-50" />
                  <TableSelect value={item.stato} onChange={value => updateActivity(item.id, 'stato', value)} options={['Da valutare', 'Proposta', 'Approvata', 'Implementata', 'Verificata']} className="bg-green-50" />
                  <td className="p-2 bg-green-50"><button type="button" onClick={() => removeActivity(item.id)} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Confronto metodo attuale e futuro</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <SummaryCard label="Tempo attuale" value={formatNumber(summary.tempoAttuale)} />
          <SummaryCard label="Tempo obiettivo" value={formatNumber(summary.tempoObiettivo)} />
          <SummaryCard label="Riduzione tempo" value={`${summary.riduzioneTempo.toFixed(1)}%`} positive={summary.riduzioneTempo > 0} />
          <SummaryCard label="Distanza attuale" value={formatNumber(summary.distanzaAttuale)} />
          <SummaryCard label="Distanza obiettivo" value={formatNumber(summary.distanzaObiettivo)} />
          <SummaryCard label="Riduzione distanza" value={`${summary.riduzioneDistanza.toFixed(1)}%`} positive={summary.riduzioneDistanza > 0} />
          <SummaryCard label="Attività NVA" value={summary.nvaAttuali} />
          <SummaryCard label="Attività con ECRS" value={summary.attivitaConEcrs} />
          <SummaryCard label="Attività eliminate" value={summary.eliminate} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <TextAreaField label="Metodo futuro complessivo" value={form.metodo_futuro} onChange={value => updateField('metodo_futuro', value)} placeholder="Descrivi flusso, sequenza e responsabilità del nuovo metodo" />
          <TextAreaField label="Risultati della prova" value={form.risultati_prova} onChange={value => updateField('risultati_prova', value)} placeholder="Riporta esito della prova, condizioni, misure e osservazioni" />
          <TextAreaField label="Standard aggiornato" value={form.standard_aggiornato} onChange={value => updateField('standard_aggiornato', value)} placeholder="Indica standard, SOP o istruzioni aggiornate" />
          <TextAreaField label="Target aggiornato" value={form.target_aggiornato} onChange={value => updateField('target_aggiornato', value)} placeholder="Indica il nuovo target confermato dopo la prova" />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Step salvato</span>}
        <button type="button" onClick={save} disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Ottimizzare'}
        </button>
      </div>
    </div>
  )
}

function buildForm(data) {
  return {
    oggetto_analisi: data.oggetto_analisi || '',
    perdita_target: data.perdita_target || '',
    metodo_attuale: data.metodo_attuale || '',
    attivita: Array.isArray(data.attivita)
      ? data.attivita.map((item, index) => ({ ...EMPTY_ACTIVITY, ...item, id: item.id || createId(), numero: item.numero || String(index + 1) }))
      : [],
    metodo_futuro: data.metodo_futuro || '',
    risultati_prova: data.risultati_prova || '',
    standard_aggiornato: data.standard_aggiornato || '',
    target_aggiornato: data.target_aggiornato || '',
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `ecrs_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function percentageReduction(current, future) {
  if (current <= 0) return 0
  return ((current - future) / current) * 100
}

function hasQuestion(item) {
  return item.why_what || item.where || item.when || item.who || item.how
}

function hasEcrsAction(item) {
  return item.eliminare || item.combinare || item.riorganizzare || item.semplificare
}

function formatNumber(value) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value || 0)
}

function InfoCard({ title, text }) {
  return <div className="rounded-lg border p-3 bg-gray-50"><div className="font-bold text-gray-800">{title}</div><div className="text-gray-600 mt-1">{text}</div></div>
}

function HeaderCell({ children }) {
  return <th className="p-2 bg-gray-50 border-r text-center whitespace-normal min-w-[90px]">{children}</th>
}

function TableInput({ value, onChange, type = 'text', className = '' }) {
  return <td className={`p-2 border-r ${className}`}><input type={type} value={value} onChange={event => onChange(event.target.value)} step={type === 'number' ? 'any' : undefined} className="w-full min-w-[110px] border rounded px-2 py-1.5 text-xs bg-white" /></td>
}

function TableSelect({ value, onChange, options, className = '' }) {
  return <td className={`p-2 border-r ${className}`}><select value={value} onChange={event => onChange(event.target.value)} className="w-full min-w-[110px] border rounded px-2 py-1.5 text-xs bg-white">{options.map(option => <option key={option} value={option}>{option}</option>)}</select></td>
}

function CheckCell({ checked, onChange, className = '' }) {
  return <td className={`p-2 border-r text-center ${className}`}><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="w-4 h-4" /></td>
}

function TextAreaField({ label, value, onChange, placeholder, required = false }) {
  return <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label><textarea rows="4" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
}

function SummaryCard({ label, value, positive = false }) {
  return <div className={`rounded-lg p-3 ${positive ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-800'}`}><div className="text-xs uppercase opacity-70">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div>
}
