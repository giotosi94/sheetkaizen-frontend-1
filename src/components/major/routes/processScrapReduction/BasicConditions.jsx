import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import api from '../../../../services/api'
import ImageUpload from '../../../ImageUpload'
import DocumentUpload from '../../../DocumentUpload'
import ActionPlanFormShared from '../../../ActionPlanFormShared'
import ActionPlanDetailPanel from '../../../ActionPlanDetailPanel'

const EMPTY_ANOMALY = {
  id: '',
  descrizione: '',
  area_componente: '',
  priorita: 'Media',
  action_plan_id: '',
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

export default function BasicConditions({ stepData, onChange, major }) {
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [dirty, setDirty] = useState(false)
  const [actionPlans, setActionPlans] = useState([])
  const [showActionPlanForm, setShowActionPlanForm] = useState(false)
  const [selectedAnomalyId, setSelectedAnomalyId] = useState(null)
  const [selectedActionPlan, setSelectedActionPlan] = useState(null)

  useEffect(() => {
    setForm(buildForm(stepData?.dati || {}))
  }, [stepData?.dati])

  useEffect(() => {
    loadActionPlans()
  }, [major?._id])

  const loadActionPlans = async () => {
    if (!major?._id) return
    try {
      const response = await api.get('/action-plans/')
      setActionPlans((response.data || []).filter(item =>
        item.parent_type === 'major_kaizen' && item.parent_id === major._id
      ))
    } catch (error) {
      console.error('Errore caricamento Action Plan:', error)
      setActionPlans([])
    }
  }

  const createActionPlan = anomalyId => {
    setSelectedAnomalyId(anomalyId)
    setShowActionPlanForm(true)
  }

  const handleActionPlanSaved = async plan => {
    setDirty(true)
    setForm(current => ({
      ...current,
      anomalie: current.anomalie.map(item =>
        item.id === selectedAnomalyId
          ? { ...item, action_plan_id: plan._id }
          : item
      ),
    }))
    setShowActionPlanForm(false)
    setSelectedAnomalyId(null)
    await loadActionPlans()
  }

    const summary = useMemo(() => {
    const totale = form.anomalie.length
    const conAzione = form.anomalie.filter(item => item.action_plan_id).length
    const criticheAperte = form.anomalie.filter(
      item => item.priorita === 'Critica' && !item.action_plan_id
    ).length
    const parametriNonConformi = form.parametri_critici.filter(
      item => item.conforme === 'No'
    ).length

    return {
      totale,
      conAzione,
      criticheAperte,
      parametriNonConformi,
    }
  }, [form.anomalie, form.parametri_critici])

  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => {
      onChange({
        dati: { ...form, riepilogo: summary },
        output_compilati: {
          elenco_anomalie: form.anomalie.length > 0,
          registro_tag: form.anomalie.some(item => item.area_componente.trim()),
          fotografie_prima_dopo: form.immagini_prima.length > 0 && form.immagini_dopo.length > 0,
          action_plan_ripristino: form.anomalie.some(item => item.action_plan_id),
          parametri_critici: form.parametri_critici.length > 0,
          standard_corrente: Boolean(form.standard_corrente.trim()),
          evidenza_formazione: !form.formazione_necessaria || form.evidenze_formazione.length > 0,
        },
      })
      setDirty(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [dirty, form, summary, onChange])

  const updateField = (field, value) => {
    setDirty(true)
    setForm(current => ({ ...current, [field]: value }))
  }

  const addAnomaly = () => {
    setDirty(true)
    setForm(current => ({
      ...current,
      anomalie: [
        ...current.anomalie,
        { ...EMPTY_ANOMALY, id: createId('anomaly') },
      ],
    }))
  }

  const updateAnomaly = (id, field, value) => {
    setDirty(true)
    setForm(current => ({
      ...current,
      anomalie: current.anomalie.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeAnomaly = id => {
    setDirty(true)
    setForm(current => ({
      ...current,
      anomalie: current.anomalie.filter(item => item.id !== id),
    }))
  }

  const addParameter = () => {
    setDirty(true)
    setForm(current => ({
      ...current,
      parametri_critici: [
        ...current.parametri_critici,
        { ...EMPTY_PARAMETER, id: createId('parameter') },
      ],
    }))
  }

  const updateParameter = (id, field, value) => {
    setDirty(true)
    setForm(current => ({
      ...current,
      parametri_critici: current.parametri_critici.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeParameter = id => {
    setDirty(true)
    setForm(current => ({
      ...current,
      parametri_critici: current.parametri_critici.filter(item => item.id !== id),
    }))
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
                <th className="p-2 text-left">Action Plan</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.anomalie.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-400">Nessuna anomalia registrata</td></tr>
              ) : (
                form.anomalie.map(item => (
                  <tr key={item.id} className="border-t align-top">
                    <TableInput value={item.descrizione} onChange={value => updateAnomaly(item.id, 'descrizione', value)} placeholder="Descrizione" />
                    <TableInput value={item.area_componente} onChange={value => updateAnomaly(item.id, 'area_componente', value)} placeholder="Tag o componente" />
                    <TableSelect value={item.priorita} onChange={value => updateAnomaly(item.id, 'priorita', value)} options={['Bassa', 'Media', 'Alta', 'Critica']} />
                    <td className="p-2 min-w-[280px]">
                      <ActionPlanCell
                        plan={actionPlans.find(plan => plan._id === item.action_plan_id)}
                        onCreate={() => createActionPlan(item.id)}
                        onOpen={setSelectedActionPlan}
                        onUnlink={() => updateAnomaly(item.id, 'action_plan_id', '')}
                      />
                    </td>
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
          <SummaryCard label="Con Action Plan" value={summary.conAzione} />
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

      <div className="flex items-center justify-end">
        <span className="text-xs text-gray-500">
          {dirty ? 'Salvataggio in corso...' : 'Tutte le modifiche sono salvate'}
        </span>
      </div>

      {showActionPlanForm && (
        <ActionPlanFormShared
          plan={null}
          prefilledParent={{
            parent_type: 'major_kaizen',
            parent_id: major?._id,
            parent_label: `${major?.numero || ''} - ${major?.titolo || ''}`,
            pillar_id: major?.pillar_id || null,
          }}
          prefilledKaizen={null}
          onClose={() => {
            setShowActionPlanForm(false)
            setSelectedAnomalyId(null)
          }}
          onSaved={handleActionPlanSaved}
        />
      )}

      {selectedActionPlan && (
        <ActionPlanDetailPanel
          plan={selectedActionPlan}
          onClose={() => setSelectedActionPlan(null)}
          onUpdated={loadActionPlans}
        />
      )}
    </div>
  )
}

function buildForm(data) {
  return {
    migliore_pratica_attuale: data.migliore_pratica_attuale || '',
    standard_corrente: data.standard_corrente || '',
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

function ActionPlanCell({ plan, onCreate, onOpen, onUnlink }) {
  if (!plan) {
    return (
      <button type="button" onClick={onCreate} className="px-3 py-2 bg-primary text-white rounded-lg text-xs">
        Crea Action Plan
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-gray-50 p-2">
      <button type="button" onClick={() => onOpen(plan)} className="flex-1 text-left min-w-0">
        <div className="font-mono text-xs font-bold text-primary">{plan.numero}</div>
        <div className="text-xs font-medium text-gray-800 truncate">{plan.titolo}</div>
        <div className="text-xs text-gray-500">{plan.responsabile || 'Senza responsabile'} - {plan.stato_visuale || plan.stato || 'Aperto'}</div>
      </button>
      <button type="button" onClick={() => onOpen(plan)} className="p-1.5 text-primary" title="Apri Action Plan"><ExternalLink size={15} /></button>
      <button type="button" onClick={onUnlink} className="p-1.5 text-red-600" title="Scollega"><Trash2 size={15} /></button>
    </div>
  )
}

function SummaryCard({ label, value, alert = false }) {
  return <div className={`rounded-lg p-3 ${alert ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-800'}`}><div className="text-xs uppercase opacity-70">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div>
}
