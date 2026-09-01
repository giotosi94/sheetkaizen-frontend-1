import { useEffect, useMemo, useState } from 'react'
import { Send, X } from 'lucide-react'
import api from '../services/api'

export default function OplPublishModal({ documento, onClose, onPublished }) {
  const [reparti, setReparti] = useState([])
  const [repartiSelezionati, setRepartiSelezionati] = useState([])
  const [lineeSelezionate, setLineeSelezionate] = useState([])
  const [scadenza, setScadenza] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/reparti/')
      .then(response => setReparti((response.data || []).filter(reparto => reparto.attivo !== false)))
      .catch(error => {
        console.error(error)
        setReparti([])
      })
      .finally(() => setLoading(false))
  }, [])

  const lineeDisponibili = useMemo(() => {
    return reparti
      .filter(reparto => repartiSelezionati.includes(reparto.nome))
      .flatMap(reparto =>
        (reparto.linee || [])
          .filter(linea => linea.attivo !== false)
          .map(linea => ({
            id: `${reparto.nome}::${linea.nome}`,
            reparto: reparto.nome,
            nome: linea.nome,
          }))
      )
  }, [reparti, repartiSelezionati])

  const toggleReparto = repartoNome => {
    setRepartiSelezionati(current => {
      const selected = current.includes(repartoNome)
      const next = selected
        ? current.filter(nome => nome !== repartoNome)
        : [...current, repartoNome]

      if (selected) {
        const lineeDelReparto = new Set(
          lineeDisponibili
            .filter(linea => linea.reparto === repartoNome)
            .map(linea => linea.nome)
        )
        setLineeSelezionate(currentLinee =>
          currentLinee.filter(nome => !lineeDelReparto.has(nome))
        )
      }

      return next
    })
  }

  const toggleLinea = lineaNome => {
    setLineeSelezionate(current =>
      current.includes(lineaNome)
        ? current.filter(nome => nome !== lineaNome)
        : [...current, lineaNome]
    )
  }

  const pubblica = async () => {
    if (repartiSelezionati.length === 0) {
      alert('Seleziona almeno un reparto')
      return
    }

    if (!scadenza) {
      alert('Inserisci la scadenza di lettura')
      return
    }

    setPublishing(true)

    try {
      const response = await api.post(`/opl-letture/${documento._id}/pubblica`, {
        user_ids: [],
        reparti: repartiSelezionati,
        linee: lineeSelezionate,
        macchine: [],
        ruoli: [],
        scadenza: new Date(`${scadenza}T23:59:59`).toISOString(),
      })

      alert(
        `OPL pubblicata. Assegnazioni create: ${response.data?.assegnazioni_create || 0}`
      )
      onPublished?.()
      onClose()
    } catch (error) {
      alert(
        'Errore pubblicazione: ' +
        (error.response?.data?.detail || error.message)
      )
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="bg-primary text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Pubblica e assegna</h2>
            <p className="text-xs text-white text-opacity-80 mt-1">
              {documento.numero} · {documento.titolo} · v{documento.versione || 1}
            </p>
          </div>

          <button type="button" onClick={onClose} disabled={publishing}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Reparti destinatari *
              </label>
              <span className="text-xs text-gray-500">
                {repartiSelezionati.length} selezionati
              </span>
            </div>

            {loading ? (
              <div className="text-sm text-gray-400 py-4">Caricamento reparti...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {reparti.map(reparto => (
                  <label
                    key={reparto._id || reparto.nome}
                    className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 cursor-pointer ${
                      repartiSelezionati.includes(reparto.nome)
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={repartiSelezionati.includes(reparto.nome)}
                      onChange={() => toggleReparto(reparto.nome)}
                    />
                    <span className="text-sm font-medium">{reparto.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {repartiSelezionati.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Linee
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Opzionale. Nessuna linea selezionata significa tutti gli utenti dei reparti scelti.
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {lineeSelezionate.length} selezionate
                </span>
              </div>

              <div className="space-y-3">
                {repartiSelezionati.map(repartoNome => {
                  const lineeReparto = lineeDisponibili.filter(
                    linea => linea.reparto === repartoNome
                  )

                  if (lineeReparto.length === 0) return null

                  return (
                    <div key={repartoNome} className="border rounded-lg p-3">
                      <div className="text-xs font-bold text-gray-600 uppercase mb-2">
                        {repartoNome}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lineeReparto.map(linea => (
                          <label
                            key={linea.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer text-xs ${
                              lineeSelezionate.includes(linea.nome)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-gray-600 border-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={lineeSelezionate.includes(linea.nome)}
                              onChange={() => toggleLinea(linea.nome)}
                              className="hidden"
                            />
                            {linea.nome}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Scadenza lettura *
            </label>
            <input
              type="date"
              value={scadenza}
              onChange={event => setScadenza(event.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="bg-gray-50 border-t px-5 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={pubblica}
            disabled={publishing || loading}
            className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={16} />
            {publishing ? 'Pubblicazione...' : 'Pubblica e assegna'}
          </button>
        </div>
      </div>
    </div>
  )
}
