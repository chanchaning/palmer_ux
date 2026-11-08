/* 설정 → CSS 변수 / W3C 디자인 토큰 JSON / Tailwind 설정 */
import type { Device, SysConfig } from './store'

const rem = (px: number) => `${+(px / 16).toFixed(4)}rem`
const BP: Record<Device, string> = { mobile: '', tablet: '(min-width: 768px)', pc: '(min-width: 1200px)' }

export function toCSS(c: SysConfig): string {
  const L: string[] = []
  L.push('/* Palmer의 웹 도감 · 디자인 시스템에서 내보낸 토큰 */', ':root {')
  L.push('  /* 1) 프리미티브 */')
  for (const [k, v] of Object.entries(c.color.primitives)) L.push(`  --${k}: ${v};`)
  L.push('', '  /* 2) 시맨틱 (라이트) */')
  for (const [k, v] of Object.entries(c.color.semantic.light)) L.push(`  --color-${k}: var(--${v});`)
  L.push('', '  /* 3) 컴포넌트 */')
  for (const [k, v] of Object.entries(c.color.components)) L.push(`  --${k}: var(--color-${v});`)
  L.push('', '  /* 타이포그래피 (모바일 기준, 아래 미디어 쿼리에서 확장) */')
  L.push(`  --font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif;`)
  const m = c.type.scale.mobile
  for (const k of ['h1', 'h2', 'h3', 'body', 'caption'] as const) L.push(`  --font-size-${k}: ${rem(m[k])};`)
  L.push(`  --line-height-body: ${c.type.lh};`, `  --line-height-heading: ${c.type.lhHeading};`, `  --letter-spacing: ${c.type.ls}em;`, `  --measure: ${rem(c.type.maxw)};`)
  L.push('', `  /* 간격 (${c.space.unit}pt) */`)
  c.space.scale.forEach((v, i) => L.push(`  --space-${i + 1}: ${rem(v)}; /* ${v}px */`))
  L.push('', '  /* 그리드 */')
  const g = c.grid.mobile
  L.push(`  --grid-columns: ${g.cols};`, `  --grid-gutter: ${g.gutter}px;`, `  --grid-margin: ${g.margin}px;`)
  L.push('', '  /* 모션 */')
  L.push(`  --duration-fast: ${c.motion.fast}ms;`, `  --duration-normal: ${c.motion.normal}ms;`, `  --duration-slow: ${c.motion.slow}ms;`, `  --ease-standard: ${c.motion.easing};`)
  L.push('}', '')
  L.push('/* 다크 모드: 시맨틱 토큰이 바라보는 프리미티브만 바꿔요 */', '[data-theme="dark"] {')
  for (const [k, v] of Object.entries(c.color.semantic.dark)) L.push(`  --color-${k}: var(--${v});`)
  L.push('}', '')
  for (const d of ['tablet', 'pc'] as const) {
    const s = c.type.scale[d], gr = c.grid[d]
    L.push(`@media ${BP[d]} {`, '  :root {')
    for (const k of ['h1', 'h2', 'h3', 'body', 'caption'] as const) L.push(`    --font-size-${k}: ${rem(s[k])};`)
    L.push(`    --grid-columns: ${gr.cols};`, `    --grid-gutter: ${gr.gutter}px;`, `    --grid-margin: ${gr.margin}px;`)
    L.push('  }', '}', '')
  }
  L.push('body {', '  font-family: var(--font-family);', '  font-size: var(--font-size-body);', '  line-height: var(--line-height-body);',
    '  letter-spacing: var(--letter-spacing);', '  color: var(--color-text);', '  background: var(--color-bg);')
  if (c.type.keepAll) L.push('  word-break: keep-all;', '  overflow-wrap: anywhere;')
  L.push('}', 'h1, h2, h3 { line-height: var(--line-height-heading); }', 'p { max-width: var(--measure); }', '')
  L.push('.container {', '  display: grid;', '  grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));', '  column-gap: var(--grid-gutter);',
    '  padding-inline: var(--grid-margin);', `  max-width: ${c.grid.pc.maxw ? c.grid.pc.maxw + 'px' : 'none'};`, '  margin-inline: auto;', '}')
  return L.join('\n')
}

