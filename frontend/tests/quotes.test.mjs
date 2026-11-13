import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultData, createSpace, renameSpace, deleteSpace } from '../src/state/spaces.js'
import { updateQuote, settleQuoteDrafts } from '../src/state/quotes.js'
import { loadData, saveData } from '../src/storage/storage.js'
import { changeProductivity } from '../src/state/productivity.js'

function memoryStorage(data) {
  return { raw: JSON.stringify(data), writes: 0, getItem() { return this.raw }, setItem(key, value) { this.writes++; this.raw = value } }
}

function legacyData() {
  const data = createSpace(createDefaultData(), 'B')
  data.version = 1
  data.quote = '  함께 쓰던 문구\n꾸준하게 🌱  '
  for (const space of data.spaces) delete space.quote
  data.spaces[0].links.push({ id: 'link', name: '사이트', url: 'https://example.com/' })
  data.spaces[0].todos.push({ id: 'todo', content: '할 일', done: false })
  data.spaces[1].memos.push({ id: 'memo', content: '메모\n내용' })
  data.layout = { basic: { memo: { view: 'board', sizes: { memo: 'l' } } } }
  data.ddays = [{ id: 'dday', title: '시험', targetDate: '2026-12-01' }]
  return changeProductivity(data, { type: 'focus/start', spaceId: data.activeSpaceId, now: 1000 })
}

test('version 1의 공통 문구를 모든 기존 공간으로 이전하고 다른 데이터와 저장 원본을 보존한다', () => {
  const legacy = legacyData(), storage = memoryStorage(legacy), before = storage.raw
  const result = loadData(storage)
  assert.equal(result.error, null)
  assert.equal(result.migrated, true)
  assert.equal(result.data.version, 2)
  assert.equal(Object.hasOwn(result.data, 'quote'), false)
  for (let i = 0; i < legacy.spaces.length; i++) {
    assert.deepEqual(result.data.spaces[i], { ...legacy.spaces[i], quote: legacy.quote })
  }
  for (const key of ['focus', 'layout', 'ddays', 'activeSpaceId']) assert.deepEqual(result.data[key], legacy[key])
  assert.equal(storage.raw, before)
  assert.equal(storage.writes, 0)
  assert.equal(saveData(result.data, storage).error, null)
  const restored = loadData(storage)
  assert.equal(restored.migrated, false)
  assert.deepEqual(restored.data, result.data)
  assert.equal(createSpace(restored.data, '새 공간').spaces[2].quote, '')
})

test('빈 공통 문구도 이전하며 잘못된 구버전·신버전 문구와 지원하지 않는 버전은 원본을 보존한다', () => {
  const empty = legacyData()
  empty.quote = ''
  assert.ok(loadData(memoryStorage(empty)).data.spaces.every((space) => space.quote === ''))
  const brokenLegacy = legacyData()
  brokenLegacy.quote = null
  const brokenItem = legacyData()
  brokenItem.spaces[0].todos[0].done = 'yes'
  const brokenCurrent = createDefaultData()
  delete brokenCurrent.spaces[0].quote
  const future = { ...createDefaultData(), version: 3 }
  for (const data of [brokenLegacy, brokenItem, brokenCurrent, future]) {
    const storage = memoryStorage(data), before = storage.raw
    assert.ok(loadData(storage).error)
    assert.equal(storage.raw, before)
    assert.equal(storage.writes, 0)
  }
})

test('이전 데이터 저장 실패는 기존 원본을 유지하며 최신 공간별 문구로 재시도한다', () => {
  const storage = memoryStorage(legacyData()), before = storage.raw
  let data = loadData(storage).data
  const spaceId = data.spaces[0].id
  data = updateQuote(data, spaceId, '이전 후 새 문구')
  const blocked = { setItem() { throw new DOMException('full', 'QuotaExceededError') } }
  assert.match(saveData(data, blocked).error, /부족/)
  assert.equal(storage.raw, before)
  assert.equal(data.spaces[0].quote, '이전 후 새 문구')
  assert.equal(saveData(data, storage).error, null)
  assert.deepEqual(loadData(storage).data, data)
})

test('공간별 문구는 반복 전환·저장·복원·이름 변경·삭제 후에도 분리된다', () => {
  let data = createSpace(createDefaultData(), 'B')
  const [a, b] = data.spaces.map((space) => space.id)
  data = updateQuote(data, a, '  A\n🌱  ')
  data = updateQuote(data, b, '한글'.repeat(3000))
  const storage = memoryStorage(data)
  for (let i = 0; i < 10; i++) {
    data = { ...data, activeSpaceId: i % 2 ? a : b }
    assert.equal(saveData(data, storage).error, null)
    data = loadData(storage).data
    assert.equal(data.spaces[0].quote, '  A\n🌱  ')
    assert.equal(data.spaces[1].quote, '한글'.repeat(3000))
  }
  data = renameSpace(data, a, '이름 변경')
  assert.equal(data.spaces[0].id, a)
  assert.equal(data.spaces[0].quote, '  A\n🌱  ')
  data = updateQuote(data, b, '')
  assert.equal(data.spaces[1].quote, '')
  data = deleteSpace(data, b)
  assert.equal(data.spaces[0].quote, '  A\n🌱  ')
  assert.throws(() => updateQuote(data, b, '삭제 후 저장'))
})

test('전체 저장 성공 시 기록된 실패 초안과 삭제된 공간만 정리하고 미저장·수정 초안을 보존한다', () => {
  let data = createSpace(createDefaultData(), 'B')
  const [a, b] = data.spaces.map((space) => space.id)
  data = updateQuote(data, a, '실패한 문구')
  const failed = { content: '실패한 문구', error: '저장 실패' }
  const unsaved = { content: 'B의 초안', error: null }
  assert.deepEqual(settleQuoteDrafts({ [a]: failed, [b]: unsaved }, data), { [b]: unsaved })
  const newer = { content: '더 새로운 편집', error: null }
  assert.deepEqual(settleQuoteDrafts({ [a]: newer, [b]: unsaved }, data), { [a]: newer, [b]: unsaved })
  const different = { content: '아직 기록되지 않은 실패 초안', error: '실패' }
  assert.deepEqual(settleQuoteDrafts({ [a]: different }, data), { [a]: different })
  assert.deepEqual(settleQuoteDrafts({ [b]: unsaved }, deleteSpace(data, b)), {})
})
