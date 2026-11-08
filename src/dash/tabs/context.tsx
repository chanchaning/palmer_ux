/* 04 값보다 맥락 — 모든 선택자는 [data-dash="context"] 범위 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Range, Seg } from '../../components/ui'
import { CodeBlock, Note, Section, SliderRow, SysGrid } from '../../system/ui'
import { RANGES, SUBSTATIONS, rng, series } from '../data'
import { AnalogBar, Cite, Finding, Hmi, Refs, Sparkline, useVisibleInterval } from '../ui'
import './context.css'

const FEEDERS = SUBSTATIONS.flatMap(s => s.feeders)
const sec = (ms: number) => (ms / 1000).toFixed(1)
const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
type MK = 'load' | 'kv' | 'temp'
const fmt = (k: MK, v: number) => (k === 'kv' ? v.toFixed(1) : String(Math.round(v)))
const isOut = (k: MK, v: number) => v < RANGES[k].normal[0] || v > RANGES[k].normal[1]

/* ================= 0. 맥락 쌓기 ================= */
const R1_SPARK = [70, 71, 70.5, 71.5, 71, 70, 70.5, 71, 72, 71.5, 71, 71.5, 72.5, 73.5, 74.5, 75.5, 76.5, 77.5, 78.5, 79.5, 80.5, 81.5, 82, 83]
type Layer = 'unit' | 'range' | 'trend' | 'compare'
const LAYERS: { k: Layer; name: string; lv: string }[] = [
  { k: 'unit', name: '이름과 단위', lv: '지각' },
  { k: 'range', name: '정상 범위', lv: '이해' },
  { k: 'trend', name: '추세', lv: '예측' },
  { k: 'compare', name: '비교 기준', lv: '이해' },
]
function ContextBuilder() {
  const [on, setOn] = useState<Record<Layer, boolean>>({ unit: false, range: false, trend: false, compare: false })
  const t = (k: Layer) => setOn(o => ({ ...o, [k]: !o[k] }))
  const all = () => setOn({ unit: true, range: true, trend: true, compare: true })
  const none = () => setOn({ unit: false, range: false, trend: false, compare: false })
  const qs: { q: string; ok: boolean; a: string }[] = [
    { q: '무엇을 잰 값이지?', ok: on.unit, a: '강변 1선의 부하율이에요' },
    { q: '괜찮은 건가?', ok: on.range, a: '정상 상한 80%를 넘었어요' },
    { q: '어디로 가고 있지?', ok: on.trend, a: '오르는 중, 이대로면 약 40분 뒤 95%' },
    { q: '평소와 비교하면?', ok: on.compare, a: '어제 같은 시각보다 9%p 높아요' },
  ]
  return (
    <div className="cx-build">
      <div className="cx-build-ctl">
        {LAYERS.map(l => (
          <button key={l.k} type="button" className="chip" aria-pressed={on[l.k]} onClick={() => t(l.k)}>
            {l.name}<small>{l.lv}</small>
          </button>
        ))}
        <button type="button" className="btn sm ghost" onClick={Object.values(on).every(Boolean) ? none : all}>{Object.values(on).every(Boolean) ? '모두 끄기' : '모두 켜기'}</button>
      </div>
      <div className="cx-build-body">
        <Hmi title={on.unit ? '강변 변전소 · 강변 1선' : ' '} right={on.unit ? '14:00' : undefined} className="cx-build-hmi">
          <div className="cx-tile">
            {on.unit && <span className="cx-tile-name">부하율</span>}
            <div className="cx-tile-main">
              <b className="cx-big">83{on.unit && <small>%</small>}</b>
              {on.range && <span className="cx-tile-st">정상 상한 80% 넘음</span>}
            </div>
            {on.range && <div className="cx-tile-bar"><AnalogBar value={83} min={0} max={120} normal={[30, 80]} alarm={[0, 95]} unit="%" name="강변 1선 부하율" w={260} /><span className="cx-scale"><span>0</span><span>정상 30~80</span><span>120</span></span></div>}
            {on.trend && <div className="cx-tile-trend"><Sparkline data={R1_SPARK} w={260} h={40} min={60} max={100} band={on.range ? [30, 80] : undefined} /><span>최근 2시간 · 40분째 오르는 중 <b>이대로면 약 40분 뒤 95%</b></span></div>}
            {on.compare && <div className="cx-tile-cmp">어제 같은 시각 74% <b>+9%p</b></div>}
          </div>
        </Hmi>
        <ul className="cx-qs" aria-label="읽는 사람이 답할 수 있는 질문">
          {qs.map(q => (
            <li key={q.q} className={q.ok ? 'ok' : ''}>
              <b>{q.q}</b>
              <span>{q.ok ? q.a : '아직 알 수 없어요'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ================= 1. 세 가지 표시 + 범위 밖 세기 ================= */
type View = 'num' | 'color' | 'analog'
const VIEW_NAME: Record<View, string> = { num: '숫자만', color: '숫자 + 이상만 색', analog: '아날로그 막대 + 추세' }
interface QRow { load: number; kv: number; temp: number; spark: number[] }
interface Quiz { rows: QRow[]; outs: number; riser: number }

function makeQuiz(seed: number): Quiz {
  const r = rng(seed)
  const between = (a: number, b: number) => a + r() * (b - a)
  const k = 2 + Math.floor(r() * 4)
  const cells = Array.from({ length: 27 }, (_, i) => i)
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]] }
  const outSet = new Set(cells.slice(0, k))
  const okLoad = FEEDERS.map((_, i) => !outSet.has(i * 3)).map((ok, i) => (ok ? i : -1)).filter(i => i >= 0)
  const riser = okLoad[Math.floor(r() * okLoad.length)]
  const rows: QRow[] = FEEDERS.map((_, i) => {
    const near = () => r() < 0.3
    const out = (m: number) => outSet.has(i * 3 + m)
    const load = Math.round(i === riser ? between(74, 78) : out(0) ? between(82, 92) : near() ? between(77, 79.4) : between(38, 74))
    const kv = +(out(1) ? (r() < 0.5 ? between(22.05, 22.3) : between(23.5, 23.7)) : near() ? (r() < 0.5 ? 22.5 : 23.3) : between(22.55, 23.25)).toFixed(1)
    const temp = Math.round(out(2) ? between(77, 86) : near() ? between(73, 74.4) : between(48, 70))
    const slope = i === riser ? between(14, 18) : between(-4, 4)
    const spark = Array.from({ length: 24 }, (_, t) => +(load - slope * (1 - t / 23) + (t === 23 ? 0 : (r() - 0.5) * 2)).toFixed(1))
    return { load, kv, temp, spark }
  })
  const outs = rows.reduce((n, row) => n + (['load', 'kv', 'temp'] as MK[]).filter(m => isOut(m, row[m])).length, 0)
  return { rows, outs, riser }
}

function QuizCell({ k, v, view, spark, reveal }: { k: MK; v: number; view: View; spark?: number[]; reveal: boolean }) {
  const out = isOut(k, v), R = RANGES[k]
  const showOut = (view === 'color' && out) || (reveal && out)
  return (
    <td className={(showOut ? 'out' : '') + (reveal && out ? ' rv' : '')}>
      <span className="cx-qv">{fmt(k, v)}<small>{R.unit}</small></span>
      {view === 'analog' && <AnalogBar value={v} min={R.min} max={R.max} normal={R.normal} alarm={R.alarm} unit={R.unit} name={R.name} w={100} />}
      {view === 'analog' && spark && <Sparkline data={spark} w={100} h={24} min={v - 22} max={v + 22} band={R.normal} />}
    </td>
  )
}

interface QRec { view: View; ms: number; ok: boolean }
function ThreeViews() {
  const [view, setView] = useState<View>('num')
  const [seed, setSeed] = useState(3)
  const [phase, setPhase] = useState<'idle' | 'run' | 'q2' | 'done'>('idle')
  const [t0, setT0] = useState(0)
  const [res, setRes] = useState<{ ms: number; guess: number; q2?: number } | null>(null)
  const [recs, setRecs] = useState<QRec[]>([])
  const [, setTick] = useState(0)
  const watch = useVisibleInterval(() => setTick(x => x + 1), 100, phase === 'run')
  const quiz = useMemo(() => makeQuiz(seed), [seed])

  const start = () => { setSeed(Math.floor(Math.random() * 1e9)); setRes(null); setT0(performance.now()); setPhase('run') }
  const answer = (n: number) => {
    const ms = performance.now() - t0
    setRes({ ms, guess: n }); setRecs(r => [...r, { view, ms, ok: n === quiz.outs }]); setPhase('q2')
  }
  const answer2 = (i: number) => { setRes(r => (r ? { ...r, q2: i } : r)); setPhase('done') }
  const changeView = (v: View) => { setView(v); if (phase === 'run') setPhase('idle') }
  const q2ok = res?.q2 !== undefined && (view === 'analog' ? res.q2 === quiz.riser : res.q2 === -1)
  const reveal = phase === 'q2' || phase === 'done'
  const elapsed = phase === 'run' ? performance.now() - t0 : res?.ms ?? 0
  const stat = (v: View) => { const a = recs.filter(r => r.view === v); return { n: a.length, ms: mean(a.map(r => r.ms)), ok: a.filter(r => r.ok).length } }
  const maxMs = Math.max(...(['num', 'color', 'analog'] as View[]).map(v => stat(v).ms), 1)

  return (
    <div className="cx-three">
      <div className="cx-three-ctl">
        <Seg value={view} onChange={changeView} options={(['num', 'color', 'analog'] as View[]).map(v => [v, VIEW_NAME[v]] as const)} />
        <button type="button" className="btn sm" onClick={start}>{phase === 'idle' ? '시작' : '새 문제'}</button>
        <div ref={watch} className={'cx-watch' + (phase === 'run' ? ' on' : '')}><span className="muted">걸린 시간</span><b>{sec(elapsed)}초</b></div>
      </div>
      <div className="cx-legend">
        <span>정상 범위</span>
        {(['load', 'kv', 'temp'] as MK[]).map(k => <span key={k}><b>{RANGES[k].name}</b> {RANGES[k].normal[0]}~{RANGES[k].normal[1]}{RANGES[k].unit}</span>)}
      </div>

      <div className="cx-q" role="status">
        {phase === 'idle' && <p>시작을 누르면 값이 새로 바뀌어요. <b>정상 범위를 벗어난 값이 모두 몇 개인지</b> 세어서 아래 숫자를 누르세요.</p>}
        {phase === 'run' && <p><b>정상 범위를 벗어난 값은 모두 몇 개일까요?</b></p>}
        {phase === 'q2' && res && <p>{res.guess === quiz.outs ? <b className="ok">맞혔어요.</b> : <b className="no">정답은 {quiz.outs}개예요.</b>} {sec(res.ms)}초 걸렸어요. 범위 밖 값을 표시해 뒀어요. <b>한 문제 더 — 앞으로 30분 안에 가장 먼저 걱정해야 할 선로는?</b></p>}
        {phase === 'done' && res && (
          <p>{q2ok ? <b className="ok">맞아요.</b> : <b className="no">아쉬워요.</b>}{' '}
            {view === 'analog'
              ? <><b>{FEEDERS[quiz.riser].name}</b>는 지금 {quiz.rows[quiz.riser].load}%로 정상 범위 안이지만, 추세선이 가파르게 오르고 있어요. 지금 값이 가장 높은 선로가 아니라 <b>가장 빨리 나빠지는 선로</b>가 답이에요.</>
              : <>이 화면에는 추세가 없어서 <b>알 수 없는 게 정답</b>이에요. 사실은 {FEEDERS[quiz.riser].name}가 지금 {quiz.rows[quiz.riser].load}%로 정상이지만 빠르게 오르는 중이었어요. '아날로그 막대 + 추세'로 바꿔서 다시 해 보세요.</>}
          </p>
        )}
        {phase === 'run' && (
          <div className="cx-q-btns" aria-label="범위 밖 값의 개수">
            {[0, 1, 2, 3, 4, 5, 6].map(n => <button key={n} type="button" className="btn sm ghost" onClick={() => answer(n)}>{n}개</button>)}
          </div>
        )}
        {phase === 'q2' && (
          <div className="cx-q-btns" aria-label="가장 먼저 걱정할 선로">
            {FEEDERS.map((f, i) => <button key={f.id} type="button" className="btn sm ghost" onClick={() => answer2(i)}>{f.name}</button>)}
            <button type="button" className="btn sm ghost" onClick={() => answer2(-1)}>이 화면으로는 알 수 없어요</button>
          </div>
        )}
      </div>

      <Hmi title={'9개 선로 운전값 · ' + VIEW_NAME[view]} right="누리시 배전 관제센터" className="cx-qhmi">
        <div className="cx-qwrap">
          <table className={'cx-qt v-' + view}>
            <thead><tr><th>선로</th><th>부하율</th><th>전압</th><th>유온</th></tr></thead>
            <tbody>
              {quiz.rows.map((row, i) => (
                <tr key={i} className={i % 3 === 0 && i ? 'grp' : ''}>
                  <th scope="row">{FEEDERS[i].name}{reveal && phase === 'done' && i === quiz.riser && <small className="cx-riser">빠르게 오름</small>}</th>
                  <QuizCell k="load" v={row.load} view={view} spark={row.spark} reveal={reveal} />
                  <QuizCell k="kv" v={row.kv} view={view} reveal={reveal} />
                  <QuizCell k="temp" v={row.temp} view={view} reveal={reveal} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Hmi>

      <div className="cx-rec">
        {(['num', 'color', 'analog'] as View[]).map(v => {
          const s = stat(v)
          return (
            <div key={v} className={'cx-rec-row ' + v}>
              <span>{VIEW_NAME[v]}</span>
              <span className="bar"><i style={{ width: (s.ms / maxMs) * 100 + '%' }} /></span>
              <b>{s.n ? sec(s.ms) + '초' : '–'}</b>
              <small className="muted">{s.n ? `${s.n}번 중 ${s.ok}번 정답` : '기록 없음'}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================= 2. Cleveland & McGill ================= */
type Enc = 'pos' | 'len' | 'angle' | 'area' | 'shade'
const ENCS: [Enc, string][] = [['pos', '공통 축 위치'], ['len', '길이'], ['angle', '각도'], ['area', '면적'], ['shade', '색 농도']]
interface Prob { a: number; p: number; rot: number; off: number }
const newProb = (): Prob => ({ a: 60 + Math.round(Math.random() * 40), p: 10 + Math.round(Math.random() * 80), rot: Math.random() * 360, off: 8 + Math.random() * 17 })

function wedge(cx: number, cy: number, r: number, start: number, deg: number) {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(rad(start)), y1 = cy + r * Math.sin(rad(start))
  const x2 = cx + r * Math.cos(rad(start + deg)), y2 = cy + r * Math.sin(rad(start + deg))
  return `M${cx},${cy}L${x1.toFixed(2)},${y1.toFixed(2)}A${r},${r} 0 ${deg > 180 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)}Z`
}

function EncView({ enc, pr }: { enc: Enc; pr: Prob }) {
  const A = pr.a, B = (pr.a * pr.p) / 100
  const lbl = (x: number, t: string) => <text x={x} y="166" textAnchor="middle" className="lb">{t}</text>
  return (
    <svg viewBox="0 0 300 172" className="cx-cm-svg" role="img" aria-label={`${ENCS.find(e => e[0] === enc)![1]}로 그린 두 값 A와 B`}>
      {enc === 'pos' && <>
        <line x1="40" y1="148" x2="260" y2="148" className="ax" />
        <line x1="40" y1="148" x2="40" y2="12" className="ax" />
        <circle cx="110" cy={148 - A * 1.3} r="6" className="mk" />
        <circle cx="200" cy={148 - B * 1.3} r="6" className="mk" />
        {lbl(110, 'A')}{lbl(200, 'B')}
      </>}
      {enc === 'len' && <>
        <rect x="90" y={150 - A * 1.2} width="34" height={A * 1.2} className="mk" />
        <rect x="186" y={150 - pr.off - B * 1.2} width="34" height={B * 1.2} className="mk" />
        {lbl(107, 'A')}{lbl(203, 'B')}
      </>}
      {enc === 'angle' && <>
        <circle cx="85" cy="80" r="62" className="ring" />
        <circle cx="215" cy="80" r="62" className="ring" />
        <path d={wedge(85, 80, 62, 0, A * 3.3)} className="mk" />
        <path d={wedge(215, 80, 62, pr.rot, B * 3.3)} className="mk" />
        {lbl(85, 'A')}{lbl(215, 'B')}
      </>}
      {enc === 'area' && <>
        <circle cx="90" cy="80" r={Math.sqrt(A / 100) * 66} className="mk" />
        <circle cx="220" cy="80" r={Math.sqrt(B / 100) * 66} className="mk" />
        {lbl(90, 'A')}{lbl(220, 'B')}
      </>}
      {enc === 'shade' && <>
        <rect x="40" y="14" width="100" height="130" rx="6" className="ring" />
        <rect x="160" y="14" width="100" height="130" rx="6" className="ring" />
        <rect x="40" y="14" width="100" height="130" rx="6" className="mk" style={{ opacity: A / 100 }} />
        <rect x="160" y="14" width="100" height="130" rx="6" className="mk" style={{ opacity: B / 100 }} />
        {lbl(90, 'A')}{lbl(210, 'B')}
      </>}
    </svg>
  )
}

function CMDemo() {
  const [enc, setEnc] = useState<Enc>('pos')
  const [pr, setPr] = useState<Prob>(newProb)
  const [g, setG] = useState(50)
  const [done, setDone] = useState(false)
  const [auto, setAuto] = useState(true)
  const [hist, setHist] = useState<Record<Enc, number[]>>({ pos: [], len: [], angle: [], area: [], shade: [] })
  const err = Math.abs(g - pr.p)
  const submit = () => { setDone(true); setHist(h => ({ ...h, [enc]: [...h[enc], err] })) }
  const next = () => {
    if (auto) setEnc(e => ENCS[(ENCS.findIndex(x => x[0] === e) + 1) % ENCS.length][0])
    setPr(newProb()); setG(50); setDone(false)
  }
  const pick = (e: Enc) => { setEnc(e); setPr(newProb()); setG(50); setDone(false) }
  const maxErr = Math.max(10, ...ENCS.map(([e]) => mean(hist[e])))
  const total = ENCS.reduce((n, [e]) => n + hist[e].length, 0)
  return (
    <div className="cx-cm">
      <div className="cx-cm-ctl">
        <Seg value={enc} onChange={pick} options={ENCS} />
        <label className="cx-check"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />다음 문제는 다음 방식으로</label>
      </div>
      <div className="cx-cm-body">
        <div className="cx-cm-q">
          <EncView enc={enc} pr={pr} />
          <SliderRow label="B는 A의 몇 %일까요?" value={g} unit="%">
            <Range value={g} min={1} max={100} onChange={v => { if (!done) setG(v) }} label="B는 A의 몇 퍼센트" />
          </SliderRow>
          <div className="cx-cm-act">
            {!done ? <button type="button" className="btn sm" onClick={submit}>확인</button> : <button type="button" className="btn sm" onClick={next}>다음 문제</button>}
            <span role="status">{done && <>정답 <b>{pr.p}%</b> · 내 답 {g}% · 오차 <b className={err <= 5 ? 'ok' : err >= 15 ? 'no' : ''}>{err}%p</b></>}</span>
          </div>
        </div>
        <div className="cx-cm-sum">
          <h4>방식별 평균 오차 <small className="muted">{total}문제</small></h4>
          {ENCS.map(([e, n], i) => {
            const h = hist[e], m = mean(h)
            return (
              <div key={e} className={'cx-cm-row' + (e === enc ? ' cur' : '')}>
                <span className="rk">{i + 1}</span>
                <span className="nm">{n}</span>
                <span className="bar"><i style={{ width: (m / maxErr) * 100 + '%' }} /></span>
                <b>{h.length ? m.toFixed(1) + '%p' : '–'}</b>
              </div>
            )
          })}
          <p className="muted">왼쪽 숫자는 Cleveland & McGill이 정리한 정확도 순서예요. 몇 문제씩 풀고 내 오차와 비교해 보세요.</p>
        </div>
      </div>
    </div>
  )
}

/* ================= 3. 추세 ================= */
function TrendDemo() {
  const [rate, setRate] = useState(4)
  const [ly, setLy] = useState({ band: true, arrow: true, fc: true, alarm: true })
  const tg = (k: keyof typeof ly) => setLy(s => ({ ...s, [k]: !s[k] }))
  const now = 72
  const pts = useMemo(() => {
    const r = rng(5)
    return Array.from({ length: 25 }, (_, i) => +(now - rate * (2 - i / 12) + (i === 24 ? 0 : (r() - 0.5) * 0.9)).toFixed(2))
  }, [rate])
  // 최근 30분(7점) 선형 회귀 → 시간당 기울기
  const slope = useMemo(() => {
    const ys = pts.slice(-7), xs = ys.map((_, i) => i / 12)
    const mx = mean(xs), my = mean(ys)
    const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0), den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
    return num / den
  }, [pts])
  const reachH = slope > 0.2 ? (90 - now) / slope : Infinity
  const W = 640, H = 240, X0 = 44, X1 = 624, Y0 = 16, Y1 = 208
  const tx = (h: number) => X0 + ((h + 2) / 8) * (X1 - X0) // -2h ~ +6h
  const ty = (v: number) => Y1 - ((v - 40) / 60) * (Y1 - Y0) // 40 ~ 100℃
  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${tx(-2 + i / 12).toFixed(1)},${ty(v).toFixed(1)}`).join('')
  const fcEnd = Math.min(6, Number.isFinite(reachH) ? reachH : 6)
  const hm = (h: number) => { const m = Math.round(h * 60); return m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ' ' + (m % 60) + '분' : ''}` : `${m}분` }
  const arrowDeg = Math.max(-80, Math.min(80, -slope * 10))
  const word = Math.abs(slope) < 1 ? '거의 그대로' : slope < 3 ? '천천히 오름' : '빠르게 오름'

  return (
    <div className="cx-trend">
      <div className="cx-trend-ctl">
        <SliderRow label="상승 속도 (가정)" value={rate.toFixed(1)} unit="℃/시간">
          <Range value={rate} min={0} max={10} step={0.5} onChange={setRate} label="상승 속도" />
        </SliderRow>
        <div className="cx-chips">
          {([['band', '정상 범위 띠'], ['alarm', '경보선 90℃'], ['fc', '예측선'], ['arrow', '기울기 화살표']] as const).map(([k, n]) => (
            <button key={k} type="button" className="chip" aria-pressed={ly[k]} onClick={() => tg(k)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="cx-trend-body">
        <svg viewBox={`0 0 ${W} ${H}`} className="cx-trend-svg" role="img" aria-label={`강변 변전소 주변압기 유온 추세. 현재 72℃, 시간당 ${slope.toFixed(1)}℃ ${Number.isFinite(reachH) ? `, 약 ${hm(reachH)} 뒤 90℃ 도달 예상` : ''}`}>
          {ly.band && <rect x={X0} width={X1 - X0} y={ty(75)} height={ty(40) - ty(75)} className="band" />}
          {[40, 60, 80, 100].map(v => <g key={v}><line x1={X0} x2={X1} y1={ty(v)} y2={ty(v)} className="grid" /><text x={X0 - 8} y={ty(v) + 4} textAnchor="end" className="tk">{v}</text></g>)}
          {[-2, 0, 2, 4, 6].map(h => <text key={h} x={tx(h)} y={H - 10} textAnchor="middle" className="tk">{h === 0 ? '지금' : (h > 0 ? '+' : '') + h + '시간'}</text>)}
          {ly.alarm && <><line x1={X0} x2={X1} y1={ty(90)} y2={ty(90)} className="alarm" /><text x={X0 + 6} y={ty(90) - 6} className="tk al">경보 90℃</text></>}
          <line x1={tx(0)} x2={tx(0)} y1={Y0} y2={Y1} className="now" />
          <path d={path} className="ln" />
          {ly.fc && slope > 0.2 && <line x1={tx(0)} y1={ty(now)} x2={tx(fcEnd)} y2={ty(now + slope * fcEnd)} className="fc" />}
          {ly.fc && Number.isFinite(reachH) && reachH <= 6 && <><circle cx={tx(reachH)} cy={ty(90)} r="5" className="hit" /><text x={tx(reachH)} y={ty(90) + 20} textAnchor="middle" className="tk hitx">약 {hm(reachH)} 뒤</text></>}
          <circle cx={tx(0)} cy={ty(now)} r="4.5" className="dot" />
        </svg>
        <div className="cx-trend-tiles">
          <div className="cx-mini">
            <span className="muted">숫자만</span>
            <b className="cx-mini-v">72<small>℃</small></b>
            <span className="cx-mini-s">정상 범위 안. 아무 일 없어 보여요.</span>
          </div>
          <div className="cx-mini">
            <span className="muted">숫자 + 추세</span>
            <span className="cx-mini-row">
              <b className="cx-mini-v">72<small>℃</small></b>
              {ly.arrow && <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="cx-arrow" style={{ transform: `rotate(${arrowDeg}deg)` }}><path d="M4 17h22M19 9l8 8-8 8" /></svg>}
            </span>
            <span className="cx-mini-s"><b>{slope >= 0 ? '+' : ''}{slope.toFixed(1)}℃/시간 · {word}</b>{Number.isFinite(reachH) ? <> 이대로면 약 {hm(reachH)} 뒤 90℃</> : <> 경보선에 다가가지 않아요</>}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================= 4. 비교 기준 ================= */
const NOW_I = 56 // 14:00 (15분 간격)
function shiftTo(a: number[], i: number, v: number) { const d = v - a[i]; return a.map(x => +(x + d).toFixed(1)) }
function CompareDemo() {
  const [base, setBase] = useState<'none' | 'yday' | 'season'>('yday')
  const [lim, setLim] = useState({ hi: true, al: false })
  const today = useMemo(() => shiftTo(series(41, 96, 64, 15, 2.4), NOW_I, 83).slice(0, NOW_I + 1), [])
  const yday = useMemo(() => shiftTo(series(42, 96, 62, 14, 2.4), NOW_I, 74), [])
  const season = useMemo(() => shiftTo(series(43, 96, 60, 13, 0.6), NOW_I, 70), [])
  const W = 640, H = 220, X0 = 40, X1 = 624, Y0 = 12, Y1 = 188
  const tx = (i: number) => X0 + (i / 95) * (X1 - X0)
  const ty = (v: number) => Y1 - ((v - 20) / 90) * (Y1 - Y0) // 20 ~ 110%
  const d = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${tx(i).toFixed(1)},${ty(v).toFixed(1)}`).join('')
  const ref = base === 'yday' ? yday : base === 'season' ? season : null
  const refName = base === 'yday' ? '어제 같은 시각' : '이번 계절 같은 시각 평균'
  const diff = ref ? 83 - ref[NOW_I] : 0
  return (
    <div className="cx-cmp">
      <div className="cx-cmp-ctl">
        <Seg value={base} onChange={setBase} options={[['none', '비교 없음'], ['yday', '어제'], ['season', '계절 평균']] as const} />
        <div className="cx-chips">
          <button type="button" className="chip" aria-pressed={lim.hi} onClick={() => setLim(l => ({ ...l, hi: !l.hi }))}>정상 상한 80%</button>
          <button type="button" className="chip" aria-pressed={lim.al} onClick={() => setLim(l => ({ ...l, al: !l.al }))}>경보 95%</button>
        </div>
      </div>
      <div className="cx-cmp-head">
        <span className="muted">강변 1선 부하율</span>
        <b>83%</b>
        <span>{ref ? <>{refName} {Math.round(ref[NOW_I])}%보다 <b>{diff >= 0 ? '+' : ''}{Math.round(diff)}%p</b></> : '비교할 기준이 없어서 높은지 낮은지 말하기 어려워요'}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="cx-cmp-svg" role="img" aria-label="강변 1선 오늘 부하율 곡선과 비교 기준">
        {[20, 50, 80, 110].map(v => <g key={v}><line x1={X0} x2={X1} y1={ty(v)} y2={ty(v)} className="grid" /><text x={X0 - 6} y={ty(v) + 4} textAnchor="end" className="tk">{v}</text></g>)}
        {[0, 24, 48, 72, 95].map(i => <text key={i} x={tx(i)} y={H - 8} textAnchor="middle" className="tk">{i === 95 ? '24시' : `${i / 4}시`}</text>)}
        {lim.hi && <><line x1={X0} x2={X1} y1={ty(80)} y2={ty(80)} className="lim" /><text x={X1} y={ty(80) - 5} textAnchor="end" className="tk">정상 상한</text></>}
        {lim.al && <><line x1={X0} x2={X1} y1={ty(95)} y2={ty(95)} className="lim al" /><text x={X1} y={ty(95) - 5} textAnchor="end" className="tk">경보</text></>}
        {ref && <path d={d(ref)} className={'ref ' + base} />}
        <path d={d(today)} className="today" />
        <line x1={tx(NOW_I)} x2={tx(NOW_I)} y1={Y0} y2={Y1} className="now" />
        {ref && <line x1={tx(NOW_I)} x2={tx(NOW_I)} y1={ty(83)} y2={ty(ref[NOW_I])} className="gap" />}
        <circle cx={tx(NOW_I)} cy={ty(83)} r="4.5" className="dot" />
        <text x={tx(NOW_I) + 8} y={ty(83) - 6} className="tk now-t">14:00</text>
      </svg>
      <div className="cx-cmp-key"><span><i className="k today" />오늘</span>{ref && <span><i className={'k ref ' + base} />{base === 'yday' ? '어제' : '계절 평균'}</span>}</div>
    </div>
  )
}

/* ================= 5. 숫자 표기 ================= */
function TabularDemo() {
  const [tab, setTab] = useState(true)
  const [run, setRun] = useState(true)
  const [vals, setVals] = useState(() => FEEDERS.map(f => f.load + 0.4))
  const ref = useVisibleInterval(() => setVals(v => v.map(x => +(Math.max(11, Math.min(99, x + (Math.random() - 0.5) * 14))).toFixed(1))), 1000, run)
  return (
    <div className="cx-tab" ref={ref}>
      <div className="cx-tab-ctl">
        <Seg value={tab ? 'y' : 'n'} onChange={v => setTab(v === 'y')} options={[['n', '기본 숫자'], ['y', '고정폭 숫자']] as const} />
        <button type="button" className="btn sm ghost" onClick={() => setRun(r => !r)}>{run ? '갱신 멈추기' : '갱신 다시 시작'}</button>
      </div>
      <ul className={'cx-tab-list' + (tab ? ' tnum' : '')}>
        {FEEDERS.map((f, i) => <li key={f.id}><span>{f.name}</span><b>{vals[i].toFixed(1)}<small>%</small></b></li>)}
      </ul>
    </div>
  )
}

type FK = 'load' | 'kv' | 'temp' | 'kw'
const FMT: Record<FK, { name: string; unit: string; dig: number; why: string }> = {
  load: { name: '부하율', unit: '%', dig: 0, why: '1% 차이로 판단이 바뀌지 않아요. 정수면 충분해요.' },
  kv: { name: '전압', unit: 'kV', dig: 1, why: '정상 범위 폭이 1kV 정도라 소수 첫째 자리까지 의미가 있어요.' },
  temp: { name: '변압기 유온', unit: '℃', dig: 0, why: '1℃ 아래는 센서 오차 수준이에요.' },
  kw: { name: '유효전력', unit: 'kW', dig: 0, why: '큰 수는 천 단위 쉼표로 끊어 읽게 해요.' },
}
function Formatter() {
  const [k, setK] = useState<FK>('kv')
  const [raw, setRaw] = useState('22.4587')
  const n = Number(raw.replace(/,/g, ''))
  const ok = raw.trim() !== '' && Number.isFinite(n)
  const out = ok ? new Intl.NumberFormat('ko-KR', { minimumFractionDigits: FMT[k].dig, maximumFractionDigits: FMT[k].dig }).format(n) + FMT[k].unit : '–'
  return (
    <div className="cx-fmt">
      <Seg value={k} onChange={v => { setK(v); setRaw(v === 'kv' ? '22.4587' : v === 'load' ? '83.2941' : v === 'temp' ? '71.86' : '12345.678') }} options={(Object.keys(FMT) as FK[]).map(x => [x, FMT[x].name] as const)} />
      <div className="cx-fmt-row">
        <label><span className="muted">장비에서 온 값</span><input value={raw} onChange={e => setRaw(e.target.value)} inputMode="decimal" aria-label="장비에서 온 값" /></label>
        <span className="cx-fmt-arrow" aria-hidden="true">→</span>
        <div><span className="muted">화면에 쓰는 값</span><output className="cx-fmt-out">{out}</output></div>
      </div>
      <p className="cx-fmt-why">{ok ? FMT[k].why : '값이 없을 때는 0이 아니라 – 로 보여줘요. 0은 "측정했더니 0"이라는 뜻이 돼요.'}</p>
    </div>
  )
}

/* ================= 6. 게이지 vs 막대 ================= */
function useArea() {
  const ref = useRef<HTMLDivElement>(null)
  const [a, setA] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setA(el.offsetWidth * el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, a] as const
}
function Gauge({ v, name }: { v: number; name: string }) {
  const ang = (x: number) => Math.PI * (1 - x / 120)
  const pt = (x: number, r: number) => [60 + r * Math.cos(ang(x)), 62 - r * Math.sin(ang(x))]
  const arc = (a: number, b: number) => { const [x1, y1] = pt(a, 48), [x2, y2] = pt(b, 48); return `M${x1},${y1}A48,48 0 0 1 ${x2},${y2}` }
  const [nx, ny] = pt(v, 40)
  return (
    <figure className="cx-gauge">
      <svg viewBox="0 0 120 74" aria-hidden="true">
        <path d={arc(0, 80)} className="z1" /><path d={arc(80, 95)} className="z2" /><path d={arc(95, 120)} className="z3" />
        <line x1="60" y1="62" x2={nx} y2={ny} className="nd" /><circle cx="60" cy="62" r="4" className="hub" />
      </svg>
      <figcaption>{name}<b>{v}%</b></figcaption>
    </figure>
  )
}
function GaugeVsBar() {
  const [gRef, gA] = useArea()
  const [bRef, bA] = useArea()
  const k = (a: number) => (a / 10000).toFixed(1)
  return (
    <div className="cx-gvb">
      <div className="cx-gvb-col">
        <h4>게이지 9개 <small className="muted">{gA ? `${k(gA)}만 px² 차지` : ''}</small></h4>
        <div ref={gRef} className="cx-gauges">{FEEDERS.map(f => <Gauge key={f.id} v={f.load} name={f.name} />)}</div>
        <p className="muted">현재 값 하나만 보여줘요. 초록·노랑·빨강 구역이 정상 상태까지 색으로 칠해요.</p>
      </div>
      <div className="cx-gvb-col">
        <h4>아날로그 막대 + 추세 9줄 <small className="muted">{bA ? `${k(bA)}만 px² 차지` : ''}</small></h4>
        <div ref={bRef} className="cx-bars">
          {FEEDERS.map((f, i) => (
            <div key={f.id} className="cx-bars-row">
              <span className="nm">{f.name}</span>
              <AnalogBar value={f.load} min={0} max={120} normal={[30, 80]} alarm={[0, 95]} unit="%" name={f.name + ' 부하율'} w={120} />
              <Sparkline data={series(60 + i, 24, f.load - 4, 5, 2).map((v, j, a) => +(v + (j === a.length - 1 ? f.load - v : 0)).toFixed(1))} w={70} h={20} min={f.load - 25} max={f.load + 25} band={[30, 80]} />
              <b className={isOut('load', f.load) ? 'out' : ''}>{f.load}%</b>
            </div>
          ))}
        </div>
        <p className="muted">정상 범위, 범위 밖 여부, 최근 추세까지 보여주는데 면적은 {gA && bA ? <b>{(gA / bA).toFixed(1)}분의 1</b> : '훨씬 작아요'}이에요.</p>
      </div>
    </div>
  )
}

/* ================= 체크리스트 · 코드 ================= */
function CheckList({ items }: { items: string[] }) {
  const [on, setOn] = useState<boolean[]>(() => items.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <div className="cx-checklist">
      <div className="top"><span>값 하나를 화면에 올리기 전에</span><b className={n === items.length ? 'ok' : ''}>{n} / {items.length}</b></div>
      <ul>{items.map((q, i) => <li key={i}><label><input type="checkbox" checked={on[i]} onChange={() => setOn(a => a.map((v, j) => (j === i ? !v : v)))} /><span>{q}</span></label></li>)}</ul>
    </div>
  )
}

const CODE = `// 측정값 하나를 '맥락이 붙은 값'으로 만드는 함수
type Status = 'normal' | 'out' | 'alarm'
interface Spec { unit: string; digits: number; normal: [number, number]; alarm: [number, number] }

const SPEC: Record<'load' | 'kv' | 'temp', Spec> = {
  load: { unit: '%', digits: 0, normal: [30, 80], alarm: [0, 95] },
  kv: { unit: 'kV', digits: 1, normal: [22.4, 23.4], alarm: [22.0, 23.8] },
  temp: { unit: '℃', digits: 0, normal: [30, 75], alarm: [0, 90] },
}

export function describe(kind: keyof typeof SPEC, value: number | null, history: number[]) {
  const s = SPEC[kind]
  if (value === null || !Number.isFinite(value)) return { text: '–', status: 'normal' as Status, trend: null }
  const nf = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: s.digits, maximumFractionDigits: s.digits })
  const status: Status =
    value < s.alarm[0] || value > s.alarm[1] ? 'alarm'
    : value < s.normal[0] || value > s.normal[1] ? 'out' : 'normal'
  // 최근 n개 점의 기울기(단위/점) — 화살표 방향과 '이대로면' 예측에 써요
  const n = history.length
  const mx = (n - 1) / 2, my = history.reduce((a, b) => a + b, 0) / n
  const slope = history.reduce((a, y, i) => a + (i - mx) * (y - my), 0) /
                history.reduce((a, _, i) => a + (i - mx) ** 2, 0)
  return { text: nf.format(value) + s.unit, status, trend: slope }
}

/* CSS: 숫자 열은 고정폭 + 오른쪽 정렬
.value { font-variant-numeric: tabular-nums; text-align: right; } */`

/* ================= 탭 ================= */
function Rule({ a, b, c }: { a: ReactNode; b: ReactNode; c: ReactNode }) {
  return <tr><td>{a}</td><td className="bad">{b}</td><td className="good">{c}</td></tr>
}

export default function Tab() {
  return (
    <div data-dash="context">
      <SysGrid>
        <Section id="dash-context-why" wide title="83이라는 숫자만으로는 아무것도 알 수 없어요" desc="숫자는 질문을 하나도 답해 주지 않아요. 무엇을 잰 값인지, 괜찮은 건지, 어디로 가고 있는지는 맥락이 붙어야 읽혀요. 맥락을 하나씩 켜 보세요.">
          <ContextBuilder />
          <Finding src={<>Few, Information Dashboard Design (2006) 요약 <Cite n={1} /> · Endsley (1995) 상황 인식 3단계 요약 <Cite n={3} /></>}>
            값은 비교 대상이 있을 때 의미가 생겨요. 운영자는 값을 보고(지각) → 뜻을 알고(이해) → 앞을 내다봐요(예측). 화면이 이 세 단계를 대신 해 줄수록 판단이 빨라져요.
          </Finding>
          <Note>칩 옆의 작은 글자는 Endsley의 상황 인식 단계예요. 이 탭의 선로 이름과 수치는 설명을 위한 가상 예시예요.</Note>
        </Section>

        <Section id="dash-context-three" wide title="같은 27개 값, 세 가지 표시" desc="9개 선로 × 부하율·전압·유온이에요. 표시 방식을 고르고 시작을 누르면 정상 범위를 벗어난 값의 개수를 세는 문제가 나와요. 세 방식으로 몇 번씩 풀어 보세요.">
          <ThreeViews />
          <Note tone="tip"><b>색은 '범위 밖인지'만 알려줘요.</b> 얼마나 벗어났는지, 경계 바로 안쪽에 있는 값은 무엇인지, 어느 쪽으로 움직이는지는 아날로그 막대와 추세선이 알려줘요. 고성능 HMI 기법에서 숫자 대신 정상·경보 범위가 그려진 막대 위에 현재 값 화살표를 두는 이유예요 <Cite n={4} /><Cite n={5} />.</Note>
        </Section>

        <Section id="dash-context-cm" wide title="눈은 무엇을 가장 정확하게 읽을까" desc="두 값 A와 B를 다섯 가지 방식으로 그렸어요. B가 A의 몇 %인지 맞혀 보세요. 오차가 방식마다 어떻게 다른지 쌓여요.">
          <CMDemo />
          <Finding src={<>Cleveland & McGill (1984) Graphical Perception 요약 <Cite n={2} /></>}>
            사람은 공통 축 위의 위치를 가장 정확하게 읽고, 그다음 길이, 각도·기울기, 면적, 부피·색 농도 순으로 부정확해져요.
          </Finding>
          <Note>관제 화면에 옮기면 이렇게 돼요. 같은 축 위의 위치(아날로그 막대의 화살표, 추세선)는 정확하게 비교되고, 원 크기나 색 진하기로 부하를 표현하면 대충만 읽혀요. 정확한 비교가 필요한 값은 위치로 그려요.</Note>
        </Section>

        <Section id="dash-context-trend" wide title="지금 값보다 방향과 속도" desc="강변 변전소 주변압기 유온이 72℃예요. 정상 범위(30~75℃) 안이라 숫자만 보면 아무 일 없어요. 그런데 천천히 오르는 중이라면요? 상승 속도를 바꿔 보세요.">
          <TrendDemo />
          <Note>예측선은 최근 30분 값으로 그은 직선이에요. 실제 유온은 부하와 바깥 기온에 따라 달라져서, 예측에는 꼭 <b>"이대로면"</b>이라는 조건을 붙여 보여줘요. Endsley의 3단계 중 '예측'을 화면이 도와주는 방법이에요 <Cite n={3} />. 화살표를 몇 단계로 나눌지(거의 그대로 · 천천히 · 빠르게)와 그 기준값은 운영 부서와 함께 정해요.</Note>
        </Section>

        <Section id="dash-context-compare" title="무엇과 비교할까 — 기준선과 비교 기준" desc="83%가 높은지는 무엇과 비교하느냐에 달려 있어요. 비교 기준을 바꿔 보세요.">
          <CompareDemo />
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th>비교 기준</th><th>언제 쓰나</th><th>주의할 점</th></tr></thead>
              <tbody>
                <tr><td>정상 범위 · 경보값</td><td>항상. 가장 기본이에요.</td><td>기준값이 바뀌면 화면도 같이 바뀌게 한 곳에서 관리해요.</td></tr>
                <tr><td>어제 같은 시각</td><td>하루 주기로 출렁이는 부하</td><td>어제가 휴일이면 비교가 틀어져요. 같은 요일과 비교하기도 해요.</td></tr>
                <tr><td>계절 평균</td><td>여름·겨울 피크처럼 계절 영향이 큰 값</td><td>평균은 들쭉날쭉함을 지워요. 범위(최소~최대)를 같이 보여주면 좋아요.</td></tr>
                <tr><td>계획값 · 목표</td><td>운전 계획이 있는 설비</td><td>계획을 누가 언제 바꿨는지 기록이 있어야 해요.</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="dash-context-num" title="단위와 자릿수 — 숫자를 읽기 쉽게" desc="관제 화면의 숫자는 한 번 보고 바로 읽혀야 해요. 계속 바뀌는 숫자는 특히 그래요.">
          <TabularDemo />
          <Formatter />
          <div className="sys-table-wrap">
            <table className="sys-table cx-rules">
              <thead><tr><th>규칙</th><th>이렇게 말고</th><th>이렇게</th></tr></thead>
              <tbody>
                <Rule a="단위는 숫자에 붙여 함께 읽혀요" b="22.9 (단위는 열 제목에만)" c="22.9kV" />
                <Rule a="의미 있는 자릿수만" b="83.2941%" c="83%" />
                <Rule a="같은 열은 소수 자리를 맞춰요" b="22.5 / 22.75 / 23" c="22.5 / 22.8 / 23.0" />
                <Rule a="큰 수는 천 단위 쉼표" b="12345kW" c="12,345kW" />
                <Rule a="비율의 차이는 %p(퍼센트포인트)" b="부하율 9% 증가 (74%→83%)" c="+9%p (74% → 83%)" />
                <Rule a="시각은 24시간제" b="오후 2:00" c="14:00" />
                <Rule a="값이 없으면 0이 아니라 –" b="0.0kV (통신 두절)" c="– 통신 두절" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="dash-context-gauge" wide title="나쁜 예 — 속도계 모양 게이지" desc="게이지는 계기판처럼 보여서 관제 화면에 자주 쓰여요. 그런데 화면을 많이 차지하는 데 비해 알려주는 것이 적어요. 아래 면적은 이 화면에서 실제로 잰 값이에요.">
          <GaugeVsBar />
          <Finding src={<>Few, Information Dashboard Design 요약 <Cite n={1} /></>}>
            게이지는 공간을 많이 쓰면서 값 하나만 보여줘요. 한 화면에서 한눈에 봐야 하는 대시보드에서는 막대처럼 작고 비교하기 쉬운 표시가 나아요.
          </Finding>
        </Section>

        <Section id="dash-context-check" title="맥락 점검표" desc="기획서나 화면 리뷰에서 값 하나마다 물어봐요.">
          <CheckList items={[
            '이름과 단위가 값 바로 옆에 붙어 있나요?',
            '정상 범위와 경보값이 화면에 그려져 있나요(숫자로 외우게 하지 않나요)?',
            '방향과 속도가 중요한 값에는 추세나 기울기가 있나요?',
            '비교 기준(어제, 계절, 계획)이 무엇인지 적혀 있나요?',
            '자릿수가 측정 정밀도에 맞고, 같은 열에서 소수 자리가 같나요?',
            '값이 없을 때 0이 아니라 – 와 이유가 보이나요?',
            '게이지 대신 더 작은 막대로 같은 정보를 줄 수 있지 않나요?',
          ]} />
        </Section>

        <Section id="dash-context-code" title="FE · 값에 맥락 붙이기" desc="상태 판정, 자릿수, 기울기를 한 함수에 모아 두면 화면마다 기준이 어긋나지 않아요.">
          <CodeBlock code={CODE} label="TypeScript" maxHeight={420} />
        </Section>

        <Refs items={[
          { kind: 'book', text: 'Few, S., Information Dashboard Design, O’Reilly (2006, 2판 2013)' },
          { kind: 'paper', text: 'Cleveland, W. S. & McGill, R. (1984), Graphical Perception: Theory, Experimentation, and Application to the Development of Graphical Methods, JASA 79(387)' },
          { kind: 'paper', text: 'Endsley, M. R. (1995), Toward a Theory of Situation Awareness in Dynamic Systems, Human Factors 37(1)', url: 'https://en.wikipedia.org/wiki/Situation_awareness' },
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015, Human Machine Interfaces for Process Automation Systems — 고성능 HMI', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'practice', text: 'Inductive Automation, High Performance HMI Techniques — 아날로그 표시(정상·경보 범위 막대 위 현재 값 화살표), 정상 범위 띠 스파크라인 (업체 문서)', url: 'https://docs.inductiveautomation.com/docs/8.1/ignition-modules/vision/common-tasks-in-vision/high-performance-hmitechniques' },
        ]} />
      </SysGrid>
    </div>
  )
}
