import { cloneElement } from 'react'
import './BasicLayout.css'
import './MemoBoardLayout.css'
import ResizableWidget from '../components/common/ResizableWidget.jsx'

const LIMITS = {
  clock: { minWidth: 220, minHeight: 76, maxWidth: 600, maxHeight: 160 },
  quote: { minWidth: 240, minHeight: 140, maxWidth: 1400, maxHeight: 900 },
  links: { minWidth: 260, minHeight: 260, maxWidth: 1400, maxHeight: 1200 },
  todos: { minWidth: 280, minHeight: 260, maxWidth: 1400, maxHeight: 1200 },
  memos: { minWidth: 280, minHeight: 300, maxWidth: 1400, maxHeight: 1200 },
  calendar: { minWidth: 280, minHeight: 130, maxWidth: 1400, maxHeight: 600 },
  timer: { minWidth: 280, minHeight: 260, maxWidth: 1400, maxHeight: 1200 },
  dday: { minWidth: 260, minHeight: 180, maxWidth: 1400, maxHeight: 1200 },
}

// 종이와 장식은 표시만 담당하고 내용·저장·조작은 공통 slot을 사용한다.
export default function MemoBoardLayout({ tabs, themeControl, quote, space, status, slots = {}, widgetSizes = {}, onWidgetSizeChange, themeId = 'memo-board' }) {
  function widget(id, content) {
    return <ResizableWidget widgetId={id} size={widgetSizes[id] ?? 'm'} contextId={`${space.id}:${themeId}`}
      limits={LIMITS[id]} onSizeChange={(size) => onWidgetSizeChange(id, size)}>{content}</ResizableWidget>
  }
  const clock = slots.clock && cloneElement(slots.clock, { variant: 'compact' })
  const week = slots.calendar && cloneElement(slots.calendar, { variant: 'week', title: '이번 주' })
  return <div className="basic-layout memo-board-layout">
    <a className="skip-link" href="#main">본문으로 이동</a>
    <header className="mb-header"><a className="mb-brand" href="#main">start.</a><span>오늘을 붙여두는 곳</span>
      <div className="mb-header-tools">{widget('clock', clock)}{themeControl}</div></header>
    <main id="main" className="mb-board" tabIndex={-1} aria-label={`${space.name} 공간`}>
      <div className="mb-board-top">
        <div className="mb-space-paper"><p>MY LITTLE BOARD</p><h1>{space.name}</h1><span>나에게 필요한 것들을 한곳에.</span></div>
        <div className="mb-tabs">{tabs}</div>
      </div>
      <div className="mb-columns">
        <div className="mb-column mb-links-column">{widget('links', slots.links)}</div>
        <div className="mb-column mb-todos-column">{widget('todos', slots.todos)}</div>
        <div className="mb-column mb-memos-column">{widget('memos', slots.memos)}</div>
      </div>
      <div className="mb-week-row">{widget('calendar', week)}{widget('quote', quote)}</div>
      <div className="mb-support">{widget('timer', slots.timer)}{widget('dday', slots.dday)}</div>
      <p className="mb-resize-hint">영역 오른쪽 아래에서 크기 조절 · 손잡이에 초점을 두고 방향키로도 조절할 수 있어요.</p>
      <footer className="app-footer">{status}<p>로그인 없이 이 브라우저에 저장됩니다.</p></footer>
    </main>
  </div>
}
