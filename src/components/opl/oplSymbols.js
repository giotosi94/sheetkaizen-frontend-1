// ─────────────────────────────────────────────────────────────
// OPL Symbols Library
// Definizione simboli standard per annotazioni immagine OPL
// ─────────────────────────────────────────────────────────────

export const OPL_SYMBOLS = [
  // ───── FEEDBACK VISIVI ─────
  { id: 'ko_circle', label: 'KO (cerchio)', category: 'feedback', type: 'shape', render: 'ko_circle', defaultWidth: 80, defaultHeight: 80, preview: '❌' },
  { id: 'ok_circle', label: 'OK (cerchio)', category: 'feedback', type: 'shape', render: 'ok_circle', defaultWidth: 80, defaultHeight: 80, preview: '✅' },
  { id: 'warning', label: 'Warning', category: 'feedback', type: 'shape', render: 'warning', defaultWidth: 80, defaultHeight: 80, preview: '⚠️' },
  { id: 'info', label: 'Info', category: 'feedback', type: 'shape', render: 'info', defaultWidth: 80, defaultHeight: 80, preview: 'ℹ️' },

  // ───── TESTI STANDARD ─────
  { id: 'text_ko', label: 'Testo "KO"', category: 'text', type: 'text', text: 'KO', color: '#DC2626', fontSize: 48, fontStyle: 'bold', defaultWidth: 100, defaultHeight: 60, preview: 'KO' },
  { id: 'text_ok', label: 'Testo "OK"', category: 'text', type: 'text', text: 'OK', color: '#16A34A', fontSize: 48, fontStyle: 'bold', defaultWidth: 100, defaultHeight: 60, preview: 'OK' },
  { id: 'text_free', label: 'Testo libero', category: 'text', type: 'text', text: 'Testo', color: '#000000', fontSize: 24, fontStyle: 'normal', defaultWidth: 150, defaultHeight: 40, preview: 'Aa' },

  // ───── FRECCE ─────
  { id: 'arrow_red', label: 'Freccia rossa', category: 'arrow', type: 'shape', render: 'arrow', color: '#DC2626', defaultWidth: 120, defaultHeight: 60, preview: '⬅️' },
  { id: 'arrow_green', label: 'Freccia verde', category: 'arrow', type: 'shape', render: 'arrow', color: '#16A34A', defaultWidth: 120, defaultHeight: 60, preview: '➡️' },
  { id: 'arrow_yellow', label: 'Freccia gialla', category: 'arrow', type: 'shape', render: 'arrow', color: '#F59E0B', defaultWidth: 120, defaultHeight: 60, preview: '🟡' },
  { id: 'arrow_blue', label: 'Freccia blu', category: 'arrow', type: 'shape', render: 'arrow', color: '#2563EB', defaultWidth: 120, defaultHeight: 60, preview: '🔵' },

  // ───── CORNICI ─────
  { id: 'rect_red', label: 'Cornice rossa', category: 'frame', type: 'shape', render: 'rect', color: '#DC2626', defaultWidth: 200, defaultHeight: 100, preview: '🔴' },
  { id: 'rect_green', label: 'Cornice verde', category: 'frame', type: 'shape', render: 'rect', color: '#16A34A', defaultWidth: 200, defaultHeight: 100, preview: '🟢' },
  { id: 'circle_red', label: 'Cerchio rosso', category: 'frame', type: 'shape', render: 'circle', color: '#DC2626', defaultWidth: 120, defaultHeight: 120, preview: '⭕' },
  { id: 'circle_green', label: 'Cerchio verde', category: 'frame', type: 'shape', render: 'circle', color: '#16A34A', defaultWidth: 120, defaultHeight: 120, preview: '🟢' },

  // ───── DPI (Dispositivi Protezione Individuale) ─────
  { id: 'dpi_helmet', label: 'Elmetto', category: 'dpi', type: 'icon', icon: 'helmet', color: '#2563EB', defaultWidth: 80, defaultHeight: 80, preview: '⛑️' },
  { id: 'dpi_glasses', label: 'Occhiali', category: 'dpi', type: 'icon', icon: 'glasses', color: '#2563EB', defaultWidth: 80, defaultHeight: 80, preview: '🥽' },
  { id: 'dpi_earmuffs', label: 'Cuffie antirumore', category: 'dpi', type: 'icon', icon: 'earmuffs', color: '#2563EB', defaultWidth: 80, defaultHeight: 80, preview: '🎧' },
  { id: 'dpi_gloves', label: 'Guanti', category: 'dpi', type: 'icon', icon: 'gloves', color: '#2563EB', defaultWidth: 80, defaultHeight: 80, preview: '🧤' },
  { id: 'dpi_shoes', label: 'Scarpe antinfortunistiche', category: 'dpi', type: 'icon', icon: 'shoes', color: '#2563EB', defaultWidth: 80, defaultHeight: 80, preview: '👟' },
  { id: 'dpi_mask', label: 'Mascherina', category: 'dpi', type: 'icon', icon: 'mask', color: '#2563EB', defaultWidth: 80, defaultHeight: 80, preview: '😷' },
  { id: 'dpi_vest', label: 'Giubbotto alta visibilità', category: 'dpi', type: 'icon', icon: 'vest', color: '#F59E0B', defaultWidth: 80, defaultHeight: 80, preview: '🦺' },

  // ───── PERICOLI ─────
  { id: 'hazard_electric', label: 'Elettricità', category: 'hazard', type: 'icon', icon: 'electric', color: '#FBBF24', defaultWidth: 80, defaultHeight: 80, preview: '⚡' },
  { id: 'hazard_hot', label: 'Superficie calda', category: 'hazard', type: 'icon', icon: 'hot', color: '#DC2626', defaultWidth: 80, defaultHeight: 80, preview: '🔥' },
  { id: 'hazard_corrosive', label: 'Corrosivo', category: 'hazard', type: 'icon', icon: 'corrosive', color: '#DC2626', defaultWidth: 80, defaultHeight: 80, preview: '⚗️' },
  { id: 'hazard_gears', label: 'Parti in movimento', category: 'hazard', type: 'icon', icon: 'gears', color: '#DC2626', defaultWidth: 80, defaultHeight: 80, preview: '⚙️' },
  { id: 'hazard_radiation', label: 'Radiazioni', category: 'hazard', type: 'icon', icon: 'radiation', color: '#DC2626', defaultWidth: 80, defaultHeight: 80, preview: '☢️' },
  { id: 'hazard_generic', label: 'Pericolo generico', category: 'hazard', type: 'icon', icon: 'hazard_generic', color: '#FBBF24', defaultWidth: 80, defaultHeight: 80, preview: '⚠️' },
]

export const CATEGORIES = [
  { id: 'feedback', label: 'Feedback', icon: '👍' },
  { id: 'text', label: 'Testi', icon: '🔤' },
  { id: 'arrow', label: 'Frecce', icon: '➡️' },
  { id: 'frame', label: 'Cornici', icon: '🔲' },
  { id: 'dpi', label: 'DPI', icon: '🦺' },
  { id: 'hazard', label: 'Pericoli', icon: '⚠️' },
]
