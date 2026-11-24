import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/layouts/PostitBoardLayout.css', import.meta.url), 'utf8')

function declarations(selector) {
  const start = css.indexOf(selector)
  assert.ok(start >= 0, `전용 상태 선택자 누락: ${selector}`)
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
}

function luminance(hex) {
  const values = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}

function contrast(a, b) {
  assert.match(a, /^#[0-9a-f]{6}$/i)
  assert.match(b, /^#[0-9a-f]{6}$/i)
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

// 선언 색상 회귀 검사다. 브라우저의 최종 computed style 확인과 구분한다.
test('포스트잇 목표 변경 버튼은 hover·키보드 초점에 배경과 글자색을 함께 지정한다', () => {
  for (const state of ['hover', 'focus-visible']) {
    const rule = declarations(`.postit-board-layout .widget-timer .sc-daily-goal > .sc-text-button:${state}:not(:disabled)`)
    const background = rule.match(/background:\s*(#[0-9a-f]{6})/i)?.[1]
    const foreground = rule.match(/(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i)?.[1]
    assert.ok(background && foreground, '기본 흰 글자색이나 전역 hover 배경을 상속하면 안 된다')
    assert.ok(contrast(background, foreground) >= 4.5)
  }
})

test('포스트잇 집중 안내 summary 초점선은 어두운 카드에서 구분되고 대화상자 토큰은 유지된다', () => {
  const rule = declarations('.postit-board-layout .widget-timer .focus-details > summary:focus-visible')
  const outline = rule.match(/outline:\s*(\d+)px\s+solid\s+(#[0-9a-f]{6})/i)
  const background = declarations('.postit-board-layout {').match(/--pb-dark:\s*(#[0-9a-f]{6})/i)?.[1]
  assert.ok(outline && background)
  assert.ok(Number(outline[1]) >= 3)
  assert.ok(contrast(outline[2], background) >= 3)
  const root = declarations(':root[data-theme="postit-board"] {')
  const dialog = declarations('.postit-board-layout .widget-timer .sc-dialog {')
  const rootAccent = root.match(/--color-accent:\s*(#[0-9a-f]{6})/i)?.[1]
  const dialogAccent = dialog.match(/--sc-accent:\s*(#[0-9a-f]{6})/i)?.[1]
  const surface = root.match(/--color-surface:\s*(#[0-9a-f]{6})/i)?.[1]
  assert.ok(rootAccent && dialogAccent && surface)
  assert.equal(dialogAccent, rootAccent)
  assert.ok(contrast(dialogAccent, surface) >= 3)
})
