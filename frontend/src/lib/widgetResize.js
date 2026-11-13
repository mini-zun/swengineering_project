// 화면에 맞춘 제한은 표시·사용자 조절에만 적용하고 저장된 원래 크기를 덮어쓰지 않는다.
export function constrainWidgetSize(size, limits, availableWidth) {
  const maxWidth = Math.max(1, Math.min(limits.maxWidth, availableWidth))
  return {
    width: Math.round(Math.max(Math.min(limits.minWidth, maxWidth), Math.min(maxWidth, size.width))),
    height: Math.round(Math.max(limits.minHeight, Math.min(limits.maxHeight, size.height))),
  }
}

export function dragWidgetSize(start, point, limits, availableWidth, centered = false) {
  const dx = Math.abs(point.x - start.x) > 2 ? point.x - start.x : 0
  const dy = Math.abs(point.y - start.y) > 2 ? point.y - start.y : 0
  return constrainWidgetSize({
    width: start.width + dx * (centered ? 2 : 1),
    height: start.height + dy,
  }, limits, availableWidth)
}

// 표시 크기와 저장 설정을 구분한다. 조절하지 않은 축은 원래 픽셀값·반응형 기본값을 유지한다.
export function resizedWidgetSetting(saved, before, after) {
  const widthChanged = Math.round(before.width) !== after.width
  const heightChanged = Math.round(before.height) !== after.height
  if (!widthChanged && !heightChanged) return null
  return {
    width: widthChanged ? after.width : typeof saved === 'object' ? saved.width : saved,
    height: heightChanged ? after.height : typeof saved === 'object' ? saved.height : 'auto',
  }
}

export function keyboardWidgetSize(size, key, step, limits, availableWidth) {
  const directions = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
  const direction = directions[key]
  return direction ? constrainWidgetSize({ width: size.width + direction[0], height: size.height + direction[1] }, limits, availableWidth) : null
}
