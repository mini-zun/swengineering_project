import { useEffect, useRef, useState } from 'react'
import { characterCount } from '../../state/spaces.js'
import { DDAY_TITLE_MAX, submitDdayChange } from '../../state/ddays.js'

// 디데이 추가·수정·삭제 확인 대화상자. 검증은 onSubmit(state/ddays.js)이 맡고 실패 메시지만 보여준다.
// onSubmit·onRetry는 App commit의 저장 결과({ error })를 돌려준다. 저장 실패 시 대화상자와 입력을 유지하고 재시도만 허용한다.
export default function DdayDialog({ mode, dday, todayKey, onSubmit, onRetry, onDismiss, fallbackFocus }) {
  const dialog = useRef(null)
  const [title, setTitle] = useState(dday?.title ?? '')
  const [targetDate, setTargetDate] = useState(dday?.targetDate ?? todayKey)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const deleting = mode === 'delete'
  const heading = deleting ? '디데이 삭제' : mode === 'edit' ? '디데이 수정' : '새 디데이'

  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    element.showModal()
    return () => {
      element.close()
      // 삭제로 원래 버튼이 사라졌으면 위젯의 추가 버튼으로 초점을 돌린다.
      queueMicrotask(() => {
        if (element.open) return
        if (previousFocus?.isConnected) previousFocus.focus()
        else fallbackFocus?.()
      })
    }
  }, [fallbackFocus])

  function submit(event) {
    event.preventDefault()
    const outcome = submitDdayChange({ retrying, apply: () => onSubmit({ title, targetDate }), retry: onRetry })
    if (outcome.done) return onDismiss()
    setRetrying(outcome.retrying)
    setError(outcome.error)
  }

  return <dialog ref={dialog} className="dday-dialog" aria-labelledby="dday-dialog-title" onCancel={(event) => { event.preventDefault(); onDismiss() }}>
    <form onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }}>
      <h2 id="dday-dialog-title">{heading}</h2>
      {deleting ? <p>‘{dday.title}’ 디데이를 삭제할까요?</p> : <>
        <label htmlFor="dday-title">디데이 이름</label>
        <input id="dday-title" value={title} onChange={(event) => setTitle(event.target.value)} readOnly={retrying} autoFocus aria-describedby="dday-title-help dday-error" aria-invalid={Boolean(error)} />
        <p id="dday-title-help" className="hint">{characterCount(title.trim())}/{DDAY_TITLE_MAX}자</p>
        <label htmlFor="dday-date">목표 날짜</label>
        <input id="dday-date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} readOnly={retrying} required aria-describedby="dday-error" />
      </>}
      <p id="dday-error" className="error" role="alert">{error}</p>
      <div className="dialog-actions"><button type="button" onClick={onDismiss} autoFocus={deleting}>{retrying ? '닫기' : '취소'}</button>
        <button className={deleting ? 'danger' : 'primary'} type="submit">{retrying ? '저장 재시도' : deleting ? '삭제' : '저장'}</button></div>
    </form>
  </dialog>
}
