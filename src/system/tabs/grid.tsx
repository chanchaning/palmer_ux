import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPE } from 'react'
import { Range, Seg } from '../../components/ui'
import { useSys, type Device, type GridSpec } from '../store'
import { CodeBlock, Note, Section, SliderRow, SysGrid } from '../ui'
import './grid.css'

/** 미리보기 기기 폭(px) — 실제 폭으로 그린 뒤 비율로 줄여요 */
const DW: Record<Device, number> = { pc: 1280, tablet: 834, mobile: 390 }
const DNAME: Record<Device, string> = { pc: 'PC', tablet: '태블릿', mobile: '모바일' }
const DEVS: Device[] = ['mobile', 'tablet', 'pc']
/** export.ts 와 같은 분기점 */
const BP: Record<Device, string> = { mobile: '', tablet: '(min-width: 768px)', pc: '(min-width: 1200px)' }
/** 슬라이더 범위 */
const LIM: Record<Device, { cols: [number, number]; gutter: [number, number]; margin: [number, number] }> = {
  pc: { cols: [4, 16], gutter: [0, 48], margin: [0, 80] },
  tablet: { cols: [4, 12], gutter: [0, 40], margin: [0, 64] },
  mobile: { cols: [2, 6], gutter: [0, 32], margin: [0, 40] },
}

