import { useState } from 'react'
import './ImageBlock.css'

/**
 * Renders a single image extracted from the PDF.
 * Clicking the image opens a full-size lightbox overlay.
 */
export default function ImageBlock({ src, width, height }) {
  const [lightbox, setLightbox] = useState(false)

  // Natural aspect ratio — used to size the figure proportionally
  const ratio = height / Math.max(width, 1)

  return (
    <>
      <figure className="img-block" onClick={() => setLightbox(true)} title="Click to enlarge">
        <div className="img-block-inner" style={{ paddingBottom: `${(ratio * 100).toFixed(2)}%` }}>
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="img-block-hint">Click to enlarge</div>
      </figure>

      {lightbox && (
        <div className="img-lightbox" onClick={() => setLightbox(false)} role="dialog" aria-modal="true">
          <button className="img-lightbox-close" onClick={() => setLightbox(false)} aria-label="Close">✕</button>
          <img
            src={src}
            alt=""
            className="img-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
