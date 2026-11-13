import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultData, createSpace, renameSpace, deleteSpace } from '../src/state/spaces.js'
import { WIDGET_LABELS, widgetSize, setWidgetSize } from '../src/state/widgetSizes.js'
import { addMemo, setMemoSize, setMemoView, memoLayout, memoSize, applyMemoSave } from '../src/state/memos.js'
import { createMemoAutosave } from '../src/state/memoAutosave.js'
import { changeProductivity } from '../src/state/productivity.js'
import { elapsedMs } from '../src/lib/productivity.js'
import { editQuoteDraft, settleQuoteDrafts } from '../src/state/quotes.js'
import { loadData, saveData, STORAGE_KEY } from '../src/storage/storage.js'
import { constrainWidgetSize, dragWidgetSize, keyboardWidgetSize } from '../src/lib/widgetResize.js'

function storageOf(data) {
  return { raw: JSON.stringify(data), writes: 0,
    getItem(key) { assert.equal(key, STORAGE_KEY); return this.raw },
    setItem(key, value) { assert.equal(key, STORAGE_KEY); this.raw = value; this.writes++ },
  }
}

test('설정 없는 기존 version 1·2는 모든 위젯이 보통 크기이며 읽기로 원본을 쓰지 않는다', () => {
  for (const version of [1, 2]) {
    const old = createDefaultData()
    if (version === 1) {
      old.version = 1
      old.quote = '기존 공통 문구'
      delete old.spaces[0].quote
    }
    const storage = storageOf(old), before = storage.raw
    const { data, error } = loadData(storage)
    assert.equal(error, null)
    for (const id of Object.keys(WIDGET_LABELS)) assert.equal(widgetSize(data, data.activeSpaceId, id), 'm')
    assert.equal(storage.raw, before)
    assert.equal(storage.writes, 0)
  }
})

test('각 위젯·공간·테마의 크기를 독립 변경하고 반복 전환·저장·복원한다', () => {
  let data = createSpace(createDefaultData(), 'B')
  const [a, b] = data.spaces.map((space) => space.id)
  for (const id of Object.keys(WIDGET_LABELS)) {
    data = setWidgetSize(data, { spaceId: a, widgetId: id, size: 's' })
    data = setWidgetSize(data, { spaceId: b, widgetId: id, size: 'l' })
    data = setWidgetSize(data, { spaceId: a, themeId: 'future', widgetId: id, size: 'l' })
  }
  const storage = storageOf(data)
  for (let i = 0; i < 10; i++) {
    data = { ...data, activeSpaceId: i % 2 ? a : b }
    assert.equal(saveData(data, storage).error, null)
    data = loadData(storage).data
    for (const id of Object.keys(WIDGET_LABELS)) {
      assert.equal(widgetSize(data, a, id), 's')
      assert.equal(widgetSize(data, b, id), 'l')
      assert.equal(widgetSize(data, a, id, 'future'), 'l')
    }
  }
})

test('기존 메모 크기·보기 설정을 보존하고 메모 영역과 개별 메모 크기를 독립적으로 바꾼다', () => {
  let data = createDefaultData()
  const a = data.activeSpaceId
  const added = addMemo(data, a)
  data = setMemoSize(added.data, a, added.memo.id, 'l')
  data = setMemoView(data, 'board')
  const legacyLayout = structuredClone(data.layout.basic.memo)
  const storage = storageOf(data)
  data = loadData(storage).data
  assert.equal(widgetSize(data, a, 'memos'), 'm')
  assert.equal(memoSize(memoLayout(data), added.memo.id), 'l')
  data = setWidgetSize(data, { spaceId: a, widgetId: 'memos', size: 's' })
  assert.deepEqual(data.layout.basic.memo, legacyLayout)
  data = setMemoSize(data, a, added.memo.id, 's')
  assert.equal(widgetSize(data, a, 'memos'), 's')
  assert.equal(memoSize(memoLayout(data), added.memo.id), 's')
  assert.equal(saveData(data, storage).error, null)
  assert.deepEqual(loadData(storage).data.layout, data.layout)
})

