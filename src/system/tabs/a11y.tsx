import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Range, Seg, useTimers } from '../../components/ui'
import { IconPlay } from '../../components/icons'
import { resolveSemantic, useSys, type SysConfig } from '../store'
import { CodeBlock, Note, Section, SliderRow, SysGrid } from '../ui'
import './a11y.css'

const ROLES = ['bg', 'surface', 'text', 'text-sub', 'border', 'primary', 'on-primary', 'danger', 'success'] as const
function pvVars(c: SysConfig): CSSProperties {
  const o: Record<string, string> = {}
  for (const r of ROLES) { o[`--pl-${r}`] = resolveSemantic(c, 'light', r); o[`--pd-${r}`] = resolveSemantic(c, 'dark', r) }
  return o as CSSProperties
}
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* =================================================================
 * 1) 키보드 내비게이션
 * ================================================================= */
const KB: { k: string; name: string; bad: number }[] = [
  { k: 'nav-home', name: '홈 링크', bad: 3 },
  { k: 'nav-shop', name: '상품 링크', bad: 2 },
  { k: 'nav-help', name: '고객센터 링크', bad: 1 },
  { k: 'email', name: '이메일 입력창', bad: 5 },
  { k: 'pw', name: '비밀번호 입력창', bad: 4 },
  { k: 'keep', name: '로그인 유지 체크박스', bad: 7 },
  { k: 'login', name: '로그인 버튼', bad: 6 },
  { k: 'find', name: '비밀번호 찾기 링크', bad: 8 },
]

