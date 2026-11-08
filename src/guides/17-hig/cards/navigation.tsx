import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { HSeg, Icon, clamp, finger, guard, segBtn, tween, useStateRef } from '../shared'

/* ---------- 05 탭 바 ---------- */
const TABS: [string, string][] = [['지금 듣기', 'play'], ['둘러보기', 'grid'], ['보관함', 'stack'], ['검색', 'search']]
const hue = (i: number) => (i * 47 + 10) % 360
const art = (i: number) => ({ background: `linear-gradient(135deg,hsl(${hue(i)},78%,62%),hsl(${(hue(i) + 50) % 360},70%,42%))` })
const ALB = ['가을 플레이리스트', '새벽 감성', '드라이브', '집중 모드', '재즈 카페', '운동할 때', '비 오는 날', '로파이', '시티팝', '클래식', '인디 픽', '잠들기 전']
const TB_INIT: ReactNode = <>스크롤해서 <b>바 뒤로 비치는</b> 콘텐츠를 보고, 탭을 바꿔보세요</>

const TB_PANES: ReactNode[] = [
  <><h3>지금 듣기</h3><div className="hig-tb-grid">{ALB.map((n, i) => <div key={n}><span className="hig-tb-art" style={art(i)} /><span className="hig-tb-cap">{n}</span></div>)}</div></>,
  <><h3>둘러보기</h3>{['새로 나온 앨범', '이번 주 차트', '라디오', '에디터 추천', '장르별 탐색', '아티스트 인터뷰'].map((n, i) => <div key={n} className="hig-tb-ban" style={art(i + 3)}>{n}</div>)}</>,
  <><h3>보관함</h3>{[...ALB, '봄 노래', '여름 바다'].map((n, i) => <div key={n} className="hig-tb-row"><i style={art(i + 1)} /><span>{n}<small>플레이리스트 · {8 + i * 3}곡</small></span></div>)}</>,
  <><h3>검색</h3><div className="hig-tb-q"><Icon name="search" /> 아티스트, 노래, 가사</div>
    <div className="hig-tb-grid">{['팝', 'K-팝', '힙합', '재즈', '클래식', '록', '어쿠스틱', 'R&B', '댄스', '피트니스'].map((n, i) => <div key={n} className="hig-tb-cat" style={art(i + 6)}>{n}</div>)}</div></>,
]

