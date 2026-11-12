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
- 현재 문구는 전체 공간 공통으로 저장하며 공간 전환 중 편집 초안도 유지됩니다. SCRUM-22의 공간별 저장 요구사항과 차이가 있어 미완료입니다. 이 임시 구현을 팀의 최종 합의로 간주하지 않습니다. 공간별 저장으로 변경할 때는 기존 문구 이전 정책과 스키마 버전 변경을 함께 처리해야 합니다.
- 이름 글자 수는 Array.from으로 센 유니코드 코드 포인트 기준입니다. 앞뒤 공백 제거 후 1~20자이며 조용히 잘라 저장하지 않습니다.

## 컴포넌트 경계와 팀원 연결

App이 공통 상태와 문구 초안을 소유합니다. UI 컴포넌트는 localStorage를 직접 호출하지 않습니다.

| 컴포넌트 | 입력 | 변경 이벤트 / 책임 |
|---|---|---|
| components/spaces/SpaceTabs.jsx | spaces, activeSpaceId | onSelect(spaceId), onCreate(name), onRename(spaceId, name), onDelete(spaceId) |
| components/quote/Quote.jsx | value, draft (null이면 표시 모드) | onEdit(), onDraftChange(text), onSave(), onCancel() |
| layouts/BasicLayout.jsx | tabs, quote, space, status, slots | 전달받은 UI의 배치만 담당. BasicLayout.css를 직접 가져옴 |
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

## 디데이 (SCRUM-42)

- 남은 날짜는 시각이 아닌 달력 날짜 차이(`lib/date.js`의 `daysBetween`)로 계산합니다. 미래는 D-n, 당일은 D-Day, 지난 날짜는 D+n이며 지난 디데이는 자동으로 지우지 않습니다.
- 자정 갱신은 App의 `todayKey`로 처리하며 위젯 안에 별도 타이머를 두지 않습니다.
- 디데이는 좌우명처럼 모든 공간이 함께 쓰는 내용 데이터(`ddays[]`: id, title, targetDate 'YYYY-MM-DD')입니다. 선택값이라 기존 version 1 데이터를 그대로 읽고, 테마 화면 설정과 분리되어 테마를 바꿔도 유지됩니다.
- 화면은 다가오는 날을 가까운 순으로, 지난 날을 뒤에 보여 줍니다. 저장 순서는 바꾸지 않습니다.

## 저장 구조와 주의점

브라우저 localStorage의 start.home.v1 키에 다음 구조를 저장합니다.

```js
{
  version: 1,
  activeSpaceId: '고유 ID',
  quote: '',
  ddays: [{ id: '고유 ID', title: '기말고사', targetDate: '2026-12-15' }], // 선택
  spaces: [{ id: '고유 ID', name: '기본 공간', links: [], todos: [], memos: [] }]
}
```

배열 순서가 공간 생성 순서입니다. 새 공간은 빈 목록으로 시작합니다.
각 목록 항목에는 안정적인 문자열 id가 필요합니다. 목록별 실제 내용 검증은 기능 통합 때 추가해야 합니다.
항목과 공간의 소속은 공간 안의 목록 구조로 표현합니다. 공통 상태를 바꿀 때 기존 필드는 보존합니다.

최초 빈 공간도 저장을 시도합니다. 저장 실패 시 현재 입력을 유지하며 전체 최신 상태로 재시도합니다.
잘못된 JSON, 지원하지 않는 버전, 잘못된 구조, 저장소 접근 오류는 빈 데이터로 대체하지 않습니다.
읽기 오류 화면에서는 다시 불러오기만 제공하며 원본을 지우거나 덮어쓰지 않습니다.
현재 저장소에는 이전 앱의 저장 구현이 없어 마이그레이션 대상이 발견되지 않았습니다. 향후 형식 변경 시 기존 데이터를 이전하는 처리가 필요합니다.
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
- 문구의 공간별 저장 전환과 스키마 이전, 선정 디자인 반영, 팀원 컴포넌트 통합은 이번 리뷰 정리 범위에서 제외한 미완료 작업입니다.
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

저장 키 start.home.v1과 version 1, spaces[].links/todos/memos 구조를 사용합니다.
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