function Keyboard() {
  const T = useTimers()
  const [ring, setRing] = useState(true)
  const [nums, setNums] = useState(true)
  const [order, setOrder] = useState<'ok' | 'bad'>('ok')
  const [cur, setCur] = useState(-1)
  const [sim, setSim] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  const [pts, setPts] = useState<[number, number][]>([])
  const stop = (e: { preventDefault: () => void }) => e.preventDefault()

  const measure = useCallback(() => {
    const b = box.current
    if (!b) return
    const br = b.getBoundingClientRect()
    setPts(KB.map(it => {
      const el = b.querySelector<HTMLElement>(`[data-k="${it.k}"] .kb-num`)
      if (!el) return [0, 0]
      const r = el.getBoundingClientRect()
      return [r.left - br.left + r.width / 2, r.top - br.top + r.height / 2]
    }))
  }, [])
  useLayoutEffect(() => { measure() }, [order, nums, measure])
  useEffect(() => {
    const b = box.current
    if (!b || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(b)
    return () => ro.disconnect()
  }, [measure])

  const play = () => {
    T.clear()
    KB.forEach((_, i) => T.set(() => setSim(i), i * 650))
    T.set(() => setSim(-1), KB.length * 650 + 300)
  }
  const idx = (k: string) => KB.findIndex(x => x.k === k)
  const item = (k: string, el: ReactNode, cls = '') => {
    const i = idx(k)
    return (
      <div className={'kb-item ' + cls + (sim === i ? ' sim' : '') + (cur === i ? ' cur' : '')} data-k={k} style={order === 'bad' ? { order: KB[i].bad } : undefined}>
        {el}
        {nums && <span className="kb-num" aria-hidden="true">{i + 1}</span>}
      </div>
    )
  }
  const now = sim >= 0 ? sim : cur

  const code = `/* ✗ 이렇게 지우면 키보드 사용자는 길을 잃어요 */
button:focus { outline: none; }

/* ✓ 키보드로 왔을 때만 링을 보여줘요 */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
/* 마우스 클릭엔 링을 숨기고 싶다면 이렇게 */
:focus:not(:focus-visible) { outline: none; }`

  return (
    <>
      <div className="kb-ctrl">
        <label className="ax-check"><input type="checkbox" checked={ring} onChange={e => setRing(e.target.checked)} data-ctl="ring" /> 포커스 링</label>
        <label className="ax-check"><input type="checkbox" checked={nums} onChange={e => setNums(e.target.checked)} /> Tab 순서 번호</label>
        <Seg value={order} onChange={setOrder} options={[['ok', '보이는 순서 = 코드 순서'], ['bad', 'CSS로 순서만 바꿈']]} className="kb-seg" />
      </div>
      <div ref={box} className={'kb-demo' + (ring ? ' ring-on' : ' ring-off') + (order === 'bad' ? ' bad' : '')}
        onFocus={e => { const k = (e.target as HTMLElement).closest<HTMLElement>('[data-k]')?.dataset.k; setCur(k ? idx(k) : -1) }}
        onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setCur(-1) }}>
        {nums && pts.length === KB.length && (
          <svg className="kb-path" aria-hidden="true">
            <polyline points={pts.map(p => p.join(',')).join(' ')} />
          </svg>
        )}
        <div className="kb-row nav">
          {item('nav-home', <a href="#/system/a11y" onClick={stop}>홈</a>)}
          {item('nav-shop', <a href="#/system/a11y" onClick={stop}>상품</a>)}
          {item('nav-help', <a href="#/system/a11y" onClick={stop}>고객센터</a>)}
        </div>
        <div className="kb-row form">
          {item('email', <label className="kb-field"><span>이메일</span><input type="email" placeholder="name@example.com" autoComplete="off" /></label>, 'full')}
          {item('pw', <label className="kb-field"><span>비밀번호</span><input type="password" placeholder="8자 이상" autoComplete="off" /></label>, 'full')}
          {item('keep', <label className="kb-keep"><input type="checkbox" /> 로그인 유지</label>)}
          {item('login', <button type="button" className="kb-btn">로그인</button>)}
          {item('find', <a href="#/system/a11y" onClick={stop}>비밀번호 찾기</a>)}
        </div>
      </div>
      <div className="kb-status">
        <span aria-live="polite">{now >= 0 ? <>지금 포커스 <b>{now + 1}. {KB[now].name}</b></> : <>데모 안을 클릭한 뒤 <kbd>Tab</kbd> · <kbd>Shift</kbd>+<kbd>Tab</kbd>으로 움직여 보세요.</>}</span>
        <button type="button" className="btn ghost sm" onClick={play} data-act="kb-play"><IconPlay />Tab 순서 재생</button>
      </div>
      {!ring && <Note tone="warn"><b>포커스 링이 꺼졌어요.</b> Tab을 눌러도 지금 어디 있는지 보이지 않아요. <code>outline: none</code>만 쓰고 대신할 표시가 없으면 이런 상태가 돼요.</Note>}
      {order === 'bad' && <Note tone="warn"><b>보이는 순서와 Tab 순서가 달라요.</b> CSS <code>order</code>·grid 배치로 위치만 바꾸면 Tab은 코드 순서대로 움직여서 시선이 이리저리 튀어요. 순서는 HTML에서 바꾸고, 양수 <code>tabindex</code>는 쓰지 않아요.</Note>}
      <CodeBlock code={code} maxHeight={260} />
    </>
  )
}

/* =================================================================
 * 2) 스크린 리더 미리보기 (시뮬레이션)
 * ================================================================= */
type AltMode = 'good' | 'none' | 'empty'
const IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4c7a1"/><stop offset="1" stop-color="#c98b5e"/></linearGradient></defs><rect width="120" height="90" fill="url(#g)"/><path d="M42 30 L60 22 L78 30 L86 72 L34 72Z" fill="#f7efe4" opacity=".9"/><path d="M60 22 L60 72" stroke="#c98b5e" stroke-width="2"/></svg>')

