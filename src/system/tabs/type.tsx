import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Range, Seg } from '../../components/ui'
import { contrast, fmtRatio, parseColor } from '../../guides/20-contrast/lib'
import { useSys, type Device, type SysConfig, type TypeScale } from '../store'
import { CodeBlock, Note, Section, SliderRow, SysGrid } from '../ui'
import './type.css'

/* ---------- 기준 (SYSTEM_SPEC 표 값만) ---------- */
type R = [number, number]
const SPEC: Record<Device, { name: string; dist: string; w: number; body: R; caption: R; sub: R; h1: R; h1Open?: boolean; chars: R }> = {
  mobile: { name: '모바일', dist: '30cm', w: 390, body: [14, 16], caption: [12, 13], sub: [18, 20], h1: [22, 28], chars: [15, 22] },
  tablet: { name: '태블릿', dist: '40cm', w: 834, body: [16, 18], caption: [13, 14], sub: [20, 22], h1: [26, 32], chars: [25, 35] },
  pc: { name: 'PC(웹)', dist: '50~70cm', w: 1280, body: [16, 18], caption: [12, 14], sub: [20, 24], h1: [28, 40], h1Open: true, chars: [30, 40] },
}
const DEVICES: readonly (readonly [Device, string])[] = [['pc', 'PC'], ['tablet', '태블릿'], ['mobile', '모바일']]
const LH_BODY: R = [1.5, 1.6], LH_HEAD: R = [1.2, 1.3], LS: R = [-0.02, -0.01]

const rem = (px: number) => +(px / 16).toFixed(4)
const inR = (v: number, [lo, hi]: R, open = false) => v >= lo - 1e-9 && (open || v <= hi + 1e-9)
const rangeTxt = ([lo, hi]: R, open = false) => `${lo}~${hi}${open ? '+' : ''}`

/** 권장 구간 막대 */
function Zone({ min, max, zone, v }: { min: number; max: number; zone: R; v: number }) {
  const p = (x: number) => Math.max(0, Math.min(100, ((x - min) / (max - min)) * 100))
  return (
    <div className="ts-zone" aria-hidden="true">
      <i style={{ left: p(zone[0]) + '%', width: p(zone[1]) - p(zone[0]) + '%' }} />
      <b style={{ left: p(v) + '%' }} />
    </div>
  )
}

/* ---------- 줄마다 글자 수 실측 ----------
 * 줄마다 실제 폭을 재고, 같은 스타일의 한글 한 글자 폭(실측)으로 나눠 '한글 기준 글자 수'로 환산해요.
 * (공백·영문은 한글보다 좁아서 그대로 세면 실제보다 많아 보여요) */
interface Line { top: number; h: number; n: number; raw: number }
function measureLines(el: HTMLElement, probe: HTMLElement | null): Line[] {
  const box = el.getBoundingClientRect()
  const unit = probe ? probe.getBoundingClientRect().width / 10 : 0
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  const lines: Line[] = []
  const fs = parseFloat(getComputedStyle(el).fontSize) || 16
  let cur: { top: number; h: number; l: number; r: number; txt: string } | null = null
  const push = () => { if (cur) lines.push({ top: cur.top - box.top, h: cur.h, raw: cur.txt.trim().length, n: unit ? Math.round((cur.r - cur.l) / unit) : cur.txt.trim().length }) }
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = n.textContent ?? ''
    for (let i = 0; i < s.length; i++) {
      range.setStart(n, i); range.setEnd(n, i + 1)
      const r = range.getClientRects()[0]
      if (!r || r.width === 0) { if (cur) cur.txt += s[i]; continue }
      if (!cur || r.top - cur.top > fs * 0.6) { push(); cur = { top: r.top, h: r.height, l: r.left, r: r.right, txt: '' } }
      cur.txt += s[i]
      if (s[i] !== ' ') { cur.l = Math.min(cur.l, r.left); cur.r = Math.max(cur.r, r.right) }
    }
  }
  push()
  return lines
}

