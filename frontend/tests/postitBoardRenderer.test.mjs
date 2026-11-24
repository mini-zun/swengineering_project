import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { createDefaultData } from '../src/state/spaces.js'
import { setSpaceTheme } from '../src/state/themes.js'
import { themeOptions } from '../src/themes/catalog.js'

test('포스트잇은 기존 5개 테마를 보존하며 공통 슬롯·시계·달력과 저장 크기를 연결한다', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const { THEME_RENDERERS, AVAILABLE_THEME_IDS } = await server.ssrLoadModule('/src/themes/renderers.js')
    assert.deepEqual([...AVAILABLE_THEME_IDS].sort(), ['basic', 'emotional', 'memo-board', 'postit-board', 'retro-desktop', 'sidebar-cork'])
    const data = createDefaultData()
    const options = themeOptions(setSpaceTheme(data, data.activeSpaceId, 'postit-board'), data.activeSpaceId, AVAILABLE_THEME_IDS)
    assert.equal(options.displayedId, 'postit-board')
    assert.equal(options.fallback, false)
    assert.ok(options.options.every((option) => option.available))
    function marker(id) { return createElement('span', { 'data-slot': id }) }
    function Clock({ variant, hour12 }) { return createElement('span', { 'data-slot': 'clock', 'data-variant': variant, 'data-hour12': hour12 }) }
    function Calendar({ variant }) { return createElement('span', { 'data-slot': 'calendar', 'data-variant': variant }) }
    const slots = Object.fromEntries(['links', 'todos', 'memos', 'timer', 'dday'].map((id) => [id, marker(id)]))
    slots.clock = createElement(Clock)
    slots.calendar = createElement(Calendar)
    const html = renderToStaticMarkup(createElement(THEME_RENDERERS['postit-board'], {
      space: { id: data.activeSpaceId, name: '<공부>' }, themeId: 'postit-board', slots,
      tabs: marker('tabs'), themeControl: marker('themeControl'), quote: marker('quote'), status: marker('status'),
      widgetSizes: { memos: { width: 480, height: 600 } }, onWidgetSizeChange() {},
    }))
    for (const id of [...Object.keys(slots), 'quote', 'tabs', 'themeControl', 'status']) {
      assert.equal(html.split(`data-slot="${id}"`).length - 1, 1, id)
    }
    assert.equal((html.match(/data-widget=/g) ?? []).length, 8)
    assert.match(html, /data-slot="clock" data-variant="compact" data-hour12="true"/)
    assert.match(html, /data-slot="calendar" data-variant="month"/)
    assert.match(html, /--widget-width:480px;--widget-height:600px/)
    assert.match(html, /aria-label="&lt;공부&gt; 공간"/)
    assert.match(html, /href="#main"/)
  } finally { await server.close() }
})
