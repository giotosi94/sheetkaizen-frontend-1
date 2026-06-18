import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GridLayout from 'react-grid-layout'
import api from '../services/api'
import { Save, ArrowLeft, Plus, Trash2, Settings, Edit2, X } from 'lucide-react'
import ActionPlanWidget from '../components/widgets/ActionPlanWidget'
import KPICard from '../components/widgets/KPICard'
import TextBlock from '../components/widgets/TextBlock'
import BIEmbed from '../components/widgets/BIEmbed'
import TableWidget from '../components/widgets/TableWidget'
import ExcelLink from '../components/widgets/ExcelLink'
import TableEditor from '../components/TableEditor'
import 'react-grid-layout/css/styles.css'

const WIDGET_TYPES = [
  { id: 'action_plan', label: '📋 Action Plan', icon: '📋', defaultSize: { w: 6, h: 6 } },
  { id: 'kpi_card', label: '🎯 KPI Card', icon: '🎯', defaultSize: { w: 3, h: 3 } },
  { id: 'text_block', label: '📝 Blocco Testo', icon: '📝', defaultSize: { w: 4, h: 4 } },
  { id: 'bi_embed', label: '📊 Embed BI', icon: '📊', defaultSize: { w: 6, h: 6 } },
  { id: 'table', label: '📑 Tabella', icon: '📑', defaultSize: { w: 6, h: 5 } },
  { id: 'excel_link', label: '🔗 Link Excel', icon: '🔗', defaultSize: { w: 4, h: 4 } },
]

