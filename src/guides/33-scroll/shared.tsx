import type { ReactNode } from 'react'
import type { Scroller } from './util'

/** 라벨 + 선택지 */
export function Knob({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="sc-knob"><span className="sc-knob-l">{label}</span>{children}</div>
}

/** 카드 안의 작은 스크롤 창. 키보드로도 내릴 수 있게 초점을 받아요. */
export function View({ s, label, className = '', onScroll, children }: {
  s: Scroller; label: string; className?: string; onScroll?: (el: HTMLDivElement) => void; children: ReactNode
}) {
  return (
    <div className={'sc-view ' + className} ref={s.ref} tabIndex={0} role="region" aria-label={label + ' (스크롤 영역)'}
      onScroll={onScroll && (e => onScroll(e.currentTarget))}
      onWheel={s.take} onTouchStart={s.take} onPointerDown={s.take} onKeyDown={s.take}>
      {children}
    </div>
  )
}

/** 본문 자리를 채우는 짧은 글 */
export function Para({ children }: { children: ReactNode }) {
  return <p className="sc-p">{children}</p>
}
