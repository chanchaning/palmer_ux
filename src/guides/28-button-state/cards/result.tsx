import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { Alert, Check, Spin } from '../shared'

/* ================= 07 로딩 ================= */
const LOAD_LOG = <>주문하기를 누르고 <b>여러 번 연달아</b> 눌러 보세요</>

export function LoadingState() {
  const m = useMotion()
  const T = useTimers()
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [mode, setMode] = useState<'safe' | 'naive'>('safe')
  const [busy, setBusy] = useState(false)
  const [w, setW] = useState<number | null>(null)
  const [orders, setOrders] = useState(0)
  const [log, setLog] = useState<ReactNode>(LOAD_LOG)
  const pending = useRef(0), ignored = useRef(0), busyRef = useRef(false)

  const idle = () => { T.clear(); pending.current = 0; ignored.current = 0; busyRef.current = false; setBusy(false); setW(null) }
  const click = () => {
    if (mode === 'safe') {
      if (busyRef.current) { ignored.current++; setLog(<>처리 중이라 <b>{ignored.current}번</b> 더 누른 건 무시했어요</>); return }
      busyRef.current = true
      setW(btn.current?.offsetWidth ?? null); setBusy(true); setLog(<>폭은 그대로, 글자 대신 <b>스피너</b> — 한 번만 처리해요</>)
      T.set(() => {
        busyRef.current = false; setBusy(false); setW(null); setOrders(o => o + 1)
        setLog(<><b>주문 1건</b> 접수{ignored.current ? <> · 중복 클릭 {ignored.current}번 막음</> : null}</>)
        ignored.current = 0
      }, m.D(1600))
    } else {
      pending.current++
      setBusy(true); setLog(<>버튼이 <b>늘어나고</b> 또 눌려요… 요청 {pending.current}개</>)
      T.set(() => {
        setOrders(o => o + 1)
        pending.current--
        if (!pending.current) { setBusy(false); setLog(<>앗, 같은 주문이 <b>여러 건</b> 들어갔어요</>) }
      }, m.D(1600))
    }
  }
  const pick = (v: 'safe' | 'naive') => { idle(); setMode(v); setOrders(0); setLog(v === 'naive' ? <>아무 처리 없이 <b>글자만</b> 바꿔요. 연달아 눌러 보세요</> : LOAD_LOG) }

  const demo = useDemo({
    reset() { idle(); setMode('safe'); setOrders(0); setLog(LOAD_LOG) },
    async play(c) {
      await c.press(box.current, btn.current); await c.sleep(250)
      await c.press(box.current, btn.current); await c.press(box.current, btn.current); await c.sleep(1600)
      pick('naive'); await c.sleep(600)
      await c.press(box.current, btn.current); await c.press(box.current, btn.current); await c.press(box.current, btn.current); await c.sleep(2200)
      pick('safe'); await c.sleep(400)
    },
  })

  const safe = mode === 'safe'
  return (
    <Card id="bstate-loading" num="07" title="로딩" en="Loading · Busy" demo={demo}
      desc="누른 뒤 결과를 기다리는 동안의 모습이에요. ‘받았어요, 처리 중이에요’를 알리고 두 번 눌리지 않게 막아요.">
      <Stage log={log} logId="bstate-loading-log">
        <div className="box bs-box" ref={box}>
          <Seg value={mode} onChange={pick} options={[['safe', '폭 고정 + 중복 막기'], ['naive', '처리 없음']]} />
          <div className="bs-sheet">
            <div className="bs-sum"><span>카페라떼 × 1</span><b>5,000원</b></div>
            <div className="bs-center">
              <button ref={btn} type="button" className="bs-btn" onClick={click} style={w ? { width: w } : undefined}
                aria-busy={(safe && busy) || undefined} aria-disabled={(safe && busy) || undefined}>
                {busy ? safe ? <><Spin /><span className="sr">주문 중</span></> : '주문을 처리하고 있어요…' : '주문하기'}
              </button>
            </div>
            <div className="bs-receipt" aria-live="polite">접수된 주문 <b className={orders > 1 ? 'bad' : ''}>{orders}건</b></div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['폭', '그대로'], ['중복', 'aria-busy · 무시'], ['커서', 'progress']]}
        usage={[
          ['언제', '결제·저장·전송처럼 서버 답을 기다리는 버튼. 1초 안에 끝날 것 같아도 중복 클릭은 막아요'],
          ['주의', <>글자를 길게 바꾸면 버튼이 출렁이고, 막지 않으면 결제가 두 번 될 수 있어요. 더 자세한 비교는 <a href="#/loading/loading-button">로딩 버튼 →</a></>],
        ]}
      />
    </Card>
  )
}

