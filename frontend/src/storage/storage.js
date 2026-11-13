import { createDefaultData, validateSpaceName } from '../state/spaces.js'
import { validateLayout, validateMemoFields } from '../state/memos.js'
import { validateProductivityItem, validateFocus } from '../state/productivity.js'
import { validateDdays } from '../state/ddays.js'

export const STORAGE_KEY = 'start.home.v1'

function validateData(data) {
  if (!data || typeof data !== 'object') throw new Error('저장 데이터의 구조가 올바르지 않아요.')
  if (data.version !== 1 && data.version !== 2) throw new Error('지원하지 않는 저장 데이터 버전이에요.')
  if (!Array.isArray(data.spaces) || !data.spaces.length || typeof data.activeSpaceId !== 'string' || (data.version === 1 && typeof data.quote !== 'string')) throw new Error('저장 데이터의 구조가 올바르지 않아요.')
  const ids = new Set()
  const spaces = []
  for (const space of data.spaces) {
    const normalized = { ...space }
    if (!space || typeof space.id !== 'string' || !space.id || ids.has(space.id) || typeof space.name !== 'string') throw new Error('공간 데이터가 올바르지 않아요.')
    if (data.version === 2 && typeof space.quote !== 'string') throw new Error('공간의 문구 데이터가 올바르지 않아요.')
    // 기존 화면에 보이던 공통 문구를 모든 기존 공간에 복사한다. 읽기 중에는 원본을 쓰지 않는다.
    normalized.quote = data.version === 1 ? data.quote : space.quote
    ids.add(space.id)
    if (validateSpaceName(data.spaces, space.name, space.id) !== space.name) throw new Error('공간 이름이 올바르지 않아요.')
    for (const field of ['links', 'todos', 'memos']) {
      if (!Array.isArray(space[field])) throw new Error('공간의 항목 목록이 올바르지 않아요.')
      const itemIds = new Set()
      normalized[field] = []
      for (const item of space[field]) {
        if (!item || typeof item.id !== 'string' || !item.id || itemIds.has(item.id)) throw new Error('공간의 항목 ID가 올바르지 않아요.')
        itemIds.add(item.id)
        if (field === 'memos') {
          validateMemoFields(item)
          normalized[field].push(item)
        } else normalized[field].push(validateProductivityItem(field, item))
      }
    }
    spaces.push(normalized)
  }
  // layout은 선택 항목이라 기존 version 1 데이터도 그대로 읽힌다.
  validateLayout(data.layout)
  validateFocus(data)
  // ddays도 선택 항목이다. 없으면 디데이가 없는 것으로 본다.
  validateDdays(data.ddays)
  const result = { ...data, version: 2, spaces, activeSpaceId: ids.has(data.activeSpaceId) ? data.activeSpaceId : data.spaces[0].id }
  delete result.quote
  return result
}

// 읽기 실패 시 기본값을 반환하지 않아 원본을 자동 저장으로 덮어쓰지 않는다.
export function loadData(storage) {
  let raw
  try { raw = (storage ?? window.localStorage).getItem(STORAGE_KEY) }
  catch { return { data: null, error: '브라우저 저장소에 접근할 수 없어요.' } }
  if (raw === null) return { data: createDefaultData(), error: null, fresh: true }
  let parsed
  try { parsed = JSON.parse(raw) }
  catch { return { data: null, error: '저장된 JSON 데이터를 해석할 수 없어요.' } }
  try { return { data: validateData(parsed), error: null, fresh: false, migrated: parsed.version === 1 } }
  catch (error) { return { data: null, error: error.message } }
}

export function saveData(data, storage) {
  try {
    const valid = validateData(data)
    const target = storage ?? window.localStorage
    target.setItem(STORAGE_KEY, JSON.stringify(valid))
    return { error: null }
  } catch (error) {
    return { error: error.name === 'QuotaExceededError' ? '브라우저 저장 공간이 부족해요.' : '브라우저 저장 설정 또는 데이터 상태를 확인해 주세요.' }
  }
}
