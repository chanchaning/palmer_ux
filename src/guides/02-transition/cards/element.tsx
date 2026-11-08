import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { EASE, useMotion, type Rect } from '../../../lib/motion'
import { css, dir, done } from '../shared'

/* ---------- 04 공유 요소 ---------- */
const PHOTOS = [['노을 바다', 'g1'], ['새벽 호수', 'g2'], ['여름 숲', 'g3'], ['벚꽃길', 'g4']] as const

export function SharedElement() {
  const { A, clearA, rel, px } = useMotion()
  const dev = useRef<HTMLDivElement>(null), b = useRef<HTMLDivElement>(null), hero = useRef<HTMLDivElement>(null), text = useRef<HTMLDivElement>(null)
  const backBtn = useRef<HTMLButtonElement>(null)
  const thumbs = useRef<(HTMLButtonElement | null)[]>([])
  const st = useRef({ thumb: 0, busy: false, open: false, gen: 0 })
  const [photo, setPhoto] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>사진을 눌러 <b>요소가 이어지는 것</b> 확인</>)

  /** 임시 복제본이 from → to 로 날아가요 */
  const fly = (cls: string, from: Rect, to: Rect, r0: string, r1: string) => {
    const f = document.createElement('div')
    f.className = 'fly ' + cls
    Object.assign(f.style, px(to), { borderRadius: r1 })
    dev.current!.appendChild(f)
    return { el: f, an: A(f, [{ ...px(from), borderRadius: r0 }, { ...px(to), borderRadius: r1 }], 400, EASE.emph) }
  }

  const openIt = async (i: number) => {
    const s = st.current
    if (s.busy || s.open) return
    s.busy = true; s.open = true; s.thumb = i
    const g = s.gen, th = thumbs.current[i]!, d = dev.current!
    setPhoto(i)
    clearA(b.current, text.current)
    css(b.current, { opacity: 1, pointerEvents: 'auto' })
    css(hero.current, { visibility: 'hidden' }); css(th, { visibility: 'hidden' })
    const from = rel(d, th), to = { left: 0, top: 0, width: d.clientWidth, height: hero.current!.offsetHeight }
    const f = fly(PHOTOS[i][1], from, to, '10px', '0px')
    A(b.current!, [{ opacity: 0 }, { opacity: 1 }], 220)
    A(text.current!, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], 300, EASE.out, 160)
    setLog(<><b>{PHOTOS[i][0]}</b> 사진이 그대로 상단으로 이동</>)
    await done(f.an)
    if (g !== s.gen) return
    css(hero.current, { visibility: '' }); f.el.remove(); s.busy = false
  }
  const closeIt = async () => {
    const s = st.current
    if (s.busy || !s.open) return
    s.busy = true; s.open = false
    const g = s.gen, d = dev.current!, th = thumbs.current[s.thumb]!
    const from = rel(d, hero.current!), to = rel(d, th)
    css(hero.current, { visibility: 'hidden' })
    const f = fly(PHOTOS[s.thumb][1], from, to, '0px', '10px')
    clearA(b.current, text.current)
    css(b.current, { opacity: 0, pointerEvents: 'none' })
    A(text.current!, [{ opacity: 1 }, { opacity: 0 }], 120, EASE.in)
    A(b.current!, [{ opacity: 1 }, { opacity: 0 }], 260, EASE.std, 80)
    setLog(<>돌아갈 때도 <b>제자리로</b> 날아감</>)
    await done(f.an)
    if (g !== s.gen) return
    css(th, { visibility: '' }); css(hero.current, { visibility: '' }); f.el.remove(); s.busy = false
  }

  const demo = useDemo({
    reset() {
      const s = st.current
      s.gen++
      clearA(b.current, text.current)
      dev.current?.querySelectorAll('.fly').forEach(f => f.remove())
      thumbs.current.forEach(t => css(t, { visibility: '' }))
      css(b.current, { opacity: 0, pointerEvents: 'none' }); css(hero.current, { visibility: '' })
      s.open = false; s.busy = false
    },
    async play(c) {
      await c.press(dev.current, thumbs.current[1]); await c.sleep(1500)
      await c.press(dev.current, backBtn.current); await c.sleep(500)
    },
  })

  return (
    <Card id="t-shared" num="03" title="공유 요소" en="Shared Element" desc="두 화면에 공통으로 있는 요소(사진)가 위치를 이어서 날아가요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">갤러리</div>
            <div className="gal">
              {PHOTOS.map(([t, g], i) => (
                <button key={g} className={'thumb ' + g} ref={el => { thumbs.current[i] = el }} onClick={() => openIt(i)}><span>{t}</span></button>
              ))}
            </div>
          </div>
          <div className="scr" ref={b} style={{ paddingTop: 0, opacity: 0, pointerEvents: 'none', zIndex: 5 }}>
            <div className={'hero ' + PHOTOS[photo][1]} ref={hero}>
              <button className="float-btn" ref={backBtn} style={{ top: 28, left: 10 }} aria-label="뒤로" onClick={closeIt}>‹</button>
            </div>
            <div className="pad" ref={text}>
              <b style={{ fontSize: 18 }}>{PHOTOS[photo][0]}</b>
              <div className="muted">2026.10.21 · 강릉</div>
              <div className="fake-line" /><div className="fake-line" style={{ width: '80%' }} /><div className="fake-line" style={{ width: '55%' }} />
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['대상', '공통 요소 1개'], ['시간', '400ms'], ['이징', 'Emphasized']]}
        usage={[['언제', '썸네일 → 상세 이미지, 프로필 사진 → 프로필 화면'], ['규칙', '‘같은 것’이라는 연결이 핵심 — 나머지는 페이드로 보조']]}
      />
    </Card>
  )
}

