import { cloneElement } from 'react'
import './BasicLayout.css'
import './SidebarCorkLayout.css'
import ResizableWidget from '../components/common/ResizableWidget.jsx'

const CORK_LIMITS = {
  clock: { minWidth: 220, minHeight: 76, maxWidth: 700, maxHeight: 400 },
  quote: { minWidth: 240, minHeight: 100, maxWidth: 1400, maxHeight: 900 },
  links: { minWidth: 260, minHeight: 180, maxWidth: 1400, maxHeight: 1200 },
  todos: { minWidth: 260, minHeight: 240, maxWidth: 1400, maxHeight: 1200 },
  memos: { minWidth: 280, minHeight: 280, maxWidth: 1400, maxHeight: 1200 },
  timer: { minWidth: 260, minHeight: 320, maxWidth: 1400, maxHeight: 1200 },
  calendar: { minWidth: 260, minHeight: 320, maxWidth: 1400, maxHeight: 1200 },
  dday: { minWidth: 260, minHeight: 180, maxWidth: 1400, maxHeight: 1200 },
}

// 기능·저장은 공통 slot에 맡긴다. 열 안의 일반 흐름으로 크기 변경 시 겹침을 막는다.
export default function SidebarCorkLayout({ tabs, themeControl, quote, space, status, slots = {}, widgetSizes = {}, onWidgetSizeChange, themeId = 'sidebar-cork' }) {
  function widget(id, content) {
    return <ResizableWidget widgetId={id} size={widgetSizes[id] ?? 'm'}
      contextId={`${space.id}:${themeId}`} limits={CORK_LIMITS[id]}
      onSizeChange={(size) => onWidgetSizeChange(id, size)}>{content}</ResizableWidget>
  }
  const clock = slots.clock && cloneElement(slots.clock, { variant: 'compact' })
  const calendar = slots.calendar && cloneElement(slots.calendar, { variant: 'month', title: '달력' })

  return <div className="basic-layout sidebar-cork-layout">
    <a className="skip-link" href="#main">본문으로 이동</a>
    <aside className="cork-sidebar" aria-label="내 공간">
      <a className="cork-brand" href="#main"><span aria-hidden="true">✳</span> 내 시작페이지.</a>
      <p className="cork-subtitle">작은 기록이 모이는 나만의 보드</p>
      <h2 className="cork-sidebar-heading">MY SPACES <span className="visually-hidden">공간 목록</span></h2>
      {tabs}
      <p className="cork-sidebar-note">흩어진 생각도, 할 일도.<br />내게 맞는 공간에 정리해 두세요.</p>
    </aside>
    <div className="cork-workspace">
      <header className="cork-topbar">
        <p>내 워크스페이스 <span aria-hidden="true">/</span> <strong>{space.name}</strong></p>
        {widget('clock', clock)}
      </header>
      <main id="main" className="cork-board" tabIndex={-1} aria-label={`${space.name} 공간`}>
        <section className="cork-welcome" aria-labelledby="cork-title">
          <div><p className="cork-eyebrow">나만의 작은 보드</p>
            <h1 id="cork-title">오늘의 조각을 붙여보세요<span>.</span></h1>
            <p>할 일도, 문득 떠오른 생각도. 나만의 보드 위에.</p></div>
          {themeControl}
        </section>
        {widget('quote', quote)}
        <p className="cork-resize-hint">각 영역의 오른쪽 아래 모서리를 드래그하거나 방향키로 크기를 조절하세요.</p>
        <div className="cork-columns">
          <div className="cork-primary">
            {widget('links', slots.links)}
            {widget('todos', slots.todos)}
            {widget('memos', slots.memos)}
          </div>
          <div className="cork-secondary">
            {widget('timer', slots.timer)}
            {widget('calendar', calendar)}
            {widget('dday', slots.dday)}
          </div>
        </div>
        <footer className="app-footer">{status}<p>로그인 없이 이 브라우저에 저장됩니다.</p></footer>
      </main>
    </div>
  </div>
}
