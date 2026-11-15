/** 기기의 ‘동작 줄이기’ 설정 */
export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** useId 값을 SVG url(#id)에 안전한 글자로 바꿔요 */
export const safeId = (id: string) => 'tys' + id.replace(/[^a-zA-Z0-9_-]/g, '')

/** 같은 입력이면 늘 같은 값을 주는 흔들림 (-1 ~ 1) */
export const wobble = (i: number, seed = 1) => Math.sin(i * 12.9898 * seed + seed * 78.233) * 0.5 + Math.sin(i * 4.1 + seed) * 0.5
