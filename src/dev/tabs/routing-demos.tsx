/* 05 라우팅 — 데모 모음. fixed=false 문제 그대로, true 해결 적용
 * 모든 데모는 '미니 브라우저' 안에서만 움직여요. 진짜 주소창·history·hash는 절대 건드리지 않아요. */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from 'react'
import { useTimers } from '../../components/ui'
import { Meter } from '../ui'

/* ---------- 미니 브라우저: 가짜 history ---------- */
type Action = 'PUSH' | 'REPLACE' | 'POP'
type Entry = { url: string; key: number; state?: Record<string, string> }

/** window.history 흉내. pushState처럼 push/replace는 popstate를 부르지 않고, back/forward만 onPop을 불러요 */
class MiniHistory {
  stack: Entry[]
  idx = 0
  action: Action = 'PUSH'
  private seq = 0
  private ver = 0
  private subs = new Set<() => void>()
  private pops = new Set<(e: Entry) => void>()
  constructor(...urls: string[]) {
    this.stack = urls.map(url => ({ url, key: this.seq++ }))
    this.idx = this.stack.length - 1
  }
  get cur() { return this.stack[this.idx] }
  get length() { return this.stack.length }
  get canBack() { return this.idx > 0 }
  get canForward() { return this.idx < this.stack.length - 1 }
  push(url: string, state?: Entry['state']) {
    this.stack = [...this.stack.slice(0, this.idx + 1), { url, state, key: this.seq++ }]
    this.idx = this.stack.length - 1
    this.action = 'PUSH'
    this.emit()
  }
  replace(url: string, state?: Entry['state']) {
    this.stack = this.stack.map((e, i) => (i === this.idx ? { url, state, key: this.seq++ } : e))
    this.action = 'REPLACE'
    this.emit()
  }
  go(n: number) {
    const i = Math.max(0, Math.min(this.stack.length - 1, this.idx + n))
    if (i === this.idx) return
    this.idx = i
    this.action = 'POP'
    this.emit()
    this.pops.forEach(f => f(this.cur))
  }
  back = () => this.go(-1)
  forward = () => this.go(1)
  reset(url: string) { this.stack = [{ url, key: this.seq++ }]; this.idx = 0; this.action = 'REPLACE'; this.emit() }
  onPop(fn: (e: Entry) => void) { this.pops.add(fn); return () => { this.pops.delete(fn) } }
  subscribe = (fn: () => void) => { this.subs.add(fn); return () => { this.subs.delete(fn) } }
  snapshot = () => this.ver
  private emit() { this.ver++; this.subs.forEach(f => f()) }
}
function useMini(...urls: string[]) {
  const [h] = useState(() => new MiniHistory(...urls))
  useSyncExternalStore(h.subscribe, h.snapshot)
  return h
}

const HOST = 'shop.example'
function MiniBrowser({ h, children, onBack, onForward, onRefresh, bodyRef, tall, host = HOST }: {
  h: MiniHistory
  children: ReactNode
  onBack?: () => void
  onForward?: () => void
  onRefresh?: () => void
  bodyRef?: Ref<HTMLDivElement>
  tall?: boolean
  host?: string
}) {
  const url = h.cur.url.startsWith('https://') ? h.cur.url.slice(8) : host + h.cur.url
  return (
    <div className="rt-br">
      <div className="rt-br-bar">
        <button type="button" className="rt-br-btn" aria-label="미니 브라우저 뒤로 가기" disabled={!h.canBack} onClick={onBack ?? h.back}>←</button>
        <button type="button" className="rt-br-btn" aria-label="미니 브라우저 앞으로 가기" disabled={!h.canForward} onClick={onForward ?? h.forward}>→</button>
        <button type="button" className="rt-br-btn" aria-label="미니 브라우저 새로고침" disabled={!onRefresh} onClick={onRefresh}>↻</button>
        <div className="rt-br-url" title={url}>{url}</div>
      </div>
      <div className={'rt-br-body' + (tall ? ' tall' : '')} ref={bodyRef}>{children}</div>
    </div>
  )
}

/** history 기록 줄 — 지금 위치를 진하게 */
function Stack({ h, label = '이 탭의 방문 기록' }: { h: MiniHistory; label?: string }) {
  return (
    <div className="rt-stack-wrap">
      <span className="rt-stack-label">{label} ({h.length})</span>
      <ol className="rt-stack">
        {h.stack.map((e, i) => <li key={e.key} className={(i === h.idx ? 'on' : '') + (e.state?.modal ? ' modal' : '')}>{e.url.replace('https://', '')}{e.state?.modal ? ' · 모달' : ''}</li>)}
      </ol>
    </div>
  )
}

function Link({ to, onGo, children, on }: { to: string; onGo: (to: string) => void; children: ReactNode; on?: boolean }) {
  return <button type="button" className={'rt-link' + (on ? ' on' : '')} onClick={() => onGo(to)}>{children}</button>
}

