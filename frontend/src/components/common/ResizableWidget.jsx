import { useId, useRef, useState } from 'react'
import { WIDGET_LABELS } from '../../state/widgetSizes.js'
import { dragWidgetSize, keyboardWidgetSize } from '../../lib/widgetResize.js'
import './ResizableWidget.css'

// 크기는 속성만 바꾼다. key나 컴포넌트 종류를 바꾸지 않아 내부 편집·타이머 상태를 유지한다.
export default function ResizableWidget({ widgetId, contextId, size, limits, centered = false, onSizeChange, children }) {
  const label = WIDGET_LABELS[widgetId]
  const helpId = useId()
  const element = useRef(null)
  const handle = useRef(null)
  const interaction = useRef(null)
  const [preview, setPreview] = useState(null)
  const live = preview?.contextId === contextId ? preview.size : null
  const dimensions = live ?? (typeof size === 'object' ? size : null)

  function availableWidth() {
    const parent = element.current.parentElement
    const style = getComputedStyle(parent)
    return Math.max(1, parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight))
  }
  function measure() {
    const rect = element.current.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }
  function cancel() {
    const job = interaction.current
    interaction.current = null
    if (job && handle.current?.hasPointerCapture(job.pointerId)) handle.current.releasePointerCapture(job.pointerId)
    setPreview(null)
  }
  function start(event) {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    interaction.current = { contextId, pointerId: event.pointerId,
      start: { ...measure(), x: event.clientX, y: event.clientY }, moved: false }
  }
  function move(event) {
    const job = interaction.current
    if (!job || job.pointerId !== event.pointerId) return
    if (job.contextId !== contextId) { cancel(); return }
    job.moved ||= Math.abs(event.clientX - job.start.x) + Math.abs(event.clientY - job.start.y) > 2
    if (!job.moved) return
    setPreview({ contextId, size: dragWidgetSize(job.start, { x: event.clientX, y: event.clientY }, limits, availableWidth(), centered) })
  }
  function finish(event) {
    const job = interaction.current
    if (!job || job.pointerId !== event.pointerId) return
    // 공간을 바꾼 뒤 도착한 포인터 이벤트는 새 공간에 저장하지 않는다.
    if (job.contextId === contextId && job.moved) {
      onSizeChange(dragWidgetSize(job.start, { x: event.clientX, y: event.clientY }, limits, availableWidth(), centered))
    }
    cancel()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function onKeyDown(event) {
    if (event.key === 'Escape' && interaction.current) { event.preventDefault(); cancel(); return }
    if (interaction.current) return
    const next = keyboardWidgetSize(measure(), event.key, event.shiftKey ? 50 : 10, limits, availableWidth())
    if (!next) return
    event.preventDefault()
    onSizeChange(next)
  }

  return <div ref={element} className={`widget resizable-widget widget-${widgetId}`}
    data-widget={widgetId} data-size={typeof size === 'string' ? size : 'custom'} data-resizing={Boolean(live)}
    style={{ '--widget-width': dimensions ? `${dimensions.width}px` : undefined,
      '--widget-height': dimensions ? `${dimensions.height}px` : undefined,
      '--widget-min-width': `${limits.minWidth}px`, '--widget-min-height': `${limits.minHeight}px`,
      '--widget-max-width': `${limits.maxWidth}px`, '--widget-max-height': `${limits.maxHeight}px` }}>
    <div className="widget-content" role="region" aria-label={`${label} 내용`} tabIndex={0}>{children}</div>
    <div className="widget-resize-footer">
      {live && <output className="widget-dimensions" aria-live="off">{live.width} × {live.height}</output>}
      {size !== 'm' && <button type="button" className="widget-size-reset" onClick={() => { cancel(); onSizeChange('m') }} aria-label={`${label} 기본 크기로`}>기본 크기</button>}
      <span id={helpId} className="visually-hidden">모서리를 드래그하거나 방향키로 크기를 조절하세요. Shift와 방향키는 50픽셀씩 조절해요. 드래그 중 Escape로 취소할 수 있어요.</span>
      <button ref={handle} type="button" className="widget-resize-handle" aria-label={`${label} 크기 조절`} aria-describedby={helpId}
        title={`${label} 크기 조절 · 드래그 또는 방향키`}
        onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={onKeyDown}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 14 14 5M10 14l4-4" /></svg>
      </button>
    </div>
  </div>
}
