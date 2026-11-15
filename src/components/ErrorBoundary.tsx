/* 화면 하나가 렌더링 중에 터져도 사이드바·상단 바는 남기고, 그 자리에만 안내를 띄워요.
 * resetKey(주소)가 바뀌면 에러 상태를 지우고 다시 그려요. */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { resetKey: string; children: ReactNode }
interface State { error: Error | null; key: string }

/** 배포 직후 옛 HTML이 지워진 청크를 부를 때 나는 에러 */
const isChunkError = (e: Error) => /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(e.message)

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // 다른 화면으로 옮기면 에러를 지우고 새로 그려요
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[화면 오류]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const chunk = isChunkError(error)
    return (
      <div className="err-screen" role="alert">
        <h2>{chunk ? '새 버전이 올라왔어요' : '이 화면을 그리다 문제가 생겼어요'}</h2>
        <p>{chunk
          ? '열어 둔 사이 사이트가 업데이트돼서 이 화면 파일을 찾지 못했어요. 새로고침하면 새 버전으로 열려요.'
          : '다른 화면은 그대로 쓸 수 있어요. 다시 시도해도 안 되면 홈으로 가 주세요.'}</p>
        <div className="err-actions">
          {chunk
            ? <button type="button" className="btn" onClick={() => location.reload()}>새로고침</button>
            : <button type="button" className="btn" onClick={() => this.setState({ error: null })}>다시 시도</button>}
          <a className="btn ghost" href="#/">홈으로</a>
        </div>
        {!chunk && <code className="err-msg">{error.message}</code>}
      </div>
    )
  }
}
