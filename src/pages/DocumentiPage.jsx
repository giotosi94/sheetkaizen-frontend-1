import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { FileText, Upload, Download, Search, Trash2, Edit2, Eye, X } from 'lucide-react'
import * as XLSX from 'xlsx'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CATEGORIE = ['Operativa', 'Sicurezza', 'Manutenzione', 'Qualità', 'Pulizia', 'Allergeni', 'Avvio/Spegnimento']
const STATI = ['Bozza', 'In Revisione', 'Approvato', 'Obsoleto']

function getFileType(filename) {
  if (!filename) return 'unknown'
  const ext = filename.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return 'pdf'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image'
  if (['xlsx', 'xls'].includes(ext)) return 'excel'
  if (['docx', 'doc', 'pptx', 'ppt'].includes(ext)) return 'office'
  if (['txt', 'csv', 'log', 'json', 'xml'].includes(ext)) return 'text'
  return 'unknown'
}

export default function DocumentiPage() {
  const [documenti, setDocumenti] = useState([])
  const [stats, setStats] = useState({})
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)

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
        <h1 className="text-2xl font-bold text-gray-800">Document Manager (OPL / SOP)</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            Bulk Upload
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light"
          >
            <Upload size={18} /> Carica Singolo
          </button>
        </div>
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
              <p className="text-xs text-green-600 mt-1">{approvati} approvati</p>
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
                const handleTableDownload = async () => {
                  try {
                    const res = await api.get(`/documenti/${doc._id}/file`, { responseType: 'blob' })
                    const url = URL.createObjectURL(res.data)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = doc.file_name || 'documento'
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    setTimeout(() => URL.revokeObjectURL(url), 1000)
                  } catch (err) {
                    alert('Errore download: ' + (err.response?.data?.detail || err.message))
                  }
                }
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
                      {doc.reparto && <div>{doc.reparto}</div>}
                      {doc.linea && <div>{doc.linea}</div>}
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
                        <button onClick={() => setPreviewDoc(doc)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Anteprima">
                          <Eye size={16} />
                        </button>
                        <button onClick={handleTableDownload} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Scarica">
                          <Download size={16} />
                        </button>
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
      {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      {bulkOpen && <BulkUploadModal onClose={() => setBulkOpen(false)} onSaved={load} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PREVIEW MODAL
// ─────────────────────────────────────────────────────────────

function PreviewModal({ doc, onClose }) {
  const fileType = getFileType(doc.file_name)
  const [blobUrl, setBlobUrl] = useState(null)
  const [textContent, setTextContent] = useState('')
  const [excelSheets, setExcelSheets] = useState([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Bottone Scarica: genera al volo un blob e forza il download (con JWT)
  async function handleDownload() {
    try {
      const res = await api.get(`/documenti/${doc._id}/file`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name || 'documento'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      alert('Errore download: ' + (err.response?.data?.detail || err.message))
    }
  }

  // Carica il file dal backend (JWT) per anteprima
  useEffect(() => {
    let currentUrl = null
    let cancelled = false

    async function loadFile() {
      if (
        fileType !== 'pdf' &&
        fileType !== 'image' &&
        fileType !== 'text' &&
        fileType !== 'excel'
      ) {
        setLoading(false)
        return
      }
      try {
        const res = await api.get(`/documenti/${doc._id}/file`, { responseType: 'blob' })
        if (cancelled) return

        if (fileType === 'text') {
          const text = await res.data.text()
          if (!cancelled) {
            setTextContent(text)
            setLoading(false)
          }
        } else if (fileType === 'excel') {
          const arrayBuf = await res.data.arrayBuffer()
          if (!cancelled) {
            const wb = XLSX.read(arrayBuf, { type: 'array' })
            const sheets = wb.SheetNames.map(name => {
              const ws = wb.Sheets[name]
              const html = XLSX.utils.sheet_to_html(ws, { editable: false })
              return { name, html }
            })
            setExcelSheets(sheets)
            setLoading(false)
          }
        } else {
          currentUrl = URL.createObjectURL(res.data)
          if (!cancelled) {
            setBlobUrl(currentUrl)
            setLoading(false)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || err.message || 'Errore caricamento')
          setLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      cancelled = true
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [doc._id, fileType])

  const previewContent = (() => {
    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          Caricamento anteprima...
        </div>
      )
    }

    if (error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-lg mb-2 font-medium">Errore caricamento</div>
          <div className="text-sm text-gray-400 mb-6">{error}</div>
          <button
            onClick={handleDownload}
            className="bg-primary text-white px-5 py-2 rounded-lg hover:bg-primary-light flex items-center gap-2"
          >
            <Download size={18} /> Scarica
          </button>
        </div>
      )
    }

    if (fileType === 'pdf' && blobUrl) {
      return React.createElement('iframe', {
        src: blobUrl,
        className: 'w-full h-full border-0',
        title: doc.titolo,
      })
    }

    if (fileType === 'image' && blobUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
          {React.createElement('img', {
            src: blobUrl,
            alt: doc.titolo,
            className: 'max-w-full max-h-full object-contain shadow-lg',
          })}
        </div>
      )
    }

    if (fileType === 'text') {
      return (
        <pre className="w-full h-full overflow-auto p-6 bg-gray-50 text-sm font-mono whitespace-pre-wrap">
          {textContent}
        </pre>
      )
    }

    if (fileType === 'excel' && excelSheets.length > 0) {
      const sheet = excelSheets[activeSheet] || excelSheets[0]
      return (
        <div className="w-full h-full flex flex-col bg-white">
          {excelSheets.length > 1 && (
            <div className="flex gap-1 border-b bg-gray-50 px-3 py-2 overflow-x-auto flex-shrink-0">
              {excelSheets.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSheet(i)}
                  className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap ${
                    i === activeSheet
                      ? 'bg-primary text-white'
                      : 'bg-white border hover:bg-gray-100'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <div
            className="flex-1 overflow-auto p-4 excel-preview"
            dangerouslySetInnerHTML={{ __html: sheet.html }}
          />
        </div>
      )
    }

    // Office (docx, pptx) e altri: no preview, solo download
    const isOffice = fileType === 'office'
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-8">
        <div className="text-7xl mb-4">{isOffice ? '📊' : '📄'}</div>
        <div className="text-lg mb-2 font-medium">
          {isOffice ? 'Anteprima file Office non disponibile' : 'Anteprima non disponibile'}
        </div>
        <div className="text-sm mb-2 text-gray-400">{doc.file_name}</div>
        {isOffice && (
          <div className="text-xs mb-6 text-gray-400 max-w-md text-center">
            I file Word e PowerPoint richiedono di essere scaricati per essere visualizzati.
          </div>
        )}
        <button
          onClick={handleDownload}
          className="bg-primary text-white px-5 py-2 rounded-lg hover:bg-primary-light flex items-center gap-2"
        >
          <Download size={18} /> Scarica per visualizzare
        </button>
      </div>
    )
  })()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl">
        <div className="bg-primary text-white px-6 py-3 rounded-t-xl flex justify-between items-center">
          <div className="min-w-0">
            <div className="font-semibold truncate">{doc.numero} - {doc.titolo}</div>
            <div className="text-xs opacity-80 truncate">
              {doc.file_name} • v{doc.versione || 1} • {doc.stato}
              {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
            </div>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            <button
              onClick={handleDownload}
              className="bg-white text-primary px-3 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-gray-100"
            >
              <Download size={16} /> Scarica
            </button>
            <button onClick={onClose} className="hover:bg-primary-light p-1.5 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          {previewContent}
        </div>

        {(doc.descrizione || doc.autore) && (
          <div className="border-t bg-white px-6 py-2 text-xs text-gray-600 flex gap-4">
            {doc.autore && <span><strong>Autore:</strong> {doc.autore}</span>}
            {doc.categoria && <span><strong>Categoria:</strong> {doc.categoria}</span>}
            {doc.descrizione && <span className="truncate">{doc.descrizione}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// UPLOAD MODAL
// ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    titolo: '', tipo: 'OPL', categoria: '', reparto: '', linea: '', macchina: '',
    autore: '', descrizione: '', tag: '',
  })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [compress, setCompress] = useState(true)
  const fileRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return alert('Seleziona un file')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('compress', compress ? 'true' : 'false')
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v))
      const res = await api.post('/documenti/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const c = res.data.compressione
      let msg = `Documento ${res.data.numero} creato!`
      if (c && c.compressed) {
        const origMB = (c.original_size / 1024 / 1024).toFixed(2)
        const finalMB = (c.final_size / 1024 / 1024).toFixed(2)
        msg += `\n\nCompressione: ${origMB} MB → ${finalMB} MB (-${c.saved_pct}%)`
      }
      alert(msg)
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
          <h2 className="text-lg font-bold">Carica Documento</h2>
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
                  <p className="text-xs">PDF, DOCX, XLSX, PPTX, immagini (max 50MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Titolo <span className="text-red-500">*</span></label>
              <input required value={form.titolo} onChange={(e) => setForm({...form, titolo: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo <span className="text-red-500">*</span></label>
              <select value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})} className="w-full border rounded-lg px-3 py-2">
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
              <select value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="">-- Seleziona --</option>
                {CATEGORIE.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Autore</label>
              <input value={form.autore} onChange={(e) => setForm({...form, autore: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Reparto</label>
              <input value={form.reparto} onChange={(e) => setForm({...form, reparto: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Linea</label>
              <input value={form.linea} onChange={(e) => setForm({...form, linea: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Macchina</label>
              <input value={form.macchina} onChange={(e) => setForm({...form, macchina: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea value={form.descrizione} onChange={(e) => setForm({...form, descrizione: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tag (separati da virgola)</label>
            <input value={form.tag} onChange={(e) => setForm({...form, tag: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input type="checkbox" id="compress" checked={compress} onChange={(e) => setCompress(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="compress" className="text-sm cursor-pointer flex-1">
              <strong>Comprimi automaticamente</strong> — Riduce dimensioni di immagini, PDF e file Office
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Annulla</button>
            <button type="submit" disabled={uploading || !file} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50">
              {uploading ? 'Carico...' : 'Carica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EDIT MODAL
// ─────────────────────────────────────────────────────────────

function EditModal({ doc, onClose, onSaved }) {
  const [form, setForm] = useState({
    titolo: doc.titolo || '',
    categoria: doc.categoria || '',
    reparto: doc.reparto || '',
    linea: doc.linea || '',
    macchina: doc.macchina || '',
    autore: doc.autore || '',
    descrizione: doc.descrizione || '',
    stato: doc.stato || 'Bozza',
  })
  const [newFile, setNewFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/documenti/${doc._id}`, form)
      if (newFile) {
        const formData = new FormData()
        formData.append('file', newFile)
        await api.post(`/documenti/${doc._id}/upload-version`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      alert('Documento aggiornato!')
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-primary text-white p-4 rounded-t-xl flex justify-between items-center sticky top-0">
          <h2 className="text-lg font-bold">Modifica {doc.numero} (v{doc.versione})</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Titolo</label>
              <input value={form.titolo} onChange={(e) => setForm({...form, titolo: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stato</label>
              <select value={form.stato} onChange={(e) => setForm({...form, stato: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {STATI.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="">-- Seleziona --</option>
                {CATEGORIE.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Autore</label>
              <input value={form.autore} onChange={(e) => setForm({...form, autore: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Reparto</label>
              <input value={form.reparto} onChange={(e) => setForm({...form, reparto: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Linea</label>
              <input value={form.linea} onChange={(e) => setForm({...form, linea: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Macchina</label>
              <input value={form.macchina} onChange={(e) => setForm({...form, macchina: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea value={form.descrizione} onChange={(e) => setForm({...form, descrizione: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2" />
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" onChange={(e) => setNewFile(e.target.files[0])} className="hidden" />
            {newFile ? (
              <div>
                <FileText className="mx-auto text-green-600 mb-1" size={20} />
                <p className="text-sm">Nuova versione: <strong>{newFile.name}</strong></p>
                <p className="text-xs text-gray-500">Verrà creata v{(doc.versione || 1) + 1}</p>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                <Upload className="mx-auto mb-1" size={20} />
                Carica nuova versione del file (opzionale)
              </div>
            )}
          </div>

          {doc.versioni_precedenti && doc.versioni_precedenti.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Versioni precedenti</label>
              <div className="space-y-1">
                {doc.versioni_precedenti.map(v => {
                  const vUrl = `${API_BASE}/api/documenti/${doc._id}/version/${v.versione}`
                  return (
                    <a key={v.versione} href={vUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary">
                      <Download size={12} /> v{v.versione} — {v.file_name}
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Annulla</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50">
              {saving ? 'Salvo...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BULK UPLOAD MODAL
// ─────────────────────────────────────────────────────────────

function BulkUploadModal({ onClose, onSaved }) {
  const [files, setFiles] = useState([])
  const [autore, setAutore] = useState('')
  const [compress, setCompress] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const namePattern = /\b(OPL|SOP|PROC|IST)\b[\s_\-]*(\d{1,5})/i

  function analyzeFile(file) {
    const filenameNoExt = file.name.replace(/\.[^.]+$/, '')
    const match = filenameNoExt.match(namePattern)

    if (match) {
      const tipoRaw = match[1].toUpperCase()
      const numero = match[2].padStart(3, '0')
      let titoloRaw = filenameNoExt.replace(namePattern, '').trim()
      titoloRaw = titoloRaw.replace(/^[\s_\-]+/, '')
      let titolo = titoloRaw.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()

      if (!titolo) titolo = filenameNoExt.replace(/_/g, ' ').trim()

      return {
        valid: true,
        tipo: tipoRaw,
        numero: `${tipoRaw}-${numero}`,
        titolo: titolo,
      }
    }
    return {
      valid: false,
      titolo: filenameNoExt.replace(/_/g, ' ').replace(/-/g, ' ').trim(),
    }
  }

  function handleFiles(selectedFiles) {
    const arr = Array.from(selectedFiles)
    const enriched = arr.map(f => ({
      file: f,
      name: f.name,
      size: f.size,
      analysis: analyzeFile(f),
    }))
    setFiles(prev => [...prev, ...enriched])
  }

  function removeFile(index) {
    setFiles(files.filter((_, i) => i !== index))
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  async function handleUpload() {
    if (files.length === 0) return alert('Aggiungi almeno un file')
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    files.forEach(f => formData.append('files', f.file))
    if (autore) formData.append('autore', autore)
    formData.append('compress', compress ? 'true' : 'false')

    try {
      const res = await api.post('/documenti/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            setProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
        timeout: 300000,
      })
      setResult(res.data)
    } catch (err) {
      console.error(err)
      alert('Errore bulk upload: ' + (err.response?.data?.detail || err.message))
      setUploading(false)
    }
  }

  function handleClose() {
    if (result) onSaved()
    onClose()
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const validCount = files.filter(f => f.analysis.valid).length
  const invalidCount = files.length - validCount

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="bg-green-600 text-white p-4 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg font-bold">Bulk Upload — Carica multipli</h2>
          <button onClick={handleClose}><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {!result && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="font-semibold text-blue-900 mb-1">Naming intelligente</div>
              <div className="text-blue-700 text-xs space-y-0.5">
                <div>I file con nome <code className="bg-blue-100 px-1 rounded">TIPO-ANNO-NUM_Titolo.ext</code> vengono parsati automaticamente.</div>
                <div>Esempi: <code className="bg-blue-100 px-1 rounded">OPL-2026-001_Pulizia.pdf</code> · <code className="bg-blue-100 px-1 rounded">SOP-2026-014_Avviamento.docx</code></div>
                <div>Altri nomi → numero progressivo automatico.</div>
              </div>
            </div>
          )}

          {!result && !uploading && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
                accept=".pdf,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.png,.jpg,.jpeg"
              />
              <Upload className="mx-auto mb-2 text-gray-400" size={48} />
              <p className="text-lg font-medium">Trascina qui i tuoi file</p>
              <p className="text-sm text-gray-500">oppure click per selezionarli</p>
              <p className="text-xs text-gray-400 mt-2">PDF, DOCX, XLSX, PPTX, immagini (max 50MB)</p>
            </div>
          )}

          {!result && files.length > 0 && !uploading && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-medium flex justify-between items-center">
                <span>{files.length} file pronti · {(totalSize / 1024 / 1024).toFixed(2)} MB totali</span>
                <span className="flex gap-3">
                  <span className="text-green-600">{validCount} parsati</span>
                  {invalidCount > 0 && <span className="text-orange-600">{invalidCount} manuali</span>}
                  <button onClick={() => setFiles([])} className="text-red-600 hover:underline">Svuota</button>
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="px-3 py-2 border-t flex items-center gap-3 text-sm hover:bg-gray-50">
                    <FileText size={16} className={f.analysis.valid ? 'text-green-600' : 'text-orange-500'} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{f.name}</div>
                      <div className="text-xs text-gray-500 flex gap-2">
                        <span>{(f.size / 1024).toFixed(1)} KB</span>
                        {f.analysis.valid ? (
                          <span className="text-green-600">→ {f.analysis.numero} · {f.analysis.titolo}</span>
                        ) : (
                          <span className="text-orange-600">→ Titolo: "{f.analysis.titolo}" · numero auto</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && !uploading && files.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-sm font-medium mb-1">Autore (opzionale)</label>
                <input
                  value={autore}
                  onChange={(e) => setAutore(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={compress}
                    onChange={(e) => setCompress(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Comprimi automaticamente</span>
                </label>
              </div>
            </div>
          )}

          {uploading && !result && (
            <div className="text-center py-8">
              <div className="text-lg font-medium mb-2">Caricamento in corso...</div>
              <div className="text-sm text-gray-500 mb-4">
                Sto caricando {files.length} file · {(totalSize / 1024 / 1024).toFixed(2)} MB
                {compress && ' · con compressione attiva'}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-green-500 h-4 transition-all duration-300 flex items-center justify-center text-xs text-white font-bold"
                  style={{ width: `${progress}%` }}
                >
                  {progress > 10 && `${progress}%`}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {progress < 100 ? 'Upload + compressione + salvataggio in corso...' : 'Elaborazione finale...'}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <div className="text-lg font-bold text-green-900">Bulk Upload completato!</div>
                <div className="text-sm text-gray-700 mt-2 flex justify-center gap-4">
                  <span>Totale: <strong>{result.totale}</strong></span>
                  <span className="text-green-700">Successo: <strong>{result.successo}</strong></span>
                  {result.fallimenti > 0 && (
                    <span className="text-red-600">Errori: <strong>{result.fallimenti}</strong></span>
                  )}
                </div>
                {result.risparmio_totale_mb > 0 && (
                  <div className="mt-2 text-sm text-blue-700">
                    Risparmio compressione: <strong>{result.risparmio_totale_mb} MB</strong>
                  </div>
                )}
              </div>

              {result.creati && result.creati.length > 0 && (
                <details className="border rounded-lg" open>
                  <summary className="px-3 py-2 bg-green-50 cursor-pointer font-medium text-sm">
                    Nuovi documenti ({result.creati.length})
                  </summary>
                  <div className="max-h-48 overflow-y-auto text-xs">
                    {result.creati.map((d, i) => (
                      <div key={i} className="px-3 py-1.5 border-t flex justify-between">
                        <span>
                          <strong className="text-primary">{d.numero}</strong> — {d.titolo}
                          {!d.auto_parsed && <span className="text-orange-500 ml-1">(titolo manuale)</span>}
                        </span>
                        {d.compressione?.compressed && (
                          <span className="text-green-600">-{d.compressione.saved_pct}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {result.aggiornati && result.aggiornati.length > 0 && (
                <details className="border rounded-lg">
                  <summary className="px-3 py-2 bg-blue-50 cursor-pointer font-medium text-sm">
                    Nuove versioni ({result.aggiornati.length})
                  </summary>
                  <div className="max-h-48 overflow-y-auto text-xs">
                    {result.aggiornati.map((d, i) => (
                      <div key={i} className="px-3 py-1.5 border-t">
                        <strong className="text-primary">{d.numero}</strong> — {d.titolo} → v{d.versione}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {result.errori && result.errori.length > 0 && (
                <details className="border rounded-lg" open>
                  <summary className="px-3 py-2 bg-red-50 cursor-pointer font-medium text-sm text-red-700">
                    Errori ({result.errori.length})
                  </summary>
                  <div className="max-h-48 overflow-y-auto text-xs">
                    {result.errori.map((e, i) => (
                      <div key={i} className="px-3 py-1.5 border-t">
                        <strong>{e.filename}</strong>: <span className="text-red-600">{e.errore}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={handleClose} className="px-4 py-2 border rounded-lg">
              {result ? 'Chiudi' : 'Annulla'}
            </button>
            {!result && (
              <button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? `Carico ${files.length}...` : `Carica ${files.length} file`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
/* Excel preview */
.excel-preview table {
  border-collapse: collapse;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.excel-preview table td,
.excel-preview table th {
  border: 1px solid #d1d5db;
  padding: 4px 8px;
  min-width: 60px;
  white-space: nowrap;
}
.excel-preview table th {
  background-color: #f3f4f6;
  font-weight: 600;
}
