import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Range, Seg } from '../../components/ui'
import { DEFAULT, useSys } from '../store'
import { CodeBlock, Note, Section, SliderRow, SysGrid } from '../ui'
import './space.css'

const rem = (v: number) => `${+(v / 16).toFixed(4)}rem`
/** 실무에서 자주 쓰는 자리 (사용자 자료 기준) */
const ROLE: Record<number, string> = { 4: '아이콘–글자', 16: '카드 안쪽 (촘촘)', 24: '카드 안쪽 (넉넉)', 48: '섹션 사이 (최소)', 64: '큰 섹션 사이' }

/** 간격 띠(피그마의 빨간 측정 표시처럼) */
function Gap({ size, dir = 'h', label, style }: { size: number; dir?: 'h' | 'v'; label?: ReactNode; style?: CSSProperties }) {
  return (
    <span className={'sp-gap ' + dir} style={{ ...(dir === 'h' ? { width: size } : { height: size }), ...style }} aria-hidden="true">
      <b>{label ?? size}</b>
    </span>
  )
}

/* ---------- 1. 간격 스케일 ---------- */
function Scale() {
  const { config, update } = useSys()
  const { unit, scale } = config.space
  const setUnit = (u: 4 | 8) => update(c => ({ ...c, space: { ...c.space, unit: u } }))
  const setAt = (i: number, v: number) => update(c => ({ ...c, space: { ...c.space, scale: c.space.scale.map((x, j) => (j === i ? v : x)) } }))
  const isDefault = JSON.stringify(scale) === JSON.stringify(DEFAULT.space.scale)
  const max = Math.max(...scale, 1)
  return (
    <>
      <div className="sp-row">
        <Seg value={unit} onChange={setUnit} options={[[4, '4pt 기준'], [8, '8pt 기준 + 4 보조']] as const} />
        {!isDefault && <button type="button" className="btn ghost sm" onClick={() => update(c => ({ ...c, space: { ...c.space, scale: DEFAULT.space.scale } }))}>스케일 되돌리기</button>}
      </div>
      <ol className="sp-scale">
        {scale.map((v, i) => {
          const kind = v % 8 === 0 ? 'ok' : v % 4 === 0 ? (unit === 8 ? 'half' : 'ok') : 'bad'
          return (
            <li key={i}>
              <code>--space-{i + 1}</code>
              <span className="sp-bar"><i style={{ width: `${(v / max) * 100}%` }} /><em style={{ width: v, height: v }} title={`실제 크기 ${v}px`} /></span>
              <label className="sp-num">
                <input type="number" min={0} max={160} step={4} value={v} aria-label={`--space-${i + 1} 값(px)`}
                  onChange={e => { const n = Math.round(+e.target.value); if (Number.isFinite(n)) setAt(i, Math.max(0, Math.min(160, n))) }} />
                <span>px · {rem(v)}</span>
              </label>
              <span className={'sp-badge ' + kind}>{kind === 'ok' ? (unit === 8 ? '8의 배수' : '4의 배수') : kind === 'half' ? '4 · 보조' : '격자 밖'}</span>
              <span className="sp-role">{ROLE[v] ?? ''}</span>
            </li>
          )
        })}
      </ol>
      <Note>
        <b>4pt/8pt 하이브리드:</b> 기본 걸음은 {unit}px이에요. {unit === 8 ? '큰 간격은 8의 배수로, 아이콘 옆처럼 아주 작은 자리만 4px을 써요.' : '모든 값을 4의 배수로 맞춰요. 12px처럼 8로는 안 되는 중간 값도 쓸 수 있어요.'} 값이 격자 위에 있으면 요소 끝선이 저절로 맞아요.
      </Note>
    </>
  )
}

