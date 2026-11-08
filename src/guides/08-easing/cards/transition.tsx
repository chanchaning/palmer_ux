import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useMotion } from '../../../lib/motion'
import { C, MsChip, Plot, done, follow, pct, useCtl, useCycle, type Ease, type PlotApi } from '../shared'

/* ---------- 08 Slide ---------- */
const CURVES: { n: string; c: Ease; m: ReactNode }[] = [
  { n: '감속', c: C.out, m: <>빠르게 들어와 <b>부드럽게 멈춰요</b> — 등장에 딱</> },
  { n: '선형', c: C.linear, m: <>속도가 일정해서 <b>기계적으로</b> 보여요</> },
  { n: '가속', c: C.in, m: <>가장 빠를 때 멈춰서 <b>끝에서 부딪혀요</b></> },
]
const SLIDE_DURS = [300, 600, 1200]

export function Slide() {
  const { A, sleep } = useMotion()
  const K = useCtl()
  const cv = useCycle(CURVES, 0)
  const dur = useCycle(SLIDE_DURS, 1)
  const openRef = useRef(false)
  const [plotTo, setPlotTo] = useState(true)
  const sheet = useRef<HTMLDivElement>(null)
  const dim = useRef<HTMLDivElement>(null)
  const obj = useRef<HTMLDivElement>(null)
  const openBtn = useRef<HTMLButtonElement>(null)
  const plot = useRef<PlotApi>(null)
  const [log, setLog] = useState<ReactNode>(<>곡선 칩으로 <b>감속 · 선형 · 가속</b> 비교</>)

  const cf = plotTo ? cv.v.c.f : C.in.f
  const curves = useMemo(() => [{ f: cf }], [cf])

  const toggle = async (to: boolean) => {
    K.clear()
    openRef.current = to
    const c = to ? cv.get() : { n: '가속', c: C.in, m: null }, ms = to ? dur.get() : Math.round(dur.get() * 0.67)
    const sh = sheet.current, dm = dim.current
    if (!sh || !dm) return
    setPlotTo(to)
    sh.style.transform = to ? 'none' : 'translateY(105%)'; dm.style.opacity = to ? '.25' : '0'
    const fr = [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }]
    const an = K.add(A(sh, to ? fr : fr.slice().reverse(), ms, c.c.s))
    K.add(A(dm, to ? [{ opacity: 0 }, { opacity: 0.25 }] : [{ opacity: 0.25 }, { opacity: 0 }], ms, c.c.s))
    K.stop(follow(plot.current, an, t => setLog(<>{to ? '들어오는 중 ' : '나가는 중 '}<b>{pct(c.c.f(t))}</b></>)))
    if (await done(an)) setLog(to ? <>{cv.get().m} · {ms}ms</> : <>나갈 땐 <b>가속 {ms}ms</b> — 들어올 때보다 짧게</>)
  }
  const demo = useDemo({
    reset() {
      K.clear(); openRef.current = false
      if (sheet.current) sheet.current.style.transform = 'translateY(105%)'
      if (dim.current) dim.current.style.opacity = '0'
      setPlotTo(true)
    },
    async play(c) {
      c.tap(obj.current, openBtn.current); await toggle(true); await c.sleep(1100)
      c.tap(obj.current, sheet.current); await toggle(false); await c.sleep(300)
    },
  })

  return (
    <Card id="easing-slide" num="08" title="슬라이드" en="Slide" desc="가장자리에서 밀려 들어와요. 들어올 땐 감속, 나갈 땐 가속으로 더 짧게 써요." demo={demo}>
      <Stage log={log} logId="easing-slide-log">
        <div className="box left ez-box">
          <Plot ref={plot} sm curves={curves} labels={['열림', '닫힘']} yName="위치" />
          <div className="ez-obj" ref={obj}>
            <div className="ez-hint" style={{ right: 12 }}><div className="fake-line" style={{ width: '50%' }} /><div className="fake-line" style={{ width: '80%' }} /></div>
            <button className="btn sm ez-open" id="easing-slide-open" ref={openBtn} onClick={() => toggle(true)}>시트 열기</button>
            <div className="ez-dimbg" ref={dim} />
            <div className="ez-sheet" id="easing-slide-sheet" ref={sheet} onClick={() => toggle(false)}>
              <b>공유하기</b><div className="fake-line" style={{ width: '70%' }} /><div className="fake-line" style={{ width: '90%' }} /><div className="fake-line" style={{ width: '55%' }} /><span className="muted">눌러서 닫기</span>
            </div>
          </div>
          <div className="ez-ctrl">
            <button className="btn sm ez-play" onClick={async () => { await toggle(true); await sleep(700); await toggle(false) }}>▶ 열기·닫기</button>
            <button className="chip ez-curve" onClick={() => { cv.next(); setPlotTo(true); if (!openRef.current) toggle(true); else toggle(false).then(() => toggle(true)) }}>곡선 <b>{cv.v.n}</b></button>
            <button className="chip ez-dur" onClick={dur.next}><MsChip ms={dur.v} /></button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['들어옴', '300ms · (0,0,.2,1)'], ['나감', '200ms · (.4,0,1,1)'], ['거리', '요소 높이만큼']]}
        usage={[['언제', '바텀 시트, 드로어, 스낵바처럼 가장자리에 붙은 요소'], ['주의', '선형은 기계적이고, 가속으로 들어오면 끝에서 부딪혀요']]}
      />
    </Card>
  )
}