export function TabBar() {
  const [cur, setCur, curRef] = useStateRef(0)
  const [log, setLog] = useState<ReactNode>(TB_INIT)
  const dev = useRef<HTMLDivElement>(null)
  const panes = useRef<(HTMLDivElement | null)[]>([])
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const told = useRef(false)

  const click = (i: number) => {
    const ps = panes.current
    if (i === curRef.current) {
      ps[i]?.scrollTo({ top: 0, behavior: 'smooth' })
      setLog(<>같은 탭을 <b>다시 누르면 맨 위로</b> 올라가요</>)
      return
    }
    const prev = curRef.current, y = Math.round(ps[prev]?.scrollTop ?? 0)
    flushSync(() => setCur(i))
    const kept = ps[i]?.scrollTop
    setLog(<>{TABS[prev][0]}{y ? <> 스크롤 <b>{y}px 기억</b></> : null} → <b>{TABS[i][0]}</b>{kept ? ' (보던 위치 그대로)' : ''}</>)
  }
  const onScroll = (p: HTMLDivElement) => {
    if (!told.current && p.scrollTop > 30) { told.current = true; setLog(<>콘텐츠가 <b>반투명 탭 바 뒤로</b> 비쳐 지나가요</>) }
  }

  const demo = useDemo({
    reset() { panes.current.forEach(p => { if (p) p.scrollTop = 0 }); setCur(0); told.current = false; setLog(TB_INIT) },
    async play(c) {
      panes.current[0]?.scrollTo({ top: 260, behavior: 'smooth' }); await c.sleep(1300)
      await c.press(dev.current, btns.current[2]); await c.sleep(1300)
      await c.press(dev.current, btns.current[0]); await c.sleep(1500)
      await c.press(dev.current, btns.current[0]); await c.sleep(1000)
    },
  })

  return (
    <Card id="hig-tab" num="05" title="탭 바" en="Tab Bar" demo={demo}
      desc="하단에 고정된 반투명 바. 앱의 최상위 섹션 사이를 오가고, 콘텐츠는 그 뒤로 비쳐 흘러가요.">
      <Stage log={log}>
        <div className="device" id="hig-tb-dev" ref={dev}>
          <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
          <div className="hig-tb-sb hig-blur" />
          <div id="hig-tb-panes">
            {TB_PANES.map((h, i) => (
              <div key={i} className={'hig-tb-pane' + (i === cur ? ' on' : '')} ref={el => { panes.current[i] = el }}
                onScroll={e => onScroll(e.currentTarget)}>{h}</div>
            ))}
          </div>
          <div className="hig-tb-bar hig-blur" id="hig-tb-bar">
            {TABS.map(([n, ic], i) => (
              <button key={n} className={i === cur ? 'on' : undefined} ref={el => { btns.current[i] = el }} onClick={() => click(i)}>
                <Icon name={ic} />{n}
              </button>
            ))}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['위치', '하단 고정'], ['재질', '반투명'], ['역할', '섹션 이동']]}
        usage={[
          ['언제', '앱의 주요 영역이 3~5개로 나뉘고 자주 오갈 때'],
          ['규칙', '탭마다 스크롤 위치를 기억하고, 같은 탭을 다시 누르면 맨 위로 올라가요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 엣지 스와이프 ---------- */
const ES_ITEMS: [string, string, string][] = [['받은 편지함', '✉', ''], ['보낸 편지함', '➤', ''], ['임시 보관함', '✎', 'o'], ['휴지통', '⌫', 'o']]
const ES_MAILS: [string, string, string][] = [
  ['김디자', '오전 9:12', '11월 디자인 리뷰 자료 공유드려요'], ['박기획', '어제', '탭 바 아이콘 시안 확인 부탁드려요'],
  ['이개발', '어제', '엣지 스와이프 구현 완료했어요'], ['정와플', '월요일', '다음 주 회의 일정 공유'], ['최리서치', '일요일', '사용성 테스트 결과 정리본'],
]
const ES_INIT: ReactNode = <>항목을 눌러 들어간 뒤 <b>왼쪽 가장자리</b>를 오른쪽으로 끌어보세요</>
const ES_DRAG = (pct: number) => <>끄는 중 <b>{pct}%</b> — 이전 화면이 뒤에서 함께 따라와요</>
const ES_STAY: ReactNode = <>덜 밀어서 <b>제자리로</b> — 중간에 마음을 바꿔도 괜찮아요</>
const ES_BACK: ReactNode = <>끝까지 밀어 <b>뒤로</b> — 이전 화면으로 돌아왔어요</>

export function EdgeSwipe() {
  const m = useMotion()
  const timers = useTimers()
  const [title, setTitle] = useState('받은 편지함')
  const [learned, setLearned] = useState(false)
  const [log, setLog] = useState<ReactNode>(ES_INIT)
  const dev = useRef<HTMLDivElement>(null)
  const a = useRef<HTMLDivElement>(null)
  const b = useRef<HTMLDivElement>(null)
  const sh = useRef<HTMLDivElement>(null)
  const open = useRef(false)
  const p = useRef(1)
  const drag = useRef<{ x0: number; lx: number; lt: number; v: number } | null>(null)
  const midX = useRef<number | null>(null)
  const hinted = useRef(false)
  const animT = useRef(0)

  const W = () => dev.current?.clientWidth ?? 218
  /** 손가락 위치에 맞춰 두 화면을 직접 이동 (리렌더 없음) */
  const setP = (v: number) => {
    p.current = clamp(v, 0, 1)
    if (b.current) b.current.style.transform = 'translateX(' + p.current * W() + 'px)'
    if (a.current) a.current.style.transform = 'translateX(' + (-30 + 30 * p.current) + '%)'
    if (sh.current) sh.current.style.opacity = (0.22 * (1 - p.current)).toFixed(3)
  }
  const animate = (v: number) => {
    const d = dev.current
    if (!d) return
    d.classList.add('anim'); void d.offsetWidth; setP(v)
    timers.clear(animT.current); animT.current = timers.set(() => d.classList.remove('anim'), m.D(360))
  }
  const push = (t: string) => {
    if (open.current) return
    setTitle(t); open.current = true; animate(0)
    setLog(<><b>{t}</b> — 이제 <b>왼쪽 가장자리</b>를 오른쪽으로 끌어 뒤로 가보세요</>)
  }
  const back = (how: ReactNode) => { open.current = false; animate(1); setLog(how) }

  useLayoutEffect(() => {
    setP(1)
    const onResize = () => setP(p.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dev.current
    if (!open.current || !d || (e.target as HTMLElement).closest('button')) return
    const x = e.clientX - d.getBoundingClientRect().left - d.clientLeft
    if (x > 26) { midX.current = e.clientX; return }
    e.preventDefault()
    d.classList.remove('anim')
    drag.current = { x0: e.clientX, lx: e.clientX, lt: performance.now(), v: 0 }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* 합성 이벤트 */ }
  }
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (midX.current !== null && !drag.current && !hinted.current && e.clientX - midX.current > 40) {
      hinted.current = true; setLog(<>화면 가운데가 아니라 <b>왼쪽 끝</b>에서 시작해야 해요</>)
    }
    const g = drag.current
    if (!g) return
    const now = performance.now(), dt = Math.max(1, now - g.lt)
    g.v = 0.7 * g.v + 0.3 * ((e.clientX - g.lx) / dt)
    g.lx = e.clientX; g.lt = now
    setP((e.clientX - g.x0) / W())
    setLearned(true)
    setLog(ES_DRAG(Math.round(p.current * 100)))
  }
  const onEnd = () => {
    midX.current = null
    const g = drag.current
    if (!g) return
    const fast = g.v > 0.45
    drag.current = null
    if (p.current > 0.4 || fast) back(fast && p.current <= 0.4 ? <>빠르게 <b>휙</b> 밀어서 뒤로 — 거리가 짧아도 속도로 판단해요</> : ES_BACK)
    else { open.current = true; animate(0); setLog(ES_STAY) }
  }

  const demo = useDemo({
    reset() {
      timers.clear(animT.current)
      dev.current?.classList.remove('anim'); setLearned(false)
      drag.current = null; open.current = false; hinted.current = false; setP(1)
      dev.current?.querySelectorAll('.hig-finger').forEach(f => f.remove())
      setLog(ES_INIT)
    },
    async play(c) {
      const d = dev.current
      if (!d) return
      await c.press(d, d.querySelector<HTMLElement>('[data-go]')); await c.sleep(1200)
      const f = finger(d), H = d.clientHeight, w = W()
      const along = async (from: number, to: number, ms: number) => {
        await tween(m.D(ms), k => {
          const v = from + (to - from) * (1 - Math.pow(1 - k, 2))
          setP(v); f.style.left = 6 + v * w + 'px'; f.style.top = H * 0.55 + 'px'
          setLog(ES_DRAG(Math.round(v * 100)))
        }, c.alive)
        if (!c.alive()) f.remove()
        guard(c.alive)
      }
      setLearned(true)
      await along(0, 0.25, 600); await c.sleep(200)
      f.style.opacity = '0'; animate(0); setLog(ES_STAY)
      await c.sleep(1100)
      f.style.opacity = ''; d.classList.remove('anim')
      await along(0, 0.65, 700)
      f.remove()
      back(ES_BACK)
      await c.sleep(500)
    },
  })

  return (
    <Card id="hig-edge" num="06" title="엣지 스와이프" en="Edge Swipe" demo={demo}
      desc="화면 왼쪽 끝을 오른쪽으로 쓸면 뒤로 가요. 시스템 뒤로 버튼이 없어서 이 제스처와 ‹ 뒤로 버튼이 그 역할을 해요.">
      <Stage log={log}>
        <div className="device hig-es-dev" id="hig-es-dev" ref={dev}>
          <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
          <div className="scr hig-es-a" id="hig-es-a" ref={a}>
            <div className="bar">메일함</div>
            {ES_ITEMS.map(([n, ic, o]) => (
              <div key={n} className="li" data-go={n} onClick={() => push(n)}><i className={'ic' + (o ? ' ' + o : '')}>{ic}</i>{n}<span className="chev">›</span></div>
            ))}
            <div className="shade" id="hig-es-shade" ref={sh} />
          </div>
          <div className="scr hig-es-b" id="hig-es-b" ref={b} style={{ transform: 'translateX(100%)' }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}>
            <div className="bar">
              <button className="hig-es-back" id="hig-es-back" onClick={() => back(<><b>‹ 메일함</b> 버튼 — 제스처와 똑같이 왼쪽 화면으로 돌아가요</>)}>‹ 메일함</button>
              <span className="hig-es-ttl" id="hig-es-title">{title}</span>
            </div>
            {ES_MAILS.map(([n, t, s]) => <div key={n} className="hig-es-mail"><b>{n} <small>{t}</small></b><span>{s}</span></div>)}
            {!learned && <><div className="hig-es-edge" /><div className="hig-es-hint">← 왼쪽 끝에서 끌기</div></>}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['뒤로가기', '좌측 끝 스와이프 + ‹ 뒤로'], ['시스템 뒤로 버튼', '없음']]}
        usage={[
          ['언제', '내비게이션으로 한 단계 들어간 모든 화면'],
          ['규칙', '손가락을 따라 이전 화면이 함께 움직이고, 덜 밀면 제자리로 돌아와요. 중간에 마음을 바꿀 수 있어요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 러버밴딩 ---------- */
const RB_GROUPS: [string, string, string?][][] = [
  [['✈', '에어플레인 모드', 'o'], ['📶', 'Wi‑Fi'], ['ᛒ', '블루투스'], ['◉', '셀룰러']],
  [['🔔', '알림', 'o'], ['🔊', '사운드 및 햅틱', 'o'], ['☾', '집중 모드'], ['⏳', '스크린 타임']],
  [['⚙', '일반'], ['☀', '디스플레이 및 밝기'], ['🖼', '배경화면'], ['🔋', '배터리', 'o']],
]
const RB_INIT: ReactNode = <>목록을 <b>위로 끝까지 당겨</b> 보세요 (마우스 드래그·휠·터치)</>
const RB_BACK: ReactNode = <>놓으면 <b>스프링처럼 제자리로</b> — 끝에 닿았다는 걸 손끝으로 알려줘요</>
const rb = (x: number, d: number) => (1 - 1 / ((x * 0.55) / d + 1)) * d

export function Rubber() {
  const m = useMotion()
  const timers = useTimers()
  const [mode, setMode, modeRef] = useStateRef<'bounce' | 'none'>('bounce')
  const [log, setLog] = useState<ReactNode>(RB_INIT)
  const vp = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const meter = useRef<HTMLDivElement>(null)
  const y = useRef(0)
  const raf = useRef(0)
  const drag = useRef<{ y0: number; start: number; ly: number; lt: number; v: number } | null>(null)
  const wraw = useRef<number | null>(null)
  const wT = useRef(0)

  const H = () => vp.current?.clientHeight ?? 300
  const minY = () => Math.min(0, H() - (list.current?.offsetHeight ?? 0))
  const apply = () => { if (list.current) list.current.style.transform = 'translateY(' + y.current.toFixed(2) + 'px)' }
  const meterOff = () => meter.current?.classList.remove('on')
  const map = (raw: number) => {
    const mn = minY()
    if (modeRef.current === 'none') return clamp(raw, mn, 0)
    if (raw > 0) return rb(raw, H())
    if (raw < mn) return mn - rb(mn - raw, H())
    return raw
  }
  const showMeter = (raw: number) => {
    const el = meter.current
    if (!el) return
    const mn = minY(), over = raw > 0 ? raw : raw < mn ? mn - raw : 0
    if (!over) { el.classList.remove('on'); return }
    const shown = raw > 0 ? y.current : mn - y.current
    el.textContent = modeRef.current === 'none' ? '손 ' + Math.round(over) + 'px → 화면 0px (벽)' : '손 ' + Math.round(over) + 'px → 화면 ' + Math.round(shown) + 'px'
    el.classList.add('on')
  }
  const stop = () => { cancelAnimationFrame(raf.current); raf.current = 0 }
  /** 임계 감쇠 스프링으로 경계 b까지 (초기 속도 v0 px/ms) */
  const spring = (bnd: number, v0: number, msg: ReactNode | null) => {
    stop()
    const x0 = y.current - bnd, w = 0.02, t0 = performance.now(), slow = m.isSlow() ? 4 : 1
    const st = (now: number) => {
      const t = (now - t0) / slow
      y.current = bnd + (x0 + (v0 + w * x0) * t) * Math.exp(-w * t)
      apply()
      if (t > 60 && Math.abs(y.current - bnd) < 0.3) { y.current = bnd; apply(); raf.current = 0; meterOff(); if (msg) setLog(msg); return }
      raf.current = requestAnimationFrame(st)
    }
    raf.current = requestAnimationFrame(st)
  }
  const fling = (v0: number) => {
    stop()
    let v = v0, last = performance.now()
    const st = (now: number) => {
      const dt = Math.min(32, now - last); last = now
      y.current += v * dt; v *= Math.pow(0.995, dt)
      const mn = minY()
      if (y.current > 0 || y.current < mn) {
        const bnd = y.current > 0 ? 0 : mn
        if (modeRef.current === 'none') { y.current = bnd; apply(); raf.current = 0; setLog(<><b>벽에 부딪힌 듯 뚝</b> — 끝인지 멈춘 건지 헷갈려요</>); return }
        spring(bnd, v, <>스크롤 관성 그대로 끝에서 <b>통 튕겨요</b></>)
        return
      }
      apply()
      if (Math.abs(v) < 0.02) { raf.current = 0; return }
      raf.current = requestAnimationFrame(st)
    }
    raf.current = requestAnimationFrame(st)
  }

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    stop(); timers.clear(wT.current); wraw.current = null
    const mn = minY(), cy = y.current
    // 고무줄로 늘어난 위치를 원래 손 위치로 되돌려 이어서 끌기
    let raw = cy
    if (modeRef.current !== 'none' && cy > 0) { const d = H(); raw = (d / 0.55) * (1 / (1 - cy / d) - 1) }
    if (modeRef.current !== 'none' && cy < mn) { const d = H(), o = mn - cy; raw = mn - (d / 0.55) * (1 / (1 - o / d) - 1) }
    drag.current = { y0: e.clientY, start: raw, ly: e.clientY, lt: performance.now(), v: 0 }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* 합성 이벤트 */ }
  }
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = drag.current
    if (!g) return
    const now = performance.now(), dt = Math.max(1, now - g.lt)
    g.v = 0.6 * g.v + 0.4 * ((e.clientY - g.ly) / dt)
    g.ly = e.clientY; g.lt = now
    const raw = g.start + (e.clientY - g.y0)
    y.current = map(raw); apply(); showMeter(raw)
    const mn = minY()
    if (raw > 0 || raw < mn) setLog(modeRef.current === 'none' ? <>더 당겨도 <b>꿈쩍 안 해요</b></> : <>당길수록 <b>덜 따라와요</b> — 고무줄 저항</>)
  }
  const onEnd = () => {
    const g = drag.current
    if (!g) return
    drag.current = null
    const mn = minY()
    if (y.current > 0 || y.current < mn) spring(y.current > 0 ? 0 : mn, 0, RB_BACK)
    else { meterOff(); if (Math.abs(g.v) > 0.05) fling(g.v) }
  }

  // 휠은 passive:false 가 필요해서 직접 등록
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {})
  wheelRef.current = e => {
    e.preventDefault(); stop()
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1)
    if (wraw.current === null) wraw.current = y.current
    const mn = minY()
    let w = wraw.current
    if (w <= 0 && w >= mn) w -= dy
    else w -= dy * 0.6
    w = modeRef.current === 'none' ? clamp(w, mn, 0) : clamp(w, mn - 400, 400)
    wraw.current = w
    y.current = map(w); apply(); showMeter(w)
    if (w > 0 || w < mn) setLog(modeRef.current === 'none' ? <>휠을 더 굴려도 <b>꿈쩍 안 해요</b></> : <>끝에서 더 굴리면 <b>살짝 늘어나요</b></>)
    timers.clear(wT.current)
    wT.current = timers.set(() => {
      const mm = minY(); wraw.current = null
      if (y.current > 0 || y.current < mm) spring(y.current > 0 ? 0 : mm, 0, RB_BACK); else meterOff()
    }, 140)
  }
  useEffect(() => {
    const el = vp.current
    if (!el) return
    const h = (e: WheelEvent) => wheelRef.current(e)
    el.addEventListener('wheel', h, { passive: false })
    return () => { el.removeEventListener('wheel', h); cancelAnimationFrame(raf.current) }
  }, [])

  const changeMode = (v: 'bounce' | 'none') => {
    setMode(v); stop(); y.current = clamp(y.current, minY(), 0); apply(); meterOff()
    setLog(v === 'none' ? <><b>바운스 없음</b> — 끝까지 당겨서 차이를 느껴보세요</> : <><b>고무줄 바운스</b> — 끝에서 버티다가 튕겨 돌아와요</>)
  }

  const demo = useDemo({
    reset() {
      stop(); timers.clear(wT.current); wraw.current = null; drag.current = null
      setMode('bounce'); y.current = 0; apply(); meterOff()
      vp.current?.querySelectorAll('.hig-finger').forEach(f => f.remove())
      setLog(RB_INIT)
    },
    async play(c) {
      const v = vp.current
      if (!v) return
      const f = finger(v); f.style.left = '50%'
      setLog(<>당길수록 <b>덜 따라와요</b> — 고무줄 저항</>)
      await tween(m.D(900), k => {
        const raw = 170 * (1 - Math.pow(1 - k, 2))
        y.current = map(raw); apply(); showMeter(raw); f.style.top = 40 + raw + 'px'
      }, c.alive)
      if (!c.alive()) f.remove()
      guard(c.alive)
      await c.sleep(250)
      f.remove(); spring(0, 0, RB_BACK)
      await c.sleep(1300)
      fling(-2.4); await c.sleep(1800)
      spring(0, 0, null); await c.sleep(900)
      setLog(RB_INIT)
    },
  })

  return (
    <Card id="hig-rubber" num="07" title="러버밴딩" en="Rubber-banding" demo={demo}
      desc="스크롤 끝에서 더 당기면 고무줄처럼 버티며 늘어났다가, 놓으면 튕기듯 제자리로 돌아와요.">
      <Stage log={log}>
        <div className="device hig-rb-dev" id="hig-rb-dev">
          <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
          <div className="scr">
            <div className="bar">설정</div>
            <div className="hig-rb-vp" id="hig-rb-vp" ref={vp} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}>
              <div className="hig-rb-under top">↓ 맨 위예요</div><div className="hig-rb-under bot">↑ 맨 아래예요</div>
              <div className="hig-rb-list" id="hig-rb-list" ref={list}>
                {RB_GROUPS.map((g, gi) => (
                  <div className="hig-rb-grp" key={gi}>
                    {g.map(([i, n, o]) => <div className="li" key={n}><i className={'ic ' + (o ?? '')}>{i}</i>{n}<span className="chev">›</span></div>)}
                  </div>
                ))}
              </div>
              <div className="hig-rb-meter" id="hig-rb-meter" ref={meter} />
            </div>
          </div>
        </div>
        <HSeg id="hig-rb-seg" value={mode} onChange={changeMode} options={[['bounce', '고무줄 바운스'], ['none', '바운스 없음']]} />
      </Stage>
      <Info
        spec={[['끝 표현', '늘어났다 복귀'], ['저항', '당길수록 덜 따라옴']]}
        usage={[
          ['언제', '스크롤·캐러셀·시트 등 끝이 있는 모든 영역'],
          ['vs 없음', '딱 멈추면 ‘끝’인지 ‘멈춤(고장)’인지 헷갈려요. 튕김이 끝을 손끝으로 알려줘요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 라지 타이틀 ---------- */
const NOTES: [string, string][] = [['장보기 목록', '우유, 달걀, 사과'], ['회의 메모', '탭 바 아이콘 정리'], ['여행 계획', '11월 말 제주'], ['읽을 책', '디자인의 디자인'], ['운동 기록', '러닝 5km'], ['아이디어', '라이브 액티비티 활용'], ['선물 목록', '엄마 생신'], ['레시피', '된장찌개'], ['영화 리스트', '주말에 볼 것'], ['단어장', 'deference = 존중'], ['프로젝트', 'HIG 정리'], ['할 일', '세탁소 들르기']]
const LT_LOG: Record<string, ReactNode> = {
  big: <><b>큰 제목</b> — 지금 어떤 화면인지 크게 알려줘요</>,
  small: <>스크롤하면 <b>작은 가운데 제목</b>으로 접히고 바가 반투명해져요</>,
  inline: <><b>가운데 정렬</b> 기본 바 — 상세·깊은 화면에 어울려요</>,
}

export function LargeTitle() {
  const [mode, setMode, modeRef] = useStateRef<'large' | 'inline'>('large')
  const [st, setSt, stRef] = useStateRef('big')
  const [navOn, setNavOn] = useState(false)
  const sc = useRef<HTMLDivElement>(null)
  const big = useRef<HTMLDivElement>(null)
  const small = useRef<HTMLSpanElement>(null)
  const seg = useRef<HTMLDivElement>(null)

  /** 스크롤 위치에 맞춰 제목 투명도·크기 갱신 */
  const upd = (force = false) => {
    const t = sc.current?.scrollTop ?? 0, bg = big.current, sm = small.current
    if (!bg || !sm) return
    let s: string
    if (modeRef.current === 'large') {
      bg.style.opacity = clamp(1 - t / 36, 0, 1).toFixed(2)
      bg.style.transform = t < 0 ? 'scale(' + (1 - t / 300) + ')' : 'none'
      sm.style.opacity = clamp((t - 30) / 12, 0, 1).toFixed(2)
      setNavOn(t > 40)
      s = t > 40 ? 'small' : 'big'
    } else {
      sm.style.opacity = '1'; setNavOn(t > 2)
      s = 'inline'
    }
    if (force || s !== stRef.current) setSt(s)
  }
  useLayoutEffect(() => { upd() }, [])

  const changeMode = (v: 'large' | 'inline') => {
    modeRef.current = v
    setMode(v)
    if (big.current) big.current.style.opacity = '1'
    upd(true)
  }

  const demo = useDemo({
    reset() { modeRef.current = 'large'; setMode('large'); if (sc.current) sc.current.scrollTop = 0; upd(true) },
    async play(c) {
      sc.current?.scrollTo({ top: 140, behavior: 'smooth' }); await c.sleep(1800)
      sc.current?.scrollTo({ top: 0, behavior: 'smooth' }); await c.sleep(1300)
      await c.press(seg.current, segBtn(seg.current, 'inline')); await c.sleep(1300)
      await c.press(seg.current, segBtn(seg.current, 'large')); await c.sleep(400)
    },
  })

  return (
    <Card id="hig-large" num="08" title="라지 타이틀" en="Large Title" demo={demo}
      desc="왼쪽의 큰 제목이 화면 이름을 알려주고, 스크롤하면 바 가운데의 작은 제목으로 접혀요.">
      <Stage log={LT_LOG[st]}>
        <div className={'device hig-lt-dev' + (mode === 'inline' ? ' inline' : '')} id="hig-lt-dev">
          <div className="scr" style={{ paddingTop: 0 }}>
            <div className="hig-lt-sc" id="hig-lt-sc" ref={sc} onScroll={() => upd()}>
              <div className="hig-lt-big" id="hig-lt-big" ref={big}>메모</div>
              <div className="hig-lt-search"><Icon name="search" />검색</div>
              <div className="hig-lt-list" id="hig-lt-list">{NOTES.map(([t, s]) => <div key={t}><b>{t}</b><small>{s}</small></div>)}</div>
            </div>
            <div className={'hig-lt-nav' + (navOn ? ' on' : '')} id="hig-lt-nav">
              <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
              <div className="hig-lt-row"><button>‹ 폴더</button><span className="hig-lt-small" id="hig-lt-small" ref={small}>메모</span><button>편집</button></div>
            </div>
          </div>
        </div>
        <HSeg ref={seg} id="hig-lt-seg" value={mode} onChange={changeMode} options={[['large', '큰 타이틀'], ['inline', '가운데 정렬']]} />
      </Stage>
      <Info
        spec={[['상단 바', '중앙 정렬 또는 Large Title'], ['스크롤', '큰 제목 → 작은 가운데 제목']]}
        usage={[
          ['언제', '메일·메모·설정처럼 최상위 목록 화면에서 ‘지금 어디인지’ 크게 보여줄 때'],
          ['주의', '상세 화면까지 큰 제목을 쓰면 콘텐츠 자리가 줄어요. 깊은 화면은 가운데 정렬로.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 툴바 vs 탭 바 ---------- */
const TOOLS: [string, string][] = [['삭제', 'trash'], ['이동', 'folder'], ['답장', 'reply'], ['새 메일', 'compose']]
const SECT: [string, string, ReactNode][] = [
  ['홈', 'home', <><div className="hig-mini-blk g2" /><div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} /><div className="hig-mini-blk g1" style={{ height: 36 }} /></>],
  ['검색', 'search', <>
    <div className="hig-tb-q" style={{ height: 24, margin: 0, fontSize: 11 }}>⌕ 검색</div>
    <div className="chips"><span className="chip" style={{ fontSize: 10.5, padding: '2px 7px' }}>카페</span><span className="chip" style={{ fontSize: 10.5, padding: '2px 7px' }}>전시</span></div>
    <div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" style={{ width: '45%' }} />
  </>],
  ['설정', 'gear', <>
    <div className="hig-mini-li"><span>알림</span><span className="muted">›</span></div>
    <div className="hig-mini-li"><span>개인정보</span><span className="muted">›</span></div>
    <div className="hig-mini-li"><span>화면</span><span className="muted">›</span></div>
  </>],
]
const TV_INIT: ReactNode = <>양쪽 하단 버튼을 눌러 <b>결과가 어떻게 다른지</b> 비교해보세요</>

export function ToolVsTab() {
  const m = useMotion()
  const timers = useTimers()
  const [gone, setGone, goneRef] = useStateRef(false)
  const [toast, setToast] = useState({ on: false, text: '' })
  const [sheet, setSheet] = useState<string | null>(null)
  const [sheetTitle, setSheetTitle] = useState('새로운 메시지')
  const [tab, setTab] = useState(0)
  const [bodyKey, setBodyKey] = useState(0)
  const [log, setLog] = useState<ReactNode>(TV_INIT)
  const a = useRef<HTMLDivElement>(null)
  const b = useRef<HTMLDivElement>(null)
  const toastT = useRef(0)

  const showToast = (t: string) => {
    setToast({ on: true, text: t })
    timers.clear(toastT.current); toastT.current = timers.set(() => setToast(s => ({ ...s, on: false })), m.D(1400))
  }
  const tool = (act: string) => {
    if (act === '삭제') { if (goneRef.current) return; setGone(true) }
    else if (act === '이동') showToast('‘보관’ 폴더로 이동했어요')
    else { setSheetTitle(act === '답장' ? 'Re: 11월 디자인 리뷰' : '새로운 메시지'); setSheet(act) }
    setLog(<>툴바 · <b>{act}</b> — 지금 보고 있는 메일에 실행해요 (섹션은 그대로)</>)
  }
  const go = (i: number) => { setTab(i); setBodyKey(k => k + 1) }

  const demo = useDemo({
    reset() { setGone(false); setSheet(null); setToast(s => ({ ...s, on: false })); go(0); setLog(TV_INIT) },
    async play(c) {
      const tb = [...(a.current?.querySelectorAll<HTMLElement>('#hig-tv-tools button') ?? [])]
      const tabs = [...(b.current?.querySelectorAll<HTMLElement>('#hig-tv-tabs button') ?? [])]
      await c.press(a.current, tb[1]); await c.sleep(1300)
      await c.press(b.current, tabs[1]); await c.sleep(1300)
      await c.press(a.current, tb[3]); await c.sleep(1300)
      await c.press(a.current, a.current?.querySelector<HTMLElement>('#hig-tv-x') ?? null); await c.sleep(700)
      await c.press(b.current, tabs[2]); await c.sleep(1100)
      await c.press(b.current, tabs[0]); await c.sleep(400)
    },
  })

  return (
    <Card id="hig-tool" num="09" title={<>툴바 <span className="vs">vs</span> 탭 바</>} en="Toolbar vs Tab Bar" demo={demo}
      desc="둘 다 화면 맨 아래에 있지만 역할이 달라요. 툴바는 ‘지금 화면의 액션’, 탭 바는 ‘다른 화면으로 이동’이에요.">
      <Stage log={log}>
        <div className="box hig-tv-box">
          <div className="hig-tv-grid">
            <div className="hig-tv-col">
              <div className="hig-tv-lab">툴바<small>현재 화면 액션</small></div>
              <div className="hig-mini" id="hig-tv-a" ref={a}>
                <div className="hig-mini-hd">‹ 받은 편지함</div>
                <div className={'hig-mini-body' + (gone ? ' gone' : '')} id="hig-tv-mail">
                  <b>11월 디자인 리뷰</b><span className="muted">김디자 · 오전 9:12</span>
                  <div className="fake-line" /><div className="fake-line" style={{ width: '80%' }} /><div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" style={{ width: '72%' }} />
                </div>
                <div className={'hig-mini-empty' + (gone ? ' on' : '')} id="hig-tv-empty">
                  휴지통으로 이동했어요
                  <button id="hig-tv-undo" onClick={() => { setGone(false); setLog(<>툴바 액션은 <b>되돌릴 수 있게</b> 해요</>) }}>되돌리기</button>
                </div>
                <div className="hig-mini-bar hig-blur" id="hig-tv-tools">
                  {TOOLS.map(([n, ic]) => <button key={n} aria-label={n} onClick={() => tool(n)}><Icon name={ic} /></button>)}
                </div>
                <div className={'hig-mini-toast' + (toast.on ? ' on' : '')} id="hig-tv-toast">{toast.text}</div>
                <div className={'hig-mini-sheet' + (sheet ? ' on' : '')} id="hig-tv-sheet">
                  <div className="row">
                    <button className="hig-mini-x" id="hig-tv-x" onClick={() => { setSheet(null); setLog(<>작성 시트를 닫고 <b>같은 메일</b>로 돌아왔어요</>) }}>취소</button>
                    <b id="hig-tv-sh">{sheetTitle}</b><span style={{ width: 20 }} />
                  </div>
                  <div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} /><div className="fake-line" style={{ width: '50%' }} />
                </div>
              </div>
            </div>
            <div className="hig-tv-col">
              <div className="hig-tv-lab">탭 바<small>섹션 이동</small></div>
              <div className="hig-mini" id="hig-tv-b" ref={b}>
                <div className="hig-mini-hd big" id="hig-tv-title">{SECT[tab][0]}</div>
                <div className="hig-mini-body in" id="hig-tv-body" key={bodyKey}>{SECT[tab][2]}</div>
                <div className="hig-mini-bar hig-blur hig-tv-tabs" id="hig-tv-tabs">
                  {SECT.map(([n, ic], i) => (
                    <button key={n} className={i === tab ? 'on' : undefined}
                      onClick={() => { go(i); setLog(<>탭 바 · <b>{n}</b> — 화면 전체가 다른 섹션으로 바뀌어요</>) }}>
                      <Icon name={ic} /><small>{n}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['툴바', '공유 · 삭제 · 글쓰기 (액션)'], ['탭 바', '섹션 이동 (내비게이션)']]}
        usage={[
          ['툴바', '누르면 지금 보고 있는 콘텐츠에 무언가를 해요. 화면은 그대로예요.'],
          ['탭 바', '누르면 화면 전체가 다른 섹션으로 바뀌어요. 액션 버튼을 넣지 않아요.'],
        ]}
      />
    </Card>
  )
}