const SAMPLE = {
  mix: '디자인 시스템은 화면을 만드는 공통 언어예요. 버튼 하나도 Primary와 Secondary처럼 역할을 나누고, 색은 color-primary 같은 토큰 이름으로 불러요. 한글과 English가 섞인 문장에서도 크기·행간·자간이 고르게 맞아야 읽기 편해요. 한 줄이 너무 길면 다음 줄의 시작을 찾느라 눈이 헤매고, 너무 짧으면 줄바꿈이 잦아 읽는 리듬이 자꾸 끊겨요.',
  ko: '디자인 시스템은 화면을 만드는 공통 언어예요. 버튼 하나도 기본과 보조처럼 역할을 나누고, 색은 역할 이름으로 불러요. 한 화면 안에서 크기와 행간과 자간이 고르게 맞아야 읽기 편해요. 한 줄이 너무 길면 다음 줄의 시작을 찾느라 눈이 헤매고, 너무 짧으면 줄바꿈이 잦아 읽는 리듬이 자꾸 끊겨요.',
}

const setScale = (c: SysConfig, d: Device, k: keyof TypeScale, v: number): SysConfig => ({
  ...c, type: { ...c.type, ...(k === 'body' ? { base: v } : null), scale: { ...c.type.scale, [d]: { ...c.type.scale[d], [k]: v } } },
})

