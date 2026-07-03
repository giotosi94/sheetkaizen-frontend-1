function ConfigCompetenzeModal({ pillar, color, competenze, onClose, onSaved }) {
  const [items, setItems] = useState(competenze)

  async function addCompetenza(categoria_id) {
    try {
      const res = await api.post(`/pillars/${pillar._id}/skill-competenze`, {
        label: '',
        codice: '',
        categoria_id,
        ordine: items.length,
      })
      setItems([...items, res.data])
    } catch (err) {
      alert('Errore: ' + err.message)
    }
  }

  // Aggiorna solo lo stato locale, il salvataggio è debounced
  function updateLocalItem(id, updates) {
    setItems(prev => prev.map(i => i._id === id ? { ...i, ...updates } : i))
    scheduleSave(id, updates)
  }

  function scheduleSave(id, updates) {
    const timerKey = `_saveTimer_${id}`
    if (window[timerKey]) clearTimeout(window[timerKey])
    window[timerKey] = setTimeout(async () => {
      try {
        await api.put(`/pillars/${pillar._id}/skill-competenze/${id}`, updates)
      } catch (err) {
        console.error('Errore salvataggio:', err)
      }
    }, 600)
  }

  async function removeCompetenza(id) {
    if (!confirm('Eliminare questa competenza?')) return
    try {
      await api.delete(`/pillars/${pillar._id}/skill-competenze/${id}`)
      setItems(items.filter(i => i._id !== id))
    } catch (err) {
      alert('Errore: ' + err.message)
    }
  }

  function handleClose() {
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-3 border-b flex justify-between items-center sticky top-0 z-10" style={{ backgroundColor: color, color: 'white' }}>
          <h3 className="font-bold">Configura Competenze — {pillar.sigla}</h3>
          <button onClick={handleClose} className="hover:bg-white hover:bg-opacity-20 p-1 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600">
            Aggiungi le competenze specifiche del pillar dentro le 6 categorie standard LPW.
          </div>

          {CATEGORIE.map(cat => {
            const catItems = items.filter(i => i.categoria_id === cat.id)
            return (
              <div key={cat.id} className="border rounded-lg overflow-hidden">
                <div
                  className="px-3 py-2 flex justify-between items-center text-white font-bold text-sm"
                  style={{ backgroundColor: cat.color }}
                >
                  <span>{cat.label}</span>
                  <button
                    onClick={() => addCompetenza(cat.id)}
                    className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Plus size={12} /> Aggiungi
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {catItems.length === 0 ? (
                    <div className="text-xs text-gray-400 italic py-2 text-center">
                      Nessuna competenza in questa categoria
                    </div>
                  ) : (
                    catItems.map(item => (
                      <div key={item._id} className="grid grid-cols-12 gap-2 items-center p-1 hover:bg-gray-50 rounded">
                        <input
                          value={item.codice || ''}
                          onChange={(e) => updateLocalItem(item._id, { codice: e.target.value })}
                          className="col-span-2 border rounded px-2 py-1 text-xs font-mono"
                          placeholder="Codice"
                        />
                        <input
                          value={item.label || ''}
                          onChange={(e) => updateLocalItem(item._id, { label: e.target.value })}
                          className="col-span-5 border rounded px-2 py-1 text-sm"
                          placeholder="Nome competenza"
                        />
                        <select
                          value={item.categoria_id || ''}
                          onChange={(e) => updateLocalItem(item._id, { categoria_id: e.target.value })}
                          className="col-span-3 border rounded px-2 py-1 text-xs"
                          title="Sposta in altra categoria"
                        >
                          {CATEGORIE.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={item.livello_target_default || ''}
                          onChange={(e) => updateLocalItem(item._id, { livello_target_default: e.target.value ? parseInt(e.target.value) : null })}
                          className="col-span-1 border rounded px-2 py-1 text-xs text-center"
                          placeholder="T"
                          title="Target default"
                        />
                        <button
                          onClick={() => removeCompetenza(item._id)}
                          className="col-span-1 text-red-500 hover:bg-red-50 p-1 rounded justify-self-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          <div className="flex justify-end pt-3 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: color }}
            >
              Fatto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
