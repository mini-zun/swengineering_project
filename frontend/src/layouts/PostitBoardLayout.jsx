import { cloneElement } from 'react'
import './BasicLayout.css'
import './PostitBoardLayout.css'
import ResizableWidget from '../components/common/ResizableWidget.jsx'

const LIMITS = {
  clock: { minWidth: 220, minHeight: 86, maxWidth: 600, maxHeight: 140 },
  quote: { minWidth: 240, minHeight: 110, maxWidth: 1600, maxHeight: 900 },
  todos: { minWidth: 280, minHeight: 260, maxWidth: 1400, maxHeight: 1200 },
  memos: { minWidth: 280, minHeight: 280, maxWidth: 1400, maxHeight: 1200 },
  dday: { minWidth: 220, minHeight: 240, maxWidth: 1400, maxHeight: 1200 },
  links: { minWidth: 280, minHeight: 200, maxWidth: 1400, maxHeight: 1200 },
  timer: { minWidth: 280, minHeight: 260, maxWidth: 1400, maxHeight: 1200 },
  calendar: { minWidth: 280, minHeight: 320, maxWidth: 1400, maxHeight: 1200 },
}

// 내용·저장은 App의 공통 slot에 맡기고 정해진 흐름 안에서 크기만 조절한다.
export default function PostitBoardLayout({ tabs, themeControl, quote, space, status, slots = {}, widgetSizes = {}, onWidgetSizeChange, themeId = 'postit-board' }) {
  function widget(id, content) {
    return <ResizableWidget widgetId={id} size={widgetSizes[id] ?? 'm'}
      contextId={`${space.id}:${themeId}`} limits={LIMITS[id]}
      onSizeChange={(size) => onWidgetSizeChange(id, size)}>{content}</ResizableWidget>
  }
  const clock = slots.clock && cloneElement(slots.clock, { variant: 'compact', hour12: true })
  const calendar = slots.calendar && cloneElement(slots.calendar, { variant: 'month' })

  return <div className="basic-layout postit-board-layout">
    <a className="skip-link" href="#main">본문으로 이동</a>
    <header className="pb-header" aria-label="오늘의 문구와 시간">
      {widget('quote', quote)}
      {widget('clock', clock)}
    </header>
    <div className="pb-navigation">{tabs}{themeControl}</div>
    <main id="main" tabIndex={-1} aria-label={`${space.name} 공간`}>
      <h1 className="visually-hidden">{space.name} 포스트잇 보드</h1>
      <div className="pb-upper">
        <div className="pb-column">{widget('todos', slots.todos)}</div>
        <div className="pb-notes">
          <div className="pb-column">{widget('memos', slots.memos)}</div>
          <div className="pb-column">{widget('dday', slots.dday)}</div>
        </div>
      </div>
      <div className="pb-lower">
        <div className="pb-column">{widget('links', slots.links)}</div>
        <div className="pb-column">{widget('timer', slots.timer)}</div>
      </div>
      <section className="pb-support" aria-label="날짜 조회">
        {widget('calendar', calendar)}
      </section>
    </main>
    <p className="pb-resize-hint">오른쪽 아래 모서리를 드래그하거나 손잡이에서 방향키로 크기를 조절하세요.</p>
    <footer className="app-footer">{status}<p>로그인 없이 이 브라우저에 저장됩니다.</p></footer>
  </div>
}
