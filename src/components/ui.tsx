import { forwardRef, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

/** 세그먼트 토글 (2~n개). 스타일: .seg-x */
export function Seg<T extends string | number>({ value, onChange, options, className = '', style }: {
  value: T
  onChange: (v: T) => void
  options: readonly (readonly [T, ReactNode])[]
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={'seg-x ' + className} role="radiogroup" style={style}>
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" role="radio" data-v={String(v)} aria-checked={v === value}
          className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  )
}

/** 폰 프레임 (232×420). ref는 프레임 요소 */
export const Device = forwardRef<HTMLDivElement, { children: ReactNode; className?: string; light?: boolean; style?: CSSProperties }>(
  function Device({ children, className = '', light, style }, ref) {
    return (
      <div className={'device ' + className} ref={ref} style={style}>
        <div className={'statusbar' + (light ? ' light' : '')}><span>9:41</span><span>●●● 100%</span></div>
        {children}
      </div>
    )
  },
)

/** 범위 슬라이더 (채움 색 자동) */
export function Range({ value, min, max, step = 1, onChange, label, style }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; style?: CSSProperties
}) {
  const p = ((value - min) / (max - min)) * 100
  return (
    <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
      style={{ ...style, ['--p' as string]: p + '%' }}
      onChange={e => onChange(+e.target.value)} />
  )
}

/** 컴포넌트가 사라질 때 자동 정리되는 타이머 */
export function useTimers() {
  const ids = useRef(new Set<number>())
  useEffect(() => () => { ids.current.forEach(clearTimeout); ids.current.clear() }, [])
  const api = useRef({
    set(fn: () => void, ms: number) {
      const id = window.setTimeout(() => { ids.current.delete(id); fn() }, ms)
      ids.current.add(id)
      return id
    },
    clear(id?: number) {
      if (id === undefined) { ids.current.forEach(clearTimeout); ids.current.clear() } else { clearTimeout(id); ids.current.delete(id) }
    },
  })
  return api.current
}

/** 같은 키로 다시 그려 CSS 애니메이션 재시작 */
export function useRestartKey() {
  const k = useRef(0)
  return () => ++k.current
}
