/* 09 FE · 구현 — 데이터 전송, 재연결, 대량 시계열 그리기(실측), 업데이트 묶기, 오래 켜 두는 화면, 시간, 접근성 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Range, Seg } from '../../components/ui'
import { download } from '../../system/export'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { SUBSTATIONS, rng, type Pri } from '../data'
import { Cite, Finding, Hmi, PriBadge, Refs, useVisibleInterval } from '../ui'
import './fe.css'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const FEEDERS = SUBSTATIONS.flatMap(s => s.feeders)

/* ================= 1. 데이터 전송 방식 ================= */
type Method = 'poll' | 'long' | 'sse' | 'ws'
const T = 30, OW = 0.18 // 30초 구간, 한 방향 전송 0.18초 (가상)
const EV = [2.1, 2.6, 7.8, 13.0, 13.4, 13.9, 21.5, 27.2]
interface Arrow { a: number; b: number; up: boolean; k: 'req' | 'res' | 'push' | 'hs' | 'msg' }
interface Lane { arrows: Arrow[]; got: { e: number; at: number }[]; reqs: number; conn: boolean }
function simulate(m: Method): Lane {
  const arrows: Arrow[] = [], got: { e: number; at: number }[] = []
  const left = [...EV]
  const take = (until: number, at: number) => { while (left.length && left[0] <= until) got.push({ e: left.shift()!, at }) }
  if (m === 'poll') {
    let reqs = 0
    for (let t = 0; t < T; t += 5) {
      reqs++; arrows.push({ a: t, b: t + OW, up: true, k: 'req' })
      const s = t + OW; arrows.push({ a: s, b: s + OW, up: false, k: 'res' }); take(s, s + OW)
    }
    return { arrows, got, reqs, conn: false }
  }
  if (m === 'long') {
    let t = 0, reqs = 0
    while (t < T) {
      reqs++; arrows.push({ a: t, b: t + OW, up: true, k: 'req' })
      const s = t + OW
      const r = left.length && left[0] <= s ? s : Math.min(left[0] ?? Infinity, s + 15)
      if (r > T) break
      arrows.push({ a: r, b: r + OW, up: false, k: 'res' }); take(r, r + OW)
      t = r + OW
    }
    return { arrows, got, reqs, conn: false }
  }
  arrows.push({ a: 0, b: OW, up: true, k: 'hs' }, { a: OW, b: 2 * OW, up: false, k: 'hs' })
  for (const e of EV) { arrows.push({ a: e, b: e + OW, up: false, k: 'push' }); got.push({ e, at: e + OW }) }
  if (m === 'ws') arrows.push({ a: 16.2, b: 16.2 + OW, up: true, k: 'msg' })
  return { arrows, got, reqs: 1, conn: true }
}
const METHODS: { id: Method; n: string; d: string }[] = [
  { id: 'poll', n: '폴링 (5초마다)', d: '정해진 간격으로 “새 거 있어요?”' },
  { id: 'long', n: '롱폴링', d: '서버가 새 소식이 생길 때까지 답을 미뤄요' },
  { id: 'sse', n: 'SSE', d: '연결 하나로 서버 → 브라우저 한 방향' },
  { id: 'ws', n: '웹소켓', d: '연결 하나로 양방향' },
]
function Transport() {
  const sims = useMemo(() => Object.fromEntries(METHODS.map(m => [m.id, simulate(m.id)])) as Record<Method, Lane>, [])
  const [now, setNow] = useState(() => (reduced() ? T : 0))
  const [play, setPlay] = useState(false)
  const ref = useVisibleInterval(() => setNow(n => { const v = Math.min(T, n + 0.15); if (v >= T) setPlay(false); return v }), 50, play)
  const W = 1000, X0 = 96, x = (t: number) => X0 + (t / T) * (W - X0 - 14), LH = 78
  return (
    <div className="fe-tr" ref={ref}>
      <div className="fe-row">
        <button type="button" className="btn sm" onClick={() => { if (now >= T) setNow(0); setPlay(p => !p) }}>{play ? '일시정지' : now >= T ? '처음부터 재생' : '재생'}</button>
        <button type="button" className="btn sm ghost" onClick={() => { setPlay(false); setNow(T) }}>끝까지 보기</button>
        <span className="muted">서버에서 생긴 변화 {EV.length}건(●)이 브라우저에 언제 도착하는지 보세요. 시각 {now.toFixed(1)}초</span>
      </div>
      <div className="fe-scroll">
        <svg viewBox={`0 0 ${W} ${METHODS.length * LH + 26}`} className="fe-tr-svg" role="img" aria-label="네 가지 전송 방식의 요청·응답 시간축 비교">
          <defs>
            <marker id="fe-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z" className="ah" /></marker>
          </defs>
          {METHODS.map((m, li) => {
            const top = li * LH + 6, cy = top + 16, sy = top + 58, L = sims[m.id]
            return (
              <g key={m.id}>
                <text className="ln-n" x={6} y={top + 12}>{m.n}</text>
                <text className="ln-s" x={6} y={cy + 14}>브라우저</text>
                <text className="ln-s" x={6} y={sy + 4}>서버</text>
                <line className={'lane' + (L.conn && now > 2 * OW ? ' conn' : '')} x1={X0} x2={W - 14} y1={cy} y2={cy} />
                <line className="lane" x1={X0} x2={W - 14} y1={sy} y2={sy} />
                {L.conn && now > 2 * OW && <rect className="pipe" x={x(2 * OW)} y={cy + 4} width={Math.max(0, x(now) - x(2 * OW))} height={sy - cy - 8} />}
                {L.arrows.filter(a => a.a <= now).map((a, i) => {
                  const f = Math.min(1, (now - a.a) / (a.b - a.a))
                  const y1 = a.up ? cy : sy, y2 = a.up ? sy : cy
                  return <line key={i} className={'ar k-' + a.k} x1={x(a.a)} y1={y1} x2={x(a.a) + (x(a.b) - x(a.a)) * f} y2={y1 + (y2 - y1) * f} markerEnd={f >= 1 ? 'url(#fe-ah)' : undefined} />
                })}
                {EV.map(e => {
                  const g = L.got.find(v => v.e === e), done = g && g.at <= now
                  return e <= now ? <g key={e}>
                    <circle className={'ev' + (done ? ' done' : '')} cx={x(e)} cy={sy} r={4.5} />
                    {done && <line className="lat" x1={x(e)} x2={x(g!.at)} y1={sy + 9} y2={sy + 9} />}
                  </g> : null
                })}
                {m.id === 'ws' && now > 16.2 && <text className="ln-s" x={x(16.2) + 6} y={cy + 30}>확인(ack)도 같은 연결로</text>}
              </g>
            )
          })}
          {[0, 5, 10, 15, 20, 25, 30].map(t => <text key={t} className="ax" x={x(t)} y={METHODS.length * LH + 20} textAnchor="middle">{t}초</text>)}
          <line className="now" x1={x(now)} x2={x(now)} y1={2} y2={METHODS.length * LH + 6} />
        </svg>
      </div>
      <div className="fe-tr-stats">
        {METHODS.map(m => {
          const L = sims[m.id], ds = L.got.map(g => g.at - g.e)
          const avg = ds.reduce((a, b) => a + b, 0) / ds.length, mx = Math.max(...ds)
          return (
            <div key={m.id}><b>{m.n}</b><span>HTTP 요청 <b>{L.reqs}</b>번</span><span>평균 지연 <b>{avg.toFixed(1)}초</b> · 최대 <b>{mx.toFixed(1)}초</b></span><small>{m.d}</small></div>
          )
        })}
      </div>
    </div>
  )
}

