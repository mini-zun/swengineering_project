import { useCalendarView } from '../../hooks/useCalendarView.js'
import { weekdayLabels, WEEK_START } from '../../lib/date.js'
import CalendarMonth from './CalendarMonth.jsx'
import CalendarWeek from './CalendarWeek.jsx'
import './Calendar.css'

// variant: full(월간 + 이번 주, 기본) | month | week | mini
// 위치·너비는 레이아웃 슬롯이 정하고, 색·크기는 Calendar.css의 --calendar-* 변수로 바꾼다.
export default function Calendar({ todayKey, variant = 'full', title = '달력', weekStart = WEEK_START }) {
  const calendar = useCalendarView(todayKey, { weekStart })
  const showMonth = variant !== 'week'
  const showWeek = variant === 'full' || variant === 'week'
  return <div className={`calendar calendar--${variant}`}>
    {title && <h2 className="calendar-heading">{title}</h2>}
    {showWeek && <CalendarWeek todayKey={todayKey} days={calendar.thisWeek} />}
    {showMonth && <div className="calendar-card">
      <CalendarMonth todayKey={todayKey} view={calendar.view} weeks={calendar.weeks} labels={weekdayLabels(weekStart)}
        isCurrentMonth={calendar.isCurrentMonth} onPrevious={calendar.previous} onNext={calendar.next} onToday={calendar.goToday}
        compact={variant === 'mini'} />
    </div>}
  </div>
}
