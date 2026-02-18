import { normalizeStr } from './charNormalizer.js'

function ry(n) { return Math.round(n) }

export function toLines(items) {
  const map = new Map()
  for (const it of items) {
    const y = ry(it.transform[5])
    if (!map.has(y)) map.set(y, { y, text: '', fontSize: 0, fontName: '', items: [] })
    const ln    = map.get(y)
    // normalizeStr fixes ligatures, Win-1252 C1 glitches, PUA codepoints,
    // soft hyphens, and recombines decomposed diacritics via NFC.
    ln.text     += normalizeStr(it.str)
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

// ── TOC detection ──────────────────────────────────────────────────────────

/**
 * True if a trimmed line text looks like a TOC entry.
 * Matches: "Introduction ......... 1"  or  "1.2 Overview\t12"
 */
function isTocLine(text) {
  const t = text.trim()
  return /^.+[\.\s]{3,}\d+\s*$/.test(t) || /^.+\t\d+\s*$/.test(t)
}

/**
 * True if the lines of a page collectively look like a Table of Contents.
 * Signals:
 *  1. Explicit TOC header ("Table of Contents" / "Contents") on first line.
 *  2. ≥55 % of lines match dot-leader / tab-separated page-number pattern.
 *  3. Combined: ≥40 % dot-leader lines AND most text lines are body-sized or
 *     smaller (not heading-sized), indicating a listing page rather than prose.
 *
 * @param {object[]} lines  – line objects with .text and .fontSize
 * @param {number}   [body] – median body font size for the document
 */
function isTocPage(lines, body) {
  const texts = lines.map(l => l.text.trim()).filter(t => t.length > 1)
  if (texts.length < 2) return false

  // Signal 1 — explicit TOC header on first significant line
  if (/^(table\s+of\s+contents?|contents?)\s*$/i.test(texts[0])) return true

  const tocCount = texts.filter(isTocLine).length

  // Signal 2 — clear majority are dot-leader entries
  if (texts.length >= 4 && tocCount / texts.length >= 0.55) return true

  // Signal 3 — moderate dot-leader ratio + font-size profile (entries are
  // body-sized or smaller, not heading-sized like chapter openers)
  if (body && tocCount >= 2 && tocCount / texts.length >= 0.4) {
    const linesWithSize = lines.filter(l => l.fontSize > 0)
    if (linesWithSize.length > 0) {
      const bigCount = linesWithSize.filter(l => l.fontSize > body * 1.2).length
      const nonBigRatio = (linesWithSize.length - bigCount) / linesWithSize.length
      if (nonBigRatio >= 0.8) return true
    }
  }

  return false
}

/**
 * Extract TOC entries from a page's lines.
 * Each entry: { text, page, level, fontSize }
 * level 0 = top-level, 1 = sub (1.2), 2 = sub-sub (1.2.3)
 */
function parseTocEntries(lines) {
  const entries = []
  for (const ln of lines) {
    const t = ln.text.trim()
    if (!t) continue
    if (/^(table\s+of\s+contents?|contents?)\s*$/i.test(t)) continue

    const m = t.match(/^(.*?)[\.\s]{2,}(\d+)\s*$/)
    if (m) {
      const text = m[1].trim()
      const page = parseInt(m[2], 10)
      const level = /^\d+\.\d+\.\d/.test(text) ? 2
                  : /^\d+\.\d+/.test(text)      ? 1
                  : 0
      if (text) entries.push({ text, page, level, fontSize: ln.fontSize })
    } else if (t.length < 120 && !/^\d+$/.test(t)) {
      // Heading line without a page number (e.g. a section label)
      entries.push({ text: t, page: null, level: 0, fontSize: ln.fontSize })
    }
  }
  return entries
}

// ── Chapter heading detection ──────────────────────────────────────────────

/**
 * Returns true only when a line is an actual structural chapter/section heading.
 *
 * Critical fix: pattern-based matches (lines beginning with "Chapter N",
 * "Section N", etc.) now ALSO require a visibly larger font (>= 1.28× body).
 * This prevents in-body cross-references like "see Chapter 3 for details"
 * from being incorrectly promoted to new chapters.
 */
function isHeadingLine(line, body) {
  const t = line.text.trim()
  if (!t || t.length < 2) return false

  const big   = line.fontSize >= body * 1.28
  const short = t.length < 90
  const upper = /^[A-Z0-9\u00C0-\u024F]/.test(t)

  // Numbered / named structural headings — REQUIRE larger font to avoid false positives
  const numberedPattern = big && (
    /^(chapter|part|section|appendix)\s+[\diIvVxX]/i.test(t)
    || /^\d{1,2}[\.\)]\s+[A-Z]/.test(t)
    || /^[IVX]+\.\s+[A-Z]/.test(t)
  )

  return numberedPattern || (big && short && upper)
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Returns { chapters, toc }.
 *
 * toc  – null, or { title, entries[] } when TOC pages are detected.
 * chapters – array of chapter objects built from non-TOC pages.
 */
export function detectChapters(pageData, body) {

  // ── Step 1: identify TOC pages in a single forward pass ─────────────────
  const tocPageNums = new Set()
  let toc    = null
  let inToc  = false

  for (const { pageNum, lines } of pageData) {
    if (isTocPage(lines, body)) {
      if (!inToc) {
        // Entering TOC region — initialise the toc object
        const hdr = lines.find(l =>
          /^(table\s+of\s+contents?|contents?)\s*$/i.test(l.text.trim())
        )
        toc = { title: hdr?.text?.trim() || 'Contents', entries: [] }
      }
      inToc = true
      tocPageNums.add(pageNum)
      toc.entries.push(...parseTocEntries(lines))
    } else {
      // Once a non-TOC page appears, the TOC region is closed.
      // (Multi-page TOCs are handled by consecutive matching pages above.)
      inToc = false
    }
  }

  // ── Step 2: build chapters from non-TOC pages ────────────────────────────
  const chapters = []
  let cur = null
  let idx = 0

  for (const { pageNum, lines } of pageData) {
    if (tocPageNums.has(pageNum)) continue   // skip TOC pages entirely

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
    const all = pageData
      .filter(p => !tocPageNums.has(p.pageNum))
      .flatMap(p =>
        p.lines
          .map(l => ({ ...l, text: l.text.trim(), body, pageNum: p.pageNum }))
          .filter(l => l.text)
      )
    chapters.push({ index: 1, title: 'Document Content', lines: all, pageStart: 1 })
  }

  // ── Step 3: inject image pseudo-lines into each chapter ─────────────────
  //
  // pdfProcessor now stores extracted images per page in pageData[].images.
  // Here we merge them into each chapter's lines array, positioned by their
  // PDF Y coordinate so they appear between the correct surrounding text lines.
  //
  const imagesByPage = new Map()
  for (const { pageNum, images } of pageData) {
    if (images && images.length) imagesByPage.set(pageNum, images)
  }

  if (imagesByPage.size > 0) {
    for (const ch of chapters) {
      // Which pages does this chapter span?
      const chPageNums = new Set(ch.lines.map(l => l.pageNum).filter(Boolean))

      const imgLines = []
      for (const [pgNum, imgs] of imagesByPage) {
        if (!chPageNums.has(pgNum)) continue
        for (const img of imgs) {
          imgLines.push({
            isImage:  true,
            src:      img.src,
            width:    img.width,
            height:   img.height,
            naturalW: img.naturalW,   // intended CSS display width (PDF pts × 96/72)
            naturalH: img.naturalH,
            // pdfY is in the same PDF user-space coordinate system as line.y,
            // so the sort below places the image between the right text lines.
            y:        img.pdfY,
            pageNum:  pgNum,
            text:     '',
            fontSize: 0,
            fontName: '',
            body,
          })
        }
      }

      if (imgLines.length) {
        // Merge and sort: page number ascending, then Y descending (top → bottom)
        ch.lines = [...ch.lines, ...imgLines].sort((a, b) => {
          const dp = (a.pageNum || 0) - (b.pageNum || 0)
          return dp !== 0 ? dp : (b.y || 0) - (a.y || 0)
        })
      }
    }
  }

  // ── Step 4: inject page-break markers between consecutive pages ──────────
  //
  // Between the last line of page N and the first line of page N+1 we insert
  // a pseudo-line { isPageBreak: true, pageNum: N, footerText }.
  // footerText is built from pdfProcessor's footerLines for that page.
  //
  const footersByPage = new Map()
  for (const { pageNum, footerLines } of pageData) {
    if (footerLines && footerLines.length) {
      const text = footerLines
        .map(l => l.text.trim())
        .filter(Boolean)
        .join('  ')
      if (text) footersByPage.set(pageNum, text)
    }
  }

  for (const ch of chapters) {
    const merged = []
    let prevPage = null
    for (const ln of ch.lines) {
      const pg = ln.pageNum || null
      if (prevPage !== null && pg !== null && pg !== prevPage) {
        // Insert a page-break marker at the transition
        merged.push({
          isPageBreak: true,
          pageNum:     prevPage,
          footerText:  footersByPage.get(prevPage) || null,
          text:        '',
          fontSize:    0,
          fontName:    '',
          y:           -Infinity,
          body,
        })
      }
      merged.push(ln)
      if (pg !== null) prevPage = pg
    }
    ch.lines = merged
  }

  return { chapters, toc }
}