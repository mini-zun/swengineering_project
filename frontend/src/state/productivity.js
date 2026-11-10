import { createId } from './id.js'
import { reduceWorkspace, validateName, normalizeUrl, validateDueDate, goalMinutes, elapsedMs } from '../lib/productivity.js'

export function focusState(data) {
  return data.focus ?? { activeSession: null, sessions: [], dailyGoalMinutes: 60, checkpoint: null }
}

// The team stores links/todos inside each space. Only the adapter uses the old
// reducer's flat view; UI and persisted data use the team's existing structure.
export function changeProductivity(data, action) {
  const now = action.now ?? Date.now()
  const focus = focusState(data)
  const space = data.spaces.find((item) => item.id === action.spaceId)
  if (!action.type.startsWith('focus/') && !space) throw new Error('대상 공간이 없어요.')
  const state = {
    spaces: data.spaces, activeSpaceId: data.activeSpaceId,
    links: (space?.links ?? []).map((item) => ({ ...item, spaceId: space.id })),
    todos: (space?.todos ?? []).map((item) => ({ ...item, spaceId: space.id })),
    activeSession: focus.activeSession, focusSessions: focus.sessions,
    dailyGoalMinutes: focus.dailyGoalMinutes,
  }
  const next = reduceWorkspace(state, { ...action, id: action.id ?? createId(), now })
  if (action.type.startsWith('focus/')) return {
    ...data,
    focus: { ...focus, activeSession: next.activeSession, sessions: next.focusSessions,
      dailyGoalMinutes: next.dailyGoalMinutes, checkpoint: now },
  }
  const field = action.type.startsWith('link/') ? 'links' : 'todos'
  return { ...data, spaces: data.spaces.map((item) => item.id !== space.id ? item : {
    ...item, [field]: next[field].map((entry) => {
      const nested = { ...entry }
      delete nested.spaceId
      return nested
    }),
  }) }
}

export function removeSpaceFocus(data, spaceId) {
  if (!data.focus) return data
  return { ...data, focus: { ...data.focus,
    activeSession: data.focus.activeSession?.spaceId === spaceId ? null : data.focus.activeSession,
    sessions: data.focus.sessions.filter((session) => session.spaceId !== spaceId),
  } }
}

export function validateProductivityItem(field, item) {
  if (field === 'links') {
    if (validateName(item.name, '사이트 이름', 40) !== item.name) throw new Error('바로가기 데이터가 올바르지 않아요.')
    // URL 표준화 차이는 손상이 아니다. 입력 원본을 변형하지 않고 복사본을 반환한다.
    return { ...item, url: normalizeUrl(item.url) }
  } else if (field === 'todos') {
    if (validateName(item.content, '할 일', 100) !== item.content || typeof item.done !== 'boolean') throw new Error('할 일 데이터가 올바르지 않아요.')
    validateDueDate(item.dueDate)
  }
  return item
}

export function validateFocus(data) {
  if (data.focus === undefined) return
  const focus = data.focus
  const fail = () => { throw new Error('집중 기록 데이터가 올바르지 않아요.') }
  if (!focus || !Array.isArray(focus.sessions) || !Object.hasOwn(focus, 'activeSession')) fail()
  if (focus.activeSession !== null && (typeof focus.activeSession !== 'object' || Array.isArray(focus.activeSession))) fail()
  goalMinutes(focus.dailyGoalMinutes)
  if (!Number.isFinite(focus.checkpoint) || focus.checkpoint < 0) fail()
  const ids = new Set()
  for (const session of [...focus.sessions, ...(focus.activeSession ? [focus.activeSession] : [])]) {
    if (!session || typeof session.id !== 'string' || !session.id || ids.has(session.id) || !data.spaces.some((space) => space.id === session.spaceId)) fail()
    ids.add(session.id)
    if (session.mode !== 'stopwatch' || !['running', 'paused', 'ended'].includes(session.status) || !Number.isFinite(session.startedAt) || session.startedAt < 0 || !Array.isArray(session.segments)) fail()
    let previous = session.startedAt
    for (const segment of session.segments) {
      if (!segment || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < previous || segment.end < segment.start) fail()
      previous = segment.end
    }
    if (session.status === 'running' ? !Number.isFinite(session.runningSince) || session.runningSince < previous : session.runningSince !== null) fail()
    if (session.status === 'ended' && (!Number.isFinite(session.endedAt) || session.endedAt < previous || session.focusSeconds !== Math.floor(elapsedMs(session) / 1000) || session.focusSeconds < 0)) fail()
  }
  if (focus.sessions.some((session) => session.status !== 'ended') || focus.activeSession?.status === 'ended') fail()
}
