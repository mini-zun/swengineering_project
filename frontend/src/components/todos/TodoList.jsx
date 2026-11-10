import { useId, useState } from "react";
import {
  charCount,
  dateKey,
  validateDueDate,
  validateName,
} from "../../lib/productivity.js";
import {
  ConfirmDialog,
  ErrorText,
  Icon,
  Modal,
} from "../productivity/shared.jsx";
import { preventImeSubmit } from "../../lib/productivityUi.js";
import useNow from "../../hooks/useNow.js";
import "../productivity/components.css";

function TodoEdit({ todo, onSave, onClose }) {
  const [content, setContent] = useState(todo.content),
    [dueDate, setDueDate] = useState(todo.dueDate || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    id = useId();
  async function submit(e) {
    e.preventDefault();
    try {
      const value = {
        content: validateName(content, "할 일", 100),
        dueDate: validateDueDate(dueDate),
      };
      setBusy(true);
      await onSave(todo.spaceId, todo.id, value);
      onClose();
    } catch (e) {
      setError(e.message || "수정하지 못했어요.");
      setBusy(false);
    }
  }
  return (
    <Modal title="할 일 수정" onClose={busy ? () => {} : onClose}>
      <form onSubmit={submit} onKeyDown={preventImeSubmit}>
        <label className="sc-field" htmlFor={`${id}-content`}>
          할 일 <span>{charCount(content)}/100</span>
          <input
            id={`${id}-content`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            disabled={busy}
          />
        </label>
        <label className="sc-field" htmlFor={`${id}-date`}>
          기한 (선택)
          <input
            id={`${id}-date`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={busy}
          />
        </label>
        <ErrorText>{error}</ErrorText>
        <div className="sc-modal-actions">
          <button
            className="sc-button secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            취소
          </button>
          <button className="sc-button" disabled={busy}>
            변경 저장
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function TodoList({
  spaceId,
  todos,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  onClearCompleted,
  disabled = false,
}) {
  const [filter, setFilter] = useState("all"),
    [content, setContent] = useState(""),
    [dueDate, setDueDate] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [clear, setClear] = useState(false),
    id = useId(),
    now = useNow({ unit: 1000 });
  const items = todos,
    done = items.filter((t) => t.done).length,
    today = dateKey(new Date(now));
  const visible = items.filter(
    (t) => filter === "all" || (filter === "done" ? t.done : !t.done),
  );
  async function act(callback) {
    try {
      setError("");
      await callback();
    } catch (e) {
      setError(e.message || "변경하지 못했어요.");
    }
  }
  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      const value = {
        content: validateName(content, "할 일", 100),
        dueDate: validateDueDate(dueDate),
      };
      setBusy(true);
      await onAdd(spaceId, value);
      setContent("");
      setDueDate("");
    } catch (e) {
      setError(e.message || "추가하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="sc-panel sc-todos" aria-label="할 일 목록">
      <div className="sc-section-heading">
        <div>
          <span className="sc-kicker">ONE THING AT A TIME</span>
          <h2>
            오늘의 할 일 <span className="sc-count">{items.length}</span>
          </h2>
        </div>
        <span className="sc-completion">
          <b>{done}</b> / {items.length} 완료
        </span>
      </div>
      <div className="sc-todo-progress">
        <div
          style={{
            width: `${items.length ? (done / items.length) * 100 : 0}%`,
          }}
        />
      </div>
      <div className="sc-todo-toolbar">
        <div className="sc-segmented" role="group" aria-label="할 일 필터">
          {[
            ["all", "전체"],
            ["open", "진행 중"],
            ["done", "완료"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}{" "}
              <span>
                {key === "all"
                  ? items.length
                  : key === "done"
                    ? done
                    : items.length - done}
              </span>
            </button>
          ))}
        </div>
        <span className="sc-caption">생성 순서대로 표시</span>
      </div>
      <ul className="sc-todo-list">
        {visible.map((todo) => {
          const overdue = !todo.done && todo.dueDate && todo.dueDate < today;
          return (
            <li
              className={`sc-todo-row ${todo.done ? "is-done" : ""}`}
              key={todo.id}
            >
              <input
                id={`todo-${todo.id}`}
                type="checkbox"
                checked={todo.done}
                disabled={disabled}
                onChange={() => act(() => onToggle(spaceId, todo.id, !todo.done))}
              />
              <div className="sc-todo-content">
                <label htmlFor={`todo-${todo.id}`}>{todo.content}</label>
                {todo.dueDate && (
                  <span className={`sc-due ${overdue ? "is-overdue" : ""}`}>
                    <Icon name="calendar" size={12} />
                    {todo.dueDate}
                    {overdue
                      ? " · 기한 지남"
                      : todo.dueDate === today
                        ? " · 오늘까지"
                        : ""}
                  </span>
                )}
              </div>
              <div className="sc-row-tools">
                <button
                  className="sc-icon-button"
                  aria-label={`${todo.content} 수정`}
                  disabled={disabled}
                  onClick={() => setEditing({ ...todo, spaceId })}
                >
                  <Icon name="edit" size={14} />
                </button>
                <button
                  className="sc-icon-button"
                  aria-label={`${todo.content} 삭제`}
                  disabled={disabled}
                  onClick={() => setDeleting(todo)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {!visible.length && (
        <div className="sc-empty">
          <span>✓</span>
          <p>
            {filter === "done"
              ? "완료한 일이 여기에 쌓여요."
              : filter === "open"
                ? "남은 할 일이 없어요. 잠깐 쉬어가요."
                : "작은 할 일 하나로 시작해볼까요?"}
          </p>
          <small>
            {filter === "all"
              ? "첫 할 일을 아래에 적어주세요."
              : "다른 필터에서 전체 목록을 확인할 수 있어요."}
          </small>
        </div>
      )}
      <form
        className="sc-todo-form"
        onSubmit={add}
        onKeyDown={preventImeSubmit}
      >
        <div className="sc-todo-input">
          <Icon name="plus" size={17} />
          <label className="sc-sr" htmlFor={`${id}-new`}>
            새 할 일
          </label>
          <input
            id={`${id}-new`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="새로운 할 일을 적어보세요"
            disabled={disabled || busy}
          />
          <span className={charCount(content) > 100 ? "sc-error-inline" : ""}>
            {charCount(content)}/100
          </span>
        </div>
        <div className="sc-todo-form-bottom">
          <label htmlFor={`${id}-due`}>
            <Icon name="calendar" size={14} /> 기한{" "}
            <input
              id={`${id}-due`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={disabled || busy}
            />
          </label>
          <button className="sc-button compact" disabled={disabled || busy}>
            {busy ? "추가 중…" : "추가하기"}
          </button>
        </div>
      </form>
      <ErrorText>{error}</ErrorText>
      <div className="sc-card-footer">
        <span>{items.length - done}개의 할 일이 남았어요</span>
        <button
          className="sc-text-button"
          disabled={disabled || !done}
          onClick={() => setClear(true)}
        >
          완료 항목 정리
        </button>
      </div>
      {editing && (
        <TodoEdit
          todo={editing}
          onSave={onEdit}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="할 일을 삭제할까요?"
          description={`‘${deleting.content}’ 항목만 삭제됩니다.`}
          onConfirm={() => onDelete(spaceId, deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
      {clear && (
        <ConfirmDialog
          title="완료한 할 일을 정리할까요?"
          description={`현재 공간의 완료 항목 ${done}개를 삭제합니다. 진행 중인 항목과 다른 공간은 유지됩니다.`}
          onConfirm={() => onClearCompleted(spaceId)}
          onClose={() => setClear(false)}
        />
      )}
    </section>
  );
}
