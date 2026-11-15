/* 03 프레임워크 함정 — 데모 모음. fixed=false 문제 그대로, true 해결 적용 */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { Seg } from '../../components/ui'
import { Meter } from '../ui'

const busy = (ms: number) => { const t = performance.now(); while (performance.now() - t < ms) { /* 일부러 메인 스레드를 잡아요 */ } }
const fmt = (n: number) => n.toLocaleString('ko-KR')

/** 데모 안 타이머 — 언마운트하면 전부 정리해요 */
function useDemoTimers() {
  const [api] = useState(() => {
    const ids = new Set<number>()
    return {
      later(fn: () => void, ms: number) { const id = window.setTimeout(() => { ids.delete(id); fn() }, ms); ids.add(id) },
      clear() { ids.forEach(clearTimeout); ids.clear() },
    }
  })
  useEffect(() => () => api.clear(), [api])
  return api
}

/* ---------- 01 useEffect 의존성 객체로 무한 루프 (실제 React) ---------- */
const LOOP_CAP = 50
type LoopStats = { runs: number; done: number; t0: number; last: number; stopped: boolean; ping: () => void }
const Profile = memo(function Profile({ userId, fixed, stats }: { userId: number; fixed: boolean; stats: LoopStats }) {
  const [user, setUser] = useState<{ name: string; at: number } | null>(null)
  // ✕ 렌더할 때마다 새 객체 → 의존성이 매번 '바뀐 값'
  const query = { id: userId, fields: ['name', 'avatar'] }
  // ✓ userId가 같으면 같은 객체
  const stableQuery = useMemo(() => ({ id: userId, fields: ['name', 'avatar'] }), [userId])
  const q = fixed ? stableQuery : query
  useEffect(() => {
    if (stats.runs >= LOOP_CAP) { stats.stopped = true; stats.ping(); return } // 데모 안전장치: 50번에서 강제로 멈춰요
    stats.runs++; stats.ping()
    const t = window.setTimeout(() => { // 40ms 걸리는 가짜 API
      stats.done++; stats.ping()
      setUser({ name: '김하늘 (#' + q.id + ')', at: performance.now() }) // 응답 → 다시 렌더 → 새 query → effect 다시…
    }, 40)
    return () => clearTimeout(t)
  }, [q, stats])
  return (
    <div className={'fw-profile' + (user ? '' : ' wait')}>
      <span className="fw-av" />
      <div><b>{user ? user.name : '불러오는 중…'}</b><small>{user ? `응답 받은 시각 ${Math.round(user.at) % 100000}` : 'GET /api/users/7'}</small></div>
    </div>
  )
})
export function EffectLoopDemo({ fixed }: { fixed: boolean }) {
  const [open, setOpen] = useState(0)
  const [, force] = useState(0)
  const [stats] = useState<LoopStats>(() => {
    const s: LoopStats = { runs: 0, done: 0, t0: 0, last: 0, stopped: false, ping: () => { s.last = performance.now(); force(x => x + 1) } }
    return s
  })
  const start = () => { stats.runs = 0; stats.done = 0; stats.stopped = false; stats.t0 = stats.last = performance.now(); setOpen(o => o + 1) }
  const sec = stats.t0 ? Math.max(1, (stats.last - stats.t0) / 1000) : 0 // 1초 미만은 1초로 쳐요
  return (
    <div className="fw-col">
      <div className="fw-screen">
        {open ? <Profile key={open} userId={7} fixed={fixed} stats={stats} /> : <p className="fw-empty">‘프로필 열기’를 눌러 보세요</p>}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={start}>{open ? '다시 열기' : '프로필 열기'}</button>
        {stats.stopped && <span className="fw-stop">{LOOP_CAP}번에서 강제로 멈췄어요</span>}
      </div>
      <div className="dv-meters">
        <Meter label="effect 실행" value={`${stats.runs}번`} bad={open ? stats.runs > 2 : undefined} />
        <Meter label="API 응답 받음" value={`${stats.done}번`} bad={open ? stats.done > 1 : undefined} />
        <Meter label="초당 호출" value={open && sec ? (stats.runs / sec).toFixed(1) : '—'} bad={open ? stats.runs / sec > 2 : undefined} />
      </div>
    </div>
  )
}

