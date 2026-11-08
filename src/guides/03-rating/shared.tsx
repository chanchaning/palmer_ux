import type { CSSProperties } from 'react'

/** 별 채움 비율(--f) 스타일 */
export const fv = (f: number) => ({ ['--f' as string]: f }) as CSSProperties

/** CSS 애니메이션 다시 시작 (.pop) */
export function bump(el: Element | null) {
  if (!el) return
  el.classList.remove('pop')
  void (el as HTMLElement).offsetWidth
  el.classList.add('pop')
}
