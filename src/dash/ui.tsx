/* 관제 대시보드 탭 공용 UI — 근거 표기, 우선순위 배지, 스파크라인, 아날로그 막대, HMI 프레임 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PRI, type Pri } from './data'

/* ---------- 근거 표기 ---------- */
export type RefKind = 'paper' | 'standard' | 'book' | 'reported' | 'practice'
const KIND: Record<RefKind, string> = { paper: '논문', standard: '표준', book: '책', reported: '보고된 수치', practice: '실무 경험' }
export interface RefItem { kind: RefKind; text: ReactNode; url?: string }
/** 탭 맨 아래 참고 문헌 */
export function Refs({ items, note }: { items: RefItem[]; note?: ReactNode }) {
  return (
    <section className="sys-sec wide dash-refs" id="dash-refs">
      <header className="sys-sec-head"><div><h3>근거와 참고 문헌</h3>
        <p>{note ?? <>‘보고된 수치’는 원문이 아닌 업체·2차 자료에서 확인한 값이에요. 방향을 잡는 근거로 쓰고, 그대로 기준값으로 옮기지 마세요.</>}</p>
      </div></header>
      <ol>
        {items.map((r, i) => (
          <li key={i}>
            <span className={'dash-kind k-' + r.kind}>{KIND[r.kind]}</span>
            <span>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.text}</a> : r.text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
/** 본문 안 짧은 출처 표시: <Cite n={1} /> → [1] */
export function Cite({ n }: { n: number | string }) {
  return <a className="dash-cite" href="#dash-refs" onClick={e => { e.preventDefault(); document.getElementById('dash-refs')?.scrollIntoView({ behavior: 'smooth' }) }}>[{n}]</a>
}
/** 논문·표준에서 가져온 핵심 문장 강조 상자 */
export function Finding({ src, children }: { src: ReactNode; children: ReactNode }) {
  return <figure className="dash-finding"><blockquote>{children}</blockquote><figcaption>{src}</figcaption></figure>
}

/* ---------- 우선순위 배지: 색 + 모양 + 숫자 ---------- */
export function PriBadge({ p, label = false, size = 18 }: { p: Pri; label?: boolean; size?: number }) {
  const s = PRI[p].shape
  return (
    <span className={'dash-pri p' + p} title={`우선순위 ${p} · ${PRI[p].name}`}>
      <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
        {s === 'square' && <rect x="2" y="2" width="16" height="16" rx="2" />}
        {s === 'triangle' && <path d="M10 1.5 19 18H1z" />}
        {s === 'circle' && <circle cx="10" cy="10" r="8.5" />}
        <text x="10" y={s === 'triangle' ? 15.5 : 14.2} textAnchor="middle">{PRI[p].short}</text>
      </svg>
      {label && <span>{PRI[p].name}</span>}
      {!label && <span className="tx-sr" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>우선순위 {p} {PRI[p].name}</span>}
    </span>
  )
}

/* ---------- 스파크라인 (정상 범위 띠 포함) ---------- */
export function Sparkline({ data, w = 120, h = 32, min, max, band, className = '' }: {
  data: number[]; w?: number; h?: number; min?: number; max?: number; band?: [number, number]; className?: string
}) {
  const lo = min ?? Math.min(...data), hi = max ?? Math.max(...data)
  const y = (v: number) => h - 2 - ((v - lo) / (hi - lo || 1)) * (h - 4)
  const x = (i: number) => (i / Math.max(1, data.length - 1)) * (w - 4) + 2
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const last = data[data.length - 1]
  return (
    <svg className={'dash-spark ' + className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {band && (() => { const b0 = Math.max(lo, Math.min(hi, band[0])), b1 = Math.max(lo, Math.min(hi, band[1])); return <rect className="band" x="0" width={w} y={y(b1)} height={Math.max(0, y(b0) - y(b1))} /> })()}
      <path d={d} />
      <circle cx={x(data.length - 1)} cy={y(last)} r="2.4" />
    </svg>
  )
}

/* ---------- 아날로그 막대: 현재 값이 정상 범위 안인지 숫자를 안 읽고도 보여요 ---------- */
export function AnalogBar({ value, min, max, normal, alarm, unit = '', name, w = 160 }: {
  value: number; min: number; max: number; normal: [number, number]; alarm?: [number, number]; unit?: string; name?: string; w?: number | string
}) {
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
  const out = value < normal[0] || value > normal[1]
  const bad = alarm ? value < alarm[0] || value > alarm[1] : false
  return (
    <div className={'dash-analog' + (out ? ' out' : '') + (bad ? ' bad' : '')} style={{ width: w }} role="img"
      aria-label={`${name ?? ''} ${value}${unit}, 정상 범위 ${normal[0]}~${normal[1]}${unit}${out ? ', 범위 밖' : ''}`}>
      <div className="track">
        {alarm && <i className="al lo" style={{ left: 0, width: pct(alarm[0]) + '%' }} />}
        {alarm && <i className="al hi" style={{ left: pct(alarm[1]) + '%', right: 0 }} />}
        <i className="nb" style={{ left: pct(normal[0]) + '%', width: pct(normal[1]) - pct(normal[0]) + '%' }} />
        <b className="ptr" style={{ left: pct(value) + '%' }} />
      </div>
    </div>
  )
}

/* ---------- HMI 프레임: 관제 화면 목업 ---------- */
export function Hmi({ title, right, children, dark = false, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div className={'dash-hmi' + (dark ? ' dark' : '') + ' ' + className}>
      {(title || right) && <div className="dash-hmi-bar"><b>{title}</b><span>{right}</span></div>}
      <div className="dash-hmi-body">{children}</div>
    </div>
  )
}

/* ---------- 시계: 화면 안 '지금 시각' ---------- */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), ms); return () => clearInterval(t) }, [ms])
  return now
}
export const hhmmss = (d: Date) => d.toTimeString().slice(0, 8)

