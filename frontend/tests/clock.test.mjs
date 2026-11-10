import test from 'node:test'
import assert from 'node:assert/strict'
import { formatTime, formatLongDate, formatShortDate, toDateTimeAttribute, tickUnit, floorToUnit } from '../src/lib/clock.js'

// 기기 시간대와 상관없이 같은 결과가 나오도록 로컬 생성자로 날짜를 만든다.
const at = (y, m, d, h = 0, min = 0, s = 0) => new Date(y, m - 1, d, h, min, s)

test('기본 형식은 24시간제·초 없음이고 옵션으로 초와 12시간제를 켤 수 있다', () => {
  const afternoon = at(2026, 11, 3, 14, 32, 5)
  assert.equal(formatTime(afternoon), '14:32')
  assert.equal(formatTime(at(2026, 11, 3, 9, 5)), '09:05')
  assert.equal(formatTime(at(2026, 11, 3, 0, 0)), '00:00')
  assert.equal(formatTime(afternoon, { showSeconds: true }), '14:32:05')
  assert.equal(formatTime(afternoon, { hour12: true }), '오후 2:32')
  assert.equal(formatTime(at(2026, 11, 3, 0, 7), { hour12: true }), '오전 12:07')
})

test('자정을 넘기면 날짜와 요일이 함께 바뀐다', () => {
  const before = at(2026, 11, 10, 23, 59, 59)
  const after = new Date(before.getTime() + 1000)
  assert.equal(formatLongDate(before), '2026년 11월 10일 화요일')
  assert.equal(formatTime(after), '00:00')
  assert.equal(formatLongDate(after), '2026년 11월 11일 수요일')
  assert.equal(formatShortDate(after), '11.11(수)')
})

test('월말·연말·윤년 경계의 날짜와 요일', () => {
  assert.equal(formatLongDate(new Date(at(2026, 11, 30, 23, 59, 59).getTime() + 1000)), '2026년 12월 1일 화요일')
  assert.equal(formatLongDate(new Date(at(2026, 12, 31, 23, 59, 59).getTime() + 1000)), '2027년 1월 1일 금요일')
  assert.equal(formatLongDate(at(2028, 2, 29)), '2028년 2월 29일 화요일')
  assert.equal(formatLongDate(new Date(at(2028, 2, 28, 23, 59, 59).getTime() + 1000)), '2028년 2월 29일 화요일')
  assert.equal(formatLongDate(new Date(at(2027, 2, 28, 23, 59, 59).getTime() + 1000)), '2027년 3월 1일 월요일')
})

test('dateTime 속성은 기기 시간대 기준 값이다', () => {
  assert.equal(toDateTimeAttribute(at(2026, 1, 5, 7, 3, 9)), '2026-01-05T07:03')
  assert.equal(toDateTimeAttribute(at(2026, 1, 5, 7, 3, 9), { showSeconds: true }), '2026-01-05T07:03:09')
})

test('표시 단위로 내림하면 같은 분 안에서는 snapshot이 바뀌지 않는다', () => {
  const unit = tickUnit()
  assert.equal(unit, 60_000)
  assert.equal(tickUnit({ showSeconds: true }), 1000)
  const minuteStart = at(2026, 11, 10, 14, 32).getTime()
  assert.equal(floorToUnit(minuteStart + 59_999, unit), minuteStart)
  assert.equal(floorToUnit(minuteStart + 60_000, unit), minuteStart + 60_000)
  assert.equal(floorToUnit(minuteStart + 1500, 1000), minuteStart + 1000)
})

test('공통 시간 store를 분 단위로 구독하면 분이 바뀔 때만 값이 바뀌고 자정에 날짜도 바뀐다', async () => {
  const { createTimeSource } = await import('../src/lib/timeSource.js')
  let current = at(2026, 11, 10, 23, 59, 58).getTime()
  let pending = null
  const source = createTimeSource({
    now: () => current,
    setTimer: (callback, delay) => { pending = { callback, at: current + delay }; return 1 },
    clearTimer: () => { pending = null },
    target: null,
  })
  const snapshots = []
  const unsubscribe = source.subscribe(() => snapshots.push(floorToUnit(source.getSnapshot(), tickUnit())))
  for (let i = 0; i < 3; i += 1) { current = pending.at; pending.callback() }
  // 23:59:59, 00:00:00, 00:00:01 → 분 단위 값은 두 가지뿐이다.
  assert.equal(new Set(snapshots).size, 2)
  const latest = new Date(snapshots.at(-1))
  assert.equal(formatTime(latest), '00:00')
  assert.equal(formatLongDate(latest), '2026년 11월 11일 수요일')
  unsubscribe()
  assert.equal(pending, null, '구독자가 없으면 타이머를 정리한다')
})

test('실행 중 기기 시간대가 바뀌면 12시간제도 날짜·24시간제와 같은 시간대로 표시한다', () => {
  const original = process.env.TZ
  try {
    const instant = new Date('2026-11-10T14:32:00Z')
    process.env.TZ = 'UTC'
    assert.equal(formatTime(instant, { hour12: true }), '오후 2:32')
    process.env.TZ = 'Asia/Seoul'
    assert.equal(formatTime(instant), '23:32')
    assert.equal(formatTime(instant, { hour12: true }), '오후 11:32')
    assert.equal(formatLongDate(instant), '2026년 11월 10일 화요일')
    assert.equal(formatTime(new Date('2026-11-10T15:05:09Z'), { hour12: true, showSeconds: true }), '오전 12:05:09')
  } finally {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  }
})
