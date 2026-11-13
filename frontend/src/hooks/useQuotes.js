import { useState } from 'react'
import { editQuoteDraft, saveQuote, settleQuoteDrafts } from '../state/quotes.js'

export function useQuotes(commit) {
  // 문구는 명시적으로 저장한다. 공간 전환 시 초안은 메모리에만 보관한다.
  const [drafts, setDrafts] = useState({})
  function discard(spaceId) {
    setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== spaceId)))
  }
  return {
    drafts,
    edit: (spaceId, content) => setDrafts((current) => editQuoteDraft(current, spaceId, content)),
    discard,
    save(spaceId) {
      const draft = drafts[spaceId]
      if (!draft) return
      const result = saveQuote(commit, spaceId, draft.content)
      if (!result.error) discard(spaceId)
      else setDrafts((current) => ({ ...current, [spaceId]: { ...draft, error: result.error } }))
    },
    markSaved: (data) => setDrafts((current) => settleQuoteDrafts(current, data)),
  }
}