/* ---------- 2. 실무 예시 ---------- */
function Examples() {
  const { config } = useSys()
  const [pad, setPad] = useState<16 | 24>(16)
  const tok = (v: number) => { const i = config.space.scale.indexOf(v); return i >= 0 ? `--space-${i + 1}` : `${v}px` }
  return (
    <div className="sp-ex">
      <figure>
        <div className="sp-ex-stage">
          <span className="sp-chip">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            <Gap size={4} />
            <span>검색</span>
          </span>
        </div>
        <figcaption><b>아이콘–글자 4px</b><span>{tok(4)} · 한 덩어리로 읽혀요</span></figcaption>
      </figure>
      <figure>
        <div className="sp-ex-stage">
          <div className="sp-mini-card" style={{ padding: pad }}>
            <span className="sp-pad" style={{ borderWidth: pad }} aria-hidden="true"><b>{pad}</b></span>
            <i className="sp-sk w60" /><i className="sp-sk" /><i className="sp-sk w80" />
          </div>
        </div>
        <figcaption>
          <b>카드 안쪽 16·24px</b>
          <Seg value={pad} onChange={setPad} options={[[16, '16'], [24, '24']] as const} />
        </figcaption>
      </figure>
      <figure>
        <div className="sp-ex-stage col">
          <div className="sp-sec"><i className="sp-sk w40" /><i className="sp-sk" /></div>
          <Gap size={48} dir="v" />
          <div className="sp-sec"><i className="sp-sk w40" /><i className="sp-sk" /></div>
        </div>
        <figcaption><b>섹션 사이 48px 이상</b><span>{tok(48)} · 주제가 바뀐 걸 알려요</span></figcaption>
      </figure>
    </div>
  )
}

/* ---------- 3. 플레이그라운드 ---------- */
const PG = [72, 24, 40, 40] // 이미지 · 제목 · 설명 · 버튼 (모두 8의 배수 높이)
function PlayCard({ pad, gap, unit, grid, title }: { pad: number; gap: number; unit: number; grid: boolean; title: ReactNode }) {
  let y = pad
  const bands = PG.slice(0, -1).map(h => { y += h; const t = y; y += gap; return t })
  return (
    <figure className="sp-pg-col">
      <figcaption>{title}</figcaption>
      <div className="sp-pg-card" style={{ padding: pad, gap }}>
        {grid && <span className="sp-grid" style={{ backgroundSize: `${unit}px ${unit}px` }} aria-hidden="true" />}
        <span className="sp-pad" style={{ borderWidth: pad }} aria-hidden="true">{pad > 9 && <b>{pad}</b>}</span>
        {gap > 0 && bands.map((t, i) => <span key={i} className="sp-gapband" style={{ top: t, height: gap, left: pad, right: pad }} aria-hidden="true">{i === 1 && gap > 9 && <b>{gap}</b>}</span>)}
        <div className="pg-img" />
        <div className="pg-title">따뜻한 아침 산책</div>
        <div className="pg-desc">가까운 공원에서 30분 걷기 코스를 추천해요. 지금 날씨가 좋아요.</div>
        <div className="pg-btns"><span className="pg-btn">저장</span><span className="pg-btn on">시작하기</span></div>
      </div>
    </figure>
  )
}

function Playground() {
  const { config, update } = useSys()
  const unit = config.space.unit
  const [pad, setPad] = useState(18)
  const [gap, setGap] = useState(11)
  const [grid, setGrid] = useState(true)
  const snap = (v: number) => Math.round(v / unit) * unit
  const sp = snap(pad), sg = snap(gap)
  const tok = (v: number) => { const i = config.space.scale.indexOf(v); return i >= 0 ? `var(--space-${i + 1}); /* ${v}px */` : `${v}px;` }
  const code = `.card {
  display: flex;
  flex-direction: column;
  padding: ${tok(sp)}
  gap: ${tok(sg)}
}`
  return (
    <div className="sp-pg">
      <div className="sp-pg-ctrl">
        <div className="sp-row">
          <Seg value={unit} onChange={u => update(c => ({ ...c, space: { ...c.space, unit: u } }))} options={[[4, '4의 배수로 스냅'], [8, '8의 배수로 스냅']] as const} />
          <button type="button" className="chip" aria-pressed={grid} onClick={() => setGrid(g => !g)}>{grid ? '✓ ' : ''}{unit}px 격자</button>
        </div>
        <SliderRow label="padding (카드 안쪽)" value={pad === sp ? `${pad}px` : `${pad}px → ${sp}px`} ok={pad === sp}>
          <Range label="padding" value={pad} min={0} max={48} onChange={setPad} />
        </SliderRow>
        <SliderRow label="gap (요소 사이)" value={gap === sg ? `${gap}px` : `${gap}px → ${sg}px`} ok={gap === sg}>
          <Range label="gap" value={gap} min={0} max={40} onChange={setGap} />
        </SliderRow>
        <p className="sp-small">슬라이더는 1px씩 자유롭게 움직여요. 오른쪽 카드는 가장 가까운 {unit}의 배수로 붙어요. 격자를 켜면 스냅한 쪽만 끝선이 줄에 맞아요.</p>
        <CodeBlock code={code} label="CSS · 스냅한 값" />
      </div>
      <div className="sp-pg-pair">
        <PlayCard pad={pad} gap={gap} unit={unit} grid={grid} title={<><span className="sp-badge bad">스냅 끔</span> {pad} · {gap}</>} />
        <PlayCard pad={sp} gap={sg} unit={unit} grid={grid} title={<><span className="sp-badge ok">스냅 켬</span> {sp} · {sg}</>} />
      </div>
    </div>
  )
}

