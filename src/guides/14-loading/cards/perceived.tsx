import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { REPLAY, now, useRunner } from '../shared'

/* ---------- 07 낙관적 UI ---------- */
const TEXTS = ['다음 주에 봬요!', '시안 확인했어요 🙂', '회의 30분 늦춰도 될까요?', '고마워요!']
interface Msg { id: number; text: string; st: 'them' | 'pending' | 'ok' | 'fail' }
const FIRST: Msg[] = [{ id: 0, text: '초안 잘 봤어요 👍', st: 'them' }]

/** 말풍선 — 처음 붙을 때만 떠오르는 애니메이션 */
function Bubble({ msg, onRetry }: { msg: Msg; onRetry: () => void }) {
  const m = useMotion()
  const el = useRef<HTMLDivElement>(null)
  const isNew = useRef(msg.st === 'pending')
  useLayoutEffect(() => {
    // fill: 'backwards' — 등장이 끝나면 CSS(.pending → 전송됨)가 다시 투명도를 결정하도록
    if (isNew.current && el.current) el.current.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 0.55, transform: 'none' }], { duration: m.D(180), easing: EASE.out, fill: 'backwards' })
  }, [m])
  const cls = msg.st === 'them' ? 'ld-msg them' : msg.st === 'pending' ? 'ld-msg pending' : msg.st === 'fail' ? 'ld-msg fail' : 'ld-msg'
  return (
    <div className={cls} ref={el}>
      {msg.text}
      {msg.st === 'pending' && <small>보내는 중…</small>}
      {msg.st === 'ok' && <small>✓ 전송됨</small>}
      {msg.st === 'fail' && <small>! 전송 실패 · <button onClick={onRetry}>다시 보내기</button></small>}
    </div>
  )
}

