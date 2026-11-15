/* 02 상태 관리 — 데모 모음. fixed=false 문제 그대로, true 해결 적용 */
import { createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type Context, type ReactNode, type RefObject } from 'react'
import { Meter } from '../ui'

const busy = (ms: number) => { const t = performance.now(); while (performance.now() - t < ms) { /* 칸 하나 그리기를 일부러 무겁게 */ } }

/** 언마운트되면 남은 타이머를 모두 지우는 sleep. signal로 취소하면 AbortError를 던져요 */
function useSleep() {
  const [ids] = useState(() => new Set<number>())
  useEffect(() => () => { ids.forEach(clearTimeout); ids.clear() }, [ids])
  const [sleep] = useState(() => (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
    const id = window.setTimeout(() => { ids.delete(id); res() }, ms)
    ids.add(id)
    signal?.addEventListener('abort', () => { clearTimeout(id); ids.delete(id); rej(new DOMException('요청 취소', 'AbortError')) }, { once: true })
  }))
  return sleep
}

/* ---------- 다시 그린 컴포넌트 세기 (부모가 안 그려져도 숫자가 갱신돼요) ---------- */
type Tally = { on: boolean; n: number; raf: number; names: string[]; out: HTMLElement | null; namesOut: HTMLElement | null }
type TallyRef = RefObject<Tally>
function useTally(): TallyRef {
  const t = useRef<Tally>({ on: false, n: 0, raf: 0, names: [], out: null, namesOut: null })
  useEffect(() => { const v = t.current; return () => cancelAnimationFrame(v.raf) }, [])
  return t
}
/** 사용자 동작 직전에 불러요 — 0으로 지우고 세기 시작 */
function arm(ref: TallyRef) {
  const t = ref.current
  t.on = true
  if (t.out) t.out.textContent = '0개'
  if (t.namesOut) t.namesOut.textContent = '없음'
}
const FLASH: Keyframe[] = [{ boxShadow: '0 0 0 3px var(--danger)' }, { boxShadow: '0 0 0 0 transparent' }]
function useRendered(tallyRef: TallyRef, name: string) {
  const ref = useRef<HTMLDivElement>(null)
  const cnt = useRef(0)
  useEffect(() => { // 커밋마다 한 번 — 다시 그려졌다는 뜻이에요
    const t = tallyRef.current
    if (!t.on) return
    cnt.current++
    const el = ref.current
    if (el) {
      el.animate(FLASH, { duration: 520 })
      const i = el.querySelector('.st2-n')
      if (i) i.textContent = String(cnt.current)
    }
    t.n++; t.names.push(name)
    if (!t.raf) t.raf = requestAnimationFrame(() => {
      t.raf = 0
      if (t.out) t.out.textContent = `${t.n}개`
      if (t.namesOut) t.namesOut.textContent = t.names.join(', ')
      t.n = 0; t.names = []
    })
  })
  return ref
}

/* ---------- 작은 store (Zustand 비슷하게) ---------- */
function createStore<T extends object>(init: T) {
  let s = init
  const subs = new Set<() => void>()
  return {
    get: () => s,
    sub: (f: () => void) => { subs.add(f); return () => { subs.delete(f) } },
    set: (patch: Partial<T>) => { s = { ...s, ...patch }; subs.forEach(f => f()) },
  }
}
type Store<T extends object> = ReturnType<typeof createStore<T>>

/* ---------- 01 비대해진 전역 상태 ---------- */
type Shop = { user: string; cart: number; coupon: string; filter: string; recent: number; theme: string; toast: string; modal: boolean; draft: string }
const SHOP: Shop = { user: '김민지', cart: 2, coupon: '10% 쿠폰', filter: '전체', recent: 4, theme: '밝게', toast: '', modal: false, draft: '' }
type Dom = 'user' | 'cart' | 'list' | 'ui'
const WIDGETS: { name: string; dom: Dom; key: keyof Shop; show: (v: unknown) => string }[] = [
  { name: '헤더 이름', dom: 'user', key: 'user', show: v => `${v} 님` },
  { name: '장바구니 배지', dom: 'cart', key: 'cart', show: v => `${v}개` },
  { name: '쿠폰 배너', dom: 'cart', key: 'coupon', show: v => (v as string) || '없음' },
  { name: '목록 필터', dom: 'list', key: 'filter', show: v => String(v) },
  { name: '추천 상품', dom: 'list', key: 'filter', show: v => `${v} 추천` },
  { name: '최근 본 상품', dom: 'list', key: 'recent', show: v => `${v}개` },
  { name: '테마', dom: 'ui', key: 'theme', show: v => String(v) },
  { name: '푸터', dom: 'ui', key: 'theme', show: () => '고객센터' },
]
type ShopStores = { big: Store<Shop>; user: Store<{ user: string }>; cart: Store<{ cart: number; coupon: string }>; list: Store<{ filter: string; recent: number }>; ui: Store<{ theme: string }> }
const BigWidget = memo(function BigWidget({ w, st, tallyRef }: { w: typeof WIDGETS[number]; st: ShopStores; tallyRef: TallyRef }) {
  const s = useSyncExternalStore(st.big.sub, st.big.get) // ✕ 스토어 전체를 구독
  const ref = useRendered(tallyRef, w.name)
  return <div ref={ref} className="st2-w"><small>{w.name}</small><b>{w.show(s[w.key])}</b><i className="st2-n">0</i></div>
})
const SliceWidget = memo(function SliceWidget({ w, st, tallyRef }: { w: typeof WIDGETS[number]; st: ShopStores; tallyRef: TallyRef }) {
  const store = st[w.dom] as Store<Record<string, unknown>>
  const v = useSyncExternalStore(store.sub, () => store.get()[w.key]) // ✓ 필요한 값 하나만
  const ref = useRendered(tallyRef, w.name)
  return <div ref={ref} className="st2-w"><small>{w.name}</small><b>{w.show(v)}</b><i className="st2-n">0</i></div>
})
export function BloatDemo({ fixed }: { fixed: boolean }) {
  const tallyRef = useTally()
  const [st] = useState<ShopStores>(() => ({
    big: createStore({ ...SHOP }),
    user: createStore({ user: SHOP.user }),
    cart: createStore({ cart: SHOP.cart, coupon: SHOP.coupon }),
    list: createStore({ filter: SHOP.filter, recent: SHOP.recent }),
    ui: createStore({ theme: SHOP.theme }),
  }))
  const [log, setLog] = useState<{ what: string; who: string }[]>([])
  const push = (what: string, who: string) => setLog(l => [{ what, who }, ...l].slice(0, 3))
  // 문제: 화면 곳곳에서 setState를 바로 불러요. 같은 일을 해도 이름이 없어요
  const act = (kind: 'add' | 'filter' | 'logout') => {
    arm(tallyRef)
    const b = st.big.get()
    if (!fixed) {
      if (kind === 'add') { st.big.set({ cart: b.cart + 1 }); push(`cart: ${b.cart} → ${b.cart + 1}`, '알 수 없음 (setState 호출 23곳 중 하나)') }
      if (kind === 'filter') { const f = b.filter === '전체' ? '세일' : '전체'; st.big.set({ filter: f }); push(`filter: ${b.filter} → ${f}`, '알 수 없음 (setState 호출 23곳 중 하나)') }
      if (kind === 'logout') { st.big.set({ user: '손님', cart: 0, coupon: '' }); push(`user · cart · coupon 바뀜`, '알 수 없음 (setState 호출 23곳 중 하나)') }
      return
    }
    // 해결: 도메인별 store + 이름 붙은 액션만 값을 바꿔요
    if (kind === 'add') { const c = st.cart.get().cart; st.cart.set({ cart: c + 1 }); push(`cart: ${c} → ${c + 1}`, 'cart/add ← 상품 카드 담기 버튼') }
    if (kind === 'filter') { const f0 = st.list.get().filter, f = f0 === '전체' ? '세일' : '전체'; st.list.set({ filter: f }); push(`filter: ${f0} → ${f}`, 'list/setFilter ← 필터 칩') }
    if (kind === 'logout') { st.user.set({ user: '손님' }); st.cart.set({ cart: 0, coupon: '' }); push('user → 손님, cart → 0', 'auth/logout → cart/clear') }
  }
  return (
    <div className="st2-col">
      <div className="st2-widgets">
        {WIDGETS.map(w => fixed ? <SliceWidget key={w.name} w={w} st={st} tallyRef={tallyRef} /> : <BigWidget key={w.name} w={w} st={st} tallyRef={tallyRef} />)}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => act('add')}>장바구니 담기</button>
        <button type="button" className="btn sm ghost" onClick={() => act('filter')}>필터 바꾸기</button>
        <button type="button" className="btn sm ghost" onClick={() => act('logout')}>로그아웃</button>
      </div>
      <div className="dv-meters">
        <Meter label="버튼 한 번에 다시 그린 위젯" value={<span ref={el => { tallyRef.current.out = el }}>—</span>} bad={!fixed} />
        <Meter label="전역 저장소" value={fixed ? '4개 · 값 6개' : '1개 · 값 9개'} bad={!fixed} />
        <Meter label="마지막 변경을 한 곳" value={log[0] ? (fixed ? log[0].who.split(' ')[0] : '알 수 없음') : '—'} bad={log[0] ? !fixed : undefined} />
      </div>
      <ul className="st2-log" aria-label="변경 기록">
        {log.length === 0 && <li className="st2-muted">버튼을 누르면 변경 기록이 여기 쌓여요 (DevTools 흉내)</li>}
        {log.map((l, i) => <li key={log.length - i}><code>{l.what}</code><span className={fixed ? 'st2-ok' : 'st2-bad'}>{l.who}</span></li>)}
      </ul>
      {fixed && <p className="dv-log">모달 열림·토스트·입력 중인 글은 <b>컴포넌트 안 state</b>로 내려서 전역에서 뺐어요.</p>}
    </div>
  )
}

