import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'

const EMPTY_EVENT = {
  id: '',
  data: '',
  turno: '',
  prodotto: '',
  formato: '',
  categoria_scarto: '',
  quantita_prodotta: '',
  quantita_scartata: '',
  anomalia: '',
  registrato_da: '',
  note: '',
}

export default function ScrapEventRegister({ stepData, onChange }) {
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(buildForm(stepData?.dati || {}))
  }, [stepData?.dati])

  const summary = useMemo(() => {
    const eventi = form.eventi.length
    const produzione = form.eventi.reduce((sum, item) => sum + toNumber(item.quantita_prodotta), 0)
    const scarto = form.eventi.reduce((sum, item) => sum + toNumber(item.quantita_scartata), 0)
    const anomalie = form.eventi.filter(item => item.anomalia.trim()).length
    const complete = form.eventi.filter(item =>
      item.data &&
      item.turno.trim() &&
      item.categoria_scarto.trim() &&
      item.quantita_scartata !== '' &&
      item.registrato_da.trim()
    ).length

    return {
      eventi,
      produzione,
      scarto,
      anomalie,
      scartoPercentuale: produzione > 0 ? (scarto / produzione) * 100 : 0,
      completezza: eventi > 0 ? (complete / eventi) * 100 : 0,
    }
  }, [form.eventi])

  const updateField = (field, value) => {
    setSaved(false)
    setForm(current => ({ ...current, [field]: value }))
  }

  const addEvent = () => {
    setSaved(false)
    setForm(current => ({
      ...current,
      eventi: [
        ...current.eventi,
        { ...EMPTY_EVENT, id: createId(), data: new Date().toISOString().slice(0, 10) },
      ],
    }))
  }

  const updateEvent = (id, field, value) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      eventi: current.eventi.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeEvent = id => {
    setSaved(false)
    setForm(current => ({
      ...current,
      eventi: current.eventi.filter(item => item.id !== id),
    }))
  }

  const save = async () => {
    if (!form.regola_registrazione.trim()) return alert('Definisci la regola di registrazione')
    if (!form.responsabilita.trim()) return alert('Definisci chi è responsabile della registrazione')
    if (!form.cosa_misurare.trim()) return alert('Definisci cosa deve essere misurato')
    if (!form.quando_registrare.trim()) return alert('Definisci quando registrare')
    if (!form.dove_registrare.trim()) return alert('Definisci dove registrare')
    if (!form.frequenza_revisione.trim()) return alert('Definisci la frequenza di revisione')
    if (form.eventi.length === 0) return alert('Inserisci almeno un evento produttivo')

    setSaving(true)
    try {
      await onChange({
        dati: {
          ...form,
          riepilogo: summary,
        },
        output_compilati: {
          regola_registrazione: Boolean(form.regola_registrazione.trim()),
          responsabilita: Boolean(form.responsabilita.trim()),
          registro_eventi: form.eventi.length > 0,
          dati_scarto: summary.scarto > 0,
          registro_anomalie: summary.anomalie > 0,
          frequenza_revisione: Boolean(form.frequenza_revisione.trim()),
          evidenza_avvio_raccolta: form.eventi.length > 0,
          livello_completezza_dati: summary.completezza > 0,
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
        <h3 className="font-bold text-gray-800 mb-4">Piano di raccolta dati</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TextAreaField label="Regola di registrazione" value={form.regola_registrazione} onChange={value => updateField('regola_registrazione', value)} placeholder="Definisci quando un evento deve essere registrato come anomalia o scarto" required />
          <TextAreaField label="Responsabilità" value={form.responsabilita} onChange={value => updateField('responsabilita', value)} placeholder="Indica chi registra, chi verifica e chi revisiona i dati" required />
          <TextAreaField label="Cosa misurare" value={form.cosa_misurare} onChange={value => updateField('cosa_misurare', value)} placeholder="Quantità prodotta, quantità scartata, categoria, evento, parametri" required />
          <TextAreaField label="Quando registrare" value={form.quando_registrare} onChange={value => updateField('quando_registrare', value)} placeholder="Per evento, lotto, turno, ordine o intervallo temporale" required />
          <TextAreaField label="Dove registrare" value={form.dove_registrare} onChange={value => updateField('dove_registrare', value)} placeholder="Indica modulo, sistema, foglio o postazione di registrazione" required />
          <TextAreaField label="Frequenza di revisione" value={form.frequenza_revisione} onChange={value => updateField('frequenza_revisione', value)} placeholder="Es. revisione giornaliera durante il Daily Meeting" required />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Registro eventi produttivi</h3>
            <p className="text-xs text-gray-500 mt-1">Registra evento, produzione, scarto e anomalia associata.</p>
          </div>
          <button type="button" onClick={addEvent} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi evento
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Turno</th>
                <th className="p-2 text-left">Prodotto</th>
                <th className="p-2 text-left">Formato</th>
                <th className="p-2 text-left">Categoria scarto</th>
                <th className="p-2 text-left">Quantità prodotta</th>
                <th className="p-2 text-left">Quantità scartata</th>
                <th className="p-2 text-left">Scarto %</th>
                <th className="p-2 text-left">Anomalia</th>
                <th className="p-2 text-left">Registrato da</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.eventi.length === 0 ? (
                <tr><td colSpan="12" className="p-8 text-center text-gray-400">Nessun evento registrato</td></tr>
              ) : (
                form.eventi.map(item => {
                  const produzione = toNumber(item.quantita_prodotta)
                  const scarto = toNumber(item.quantita_scartata)
                  const percentuale = produzione > 0 ? (scarto / produzione) * 100 : 0
                  return (
                    <tr key={item.id} className="border-t align-top">
                      <TableInput type="date" value={item.data} onChange={value => updateEvent(item.id, 'data', value)} />
                      <TableInput value={item.turno} onChange={value => updateEvent(item.id, 'turno', value)} />
                      <TableInput value={item.prodotto} onChange={value => updateEvent(item.id, 'prodotto', value)} />
                      <TableInput value={item.formato} onChange={value => updateEvent(item.id, 'formato', value)} />
                      <TableInput value={item.categoria_scarto} onChange={value => updateEvent(item.id, 'categoria_scarto', value)} />
                      <TableInput type="number" value={item.quantita_prodotta} onChange={value => updateEvent(item.id, 'quantita_prodotta', value)} />
                      <TableInput type="number" value={item.quantita_scartata} onChange={value => updateEvent(item.id, 'quantita_scartata', value)} />
                      <td className="p-2 font-medium">{percentuale.toFixed(2)}%</td>
                      <TableInput value={item.anomalia} onChange={value => updateEvent(item.id, 'anomalia', value)} />
                      <TableInput value={item.registrato_da} onChange={value => updateEvent(item.id, 'registrato_da', value)} />
                      <TableInput value={item.note} onChange={value => updateEvent(item.id, 'note', value)} />
                      <td className="p-2"><button type="button" onClick={() => removeEvent(item.id)} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={15} /></button></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <SummaryCard label="Eventi" value={summary.eventi} />
          <SummaryCard label="Produzione" value={formatNumber(summary.produzione)} />
          <SummaryCard label="Scarto" value={formatNumber(summary.scarto)} />
          <SummaryCard label="Scarto %" value={`${summary.scartoPercentuale.toFixed(2)}%`} />
          <SummaryCard label="Anomalie" value={summary.anomalie} alert={summary.anomalie > 0} />
          <SummaryCard label="Completezza" value={`${summary.completezza.toFixed(0)}%`} alert={summary.completezza < 80 && summary.eventi > 0} />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Avvio e qualità della raccolta</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TextAreaField label="Formazione degli operatori" value={form.formazione_operatori} onChange={value => updateField('formazione_operatori', value)} placeholder="Indica persone formate, contenuto, data e modalità" />
          <TextAreaField label="Verifica qualità dei dati" value={form.verifica_qualita_dati} onChange={value => updateField('verifica_qualita_dati', value)} placeholder="Descrivi come viene verificata ogni giorno la qualità della raccolta" />
          <TextAreaField label="Problemi di raccolta rilevati" value={form.problemi_raccolta} onChange={value => updateField('problemi_raccolta', value)} placeholder="Errori, campi mancanti, dati incoerenti o difficoltà operative" />
          <TextAreaField label="Azioni correttive sulla raccolta" value={form.azioni_correzione_raccolta} onChange={value => updateField('azioni_correzione_raccolta', value)} placeholder="Azioni per aumentare completezza e affidabilità dei dati" />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Step salvato</span>}
        <button type="button" onClick={save} disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Misurare'}
        </button>
      </div>
    </div>
  )
}

function buildForm(data) {
  return {
    regola_registrazione: data.regola_registrazione || '',
    responsabilita: data.responsabilita || '',
    cosa_misurare: data.cosa_misurare || '',
    quando_registrare: data.quando_registrare || '',
    dove_registrare: data.dove_registrare || '',
    frequenza_revisione: data.frequenza_revisione || '',
    eventi: Array.isArray(data.eventi)
      ? data.eventi.map(item => ({ ...EMPTY_EVENT, ...item, id: item.id || createId() }))
      : [],
    formazione_operatori: data.formazione_operatori || '',
    verifica_qualita_dati: data.verifica_qualita_dati || '',
    problemi_raccolta: data.problemi_raccolta || '',
    azioni_correzione_raccolta: data.azioni_correzione_raccolta || '',
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `event_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatNumber(value) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value || 0)
}

function TextAreaField({ label, value, onChange, placeholder, required = false }) {
  return <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label><textarea rows="4" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
}

function TableInput({ value, onChange, type = 'text' }) {
  return <td className="p-2"><input type={type} value={value} onChange={event => onChange(event.target.value)} step={type === 'number' ? 'any' : undefined} className="w-full border rounded px-2 py-1.5 text-sm" /></td>
}

function SummaryCard({ label, value, alert = false }) {
  return <div className={`rounded-lg p-3 ${alert ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-800'}`}><div className="text-xs uppercase opacity-70">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div>
}
