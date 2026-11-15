import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { CATS, MENU, won, type Cat } from '../data'
import { Ctrl, Thumb } from '../shared'

const q = <T extends HTMLElement>(root: HTMLElement | null, sel: string) => root?.querySelector<T>(sel) ?? null

/* ---------- 07 아코디언 ---------- */
const ACC_LOG = <>분류 머리글을 눌러 <b>펼치고 접어</b> 보세요</>

export function Accordion() {
  const [open, setOpen] = useState<Cat[]>([])
  const [single, setSingle] = useState(true)
  const [log, setLog] = useState<ReactNode>(ACC_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)

  const toggle = (c: Cat) => {
    const isOpen = open.includes(c)
    if (isOpen) { setOpen(o => o.filter(x => x !== c)); setLog(<>‘{c}’ 접기 — 머리글만 남아 <b>전체 구조</b>가 다시 보여요</>); return }
    const closed = single ? open : []
    setOpen(o => single ? [c] : [...o, c])
    setLog(closed.length ? <>‘{c}’ 펼치고 ‘{closed.join(', ')}’은 <b>자동으로 접혀요</b> (하나만 열기)</> : <>‘{c}’ 펼치기 — 메뉴 <b>{MENU.filter(m => m.cat === c).length}개</b></>)
  }
  const pickSingle = (v: boolean) => {
    setSingle(v)
    if (v && open.length > 1) setOpen(o => o.slice(-1))
    setLog(v ? <>하나만 열기 — 화면이 <b>짧게 유지</b>돼요</> : <>여러 개 열기 — <b>나란히 비교</b>할 수 있어요</>)
  }
  const all = open.length === CATS.length
  const demo = useDemo({
    reset() { setOpen([]); setSingle(true); setLog(ACC_LOG) },
    async play(c) {
      await c.press(dev.current, q(dev.current, '[data-cat="커피"]')); await c.sleep(1200)
      await c.press(dev.current, q(dev.current, '[data-cat="라떼"]')); await c.sleep(1400)
      await c.press(stage.current, q(stage.current, '[data-v="multi"]')); await c.sleep(900)
      await c.press(dev.current, q(dev.current, '[data-cat="디저트"]')); await c.sleep(900)
    },
  })

  return (
    <Card id="col-accordion" num="07" title="아코디언" en="Accordion" demo={demo}
      desc="묶음의 머리글만 보여주고, 누르면 그 안을 펼쳐요. 긴 목록을 접어 두고 전체 구조부터 보여줘요.">
      <Stage log={log} logId="col-accordion-log">
        <div className="cl-stage" ref={stage}>
          <Ctrl label="펼치기"><Seg value={single ? 'single' : 'multi'} onChange={v => pickSingle(v === 'single')} options={[['single', '하나만'], ['multi', '여러 개']]} /></Ctrl>
        </div>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">메뉴판<span className="sp" />
              <button type="button" onClick={() => { setOpen(all ? [] : single ? [CATS[0]] : [...CATS]); setLog(all ? <>모두 접기</> : single ? <>하나만 열기 모드라 <b>첫 묶음</b>만 펼쳐요</> : <>모두 펼치기 — 결국 <b>긴 리스트</b>가 돼요</>) }}>{all ? '모두 접기' : '모두 펼치기'}</button>
            </div>
            <div className="cl-body cl-acc">
              {CATS.map(c => {
                const on = open.includes(c), items = MENU.filter(m => m.cat === c)
                return (
                  <section key={c} className={on ? 'on' : ''}>
                    <h3>
                      <button type="button" data-cat={c} aria-expanded={on} aria-controls={'col-acc-' + c} onClick={() => toggle(c)}>
                        <span className="grow">{c}</span><span className="cl-n">{items.length}</span><span className="cl-caret" aria-hidden="true">⌄</span>
                      </button>
                    </h3>
                    <div className="cl-acc-p" id={'col-acc-' + c} role="region" aria-label={c} inert={!on}>
                      <ul>
                        {items.map(m => <li key={m.id}><Thumb item={m} /><span className="grow">{m.name}</span><span className="cl-price">{won(m.price)}</span></li>)}
                      </ul>
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['머리글', '이름 + 개수'], ['아이콘', '⌄ 돌아감'], ['열기', '하나만 / 여러 개']]}
        usage={[
          ['언제', '자주 묻는 질문, 분류가 뚜렷한 메뉴판, 설정 묶음처럼 다 볼 필요는 없을 때'],
          ['주의', '대부분이 거의 모든 칸을 열어 본다면 접어 둔 게 오히려 수고예요 — 그냥 펼쳐 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 메이슨리 ---------- */
const NAMES = ['하늘', '도윤', '서준', '유나', '민호', '지우', '하린', '시우', '예린', '준서', '소율', '건우']
const NOTES = ['창가 자리 햇살이 좋아요', '양이 넉넉해요', '진짜 맛있어요!', '포장도 깔끔해요', '조용해서 공부하기 좋았어요', '달지 않아 좋아요']
const HEIGHTS = [96, 64, 120, 80, 136, 72, 104, 88, 128, 68, 112, 92]
const REVIEWS = MENU.map((m, i) => ({ id: i + 1, item: m, h: HEIGHTS[i], who: NAMES[i], note: NOTES[i % NOTES.length] }))
type Review = (typeof REVIEWS)[number]
const INFO_H = 40, GAP = 6
/** 짧은 열에 하나씩 넣기 (위→아래 읽는 순서를 왼쪽·오른쪽 번갈아 유지) */
const pack = (rs: Review[]) => {
  const cols: Review[][] = [[], []], hs = [0, 0]
  rs.forEach(r => { const c = hs[0] <= hs[1] ? 0 : 1; cols[c].push(r); hs[c] += r.h + INFO_H + GAP })
  return { cols, hs }
}
const MS_LOG = <>메이슨리와 일반 그리드를 바꿔 <b>빈 틈</b>을 비교해 보세요</>

export function Masonry() {
  const [mode, setMode] = useState<'mason' | 'grid'>('mason')
  const [count, setCount] = useState(8)
  const [log, setLog] = useState<ReactNode>(MS_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  const rs = REVIEWS.slice(0, count)
  const { cols } = pack(rs)
  const pick = (v: 'mason' | 'grid') => {
    setMode(v)
    setLog(v === 'grid' ? <>일반 그리드 — 한 줄의 <b>가장 큰 사진</b>에 높이를 맞춰서 틈이 생겨요</> : <>메이슨리 — 벽돌처럼 <b>짧은 열 밑</b>에 다음 칸을 끼워요</>)
  }
  const more = () => {
    if (count >= REVIEWS.length) { setLog(<>후기는 여기까지예요</>); return }
    const next = REVIEWS.slice(0, count + 4), p = pack(next)
    const placed = REVIEWS[count]
    const side = p.cols[0].includes(placed) ? '왼쪽' : '오른쪽'
    setCount(count + 4)
    setLog(mode === 'mason' ? <>새 후기 #{placed.id}는 더 짧은 <b>{side} 열</b>로 들어가요</> : <>4개 더 — 그리드는 <b>줄 단위</b>로 붙어요</>)
    requestAnimationFrame(() => body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' }))
  }
  const demo = useDemo({
    reset() { setMode('mason'); setCount(8); setLog(MS_LOG); if (body.current) body.current.scrollTop = 0 },
    async play(c) {
      await c.press(stage.current, q(stage.current, '[data-v="grid"]')); await c.sleep(1600)
      await c.press(stage.current, q(stage.current, '[data-v="mason"]')); await c.sleep(1300)
      await c.press(dev.current, q(dev.current, '.cl-more')); await c.sleep(900)
    },
  })

  return (
    <Card id="col-masonry" num="08" title="메이슨리" en="Masonry" demo={demo}
      desc="높이가 다른 칸을 벽돌 쌓듯 짧은 열부터 채워요. 사진 비율을 자르지 않고도 빈 틈이 없어요.">
      <Stage log={log} logId="col-masonry-log">
        <div className="cl-stage" ref={stage}>
          <Ctrl label="배치"><Seg value={mode} onChange={pick} options={[['mason', '메이슨리'], ['grid', '일반 그리드']]} /></Ctrl>
        </div>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">사진 후기<span className="sp" /><span className="muted">{count}개</span></div>
            <div className="cl-body" ref={body}>
              {mode === 'mason' ? (
                <div className="cl-ms">
                  {cols.map((col, i) => <ul key={i} aria-label={(i ? '오른쪽' : '왼쪽') + ' 열'}>{col.map(r => <MsTile key={r.id} r={r} />)}</ul>)}
                </div>
              ) : (
                <ul className="cl-ms-grid">{rs.map(r => <MsTile key={r.id} r={r} />)}</ul>
              )}
              <button type="button" className="btn ghost sm cl-more" onClick={more} disabled={count >= REVIEWS.length}>{count >= REVIEWS.length ? '모두 봤어요' : '후기 더 보기'}</button>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['열', '폰 2 · 넓으면 3–5'], ['채우는 순서', '짧은 열 먼저'], ['사진', '원래 비율 그대로']]}
        usage={[
          ['언제', '사진 후기, 영감 보드, 레시피 모음처럼 비율이 제각각인 사진을 둘러볼 때'],
          ['주의', '읽는 순서가 지그재그라 순위·날짜순 목록에는 안 맞아요 — 순서가 중요하면 리스트로'],
        ]}
      />
    </Card>
  )
}

function MsTile({ r }: { r: Review }) {
  return (
    <li className="cl-ms-tile" style={{ ['--h' as string]: r.h + 'px' }}>
      <Thumb item={r.item} className="wide"><span className="cl-no">#{r.id}</span></Thumb>
      <span className="cl-ms-i"><b>{r.item.name}</b><small>{r.who}님 · {r.note}</small></span>
    </li>
  )
}

/* ---------- 09 무한 스크롤 ---------- */
const TOTAL = 48, PAGE = 12
const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const ORDERS = Array.from({ length: TOTAL }, (_, i) => {
  const m = MENU[(i * 5) % MENU.length], extra = i % 3
  const d = new Date(2026, 10, 16 - Math.floor(i / 2))
  return { id: i + 1, item: m, extra, price: m.price + extra * 4500, date: `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[(d.getDay() + 6) % 7]})` }
})
const INF_LOG = <>아래로 스크롤하면 <b>바닥에 닿기 전에</b> 다음 묶음을 불러와요</>

export function Infinite() {
  const m = useMotion()
  const T = useTimers()
  const [n, setN] = useState(PAGE)
  const [loading, setLoading] = useState(false)
  const [auto, setAuto] = useState(true)
  const [top, setTop] = useState(false)
  const [log, setLog] = useState<ReactNode>(INF_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLLIElement>(null)
  const st = useRef({ n, loading, auto })
  useEffect(() => { st.current = { n, loading, auto } })

  const load = () => {
    const s = st.current
    if (s.loading || s.n >= TOTAL) return
    st.current = { ...s, loading: true }
    setLoading(true)
    setLog(<>더 불러오는 중… <b>{s.n}개</b> 다음부터</>)
    T.set(() => {
      const next = Math.min(TOTAL, st.current.n + PAGE)
      setN(next); setLoading(false)
      setLog(next >= TOTAL ? <>끝까지 왔어요 — <b>{TOTAL}개 모두</b> 불러왔어요</> : <><b>{PAGE}개</b> 더 붙었어요 · 지금 {next} / {TOTAL}</>)
    }, m.D(900))
  }
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load })

  useEffect(() => {
    const root = body.current, el = sentinel.current
    if (!root || !el || !auto) return
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) loadRef.current() }, { root, rootMargin: '0px 0px 120px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [auto, n])

  const onScroll = () => {
    const y = body.current?.scrollTop ?? 0
    if ((y > 360) !== top) setTop(y > 360)
  }
  const toTop = () => {
    body.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setLog(<>맨 위로 — 길어진 목록에서 <b>돌아가는 길</b>은 꼭 있어야 해요</>)
    q<HTMLElement>(body.current, '.cl-inf-row')?.focus({ preventScroll: true })
  }
  const pickAuto = (v: boolean) => {
    setAuto(v)
    setLog(v ? <>자동 — 스크롤만 하면 <b>끊김 없이</b> 이어져요</> : <>버튼 — 사용자가 <b>원할 때만</b> 더 불러와서 바닥(푸터)에 닿을 수 있어요</>)
  }
  const demo = useDemo({
    reset() { T.clear(); setN(PAGE); setLoading(false); setAuto(true); setTop(false); setLog(INF_LOG); if (body.current) body.current.scrollTop = 0 },
    async play(c) {
      const b = body.current
      if (!b) return
      for (let k = 0; k < 2; k++) {
        for (let i = 0; i < 16 && b.scrollTop + b.clientHeight < b.scrollHeight - 4; i++) { b.scrollTop += 42; await c.sleep(45) }
        await c.sleep(1300)
      }
      await c.press(dev.current, q(dev.current, '.cl-top')); await c.sleep(900)
    },
  })

  return (
    <Card id="col-infinite" num="09" title="무한 스크롤" en="Infinite Scroll" demo={demo}
      desc="끝에 가까워지면 다음 묶음을 알아서 이어 붙여요. 페이지 번호 없이 계속 내려가며 둘러봐요.">
      <Stage log={log} logId="col-infinite-log">
        <div className="cl-stage" ref={stage}>
          <Ctrl label="불러오기"><Seg value={auto ? 'auto' : 'btn'} onChange={v => pickAuto(v === 'auto')} options={[['auto', '자동으로'], ['btn', '더 보기 버튼']]} /></Ctrl>
        </div>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">주문 내역<span className="sp" /><span className="cl-pill">{n} / {TOTAL}</span></div>
            <div className="cl-body" ref={body} onScroll={onScroll}>
              <ul className="cl-inf">
                {ORDERS.slice(0, n).map(o => (
                  <li key={o.id} className="cl-inf-row" tabIndex={-1}>
                    <Thumb item={o.item} />
                    <span className="grow"><b>{o.item.name}{o.extra ? ` 외 ${o.extra}개` : ''}</b><small>{o.date} · 주문 #{2400 - o.id}</small></span>
                    <span className="cl-price">{won(o.price)}</span>
                  </li>
                ))}
                <li ref={sentinel} className="cl-inf-foot" aria-live="polite">
                  {n >= TOTAL ? <span className="muted">주문 내역을 모두 봤어요</span>
                    : loading ? <span className="muted"><span className="cl-spin" aria-hidden="true" />더 불러오는 중</span>
                      : !auto ? <button type="button" className="btn ghost sm" onClick={load}>{PAGE}개 더 보기</button>
                        : <span className="muted">&nbsp;</span>}
                </li>
              </ul>
              {(!auto || n >= TOTAL) && <div className="cl-footer">솔방울 커피 · 고객센터 · 이용약관</div>}
            </div>
            <button type="button" className={'cl-top' + (top ? ' on' : '')} aria-label="맨 위로" tabIndex={top ? 0 : -1} onClick={toTop}>↑</button>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['미리 불러오기', '바닥 120px 전'], ['한 번에', '10–30개'], ['필수', '맨 위로 버튼']]}
        usage={[
          ['언제', '피드, 주문 내역, 사진처럼 끝까지 다 볼 일은 드물고 계속 둘러보는 목록일 때'],
          ['주의', '푸터에 닿을 수 없고 위치를 잃기 쉬워요 — 찾기·비교가 목적이면 페이지 번호나 더 보기 버튼'],
        ]}
      />
    </Card>
  )
}
