import useNow from '../../hooks/useNow.js'
import { formatLongDate, formatShortDate, formatTime, tickUnit, toDateTimeAttribute } from '../../lib/clock.js'
import './Clock.css'

/**
 * 현재 시각·오늘 날짜·요일 표시 전용 컴포넌트. 저장할 데이터는 없다.
 * - variant: 'hero'(큰 중앙 시계, 미니멀 페이퍼 기본) | 'compact'(작은 상단 시계)
 * - 색·크기·간격은 Clock.css의 --clock-* 변수로, 위치는 감싸는 레이아웃이 정한다.
 * - source: 테스트·미리보기에서 시간 store를 바꿔 끼울 때만 넘긴다.
 */
export default function Clock({ variant = 'hero', hour12 = false, showSeconds = false, source }) {
  const now = new Date(useNow({ unit: tickUnit({ showSeconds }), source }))
  const time = formatTime(now, { hour12, showSeconds })
  const dateTime = toDateTimeAttribute(now, { showSeconds })

  if (variant === 'compact') {
    return <div className="clock clock--compact">
      <time className="clock-time" dateTime={dateTime}>{time}</time>
      <span className="clock-separator" aria-hidden="true">·</span>
      <time className="clock-date" dateTime={dateTime.slice(0, 10)}>{formatShortDate(now)}</time>
    </div>
  }

  return <div className={`clock clock--hero${showSeconds ? ' clock--seconds' : ''}`}>
    <time className="clock-date" dateTime={dateTime.slice(0, 10)}>{formatLongDate(now)}</time>
    <time className="clock-time" dateTime={dateTime}>{time}</time>
  </div>
}
