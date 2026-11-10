import { createId } from './id.js'
import { characterCount } from './spaces.js'

export const MEMO_MAX_LENGTH = 5000
export const MEMO_MAX_COUNT = 20
// 색 키만 저장한다. 실제 색은 테마가 --memo-bg-<키> 변수로 정한다.
export const MEMO_COLORS = ['paper', 'yellow', 'pink', 'blue', 'green']
export const MEMO_COLOR_LABELS = { paper: '흰색', yellow: '노랑', pink: '분홍', blue: '파랑', green: '초록' }
export const MEMO_SIZES = ['s', 'm', 'l']
export const MEMO_SIZE_LABELS = { s: '작게', m: '보통', l: '크게' }
export const MEMO_VIEWS = ['sheet', 'board']
export const DEFAULT_MEMO_COLOR = 'paper'
export const DEFAULT_MEMO_SIZE = 'm'
// 테마 선택 기능 전까지는 기본 디자인(미니멀 페이퍼) 하나만 있다.
export const DEFAULT_THEME_ID = 'basic'
export const DEFAULT_MEMO_VIEW = 'sheet'

export function validateMemoContent(content) {
  if (typeof content !== 'string') throw new Error('메모 내용이 올바르지 않아요.')
  // 넘친 글자를 조용히 잘라 저장하지 않는다.
  if (characterCount(content) > MEMO_MAX_LENGTH) throw new Error(`메모는 ${MEMO_MAX_LENGTH.toLocaleString('ko-KR')}자까지 저장할 수 있어요.`)
  return content
}

export const memoColor = (memo) => MEMO_COLORS.includes(memo?.color) ? memo.color : DEFAULT_MEMO_COLOR

function findSpace(data, spaceId) {
  const space = data.spaces.find((item) => item.id === spaceId)
  if (!space) throw new Error('공간을 찾을 수 없어요.')
  return space
}

function updateMemo(data, spaceId, memoId, change) {
  const space = findSpace(data, spaceId)
  if (!space.memos.some((memo) => memo.id === memoId)) throw new Error('메모를 찾을 수 없어요.')
  return {
    ...data,
    spaces: data.spaces.map((item) => item.id !== spaceId ? item : {
      ...item, memos: item.memos.map((memo) => memo.id === memoId ? { ...memo, ...change, updatedAt: new Date().toISOString() } : memo),
    }),
  }
}

export function hasMemo(data, spaceId, memoId) {
  return data.spaces.some((space) => space.id === spaceId && space.memos.some((memo) => memo.id === memoId))
}

export function addMemo(data, spaceId, color = DEFAULT_MEMO_COLOR) {
  const space = findSpace(data, spaceId)
  if (space.memos.length >= MEMO_MAX_COUNT) throw new Error(`메모는 공간마다 ${MEMO_MAX_COUNT}개까지 만들 수 있어요.`)
  if (!MEMO_COLORS.includes(color)) throw new Error('지원하지 않는 메모 색상이에요.')
  const memo = { id: createId(), content: '', color, updatedAt: new Date().toISOString() }
  return { data: { ...data, spaces: data.spaces.map((item) => item.id === spaceId ? { ...item, memos: [...item.memos, memo] } : item) }, memo }
}

export function updateMemoContent(data, spaceId, memoId, content) {
  return updateMemo(data, spaceId, memoId, { content: validateMemoContent(content) })
}

// 자동 저장 시점에 대상이 사라졌으면 그대로 둔다. 삭제된 메모·공간을 다시 만들지 않기 위해서다.
export function applyMemoSave(data, { spaceId, memoId, content }) {
  return hasMemo(data, spaceId, memoId) ? updateMemoContent(data, spaceId, memoId, content) : data
}

export function setMemoColor(data, spaceId, memoId, color) {
  if (!MEMO_COLORS.includes(color)) throw new Error('지원하지 않는 메모 색상이에요.')
  return updateMemo(data, spaceId, memoId, { color })
}