/* ---------- 4. 오토 레이아웃 ↔ Flexbox ---------- */
type Dir = 'h' | 'v'
type Al = 'start' | 'center' | 'end'
type Size = 'hug' | 'fill' | 'fixed'
const FLEX: Record<Al, string> = { start: 'flex-start', center: 'center', end: 'flex-end' }
const VN: Record<Al, string> = { start: 'Top', center: 'Center', end: 'Bottom' }
const HN: Record<Al, string> = { start: 'left', center: 'center', end: 'right' }
const SIZE_NAME: Record<Size, string> = { hug: 'Hug contents', fill: 'Fill container', fixed: 'Fixed' }
const SHORT = '저장'
const LONG = '변경 사항을 저장하고 팀원에게 알리기'
const FRAME_W = 320, LABEL_W = 140

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [s, setS] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setS({ w: Math.round(el.offsetWidth), h: Math.round(el.offsetHeight) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, s] as const
}

function AutoLayout() {
  const [dir, setDir] = useState<Dir>('h')
  const [gap, setGap] = useState(8)
  const [auto, setAuto] = useState(false)
  const [ph, setPh] = useState(16)
  const [pv, setPv] = useState(12)
  const [va, setVa] = useState<Al>('center')
  const [ha, setHa] = useState<Al>('start')
  const [fw, setFw] = useState<Size>('hug')
  const [lw, setLw] = useState<Size>('hug')
  const [long, setLong] = useState(false)
  const [flash, setFlash] = useState<{ k: string; n: number }>({ k: '', n: 0 })
  const [frameRef, size] = useSize<HTMLDivElement>()
  const [figmaNote, setFigmaNote] = useState(false)
  const touch = (k: string) => setFlash(f => ({ k, n: f.n + 1 }))

  const main = dir === 'h' ? ha : va, cross = dir === 'h' ? va : ha
  const justify = auto ? 'space-between' : FLEX[main]
  const frameStyle: CSSProperties = {
    flexDirection: dir === 'h' ? 'row' : 'column', gap: auto ? 0 : gap, padding: `${pv}px ${ph}px`,
    justifyContent: justify, alignItems: FLEX[cross],
    width: fw === 'hug' ? 'fit-content' : fw === 'fixed' ? FRAME_W : undefined, alignSelf: fw === 'fill' ? 'stretch' : undefined,
  }
  const labelStyle: CSSProperties = lw === 'hug' ? { flex: 'none', whiteSpace: 'nowrap' }
    : lw === 'fixed' ? { flex: 'none', width: LABEL_W }
      : dir === 'h' ? { flex: '1 1 0', minWidth: 0 } : { alignSelf: 'stretch' }

  const setLabelW = (v: Size) => {
    setLw(v); touch('lw')
    if (v === 'fill' && fw === 'hug') { setFw('fixed'); setFigmaNote(true); touch('fw') } else setFigmaNote(false)
  }
  const setFrameW = (v: Size) => {
    setFw(v); touch('fw')
    if (v === 'hug' && lw === 'fill') { setLw('hug'); setFigmaNote(true); touch('lw') } else setFigmaNote(false)
  }

  const cssFrame = [
    'display: flex;',
    `flex-direction: ${dir === 'h' ? 'row' : 'column'};`,
    auto ? null : `gap: ${gap}px;`,
    `padding: ${pv === ph ? `${pv}px` : `${pv}px ${ph}px`};`,
    `justify-content: ${justify};`,
    `align-items: ${FLEX[cross]};`,
    fw === 'hug' ? 'width: fit-content;' : fw === 'fixed' ? `width: ${FRAME_W}px;` : 'align-self: stretch; /* 부모가 세로 Auto Layout */',
  ].filter(Boolean) as string[]
  const cssLabel = lw === 'hug' ? ['flex: none;', 'white-space: nowrap;'] : lw === 'fixed' ? ['flex: none;', `width: ${LABEL_W}px;`]
    : dir === 'h' ? ['flex: 1 1 0;', 'min-width: 0;'] : ['align-self: stretch;']
  const code = `.frame {\n${cssFrame.map(s => '  ' + s).join('\n')}\n}\n.frame > .label {\n${cssLabel.map(s => '  ' + s).join('\n')}\n}`

  const alignName = `${VN[va]} ${HN[ha]}`.replace('Center center', 'Center')
  const rows: { k: string; figma: string; css: string }[] = [
    { k: 'dir', figma: dir === 'h' ? '방향 → Horizontal' : '방향 ↓ Vertical', css: `flex-direction: ${dir === 'h' ? 'row' : 'column'}` },
    { k: 'gap', figma: auto ? '간격 Auto' : `간격 ${gap}`, css: auto ? 'justify-content: space-between' : `gap: ${gap}px` },
    { k: 'pad', figma: `패딩 가로 ${ph} · 세로 ${pv}`, css: `padding: ${pv}px ${ph}px` },
    { k: 'al', figma: `정렬 ${alignName}`, css: `${auto ? '' : `justify-content: ${justify}; `}align-items: ${FLEX[cross]}` },
    { k: 'fw', figma: `프레임 W · ${SIZE_NAME[fw]}${fw === 'fixed' ? ' ' + FRAME_W : ''}`, css: cssFrame[cssFrame.length - 1].replace(/;.*$/, '') },
    { k: 'lw', figma: `글자 W · ${SIZE_NAME[lw]}${lw === 'fixed' ? ' ' + LABEL_W : ''}`, css: cssLabel.map(s => s.replace(/;$/, '')).join('; ') },
  ]

  return (
    <div className="sp-al">
      {/* 피그마 속성 패널 흉내 */}
      <div className="sp-fig" aria-label="Auto Layout 속성">
        <div className="sp-fig-h">Auto layout</div>
        <div className="sp-fig-row">
          <span>방향</span>
          <Seg value={dir} onChange={v => { setDir(v); touch('dir') }} options={[['v', '↓ 세로'], ['h', '→ 가로']] as const} />
        </div>
        <div className="sp-fig-row top">
          <span>정렬</span>
          <div className="sp-align" role="group" aria-label="정렬">
            {(['start', 'center', 'end'] as const).map(v => (['start', 'center', 'end'] as const).map(h => {
              const on = va === v && ha === h
              return <button key={v + h} type="button" aria-pressed={on} aria-label={`${VN[v]} ${HN[h]}`} className={on ? 'on' : ''}
                onClick={() => { setVa(v); setHa(h); touch('al') }}><i className={dir} /></button>
            }))}
          </div>
        </div>
        <SliderRow label={<>간격 <label className="sp-auto"><input type="checkbox" checked={auto} onChange={e => { setAuto(e.target.checked); touch('gap') }} /> Auto</label></>} value={auto ? 'Auto' : `${gap}`}>
          <Range label="간격" value={gap} min={0} max={40} step={4} onChange={v => { setGap(v); setAuto(false); touch('gap') }} />
        </SliderRow>
        <SliderRow label="패딩 가로" value={ph}>
          <Range label="패딩 가로" value={ph} min={0} max={40} step={4} onChange={v => { setPh(v); touch('pad') }} />
        </SliderRow>
        <SliderRow label="패딩 세로" value={pv}>
          <Range label="패딩 세로" value={pv} min={0} max={40} step={4} onChange={v => { setPv(v); touch('pad') }} />
        </SliderRow>
        <div className="sp-fig-row col">
          <span>프레임 너비 (W)</span>
          <Seg className="full" value={fw} onChange={setFrameW} options={[['hug', 'Hug'], ['fill', 'Fill'], ['fixed', 'Fixed']] as const} />
        </div>
        <div className="sp-fig-row col">
          <span>글자 너비 (W)</span>
          <Seg className="full" value={lw} onChange={setLabelW} options={[['hug', 'Hug'], ['fill', 'Fill'], ['fixed', 'Fixed']] as const} />
        </div>
        <div className="sp-fig-row col">
          <span>글자 길이</span>
          <Seg className="full" value={long ? 'l' : 's'} onChange={v => setLong(v === 'l')} options={[['s', '짧게'], ['l', '길게']] as const} />
        </div>
      </div>

      <div className="sp-al-mid">
        <div className="sp-canvas">
          <span className="sp-canvas-tag">부모 프레임 · 세로 Auto Layout</span>
          <div className="sp-frame" ref={frameRef} style={frameStyle}>
            <span className="sp-pad" style={{ borderWidth: `${pv}px ${ph}px` }} aria-hidden="true" />
            <span className="sp-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10" /></svg></span>
            <span className="sp-label" style={labelStyle}>{long ? LONG : SHORT}</span>
            <span className="sp-count">3</span>
            <span className="sp-dim">{size.w} × {size.h}</span>
          </div>
        </div>
        {figmaNote && <Note tone="tip"><b>피그마와 같아요.</b> Hug 부모 안에서는 자식이 Fill이 될 수 없어서, 한쪽을 바꾸면 다른 쪽이 자동으로 바뀌어요.</Note>}
        <p className="sp-small">{fw === 'hug' && lw === 'hug' ? '글자를 길게 바꿔 보세요. Hug는 내용만큼 프레임이 늘어나요.' : fw === 'hug' ? '프레임이 Hug라 내용 폭만큼만 차지해요.' : fw === 'fill' ? 'Fill은 부모 폭을 꽉 채워요. 브라우저 폭을 바꾸면 같이 늘어나요.' : `Fixed는 내용과 상관없이 ${FRAME_W}px을 지켜요.`}</p>
      </div>

      <div className="sp-al-code">
        <table className="sp-map">
          <thead><tr><th>Figma</th><th>CSS</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.k + (flash.k === r.k ? flash.n : '')} className={flash.k === r.k ? 'flash' : ''}>
                <td>{r.figma}</td><td><code>{r.css}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
        <CodeBlock code={code} label="CSS · Flexbox" />
      </div>
    </div>
  )
}

export default function SpaceTab() {
  return (
    <div data-sys="space">
      <SysGrid>
        <Section id="sys-space-scale" title="간격 스케일" desc="정해진 계단만 쓰면 화면 전체 간격이 같은 리듬을 가져요. 값을 고치면 내보내기에도 바로 들어가요.">
          <Scale />
        </Section>
        <Section id="sys-space-examples" title="실무에서 자주 쓰는 간격" desc="가까울수록 한 묶음, 멀수록 다른 묶음으로 읽혀요.">
          <Examples />
        </Section>
        <Section id="sys-space-play" wide title="간격 플레이그라운드" desc="padding과 gap을 마음대로 움직여 보세요. 같은 값을 격자에 붙인 카드와 나란히 비교해요.">
          <Playground />
        </Section>
        <Section id="sys-space-autolayout" wide title="오토 레이아웃 ↔ Flexbox" desc="피그마 Auto Layout 속성은 CSS Flexbox와 1:1로 대응해요. 왼쪽 값을 바꾸면 미리보기와 CSS가 함께 바뀌어요.">
          <AutoLayout />
        </Section>
      </SysGrid>
    </div>
  )
}
