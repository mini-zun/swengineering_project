# swengineering_project
작업별 링크·할 일·메모를 관리하는 나만의 시작 웹페이지

## 로컬 실행

React 앱은 저장소 안의 `frontend/`에 있습니다. 저장소 루트에서 다음 명령을 실행하세요.

```cmd
cd frontend
npm ci
npm run dev
```

터미널에 표시되는 Local 주소를 브라우저에서 엽니다. PowerShell에서 `npm.ps1`이 차단되면 `npm.cmd`로 실행하세요.

검사 명령과 컴포넌트 연결 방법은 [앱 README](frontend/README.md)를 참고하세요.

## 배포 경로

Vercel에 연결할 경우 Root Directory를 `frontend`, Build Command를 `npm run build`, Output Directory를 `dist`로 지정합니다. 이전 앱 폴더를 Root Directory로 사용 중이라면 `frontend`로 변경해야 합니다. 실제 배포 설정이나 연결 상태를 변경한 것은 아닙니다.

## 폴더 구조

```text
frontend/src/
├─ App.jsx                  # 공통 상태와 변경 이벤트 연결
├─ main.jsx                 # React 진입점
├─ components/
│  ├─ spaces/SpaceTabs.jsx   # 공간 관리 UI
│  └─ quote/Quote.jsx        # 좌우명·문구 UI
├─ layouts/
│  ├─ BasicLayout.jsx       # 기본 화면 배치와 팀원 컴포넌트 연결 영역
│  └─ BasicLayout.css
├─ state/                   # 공간 변경·검증과 ID 생성
├─ storage/                 # 저장·복원·오류 처리
└─ styles/global.css        # 공통 스타일
```

팀원 컴포넌트는 기능별로 `components/` 아래에 추가합니다. UI의 입력·변경 이벤트와 App의 공통 상태 관리 책임은 유지합니다. 폴더 변경 전 작업 중인 브랜치는 합칠 때 import 경로와 실행 경로를 맞춰 주세요. 저장 키 `start.home.v1`과 데이터 형식은 변경하지 않았습니다.
