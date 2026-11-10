import { useCallback, useSyncExternalStore } from 'react'
import { timeSource } from '../lib/timeSource.js'
import { floorToUnit } from '../lib/clock.js'

/**
 * 앱 공통 시간 store를 구독해 현재 시각(ms)을 unit 단위로 내린 값을 돌려준다.
 * 타이머는 store 하나만 돌고, 같은 분(또는 초) 안에서는 snapshot이 같아서 리렌더되지 않는다.
 * App에서 부르면 App 전체가 갱신되므로 시계 컴포넌트 안에서만 호출한다.
 */
export default function useNow({ unit = 60_000, source = timeSource } = {}) {
  const getSnapshot = useCallback(() => floorToUnit(source.getSnapshot(), unit), [source, unit])
  return useSyncExternalStore(source.subscribe, getSnapshot, getSnapshot)
}