/* ---------- 02 Props Drilling ---------- */
type U = { name: string }
const NAMES = ['김민지', '박준호', '이서연', '최도윤']
function Box({ tallyRef, name, pass, use, children }: { tallyRef: TallyRef; name: string; pass?: boolean; use?: boolean; children?: ReactNode }) {
  const ref = useRendered(tallyRef, name)
  return (
    <div ref={ref} className={'st2-box' + (pass ? ' pass' : '') + (use ? ' use' : '')}>
      <div className="st2-box-h"><b>{name}</b>{pass && <code>user 넘김</code>}{use && <code>user 씀</code>}<i className="st2-n">0</i></div>
      {children}
    </div>
  )
}
function PageB({ tallyRef, user }: { tallyRef: TallyRef; user: U }) { return <Box tallyRef={tallyRef} name="Page" pass><LayoutB tallyRef={tallyRef} user={user} /></Box> }
function LayoutB({ tallyRef, user }: { tallyRef: TallyRef; user: U }) { return <Box tallyRef={tallyRef} name="Layout" pass><SidebarB tallyRef={tallyRef} user={user} /></Box> }
function SidebarB({ tallyRef, user }: { tallyRef: TallyRef; user: U }) { return <Box tallyRef={tallyRef} name="Sidebar" pass><ProfileB tallyRef={tallyRef} user={user} /></Box> }
function ProfileB({ tallyRef, user }: { tallyRef: TallyRef; user: U }) { return <Box tallyRef={tallyRef} name="Profile" pass><AvatarB tallyRef={tallyRef} user={user} /></Box> }
function AvatarB({ tallyRef, user }: { tallyRef: TallyRef; user: U }) { return <Box tallyRef={tallyRef} name="Avatar" use><span className="st2-avatar">{user.name}</span></Box> }

const UserCtx = createContext<U>({ name: '' })
function PageG({ tallyRef }: { tallyRef: TallyRef }) { return <Box tallyRef={tallyRef} name="Page"><LayoutG tallyRef={tallyRef} /></Box> }
function LayoutG({ tallyRef }: { tallyRef: TallyRef }) { return <Box tallyRef={tallyRef} name="Layout"><SidebarG tallyRef={tallyRef} /></Box> }
function SidebarG({ tallyRef }: { tallyRef: TallyRef }) { return <Box tallyRef={tallyRef} name="Sidebar"><ProfileG tallyRef={tallyRef} /></Box> }
function ProfileG({ tallyRef }: { tallyRef: TallyRef }) { return <Box tallyRef={tallyRef} name="Profile"><AvatarG tallyRef={tallyRef} /></Box> }
function AvatarG({ tallyRef }: { tallyRef: TallyRef }) { const u = useContext(UserCtx); return <Box tallyRef={tallyRef} name="Avatar" use><span className="st2-avatar">{u.name}</span></Box> }
function UserProvider({ tallyRef, children }: { tallyRef: TallyRef; children: ReactNode }) {
  const [i, setI] = useState(0)
  const value = useMemo(() => ({ name: NAMES[i % NAMES.length] }), [i])
  return (
    <UserCtx.Provider value={value}>
      {children}
      <div className="dv-row"><button type="button" className="btn sm" onClick={() => { arm(tallyRef); setI(v => v + 1) }}>이름 바꾸기</button></div>
    </UserCtx.Provider>
  )
}
function DrillBad({ tallyRef }: { tallyRef: TallyRef }) {
  const [i, setI] = useState(0)
  return (
    <>
      <PageB tallyRef={tallyRef} user={{ name: NAMES[i % NAMES.length] }} />
      <div className="dv-row"><button type="button" className="btn sm" onClick={() => { arm(tallyRef); setI(v => v + 1) }}>이름 바꾸기</button></div>
    </>
  )
}
export function DrillDemo({ fixed }: { fixed: boolean }) {
  const tallyRef = useTally()
  return (
    <div className="st2-col">
      {fixed ? <UserProvider tallyRef={tallyRef}><PageG tallyRef={tallyRef} /></UserProvider> : <DrillBad tallyRef={tallyRef} />}
      <div className="dv-meters">
        <Meter label="user를 받아 넘기기만 하는 곳" value={fixed ? '0개' : '4개'} bad={!fixed} />
        <Meter label="이름 바꿀 때 다시 그린 컴포넌트" value={<span ref={el => { tallyRef.current.out = el }}>—</span>} bad={!fixed} />
      </div>
      <p className="dv-log">다시 그린 곳: <b ref={el => { tallyRef.current.namesOut = el }}>—</b></p>
    </div>
  )
}

