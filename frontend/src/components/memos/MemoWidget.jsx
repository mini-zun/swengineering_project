import { useState } from 'react'
import { MEMO_MAX_COUNT, memoLabel, memoSize } from '../../state/memos.js'
import MemoBoard from './MemoBoard.jsx'
import MemoCard from './MemoCard.jsx'
import MemoSheet from './MemoSheet.jsx'
import './memo.css'

// 메모 위젯의 진입점. 위치와 너비는 레이아웃 slot이 정하고, 여기서는 slot을 채우기만 한다.
// memos는 useMemos 훅의 반환값이고 layout은 memoLayout(data)의 결과다.
export default function MemoWidget({ space, layout, memos, persisted, allowViewSwitch = true }) {
  const [error, setError] = useState('')
  const items = space.memos.map((memo, index) => {
    const draft = memos.drafts[memo.id]
    return { memo, draft, label: memoLabel(draft ? { ...memo, content: draft.content } : memo, index) }
  })
  const selected = items.find((item) => item.memo.id === memos.selectedMemoId(space.id)) ?? items[0]

  function run(action) {
    try { setError(action()?.error ?? '') }
    catch (failure) { setError(failure.message) }
  }

  const card = ({ memo, draft, label }) => <MemoCard key={memo.id} memo={memo} label={label} draft={draft} persisted={persisted}
    size={memoSize(layout, memo.id)}
    onChange={(content) => memos.edit(space.id, memo.id, content)}
    onColor={(color) => run(() => memos.setColor(space.id, memo.id, color))}
    onSize={(size) => run(() => memos.setSize(space.id, memo.id, size))}
    onDelete={() => run(() => memos.remove(space.id, memo.id))}
    onRetry={() => memos.retry(space.id, memo.id)} />

  const full = items.length >= MEMO_MAX_COUNT
  return <div className="memo-widget" data-view={layout.view}>
    <div className="memo-header">
      <h2>메모 <span className="memo-count">{items.length}</span></h2>
      <div className="memo-actions">
        {allowViewSwitch && <div className="memo-views" role="group" aria-label="메모 보기 방식">
          <button type="button" aria-pressed={layout.view === 'sheet'} onClick={() => run(() => memos.setView('sheet'))}>한 장</button>
          <button type="button" aria-pressed={layout.view === 'board'} onClick={() => run(() => memos.setView('board'))}>모아 보기</button>
        </div>}
        <button type="button" className="memo-add" disabled={full} title={full ? `메모는 ${MEMO_MAX_COUNT}개까지 만들 수 있어요.` : undefined}
          onClick={() => run(() => memos.add(space.id))}>+ 새 메모</button>
      </div>
    </div>
    {error && <div className="memo-error" role="alert">{error}</div>}
    {!items.length ? <div className="memo-empty">아직 메모가 없어요. ‘새 메모’로 떠오른 생각을 적어 보세요.</div>
      : layout.view === 'board' ? <MemoBoard>{items.map(card)}</MemoBoard>
        : <MemoSheet items={items} selectedId={selected.memo.id} onSelect={(memoId) => memos.select(space.id, memoId)}>{card(selected)}</MemoSheet>}
  </div>
}