/* ================= 08 성공 ================= */
type OkMode = 'flash' | 'stuck' | 'none'
const OK_LOG = <>장바구니에 <b>담아</b> 보세요</>

export function SuccessState() {
  const m = useMotion()
  const T = useTimers()
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const [mode, setMode] = useState<OkMode>('flash')
  const [st, setSt] = useState<'idle' | 'busy' | 'ok'>('idle')
  const [cart, setCart] = useState(0)
  const [log, setLog] = useState<ReactNode>(OK_LOG)

  const click = () => {
    if (st === 'busy') return
    T.clear(); setSt('busy')
    T.set(() => {
      setCart(c => c + 1)
      badge.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], m.D(300))
      if (mode === 'none') { setSt('idle'); setLog(<>숫자만 몰래 바뀌었어요 — <b>담겼는지 몰라서</b> 또 누르게 돼요</>); return }
      setSt('ok')
      if (mode === 'stuck') { setLog(<>‘담았어요’가 계속 남으면 <b>또 담을 수 있는지</b> 헷갈려요</>); return }
      setLog(<><b>✓ 담았어요</b> — 1.5초 뒤 원래 버튼으로 돌아가요</>)
      T.set(() => { setSt('idle'); setLog(<>다시 <b>담기</b>로 돌아왔어요. 한 번 더 담을 수 있어요</>) }, m.D(1500))
    }, m.D(600))
  }
  const pick = (v: OkMode) => { T.clear(); setMode(v); setSt('idle'); setLog(v === 'stuck' ? <>성공 상태가 <b>계속 남게</b> 했어요. 두 번 담아 보세요</> : v === 'none' ? <>성공 표시를 <b>없앴어요</b>. 담아 보세요</> : OK_LOG) }

  const demo = useDemo({
    reset() { T.clear(); setMode('flash'); setSt('idle'); setCart(0); setLog(OK_LOG) },
    async play(c) {
      await c.press(box.current, btn.current); await c.sleep(2400)
      pick('stuck'); await c.sleep(500)
      await c.press(box.current, btn.current); await c.sleep(1200)
      await c.press(box.current, btn.current); await c.sleep(1600)
      pick('flash'); await c.sleep(400)
    },
  })

  return (
    <Card id="bstate-success" num="08" title="성공" en="Success" demo={demo}
      desc="일이 잘 끝났다고 버튼 자리에서 잠깐 알려주는 모습이에요. 1~2초 뒤엔 다시 쓸 수 있게 돌아와요.">
      <Stage log={log} logId="bstate-success-log">
        <div className="box bs-box" ref={box}>
          <Seg value={mode} onChange={pick} options={[['flash', '잠깐 보여주기'], ['stuck', '계속 남기'], ['none', '표시 없음']]} />
          <div className="bs-sheet">
            <div className="bs-sum"><span>원두 200g · 디카페인</span><span className="bs-cart">장바구니 <span ref={badge} className="bs-badge">{cart}</span></span></div>
            <button ref={btn} type="button" className={'bs-btn wide' + (st === 'ok' ? ' is-ok' : '')} onClick={click} aria-busy={st === 'busy' || undefined}>
              {st === 'busy' ? <><Spin /><span className="sr">담는 중</span></> : st === 'ok' ? <span className="bs-pop"><Check /> 담았어요</span> : '장바구니 담기'}
            </button>
          </div>
          <div className="bs-tags" aria-hidden="true">
            <span>색 <b>{st === 'ok' ? '초록' : '주 색'}</b></span>
            <span>아이콘 <b>{st === 'ok' ? '✓' : '없음'}</b></span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['표시', '✓ 아이콘 + 문구'], ['시간', '1–2초 뒤 복귀'], ['알림', 'aria-live']]}
        usage={[
          ['언제', '담기·복사·저장처럼 화면이 넘어가지 않아 결과가 눈에 안 보이는 행동'],
          ['주의', '성공 표시가 계속 남으면 다시 눌러도 되는지 헷갈려요. 초록색만 믿지 말고 ✓와 ‘담았어요’ 같은 문구를 같이 쓰세요'],
        ]}
      />
    </Card>
  )
}

