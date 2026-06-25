import { useState, useEffect } from 'react'
import {
  X, Edit2, Trash2, MessageSquare, Link2, AtSign, CheckSquare, Square,
  Send, Calendar, AlertCircle, Bug, TrendingUp, Shield, Wrench, Paperclip, Camera, FileText, ImageIcon
} from 'lucide-react'
import api from '../services/api'
import { useAllConfigurations } from '../hooks/useConfigurations'
 
const PRIORITA_BG = {
  Lowest: 'bg-gray-100 text-gray-700',
  Low: 'bg-blue-100 text-blue-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
}

const TIPO_ICONS = {
  Task: CheckSquare,
  Bug: Bug,
  Improvement: TrendingUp,
  Audit: Shield,
  Manutenzione: Wrench,
  Sicurezza: AlertCircle,
}

const TIPO_COLORS = {
  Task: 'text-blue-600',
  Bug: 'text-red-600',
  Improvement: 'text-green-600',
  Audit: 'text-purple-600',
  Manutenzione: 'text-orange-600',
  Sicurezza: 'text-yellow-600',
}

// Compressione automatica immagini (max 1280px, qualità 80%)
async function compressImage(file, maxSize = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        // Ridimensiona se più grande di maxSize
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          } else {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        // Converti in JPEG con qualità 80%
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Lettura file generico in base64
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ActionPlanDetailPanel({ plan, onClose, onUpdated, onEdit, onCancel, onRestore, onDelete }) {
  const [detail, setDetail] = useState(plan)
  const [nuovoCommento, setNuovoCommento] = useState('')
  const [nuovoChecklistItem, setNuovoChecklistItem] = useState('')
  const [uploadingAllegato, setUploadingAllegato] = useState(false)
  const [lightboxImg, setLightboxImg] = useState(null)
  const { configs } = useAllConfigurations()
  const statiConfig = configs.stato_ap || []

  // Detection stato terminale (read-only)
  const statoCorrente = statiConfig.find(s => s.label === detail.stato)
  const isLocked = !!(statoCorrente && statoCorrente.is_terminal)

  // Stato a cui tornare quando si riapre (primo stato non-terminal disponibile)
  const statoRiapertura =
    statiConfig.find(s => s.label === 'Aperto' && !s.is_terminal)?.label ||
    statiConfig.find(s => !s.is_terminal)?.label ||
    'Aperto'

  async function riapriAP() {
    if (!confirm(`Riaprire questo Action Plan?\nLo stato tornerà a "${statoRiapertura}".`)) return
    await api.patch(`/action-plans/${plan._id}/stato`, { stato: statoRiapertura })
    reload()
  }

  useEffect(() => {
    api.get(`/action-plans/${plan._id}`).then(res => setDetail(res.data)).catch(() => {})
  }, [plan._id])

  async function reload() {
    const res = await api.get(`/action-plans/${plan._id}`)
    setDetail(res.data)
    onUpdated?.()
  }

  async function addCommento() {
    if (!nuovoCommento.trim()) return
    await api.post(`/action-plans/${plan._id}/commenti`, { testo: nuovoCommento, autore: 'Default User' })
    setNuovoCommento('')
    reload()
  }

  async function addChecklistItem() {
    if (!nuovoChecklistItem.trim()) return
    await api.post(`/action-plans/${plan._id}/checklist`, { testo: nuovoChecklistItem })
    setNuovoChecklistItem('')
    reload()
  }

  async function toggleChecklist(itemId, completato) {
    await api.patch(`/action-plans/${plan._id}/checklist/${itemId}`, { completato })
    reload()
  }

  async function removeChecklist(itemId) {
    await api.delete(`/action-plans/${plan._id}/checklist/${itemId}`)
    reload()
  }

  async function changeStato(stato) {
    await api.patch(`/action-plans/${plan._id}/stato`, { stato })
    reload()
  }

  // ─────────────────────────────────────────────
  // ALLEGATI: upload + delete
  // ─────────────────────────────────────────────
  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadingAllegato(true)
    try {
      for (const file of files) {
        // Verifica limite allegati
        const totaleAttuale = (detail.allegati || []).length
        if (totaleAttuale >= 10) {
          alert('Massimo 10 allegati per Action Plan')
          break
        }

        // Verifica tipo
        const isImage = file.type.startsWith('image/')
        const isPdf = file.type === 'application/pdf'
        const isDoc = file.type.includes('word') || file.type.includes('excel') ||
                      file.type.includes('sheet') || file.type.includes('document')

        if (!isImage && !isPdf && !isDoc) {
          alert(`Tipo file non supportato: ${file.name}\nSupportati: immagini, PDF, Word, Excel`)
          continue
        }

        // Verifica dimensione (2 MB per non-immagini, 10 MB per immagini prima della compressione)
        const maxBytes = isImage ? 10 * 1024 * 1024 : 2 * 1024 * 1024
        if (file.size > maxBytes) {
          alert(`File troppo grande: ${file.name}\nMax: ${isImage ? '10 MB (immagini)' : '2 MB'}`)
          continue
        }

        // Conversione in base64 (con compressione per immagini)
        const base64Data = isImage
          ? await compressImage(file)
          : await fileToBase64(file)

        // Stima dimensione finale (base64 ~33% in più del binario)
        const dimensioneFinale = Math.round((base64Data.length * 3) / 4)

        await api.post(`/action-plans/${plan._id}/allegati`, {
          nome: file.name,
          tipo: file.type,
          dimensione: dimensioneFinale,
          data: base64Data,
          autore: 'Default User',
        })
      }
      reload()
    } catch (err) {
      console.error(err)
      alert('Errore upload: ' + (err.response?.data?.detail || err.message))
    } finally {
      setUploadingAllegato(false)
      // Reset input file
      e.target.value = ''
    }
  }

  async function removeAllegato(allegatoId, nome) {
    if (!confirm(`Eliminare l'allegato "${nome}"?`)) return
    try {
      await api.delete(`/action-plans/${plan._id}/allegati/${allegatoId}`)
      reload()
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message))
    }
  }

  const TipoIcon = TIPO_ICONS[detail.tipo] || CheckSquare
  const checklistCompletati = detail.checklist?.filter(c => c.completato).length || 0
  const checklistTotali = detail.checklist?.length || 0
  const checklistPercent = checklistTotali ? Math.round((checklistCompletati / checklistTotali) * 100) : 0
  const allegati = detail.allegati || []
  const immagini = allegati.filter(a => a.tipo?.startsWith('image/'))
  const documenti = allegati.filter(a => !a.tipo?.startsWith('image/'))

  return (
    <Modal onClose={onClose}>
      <div className="grid grid-cols-3 gap-0 h-[85vh]">
        {/* COLONNA SX */}
        <div className="col-span-2 overflow-y-auto border-r">
          <div className="bg-gradient-to-r from-primary to-primary-light text-white p-4">
            <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
              <TipoIcon size={16} />
              <span>{detail.tipo}</span>
              <span>·</span>
              <span className="font-mono">{detail.numero}</span>
            </div>
            <h2 className="text-xl font-bold">{detail.titolo}</h2>
          </div>

          {isLocked && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm text-yellow-900">
                <strong>Action Plan chiuso</strong> — read-only. Per modificarlo riaprilo.
              </div>
              <button
                onClick={riapriAP}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap"
              >
                Riapri
              </button>
            </div>
          )}

          <div className="p-6 space-y-6">
            <Section title="Descrizione">
              {detail.descrizione ? (
                <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                  {renderWithMentionsTags(detail.descrizione)}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">Nessuna descrizione</div>
              )}
            </Section>

            {(detail.tags?.length > 0 || detail.mentions?.length > 0) && (
              <Section title="Tags & Mentions">
                <div className="flex flex-wrap gap-2">
                  {detail.tags?.map(t => (
                    <span key={t} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">#{t}</span>
                  ))}
                  {detail.mentions?.map(m => (
                    <span key={m} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1">
                      <AtSign size={10} />{m}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            <Section title={`Checklist ${checklistTotali > 0 ? `(${checklistCompletati}/${checklistTotali})` : ''}`}>
              {checklistTotali > 0 && (
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${checklistPercent}%` }} />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {(detail.checklist || []).map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleChecklist(item.id, !item.completato)}
                      disabled={isLocked}
                      className={isLocked ? 'cursor-not-allowed' : ''}
                    >
                      {item.completato ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} className="text-gray-400" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.completato ? 'line-through text-gray-400' : ''}`}>{item.testo}</span>
                    {!isLocked && (
                      <button onClick={() => removeChecklist(item.id)} className="opacity-0 group-hover:opacity-100 text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!isLocked && (
                <div className="flex gap-2 mt-2">
                  <input value={nuovoChecklistItem} onChange={(e) => setNuovoChecklistItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                    placeholder="Aggiungi item..." className="flex-1 border rounded px-3 py-1.5 text-sm" />
                  <button onClick={addChecklistItem} className="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300">+ Item</button>
                </div>
              )}
            </Section>

            {/* 🆕 ALLEGATI */}
            <Section title={`Allegati ${allegati.length > 0 ? `(${allegati.length}/10)` : ''}`}>
              {/* Immagini in griglia */}
              {immagini.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {immagini.map(img => (
                    <div key={img.id} className="relative group">
                      {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                      <img
                        src={img.data}
                        alt={img.nome}
                        className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                        onClick={() => setLightboxImg(img)}
                      />
                      <button
                        {!isLocked && (
                        <button
                          onClick={() => removeAllegato(img.id, img.nome)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Documenti come lista */}
              {documenti.length > 0 && (
                <div className="space-y-1 mb-3">
                  {documenti.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm group">
                      <FileText size={16} className="text-gray-500 flex-shrink-0" />
                      <a
                        href={doc.data}
                        download={doc.nome}
                        className="flex-1 truncate text-blue-600 hover:underline"
                      >
                        {doc.nome}
                      </a>
                      <span className="text-xs text-gray-400">
                        {(doc.dimensione / 1024).toFixed(0)} KB
                      </span>
                      <button
                        {!isLocked && (
                        <button
                          onClick={() => removeAllegato(doc.id, doc.nome)}
                          className="opacity-0 group-hover:opacity-100 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Bottoni upload */}
              {allegati.length < 10 && !isLocked && (
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
                    <Paperclip size={16} />
                    {uploadingAllegato ? 'Caricamento...' : 'Aggiungi file'}
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      disabled={uploadingAllegato}
                      className="hidden"
                    />
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 text-sm text-blue-600">
                    <Camera size={16} />
                    Foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      disabled={uploadingAllegato}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {allegati.length === 0 && !uploadingAllegato && (
                <div className="text-xs text-gray-400 italic mt-1">
                </div>
              )}
            </Section>

            <Section title={`Commenti (${detail.commenti?.length || 0})`}>
              <div className="space-y-3 mb-3">
                {(detail.commenti || []).slice().reverse().map(c => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar name={c.autore} size={32} />
                    <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <strong className="text-sm">{c.autore}</strong>
                        <span className="text-xs text-gray-400">{new Date(c.timestamp).toLocaleString('it-IT')}</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{renderWithMentionsTags(c.testo)}</div>
                    </div>
                  </div>
                ))}
                {(!detail.commenti || detail.commenti.length === 0) && (
                  <div className="text-sm text-gray-400 italic">Nessun commento</div>
                )}
              </div>
              <div className="flex gap-2">
                {!isLocked && (
                <div className="flex gap-2">
                  <textarea value={nuovoCommento} onChange={(e) => setNuovoCommento(e.target.value)}
                    placeholder="Scrivi un commento"
                    rows={2} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addCommento} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light self-end">
                    <Send size={16} />
                  </button>
                </div>
              )}
            </Section>
          </div>
        </div>

        {/* COLONNA DX (invariata) */}
        <div className="overflow-y-auto bg-gray-50 p-4 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <span className="text-sm font-medium">Dettagli</span>
            <div className="flex gap-1">
              {!isLocked && !detail.is_cancelled && onCancel && (
                <button onClick={() => onCancel(detail)} className="p-1.5 hover:bg-orange-100 rounded text-orange-600" title="Annulla">
                  <AlertCircle size={14} />
                </button>
              )}
              {!isLocked && detail.is_cancelled && onRestore && (
                <button onClick={() => onRestore(detail)} className="p-1.5 hover:bg-green-100 rounded text-green-600" title="Ripristina">
                  ↺
                </button>
              )}
              {!isLocked && onDelete && (
                <button onClick={() => onDelete(detail._id)} className="p-1.5 hover:bg-red-100 rounded text-red-600" title="Elimina">
                  <Trash2 size={14} />
                </button>
              )}
              {!isLocked && onEdit && (
                <button onClick={() => onEdit(detail)} className="p-1.5 hover:bg-gray-200 rounded" title="Modifica">
                  <Edit2 size={14} />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded" title="Chiudi">
                <X size={14} />
              </button>
            </div>
          </div>

          {detail.is_cancelled && (
            <div className="bg-red-100 border border-red-300 rounded p-2 text-xs">
              <div className="font-bold text-red-800 mb-1">Action Plan annullato</div>
              {detail.cancelled_reason && <div className="text-red-700 italic">"{detail.cancelled_reason}"</div>}
              {detail.cancelled_at && (
                <div className="text-red-600 mt-1">
                  {new Date(detail.cancelled_at).toLocaleDateString('it-IT')}
                  {detail.cancelled_by && ` da ${detail.cancelled_by}`}
                </div>
              )}
            </div>
          )}

          <SidebarRow label="Stato">
            <select value={detail.stato || ''} onChange={(e) => changeStato(e.target.value)}
              className="text-xs px-2 py-1 rounded border bg-gray-100 text-gray-700 border-gray-300">
              {statiConfig.length === 0 ? (
                <option value={detail.stato || ''}>{detail.stato || 'Configura stati'}</option>
              ) : (
                statiConfig.map(s => (
                  <option key={s._id} value={s.label}>{s.label}</option>
                ))
              )}
            </select>
          </SidebarRow>

          <SidebarRow label="Priorità">
            <span className={`px-2 py-0.5 rounded text-xs ${PRIORITA_BG[detail.priorita] || ''}`}>
              {detail.priorita || '—'}
            </span>
          </SidebarRow>

          {detail.tipo && (
            <SidebarRow label="Tipo">
              <span className={`text-xs flex items-center gap-1 ${TIPO_COLORS[detail.tipo] || ''}`}>
                <TipoIcon size={12} /> {detail.tipo}
              </span>
            </SidebarRow>
          )}

          <SidebarRow label="Responsabile">
            {detail.responsabile ? (
              <div className="flex items-center gap-1">
                <Avatar name={detail.responsabile} size={20} />
                <span className="text-xs">{detail.responsabile}</span>
              </div>
            ) : <span className="text-xs text-gray-400">—</span>}
          </SidebarRow>

          <SidebarRow label="Reporter">
            <span className="text-xs">{detail.reporter || '—'}</span>
          </SidebarRow>

          <SidebarRow label="Scadenza">
            <span className={`text-xs ${detail.stato_visuale === 'In Ritardo' ? 'text-red-600 font-bold' : ''}`}>
              {detail.data_scadenza ? new Date(detail.data_scadenza).toLocaleDateString('it-IT') : '—'}
            </span>
          </SidebarRow>

          <SidebarRow label="Categoria Perdita">
            <span className="text-xs">{detail.categoria_perdita || detail.tipo_perdita || '—'}</span>
          </SidebarRow>

          {detail.parent_type && detail.parent_type !== 'standalone' && (
            <SidebarRow label="Collegato a">
              <div className="text-xs text-right">
                <span className={`px-2 py-0.5 rounded ${
                  detail.parent_type === 'pillar' ? 'bg-indigo-100 text-indigo-700' :
                  detail.parent_type === 'kaizen' ? 'bg-emerald-100 text-emerald-700' :
                  detail.parent_type === 'dashboard' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {detail.parent_type === 'pillar' && 'Pillar'}
                  {detail.parent_type === 'kaizen' && 'Kaizen'}
                  {detail.parent_type === 'dashboard' && 'Dashboard'}
                  {detail.parent_label && ` · ${detail.parent_label}`}
                </span>
              </div>
            </SidebarRow>
          )}

          {detail.pillar_id && detail.parent_type !== 'pillar' && (
            <SidebarRow label="Pillar">
              <span className="text-xs text-gray-600">{detail.pillar_id.slice(0, 8)}...</span>
            </SidebarRow>
          )}

          {(detail.reparto || detail.linea || detail.macchina) && (
            <SidebarRow label="Location">
              <div className="text-xs text-right">
                {detail.reparto && <div>{detail.reparto}</div>}
                {detail.linea && <div>{detail.linea}</div>}
                {detail.macchina && <div>{detail.macchina}</div>}
              </div>
            </SidebarRow>
          )}

          {detail.links?.length > 0 && (
            <SidebarRow label={`Links (${detail.links.length})`}>
              <div className="text-xs space-y-1">
                {detail.links.map((l, i) => (
                  <div key={i} className="bg-white px-2 py-1 rounded border">
                    <span className="text-gray-500">{l.entity_type}:</span> {l.entity_label || l.entity_id}
                  </div>
                ))}
              </div>
            </SidebarRow>
          )}

          <div className="pt-3 border-t">
            <div className="text-xs font-medium mb-2">Attività</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(detail.feed || []).slice().reverse().slice(0, 20).map((f, i) => (
                <div key={i} className="text-xs border-l-2 border-primary pl-2">
                  <div className="text-gray-500">{new Date(f.timestamp).toLocaleString('it-IT')}</div>
                  <div><strong>{f.utente}</strong> · {f.azione}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox per immagini */}
      {lightboxImg && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full"
          >
            <X size={24} />
          </button>
          {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
          <img
            src={lightboxImg.data}
            alt={lightboxImg.nome}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded text-sm">
            {lightboxImg.nome}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Avatar({ name, size = 24 }) {
  if (!name) return null
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500', 'bg-orange-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.45 }}
      className={`${color} text-white rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      title={name}>
      {initials}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-bold mb-2">{title}</h3>
      {children}
    </div>
  )
}

function SidebarRow({ label, children }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600 text-xs uppercase">{label}</span>
      <div>{children}</div>
    </div>
  )
}

function renderWithMentionsTags(text) {
  if (!text) return null
  const parts = text.split(/(@[a-zA-Z0-9._-]+|#[a-zA-Z0-9_-]+)/g)
  return parts.map((p, i) => {
    if (p.startsWith('@')) return <span key={i} className="text-blue-600 font-medium">{p}</span>
    if (p.startsWith('#')) return <span key={i} className="text-purple-600 font-medium">{p}</span>
    return p
  })
}