export default function DashboardDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [editingWidget, setEditingWidget] = useState(null)

  useEffect(() => { loadDashboard() }, [id])

  const loadDashboard = async () => {
    try {
      const res = await api.get(`/dashboards/${id}`)
      setDashboard(res.data)
    } catch (err) { console.error(err) }
  }

  const saveDashboard = async () => {
    setSaving(true)
    try {
      await api.put(`/dashboards/${id}`, { layout: dashboard.layout })
      alert('Dashboard salvata!')
      setEditMode(false)
    } catch (err) {
      console.error(err)
      alert('Errore salvataggio')
    }
    setSaving(false)
  }

  const addWidget = (type) => {
    const widgetType = WIDGET_TYPES.find(w => w.id === type)
    const newWidget = {
      widget_id: `widget_${Date.now()}`,
      tipo: type,
      titolo: widgetType.label,
      posizione: { x: 0, y: 0, w: widgetType.defaultSize.w, h: widgetType.defaultSize.h },
      config: {},
    }
    setDashboard({ ...dashboard, layout: [...(dashboard.layout || []), newWidget] })
    setShowAddWidget(false)
  }

  const removeWidget = (widgetId) => {
    setDashboard({
      ...dashboard,
      layout: dashboard.layout.filter(w => w.widget_id !== widgetId),
    })
  }

  const updateWidgetConfig = (widgetId, newConfig) => {
    setDashboard({
      ...dashboard,
      layout: dashboard.layout.map(w =>
        w.widget_id === widgetId ? { ...w, config: { ...w.config, ...newConfig } } : w
      ),
    })
  }

  const onLayoutChange = (newLayout) => {
    if (!editMode) return
    setDashboard({
      ...dashboard,
      layout: dashboard.layout.map(w => {
        const l = newLayout.find(item => item.i === w.widget_id)
        if (l) return { ...w, posizione: { x: l.x, y: l.y, w: l.w, h: l.h } }
        return w
      }),
    })
  }

  const renderWidget = (widget) => {
    switch (widget.tipo) {
      case 'action_plan':
        return <ActionPlanWidget filterReparto={widget.config.filterReparto} filterStato={widget.config.filterStato} dashboardId={id} dashboardName={dashboard.nome} title={widget.config.titolo || 'Action Plan'} />
      case 'kpi_card':
        return <KPICard config={widget.config} />
      case 'text_block':
        return <TextBlock config={widget.config} />
      case 'bi_embed':
        return <BIEmbed config={widget.config} />
      case 'table':
  return (
    <TableWidget
      config={widget.config}
      editMode={editMode}
      onChange={(newConfig) => updateWidgetConfig(widget.widget_id, newConfig)}
    />
  )
      case 'excel_link':
        return <ExcelLink config={widget.config} />
      default:
        return <div className="bg-white p-4">Widget sconosciuto</div>
    }
  }

  if (!dashboard) return <div className="text-center py-8">Caricamento...</div>

  const gridLayout = (dashboard.layout || []).map(w => ({
    i: w.widget_id,
    x: w.posizione?.x || 0,
    y: w.posizione?.y || 0,
    w: w.posizione?.w || 4,
    h: w.posizione?.h || 4,
  }))

  return (
    <div>
      {/* Header */}
      <div className="bg-primary text-white rounded-xl p-4 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="hover:bg-primary-light p-2 rounded">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">{dashboard.nome}</h1>
            <p className="text-xs text-gray-300">{dashboard.tipo} · {dashboard.visibilita}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button onClick={() => setShowAddWidget(true)} className="bg-white text-primary px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100">
                <Plus size={16} /> Widget
              </button>
              <button onClick={saveDashboard} disabled={saving} className="bg-green-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600">
                <Save size={16} /> {saving ? '...' : 'Salva'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} className="bg-white text-primary px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100">
              <Edit2 size={16} /> Modifica
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {(!dashboard.layout || dashboard.layout.length === 0) ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-400 mb-4">Nessun widget. Aggiungine uno per iniziare!</p>
          <button onClick={() => { setEditMode(true); setShowAddWidget(true) }} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light">
            ➕ Aggiungi primo widget
          </button>
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={gridLayout}
          cols={12}
          rowHeight={50}
          width={1200}
          onLayoutChange={onLayoutChange}
          isDraggable={editMode}
          isResizable={editMode}
          draggableCancel=".widget-action-btn"
        >
          {dashboard.layout.map(widget => (
            <div key={widget.widget_id} className="relative">
              {editMode && (
                <div className="absolute top-1 right-1 z-20 flex gap-1 widget-action-btn">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setEditingWidget(widget) }}
                    className="widget-action-btn bg-blue-500 text-white rounded p-1 hover:bg-blue-600 cursor-pointer shadow"
                  >
                    <Settings size={12} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); removeWidget(widget.widget_id) }}
                    className="widget-action-btn bg-red-500 text-white rounded p-1 hover:bg-red-600 cursor-pointer shadow"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
              {renderWidget(widget)}
            </div>
          ))}
        </GridLayout>
      )}

      {/* Modal Add Widget */}
      {showAddWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">➕ Aggiungi Widget</h2>
              <button onClick={() => setShowAddWidget(false)}><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {WIDGET_TYPES.map(w => (
                <button
                  key={w.id}
                  onClick={() => addWidget(w.id)}
                  className="border-2 border-gray-200 hover:border-primary rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-3xl mb-2">{w.icon}</div>
                  <div className="text-sm font-medium">{w.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Widget */}
      {editingWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
              <h2 className="text-lg font-bold">⚙️ Configura Widget</h2>
              <button onClick={() => setEditingWidget(null)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Titolo</label>
                <input
                  value={editingWidget.config.titolo || ''}
                  onChange={(e) => {
                    updateWidgetConfig(editingWidget.widget_id, { titolo: e.target.value })
                    setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, titolo: e.target.value } })
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              {editingWidget.tipo === 'kpi_card' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Valore</label>
                      <input
                        value={editingWidget.config.valore || ''}
                        onChange={(e) => {
                          updateWidgetConfig(editingWidget.widget_id, { valore: e.target.value })
                          setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, valore: e.target.value } })
                        }}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Unità</label>
                      <input
                        value={editingWidget.config.unita || ''}
                        onChange={(e) => {
                          updateWidgetConfig(editingWidget.widget_id, { unita: e.target.value })
                          setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, unita: e.target.value } })
                        }}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="%, €, ..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Target</label>
                    <input
                      value={editingWidget.config.target || ''}
                      onChange={(e) => {
                        updateWidgetConfig(editingWidget.widget_id, { target: e.target.value })
                        setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, target: e.target.value } })
                      }}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </>
              )}

              {editingWidget.tipo === 'text_block' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Contenuto</label>
                  <textarea
                    rows={6}
                    value={editingWidget.config.contenuto || ''}
                    onChange={(e) => {
                      updateWidgetConfig(editingWidget.widget_id, { contenuto: e.target.value })
                      setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, contenuto: e.target.value } })
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}

              {editingWidget.tipo === 'bi_embed' && (
                <div>
                  <label className="block text-sm font-medium mb-1">URL Embed (Power BI / link)</label>
                  <input
                    value={editingWidget.config.url || ''}
                    onChange={(e) => {
                      updateWidgetConfig(editingWidget.widget_id, { url: e.target.value })
                      setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, url: e.target.value } })
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="https://app.powerbi.com/view?r=..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Da Power BI: File → Embed report → copia URL
                  </p>
                </div>
              )}

              {editingWidget.tipo === 'action_plan' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Filtra per Reparto</label>
                    <input
                      value={editingWidget.config.filterReparto || ''}
                      onChange={(e) => {
                        updateWidgetConfig(editingWidget.widget_id, { filterReparto: e.target.value })
                        setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, filterReparto: e.target.value } })
                      }}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Lascia vuoto per tutti"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Filtra per Stato</label>
                    <select
                      value={editingWidget.config.filterStato || ''}
                      onChange={(e) => {
                        updateWidgetConfig(editingWidget.widget_id, { filterStato: e.target.value })
                        setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, filterStato: e.target.value } })
                      }}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Tutti</option>
                      <option>Da Fare</option>
                      <option>In Corso</option>
                      <option>Completato</option>
                    </select>
                  </div>
                </>
              )}

              {editingWidget.tipo === 'table' && (
                <TableEditor
                  config={editingWidget.config}
                  onChange={(newConfig) => {
                    updateWidgetConfig(editingWidget.widget_id, newConfig)
                    setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, ...newConfig } })
                  }}
                />
              )}

              {editingWidget.tipo === 'excel_link' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Link (uno per riga: etichetta | URL)</label>
                  <textarea
                    rows={5}
                    value={(editingWidget.config.links || []).map(l => `${l.label || ''} | ${l.url || ''}`).join('\n')}
                    onChange={(e) => {
                      const links = e.target.value.split('\n').filter(l => l.trim()).map(l => {
                        const parts = l.split('|').map(s => s.trim())
                        return { label: parts[0], url: parts[1] || parts[0] }
                      })
                      updateWidgetConfig(editingWidget.widget_id, { links })
                      setEditingWidget({ ...editingWidget, config: { ...editingWidget.config, links } })
                    }}
                    className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                    placeholder={"Report Production | https://sharepoint.com/...\nOPL Linea 1 | \\\\server\\opl.xlsx"}
                  />
                </div>
              )}

              <button
                onClick={() => setEditingWidget(null)}
                className="w-full bg-primary text-white py-2 rounded-lg mt-4"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
