import { useState } from 'react'
import { addMonths, fromDateKey, getMonthGrid, getWeekDates, monthOf, WEEK_START } from '../lib/date.js'

// 보고 있는 달은 화면 상태라 저장하지 않는다. 오늘은 App이 내려준 todayKey 하나만 기준으로 쓴다.
// 사용자가 달을 옮기기 전(selected가 null)에는 오늘이 속한 달을 따라가므로 월이 바뀌는 자정에도 맞춰진다.
export function useCalendarView(todayKey, { weekStart = WEEK_START, fixedWeeks = true } = {}) {
  const today = fromDateKey(todayKey)
  const current = monthOf(today)
  const [selected, setSelected] = useState(null)
  const view = selected ?? current
  return {
    view,
    weeks: getMonthGrid(view, weekStart, { fixedWeeks }),
    thisWeek: getWeekDates(today, weekStart),
    isCurrentMonth: view.year === current.year && view.month === current.month,
    previous: () => setSelected(addMonths(view, -1)),
    next: () => setSelected(addMonths(view, 1)),
    goToday: () => setSelected(null),
  }
}
