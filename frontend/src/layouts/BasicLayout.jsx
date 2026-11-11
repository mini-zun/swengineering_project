import './BasicLayout.css'

// 같은 slot을 한 번만 렌더해 편집 상태와 실행 중인 타이머를 유지한다.
export default function BasicLayout({ tabs, quote, space, status, slots = {} }) {
  return <div className="basic-layout">
    <a className="skip-link" href="#main">본문으로 이동</a>
    <header className="app-header">
      {tabs}
      <a className="brand" href="#main" aria-label="Start 본문으로 이동">Start<span>나만의 시작페이지</span></a>
    </header>
    <main id="main" tabIndex={-1} aria-label={`${space.name} 공간`}>
      <h1 className="visually-hidden">{space.name} 공간</h1>
      <section className="hero" aria-label="오늘의 시간과 한 문장">
        {slots.clock}
        {quote}
      </section>
      <div className="widget widget-links">{slots.links}</div>
      <div className="workspace-grid">
        <div className="widget widget-todos">{slots.todos}</div>
        <div className="widget widget-memos">{slots.memos}</div>
        <div className="widget widget-timer">{slots.timer}</div>
      </div>
      <div className="support-grid">
        <section className="widget widget-calendar" aria-label="달력·주간 날짜">{slots.calendar}</section>
        <section className="widget widget-dday" aria-label="디데이">{slots.dday}</section>
      </div>
    </main>
    <footer className="app-footer">{status}<p>로그인 없이 이 브라우저에 저장됩니다.</p></footer>
  </div>
}
