import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

// 실제 JSX와 등록표를 로드해 선택 가능 여부 및 공통 slot 연결 누락을 검사한다.
test('코르크 렌더러는 공통 8개 영역과 공간·테마·저장 컨트롤을 한 번씩 연결한다', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { THEME_RENDERERS, AVAILABLE_THEME_IDS } = await server.ssrLoadModule('/src/themes/renderers.js')
    assert.ok(AVAILABLE_THEME_IDS.includes('sidebar-cork'))
    function marker(id) { return createElement('span', { 'data-slot': id }, id) }
    function Clock({ variant }) { return createElement('span', { 'data-slot': 'clock', 'data-variant': variant }) }
    function Calendar({ variant }) { return createElement('span', { 'data-slot': 'calendar', 'data-variant': variant }) }
    const slots = Object.fromEntries(['links', 'todos', 'memos', 'timer', 'dday'].map((id) => [id, marker(id)]))
    slots.clock = createElement(Clock)
    slots.calendar = createElement(Calendar)
    const html = renderToStaticMarkup(createElement(THEME_RENDERERS['sidebar-cork'], {
      space: { id: 'test-a', name: '<공간 A>' }, themeId: 'sidebar-cork',
      tabs: marker('tabs'), themeControl: marker('themeControl'), quote: marker('quote'), status: marker('status'), slots,
      widgetSizes: { todos: { width: 430, height: 520 } }, onWidgetSizeChange() {},
    }))
    for (const id of [...Object.keys(slots), 'quote', 'tabs', 'themeControl', 'status']) {
      assert.equal(html.split(`data-slot="${id}"`).length - 1, 1, `${id}는 한 번만 렌더해야 한다`)
    }
    assert.equal((html.match(/data-widget=/g) ?? []).length, 8)
    assert.match(html, /data-slot="clock" data-variant="compact"/)
    assert.match(html, /data-slot="calendar" data-variant="month"/)
    assert.match(html, /--widget-width:430px;--widget-height:520px/)
    assert.match(html, /aria-label="&lt;공간 A&gt; 공간"/)
    assert.match(html, /href="#main"/)
  } finally { await server.close() }
})
