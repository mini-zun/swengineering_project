import { cloneElement } from 'react'
import './BasicLayout.css'
import './EmotionalLayout.css'
import ResizableWidget from '../components/common/ResizableWidget.jsx'

const EMOTIONAL_LIMITS = {
  clock: { minWidth: 240, minHeight: 150, maxWidth: 1200, maxHeight: 600 },
  quote: { minWidth: 240, minHeight: 120, maxWidth: 1200, maxHeight: 900 },
  links: { minWidth: 260, minHeight: 180, maxWidth: 1200, maxHeight: 1200 },
  todos: { minWidth: 260, minHeight: 240, maxWidth: 1200, maxHeight: 1200 },
  memos: { minWidth: 280, minHeight: 280, maxWidth: 1200, maxHeight: 1200 },
  calendar: { minWidth: 280, minHeight: 130, maxWidth: 1200, maxHeight: 600 },
  timer: { minWidth: 280, minHeight: 240, maxWidth: 1200, maxHeight: 1200 },
  dday: { minWidth: 260, minHeight: 180, maxWidth: 1200, maxHeight: 1200 },
}

// 감성 테마(SCRUM-34). 기능과 데이터는 App이 넘긴 공통 slot을 그대로 쓰고 배치·색상·장식만 정한다.
// 배치: 상단 시계·문구 → 왼쪽 바로가기·할 일 / 오른쪽 줄노트 메모·주간 날짜 → 아래 누적 타이머·디데이.
// 위치는 고정이고 크기만 조절한다. 모든 영역이 일반 흐름 안에 있어 크기를 바꿔도 서로 겹치지 않는다.
// 공통 컴포넌트의 기본 표시 규칙(.basic-layout 범위)을 재사용하고 .emotional-layout에서 감성 테마 값만 덮어쓴다.
export default function EmotionalLayout({ tabs, themeControl, quote, space, status, slots = {}, widgetSizes = {}, onWidgetSizeChange, themeId = 'emotional' }) {
  function widget(id, content, centered = false) {
    return <ResizableWidget widgetId={id} size={widgetSizes[id] ?? 'm'}
      contextId={`${space.id}:${themeId}`} limits={EMOTIONAL_LIMITS[id]} centered={centered}
      onSizeChange={(size) => onWidgetSizeChange(id, size)}>{content}</ResizableWidget>
  }
  // 시안의 오른쪽 아래는 주간 날짜다. 같은 달력 컴포넌트를 주간 표시로만 바꿔 쓴다.
  const week = slots.calendar && cloneElement(slots.calendar, { variant: 'week', title: '이번 주' })
  return <div className="basic-layout emotional-layout">
    <a className="skip-link" href="#main">본문으로 이동</a>
    <header className="app-header">
      {tabs}
      {themeControl}
      <a className="brand" href="#main" aria-label="Start 본문으로 이동">Start<span>나만의 시작페이지</span></a>
    </header>
    <main id="main" tabIndex={-1} aria-label={`${space.name} 공간`}>
      <h1 className="visually-hidden">{space.name} 공간</h1>
      <section className="emotional-hero" aria-label="오늘의 시간과 한 문장">
        {widget('clock', slots.clock, true)}
        {widget('quote', quote, true)}
      </section>
      <div className="emotional-columns">
        <div className="emotional-column emotional-column-left">
          {widget('links', slots.links)}
          {widget('todos', slots.todos)}
        </div>
        <div className="emotional-column emotional-column-right">
          {widget('memos', slots.memos)}
          {widget('calendar', week)}
        </div>
      </div>
      <div className="emotional-extra">
        {widget('timer', slots.timer)}
        {widget('dday', slots.dday)}
      </div>
    </main>
    <footer className="app-footer">{status}<p>로그인 없이 이 브라우저에 저장됩니다.</p></footer>
  </div>
}
