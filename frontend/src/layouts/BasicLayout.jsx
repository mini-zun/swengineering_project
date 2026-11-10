import './BasicLayout.css'

const areas = [
  ['links', '사이트 바로가기', '자주 찾는 사이트가 모이는 곳'],
  ['todos', '할 일', '하루의 할 일을 정리하는 곳'],
  ['memos', '메모', '떠오른 생각을 자유롭게 적는 곳'],
  ['clock', '시계·오늘 날짜', '지금의 시간과 날짜를 확인하는 곳'],
  ['calendar', '달력·주간 날짜', '날짜를 살펴보는 곳'],
  ['timer', '집중 타이머', '집중한 시간을 쌓아 가는 곳'],
  ['dday', '디데이', '기다리는 날까지의 시간을 확인하는 곳'],
]

// slots에 팀원 컴포넌트를 전달한다. 데이터와 변경 이벤트는 App에서 연결한다.
export default function BasicLayout({ tabs, quote, space, status, slots = {} }) {
  return <div className="basic-layout">
    <header className="app-header"><a className="brand" href="#main">Start<span>내 취향 웹홈페이지</span></a><span className="header-note">나에게 맞는 하루의 시작</span></header>
    {tabs}
    <main id="main">
      <div className="page-heading"><div><p className="eyebrow">MY SPACE</p><h1>{space.name}</h1></div><p>공간을 바꾸면, 하루에 필요한 것들도 함께.</p></div>
      {quote}
      <div className="widget-grid">{areas.map(([key, title, description]) => <section key={key} className={`widget widget-${key}`} aria-label={title}>
        {slots[key] ?? <><h2>{title}</h2><p>{description}</p><span className="placeholder-label">컴포넌트 연결 예정</span></>}
      </section>)}</div>
    </main>
    <footer>{status}<p>로그인 없이 이 브라우저에 저장됩니다.</p></footer>
  </div>
}
