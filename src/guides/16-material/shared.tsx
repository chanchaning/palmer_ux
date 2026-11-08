import { createContext, useCallback, useContext, useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { EASE, useMotion } from '../../lib/motion'
import { useTimers } from '../../components/ui'

/* ---------- 아이콘 (Material Icons 형태의 단순 패스) ---------- */
export const ICONS = {
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  mail: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  star: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  chat: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  send: 'M2.01 21 23 12 2.01 3 2 10l15 2-15 2z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5c0-1.66-1.34-3-3-3s-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81A2.99 2.99 0 0 0 3 12a2.99 2.99 0 0 0 5.04 2.19l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  place: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z',
  event: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
} as const
export type IconName = keyof typeof ICONS

export function Ic({ n, style }: { n: IconName; style?: CSSProperties }) {
  return <i data-ic={n} style={style}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[n]} /></svg></i>
}

/* ---------- 알약 모양 세그먼트 (.md-seg) ---------- */
export function MdSeg<T extends string>({ id, value, onChange, options, style }: {
  id?: string
  value: T
  onChange: (v: T) => void
  options: readonly (readonly [T, ReactNode])[]
  style?: CSSProperties
}) {
  return (
    <div className="md-seg" id={id} style={style}>
      {options.map(([v, label]) => (
        <button key={v} type="button" data-v={v} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  )
}

/** range 채움 비율 (--p) */
export const fill = (v: number, min: number, max: number) => ({ ['--p' as string]: ((v - min) / (max - min)) * 100 + '%' }) as CSSProperties

/* ---------- 창(window) 드래그 리스너: 손을 떼거나 언마운트되면 자동 해제 ---------- */
export function useWinDrag() {
  const offs = useRef(new Set<() => void>())
  useEffect(() => {
    const s = offs.current
    return () => { s.forEach(f => f()); s.clear() }
  }, [])
  return useCallback((mv: ((e: globalThis.PointerEvent) => void) | null, up: (e: globalThis.PointerEvent) => void) => {
    const end = (e: globalThis.PointerEvent) => { off(); up(e) }
    const off = () => {
      if (mv) window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      offs.current.delete(off)
    }
    if (mv) window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    offs.current.add(off)
  }, [])
}

/* ---------- 리플 (이 가이드 범위에서만) ----------
 * 경계 있음(data-rip) = 터치 지점에서 가장 먼 모서리까지, 경계 없음(data-rip="u") = 가운데서 원형 */
type RippleFn = (host: HTMLElement, x?: number, y?: number) => () => void
const RipCtx = createContext<RippleFn>(() => () => {})
export const useRipple = () => useContext(RipCtx)

/** 누를 수 있는 요소([data-rip])에 리플을 붙이는 그리드 래퍼 */
export function RippleGrid({ className, children }: { className: string; children: ReactNode }) {
  const m = useMotion()
  const timers = useTimers()
  const offs = useRef(new Set<() => void>())
  useEffect(() => {
    const s = offs.current
    return () => { s.forEach(f => f()); s.clear() }
  }, [])

  const ripple = useCallback<RippleFn>((host, x, y) => {
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
    const r = host.getBoundingClientRect()
    const unb = host.dataset.rip === 'u'
    let cx = r.width / 2, cy = r.height / 2
    if (!unb && x != null && y != null) { cx = x - r.left; cy = y - r.top }
    const R = unb ? Math.max(r.width, r.height) * 0.62 + 4 : Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy))
    const s = document.createElement('span')
    s.className = 'md-rip'
    s.style.cssText = 'left:' + (cx - R) + 'px;top:' + (cy - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px'
    host.appendChild(s)
    const grow = s.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: m.D(unb ? 260 : Math.min(600, 260 + R * 1.4)), easing: EASE.out, fill: 'forwards' })
    let done = false
    return () => {
      if (done) return
      done = true
      const fade = () => { s.animate([{ opacity: 0.2 }, { opacity: 0 }], { duration: m.D(280), easing: EASE.std, fill: 'forwards' }).onfinish = () => s.remove() }
      grow.finished.then(fade, fade)
    }
  }, [m])

  const hostOf = (e: { target: EventTarget; currentTarget: HTMLElement }) => {
    const host = (e.target as Element).closest<HTMLElement>('[data-rip]')
    return host && e.currentTarget.contains(host) && !(host as HTMLButtonElement).disabled ? host : null
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button > 0) return
    const host = hostOf(e)
    if (!host) return
    const release = ripple(host, e.clientX, e.clientY)
    const up = () => { release(); off() }
    const off = () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      offs.current.delete(off)
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    offs.current.add(off)
  }
  // 키보드·자동 재생 클릭(detail 0)은 가운데서 리플
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.detail !== 0) return
    const host = hostOf(e)
    if (!host) return
    const rel = ripple(host)
    timers.set(rel, m.D(140))
  }
  return (
    <RipCtx.Provider value={ripple}>
      <div className={className} onPointerDown={onPointerDown} onClick={onClick}>{children}</div>
    </RipCtx.Provider>
  )
}
