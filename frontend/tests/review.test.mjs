import test from 'node:test'
import assert from 'node:assert/strict'
import { runSaveAction } from '../src/lib/saveAction.js'
import { changeProductivity } from '../src/state/productivity.js'
import { createDefaultData, createSpace, characterCount } from '../src/state/spaces.js'
import { loadData, saveData } from '../src/storage/storage.js'
import { charCount, dateKey, focusForDay, HISTORY_MIN_SECONDS, FOCUS_CHECKPOINT_INTERVAL_MS } from '../src/lib/productivity.js'
import { toDateKey } from '../src/lib/date.js'

function memoryStorage(raw = null) {
  return { raw, getItem() { return this.raw }, setItem(key, value) { this.raw = value } }
}

test('저장 실패 후 두 번 재시도해도 링크 추가는 한 번만 실행하고 원래 ID를 유지한다', async () => {
  let latest = createDefaultData(), calls = 0, retryOnly = false, retries = 0
  const spaceId = latest.activeSpaceId
  const add = () => {
    calls++
    latest = changeProductivity(latest, { type: 'link/add', spaceId, id: 'unsaved-link', name: '학교', url: 'example.com' })
    return { error: '저장 공간 부족' }
  }
  const retry = () => ({ error: ++retries === 1 ? '아직 저장 실패' : null })
  let result = await runSaveAction(add)
  assert.equal(result.retryOnly, true)
  assert.match(result.error, /저장 공간/)
  // 첫 실패 이후의 다른 공통 변경도 전체 재시도 대상에 포함되어야 한다.
  latest.spaces[0].quote = '실패 후 입력한 문구'
  for (let i = 0; i < 2; i++) {
    retryOnly = result.retryOnly
    result = await runSaveAction(add, { retryOnly, onRetry: retry })
  }
  assert.equal(result.error, '')
  assert.equal(calls, 1)
  assert.equal(latest.spaces[0].links.length, 1)
  assert.equal(latest.spaces[0].links[0].id, 'unsaved-link')
  const storage = memoryStorage()
  assert.equal(saveData(latest, storage).error, null)
  assert.equal(loadData(storage).data.spaces[0].quote, '실패 후 입력한 문구')
})

test('추가·수정·삭제·완료 정리의 저장 실패는 원래 변경을 반복하지 않는다', async () => {
  const initial = createDefaultData(), spaceId = initial.activeSpaceId
  const actions = [
    { type: 'todo/add', spaceId, id: 't', content: '제출' },
    { type: 'todo/edit', spaceId, id: 't', content: '수정 제출' },
    { type: 'todo/toggle', spaceId, id: 't', done: true },
    { type: 'todo/clear', spaceId },
  ]
  let data = initial
  for (const action of actions) {
    let count = 0
    const operation = () => {
      count++
      data = changeProductivity(data, action)
      return { error: '저장 실패' }
    }
    const first = await runSaveAction(operation)
    const snapshot = structuredClone(data)
    const result = await runSaveAction(operation, { retryOnly: first.retryOnly, onRetry: () => ({ error: null }) })
    assert.equal(result.error, '')
    assert.equal(count, 1)
    assert.deepEqual(data, snapshot)
  }
  assert.equal(data.spaces[0].todos.length, 0)
})

test('재시도 함수가 없으면 원래 추가 동작을 반복하지 않고 실패 안내를 유지한다', async () => {
  let calls = 0
  const result = await runSaveAction(() => { calls++; return { error: null } }, { retryOnly: true })
  assert.equal(calls, 0)
  assert.equal(result.retryOnly, true)
  assert.match(result.error, /전체 저장 재시도/)
})

test('검증 예외는 저장 재시도로 전환하지 않아 입력 수정 후 다시 제출할 수 있다', async () => {
  const result = await runSaveAction(() => { throw new Error('주소 확인') })
  assert.deepEqual(result, { error: '주소 확인', retryOnly: false })
  const retry = await runSaveAction(() => ({ error: null }), { retryOnly: result.retryOnly })
  assert.equal(retry.error, '')
})