/* ---------- 03 로딩 · 에러 · 성공 파편화 ---------- */
type Vis = { spin: boolean; err: boolean; data: boolean; empty: boolean; failed: boolean }
type Req = { n: number; fail: boolean }
const ORDERS = ['가을 니트 · 배송 중', '머그컵 · 결제 완료', '운동화 · 배송 완료']
const NOTI = ['쿠폰이 도착했어요', '찜한 상품 가격이 내려갔어요']
function useFake() {
  const sleep = useSleep()
  return async <T,>(data: T, fail: boolean) => { await sleep(600); if (fail) throw new Error('500 서버 오류'); return data }
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="st2-panel"><small>{title}</small><div className="st2-panel-b">{children}</div></div>
}
// ✕ 주문 목록: boolean 세 개를 손으로 맞춰요 — catch에서 로딩 끄기, 다시 시도 때 에러 지우기를 빼먹었어요
function OrdersBad({ req, report }: { req: Req; report: (k: string, v: Vis) => void }) {
  const api = useFake()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [data, setData] = useState<string[] | null>(null)
  useEffect(() => {
    if (!req.n) return
    (async () => {
      setLoading(true)
      try { setData(await api(ORDERS, req.fail)); setLoading(false) } catch { setError(true) }
    })()
  }, [req]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { report('주문', { spin: loading, err: error, data: !!data?.length, empty: data?.length === 0, failed: req.fail }) })
  return (
    <Panel title="주문 목록">
      {loading && <span className="st2-spin" aria-label="불러오는 중" />}
      {error && <span className="st2-err">불러오지 못했어요</span>}
      {data?.map(o => <span key={o} className="st2-li">{o}</span>)}
    </Panel>
  )
}
// ✕ 알림: 에러를 그냥 삼켜요 — 실패해도 '알림이 없어요'라고 거짓말해요
function NotiBad({ req, report }: { req: Req; report: (k: string, v: Vis) => void }) {
  const api = useFake()
  const [items, setItems] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!req.n) return
    (async () => {
      setLoading(true); setItems([])
      try { setItems(await api(NOTI, req.fail)) } catch { /* 무시 */ }
      setLoading(false)
    })()
  }, [req]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { report('알림', { spin: loading, err: false, data: !!items?.length, empty: !loading && items?.length === 0, failed: req.fail }) })
  return (
    <Panel title="알림">
      {loading && <span className="st2-spin" aria-label="불러오는 중" />}
      {!loading && items?.length === 0 && <span className="st2-muted">새 알림이 없어요</span>}
      {items?.map(o => <span key={o} className="st2-li">{o}</span>)}
    </Panel>
  )
}
// ✓ 상태를 하나의 판별 유니언으로 — 동시에 두 상태가 될 수 없어요
type Async<T> = { status: 'idle' } | { status: 'pending' } | { status: 'error'; error: string } | { status: 'success'; data: T }
function useAsync<T>(req: Req, run: () => Promise<T>) {
  const [s, setS] = useState<Async<T>>({ status: 'idle' })
  useEffect(() => {
    if (!req.n) return
    let alive = true
    setS({ status: 'pending' })
    run().then(data => alive && setS({ status: 'success', data }), (e: Error) => alive && setS({ status: 'error', error: e.message }))
    return () => { alive = false }
  }, [req]) // eslint-disable-line react-hooks/exhaustive-deps
  return s
}
function AsyncView<T extends string[]>({ s, retry, children }: { s: Async<T>; retry: () => void; children: (d: T) => ReactNode }) {
  if (s.status === 'pending') return <><span className="st2-skel" /><span className="st2-skel s" /></>
  if (s.status === 'error') return <span className="st2-err">불러오지 못했어요 <button type="button" className="btn sm ghost" onClick={retry}>다시 시도</button></span>
  if (s.status === 'success') return s.data.length ? <>{children(s.data)}</> : <span className="st2-muted">비어 있어요</span>
  return <span className="st2-muted">아직 요청 전</span>
}
function GoodPanel({ title, kind, data, req, retry, report }: { title: string; kind: string; data: string[]; req: Req; retry: () => void; report: (k: string, v: Vis) => void }) {
  const api = useFake()
  const s = useAsync(req, () => api(data, req.fail))
  useEffect(() => { report(kind, { spin: s.status === 'pending', err: s.status === 'error', data: s.status === 'success' && s.data.length > 0, empty: s.status === 'success' && s.data.length === 0, failed: req.fail }) })
  return <Panel title={title}><AsyncView s={s} retry={retry}>{d => d.map(o => <span key={o} className="st2-li">{o}</span>)}</AsyncView></Panel>
}
const LABEL: [keyof Vis, string][] = [['spin', '로딩'], ['err', '에러'], ['data', '데이터']]
export function AsyncDemo({ fixed }: { fixed: boolean }) {
  const sleep = useSleep()
  const [req, setReq] = useState<Req>({ n: 0, fail: false })
  const [step, setStep] = useState('')
  const seen = useRef({ worst: 1, worstTxt: '', lies: new Set<string>() })
  const [stat, setStat] = useState({ worst: '—', lies: 0 })
  const report = (k: string, v: Vis) => {
    const on = LABEL.filter(([key]) => v[key]).map(([, l]) => l)
    const r = seen.current
    if (on.length > r.worst) { r.worst = on.length; r.worstTxt = `${k}: ${on.join('+')}` }
    if (v.failed && v.empty) r.lies.add(k)
    const worst = r.worstTxt || (req.n ? '한 번에 하나' : '—')
    setStat(s => (s.worst === worst && s.lies === r.lies.size ? s : { worst, lies: r.lies.size }))
  }
  const play = async () => {
    seen.current = { worst: 1, worstTxt: '', lies: new Set() }
    setStat({ worst: '—', lies: 0 })
    setStep('① 첫 요청 · 성공'); setReq(r => ({ n: r.n + 1, fail: false })); await sleep(1100)
    setStep('② 새로고침 · 서버 오류'); setReq(r => ({ n: r.n + 1, fail: true })); await sleep(1100)
    setStep('③ 다시 시도 · 성공'); setReq(r => ({ n: r.n + 1, fail: false })); await sleep(1100)
    setStep('끝 — 화면을 확인해 보세요')
  }
  const retry = () => setReq(r => ({ n: r.n + 1, fail: false }))
  return (
    <div className="st2-col">
      <div className="st2-panels">
        {fixed ? <>
          <GoodPanel title="주문 목록" kind="주문" data={ORDERS} req={req} retry={retry} report={report} />
          <GoodPanel title="알림" kind="알림" data={NOTI} req={req} retry={retry} report={report} />
        </> : <>
          <OrdersBad req={req} report={report} />
          <NotiBad req={req} report={report} />
        </>}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={play}>성공 → 실패 → 다시 시도 재생</button>
        <span className="dv-log">{step}</span>
      </div>
      <div className="dv-meters">
        <Meter label="한 칸에 동시에 뜬 상태" value={stat.worst} bad={stat.worst === '—' ? undefined : stat.worst.includes('+')} />
        <Meter label="실패를 '없음'으로 보여준 칸" value={`${stat.lies}개`} bad={req.n ? stat.lies > 0 : undefined} />
      </div>
    </div>
  )
}

