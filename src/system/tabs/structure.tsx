import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Range, Seg, useTimers } from '../../components/ui'
import { resolveSemantic, useSys, type SysConfig } from '../store'
import { Note, Section, SliderRow, SysGrid } from '../ui'
import './structure.css'

const ROLES = ['bg', 'surface', 'text', 'text-sub', 'border', 'primary', 'on-primary', 'danger', 'success'] as const
function pvVars(c: SysConfig): CSSProperties {
  const o: Record<string, string> = {}
  for (const r of ROLES) { o[`--pl-${r}`] = resolveSemantic(c, 'light', r); o[`--pd-${r}`] = resolveSemantic(c, 'dark', r) }
  return o as CSSProperties
}
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* =================================================================
 * 1) 아토믹 디자인 조립
 * ================================================================= */
const STEPS: { en: string; ko: string; def: string; ex: string }[] = [
  { en: 'Atoms', ko: '원자', def: '더 쪼갤 수 없는 가장 작은 UI 요소예요. 혼자서는 큰 의미가 없지만 모든 화면의 재료가 돼요.', ex: '라벨 · 입력창 · 아이콘 · 버튼 · 로고 · 링크' },
  { en: 'Molecules', ko: '분자', def: '원자 몇 개가 모여 한 가지 일을 하는 단위예요. 하나의 일만 잘하게 만들어요.', ex: '검색 폼 = 라벨 + 입력창 + 아이콘 + 버튼' },
  { en: 'Organisms', ko: '유기체', def: '분자와 원자가 모여 화면에서 독립된 영역을 이루는 덩어리예요.', ex: '헤더 바 = 로고 + 메뉴 링크 + 검색 폼' },
  { en: 'Templates', ko: '템플릿', def: '유기체를 레이아웃(그리드)에 배치한, 콘텐츠 없는 뼈대예요. 내용보다 구조에 집중해요.', ex: '헤더 + 히어로 영역 + 카드 3개 자리' },
  { en: 'Pages', ko: '페이지', def: '템플릿에 실제 콘텐츠를 넣은 최종 화면이에요. 긴 이름·빈 목록 같은 진짜 상황을 여기서 검증해요.', ex: '실제 문구 · 사진 · 가격이 들어간 쇼핑몰 첫 화면' },
]

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)

