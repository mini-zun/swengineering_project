import { useRef, useState } from 'react'
import { runSaveAction } from '../lib/saveAction.js'

export function useSaveAction(onRetry) {
  const [state, setState] = useState({ error: '', retryOnly: false, busy: false })
  const pending = useRef(false)
  const busy = useRef(false)
  const completion = useRef(null)

  async function run(action, onSuccess) {
    if (busy.current) return
    busy.current = true
    setState((current) => ({ ...current, error: '', busy: true }))
    try {
      if (!pending.current) completion.current = onSuccess
      const result = await runSaveAction(action, { retryOnly: pending.current, onRetry })
      pending.current = result.retryOnly
      setState({ ...result, busy: false })
      if (!result.error) completion.current?.()
      if (!result.retryOnly) completion.current = null
      return result
    } finally {
      busy.current = false
    }
  }

  return { ...state, run }
}