/* ---------- 01 새로고침 404 ---------- */
const SHOP: Record<string, string> = { '/': '홈 · 오늘의 추천', '/products/42': '상품 상세 · 가을 니트', '/orders': '주문 내역' }
export function RefreshDemo({ fixed }: { fixed: boolean }) {
  const h = useMini('/')
  const t = useTimers()
  const [doc, setDoc] = useState<'app' | '404' | 'wait'>('app')
  const [log, setLog] = useState<string[]>(['GET / → 200 index.html'])
  const [m, setM] = useState({ reload: 0, e404: 0, last: '200' })
  const add = (s: string) => setLog(l => [...l, s].slice(-4))
  const load = (path: string) => { // 문서를 서버에서 새로 받아요 (새로고침 · 주소 직접 입력)
    setDoc('wait')
    t.set(() => {
      const file = path === '/' // 정적 서버엔 index.html과 assets만 있어요
      const ok = file || fixed
      add(ok ? `GET ${path} → 200 index.html${file ? '' : ' (없는 경로 → index.html로 대체)'}` : `GET ${path} → 404 Not Found`)
      setM(s => ({ reload: s.reload + 1, e404: s.e404 + (ok ? 0 : 1), last: ok ? '200' : '404' }))
      setDoc(ok ? 'app' : '404')
    }, 320)
  }
  const go = (to: string) => { h.push(to); add(`pushState ${to} (서버 요청 없음)`) }
  const pop = (n: number) => { h.go(n); if (doc !== 'app') load(h.cur.url) } // 404 문서에서 뒤로 가면 문서를 다시 받아요
  return (
    <div className="rt-col">
      <MiniBrowser h={h} onRefresh={() => load(h.cur.url)} onBack={() => pop(-1)} onForward={() => pop(1)}>
        {doc === 'wait' && <div className="rt-page rt-center"><span className="rt-spin" />서버에 요청 중…</div>}
        {doc === '404' && <div className="rt-page rt-404"><b>404 Not Found</b><hr /><small>nginx</small></div>}
        {doc === 'app' && (
          <div className="rt-page">
            <nav className="rt-nav">{Object.keys(SHOP).map(p => <Link key={p} to={p} onGo={go} on={h.cur.url === p}>{p === '/' ? '홈' : p === '/orders' ? '주문' : '상품'}</Link>)}</nav>
            <h5 className="rt-h">{SHOP[h.cur.url] ?? '없는 페이지'}</h5>
            <p className="rt-p">링크를 누르면 주소만 바뀌고 서버엔 아무것도 묻지 않아요. 이제 <b>↻ 새로고침</b>을 눌러 보세요.</p>
          </div>
        )}
      </MiniBrowser>
      <pre className="rt-server" aria-label="서버 로그">{log.join('\n')}</pre>
      <div className="dv-meters">
        <Meter label="마지막 서버 응답" value={m.last} bad={m.reload ? m.last === '404' : undefined} />
        <Meter label="404를 본 횟수" value={`${m.e404}번`} bad={m.e404 > 0} />
        <Meter label="새로고침" value={`${m.reload}번`} />
      </div>
    </div>
  )
}

/* ---------- 02 여러 탭 세션 불일치 (진짜 BroadcastChannel) ---------- */
type Sess = { user: string | null; cart: number }
type Msg = { type: 'logout' } | { type: 'login'; user: string; cart: number } | { type: 'cart'; cart: number }
function ShopTab({ name, fixed, ch, me, setMe, server, setServer, onGot, onStale }: {
  name: string; fixed: boolean; ch: string; me: Sess; setMe: (f: (s: Sess) => Sess) => void
  server: Sess; setServer: (s: Sess) => void; onGot: () => void; onStale: () => void
}) {
  const bc = useRef<BroadcastChannel | null>(null)
  const [toast, setToast] = useState('')
  useEffect(() => {
    if (!fixed || typeof BroadcastChannel === 'undefined') return
    const c = new BroadcastChannel(ch) // 같은 이름의 채널끼리는 같은 문서 안에서도 서로 받아요
    c.onmessage = (e: MessageEvent<Msg>) => {
      const d = e.data
      onGot()
      setMe(s => (d.type === 'logout' ? { user: null, cart: 0 } : d.type === 'login' ? { user: d.user, cart: d.cart } : { ...s, cart: d.cart }))
      setToast(d.type === 'logout' ? '다른 탭에서 로그아웃했어요' : d.type === 'login' ? '다른 탭에서 로그인했어요' : '장바구니가 바뀌었어요')
    }
    bc.current = c
    return () => { c.close(); bc.current = null }
  }, [fixed, ch, onGot, setMe])
  const send = (m: Msg) => bc.current?.postMessage(m)
  const logout = () => { setMe(() => ({ user: null, cart: 0 })); setServer({ user: null, cart: 0 }); send({ type: 'logout' }); setToast('') }
  const login = () => { const s = { user: '하늘', cart: server.cart }; setMe(() => s); setServer(s); send({ type: 'login', ...s }); setToast('') }
  const addCart = () => {
    if (!server.user) { // 이 탭은 로그인된 줄 알지만 서버 세션은 이미 끝났어요
      onStale(); setToast('401 · 세션이 끝났어요. 담은 상품이 사라졌어요')
      setMe(() => ({ user: null, cart: 0 })); return
    }
    const cart = server.cart + 1
    setMe(s => ({ ...s, cart })); setServer({ ...server, cart }); send({ type: 'cart', cart }); setToast('')
  }
  return (
    <div className="rt-tab">
      <div className="rt-tab-head"><b>{name}</b><span>{HOST}/shop</span></div>
      <div className="rt-tab-body">
        <div className="rt-tab-row"><span>{me.user ? `${me.user}님` : '로그인 안 됨'}</span><span className="rt-badge">장바구니 {me.cart}</span></div>
        <div className="dv-row">
          {me.user
            ? <><button type="button" className="btn sm" onClick={addCart}>담기</button><button type="button" className="btn sm ghost" onClick={logout}>로그아웃</button></>
            : <button type="button" className="btn sm ghost" onClick={login}>로그인</button>}
        </div>
        <p className={'rt-toast' + (toast.startsWith('401') ? ' bad' : '')} aria-live="polite">{toast}</p>
      </div>
    </div>
  )
}
export function MultitabDemo({ fixed }: { fixed: boolean }) {
  const ch = 'palmer-dev-rt-session-' + useId()
  const [server, setServer] = useState<Sess>({ user: '하늘', cart: 2 })
  const [a, setA] = useState<Sess>(server)
  const [b, setB] = useState<Sess>(server)
  const [got, setGot] = useState(0)
  const [stale, setStale] = useState(0)
  const onGot = useCallback(() => setGot(n => n + 1), [])
  const onStale = useCallback(() => setStale(n => n + 1), [])
  const same = a.user === b.user && a.cart === b.cart
  const [split, setSplit] = useState(0) // 0.3초 넘게 어긋난 횟수 (메시지가 오가는 찰나는 빼요)
  useEffect(() => {
    if (same) return
    const id = setTimeout(() => setSplit(n => n + 1), 300)
    return () => clearTimeout(id)
  }, [same])
  const common = { fixed, ch, server, setServer, onGot, onStale }
  return (
    <div className="rt-col">
      <div className="rt-tabs">
        <ShopTab name="탭 A" me={a} setMe={setA} {...common} />
        <ShopTab name="탭 B" me={b} setMe={setB} {...common} />
      </div>
      <p className="dv-log">탭 A에서 <b>로그아웃</b>한 뒤 탭 B에서 <b>담기</b>를 눌러 보세요. {fixed ? '두 탭은 진짜 BroadcastChannel로 연결돼 있어요.' : '두 탭은 서로 아무 말도 안 해요.'}</p>
      <div className="dv-meters">
        <Meter label="두 탭 화면" value={same ? '같아요' : '달라요'} bad={!same} />
        <Meter label="두 탭이 어긋난 횟수" value={`${split}번`} bad={split > 0} />
        <Meter label="다른 탭에서 받은 알림" value={`${got}개`} />
        <Meter label="끝난 세션으로 보낸 요청" value={`${stale}번`} bad={stale > 0} />
      </div>
    </div>
  )
}