/* ---------- 05 카드 확장 (컨테이너 변형) ---------- */
const CARDS = [
  ['g2', '도심 속 북카페 5곳', '조용히 읽기 좋은 곳'],
  ['g3', '주말 근교 산책 코스', '왕복 2시간 이내'],
  ['g1', '11월 전시 모음', '무료 전시 포함'],
] as const

export function CardExpand() {
  const { A, clearA, rel, px } = useMotion()
  const dev = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLButtonElement | null)[]>([])
  const mo = useRef<HTMLDivElement>(null), cb = useRef<HTMLDivElement>(null), cd = useRef<HTMLDivElement>(null), x = useRef<HTMLButtonElement>(null)
  const st = useRef({ busy: false, gen: 0, from: null as Rect | null })
  const [morph, setMorph] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(<>카드를 눌러 <b>컨테이너가 변하는 것</b> 확인</>)

  const full = () => ({ left: '0px', top: '0px', width: (dev.current?.clientWidth ?? 0) + 'px', height: (dev.current?.clientHeight ?? 0) + 'px' })

  const openIt = (i: number) => {
    const s = st.current
    if (s.busy || morph !== null) return
    s.busy = true
    s.from = rel(dev.current!, cards.current[i]!)
    css(cards.current[i], { visibility: 'hidden' })
    setMorph(i)
    setLog(<><b>카드가 곧 화면</b>으로 커짐</>)
  }
  // 모프 요소가 그려진 직후(페인트 전) 펼치기 애니메이션
  useLayoutEffect(() => {
    const s = st.current, from = s.from
    if (morph === null || !from || !mo.current || !cb.current || !cd.current || !x.current) return
    s.from = null
    const g = s.gen
    css(mo.current, { ...full(), borderRadius: '0px' })
    css(cb.current, { height: '170px' })
    const an = A(mo.current, [{ ...px(from), borderRadius: '12px' }, { ...full(), borderRadius: '0px' }], 420, EASE.emph)
    A(cb.current, [{ height: '56px' }, { height: '170px' }], 420, EASE.emph)
    A(cd.current, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], 220, EASE.out, 200)
    A(x.current, [{ opacity: 0 }, { opacity: 1 }], 200, EASE.std, 220)
    done(an).then(() => { if (g === s.gen) s.busy = false })
  }, [morph]) // 모프가 생길 때만

  const closeIt = async () => {
    const s = st.current
    if (s.busy || morph === null || !mo.current || !cb.current || !cd.current || !x.current || !dev.current) return
    s.busy = true
    const g = s.gen, card = cards.current[morph]!
    const to = rel(dev.current, card), m = mo.current
    clearA(m, cb.current, cd.current, x.current)
    css(m, { ...px(to), borderRadius: '12px' }); css(cb.current, { height: '56px' })
    const an = A(m, [{ ...full(), borderRadius: '0px' }, { ...px(to), borderRadius: '12px' }], 360, EASE.emph)
    A(cb.current, [{ height: '170px' }, { height: '56px' }], 360, EASE.emph)
    A(cd.current, [{ opacity: 1 }, { opacity: 0 }], 100, EASE.in)
    A(x.current, [{ opacity: 1 }, { opacity: 0 }], 100, EASE.in)
    setLog(<>다시 <b>카드 크기로</b> 줄어듦</>)
    await done(an)
    if (g !== s.gen) return
    css(card, { visibility: '' }); setMorph(null); s.busy = false
  }

  const demo = useDemo({
    reset() {
      const s = st.current
      s.gen++; s.busy = false; s.from = null
      setMorph(null)
      cards.current.forEach(c => css(c, { visibility: '' }))
    },
    async play(c) {
      await c.press(dev.current, cards.current[0]); await c.sleep(1500)
      await c.press(dev.current, dev.current?.querySelector<HTMLElement>('.morph .float-btn') ?? null); await c.sleep(400)
    },
  })

  const mc = morph === null ? null : CARDS[morph]
  return (
    <Card id="t-expand" num="05" title="카드 확장" en="Container Transform" desc="누른 카드 자체가 커지면서 그대로 다음 화면이 돼요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">오늘의 추천</div>
            <div className="clist">
              {CARDS.map(([g, t, sub], i) => (
                <button key={t} className="ccard" ref={el => { cards.current[i] = el }} onClick={() => openIt(i)}>
                  <div className={'cb ' + g} /><div className="ct"><b>{t}</b><small>{sub}</small></div>
                </button>
              ))}
            </div>
          </div>
          {mc && (
            <div className="morph" ref={mo}>
              <div className={'cb ' + mc[0]} ref={cb}>
                <button className="float-btn" ref={x} style={{ top: 28, right: 10 }} aria-label="닫기" onClick={closeIt}>✕</button>
              </div>
              <div className="ct"><b>{mc[1]}</b><small>{mc[2]}</small></div>
              <div className="cd" ref={cd}>
                <div className="fake-line" /><div className="fake-line" style={{ width: '85%' }} /><div className="fake-line" style={{ width: '65%' }} />
                <button className="btn sm" style={{ marginTop: 6 }}>자세히 보기</button>
              </div>
            </div>
          )}
        </Device>
      </Stage>
      <Info
        spec={[['대상', '컨테이너 전체'], ['시간', '420ms'], ['이징', 'Emphasized']]}
        usage={[['언제', '카드·리스트 아이템이 곧 상세 화면인 경우'], ['vs 공유 요소', '요소 하나가 날아가는 게 아니라 ‘틀’ 자체가 커져요']]}
      />
    </Card>
  )
}

