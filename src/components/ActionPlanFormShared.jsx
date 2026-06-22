import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../services/api'
import { useAllConfigurations } from '../hooks/useConfigurations'

const STATI = ['Da Valutare', 'Aperto', 'In Corso', 'In Verifica', 'Done', 'Cancelled']
const PRIORITA = ['Lowest', 'Low', 'Medium', 'High', 'Critical']

/**
 * Componente condiviso per creare/modificare un Action Plan.
 * Usato sia in ActionPlanPage (pagina principale) sia in KaizenDetailPage (tab Azioni).
 * 
 * Props:
 * - plan: l'AP da modificare (null per nuovo)
 * - onClose: funzione chiamata alla chiusura
 * - onSaved: callback con (savedPlan) dopo salvataggio
 * - prefilledKaizen: { kaizen_id, kaizen_numero } per pre-collegare a un Kaizen
 */
export default function ActionPlanFormShared({ plan, onClose, onSaved, prefilledKaizen = null }) {
  const [form, setForm] = useState({
    titolo: plan?.titolo || '',
    descrizione: plan?.descrizione || '',
    tipo: plan?.tipo || '',
    priorita: plan?.priorita || 'Medium',
    stato: plan?.stato || 'Da Valutare',
    categoria: plan?.categoria || '',
    tipo_perdita: plan?.tipo_perdita || '',
    responsabile: plan?.responsabile || '',
    reparto: plan?.reparto || '',
    linea: plan?.linea || '',
    macchina: plan?.macchina || '',
    data_scadenza: plan?.data_scadenza ? plan.data_scadenza.slice(0, 10) : '',
    tags: plan?.tags?.join(', ') || '',
  })
  const [saving, setSaving] = useState(false)
  const { configs } = useAllConfigurations()

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      
      // Se abbiamo un Kaizen pre-collegato, aggiungiamo un tag automatico
      if (prefilledKaizen?.kaizen_numero) {
        const kaizenTag = `kaizen-${prefilledKaizen.kaizen_numero}`
        if (!tagsArray.includes(kaizenTag)) {
          tagsArray.push(kaizenTag)
        }
      }
      
      // Pulisce campi vuoti per evitare errori di validazione
      const cleanForm = Object.fromEntries(
        Object.entries(form).filter(([k, v]) => v !== '' && v !== null && v !== undefined)
      )
      
      const payload = {
        ...cleanForm,
        tags: tagsArray,
        data_scadenza: form.data_scadenza ? new Date(form.data_scadenza).toISOString() : null,
      }
      
      let res
      if (plan?._id) {
        res = await api.put(`/action-plans/${plan._id}`, payload)
      } else {
        res = await api.post('/action-plans/', payload)
        
        // Se è un nuovo AP e abbiamo un Kaizen pre-collegato, lo linkiamo subito
        if (prefilledKaizen?.kaizen_id && res.data?._id) {
          try {
            await api.post(`/action-plans/${res.data._id}/link-kaizen`, {
              kaizen_id: prefilledKaizen.kaizen_id,
              kaizen_numero: prefilledKaizen.kaizen_numero,
            })
          } catch (linkErr) {
            console.warn('Link kaizen fallito ma AP creato:', linkErr)
          }
        }
      }
      
      onSaved(res.data)
    } catch (err) {
      console.error(err)
      // Parser migliorato per errori Pydantic
      let msg = 'Errore sconosciuto'
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        msg = detail
      } else if (Array.isArray(detail)) {
        // Errori di validazione Pydantic: array di oggetti
        msg = detail.map(d => {
          const field = d.loc ? d.loc.slice(1).join('.') : 'campo'
          return `${field}: ${d.msg}`
        }).join('\n')
      } else if (err.message) {
        msg = err.message
      }
      alert('❌ Errore salvataggio:\n\n' + msg)
    } finally {
      setSaving(false)
    }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
        <div className="bg-primary text-white px-6 py-3 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg font-semibold">
            {plan ? `✏️ Modifica ${plan.numero}` : '➕ Nuovo Action Plan'}
            {prefilledKaizen && !plan && (
              <span className="ml-2 text-sm font-normal opacity-90">
                · 🔗 Collegato a {prefilledKaizen.kaizen_numero}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="hover:bg-primary-light p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Titolo *">
            <input
              required
              autoFocus
              value={form.titolo}
              onChange={(e) => setForm({ ...form, titolo: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Es: Sostituire filtro Bindler linea 11"
            />
          </Field>

          <Field label="Descrizione (supporta @mentions e #tags)">
            <textarea
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
              placeholder="Es: @mario.rossi devi sostituire il filtro #manutenzione #linea-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              💡 Usa <code className="bg-gray-100 px-1">@nome</code> per taggare persone e{' '}
              <code className="bg-gray-100 px-1">#argomento</code> per categorizzare
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tipo">
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">— Seleziona —</option>
                {(configs.tipi_action_plan || []).map(t => (
                  <option key={t._id} value={t.label}>
                    {t.icon ? `${t.icon} ` : ''}{t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priorità">
              <select
                value={form.priorita}
                onChange={(e) => setForm({ ...form, priorita: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {PRIORITA.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Stato">
              <select
                value={form.stato}
                onChange={(e) => setForm({ ...form, stato: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {STATI.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">— Seleziona —</option>
                {(configs.categorie_action_plan || []).map(c => (
                  <option key={c._id} value={c.label}>
                    {c.icon ? `${c.icon} ` : ''}{c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo Perdita (TPM)">
              <select
                value={form.tipo_perdita}
                onChange={(e) => setForm({ ...form, tipo_perdita: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">— Nessuna —</option>
                {(configs.tipi_perdita || []).map(p => (
                  <option key={p._id} value={p.label}>
                    {p.icon ? `${p.icon} ` : ''}{p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Responsabile">
            <input
              value={form.responsabile}
              onChange={(e) => setForm({ ...form, responsabile: e.target.value })}
              placeholder="Es: Mario Rossi"
              className="w-full border rounded-lg px-3 py-2"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Reparto">
              <select
                value={form.reparto}
                onChange={(e) => setForm({ ...form, reparto: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">— Seleziona —</option>
                {(configs.reparti || []).map(r => (
                  <option key={r._id} value={r.label}>
                    {r.icon ? `${r.icon} ` : ''}{r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Linea">
              <select
                value={form.linea}
                onChange={(e) => setForm({ ...form, linea: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">— Seleziona —</option>
                {(configs.linee || []).map(l => (
                  <option key={l._id} value={l.label}>
                    {l.icon ? `${l.icon} ` : ''}{l.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Macchina">
              <select
                value={form.macchina}
                onChange={(e) => setForm({ ...form, macchina: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">— Seleziona —</option>
                {(configs.macchine || []).map(m => (
                  <option key={m._id} value={m.label}>
                    {m.icon ? `${m.icon} ` : ''}{m.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Scadenza">
              <input
                type="date"
                value={form.data_scadenza}
                onChange={(e) => setForm({ ...form, data_scadenza: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="Tags (separati da virgola)">
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="sicurezza, manutenzione, linea-2"
                className="w-full border rounded-lg px-3 py-2"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : (plan ? '💾 Salva modifiche' : '➕ Crea Action Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
