import { useEffect, useRef, useState } from 'react'
import { createMemoAutosave } from '../state/memoAutosave.js'
import { addMemo, applyMemoSave, deleteMemo, setMemoColor, setMemoSize, setMemoView, validateMemoContent } from '../state/memos.js'

// 메모 로직(초안·자동 저장·선택 메모)을 표시 컴포넌트와 분리한다.
// 테마가 새 표시 방식을 추가해도 이 훅은 그대로 쓴다.
// commit(updater)는 App의 최신 데이터에 변경을 적용하고 저장 결과({ error })를 돌려준다.
export function useMemos(commit) {
  const commitRef = useRef(commit)
  useEffect(() => { commitRef.current = commit })
  // drafts[memoId] = { spaceId, content, status: 'pending' | 'failed' | 'invalid', error }
  const [drafts, setDrafts] = useState({})
  const [selected, setSelected] = useState({})

  const [autosave] = useState(() => createMemoAutosave({
    save(job) {
      let result
      try { result = commitRef.current((data) => applyMemoSave(data, job)) }
      catch (failure) { result = { error: failure.message } }
      setDrafts((previous) => {
        const current = previous[job.memoId]
        // 저장하는 사이 더 새로운 입력이 들어왔으면 그 초안을 건드리지 않는다.
        if (!current || current.content !== job.content) return previous
        if (result.error) return { ...previous, [job.memoId]: { ...current, status: 'failed', error: result.error } }
        const next = { ...previous }
        delete next[job.memoId]
        return next
      })
    },
  }))

  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') autosave.flush() }
    const flushAll = () => autosave.flush()
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flushAll)
    return () => { document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flushAll) }
  }, [autosave])

  function dropDrafts(predicate) {
    setDrafts((previous) => Object.fromEntries(Object.entries(previous).filter(([memoId, draft]) => !predicate(memoId, draft))))
  }

  return {
    drafts,
    selectedMemoId: (spaceId) => selected[spaceId],
    select: (spaceId, memoId) => setSelected((previous) => ({ ...previous, [spaceId]: memoId })),
    edit(spaceId, memoId, content) {
      try { validateMemoContent(content) }
      catch (failure) {
        // 한도를 넘긴 입력은 화면에 남기고 저장 예약만 취소한다.
        autosave.cancel(memoId)
        setDrafts((previous) => ({ ...previous, [memoId]: { spaceId, content, status: 'invalid', error: failure.message } }))
        return
      }
      setDrafts((previous) => ({ ...previous, [memoId]: { spaceId, content, status: 'pending', error: null } }))
      autosave.schedule(spaceId, memoId, content)
    },
    retry(spaceId, memoId) {
      const draft = drafts[memoId]
      if (!draft || draft.status === 'invalid') return
      autosave.schedule(spaceId, memoId, draft.content)
      autosave.flush(spaceId)
    },
    flush: (spaceId) => autosave.flush(spaceId),
    retryAll() {
      for (const [memoId, draft] of Object.entries(drafts)) if (draft.status === 'failed') autosave.schedule(draft.spaceId, memoId, draft.content)
      autosave.flush()
    },
    add(spaceId, color) {
      let memo
      const result = commitRef.current((data) => { const added = addMemo(data, spaceId, color); memo = added.memo; return added.data })
      setSelected((previous) => ({ ...previous, [spaceId]: memo.id }))
      return result
    },
    remove(spaceId, memoId) {
      autosave.cancel(memoId)
      dropDrafts((id) => id === memoId)
      return commitRef.current((data) => deleteMemo(data, spaceId, memoId))
    },
    // 공간 삭제 직전에 호출해 대기 중인 저장이 삭제된 공간을 건드리지 않게 한다.
    forgetSpace(spaceId) {
      autosave.cancelSpace(spaceId)
      dropDrafts((_, draft) => draft.spaceId === spaceId)
    },
    setColor: (spaceId, memoId, color) => commitRef.current((data) => setMemoColor(data, spaceId, memoId, color)),
    setSize: (spaceId, memoId, size) => commitRef.current((data) => setMemoSize(data, spaceId, memoId, size)),
    setView: (view) => commitRef.current((data) => setMemoView(data, view)),
  }
}
