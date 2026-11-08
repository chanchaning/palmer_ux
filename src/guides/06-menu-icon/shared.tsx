import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

/* ---- 아이콘 SVG ---- */
export type IconKey = 'hb' | 'kebab' | 'meat' | 'waffle' | 'bento' | 'doner' | 'veg' | 'stair' | 'slider'

const L = (c: string, x1: number, y1: number, x2: number, y2: number) => <line key={c} className={c} x1={x1} y1={y1} x2={x2} y2={y2} />
const C = (key: string, cls: string, x: number, y: number, r: number) => <circle key={key} className={cls} cx={x} cy={y} r={r} />
const G3 = [3.5, 10, 16.5], D3 = [5, 12, 19]

const ICONS: Record<IconKey, ReactNode> = {
  hb: [L('l1', 4, 6, 20, 6), L('l2', 4, 12, 20, 12), L('l3', 4, 18, 20, 18)],
  kebab: [C('a', 'f', 12, 5, 2), C('b', 'f', 12, 12, 2), C('c', 'f', 12, 19, 2)],
  meat: [C('a', 'f', 5, 12, 2), C('b', 'f', 12, 12, 2), C('c', 'f', 19, 12, 2)],
  waffle: G3.flatMap(y => G3.map(x => <rect key={x + '-' + y} className="f" x={x} y={y} width="4" height="4" rx="1" />)),
  bento: D3.flatMap(y => D3.map(x => C(x + '-' + y, 'f', x, y, 2))),
  doner: [L('l1', 4, 6, 20, 6), L('l2', 4, 12, 15, 12), L('l3', 4, 18, 10, 18)],
  veg: [L('l1', 4, 6, 20, 6), L('l2', 4, 12, 14, 12), L('l3', 4, 18, 20, 18)],
  stair: [L('l1', 4, 6, 10, 6), L('l2', 9, 12, 15, 12), L('l3', 14, 18, 20, 18)],
  slider: [L('l1', 4, 6, 20, 6), L('l2', 4, 12, 20, 12), L('l3', 4, 18, 20, 18), C('k1', 'k', 15, 6, 2.4), C('k2', 'k', 8, 12, 2.4), C('k3', 'k', 16, 18, 2.4)],
}

/** 메뉴 아이콘 (<i><svg/></i>) */
export function Icon({ k }: { k: IconKey }) {
  return <i><svg className={'mi-svg ' + k} viewBox="0 0 24 24" aria-hidden="true">{ICONS[k]}</svg></i>
}

/** 큰 아이콘 + 설명. 누르면 데모 안의 실제 버튼을 대신 눌러요 */
export function Hero({ k, label, title, sub, hint, open, flip, target, bigRef }: {
  k: IconKey; label: string; title: string; sub: string; hint: string
  open: boolean; flip?: boolean
  target: RefObject<HTMLElement | null>
  bigRef?: RefObject<HTMLButtonElement | null>
}) {
  return (
    <div className="mi-hero">
      <button ref={bigRef} className={'mi-big' + (open ? ' is-open' : '') + (flip ? ' mi-flip' : '')} aria-label={label}
        onClick={() => target.current?.click()}><Icon k={k} /></button>
      <div className="mi-cap"><b>{title}</b><span>{sub}</span><em>{hint}</em></div>
    </div>
  )
}

/** 바깥(zone 밖)을 누르면 닫기 */
export function useOutside(open: boolean, zone: () => (Element | null | undefined)[], close: () => void) {
  const latest = useRef({ zone, close })
  latest.current = { zone, close }
  useEffect(() => {
    if (!open) return
    const on = (e: PointerEvent) => {
      const t = e.target as Node
      if (!latest.current.zone().some(z => z && z.contains(t))) latest.current.close()
    }
    document.addEventListener('pointerdown', on)
    return () => document.removeEventListener('pointerdown', on)
  }, [open])
}
