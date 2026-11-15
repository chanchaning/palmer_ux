import { createContext, useContext, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { Seg, useTimers } from '../../components/ui'

/* ---- 화면 크기 ---- */
export type View = 'desk' | 'mob'
const VIEWS = [['desk', 'PC'], ['mob', '모바일']] as const

/** PC / 모바일 전환 */
export function ViewSeg({ view, set }: { view: View; set: (v: View) => void }) {
  return <Seg value={view} onChange={set} options={VIEWS} className="pl-vseg" />
}

/* ---- 구역 강조 ---- */
const HlCtx = createContext<string | null>(null)

/** 강조할 수 있는 구역. k가 강조 중이면 주황 점선, 다른 구역이 강조 중이면 흐려져요 */
export function R({ k, className = '', children, style, onClick, label, group, ref }: {
  k: string; className?: string; children?: ReactNode; style?: CSSProperties
  /** 안에 다른 구역을 품은 묶음이면 흐리지 않아요 (안쪽 강조가 같이 흐려지지 않게) */
  group?: boolean
  /** 있으면 <button>으로 그려요 */
  onClick?: () => void
  /** 버튼일 때 aria-label */
  label?: string
  ref?: Ref<HTMLElement>
}) {
  const hl = useContext(HlCtx)
  const cls = 'pl-r ' + className + (hl === k ? ' is-hl' : hl && !group ? ' is-dim' : '')
  if (onClick) return <button type="button" className={cls} style={style} onClick={onClick} aria-label={label} ref={ref as Ref<HTMLButtonElement>}>{children}</button>
  return <div className={cls} style={style} ref={ref as Ref<HTMLDivElement>}>{children}</div>
}

/** 브라우저 틀 + 구역 강조 범위 */
export function Browser({ view, url, hl, children, ref }: {
  view: View; url: string; hl: string | null; children: ReactNode; ref?: Ref<HTMLDivElement>
}) {
  return (
    <div className="pl-vp">
      <div className={'pl-browser ' + view} ref={ref}>
        <div className="pl-chrome" aria-hidden="true"><i /><i /><i /><span>{url}</span></div>
        <HlCtx.Provider value={hl}>
          <div className="pl-page">{children}</div>
        </HlCtx.Provider>
      </div>
    </div>
  )
}

/** 구역 이름 버튼 — 올리거나 누르면 화면에서 그 구역을 표시해요 */
export function Regions({ items, hl, set }: { items: readonly (readonly [string, string])[]; hl: string | null; set: (k: string | null) => void }) {
  return (
    <div className="pl-regions" role="group" aria-label="구역 표시">
      {items.map(([k, label]) => (
        <button key={k} type="button" aria-pressed={hl === k}
          onPointerEnter={e => { if (e.pointerType === 'mouse') set(k) }}
          onPointerLeave={e => { if (e.pointerType === 'mouse') set(null) }}
          onFocus={() => set(k)} onBlur={() => set(null)}
          onClick={() => set(hl === k ? null : k)}>{label}</button>
      ))}
    </div>
  )
}

/** ‘이렇게 말해요’ 문장 + 복사 */
export function Say({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  const timers = useTimers()
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* 복사할 수 없는 환경 */ }
    setOk(true)
    timers.clear()
    timers.set(() => setOk(false), 1600)
  }
  return (
    <div className="pl-say">
      <div className="pl-say-h">
        <span>이렇게 말해요</span>
        <button type="button" className="btn ghost sm" onClick={copy} aria-label="문장 복사">{ok ? '✓ 복사됨' : '복사'}</button>
      </div>
      <p className="allow-select" aria-live="polite">‘{text}’</p>
    </div>
  )
}
