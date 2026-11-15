/* 06 스타일 · 디자인 시스템 — 데모 모음. fixed=false 문제 그대로, true 해결 적용 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Seg, useTimers } from '../../components/ui'
import { Meter } from '../ui'

const fmt = (n: number) => n.toLocaleString('ko-KR')
const cssVar = (name: string, v: string | number) => ({ [name]: v }) as CSSProperties

/* ---------- 01 M3 · HIG 스펙 충돌 ---------- */
type Spec = { title: number; titleLh: number; body: number; bodyLh: number; btn: number; radius: number }
const M3: Spec = { title: 22, titleLh: 28, body: 16, bodyLh: 24, btn: 40, radius: 20 }   // Title Large · Body Large · 버튼 40dp · 완전 둥근 모서리
const HIG: Spec = { title: 20, titleLh: 25, body: 17, bodyLh: 22, btn: 44, radius: 12 }  // Title 3 · Body · 최소 터치 44pt
const TOKEN: Spec = { title: 20, titleLh: 28, body: 16, bodyLh: 24, btn: 48, radius: 12 } // 팀이 정한 한 벌
const SPEC_KEYS: [keyof Spec, string][] = [['title', '제목 크기'], ['body', '본문 크기'], ['bodyLh', '본문 줄 높이'], ['btn', '버튼 높이'], ['radius', '버튼 모서리']]

function Preview({ label, s }: { label: string; s: Spec }) {
  return (
    <div className="sy-tk-prev" data-sy-prev>
      <span className="sy-tk-plat">{label}</span>
      <b className="sy-tk-title" style={{ fontSize: s.title, lineHeight: s.titleLh + 'px' }}>주문 완료</b>
      <p className="sy-tk-body" style={{ fontSize: s.body, lineHeight: s.bodyLh + 'px' }}>내일 도착 예정이에요.</p>
      <span className="sy-tk-btn" style={{ height: s.btn, borderRadius: s.radius }}>배송 조회</span>
    </div>
  )
}
export function TokenDemo({ fixed }: { fixed: boolean }) {
  const [bump, setBump] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const [diff, setDiff] = useState<string[]>([])
  // 문제: 웹은 M3 파일, 앱은 HIG 파일을 따로 봐요. 브랜드팀 요청은 웹 파일만 고쳐졌어요
  const web = fixed ? { ...TOKEN, body: TOKEN.body + bump } : { ...M3, body: M3.body + bump }
  const app = fixed ? { ...TOKEN, body: TOKEN.body + bump } : HIG
  useLayoutEffect(() => {
    const [a, b] = Array.from(box.current?.querySelectorAll<HTMLElement>('[data-sy-prev]') ?? [])
    if (!a || !b) return
    const read = (p: HTMLElement) => {
      const t = getComputedStyle(p.querySelector('.sy-tk-title')!), bd = getComputedStyle(p.querySelector('.sy-tk-body')!), bt = getComputedStyle(p.querySelector('.sy-tk-btn')!)
      return { title: t.fontSize, body: bd.fontSize, bodyLh: bd.lineHeight, btn: bt.height, radius: bt.borderTopLeftRadius } as Record<keyof Spec, string>
    }
    const ra = read(a), rb = read(b)
    setDiff(SPEC_KEYS.filter(([k]) => ra[k] !== rb[k]).map(([, l]) => l))
  }, [fixed, bump])
  return (
    <div className="sy-col">
      <div className="sy-tk-src">
        {fixed
          ? <span className="sy-chip good">tokens.json 하나 → 웹 CSS 변수 · iOS · Android</span>
          : <><span className="sy-chip">web.css ← M3 문서</span><span className="sy-chip">App.swift ← HIG 문서</span></>}
      </div>
      <div className="sy-tk-pair" ref={box}>
        <Preview label="웹" s={web} />
        <Preview label="iOS 앱" s={app} />
      </div>
      <div className="dv-meters">
        <Meter label="웹·앱이 다른 값" value={`${diff.length} / ${SPEC_KEYS.length}`} bad={diff.length > 0} />
        <Meter label="값을 정하는 곳" value={fixed ? '1곳' : '2곳'} bad={!fixed} />
        <Meter label="본문 크기 요청" value={bump ? `+${bump}px` : '—'} />
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm ghost" onClick={() => setBump(b => (b >= 2 ? 0 : b + 1))}>브랜드팀: “본문 1px 키워 주세요”</button>
      </div>
      <p className="dv-log">{diff.length ? <>다른 값: <b>{diff.join(', ')}</b></> : <>두 화면이 <b>같은 토큰</b>을 읽어요. 고칠 곳도 한 곳이에요</>}</p>
    </div>
  )
}

