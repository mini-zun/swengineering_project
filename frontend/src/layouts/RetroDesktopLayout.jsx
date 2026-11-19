import { cloneElement } from 'react'
import './BasicLayout.css'
import './RetroDesktopLayout.css'
import ResizableWidget from '../components/common/ResizableWidget.jsx'

const LIMITS = {
  clock: { minWidth: 220, minHeight: 76, maxWidth: 700, maxHeight: 160 },
  quote: { minWidth: 260, minHeight: 140, maxWidth: 1400, maxHeight: 900 },
  links: { minWidth: 150, minHeight: 220, maxWidth: 1400, maxHeight: 1200 },
  todos: { minWidth: 280, minHeight: 260, maxWidth: 1400, maxHeight: 1200 },
  memos: { minWidth: 280, minHeight: 280, maxWidth: 1400, maxHeight: 1200 },
  timer: { minWidth: 280, minHeight: 260, maxWidth: 1400, maxHeight: 1200 },
  calendar: { minWidth: 280, minHeight: 320, maxWidth: 1400, maxHeight: 1200 },
  dday: { minWidth: 260, minHeight: 180, maxWidth: 1400, maxHeight: 1200 },
}
const TITLES = { links: '바로가기', todos: '할 일.txt', memos: '메모장', timer: '집중.exe', calendar: '달력', dday: '디데이', quote: '오늘의 한마디' }

export default function RetroDesktopLayout({ tabs, themeControl, quote, space, status, slots = {}, widgetSizes = {}, onWidgetSizeChange, themeId = 'retro-desktop' }) {
  function widget(id, content) {
    return <ResizableWidget widgetId={id} size={widgetSizes[id] ?? 'm'} contextId={`${space.id}:${themeId}`}
      limits={LIMITS[id]} onSizeChange={(size) => onWidgetSizeChange(id, size)}>
      {id !== 'clock' && <div className="rd-titlebar" aria-hidden="true"><span>{TITLES[id]}</span><span>▱ ─</span></div>}
      {content}
    </ResizableWidget>
  }
  const clock = slots.clock && cloneElement(slots.clock, { variant: 'compact' })
  const calendar = slots.calendar && cloneElement(slots.calendar, { variant: 'month', title: '달력' })
  return <div className="basic-layout retro-desktop-layout">
    <a className="skip-link" href="#main">본문으로 이동</a>
    <header className="rd-header"><a href="#main" className="rd-brand"><span aria-hidden="true">▦</span> 내 시작페이지</a>
      <h1>{space.name} — Personal Desktop</h1>{themeControl}</header>
    <div className="rd-desktop">
      <aside className="rd-spaces" aria-label="공간 관리 사이드바"><h2>내 공간</h2>{tabs}</aside>
      <main id="main" className="rd-workspace" tabIndex={-1} aria-label={`${space.name} 공간`}>
        <div className="rd-links">{widget('links', slots.links)}</div>
        <div className="rd-main-column">{widget('todos', slots.todos)}{widget('memos', slots.memos)}{widget('quote', quote)}</div>
        <div className="rd-side-column">{widget('timer', slots.timer)}{widget('calendar', calendar)}{widget('dday', slots.dday)}</div>
      </main>
    </div>
    <footer className="rd-taskbar"><a className="rd-start" href="#main">▦ 시작</a><span className="rd-task-name">{space.name}</span>
      <div className="rd-status">{status}</div>{widget('clock', clock)}</footer>
  </div>
}
