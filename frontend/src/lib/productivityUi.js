export function preventImeSubmit(event) {
  if (
    event.key === 'Enter' &&
    (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
  )
    event.preventDefault()
}

export function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map((v) => String(v).padStart(2, '0'))
    .join(':')
}
