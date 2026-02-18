import { CheckIcon } from './Icons.jsx'
import './Sidebar.css'

export default function Sidebar({ chapters, toc, open, activeChapter }) {
  const scrollTo = (e, id) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className={`sidebar${open ? '' : ' sidebar--hidden'}`}>
      {toc && (
        <>
          <div className="sidebar-label">Contents</div>
          <a
            className="sb-item sb-toc-link"
            href="#toc"
            onClick={(e) => scrollTo(e, 'toc')}
          >
            <span className="sb-num">≡</span>
            <span className="sb-text">{toc.title}</span>
          </a>
          <div className="sidebar-label" style={{ marginTop: 14 }}>Chapters</div>
        </>
      )}
      {!toc && <div className="sidebar-label">Chapters</div>}

      {chapters.map((ch, i) => (
        <div key={i} className="sb-chapter-group">
          <a
            className={[
              'sb-item',
              activeChapter === i ? 'sb-item--active' : '',
              activeChapter > i  ? 'sb-item--done'   : '',
            ].filter(Boolean).join(' ')}
            href={`#ch-${i}`}
            onClick={(e) => scrollTo(e, `ch-${i}`)}
          >
            <span className="sb-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="sb-text">{ch.title}</span>
            <CheckIcon size={14} strokeWidth={2.5} />
          </a>

          {activeChapter === i && ch.sections && ch.sections.length > 0 && (
            <div className="sb-sections">
              {ch.sections.map((sec, j) => (
                <div
                  key={j}
                  className={`sb-section${sec.isH2 ? ' sb-section--h2' : ' sb-section--h3'}`}
                >
                  <span className="sb-section-dot" />
                  <span className="sb-section-text">{sec.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}