test('저장 재시도 자체가 예외를 던져도 변경 반복 방지 상태를 유지한다', async () => {
  const result = await runSaveAction(() => assert.fail('변경을 반복하면 안 된다'), {
    retryOnly: true, onRetry: () => { throw new Error('브라우저 저장 차단') },
  })
  assert.deepEqual(result, { error: '브라우저 저장 차단', retryOnly: true })
})

test('기존 URL의 끝 슬래시·기본 포트·대문자 호스트를 정상 복원하고 원본은 쓰지 않는다', () => {
  for (const url of ['https://example.com', 'https://EXAMPLE.com:443', 'http://example.com:80', 'https://example.com/%ED%95%99%EA%B5%90']) {
    const data = createDefaultData()
    data.spaces[0].links.push({ id: 'legacy-link', name: '기존 사이트', url })
    const raw = JSON.stringify(data), storage = memoryStorage(raw)
    const result = loadData(storage)
    assert.equal(result.error, null)
    assert.equal(result.data.spaces[0].links[0].id, 'legacy-link')
    assert.equal(result.data.spaces[0].links[0].url, new URL(url).href)
    assert.equal(storage.raw, raw)
    assert.equal(data.spaces[0].links[0].url, url)
    assert.equal(saveData(result.data, storage).error, null)
  }
})

test('기존 URL 호환성을 넓혀도 위험한 프로토콜·URL 구조 오류는 원본을 보존하며 차단한다', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'file:///secret', 'https://', 'https://example.com\\evil']) {
    const data = createDefaultData()
    data.spaces[0].links.push({ id: 'unsafe', name: '오류', url })
    const storage = memoryStorage(JSON.stringify(data)), before = storage.raw
    assert.ok(loadData(storage).error)
    assert.equal(storage.raw, before)
  }
})

test('59초 집중은 종료·저장·복원 후에도 오늘 누적에 남고 최근 목록 기준과 구분한다', () => {
  const now = new Date(2026, 10, 10, 12).getTime()
  let data = createSpace(createDefaultData(), 'B')
  const spaceId = data.spaces[0].id
  data = changeProductivity(data, { type: 'focus/start', spaceId, now })
  const before = focusForDay([], data.focus.activeSession, '2026-11-10', now + 59000)
  data = changeProductivity(data, { type: 'focus/stop', now: now + 59000 })
  const storage = memoryStorage()
  assert.equal(saveData(data, storage).error, null)
  data = loadData(storage).data
  assert.equal(focusForDay(data.focus.sessions, null, '2026-11-10', now + 59000), before)
  assert.equal(before, 59000)
  assert.equal(data.focus.sessions.filter((session) => session.focusSeconds >= HISTORY_MIN_SECONDS).length, 0)
})

test('1초 미만의 집중도 구간 단위로 보존해 여러 짧은 집중의 누적이 사라지지 않는다', () => {
  const now = new Date(2026, 10, 10, 12).getTime()
  let data = createDefaultData(), spaceId = data.activeSpaceId
  for (let i = 0; i < 2; i++) {
    data = changeProductivity(data, { type: 'focus/start', spaceId, now: now + i * 1000 })
    data = changeProductivity(data, { type: 'focus/stop', now: now + i * 1000 + 500 })
  }
  assert.equal(focusForDay(data.focus.sessions, null, '2026-11-10'), 1000)
  assert.equal(saveData(data, memoryStorage()).error, null)
})

test('날짜 키와 글자 수는 기존 공통 구현을 재사용하고 저장 주기는 30초다', () => {
  assert.equal(charCount, characterCount)
  assert.equal(dateKey, toDateKey)
  assert.equal(FOCUS_CHECKPOINT_INTERVAL_MS, 30000)
})
