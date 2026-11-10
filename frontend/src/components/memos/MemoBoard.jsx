// 여러 포스트잇형: 테마가 정한 영역 안에서 순서대로 배치한다. 사용자가 끌어서 옮기지 않는다.
export default function MemoBoard({ children }) {
  return <div className="memo-board">{children}</div>
}
