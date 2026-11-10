import { characterCount as charCount } from './text.js'
export { characterCount as charCount } from './text.js'
export { toDateKey as dateKey } from './date.js'

export const HISTORY_MIN_SECONDS = 60
export const FOCUS_CHECKPOINT_INTERVAL_MS = 30_000

export function validateName(value, label, max) {
  if (typeof value !== 'string') throw new Error(`${label}을 입력해주세요.`)
  const text = value.trim()
  if (!text || charCount(text) > max)
    throw new Error(`${label}은 공백을 제외하고 1~${max}자로 입력해주세요.`)
  return text
}

export function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('사이트 주소를 입력해주세요.')
  const text = value.trim()
  if (charCount(text) > 2048)
    throw new Error('주소는 2,048자 이내로 입력해주세요.')
  if (/\s/.test(text) || text.startsWith('//') || text.includes('\\'))
    throw new Error('올바른 사이트 주소를 입력해주세요.')
  // Host:port is an address, whereas a declared scheme must be checked as-is.
  const hostPort = /^[\w.-]+:\d+(?:[/?#]|$)/.test(text)
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(text) && !hostPort
  let url
  try {
    url = new URL(hasScheme ? text : `https://${text}`)
  } catch {
    throw new Error('사이트 주소 형식을 확인해주세요.')
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    (hasScheme && !/^https?:\/\//i.test(text))
  ) {
    throw new Error('http:// 또는 https:// 사이트 주소만 등록할 수 있어요.')
  }
  if (
    url.hostname !== 'localhost' &&
    !url.hostname.includes('.') &&
    !url.hostname.startsWith('[')
  )
    throw new Error('주소의 도메인을 확인해주세요. 예: example.com')
  return url.href
}

export function validateDueDate(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('기한을 올바른 날짜로 입력해주세요.')
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    year < 1900 ||
    year > 9999
  )
    throw new Error('실제로 존재하는 날짜를 입력해주세요.')
  return value
}

export function goalMinutes(value) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > 1440)
    throw new Error('하루 목표는 1~1,440분으로 입력해주세요.')
  return number
}

export function elapsedMs(session, now = Date.now()) {
  if (!session) return 0
  return (
    session.segments.reduce(
      (sum, segment) => sum + Math.max(0, segment.end - segment.start),
      0,
    ) +
    (session.status === 'running' ? Math.max(0, now - session.runningSince) : 0)
  )
}

function closeSegment(session, now) {
  if (session.status !== 'running') return session
  const end = Math.max(now, session.runningSince)
  return {
    ...session,
    status: 'paused',
    runningSince: null,
    segments: [...session.segments, { start: session.runningSince, end }],
  }
}

export function focusForDay(sessions, activeSession, day, now = Date.now()) {
  const [year, month, date] = day.split('-').map(Number)
  const from = new Date(year, month - 1, date).getTime(),
    to = new Date(year, month - 1, date + 1).getTime()
  return [...sessions, ...(activeSession ? [activeSession] : [])].reduce(
    (sum, session) => {
      const segments = [...session.segments]
      if (session.status === 'running')
        segments.push({
          start: session.runningSince,
          end: Math.max(now, session.runningSince),
        })
      return (
        sum +
        segments.reduce(
          (total, segment) =>
            total +
            Math.max(
              0,
              Math.min(to, segment.end) - Math.max(from, segment.start),
            ),
          0,
        )
      )
    },
    0,
  )
}

