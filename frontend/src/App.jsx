import { useEffect, useState } from 'react'
import SpaceTabs from './components/spaces/SpaceTabs.jsx'
import Quote from './components/quote/Quote.jsx'
import Clock from './components/clock/Clock.jsx'
import BasicLayout from './layouts/BasicLayout.jsx'
import { createSpace, renameSpace, deleteSpace } from './state/spaces.js'
import { loadData, saveData } from './storage/storage.js'

function initialize() {
  const result = loadData()
  return { ...result, status: result.error ? 'error' : result.fresh ? 'new' : 'saved' }
}

export default function App() {
  const [session, setSession] = useState(initialize)
  const [quoteDraft, setQuoteDraft] = useState(null)
  const data = session.data
  useEffect(() => {
    if (session.status !== 'new') return
    // StrictMode 재실행이나 첫 입력 시 이전 저장 예약을 취소한다.
    const timer = setTimeout(() => {
      const result = saveData(session.data)
      setSession({ ...session, status: result.error ? 'failed' : 'saved', saveError: result.error })
    }, 0)
    return () => clearTimeout(timer)
  }, [session])
  function commit(nextData) {
    // 저장 실패 시에도 최신 입력을 메모리에 유지해 재시도한다.
    const result = saveData(nextData)
    setSession({ data: nextData, error: null, status: result.error ? 'failed' : 'saved', saveError: result.error })
  }
  if (session.error) return <main className="recovery"><h1>저장한 데이터를 불러오지 못했어요</h1>
    <p role="alert">{session.error}</p><p>원본 보호를 위해 편집과 자동 저장을 멈췄어요. 기존 데이터는 변경하지 않았어요.</p>
    <button onClick={() => setSession(initialize())}>다시 불러오기</button></main>
  const activeSpace = data.spaces.find((space) => space.id === data.activeSpaceId)
  return <BasicLayout space={activeSpace} slots={{ clock: <Clock /> }}
    tabs={<SpaceTabs spaces={data.spaces} activeSpaceId={data.activeSpaceId}
      onSelect={(id) => { if (data.spaces.some((space) => space.id === id)) commit({ ...data, activeSpaceId: id }) }}
      onCreate={(name) => commit(createSpace(data, name))}
      onRename={(id, name) => commit(renameSpace(data, id, name))}
      onDelete={(id) => commit(deleteSpace(data, id))} />}
    quote={<Quote value={data.quote} draft={quoteDraft} onEdit={() => setQuoteDraft(data.quote)}
      onDraftChange={setQuoteDraft} onCancel={() => setQuoteDraft(null)}
      onSave={() => { commit({ ...data, quote: quoteDraft }); setQuoteDraft(null) }} />}
    status={<div className="save-status" role="status">
      {session.status === 'saved' && '저장됨 · 이 브라우저에 보관돼요'}
      {session.status === 'new' && '공간을 만들거나 문구를 입력하며 시작해 보세요.'}
      {session.status === 'failed' && <><span>저장하지 못했어요. 새로고침하면 저장하지 못한 내용이 사라질 수 있어요. {session.saveError}</span>
        <button onClick={() => commit(data)}>저장 재시도</button></>}
    </div>} />
}
