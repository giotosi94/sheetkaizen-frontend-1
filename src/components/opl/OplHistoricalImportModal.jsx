import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react'
import api from '../../services/api'

export default function OplHistoricalImportModal({ onClose }) {
  const [files, setFiles] = useState([])
  const [items, setItems] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const fileRef = useRef(null)

  const selected = items[selectedIndex]
  const successCount = useMemo(() => items.filter(item => !item.error).length, [items])

  const chooseFiles = event => {
    const selectedFiles = Array.from(event.target.files || []).slice(0, 5)
    setFiles(selectedFiles)
    setItems([])
    setSelectedIndex(0)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-amber-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Importa OPL Storiche</h2>
            <p className="text-xs text-amber-100 mt-1">POC amministratore · analisi senza salvataggio</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-amber-600">
            <X size={20} />
          </button>
        </div>

        {!items.length ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full max-w-2xl border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50"
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xlsm" multiple onChange={chooseFiles} className="hidden" />
              <Upload className="mx-auto text-gray-400 mb-3" size={44} />
              <p className="font-semibold">Seleziona fino a 5 OPL Excel</p>
              <p className="text-sm text-gray-500 mt-1">Il sistema individua il foglio OPL, estrae i dati e genera l'anteprima</p>
            </div>

            {files.length > 0 && (
              <div className="w-full max-w-2xl mt-5 border rounded-lg overflow-hidden">
                {files.map(file => (
                  <div key={`${file.name}-${file.size}`} className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3">
                    <FileSpreadsheet size={18} className="text-green-600" />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
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
              {analyzing ? 'Analisi in corso...' : `Analizza ${files.length || ''} file`}
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
                    {item.error ? <AlertTriangle size={17} className="text-red-500 mt-0.5" /> : <CheckCircle2 size={17} className="text-green-600 mt-0.5" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{item.numero || item.filename}</div>
                      <div className="text-xs text-gray-500 truncate mt-1">{item.titolo || item.error}</div>
                      {!item.error && <div className="text-xs text-gray-400 mt-1">Confidenza {item.confidence}%</div>}
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
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-800">Dati riconosciuti</h3>
                        <p className="text-xs text-gray-500">Foglio: {selected.sheet}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selected.confidence >= 90 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {selected.confidence}%
                      </span>
                    </div>

                    <Field label="Numero OPL" value={selected.numero} onChange={value => updateSelected('numero', value)} />
                    <Field label="Titolo" value={selected.titolo} onChange={value => updateSelected('titolo', value)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Reparto" value={selected.reparto} onChange={value => updateSelected('reparto', value)} />
                      <Field label="Linea" value={selected.linea} onChange={value => updateSelected('linea', value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Autore" value={selected.autore} onChange={value => updateSelected('autore', value)} />
                      <Field label="Data" type="date" value={selected.data_documento} onChange={value => updateSelected('data_documento', value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Area OPL" value={selected.area_opl} onChange={value => updateSelected('area_opl', value)} />
                      <Field label="Tipo OPL" value={selected.tipo_opl} onChange={value => updateSelected('tipo_opl', value)} />
                    </div>
                    <Field label="Problema" value={selected.problema} onChange={value => updateSelected('problema', value)} multiline />
                    <Field label="Causa" value={selected.causa} onChange={value => updateSelected('causa', value)} multiline />
                    <Field label="Miglioramento" value={selected.miglioramento} onChange={value => updateSelected('miglioramento', value)} multiline />

                    {selected.warnings?.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        {selected.warnings.map(warning => <div key={warning}>{warning}</div>)}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Anteprima foglio rilevato</h3>
                    <div className="border rounded-lg bg-gray-100 min-h-[500px] flex items-center justify-center overflow-auto p-3">
                      {selected.preview ? (
                        <img src={selected.preview} alt={selected.titolo || selected.filename} className="max-w-full h-auto shadow bg-white" />
                      ) : (
                        <div className="text-gray-400 text-sm">Anteprima non disponibile</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </main>
          </div>
        )}

        <div className="border-t bg-gray-50 px-6 py-3 flex justify-between items-center">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Chiudi</button>
          {items.length > 0 && (
            <div className="text-xs text-gray-500">In questa prima fase i dati non vengono ancora salvati.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, multiline = false, type = 'text' }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {multiline ? (
        <textarea value={value || ''} onChange={event => onChange(event.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
      ) : (
        <input type={type} value={value || ''} onChange={event => onChange(event.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
      )}
    </label>
  )
}
