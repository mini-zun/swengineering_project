import { useEffect, useEffectEvent, useRef, useState } from 'react'
import SpaceTabs from './components/spaces/SpaceTabs.jsx'
import Quote from './components/quote/Quote.jsx'
import Clock from './components/clock/Clock.jsx'
import BasicLayout from './layouts/BasicLayout.jsx'
import Calendar from './components/calendar/Calendar.jsx'
import { useToday } from './hooks/useToday.js'
import MemoWidget from './components/memos/MemoWidget.jsx'
import { useMemos } from './hooks/useMemos.js'
import { memoLayout } from './state/memos.js'
import { createSpace, renameSpace, deleteSpace } from './state/spaces.js'
import DdayWidget from './components/dday/DdayWidget.jsx'
import { addDday, updateDday, deleteDday, ddaysOf } from './state/ddays.js'
import { loadData, saveData } from './storage/storage.js'
import { SiteLinks } from './components/links/SiteLinks.jsx'
import { TodoList } from './components/todos/TodoList.jsx'
import { FocusTimer } from './components/timer/FocusTimer.jsx'
import { changeProductivity, focusState } from './state/productivity.js'
import { FOCUS_CHECKPOINT_INTERVAL_MS } from './lib/productivity.js'

function initialize() {
  const result = loadData()
  return { ...result, recovery: result.data?.focus?.activeSession?.status === 'running'
    ? { checkpoint: result.data.focus.checkpoint } : null,
  status: result.error ? 'error' : result.fresh ? 'new' : 'saved' }
}

