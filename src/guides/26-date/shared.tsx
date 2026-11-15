import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { TODAY, WD, addDays, fmt, fmtMonth, key, monthCells, same } from './date'

/** 컨트롤 한 줄 (라벨 + 내용) */
export function Ctrl({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="dt-ctrl">
      <span className="dt-ctrl-l">{label}</span>
      {children}
    </div>
  )
}

/** 달력 머리: ‹ 2026년 11월 › */
export function CalHead({ month, onMove, canPrev = true, canNext = true, children }: {
  month: Date; onMove: (delta: number) => void; canPrev?: boolean; canNext?: boolean; children?: ReactNode
}) {
  return (
    <div className="dt-head">
      <button type="button" className="dt-nav prev" aria-label="이전 달" disabled={!canPrev} onClick={() => onMove(-1)}>‹</button>
      <b aria-live="polite">{children ?? fmtMonth(month)}</b>
      <button type="button" className="dt-nav next" aria-label="다음 달" disabled={!canNext} onClick={() => onMove(1)}>›</button>
    </div>
  )
}

/**
 * 한 달 칸. 실제 달 길이·요일로 6주(42칸)를 만들어요.
 * - block(d): 막힌 이유(문자열)를 돌려주면 흐리게 + 누르면 onBlocked로 이유 안내
 * - cls(d): 'sel' | 'start' | 'end' | 'in' 같은 추가 클래스
 * - 방향키로 하루·한 주씩, PageUp/PageDown으로 한 달씩 움직여요
 */
export function MonthGrid({ month, label, block, cls, sub, onPick, onBlocked, onHover, onMonth, focusDate }: {
  month: Date
  label: string
  block?: (d: Date) => string | false
  cls?: (d: Date) => string
  sub?: (d: Date) => ReactNode
  onPick: (d: Date) => void
  onBlocked?: (d: Date, why: string) => void
  onHover?: (d: Date | null) => void
  /** 키보드가 다른 달로 넘어갈 때 (false를 돌려주면 막기) */
  onMonth?: (delta: number) => boolean | void
  focusDate?: Date | null
}) {
  const y = month.getFullYear(), m = month.getMonth()
  const cells = monthCells(y, m)
  const [fk, setFk] = useState<string | null>(null)
  const want = useRef(false)
  const grid = useRef<HTMLDivElement>(null)

  const inMonth = (d: Date) => d.getMonth() === m
  const fallback = focusDate && inMonth(focusDate) ? focusDate : inMonth(TODAY) && TODAY.getFullYear() === y ? TODAY : new Date(y, m, 1)
  const focusKey = fk && cells.some(d => inMonth(d) && key(d) === fk) ? fk : key(fallback)

  useEffect(() => {
    if (!want.current) return
    want.current = false
    grid.current?.querySelector<HTMLElement>(`[data-key="${focusKey}"]`)?.focus()
  })

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, d: Date) => {
    const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    let t: Date | null = null
    if (e.key in map) t = addDays(d, map[e.key])
    else if (e.key === 'Home') t = addDays(d, -d.getDay())
    else if (e.key === 'End') t = addDays(d, 6 - d.getDay())
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const dl = e.key === 'PageUp' ? -1 : 1
      const nm = new Date(d.getFullYear(), d.getMonth() + dl, 1)
      t = new Date(nm.getFullYear(), nm.getMonth(), Math.min(d.getDate(), new Date(nm.getFullYear(), nm.getMonth() + 1, 0).getDate()))
    }
    if (!t) return
    e.preventDefault()
    const delta = (t.getFullYear() - y) * 12 + t.getMonth() - m
    if (delta !== 0 && (!onMonth || onMonth(delta) === false)) return
    want.current = true
    setFk(key(t))
    if (delta === 0) grid.current?.querySelector<HTMLElement>(`[data-key="${key(t)}"]`)?.focus()
  }

  const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
  return (
    <div className="dt-grid" role="grid" aria-label={label} ref={grid} onPointerLeave={() => onHover?.(null)}>
      <div role="row" className="dt-wd">
        {WD.map((w, i) => <span key={w} role="columnheader" className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>{w}</span>)}
      </div>
      {weeks.map((wk, wi) => (
        <div role="row" key={wi} className="dt-week">
          {wk.map(d => {
            const k = key(d)
            if (!inMonth(d)) return <span key={k} role="gridcell" className="dt-out" aria-hidden="true">{d.getDate()}</span>
            const why = block?.(d) || false
            const extra = cls?.(d) ?? ''
            const picked = /\b(sel|start|end)\b/.test(extra)
            const today = same(d, TODAY)
            return (
              <span key={k} role="gridcell" aria-selected={picked} className={'dt-cell ' + extra + (d.getDay() === 0 ? ' sun' : d.getDay() === 6 ? ' sat' : '')}>
                <button type="button" data-key={k} tabIndex={k === focusKey ? 0 : -1}
                  className={(today ? 'today' : '') + (why ? ' off' : '')}
                  aria-disabled={why ? true : undefined}
                  aria-label={fmt(d) + (today ? ', 오늘' : '') + (why ? `, ${why}` : '')}
                  onClick={() => { setFk(k); if (why) onBlocked?.(d, why); else onPick(d) }}
                  onPointerEnter={() => onHover?.(d)} onFocus={() => onHover?.(d)}
                  onKeyDown={e => onKey(e, d)}>
                  <span className="n">{d.getDate()}</span>
                  {sub && <span className="s">{sub(d)}</span>}
                </button>
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
