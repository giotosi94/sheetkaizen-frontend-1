import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { FileText, Upload, Download, Search, Trash2, Edit2, Eye, X } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CATEGORIE = ['Operativa', 'Sicurezza', 'Manutenzione', 'Qualità', 'Pulizia', 'Allergeni', 'Avvio/Spegnimento']
const STATI = ['Bozza', 'In Revisione', 'Approvato', 'Obsoleto']

export default function DocumentiPage() {
  const [documenti, setDocumenti] = useState([])
  const [stats, setStats] = useState({})
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)

  useEffect(() => { load() }, [filterTipo, filterCategoria, filterStato])

  const load = async () => {
    try {
      const params = {}
      if (filterTipo) params.tipo = filterTipo
      if (filterCategoria) params.categoria = filterCategoria
      if (filterStato) params.stato = filterStato
      if (search) params.search = search
      const res = await api.get('/documenti', { params })
      setDocumenti(res.data)
      const statsRes = await api.get('/documenti/stats/summary')
      setStats(statsRes.data)
    } catch (err) { console.error(err) }
  }

  const handleSearch = () => load()

  const deleteDoc = async (id) => {
    if (!confirm('Vuoi davvero eliminare questo documento?')) return
    try {
      await api.delete(`/documenti/${id}`)
      load()
    } catch (err) { console.error(err) }
  }

  const getStatoBadge = (stato) => {
    const colors = {
      'Bozza': 'bg-gray-100 text-gray-700',
      'In Revisione': 'bg-yellow-100 text-yellow-700',
      'Approvato': 'bg-green-100 text-green-700',
      'Obsoleto': 'bg-red-100 text-red-700',
    }
    return colors[stato] || 'bg-gray-100 text-gray-700'
  }

  const getTipoIcon = (tipo) => {
    return tipo === 'OPL' ? '📋' : tipo === 'SOP' ? '📑' : '📄'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📚 Document Manager (OPL / SOP)</h1>
        <button onClick={() => setUploadOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light">
          <Upload size={18} /> Carica Documento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {['OPL', 'SOP'].map(tipo => {
          const total = Object.values(stats[tipo] || {}).reduce((s, n) => s + n, 0)
          const approvati = (stats[tipo] || {})['Approvato'] || 0
          return (
            <div key={tipo} className="bg-white rounded-xl shadow p-5">
              <div className="text-3xl mb-2">{getTipoIcon(tipo)}</div>
              <p className="text-sm text-gray-500">{tipo === 'OPL' ? 'One Point Lessons' : 'Standard Operating Procedures'}</p>
              <p className="text-2xl font-bold">{total} documenti</p>
              <p className="text-xs text-green-600 mt-1">✅ {approvati} approvati</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Cerca per titolo o numero..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Tutti i tipi</option>
            <option>OPL</option>
            <option>SOP</option>
            <option>Procedura</option>
            <option>Istruzione</option>
          </select>
          <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Tutte le categorie</option>
            {CATEGORIE.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterStato} onChange={(e) => setFilterStato(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Tutti gli stati</option>
            {STATI.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={handleSearch} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-light">
            <Search size={16} /> Cerca
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-4">Numero</th>
              <th className="p-4">Titolo</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Categoria</th>
              <th className="p-4">Reparto/Linea</th>
              <th className="p-4">Versione</th>
              <th className="p-4">Stato</th>
              <th className="p-4">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {documenti.length === 0 ? (
              <tr><td colSpan="8" className="text-center text-gray-400 py-8">Nessun documento. Caricane uno!</td></tr>
            ) : (
              documenti.map(doc => {
                const fileUrl = `${API_BASE}/api/documenti/${doc._id}/file`
                return (
                  <tr key={doc._id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-mono text-primary font-bold">{doc.numero}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span>{getTipoIcon(doc.tipo)}</span>
                        <div>
                          <div className="font-medium">{doc.titolo}</div>
                          {doc.descrizione && <div className="text-xs text-gray-500 truncate max-w-xs">{doc.descrizione}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{doc.tipo}</td>
                    <td className="p-4">{doc.categoria || '-'}</td>
                    <td className="p-4 text-xs">
                      {doc.reparto && <div>🏭 {doc.reparto}</div>}
                      {doc.linea && <div>⚙️ {doc.linea}</div>}
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">v{doc.versione || 1}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatoBadge(doc.stato)}`}>
                        {doc.stato}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Visualizza">
                          <Eye size={16} />
                        </a>
                        <a href={fileUrl} download className="text-green-600 hover:bg-green-50 p-1 rounded" title="Scarica">
                          <Download size={16} />
                        </a>
                        <button onClick={() => setEditingDoc(doc)} className="text-yellow-600 hover:bg-yellow-50 p-1 rounded" title="Modifica">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteDoc(doc._id)} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Elimina">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onSaved={load} />}
      {editingDoc && <EditModal doc={editingDoc} onClose={() => setEditingDoc(null)} onSaved={load} />}
    </div>
  )
}


function UploadModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    titolo: '', tipo: 'OPL', categoria: '', reparto: '', linea: '', macchina: '',
    autore: '', descrizione: '', tag: '',
  })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return alert('Seleziona un file')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v))
      const res = await api.post('/documenti/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      alert(`Documento ${res.data.numero} creato!`)
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      alert('Errore upload: ' + (err.response?.data?.detail || err.message))
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-primary text-white p-4 rounded-t-xl flex justify-between items-center sticky top-0">
          <h2 className="text-lg font-bold">📤 Carica Documento</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">File <span className="text-red-500">*</span></label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
              {file ? (
                <div>
                  <FileText className="mx-auto text-green-600 mb-2" size={32} />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-gray-400">
                  <Upload className="mx-auto mb-2" size={32} />
                  <p className="text-sm">Click per selezionare il file</p>
                  <p className="text-xs">PDF, DOCX, XLSX, PPTX, immagini... (max 50MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Titolo <span className="text-red-500">*</span></label>
              <input required value={form.titolo} onChange={(e) => setForm({...form, titolo: e.target.value})}
                className="w-full border rounded-lg px-3 py-2" placeholder="Es: Pulizia filtro Bindler 11" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo <span className="text-red-500">*</span></label>
              <select value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})}
                className="w-full border rounded-lg px-3 py-2">
                <option>OPL</option>
                <option>SOP</option>
                <option>Procedura</option>
                <option>Istruzione</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})}
                className="w-full border rounded-lg px-3 py-2">
                <option value="">-- Seleziona --</option>
                {CATEGORIE.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Autore</label>
              <input value={form.autore} onChange={(e) => setForm({...form, autore: e.target.value})}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Reparto</label>
              <input value={form.reparto} onChange={(e) => setForm({...form, reparto: e.target.value})}
                className="w-full border rounded-lg px-3 py-2" placeholder="Es: Confezionamento" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Linea</label>
              <input value={form.linea} onChange={(e) => setForm({...form, linea: e.target.value})}
                className="w-full border rounded-lg px-3 py-2" placeholder="Es: Linea 1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Macchina</label>
              <input value={form.macchina} onChange={(e) => setForm({...form, macchina: e.target.value})}
                className="w-full border rounded-lg px-3 py-2" placeholder="Opzionale" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea value={form.descrizione} onChange={(e) => setForm({...form, descrizione: e.target.value})}
              rows={2} className="w-full border rounded-lg px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tag (separati da virgola)</label>
