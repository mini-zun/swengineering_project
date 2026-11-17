# 공통 저장·테마 연동 설계

관련 작업: [GitHub #19](https://github.com/mini-zun/swengineering_project/issues/19), [SCRUM-21](https://swengineering-team2.atlassian.net/browse/SCRUM-21). 2026-11-17 작성.

## 테마 ID

| 디자인 | ID | 현재 상태 |
|---|---|---|
| 미니멀 페이퍼 기본 | `basic` | 기존 화면 구현 |
| 감성 | `emotional` | SCRUM-34에서 구현 |
| 메모보드 | `memo-board` | SCRUM-43에서 구현 |
| 사이드바 코르크 | `sidebar-cork` | SCRUM-44에서 구현 |
| 레트로 데스크톱 | `retro-desktop` | SCRUM-45에서 구현 |
| 포스트잇 보드 | `postit-board` | SCRUM-46에서 구현 |
| 사용자 꾸미기 | `custom` | SCRUM-47용 예약 |

위 ID는 이번 작업에서 사용자가 에이전트에게 정하도록 요청한 코드·저장 식별자다. 화면 이름을 바꿔도 ID는 유지한다. ID가 등록됐다는 것은 해당 화면이 구현됐다는 뜻이 아니다. 목록·선택·미리보기 UI와 실제 렌더러 등록은 SCRUM-20에서 연결한다.

## 데이터 필드와 범위

localStorage 키 `start.home.v1`, 내부 `version: 2`를 유지한다. 이번 변경은 선택 필드 `spaceThemes`를 추가하므로 필수 필드 이전이나 버전 증가는 없다.

다음은 구조 설명용 예시다. `space-a`·`memo-a`는 실제 ID가 아니며 기본 데이터로 삽입하지 않는다. 실제 항목은 생성 시 고유 ID를 사용한다.

```js
{
  version: 2,
  activeSpaceId: 'space-a',
  spaces: [{
    id: 'space-a', name: '공부', quote: '', links: [], todos: [],
    memos: [{ id: 'memo-a', content: '내용', color: 'paper' }]
  }],
  ddays: [],
  // focus는 기존 누적 집중 데이터. 생략 시 기존 기본값을 사용한다.
  spaceThemes: { 'space-a': 'sidebar-cork' },
  layout: {
    'sidebar-cork': {
      spaces: {
        'space-a': {
          widgets: {
            clock: { width: 500, height: 250 },
            memos: { width: 'm', height: 'auto' }
          }
        }
      },
      memo: { view: 'board', sizes: { 'memo-a': 'l' } }
    }
  }
}
```

| 필드 | 의미·범위 |
|---|---|
| `spaces[].links/todos/memos/quote` | 공간별 내용. 테마 전환으로 바꾸거나 삭제하지 않는다. |
| `activeSpaceId` | 마지막 선택 공간. 저장된 ID가 없으면 생성 순서 첫 공간을 선택한다. |
| `ddays` | 모든 공간 공통 디데이. |
| `focus` | 기존 공통 집중 상태·기록. 세션에 원래 공간 ID를 유지한다. |
| `spaceThemes[spaceId]` | 공간별 선택 테마. 설정이 없으면 `basic`. 새 공간은 설정 없이 기본 테마로 시작한다. |
| `layout[themeId].spaces[spaceId].widgets[widgetId]` | 테마·공간별 위젯 크기. 기존 s·m·l과 `{ width, height }`를 지원한다. |
| `layout[themeId].memo.view` | 기존 테마별 공통 메모 보기 방식. `sheet` 또는 `board`. 공간별 보기 방식으로 변경하지 않는다. |
| `layout[themeId].memo.sizes[memoId]` | 기존 테마·메모별 개별 크기 s·m·l. 메모 고유 ID가 소속을 구분한다. |

위젯 ID는 `clock`, `quote`, `links`, `todos`, `memos`, `timer`, `calendar`, `dday`다. 숫자 치수·프리셋·자동 높이와 기본 테마의 제한은 frontend/README.md를 따른다. `layout`은 배치 설정을 확장할 영역이지만 위치·숨김·스타일 편집의 필드와 UI는 이번에 추가하지 않는다.

## 읽기·호환·오류 정책

- version 1의 공통 문구 이전과 version 2 읽기를 유지한다. `spaceThemes`가 없는 데이터는 값을 강제로 추가하거나 읽기 중 저장하지 않는다.
- 선택 테마 ID의 저장 형식은 소문자 영문으로 시작하는 1~64자의 영문 소문자·숫자·하이픈이다. 새 선택 함수는 위 표의 ID만 받는다.
- `layout`의 테마 키도 같은 `isThemeId` 규칙으로 읽기·쓰기를 검사한다. 잘못된 키는 원본 보호 화면으로 처리하며, 형식이 유효한 미등록 키는 보존한다. 키를 자동 변경하거나 삭제하지 않는다.
- 읽기에서는 형식이 유효한 미등록·미구현 ID도 보존한다. 사용 가능한 렌더러 목록에 없으면 화면만 `basic`으로 대체한다. 저장된 선택과 해당 테마의 설정은 지우지 않는다.
- 기본 화면으로 대체한 동안에는 크기·메모 보기 변경을 **표시 중인 basic 설정**에 쓴다. 구현되지 않은 선택 테마의 설정에 기본 화면 설정을 기록하지 않는다.
- `spaceThemes`가 배열·null이거나 잘못된 ID를 포함하면 읽기를 차단하고 원본 보호 화면을 표시한다. JSON·버전·기존 내용/설정 오류도 같은 원본 보호 원칙을 따른다.
- 이름 변경은 설정을 유지한다. 공간 삭제는 해당 선택값·모든 테마의 해당 공간 위젯 설정·해당 공간 소속 메모 크기·기존 집중 데이터를 정리하며 다른 공간은 보존한다.
- 이미 존재하지 않는 공간 ID의 선택값은 읽기 중 원본을 손대지 않고 보존하며 화면에는 사용하지 않는다. 삭제 함수는 실제 삭제 대상 ID의 설정을 명시적으로 정리한다.
- 저장 실패는 메모리의 최신 변경을 유지하고 실패 안내·전체 최신 상태 저장 재시도를 제공한다. 성공 전에는 저장됨으로 바꾸지 않는다. 변경 이벤트를 재실행해 항목을 중복 생성하지 않는다.
- 구버전 앱으로의 역변환·여러 탭 동시 편집은 지원하지 않는다. 키·버전 유지가 구버전의 새 기능 지원을 의미하지 않는다.

## 팀원용 함수·연동 계약

`frontend/src/state/themes.js`:

기본 테마 상수는 이 파일의 `DEFAULT_THEME_ID`에서만 import한다. `widgetSizes.js`의 `BASIC_THEME_ID` 별칭과 `memos.js`의 재수출은 제거했다.

```js
spaceThemeId(data, spaceId) // 저장된 선택 ID. 미설정이면 basic
resolveSpaceThemeId(data, spaceId, availableThemeIds) // 실제 표시 가능한 ID
setSpaceTheme(data, spaceId, themeId) // 원본을 바꾸지 않고 새 데이터 반환
```

SCRUM-20 담당자는 실제 렌더러가 있는 ID만 선택 UI에서 활성화한다. 전체 THEME_IDS에는 예약 ID도 있으므로 그대로 전부 활성화하지 않는다. 현재 App의 사용 가능한 테마는 기본값 `['basic']`이다. 렌더러를 등록할 때 같은 목록을 `resolveSpaceThemeId`에 넘긴다. 기본 렌더러는 항상 제공한다.

```js
// SCRUM-20 통합 예시. 아래 코드는 아직 App에 추가된 선택 UI가 아니다.
const themeId = resolveSpaceThemeId(data, data.activeSpaceId, Object.keys(renderers))
function onThemeChange(spaceId, selectedThemeId) {
  // 기존 메모의 대기 저장을 원래 공간에 먼저 처리한다.
  memos.flush(spaceId)
  return commit((current) => setSpaceTheme(current, spaceId, selectedThemeId))
}
```

- `commit(updater)`는 App의 최신 데이터를 받아 반영·저장하고 `{ error: null | string }`을 반환한다. 상태 함수의 검증 예외는 호출한 UI의 기존 오류 처리로 안내한다. 컴포넌트가 독자적인 localStorage 키나 내용 복사본을 만들지 않는다.
- `useMemos(commit, themeId)`에 **실제 표시 테마 ID**를 전달한다. 훅의 `setView(view)`·`setSize(spaceId, memoId, size)`는 해당 ID를 설정 변경에 함께 전달한다. 기본 인수는 `basic`이므로 기존 호출과 호환된다.
- `memoLayout(data, themeId)`, `widgetSize(data, spaceId, widgetId, themeId)`, `setWidgetSize(data, { spaceId, themeId, widgetId, size })`도 같은 ID를 사용한다.
- 자동 저장 작업에는 원래 `spaceId`·`memoId`·내용만 담는다. 저장 시 현재 테마나 공간으로 대상을 바꾸지 않는다. 삭제된 대상의 대기 저장은 무시한다.
- 위젯 `contextId`는 `${spaceId}:${themeId}`로 구분한다. 기본 레이아웃도 이 값을 사용해 다른 공간·테마에서 도착한 이전 드래그 이벤트가 새 대상에 저장되지 않게 한다.
- 테마 컴포넌트는 기존 입력·변경 이벤트를 유지하고 배치·스타일만 바꾼다. 테마를 React key에 넣어 공통 기능 전체를 재생성하지 않는다. 실제 다른 레이아웃으로 교체하면 내부 폼 상태가 사라질 수 있으므로 SCRUM-20 통합 시 초안 유지·초점·타이머를 실제 화면에서 확인한다. 상태 로직 테스트만으로 이를 통과했다고 판단하지 않는다.

## 사용자 이미지 저장 설계안 — SCRUM-27 구현 전 기준

이 절은 **설계안**이며 파일 업로드·IndexedDB 저장 코드는 아직 없다. 선택 UI·이미지 검사·파일 관리 구현은 SCRUM-27, 위치·숨김·스타일 편집은 SCRUM-47의 범위다. 아래 제안값은 구현 착수 시 팀 기준과 맞추고 화면·검증 코드·테스트에 동일하게 적용한다.

### 저장소·데이터 범위

- 이미지 Blob은 크기와 localStorage 용량을 고려해 IndexedDB를 사용한다. 기존 콘텐츠 JSON을 이미지 때문에 옮기지 않는다. 서버 업로드·외부 전송은 하지 않는다.
- 제안 DB 이름 `start.home.assets`, DB 버전 1. `images` 저장소는 이미지 ID를 키로 Blob·검증된 MIME·바이트 수·너비·높이·생성 시각을 보관한다.
- `backgrounds` 저장소는 공간 ID를 키로 `{ spaceId, imageId }`를 보관한다. 커스텀 테마의 공간별 배경이며 테마를 떠나도 유지한다. Blob·선택 참조를 같은 DB의 한 트랜잭션에서 변경하여 반쪽 교체를 막는다.
- JSON에 이미지 데이터·객체 URL·배경 선택 참조를 중복 저장하지 않는다. App이 공통 이미지 저장 모듈을 통해 공간 ID로 선택을 조회한다. 운영 구현 시 이 이미지 저장 모듈도 공통 저장 계층 아래에 둔다.
- 객체 URL은 렌더링 중에만 생성한다. 배경 변경·언마운트 때 revoke하고 재접속 시 IndexedDB Blob으로 새로 만든다.

### 검사 제안값

PNG·JPEG·WebP, 파일당 최대 5 MiB(5 × 1024 × 1024바이트), 가로·세로 각각 최대 4,096px를 제안한다. SVG·GIF 등은 허용하지 않는다. 확장자만 믿지 않고 MIME·파일 시그니처·실제 디코딩 결과를 확인한다. 잘못된 파일·초과·디코딩 실패는 이유를 입력 근처에 표시하고 기존 배경을 유지한다. 자동 압축·자르기로 조용히 바꾸지 않는다.

### 선택·교체·제거·실패

1. 파일을 검사·디코딩한다. 새 이미지가 준비되기 전까지 기존 배경을 유지한다. 연속 선택 시 최신 요청 ID만 적용하고 오래된 디코딩 결과는 버린다.
2. 단일 readwrite 트랜잭션에서 새 Blob과 해당 공간 참조를 기록하고, 더 이상 참조하지 않는 이전 이미지를 제거한다. 제거도 참조와 파일을 같은 트랜잭션에서 정리한다.
3. 트랜잭션의 `complete` 이후에만 저장 성공을 표시하고 새 배경을 적용한다. abort·접근 차단·용량 부족이면 원래 참조와 Blob을 유지하고 실패 안내·사용자가 선택한 파일의 재시도를 제공한다.
4. 새 파일을 고른 뒤 오래된 교체/재시도가 완료돼 최신 선택을 덮지 않도록 공간별 요청 순서를 직렬화하고 버전을 확인한다. 대기 중 공간 삭제도 같은 큐에서 처리한다.
5. 페이지를 다시 열 때 DB 접근·읽기·참조 누락·Blob 디코딩 오류를 구분해 안내한다. 오류를 원본 초기화로 해결하지 않는다. 배경 실패 때문에 콘텐츠 편집을 차단하지 않는다.

콘텐츠 JSON 저장과 이미지 DB는 서로 다른 저장소라 하나의 원자적 저장이라고 설명하지 않는다. 공통 저장 모듈은 이미지 상태를 콘텐츠 저장 상태와 별도로 반환하고, 하단 전체 성공 표시는 양쪽이 모두 성공했을 때만 제공해야 한다. 콘텐츠 저장 성공이 이미지 실패 표시를 지우거나 그 반대가 되지 않게 한다. 전체 재시도는 실패한 작업만 최신 상태로 다시 시도한다.

공간 삭제는 먼저 JSON 삭제가 실제 저장된 뒤 이미지 참조 정리를 요청한다. JSON 저장 실패 중에는 이미지 원본을 삭제하지 않는다. DB 정리 실패는 사용자에게 알리고 다음 접속 시 정상적으로 읽은 현재 공간 목록과 대조해 참조 없는 파일만 재정리한다. JSON 읽기에 실패했다면 정리를 하지 않는다. 일시적인 미참조 파일을 허용하되 아직 유효한 배경을 먼저 지우지 않는 순서다.

### SCRUM-27에 넘길 검증 항목

- 정상 업로드·재접속 복원·교체·제거, 다른 공간·제공 테마 왕복 후 커스텀 배경 보존.
- 형식·시그니처·용량·치수 초과·디코딩 실패에서 기존 배경 유지.
- IndexedDB 차단·트랜잭션 abort·용량 초과와 JSON 저장 실패 조합에서 성공 표시·재시도·원본 보존.
- 빠른 연속 교체·교체 도중 공간 삭제·제거 실패·재접속 정리, 객체 URL 해제.
- 실패 모의는 별도 저장소·테스트 프로필로 수행. 사용자 데이터와 저장 공간을 채우거나 지우지 않는다.

## 검증 범위

이번 코드 검증과 남은 실제 UI 통합 확인은 [test-results.md](test-results.md)의 SCRUM-21 기록을 따른다. 선택·추가 테마·커스텀 UI가 구현되지 않은 상태에서 실제 왕복 검증을 완료로 기록하지 않는다.
