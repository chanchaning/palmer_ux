import type { ReactNode } from 'react'

/** 방해도 표시 — Info spec의 [k, v]에서 k로 써요: [<Lv lv={2} />, '낮음'] */
export function Lv({ lv }: { lv: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span className="fb-lv" data-lv={lv} aria-label={'방해도 5단계 중 ' + lv}>
      방해도 {[0, 1, 2, 3, 4].map(i => <i key={i} className={i < lv ? 'on' : ''} />)}
    </span>
  )
}
export const lv = (n: 1 | 2 | 3 | 4 | 5, label: string): [ReactNode, ReactNode] => [<Lv lv={n} />, label]
