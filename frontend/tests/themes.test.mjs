import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultData, createSpace, renameSpace, deleteSpace } from '../src/state/spaces.js'
import { THEME_IDS, spaceThemeId, resolveSpaceThemeId, setSpaceTheme } from '../src/state/themes.js'
import { addMemo, setMemoSize, setMemoView, memoLayout, applyMemoSave, deleteMemo } from '../src/state/memos.js'
import { setWidgetSize, widgetSize } from '../src/state/widgetSizes.js'
import { changeProductivity } from '../src/state/productivity.js'
import { elapsedMs } from '../src/lib/productivity.js'
import { createMemoAutosave } from '../src/state/memoAutosave.js'
import { loadData, saveData, STORAGE_KEY } from '../src/storage/storage.js'

function storageOf(data) {
  return { raw: JSON.stringify(data), writes: 0,
    getItem(key) { assert.equal(key, STORAGE_KEY); return this.raw },
    setItem(key, value) { assert.equal(key, STORAGE_KEY); this.raw = value; this.writes++ },
  }
}

test('선택 테마가 없는 version 1·2는 기본 테마를 사용하고 읽기 중 원본을 쓰지 않는다', () => {
  for (const version of [1, 2]) {
    const old = createDefaultData()
    if (version === 1) { old.version = 1; old.quote = '이전 문구'; delete old.spaces[0].quote }
    const storage = storageOf(old), raw = storage.raw
    const result = loadData(storage)
    assert.equal(result.error, null)
    assert.equal(spaceThemeId(result.data, old.activeSpaceId), 'basic')
    assert.equal(result.data.spaceThemes, undefined)
    assert.equal(result.data.spaces[0].quote, version === 1 ? '이전 문구' : '')
    assert.equal(storage.raw, raw)
    assert.equal(storage.writes, 0)
  }
})

test('공간별 선택과 테마별 크기·메모 설정은 반복 전환·저장·복원 후 분리된다', () => {
  let data = createSpace(createDefaultData(), 'B')
  const [a, b] = data.spaces.map((space) => space.id)
  const added = addMemo(data, a), id = added.memo.id
  data = added.data
  data = setMemoSize(setMemoView(data, 'board'), a, id, 'l')
  const original = structuredClone(data.layout.basic)
  data = setSpaceTheme(data, a, 'sidebar-cork')
  data = setSpaceTheme(data, b, 'postit-board')
  data = setWidgetSize(data, { spaceId: a, themeId: 'sidebar-cork', widgetId: 'memos', size: { width: 500, height: 400 } })
  data = setWidgetSize(data, { spaceId: b, themeId: 'postit-board', widgetId: 'memos', size: 's' })
  data = setMemoSize(setMemoView(data, 'sheet', 'sidebar-cork'), a, id, 's', 'sidebar-cork')
  const storage = storageOf(data)
  for (let i = 0; i < 10; i++) {
    data = { ...data, activeSpaceId: i % 2 ? a : b }
    assert.equal(saveData(data, storage).error, null)
    data = loadData(storage).data
    assert.equal(spaceThemeId(data, a), 'sidebar-cork')
    assert.equal(spaceThemeId(data, b), 'postit-board')
    assert.deepEqual(widgetSize(data, a, 'memos', 'sidebar-cork'), { width: 500, height: 400 })
    assert.equal(widgetSize(data, b, 'memos', 'postit-board'), 's')
    assert.equal(memoLayout(data, 'sidebar-cork').sizes[id], 's')
    assert.deepEqual(data.layout.basic, original)
  }
  data = setSpaceTheme(data, a, 'basic')
  assert.deepEqual(data.layout.basic, original)
  assert.equal(memoLayout(data, 'sidebar-cork').sizes[id], 's')
})

test('미구현·미래 테마의 선택과 설정을 보존하고 사용 가능한 렌더러만 표시한다', () => {
  const data = createDefaultData(), a = data.activeSpaceId
  for (const themeId of [...THEME_IDS, 'future-theme']) {
    const source = { ...data, spaceThemes: { [a]: themeId }, layout: { [themeId]: { memo: { view: 'board' } } } }
    const storage = storageOf(source), raw = storage.raw
    const result = loadData(storage)
    assert.equal(result.error, null)
    assert.equal(spaceThemeId(result.data, a), themeId)
    assert.equal(resolveSpaceThemeId(result.data, a), 'basic')
    assert.equal(resolveSpaceThemeId(result.data, a, ['basic', themeId]), themeId)
    assert.equal(saveData(result.data, storage).error, null)
    assert.equal(storage.raw, raw)
    assert.throws(() => setSpaceTheme(data, 'missing', themeId))
  }
  assert.throws(() => setSpaceTheme(data, a, 'future-theme'))
})

