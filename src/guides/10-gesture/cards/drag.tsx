import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { cap, center, clamp, glide, loc, useFinger, useSim, type Pt } from '../shared'

/* ---------- 04 Drag reorder ---------- */
const TODO = ['🛒 장보기', '📮 택배 보내기', '🏃 저녁 러닝', '📚 책 반납', '💊 영양제 주문']
const ORIG = TODO.map((_, i) => i)

export function DragReorder() {
  const m = useMotion()
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const F = useFinger(), S = useSim()
  const [order, setOrder] = useState(ORIG)
  const s = useRef<{ it: HTMLElement; all: HTMLElement[]; from: number; to: number; y0: number; H: number } | null>(null)
  const [log, setLog] = useState<ReactNode>(<>오른쪽 <b>☰ 손잡이</b>를 잡고 위아래로</>)

  const items = () => [...(list.current?.querySelectorAll<HTMLElement>('.gs-li') ?? [])]
  const txt = (it: HTMLElement) => it.querySelector('.tx')?.textContent ?? ''
  const down = (it: HTMLElement, p: Pt) => {
    const all = items()
    s.current = { it, all, from: all.indexOf(it), to: all.indexOf(it), y0: p.y, H: it.offsetHeight + 6 }
    it.classList.add('lift')
    it.style.transform = 'scale(1.03)'
    setLog(<>‘<b>{txt(it)}</b>’ 들어올림</>)
  }
  const move = (p: Pt) => {
    const st = s.current
    if (!st) return
    const n = st.all.length, dy = clamp(p.y - st.y0, -st.from * st.H - 10, (n - 1 - st.from) * st.H + 10)
    st.it.style.transform = 'translateY(' + dy + 'px) scale(1.03)'
    st.to = clamp(Math.round(st.from + dy / st.H), 0, n - 1)
    st.all.forEach((o, i) => {
      if (o === st.it) return
      let off = 0
      if (st.from < st.to && i > st.from && i <= st.to) off = -st.H
      if (st.to < st.from && i >= st.to && i < st.from) off = st.H
      o.style.transform = off ? 'translateY(' + off + 'px)' : ''
    })
    setLog(<>{st.from + 1}번 → <b>{st.to + 1}번 자리</b>로 이동 중</>)
  }
  const up = async () => {
    const st = s.current
    if (!st) return
    const { it, all, from, to, H } = st
    s.current = null
    const cur = it.style.transform
    await m.A(it, [{ transform: cur }, { transform: 'translateY(' + (to - from) * H + 'px)' }], 160, EASE.out).finished.catch(() => {})
    const l = list.current
    if (!l || !it.isConnected) return
    l.classList.add('static')
    // 순서를 React 상태로 커밋한 직후(같은 프레임) 임시 transform 정리
    flushSync(() => setOrder(o => { const rest = o.filter((_, i) => i !== from); rest.splice(to, 0, o[from]); return rest }))
    all.forEach(o => { o.style.transform = ''; m.clearA(o) })
    it.classList.remove('lift')
    void l.offsetHeight
    l.classList.remove('static')
    setLog(from === to ? <><b>제자리</b>에 놓음</> : <>‘<b>{txt(it)}</b>’ {from + 1}번 → {to + 1}번으로 이동</>)
  }

  const demo = useDemo({
    reset() {
      S.end(); F.hide(); s.current = null
      const l = list.current
      if (!l) return
      l.classList.add('static')
      flushSync(() => setOrder(ORIG))
      items().forEach(o => { m.clearA(o); o.style.transform = ''; o.classList.remove('lift') })
      void l.offsetHeight
      l.classList.remove('static')
    },
    async play(c) {
      S.begin()
      const it = items()[0], grip = it.querySelector('.gs-grip')!
      const p = center(box.current!, grip), H = it.offsetHeight + 6
      F.at(p); await c.sleep(300)
      F.at(p, true); down(it, p); await c.sleep(250)
      const to = { x: p.x, y: p.y + H * 2 + 4 }
      await glide(c, m.D, p, to, 900, q => { F.at(q, true); move(q) })
      await c.sleep(250)
      F.at(to); await up(); F.hide(); await c.sleep(400)
      S.end()
    },
  })

  return (
    <Card id="gesture-drag" num="04" title="드래그" en="Drag & Reorder" desc="잡고 끌어서 옮겨요. 들린 항목이 지나가면 나머지가 비켜서 자리를 만들어요." demo={demo}>
      <Stage log={log} logId="gesture-drag-log">
        <div className={'box gs-box' + S.cls} id="gesture-drag-box" ref={box}>
          <div className="gs-list" id="gesture-drag-list" ref={list}>
            {order.map((id, i) => (
              <div className="gs-li" key={id}>
                <span className="no">{i + 1}</span><span className="tx">{TODO[id]}</span>
                <button className="gs-grip" aria-label="순서 바꾸기"
                  onPointerDown={e => {
                    if (e.button > 0 || s.current) return
                    const li = e.currentTarget.closest<HTMLElement>('.gs-li')
                    if (!li) return
                    cap(e.currentTarget, e); S.touch(); down(li, loc(e, box.current!))
                  }}
                  onPointerMove={e => move(loc(e, box.current!))}
                  onPointerUp={up}
                  onPointerCancel={up}>☰</button>
              </div>
            ))}
          </div>
          <span className="gs-hint down" style={{ right: 'calc(50% - 128px)', top: '22%' }}>👆</span>
          <i className="gs-finger" ref={F.ref} />
        </div>
      </Stage>
      <Info
        spec={[['시작', '☰ 손잡이'], ['들림', '그림자 + 1.03배'], ['비켜서기', '200ms']]}
        usage={[
          ['언제', '즐겨찾기·재생목록·할 일 순서 바꾸기'],
          ['주의', '행 전체를 잡게 하면 스크롤과 부딪혀요 — 손잡이나 길게 누르기로 시작'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 Pinch ---------- */
export function Pinch() {
  const m = useMotion()
  const T = useTimers()
  const box = useRef<HTMLDivElement>(null)
  const view = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLDivElement>(null)
  const fitBtn = useRef<HTMLButtonElement>(null)
  const F = useFinger(), F2 = useFinger(), S = useSim()
  const [zoom, setZoom] = useState(1)
  const st = useRef({ sc: 1, tx: 0, ty: 0 })
  const g = useRef<{ d0: number; s0: number; m0: Pt; tx0: number; ty0: number } | null>(null)
  const pan = useRef<{ x0: number; y0: number; tx0: number; ty0: number } | null>(null)
  const mirror = useRef(false)
  const pts = useRef(new Map<number, Pt>())
  const [log, setLog] = useState<ReactNode>(<>두 손가락 · <b>Ctrl+휠</b> · <b>Shift+드래그</b>(두 손가락 흉내)</>)

  const apply = () => {
    const v = view.current, el = img.current, z = st.current
    if (!v || !el) return
    const W = v.clientWidth, H = v.clientHeight
    z.tx = clamp(z.tx, W - W * z.sc, 0); z.ty = clamp(z.ty, H - H * z.sc, 0)
    el.style.transform = 'translate(' + z.tx + 'px,' + z.ty + 'px) scale(' + z.sc + ')'
    setZoom(z.sc)
  }
  const zoomAt = (ns: number, c: Pt) => {
    const z = st.current
    ns = clamp(ns, 1, 4)
    const cx = (c.x - z.tx) / z.sc, cy = (c.y - z.ty) / z.sc
    z.sc = ns; z.tx = c.x - cx * z.sc; z.ty = c.y - cy * z.sc
    apply()
  }
  const startPinch = (a: Pt, b: Pt) => {
    const z = st.current
    g.current = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: z.sc, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, tx0: z.tx, ty0: z.ty }
    pan.current = null
  }
  const pinch = (a: Pt, b: Pt, how: string) => {
    const G = g.current, z = st.current
    if (!G) return
    const d = Math.hypot(a.x - b.x, a.y - b.y), mm = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const ns = clamp((G.s0 * d) / G.d0, 1, 4), cx = (G.m0.x - G.tx0) / G.s0, cy = (G.m0.y - G.ty0) / G.s0
    z.sc = ns; z.tx = mm.x - cx * z.sc; z.ty = mm.y - cy * z.sc
    apply()
    setLog(<>{how} <b>×{z.sc.toFixed(1)}</b> · 손가락 거리 {Math.round(G.d0)} → {Math.round(d)}px</>)
  }
  const mirrorOf = (p: Pt): Pt => ({ x: (view.current?.clientWidth ?? 0) - p.x, y: (view.current?.clientHeight ?? 0) - p.y })
  const anim = () => { img.current?.classList.add('anim'); T.set(() => img.current?.classList.remove('anim'), m.D(260)) }
  const mid = (): Pt => ({ x: (view.current?.clientWidth ?? 0) / 2, y: (view.current?.clientHeight ?? 0) / 2 })

  // Ctrl+휠 (preventDefault 위해 passive: false) · 창 크기 변경
  const handlers = useRef({ wheel: (_e: WheelEvent) => {}, resize: () => {} })
  handlers.current.wheel = e => {
    if (!e.ctrlKey || !view.current) return
    e.preventDefault(); S.touch()
    zoomAt(st.current.sc * Math.exp(-e.deltaY * 0.004), loc(e, view.current))
    setLog(<>Ctrl+휠 <b>×{st.current.sc.toFixed(1)}</b> · 트랙패드 핀치도 이 방식으로 들어와요</>)
  }
  handlers.current.resize = apply
  useEffect(() => {
    const v = view.current
    if (!v) return
    const onW = (e: WheelEvent) => handlers.current.wheel(e), onR = () => handlers.current.resize()
    v.addEventListener('wheel', onW, { passive: false })
    window.addEventListener('resize', onR)
    return () => { v.removeEventListener('wheel', onW); window.removeEventListener('resize', onR) }
  }, [])

  const end = (e: { pointerId: number }) => {
    pts.current.delete(e.pointerId)
    if (mirror.current) { mirror.current = false; g.current = null; F.hide(); F2.hide() }
    if (pts.current.size < 2) g.current = null
    if (pts.current.size === 1) { const p = [...pts.current.values()][0]; pan.current = { x0: p.x, y0: p.y, tx0: st.current.tx, ty0: st.current.ty } }
    if (!pts.current.size) pan.current = null
  }

  const demo = useDemo({
    reset() {
      S.end(); F.hide(); F2.hide(); g.current = null; pan.current = null; mirror.current = false; pts.current.clear()
      st.current = { sc: 1, tx: 0, ty: 0 }; img.current?.classList.remove('anim'); apply()
    },
    async play(c) {
      S.begin()
      const cc = mid()
      const a0 = { x: cc.x - 26, y: cc.y + 12 }, b0 = { x: cc.x + 26, y: cc.y - 12 }
      F.at(a0); F2.at(b0); await c.sleep(350)
      F.at(a0, true); F2.at(b0, true); startPinch(a0, b0)
      await glide(c, m.D, { x: 0, y: 0 }, { x: 62, y: 26 }, 1000, d => {
        const a = { x: a0.x - d.x, y: a0.y + d.y }, b = { x: b0.x + d.x, y: b0.y - d.y }
        F.at(a, true); F2.at(b, true); pinch(a, b, '핀치')
      })
      F.hide(); F2.hide(); await c.sleep(1000)
      await c.press(box.current, fitBtn.current)
      await c.sleep(400)
      S.end()
    },
  })

  return (
    <Card id="gesture-pinch" num="05" title="핀치" en="Pinch Zoom" desc="두 손가락 사이를 벌리면 확대, 오므리면 축소돼요. 기준점은 두 손가락의 가운데예요." demo={demo}>
      <Stage log={log} logId="gesture-pinch-log">
        <div className="box gs-box left" id="gesture-pinch-box" ref={box}>
          <div className={'gs-view' + S.cls} id="gesture-pinch-view" ref={view}
            onPointerDown={e => {
              if (e.button > 0) return
              cap(e.currentTarget, e); S.touch(); img.current?.classList.remove('anim')
              const p = loc(e, e.currentTarget)
              pts.current.set(e.pointerId, p)
              if (e.pointerType === 'mouse' && e.shiftKey) {
                mirror.current = true; startPinch(p, mirrorOf(p)); F.at(p, true); F2.at(mirrorOf(p), true)
                setLog(<>Shift+드래그 = <b>두 손가락 흉내</b> · 가운데에서 멀어지면 확대</>)
                return
              }
              if (pts.current.size === 2) { const [a, b] = [...pts.current.values()]; startPinch(a, b); setLog(<>두 손가락 감지 → <b>핀치</b> 시작</>) }
              else if (pts.current.size === 1) pan.current = { x0: p.x, y0: p.y, tx0: st.current.tx, ty0: st.current.ty }
            }}
            onPointerMove={e => {
              if (!pts.current.has(e.pointerId)) return
              const p = loc(e, e.currentTarget)
              pts.current.set(e.pointerId, p)
              if (mirror.current) { const mm = mirrorOf(p); F.at(p, true); F2.at(mm, true); pinch(p, mm, 'Shift+드래그 핀치'); return }
              if (pts.current.size >= 2 && g.current) { const [a, b] = [...pts.current.values()]; pinch(a, b, '핀치'); return }
              const P = pan.current
              if (P) {
                st.current.tx = P.tx0 + p.x - P.x0; st.current.ty = P.ty0 + p.y - P.y0; apply()
                setLog(st.current.sc > 1 ? <>한 손가락 = <b>이동</b>(확대 상태)</> : <>×1에선 이동할 곳이 없어요 — <b>두 손가락</b>이나 Shift+드래그</>)
              }
            }}
            onPointerUp={end}
            onPointerCancel={end}>
            <div className="gs-img" id="gesture-pinch-img" ref={img}>
              <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <defs><linearGradient id="gesture-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fa8dc" /><stop offset="1" stopColor="#ffe0b8" /></linearGradient></defs>
                <rect width="320" height="180" fill="url(#gesture-sky)" />
                <circle cx="238" cy="54" r="20" fill="#ffd43b" />
                <path d="M0 120 L60 62 L104 104 L150 50 L214 118 L260 80 L320 122 L320 180 L0 180Z" fill="#5c7cfa" />
                <path d="M150 50 L166 66 L156 64 L146 72 L138 62Z" fill="#fff" />
                <path d="M0 136 Q80 112 160 132 T320 130 L320 180 L0 180Z" fill="#51cf66" />
                <rect x="0" y="152" width="320" height="28" fill="#3bc9db" opacity=".8" />
                <g fill="#2b8a3e"><path d="M44 140 l10 -26 l10 26z" /><path d="M262 138 l9 -22 l9 22z" /><path d="M276 142 l8 -20 l8 20z" /></g>
                <g><rect x="118" y="124" width="22" height="16" fill="#fff4e6" /><path d="M114 126 l15 -12 l15 12z" fill="#e8590c" /><rect x="126" y="131" width="6" height="9" fill="#845ef7" /></g>
                <text x="200" y="146" fontSize="6" fill="#1b1b19">작은 글씨도 확대하면 보여요</text>
              </svg>
            </div>
            <span className="gs-zoom" id="gesture-pinch-zoom">×{zoom.toFixed(1)}</span>
            <span className="gs-hint pinch" style={{ left: '44%', top: '38%' }}>🤏</span>
            <i className="gs-finger" ref={F.ref} />
            <i className="gs-finger" ref={F2.ref} />
          </div>
          <div className="gs-zctl">
            <button className="btn ghost sm" id="gesture-pinch-out" aria-label="축소"
              onClick={() => { anim(); zoomAt(st.current.sc / 1.5, mid()); setLog(<>－ 버튼 <b>×{st.current.sc.toFixed(1)}</b></>) }}>－</button>
            <button className="btn ghost sm" id="gesture-pinch-in" aria-label="확대"
              onClick={() => { anim(); zoomAt(st.current.sc * 1.5, mid()); setLog(<>＋ 버튼 <b>×{st.current.sc.toFixed(1)}</b> · 한 손으로도 확대</>) }}>＋</button>
            <button className="btn ghost sm" id="gesture-pinch-fit" ref={fitBtn}
              onClick={() => { anim(); st.current = { sc: 1, tx: 0, ty: 0 }; apply(); setLog(<><b>1:1</b>로 되돌림</>) }}>1:1</button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['배율', '1–4×'], ['기준점', '두 손가락 가운데'], ['마우스', 'Ctrl+휠 · Shift+드래그']]}
        usage={[
          ['언제', '사진·지도·문서를 자세히 볼 때'],
          ['주의', '한 손 사용자를 위해 ＋/－ 버튼이나 두 번 탭 확대도 함께 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 Pull to refresh ---------- */
type Feed = { key: number; ic: string; o?: boolean; text: string; sub: string; isNew?: boolean }
const FEED: Feed[] = [
  { key: 1, ic: '김', text: '김디자 님이 댓글을 남겼어요', sub: '3분 전' },
  { key: 2, ic: '박', o: true, text: '박기획 님이 시안을 공유했어요', sub: '12분 전' },
  { key: 3, ic: '🎉', text: '프로젝트가 완료되었어요', sub: '1시간 전' },
  { key: 4, ic: '이', o: true, text: '이개발 님이 회원님을 언급했어요', sub: '2시간 전' },
  { key: 5, ic: '📌', text: '회의가 30분 뒤 시작돼요', sub: '어제' },
  { key: 6, ic: '정', o: true, text: '정와플 님이 팔로우했어요', sub: '어제' },
]
const NEWS = [['🆕', '최서비 님이 새 글을 올렸어요'], ['💬', '댓글 3개가 새로 달렸어요'], ['⭐', '즐겨찾기한 가게에 새 메뉴'], ['📷', '한포토 님이 사진을 공유했어요']]
const MAX = 160, TH = 60, HOLD = 52
let FEED_SEQ = 100

export function Pull() {
  const m = useMotion()
  const T = useTimers()
  const dev = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const ptr = useRef<HTMLDivElement>(null)
  const spin = useRef<HTMLElement>(null)
  const F = useFinger(), S = useSim()
  const [feed, setFeed] = useState(FEED)
  const s = useRef<{ y0: number } | null>(null)
  const off = useRef(0)
  const busy = useRef(false)
  const ni = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const [log, setLog] = useState<ReactNode>(<>목록을 <b>아래로 당겼다 놓기</b></>)

  const setOff = (v: number, snap = false) => {
    const l = list.current, p = ptr.current, sp = spin.current
    off.current = v
    if (!l || !p || !sp) return
    l.classList.toggle('snap', snap); p.classList.toggle('snap', snap)
    l.style.transform = v ? 'translateY(' + v + 'px)' : ''
    p.style.transform = 'translateY(' + (v / 2 - 17 + 8) + 'px)'
    p.style.opacity = String(clamp(v / TH, 0, 1))
    if (!busy.current) sp.style.transform = 'rotate(' + v * 4 + 'deg)'
  }
  useLayoutEffect(() => { setOff(0) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const down = (p: Pt) => {
    if (busy.current) { setLog(<>새로고침 중이라 <b>기다리는 중</b></>); return }
    s.current = { y0: p.y }; setOff(0)
  }
  const move = (p: Pt) => {
    if (!s.current) return
    const dy = Math.max(0, p.y - s.current.y0), v = (dy * MAX) / (dy + MAX)
    setOff(v)
    setLog(<>당김 <b>{Math.round(dy)}px</b> → 실제 이동 {Math.round(v)}px{v >= TH ? <> · <b>놓으면 새로고침</b></> : ' (저항)'}</>)
  }
  const up = () => {
    if (!s.current) return
    s.current = null
    if (off.current >= TH) {
      busy.current = true; setOff(HOLD, true)
      if (spin.current) spin.current.style.transform = ''
      spin.current?.classList.add('run')
      setLog(<>기준 60px 넘음 → <b>새로고침 중…</b></>)
      timer.current = T.set(() => {
        const n = NEWS[ni.current++ % NEWS.length]
        setFeed(f => [{ key: ++FEED_SEQ, ic: n[0], text: n[1], sub: '방금 전', isNew: true }, ...f].slice(0, 8))
        spin.current?.classList.remove('run'); busy.current = false; setOff(0, true)
        setLog(<>새 소식 <b>1개</b> 도착 → 목록이 제자리로</>)
      }, m.D(1300))
    } else {
      const was = off.current
      setOff(0, true)
      if (was > 2) setLog(<>기준 60px 미달 ({Math.round(was)}px) → <b>취소</b>, 제자리로</>)
    }
  }

  const demo = useDemo({
    reset() {
      S.end(); F.hide()
      if (timer.current !== undefined) T.clear(timer.current)
      s.current = null; busy.current = false; spin.current?.classList.remove('run')
      setFeed(FEED); ni.current = 0; setOff(0)
    },
    async play(c) {
      S.begin()
      const p0 = { x: (dev.current?.clientWidth ?? 0) / 2, y: 120 }
      const drag = (p: Pt) => { F.at(p, true); move(p) }
      F.at(p0); await c.sleep(300)
      F.at(p0, true); down(p0)
      await glide(c, m.D, p0, { x: p0.x, y: p0.y + 50 }, 450, drag)
      up(); F.hide(); await c.sleep(900)
      F.at(p0, true); down(p0)
      await glide(c, m.D, p0, { x: p0.x + 4, y: p0.y + 170 }, 800, drag)
      await c.sleep(200)
      up(); F.hide(); await c.sleep(1900)
      S.end()
    },
  })

  return (
    <Card id="gesture-pull" num="08" title="당겨서 새로고침" en="Pull to Refresh" desc="목록 맨 위에서 아래로 당겨요. 당길수록 무거워지고, 기준을 넘겨 놓으면 새로고침돼요." demo={demo}>
      <Stage log={log} logId="gesture-pull-log">
        <div className={'device' + S.cls} id="gesture-pull-dev" ref={dev}>
          <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
          <div className="scr">
            <div className="bar">받은 소식</div>
            <div className="gs-pview" id="gesture-pull-view"
              onPointerDown={e => { if (e.button > 0) return; cap(e.currentTarget, e); S.touch(); down(loc(e, dev.current!)) }}
              onPointerMove={e => move(loc(e, dev.current!))}
              onPointerUp={up}
              onPointerCancel={up}>
              <div className="gs-ptr" id="gesture-pull-ptr" ref={ptr}><i className="gs-spin" id="gesture-pull-spin" ref={spin} /></div>
              <div className="gs-plist" id="gesture-pull-list" ref={list}>
                {feed.map(f => (
                  <div className={'li' + (f.isNew ? ' new' : '')} key={f.key}>
                    <i className={'ic round' + (f.o ? ' o' : '')}>{f.ic}</i><span>{f.text}<span className="sub">{f.sub}</span></span>
                  </div>
                ))}
              </div>
              <span className="gs-hint down" style={{ left: '46%', top: 18 }}>👆</span>
            </div>
          </div>
          <i className="gs-finger" ref={F.ref} />
        </div>
      </Stage>
      <Info
        spec={[['기준', '60px'], ['저항', 'dy·160 ÷ (dy+160)'], ['조건', '맨 위일 때만']]}
        usage={[
          ['언제', '피드·메일처럼 시간순으로 새 항목이 쌓이는 목록'],
          ['주의', '스피너가 당긴 만큼 반응해야 ‘얼마나 더’인지 알 수 있어요'],
        ]}
      />
    </Card>
  )
}
