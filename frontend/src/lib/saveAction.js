// commit은 실패해도 메모리에 변경을 반영한다. 다음 제출은 변경을 반복하지
// 않고 같은 최신 상태의 영속화만 재시도해야 한다.
export async function runSaveAction(action, { retryOnly = false, onRetry } = {}) {
  if (retryOnly && !onRetry) return {
    error: '변경 내용은 메모리에 남아 있어요. 전체 저장 재시도 버튼을 눌러 주세요.',
    retryOnly: true,
  }
  try {
    const result = await (retryOnly ? onRetry() : action())
    return result?.error
      ? { error: result.error, retryOnly: true }
      : { error: '', retryOnly: false }
  } catch (error) {
    return { error: error.message || '저장하지 못했어요.', retryOnly }
  }
}
