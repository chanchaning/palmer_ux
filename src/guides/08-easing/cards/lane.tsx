import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useMotion } from '../../../lib/motion'
import { C, MsChip, Plot, RangeIn, bounceFn, done, follow, pct, springFn, useCtl, useCycle, type LaneCurve, type PlotApi } from '../shared'

/* ---------- 01–04 : 공 + 레인 ---------- */
interface LaneOpts {
  curve: () => LaneCurve
  dur?: () => number
  finish: (ms: number, c: LaneCurve) => ReactNode
  room?: number
  vertical?: boolean
  setLog: (n: ReactNode) => void
}

function useLane(opts: LaneOpts) {
  const { A } = useMotion()
  const live = useRef(opts)
  live.current = opts
  const lane = useRef<HTMLDivElement>(null)
  const ball = useRef<HTMLElement>(null)
  const ghost = useRef<HTMLElement>(null)
  const goal = useRef<HTMLElement>(null)
  const plot = useRef<PlotApi>(null)
  const K = useCtl()
  const { vertical = false, room = 1 } = opts

  const tr = (v: number) => vertical ? 'translateY(' + v + 'px)' : 'translateX(' + v + 'px)'
  const geo = () => {
    const ln = lane.current, b = ball.current, g = goal.current
    if (!ln || !b || !g) return 0
    const d = vertical ? ln.clientHeight - b.offsetHeight - 12 : Math.round((ln.clientWidth - b.offsetWidth - 12) * room)
    if (vertical) g.style.top = (6 + d + b.offsetHeight) + 'px'
    else g.style.left = (6 + d + b.offsetWidth / 2) + 'px'
    return d
  }
  const geoRef = useRef(geo)
  geoRef.current = geo
  useEffect(() => {
    geoRef.current()
    const onResize = () => { if (!ball.current?.getAnimations().length) geoRef.current() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const reset = () => { K.clear(); plot.current?.set(null) }
  const play = async () => {
    K.clear()
    const o = live.current, c = o.curve(), ms = c.ms || o.dur?.() || 0, d = geo()
    const b = ball.current, g = ghost.current
    if (!b || !g) return
    let frames: Keyframe[]
    if (c.s) frames = [{ transform: tr(0) }, { transform: tr(d) }]
    else { frames = []; for (let i = 0; i <= 120; i++) frames.push({ transform: tr(c.f(i / 120) * d) }) }
    const a = K.add(A(b, frames, ms, c.s || 'linear'))
    K.add(A(g, [{ transform: tr(0) }, { transform: tr(d) }], ms, 'linear'))
    K.stop(follow(plot.current, a, t => live.current.setLog(<>시간 <b>{pct(t)}</b> · 진행 <b>{pct(c.f(t))}</b></>)))
    if (await done(a)) live.current.setLog(live.current.finish(ms, c))
  }
  const laneEl = (
    <div className={'ez-lane' + (vertical ? ' v' : '')} ref={lane}><i className="ez-goal" ref={goal} /><i className="ez-ghost" ref={ghost} /><i className="ez-ball" ref={ball} /></div>
  )
  return { plot, play, reset, laneEl }
}

/** 박스 + 재생 버튼 자동 재생 */
function useLaneDemo(L: { play: () => Promise<void>; reset: () => void }, box: RefObject<HTMLDivElement | null>, btn: RefObject<HTMLButtonElement | null>) {
  return useDemo({
    reset: L.reset,
    async play(c) { c.tap(box.current, btn.current); await L.play(); await c.sleep(400) },
  })
}

const IN_DURS = [200, 600, 1200]
const OUT_DURS = [250, 600, 1200]

function SimpleLane({ id, num, title, en, desc, curve, durs, initLog, finish, spec, usage }: {
  id: string; num: string; title: string; en: string; desc: string; curve: LaneCurve; durs: number[]
  initLog: ReactNode; finish: (ms: number) => ReactNode; spec: [ReactNode, ReactNode][]; usage: [ReactNode, ReactNode][]
}) {
  const [log, setLog] = useState<ReactNode>(initLog)
  const dur = useCycle(durs, 1)
  const L = useLane({ curve: () => curve, dur: dur.get, finish, setLog })
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const curves = useMemo(() => [{ f: curve.f }], [curve])
  const demo = useLaneDemo(L, box, btn)
  return (
    <Card id={id} num={num} title={title} en={en} desc={desc} demo={demo}>
      <Stage log={log} logId={id + '-log'}>
        <div className="box left ez-box" ref={box}>
          <Plot ref={L.plot} curves={curves} />
          {L.laneEl}
          <div className="ez-ctrl"><button className="btn sm ez-play" ref={btn} onClick={L.play}>▶ 재생</button><button className="chip ez-dur" onClick={dur.next}><MsChip ms={dur.v} /></button></div>
        </div>
      </Stage>
      <Info spec={spec} usage={usage} />
    </Card>
  )
}

export function EaseIn() {
  return (
    <SimpleLane id="easing-in" num="01" title="이즈 인" en="Ease In" desc="천천히 출발해서 점점 빨라져요. 끝에서 가장 빠르니 화면을 떠나는 요소에 어울려요."
      curve={C.in} durs={IN_DURS} initLog={<>▶ 재생으로 <b>가속하는 움직임</b> 보기</>}
      finish={ms => <>끝에서 가장 빠르게 — {ms <= 250 ? <><b>{ms}ms</b>면 퇴장으로 딱</> : <>실제 UI에선 <b>200ms</b> 정도로 짧게</>}</>}
      spec={[['곡선', 'cubic-bezier(.4,0,1,1)'], ['권장', '150–200ms'], ['용도', '퇴장']]}
      usage={[['언제', '닫히는 시트, 지워지는 항목처럼 화면 밖으로 나가는 움직임'], ['주의', '등장에 쓰면 출발이 굼뜨고 끝에서 ‘쾅’ 멈춰요']]} />
  )
}

export function EaseOut() {
  return (
    <SimpleLane id="easing-out" num="02" title="이즈 아웃" en="Ease Out" desc="빠르게 출발해서 부드럽게 멈춰요. 들어오는 요소가 자연스럽게 자리 잡아요."
      curve={C.out} durs={OUT_DURS} initLog={<>▶ 재생으로 <b>감속하는 움직임</b> 보기</>}
      finish={ms => <>앞에서 거의 다 가고 <b>천천히 안착</b>{ms > 400 ? ' · 길면 늘어져 보여요' : ' · 등장 권장 시간'}</>}
      spec={[['곡선', 'cubic-bezier(0,0,.2,1)'], ['권장', '200–300ms'], ['용도', '등장']]}
      usage={[['언제', '모달·토스트·메뉴처럼 화면에 새로 나타나는 요소'], ['주의', '끝부분이 길게 늘어져요 — 시간을 길게 잡으면 늦게 끝난 듯 느껴져요']]} />
  )
}

/* 03 Bounce */
const BOUNCE_DURS = [600, 1000, 1600]
export function Bounce() {
  const [e, setE] = useState(0.45)
  const B = useMemo(() => bounceFn(e), [e])
  const live = useRef({ e, B })
  live.current = { e, B }
  const [log, setLog] = useState<ReactNode>(<>반발 계수를 바꾸고 <b>떨어뜨려 보기</b></>)
  const dur = useCycle(BOUNCE_DURS, 1)
  const L = useLane({
    vertical: true, curve: () => live.current.B, dur: dur.get, setLog,
    finish: () => { const { e: ev, B: b } = live.current; return <>튕김 <b>{b.n}번</b> · 반발 {ev.toFixed(2)}{ev > 0.6 ? ' — 오래 튀어서 산만해요' : ev < 0.3 ? ' — 툭 떨어지고 끝' : ' — 경쾌하게 잦아들어요'}</> },
  })
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const curves = useMemo(() => [{ f: B.f }], [B])
  const demo = useLaneDemo(L, box, btn)
  const onE = (v: number) => {
    const ne = v / 100
    setE(ne)
    live.current = { e: ne, B: bounceFn(ne) }
    setLog(<>반발 <b>{ne.toFixed(2)}</b> · 높이가 매번 e² = {Math.round(ne * ne * 100)}%로 줄어요</>)
  }
  return (
    <Card id="easing-bounce" num="03" title="바운스" en="Bounce" desc="바닥에 닿은 뒤 튕겼다가 잦아들어요. 중력과 반발 계수로 계산한 실제 낙하예요." demo={demo}>
      <Stage log={log} logId="easing-bounce-log">
        <div className="box left ez-box" ref={box}>
          <div className="ez-top">
            <Plot ref={L.plot} curves={curves} />
            {L.laneEl}
          </div>
          <label className="ez-sl"><span>반발 계수</span><RangeIn min={20} max={70} value={Math.round(e * 100)} className="ez-e" label="반발 계수" onInput={onE} onCommit={L.play} /><output>{e.toFixed(2)}</output></label>
          <div className="ez-ctrl"><button className="btn sm ez-play" ref={btn} onClick={L.play}>▶ 재생</button><button className="chip ez-dur" onClick={dur.next}><MsChip ms={dur.v} /></button></div>
        </div>
      </Stage>
      <Info
        spec={[['계산', '낙하 t² + 반발 e'], ['시간', '600–1000ms'], ['구현', '키프레임 120개']]}
        usage={[['언제', '축하·게임·알림 배지처럼 놀이 감각이 필요한 순간'], ['주의', '버튼·시트 같은 일상 UI엔 산만해요 — 한 화면에 한 곳만']]}
      />
    </Card>
  )
}

/* 04 Spring */
const PRESETS = [['기본', 170, 14], ['부드럽게', 120, 20], ['통통', 260, 9], ['단단히', 480, 40]] as const
type Spring = ReturnType<typeof springFn>
const springDesc = (S: Spring) => <>ζ <b>{S.z.toFixed(2)}</b> · 오버슈트 <b>{pct(S.over)}</b> · 정착 <b>{S.ms}ms</b></>

export function Spring() {
  const [kc, setKc] = useState<[number, number]>([170, 14])
  const S = useMemo(() => springFn(kc[0], kc[1]), [kc])
  const SRef = useRef(S)
  SRef.current = S
  const [log, setLog] = useState<ReactNode>(<>슬라이더를 놓으면 <b>새 스프링으로 재생</b></>)
  const L = useLane({
    room: 0.8, curve: () => SRef.current, setLog,
    finish: () => { const s = SRef.current; return <>{springDesc(s)}{s.z >= 1 || s.over < 0.01 ? ' · 출렁임 없이 도착' : s.z < 0.4 ? ' · 너무 출렁여요' : ' · 살짝 넘쳤다 제자리'}</> },
  })
  const preset = useCycle(PRESETS, 0)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const curves = useMemo(() => [{ f: S.f }], [S])
  const demo = useLaneDemo(L, box, btn)
  const setKC = (k: number, c: number) => { const s = springFn(k, c); SRef.current = s; setKc([k, c]); return s }
  return (
    <Card id="easing-spring" num="04" title="스프링" en="Spring" desc="시간 대신 강성과 감쇠로 정해요. 살짝 넘쳤다가 제자리로 돌아오며 손에 붙는 느낌을 줘요." demo={demo}>
      <Stage log={log} logId="easing-spring-log">
        <div className="box left ez-box" ref={box}>
          <Plot ref={L.plot} curves={curves} />
          {L.laneEl}
          <label className="ez-sl"><span>강성 k</span><RangeIn min={40} max={500} step={10} value={kc[0]} className="ez-k" label="강성" onInput={v => setLog(springDesc(setKC(v, kc[1])))} onCommit={L.play} /><output>{kc[0]}</output></label>
          <label className="ez-sl"><span>감쇠 c</span><RangeIn min={4} max={40} value={kc[1]} className="ez-c" label="감쇠" onInput={v => setLog(springDesc(setKC(kc[0], v)))} onCommit={L.play} /><output>{kc[1]}</output></label>
          <div className="ez-ctrl">
            <button className="btn sm ez-play" ref={btn} onClick={L.play}>▶ 재생</button>
            <span className="chip ez-dur" aria-disabled="true">⏱ <b>≈{S.ms}ms</b></span>
            <button className="chip ez-preset" onClick={() => { const p = preset.next(); setKC(p[1], p[2]); L.play() }}>프리셋 <b>{preset.v[0]}</b></button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['입력', '강성 k · 감쇠 c · 질량 1'], ['시간', '물리 계산(정착까지)'], ['CSS 근사', 'cubic-bezier(.34,1.56,.64,1)']]}
        usage={[['언제', '드래그를 놓았을 때, 시트 스냅, 토글처럼 손으로 만지는 요소'], ['주의', '감쇠비 ζ가 0.4 아래면 출렁임이 길어져 어지러워요']]}
      />
    </Card>
  )
}
