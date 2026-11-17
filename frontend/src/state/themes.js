export const DEFAULT_THEME_ID = 'basic'
export const THEME_IDS = ['basic', 'emotional', 'memo-board', 'sidebar-cork', 'retro-desktop', 'postit-board', 'custom']

// 저장 형식은 렌더러 목록과 분리한다. 새 버전에서 추가한 테마도 이전 앱이 지우지 않는다.
export const isThemeId = (value) => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value)

export function spaceThemeId(data, spaceId) {
  return Object.hasOwn(data.spaceThemes ?? {}, spaceId) ? data.spaceThemes[spaceId] : DEFAULT_THEME_ID
}

export function resolveSpaceThemeId(data, spaceId, availableThemeIds = [DEFAULT_THEME_ID]) {
  const selected = spaceThemeId(data, spaceId)
  return availableThemeIds.includes(selected) ? selected : DEFAULT_THEME_ID
}

export function setSpaceTheme(data, spaceId, themeId) {
  if (!data.spaces.some((space) => space.id === spaceId)) throw new Error('공간을 찾을 수 없어요.')
  if (!THEME_IDS.includes(themeId)) throw new Error('지원하지 않는 테마예요.')
  return { ...data, spaceThemes: { ...data.spaceThemes, [spaceId]: themeId } }
}

export function removeSpaceTheme(data, spaceId) {
  if (!data.spaceThemes || !Object.hasOwn(data.spaceThemes, spaceId)) return data
  const spaceThemes = { ...data.spaceThemes }
  delete spaceThemes[spaceId]
  return { ...data, spaceThemes }
}

export function validateSpaceThemes(spaceThemes) {
  if (spaceThemes === undefined) return
  if (!spaceThemes || typeof spaceThemes !== 'object' || Array.isArray(spaceThemes) ||
      Object.entries(spaceThemes).some(([spaceId, themeId]) => !spaceId || !isThemeId(themeId))) {
    throw new Error('공간별 테마 설정이 올바르지 않아요.')
  }
}
