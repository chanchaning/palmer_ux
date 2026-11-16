import { useState, type PointerEvent } from 'react'
import { useTimers } from '../../components/ui'

/** 기기의 ‘동작 줄이기’ 설정 */
export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** 지금 커서가 올라가 있는 항목 번호 (-1이면 없음).
 *  마우스는 올리고 내릴 때, 키보드는 초점이 오갈 때 바뀌어요.
 *  손가락은 ‘떼는 순간’이 곧 벗어남이라, 톡 누르면 1.6초 동안 보여줘요. */
export function useHot() {
  const timers = useTimers()
  const [hot, setHot] = useState(-1)
  const off = (i: number) => setHot(h => (h === i ? -1 : h))
  const bind = (i: number) => ({
    onPointerEnter: (e: PointerEvent) => {
      timers.clear(); setHot(i)
      if (e.pointerType === 'touch') timers.set(() => off(i), 1600)
    },
    onPointerLeave: (e: PointerEvent) => { if (e.pointerType !== 'touch') off(i) },
    onFocus: () => setHot(i),
    onBlur: () => off(i),
  })
  return { hot, setHot, bind }
}
