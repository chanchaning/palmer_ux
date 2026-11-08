import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/* ---------- 곡선 수학 (원본과 동일) ---------- */
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
export type Fn = (t: number) => number

export const bez = (x1: number, y1: number, x2: number, y2: number): Fn => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t, sy = (t: number) => ((ay * t + by) * t + cy) * t
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return x => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x, d = dx(t)
      if (Math.abs(e) < 1e-6) return sy(t)
      if (Math.abs(d) < 1e-6) break
      t -= e / d
    }
    let lo = 0, hi = 1
    t = x
    for (let i = 0; i < 40; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2 }
    return sy(t)
  }
}

export interface Ease { s: string; f: Fn }
export const C = {
  linear: { s: 'linear', f: (t: number) => t },
  in: { s: 'cubic-bezier(.4,0,1,1)', f: bez(0.4, 0, 1, 1) },
  out: { s: 'cubic-bezier(0,0,.2,1)', f: bez(0, 0, 0.2, 1) },
  std: { s: 'cubic-bezier(.4,0,.2,1)', f: bez(0.4, 0, 0.2, 1) },
  emph: { s: 'cubic-bezier(.2,0,0,1)', f: bez(0.2, 0, 0, 1) },
} satisfies Record<string, Ease>

/** 레인 카드가 쓰는 곡선: CSS 문자열(s)이 없으면 키프레임 120개로 그려요 */
export interface LaneCurve { f: Fn; s?: string; ms?: number }

// 실제 낙하: 첫 낙하 t², 이후 반발 계수 e로 높이 e^2k, 체공 시간 2e^k
export const bounceFn = (e: number) => {
  const segs: number[] = []
  let T = 1
  for (let k = 1; k < 12 && Math.pow(e, 2 * k) > 0.003; k++) { segs.push(2 * Math.pow(e, k)); T += 2 * Math.pow(e, k) }
  const f = (t: number) => {
    let u = clamp(t) * T
    if (u < 1) return u * u
    u -= 1
    for (let i = 0; i < segs.length; i++) {
      const d = segs[i]
      if (u < d) { const h = Math.pow(e, 2 * (i + 1)), w = (u - d / 2) / (d / 2); return 1 - h * (1 - w * w) }
      u -= d
    }
    return 1
  }
  return { f, n: segs.length }
}

// 감쇠 스프링 (질량 1): x'' = -k(x-1) - c x'
export const springFn = (k: number, c: number) => {
  const w0 = Math.sqrt(k), z = c / (2 * Math.sqrt(k))
  let x: Fn
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); x = t => 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)) }
  else if (z === 1) x = t => 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  else { const s = Math.sqrt(z * z - 1), r1 = -w0 * (z - s), r2 = -w0 * (z + s); x = t => 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2) }
  let last = 0, peak = 0
  for (let t = 0; t <= 6; t += 1 / 500) { const v = x(t); if (Math.abs(v - 1) > 0.002) last = t; if (v > peak) peak = v }
  const T = clamp(last + 0.02, 0.15, 4)
  return { f: (t: number) => (t >= 1 ? 1 : x(t * T)), ms: Math.round(T * 1000), z, over: Math.max(0, peak - 1) }
}

export const pct = (v: number) => Math.round(v * 100) + '%'

/* ---------- 그래프 ---------- */
const Y0 = -0.16, Y1 = 1.3
const yp = (v: number) => (Y1 - v) / (Y1 - Y0) * 100
export const LIN: Fn = t => t
const pathD = (f: Fn) => {
  let d = ''
  for (let i = 0; i <= 160; i++) { const t = i / 160; d += (i ? 'L' : 'M') + (t * 100).toFixed(2) + ' ' + yp(f(t)).toFixed(2) }
  return d
}

export interface PlotCurve { f: Fn; cls?: string }
export interface PlotApi { set: (t: number | null) => void }

/** 시간–진행 그래프. 곡선은 React가 그리고, 재생 중 점·커서 위치는 set(t)로 직접 갱신해요.
 *  curves/ghost는 useMemo로 고정해서 넘겨주세요 (바뀌면 점이 처음으로 돌아가요). */
