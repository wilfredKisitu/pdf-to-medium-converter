import './TocSection.css'

/**
 * Renders the Table of Contents as a distinct visual section,
 * clearly separated from chapter content. Entries preserve their
 * indentation levels (0 = top-level, 1 = sub, 2 = sub-sub).
 */
export default function TocSection({ toc }) {
  if (!toc || !toc.entries.length) return null

  return (
    <section className="toc-section" id="toc">
      <div className="toc-eyebrow">Table of Contents</div>
      <h2 className="toc-heading">{toc.title}</h2>

      <ol className="toc-list">
        {toc.entries.map((entry, i) => (
          <li
            key={i}
            className={`toc-entry toc-level-${entry.level}`}
          >
            <span className="toc-entry-text">{entry.text}</span>
            {entry.page != null && (
              <span className="toc-entry-page">{entry.page}</span>
            )}
          </li>
        ))}
      </ol>

      <div className="toc-divider">
        <div className="toc-divider-dots">
          <span /><span /><span />
        </div>
      </div>
    </section>
  )
}
