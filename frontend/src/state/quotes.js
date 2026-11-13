export function updateQuote(data, spaceId, content) {
  if (typeof content !== 'string') throw new Error('문구 내용이 올바르지 않아요.')
  if (!data.spaces.some((space) => space.id === spaceId)) throw new Error('공간을 찾을 수 없어요.')
  return { ...data, spaces: data.spaces.map((space) => space.id === spaceId ? { ...space, quote: content } : space) }
}

// 다른 컴포넌트의 재시도로 전체 저장이 성공해도, 실제 기록된 실패 초안만 정리한다.
export function settleQuoteDrafts(drafts, data) {
  return Object.fromEntries(Object.entries(drafts).filter(([spaceId, draft]) => {
    const space = data.spaces.find((item) => item.id === spaceId)
    return space && !(draft.error && draft.content === space.quote)
  }))
}