/* ---------- 03 OAuth 돌아올 주소 유실 ---------- */
const DEEP = '/orders/7?tab=receipt'
const nonce = () => Math.random().toString(36).slice(2, 7) // OAuth state 값 흉내
export function OAuthDemo({ fixed }: { fixed: boolean }) {
  const h = useMini('/')
  const t = useTimers()
  const [authed, setAuthed] = useState(false)
  const session = useRef<Record<string, string>>({}) // 가짜 sessionStorage (데모 안에서만)
  const [used, setUsed] = useState<string[]>([]) // 이미 쓴 인가 코드
  const [arrived, setArrived] = useState<string | null>(null)
  const [path, query] = h.cur.url.split('?')
  const q = new URLSearchParams(query)
  const openLink = () => {
    h.push(DEEP)
    if (authed) return
    if (fixed) h.replace('/login?returnTo=' + encodeURIComponent(DEEP)) // 가드는 replace + 돌아올 주소
    else h.push('/login')                                               // ✕ 원래 주소를 버려요
  }
  const startLogin = () => {
    const st = nonce()
    if (fixed) session.current[st] = q.get('returnTo') ?? '/'
    h.push(`https://auth.example/authorize?client_id=palmer&state=${st}`)
  }
  const consent = () => {
    const st = new URLSearchParams(h.cur.url.split('?')[1]).get('state') ?? ''
    h.push(`/callback?code=c0de${st}&state=${st}`)
    t.set(() => {
      setUsed(u => [...u, 'c0de' + st])
      setAuthed(true)
      if (!fixed) { h.push('/'); setArrived('/'); return } // ✕ 무조건 홈으로
      const back = session.current[st]
      delete session.current[st]
      const safe = back && back.startsWith('/') && !back.startsWith('//') ? back : '/' // 다른 사이트로 보내는 주소는 거절
      h.replace(safe); setArrived(safe)
    }, 600)
  }
  const reset = () => { t.clear(); h.reset('/'); setAuthed(false); setArrived(null); session.current = {}; setUsed([]) }
  const callbacks = h.stack.filter(e => e.url.startsWith('/callback')).length
  let page: ReactNode
  if (path === '/') page = <><h5 className="rt-h">홈</h5><p className="rt-p">{authed ? '로그인됐어요.' : '친구가 보낸 주문 링크를 열어 보세요.'}</p><button type="button" className="btn sm" onClick={openLink}>메신저로 받은 주문 링크 열기</button></>
  else if (path === '/orders/7') page = authed
    ? <><h5 className="rt-h">주문 #7</h5><div className="rt-pills"><span>상품</span><span className={q.get('tab') === 'receipt' ? 'on' : ''}>영수증</span></div><p className="rt-p">원래 가려던 화면이에요.</p></>
    : <p className="rt-p">로그인이 필요해요.</p>
  else if (path === '/login') page = <><h5 className="rt-h">로그인</h5><p className="rt-p">{q.get('returnTo') ? <>돌아올 곳: <code>{q.get('returnTo')}</code></> : '돌아올 곳을 기억하지 않아요.'}</p><button type="button" className="btn sm" onClick={startLogin}>Palmer ID로 로그인</button></>
  else if (h.cur.url.startsWith('https://')) page = <div className="rt-auth"><b>auth.example</b><p className="rt-p">‘Palmer 쇼핑’이 내 이름과 이메일을 보려고 해요.</p><button type="button" className="btn sm" onClick={consent}>동의하고 계속</button></div>
  else if (path === '/callback') page = used.includes(q.get('code') ?? '')
    ? <div className="rt-err"><b>로그인 실패</b><p className="rt-p">invalid_grant · 이미 쓴 인가 코드예요. 뒤로 가기로 콜백에 다시 들어왔어요.</p></div>
    : <div className="rt-center"><span className="rt-spin" />로그인 처리 중…</div>
  return (
    <div className="rt-col">
      <MiniBrowser h={h}><div className="rt-page">{page}</div></MiniBrowser>
      <Stack h={h} />
      <div className="dv-row"><button type="button" className="btn sm ghost" onClick={reset}>처음부터</button>{arrived && <span className="dv-log">이제 <b>← 뒤로 가기</b>도 눌러 보세요</span>}</div>
      <div className="dv-meters">
        <Meter label="로그인 후 도착" value={arrived ?? '—'} bad={arrived ? arrived !== DEEP : undefined} />
        <Meter label="잃어버린 값" value={arrived ? (arrived === DEEP ? '없음' : '주문 번호 · 탭') : '—'} bad={arrived ? arrived !== DEEP : undefined} />
        <Meter label="기록에 남은 /callback" value={`${callbacks}개`} bad={arrived ? callbacks > 0 : undefined} />
      </div>
    </div>
  )
}

