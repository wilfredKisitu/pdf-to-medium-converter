import { useEffect } from 'react'
import ChapterSection from './ChapterSection.jsx'
import TocSection from './TocSection.jsx'
import './ArticleContent.css'

export default function ArticleContent({ docName, chapters, toc, onChapterVisible }) {
  // Observe which chapter is in view → drives sidebar active state
  useEffect(() => {
    const sections = document.querySelectorAll('.chapter-sec')
    if (!sections.length) return

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          onChapterVisible(parseInt(entry.target.dataset.chapterIndex, 10))
        }
      })
    }, { threshold: 0.15 })

    sections.forEach(s => obs.observe(s))
    return () => obs.disconnect()
  }, [chapters, onChapterVisible])

  const totalWords = chapters.reduce(
    (sum, ch) => sum + ch.lines.map(l => l.text).join(' ').split(/\s+/).length,
    0
  )
  const totalTime = Math.max(1, Math.ceil(totalWords / 220))

  return (
    <div className="article-content">
      {/* Document header */}
      <h1 className="doc-title">{docName}</h1>
      <div className="doc-byline">
        <div className="doc-avatar">📖</div>
        <div>
          <div className="doc-meta-author">{docName}</div>
          <div className="doc-meta-sub">
            {chapters.length} chapters · {totalTime} min read · {totalWords.toLocaleString()} words
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      {toc && <TocSection toc={toc} />}

      {/* Chapters */}
      {chapters.map((ch, i) => (
        <div key={i}>
          <ChapterSection chapter={ch} index={i} />
          {i < chapters.length - 1 && (
            <div className="ch-divider">
              <div className="ch-divider-dots">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
