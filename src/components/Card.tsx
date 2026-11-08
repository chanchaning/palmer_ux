import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useMotion, type Motion } from '../lib/motion'

/* ------------------------------------------------------------------ *
 *  자동 재생 데모
 *  - Card에 demo={useDemo({ reset, play })} 를 넘기면
 *    카드가 화면에 60% 보일 때 최초 1회 play, ▶ 다시 보기로 재실행.
 *  - play(c) 안에서는 c.sleep / c.press / c.tap 을 쓰세요.
 *    다시 보기나 화면 이탈(언마운트) 시 진행 중인 play는 자동으로 중단돼요.
 * ------------------------------------------------------------------ */

export class DemoCancelled extends Error {}

export interface DemoCtx {
  sleep: (ms: number) => Promise<void>
  press: (container: HTMLElement | null, el: HTMLElement | null) => Promise<void>
  tap: (container: HTMLElement | null, el: Element | null) => void
  /** 아직 이 재생이 유효한지 */
  alive: () => boolean
}

export interface Demo {
  reset?: () => void
  play: (c: DemoCtx) => Promise<void>
}

/** 최신 클로저를 유지하는 안정된 데모 객체 */
export function useDemo(d: Demo): Demo {
  const ref = useRef(d)
  ref.current = d
  const stable = useRef<Demo>({
    reset: () => ref.current.reset?.(),
    play: c => ref.current.play(c),
  })
  return stable.current
}

const CardCtx = createContext<{ replay: (() => void) | null }>({ replay: null })

function useRunner(demo: Demo | undefined, m: Motion) {
  const gen = useRef(0)
  const running = useRef(false)
  useEffect(() => () => { gen.current++ }, [])
  return useCallback(async () => {
    if (!demo) return
    const my = ++gen.current
    const alive = () => my === gen.current
    const guard = () => { if (!alive()) throw new DemoCancelled() }
    const c: DemoCtx = {
      alive,
      sleep: async ms => { guard(); await m.sleep(ms); guard() },
      tap: (dev, el) => { if (dev && el && alive()) m.tap(dev, el) },
      press: async (dev, el) => { guard(); if (!dev || !el) return; m.tap(dev, el); await m.sleep(200); guard(); el.click() },
    }
    running.current = true
    try {
      demo.reset?.()
      await c.sleep(350)
      await demo.play(c)
    } catch (e) {
      if (!(e instanceof DemoCancelled)) console.error(e)
    } finally {
      if (alive()) running.current = false
    }
  }, [demo, m])
}

interface CardProps {
  id: string
  num: string
  /** 제목 (한글) */
  title: ReactNode
  /** 영문 이름 */
  en?: string
  /** 한 줄 정의 */
  desc?: ReactNode
  /** 제목 위 작은 태그 */
  tag?: ReactNode
  demo?: Demo
  className?: string
  children: ReactNode
}

/** 단일 카드 (t-card) */
export function Card({ id, num, title, en, desc, tag, demo, className = '', children }: CardProps) {
  const m = useMotion()
  const el = useRef<HTMLElement>(null)
  const run = useRunner(demo, m)
  useEffect(() => {
    if (!demo || !el.current) return
    let played = false
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !played) { played = true; run(); io.disconnect() }
    }), { threshold: 0.6 })
    io.observe(el.current)
    return () => io.disconnect()
  }, [demo, run])
  return (
    <CardCtx.Provider value={{ replay: demo ? run : null }}>
      <article className={'card t-card ' + className} id={id} ref={el}>
        <div className="card-head">
          <div className="num">{num}</div>{tag}
          <h2>{title}{en && <span className="en-title">{en}</span>}</h2>
          {desc && <p className="key">{desc}</p>}
        </div>
        {children}
      </article>
    </CardCtx.Provider>
  )
}

/** 데모 영역 + 상태 문구 */
export function Stage({ children, log, logId }: { children: ReactNode; log?: ReactNode; logId?: string }) {
  return (
    <div className="t-stage">
      {children}
      {log !== undefined && <div className="t-log" id={logId} aria-live="polite">{log}</div>}
    </div>
  )
}

/** 스펙 칩 + 언제/주의 + 다시 보기 */
export function Info({ spec = [], usage = [], actions, replayLabel = '▶ 다시 보기' }: {
  spec?: [ReactNode, ReactNode][]
  usage?: [ReactNode, ReactNode][]
  actions?: ReactNode
  replayLabel?: string
}) {
  const { replay } = useContext(CardCtx)
  return (
    <div className="t-info">
      {spec.length > 0 && <div className="spec">{spec.map(([k, v], i) => <span key={i}>{k} <b>{v}</b></span>)}</div>}
      {usage.length > 0 && <dl className="usage">{usage.map(([k, v], i) => <UsageRow key={i} k={k} v={v} />)}</dl>}
      {(replay || actions) && (
        <div className="t-actions">
          {replay && <button className="btn ghost sm replay" onClick={replay}>{replayLabel}</button>}
          {actions}
        </div>
      )}
    </div>
  )
}
function UsageRow({ k, v }: { k: ReactNode; v: ReactNode }) {
  return <><dt>{k}</dt><dd>{v}</dd></>
}

/* ------------------------------------------------------------------ *
 *  좌우 비교 카드 (01 닮은꼴, 18 플랫폼 비교)
 * ------------------------------------------------------------------ */
export function PairCard({ id, num, a, b, desc, children, diff }: {
  id: string; num: string; a: ReactNode; b: ReactNode; desc?: ReactNode
  children: ReactNode
  diff?: [ReactNode, ReactNode, ReactNode][]
}) {
  return (
    <article className="card" id={id}>
      <div className="card-head">
        <div className="num">{num}</div>
        <h2><span className="a">{a}</span><span className="vs">vs</span><span className="b">{b}</span></h2>
        {desc && <p className="key">{desc}</p>}
      </div>
      <div className="demos">{children}</div>
      {diff && (
        <table className="diff"><tbody>
          {diff.map(([h, x, y], i) => <tr key={i}><th>{h}</th><td>{x}</td><td>{y}</td></tr>)}
        </tbody></table>
      )}
    </article>
  )
}

export function DemoPane({ side = 'a', label, en, children, log, logId }: {
  side?: 'a' | 'b'; label: ReactNode; en?: string; children: ReactNode; log?: ReactNode; logId?: string
}) {
  return (
    <div className={'demo' + (side === 'b' ? ' is-b' : '')}>
      <div className="demo-label"><span className="dot" />{label} {en && <span className="en">{en}</span>}</div>
      {children}
      {log !== undefined && <div className="log" id={logId}>{log}</div>}
    </div>
  )
}