/* ========== 1. 실시간 시뮬레이터 ========== */
function Simulator({ dev, setDev }: { dev: Device; setDev: (d: Device) => void }) {
  const { config, update } = useSys()
  const t = config.type
  const S = SPEC[dev]
  const size = t.scale[dev].body
  const [lang, setLang] = useState<'mix' | 'ko'>('mix')
  const [lines, setLines] = useState<Line[]>([])
  const [colW, setColW] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const pRef = useRef<HTMLParagraphElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const set = (patch: Partial<SysConfig['type']>) => update(c => ({ ...c, type: { ...c.type, ...patch } }))

  const cap = S.w - config.grid[dev].margin * 2
  const measure = useCallback(() => {
    if (!pRef.current) return
    setLines(measureLines(pRef.current, probeRef.current))
    setColW(Math.round(pRef.current.getBoundingClientRect().width))
  }, [])
  useLayoutEffect(measure, [measure, size, t.lh, t.ls, t.maxw, t.keepAll, lang, dev, cap])
  useEffect(() => {
    const ro = new ResizeObserver(() => measure())
    if (stageRef.current) ro.observe(stageRef.current)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [measure])

  const full = lines.length > 1 ? lines.slice(0, -1) : lines
  const avg = full.length ? Math.round(full.reduce((a, l) => a + l.n, 0) / full.length) : 0
  const charsOk = inR(avg, S.chars)
  const limit = Math.min(t.maxw, cap)
  const shrunk = colW > 0 && colW < limit - 2

  const code = `/* 본문 타이포그래피 — ${S.name} 기준 */
:root {
  --font-size-body: ${rem(size)}rem; /* ${size}px */
  --line-height-body: ${t.lh};
  --line-height-heading: ${t.lhHeading};
  --letter-spacing: ${t.ls}em;
  --measure: ${rem(t.maxw)}rem; /* ${t.maxw}px */
}
body {
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  letter-spacing: var(--letter-spacing);${t.keepAll ? `
  word-break: keep-all;      /* 어절 단위 줄바꿈 */
  overflow-wrap: anywhere;   /* 긴 URL은 그래도 끊기 */` : ''}
}
h1, h2, h3 { line-height: var(--line-height-heading); }
p { max-width: var(--measure); }`

  return (
    <Section id="sys-type-sim" wide title="실시간 타이포 시뮬레이터"
      desc="크기·행간·자간·줄 길이를 바꾸면 미리보기 본문이 바로 바뀌고, 한 줄에 몇 글자가 들어가는지 실제로 세어 보여줘요. 값은 내보내기에도 그대로 들어가요."
      aside={<Seg value={dev} onChange={setDev} options={DEVICES} />}>
      <div className="ts-sim">
        <div className="ts-controls">
          <SliderRow label="글자 크기 (본문)" value={<>{size}px <small>· {rem(size)}rem</small></>} ok={inR(size, S.body)}
            hint={<>{S.name} 권장 {rangeTxt(S.body)}px{dev === 'mobile' ? ' · 입력창은 16px 이상' : dev === 'pc' ? ' · 최소 16px' : ''}</>}>
            <Range value={size} min={12} max={24} onChange={v => update(c => setScale(c, dev, 'body', v))} label="글자 크기" />
            <Zone min={12} max={24} zone={S.body} v={size} />
          </SliderRow>
          <SliderRow label="본문 행간" value={<>{t.lh.toFixed(2)} <small>· {Math.round(t.lh * 100)}%</small></>} ok={inR(t.lh, LH_BODY)} hint="권장 1.5~1.6">
            <Range value={t.lh} min={1} max={2.2} step={0.05} onChange={v => set({ lh: +v.toFixed(2) })} label="본문 행간" />
            <Zone min={1} max={2.2} zone={LH_BODY} v={t.lh} />
          </SliderRow>
          <SliderRow label="제목 행간" value={t.lhHeading.toFixed(2)} ok={inR(t.lhHeading, LH_HEAD)} hint="권장 1.2~1.3">
            <Range value={t.lhHeading} min={1} max={1.8} step={0.05} onChange={v => set({ lhHeading: +v.toFixed(2) })} label="제목 행간" />
            <Zone min={1} max={1.8} zone={LH_HEAD} v={t.lhHeading} />
          </SliderRow>
          <SliderRow label="자간" value={<>{t.ls.toFixed(3)}em <small>· {(t.ls * 100).toFixed(1)}%</small></>} ok={inR(t.ls, LS)} hint="권장 -0.01~-0.02em">
            <Range value={t.ls} min={-0.06} max={0.06} step={0.005} onChange={v => set({ ls: +v.toFixed(3) })} label="자간" />
            <Zone min={-0.06} max={0.06} zone={LS} v={t.ls} />
          </SliderRow>
          <SliderRow label="본문 최대 너비" value={<>{t.maxw}px <small>· {rem(t.maxw)}rem</small></>} ok={charsOk}
            hint={<>한 줄 {S.name} 권장 {rangeTxt(S.chars)}자 — 지금 평균 <b>{avg}자</b></>}>
            <Range value={t.maxw} min={240} max={1000} step={10} onChange={v => set({ maxw: v })} label="본문 최대 너비" />
          </SliderRow>
          <div className="ts-toggle">
            <span><b>word-break: keep-all</b><small>어절(띄어쓰기) 단위로 줄바꿈</small></span>
            <button className="switch" role="switch" aria-checked={t.keepAll} aria-label="keep-all" onClick={() => set({ keepAll: !t.keepAll })} />
          </div>
          <a className="ts-more" href="#/type/type-measure">한 줄 글자 수 자세히 →</a>
        </div>

        <div className="ts-stage" ref={stageRef}>
          <div className="ts-stage-bar">
            <Seg value={lang} onChange={setLang} options={[['mix', '한글+영문'], ['ko', '한글만']]} />
            <span className={'ts-meter ' + (charsOk ? 'ok' : 'bad')} aria-live="polite">
              한 줄 평균 <b>{avg}자</b> <small>(한글 기준 환산, 마지막 줄 제외)</small> · 권장 {rangeTxt(S.chars)}자
            </span>
          </div>
          <div className="ts-page" style={{ letterSpacing: t.ls + 'em', wordBreak: t.keepAll ? 'keep-all' : 'normal', overflowWrap: t.keepAll ? 'anywhere' : 'normal' }}>
            <div className="ts-col" style={{ maxWidth: limit }}>
              <h4 style={{ fontSize: t.scale[dev].h2, lineHeight: t.lhHeading }}>한 줄 글자 수가 읽는 리듬을 정해요</h4>
              <div className="ts-prose">
                <p ref={pRef} style={{ fontSize: size, lineHeight: t.lh }}>{SAMPLE[lang]}</p>
                <span ref={probeRef} className="ts-probe" aria-hidden="true" style={{ fontSize: size }}>가나다라마바사아자차</span>
                <ol className="ts-ruler" aria-hidden="true">
                  {lines.map((l, i) => {
                    const last = i === lines.length - 1 && lines.length > 1
                    return <li key={i} className={last ? 'last' : inR(l.n, S.chars) ? 'ok' : 'bad'} style={{ top: l.top, height: l.h }} title={`한글 기준 ${l.n}자 · 실제 문자 ${l.raw}개(공백 포함)`}>{l.n}</li>
                  })}
                </ol>
              </div>
              <p className="ts-cap" style={{ fontSize: t.scale[dev].caption, lineHeight: t.lh }}>캡션 {t.scale[dev].caption}px · 작성 2026.11.08 · 조회 1,284</p>
            </div>
          </div>
          <div className="ts-foot">
            <span>본문 폭 <b>{colW}px</b>{shrunk ? ' — 미리보기 칸이 좁아 설정한 폭보다 줄었어요' : dev !== 'pc' && t.maxw > cap ? <> — {S.name} 화면({S.w}px − 여백 {config.grid[dev].margin}×2)에 맞춰 {cap}px로 줄었어요</> : ''}</span>
          </div>
        </div>
      </div>
      <CodeBlock code={code} />
    </Section>
  )
}

/* ========== 2. 기기별 위계 스케일 ========== */
const ROWS: { k: keyof TypeScale; tag: string; role: string; sample: string; weight: number }[] = [
  { k: 'h1', tag: 'H1', role: '대제목', sample: '오늘의 추천 여행지', weight: 700 },
  { k: 'h2', tag: 'H2', role: '중간 제목', sample: '가을에 걷기 좋은 길', weight: 700 },
  { k: 'h3', tag: 'H3', role: '소제목', sample: '서울 성곽길 한 바퀴', weight: 600 },
  { k: 'body', tag: 'Body', role: '본문', sample: '천천히 걸어도 두 시간이면 충분해요. 중간에 쉬어 갈 카페도 많아요.', weight: 400 },
  { k: 'caption', tag: 'Caption', role: '캡션', sample: '사진 · 2026년 10월 촬영', weight: 400 },
]

function rangeOf(d: Device, k: keyof TypeScale, s: TypeScale): { txt: string; ok: boolean } {
  const S = SPEC[d]
  if (k === 'h1') return { txt: rangeTxt(S.h1, S.h1Open), ok: inR(s.h1, S.h1, S.h1Open) }
  if (k === 'h3') return { txt: rangeTxt(S.sub), ok: inR(s.h3, S.sub) }
  if (k === 'body') return { txt: rangeTxt(S.body), ok: inR(s.body, S.body) }
  if (k === 'caption') return { txt: rangeTxt(S.caption), ok: inR(s.caption, S.caption) && s.caption >= 11 }
  return { txt: 'H3 < H2 < H1', ok: s.h2 > s.h3 && s.h2 < s.h1 }
}

function NumBox({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const clamp = (v: number) => Math.max(10, Math.min(72, Math.round(v)))
  return (
    <div className="ts-num">
      <button type="button" aria-label={label + ' 1px 작게'} onClick={() => onChange(clamp(value - 1))}>−</button>
      <input type="number" inputMode="numeric" aria-label={label + ' (px)'} value={value} min={10} max={72}
        onChange={e => { const v = +e.target.value; if (v) onChange(clamp(v)) }} />
      <button type="button" aria-label={label + ' 1px 크게'} onClick={() => onChange(clamp(value + 1))}>+</button>
    </div>
  )
}

function Scale({ dev, setDev }: { dev: Device; setDev: (d: Device) => void }) {
  const { config, update } = useSys()
  const t = config.type
  const s = t.scale[dev]
  const order = s.h1 > s.h2 && s.h2 > s.h3 && s.h3 > s.body && s.body > s.caption
  const code = (['mobile', 'tablet', 'pc'] as const).map(d => {
    const v = t.scale[d]
    const body = (['h1', 'h2', 'h3', 'body', 'caption'] as const).map(k => `  --font-size-${k}: ${rem(v[k])}rem; /* ${v[k]}px */`).join('\n')
    const inner = d === 'mobile' ? `:root {\n${body}\n}` : `@media (min-width: ${d === 'tablet' ? 768 : 1200}px) {\n  :root {\n${body.replace(/^/gm, '  ')}\n  }\n}`
    return `/* ${SPEC[d].name} */\n${inner}`
  }).join('\n\n') + `\n\nh1 { font-size: var(--font-size-h1); font-weight: 700; }\nh2 { font-size: var(--font-size-h2); font-weight: 700; }\nh3 { font-size: var(--font-size-h3); font-weight: 600; }\nsmall, .caption { font-size: var(--font-size-caption); }`

  return (
    <Section id="sys-type-scale" wide title="기기별 위계 스케일"
      desc={<>PC·태블릿·모바일을 바꿔 가며 제목부터 캡션까지 실제 크기(px)로 비교해요. 숫자를 고치면 그 기기의 스케일이 바뀌어요. 시청 거리 {SPEC[dev].dist} 기준이에요.</>}
      aside={<Seg value={dev} onChange={setDev} options={DEVICES} />}>
      <div className="ts-scale" data-dev={dev}>
        {ROWS.map(r => {
          const v = s[r.k], rg = rangeOf(dev, r.k, s)
          return (
            <div className="ts-row" key={r.k}>
              <div className="ts-row-meta">
                <span className="ts-tag">{r.tag}<small>{r.role}</small></span>
                <NumBox value={v} label={r.tag} onChange={nv => update(c => setScale(c, dev, r.k, nv))} />
                <span className="ts-rem">{rem(v)}rem</span>
                <span className={'ts-badge ' + (rg.ok ? 'ok' : 'bad')} title="권장 범위">{rg.ok ? '✓' : '!'} {rg.txt}{r.k === 'h2' ? '' : 'px'}</span>
              </div>
              <div className="ts-row-sample" style={{ fontSize: v, fontWeight: r.weight, lineHeight: r.k === 'body' || r.k === 'caption' ? t.lh : t.lhHeading, letterSpacing: t.ls + 'em', color: r.k === 'caption' ? 'var(--text-3)' : undefined }}>
                {r.sample}
              </div>
            </div>
          )
        })}
      </div>
      <div className="ts-scale-sum">
        <span>H1 ÷ 본문 <b>{(s.h1 / s.body).toFixed(2)}배</b></span>
        <span>단계 비율 평균 <b>{Math.pow(s.h1 / s.caption, 1 / 4).toFixed(2)}</b></span>
        <span className={order ? 'ok' : 'bad'}>{order ? '✓ 크기 순서가 위계와 맞아요' : '! 아래 단계가 위 단계보다 크거나 같아요'}</span>
        <a href="#/type/type-scale">타입 스케일 자세히 →</a>
      </div>
      <CodeBlock code={code} maxHeight={260} />
    </Section>
  )
}

/* ========== 3. 기기별 권장 범위 표 ========== */
function SpecTable({ dev }: { dev: Device }) {
  const rows: [string, (d: Device) => ReactNode][] = [
    ['시청 거리', d => SPEC[d].dist],
    ['본문', d => d === 'mobile' ? <>14~16px<small>iOS 17pt, 입력창 16px 이상</small></> : d === 'pc' ? <>16~18px<small>최소 16px</small></> : '16~18px'],
    ['캡션', d => d === 'mobile' ? <>12~13px<small>11px 미만 지양</small></> : `${rangeTxt(SPEC[d].caption)}px`],
    ['소제목', d => `${rangeTxt(SPEC[d].sub)}px`],
    ['대제목', d => `${rangeTxt(SPEC[d].h1, SPEC[d].h1Open)}px`],
    ['한 줄', d => `${rangeTxt(SPEC[d].chars)}자`],
  ]
  const cols: Device[] = ['mobile', 'tablet', 'pc']
  return (
    <Section id="sys-type-spec" title="기기별 권장 범위" desc="화면이 눈에서 멀수록 글자는 커지고, 한 줄은 길어져요. 지금 고른 기기 칸이 강조돼요.">
      <div className="sys-table-wrap">
        <table className="sys-table ts-spec">
          <thead><tr><th>구분</th>{cols.map(d => <th key={d} className={d === dev ? 'cur' : ''}>{SPEC[d].name}</th>)}</tr></thead>
          <tbody>
            {rows.map(([n, f]) => <tr key={n}><td><b>{n}</b></td>{cols.map(d => <td key={d} className={d === dev ? 'cur' : ''}>{f(d)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <Note>시청 거리와 기본 크기의 관계는 <a href="#/type/type-distance">시청 거리 카드 →</a>, 입력창 확대 문제는 <a href="#/type/type-ios">입력창 16px 규칙 →</a>에서 직접 볼 수 있어요.</Note>
    </Section>
  )
}

/* ========== 4. 굵기·색·숫자 ========== */
const INKS: [string, string][] = [['#111111', '본문'], ['#333333', '본문'], ['#666666', '보조'], ['#767676', '보조 마지노선']]
function Basics() {
  const [tab, setTab] = useState(true)
  const white = parseColor('#ffffff')!.rgb
  return (
    <Section id="sys-type-basics" title="굵기·색·숫자·단위" desc="스케일 말고도 매번 정해야 하는 기준이에요. 짧게 보고, 자세한 실험은 카드에서 해요.">
      <div className="ts-weights">
        {[[400, '본문'], [600, '강조·버튼'], [700, '제목']].map(([w, l]) => (
          <div key={w}><b style={{ fontWeight: w as number }}>가나다 Aa</b><span>{w} · {l}</span></div>
        ))}
      </div>
      <p className="ts-line">굵기는 <b>3~4단계</b>(400 / 500·600 / 700)만 써요. <a href="#/type/type-weight">굵기 →</a></p>
      <div className="ts-inks">
        {INKS.map(([hex, l]) => {
          const r = contrast(parseColor(hex)!.rgb, white)
          return (
            <div key={hex} className="ts-ink">
              <span className="ts-ink-sw" style={{ color: hex }}>가</span>
              <span><code>{hex}</code><small>{l} · 흰 배경 {fmtRatio(r)}:1</small></span>
            </div>
          )
        })}
      </div>
      <p className="ts-line">본문은 <b>#111~#333</b>, 보조 글자는 <b>#666~#767676</b>이에요. <a href="#/type/type-contrast">색상과 대비 →</a></p>
      <div className="ts-nums">
        <div className="row"><span className="muted">숫자 폭</span><Seg value={tab ? 't' : 'p'} onChange={v => setTab(v === 't')} options={[['p', '기본'], ['t', 'tabular-nums']]} /></div>
        <ul style={{ fontVariantNumeric: tab ? 'tabular-nums' : 'normal' }}>
          {['11,111원', '98,000원', '1,480,000원', '7,710원'].map(n => <li key={n}>{n}</li>)}
        </ul>
      </div>
      <p className="ts-line">가격·통계처럼 세로로 쌓이는 숫자는 <code>font-variant-numeric: tabular-nums</code>로 폭을 맞춰요. 웹 단위는 <b>rem</b>을 써요(16px = 1rem). <a href="#/type/type-num">숫자 정렬 →</a> · <a href="#/type/type-rem">rem · px →</a></p>
    </Section>
  )
}

export default function TypeTab() {
  const [dev, setDev] = useState<Device>('pc')
  return (
    <div data-sys="type">
      <SysGrid>
        <Simulator dev={dev} setDev={setDev} />
        <Scale dev={dev} setDev={setDev} />
        <SpecTable dev={dev} />
        <Basics />
      </SysGrid>
    </div>
  )
}