/* ---------- 04 뒤로 가기 스크롤 복원 ---------- */
const ROW = 40
const GOODS = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, name: ['니트', '셔츠', '코트', '머플러', '양말'][i % 5] + ' ' + (i + 1), price: ((i * 3701) % 50 + 10) * 1000 }))
export function ScrollDemo({ fixed }: { fixed: boolean }) {
  const h = useMini('/products')
  const t = useTimers()
  const vp = useRef<HTMLDivElement>(null)
  const saved = useRef(new Map<number, number>()) // 기록 key마다 스크롤 위치
  const [loading, setLoading] = useState(false)
  const [m, setM] = useState<{ left: number | null; back: number | null }>({ left: null, back: null })
  const isList = h.cur.url === '/products'
  const key = h.cur.key
  const open = (id: number) => {
    const y = vp.current?.scrollTop ?? 0
    saved.current.set(key, y)
    setM({ left: y, back: null })
    h.push('/products/' + id)
  }
  useLayoutEffect(() => {
    const el = vp.current
    if (!el) return
    if (h.action !== 'POP' || !isList) { el.scrollTop = 0; return } // 새 페이지는 맨 위에서
    if (fixed) { // ✓ 캐시된 목록을 바로 그리고, 이 기록에 저장해 둔 위치로
      el.scrollTop = saved.current.get(key) ?? 0
      setM(s => ({ ...s, back: el.scrollTop }))
    } else {     // ✕ 목록을 다시 받는 동안 높이가 0 → 위치가 맨 위로 잘려요
      setLoading(true)
      t.set(() => { setLoading(false); requestAnimationFrame(() => setM(s => ({ ...s, back: vp.current?.scrollTop ?? 0 }))) }, 500)
    }
  }, [key, isList, fixed, h, t])
  const nth = (y: number | null) => (y === null ? '—' : `${Math.floor(y / ROW) + 1}번째`)
  const off = m.left !== null && m.back !== null ? Math.abs(m.left - m.back) : null
  return (
    <div className="rt-col">
      <MiniBrowser h={h} bodyRef={vp}>
        {isList ? (loading ? <div className="rt-center pad"><span className="rt-spin" />목록 다시 불러오는 중…</div> : (
          <ul className="rt-goods">
            {GOODS.map(g => <li key={g.id}><button type="button" onClick={() => open(g.id)}><span className="rt-thumb" /><b>{g.name}</b><small>{g.price.toLocaleString('ko-KR')}원</small></button></li>)}
          </ul>
        )) : (
          <div className="rt-page"><h5 className="rt-h">{GOODS[Number(h.cur.url.split('/')[2]) - 1]?.name} 상세</h5><p className="rt-p">이제 <b>← 뒤로 가기</b>를 눌러 보세요.</p></div>
        )}
      </MiniBrowser>
      <div className="dv-row">
        <button type="button" className="btn sm ghost" disabled={!isList || loading} onClick={() => vp.current?.scrollTo({ top: ROW * 22 })}>23번째까지 내리기</button>
        <span className="dv-log">내린 다음 상품을 눌러 보세요</span>
      </div>
      <div className="dv-meters">
        <Meter label="떠날 때 보던 상품" value={nth(m.left)} />
        <Meter label="돌아와서 보이는 상품" value={nth(m.back)} bad={off === null ? undefined : off > ROW} />
        <Meter label="어긋난 거리" value={off === null ? '—' : `${Math.round(off)}px`} bad={off === null ? undefined : off > ROW} />
      </div>
    </div>
  )
}

