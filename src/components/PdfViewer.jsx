import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

/**
 * Renders every page of a PDF (Uint8Array) to canvases, fitted to the
 * container width. Pages are drawn as they scroll into view.
 */
export default function PdfViewer({ data, zoom = 1, onPages }) {
  const wrapRef = useRef(null)
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!data) return undefined
    let cancelled = false
    let task
    setDoc(null)
    setError('')
    try {
      task = pdfjsLib.getDocument({ data: data.slice(0), isEvalSupported: false })
      task.promise.then(
        (pdf) => { if (!cancelled) { setDoc(pdf); onPages?.(pdf.numPages) } },
        () => { if (!cancelled) setError('The agreement could not be displayed.') }
      )
    } catch {
      setError('The agreement could not be displayed.')
    }
    return () => { cancelled = true; task?.destroy?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  if (error) return <div ref={wrapRef} className="doc-state">{error}</div>
  return (
    <div ref={wrapRef} className="pages">
      {!doc && <div className="doc-state">Loading agreement…</div>}
      {doc && width > 0 && Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i} pdf={doc} number={i + 1} total={doc.numPages} width={Math.max(260, (width - 8) * zoom)} />
      ))}
    </div>
  )
}

function PdfPage({ pdf, number, total, width }) {
  const ref = useRef(null)
  const canvasRef = useRef(null)
  const [visible, setVisible] = useState(number <= 2)
  const [ratio, setRatio] = useState(1.414)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return undefined
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setVisible(true) }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return undefined
    let task
    let cancelled = false
    pdf.getPage(number).then((page) => {
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      setRatio(base.height / base.width)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const viewport = page.getViewport({ scale: (width / base.width) * dpr })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      task = page.render({ canvasContext: canvas.getContext('2d'), viewport })
      task.promise.catch(() => {})
    })
    return () => { cancelled = true; task?.cancel?.() }
  }, [pdf, number, width, visible])

  return (
    <div ref={ref} className="pg" style={{ width, height: width * ratio }}>
      <canvas ref={canvasRef} aria-label={`Agreement page ${number} of ${total}`} />
      <span className="pg-num">Page {number} of {total}</span>
    </div>
  )
}
