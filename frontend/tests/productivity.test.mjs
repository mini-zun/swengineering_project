import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultData, createSpace, deleteSpace } from '../src/state/spaces.js'
import { changeProductivity, focusState } from '../src/state/productivity.js'
import { elapsedMs, focusForDay, normalizeUrl } from '../src/lib/productivity.js'
import { loadData, saveData } from '../src/storage/storage.js'

function fixture() {
  const data = createSpace(createDefaultData(), '공부')
  data.quote = '기존 문구'
  data.spaces[0].memos = [{ id: 'memo-a', content: '기존 메모' }]
  return data
}
const storage = () => ({ raw: null, getItem() { return this.raw }, setItem(key, value) { this.raw = value } })

test('빈 기존 version 1 데이터와 메모·문구·선택 공간을 그대로 복원한다', () => {
  const data = fixture(), memory = storage()
  assert.equal(saveData(data, memory).error, null)
  assert.deepEqual(loadData(memory).data, data)
  assert.deepEqual(focusState(data), { activeSession: null, sessions: [], dailyGoalMinutes: 60, checkpoint: null })
})

test('링크 추가·수정·삭제는 원래 공간만 변경하고 기존 필드와 ID를 보존한다', () => {
  const initial = fixture(), a = initial.spaces[0].id, b = initial.spaces[1].id
  let data = changeProductivity(initial, { type: 'link/add', spaceId: a, id: 'link', name: '학교', url: 'example.com', now: 1000 })
  data = changeProductivity(data, { type: 'link/edit', spaceId: a, id: 'link', name: 'LMS', url: 'https://school.example', now: 2000 })
  assert.equal(data.spaces[0].links[0].name, 'LMS')
  assert.equal(data.spaces[0].links[0].spaceId, undefined)
  assert.deepEqual(data.spaces[1], initial.spaces[1])
  assert.deepEqual(data.spaces[0].memos, initial.spaces[0].memos)
  assert.equal(data.activeSpaceId, b)
  assert.equal(data.quote, initial.quote)
  data = changeProductivity(data, { type: 'link/delete', spaceId: b, id: 'link' })
  assert.equal(data.spaces[0].links.length, 1)
  data = changeProductivity(data, { type: 'link/delete', spaceId: a, id: 'link' })
  assert.equal(data.spaces[0].links.length, 0)
})

test('URL은 HTTP·HTTPS만 허용하며 프로토콜 생략과 중복 등록을 지원한다', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test', 'https://', '//example.com', 'https://a b.com']) assert.throws(() => normalizeUrl(url))
  assert.equal(normalizeUrl('example.com'), 'https://example.com/')
  let data = fixture(), spaceId = data.activeSpaceId
  for (const id of ['a', 'b']) data = changeProductivity(data, { type: 'link/add', spaceId, id, name: '중복', url: 'example.com' })
  assert.equal(data.spaces[1].links.length, 2)
})

test('할 일 생성 순서·명시적 완료 값·기한·수정·완료 정리의 공간 분리를 확인한다', () => {
  let data = fixture(), a = data.spaces[0].id, b = data.spaces[1].id
  for (const [spaceId, id] of [[a, 'first'], [a, 'second'], [b, 'other']]) data = changeProductivity(data, { type: 'todo/add', spaceId, id, content: id, dueDate: '2028-02-29' })
  for (let i = 0; i < 2; i++) data = changeProductivity(data, { type: 'todo/toggle', spaceId: a, id: 'first', done: true })
  assert.equal(data.spaces[0].todos[0].done, true)
  assert.deepEqual(data.spaces[0].todos.map((item) => item.id), ['first', 'second'])
  data = changeProductivity(data, { type: 'todo/edit', spaceId: a, id: 'second', content: '수정', dueDate: null })
  data = changeProductivity(data, { type: 'todo/clear', spaceId: a })
  assert.deepEqual(data.spaces[0].todos.map((item) => item.content), ['수정'])
  assert.equal(data.spaces[1].todos.length, 1)
  assert.throws(() => changeProductivity(data, { type: 'todo/add', spaceId: a, content: '  ' }))
  assert.throws(() => changeProductivity(data, { type: 'todo/add', spaceId: a, content: '일', dueDate: '2027-02-29' }))
})

