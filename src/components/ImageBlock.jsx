import { useState } from 'react'
import './ImageBlock.css'

/**
 * Renders a single image extracted from the PDF.
 *
 * Images are shown at their natural PDF display width (naturalW CSS px),
 * but never wider than the text column (max-width: 100%).
 * This avoids the padding-bottom "stretch-to-100%" trick that was blurring
 * images by upscaling a low-resolution canvas crop.
 *
 * The canvas was captured at IMAGE_SCALE = 3, so the src bitmap is already
 * 3× the natural display size — the browser will downsample cleanly.
 */
export default function ImageBlock({ src, naturalW, naturalH, width, height }) {
  const [lightbox, setLightbox] = useState(false)

  // Prefer naturalW/H (PDF-unit derived) for display; fall back to raw canvas px
  const dispW = naturalW || width || 0
  const dispH = naturalH || height || 0

  return (
    <>
      <figure className="img-block" onClick={() => setLightbox(true)} title="Click to enlarge">
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="img-block-img"
          style={{
            width:     dispW > 0 ? `${dispW}px` : '100%',
            maxWidth:  '100%',
            height:    'auto',
            display:   'block',
          }}
          width={dispW || undefined}
          height={dispH || undefined}
        />
        <div className="img-block-hint">Click to enlarge</div>
      </figure>

      {lightbox && (
        <div
          className="img-lightbox"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="img-lightbox-close"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            ✕
          </button>
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
