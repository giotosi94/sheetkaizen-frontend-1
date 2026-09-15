import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'

const TURNI = ['1', '2', '3']

const EMPTY_EVENT = {
  id: '',
  data: '',
  turno: '',
  prodotto: '',
  formato: '',
  categoria_scarto: '',
  quantita_scartata: '',
  anomalia: '',
  registrato_da: '',
  note: '',
}

export default function ScrapEventRegister({ stepData, onChange, major }) {
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(buildForm(stepData?.dati || {}))
  }, [stepData?.dati])

  const partecipanti = useMemo(() => {
    const persone = []
    if (major?.project_leader?.nome) persone.push(major.project_leader.nome)
    ;(major?.team_members || []).forEach(item => {
      if (item?.nome) persone.push(item.nome)
    })
    return [...new Set(persone)]
  }, [major?.project_leader, major?.team_members])

  const summary = useMemo(() => {
    const eventi = form.eventi.length
    const scarto = form.eventi.reduce((sum, item) => sum + toNumber(item.quantita_scartata), 0)
    const anomalie = form.eventi.filter(item => item.anomalia.trim()).length

    return {
      eventi,
      scarto,
      anomalie,
    }
  }, [form.eventi])

  const addEvent = () => {
    setSaved(false)
    setForm(current => ({
      ...current,
      eventi: [
        ...current.eventi,
        {
          ...EMPTY_EVENT,
          id: createId(),
          data: new Date().toISOString().slice(0, 10),
          turno: getTurnoCorrente(),
        },
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
    setSaving(true)
    try {
      await onChange({
        dati: {
          ...form,
          riepilogo: summary,
        },
        output_compilati: {
          registro_eventi: form.eventi.length > 0,
          dati_scarto: summary.scarto > 0,
          registro_anomalie: summary.anomalie > 0,
          evidenza_avvio_raccolta: form.eventi.length > 0,
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
            <h3 className="font-bold text-gray-800">Registro eventi produttivi</h3>
            <p className="text-xs text-gray-500 mt-1">Registra evento, scarto e anomalia associata.</p>
          </div>
          <button type="button" onClick={addEvent} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi evento
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Turno</th>
                <th className="p-2 text-left">Prodotto</th>
                <th className="p-2 text-left">Formato</th>
                <th className="p-2 text-left">Categoria scarto</th>
                <th className="p-2 text-left">Quantità scartata</th>
                <th className="p-2 text-left">Anomalia</th>
                <th className="p-2 text-left">Registrato da</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.eventi.length === 0 ? (
                <tr><td colSpan="10" className="p-8 text-center text-gray-400">Nessun evento registrato</td></tr>
              ) : (
                form.eventi.map(item => (
                  <tr key={item.id} className="border-t align-top">
                    <TableInput type="date" value={item.data} onChange={value => updateEvent(item.id, 'data', value)} />
                    <TableSelect value={item.turno} onChange={value => updateEvent(item.id, 'turno', value)} options={TURNI} />
                    <TableInput value={item.prodotto} onChange={value => updateEvent(item.id, 'prodotto', value)} />
                    <TableInput value={item.formato} onChange={value => updateEvent(item.id, 'formato', value)} />
                    <TableInput value={item.categoria_scarto} onChange={value => updateEvent(item.id, 'categoria_scarto', value)} />
                    <TableInput type="number" value={item.quantita_scartata} onChange={value => updateEvent(item.id, 'quantita_scartata', value)} />
                    <TableInput value={item.anomalia} onChange={value => updateEvent(item.id, 'anomalia', value)} />
                    <TableSelect value={item.registrato_da} onChange={value => updateEvent(item.id, 'registrato_da', value)} options={partecipanti} />
                    <TableInput value={item.note} onChange={value => updateEvent(item.id, 'note', value)} />
                    <td className="p-2">
                      <button type="button" onClick={() => removeEvent(item.id)} className="text-red-600 p-1 hover:bg-red-50 rounded">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <SummaryCard label="Eventi registrati" value={summary.eventi} />
          <SummaryCard label="Scarto totale" value={formatNumber(summary.scarto)} />
          <SummaryCard label="Anomalie rilevate" value={summary.anomalie} alert={summary.anomalie > 0} />
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
    eventi: Array.isArray(data.eventi)
      ? data.eventi.map(item => ({ ...EMPTY_EVENT, ...item, id: item.id || createId() }))
      : [],
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `event_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function getTurnoCorrente() {
  const ora = new Date().getHours()
  if (ora >= 6 && ora < 14) return '1'
  if (ora >= 14 && ora < 22) return '2'
  return '3'
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatNumber(value) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value || 0)
}

function TableInput({ value, onChange, type = 'text' }) {
  return (
    <td className="p-2">
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        step={type === 'number' ? 'any' : undefined}
        className="w-full border rounded px-2 py-1.5 text-sm"
      />
    </td>
  )
}

function TableSelect({ value, onChange, options }) {
  return (
    <td className="p-2">
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full min-w-[120px] border rounded px-2 py-1.5 text-sm"
      >
        <option value="">Seleziona</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </td>
  )
}

function SummaryCard({ label, value, alert = false }) {
  return (
    <div className={`rounded-lg p-3 ${alert ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-800'}`}>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  )
}