/* ---------- 04 두 전역 상태 사이의 레이스 ---------- */
type Cart = { owner: string; items: string[] }
const CARTS: Record<string, string[]> = { 김민지: ['가을 니트', '머그컵'], 박준호: ['러닝화'], 이서연: ['노트 3권', '만년필'] }
const LAT: Record<string, number> = { 김민지: 900, 박준호: 250, 이서연: 500 }
const USERS = Object.keys(CARTS)
function rng(seed: number) { let s = seed; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 } }
export function RaceDemo({ fixed }: { fixed: boolean }) {
  const sleep = useSleep()
  const [st] = useState(() => ({ session: createStore({ user: '김민지' }), cart: createStore<Cart>({ owner: '김민지', items: CARTS['김민지'] }) }))
  const ctrlRef = useRef<AbortController | null>(null)
  const user = useSyncExternalStore(st.session.sub, () => st.session.get().user)
  const cart = useSyncExternalStore(st.cart.sub, st.cart.get)
  const [busyRun, setBusyRun] = useState(false)
  const [score, setScore] = useState<{ wrong: number; total: number } | null>(null)

  const fetchCart = async (u: string, ms: number, signal?: AbortSignal): Promise<Cart> => { await sleep(ms, signal); return { owner: u, items: CARTS[u] } }
  const switchUser = async (u: string, ms = LAT[u]) => {
    st.session.set({ user: u })
    if (!fixed) { st.cart.set(await fetchCart(u, ms)); return } // ✕ 늦게 온 옛 응답도 그대로 덮어써요
    ctrlRef.current?.abort() // ✓ 이전 요청 취소
    const ctrl = new AbortController(); ctrlRef.current = ctrl
    try {
      const c = await fetchCart(u, ms, ctrl.signal)
      if (st.session.get().user === u) st.cart.set(c)
    } catch (e) { if ((e as Error).name !== 'AbortError') throw e }
  }
  const quick = () => { void switchUser('김민지'); window.setTimeout(() => void switchUser('박준호'), 100) }
  const stress = async () => {
    setBusyRun(true); setScore(null)
    const r = rng(7)
    let wrong = 0
    const N = 8
    for (let i = 0; i < N; i++) {
      const a = USERS[i % 3], b = USERS[(i + 1) % 3]
      const la = 60 + Math.round(r() * 300), lb = 60 + Math.round(r() * 300)
      const p1 = switchUser(a, la)
      await sleep(40)
      const p2 = switchUser(b, lb)
      await Promise.allSettled([p1, p2]); await sleep(30)
      if (st.cart.get().owner !== st.session.get().user) wrong++
      setScore({ wrong, total: i + 1 })
    }
    setBusyRun(false)
  }
  const mismatch = cart.owner !== user
  return (
    <div className="st2-col">
      <div className="st2-app">
        <div className="st2-app-h"><b>{user} 님</b><small>session 스토어</small></div>
        <div className={'st2-cart' + (mismatch ? ' wrong' : '')}>
          <small>장바구니 · cart 스토어 (주인: {cart.owner})</small>
          {cart.items.map(x => <span key={x} className="st2-li">{x}</span>)}
        </div>
      </div>
      <div className="dv-row">
        {USERS.map(u => <button key={u} type="button" className="btn sm ghost" disabled={busyRun} onClick={() => void switchUser(u)}>{u} ({LAT[u]}ms)</button>)}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" disabled={busyRun} onClick={quick}>민지 → 준호 빠르게 전환</button>
        <button type="button" className="btn sm ghost" disabled={busyRun} onClick={stress}>무작위로 8번 전환</button>
      </div>
      <div className="dv-meters">
        <Meter label="화면 사용자 / 장바구니 주인" value={`${user.slice(1)} / ${cart.owner.slice(1)}`} bad={mismatch} />
        <Meter label="무작위 전환 중 섞인 화면" value={score ? `${score.wrong}/${score.total}번` : '—'} bad={score ? score.wrong > 0 : undefined} />
      </div>
      <p className="dv-log">민지의 장바구니는 0.9초, 준호는 0.25초 걸려요. 늦게 온 응답이 이기면 섞여요.</p>
    </div>
  )
}

