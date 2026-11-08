import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { DpSeg, Pane, Spacer, useSeen, won, type V } from '../shared'

/* ---------- 07 숨은 비용 ---------- */
const ALL: [string, number][] = [['🎫 공연 티켓 1매', 29000], ['🚚 티켓 배송비', 3500], ['예매 수수료', 2900], ['결제 수수료', 1500]]
const TITLES = ['좌석 확인', '배송 정보', '결제']
const BAD_N = [1, 2, 4]
const DRIP_INIT = <><b>다음</b>을 눌러 결제까지 가면서 금액을 지켜보세요</>

const dripTotal = (v: V, s: number) => ALL.slice(0, v === 'bad' ? BAD_N[s] : 4).reduce((a, l) => a + l[1], 0)

function DripScreen({ v, s, onNext, onRestart }: { v: V; s: number; onNext: () => void; onRestart: () => void }) {
  if (s > 2) {
    return (
      <div className="dp-done">
        <span className="em">{v === 'bad' ? '😠' : '🙂'}</span>
        <p className="dp-h">결제 완료 · {won(36900)}</p>
        <p className="dp-p">{v === 'bad' ? '처음 본 금액은 29,000원이었어요' : '처음 본 금액 그대로예요'}</p>
        <button className="btn ghost sm" data-act="restart" onClick={onRestart}>처음으로</button>
      </div>
    )
  }
  const n = v === 'bad' ? BAD_N[s] : 4, prevN = v === 'bad' && s > 0 ? BAD_N[s - 1] : n
  const lines = ALL.slice(0, n)
  return (
    <>
      <div className="dp-steps">{TITLES.map((t, i) => <span key={t} className={i <= s ? 'on' : undefined} />)}</div>
      <p className="dp-h">{s + 1}. {TITLES[s]}</p>
      {lines.map((l, i) => (
        <div key={l[0]} className={'dp-line' + (i >= prevN ? ' new' : '')}>
          <span>{l[0]}{i >= prevN && <> <small className="dp-new">새로 생김</small></>}</span><span>{won(l[1])}</span>
        </div>
      ))}
      <div className="dp-line sum"><span>{v === 'good' ? '총 결제 금액 (모두 포함)' : '결제 금액'}</span><span>{won(dripTotal(v, s))}</span></div>
      {v === 'bad' && s === 2 && <p className="dp-fine">* 수수료는 결제 단계에서 부과돼요</p>}
      <Spacer />
      <button className={'btn' + (s === 2 ? ' orange' : '')} data-act="next" onClick={onNext}>{s === 2 ? '결제하기' : '다음 →'}</button>
    </>
  )
}

