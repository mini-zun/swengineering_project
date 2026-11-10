import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultData, createSpace, deleteSpace } from '../src/state/spaces.js'
import { loadData, saveData, STORAGE_KEY } from '../src/storage/storage.js'
import {
  MEMO_MAX_COUNT, MEMO_MAX_LENGTH, addMemo, applyMemoSave, deleteMemo, memoLabel, memoLayout, memoSize,
  setMemoColor, setMemoSize, setMemoView, settleFailedDrafts, updateMemoContent,
} from '../src/state/memos.js'
import { createMemoAutosave } from '../src/state/memoAutosave.js'

function memoryStorage(raw = null) {
  return { raw, getItem(key) { assert.equal(key, STORAGE_KEY); return this.raw }, setItem(key, value) { assert.equal(key, STORAGE_KEY); this.raw = value } }
}

function twoSpaces() {
  let data = createSpace(createDefaultData(), '공간 B')
  const [a, b] = data.spaces
  let added = addMemo(data, a.id); data = added.data; const memoA = added.memo
  added = addMemo(data, b.id, 'yellow'); data = added.data; const memoB = added.memo
  return { data, a: a.id, b: b.id, memoA: memoA.id, memoB: memoB.id }
}

const memoOf = (data, spaceId, memoId) => data.spaces.find((space) => space.id === spaceId).memos.find((memo) => memo.id === memoId)

test('줄바꿈·공백·빈 내용·이모지·5,000자 메모를 그대로 저장하고 복원한다', () => {
  const { data: start, a, memoA } = twoSpaces()
  for (const content of ['', '  앞뒤 공백  ', '첫 줄\n\n셋째 줄\n', '🌱'.repeat(MEMO_MAX_LENGTH), '가'.repeat(MEMO_MAX_LENGTH)]) {
    const data = updateMemoContent(start, a, memoA, content)
    const storage = memoryStorage()
    assert.equal(saveData(data, storage).error, null)
    assert.equal(memoOf(loadData(storage).data, a, memoA).content, content)
  }
})

test('5,000자를 넘는 메모는 잘라 저장하지 않고 거부한다', () => {
  const { data, a, memoA } = twoSpaces()
  assert.throws(() => updateMemoContent(data, a, memoA, '가'.repeat(MEMO_MAX_LENGTH + 1)), /5,000자/)
  assert.equal(memoOf(data, a, memoA).content, '')
  const broken = structuredClone(data)
  broken.spaces[0].memos[0].content = '가'.repeat(MEMO_MAX_LENGTH + 1)
  assert.ok(loadData(memoryStorage(JSON.stringify(broken))).error)
})

test('한 공간의 메모 수정·색상·삭제가 다른 공간 메모를 바꾸지 않는다', () => {
  const { data: start, a, b, memoA, memoB } = twoSpaces()
  const before = structuredClone(memoOf(start, b, memoB))
  let data = updateMemoContent(start, a, memoA, 'A 내용')
  data = setMemoColor(data, a, memoA, 'pink')
  assert.equal(memoOf(data, a, memoA).color, 'pink')
  assert.deepEqual(memoOf(data, b, memoB), before)
  data = deleteMemo(data, a, memoA)
  assert.equal(data.spaces[0].memos.length, 0)
  assert.deepEqual(memoOf(data, b, memoB), before)
  assert.throws(() => updateMemoContent(data, b, memoA, 'x'))
})

test('공간마다 메모 개수 상한을 지키고 지원하지 않는 값은 거부한다', () => {
  let data = createDefaultData()
  const spaceId = data.spaces[0].id
  for (let i = 0; i < MEMO_MAX_COUNT; i++) data = addMemo(data, spaceId).data
  assert.throws(() => addMemo(data, spaceId), /20개/)
  const memoId = data.spaces[0].memos[0].id
  assert.throws(() => setMemoColor(data, spaceId, memoId, 'red'))
  assert.throws(() => setMemoSize(data, spaceId, memoId, 'xl'))
  assert.throws(() => setMemoView(data, 'grid'))
})

