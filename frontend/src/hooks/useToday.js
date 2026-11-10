import { useSyncExternalStore } from 'react'
import { timeSource } from '../lib/timeSource.js'
import { toDateKey } from '../lib/date.js'

// 오늘 날짜를 'YYYY-MM-DD'로 돌려준다. 문자열이 바뀌는 자정에만 리렌더된다.
export function useToday(source = timeSource) {
  return useSyncExternalStore(source.subscribe, () => toDateKey(new Date(source.getSnapshot())))
}
