import { DEFAULT_THEME_ID, spaceThemeId, resolveSpaceThemeId } from '../state/themes.js'

const memoBoardPresentation = {
  description: '코르크 보드 위 종이 카드와 주간 날짜',
  preview: { shape: 'paper-board', bg: '#bfa173', surface: '#fffdf3', ink: '#403e30', accent: '#f3ebb5' },
}

// 병렬 개발 중인 다른 테마의 목록 항목과 독립적으로 구현된 미리보기를 적용한다.
// 선택 화면에 보여 줄 제공 테마 목록이다. 순서가 곧 화면 순서다.
// preview는 선택 화면의 작은 미리보기에만 쓰는 대표 색과 배치 종류다. 실제 화면 스타일은 각 테마의 레이아웃이 정한다.
// custom(사용자 꾸미기)은 SCRUM-47에서 별도 진입점으로 연결하므로 여기에 넣지 않는다.
export const THEME_CATALOG = [
  { id: 'basic', name: '미니멀 페이퍼', description: '여백이 넓고 차분한 기본 디자인',
    preview: { shape: 'hero', bg: '#f7f6f3', surface: '#ffffff', ink: '#1c1c1a', accent: '#2456d6' } },
  { id: 'emotional', name: '감성', description: '밝은 종이 배경과 올리브 색의 차분한 화면',
    preview: { shape: 'hero', bg: '#efede5', surface: '#fbfaf3', ink: '#5a6242', accent: '#c5c9ab' } },
  { id: 'memo-board', name: '메모보드', description: '메모를 가운데에 크게 펼친 화면',
    preview: { shape: 'board', bg: '#eef1f4', surface: '#ffffff', ink: '#27323d', accent: '#3d7a8c' } },
  { id: 'sidebar-cork', name: '사이드바 코르크', description: '공간 사이드바와 종이 카드, 녹색 집중 보드',
    preview: { shape: 'sidebar', bg: '#c49a65', surface: '#fffcf1', ink: '#584632', accent: '#435f50' } },
  { id: 'retro-desktop', name: '레트로 데스크톱', description: '옛 컴퓨터 창을 닮은 화면',
    preview: { shape: 'desktop', bg: '#4e7c7c', surface: '#c0c0c0', ink: '#17172b', accent: '#000080' } },
  { id: 'postit-board', name: '포스트잇 보드', description: '갈색 보드 위 색색의 메모와 종이 카드',
    preview: { shape: 'notes', bg: '#b0946b', surface: '#fffdf3', ink: '#30271d', accent: '#f8e88c' } },
].map((theme) => theme.id === 'memo-board' ? { ...theme, ...memoBoardPresentation } : theme)

export const themeName = (themeId) => THEME_CATALOG.find((theme) => theme.id === themeId)?.name ?? themeId

// 선택 화면이 그릴 내용을 한곳에서 계산한다.
// selectedId: 저장된 선택(미설정이면 basic), displayedId: 실제로 보이는 테마.
// 저장된 선택에 아직 화면(렌더러)이 없으면 fallback이 true이고 기본 디자인을 보여 준다.
export function themeOptions(data, spaceId, availableThemeIds = [DEFAULT_THEME_ID]) {
  const selectedId = spaceThemeId(data, spaceId)
  const displayedId = resolveSpaceThemeId(data, spaceId, availableThemeIds)
  return {
    selectedId, displayedId, fallback: selectedId !== displayedId,
    options: THEME_CATALOG.map((theme) => ({
      ...theme, available: availableThemeIds.includes(theme.id), displayed: theme.id === displayedId,
    })),
  }
}
