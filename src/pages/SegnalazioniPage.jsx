import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { AlertTriangle, Leaf, Plus, Eye, X, Send, Trash2, Save } from 'lucide-react'

const TIPI = [
  { id: 'Sicurezza', label: 'SICUREZZA', Icon: AlertTriangle, color: 'text-red-600' },
  { id: 'Ambiente', label: 'AMBIENTE', Icon: Leaf, color: 'text-green-600' },
]

const STATO_BADGE = {
  Bozza: 'bg-gray-100 text-gray-700',
  Aperto: 'bg-blue-100 text-blue-700',
  'In gestione': 'bg-yellow-100 text-yellow-700',
  Chiuso: 'bg-green-100 text-green-700',
}

export default function SegnalazioniPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

  const savedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })()
  const role = String(savedUser.role || savedUser.ruolo || '').toLowerCase()
  const isAdmin = ['admin', 'administrator', 'amministratore'].includes(role)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/segnalazioni/')
      setItems(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createNew = async tipo => {
    try {
      const res = await api.post('/segnalazioni/', { tipo })
      setDetail(res.data)
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  const byTipo = useMemo(() => {
    const map = { Sicurezza: [], Ambiente: [] }
    items.forEach(item => {
      if (!map[item.tipo]) map[item.tipo] = []
      map[item.tipo].push(item)
    })
    return map
  }, [items])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Segnalazioni</h1>
          <p className="text-sm text-gray-500">Segnalazioni di sicurezza e ambiente</p>
        </div>
      </div>

      <div className="space-y-4">
        {TIPI.map(tipo => {
          const list = byTipo[tipo.id] || []
          const Icon = tipo.Icon
          return (
            <div key={tipo.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="bg-gray-700 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold tracking-wide">
                  <Icon size={18} /> {tipo.label}
                </div>
                <button
                  type="button"
                  onClick={() => createNew(tipo.id)}
                  className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-100"
                >
                  <Plus size={16} /> Nuovo
                </button>
              </div>

              <div className="divide-y">
                {loading ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Caricamento...</div>
                ) : list.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Nessuna segnalazione</div>
                ) : (
                  list.map(item => (
                    <div key={item._id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                      <span className="font-mono text-sm font-bold text-primary w-20">{item.codice}</span>
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {item.descrizione || 'Senza descrizione'}
                      </span>
                      {item.reparto && <span className="text-xs text-gray-500 hidden md:block">{item.reparto}</span>}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATO_BADGE[item.stato] || 'bg-gray-100 text-gray-700'}`}>
                        {item.stato}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDetail(item)}
                        className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                      >
                        <Eye size={15} /> Consulta
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {detail && (
        <SegnalazioneDetail
          segnalazione={detail}
          isAdmin={isAdmin}
          onClose={() => setDetail(null)}
          onSaved={() => { load() }}
        />
      )}
    </div>
  )
}

function SegnalazioneDetail({ segnalazione, isAdmin, onClose, onSaved }) {
  const [form, setForm] = useState(segnalazione)
  const [reparti, setReparti] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/reparti/').then(res => setReparti(res.data || [])).catch(() => {})
  }, [])

  const isChiuso = form.stato === 'Chiuso'
  const canEdit = !isChiuso || isAdmin

  const lineeAvailable = (reparti.find(r => r.nome === form.reparto)?.linee || [])
  const macchineAvailable = (lineeAvailable.find(l => l.nome === form.linea)?.macchine || [])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        tipo: form.tipo,
        data_evento: form.data_evento,
        ora_evento: form.ora_evento,
        reparto: form.reparto,
        linea: form.linea,
        macchina: form.macchina,
        descrizione: form.descrizione,
        persona_coinvolta: form.persona_coinvolta,
        persone_presenti: form.persone_presenti,
        azioni_immediate: form.azioni_immediate,
        azioni_suggerite: form.azioni_suggerite,
      }
      const res = await api.put(`/segnalazioni/${form._id}`, payload)
      setForm(res.data)
      onSaved()
      alert('Bozza salvata')
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  const termina = async () => {
    if (!form.descrizione?.trim()) {
      alert('La descrizione dell evento e obbligatoria')
      return
    }
    try {
      const res = await api.post(`/segnalazioni/${form._id}/termina`)
      setForm(res.data)
      onSaved()
      alert('Segnalazione inviata')
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  const classifica = async (field, value) => {
    const next = { ...form, [field]: value }
    setForm(next)
    try {
      await api.patch(`/segnalazioni/${form._id}/classificazione`, {
        categoria: next.categoria,
        gravita: next.gravita,
        priorita: next.priorita,
        note_gestione: next.note_gestione,
      })
      onSaved()
    } catch (err) {
      console.error(err)
    }
  }

  const cambiaStato = async stato => {
    try {
      const res = await api.patch(`/segnalazioni/${form._id}/stato`, { stato })
      setForm(res.data)
      onSaved()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  const elimina = async () => {
    if (!confirm('Eliminare questa segnalazione?')) return
    try {
      await api.delete(`/segnalazioni/${form._id}`)
      onSaved()
      onClose()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-gray-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-300">Segnalazione di {form.tipo}</div>
            <h2 className="text-lg font-bold">Codice {form.codice}</h2>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && form.stato === 'Bozza' && (
              <>
                <button onClick={save} disabled={saving} className="bg-white text-gray-800 px-3 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-gray-100">
                  <Save size={15} /> Salva bozza
                </button>
                <button onClick={termina} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700">
                  <Send size={15} /> Termina inserimento
                </button>
              </>
            )}
            {canEdit && form.stato !== 'Bozza' && (
              <button onClick={save} disabled={saving} className="bg-white text-gray-800 px-3 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-gray-100">
                <Save size={15} /> Salva
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-600"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Section title="DATI RIEPILOGATIVI">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadField label="Codice" value={form.codice} />
              <ReadField label="Responsabile segnalazione" value={form.responsabile_nome || '—'} />
              <ReadField label="Segnalazione" value={`Segnalazione di ${form.tipo}`} />
              <ReadField label="Segnalatore" value={form.segnalatore_nome} />
              <ReadField label="Data" value={form.created_at ? new Date(form.created_at).toLocaleString('it-IT') : '—'} />
              <div>
                <FieldLabel>Stato</FieldLabel>
                <span className={`inline-block px-3 py-1.5 rounded text-sm font-medium ${STATO_BADGE[form.stato] || 'bg-gray-100'}`}>{form.stato}</span>
              </div>
              <ReadField label="Data chiusura" value={form.data_chiusura ? new Date(form.data_chiusura).toLocaleString('it-IT') : '—'} />
            </div>
          </Section>

          <Section title="DETTAGLIO DELL'EVENTO">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Data *">
                <input type="date" disabled={!canEdit} value={form.data_evento || ''} onChange={e => set('data_evento', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
              </Field>
              <Field label="Ora *">
                <input type="time" disabled={!canEdit} value={form.ora_evento || ''} onChange={e => set('ora_evento', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
              </Field>
              <Field label="Reparto *">
                <select disabled={!canEdit} value={form.reparto || ''} onChange={e => setForm(f => ({ ...f, reparto: e.target.value, linea: '', macchina: '' }))} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">Seleziona</option>
                  {reparti.map(r => <option key={r._id} value={r.nome}>{r.nome}</option>)}
                </select>
              </Field>
              <Field label="Linea">
                <select disabled={!canEdit || !form.reparto} value={form.linea || ''} onChange={e => setForm(f => ({ ...f, linea: e.target.value, macchina: '' }))} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">Seleziona</option>
                  {lineeAvailable.map(l => <option key={l.id} value={l.nome}>{l.nome}</option>)}
                </select>
              </Field>
              <Field label="Macchina">
                <select disabled={!canEdit || !form.linea} value={form.macchina || ''} onChange={e => set('macchina', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">Seleziona</option>
                  {macchineAvailable.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Descrizione dell'evento o della condizione o del comportamento *">
              <textarea disabled={!canEdit} value={form.descrizione || ''} onChange={e => set('descrizione', e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Persona coinvolta">
                <textarea disabled={!canEdit} value={form.persona_coinvolta || ''} onChange={e => set('persona_coinvolta', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
              </Field>
              <Field label="Persone presenti">
                <textarea disabled={!canEdit} value={form.persone_presenti || ''} onChange={e => set('persone_presenti', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
              </Field>
              <Field label="Azioni immediate intraprese">
                <textarea disabled={!canEdit} value={form.azioni_immediate || ''} onChange={e => set('azioni_immediate', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
              </Field>
              <Field label="Azioni suggerite">
                <textarea disabled={!canEdit} value={form.azioni_suggerite || ''} onChange={e => set('azioni_suggerite', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
              </Field>
            </div>
          </Section>

          {isAdmin && (
            <Section title="GESTIONE (ADMIN)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Categoria">
                  <input value={form.categoria || ''} onChange={e => classifica('categoria', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Es: Rischio meccanico" />
                </Field>
                <Field label="Gravita">
                  <select value={form.gravita || ''} onChange={e => classifica('gravita', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">—</option>
                    {['Bassa', 'Media', 'Alta', 'Critica'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Priorita">
                  <select value={form.priorita || ''} onChange={e => classifica('priorita', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">—</option>
                    {['Bassa', 'Media', 'Alta'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Note di gestione">
                <textarea value={form.note_gestione || ''} onChange={e => classifica('note_gestione', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-bold text-gray-500 uppercase mr-2">Stato:</span>
                {['Aperto', 'In gestione', 'Chiuso'].map(s => (
                  <button key={s} type="button" onClick={() => cambiaStato(s)} className={`px-3 py-1.5 rounded-lg text-sm border ${form.stato === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:border-primary'}`}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="bg-gray-50 border rounded-lg p-4 mt-2">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Collegamenti</div>
                <div className="text-sm text-gray-600">
                  Action Plan: {form.action_plan_numero || 'Nessuno'} · Kaizen: {form.kaizen_numero || 'Nessuno'}
                </div>
                <p className="text-xs text-gray-400 mt-2">Il collegamento a Action Plan e Kaizen verra abilitato nel prossimo step.</p>
              </div>
            </Section>
          )}

          {canEdit && (
            <div className="flex justify-end">
              <button onClick={elimina} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Trash2 size={15} /> Elimina segnalazione
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-600 text-white px-4 py-2.5 font-bold text-sm">{title}</div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  )
}

function FieldLabel({ children }) {
  return <span className="block text-sm font-medium text-gray-600 mb-1">{children}</span>
}

function ReadField({ label, value }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-700">{value || '—'}</div>
    </div>
  )
}
