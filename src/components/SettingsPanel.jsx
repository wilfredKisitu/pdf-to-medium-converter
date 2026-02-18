import './SettingsPanel.css'

const FONTS = [
  {
    key:     'serif',
    label:   'Serif',
    preview: 'Ag',
    stack:   "charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif",
  },
  {
    key:     'sans',
    label:   'Sans',
    preview: 'Ag',
    stack:   "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    key:     'georgia',
    label:   'Georgia',
    preview: 'Ag',
    stack:   "Georgia, 'Times New Roman', serif",
  },
  {
    key:     'inter',
    label:   'Inter',
    preview: 'Ag',
    stack:   "'Inter', sans-serif",
  },
  {
    key:     'merriweather',
    label:   'Merri',
    preview: 'Ag',
    stack:   "'Merriweather', Georgia, serif",
  },
]

export const DEFAULT_SETTINGS = {
  font:          'serif',
  twoCol:        false,
  fontSize:      20,
  lineHeight:    1.78,
  letterSpacing: 0,
  paraSpacing:   26,
}

export function fontStack(key) {
  return FONTS.find(f => f.key === key)?.stack ?? FONTS[0].stack
}

function Slider({ label, value, min, max, step, format, onChange }) {
  return (
    <div className="sp-slider-row">
      <div className="sp-slider-header">
        <span className="sp-slider-label">{label}</span>
        <span className="sp-slider-val">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(+e.target.value)}
        className="sp-range"
      />
    </div>
  )
}

export default function SettingsPanel({ open, settings, onChange, onClose }) {
  const set = (key, val) => onChange({ ...settings, [key]: val })

  return (
    <>
      {open && <div className="sp-backdrop" onClick={onClose} />}
      <aside className={`settings-panel${open ? ' settings-panel--open' : ''}`}>

        <div className="sp-header">
          <span className="sp-title">Reading Settings</span>
          <button className="sp-close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        {/* ── Font ── */}
        <section className="sp-section">
          <div className="sp-section-label">Font</div>
          <div className="sp-font-grid">
            {FONTS.map(f => (
              <button
                key={f.key}
                className={`sp-font-btn${settings.font === f.key ? ' sp-font-btn--active' : ''}`}
                style={{ fontFamily: f.stack }}
                onClick={() => set('font', f.key)}
                title={f.label}
              >
                <span className="sp-font-preview">{f.preview}</span>
                <span className="sp-font-name">{f.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Display ── */}
        <section className="sp-section">
          <div className="sp-section-label">Display</div>
          <div className="sp-toggle-row">
            <button
              className={`sp-col-btn${!settings.twoCol ? ' sp-col-btn--active' : ''}`}
              onClick={() => set('twoCol', false)}
            >
              <div className="sp-col-icon sp-col-icon--1" />
              Single column
            </button>
            <button
              className={`sp-col-btn${settings.twoCol ? ' sp-col-btn--active' : ''}`}
              onClick={() => set('twoCol', true)}
            >
              <div className="sp-col-icon sp-col-icon--2" />
              Two columns
            </button>
          </div>
        </section>

        {/* ── Text Size ── */}
        <section className="sp-section">
          <div className="sp-section-label">Text Size</div>
          <Slider
            label="Font Size"
            value={settings.fontSize}
            min={14} max={28} step={1}
            format={v => `${v}px`}
            onChange={v => set('fontSize', v)}
          />
        </section>

        {/* ── Spacing ── */}
        <section className="sp-section">
          <div className="sp-section-label">Spacing</div>
          <Slider
            label="Line Height"
            value={settings.lineHeight}
            min={1.2} max={2.4} step={0.1}
            format={v => v.toFixed(1)}
            onChange={v => set('lineHeight', v)}
          />
          <Slider
            label="Letter Spacing"
            value={settings.letterSpacing}
            min={-0.02} max={0.15} step={0.01}
            format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}em`}
            onChange={v => set('letterSpacing', v)}
          />
          <Slider
            label="Paragraph Spacing"
            value={settings.paraSpacing}
            min={12} max={64} step={2}
            format={v => `${v}px`}
            onChange={v => set('paraSpacing', v)}
          />
        </section>

        {/* ── Reset ── */}
        <button className="sp-reset" onClick={() => onChange(DEFAULT_SETTINGS)}>
          Reset to defaults
        </button>

      </aside>
    </>
  )
}