function ScreenReader() {
  const T = useTimers()
  const [alt, setAlt] = useState<AltMode>('good')
  const [cart, setCart] = useState(true)
  const [search, setSearch] = useState(true)
  const [hi, setHi] = useState(-1)
  const all = (on: boolean) => { setAlt(on ? 'good' : 'none'); setCart(on); setSearch(on) }

  const lines: { k: string; say: ReactNode; ok: boolean; skip?: boolean; why?: string }[] = [
    { k: 'search', say: search ? '상품 검색, 버튼' : '버튼', ok: search },
    { k: 'img', say: alt === 'good' ? '베이지 니트 카디건을 입은 모델, 이미지' : alt === 'none' ? 'IMG_2031.jpg, 이미지' : '(건너뜀 — 장식용 이미지)', ok: alt !== 'none', skip: alt === 'empty', why: '무슨 사진인지 몰라요' },
    { k: 'title', say: '니트 카디건, 제목 수준 3', ok: true },
    { k: 'price', say: '59,000원', ok: true },
    { k: 'cart', say: cart ? '장바구니에 담기, 버튼' : '버튼', ok: cart },
  ]
  const play = () => {
    T.clear()
    lines.forEach((_, i) => T.set(() => setHi(i), i * 900))
    T.set(() => setHi(-1), lines.length * 900 + 400)
  }
  const on = (k: string) => hi >= 0 && lines[hi].k === k ? ' sr-hi' : ''

  const html = `<button type="button"${search ? ' aria-label="상품 검색"' : ''}>
  <svg aria-hidden="true">…</svg>
</button>

<img src="IMG_2031.jpg"${alt === 'good' ? ' alt="베이지 니트 카디건을 입은 모델"' : alt === 'empty' ? ' alt=""' : ''}>${alt === 'none' ? '  <!-- alt 없음 -->' : alt === 'empty' ? '  <!-- 장식용이면 빈 alt -->' : ''}
<h3>니트 카디건</h3>
<p>59,000원</p>

<button type="button"${cart ? ' aria-label="장바구니에 담기"' : ''}>
  <svg aria-hidden="true">…</svg>
</button>`

  return (
    <>
      <div className="sr-ctrl">
        <div className="sr-ctl-row"><span className="ax-label">이미지 alt</span>
          <Seg value={alt} onChange={setAlt} options={[['good', '설명 있음'], ['empty', '빈 alt=""'], ['none', '없음']]} className="sr-seg-alt" />
        </div>
        <div className="sr-ctl-row"><span className="ax-label">아이콘 버튼</span>
          <label className="ax-check"><input type="checkbox" checked={search} onChange={e => setSearch(e.target.checked)} /> 검색 aria-label</label>
          <label className="ax-check"><input type="checkbox" checked={cart} onChange={e => setCart(e.target.checked)} data-ctl="cart" /> 장바구니 aria-label</label>
        </div>
        <div className="sr-ctl-row">
          <button type="button" className="btn ghost sm" onClick={() => all(true)}>모두 있음</button>
          <button type="button" className="btn ghost sm" onClick={() => all(false)}>모두 없음</button>
          <button type="button" className="btn sm" onClick={play} data-act="sr-play"><IconPlay />낭독 재생</button>
        </div>
      </div>
      <div className="sr-pair">
        <div className="sr-card">
          <div className={'sr-top' + on('search')}>
            <b>palmer</b>
            <button type="button" className="sr-icon" aria-label={search ? '상품 검색' : undefined}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </button>
          </div>
          <img className={'sr-img' + on('img')} src={IMG} width={120} height={90} {...(alt === 'good' ? { alt: '베이지 니트 카디건을 입은 모델' } : alt === 'empty' ? { alt: '' } : {})} />
          <h3 className={'sr-title' + on('title')}>니트 카디건</h3>
          <div className="sr-foot">
            <span className={'sr-price' + on('price')}>59,000원</span>
            <button type="button" className={'sr-icon fill' + on('cart')} aria-label={cart ? '장바구니에 담기' : undefined}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h2l2 11h10l2-8H7" /><circle cx="9" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>
            </button>
          </div>
        </div>
        <ol className="sr-log" aria-label="스크린 리더 낭독 시뮬레이션">
          {lines.map((l, i) => (
            <li key={l.k} className={(l.ok ? 'ok' : 'bad') + (l.skip ? ' skip' : '') + (hi === i ? ' on' : '')} data-line={l.k}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 0 1 0 6" /></svg>
              <span>“{l.say}”</span>
              {!l.ok && <em>{l.why ?? '무슨 버튼인지 몰라요'}</em>}
            </li>
          ))}
        </ol>
      </div>
      <Note>아이콘만 있는 버튼에는 <code>aria-label</code>을, 정보가 있는 이미지에는 내용을 설명하는 <code>alt</code>를, 꾸밈용 이미지에는 빈 <code>alt=""</code>를 줘요. 실제 낭독 문장은 스크린 리더(VoiceOver·TalkBack·NVDA)마다 조금씩 달라요. 여기 문장은 <b>시뮬레이션</b>이에요.</Note>
      <CodeBlock code={html} label="HTML" maxHeight={260} />
    </>
  )
}

