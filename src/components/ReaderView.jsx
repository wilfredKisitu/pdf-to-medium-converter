import { useState, useRef } from 'react'
import ReaderNav from './ReaderNav.jsx'
import Sidebar from './Sidebar.jsx'
import ArticleContent from './ArticleContent.jsx'
import HighlightToolbar from './HighlightToolbar.jsx'
import { useReadingProgress } from '../hooks/useReadingProgress.js'
import { useHighlight } from '../hooks/useHighlight.js'
import './ReaderView.css'

export default function ReaderView({ docName, chapters, onNewDoc }) {
  const [sidebarOpen,   setSidebarOpen]   = useState(true)
  const [activeChapter, setActiveChapter] = useState(0)
  const articleRef   = useRef(null)
  const readProgress = useReadingProgress()
  const { toolbar, apply, remove } = useHighlight(articleRef)

  return (
    <div className="reader-view">
      <ReaderNav
        docName={docName}
        progress={readProgress}
        onToggleSidebar={() => setSidebarOpen(s => !s)}
        onNewDoc={onNewDoc}
      />

      <div className="reader-body">
        <Sidebar
          chapters={chapters}
          open={sidebarOpen}
          activeChapter={activeChapter}
        />

        <main className={`article-main${sidebarOpen ? '' : ' article-main--expanded'}`}>
          <div className="article-wrap" id="article-wrap" ref={articleRef}>
            <ArticleContent
              docName={docName}
              chapters={chapters}
              onChapterVisible={setActiveChapter}
            />
          </div>
        </main>
      </div>

      <HighlightToolbar toolbar={toolbar} onApply={apply} onRemove={remove} />
    </div>
  )
}
