import { CheckIcon } from './Icons.jsx'
import './Sidebar.css'

export default function Sidebar({ chapters, open, activeChapter }) {
  const scrollTo = (e, id) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className={`sidebar${open ? '' : ' sidebar--hidden'}`}>
      <div className="sidebar-label">Chapters</div>

      {chapters.map((ch, i) => (
        <a
          key={i}
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
      ))}
    </nav>
  )
}