/* ---------- 05 스토리지 동기화 ---------- */
const KEY = 'palmer-dev-st2-settings'
type Size = 'S' | 'M' | 'L'
type Settings = { version: 2; size: Size }
const SIZE_LABEL: Record<Size, string> = { S: '작게', M: '보통', L: '크게' }
const DEFAULT_SETTINGS: Settings = { version: 2, size: 'M' }
const lsGet = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const lsSet = (v: string) => { try { localStorage.setItem(KEY, v) } catch { /* 저장 불가 환경 */ } }
const lsDel = () => { try { localStorage.removeItem(KEY) } catch { /* 저장 불가 환경 */ } }
/** ✕ 앱 시작 때 검사 없이 읽어요 — 깨진 값이면 여기서 에러가 나요 */
function bootBad(): Settings { const raw = lsGet(); return raw ? JSON.parse(raw) as Settings : DEFAULT_SETTINGS }
/** ✓ 검사하고, 옛 형식은 옮기고, 안 되면 기본값 */
function bootGood(): Settings {
  try {
    const v = JSON.parse(lsGet() ?? 'null') as { version?: number; size?: string; fontSize?: number } | null
    if (v?.version === 2 && v.size && v.size in SIZE_LABEL) return v as Settings
    if (typeof v?.fontSize === 'number') return { version: 2, size: v.fontSize >= 18 ? 'L' : v.fontSize <= 13 ? 'S' : 'M' }
  } catch { /* 깨진 값 */ }
  return DEFAULT_SETTINGS
}
function MiniSettings({ initial, fixed, onChange }: { initial: Settings; fixed: boolean; onChange: (s: Settings) => void }) {
  const [s, setS] = useState(initial)
  useEffect(() => { if (fixed) lsSet(JSON.stringify(s)) }, [s, fixed]) // ✓ 어디서 바꾸든 여기서 한 번에 저장
  useEffect(() => { onChange(s) }, [s]) // eslint-disable-line react-hooks/exhaustive-deps
  const fromPanel = (size: Size) => { const next = { ...s, size }; setS(next); if (!fixed) lsSet(JSON.stringify(next)) } // ✕ 설정 화면은 직접 저장
  const fromHeader = () => setS({ ...s, size: s.size === 'L' ? 'M' : 'L' }) // ✕ 문제 모드: 헤더 빠른 버튼은 메모리만 바꿔요
  return (
    <div className="st2-app">
      <div className="st2-app-h"><b>설정</b><button type="button" className="btn sm ghost" onClick={fromHeader}>가+ 빠른 버튼</button></div>
      <p className={'st2-sample ' + s.size}>오늘 주문한 상품이 내일 도착해요.</p>
      <div className="st2-seg" role="radiogroup" aria-label="글자 크기">
        {(['S', 'M', 'L'] as Size[]).map(z => <button key={z} type="button" role="radio" aria-checked={s.size === z} className={s.size === z ? 'on' : ''} onClick={() => fromPanel(z)}>{SIZE_LABEL[z]}</button>)}
      </div>
    </div>
  )
}
export function StorageDemo({ fixed }: { fixed: boolean }) {
  const [boot, setBoot] = useState<{ n: number; initial: Settings | null; crash: string }>(() => { lsDel(); return { n: 0, initial: DEFAULT_SETTINGS, crash: '' } })
  const [screen, setScreen] = useState<Size>('M')
  const [stored, setStored] = useState<string | null>(null)
  const [after, setAfter] = useState<{ kept: boolean; from: Size; to: Size } | null>(null)
  const [broke, setBroke] = useState<'crash' | 'ok' | null>(null)
  const last = useRef<Size>('M')
  useEffect(() => () => lsDel(), [])
  const readStored = () => { const raw = lsGet(); try { const v = JSON.parse(raw ?? 'null') as Settings | null; setStored(v?.size ? SIZE_LABEL[v.size] : raw ? `깨진 값 "${raw}"` : '없음') } catch { setStored(`깨진 값 "${raw}"`) } }
  const onChange = (s: Settings) => { last.current = s.size; setScreen(s.size); readStored() }
  const reload = (corrupted = false) => {
    const from = last.current
    try {
      const initial = fixed ? bootGood() : bootBad()
      if (fixed && corrupted) lsSet(JSON.stringify(initial))
      setBoot(b => ({ n: b.n + 1, initial, crash: '' }))
      if (corrupted) setBroke('ok'); else setAfter({ kept: initial.size === from, from, to: initial.size })
    } catch (e) {
      setBoot(b => ({ n: b.n + 1, initial: null, crash: `${(e as Error).name}: ${(e as Error).message}` }))
      setBroke('crash')
    }
    readStored()
  }
  const corrupt = () => { lsSet('large'); reload(true) } // 옛 버전 앱이 JSON이 아닌 글자로 저장해 둔 상황
  const reset = () => { lsDel(); setBroke(null); setAfter(null); setBoot(b => ({ n: b.n + 1, initial: DEFAULT_SETTINGS, crash: '' })); setScreen('M'); last.current = 'M'; readStored() }
  return (
    <div className="st2-col">
      {boot.initial
        ? <MiniSettings key={boot.n} initial={boot.initial} fixed={fixed} onChange={onChange} />
        : <div className="st2-white"><b>(하얀 화면)</b><code>{boot.crash}</code><small>앱 시작 코드가 에러를 던져서 아무것도 못 그렸어요</small></div>}
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => reload()}>새로고침</button>
        <button type="button" className="btn sm ghost" onClick={corrupt}>옛 버전 값 넣고 새로고침</button>
        <button type="button" className="btn sm ghost" onClick={reset}>처음으로</button>
      </div>
      <div className="dv-meters">
        <Meter label="화면 / 저장소" value={boot.initial ? `${SIZE_LABEL[screen]} / ${stored ?? '없음'}` : `— / ${stored ?? '없음'}`} bad={stored !== null && boot.initial && (stored !== '없음' || screen !== 'M') ? stored !== SIZE_LABEL[screen] : undefined} />
        <Meter label="새로고침 후 설정" value={after ? (after.kept ? `유지 (${SIZE_LABEL[after.to]})` : `사라짐 (${SIZE_LABEL[after.from]}→${SIZE_LABEL[after.to]})`) : '—'} bad={after ? !after.kept : undefined} />
        <Meter label="깨진 값 읽기" value={broke === 'crash' ? '앱 멈춤' : broke === 'ok' ? '기본값으로 복구' : '—'} bad={broke ? broke === 'crash' : undefined} />
      </div>
      <p className="dv-log"><b>가+ 빠른 버튼</b>을 누르고 새로고침해 보세요. 실제 localStorage(<code>{KEY}</code>)를 쓰고, 이 데모를 벗어나면 지워요.</p>
    </div>
  )
}

/* ---------- 06 입력마다 전체 폼 리렌더 ---------- */
const FIELDS = ['신청자 이름', '생년월일', '휴대폰', '이메일', '우편번호', '주소', '상세 주소', '회사명', '부서', '직급', '회사 전화', '비상 연락처', '관계', '은행', '계좌번호', '예금주', '차량 번호', '학교', '전공', '자격증', '추천인', '가입 경로', '희망 일자', '요청 사항']
type FormMeter = { t0: number; out: HTMLElement | null }
function useMeasureEnd(meterRef: RefObject<FormMeter>) {
  useLayoutEffect(() => { // 커밋 직후 — 마지막 칸이 쓴 값이 그 입력의 처리 시간이에요
    const { t0, out } = meterRef.current
    if (!t0) return
    const ms = performance.now() - t0
    if (out) out.textContent = `${ms.toFixed(1)}ms`
  })
}
function FieldShell({ label, tallyRef, children }: { label: string; tallyRef: TallyRef; children: ReactNode }) {
  const ref = useRendered(tallyRef, label)
  return <div ref={ref} className="st2-field"><label><span>{label}</span><i className="st2-n">0</i></label>{children}</div>
}
function FieldBad({ label, value, onChange, tallyRef, meterRef }: { label: string; value: string; onChange: (v: string) => void; tallyRef: TallyRef; meterRef: RefObject<FormMeter> }) {
  busy(0.4) // 검증 · 마스크 · 도움말이 붙은 칸이라고 가정
  useMeasureEnd(meterRef)
  return <FieldShell label={label} tallyRef={tallyRef}><input className="st2-input" value={value} onChange={e => onChange(e.target.value)} aria-label={label} /></FieldShell>
}
function FieldGood({ label, tallyRef, meterRef }: { label: string; tallyRef: TallyRef; meterRef: RefObject<FormMeter> }) {
  const [v, setV] = useState('') // ✓ 값은 칸 안에서 — 제출할 때 모아요
  busy(0.4)
  useMeasureEnd(meterRef)
  return <FieldShell label={label} tallyRef={tallyRef}><input className="st2-input" value={v} onChange={e => { meterRef.current.t0 = performance.now(); setV(e.target.value) }} aria-label={label} /></FieldShell>
}
function FormBad({ tallyRef, meterRef }: { tallyRef: TallyRef; meterRef: RefObject<FormMeter> }) {
  const [form, setForm] = useState<Record<string, string>>({})
  return <>{FIELDS.map(f => <FieldBad key={f} label={f} value={form[f] ?? ''} tallyRef={tallyRef} meterRef={meterRef} onChange={v => { meterRef.current.t0 = performance.now(); setForm({ ...form, [f]: v }) }} />)}</>
}
export function FormDemo({ fixed }: { fixed: boolean }) {
  const tallyRef = useTally()
  const meterRef = useRef<FormMeter>({ t0: 0, out: null })
  const box = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const typeIn = () => {
    clearTimeout(timer.current)
    const input = box.current?.querySelector('input')
    if (!input) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    const text = '서울시 마포구 월드컵로 12'
    let i = 0
    setter.call(input, ''); input.dispatchEvent(new Event('input', { bubbles: true }))
    const step = () => {
      arm(tallyRef)
      setter.call(input, text.slice(0, ++i)); input.dispatchEvent(new Event('input', { bubbles: true }))
      if (i < text.length) timer.current = window.setTimeout(step, 70)
    }
    timer.current = window.setTimeout(step, 70)
  }
  return (
    <div className="st2-col">
      <div className="st2-form" ref={box} onInputCapture={() => arm(tallyRef)}>
        {fixed ? FIELDS.map(f => <FieldGood key={f} label={f} tallyRef={tallyRef} meterRef={meterRef} />) : <FormBad tallyRef={tallyRef} meterRef={meterRef} />}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={typeIn}>첫 칸에 자동 입력</button>
        <span className="dv-log">칸 {FIELDS.length}개 · 아무 칸에나 직접 쳐도 돼요</span>
      </div>
      <div className="dv-meters">
        <Meter label="글자 하나에 다시 그린 칸" value={<span ref={el => { tallyRef.current.out = el }}>—</span>} bad={!fixed} />
        <Meter label="글자 하나 처리 시간" value={<span ref={el => { meterRef.current.out = el }}>—</span>} bad={!fixed} />
      </div>
    </div>
  )
}