export function reduceWorkspace(state, action) {
  const now = action.now ?? Date.now(),
    stamp = new Date(now).toISOString()
  const requireSpace = () => {
    if (!state.spaces.some((space) => space.id === action.spaceId))
      throw new Error('대상 공간이 없어요.')
  }
  const update = (key, id, transform) => {
    requireSpace()
    if (
      !state[key].some(
        (item) => item.id === id && item.spaceId === action.spaceId,
      )
    )
      throw new Error('대상 항목을 찾을 수 없어요.')
    return {
      ...state,
      [key]: state[key].map((item) =>
        item.id === id && item.spaceId === action.spaceId
          ? transform(item)
          : item,
      ),
    }
  }
  switch (action.type) {
    case 'space/select':
      requireSpace()
      return { ...state, activeSpaceId: action.spaceId }
    case 'link/add':
      requireSpace()
      return {
        ...state,
        links: [
          ...state.links,
          {
            id: action.id,
            spaceId: action.spaceId,
            name: validateName(action.name, '사이트 이름', 40),
            url: normalizeUrl(action.url),
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
      }
    case 'link/edit':
      return update('links', action.id, (item) => ({
        ...item,
        name: validateName(action.name, '사이트 이름', 40),
        url: normalizeUrl(action.url),
        updatedAt: stamp,
      }))
    case 'link/delete':
      requireSpace()
      return {
        ...state,
        links: state.links.filter(
          (item) => item.id !== action.id || item.spaceId !== action.spaceId,
        ),
      }
    case 'todo/add':
      requireSpace()
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: action.id,
            spaceId: action.spaceId,
            content: validateName(action.content, '할 일', 100),
            dueDate: validateDueDate(action.dueDate),
            done: false,
            completedAt: null,
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
      }
    case 'todo/toggle':
      return update('todos', action.id, (item) => ({
        ...item,
        done: action.done ?? !item.done,
        completedAt: (action.done ?? !item.done) ? stamp : null,
        updatedAt: stamp,
      }))
    case 'todo/edit':
      return update('todos', action.id, (item) => ({
        ...item,
        content: validateName(action.content, '할 일', 100),
        dueDate: validateDueDate(action.dueDate),
        updatedAt: stamp,
      }))
    case 'todo/delete':
      requireSpace()
      return {
        ...state,
        todos: state.todos.filter(
          (item) => item.id !== action.id || item.spaceId !== action.spaceId,
        ),
      }
    case 'todo/clear':
      requireSpace()
      return {
        ...state,
        todos: state.todos.filter(
          (item) => item.spaceId !== action.spaceId || !item.done,
        ),
      }
    case 'focus/goal':
      return { ...state, dailyGoalMinutes: goalMinutes(action.minutes) }
    case 'focus/start':
      requireSpace()
      if (state.activeSession)
        throw new Error('기존 집중을 종료한 뒤 새로 시작해주세요.')
      return {
        ...state,
        activeSession: {
          id: action.id,
          spaceId: action.spaceId,
          mode: 'stopwatch',
          status: 'running',
          startedAt: now,
          runningSince: now,
          segments: [],
          endedAt: null,
          createdAt: stamp,
          updatedAt: stamp,
        },
      }
    case 'focus/pause':
      return !state.activeSession || state.activeSession.status !== 'running'
        ? state
        : {
            ...state,
            activeSession: {
              ...closeSegment(state.activeSession, now),
              updatedAt: stamp,
            },
          }
    case 'focus/resume':
      return !state.activeSession || state.activeSession.status !== 'paused'
        ? state
        : {
            ...state,
            activeSession: {
              ...state.activeSession,
              status: 'running',
              runningSince: now,
              updatedAt: stamp,
            },
          }
    case 'focus/stop': {
      if (!state.activeSession) return state
      const closed = closeSegment(state.activeSession, now)
      const session = {
        ...closed,
        status: 'ended',
        endedAt: Math.max(
          now,
          closed.startedAt,
          ...closed.segments.map((s) => s.end),
        ),
        focusSeconds: Math.floor(elapsedMs(closed, now) / 1000),
        updatedAt: stamp,
      }
      return {
        ...state,
        activeSession: null,
        // 목록 표시 기준과 실제 누적을 분리한다. 1분 미만도 누적은 보존한다.
        focusSessions: [...state.focusSessions, session],
      }
    }
    default:
      throw new Error('알 수 없는 변경 요청이에요.')
  }
}

