import { formatDateLabel, fromDateKey, WEEKDAY_LABELS } from '../../lib/date.js'

// 표시 전용. 이번 주 7일을 한 줄로 그리고 오늘을 강조한다.
export default function CalendarWeek({ todayKey, days }) {
  return <ol className="calendar-week" aria-label="이번 주">
    {days.map((cell) => {
      const isToday = cell.key === todayKey
      return <li key={cell.key} className={['calendar-week-day', isToday && 'is-today', (cell.weekday === 0 || cell.weekday === 6) && 'is-weekend'].filter(Boolean).join(' ')}
        aria-current={isToday ? 'date' : undefined}>
        <time dateTime={cell.key} aria-label={formatDateLabel(fromDateKey(cell.key))}>
          <span className="calendar-week-label" aria-hidden="true">{WEEKDAY_LABELS[cell.weekday]}</span>
          <span className="calendar-week-number" aria-hidden="true">{cell.day}</span>
        </time>
      </li>
    })}
  </ol>
}
