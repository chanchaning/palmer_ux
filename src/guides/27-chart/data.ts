import { useState } from 'react'

/* 가상의 동네 카페 ‘달빛커피’ 데이터예요. 실제 매장·브랜드와 관계없어요. */
export const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const

/** 천 단위 쉼표 */
export const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')

/** 0.0~1.0 사이 고정 난수 (데이터가 매번 같게) */
export function seeded(seed: number) {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

/** 등장 애니메이션 상태: reset 때 hide, play 때 show */
export function useShow() {
  const [on, setOn] = useState(true)
  return { on, hide: () => setOn(false), show: () => setOn(true) }
}

/** 직선 이어 그리기 */
export const linePath = (pts: [number, number][]) => pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ')

/** min 부터 max 까지 보기 좋은 눈금 */
export function niceTicks(min: number, max: number, n = 4) {
  const raw = (max - min) / n
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= raw) ?? raw
  const lo = Math.floor(min / step) * step
  const out: number[] = []
  for (let v = lo; v <= max + step * 0.001; v += step) out.push(+v.toFixed(6))
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step)
  return out
}
