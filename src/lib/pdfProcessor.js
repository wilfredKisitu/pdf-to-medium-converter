import * as pdfjsLib from 'pdfjs-dist'
import { toLines } from './chapterDetector.js'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

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
    pageData.push({
      pageNum: p,
      lines:   toLines(content.items),
      w:       vp.width,
      h:       vp.height,
    })
  }

  return pageData
}
