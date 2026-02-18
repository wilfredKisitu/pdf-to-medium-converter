import { useRef } from 'react'
import { useApp } from '../contexts/AppContext.jsx'
import { DocIcon, UploadIcon, CheckIcon, SunIcon, MoonIcon } from './Icons.jsx'
import './UploadView.css'

const FEATURES = [
  'Chapter detection',
  'Code highlighting',
  'Text highlighting',
  'Progress per chapter',
  'Dark & light mode',
]

export default function UploadView({ onFile }) {
  const { theme, toggleTheme } = useApp()
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drop-zone--over')
    onFile(e.dataTransfer.files[0])
  }

  return (
    <div className="upload-view">
      <button className="g-theme-btn" onClick={toggleTheme} title="Toggle theme">
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="brand">
        <div className="brand-mark"><DocIcon /></div>
        <span className="brand-name">PDFolio</span>
      </div>

      <div className="upload-hero">
        <h1>Transform your PDF into<br />a beautiful article</h1>
        <p>
          Drop a PDF and get a chapter-by-chapter reading experience —
          complete with code highlighting, annotations, and dark mode.
        </p>
      </div>

      <div
        className="drop-zone"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drop-zone--over') }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drop-zone--over')}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => onFile(e.target.files[0])}
        />
        <div className="drop-icon"><UploadIcon /></div>
        <h3>Drop your PDF here</h3>
        <p>or click to choose a file</p>
        <div className="drop-cta">Browse PDF</div>
      </div>

      <div className="feature-pills">
        {FEATURES.map(f => (
          <div className="pill" key={f}>
            <CheckIcon size={13} strokeWidth={2.5} />
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}