/* ---------- 02 watchEffect 깊은 추적 (Vue 원리로 만든 작은 반응형 엔진) ---------- */
type Eff = { deps: Set<string>; run: () => void }
function createReactivity(onTrack: () => void) {
  const subs = new Map<string, Set<Eff>>()
  let active: Eff | null = null
  let queued = new Set<Eff>()
  const cache = new WeakMap<object, object>()
  const track = (p: string) => {
    if (!active) return
    active.deps.add(p)
    let s = subs.get(p); if (!s) subs.set(p, s = new Set())
    s.add(active)
  }
  let lastTrigger = ''
  const trigger = (p: string) => {
    lastTrigger = p
    const s = subs.get(p); if (!s) return
    s.forEach(e => { if (e !== active) queued.add(e) }) // 실행 중인 자기 자신은 다시 깨우지 않아요 (Vue와 같아요)
    queueMicrotask(() => { const q = queued; queued = new Set(); q.forEach(e => e.run()) })
  }
  const wrap = <T extends object>(obj: T, path: string): T => {
    const hit = cache.get(obj); if (hit) return hit as T
    const px = new Proxy(obj, {
      get(t, k, r) {
        const v = Reflect.get(t, k, r)
        if (typeof k !== 'string' || !(Object.hasOwn(t, k))) return v
        const p = path ? path + '.' + k : k
        track(p)
        return v && typeof v === 'object' ? wrap(v, p) : v
      },
      set(t, k, v, r) {
        const ok = Reflect.set(t, k, v, r)
        if (typeof k === 'string') trigger(path ? path + '.' + k : k)
        return ok
      },
    })
    cache.set(obj, px)
    return px
  }
  const watchEffect = (fn: () => void) => {
    const e: Eff = {
      deps: new Set(),
      run() {
        e.deps.forEach(p => subs.get(p)?.delete(e)); e.deps.clear() // 실행할 때마다 의존성을 새로 모아요
        const prev = active; active = e
        try { fn() } finally { active = prev }
        onTrack()
      },
    }
    e.run()
    return e
  }
  return { reactive: <T extends object>(o: T) => wrap(o, 'form'), watchEffect, last: () => lastTrigger }
}
const WORDS = ['니트', '패딩', '머플러', '부츠', '장갑']
type SearchForm = { form: { keyword: string; page: number; result: { total: number; items: string[] } | null } }
export function WatchDeepDemo({ fixed }: { fixed: boolean }) {
  const [, force] = useState(0)
  const [open, setOpen] = useState(false)
  const timers = useDemoTimers()
  const [eng] = useState<{ current: { state: SearchForm; eff: Eff; runs: number; api: number; stopped: boolean; last: () => string; result: string } | null }>(() => ({ current: null }))
  const CAP = 30
  const mount = () => {
    timers.clear()
    const R = createReactivity(() => force(x => x + 1))
    const state = { form: R.reactive<SearchForm['form']>({ keyword: '니트', page: 1, result: null }) }
    const box = { state, eff: null as unknown as Eff, runs: 0, api: 0, stopped: false, last: R.last, result: '' }
    eng.current = box
    const search = (k: string, p: number) => ({ total: 20 + k.length * 7 + p, items: [k + ' A', k + ' B', k + ' C'] })
    if (!fixed) {
      // ✕ watchEffect(async () => { const body = JSON.stringify(form); form.result = await search(body) })
      box.eff = R.watchEffect(() => {
        const body = JSON.stringify(state.form) // 깊게 읽어요 → form.result 까지 추적돼요
        if (box.runs >= CAP) { box.stopped = true; return } // 데모 안전장치: 더는 요청하지 않아요
        box.runs++
        const { keyword, page } = JSON.parse(body) as SearchForm['form']
        box.api++
        timers.later(() => { state.form.result = search(keyword, page) }, 120) // await 뒤에 쓰기 → 방금 읽은 값을 바꿔요
      })
    } else {
      // ✓ watch(() => [form.keyword, form.page], async ([k, p]) => { result.value = await search(k, p) })
      box.eff = R.watchEffect(() => {
        box.runs++
        const k = state.form.keyword, p = state.form.page // 필요한 두 값만 읽어요
        box.api++
        timers.later(() => { const r = search(k, p); box.result = `${r.total}개`; force(x => x + 1) }, 120) // 결과는 따로 둔 ref에
      })
    }
    setOpen(true)
  }
  const b = eng.current
  const change = () => { if (!b) return; const i = (WORDS.indexOf(b.state.form.keyword) + 1) % WORDS.length; b.runs = 0; b.api = 0; b.stopped = false; b.state.form.keyword = WORDS[i] }
  const page = () => { if (!b) return; b.runs = 0; b.api = 0; b.stopped = false; b.state.form.page++ }
  const deps = b ? [...b.eff.deps] : []
  const last = b?.last() ?? ''
  const res = b ? (fixed ? b.result : (() => { const r = b.state.form.result; return r ? `${r.total}개` : '' })()) : ''
  return (
    <div className="fw-col">
      {!open ? (
        <div className="fw-screen"><p className="fw-empty">검색 화면을 열면 <code>watchEffect</code>가 바로 한 번 실행돼요</p></div>
      ) : (
        <div className="fw-screen fw-vue">
          <div className="fw-search"><span>🔎 {b?.state.form.keyword}</span><small>{b?.state.form.page}페이지 · 결과 {res || '…'}</small></div>
          <div className="fw-deps-h">이 감시 함수가 추적하는 값</div>
          <div className="fw-deps">{deps.map(d => <code key={d} className={(d === last ? 'hot ' : '') + (d.startsWith('form.result') ? 'self' : '')}>{d}</code>)}</div>
        </div>
      )}
      <div className="dv-row">
        {!open ? <button type="button" className="btn sm" onClick={mount}>검색 화면 열기</button> : <>
          <button type="button" className="btn sm" onClick={change}>검색어 바꾸기</button>
          <button type="button" className="btn sm ghost" onClick={page}>다음 페이지</button>
        </>}
        {b?.stopped && <span className="fw-stop">{CAP}번에서 강제로 멈췄어요</span>}
      </div>
      <div className="dv-meters">
        <Meter label="감시 함수 실행" value={b ? `${b.runs}번` : '—'} bad={b ? b.runs > 1 : undefined} />
        <Meter label="검색 API 요청" value={b ? `${b.api}번` : '—'} bad={b ? b.api > 1 : undefined} />
        <Meter label="추적 중인 값" value={b ? `${deps.length}개` : '—'} bad={b ? deps.length > 2 : undefined} />
      </div>
      <p className="dv-log">주황 칩은 감시 함수가 <b>스스로 바꾸는 값</b>이에요. 이게 추적 목록에 있으면 끝없이 다시 돌아요.</p>
    </div>
  )
}

