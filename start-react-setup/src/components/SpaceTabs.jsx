import { useEffect, useRef, useState } from 'react'
import { characterCount } from '../state/spaces.js'

function SpaceDialog({ mode, space, onSubmit, onDismiss, navigationRef }) {
  const dialog = useRef(null)
  const [name, setName] = useState(space?.name ?? '')
  const [error, setError] = useState('')
  const deleting = mode === 'delete'
  const title = deleting ? '공간 삭제' : mode === 'rename' ? '공간 이름 변경' : '새 공간 만들기'

  useEffect(() => {
    const element = dialog.current
    const navigation = navigationRef.current
    const previousFocus = document.activeElement
    element.showModal()
    return () => {
      element.close()
      // 삭제 버튼의 disabled 갱신과 대화상자 제거가 끝난 뒤 복귀 대상을 고른다.
      queueMicrotask(() => {
        if (element.open) return // StrictMode에서 다시 열린 대화상자의 초점을 유지한다.
        const canRestore = previousFocus?.isConnected && !previousFocus.disabled
        if (canRestore) previousFocus.focus()
        if (navigation?.isConnected && (!canRestore || document.activeElement !== previousFocus)) {
          navigation.querySelector('.space-tab[aria-pressed="true"]')?.focus()
        }
      })
    }
  }, [navigationRef])

  function submit(event) {
    event.preventDefault()
    try { onSubmit(name); onDismiss() }
    catch (failure) { setError(failure.message) }
  }

  return <dialog ref={dialog} aria-labelledby="space-dialog-title" onCancel={(event) => { event.preventDefault(); onDismiss() }}>
    <form onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }}>
      <h2 id="space-dialog-title">{title}</h2>
      {deleting ? <p>‘{space.name}’ 공간과 포함된 바로가기·할 일·메모가 모두 삭제돼요. 삭제할까요?</p> : <>
        <label htmlFor="space-name">공간 이름</label>
        <input id="space-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus aria-describedby="space-name-help space-error" aria-invalid={Boolean(error)} />
        <p id="space-name-help" className="hint">{characterCount(name.trim())}/20자 · 같은 이름은 사용할 수 없어요.</p>
      </>}
      <p id="space-error" className="error" role="alert">{error}</p>
      <div className="dialog-actions"><button type="button" onClick={onDismiss} autoFocus={deleting}>취소</button>
        <button className={deleting ? 'danger' : 'primary'} type="submit">{deleting ? '삭제' : '저장'}</button></div>
    </form>
  </dialog>
}

export default function SpaceTabs({ spaces, activeSpaceId, onSelect, onCreate, onRename, onDelete }) {
  const navigationRef = useRef(null)
  const [editing, setEditing] = useState(null)
  const active = spaces.find((space) => space.id === activeSpaceId)
  return <section ref={navigationRef} className="space-navigation" aria-label="공간 관리">
    <div className="space-tabs" role="group" aria-label="공간 선택">
      {spaces.map((space) => <button key={space.id} aria-pressed={space.id === activeSpaceId} title={space.name}
        className={space.id === activeSpaceId ? 'space-tab selected' : 'space-tab'} onClick={() => onSelect(space.id)}>{space.name}</button>)}
    </div>
    <div className="space-actions"><button onClick={() => setEditing({ mode: 'create' })}>+ 새 공간</button>
      <button onClick={() => setEditing({ mode: 'rename', space: active })}>이름 변경</button>
      <button disabled={spaces.length === 1} title={spaces.length === 1 ? '마지막 공간은 삭제할 수 없어요.' : '현재 공간 삭제'}
        onClick={() => setEditing({ mode: 'delete', space: active })}>삭제</button></div>
    {editing && <SpaceDialog {...editing} navigationRef={navigationRef} onDismiss={() => setEditing(null)} onSubmit={(name) => {
      if (editing.mode === 'create') onCreate(name)
      else if (editing.mode === 'rename') onRename(editing.space.id, name)
      else onDelete(editing.space.id)
    }} />}
  </section>
}