export function Optimistic() {
  const m = useMotion()
  const R = useRunner()
  const timers = useTimers()
  const box = useRef<HTMLDivElement>(null)
  const likeBtn = useRef<HTMLButtonElement>(null)
  const sendBtn = useRef<HTMLButtonElement>(null)
  const swBtn = useRef<HTMLButtonElement>(null)
  const [liked, setLiked] = useState(false)
  const [n, setN] = useState(24)
  const [stat, setStat] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>(FIRST)
  const [ti, setTi] = useState(0)
  const [fail, setFailS] = useState(false)
  const [toast, setToast] = useState<{ on: boolean; text: string }>({ on: false, text: '⚠ 반영하지 못했어요' })
  const [log, setLog] = useState<ReactNode>(<>♥ 또는 보내기 — <b>즉시 반영</b>돼요</>)
  const likeR = useRef({ liked: false, n: 24 }), failR = useRef(false), tiR = useRef(0), nextId = useRef(1), toastT = useRef<number | undefined>(undefined)

  const setFail = (v: boolean) => { failR.current = v; setFailS(v) }
  const paintLike = () => { setLiked(likeR.current.liked); setN(likeR.current.n) }
  const showToast = (text: string) => {
    setToast({ on: true, text })
    timers.clear(toastT.current)
    toastT.current = timers.set(() => setToast(t => ({ ...t, on: false })), m.D(2200))
  }
  const toggleLike = () => { const L = likeR.current; L.liked = !L.liked; L.n += L.liked ? 1 : -1; paintLike() }

  const doLike = async () => {
    toggleLike()
    const L = likeR.current
    if (likeBtn.current) m.A(likeBtn.current, [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 220, EASE.out)
    setStat('저장 중…')
    setLog(<>누르자마자 <b>{L.liked ? '♥ ' + L.n : '취소 ' + L.n}</b> — 서버는 아직 답하기 전</>)
    const f = failR.current
    if (!await R.wait(1200)) return
    if (f) {
      toggleLike(); setStat('')
      if (likeBtn.current) m.A(likeBtn.current, [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], 320, 'linear')
      showToast('⚠ 좋아요를 반영하지 못했어요')
      setLog(<>서버 실패 → <b>원래대로 되돌림</b> + 알림</>)
    } else { setStat('✓ 저장됨'); setLog(<>즉시 반영 → 1.2초 뒤 <b>서버 확인 ✓</b></>) }
  }

  const doSend = async (text: string, retryOf?: number) => {
    const id = nextId.current++
    setMsgs(ms => [...ms.filter(x => x.id !== retryOf), { id, text, st: 'pending' as const }].slice(-3))
    if (text === TEXTS[tiR.current]) { tiR.current = (tiR.current + 1) % TEXTS.length; setTi(tiR.current) }
    setLog(<>말풍선이 <b>바로</b> 올라가요 (흐리게 = 보내는 중)</>)
    const f = failR.current
    if (!await R.wait(1000)) return
    const upd = (st: Msg['st']) => setMsgs(ms => ms.map(x => (x.id === id ? { ...x, st } : x)))
    if (f) {
      upd('fail')
      showToast('⚠ 메시지를 보내지 못했어요')
      setLog(<>전송 실패 → 말풍선을 <b>실패 상태</b>로, 다시 보내기 제공</>)
    } else { upd('ok'); setLog(<>보이는 건 즉시, <b>확인 표시</b>는 서버 응답 뒤</>) }
  }
  const flipFail = () => {
    const v = !failR.current
    setFail(v)
    setLog(v ? <>이제 서버 요청이 <b>실패</b>해요</> : <>네트워크 <b>정상</b></>)
  }

  const demo = useDemo({
    reset() {
      R.cancel(); timers.clear(toastT.current); setToast(t => ({ ...t, on: false }))
      likeR.current = { liked: false, n: 24 }; paintLike(); setStat('')
      tiR.current = 0; setTi(0); setMsgs(FIRST); setFail(false)
    },
    async play(c) {
      const ok = R.token(), b = box.current
      c.tap(b, likeBtn.current); doLike(); if (!await R.wait(1700) || !ok()) return
      c.tap(b, sendBtn.current); doSend(TEXTS[tiR.current]); if (!await R.wait(1500) || !ok()) return
      c.tap(b, swBtn.current); flipFail(); if (!await R.wait(700) || !ok()) return
      c.tap(b, likeBtn.current); doLike(); if (!await R.wait(2200) || !ok()) return
      setFail(false)
    },
  })

  return (
    <Card id="loading-optimistic" num="07" title="낙관적 UI" en="Optimistic UI"
      desc="서버 응답을 기다리지 않고 성공했다고 보고 바로 바꿔요. 실패하면 되돌리고 알려요." demo={demo}>
      <Stage log={log} logId="loading-optimistic-log">
        <div className="box ld-box" ref={box}>
          <div className="ld-opt">
            <div className="profile"><div className="ph" /><div><div className="t1">Palmer</div><div className="t2">로딩 가이드 초안 올렸어요</div></div></div>
            <div className="ld-acts">
              <button className={'ld-like' + (liked ? ' on' : '')} ref={likeBtn} onClick={doLike}><i>♥</i><span>{n}</span></button>
              <span className="ld-stat">{stat}</span>
            </div>
            <div className="ld-msgs">
              {msgs.map(x => <Bubble key={x.id} msg={x} onRetry={() => doSend(x.text, x.id)} />)}
            </div>
            <div className="ld-send">
              <span className="ld-input">{TEXTS[ti]}</span>
              <button className="btn sm" ref={sendBtn} onClick={() => doSend(TEXTS[tiR.current])}>보내기</button>
            </div>
            <div className="ld-fail">
              <button className="switch" role="switch" ref={swBtn} aria-checked={fail} aria-label="네트워크 실패 시뮬레이션" onClick={flipFail} />네트워크 실패 시뮬레이션
            </div>
          </div>
          <div className={'toast' + (toast.on ? ' on' : '')}>{toast.text}</div>
        </div>
      </Stage>
      <Info replayLabel={REPLAY}
        spec={[['권장', '성공률 높은 짧은 동작'], ['체감 대기', '0초'], ['실패 시', '되돌리기 + 알림']]}
        usage={[['언제', '좋아요, 메시지 전송, 체크, 순서 변경'], ['주의', '결제·삭제처럼 되돌리기 어려운 일에는 쓰지 마세요']]}
      />
    </Card>
  )
}

/* ---------- 08 스트리밍 텍스트 ---------- */
const SPEEDS: [number, string][] = [[40, '보통'], [110, '느린 서버']]
const TEXT = '화면 구조를 미리 알고 1~4초쯤 기다릴 때 스켈레톤이 좋아요. 실제 레이아웃과 같은 크기로 그려야 내용이 들어올 때 화면이 튀지 않아요. 4초가 넘거나 진행률을 알 수 있다면 진행 바를 함께 보여주세요.'
const TOKENS = TEXT.match(/\s+|[^\s]{1,3}/g) ?? []

export function Stream() {
  const R = useRunner()
  const box = useRef<HTMLDivElement>(null)
  const goBtn = useRef<HTMLButtonElement>(null)
  const [speed, setSpeed] = useState(0)
  const [ans, setAns] = useState<{ text: string; dots: boolean; caret: boolean }>({ text: TEXT, dots: false, caret: false })
  const [streaming, setStreaming] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>질문하기 → <b>첫 글자가 나오는 시간</b>에 주목</>)

  const stop = (why?: ReactNode) => {
    R.cancel(); setStreaming(false)
    setAns(a => ({ ...a, dots: false, caret: false }))
    if (why) setLog(why)
  }
  const load = async () => {
    stop(); setStreaming(true)
    setAns({ text: '', dots: true, caret: false })
    setLog(<>생각 중… <b>첫 토큰</b>을 기다려요</>)
    const t0 = now()
    if (!await R.wait(450)) return
    const first = Math.round(now() - t0)
    let text = ''
    setAns({ text, dots: false, caret: true })
    const [ms] = SPEEDS[speed]
    for (let i = 0; i < TOKENS.length; i++) {
      text += TOKENS[i]
      setAns({ text, dots: false, caret: true })
      setLog(<>첫 토큰 <b>{first}ms</b> · 토큰 {i + 1} / {TOKENS.length}</>)
      if (!await R.wait(ms * (0.6 + ((i * 7) % 5) / 6))) return
    }
    const total = ((now() - t0) / 1000).toFixed(1)
    stop(<>완료 · {total}초 걸렸지만 <b>{first}ms</b>부터 읽을 수 있었어요</>)
  }

  const demo = useDemo({
    reset() { stop(); setAns({ text: '', dots: false, caret: false }) },
    async play(c) { c.tap(box.current, goBtn.current); await load() },
  })

  return (
    <Card id="loading-stream" num="08" title="스트리밍 텍스트" en="Streaming Text"
      desc="답을 다 만들 때까지 기다리지 않고, 만들어지는 대로 조금씩 보여줘요." demo={demo}>
      <Stage log={log} logId="loading-stream-log">
        <div className="box ld-box" ref={box}>
          <div className="ld-panel" style={{ justifyContent: 'flex-start' }}>
            <div className="ld-q">로딩엔 언제 스켈레톤을 써요?</div>
            <div className="ld-ans">
              {ans.dots && <span className="ld-dots"><i /><i /><i /></span>}
              {ans.text}
              {ans.caret && <span className="ld-caret" />}
            </div>
          </div>
          <div className="ld-ctrl">
            <button className="btn sm" ref={goBtn} onClick={() => { if (streaming) stop(<><b>■ 중지</b> — 받은 데까지는 그대로 남아요</>); else load() }}>
              {streaming ? '■ 중지' : '질문하기'}
            </button>
            <button className="chip" onClick={() => setSpeed(s => (s + 1) % SPEEDS.length)}>속도 <b>{SPEEDS[speed][1]}</b></button>
          </div>
        </div>
      </Stage>
      <Info replayLabel={REPLAY}
        spec={[['권장', '4초+ · 생성형 응답'], ['첫 토큰', '1초 안'], ['제어', '■ 중지 버튼']]}
        usage={[['언제', '긴 답변·요약, 실시간 번역, 라이브 자막'], ['주의', '글이 늘어나며 화면이 밀려요 — 사용자가 위로 스크롤하면 자동 스크롤을 멈추세요']]}
      />
    </Card>
  )
}

