/** 선 아이콘 (stroke = currentColor) */
const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: 'ico-svg', 'aria-hidden': true }

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
