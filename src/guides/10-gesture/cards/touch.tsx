import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { EASE, useMotion, type Rect } from '../../../lib/motion'
import { cap, center, clamp, loc, now, rawSleep, useFinger, useSim, type Pt } from '../shared'

/* ---------- 01 Tap ---------- */
export function Tap() {
  const m = useMotion()
  const box = useRef<HTMLDivElement>(null)
  const pad = useRef<HTMLButtonElement>(null)
  const F = useFinger(), S = useSim()
  const s = useRef<{ p: Pt; t: number; max: number } | null>(null)
  const [n, setN] = useState(0)
  const [isDown, setDown] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>눌렀다 떼면 <b>판정 결과</b>가 나와요</>)

  const ripple = (p: Pt) => {
    const b = box.current, el = pad.current
    if (!b || !el) return
    const o = m.rel(b, el), r = document.createElement('span')
    r.className = 'gs-rip'; r.style.left = p.x - o.left + 'px'; r.style.top = p.y - o.top + 'px'
    el.appendChild(r)
    m.A(r, [{ transform: 'scale(.2)', opacity: 0.35 }, { transform: 'scale(3.2)', opacity: 0 }], 520, EASE.out).onfinish = () => r.remove()
  }
  const down = (p: Pt) => { s.current = { p, t: now(), max: 0 }; setDown(true); setLog(<>누르는 중… <b>떼는 순간</b> 판정해요</>) }
  const move = (p: Pt) => {
    const st = s.current
    if (!st) return
    st.max = Math.max(st.max, Math.hypot(p.x - st.p.x, p.y - st.p.y))
    if (st.max > 10) { setDown(false); setLog(<>이동 <b>{Math.round(st.max)}px</b> → 탭 취소 (드래그로 판정)</>) }
  }
  const up = (p: Pt) => {
    const st = s.current
    if (!st) return
    const dt = Math.round(now() - st.t), mv = Math.round(st.max)
    setDown(false)
    if (mv > 10) setLog(<>이동 <b>{mv}px</b> → 탭 아님 · 떼도 실행 안 해요</>)
    else if (dt > 500) setLog(<>누른 시간 <b>{dt}ms</b> → 탭 아님 (길게 누르기 영역)</>)
    else { setN(v => v + 1); ripple(p); setLog(<>탭 감지 · <b>{dt}ms</b> · 이동 {mv}px → 실행</>) }
    s.current = null
  }
  const at = (e: PointerEvent) => loc(e, box.current!)

  const demo = useDemo({
    reset() { S.end(); F.hide(); s.current = null; setDown(false) },
    async play(c) {
      S.begin()
      const p = center(box.current!, pad.current!)
      for (const hold of [90, 140]) {
        F.at(p); await c.sleep(250)
        F.at(p, true); down(p); await c.sleep(hold)
        F.at(p); up(p); await c.sleep(700)
      }
      F.hide(); S.end()
    },
  })

  return (
    <Card id="gesture-tap" num="01" title="탭" en="Tap" desc="짧게 눌렀다 떼요. 거의 움직이지 않고, 빨리 뗐을 때만 탭으로 판정해요." demo={demo}>
      <Stage log={log} logId="gesture-tap-log">
        <div className={'box gs-box' + S.cls} id="gesture-tap-box" ref={box}>
          <button className={'gs-pad' + (isDown ? ' down' : '')} id="gesture-tap-pad" ref={pad}
            onPointerDown={e => { if (e.button > 0) return; cap(e.currentTarget, e); S.touch(); down(at(e)) }}
            onPointerMove={e => move(at(e))}
            onPointerUp={e => up(at(e))}
            onPointerCancel={() => { s.current = null; setDown(false); setLog(<>시스템이 가져감 → <b>취소</b></>) }}
            onClick={e => { if (e.detail === 0) { setN(v => v + 1); setLog(<>키보드 <b>Enter/Space</b> → 탭과 같은 실행</>) } }}>
            <b>여기를 탭</b><small>눌렀다 떼기 · 끌어보기 · 오래 누르기</small>
          </button>
          <div className="gs-count" id="gesture-tap-count">탭 {n}회</div>
          <span className="gs-hint" style={{ left: '56%', top: '46%' }}>👆</span>
          <i className="gs-finger" ref={F.ref} />
        </div>
      </Stage>
      <Info
        spec={[['이동', '10px 미만'], ['시간', '500ms 미만'], ['타깃', '44×44 이상']]}
        usage={[
          ['언제', '버튼, 목록 항목처럼 가장 기본적인 선택'],
          ['주의', '누를 때가 아니라 ‘뗄 때’ 실행해요 — 누른 채 벗어나면 취소할 수 있어야 해요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 Long press ---------- */
const MENU = [['📋', '복사', ''], ['↩', '답장', ''], ['📌', '고정', ''], ['🗑', '삭제', 'del']] as const

export function LongPress() {
  const m = useMotion()
  const T = useTimers()
  const box = useRef<HTMLDivElement>(null)
  const bub = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const ring = useRef<SVGSVGElement>(null)
  const fg = useRef<SVGCircleElement>(null)
  const F = useFinger(), S = useSim()
  const s = useRef<{ p: Pt; t: number; fired: boolean } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const [press, setPress] = useState(false)
  const [sel, setSel] = useState(false)
  const [ringOn, setRingOn] = useState(false)
  const [anchor, setAnchor] = useState<Rect | null>(null)
  const [log, setLog] = useState<ReactNode>(<>첫 말풍선을 <b>누른 채 기다리기</b></>)

  // 메뉴가 열리면 높이를 재서 위치를 잡고 등장 애니메이션
  useLayoutEffect(() => {
    const el = menu.current, b = box.current
    if (!anchor || !el || !b) return
    el.style.left = clamp(anchor.left, 4, b.clientWidth - 132) + 'px'
    const mh = el.offsetHeight, bh = b.clientHeight
    let top = anchor.top + anchor.height + 6
    if (top + mh > bh - 4) top = anchor.top - mh - 6
    el.style.top = clamp(top, 4, bh - mh - 4) + 'px'
    m.A(el, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], 180, EASE.out)
  }, [anchor, m])

  const closeMenu = () => { setAnchor(null); setSel(false) }
  const stopRing = () => { if (timer.current !== undefined) T.clear(timer.current); setRingOn(false); m.clearA(fg.current); setPress(false) }
  const fire = () => {
    const st = s.current
    if (!st || !box.current || !bub.current) return
    st.fired = true; stopRing()
    const ms = Math.round(now() - st.t)
    setSel(true)
    m.A(bub.current, [{ transform: 'scale(.97)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], 260, EASE.out)
    setAnchor(m.rel(box.current, bub.current))
    setLog(<>길게 누름 <b>{ms}ms</b> 감지 → 메뉴 열림</>)
  }
  const down = (p: Pt) => {
    closeMenu(); stopRing()
    s.current = { p, t: now(), fired: false }
    setPress(true)
    if (ring.current) { ring.current.style.left = p.x + 'px'; ring.current.style.top = p.y + 'px' }
    setRingOn(true)
    if (fg.current) m.A(fg.current, [{ strokeDashoffset: 138.2 }, { strokeDashoffset: 0 }], 500, 'linear')
    timer.current = T.set(fire, m.D(500))
    setLog(<>누르고 있어요… <b>링이 차면</b> 열려요</>)
  }
  const move = (p: Pt) => {
    const st = s.current
    if (!st || st.fired) return
    const d = Math.hypot(p.x - st.p.x, p.y - st.p.y)
    if (d > 10) { stopRing(); setLog(<>이동 <b>{Math.round(d)}px</b> → 취소 (스크롤로 판정)</>); s.current = null }
  }
  const up = () => {
    const st = s.current
    if (!st) return
    if (!st.fired) { stopRing(); setLog(<><b>{Math.round(now() - st.t)}ms</b>에 손 뗌 → 기준 500ms 미달, 메뉴 없음</>) }
    s.current = null
  }

  const demo = useDemo({
    reset() { S.end(); F.hide(); stopRing(); closeMenu(); s.current = null },
    async play(c) {
      S.begin()
      const p = center(box.current!, bub.current!)
      F.at(p); await c.sleep(300)
      F.at(p, true); down(p); await c.sleep(180)
      F.at(p); up(); await c.sleep(900)
      F.at(p, true); down(p); await c.sleep(650)
      F.at(p); up(); await c.sleep(1400)
      closeMenu(); F.hide(); S.end()
    },
  })

  return (
    <Card id="gesture-long" num="02" title="길게 누르기" en="Long Press" desc="누른 채로 기다리면 숨은 메뉴가 열려요. 링이 다 차는 순간이 판정 시점이에요." demo={demo}>
      <Stage log={log} logId="gesture-long-log">
        <div className={'box gs-box' + S.cls} id="gesture-long-box" ref={box} style={{ justifyContent: 'flex-start', paddingTop: 26 }}
          onPointerDown={e => { if (anchor && !menu.current?.contains(e.target as Node)) { closeMenu(); setLog(<>바깥을 눌러 <b>메뉴 닫힘</b></>) } }}>
          <div className="gs-chat">
            <span className="muted">김디자 · 오후 2:14</span>
            <div className={'gs-bubble' + (press ? ' press' : '') + (sel ? ' sel' : '')} id="gesture-long-bubble" ref={bub}
              onPointerDown={e => { if (e.button > 0) return; e.stopPropagation(); cap(e.currentTarget, e); S.touch(); down(loc(e, box.current!)) }}
              onPointerMove={e => move(loc(e, box.current!))}
              onPointerUp={up}
              onPointerCancel={() => { stopRing(); s.current = null }}
              onContextMenu={e => e.preventDefault()}>내일 3시에 성수에서 만나요 🙂</div>
            <div className="gs-bubble" style={{ pointerEvents: 'none' }}>시안은 그때 같이 봐요</div>
          </div>
          <div className={'gs-ctx' + (anchor ? ' on' : '')} id="gesture-long-menu" ref={menu}>
            {MENU.map(([ic, name, cls]) => (
              <button key={name} className={cls || undefined} onClick={() => { closeMenu(); setLog(<>‘<b>{name}</b>’ 선택 → 메뉴 닫힘</>) }}>{ic} {name}</button>
            ))}
          </div>
          <svg className={'gs-ring' + (ringOn ? ' on' : '')} id="gesture-long-ring" viewBox="0 0 52 52" ref={ring}>
            <circle className="bg" cx="26" cy="26" r="22" /><circle className="fg" cx="26" cy="26" r="22" ref={fg} />
          </svg>
          <span className="gs-hint hold" style={{ left: '46%', top: '44%' }}>👆</span>
          <i className="gs-finger" ref={F.ref} />
        </div>
      </Stage>
      <Info
        spec={[['기준', '500ms'], ['허용 이동', '10px'], ['피드백', '진행 링 + 진동']]}
        usage={[
          ['언제', '메시지 복사·답장, 홈 화면 편집처럼 보조 동작'],
          ['주의', '숨은 기능이라 발견이 어려워요 — 같은 기능을 ⋯ 메뉴에도 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 Double tap ---------- */
export function DoubleTap() {
  const m = useMotion()
  const T = useTimers()
  const box = useRef<HTMLDivElement>(null)
  const photo = useRef<HTMLDivElement>(null)
  const likeBtn = useRef<HTMLButtonElement>(null)
  const F = useFinger(), S = useSim()
  const [like, setLikeState] = useState({ liked: false, cnt: 128 })
  const likedRef = useRef(false)
  const [info, setInfo] = useState(false)
  const infoRef = useRef(false)
  const last = useRef<{ t: number; p: Pt } | null>(null)
  const single = useRef<number | undefined>(undefined)
  const s = useRef<Pt | null>(null)
  const [log, setLog] = useState<ReactNode>(<>사진을 <b>한 번</b> 또는 <b>두 번</b> 탭</>)

  const setLike = (on: boolean) => {
    if (on !== likedRef.current) setLikeState(v => ({ liked: on, cnt: v.cnt + (on ? 1 : -1) }))
    likedRef.current = on
  }
  const burst = (p: Pt) => {
    const b = box.current, ph = photo.current
    if (!b || !ph) return
    const o = m.rel(b, ph), x = p.x - o.left, y = p.y - o.top
    const h = document.createElement('span')
    h.className = 'gs-heart'; h.textContent = '♥'; h.style.left = x + 'px'; h.style.top = y + 'px'
    ph.appendChild(h)
    m.A(h, [{ transform: 'scale(0) rotate(-15deg)', opacity: 1, offset: 0 }, { transform: 'scale(1.25) rotate(0)', opacity: 1, offset: 0.35 }, { transform: 'scale(1)', opacity: 1, offset: 0.6 }, { transform: 'scale(1.1) translateY(-30px)', opacity: 0, offset: 1 }], 900, EASE.out).onfinish = () => h.remove()
    for (let i = 0; i < 7; i++) {
      const mi = document.createElement('span'), a = (i / 7) * Math.PI * 2
      mi.className = 'gs-mini'; mi.textContent = '♥'; mi.style.left = x + 'px'; mi.style.top = y + 'px'
      ph.appendChild(mi)
      m.A(mi, [{ transform: 'translate(0,0) scale(.4)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * 60 + 'px,' + Math.sin(a) * 60 + 'px) scale(1)', opacity: 0 }], 650, EASE.out, 80).onfinish = () => mi.remove()
    }
    if (likeBtn.current) m.A(likeBtn.current, [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], 300, EASE.out)
  }
  const tapAt = (p: Pt) => {
    const t = now(), l = last.current
    if (l && t - l.t < 250 && Math.hypot(p.x - l.p.x, p.y - l.p.y) < 40) {
      if (single.current !== undefined) T.clear(single.current)
      const gap = Math.round(t - l.t)
      last.current = null
      burst(p)
      setLog(likedRef.current ? <>두 번 탭 (간격 {gap}ms) → 이미 좋아요 · <b>취소하지 않아요</b></> : <>두 번 탭 (간격 <b>{gap}ms</b>) → 좋아요 ♥</>)
      setLike(true)
      return
    }
    last.current = { t, p }
    setLog(<>한 번 탭… <b>두 번째 탭</b>을 250ms 기다리는 중</>)
    if (single.current !== undefined) T.clear(single.current)
    // 판정 시간은 실제 시간 (슬로우 모션 무관)
    single.current = T.set(() => {
      last.current = null
      const on = !infoRef.current
      infoRef.current = on; setInfo(on)
      setLog(<>250ms 동안 두 번째 탭 없음 → <b>한 번 탭</b>: 정보 {on ? '보이기' : '숨기기'}</>)
    }, 250)
  }

  const demo = useDemo({
    reset() {
      S.end(); F.hide(); if (single.current !== undefined) T.clear(single.current); last.current = null; setLike(false)
      infoRef.current = false; setInfo(false)
      photo.current?.querySelectorAll('.gs-heart, .gs-mini').forEach(h => h.remove())
    },
    async play(c) {
      S.begin()
      const cc = center(box.current!, photo.current!), p = { x: cc.x + 10, y: cc.y - 6 }
      F.at(p); await c.sleep(300)
      F.at(p, true); await rawSleep(c, 70); F.at(p); tapAt(p)
      await rawSleep(c, 110)
      F.at(p, true); await rawSleep(c, 70); F.at(p); tapAt(p)
      await c.sleep(1300)
      const q = { x: cc.x - 40, y: cc.y + 20 }
      F.at(q, true); await rawSleep(c, 70); F.at(q); tapAt(q)
      await c.sleep(1300)
      F.hide(); S.end()
    },
  })

  return (
    <Card id="gesture-double" num="07" title="두 번 탭" en="Double Tap" desc="빠르게 두 번 누르면 좋아요. 한 번 탭과 구분하려고 250ms를 기다려봐요." demo={demo}>
      <Stage log={log} logId="gesture-double-log">
        <div className={'box gs-box' + S.cls} id="gesture-double-box" ref={box}>
          <div className="gs-photo" id="gesture-double-photo" ref={photo}
            onPointerDown={e => { if (e.button > 0) return; S.touch(); s.current = loc(e, box.current!) }}
            onPointerUp={e => { const st = s.current; if (!st) return; const p = loc(e, box.current!); if (Math.hypot(p.x - st.x, p.y - st.y) < 10) tapAt(p); s.current = null }}
            onPointerCancel={() => { s.current = null }}
            onDoubleClick={e => e.preventDefault()}>
            <span className="em">🐶</span>
            <div className={'gs-info' + (info ? ' on' : '')} id="gesture-double-info"><b>산책 나온 콩이</b>2026.11.08 · 서울숲</div>
          </div>
          <div className="gs-likebar">
            <button className={'gs-likebtn' + (like.liked ? ' on' : '')} id="gesture-double-like" aria-label="좋아요" ref={likeBtn}
              onClick={() => { const on = !likedRef.current; setLike(on); setLog(<>♥ 버튼으로 <b>{on ? '좋아요' : '좋아요 취소'}</b> — 버튼은 토글이에요</>) }}>♥</button>
            <span>좋아요 <b id="gesture-double-cnt">{like.cnt}</b>개</span>
          </div>
          <span className="gs-hint dbl" style={{ left: '52%', top: '34%' }}>👆</span>
          <i className="gs-finger" ref={F.ref} />
        </div>
      </Stage>
      <Info
        spec={[['간격', '250ms 이내'], ['한 번 탭', '250ms 뒤 실행'], ['결과', '좋아요(취소 안 함)']]}
        usage={[
          ['언제', '사진 좋아요, 지도·이미지 확대'],
          ['주의', '한 번 탭 반응이 그만큼 늦어져요 — 한 번 탭이 중요한 곳엔 쓰지 마세요'],
        ]}
      />
    </Card>
  )
}
