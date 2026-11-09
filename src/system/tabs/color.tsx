import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Seg } from '../../components/ui'
import { IconMoon, IconSun } from '../../components/icons'
import { AA, AAA, contrast, fmtRatio, parseColor, toHex, type RGB } from '../../guides/20-contrast/lib'
import { resolveComponent, resolveSemantic, useSys, type Mode, type SysConfig } from '../store'
import { CodeBlock, Note, Section, SysGrid } from '../ui'
import './color.css'

const rgbOf = (hex: string): RGB => parseColor(hex)?.rgb ?? [255, 0, 255]
const ratioOf = (a: string, b: string) => contrast(rgbOf(a), rgbOf(b))
const MODES: readonly (readonly [Mode, ReactNode])[] = [['light', <><IconSun />라이트</>], ['dark', <><IconMoon />다크</>]]

/* =====================================================================
 * 1. 60:30:10 — 미니 화면을 SVG로 그리고, 같은 화면을 '역할 색'으로 다시 그려 픽셀을 세요
 * ===================================================================== */
type Role = 'bg' | 'surface' | 'border' | 'text' | 'text-sub' | 'primary' | 'on-primary'
type El =
  | { t: 'r'; x: number; y: number; w: number; h: number; r?: number; role: Role; stroke?: Role }
  | { t: 'x'; x: number; y: number; s: number; w?: number; role: Role; str: string; anchor?: 'middle' }
const GROUP: Record<Role, 60 | 30 | 10> = { bg: 60, surface: 30, border: 30, text: 30, 'text-sub': 30, primary: 10, 'on-primary': 10 }
const VW = 360, VH = 240

const header = (btn = true): El[] => [
  { t: 'x', x: 16, y: 25, s: 13, w: 800, role: 'text', str: 'palmer' },
  { t: 'x', x: 150, y: 24, s: 10, role: 'text-sub', str: '소개   가이드   요금' },
  ...(btn ? [{ t: 'r', x: 296, y: 12, w: 48, h: 19, r: 5, role: 'primary' } as El, { t: 'x', x: 320, y: 25, s: 9, w: 700, role: 'on-primary', str: '시작', anchor: 'middle' } as El] : []),
  { t: 'r', x: 0, y: 40, w: VW, h: 1, role: 'border' },
]
const card = (x: number, y: number, w: number, h: number, icon: Role = 'primary'): El[] => [
  { t: 'r', x, y, w, h, r: 8, role: 'surface', stroke: 'border' },
  { t: 'r', x: x + 10, y: y + 10, w: 14, h: 14, r: 4, role: icon },
  { t: 'x', x: x + 10, y: y + 40, s: 10, w: 700, role: 'text', str: '바로 시작' },
  { t: 'r', x: x + 10, y: y + 48, w: w - 26, h: 4, r: 2, role: 'text-sub' },
  { t: 'r', x: x + 10, y: y + 57, w: w - 40, h: 4, r: 2, role: 'text-sub' },
]
const LAYOUTS: Record<'good' | 'loud' | 'busy', { name: string; els: El[] }> = {
  good: {
    name: '균형',
    els: [
      ...header(),
      { t: 'x', x: 16, y: 74, s: 18, w: 800, role: 'text', str: '필요한 것만 담았어요' },
      { t: 'x', x: 16, y: 93, s: 10, role: 'text-sub', str: '매일 쓰는 화면을 더 쉽게 만들어요' },
      { t: 'r', x: 16, y: 104, w: 86, h: 24, r: 6, role: 'primary' },
      { t: 'x', x: 59, y: 120, s: 10, w: 700, role: 'on-primary', str: '무료로 시작', anchor: 'middle' },
      { t: 'r', x: 236, y: 54, w: 108, h: 74, r: 10, role: 'primary' },
      ...card(16, 146, 104, 70, 'text-sub'), ...card(128, 146, 104, 70, 'text-sub'), ...card(240, 146, 104, 70, 'text-sub'),
    ],
  },
  loud: {
    name: '강조 과다',
    els: [
      ...header(),
      { t: 'r', x: 0, y: 41, w: VW, h: 96, role: 'primary' },
      { t: 'x', x: 16, y: 80, s: 18, w: 800, role: 'on-primary', str: '지금 가입하면 50% 할인!' },
      { t: 'r', x: 16, y: 98, w: 86, h: 24, r: 6, role: 'on-primary' },
      { t: 'x', x: 59, y: 114, s: 10, w: 700, role: 'primary', str: '놓치지 마세요', anchor: 'middle' },
      ...card(16, 150, 104, 70), ...card(128, 150, 104, 70), ...card(240, 150, 104, 70),
      { t: 'r', x: 128, y: 150, w: 104, h: 70, r: 8, role: 'primary' },
    ],
  },
  busy: {
    name: '배경 부족',
    els: [
      ...header(),
      { t: 'r', x: 8, y: 48, w: 344, h: 84, r: 10, role: 'surface', stroke: 'border' },
      { t: 'x', x: 20, y: 76, s: 18, w: 800, role: 'text', str: '필요한 것만 담았어요' },
      { t: 'x', x: 20, y: 95, s: 10, role: 'text-sub', str: '카드 위에 카드, 그 위에 또 카드' },
      { t: 'r', x: 20, y: 104, w: 86, h: 20, r: 6, role: 'primary' },
      { t: 'x', x: 63, y: 118, s: 9, w: 700, role: 'on-primary', str: '시작하기', anchor: 'middle' },
      ...card(8, 138, 112, 94, 'text-sub'), ...card(124, 138, 112, 94, 'text-sub'), ...card(240, 138, 112, 94, 'text-sub'),
    ],
  },
}

