import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/** 이징 곡선 */
export const EASE = {
  std: 'cubic-bezier(.4,0,.2,1)',
  out: 'cubic-bezier(0,0,.2,1)',
  in: 'cubic-bezier(.4,0,1,1)',
  emph: 'cubic-bezier(.2,0,0,1)',
  spring: 'cubic-bezier(.34,1.56,.64,1)',
} as const

export type Rect = { left: number; top: number; width: number; height: number }

export interface Motion {
  /** 슬로우 모션 반영 시간 (×4) */
  D: (ms: number) => number
  /** D가 적용된 대기 */
  sleep: (ms: number) => Promise<void>
  /** WAAPI 애니메이션 (fill: both, D 적용) */
  A: (el: Element, frames: Keyframe[], ms: number, easing?: string, delay?: number) => Animation
  /** 실행 중 애니메이션 취소 */
  clearA: (...els: (Element | null | undefined)[]) => void
  /** container 기준 상대 좌표 */
  rel: (container: HTMLElement, el: Element) => Rect
  /** rect → left/top/width/height px 스타일 */
  px: (r: Rect) => { left: string; top: string; width: string; height: string }
  /** 탭 위치에 주황 파동 (자동 재생 연출) */
  tap: (container: HTMLElement, el: Element) => void
  /** tap 후 el.click() */
  press: (container: HTMLElement, el: HTMLElement) => Promise<void>
  isSlow: () => boolean
}

const MotionCtx = createContext<{ motion: Motion; slow: boolean; setSlow: (v: boolean) => void } | null>(null)

export function MotionProvider({ children }: { children: ReactNode }) {
  const [slow, setSlow] = useState(false)
  const slowRef = useRef(false)
  useEffect(() => {
    slowRef.current = slow
    document.documentElement.style.setProperty('--slow', slow ? '4' : '1')
  }, [slow])

  const motion = useMemo<Motion>(() => {
    const D = (ms: number) => ms * (slowRef.current ? 4 : 1)
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, D(ms)))
    const rel = (dev: HTMLElement, el: Element): Rect => {
      const d = dev.getBoundingClientRect(), r = el.getBoundingClientRect()
      return { left: r.left - d.left - dev.clientLeft, top: r.top - d.top - dev.clientTop, width: r.width, height: r.height }
    }
    const tap = (dev: HTMLElement, el: Element) => {
      if (getComputedStyle(dev).position === 'static') dev.style.position = 'relative'
      const r = rel(dev, el), t = document.createElement('span')
      t.className = 'tapdot'
      t.style.left = r.left + r.width / 2 - 22 + 'px'
      t.style.top = r.top + r.height / 2 - 22 + 'px'
      dev.appendChild(t)
      t.animate([{ transform: 'scale(.3)', opacity: 0.65 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: D(520), easing: EASE.out }).onfinish = () => t.remove()
    }
    return {
      D,
      sleep,
      A: (el, frames, ms, easing = EASE.std, delay = 0) => el.animate(frames, { duration: D(ms), easing, delay: D(delay), fill: 'both' }),
      clearA: (...els) => els.forEach(e => e?.getAnimations().forEach(a => a.cancel())),
      rel,
      px: r => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }),
      tap,
      press: async (dev, el) => { tap(dev, el); await sleep(200); el.click() },
      isSlow: () => slowRef.current,
    }
  }, [])

  const value = useMemo(() => ({ motion, slow, setSlow }), [motion, slow])
  return <MotionCtx.Provider value={value}>{children}</MotionCtx.Provider>
}

/** 모션 헬퍼 (안정된 객체 — 의존성 배열에 넣어도 안전) */
export function useMotion(): Motion {
  const c = useContext(MotionCtx)
  if (!c) throw new Error('MotionProvider missing')
  return c.motion
}

export function useSlowMotion() {
  const c = useContext(MotionCtx)
  if (!c) throw new Error('MotionProvider missing')
  return [c.slow, c.setSlow] as const
}
