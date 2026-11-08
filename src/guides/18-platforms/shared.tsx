import { useCallback, useEffect, useLayoutEffect, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { EASE, useMotion } from '../../lib/motion'

/* ---------- 아이콘 ---------- */
const PATHS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM20 20l-4.8-4.8',
  back: 'M20 12H5M11 5.5L4.5 12 11 18.5',
  chev: 'M15 5l-7 7 7 7',
  chevr: 'M9 5l7 7-7 7',
  down: 'M7 10l5 5 5-5',
  updown: 'M8 9.5l4-4 4 4M8 14.5l4 4 4-4',
  home: 'M4 11.5L12 4.5l8 7V20h-5.5v-5.5h-5V20H4z',
  star: 'M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7.9-5.6-4-3.9 5.6-.8z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.4-3.9 4.2-5.8 7.5-5.8s6.1 1.9 7.5 5.8z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  share: 'M12 15V4M8 7.5l4-4 4 4M5 12.5V20h14v-7.5',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  archive: 'M4 5h16v4H4zM5.5 9v10h13V9M10 13h4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  cursor: 'M9 4h6M9 20h6M12 4v16',
  bubble: 'M4 5h16v11h-9l-4 4v-4H4z',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  drop: 'M12 3.5c3 3.6 6 6.9 6 10.2a6 6 0 0 1-12 0c0-3.3 3-6.6 6-10.2z',
  layers: 'M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20.5h4',
} as const
export type IconName = keyof typeof PATHS | 'more' | 'morec'