function toSvg(els: El[], col: (r: Role) => string, crisp = false) {
  const body = els.map(e => e.t === 'r'
    ? `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.r ?? 0}" fill="${col(e.role)}"${e.stroke ? ` stroke="${col(e.stroke)}" stroke-width="1"` : ''}/>`
    : `<text x="${e.x}" y="${e.y}" font-size="${e.s}" font-weight="${e.w ?? 500}" fill="${col(e.role)}"${e.anchor ? ` text-anchor="${e.anchor}"` : ''}>${e.str}</text>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" width="${VW}" height="${VH}"${crisp ? ' shape-rendering="crispEdges"' : ''} font-family="Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"><rect width="${VW}" height="${VH}" fill="${col('bg')}"/>${body}</svg>`
}

/** 역할마다 겹치지 않는 가짜 색으로 그려 픽셀을 세요 */
const CODE: Record<Role, RGB> = { bg: [255, 0, 0], surface: [0, 255, 0], border: [0, 128, 0], text: [0, 0, 255], 'text-sub': [0, 0, 128], primary: [255, 255, 0], 'on-primary': [255, 0, 255] }
async function measure(els: El[]): Promise<Record<60 | 30 | 10, number>> {
  const svg = toSvg(els, r => toHex(CODE[r]), true)
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  const cv = document.createElement('canvas'); cv.width = VW; cv.height = VH
  const g = cv.getContext('2d', { willReadFrequently: true })!
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, VW, VH).data
  const out = { 60: 0, 30: 0, 10: 0 }
  const roles = Object.entries(CODE) as [Role, RGB][]
  for (let i = 0; i < d.length; i += 4) {
    let best: Role = 'bg', bd = Infinity
    for (const [r, c] of roles) { const dd = (d[i] - c[0]) ** 2 + (d[i + 1] - c[1]) ** 2 + (d[i + 2] - c[2]) ** 2; if (dd < bd) { bd = dd; best = r } }
    out[GROUP[best]]++
  }
  const n = VW * VH
  return { 60: out[60] / n * 100, 30: out[30] / n * 100, 10: out[10] / n * 100 }
}