/* ---------- 06 줌 ---------- */
const APPS = [
  ['#3b5bfd', '캘린더', '#3b5bfd', '📅'], ['#e8590c', '사진', '#ff922b', '🖼️'], ['#0ca678', '지도', '#20c997', '🗺️'],
  ['#d6336c', '음악', '#f06595', '🎵'], ['#7048e8', '메모', '#845ef7', '📝'], ['#1971c2', '날씨', '#339af0', '⛅'],
  ['#495057', '설정', '#868e96', '⚙️'], ['#f08c00', '메일', '#fcc419', '✉️'], ['#2f9e44', '메시지', '#51cf66', '💬'],
] as const

export function Zoom() {
  const { A, clearA, rel } = useMotion()
  const dev = useRef<HTMLDivElement>(null), home = useRef<HTMLDivElement>(null), app = useRef<HTMLDivElement>(null), closeBtn = useRef<HTMLButtonElement>(null)
  const icons = useRef<(HTMLButtonElement | null)[]>([])
  const st = useRef({ open: false, busy: false, gen: 0 })
  const [head, setHead] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>아이콘을 누르고, 아래 막대로 <b>닫기</b></>)

  const go = async (toOpen: boolean, i?: number) => {
    const s = st.current
    if (s.busy || s.open === toOpen) return
    s.busy = true
    const g = s.gen
    if (i !== undefined) {
      const r = rel(dev.current!, icons.current[i]!.querySelector('i')!)
      const o = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`
      css(app.current, { transformOrigin: o }); css(home.current, { transformOrigin: o })
      setHead(i)
    }
    clearA(app.current, home.current)
    css(app.current, { opacity: toOpen ? 1 : 0, pointerEvents: toOpen ? 'auto' : 'none', transform: 'none' })
    css(home.current, { opacity: toOpen ? 0 : 1, transform: toOpen ? 'scale(1.2)' : 'none' })
    const f = dir(toOpen)
    const dur = toOpen ? 380 : 320
    const an = A(app.current!, f({ transform: 'scale(.14)', opacity: 0, borderRadius: '60px' }, { transform: 'scale(1)', opacity: 1, borderRadius: '0px' }), dur, EASE.emph)
    A(home.current!, f({ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.2)', opacity: 0 }), dur, EASE.emph)
    s.open = toOpen
    setLog(toOpen ? <><b>{APPS[i ?? head][1]}</b> 아이콘 위치에서 확대</> : <>원래 <b>아이콘 자리로</b> 축소</>)
    await done(an)
    if (g === s.gen) s.busy = false
  }

  const demo = useDemo({
    reset() {
      const s = st.current
      s.gen++; s.open = false; s.busy = false
      clearA(app.current, home.current)
      css(app.current, { opacity: 0, pointerEvents: 'none' }); css(home.current, { opacity: 1, transform: 'none' })
    },
    async play(c) {
      await c.press(dev.current, icons.current[4]); await c.sleep(1400)
      await c.press(dev.current, closeBtn.current); await c.sleep(400)
    },
  })

  return (
    <Card id="t-zoom" num="06" title="줌" en="Zoom" desc="누른 지점을 중심으로 새 화면이 확대되며 열리고, 닫으면 그 자리로 줄어들어요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr home" ref={home}>
            <div className="apps">
              {APPS.map(([, n, bg, ic], i) => (
                <button key={n} className="app-ic" ref={el => { icons.current[i] = el }} onClick={() => go(true, i)}><i style={{ background: bg }}>{ic}</i>{n}</button>
              ))}
            </div>
          </div>
          <div className="scr zapp" ref={app}>
            <div className="zhead" style={{ background: APPS[head][0] }}>{APPS[head][1]}</div>
            <div className="pad"><div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} /><div className="fake-line" style={{ width: '85%' }} /><div className="fake-line" style={{ width: '50%' }} /></div>
            <button className="homebar" ref={closeBtn} aria-label="홈으로" onClick={() => go(false)} />
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['기준점', '누른 위치'], ['시간', '380ms'], ['이징', 'Emphasized']]}
        usage={[['언제', '앱 아이콘 실행, 갤러리 사진 크게 보기, 지도·차트 확대'], ['규칙', '닫을 때는 반드시 원래 위치로 줄어들어야 ‘어디서 왔는지’ 알 수 있어요']]}
      />
    </Card>
  )
}