export const Plot = forwardRef<PlotApi, { curves: PlotCurve[]; ghost?: Fn; labels?: [string, string]; yName?: string; sm?: boolean }>(
  function Plot({ curves, ghost = LIN, labels = ['도착', '출발'], yName = '진행', sm }, ref) {
    const cur = useRef<HTMLElement>(null)
    const gdot = useRef<HTMLElement>(null)
    const dots = useRef<(HTMLElement | null)[]>([])
    const live = useRef({ curves, ghost })
    live.current = { curves, ghost }
    const api = useRef<PlotApi>({
      set(t) {
        const { curves: fns, ghost: g } = live.current
        const put = (el: HTMLElement | null, x: number, v: number) => { if (el) { el.style.left = (x * 100) + '%'; el.style.top = yp(v) + '%' } }
        cur.current?.classList.toggle('on', t !== null)
        const u = t === null ? 0 : t
        if (cur.current) cur.current.style.left = (u * 100) + '%'
        put(gdot.current, u, g(u))
        fns.forEach((c, i) => put(dots.current[i], u, c.f(u)))
      },
    })
    useImperativeHandle(ref, () => api.current, [])
    useLayoutEffect(() => { api.current.set(null) }, [curves, ghost])
    const paths = useMemo(() => ({ ghost: pathD(ghost), cv: curves.map(c => pathD(c.f)) }), [curves, ghost])
    return (
      <div className={'ez-plot' + (sm ? ' sm' : '')}>
        <div className="ez-pa">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" x2="100" y1={yp(1)} y2={yp(1)} className="gl" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2="100" y1={yp(0)} y2={yp(0)} className="gl base" vectorEffect="non-scaling-stroke" />
            <path d={paths.ghost} className="ghost" vectorEffect="non-scaling-stroke" />
            {curves.map((c, i) => <path key={i} d={paths.cv[i]} className={'cv' + (c.cls ? ' ' + c.cls : '')} vectorEffect="non-scaling-stroke" />)}
          </svg>
          <i className="ez-cur" ref={cur} />
          <span className="ez-lbl" style={{ top: yp(1) + '%' }}>{labels[0]}</span>
          <span className="ez-lbl" style={{ top: yp(0) + '%' }}>{labels[1]}</span>
          <span className="ez-leg"><span><i />{yName}</span><span><i className="g" />선형</span></span>
          <span className="ez-ax">시간 →</span>
          <i className="ez-dot g" ref={gdot} />
          {curves.map((c, i) => <i key={i} className={'ez-dot' + (c.cls ? ' ' + c.cls.replace('thin', 'sub') : '')} ref={el => { dots.current[i] = el }} />)}
        </div>
      </div>
    )
  },
)

/** 애니메이션 진행에 맞춰 점을 움직임 (rAF는 재생 중에만) */
export const follow = (pl: PlotApi | null, anim: Animation, onTick?: (t: number) => void) => {
  let raf = 0
  const end = Number(anim.effect?.getComputedTiming().endTime ?? 1) || 1
  const step = () => {
    if (anim.playState === 'idle') return
    const t = anim.playState === 'finished' ? 1 : clamp(Number(anim.currentTime ?? 0) / end)
    pl?.set(t)
    if (t < 1) { onTick?.(t); raf = requestAnimationFrame(step) }
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}
export const done = (a: Animation) => a.finished.then(() => true, () => false)

/** 애니메이션 묶음 — clear()로 한 번에 취소. 언마운트 때 자동 정리 */
export function useCtl() {
  const k = useRef<{ add: (a: Animation) => Animation; stop: (f: () => void) => void; clear: () => void } | null>(null)
  if (!k.current) {
    let stops: (() => void)[] = [], anims: Animation[] = []
    k.current = {
      add(a) { anims.push(a); return a },
      stop(f) { stops.push(f) },
      clear() { stops.forEach(f => f()); stops = []; anims.forEach(a => a.cancel()); anims = [] },
    }
  }
  const K = k.current
  useEffect(() => () => K.clear(), [K])
  return K
}

/** 칩을 누를 때마다 다음 값으로. get()은 방금 바꾼 값도 바로 읽어요 */
export function useCycle<T>(list: readonly T[], idx: number) {
  const [i, setI] = useState(idx)
  const ref = useRef(idx)
  const set = (j: number) => { ref.current = j; setI(j) }
  return {
    i, v: list[i],
    get: () => list[ref.current],
    set,
    next: () => { const j = (ref.current + 1) % list.length; set(j); return list[j] },
  }
}

export const MsChip = ({ ms }: { ms: number }) => <>⏱ <b>{ms}ms</b></>

/** 범위 입력: input 때 onInput, 손을 뗄 때(change) onCommit */
export function RangeIn({ value, min, max, step = 1, className, label, onInput, onCommit }: {
  value: number; min: number; max: number; step?: number; className?: string; label: string
  onInput: (v: number) => void; onCommit?: () => void
}) {
  const el = useRef<HTMLInputElement>(null)
  const commit = useRef(onCommit)
  commit.current = onCommit
  useEffect(() => {
    const e = el.current
    if (!e) return
    const h = () => commit.current?.()
    e.addEventListener('change', h)
    return () => e.removeEventListener('change', h)
  }, [])
  return (
    <input ref={el} type="range" min={min} max={max} step={step} value={value} className={className} aria-label={label}
      style={{ ['--p' as string]: ((value - min) / (max - min) * 100) + '%' }}
      onChange={e => onInput(+e.target.value)} />
  )
}

export type Log = ReactNode
