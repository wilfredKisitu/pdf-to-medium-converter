import { useMemo } from 'react'
import CodeBlock from './CodeBlock.jsx'
import ImageBlock from './ImageBlock.jsx'
import PageBreak from './PageBreak.jsx'
import { ClockIcon, BookIcon } from './Icons.jsx'
import { parseBlocks, readTime } from '../lib/blockParser.js'
import { detectLang } from '../lib/langDetector.js'
import './ChapterSection.css'

/**
 * Render a paragraph, detecting:
 *  – backtick inline code spans  → <code>
 *  – inline chapter cross-refs   → <span className="chapter-ref">
 *  – plain text                  → string
 */
function renderInline(text) {
  const tokens = []
  let lastIdx = 0

  // Single combined regex: capture group 1 = code, group 2+3 = chapter ref
  const combined = /(`[^`]+`)|((?:Chapter|Section|Part|Appendix)\s+(?:[\dA-Z]+(?:\.[\d]+)*))/gi
  let m
  while ((m = combined.exec(text)) !== null) {
    if (m.index > lastIdx) {
      tokens.push({ type: 'text', value: text.slice(lastIdx, m.index) })
    }
    if (m[1]) {
      tokens.push({ type: 'code', value: m[1].slice(1, -1) })
    } else {
      tokens.push({ type: 'chapter-ref', value: m[2] })
    }
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIdx) })
  }

  return tokens.map((tok, i) => {
    if (tok.type === 'code')
      return <code key={i} className="inline-code">{tok.value}</code>
    if (tok.type === 'chapter-ref')
      return <span key={i} className="chapter-ref">{tok.value}</span>
    return tok.value
  })
}

export default function ChapterSection({ chapter, index }) {
  const blocks   = useMemo(() => parseBlocks(chapter.lines), [chapter.lines])
  const bodyText = chapter.lines.map(l => l.text).join(' ')
  const rt       = readTime(bodyText)

  return (
    <section
      className="chapter-sec"
      id={`ch-${index}`}
      data-chapter-index={index}
    >
      <div className="ch-eyebrow">Chapter {chapter.index || index + 1}</div>
      <h2 className="ch-title">{chapter.title}</h2>

      <div className="ch-meta">
        <span className="ch-meta-item"><ClockIcon />{rt}</span>
        <span className="ch-meta-item"><BookIcon />p.{chapter.pageStart}</span>
      </div>

      <div className="ch-body">
        {blocks.map((blk, i) => {
          if (blk.type === 'p')   return <p key={i}>{renderInline(blk.text)}</p>
          if (blk.type === 'h2')  return <h2 key={i}>{blk.text}</h2>
          if (blk.type === 'h3')  return <h3 key={i}>{blk.text}</h3>

          if (blk.type === 'code') {
            const lang = detectLang(blk.lines.join('\n'))
            return <CodeBlock key={i} code={blk.lines.join('\n')} lang={lang} />
          }

          // ── Image extracted from the PDF page ─────────────────────────
          if (blk.type === 'image') {
            return (
              <ImageBlock
                key={i}
                src={blk.src}
                width={blk.width}
                height={blk.height}
                naturalW={blk.naturalW}
                naturalH={blk.naturalH}
              />
            )
          }

          // ── Section-level mini TOC (chapter's own outline) ────────────
          // Styled consistently with the main document TOC (same indent
          // levels, same dot-separated entry / page-number layout) but
          // rendered inline without the full card wrapper.
          if (blk.type === 'section-toc') {
            return (
              <nav key={i} className="section-toc" aria-label="Section contents">
                <div className="section-toc-label">Contents</div>
                <ul className="section-toc-list">
                  {blk.entries.map((e, j) => (
                    <li key={j} className={`section-toc-entry section-toc-level-${e.level}`}>
                      <span className="section-toc-text">{e.text}</span>
                      {e.page != null && (
                        <span className="section-toc-page">{e.page}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            )
          }

          // ── Page separator with footer text ───────────────────────────
          if (blk.type === 'page-break') {
            return (
              <PageBreak
                key={i}
                pageNum={blk.pageNum}
                footerText={blk.footerText}
              />
            )
          }

          // ── Display equation ──────────────────────────────────────────
          if (blk.type === 'equation') {
            return (
              <div key={i} className="eq-block">
                <span className="eq-expr">{blk.text}</span>
                {blk.label && <span className="eq-label">{blk.label}</span>}
              </div>
            )
          }

          // ── Bibliography / references ─────────────────────────────────
          if (blk.type === 'references') {
            return (
              <ol key={i} className="ref-list">
                {blk.entries.map((entry, j) => (
                  <li key={j} className="ref-entry">{renderInline(entry)}</li>
                ))}
              </ol>
            )
          }

          return null
        })}
      </div>
    </section>
  )
}
