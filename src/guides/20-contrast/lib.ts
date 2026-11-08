/* 색 계산 — WCAG 2.x 상대 휘도·대비율, 보정, 색각 이상 시뮬레이션 */

export type RGB = [number, number, number]
export interface Parsed { rgb: RGB; alpha: number }

let ctx: CanvasRenderingContext2D | null = null
/** CSS 색 문자열(#333, 333333, rgb(), hsl(), 이름 등) → RGB. 실패 시 null */
export function parseColor(input: string): Parsed | null {
  let s = input.trim()
  if (!s) return null
  if (/^[0-9a-f]{3,8}$/i.test(s)) s = '#' + s
  if (!ctx) ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#010203'
  ctx.fillStyle = s
  const a = ctx.fillStyle
  if (a === '#010203' && s.toLowerCase() !== '#010203') return null // 해석 실패
  if (a.startsWith('#')) {
    const n = parseInt(a.slice(1), 16)
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 }
  }
  const m = a.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const [r, g, b, al = '1'] = m[1].split(',').map(x => x.trim())
  return { rgb: [+r, +g, +b], alpha: +al }
}

export const toHex = ([r, g, b]: RGB) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

/** 반투명 글자색을 배경 위에 합성 */
export const blend = (fg: Parsed, bg: RGB): RGB =>
  fg.alpha >= 1 ? fg.rgb : (fg.rgb.map((v, i) => v * fg.alpha + bg[i] * (1 - fg.alpha)) as RGB)

const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const unlin = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)

/** 상대 휘도 (0~1) */
export const luminance = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

/** 대비율 (1~21) */
export function contrast(a: RGB, b: RGB) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
/** 표시용: 소수 둘째 자리 내림 (4.499 → 4.49, 반올림으로 통과처럼 보이지 않게) */
export const fmtRatio = (r: number) => (Math.floor(r * 100) / 100).toFixed(2)

/* ---------- HSL ---------- */
export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
export function hslToRgb([h, s, l]: [number, number, number]): RGB {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255].map(Math.round) as RGB
}

/** 색감(색상·채도)은 두고 밝기만 바꿔 target 대비를 넘기는 가장 가까운 색. 없으면 null */
export function nearestPassing(color: RGB, against: RGB, target: number): RGB | null {
  if (contrast(color, against) >= target) return color
  const [h, s, l0] = rgbToHsl(color)
  const search = (dir: 1 | -1) => {
    const end = dir > 0 ? 1 : 0
    if (contrast(hslToRgb([h, s, end]), against) < target) return null
    let lo = l0, hi = end
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (contrast(hslToRgb([h, s, mid]), against) >= target) hi = mid; else lo = mid
    }
    // 반올림 오차로 미달이 되지 않게 한 칸 더
    let rgb = hslToRgb([h, s, hi])
    for (let i = 0; i < 6 && contrast(rgb, against) < target; i++) rgb = hslToRgb([h, s, hi + dir * 0.004 * (i + 1)])
    return { rgb, dl: Math.abs(hi - l0) }
  }
  const c = [search(-1), search(1)].filter(Boolean) as { rgb: RGB; dl: number }[]
  if (!c.length) return null
  return c.sort((a, b) => a.dl - b.dl)[0].rgb
}

/* ---------- 색각 이상 시뮬레이션 (Machado et al. 2009, 심도 1.0, 선형 RGB) ---------- */
export type Vision = 'normal' | 'protan' | 'deutan' | 'tritan' | 'achroma'
export const VISION_LABEL: Record<Vision, string> = { normal: '정상 시각', protan: '적색맹', deutan: '녹색맹', tritan: '청색맹', achroma: '전색맹(흑백)' }
const M: Record<Exclude<Vision, 'normal' | 'achroma'>, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
export function simulate(rgb: RGB, v: Vision): RGB {
  if (v === 'normal') return rgb
  const l = rgb.map(lin)
  if (v === 'achroma') { const y = unlin(0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]); return [y, y, y].map(Math.round) as RGB }
  const m = M[v]
  return m.map(row => Math.round(Math.max(0, Math.min(255, unlin(Math.max(0, Math.min(1, row[0] * l[0] + row[1] * l[1] + row[2] * l[2]))))))) as RGB
}
/** CSS/SVG feColorMatrix 값 (sRGB 공간 근사 — 이미지·요소 미리보기용) */
export function visionMatrix(v: Vision): string | null {
  if (v === 'normal') return null
  if (v === 'achroma') return '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0'
  return M[v].map(r => r.join(' ') + ' 0 0').join('  ') + '  0 0 0 1 0'
}

/* ---------- 판정 ---------- */
export const AA = { body: 4.5, large: 3, ui: 3 } as const
export const AAA = { body: 7, large: 4.5 } as const
