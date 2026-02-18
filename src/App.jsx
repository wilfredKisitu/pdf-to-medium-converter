import { useState } from 'react'
import { AppContext } from './contexts/AppContext.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useToast } from './hooks/useToast.js'
import UploadView from './components/UploadView.jsx'
import ProcessingView from './components/ProcessingView.jsx'
import ReaderView from './components/ReaderView.jsx'
import Toast from './components/Toast.jsx'
import { processPDF } from './lib/pdfProcessor.js'
import { detectChapters, medianFontSize } from './lib/chapterDetector.js'
import { readTime } from './lib/blockParser.js'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { toast, showToast }   = useToast()

  const [view,     setView]     = useState('upload')
  const [docName,  setDocName]  = useState('')
  const [chapters, setChapters] = useState([])
  const [proc,     setProc]     = useState({ status: '', overall: 0, cards: [] })

  /** Update a single chapter card by index */
  const updCard = (i, updates) =>
    setProc(p => ({
      ...p,
      cards: p.cards.map((c, idx) => (idx === i ? { ...c, ...updates } : c)),
    }))

  async function handleFile(file) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!file || !isPdf) {
      showToast('Please upload a valid PDF file')
      return
    }

    setDocName(file.name.replace(/\.pdf$/i, ''))
    setView('processing')
    setProc({ status: 'Reading PDF…', overall: 0, cards: [] })

    try {
      // ── Phase 1: extract pages ──────────────────────────────
      const pageData = await processPDF(file, (page, total) => {
        setProc(p => ({
          ...p,
          status:  `Extracting page ${page} of ${total}…`,
          overall: (page / total) * 50,
        }))
      })

      // ── Phase 2: detect chapters ────────────────────────────
      setProc(p => ({ ...p, status: 'Detecting chapters…' }))
      const allLines  = pageData.flatMap(p => p.lines)
      const body      = medianFontSize(allLines)
      const detected  = detectChapters(pageData, body)

      setProc(p => ({
        ...p,
        status: `Found ${detected.length} chapter${detected.length !== 1 ? 's' : ''}. Processing…`,
        cards: detected.map(ch => ({
          title: ch.title, status: 'pending', pct: 0, words: null, time: null,
        })),
      }))

      // ── Phase 3: animate each chapter card ──────────────────
      for (let i = 0; i < detected.length; i++) {
        updCard(i, { status: 'processing', pct: 10 })
        await sleep(50)
        for (const p of [30, 60, 80]) { updCard(i, { pct: p }); await sleep(35) }

        const text  = detected[i].lines.map(l => l.text).join(' ')
        const words = text.trim().split(/\s+/).length
        updCard(i, { status: 'done', pct: 100, words, time: readTime(text) })
        setProc(p => ({ ...p, overall: 50 + ((i + 1) / detected.length) * 48 }))
        await sleep(30)
      }

      // ── Phase 4: show reader ─────────────────────────────────
      setProc(p => ({ ...p, overall: 100, status: 'Rendering article…' }))
      await sleep(400)
      setChapters(detected)
      setView('reader')

    } catch (err) {
      console.error(err)
      showToast('Could not process this PDF — try another file.')
      setView('upload')
    }
  }

  function goUpload() {
    setView('upload')
    setChapters([])
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, showToast }}>
      {view === 'upload'     && <UploadView     onFile={handleFile} />}
      {view === 'processing' && <ProcessingView data={proc} />}
      {view === 'reader'     && <ReaderView     docName={docName} chapters={chapters} onNewDoc={goUpload} />}
      <Toast {...toast} />
    </AppContext.Provider>
  )
}
