import { useRef } from 'react'
import type { DemoCtx } from '../../components/Card'
import { useMotion } from '../../lib/motion'

/** 기기의 ‘동작 줄이기’ 설정 */
export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

/** 데모 창 높이(px) — scroll.css 의 --sc-h 와 같아야 해요 */
export const VIEW_H = 300

export interface Scroller {
  ref: React.RefObject<HTMLDivElement | null>
  /** 사용자가 직접 만지면 자동 재생이 손을 떼요 */
  take: () => void
  /** 맨 위로 되돌리고 자동 재생을 다시 허용 */
  home: () => void
  /** 내려갈 수 있는 최대 거리 */
  max: () => number
  /** 자동 재생용: to 위치까지 ms 동안 부드럽게 스크롤 (슬로우 모션 반영) */
  glide: (c: DemoCtx, to: number, ms: number) => Promise<void>
}

/** 카드 안의 작은 스크롤 창 */
export function useScroller(): Scroller {
  const m = useMotion()
  const ref = useRef<HTMLDivElement>(null)
  const hands = useRef(false)
  const api = useRef<Scroller>({
    ref,
    take: () => { hands.current = true },
    home: () => { hands.current = false; if (ref.current) ref.current.scrollTop = 0 },
    max: () => (ref.current ? ref.current.scrollHeight - ref.current.clientHeight : 0),
    async glide(c, to, ms) {
      const el = ref.current
      if (!el || hands.current) return
      if (reduced()) { el.scrollTop = to; return }
      const from = el.scrollTop
      const k = m.isSlow() ? 4 : 1 // 슬로우 모션에서도 프레임은 촘촘하게
      const n = Math.max(1, Math.round(ms / 16) * k)
      for (let i = 1; i <= n; i++) {
        if (hands.current) return
        const t = i / n
        const e = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2
        el.scrollTop = from + (to - from) * e
        await c.sleep(16 / k)
      }
    },
  })
  return api.current
}
