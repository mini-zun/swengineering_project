import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { createDefaultData, createSpace } from '../src/state/spaces.js'
import { addMemo, updateMemoContent, setMemoView, setMemoSize } from '../src/state/memos.js'
import { setSpaceTheme } from '../src/state/themes.js'
import { setWidgetSize, WIDGET_LABELS, widgetSize } from '../src/state/widgetSizes.js'
import { changeProductivity } from '../src/state/productivity.js'
import { addDday } from '../src/state/ddays.js'
import { THEME_CATALOG } from '../src/themes/catalog.js'
import { STORAGE_KEY } from '../src/storage/storage.js'

const themes = THEME_CATALOG.map(({ id }) => id)
assert.deepEqual(themes, ['basic', 'emotional', 'memo-board', 'sidebar-cork', 'retro-desktop', 'postit-board'])

// 브라우저/실제 사용자 저장소를 사용하지 않는다. 네이티브 모달·배치·픽셀 검증은 별도다.
function fixture(theme = 'basic') {
  let data = createDefaultData()
  const a = data.activeSpaceId
  data = createSpace(data, '검증 B')
  const b = data.activeSpaceId
  for (const [index, spaceId] of [a, b].entries()) {
    data = changeProductivity(data, { type: 'link/add', spaceId, name: `링크 ${index}`, url: 'https://example.com/', now: 1000 })
    data = changeProductivity(data, { type: 'todo/add', spaceId, content: `할 일 ${index}`, now: 1000 })
    const added = addMemo(data, spaceId)
    data = updateMemoContent(added.data, spaceId, added.memo.id, `메모 ${index}\n두 번째 줄`)
    for (const [themeIndex, themeId] of themes.entries()) {
      data = setWidgetSize(data, { spaceId, themeId, widgetId: 'todos', size: { width: 400 + themeIndex * 10 + index, height: 440 + index } })
      data = setMemoSize(data, spaceId, added.memo.id, index ? 'l' : 's', themeId)
      data = setMemoView(data, themeIndex % 2 ? 'board' : 'sheet', themeId)
    }
  }
  data = addDday(data, { title: '통합 검증', targetDate: '2026-12-31' })
  data = setSpaceTheme(setSpaceTheme(data, a, theme), b, 'postit-board')
  return { data: { ...data, activeSpaceId: a }, a, b }
}

function memoryStorage(data) {
  let raw = typeof data === 'string' ? data : JSON.stringify(data)
  return {
    fail: false, writes: 0,
    getItem(key) { assert.equal(key, STORAGE_KEY); return raw },
    setItem(key, value) {
      assert.equal(key, STORAGE_KEY)
      if (this.fail) throw new DOMException('Test quota', 'QuotaExceededError')
      this.writes++; raw = value
    },
    snapshot() { return JSON.parse(raw) },
    raw() { return raw },
  }
}

