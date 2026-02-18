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

export function readTime(text) {
  const words = text.trim().split(/\s+/).length
  const mins  = Math.max(1, Math.ceil(words / 220))
  return mins === 1 ? '1 min read' : `${mins} min read`
}

export function parseBlocks(lines) {
  const blocks = []
  let para     = []
  let code     = []
  let lastY    = null
  let lastPage = null
  let lastFs   = null

  function flushPara() {
    const t = para.join(' ').trim()
    if (t) blocks.push({ type: 'p', text: t })
    para = []
  }
  function flushCode() {
    if (code.length) { blocks.push({ type: 'code', lines: [...code] }); code = [] }
  }
  function breakBlock() { flushCode(); flushPara() }

  for (const ln of lines) {
    const t = ln.text
    if (!t) { breakBlock(); lastY = null; continue }

    const body = ln.body || 12
    const fs   = ln.fontSize || body

    // --- paragraph / page-break detection via Y coordinate ---
    const pageChanged = lastPage !== null && ln.pageNum !== undefined && ln.pageNum !== lastPage
    if (pageChanged) {
      breakBlock()
    } else if (lastY !== null && ln.y !== undefined) {
      // PDF Y grows upward; going down the page means lastY > ln.y
      const gap = lastY - ln.y
      if (gap > (lastFs || fs) * 2.4) breakBlock()
    }

    const bigH = fs >= body * 1.5  && t.length < 100
    const subH = fs >= body * 1.18 && fs < body * 1.5 && t.length < 100

    if (bigH) {
      flushCode(); flushPara()
      blocks.push({ type: 'h2', text: t })
    } else if (subH) {
      flushCode(); flushPara()
      blocks.push({ type: 'h3', text: t })
    } else {
      const isCode = isMono(ln.fontName) || looksCode(t)
      if (isCode) {
        if (para.length) flushPara()
        code.push(t)
      } else {
        if (code.length >= 2)      { flushCode() }
        else if (code.length === 1) { para.push('`' + code[0].trim() + '`'); code = [] }
        para.push(t)
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
