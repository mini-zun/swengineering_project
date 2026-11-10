import { useEffect, useId, useRef } from 'react'
import { useSaveAction } from '../../hooks/useSaveAction.js'

const paths = {
  plus: 'M12 5v14M5 12h14',
  link: 'M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2',
  arrow: 'M7 17 17 7M7 7h10v10',
  edit: 'm15 4 5 5M4 20l4-1L20 7a3 3 0 0 0-4-4L4 15v5Z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  calendar: 'M5 5h14v16H5zM8 3v4M16 3v4M5 10h14',
  play: 'm8 5 11 7-11 7Z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M6 6h12v12H6Z',
  close: 'm6 6 12 12M6 18 18 6',
  target: 'M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5M12 12l9-9M16 3h5v5',
}
export function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.link} />
    </svg>
  )
}
export function ErrorText({ children }) {
  return children ? (
    <p className="sc-error" role="alert">
      {children}
    </p>
  ) : null
}
export function Modal({ title, children, onClose, closable = true, returnFocusRef }) {
  const ref = useRef(null),
    opener = useRef(null),
    titleId = useId()
  useEffect(() => {
    if (!opener.current) opener.current = document.activeElement
    const dialog = ref.current,
      previous = opener.current,
      fallback = returnFocusRef?.current
    dialog.showModal()
    const initial =
      dialog.querySelector('[data-initial-focus]') ||
      dialog.querySelector('input')
    initial?.focus()
    // Closing during StrictMode cleanup must not trigger a stale onClose on the next mount.
    return () => {
      if (dialog.open) dialog.close()
      // React가 삭제된 버튼을 DOM에서 제거한 다음 대체 대상에 복귀한다.
      queueMicrotask(() => {
        if (dialog.isConnected && dialog.open) return
        const target = previous?.isConnected && !previous.disabled
          ? previous : fallback
        if (target?.isConnected) target.focus()
      })
    }
  }, [returnFocusRef])
  return (
    <dialog
      className="sc-dialog"
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (closable) onClose()
      }}
    >
      <div className="sc-modal-head">
        <h3 id={titleId}>{title}</h3>
        {closable && (
          <button
            type="button"
            className="sc-icon-button"
            onClick={onClose}
            aria-label="닫기"
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      {children}
    </dialog>
  )
}
export function ConfirmDialog({ title, description, onConfirm, onClose, onRetry, returnFocusRef }) {
  const { error, busy, retryOnly, run } = useSaveAction(onRetry)
  async function confirm() {
    await run(onConfirm, onClose)
  }
  return (
    <Modal title={title} closable={!busy} onClose={busy ? () => {} : onClose} returnFocusRef={returnFocusRef}>
      <p className="sc-dialog-copy">{description}</p>
      <ErrorText>{error}</ErrorText>
      <div className="sc-modal-actions">
        <button
          type="button"
          disabled={busy}
          className="sc-button secondary"
          data-initial-focus
          onClick={onClose}
        >
          취소
        </button>
        <button
          type="button"
          disabled={busy}
          className="sc-button danger"
          onClick={confirm}
        >
          {busy ? '처리 중…' : retryOnly ? '저장 재시도' : '삭제'}
        </button>
      </div>
    </Modal>
  )
}
