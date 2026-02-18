import { useState, useEffect, useRef, useCallback } from 'react'

export function useHighlight(containerRef) {
  const [toolbar, setToolbar] = useState({ visible: false, x: 0, y: 0 })
  const selRef = useRef(null)

  const hide = useCallback(() => {
    setToolbar(t => ({ ...t, visible: false }))
    selRef.current = null
  }, [])

  useEffect(() => {
    const onUp = (e) => {
      if (e.target.closest?.('#hl-toolbar')) return
      setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.toString().trim()) return
        const range = sel.getRangeAt(0)
        if (!containerRef.current?.contains(range.commonAncestorContainer)) return
        selRef.current = sel
        const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0
        const y = e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0
        setToolbar({ visible: true, x, y })
      }, 20)
    }

    const onDown = (e) => {
      if (!e.target.closest?.('#hl-toolbar')) hide()
    }

    document.addEventListener('mouseup',   onUp)
    document.addEventListener('touchend',  onUp)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('mouseup',   onUp)
      document.removeEventListener('touchend',  onUp)
      document.removeEventListener('mousedown', onDown)
    }
  }, [containerRef, hide])

  const apply = useCallback((color) => {
    const sel = selRef.current
    if (!sel || sel.isCollapsed) return
    try {
      const range = sel.getRangeAt(0)
      const mark  = document.createElement('mark')
      mark.className = `hl-${color}`
      try { range.surroundContents(mark) } catch {
        const frag = range.extractContents()
        mark.appendChild(frag)
        range.insertNode(mark)
      }
      window.getSelection().removeAllRanges()
    } catch { /* cross-element selection edge case */ }
    hide()
  }, [hide])

  const remove = useCallback(() => {
    const sel = selRef.current
    if (!sel || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    let el = range.commonAncestorContainer
    if (el.nodeType === 3) el = el.parentElement
    while (el && el.id !== 'article-wrap') {
      if (el.tagName === 'MARK') {
        const parent = el.parentNode
        while (el.firstChild) parent.insertBefore(el.firstChild, el)
        parent.removeChild(el)
        break
      }
      el = el.parentElement
    }
    window.getSelection().removeAllRanges()
    hide()
  }, [hide])

  return { toolbar, apply, remove }
}
