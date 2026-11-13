export default function Quote({ value, draft, onEdit, onDraftChange, onSave, onCancel }) {
  return <section className="quote-card" aria-labelledby="quote-title">
    <h2 id="quote-title" className="visually-hidden">이 공간의 한 문장</h2>
    {draft === null ? <div className="quote-display"><p className="quote-text">{value || '오늘을 시작하는 나만의 문구를 적어 보세요.'}</p>
      <button className="quote-edit" onClick={onEdit}>{value ? '문구 수정' : '문구 입력'}</button></div> : <form onSubmit={(event) => { event.preventDefault(); onSave() }}>
        <label htmlFor="quote-input">좌우명·문구</label>
        <textarea id="quote-input" value={draft.content} onChange={(event) => onDraftChange(event.target.value)} autoFocus rows={3} />
        <p>공간을 바꿔도 작성 중인 내용은 유지돼요. 새로고침 전에 문구를 저장해 주세요.</p>
        {draft.error && <p role="alert">저장하지 못했어요. {draft.error} 입력은 유지돼요. 새로고침하면 저장하지 못한 내용이 사라질 수 있어요. 편집을 닫아도 반영된 내용은 메모리에 남아요.</p>}
        <div className="dialog-actions"><button type="button" onClick={onCancel}>{draft.error ? '편집 닫기' : '취소'}</button><button className="primary" type="submit">{draft.error ? '저장 재시도' : '문구 저장'}</button></div>
      </form>}
  </section>
}
