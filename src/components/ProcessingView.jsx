import './ProcessingView.css'

export default function ProcessingView({ data }) {
  const { status, overall, cards } = data

  return (
    <div className="processing-view">
      <div className="proc-wrap">
        <div className="proc-head">
          <h2>Converting your document</h2>
          <p>{status || 'Starting…'}</p>
        </div>

        <div className="overall-bar-wrap">
          <div className="bar-label">
            <span>Overall progress</span>
            <span>{Math.round(overall)}%</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${overall}%` }} />
          </div>
        </div>

        <div className="ch-cards">
          {cards.map((card, i) => (
            <ChapterCard key={i} card={card} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChapterCard({ card }) {
  const { title, status, pct, words, time } = card

  const LABELS = { pending: 'Pending', processing: 'Processing', done: 'Done' }

  return (
    <div className="ch-card">
      <div className="ch-card-top">
        <div className="ch-card-title">{title}</div>
        <span className={`ch-badge ch-badge--${status}`}>{LABELS[status]}</span>
      </div>
      <div className="ch-card-bar">
        <div className="ch-card-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="ch-card-meta">
        {words != null && <span>{words.toLocaleString()} words</span>}
        {time  != null && <span>{time}</span>}
      </div>
    </div>
  )
}
