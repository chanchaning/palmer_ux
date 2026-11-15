import { useCallback, useEffect, useRef } from 'react'
import { useMotion } from '../../lib/motion'

class Stop extends Error {}

/** 재생 함수 실행기 — 다시 누르면 이전 재생은 멈춰요. sl(ms)는 슬로우 모션을 따라요. */
export function useRun() {
  const m = useMotion()
  const gen = useRef(0)
  useEffect(() => () => { gen.current++ }, [])
  const run = useCallback(async (fn: (sl: (ms: number) => Promise<void>) => Promise<void>) => {
    const my = ++gen.current
    const sl = async (ms: number) => { await m.sleep(ms); if (my !== gen.current) throw new Stop() }
    try { await fn(sl) } catch (e) { if (!(e instanceof Stop)) throw e }
  }, [m])
  const stop = useCallback(() => { gen.current++ }, [])
  return { run, stop }
}

/** 애니메이션이 끝나거나 취소될 때까지 기다려요 */
export const fin = (a?: Animation) => a?.finished.then(() => {}, () => {})

/** 기기의 ‘동작 줄이기’ 설정 */
export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