function Ratio() {
  const { config, mode, setMode } = useSys()
  const [lay, setLay] = useState<keyof typeof LAYOUTS>('good')
  const [m, setM] = useState<Record<60 | 30 | 10, number> | null>(null)
  const els = LAYOUTS[lay].els
  useEffect(() => {
    let live = true
    measure(els).then(v => { if (live) setM(v) }).catch(() => { if (live) setM(null) })
    return () => { live = false }
  }, [els])
  const col = (r: Role) => resolveSemantic(config, mode, r)
  const svg = useMemo(() => toSvg(els, col), [els, config.color, mode]) // eslint-disable-line react-hooks/exhaustive-deps
  const parts: [60 | 30 | 10, string, string][] = [[60, '배경', col('bg')], [30, '보조·글자', col('surface')], [10, '강조', col('primary')]]
  const off = m ? Math.max(...parts.map(([k]) => Math.abs(m[k] - k))) : 0
  return (
    <Section id="sys-color-ratio" wide title="60:30:10 배색"
      desc="배경이 화면의 60%, 카드·글자 같은 보조색이 30%, 버튼·링크 같은 강조색이 10%쯤일 때 눈이 어디를 봐야 할지 분명해져요. 미니 화면의 픽셀을 직접 세서 지금 비율을 보여줘요."
      aside={<Seg value={mode} onChange={setMode} options={MODES} />}>
      <div className="cl-ratio">
        <div className="cl-mini" role="img" aria-label={`${LAYOUTS[lay].name} 배치의 미니 화면`} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="cl-ratio-side">
          <Seg value={lay} onChange={setLay} options={Object.entries(LAYOUTS).map(([k, v]) => [k as keyof typeof LAYOUTS, v.name])} />
          <div className="cl-bars">
            <div className="cl-bar-lbl">목표</div>
            <div className="cl-bar">{parts.map(([k, l, c]) => <span key={k} style={{ flexBasis: k + '%', background: c }} title={`${l} ${k}%`} />)}</div>
            <div className="cl-bar-lbl">실측</div>
            <div className="cl-bar">{parts.map(([k, l, c]) => <span key={k} style={{ flexBasis: (m?.[k] ?? k) + '%', background: c }} title={`${l} ${m ? m[k].toFixed(1) : '-'}%`} />)}</div>
          </div>
          <ul className="cl-legend">
            {parts.map(([k, l, c]) => (
              <li key={k}>
                <i style={{ background: c }} />
                <span>{l} <small>목표 {k}%</small></span>
                <b className={m && Math.abs(m[k] - k) > 8 ? 'bad' : ''}>{m ? Math.round(m[k]) : '–'}%</b>
              </li>
            ))}
          </ul>
          <p className={'cl-verdict ' + (off > 8 ? 'bad' : 'ok')}>
            {!m ? '세는 중…' : off <= 8 ? '✓ 60:30:10에 가까워요. 강조색이 적어서 버튼이 눈에 잘 띄어요.'
              : m[10] > 18 ? '! 강조색이 너무 넓어요. 모두 강조하면 아무것도 강조되지 않아요.'
                : '! 배경이 부족해요. 카드가 빈틈없이 깔리면 답답하고 무엇이 중요한지 흐려져요.'}
          </p>
          <p className="muted">색은 위 토큰의 시맨틱 값(bg·surface·primary)이에요. 아래 다이어그램에서 바꾸면 여기도 바뀌어요.</p>
        </div>
      </div>
    </Section>
  )
}

/* =====================================================================
 * 2. 디자인 토큰 3계층 다이어그램
 * ===================================================================== */
type Sel = { tier: 'p' | 's' | 'c'; name: string } | null

function HexInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const ok = /^#[0-9a-f]{6}$/i.test(draft)
  return (
    <span className="tk-hex">
      <input type="color" value={value} aria-label={label + ' 색 고르기'} onChange={e => onChange(e.target.value)} onClick={e => e.stopPropagation()} />
      <input type="text" value={draft} aria-label={label + ' HEX'} spellCheck={false} className={ok ? '' : 'err'} maxLength={7}
        onClick={e => e.stopPropagation()}
        onChange={e => { const v = e.target.value.trim(); setDraft(v); if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase()) }}
        onBlur={() => setDraft(value)} />
    </span>
  )
}

const PAIRS: { fg: string; bg: string; min: number; label: string }[] = [
  { fg: 'text', bg: 'bg', min: AA.body, label: '본문' },
  { fg: 'text-sub', bg: 'bg', min: AA.body, label: '보조 글자' },
  { fg: 'on-primary', bg: 'primary', min: AA.body, label: '버튼 글자' },
  { fg: 'border', bg: 'bg', min: AA.ui, label: 'UI 테두리' },
]

function Badge({ r, min }: { r: number; min: number }) {
  const ok = r >= min
  return <span className={'cl-badge ' + (ok ? 'ok' : 'bad')}>{ok ? '✓' : '✕'} {fmtRatio(r)}:1</span>
}

