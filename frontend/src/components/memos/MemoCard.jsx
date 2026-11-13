import { useEffect, useRef, useState } from 'react'
import { characterCount } from '../../state/spaces.js'
import { MEMO_MAX_LENGTH, memoColor } from '../../state/memos.js'
import MemoColorPicker from './MemoColorPicker.jsx'
import SizeSelect from '../common/SizeSelect.jsx'

function MemoDeleteDialog({ label, onConfirm, onDismiss }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    element.showModal()
    // 삭제를 확정하면 원래 삭제 버튼도 카드와 함께 사라진다. 그때 초점은 MemoWidget이 남은 요소로 옮긴다.
    return () => { element.close(); if (previousFocus?.isConnected) previousFocus.focus() }
  }, [])
  return <dialog ref={dialog} aria-labelledby="memo-delete-title" onCancel={(event) => { event.preventDefault(); onDismiss() }}>
    <h2 id="memo-delete-title">메모 삭제</h2>
    <p>‘{label}’ 메모를 삭제할까요? 삭제한 메모는 되돌릴 수 없어요.</p>
    <div className="dialog-actions"><button type="button" onClick={onDismiss} autoFocus>취소</button>
      <button type="button" className="danger" onClick={onConfirm}>삭제</button></div>
  </dialog>
}

function statusText(draft, persisted) {
  if (draft?.status === 'pending') return '입력 중 · 잠시 후 저장돼요'
  if (draft?.status === 'invalid') return draft.error
  if (draft?.status === 'failed') return '저장하지 못했어요. 새로고침하면 저장하지 못한 내용이 사라질 수 있어요.'
  return persisted ? '저장됨' : '저장되지 않은 변경이 있어요'
}

// 표시 전용 카드. 데이터 변경은 모두 이벤트로 올려 보낸다.
export default function MemoCard({ memo, label, size, draft, persisted, onChange, onColor, onSize, onDelete, onRetry }) {
  const [confirming, setConfirming] = useState(false)
  const content = draft?.content ?? memo.content
  const color = memoColor(memo)
  const id = `memo-${memo.id}`
  const state = draft?.status ?? (persisted ? 'saved' : 'unsaved')
  return <article className="memo-card" data-color={color} data-size={size} aria-label={label}>
    <label className="memo-sr-only" htmlFor={id}>{label} 내용</label>
    <textarea id={id} className="memo-text" value={content} placeholder="떠오른 생각을 자유롭게 적어 보세요."
      onChange={(event) => onChange(event.target.value)} aria-invalid={state === 'invalid'} aria-describedby={`${id}-status`} />
    <div className="memo-toolbar">
      <MemoColorPicker name={`${id}-color`} value={color} onChange={onColor} />
      <SizeSelect className="memo-size" label={`${label} 크기`} value={size} onChange={onSize} />
    </div>
    <div className="memo-status" data-state={state}>
      <p id={`${id}-status`} role={state === 'failed' || state === 'invalid' ? 'alert' : 'status'}>{statusText(draft, persisted)}</p>
      {state === 'failed' && <button type="button" onClick={onRetry}>다시 저장</button>}
      <span className="memo-length">{characterCount(content).toLocaleString('ko-KR')}/{MEMO_MAX_LENGTH.toLocaleString('ko-KR')}자</span>
      <button type="button" className="memo-delete" onClick={() => content ? setConfirming(true) : onDelete()}>삭제</button>
    </div>
    {confirming && <MemoDeleteDialog label={label} onDismiss={() => setConfirming(false)} onConfirm={() => { setConfirming(false); onDelete() }} />}
  </article>
}
