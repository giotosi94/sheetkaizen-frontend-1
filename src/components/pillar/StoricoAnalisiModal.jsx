import { useState, useEffect } from 'react'
import { X, Folder, FolderPlus, FileText, ChevronRight, Home, Edit2, Trash2, MoveRight, RotateCcw, ExternalLink } from 'lucide-react'
import api from '../../services/api'

export default function StoricoAnalisiModal({
  pillar,
  color,
  analyses,
  onClose,
  onOpen,
  onRestore,
  onDelete,
  onReloadAnalyses,
}) {
  const [folders, setFolders] = useState([])
  const [currentFolderId, setCurrentFolderId] = useState(null) // null = root
  const [loading, setLoading] = useState(true)

  // Modali interne
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [movingAnalysis, setMovingAnalysis] = useState(null) // analisi che sto spostando

  useEffect(() => {
    loadFolders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillar._id])

  async function loadFolders() {
    setLoading(true)
    try {
      const res = await api.get(`/pillars/${pillar._id}/folders`)
      setFolders(res.data || [])
    } catch (err) {
      console.error(err)
      alert('Errore caricamento cartelle')
    } finally {
      setLoading(false)
    }
  }

  // Breadcrumb: risali dai parent fino alla root
  function getBreadcrumb() {
    const trail = []
    let cur = folders.find(f => f._id === currentFolderId)
    while (cur) {
      trail.unshift(cur)
      cur = cur.parent_id ? folders.find(f => f._id === cur.parent_id) : null
    }
    return trail
  }

  // Cartelle figlie della corrente
  const subfolders = folders.filter(f => (f.parent_id || null) === currentFolderId)

  // Analisi nella cartella corrente
  const analysesInFolder = analyses.filter(a => (a.folder_id || null) === currentFolderId)

  async function createFolder() {
    const nome = newFolderName.trim()
    if (!nome) return
    try {
      await api.post(`/pillars/${pillar._id}/folders`, {
        nome,
        parent_id: currentFolderId,
      })
      setNewFolderName('')
      setShowNewFolder(false)
      await loadFolders()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function renameFolder() {
    const nome = renameValue.trim()
    if (!nome || !renamingFolder) return
    try {
      await api.put(`/pillars/${pillar._id}/folders/${renamingFolder._id}`, { nome })
      setRenamingFolder(null)
      setRenameValue('')
      await loadFolders()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function deleteFolder(folder) {
    if (!confirm(`Eliminare la cartella "${folder.nome}"?\nLa cartella deve essere vuota.`)) return
    try {
      await api.delete(`/pillars/${pillar._id}/folders/${folder._id}`)
      await loadFolders()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  async function moveAnalysisTo(targetFolderId) {
    if (!movingAnalysis) return
    try {
      await api.put(
        `/pillars/${pillar._id}/analyses/${movingAnalysis.id}/move`,
        { folder_id: targetFolderId }
      )
      setMovingAnalysis(null)
      await onReloadAnalyses()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  const breadcrumb = getBreadcrumb()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-3 border-b flex justify-between items-center sticky top-0 z-10" style={{ backgroundColor: color, color: 'white' }}>
          <h3 className="font-bold">Storico Analisi</h3>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Breadcrumb + azioni */}
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <button
              onClick={() => setCurrentFolderId(null)}
              className="flex items-center gap-1 hover:underline text-gray-700"
            >
              <Home size={14} /> Storico
            </button>
            {breadcrumb.map(f => (
              <span key={f._id} className="flex items-center gap-1">
                <ChevronRight size={14} className="text-gray-400" />
                <button
                  onClick={() => setCurrentFolderId(f._id)}
                  className="hover:underline"
                  style={{ color }}
                >
                  {f.nome}
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => { setNewFolderName(''); setShowNewFolder(true) }}
            className="text-xs px-3 py-1.5 rounded text-white shadow flex items-center gap-1"
            style={{ backgroundColor: color }}
          >
            <FolderPlus size={14} /> Nuova cartella
          </button>
        </div>

        {/* Contenuto */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Caricamento...</div>
          ) : (
            <>
              {/* Form nuova cartella inline */}
              {showNewFolder && (
                <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg" style={{ borderColor: color }}>
                  <FolderPlus size={18} style={{ color }} />
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createFolder()
                      if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') }
                    }}
                    placeholder="Nome cartella (es: 2026, OEE, Bindler)"
                    className="flex-1 border rounded px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={createFolder}
                    className="px-3 py-1.5 text-xs text-white rounded"
                    style={{ backgroundColor: color }}
                  >
                    Crea
                  </button>
                  <button
                    onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
                    className="px-3 py-1.5 text-xs border rounded"
                  >
                    Annulla
                  </button>
                </div>
              )}

              {/* Cartelle */}
              {subfolders.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500 mb-2">
                    Cartelle ({subfolders.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subfolders.map(f => (
                      <div
                        key={f._id}
                        className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <Folder size={20} style={{ color }} className="flex-shrink-0" />
                        {renamingFolder?._id === f._id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameFolder()
                              if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue('') }
                            }}
                            onBlur={renameFolder}
                            className="flex-1 border rounded px-2 py-1 text-sm"
                          />
                        ) : (
                          <button
                            onClick={() => setCurrentFolderId(f._id)}
                            className="flex-1 text-left text-sm font-medium hover:underline"
                          >
                            {f.nome}
                          </button>
                        )}
                        <button
                          onClick={() => { setRenamingFolder(f); setRenameValue(f.nome) }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500"
                          title="Rinomina"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteFolder(f)}
                          className="p-1 hover:bg-red-50 rounded text-red-500"
                          title="Elimina (solo se vuota)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analisi */}
              <div>
                <div className="text-xs font-bold uppercase text-gray-500 mb-2">
                  Analisi ({analysesInFolder.length})
                </div>
                {analysesInFolder.length === 0 ? (
                  <div className="text-sm text-gray-400 italic py-4 text-center border-2 border-dashed rounded-lg">
                    Nessuna analisi in questa cartella.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analysesInFolder.map(a => {
                      const isArchived = a.status === 'archived'
                      return (
                        <div
                          key={a.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg ${isArchived ? 'bg-gray-50' : ''}`}
                        >
                          <FileText size={18} className={isArchived ? 'text-gray-400' : ''} style={!isArchived ? { color } : {}} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${isArchived ? 'text-gray-600' : ''}`}>
                                {a.label}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isArchived ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'
                              }`}>
                                {isArchived ? 'Archiviata' : 'Attiva'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {isArchived && a.archived_at
                                ? `Archiviata il ${new Date(a.archived_at).toLocaleDateString('it-IT')}`
                                : `Creata il ${new Date(a.created_at).toLocaleDateString('it-IT')}`}
                            </div>
                          </div>
                          <button
                            onClick={() => setMovingAnalysis(a)}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 flex items-center gap-1"
                            title="Sposta in cartella"
                          >
                            <MoveRight size={12} /> Sposta
                          </button>
                          <button
                            onClick={() => { onOpen(a.id); onClose() }}
                            className="px-3 py-1 text-xs rounded text-white shadow flex items-center gap-1"
                            style={{ backgroundColor: color }}
                          >
                            <ExternalLink size={12} /> Apri
                          </button>
                          {isArchived && (
                            <button
                              onClick={async () => { await onRestore(a.id); await onReloadAnalyses() }}
                              className="px-2 py-1 text-xs border border-gray-400 text-gray-700 rounded hover:bg-white flex items-center gap-1"
                            >
                              <RotateCcw size={12} /> Ripristina
                            </button>
                          )}
                          <button
                            onClick={async () => { await onDelete(a.id); await onReloadAnalyses() }}
                            className="px-2 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50"
                          >
                            Elimina
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal: sposta analisi in cartella */}
        {movingAnalysis && (
          <MoveAnalysisModal
            pillar={pillar}
            color={color}
            folders={folders}
            analysis={movingAnalysis}
            onCancel={() => setMovingAnalysis(null)}
            onMove={moveAnalysisTo}
          />
        )}
      </div>
    </div>
  )
}


function MoveAnalysisModal({ pillar, color, folders, analysis, onCancel, onMove }) {
  const [selected, setSelected] = useState(analysis.folder_id || null)

  // Costruisci path leggibile per ogni cartella
  const options = [
    { id: null, path: '/ (root)' },
    ...folders.map(f => ({ id: f._id, path: f.path || f.nome }))
  ].sort((a, b) => (a.path || '').localeCompare(b.path || ''))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-3 border-b flex justify-between items-center" style={{ backgroundColor: color, color: 'white' }}>
          <h3 className="font-bold">Sposta analisi</h3>
          <button onClick={onCancel} className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-sm">
            Sposta <strong>{analysis.label}</strong> in:
          </div>
          <select
            value={selected || ''}
            onChange={(e) => setSelected(e.target.value || null)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {options.map(o => (
              <option key={o.id || 'root'} value={o.id || ''}>
                {o.path}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button onClick={onCancel} className="px-4 py-2 border rounded-lg text-sm">
              Annulla
            </button>
            <button
              onClick={() => onMove(selected)}
              className="px-4 py-2 text-white rounded-lg text-sm"
              style={{ backgroundColor: color }}
            >
              Sposta qui
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