/* ---------- 09 로딩 버튼 ---------- */
export function LoadingButton() {
  const m = useMotion()
  const R = useRunner()
  const box = useRef<HTMLDivElement>(null)
  const pay = useRef<HTMLButtonElement>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'ok'>('idle')
  const [width, setWidth] = useState<number | null>(null)
  const [fixed, setFixed] = useState(true)
  const [busyFixed, setBusyFixed] = useState(true)
  const [log, setLog] = useState<ReactNode>(<>결제하기를 누르고 <b>여러 번</b> 눌러보세요</>)
  const busy = useRef(false), ignored = useRef(0)

  const idle = () => { R.cancel(); busy.current = false; ignored.current = 0; setState('idle'); setWidth(null) }
  const run = async () => {
    const el = pay.current
    if (busy.current) {
      ignored.current++
      setLog(<>처리 중 중복 클릭 <b>{ignored.current}회 무시</b> — 결제는 한 번만</>)
      if (el) m.A(el, [{ transform: 'scale(1)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }], 150)
      return
    }
    idle(); busy.current = true
    const fx = fixed, w0 = el?.offsetWidth ?? 0
    flushSync(() => { setBusyFixed(fx); setWidth(fx ? w0 : null); setState('busy') })
    setLog(fx ? <>버튼 안에 스피너 · <b>너비 {w0}px 유지</b></> : <>너비가 <b>{w0} → {pay.current?.offsetWidth ?? 0}px</b>로 줄어 흔들려요</>)
    if (!await R.wait(1700)) return
    setState('ok')
    setLog(<><b>✓ 결과까지</b> 버튼에서 보여줘요{ignored.current ? ' · 중복 클릭 ' + ignored.current + '회 무시됨' : ''}</>)
    if (!await R.wait(1600)) return
    const n = ignored.current
    idle(); ignored.current = n
  }

  const demo = useDemo({
    reset: idle,
    async play(c) {
      const b = box.current
      c.tap(b, pay.current); const p = run()
      await c.sleep(500); if (!busy.current) return
      c.tap(b, pay.current); run()
      await c.sleep(300); if (!busy.current) return
      c.tap(b, pay.current); run()
      await p
    },
  })

  const style: CSSProperties | undefined = width !== null ? { width } : undefined
  return (
    <Card id="loading-button" num="09" title="로딩 버튼" en="Loading Button"
      desc="누른 버튼 안에서 진행을 보여줘요. 너비는 그대로, 다시 누를 수 없게 막아요." demo={demo}>
      <Stage log={log} logId="loading-button-log">
        <div className="box ld-box" ref={box}>
          <div className="ld-note">총 결제 금액 <b style={{ color: 'var(--text)' }}>32,000원</b></div>
          <button className={'btn ld-pay' + (state === 'ok' ? ' ok' : '')} ref={pay} style={style} onClick={run}
            aria-busy={state === 'busy' ? true : undefined} aria-disabled={state !== 'idle' ? true : undefined}>
            {state === 'idle' ? '결제하기' : state === 'ok' ? '✓ 결제 완료' : <><span className="ld-bsp" />{busyFixed ? '처리 중' : ''}</>}
          </button>
          <div className="ld-ctrl">
            <button className="chip" aria-pressed={fixed} onClick={() => {
              const v = !fixed
              setFixed(v)
              setLog(v ? <>너비를 <b>고정</b>해요</> : <>너비 고정 <b>끔</b> — 눌러서 차이를 보세요</>)
            }}>{fixed ? '너비 고정' : '너비 고정 끔'}</button>
          </div>
        </div>
      </Stage>
      <Info replayLabel={REPLAY}
        spec={[['권장', '1–4초 · 버튼이 시작한 작업'], ['너비', '고정'], ['중복', '클릭 무시 · aria-busy']]}
        usage={[['언제', '결제, 저장, 로그인, 전송처럼 버튼 하나가 시작한 작업'], ['주의', '너비가 줄면 레이아웃이 흔들려요 — 끝나면 ✓로 결과까지 보여주기']]}
      />
    </Card>
  )
}