/* ---------- 07 Context 일부 변경에 전체 리렌더 ---------- */
type Uses = 'theme' | 'user' | 'cart'
const CTX_W: [string, Uses][] = [['헤더 배경', 'theme'], ['다크 모드 스위치', 'theme'], ['로고 색', 'theme'], ['인사말', 'user'], ['프로필 사진', 'user'], ['등급 배지', 'user'], ['포인트', 'user'], ['내 쿠폰', 'user'], ['장바구니 배지', 'cart'], ['총 금액', 'cart'], ['무료 배송까지', 'cart'], ['결제 버튼', 'cart']]
type AppVal = { theme: string; user: string; cart: number }
const AppCtx = createContext<AppVal>({ theme: '', user: '', cart: 0 })
const ThemeCtx = createContext('')
const UserNameCtx = createContext('')
const CartCtx = createContext(0)
function CtxWidgetBad({ name, uses, tallyRef }: { name: string; uses: Uses; tallyRef: TallyRef }) {
  const v = useContext(AppCtx) // ✕ 하나만 써도 전체 값을 구독해요
  const ref = useRendered(tallyRef, name)
  return <div ref={ref} className="st2-w"><small>{name}</small><b>{String(v[uses])}</b><i className="st2-n">0</i></div>
}
function CtxWidgetGood({ name, uses, tallyRef }: { name: string; uses: Uses; tallyRef: TallyRef }) {
  const v = useContext((uses === 'theme' ? ThemeCtx : uses === 'user' ? UserNameCtx : CartCtx) as Context<string | number>)
  const ref = useRendered(tallyRef, name)
  return <div ref={ref} className="st2-w"><small>{name}</small><b>{String(v)}</b><i className="st2-n">0</i></div>
}
function CtxProvider({ fixed, tallyRef, children }: { fixed: boolean; tallyRef: TallyRef; children: ReactNode }) {
  const [theme, setTheme] = useState('밝게')
  const [user, setUser] = useState('민지')
  const [cart, setCart] = useState(2)
  const btns = (
    <div className="dv-row">
      <button type="button" className="btn sm" onClick={() => { arm(tallyRef); setTheme(v => (v === '밝게' ? '어둡게' : '밝게')) }}>테마 바꾸기</button>
      <button type="button" className="btn sm ghost" onClick={() => { arm(tallyRef); setCart(v => v + 1) }}>장바구니 담기</button>
      <button type="button" className="btn sm ghost" onClick={() => { arm(tallyRef); setUser(v => (v === '민지' ? '준호' : '민지')) }}>이름 바꾸기</button>
    </div>
  )
  if (!fixed) return <AppCtx.Provider value={{ theme, user, cart }}>{children}{btns}</AppCtx.Provider>
  return (
    <ThemeCtx.Provider value={theme}>
      <UserNameCtx.Provider value={user}>
        <CartCtx.Provider value={cart}>{children}{btns}</CartCtx.Provider>
      </UserNameCtx.Provider>
    </ThemeCtx.Provider>
  )
}
export function ContextDemo({ fixed }: { fixed: boolean }) {
  const tallyRef = useTally()
  const W = fixed ? CtxWidgetGood : CtxWidgetBad
  return (
    <div className="st2-col">
      <CtxProvider fixed={fixed} tallyRef={tallyRef}>
        <div className="st2-widgets four">{CTX_W.map(([n, u]) => <W key={n} name={n} uses={u} tallyRef={tallyRef} />)}</div>
      </CtxProvider>
      <div className="dv-meters">
        <Meter label="버튼 한 번에 다시 그린 칸" value={<span ref={el => { tallyRef.current.out = el }}>—</span>} bad={!fixed} />
        <Meter label="Context" value={fixed ? '3개로 나눔' : '1개 (객체 값)'} bad={!fixed} />
      </div>
      <p className="dv-log">칸 12개 중 테마를 쓰는 건 3개뿐이에요. 다시 그린 곳: <b ref={el => { tallyRef.current.namesOut = el }}>—</b></p>
    </div>
  )
}

