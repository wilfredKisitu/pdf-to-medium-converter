import './PageBreak.css'

/**
 * Visual page separator rendered between pages within a chapter.
 * Shows a thin rule, an optional page number badge, and the page's
 * footer text (running title, copyright, page number from the PDF).
 */
export default function PageBreak({ pageNum, footerText }) {
  return (
    <div className="page-break" aria-label={`End of page ${pageNum}`}>
      <div className="page-break-rule" />
      <div className="page-break-meta">
        {pageNum != null && (
          <span className="page-break-badge">p.{pageNum}</span>
        )}
        {footerText && (
          <span className="page-break-footer">{footerText}</span>
        )}
      </div>
    </div>
  )
}
