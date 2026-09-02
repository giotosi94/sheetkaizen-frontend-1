import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Trash2, Upload, X } from 'lucide-react'
import api from '../../services/api'

const formatMb = bytes => `${((bytes || 0) / 1024 / 1024).toFixed(2)} MB`

export default function OplImportModal({ onClose, onImported }) {
  const [files, setFiles] = useState([])
  const [items, setItems] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const fileRef = useRef(null)

  const selected = items[selectedIndex]
  const successCount = useMemo(() => items.filter(item => !item.error).length, [items])
  const importableCount = useMemo(
    () => items.filter(item => !item.error && !item.duplicate && !item.imported && item.numero).length,
    [items],
  )

  const addFiles = fileList => {
    const excelFiles = Array.from(fileList || []).filter(file => /\.(xlsx|xlsm)$/i.test(file.name))
    if (!excelFiles.length) return
    setFiles(current => {
      const merged = [...current]
      excelFiles.forEach(file => {
        if (!merged.some(existing => existing.name === file.name && existing.size === file.size)) {
          merged.push(file)
        }
      })
      return merged.slice(0, 10)
    })
    setItems([])
    setSelectedIndex(0)
  }

  const handleDrop = event => {
    event.preventDefault()
    setDragOver(false)
    addFiles(event.dataTransfer.files)
  }

  const removeFile = index => {
    setFiles(current => current.filter((_, position) => position !== index))
    setItems([])
  }

  const analyze = async () => {
    if (!files.length) return
    setAnalyzing(true)
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      const response = await api.post('/documenti/historical-opl/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      })
      setItems(response.data.items || [])
      setSelectedIndex(0)
    } catch (error) {
      alert('Errore analisi: ' + (error.response?.data?.detail || error.message))
    } finally {
      setAnalyzing(false)
    }
  }

  const updateSelected = (field, value) => {
    setItems(current => current.map((item, index) => index === selectedIndex ? { ...item, [field]: value } : item))
  }

  const importSelected = async () => {
    const payload = items
      .filter(item => !item.error && !item.duplicate && !item.imported && item.numero)
      .map(item => ({
        numero: item.numero,
        numero_originale: item.numero_originale,
        numero_progressivo: item.numero_progressivo,
        titolo: item.titolo,
        reparto: item.reparto,
        linea: item.linea,
        area_opl: item.area_opl,
        tipo_opl: item.tipo_opl,
        data_documento: item.data_documento,
        image_base64: item.image_base64 || item.preview || null,
      }))

    if (!payload.length) {
      alert('Nessuna OPL importabile. Controlla numeri mancanti o duplicati.')
      return
    }

    setImporting(true)
    try {
      const response = await api.post('/documenti/historical-opl/import', { items: payload }, { timeout: 300000 })
      const created = response.data.created || []
      const numbers = new Set(created.map(item => item.numero))
      setItems(current => current.map(item => numbers.has(item.numero) ? { ...item, imported: true } : item))
      alert(`Importate ${created.length} OPL su ${payload.length}.`)
      onImported?.()
    } catch (error) {
      alert('Errore importazione: ' + (error.response?.data?.detail || error.message))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-amber-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Importa OPL</h2>
            <p className="text-xs text-amber-100 mt-1">Legge i dati dall'Excel, salva lo screen incorporato come immagine dell'OPL</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-amber-600">
            <X size={20} />
          </button>
        </div>

        {!items.length ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center overflow-y-auto">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={event => { event.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragOver ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-amber-500 hover:bg-amber-50'
              }`}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xlsm" multiple onChange={event => addFiles(event.target.files)} className="hidden" />
              <Upload className="mx-auto text-gray-400 mb-3" size={44} />
              <p className="font-semibold">Trascina qui le OPL Excel oppure click per selezionarle</p>
              <p className="text-sm text-gray-500 mt-1">Fino a 10 file .xlsx o .xlsm per volta</p>
            </div>

            {files.length > 0 && (
              <div className="w-full max-w-2xl mt-5 border rounded-lg overflow-hidden">
                {files.map((file, index) => (
                  <div key={`${file.name}-${file.size}`} className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3">
                    <FileSpreadsheet size={18} className="text-green-600" />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">{formatMb(file.size)}</span>
                    <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={analyze}
              disabled={!files.length || analyzing}
              className="mt-5 px-6 py-2.5 bg-amber-700 text-white rounded-lg disabled:opacity-50"
            >
              {analyzing ? 'Compressione e analisi in corso...' : `Analizza ${files.length || ''} file`}
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-[300px_1fr]">
            <aside className="border-r bg-gray-50 overflow-y-auto">
              <div className="p-4 border-b text-sm font-medium">
                {successCount} di {items.length} analizzati
              </div>
              {items.map((item, index) => (
                <button
                  type="button"
                  key={`${item.filename}-${index}`}
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full text-left p-4 border-b ${selectedIndex === index ? 'bg-amber-50 border-l-4 border-l-amber-600' : 'hover:bg-white'}`}
                >
                  <div className="flex gap-2 items-start">
                    {item.imported
                      ? <CheckCircle2 size={17} className="text-green-600 mt-0.5" />
                      : item.error || item.duplicate
                        ? <AlertTriangle size={17} className="text-amber-600 mt-0.5" />
                        : <CheckCircle2 size={17} className="text-green-600 mt-0.5" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{item.numero || item.filename}</div>
                      <div className="text-xs text-gray-500 truncate mt-1">{item.titolo || item.error}</div>
                      {item.imported && <div className="text-xs text-green-600 mt-1">Importata</div>}
                      {!item.error && !item.imported && <div className="text-xs text-gray-400 mt-1">Confidenza {item.confidence}%</div>}
                    </div>
                  </div>
                </button>
              ))}
            </aside>

            <main className="overflow-y-auto p-6">
              {selected?.error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-5">{selected.error}</div>
              ) : selected ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-800">Dati riconosciuti</h3>
                        <p className="text-xs text-gray-500">Foglio: {selected.sheet}</p>
                        <p className="text-xs text-gray-500 mt-1">Codice storico: {selected.numero_originale || 'Non rilevato'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selected.confidence >= 85 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {selected.confidence}%
                      </span>
                    </div>

                    <Field label="Numero OPL di sistema" value={selected.numero} onChange={value => updateSelected('numero', value)} />
                    <Field label="Titolo" value={selected.titolo} onChange={value => updateSelected('titolo', value)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Reparto" value={selected.reparto} onChange={value => updateSelected('reparto', value)} />
                      <Field label="Linea" value={selected.linea} onChange={value => updateSelected('linea', value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Area OPL" value={selected.area_opl} onChange={value => updateSelected('area_opl', value)} />
                      <Field label="Tipo OPL" value={selected.tipo_opl} onChange={value => updateSelected('tipo_opl', value)} />
                      <Field label="Data" type="date" value={selected.data_documento} onChange={value => updateSelected('data_documento', value)} />
                    </div>

                    <div className="bg-gray-50 border rounded-lg p-3 text-sm">
                      <div className="font-medium text-gray-700">Compressione</div>
                      <div className="text-gray-600 mt-1">
                        {formatMb(selected.original_size)} → {formatMb(selected.final_size)}
                        {selected.compression_applied ? ` · riduzione ${selected.saved_pct}%` : ' · nessuna riduzione'}
                      </div>
                    </div>

                    {selected.duplicate && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                        La codifica <strong>{selected.numero}</strong> è già presente e non verrà importata.
                      </div>
                    )}

                    {selected.warnings?.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        {selected.warnings.map(warning => <div key={warning}>{warning}</div>)}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Immagine dell'OPL</h3>
                    <div className="border rounded-lg bg-gray-100 min-h-[500px] flex items-center justify-center overflow-auto p-3">
                      {selected.image_base64 || selected.preview ? (
                        <img src={selected.image_base64 || selected.preview} alt={selected.titolo || selected.filename} className="max-w-full h-auto shadow bg-white" />
                      ) : (
                        <div className="text-gray-400 text-sm text-center px-6">Nessuna immagine incorporata trovata nel foglio</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </main>
          </div>
        )}

        <div className="border-t bg-gray-50 px-6 py-3 flex justify-between items-center gap-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Chiudi</button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={importSelected}
              disabled={importing || importableCount === 0}
              className="px-6 py-2 bg-amber-700 text-white rounded-lg disabled:opacity-50"
            >
              {importing ? 'Importazione...' : `Importa ${importableCount} OPL selezionate`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      <input type={type} value={value || ''} onChange={event => onChange(event.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
    </label>
  )
}