/* ================= 2. 재연결: 지수 백오프 + 지터 ================= */
type Strat = 'fixed' | 'exp' | 'jitter'
const STRAT_N: Record<Strat, string> = { fixed: '1초마다 고정', exp: '지수 백오프', jitter: '지수 백오프 + 지터' }
function herd(st: Strat, down: number) {
  const r = rng(77), N = 40, H = 60
  const rows: number[][] = []
  let total = 0, lastOk = 0
  for (let c = 0; c < N; c++) {
    let t = r() * 0.4, n = 0
    const at: number[] = []
    while (t < H) {
      const base = Math.min(30, 2 ** n)
      t += st === 'fixed' ? 1 : st === 'exp' ? base : r() * base
      at.push(t); total++; n++
      if (t >= down) { lastOk = Math.max(lastOk, t); break }
    }
    rows.push(at)
  }
  const bins = new Array(H).fill(0)
  rows.flat().forEach(t => { if (t < H) bins[Math.floor(t)]++ })
  return { rows, bins, total, peak: Math.max(...bins), lastOk }
}
function Herd() {
  const [st, setSt] = useState<Strat>('exp')
  const [down, setDown] = useState(20)
  const h = useMemo(() => herd(st, down), [st, down])
  const W = 1000, X0 = 40, x = (t: number) => X0 + (t / 60) * (W - X0 - 10)
  const bmax = Math.max(40, h.peak)
  return (
    <div className="fe-herd">
      <div className="fe-row">
        <Seg value={st} onChange={setSt} options={(Object.keys(STRAT_N) as Strat[]).map(k => [k, STRAT_N[k]] as const)} />
        <label className="fe-inline">서버 장애 시간 <b>{down}초</b><Range value={down} min={5} max={45} onChange={setDown} label="서버 장애 시간" style={{ width: 160 }} /></label>
      </div>
      <div className="fe-scroll">
        <svg viewBox={`0 0 ${W} 300`} className="fe-herd-svg" role="img" aria-label={`관제 화면 40대의 재접속 시도. 총 ${h.total}번, 가장 붐빈 1초에 ${h.peak}번.`}>
          <rect className="down" x={x(0)} y={4} width={x(down) - x(0)} height={176} />
          <text className="ax" x={x(down / 2)} y={18} textAnchor="middle">서버 장애</text>
          {h.rows.map((row, c) => row.map((t, i) => t < 60 && <circle key={c + '-' + i} className={'try' + (t >= down ? ' ok' : '')} cx={x(t)} cy={26 + c * 3.8} r={t >= down ? 2.6 : 1.8} />))}
          {h.bins.map((v, i) => <rect key={i} className={'bin' + (i === Math.floor(down) ? ' rec' : '')} x={x(i) + 1} width={Math.max(1, x(1) - x(0) - 2)} y={290 - (v / bmax) * 96} height={(v / bmax) * 96} />)}
          <line className="axl" x1={X0} x2={W - 10} y1={290} y2={290} />
          {[0, 10, 20, 30, 40, 50, 60].map(t => <text key={t} className="ax" x={x(t)} y={300} textAnchor="middle">{t}초</text>)}
          <text className="ax" x={4} y={200}>1초당</text><text className="ax" x={4} y={212}>시도</text>
        </svg>
      </div>
      <div className="fe-kv" aria-live="polite">
        <span>총 재접속 시도 <b>{h.total}번</b></span>
        <span>가장 붐빈 1초 <b>{h.peak}번</b></span>
        <span>모두 다시 붙은 시각 <b>{h.lastOk.toFixed(1)}초</b></span>
      </div>
      <p className="fe-p">{st === 'fixed' ? '고정 간격은 장애 내내 서버를 두드려요. 화면이 수백 대면 복구 직후 서버가 다시 넘어질 수 있어요.'
        : st === 'exp' ? '간격을 두 배씩 늘리면 시도 수는 줄지만, 같은 시각에 끊긴 화면들이 같은 시각에 다시 몰려요(세로 줄무늬).'
        : '간격에 무작위(지터)를 섞으면 몰림이 흩어져요. 시도 수도 적고, 가장 붐빈 1초도 낮아요.'}</p>
    </div>
  )
}

