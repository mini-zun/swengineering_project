import { cloneElement } from 'react'
import './BasicLayout.css'
import './EmotionalLayout.css'
import ResizableWidget from '../components/common/ResizableWidget.jsx'

const EMOTIONAL_LIMITS = {
  clock: { minWidth: 220, minHeight: 130, maxWidth: 1200, maxHeight: 600 },
  quote: { minWidth: 240, minHeight: 120, maxWidth: 1200, maxHeight: 900 },
  links: { minWidth: 260, minHeight: 180, maxWidth: 1200, maxHeight: 1200 },
  todos: { minWidth: 260, minHeight: 240, maxWidth: 1200, maxHeight: 1200 },
  memos: { minWidth: 280, minHeight: 280, maxWidth: 1200, maxHeight: 1200 },
  calendar: { minWidth: 280, minHeight: 90, maxWidth: 1200, maxHeight: 600 },
  timer: { minWidth: 280, minHeight: 240, maxWidth: 1200, maxHeight: 1200 },
  dday: { minWidth: 260, minHeight: 180, maxWidth: 1200, maxHeight: 1200 },
}

// 시안 오른쪽 위의 작은 사진 장식. 내용이 없는 그림이라 보조 기술에는 숨긴다.
function Polaroid() {
  return <figure className="emotional-polaroid" aria-hidden="true">
    <svg viewBox="0 0 170 100" role="presentation">
      <rect width="170" height="100" fill="#ece7d3" />
      <circle cx="126" cy="26" r="11" fill="#eadfae" />
      <path d="M0 62c30-18 62-20 92-8s52 8 78-6v52H0z" fill="#b9bf9c" />
      <path d="M0 78c36-16 74-14 108-4s44 4 62-4v30H0z" fill="#8f9a70" />
      <path d="M96 100c2-16 14-22 10-34" fill="none" stroke="#ece7d3" strokeWidth="5" strokeLinecap="round" />
      <path d="M88 52l11-9 11 9v13H88z" fill="#f4efe0" /><path d="M85 53l14-12 14 12" fill="none" stroke="#a8755f" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 74c-7-10-5-26 0-36 5 10 7 26 0 36z" fill="#4f5a3a" /><path d="M72 66c-6-9-4-22 0-30 4 8 6 21 0 30z" fill="#5c6846" />
      <path d="M28 76c-5-8-4-19 0-26 4 7 5 18 0 26z" fill="#5c6846" />
    </svg>
    <figcaption>a quiet little place.</figcaption>
  </figure>
}

// 감성 테마(SCRUM-34). 기능과 데이터는 App이 넘긴 공통 slot을 그대로 쓰고 배치·색상·장식만 정한다.
// 배치(참고 이미지 감성적인분위기.png): 상단 이름·테마 버튼 → 시계 | 문구 | 사진 장식 → 공간 탭
// → 왼쪽 바로가기·할 일 / 오른쪽 줄노트 메모 → 주간 날짜 → 아래 누적 타이머·디데이.
// 위치는 고정이고 크기만 조절한다. 모든 영역이 일반 흐름 안에 있어 크기를 바꿔도 서로 겹치지 않는다.
// 공통 컴포넌트의 기본 표시 규칙(.basic-layout 범위)을 재사용하고 .emotional-layout에서 감성 테마 값만 덮어쓴다.
export default function EmotionalLayout({ tabs, themeControl, quote, space, status, slots = {}, widgetSizes = {}, onWidgetSizeChange, themeId = 'emotional' }) {
  function widget(id, content) {
    return <ResizableWidget widgetId={id} size={widgetSizes[id] ?? 'm'}
      contextId={`${space.id}:${themeId}`} limits={EMOTIONAL_LIMITS[id]}
      onSizeChange={(size) => onWidgetSizeChange(id, size)}>{content}</ResizableWidget>
  }
  // 시안의 날짜 영역은 주간 한 줄이다. 같은 달력 컴포넌트를 주간 표시로만 바꿔 쓴다.
  const week = slots.calendar && cloneElement(slots.calendar, { variant: 'week', title: '이번 주의 조각들' })
  return <div className="basic-layout emotional-layout">
    <a className="skip-link" href="#main">본문으로 이동</a>
    <header className="emotional-header">
      <a className="emotional-brand" href="#main" aria-label="Start 본문으로 이동">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <circle cx="8" cy="8" r="4" /><circle cx="16" cy="8" r="4" /><circle cx="8" cy="16" r="4" /><circle cx="16" cy="16" r="4" /></svg>
        <strong>start.</strong><span>나의 하루가 시작되는 곳</span>
      </a>
      <span className="emotional-welcome" aria-hidden="true">make yourself at home</span>
      {themeControl}
    </header>
    <main id="main" tabIndex={-1} aria-label={`${space.name} 공간`}>
      <h1 className="visually-hidden">{space.name} 공간</h1>
      <section className="emotional-hero" aria-label="오늘의 시간과 한 문장">
        {widget('clock', slots.clock)}
        {widget('quote', quote)}
        <Polaroid />
      </section>
      <div className="emotional-spaces">{tabs}</div>
      <div className="emotional-columns">
        <div className="emotional-column emotional-column-left">
          {widget('links', slots.links)}
          {widget('todos', slots.todos)}
        </div>
        <div className="emotional-column emotional-column-right">
          {widget('memos', slots.memos)}
        </div>
      </div>
      <div className="emotional-week">
        {widget('calendar', week)}
        <p className="emotional-motto" aria-hidden="true">little by little, day by day.</p>
      </div>
      <div className="emotional-extra">
        {widget('timer', slots.timer)}
        {widget('dday', slots.dday)}
      </div>
    </main>
    <footer className="app-footer">{status}<p>로그인 없이 이 브라우저에 저장됩니다.</p></footer>
  </div>
}
