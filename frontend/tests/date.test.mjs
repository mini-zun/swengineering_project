import test from 'node:test'
import assert from 'node:assert/strict'
import { toDateKey, fromDateKey, daysInMonth, addMonths, getMonthGrid, getWeekDates, weekdayLabels, msUntilNextMidnight, formatDateLabel } from '../src/lib/date.js'
import { createTimeSource } from '../src/lib/timeSource.js'

test('날짜 키는 로컬 기준으로 왕복하고 없는 날짜를 거부한다', () => {
  assert.equal(toDateKey(new Date(2026, 0, 5)), '2026-01-05')
  assert.equal(toDateKey(fromDateKey('2024-02-29')), '2024-02-29')
  assert.equal(fromDateKey('2026-11-10').getDate(), 10)
  for (const key of ['2023-02-29', '2026-13-01', '2026-1-5', '']) assert.throws(() => fromDateKey(key))
})

test('윤년과 월말 일수가 정확하다', () => {
  assert.equal(daysInMonth(2024, 1), 29)
  assert.equal(daysInMonth(2023, 1), 28)
  assert.equal(daysInMonth(2000, 1), 29)
  assert.equal(daysInMonth(2100, 1), 28)
  assert.equal(daysInMonth(2026, 3), 30)
  assert.equal(daysInMonth(2026, 11), 31)
})

test('달 이동은 연도를 넘고 1일 기준이라 넘치지 않는다', () => {
  assert.deepEqual(addMonths({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 })
  assert.deepEqual(addMonths({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 })
  assert.deepEqual(addMonths({ year: 2026, month: 0 }, 1), { year: 2026, month: 1 })
  assert.deepEqual(addMonths({ year: 2026, month: 5 }, 12), { year: 2027, month: 5 })
})

test('월간 그리드는 요일이 맞고 앞뒤 달 날짜를 포함한다', () => {
  const grid = getMonthGrid({ year: 2026, month: 10 }, 0)
  assert.equal(grid.length, 6)
  assert.equal(grid[0][0].key, '2026-11-01')
  assert.equal(grid[0][0].weekday, 0)
  const days = grid.flat()
  assert.equal(days.filter((cell) => cell.inMonth).length, 30)
  assert.equal(days.at(-1).key, '2026-12-12')
  for (const cell of days) assert.equal(fromDateKey(cell.key).getDay(), cell.weekday)

  const leap = getMonthGrid({ year: 2024, month: 1 }, 1).flat()
  assert.equal(leap[0].key, '2024-01-29')
  assert.equal(leap.filter((cell) => cell.inMonth).at(-1).key, '2024-02-29')
  assert.equal(getMonthGrid({ year: 2026, month: 1 }, 0, { fixedWeeks: false }).length, 4)
})

test('주간 날짜는 연도를 걸쳐도 7일이 이어지고 시작 요일을 따른다', () => {
  const sunday = getWeekDates(new Date(2026, 11, 31), 0).map((cell) => cell.key)
  assert.deepEqual([sunday[0], sunday[6]], ['2026-12-27', '2027-01-02'])
  const monday = getWeekDates(new Date(2027, 0, 3), 1).map((cell) => cell.key)
  assert.deepEqual([monday[0], monday[6]], ['2026-12-28', '2027-01-03'])
  assert.deepEqual(weekdayLabels(1), ['월', '화', '수', '목', '금', '토', '일'])
})

test('월간 그리드와 주간 날짜의 오늘이 같은 키를 쓴다', () => {
  const today = new Date(2027, 0, 1)
  const todayKey = toDateKey(today)
  const week = getWeekDates(today, 0).find((cell) => cell.key === todayKey)
  const month = getMonthGrid({ year: 2027, month: 0 }, 0).flat().find((cell) => cell.key === todayKey)
  assert.equal(week.weekday, month.weekday)
  assert.equal(formatDateLabel(today), '2027년 1월 1일 금요일')
})

test('자정까지 남은 시간을 계산한다', () => {
  assert.equal(msUntilNextMidnight(new Date(2026, 11, 31, 23, 59, 59, 500).getTime()), 500)
})

function fakeClock(start) {
  let current = start
  let pending = null
  const listeners = {}
  return {
    now: () => current,
    setTimer: (fn, ms) => { pending = { fn, at: current + ms }; return pending },
    clearTimer: (timer) => { if (pending === timer) pending = null },
    target: { visibilityState: 'visible', addEventListener: (type, fn) => { listeners[type] = fn }, removeEventListener: (type) => { delete listeners[type] } },
    advance(ms) { current += ms; while (pending && pending.at <= current) { const { fn } = pending; pending = null; fn() } },
    jump(ms) { current += ms; listeners.visibilitychange?.() },
    get pending() { return pending },
    get listeners() { return listeners },
  }
}

test('time source는 자정이 지나면 날짜가 바뀌고 구독이 없으면 타이머를 정리한다', () => {
  const clock = fakeClock(new Date(2026, 11, 31, 23, 59, 59).getTime())
  const source = createTimeSource(clock)
  const days = []
  const unsubscribe = source.subscribe(() => days.push(toDateKey(new Date(source.getSnapshot()))))
  assert.equal(toDateKey(new Date(source.getSnapshot())), '2026-12-31')
  clock.advance(1000)
  assert.equal(days.at(-1), '2027-01-01')
  unsubscribe()
  assert.equal(clock.pending, null)
  assert.equal(clock.listeners.visibilitychange, undefined)
})

test('time source는 절전 복귀 시 즉시 다시 계산한다', () => {
  const clock = fakeClock(new Date(2026, 10, 10, 22, 0, 0).getTime())
  const source = createTimeSource(clock)
  let calls = 0
  source.subscribe(() => calls++)
  clock.jump(3 * 60 * 60 * 1000)
  assert.equal(calls, 1)
  assert.equal(toDateKey(new Date(source.getSnapshot())), '2026-11-11')
})