test('보기 방식·크기는 내용과 분리되어 바꿔도 메모가 그대로 남는다', () => {
  const { data: start, a, b, memoA, memoB } = twoSpaces()
  assert.equal(memoLayout(start).view, 'sheet')
  let data = setMemoSize(start, a, memoA, 'l')
  data = setMemoView(data, 'board')
  data = setMemoView(data, 'sheet')
  assert.deepEqual(data.spaces, start.spaces)
  const storage = memoryStorage()
  saveData(data, storage)
  const restored = loadData(storage).data
  assert.equal(memoSize(memoLayout(restored), memoA), 'l')
  assert.equal(memoSize(memoLayout(restored), memoB), 'm')
  assert.equal(memoLayout(deleteMemo(restored, a, memoA)).sizes[memoA], undefined)
  assert.equal(memoSize(memoLayout(restored, 'postit-board'), memoA), 'm')
})

test('색상·화면 설정이 없는 기존 데이터도 읽는다', () => {
  const data = createDefaultData()
  data.spaces[0].memos.push({ id: 'old-memo', content: '예전 메모' })
  const result = loadData(memoryStorage(JSON.stringify(data)))
  assert.equal(result.error, null)
  assert.equal(memoLayout(result.data).view, 'sheet')
  assert.ok(loadData(memoryStorage(JSON.stringify({ ...data, layout: { basic: { memo: { view: 'grid' } } } }))).error)
})

test('한 장형 목록 이름은 첫 줄을 쓰고 빈 메모는 번호로 보인다', () => {
  assert.equal(memoLabel({ content: '\n  영상처리 기말 범위\n- 평활화' }, 0), '영상처리 기말 범위')
  assert.equal(memoLabel({ content: '   ' }, 2), '빈 메모 3')
  assert.equal(memoLabel({ content: '가'.repeat(20) }, 0), `${'가'.repeat(12)}…`)
})

function fakeTimers() {
  let now = 0
  const timers = new Map()
  let seq = 0
  return {
    setTimer(fn, delay) { const id = ++seq; timers.set(id, { fn, at: now + delay }); return id },
    clearTimer(id) { timers.delete(id) },
    advance(ms) {
      now += ms
      for (const [id, timer] of [...timers].sort((x, y) => x[1].at - y[1].at)) if (timer.at <= now) { timers.delete(id); timer.fn() }
    },
  }
}

function autosaveHarness(data) {
  const timers = fakeTimers()
  const state = { data, saves: [] }
  const autosave = createMemoAutosave({ ...timers, save(job) { state.saves.push(job); state.data = applyMemoSave(state.data, job) } })
  return { timers, state, autosave }
}

test('입력이 1초 멈춘 뒤 마지막 내용만 저장하고 오래된 예약이 덮어쓰지 않는다', () => {
  const { data, a, memoA } = twoSpaces()
  const { timers, state, autosave } = autosaveHarness(data)
  autosave.schedule(a, memoA, '안')
  timers.advance(500)
  autosave.schedule(a, memoA, '안녕')
  timers.advance(999)
  assert.equal(state.saves.length, 0)
  timers.advance(1)
  assert.deepEqual(state.saves.map((job) => job.content), ['안녕'])
  timers.advance(5000)
  assert.equal(state.saves.length, 1)
  assert.equal(memoOf(state.data, a, memoA).content, '안녕')
})

test('입력 직후 공간을 바꾸거나 A→B→A로 빠르게 오가도 원래 공간에 저장한다', () => {
  const { data, a, b, memoA, memoB } = twoSpaces()
  const { timers, state, autosave } = autosaveHarness(data)
  autosave.schedule(a, memoA, 'A에서 쓴 글')
  autosave.flush(a)
  state.data = { ...state.data, activeSpaceId: b }
  autosave.schedule(b, memoB, 'B에서 쓴 글')
  autosave.flush(b)
  state.data = { ...state.data, activeSpaceId: a }
  timers.advance(2000)
  assert.equal(memoOf(state.data, a, memoA).content, 'A에서 쓴 글')
  assert.equal(memoOf(state.data, b, memoB).content, 'B에서 쓴 글')
  assert.equal(state.saves.length, 2)
})