type Pattern = 'cards' | 'dash' | 'side'
/** f: 기기별 컬럼 비율(1 = 전체), 'rest' = 같은 줄의 앞 요소가 쓰고 남은 칸 */
interface Item { id: string; label: string; cls: string; h: number; f: Record<Device, number | 'rest'> }
const PATTERNS: Record<Pattern, { name: string; items: Item[] }> = {
  cards: {
    name: '3단 카드',
    items: [1, 2, 3, 4, 5, 6].map(n => ({ id: 'c' + n, label: `카드 ${n}`, cls: 'card', h: 150, f: { pc: 1 / 3, tablet: 1 / 2, mobile: 1 } })),
  },
  dash: {
    name: '4단 대시보드',
    items: [
      ...[1, 2, 3, 4].map(n => ({ id: 'k' + n, label: `지표 ${n}`, cls: 'kpi', h: 96, f: { pc: 1 / 4, tablet: 1 / 2, mobile: 1 / 2 } as Item['f'] })),
      { id: 'chart', label: '차트', cls: 'chart', h: 240, f: { pc: 2 / 3, tablet: 1, mobile: 1 } },
      { id: 'list', label: '목록', cls: 'list', h: 240, f: { pc: 'rest', tablet: 1, mobile: 1 } },
    ],
  },
  side: {
    name: '본문 + 사이드바',
    items: [
      { id: 'main', label: '본문', cls: 'main', h: 380, f: { pc: 2 / 3, tablet: 5 / 8, mobile: 1 } },
      { id: 'aside', label: '사이드바', cls: 'aside', h: 220, f: { pc: 'rest', tablet: 'rest', mobile: 1 } },
    ],
  },
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** 비율 → span (반올림, 1~cols) */
function spansOf(items: Item[], d: Device, cols: number): number[] {
  const out: number[] = []
  items.forEach((it, i) => {
    const f = it.f[d]
    let s = f === 'rest' ? cols - (out[i - 1] ?? 0) : Math.round(cols * f)
    if (s <= 0) s = cols
    out.push(clamp(s, 1, cols))
  })
  return out
}

interface Box { x: number; y: number; w: number; h: number; span: number; start: number }
/** 왼쪽 위부터 줄 단위로 채워요(CSS grid 자동 배치와 같은 결과) */
function pack(spans: number[], heights: number[], cols: number, colW: number, g: number, newRow: boolean[] = []): { boxes: Box[]; bottom: number } {
  const boxes: Box[] = []
  let cur = 0, y = 0, rowH = 0
  spans.forEach((s, i) => {
    if (cur > 0 && (cur + s > cols || newRow[i])) { y += rowH + g; cur = 0; rowH = 0 }
    boxes.push({ x: cur * (colW + g), y, w: s * colW + (s - 1) * g, h: heights[i], span: s, start: cur + 1 })
    cur += s; rowH = Math.max(rowH, heights[i])
  })
  return { boxes, bottom: y + rowH }
}

function geometry(d: Device, sp: GridSpec) {
  const W = DW[d]
  const avail = W - 2 * sp.margin
  const inner = d === 'pc' && sp.maxw > 0 ? Math.min(avail, sp.maxw) : avail
  const left = (W - inner) / 2
  const colW = Math.max(4, (inner - (sp.cols - 1) * sp.gutter) / sp.cols)
  return { W, inner, left, colW }
}

/** 브라우저 폭을 재서 축소 비율 계산 */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => { const cs = getComputedStyle(el); setW(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) }
    const ro = new ResizeObserver(measure)
    ro.observe(el); measure()
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

const px = (n: number) => `${+n.toFixed(1)}px`

function gridCSS(grid: Record<Device, GridSpec>, pattern: Pattern, drag: Record<Device, number>): string {
  const L: string[] = ['/* 모바일 우선: 작은 화면 값을 기본으로 두고 넓어질 때 덮어써요 */']
  let prev: GridSpec | null = null
  for (const d of DEVS) {
    const g = grid[d]
    const body: string[] = []
    if (!prev || prev.cols !== g.cols) body.push(`grid-template-columns: repeat(${g.cols}, minmax(0, 1fr));`)
    if (!prev || prev.gutter !== g.gutter) body.push(`gap: ${g.gutter}px; /* 거터 (줄 간격도 같게) */`)
    if (!prev || prev.margin !== g.margin) body.push(`padding-inline: ${g.margin}px; /* 마진 */`)
    if (d === 'pc' && g.maxw > 0) body.push(`max-width: ${g.maxw}px; /* 콘텐츠 최대 폭 */`)
    if (!prev) {
      L.push('.container {', '  display: grid;', ...body.map(s => '  ' + s), '  margin-inline: auto;', '  box-sizing: content-box;', '}')
    } else if (body.length) {
      L.push(`@media ${BP[d]} { /* ${DNAME[d]} */`, '  .container {', ...body.map(s => '    ' + s), '  }', '}')
    }
    prev = g
  }
  // 배치 패턴
  const items = PATTERNS[pattern].items
  const classes = [...new Set(items.map(i => i.cls))]
  L.push('', `/* 배치: ${PATTERNS[pattern].name} */`, '.header { grid-column: 1 / -1; }')
  const spanBy: Record<Device, Record<string, number>> = { pc: {}, tablet: {}, mobile: {} }
  for (const d of DEVS) {
    const s = spansOf(items, d, grid[d].cols)
    items.forEach((it, i) => { spanBy[d][it.cls] = s[i] })
    spanBy[d].block = clamp(drag[d], 1, grid[d].cols)
  }
  const all = [...classes, 'block']
  let last: Record<string, number> | null = null
  for (const d of DEVS) {
    const rules = all.filter(c => !last || last[c] !== spanBy[d][c]).map(c => {
      const s = spanBy[d][c]
      return `.${c} { grid-column: ${s >= grid[d].cols ? '1 / -1' : 'span ' + s}; }`
    })
    if (!last) L.push(...rules)
    else if (rules.length) L.push(`@media ${BP[d]} {`, ...rules.map(r => '  ' + r), '}')
    last = spanBy[d]
  }
  return L.join('\n')
}

/* ---------- 시뮬레이터 ---------- */
type DragSpans = Record<Device, number>
function Simulator({ pattern, setPattern, drag, setDrag }: {
  pattern: Pattern; setPattern: (p: Pattern) => void; drag: DragSpans; setDrag: (fn: (d: DragSpans) => DragSpans) => void
}) {
  const { config, update } = useSys()
  const [dev, setDev] = useState<Device>('pc')
  const [overlay, setOverlay] = useState(true)
  const [live, setLive] = useState<number | null>(null)
  const start = useRef<{ x: number; w: number } | null>(null)
  const [wrapRef, avail] = useWidth()

  const sp = config.grid[dev]
  const { W, inner, left, colW } = geometry(dev, sp)
  const s = avail ? Math.min(1, avail / W) : 0.5
  const inv = Math.min(4, 1 / s)
  const tiny = s < 0.5
  const g = sp.gutter

  const setG = (k: keyof GridSpec, v: number) => update(c => ({ ...c, grid: { ...c.grid, [dev]: { ...c.grid[dev], [k]: v } } }))

  const items = PATTERNS[pattern].items
  const HEAD = 56, PAD_T = 24, PAD_B = Math.round(14 + 18 * inv), DRAG_H = 112
  const dragSpan = clamp(drag[dev], 1, sp.cols)
  const spans = [sp.cols, ...spansOf(items, dev, sp.cols), dragSpan]
  const heights = [HEAD, ...items.map(i => i.h), DRAG_H]
  const newRow = spans.map((_, i) => i === spans.length - 1)
  const { boxes, bottom } = pack(spans, heights, sp.cols, colW, g, newRow)
  const H = PAD_T + bottom + PAD_B

  const nearest = (w: number) => clamp(Math.round((w + g) / (colW + g)), 1, sp.cols)
  const dragBox = boxes[boxes.length - 1]
  const onDown = (e: RPE<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, w: dragBox.w }
    setLive(dragBox.w)
  }
  const onMove = (e: RPE<HTMLDivElement>) => {
    if (!start.current) return
    setLive(clamp(start.current.w + (e.clientX - start.current.x) / s, colW * 0.6, inner))
  }
  const onUp = () => {
    if (!start.current) return
    const w = live ?? dragBox.w
    start.current = null
    setDrag(d => ({ ...d, [dev]: nearest(w) }))
    setLive(null)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); setDrag(d => ({ ...d, [dev]: e.key === 'Home' ? 1 : sp.cols })); return }
    if (!step) return
    e.preventDefault()
    setDrag(d => ({ ...d, [dev]: clamp(dragSpan + step, 1, sp.cols) }))
  }
  const liveSpan = live !== null ? nearest(live) : dragSpan
  const snapW = liveSpan * colW + (liveSpan - 1) * g

  // 비율이 딱 떨어지지 않으면 알려줘요
  const uneven = items.some(it => { const f = it.f[dev]; return f !== 'rest' && f !== 1 && Math.abs(sp.cols * f - Math.round(sp.cols * f)) > 1e-6 })
  return (
    <div className="gr-layout">
        <div className="gr-stage">
          <div className="gr-bar">
            <Seg value={dev} onChange={setDev} options={(['pc', 'tablet', 'mobile'] as const).map(d => [d, `${DNAME[d]} ${DW[d]}`] as const)} />
            <Seg value={pattern} onChange={setPattern} options={(Object.keys(PATTERNS) as Pattern[]).map(p => [p, PATTERNS[p].name] as const)} />
            <button type="button" className="chip" aria-pressed={overlay} onClick={() => setOverlay(o => !o)}>{overlay ? '✓ ' : ''}그리드 가이드</button>
          </div>
          <div className="gr-fit" ref={wrapRef}>
            <div className="gr-scaler" style={{ width: W * s, height: H * s }}>
              <div className="gr-frame" data-dev={dev} data-tiny={tiny || undefined} style={{ width: W, height: H, transform: `scale(${s})`, ['--inv' as string]: inv }}
                role="img" aria-label={`${DNAME[dev]} ${W}px 화면, ${sp.cols}컬럼 그리드에 ${PATTERNS[pattern].name} 배치`}>
                {overlay && (
                  <div className="gr-overlay" aria-hidden="true">
                    <i className="gr-mg" style={{ left: 0, width: left }}><b>{sp.margin ? `마진 ${sp.margin}` : ''}</b></i>
                    <i className="gr-mg" style={{ right: 0, width: left }} />
                    <div className="gr-cols" style={{ left, width: inner, gridTemplateColumns: `repeat(${sp.cols}, minmax(0, 1fr))`, columnGap: g }}>
                      {Array.from({ length: sp.cols }, (_, i) => <span key={i}><b>{i + 1}</b></span>)}
                    </div>
                  </div>
                )}
                <div className="gr-content" style={{ left, top: PAD_T, width: inner }}>
                  {boxes.map((b, i) => {
                    const isHead = i === 0, isDrag = i === boxes.length - 1
                    const it = !isHead && !isDrag ? items[i - 1] : null
                    const key = isHead ? 'head' : isDrag ? 'drag' : pattern + it!.id
                    const w = isDrag && live !== null ? live : b.w
                    return (
                      <div key={key} className={'gr-item' + (isHead ? ' head' : '') + (isDrag ? ' drag' : '') + (isDrag && live !== null ? ' dragging' : '') + (it ? ' t-' + it.cls : '')}
                        style={{ transform: `translate(${b.x}px, ${b.y}px)`, width: w, height: b.h }}>
                        {isHead ? <><em className="gr-logo" /><span className="gr-lbl">헤더</span><span className="gr-span">1 / -1</span></>
                          : isDrag ? <>
                            <span className="gr-lbl">오른쪽 끝을 끌어 보세요</span>
                            <span className="gr-span gr-big">span {liveSpan}</span>
                            <div className="gr-handle" role="slider" tabIndex={0} aria-label="드래그 블록 폭" aria-valuemin={1} aria-valuemax={sp.cols} aria-valuenow={liveSpan}
                              aria-valuetext={`span ${liveSpan}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}><i /></div>
                          </>
                          : <><span className="gr-lbl">{it!.label}</span><span className="gr-span">span {b.span}</span></>}
                      </div>
                    )
                  })}
                  {live !== null && <div className="gr-ghost" style={{ transform: `translate(${dragBox.x}px, ${dragBox.y}px)`, width: snapW, height: dragBox.h }} aria-hidden="true" />}
                </div>
              </div>
            </div>
          </div>
          <div className="gr-read" aria-live="polite">
            <span>화면 <b>{W}px</b></span>
            <span>콘텐츠 <b>{px(inner)}</b></span>
            <span>컬럼 <b>{px(colW)}</b> × {sp.cols}</span>
            <span>거터 <b>{g}px</b></span>
            <span>마진 <b>{sp.margin}px</b></span>
            <span>축소 <b>{Math.round(s * 100)}%</b></span>
          </div>
        </div>

        <div className="gr-panel">
          <div className="gr-panel-h">{DNAME[dev]} 그리드 값 <span className="muted">· 내보내기에 반영돼요</span></div>
          <SliderRow label="컬럼 수" value={sp.cols} hint={dev === 'pc' ? '기본 12' : dev === 'tablet' ? '기본 8' : '기본 4'}>
            <Range label="컬럼 수" value={sp.cols} min={LIM[dev].cols[0]} max={LIM[dev].cols[1]} onChange={v => setG('cols', v)} />
          </SliderRow>
          <SliderRow label="거터 (컬럼 사이)" value={g} unit="px" hint="4의 배수로 움직여요">
            <Range label="거터" value={g} min={LIM[dev].gutter[0]} max={LIM[dev].gutter[1]} step={4} onChange={v => setG('gutter', v)} />
          </SliderRow>
          <SliderRow label="마진 (화면 양옆)" value={sp.margin} unit="px">
            <Range label="마진" value={sp.margin} min={LIM[dev].margin[0]} max={LIM[dev].margin[1]} step={4} onChange={v => setG('margin', v)} />
          </SliderRow>
          {dev === 'pc' ? (
            <SliderRow label="콘텐츠 최대 폭" value={sp.maxw} unit="px" hint={`화면이 ${sp.maxw + 2 * sp.margin}px보다 넓으면 가운데 정렬돼요`}>
              <Range label="콘텐츠 최대 폭" value={sp.maxw} min={960} max={1440} step={40} onChange={v => setG('maxw', v)} />
            </SliderRow>
          ) : (
            <p className="gr-small">{DNAME[dev]}은 최대 폭 없이 화면 폭을 다 써요. 최대 폭은 PC에서 바꿔요.</p>
          )}
          {uneven
            ? <Note tone="warn"><b>{sp.cols}컬럼은 이 배치가 딱 나눠떨어지지 않아요.</b> 가장 가까운 칸 수로 반올림해서 남는 칸이 생겨요.</Note>
            : <Note>값을 바꾸면 요소가 가장 가까운 컬럼에 다시 붙어요. 기기를 바꾸면 span이 달라져요.</Note>}
        </div>
      </div>
  )
}

/* ---------- 12의 약수 ---------- */
function divisors(n: number) { return Array.from({ length: n - 1 }, (_, i) => i + 1).filter(d => d > 1 && n % d === 0) }

function Anatomy() {
  const { config } = useSys()
  const pcCols = config.grid.pc.cols
  const [n, setN] = useState(12)
  const ds = divisors(n)
  const opts = [...new Set([12, 10, 8, pcCols])].sort((a, b) => a - b)
  return (
    <>
      <div className="gr-anat" aria-hidden="true">
        <span className="m">마진</span>
        {[0, 1, 2, 3].map(i => <span key={i} className="c-wrap">{i > 0 && <span className="g" />}<span className="c">컬럼</span></span>)}
        <span className="m">마진</span>
      </div>
      <dl className="gr-defs">
        <div><dt>컬럼</dt><dd>요소를 놓는 세로 칸이에요. 폭은 화면에 따라 늘었다 줄었다 해요.</dd></div>
        <div><dt>거터</dt><dd>컬럼 사이 고정 간격이에요. 요소끼리 붙지 않게 해요.</dd></div>
        <div><dt>마진</dt><dd>화면 양 끝과 콘텐츠 사이 여백이에요.</dd></div>
      </dl>
      <div className="gr-div-head">
        <b>{n}컬럼을 똑같이 나누면</b>
        <Seg value={n} onChange={setN} options={opts.map(v => [v, `${v}`] as const)} />
      </div>
      <div className="gr-divs">
        {[2, 3, 4, 6].map(k => {
          const ok = n % k === 0
          return (
            <div key={k} className={'gr-div' + (ok ? '' : ' bad')}>
              <small>{k}등분</small>
              <div className="gr-dbar" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
                {Array.from({ length: n }, (_, i) => <i key={i} data-g={Math.floor(i / (n / k)) % 2} />)}
              </div>
              <em>{ok ? `span ${n / k}` : '나눠떨어지지 않음'}</em>
            </div>
          )
        })}
      </div>
      <Note tone="tip"><b>왜 12일까요?</b> 12는 2·3·4·6으로 나눠떨어져서 2단·3단·4단·6단 배치를 모두 남는 칸 없이 만들 수 있어요.
        {n !== 12 && <>{' '}{n}의 약수는 {ds.length ? ds.join('·') + '뿐이에요' : '없어요'}.</>}
        {' '}태블릿 8컬럼·모바일 4컬럼은 2·4단을, PC 12컬럼은 3단까지 맡아요.</Note>
      <p className="gr-small">화면 구조와 내비게이션 배치는 <a href="#/layout">앱 화면 구성 가이드 →</a>, 크기가 다른 칸을 섞는 배치는 <a href="#/style/style-bento">벤토 그리드 →</a>에서 볼 수 있어요.</p>
    </>
  )
}

function Code({ pattern, drag }: { pattern: Pattern; drag: DragSpans }) {
  const { config } = useSys()
  const code = useMemo(() => gridCSS(config.grid, pattern, drag), [config.grid, pattern, drag])
  return (
    <>
      <CodeBlock code={code} label={`CSS · ${PATTERNS[pattern].name}`} maxHeight={460} />
      <p className="gr-small">분기점은 내보내기와 같아요(태블릿 768px, PC 1200px). 값은 시뮬레이터에서 고친 그대로예요.</p>
    </>
  )
}

export default function GridTab() {
  const [pattern, setPattern] = useState<Pattern>('cards')
  const [drag, setDrag] = useState<DragSpans>({ pc: 6, tablet: 4, mobile: 2 })
  return (
    <div data-sys="grid">
      <SysGrid>
        <Section id="sys-grid-sim" wide title="반응형 그리드 시뮬레이터"
          desc="PC·태블릿·모바일을 실제 폭으로 그린 뒤 화면에 맞게 줄였어요. 컬럼·거터·마진을 바꾸면 요소가 가장 가까운 컬럼에 다시 붙어요.">
          <Simulator pattern={pattern} setPattern={setPattern} drag={drag} setDrag={setDrag} />
        </Section>
        <Section id="sys-grid-code" title="CSS 코드" desc="grid-template-columns·gap·padding과 기기별 미디어 쿼리예요. 지금 고른 배치의 span도 함께 들어가요.">
          <Code pattern={pattern} drag={drag} />
        </Section>
        <Section id="sys-grid-anatomy" title="컬럼·거터·마진" desc="그리드를 이루는 세 가지와, 12컬럼이 많이 쓰이는 이유예요.">
          <Anatomy />
        </Section>
      </SysGrid>
    </div>
  )
}