function useFlip(root: RefObject<HTMLDivElement | null>, dep: unknown) {
  const snap = useRef<Map<string, DOMRect>>(new Map())
  const anims = useRef<Animation[]>([])
  const capture = () => {
    const m = new Map<string, DOMRect>()
    root.current?.querySelectorAll<HTMLElement>('[data-flip]').forEach(el => m.set(el.dataset.flip!, el.getBoundingClientRect()))
    snap.current = m
  }
  useLayoutEffect(() => {
    const prev = snap.current
    if (!root.current || !prev.size) return
    anims.current.forEach(a => a.cancel()); anims.current = []
    if (reduced()) return
    root.current.querySelectorAll<HTMLElement>('[data-flip]').forEach((el, i) => {
      const anc = el.parentElement?.closest<HTMLElement>('[data-flip]')
      if (anc && root.current?.contains(anc) && prev.has(anc.dataset.flip!)) return // 부모가 함께 움직여요
      const r = el.getBoundingClientRect(), o = prev.get(el.dataset.flip!)
      if (o && r.width && r.height) {
        const dx = o.left - r.left, dy = o.top - r.top, sx = o.width / r.width, sy = o.height / r.height
        if (Math.abs(dx) + Math.abs(dy) < 1 && Math.abs(sx - 1) < .01 && Math.abs(sy - 1) < .01) return
        anims.current.push(el.animate([
          { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: 'top left', transform: 'none' },
        ], { duration: 520, easing: 'cubic-bezier(.2,0,0,1)' }))
      } else if (!o) {
        anims.current.push(el.animate([{ opacity: 0, transform: 'translateY(8px) scale(.97)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, delay: 200 + Math.min(i, 12) * 25, easing: 'cubic-bezier(.2,0,0,1)', fill: 'backwards' }))
      }
    })
    snap.current = new Map()
  }, [dep, root])
  useEffect(() => () => anims.current.forEach(a => a.cancel()), [])
  return capture
}

function Atomic() {
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const capture = useFlip(stage, step)
  const T = useTimers()
  const go = (n: number) => { capture(); setStep(Math.max(0, Math.min(4, n))) }
  const goRef = useRef(go); goRef.current = go

  useEffect(() => {
    if (!auto) return
    if (step >= 4) { setAuto(false); return }
    const id = T.set(() => goRef.current(step + 1), 1500)
    return () => T.clear(id)
  }, [auto, step, T])

  const real = step === 4
  const label = <span className="at-label" data-flip="label">검색어</span>
  const input = (
    <span className="at-input" data-flip="input">
      <span data-flip="icon" className="at-icon"><SearchIcon /></span>
      <span className={real ? '' : 'ph'}>{real ? '니트 카디건' : '무엇을 찾으세요?'}</span>
    </span>
  )
  const button = <span className="at-btn" data-flip="button">검색</span>
  const logo = <span className="at-logo" data-flip="logo">palmer</span>
  const links = ['신상품', '세일', '브랜드'].map((t, i) => <span key={t} className="at-link" data-flip={'link' + i}>{t}</span>)
  const form = <span className="at-form" data-flip="form">{label}{input}{button}</span>
  const header = <div className="at-header" data-flip="header">{logo}<nav className="at-nav">{links}</nav>{form}</div>

  let body: ReactNode
  if (step === 0) {
    const tile = (name: string, el: ReactNode) => <div className="at-tile"><div className="at-tile-in">{el}</div><span className="at-cap">{name}</span></div>
    body = (
      <div className="at-shelf">
        {tile('라벨', label)}
        {tile('입력창', <span className="at-input" data-flip="input"><span className="ph">무엇을 찾으세요?</span></span>)}
        {tile('아이콘', <span data-flip="icon" className="at-icon solo"><SearchIcon /></span>)}
        {tile('버튼', button)}
        {tile('로고', logo)}
        {tile('링크', <span className="at-links">{links}</span>)}
      </div>
    )
  } else if (step === 1) {
    body = (
      <div className="at-col">
        <div className="at-focus">{form}<span className="at-cap">분자 · 검색 폼</span></div>
        <div className="at-wait"><span className="at-cap">아직 쓰지 않은 원자</span><div className="at-wait-row">{logo}{links}</div></div>
      </div>
    )
  } else if (step === 2) {
    body = <div className="at-col"><div className="at-focus wide">{header}<span className="at-cap">유기체 · 헤더 바</span></div></div>
  } else {
    body = (
      <div className={'at-page' + (real ? ' real' : '')}>
        {header}
        <div className="at-grid">
          <span className="at-cols" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</span>
          <div className="at-hero" data-flip="hero">
            {real ? <><b>가을, 니트의 계절</b><span>새로 들어온 니트와 카디건을 만나 보세요.</span><span className="at-btn sm">신상품 보기</span></> : <><i className="bar w60" /><i className="bar w40" /><i className="bar btn" /></>}
          </div>
          {[['니트 카디건', '59,000원'], ['코튼 와이드 팬츠', '39,000원'], ['캔버스 토트백', '24,000원']].map(([n, p], i) => (
            <div className="at-card" key={i} data-flip={'card' + i}>
              <span className={'at-img' + (real ? ' r' + i : '')} />
              {real ? <><b>{n}</b><span>{p}</span></> : <><i className="bar w80" /><i className="bar w40" /></>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="at-wrap">
      <div className="at-ctrl">
        <ol className="at-steps" aria-label="아토믹 디자인 단계">
          {STEPS.map((s, i) => (
            <li key={s.en}>
              <button type="button" className={(i === step ? 'on' : '') + (i < step ? ' done' : '')} aria-current={i === step ? 'step' : undefined} onClick={() => { setAuto(false); go(i) }} data-step={i}>
                <span className="n">{i + 1}</span><span className="t"><b>{s.ko}</b><small>{s.en}</small></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="at-def" aria-live="polite">
          <b>{step + 1}. {STEPS[step].ko} <span>({STEPS[step].en})</span></b>
          <p>{STEPS[step].def}</p>
          <p className="ex">예: {STEPS[step].ex}</p>
        </div>
        <div className="at-btns">
          <button type="button" className="btn ghost sm" onClick={() => { setAuto(false); go(step - 1) }} disabled={step === 0}>← 이전</button>
          <button type="button" className="btn sm" onClick={() => { setAuto(false); go(step + 1) }} disabled={step === 4} data-act="next">다음 단계 →</button>
          <button type="button" className="btn ghost sm" onClick={() => { if (auto) { setAuto(false); return } if (step === 4) go(0); setAuto(true) }}>{auto ? '■ 멈춤' : '▶ 처음부터 조립'}</button>
        </div>
        <Note>디자인 토큰(색·글자·간격)은 원자를 만드는 재료예요. 토큰을 바꾸면 원자부터 페이지까지 한 번에 바뀌어요. <span className="muted">출처: Brad Frost, 『Atomic Design』</span></Note>
      </div>
      <div className="at-stage" ref={stage} data-step={step}>{body}</div>
    </div>
  )
}

/* =================================================================
 * 2) 시선 패턴 F vs Z
 * ================================================================= */
type Pt = [number, number]
const F_PTS: Pt[] = [[22, 74], [296, 74], [22, 128], [214, 128], [26, 150], [26, 232], [26, 312], [26, 388]]
const Z_PTS: Pt[] = [[34, 30], [282, 30], [40, 330], [272, 362]]
const F_FIX = [0, 1, 2, 3, 5, 6]
const Z_FIX = [0, 1, 2, 3]

function useGaze(pts: Pt[], play: number) {
  const lens = useMemo(() => {
    const L = [0]
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    return L
  }, [pts])
  const total = lens[lens.length - 1]
  const [t, setT] = useState(1)
  useEffect(() => {
    if (!play) return
    if (reduced()) { setT(1); return }
    let raf = 0; const start = performance.now(), dur = 3600
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur)
      setT(k)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play])
  const at = (d: number): Pt => {
    for (let i = 1; i < pts.length; i++) if (d <= lens[i]) {
      const r = (d - lens[i - 1]) / (lens[i] - lens[i - 1] || 1)
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * r, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * r]
    }
    return pts[pts.length - 1]
  }
  return { t, total, lens, dot: at(t * total) }
}

function Gaze({ pts, fix, play, show }: { pts: Pt[]; fix: number[]; play: number; show: boolean }) {
  const { t, total, lens, dot } = useGaze(pts, play)
  if (!show) return null
  const d = 'M' + pts.map(p => p.join(' ')).join(' L')
  return (
    <g className="gz">
      {fix.map(i => <circle key={'h' + i} cx={pts[i][0]} cy={pts[i][1]} r={34} className="gz-heat" style={{ opacity: lens[i] / total <= t + 1e-6 ? 1 : 0 }} />)}
      <path d={d} className="gz-path" pathLength={1} style={{ strokeDashoffset: 1 - t }} />
      {fix.map((i, n) => {
        const on = lens[i] / total <= t + 1e-6
        return (
          <g key={i} className={'gz-fix' + (on ? ' on' : '')} transform={`translate(${pts[i][0]} ${pts[i][1]})`}>
            <circle r={10} /><text y={4}>{n + 1}</text>
          </g>
        )
      })}
      {t < 1 && <circle cx={dot[0]} cy={dot[1]} r={7} className="gz-dot" />}
    </g>
  )
}

function FPage() {
  const rows = [56, 150, 230, 310]
  return (
    <>
      <rect x="12" y="10" width="296" height="30" rx="15" className="mk-field" />
      <text x="28" y="30" className="mk-t sub">가을 니트 코디</text>
      {[60, ...rows.slice(1)].map((y, i) => (
        <g key={i}>
          <text x="22" y={y + 18} className="mk-t link">{['가을 니트 코디 10가지, 출근룩부터 주말까지', '니트 카디건 고르는 법', '울 니트 세탁, 이렇게 하면 안 줄어요', '2026 가을 컬러 트렌드 정리'][i]}</text>
          <text x="22" y={y + 34} className="mk-t tiny">news.example.com › style</text>
          <rect x="22" y={y + 42} width={i === 0 ? 270 : 250} height="7" rx="3" className="mk-line" />
          <rect x="22" y={y + 54} width={i === 0 ? 220 : 180} height="7" rx="3" className="mk-line" />
        </g>
      ))}
    </>
  )
}
function ZPage() {
  return (
    <>
      <text x="22" y="35" className="mk-t logo">palmer</text>
      <rect x="236" y="16" width="70" height="28" rx="14" className="mk-cta" />
      <text x="271" y="35" className="mk-t on" textAnchor="middle">시작하기</text>
      <rect x="12" y="60" width="296" height="230" rx="14" className="mk-img" />
      <circle cx="230" cy="140" r="44" className="mk-sun" />
      <path d="M12 260 L96 180 L160 236 L214 196 L308 270 L308 276 Q308 290 294 290 L26 290 Q12 290 12 276Z" className="mk-hill" />
      <text x="24" y="326" className="mk-t h">하루 10분, 습관 만들기</text>
      <rect x="24" y="338" width="150" height="7" rx="3" className="mk-line" />
      <rect x="24" y="352" width="110" height="7" rx="3" className="mk-line" />
      <rect x="214" y="346" width="94" height="34" rx="17" className="mk-cta" />
      <text x="261" y="368" className="mk-t on" textAnchor="middle">무료로 시작</text>
    </>
  )
}

function GazePatterns() {
  const [show, setShow] = useState(true)
  const [play, setPlay] = useState(1)
  const replay = () => { setShow(true); setPlay(p => p + 1) }
  return (
    <div className="gz-wrap">
      <div className="gz-ctrl">
        <label className="sr-check"><input type="checkbox" checked={show} onChange={e => { setShow(e.target.checked); if (e.target.checked) setPlay(p => p + 1) }} /> 시선 경로 겹쳐 보기</label>
        <button type="button" className="btn sm" onClick={replay} data-act="replay">▶ 다시 재생</button>
      </div>
      <div className="gz-pair">
        <figure className="gz-fig">
          <svg viewBox="0 0 320 400" className="mk" role="img" aria-label="검색 결과 페이지 위 F 패턴 시선 경로">
            <rect width="320" height="400" className="mk-bg" />
            <FPage />
            <Gaze pts={F_PTS} fix={F_FIX} play={play} show={show} />
          </svg>
          <figcaption>
            <b>F 패턴 · 글과 목록이 많은 화면</b>
            <span>검색 결과·뉴스·목록처럼 글이 빽빽하면, 첫 줄은 끝까지 읽고 다음 줄은 조금 짧게, 그다음엔 왼쪽 끝을 따라 훑어 내려가요.</span>
            <span className="gz-tip">→ 제목과 문단의 <b>첫 단어</b>에 핵심어를 두고, 소제목·글머리표로 왼쪽 세로줄에 걸리게 만들어요.</span>
          </figcaption>
        </figure>
        <figure className="gz-fig">
          <svg viewBox="0 0 320 400" className="mk" role="img" aria-label="랜딩 페이지 위 Z 패턴 시선 경로">
            <rect width="320" height="400" className="mk-bg" />
            <ZPage />
            <Gaze pts={Z_PTS} fix={Z_FIX} play={play} show={show} />
          </svg>
          <figcaption>
            <b>Z 패턴 · 이미지 크고 여백 많은 화면</b>
            <span>랜딩·광고처럼 요소가 적으면 왼쪽 위 → 오른쪽 위 → 대각선 → 오른쪽 아래 순서로 지나가요.</span>
            <span className="gz-tip">→ 로고는 시작점, 핵심 버튼(CTA)은 <b>오른쪽 아래 끝점</b>에 둬요.</span>
          </figcaption>
        </figure>
      </div>
      <Note>F 패턴은 사람이 글을 ‘읽지 않고 훑을 때’ 생겨요. 목표는 F를 그리게 만드는 게 아니라, 훑어도 핵심이 걸리게 만드는 거예요. <span className="muted">출처: Nielsen Norman Group 시선 추적 연구</span></Note>
    </div>
  )
}

/* =================================================================
 * 3) 폴드 라인과 거짓 바닥
 * ================================================================= */
const VIEW = 356 // 상태바·앱바를 뺀 첫 화면 높이(px)

function Phone({ peek, xray, title, sub, good, onScrolled, scrolled, id }: {
  peek: number; xray: boolean; title: string; sub: ReactNode; good: boolean; onScrolled: () => void; scrolled: boolean; id: string
}) {
  const hero = Math.round(VIEW * (1 - peek / 100))
  return (
    <figure className={'fd-fig' + (good ? ' good' : ' bad')}>
      <figcaption><b>{title}</b><span>{sub}</span></figcaption>
      <div className={'fd-phone' + (xray ? ' xray' : '')} data-phone={id}>
        <div className="fd-status"><span>9:41</span><span>●●● 100%</span></div>
        <div className="fd-app"><b>palmer</b><span>☰</span></div>
        <div className="fd-scroll" tabIndex={0} aria-label={title + ' 미리보기, 스크롤할 수 있어요'} onScroll={e => { if (e.currentTarget.scrollTop > 8) onScrolled() }}>
          <div className="fd-hero" style={{ height: hero }}>
            <span className="fd-kicker">가을 컬렉션</span>
            <b>입기 좋은 계절,<br />니트 신상품</b>
            <span className="fd-sub">새로 들어온 니트와 카디건을 만나 보세요.</span>
            <span className="fd-cta">구경하기</span>
          </div>
          <div className="fd-sec">
            <b>오늘의 추천</b>
            <div className="fd-cards">
              {['니트 카디건', '와이드 팬츠', '토트백', '머플러'].map((n, i) => <div key={n} className="fd-card"><span className={'fd-img r' + i} /><span>{n}</span></div>)}
            </div>
          </div>
          <div className="fd-sec"><b>지금 많이 보는 상품</b>{[0, 1, 2].map(i => <div key={i} className="fd-row"><span className="fd-img sm" /><i /></div>)}</div>
          <div className="fd-end">끝까지 봤어요</div>
        </div>
        <div className="fd-fold" style={xray ? { top: 22 + 44 + VIEW } : undefined}><span>폴드</span></div>
        {xray && <div className="fd-below" style={{ top: 22 + 44 + VIEW }} />}
      </div>
      <div className={'fd-state' + (scrolled ? ' on' : '')} aria-live="polite">{scrolled ? '✓ 스크롤했어요 — 아래에 내용이 있었죠?' : '화면 안을 스크롤해 보세요'}</div>
    </figure>
  )
}

function Fold() {
  const [peek, setPeek] = useState(15)
  const [xray, setXray] = useState(false)
  const [sc, setSc] = useState<Record<string, boolean>>({})
  const ok = peek >= 10 && peek <= 20
  return (
    <div className="fd-wrap">
      <div className="fd-ctrl">
        <Seg value={xray ? 'x' : 'n'} onChange={v => setXray(v === 'x')} options={[['n', '휴대폰 화면'], ['x', '화면 밖까지 보기']]} className="fd-seg" />
        <SliderRow label="오른쪽 화면: 다음 내용이 걸쳐 보이는 정도" value={peek} unit="%" ok={ok}
          hint={ok ? '권장 10~20% 안이에요. 다음 내용이 살짝 보여 스크롤할 이유가 생겨요.' : peek < 10 ? '너무 적게 보이면 거짓 바닥처럼 느껴져요.' : '너무 많이 걸치면 첫 화면의 핵심 메시지가 작아져요.'}>
          <Range value={peek} min={0} max={30} onChange={setPeek} label="peek 비율(%)" />
        </SliderRow>
      </div>
      <div className="fd-pair">
        <Phone id="flush" peek={0} xray={xray} good={false} title="딱 맞게 끝남" sub="첫 화면이 폴드에서 정확히 끝나 ‘거짓 바닥’이 생겨요."
          scrolled={!!sc.flush} onScrolled={() => setSc(s => s.flush ? s : { ...s, flush: true })} />
        <Phone id="peek" peek={peek} xray={xray} good={ok} title={`살짝 보임 (peek ${peek}%)`} sub="다음 섹션이 아래에 걸쳐 보여 ‘더 있다’는 신호가 돼요."
          scrolled={!!sc.peek} onScrolled={() => setSc(s => s.peek ? s : { ...s, peek: true })} />
      </div>
      <Note><b>폴드(fold)</b>는 스크롤 없이 처음 보이는 화면의 아래 끝이에요. 기기마다 높이가 달라서 한 줄로 맞출 수 없어요. 그래서 ‘폴드 위에 다 넣기’보다 <b>핵심 메시지는 위에, 다음 내용은 걸쳐 보이게</b> 설계해요. 스크롤 패턴은 <a href="#/layout/layout-infinite">무한 스크롤 →</a>, <a href="#/layout/layout-sticky">고정 헤더 →</a>에서 볼 수 있어요.</Note>
    </div>
  )
}

export default function StructureTab() {
  const { config } = useSys()
  return (
    <div data-sys="structure" style={pvVars(config)}>
      <SysGrid>
        <Section id="sys-structure-atomic" wide title="아토믹 디자인 조립"
          desc="작은 부품을 모아 화면을 만들어요. 단계를 누르면 원자가 분자로, 분자가 헤더로, 헤더가 페이지로 조립돼요.">
          <Atomic />
        </Section>
        <Section id="sys-structure-gaze" wide title="시선 패턴 F vs Z"
          desc="사람의 눈은 화면 종류에 따라 다른 길로 훑어요. 글이 많은 화면과 이미지 중심 화면에 시선 경로를 겹쳐 봐요.">
          <GazePatterns />
        </Section>
        <Section id="sys-structure-fold" wide title="폴드 라인과 거짓 바닥"
          desc="첫 화면이 딱 맞게 끝나면 페이지가 끝났다고 착각해요. 두 휴대폰을 직접 스크롤해 비교해 보세요.">
          <Fold />
        </Section>
      </SysGrid>
    </div>
  )
}
