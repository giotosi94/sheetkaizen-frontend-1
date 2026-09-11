import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Plus, Save, Trash2 } from 'lucide-react'
import api from '../../../../services/api'
import ActionPlanFormShared from '../../../ActionPlanFormShared'
import ActionPlanDetailPanel from '../../../ActionPlanDetailPanel'
import IshikawaDiagram from '../../../kaizen/IshikawaDiagram'
import FiveWhysFlowChart from '../../../kaizen/FiveWhysFlowChart'
import RiskPrioritizationChart from '../../../kaizen/RiskPrioritizationChart'

const EMPTY_ANOMALY = {
  id: '',
  anomalia: '',
  categoria: '',
  frequenza: '',
  impatto: '',
  prioritaria: false,
}


const EMPTY_COUNTERMEASURE = {
  id: '',
  causa_radice: '',
  contromisura: '',
  action_plan_id: '',
  kaizen_collegato: '',
  risultato: '',
}

const EMPTY_VERIFICATION = {
  id: '',
  causa_radice: '',
  metodo_verifica: '',
  risultato_test: '',
  validata: false,
  ricorrenze_prima: '',
  ricorrenze_dopo: '',
}

export default function AnomalyAnalysis({ stepData, onChange, major }) {
  const [form, setForm] = useState(() => buildForm(stepData?.dati || {}))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [actionPlans, setActionPlans] = useState([])
  const [showActionPlanForm, setShowActionPlanForm] = useState(false)
  const [selectedCountermeasureId, setSelectedCountermeasureId] = useState(null)
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
      console.error('Errore caricamento Action Plan del Major:', error)
      setActionPlans([])
    }
  }

  const createActionPlan = item => {
    setSelectedCountermeasureId(item.id)
    setShowActionPlanForm(true)
  }

  const handleActionPlanSaved = async plan => {
    setForm(current => ({
      ...current,
      contromisure: current.contromisure.map(item =>
        item.id === selectedCountermeasureId
          ? { ...item, action_plan_id: plan._id }
          : item
      ),
    }))
    setShowActionPlanForm(false)
    setSelectedCountermeasureId(null)
    await loadActionPlans()
  }

  const unlinkActionPlan = countermeasureId => {
    updateCountermeasure(countermeasureId, 'action_plan_id', '')
  }

  const pareto = useMemo(() => {
    const totale = form.anomalie.reduce(
      (sum, item) => sum + toNumber(item.frequenza),
      0
    )
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

  const summary = useMemo(() => {
    const causeValidate = form.verifiche_cause.filter(item => item.validata).length
    const ricorrenzePrima = form.verifiche_cause.reduce(
      (sum, item) => sum + toNumber(item.ricorrenze_prima),
      0
    )
    const ricorrenzeDopo = form.verifiche_cause.reduce(
      (sum, item) => sum + toNumber(item.ricorrenze_dopo),
      0
    )
    const riduzioneRicorrenze = ricorrenzePrima > 0
      ? ((ricorrenzePrima - ricorrenzeDopo) / ricorrenzePrima) * 100
      : 0

    return {
      causeValidate,
      ricorrenzePrima,
      ricorrenzeDopo,
      riduzioneRicorrenze,
    }
  }, [form.verifiche_cause])

  const updateField = (field, value) => {
    setSaved(false)
    setForm(current => ({ ...current, [field]: value }))
  }

  const updateIshikawa = data => {
    setSaved(false)
    setForm(current => ({
      ...current,
      ishikawa: {
        effetto: data.effetto,
        rami: data.rami,
      },
    }))
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

  const addCountermeasure = () => {
    setSaved(false)
    setForm(current => ({
      ...current,
      contromisure: [
        ...current.contromisure,
        { ...EMPTY_COUNTERMEASURE, id: createId('countermeasure') },
      ],
    }))
  }

  const updateCountermeasure = (id, field, value) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      contromisure: current.contromisure.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeCountermeasure = id => {
    setSaved(false)
    setForm(current => ({
      ...current,
      contromisure: current.contromisure.filter(item => item.id !== id),
    }))
  }

  const addVerification = () => {
    setSaved(false)
    setForm(current => ({
      ...current,
      verifiche_cause: [
        ...current.verifiche_cause,
        { ...EMPTY_VERIFICATION, id: createId('verification') },
      ],
    }))
  }

  const updateVerification = (id, field, value) => {
    setSaved(false)
    setForm(current => ({
      ...current,
      verifiche_cause: current.verifiche_cause.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeVerification = id => {
    setSaved(false)
    setForm(current => ({
      ...current,
      verifiche_cause: current.verifiche_cause.filter(item => item.id !== id),
    }))
  }

  const save = async () => {
    if (form.anomalie.length === 0) {
      return alert('Inserisci almeno una anomalia')
    }
    if (!form.anomalie.some(item => item.prioritaria)) {
      return alert('Seleziona almeno una anomalia prioritaria')
    }
    if (!form.ishikawa.effetto.trim()) {
      return alert('Definisci il problema nel diagramma Ishikawa')
    }
    if (form.contromisure.length === 0) {
      return alert('Inserisci almeno una contromisura')
    }
    if (form.verifiche_cause.length === 0) {
      return alert('Inserisci almeno una verifica della causa radice')
    }

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
          ishikawa: Boolean(form.ishikawa.effetto.trim()),
          cinque_perche: hasRootCauses(form.ishikawa.rami),
          prioritizzazione_rischio: hasRiskEvaluation(form.ishikawa.rami),
          cause_radice_validate: summary.causeValidate > 0,
          contromisure: form.contromisure.length > 0,
          follow_up_contromisure: form.contromisure.some(item => item.action_plan_id),
          risultati_test: form.verifiche_cause.some(item => item.risultato_test.trim()),
          tabella_ricorrenze: form.verifiche_cause.some(item => item.ricorrenze_prima !== ''),
          verifica_non_ricorrenza:
            summary.ricorrenzePrima > 0 &&
            summary.ricorrenzeDopo < summary.ricorrenzePrima,
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
            <p className="text-xs text-gray-500 mt-1">
              Seleziona le anomalie prioritarie da analizzare.
            </p>
          </div>
          <button
            type="button"
            onClick={addAnomaly}
            className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={15} /> Aggiungi anomalia
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Anomalia</th>
                <th className="p-2 text-left">Categoria</th>
                <th className="p-2 text-left">Frequenza</th>
                <th className="p-2 text-left">Impatto</th>
                <th className="p-2 text-center">Prioritaria</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.anomalie.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">
                    Nessuna anomalia inserita
                  </td>
                </tr>
              ) : (
                form.anomalie.map(item => (
                  <tr key={item.id} className="border-t">
                    <TableInput value={item.anomalia} onChange={value => updateAnomaly(item.id, 'anomalia', value)} />
                    <TableInput value={item.categoria} onChange={value => updateAnomaly(item.id, 'categoria', value)} />
                    <TableInput type="number" value={item.frequenza} onChange={value => updateAnomaly(item.id, 'frequenza', value)} />
                    <TableInput value={item.impatto} onChange={value => updateAnomaly(item.id, 'impatto', value)} />
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.prioritaria}
                        onChange={event => updateAnomaly(item.id, 'prioritaria', event.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>
                    <DeleteCell onClick={() => removeAnomaly(item.id)} />
                  </tr>
                ))
              )}
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
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(item.percentuale, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Ishikawa</h3>
        <IshikawaDiagram
          effetto={form.ishikawa.effetto}
          rami={form.ishikawa.rami}
          onChange={updateIshikawa}
        />
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">5 Perché</h3>
        <FiveWhysFlowChart
          effetto={form.ishikawa.effetto}
          rami={form.ishikawa.rami}
        />
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-gray-800 mb-4">Prioritizzazione rischio</h3>
        <RiskPrioritizationChart
          effetto={form.ishikawa.effetto}
          rami={form.ishikawa.rami}
        />
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Contromisure e follow-up</h3>
            <p className="text-xs text-gray-500 mt-1">
              Trasforma le cause validate in azioni tracciabili e associa gli eventuali Action Plan o Kaizen figli.
            </p>
          </div>
          <button
            type="button"
            onClick={addCountermeasure}
            className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={15} /> Aggiungi contromisura
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Causa radice</th>
                <th className="p-2 text-left">Contromisura</th>
                <th className="p-2 text-left">Action Plan</th>
                <th className="p-2 text-left">Quick / Standard collegato</th>
                <th className="p-2 text-left">Risultato</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.contromisure.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">
                    Nessuna contromisura inserita
                  </td>
                </tr>
              ) : (
                form.contromisure.map(item => (
                  <tr key={item.id} className="border-t">
                    <TableInput value={item.causa_radice} onChange={value => updateCountermeasure(item.id, 'causa_radice', value)} />
                    <TableInput value={item.contromisura} onChange={value => updateCountermeasure(item.id, 'contromisura', value)} />
                    <td className="p-2 min-w-[280px]">
                      <ActionPlanCell
                        plan={actionPlans.find(plan => plan._id === item.action_plan_id)}
                        onCreate={() => createActionPlan(item)}
                        onOpen={setSelectedActionPlan}
                        onUnlink={() => unlinkActionPlan(item.id)}
                      />
                    </td>
                    <TableInput value={item.kaizen_collegato} onChange={value => updateCountermeasure(item.id, 'kaizen_collegato', value)} />
                    <TableInput value={item.risultato} onChange={value => updateCountermeasure(item.id, 'risultato', value)} />
                    <DeleteCell onClick={() => removeCountermeasure(item.id)} />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Validazione cause e non ricorrenza</h3>
            <p className="text-xs text-gray-500 mt-1">
              Verifica le cause radice individuate con gli strumenti condivisi.
            </p>
          </div>
          <button
            type="button"
            onClick={addVerification}
            className="px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={15} /> Aggiungi verifica
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 text-left">Causa radice</th>
                <th className="p-2 text-left">Metodo di verifica</th>
                <th className="p-2 text-left">Risultato test</th>
                <th className="p-2 text-center">Validata</th>
                <th className="p-2 text-left">Ricorrenze prima</th>
                <th className="p-2 text-left">Ricorrenze dopo</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.verifiche_cause.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-400">
                    Nessuna verifica inserita
                  </td>
                </tr>
              ) : (
                form.verifiche_cause.map(item => (
                  <tr key={item.id} className="border-t">
                    <TableInput value={item.causa_radice} onChange={value => updateVerification(item.id, 'causa_radice', value)} />
                    <TableInput value={item.metodo_verifica} onChange={value => updateVerification(item.id, 'metodo_verifica', value)} />
                    <TableInput value={item.risultato_test} onChange={value => updateVerification(item.id, 'risultato_test', value)} />
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.validata}
                        onChange={event => updateVerification(item.id, 'validata', event.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>
                    <TableInput type="number" value={item.ricorrenze_prima} onChange={value => updateVerification(item.id, 'ricorrenze_prima', value)} />
                    <TableInput type="number" value={item.ricorrenze_dopo} onChange={value => updateVerification(item.id, 'ricorrenze_dopo', value)} />
                    <DeleteCell onClick={() => removeVerification(item.id)} />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <SummaryCard label="Cause validate" value={summary.causeValidate} />
          <SummaryCard label="Ricorrenze prima" value={summary.ricorrenzePrima} />
          <SummaryCard label="Ricorrenze dopo" value={summary.ricorrenzeDopo} alert={summary.ricorrenzeDopo > 0} />
          <SummaryCard label="Riduzione ricorrenze" value={`${summary.riduzioneRicorrenze.toFixed(1)}%`} />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <TextAreaField
          label="Standard aggiornato"
          value={form.standard_aggiornato}
          onChange={value => updateField('standard_aggiornato', value)}
          placeholder="Descrivi le modifiche introdotte nello standard dopo la stabilizzazione"
        />
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Step salvato</span>}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Stabilizzare'}
        </button>
      </div>

      {showActionPlanForm && (
        <ActionPlanFormShared
          plan={null}
          prefilledParent={{
            parent_type: 'major_kaizen',
            parent_id: major?._id,
            parent_label: `${major?.numero || ''} · ${major?.titolo || ''}`,
            pillar_id: major?.pillar_id || null,
          }}
          prefilledKaizen={null}
          onClose={() => {
            setShowActionPlanForm(false)
            setSelectedCountermeasureId(null)
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
    anomalie: mapItems(data.anomalie, EMPTY_ANOMALY, 'anomaly'),
    ishikawa: {
      effetto: data.ishikawa?.effetto || '',
      rami: data.ishikawa?.rami || {},
    },
    contromisure: mapItems(
      data.contromisure,
      EMPTY_COUNTERMEASURE,
      'countermeasure'
    ),
    verifiche_cause: mapItems(
      data.verifiche_cause,
      EMPTY_VERIFICATION,
      'verification'
    ),
    standard_aggiornato: data.standard_aggiornato || '',
  }
}

function mapItems(items, template, prefix) {
  return Array.isArray(items)
    ? items.map(item => ({
        ...template,
        ...item,
        id: item.id || createId(prefix),
      }))
    : []
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function visitNodes(rami, visitor) {
  const walk = node => {
    if (!node) return
    visitor(node)
    ;(node.children || []).forEach(walk)
  }

  Object.values(rami || {}).forEach(branch => {
    if (Array.isArray(branch)) branch.forEach(walk)
  })
}

function hasRootCauses(rami) {
  let found = false
  visitNodes(rami, node => {
    if (node.is_root_cause) found = true
  })
  return found
}

function hasRiskEvaluation(rami) {
  let found = false
  visitNodes(rami, node => {
    if (
      node.severity !== undefined ||
      node.occurrence !== undefined ||
      node.detection !== undefined
    ) {
      found = true
    }
  })
  return found
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
        {label}
      </label>
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
        <div className="text-xs text-gray-500">{plan.responsabile || 'Senza responsabile'} · {plan.stato_visuale || plan.stato || 'Aperto'}</div>
      </button>
      <button type="button" onClick={() => onOpen(plan)} className="p-1.5 text-primary" title="Apri Action Plan"><ExternalLink size={15} /></button>
      <button type="button" onClick={onUnlink} className="p-1.5 text-red-600" title="Scollega Action Plan"><Trash2 size={15} /></button>
    </div>
  )
}

function DeleteCell({ onClick }) {
  return (
    <td className="p-2">
      <button
        type="button"
        onClick={onClick}
        className="text-red-600 p-1 hover:bg-red-50 rounded"
      >
        <Trash2 size={15} />
      </button>
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