/* ---------- 03 Zone.js 변경 감지 과다 (시뮬레이션) ---------- */
const CMPS = 24
const PUSH_BRANCH = [0, 1, 2] // OnPush라도 ‘맨 위로’ 버튼이 있는 가지는 다시 확인해요
export function ZoneDemo({ fixed }: { fixed: boolean }) {
  const [m, setM] = useState({ cd: 0, checked: 0, events: 0, hot: [] as number[] })
  const acc = useRef({ cd: 0, checked: 0, events: 0, hot: new Set<number>() })
  const raf = useRef(0)
  const box = useRef<HTMLDivElement>(null)
  const clock = useRef<HTMLElement>(null)
  const above = useRef(false)
  const [showTop, setShowTop] = useState(false)
  const flush = () => {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const a = acc.current
      setM({ cd: a.cd, checked: a.checked, events: a.events, hot: [...a.hot] })
      a.hot.clear()
    })
  }
  // 앱 전체 변경 감지 한 바퀴 (Default 전략: 모든 컴포넌트를 확인)
  const tickAll = () => { const a = acc.current; a.cd++; a.checked += CMPS; for (let i = 0; i < CMPS; i++) a.hot.add(i) }
  const tickBranch = () => { const a = acc.current; a.cd++; a.checked += PUSH_BRANCH.length; PUSH_BRANCH.forEach(i => a.hot.add(i)) }

  // 서드파티 시계 위젯: 0.25초마다 setInterval (화면에 보일 때만)
  useEffect(() => {
    let id = 0
    const io = new IntersectionObserver(([e]) => {
      clearInterval(id)
      if (!e.isIntersecting) return
      id = window.setInterval(() => {
        acc.current.events++
        if (clock.current) clock.current.textContent = new Date().toLocaleTimeString('ko-KR')
        if (!fixed) tickAll() // ✕ Zone 안에서 돈 타이머 → 끝날 때마다 앱 전체 변경 감지
        flush()
      }, 250)
    })
    if (box.current) io.observe(box.current)
    return () => { clearInterval(id); io.disconnect(); cancelAnimationFrame(raf.current); raf.current = 0 }
  }, [fixed])
  const onScroll = () => {
    acc.current.events++
    const y = box.current?.scrollTop ?? 0
    const nowAbove = y > 160
    if (!fixed) { tickAll(); if (nowAbove !== above.current) { above.current = nowAbove; setShowTop(nowAbove) } }
    else if (nowAbove !== above.current) { above.current = nowAbove; tickBranch(); setShowTop(nowAbove) } // ✓ 바뀔 때만 zone.run()
    flush()
  }
  const auto = () => {
    const el = box.current; if (!el) return
    const st = performance.now(), max = el.scrollHeight - el.clientHeight
    const step = () => {
      const p = Math.min(1, (performance.now() - st) / 2400)
      el.scrollTop = Math.sin(p * Math.PI) * max
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  const reset = () => { acc.current = { cd: 0, checked: 0, events: 0, hot: new Set() }; flush() }
  return (
    <div className="fw-col">
      <div className="fw-zone">
        <div className="fw-zbox" ref={box} onScroll={onScroll} tabIndex={0} aria-label="상품 목록 (스크롤해 보세요)">
          <div className="fw-zclock">시계 위젯 <b ref={clock}>—</b></div>
          {Array.from({ length: 30 }, (_, i) => <div className="fw-zrow" key={i}>상품 {i + 1}</div>)}
          {showTop && <span className="fw-ztop">↑ 맨 위로</span>}
        </div>
        <div className="fw-tree" aria-label="컴포넌트 트리">
          {Array.from({ length: CMPS }, (_, i) => <span key={i} className={(m.hot.includes(i) ? 'hot' : '') + (fixed && !PUSH_BRANCH.includes(i) ? ' push' : '')} />)}
          <small>컴포넌트 {CMPS}개 · 확인하면 번쩍여요</small>
        </div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={auto}>자동 스크롤</button>
        <button type="button" className="btn sm ghost" onClick={reset}>숫자 초기화</button>
      </div>
      <div className="dv-meters">
        <Meter label="이벤트 (스크롤·타이머)" value={fmt(m.events)} />
        <Meter label="변경 감지 실행" value={fmt(m.cd)} bad={m.events ? m.cd > 3 : undefined} />
        <Meter label="확인한 컴포넌트" value={fmt(m.checked)} bad={m.events ? m.checked > 30 : undefined} />
      </div>
      <p className="dv-log">{fixed ? <>스크롤·타이머는 <b>Zone 밖</b>에서 돌고, ‘맨 위로’가 바뀔 때만 OnPush 가지를 확인해요</> : <>가만히 있어도 시계 타이머 때문에 <b>앱 전체</b>를 계속 확인해요</>}</p>
    </div>
  )
}

/* ---------- 04 SSR Hydration Mismatch (실제 renderToString + hydrateRoot) ---------- */
let RENDER_ENV: 'server' | 'client' = 'client' // 데모용: 서버 흉내를 낼 때만 'server'
const noopSub = () => () => {}
type SsrData = { now: number; coupon: string }
function Banner({ fixed, data }: { fixed: boolean; data: SsrData }) {
  const onServer = RENDER_ENV === 'server' // 코드에선 typeof window === 'undefined' 자리
  // 해결: 기기 정보처럼 서버가 모르는 값은 hydration 이 끝난 뒤에 읽어요
  const device = useSyncExternalStore(noopSub, () => (innerWidth < 640 ? '모바일' : 'PC'), () => null)
  let when: string, coupon: string, who: string
  if (!fixed) {
    // ✕ 서버(UTC · en-US)와 브라우저(서울 · ko-KR)가 다르게 계산해요
    // oxlint-disable-next-line react/purity -- 일부러 렌더 중에 시간을 읽어요 (문제 재현)
    when = new Date().toLocaleTimeString(onServer ? 'en-US' : 'ko-KR', { timeZone: onServer ? 'UTC' : 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    // oxlint-disable-next-line react/purity -- 일부러 렌더 중에 난수를 만들어요 (문제 재현)
    coupon = Math.random().toString(36).slice(2, 8).toUpperCase() // ✕ 부를 때마다 달라요
    who = onServer ? '웹' : innerWidth < 640 ? '모바일' : 'PC' // ✕ 서버/브라우저 분기
  } else {
    // ✓ 서버가 정한 값(data)을 그대로 쓰고, 시간대·언어를 고정해요
    when = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(data.now)
    coupon = data.coupon
    who = device ?? '…'
  }
  return (
    <div className="fw-ssr-card">
      <div><small>오늘의 특가 마감</small><b data-k="1">{when}</b></div>
      <div><small>내 쿠폰 번호</small><b data-k="2">{coupon}</b></div>
      <div><small>접속 기기</small><b data-k="3">{who}</b></div>
    </div>
  )
}
export function HydrationDemo({ fixed }: { fixed: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const root = useRef<Root | null>(null)
  const timers = useDemoTimers()
  const [phase, setPhase] = useState<'idle' | 'html' | 'done'>('idle')
  const [serverHtml, setServerHtml] = useState('')
  const [res, setRes] = useState<{ errors: string[]; changed: number; reused: boolean } | null>(null)
  const drop = () => { const r = root.current; root.current = null; if (r) setTimeout(() => r.unmount(), 0) }
  useEffect(() => () => drop(), [])
  const play = () => {
    timers.clear(); drop(); setRes(null)
    const el = host.current; if (!el) return
    const data: SsrData = { now: Date.now(), coupon: 'K7Q2ZP' } // 서버가 정해서 HTML과 함께 보내는 값
    RENDER_ENV = 'server'
    let html = ''
    try { html = renderToString(<Banner fixed={fixed} data={data} />) } finally { RENDER_ENV = 'client' }
    el.innerHTML = html // 브라우저가 받은 서버 HTML (JS 실행 전)
    setServerHtml(html); setPhase('html')
    timers.later(() => {
      const first = el.firstElementChild
      const before = [...el.querySelectorAll('[data-k]')].map(n => n.textContent)
      const errors: string[] = []
      root.current = hydrateRoot(el, <Banner fixed={fixed} data={data} />, {
        onRecoverableError: e => errors.push(String((e as Error)?.message ?? e).split('\n')[0].replace(/ This can happen.*$/, '')),
      })
      timers.later(() => {
        const after = [...el.querySelectorAll('[data-k]')].map(n => n.textContent)
        setRes({ errors, changed: after.filter((t, i) => t !== before[i]).length, reused: !!first && el.contains(first) })
        setPhase('done')
      }, 250)
    }, 900)
  }
  return (
    <div className="fw-col">
      <div className="fw-ssr">
        <div>
          <div className="fw-cap">① 서버가 보낸 HTML</div>
          {/* 우리가 방금 만든 HTML이에요 (외부 입력 아님) */}
          <div className="fw-ssr-frame ghost" dangerouslySetInnerHTML={{ __html: serverHtml || '<p class="fw-empty">아직 없어요</p>' }} />
        </div>
        <div>
          <div className="fw-cap">② 브라우저 화면 {phase === 'html' ? '(JS 실행 전)' : phase === 'done' ? '(hydration 뒤)' : ''}</div>
          <div className={'fw-ssr-frame' + (phase === 'done' && res && res.errors.length ? ' redo' : '')} ref={host} />
        </div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={play}>새로고침 재생</button>
        {phase === 'html' && <span className="dv-log">서버 HTML을 보여주는 중… 곧 JS가 붙어요</span>}
      </div>
      {res && fixed && <p className="dv-log">서버 HTML을 그대로 썼어요. ‘접속 기기’ 칸만 hydration이 끝난 뒤 <b>일부러</b> 채워요.</p>}
      {res && res.errors.length > 0 && <pre className="fw-console allow-select">{res.errors.map(e => '✕ ' + e).join('\n')}</pre>}
      <div className="dv-meters">
        <Meter label="Hydration 에러" value={res ? `${res.errors.length}개` : '—'} bad={res ? res.errors.length > 0 : undefined} />
        <Meter label="서버 HTML" value={res ? (res.reused ? '그대로 재사용' : '버리고 다시 그림') : '—'} bad={res ? !res.reused : undefined} />
        <Meter label="글자가 바뀐 칸" value={res ? `${res.changed}칸` : '—'} bad={res ? res.changed > (fixed ? 1 : 0) : undefined} />
      </div>
    </div>
  )
}

/* ---------- 05 Mixin 남용과 이름 충돌 (Vue 3 병합 규칙 그대로) ---------- */
type Opt = { name: string; file: string; data?: Record<string, unknown>; methods?: Record<string, (v: number) => string>; created?: string }
const MIX: Record<string, Opt> = {
  currency: { name: 'currencyMixin', file: 'mixins/currency.js', data: { loading: false }, methods: { format: v => '₩' + v.toLocaleString('ko-KR') }, created: '환율 불러오기' },
  date: { name: 'dateMixin', file: 'mixins/date.js', data: { loading: true, locale: 'ko' }, methods: { format: v => new Date(v).toLocaleDateString('ko-KR') }, created: '달력 준비' },
  track: { name: 'trackingMixin', file: 'mixins/tracking.js', data: { page: 'price' }, methods: { send: () => 'sent' }, created: '조회 로그 전송' },
}
const SELF: Opt = { name: 'PriceCard.vue', file: 'PriceCard.vue', data: { price: 12000 } }
/** Vue 3 mergeOptions 규칙: 나중 것이 이겨요 (data는 얕게, methods는 덮어쓰기, 훅은 모두 실행) */
function mergeVue(list: Opt[]) {
  const owners: Record<string, string[]> = {}
  const methods: Record<string, (v: number) => string> = {}
  const hooks: string[] = []
  for (const o of list) {
    for (const k of Object.keys(o.data ?? {})) (owners[k] ??= []).push(o.name)
    for (const [k, f] of Object.entries(o.methods ?? {})) { (owners[k] ??= []).push(o.name); methods[k] = f }
    if (o.created) hooks.push(`${o.name}: ${o.created}`)
  }
  return { owners, methods, hooks }
}
export function MixinDemo({ fixed }: { fixed: boolean }) {
  const [order, setOrder] = useState<'cd' | 'dc'>('cd')
  const mixins = order === 'cd' ? [MIX.currency, MIX.date, MIX.track] : [MIX.date, MIX.currency, MIX.track]
  const { owners, methods, hooks } = mergeVue([...mixins, SELF])
  const price = 12000
  const shown = fixed ? '₩' + price.toLocaleString('ko-KR') : methods.format(price)
  const rows: [string, string, string[]][] = fixed
    ? [['price', 'PriceCard.vue (ref)', []], ['formatPrice', "useCurrency() ← 'composables/currency'", []], ['formatDate', "useDate() ← 'composables/date'", []], ['loading', 'useCurrency().loading', []], ['track', "useTracking() ← 'composables/tracking'", []]]
    : Object.entries(owners).map(([k, who]) => [k, who[who.length - 1], who.slice(0, -1)])
  const clash = rows.filter(r => r[2].length > 0).length
  const hidden = fixed ? 0 : rows.filter(r => r[1] !== SELF.name).length
  return (
    <div className="fw-col">
      {!fixed && (
        <div className="dv-row">
          <span className="dv-log">mixins 순서</span>
          <Seg value={order} onChange={setOrder} options={[['cd', '[currency, date, tracking]'], ['dc', '[date, currency, tracking]']]} className="fw-seg" />
        </div>
      )}
      <div className="fw-price">
        <small>PriceCard 화면 · <code>{fixed ? '{{ formatPrice(price) }}' : '{{ format(price) }}'}</code></small>
        <b className={shown.startsWith('₩') ? 'ok' : 'bad'}>{shown}</b>
      </div>
      <div className="fw-inspect" role="table" aria-label="this 에 들어온 값과 출처">
        <div className="fw-irow head" role="row"><span>{fixed ? '쓰는 이름' : 'this.○○'}</span><span>어디서 왔나</span></div>
        {rows.map(([k, from, lost]) => (
          <div key={k} className={'fw-irow' + (lost.length ? ' clash' : '')} role="row">
            <code>{k}</code>
            <span>{from}{lost.length > 0 && <em> ← {lost.join(', ')} 것을 덮어씀</em>}</span>
          </div>
        ))}
      </div>
      {!fixed && <p className="dv-log">created 훅은 덮어쓰지 않고 <b>모두</b> 실행돼요: {hooks.join(' → ')}</p>}
      <div className="dv-meters">
        <Meter label="이름 충돌" value={`${clash}개`} bad={clash > 0} />
        <Meter label="파일을 열어야 출처를 아는 값" value={`${hidden}개`} bad={hidden > 0} />
        <Meter label="가격 표시" value={shown.startsWith('₩') ? '맞음' : '틀림'} bad={!shown.startsWith('₩')} />
      </div>
    </div>
  )
}

/* ---------- 06 모듈 순환 참조 (ES 모듈 실행 순서 시뮬레이터) ---------- */
type Exp = { name: string; reads?: [string, string] }
type Mod = { id: string; imports: string[]; exports: Exp[] }
const MODS_BAD: Mod[] = [
  { id: 'auth.service', imports: ['user.service'], exports: [{ name: 'ROLES' }, { name: 'AuthService' }] },
  { id: 'user.service', imports: ['auth.service'], exports: [{ name: 'DEFAULT_ROLE', reads: ['auth.service', 'ROLES'] }, { name: 'UserService' }] },
]
const MODS_GOOD: Mod[] = [
  { id: 'roles', imports: [], exports: [{ name: 'ROLES' }] },
  { id: 'auth.service', imports: ['user.service', 'roles'], exports: [{ name: 'AuthService' }] },
  { id: 'user.service', imports: ['roles'], exports: [{ name: 'DEFAULT_ROLE', reads: ['roles', 'ROLES'] }, { name: 'UserService' }] },
]
type Step = { text: string; tone?: 'bad' | 'skip' | 'ok'; mod: string }
function evaluate(mods: Mod[], entry: string[]) {
  const by = Object.fromEntries(mods.map(m => [m.id, m]))
  const status: Record<string, 'evaluating' | 'done'> = {}
  const ready = new Set<string>()
  const steps: Step[] = []
  let undef = 0
  const run = (id: string, from: string) => {
    if (status[id] === 'done') { steps.push({ mod: id, text: `${from} → ${id}: 이미 실행 끝, 그대로 써요`, tone: 'skip' }); return }
    if (status[id] === 'evaluating') { steps.push({ mod: id, text: `${from} → ${id}: 아직 실행 중이라 건너뛰어요 (값이 비어 있어요)`, tone: 'skip' }); return }
    status[id] = 'evaluating'
    steps.push({ mod: id, text: `${id}.ts 실행 시작` })
    for (const d of by[id].imports) run(d, id)
    for (const e of by[id].exports) {
      if (e.reads) {
        const [m, n] = e.reads
        if (!ready.has(m + '.' + n)) { undef++; steps.push({ mod: id, text: `${e.name} = ${n}.guest → ${n}가 아직 비어 있어요 (undefined) 💥`, tone: 'bad' }) }
        else steps.push({ mod: id, text: `${e.name} = ${n}.guest → '손님'`, tone: 'ok' })
      }
      ready.add(id + '.' + e.name)
    }
    status[id] = 'done'
    steps.push({ mod: id, text: `${id}.ts 실행 끝` })
  }
  for (const e of entry) run(e, 'main')
  return { steps, undef }
}
function countCycles(mods: Mod[]) {
  let n = 0
  const seen = new Set<string>(), stack = new Set<string>()
  const by = Object.fromEntries(mods.map(m => [m.id, m]))
  const dfs = (id: string) => { seen.add(id); stack.add(id); for (const d of by[id].imports) { if (stack.has(d)) n++; else if (!seen.has(d)) dfs(d) } stack.delete(id) }
  mods.forEach(m => { if (!seen.has(m.id)) dfs(m.id) })
  return n
}
export function CircularDemo({ fixed }: { fixed: boolean }) {
  const [entry, setEntry] = useState<'old' | 'new'>('old')
  const [shown, setShown] = useState(-1)
  const timers = useDemoTimers()
  const mods = fixed ? MODS_GOOD : MODS_BAD
  // 처음엔 user.service를 먼저 불러와요. 새 가드가 main 맨 위에서 auth.service를 import 하면 순서가 바뀌어요.
  const order = entry === 'old' ? ['user.service', 'auth.service'] : ['auth.service', 'user.service']
  const { steps, undef } = evaluate(mods, order)
  const cycles = countCycles(mods)
  const play = () => { timers.clear(); setShown(0); steps.forEach((_, i) => timers.later(() => setShown(i + 1), 260 * (i + 1))) }
  const done = shown >= steps.length
  const cur = steps[Math.max(0, Math.min(shown, steps.length) - 1)]?.mod
  // 200 × 100 좌표 (그래프 상자 비율과 같아요)
  const pos: Record<string, [number, number]> = fixed
    ? { main: [100, 14], 'auth.service': [40, 50], 'user.service': [160, 50], roles: [100, 86] }
    : { main: [100, 16], 'auth.service': [40, 76], 'user.service': [160, 76] }
  const edges: [string, string, boolean][] = [
    ...order.map((o): [string, string, boolean] => ['main', o, false]),
    ...mods.flatMap(m => m.imports.map((d): [string, string, boolean] => [m.id, d, mods.find(x => x.id === d)!.imports.includes(m.id)])),
  ]
  const cut = (a: [number, number], b: [number, number], f: number): [number, number] => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
  return (
    <div className="fw-col">
      <div className="dv-row">
        <span className="dv-log">main.ts</span>
        <Seg value={entry} onChange={v => { setEntry(v); setShown(-1) }} options={[['old', '처음 (user 먼저)'], ['new', '가드 추가 뒤 (auth 먼저)']]} className="fw-seg" />
      </div>
      <div className="fw-graph">
        <svg viewBox="0 0 200 100" aria-hidden="true">
          <defs>
            <marker id="fw-arr" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L6,3 L0,6 z" className="fw-arr" /></marker>
            <marker id="fw-arr-c" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L6,3 L0,6 z" className="fw-arr cyc" /></marker>
          </defs>
          {edges.map(([a, b, cyc], i) => {
            const [x1, y1] = cut(pos[a], pos[b], 0.2), [x2, y2] = cut(pos[a], pos[b], 0.8)
            const bend = cyc ? (a < b ? -24 : 24) : 0
            return <path key={i} className={cyc ? 'cyc' : ''} d={`M${x1},${y1 + bend / 3} Q${(x1 + x2) / 2},${(y1 + y2) / 2 + bend} ${x2},${y2 + bend / 3}`} markerEnd={cyc ? 'url(#fw-arr-c)' : 'url(#fw-arr)'} />
          })}
        </svg>
        {Object.entries(pos).map(([id, [x, y]]) => (
          <span key={id} className={'fw-node' + (cur === id && shown > 0 && !done ? ' on' : '')} style={{ left: x / 2 + '%', top: y + '%' }}>{id}.ts</span>
        ))}
      </div>
      <ol className="fw-steps">
        {steps.slice(0, Math.max(0, shown)).map((s, i) => <li key={i} className={s.tone ?? ''}>{s.text}</li>)}
      </ol>
      <div className="dv-row"><button type="button" className="btn sm" onClick={play}>앱 실행해 보기</button></div>
      <div className="dv-meters">
        <Meter label="순환 고리" value={`${cycles}개`} bad={cycles > 0} />
        <Meter label="import 시점 undefined" value={done ? `${undef}번` : '—'} bad={done ? undef > 0 : undefined} />
        <Meter label="앱 시작" value={done ? (undef ? '에러로 멈춤' : '정상') : '—'} bad={done ? undef > 0 : undefined} />
      </div>
    </div>
  )
}

/* ---------- 07 key에 index (실제 React) ---------- */
const FRUITS = [{ id: 11, name: '사과' }, { id: 12, name: '바나나' }, { id: 13, name: '체리' }, { id: 14, name: '포도' }]
export function KeyIndexDemo({ fixed }: { fixed: boolean }) {
  const [items, setItems] = useState(FRUITS)
  const [round, setRound] = useState(0)
  const [tick, setTick] = useState(0)
  const [filled, setFilled] = useState<string[]>([])
  const list = useRef<HTMLUListElement>(null)
  const [m, setM] = useState({ wrong: 0, lost: 0 })
  useLayoutEffect(() => {
    const rows = [...(list.current?.querySelectorAll('li') ?? [])]
    const vals = rows.map(r => ({ name: r.dataset.name!, v: (r.querySelector('input') as HTMLInputElement).value }))
    const wrong = vals.filter(x => x.v && !x.v.startsWith(x.name)).length
    const alive = items.map(i => i.name).filter(n => filled.includes(n))
    const lost = alive.filter(n => !vals.some(x => x.v.startsWith(n))).length
    setM({ wrong, lost })
  }, [items, filled, round, tick])
  const fill = () => {
    list.current?.querySelectorAll('li').forEach(r => { (r.querySelector('input') as HTMLInputElement).value = r.dataset.name + ' 메모' })
    setFilled(items.map(i => i.name))
  }
  const reset = () => { setItems(FRUITS); setFilled([]); setRound(r => r + 1) }
  return (
    <div className="fw-col">
      <ul className="fw-keys" ref={list} key={round}>
        {items.map((it, i) => (
          // 문제 모드는 일부러 index를 key로 써요
          <li key={fixed ? it.id : i} data-name={it.name}>
            <b>{it.name}</b>
            <input defaultValue="" placeholder="메모 (비제어 입력)" aria-label={it.name + ' 메모'} onChange={() => setTick(t => t + 1)} />
            <button type="button" className="btn sm ghost" onClick={() => setItems(xs => xs.filter(x => x.id !== it.id))} aria-label={it.name + ' 삭제'}>삭제</button>
          </li>
        ))}
      </ul>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={fill}>메모 채우기</button>
        <button type="button" className="btn sm ghost" onClick={() => setItems(xs => xs.slice(1))} disabled={!items.length}>맨 위 줄 삭제</button>
        <button type="button" className="btn sm ghost" onClick={reset}>처음으로</button>
      </div>
      <div className="dv-meters">
        <Meter label="이름과 메모가 어긋난 줄" value={`${m.wrong}줄`} bad={m.wrong > 0} />
        <Meter label="사라진 메모" value={`${m.lost}개`} bad={m.lost > 0} />
      </div>
      <p className="dv-log">‘메모 채우기’ → ‘맨 위 줄 삭제’ 순서로 눌러 보세요. key: <code>{fixed ? 'item.id' : 'index'}</code></p>
    </div>
  )
}

/* ---------- 08 v-if와 v-show (React로 같은 동작: 조건부 렌더 / display:none) ---------- */
const TABS = ['매출', '방문자', '재고']
const ChartPanel = memo(function ChartPanel({ name, seed }: { name: string; seed: number }) {
  const [bars] = useState(() => { busy(14); return Array.from({ length: 160 }, (_, i) => 20 + ((i * 37 + seed * 53) % 80)) }) // 차트 초기화 비용 흉내 (14ms)
  return (
    <div className="fw-panel">
      <small>{name} 차트</small>
      <div className="fw-bars">{bars.map((h, i) => <span key={i} style={{ height: h + '%' }} />)}</div>
    </div>
  )
})
function RarePanel() {
  return <div className="fw-rare">{Array.from({ length: 600 }, (_, i) => <label key={i}><input type="checkbox" readOnly checked={i % 3 === 0} /><span>옵션 {i + 1}</span></label>)}</div>
}
export function VifDemo({ fixed }: { fixed: boolean }) {
  const [tab, setTab] = useState(0)
  const [rare, setRare] = useState(false)
  const t0 = useRef(0)
  const box = useRef<HTMLDivElement>(null)
  const seen = useRef(new WeakSet<Element>())
  const timers = useDemoTimers()
  const [m, setM] = useState({ ms: 0, mounts: 0, dom: 0, switches: 0 })
  useLayoutEffect(() => {
    const el = box.current; if (!el) return
    let born = 0
    el.querySelectorAll('.fw-panel').forEach(p => { if (!seen.current.has(p)) { seen.current.add(p); born++ } })
    const took = t0.current ? performance.now() - t0.current : 0
    t0.current = 0
    setM(s => ({ ms: took || s.ms, mounts: s.mounts + born, dom: el.querySelectorAll('*').length, switches: s.switches + (took ? 1 : 0) }))
  }, [tab, rare])
  const go = (i: number) => { t0.current = performance.now(); setTab(i) }
  const hop = () => { timers.clear(); for (let k = 1; k <= 10; k++) timers.later(() => go(k % 3), k * 180) }
  // 자주 바뀌는 탭: 문제=v-if(매번 새로) / 해결=v-show(한 번 만들고 숨기기)
  // 거의 안 여는 고급 설정: 문제=v-show(처음부터 다 만들어 숨김) / 해결=v-if(열 때만)
  return (
    <div className="fw-col">
      <div className="dv-row">
        <Seg value={tab} onChange={go} options={TABS.map((t, i) => [i, t] as const)} className="fw-seg" />
        <button type="button" className="btn sm ghost" onClick={hop}>10번 오가기</button>
      </div>
      <div className="fw-vif" ref={box}>
        {fixed
          ? TABS.map((t, i) => <div key={t} style={{ display: tab === i ? undefined : 'none' }}><ChartPanel name={t} seed={i} /></div>)
          : <ChartPanel key={tab} name={TABS[tab]} seed={tab} />}
        <button type="button" className="btn sm ghost fw-rare-btn" onClick={() => { t0.current = 0; setRare(r => !r) }}>고급 설정 {rare ? '닫기' : '열기'} (거의 안 써요)</button>
        {fixed ? rare && <RarePanel /> : <div style={{ display: rare ? undefined : 'none' }}><RarePanel /></div>}
      </div>
      <div className="dv-meters">
        <Meter label="마지막 탭 전환" value={m.switches ? `${m.ms.toFixed(1)}ms` : '—'} bad={m.switches ? m.ms > 8 : undefined} />
        <Meter label="차트를 새로 만든 횟수" value={`${m.mounts}번`} bad={m.switches ? m.mounts > 3 : undefined} />
        <Meter label="지금 DOM 요소" value={fmt(m.dom)} bad={!rare ? m.dom > 1200 : undefined} />
      </div>
      <p className="dv-log"><code>{fixed ? '탭: v-show · 고급 설정: v-if' : '탭: v-if · 고급 설정: v-show'}</code></p>
    </div>
  )
}

/* ---------- 09 너무 깊은 HOC (실제 React 컴포넌트) ---------- */
type CardProps = { title: string; likes: number; tone?: string; user?: string; track?: string }
const renders = { n: 0, clash: [] as string[] }
type AnyC = ComponentType<CardProps> & { inner?: AnyC }
// 흔한 HOC 모양 그대로: 이름 없는 화살표 함수를 돌려줘요 → DevTools엔 Anonymous
const hoc = (inject: Partial<CardProps>) => (C: AnyC): AnyC => Object.assign((props: CardProps) => {
  useEffect(() => { renders.n++ })
  for (const k of Object.keys(inject)) if (k in props && !renders.clash.includes(k)) renders.clash.push(k)
  return <C {...props} {...inject} />
}, { inner: C })
const withRouter = hoc({}), withTheme = hoc({ tone: 'dark' }), withAuth = hoc({ user: '김하늘' })
const withTracking = hoc({ title: 'profile_page' }) // ✕ 분석용 이름을 title로 넣다가 원래 title을 덮어써요
const withErrorBoundary = hoc({}), connect = hoc({})
function ProfileCard({ title, likes, tone, user }: CardProps) {
  useEffect(() => { renders.n++ })
  return <div className={'fw-card' + (tone === 'dark' ? ' dark' : '')}><b>{title}</b><small>{user ?? '—'} · 좋아요 {likes}</small></div>
}
const Wrapped = withRouter(withTheme(withAuth(withTracking(withErrorBoundary(connect(ProfileCard))))))
const nameOf = (c: AnyC) => c.displayName || c.name || 'Anonymous'
function ProfileCardHooks({ title, likes }: CardProps) {
  useEffect(() => { renders.n++ })
  const tone = 'dark', user = '김하늘' // useTheme(), useAuth() 같은 훅에서 꺼냈다고 생각해요
  return <div className={'fw-card' + (tone === 'dark' ? ' dark' : '')}><b>{title}</b><small>{user} · 좋아요 {likes}</small></div>
}
export function HocDemo({ fixed }: { fixed: boolean }) {
  const [likes, setLikes] = useState(0)
  const [m, setM] = useState({ last: 0, clash: [] as string[] })
  const timers = useDemoTimers()
  useState(() => { renders.n = 0; renders.clash = [] }) // 처음 그리기 전에 집계를 비워요
  useEffect(() => { timers.later(() => setM({ last: 0, clash: [...renders.clash] }), 0) }, [timers])
  // 클릭 → 렌더 → effect 가 모두 끝난 뒤(다음 틱)에 센 값을 읽어요
  const like = () => { renders.n = 0; setLikes(n => n + 1); timers.later(() => setM({ last: renders.n, clash: [...renders.clash] }), 0) }
  const chain: string[] = []
  if (fixed) chain.push('ProfileCard')
  else { let c: AnyC | undefined = Wrapped; while (c) { chain.push(nameOf(c)); c = c.inner } }
  const Comp = fixed ? ProfileCardHooks : Wrapped
  return (
    <div className="fw-col">
      <div className="fw-hoc">
        <div className="fw-devtree" aria-label="React DevTools 컴포넌트 트리">
          <div className="fw-cap">Components</div>
          {chain.map((n, i) => <div key={i} style={{ paddingLeft: 8 + i * 10 }} className={n === 'Anonymous' ? 'anon' : 'real'}>{'<'}{n}{'>'}</div>)}
        </div>
        <Comp title="김하늘 님의 프로필" likes={likes} />
      </div>
      <div className="dv-row"><button type="button" className="btn sm" onClick={like}>좋아요 +1</button></div>
      <div className="dv-meters">
        <Meter label="진짜 컴포넌트까지 깊이" value={`${chain.length}단계`} bad={chain.length > 2} />
        <Meter label="좋아요 1번에 렌더" value={m.last ? `${m.last}개` : '—'} bad={m.last ? m.last > 1 : undefined} />
        <Meter label="몰래 덮어쓴 props" value={m.clash.length ? m.clash.join(', ') : '없음'} bad={m.clash.length > 0} />
      </div>
    </div>
  )
}

/* ---------- 10 ngModel 양방향 바인딩 남용 (시뮬레이션) ---------- */
type Log = { text: string; src: string }
export function NgModelDemo({ fixed }: { fixed: boolean }) {
  const [user] = useState({ name: '' }) // ✕ 세 곳이 [(ngModel)]="user.name" 으로 같은 객체를 직접 바꿔요
  const [, force] = useState(0)
  const [logs, setLogs] = useState<Log[]>([])
  const [typing, setTyping] = useState(false)
  const timers = useDemoTimers()
  const saveT = useRef(0)
  const sent = useRef('')
  useEffect(() => () => clearTimeout(saveT.current), [])
  const log = (text: string, src: string) => setLogs(l => [...l.slice(-5), { text, src }])
  const write = (v: string, src: string) => {
    const before = user.name
    user.name = v
    log(fixed ? `setName('${v}')` : `user.name: '${before}' → '${v}'`, fixed ? src : '?')
    force(x => x + 1)
  }
  const autosave = () => {
    clearTimeout(saveT.current)
    saveT.current = window.setTimeout(() => {
      sent.current = user.name
      timers.later(() => { // 서버는 앞뒤 공백을 지워서 돌려줘요
        const saved = sent.current.trim()
        if (!fixed) { if (user.name !== saved) write(saved, '자동 저장 응답') } // ✕ 응답이 입력 중인 값을 덮어써요
        else log(`저장됨 '${saved}' (입력 중인 값은 그대로)`, '자동 저장')
      }, 120)
    }, 300)
  }
  const input = (v: string, src: string) => { write(v, src); autosave() }
  const type = () => {
    timers.clear(); clearTimeout(saveT.current); user.name = ''; setLogs([]); setTyping(true); force(x => x + 1)
    const seq: [string, number][] = [['김', 0], [' ', 200], ['하', 900], ['늘', 1100]] // 공백 뒤에서 잠깐 멈칫해요
    seq.forEach(([ch, at]) => timers.later(() => input(user.name + ch, '프로필 폼'), at))
    timers.later(() => { setTyping(false); if (fixed) write(user.name.trim(), '저장 버튼 (trim)') }, 1700)
  }
  const unknown = logs.filter(l => l.src === '?').length
  return (
    <div className="fw-col">
      <div className="fw-ng">
        <label><span>머리말 인사</span><input value={user.name} onChange={e => input(e.target.value, '머리말 입력')} placeholder="이름" /></label>
        <label><span>프로필 폼</span><input value={user.name} onChange={e => input(e.target.value, '프로필 폼')} placeholder="이름" /></label>
        <p className="fw-ng-hello">안녕하세요, <b>{user.name || '…'}</b> 님</p>
      </div>
      <ol className="fw-steps fw-nglog">
        {logs.map((l, i) => <li key={i} className={l.src === '?' ? 'bad' : 'ok'}><code>{l.text}</code> <em>{l.src === '?' ? '누가 바꿨는지 몰라요' : '← ' + l.src}</em></li>)}
      </ol>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={type} disabled={typing}>‘김 하늘’ 입력해 보기</button>
      </div>
      <div className="dv-meters">
        <Meter label="값을 바꾸는 곳" value={fixed ? '1곳 (store)' : '3곳'} bad={!fixed} />
        <Meter label="출처 모르는 변경" value={`${unknown}번`} bad={unknown > 0} />
        <Meter label="최종 이름" value={typing || !logs.length ? '—' : `'${user.name}'`} bad={typing || !logs.length ? undefined : user.name !== '김 하늘'} />
      </div>
    </div>
  )
}
