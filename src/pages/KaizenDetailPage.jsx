import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { Save, ChevronDown, X, History, RefreshCw } from 'lucide-react'
import ActionPlanFormShared from '../components/ActionPlanFormShared'
import IshikawaDiagram from '../components/kaizen/IshikawaDiagram'
import FiveWhysFlowChart from '../components/kaizen/FiveWhysFlowChart'
import KaizenGantMasterPlan from '../components/kaizen/KaizenGantMasterPlan'
import KaizenAzioniList from '../components/kaizen/KaizenAzioniList'

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
  base.push({
    id: 'quickkaizen',
    label: livello === 'Quick' ? 'Quick Kaizen' : 'Problem Solving',
  })
  base.push({ id: 'stdelements', label: '8 Standard Elements' })
  base.push({ id: 'cmladder', label: 'Countermeasure Ladder' })
  if (livello !== 'Quick') {
    base.push({ id: 'figli', label: 'Quick Kaizen' })
  }
  if (livello === 'Major') {
    base.push({ id: 'costbenefit', label: 'Cost & Benefit' })
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

  // Flusso Ishikawa → Crea Action Plan da Root Cause
  const [showAPFormFromRootCause, setShowAPFormFromRootCause] = useState(false)
  const [rootCausePrefill, setRootCausePrefill] = useState(null)

  // Quando l'utente clicca "Crea Action Plan da questa Root Cause"
  function handleCreateAPFromRootCause(rootCauseNode, problema) {
    const desc = `Problema: ${problema}\n\nRoot cause identificata: ${rootCauseNode.label}`
    setRootCausePrefill({
      titolo: `Azione per: ${(rootCauseNode.label || 'Root Cause').slice(0, 60)}`,
      descrizione: desc,
    })
    setShowAPFormFromRootCause(true)
  }

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
              {kaizen.pillar_sigla && (
                <Link
                  to={`/pillars/${kaizen.pillar_id}`}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-0.5 rounded-full font-mono font-bold transition-colors"
                  title={`Apri Pillar ${kaizen.pillar_sigla}`}
                >
                  🏛️ {kaizen.pillar_sigla}
                </Link>
              )}
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

      {/* 🆕 Banner Pillar per Major Kaizen */}
      {livelloAttuale === 'Major' && kaizen.pillar_id && (
        <div className="bg-purple-50 border-l-4 border-purple-400 rounded-r-lg p-3 mb-4 text-sm flex items-center gap-3">
          <span className="text-2xl">🏛️</span>
          <div className="flex-1">
            <div className="font-semibold text-purple-900">
              Questo Major Kaizen fa parte del Pillar <strong>{kaizen.pillar_sigla}</strong>
              {kaizen.pillar_label && ` — ${kaizen.pillar_label}`}
            </div>
            <div className="text-xs text-purple-700">
              Per gestire i 5 Step KPI Management e il Master Plan annuale → vai al Pillar
            </div>
          </div>
          <Link
            to={`/pillars/${kaizen.pillar_id}`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2 shadow-sm"
          >
            🎯 Apri Pillar →
          </Link>
        </div>
      )}
      {livelloAttuale === 'Major' && !kaizen.pillar_id && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-3 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <strong>Questo Major Kaizen non è collegato a nessun Pillar</strong>
              <div className="text-xs text-yellow-700 mt-0.5">
                Vai su <strong>Kaizen → Modifica</strong> per assegnarlo a un Pillar e gestire i 5 Step KPI.
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
        <div className="space-y-6">

          {/* PASSO 1 — Definizione del problema */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">PASSO 1 - DEFINIZIONE DEL PROBLEMA</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
              {['che_cosa', 'dove', 'quando', 'chi', 'quale', 'come'].map(field => (
                <div key={field}>
                  <label className="block text-sm font-bold text-gray-600 uppercase mb-1">{field.replace('_', ' ')}?</label>
                  <textarea value={kaizen.passo1_definizione?.[field] || ''}
                    onChange={(e) => updateField('passo1_definizione', field, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                </div>
              ))}
            </div>
          </div>

          {/* PASSO 2 — Ishikawa */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">
              PASSO 2 - CAUSE PROBABILI (Ishikawa)
            </h3>
            <IshikawaDiagram
              effetto={kaizen.passo2_cause_probabili?.effetto || ''}
              rami={kaizen.passo2_cause_probabili?.rami || {}}
              onChange={(data) => {
                setKaizen(prev => ({
                  ...prev,
                  passo2_cause_probabili: {
                    ...prev.passo2_cause_probabili,
                    effetto: data.effetto,
                    rami: data.rami,
                  },
                }))
              }}
            />
          </div>

          {/* PASSO 3 — Catene 5 Perché */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">
              PASSO 3 - 5 PERCHÉ (Catene Root Cause)
            </h3>
            <FiveWhysFlowChart
              effetto={kaizen.passo2_cause_probabili?.effetto || ''}
              rami={kaizen.passo2_cause_probabili?.rami || {}}
              onCreateActionPlan={handleCreateAPFromRootCause}
            />
          </div>

          {/* PASSO 4 — Verifica del processo */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">PASSO 4 - VERIFICA DEL PROCESSO</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
              {[
                { key: 'condizioni_base_rispettate', label: 'Le condizioni di base sono rispettate (5S, Pulizia e lubrificazione)?' },
                { key: 'conoscenza_macchina_processo', label: 'Le persone dimostrano conoscenza di macchina e processo?' },
                { key: 'standard_esistenti', label: 'Esistono standard legati al problema (OPL, SOP)?' },
                { key: 'standard_chiari', label: 'Gli standard sono chiari e comprensibili?' },
                { key: 'standard_applicati', label: 'Gli standard sono applicati correttamente?' },
                { key: 'persone_conoscono_standard', label: 'Le persone conoscono gli standard?' },
              ].map(item => (
                <div key={item.key} className="pb-3 border-b">
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
          </div>

          {/* PASSO 5 — Piano Azioni (Standard/Major: Gant + Lista | Quick: solo lista) */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">PASSO 5 - PIANO AZIONI</h3>

            {livelloAttuale !== 'Quick' && (
              <>
                {/* Gant in cima (solo Standard/Major) */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm uppercase text-gray-700 mb-2">Gant macro</h4>
                  <KaizenGantMasterPlan kaizen={kaizen} onSaved={loadKaizen} />
                </div>
                <div className="border-t pt-6" />
              </>
            )}

            {/* Lista azioni (per tutti i livelli) */}
            <KaizenAzioniList
              kaizen={kaizen}
              kaizenId={id}
              kaizenNumero={kaizen.numero}
              onUpdate={loadKaizen}
            />
          </div>

          {/* FASE 6 + FASE 7 affiancate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">FASE 6 - VALUTAZIONE EFFICACIA</h3>
              <textarea value={kaizen.fase5_valutazione_efficacia?.osservazioni || ''}
                onChange={(e) => updateField('fase5_valutazione_efficacia', 'osservazioni', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" rows={6} />
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="bg-primary text-white text-center py-2 rounded-lg font-bold mb-4">FASE 7 - STANDARDIZZAZIONE E REPLICA</h3>
              <textarea value={kaizen.fase6_standardizzazione?.osservazioni || ''}
                onChange={(e) => updateField('fase6_standardizzazione', 'osservazioni', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" rows={6} />
            </div>
          </div>

        </div>
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

      {activeTab === 'stdelements' && (
        <StandardElementsTab kaizen={kaizen} onSaved={loadKaizen} />
      )}

      {activeTab === 'cmladder' && (
        <CountermeasureLadderTab kaizen={kaizen} onSaved={loadKaizen} />
      )}

      {activeTab === 'costbenefit' && (
        <PlaceholderTab icon="💰" title="Cost & Benefit" subtitle="Business case e calcolo ROI automatico"
          features={[
            'Calcolo costo totale (investimento + manodopera + materiali)',
            'Saving annuo stimato vs reale',
            'ROI % e Payback period automatici',
            'Grafico proiezione 5 anni',
            'VAN (Valore Attuale Netto)',
            'Confronto stimato vs reale post-progetto',
            'Import template Excel Lindt',
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

      {/* Form AP creato da Root Cause dei 5 Perché */}
      {showAPFormFromRootCause && rootCausePrefill && (
        <ActionPlanFormShared
          plan={{
            titolo: rootCausePrefill.titolo,
            descrizione: rootCausePrefill.descrizione,
          }}
          prefilledKaizen={{ kaizen_id: id, kaizen_numero: kaizen.numero }}
          onClose={() => {
            setShowAPFormFromRootCause(false)
            setRootCausePrefill(null)
          }}
          onSaved={() => {
            setShowAPFormFromRootCause(false)
            setRootCausePrefill(null)
            loadKaizen()
            alert('Action Plan creato e collegato al Kaizen')
          }}
        />
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
                <a href={`/kaizen/${child._id}`} className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-700 flex-1 text-center">
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

// ──────────────────────────────────────────────────────────
// 8 STANDARD ELEMENTS TAB — Lindt FI Pillar
// ──────────────────────────────────────────────────────────
const STD_ELEMENTS = [
  {
    area: 1,
    areaLabel: 'Problem Description',
    areaColor: 'bg-blue-50 border-blue-300',
    areaHeaderColor: 'bg-blue-100 text-blue-800',
    items: [
      { id: '1.1', label: 'Clear description of phenomenon', desc: 'Descrizione chiara del fenomeno (cosa, dove, quando, chi, quale, come)' },
      { id: '1.2', label: 'Impact quantified with KPI', desc: 'Impatto quantificato con KPI di loss (es: % scarti, tempo perso, costo)' },
    ],
  },
  {
    area: 2,
    areaLabel: 'Root Cause Analysis',
    areaColor: 'bg-purple-50 border-purple-300',
    areaHeaderColor: 'bg-purple-100 text-purple-800',
    items: [
      { id: '2.1', label: 'Stratification: clear & understanding', desc: 'Stratificazione del problema chiara e comprensibile' },
      { id: '2.2', label: 'Usage of 5 Whys method', desc: 'Utilizzo del metodo 5 Why per arrivare alla causa radice' },
      { id: '2.3', label: 'Only relevant causes verified', desc: 'Verificate solo cause realmente rilevanti (no analisi inutili)' },
    ],
  },
  {
    area: 3,
    areaLabel: 'Implementation',
    areaColor: 'bg-green-50 border-green-300',
    areaHeaderColor: 'bg-green-100 text-green-800',
    items: [
      { id: '3.1', label: 'Action log filled properly', desc: 'Log azioni completo con responsabile, data e azione chiara' },
      { id: '3.2', label: 'Horizontal/vertical expansion', desc: 'Espansione orizzontale (altre linee) o verticale (altri stabilimenti)' },
    ],
  },
  {
    area: 4,
    areaLabel: 'Standardization',
    areaColor: 'bg-orange-50 border-orange-300',
    areaHeaderColor: 'bg-orange-100 text-orange-800',
    items: [
      { id: '4.1', label: 'Loss eradication', desc: 'Eliminazione definitiva della perdita (verificata nel tempo)' },
    ],
  },
]

const SCORE_OPTIONS = [
  { value: 0, label: 'Non OK', icon: '❌', color: 'bg-red-100 text-red-700 border-red-400' },
  { value: 0.5, label: 'Parziale', icon: '⚠️', color: 'bg-yellow-100 text-yellow-700 border-yellow-400' },
  { value: 1, label: 'OK', icon: '✓', color: 'bg-green-100 text-green-700 border-green-400' },
]

const MAX_SCORE = 8

function StandardElementsTab({ kaizen, onSaved }) {
  const [scores, setScores] = useState(kaizen.standard_elements?.scores || {})
  const [notes, setNotes] = useState(kaizen.standard_elements?.notes || {})
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const scoresRef = useRef(scores)
  const notesRef = useRef(notes)
  const kaizenIdRef = useRef(kaizen._id)

  useEffect(() => { scoresRef.current = scores }, [scores])
  useEffect(() => { notesRef.current = notes }, [notes])

  const totalScore = Object.values(scores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  const percent = (totalScore / MAX_SCORE) * 100
  const completedCount = Object.keys(scores).length
  const totalElements = STD_ELEMENTS.reduce((sum, area) => sum + area.items.length, 0)

  let passStatus = { label: 'Da Completare', color: 'bg-gray-100 text-gray-700', emoji: '📝' }
  if (completedCount === totalElements) {
    if (totalScore >= 8) passStatus = { label: 'PASS', color: 'bg-green-500 text-white', emoji: '🏆' }
    else if (totalScore >= 5) passStatus = { label: 'PARTIAL PASS', color: 'bg-yellow-500 text-white', emoji: '⚠️' }
    else passStatus = { label: 'FAIL', color: 'bg-red-500 text-white', emoji: '❌' }
  }

  const doSave = async (silent = false) => {
    if (!silent) setSaving(true)
    try {
      const currentScores = scoresRef.current
      const currentNotes = notesRef.current
      const currentTotal = Object.values(currentScores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
      const currentCount = Object.keys(currentScores).length

      let currentStatus = 'Da Completare'
      if (currentCount === totalElements) {
        if (currentTotal >= 8) currentStatus = 'PASS'
        else if (currentTotal >= 5) currentStatus = 'PARTIAL PASS'
        else currentStatus = 'FAIL'
      }

      await api.put(`/kaizens/${kaizenIdRef.current}`, {
        standard_elements: {
          scores: currentScores,
          notes: currentNotes,
          total_score: currentTotal,
          max_score: MAX_SCORE,
          percent: (currentTotal / MAX_SCORE) * 100,
          pass_status: currentStatus,
          last_evaluated_at: new Date().toISOString(),
        },
      })
      if (!silent) {
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
      }
      return true
    } catch (err) {
      console.error('Errore salvataggio Standard Elements:', err)
      if (!silent) alert('❌ Errore salvataggio: ' + (err.response?.data?.detail || err.message))
      return false
    } finally {
      if (!silent) setSaving(false)
    }
  }

  useEffect(() => {
    if (Object.keys(scores).length === 0 && Object.keys(notes).length === 0) return
    setHasUnsavedChanges(true)
    const timer = setTimeout(() => doSave(false), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, notes])

  useEffect(() => {
    return () => {
      if (Object.keys(scoresRef.current).length > 0 || Object.keys(notesRef.current).length > 0) {
        const currentScores = scoresRef.current
        const currentNotes = notesRef.current
        const currentTotal = Object.values(currentScores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
        const currentCount = Object.keys(currentScores).length
        let currentStatus = 'Da Completare'
        if (currentCount === totalElements) {
          if (currentTotal >= 8) currentStatus = 'PASS'
          else if (currentTotal >= 5) currentStatus = 'PARTIAL PASS'
          else currentStatus = 'FAIL'
        }
        api.put(`/kaizens/${kaizenIdRef.current}`, {
          standard_elements: {
            scores: currentScores,
            notes: currentNotes,
            total_score: currentTotal,
            max_score: MAX_SCORE,
            percent: (currentTotal / MAX_SCORE) * 100,
            pass_status: currentStatus,
            last_evaluated_at: new Date().toISOString(),
          },
        }).catch(err => console.error('Errore save su unmount:', err))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const setScore = (itemId, value) => setScores(prev => ({ ...prev, [itemId]: value }))
  const setNote = (itemId, value) => setNotes(prev => ({ ...prev, [itemId]: value }))
  const manualSave = async () => { await doSave(false) }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">📊 8 Standard Elements</h3>
            <p className="text-sm text-gray-500">Valutazione qualità Quick Kaizen — Lindt FI Pillar</p>
          </div>
          <div className="text-right">
            <div className={`inline-block px-3 py-1.5 rounded-lg font-bold text-sm ${passStatus.color}`}>
              {passStatus.emoji} {passStatus.label}
            </div>
            <div className="text-xs mt-1 flex items-center justify-end gap-2">
              {saving ? <span className="text-blue-600">⏳ Salvataggio...</span> :
               hasUnsavedChanges ? <span className="text-orange-600 font-medium">⚠️ Modifiche non salvate</span> :
               lastSaved ? <span className="text-green-600">💾 Salvato {lastSaved.toLocaleTimeString('it-IT')}</span> :
               <span className="text-gray-400">In attesa</span>}
              <button onClick={manualSave} disabled={saving} className="bg-primary text-white px-3 py-1 rounded text-xs hover:bg-primary-light disabled:opacity-50">
                💾 Salva ora
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">SCORE TOTALE</span>
            <span className="text-sm text-gray-500">🎯 Target Lindt: 8/8</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-primary">{totalScore.toFixed(1)}</span>
            <span className="text-xl text-gray-400">/ {MAX_SCORE}</span>
            <span className="ml-auto text-lg font-semibold text-gray-600">{percent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                totalScore >= 8 ? 'bg-green-500' :
                totalScore >= 5 ? 'bg-yellow-500' :
                totalScore > 0 ? 'bg-orange-500' :
                'bg-gray-300'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-2">{completedCount}/{totalElements} elementi valutati</div>
        </div>
      </div>

      {STD_ELEMENTS.map(area => (
        <div key={area.area} className={`rounded-xl border-2 ${area.areaColor} overflow-hidden`}>
          <div className={`${area.areaHeaderColor} px-4 py-2.5 font-bold text-sm`}>
            AREA {area.area} — {area.areaLabel}
          </div>
          <div className="bg-white">
            {area.items.map((item, idx) => {
              const currentScore = scores[item.id]
              return (
                <div key={item.id} className={`p-4 ${idx < area.items.length - 1 ? 'border-b' : ''}`}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {item.id}
                        </span>
                        <span className="font-semibold text-sm">{item.label}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{item.desc}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {SCORE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setScore(item.id, opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                            currentScore === opt.value
                              ? opt.color + ' shadow-md scale-105'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                          }`}
                          title={opt.label}
                        >
                          {opt.icon} {opt.value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={notes[item.id] || ''}
                    onChange={(e) => setNote(item.id, e.target.value)}
                    placeholder="📝 Note opzionali (giustificazione, evidenze, riferimenti)..."
                    rows={2}
                    className="w-full text-xs border rounded-lg px-3 py-2 mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 text-sm text-blue-700">
        <div className="font-semibold mb-1">ℹ️ Come compilare</div>
        <div className="text-xs space-y-1">
          <div>• <strong>✓ OK (1)</strong> → Elemento pienamente soddisfatto</div>
          <div>• <strong>⚠️ Parziale (0.5)</strong> → Soddisfatto ma migliorabile</div>
          <div>• <strong>❌ Non OK (0)</strong> → Elemento mancante o non sufficiente</div>
          <div className="mt-2 pt-2 border-t border-blue-200">
            <strong>Soglie Lindt:</strong> 🏆 PASS = 8 · ⚠️ PARTIAL = 5-7 · ❌ FAIL = &lt; 5
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// COUNTERMEASURE LADDER TAB — Lindt FI Pillar 6 livelli
// ──────────────────────────────────────────────────────────
const CM_LEVELS = [
  { level: 6, label: 'Innovation / Re-engineering', desc: 'Nuove tecnologie, redesign processo, investimenti strutturali', color: 'bg-emerald-50 border-emerald-400', headerColor: 'bg-emerald-100 text-emerald-900', badge: 'bg-emerald-500 text-white', emoji: '🚀' },
  { level: 5, label: 'Technological / Process Improvement', desc: 'Meccanizzazione, automazione, modifica processo', color: 'bg-green-50 border-green-400', headerColor: 'bg-green-100 text-green-900', badge: 'bg-green-500 text-white', emoji: '⚙️' },
  { level: 4, label: 'Root Cause Elimination (Poka Yoke)', desc: 'Miglioramento parametri oltre lo standard originale (errore impossibile)', color: 'bg-lime-50 border-lime-400', headerColor: 'bg-lime-100 text-lime-900', badge: 'bg-lime-500 text-white', emoji: '🛡️' },
  { level: 3, label: 'Visual Control / Management', desc: 'Contromisure stabili che eliminano la causa tecnica (visual control)', color: 'bg-yellow-50 border-yellow-400', headerColor: 'bg-yellow-100 text-yellow-900', badge: 'bg-yellow-500 text-white', emoji: '👁️' },
  { level: 2, label: 'Restoration of Process Standards', desc: 'Azioni che riportano il processo agli standard (cicli pulizia, ruoli chiari)', color: 'bg-orange-50 border-orange-400', headerColor: 'bg-orange-100 text-orange-900', badge: 'bg-orange-500 text-white', emoji: '📋' },
  { level: 1, label: 'Restoration of Basic Conditions', desc: 'Pulizia base, 5S, ricordare check agli operatori', color: 'bg-red-50 border-red-400', headerColor: 'bg-red-100 text-red-900', badge: 'bg-red-500 text-white', emoji: '🧹' },
]

function CountermeasureLadderTab({ kaizen, onSaved }) {
  const [countermeasures, setCountermeasures] = useState(kaizen.countermeasure_ladder?.items || {})
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [newInputs, setNewInputs] = useState({})

  const cmRef = useRef(countermeasures)
  const kaizenIdRef = useRef(kaizen._id)
  useEffect(() => { cmRef.current = countermeasures }, [countermeasures])

  const livelliPresenti = Object.keys(countermeasures)
    .filter(lvl => countermeasures[lvl]?.length > 0)
    .map(lvl => parseInt(lvl))

  const maxLevel = livelliPresenti.length > 0 ? Math.max(...livelliPresenti) : 0
  const totalCount = Object.values(countermeasures).reduce((sum, arr) => sum + (arr?.length || 0), 0)

  let robustness = { label: 'Da Compilare', color: 'bg-gray-100 text-gray-700', emoji: '📝' }
  if (maxLevel >= 4) robustness = { label: 'OTTIMO', color: 'bg-green-500 text-white', emoji: '🏆' }
  else if (maxLevel >= 3) robustness = { label: 'BUONO', color: 'bg-yellow-500 text-white', emoji: '✅' }
  else if (maxLevel >= 1) robustness = { label: 'DEBOLE', color: 'bg-red-500 text-white', emoji: '⚠️' }

  const doSave = async (silent = false) => {
    if (!silent) setSaving(true)
    try {
      const currentCM = cmRef.current
      const currentLivelli = Object.keys(currentCM).filter(lvl => currentCM[lvl]?.length > 0).map(lvl => parseInt(lvl))
      const currentMax = currentLivelli.length > 0 ? Math.max(...currentLivelli) : 0
      const currentTotal = Object.values(currentCM).reduce((sum, arr) => sum + (arr?.length || 0), 0)
      let currentRobust = 'Da Compilare'
      if (currentMax >= 4) currentRobust = 'OTTIMO'
      else if (currentMax >= 3) currentRobust = 'BUONO'
      else if (currentMax >= 1) currentRobust = 'DEBOLE'

      await api.put(`/kaizens/${kaizenIdRef.current}`, {
        countermeasure_ladder: {
          items: currentCM,
          max_level: currentMax,
          total_count: currentTotal,
          robustness: currentRobust,
          last_evaluated_at: new Date().toISOString(),
        },
      })
      if (!silent) {
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
      }
    } catch (err) {
      console.error('Errore salvataggio Countermeasure Ladder:', err)
      if (!silent) alert('❌ Errore: ' + (err.response?.data?.detail || err.message))
    } finally {
      if (!silent) setSaving(false)
    }
  }

  useEffect(() => {
    if (Object.keys(countermeasures).length === 0) return
    setHasUnsavedChanges(true)
    const timer = setTimeout(() => doSave(false), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countermeasures])

  useEffect(() => {
    return () => {
      if (Object.keys(cmRef.current).length > 0) {
        const currentCM = cmRef.current
        const currentLivelli = Object.keys(currentCM).filter(lvl => currentCM[lvl]?.length > 0).map(lvl => parseInt(lvl))
        const currentMax = currentLivelli.length > 0 ? Math.max(...currentLivelli) : 0
        const currentTotal = Object.values(currentCM).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        let currentRobust = 'Da Compilare'
        if (currentMax >= 4) currentRobust = 'OTTIMO'
        else if (currentMax >= 3) currentRobust = 'BUONO'
        else if (currentMax >= 1) currentRobust = 'DEBOLE'

        api.put(`/kaizens/${kaizenIdRef.current}`, {
          countermeasure_ladder: {
            items: currentCM,
            max_level: currentMax,
            total_count: currentTotal,
            robustness: currentRobust,
            last_evaluated_at: new Date().toISOString(),
          },
        }).catch(err => console.error('Errore save unmount:', err))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const addCountermeasure = (level) => {
    const text = (newInputs[level] || '').trim()
    if (!text) return
    setCountermeasures(prev => ({
      ...prev,
      [level]: [...(prev[level] || []), {
        id: Date.now().toString(),
        text,
        added_at: new Date().toISOString(),
      }],
    }))
    setNewInputs(prev => ({ ...prev, [level]: '' }))
  }

  const removeCountermeasure = (level, itemId) => {
    setCountermeasures(prev => ({
      ...prev,
      [level]: (prev[level] || []).filter(item => item.id !== itemId),
    }))
  }

  const manualSave = async () => { await doSave(false) }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">🏔️ Countermeasure Ladder</h3>
            <p className="text-sm text-gray-500">Robustezza delle contromisure — Lindt FI Pillar</p>
          </div>
          <div className="text-right">
            <div className={`inline-block px-3 py-1.5 rounded-lg font-bold text-sm ${robustness.color}`}>
              {robustness.emoji} {robustness.label}
            </div>
            <div className="text-xs mt-1 flex items-center justify-end gap-2">
              {saving ? <span className="text-blue-600">⏳ Salvataggio...</span> :
               hasUnsavedChanges ? <span className="text-orange-600 font-medium">⚠️ Modifiche non salvate</span> :
               lastSaved ? <span className="text-green-600">💾 Salvato {lastSaved.toLocaleTimeString('it-IT')}</span> :
               <span className="text-gray-400">In attesa</span>}
              <button onClick={manualSave} disabled={saving} className="bg-primary text-white px-3 py-1 rounded text-xs hover:bg-primary-light disabled:opacity-50">
                💾 Salva ora
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">LIVELLO MASSIMO RAGGIUNTO</span>
            <span className="text-sm text-gray-500">🎯 Target: ≥ 4 (Poka Yoke)</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-primary">{maxLevel}</span>
            <span className="text-xl text-gray-400">/ 6</span>
            <span className="ml-auto text-sm font-medium text-gray-600">
              {totalCount} contromisur{totalCount === 1 ? 'a' : 'e'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                maxLevel >= 5 ? 'bg-emerald-500' :
                maxLevel >= 4 ? 'bg-green-500' :
                maxLevel >= 3 ? 'bg-yellow-500' :
                maxLevel >= 1 ? 'bg-orange-500' :
                'bg-gray-300'
              }`}
              style={{ width: `${(maxLevel / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {CM_LEVELS.map(lvl => {
        const items = countermeasures[lvl.level] || []
        return (
          <div key={lvl.level} className={`rounded-xl border-2 ${lvl.color} overflow-hidden`}>
            <div className={`${lvl.headerColor} px-4 py-3 flex items-center gap-3`}>
              <span className={`${lvl.badge} px-2.5 py-1 rounded-lg font-bold text-sm`}>
                Liv. {lvl.level}
              </span>
              <div className="flex-1">
                <div className="font-bold text-sm flex items-center gap-2">
                  <span className="text-lg">{lvl.emoji}</span>
                  {lvl.label}
                </div>
                <div className="text-xs opacity-80 mt-0.5">{lvl.desc}</div>
              </div>
              {items.length > 0 && (
                <span className="text-xs font-bold bg-white px-2 py-1 rounded-full">
                  {items.length}
                </span>
              )}
            </div>

            <div className="bg-white p-4 space-y-2">
              {items.length > 0 ? (
                items.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex-1 text-sm">
                      <span className="text-gray-400 mr-2">•</span>
                      {item.text}
                    </div>
                    <button
                      onClick={() => removeCountermeasure(lvl.level, item.id)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors flex-shrink-0"
                      title="Rimuovi"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic py-1">Nessuna contromisura a questo livello</div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <input
                  type="text"
                  value={newInputs[lvl.level] || ''}
                  onChange={(e) => setNewInputs(prev => ({ ...prev, [lvl.level]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCountermeasure(lvl.level)
                    }
                  }}
                  placeholder={`Aggiungi contromisura livello ${lvl.level}...`}
                  className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => addCountermeasure(lvl.level)}
                  disabled={!newInputs[lvl.level]?.trim()}
                  className={`${lvl.badge} px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity`}
                >
                  + Aggiungi
                </button>
              </div>
            </div>
          </div>
        )
      })}

      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 text-sm text-blue-700">
        <div className="font-semibold mb-2">ℹ️ Come funziona</div>
        <div className="text-xs space-y-1">
          <div>📌 Per ogni livello aggiungi le contromisure che hai implementato (premi <strong>Invio</strong> o click <strong>Aggiungi</strong>)</div>
          <div>📌 Il <strong>livello più alto raggiunto</strong> determina la robustezza globale</div>
          <div className="mt-2 pt-2 border-t border-blue-200">
            <strong>Soglie Lindt:</strong> 🏆 OTTIMO ≥ Liv.4 (Poka Yoke) · ✅ BUONO = Liv.3 · ⚠️ DEBOLE ≤ Liv.2
          </div>
          <div className="mt-1 text-blue-600 italic">
            💡 Più alta la contromisura, più robusta nel tempo. Punta sempre al massimo livello possibile!
          </div>
        </div>
      </div>
    </div>
  )
}