function Tokens() {
  const { config, update, mode, setMode } = useSys()
  const C = config.color
  const sem = C.semantic[mode]
  const prims = Object.keys(C.primitives)
  const roles = Object.keys(sem)
  const comps = Object.keys(C.components)
  const [sel, setSel] = useState<Sel>({ tier: 'c', name: 'button-primary-bg' })
  const wrap = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLElement>())
  const [edges, setEdges] = useState<{ id: string; d: string; on: boolean }[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  // 활성 경로
  const act = useMemo(() => {
    const p = new Set<string>(), s = new Set<string>(), c = new Set<string>()
    if (!sel) return { p, s, c, any: false }
    if (sel.tier === 'p') { p.add(sel.name); roles.forEach(r => sem[r] === sel.name && s.add(r)) }
    if (sel.tier === 's') { s.add(sel.name); p.add(sem[sel.name]) }
    if (sel.tier === 'c') { c.add(sel.name); const r = C.components[sel.name]; s.add(r); p.add(sem[r]) }
    if (sel.tier !== 'c') comps.forEach(k => s.has(C.components[k]) && c.add(k))
    return { p, s, c, any: true }
  }, [sel, sem, C.components]) // eslint-disable-line react-hooks/exhaustive-deps

  const draw = useCallback(() => {
    const w = wrap.current
    if (!w) return
    const b = w.getBoundingClientRect()
    const box = (k: string) => { const e = nodes.current.get(k); return e ? e.getBoundingClientRect() : null }
    const curve = (a: DOMRect, z: DOMRect) => {
      const x1 = a.right - b.left, y1 = a.top + a.height / 2 - b.top, x2 = z.left - b.left, y2 = z.top + z.height / 2 - b.top
      const mx = (x1 + x2) / 2
      return `M${x1.toFixed(1)},${y1.toFixed(1)} C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`
    }
    const out: { id: string; d: string; on: boolean }[] = []
    for (const r of roles) {
      const a = box('p:' + sem[r]), z = box('s:' + r)
      if (a && z) out.push({ id: 's:' + r, d: curve(a, z), on: act.s.has(r) && act.p.has(sem[r]) })
    }
    for (const k of comps) {
      const a = box('s:' + C.components[k]), z = box('c:' + k)
      if (a && z) out.push({ id: 'c:' + k, d: curve(a, z), on: act.c.has(k) && act.s.has(C.components[k]) })
    }
    setEdges(out)
    setSize({ w: w.scrollWidth, h: w.scrollHeight })
  }, [sem, C.components, act]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(draw, [draw])
  useEffect(() => {
    const ro = new ResizeObserver(() => draw())
    if (wrap.current) ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [draw])

  const reg = (k: string) => (e: HTMLElement | null) => { if (e) nodes.current.set(k, e); else nodes.current.delete(k) }
  const cls = (tier: 'p' | 's' | 'c', name: string) => {
    const on = act[tier].has(name)
    return 'tk-node' + (on ? ' on' : act.any ? ' dim' : '') + (sel?.tier === tier && sel.name === name ? ' sel' : '')
  }
  const pick = (tier: 'p' | 's' | 'c', name: string) => setSel(s => (s?.tier === tier && s.name === name ? null : { tier, name }))
  const keyPick = (tier: 'p' | 's' | 'c', name: string) => (e: KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(tier, name) } }

  const setPrim = (k: string, v: string) => update(c => ({ ...c, color: { ...c.color, primitives: { ...c.color.primitives, [k]: v } } }))
  const setSem = (r: string, p: string) => update(c => ({ ...c, color: { ...c.color, semantic: { ...c.color.semantic, [mode]: { ...c.color.semantic[mode], [r]: p } } } }))

  // 미니 UI
  const v = (n: string) => resolveComponent(config, mode, n)
  const s = (r: string) => resolveSemantic(config, mode, r)
  const hl = (n: string) => (act.c.has(n) ? ' hl' : '')
  const usedBy = (p: string) => roles.filter(r => sem[r] === p).length

  const code = tokensCss(config)

  return (
    <Section id="sys-color-tokens" wide title="디자인 토큰 3계층"
      desc={<>프리미티브(실제 값) → 시맨틱(역할) → 컴포넌트(쓰는 곳) 순서로 값을 물려받아요. 노드를 누르면 상속 경로가 강조되고, 라이트·다크를 바꾸면 <b>시맨틱이 바라보는 프리미티브만</b> 바뀌어요.</>}
      aside={<Seg value={mode} onChange={setMode} options={MODES} />}>
      <div className="tk-layout">
        <div className="tk-scroll">
          <div className="tk-hint">← 옆으로 밀어 세 계층을 모두 보세요</div>
          <div className="tk-diagram" ref={wrap} data-mode={mode}>
            <svg className="tk-lines" width={size.w} height={size.h} aria-hidden="true">
              {edges.map(e => <path key={e.id} d={e.d} className={e.on ? 'on' : act.any ? 'dim' : ''} />)}
            </svg>
            <div className="tk-col">
              <div className="tk-col-h">① 프리미티브 <small>값 이름</small></div>
              {prims.map(p => (
                <div key={p} ref={reg('p:' + p)} className={cls('p', p) + (usedBy(p) ? '' : ' unused')} role="button" tabIndex={0} aria-pressed={sel?.tier === 'p' && sel.name === p}
                  onClick={() => pick('p', p)} onKeyDown={keyPick('p', p)}>
                  <code>{p}</code>
                  <HexInput value={C.primitives[p]} label={p} onChange={hex => setPrim(p, hex)} />
                </div>
              ))}
            </div>
            <div className="tk-col">
              <div className="tk-col-h">② 시맨틱 <small>역할 이름 · {mode === 'light' ? '라이트' : '다크'}</small></div>
              {roles.map(r => (
                <div key={r} ref={reg('s:' + r)} className={cls('s', r)} role="button" tabIndex={0} aria-pressed={sel?.tier === 's' && sel.name === r}
                  onClick={() => pick('s', r)} onKeyDown={keyPick('s', r)}>
                  <i className="tk-sw" style={{ background: s(r) }} />
                  <code>color-{r}</code>
                  <select value={sem[r]} aria-label={`color-${r}가 가리킬 프리미티브`} onClick={e => e.stopPropagation()} onChange={e => setSem(r, e.target.value)}>
                    {prims.map(p => <option key={p} value={p}>{`{${p}}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="tk-col">
              <div className="tk-col-h">③ 컴포넌트 <small>쓰는 곳</small></div>
              {comps.map(k => (
                <div key={k} ref={reg('c:' + k)} className={cls('c', k)} role="button" tabIndex={0} aria-pressed={sel?.tier === 'c' && sel.name === k}
                  onClick={() => pick('c', k)} onKeyDown={keyPick('c', k)}>
                  <i className="tk-sw" style={{ background: v(k) }} />
                  <span><code>{k}</code><small>{`{color-${C.components[k]}}`}</small></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="tk-preview">
          <div className="tk-path" aria-live="polite">{pathText(sel, config, mode)}</div>
          <div className="tk-ui" style={{ background: s('bg'), color: s('text') }}>
            <div className={'tk-ui-card' + hl('card-bg')} style={{ background: v('card-bg'), borderColor: s('border') }} onClick={() => setSel({ tier: 'c', name: 'card-bg' })}>
              <b>주문 요약</b>
              <span style={{ color: s('text-sub') }}>상품 2개 · 무료 배송</span>
              <label className="tk-ui-field">
                <span style={{ color: s('text-sub') }}>쿠폰 코드</span>
                <input className={hl('input-border')} placeholder="예: AUTUMN10" readOnly style={{ borderColor: v('input-border'), background: s('bg'), color: s('text') }}
                  onClick={e => { e.stopPropagation(); setSel({ tier: 'c', name: 'input-border' }) }} />
              </label>
              <span className={'tk-ui-err' + hl('error-text')} style={{ color: v('error-text') }} onClick={e => { e.stopPropagation(); setSel({ tier: 'c', name: 'error-text' }) }}>쿠폰 기간이 지났어요</span>
              <button type="button" className={'tk-ui-btn' + (act.c.has('button-primary-bg') || act.c.has('button-primary-text') ? ' hl' : '')} style={{ background: v('button-primary-bg'), color: v('button-primary-text') }}
                onClick={e => { e.stopPropagation(); setSel({ tier: 'c', name: 'button-primary-bg' }) }}>결제하기</button>
              <a className={'tk-ui-link' + hl('link')} style={{ color: v('link') }} href="#/system/color" onClick={e => { e.preventDefault(); e.stopPropagation(); setSel({ tier: 'c', name: 'link' }) }}>배송 정책 보기</a>
            </div>
          </div>
          <table className="tk-pairs">
            <thead><tr><th>시맨틱 쌍</th><th>기준</th><th>라이트</th><th>다크</th></tr></thead>
            <tbody>
              {PAIRS.map(p => (
                <tr key={p.fg}>
                  <td><code>{p.fg}</code> / <code>{p.bg}</code><small>{p.label}</small></td>
                  <td>{p.min}:1</td>
                  {(['light', 'dark'] as const).map(md => (
                    <td key={md} className={md === mode ? 'cur' : ''}><Badge r={ratioOf(resolveSemantic(config, md, p.fg), resolveSemantic(config, md, p.bg))} min={p.min} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Note>흐린 노드는 지금 모드에서 아무 시맨틱도 가리키지 않는 프리미티브예요. 드롭다운으로 연결을 바꾸거나 HEX를 고쳐 보세요. 결과는 상단 <b>내보내기</b>의 tokens.css·tokens.json에 그대로 들어가요.</Note>
      <CodeBlock code={code} maxHeight={280} />
    </Section>
  )
}

function pathText(sel: Sel, c: SysConfig, mode: Mode): ReactNode {
  if (!sel) return '노드를 눌러 상속 경로를 확인해 보세요.'
  const sem = c.color.semantic[mode]
  if (sel.tier === 'c') { const r = c.color.components[sel.name]; return <><code>{sel.name}</code> → <code>color-{r}</code> → <code>{sem[r]}</code> <b>{c.color.primitives[sem[r]]}</b></> }
  if (sel.tier === 's') return <><code>color-{sel.name}</code> → <code>{sem[sel.name]}</code> <b>{c.color.primitives[sem[sel.name]]}</b> · 쓰는 곳 {Object.values(c.color.components).filter(r => r === sel.name).length}개</>
  const rs = Object.keys(sem).filter(r => sem[r] === sel.name)
  return rs.length ? <><code>{sel.name}</code>을 쓰는 역할: {rs.map(r => <code key={r}>color-{r}</code>)}</> : <><code>{sel.name}</code>은 {mode === 'light' ? '라이트' : '다크'} 모드에서 쓰이지 않아요.</>
}

function tokensCss(c: SysConfig) {
  const C = c.color
  const pad = (s: string, n: number) => s + ' '.repeat(Math.max(1, n - s.length))
  return [
    '/* ① 프리미티브 — 값 그 자체 */', ':root {',
    ...Object.entries(C.primitives).map(([k, v]) => `  ${pad(`--${k}:`, 14)}${v};`),
    '', '  /* ② 시맨틱 — 역할 이름이 프리미티브를 가리켜요 */',
    ...Object.entries(C.semantic.light).map(([k, v]) => `  ${pad(`--color-${k}:`, 22)}var(--${v});`),
    '', '  /* ③ 컴포넌트 — 시맨틱을 가리켜요 */',
    ...Object.entries(C.components).map(([k, v]) => `  ${pad(`--${k}:`, 24)}var(--color-${v});`),
    '}', '', '/* 다크 모드: 시맨틱 매핑만 바꿔요 (컴포넌트는 그대로) */', '[data-theme="dark"] {',
    ...Object.entries(C.semantic.dark).map(([k, v]) => `  ${pad(`--color-${k}:`, 22)}var(--${v});`),
    '}',
  ].join('\n')
}

/* =====================================================================
 * 3. 빠른 대비 계산기
 * ===================================================================== */
const PRESETS: { name: string; fg: string; bg: string }[] = [
  { name: '권장 먹색', fg: '#111827', bg: '#ffffff' },
  { name: '회색 마지노선', fg: '#767676', bg: '#ffffff' },
  { name: '사이트 본문', fg: '#1b1b19', bg: '#ffffff' },
  { name: '사이트 캡션', fg: '#63635d', bg: '#ffffff' },
  { name: '파랑 버튼', fg: '#ffffff', bg: '#3550ee' },
  { name: '주황 강조', fg: '#b23a0b', bg: '#ffffff' },
  { name: '다크 본문', fg: '#f1f1ec', bg: '#1c1c1a' },
  { name: '다크 캡션', fg: '#9d9d95', bg: '#1c1c1a' },
]

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const p = parseColor(value)
  return (
    <label className="qc-field">
      <span>{label}</span>
      <span className={'qc-input' + (p ? '' : ' err')}>
        <input type="color" aria-label={label + ' 고르기'} value={p ? toHex(p.rgb) : '#000000'} onChange={e => onChange(e.target.value)} />
        <input type="text" aria-label={label + ' 값'} value={value} spellCheck={false} onChange={e => onChange(e.target.value)} />
      </span>
    </label>
  )
}

function Quick() {
  const [fg, setFg] = useState('#767676')
  const [bg, setBg] = useState('#ffffff')
  const f = parseColor(fg), b = parseColor(bg)
  const r = f && b ? contrast(f.rgb, b.rgb) : null
  const checks: [string, number][] = [['AA 본문', AA.body], ['AA 큰 글씨·UI', AA.large], ['AAA 본문 (참고)', AAA.body]]
  const href = f && b ? `#/contrast?fg=${toHex(f.rgb).slice(1)}&bg=${toHex(b.rgb).slice(1)}` : '#/contrast'
  return (
    <Section id="sys-color-quick" title="빠른 대비 계산기" desc="글자색과 배경색의 대비를 바로 계산해요. 기준은 AA(본문 4.5:1)이고, AAA는 참고로 보여줘요.">
      <div className="qc-presets">
        {PRESETS.map(p => (
          <button key={p.name} type="button" className={'qc-chip' + (fg.toLowerCase() === p.fg && bg.toLowerCase() === p.bg ? ' on' : '')} onClick={() => { setFg(p.fg); setBg(p.bg) }}>
            <i style={{ background: p.bg, color: p.fg }}>가</i>{p.name}
          </button>
        ))}
      </div>
      <div className="qc-fields">
        <Field label="글자색" value={fg} onChange={setFg} />
        <button type="button" className="btn ghost sm qc-swap" aria-label="글자색과 배경색 바꾸기" onClick={() => { setFg(bg); setBg(fg) }}>⇄</button>
        <Field label="배경색" value={bg} onChange={setBg} />
      </div>
      <div className="qc-result" style={f && b ? { background: toHex(b.rgb), color: toHex(f.rgb) } : undefined}>
        <b className="qc-ratio">{r ? fmtRatio(r) : '—'}<small>:1</small></b>
        <span>오늘 할 일 3개가 남았어요. 마감 전에 확인해 주세요.</span>
      </div>
      <div className="qc-checks">
        {checks.map(([l, min]) => (
          <span key={l} className={'cl-badge ' + (r && r >= min ? 'ok' : 'bad')}>{r && r >= min ? '✓' : '✕'} {l} {min}:1</span>
        ))}
      </div>
      <a className="cl-more" href={href}>자세히 검사하기 (색각 이상·보정 제안) →</a>
    </Section>
  )
}

/* =====================================================================
 * 4. 네이밍 규칙
 * ===================================================================== */
function Naming() {
  return (
    <Section id="sys-color-naming" title="시맨틱 이름 짓기" desc="토큰 이름은 ‘무슨 색인지’가 아니라 ‘무슨 역할인지’를 말해야 해요.">
      <div className="nm-grid">
        <div className="nm bad"><b>✕ 값 이름</b><code>color-blue</code><code>text-gray-600</code><small>파랑을 초록으로 바꾸면 이름이 거짓말이 돼요.</small></div>
        <div className="nm ok"><b>✓ 역할 이름</b><code>color-primary</code><code>color-text-sub</code><small>값이 바뀌어도 이름은 그대로예요.</small></div>
      </div>
      <ul className="nm-list">
        <li><b>프리미티브</b>에만 값 이름(<code>blue-500</code>)을 써요. 화면 코드에서는 직접 쓰지 않아요.</li>
        <li><b>시맨틱</b>은 역할(<code>bg</code>, <code>text</code>, <code>primary</code>, <code>danger</code>)로 짓고, 글자용과 배경용을 짝(<code>primary</code> / <code>on-primary</code>)으로 만들어요.</li>
        <li><b>다크 모드</b>는 시맨틱이 가리키는 프리미티브만 바꿔요. 컴포넌트 코드는 한 줄도 바뀌지 않아요. <a href="#/contrast/contrast-dark">다크 모드의 함정 →</a></li>
        <li>파일 형식은 W3C Design Tokens 커뮤니티 그룹 포맷(<code>$value</code>, <code>$type</code>, <code>{'{별칭}'}</code>)을 따르면 피그마·코드 도구끼리 주고받기 쉬워요. 상단 내보내기의 ‘토큰 JSON’이 이 형식이에요.</li>
      </ul>
      <p className="muted">출처: W3C Design Tokens Community Group</p>
    </Section>
  )
}

export default function ColorTab() {
  return (
    <div data-sys="color">
      <SysGrid>
        <Ratio />
        <Tokens />
        <Quick />
        <Naming />
      </SysGrid>
    </div>
  )
}
