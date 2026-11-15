import type { ReactNode } from 'react'

/** 10~18번 카드에서 같이 쓰는 작은 선 아이콘 (currentColor) */
const Svg = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
  <svg className="sm-ico" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
)
export const IcMenu = () => <Svg><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
export const IcKebab = () => <Svg><circle cx="12" cy="5.5" r="1.4" className="fill" /><circle cx="12" cy="12" r="1.4" className="fill" /><circle cx="12" cy="18.5" r="1.4" className="fill" /></Svg>
export const IcPlus = ({ size }: { size?: number }) => <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg>
export const IcStar = ({ on }: { on?: boolean }) => <Svg><path className={on ? 'fill' : ''} d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" /></Svg>
export const IcTrash = () => <Svg><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></Svg>
export const IcShare = () => <Svg><path d="M12 15V4M8 8l4-4 4 4M6 12v7h12v-7" /></Svg>
export const IcSearch = () => <Svg><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></Svg>
export const IcBack = () => <Svg><path d="M15 5l-7 7 7 7" /></Svg>
export const IcHeart = ({ on }: { on?: boolean }) => <Svg><path className={on ? 'fill' : ''} d="M12 19s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 2.5C19 14.6 12 19 12 19z" /></Svg>
export const IcCheck = () => <Svg size={16}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
export const IcChev = () => <Svg size={14}><path d="M6 9l6 6 6-6" /></Svg>
export const IcHome = () => <Svg><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /></Svg>
export const IcBell = () => <Svg><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20h4" /></Svg>
export const IcUser = () => <Svg><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Svg>
export const IcPlay = () => <Svg size={16}><path className="fill" d="M8 5l11 7-11 7z" /></Svg>
export const IcClose = () => <Svg size={16}><path d="M6 6l12 12M18 6L6 18" /></Svg>