test('제공 테마 실제 App 통합 (모의 DOM)', async (t) => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://integration.test/', pretendToBeVisual: true })
  const { window } = dom
  const globals = {
    window, document: window.document, navigator: window.navigator,
    HTMLElement: window.HTMLElement, MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    ResizeObserver: class { observe() {} disconnect() {} },
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  window.HTMLElement.prototype.scrollIntoView = function () {}
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  window.HTMLDialogElement.prototype.close = function () { this.open = false }
  const { createElement, act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  let root
  let storage
  const q = (selector) => {
    const node = window.document.querySelector(selector)
    assert.ok(node, `요소가 있어야 함: ${selector}`)
    return node
  }
  const click = async (node) => { assert.ok(node); await act(async () => { node.click() }) }
  const input = async (node, value) => {
    await act(async () => {
      const prototype = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value)
      node.dispatchEvent(new window.Event('input', { bubbles: true }))
      node.dispatchEvent(new window.Event('change', { bubbles: true }))
    })
    assert.equal(node.value, value)
  }
  const submit = async (node) => { await act(async () => { node.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })) }) }
  const button = (text, scope = window.document) => {
    const node = [...scope.querySelectorAll('button')].find((item) => item.textContent.trim() === text)
    assert.ok(node, `버튼이 있어야 함: ${text}`)
    return node
  }
  const selectSpace = async (name) => click([...window.document.querySelectorAll('.space-tab')].find((node) => node.textContent === name))
  async function unmount() {
    if (!root) return
    // 실제 이탈 시 App이 사용하는 저장 경로를 마친 뒤 타이머·구독을 해제한다.
    await act(async () => { window.dispatchEvent(new window.Event('pagehide')) })
    await act(async () => root.unmount())
    root = null
  }
  async function mount(data, existingStorage) {
    await unmount()
    storage = existingStorage ?? memoryStorage(data)
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
    window.confirm = () => true
    const { default: App } = await server.ssrLoadModule('/src/App.jsx')
    root = createRoot(q('#root'))
    await act(async () => root.render(createElement(App)))
  }
  async function choose(id) {
    if (!window.document.querySelector('.theme-dialog')) await click(q('[data-theme-button]'))
    const index = themes.indexOf(id)
    await click(window.document.querySelectorAll('.theme-option')[index])
  }
  async function closeTheme() { await click(q('.theme-dialog .dialog-actions button')) }
  try {
    await t.test('30개 방향의 테마 전환에서 내용·설정·ID를 보존하고 재마운트로 선택을 복원한다', async () => {
      for (const from of themes) {
        for (const to of themes.filter((id) => id !== from)) {
          const { data, a, b } = fixture(from)
          await mount(data)
          assert.equal(window.document.documentElement.dataset.theme, from)
          await choose(to)
          const expected = setSpaceTheme(data, a, to)
          assert.deepEqual(storage.snapshot(), expected, `${from} → ${to}`)
          assert.equal(window.document.documentElement.dataset.theme, to)
          assert.equal(window.document.querySelectorAll('[data-widget]').length, 8)
          assert.equal(q('.memo-text').value, data.spaces[0].memos[0].content)
          assert.equal(q('[data-widget="todos"]').style.getPropertyValue('--widget-width'), `${data.layout[to].spaces[a].widgets.todos.width}px`)
          await closeTheme()
          assert.equal(window.document.activeElement, q('[data-theme-button]'))
          await click([...window.document.querySelectorAll('.space-tab')].find((node) => node.textContent === '검증 B'))
          assert.equal(storage.snapshot().activeSpaceId, b)
          assert.equal(q('.memo-text').value, data.spaces[1].memos[0].content)
          assert.equal(window.document.documentElement.dataset.theme, 'postit-board')
          await mount(null, storage)
          assert.equal(storage.snapshot().activeSpaceId, b)
          assert.equal(q('.memo-text').value, data.spaces[1].memos[0].content)
          assert.equal(window.document.documentElement.dataset.theme, 'postit-board')
          // 재접속 당시의 B뿐 아니라 변경한 A의 선택·화면 설정도 실제로 다시 읽는다.
          await selectSpace('기본 공간')
          assert.equal(storage.snapshot().activeSpaceId, a)
          assert.equal(window.document.documentElement.dataset.theme, to, `${from} → ${to} 재마운트 후 A`)
          assert.equal(q('[data-widget="todos"]').style.getPropertyValue('--widget-width'), `${data.layout[to].spaces[a].widgets.todos.width}px`)
          assert.equal(q('.memo-widget').dataset.view, data.layout[to].memo.view)
          assert.equal(q('.memo-card').dataset.size, data.layout[to].memo.sizes[data.spaces[0].memos[0].id])
          assert.equal(q('.memo-text').value, data.spaces[0].memos[0].content)
          assert.deepEqual(storage.snapshot(), expected)
        }
      }
    })

    await t.test('모든 테마에서 할 일 미제출 경고 취소는 입력·날짜·저장값을 보존한다', async () => {
      for (const theme of themes) {
        const { data } = fixture(theme)
        await mount(data)
        await input(q('.sc-todo-form input:not([type])'), '제출 전 한글 초안')
        await input(q('.sc-todo-form input[type="date"]'), '2026-12-25')
        let confirms = 0
        window.confirm = () => { confirms++; return false }
        await choose(themes.find((id) => id !== theme))
        assert.equal(confirms, 1)
        assert.equal(window.document.documentElement.dataset.theme, theme)
        assert.deepEqual(storage.snapshot(), data)
        assert.equal(q('.sc-todo-form input:not([type])').value, '제출 전 한글 초안')
        assert.equal(q('.sc-todo-form input[type="date"]').value, '2026-12-25')
        await closeTheme()
        await submit(q('.sc-todo-form'))
        assert.equal(q('.sc-todo-form input:not([type])').value, '')
        assert.equal(storage.snapshot().spaces[0].todos.at(-1).content, '제출 전 한글 초안')
        await choose(themes.find((id) => id !== theme))
        assert.equal(confirms, 1, '제출 완료 뒤에는 경고하지 않는다')
      }
    })

    await t.test('모든 테마에서 저장 실패를 알리고 대화상자 재시도로 최신 선택만 저장한다', async () => {
      for (const theme of themes) {
        const { data, a } = fixture(theme)
        await mount(data)
        const target = themes.find((id) => id !== theme)
        storage.fail = true
        await choose(target)
        assert.equal(window.document.documentElement.dataset.theme, target)
        assert.deepEqual(storage.snapshot(), data)
        assert.match(q('.theme-save-error').textContent, /저장하지 못했어요/)
        storage.fail = false
        await click(q('.theme-save-error button'))
        assert.deepEqual(storage.snapshot(), setSpaceTheme(data, a, target))
        assert.equal(q('.theme-save-error').textContent, '')
      }
    })

    await t.test('기한만 입력해도 경고하고 확인하면 전환하며 초안은 저장하지 않는다', async () => {
      for (const theme of themes) {
        const { data, a } = fixture(theme)
        await mount(data)
        await input(q('.sc-todo-form input[type="date"]'), '2026-12-25')
        let confirms = 0
        window.confirm = () => { confirms++; return true }
        const target = themes.find((id) => id !== theme)
        await choose(target)
        assert.equal(confirms, 1)
        assert.equal(window.document.documentElement.dataset.theme, target)
        assert.equal(q('.sc-todo-form input[type="date"]').value, '')
        assert.deepEqual(storage.snapshot(), setSpaceTheme(data, a, target))
      }
    })

    await t.test('메모·위젯 크기 실패 뒤 추가 편집과 전체 재시도는 최신 값과 항목 수를 보존한다', async () => {
      for (const theme of themes) {
        const { data } = fixture(theme)
        await mount(data)
        storage.fail = true
        await input(q('.memo-text'), '첫 실패 초안')
        await act(async () => window.dispatchEvent(new window.Event('pagehide')))
        assert.match(q('.memo-status').textContent, /저장하지 못했어요/)
        await input(q('.memo-text'), '최신 실패 초안\n덮어쓰지 않기')
        await click(q('[data-widget="todos"] .widget-size-reset'))
        assert.equal(q('[data-widget="todos"]').dataset.size, 'm')
        assert.match(q('.save-status').textContent, /저장하지 못했어요/)
        assert.deepEqual(storage.snapshot(), data)
        await act(async () => window.dispatchEvent(new window.Event('pagehide')))
        storage.fail = false
        await click(q('.save-status button'))
        assert.equal(storage.snapshot().spaces[0].memos[0].content, '최신 실패 초안\n덮어쓰지 않기')
        assert.equal(storage.snapshot().spaces[0].memos.length, 1)
        assert.equal(storage.snapshot().spaces[0].todos.length, 1)
        assert.equal(q('.memo-status').dataset.state, 'saved')
        assert.match(q('.save-status').textContent, /저장됨/)
        await mount(null, storage)
        assert.equal(q('.memo-text').value, '최신 실패 초안\n덮어쓰지 않기')
        assert.equal(q('[data-widget="todos"]').dataset.size, 'm')
      }
    })

    await t.test('모든 테마에서 이름 변경은 ID·내용·설정을 유지하고 새 공간은 빈 기본 테마다', async () => {
      for (const theme of themes) {
        const { data, a } = fixture(theme)
        await mount(data)
        await click(button('이름 변경', q('.space-actions')))
        await input(q('#space-name'), '이름 변경 한글😀')
        await submit(q('dialog form'))
        const renamed = storage.snapshot()
        assert.equal(renamed.activeSpaceId, a)
        assert.deepEqual(renamed, { ...data, spaces: data.spaces.map((space) => space.id === a ? { ...space, name: '이름 변경 한글😀' } : space) })
        await click(button('+ 새 공간', q('.space-actions')))
        await input(q('#space-name'), '새 빈 공간')
        await submit(q('dialog form'))
        const created = storage.snapshot()
        const space = created.spaces.at(-1)
        assert.equal(created.activeSpaceId, space.id)
        assert.equal(window.document.documentElement.dataset.theme, 'basic')
        assert.deepEqual({ ...space, id: null }, { id: null, name: '새 빈 공간', quote: '', links: [], todos: [], memos: [] })
        assert.deepEqual(created.spaces.slice(0, 2), renamed.spaces)
        assert.deepEqual(created.layout, renamed.layout)
        assert.deepEqual(created.spaceThemes, renamed.spaceThemes)
      }
    })

    await t.test('모든 테마의 메모 대기 저장·문구 초안·실행 중 집중은 전환 뒤에도 유지한다', async () => {
      for (const theme of themes) {
        const { data, a } = fixture(theme)
        await mount(data)
        await input(q('.memo-text'), `즉시 전환 ${theme}\n공백  유지`)
        await click(q('.quote-edit'))
        await input(q('#quote-input'), `문구 초안 ${theme}`)
        await click([...window.document.querySelectorAll('button')].find((node) => node.textContent.trim() === '집중 시작'))
        const focus = storage.snapshot().focus
        await choose(themes.find((id) => id !== theme))
        assert.equal(storage.snapshot().spaces[0].memos[0].content, `즉시 전환 ${theme}\n공백  유지`)
        assert.equal(q('.memo-text').value, `즉시 전환 ${theme}\n공백  유지`)
        assert.equal(q('#quote-input').value, `문구 초안 ${theme}`)
        assert.deepEqual(storage.snapshot().focus, focus)
        assert.equal(focus.activeSession.spaceId, a)
        assert.equal(focus.activeSession.status, 'running')
        await closeTheme()
        await click([...window.document.querySelectorAll('button')].find((node) => node.textContent.trim() === '일시정지'))
        const paused = storage.snapshot().focus
        assert.equal(paused.activeSession.status, 'paused')
        await choose(theme)
        assert.deepEqual(storage.snapshot().focus, paused)
        await mount(null, storage)
        assert.equal(storage.snapshot().focus.activeSession.status, 'paused')
        assert.ok([...window.document.querySelectorAll('button')].some((node) => node.textContent.trim() === '이어서 집중'))
      }
    })

    await t.test('모든 테마의 8개 위젯 키보드·포인터 이벤트는 해당 설정만 저장하고 취소는 저장하지 않는다', async () => {
      // jsdom에는 레이아웃 엔진이 없다. 알려진 치수로 이벤트→저장 연결만 확인한다.
      for (const theme of themes) {
        const { data, a, b } = fixture(theme)
        await mount(data)
        for (const id of Object.keys(WIDGET_LABELS)) {
          const node = q(`[data-widget="${id}"]`)
          const handle = node.querySelector('.widget-resize-handle')
          const parent = node.parentElement
          Object.defineProperty(parent, 'clientWidth', { configurable: true, value: 1200 })
          parent.style.padding = '0px'
          const maxWidth = Math.min(1200, parseInt(node.style.getPropertyValue('--widget-max-width')))
          const width = Math.min(500, maxWidth - 60)
          const maxHeight = parseInt(node.style.getPropertyValue('--widget-max-height'))
          const height = Math.max(parseInt(node.style.getPropertyValue('--widget-min-height')), Math.min(500, maxHeight - 60))
          node.getBoundingClientRect = () => ({ width, height })
          const key = async (key, shiftKey = false) => act(async () => {
            handle.dispatchEvent(new window.KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }))
          })
          const before = storage.snapshot()
          await key('ArrowRight')
          const after = storage.snapshot()
          assert.equal(widgetSize(after, a, id, theme).width, width + 10)
          assert.deepEqual(after.spaces, before.spaces)
          assert.deepEqual(after.layout[theme].spaces[b], before.layout[theme].spaces[b])
          for (const other of themes.filter((value) => value !== theme)) assert.deepEqual(after.layout[other], before.layout[other])
          await key('ArrowDown', true)
          assert.equal(widgetSize(storage.snapshot(), a, id, theme).height, Math.min(maxHeight, height + 50), `${theme}/${id} Shift 방향키`)

          const captured = new Set()
          handle.setPointerCapture = (pointerId) => captured.add(pointerId)
          handle.hasPointerCapture = (pointerId) => captured.has(pointerId)
          handle.releasePointerCapture = (pointerId) => captured.delete(pointerId)
          const pointer = async (type, x, y) => act(async () => {
            const event = new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y })
            Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } })
            handle.dispatchEvent(event)
          })
          for (const cancel of ['Escape', 'pointercancel']) {
            const writes = storage.writes
            await pointer('pointerdown', 0, 0)
            await pointer('pointermove', 20, 20)
            assert.equal(node.dataset.resizing, 'true')
            if (cancel === 'Escape') await key('Escape')
            else await pointer('pointercancel', 20, 20)
            await pointer('pointerup', 20, 20)
            assert.equal(node.dataset.resizing, 'false')
            assert.equal(storage.writes, writes)
          }
          const writes = storage.writes
          await pointer('pointerdown', 0, 0)
          await pointer('pointermove', 20, 20)
          await pointer('pointerup', 20, 20)
          assert.equal(storage.writes, writes + 1)
          // 기본 테마의 시계·문구는 가운데를 유지해 가로 이동량의 두 배만큼 커져야 한다.
          const widthDelta = theme === 'basic' && ['clock', 'quote'].includes(id) ? 40 : 20
          assert.equal(widgetSize(storage.snapshot(), a, id, theme).width, Math.min(maxWidth, width + widthDelta), `${theme}/${id} 드래그 너비`)
          assert.equal(widgetSize(storage.snapshot(), a, id, theme).height, Math.min(maxHeight, height + 20))
          await pointer('pointerdown', 0, 0)
          await pointer('pointermove', 10000, 20)
          await pointer('pointerup', 10000, 20)
          assert.equal(widgetSize(storage.snapshot(), a, id, theme).width, maxWidth, `${theme}/${id} 드래그 최대 너비`)
          await click(q(`[data-widget="${id}"] .widget-size-reset`))
          assert.equal(widgetSize(storage.snapshot(), a, id, theme), 'm')
        }
      }
    })

    await t.test('모든 테마에서 빠른 A→B→A와 삭제가 대기 중 메모를 다른 공간에 쓰거나 되살리지 않는다', async () => {
      for (const theme of themes) {
        const { data, a, b } = fixture(theme)
        await mount(data)
        await input(q('.memo-text'), 'A 마지막 초안')
        await selectSpace('검증 B')
        assert.equal(storage.snapshot().spaces[0].memos[0].content, 'A 마지막 초안')
        await input(q('.memo-text'), 'B 마지막 초안')
        await selectSpace('기본 공간')
        assert.equal(q('.memo-text').value, 'A 마지막 초안')
        assert.equal(storage.snapshot().spaces[1].memos[0].content, 'B 마지막 초안')
        await input(q('.memo-text'), '삭제 직전 대기 초안')
        await click(button('삭제', q('.space-actions')))
        await click(button('취소', q('dialog')))
        assert.equal(q('.memo-text').value, '삭제 직전 대기 초안')
        await click(button('삭제', q('.space-actions')))
        await click(button('삭제', q('dialog')))
        await act(async () => window.dispatchEvent(new window.Event('pagehide')))
        const saved = storage.snapshot()
        assert.equal(saved.spaces.length, 1)
        assert.equal(saved.spaces[0].id, b)
        assert.equal(saved.spaces[0].memos[0].content, 'B 마지막 초안')
        assert.equal(saved.activeSpaceId, b)
        assert.equal(saved.spaceThemes[a], undefined)
        assert.ok(button('삭제', q('.space-actions')).disabled)
        for (const id of themes) {
          assert.equal(saved.layout[id].spaces[a], undefined)
          assert.equal(saved.layout[id].memo.sizes[data.spaces[0].memos[0].id], undefined)
          assert.deepEqual(saved.layout[id].spaces[b], data.layout[id].spaces[b])
        }
        await mount(null, storage)
        assert.equal(storage.snapshot().spaces.length, 1)
      }
    })

    await t.test('실행 중 재마운트는 복원 선택을 요구하고 계속·저장 시각 종료 정책을 따른다', async () => {
      for (const theme of themes) {
        for (const action of ['continue', 'stop']) {
          const { data, a } = fixture(theme)
          await mount(data)
          await click(button('집중 시작'))
          const id = storage.snapshot().focus.activeSession.id
          await mount(null, storage)
          assert.match(q('dialog').textContent, /진행 중이던 집중/)
          await click(button(action === 'continue' ? '경과 시간 포함해 계속' : '저장 시각에 종료', q('dialog')))
          const focus = storage.snapshot().focus
          assert.equal(window.document.querySelector('dialog'), null)
          if (action === 'continue') {
            assert.equal(focus.activeSession.id, id)
            assert.equal(focus.activeSession.spaceId, a)
            assert.equal(focus.activeSession.status, 'running')
          } else {
            assert.equal(focus.activeSession, null)
            assert.equal(focus.sessions.at(-1).id, id)
            assert.equal(focus.sessions.at(-1).spaceId, a)
            assert.equal(focus.sessions.at(-1).status, 'ended')
          }
        }
      }
    })

    await t.test('파손된 저장 원본은 App 재시도 뒤에도 덮어쓰지 않는다', async () => {
      await mount('{broken json')
      assert.match(q('main').textContent, /원본 보호/)
      await click(q('main button'))
      assert.equal(storage.raw(), '{broken json')
      assert.equal(storage.writes, 0)
      assert.equal(window.document.querySelector('[data-theme-button]'), null)
    })
  } finally {
    await unmount()
    await server.close()
    window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
