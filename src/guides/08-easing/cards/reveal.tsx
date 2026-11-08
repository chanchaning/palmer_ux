import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useMotion } from '../../../lib/motion'
import { C, MsChip, Plot, clamp, done, follow, pct, useCtl, useCycle, type Ease, type PlotApi } from '../shared'

/* ---------- 05 Stagger ---------- */
const N = 9, DUR = 320
const GAPS = [0, 30, 60, 120]

export function Stagger() {
  const { A } = useMotion()
  const K = useCtl()
  const gap = useCycle(GAPS, 2)
  const tiles = useRef<(HTMLElement | null)[]>([])
  const plot = useRef<PlotApi>(null)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [log, setLog] = useState<ReactNode>(<>간격 칩을 바꿔 <b>흐름 차이</b> 비교</>)
  const total = (g: number) => DUR + (N - 1) * g

  const g0 = gap.v
  const curves = useMemo(() => {
    const T = total(g0)
    return Array.from({ length: N }, (_, i) => ({ f: (t: number) => C.out.f(clamp((t * T - i * g0) / DUR)), cls: i ? 'thin' : '' }))
  }, [g0])
  const ghost = useMemo(() => { const T = total(g0); return (t: number) => clamp((t * T) / DUR) }, [g0])

  const play = async () => {
    K.clear()
    const g = gap.get()
    let last: Animation | null = null
    tiles.current.forEach((el, i) => {
      if (el) last = K.add(A(el, [{ opacity: 0, transform: 'translateY(10px) scale(.94)' }, { opacity: 1, transform: 'none' }], DUR, C.out.s, i * g))
    })
    if (!last) return
    const an: Animation = last
    K.stop(follow(plot.current, an, t => {
      const n = Math.min(N, Math.floor(t * total(g) / Math.max(g, 1)) + 1)
      setLog(g ? <>등장 중 <b>{n} / {N}</b></> : <><b>모두 동시에</b> 등장 중</>)
    }))
    if (await done(an)) {
      const T = total(g)
      setLog(<>전체 <b>{T}ms</b> · {g === 0 ? '한 덩어리로 보여요' : T > 700 ? '너무 길어 기다리는 느낌이에요' : '시선이 왼쪽 위 → 오른쪽 아래로 흘러요'}</>)
    }
  }
  const demo = useDemo({
    reset() { K.clear(); plot.current?.set(null) },
    async play(c) { c.tap(box.current, btn.current); await play(); await c.sleep(500) },
  })

  return (
    <Card id="easing-stagger" num="05" title="순차 등장" en="Stagger" desc="같은 곡선을 요소마다 조금씩 늦게 시작해요. 간격이 시선의 흐름을 만들어요." demo={demo}>
      <Stage log={log} logId="easing-stagger-log">
        <div className="box left ez-box" ref={box}>
          <Plot ref={plot} sm curves={curves} ghost={ghost} labels={['보임', '숨김']} yName="항목별" />
          <div className="ez-obj"><div className="ez-tiles">
            {Array.from({ length: N }, (_, i) => <i key={i} className="ez-tile" ref={el => { tiles.current[i] = el }} />)}
          </div></div>
          <div className="ez-ctrl">
            <button className="btn sm ez-play" ref={btn} onClick={play}>▶ 재생</button>
            <button className="chip ez-gap" onClick={() => { gap.next(); play() }}>간격 <b>{gap.v}ms</b></button>
            <span className="chip ez-dur" aria-disabled="true">⏱ <b>320ms</b> 개별</span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['간격', '30–60ms'], ['개별', '320ms · cubic-bezier(0,0,.2,1)'], ['전체', '600ms 이내']]}
        usage={[['언제', '카드 그리드·리스트 첫 로딩, 메뉴 항목 펼침'], ['주의', '개수 × 간격이 길면 기다리는 느낌 — 앞의 6~8개만 순차로']]}
      />
    </Card>
  )
}

/* ---------- 06 Fade ---------- */
const MODES: { n: '나타남' | '사라짐' | '교차'; c: Ease; rec: number }[] = [
  { n: '나타남', c: C.out, rec: 200 },
  { n: '사라짐', c: C.in, rec: 150 },
  { n: '교차', c: C.std, rec: 300 },
]
const FADE_DURS = [200, 500, 1000]

