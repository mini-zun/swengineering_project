// 시계·달력이 함께 쓰는 순수 날짜 함수. 모든 계산은 기기 로컬 시간 기준이다.
// 'YYYY-MM-DD' 문자열을 new Date(key)로 만들면 UTC로 해석되므로 fromDateKey만 사용한다.

// 0 = 일요일 시작, 1 = 월요일 시작. 팀 결정에 따라 이 값만 바꾼다.
export const WEEK_START = 0
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const pad = (value) => String(value).padStart(2, '0')

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) throw new Error(`날짜 형식이 올바르지 않아요: ${key}`)
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day)
  if (toDateKey(date) !== key) throw new Error(`존재하지 않는 날짜예요: ${key}`)
  return date
}

export const isSameDay = (a, b) => toDateKey(a) === toDateKey(b)

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

// 31일에서 다음 달로 갈 때 넘침을 막기 위해 항상 1일 기준으로 이동한다.
export function addMonths({ year, month }, amount) {
  const date = new Date(year, month + amount, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function monthOf(date) {
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function startOfWeek(date, weekStart = WEEK_START) {
  const offset = (date.getDay() - weekStart + 7) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
}

export function weekdayLabels(weekStart = WEEK_START) {
  return Array.from({ length: 7 }, (_, index) => WEEKDAY_LABELS[(weekStart + index) % 7])
}

function dayCell(date, month) {
  return { key: toDateKey(date), day: date.getDate(), weekday: date.getDay(), inMonth: month === undefined || date.getMonth() === month }
}

export function getWeekDates(date, weekStart = WEEK_START) {
  const start = startOfWeek(date, weekStart)
  return Array.from({ length: 7 }, (_, index) => dayCell(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)))
}

// 앞뒤 달 날짜를 포함한 주 단위 배열. 높이가 흔들리지 않도록 기본 6주로 고정한다.
export function getMonthGrid({ year, month }, weekStart = WEEK_START, { fixedWeeks = true } = {}) {
  const start = startOfWeek(new Date(year, month, 1), weekStart)
  const usedDays = Math.round((new Date(year, month + 1, 1) - start) / 86400000)
  const weekCount = fixedWeeks ? 6 : Math.ceil(usedDays / 7)
  return Array.from({ length: weekCount }, (_, week) => Array.from({ length: 7 }, (_, index) =>
    dayCell(new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + index), month)))
}

export function msUntilNextMidnight(now) {
  const date = new Date(now)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) - date
}

export function formatMonthTitle({ year, month }) {
  return `${year}년 ${month + 1}월`
}

export function formatDateLabel(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_LABELS[date.getDay()]}요일`
}

// 두 날짜 키 사이의 달력 날짜 차이(to - from). 시각은 보지 않는다.
// 로컬 Date끼리 빼면 서머타임 전환일에 하루가 23·25시간이 되므로 UTC 자정끼리 비교한다.
export function daysBetween(fromKey, toKey) {
  const utcDay = (key) => {
    const date = fromDateKey(key)
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  }
  return Math.round((utcDay(toKey) - utcDay(fromKey)) / 86400000)
}
