// 화면에 맞춘 제한은 표시·사용자 조절에만 적용하고 저장된 원래 크기를 덮어쓰지 않는다.
export function constrainWidgetSize(size, limits, availableWidth) {
  const maxWidth = Math.max(1, Math.min(limits.maxWidth, availableWidth))
  return {
    width: Math.round(Math.max(Math.min(limits.minWidth, maxWidth), Math.min(maxWidth, size.width))),
    height: Math.round(Math.max(limits.minHeight, Math.min(limits.maxHeight, size.height))),
  }
}

export function dragWidgetSize(start, point, limits, availableWidth, centered = false) {
  return constrainWidgetSize({
    width: start.width + (point.x - start.x) * (centered ? 2 : 1),
    height: start.height + point.y - start.y,
  }, limits, availableWidth)
}

export function keyboardWidgetSize(size, key, step, limits, availableWidth) {
  const directions = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
  const direction = directions[key]
  return direction ? constrainWidgetSize({ width: size.width + direction[0], height: size.height + direction[1] }, limits, availableWidth) : null
}
