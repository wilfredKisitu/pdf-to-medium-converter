function ry(n) { return Math.round(n) }

export function toLines(items) {
  const map = new Map()
  for (const it of items) {
    const y = ry(it.transform[5])
    if (!map.has(y)) map.set(y, { y, text: '', fontSize: 0, fontName: '', items: [] })
    const ln    = map.get(y)
    ln.text     += it.str
    ln.fontSize  = Math.max(ln.fontSize, it.height || Math.abs(it.transform[3]) || 0)
    ln.fontName  = ln.fontName || (it.fontName || '')
    ln.items.push(it)
  }
  return [...map.values()].sort((a, b) => b.y - a.y)
}

export function medianFontSize(allLines) {
  const sizes = allLines
    .map(l => Math.round(l.fontSize))
    .filter(s => s > 4)
    .sort((a, b) => a - b)
  if (!sizes.length) return 12
  return sizes[Math.floor(sizes.length / 2)]
}

function isHeadingLine(line, body) {
  const t = line.text.trim()
  if (!t || t.length < 2) return false
  const big     = line.fontSize >= body * 1.28
  const short   = t.length < 90
  const upper   = /^[A-Z0-9\u00C0-\u024F]/.test(t)
  const pattern = /^(chapter|part|section|appendix)\s+[\diIvVxX]/i.test(t)
               || /^\d{1,2}[\.\)]\s+[A-Z]/.test(t)
               || /^[IVX]+\.\s+[A-Z]/.test(t)
  return pattern || (big && short && upper)
}

export function detectChapters(pageData, body) {
  const chapters = []
  let cur = null
  let idx = 0

  for (const { pageNum, lines } of pageData) {
    for (const ln of lines) {
      const t = ln.text.trim()
      if (!t) continue

      if (isHeadingLine(ln, body)) {
        if (cur && cur.lines.length) chapters.push(cur)
        idx++
        cur = { index: idx, title: t, lines: [], pageStart: pageNum }
      } else if (cur) {
        cur.lines.push({ ...ln, text: t, body, pageNum })
      } else if (t.length > 1 && !/^\d+$/.test(t)) {
        if (!cur) cur = { index: 0, title: 'Preface', lines: [], pageStart: pageNum }
        cur.lines.push({ ...ln, text: t, body, pageNum })
      }
    }
  }

  if (cur && cur.lines.length) chapters.push(cur)

  if (!chapters.length) {
    const all = pageData.flatMap(p =>
      p.lines
        .map(l => ({ ...l, text: l.text.trim(), body, pageNum: p.pageNum }))
        .filter(l => l.text)
    )
    chapters.push({ index: 1, title: 'Document Content', lines: all, pageStart: 1 })
  }

  return chapters
}
