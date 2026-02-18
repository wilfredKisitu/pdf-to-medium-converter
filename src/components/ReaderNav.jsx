import { useApp } from '../contexts/AppContext.jsx'
import { MenuIcon, DocIcon, SunIcon, MoonIcon } from './Icons.jsx'
import './ReaderNav.css'

export default function ReaderNav({ docName, progress, onToggleSidebar, onNewDoc }) {
  const { theme, toggleTheme } = useApp()

  return (
    <nav className="reader-nav">
      <div className="reader-nav-inner">
        <div className="reader-brand">
          <div className="reader-brand-dot" />
          PDFolio
        </div>

        <div className="reader-doc-name">{docName}</div>

        <div className="reader-actions">
          <button className="icon-btn" onClick={onToggleSidebar} title="Toggle chapters">
            <MenuIcon />
          </button>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="icon-btn" onClick={onNewDoc} title="Open new PDF">
            <DocIcon />
          </button>
        </div>
      </div>

      <div className="read-progress" style={{ width: `${progress}%` }} />
    </nav>
  )
}
