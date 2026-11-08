import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { EASE, useMotion } from '../../../lib/motion'
import { ABSeg, DpLink, View, abBtn, fmt, useAB } from '../shared'

/* ---------- 04 사회적 증거 ---------- */
export function Social() {
  const m = useMotion()
  const [n, setN] = useState(1234)
  const [log, setLog] = useState<ReactNode>(<>스펙만 보고 <b>혼자 판단</b>해야 해요</>)
  const ab = useAB(v => setLog(v === 'a' ? <>스펙만 보고 <b>혼자 판단</b>해야 해요</> : <><b>1,234명</b>이 샀다는 신호가 붙었어요</>))
  const box = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const nEl = useRef<HTMLElement>(null)
  const buy = useRef<HTMLButtonElement>(null)

  const onBuy = () => {
    if (ab.v === 'a') { setLog(<>담았어요 — 근거는 <b>스펙뿐</b>이라 확신이 덜해요</>); return }
    const nn = n + 1
    setN(nn)
    if (nEl.current) { m.clearA(nEl.current); m.A(nEl.current, [{ transform: 'scale(1)' }, { transform: 'scale(1.3)', color: 'var(--accent)' }, { transform: 'scale(1)' }], 400, EASE.out) }
    setLog(<><b>{fmt(nn)}번째</b> 구매 — ‘다들 샀다’는 신호가 결정을 쉽게 해요</>)
  }

  const demo = useDemo({
    reset() { setN(1234); ab.set('a', true) },
    async play(c) {
      await c.sleep(500); await c.press(seg.current?.parentElement ?? null, abBtn(seg.current, 'b')); await c.sleep(1100)
      await c.press(box.current, buy.current); await c.sleep(400)
    },
  })

  return (
    <Card id="bias-social" num="04" title="사회적 증거" en="Social Proof" desc="확신이 없을 때는 다른 사람들이 뭘 골랐는지를 보고 따라가요." demo={demo}>
      <Stage log={log} logId="bias-social-log">
        <ABSeg ab={ab} ref={seg} />
        <div className="box left bias-box" id="bias-social-box" data-ab={ab.v} ref={box}>
          <div className="bias-prod"><div className="bias-thumb">🎧</div><div className="nm"><b>무선 노이즈캔슬링 이어폰</b><span className="pr">89,000원</span></div></div>
          <View k="a" ab={ab}>
            <p className="bias-spec">블루투스 5.3 · 최대 30시간 재생 · 생활 방수</p>
            <p className="bias-spec">색상 2종 · 무료 배송</p>
          </View>
          <View k="b" ab={ab}>
            <div className="bias-stars"><span>★★★★★</span> 4.8 · 리뷰 312개</div>
            <div className="bias-proof"><span className="bias-avs"><i>김</i><i>이</i><i>박</i></span><span>이번 달 <b id="bias-social-n" ref={nEl}>{fmt(n)}</b>명이 구매했어요</span></div>
          </View>
          <button className="btn bias-cta" id="bias-social-buy" ref={buy} onClick={onBuy}>장바구니 담기</button>
        </div>
      </Stage>
      <Info
        spec={[['신호', '구매 수·리뷰'], ['효과', '불확실성 ↓'], ['쓰임', '상품·가입 화면']]}
        usage={[
          ['활용 팁', '실제 집계한 숫자와 기간(이번 달)을 함께 보여 주세요'],
          ['주의', <>숫자를 부풀리거나 가짜 ‘방금 구매’ 알림을 띄우면 기만이에요 · <DpLink /></>],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 희소성 ---------- */
export function Scarcity() {
  const m = useMotion()
  const [stock, setStock] = useState(3)
  const stockRef = useRef(3)
  stockRef.current = stock
  const [log, setLog] = useState<ReactNode>(<>남은 수량이 <b>안 보여요</b>. 여유롭게 비교해요</>)
  const ab = useAB(v => setLog(v === 'a' ? <>남은 수량이 <b>안 보여요</b>. 여유롭게 비교해요</> : <>실제 잔여 객실 <b>{stockRef.current}개</b>가 보여요 — 마음이 급해지죠</>))
  const box = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const btn = useRef<HTMLButtonElement>(null)

  const book = () => {
    if (!stock) return
    const s = stock - 1
    setStock(s)
    if (ab.v === 'b' && badge.current) { m.clearA(badge.current); m.A(badge.current, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], 360, EASE.out) }
    setLog(!s ? <><b>마감</b> — 숫자가 정말 줄어들 때만 정직한 희소성이에요</>
      : ab.v === 'a' ? <>예약했어요 — 남은 수량은 <b>몰라도</b> 괜찮았어요</>
        : <>실제 재고 <b>{s}개</b>로 줄었어요 — 진짜 숫자라 믿을 수 있어요</>)
  }

  const demo = useDemo({
    reset() { setStock(3); stockRef.current = 3; ab.set('a', true) },
    async play(c) {
      await c.sleep(500); await c.press(seg.current?.parentElement ?? null, abBtn(seg.current, 'b')); await c.sleep(1100)
      await c.press(box.current, btn.current); await c.sleep(400)
    },
  })

  return (
    <Card id="bias-scarcity" num="05" title="희소성" en="Scarcity" desc="얼마 남지 않았다고 느끼면 같은 물건도 더 가치 있어 보이고 서두르게 돼요." demo={demo}>
      <Stage log={log} logId="bias-scarcity-log">
        <ABSeg ab={ab} ref={seg} />
        <div className="box left bias-box" id="bias-scarcity-box" data-ab={ab.v} ref={box}>
          <div className="bias-prod"><div className="bias-thumb">🏨</div><div className="nm"><b>오션뷰 더블룸</b><span className="pr">1박 128,000원</span><span className="muted">11월 22일(토) · 2인</span></div></div>
          <View k="a" ab={ab}>
            <span className="bias-ok" id="bias-scarcity-avail">{stock ? '✓ 예약 가능' : '예약 마감'}</span>
          </View>
          <View k="b" ab={ab}>
            <div className="row" style={{ justifyContent: 'flex-start' }}>
              <span className="badge bias-hot" id="bias-scarcity-badge" ref={badge}>{stock ? stock + '개 남음' : '마감'}</span>
              <span className="bias-pips" id="bias-scarcity-pips">{[0, 1, 2].map(i => <i key={i} className={i >= stock ? 'off' : undefined} />)}</span>
            </div>
            <span className="muted">이 날짜의 실제 잔여 객실 수예요</span>
          </View>
          <button className="btn bias-cta" id="bias-scarcity-book" ref={btn} disabled={!stock} onClick={book}>{stock ? '예약하기' : '마감됐어요'}</button>
        </div>
      </Stage>
      <Info
        spec={[['신호', '남은 수량·기한'], ['효과', '긴급함 ↑'], ['쓰임', '재고·좌석·객실']]}
        usage={[
          ['활용 팁', '정말 한정된 재고·좌석일 때 실제 숫자를 알려 놓치지 않게 도와요'],
          ['주의', <>늘 ‘3개 남음’으로 고정하거나 재고를 꾸며내면 가짜 희소성이에요 · <DpLink /></>],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 프레이밍 ---------- */
type Pick = '괜찮아요' | '켤래요'
const FRAME_INIT = <>먼저 골라보고, <b>적용 후</b>에서 다시 골라보세요</>

export function Framing() {
  const m = useMotion()
  const [picks, setPicks] = useState<{ a: Pick | null; b: Pick | null }>({ a: null, b: null })
  const [log, setLog] = useState<ReactNode>(FRAME_INIT)
  const stat = useRef<HTMLDivElement>(null)
  const ab = useAB(v => {
    if (stat.current) { m.clearA(stat.current); m.A(stat.current, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 260, EASE.out) }
    setLog(v === 'a' ? <><b>실패</b>를 앞세운 문구예요. 골라보세요</> : <>같은 숫자를 <b>성공</b>으로 말했어요. 다시 골라보세요</>)
  })
  const seg = useRef<HTMLDivElement>(null)

  const pick = (p: Pick) => {
    const np = { ...picks, [ab.v]: p }
    setPicks(np)
    if (np.a && np.b) setLog(np.a === np.b ? <>두 프레임 모두 <b>{np.a}</b> — 흔들리지 않았네요! 대부분은 성공 쪽에서 더 켜요</> : <>같은 사실인데 <b>{np.a} → {np.b}</b> — 표현이 결정을 바꿨어요</>)
    else setLog(<><b>{p}</b> — 이제 {ab.v === 'a' ? <b>적용 후</b> : <b>적용 전</b>}에서도 골라보세요</>)
  }

  const demo = useDemo({
    reset() { setPicks({ a: null, b: null }); ab.set('a', true); setLog(FRAME_INIT) },
    async play(c) {
      await c.sleep(600); await c.press(seg.current?.parentElement ?? null, abBtn(seg.current, 'b')); await c.sleep(1500)
      await c.press(seg.current?.parentElement ?? null, abBtn(seg.current, 'a')); await c.sleep(500)
    },
  })

  const a = ab.v === 'a'
  return (
    <Card id="bias-framing" num="06" title="프레이밍" en="Framing Effect" desc="같은 사실도 ‘성공’으로 말하느냐 ‘실패’로 말하느냐에 따라 결정이 달라져요." demo={demo}>
      <Stage log={log} logId="bias-framing-log">
        <ABSeg ab={ab} ref={seg} />
        <div className="box left bias-box" id="bias-framing-box" data-ab={ab.v}>
          <div className="bias-frame">
            <div className="q">자동 백업 기능을 켤까요?</div>
            <div className={'bias-stat ' + (a ? 'bad' : 'good')} id="bias-framing-stat" ref={stat}>{a ? '복구 실패율 5%' : '복구 성공률 95%'}</div>
            <small id="bias-framing-sub">{a ? '100번 중 5번은 복구에 실패해요' : '100번 중 95번은 복구에 성공해요'}</small>
          </div>
          <div className="bias-dots" id="bias-framing-dots" aria-hidden="true">
            {Array.from({ length: 100 }, (_, i) => <i key={i} className={i < 95 ? 's' : 'f'} />)}
          </div>
          <div className="bias-btns">
            <button className="btn ghost sm" data-pick="괜찮아요" onClick={() => pick('괜찮아요')}>괜찮아요</button>
            <button className="btn sm" data-pick="켤래요" onClick={() => pick('켤래요')}>켤래요</button>
          </div>
          <div className="bias-res">
            <span>실패 5% 프레임<b id="bias-framing-ra">{picks.a ?? '—'}</b></span>
            <span>성공 95% 프레임<b id="bias-framing-rb">{picks.b ?? '—'}</b></span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['사실', '같음'], ['표현', '이득 vs 손실'], ['쓰임', '안내·설득 문구']]}
        usage={[
          ['활용 팁', '정확한 수치는 그대로 두고, 중요한 결정엔 두 면을 함께 보여 주세요'],
          ['주의', <>위험을 숨기려고 유리한 면만 크게 말하면 오도예요 · <DpLink /></>],
        ]}
      />
    </Card>
  )
}
