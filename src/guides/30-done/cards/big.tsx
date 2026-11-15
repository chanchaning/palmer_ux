import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, Seg } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { CheckSvg, Knob } from '../shared'
import { reduced, useRun } from '../util'

/* ---------- 08 컨페티 ---------- */
const CF_COLORS = ['var(--accent)', 'var(--b)', 'var(--ok)', 'var(--dn-yellow)', 'var(--dn-pink)']
type Calm = 'auto' | 'on'
export function Confetti() {
  const m = useMotion()
  const [amount, setAmount] = useState(60)
  const [calm, setCalm] = useState<Calm>('auto')
  const [cheer, setCheer] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>마지막 책을 <b>다 읽음</b>으로 표시해 보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const head = useRef<HTMLDivElement>(null)
  const made = useRef(new Set<HTMLElement>())

  // 화면을 떠나면 남은 조각을 모두 치워요
  useEffect(() => {
    const set = made.current
    return () => { set.forEach(e => e.remove()); set.clear() }
  }, [])

  const clear = () => { made.current.forEach(e => e.remove()); made.current.clear() }
  const burst = (n = amount, c = calm) => {
    const host = layer.current
    if (!host) return
    clear()
    setCheer(true)
    if (c === 'on' || reduced()) {
      if (head.current) m.A(head.current, [{ opacity: 0.4, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], 420, EASE.out)
      setLog(<>동작 줄이기 · 조각 대신 <b>글자와 테두리가 부드럽게</b> 밝아져요</>)
      return
    }
    const W = host.clientWidth, H = host.clientHeight
    setLog(<>조각 <b>{n}개</b>를 뿌렸어요{n >= 150 ? ' · 글자를 가리고 느린 폰에선 끊겨요' : n <= 20 ? ' · 적어도 축하는 충분히 전해져요' : ''}</>)
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i')
      const left = i % 2 === 0
      el.className = 'dn-cf' + (i % 3 === 0 ? ' round' : '')
      el.style.background = CF_COLORS[i % CF_COLORS.length]
      el.style.left = (left ? 8 : W - 16) + 'px'
      el.style.top = H - 20 + 'px'
      host.appendChild(el)
      made.current.add(el)
      const dx = (left ? 1 : -1) * (0.2 + Math.random() * 0.55) * W
      const up = -(0.45 + Math.random() * 0.45) * H
      const rot = (Math.random() - 0.5) * 900
      const a = el.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(.6)', opacity: 1 },
        { transform: `translate(${dx * 0.7}px, ${up}px) rotate(${rot * 0.5}deg) scale(1)`, opacity: 1, offset: 0.4, easing: 'cubic-bezier(.3,0,.7,1)' },
        { transform: `translate(${dx}px, ${up + H * 0.85}px) rotate(${rot}deg) scale(1)`, opacity: 0 },
      ], { duration: m.D(1400 + Math.random() * 700), easing: 'cubic-bezier(.1,.6,.3,1)', delay: m.D(Math.random() * 120), fill: 'both' })
      a.onfinish = () => {
        el.remove()
        made.current.delete(el)
        if (made.current.size === 0) setLog(<>조각 {n}개가 다 떨어져 <b>모두 치웠어요</b> · 남은 조각 0개</>)
      }
    }
  }
  const demo = useDemo({
    reset() { clear(); setCheer(false) },
    async play(c) { await c.press(box.current, btn.current); await c.sleep(2400) },
  })
  return (
    <Card id="done-confetti" num="08" title="컨페티" en="Confetti" demo={demo}
      desc="색종이 조각이 양옆에서 터져 올랐다 떨어져요. 오래 기다린 큰 목표에만 쓰는 축하예요.">
      <Stage log={log}>
        <div className="box dn-box dn-cf-host" ref={box}>
          <div className="dn-cf-layer" ref={layer} aria-hidden="true" />
          <div className={'dn-goal' + (cheer ? ' cheer' : '')} ref={head}>
            <small>이번 달 목표</small>
            <b>{cheer ? '책 10권, 다 읽었어요!' : '책 10권 읽기'}</b>
            <div className="dn-goal-bar"><i style={{ width: cheer ? '100%' : '90%' }} /></div>
            <span>{cheer ? '10 / 10권' : '9 / 10권'}</span>
          </div>
          <button className="btn" ref={btn} onClick={() => burst()}>마지막 책 다 읽음</button>
          <div className="dn-ctrl">
            <Knob label="양"><Seg value={amount} onChange={v => { setAmount(v); burst(v) }} options={[[20, '20개'], [60, '60개'], [150, '150개']]} /></Knob>
            <Knob label="동작 줄이기"><Seg value={calm} onChange={v => { setCalm(v); burst(amount, v) }} options={[['auto', '기기 설정대로'], ['on', '켠 것처럼']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['시간', '1.5–2초'], ['조각', '40–80개'], ['뒤처리', '끝나면 모두 제거']]}
        usage={[
          ['언제', '첫 주문, 한 달 목표 달성, 강의 수료처럼 드물고 큰 완료 — 한 흐름에 딱 한 번'],
          ['실무', '조각은 끝나면 꼭 지워요(DOM이나 canvas 정리). 다른 버튼을 가리지 않게 pointer-events: none 으로 띄워요.'],
          ['주의', '동작 줄이기를 켠 사람에게는 날아다니는 조각 대신 조용한 표시로 바꿔요. 매일 하는 일에 터뜨리면 금방 귀찮아져요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 완료 화면 ---------- */
type Scr = 'cart' | 'paying' | 'done' | 'history' | 'home'
type Ver = 'good' | 'bad'
export function SuccessScreen() {
  const [scr, setScr] = useState<Scr>('cart')
  const [ver, setVer] = useState<Ver>('good')
  const { run, stop } = useRun()
  const dev = useRef<HTMLDivElement>(null)
  const pay = () => run(async sl => {
    setScr('paying'); await sl(900); setScr('done')
  })
  const restart = () => { stop(); setScr('cart') }
  const demo = useDemo({
    reset() { stop(); setScr('cart') },
    async play(c) {
      await c.press(dev.current, dev.current?.querySelector('.dn-pay') ?? null)
      await c.sleep(2600)
    },
  })
  const logs: Record<Scr, ReactNode> = {
    cart: <>결제 버튼을 눌러 <b>완료 화면</b>까지 가 보세요</>,
    paying: <>결제하는 중…</>,
    done: ver === 'good' ? <><b>무엇이 · 언제 · 다음에 뭘</b> 하면 되는지 한 화면에 있어요</> : <>‘완료되었습니다’뿐 · <b>무엇을 언제 받는지</b> 알 수 없어요</>,
    history: <>다음 행동으로 <b>바로 이어졌어요</b></>,
    home: <>홈으로 튕겼어요 · 주문이 됐는지 <b>다시 찾아봐야</b> 해요</>,
  }
  return (
    <Card id="done-screen" num="09" title="완료 화면" en="Success Screen" demo={demo}
      desc="긴 흐름의 끝에 결과를 정리해 보여주는 한 화면이에요. 축하보다 ‘다음에 뭘 하면 되는지’가 중요해요.">
      <Stage log={logs[scr]}>
        <Device ref={dev}>
          <div className="scr">
            {(scr === 'cart' || scr === 'paying') && (
              <>
                <div className="bar">주문서</div>
                <div className="dn-scr">
                  <div className="dn-line"><span>유기농 방울토마토 500g</span><b>8,900원</b></div>
                  <div className="dn-line"><span>그릭요거트 4개입</span><b>23,500원</b></div>
                  <div className="dn-line sub"><span>배송비</span><b>0원</b></div>
                  <div className="dn-line total"><span>합계</span><b>32,400원</b></div>
                  <div className="dn-ship">받는 곳 · 집 (현관 앞)<br />내일 아침 7시 전 도착</div>
                  <button className="btn dn-pay" onClick={pay} disabled={scr === 'paying'} aria-busy={scr === 'paying'}>
                    {scr === 'paying' ? <><span className="dn-spin sm" aria-hidden="true" /> 결제하는 중</> : '32,400원 결제하기'}
                  </button>
                </div>
              </>
            )}
            {scr === 'done' && ver === 'good' && (
              <div className="dn-scr dn-ok-scr" role="status">
                <CheckSvg size={64} className="draw" />
                <h3>주문했어요</h3>
                <p>내일(화) 아침 7시 전에<br />문 앞에 둘게요.</p>
                <dl className="dn-sum">
                  <div><dt>주문 번호</dt><dd>PL-1115-0412</dd></div>
                  <div><dt>결제</dt><dd>32,400원 · 카드</dd></div>
                  <div><dt>받는 곳</dt><dd>집 (현관 앞)</dd></div>
                </dl>
                <div className="dn-next">
                  <button className="btn" onClick={() => setScr('history')}>주문 내역 보기</button>
                  <button className="btn ghost" onClick={() => setScr('home')}>쇼핑 계속하기</button>
                </div>
              </div>
            )}
            {scr === 'done' && ver === 'bad' && (
              <div className="dn-scr dn-ok-scr bad" role="status">
                <p className="dn-bad-t">결제가 완료되었습니다.</p>
                <div className="dn-next"><button className="btn" onClick={() => setScr('home')}>확인</button></div>
              </div>
            )}
            {scr === 'history' && (
              <>
                <div className="bar">주문 내역</div>
                <div className="dn-scr">
                  <div className="dn-order"><b>방울토마토 외 1건</b><span className="dn-tag">주문 접수</span><small>PL-1115-0412 · 내일 아침 도착</small></div>
                  <button className="btn ghost sm dn-again" onClick={restart}>처음부터 다시</button>
                </div>
              </>
            )}
            {scr === 'home' && (
              <>
                <div className="bar">홈</div>
                <div className="dn-scr">
                  <div className="dn-home">오늘의 추천 상품</div>
                  <div className="dn-home sm" />
                  <div className="dn-home sm" />
                  <button className="btn ghost sm dn-again" onClick={restart}>처음부터 다시</button>
                </div>
              </>
            )}
          </div>
        </Device>
        <div className="dn-ctrl center">
          <Knob label="완료 화면"><Seg value={ver} onChange={v => { setVer(v); if (scr !== 'cart' && scr !== 'paying') setScr('done') }} options={[['good', '잘 만든 예'], ['bad', '아쉬운 예']]} /></Knob>
        </div>
      </Stage>
      <Info
        spec={[['구성', '결과 · 요약 · 다음 행동'], ['버튼', '주 1개 + 보조 1개'], ['체크', '0.5초 안']]}
        usage={[
          ['언제', '결제, 가입, 예약, 신청서 제출처럼 여러 단계를 거친 흐름의 마지막'],
          ['실무', '주문 번호·도착 시간처럼 나중에 다시 찾을 정보를 보여주고, 같은 내용을 문자·메일로도 보내요. 뒤로 가기로 결제가 다시 되지 않게 막아요.'],
          ['주의', '사람은 경험을 가장 좋았던 순간과 마지막으로 기억해요(피크엔드 법칙). 끝 화면이 ‘완료되었습니다 + 확인’뿐이면 전체가 밋밋하게 남아요.'],
        ]}
      />
    </Card>
  )
}
