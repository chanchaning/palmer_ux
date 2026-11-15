/* 01 렌더링 · 성능 — 데모 모음. fixed=false 문제 그대로, true 해결 적용 */
import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { Meter } from '../ui'

const busy = (ms: number) => { const t = performance.now(); while (performance.now() - t < ms) { /* 일부러 메인 스레드를 잡아요 */ } }
const fmt = (n: number) => n.toLocaleString('ko-KR')

/* ---------- 01 무한 스크롤 DOM 누적 ---------- */
const ROW = 44
export function InfiniteDemo({ fixed }: { fixed: boolean }) {
  const [n, setN] = useState(30)
  const [top, setTop] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const dom = useRef<HTMLElement>(null)
  const loading = useRef(false)

  useLayoutEffect(() => {
    if (dom.current && box.current) dom.current.textContent = fmt(box.current.querySelectorAll('*').length)
  })
  const onScroll = () => {
    const el = box.current!
    setTop(el.scrollTop)
    if (!loading.current && el.scrollTop + el.clientHeight > el.scrollHeight - ROW * 4) {
      loading.current = true
      setN(v => v + 30)
      requestAnimationFrame(() => { loading.current = false })
    }
  }
  const zoom = () => { // 사용자가 한참 내린 상황을 빠르게 만들어요
    setN(v => v + 600)
    requestAnimationFrame(() => box.current?.scrollTo({ top: box.current.scrollHeight }))
  }

  const H = 240 // .pf-scroll 높이와 같아요
  const start = fixed ? Math.max(0, Math.floor(top / ROW) - 5) : 0
  const end = fixed ? Math.min(n, Math.ceil((top + H) / ROW) + 5) : n
  const rows = []
  for (let i = start; i < end; i++) rows.push(
    <div className="pf-row" key={i} style={fixed ? { position: 'absolute', top: i * ROW, left: 0, right: 0 } : undefined}>
      <span className="pf-av" /><div><b>게시글 {i + 1}</b><small>댓글 {(i * 7) % 23} · 좋아요 {(i * 13) % 97}</small></div>
    </div>,
  )
  return (
    <div className="pf-col">
      <div className="dv-meters">
        <Meter label="불러온 글" value={fmt(n)} />
        <Meter label="실제 DOM 요소" value={<span ref={dom}>0</span>} bad={!fixed} />
      </div>
      <div className="pf-scroll" ref={box} onScroll={onScroll} tabIndex={0} aria-label="무한 스크롤 목록">
        {fixed ? <div style={{ height: n * ROW, position: 'relative' }}>{rows}</div> : rows}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={zoom}>한참 내린 것처럼 (+600개)</button>
        <span className="dv-log">{fixed ? <>보이는 줄만 그려요. 몇 개를 불러와도 <b>DOM은 그대로</b>예요</> : <>불러온 만큼 <b>DOM이 계속 쌓여요</b></>}</span>
      </div>
    </div>
  )
}