test('저장 예약 중 메모나 공간을 삭제해도 되살아나지 않는다', () => {
  const { data, a, b, memoA, memoB } = twoSpaces()
  const { timers, state, autosave } = autosaveHarness(data)
  autosave.schedule(a, memoA, '삭제 직전 입력')
  state.data = deleteMemo(state.data, a, memoA)
  timers.advance(1000)
  assert.equal(state.data.spaces[0].memos.length, 0)
  autosave.schedule(b, memoB, '공간 삭제 직전 입력')
  state.data = deleteSpace(state.data, b)
  timers.advance(1000)
  assert.equal(state.data.spaces.length, 1)
  autosave.schedule(a, 'x', 'y')
  autosave.cancelSpace(a)
  assert.equal(autosave.isPending('x'), false)
})

test('저장 실패 뒤에도 데이터는 바뀌지 않고 같은 내용으로 다시 저장할 수 있다', () => {
  const { data, a, memoA } = twoSpaces()
  const next = updateMemoContent(data, a, memoA, '실패해도 남아야 하는 글')
  const failure = { setItem() { throw new DOMException('full', 'QuotaExceededError') } }
  assert.match(saveData(next, failure).error, /부족/)
  const storage = memoryStorage()
  assert.equal(saveData(next, storage).error, null)
  assert.equal(memoOf(loadData(storage).data, a, memoA).content, '실패해도 남아야 하는 글')
})

test('메모 자동 저장 실패 뒤 다른 변경으로 전체 저장에 성공하면 같은 내용의 실패 초안만 정리한다', () => {
  const { data: start, a, b, memoA, memoB } = twoSpaces()
  const failing = { setItem() { throw new DOMException('full', 'QuotaExceededError') } }
  // A 자동 저장 실패: 최신 데이터에는 새 내용이 남고 초안은 failed가 된다.
  let latest = applyMemoSave(start, { spaceId: a, memoId: memoA, content: 'A 새 내용' })
  assert.ok(saveData(latest, failing).error)
  let drafts = {
    [memoA]: { spaceId: a, content: 'A 새 내용', status: 'failed', error: '저장 실패' },
    [memoB]: { spaceId: b, content: 'B 입력 중', status: 'pending', error: null },
  }
  // 저장소 복구 뒤 다른 변경(B 색상)이 저장에 성공한다.
  latest = setMemoColor(latest, b, memoB, 'blue')
  const storage = memoryStorage()
  assert.equal(saveData(latest, storage).error, null)
  assert.equal(memoOf(loadData(storage).data, a, memoA).content, 'A 새 내용')
  drafts = settleFailedDrafts(drafts, latest)
  assert.equal(drafts[memoA], undefined)
  assert.equal(drafts[memoB].status, 'pending')
})

test('기록된 내용과 다른 실패 초안·길이 초과 초안은 저장된 것으로 처리하지 않는다', () => {
  const { data, a, b, memoA, memoB } = twoSpaces()
  const drafts = {
    [memoA]: { spaceId: a, content: '아직 기록 안 된 내용', status: 'failed', error: '저장 실패' },
    [memoB]: { spaceId: b, content: '가'.repeat(MEMO_MAX_LENGTH + 1), status: 'invalid', error: '초과' },
  }
  assert.equal(settleFailedDrafts(drafts, data), drafts)
  const removed = settleFailedDrafts(drafts, deleteMemo(data, a, memoA))
  assert.equal(removed[memoA], undefined)
  assert.equal(removed[memoB].status, 'invalid')
})
