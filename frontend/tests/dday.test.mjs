import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { daysBetween } from '../src/lib/date.js'
import { formatDday, ddayStatus, sortDdaysForDisplay } from '../src/lib/dday.js'
import { addDday, updateDday, deleteDday, ddaysOf, validateDdays, DDAY_TITLE_MAX } from '../src/state/ddays.js'
import { createDefaultData } from '../src/state/spaces.js'
import { loadData, saveData, STORAGE_KEY } from '../src/storage/storage.js'

test('오늘·미래·지난 날짜를 각각 D-Day, D-n, D+n으로 표시한다', () => {
  assert.equal(formatDday(daysBetween('2026-11-10', '2026-11-20')), 'D-10')
  assert.equal(formatDday(daysBetween('2026-11-10', '2026-11-10')), 'D-Day')
  assert.equal(formatDday(daysBetween('2026-11-10', '2026-11-07')), 'D+3')
  assert.equal(formatDday(daysBetween('2026-11-10', '2026-11-11')), 'D-1')
  assert.deepEqual([ddayStatus(5), ddayStatus(0), ddayStatus(-1)], ['upcoming', 'today', 'past'])
})

test('월말·연말·윤년 경계에서 날짜 차이가 정확하다', () => {
  assert.equal(daysBetween('2026-10-31', '2026-11-01'), 1)
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1)
  assert.equal(daysBetween('2024-02-28', '2024-03-01'), 2)
  assert.equal(daysBetween('2023-02-28', '2023-03-01'), 1)
  assert.equal(daysBetween('2026-01-01', '2027-01-01'), 365)
  assert.equal(daysBetween('2024-01-01', '2025-01-01'), 366)
  assert.equal(daysBetween('2027-01-01', '2026-01-01'), -365)
  assert.throws(() => daysBetween('2026-11-10', '2023-02-29'))
})

test('서머타임이 있는 시간대에서도 전환일 전후가 정수 일수다', () => {
  const script = `import { daysBetween } from ${JSON.stringify(new URL('../src/lib/date.js', import.meta.url).href)}
console.log(JSON.stringify([daysBetween('2026-03-07', '2026-03-09'), daysBetween('2026-10-31', '2026-11-02'), daysBetween('2026-01-01', '2026-12-31')]))`
  for (const tz of ['America/New_York', 'Europe/London', 'Australia/Sydney']) {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: tz }, cwd: fileURLToPath(new URL('.', import.meta.url)) })
    assert.deepEqual(JSON.parse(output), [2, 2, 364], tz)
  }
})

test('표시 정렬은 다가오는 날을 가까운 순으로, 지난 날을 뒤에 두며 저장 순서는 바꾸지 않는다', () => {
  const ddays = [
    { id: 'a', title: '지난 일', targetDate: '2026-11-01' },
    { id: 'b', title: '멀리', targetDate: '2026-12-25' },
    { id: 'c', title: '오늘', targetDate: '2026-11-10' },
    { id: 'd', title: '어제', targetDate: '2026-11-09' },
    { id: 'e', title: '가까이', targetDate: '2026-11-12' },
    { id: 'f', title: '가까이 2', targetDate: '2026-11-12' },
  ]
  const before = JSON.stringify(ddays)
  assert.deepEqual(sortDdaysForDisplay(ddays, '2026-11-10').map(({ dday }) => dday.id), ['c', 'e', 'f', 'b', 'd', 'a'])
  assert.equal(JSON.stringify(ddays), before)
})

test('디데이 추가·수정·삭제는 ID를 유지하고 입력을 검증한다', () => {
  let data = createDefaultData()
  assert.deepEqual(ddaysOf(data), [])
  data = addDday(data, { title: '  기말고사  ', targetDate: '2026-12-15' })
  const [created] = data.ddays
  assert.equal(created.title, '기말고사')
  data = updateDday(data, created.id, { title: '기말 🎓', targetDate: '2026-12-16' })
  assert.deepEqual(data.ddays, [{ id: created.id, title: '기말 🎓', targetDate: '2026-12-16' }])
  assert.throws(() => addDday(data, { title: '   ', targetDate: '2026-12-15' }), /1~30자/)
  assert.throws(() => addDday(data, { title: '가'.repeat(DDAY_TITLE_MAX + 1), targetDate: '2026-12-15' }), /1~30자/)
  assert.ok(addDday(data, { title: '😀'.repeat(DDAY_TITLE_MAX), targetDate: '2026-12-15' }))
  assert.throws(() => addDday(data, { title: '시험', targetDate: '' }), /목표 날짜를 선택/)
  assert.throws(() => addDday(data, { title: '시험', targetDate: '2023-02-29' }), /목표 날짜가 올바르지/)
  assert.throws(() => updateDday(data, 'missing', { title: '시험', targetDate: '2026-12-15' }), /찾을 수 없어요/)
  assert.deepEqual(deleteDday(data, created.id).ddays, [])
  assert.equal(deleteDday(data, 'missing').ddays.length, 1)
})

function memoryStorage(raw = null) {
  return { raw, getItem(key) { assert.equal(key, STORAGE_KEY); return this.raw }, setItem(key, value) { assert.equal(key, STORAGE_KEY); this.raw = value } }
}

test('디데이가 저장·복원되고, 디데이 없는 기존 데이터도 그대로 읽힌다', () => {
  const legacy = createDefaultData()
  const storage = memoryStorage(JSON.stringify(legacy))
  const loaded = loadData(storage)
  assert.equal(loaded.error, null)
  assert.deepEqual(ddaysOf(loaded.data), [])
  const data = addDday(loaded.data, { title: '여행', targetDate: '2027-01-03' })
  assert.equal(saveData(data, storage).error, null)
  assert.deepEqual(loadData(storage).data.ddays, data.ddays)
})

test('테마 화면 설정을 바꿔도 디데이 데이터는 유지된다', () => {
  const data = addDday(createDefaultData(), { title: '여행', targetDate: '2027-01-03' })
  const themed = { ...data, layout: { other: { memo: { view: 'board' } } } }
  const storage = memoryStorage()
  assert.equal(saveData(themed, storage).error, null)
  assert.deepEqual(loadData(storage).data.ddays, data.ddays)
})

test('잘못된 디데이 저장 데이터는 거부하고 원본을 덮어쓰지 않는다', () => {
  const base = createDefaultData()
  const bad = [
    'not array',
    [{ id: '', title: '시험', targetDate: '2026-12-15' }],
    [{ id: 'a', title: '시험', targetDate: '2026-12-15' }, { id: 'a', title: '여행', targetDate: '2026-12-16' }],
    [{ id: 'a', title: ' 시험 ', targetDate: '2026-12-15' }],
    [{ id: 'a', title: '시험', targetDate: '2026-02-30' }],
    [{ id: 'a', title: '시험', targetDate: 20261215 }],
  ]
  for (const ddays of bad) {
    assert.throws(() => validateDdays(ddays))
    const raw = JSON.stringify({ ...base, ddays })
    const storage = memoryStorage(raw)
    assert.equal(loadData(storage).data, null)
    assert.equal(storage.raw, raw)
  }
})