export function Drip() {
  const [v, setView] = useState<V>('bad')
  const [st, setSt] = useState<Record<V, number>>({ bad: 0, good: 0 })
  const [log, setLog] = useState<ReactNode>(DRIP_INIT)
  const box = useRef<HTMLDivElement>(null)
  const bad = useRef<HTMLDivElement>(null)

  const setV = (nv: V) => {
    setView(nv); setSt({ bad: 0, good: 0 })
    setLog(nv === 'bad' ? DRIP_INIT : <>첫 화면부터 <b>모든 비용을 포함한 총액</b>이 보여요</>)
  }
  const next = (s: V) => {
    const n = st[s] + 1
    setSt(o => ({ ...o, [s]: n }))
    if (s === 'bad') {
      if (n === 1) setLog(<>배송 단계에서 <b>배송비 +3,500원</b>이 생겼어요</>)
      else if (n === 2) setLog(<>결제 직전 수수료 2개 — 처음보다 <b>+7,900원 (27%)</b></>)
      else setLog(<>29,000원짜리라 생각하고 <b>36,900원</b>을 냈어요</>)
    } else setLog(n > 2 ? <>처음부터 끝까지 <b>36,900원</b> — 놀랄 일이 없어요</> : <>단계가 바뀌어도 총액 <b>{won(dripTotal('good', n))}</b> 그대로</>)
  }
  const restart = (s: V) => { setSt(o => ({ ...o, [s]: 0 })); setLog(DRIP_INIT) }

  const demo = useDemo({
    reset() { setV('bad') },
    async play(c) {
      for (let i = 0; i < 2; i++) { await c.sleep(900); await c.press(box.current, bad.current?.querySelector<HTMLElement>('[data-act="next"]') ?? null) }
      await c.sleep(400)
    },
  })

  return (
    <Card id="darkpattern-drip" num="07" title="숨은 비용" en="Drip Pricing" desc="처음엔 싸 보이게 하고, 결제 직전 단계마다 수수료를 하나씩 붙여요." demo={demo}>
      <Stage log={log} logId="darkpattern-drip-log">
        <DpSeg value={v} onChange={setV} />
        <div className="box left dp-box" ref={box}>
          {(['bad', 'good'] as const).map(s => (
            <Pane key={s} v={s} cur={v} sub="공연 예매">
              <div className="dp-scr"><div className="dp-body" id={'darkpattern-drip-' + s} ref={s === 'bad' ? bad : undefined}>
                <DripScreen v={s} s={st[s]} onNext={() => next(s)} onRestart={() => restart(s)} />
              </div></div>
            </Pane>
          ))}
        </div>
      </Stage>
      <Info
        spec={[['유형', '숨은 비용 · Hidden Costs'], ['피해', '돈 · 시간'], ['대안', '첫 화면에 총액']]}
        usage={[
          ['징후', '마지막 단계에서야 ‘수수료’, ‘서비스 이용료’ 같은 줄이 새로 생겨요'],
          ['주의', '총액을 처음에 알리지 않는 방식은 국내외 전자상거래·소비자 보호 규제 대상이 될 수 있어요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 몰래 자동결제 ---------- */
const AUTO_BAD_INIT = <>무료 체험을 시작하고 <b>⏩ 시간을 빨리 감아</b> 보세요</>
const AUTO_GOOD_INIT = <>체험 조건이 <b>큰 글씨</b>로 먼저 보여요</>
type GS = 'intro' | 'trial' | 'notice' | 'kept' | 'cancelled'

export function Autopay() {
  const [v, setView] = useState<V>('bad')
  const [bs, setBs] = useState<'intro' | 'trial' | 'charged'>('intro')
  const [gs, setGs] = useState<GS>('intro')
  const [log, setLog] = useState<ReactNode>(AUTO_BAD_INIT)
  const box = useRef<HTMLDivElement>(null)
  const bad = useRef<HTMLDivElement>(null)

  const setV = (nv: V) => { setView(nv); setBs('intro'); setGs('intro'); setLog(nv === 'bad' ? AUTO_BAD_INIT : AUTO_GOOD_INIT) }
  const big = (e: string) => <div style={{ fontSize: 31, lineHeight: 1 }}>{e}</div>

  const badBody = bs === 'intro' ? (
    <>
      {big('🎬')}<p className="dp-h" style={{ fontSize: 19 }}>7일 동안 전부 무료!</p><p className="dp-p">영화·드라마를 마음껏 보세요.</p><Spacer />
      <button className="btn" data-act="start" onClick={() => { setBs('trial'); setLog(<>무료로 시작 — 작은 글씨의 <b>연 119,000원</b>은 못 봤을 거예요</>) }}>지금 무료로 시작</button>
      <p className="dp-fine">체험 종료 후 연간 이용권(119,000원)이 등록된 결제 수단으로 자동 결제되며, 별도 안내는 제공되지 않습니다.</p>
    </>
  ) : bs === 'trial' ? (
    <>
      <p className="dp-h">무료 체험 1일차 🍿</p><p className="dp-p">결제 예정 안내는 어디에도 없어요.</p>
      <div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} /><Spacer />
      <button className="btn ghost" data-act="ff" onClick={() => { setBs('charged'); setLog(<>미리 알림 없이 <b>119,000원</b>이 빠져나갔어요</>) }}>⏩ 7일 뒤로 빨리 감기</button>
    </>
  ) : (
    <>
      <p className="dp-h">체험 8일차</p>
      <div className="dp-noti bad"><b>💳 119,000원 결제 완료</b><span>연간 이용권 · 환불은 고객센터로 문의</span></div>
      <p className="dp-p">미리 알림 한 번 없었어요.</p><Spacer />
      <button className="btn ghost sm" data-act="restart" onClick={() => { setBs('intro'); setLog(AUTO_BAD_INIT) }}>처음부터</button>
    </>
  )

  const g = (s: GS, l: ReactNode) => () => { setGs(s); setLog(l) }
  const goodBody = gs === 'intro' ? (
    <>
      {big('🎬')}<p className="dp-h" style={{ fontSize: 19 }}>7일 무료 체험</p>
      <div className="dp-noti"><span>체험 후 <b>월 9,900원</b> · 언제든 해지</span><span>📩 결제 3일 전에 꼭 알려드려요</span></div><Spacer />
      <button className="btn" data-act="start" onClick={g('trial', <>시작할 때 <b>금액·날짜</b>를 정확히 알고 있어요</>)}>7일 무료 체험 시작</button>
    </>
  ) : gs === 'trial' ? (
    <>
      <p className="dp-h">무료 체험 1일차 🍿</p><p className="dp-p">첫 결제 예정일: 11월 15일 · 9,900원</p>
      <div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} /><Spacer />
      <button className="btn ghost" data-act="ff" onClick={g('notice', <>결제 <b>3일 전 알림</b> — 계속할지 내가 정해요</>)}>⏩ 4일 뒤로 빨리 감기</button>
    </>
  ) : gs === 'notice' ? (
    <>
      <p className="dp-h">체험 5일차</p>
      <div className="dp-noti good">
        <b>📩 3일 뒤 무료 체험이 끝나요</b><span>11월 15일에 9,900원이 결제돼요. 계속 쓸까요?</span>
        <div className="row">
          <button className="btn ghost sm" data-act="cancel" onClick={g('cancelled', <>알림 덕분에 <b>결제 전에 해지</b>했어요</>)}>해지</button>
          <button className="btn sm" data-act="keep" onClick={g('kept', <><b>알고 고른</b> 결제라 불만이 없어요</>)}>계속 쓰기</button>
        </div>
      </div>
    </>
  ) : (
    <div className="dp-done">
      <span className="em">{gs === 'kept' ? '✅' : '👋'}</span>
      <p className="dp-h">{gs === 'kept' ? '구독을 이어가요' : '결제 전에 해지됐어요'}</p>
      <p className="dp-p">{gs === 'kept' ? '알고 선택한 결제예요' : '0원 — 청구되지 않아요'}</p>
      <button className="btn ghost sm" data-act="restart" onClick={g('intro', AUTO_GOOD_INIT)}>처음부터</button>
    </div>
  )

  const demo = useDemo({
    reset() { setV('bad') },
    async play(c) {
      const q = (s: string) => bad.current?.querySelector<HTMLElement>(s) ?? null
      await c.sleep(400); await c.press(box.current, q('[data-act="start"]')); await c.sleep(1300)
      await c.press(box.current, q('[data-act="ff"]')); await c.sleep(400)
    },
  })

  return (
    <Card id="darkpattern-autopay" num="08" title="몰래 자동결제" en="Forced Continuity" desc="무료 체험이 끝나면 아무 알림 없이 유료로 넘어가 돈이 빠져나가요." demo={demo}>
      <Stage log={log} logId="darkpattern-autopay-log">
        <DpSeg value={v} onChange={setV} />
        <div className="box left dp-box" ref={box}>
          <Pane v="bad" cur={v} sub="구독 앱">
            <div className="dp-scr"><div className="dp-body" id="darkpattern-autopay-bad" ref={bad}>{badBody}</div></div>
          </Pane>
          <Pane v="good" cur={v} sub="구독 앱">
            <div className="dp-scr"><div className="dp-body" id="darkpattern-autopay-good">{goodBody}</div></div>
          </Pane>
        </div>
      </Stage>
      <Info
        spec={[['유형', '강제 연장 · Forced Continuity'], ['피해', '돈'], ['대안', '결제 전 미리 알림']]}
        usage={[
          ['징후', '‘무료’는 크게, 체험 후 결제 금액과 주기는 아주 작게 적혀 있어요'],
          ['주의', '무료→유료 전환 전 고지 없이 결제하는 것은 국내외 전자상거래·소비자 보호 규제 대상이 될 수 있어요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 끝없는 권유 ---------- */
const GAP = 3000
const NAG_GOOD_INIT = <>거절 선택지가 <b>“다시 보지 않기”</b>로 분명해요</>

export function Nag() {
  const m = useMotion()
  const timers = useTimers()
  const [v, setView] = useState<V>('bad')
  const [n, setN] = useState(1)
  const [bOpen, setBOpen] = useState(true)
  const [gOpen, setGOpen] = useState(true)
  const [log, setLog] = useState<ReactNode>(<><b>나중에</b>를 눌러 팝업을 닫아보세요</>)
  const box = useRef<HTMLDivElement>(null)
  // 타이머·가시성 판단용 (IntersectionObserver 콜백에서 최신 값 필요)
  const r = useRef({ n: 1, to: 0, vis: false, view: 'bad' as V, done: false, pending: false, bOpen: true })

  const clear = () => { if (r.current.to) { timers.clear(r.current.to); r.current.to = 0 } }
  const schedule = () => {
    clear()
    const s = r.current
    if (!s.vis || s.view !== 'bad') { s.pending = true; return }
    s.pending = false
    s.to = timers.set(() => {
      s.to = 0; s.n++; s.bOpen = true
      setN(s.n); setBOpen(true)
      setLog(<>또 떴어요 — <b>{s.n}번째</b> 권유 · “나중에”는 거절이 아니었어요</>)
    }, m.D(GAP))
  }
  useSeen(box, on => {
    const s = r.current
    s.vis = on
    if (!on) { if (s.to) { clear(); s.pending = true } }
    else if (s.pending && s.view === 'bad' && !s.done && !s.bOpen) schedule()
  })

  const setV = (nv: V) => {
    const s = r.current
    clear(); s.pending = false; s.n = 1; s.done = false; s.bOpen = true; s.view = nv
    setView(nv); setN(1); setBOpen(true); setGOpen(true)
    setLog(nv === 'bad' ? <><b>나중에</b>를 눌러 팝업을 닫아보세요</> : NAG_GOOD_INIT)
  }
  const later = () => { r.current.bOpen = false; setBOpen(false); setLog(<>닫았지만 <b>3초 뒤</b> 다시 떠요…</>); schedule() }
  const allowBad = () => {
    const s = r.current
    s.bOpen = false; s.done = true; clear(); s.pending = false
    setBOpen(false); setLog(<>{s.n}번 만에 결국 <b>알림을 켰어요</b> — 원해서가 아니라 지쳐서예요</>)
  }

  const article = (extra: ReactNode) => (
    <div className="dp-body">
      <div className="fake-line" style={{ width: '70%' }} /><div className="fake-line" /><div className="fake-line" style={{ width: '85%' }} />
      <div style={{ height: 56, borderRadius: 10, background: 'var(--surface-2)' }} /><div className="fake-line" />
      {extra}
    </div>
  )

  const demo = useDemo({
    reset() { setV('bad') },
    async play(c) {
      const btn = () => box.current?.querySelector<HTMLElement>('[data-nag="bad"] [data-act="later"]') ?? null
      await c.sleep(500); await c.press(box.current, btn())
      await c.sleep(GAP + 800); await c.press(box.current, btn()); await c.sleep(400)
    },
  })

  return (
    <Card id="darkpattern-nag" num="09" title="끝없는 권유" en="Nagging" desc="“나중에”를 눌러도 몇 초 뒤 같은 요청이 다시 떠서, 지쳐서 허락하게 만들어요." demo={demo}>
      <Stage log={log} logId="darkpattern-nag-log">
        <DpSeg value={v} onChange={setV} />
        <div className="box left dp-box" ref={box}>
          <Pane v="bad" cur={v} sub={'권유 ' + n + '번째'} subId="darkpattern-nag-count">
            <div className="dp-scr" data-nag="bad">
              <div className="dp-bar">📰 오늘의 뉴스</div>
              {article(<div className="fake-line" style={{ width: '60%' }} />)}
              <div className="dp-ov" hidden={!bOpen}>
                <div className="dp-dlg">
                  <div style={{ fontSize: 27, lineHeight: 1 }}>🔔</div>
                  <p className="dp-h">알림을 켜주세요!</p>
                  <p className="dp-p">중요한 소식을 놓치고 있어요.</p>
                  <div className="row">
                    <button className="btn ghost" data-act="later" onClick={later}>나중에</button>
                    <button className="btn" data-act="allow" onClick={allowBad}>알림 켜기</button>
                  </div>
                </div>
              </div>
            </div>
          </Pane>
          <Pane v="good" cur={v} sub="한 번만 물어봐요">
            <div className="dp-scr" data-nag="good">
              <div className="dp-bar">📰 오늘의 뉴스</div>
              {article(<button className="btn ghost sm" data-act="again" style={{ marginTop: 'auto' }} onClick={() => { setGOpen(true); setLog(NAG_GOOD_INIT) }}>처음부터 다시 보기</button>)}
              <div className="dp-ov" hidden={!gOpen}>
                <div className="dp-dlg">
                  <div style={{ fontSize: 27, lineHeight: 1 }}>🔔</div>
                  <p className="dp-h">속보 알림을 받을까요?</p>
                  <p className="dp-p">하루 최대 2개만 보내요. 설정에서 언제든 바꿀 수 있어요.</p>
                  <div className="row">
                    <button className="btn ghost" data-act="never" onClick={() => { setGOpen(false); setLog(<><b>한 번 거절</b>하면 다시 묻지 않아요 — 기다려도 안 떠요</>) }}>다시 보지 않기</button>
                    <button className="btn" data-act="allow" onClick={() => { setGOpen(false); setLog(<>알림 허용 — <b>스스로 고른</b> 동의예요</>) }}>허용</button>
                  </div>
                </div>
              </div>
            </div>
          </Pane>
        </div>
      </Stage>
      <Info
        spec={[['유형', '반복 요청 · Nagging'], ['피해', '시간 · 개인정보'], ['대안', '다시 보지 않기']]}
        usage={[
          ['징후', '거절 선택지가 ‘나중에’뿐이고, 같은 요청이 화면을 계속 가려요'],
          ['주의', '반복된 권유로 받은 동의는 유효한 동의로 보기 어렵고, 개인정보 보호 규제에서 문제될 수 있어요'],
        ]}
      />
    </Card>
  )
}
