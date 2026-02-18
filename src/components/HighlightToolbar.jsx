import { XIcon } from './Icons.jsx'
import './HighlightToolbar.css'

const COLORS = [
  { id: 'y', bg: 'rgba(255,222,0,.85)',  label: 'Yellow' },
  { id: 'b', bg: 'rgba(60,160,255,.75)', label: 'Blue'   },
  { id: 'g', bg: 'rgba(0,210,100,.75)',  label: 'Green'  },
  { id: 'p', bg: 'rgba(255,50,120,.75)', label: 'Pink'   },
]

export default function HighlightToolbar({ toolbar, onApply, onRemove }) {
  if (!toolbar.visible) return null

  const style = {
    left: toolbar.x,
    top:  toolbar.y,
    transform: 'translateX(-50%) translateY(calc(-100% - 14px))',
  }

  return (
    <div id="hl-toolbar" className="hl-toolbar" style={style}>
      {COLORS.map(c => (
        <button
          key={c.id}
          className="hl-swatch"
          style={{ background: c.bg }}
          title={c.label}
          onMouseDown={(e) => e.preventDefault()} // prevent losing selection
          onClick={() => onApply(c.id)}
        />
      ))}
      <div className="hl-sep" />
      <button
        className="hl-act"
        title="Remove highlight"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRemove}
      >
        <XIcon />
      </button>
    </div>
  )
}
