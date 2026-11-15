import { useRef, useState } from 'react'
import type { View } from './shared'

/** 카드 하나의 공통 상태 (화면 크기 · 강조 구역 · 프레임 ref) */
export function useLayoutCard() {
  const [view, setView] = useState<View>('desk')
  const [hl, setHl] = useState<string | null>(null)
  const frame = useRef<HTMLDivElement>(null)
  return { view, setView, hl, setHl, frame }
}

/** 자동 재생: 구역 이름을 차례로 하나씩 표시 */
export async function tourRegions(c: { sleep: (ms: number) => Promise<void> }, keys: string[], set: (k: string | null) => void, ms = 650) {
  for (const k of keys) { set(k); await c.sleep(ms) }
  set(null)
}
