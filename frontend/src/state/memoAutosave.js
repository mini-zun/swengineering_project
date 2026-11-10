export const MEMO_AUTOSAVE_DELAY = 1000

// 메모별 저장 예약기. 예약할 때의 spaceId·memoId·content를 함께 묶어 두어,
// 타이머가 실행될 때 현재 선택된 공간이나 메모에 잘못 저장하지 않게 한다.
// 같은 메모에 새 입력이 오면 이전 예약을 지우므로 오래된 내용이 새 내용을 덮지 않는다.
export function createMemoAutosave({ save, delay = MEMO_AUTOSAVE_DELAY, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const pending = new Map()

  function run(memoId) {
    const job = pending.get(memoId)
    if (!job) return
    pending.delete(memoId)
    save({ spaceId: job.spaceId, memoId, content: job.content })
  }

  return {
    schedule(spaceId, memoId, content) {
      const previous = pending.get(memoId)
      if (previous) clearTimer(previous.timer)
      pending.set(memoId, { spaceId, content, timer: setTimer(() => run(memoId), delay) })
    },
    // 공간 전환·페이지 숨김 때 기다리지 않고 바로 저장한다.
    flush(spaceId) {
      for (const [memoId, job] of [...pending]) {
        if (spaceId !== undefined && job.spaceId !== spaceId) continue
        clearTimer(job.timer)
        run(memoId)
      }
    },
    cancel(memoId) {
      const job = pending.get(memoId)
      if (job) clearTimer(job.timer)
      pending.delete(memoId)
    },
    cancelSpace(spaceId) {
      for (const [memoId, job] of [...pending]) if (job.spaceId === spaceId) { clearTimer(job.timer); pending.delete(memoId) }
    },
    isPending: (memoId) => pending.has(memoId),
  }
}
