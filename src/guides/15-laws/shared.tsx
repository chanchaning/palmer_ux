import type { ReactNode } from 'react'

export const fmt = (n: number) => Math.round(n).toLocaleString() + 'ms'

export function Cat({ tone, children }: { tone?: 'o' | 'g'; children: ReactNode }) {
  return <span className={'lw-cat' + (tone ? ' ' + tone : '')}>{children}</span>
}

/** 결과 막대 한 줄 */
export function ResRow({ label, ratio, value, orange }: { label: string; ratio: number; value: string; orange?: boolean }) {
  return (
    <div className="lw-res-row">
      <span>{label}</span>
      <div className="lw-track"><div className={'lw-fill' + (orange ? ' o' : '')} style={{ width: ratio * 100 + '%' }} /></div>
      <b>{value}</b>
    </div>
  )
}

/** 요소를 흔들어 '틀렸어요' 표시 */
export function shake(el: Element | null) {
  if (!el) return
  el.classList.remove('shake')
  void (el as HTMLElement).offsetWidth
  el.classList.add('shake')
}