/* ---------- 08 Vue ref · reactive (작은 반응형 엔진으로 흉내) ---------- */
type Eff = () => void
const bucket = new WeakMap<object, Map<PropertyKey, Set<Eff>>>()
let activeEff: Eff | null = null
function track(o: object, k: PropertyKey) {
  if (!activeEff) return
  let m = bucket.get(o); if (!m) bucket.set(o, (m = new Map()))
  let d = m.get(k); if (!d) m.set(k, (d = new Set()))
  d.add(activeEff)
}
function trigger(o: object, k: PropertyKey) { const d = bucket.get(o)?.get(k); if (d) [...d].forEach(f => f()) }
const proxies = new WeakMap<object, object>()
function reactive<T extends object>(o: T): T {
  const hit = proxies.get(o); if (hit) return hit as T
  const p = new Proxy(o, {
    get(tg, k, r) { track(tg, k); const v = Reflect.get(tg, k, r) as unknown; return typeof v === 'object' && v !== null ? reactive(v) : v },
    set(tg, k, v, r) { const ok = Reflect.set(tg, k, v, r); trigger(tg, k); if (Array.isArray(tg)) trigger(tg, 'length'); return ok },
  })
  proxies.set(o, p); return p
}
class RefImpl<T> {
  private _v: T
  constructor(v: T) { this._v = v }
  get value() { track(this, 'value'); return this._v }
  set value(v: T) { this._v = v; trigger(this, 'value') }
}
const ref = <T,>(v: T) => new RefImpl(v)
const toRef = <T extends object, K extends keyof T>(o: T, k: K) => ({ get value() { return o[k] }, set value(v: T[K]) { o[k] = v } })
function effect(fn: Eff) {
  let alive = true
  const run = () => { if (!alive) return; const prev = activeEff; activeEff = run; try { fn() } finally { activeEff = prev } }
  run()
  return () => { alive = false }
}
type VueView = { qty: string; greeting: string; count: number }
type VueApp = { truth: () => { qty: number; count: number }; add: () => void; rename: () => void; load: () => Promise<void>; stop: () => void }
function setupVue(fixed: boolean, out: (v: VueView) => void, wait: (ms: number) => Promise<void>): VueApp {
  const store = reactive({ qty: 0 }) // Pinia 스토어 자리
  const name = ref('민지')
  if (!fixed) {
    const { qty } = store // ✕ 구조 분해 → 그냥 숫자 0으로 복사돼요
    const greeting = () => `${name} 님` // ✕ computed 안에서 .value 누락
    let items = reactive<string[]>([])
    const stop = effect(() => out({ qty: String(qty), greeting: greeting(), count: items.length }))
    return {
      truth: () => ({ qty: store.qty, count: items.length }),
      add: () => { store.qty++ },
      rename: () => { name.value = name.value === '민지' ? '준호' : '민지' },
      load: async () => { await wait(400); items = reactive(['니트', '머그컵', '러닝화', '노트', '만년필']) }, // ✕ 통째로 바꿔치기
      stop,
    }
  }
  const qty = toRef(store, 'qty') // ✓ storeToRefs · toRefs
  const greeting = () => `${name.value} 님` // ✓
  const items = ref<string[]>([])
  const stop = effect(() => out({ qty: String(qty.value), greeting: greeting(), count: items.value.length }))
  return {
    truth: () => ({ qty: store.qty, count: items.value.length }),
    add: () => { store.qty++ },
    rename: () => { name.value = name.value === '민지' ? '준호' : '민지' },
    load: async () => { await wait(400); items.value = ['니트', '머그컵', '러닝화', '노트', '만년필'] }, // ✓ .value에 넣어요
    stop,
  }
}
export function VueRefDemo({ fixed }: { fixed: boolean }) {
  const sleep = useSleep()
  const [view, setView] = useState<VueView>({ qty: '0', greeting: '', count: 0 })
  const [truth, setTruth] = useState({ qty: 0, count: 0 })
  const app = useRef<VueApp | null>(null)
  useEffect(() => {
    const a = setupVue(fixed, setView, ms => sleep(ms))
    app.current = a
    return () => { a.stop(); app.current = null }
  }, [fixed, sleep])
  const sync = () => { if (app.current) setTruth(app.current.truth()) }
  return (
    <div className="st2-col">
      <div className="st2-vue">
        <div className="st2-vue-h"><code>&lt;template&gt;</code><small>Vue 3 흉내</small></div>
        <p><span className="st2-muted">{'{{ greeting }}'}</span><b>{view.greeting}</b></p>
        <p><span className="st2-muted">{'{{ qty }}'}</span><b>장바구니 {view.qty}개</b></p>
        <p><span className="st2-muted">{'{{ items.length }}'}</span><b>목록 {view.count}개</b></p>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => { app.current?.add(); sync() }}>수량 +1</button>
        <button type="button" className="btn sm ghost" onClick={() => { app.current?.rename(); sync() }}>이름 바꾸기</button>
        <button type="button" className="btn sm ghost" onClick={async () => { await app.current?.load(); sync() }}>목록 불러오기</button>
      </div>
      <div className="dv-meters">
        <Meter label="수량 화면 / 실제" value={`${view.qty} / ${truth.qty}`} bad={Number(view.qty) !== truth.qty} />
        <Meter label="인사말" value={view.greeting || '—'} bad={view.greeting ? view.greeting.includes('object') : undefined} />
        <Meter label="목록 화면 / 실제" value={`${view.count} / ${truth.count}`} bad={view.count !== truth.count} />
      </div>
    </div>
  )
}

