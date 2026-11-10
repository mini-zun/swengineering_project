import { WEEKDAY_LABELS, formatDateLabel } from './date.js'

// 시계 표시용 순수 함수. 날짜 계산(dateKey, 자정 등)은 달력과 함께 쓰는 date.js가 맡고,
// 이 파일은 "어떻게 보여 줄지"만 정한다. 테마가 형식을 바꿀 때는 옵션만 바꾼다.

const pad = (value) => String(value).padStart(2, '0')

// 포맷터 생성 비용을 줄이려고 옵션 조합별로 한 번만 만든다.
const formatters = new Map()
function formatter(options) {
  const key = JSON.stringify(options)
  if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat('ko-KR', options))
  return formatters.get(key)
}

/** 기본(미니멀 페이퍼): 24시간제, 초 없음 → "14:32" */
export function formatTime(date, { hour12 = false, showSeconds = false } = {}) {
  if (!hour12) {
    // 24시간제는 브라우저마다 Intl 결과가 달라질 여지가 있어 직접 만든다.
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
    return showSeconds ? `${time}:${pad(date.getSeconds())}` : time
  }
  return formatter({ hour: 'numeric', minute: '2-digit', ...(showSeconds && { second: '2-digit' }), hour12: true }).format(date)
}

/** "2026년 11월 3일 화요일". 달력과 같은 표기를 쓰도록 date.js의 함수를 그대로 쓴다. */
export const formatLongDate = formatDateLabel

/** 작은 시계용 "11.3(화)" */
export function formatShortDate(date) {
  return `${date.getMonth() + 1}.${date.getDate()}(${WEEKDAY_LABELS[date.getDay()]})`
}

/** <time dateTime>에 넣는 기기 시간대 기준 값 "2026-11-03T14:32" */
export function toDateTimeAttribute(date, { showSeconds = false } = {}) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day}T${formatTime(date, { showSeconds })}`
}

/** 화면 갱신 단위(ms). 초를 숨기면 분이 바뀔 때만 다시 그린다. */
export function tickUnit({ showSeconds = false } = {}) {
  return showSeconds ? 1000 : 60_000
}

/**
 * 현재 시각(ms)을 표시 단위의 시작으로 내린다. useNow가 이 값을 snapshot으로 쓰면
 * 시간 store가 1초마다 알려도 분이 바뀔 때만 리렌더된다.
 * (시간대 오프셋은 분 단위라 UTC 기준으로 내려도 기기 시각의 분 경계와 같다.)
 */
export function floorToUnit(ms, unit) {
  return ms - (((ms % unit) + unit) % unit)
}
