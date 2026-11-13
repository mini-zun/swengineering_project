import './BasicLayout.css'
import ResizableWidget from '../components/common/ResizableWidget.jsx'

const BASIC_LIMITS = {
  clock: { minWidth: 240, minHeight: 150, maxWidth: 1200, maxHeight: 600 },
  quote: { minWidth: 240, minHeight: 140, maxWidth: 1200, maxHeight: 900 },
  links: { minWidth: 280, minHeight: 180, maxWidth: 1200, maxHeight: 1200 },
  todos: { minWidth: 280, minHeight: 240, maxWidth: 1200, maxHeight: 1200 },
  memos: { minWidth: 280, minHeight: 240, maxWidth: 1200, maxHeight: 1200 },
  timer: { minWidth: 280, minHeight: 240, maxWidth: 1200, maxHeight: 1200 },
  calendar: { minWidth: 300, minHeight: 240, maxWidth: 1200, maxHeight: 1200 },
  dday: { minWidth: 260, minHeight: 180, maxWidth: 1200, maxHeight: 1200 },
}

// 같은 slot을 한 번만 렌더해 편집 상태와 실행 중인 타이머를 유지한다.
export default function BasicLayout({ tabs, quote, space, status, slots = {}, widgetSizes = {}, onWidgetSizeChange }) {
  function widget(id, content) {
    return <ResizableWidget widgetId={id} size={widgetSizes[id] ?? 'm'}
      contextId={`${space.id}:basic`} limits={BASIC_LIMITS[id]} centered={id === 'clock' || id === 'quote'}
      onSizeChange={(size) => onWidgetSizeChange(id, size)}>{content}</ResizableWidget>
  }
  return <div className="basic-layout">
    <a className="skip-link" href="#main">본문으로 이동</a>
    <header className="app-header">
      {tabs}
      <a className="brand" href="#main" aria-label="Start 본문으로 이동">Start<span>나만의 시작페이지</span></a>
    </header>
    <p className="hint layout-resize-hint">각 영역의 오른쪽 아래 모서리를 드래그해 크기를 바꿔 보세요.</p>
    <main id="main" tabIndex={-1} aria-label={`${space.name} 공간`}>
      <h1 className="visually-hidden">{space.name} 공간</h1>
      <section className="hero" aria-label="오늘의 시간과 한 문장">
        {widget('clock', slots.clock)}
        {widget('quote', quote)}
      </section>
      {widget('links', slots.links)}
      <div className="workspace-grid">
        {widget('todos', slots.todos)}
        {widget('memos', slots.memos)}
        {widget('timer', slots.timer)}
      </div>
      <div className="support-grid">
        {widget('calendar', slots.calendar)}
        {widget('dday', slots.dday)}
      </div>
    </main>
    <footer className="app-footer">{status}<p>로그인 없이 이 브라우저에 저장됩니다.</p></footer>
  </div>
}
