// 앱 전체에서 하나만 쓰는 현재 시각 store. 구독자가 있을 때만 1초 경계에 맞춘 타이머를 돌린다.
// 탭이 다시 보이거나 절전에서 깨어나면 즉시 시각을 다시 계산한다.
export function createTimeSource({ now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, target = globalThis.document } = {}) {
  const listeners = new Set()
  let snapshot = now()
  let timer = null

  function update() {
    snapshot = now()
    listeners.forEach((listener) => listener())
  }

  function schedule() {
    clearTimer(timer)
    timer = setTimer(() => { update(); schedule() }, 1000 - (now() % 1000))
  }

  function onVisible() {
    if (target?.visibilityState === 'hidden') return
    update()
    schedule()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      if (listeners.size === 1) {
        snapshot = now()
        schedule()
        target?.addEventListener?.('visibilitychange', onVisible)
      }
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          clearTimer(timer)
          timer = null
          target?.removeEventListener?.('visibilitychange', onVisible)
        }
      }
    },
  }
}

export const timeSource = createTimeSource()