/* =================================================================
 * 3) 폰트 로딩 FOIT vs swap
 * ================================================================= */
const END = 4 // 초
const BLOCK = 3 // FOIT: 브라우저가 글자를 숨기는 최대 시간(초)

type Phase = 'hidden' | 'fallback' | 'web'
const foitPhase = (t: number, a: number): Phase => t >= a ? 'web' : t < BLOCK ? 'hidden' : 'fallback'
const swapPhase = (t: number, a: number): Phase => t >= a ? 'web' : 'fallback'
const PH_LABEL: Record<Phase, string> = { hidden: '글자 안 보임', fallback: '대체 글꼴', web: '웹 폰트' }

function FontLoading() {
  const [arrive, setArrive] = useState(1.8)
  const [t, setT] = useState(0)
  const [run, setRun] = useState(0)
  useEffect(() => {
    if (!run) return
    if (reduced()) { setT(END); return }
    let raf = 0; const start = performance.now()
    const tick = (now: number) => {
      const v = Math.min(END, (now - start) / 1000)
      setT(v)
      if (v < END) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run])
  const segs = (kind: 'foit' | 'swap'): [Phase, number, number][] => {
    const a = Math.min(arrive, END)
    if (kind === 'swap') return [['fallback', 0, a], ['web', a, END]]
    if (a <= BLOCK) return [['hidden', 0, a], ['web', a, END]]
    return [['hidden', 0, BLOCK], ['fallback', BLOCK, a], ['web', a, END]]
  }
  const row = (kind: 'foit' | 'swap', title: ReactNode, sub: string) => {
    const ph = (kind === 'foit' ? foitPhase : swapPhase)(t, arrive)
    return (
      <div className="fl-row" data-row={kind}>
        <div className="fl-head"><b>{title}</b><span className="muted">{sub}</span></div>
        <div className={'fl-preview ph-' + ph} aria-hidden={ph === 'hidden'}>
          <span className="fl-text">빠르게 읽히는 글자, Fast text</span>
          <span className={'fl-tag ph-' + ph}>{PH_LABEL[ph]}</span>
        </div>
        <div className="fl-track">
          {segs(kind).map(([p, a, b]) => b > a && (
            <span key={p + a} className={'fl-seg ph-' + p} style={{ left: (a / END) * 100 + '%', width: ((b - a) / END) * 100 + '%' }}>
              <i>{PH_LABEL[p]}</i>
            </span>
          ))}
          <span className="fl-head-line" style={{ left: (t / END) * 100 + '%' }} />
        </div>
      </div>
    )
  }
  const code = `/* WOFF2 + swap: 대체 글꼴로 먼저 보여주고, 도착하면 바꿔요 */
@font-face {
  font-family: "Pretendard";
  src: url("/fonts/Pretendard-Regular.subset.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}

<!-- 첫 화면에 꼭 필요한 글꼴만 미리 받아요 -->
<link rel="preload" href="/fonts/Pretendard-Regular.subset.woff2"
      as="font" type="font/woff2" crossorigin>`
  return (
    <>
      <div className="fl-time">
        <span>0초</span><span>1초</span><span>2초</span><span>3초</span><span>4초</span>
      </div>
      {row('foit', <>FOIT <code>font-display: block</code></>, '글꼴이 올 때까지 글자를 숨겨요')}
      {row('swap', <><code>font-display: swap</code></>, '대체 글꼴로 먼저 보여줘요')}
      <div className="fl-ctrl">
        <button type="button" className="btn sm" onClick={() => { setT(0); setRun(r => r + 1) }} data-act="fl-play"><IconPlay />페이지 열기</button>
        <SliderRow label="웹 폰트 도착 시간 (느린 네트워크 가정)" value={arrive.toFixed(1)} unit="초">
          <Range value={arrive} min={0.3} max={4} step={0.1} onChange={v => { setArrive(v); setT(END) }} label="웹 폰트 도착 시간(초)" />
        </SliderRow>
      </div>
      <Note>FOIT는 글꼴이 늦으면 브라우저에 따라 <b>최대 3초 정도</b> 빈 화면을 보여줘요. <code>swap</code>은 글자를 바로 보여주지만, 글꼴이 바뀔 때 줄 길이가 달라져 화면이 밀릴 수 있어요(CLS). 대체 글꼴 크기를 <code>size-adjust</code>로 맞추고, 한글 글꼴은 <b>서브셋 WOFF2</b>로 용량을 줄여요.</Note>
      <CodeBlock code={code} maxHeight={240} />
    </>
  )
}

/* =================================================================
 * 4) 이미지 포맷
 * ================================================================= */
type Kind = 'photo' | 'logo'
const FMT: { id: string; use: string; note: string; size: Record<Kind, number | null> }[] = [
  { id: 'JPEG', use: '사진', note: '손실 압축 · 투명 배경 없음 · 어디서나 열려요', size: { photo: 46, logo: 52 } },
  { id: 'PNG', use: '투명 배경 · 스크린샷 · 글자 많은 그림', note: '무손실 · 사진에 쓰면 매우 무거워요', size: { photo: 100, logo: 40 } },
  { id: 'WebP', use: '사진과 투명 이미지 모두', note: 'JPEG·PNG를 대신하는 무난한 기본값', size: { photo: 34, logo: 28 } },
  { id: 'AVIF', use: '용량이 중요한 큰 사진', note: '같은 화질에 더 작게 · 인코딩이 느려요 · 대체 이미지 함께', size: { photo: 25, logo: 26 } },
  { id: 'SVG', use: '아이콘 · 로고 · 단순한 일러스트', note: '벡터라 확대해도 선명 · CSS로 색 변경', size: { photo: null, logo: 10 } },
]

function ImageFormats() {
  const [kind, setKind] = useState<Kind>('photo')
  const best = kind === 'photo' ? 'AVIF' : 'SVG'
  const code = `<!-- LCP 후보(첫 화면 큰 이미지): 최신 포맷 + 대체, 우선 로딩 -->
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="가을 니트를 입은 모델"
       width="1200" height="630" fetchpriority="high">
</picture>

<!-- 첫 화면 아래 이미지는 늦게 받아요 -->
<img src="card.webp" alt="캔버스 토트백"
     width="400" height="300" loading="lazy">`
  return (
    <>
      <div className="im-head">
        <Seg value={kind} onChange={setKind} options={[['photo', '사진 한 장'], ['logo', '로고·아이콘']]} className="im-seg" />
        <span className="im-ex">예시 · 상대 크기</span>
      </div>
      <ul className="im-list" aria-label="이미지 포맷별 용도와 상대 용량 예시">
        {FMT.map(f => {
          const s = f.size[kind]
          return (
            <li key={f.id} className={f.id === best ? 'best' : ''}>
              <div className="im-name"><b>{f.id}</b>{f.id === best && <span className="im-best">이 경우 추천</span>}</div>
              <div className="im-use"><span>{f.use}</span><small>{f.note}</small></div>
              <div className="im-bar" aria-label={s === null ? '부적합' : `상대 크기 예시 ${s}`}>
                {s === null ? <span className="im-na">사진에는 부적합</span> : <span className="im-fill" style={{ width: s + '%' }} />}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="im-caption">막대는 같은 그림을 각 포맷으로 저장했을 때의 <b>대략적인 크기 관계를 보여주는 예시</b>예요. 실제 용량은 이미지 내용과 압축 설정에 따라 크게 달라요.</p>
      <Note><b>LCP</b>(Largest Contentful Paint)는 첫 화면에서 가장 큰 요소가 그려지는 시간이고, 큰 이미지인 경우가 많아요. web.dev 기준 <b>2.5초 이내</b>면 ‘좋음’이에요. 히어로 이미지는 가벼운 포맷으로 만들고, <code>loading="lazy"</code>를 붙이지 않아요. <code>width</code>·<code>height</code>를 적으면 자리가 미리 잡혀 화면이 밀리지 않아요.</Note>
      <CodeBlock code={code} label="HTML" maxHeight={260} />
    </>
  )
}

export default function A11yTab() {
  const { config } = useSys()
  return (
    <div data-sys="a11y" style={pvVars(config)}>
      <SysGrid>
        <Section id="sys-a11y-keyboard" title="키보드 내비게이션"
          desc="마우스 없이 Tab만으로 모든 기능을 쓸 수 있어야 해요. 번호는 Tab이 지나가는 순서예요.">
          <Keyboard />
        </Section>
        <Section id="sys-a11y-sr" title="스크린 리더 미리보기"
          desc="화면을 보지 못하는 사용자는 이름(alt·aria-label)으로 화면을 이해해요. 이름을 빼면 어떻게 들리는지 확인해 보세요.">
          <ScreenReader />
        </Section>
        <Section id="sys-a11y-font" title="폰트 로딩: FOIT vs swap"
          desc="웹 폰트가 도착하기 전까지 무엇을 보여줄지 정해야 해요. 같은 네트워크에서 두 방식을 타임라인으로 비교해요.">
          <FontLoading />
        </Section>
        <Section id="sys-a11y-image" title="이미지 포맷 고르기"
          desc="이미지는 페이지 용량의 큰 부분이에요. 용도에 맞는 포맷이 첫 화면 속도(LCP)를 정해요.">
          <ImageFormats />
        </Section>
        <Section id="sys-a11y-src" wide title="출처">
          <ul className="ax-src">
            <li><a href="https://www.w3.org/WAI/ARIA/apg/" target="_blank" rel="noreferrer">W3C WAI-ARIA Authoring Practices Guide</a> — 키보드 조작, 이름 붙이기(aria-label)</li>
            <li><a href="https://web.dev/articles/vitals" target="_blank" rel="noreferrer">web.dev · Core Web Vitals</a> — LCP·CLS 기준</li>
            <li><a href="https://web.dev/articles/font-best-practices" target="_blank" rel="noreferrer">web.dev · 웹 폰트 최적화</a> — font-display, WOFF2, preload</li>
            <li><a href="https://web.dev/learn/images" target="_blank" rel="noreferrer">web.dev · Learn Images</a> — 이미지 포맷과 반응형 이미지</li>
          </ul>
          <Note>색 대비는 <a href="#/contrast/contrast-tester">대비 테스트기 →</a>, 색만으로 알리지 않기는 <a href="#/contrast/contrast-color-only">색만으로 알리지 않기 →</a>에서 다뤄요.</Note>
        </Section>
      </SysGrid>
    </div>
  )
}
