import type { ReactNode } from 'react'
import { linePath } from './data'

/** 차트 위 말풍선. x·y 는 viewBox 좌표 */
export function Tip({ x, y, W, H, children }: { x: number; y: number; W: number; H: number; children: ReactNode }) {
  const p = x / W
  const side = p < 0.22 ? ' l' : p > 0.78 ? ' r' : ''
  return (
    <div className={'ch-tip' + side} style={{ left: p * 100 + '%', top: (y / H) * 100 + '%' }} aria-hidden="true">
      {children}
    </div>
  )
}

/** 범례 한 줄 (색 + 이름). 색만으로 구분하지 않게 늘 이름을 붙여요 */
export function Legend({ items }: { items: [string, string, ReactNode?][] }) {
  return (
    <div className="ch-legend">
      {items.map(([c, label, extra]) => (
        <span key={label}><i style={{ background: c }} />{label}{extra && <b>{extra}</b>}</span>
      ))}
    </div>
  )
}

/** 스파크라인 (축 없는 작은 선) */
export function Spark({ data, w = 84, h = 26, min, max, active, className = '' }: {
  data: number[]; w?: number; h?: number; min?: number; max?: number; active?: number | null; className?: string
}) {
  const lo = min ?? Math.min(...data), hi = max ?? Math.max(...data)
  const pad = 3
  const pts = data.map((v, i): [number, number] => [pad + (i / (data.length - 1)) * (w - pad * 2), h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2)])
  const dot = active ?? data.length - 1
  return (
    <svg className={'ch-spark ' + className} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path d={linePath(pts)} />
      <circle cx={pts[dot][0]} cy={pts[dot][1]} r="2.8" />
    </svg>
  )
}