export function deleteMemo(data, spaceId, memoId) {
  const space = findSpace(data, spaceId)
  if (!space.memos.some((memo) => memo.id === memoId)) throw new Error('메모를 찾을 수 없어요.')
  const layout = Object.fromEntries(Object.entries(data.layout ?? {}).map(([themeId, theme]) => {
    const sizes = { ...theme?.memo?.sizes }
    delete sizes[memoId]
    return [themeId, { ...theme, memo: { ...theme?.memo, sizes } }]
  }))
  return {
    ...data,
    ...(data.layout ? { layout } : {}),
    spaces: data.spaces.map((item) => item.id === spaceId ? { ...item, memos: item.memos.filter((memo) => memo.id !== memoId) } : item),
  }
}

// 화면 설정(보기 방식·크기)은 내용과 분리해 테마별로 저장한다. 테마를 바꿔도 메모 내용은 그대로다.
export function memoLayout(data, themeId = DEFAULT_THEME_ID) {
  const memo = data.layout?.[themeId]?.memo
  return { view: MEMO_VIEWS.includes(memo?.view) ? memo.view : DEFAULT_MEMO_VIEW, sizes: memo?.sizes ?? {} }
}

export const memoSize = (layout, memoId) => MEMO_SIZES.includes(layout.sizes[memoId]) ? layout.sizes[memoId] : DEFAULT_MEMO_SIZE

function updateMemoLayout(data, themeId, change) {
  const theme = data.layout?.[themeId] ?? {}
  return { ...data, layout: { ...data.layout, [themeId]: { ...theme, memo: { ...memoLayout(data, themeId), ...change } } } }
}

export function setMemoView(data, view, themeId = DEFAULT_THEME_ID) {
  if (!MEMO_VIEWS.includes(view)) throw new Error('지원하지 않는 메모 보기 방식이에요.')
  return updateMemoLayout(data, themeId, { view })
}

export function setMemoSize(data, spaceId, memoId, size, themeId = DEFAULT_THEME_ID) {
  if (!MEMO_SIZES.includes(size)) throw new Error('지원하지 않는 메모 크기예요.')
  if (!hasMemo(data, spaceId, memoId)) throw new Error('메모를 찾을 수 없어요.')
  return updateMemoLayout(data, themeId, { sizes: { ...memoLayout(data, themeId).sizes, [memoId]: size } })
}

// 한 장형 목록에 보일 이름. 별도 제목 필드 없이 첫 줄을 쓴다.
export function memoLabel(memo, index) {
  const firstLine = memo.content.split('\n').find((line) => line.trim())?.trim() ?? ''
  if (!firstLine) return `빈 메모 ${index + 1}`
  const chars = Array.from(firstLine)
  return chars.length > 12 ? `${chars.slice(0, 12).join('')}…` : firstLine
}

// 저장 데이터 검사용. storage.js의 validateData에서 호출한다.
export function validateMemoFields(memo) {
  validateMemoContent(memo.content)
  if (memo.color !== undefined && !MEMO_COLORS.includes(memo.color)) throw new Error('메모 색상이 올바르지 않아요.')
}

export function validateLayout(layout) {
  if (layout === undefined) return
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) throw new Error('화면 설정 데이터가 올바르지 않아요.')
  for (const theme of Object.values(layout)) {
    if (!theme || typeof theme !== 'object') throw new Error('화면 설정 데이터가 올바르지 않아요.')
    const memo = theme.memo
    if (memo === undefined) continue
    if (!memo || typeof memo !== 'object' || (memo.view !== undefined && !MEMO_VIEWS.includes(memo.view))) throw new Error('메모 화면 설정이 올바르지 않아요.')
    if (memo.sizes !== undefined && (!memo.sizes || typeof memo.sizes !== 'object' || Object.values(memo.sizes).some((size) => !MEMO_SIZES.includes(size)))) throw new Error('메모 크기 설정이 올바르지 않아요.')
  }
}
