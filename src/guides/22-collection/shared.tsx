import type { ReactNode } from 'react'
import type { Item } from './data'

/** 사진 자리 — 토큰 색 바탕 + 이모지 */
export function Thumb({ item, className = '', children }: { item: Item; className?: string; children?: ReactNode }) {
  return (
    <span className={'cl-thumb cl-t' + item.tone + ' ' + className} aria-hidden="true">
      <span className="cl-emo">{item.emoji}</span>
      {children}
    </span>
  )
}

/** 컨트롤 한 줄 (라벨 + 내용) */
export function Ctrl({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="cl-ctrl">
      <span className="cl-ctrl-l">{label}</span>
      {children}
    </div>
  )
}