export default function App() {
  const [session, setSession] = useState(initialize)
  const [quoteDraft, setQuoteDraft] = useState(null)
  // 오늘 날짜는 여기서 한 번만 구해 시계·달력·디데이에 같은 값을 내려준다.
  const todayKey = useToday()
  const data = session.data
  const focus = data ? focusState(data) : null
  // 자동 저장처럼 렌더 사이에 일어나는 변경이 서로 덮어쓰지 않도록 가장 최근 데이터를 따로 들고 있는다.
  const latest = useRef(session.data)
  useEffect(() => { latest.current = session.data }, [session.data])
  const memos = useMemos(commit)
  useEffect(() => {
    if (session.status !== 'new') return
    // StrictMode 재실행이나 첫 입력 시 이전 저장 예약을 취소한다.
    const timer = setTimeout(() => {
      const result = saveData(session.data)
      setSession({ ...session, status: result.error ? 'failed' : 'saved', saveError: result.error })
    }, 0)
    return () => clearTimeout(timer)
  }, [session])
  // next는 새 데이터 또는 최신 데이터를 받아 새 데이터를 돌려주는 함수다.
  function commit(next) {
    const nextData = typeof next === 'function' ? next(latest.current) : next
    latest.current = nextData
    // 저장 실패 시에도 최신 입력을 메모리에 유지해 재시도한다.
    const result = saveData(nextData)
    setSession((current) => ({ ...current, data: nextData, error: null, status: result.error ? 'failed' : 'saved', saveError: result.error }))
    if (!result.error) memos.markSaved(nextData)
    return result
  }
  function dispatch(action) {
    return commit((current) => changeProductivity(current, action))
  }
  const checkpoint = useEffectEvent(() => {
    commit((current) => ({ ...current, focus: { ...focusState(current), checkpoint: Date.now() } }))
  })
  const running = focus?.activeSession?.status === 'running' && !session.recovery
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => checkpoint(), FOCUS_CHECKPOINT_INTERVAL_MS)
    const onHidden = () => { if (document.visibilityState === 'hidden') checkpoint() }
    const onPageHide = () => checkpoint()
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [running])
  if (session.error) return <main className="recovery"><h1>저장한 데이터를 불러오지 못했어요</h1>
    <p role="alert">{session.error}</p><p>원본 보호를 위해 편집과 자동 저장을 멈췄어요. 기존 데이터는 변경하지 않았어요.</p>
    <button onClick={() => setSession(initialize())}>다시 불러오기</button></main>
  const activeSpace = data.spaces.find((space) => space.id === data.activeSpaceId)
  return <BasicLayout space={activeSpace}
    slots={{
      links: <SiteLinks key={activeSpace.id} spaceId={activeSpace.id} links={activeSpace.links}
        onRetry={() => commit((current) => current)}
        onAdd={(spaceId, value) => dispatch({ type: 'link/add', spaceId, ...value })}
        onEdit={(spaceId, id, value) => dispatch({ type: 'link/edit', spaceId, id, ...value })}
        onDelete={(spaceId, id) => dispatch({ type: 'link/delete', spaceId, id })} />,
      todos: <TodoList key={activeSpace.id} spaceId={activeSpace.id} todos={activeSpace.todos}
        onRetry={() => commit((current) => current)}
        onAdd={(spaceId, value) => dispatch({ type: 'todo/add', spaceId, ...value })}
        onToggle={(spaceId, id, done) => dispatch({ type: 'todo/toggle', spaceId, id, done })}
        onEdit={(spaceId, id, value) => dispatch({ type: 'todo/edit', spaceId, id, ...value })}
        onDelete={(spaceId, id) => dispatch({ type: 'todo/delete', spaceId, id })}
        onClearCompleted={(spaceId) => dispatch({ type: 'todo/clear', spaceId })} />,
      timer: <FocusTimer spaceId={activeSpace.id} spaceName={activeSpace.name} spaces={data.spaces}
        onRetry={() => {
          const result = commit((current) => current)
          if (!result.error) setSession((current) => ({ ...current, recovery: null }))
          return result
        }}
        activeSession={focus.activeSession} sessions={focus.sessions} dailyGoalMinutes={focus.dailyGoalMinutes}
        onStart={(spaceId) => dispatch({ type: 'focus/start', spaceId })}
        onPause={() => dispatch({ type: 'focus/pause' })}
        onResume={() => dispatch({ type: 'focus/resume' })}
        onStop={() => dispatch({ type: 'focus/stop' })}
        onGoalChange={(minutes) => dispatch({ type: 'focus/goal', minutes })}
        recovery={session.recovery} onRecover={(choice) => {
          const result = choice === 'stop'
            ? dispatch({ type: 'focus/stop', now: session.recovery.checkpoint })
            : commit((current) => ({ ...current, focus: { ...focusState(current), checkpoint: Date.now() } }))
          if (!result.error) setSession((current) => ({ ...current, recovery: null }))
          return result
        }} />,
      clock: <Clock />,
      calendar: <Calendar todayKey={todayKey} />,
      dday: <DdayWidget ddays={ddaysOf(data)} todayKey={todayKey}
        onAdd={(fields) => commit((current) => addDday(current, fields))}
        onUpdate={(id, fields) => commit((current) => updateDday(current, id, fields))}
        onDelete={(id) => commit((current) => deleteDday(current, id))}
        onRetry={() => commit((current) => current)} />,
      memos: <MemoWidget space={activeSpace} layout={memoLayout(data)} memos={memos} persisted={session.status === 'saved'} />,
    }}
    tabs={<SpaceTabs spaces={data.spaces} activeSpaceId={data.activeSpaceId}
      onSelect={(id) => {
        if (!data.spaces.some((space) => space.id === id)) return
        // 이전 공간의 대기 중인 메모를 원래 공간에 먼저 저장한다.
        memos.flush(data.activeSpaceId)
        commit((current) => ({ ...current, activeSpaceId: id }))
      }}
      onCreate={(name) => { memos.flush(data.activeSpaceId); commit((current) => createSpace(current, name)) }}
      onRename={(id, name) => commit((current) => renameSpace(current, id, name))}
      onDelete={(id) => { commit((current) => deleteSpace(current, id)); memos.forgetSpace(id) }} />}
    quote={<Quote value={data.quote} draft={quoteDraft} onEdit={() => setQuoteDraft(data.quote)}
      onDraftChange={setQuoteDraft} onCancel={() => setQuoteDraft(null)}
      onSave={() => { commit((current) => ({ ...current, quote: quoteDraft })); setQuoteDraft(null) }} />}
    status={<div className="save-status" role="status">
      {session.status === 'saved' && '저장됨 · 이 브라우저에 보관돼요'}
      {session.status === 'new' && '공간을 만들거나 문구를 입력하며 시작해 보세요.'}
      {session.status === 'failed' && <><span>저장하지 못했어요. 새로고침하면 저장하지 못한 내용이 사라질 수 있어요. {session.saveError}</span>
        <button onClick={() => { memos.retryAll(); commit((current) => current) }}>저장 재시도</button></>}
    </div>} />
}