test('크기 변경 중 대기 메모 저장·문구 초안·진행 타이머와 다른 콘텐츠를 보존한다', () => {
  let latest = createDefaultData()
  const a = latest.activeSpaceId
  const added = addMemo(latest, a)
  latest = added.data
  latest = changeProductivity(latest, { type: 'link/add', spaceId: a, name: '학교', url: 'example.com' })
  latest = changeProductivity(latest, { type: 'todo/add', spaceId: a, content: '할 일' })
  latest = changeProductivity(latest, { type: 'focus/start', spaceId: a, now: 1000 })
  latest.ddays = [{ id: 'dday', title: '시험', targetDate: '2026-12-01' }]
  const before = structuredClone(latest)
  const draft = editQuoteDraft({}, a, '아직 저장하지 않은 문구')
  let runSave
  const autosave = createMemoAutosave({
    setTimer(fn) { runSave = fn; return 1 }, clearTimer() {},
    save(job) { latest = applyMemoSave(latest, job) },
  })
  autosave.schedule(a, added.memo.id, '크기 변경 전 작성 중인 메모')
  for (const id of Object.keys(WIDGET_LABELS)) latest = setWidgetSize(latest, { spaceId: a, widgetId: id, size: 'l' })
  assert.equal(autosave.isPending(added.memo.id), true)
  assert.deepEqual(settleQuoteDrafts(draft, latest), draft)
  assert.deepEqual(latest.spaces, before.spaces)
  assert.deepEqual(latest.focus, before.focus)
  assert.deepEqual(latest.ddays, before.ddays)
  runSave()
  assert.equal(latest.spaces[0].memos[0].content, '크기 변경 전 작성 중인 메모')
  assert.equal(widgetSize(latest, a, 'memos'), 'l')
  assert.equal(elapsedMs(latest.focus.activeSession, 61000), 60000)
})

test('크기 저장 실패 시 선택을 유지하고 이후 내용 변경도 포함하여 전체 최신 상태를 재시도한다', () => {
  let data = createDefaultData()
  const a = data.activeSpaceId, storage = storageOf(data), before = storage.raw
  data = setWidgetSize(data, { spaceId: a, widgetId: 'todos', size: 'l' })
  assert.match(saveData(data, { setItem() { throw new DOMException('full', 'QuotaExceededError') } }).error, /부족/)
  assert.equal(storage.raw, before)
  assert.equal(widgetSize(data, a, 'todos'), 'l')
  data = changeProductivity(data, { type: 'todo/add', spaceId: a, content: '실패 후 입력' })
  assert.equal(saveData(data, storage).error, null)
  assert.deepEqual(loadData(storage).data, data)
})

test('이름 변경은 크기를 유지하고 공간 삭제는 해당 공간의 설정만 모든 테마에서 제거한다', () => {
  let data = createSpace(createDefaultData(), 'B')
  const [a, b] = data.spaces.map((space) => space.id)
  for (const spaceId of [a, b]) for (const themeId of ['basic', 'future']) {
    data = setWidgetSize(data, { spaceId, themeId, widgetId: 'clock', size: 'l' })
  }
  data = renameSpace(data, a, 'A 이름 변경')
  assert.equal(widgetSize(data, a, 'clock'), 'l')
  const old = structuredClone(data)
  data = deleteSpace(data, a)
  for (const theme of ['basic', 'future']) {
    assert.equal(data.layout[theme].spaces[a], undefined)
    assert.deepEqual(data.layout[theme].spaces[b], old.layout[theme].spaces[b])
  }
  assert.equal(createSpace(data, 'C').spaces.length, 2)
  assert.throws(() => setWidgetSize(data, { spaceId: a, widgetId: 'clock', size: 's' }))
})

test('허용하지 않은 크기·대상·잘못된 저장 구조는 거부하고 원본을 보존한다', () => {
  const data = createDefaultData(), a = data.activeSpaceId
  for (const change of [{ size: 'xl' }, { widgetId: 'unknown' }, { themeId: '' }, { spaceId: 'missing' }]) {
    assert.throws(() => setWidgetSize(data, { spaceId: a, widgetId: 'clock', size: 's', ...change }))
  }
  const invalidSettings = [null, [], { widgets: [] }, { widgets: { clock: 'xl' } }, { widgets: { unknown: 'm' } }]
  for (const settings of invalidSettings) {
    const invalid = { ...data, layout: { basic: { spaces: { [a]: settings } } } }
    const storage = storageOf(invalid), before = storage.raw
    assert.ok(loadData(storage).error)
    assert.equal(storage.raw, before)
    assert.equal(storage.writes, 0)
  }
})

