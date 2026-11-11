import { createId } from './id.js'
import { characterCount } from './spaces.js'
import { fromDateKey } from '../lib/date.js'

// 디데이는 좌우명처럼 모든 공간이 함께 쓰는 내용 데이터다(data.ddays). 테마 전환과 무관하게 유지된다.
export const DDAY_TITLE_MAX = 30

export const ddaysOf = (data) => data.ddays ?? []

export function validateDdayTitle(title) {
  if (typeof title !== 'string') throw new Error('디데이 이름이 올바르지 않아요.')
  const trimmed = title.trim()
  if (!trimmed || characterCount(trimmed) > DDAY_TITLE_MAX) throw new Error(`디데이 이름은 앞뒤 공백을 제외하고 1~${DDAY_TITLE_MAX}자로 입력해 주세요.`)
  return trimmed
}

export function validateDdayDate(targetDate) {
  if (typeof targetDate !== 'string' || !targetDate) throw new Error('목표 날짜를 선택해 주세요.')
  try { fromDateKey(targetDate) }
  catch { throw new Error('목표 날짜가 올바르지 않아요.') }
  return targetDate
}

// 저장 데이터 검증용. 저장된 제목은 이미 정리된 값이어야 한다.
export function validateDdays(ddays) {
  if (ddays === undefined) return
  if (!Array.isArray(ddays)) throw new Error('디데이 데이터가 올바르지 않아요.')
  const ids = new Set()
  for (const dday of ddays) {
    if (!dday || typeof dday.id !== 'string' || !dday.id || ids.has(dday.id)) throw new Error('디데이 ID가 올바르지 않아요.')
    ids.add(dday.id)
    if (validateDdayTitle(dday.title) !== dday.title) throw new Error('디데이 이름이 올바르지 않아요.')
    validateDdayDate(dday.targetDate)
  }
}

export function addDday(data, { title, targetDate }) {
  const dday = { id: createId(), title: validateDdayTitle(title), targetDate: validateDdayDate(targetDate) }
  return { ...data, ddays: [...ddaysOf(data), dday] }
}

export function updateDday(data, id, { title, targetDate }) {
  if (!ddaysOf(data).some((dday) => dday.id === id)) throw new Error('디데이를 찾을 수 없어요.')
  const next = { title: validateDdayTitle(title), targetDate: validateDdayDate(targetDate) }
  return { ...data, ddays: ddaysOf(data).map((dday) => dday.id === id ? { ...dday, ...next } : dday) }
}

// 없는 ID면 그대로 둔다. 이미 지워진 항목을 다시 지우는 동작이 오류가 되지 않게 한다.
export function deleteDday(data, id) {
  return { ...data, ddays: ddaysOf(data).filter((dday) => dday.id !== id) }
}

// 대화상자 제출 흐름. App의 commit은 저장에 실패해도 메모리에는 변경을 반영하고 { error }를 돌려준다.
// 그래서 실패 뒤 다시 제출할 때는 추가·수정·삭제를 반복하지 않고(중복 등록 방지) 최신 상태 저장만 재시도한다.
// 반환값: { done } 이면 대화상자를 닫고, 아니면 { error, retrying }을 표시한다.
export function submitDdayChange({ retrying, apply, retry }) {
  let result
  try { result = retrying ? retry() : apply() }
  catch (failure) { return { done: false, retrying, error: failure.message } }
  if (result?.error) return { done: false, retrying: true, error: `변경 내용은 화면에 남아 있지만 저장하지 못했어요. ${result.error}` }
  return { done: true, retrying: false, error: '' }
}
