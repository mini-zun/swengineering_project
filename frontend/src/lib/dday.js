import { daysBetween } from './date.js'

// 남은 일수(목표일 - 오늘)를 디데이 문구로 바꾼다. 지난 날짜는 D+n으로 계속 보여준다.
export function formatDday(diff) {
  if (diff === 0) return 'D-Day'
  return diff > 0 ? `D-${diff}` : `D+${-diff}`
}

export function ddayStatus(diff) {
  if (diff === 0) return 'today'
  return diff > 0 ? 'upcoming' : 'past'
}

// 화면 표시용 정렬. 저장 순서는 바꾸지 않는다.
// 다가오는 날(오늘 포함)을 가까운 순으로 먼저, 지난 날은 최근에 지난 순으로 뒤에 둔다. 같은 날짜는 만든 순서를 유지한다.
export function sortDdaysForDisplay(ddays, todayKey) {
  return ddays
    .map((dday, index) => ({ dday, index, diff: daysBetween(todayKey, dday.targetDate) }))
    .sort((a, b) => {
      const aPast = a.diff < 0
      const bPast = b.diff < 0
      if (aPast !== bPast) return aPast ? 1 : -1
      if (a.diff !== b.diff) return aPast ? b.diff - a.diff : a.diff - b.diff
      return a.index - b.index
    })
}