export function Fade() {
  const { A } = useMotion()
  const K = useCtl()
  const mode = useCycle(MODES, 0)
  const dur = useCycle(FADE_DURS, 1)
  const a = useRef<HTMLDivElement>(null)
  const b = useRef<HTMLDivElement>(null)
  const plot = useRef<PlotApi>(null)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [log, setLog] = useState<ReactNode>(<>모드 칩: <b>나타남 · 사라짐 · 교차</b></>)

  const m0 = mode.v
  const { curves, ghost } = useMemo(() => {
    const f = m0.c.f
    if (m0.n === '나타남') return { curves: [{ f }], ghost: undefined }
    if (m0.n === '사라짐') return { curves: [{ f: (t: number) => 1 - f(t) }], ghost: (t: number) => 1 - t }
    return { curves: [{ f: (t: number) => 1 - f(t), cls: 'b' }, { f }], ghost: undefined }
  }, [m0])

  const setOp = (va: number, vb: number) => { if (a.current) a.current.style.opacity = String(va); if (b.current) b.current.style.opacity = String(vb) }
  useLayoutEffect(() => setOp(1, 0), [])

  const play = async () => {
    K.clear()
    const m = mode.get(), ms = dur.get(), ea = a.current, eb = b.current
    if (!ea || !eb) return
    let an: Animation
    if (m.n === '나타남') { setOp(1, 0); an = K.add(A(ea, [{ opacity: 0 }, { opacity: 1 }], ms, m.c.s)) }
    else if (m.n === '사라짐') { setOp(0, 0); an = K.add(A(ea, [{ opacity: 1 }, { opacity: 0 }], ms, m.c.s)) }
    else { setOp(0, 1); K.add(A(ea, [{ opacity: 1 }, { opacity: 0 }], ms, m.c.s)); an = K.add(A(eb, [{ opacity: 0 }, { opacity: 1 }], ms, m.c.s)) }
    K.stop(follow(plot.current, an, t => {
      const v = m.c.f(t)
      setLog(m.n === '교차' ? <>호수 <b>{pct(1 - v)}</b> · 노을 <b>{pct(v)}</b></> : <>불투명도 <b>{pct(m.n === '나타남' ? v : 1 - v)}</b></>)
    }))
    if (await done(an)) {
      setLog(<><b>{m.n}</b> {ms}ms · {ms > m.rec * 2 ? '권장 ' + m.rec + 'ms보다 길어 굼떠 보여요' : m.n === '교차' ? '중간에 두 장이 겹쳐 흐려졌죠?' : m.n === '나타남' ? '빠르게 보이고 부드럽게 마무리' : '머뭇거리다 빠르게 사라져요'}</>)
    }
  }
  const demo = useDemo({
    reset() { K.clear(); setOp(1, 0); mode.set(0) },
    async play(c) {
      for (let i = 0; i < 3; i++) { mode.set(i); c.tap(box.current, btn.current); await play(); await c.sleep(700) }
    },
  })

  return (
    <Card id="easing-fade" num="06" title="페이드" en="Fade" desc="위치는 그대로, 불투명도만 바뀌어요. 나타날 땐 감속, 사라질 땐 가속 곡선을 써요." demo={demo}>
      <Stage log={log} logId="easing-fade-log">
        <div className="box left ez-box" ref={box}>
          <Plot ref={plot} sm curves={curves} ghost={ghost} labels={['보임', '투명']} yName="불투명도" />
          <div className="ez-obj">
            <div className="ez-pic g1" id="easing-fade-b" ref={b}>노을 바다</div>
            <div className="ez-pic g2" id="easing-fade-a" ref={a}>새벽 호수</div>
          </div>
          <div className="ez-ctrl">
            <button className="btn sm ez-play" ref={btn} onClick={play}>▶ 재생</button>
            <button className="chip ez-mode" onClick={() => { mode.next(); play() }}>모드 <b>{mode.v.n}</b></button>
            <button className="chip ez-dur" onClick={dur.next}><MsChip ms={dur.v} /></button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['나타남', '200ms · (0,0,.2,1)'], ['사라짐', '150ms · (.4,0,1,1)'], ['교차', '300ms · (.4,0,.2,1)']]}
        usage={[['언제', '툴팁·토스트·이미지 교체처럼 자리 이동이 없는 변화'], ['주의', '교차 페이드는 중간에 두 장이 겹쳐 흐려 보여요 — 내용이 다르면 ‘나감 → 들어옴’ 순서로']]}
      />
    </Card>
  )
}

/* ---------- 07 Scale ---------- */
const S0 = [0.85, 0.5, 0]
const SCALE_DURS = [200, 500, 1000]

