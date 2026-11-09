import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultData, createSpace, renameSpace, deleteSpace, characterCount } from '../src/state/spaces.js'
import { loadData, saveData, STORAGE_KEY } from '../src/state/storage.js'

function memoryStorage(raw = null) {
  return { raw, getItem(key) { assert.equal(key, STORAGE_KEY); return this.raw }, setItem(key, value) { assert.equal(key, STORAGE_KEY); this.raw = value } }
}

test('첫 접속은 빈 공간 하나이며 저장 후 ID와 선택 공간을 복원한다', () => {
  const storage = memoryStorage()
  const initial = loadData(storage)
  assert.equal(initial.fresh, true)
  assert.equal(initial.data.spaces.length, 1)
  assert.deepEqual(initial.data.spaces[0].links, [])
  const data = createSpace(initial.data, ' 공부 ')
  data.quote = '한 걸음씩\n꾸준하게 🌱'
  assert.equal(saveData(data, storage).error, null)
  assert.deepEqual(loadData(storage).data, data)
})

test('이름의 공백·중복·초과를 거부하고 한글·이모지를 같은 기준으로 센다', () => {
  const data = createDefaultData()
  for (const name of ['   ', '기본 공간', '가'.repeat(21), '🌱'.repeat(21)]) assert.throws(() => createSpace(data, name))
  assert.equal(characterCount('가🌱'), 2)
  assert.equal(createSpace(data, '🌱'.repeat(20)).spaces.length, 2)
})

test('이름 변경·전환·삭제는 다른 공간의 데이터와 ID를 보존한다', () => {
  let data = createDefaultData()
  const first = data.spaces[0]
  first.links.push({ id: 'link-a', name: '테스트' })
  first.todos.push({ id: 'todo-a', content: 'A' })
  first.memos.push({ id: 'memo-a', content: 'A\n메모' })
  data = createSpace(data, '공간 B')
  const second = data.spaces[1]
  second.memos.push({ id: 'memo-b', content: 'B' })
  data = renameSpace(data, first.id, '공간 A')
  assert.equal(data.spaces[0].id, first.id)
  assert.deepEqual(data.spaces[0].memos, first.memos)
  for (let i = 0; i < 10; i++) {
    data = { ...data, activeSpaceId: i % 2 ? first.id : second.id }
    const storage = memoryStorage()
    saveData(data, storage)
    data = loadData(storage).data
    assert.equal(data.spaces[0].memos[0].content, 'A\n메모')
    assert.equal(data.spaces[1].memos[0].content, 'B')
  }
  data = deleteSpace({ ...data, activeSpaceId: second.id }, second.id)
  assert.equal(data.activeSpaceId, first.id)
  assert.deepEqual(data.spaces[0].links, first.links)
  assert.throws(() => deleteSpace(data, first.id))
})

test('없는 선택 공간은 첫 공간으로 복원한다', () => {
  const data = createSpace(createDefaultData(), 'B')
  data.activeSpaceId = 'missing'
  assert.equal(loadData(memoryStorage(JSON.stringify(data))).data.activeSpaceId, data.spaces[0].id)
})

test('읽기·JSON·버전·구조 오류는 원본을 덮어쓰지 않는다', () => {
  assert.match(loadData({ getItem() { throw new Error('blocked') } }).error, /접근/)
  for (const raw of ['{broken', '{"version":2}', '{"version":1}', 'null']) {
    const storage = memoryStorage(raw)
    assert.ok(loadData(storage).error)
    assert.equal(storage.raw, raw)
  }
  const data = createDefaultData()
  data.spaces.push({ ...data.spaces[0] })
  assert.ok(loadData(memoryStorage(JSON.stringify(data))).error)
})

test('저장 실패 뒤 재시도하며 빈 문구·줄바꿈을 보존한다', () => {
  const data = createSpace(createDefaultData(), '저장 실패 테스트')
  const snapshot = structuredClone(data)
  const failure = { setItem() { throw new DOMException('full', 'QuotaExceededError') } }
  assert.match(saveData(data, failure).error, /부족/)
  assert.deepEqual(data, snapshot)
  const storage = memoryStorage()
  assert.equal(saveData(data, storage).error, null)
  assert.deepEqual(loadData(storage).data, snapshot)
  for (const quote of ['', '  공백\n줄바꿈  ', '<script>alert(1)</script>']) {
    saveData({ ...data, quote }, storage)
    assert.equal(loadData(storage).data.quote, quote)
  }
})
