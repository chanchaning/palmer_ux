/** 선 아이콘 (stroke = currentColor) */
const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: 'ico-svg', 'aria-hidden': true }

export const IconReplay = () => (
  <svg {...base}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
)
export const IconTheme = () => (
  <svg {...base}><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none" /></svg>
)
export const IconSlow = () => (
  <svg {...base}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5" /><path d="M10 2h4" /></svg>
)
export const IconSearch = () => (
  <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const IconHome = () => (
  <svg {...base}><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /></svg>
)
export const IconArrow = () => (
  <svg {...base}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
)
export const IconGrid = () => (
  <svg {...base}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
)
export const IconDoc = () => (
  <svg {...base}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></svg>
)
export const IconMenu = () => (
  <svg {...base} width={18} height={18}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
)
export const IconSun = () => (
  <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
export const IconMoon = () => (
  <svg {...base}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>
)
export const IconPlay = () => (
  <svg {...base}><path d="M7 5v14l11-7z" /></svg>
)
export const IconUp = () => (
  <svg {...base} width={18} height={18}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>
)