/* ---------- 05 가드 무한 리다이렉트 ---------- */
const MAX_HOPS = 10
export function GuardDemo({ fixed }: { fixed: boolean }) {
  const h = useMini('/')
  const t = useTimers()
  const [hops, setHops] = useState(0)
  const [halt, setHalt] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'guest'>('idle')
  const [done, setDone] = useState(false)
  const loop = (from: string, n: number) => {
    if (n >= MAX_HOPS) { setHalt(true); setDone(true); return } // 데모 안전장치: 실제 앱은 여기서 멈추지 않아요
    t.set(() => {
      // ✕ 두 곳이 서로 다른 기준으로 판단해요
      // 대시보드 가드: 사용자 정보가 없으면 → 로그인 / 로그인 페이지: 토큰이 있으면 → 대시보드
      const to = from === '/dashboard' ? '/login' : '/dashboard'
      h.push(to); setHops(n + 1); loop(to, n + 1)
    }, 140)
  }
  const start = () => {
    t.clear(); setHops(0); setHalt(false); setDone(false); h.reset('/')
    h.push('/dashboard')
    if (!fixed) { loop('/dashboard', 0); return }
    setStatus('checking') // ✓ 판단 기준 하나: 'checking' 동안은 아무 데도 안 보내요
    t.set(() => {
      setStatus('guest') // 토큰이 만료돼서 지우고 손님으로 확정
      h.replace('/login?returnTo=%2Fdashboard'); setHops(1); setDone(true)
    }, 600)
  }
  const path = h.cur.url.split('?')[0]
  return (
    <div className="rt-col">
      <MiniBrowser h={h}>
        <div className="rt-page">
          {path === '/' && <><h5 className="rt-h">홈</h5><p className="rt-p">로그인 토큰이 남아 있지만 <b>이미 만료</b>된 상태예요.</p></>}
          {path === '/dashboard' && (status === 'checking' && fixed
            ? <div className="rt-center"><span className="rt-spin" />로그인 확인 중…</div>
            : <><h5 className="rt-h">대시보드</h5><p className="rt-p">사용자 정보 없음 → 로그인으로</p></>)}
          {path === '/login' && <><h5 className="rt-h">로그인</h5><p className="rt-p">{fixed ? '만료된 토큰은 지웠어요. 다시 로그인해 주세요.' : '토큰 있음 → 대시보드로'}</p></>}
        </div>
        {halt && <div className="rt-halt" role="alert"><b>무한 리다이렉트 감지</b><span>{MAX_HOPS}번째에서 데모를 멈췄어요. 실제 앱은 멈추지 않고 계속 돌아요.</span></div>}
      </MiniBrowser>
      <Stack h={h} />
      <div className="dv-row"><button type="button" className="btn sm" onClick={start}>대시보드 열기</button></div>
      <div className="dv-meters">
        <Meter label="리다이렉트" value={`${hops}번${halt ? '+' : ''}`} bad={done ? hops > 1 : undefined} />
        <Meter label="결과" value={done ? (halt ? '멈춤(무한)' : '로그인 화면') : '—'} bad={done ? halt : undefined} />
        <Meter label="쌓인 기록" value={`${h.length}개`} bad={done ? h.length > 2 : undefined} />
      </div>
    </div>
  )
}

/* ---------- 06 뒤로 가기에 모달 닫기 ---------- */
function ProductPage({ fixed, h }: { fixed: boolean; h: MiniHistory }) {
  const [local, setLocal] = useState(false) // ✕ 문제 그대로: 모달은 그냥 컴포넌트 상태
  const open = fixed ? h.cur.state?.modal === 'option' : local
  const show = () => (fixed ? h.push(h.cur.url, { modal: 'option' }) : setLocal(true)) // ✓ 모달도 기록 한 칸
  const close = () => (fixed ? h.back() : setLocal(false))                              // ✓ 닫기 = 뒤로 가기
  return (
    <>
      <div className="rt-page"><h5 className="rt-h">가을 니트</h5><p className="rt-p">39,000원 · 사이즈를 골라 주세요</p><button type="button" className="btn sm" onClick={show}>옵션 선택</button></div>
      {open && (
        <div className="rt-sheet-bg" onClick={close}>
          <div className="rt-sheet" role="dialog" aria-label="옵션 선택" onClick={e => e.stopPropagation()}>
            <div className="rt-sheet-head"><b>옵션 선택</b><button type="button" className="rt-x" aria-label="닫기" onClick={close}>✕</button></div>
            <div className="rt-pills"><span>S</span><span className="on">M</span><span>L</span></div>
          </div>
        </div>
      )}
    </>
  )
}
export function ModalBackDemo({ fixed }: { fixed: boolean }) {
  const h = useMini('/products', '/products/7')
  const [after, setAfter] = useState<string | null>(null)
  const back = () => { h.back(); setAfter(h.cur.url + (h.cur.state?.modal ? ' · 모달' : '')) }
  return (
    <div className="rt-col">
      <MiniBrowser h={h} onBack={back}>
        {h.cur.url === '/products'
          ? <div className="rt-page"><h5 className="rt-h">상품 목록</h5><p className="rt-p">앗, 상품 페이지를 나와 버렸어요.</p><button type="button" className="btn sm ghost" onClick={() => h.forward()}>다시 상품으로</button></div>
          : <ProductPage key={h.cur.url} fixed={fixed} h={h} />}
      </MiniBrowser>
      <Stack h={h} />
      <div className="dv-row"><button type="button" className="btn sm ghost" disabled={!h.canBack} onClick={back}>◁ 휴대폰 뒤로 가기</button><span className="dv-log">모달을 연 다음 눌러 보세요</span></div>
      <div className="dv-meters">
        <Meter label="뒤로 가기 1번 후" value={after ?? '—'} bad={after ? after === '/products' : undefined} />
        <Meter label="상품 페이지에 남았나" value={after ? (after === '/products' ? '아니요' : '예') : '—'} bad={after ? after === '/products' : undefined} />
      </div>
    </div>
  )
}