/** 화면에 보이는 동안만 도는 타이머 (오래 켜 두는 탭에서 CPU 아끼기) */
export function useVisibleInterval(fn: () => void, ms: number, on = true) {
  const ref = useRef<HTMLDivElement>(null)
  const cb = useRef(fn); cb.current = fn
  useEffect(() => {
    if (!on || !ref.current) return
    let t = 0, visible = false
    const io = new IntersectionObserver(es => {
      visible = es[0].isIntersecting
      clearInterval(t)
      if (visible) t = window.setInterval(() => cb.current(), ms)
    })
    io.observe(ref.current)
    return () => { io.disconnect(); clearInterval(t) }
  }, [ms, on])
  return ref
}

/* ---------- 흔한 실수 카드: 흔한 대시보드는 → 왜 문제인가 → 이렇게 올려요 ---------- */
export type Sev = '치명' | '높음' | '보통'
/** 탭마다 '흔한 실수' 섹션 안에서 써요. before/after 를 주면 '흔한 화면 ↔ 업그레이드' 토글이 생겨요. */
export function CaseCard({ sev, title, now, why, fix, before, after, good = false }: {
  sev: Sev; title: ReactNode
  /** 흔한 대시보드가 하는 방식 */
  now: ReactNode
  /** 어떤 원칙을 어기나 (근거 Cite 포함) */
  why: ReactNode
  /** 업그레이드 안 */
  fix: ReactNode
  before?: ReactNode; after?: ReactNode
  /** 잘한 예면 true */
  good?: boolean
}) {
  const [v, setV] = useState<'now' | 'up'>('now')
  return (
    <article className={'neo-case' + (good ? ' good' : '')}>
      <header>
        <span className={'neo-sev s-' + (good ? 'good' : sev)}>{good ? '잘한 예' : sev}</span>
        <h4>{title}</h4>
      </header>
      {(before || after) && (
        <div className="neo-vs">
          <div className="seg-x neo-vs-tog" role="radiogroup" aria-label="흔한 화면과 업그레이드 비교">
            <button type="button" role="radio" aria-checked={v === 'now'} className={v === 'now' ? 'on' : ''} onClick={() => setV('now')}>흔한 화면</button>
            <button type="button" role="radio" aria-checked={v === 'up'} className={v === 'up' ? 'on' : ''} onClick={() => setV('up')}>업그레이드하면</button>
          </div>
          <div className="neo-vs-stage">{v === 'now' ? before : after}</div>
        </div>
      )}
      <dl className="neo-case-dl">
        <div><dt>{good ? '이렇게 해요' : '흔한 화면은'}</dt><dd>{now}</dd></div>
        <div><dt>{good ? '왜 좋은가' : '왜 문제인가'}</dt><dd>{why}</dd></div>
        <div><dt>{good ? '더 살리려면' : '이렇게 올려요'}</dt><dd>{fix}</dd></div>
      </dl>
    </article>
  )
}
