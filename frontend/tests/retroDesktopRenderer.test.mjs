import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

test('레트로 데스크톱는 공통 내용을 한 번씩 연결하고 실제 테마별 크기를 전달한다', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { THEME_RENDERERS, AVAILABLE_THEME_IDS } = await server.ssrLoadModule('/src/themes/renderers.js')
    function marker(id) { return createElement('span', { 'data-test-slot': id }) }
    function VariantMarker({ id, variant }) { return createElement('span', { 'data-test-slot': id, 'data-variant': variant }) }
    for (const [themeId, calendarVariant] of [['retro-desktop', 'month']]) {
      assert.ok(AVAILABLE_THEME_IDS.includes(themeId))
      const slots = Object.fromEntries(['links', 'todos', 'memos', 'timer', 'dday'].map((id) => [id, marker(id)]))
      slots.clock = createElement(VariantMarker, { id: 'clock' })
      slots.calendar = createElement(VariantMarker, { id: 'calendar' })
      const html = renderToStaticMarkup(createElement(THEME_RENDERERS[themeId], {
        space: { id: 'a', name: '<공부>' }, themeId, slots,
        tabs: marker('tabs'), quote: marker('quote'), status: marker('status'), themeControl: marker('themeControl'),
        widgetSizes: { memos: { width: 480, height: 600 } }, onWidgetSizeChange() {},
      }))
      for (const id of [...Object.keys(slots), 'tabs', 'quote', 'status', 'themeControl']) {
        assert.equal(html.split(`data-test-slot="${id}"`).length - 1, 1, `${themeId}: ${id}`)
      }
      assert.equal((html.match(/data-widget=/g) ?? []).length, 8)
      assert.match(html, new RegExp(`data-test-slot="calendar" data-variant="${calendarVariant}"`))
      assert.match(html, /data-test-slot="clock" data-variant="compact"/)
      assert.match(html, /--widget-width:480px;--widget-height:600px/)
      assert.match(html, /aria-label="&lt;공부&gt; 공간"/)
    }
  } finally { await server.close() }
})
