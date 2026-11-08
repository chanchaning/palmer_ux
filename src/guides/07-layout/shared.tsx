import type { CSSProperties, ReactNode } from 'react'

/** 썸네일·아바타용 그라데이션 클래스 */
export const GR = ['g1', 'g2', 'g3', 'g4']

/** 부품 이름표 (파란 알약) */
export function Tag({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return <span className={'ly-tag ' + className} style={style}>{children}</span>
}

/**
 * 자동 재생용: 스크롤 컨테이너를 부드럽게 움직여요.
 * alive()가 false가 되면(다시 보기·언마운트) 그 자리에서 멈춰요.
 */
export function scrollAnim(el: HTMLElement | null, to: number, ms: number, D: (ms: number) => number, alive: () => boolean = () => true) {
  return new Promise<void>(res => {
    if (!el) { res(); return }
    const from = el.scrollTop, t0 = performance.now(), dur = D(ms)
    const step = (now: number) => {
      if (!alive()) { res(); return }
      const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      el.scrollTop = from + (to - from) * e
      if (k < 1) requestAnimationFrame(step); else res()
    }
    requestAnimationFrame(step)
  })
}
