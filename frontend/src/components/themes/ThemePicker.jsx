import { useEffect, useRef, useState } from 'react'
import './ThemePicker.css'

// 대표 색과 배치 종류만으로 그리는 작은 미리보기. 장식이라 보조 기술에는 숨긴다.
function ThemePreview({ preview }) {
  return <span className={`theme-preview theme-preview-${preview.shape}`} aria-hidden="true"
    style={{ '--preview-bg': preview.bg, '--preview-surface': preview.surface, '--preview-ink': preview.ink, '--preview-accent': preview.accent }}>
    <span className="theme-preview-a" /><span className="theme-preview-b" /><span className="theme-preview-c" /><span className="theme-preview-d" />
  </span>
}

// 테마 버튼. 레이아웃이 원하는 위치에 배치한다. 대화상자는 App이 레이아웃 밖에 두어 테마가 바뀌어도 닫히지 않는다.
export function ThemeButton({ onOpen, themeName }) {
  return <button type="button" className="theme-button" data-theme-button aria-haspopup="dialog" onClick={onOpen}
    title="이 공간의 테마 바꾸기">테마<span className="visually-hidden">: {themeName}</span></button>
}

// options: themeOptions()의 결과. onSelect(themeId)는 { error }를 돌려준다.
export function ThemeDialog({ spaceName, selectedId, fallback, selectedName, options, onSelect, onClose }) {
  const dialog = useRef(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => {
      element.close()
      queueMicrotask(() => {
        if (element.open) return // StrictMode에서 다시 열린 대화상자의 초점을 유지한다.
        document.querySelector('[data-theme-button]')?.focus()
      })
    }
  }, [])

  function choose(themeId) {
    if (themeId === selectedId) return
    let result
    try { result = onSelect(themeId) }
    catch (failure) { result = { error: failure.message } }
    setError(result?.error ? `테마를 저장하지 못했어요. ${result.error}` : '')
  }

  return <dialog ref={dialog} className="theme-dialog" aria-labelledby="theme-dialog-title" aria-describedby="theme-dialog-scope"
    onCancel={(event) => { event.preventDefault(); onClose() }}>
    <h2 id="theme-dialog-title">테마 선택</h2>
    <p id="theme-dialog-scope" className="hint">‘{spaceName}’ 공간에 적용돼요. 공간마다 다른 테마를 고를 수 있어요.</p>
    {fallback && <p className="theme-fallback" role="status">이 공간에서 고른 ‘{selectedName}’ 테마는 아직 준비 중이라 지금은 기본 디자인으로 보여요. 선택은 그대로 저장돼 있어요.</p>}
    <ul className="theme-options" aria-label="테마 목록">
      {options.map((theme) => <li key={theme.id}>
        <button type="button" className="theme-option" aria-pressed={theme.id === selectedId} disabled={!theme.available}
          onClick={() => choose(theme.id)}>
          <ThemePreview preview={theme.preview} />
          <span className="theme-option-name">{theme.name}</span>
          <span className="theme-option-description">{theme.description}</span>
          <span className="theme-option-state">{theme.id === selectedId ? (theme.available ? '사용 중' : '선택됨 · 준비 중') : !theme.available ? '준비 중' : fallback && theme.displayed ? '지금 표시 중' : '선택 가능'}</span>
        </button>
      </li>)}
    </ul>
    <p className="error" role="alert">{error}</p>
    <div className="theme-notes">
      <p><strong>테마</strong>는 화면 전체의 배치와 분위기를 바꿔요. 메모·할 일·바로가기·집중 기록은 테마를 바꿔도 그대로 남아요.</p>
      <p><strong>개별 색상</strong>(메모 색상처럼 항목마다 고르는 색)은 테마와 따로 저장돼요. 각 항목에서 바꾸고, 테마를 바꿔도 유지돼요.</p>
    </div>
    <div className="dialog-actions"><button type="button" className="primary" onClick={onClose} autoFocus>닫기</button></div>
  </dialog>
}