/** W3C Design Tokens Community Group 포맷 ($value · $type · {별칭}) */
export function toJSON(c: SysConfig): string {
  const prim: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(c.color.primitives)) {
    const [fam, step] = k.includes('-') ? k.split('-') : [k, '']
    const target = (prim[fam] ??= {}) as Record<string, unknown>
    if (step) target[step] = { $value: v, $type: 'color' }
    else prim[fam] = { $value: v, $type: 'color' }
  }
  const alias = (p: string) => `{color.${p.replace('-', '.')}}`
  const sem = (mode: 'light' | 'dark') => Object.fromEntries(Object.entries(c.color.semantic[mode]).map(([k, v]) => [k, { $value: alias(v), $type: 'color' }]))
  const tokens = {
    color: prim,
    semantic: { light: sem('light'), dark: sem('dark') },
    component: Object.fromEntries(Object.entries(c.color.components).map(([k, v]) => [k, { $value: `{semantic.light.${v}}`, $type: 'color' }])),
    font: {
      family: { $value: ['Pretendard', 'sans-serif'], $type: 'fontFamily' },
      size: Object.fromEntries((['pc', 'tablet', 'mobile'] as const).map(d => [d, Object.fromEntries(Object.entries(c.type.scale[d]).map(([k, v]) => [k, { $value: `${v}px`, $type: 'dimension' }]))])),
      lineHeight: { body: { $value: c.type.lh, $type: 'number' }, heading: { $value: c.type.lhHeading, $type: 'number' } },
      letterSpacing: { $value: `${c.type.ls}em`, $type: 'dimension' },
    },
    space: Object.fromEntries(c.space.scale.map((v, i) => [String(i + 1), { $value: `${v}px`, $type: 'dimension' }])),
    grid: Object.fromEntries((['pc', 'tablet', 'mobile'] as const).map(d => [d, { columns: { $value: c.grid[d].cols, $type: 'number' }, gutter: { $value: `${c.grid[d].gutter}px`, $type: 'dimension' }, margin: { $value: `${c.grid[d].margin}px`, $type: 'dimension' } }])),
    duration: { fast: { $value: `${c.motion.fast}ms`, $type: 'duration' }, normal: { $value: `${c.motion.normal}ms`, $type: 'duration' }, slow: { $value: `${c.motion.slow}ms`, $type: 'duration' } },
  }
  return JSON.stringify(tokens, null, 2)
}

export function toTailwind(c: SysConfig): string {
  const colors = Object.keys(c.color.semantic.light).map(k => `        '${k}': 'var(--color-${k})',`).join('\n')
  const fs = (['h1', 'h2', 'h3', 'body', 'caption'] as const).map(k => `        '${k}': ['var(--font-size-${k})', { lineHeight: '${k === 'body' || k === 'caption' ? c.type.lh : c.type.lhHeading}' }],`).join('\n')
  const sp = c.space.scale.map((v, i) => `        '${i + 1}': '${rem(v)}',`).join('\n')
  return `// tailwind.config.js — CSS 변수(tokens.css)와 함께 쓰세요
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    screens: { tablet: '768px', pc: '1200px' },
    extend: {
      colors: {
${colors}
      },
      fontSize: {
${fs}
      },
      spacing: {
${sp}
      },
      maxWidth: { measure: 'var(--measure)', container: '${c.grid.pc.maxw}px' },
      transitionDuration: { fast: '${c.motion.fast}ms', DEFAULT: '${c.motion.normal}ms', slow: '${c.motion.slow}ms' },
      transitionTimingFunction: { standard: '${c.motion.easing}' },
    },
  },
}`
}

export function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
