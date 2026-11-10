import { useId, useState } from "react";
import { charCount, normalizeUrl, validateName } from "../../lib/productivity.js";
import {
  ConfirmDialog,
  ErrorText,
  Icon,
  Modal,
} from "../productivity/shared.jsx";
import { preventImeSubmit } from "../../lib/productivityUi.js";
import "../productivity/components.css";

function LinkForm({ link, spaceId, onSave, onClose }) {
  const [name, setName] = useState(link?.name || ""),
    [url, setUrl] = useState(link?.url || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    id = useId();
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const value = {
        name: validateName(name, "사이트 이름", 40),
        url: normalizeUrl(url),
      };
      setBusy(true);
      await onSave(spaceId, value, link?.id);
      onClose();
    } catch (e) {
      setError(e.message || "저장하지 못했어요.");
      setBusy(false);
    }
  }
  return (
    <Modal
      title={link ? "바로가기 수정" : "새 바로가기"}
      onClose={busy ? () => {} : onClose}
    >
      <form onSubmit={submit} onKeyDown={preventImeSubmit}>
        <label className="sc-field" htmlFor={`${id}-name`}>
          사이트 이름 <span>{charCount(name)}/40</span>
          <input
            id={`${id}-name`}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 학교 LMS"
            aria-invalid={!!error}
            disabled={busy}
          />
        </label>
        <label className="sc-field" htmlFor={`${id}-url`}>
          사이트 주소
          <input
            id={`${id}-url`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            inputMode="url"
            disabled={busy}
            aria-invalid={!!error}
          />
        </label>
        <p className="sc-hint">
          https://를 생략해도 괜찮아요. 새 탭에서 열립니다.
        </p>
        <ErrorText>{error}</ErrorText>
        <div className="sc-modal-actions">
          <button
            type="button"
            disabled={busy}
            className="sc-button secondary"
            onClick={onClose}
          >
            취소
          </button>
          <button className="sc-button" disabled={busy}>
            {busy ? "저장 중…" : link ? "변경 저장" : "추가하기"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function SiteIcon({ link }) {
  const [failed, setFailed] = useState(false),
    host = new URL(link.url).hostname;
  // Fetch only the registered site's own icon; no third-party favicon service receives the URL.
  return (
    <span className="sc-site-icon">
      {!failed ? (
        <img
          src={`${new URL(link.url).origin}/favicon.ico`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        Array.from(link.name)[0]?.toUpperCase()
      )}
      <span className="sc-sr">{host}</span>
    </span>
  );
}
/** Controlled component. Callbacks always receive the originating space ID. */
export function SiteLinks({
  spaceId,
  links,
  onAdd,
  onEdit,
  onDelete,
  disabled = false,
}) {
  const [form, setForm] = useState(null),
    [deleting, setDeleting] = useState(null);
  const items = links;
  return (
    <section className="sc-panel sc-links" aria-label="사이트 바로가기">
      <div className="sc-section-heading">
        <div>
          <span className="sc-kicker">QUICK ACCESS</span>
          <h2>
            자주 가는 곳 <span className="sc-count">{items.length}</span>
          </h2>
        </div>
        <button
          className="sc-button secondary compact"
          onClick={() => setForm({ spaceId, link: null })}
          disabled={disabled}
        >
          <Icon name="plus" size={15} /> 바로가기 추가
        </button>
      </div>
      <div className="sc-links-grid">
        {items.map((link, i) => (
          <article
            className="sc-link-tile"
            key={link.id}
            style={{ "--tile-index": i % 4 }}
          >
            <a
              className="sc-site-anchor"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.name} (새 탭)`}
            >
              <SiteIcon key={link.url} link={link} />
              <span className="sc-site-info">
                <strong>{link.name}</strong>
                <small>{new URL(link.url).hostname}</small>
              </span>
              <Icon name="arrow" size={15} />
            </a>
            <div className="sc-link-tools">
              <button
                className="sc-icon-button"
                aria-label={`${link.name} 수정`}
                onClick={() => setForm({ spaceId, link })}
                disabled={disabled}
              >
                <Icon name="edit" size={13} />
              </button>
              <button
                className="sc-icon-button"
                aria-label={`${link.name} 삭제`}
                onClick={() => setDeleting({ ...link })}
                disabled={disabled}
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          </article>
        ))}
        <button
          className="sc-link-add"
          disabled={disabled}
          onClick={() => setForm({ spaceId, link: null })}
        >
          <span>
            <Icon name="plus" size={22} />
          </span>
          <strong>새로운 곳 연결하기</strong>
          <small>
            {items.length
              ? "나에게 필요한 링크를 더해보세요"
              : "첫 바로가기를 등록해보세요"}
          </small>
        </button>
      </div>
      {form && (
        <LinkForm
          key={form.link?.id || "new"}
          link={form.link}
          spaceId={form.spaceId}
          onSave={(id, value, linkId) =>
            linkId ? onEdit(id, linkId, value) : onAdd(id, value)
          }
          onClose={() => setForm(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="바로가기를 삭제할까요?"
          description={`‘${deleting.name}’ 바로가기만 삭제됩니다.`}
          onConfirm={() => onDelete(spaceId, deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
