import { useState, useRef } from 'react'
import ReaderNav from './ReaderNav.jsx'
import Sidebar from './Sidebar.jsx'
import ArticleContent from './ArticleContent.jsx'
import HighlightToolbar from './HighlightToolbar.jsx'
import SettingsPanel, { DEFAULT_SETTINGS, fontStack } from './SettingsPanel.jsx'
import { useReadingProgress } from '../hooks/useReadingProgress.js'
import { useHighlight } from '../hooks/useHighlight.js'
import './ReaderView.css'

export default function ReaderView({ docName, chapters, toc, onNewDoc }) {
  const [sidebarOpen,   setSidebarOpen]   = useState(true)
  const [activeChapter, setActiveChapter] = useState(0)
  const [settingsOpen,  setSettingsOpen]  = useState(false)
  const [settings,      setSettings]      = useState(DEFAULT_SETTINGS)

  const articleRef   = useRef(null)
  const readProgress = useReadingProgress()
  const { toolbar, apply, remove } = useHighlight(articleRef)

  const articleStyle = {
    '--reading-font':           fontStack(settings.font),
    '--reading-font-size':      `${settings.fontSize}px`,
    '--reading-line-height':    settings.lineHeight,
    '--reading-letter-spacing': `${settings.letterSpacing}em`,
    '--reading-para-spacing':   `${settings.paraSpacing}px`,
  }

  return (
    <div className="reader-view">
      <ReaderNav
        docName={docName}
        progress={readProgress}
        onToggleSidebar={() => setSidebarOpen(s => !s)}
        onToggleSettings={() => setSettingsOpen(s => !s)}
        settingsOpen={settingsOpen}
        onNewDoc={onNewDoc}
      />

      <div className="reader-body">
        <Sidebar
          chapters={chapters}
          toc={toc}
          open={sidebarOpen}
          activeChapter={activeChapter}
        />

        <main className={`article-main${sidebarOpen ? '' : ' article-main--expanded'}`}>
          <div
            className={`article-wrap${settings.twoCol ? ' article-wrap--two-col' : ''}`}
            id="article-wrap"
            ref={articleRef}
            style={articleStyle}
          >
            <ArticleContent
              docName={docName}
              chapters={chapters}
              toc={toc}
              onChapterVisible={setActiveChapter}
            />
          </div>
        </main>
      </div>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <HighlightToolbar toolbar={toolbar} onApply={apply} onRemove={remove} />
    </div>
  )
}