/* ---------- 09 Shared element ---------- */
const ROWS = [['g2', '새벽 호수'], ['g3', '여름 숲'], ['g4', '벚꽃길']] as const
const SH_MODES = ['공유 요소', '페이드만'] as const
const SH_DURS = [400, 800, 1600]

export function Shared() {
  const { A, rel, px, sleep } = useMotion()
  const K = useCtl()
  const mode = useCycle(SH_MODES, 0)
  const dur = useCycle(SH_DURS, 1)
  const [det, setDet] = useState<{ on: boolean; g: string; t: string }>({ on: false, g: '', t: '새벽 호수' })
  const frame = useRef<HTMLDivElement>(null)
  const detEl = useRef<HTMLDivElement>(null)
  const hero = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
  const ths = useRef<(HTMLElement | null)[]>([])
  const plot = useRef<PlotApi>(null)
  const row = useRef<number | null>(null)
  const fly = useRef<HTMLDivElement | null>(null)
  const [log, setLog] = useState<ReactNode>(<>항목을 눌러 <b>썸네일이 이어지는 것</b> 확인</>)

  const shared0 = mode.v === '공유 요소'
  const curves = useMemo(() => [{ f: shared0 ? C.emph.f : C.std.f }], [shared0])

  const cleanup = () => {
    fly.current?.remove(); fly.current = null
    ths.current.forEach(t => { if (t) t.style.visibility = '' })
    if (hero.current) hero.current.style.visibility = ''
  }
  const setOp = (d: number, l: number) => { if (detEl.current) detEl.current.style.opacity = String(d); if (list.current) list.current.style.opacity = String(l) }

  const openIt = async (i: number) => {
    K.clear(); cleanup()
    row.current = i
    const ms = dur.get(), shared = mode.get() === '공유 요소', th = ths.current[i], fr = frame.current, hr = hero.current, dt = detEl.current, ls = list.current
    if (!th || !fr || !hr || !dt || !ls) return
    setDet({ on: true, g: ROWS[i][0], t: ROWS[i][1] })
    setOp(1, 0)
    let an: Animation
    if (shared) {
      const f = document.createElement('div')
      f.className = 'ez-fly ' + ROWS[i][0]
      fly.current = f
      const from = rel(fr, th), to = { left: 0, top: 0, width: fr.clientWidth, height: hr.offsetHeight }
      Object.assign(f.style, px(to)); fr.appendChild(f)
      th.style.visibility = 'hidden'; hr.style.visibility = 'hidden'
      an = K.add(A(f, [{ ...px(from), borderRadius: '7px' }, { ...px(to), borderRadius: '0px' }], ms, C.emph.s))
      K.add(A(dt, [{ opacity: 0 }, { opacity: 1 }], ms * 0.5, C.std.s, ms * 0.15))
      K.add(A(ls, [{ opacity: 1 }, { opacity: 0 }], ms * 0.3, C.in.s))
    } else {
      an = K.add(A(dt, [{ opacity: 0 }, { opacity: 1 }], ms * 0.6, C.std.s))
      K.add(A(ls, [{ opacity: 1 }, { opacity: 0 }], ms * 0.3, C.in.s))
    }
    K.stop(follow(plot.current, an, t => setLog(<>{shared ? '썸네일 → 헤더 ' : '페이드 '}<b>{pct((shared ? C.emph : C.std).f(t))}</b></>)))
    if (await done(an)) {
      if (fly.current) { fly.current.remove(); fly.current = null; hr.style.visibility = '' }
      setLog(shared ? <><b>같은 사진</b>이 커진 거라 맥락이 이어져요</> : <>그냥 바뀌어서 <b>어느 걸 눌렀는지</b> 연결이 약해요</>)
    }
  }
  const closeIt = async () => {
    if (row.current === null) return
    K.clear(); cleanup()
    const i = row.current, ms = Math.round(dur.get() * 0.8), shared = mode.get() === '공유 요소', th = ths.current[i], fr = frame.current, hr = hero.current, dt = detEl.current, ls = list.current
    row.current = null
    if (!th || !fr || !hr || !dt || !ls) return
    setDet(d => ({ ...d, on: false }))
    setOp(0, 1)
    let an: Animation
    if (shared) {
      const f = document.createElement('div')
      f.className = 'ez-fly ' + ROWS[i][0]
      fly.current = f
      const to = rel(fr, th), from = { left: 0, top: 0, width: fr.clientWidth, height: hr.offsetHeight }
      Object.assign(f.style, px(to)); fr.appendChild(f)
      th.style.visibility = 'hidden'
      an = K.add(A(f, [{ ...px(from), borderRadius: '0px' }, { ...px(to), borderRadius: '7px' }], ms, C.emph.s))
      K.add(A(dt, [{ opacity: 1 }, { opacity: 0 }], ms * 0.4, C.in.s))
      K.add(A(ls, [{ opacity: 0 }, { opacity: 1 }], ms * 0.5, C.std.s, ms * 0.3))
    } else {
      an = K.add(A(dt, [{ opacity: 1 }, { opacity: 0 }], ms * 0.5, C.std.s))
      K.add(A(ls, [{ opacity: 0 }, { opacity: 1 }], ms * 0.5, C.std.s))
    }
    K.stop(follow(plot.current, an))
    if (await done(an)) { cleanup(); setLog(shared ? <>닫을 땐 <b>원래 자리로</b> 돌아가요</> : <>목록으로 <b>페이드</b></>) }
  }
  const resetAll = () => { K.clear(); cleanup(); row.current = null; setDet(d => ({ ...d, on: false })); setOp(0, 1); plot.current?.set(null) }
  const demo = useDemo({
    reset: resetAll,
    async play(c) {
      c.tap(frame.current, rows.current[0]); await openIt(0); await c.sleep(1100)
      c.tap(frame.current, detEl.current); await closeIt(); await c.sleep(300)
    },
  })

  return (
    <Card id="easing-shared" num="09" title="공유 요소 전환" en="Shared Element" desc="두 상태에 같이 있는 요소가 위치·크기를 이어서 움직여요. 출발은 빠르고 착지는 길게." demo={demo}>
      <Stage log={log} logId="easing-shared-log">
        <div className="box left ez-box">
          <Plot ref={plot} sm curves={curves} />
          <div className="ez-obj" id="easing-shared-frame" ref={frame}>
            <div className="ez-list" ref={list}>
              <div className="hd">앨범</div>
              {ROWS.map(([g, t], i) => (
                <button key={g} className="ez-row" ref={el => { rows.current[i] = el }} onClick={() => openIt(i)}>
                  <i className={'ez-th ' + g} ref={el => { ths.current[i] = el }} />{t}
                </button>
              ))}
            </div>
            <div className={'ez-det' + (det.on ? ' on' : '')} id="easing-shared-det" ref={detEl} onClick={closeIt}>
              <div className={'hero' + (det.g ? ' ' + det.g : '')} ref={hero} /><span className="x">✕</span>
              <div className="txt"><b>{det.t}</b><div className="fake-line" style={{ width: '80%' }} /></div>
            </div>
          </div>
          <div className="ez-ctrl">
            <button className="btn sm ez-play" onClick={async () => { if (row.current !== null) { await closeIt(); return } await openIt(0); await sleep(800); await closeIt() }}>▶ 열기·닫기</button>
            <button className="chip ez-mode" onClick={mode.next}>방식 <b>{mode.v}</b></button>
            <button className="chip ez-dur" onClick={dur.next}><MsChip ms={dur.v} /></button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['곡선', 'cubic-bezier(.2,0,0,1)'], ['열기', <>400ms<i style={{ fontStyle: 'normal', fontWeight: 400, color: 'var(--text-2)' }}> / 닫기 </i>320ms</>], ['나머지', '페이드 보조']]}
        usage={[['언제', '썸네일 → 상세, 아바타 → 프로필처럼 ‘같은 것’이 커질 때'], ['주의', '위치·크기·모서리를 같은 곡선으로 — 하나라도 다르면 찢어져 보여요']]}
      />
    </Card>
  )
}
