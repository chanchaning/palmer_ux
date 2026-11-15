import type { ReactNode, Ref } from 'react'
import { Seg } from '../../components/ui'

/** 이 가이드에 나오는 가상의 앱 이름 */
export const APP = '모락'

export type OS = 'ios' | 'and'
const OS_OPTS = [['ios', 'iOS 스타일'], ['and', 'Android 스타일']] as const
export function OsSeg({ os, onChange }: { os: OS; onChange: (o: OS) => void }) {
  return <Seg value={os} onChange={onChange} options={OS_OPTS} className="pm-seg" />
}

/* ---- 선 아이콘 ---- */
const PATHS = {
  bell: 'M6 9.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5M10 19.5a2 2 0 0 0 4 0',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  cam: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  photo: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  chev: 'M9.5 6l6 6-6 6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
} as const
export type IcoName = keyof typeof PATHS
export function Ico({ n, size = 20 }: { n: IcoName; size?: number }) {
  return (
    <svg className="pm-ico" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[n]} />
    </svg>
  )
}

/** 폰 프레임. cam 이면 상태 표시줄에 ‘사용 중’ 초록 점 */
export function Phone({ children, ref, cam, light }: { children: ReactNode; ref?: Ref<HTMLDivElement>; cam?: boolean; light?: boolean }) {
  return (
    <div className="device" ref={ref}>
      <div className={'statusbar' + (light ? ' light' : '')}>
        <span>9:41{cam && <i className="pm-ind" role="img" aria-label="카메라 사용 중" />}</span><span>●●● 100%</span>
      </div>
      {children}
    </div>
  )
}

/* ---- 시스템 허용 창 (OS가 그리는 창 — 일반적인 iOS·Android 모양) ---- */
export interface SysBtn { k: string; label: ReactNode; on: () => void; strong?: boolean }

export function SysDialog({ os, open, id, icon, title, body, children, btns }: {
  os: OS; open: boolean; id: string; icon?: IcoName; title: ReactNode; body?: ReactNode; children?: ReactNode; btns: SysBtn[]
}) {
  const stack = os === 'and' || btns.length > 2
  return (
    <>
      <div className={'pm-scrim' + (open ? ' on' : '')} />
      <div className={'pm-sys ' + os + (open ? ' on' : '')} role="alertdialog" aria-modal="true" aria-labelledby={id} inert={!open}>
        {os === 'and' && icon && <div className="pm-sys-ic"><Ico n={icon} size={22} /></div>}
        <h4 id={id}>{title}</h4>
        {body && <p>{body}</p>}
        {children}
        <div className={'pm-sys-btns' + (stack ? ' stack' : '')}>
          {btns.map(b => <button type="button" key={b.k} data-k={b.k} className={b.strong ? 'strong' : undefined} onClick={b.on}>{b.label}</button>)}
        </div>
      </div>
    </>
  )
}

/** 작은 지도: 정확한 점 / 대략적인 원 / 위치 없음 */
export function MiniMap({ mode, h = 150 }: { mode: 'precise' | 'approx' | 'none'; h?: number }) {
  return (
    <div className={'pm-map ' + mode} style={{ height: h }}>
      <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="200" height="150" className="pm-map-bg" />
        <path d="M-10 42L210 70M58-10L88 160M-10 118L210 104M150-10L128 160" className="pm-road" />
        <path d="M20 72L82 80M100 10L104 60M140 90L200 96" className="pm-road thin" />
        <path d="M150 20h30v30h-30zM14 128h30v30H14z" className="pm-park" />
        {mode === 'approx' && <circle cx="102" cy="80" r="54" className="pm-approx" />}
        {mode === 'precise' && <><circle cx="104" cy="78" r="15" className="pm-halo" /><circle cx="104" cy="78" r="6" className="pm-dot" /></>}
      </svg>
      {mode === 'none' && <span className="pm-map-off">위치 꺼짐</span>}
    </div>
  )
}

/** 사진 썸네일 (그라디언트 조각) */
export function Tile({ i }: { i: number }) {
  return <span className={'pm-tile g' + ((i % 4) + 1)} style={{ filter: `hue-rotate(${(i * 37) % 120}deg)` }} />
}
