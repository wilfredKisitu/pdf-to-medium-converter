import { joinProseLines, normalizeProse } from './charNormalizer.js'

function isMono(name) {
  return /courier|mono|code|consol|inconsolata|fira.?code|source.?code|menlo|monaco|hack/i.test(name || '')
}

function looksCode(t) {
  return (
    /^\s{4,}\S/.test(t) ||
    /[{};]\s*$/.test(t) ||
    /^\s*(function|def |class |import |from |const |let |var |return |public |private |void |int |string |bool |if\s*\(|for\s*\(|while\s*\(|#include|package |fn )\b/.test(t) ||
    /=>|->|!=|===|!==|&&|\|\|/.test(t) ||
    /^\s*\/\//.test(t) ||
    /^\s*#\s?\w/.test(t)
  )
}

/**
 * Compute the net change in open-delimiter depth for a line of code.
 * Skips characters inside string literals to avoid counting string content.
 * Returns a signed integer (positive = more open, negative = more closed).
 */
function depthDelta(text) {
  let delta = 0
  let inStr = false
  let strCh = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (c === strCh && text[i - 1] !== '\\') inStr = false
    } else if (c === '"' || c === "'" || c === '`') {
      inStr = true; strCh = c
    } else if (c === '{' || c === '(' || c === '[') {
      delta++
    } else if (c === '}' || c === ')' || c === ']') {
      delta--
    }
  }
  return delta
}

// ── Equation detection ─────────────────────────────────────────────────────

/**
 * True when a short line looks like a display equation or formula.
 * Signals:
 *  - Contains a significant density of Greek/math Unicode characters
 *  - Looks like a LaTeX-style expression (integral, sigma, nabla, etc.)
 *  - Ends with an equation label like (1) or [eq. 2]
 */
const MATH_CHARS = /[∫∑∏√∂∇∆∞±×÷≈≠≤≥∈∉⊂⊃∪∩→←↔⇒⇔∧∨¬αβγδεζηθικλμνξπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΠΡΣΤΥΦΧΨΩ]/

function looksEquation(t, fs, body) {
  const s = t.trim()
  if (!s || s.length > 200) return false

  // Must have at least some math-like content
  const mathDensity = (s.match(MATH_CHARS) || []).length / s.length
  if (mathDensity < 0.08 && !/[=<>]/.test(s)) return false

  // Optionally: isolated / short centered lines in a larger font
  const isShort    = s.length < 80
  const hasMath    = mathDensity >= 0.05 || /[∫∑∏√∂∇]/.test(s)
  const hasEqLabel = /\(\s*\d+\s*\)\s*$/.test(s) || /\[\s*(?:eq\.?\s*)?\d+\s*\]\s*$/i.test(s)

  return isShort && (hasMath || hasEqLabel)
}

/**
 * Extract an optional equation label like "(3)" or "[eq. 5]" from the end
 * of the line. Returns { expr, label } where label may be null.
 */
function splitEqLabel(t) {
  const s = t.trim()
  const m = s.match(/^(.*?)\s*(\(\s*\d+\s*\)|\[\s*(?:eq\.?\s*)?\d+\s*\])\s*$/i)
  if (m) return { expr: m[1].trim(), label: m[2].trim() }
  return { expr: s, label: null }
}

// ── Reference entry detection ──────────────────────────────────────────────

/**
 * True when a line looks like a bibliographic reference entry.
 * Patterns:
 *  [1] Author, Title...
 *  1. Author, Title...
 *  Author, A. (2023). Title...
 *  Lines containing a DOI: https://doi.org/...
 */
function looksReference(t) {
  const s = t.trim()
  return (
    /^\[\d+\]/.test(s) ||
    /^\d{1,3}\.\s+[A-Z]/.test(s) ||
    /https?:\/\/doi\.org\//i.test(s) ||
    /\bdoi\s*:\s*10\.\d{4,}/i.test(s)
  )
}

// ── Section-level TOC detection ────────────────────────────────────────────

/**
 * True when a text line looks like a TOC entry (dot-leader or tab + page number).
 * Examples: "1.2 Methods .............. 7"  or  "Results\t14"
 */
function isTocLike(t) {
  const s = t.trim()
  return /^.+[\.\s]{3,}\d+\s*$/.test(s) || /^.+\t\d+\s*$/.test(s)
}

/**
 * Parse a single TOC-like line into { text, page, level }.
 * level 0 = top, 1 = sub (1.2), 2 = sub-sub (1.2.3)
 */
function parseSectionTocEntry(raw) {
  const s = raw.trim()
  const m = s.match(/^(.*?)[\.\s]{2,}(\d+)\s*$/)
  if (m) {
    const text  = m[1].trim()
    const page  = parseInt(m[2], 10)
    const level = /^\d+\.\d+\.\d/.test(text) ? 2
                : /^\d+\.\d+/.test(text)      ? 1
                : 0
    return { text, page, level }
  }
  return { text: s, page: null, level: 0 }
}

// ── Public helpers ─────────────────────────────────────────────────────────

export function readTime(text) {
  const words = text.trim().split(/\s+/).length
  const mins  = Math.max(1, Math.ceil(words / 220))
  return mins === 1 ? '1 min read' : `${mins} min read`
}

// ── Main block parser ──────────────────────────────────────────────────────

export function parseBlocks(lines) {
  const blocks = []
  let para      = []
  let tocBuf    = []   // candidate section-TOC lines
  let refBuf    = []   // candidate bibliography reference lines
  let code      = []
  let codeDepth = 0    // net open-delimiter depth across current code block
  let lastY     = null
  let lastPage  = null
  let lastFs    = null

  // ── flush helpers ────────────────────────────────────────────────────────

  /**
   * Flush the reference buffer.
   * ≥ 1 consecutive reference-like lines → emit a `references` block.
   */
  function flushRefBuf() {
    if (refBuf.length) {
      blocks.push({ type: 'references', entries: [...refBuf] })
      refBuf = []
    }
  }

  /**
   * Flush the section-TOC buffer.
   * ≥ 2 consecutive TOC-like lines → emit a `section-toc` block.
   * < 2 → treat as prose and move to para[].
   */
  function flushTocBuf() {
    if (tocBuf.length >= 2) {
      blocks.push({ type: 'section-toc', entries: tocBuf.map(parseSectionTocEntry) })
    } else {
      tocBuf.forEach(t => para.push(t))
    }
    tocBuf = []
  }

  function flushPara() {
    flushRefBuf()
    flushTocBuf()
    // joinProseLines detects word-break hyphens and rejoins split words.
    // normalizeProse fixes punctuation sequences (-- → –, --- → —, etc.)
    const t = normalizeProse(joinProseLines(para))
    if (t) blocks.push({ type: 'p', text: t })
    para = []
  }

  function flushCode() {
    if (code.length) {
      blocks.push({ type: 'code', lines: [...code] })
      code      = []
      codeDepth = 0
    }
  }

  function breakBlock() { flushCode(); flushPara() }

  // ── main loop ────────────────────────────────────────────────────────────

  for (const ln of lines) {

    // ── Page-break markers (injected by chapterDetector) ─────────────────
    if (ln.isPageBreak) {
      breakBlock()
      blocks.push({
        type:       'page-break',
        pageNum:    ln.pageNum,
        footerText: ln.footerText || null,
      })
      lastY    = null
      lastPage = ln.pageNum
      lastFs   = null
      continue
    }

    // ── Image pseudo-lines (injected by chapterDetector) ──────────────────
    if (ln.isImage) {
      breakBlock()
      blocks.push({
        type:     'image',
        src:      ln.src,
        width:    ln.width,
        height:   ln.height,
        naturalW: ln.naturalW,
        naturalH: ln.naturalH,
      })
      lastY    = ln.y
      lastPage = ln.pageNum
      lastFs   = null
      continue
    }

    const t = ln.text
    if (!t) { breakBlock(); lastY = null; continue }

    const body = ln.body || 12
    const fs   = ln.fontSize || body

    // ── Gap / page-break detection ─────────────────────────────────────────
    const pageChanged = lastPage !== null && ln.pageNum !== undefined && ln.pageNum !== lastPage

    if (pageChanged) {
      // Only hard-break a code block on page change when the block is "closed"
      // (codeDepth <= 0).  An unclosed block (open braces/parens) very likely
      // continues onto the next page — keep accumulating.
      if (code.length && codeDepth > 0) {
        // Stay in code block; page boundary is a soft continuation
      } else {
        breakBlock()
      }
    } else if (lastY !== null && ln.y !== undefined) {
      const gap       = lastY - ln.y
      const threshold = (lastFs || fs) * 2.4

      if (gap > threshold) {
        if (code.length && codeDepth > 0) {
          // Inside an unclosed code structure — tolerate moderate gaps but
          // hard-break on very large ones (likely a new section entirely)
          if (gap > (lastFs || fs) * 7) breakBlock()
        } else {
          breakBlock()
        }
      }
    }

    // ── Block-type classification ──────────────────────────────────────────
    const bigH = fs >= body * 1.5  && t.length < 100
    const subH = fs >= body * 1.18 && fs < body * 1.5 && t.length < 100

    if (bigH) {
      flushCode(); flushPara()
      blocks.push({ type: 'h2', text: normalizeProse(t) })
    } else if (subH) {
      flushCode(); flushPara()
      blocks.push({ type: 'h3', text: normalizeProse(t) })
    } else {
      const isCode = isMono(ln.fontName) || looksCode(t)

      if (isCode) {
        // Entering or continuing a code block — flush any pending TOC/prose
        if (tocBuf.length) flushTocBuf()
        if (refBuf.length) flushRefBuf()
        if (para.length)   flushPara()
        codeDepth = Math.max(0, codeDepth + depthDelta(t))
        code.push(t)

      } else if (code.length && codeDepth > 0) {
        // Line doesn't look like code but we're inside an unclosed delimiter
        // structure — absorb it into the code block (multi-line string etc.)
        codeDepth = Math.max(0, codeDepth + depthDelta(t))
        code.push(t)

      } else if (looksEquation(t, fs, body)) {
        // Standalone display equation — emit as its own block
        flushCode(); flushPara()
        const { expr, label } = splitEqLabel(t)
        blocks.push({ type: 'equation', text: expr, label })

      } else {
        // Plain prose — close any open code block first
        if (code.length >= 2)       { flushCode() }
        else if (code.length === 1) {
          para.push('`' + code[0].trim() + '`')
          code = []; codeDepth = 0
        }

        if (looksReference(t)) {
          // Bibliography / reference entry — accumulate consecutive entries
          if (para.length)   flushPara()
          if (tocBuf.length) flushTocBuf()
          refBuf.push(t)
        // Section-TOC accumulation: if this line looks like a dot-leader entry,
        // buffer it; otherwise flush the buffer and add to prose.
        } else if (isTocLike(t)) {
          if (para.length)   flushPara()   // finish any preceding prose first
          if (refBuf.length) flushRefBuf()
          tocBuf.push(t)
        } else {
          if (tocBuf.length) flushTocBuf()
          if (refBuf.length) flushRefBuf()
          para.push(t)
        }
      }
    }

    lastY    = ln.y
    lastPage = ln.pageNum
    lastFs   = fs
  }

  flushCode()
  flushPara()
  return blocks
}
