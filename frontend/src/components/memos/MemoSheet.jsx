// 한 장형: 메모 하나를 크게 보여 주고, 위쪽 목록으로 다른 메모를 고른다.
export default function MemoSheet({ items, selectedId, onSelect, children }) {
  return <div className="memo-sheet">
    {items.length > 1 && <div className="memo-picker" role="group" aria-label="메모 선택">
      {items.map(({ memo, label }) => <button key={memo.id} type="button" className="memo-pick" aria-pressed={memo.id === selectedId}
        title={label} onClick={() => onSelect(memo.id)}>{label}</button>)}
    </div>}
    {children}
  </div>
}
