import { useId } from 'react'
import { SIZE_PRESETS, SIZE_LABELS } from '../../lib/sizes.js'
import './SizeSelect.css'

// UI는 크기 변경 이벤트만 보낸다. 대상 공간·테마·항목 ID는 호출부가 연결한다.
export default function SizeSelect({ label, value, onChange, className = '' }) {
  const id = useId()
  return <label className={`size-select ${className}`} htmlFor={id}>
    <span>{label}</span>
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      {SIZE_PRESETS.map((size) => <option key={size} value={size}>{SIZE_LABELS[size]}</option>)}
    </select>
  </label>
}