/* ---------- 07 배포 직후 ChunkLoadError ---------- */
const BUILD: Record<number, { home: string; settings: string }> = {
  1: { home: 'Home-a1b2c3.js', settings: 'Settings-d4e5f6.js' },
  2: { home: 'Home-9z8y7x.js', settings: 'Settings-k3j2h1.js' },
}
export function ChunkDemo({ fixed }: { fixed: boolean }) {
  const h = useMini('/')
  const t = useTimers()
  const server = useRef(new Set([BUILD[1].home, BUILD[1].settings]))
  const serverVer = useRef(1)
  const reloaded = useRef(false) // 가짜 sessionStorage 'reloaded' 플래그
  const [srv, setSrv] = useState(() => ({ files: new Set([BUILD[1].home, BUILD[1].settings]), ver: 1 })) // 화면 표시용 사본
  const [appVer, setAppVer] = useState(1)
  const [screen, setScreen] = useState<'home' | 'wait' | 'settings' | 'white' | 'notice'>('home')
  const [keepOld, setKeepOld] = useState(false)
  const [reloads, setReloads] = useState(0)
  const [log, setLog] = useState<string[]>(['v1 실행 중 · 설정 화면 청크는 아직 안 받았어요'])
  const add = (s: string) => setLog(l => [...l, s].slice(-5))
  const deploy = (broken = false) => {
    const v = BUILD[2]
    const next = new Set(keepOld && fixed ? server.current : [])   // 덮어쓰기 배포는 옛 파일을 지워요
    next.add(v.home); if (!broken) next.add(v.settings)
    server.current = next; serverVer.current = 2; setSrv({ files: next, ver: 2 })
    add(broken ? '배포 v2 (설정 청크가 빠진 잘못된 배포)' : `배포 v2${keepOld && fixed ? ' · v1 파일도 남겨 둠' : ' · v1 파일 삭제'}`)
  }
  const openSettings = (ver: number) => {
    h.push('/settings'); setScreen('wait')
    t.set(() => {
      const file = BUILD[ver].settings
      if (server.current.has(file)) { add(`import('/assets/${file}') → 200`); setScreen('settings'); reloaded.current = false; return }
      add(`import('/assets/${file}') → 404`)
      add('TypeError: Failed to fetch dynamically imported module')
      if (!fixed) { setScreen('white'); return } // ✕ 잡지 않아서 하얀 화면
      if (reloaded.current) { setScreen('notice'); add('이미 한 번 새로고침했어요 → 반복하지 않고 안내만'); return }
      reloaded.current = true // ✓ 딱 한 번만 새로고침
      setReloads(r => r + 1); add('↻ 새 버전 받으려고 한 번 새로고침')
      t.set(() => { setAppVer(serverVer.current); h.reset('/'); openSettings(serverVer.current) }, 500)
    }, 350)
  }
  const reset = () => {
    t.clear(); server.current = new Set([BUILD[1].home, BUILD[1].settings]); serverVer.current = 1; reloaded.current = false
    setSrv({ files: server.current, ver: 1 })
    setAppVer(1); setScreen('home'); setReloads(0); h.reset('/'); setLog(['v1 실행 중 · 설정 화면 청크는 아직 안 받았어요'])
  }
  const files = [BUILD[1].home, BUILD[1].settings, BUILD[2].home, BUILD[2].settings]
  const opened = screen === 'settings' ? true : screen === 'white' || screen === 'notice' ? false : null
  return (
    <div className="rt-col">
      <MiniBrowser h={h}>
        <div className="rt-page">
          <nav className="rt-nav"><Link to="/" onGo={() => { h.push('/'); setScreen('home') }} on={screen === 'home'}>홈</Link><Link to="/settings" onGo={() => openSettings(appVer)} on={screen === 'settings'}>설정</Link><span className="rt-ver">v{appVer}</span></nav>
          {screen === 'home' && <p className="rt-p">탭을 열어 둔 채로 <b>배포</b>한 다음 <b>설정</b>을 눌러 보세요.</p>}
          {screen === 'wait' && <div className="rt-center"><span className="rt-spin" />설정 화면 불러오는 중…</div>}
          {screen === 'settings' && <><h5 className="rt-h">설정</h5><p className="rt-p">v{appVer} 설정 화면이 열렸어요.</p></>}
          {screen === 'white' && <div className="rt-white" aria-label="하얀 화면" />}
          {screen === 'notice' && <div className="rt-err"><b>새 버전이 있어요</b><p className="rt-p">화면을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.</p></div>}
        </div>
      </MiniBrowser>
      <div className="rt-files" aria-label="서버 /assets 폴더">
        {files.map(f => <span key={f} className={srv.files.has(f) ? 'on' : 'gone'}>{f}</span>)}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => deploy()} disabled={srv.ver === 2}>새 버전 배포</button>
        {fixed && <button type="button" className="btn sm ghost" onClick={() => deploy(true)} disabled={srv.ver === 2}>잘못된 배포</button>}
        <button type="button" className="btn sm ghost" onClick={reset}>처음부터</button>
        {fixed && <label className="rt-check"><input type="checkbox" checked={keepOld} onChange={e => setKeepOld(e.target.checked)} disabled={srv.ver === 2} />옛 파일 남기기</label>}
      </div>
      <pre className="rt-server" aria-label="콘솔">{log.join('\n')}</pre>
      <div className="dv-meters">
        <Meter label="설정 화면" value={opened === null ? '—' : opened ? '열림' : screen === 'white' ? '하얀 화면' : '안내 화면'} bad={opened === null ? undefined : screen === 'white'} />
        <Meter label="자동 새로고침" value={`${reloads}번`} />
        <Meter label="서버 / 탭 버전" value={`v${srv.ver} / v${appVer}`} />
      </div>
    </div>
  )
}

