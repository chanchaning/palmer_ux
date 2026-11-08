import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { EASE, useMotion } from '../../../lib/motion'
import { cap, center, clamp, glide, loc, now, useFinger, useSim, velo, type Pt } from '../shared'

let SEQ = 0

/* ---------- 03 Swipe ---------- */
const CARDS = [['🏔️', '설악산 일출', '강원 · 새벽 5시', 'g2'], ['🌊', '제주 바다', '협재 해변', 'g3'], ['🌆', '서울 야경', '남산 전망대', 'g1'], ['🌸', '경주 벚꽃', '보문호 산책길', 'g4']] as const
type SwipeItem = { key: number; d: (typeof CARDS)[number] }
const makeCards = (): SwipeItem[] => CARDS.map(d => ({ key: ++SEQ, d }))

export function Swipe() {
  const m = useMotion()
  const box = useRef<HTMLDivElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const els = useRef(new Map<number, HTMLDivElement>())
  const F = useFinger(), S = useSim()
  const [items, setItems] = useState(makeCards)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const [gen, setGen] = useState(0)
  /** 아직 남아 있는 카드 (맨 위가 0번) */
  const live = useRef<number[]>([])
  const s = useRef<{ key: number; el: HTMLDivElement; x0: number; y0: number; dx: number; dy: number; pts: { x: number; t: number }[] } | null>(null)
  const [log, setLog] = useState<ReactNode>(<>카드를 <b>좌우로 던지기</b> — 오른쪽 저장, 왼쪽 넘기기</>)

  const layout = () => live.current.forEach((k, i) => {
    const c = els.current.get(k)
    if (!c) return
    c.style.transform = 'translateY(' + i * 8 + 'px) scale(' + (1 - i * 0.05) + ')'
    c.style.zIndex = String(10 - i)
    c.style.opacity = i > 2 ? '0' : '1'
  })
  // 새로 쌓을 때마다 배치
  useLayoutEffect(() => {
    live.current = itemsRef.current.map(x => x.key)
    layout()
  }, [gen]) // eslint-disable-line react-hooks/exhaustive-deps

  const build = () => { s.current = null; setItems(makeCards()); setGen(g => g + 1) }
  const title = (k: number) => itemsRef.current.find(x => x.key === k)?.d[1] ?? ''
  const lbl = (c: HTMLElement, dx: number) => {
    const y = c.querySelector<HTMLElement>('.yes'), n = c.querySelector<HTMLElement>('.no')
    if (y) y.style.opacity = String(clamp(dx / 70, 0, 1))
    if (n) n.style.opacity = String(clamp(-dx / 70, 0, 1))
  }
  const fly = (key: number, dir: 1 | -1, dy: number, why: string) => {
    const c = els.current.get(key), st = stack.current
    if (!c || !st) return
    const W = st.clientWidth
    live.current = live.current.filter(k => k !== key)
    const from = c.style.transform
    c.classList.add('drag')
    const to = 'translate(' + dir * W * 1.7 + 'px,' + (dy + 30) + 'px) rotate(' + dir * 28 + 'deg)'
    c.style.transform = to; lbl(c, dir * 100)
    m.A(c, [{ transform: from }, { transform: to, opacity: 0.6 }], 320, EASE.out).onfinish = () => setItems(it => it.filter(x => x.key !== key))
    layout()
    setLog(<>{dir > 0 ? '→ 오른쪽' : '← 왼쪽'} 스와이프 · {why} → <b>{dir > 0 ? '저장' : '넘기기'}</b> (‘{title(key)}’)</>)
  }
  const down = (p: Pt) => {
    const key = live.current[0], el = key !== undefined ? els.current.get(key) : undefined
    if (key === undefined || !el) return
    m.clearA(el) // 이전 제자리 애니메이션이 끌기를 덮지 않도록
    s.current = { key, el, x0: p.x, y0: p.y, dx: 0, dy: 0, pts: [{ x: p.x, t: now() }] }
    el.classList.add('drag')
  }
  const move = (p: Pt) => {
    const st = s.current
    if (!st) return
    st.dx = p.x - st.x0; st.dy = (p.y - st.y0) * 0.3
    st.pts.push({ x: p.x, t: now() }); if (st.pts.length > 30) st.pts.shift()
    st.el.style.transform = 'translate(' + st.dx + 'px,' + st.dy + 'px) rotate(' + st.dx / 20 + 'deg)'
    lbl(st.el, st.dx)
    setLog(<>끄는 중 <b>{Math.round(st.dx)}px</b> · 기준 {Math.round((stack.current?.clientWidth ?? 0) * 0.35)}px</>)
  }
  const up = () => {
    const st = s.current
    if (!st) return
    const { key, el, dx, dy } = st, v = velo(st.pts), thr = (stack.current?.clientWidth ?? 0) * 0.35
    s.current = null
    const why = '거리 ' + Math.round(Math.abs(dx)) + 'px · 속도 ' + Math.abs(v).toFixed(2) + 'px/ms'
    if (dx > thr || (v > 0.5 && dx > 20)) fly(key, 1, dy, why)
    else if (dx < -thr || (v < -0.5 && dx < -20)) fly(key, -1, dy, why)
    else {
      el.classList.remove('drag'); lbl(el, 0)
      const from = el.style.transform
      layout()
      m.A(el, [{ transform: from }, { transform: el.style.transform }], 380, EASE.spring)
      setLog(<>{why} → 기준 미달, <b>제자리로</b></>)
    }
  }
  const btn = (dir: 1 | -1) => { const k = live.current[0]; if (k !== undefined) fly(k, dir, 0, '버튼') }

  const demo = useDemo({
    reset() { S.end(); F.hide(); build() },
    async play(c) {
      S.begin()
      const p = center(box.current!, stack.current!)
      const drag = (p: Pt) => { F.at(p, true); move(p) }
      // 1) 짧게 끌고 놓기 → 제자리
      F.at(p); await c.sleep(250)
      F.at(p, true); down(p)
      await glide(c, m.D, p, { x: p.x + 40, y: p.y + 4 }, 500, drag)
      await c.sleep(150)
      up(); F.hide(); await c.sleep(900)
      // 2) 멀리 끌어 오른쪽 저장
      F.at(p, true); down(p)
      await glide(c, m.D, p, { x: p.x + 120, y: p.y + 10 }, 450, drag)
      up(); F.hide(); await c.sleep(900)
      // 3) 빠르게 왼쪽으로 던지기
      F.at(p, true); down(p)
      await glide(c, m.D, p, { x: p.x - 60, y: p.y }, 90, drag, t => t)
      up(); F.hide(); await c.sleep(500)
      S.end()
    },
  })

  return (
    <Card id="gesture-swipe" num="03" title="스와이프" en="Swipe" desc="빠르게 쓸어 넘겨요. 멀리 끌었거나, 짧아도 빠르게 던지면 넘어가요." demo={demo}>
      <Stage log={log} logId="gesture-swipe-log">
        <div className={'box gs-box' + S.cls} id="gesture-swipe-box" ref={box}>
          <div className="gs-stack" id="gesture-swipe-stack" ref={stack}
            onPointerDown={e => {
              const top = live.current[0] !== undefined ? els.current.get(live.current[0]) : undefined
              if (e.button > 0 || !top || !top.contains(e.target as Node)) return
              cap(e.currentTarget, e); S.touch(); down(loc(e, box.current!))
            }}
            onPointerMove={e => move(loc(e, box.current!))}
            onPointerUp={up}
            onPointerCancel={up}>
            <div className="gs-empty">모두 넘겼어요<br />↺ 다시 쌓기</div>
            {items.slice().reverse().map(({ key, d }) => (
              <div key={key} className={'gs-sc ' + d[3]} ref={el => { if (el) els.current.set(key, el); else els.current.delete(key) }}>
                <span className="em">{d[0]}</span><b>{d[1]}</b><small>{d[2]}</small>
                <span className="lbl yes">저장 ♥</span><span className="lbl no">넘기기 ✕</span>
              </div>
            ))}
          </div>
          <div className="gs-btns">
            <button className="gs-round" id="gesture-swipe-no" aria-label="넘기기" onClick={() => btn(-1)}>✕</button>
            <button className="btn ghost sm" id="gesture-swipe-again" onClick={() => { build(); setLog(<>카드 <b>4장</b>을 다시 쌓았어요</>) }}>↺ 다시 쌓기</button>
            <button className="gs-round yes" id="gesture-swipe-yes" aria-label="저장" onClick={() => btn(1)}>♥</button>
          </div>
          <span className="gs-hint swr" style={{ left: '50%', top: '40%' }}>👆</span>
          <i className="gs-finger" ref={F.ref} />
        </div>
      </Stage>
      <Info
        spec={[['거리', '카드 폭 35%'], ['또는 속도', '0.5px/ms'], ['회전', '거리 ÷ 20°']]}
        usage={[
          ['언제', '추천·매칭처럼 하나씩 빠르게 고를 때'],
          ['주의', '방향의 의미를 라벨로 보여주고, ✕ ♥ 버튼도 함께 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 Swipe to delete ---------- */
const ROWS = [['김', '김디자', '시안 피드백 남겼어요', ''], ['박', '박기획', '회의록 공유드려요', 'o'], ['📦', '배송 알림', '오늘 도착 예정이에요', ''], ['이', '이개발', '배포 완료했습니다', 'o']] as const
type RowItem = { key: number; d: (typeof ROWS)[number] }
const makeRows = (): RowItem[] => ROWS.map(d => ({ key: ++SEQ, d }))
const RV = 84

export function SwipeDelete() {
  const m = useMotion()
  const box = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const rowEls = useRef(new Map<number, HTMLDivElement>())
  const frontEls = useRef(new Map<number, HTMLDivElement>())
  const F = useFinger(), S = useSim()
  const [rows, setRows] = useState(makeRows)
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const [gone, setGone] = useState(0)
  const [fullKey, setFull] = useState<number | null>(null)
  const goneSet = useRef(new Set<number>())
  const openRow = useRef<number | null>(null)
  const gen = useRef(0)
  const s = useRef<{ key: number; x0: number; y0: number; base: number; lock: 'x' | 'y' | null; off: number; W: number } | null>(null)
  const [log, setLog] = useState<ReactNode>(<>행을 <b>왼쪽으로 밀기</b> — 조금 / 끝까지</>)

  const build = () => {
    gen.current++
    s.current = null; openRow.current = null; goneSet.current.clear()
    setRows(makeRows()); setGone(0); setFull(null)
  }
  const name = (k: number) => rowsRef.current.find(x => x.key === k)?.d[1] ?? ''
  const setX = (k: number, x: number, snap: boolean) => {
    const f = frontEls.current.get(k)
    if (!f) return
    f.classList.toggle('snap', snap)
    f.style.transform = x ? 'translateX(' + x + 'px)' : ''
  }
  const closeRow = (k: number | null) => {
    if (k === null) return
    setX(k, 0, true)
    setFull(f => (f === k ? null : f))
    if (openRow.current === k) openRow.current = null
  }
  const remove = async (k: number, why: ReactNode) => {
    const r = rowEls.current.get(k), f = frontEls.current.get(k)
    if (!r || !f || !r.isConnected || goneSet.current.has(k)) return
    goneSet.current.add(k)
    const g = gen.current
    const W = r.clientWidth, cur = f.style.transform || 'none'
    f.classList.remove('snap')
    await m.A(f, [{ transform: cur }, { transform: 'translateX(' + -W + 'px)' }], 160, EASE.in).finished.catch(() => {})
    await m.A(r, [{ height: r.offsetHeight + 'px', marginBottom: '0px' }, { height: '0px', marginBottom: '-6px' }], 200, EASE.std).finished.catch(() => {})
    if (g !== gen.current) return
    const n = name(k)
    setRows(rs => rs.filter(x => x.key !== k))
    if (openRow.current === k) openRow.current = null
    setGone(v => v + 1)
    setLog(<>{why} → ‘<b>{n}</b>’ 삭제됨</>)
  }
  const down = (k: number, p: Pt) => {
    if (openRow.current !== null && openRow.current !== k) closeRow(openRow.current)
    s.current = { key: k, x0: p.x, y0: p.y, base: openRow.current === k ? -RV : 0, lock: null, off: 0, W: rowEls.current.get(k)?.clientWidth ?? 1 }
  }
  const move = (p: Pt) => {
    const st = s.current
    if (!st) return
    const dx = p.x - st.x0, dy = p.y - st.y0
    if (!st.lock) {
      if (Math.hypot(dx, dy) < 6) return
      st.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (st.lock === 'y') { setLog(<>세로로 움직임 → <b>스크롤</b>로 판정, 삭제 안 함</>); s.current = null; return }
    }
    let off = st.base + dx
    if (off > 0) off *= 0.3
    st.off = off; setX(st.key, off, false)
    const full = -off > st.W * 0.6
    setFull(full ? st.key : null)
    setLog(<>왼쪽으로 <b>{Math.round((Math.max(0, -off) / st.W) * 100)}%</b>{full ? ' · 놓으면 바로 삭제' : -off > RV / 2 ? ' · 놓으면 버튼 고정' : ''}</>)
  }
  const up = () => {
    const st = s.current
    if (!st) return
    const { key, off, W, lock } = st
    s.current = null
    if (!lock) { if (openRow.current === key) { closeRow(key); setLog(<>열린 행을 탭 → <b>닫힘</b></>) } return }
    if (-off > W * 0.6) remove(key, '끝까지 밀기 (' + Math.round((-off / W) * 100) + '%)')
    else if (-off > RV / 2) { setX(key, -RV, true); setFull(null); openRow.current = key; setLog(<>삭제 버튼 노출 · <b>눌러서 확인</b>하거나 다시 밀어 닫기</>) }
    else { closeRow(key); setLog(<>조금만 밀어서 → <b>원래대로</b></>) }
  }

  const demo = useDemo({
    reset() { S.end(); F.hide(); build() },
    async play(c) {
      S.begin()
      const b = box.current!
      const rowAt = (i: number) => { const r = wrap.current!.querySelectorAll<HTMLElement>('.gs-row')[i]; return { r, k: Number(r.dataset.k) } }
      const drag = (p: Pt) => { F.at(p, true); move(p) }
      const { r: r1, k: k1 } = rowAt(1), o1 = m.rel(b, r1), p1 = { x: o1.left + o1.width - 40, y: o1.top + o1.height / 2 }
      F.at(p1); await c.sleep(250)
      F.at(p1, true); down(k1, p1)
      await glide(c, m.D, p1, { x: p1.x - 100, y: p1.y + 2 }, 450, drag)
      up(); F.hide(); await c.sleep(1100)
      const { r: r0, k: k0 } = rowAt(0), o0 = m.rel(b, r0), p0 = { x: o0.left + o0.width - 30, y: o0.top + o0.height / 2 }
      F.at(p0); await c.sleep(250)
      F.at(p0, true); down(k0, p0)
      await glide(c, m.D, p0, { x: o0.left + 30, y: p0.y }, 700, drag)
      up(); F.hide(); await c.sleep(700)
      S.end()
    },
  })

  return (
    <Card id="gesture-delete" num="06" title="밀어서 삭제" en="Swipe to Delete" desc="행을 왼쪽으로 밀면 삭제 버튼이 드러나고, 끝까지 밀면 바로 지워져요." demo={demo}>
      <Stage log={log} logId="gesture-delete-log">
        <div className={'box gs-box left' + S.cls} id="gesture-delete-box" ref={box}>
          <div className="gs-rows" id="gesture-delete-rows" ref={wrap}>
            {rows.map(({ key, d }) => (
              <div key={key} className={'gs-row' + (fullKey === key ? ' full' : '')} data-k={key}
                ref={el => { if (el) rowEls.current.set(key, el); else rowEls.current.delete(key) }}>
                <button className="gs-delbtn" tabIndex={-1} onClick={() => remove(key, '삭제 버튼 탭')}>🗑 <span>{fullKey === key ? '놓으면 삭제' : '삭제'}</span></button>
                <div className="gs-front snap" ref={el => { if (el) frontEls.current.set(key, el); else frontEls.current.delete(key) }}
                  onPointerDown={e => { if (e.button > 0) return; cap(e.currentTarget, e); S.touch(); down(key, loc(e, box.current!)) }}
                  onPointerMove={e => move(loc(e, box.current!))}
                  onPointerUp={up}
                  onPointerCancel={up}>
                  <i className={'ic round ' + d[3]}>{d[0]}</i><span className="tx">{d[1]}<small>{d[2]}</small></span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn ghost sm gs-undo" id="gesture-delete-undo" hidden={gone === 0}
            onClick={() => { build(); setLog(<><b>되돌리기</b> — 지운 항목이 돌아왔어요</>) }}>↺ 되돌리기 ({gone})</button>
          <span className="gs-hint swl" style={{ right: '20%', top: 24 }}>👆</span>
          <i className="gs-finger" ref={F.ref} />
        </div>
      </Stage>
      <Info
        spec={[['버튼 노출', '84px'], ['바로 삭제', '행 폭 60%'], ['방향 고정', '첫 6px']]}
        usage={[
          ['언제', '메일·알림·장바구니 목록의 빠른 정리'],
          ['주의', '실수로 끝까지 밀 수 있어요 — 되돌리기를 꼭 제공하세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 Edge swipe ---------- */
const CHATS = [['김', '김디자', '내일 3시에 만나요', ''], ['박', '박기획', '시안 확인 부탁드려요', 'o'], ['이', '이개발', '배포 끝났어요 🚀', ''], ['정', '정와플', '사진 보냈어요', 'o']] as const
const EDGE = 24

export function EdgeSwipe() {
  const m = useMotion()
  const dev = useRef<HTMLDivElement>(null)
  const a = useRef<HTMLDivElement>(null)
  const b = useRef<HTMLDivElement>(null)
  const shade = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const F = useFinger(), S = useSim()
  const [open, setOpenState] = useState(true)
  const openRef = useRef(true)
  const [name, setName] = useState('김디자')
  const s = useRef<{ x0: number; prog: number; pts: { x: number; t: number }[] } | null>(null)
  const [log, setLog] = useState<ReactNode>(<>주황색 <b>왼쪽 끝</b>에서 오른쪽으로 끌기</>)

  const W = () => dev.current?.clientWidth ?? 0
  const paint = (prog: number) => {
    if (!a.current || !b.current || !shade.current) return
    b.current.style.transform = prog ? 'translateX(' + prog * W() + 'px)' : ''
    a.current.style.transform = 'translateX(' + -0.3 * W() * (1 - prog) + 'px)'
    shade.current.style.opacity = String(0.18 * (1 - prog))
  }
  const setOpen = (v: boolean) => { openRef.current = v; setOpenState(v) }
  const settle = async (toOpen: boolean, from: number) => {
    const A1 = a.current, B1 = b.current, Sh = shade.current
    if (!A1 || !B1 || !Sh) return
    m.clearA(A1, B1, Sh)
    const to = toOpen ? 0 : 1, ms = 260
    paint(to)
    const fa = (p: number) => ({ transform: 'translateX(' + -0.3 * W() * (1 - p) + 'px)' }), fb = (p: number) => ({ transform: 'translateX(' + p * W() + 'px)' })
    m.A(A1, [fa(from), fa(to)], ms, EASE.out)
    m.A(Sh, [{ opacity: 0.18 * (1 - from) }, { opacity: 0.18 * (1 - to) }], ms, EASE.out)
    const an = m.A(B1, [fb(from), fb(to)], ms, EASE.out)
    setOpen(toOpen)
    const ok = await an.finished.then(() => true, () => false)
    if (ok) { m.clearA(A1, B1, Sh); paint(to) }
  }
  useLayoutEffect(() => { paint(0) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onR = () => { if (!s.current) paint(openRef.current ? 0 : 1) }
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const down = (p: Pt) => {
    if (!openRef.current) return
    if (p.x > EDGE) { setLog(<>x <b>{Math.round(p.x)}px</b>에서 시작 → 가장자리(24px 안)가 아니라 무시</>); return }
    m.clearA(a.current, b.current, shade.current)
    s.current = { x0: p.x, prog: 0, pts: [{ x: p.x, t: now() }] }
    setLog(<>가장자리에서 시작 → <b>뒤로 가기</b> 추적</>)
  }
  const move = (p: Pt) => {
    const st = s.current
    if (!st) return
    st.prog = clamp((p.x - st.x0) / W(), 0, 1)
    st.pts.push({ x: p.x, t: now() }); if (st.pts.length > 30) st.pts.shift()
    paint(st.prog)
    setLog(<>이전 화면 미리보기 <b>{Math.round(st.prog * 100)}%</b></>)
  }
  const up = () => {
    const st = s.current
    if (!st) return
    const { prog } = st, v = velo(st.pts)
    s.current = null
    const done = prog > 0.4 || (v > 0.5 && prog > 0.05)
    settle(!done, prog)
    setLog(done
      ? <>가장자리 스와이프 → <b>뒤로</b> (진행 {Math.round(prog * 100)}% · {v.toFixed(2)}px/ms)</>
      : <>진행 {Math.round(prog * 100)}% · 기준 미달 → <b>취소</b>, 상세 화면 유지</>)
  }
  const enter = (n: string) => {
    if (openRef.current) return
    setName(n)
    settle(true, 1)
    setLog(<>‘<b>{n}</b>’ 대화로 들어감 — 다시 가장자리에서 끌어보세요</>)
  }

  const demo = useDemo({
    reset() {
      S.end(); F.hide(); s.current = null
      m.clearA(a.current, b.current, shade.current)
      setOpen(true); setName('김디자'); paint(0)
    },
    async play(c) {
      S.begin()
      const y = 230
      const p1 = { x: 110, y }
      F.at(p1); await c.sleep(250)
      F.at(p1, true); down(p1)
      await glide(c, m.D, p1, { x: 160, y }, 300, p => F.at(p, true))
      F.hide(); await c.sleep(1200)
      const p0 = { x: 6, y }
      const drag = (p: Pt) => { F.at(p, true); move(p) }
      F.at(p0); await c.sleep(250)
      F.at(p0, true); down(p0)
      await glide(c, m.D, p0, { x: 70, y: y + 4 }, 500, drag)
      await c.sleep(500)
      await glide(c, m.D, { x: 70, y: y + 4 }, { x: 150, y: y + 6 }, 400, drag)
      up(); F.hide(); await c.sleep(1200)
      const li = listRef.current?.querySelectorAll<HTMLElement>('.li')[1] ?? null
      await c.press(dev.current, li)
      await c.sleep(600)
      S.end()
    },
  })

  return (
    <Card id="gesture-edge" num="09" title="가장자리 스와이프" en="Edge Swipe Back" desc="화면 왼쪽 끝에서 오른쪽으로 끌면 이전 화면이 미리 보이며 뒤로 가요." demo={demo}>
      <Stage log={log} logId="gesture-edge-log">
        <div className={'device' + S.cls} id="gesture-edge-dev" ref={dev}
          onPointerDown={e => {
            const t = e.target as HTMLElement
            if (e.button > 0 || !b.current?.contains(t) || t.closest('.back')) return
            S.touch()
            down(loc(e, dev.current!))
            if (s.current) cap(e.currentTarget, e)
          }}
          onPointerMove={e => move(loc(e, dev.current!))}
          onPointerUp={up}
          onPointerCancel={up}>
          <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
            <div className="scr" id="gesture-edge-a" style={{ zIndex: 0 }} ref={el => { a.current = el; listRef.current = el }}>
              <div className="bar">메시지</div>
              {CHATS.map(([ic, n, sub, o]) => (
                <div className="li" data-n={n} key={n} onClick={() => enter(n)}>
                  <i className={'ic round' + (o ? ' o' : '')}>{ic}</i><span>{n}<span className="sub">{sub}</span></span><span className="chev">›</span>
                </div>
              ))}
              <div className="shade" id="gesture-edge-shade" ref={shade} />
            </div>
            <div className="scr gs-edgeb" id="gesture-edge-b" ref={b}>
              <div className="bar">
                <button className="back" id="gesture-edge-back" aria-label="뒤로"
                  onClick={() => { if (!openRef.current) return; settle(false, 0); setLog(<>‹ 버튼으로 <b>뒤로</b> — 같은 결과</>) }}>‹</button>
                <span id="gesture-edge-name">{name}</span>
              </div>
              <div className="gs-msgs"><span>안녕하세요!</span><span>내일 3시에 만나요</span><span className="me">좋아요, 성수에서 봬요</span><span>시안 챙겨갈게요 🙂</span></div>
            </div>
            <div className={'gs-edgezone' + (open ? '' : ' off')} id="gesture-edge-zone" />
            <span className="gs-hint swr" style={{ left: 10, top: 200 }}>👆</span>
            <i className="gs-finger" ref={F.ref} />
        </div>
      </Stage>
      <Info
        spec={[['시작 영역', '왼쪽 24px'], ['완료', '40% 또는 0.5px/ms'], ['미리보기', '이전 화면 −30% → 0']]}
        usage={[
          ['언제', '목록 → 상세처럼 계층을 들어간 화면에서 뒤로 가기'],
          ['주의', '캐러셀 같은 가로 스와이프와 부딪혀요 — 가장자리에서 시작할 때만 반응'],
        ]}
      />
    </Card>
  )
}
