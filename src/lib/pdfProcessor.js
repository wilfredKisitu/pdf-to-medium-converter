import * as pdfjsLib from 'pdfjs-dist'
import { toLines } from './chapterDetector.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

// ── pdf.js operator codes for image paint operations ───────────────────────
const OP_SAVE      = 10   // gsave
const OP_RESTORE   = 11   // grestore
const OP_TRANSFORM = 12   // cm  (concatenate matrix)
const OP_JPEG      = 82   // paintJpegXObject
const OP_IMAGE     = 85   // paintImageXObject
const OP_IMAGE_RPT = 88   // paintImageXObjectRepeat
const OP_INLINE    = 91   // paintInlineImageXObject

/** Canvas render scale for image extraction (1.5 = 150 % resolution). */
const IMAGE_SCALE = 1.5

/** Minimum image dimension in canvas pixels to avoid icons / decorations. */
const MIN_PX = 30

/** Skip images whose area exceeds this fraction of the page (backgrounds). */
const MAX_PAGE_FRACTION = 0.75

/**
 * Multiply two 6-element CTM arrays [a, b, c, d, e, f].
 * Standard PDF matrix concatenation:  M_new = M_current × M_arg
 */
function matMul(m, [a2, b2, c2, d2, e2, f2]) {
  return [
    m[0] * a2 + m[2] * b2,
    m[1] * a2 + m[3] * b2,
    m[0] * c2 + m[2] * d2,
    m[1] * c2 + m[3] * d2,
    m[0] * e2 + m[2] * f2 + m[4],
    m[1] * e2 + m[3] * f2 + m[5],
  ]
}

/**
 * Extract rasterised images from a single PDF page.
 *
 * Strategy:
 *  1. Get the operator list and walk it, tracking the current transform
 *     matrix (CTM) through save / restore / transform ops.
 *  2. For every image-paint op, the image occupies a 1×1 unit square in
 *     current user space.  Transforming all four corners gives the bounding
 *     box in PDF user-space coordinates.
 *  3. Render the page to a hidden <canvas> at IMAGE_SCALE.
 *  4. Crop each bounding box from the canvas and encode as PNG data URL.
 *
 * @param   {PDFPageProxy} page   – pdf.js page proxy
 * @param   {number}       pageW  – page width  in PDF units (scale=1 viewport)
 * @param   {number}       pageH  – page height in PDF units
 * @returns {Promise<Array<{src,width,height,pdfY}>>}
 */
async function extractImages(page, pageW, pageH) {
  // ── Step 1: get operator list ──────────────────────────────────────────
  let opList
  try { opList = await page.getOperatorList() } catch { return [] }

  const hasImageOps = opList.fnArray.some(fn =>
    fn === OP_JPEG || fn === OP_IMAGE || fn === OP_IMAGE_RPT || fn === OP_INLINE
  )
  if (!hasImageOps) return []

  // ── Step 2: CTM tracking → image bounding boxes in PDF user space ─────
  const stack  = []
  let   m      = [1, 0, 0, 1, 0, 0]   // identity CTM
  const rects  = []

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const a  = opList.argsArray[i]

    if      (fn === OP_SAVE)      { stack.push([...m]) }
    else if (fn === OP_RESTORE)   { m = stack.pop() ?? [1, 0, 0, 1, 0, 0] }
    else if (fn === OP_TRANSFORM) { m = matMul(m, a) }
    else if (fn === OP_JPEG || fn === OP_IMAGE || fn === OP_IMAGE_RPT || fn === OP_INLINE) {
      // Four corners of the 1×1 unit square, transformed to page coords
      const corners = [
        [m[4],                m[5]           ],  // (0,0)
        [m[0] + m[4],         m[1] + m[5]    ],  // (1,0)
        [m[2] + m[4],         m[3] + m[5]    ],  // (0,1)
        [m[0] + m[2] + m[4],  m[1] + m[3] + m[5]], // (1,1)
      ]
      const xs = corners.map(c => c[0])
      const ys = corners.map(c => c[1])
      rects.push({
        minX: Math.min(...xs), maxX: Math.max(...xs),
        minY: Math.min(...ys), maxY: Math.max(...ys),
      })
    }
  }

  if (!rects.length) return []

  // ── Step 3: render page to a canvas at IMAGE_SCALE ────────────────────
  const vp  = page.getViewport({ scale: IMAGE_SCALE })
  const cw  = Math.round(vp.width)
  const ch  = Math.round(vp.height)
  const cvs = document.createElement('canvas')
  cvs.width  = cw
  cvs.height = ch
  const ctx  = cvs.getContext('2d')

  try { await page.render({ canvasContext: ctx, viewport: vp }).promise }
  catch { return [] }

  // ── Step 4: crop each image bounding box ──────────────────────────────
  const pageArea = pageW * pageH
  const images   = []

  for (const r of rects) {
    const imgW = r.maxX - r.minX
    const imgH = r.maxY - r.minY

    // Skip decorative backgrounds (too large)
    if ((imgW * imgH) / pageArea > MAX_PAGE_FRACTION) continue

    // Convert PDF user coords (origin bottom-left) to canvas pixels (origin top-left)
    const s  = IMAGE_SCALE
    const px = Math.round(r.minX * s)
    const py = Math.round(ch - r.maxY * s)  // Y-axis flip
    const pw = Math.round(imgW * s)
    const ph = Math.round(imgH * s)

    // Skip tiny decorative elements
    if (pw < MIN_PX || ph < MIN_PX) continue

    // Clamp to canvas bounds
    const x0 = Math.max(0, px),      y0 = Math.max(0, py)
    const x1 = Math.min(cw, px + pw), y1 = Math.min(ch, py + ph)
    if (x1 <= x0 || y1 <= y0) continue

    // Crop to its own canvas and encode
    const ic = document.createElement('canvas')
    ic.width  = x1 - x0
    ic.height = y1 - y0
    ic.getContext('2d').drawImage(cvs, x0, y0, ic.width, ic.height, 0, 0, ic.width, ic.height)

    images.push({
      src:    ic.toDataURL('image/png'),
      width:  ic.width,
      height: ic.height,
      // Midpoint Y in PDF user space — same coordinate system as line.y from toLines()
      pdfY:   (r.minY + r.maxY) / 2,
    })
  }

  return images
}

// ── Main export ───────────────────────────────────────────────────────────

export async function processPDF(file, onProgress) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const N   = pdf.numPages

  const pageData = []
  for (let p = 1; p <= N; p++) {
    onProgress?.(p, N)
    const pg      = await pdf.getPage(p)
    const content = await pg.getTextContent()
    const vp      = pg.getViewport({ scale: 1 })
    // Extract images alongside text; errors are caught internally and return []
    const images  = await extractImages(pg, vp.width, vp.height)
    pageData.push({
      pageNum: p,
      lines:   toLines(content.items),
      images,
      w:       vp.width,
      h:       vp.height,
    })
  }

  return pageData
}
