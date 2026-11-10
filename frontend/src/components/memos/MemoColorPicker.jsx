import { MEMO_COLORS, MEMO_COLOR_LABELS } from '../../state/memos.js'

// 색만으로 구분하지 않도록 선택된 색에는 체크 표시를 함께 보인다.
export default function MemoColorPicker({ name, value, onChange }) {
  return <fieldset className="memo-colors">
    <legend className="memo-sr-only">메모 색상</legend>
    {MEMO_COLORS.map((key) => <label key={key} className="memo-swatch" data-color={key} title={MEMO_COLOR_LABELS[key]}>
      <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} />
      <span className="memo-sr-only">{MEMO_COLOR_LABELS[key]}</span>
      <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </label>)}
  </fieldset>
}
