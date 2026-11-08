import { useMemo, useRef, useState } from 'react'
import { DemoCancelled, type DemoCtx } from '../../components/Card'

export type Pt = { x: number; y: number }

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const now = () => performance.now()
const frame = () => new Promise<number>(r => requestAnimationFrame(r))

/** 컨테이너(테두리 안쪽) 기준 좌표 */
export const loc = (e: { clientX: number; clientY: number }, host: HTMLElement): Pt => {
  const r = host.getBoundingClientRect()
  return { x: e.clientX - r.left - host.clientLeft, y: e.clientY - r.top - host.clientTop }
}
export const cap = (el: Element, e: { pointerId: number }) => { try { el.setPointerCapture(e.pointerId) } catch { /* 무시 */ } }

/** 요소 가운데 (host 기준) */
export const center = (host: HTMLElement, el: Element): Pt => {
  const d = host.getBoundingClientRect(), r = el.getBoundingClientRect()
  return { x: r.left - d.left - host.clientLeft + r.width / 2, y: r.top - d.top - host.clientTop + r.height / 2 }
}

/** 최근 100ms 속도 (px/ms) */
export const velo = (pts: { x: number; t: number }[]) => {
  const last = pts[pts.length - 1]
  let first = last
  for (let i = pts.length - 1; i >= 0 && last.t - pts[i].t < 100; i--) first = pts[i]
  return last.t - first.t > 0 ? (last.x - first.x) / (last.t - first.t) : 0
}

/** 슬로우 모션과 무관한 실제 시간 대기 (제스처 판정 시간을 맞추기 위해) */
export async function rawSleep(c: DemoCtx, ms: number) {
  if (!c.alive()) throw new DemoCancelled()
  await new Promise(r => setTimeout(r, ms))
  if (!c.alive()) throw new DemoCancelled()
}

const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/** ms 동안 from → to 로 움직이며 fn(점) 호출. 재생이 취소되면 중단 */
export async function glide(c: DemoCtx, D: (ms: number) => number, from: Pt, to: Pt, ms: number, fn: (p: Pt) => void, ease = inOut) {
  const t0 = now(), dur = D(ms)
  for (;;) {
    if (!c.alive()) throw new DemoCancelled()
    const k = Math.min(1, (now() - t0) / dur), e = ease(k)
    fn({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e })
    if (k >= 1) return
    await frame()
  }
}

/** 자동 재생용 가짜 손가락: <i className="gs-finger" ref={F.ref} /> */
export function useFinger() {
  const ref = useRef<HTMLElement>(null)
  return useMemo(() => ({
    ref,
    at(p: Pt, down = false) {
      const f = ref.current
      if (!f) return
      f.style.left = p.x + 'px'; f.style.top = p.y + 'px'
      f.classList.add('on'); f.classList.toggle('down', down)
    },
    hide() { ref.current?.classList.remove('on', 'down') },
  }), [])
}

/** 힌트 손가락 숨김 상태 (직접 만짐 · 시범 중) */
export function useSim() {
  const [touched, setTouched] = useState(false)
  const [sim, setSim] = useState(false)
  return {
    cls: (touched ? ' gs-touched' : '') + (sim ? ' gs-sim' : ''),
    touch: () => setTouched(true),
    begin: () => setSim(true),
    end: () => setSim(false),
  }
}
