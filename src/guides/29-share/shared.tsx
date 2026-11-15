import type { ReactNode } from 'react'
import type { Person } from './data'

/* 선 아이콘 (실제 앱 로고 대신 쓰는 중립 아이콘) */
const P = {
  share: 'M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  shareA: 'M18 8a3 3 0 1 0-3-3M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  msg: 'M4 5h16v11H9l-5 4z',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  note: 'M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h3',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  plus: 'M4 4h16v16H4zM12 8v8M8 12h8',
  find: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8',
  print: 'M7 9V3h10v6M7 17H4v-8h16v8h-3M7 14h10v7H7z',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  folder: 'M3 6h6l2 2h10v11H3z',
  near: 'M12 12h.01M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8',
  cal: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  chat: 'M4 5h16v11h-6l-4 4v-4H4z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  send: 'M21 3 3 10l7 3 3 7zM10 13l11-10',
  fwd: 'M14 5l7 7-7 7M21 12H9a6 6 0 0 0-6 6',
  repost: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12l5 5 9-10',
  dl: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16',
  wifi: 'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
} as const
export type IcoName = keyof typeof P

export function Ico({ n, size = 18 }: { n: IcoName; size?: number }) {
  return (
    <svg className="sh-ico" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n]} />
    </svg>
  )
}

/** 사람 아바타 (이름 첫 글자) */
export function Av({ p, size = 40, badge }: { p: Person; size?: number; badge?: IcoName }) {
  return (
    <span className={'sh-av t' + p.tone} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {p.n[0]}
      {badge && <i className="sh-badge"><Ico n={badge} size={10} /></i>}
    </span>
  )
}

/** 상단 토스트 */
export function Toast({ t }: { t: { msg: ReactNode; on: boolean } }) {
  return <div className={'toast sh-toast' + (t.on ? ' on' : '')} role="status">{t.msg}</div>
}

/** 공유할 글 화면 (주말노트) */
export function Article({ children }: { children?: ReactNode }) {
  return (
    <div className="sh-article">
      <div className="sh-hero g3" aria-hidden="true" />
      <div className="sh-art-t">가을 캠핑 준비물 12가지</div>
      <div className="sh-art-by">채원 · 주말노트</div>
      <div className="fake-line" style={{ width: '92%' }} />
      <div className="fake-line" style={{ width: '80%' }} />
      <div className="fake-line" style={{ width: '86%' }} />
      {children}
    </div>
  )
}

/** 공유 대상 미리보기 썸네일 */
export function Thumb({ size = 40 }: { size?: number }) {
  return <span className="sh-thumb g3" style={{ width: size, height: size }} aria-hidden="true" />
}