test('잘못된 선택값과 메모 설정 배열은 읽기를 차단하고 원본을 보존한다', () => {
  const data = createDefaultData(), a = data.activeSpaceId
  const invalid = [
    ...[null, [], 'basic', { [a]: null }, { [a]: '' }, { [a]: '__proto__' }, { [a]: 'Bad ID' }, { [a]: 'x'.repeat(65) }, { '': 'basic' }].map((spaceThemes) => ({ ...data, spaceThemes })),
    ...[[], { sizes: [] }, { view: 'invalid' }].map((memo) => ({ ...data, layout: { basic: { memo } } })),
  ]
  for (const source of invalid) {
    const storage = storageOf(source), raw = storage.raw
    assert.ok(loadData(storage).error)
    assert.ok(saveData(source, storage).error)
    assert.equal(storage.raw, raw)
    assert.equal(storage.writes, 0)
  }
})

test('설정 저장 실패 후 최신 메모·선택 테마·다른 입력을 함께 재시도한다', () => {
  let data = createDefaultData(), a = data.activeSpaceId
  const added = addMemo(data, a), id = added.memo.id
  data = setSpaceTheme(added.data, a, 'sidebar-cork')
  const storage = storageOf(createDefaultData()), raw = storage.raw
  const failing = { setItem() { throw new DOMException('full', 'QuotaExceededError') } }
  const before = structuredClone(data)
  assert.match(saveData(data, failing).error, /부족/)
  assert.deepEqual(data, before)
  data = applyMemoSave(data, { spaceId: a, memoId: id, content: '실패 후 최신 메모' })
  data = setSpaceTheme(data, a, 'postit-board')
  data = changeProductivity(data, { type: 'todo/add', spaceId: a, content: '추가 입력' })
  assert.equal(storage.raw, raw)
  assert.equal(saveData(data, storage).error, null)
  assert.deepEqual(loadData(storage).data, data)
  assert.equal(data.spaces[0].todos.length, 1)
})

test('테마 변경과 대기 메모 저장이 콘텐츠·문구·디데이·집중 세션을 보존한다', () => {
  let data = createDefaultData(), a = data.activeSpaceId
  const added = addMemo(data, a), id = added.memo.id
  data = added.data
  data.spaces[0].quote = '문구'
  data.ddays = [{ id: 'exam', title: '시험', targetDate: '2026-12-01' }]
  data = changeProductivity(data, { type: 'link/add', spaceId: a, name: '학교', url: 'example.com' })
  data = changeProductivity(data, { type: 'focus/start', spaceId: a, now: 1000 })
  const session = structuredClone(data.focus)
  const autosave = createMemoAutosave({ save: (job) => { data = applyMemoSave(data, job) }, setTimer: () => 1, clearTimer() {} })
  autosave.schedule(a, id, '테마 변경 직전 초안\n마지막 줄')
  data = setSpaceTheme(data, a, 'sidebar-cork')
  data = setMemoView(data, 'board', 'sidebar-cork')
  autosave.flush(a)
  const storage = storageOf(data)
  assert.equal(saveData(data, storage).error, null)
  data = loadData(storage).data
  assert.equal(data.spaces[0].memos[0].content, '테마 변경 직전 초안\n마지막 줄')
  assert.equal(data.spaces[0].quote, '문구')
  assert.equal(data.spaces[0].links.length, 1)
  assert.equal(data.ddays[0].id, 'exam')
  assert.deepEqual(data.focus, session)
  assert.equal(elapsedMs(data.focus.activeSession, 6000), 5000)
})

test('이름 변경은 선택·설정을 유지하고 공간 삭제는 해당 메모 크기를 모든 테마에서 정리한다', () => {
  let data = createSpace(createDefaultData(), 'B')
  const [a, b] = data.spaces.map((space) => space.id)
  const addedA = addMemo(data, a), memoA = addedA.memo.id
  const addedB = addMemo(addedA.data, b), memoB = addedB.memo.id
  data = addedB.data
  for (const themeId of ['basic', 'sidebar-cork', 'postit-board']) {
    data = setMemoSize(data, a, memoA, 'l', themeId)
    data = setMemoSize(data, b, memoB, 's', themeId)
    data = setWidgetSize(data, { spaceId: a, themeId, widgetId: 'clock', size: 'l' })
    data = setWidgetSize(data, { spaceId: b, themeId, widgetId: 'clock', size: 's' })
  }
  data = setSpaceTheme(setSpaceTheme(data, a, 'sidebar-cork'), b, 'postit-board')
  const before = structuredClone(data)
  data = renameSpace(data, a, '이름 변경')
  assert.deepEqual(data.spaceThemes, before.spaceThemes)
  assert.deepEqual(data.layout, before.layout)
  const removed = deleteMemo(data, a, memoA)
  assert.equal(removed.layout.basic.memo.sizes[memoA], undefined)
  assert.equal(removed.layout.basic.memo.sizes[memoB], 's')
  data = deleteSpace(data, a)
  assert.deepEqual(data.spaceThemes, { [b]: 'postit-board' })
  for (const theme of Object.values(data.layout)) {
    assert.equal(theme.memo.sizes[memoA], undefined)
    assert.equal(theme.memo.sizes[memoB], 's')
    assert.equal(theme.spaces[a], undefined)
    assert.equal(theme.spaces[b].widgets.clock, 's')
  }
  assert.deepEqual(data.spaces[0], before.spaces[1])
  assert.equal(applyMemoSave(data, { spaceId: a, memoId: memoA, content: '늦은 입력' }), data)
})
