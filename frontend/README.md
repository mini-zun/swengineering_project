# Start — 내 취향 웹홈페이지

React 19 + Vite 8 + JavaScript 프로젝트입니다. npm과 기존 package-lock.json을 사용합니다.

## 실행과 검사

프로젝트 폴더(`frontend/`)에서 실행합니다. 검증 환경: Windows, Node v24.18.0, npm 11.16.0.

- 최초 의존성 설치: `npm.cmd ci`
- 개발 서버: `npm.cmd run dev`
- ESLint: `npm.cmd run lint`
- 자동 테스트(tests/*.test.mjs 전체): `npm.cmd test`
- 배포용 빌드: `npm.cmd run build`
- 빌드 미리보기: `npm.cmd run preview`

PowerShell 실행 정책으로 npm.ps1이 차단되면 npm.cmd를 사용합니다. 필요한 환경변수는 없습니다.

## 이번 구현 범위

- FR-01~04: 빈 기본 공간 하나, 생성·선택·이름 변경·삭제, 마지막 공간 삭제 방지, 생성 순서 유지와 선택 공간 복원.
- FR-13: 저장 성공·실패 표시, 메모리의 최신 데이터 유지와 저장 재시도. 읽기 오류 시 원본 보존 및 편집 차단.
- FR-17: 좌우명·문구 입력·수정·취소·저장·복원. 빈 문구, 공백과 줄바꿈을 보존합니다.
- 기본 화면: 이슈 #13의 미니멀 페이퍼 디자인을 적용했습니다. 날짜·큰 시계·좌우명 아래에 바로가기를 놓고, PC에서 할 일·메모·집중 시간을 3열로 배치합니다. 좁은 화면에서는 열 수를 줄입니다. 추가 테마 선택은 이번 변경 범위에 포함하지 않습니다.
- #17·SCRUM-49: 기본 테마의 8개 위젯을 오른쪽 아래 모서리에서 드래그해 크기를 바꿉니다. 공간별·테마별 너비·높이를 저장하며 배치 순서는 유지합니다. 위치 이동과 추가 테마·사용자 꾸미기 UI는 포함하지 않습니다. 최초 프리셋 제안은 사용자 피드백에 따라 직접 조절 방식으로 변경했습니다.
- 문구는 공간별로 저장합니다(#15, SCRUM-22). 공간 전환 시 편집 초안은 원래 공간에 유지되며 명시적으로 저장하기 전에는 새로고침으로 사라집니다. 새 공간의 문구는 비어 있습니다. 저장 실패 시 편집창과 입력을 유지하고 재시도를 제공합니다.
- 이름 글자 수는 Array.from으로 센 유니코드 코드 포인트 기준입니다. 앞뒤 공백 제거 후 1~20자이며 조용히 잘라 저장하지 않습니다.

## 컴포넌트 경계와 팀원 연결

App이 공통 상태를 소유하고 `useQuotes`가 공간 ID별 문구 초안을 관리합니다. UI 컴포넌트는 localStorage를 직접 호출하지 않습니다.

| 컴포넌트 | 입력 | 변경 이벤트 / 책임 |
|---|---|---|
| components/spaces/SpaceTabs.jsx | spaces, activeSpaceId | onSelect(spaceId), onCreate(name), onRename(spaceId, name), onDelete(spaceId) |
| components/quote/Quote.jsx | 해당 공간 value, draft(null 또는 { content, error }) | onEdit(), onDraftChange(text), onSave(), onCancel(). App에서 공간 ID를 연결 |
| hooks/useQuotes.js, state/quotes.js | App의 commit(updater), 공간 ID·내용 | 공간별 초안·수동 저장·실패 표시·재시도 성공 후 정리. 공간 삭제 시 초안 제거 |
| layouts/BasicLayout.jsx | tabs, quote, space, status, slots, widgetSizes | 기본 테마 배치·치수와 onWidgetSizeChange(widgetId, size). App에서 spaceId·themeId를 연결 |
| components/common/ResizableWidget.jsx, lib/widgetResize.js | widgetId, contextId(공간·테마), size, limits, centered, children | 포인터 미리보기·드래그 종료 저장 이벤트·방향키·Escape 취소·기본 크기 복귀. onSizeChange(size)를 전달하며 자체 저장하지 않음 |
| components/common/SizeSelect.jsx, lib/sizes.js | label, value, onChange | 개별 메모의 기존 프리셋(s·m·l) 선택과 접근 가능한 이름 |
| state/widgetSizes.js | 공통 데이터, spaceId·themeId·widgetId·size | 크기 변경·조회·검증·공간 삭제 시 설정 정리 |
| components/clock/Clock.jsx | variant('hero' \| 'compact'), hour12, showSeconds | 현재 시각·날짜·요일 표시만 담당. 저장 데이터 없음. 스타일은 Clock.css의 `--clock-*` 변수 |
| state/spaces.js | 공통 데이터 | 공간 변경과 이름 검증. 기존 데이터와 ID 보존 |
| storage/storage.js | 공통 데이터, 선택적 저장소 어댑터 | 읽기·구조 검증·저장·오류 분류 |
| components/memos/MemoWidget.jsx | space, layout(memoLayout 결과), memos(useMemos 반환값), persisted | 메모 영역 진입점. 보기 방식(sheet·board)에 따라 MemoSheet/MemoBoard + MemoCard를 그림. memo.css를 직접 가져옴 |
| hooks/useMemos.js | App의 commit(updater) | 메모 초안·1초 자동 저장·메모별 저장 상태·선택 메모. 공간 전환 전 flush |
| state/memos.js, state/memoAutosave.js | 공통 데이터 | 메모 추가·수정·색상·삭제, 화면 설정(layout[테마].memo의 view·sizes), 메모별 저장 예약 |
| components/calendar/Calendar.jsx | todayKey('YYYY-MM-DD'), variant(full·month·week·mini), title, weekStart | 월간 달력·이번 주 표시, 이전·다음 달·오늘로 이동. 보고 있는 달은 저장하지 않음. 색·크기는 Calendar.css의 --calendar-* 변수 |
| hooks/useToday.js, lib/timeSource.js, lib/date.js | 없음 | 시계·달력·디데이 공유. 단일 타이머 store와 로컬 기준 날짜 계산. App이 useToday()를 한 번 호출해 todayKey를 내려줌 |
| components/dday/DdayWidget.jsx | ddays, todayKey | onAdd({ title, targetDate }), onUpdate(ddayId, { title, targetDate }), onDelete(ddayId). D-n·D-Day·D+n 표시, 가까운 날짜순. 색·크기는 Dday.css의 `--dday-*` 변수 |
| state/ddays.js, lib/dday.js | 공통 데이터 | 디데이 추가·수정·삭제와 이름(1~30자)·날짜 검증, 표시 문구와 표시 정렬 |

`main.jsx`는 `styles/global.css`를 가져오고 `App.jsx`는 공통 상태와 이벤트 연결을 담당합니다. 패키지 이름은 `start-frontend`이며 의존성 버전은 변경하지 않았습니다.

BasicLayout의 slots에 실제 팀원 컴포넌트를 전달하면 연결 예정 안내가 교체됩니다.
슬롯 키: links, todos, memos, clock, calendar, timer, dday.

시계·달력은 `lib/timeSource.js`의 시간 store 하나를 같이 구독합니다. 시계는 `hooks/useNow.js`로 분(초 표시 시 초) 단위, 달력은 `useToday`로 날짜 단위로 바뀔 때만 다시 그립니다.

예시(팀원 컴포넌트가 준비된 뒤 App에서 연결):

```jsx
slots={{
  links: <ShortcutList spaceId={activeSpace.id} links={activeSpace.links} onChange={handleLinksChange} />,
}}
```

바로가기·할 일·누적 집중 타이머와 디데이를 기존 공간·메모·시계·달력에 연결했습니다.
팀원 이벤트에는 대상 spaceId와 itemId를 포함하고 App에서 해당 ID의 데이터만 갱신해야 합니다.
메모 담당자는 지연 저장에 편집 당시 spaceId·memoId·내용을 연결해야 하며 현재 선택 공간을 나중에 조회해서 저장하면 안 됩니다.
항목별 내용 스키마, 메모 초안 및 대기 저장 처리 인터페이스는 해당 담당자와 통합 시 확정합니다.

## 메모 (SCRUM-19)

- 기본 디자인은 디자인 시안 '1. 미니멀 페이퍼'를 따릅니다. 색·크기는 `components/memos/memo.css`의 `--memo-*` 변수로만 정하므로, 테마는 상위 요소에서 이 변수와 `layout.<테마>.memo.view`만 바꾸면 됩니다.
- 메모 내용(`space.memos[]`: id, content, color, updatedAt)과 화면 설정(`layout.basic.memo`: view, sizes)을 분리해 저장합니다. 두 항목 모두 선택값이라 기존 version 1 데이터를 그대로 읽습니다.
- 메모는 최대 5,000자(코드 포인트 기준), 공간당 20개입니다. 넘친 내용은 잘라 저장하지 않고 오류를 표시합니다.
- 입력이 1초 멈추면 저장하고, 예약 당시의 공간·메모 ID로 저장합니다. 공간 전환·페이지 숨김 때는 바로 저장합니다.
- `App`의 `commit`은 새 데이터 또는 `(최신 데이터) => 새 데이터` 함수를 받고 저장 결과(`{ error }`)를 돌려줍니다. 지연 저장이 다른 변경을 덮어쓰지 않게 하기 위함입니다.

## 기본 테마 직접 크기 조절 (#17, SCRUM-49)

오른쪽 아래 대각선 손잡이를 드래그하면 너비·높이를 연속적으로 조절합니다. 드래그 중에는 현재 픽셀 크기를 보여 주고 마우스를 놓을 때 한 번 저장합니다. Escape·포인터 취소·캡처 해제는 저장하지 않고 원래 크기로 돌아갑니다. 드래그 중 다른 공간으로 전환되면 늦게 도착한 이벤트를 새 공간에 저장하지 않습니다.

손잡이에 키보드 초점을 두면 방향키로 10px, Shift+방향키로 50px씩 조절합니다. 변경 후 ‘기본 크기’ 버튼으로 복귀할 수 있습니다. 공간 탭과 개별 메모 카드는 기존 조작 방식을 유지하고, 메모 위젯 영역 전체를 드래그로 조절합니다.

| 대상 | 최소 너비×높이 | 최대 너비×높이 |
|---|---|---|
| 시계 | 240×150px | 1200×600px |
| 문구 | 240×140px | 1200×900px |
| 바로가기 | 280×180px | 1200×1200px |
| 할 일·메모 영역·집중 타이머 | 280×240px | 1200×1200px |
| 달력 | 300×240px | 1200×1200px |
| 디데이 | 260×180px | 1200×1200px |

모든 위젯은 부모 영역보다 넓어지지 않습니다. 좁은 화면에서는 최소 너비보다 화면 맞춤이 우선하며, 화면 축소 자체로 저장값을 바꾸지 않습니다. 세로만 드래그하거나 위·아래 방향키로 조절하면 기존 가로 픽셀값 또는 반응형 기본 너비를 유지합니다. 가로만 바꾸면 원래 높이·자동 높이를 유지합니다. 2px 이하의 포인터 흔들림은 해당 축의 변경으로 처리하지 않으며, 제한 크기에서 값이 바뀌지 않으면 저장을 생략합니다.

내용은 영역 안에서 스크롤할 수 있습니다. 내용 영역의 크기와 내부 DOM 변화를 관찰해 실제 스크롤이 필요할 때만 추가 Tab 정지점을 제공합니다. 손잡이는 항상 키보드로 접근할 수 있고 평소 옅게, hover·초점·드래그 중에는 선명하게 표시합니다. 상단 안내는 유지합니다.

시계는 기본 높이 250px로 글자 여백을 확보하며, 시각의 행 높이와 영역 너비·높이에 맞춘 글자 크기로 불필요한 스크롤을 방지합니다. 시계 내용 칸은 스크롤을 숨기므로 최소 크기에서 날짜·시각이 잘리지 않는지 화면 검증이 필요합니다. 다른 위젯의 기본 높이는 내용에 맞추며, 직접 높이를 조절하면 지정한 값을 사용합니다.

할 일·메모·타이머와 달력·디데이는 각각 원래 순서대로 flex 줄바꿈합니다. 너비를 늘려 행에 들어가지 않으면 뒤의 위젯이 다음 행으로 밀려납니다. DOM 순서·컴포넌트 key·종류를 바꾸지 않으며 위치 이동은 제공하지 않습니다. 기본 너비는 시계·문구 640px, 바로가기 전체 너비, 작업 위젯 3열, 달력·디데이 2열입니다. 1050px 이하 작업 위젯은 기본 2열, 640px 이하에는 1열입니다. 사용자가 지정한 너비가 있으면 화면 안에서 그 값을 우선합니다.

공통 `ResizableWidget`은 포인터·키보드 입력과 미리보기만 담당하며, 크기 계산은 `lib/widgetResize.js`, 공통 상태·검증·저장은 `state/widgetSizes.js`와 기존 저장 계층을 재사용합니다. 테마가 최소·최대 크기와 기본 너비를 전달하므로 다른 디자인에서도 같은 로직을 사용할 수 있습니다.

메모 영역 전체 크기와 개별 메모 크기는 독립적입니다. 기존 `layout[themeId].memo.sizes[memoId]`의 s·m·l 값과 보기 방식은 그대로 보존합니다. 개별 메모 입력 영역은 기존 140·180·360px와 공통 `SizeSelect`를 유지합니다.

위젯 크기는 선택 필드 `layout[themeId].spaces[spaceId].widgets[widgetId]`에 `{ width, height }`로 저장합니다. `width`는 정수 픽셀값 또는 반응형 기본 너비 s·m·l, `height`는 정수 픽셀값 또는 자동 높이 `auto`입니다. 예를 들어 `{ width: 'm', height: 450 }`는 기본 너비와 지정 높이, `{ width: 500, height: 'auto' }`는 지정 너비와 기본 높이를 의미합니다. 기존 두 축 모두 숫자인 데이터와 루트 프리셋 s·m·l도 읽으며 미설정 또는 m은 기본 크기입니다. 저장 키와 version 2는 유지하며 version 1 문구 이전도 지원합니다. 공간 이름 변경은 설정을 유지하고 공간 삭제는 해당 공간의 위젯 설정만 모든 테마에서 제거합니다. 이전 PR 버전으로의 저장 형식 역변환은 지원하지 않습니다.

드래그 종료·방향키 변경은 App의 최신 데이터에 반영한 뒤 공통 저장을 시도합니다. 저장 실패해도 조절한 크기는 화면과 메모리에 유지되며 하단 실패 안내와 전체 최신 상태 저장 재시도를 제공합니다. 잘못된 치수·저장 구조는 읽기 오류 화면에서 원본 보호·편집 차단을 적용합니다.

## 디데이 (SCRUM-42)

- 남은 날짜는 시각이 아닌 달력 날짜 차이(`lib/date.js`의 `daysBetween`)로 계산합니다. 미래는 D-n, 당일은 D-Day, 지난 날짜는 D+n이며 지난 디데이는 자동으로 지우지 않습니다.
- 자정 갱신은 App의 `todayKey`로 처리하며 위젯 안에 별도 타이머를 두지 않습니다.
- 디데이는 모든 공간이 함께 쓰는 내용 데이터(`ddays[]`: id, title, targetDate 'YYYY-MM-DD')입니다. 공간별로 저장하는 좌우명과 범위가 다릅니다. 선택값이라 기존 version 1 데이터도 이전하여 읽고, 테마 화면 설정과 분리되어 테마를 바꿔도 유지됩니다.
- 화면은 다가오는 날을 가까운 순으로, 지난 날을 뒤에 보여 줍니다. 저장 순서는 바꾸지 않습니다.

## 저장 구조와 주의점

브라우저 localStorage의 start.home.v1 키에 다음 구조를 저장합니다.

```js
{
  version: 2,
  activeSpaceId: '고유 ID',
  ddays: [{ id: '고유 ID', title: '기말고사', targetDate: '2026-12-15' }], // 선택
  spaces: [{ id: '고유 ID', name: '기본 공간', quote: '', links: [], todos: [], memos: [] }],
  layout: { // 선택: 내용과 분리한 화면 설정
    basic: {
      memo: { view: 'sheet', sizes: { '메모 ID': 'l' } }, // 기존 개별 메모 설정
      spaces: { '공간 ID': { widgets: { clock: { width: 500, height: 220 }, todos: { width: 440, height: 550 } } } }
    }
  }
}
```

배열 순서가 공간 생성 순서입니다. 새 공간은 빈 목록으로 시작합니다.
각 목록 항목에는 안정적인 문자열 id가 필요합니다. 목록별 실제 내용 검증은 기능 통합 때 추가해야 합니다.
항목과 공간의 소속은 공간 안의 목록 구조로 표현합니다. 공통 상태를 바꿀 때 기존 필드는 보존합니다.

최초 빈 공간도 저장을 시도합니다. 저장 실패 시 현재 입력을 유지하며 전체 최신 상태로 재시도합니다.
잘못된 JSON, 지원하지 않는 버전, 잘못된 구조, 저장소 접근 오류는 빈 데이터로 대체하지 않습니다.
읽기 오류 화면에서는 다시 불러오기만 제공하며 원본을 지우거나 덮어쓰지 않습니다.
저장 키는 기존 `start.home.v1`을 유지하고 내부 스키마만 version 2로 올립니다. version 1의 공통 문구는 당시 화면에 보이던 내용을 보존하기 위해 모든 기존 공간의 `quote`에 복사합니다. 새로 만드는 공간에는 복사하지 않습니다. 나머지 내용·ID·선택 공간·화면 설정·집중 기록은 보존합니다.

읽기와 전체 구조 검증에 성공하면 메모리에서 이전하고 App이 저장을 시도합니다. 읽기 자체는 저장소에 쓰지 않으며, 읽기·검증·이전 실패 시 원본 보호 화면에서 편집과 자동 저장을 막습니다. 이전 결과 저장에 실패하면 기존 원본은 유지하고 최신 메모리 데이터로 재시도합니다. version 2를 다시 읽을 때는 문구를 재복사하지 않습니다. 구버전 앱으로의 역변환과 구·신버전 탭 동시 편집은 지원하지 않습니다.

문구 초안은 공간 전환만으로 저장하지 않습니다. 저장 버튼을 누르면 해당 공간의 내용에 반영하고 영속화를 시도합니다. 실패 시 초안을 유지하며 다른 기능의 전체 저장 재시도가 성공해도 실제 기록된 실패 초안만 정리합니다. 실패 후 편집을 닫아도 이미 메모리에 반영한 내용은 취소되지 않습니다. 일반 편집 취소는 저장하지 않은 초안만 버립니다.

PR #16 리뷰 반영: 실패 뒤 입력을 수정해도 오류와 재시도 표시를 유지합니다. 다른 기능이 이전 내용을 저장해도 수정한 초안은 닫지 않으며 실제 기록된 내용과 일치할 때만 정리합니다. 문구 갱신 또는 공통 commit의 예외도 오류로 반환하여 편집창과 입력을 유지합니다. 안내는 공통 `hint`, 오류는 `error` 스타일을 사용합니다. 새로고침 전 이탈 경고는 이번 변경에 포함하지 않습니다.
로그인·기기 간 동기화·여러 탭 동시 편집은 지원 범위가 아닙니다. 주소와 포트가 다르면 저장 데이터도 분리됩니다.

## 검증 결과 및 남은 확인

- 상태·저장 자동 테스트 8개 통과(2026-11-10): 기존 6개 시나리오와 UUID 생성 2개. `randomUUID`가 없는 환경의 UUID v4 형식·중복 여부와 네이티브 생성 경로를 확인했습니다.
- ESLint 통과. Vite 빌드 통과. 샌드박스에서 하위 프로세스 실행이 EPERM으로 차단되어 빌드·테스트는 권한 확장 후 검증했습니다.
- 폴더 구조 변경 후 `frontend/`에서 lint, 테스트 8개, build를 다시 실행해 통과했습니다. 생성된 JS·CSS 해시가 이동 전과 동일합니다. 실행 화면의 새 브라우저 검증을 뜻하지는 않습니다.
- 테스트는 모의 저장소만 사용하며 사용자 브라우저 데이터를 수정하지 않습니다.
- [PR #2 리뷰](https://github.com/mini-zun/swengineering_project/pull/2#pullrequestreview-5835890545)에서 리뷰어가 기존 커밋 `6455bf4`의 Chromium 1280×720 동작을 확인했습니다. 공간 생성·중복 이름 거부, 문구 줄바꿈 저장, 새로고침 후 공간·선택·문구 복원, 삭제 안내, 마지막 공간 삭제 버튼 비활성, 가로 넘침 없음과 콘솔 오류 없음, 잘못된 JSON 원본 보존을 확인했다는 보고입니다. 이번 수정본을 직접 검증한 결과와는 구분합니다.
- 이번 수정본의 실제 브라우저 확인 미완료: 브라우저 연결 호스트 사용 불가.
- Chrome·Edge 실제 버전, 수정본의 1280×720·1920×1080 배치, 키보드 초점 이동·복귀, 한글 조합 Enter, 삭제 취소·확정, 새로고침 복원은 추가 확인해야 합니다.
- 팀원 컴포넌트가 연결되기 전이므로 실제 메모 편집 중 전환·지연 저장, 전체 기능 통합 및 성능 측정은 미검증입니다.

## PR #2 리뷰 반영

- 앱 위치를 `frontend/`로 정리하고 루트 README의 실행 경로와 Vercel Root Directory 기준을 갱신했습니다. 기능 UI는 `components/`, 화면 배치는 `layouts/`, 저장 처리는 `storage/`, 공통 스타일은 `styles/`로 구분했습니다.
- 사용하지 않는 `src/assets/hero.png`, `react.svg`, `vite.svg`, `public/icons.svg`를 제거했습니다. 현재 사용하는 `public/favicon.svg`는 유지합니다.
- React import를 합치고 App.jsx, BasicLayout.css, global.css, 이 문서의 BOM을 제거했습니다.
- 공간 삭제 후 기존 버튼이 비활성화되거나 제거되면 선택된 공간 탭으로 초점을 복귀하도록 수정했습니다. 대화상자가 다시 열린 StrictMode 실행에서는 초점을 빼앗지 않습니다.
- HTTPS·localhost에서는 네이티브 UUID를 사용하고, `randomUUID`가 없는 HTTP 개발 환경에서는 `getRandomValues`로 UUID v4를 생성합니다. 기존 ID와 저장 형식은 변경하지 않습니다. 실제 다른 기기에서의 HTTP 접속은 미검증입니다.
- 당시 PR #2 리뷰 정리에서는 문구의 공간별 저장 전환과 스키마 이전을 제외했습니다. 해당 두 항목은 이후 #15에서 반영했습니다. 아래 과거 검증 기록은 당시 변경 범위를 기준으로 합니다.
- 리뷰에서 언급된 ESLint 개발 의존성의 audit 항목은 이번에 업그레이드하지 않았고 재검증하지 않았습니다.

### 초점 복귀 수동 확인 방법

1. 공간 2개를 만들고 키보드로 삭제 버튼까지 이동해 대화상자를 엽니다.
2. 취소 또는 Escape로 닫았을 때 원래 삭제 버튼으로 초점이 돌아오는지 확인합니다.
3. 다시 열어 삭제를 확정합니다. 공간이 1개 남아 삭제 버튼이 비활성화되면 선택된 공간 탭으로 초점이 이동해야 합니다.
4. 이름 변경·공간 생성 대화상자를 취소한 경우에도 원래 실행 버튼으로 돌아오는지 확인합니다.


## 바로가기·할 일·집중 타이머

관련 요구사항: FR-05~10, FR-16. 공통 연동: FR-03·04·13.

| 컴포넌트 | 경로 | 입력·이벤트 |
|---|---|---|
| 바로가기 | components/links/SiteLinks.jsx | spaceId, 해당 공간 links, onAdd(spaceId, value), onEdit(spaceId, id, value), onDelete(spaceId, id), onRetry() |
| 할 일 | components/todos/TodoList.jsx | spaceId, 해당 공간 todos, onAdd, onEdit, onDelete, onToggle(spaceId, id, done), onClearCompleted(spaceId), onRetry() |
| 집중 타이머 | components/timer/FocusTimer.jsx | 현재 공간과 전체 공간 이름, 공통 focus 상태, 시작·일시정지·재개·종료·목표·복원 콜백, onRetry() |

App의 links·todos·timer 슬롯에 연결합니다. 각 컴포넌트는 독자적으로 저장하지 않습니다.
계산·검증은 lib/productivity.js, 공간별 데이터 변경은 state/productivity.js,
공통 영속화는 App의 commit과 storage/storage.js가 담당합니다.
날짜 키는 lib/date.js, 글자 수는 lib/text.js의 공통 함수를 재사용합니다.

### 변경·저장 콜백 계약

콜백은 동기 또는 비동기로 { error: null | string }을 반환합니다.
공통 commit은 저장 실패 시에도 최신 변경을 메모리에 유지하고 { error }를 반환합니다.
폼은 반환값을 확인해 실패 시 닫기·입력 초기화를 하지 않고 오류를 표시합니다.
이미 메모리에 반영된 내용을 다시 추가하지 않도록 실패한 폼의 입력은 고정하며,
저장 재시도 버튼은 원래 변경 콜백 대신 onRetry()로 전체 최신 상태만 저장합니다.
취소하거나 창을 닫아도 이미 반영한 메모리 변경은 취소되지 않습니다.
실패 안내와 전체 저장 재시도는 화면 하단에도 남아 있습니다.
입력 검증 등 변경 반영 전 예외는 입력을 수정한 뒤 다시 제출할 수 있습니다.

바로가기·할 일 삭제 후 원래 실행 버튼이 사라지거나 비활성화되면 각각 추가 버튼·새 할 일 입력으로 초점을 돌립니다.
취소·Escape는 실행 버튼이 남아 있으면 그 버튼으로 복귀합니다.

### 저장 구조와 호환성

저장 키 start.home.v1과 version 2, spaces[].links/todos/memos 구조를 사용합니다. version 1은 공통 저장 계층에서 이전합니다.
- 바로가기: { id, name, url, createdAt, updatedAt }
- 할 일: { id, content, done, dueDate, completedAt, createdAt, updatedAt }
- 최상위 선택 필드 focus: { activeSession, sessions, dailyGoalMinutes, checkpoint }

항목의 소속은 바깥 공간으로 표현합니다. 기존에 focus가 없으면 빈 집중 상태와 목표 60분을 사용합니다.
유효한 기존 HTTP·HTTPS URL은 끝 슬래시·기본 포트·호스트 대소문자 차이가 있어도 복원합니다.
읽을 때 검증된 URL의 복사본을 정규화하며, 읽기만으로 저장 원본을 덮어쓰지 않습니다.
허용하지 않는 프로토콜·실제 구조 오류는 원본을 보존하고 편집과 자동 저장을 막습니다.

### 타이머 동작과 정책 제안

타이머는 시작 시각과 구간으로 계산하고 일시정지 시간은 제외합니다.
공간 전환 후에도 시작한 공간에 기록합니다. 공간 삭제 시 해당 진행 세션과 기록도 삭제합니다.
짧은 집중도 내부 sessions에 보관해 오늘 누적이 종료 순간 감소하지 않습니다.
최근 기록 목록은 1분 이상만 표시합니다. 1분 미만 기록은 누적 계산에 계속 사용합니다.

표시 갱신은 시계·달력과 같은 시간 store를 구독합니다.
영속화 체크포인트는 30초마다, 페이지 숨김·이탈 시 갱신합니다.
재접속 시 진행 중이던 세션은 '저장 시각에 종료' 또는 '경과 시간 포함해 계속'을 선택합니다.
갑작스러운 종료에서 저장 시각 종료를 선택하면 최대 약 30초와 저장 실패 이후의 시간이 빠질 수 있습니다.
일반 입력·일시정지·종료 등 공통 변경은 그 시점에 바로 저장을 시도합니다.

기본 목표 60분, 최근 기록의 1분 표시 기준, 복원 선택 정책과 30초 체크포인트는 현재 구현의 제안값입니다.
팀 확정 정책이 달라지면 관련 상수·안내 문구·테스트를 함께 변경합니다.

### 스타일

공통 버튼·폼·대화상자는 components/productivity/components.css,
각 기능은 SiteLinks.css·TodoList.css·FocusTimer.css로 나뉩니다.
기본 팔레트는 미니멀 페이퍼(배경 #F7F6F3, 글자 #1C1C1A, 보조 #5E5D58, 테두리 #E2E0DA, 강조 #2456D6)입니다.
테마는 --sc-text, --sc-muted, --sc-line, --sc-accent, --sc-surface 등의 변수를 재정의합니다.
