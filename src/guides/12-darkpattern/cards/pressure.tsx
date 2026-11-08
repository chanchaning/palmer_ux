import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { DpSeg, Pane, Spacer, flash, won, type V } from '../shared'

/* ---------- 04 죄책감 버튼 ---------- */
const SHAME_MSG: Record<V, Record<'decline' | 'accept', ReactNode>> = {
  bad: { decline: <>거절하려면 <b>“할인 필요 없는 사람”</b>이라고 스스로 말해야 해요</>, accept: <>쿠폰 받기 자체는 괜찮아요 — 문제는 <b>거절 문구</b>예요</> },
  good: { decline: <><b>괜찮아요</b> 한마디로 담백하게 거절 — 기분 상할 일이 없어요</>, accept: <>쿠폰 받기 — 거절 버튼과 <b>같은 크기</b>로 나란히 있어요</> },
}
const SHAME_INIT = <>팝업을 <b>거절</b>해 보세요 — 버튼 문구를 잘 읽어봐요</>

export function Shame() {
  const [v, setView] = useState<V>('bad')
  const [open, setOpen] = useState<Record<V, boolean>>({ bad: true, good: true })
  const [log, setLog] = useState<ReactNode>(SHAME_INIT)
  const box = useRef<HTMLDivElement>(null)

  const setV = (nv: V) => { setView(nv); setOpen({ bad: true, good: true }); setLog(SHAME_INIT) }
  const reopen = (s: V) => { setOpen(o => ({ ...o, [s]: true })); setLog(SHAME_INIT) }
  const choose = (s: V, a: 'decline' | 'accept') => { setOpen(o => ({ ...o, [s]: false })); setLog(SHAME_MSG[s][a]) }

  const page = (s: V) => (
    <>
      <div className="dp-bar">🛍️ 데일리샵</div>
      <div className="dp-body">
        <div className="fake-line" style={{ width: '60%' }} />
        <div style={{ height: 60, borderRadius: 10, background: 'var(--surface-2)' }} />
        <div className="fake-line" /><div className="fake-line" style={{ width: '75%' }} />
        <button className="btn ghost sm" data-act="reopen" style={{ marginTop: 'auto' }} onClick={() => reopen(s)}>팝업 다시 띄우기</button>
      </div>
    </>
  )

  const demo = useDemo({
    reset() { setV('bad') },
    async play(c) {
      const q = (s: string) => box.current?.querySelector<HTMLElement>(s) ?? null
      await c.sleep(600); await c.press(box.current, q('[data-shame="bad"] [data-act="decline"]')); await c.sleep(1800)
      setV('good'); await c.sleep(700); await c.press(box.current, q('[data-shame="good"] [data-act="decline"]')); await c.sleep(400)
    },
  })

  return (
    <Card id="darkpattern-shame" num="04" title="죄책감 버튼" en="Confirmshaming" desc="거절 버튼 문구로 사용자를 깎아내려서, 거절하기 민망하게 만들어요." demo={demo}>
      <Stage log={log} logId="darkpattern-shame-log">
        <DpSeg value={v} onChange={setV} />
        <div className="box left dp-box" ref={box}>
          <Pane v="bad" cur={v} sub="쇼핑몰 첫 방문">
            <div className="dp-scr" data-shame="bad">
              {page('bad')}
              <div className="dp-ov" hidden={!open.bad}>
                <div className="dp-dlg">
                  <div style={{ fontSize: 27, lineHeight: 1 }}>🎁</div>
                  <p className="dp-h">첫 구매 10% 할인 쿠폰</p>
                  <div className="dp-field">이메일 주소</div>
                  <button className="btn" data-act="accept" onClick={() => choose('bad', 'accept')}>쿠폰 받기</button>
                  <button className="dp-tiny" data-act="decline" onClick={() => choose('bad', 'decline')}>아니요, 저는 할인 같은 건 필요 없는 사람이에요</button>
                </div>
              </div>
            </div>
          </Pane>
          <Pane v="good" cur={v} sub="쇼핑몰 첫 방문">
            <div className="dp-scr" data-shame="good">
              {page('good')}
              <div className="dp-ov" hidden={!open.good}>
                <div className="dp-dlg">
                  <div style={{ fontSize: 27, lineHeight: 1 }}>🎁</div>
                  <p className="dp-h">첫 구매 10% 할인 쿠폰</p>
                  <div className="dp-field">이메일 주소</div>
                  <div className="row">
                    <button className="btn ghost" data-act="decline" onClick={() => choose('good', 'decline')}>괜찮아요</button>
                    <button className="btn" data-act="accept" onClick={() => choose('good', 'accept')}>쿠폰 받기</button>
                  </div>
                </div>
              </div>
            </div>
          </Pane>
        </div>
      </Stage>
      <Info
        spec={[['유형', '감정 압박 · Confirmshaming'], ['피해', '개인정보 · 신뢰'], ['대안', '중립적 거절 문구']]}
        usage={[
          ['징후', '거절 문구가 “저는 ~ 싫어요”처럼 사용자의 입을 빌려 자신을 비하해요'],
          ['주의', '불법이 아니어도 신뢰를 깎아요 — 거절 버튼도 수락과 같은 무게로 보여주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 끼워팔기 ---------- */
const PRICE = 39000
const EXTRA: [string, number][] = [['🛡️ 파손 보장 1년', 4900], ['💝 선물 포장', 2000]]
const Prod = () => <div className="dp-prod"><span className="dp-thumbimg">🎧</span><div><b>무선 이어폰</b><small>39,000원</small></div></div>
const CartHead = () => <p className="dp-p" style={{ fontWeight: 700, color: 'var(--text)' }}>🛒 장바구니</p>

export function Sneak() {
  const [v, setView] = useState<V>('bad')
  const [bAdded, setBAdded] = useState(false)
  const [bEx, setBEx] = useState([true, true])
  const [gAdded, setGAdded] = useState(false)
  const [gCare, setGCare] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>이어폰 <b>하나만</b> 장바구니에 담아보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const bad = useRef<HTMLDivElement>(null)

  const setV = (nv: V) => {
    setView(nv); setBAdded(false); setBEx([true, true]); setGAdded(false); setGCare(false)
    setLog(nv === 'bad' ? <>이어폰 <b>하나만</b> 장바구니에 담아보세요</> : <>추가 상품은 <b>꺼진 채</b>로 제안만 해요</>)
  }
  const rm = (i: number) => {
    const next = bEx.map((x, j) => (j === i ? false : x))
    setBEx(next)
    const left = next.filter(Boolean).length
    setLog(left ? <>작은 ✕를 찾아 하나 뺐어요 — <b>아직 {left}개 더</b> 남았어요</> : <>겨우 <b>원래 고른 것만</b> 남았어요 · {won(PRICE)}</>)
  }
  const empty = (onAdd: () => void) => (
    <><Prod /><p className="dp-p">장바구니가 비어 있어요.</p><Spacer /><button className="btn" data-act="add" onClick={onAdd}>장바구니 담기</button></>
  )
  const bTotal = PRICE + EXTRA.reduce((a, [, p], i) => a + (bEx[i] ? p : 0), 0)
  const gTotal = PRICE + (gCare ? EXTRA[0][1] : 0)

  const demo = useDemo({
    reset() { setV('bad') },
    async play(c) { await c.sleep(400); await c.press(box.current, bad.current?.querySelector<HTMLElement>('[data-act="add"]') ?? null); await c.sleep(400) },
  })

  return (
    <Card id="darkpattern-sneak" num="05" title="끼워팔기" en="Sneak into Basket" desc="하나만 담았는데, 장바구니에 부가 상품이 슬쩍 같이 들어가 있어요." demo={demo}>
      <Stage log={log} logId="darkpattern-sneak-log">
        <DpSeg value={v} onChange={setV} />
        <div className="box left dp-box" ref={box}>
          <Pane v="bad" cur={v} sub="상품 → 장바구니">
            <div className="dp-scr"><div className="dp-body" id="darkpattern-sneak-bad" ref={bad}>
              {!bAdded ? empty(() => { setBAdded(true); setLog(<>이어폰만 담았는데 <b>2개가 더</b> 들어갔어요 · +6,900원</>) }) : (
                <>
                  <Prod /><CartHead />
                  <div className="dp-line"><span>무선 이어폰</span><span>{won(PRICE)}</span></div>
                  {EXTRA.map(([n, p], i) => bEx[i] && (
                    <div className="dp-line sneak" key={n}>
                      <span>{n}<button className="dp-x" data-rm={i} aria-label="빼기" onClick={() => rm(i)}>✕</button></span><span>{won(p)}</span>
                    </div>
                  ))}
                  <div className="dp-line sum"><span>합계</span><span>{won(bTotal)}</span></div>
                  <Spacer /><button className="btn danger">결제하기</button>
                </>
              )}
            </div></div>
          </Pane>
          <Pane v="good" cur={v} sub="상품 → 장바구니">
            <div className="dp-scr"><div className="dp-body" id="darkpattern-sneak-good">
              {!gAdded ? empty(() => { setGAdded(true); setLog(<>고른 그대로 <b>이어폰 1개</b> · {won(PRICE)}</>) }) : (
                <>
                  <Prod /><CartHead />
                  <div className="dp-line"><span>무선 이어폰</span><span>{won(PRICE)}</span></div>
                  {gCare && <div className="dp-line"><span>🛡️ 파손 보장 1년</span><span>{won(EXTRA[0][1])}</span></div>}
                  <div className="dp-line sum"><span>합계</span><span>{won(gTotal)}</span></div>
                  <div className="dp-opts">
                    <label className="opt">
                      <input type="checkbox" data-act="care" checked={gCare} onChange={e => {
                        const on = e.target.checked
                        setGCare(on)
                        setLog(on ? <>부가 상품은 <b>내가 직접</b> 골랐을 때만 추가돼요</> : <>체크를 끄면 바로 빠져요 · <b>{won(PRICE)}</b></>)
                      }} /> 파손 보장 1년 추가 (+4,900원)
                    </label>
                  </div>
                  <Spacer /><button className="btn">결제하기</button>
                </>
              )}
            </div></div>
          </Pane>
        </div>
      </Stage>
      <Info
        spec={[['유형', '몰래 추가 · Sneaking'], ['피해', '돈'], ['대안', '직접 고르는 추가 옵션']]}
        usage={[
          ['징후', '내가 고르지 않은 보험·포장·기부 항목이 회색 작은 글씨로 들어가 있어요'],
          ['주의', '동의 없는 상품 추가는 국내외 전자상거래·소비자 보호 규제 대상이 될 수 있어요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 가짜 희소성 ---------- */
export function Scarcity() {
  const [v, setView] = useState<V>('bad')
  const [qty, setQty] = useState<Record<V, number>>({ bad: 1, good: 1 })
  const [viewers, setViewers] = useState(17)
  const [log, setLog] = useState<ReactNode>(<><b>새로고침</b>하거나 수량을 <b>3개 이상</b>으로 올려보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const body = { bad: useRef<HTMLDivElement>(null), good: useRef<HTMLDivElement>(null) }

  const setV = (nv: V) => {
    setView(nv); setQty({ bad: 1, good: 1 }); setViewers(17)
    setLog(nv === 'bad' ? <><b>새로고침</b>하거나 수량을 <b>3개 이상</b>으로 올려보세요</> : <>실제 재고와 <b>배송 정보</b>만 보여줘요</>)
  }
  const reload = (s: V) => {
    flash(body[s].current)
    if (s === 'bad') {
      const n = 9 + Math.floor(Math.random() * 38)
      setViewers(n)
      setLog(<>새로고침해도 <b>여전히 2개</b> · 보는 사람은 갑자기 <b>{n}명</b></>)
    } else setLog(<>새로고침해도 <b>같은 정보</b> — 숫자로 재촉하지 않아요</>)
  }
  const step = (s: V, a: 'plus' | 'minus') => {
    const max = s === 'bad' ? 9 : 3
    const q = Math.max(1, Math.min(max, qty[s] + (a === 'plus' ? 1 : -1)))
    setQty(o => ({ ...o, [s]: q }))
    if (s === 'bad') setLog(q > 2 ? <>2개 남았다더니 <b>{q}개</b>도 담겨요 — 재고 표시가 가짜예요</> : <>수량 <b>{q}개</b></>)
    else setLog(q === 3 && a === 'plus' ? <>안내한 대로 <b>최대 3개</b>까지만 담겨요</> : <>수량 <b>{q}개</b></>)
  }
  const buy = (s: V) => setLog(s === 'bad' ? <>“품절 전에” 문구에 쫓겨 <b>{qty.bad}개</b>를 담았어요</> : <><b>{qty.good}개</b> 담았어요 — 서두를 이유가 없었어요</>)

  const screen = (s: V) => (
    <div className="dp-scr">
      <div className="dp-bar">상품 상세<Spacer /><button className="btn ghost sm" data-act="reload" onClick={() => reload(s)}>↻ 새로고침</button></div>
      <div className="dp-body" data-sc={s} ref={body[s]}>
        <div className="dp-prod"><span className="dp-thumbimg">🎒</span><div><b>데일리 백팩</b><small>49,000원</small></div></div>
        {s === 'bad' ? (
          <>
            <p className="dp-hot" style={{ margin: 0 }}>🔥 단 2개 남았어요! 서두르세요</p>
            <p className="dp-p" data-viewers>👀 지금 {viewers}명이 이 상품을 보고 있어요</p>
          </>
        ) : (
          <>
            <p className="dp-ok" style={{ margin: 0 }}>✓ 재고 있어요 · 오늘 주문하면 내일 도착</p>
            <p className="dp-p">한 번에 최대 3개까지 살 수 있어요.</p>
          </>
        )}
        <div className="dp-qty"><span>수량</span>
          <div className="stepper">
            <button data-act="minus" aria-label="빼기" onClick={() => step(s, 'minus')}>−</button>
            <output>{qty[s]}</output>
            <button data-act="plus" aria-label="더하기" onClick={() => step(s, 'plus')}>+</button>
          </div>
        </div>
        <Spacer />
        <button className={'btn' + (s === 'bad' ? ' danger' : '')} data-act="buy" onClick={() => buy(s)}>{s === 'bad' ? '품절 전에 담기' : '장바구니 담기'}</button>
      </div>
    </div>
  )

  const demo = useDemo({
    reset() { setV('bad') },
    async play(c) {
      const scr = box.current?.querySelector('[data-sc="bad"]')?.closest('.dp-scr')
      await c.press(box.current, scr?.querySelector<HTMLElement>('[data-act="reload"]') ?? null); await c.sleep(1300)
      for (let i = 0; i < 3; i++) { await c.press(box.current, scr?.querySelector<HTMLElement>('[data-act="plus"]') ?? null); await c.sleep(450) }
    },
  })

  return (
    <Card id="darkpattern-scarcity" num="06" title="가짜 희소성" en="Fake Scarcity" desc="“2개 남음”, “17명이 보는 중”처럼 사실이 아닌 숫자로 서두르게 해요." demo={demo}>
      <Stage log={log} logId="darkpattern-scarcity-log">
        <DpSeg value={v} onChange={setV} />
        <div className="box left dp-box" ref={box}>
          <Pane v="bad" cur={v} sub="상품 상세">{screen('bad')}</Pane>
          <Pane v="good" cur={v} sub="상품 상세">{screen('good')}</Pane>
        </div>
      </Stage>
      <Info
        spec={[['유형', '희소성 · Fake Scarcity'], ['피해', '돈'], ['대안', '실제 재고·배송 정보']]}
        usage={[
          ['징후', '재고 숫자는 늘 같고, ‘보는 사람 수’는 새로고침할 때마다 제멋대로 바뀌어요'],
          ['주의', '사실과 다른 재고·인기 표시는 국내외 전자상거래·소비자 보호 규제 대상이 될 수 있어요'],
        ]}
      />
    </Card>
  )
}
