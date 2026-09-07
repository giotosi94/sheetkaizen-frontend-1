import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAllConfigurations } from '../hooks/useConfigurations'
import { Plus, LayoutDashboard, Edit2, Trash2, Copy, Lock, Users, Globe } from 'lucide-react'
import UserPicker from '../components/UserPicker'

export default function DashboardListPage() {
  const [dashboards, setDashboards] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [reparti, setReparti] = useState([])
  const navigate = useNavigate()
  const { configs } = useAllConfigurations()

  const tipiMeeting = configs.tipi_meeting || []

  const [form, setForm] = useState({
    nome: '',
    titolo_pagina: '',
    descrizione: '',
    tipo: '',
    reparto: '',
    visibilita: 'pubblico',
    utenti_autorizzati_data: [],
    utenti_autorizzati_ids: [],
    utenti_autorizzati_nomi: [],
  })

  useEffect(() => {
    loadDashboards()
    api.get('/reparti/').then(res => setReparti(res.data || [])).catch(() => setReparti([]))
  }, [])

  // Default tipo quando configurazioni arrivano
  useEffect(() => {
    if (tipiMeeting.length > 0 && !form.tipo) {
      setForm(f => ({ ...f, tipo: tipiMeeting[0].label }))
    }
  }, [tipiMeeting])

  const loadDashboards = async () => {
    try {
      const res = await api.get('/dashboards')
      setDashboards(res.data)
    } catch (err) { console.error(err) }
  }

  const resetForm = () => {
    setForm({
      nome: '',
      titolo_pagina: '',
      descrizione: '',
      tipo: tipiMeeting[0]?.label || 'Custom',
      reparto: '',
      visibilita: 'pubblico',
      utenti_autorizzati_data: [],
      utenti_autorizzati_ids: [],
      utenti_autorizzati_nomi: [],
    })
  }

  const createDashboard = async () => {
    if (!form.nome.trim()) {
      alert('Inserisci un nome')
      return
    }
    if (form.visibilita === 'reparto' && !form.reparto) {
      alert('Seleziona un reparto')
      return
    }
    if (form.visibilita === 'privato' && form.utenti_autorizzati_ids.length === 0) {
      if (!confirm('Nessun utente autorizzato. Solo tu potrai vedere questa dashboard. Procedere?')) return
    }
    try {
      const payload = {
        nome: form.nome,
        titolo_pagina: form.titolo_pagina || form.nome,
        descrizione: form.descrizione,
        tipo: form.tipo || 'Custom',
        reparto: form.visibilita === 'reparto' ? form.reparto : null,
        visibilita: form.visibilita,
        layout: [],
        utenti_autorizzati_ids: form.visibilita === 'privato' ? form.utenti_autorizzati_ids : [],
        utenti_autorizzati_nomi: form.visibilita === 'privato' ? form.utenti_autorizzati_nomi : [],
      }
      const res = await api.post('/dashboards', payload)
      setShowModal(false)
      resetForm()
      navigate(`/dashboard/${res.data.id}`)
    } catch (err) {
      console.error(err)
      alert('Errore creazione: ' + (err.response?.data?.detail || err.message))
    }
  }

  const duplicate = async (id) => {
    try {
      await api.post(`/dashboards/${id}/duplicate`)
      loadDashboards()
    } catch (err) {
      alert('Errore duplicazione: ' + (err.response?.data?.detail || err.message))
    }
  }

  const deleteDashboard = async (id) => {
    if (!confirm('Eliminare questa dashboard?')) return
    try {
      await api.delete(`/dashboards/${id}`)
      loadDashboards()
    } catch (err) {
      alert('Errore eliminazione: ' + (err.response?.data?.detail || err.message))
    }
  }

  function getVisibilitaIcon(v) {
    if (v === 'pubblico') return <Globe size={12} />
    if (v === 'reparto') return <Users size={12} />
    if (v === 'privato') return <Lock size={12} />
    return null
  }

  function getVisibilitaLabel(v) {
    return v === 'pubblico' ? 'Pubblico' :
           v === 'reparto' ? 'Reparto' :
           v === 'privato' ? 'Privato' : v
  }

  function getVisibilitaColor(v) {
    return v === 'pubblico' ? 'bg-green-100 text-green-700' :
           v === 'reparto' ? 'bg-blue-100 text-blue-700' :
           v === 'privato' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Meetings</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light"
        >
          <Plus size={18} /> Nuova Dashboard
        </button>
      </div>

      {dashboards.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <LayoutDashboard className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-400 mb-4">Nessuna dashboard creata ancora</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light"
          >
            Crea la prima dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboards.map(d => (
            <div key={d._id} className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{d.nome}</h3>
                <div className="flex gap-1">
                  <button onClick={() => duplicate(d._id)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Duplica">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => deleteDashboard(d._id)} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Elimina">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3 min-h-[3em]">{d.descrizione || 'Nessuna descrizione'}</p>
              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{d.tipo}</span>
                <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${getVisibilitaColor(d.visibilita)}`}>
                  {getVisibilitaIcon(d.visibilita)}
                  {getVisibilitaLabel(d.visibilita)}
                </span>
                {d.reparto && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">{d.reparto}</span>}
              </div>
              <button
                onClick={() => navigate(`/dashboard/${d._id}`)}
                className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary-light flex items-center justify-center gap-2"
              >
                <Edit2 size={16} /> Apri / Modifica
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuova Dashboard */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-primary text-white p-4 rounded-t-xl sticky top-0 z-10">
              <h2 className="text-lg font-bold">Nuova Dashboard</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Es: PCS Fabbrica - Weekly Meeting"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Titolo pagina</label>
                <input
                  value={form.titolo_pagina}
                  onChange={(e) => setForm({ ...form, titolo_pagina: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Se vuoto, usa il nome del meeting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <textarea
                  value={form.descrizione}
                  onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {tipiMeeting.length === 0 ? (
                      <option value="Custom">Custom</option>
                    ) : (
                      tipiMeeting.filter(t => t.attivo !== false).map(t => (
                        <option key={t._id} value={t.label}>
                          {t.icon ? `${t.icon} ` : ''}{t.label}
                        </option>
                      ))
                    )}
                  </select>
                  {tipiMeeting.length === 0 && (
                    <div className="text-[10px] text-orange-600 mt-1">
                      Configura i tipi in Settings → Tipi di Meeting
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Visibilità</label>
                  <select
                    value={form.visibilita}
                    onChange={(e) => setForm({ ...form, visibilita: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="pubblico">Pubblico</option>
                    <option value="reparto">Reparto</option>
                    <option value="privato">Privato</option>
                  </select>
                </div>
              </div>

              {/* Campo Reparto: visibile solo se visibilità = reparto */}
              {form.visibilita === 'reparto' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reparto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.reparto}
                    onChange={(e) => setForm({ ...form, reparto: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">— Seleziona reparto —</option>
                    {reparti.filter(r => r.attivo !== false).map(r => (
                      <option key={r._id} value={r.nome}>
                        {r.nome}{r.codice ? ` [${r.codice}]` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    Solo utenti con questo reparto nel profilo potranno vedere la dashboard.
                  </div>
                </div>
              )}

              {/* Utenti autorizzati: visibile solo se visibilità = privato */}
              {form.visibilita === 'privato' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Utenti autorizzati
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      ({form.utenti_autorizzati_data.length})
                    </span>
                  </label>
                  <UserPicker
                    value={form.utenti_autorizzati_data}
                    onChange={(selected) => {
                      setForm({
                        ...form,
                        utenti_autorizzati_data: selected,
                        utenti_autorizzati_ids: selected.map(s => s.id),
                        utenti_autorizzati_nomi: selected.map(s => s.name),
                      })
                    }}
                    mode="multi"
                    placeholder="Cerca utenti da invitare..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Solo tu (creatore) e gli utenti selezionati potranno vedere la dashboard.
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Annulla
                </button>
                <button
                  onClick={createDashboard}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light"
                >
                  Crea e Apri
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
