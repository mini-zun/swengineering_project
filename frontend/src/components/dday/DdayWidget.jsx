import { useCallback, useRef, useState } from 'react'
import { formatDateLabel, fromDateKey } from '../../lib/date.js'
import { ddayStatus, formatDday, sortDdaysForDisplay } from '../../lib/dday.js'
import DdayDialog from './DdayDialog.jsx'
import './Dday.css'

/**
 * 디데이 위젯. ddays와 todayKey를 받아 표시하고 변경은 이벤트로만 올려 보낸다(저장은 App의 commit).
 * - todayKey: App의 useToday() 값. 자정에 바뀌면 다시 계산되므로 여기서 타이머를 두지 않는다.
 * - 색·크기는 Dday.css의 --dday-* 변수로, 위치와 너비는 레이아웃 slot이 정한다.
 */
export default function DdayWidget({ ddays, todayKey, onAdd, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null)
  const addButton = useRef(null)
  const focusAdd = useCallback(() => addButton.current?.focus(), [])
  const items = sortDdaysForDisplay(ddays, todayKey)

  return <div className="dday">
    <div className="dday-heading">
      <h2>디데이</h2>
      <button ref={addButton} className="dday-add" onClick={() => setEditing({ mode: 'add' })}>+ 디데이 추가</button>
    </div>
    {items.length === 0 ? <p className="dday-empty">기다리는 날을 추가하면 남은 날짜를 알려 드려요.</p>
      : <ul className="dday-list">{items.map(({ dday, diff }) => <li key={dday.id} className={`dday-item dday-item--${ddayStatus(diff)}`}>
        <div className="dday-text">
          <span className="dday-title">{dday.title}</span>
          <time className="dday-date" dateTime={dday.targetDate}>{formatDateLabel(fromDateKey(dday.targetDate))}</time>
        </div>
        <span className="dday-count">{formatDday(diff)}</span>
        <div className="dday-actions">
          <button onClick={() => setEditing({ mode: 'edit', dday })} aria-label={`${dday.title} 수정`}>수정</button>
          <button onClick={() => setEditing({ mode: 'delete', dday })} aria-label={`${dday.title} 삭제`}>삭제</button>
        </div>
      </li>)}</ul>}
    {editing && <DdayDialog {...editing} todayKey={todayKey} fallbackFocus={focusAdd} onDismiss={() => setEditing(null)} onSubmit={(fields) => {
      if (editing.mode === 'add') onAdd(fields)
      else if (editing.mode === 'edit') onUpdate(editing.dday.id, fields)
      else onDelete(editing.dday.id)
    }} />}
  </div>
}