interface Pt { seq: number; v: number; late?: boolean }
const valAt = (seq: number) => { const r = rng(seq * 9301 + 49297); return +(68 + Math.sin(seq / 7) * 6 + (r() - 0.5) * 3).toFixed(1) }
function LiveReconnect() {
  const [on, setOn] = useState(true)
  const [resync, setResync] = useState(true)
  const s = useRef({ t: 60, downUntil: 0, conn: true, attempt: 0, nextAt: 0, lastSeq: 60, data: Array.from({ length: 60 }, (_, i) => ({ seq: i + 1, v: valAt(i + 1) })) as Pt[], log: [] as string[], r: rng(42) })
  const [, force] = useState(0)
  const delay = (n: number) => { const d = Math.min(16, 2 ** n); return d / 2 + s.current.r() * (d / 2) }
  const ref = useVisibleInterval(() => {
    const c = s.current
    c.t += 0.25
    const up = c.t >= c.downUntil, seqNow = Math.floor(c.t)
    const log = (m: string) => { c.log = [`${seqNow.toString().padStart(4, '0')}  ${m}`, ...c.log].slice(0, 6) }
    if (c.conn) {
      if (!up) { c.conn = false; c.attempt = 0; c.nextAt = c.t + delay(0); log(`연결 끊김 감지 · 재시도 #1 ${(c.nextAt - c.t).toFixed(1)}초 뒤`) }
      else if (seqNow > c.lastSeq) { c.data.push({ seq: seqNow, v: valAt(seqNow) }); c.lastSeq = seqNow }
    } else if (c.t >= c.nextAt) {
      if (up) {
        const missed = seqNow - c.lastSeq - 1
        if (resync && missed > 0) {
          for (let q = c.lastSeq + 1; q < seqNow; q++) c.data.push({ seq: q, v: valAt(q), late: true })
          log(`연결됨 · since=${c.lastSeq} 요청 → 놓친 ${missed}개 받음`)
        } else log(missed > 0 ? `연결됨 · 놓친 ${missed}개는 비어 있음` : '연결됨')
        c.data.push({ seq: seqNow, v: valAt(seqNow) }); c.lastSeq = seqNow; c.conn = true
      } else { c.attempt++; c.nextAt = c.t + delay(c.attempt); log(`재시도 #${c.attempt} 실패 · 다음 ${(c.nextAt - c.t).toFixed(1)}초 뒤`) }
    }
    c.data = c.data.filter(p => p.seq > seqNow - 60) // 최근 60초만 (링버퍼처럼)
    force(v => v + 1)
  }, 250, on)
  const c = s.current, seqNow = Math.floor(c.t)
  const W = 600, H = 150, x = (q: number) => 10 + ((q - (seqNow - 59)) / 59) * (W - 20), y = (v: number) => 10 + (1 - (v - 56) / 24) * (H - 20)
  const sorted = [...c.data].sort((a, b) => a.seq - b.seq)
  let d = ''
  sorted.forEach((p, i) => { d += (i && sorted[i - 1].seq === p.seq - 1 ? 'L' : 'M') + x(p.seq).toFixed(1) + ',' + y(p.v).toFixed(1) })
  return (
    <div className="fe-live" ref={ref}>
      <div className="fe-row">
        <button type="button" className="btn sm" disabled={!c.conn || c.downUntil > c.t} onClick={() => { c.downUntil = c.t + 10; force(v => v + 1) }}>통신 10초 끊기</button>
        <button type="button" className="chip" aria-pressed={resync} onClick={() => setResync(v => !v)}>재연결 후 놓친 구간 다시 받기</button>
        <button type="button" className="btn sm ghost" onClick={() => setOn(v => !v)}>{on ? '시뮬레이션 멈춤' : '다시 시작'}</button>
      </div>
      <Hmi title="강변 1선 부하율 · 최근 60초" right={c.conn ? <>연결됨 · 마지막 seq {c.lastSeq}</> : <b className="fe-bad">끊김 · 재시도 #{c.attempt + 1} {Math.max(0, c.nextAt - c.t).toFixed(1)}초 뒤</b>}>
        <div className="fe-live-grid">
          <svg viewBox={`0 0 ${W} ${H}`} className={'fe-live-svg' + (c.conn ? '' : ' stale')} role="img" aria-label="최근 60초 부하율 추세. 빈 곳은 받지 못한 구간, 속이 빈 점은 재연결 후 다시 받은 값.">
            {!c.conn && <rect className="hatch" x={x(c.lastSeq)} y={0} width={W - x(c.lastSeq)} height={H} />}
            <path className="ln" d={d} />
            {sorted.filter(p => p.late).map(p => <circle key={p.seq} className="late" cx={x(p.seq)} cy={y(p.v)} r={2.6} />)}
          </svg>
          <ol className="fe-log" aria-live="polite">{c.log.length ? c.log.map((l, i) => <li key={i}>{l}</li>) : <li className="muted">‘통신 10초 끊기’를 눌러 보세요</li>}</ol>
        </div>
      </Hmi>
    </div>
  )
}

/* ================= 3. 대량 시계열 그리기 (실측) ================= */
type Rend = 'svg' | 'canvas'
type Ds = 'none' | 'nth' | 'minmax' | 'lttb'
const DS_N: Record<Ds, string> = { none: '원본 그대로', nth: 'n개마다 1개', minmax: '구간별 최소·최대', lttb: 'LTTB' }
const SIZES = [1_000, 10_000, 100_000] as const
const TH = 1600 // 그릴 점 수 목표 ≈ 화면 폭(px) × 2
interface Series { x: Float64Array; y: Float64Array; lo: number; hi: number; spikeAt: number }
const cache = new Map<number, Series>()
function getSeries(n: number): Series {
  const hit = cache.get(n); if (hit) return hit
  const r = rng(n), x = new Float64Array(n), y = new Float64Array(n)
  let drift = 0
  for (let i = 0; i < n; i++) {
    drift = drift * 0.995 + (r() - 0.5) * 0.6
    x[i] = i; y[i] = 62 + Math.sin((i / n) * Math.PI * 4) * 12 + drift + (r() - 0.5) * 3
  }
  const spikeAt = Math.floor(n * 0.618)
  y[spikeAt] += 34; y[spikeAt + 1] += 18 // 고장 순간 짧은 급등
  let lo = Infinity, hi = -Infinity
  for (let i = 0; i < n; i++) { if (y[i] < lo) lo = y[i]; if (y[i] > hi) hi = y[i] }
  const s = { x, y, lo, hi, spikeAt }; cache.set(n, s); return s
}
function nth(s: Series, th: number) {
  const k = Math.ceil(s.x.length / th); if (k <= 1) return { x: s.x, y: s.y }
  const m = Math.ceil(s.x.length / k), x = new Float64Array(m), y = new Float64Array(m)
  for (let i = 0, j = 0; i < s.x.length; i += k, j++) { x[j] = s.x[i]; y[j] = s.y[i] }
  return { x, y }
}
function minmax(s: Series, th: number) {
  const n = s.x.length; if (n <= th) return { x: s.x, y: s.y }
  const b = Math.floor(th / 2), size = n / b, x = new Float64Array(b * 2), y = new Float64Array(b * 2)
  for (let i = 0; i < b; i++) {
    const a = Math.floor(i * size), e = Math.min(n, Math.floor((i + 1) * size))
    let mi = a, ma = a
    for (let j = a; j < e; j++) { if (s.y[j] < s.y[mi]) mi = j; if (s.y[j] > s.y[ma]) ma = j }
    const [p, q] = mi < ma ? [mi, ma] : [ma, mi]
    x[i * 2] = s.x[p]; y[i * 2] = s.y[p]; x[i * 2 + 1] = s.x[q]; y[i * 2 + 1] = s.y[q]
  }
  return { x, y }
}
/** Largest-Triangle-Three-Buckets (Steinarsson 2013) */
function lttb(s: Series, th: number) {
  const { x: xs, y: ys } = s, n = xs.length
  if (th >= n || th < 3) return { x: xs, y: ys }
  const ox = new Float64Array(th), oy = new Float64Array(th), every = (n - 2) / (th - 2)
  let a = 0, k = 1
  ox[0] = xs[0]; oy[0] = ys[0]
  for (let i = 0; i < th - 2; i++) {
    const s0 = Math.floor((i + 1) * every) + 1, e0 = Math.min(Math.floor((i + 2) * every) + 1, n)
    let ax = 0, ay = 0
    for (let j = s0; j < e0; j++) { ax += xs[j]; ay += ys[j] }
    ax /= (e0 - s0) || 1; ay /= (e0 - s0) || 1
    const rs = Math.floor(i * every) + 1, re = Math.floor((i + 1) * every) + 1
    let best = -1, next = rs
    for (let j = rs; j < re; j++) {
      const area = Math.abs((xs[a] - ax) * (ys[j] - ys[a]) - (xs[a] - xs[j]) * (ay - ys[a]))
      if (area > best) { best = area; next = j }
    }
    ox[k] = xs[next]; oy[k] = ys[next]; k++; a = next
  }
  ox[k] = xs[n - 1]; oy[k] = ys[n - 1]
  return { x: ox, y: oy }
}
const DS_FN: Record<Ds, (s: Series, th: number) => { x: Float64Array; y: Float64Array }> = { none: s => ({ x: s.x, y: s.y }), nth, minmax, lttb }
interface Run { n: number; rend: Rend; ds: Ds; pts: number; tDs: number; tDraw: number; tFrame: number; spike: boolean }
const BW = 800, BH = 220
const nextPaint = () => new Promise<void>(res => requestAnimationFrame(() => setTimeout(res, 0)))
const fmtN = (n: number) => n.toLocaleString('ko-KR')

function Bench() {
  const [n, setN] = useState<number>(10_000)
  const [rend, setRend] = useState<Rend>('svg')
  const [ds, setDs] = useState<Ds>('none')
  const [runs, setRuns] = useState<Run[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [shown, setShown] = useState<Rend>('svg')
  const pathRef = useRef<SVGPathElement>(null)
  const canRef = useRef<HTMLCanvasElement>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const once = async (N: number, R: Rend, D: Ds): Promise<Run | null> => {
    const s = getSeries(N)
    const sx = BW / (N - 1), sy = (BH - 20) / (s.hi - s.lo)
    flushSync(() => setShown(R)) // 그릴 요소를 먼저 보이게 (크기 계산용)
    const t0 = performance.now()
    const p = DS_FN[D](s, TH)
    const t1 = performance.now()
    if (R === 'svg') {
      const el = pathRef.current; if (!el) return null
      let d = ''
      for (let i = 0; i < p.x.length; i++) d += (i ? 'L' : 'M') + (p.x[i] * sx).toFixed(1) + ',' + (BH - 10 - (p.y[i] - s.lo) * sy).toFixed(1)
      el.setAttribute('d', d)
      el.getBBox() // 도형 계산을 여기서 끝내게
    } else {
      const cv = canRef.current; if (!cv) return null
      const dpr = window.devicePixelRatio || 1
      const w = cv.clientWidth || BW
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * BH / BW) }
      const ctx = cv.getContext('2d'); if (!ctx) return null
      const k = cv.width / BW
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, BW, BH)
      ctx.strokeStyle = getComputedStyle(cv).color; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'
      ctx.beginPath()
      for (let i = 0; i < p.x.length; i++) { const X = p.x[i] * sx, Y = BH - 10 - (p.y[i] - s.lo) * sy; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y) }
      ctx.stroke()
    }
    const t2 = performance.now()
    await nextPaint()
    const t3 = performance.now()
    let spike = false
    for (let i = 0; i < p.y.length; i++) if (p.y[i] >= s.hi - 0.001) { spike = true; break }
    return { n: N, rend: R, ds: D, pts: p.x.length, tDs: t1 - t0, tDraw: t2 - t1, tFrame: t3 - t1, spike }
  }
  const measure = async () => {
    setBusy('측정 중')
    await nextPaint()
    const r = await once(n, rend, ds)
    if (alive.current) { if (r) setRuns(a => [r, ...a].slice(0, 14)); setBusy(null) }
  }
  const all = async () => {
    const combos: [number, Rend, Ds][] = []
    for (const N of SIZES) for (const R of ['svg', 'canvas'] as Rend[]) for (const D of ['none', 'lttb'] as Ds[]) combos.push([N, R, D])
    const out: Run[] = []
    for (let i = 0; i < combos.length; i++) {
      if (!alive.current) return
      setBusy(`전체 비교 ${i + 1}/${combos.length}`)
      await new Promise(res => setTimeout(res, 40)) // 사이사이 숨 쉴 틈 — 화면이 멈춘 것처럼 보이지 않게
      const r = await once(...combos[i]); if (r) out.push(r)
    }
    if (alive.current) { setRuns(out.reverse()); setBusy(null) }
  }
  const maxT = Math.max(16, ...runs.map(r => r.tFrame))
  const last = runs[0]
  return (
    <div className="fe-bench">
      <div className="fe-bench-ctl">
        <div><span>점 개수</span><Seg value={n} onChange={setN} options={SIZES.map(v => [v, fmtN(v)] as const)} /></div>
        <div><span>그리는 방식</span><Seg value={rend} onChange={setRend} options={[['svg', 'SVG'], ['canvas', 'Canvas']]} /></div>
        <div><span>다운샘플링</span><Seg value={ds} onChange={setDs} options={(Object.keys(DS_N) as Ds[]).map(k => [k, DS_N[k]] as const)} /></div>
      </div>
      <div className="fe-row">
        <button type="button" className="btn sm" disabled={!!busy} onClick={measure}>이 설정으로 그리고 재기</button>
        <button type="button" className="btn sm ghost" disabled={!!busy} onClick={all}>전체 비교 (12가지)</button>
        <button type="button" className="btn sm ghost" disabled={!!busy || !runs.length} onClick={() => setRuns([])}>기록 지우기</button>
        <span className="muted" aria-live="polite">{busy ?? (n === 100_000 && ds === 'none' ? '10만 개 원본은 기기에 따라 잠깐 멈칫할 수 있어요.' : '누를 때만 그려요.')}</span>
      </div>
      <Hmi title={`강변 1선 부하율 · ${last ? fmtN(last.n) : fmtN(n)}개 측정값 (가상)`} right={last ? <>그린 점 {fmtN(last.pts)}개 · {last.rend === 'svg' ? 'SVG' : 'Canvas'} · {DS_N[last.ds]}</> : '아직 그리지 않았어요'}>
        <div className="fe-bench-stage">
          <svg viewBox={`0 0 ${BW} ${BH}`} className="fe-bench-svg" style={{ display: shown === 'svg' ? 'block' : 'none' }} aria-hidden="true"><path ref={pathRef} /></svg>
          <canvas ref={canRef} className="fe-bench-cv" style={{ display: shown === 'canvas' ? 'block' : 'none' }} aria-hidden="true" />
          {last && <span className={'fe-spike' + (last.spike ? '' : ' lost')}>{last.spike ? '고장 순간 최댓값이 보여요' : '고장 순간 최댓값이 사라졌어요'}</span>}
        </div>
      </Hmi>
      {runs.length > 0 && (
        <div className="sys-table-wrap">
          <table className="sys-table fe-runs">
            <thead><tr><th>측정값 수</th><th>방식</th><th>다운샘플링</th><th>그린 점</th><th>줄이기</th><th>그리기</th><th>다음 화면까지</th><th>최댓값</th></tr></thead>
            <tbody>
              {runs.map((r, i) => (
                <tr key={i}>
                  <td>{fmtN(r.n)}</td><td>{r.rend === 'svg' ? 'SVG' : 'Canvas'}</td><td>{DS_N[r.ds]}</td><td>{fmtN(r.pts)}</td>
                  <td className="num">{r.tDs.toFixed(1)}ms</td><td className="num">{r.tDraw.toFixed(1)}ms</td>
                  <td><span className="fe-bar"><i style={{ width: Math.max(2, (r.tFrame / maxT) * 100) + '%' }} className={r.tFrame > 50 ? 'slow' : ''} /><b>{r.tFrame.toFixed(1)}ms</b></span></td>
                  <td>{r.spike ? '보존' : <b className="fe-bad">잃음</b>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="fe-p">‘다음 화면까지’는 줄이기 + 그리기 + 브라우저가 화면에 반영할 때까지 걸린 시간이에요. 이 브라우저에서 <b>지금 실제로 잰 값</b>이라 기기·브라우저마다 달라요. 50ms를 넘으면 막대가 진해져요.</p>
    </div>
  )
}

/* ================= 4. 업데이트 묶기 ================= */
type BMode = 'each' | 'raf' | 'skip'
const BMODE_N: Record<BMode, string> = { each: '메시지마다 렌더', raf: '프레임당 한 번', skip: '프레임당 한 번 + 같으면 건너뛰기' }
function Batching() {
  const [mode, setMode] = useState<BMode>('each')
  const [on, setOn] = useState(false)
  const [vals, setVals] = useState(() => FEEDERS.map(f => f.load))
  const stats = useRef({ msgs: 0, renders: 0 })
  const [rate, setRate] = useState({ msgs: 0, renders: 0 })
  const pend = useRef<Map<number, number>>(new Map())
  const raf = useRef(0)
  const r = useRef(rng(5))
  const modeRef = useRef(mode); modeRef.current = mode
  useLayoutEffect(() => { stats.current.renders++ })
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const flush = () => {
    raf.current = 0
    const p = pend.current; pend.current = new Map()
    setVals(prev => {
      let changed = false
      const next = prev.map((v, i) => { if (!p.has(i)) return v; const nv = p.get(i)!; if (modeRef.current === 'skip' && Math.round(nv) === Math.round(v)) return v; changed = true; return nv })
      return changed || modeRef.current !== 'skip' ? next : prev
    })
  }
  const feed = useVisibleInterval(() => {
    for (let k = 0; k < 4; k++) { // 16ms마다 4건 ≈ 초당 250건
      const i = Math.floor(r.current() * FEEDERS.length)
      const v = FEEDERS[i].load + (r.current() - 0.5) * 1.3
      stats.current.msgs++
      if (modeRef.current === 'each') flushSync(() => setVals(prev => prev.map((x, j) => (j === i ? v : x))))
      else { pend.current.set(i, v); if (!raf.current) raf.current = requestAnimationFrame(flush) }
    }
  }, 16, on)
  const meter = useVisibleInterval(() => { setRate({ ...stats.current }); stats.current = { msgs: 0, renders: 0 } }, 1000, on)
  return (
    <div className="fe-batch" ref={feed}>
      <div className="fe-row" ref={meter}>
        <Seg value={mode} onChange={setMode} options={(Object.keys(BMODE_N) as BMode[]).map(k => [k, BMODE_N[k]] as const)} />
        <button type="button" className="btn sm" onClick={() => { setOn(v => !v); setRate({ msgs: 0, renders: 0 }) }}>{on ? '멈추기' : '메시지 보내기 시작'}</button>
      </div>
      <div className="fe-batch-grid">
        <Hmi title="9개 선로 부하율" right="초당 약 250건 수신">
          <ul className="fe-bars">
            {FEEDERS.map((f, i) => (
              <li key={f.id}><span>{f.name}</span><i><b style={{ width: Math.min(100, vals[i]) + '%' }} /></i><em>{Math.round(vals[i])}%</em></li>
            ))}
          </ul>
        </Hmi>
        <div className="fe-meter" aria-live="off">
          <div><small>받은 메시지 / 초</small><b>{on ? rate.msgs : '—'}</b></div>
          <div><small>React 렌더 / 초</small><b className={on && rate.renders > 90 ? 'fe-bad' : ''}>{on ? rate.renders : '—'}</b></div>
          <p>{mode === 'each' ? '메시지가 올 때마다 바로 그리게(flushSync) 했어요. 렌더 수가 메시지 수를 따라가요. 모니터는 보통 1초에 60번쯤 화면을 바꾸니, 나머지는 아무도 못 보는 일이에요.'
            : mode === 'raf' ? '메시지는 버퍼에 모아 두고, requestAnimationFrame으로 다음 화면 그리기 직전에 한 번만 반영해요. 렌더 수가 화면 주사율 근처로 떨어져요.'
            : '화면에 보이는 값(정수 %)이 안 바뀌었으면 상태를 그대로 둬서 렌더 자체를 건너뛰어요.'}</p>
        </div>
      </div>
    </div>
  )
}

/* ================= 5. 오래 켜 두는 화면 ================= */
function GrowthChart() {
  const W = 600, H = 190, per = 9 * 3 // 선로 9개 × 값 3개, 1초에 1번
  const x = (h: number) => 50 + (h / 12) * (W - 64), maxPts = per * 3600 * 12
  const y = (v: number) => H - 26 - (v / maxPts) * (H - 46)
  const cap = per * 3600
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fe-grow-svg" role="img" aria-label="12시간 근무 동안 메모리에 쌓이는 점 수. 배열에 계속 쌓으면 116만 개, 1시간 링버퍼는 9만 7천 개에서 멈춰요.">
      {[0, 0.25, 0.5, 0.75, 1].map(f => <g key={f}><line className="grid" x1={50} x2={W - 14} y1={y(maxPts * f)} y2={y(maxPts * f)} /><text className="ax" x={44} y={y(maxPts * f) + 4} textAnchor="end">{Math.round((maxPts * f) / 10000)}만</text></g>)}
      <path className="leak" d={`M${x(0)},${y(0)} L${x(12)},${y(maxPts)}`} />
      <path className="ring" d={`M${x(0)},${y(0)} L${x(1)},${y(cap)} L${x(12)},${y(cap)}`} />
      <text className="lab" x={x(7.6)} y={y(maxPts * 0.63) - 10} textAnchor="end">배열에 계속 push</text>
      <text className="lab" x={x(12)} y={y(cap) - 8} textAnchor="end">1시간 링버퍼</text>
      {[0, 2, 4, 6, 8, 10, 12].map(h => <text key={h} className="ax" x={x(h)} y={H - 8} textAnchor="middle">{h}시간</text>)}
    </svg>
  )
}
function RingBuffer() {
  const N = 16
  const [head, setHead] = useState(5)
  const [seq, setSeq] = useState(5)
  const ref = useVisibleInterval(() => { setHead(h => (h + 1) % N); setSeq(s => s + 1) }, 700, !reduced())
  const slots = Array.from({ length: N }, (_, i) => { const age = (head - 1 - i + N) % N; return seq - age > 0 ? seq - age : null })
  return (
    <div className="fe-ring" ref={ref}>
      <svg viewBox="-80 -80 160 160" className="fe-ring-svg" role="img" aria-label={`칸 ${N}개짜리 링버퍼. 새 값이 가장 오래된 칸을 덮어써요.`}>
        {slots.map((v, i) => {
          const a = (i / N) * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * 58, y = Math.sin(a) * 58
          const isNew = i === (head - 1 + N) % N, isOld = i === head
          return <g key={i}>
            <circle className={'slot' + (isNew ? ' new' : '') + (isOld ? ' old' : '') + (v === null ? ' empty' : '')} cx={x} cy={y} r={11} />
            <text x={x} y={y + 3.5} textAnchor="middle" className="sv">{v ?? ''}</text>
          </g>
        })}
        <text x={0} y={-4} textAnchor="middle" className="rc">칸 {N}개</text>
        <text x={0} y={12} textAnchor="middle" className="rc2">#{seq} 까지 받음</text>
      </svg>
      <ul className="fe-ring-leg"><li><i className="new" />방금 쓴 칸</li><li><i className="old" />다음에 덮어쓸 가장 오래된 칸</li></ul>
    </div>
  )
}
function PageApis() {
  const [vis, setVis] = useState(() => document.visibilityState)
  const [hid, setHid] = useState(0)
  const [wl, setWl] = useState<'off' | 'on' | 'unsupported' | 'error'>(() => ('wakeLock' in navigator ? 'off' : 'unsupported'))
  const sent = useRef<WakeLockSentinel | null>(null)
  const want = useRef(false)
  useEffect(() => {
    const on = () => {
      setVis(document.visibilityState)
      if (document.visibilityState === 'hidden') setHid(h => h + 1)
      else if (want.current && !sent.current) void lock() // 탭으로 돌아오면 다시 잡기
    }
    document.addEventListener('visibilitychange', on)
    return () => { document.removeEventListener('visibilitychange', on); want.current = false; void sent.current?.release(); sent.current = null }
  }, [])
  const lock = async () => {
    try {
      const s = await navigator.wakeLock.request('screen')
      sent.current = s; setWl('on')
      s.addEventListener('release', () => { sent.current = null; setWl(w => (w === 'on' ? 'off' : w)) })
    } catch { setWl('error'); want.current = false }
  }
  const toggle = async () => {
    if (sent.current) { want.current = false; await sent.current.release(); sent.current = null; setWl('off') }
    else { want.current = true; await lock() }
  }
  return (
    <div className="fe-apis">
      <div className="fe-api">
        <small>document.visibilityState</small>
        <b>{vis === 'visible' ? 'visible — 보이는 중' : 'hidden — 가려짐'}</b>
        <span>이 페이지가 가려진 횟수 <b>{hid}</b>번. 다른 탭을 눌렀다 돌아와 보세요.</span>
        <p>가려진 동안엔 그리기를 멈추고, 돌아오면 그동안 쌓인 값을 한 번에 받아 다시 그려요. 이 탭의 모든 시뮬레이션도 화면에 보일 때만 돌아요.</p>
      </div>
      <div className="fe-api">
        <small>Screen Wake Lock API</small>
        <b>{wl === 'on' ? '화면 꺼짐 방지 켜짐' : wl === 'unsupported' ? '이 브라우저는 지원하지 않아요' : wl === 'error' ? '요청이 거절됐어요' : '화면 꺼짐 방지 꺼짐'}</b>
        <button type="button" className="btn sm" disabled={wl === 'unsupported'} onClick={toggle} aria-pressed={wl === 'on'}>{wl === 'on' ? '해제하기' : '화면 꺼짐 방지 켜기'}</button>
        <p>관제 화면은 절전으로 꺼지면 안 돼요. 탭이 가려지면 브라우저가 자동으로 풀기 때문에, 돌아왔을 때 다시 요청해요(이 데모도 그렇게 해요). 지원하지 않으면 운영체제 전원 설정으로 막아요.</p>
      </div>
    </div>
  )
}

/* ================= 6. 시간: 서버 시각 기준 ================= */
function ClockSkew() {
  const [off, setOff] = useState(-90) // 이 PC 시계가 서버보다 몇 초 틀렸나
  const [now, setNow] = useState(() => Date.now())
  const ref = useVisibleInterval(() => setNow(Date.now()), 1000)
  const base = useRef(Date.now() - 75_000) // 마지막 데이터가 서버 시각으로 75초 전에 도착
  const rtt = 0.12
  const client = now + off * 1000
  // NTP 방식: t0 보냄(클라) t1 받음(서버) t2 보냄(서버) t3 받음(클라)
  const t0 = 0, t1 = -off + rtt / 2, t2 = t1 + 0.01, t3 = rtt + 0.01
  const est = ((t1 - t0) + (t2 - t3)) / 2
  const ago = (ms: number) => { const s = Math.round(ms / 1000); if (s < 0) return `${-s}초 뒤(미래)`; if (s < 5) return '방금'; return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초 전` : `${s}초 전` }
  const fmt = (ms: number, tz?: string) => new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz }).format(ms)
  const naive = client - base.current, fixed = client + est * 1000 - base.current
  return (
    <div className="fe-clock" ref={ref}>
      <label className="fe-inline">이 PC 시계 오차 <b>{off > 0 ? '+' : ''}{off}초{off < 0 ? ' (느림)' : off > 0 ? ' (빠름)' : ''}</b><Range value={off} min={-180} max={180} step={15} onChange={setOff} label="PC 시계 오차" style={{ width: 200 }} /></label>
      <div className="fe-clock-grid">
        <div className="fe-ntp">
          <svg viewBox="0 0 300 130" role="img" aria-label="시각 맞추기: 네 번의 시각 기록으로 서버와의 차이를 계산해요">
            <line className="lane" x1={40} x2={290} y1={30} y2={30} /><line className="lane" x1={40} x2={290} y1={100} y2={100} />
            <text className="ax" x={4} y={34}>브라우저</text><text className="ax" x={4} y={104}>서버</text>
            <line className="ar" x1={70} y1={30} x2={140} y2={100} /><line className="ar" x1={160} y1={100} x2={230} y2={30} />
            <text className="tk" x={70} y={20} textAnchor="middle">t0</text><text className="tk" x={140} y={118} textAnchor="middle">t1</text>
            <text className="tk" x={160} y={118} textAnchor="middle">t2</text><text className="tk" x={230} y={20} textAnchor="middle">t3</text>
          </svg>
          <p>차이 = ((t1 − t0) + (t2 − t3)) ÷ 2 <Cite n={8} /><br />계산한 차이 <b>{est > 0 ? '+' : ''}{est.toFixed(1)}초</b> (오가는 시간 {Math.round(rtt * 1000)}ms 가정)</p>
        </div>
        <Hmi title="마지막 갱신" right={`서버 ${fmt(now, 'Asia/Seoul')}`}>
          <div className="fe-ago">
            <div className="bad"><small>PC 시계로 계산</small><b>{ago(naive)}</b><span>PC 시각 {fmt(client, 'Asia/Seoul')}</span></div>
            <div><small>서버 시각으로 보정</small><b>{ago(fixed)}</b><span>갱신 {fmt(base.current, 'Asia/Seoul')} (KST)</span></div>
          </div>
        </Hmi>
      </div>
      <p className="fe-p">PC 시계가 느리면 묵은 값이 방금 들어온 것처럼 보여요. <b>멈춘 화면이 정상처럼 보이는 것</b>이 관제 화면에서 가장 위험해요(05 탭). 시각은 서버가 정하고, 브라우저는 차이만 계산해 보정해요. 표시는 <code>Asia/Seoul</code>처럼 시간대를 정해 두고, 기록과 API는 <code>2026-11-08T14:02:08+09:00</code>처럼 시간대가 붙은 형식으로 주고받아요.</p>
    </div>
  )
}

/* ================= 7. 접근성 ================= */
interface Ann { p: Pri; t: string; how: string }
const ANN_TEXT: Record<Pri, string> = { 1: '긴급 알람, 산단 1선 선로 고장, 차단기 트립', 2: '높음 알람, 강변 1선 부하율 95% 초과', 3: '주의 알람, 강변 2선 R/C-12 통신 두절' }
function A11yDemo() {
  const [list, setList] = useState<{ id: number; p: Pri; ack: boolean }[]>([])
  const [said, setSaid] = useState<Ann[]>([])
  const [assertive, setAssertive] = useState('')
  const [polite, setPolite] = useState('')
  const [calm, setCalm] = useState(false)
  const id = useRef(0)
  const raise = (p: Pri) => {
    id.current++
    setList(l => [{ id: id.current, p, ack: false }, ...l].slice(0, 5))
    if (p === 1) { setAssertive(''); requestAnimationFrame(() => setAssertive(ANN_TEXT[1])) }
    if (p === 2) { setPolite(''); requestAnimationFrame(() => setPolite(ANN_TEXT[2])) }
    setSaid(s => [{ p, t: ANN_TEXT[p], how: p === 1 ? 'assertive — 읽던 것을 끊고 바로 읽어요' : p === 2 ? 'polite — 지금 읽던 문장이 끝나면 읽어요' : '읽지 않아요 — 목록에만 추가' }, ...s].slice(0, 4))
  }
  return (
    <div className="fe-a11y">
      <div className="fe-sr" aria-live="assertive" aria-atomic="true">{assertive}</div>
      <div className="fe-sr" aria-live="polite" aria-atomic="true">{polite}</div>
      <div className="fe-row">
        {([1, 2, 3] as Pri[]).map(p => <button key={p} type="button" className="btn sm ghost fe-raise" onClick={() => raise(p)}><PriBadge p={p} /> 알람 발생</button>)}
        <button type="button" className="chip" aria-pressed={calm} onClick={() => setCalm(v => !v)}>움직임 줄이기 흉내</button>
      </div>
      <div className="fe-a11y-grid">
        <Hmi title="알람 목록" right={`${list.filter(a => !a.ack).length}건 미확인`}>
          <ul className={'fe-alist' + (calm ? ' calm' : '')}>
            {list.length === 0 && <li className="empty">위 버튼으로 알람을 만들어 보세요</li>}
            {list.map(a => (
              <li key={a.id} className={(a.ack ? 'ack' : 'unack') + ' p' + a.p}>
                <PriBadge p={a.p} /><span className="tx">{ANN_TEXT[a.p].split(', ').slice(1).join(', ')}</span>
                {!a.ack && <em className="tag">미확인</em>}
                {!a.ack && <button type="button" className="btn sm ghost" onClick={() => setList(l => l.map(x => (x.id === a.id ? { ...x, ack: true } : x)))}>확인</button>}
              </li>
            ))}
          </ul>
        </Hmi>
        <div className="fe-said">
          <b>스크린 리더가 할 일 (흉내)</b>
          <ol>{said.length ? said.map((s, i) => <li key={i}><PriBadge p={s.p} /><span>“{s.t}”<small>{s.how}</small></span></li>) : <li className="muted">아직 없어요</li>}</ol>
        </div>
      </div>
      <p className="fe-p">미확인 알람은 1초에 한 번 깜빡여요(초당 3회 이하 <Cite n={7} />). 운영체제에서 ‘동작 줄이기’를 켰거나 위 버튼을 누르면 깜빡임 대신 굵은 테두리와 ‘미확인’ 글자로만 구분해요. 깜빡임이 없어도 상태를 알 수 있어야 해요.</p>
    </div>
  )
}

/* ================= 8. 체크리스트 ================= */
const CHECK: { g: string; items: string[] }[] = [
  { g: '연결', items: ['서버가 보내는 일이 대부분이면 SSE, 브라우저도 자주 보내면 웹소켓을 골랐다', '재연결은 지수 백오프 + 지터, 최대 간격을 정했다', '메시지마다 순서 번호(seq)가 있고, 재연결 때 마지막 번호 이후를 다시 받는다', '끊긴 동안 화면에 끊김 배너와 마지막 갱신 시각을 보여준다'] },
  { g: '그리기', items: ['점이 화면 폭보다 훨씬 많으면 최대·최소를 지키는 다운샘플링을 쓴다', '수천 개가 넘는 점은 Canvas로 그린다(또는 실제로 재 보고 정했다)', '갱신은 requestAnimationFrame으로 프레임당 한 번 반영한다', '보이는 값이 같으면 렌더하지 않는다'] },
  { g: '오래 켜 두기', items: ['구독·타이머·이벤트 리스너를 모두 정리(cleanup)한다', '시계열은 링버퍼로 최근 N개만 메모리에 둔다', '탭이 가려지면 그리기를 멈추고, 돌아오면 다시 받는다', '화면 꺼짐 방지(Wake Lock)를 쓰고, 돌아올 때 다시 요청한다', '8시간 이상 켜 두고 메모리 그래프를 확인했다'] },
  { g: '시간 · 접근성', items: ['표시 시각은 서버 기준으로 보정하고 시간대를 정했다', '긴급 알람만 aria-live="assertive", 나머지는 polite 또는 없음', '깜빡임은 초당 3회 이하, 동작 줄이기 설정이면 멈춘다', '우선순위는 색 + 모양 + 글자로 구분한다'] },
]
function Checklist() {
  const [on, setOn] = useState<Record<string, boolean>>({})
  const tot = CHECK.reduce((a, g) => a + g.items.length, 0), n = Object.values(on).filter(Boolean).length
  const md = useMemo(() => ['# 관제 화면 FE 체크리스트', '', ...CHECK.flatMap(g => [`## ${g.g}`, '', ...g.items.map(t => `- [${on[t] ? 'x' : ' '}] ${t}`), ''])].join('\n'), [on])
  return (
    <div className="fe-check">
      <div className="fe-check-grid">
        {CHECK.map(g => (
          <div key={g.g} className="fe-check-g">
            <b>{g.g}</b>
            <ul>{g.items.map(t => <li key={t}><label><input type="checkbox" checked={!!on[t]} onChange={() => setOn(o => ({ ...o, [t]: !o[t] }))} /><span>{t}</span></label></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="fe-row">
        <span className="muted">{n} / {tot} 확인</span><span className="fe-grow" />
        <button type="button" className="btn sm" onClick={() => download('관제화면_FE_체크리스트.md', md, 'text/markdown;charset=utf-8')}>체크리스트 내려받기(.md)</button>
      </div>
    </div>
  )
}

const CODE_WS = `// 재연결: 지수 백오프 + 지터, 마지막 seq 이후 다시 받기
type Msg = { seq: number; feeder: string; load: number }

export function connect(url: string, onMsg: (m: Msg) => void, onState: (s: 'open' | 'retry', wait?: number) => void) {
  let ws: WebSocket | null = null
  let lastSeq = 0, attempt = 0, timer = 0, closed = false

  const open = () => {
    ws = new WebSocket(\`\${url}?since=\${lastSeq}\`)      // 서버는 since 이후를 먼저 보내요
    ws.onopen = () => { attempt = 0; onState('open') }
    ws.onmessage = e => {
      const m: Msg = JSON.parse(e.data)
      if (m.seq <= lastSeq) return                       // 중복은 버려요
      lastSeq = m.seq
      onMsg(m)
    }
    ws.onclose = () => {
      if (closed) return
      const cap = Math.min(30_000, 1_000 * 2 ** attempt++) // 1s, 2s, 4s … 최대 30s
      const wait = Math.random() * cap                   // full jitter
      onState('retry', wait)
      timer = window.setTimeout(open, wait)
    }
  }
  open()
  return () => { closed = true; clearTimeout(timer); ws?.close() } // 정리 함수
}`
const CODE_RAF = `// 메시지는 모아 두고, 프레임당 한 번만 상태에 반영
import { useEffect, useRef, useState } from 'react'

export function useRafBatch<T>(initial: Record<string, T>, same: (a: T, b: T) => boolean) {
  const [state, setState] = useState(initial)
  const pending = useRef(new Map<string, T>())
  const raf = useRef(0)

  const push = (key: string, value: T) => {
    pending.current.set(key, value)
    if (!raf.current) raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const p = pending.current; pending.current = new Map()
      setState(prev => {
        let changed = false
        const next = { ...prev }
        p.forEach((v, k) => { if (!(k in prev) || !same(prev[k], v)) { next[k] = v; changed = true } })
        return changed ? next : prev                     // 같으면 렌더하지 않아요
      })
    })
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return [state, push] as const
}`
const CODE_PAGE = `// 가려지면 멈추고, 돌아오면 다시 받기 + 화면 꺼짐 방지
useEffect(() => {
  let lock: WakeLockSentinel | null = null
  const grab = async () => { try { lock = await navigator.wakeLock?.request('screen') ?? null } catch { /* 거절됨 */ } }

  const onVis = () => {
    if (document.visibilityState === 'hidden') stream.pause()
    else { stream.resume({ since: lastSeq }); void grab() } // Wake Lock 은 가려지면 풀려요
  }
  void grab()
  document.addEventListener('visibilitychange', onVis)
  return () => { document.removeEventListener('visibilitychange', onVis); void lock?.release() }
}, [])`

/* ================= 탭 ================= */
export default function Tab() {
  return (
    <div data-dash="fe">
      <SysGrid>
        <Section id="dash-fe-transport" wide title="데이터를 어떻게 받을까 — 폴링, 롱폴링, SSE, 웹소켓"
          desc="같은 30초 동안 서버에서 변화 8건이 생겨요. 네 방식이 요청을 몇 번 보내고, 변화가 화면에 몇 초 늦게 도착하는지 재생해 보세요. 아래 회색 막대가 지연이에요.">
          <Transport />
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th>방식</th><th>방향</th><th>지연</th><th>서버 부담</th><th>끊기면</th><th>잘 맞는 곳</th></tr></thead>
              <tbody>
                <tr><td>폴링</td><td>브라우저 → 서버 요청</td><td>최대 간격만큼 늦음</td><td>변화가 없어도 계속 요청</td><td>다음 요청 때 자연히 회복</td><td>몇 분 단위 지표, 단순한 화면</td></tr>
                <tr><td>롱폴링</td><td>요청을 서버가 붙잡음</td><td>짧음</td><td>대기 중인 요청을 계속 유지</td><td>다시 요청</td><td>웹소켓을 못 쓰는 환경의 대안</td></tr>
                <tr><td>SSE</td><td>서버 → 브라우저 한 방향</td><td>짧음</td><td>연결 하나</td><td>브라우저가 자동 재연결, 마지막 이벤트 ID를 보내 줌 <Cite n={2} /></td><td>알람·측정값처럼 받기만 하는 관제 화면</td></tr>
                <tr><td>웹소켓</td><td>양방향</td><td>짧음</td><td>연결 하나</td><td>재연결을 직접 만들어야 해요 <Cite n={1} /></td><td>확인·조작 명령도 자주 보내는 화면</td></tr>
              </tbody>
            </table>
          </div>
          <Note>통신 시간·사건 시각은 비교를 위한 <b>가상 값</b>이에요. 실제 차이는 망과 서버에 따라 달라요. 관제 화면은 대부분 ‘받기’라서 SSE로 충분한 경우가 많고, 조작 명령은 보통 별도 API(확인 절차 포함)로 보내요.</Note>
        </Section>

        <Section id="dash-fe-reconnect" wide title="끊겼다 다시 붙기 — 백오프, 지터, 놓친 구간"
          desc="관제실 화면 수십 대가 같은 서버를 봐요. 서버가 잠깐 죽으면 모두가 동시에 다시 붙으려 해요. 전략을 바꿔 보세요.">
          <Herd />
          <LiveReconnect />
          <SysPair>
            <Note><b>마지막 번호(seq)를 기억해요.</b> 서버가 메시지마다 순서 번호를 붙이면, 다시 붙을 때 “1042번 이후 주세요”라고 할 수 있어요. ‘다시 받기’를 끄고 끊어 보면 그래프에 구멍이 남아요. 그 구멍이 바로 사고 조사 때 찾는 구간일 수 있어요.</Note>
            <Note tone="tip"><b>끊긴 동안 화면이 할 일.</b> 끊김 배너, 마지막 갱신 시각, 오래된 값은 빗금·회색으로. 재시도 중이라는 것과 다음 시도까지 남은 시간을 보여요. 자세한 화면 표현은 05 실시간 갱신 탭에 있어요.</Note>
          </SysPair>
        </Section>

        <Section id="dash-fe-bench" wide title="점 10만 개 그리기 — 이 브라우저에서 직접 재요"
          desc="하루치 1초 측정값이면 한 선로에 8만 6천 개예요. 점 개수·그리는 방식·다운샘플링을 바꿔 가며 실제로 걸리는 시간을 재 보세요. 데이터 한가운데에 짧은 고장 급등이 숨어 있어요.">
          <Bench />
          <SysPair>
            <Finding src={<>Steinarsson (2013) LTTB · Jugel 등 (2014) M4 — 한국어 요약 <Cite n={3} /><Cite n={4} /></>}>
              화면 폭보다 많은 점은 눈에 보이지 않아요. 픽셀 칸마다 모양을 지키는 점만 남기면 같은 그림을 훨씬 빨리 그릴 수 있어요.
            </Finding>
            <Note tone="warn"><b>‘n개마다 1개’는 위험해요.</b> 고르게 솎아 내면 1~2개 점으로 된 고장 급등이 사라질 수 있어요. 관제 화면에선 최댓값·최솟값이 곧 사건이에요. 구간마다 최소·최대를 남기거나 LTTB처럼 모양을 지키는 방법을 쓰고, 확대하면 원본을 다시 불러와요.</Note>
          </SysPair>
        </Section>

        <Section id="dash-fe-batch" title="업데이트 묶기 — 프레임당 한 번"
          desc="초당 250건이 들어와도 화면은 보통 1초에 60번쯤 바뀌어요. 방식을 바꿔 렌더 수를 비교해 보세요.">
          <Batching />
        </Section>

        <Section id="dash-fe-time" title="시각은 서버 기준으로"
          desc="관제 PC 시계가 틀리면 ‘마지막 갱신 n초 전’이 거짓말을 해요. 슬라이더로 PC 시계를 틀어 보세요.">
          <ClockSkew />
        </Section>

        <Section id="dash-fe-longrun" wide title="8~12시간 켜 두는 화면 — 메모리와 화면 꺼짐"
          desc="관제 화면은 새로고침 없이 근무 내내 켜져 있어요. 짧게 써 보는 웹페이지에선 안 보이던 문제가 몇 시간 뒤에 나와요.">
          <div className="fe-long-grid">
            <figure className="fe-fig">
              <figcaption><b>점 개수가 근무 시간에 따라 어떻게 쌓이나</b><span className="muted">선로 9개 × 값 3개, 1초에 1번 (계산)</span></figcaption>
              <GrowthChart />
              <small className="muted">12시간이면 116만 개. 숫자만 Float64로 담아도 점 하나에 16바이트(x·y)라 약 19MB, 객체로 담으면 훨씬 커요. 1시간 링버퍼는 약 9만 7천 개에서 멈춰요.</small>
            </figure>
            <figure className="fe-fig">
              <figcaption><b>링버퍼</b><span className="muted">정해진 칸을 돌려 쓰는 배열</span></figcaption>
              <RingBuffer />
            </figure>
          </div>
          <div className="fe-leaks">
            {[
              ['해제 안 한 구독', 'useEffect에서 연 웹소켓·SSE·이벤트 리스너를 정리 함수에서 닫지 않으면, 화면을 오갈 때마다 연결이 하나씩 늘어요.'],
              ['멈추지 않는 타이머', 'setInterval을 clearInterval 하지 않으면 사라진 컴포넌트의 상태를 계속 고치려 해요.'],
              ['계속 쌓이는 배열', 'data.push()만 하고 지우지 않는 시계열. 링버퍼나 “최근 N개만 남기기”로 바꿔요.'],
              ['떨어진 DOM 참조', '지운 차트 요소를 변수·맵에 계속 들고 있으면 메모리에서 못 치워요.'],
            ].map(([t, d]) => <div key={t}><b>{t}</b><p>{d}</p></div>)}
          </div>
          <PageApis />
          <CodeBlock label="TypeScript · 가려지면 멈추고 화면 꺼짐 방지" code={CODE_PAGE} />
        </Section>

        <Section id="dash-fe-a11y" wide title="알람의 접근성 — 누구에게 끼어들 것인가"
          desc="aria-live는 화면을 보지 않는 사람에게 변화를 읽어 줘요. 모든 알람을 assertive로 하면 스크린 리더가 쉴 새 없이 말을 끊어요.">
          <A11yDemo />
          <Note>긴급(1)만 <code>aria-live="assertive"</code>, 높음(2)은 <code>polite</code>, 주의(3)는 목록에만 둬요 <Cite n={6} />. 폭주 때는 하나씩 읽지 말고 “긴급 알람 12건”처럼 요약해서 한 번만 읽어요.</Note>
        </Section>

        <Section id="dash-fe-code" wide title="코드와 체크리스트" desc="복사해서 시작점으로 쓰세요. 체크리스트는 출시 전 리뷰에 그대로 써요.">
          <SysPair>
            <CodeBlock label="TypeScript · 웹소켓 재연결" code={CODE_WS} maxHeight={420} />
            <CodeBlock label="TypeScript · 프레임당 한 번 반영" code={CODE_RAF} maxHeight={420} />
          </SysPair>
          <Checklist />
        </Section>

        <Refs items={[
          { kind: 'standard', text: 'IETF RFC 6455 (2011). The WebSocket Protocol.', url: 'https://www.rfc-editor.org/rfc/rfc6455' },
          { kind: 'standard', text: 'WHATWG HTML Living Standard — Server-sent events (EventSource, Last-Event-ID)', url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html' },
          { kind: 'paper', text: 'Steinarsson, S. (2013). Downsampling Time Series for Visual Representation. 석사 논문, University of Iceland — LTTB', url: 'https://skemman.is/handle/1946/15343' },
          { kind: 'paper', text: 'Jugel, U., Jerzak, Z., Hackenbroich, G., Markl, V. (2014). M4: A Visualization-Oriented Time Series Data Aggregation. PVLDB 7(10).' },
          { kind: 'standard', text: 'W3C Page Visibility · Screen Wake Lock API', url: 'https://www.w3.org/TR/screen-wake-lock/' },
          { kind: 'standard', text: 'W3C WAI-ARIA 1.2 — aria-live (assertive · polite)', url: 'https://www.w3.org/TR/wai-aria-1.2/#aria-live' },
          { kind: 'standard', text: 'WCAG 2.1 성공 기준 2.3.1 — 초당 3회 이하 깜빡임', url: 'https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html' },
          { kind: 'standard', text: 'IETF RFC 5905 (2010). Network Time Protocol Version 4 — 시각 차이 계산', url: 'https://www.rfc-editor.org/rfc/rfc5905' },
          { kind: 'practice', text: '지수 백오프와 지터(재접속 몰림 분산), 링버퍼, requestAnimationFrame 묶기 — 프런트엔드·분산 시스템 실무 방식' },
        ]} />
      </SysGrid>
    </div>
  )
}

function SysPair({ children }: { children: ReactNode }) { return <div className="fe-pair">{children}</div> }
