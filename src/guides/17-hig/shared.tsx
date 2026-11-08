import { useCallback, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { DemoCancelled } from '../../components/Card'
import { EASE, type Motion } from '../../lib/motion'

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** CSS 변수 스타일 */
export const vars = (o: Record<string, string | number>) => o as CSSProperties

/** state + 같은 값을 담은 ref (타이머·제스처 콜백에서 최신 값 읽기용). setter는 안정적 */
export function useStateRef<T>(init: T) {
  const [s, set] = useState(init)
  const r = useRef(init)
  const setter = useCallback((v: T) => { r.current = v; set(v) }, [])
  return [s, setter, r] as const
}

/** 데모가 취소됐으면 중단 */
export const guard = (alive: () => boolean) => { if (!alive()) throw new DemoCancelled() }

/** 진동 (지원 안 하면 false) */
export const vibrate = (ms: number) => {
  try { return !!(navigator.vibrate && navigator.vibrate(ms)) } catch { return false }
}

/** 탭 위치에 파란 고리 파동 (햅틱 연출) — 임시 요소 */
export function pulse(m: Motion, box: HTMLElement, el: Element) {
  const r = m.rel(box, el), s = document.createElement('span')
  s.className = 'hig-pulse'
  s.style.left = r.left + r.width / 2 - 22 + 'px'
  s.style.top = r.top + r.height / 2 - 22 + 'px'
  box.appendChild(s)
  s.animate([{ transform: 'scale(.5)', opacity: 0.9 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: m.D(480), easing: EASE.out }).onfinish = () => s.remove()
}

/** 자동 재생용 손가락 점 — 임시 요소 */
export function finger(box: HTMLElement) {
  const f = document.createElement('span')
  f.className = 'hig-finger'
  box.appendChild(f)
  return f
}

/** requestAnimationFrame 기반 0→1 진행 (취소 가능) */
export function tween(ms: number, step: (k: number) => void, alive: () => boolean = () => true) {
  return new Promise<void>(res => {
    const t0 = performance.now()
    const st = (now: number) => {
      if (!alive()) { res(); return }
      const k = Math.min(1, (now - t0) / ms)
      step(k)
      if (k < 1) requestAnimationFrame(st); else res()
    }
    requestAnimationFrame(st)
  })
}

/* ---------- 아이콘 ---------- */
const IC: Record<string, ReactNode> = {
  trash: <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />,
  folder: <path d="M3 6.5h6l2 2h10V19H3z" />,
  reply: <path d="M10 7 4 12.5l6 5.5M4.5 12.5H14a6 6 0 0 1 6 6" />,
  compose: <><path d="M4 20h4L19.5 8.5l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  share: <><path d="M12 3.5v11M7.5 8 12 3.5 16.5 8" /><path d="M6 11H5v9.5h14V11h-1" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.6v.4" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5z" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.6" /><rect x="13" y="4" width="7" height="7" rx="1.6" /><rect x="4" y="13" width="7" height="7" rx="1.6" /><rect x="13" y="13" width="7" height="7" rx="1.6" /></>,
  stack: <><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M6.5 6h11M9 3h6" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  home: <path d="M4 11 12 4l8 7v9h-5.5v-6h-5v6H4z" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></>,
  copy: <><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" /><path d="M15.5 8.5V4H4v11.5h4.5" /></>,
  pin: <path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7" />,
  more: <><circle cx="6" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18" cy="12" r="1.4" fill="currentColor" /></>,
}
export type IconName = keyof typeof IC

export function Icon({ name }: { name: string }) {
  return <i className="hig-ic"><svg viewBox="0 0 24 24" aria-hidden="true">{IC[name]}</svg></i>
}

/** 원본 .hig-seg (data-v로 자동 재생에서 찾음) */
export function HSeg<T extends string>({ value, onChange, options, id, ref }: {
  value: T; onChange: (v: T) => void; options: readonly (readonly [T, ReactNode])[]; id?: string; ref?: Ref<HTMLDivElement>
}) {
  return (
    <div className="hig-seg" id={id} role="radiogroup" ref={ref}>
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} data-v={v}
          className={v === value ? 'on' : undefined} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  )
}

/** 자동 재생에서 seg 버튼 찾기 */
export const segBtn = (seg: HTMLElement | null, v: string) => seg?.querySelector<HTMLElement>(`button[data-v="${v}"]`) ?? null