/* ---------- 08 작성 중 이탈 경고 ---------- */
const ESSAY = '지난 주말 남해 여행 후기예요. 첫날은 비가 와서 숙소 근처 카페에서 책을 읽었고, 둘째 날 아침 일찍 독일마을까지 걸었어요. 바다 색이 생각보다 훨씬 진했고…'
export function DirtyDemo({ fixed }: { fixed: boolean }) {
  const h = useMini('/', '/write')
  const [text, setText] = useState('')
  const [draft, setDraft] = useState('') // ✓ 임시 저장 (데모에선 메모리)
  const [ask, setAsk] = useState<null | { native: boolean; go: () => void }>(null)
  const [lost, setLost] = useState(0)
  const [asked, setAsked] = useState(0)
  const [closed, setClosed] = useState(false)
  const [note, setNote] = useState('')
  const dirty = text.trim().length > 0
  const leave = (native: boolean, go: () => void) => {
    if (fixed && dirty) { setAsked(n => n + 1); setAsk({ native, go }); return }
    if (dirty && !fixed) setLost(n => n + text.length)
    setText(''); go()
  }
  const confirmLeave = () => { const a = ask; setDraft(text); setText(''); setAsk(null); a?.go() }
  const toWrite = () => {
    h.push('/write')
    if (fixed && draft) { setText(draft); setNote('임시 저장한 글을 불러왔어요') }
  }
  const reopen = () => { // 새로고침 · 탭 다시 열기 = 메모리 상태가 모두 사라진 새 문서
    setClosed(false)
    if (fixed && draft && h.cur.url === '/write') { setText(draft); setNote('임시 저장한 글을 불러왔어요') }
  }
  const fwd = () => { h.forward(); if (fixed && draft && h.cur.url === '/write') { setText(draft); setNote('임시 저장한 글을 불러왔어요') } }
  const nav = (to: string) => (to === '/write' ? toWrite() : leave(false, () => { h.push(to); setNote('') }))
  return (
    <div className="rt-col">
      <MiniBrowser h={h} onBack={() => leave(false, () => { h.back(); setNote('') })} onForward={fwd}
        onRefresh={() => leave(true, reopen)}>
        {closed ? <div className="rt-page rt-center">탭이 닫혔어요 <button type="button" className="btn sm ghost" onClick={reopen}>다시 열기</button></div> : (
          <div className="rt-page">
            <nav className="rt-nav"><Link to="/" onGo={nav} on={h.cur.url === '/'}>홈</Link><Link to="/me" onGo={nav} on={h.cur.url === '/me'}>내 글</Link><Link to="/write" onGo={nav} on={h.cur.url === '/write'}>글쓰기</Link></nav>
            {h.cur.url === '/write'
              ? <><textarea className="rt-input rt-area" value={text} onChange={e => { setText(e.target.value); if (fixed) setDraft(e.target.value) }} placeholder="여행 후기를 써 보세요" aria-label="글 내용" />{note && <p className="rt-toast">{note}</p>}</>
              : <p className="rt-p">{h.cur.url === '/' ? '홈이에요.' : '내가 쓴 글 0개'} 쓰던 글은 어디 갔을까요?</p>}
          </div>
        )}
        {ask && (ask.native
          ? <div className="rt-sheet-bg"><div className="rt-native" role="alertdialog" aria-label="브라우저 확인 창"><small>{HOST} 내용 (브라우저 기본 창 흉내)</small><p>사이트에서 나가시겠습니까? 변경사항이 저장되지 않을 수 있습니다.</p><div className="dv-row"><button type="button" className="btn sm ghost" onClick={() => setAsk(null)}>취소</button><button type="button" className="btn sm" onClick={confirmLeave}>나가기</button></div></div></div>
          : <div className="rt-sheet-bg"><div className="rt-dialog" role="alertdialog" aria-label="이탈 확인"><b>작성 중인 글이 있어요</b><p className="rt-p">나가도 임시 저장본은 남아요.</p><div className="dv-row"><button type="button" className="btn sm ghost" onClick={() => setAsk(null)}>계속 쓰기</button><button type="button" className="btn sm" onClick={confirmLeave}>나가기</button></div></div></div>)}
      </MiniBrowser>
      <div className="dv-row">
        <button type="button" className="btn sm ghost" disabled={h.cur.url !== '/write' || closed} onClick={() => { setText(ESSAY); if (fixed) setDraft(ESSAY) }}>긴 글 채우기</button>
        <button type="button" className="btn sm ghost" disabled={closed} onClick={() => leave(true, () => setClosed(true))}>탭 닫기</button>
        <span className="dv-log">채운 뒤 메뉴·뒤로·↻를 눌러 보세요</span>
      </div>
      <div className="dv-meters">
        <Meter label="날아간 글자" value={`${lost}자`} bad={lost > 0} />
        <Meter label="나가기 전에 물어봄" value={`${asked}번`} />
        <Meter label="임시 저장" value={fixed && draft ? `${draft.length}자` : '없음'} />
      </div>
    </div>
  )
}

