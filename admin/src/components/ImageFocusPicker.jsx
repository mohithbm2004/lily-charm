import { useRef, useState, useCallback, useEffect } from 'react'

/**
 * ImageFocusPicker — auto-sizes preview to the photo's real aspect ratio.
 * Portrait photos display as a TALL rectangle. Landscape as a WIDE rectangle.
 * Drag to pan, scroll or slider to zoom.
 *
 * Props:
 *   image                   — src string (URL or base64)
 *   x, y                    — focal point 0–100 (default 50)
 *   scale                   — zoom 1–3 (default 1)
 *   onChange                — ({ x, y, scale }) => void
 *   onOrientationDetected   — ('portrait' | 'landscape') => void  (optional)
 */
export default function ImageFocusPicker({ image, x, y, scale, onChange, onOrientationDetected }) {
  const containerRef = useRef(null)
  const wrapperRef   = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewH,   setPreviewH]   = useState(240)
  const [natRatio,   setNatRatio]   = useState(null)   // null = not yet detected
  const [ratioLabel, setRatioLabel] = useState('')
  const dragStart = useRef(null)

  const clamp = (v) => Math.max(0, Math.min(100, v))

  /* ── Auto-detect photo dimensions (works for base64 too) ────────────── */
  useEffect(() => {
    if (!image) return
    const img = new window.Image()
    img.onload = () => {
      const nw = img.naturalWidth  || 16
      const nh = img.naturalHeight || 9
      const ratio = nw / nh

      setNatRatio(ratio)
      setRatioLabel(`${nw}×${nh}px · ${ratio.toFixed(2)}:1`)

      // Compute preview height from actual wrapper width
      const wrapW = wrapperRef.current?.offsetWidth || 480

      let MAX_H
      if (ratio <= 0.85)      MAX_H = 500   // portrait   → very tall rectangle
      else if (ratio <= 1.15) MAX_H = 380   // near-square → moderate square-ish
      else                    MAX_H = 260   // landscape  → short wide rectangle

      const derived = wrapW / ratio           // height that preserves full ratio
      const h = Math.max(160, Math.min(derived, MAX_H))
      setPreviewH(h)

      if (onOrientationDetected) {
        onOrientationDetected({ orientation: ratio < 1 ? 'portrait' : 'landscape', ratio })
      }
    }
    img.src = image
  }, [image])   // intentionally exclude onOrientationDetected to avoid loops

  /* ── Re-calc on wrapper resize (responsive) ─────────────────────────── */
  useEffect(() => {
    if (!natRatio || !wrapperRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      const wrapW = entry.contentRect.width
      let MAX_H
      if (natRatio <= 0.85)      MAX_H = 500
      else if (natRatio <= 1.15) MAX_H = 380
      else                       MAX_H = 260
      const derived = wrapW / natRatio
      setPreviewH(Math.max(160, Math.min(derived, MAX_H)))
    })
    obs.observe(wrapperRef.current)
    return () => obs.disconnect()
  }, [natRatio])

  /* ── Mouse drag ──────────────────────────────── */
  const onMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: x, oy: y }
  }

  const onMouseMove = useCallback((e) => {
    if (!isDragging || !dragStart.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = (dragStart.current.mx - e.clientX) / rect.width  * (100 / scale) * 2
    const dy = (dragStart.current.my - e.clientY) / rect.height * (100 / scale) * 2
    onChange({ x: clamp(dragStart.current.ox + dx), y: clamp(dragStart.current.oy + dy), scale })
  }, [isDragging, scale, onChange])

  const onMouseUp = () => { setIsDragging(false); dragStart.current = null }

  /* ── Touch drag ──────────────────────────────── */
  const onTouchStart = (e) => {
    const t = e.touches[0]
    setIsDragging(true)
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: x, oy: y }
  }
  const onTouchMove = (e) => {
    if (!isDragging || !dragStart.current) return
    const t = e.touches[0]
    const rect = containerRef.current.getBoundingClientRect()
    const dx = (dragStart.current.mx - t.clientX) / rect.width  * (100 / scale) * 2
    const dy = (dragStart.current.my - t.clientY) / rect.height * (100 / scale) * 2
    onChange({ x: clamp(dragStart.current.ox + dx), y: clamp(dragStart.current.oy + dy), scale })
  }
  const onTouchEnd = () => { setIsDragging(false); dragStart.current = null }

  /* ── Scroll to zoom (non-passive) ────────────── */
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.08 : -0.08
    onChange({ x, y, scale: Math.max(1, Math.min(3, +(scale + delta).toFixed(2))) })
  }, [x, y, scale, onChange])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const reset = () => onChange({ x: 50, y: 50, scale: 1 })

  /* ── Shape indicator badge ─────────────────── */
  const shapeBadge = natRatio === null
    ? null
    : natRatio <= 0.85
    ? { label: '▬ Portrait (Tall rectangle)', color: 'text-violet-700 border-violet-300 bg-violet-50' }
    : natRatio >= 1.15
    ? { label: '⬛ Landscape (Wide rectangle)', color: 'text-sky-700 border-sky-300 bg-sky-50' }
    : { label: '◼ Near Square', color: 'text-stone-600 border-stone-300 bg-stone-50' }

  return (
    <div className="space-y-4" ref={wrapperRef}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label className="block font-bold uppercase text-xs tracking-wider">Manual Focus &amp; Zoom</label>
          {ratioLabel && (
            <span className="text-[0.6rem] font-mono text-[var(--color-ink-soft)]">{ratioLabel}</span>
          )}
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-[0.65rem] uppercase tracking-wider border border-[var(--color-line)] px-2 py-1 font-bold text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)] transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      {/* Shape auto-detected badge */}
      {shapeBadge && (
        <div className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${shapeBadge.color}`}>
          {shapeBadge.label}
          <span className="font-normal normal-case">· preview sized automatically</span>
        </div>
      )}

      {/* Preview canvas — height auto-derived from natural ratio */}
      <div
        ref={containerRef}
        style={{ height: previewH }}
        className={`relative w-full overflow-hidden border-2 border-[var(--color-primary)] select-none transition-[height] duration-500 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {image ? (
          <img
            src={image}
            alt="Focus editor"
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${x.toFixed(1)}% ${y.toFixed(1)}%`,
              transform: `scale(${scale})`,
              transformOrigin: `${x.toFixed(1)}% ${y.toFixed(1)}%`,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-xs text-[var(--color-ink-soft)] bg-[var(--color-bg)]">
            <span className="text-2xl">📷</span>
            Upload a photo above to start adjusting
          </div>
        )}

        {/* Crosshair */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-8 h-8">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/70 -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/70 -translate-x-1/2" />
            <div className="absolute inset-0 border border-white/40 rounded-full" />
          </div>
        </div>

        {/* Info badge */}
        <div className="absolute bottom-2 left-2 text-[0.6rem] text-white bg-black/60 px-2 py-1 tracking-wider font-mono">
          x:{x.toFixed(0)}% y:{y.toFixed(0)}% zoom:{scale.toFixed(2)}×
        </div>

        {!isDragging && image && (
          <div className="absolute top-2 right-2 text-[0.6rem] text-white bg-black/50 px-2 py-1 tracking-wider">
            Drag to pan · Scroll to zoom
          </div>
        )}
      </div>

      {/* Zoom row */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)] shrink-0">Zoom</span>
        <button
          type="button"
          onClick={() => onChange({ x, y, scale: Math.max(1, +(scale - 0.1).toFixed(2)) })}
          className="w-7 h-7 border border-[var(--color-line)] flex items-center justify-center text-lg leading-none hover:bg-[var(--color-bg)] shrink-0 font-bold text-[var(--color-ink-soft)]"
        >−</button>
        <input
          type="range" min="1" max="3" step="0.01" value={scale}
          onChange={(e) => onChange({ x, y, scale: Number(e.target.value) })}
          className="flex-1 h-1.5 accent-[var(--color-primary)] cursor-pointer"
        />
        <button
          type="button"
          onClick={() => onChange({ x, y, scale: Math.min(3, +(scale + 0.1).toFixed(2)) })}
          className="w-7 h-7 border border-[var(--color-line)] flex items-center justify-center text-lg leading-none hover:bg-[var(--color-bg)] shrink-0 font-bold text-[var(--color-ink-soft)]"
        >+</button>
        <span className="text-xs font-mono font-bold w-12 text-right shrink-0 text-[var(--color-primary)]">
          {scale.toFixed(2)}×
        </span>
      </div>

      {/* Fine-tune X / Y sliders */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">Horizontal</span>
            <span className="text-[0.65rem] font-mono font-bold">{x.toFixed(0)}%</span>
          </div>
          <input type="range" min="0" max="100" step="1" value={x}
            onChange={(e) => onChange({ x: Number(e.target.value), y, scale })}
            className="w-full h-1.5 accent-[var(--color-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[0.55rem] text-[var(--color-ink-soft)] font-mono">
            <span>Left</span><span>Right</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">Vertical</span>
            <span className="text-[0.65rem] font-mono font-bold">{y.toFixed(0)}%</span>
          </div>
          <input type="range" min="0" max="100" step="1" value={y}
            onChange={(e) => onChange({ x, y: Number(e.target.value), scale })}
            className="w-full h-1.5 accent-[var(--color-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[0.55rem] text-[var(--color-ink-soft)] font-mono">
            <span>Top</span><span>Bottom</span>
          </div>
        </div>
      </div>
    </div>
  )
}
