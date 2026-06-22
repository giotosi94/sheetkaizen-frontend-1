import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import { Save, ChevronDown, X, History, RefreshCw } from 'lucide-react'
import ActionPlanFormShared from '../components/ActionPlanFormShared'

const LIVELLI = ['Quick', 'Standard', 'Major']

const livelloConfig = {
  Quick: { icon: '⚡', color: '#10b981', label: 'Quick Kaizen', desc: 'Risoluzione rapida' },
  Standard: { icon: '📊', color: '#3b82f6', label: 'Standard Kaizen', desc: 'Progetto strutturato' },
  Major: { icon: '🏆', color: '#8b5cf6', label: 'Major Kaizen', desc: 'Iniziativa Pillar' },
}

function getLivelloFromKaizen(kaizen) {
  if (!kaizen) return 'Quick'
  if (kaizen.livello && LIVELLI.includes(kaizen.livello)) return kaizen.livello
  if (kaizen.tipo?.includes('Quick')) return 'Quick'
  if (kaizen.tipo?.includes('Standard')) return 'Standard'
  if (kaizen.tipo?.includes('Major')) return 'Major'
  return 'Quick'
}

function buildTabsForLivello(livello) {
  const base = []
  if (livello === 'Major') {
    base.push({ id: 'step5kpi', label: '🎯 5 Step KPI' })
  }
  base.push({
    id: 'quickkaizen',
    label: livello === 'Quick' ? 'Quick Kaizen' : '🔍 Problem Solving',
  })
  base.push({ id: 'azioni', label: '📋 Azioni' })
  if (livello !== 'Quick') {
    base.push({ id: 'figli', label: '⚡ Quick Kaizen' })
    base.push({ id: 'stdelements', label: '📊 8 Standard Elements' })
    base.push({ id: 'cmladder', label: '🏔️ Countermeasure Ladder' })
    base.push({ id: 'gantt', label: '📅 Gantt' })
  }
  if (livello === 'Major') {
    base.push({ id: 'costbenefit', label: '💰 Cost & Benefit' })
  }
  base.push({ id: 'lavagna', label: 'Lavagna' })
  base.push({ id: 'feed', label: 'Feed' })
  return base
}

