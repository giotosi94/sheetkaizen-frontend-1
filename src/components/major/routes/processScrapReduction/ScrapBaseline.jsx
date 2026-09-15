import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import api from '../../../../services/api'

const EMPTY_ROW = {
  id: '',
  categoria: '',
  quantita: '',
  frequenza: '',
  costo_unitario: '',
  note: '',
}

const UNITA_FALLBACK = ['%', 'kg', 'pezzi']
const KPI_FALLBACK = ['Scarto di processo', 'Scarto di prodotto', 'Rilavorazione', 'Perdita di materiale']

export default function ScrapBaseline({ stepData, onChange }) {
  const [kpiOptions, setKpiOptions] = useState(KPI_FALLBACK)
  const [unitaOptions, setUnitaOptions] = useState(UNITA_FALLBACK)
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/configurazioni/', { params: { tipo: 'kpi_major' } })
      .then(response => {
        const values = (response.data || []).map(item => item.label).filter(Boolean)
        if (values.length > 0) setKpiOptions(values)
      })
      .catch(() => setKpiOptions(KPI_FALLBACK))

    api.get('/configurazioni/', { params: { tipo: 'unita_misura' } })
      .then(response => {
        const values = (response.data || []).map(item => item.label).filter(Boolean)
        if (values.length > 0) setUnitaOptions(values)
      })
      .catch(() => setUnitaOptions(UNITA_FALLBACK))
  }, [])

  useEffect(() => {
    setForm(buildForm(stepData?.dati || {}))
  }, [stepData?.dati])

  const calculations = useMemo(() => {
    const rows = form.categorie_scarto.map(row => {
      const quantita = toNumber(row.quantita)
      const frequenza = toNumber(row.frequenza)
      const costoUnitario = toNumber(row.costo_unitario)
      const costoTotale = quantita * costoUnitario

      return {
        ...row,
        quantita_calcolata: quantita,
        frequenza_calcolata: frequenza,
        costo_totale: costoTotale,
      }
    })

    const quantitaTotale = rows.reduce((sum, row) => sum + row.quantita_calcolata, 0)
    const frequenzaTotale = rows.reduce((sum, row) => sum + row.frequenza_calcolata, 0)
    const costoTotale = rows.reduce((sum, row) => sum + row.costo_totale, 0)
    const sortedRows = [...rows].sort((a, b) => b.quantita_calcolata - a.quantita_calcolata)

    let cumulata = 0
    const pareto = sortedRows.map(row => {
      cumulata += row.quantita_calcolata
      return {
        ...row,
        percentuale: quantitaTotale > 0 ? (row.quantita_calcolata / quantitaTotale) * 100 : 0,
        cumulata: quantitaTotale > 0 ? (cumulata / quantitaTotale) * 100 : 0,
      }
    })

    return {
      quantitaTotale,
      frequenzaTotale,
      costoTotale,
      pareto,
    }
  }, [form.categorie_scarto])

  const updateField = (field, value) => {
    setSaved(false)
    setForm(current => ({ ...current, [field]: value }))
  }

  const addRow = () => {
    setSaved(false)
    setForm(current => ({
      ...current,
      categorie_scarto: [
        ...current.categorie_scarto,
        { ...EMPTY_ROW, id: createId() },
      ],
    }))
  }

  const updateRow = (id, field, value) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      categorie_scarto: current.categorie_scarto.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      ),
    }))
  }

  const removeRow = id => {
    setSaved(false)
    setForm(current => ({
      ...current,
      categorie_scarto: current.categorie_scarto.filter(row => row.id !== id),
      categoria_prioritaria:
        current.categorie_scarto.find(row => row.id === id)?.categoria === current.categoria_prioritaria
          ? ''
          : current.categoria_prioritaria,
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await onChange({
        dati: {
          ...form,
          quantita_totale: calculations.quantitaTotale,
          frequenza_totale: calculations.frequenzaTotale,
          costo_totale_calcolato: calculations.costoTotale,
          pareto: calculations.pareto,
        },
        output_compilati: {
          problema: Boolean(form.problema.trim()),
          perimetro: Boolean(form.perimetro.trim()),
          kpi_principale: Boolean(form.kpi_principale.trim()),
          unita_misura: Boolean(form.unita_misura.trim()),
          baseline: form.baseline !== '',
          target: form.target !== '',
          periodo: Boolean(form.periodo_da && form.periodo_a),
          fonte_dati: Boolean(form.fonte_dati.trim()),
          pareto: calculations.pareto.length > 0,
          categoria_prioritaria: Boolean(form.categoria_prioritaria),
        },
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const categorieDisponibili = form.categorie_scarto
    .map(row => row.categoria.trim())
    .filter(Boolean)

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Definizione del problema</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TextAreaField label="Problema" value={form.problema} onChange={value => updateField('problema', value)} placeholder="Descrivi il fenomeno osservato in modo misurabile" />
          <TextAreaField label="Perimetro" value={form.perimetro} onChange={value => updateField('perimetro', value)} placeholder="Definisci processo, prodotto, formato, linea e confini del progetto" />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">KPI, fonte dati e periodo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SelectField label="KPI principale" value={form.kpi_principale} onChange={value => updateField('kpi_principale', value)} options={kpiOptions} />
          <SelectField label="Unità di misura" value={form.unita_misura} onChange={value => updateField('unita_misura', value)} options={unitaOptions} />
          <InputField label="Baseline" type="number" value={form.baseline} onChange={value => updateField('baseline', value)} />
          <InputField label="Target" type="number" value={form.target} onChange={value => updateField('target', value)} />
          <InputField label="Fonte dati" value={form.fonte_dati} onChange={value => updateField('fonte_dati', value)} />
          <InputField label="Periodo da" type="date" value={form.periodo_da} onChange={value => updateField('periodo_da', value)} />
          <InputField label="Periodo a" type="date" value={form.periodo_a} onChange={value => updateField('periodo_a', value)} />
          <InputField label="Note sulla fonte" value={form.note_fonte} onChange={value => updateField('note_fonte', value)} />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Categorie di scarto</h3>
            <p className="text-xs text-gray-500 mt-1">Inserimento manuale. Import Excel e integrazione MES saranno aggiunti successivamente.</p>
          </div>
          <button type="button" onClick={addRow} className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
            <Plus size={15} /> Aggiungi categoria
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Categoria</th>
                <th className="p-2 text-left">Quantità</th>
                <th className="p-2 text-left">Frequenza</th>
                <th className="p-2 text-left">Costo unitario</th>
                <th className="p-2 text-left">Costo totale</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.categorie_scarto.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-400">Nessuna categoria inserita</td></tr>
              ) : (
                form.categorie_scarto.map(row => (
                  <tr key={row.id} className="border-t">
                    <TableInput value={row.categoria} onChange={value => updateRow(row.id, 'categoria', value)} />
                    <TableInput type="number" value={row.quantita} onChange={value => updateRow(row.id, 'quantita', value)} />
                    <TableInput type="number" value={row.frequenza} onChange={value => updateRow(row.id, 'frequenza', value)} />
                    <TableInput type="number" value={row.costo_unitario} onChange={value => updateRow(row.id, 'costo_unitario', value)} />
                    <td className="p-2 font-medium">{formatNumber(toNumber(row.quantita) * toNumber(row.costo_unitario))}</td>
                    <TableInput value={row.note} onChange={value => updateRow(row.id, 'note', value)} />
                    <td className="p-2"><button type="button" onClick={() => removeRow(row.id)} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={15} /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <SummaryCard label="Quantità totale" value={formatNumber(calculations.quantitaTotale)} />
          <SummaryCard label="Frequenza totale" value={formatNumber(calculations.frequenzaTotale)} />
          <SummaryCard label="Costo totale indicativo" value={formatNumber(calculations.costoTotale)} />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Pareto delle categorie</h3>
        {calculations.pareto.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">Inserisci quantità e categorie per costruire il Pareto</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-6 h-64 min-w-max px-4 pt-6 border-b border-gray-200">
              {calculations.pareto.map(row => {
                const maxValue = calculations.pareto[0]?.quantita_calcolata || 1
                const heightPercent = maxValue > 0 ? (row.quantita_calcolata / maxValue) * 100 : 0

                return (
                  <div key={row.id} className="flex flex-col items-center justify-end h-full w-24">
                    <div className="text-xs font-bold text-gray-700 mb-1">
                      {formatNumber(row.quantita_calcolata)}
                    </div>
                    <div className="text-[10px] text-gray-500 mb-1">
                      {row.percentuale.toFixed(1)}%
                    </div>
                    <div
                      className="w-14 bg-primary rounded-t transition-all"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      title={`Cumulata ${row.cumulata.toFixed(1)}%`}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-6 min-w-max px-4 pt-2">
              {calculations.pareto.map(row => (
                <div key={row.id} className="w-24 text-center">
                  <div className="text-xs font-medium text-gray-700 break-words">
                    {row.categoria || 'Senza nome'}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    cum. {row.cumulata.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 max-w-xl">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Categoria prioritaria</label>
          <select value={form.categoria_prioritaria} onChange={event => updateField('categoria_prioritaria', event.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleziona la priorità</option>
            {categorieDisponibili.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
          </select>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Step salvato</span>}
        <button type="button" onClick={save} disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Definire'}
        </button>
      </div>
    </div>
  )
}

function buildForm(data) {
  return {
    problema: data.problema || '',
    perimetro: data.perimetro || '',
    kpi_principale: data.kpi_principale || '',
    unita_misura: data.unita_misura || '',
    baseline: valueOrEmpty(data.baseline),
    target: valueOrEmpty(data.target),
    fonte_dati: data.fonte_dati || '',
    periodo_da: data.periodo_da || '',
    periodo_a: data.periodo_a || '',
    note_fonte: data.note_fonte || '',
    categorie_scarto: Array.isArray(data.categorie_scarto)
      ? data.categorie_scarto.map(row => ({ ...EMPTY_ROW, ...row, id: row.id || createId() }))
      : [],
    categoria_prioritaria: data.categoria_prioritaria || '',
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `scrap_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function valueOrEmpty(value) {
  return value === null || value === undefined ? '' : value
}

function formatNumber(value) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value || 0)
}

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        step={type === 'number' ? 'any' : undefined}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      >
        <option value="">Seleziona</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{label}</label>
      <textarea
        rows="4"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  )
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

function SummaryCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className="text-xl font-bold text-gray-800 mt-1">{value}</div>
    </div>
  )
}