export function Scale() {
  const { A, sleep } = useMotion()
  const K = useCtl()
  const s0 = useCycle(S0, 0)
  const dur = useCycle(SCALE_DURS, 1)
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const [plotOpen, setPlotOpen] = useState(true)
  const menu = useRef<HTMLDivElement>(null)
  const fab = useRef<HTMLButtonElement>(null)
  const obj = useRef<HTMLDivElement>(null)
  const plot = useRef<PlotApi>(null)
  const [log, setLog] = useState<ReactNode>(<>＋ 버튼이나 칩으로 <b>시작 크기</b> 비교</>)

  const sv = s0.v
  const { curves, ghost } = useMemo(() => plotOpen
    ? { curves: [{ f: (t: number) => sv + (1 - sv) * C.out.f(t) }], ghost: (t: number) => sv + (1 - sv) * t }
    : { curves: [{ f: (t: number) => 1 - (1 - sv) * C.in.f(t) }], ghost: (t: number) => 1 - (1 - sv) * t }, [plotOpen, sv])

  const setOpenBoth = (v: boolean) => { openRef.current = v; setOpen(v) }
  const toggle = async (to: boolean) => {
    K.clear()
    setOpenBoth(to)
    const s = s0.get(), ms = to ? dur.get() : Math.round(dur.get() * 0.75), mn = menu.current
    if (!mn) return
    setPlotOpen(to)
    mn.style.opacity = to ? '1' : '0'; mn.style.transform = to ? 'none' : 'scale(' + s + ')'
    const fr = [{ opacity: 0, transform: 'scale(' + s + ')' }, { opacity: 1, transform: 'scale(1)' }]
    const an = K.add(A(mn, to ? fr : fr.slice().reverse(), ms, to ? C.out.s : C.in.s))
    K.stop(follow(plot.current, an, t => setLog(<>크기 <b>×{(to ? s + (1 - s) * C.out.f(t) : 1 - (1 - s) * C.in.f(t)).toFixed(2)}</b></>)))
    if (await done(an)) {
      setLog(to
        ? <>{s === 0 ? <><b>×0에서</b> 튀어나와 과해요</> : s === 0.5 ? <><b>×0.5</b> — 아직 크게 튀는 느낌</> : <><b>×0.85</b>에서 살짝 커지며 자연스러워요</>} · {ms}ms</>
        : <>닫기는 <b>{ms}ms · 가속</b>으로 더 짧게</>)
    }
  }
  const demo = useDemo({
    reset() { K.clear(); setOpenBoth(false); if (menu.current) menu.current.style.opacity = '0'; setPlotOpen(true) },
    async play(c) {
      c.tap(obj.current, fab.current); await toggle(true); await c.sleep(1100)
      c.tap(obj.current, fab.current); await toggle(false); await c.sleep(300)
    },
  })

  return (
    <Card id="easing-scale" num="07" title="확대 전환" en="Scale" desc="누른 지점에서 조금 작은 크기로 시작해 커지며 나타나요. 시작 크기가 인상을 좌우해요." demo={demo}>
      <Stage log={log} logId="easing-scale-log">
        <div className="box left ez-box">
          <Plot ref={plot} sm curves={curves} ghost={ghost} labels={['×1', '×0']} yName="크기" />
          <div className="ez-obj" ref={obj}>
            <div className="ez-hint"><div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" style={{ width: '85%' }} /><div className="fake-line" style={{ width: '45%' }} /></div>
            <div className={'ez-menu' + (open ? ' on' : '')} id="easing-scale-menu" ref={menu}>
              <button onClick={() => toggle(false)}>✎ 새 메모</button><button onClick={() => toggle(false)}>📷 사진 추가</button><button onClick={() => toggle(false)}>📎 파일 첨부</button>
            </div>
            <button className={'ez-fab' + (open ? ' on' : '')} id="easing-scale-fab" ref={fab} aria-label="메뉴 열기" onClick={() => toggle(!openRef.current)}>+</button>
          </div>
          <div className="ez-ctrl">
            <button className="btn sm ez-play" onClick={async () => { await toggle(true); await sleep(700); await toggle(false) }}>▶ 열기·닫기</button>
            <button className="chip ez-s0" onClick={() => { s0.next(); if (openRef.current) toggle(false); setPlotOpen(true) }}>시작 <b>×{s0.v}</b></button>
            <button className="chip ez-dur" onClick={dur.next}><MsChip ms={dur.v} /></button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['시작', '×0.85 + 페이드'], ['열기', '200ms · (0,0,.2,1)'], ['닫기', '150ms · (.4,0,1,1)']]}
        usage={[['언제', '팝오버, 컨텍스트 메뉴, 플로팅 버튼 메뉴'], ['주의', '0에서 키우면 튀어나오는 느낌이 과해요 — 0.8~0.95에서 시작하고 기준점은 누른 곳']]}
      />
    </Card>
  )
}
