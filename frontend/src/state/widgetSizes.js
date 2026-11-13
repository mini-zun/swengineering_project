import { DEFAULT_SIZE, isSizePreset } from '../lib/sizes.js'

export const BASIC_THEME_ID = 'basic'
export const WIDGET_LABELS = {
  clock: '시계', quote: '문구', links: '바로가기', todos: '할 일',
  memos: '메모 영역', timer: '집중 타이머', calendar: '달력', dday: '디데이',
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isWidgetId = (value) => Object.hasOwn(WIDGET_LABELS, value)
export const isWidgetSize = (value) => isSizePreset(value) || (isRecord(value) &&
  ['width', 'height'].every((key) => Number.isInteger(value[key]) && value[key] > 0 && value[key] <= 10000))

export function widgetSize(data, spaceId, widgetId, themeId = BASIC_THEME_ID) {
  return data.layout?.[themeId]?.spaces?.[spaceId]?.widgets?.[widgetId] ?? DEFAULT_SIZE
}

export function setWidgetSize(data, { spaceId, themeId = BASIC_THEME_ID, widgetId, size }) {
  if (!data.spaces.some((space) => space.id === spaceId)) throw new Error('공간을 찾을 수 없어요.')
  if (typeof themeId !== 'string' || !themeId.trim()) throw new Error('테마를 찾을 수 없어요.')
  if (!isWidgetId(widgetId)) throw new Error('크기를 변경할 컴포넌트를 찾을 수 없어요.')
  if (!isWidgetSize(size)) throw new Error('지원하지 않는 크기예요.')
  const theme = data.layout?.[themeId] ?? {}
  const settings = theme.spaces?.[spaceId] ?? {}
  return { ...data, layout: { ...data.layout, [themeId]: {
    ...theme, spaces: { ...theme.spaces, [spaceId]: {
      ...settings, widgets: { ...settings.widgets, [widgetId]: isSizePreset(size) ? size : { width: size.width, height: size.height } },
    } },
  } } }
}

export function removeSpaceWidgetSizes(data, spaceId) {
  if (!data.layout) return data
  return { ...data, layout: Object.fromEntries(Object.entries(data.layout).map(([themeId, theme]) => {
    if (!theme.spaces || !Object.hasOwn(theme.spaces, spaceId)) return [themeId, theme]
    const spaces = { ...theme.spaces }
    delete spaces[spaceId]
    return [themeId, { ...theme, spaces }]
  })) }
}

// 현재 보이지 않는 테마도 읽기 시 검사해 잘못된 설정을 기본값으로 덮어쓰지 않는다.
export function validateWidgetSizes(layout) {
  if (layout === undefined) return
  if (!isRecord(layout)) throw new Error('화면 설정 데이터가 올바르지 않아요.')
  for (const theme of Object.values(layout)) {
    if (!isRecord(theme)) throw new Error('화면 설정 데이터가 올바르지 않아요.')
    if (theme.spaces === undefined) continue
    if (!isRecord(theme.spaces)) throw new Error('공간별 크기 설정이 올바르지 않아요.')
    for (const settings of Object.values(theme.spaces)) {
      if (!isRecord(settings)) throw new Error('공간별 크기 설정이 올바르지 않아요.')
      if (settings.widgets === undefined) continue
      if (!isRecord(settings.widgets) || Object.entries(settings.widgets).some(([id, size]) => !isWidgetId(id) || !isWidgetSize(size))) {
        throw new Error('컴포넌트 크기 설정이 올바르지 않아요.')
      }
    }
  }
}