/* ---------- 02 !important 남발 ---------- */
/** 아주 단순한 명시도 계산기 (id, class·속성·가상 클래스, 태그). :where() 안은 0점 */
function specificity(sel: string): [number, number, number] {
  let s = sel.replace(/:where\([^)]*\)/g, '')
  const a = (s.match(/#[\w-]+/g) ?? []).length
  const b = (s.match(/\.[\w-]+|\[[^\]]+\]|(?<!:):[\w-]+/g) ?? []).length
  s = s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(\([^)]*\))?/g, ' ')
  const c = (s.match(/[a-z][\w-]*/gi) ?? []).length
  return [a, b, c]
}
type Rule = { layer?: string; sel: string; body: string; imp?: boolean }
const LEGACY = '#sy-imp-app .sy-imp-card span.sy-imp-btn'
const IMP_TARGETS = [
  { cls: 'sy-imp-primary', label: '구매', want: 'var(--accent)' },
  { cls: 'sy-imp-primary sy-imp-promo', label: '이벤트', want: 'var(--b)' },
  { cls: 'sy-imp-primary sy-imp-soldout', label: '품절', want: 'var(--surface-2)' },
]
const rulesFor = (fixed: boolean, patch: number): Rule[] => fixed ? [
  { layer: 'sy-legacy', sel: LEGACY, body: 'background: var(--surface-3); color: var(--text)' },
  { layer: 'sy-comp', sel: ':where(.sy-imp-btn).sy-imp-primary', body: 'background: var(--accent); color: var(--on-fill)' },
  { layer: 'sy-state', sel: '.sy-imp-promo', body: 'background: var(--b)' },
  { layer: 'sy-state', sel: '.sy-imp-soldout', body: 'background: var(--surface-2); color: var(--text-3)' },
] : [
  { sel: LEGACY, body: 'background: var(--surface-3); color: var(--text)' },
  { sel: '.sy-imp-btn.sy-imp-primary', body: 'background: var(--accent); color: var(--on-fill)', imp: true },
  { sel: '.sy-imp-btn.sy-imp-promo', body: 'background: var(--b)', imp: patch >= 1 },
  { sel: '.sy-imp-btn.sy-imp-soldout', body: 'background: var(--surface-2); color: var(--text-3)', imp: patch >= 2 },
]
const ruleCss = (r: Rule) => `${r.sel} { ${r.body.split('; ').map(d => d + (r.imp ? ' !important' : '')).join('; ')}; }`
export function ImportantDemo({ fixed }: { fixed: boolean }) {
  const [patch, setPatch] = useState(0)
  const rules = rulesFor(fixed, patch)
  const css = fixed
    ? '@layer sy-legacy, sy-comp, sy-state;\n' + ['sy-legacy', 'sy-comp', 'sy-state'].map(l => `@layer ${l} { ${rules.filter(r => r.layer === l).map(ruleCss).join(' ')} }`).join('\n')
    : rules.map(ruleCss).join('\n')
  const imps = (css.match(/!important/g) ?? []).length
  const root = useRef<HTMLDivElement>(null)
  const [ok, setOk] = useState<boolean[]>([])
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const got = Array.from(el.querySelectorAll<HTMLElement>('.sy-imp-btn')).map(b => getComputedStyle(b).backgroundColor)
    const want = Array.from(el.querySelectorAll<HTMLElement>('.sy-imp-ref')).map(b => getComputedStyle(b).backgroundColor)
    setOk(got.map((g, i) => g === want[i]))
  }, [css])
  const pass = ok.filter(Boolean).length
  return (
    <div className="sy-col" ref={root}>
      <style>{css}</style>
      <div id="sy-imp-app">
        <div className="sy-imp-card">
          {IMP_TARGETS.map((t, i) => (
            <div className="sy-imp-cell" key={t.label}>
              <span className={'sy-imp-btn ' + t.cls}>{t.label}</span>
              <small className={ok[i] ? 'sy-ok' : 'sy-bad'}>{ok[i] ? '✓ 의도대로' : '✕ 다른 색'}</small>
              <span className="sy-imp-ref" style={{ background: t.want }} aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
      <ul className="sy-imp-rules">
        {rules.map(r => {
          const [a, b, c] = specificity(r.sel)
          return (
            <li key={r.sel}>
              {r.layer && <span className="sy-imp-layer">@layer {r.layer.replace('sy-', '')}</span>}
              <code>{r.sel}</code>
              <span className="sy-imp-spec" title="명시도 (id, class, 태그)">{a},{b},{c}</span>
              {r.imp && <span className="sy-imp-flag">!important</span>}
            </li>
          )
        })}
      </ul>
      <div className="dv-meters">
        <Meter label="의도대로 칠해진 버튼" value={`${pass} / 3`} bad={pass < 3} />
        <Meter label="!important 개수" value={imps} bad={imps > 0} />
        <Meter label="가장 높은 명시도" value={specificity(LEGACY).join(',')} />
      </div>
      {!fixed && (
        <div className="dv-row">
          <button type="button" className="btn sm ghost" onClick={() => setPatch(p => (p >= 2 ? 0 : p + 1))}>{patch >= 2 ? '처음으로' : '안 바뀌는 규칙에 !important 하나 더'}</button>
        </div>
      )}
      <p className="dv-log">{fixed
        ? <>레이어 순서(legacy → comp → state)가 이겨요. 명시도 <b>1,2,1</b>짜리 옛 규칙도 뒤 레이어엔 못 이겨요</>
        : <>옛 규칙(1,2,1)을 이기려고 붙인 <b>!important</b> 때문에, 이벤트·품절 색도 <b>!important</b>를 붙여야만 바뀌어요</>}</p>
    </div>
  )
}

/* ---------- 03 Tailwind 동적 클래스 ---------- */
// 이 데모가 아는 유틸리티 (실제 Tailwind 대신 사이트 색 토큰으로 칠해요)
const UTIL: Record<string, string> = {
  'px-2': 'padding-inline: .5rem', 'py-1': 'padding-block: .25rem', rounded: 'border-radius: .375rem', 'text-white': 'color: var(--on-fill)', 'font-bold': 'font-weight: 700',
  'bg-green-500': 'background: var(--ok)', 'bg-amber-500': 'background: var(--b)', 'bg-red-500': 'background: var(--danger)', 'bg-gray-100': 'background: var(--surface-3)',
}
const STATUS = [['완료', 'green'], ['대기', 'amber'], ['실패', 'red']] as const
const SRC_BAD = `const COLOR = { 완료: 'green', 대기: 'amber', 실패: 'red' }
<span className={\`px-2 py-1 rounded text-white bg-\${COLOR[s]}-500\`}>`
const SRC_GOOD = `const COLOR = { 완료: 'bg-green-500', 대기: 'bg-amber-500', 실패: 'bg-red-500' }
<span className={\`px-2 py-1 rounded text-white \${COLOR[s]}\`}>`
const SRC_OTHER = `<p className="bg-green-500 text-white">결제가 끝났어요</p>`
/** Tailwind처럼 소스 글자를 통째로 훑어 ‘글자 그대로 있는’ 클래스만 남겨요 */
const scan = (files: string[]) => {
  const found = new Set<string>()
  for (const f of files) for (const tok of f.split(/[^a-zA-Z0-9_\-:/.]+/)) if (UTIL[tok]) found.add(tok)
  return [...found]
}
export function TailwindDemo({ fixed }: { fixed: boolean }) {
  const [other, setOther] = useState(true)
  const files = [fixed ? SRC_GOOD : SRC_BAD, ...(other ? [SRC_OTHER] : [])]
  const built = scan(files)
  const css = built.map(c => `[data-dev="style"] .sy-tw-${c} { ${UTIL[c]}; }`).join('\n')
  const box = useRef<HTMLDivElement>(null)
  const [missing, setMissing] = useState(0)
  useLayoutEffect(() => {
    const els = Array.from(box.current?.querySelectorAll<HTMLElement>('.sy-tw-badge') ?? [])
    setMissing(els.filter(e => { const c = getComputedStyle(e).backgroundColor; return c === 'rgba(0, 0, 0, 0)' || c === 'transparent' }).length)
  }, [css])
  return (
    <div className="sy-col">
      <style>{css}</style>
      <div className="sy-tw-files">
        <div className="sy-tw-file"><span>StatusBadge.tsx</span><pre>{fixed ? SRC_GOOD : SRC_BAD}</pre></div>
        {other && <div className="sy-tw-file dim"><span>PayDone.tsx (다른 화면)</span><pre>{SRC_OTHER}</pre></div>}
      </div>
      <div className="sy-tw-built">
        <small>빌드가 만든 CSS ({built.length}개)</small>
        <div>{Object.keys(UTIL).map(c => <span key={c} className={'sy-chip' + (built.includes(c) ? ' good' : ' off')}>{c}</span>)}</div>
      </div>
      <div className="sy-tw-out" ref={box}>
        {STATUS.map(([s, color]) => {
          const cls = fixed ? `px-2 py-1 rounded text-white ${({ green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' } as const)[color]}` : `px-2 py-1 rounded text-white bg-${color}-500`
          return <span key={s} className={'sy-tw-badge ' + cls.split(' ').map(c => 'sy-tw-' + c).join(' ')}>{s}</span>
        })}
      </div>
      <div className="dv-meters">
        <Meter label="색이 빠진 뱃지" value={`${missing} / 3`} bad={missing > 0} />
        <Meter label="생성된 클래스" value={built.length} />
      </div>
      <label className="sy-check"><input type="checkbox" checked={!other} onChange={e => setOther(!e.target.checked)} /> 리팩터링으로 PayDone.tsx를 지웠어요</label>
      <p className="dv-log">{fixed
        ? <>클래스 이름이 <b>글자 그대로</b> 소스에 있어서 다른 파일과 상관없이 모두 만들어져요</>
        : other ? <>‘완료’만 초록이에요. 다른 화면에 <code>bg-green-500</code>이 <b>우연히</b> 있어서예요</> : <>다른 화면을 지우자 <b>초록도 사라졌어요</b>. 개발 중엔 보이던 색이 이렇게 빠져요</>}</p>
    </div>
  )
}

/* ---------- 04 CSS-in-JS 런타임 비용 ---------- */
const CJ_ROWS = 600
/** 런타임 CSS-in-JS 흉내: 스타일 객체 → 문자열 → 해시 → 처음 보면 <style>에 규칙을 넣어요 */
function makeRuntime(sheet: CSSStyleSheet) {
  const cache = new Map<string, string>()
  const st = { inserted: 0, serialized: 0, ms: 0 }
  const css = (obj: Record<string, string | number>) => {
    st.serialized++
    const t = performance.now()
    const body = Object.entries(obj).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${typeof v === 'number' ? v + 'px' : v}`).join(';')
    let h = 5381
    for (let i = 0; i < body.length; i++) h = ((h << 5) + h + body.charCodeAt(i)) | 0
    const cls = 'sy-cj-' + (h >>> 0).toString(36)
    if (!cache.has(body)) { sheet.insertRule(`.${cls}{${body}}`, sheet.cssRules.length); cache.set(body, cls); st.inserted++ }
    st.ms += performance.now() - t
    return cls
  }
  return { css, st }
}
type Runtime = ReturnType<typeof makeRuntime>
function CjRowBad({ i, tick, rt }: { i: number; tick: number; rt: Runtime }) {
  const p = ((i * 7919 + tick * 104729) % 10000) / 100 // 줄마다 · 그릴 때마다 다른 값
  const cls = rt.css({ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: 28, borderBottom: '1px solid var(--line)', color: `color-mix(in srgb, var(--accent) ${p}%, var(--b))` })
  return <div className={cls}><i className="sy-cj-dot" />상품 {i + 1}</div>
}
function CjRowGood({ i, tick }: { i: number; tick: number }) {
  const p = ((i * 7919 + tick * 104729) % 10000) / 100 // 줄마다 · 그릴 때마다 다른 값
  return <div className="sy-cj-row" style={cssVar('--sy-p', p + '%')}><i className="sy-cj-dot" />상품 {i + 1}</div>
}
export function CssInJsDemo({ fixed }: { fixed: boolean }) {
  const [rt, setRt] = useState<Runtime | null>(null)
  const [tick, setTick] = useState(-1)
  const [stat, setStat] = useState({ ms: 0, rules: 0, fresh: 0, css: 0 })
  const t0 = useRef(0)
  const before = useRef(0)
  const cssBefore = useRef(0)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { // 데모 전용 <style>. 나갈 때 지워요
    const el = document.createElement('style')
    el.dataset.syDemo = 'css-in-js'
    document.head.appendChild(el)
    setRt(makeRuntime(el.sheet!))
    return () => el.remove()
  }, [])
  useLayoutEffect(() => {
    if (tick < 0 || !t0.current) return
    void box.current?.offsetHeight // 스타일 계산 · 레이아웃까지 강제로 끝내고 재요
    const ms = performance.now() - t0.current
    t0.current = 0
    const rules = rt?.st.inserted ?? 0
    setStat({ ms, rules, fresh: rules - before.current, css: (rt?.st.ms ?? 0) - cssBefore.current })
  }, [tick, rt])
  const draw = () => { before.current = rt?.st.inserted ?? 0; cssBefore.current = rt?.st.ms ?? 0; t0.current = performance.now(); setTick(t => t + 1) }
  const rows = []
  if (rt && tick >= 0) for (let i = 0; i < CJ_ROWS; i++) rows.push(fixed ? <CjRowGood key={i} i={i} tick={tick} /> : <CjRowBad key={i} i={i} tick={tick} rt={rt} />)
  return (
    <div className="sy-col">
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={draw} disabled={!rt}>{tick < 0 ? `상품 ${CJ_ROWS}개 그리기` : '색 바꿔 다시 그리기'}</button>
        <span className="dv-log">여러 번 눌러 보세요</span>
      </div>
      <div className="dv-meters">
        <Meter label="전체 그리기" value={tick < 0 ? '—' : `${stat.ms.toFixed(1)}ms`} />
        <Meter label="그중 CSS 만들기" value={tick < 0 ? '—' : `${stat.css.toFixed(1)}ms`} bad={tick < 0 ? undefined : stat.css > 0.5} />
        <Meter label="이번에 넣은 CSS 규칙" value={tick < 0 ? '—' : fmt(stat.fresh)} bad={tick < 0 ? undefined : stat.fresh > 0} />
        <Meter label="쌓인 규칙" value={tick < 0 ? '—' : fmt(stat.rules)} bad={tick < 0 ? undefined : stat.rules > 0} />
      </div>
      <div className="sy-cj-list" ref={box} tabIndex={0} aria-label="상품 목록">{rows}</div>
    </div>
  )
}

/* ---------- 05 overflow: hidden 에 갇힌 드롭다운 ---------- */
const MENU = ['공유하기', '수정하기', '보관하기', '삭제하기']
function useVisibleItems(open: boolean, menu: RefObject<HTMLElement | null>, key: unknown) {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
      setN(items.filter(it => { // 그 자리에서 실제로 눌리는 요소가 이 항목인지 확인해요
        const r = it.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return !!hit && it.contains(hit)
      }).length)
    })
    return () => cancelAnimationFrame(id)
  }, [open, menu, key])
  return open ? n : null
}
function PortalMenu({ anchor, onPick, onClose, menuRef }: { anchor: HTMLElement; onPick: (s: string) => void; onClose: () => void; menuRef: RefObject<HTMLDivElement | null> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  useLayoutEffect(() => {
    let raf = 0
    const place = () => {
      const r = anchor.getBoundingClientRect(), w = 168, h = menuRef.current?.offsetHeight ?? 176
      const below = r.bottom + 4 + h <= innerHeight - 8
      setPos({ top: below ? r.bottom + 4 : Math.max(8, r.top - 4 - h), left: Math.min(innerWidth - 8 - w, Math.max(8, r.right - w)) })
    }
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place) }
    place()
    const ac = new AbortController()
    addEventListener('scroll', onMove, { capture: true, passive: true, signal: ac.signal })
    addEventListener('resize', onMove, { signal: ac.signal })
    document.addEventListener('pointerdown', e => { if (!menuRef.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose() }, { signal: ac.signal })
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { onClose(); anchor.focus() } }, { signal: ac.signal })
    return () => { ac.abort(); cancelAnimationFrame(raf) }
  }, [anchor, onClose, menuRef])
  // body 로 나가면 [data-dev="style"] 범위 밖이라, 감싸는 div에 다시 붙여 줘요
  return createPortal(
    <div data-dev="style" className="sy-pt-layer">
      <div ref={menuRef} role="menu" className="sy-pt-menu fixed" style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}>
        {MENU.map(m => <button type="button" role="menuitem" key={m} onClick={() => onPick(m)}>{m}</button>)}
      </div>
    </div>,
    document.body,
  )
}
export function PortalDemo({ fixed }: { fixed: boolean }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState('')
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const visible = useVisibleItems(open, menu, anchor)
  const close = useCallback(() => setOpen(false), [])
  const pick = (m: string) => { setPicked(m); setOpen(false); btn.current?.focus() }
  return (
    <div className="sy-col">
      <div className="sy-pt-card">
        <div className="sy-pt-cover" />
        <div className="sy-pt-body">
          <div><b>가을 산책 사진첩</b><small>사진 24장 · 어제</small></div>
          <div className="sy-pt-anchor">
            <button type="button" ref={btn} className="sy-pt-more" aria-haspopup="menu" aria-expanded={open} aria-label="더보기"
              onClick={() => { setAnchor(btn.current); setOpen(o => !o) }}>⋯</button>
            {open && !fixed && (
              <div ref={menu} role="menu" className="sy-pt-menu">
                {MENU.map(m => <button type="button" role="menuitem" key={m} onClick={() => pick(m)}>{m}</button>)}
              </div>
            )}
          </div>
        </div>
      </div>
      {open && fixed && anchor && <PortalMenu anchor={anchor} onPick={pick} onClose={close} menuRef={menu} />}
      <div className="dv-meters">
        <Meter label="눌리는 메뉴 항목" value={visible === null ? '—' : `${visible} / ${MENU.length}`} bad={visible === null ? undefined : visible < MENU.length} />
        <Meter label="메뉴가 그려진 곳" value={open ? (fixed ? 'body' : '카드 안') : '—'} />
        <Meter label="고른 메뉴" value={picked || '—'} />
      </div>
      <p className="dv-log">카드에는 둥근 모서리용 <code>overflow: hidden</code>이 걸려 있어요. ⋯ 버튼을 눌러 보세요.</p>
    </div>
  )
}

/* ---------- 06 다크 모드 이미지 · 차트 · 아이콘 ---------- */
const svgUri = (s: string) => 'data:image/svg+xml,' + encodeURIComponent(s)
const ILLU_LIGHT = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 72"><rect width="120" height="72" fill="#ffffff"/><circle cx="40" cy="38" r="20" fill="#f76b15"/><rect x="68" y="24" width="36" height="8" rx="4" fill="#d4d4cf"/><rect x="68" y="40" width="24" height="8" rx="4" fill="#d4d4cf"/></svg>')
const ILLU_DARK = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 72"><rect width="120" height="72" fill="#252523"/><circle cx="40" cy="38" r="20" fill="#f76b15"/><rect x="68" y="24" width="36" height="8" rx="4" fill="#45453f"/><rect x="68" y="40" width="24" height="8" rx="4" fill="#45453f"/></svg>')
const BARS = [32, 52, 40, 64]
function DarkScreen({ mode, fixed }: { mode: 'light' | 'dark'; fixed: boolean }) {
  const fill = fixed ? 'currentColor' : '#1b1b19'          // ✕ 라이트 기준으로 박아 둔 색
  const label: CSSProperties = fixed ? { fill: 'var(--sy-sub)' } : { fill: '#6b6b66' }
  const grid: CSSProperties = fixed ? { stroke: 'var(--sy-grid)' } : { stroke: '#e6e6e1' }
  const illu = fixed ? (mode === 'dark' ? ILLU_DARK : ILLU_LIGHT) : ILLU_LIGHT
  const filter = !fixed && mode === 'dark' ? 'invert(1)' : undefined // ✕ 급한 불 끄기용 반전
  return (
    <div className={'sy-dk-scr ' + mode} data-sy-mode={mode}>
      <span className="sy-dk-mode">{mode === 'light' ? '라이트' : '다크'}</span>
      <svg className="sy-dk-logo" viewBox="0 0 92 20" aria-label="팔머 상점 로고" role="img">
        <circle cx="9" cy="10" r="8" fill={fill} data-sy-logo /><text x="22" y="15" fontSize="14" fontWeight="700" fill={fill}>palmer</text>
      </svg>
      <svg className="sy-dk-chart" viewBox="0 0 120 70" role="img" aria-label="주간 주문 막대 차트">
        {[14, 32, 50].map(y => <line key={y} x1="18" x2="118" y1={y} y2={y} style={grid} />)}
        {BARS.map((h, i) => <rect key={i} x={26 + i * 24} y={58 - h * 0.7} width="14" height={h * 0.7} rx="2" fill="#f76b15" />)}
        {['월', '화', '수', '목'].map((d, i) => <text key={d} x={33 + i * 24} y="68" fontSize="8" textAnchor="middle" style={label} data-sy-label>{d}</text>)}
        <text x="2" y="17" fontSize="7" style={label}>80</text>
      </svg>
      <img className="sy-dk-img" src={illu} alt="상품 일러스트" style={{ filter }} width={120} height={72} />
    </div>
  )
}
const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
const lum = (c: number[]) => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a: string, b: string) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
export function DarkDemo({ fixed }: { fixed: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [m, setM] = useState({ logo: 0, label: 0, filters: 0 })
  useLayoutEffect(() => {
    const scr = box.current?.querySelector<HTMLElement>('[data-sy-mode="dark"]')
    if (!scr) return
    const bg = getComputedStyle(scr).backgroundColor
    setM({
      logo: contrast(getComputedStyle(scr.querySelector('[data-sy-logo]')!).fill, bg),
      label: contrast(getComputedStyle(scr.querySelector('[data-sy-label]')!).fill, bg),
      filters: Array.from(box.current!.querySelectorAll('img')).filter(i => getComputedStyle(i).filter !== 'none').length,
    })
  }, [fixed])
  return (
    <div className="sy-col">
      <div className="sy-dk-pair" ref={box}>
        <DarkScreen mode="light" fixed={fixed} />
        <DarkScreen mode="dark" fixed={fixed} />
      </div>
      <div className="dv-meters">
        <Meter label="다크 · 로고 대비" value={`${m.logo.toFixed(1)}:1`} bad={m.logo < 3} />
        <Meter label="다크 · 차트 글자 대비" value={`${m.label.toFixed(1)}:1`} bad={m.label < 4.5} />
        <Meter label="filter: invert 이미지" value={m.filters} bad={m.filters > 0} />
      </div>
      <p className="dv-log">{fixed
        ? <>로고는 <code>currentColor</code>, 차트는 CSS 변수, 사진은 <b>다크용 파일</b>로 바꿔요. 브랜드 주황은 그대로예요</>
        : <>로고·차트 글자는 라이트 색을 박아 둬서 <b>안 보이고</b>, 반전 필터를 건 그림은 <b>주황이 파랑</b>이 됐어요</>}</p>
    </div>
  )
}

/* ---------- 07 모바일 끈적한 hover ---------- */
const SH_BTNS = ['좋아요', '저장', '알림']
export function StickyHoverDemo({ fixed }: { fixed: boolean }) {
  const [on, setOn] = useState<Record<string, boolean>>({ 좋아요: true, 저장: false, 알림: true })
  const [hov, setHov] = useState<string | null>(null) // 터치 기기가 마지막으로 누른 요소에 남겨 두는 :hover
  const [press, setPress] = useState<string | null>(null)
  const [stuck, setStuck] = useState({ n: 0, lie: 0 })
  const [dev] = useState(() => ({ hover: matchMedia('(hover: hover)').matches, coarse: matchMedia('(pointer: coarse)').matches }))
  const timers = useTimers()
  const phone = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = phone.current
    if (!el) return
    const ref = getComputedStyle(el.querySelector('.sy-sh-ref')!).backgroundColor
    const btns = Array.from(el.querySelectorAll<HTMLElement>('.sy-sh-btn')).filter(b => !b.classList.contains('sy-sh-press'))
    const hit = btns.filter(b => getComputedStyle(b).backgroundColor === ref)
    setStuck({ n: hit.length, lie: hit.filter(b => b.getAttribute('aria-pressed') === 'false').length })
  }, [hov, press, on])
  const tap = (k: string) => {
    setHov(k); setPress(k)
    timers.clear(); timers.set(() => setPress(null), 140)
  }
  return (
    <div className="sy-col">
      <div className="sy-sh-wrap">
        <div ref={phone} className={'sy-sh-phone ' + (fixed ? 'sy-sh-good' : 'sy-sh-bad')} onPointerDown={e => { if (e.target === e.currentTarget) setHov(null) }}>
          <small className="sy-sh-cap" onPointerDown={() => setHov(null)}>터치 기기 흉내 · 빈 곳을 누르면 hover가 풀려요</small>
          {SH_BTNS.map(k => (
            <button type="button" key={k} aria-pressed={on[k]}
              className={'sy-sh-btn' + (hov === k ? ' sy-sh-hov' : '') + (press === k ? ' sy-sh-press' : '')}
              onPointerDown={() => tap(k)} onClick={() => setOn(o => ({ ...o, [k]: !o[k] }))}>
              <span aria-hidden="true">{on[k] ? '●' : '○'}</span>{k}
            </button>
          ))}
          <span className="sy-sh-ref" aria-hidden="true" />
        </div>
        <div className="sy-sh-real">
          <small>진짜 CSS 버튼 (폰에서 눌러 보세요)</small>
          <button type="button" className={'sy-sh-rbtn ' + (fixed ? 'good' : 'bad')}>{fixed ? '@media (hover: hover)' : '그냥 :hover'}</button>
        </div>
      </div>
      <div className="dv-meters">
        <Meter label="손 뗀 뒤 hover 색인 버튼" value={stuck.n} bad={stuck.n > 0} />
        <Meter label="꺼졌는데 켜진 듯 보임" value={stuck.lie} bad={stuck.lie > 0} />
        <Meter label="이 기기 hover: hover" value={dev.hover ? '예' : '아니요'} />
        <Meter label="pointer: coarse" value={dev.coarse ? '예' : '아니요'} />
      </div>
      <p className="dv-log">‘좋아요’를 한 번 눌러 꺼 보세요. {fixed ? <>터치 기기에선 hover 규칙이 <b>아예 적용되지 않아요</b>. 누르는 동안만 눌린 색이에요</> : <>꺼졌는데도 hover 색이 남아 <b>켜진 것처럼</b> 보여요</>}</p>
    </div>
  )
}

/* ---------- 08 긴 언어 레이아웃 ---------- */
type Lang = 'ko' | 'en' | 'de' | 'xx'
const pseudo = (s: string) => '[' + s.replace(/[aeiouAEIOU]/g, c => ({ a: 'á', e: 'é', i: 'í', o: 'ö', u: 'ü', A: 'Å', E: 'É', I: 'Î', O: 'Ö', U: 'Û' } as Record<string, string>)[c]) + '~'.repeat(Math.ceil(s.length * 0.4)) + ']'
const EN = { btns: ['Add to cart', 'Buy now', 'Save'], tabs: ['Home', 'Search', 'Notifications', 'My page'], badge: 'Free shipping' }
const STR: Record<Lang, typeof EN> = {
  ko: { btns: ['장바구니 담기', '바로 구매', '찜하기'], tabs: ['홈', '검색', '알림', '내 정보'], badge: '무료 배송' },
  en: EN,
  de: { btns: ['In den Warenkorb', 'Jetzt kaufen', 'Merken'], tabs: ['Startseite', 'Suche', 'Benachrichtigungen', 'Mein Konto'], badge: 'Kostenloser Versand' },
  xx: { btns: EN.btns.map(pseudo), tabs: EN.tabs.map(pseudo), badge: pseudo(EN.badge) },
}
export function I18nDemo({ fixed }: { fixed: boolean }) {
  const [lang, setLang] = useState<Lang>('de')
  const box = useRef<HTMLDivElement>(null)
  const [over, setOver] = useState(0)
  const [total, setTotal] = useState(0)
  const s = STR[lang]
  useLayoutEffect(() => {
    const measure = () => {
      const els = Array.from(box.current?.querySelectorAll<HTMLElement>('[data-sy-m]') ?? [])
      setTotal(els.length)
      setOver(els.filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).length)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
  }, [lang, fixed])
  return (
    <div className="sy-col">
      <Seg value={lang} onChange={setLang} options={[['ko', '한국어'], ['en', 'English'], ['de', 'Deutsch'], ['xx', '가짜 긴 언어']]} />
      <div className={'sy-i18n ' + (fixed ? 'good' : 'bad')} ref={box} lang={lang === 'xx' ? 'en' : lang}>
        <div className="sy-i18n-card">
          <div className="sy-i18n-top"><b>울 니트 가디건</b><span className="sy-i18n-badge"><span data-sy-m>{s.badge}</span></span></div>
          <div className="sy-i18n-btns">
            {s.btns.map((b, i) => <button type="button" key={i} className={'sy-i18n-btn' + (i === 0 ? ' main' : '')}><span data-sy-m>{b}</span></button>)}
          </div>
        </div>
        <nav className="sy-i18n-tabs" aria-label="하단 탭 예시">
          {s.tabs.map((t, i) => <span key={i} className={'sy-i18n-tab' + (i === 0 ? ' on' : '')}><i aria-hidden="true" /><span data-sy-m>{t}</span></span>)}
        </nav>
      </div>
      <div className="dv-meters">
        <Meter label="글자가 넘친 요소" value={`${over} / ${total}`} bad={over > 0} />
        <Meter label="언어" value={lang === 'xx' ? 'pseudo' : lang} />
      </div>
    </div>
  )
}

/* ---------- 09 모달 접근성 (포커스 트랩) ---------- */
const nameOf = (el: Element | null) => {
  if (!el || el === document.body) return 'body (길 잃음)'
  const n = (el as HTMLElement).dataset?.syName ?? el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 14)
  return n || el.tagName.toLowerCase()
}
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
export function A11yDemo({ fixed }: { fixed: boolean }) {
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState('—')
  const [esc, setEsc] = useState(0)
  const [onOpen, setOnOpen] = useState('—')
  const [after, setAfter] = useState('—')
  const opener = useRef<HTMLButtonElement>(null)
  const dlg = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const openRef = useRef(false)
  const timers = useTimers()
  useEffect(() => { // 포커스가 어디로 갔는지 계속 기록해요
    const ac = new AbortController()
    document.addEventListener('focusin', e => {
      const t = e.target as Element
      const inDemo = page.current?.contains(t)
      setNow(inDemo ? nameOf(t) : '데모 밖 요소 (' + t.tagName.toLowerCase() + ')')
      if (openRef.current && !dlg.current?.contains(t)) setEsc(n => n + 1)
    }, { signal: ac.signal })
    return () => ac.abort()
  }, [])
  const was = useRef(false)
  useEffect(() => { // 열고 닫힌 '뒤'(배경 inert가 풀린 뒤)에 포커스를 옮기고 재요
    if (open) {
      if (fixed) dlg.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
      const a = document.activeElement
      setOnOpen(dlg.current?.contains(a) ? '모달 안' : '배경에 남음')
    } else if (was.current) {
      if (fixed) opener.current?.focus()
      timers.set(() => { const a = document.activeElement; setAfter(a === opener.current ? '열었던 버튼' : !a || a === document.body ? 'body (길 잃음)' : page.current?.contains(a) ? '다른 버튼' : '데모 밖 요소') }, 30)
    }
    was.current = open
  }, [open, fixed, timers])
  const show = () => { setAfter('—'); setEsc(0); openRef.current = true; setOpen(true) }
  const hide = () => { openRef.current = false; setOpen(false) }
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); hide(); return }
    if (!fixed || e.key !== 'Tab') return
    const els = Array.from(dlg.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    const first = els[0], last = els[els.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
  useEffect(() => { // 문제 모드도 Esc는 받아요 (포커스가 모달 밖에 있어도)
    if (!open || fixed) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  })
  return (
    <div className="sy-col">
      <div className="sy-ay-page" ref={page}>
        <div className="sy-ay-bg" inert={fixed && open ? true : undefined}>
          <div className="sy-ay-nav"><button type="button" data-sy-name="[배경] 메뉴">메뉴</button><button type="button" data-sy-name="[배경] 검색">검색</button></div>
          <p>주문 번호 2024-1107 · 니트 가디건 1개</p>
          <div className="dv-row">
            <button type="button" ref={opener} className="btn sm danger" data-sy-name="주문 취소 (열었던 버튼)" onClick={show}>주문 취소</button>
            <button type="button" className="btn sm ghost" data-sy-name="[배경] 배송 조회">배송 조회</button>
            <a href="#/dev/style/st-a11y" data-sy-name="[배경] 고객센터 링크" onClick={e => e.preventDefault()}>고객센터</a>
          </div>
        </div>
        {open && (fixed ? (
          <div className="sy-ay-dim">
            <div className="sy-ay-modal" ref={dlg} role="dialog" aria-modal="true" aria-labelledby="sy-ay-t" aria-describedby="sy-ay-d" onKeyDown={onKey}>
              <b id="sy-ay-t">주문을 취소할까요?</b>
              <p id="sy-ay-d">취소하면 쿠폰은 돌려드려요.</p>
              <div className="dv-row">
                <button type="button" className="btn sm ghost" data-sy-name="[모달] 돌아가기" onClick={hide}>돌아가기</button>
                <button type="button" className="btn sm danger" data-sy-name="[모달] 취소하기" onClick={hide}>취소하기</button>
              </div>
              <button type="button" className="sy-ay-x" aria-label="닫기" data-sy-name="[모달] 닫기" onClick={hide}>✕</button>
            </div>
          </div>
        ) : (
          <div className="sy-ay-dim">
            <div className="sy-ay-modal" ref={dlg}>
              <b>주문을 취소할까요?</b>
              <p>취소하면 쿠폰은 돌려드려요.</p>
              <div className="dv-row">
                <div className="sy-ay-fake" onClick={hide}>돌아가기</div>
                <button type="button" className="btn sm danger" data-sy-name="[모달] 취소하기" onClick={hide}>취소하기</button>
              </div>
              <span className="sy-ay-x" onClick={hide}>✕</span>
            </div>
          </div>
        ))}
      </div>
      <div className="dv-meters">
        <Meter label="열 때 포커스" value={onOpen} bad={onOpen === '—' ? undefined : onOpen !== '모달 안'} />
        <Meter label="모달 밖으로 나간 포커스" value={`${esc}번`} bad={esc > 0} />
        <Meter label="닫은 뒤 포커스" value={after} bad={after === '—' ? undefined : !after.includes('열었던')} />
      </div>
      <p className="dv-log">지금 포커스: <b>{now}</b> · ‘주문 취소’를 누른 뒤 <b>Tab</b>을 여러 번 눌러 보세요. Esc나 ✕로 닫혀요.</p>
    </div>
  )
}

/* ---------- 10 말줄임 뒤 전체 글 ---------- */
const NAMES = ['김하늘', '주식회사 팔머물류 강남 풀필먼트 센터 3층 B구역', '이도윤 (마케팅팀 · 브랜드 파트너십 담당)', '박서준', '한빛초등학교 6학년 2반 학부모 모임 대화방']
function Trunc({ text, fixed, onMeasure }: { text: string; fixed: boolean; onMeasure: (cut: boolean) => void }) {
  const el = useRef<HTMLSpanElement>(null)
  const [cut, setCut] = useState(false)
  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    const check = () => { const c = node.scrollWidth > node.clientWidth; setCut(c); onMeasure(c) }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(node)
    return () => ro.disconnect()
  }, [onMeasure])
  const reveal = fixed && cut // 실제로 잘렸을 때만 툴팁 · 포커스를 붙여요
  return (
    <span className="sy-el-cell">
      <span ref={el} className="sy-el-text" tabIndex={reveal ? 0 : undefined} data-sy-cut={cut || undefined} data-sy-reveal={reveal || undefined}>{text}</span>
      {reveal && <span className="sy-el-tip" aria-hidden="true">{text}</span>}
    </span>
  )
}
export function EllipsisDemo({ fixed }: { fixed: boolean }) {
  const [w, setW] = useState(200)
  const box = useRef<HTMLUListElement>(null)
  const [m, setM] = useState({ cut: 0, reveal: 0, extra: 0 })
  const [tick, setTick] = useState(0)
  const onMeasure = useCallback(() => setTick(t => t + 1), [])
  useLayoutEffect(() => {
    const els = Array.from(box.current?.querySelectorAll<HTMLElement>('.sy-el-text') ?? [])
    const cut = els.filter(e => e.dataset.syCut)
    setM({ cut: cut.length, reveal: cut.filter(e => e.dataset.syReveal && e.tabIndex === 0).length, extra: els.filter(e => !e.dataset.syCut && e.dataset.syReveal).length })
  }, [tick, w, fixed])
  return (
    <div className="sy-col">
      <label className="sy-range">목록 폭 <input type="range" min={120} max={340} value={w} onChange={e => setW(+e.target.value)} /> <b>{w}px</b></label>
      <ul className="sy-el-list" ref={box} style={{ width: w }}>
        {NAMES.map(n => <li key={n}><i aria-hidden="true">{n[0]}</i><Trunc text={n} fixed={fixed} onMeasure={onMeasure} /></li>)}
      </ul>
      <div className="dv-meters">
        <Meter label="잘린 이름" value={m.cut} />
        <Meter label="끝까지 볼 수 있는 잘린 이름" value={`${m.reveal} / ${m.cut}`} bad={m.reveal < m.cut} />
        <Meter label="필요 없이 붙은 툴팁" value={m.extra} bad={m.extra > 0} />
      </div>
      <p className="dv-log">{fixed ? <>잘린 이름에만 마우스를 올리거나 <b>Tab</b>으로 가면 전체가 보여요. 폭을 넓히면 툴팁도 사라져요</> : <>잘린 이름 끝을 볼 방법이 없어요. 눌러도, Tab을 눌러도 그대로예요</>}</p>
    </div>
  )
}