test('자유 크기를 공간·테마별로 저장하고 기존 프리셋과 개별 메모 크기를 보존한다', () => {
  let data = createSpace(createDefaultData(), 'B')
  const [a, b] = data.spaces.map((space) => space.id)
  data = setWidgetSize(data, { spaceId: b, widgetId: 'memos', size: 'l' })
  data = setWidgetSize(data, { spaceId: a, themeId: 'future', widgetId: 'memos', size: 's' })
  const added = addMemo(data, a)
  data = setMemoSize(added.data, a, added.memo.id, 'l')
  const size = { width: 537, height: 429 }
  data = setWidgetSize(data, { spaceId: a, widgetId: 'memos', size })
  size.width = 999 // 입력 객체가 나중에 바뀌어도 공통 상태는 보존한다.
  const storage = storageOf(data)
  assert.equal(saveData(data, storage).error, null)
  const restored = loadData(storage).data
  assert.deepEqual(widgetSize(restored, a, 'memos'), { width: 537, height: 429 })
  assert.equal(widgetSize(restored, b, 'memos'), 'l')
  assert.equal(widgetSize(restored, a, 'memos', 'future'), 's')
  assert.equal(memoSize(memoLayout(restored), added.memo.id), 'l')
  assert.equal(widgetSize(setWidgetSize(restored, { spaceId: a, widgetId: 'memos', size: 'm' }), a, 'memos'), 'm')
})

test('드래그는 연속 픽셀 크기로 계산하고 최소·최대·부모 너비를 제한하며 중앙 정렬도 따른다', () => {
  const limits = { minWidth: 280, minHeight: 180, maxWidth: 1200, maxHeight: 900 }
  const start = { x: 100, y: 100, width: 400, height: 300 }
  assert.deepEqual(dragWidgetSize(start, { x: 137, y: 129 }, limits, 1000), { width: 437, height: 329 })
  assert.deepEqual(dragWidgetSize(start, { x: 137, y: 129 }, limits, 1000, true), { width: 474, height: 329 })
  assert.deepEqual(dragWidgetSize(start, { x: -9999, y: -9999 }, limits, 1000), { width: 280, height: 180 })
  assert.deepEqual(dragWidgetSize(start, { x: 9999, y: 9999 }, limits, 700), { width: 700, height: 900 })
  assert.deepEqual(constrainWidgetSize({ width: 400, height: 300 }, limits, 240), { width: 240, height: 300 })
  assert.deepEqual(start, { x: 100, y: 100, width: 400, height: 300 })
})

test('방향키는 10·50픽셀 단위로 같은 제한을 적용하며 다른 키는 크기를 바꾸지 않는다', () => {
  const limits = { minWidth: 280, minHeight: 180, maxWidth: 1200, maxHeight: 900 }
  const size = { width: 400, height: 300 }
  assert.deepEqual(keyboardWidgetSize(size, 'ArrowRight', 10, limits, 1000), { width: 410, height: 300 })
  assert.deepEqual(keyboardWidgetSize(size, 'ArrowDown', 50, limits, 1000), { width: 400, height: 350 })
  assert.deepEqual(keyboardWidgetSize({ width: 280, height: 180 }, 'ArrowLeft', 50, limits, 1000), { width: 280, height: 180 })
  assert.equal(keyboardWidgetSize(size, 'Tab', 10, limits, 1000), null)
})

test('손상된 자유 치수는 원본 보존으로 차단하며 저장 실패 후 치수와 새 내용을 유지해 재시도한다', () => {
  const data = createDefaultData(), a = data.activeSpaceId
  for (const size of [{ width: -1, height: 300 }, { width: 400 }, { width: 1.2, height: 300 }, { width: 400, height: 10001 }, { width: '400', height: 300 }]) {
    assert.throws(() => setWidgetSize(data, { spaceId: a, widgetId: 'clock', size }))
    const storage = storageOf({ ...data, layout: { basic: { spaces: { [a]: { widgets: { clock: size } } } } } })
    const before = storage.raw
    assert.ok(loadData(storage).error)
    assert.equal(storage.raw, before)
    assert.equal(storage.writes, 0)
  }
  let next = setWidgetSize(data, { spaceId: a, widgetId: 'clock', size: { width: 500, height: 240 } })
  const snapshot = structuredClone(next)
  assert.ok(saveData(next, { setItem() { throw new Error('blocked') } }).error)
  assert.deepEqual(next, snapshot)
  next = changeProductivity(next, { type: 'todo/add', spaceId: a, content: '크기 저장 실패 후 입력' })
  const storage = storageOf(data)
  assert.equal(saveData(next, storage).error, null)
  assert.deepEqual(loadData(storage).data, next)
})
