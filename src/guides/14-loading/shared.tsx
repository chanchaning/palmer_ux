import { useEffect, useRef } from 'react'
import { useMotion } from '../../lib/motion'

export const now = () => performance.now()
export const pct = (v: number) => Math.round(v * 100) + '%'
export const REPLAY = '↻ 다시 로딩'

/** 취소 가능한 대기 묶음. 취소되면 wait은 false로 끝나요(자동 재생이 멈춰 있지 않게). */
export interface Runner {
  cancel: () => void
  token: () => () => boolean
  /** ms는 슬로우 모션 반영, raw면 그대로 */
  wait: (ms: number, raw?: boolean) => Promise<boolean>
}

export function useRunner(): Runner {
  const m = useMotion()
  const r = useRef<Runner | null>(null)
  if (!r.current) {
    let gen = 0
    const ts = new Set<{ id: number; r: (v: boolean) => void }>()
    r.current = {
      cancel() { gen++; ts.forEach(o => { clearTimeout(o.id); o.r(false) }); ts.clear() },
      token() { const g = gen; return () => g === gen },
      wait(ms, raw) {
        return new Promise(res => {
          const o = { id: 0, r: res }
          o.id = window.setTimeout(() => { ts.delete(o); res(true) }, raw ? ms : m.D(ms))
          ts.add(o)
        })
      },
    }
  }
  const run = r.current
  useEffect(() => () => run.cancel(), [run])
  return run
}

/** 프레임마다 fn(0→1). 취소되면 false, 끝나면 true. paused()가 true인 동안은 시간이 멈춰요. */
export async function tween(R: Runner, D: (ms: number) => number, ms: number, fn: (k: number) => void, paused: () => boolean = () => false) {
  const ok = R.token(), dur = D(ms)
  let el = 0, last = now()
  for (;;) {
    await new Promise(r => requestAnimationFrame(r))
    if (!ok()) return false
    const t = now()
    if (!paused()) el += t - last
    last = t
    const k = Math.min(1, el / dur)
    fn(k)
    if (k >= 1) return true
  }
}

/** 실제 네트워크처럼 들쭉날쭉한 진행 */
export function uneven(k: number) {
  const pts = [[0, 0], [0.22, 0.34], [0.4, 0.41], [0.66, 0.78], [0.82, 0.86], [1, 1]]
  for (let i = 1; i < pts.length; i++) if (k <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
    return y0 + ((y1 - y0) * (k - x0)) / (x1 - x0)
  }
  return 1
}
