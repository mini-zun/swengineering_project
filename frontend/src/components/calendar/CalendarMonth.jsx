import { formatDateLabel, formatMonthTitle, fromDateKey } from '../../lib/date.js'

// 표시 전용. 계산된 weeks와 이동 이벤트를 받아 월간 달력을 그린다.
export default function CalendarMonth({ todayKey, view, weeks, labels, isCurrentMonth, onPrevious, onNext, onToday, compact = false }) {
  const title = formatMonthTitle(view)
  return <div className="calendar-month">
    <div className="calendar-nav">
      <button type="button" className="calendar-icon-button" aria-label="이전 달" onClick={onPrevious}><Chevron direction="left" /></button>
      <strong className="calendar-title" aria-live="polite">{title}</strong>
      <button type="button" className="calendar-icon-button" aria-label="다음 달" onClick={onNext}><Chevron direction="right" /></button>
      <button type="button" className="calendar-today-button" onClick={onToday} disabled={isCurrentMonth} aria-label="오늘로 이동">오늘</button>
    </div>
    <table className="calendar-grid">
      <caption className="calendar-sr-only">{title} 달력</caption>
      <thead><tr>{labels.map((label) => <th key={label} scope="col" abbr={`${label}요일`}>{label}</th>)}</tr></thead>
      <tbody>{weeks.map((week) => <tr key={week[0].key}>{week.map((cell) => {
        const isToday = cell.key === todayKey
        const className = ['calendar-day', !cell.inMonth && 'is-outside', isToday && 'is-today', (cell.weekday === 0 || cell.weekday === 6) && 'is-weekend'].filter(Boolean).join(' ')
        return <td key={cell.key} className={className} aria-current={isToday ? 'date' : undefined}>
          {(cell.inMonth || !compact) && <time dateTime={cell.key} aria-label={formatDateLabel(fromDateKey(cell.key))}><span aria-hidden="true">{cell.day}</span></time>}
        </td>
      })}</tr>)}</tbody>
    </table>
  </div>
}

function Chevron({ direction }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={direction === 'left' ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5'} />
  </svg>
}
