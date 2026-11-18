import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function luminance(hex) {
  const digits = hex.slice(1)
  const expanded = digits.length === 3 ? Array.from(digits, (part) => part + part).join('') : digits
  const values = expanded.match(/../g).map((part) => parseInt(part, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}

test('레이아웃 밖 레트로 테마 선택창의 기본·hover 버튼 색은 읽을 수 있는 대비를 유지한다', () => {
  const css = readFileSync(new URL('../src/layouts/RetroDesktopLayout.css', import.meta.url), 'utf8')
  // 정적 색상 회귀 검사다. 실제 브라우저의 최종 cascade·초점·화면 검증은 별도로 수행한다.
  for (const suffix of ['', ':hover:not(:disabled)']) {
    const selector = `:root[data-theme="retro-desktop"] .theme-dialog button.primary${suffix}`
    const start = css.indexOf(`${selector} {`)
    assert.ok(start >= 0, '레이아웃 밖 선택창에도 명시적인 버튼 색을 제공해야 한다')
    const declarations = css.slice(start, css.indexOf('}', start))
    const background = declarations.match(/background:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})/i)?.[1]
    const foreground = declarations.match(/(?:\s|;)color:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})/i)?.[1]
    assert.ok(background && foreground)
    const values = [luminance(background), luminance(foreground)].sort((a, b) => b - a)
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, '일반 크기 버튼 글자 대비 4.5:1 이상')
  }
})
