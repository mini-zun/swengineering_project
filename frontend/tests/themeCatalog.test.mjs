import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultData, createSpace, deleteSpace } from '../src/state/spaces.js'
import { THEME_IDS, isThemeId, setSpaceTheme } from '../src/state/themes.js'
import { THEME_CATALOG, themeName, themeOptions } from '../src/themes/catalog.js'
import { addMemo, setMemoColor } from '../src/state/memos.js'
import { changeProductivity } from '../src/state/productivity.js'
import { loadData, saveData, STORAGE_KEY } from '../src/storage/storage.js'

function memoryStorage() {
  return { raw: null, getItem(key) { assert.equal(key, STORAGE_KEY); return this.raw }, setItem(key, value) { assert.equal(key, STORAGE_KEY); this.raw = value } }
}

test('선택 목록은 기본 디자인과 추가 5개 디자인을 이름·설명·미리보기와 함께 제공한다', () => {
  assert.deepEqual(THEME_CATALOG.map((theme) => theme.id), ['basic', 'emotional', 'memo-board', 'sidebar-cork', 'retro-desktop', 'postit-board'])
  assert.equal(new Set(THEME_CATALOG.map((theme) => theme.name)).size, 6)
  for (const theme of THEME_CATALOG) {
    assert.ok(THEME_IDS.includes(theme.id) && isThemeId(theme.id))
    assert.ok(theme.name.trim() && theme.description.trim())
    assert.match(theme.preview.shape, /^(hero|board|sidebar|desktop|notes)$/)
    for (const key of ['bg', 'surface', 'ink', 'accent']) assert.match(theme.preview[key], /^#[0-9a-f]{6}$/)
  }
  // 사용자 꾸미기는 예약 ID이고 제공 테마 목록에는 넣지 않는다.
  assert.ok(!THEME_CATALOG.some((theme) => theme.id === 'custom'))
  assert.equal(themeName('basic'), '미니멀 페이퍼')
  assert.equal(themeName('future-theme'), 'future-theme')
})

test('화면이 등록된 테마만 선택 가능하고 미설정 공간은 기본 디자인으로 표시한다', () => {
  const data = createDefaultData(), spaceId = data.activeSpaceId
  const onlyBasic = themeOptions(data, spaceId)
  assert.deepEqual([onlyBasic.selectedId, onlyBasic.displayedId, onlyBasic.fallback], ['basic', 'basic', false])
  assert.deepEqual(onlyBasic.options.filter((theme) => theme.available).map((theme) => theme.id), ['basic'])
  assert.deepEqual(onlyBasic.options.filter((theme) => theme.displayed).map((theme) => theme.id), ['basic'])
  const two = themeOptions(setSpaceTheme(data, spaceId, 'emotional'), spaceId, ['basic', 'emotional'])
  assert.deepEqual([two.selectedId, two.displayedId, two.fallback], ['emotional', 'emotional', false])
  assert.deepEqual(two.options.filter((theme) => theme.available).map((theme) => theme.id), ['basic', 'emotional'])
})

test('화면이 없는 테마가 저장된 공간은 선택을 보존한 채 기본 디자인으로 대체한다', () => {
  const data = createDefaultData(), spaceId = data.activeSpaceId
  for (const stored of ['retro-desktop', 'custom', 'future-theme']) {
    const state = themeOptions({ ...data, spaceThemes: { [spaceId]: stored } }, spaceId, ['basic'])
    assert.deepEqual([state.selectedId, state.displayedId, state.fallback], [stored, 'basic', true])
    assert.deepEqual(state.options.filter((theme) => theme.displayed).map((theme) => theme.id), ['basic'])
  }
})

test('공간별 테마는 서로 독립이고 전환·재접속 뒤에도 내용과 개별 색상이 유지된다', () => {
  const storage = memoryStorage()
  let data = createDefaultData()
  const a = data.activeSpaceId
  data = createSpace(data, '일')
  const b = data.activeSpaceId
  data = changeProductivity(data, { type: 'link/add', spaceId: a, name: '사전', url: 'https://example.com' })
  data = changeProductivity(data, { type: 'todo/add', spaceId: a, content: '복습' })
  const added = addMemo(data, a)
  data = setMemoColor(added.data, a, added.memo.id, 'yellow')
  data = changeProductivity(data, { type: 'focus/start', spaceId: a, now: 1000 })
  data = changeProductivity(data, { type: 'focus/stop', now: 61000 })
  const before = JSON.parse(JSON.stringify({ spaces: data.spaces, focus: data.focus }))
  const available = ['basic', 'emotional', 'sidebar-cork']

  data = setSpaceTheme(data, a, 'emotional')
  data = setSpaceTheme(data, b, 'sidebar-cork')
  for (let round = 0; round < 5; round++) {
    data = setSpaceTheme(data, a, round % 2 ? 'emotional' : 'basic')
    assert.equal(themeOptions(data, b, available).displayedId, 'sidebar-cork')
  }
  assert.equal(themeOptions(data, a, available).displayedId, 'basic')
  data = setSpaceTheme(data, a, 'emotional')
  assert.deepEqual(JSON.parse(JSON.stringify({ spaces: data.spaces, focus: data.focus })), before)

  assert.equal(saveData(data, storage).error, null)
  const restored = loadData(storage).data
  assert.deepEqual(restored.spaceThemes, { [a]: 'emotional', [b]: 'sidebar-cork' })
  assert.equal(themeOptions(restored, a, available).displayedId, 'emotional')
  assert.equal(themeOptions(restored, b, available).displayedId, 'sidebar-cork')
  assert.deepEqual(JSON.parse(JSON.stringify({ spaces: restored.spaces, focus: restored.focus })), before)
  assert.equal(restored.spaces[0].memos[0].color, 'yellow')

  // 새 공간은 기본 디자인으로 시작하고, 공간을 지우면 그 공간의 선택만 사라진다.
  const withNew = createSpace(restored, '취미')
  assert.equal(themeOptions(withNew, withNew.activeSpaceId, available).selectedId, 'basic')
  assert.deepEqual(deleteSpace(restored, b).spaceThemes, { [a]: 'emotional' })
})

test('목록에 없는 테마나 없는 공간으로는 선택을 바꾸지 않는다', () => {
  const data = createDefaultData(), spaceId = data.activeSpaceId
  assert.throws(() => setSpaceTheme(data, spaceId, 'future-theme'), /지원하지 않는 테마/)
  assert.throws(() => setSpaceTheme(data, 'missing', 'basic'), /공간을 찾을 수 없어요/)
  assert.equal(data.spaceThemes, undefined)
})
