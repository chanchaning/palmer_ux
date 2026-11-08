import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { DpSeg, Pane, Spacer, flash, useSeen, type V } from '../shared'

/* ---------- 01 숨은 해지 ---------- */
type Act = 'wrong' | 'next' | 'trap'
const Row = ({ ic, t, act, on }: { ic: string; t: string; act: Act; on: (a: Act) => void }) => (
  <button className="dp-row" data-act={act} onClick={() => on(act)}>{ic} {t}<span className="dp-chev">›</span></button>
)

export function Cancel() {
  const [v, setView] = useState<V>('bad')
  const [step, setStep] = useState(0)
  const [clicks, setClicks] = useState(0)
  const [sec, setSec] = useState(0)
  const t0 = useRef(0)
  const [gs, setGs] = useState<'idle' | 'confirm' | 'done'>('idle')
  const [gClicks, setGClicks] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>작은 글씨 사이에서 <b>해지 버튼</b>을 찾아보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const bad = useRef<HTMLDivElement>(null)
  const good = useRef<HTMLDivElement>(null)

  const resetBad = () => { setStep(0); setClicks(0); t0.current = 0 }
  const resetGood = () => { setGs('idle'); setGClicks(0) }
  const setV = (nv: V) => {
    setView(nv)
    setLog(nv === 'bad' ? <>작은 글씨 사이에서 <b>해지 버튼</b>을 찾아보세요</> : <>가입한 화면에 <b>해지 버튼</b>이 바로 있어요</>)
  }

  const act = (a: Act) => {
    if (!t0.current) t0.current = Date.now()
    const n = clicks + 1
    setClicks(n)
    if (a === 'wrong') setLog(<>여기엔 해지가 없어요 · <b>클릭 {n}번째</b></>)
    else if (a === 'trap') { setStep(0); setLog(<>큰 버튼은 <b>해지가 아니에요</b> — 처음 화면으로 돌아갔어요</>) }
    else {
      const s = step + 1
      setStep(s)
      if (s < 4) setLog(<>해지 찾는 중 <b>{s + 1}/4 화면</b> · 클릭 {n}번</>)
      else {
        const sc = Math.max(1, Math.round((Date.now() - t0.current) / 1000))
        setSec(sc)
        setLog(<>해지까지 <b>클릭 {n}번 · {sc}초</b> — 가입은 버튼 1개였어요</>)
      }
    }
  }
  const gAct = (a: 'open' | 'back' | 'ok' | 'restart') => {
    if (a === 'restart') { resetGood(); setLog(<>가입한 화면에 <b>해지 버튼</b>이 바로 있어요</>); return }
    const n = gClicks + 1
    setGClicks(n)
    if (a === 'open') { setGs('confirm'); setLog(<>한 번 더 확인만 — <b>클릭 {n}번</b></>) }
    else if (a === 'back') { setGs('idle'); setLog(<>취소도 <b>원래 화면</b>으로 그대로</>) }
    else { setGs('done'); setLog(<>해지 끝 — <b>클릭 {n}번</b>, 남은 기간도 알려줘요</>) }
  }

  const tiny = (label: string) => <button className="dp-tiny" data-act="next" onClick={() => act('next')}>{label}</button>
  const screens: ReactNode[] = [
    <>
      <div className="dp-bar">내 계정</div>
      <Row ic="👤" t="프로필 수정" act="wrong" on={act} /><Row ic="🔔" t="알림 설정" act="wrong" on={act} />
      <Row ic="💳" t="결제 수단" act="wrong" on={act} /><Row ic="🎁" t="이벤트·쿠폰" act="wrong" on={act} />
      <div className="dp-body" style={{ justifyContent: 'flex-end' }}>{tiny('기타')}</div>
    </>,
    <>
      <div className="dp-bar">‹ 기타</div>
      <Row ic="🌐" t="언어" act="wrong" on={act} /><Row ic="📦" t="데이터 내보내기" act="wrong" on={act} /><Row ic="📄" t="약관·정책" act="wrong" on={act} />
      <div className="dp-body" style={{ justifyContent: 'flex-end' }}>{tiny('멤버십 상태 보기')}</div>
    </>,
    <>
      <div className="dp-bar">‹ 멤버십</div>
      <div className="dp-body">
        <p className="dp-h">프리미엄 이용 중이에요 ✨</p><p className="dp-p">이번 달에 혜택으로 12,400원을 아꼈어요.</p><Spacer />
        <button className="btn" data-act="trap" onClick={() => act('trap')}>혜택 계속 누리기</button>{tiny('다른 옵션')}
      </div>
    </>,
    <>
      <div className="dp-bar">‹ 잠깐만요</div>
      <div className="dp-body">
        <p className="dp-h">정말 떠나시겠어요? 😢</p><p className="dp-p">지금 해지하면 쌓아온 혜택 12개와 포인트가 모두 사라져요.</p><Spacer />
        <button className="btn" data-act="trap" onClick={() => act('trap')}>남을게요</button>{tiny('그래도 해지할래요')}
      </div>
    </>,
  ]

  const demo = useDemo({
    reset() { setV('bad'); resetBad(); resetGood() },
    async play(c) {
      for (let i = 0; i < 4; i++) { await c.press(box.current, bad.current?.querySelector<HTMLElement>('[data-act="next"]') ?? null); await c.sleep(800) }
      await c.sleep(900); setV('good'); await c.sleep(600)
      await c.press(box.current, good.current?.querySelector<HTMLElement>('[data-g="open"]') ?? null); await c.sleep(800)
      await c.press(box.current, good.current?.querySelector<HTMLElement>('[data-g="ok"]') ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="darkpattern-cancel" num="01" title="숨은 해지" en="Roach Motel" desc="가입은 버튼 하나인데, 해지는 여러 화면 속에 숨겨 둬요." demo={demo}>
      <Stage log={log} logId="darkpattern-cancel-log">
        <DpSeg value={v} onChange={setV} />
        <div className="box left dp-box" ref={box}>
          <Pane v="bad" cur={v} sub="해지 버튼을 찾아보세요">
            <div className="dp-scr" id="darkpattern-cancel-bad" ref={bad}>
              {step < 4 ? screens[step] : (
                <div className="dp-done">
                  <span className="em">😮‍💨</span><p className="dp-h">드디어 해지했어요</p>
                  <p className="dp-p">4개 화면 · 클릭 {clicks}번 · {sec}초</p>
                  <button className="btn ghost sm" data-act="restart" onClick={() => { resetBad(); setLog(<>작은 글씨 사이에서 <b>해지 버튼</b>을 찾아보세요</>) }}>처음부터</button>
                </div>
              )}
            </div>
          </Pane>
          <Pane v="good" cur={v} sub="가입한 곳에서 바로 해지">
            <div className="dp-scr" id="darkpattern-cancel-good" ref={good}>
              <div className="dp-bar">내 멤버십</div>
              {gs === 'done' ? (
                <div className="dp-done">
                  <span className="em">👋</span><p className="dp-h">해지됐어요</p><p className="dp-p">12월 1일까지는 그대로 쓸 수 있어요.</p>
                  <button className="btn ghost sm" data-g="restart" onClick={() => gAct('restart')}>다시 가입</button>
                </div>
              ) : (
                <div className="dp-body">
                  <p className="dp-h">프리미엄 · 월 9,900원</p><p className="dp-p">다음 결제일 12월 1일</p>
                  {gs === 'confirm' ? (
                    <div className="dp-noti">
                      <b>해지할까요?</b><span>남은 기간(12월 1일까지)은 계속 이용할 수 있어요.</span>
                      <div className="row">
                        <button className="btn ghost sm" data-g="back" onClick={() => gAct('back')}>취소</button>
                        <button className="btn danger sm" data-g="ok" onClick={() => gAct('ok')}>해지하기</button>
                      </div>
                    </div>
                  ) : (
                    <><Spacer /><button className="btn ghost" data-g="open" onClick={() => gAct('open')}>멤버십 해지</button></>
                  )}
                </div>
              )}
            </div>
          </Pane>
        </div>
      </Stage>
      <Info
        spec={[['유형', '방해 · Obstruction'], ['피해', '시간 · 돈'], ['대안', '1~2번 클릭 해지']]}
        usage={[
          ['징후', '해지 메뉴가 ‘기타’ 속에 있고, 큰 버튼은 늘 ‘계속 이용’이에요'],
          ['주의', '가입만큼 쉬운 해지는 국내외 전자상거래·소비자 보호 규제가 요구하는 경우가 많아요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 미리 체크된 동의 ---------- */
const AGREE = [
  { n: '이용약관', req: true },
  { n: '마케팅 수신', req: false },
  { n: '제휴사 3곳 정보 제공', req: false },
]
const B_LABELS = ['이용약관 동의', '혜택 소식 받기', '서비스 개선을 위해 제휴사에 정보를 제공하는 데 동의합니다']
const G_LABELS: [string, string][] = [['[필수]', '이용약관 동의'], ['[선택]', '마케팅 정보 수신'], ['[선택]', '제휴사 3곳에 정보 제공']]
const B_INIT = [true, true, true]

export function Precheck() {
  const [v, setView] = useState<V>('bad')
  const [bChk, setBChk] = useState(B_INIT)
  const [touched, setTouched] = useState<Set<number>>(new Set())
  const [bDone, setBDone] = useState(false)
  const [gChk, setGChk] = useState([false, false, false])
  const [gDone, setGDone] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>체크를 바꾸지 않고 <b>가입하기</b>를 눌러보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const bGo = useRef<HTMLButtonElement>(null)

  const setV = (nv: V) => {
    setView(nv)
    setBChk(B_INIT); setTouched(new Set()); setBDone(false); setGChk([false, false, false]); setGDone(false)
    setLog(nv === 'bad' ? <>체크를 바꾸지 않고 <b>가입하기</b>를 눌러보세요</> : <>모두 꺼져 있어요 — <b>필수</b>만 켜도 가입돼요</>)
  }
  const bChange = (i: number, on: boolean) => {
    setBChk(c => c.map((x, j) => (j === i ? on : x)))
    setTouched(t => new Set(t).add(i)); setBDone(false)
    setLog(on ? <><b>{AGREE[i].n}</b> 다시 켜짐</> : <><b>{AGREE[i].n}</b> 직접 껐어요 — 원래는 켜져 있었어요</>)
  }
  const bSubmit = () => {
    const picked = AGREE.filter((a, i) => bChk[i] && !a.req && !touched.has(i)).map(a => a.n)
    setBDone(true)
    setLog(picked.length
      ? <>가입 완료 — 고른 적 없는 <b>{picked.join(', ')}</b>에도 동의됐어요</>
      : <>가입 완료 — 동의 항목: <b>{AGREE.filter((_, i) => bChk[i]).map(a => a.n).join(', ') || '없음'}</b></>)
  }
  const gChange = (i: number, on: boolean) => {
    setGChk(c => c.map((x, j) => (j === i ? on : x))); setGDone(false)
    const a = AGREE[i]
    setLog(a.req ? (on ? <><b>필수</b>에 동의하면 가입할 수 있어요</> : <>필수 동의가 있어야 가입돼요</>)
      : <><b>{a.n}</b> {on ? '직접 켰어요' : '꺼짐 — 꺼도 가입에 지장 없어요'}</>)
  }
  const gSubmit = () => {
    const sel = AGREE.filter((a, i) => gChk[i] && a.n !== '이용약관').map(a => a.n)
    setGDone(true)
    setLog(<>가입 완료 — 선택 동의: <b>{sel.length ? sel.join(', ') : '없음'}</b> (내가 고른 것만)</>)
  }

  const demo = useDemo({
    reset() { setV('bad') },
    async play(c) { await c.sleep(500); await c.press(box.current, bGo.current); await c.sleep(400) },
  })

  return (
    <Card id="darkpattern-precheck" num="02" title="미리 체크된 동의" en="Preselection" desc="선택 항목에 체크를 미리 해 두고, 그대로 넘어가게 만들어요." demo={demo}>
      <Stage log={log} logId="darkpattern-precheck-log">
        <DpSeg value={v} onChange={setV} />
        <div className="box left dp-box" ref={box}>
          <Pane v="bad" cur={v} sub="회원가입">
            <div className="dp-scr"><div className="dp-body">
              <p className="dp-h">거의 다 됐어요! 🎉</p>
              <p className="dp-p">아래 버튼만 누르면 가입이 끝나요.</p>
              <div className="dp-opts" id="darkpattern-precheck-bad">
                {AGREE.map((a, i) => (
                  <label key={a.n} className={'opt' + (i === 2 ? ' fine' : '')}>
                    <input type="checkbox" checked={bChk[i]} data-n={a.n} onChange={e => bChange(i, e.target.checked)} /> {B_LABELS[i]}
                  </label>
                ))}
              </div>
              <Spacer />
              <button className="btn" id="darkpattern-precheck-bgo" ref={bGo} disabled={bDone} onClick={bSubmit}>{bDone ? '✓ 가입 완료' : '가입하기'}</button>
            </div></div>
          </Pane>
          <Pane v="good" cur={v} sub="회원가입">
            <div className="dp-scr"><div className="dp-body">
              <p className="dp-h">약관을 확인해 주세요</p>
              <p className="dp-p">필수만 동의해도 가입할 수 있어요.</p>
              <div className="dp-opts" id="darkpattern-precheck-good">
                {AGREE.map((a, i) => (
                  <label key={a.n} className="opt">
                    <input type="checkbox" checked={gChk[i]} data-n={a.n} onChange={e => gChange(i, e.target.checked)} /> <span><span className="dp-tag">{G_LABELS[i][0]}</span> {G_LABELS[i][1]}</span>
                  </label>
                ))}
              </div>
              <Spacer />
              <button className="btn" id="darkpattern-precheck-ggo" disabled={!gChk[0] || gDone} onClick={gSubmit}>{gDone ? '✓ 가입 완료' : '가입하기'}</button>
            </div></div>
          </Pane>
        </div>
      </Stage>
      <Info
        spec={[['유형', '몰래 동의 · Preselection'], ['피해', '개인정보'], ['대안', '선택은 꺼둔 채로']]}
        usage={[
          ['징후', '[필수]/[선택] 표시가 없고, 선택 항목이 이미 켜져 있거나 글씨가 유난히 작아요'],
          ['주의', '선택 동의를 기본으로 켜두는 방식은 국내외 개인정보 보호 규제 대상이 될 수 있어요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 가짜 마감 시계 ---------- */
const START = 20

export function Timer() {
  const [v, setView] = useState<V>('bad')
  const [left, setLeft] = useState(START)
  const [vis, setVis] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>시계가 0이 될 때까지 기다리거나 <b>새로고침</b>해 보세요</>)
  const leftRef = useRef(START)
  const loops = useRef(0)
  const reloads = useRef(0)
  const box = useRef<HTMLDivElement>(null)
  const dig = useRef<HTMLDivElement>(null)
  const bBody = useRef<HTMLDivElement>(null)
  const gBody = useRef<HTMLDivElement>(null)
  const reloadBtn = useRef<HTMLButtonElement>(null)
  useSeen(box, setVis)

  const run = vis && v === 'bad'
  // 보이는 동안 + 다크 패턴 화면일 때만 1초마다 감소
  useIntervalWhen(run, () => {
    leftRef.current--
    if (leftRef.current <= 0) {
      leftRef.current = START; loops.current++; flash(dig.current)
      setLog(<>0초가 됐는데 <b>다시 20초</b>로 돌아갔어요 ({loops.current}번째) — 마감이 없는 가짜 시계예요</>)
    }
    setLeft(leftRef.current)
  })

  const setV = (nv: V) => {
    setView(nv); leftRef.current = START; setLeft(START); loops.current = 0; reloads.current = 0
    setLog(nv === 'bad' ? <>시계가 0이 될 때까지 기다리거나 <b>새로고침</b>해 보세요</> : <>시·분·초 대신 <b>실제 종료 일시</b>를 보여줘요</>)
  }
  const buy = () => setLog(v === 'bad' ? <>시계에 쫓겨 <b>비교 없이</b> 결제 버튼을 눌렀어요</> : <>기간을 알고 <b>충분히 비교한 뒤</b> 사요</>)

  const demo = useDemo({
    reset() { setV('bad') },
    async play(c) { await c.sleep(2600); await c.press(box.current, reloadBtn.current); await c.sleep(400) },
  })

  return (
    <Card id="darkpattern-timer" num="03" title="가짜 마감 시계" en="Fake Countdown" desc="곧 끝난다며 재촉하지만, 0이 되거나 새로고침하면 다시 처음부터예요." demo={demo}>
      <Stage log={log} logId="darkpattern-timer-log">
        <DpSeg value={v} onChange={setV} />
        <div className="box left dp-box" ref={box}>
          <Pane v="bad" cur={v} sub="특가 페이지">
            <div className="dp-scr">
              <div className="dp-bar">⚡ 오늘만 특가<Spacer />
                <button className="btn ghost sm" id="darkpattern-timer-breload" ref={reloadBtn} onClick={() => {
                  reloads.current++; leftRef.current = START; setLeft(START); flash(bBody.current)
                  setLog(<>새로고침했더니 시계가 <b>다시 00:00:20</b>부터 ({reloads.current}번째)</>)
                }}>↻ 새로고침</button>
              </div>
              <div className="dp-body" id="darkpattern-timer-bbody" ref={bBody}>
                <div className="dp-prod"><span className="dp-thumbimg">🎧</span><div><b>노이즈캔슬링 헤드폰</b><small><s>189,000원</s> → 56,700원</small></div></div>
                <p className="dp-hot" style={{ textAlign: 'center', margin: '4px 0 0' }}>⏰ 특가 종료까지</p>
                <div className="dp-digits" id="darkpattern-timer-digits" ref={dig}>00:00:{String(left).padStart(2, '0')}</div>
                <p className="dp-p" style={{ textAlign: 'center' }}>놓치면 다시 오지 않는 가격이에요!</p>
                <Spacer />
                <button className="btn danger" data-buy="1" onClick={buy}>지금 바로 구매</button>
              </div>
            </div>
          </Pane>
          <Pane v="good" cur={v} sub="특가 페이지">
            <div className="dp-scr">
              <div className="dp-bar">🍂 가을 정기 세일<Spacer />
                <button className="btn ghost sm" id="darkpattern-timer-greload" onClick={() => {
                  flash(gBody.current)
                  setLog(<>새로고침해도 <b>마감일은 11월 15일</b> 그대로예요</>)
                }}>↻ 새로고침</button>
              </div>
              <div className="dp-body" id="darkpattern-timer-gbody" ref={gBody}>
                <div className="dp-prod"><span className="dp-thumbimg">🎧</span><div><b>노이즈캔슬링 헤드폰</b><small><s>189,000원</s> → 151,200원</small></div></div>
                <div className="dp-noti good"><b>📅 세일 기간</b><span>11월 8일 ~ 11월 15일 23:59 · 7일 남았어요</span></div>
                <p className="dp-p">세일이 끝나면 정가로 돌아가요. 다음 세일 일정은 알림으로 알려드려요.</p>
                <Spacer />
                <button className="btn" data-buy="1" onClick={buy}>구매하기</button>
              </div>
            </div>
          </Pane>
        </div>
      </Stage>
      <Info
        spec={[['유형', '긴급성 · Fake Urgency'], ['피해', '돈'], ['대안', '실제 종료 일시']]}
        usage={[
          ['징후', '시·분·초까지 촉박하게 세는데 날짜가 없고, 다시 들어오면 시간이 되돌아가요'],
          ['주의', '사실과 다른 마감 표시는 국내외 전자상거래·소비자 보호 규제 대상이 될 수 있어요'],
        ]}
      />
    </Card>
  )
}

/** on일 때만 1초 간격으로 fn 실행 (최신 fn 사용) */
function useIntervalWhen(on: boolean, fn: () => void) {
  const f = useRef(fn)
  f.current = fn
  useEffect(() => {
    if (!on) return
    const id = window.setInterval(() => f.current(), 1000)
    return () => clearInterval(id)
  }, [on])
}