export default function KaizenDetailPage() {
  const { id } = useParams()
  const [kaizen, setKaizen] = useState(null)
  const [activeTab, setActiveTab] = useState('quickkaizen')
  const [saving, setSaving] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showTransformModal, setShowTransformModal] = useState(false)
  const [targetLivello, setTargetLivello] = useState(null)
  const [motivoTrasforma, setMotivoTrasforma] = useState('')
  const [showStoria, setShowStoria] = useState(false)
  const [transforming, setTransforming] = useState(false)

  useEffect(() => { loadKaizen() }, [id])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.transform-dropdown')) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const livelloAttuale = getLivelloFromKaizen(kaizen)
  const indiceLivello = LIVELLI.indexOf(livelloAttuale)
  const tabs = buildTabsForLivello(livelloAttuale)

  useEffect(() => {
    if (kaizen && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id || 'quickkaizen')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livelloAttuale])

  const loadKaizen = async () => {
    try {
      const res = await api.get(`/kaizens/${id}`)
      setKaizen(res.data)
    } catch (err) { console.error(err) }
  }

  const saveKaizen = async () => {
    setSaving(true)
    try {
      await api.put(`/kaizens/${id}`, kaizen)
      alert('Kaizen salvato!')
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const updateField = (section, field, value) => {
    setKaizen(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }))
  }

  const openTransformModal = (livello) => {
    setTargetLivello(livello)
    setMotivoTrasforma('')
    setShowDropdown(false)
    setShowTransformModal(true)
  }

  const confirmTransform = async () => {
    if (!targetLivello) return
    setTransforming(true)
    try {
      await api.patch(`/kaizens/${id}/change-methodology`, {
        nuovo_livello: targetLivello,
        motivo: motivoTrasforma || `Trasformato in ${targetLivello}`,
      })
      await loadKaizen()
      setShowTransformModal(false)
      setTargetLivello(null)
      setMotivoTrasforma('')
      alert(`✅ Kaizen trasformato in ${targetLivello}!`)
    } catch (err) {
      console.error(err)
      alert('❌ Errore trasformazione: ' + (err.response?.data?.detail || err.message))
    } finally {
      setTransforming(false)
    }
  }

  if (!kaizen) return <div className="text-center py-8">Caricamento...</div>

  return (
    <div>
      <div className="bg-primary text-white rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-2xl font-bold">{kaizen.titolo || 'Kaizen'}</h1>
            <div className="flex gap-4 mt-2 text-sm text-gray-200 flex-wrap">
              <span>📋 {kaizen.numero}</span>
              <span>📊 {kaizen.stato}</span>
              <span>👤 {kaizen.creatore_nome}</span>
              {kaizen.reparto && <span>🏭 {kaizen.reparto}</span>}
              {kaizen.linea && <span>📍 {kaizen.linea}</span>}
              {kaizen.macchina && <span>⚙️ {kaizen.macchina}</span>}
            </div>
          </div>
          <button onClick={saveKaizen} disabled={saving}
            className="bg-white text-primary px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100">
            <Save size={18} /> {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>

        <div className="bg-white bg-opacity-10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-200 uppercase tracking-wider">Livello Kaizen</span>
            <span className="text-xs text-gray-200">{indiceLivello + 1}/3</span>
          </div>

          <div className="flex items-center gap-2">
            {LIVELLI.map((lvl, idx) => {
              const isActive = idx === indiceLivello
              const isCompleted = idx < indiceLivello
              const isFuture = idx > indiceLivello
              const cfg = livelloConfig[lvl]
              return (
                <div key={lvl} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${
                        isActive ? 'bg-white shadow-lg scale-110 ring-4 ring-white ring-opacity-30' :
                        isCompleted ? 'bg-white bg-opacity-90' :
                        'bg-white bg-opacity-20'
                      }`}
                    >
                      {cfg.icon}
                    </div>
                    <div className={`text-xs mt-1 font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {cfg.label}
                    </div>
                    {isActive && (<div className="text-xs text-yellow-300 font-bold mt-0.5">ATTUALE</div>)}
                    {isFuture && (<div className="text-xs text-gray-400 mt-0.5">🔒 Bloccato</div>)}
                  </div>
                  {idx < LIVELLI.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${idx < indiceLivello ? 'bg-white bg-opacity-90' : 'bg-white bg-opacity-20'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="relative transform-dropdown">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="bg-white border-2 border-primary text-primary px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary hover:text-white transition-colors shadow-sm"
          >
            <RefreshCw size={16} />
            <span className="font-medium">Trasforma in...</span>
            <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-xl z-50 min-w-[260px] overflow-hidden">
              {LIVELLI.map(lvl => {
                const cfg = livelloConfig[lvl]
                const isCurrent = lvl === livelloAttuale
                return (
                  <button
                    key={lvl}
                    onClick={() => !isCurrent && openTransformModal(lvl)}
                    disabled={isCurrent}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
                      isCurrent ? 'bg-gray-50 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'
                    } transition-colors border-b last:border-b-0`}
                  >
                    <span className="text-2xl">{cfg.icon}</span>
                    <div className="flex-1">
                      <div className={`font-semibold ${isCurrent ? 'text-gray-400' : 'text-gray-800'}`}>{cfg.label}</div>
                      <div className={`text-xs ${isCurrent ? 'text-gray-400' : 'text-gray-500'}`}>{cfg.desc}</div>
                    </div>
                    {isCurrent && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-medium">✓ ATTUALE</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {kaizen.livello_storia && kaizen.livello_storia.length > 0 && (
          <button onClick={() => setShowStoria(!showStoria)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors">
            <History size={16} />
            <span>Storia metodologie ({kaizen.livello_storia.length})</span>
            <ChevronDown size={14} className={`transition-transform ${showStoria ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {showStoria && kaizen.livello_storia && (
        <div className="bg-white rounded-xl shadow p-4 mb-6 border-l-4 border-primary">
          <h3 className="font-bold mb-3 flex items-center gap-2"><History size={16} /> Storia metodologie</h3>
          <div className="space-y-2">
            {[...kaizen.livello_storia].reverse().map((entry, i) => {
              const cfg = livelloConfig[entry.livello]
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="text-2xl flex-shrink-0">{cfg?.icon || '📋'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <strong>{entry.livello}</strong>
                      {entry.livello_precedente && (<span className="text-gray-500"> (da {entry.livello_precedente})</span>)}
                    </div>
                    {entry.motivo && (<div className="text-xs text-gray-600 italic mt-0.5">"{entry.motivo}"</div>)}
                    <div className="text-xs text-gray-400 mt-0.5">{new Date(entry.quando).toLocaleString('it-IT')} · {entry.utente}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showTransformModal && targetLivello && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="text-white px-6 py-4 rounded-t-xl flex justify-between items-center" style={{ backgroundColor: livelloConfig[targetLivello]?.color || '#3b82f6' }}>
              <h2 className="text-lg font-bold flex items-center gap-2"><RefreshCw size={20} /> Trasforma in {targetLivello}</h2>
              <button onClick={() => setShowTransformModal(false)} className="hover:bg-white hover:bg-opacity-20 p-1 rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-3 bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl">{livelloConfig[livelloAttuale]?.icon}</div>
                  <div className="text-xs text-gray-600 mt-1">{livelloAttuale}</div>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-center">
                  <div className="text-3xl">{livelloConfig[targetLivello]?.icon}</div>
                  <div className="text-xs font-bold mt-1" style={{ color: livelloConfig[targetLivello]?.color }}>{targetLivello}</div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <strong className="text-blue-700">ℹ️ {livelloConfig[targetLivello]?.label}</strong>
                <p className="text-blue-600 text-xs mt-1">{livelloConfig[targetLivello]?.desc}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motivo della trasformazione <span className="text-gray-400 font-normal ml-1">(opzionale ma consigliato)</span></label>
                <textarea value={motivoTrasforma} onChange={(e) => setMotivoTrasforma(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Es: Problema più complesso del previsto, richiede team inter-funzionale" autoFocus />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <button onClick={() => setShowTransformModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50" disabled={transforming}>Annulla</button>
                <button onClick={confirmTransform} disabled={transforming} className="px-6 py-2 text-white rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: livelloConfig[targetLivello]?.color || '#3b82f6' }}>
                  {transforming ? '⏳ Trasformazione...' : '✨ Conferma trasformazione'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'quickkaizen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">PASSO 1 - DEFINIZIONE DEL PROBLEMA</h3>
            {['che_cosa', 'dove', 'quando', 'chi', 'quale', 'come'].map(field => (
              <div key={field} className="mb-3">
                <label className="block text-sm font-bold text-gray-600 uppercase mb-1">{field.replace('_', ' ')}?</label>
                <textarea value={kaizen.passo1_definizione?.[field] || ''}
                  onChange={(e) => updateField('passo1_definizione', field, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Opzionale" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">PASSO 2 - CAUSE PROBABILI</h3>
            <p className="text-sm text-gray-500 mb-3">Diagramma Ishikawa (6M)</p>
            {['people', 'environment', 'material', 'measurement', 'methods', 'machine'].map(cat => (
              <div key={cat} className="mb-3">
                <label className="block text-sm font-bold text-gray-600 capitalize mb-1">{cat}</label>
                <input value={kaizen.passo2_cause_probabili?.[cat]?.join(', ') || ''}
                  onChange={(e) => updateField('passo2_cause_probabili', cat, e.target.value.split(', '))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Separare con virgola" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">PASSO 3 - CAUSA RADICE</h3>
            <p className="text-sm text-gray-500 mb-3">Analisi 5 Why</p>
            <div className="mb-3">
              <label className="block text-sm font-bold mb-1">Causa Probabile</label>
              <input value={kaizen.passo3_causa_radice?.causa_probabile || ''}
                onChange={(e) => updateField('passo3_causa_radice', 'causa_probabile', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-bold mb-1">Causa Radice Finale</label>
              <textarea value={kaizen.passo3_causa_radice?.causa_radice_finale || ''}
                onChange={(e) => updateField('passo3_causa_radice', 'causa_radice_finale', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">VERIFICA DEL PROCESSO</h3>
            {[
              { key: 'condizioni_base_rispettate', label: 'Le condizioni di base sono rispettate (5S, Pulizia e lubrificazione)?' },
              { key: 'conoscenza_macchina_processo', label: 'Le persone dimostrano conoscenza di macchina e processo?' },
              { key: 'standard_esistenti', label: 'Esistono standard legati al problema (OPL, SOP)?' },
              { key: 'standard_chiari', label: 'Gli standard sono chiari e comprensibili?' },
              { key: 'standard_applicati', label: 'Gli standard sono applicati correttamente?' },
              { key: 'persone_conoscono_standard', label: 'Le persone conoscono gli standard?' },
            ].map(item => (
              <div key={item.key} className="mb-3 pb-3 border-b last:border-0">
                <p className="text-sm font-medium mb-1">{item.label}</p>
                <div className="flex gap-2 mb-1">
                  {['Si', 'No', 'N/A'].map(v => (
                    <button key={v} onClick={() => updateField('verifica_processo', item.key, { ...kaizen.verifica_processo?.[item.key], valore: v })}
                      className={`px-3 py-1 rounded text-xs font-medium border ${
                        kaizen.verifica_processo?.[item.key]?.valore === v ? 'bg-primary text-white' : 'bg-white text-gray-600'
                      }`}>{v}</button>
                  ))}
                </div>
                <input placeholder="Osservazioni" value={kaizen.verifica_processo?.[item.key]?.osservazioni || ''}
                  onChange={(e) => updateField('verifica_processo', item.key, { ...kaizen.verifica_processo?.[item.key], osservazioni: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-xs" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">FASE 5 - VALUTAZIONE EFFICACIA</h3>
            <textarea value={kaizen.fase5_valutazione_efficacia?.osservazioni || ''}
              onChange={(e) => updateField('fase5_valutazione_efficacia', 'osservazioni', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" rows={4} placeholder="Osservazioni" />
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">FASE 6 - STANDARDIZZAZIONE E REPLICA</h3>
            <textarea value={kaizen.fase6_standardizzazione?.osservazioni || ''}
              onChange={(e) => updateField('fase6_standardizzazione', 'osservazioni', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" rows={4} placeholder="Osservazioni" />
          </div>
        </div>
      )} 
{activeTab === 'azioni' && (
        <AzioniTab kaizenId={id} kaizenNumero={kaizen.numero} onUpdate={loadKaizen} />
      )}

      {activeTab === 'figli' && (
        <FigliTab
          kaizenId={id}
          kaizenNumero={kaizen.numero}
          kaizenLivello={livelloAttuale}
          kaizenReparto={kaizen.reparto}
          kaizenLinea={kaizen.linea}
          onUpdate={loadKaizen}
        />
      )}

      {activeTab === 'step5kpi' && (
        <PlaceholderTab icon="🎯" title="5 Step KPI Management" subtitle="Metodologia ufficiale Lindt FI Pillar"
          steps={[
            { num: 1, label: 'KPI / KMI Definition', desc: 'Definizione KPI principale e indicatori secondari' },
            { num: 2, label: 'Pareto Analysis & Loss Identification', desc: 'Analisi Pareto delle perdite per prioritizzare' },
            { num: 3, label: 'Target Definition + Project Assignment', desc: 'Target SMART e assegnazione team/pillar' },
            { num: 4, label: 'Project Implementation', desc: 'Esecuzione con Gantt + monitoring continuo' },
            { num: 5, label: 'Gap Analysis & Close the Loop', desc: 'Bridge chart target vs actual, chiusura ciclo' },
          ]} phase="F7" />
      )}
      {activeTab === 'stdelements' && (
        <PlaceholderTab icon="📊" title="8 Standard Elements" subtitle="Valutazione qualità Quick Kaizen — Lindt FI Pillar"
          steps={[
            { num: '1.1', label: 'Clear description of phenomenon', desc: 'Descrizione chiara del fenomeno' },
            { num: '1.2', label: 'Impact quantified with KPI', desc: 'Impatto quantificato con KPI di loss' },
            { num: '2.1', label: 'Stratification: clear & understanding', desc: 'Stratificazione chiara e comprensibile' },
            { num: '2.2', label: 'Usage of 5 Whys method', desc: 'Utilizzo metodo 5 Why per causa radice' },
            { num: '2.3', label: 'Only relevant causes verified', desc: 'Verifica solo cause rilevanti' },
            { num: '3.1', label: 'Action log filled properly', desc: 'Log azioni completo (responsabile, data, azione)' },
            { num: '3.2', label: 'Horizontal/vertical expansion', desc: 'Espansione orizzontale/verticale del risultato' },
            { num: '4.1', label: 'Loss eradication', desc: 'Eliminazione definitiva della perdita' },
          ]} phase="F5" target="Target Lindt: 8/8" />
      )}
      {activeTab === 'cmladder' && (
        <PlaceholderTab icon="🏔️" title="Countermeasure Ladder" subtitle="Classificazione robustezza contromisure — 6 livelli Lindt"
          steps={[
            { num: 6, label: 'Innovation / Re-engineering', desc: 'Nuove tecnologie, redesign processo, investimenti' },
            { num: 5, label: 'Technological / Process Improvement', desc: 'Meccanizzazione, automazione' },
            { num: 4, label: 'Root Cause Elimination', desc: 'Miglioramento parametri oltre standard (Poka Yoke)' },
            { num: 3, label: 'Visual Control / Management', desc: 'Contromisure stabili, eliminano causa tecnica' },
            { num: 2, label: 'Restoration of Process Standards', desc: 'Cicli pulizia, ruoli/responsabilità chiari' },
            { num: 1, label: 'Restoration of Basic Conditions', desc: 'Pulizia base, 5S, ricordare check' },
          ]} phase="F6" />
      )}
      {activeTab === 'gantt' && (
        <PlaceholderTab icon="📅" title="Gantt Chart" subtitle="Pianificazione visiva interattiva"
          features={[
            '📊 Timeline visuale con drag&drop su date',
            '🔗 Dipendenze tra task ("blocks", "related to")',
            '🔴 Critical Path evidenziato automaticamente',
            '🎯 Milestones (diamanti)',
            '👤 Avatar assignee sulle barre',
            '⚡ Bidirezionalità con Action Plan',
            '📥 Export PNG/PDF brandizzato Lindt',
            '🔍 Multi-vista: Giorno · Settimana · Mese · Trimestre',
          ]} phase="F8-F10" />
      )}
      {activeTab === 'costbenefit' && (
        <PlaceholderTab icon="💰" title="Cost & Benefit" subtitle="Business case e calcolo ROI automatico"
          features={[
            '💵 Calcolo costo totale (investimento + manodopera + materiali)',
            '📈 Saving annuo stimato vs reale',
            '🎯 ROI % e Payback period automatici',
            '📊 Grafico proiezione 5 anni',
            '💎 VAN (Valore Attuale Netto)',
            '⚖️ Confronto stimato vs reale post-progetto',
            '📋 Import template Excel Lindt',
          ]} phase="Futura" />
      )}

      {activeTab === 'lavagna' && (
        <div className="bg-white rounded-xl shadow p-6">
          <textarea value={kaizen.lavagna || ''} onChange={(e) => setKaizen({...kaizen, lavagna: e.target.value})}
            className="w-full border rounded-lg px-4 py-3 min-h-[400px]" placeholder="Scrivi qui le tue note..." />
        </div>
      )}
      {activeTab === 'feed' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold mb-4">Cronologia Attività</h3>
          {kaizen.feed?.map((entry, i) => (
            <div key={i} className="flex gap-3 mb-3 pb-3 border-b last:border-0">
              <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
              <div>
                <p className="text-sm"><strong>{entry.utente}</strong> — {entry.azione}</p>
                <p className="text-xs text-gray-400">{entry.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// COMPONENTE PLACEHOLDER
// ──────────────────────────────────────────────────────────
function PlaceholderTab({ icon, title, subtitle, steps, features, phase, target }) {
  return (
    <div className="bg-white rounded-xl shadow p-8">
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">{icon}</div>
        <h2 className="text-2xl font-bold mb-1">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
        {target && (<span className="inline-block mt-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">🎯 {target}</span>)}
      </div>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🚧</div>
          <div>
            <div className="font-bold text-blue-900 mb-1">In costruzione</div>
            <div className="text-sm text-blue-700">Questa sezione verrà sbloccata nella <strong>Fase {phase}</strong> della roadmap SheetKaizen.</div>
            <div className="text-xs text-blue-600 mt-1">💡 Per ora la struttura è visibile come anteprima.</div>
          </div>
        </div>
      </div>
      {steps && (
        <div>
          <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Struttura prevista</h3>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-l-2 border-gray-300 hover:border-primary transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-primary text-primary flex items-center justify-center font-bold text-sm">{step.num}</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{step.label}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {features && (
        <div>
          <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Funzionalità previste</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg"><span className="text-sm">{feature}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// AZIONI TAB
// ──────────────────────────────────────────────────────────
function AzioniTab({ kaizenId, kaizenNumero, onUpdate }) {
  const [azioni, setAzioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('tutti')
  const [showForm, setShowForm] = useState(false)
  const [editingAP, setEditingAP] = useState(null)

  useEffect(() => { loadAzioni() }, [kaizenId])

  const loadAzioni = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/kaizens/${kaizenId}/action-plans`)
      setAzioni(res.data || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const changeStato = async (apId, nuovoStato) => {
    try {
      await api.patch(`/action-plans/${apId}/stato`, { stato: nuovoStato })
      loadAzioni()
    } catch (err) { alert('Errore cambio stato: ' + (err.response?.data?.detail || err.message)) }
  }

  const unlinkAP = async (apId, apNumero) => {
    if (!confirm(`🔓 Scollegare ${apNumero} dal Kaizen ${kaizenNumero}?\n\nL'Action Plan rimane in vita, ma non sarà più collegato a questo Kaizen.`)) return
    try {
      await api.delete(`/action-plans/${apId}/link-kaizen/${kaizenId}`)
      loadAzioni()
    } catch (err) { alert('Errore: ' + (err.response?.data?.detail || err.message)) }
  }

  const azioniFiltrate = azioni.filter(ap => {
    if (filtro === 'tutti') return true
    if (filtro === 'aperti') return ['Da Valutare', 'Aperto'].includes(ap.stato)
    if (filtro === 'incorso') return ap.stato === 'In Corso'
    if (filtro === 'done') return ap.stato === 'Done'
    if (filtro === 'overdue') return ap.stato_visuale === 'In Ritardo'
    return true
  })

  const stats = {
    totale: azioni.length,
    aperti: azioni.filter(a => ['Da Valutare', 'Aperto'].includes(a.stato)).length,
    incorso: azioni.filter(a => a.stato === 'In Corso').length,
    done: azioni.filter(a => a.stato === 'Done').length,
    overdue: azioni.filter(a => a.stato_visuale === 'In Ritardo').length,
  }

  const STATI_AP = ['Da Valutare', 'Aperto', 'In Corso', 'In Verifica', 'Done', 'Cancelled']
  const STATO_COLORS = {
    'Da Valutare': 'bg-gray-100 text-gray-700',
    'Aperto': 'bg-blue-100 text-blue-700',
    'In Corso': 'bg-indigo-100 text-indigo-700',
    'In Verifica': 'bg-purple-100 text-purple-700',
    'Done': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-gray-200 text-gray-500',
    'In Ritardo': 'bg-red-100 text-red-700',
    'In Scadenza': 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-bold text-lg">📋 Azioni del Kaizen {kaizenNumero}</h3>
            <p className="text-xs text-gray-500">Action Plan collegati a questo Kaizen</p>
          </div>
          <button onClick={() => { setEditingAP(null); setShowForm(true) }} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light text-sm font-medium">
            ➕ Crea Action Plan
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'tutti', label: 'Tutti', count: stats.totale, color: 'bg-gray-100 text-gray-700' },
            { id: 'aperti', label: 'Aperti', count: stats.aperti, color: 'bg-blue-100 text-blue-700' },
            { id: 'incorso', label: 'In Corso', count: stats.incorso, color: 'bg-indigo-100 text-indigo-700' },
            { id: 'done', label: 'Done', count: stats.done, color: 'bg-green-100 text-green-700' },
            ...(stats.overdue > 0 ? [{ id: 'overdue', label: '🔴 Overdue', count: stats.overdue, color: 'bg-red-100 text-red-700' }] : []),
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${f.color} ${filtro === f.id ? 'ring-2 ring-primary ring-offset-1' : 'opacity-70 hover:opacity-100'}`}>
              {f.label} <span className="font-bold ml-1">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">⏳ Caricamento...</div>
      ) : azioniFiltrate.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="text-lg font-semibold mb-1">{azioni.length === 0 ? 'Nessun Action Plan collegato' : 'Nessun risultato per questo filtro'}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {azioni.length === 0 ? 'Crea il primo Action Plan per questo Kaizen!' : 'Cambia filtro per vedere altri Action Plan'}
          </p>
          {azioni.length === 0 && (
            <button onClick={() => { setEditingAP(null); setShowForm(true) }} className="text-primary hover:underline">➕ Crea il primo Action Plan</button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {azioniFiltrate.map(ap => {
            const isOverdue = ap.stato_visuale === 'In Ritardo'
            const isInScadenza = ap.stato_visuale === 'In Scadenza'
            return (
              <div key={ap._id} className={`bg-white rounded-xl shadow p-4 border-l-4 ${isOverdue ? 'border-red-500' : isInScadenza ? 'border-yellow-500' : 'border-primary'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-primary font-bold">{ap.numero}</span>
                      <h4 className="font-semibold truncate">{ap.titolo}</h4>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {ap.tipo && <span className="text-gray-600">📋 {ap.tipo}</span>}
                      {ap.categoria && <span className="text-gray-600">🏷️ {ap.categoria}</span>}
                      {ap.priorita && <span className="text-gray-600">⚠️ {ap.priorita}</span>}
                      {ap.responsabile && <span className="text-gray-600">👤 {ap.responsabile}</span>}
                      {ap.data_scadenza && (
                        <span className={`${isOverdue ? 'text-red-600 font-bold' : isInScadenza ? 'text-yellow-700 font-bold' : 'text-gray-600'}`}>
                          📅 {new Date(ap.data_scadenza).toLocaleDateString('it-IT')}
                          {isOverdue && ' ⚠️'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t mt-2">
                  <select value={ap.stato} onChange={(e) => changeStato(ap._id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded border ${STATO_COLORS[ap.stato_visuale] || STATO_COLORS[ap.stato]}`}>
                    {STATI_AP.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingAP(ap); setShowForm(true) }} className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded text-blue-700" title="Modifica AP">
                      ✏️ Modifica
                    </button>
                    <button onClick={() => unlinkAP(ap._id, ap.numero)} className="text-xs px-3 py-1 bg-red-50 hover:bg-red-100 rounded text-red-600" title="Scollega dal Kaizen">
                      🔓 Scollega
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ActionPlanFormShared
          plan={editingAP}
          prefilledKaizen={{ kaizen_id: kaizenId, kaizen_numero: kaizenNumero }}
          onClose={() => { setShowForm(false); setEditingAP(null) }}
          onSaved={() => { setShowForm(false); setEditingAP(null); loadAzioni(); onUpdate?.() }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// FIGLI TAB — Quick Kaizen collegati al progetto Standard/Major
// ──────────────────────────────────────────────────────────
function FigliTab({ kaizenId, kaizenNumero, kaizenLivello, kaizenReparto, kaizenLinea, onUpdate }) {
  const [figli, setFigli] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitolo, setNewTitolo] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadFigli() }, [kaizenId])

  const loadFigli = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/kaizens/${kaizenId}/children`)
      setFigli(res.data || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const createFiglio = async () => {
    if (!newTitolo.trim()) return alert('Inserisci un titolo')
    setCreating(true)
    try {
      const res = await api.post('/kaizens/', {
        titolo: newTitolo,
        livello: 'Quick',
        tipo: 'Quick Kaizen',
        reparto: kaizenReparto || '',
        linea: kaizenLinea || '',
        parent_kaizen_id: kaizenId,
      })
      setNewTitolo('')
      setShowCreateModal(false)
      loadFigli()
      onUpdate?.()
      alert(`✅ Quick Kaizen ${res.data?.numero} creato e collegato a ${kaizenNumero}`)
    } catch (err) {
      console.error(err)
      alert('Errore creazione: ' + (err.response?.data?.detail || err.message))
    }
    setCreating(false)
  }

  const scollegaFiglio = async (childId, childNumero) => {
    if (!confirm(`🔓 Scollegare ${childNumero} da ${kaizenNumero}?\n\nIl Quick Kaizen rimane in vita ma non sarà più collegato a questo progetto.`)) return
    try {
      await api.delete(`/kaizens/${kaizenId}/link-child/${childId}`)
      loadFigli()
    } catch (err) { alert('Errore: ' + (err.response?.data?.detail || err.message)) }
  }

  const STATO_COLORS = {
    'Aperto': 'bg-blue-100 text-blue-700',
    'In Corso': 'bg-yellow-100 text-yellow-700',
    'Chiuso': 'bg-green-100 text-green-700',
    'Done': 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              ⚡ Quick Kaizen del progetto {kaizenNumero}
            </h3>
            <p className="text-xs text-gray-500">
              {figli.length === 0
                ? 'Nessun Quick Kaizen ancora collegato a questo progetto'
                : `${figli.length} Quick Kaizen ${figli.length === 1 ? 'collegato' : 'collegati'} a questo ${kaizenLivello}`
              }
            </p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light text-sm font-medium">
            ➕ Crea Quick Kaizen
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="bg-green-500 text-white px-5 py-3 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">⚡ Crea Quick Kaizen</h2>
              <button onClick={() => setShowCreateModal(false)} className="hover:bg-white hover:bg-opacity-20 p-1 rounded"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <strong className="text-blue-700">ℹ️ Verrà collegato a {kaizenNumero}</strong>
                <p className="text-blue-600 text-xs mt-1">Reparto e linea vengono ereditati dal progetto padre quando possibile.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Titolo <span className="text-red-500">*</span></label>
                <input value={newTitolo} onChange={(e) => setNewTitolo(e.target.value)} placeholder="Es: Pulizia ugelli linea 3" className="w-full border rounded-lg px-3 py-2" autoFocus />
              </div>
              <div className="text-xs text-gray-500">
                💡 Per personalizzare ulteriormente (macchina, partecipanti, ecc.), apri il Quick Kaizen dopo la creazione.
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg" disabled={creating}>Annulla</button>
                <button onClick={createFiglio} disabled={creating} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                  {creating ? '⏳ Creazione...' : '⚡ Crea Quick Kaizen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">⏳ Caricamento...</div>
      ) : figli.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <div className="text-5xl mb-3">⚡</div>
          <h3 className="text-lg font-semibold mb-1">Nessun Quick Kaizen ancora</h3>
          <p className="text-sm text-gray-500 mb-4">
            Un {kaizenLivello} Kaizen può includere Quick Kaizen più piccoli per gestire sotto-problemi specifici.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="text-primary hover:underline">➕ Crea il primo Quick Kaizen</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {figli.map(child => (
            <div key={child._id} className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">⚡</span>
                    <span className="font-mono text-xs text-primary font-bold">{child.numero}</span>
                  </div>
                  <h4 className="font-semibold mb-1">{child.titolo || 'Senza titolo'}</h4>
                  <div className="flex flex-wrap gap-1 text-xs">
                    {child.stato && (
                      <span className={`px-2 py-0.5 rounded-full ${STATO_COLORS[child.stato] || 'bg-gray-100 text-gray-700'}`}>
                        {child.stato}
                      </span>
                    )}
                    {child.reparto && <span className="text-gray-600">🏭 {child.reparto}</span>}
                    {child.linea && <span className="text-gray-600">📍 {child.linea}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t mt-2">
                {`/kaizen/${child._id}`}lass="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-700 flex-1 text-center">
                  👁 Apri Kaizen
                </a>
                <button onClick={() => scollegaFiglio(child._id, child.numero)} className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded text-red-600" title="Scollega dal progetto">
                  🔓 Scollega
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