/* ================= 09 오류 ================= */
const ERR_LOG = <>결제하기를 눌러 보세요. <b>처음엔 실패</b>해요</>

export function ErrorState() {
  const m = useMotion()
  const T = useTimers()
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [mode, setMode] = useState<'full' | 'color'>('full')
  const [st, setSt] = useState<'idle' | 'busy' | 'err' | 'ok'>('idle')
  const [log, setLog] = useState<ReactNode>(ERR_LOG)
  const tries = useRef(0)
  const full = mode === 'full'

  const shake = () => {
    if (!btn.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    btn.current.animate([0, -7, 7, -5, 5, -2, 0].map(x => ({ transform: `translateX(${x}px)` })), m.D(360))
  }
  const click = () => {
    if (st === 'busy' || st === 'ok') return
    setSt('busy')
    T.set(() => {
      tries.current++
      if (tries.current % 2 === 1) {
        setSt('err')
        if (full) { shake(); setLog(<>흔들림 + <b>⚠ 원인과 해결 방법</b> + ‘다시 시도’</>) } else setLog(<>버튼만 빨개졌어요 — <b>무엇이 잘못됐는지</b> 알 수 없어요</>)
        return
      }
      setSt('ok'); setLog(<><b>결제 완료</b> — 다시 시도로 해결했어요</>)
      T.set(() => { setSt('idle'); tries.current = 0 }, m.D(1800))
    }, m.D(800))
  }
  const pick = (v: 'full' | 'color') => { T.clear(); tries.current = 0; setMode(v); setSt('idle'); setLog(v === 'color' ? <>오류를 <b>색으로만</b> 알려요. 눌러 보세요</> : ERR_LOG) }

  const demo = useDemo({
    reset() { T.clear(); tries.current = 0; setMode('full'); setSt('idle'); setLog(ERR_LOG) },
    async play(c) {
      await c.press(box.current, btn.current); await c.sleep(2400)
      await c.press(box.current, btn.current); await c.sleep(2400)
      pick('color'); await c.sleep(500)
      await c.press(box.current, btn.current); await c.sleep(2200)
      pick('full'); await c.sleep(400)
    },
  })

  const err = st === 'err'
  return (
    <Card id="bstate-error" num="09" title="오류" en="Error" demo={demo}
      desc="눌렀지만 일이 실패했을 때의 모습이에요. 무엇이 잘못됐고 어떻게 하면 되는지까지 버튼 곁에서 알려줘요.">
      <Stage log={log} logId="bstate-error-log">
        <div className="box bs-box" ref={box}>
          <Seg value={mode} onChange={pick} options={[['full', '흔들기 + 아이콘 + 문구'], ['color', '색만 빨갛게']]} />
          <div className="bs-sheet">
            <div className="bs-sum"><span>원두 정기 배송 · 1개월</span><b>18,000원</b></div>
            <button ref={btn} type="button" className={'bs-btn wide' + (err ? ' is-err' : '') + (st === 'ok' ? ' is-ok' : '')} onClick={click}
              aria-busy={st === 'busy' || undefined} aria-describedby={err && full ? 'bstate-err-msg' : undefined}>
              {st === 'busy' ? <><Spin /><span className="sr">결제 중</span></>
                : st === 'ok' ? <><Check /> 결제 완료</>
                  : err && full ? <><Alert /> 다시 시도</> : '결제하기'}
            </button>
            {err && full && (
              <p className="bs-errmsg" id="bstate-err-msg" role="alert">
                <Alert /><span><b>카드 한도를 넘었어요.</b> 다른 카드를 고르거나 잠시 뒤 다시 시도해 주세요.</span>
              </p>
            )}
          </div>
          <div className="bs-tags" aria-hidden="true">
            <span>움직임 <b>{full ? '좌우 흔들기 360ms' : '없음'}</b></span>
            <span>문구 <b>{full ? '원인 + 해결' : '없음'}</b></span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['흔들기', '360ms · 좌우 3번'], ['문구', '원인 + 해결'], ['라벨', '다시 시도']]}
        usage={[
          ['언제', '결제·전송처럼 누른 행동이 서버에서 실패했을 때. 입력값 문제라면 버튼보다 그 칸 옆에 알려요'],
          ['주의', '빨간색만으로는 색약 사용자도, 다른 사용자도 이유를 몰라요. 아이콘과 쉬운 문구를 붙이고, 움직임 줄이기 설정에선 흔들기를 빼세요'],
        ]}
      />
    </Card>
  )
}