/* ---------- 02 useMemo · useCallback ---------- */
const NAMES = ['결제 내역', '배송 조회', '쿠폰함', '찜한 상품', '최근 본 상품', '고객센터']
const CHIP_STYLE: CSSProperties = { borderRadius: 10 }
type Tally = { n: number }
function Child({ label, style, onPick, tally }: { label: string; style: CSSProperties; onPick: (l: string) => void; tally: Tally }) {
  const el = useRef<HTMLButtonElement>(null)
  const cnt = useRef(0)
  useEffect(() => { // 그려질 때마다 (렌더 → 커밋) 번쩍이고 횟수를 올려요
    cnt.current++; tally.n++
    const b = el.current
    if (!b) return
    b.querySelector('i')!.textContent = String(cnt.current)
    b.animate([{ boxShadow: '0 0 0 3px var(--danger)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 500 })
  })
  return <button type="button" ref={el} className="pf-child" style={style} onClick={() => onPick(label)}>{label}<i>0</i></button>
}
const MemoChild = memo(Child)

export function MemoDemo({ fixed }: { fixed: boolean }) {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState('')
  const tally = useRef<Tally>({ n: 0 }).current
  const out = useRef<HTMLElement>(null)
  const pick = useCallback((l: string) => setPicked(l), [])
  useEffect(() => { if (out.current) out.current.textContent = `${tally.n}개`; tally.n = 0 })
  const typeDemo = async () => {
    setText('')
    for (const ch of '오늘 주문한 상품') { await new Promise(r => setTimeout(r, 140)); setText(t => t + ch) }
  }
  return (
    <div className="pf-col">
      <div className="dv-row">
        <input className="pf-input" value={text} onChange={e => setText(e.target.value)} placeholder="여기에 입력해 보세요" aria-label="검색어" />
        <button type="button" className="btn sm ghost" onClick={typeDemo}>자동 입력</button>
      </div>
      <div className="pf-children">
        {NAMES.map(l => fixed
          ? <MemoChild key={l} label={l} style={CHIP_STYLE} onPick={pick} tally={tally} />
          : <Child key={l} label={l} style={{ borderRadius: 10 }} onPick={x => setPicked(x)} tally={tally} />)}
      </div>
      <div className="dv-meters">
        <Meter label="방금 다시 그린 메뉴" value={<span ref={out}>0개</span>} bad={!fixed} />
        <Meter label="고른 메뉴" value={picked || '—'} />
      </div>
      <p className="dv-log">빨간 테두리가 번쩍이면 다시 그려진 거예요. 메뉴 오른쪽 숫자는 지금까지 그린 횟수예요.</p>
    </div>
  )
}

/* ---------- 03 대용량 표 가상화 ---------- */
const TOTAL = 10000
const ROW_H = 32
const cell = (i: number) => [`ORD-${String(100000 + i)}`, ['서울', '부산', '대구', '광주', '대전'][i % 5], fmt(((i * 7919) % 90000) + 10000) + '원', ['결제 완료', '배송 중', '배송 완료', '취소'][i % 4]]
export function VirtualDemo({ fixed }: { fixed: boolean }) {
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState(0)
  const t0 = useRef(0)
  const box = useRef<HTMLDivElement>(null)
  const [ms, setMs] = useState<number | null>(null)
  const dom = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    if (!open || !t0.current) return
    const took = performance.now() - t0.current
    t0.current = 0
    setMs(took) // 측정값 표시용 (한 번만)
  }, [open])
  useLayoutEffect(() => { if (dom.current && box.current) dom.current.textContent = fmt(box.current.querySelectorAll('tr').length) })
  const go = () => { setMs(null); setOpen(false); requestAnimationFrame(() => { t0.current = performance.now(); setOpen(true) }) }

  const start = fixed ? Math.max(0, Math.floor(top / ROW_H) - 6) : 0
  const end = fixed ? Math.min(TOTAL, start + Math.ceil(260 / ROW_H) + 12) : TOTAL
  const rows = []
  if (open) for (let i = start; i < end; i++) rows.push(<tr key={i} style={{ height: ROW_H }}>{cell(i).map((c, j) => <td key={j}>{c}</td>)}</tr>)
  return (
    <div className="pf-col">
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={go}>주문 1만 건 표 열기</button>
        {!fixed && <span className="dv-log">누르면 잠깐 화면이 멈출 수 있어요</span>}
      </div>
      <div className="dv-meters">
        <Meter label="그리는 데 걸린 시간" value={ms === null ? '—' : `${fmt(Math.round(ms))}ms`} bad={ms === null ? undefined : ms > 100} />
        <Meter label="실제 표 행(tr)" value={<span ref={dom}>0</span>} bad={!fixed && open} />
      </div>
      <div className="pf-table" ref={box} onScroll={e => setTop(e.currentTarget.scrollTop)} tabIndex={0} aria-label="주문 표">
        {open && (
          <table>
            <thead><tr><th>주문 번호</th><th>지역</th><th>금액</th><th>상태</th></tr></thead>
            <tbody>
              {fixed && start > 0 && <tr style={{ height: start * ROW_H }} aria-hidden="true" />}
              {rows}
              {fixed && end < TOTAL && <tr style={{ height: (TOTAL - end) * ROW_H }} aria-hidden="true" />}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ---------- 04 남은 이벤트 리스너 ---------- */
function makeBus() {
  const bus = new EventTarget() as EventTarget & { live: number; ran: number }
  bus.live = 0; bus.ran = 0
  return bus
}
function FakePage({ name, bus, fixed }: { name: string; bus: ReturnType<typeof makeBus>; fixed: boolean }) {
  useEffect(() => {
    const onScroll = () => { bus.ran++; busy(2) } // 위치 계산 같은 일 (2ms)
    bus.addEventListener('scroll', onScroll); bus.live++
    if (!fixed) return // ✕ 정리 함수 없음 — 페이지를 떠나도 리스너가 남아요
    return () => { bus.removeEventListener('scroll', onScroll); bus.live-- }
  }, [bus, fixed])
  return <div className="pf-page"><b>{name}</b><small>scroll 리스너를 하나 등록해요</small></div>
}
export function ListenerDemo({ fixed }: { fixed: boolean }) {
  const [bus] = useState(makeBus)
  const [page, setPage] = useState(0)
  const [stat, setStat] = useState({ live: 0, ran: 0, ms: 0 })
  const pages = ['상품 목록', '상품 상세', '장바구니']
  useEffect(() => { setStat(s => ({ ...s, live: bus.live })) }, [page, bus])
  const scroll = () => {
    bus.ran = 0
    const t = performance.now()
    bus.dispatchEvent(new Event('scroll'))
    setStat({ live: bus.live, ran: bus.ran, ms: performance.now() - t })
  }
  const hop = async () => { for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 160)); setPage(p => p + 1) } }
  return (
    <div className="pf-col">
      <div className="pf-browser">
        <div className="pf-url">example.shop/{['list', 'item/42', 'cart'][page % 3]}</div>
        <FakePage key={page} name={pages[page % 3]} bus={bus} fixed={fixed} />
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm ghost" onClick={() => setPage(p => p + 1)}>다른 페이지로 이동</button>
        <button type="button" className="btn sm ghost" onClick={hop}>6번 오가기</button>
        <button type="button" className="btn sm" onClick={scroll}>스크롤 한 번</button>
      </div>
      <div className="dv-meters">
        <Meter label="살아 있는 리스너" value={stat.live} bad={stat.live > 1} />
        <Meter label="스크롤 1번에 실행" value={`${stat.ran}번`} bad={stat.ran > 1} />
        <Meter label="걸린 시간" value={`${stat.ms.toFixed(1)}ms`} bad={stat.ms > 8} />
      </div>
      <p className="dv-log">페이지를 여러 번 오간 뒤 ‘스크롤 한 번’을 눌러 보세요. 진짜 window 대신 이 데모 안에서만 쓰는 가짜 이벤트를 써요.</p>
    </div>
  )
}

/* ---------- 05 LCP 이미지 ---------- */
type Res = { name: string; kb: number; s: number; e: number; kind: 'hero' | 'img' | 'js' | 'lazy' }
const LCP_BAD: Res[] = [
  { name: 'app.js', kb: 180, s: 0.1, e: 0.9, kind: 'js' },
  ...Array.from({ length: 6 }, (_, i): Res => ({ name: `product-${i + 1}.jpg`, kb: 420, s: 0.3 + i * 0.05, e: 2.6 + i * 0.25, kind: 'img' })),
  { name: 'hero.jpg (lazy · 2.4MB)', kb: 2400, s: 1.0, e: 4.6, kind: 'hero' },
]
const LCP_GOOD: Res[] = [
  { name: 'hero.webp (preload · 310KB)', kb: 310, s: 0.05, e: 1.2, kind: 'hero' },
  { name: 'app.js', kb: 180, s: 0.1, e: 0.8, kind: 'js' },
  ...Array.from({ length: 6 }, (_, i): Res => ({ name: `product-${i + 1}.webp (lazy)`, kb: 60, s: 1.9 + i * 0.15, e: 2.2 + i * 0.15, kind: 'lazy' })),
]
export function LcpDemo({ fixed }: { fixed: boolean }) {
  const list = fixed ? LCP_GOOD : LCP_BAD
  const lcp = list.find(r => r.kind === 'hero')!.e
  const [t, setT] = useState(0)
  const raf = useRef(0)
  const play = () => {
    cancelAnimationFrame(raf.current)
    const st = performance.now()
    const step = () => { const v = Math.min(5, ((performance.now() - st) / 1000) * 1.25); setT(v); if (v < 5) raf.current = requestAnimationFrame(step) }
    raf.current = requestAnimationFrame(step)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const X = (s: number) => (s / 5) * 100 + '%'
  return (
    <div className="pf-col">
      <div className="pf-lcp">
        <div className="pf-phone-mini">
          <div className={'pf-hero' + (t >= lcp ? ' on' : '')}>{t >= lcp ? '메인 이미지' : ''}</div>
          <div className="pf-mini-line" /><div className="pf-mini-line s" />
        </div>
        <div className="pf-water">
          {list.map(r => (
            <div className="pf-wrow" key={r.name}>
              <span className={'pf-wname ' + r.kind}>{r.name}</span>
              <div className="pf-wtrack"><span className={'pf-wbar ' + r.kind} style={{ left: X(r.s), width: `calc(${X(Math.max(0, Math.min(t, r.e) - r.s))})`, opacity: t > r.s ? 1 : 0 }} /></div>
            </div>
          ))}
          <div className="pf-wrow axis"><span /><div className="pf-wtrack">{[0, 1, 2, 3, 4, 5].map(s => <i key={s} style={{ left: X(s) }}>{s}s</i>)}<b className="pf-lcp-mark" style={{ left: X(lcp) }}>LCP {lcp.toFixed(1)}s</b><span className="pf-head" style={{ left: X(t) }} /></div></div>
        </div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={play}>페이지 열기 재생</button>
        <Meter label="LCP (가장 큰 그림이 뜬 시각)" value={`${lcp.toFixed(1)}초`} bad={lcp > 2.5} />
      </div>
    </div>
  )
}

/* ---------- 06 영상 위 캔버스 박스 ---------- */
const WORKER_SRC = `onmessage = e => { const t = performance.now(); while (performance.now() - t < 32) {} postMessage(e.data) }`
type Obj = { x: number; y: number; w: number; h: number; vx: number; vy: number; label: string }
export function CanvasDemo({ fixed }: { fixed: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const [run, setRun] = useState(false)
  const [m, setM] = useState({ fps: 0, det: 0, click: 0 })
  const clickAt = useRef(0)
  useEffect(() => {
    if (!run) return
    const c = cv.current!, ctx = c.getContext('2d')!
    const W = c.width, H = c.height
    const objs: Obj[] = [
      { x: 30, y: 40, w: 46, h: 90, vx: 1.6, vy: 0.3, label: '사람 0.94' },
      { x: 180, y: 70, w: 70, h: 44, vx: -1.2, vy: 0.5, label: '차량 0.88' },
      { x: 120, y: 20, w: 40, h: 80, vx: 0.9, vy: -0.4, label: '사람 0.81' },
    ]
    let boxes: Obj[] = [], frames = 0, dets = 0, last = performance.now(), raf = 0, waiting = false, alive = true
    let worker: Worker | null = null, url = ''
    if (fixed) {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }))
      worker = new Worker(url)
      worker.onmessage = e => { boxes = e.data; dets++; waiting = false }
    }
    const css = getComputedStyle(c)
    const col = { bg: css.getPropertyValue('--surface-3'), box: css.getPropertyValue('--ok'), text: css.getPropertyValue('--on-fill') }
    const frame = () => {
      if (!alive) return
      for (const o of objs) {
        o.x += o.vx; o.y += o.vy
        if (o.x < 0 || o.x + o.w > W) o.vx *= -1
        if (o.y < 0 || o.y + o.h > H) o.vy *= -1
      }
      const snap = objs.map(o => ({ ...o }))
      if (fixed) { if (!waiting) { waiting = true; worker!.postMessage(snap) } } // 결과가 오기 전엔 새로 안 보내요 (밀림 방지)
      else { busy(32); boxes = snap; dets++ } // ✕ 무거운 감지를 메인 스레드에서 매 프레임
      ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(127,127,127,${0.08 + (i % 3) * 0.04})`; ctx.fillRect(i * 40, 0, 20, H) }
      for (const o of objs) { ctx.fillStyle = 'rgba(127,127,127,.55)'; ctx.fillRect(o.x, o.y, o.w, o.h) }
      ctx.lineWidth = 2; ctx.font = '600 11px Pretendard, sans-serif'
      for (const b of boxes) {
        ctx.strokeStyle = col.box; ctx.strokeRect(b.x, b.y, b.w, b.h)
        ctx.fillStyle = col.box; ctx.fillRect(b.x, b.y - 16, 66, 16)
        ctx.fillStyle = col.text; ctx.fillText(b.label, b.x + 4, b.y - 4)
      }
      frames++
      const now = performance.now()
      if (now - last > 500) { const fps = Math.round((frames * 1000) / (now - last)), det = Math.round((dets * 1000) / (now - last)); setM(s => ({ ...s, fps, det })); frames = 0; dets = 0; last = now }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    // 화면 밖으로 나가면 멈춰요
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setRun(false) })
    io.observe(c)
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); worker?.terminate(); if (url) URL.revokeObjectURL(url) }
  }, [run, fixed])
  const poke = () => { clickAt.current = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => setM(s => ({ ...s, click: Math.round(performance.now() - clickAt.current) })))) }
  return (
    <div className="pf-col">
      <canvas ref={cv} width={320} height={180} className="pf-canvas" aria-label="감지 박스가 그려지는 영상 화면" />
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => setRun(r => !r)}>{run ? '멈추기' : '영상 재생'}</button>
        <button type="button" className="btn sm ghost" onClick={poke}>반응 속도 재기</button>
      </div>
      <div className="dv-meters">
        <Meter label="화면 FPS" value={run ? m.fps : '—'} bad={run ? m.fps < 45 : undefined} />
        <Meter label="감지 결과 / 초" value={run ? m.det : '—'} />
        <Meter label="클릭 → 화면 반영" value={m.click ? `${m.click}ms` : '—'} bad={m.click ? m.click > 50 : undefined} />
      </div>
    </div>
  )
}

/* ---------- 07 서드파티 스크립트와 TTI ---------- */
type Task = { name: string; s: number; e: number; kind: 'own' | 'tp' }
const TASKS_BAD: Task[] = [
  { name: '앱', s: 0.3, e: 0.8, kind: 'own' },
  { name: 'GTM 태그 12개', s: 1.0, e: 1.9, kind: 'tp' },
  { name: '채팅 위젯', s: 2.0, e: 3.3, kind: 'tp' },
  { name: '분석 스크립트', s: 3.4, e: 4.1, kind: 'tp' },
]
const TASKS_GOOD: Task[] = [
  { name: '앱', s: 0.3, e: 0.8, kind: 'own' },
  // 남은 일은 한가할 때 50ms 미만 조각으로 (긴 작업이 아니에요)
  ...[2.4, 2.55, 2.7, 3.3, 3.45].map((s, i): Task => ({ name: i < 3 ? '분석 (idle)' : 'GTM (idle)', s, e: s + 0.04, kind: 'tp' })),
]
export function ThirdPartyDemo({ fixed }: { fixed: boolean }) {
  const tasks = fixed ? TASKS_GOOD : TASKS_BAD
  const [t, setT] = useState(-1)
  const [clicks, setClicks] = useState<{ at: number; done: number }[]>([])
  const raf = useRef(0)
  const st = useRef(0)
  const play = () => {
    cancelAnimationFrame(raf.current); setClicks([])
    st.current = performance.now()
    const step = () => { const v = Math.min(5, (performance.now() - st.current) / 1000); setT(v); if (v < 5) raf.current = requestAnimationFrame(step) }
    raf.current = requestAnimationFrame(step)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const busyAt = (x: number) => tasks.find(k => x >= k.s && x < k.e)
  const press = () => {
    if (t < 0.8 || t >= 5) return
    const k = busyAt(t)
    setClicks(c => [...c, { at: t, done: k ? k.e : t + 0.05 }])
  }
  const X = (s: number) => (s / 5) * 100 + '%'
  const last = clicks[clicks.length - 1]
  const shown = t >= 0.8
  return (
    <div className="pf-col">
      <div className="pf-tti">
        <div className="pf-phone-mini">
          {shown ? <>
            <div className="pf-hero on">신상품 20% 할인</div>
            <button type="button" className="btn sm pf-buy" onClick={press}>구매하기</button>
            {last && t >= last.done && <span className="pf-ok">담았어요 ✓</span>}
          </> : <div className="pf-blank">로딩 중…</div>}
        </div>
        <div className="pf-water">
          <div className="pf-wrow"><span className="pf-wname">메인 스레드</span>
            <div className="pf-wtrack">
              {tasks.map(k => <span key={k.name + k.s} className={'pf-task ' + k.kind} style={{ left: X(k.s), width: X(k.e - k.s), opacity: t >= k.s ? 1 : 0.25 }} title={k.name} />)}
              {clicks.map((c, i) => <span key={i} className="pf-click" style={{ left: X(c.at), width: X(Math.max(0.04, c.done - c.at)) }} />)}
            </div>
          </div>
          <div className="pf-legend">{[...new Map(tasks.map(k => [k.name, k])).values()].map(k => <span key={k.name} className={k.kind}>{k.name}</span>)}</div>
          <div className="pf-wrow axis"><span /><div className="pf-wtrack">{[0, 1, 2, 3, 4, 5].map(s => <i key={s} style={{ left: X(s) }}>{s}s</i>)}<span className="pf-head" style={{ left: X(Math.max(0, t)) }} /></div></div>
        </div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={play}>페이지 열기 재생</button>
        <span className="dv-log">화면이 뜨면 바로 <b>구매하기</b>를 눌러 보세요</span>
      </div>
      <div className="dv-meters">
        <Meter label="누른 뒤 반응까지" value={last ? `${fmt(Math.round((last.done - last.at) * 1000))}ms` : '—'} bad={last ? last.done - last.at > 0.2 : undefined} />
        <Meter label="TTI (마음껏 누를 수 있는 시각)" value={`${Math.max(...tasks.filter(k => k.e - k.s >= 0.05).map(k => k.e)).toFixed(1)}초`} bad={!fixed} />
      </div>
    </div>
  )
}

/* ---------- 08 웹 폰트 FOIT · CLS ---------- */
export function FontDemo({ fixed }: { fixed: boolean }) {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'done'>('done')
  const [shift, setShift] = useState<number | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const y0 = useRef(0)
  const timer = useRef(0)
  const reload = () => {
    clearTimeout(timer.current)
    setShift(null); setPhase('wait')
    requestAnimationFrame(() => { y0.current = btn.current?.offsetTop ?? 0 })
    timer.current = window.setTimeout(() => setPhase('done'), fixed ? 400 : 1600)
  }
  useLayoutEffect(() => { if (phase === 'done' && y0.current) { setShift((btn.current?.offsetTop ?? 0) - y0.current); y0.current = 0 } }, [phase])
  useEffect(() => () => clearTimeout(timer.current), [])
  const cls = phase === 'wait' ? (fixed ? 'fallback-matched' : 'invisible') : 'web'
  return (
    <div className="pf-col">
      <div className={'pf-font ' + cls}>
        <h5>가을 신상품이 도착했어요</h5>
        <p>포근한 니트와 가벼운 아우터를 지금 만나 보세요. 오늘 주문하면 내일 도착해요.</p>
        <button type="button" ref={btn} className="btn sm">지금 보러 가기</button>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm ghost" onClick={reload}>새로고침해 보기</button>
        <span className="dv-log">{phase === 'wait' ? (fixed ? '대체 글꼴로 먼저 보여주는 중…' : '글꼴 내려받는 중… 글자가 안 보여요') : '웹 폰트 적용됨'}</span>
      </div>
      <div className="dv-meters">
        <Meter label="글자 안 보인 시간" value={fixed ? '0ms' : '1,600ms'} bad={!fixed} />
        <Meter label="버튼이 밀린 거리" value={shift === null ? '—' : `${shift}px`} bad={shift === null ? undefined : shift !== 0} />
      </div>
    </div>
  )
}

/* ---------- 09 Concurrent 렌더링 찢김 ---------- */
const ext = { v: 0, subs: new Set<() => void>() }
const sub = (f: () => void) => { ext.subs.add(f); return () => { ext.subs.delete(f) } }
const snap = () => ext.v
const CELLS = 10
function CellBad({ tick }: { tick: number }) { busy(6); return <span className="pf-cell" data-v={ext.v} data-t={tick} style={{ ['--h' as string]: (ext.v * 37) % 360 }}>{ext.v}</span> }
function CellGood({ tick }: { tick: number }) { const v = useSyncExternalStore(sub, snap); busy(6); return <span className="pf-cell" data-v={v} data-t={tick} style={{ ['--h' as string]: (v * 37) % 360 }}>{v}</span> }
export function TearingDemo({ fixed }: { fixed: boolean }) {
  const [tick, setTick] = useState(0)
  const [kinds, setKinds] = useState<number | null>(null)
  const [worst, setWorst] = useState(0)
  const row = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  useLayoutEffect(() => {
    if (!tick || !row.current) return
    const n = new Set([...row.current.querySelectorAll('.pf-cell')].map(e => e.getAttribute('data-v'))).size
    setKinds(n); setWorst(w => Math.max(w, n))
  }, [tick])
  const stop = () => { timers.current.forEach(clearInterval); timers.current = [] }
  useEffect(() => stop, [])
  const start = () => {
    stop(); setWorst(0)
    // 바깥 저장소 값이 계속 바뀌는 중에 (실시간 시세·센서 값처럼)
    timers.current.push(window.setInterval(() => { ext.v++; ext.subs.forEach(f => f()) }, 15))
    // 화면은 낮은 우선순위(전환)로 다시 그려요
    timers.current.push(window.setInterval(() => startTransition(() => setTick(t => t + 1)), 250))
    window.setTimeout(stop, 2600)
  }
  const Cell = fixed ? CellGood : CellBad
  return (
    <div className="pf-col">
      <div className="pf-cells" ref={row}>{Array.from({ length: CELLS }, (_, i) => <Cell key={i} tick={tick} />)}</div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={start}>실시간 값 흘려보내기 (2.6초)</button>
      </div>
      <div className="dv-meters">
        <Meter label="같은 값인데 칸마다 다른 숫자" value={kinds === null ? '—' : `${kinds}종`} bad={kinds === null ? undefined : kinds > 1} />
        <Meter label="가장 심했을 때" value={worst ? `${worst}종` : '—'} bad={worst ? worst > 1 : undefined} />
      </div>
      <p className="dv-log">10칸 모두 <b>같은 저장소 값</b>을 보여줘야 해요. 색과 숫자가 섞이면 찢긴 거예요.</p>
    </div>
  )
}

/* ---------- 10 top · left 애니메이션 ---------- */
const DOTS = 120
export function TransformDemo({ fixed }: { fixed: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [run, setRun] = useState(false)
  const [m, setM] = useState({ fps: 0, js: 0 })
  useEffect(() => {
    if (!run) return
    const root = box.current!
    const dots = [...root.querySelectorAll<HTMLElement>('.pf-dot')]
    let raf = 0, frames = 0, jsSum = 0, last = performance.now(), t = 0
    const W = root.clientWidth - 12, H = root.clientHeight - 12
    const frame = () => {
      const a = performance.now()
      t += 0.02
      dots.forEach((d, i) => {
        const x = (Math.sin(t + i) * 0.5 + 0.5) * W, y = (Math.cos(t * 1.3 + i * 0.7) * 0.5 + 0.5) * H
        if (fixed) d.style.transform = `translate3d(${x}px, ${y}px, 0)`
        else {
          void d.offsetLeft // ✕ 위치를 읽고 (레이아웃 강제 계산)
          d.style.left = x + 'px'; d.style.top = y + 'px' // ✕ 바로 레이아웃 속성을 써요
        }
      })
      jsSum += performance.now() - a; frames++
      const now = performance.now()
      if (now - last > 500) { setM({ fps: Math.round((frames * 1000) / (now - last)), js: jsSum / frames }); frames = 0; jsSum = 0; last = now }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setRun(false) })
    io.observe(root)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [run, fixed])
  return (
    <div className="pf-col">
      <div className="pf-arena" ref={box}>
        <p className="pf-filler">{'레이아웃 계산이 무거워지도록 깔아 둔 글이에요. '.repeat(14)}</p>
        {Array.from({ length: DOTS }, (_, i) => <span key={i} className={'pf-dot' + (fixed ? ' gpu' : '')} />)}
      </div>
      <div className="pf-pipe">
        {['JS', 'Style', 'Layout', 'Paint', 'Composite'].map(s => <span key={s} className={fixed && (s === 'Layout' || s === 'Paint') ? 'skip' : 'hit'}>{s}</span>)}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => setRun(r => !r)}>{run ? '멈추기' : '점 120개 움직이기'}</button>
      </div>
      <div className="dv-meters">
        <Meter label="FPS" value={run ? m.fps : '—'} bad={run ? m.fps < 50 : undefined} />
        <Meter label="프레임당 JS 시간" value={run ? `${m.js.toFixed(1)}ms` : '—'} bad={run ? m.js > 4 : undefined} />
      </div>
    </div>
  )
}
