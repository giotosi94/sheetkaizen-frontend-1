import React, { useState, useEffect, useRef } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Text, Line, Group, Transformer, RegularPolygon } from 'react-konva'
import { X, Save, Trash2 } from 'lucide-react'
import api from '../../services/api'
import { OPL_SYMBOLS, CATEGORIES } from './oplSymbols'

// ─────────────────────────────────────────────────────────────
// EDITOR PRINCIPALE
// ─────────────────────────────────────────────────────────────

export default function OplImageEditor({ documento, imageBlobUrl, onClose, onSaved }) {
  const [image, setImage] = useState(null)
  const [imageSize, setImageSize] = useState({ width: 800, height: 600 })
  const [annotations, setAnnotations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [activeCategory, setActiveCategory] = useState('feedback')
  const [saving, setSaving] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  const stageRef = useRef(null)
  const containerRef = useRef(null)

  // Carica immagine
  useEffect(() => {
    if (!imageBlobUrl) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageBlobUrl
    img.onload = () => {
      setImage(img)
      const naturalW = img.naturalWidth
      const naturalH = img.naturalHeight
      setImageSize({ width: naturalW, height: naturalH })
      fitStageToContainer(naturalW, naturalH)
    }
  }, [imageBlobUrl])

  // Carica annotazioni esistenti dal documento
  useEffect(() => {
    const existing = documento?.opl_data?.annotations || []
    setAnnotations(existing)
  }, [documento])

  // Fit dello stage al container
  function fitStageToContainer(imgW, imgH) {
    if (!containerRef.current) return
    const maxW = containerRef.current.clientWidth - 20
    const maxH = containerRef.current.clientHeight - 20
    const scale = Math.min(maxW / imgW, maxH / imgH, 1)
    setStageSize({
      width: imgW * scale,
      height: imgH * scale,
    })
  }

  useEffect(() => {
    const onResize = () => fitStageToContainer(imageSize.width, imageSize.height)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [imageSize])

  // Rapporto scala tra visualizzato e originale
  const scaleX = stageSize.width / imageSize.width || 1
  const scaleY = stageSize.height / imageSize.height || 1

  // Upload immagine custom -> compressione -> aggiungi come annotazione
  async function handleCustomImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Immagine troppo grande (max 5 MB)')
      return
    }
    try {
      const dataUrl = await compressToBase64(file, 800, 0.85)
      const { width, height } = await getImageSize(dataUrl)
      // Scale iniziale: massimo 30% dell'immagine base
      const maxW = imageSize.width * 0.3
      const scale = width > maxW ? maxW / width : 1
      const w = width * scale
      const h = height * scale
      const cx = imageSize.width / 2
      const cy = imageSize.height / 2
      const newAnn = {
        id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        symbolId: '__custom_image__',
        x: cx - w / 2,
        y: cy - h / 2,
        width: w,
        height: h,
        rotation: 0,
        imageData: dataUrl,
      }
      setAnnotations(prev => [...prev, newAnn])
      setSelectedId(newAnn.id)
      e.target.value = '' // reset input
    } catch (err) {
      alert('Errore caricamento immagine: ' + err.message)
    }
  }

  // Aggiungi simbolo al centro dell'immagine (in coordinate originali)
  function addSymbol(symbol) {
    const cx = imageSize.width / 2
    const cy = imageSize.height / 2
    const newAnn = {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      symbolId: symbol.id,
      x: cx - symbol.defaultWidth / 2,
      y: cy - symbol.defaultHeight / 2,
      width: symbol.defaultWidth,
      height: symbol.defaultHeight,
      rotation: 0,
      text: symbol.type === 'text' ? symbol.text : undefined,
    }
    setAnnotations(prev => [...prev, newAnn])
    setSelectedId(newAnn.id)
  }

  function updateAnnotation(id, updates) {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  function deleteAnnotation(id) {
    setAnnotations(prev => prev.filter(a => a.id !== id))
    setSelectedId(null)
  }

  function deleteSelected() {
    if (selectedId) deleteAnnotation(selectedId)
  }

  // Delete su tastiera
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        deleteSelected()
      }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  // Salva annotazioni sul backend
  async function handleSave() {
    setSaving(true)
    try {
      await api.patch(`/documenti/${documento._id}/opl-annotations`, {
        annotations,
      })
      onSaved?.()
      onClose?.()
    } catch (err) {
      alert('Errore salvataggio annotazioni: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  const symbolsInCategory = OPL_SYMBOLS.filter(s => s.category === activeCategory)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl w-full max-w-7xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-yellow-500 text-white px-5 py-3 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg">Editor annotazioni immagine</h2>
            <div className="text-xs opacity-90">{documento?.numero} · {documento?.titolo}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-white text-yellow-700 px-4 py-1.5 rounded font-medium text-sm hover:bg-yellow-50 flex items-center gap-1 disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva'}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-yellow-600 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Canvas area */}
          <div ref={containerRef} className="flex-1 bg-gray-200 flex items-center justify-center overflow-auto p-3">
            {image ? (
              <div style={{ background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                <Stage
                  ref={stageRef}
                  width={stageSize.width}
                  height={stageSize.height}
                  scaleX={scaleX}
                  scaleY={scaleY}
                  onClick={(e) => {
                    if (e.target === e.target.getStage()) setSelectedId(null)
                  }}
                >
                  <Layer>
                    <KonvaImage image={image} width={imageSize.width} height={imageSize.height} />
                  </Layer>
                  <Layer>
                    {annotations.map(ann => (
                      <AnnotationNode
                        key={ann.id}
                        annotation={ann}
                        isSelected={ann.id === selectedId}
                        onSelect={() => setSelectedId(ann.id)}
                        onChange={(updates) => updateAnnotation(ann.id, updates)}
                      />
                    ))}
                  </Layer>
                </Stage>
              </div>
            ) : (
              <div className="text-gray-500">Caricamento immagine...</div>
            )}
          </div>

          {/* Palette laterale */}
          <div className="w-64 border-l bg-gray-50 flex flex-col flex-shrink-0">
            <div className="p-3 border-b bg-white">
              <div className="text-xs font-bold uppercase text-gray-500 mb-2">Categoria</div>
              <div className="grid grid-cols-2 gap-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-2 py-1.5 rounded text-xs font-medium ${
                      activeCategory === cat.id
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <label className="w-full bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-3 hover:bg-blue-100 flex items-center gap-2 cursor-pointer text-left transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomImageUpload}
                  className="hidden"
                />
                <div className="text-2xl w-10 h-10 flex items-center justify-center bg-white rounded flex-shrink-0">
                  📎
                </div>
                <div className="text-xs font-medium text-blue-800 flex-1">
                  Carica immagine custom
                </div>
              </label>

              {symbolsInCategory.map(sym => (
                <button
                  key={sym.id}
                  onClick={() => addSymbol(sym)}
                  className="w-full bg-white border rounded-lg p-2 hover:border-yellow-500 hover:shadow flex items-center gap-2 text-left transition-all"
                >
                  <div className="text-2xl w-10 h-10 flex items-center justify-center bg-gray-50 rounded flex-shrink-0">
                    {sym.preview}
                  </div>
                  <div className="text-xs font-medium text-gray-700 flex-1">
                    {sym.label}
                  </div>
                </button>
              ))}
            </div>

            {selectedId && (
              <div className="p-3 border-t bg-red-50">
                <button
                  onClick={deleteSelected}
                  className="w-full bg-red-500 text-white py-2 rounded font-medium text-sm hover:bg-red-600 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Elimina selezionato
                </button>
                <div className="text-[10px] text-red-700 mt-1 text-center">
                  Oppure premi Canc / Backspace
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-gray-100 border-t px-4 py-2 text-xs text-gray-600 flex justify-between flex-shrink-0">
          <div>
            <strong>{annotations.length}</strong> annotazioni · Click su un elemento per selezionarlo, trascinalo per spostarlo, usa le maniglie per ridimensionarlo
          </div>
          <div>Canvas: {Math.round(stageSize.width)} × {Math.round(stageSize.height)} px</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CUSTOM IMAGE NODE (immagine caricata dall'utente)
// ─────────────────────────────────────────────────────────────

function CustomImageNode({ annotation, shapeRef, onSelect, onChange }) {
  const [img, setImg] = useState(null)

  useEffect(() => {
    if (!annotation.imageData) return
    const image = new window.Image()
    image.src = annotation.imageData
    image.onload = () => setImg(image)
  }, [annotation.imageData])

  if (!img) return null

  return (
    <KonvaImage
      ref={shapeRef}
      image={img}
      x={annotation.x}
      y={annotation.y}
      width={annotation.width}
      height={annotation.height}
      rotation={annotation.rotation || 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = shapeRef.current
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(20, node.width() * scaleX),
          height: Math.max(20, node.height() * scaleY),
          rotation: node.rotation(),
        })
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// SINGOLA ANNOTAZIONE (con Transformer per resize)
// ─────────────────────────────────────────────────────────────

function AnnotationNode({ annotation, isSelected, onSelect, onChange }) {
  const symbol = OPL_SYMBOLS.find(s => s.id === annotation.symbolId)
  const shapeRef = useRef()
  const trRef = useRef()

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [isSelected])

  if (!symbol) return null

  const commonProps = {
    ref: shapeRef,
    x: annotation.x,
    y: annotation.y,
    width: annotation.width,
    height: annotation.height,
    rotation: annotation.rotation || 0,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e) => onChange({ x: e.target.x(), y: e.target.y() }),
    onTransformEnd: (e) => {
      const node = shapeRef.current
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)
      onChange({
        x: node.x(),
        y: node.y(),
        width: Math.max(20, node.width() * scaleX),
        height: Math.max(20, node.height() * scaleY),
        rotation: node.rotation(),
      })
    },
  }

  let renderedShape = null

  // Immagini custom caricate dall'utente
  if (annotation.symbolId === '__custom_image__' && annotation.imageData) {
    return (
      <>
        <CustomImageNode
          annotation={annotation}
          shapeRef={shapeRef}
          onSelect={onSelect}
          onChange={onChange}
        />
        {isSelected && (
          <Transformer
            ref={trRef}
            rotateEnabled
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20 || newBox.height < 20) return oldBox
              return newBox
            }}
          />
        )}
      </>
    )
  }

  if (symbol.type === 'text') {
    renderedShape = (
      <Text
        {...commonProps}
        text={annotation.text || symbol.text}
        fontSize={symbol.fontSize}
        fontStyle={symbol.fontStyle}
        fill={symbol.color}
        align="center"
        verticalAlign="middle"
      />
    )
  } else if (symbol.render === 'ko_circle') {
    renderedShape = (
      <Group {...commonProps}>
        <Circle
          x={annotation.width / 2}
          y={annotation.height / 2}
          radius={Math.min(annotation.width, annotation.height) / 2}
          fill="#DC2626"
          stroke="#7F1D1D"
          strokeWidth={3}
        />
        <Text
          x={0}
          y={0}
          width={annotation.width}
          height={annotation.height}
          text="✕"
          fontSize={annotation.height * 0.6}
          fontStyle="bold"
          fill="white"
          align="center"
          verticalAlign="middle"
        />
      </Group>
    )
  } else if (symbol.render === 'ok_circle') {
    renderedShape = (
      <Group {...commonProps}>
        <Circle
          x={annotation.width / 2}
          y={annotation.height / 2}
          radius={Math.min(annotation.width, annotation.height) / 2}
          fill="#16A34A"
          stroke="#14532D"
          strokeWidth={3}
        />
        <Text
          x={0}
          y={0}
          width={annotation.width}
          height={annotation.height}
          text="✓"
          fontSize={annotation.height * 0.6}
          fontStyle="bold"
          fill="white"
          align="center"
          verticalAlign="middle"
        />
      </Group>
    )
  } else if (symbol.render === 'warning') {
    renderedShape = (
      <Group {...commonProps}>
        <RegularPolygon
          x={annotation.width / 2}
          y={annotation.height / 2}
          sides={3}
          radius={Math.min(annotation.width, annotation.height) / 2}
          fill="#FBBF24"
          stroke="#000"
          strokeWidth={3}
        />
        <Text
          x={0}
          y={annotation.height * 0.2}
          width={annotation.width}
          height={annotation.height}
          text="!"
          fontSize={annotation.height * 0.5}
          fontStyle="bold"
          fill="black"
          align="center"
        />
      </Group>
    )
  } else if (symbol.render === 'info') {
    renderedShape = (
      <Group {...commonProps}>
        <Circle
          x={annotation.width / 2}
          y={annotation.height / 2}
          radius={Math.min(annotation.width, annotation.height) / 2}
          fill="#2563EB"
          stroke="#1E3A8A"
          strokeWidth={3}
        />
        <Text
          x={0}
          y={0}
          width={annotation.width}
          height={annotation.height}
          text="i"
          fontSize={annotation.height * 0.6}
          fontStyle="italic bold"
          fill="white"
          align="center"
          verticalAlign="middle"
        />
      </Group>
    )
  } else if (symbol.render === 'arrow') {
    const c = symbol.color || '#DC2626'
    // Freccia orizzontale che punta a sinistra
    const w = annotation.width
    const h = annotation.height
    const bodyH = h * 0.5
    const headW = w * 0.4
    renderedShape = (
      <Group {...commonProps}>
        <Line
          points={[
            headW, (h - bodyH) / 2,
            w, (h - bodyH) / 2,
            w, (h + bodyH) / 2,
            headW, (h + bodyH) / 2,
            headW, h,
            0, h / 2,
            headW, 0,
            headW, (h - bodyH) / 2,
          ]}
          closed
          fill={c}
          stroke="#000"
          strokeWidth={2}
        />
      </Group>
    )
  } else if (symbol.render === 'rect') {
    renderedShape = (
      <Rect
        {...commonProps}
        fill="transparent"
        stroke={symbol.color}
        strokeWidth={5}
        cornerRadius={4}
      />
    )
  } else if (symbol.render === 'circle') {
    renderedShape = (
      <Group {...commonProps}>
        <Circle
          x={annotation.width / 2}
          y={annotation.height / 2}
          radius={Math.min(annotation.width, annotation.height) / 2}
          fill="transparent"
          stroke={symbol.color}
          strokeWidth={5}
        />
      </Group>
    )
  } else if (symbol.type === 'icon') {
    const isHazard = symbol.category === 'hazard'
    renderedShape = (
      <Group {...commonProps}>
        {isHazard ? (
          <RegularPolygon
            x={annotation.width / 2}
            y={annotation.height / 2}
            sides={3}
            radius={Math.min(annotation.width, annotation.height) / 2}
            fill={symbol.color}
            stroke="#000"
            strokeWidth={3}
          />
        ) : (
          <Circle
            x={annotation.width / 2}
            y={annotation.height / 2}
            radius={Math.min(annotation.width, annotation.height) / 2}
            fill={symbol.color}
            stroke="#000"
            strokeWidth={3}
          />
        )}
        <Text
          x={0}
          y={isHazard ? annotation.height * 0.2 : 0}
          width={annotation.width}
          height={annotation.height}
          text={symbol.preview}
          fontSize={annotation.height * 0.5}
          align="center"
          verticalAlign="middle"
        />
      </Group>
    )
  }

  return (
    <>
      {renderedShape}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox
            return newBox
          }}
        />
      )}
    </>
  )
}
// ─────────────────────────────────────────────────────────────
// Helpers utility per upload immagini custom
// ─────────────────────────────────────────────────────────────

function compressToBase64(file, maxSize = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        let w = img.width
        let h = img.height
        if (w > h && w > maxSize) {
          h = h * (maxSize / w)
          w = maxSize
        } else if (h > maxSize) {
          w = w * (maxSize / h)
          h = maxSize
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getImageSize(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}