test('타이머는 정지 시간을 제외하고 공간 전환 후에도 시작 공간에 기록한다', () => {
  let data = fixture(), a = data.spaces[0].id
  data = changeProductivity(data, { type: 'focus/start', spaceId: a, now: 1000 })
  assert.throws(() => changeProductivity(data, { type: 'focus/start', spaceId: data.activeSpaceId, now: 2000 }))
  data = changeProductivity(data, { type: 'focus/pause', now: 31000 })
  assert.equal(elapsedMs(data.focus.activeSession, 50000), 30000)
  data = changeProductivity(data, { type: 'focus/resume', now: 61000 })
  data = changeProductivity(data, { type: 'focus/stop', now: 91000 })
  assert.equal(data.focus.activeSession, null)
  assert.equal(data.focus.sessions[0].focusSeconds, 60)
  assert.equal(data.focus.sessions[0].spaceId, a)
})

test('자정을 넘은 집중은 각 날짜와 겹치는 구간만 합산한다', () => {
  let data = fixture(), spaceId = data.activeSpaceId
  const start = new Date(2026, 10, 10, 23, 59, 30).getTime()
  data = changeProductivity(data, { type: 'focus/start', spaceId, now: start })
  const now = start + 90000
  assert.equal(focusForDay([], data.focus.activeSession, '2026-11-10', now), 30000)
  assert.equal(focusForDay([], data.focus.activeSession, '2026-11-11', now), 60000)
})

test('저장·복원 뒤 체크포인트에 종료하면 오프라인 시간을 포함하지 않는다', () => {
  let data = fixture(), spaceId = data.activeSpaceId, memory = storage()
  data = changeProductivity(data, { type: 'focus/start', spaceId, now: 1000 })
  data.focus.checkpoint = 91000
  assert.equal(saveData(data, memory).error, null)
  data = loadData(memory).data
  data = changeProductivity(data, { type: 'focus/stop', now: data.focus.checkpoint })
  assert.equal(data.focus.sessions[0].focusSeconds, 90)
})

test('공간 삭제는 해당 공간 집중 기록·진행 세션만 함께 지운다', () => {
  let data = fixture(), a = data.spaces[0].id, b = data.spaces[1].id
  data = changeProductivity(data, { type: 'focus/start', spaceId: b, now: 1000 })
  data = changeProductivity(data, { type: 'focus/stop', now: 61000 })
  data = changeProductivity(data, { type: 'focus/start', spaceId: a, now: 62000 })
  data = deleteSpace(data, a)
  assert.equal(data.focus.activeSession, null)
  assert.equal(data.focus.sessions[0].spaceId, b)
  assert.throws(() => changeProductivity(data, { type: 'todo/add', spaceId: a, content: '늦은 요청' }))
})

test('손상된 링크·할 일·집중 데이터는 원본을 보존하고 읽기를 차단한다', () => {
  const corruptions = [
    (data) => data.spaces[0].links.push({ id: 'unsafe', name: '악성', url: 'javascript:alert(1)' }),
    (data) => data.spaces[0].todos.push({ id: 'broken', content: '할 일', done: 'yes' }),
    (data) => { data.focus = { activeSession: {}, sessions: [], dailyGoalMinutes: 60, checkpoint: 0 } },
  ]
  for (const corrupt of corruptions) {
    const data = fixture(), memory = storage()
    corrupt(data)
    memory.raw = JSON.stringify(data)
    const before = memory.raw
    assert.ok(loadData(memory).error)
    assert.equal(memory.raw, before)
  }
})

test('저장 실패 후 최신 변경을 유지하고 같은 스냅샷으로 재시도한다', () => {
  const data = changeProductivity(fixture(), { type: 'focus/goal', minutes: 120, now: 1000 })
  const snapshot = structuredClone(data)
  assert.ok(saveData(data, { setItem() { throw new Error('blocked') } }).error)
  assert.deepEqual(data, snapshot)
  const memory = storage()
  assert.equal(saveData(data, memory).error, null)
  assert.deepEqual(loadData(memory).data, snapshot)
})
