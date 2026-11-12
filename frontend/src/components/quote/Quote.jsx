export default function Quote({ value, draft, onEdit, onDraftChange, onSave, onCancel }) {
  return <section className="quote-card" aria-labelledby="quote-title">
    <h2 id="quote-title" className="visually-hidden">나의 한 문장 · 모든 공간에서 함께</h2>
    {draft === null ? <div className="quote-display"><p className="quote-text">{value || '오늘을 시작하는 나만의 문구를 적어 보세요.'}</p>
      <button className="quote-edit" onClick={onEdit}>{value ? '문구 수정' : '문구 입력'}</button></div> : <form onSubmit={(event) => { event.preventDefault(); onSave() }}>
        <label htmlFor="quote-input">좌우명·문구</label>
        <textarea id="quote-input" value={draft} onChange={(event) => onDraftChange(event.target.value)} autoFocus rows={3} />
        <div className="dialog-actions"><button type="button" onClick={onCancel}>취소</button><button className="primary" type="submit">문구 저장</button></div>
      </form>}
  </section>
}