/* ---------- 09 쿼리 파라미터 직렬화 ---------- */
type Filter = { q: string; cat: string[]; min: number; soldout: boolean; page: number }
const CATS = ['상의', '하의', '신발']
function badLink(f: Filter) { // ✕ 손으로 이어 붙이기
  return '?' + Object.entries(f).map(([k, v]) => `${k}=${v}`).join('&')
}
function badRead(qs: string): Record<string, unknown> { // ✕ 문자열 그대로 꺼내 써요
  return Object.fromEntries(new URLSearchParams(qs))
}
function goodLink(f: Filter) { // ✓ URLSearchParams가 인코딩해요
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  f.cat.forEach(c => p.append('cat', c))
  if (f.min) p.set('min', String(f.min))
  if (f.soldout) p.set('soldout', '1')
  if (f.page > 1) p.set('page', String(f.page))
  return '?' + p.toString()
}
function goodRead(qs: string): Filter { // ✓ 타입마다 파서 + 기본값
  const p = new URLSearchParams(qs)
  const n = (k: string, d: number, lo = 0) => { const v = Number(p.get(k)); return Number.isFinite(v) && v >= lo && p.has(k) ? Math.floor(v) : d }
  return { q: p.get('q') ?? '', cat: p.getAll('cat').filter(c => CATS.includes(c)), min: n('min', 0), soldout: p.get('soldout') === '1', page: n('page', 1, 1) }
}
const fmtVal = (v: unknown) => (v === undefined ? '(없음)' : JSON.stringify(v))
export function QueryDemo({ fixed }: { fixed: boolean }) {
  const [f, setF] = useState<Filter>({ q: '티셔츠 & 반바지', cat: ['상의', '하의'], min: 9000, soldout: false, page: 2 })
  const [opened, setOpened] = useState<string | null>(null)
  const link = fixed ? goodLink(f) : badLink(f)
  const back: Record<string, unknown> | null = opened === null ? null : fixed ? goodRead(opened) : badRead(opened)
  const rows = (Object.keys(f) as (keyof Filter)[]).map(k => ({ k, a: f[k], b: back?.[k], ok: back ? JSON.stringify(f[k]) === JSON.stringify(back[k]) : null }))
  const okN = rows.filter(r => r.ok).length
  const set = (p: Partial<Filter>) => { setF(s => ({ ...s, ...p })); setOpened(null) }
  return (
    <div className="rt-col">
      <div className="rt-filter">
        <input className="rt-input" value={f.q} onChange={e => set({ q: e.target.value })} aria-label="검색어" />
        <div className="dv-row">
          {CATS.map(c => <label key={c} className="rt-check"><input type="checkbox" checked={f.cat.includes(c)} onChange={e => set({ cat: e.target.checked ? [...f.cat, c] : f.cat.filter(x => x !== c) })} />{c}</label>)}
          <label className="rt-check"><input type="checkbox" checked={f.soldout} onChange={e => set({ soldout: e.target.checked })} />품절 포함</label>
        </div>
        <div className="dv-row">
          <label className="rt-check">최소 가격 <input className="rt-input rt-num" type="number" value={f.min} onChange={e => set({ min: Number(e.target.value) || 0 })} /></label>
          <label className="rt-check">페이지 <input className="rt-input rt-num" type="number" min={1} value={f.page} onChange={e => set({ page: Math.max(1, Number(e.target.value) || 1) })} /></label>
        </div>
      </div>
      <code className="rt-url allow-select">{HOST}/search{link}</code>
      <div className="dv-row"><button type="button" className="btn sm" onClick={() => setOpened(link)}>링크 공유받아 새로 열기</button></div>
      {back && (
        <table className="rt-table">
          <thead><tr><th>값</th><th>원래</th><th>링크로 연 화면</th><th /></tr></thead>
          <tbody>{rows.map(r => <tr key={r.k} className={r.ok ? '' : 'bad'}><td>{r.k}</td><td>{fmtVal(r.a)}</td><td>{fmtVal(r.b)}</td><td>{r.ok ? '✓' : '✕'}</td></tr>)}</tbody>
        </table>
      )}
      {back && !fixed && <p className="dv-log"><code>"false"</code>는 글자라서 <code>if (soldout)</code>이 참이 돼요. <code>"9000"</code>도 글자라 <code>"9000" &gt; "10000"</code>이 참이에요.</p>}
      <div className="dv-meters">
        <Meter label="그대로 되살아난 값" value={back ? `${okN} / ${rows.length}` : '—'} bad={back ? okN < rows.length : undefined} />
        <Meter label="링크 길이" value={`${link.length}자`} />
      </div>
    </div>
  )
}

/* ---------- 10 마이크로 프론트엔드 히스토리 충돌 ---------- */
const MFE_LINKS: [string, string][] = [['/list', '목록'], ['/3', '주문 #3'], ['/3/return', '반품 신청']]
const screenOf = (url: string) => (url === '/' ? 'home' : url.startsWith('/orders') ? url.slice(7) || '/list' : url)
export function MfeDemo({ fixed }: { fixed: boolean }) {
  const h = useMini('/')
  const [clicks, setClicks] = useState(0)
  const url = h.cur.url
  const known = url === '/' || url.startsWith('/orders')
  const inner = screenOf(url) // 주문 앱이 보는 자기 경로
  const childGo = (p: string) => {
    setClicks(c => c + 1)
    if (fixed) { h.push('/orders' + p); return } // ✓ 셸의 history 하나로, basename을 붙여서
    h.push(p)               // ✕ 주문 앱 라우터가 basename 없이 바로 pushState
    h.push('/orders' + p)   // ✕ 셸 라우터가 ‘모르는 주소’를 고치려고 또 pushState
  }
  let need = 0 // 이전 화면까지 뒤로 가기 횟수
  for (let i = h.idx - 1; i >= 0; i--) if (screenOf(h.stack[i].url) !== inner) { need = h.idx - i; break }
  const tangled = h.stack.filter(e => e.url !== '/' && !e.url.startsWith('/orders')).length
  return (
    <div className="rt-col">
      <MiniBrowser h={h}>
        <div className="rt-page">
          <nav className="rt-nav"><span className="rt-shell">셸</span><Link to="/" onGo={to => h.push(to)} on={url === '/'}>홈</Link><Link to="/orders/list" onGo={to => { setClicks(c => c + 1); h.push(to) }} on={url.startsWith('/orders')}>주문</Link>{!known && <span className="rt-warn">셸: 모르는 주소</span>}</nav>
          {inner === 'home' ? <p className="rt-p">셸(공통 틀) 홈이에요. <b>주문</b>을 눌러 주문 앱으로 가 보세요.</p> : (
            <div className="rt-mfe">
              <span className="rt-mfe-label">주문 앱 · 다른 팀 · 자체 라우터</span>
              <div className="rt-nav">{MFE_LINKS.map(([p, n]) => <Link key={p} to={p} onGo={childGo} on={inner === p}>{n}</Link>)}</div>
              <p className="rt-p">{MFE_LINKS.find(([p]) => p === inner)?.[1] ?? '목록'} 화면</p>
            </div>
          )}
        </div>
      </MiniBrowser>
      <Stack h={h} />
      <p className="dv-log">주문 앱 안에서 링크를 몇 번 누른 다음 <b>← 뒤로 가기</b>를 눌러 보세요.</p>
      <div className="dv-meters">
        <Meter label="누른 횟수 / 쌓인 기록" value={`${clicks} / ${h.length - 1}`} bad={h.length - 1 > clicks} />
        <Meter label="엉킨 주소 기록" value={`${tangled}개`} bad={tangled > 0} />
        <Meter label="이전 화면까지 뒤로" value={need ? `${need}번` : '—'} bad={need > 1} />
      </div>
    </div>
  )
}
