import { useMemo } from 'react'
import CodeBlock from './CodeBlock.jsx'
import { ClockIcon, BookIcon } from './Icons.jsx'
import { parseBlocks, readTime } from '../lib/blockParser.js'
import { detectLang } from '../lib/langDetector.js'
import './ChapterSection.css'

/** Render text with backtick-wrapped inline code segments */
function renderInline(text) {
  return text.split(/(`[^`]+`)/).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>
    }
    return part
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
          return null
        })}
      </div>
    </section>
  )
}