export function Icon({ k }: { k: IconName }) {
  if (k === 'more') return (
    <svg className="pf-i" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5.5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="18.5" r="1.8" /></svg>
  )
  if (k === 'morec') return (
    <svg className="pf-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <circle cx="8" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
  return (
    <svg className="pf-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[k]} /></svg>
  )
}

/* ---------- 데이터 ---------- */
export const MAILS: [string, string, string][] = [['김', '디자인 리뷰 일정', '내일 오전 10시에 만나요'], ['박', '시안 v3 공유', '피드백 부탁드려요'], ['이', '점심 투표', '국수 vs 초밥'], ['최', '주간 리포트', '지표가 올랐어요'], ['정', '회의록', '오늘 논의한 내용 정리'], ['한', '휴가 신청', '다음 주 금요일'], ['윤', '배포 완료', 'v2.4.0 릴리스'], ['장', '계약서 검토', '첨부 파일 확인'], ['서', '채용 공고', '디자이너 1명']]
export const PHOTO = ['linear-gradient(135deg,#8ea2ff,#3b5bfd)', 'linear-gradient(135deg,#ffa36b,#e8590c)', 'linear-gradient(135deg,#63e6be,#0ca678)', 'linear-gradient(135deg,#f783ac,#d6336c)', 'linear-gradient(135deg,#ffe066,#fab005)', 'linear-gradient(135deg,#b197fc,#7048e8)']

/** CSS 변수가 섞인 style 객체 */
export const sx = (o: Record<string, string | number>) => o as CSSProperties

export function Photos() {
  return <div className="pf-photos">{PHOTO.map(g => <span key={g} style={{ background: g }} />)}</div>
}

export function MRows({ list }: { list: [string, string, string][] }) {
  return <>{list.map(m => <div className="pf-mli" key={m[1]}><span className="pf-av">{m[0]}</span><span className="t"><b>{m[1]}</b><small>{m[2]}</small></span></div>)}</>
}
export function HRows({ list }: { list: [string, string, string][] }) {
  return (
    <div className="pf-grp" style={{ marginTop: 2 }}>
      {list.map(m => <div className="pf-hli av" key={m[1]}><span className="pf-av">{m[0]}</span><span className="t"><b>{m[1]}</b><small>{m[2]}</small></span></div>)}
    </div>
  )
}

export function Lines({ widths = ['70%', undefined, '55%'], bg }: { widths?: (string | undefined)[]; bg?: string }) {
  return <div className="pf-lines">{widths.map((w, i) => <span key={i} className="fake-line" style={{ width: w, background: bg }} />)}</div>
}

/* ---------- 카드 골격 ---------- */
/** 원본 18 가이드의 카드: 제목(역할) + 영문 + 좌우 데모 + 비교 표 */
export function PfCard({ id, num, title, en, desc, tag, head, wide, children, diff }: {
  id: string; num: string; title: ReactNode; en: string; desc: ReactNode
  tag?: ReactNode; head?: ReactNode; wide?: boolean; children: ReactNode
  diff?: [ReactNode, ReactNode, ReactNode][]
}) {
  return (
    <article className={'card' + (wide ? ' pf-wide' : '')} id={'platforms-' + id}>
      <div className="card-head">
        <div className="num">{num}</div>{tag}
        <h2>{title}<span className="en-title">{en}</span></h2>
        <p className="key">{desc}</p>
        {head}
      </div>
      {children}
      {diff && (
        <table className="diff"><tbody>
          {diff.map(([h, a, b], i) => <tr key={i}><th>{h}</th><td>{a}</td><td>{b}</td></tr>)}
        </tbody></table>
      )}
    </article>
  )
}

/** 한쪽 데모 (pf-m = 머티리얼 / pf-h = HIG) */
export function Pane({ side, label, en, extra, children, log }: {
  side: 'm' | 'h'; label: ReactNode; en?: string; extra?: ReactNode; children: ReactNode; log: ReactNode
}) {
  return (
    <div className={'demo ' + (side === 'm' ? 'pf-m' : 'pf-h is-b')} data-side={side}>
      <div className="demo-label"><span className="dot" />{label} {en && <span className="en">{en}</span>}{extra}</div>
      {children}
      <div className="log" data-log={side}>{log}</div>
    </div>
  )
}

export function Diff3(name: [ReactNode, ReactNode], look: [ReactNode, ReactNode], act: [ReactNode, ReactNode]): [ReactNode, ReactNode, ReactNode][] {
  return [['이름', ...name], ['생김새 차이', ...look], ['동작 차이', ...act]]
}

/** 작은 알약 세그먼트 (.pf-mseg2). 같은 버튼을 다시 눌러도 onChange가 불려요(원본 동작) */
export function MSeg2<T extends string | number>({ value, onChange, options, ...rest }: {
  value: T; onChange: (v: T) => void; options: readonly (readonly [T, ReactNode])[]; [k: `data-${string}`]: string
}) {
  return (
    <div className="pf-mseg2" {...rest}>
      {options.map(([v, l]) => <button key={String(v)} className={v === value ? 'on' : ''} data-v={v} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  )
}

/** 범위 슬라이더 (.pf-range, 채움 --p) */
export function PfRange({ value, min, max, onChange, label, style, ...rest }: {
  value: number; min: number; max: number; onChange: (v: number) => void; label: string; style?: CSSProperties; [k: `data-${string}`]: string
}) {
  return (
    <input type="range" className="pf-range" min={min} max={max} value={value} aria-label={label} {...rest}
      style={{ ...style, ['--p' as string]: ((value - min) / (max - min)) * 100 + '%' }}
      onChange={e => onChange(+e.target.value)} />
  )
}

/* ---------- 머티리얼 물결 ---------- */
/** 페이지 루트의 onPointerDown — .pf-m 안의 .pf-rp 를 누르면 물결이 퍼져요 */
export function useRipple() {
  const { D } = useMotion()
  return useCallback((e: React.PointerEvent) => {
    const t = (e.target as Element).closest<HTMLElement>('.pf-rp')
    if (!t || !t.closest('.pf-m')) return
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative'
    const r = t.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2
    const sp = document.createElement('span')
    sp.className = 'pf-ripple'
    sp.style.width = sp.style.height = s + 'px'
    sp.style.left = e.clientX - r.left - s / 2 + 'px'
    sp.style.top = e.clientY - r.top - s / 2 + 'px'
    t.appendChild(sp)
    sp.animate([{ transform: 'scale(0)', opacity: 0.22 }, { transform: 'scale(1)', opacity: 0 }], { duration: D(600), easing: EASE.out }).onfinish = () => sp.remove()
  }, [D])
}

/* ---------- 탭 밑줄 위치 ---------- */
/** wrap 안의 button.on 아래에 .pf-ind 를 맞춰요 (deps가 바뀔 때 + 창 크기 변경) */
export function useTabInd(wrap: RefObject<HTMLElement | null>, deps: unknown[]) {
  const place = useCallback(() => {
    const w = wrap.current, b = w?.querySelector<HTMLElement>('button.on'), ind = w?.querySelector<HTMLElement>('.pf-ind')
    if (!b || !ind || !b.offsetWidth) return
    const iw = Math.min(b.offsetWidth - 16, 64)
    ind.style.left = b.offsetLeft + (b.offsetWidth - iw) / 2 + 'px'
    ind.style.width = iw + 'px'
  }, [wrap])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(place, deps)
  useEffect(() => {
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', place) }
  }, [place])
}

/** 바깥을 누르면 닫히는 메뉴 */
export function useOutsideClose(items: { open: boolean; menu: RefObject<HTMLElement | null>; trig: RefObject<HTMLElement | null>; close: () => void }[]) {
  useEffect(() => {
    const on = (e: PointerEvent) => {
      const t = e.target as Node
      items.forEach(({ open, menu, trig, close }) => {
        if (open && !menu.current?.contains(t) && !trig.current?.contains(t)) close()
      })
    }
    document.addEventListener('pointerdown', on)
    return () => document.removeEventListener('pointerdown', on)
  })
}
