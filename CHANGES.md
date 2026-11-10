# 담당 컴포넌트 3개 통합

대상: 팀 main ZIP의 frontend React 앱. FR-05~10, FR-16과 관련 FR-03·13.

바로가기·할 일·집중 타이머를 기능별 폴더로 이식하고 App의 슬롯·공통 저장에 연결했습니다.
바탕화면 원본 폴더는 수정하지 않았습니다. 이 수정본은 별도 작업 폴더에 있습니다.

| 구분 | 파일 |
|---|---|
| 수정 | frontend/README.md |
| 수정 | frontend/src/App.jsx |
| 추가 | frontend/src/components/links/SiteLinks.jsx |
| 추가 | frontend/src/components/productivity/components.css |
| 추가 | frontend/src/components/productivity/shared.jsx |
| 수정 | frontend/src/components/spaces/SpaceTabs.jsx |
| 추가 | frontend/src/components/timer/FocusTimer.jsx |
| 추가 | frontend/src/components/todos/TodoList.jsx |
| 추가 | frontend/src/lib/productivity.js |
| 추가 | frontend/src/lib/productivityUi.js |
| 추가 | frontend/src/state/productivity.js |
| 수정 | frontend/src/state/spaces.js |
| 수정 | frontend/src/storage/storage.js |
| 추가 | frontend/tests/productivity.test.mjs |
| 수정 | frontend/tests/state.test.mjs |

기존 package.json 버전과 저장 키는 유지했습니다. 기존 메모·시계·달력·좌우명 데이터는 보존합니다.
저장 검증이 실제 링크·할 일 필드를 검사하도록 바뀌어 기존 테스트의 불완전한 예시 항목도 유효한 형태로 보완했습니다.
공간 삭제 안내에는 집중 기록도 포함했습니다.

실행·데이터 구조·제안 규칙·검증 결과는 frontend/README.md의 마지막 절을 확인하세요.

GitHub에는 원본 저장소의 main에서 만든 브랜치에 변경 파일을 적용해야 합니다. 이 ZIP 자체에 Git 이력은 없습니다.
