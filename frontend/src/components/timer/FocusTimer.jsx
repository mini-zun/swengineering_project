import { useId, useState } from "react";
import {
  dateKey,
  elapsedMs,
  focusForDay,
  goalMinutes,
} from "../../lib/productivity.js";
import { ErrorText, Icon, Modal } from "../productivity/shared.jsx";
import { formatDuration } from "../../lib/productivityUi.js";
import useNow from "../../hooks/useNow.js";
import "../productivity/components.css";

export function FocusTimer({
  spaceId,
  spaceName,
  spaces = [],
  activeSession,
  sessions,
  dailyGoalMinutes,
  onStart,
  onPause,
  onResume,
  onStop,
  onGoalChange,
  recovery = null,
  onRecover,
  disabled = false,
}) {
  const now = useNow({ unit: 1000 }),
    effectiveNow = recovery ? recovery.checkpoint : now;
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [goalOpen, setGoalOpen] = useState(false),
    [goal, setGoal] = useState(String(dailyGoalMinutes)),
    id = useId();
  const elapsed = elapsedMs(activeSession, effectiveNow),
    today = focusForDay(
      sessions,
      activeSession,
      dateKey(new Date(now)),
      effectiveNow,
    ),
    progress = (today / (dailyGoalMinutes * 60000)) * 100;
  const owner =
    spaces.find((s) => s.id === activeSession?.spaceId)?.name || spaceName;
  async function act(callback) {
    setError("");
    setBusy(true);
    try {
      await callback();
    } catch (e) {
      setError(e.message || "시간을 변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }
  const locked = disabled || busy || !!recovery;
  return (
    <section className="sc-panel sc-focus" aria-label="누적 집중 타이머">
      <div className="sc-section-heading">
        <div>
          <span className="sc-kicker">
            <span
              className={`sc-live-dot ${activeSession?.status === "running" && !recovery ? "running" : ""}`}
            />{" "}
            FOCUS SESSION
          </span>
          <h2>나에게 집중하는 시간</h2>
        </div>
        <Icon name="clock" size={21} />
      </div>
      <p className="sc-focus-subtitle">서두르지 말고, 한 번에 하나씩.</p>
      <div className="sc-timer">
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle cx="110" cy="110" r="98" className="sc-timer-track" />
          <circle
            cx="110"
            cy="110"
            r="98"
            className="sc-timer-progress"
            strokeDasharray="615.75"
            strokeDashoffset={615.75 * (1 - Math.min(progress, 100) / 100)}
          />
        </svg>
        <div>
          <span className="sc-timer-state">
            {recovery
              ? "이전 기록 확인 중"
              : activeSession?.status === "running"
                ? "집중하는 중"
                : activeSession
                  ? "잠시 쉬는 중"
                  : "준비되면 시작해요"}
          </span>
          <output className="sc-time" aria-label="이번 집중 누적 시간">
            {formatDuration(elapsed)}
          </output>
          <span className="sc-timer-space">
            {activeSession ? `${owner}에서 시작한 집중` : `${spaceName} 공간`}
          </span>
        </div>
      </div>
      <div className="sc-timer-actions">
        {!activeSession ? (
          <button
            className="sc-button"
            disabled={locked}
            onClick={() => act(() => onStart(spaceId))}
          >
            <Icon name="play" size={15} /> 집중 시작
          </button>
        ) : (
          <>
            <button
              className="sc-button"
              disabled={locked}
              onClick={() =>
                act(activeSession.status === "running" ? onPause : onResume)
              }
            >
              <Icon
                name={activeSession.status === "running" ? "pause" : "play"}
                size={15}
              />
              {activeSession.status === "running" ? "일시정지" : "이어서 집중"}
            </button>
            <button
              className="sc-button sc-stop"
              disabled={locked}
              onClick={() => act(onStop)}
            >
              <Icon name="stop" size={15} /> 종료
            </button>
          </>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
      {activeSession && activeSession.spaceId !== spaceId && (
        <p className="sc-focus-owner">
          현재 보는 공간과 관계없이 <b>{owner}</b>에 기록돼요.
        </p>
      )}
      <div className="sc-daily-focus">
        <div>
          <span>
            오늘의 누적 <small>전체 공간</small>
          </span>
          <strong>{formatDuration(today)}</strong>
        </div>
        <div className="sc-daily-goal">
          <span>목표 {dailyGoalMinutes}분</span>
          <button
            className="sc-text-button"
            onClick={() => {
              setGoal(String(dailyGoalMinutes));
              setGoalOpen(true);
            }}
            disabled={locked}
          >
            목표 변경
          </button>
        </div>
        <div
          className="sc-goal-track"
          role="progressbar"
          aria-label="오늘 집중 목표 달성률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.floor(progress))}
        >
          <div style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <span className="sc-goal-caption">
          오늘 목표의 {Math.floor(progress)}%를 채웠어요
          {progress >= 100 ? " ✓" : ""}
        </span>
      </div>
      <p className="sc-focus-note">
        종료한 집중은 1분 이상일 때 기록에 남아요.
        <br />
        일시정지한 시간은 누적되지 않아요.
      </p>
      <div className="sc-history">
        <h3>
          최근 집중 기록 <span>{sessions.length}</span>
        </h3>
        {sessions.length ? (
          <ul>
            {sessions
              .slice(-3)
              .reverse()
              .map((session) => (
                <li key={session.id}>
                  <span>
                    <b>
                      {spaces.find((s) => s.id === session.spaceId)?.name ||
                        "이전 공간"}
                    </b>
                    <small>
                      {new Date(session.startedAt).toLocaleString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </small>
                  </span>
                  <strong>{formatDuration(session.focusSeconds * 1000)}</strong>
                </li>
              ))}
          </ul>
        ) : (
          <p>집중을 마치면 기록이 여기에 쌓여요.</p>
        )}
      </div>
      {goalOpen && (
        <Modal
          title="하루 집중 목표"
          onClose={() => {
            if (!busy) setGoalOpen(false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await onGoalChange(goalMinutes(goal));
                setGoalOpen(false);
              });
            }}
          >
            <label className="sc-field" htmlFor={`${id}-goal`}>
              하루 목표 (분)
              <input
                id={`${id}-goal`}
                type="number"
                min="1"
                max="1440"
                step="1"
                value={goal}
                autoFocus
                onChange={(e) => setGoal(e.target.value)}
                disabled={busy}
              />
            </label>
            <p className="sc-hint">
              하루 동안 모든 공간에서 집중한 시간을 합산해요.
            </p>
            <ErrorText>{error}</ErrorText>
            <div className="sc-modal-actions">
              <button
                className="sc-button secondary"
                type="button"
                disabled={busy}
                onClick={() => setGoalOpen(false)}
              >
                취소
              </button>
              <button className="sc-button" disabled={busy}>
                목표 저장
              </button>
            </div>
          </form>
        </Modal>
      )}
      {recovery && (
        <Modal
          title="진행 중이던 집중이 있어요"
          closable={false}
          onClose={() => {}}
        >
          <p className="sc-dialog-copy">
            이 페이지를 벗어난 동안의 시간도 포함해 이어갈까요? 마지막 저장
            시각은 {new Date(recovery.checkpoint).toLocaleString("ko-KR")}
            입니다.
          </p>
          <p className="sc-hint">
            마지막 저장 시각에 종료하면 이후 시간은 포함하지 않아요. 저장 이후의 시간은 종료 기록에 포함되지 않아요.
          </p>
          <ErrorText>{error}</ErrorText>
          <div className="sc-modal-actions">
            <button
              className="sc-button secondary"
              disabled={busy}
              onClick={() => act(() => onRecover("stop"))}
            >
              저장 시각에 종료
            </button>
            <button
              className="sc-button"
              disabled={busy}
              onClick={() => act(() => onRecover("continue"))}
            >
              경과 시간 포함해 계속
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