/* ---------- 09 RxJS 구독 미해제 (Angular 생명주기 흉내) ---------- */
type Hub = { live: number; total: number; stamps: number[]; offPage: number; visible: boolean; page: number; all: Set<Subscription> }
class Subscription {
  closed = false
  private teardown: () => void
  constructor(teardown: () => void) { this.teardown = teardown }
  unsubscribe() { if (this.closed) return; this.closed = true; this.teardown() }
}
const MAX_SUBS = 12
/** rxjs의 interval(ms)처럼 — subscribe하면 끊기 전까지 계속 값을 보내요 */
function interval(ms: number, hub: Hub) {
  return {
    subscribe(next: (n: number) => void): Subscription {
      if (hub.live >= MAX_SUBS) return new Subscription(() => {}) // 데모 안전장치
      let n = 0
      const id = window.setInterval(() => { if (hub.visible) next(n++) }, ms)
      hub.live++
      const s = new Subscription(() => { clearInterval(id); hub.live-- })
      hub.all.add(s)
      return s
    },
  }
}
const DETAIL = 1
class OrderDetailComponent {
  private onDestroy: (() => void)[] = []
  private hub: Hub
  private fixed: boolean
  constructor(hub: Hub, fixed: boolean) { this.hub = hub; this.fixed = fixed }
  ngOnInit() {
    const s = interval(1000, this.hub).subscribe(() => { // 1초 = 상태 폴링 한 번
      this.hub.total++; this.hub.stamps.push(performance.now())
      if (this.hub.page !== DETAIL) this.hub.offPage++
    })
    if (this.fixed) this.onDestroy.push(() => s.unsubscribe()) // ✓ takeUntilDestroyed가 하는 일
  }
  ngOnDestroy() { this.onDestroy.forEach(f => f()) }
}
const PAGES = ['주문 목록', '주문 상세', '마이페이지']
export function RxjsDemo({ fixed }: { fixed: boolean }) {
  const hubRef = useRef<Hub>({ live: 0, total: 0, stamps: [], offPage: 0, visible: true, page: 0, all: new Set() })
  const [page, setPage] = useState(0)
  const comp = useRef<OrderDetailComponent | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const [m, setM] = useState({ live: 0, perSec: 0, total: 0, off: 0 })
  const hopT = useRef(0)
  useEffect(() => {
    const hub = hubRef.current
    const id = window.setInterval(() => {
      const now = performance.now()
      hub.stamps = hub.stamps.filter(s => now - s < 1000)
      setM({ live: hub.live, perSec: hub.stamps.length, total: hub.total, off: hub.offPage })
    }, 300)
    const io = new IntersectionObserver(([e]) => { hub.visible = e.isIntersecting })
    if (root.current) io.observe(root.current)
    return () => { clearInterval(id); clearTimeout(hopT.current); io.disconnect(); hub.all.forEach(s => s.unsubscribe()); hub.all.clear() }
  }, [])
  const go = (p: number) => {
    const hub = hubRef.current
    comp.current?.ngOnDestroy(); comp.current = null // 라우터가 이전 컴포넌트를 없애요
    hub.page = p
    if (p === DETAIL) { comp.current = new OrderDetailComponent(hub, fixed); comp.current.ngOnInit() }
    setPage(p)
  }
  const hop = () => {
    clearTimeout(hopT.current)
    let i = 0
    const step = () => { go(++i % 2 === 1 ? DETAIL : 0); if (i < 8) hopT.current = window.setTimeout(step, 220) }
    step()
  }
  return (
    <div className="st2-col" ref={root}>
      <div className="st2-browser">
        <div className="st2-url">shop.example/{['orders', 'orders/1024', 'me'][page]}</div>
        <div className="st2-page"><b>{PAGES[page]}</b><small>{page === DETAIL ? 'ngOnInit에서 1초마다 주문 상태를 물어봐요' : '폴링이 필요 없는 화면이에요'}</small></div>
      </div>
      <div className="dv-row">
        {PAGES.map((p, i) => <button key={p} type="button" className={'btn sm' + (i === page ? '' : ' ghost')} onClick={() => go(i)}>{p}</button>)}
        <button type="button" className="btn sm ghost" onClick={hop}>상세 4번 들어갔다 나오기</button>
      </div>
      <div className="dv-meters">
        <Meter label="살아 있는 구독" value={m.live} bad={m.live > (page === DETAIL ? 1 : 0)} />
        <Meter label="최근 1초 요청" value={`${m.perSec}번`} bad={m.perSec > 1} />
        <Meter label="상세를 떠난 뒤 요청" value={`${m.off}번`} bad={m.off > 0} />
      </div>
      <p className="dv-log">{!fixed && m.live >= MAX_SUBS ? <>데모가 너무 커지지 않게 <b>구독 {MAX_SUBS}개</b>에서 막았어요.</> : '상세를 여러 번 오간 뒤 목록에 머물러 보세요. 이 칸이 화면 밖이면 폴링을 멈춰요.'}</p>
    </div>
  )
}

/* ---------- 10 뒤로 가기 bfcache (페이지 얼리기 흉내) ---------- */
function ProductPage({ win, fixed, server, sleep, onPay, report }: {
  win: EventTarget; fixed: boolean; server: RefObject<{ stock: number }>; sleep: (ms: number) => Promise<void>; onPay: () => void
  report: (s: { paying: boolean; stock: number | null }) => void
}) {
  const [paying, setPaying] = useState(false)
  const [stock, setStock] = useState<number | null>(null)
  useEffect(() => { // 처음 열 때(load) 한 번만 — bfcache 복원 때는 다시 안 돌아요
    let alive = true
    const load = () => sleep(300).then(() => { if (alive) setStock(server.current.stock) })
    void load()
    if (!fixed) return () => { alive = false }
    const onShow = (e: Event) => {
      if (!(e as PageTransitionEvent).persisted) return
      setPaying(false) // ✓ 멈춘 스피너 끄기
      void load() // ✓ 바뀌었을 값 다시 받기
    }
    win.addEventListener('pageshow', onShow)
    return () => { alive = false; win.removeEventListener('pageshow', onShow) }
  }, [win, fixed, server, sleep])
  useEffect(() => { report({ paying, stock }) })
  return (
    <div className="st2-page">
      <b>가을 니트</b>
      <small>남은 재고 {stock === null ? '…' : `${stock}개`}</small>
      <button type="button" className="btn sm" disabled={paying || stock === 0} onClick={() => { setPaying(true); window.setTimeout(onPay, 350) }}>
        {paying ? <><span className="st2-spin sm" />결제 준비 중…</> : stock === 0 ? '품절' : '결제하기'}
      </button>
    </div>
  )
}
export function BfcacheDemo({ fixed }: { fixed: boolean }) {
  const sleep = useSleep()
  const [win] = useState(() => new EventTarget()) // 진짜 window 대신 이 데모 전용
  const server = useRef({ stock: 3 })
  const [actual, setActual] = useState(3)
  const [page, setPage] = useState<'product' | 'pay'>('product')
  const [log, setLog] = useState<string[]>([])
  const [back, setBack] = useState(false)
  const [st, setSt] = useState<{ paying: boolean; stock: number | null }>({ paying: false, stock: null })
  const report = (s: { paying: boolean; stock: number | null }) => setSt(p => (p.paying === s.paying && p.stock === s.stock ? p : s))
  const onPay = () => {
    win.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    setLog(l => [...l, 'pagehide (persisted: true) — 페이지를 얼려 둬요'])
    server.current.stock = 0; setActual(0) // 결제 페이지에 있는 동안 다른 사람이 다 사 갔어요
    setPage('pay')
  }
  const goBack = () => {
    setPage('product'); setBack(true)
    win.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    setLog(l => [...l, 'pageshow (persisted: true) — 얼린 그대로 되살려요. load는 다시 안 와요'])
  }
  return (
    <div className="st2-col">
      <div className="st2-browser">
        <div className="st2-url"><button type="button" className="st2-back" disabled={page !== 'pay'} onClick={goBack} aria-label="뒤로 가기">←</button>{page === 'pay' ? 'pay.example/checkout' : 'shop.example/item/7'}</div>
        {/* 상품 페이지는 숨겨진 채로 살아 있어요 — bfcache가 JS 상태까지 얼려 두는 것처럼 */}
        <div hidden={page !== 'product'}><ProductPage win={win} fixed={fixed} server={server} sleep={sleep} onPay={onPay} report={report} /></div>
        {page === 'pay' && <div className="st2-page"><b>결제 대행사 화면</b><small>여기서 결제를 그만두고 ← 뒤로 가기를 눌러 보세요</small></div>}
      </div>
      <div className="dv-meters">
        <Meter label="돌아왔을 때 버튼" value={back ? (st.paying ? '스피너 계속 돎' : '스피너 꺼짐') : '—'} bad={back ? st.paying : undefined} />
        <Meter label="화면 재고 / 실제 재고" value={`${st.stock ?? '…'} / ${actual}`} bad={st.stock !== null && st.stock !== actual} />
      </div>
      <ul className="st2-log" aria-label="페이지 이벤트">
        {log.length === 0 && <li className="st2-muted">결제하기 → ← 뒤로 가기 순서로 눌러 보세요</li>}
        {log.slice(-3).map((l, i) => <li key={log.length + i}><code>{l}</code></li>)}
      </ul>
    </div>
  )
}
