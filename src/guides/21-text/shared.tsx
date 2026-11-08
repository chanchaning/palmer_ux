import { Fragment, useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useMotion } from '../../lib/motion'

class Stop extends Error {}

/** 재생 함수 실행기 — 다시 누르면 이전 재생은 멈춰요. sl(ms)는 슬로우 모션을 따라요. */
export function useRun() {
  const m = useMotion()
  const gen = useRef(0)
  useEffect(() => () => { gen.current++ }, [])
  const run = useCallback(async (fn: (sl: (ms: number) => Promise<void>, alive: () => boolean) => Promise<void>) => {
    const my = ++gen.current
    const alive = () => my === gen.current
    const sl = async (ms: number) => { await m.sleep(ms); if (!alive()) throw new Stop() }
    try { await fn(sl, alive) } catch (e) { if (!(e instanceof Stop)) throw e }
  }, [m])
  const stop = useCallback(() => { gen.current++ }, [])
  return { run, stop }
}

/** 문장을 단어 → 글자로 쪼개 렌더링해요. 단어는 줄바꿈되지 않게 묶어요(한글 keep-all 효과).
 *  refs 에 글자 span 이 순서대로, words 에 단어 span 이 담겨요. */
export function Split({ text, chars, words, className = '' }: {
  text: string
  chars?: RefObject<HTMLElement[]>
  words?: RefObject<HTMLElement[]>
  className?: string
}) {
  if (chars) chars.current = []
  if (words) words.current = []
  const ws = text.split(' ')
  return (
    <span className={'tx-split ' + className}>
      <span className="tx-sr">{text}</span>
      {ws.map((w, wi) => (
        <Fragment key={wi}>
          <span className="tx-w" aria-hidden="true" ref={el => { if (el && words) words.current[wi] = el }}>
            {Array.from(w).map((ch, ci) => (
              <span key={ci} className="tx-c" ref={el => { if (el && chars) chars.current.push(el) }}>{ch}</span>
            ))}
          </span>
          {wi < ws.length - 1 && ' '}
        </Fragment>
      ))}
    </span>
  )
}

/** 작은 칩 묶음 (라벨 + 선택지) */
export function Opt<T extends string | number>({ label, value, options, onChange }: {
  label: ReactNode; value: T; options: readonly (readonly [T, ReactNode])[]; onChange: (v: T) => void
}) {
  return (
    <div className="tx-opt">
      <span className="tx-opt-l">{label}</span>
      <div className="tx-opt-c">
        {options.map(([v, l]) => (
          <button key={String(v)} type="button" className="chip" aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  )
}

/* ---------- 한글 자모 단계 (타이핑용) ---------- */
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
/** '한' → ['ㅎ', '하', '한'] */
export function jamoSteps(ch: string): string[] {
  const c = ch.charCodeAt(0) - 0xac00
  if (c < 0 || c > 11171) return [ch]
  const cho = Math.floor(c / 588), jung = Math.floor((c % 588) / 28), jong = c % 28
  const steps = [CHO[cho], String.fromCharCode(0xac00 + cho * 588 + jung * 28)]
  if (jong) steps.push(ch)
  return steps
}

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
