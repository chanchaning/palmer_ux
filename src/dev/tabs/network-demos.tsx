/* 04 네트워크 · API — 데모 모음. fixed=false 문제 그대로, true 해결 적용
 * 모든 서버·네트워크는 이 파일 안의 가짜예요. 진짜 주소로는 요청을 보내지 않아요. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Seg } from '../../components/ui'
import { Meter } from '../ui'

const fmt = (n: number) => n.toLocaleString('ko-KR')
const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** 데모 안 타이머 — 언마운트하거나 reset 하면 기다리던 것까지 전부 멈춰요 */
function useSim() {
  const ids = useRef(new Set<number>())
  useEffect(() => {
    const set = ids.current
    return () => { set.forEach(clearTimeout); set.clear() }
  }, [])
  return useMemo(() => ({
    wait(ms: number) {
      return new Promise<void>(res => {
        const id = window.setTimeout(() => { ids.current.delete(id); res() }, ms)
        ids.current.add(id)
      })
    },
    later(fn: () => void, ms: number) {
      const id = window.setTimeout(() => { ids.current.delete(id); fn() }, ms)
      ids.current.add(id)
    },
    reset() { ids.current.forEach(clearTimeout); ids.current.clear() },
  }), [])
}

/* ---------- 요청 기록 ---------- */
type Tone = 'ok' | 'bad' | 'warn' | 'info' | ''
type Line = { id: number; t: number; text: ReactNode; tone: Tone }
function useLog(max = 60) {
  const [lines, setLines] = useState<Line[]>([])
  const t0 = useRef(0)
  const n = useRef(0)
  const add = useCallback((text: ReactNode, tone: Tone = '') => {
    const now = performance.now()
    if (!t0.current) t0.current = now
    const line = { id: n.current++, t: now - t0.current, text, tone }
    setLines(l => [...l.slice(-(max - 1)), line])
  }, [max])
  const clear = useCallback(() => { t0.current = 0; setLines([]) }, [])
  return { lines, add, clear }
}
function NwLog({ lines, empty = '버튼을 누르면 요청 기록이 여기에 쌓여요', h = 150 }: { lines: Line[]; empty?: string; h?: number }) {
  const box = useRef<HTMLOListElement>(null)
  useLayoutEffect(() => { const b = box.current; if (b) b.scrollTop = b.scrollHeight }, [lines])
  return (
    <ol className="nw-log" ref={box} style={{ maxHeight: h }} aria-label="요청 기록" tabIndex={0}>
      {lines.length === 0 && <li className="nw-l nw-empty">{empty}</li>}
      {lines.map(l => (
        <li key={l.id} className={'nw-l ' + l.tone}><time>{(l.t / 1000).toFixed(2)}s</time><span>{l.text}</span></li>
      ))}
    </ol>
  )
}

/* =====================================================================
 * 01 로컬 기기 통신 — Mixed Content · 인증서 · CORS
 * ===================================================================== */
type Try = { req: string; res: ReactNode; ok: boolean }
export function LocalDeviceDemo({ fixed }: { fixed: boolean }) {
  const sim = useSim()
  const [tries, setTries] = useState<Try[]>([])
  const [busy, setBusy] = useState(false)
  const [grams, setGrams] = useState<number | null>(null)
  const [ran, setRan] = useState(0)

  const read = async (origin: 'ours' | 'other') => {
    sim.reset(); setBusy(true); setTries([]); setGrams(null)
    const push = (t: Try) => setTries(l => [...l, t])
    if (!fixed) {
      await sim.wait(380)
      push({ req: "fetch('http://192.168.0.20/weight')", ok: false, res: <><b>Mixed Content 차단</b> · HTTPS 페이지에서 http:// 주소는 보내기 전에 막혀요</> })
      await sim.wait(520)
      push({ req: "fetch('https://192.168.0.20/weight')", ok: false, res: <><b>ERR_CERT_AUTHORITY_INVALID</b> · 저울이 스스로 만든 인증서라 브라우저가 믿지 않아요</> })
      await sim.wait(480)
      push({ req: "new WebSocket('ws://192.168.0.20:81')", ok: false, res: <><b>Mixed Content 차단</b> · ws:// 도 똑같이 막혀요 (wss:// 만 돼요)</> })
    } else {
      const from = origin === 'ours' ? 'https://pos.example' : 'https://other.example'
      await sim.wait(300)
      push({ req: `OPTIONS agent.pos.example:8443 (Origin: ${from})`, ok: origin === 'ours',
        res: origin === 'ours'
          ? <>사전 요청 통과 · <code>Access-Control-Allow-Origin: https://pos.example</code></>
          : <><b>CORS 차단</b> · 에이전트가 허용한 사이트가 아니라 응답을 읽을 수 없어요</> })
      if (origin === 'ours') {
        await sim.wait(260)
        push({ req: 'GET https://agent.pos.example:8443/scale/weight', ok: true, res: <>200 · 믿을 수 있는 인증서라 그대로 통과해요</> })
        await sim.wait(220)
        push({ req: '에이전트 → 저울 (매장 PC 안, 시리얼 연결)', ok: true, res: <>브라우저 밖이라 Mixed Content와 상관없어요 · <b>1,240g</b></> })
        setGrams(1240)
      }
    }
    setRan(r => r + 1); setBusy(false)
  }
  const okN = tries.filter(t => t.ok).length
  return (
    <div className="nw-col">
      <div className="nw-net">
        <div className="nw-node"><small>브라우저</small><b>https://pos.example</b><span>계산대 화면</span></div>
        <div className={'nw-wire' + (fixed ? ' ok' : ' cut')}><i>{fixed ? 'HTTPS · CORS 허용' : '차단'}</i></div>
        {fixed && <>
          <div className="nw-node agent"><small>로컬 에이전트</small><b>agent.pos.example</b><span>127.0.0.1 · 정식 인증서</span></div>
          <div className="nw-wire ok"><i>시리얼</i></div>
        </>}
        <div className="nw-node dev"><small>저울</small><b>192.168.0.20</b><span>http만 열려 있어요</span></div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" disabled={busy} onClick={() => read('ours')}>저울 무게 읽기</button>
        {fixed && <button type="button" className="btn sm ghost" disabled={busy} onClick={() => read('other')}>다른 사이트에서 불러 보기</button>}
      </div>
      <ul className="nw-tries" aria-live="polite">
        {tries.length === 0 && <li className="nw-empty">{ran ? '' : '버튼을 누르면 연결 시도가 차례로 보여요'}</li>}
        {tries.map((t, i) => (
          <li key={i} className={t.ok ? 'ok' : 'bad'}><code>{t.req}</code><span>{t.ok ? '✓ ' : '✕ '}{t.res}</span></li>
        ))}
      </ul>
      <div className="dv-meters">
        <Meter label="성공한 연결" value={tries.length ? `${okN}/${tries.length}` : '—'} bad={tries.length ? okN === 0 : undefined} />
        <Meter label="화면에 뜬 무게" value={grams === null ? '—' : `${fmt(grams)}g`} bad={ran > 0 && !busy ? grams === null : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 02 토큰 갱신 — 동시 401 · 리프레시 토큰 회전
 * ===================================================================== */
const API_PATHS = ['/me', '/orders', '/cart', '/coupons', '/alerts']
type RState = 'idle' | 'sent' | '401' | 'refresh' | 'wait' | 'retry' | 'ok' | 'fail'
const R_LABEL: Record<RState, string> = { idle: '대기', sent: '요청', '401': '401 만료', refresh: '갱신 요청', wait: '갱신 기다림', retry: '재시도', ok: '200 ✓', fail: '실패' }

function makeAuth() {
  // 가짜 인증 서버: 리프레시 토큰은 한 번 쓰면 새 것으로 바뀌어요(회전). 이미 쓴 걸 또 보내면 탈취로 보고 전부 끊어요
  return { access: 'A1', refresh: 'R1', used: new Set<string>(), revoked: false, gen: 1, calls: 0 }
}
type Auth = ReturnType<typeof makeAuth>

export function RefreshDemo({ fixed }: { fixed: boolean }) {
  const sim = useSim()
  const log = useLog()
  const [st, setSt] = useState<RState[]>(API_PATHS.map(() => 'idle'))
  const [calls, setCalls] = useState(0)
  const [session, setSession] = useState<'in' | 'out' | null>(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    sim.reset(); log.clear()
    setSt(API_PATHS.map(() => 'idle')); setCalls(0); setSession(null); setRunning(true)
    const srv: Auth = makeAuth()
    // 브라우저 쪽: 액세스 토큰은 이미 만료(A0), 리프레시 토큰은 R1
    const client = { access: 'A0', refresh: 'R1', loggedOut: false }
    let refreshing: Promise<string | null> | null = null
    const set = (i: number, s: RState) => setSt(a => a.map((x, j) => (j === i ? s : x)))

    const callApi = async (token: string) => { await sim.wait(rand(160, 320)); return !srv.revoked && token === srv.access ? 200 : 401 }
    const callRefresh = async (rt: string) => {
      srv.calls++; setCalls(srv.calls)
      await sim.wait(rand(260, 360))
      if (srv.revoked) return null
      if (srv.used.has(rt)) { srv.revoked = true; log.add(<>서버: 이미 쓴 리프레시 토큰 <b>{rt}</b>이 또 왔어요 → 탈취 의심, <b>모든 토큰 폐기</b></>, 'bad'); return null }
      if (rt !== srv.refresh) return null
      srv.used.add(rt); srv.gen++
      srv.access = 'A' + srv.gen; srv.refresh = 'R' + srv.gen
      log.add(<>서버: {rt} 사용 처리 → 새 토큰 <b>{srv.access}</b> · <b>{srv.refresh}</b></>, 'ok')
      return srv.access
    }
    const logout = () => { if (!client.loggedOut) { client.loggedOut = true; setSession('out'); log.add(<><b>강제 로그아웃</b> · 로그인 화면으로 보내요</>, 'bad') } }

    const one = async (i: number) => {
      await sim.wait(i * 25)
      set(i, 'sent')
      const sentWith = client.access
      const code = await callApi(sentWith)
      if (code === 200) { set(i, 'ok'); return }
      set(i, '401'); log.add(<>{API_PATHS[i]} → 401 (토큰 {sentWith} 만료)</>, 'warn')
      let token: string | null
      if (!fixed) {
        // ✕ 요청마다 각자 갱신 — 모두 같은 R1을 들고 가요
        set(i, 'refresh')
        const rt = client.refresh
        log.add(<>{API_PATHS[i]}: 갱신 요청 보냄 (리프레시 토큰 <b>{rt}</b>)</>)
        token = await callRefresh(rt)
        if (token) { client.access = token; client.refresh = srv.refresh }
      } else if (client.access !== sentWith) {
        token = client.access // 이미 다른 요청이 갱신했어요
      } else {
        // ✓ 갱신은 하나만. 나머지는 같은 약속(Promise)을 기다려요
        if (!refreshing) {
          set(i, 'refresh')
          log.add(<>{API_PATHS[i]}: 갱신 요청 보냄 (리프레시 토큰 <b>{client.refresh}</b>) · 나머지는 줄을 서요</>, 'info')
          refreshing = callRefresh(client.refresh).then(t => {
            if (t) { client.access = t; client.refresh = srv.refresh }
            return t
          }).finally(() => { refreshing = null })
        } else set(i, 'wait')
        token = await refreshing
      }
      if (!token) { set(i, 'fail'); logout(); return }
      set(i, 'retry')
      const again = await callApi(token)
      if (again === 200) { set(i, 'ok'); log.add(<>{API_PATHS[i]} 재시도 → 200</>, 'ok') } else { set(i, 'fail'); logout() }
    }
    await Promise.all(API_PATHS.map((_, i) => one(i)))
    if (!client.loggedOut) setSession('in')
    setRunning(false)
  }
  const okN = st.filter(s => s === 'ok').length
  const done = session !== null
  return (
    <div className="nw-col">
      <div className="dv-row">
        <button type="button" className="btn sm" disabled={running} onClick={run}>토큰 만료 상태로 화면 열기 (요청 5개 동시)</button>
      </div>
      <ul className="nw-reqs">
        {API_PATHS.map((p, i) => (
          <li key={p}><code>GET {p}</code><span className={'nw-chip s-' + st[i]}>{R_LABEL[st[i]]}</span></li>
        ))}
      </ul>
      <div className="dv-meters">
        <Meter label="갱신 요청" value={`${calls}번`} bad={done ? calls > 1 : undefined} />
        <Meter label="성공한 요청" value={`${okN}/5`} bad={done ? okN < 5 : undefined} />
        <Meter label="로그인 상태" value={session === 'out' ? '강제 로그아웃' : session === 'in' ? '유지' : '—'} bad={done ? session === 'out' : undefined} />
      </div>
      <NwLog lines={log.lines} />
    </div>
  )
}

/* =====================================================================
 * 03 재시도 · 대체 UI — 지수 백오프 + 지터
 * ===================================================================== */
type Screen = 'idle' | 'loading' | 'retrying' | 'data' | 'blank' | 'fallback'
const PRODUCTS = ['캠핑 의자', '접이식 테이블', '보온병 750ml', '랜턴', '방수 매트']
export function RetryDemo({ fixed }: { fixed: boolean }) {
  const sim = useSim()
  const log = useLog()
  const [rate, setRate] = useState(60)
  const [screen, setScreen] = useState<Screen>('idle')
  const [attempt, setAttempt] = useState(0)
  const [batch, setBatch] = useState<{ data: number; blank: number; fallback: number; reqs: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const MAX = 3 // 처음 1번 + 재시도 3번

  const request = async () => { await sim.wait(rand(90, 160)); return Math.random() * 100 >= rate }
  /** 화면 하나 열기. quiet=true 면 기록 없이 결과만 */
  const loadOnce = async (quiet: boolean, onReq: () => void): Promise<'data' | 'blank' | 'fallback'> => {
    for (let n = 0; ; n++) {
      if (!quiet) { setAttempt(n + 1); if (n > 0) setScreen('retrying') }
      onReq()
      const ok = await request()
      if (ok) { if (!quiet) log.add(<>{n + 1}번째 요청 → 200</>, 'ok'); return 'data' }
      if (!quiet) log.add(<>{n + 1}번째 요청 → 503</>, 'bad')
      if (!fixed) return 'blank'
      if (n >= MAX) return 'fallback'
      const cap = Math.min(4000, 250 * 2 ** n)
      const wait = Math.round(rand(0, cap)) // full jitter
      if (!quiet) log.add(<>{wait}ms 기다렸다 다시 (최대 {cap}ms 안에서 무작위)</>, 'info')
      await sim.wait(wait)
    }
  }
  const open = async () => {
    sim.reset(); log.clear(); setBatch(null); setBusy(true)
    setScreen('loading'); setAttempt(0)
    const r = await loadOnce(false, () => {})
    setScreen(r); setBusy(false)
  }
  const many = async () => {
    sim.reset(); log.clear(); setBusy(true); setScreen('idle')
    const acc = { data: 0, blank: 0, fallback: 0, reqs: 0 }
    setBatch({ ...acc })
    await Promise.all(Array.from({ length: 20 }, async () => {
      const r = await loadOnce(true, () => { acc.reqs++ })
      acc[r]++
      setBatch({ ...acc })
    }))
    log.add(<>20명이 화면을 열었어요 · 데이터 {acc.data} · 대체 UI {acc.fallback} · 빈 화면 {acc.blank}</>, acc.blank ? 'bad' : 'ok')
    setBusy(false)
  }
  return (
    <div className="nw-col">
      <div className="dv-row">
        <span className="nw-lab">서버 실패율</span>
        <Seg value={rate} onChange={setRate} className="nw-seg" options={[[30, '30%'], [60, '60%'], [90, '90%']]} />
      </div>
      <div className="nw-screen" aria-live="polite">
        <div className="nw-screen-bar">상품 목록</div>
        {screen === 'idle' && <p className="nw-blank-note">‘상품 목록 열기’를 눌러 보세요</p>}
        {screen === 'loading' && <div className="nw-skel"><i /><i /><i /></div>}
        {screen === 'retrying' && <div className="nw-skel"><p className="nw-retry-note">연결이 불안정해서 다시 시도하고 있어요 ({attempt}/{MAX + 1})</p><i /><i /></div>}
        {screen === 'data' && <ul className="nw-plist">{PRODUCTS.map(p => <li key={p}>{p}</li>)}</ul>}
        {screen === 'blank' && <p className="nw-blank-note dim">(아무것도 없는 하얀 화면)</p>}
        {screen === 'fallback' && <>
          <div className="nw-banner warn"><span>최신 목록을 못 불러왔어요 · 3분 전 저장본이에요</span><button type="button" className="btn sm ghost" onClick={open}>다시 시도</button></div>
          <ul className="nw-plist stale">{PRODUCTS.slice(0, 4).map(p => <li key={p}>{p}</li>)}</ul>
        </>}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" disabled={busy} onClick={open}>상품 목록 열기</button>
        <button type="button" className="btn sm ghost" disabled={busy} onClick={many}>20명이 동시에 열기</button>
      </div>
      {batch && (
        <div className="dv-meters">
          <Meter label="데이터가 보인 화면" value={`${batch.data}/20`} />
          <Meter label="빈 화면" value={`${batch.blank}/20`} bad={batch.blank > 0} />
          <Meter label="대체 UI(저장본)" value={`${batch.fallback}/20`} />
          <Meter label="서버가 받은 요청" value={batch.reqs} />
        </div>
      )}
      <NwLog lines={log.lines} h={120} />
    </div>
  )
}

/* =====================================================================
 * 04 저장 연타 — 진행 중 잠금 + 멱등 키
 * ===================================================================== */
type Rec = { id: number; title: string; key: string | null; dup: boolean }
const newKey = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36))
export function DoubleDemo({ fixed }: { fixed: boolean }) {
  const sim = useSim()
  const log = useLog()
  const [title, setTitle] = useState('주말 등산 모임 후기')
  const [rows, setRows] = useState<Rec[]>([])
  const [sent, setSent] = useState(0)
  const [blocked, setBlocked] = useState(0)
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const key = useRef(newKey())
  const store = useRef({ seq: 100, byKey: new Map<string, number>(), rows: [] as Rec[] })
  const btn = useRef<HTMLButtonElement>(null)

  /** 가짜 서버 POST /posts — 멱등 키가 같으면 새로 만들지 않고 처음 결과를 돌려줘요 */
  const serverCreate = async (t: string, k: string | null) => {
    await sim.wait(rand(140, 220)) // 서버까지 가는 길
    const s = store.current
    if (k && s.byKey.has(k)) { setBlocked(b => b + 1); log.add(<>서버: 같은 <code>Idempotency-Key</code> → 새로 안 만들고 #{s.byKey.get(k)} 그대로 돌려줘요</>, 'ok'); return s.byKey.get(k) }
    const id = ++s.seq
    const dup = s.rows.some(r => r.title === t)
    s.rows = [...s.rows, { id, title: t, key: k, dup }]
    if (k) s.byKey.set(k, id)
    setRows(s.rows)
    log.add(<>서버: 글 #{id} 만들었어요{dup ? ' (같은 글이 또 생겼어요)' : ''}</>, dup ? 'bad' : '')
    return id
  }
  const post = async (lose = false) => {
    setSent(n => n + 1)
    const k = fixed ? key.current : null
    log.add(<>POST /posts{k ? <> · Idempotency-Key {k.slice(0, 8)}…</> : ''}</>)
    const id = await serverCreate(title, k)
    if (lose) { await sim.wait(500); log.add(<>응답이 오는 길에 끊겼어요 (시간 초과) → 자동으로 한 번 더 보내요</>, 'warn'); return null }
    await sim.wait(rand(500, 700)) // 응답이 돌아오는 길 (느린 망)
    return id
  }
  const onSave = async () => {
    if (fixed) {
      if (lock.current) { log.add(<>이미 저장 중이라 무시했어요</>, 'info'); return }
      lock.current = true; setSaving(true)
    }
    try { const id = await post(); log.add(<>‘저장됐어요’ (#{id})</>, 'ok') } finally { if (fixed) { lock.current = false; setSaving(false) } }
  }
  const lost = async () => {
    if (fixed) { if (lock.current) return; lock.current = true; setSaving(true) }
    try {
      await post(true)
      const id = await post()
      log.add(<>재전송 응답 → #{id}</>, 'ok')
    } finally { if (fixed) { lock.current = false; setSaving(false) } }
  }
  const mash = async () => { for (let i = 0; i < 4; i++) { btn.current?.click(); await sim.wait(90) } }
  const reset = () => {
    sim.reset(); log.clear(); lock.current = false; setSaving(false)
    store.current = { seq: 100, byKey: new Map(), rows: [] }; key.current = newKey()
    setRows([]); setSent(0); setBlocked(0)
  }
  const dupN = rows.filter(r => r.dup).length
  return (
    <div className="nw-col">
      <div className="nw-form">
        <input className="nw-input" value={title} onChange={e => { setTitle(e.target.value); if (fixed) key.current = newKey() }} aria-label="글 제목" />
        <button type="button" ref={btn} className="btn sm nw-save" onClick={onSave} disabled={fixed && saving} aria-busy={fixed && saving}>
          {fixed && saving ? <><span className="nw-spin" aria-hidden="true" />저장 중…</> : '저장'}
        </button>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm ghost" onClick={mash}>빠르게 4번 누르기</button>
        <button type="button" className="btn sm ghost" onClick={lost}>응답 유실 → 자동 재전송</button>
        <button type="button" className="btn sm ghost" onClick={reset}>처음부터</button>
      </div>
      <div className="nw-db">
        <small>서버에 저장된 글</small>
        {rows.length === 0 ? <p className="nw-empty">아직 없어요</p> : (
          <ul>{rows.map(r => <li key={r.id} className={r.dup ? 'dup' : ''}><code>#{r.id}</code>{r.title}{r.dup && <em>중복</em>}</li>)}</ul>
        )}
      </div>
      <div className="dv-meters">
        <Meter label="보낸 요청" value={`${sent}번`} />
        <Meter label="생긴 글" value={`${rows.length}개`} bad={rows.length ? dupN > 0 : undefined} />
        <Meter label="중복 글" value={`${dupN}개`} bad={rows.length ? dupN > 0 : undefined} />
        {fixed && <Meter label="키로 막은 중복" value={`${blocked}번`} />}
      </div>
      <NwLog lines={log.lines} h={110} empty="버튼은 진짜예요. 직접 여러 번 눌러 보세요" />
    </div>
  )
}

/* =====================================================================
 * 05 GraphQL Under-fetching · N+1
 * ===================================================================== */
const POSTS = ['봄 소풍 준비물', '비 오는 날 산책', '첫 텃밭 일기', '자전거 길 추천', '도시락 메뉴', '주말 시장 구경', '동네 빵집 지도', '등산화 고르기', '캠핑 요리', '야경 사진 팁', '작은 화분 키우기', '기차 여행 코스']
const AUTHORS = ['도토리', '해바라기', '구름빵', '산들바람', '솔방울', '라임']
type Bar = { label: string; s: number; e: number; kind: 'list' | 'one' | 'all' }
export function GraphqlDemo({ fixed }: { fixed: boolean }) {
  const sim = useSim()
  const [loader, setLoader] = useState(true)
  const [bars, setBars] = useState<Bar[]>([])
  const [names, setNames] = useState<(string | null)[]>(POSTS.map(() => null))
  const [listed, setListed] = useState(false)
  const [stat, setStat] = useState<{ http: number; db: number; ms: number } | null>(null)
  const [t, setT] = useState(0)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const open = () => {
    sim.reset(); cancelAnimationFrame(raf.current)
    setNames(POSTS.map(() => null)); setListed(false); setStat(null)
    // 시간표를 먼저 만들고(예시 지연), 재생하면서 화면을 채워요
    const plan: Bar[] = []
    let http: number, db: number
    if (!fixed) {
      plan.push({ label: 'posts { id title authorId }', s: 0, e: 160, kind: 'list' })
      POSTS.forEach((_, i) => { const s = 170 + i * 8; plan.push({ label: `author(id: ${i % AUTHORS.length + 1})`, s, e: s + rand(140, 260), kind: 'one' }) })
      http = 1 + POSTS.length; db = 1 + POSTS.length
    } else {
      const e = loader ? 190 : 190 + POSTS.length * 14 // DataLoader 없으면 서버 안에서 작성자를 하나씩 불러요
      plan.push({ label: 'posts { id title author { name } }', s: 0, e, kind: 'all' })
      http = 1; db = loader ? 2 : 1 + POSTS.length
    }
    const end = Math.max(...plan.map(b => b.e))
    setBars(plan)
    const st = performance.now()
    const step = () => {
      const now = (performance.now() - st) * 0.5 // 2배 느리게 재생
      setT(now)
      if (now >= plan[0].e) setListed(true)
      setNames(POSTS.map((_, i) => {
        const b = fixed ? plan[0] : plan[i + 1]
        return now >= b.e ? AUTHORS[i % AUTHORS.length] : null
      }))
      if (now < end) raf.current = requestAnimationFrame(step)
      else { setT(end); setStat({ http, db, ms: Math.round(end) }) }
    }
    raf.current = requestAnimationFrame(step)
  }
  const end = bars.length ? Math.max(...bars.map(b => b.e)) : 1
  const X = (ms: number) => `${(ms / Math.max(end, 500)) * 100}%`
  return (
    <div className="nw-col">
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={open}>글 목록 열기 (12개)</button>
        {fixed && <label className="nw-check"><input type="checkbox" checked={loader} onChange={e => setLoader(e.target.checked)} />서버 DataLoader</label>}
      </div>
      <div className="nw-gql">
        <ul className="nw-posts">
          {POSTS.slice(0, 6).map((p, i) => (
            <li key={p} className={listed ? '' : 'off'}><b>{listed ? p : '　'}</b><span>{names[i] ?? (listed ? '…' : '')}</span></li>
          ))}
          <li className="nw-more">외 6개</li>
        </ul>
        <div className="nw-fall" aria-label="요청 타임라인">
          {bars.map((b, i) => (
            <div className="nw-fall-row" key={i} title={b.label}>
              <span className={'nw-fall-bar ' + b.kind} style={{ left: X(b.s), width: `calc(${X(Math.max(0, Math.min(t, b.e) - b.s))} + 1px)`, opacity: t >= b.s ? 1 : 0 }} />
            </div>
          ))}
          {bars.length === 0 && <p className="nw-empty">요청 하나가 막대 하나예요</p>}
        </div>
      </div>
      <div className="dv-meters">
        <Meter label="HTTP 요청" value={stat ? `${stat.http}개` : '—'} bad={stat ? stat.http > 1 : undefined} />
        <Meter label="서버 DB 쿼리" value={stat ? `${stat.db}번` : '—'} bad={stat ? stat.db > 2 : undefined} />
        <Meter label="다 보일 때까지" value={stat ? `${stat.ms}ms` : '—'} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 06 WebSocket 재연결 · 놓친 이벤트 복구
 * ===================================================================== */
type Got = 'live' | 'replay'
type WsView = { seq: number; got: Map<number, Got>; conn: 'open' | 'closed' | 'connecting'; tries: number; last: number; lastSeq: number; down: boolean; staleMs: number; value: number }
const valueOf = (s: number) => Math.round((21 + Math.sin(s / 4) * 2.4 + ((s * 37) % 7) / 10) * 10) / 10
export function WsDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState<WsView>({ seq: 0, got: new Map(), conn: 'connecting', tries: 0, last: 0, lastSeq: 0, down: false, staleMs: 0, value: 0 })
  const api = useRef<{ drop: () => void } | null>(null)

  useEffect(() => {
    let alive = true
    const timers = new Set<number>()
    const later = (fn: () => void, ms: number) => { const id = window.setTimeout(() => { timers.delete(id); if (alive) fn() }, ms); timers.add(id) }
    // 가짜 서버: 0.4초마다 이벤트 하나, 순서 번호(seq)를 붙여 최근 것들을 보관해요
    const srv = { seq: 0 }
    let down = false
    let conn: { sub: boolean } | null = null
    let state: WsView['conn'] = 'connecting'
    let lastSeq = 0, backoff = 0, tries = 0, lastAt = performance.now(), firstSub = true
    const got = new Map<number, Got>()
    const deliver = (s: number, how: Got) => {
      if (fixed && s <= lastSeq) return // 중복은 버려요
      got.set(s, how); lastSeq = Math.max(lastSeq, s); lastAt = performance.now()
    }
    const subscribe = () => {
      if (!conn) return
      conn.sub = true
      if (fixed) for (let s = lastSeq + 1; s <= srv.seq; s++) deliver(s, 'replay') // since=lastSeq 이후를 먼저 다시 보내요
    }
    const onClose = () => {
      conn = null; state = 'closed'
      if (!fixed) { later(connect, 1000); return } // ✕ 1초마다 똑같이
      const cap = Math.min(4000, 400 * 2 ** backoff++)
      later(connect, rand(cap / 2, cap)) // ✓ 백오프 + 지터
    }
    function connect() {
      state = 'connecting'; tries++
      later(() => {
        if (down) { onClose(); return }
        conn = { sub: false }; state = 'open'; backoff = 0
        if (fixed || firstSub) { firstSub = false; subscribe() } // ✕ 문제 코드는 첫 연결에서만 구독해요
      }, 150)
    }
    connect()
    const tick = window.setInterval(() => {
      srv.seq++
      if (conn && conn.sub && !down) deliver(srv.seq, 'live')
      setV({ seq: srv.seq, got: new Map(got), conn: state, tries: Math.max(0, tries - 1), last: lastSeq, lastSeq, down, staleMs: performance.now() - lastAt, value: valueOf(lastSeq) })
    }, 400)
    api.current = {
      drop() {
        if (down) return
        down = true
        later(() => { if (conn) onClose() }, 300) // 하트비트로 끊김을 알아채는 데 걸리는 시간
        later(() => { down = false }, 3000)
      },
    }
    return () => { alive = false; clearInterval(tick); timers.forEach(clearTimeout); api.current = null }
  }, [fixed])

  const missed = Math.max(0, v.seq - v.got.size)
  const frozen = v.conn === 'open' && v.staleMs > 1500
  const from = Math.max(1, v.seq - 39)
  const cells = []
  for (let s = from; s <= v.seq; s++) cells.push(<i key={s} className={'nw-cell ' + (v.got.get(s) ?? 'miss')} title={'#' + s} />)
  const pill = v.conn === 'open' ? '연결됨' : v.conn === 'connecting' ? '연결 중' : '끊김'
  return (
    <div className="nw-col">
      <div className="nw-live">
        <div>
          <small>3번 라인 온도</small>
          <b className={frozen ? 'frozen' : ''}>{v.lastSeq ? v.value.toFixed(1) : '—'}<em>°C</em></b>
          <span className="nw-seqno">#{v.lastSeq}</span>
        </div>
        <span className={'nw-pill ' + v.conn}>{pill}</span>
      </div>
      {fixed && v.conn !== 'open' && v.lastSeq > 0 && <div className="nw-banner warn" role="status"><span>연결이 끊겼어요 · {(v.staleMs / 1000).toFixed(1)}초 전 값이에요. 다시 연결하고 있어요</span></div>}
      <div className="nw-cells" aria-label="최근 이벤트 40개">{cells}</div>
      <div className="nw-legend"><span className="live">실시간으로 받음</span><span className="replay">재연결 뒤 다시 받음</span><span className="miss">놓침</span></div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => api.current?.drop()} disabled={v.down}>{v.down ? '와이파이 끊김…' : '와이파이 3초 끊기'}</button>
      </div>
      <div className="dv-meters">
        <Meter label="놓친 이벤트" value={`${missed}개`} bad={v.seq > 3 ? missed > 0 : undefined} />
        <Meter label="재연결 시도" value={`${v.tries}번`} />
        <Meter label="화면 값" value={frozen ? '멈춤' : v.conn === 'open' ? '실시간' : '끊김 안내'} bad={frozen ? true : v.conn === 'open' ? false : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 07 탭마다 SSE — HTTP/1.1 연결 6개 제한
 * ===================================================================== */
type Pend = { id: number; tab: number; t0: number; start?: number; end?: number }
const SLOTS = 6
export function SseLimitDemo({ fixed }: { fixed: boolean }) {
  const [mode, setMode] = useState<'leader' | 'h2'>('leader')
  const [tabs, setTabs] = useState<number[]>([1, 2, 3])
  const [got, setGot] = useState<Record<number, number>>({})
  const [reqs, setReqs] = useState<Pend[]>([])
  const [now, setNow] = useState(() => performance.now())
  const nextReq = useRef(1)
  const [chanName] = useState(() => 'nw-demo-' + Math.random().toString(36).slice(2))
  const shared = fixed && mode === 'leader' // 리더 탭이 받아서 나눠 주는 방식

  // 연결 자리 계산: 문제 그대로면 탭마다 SSE 하나가 자리를 계속 붙잡아요
  const sseHolders = fixed ? (mode === 'leader' ? tabs.slice(0, 1) : tabs) : tabs.slice(0, SLOTS)
  const sseWaiting = fixed ? [] : tabs.slice(SLOTS)
  const usesH2 = fixed && mode === 'h2'

  // 요청 진행: 0.1초마다 자리가 나면 줄 선 요청을 보내요
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = performance.now()
      setNow(t)
      setReqs(list => {
        let inflight = list.filter(r => r.start !== undefined && r.end === undefined).length
        const held = usesH2 ? 0 : sseHolders.length
        let changed = false
        const next = list.map(r => {
          if (r.end !== undefined) return r
          if (r.start !== undefined) {
            if (t - r.start >= 180) { changed = true; inflight--; return { ...r, end: t } }
            return r
          }
          if (usesH2 || held + inflight < SLOTS) { changed = true; inflight++; return { ...r, start: t } }
          return r
        })
        return changed ? next : list
      })
    }, 100)
    return () => clearInterval(id)
  }, [usesH2, sseHolders.length])

  // 서버 알림: 1.5초마다. 리더 방식이면 리더만 받고, 진짜 BroadcastChannel로 다른 탭에 나눠 줘요
  const holdersKey = sseHolders.join(',')
  useEffect(() => {
    const holders = holdersKey ? holdersKey.split(',').map(Number) : []
    const bc = shared ? new BroadcastChannel(chanName) : null
    const id = window.setInterval(() => {
      setGot(g => { const n = { ...g }; holders.forEach(h => { n[h] = (n[h] ?? 0) + 1 }); return n })
      bc?.postMessage({ type: 'notice' })
    }, 1500)
    return () => { clearInterval(id); bc?.close() }
  }, [holdersKey, shared, chanName])

  const addTab = (n = 1) => setTabs(t => { const a = [...t]; for (let i = 0; i < n && a.length < 8; i++) a.push(Math.max(0, ...a) + 1); return a })
  const closeTab = () => setTabs(t => (t.length > 1 ? t.slice(0, -1) : t))
  const send = () => {
    const r: Pend = { id: nextReq.current++, tab: tabs[tabs.length - 1], t0: performance.now() }
    setReqs(l => [...l.filter(x => x.end === undefined || r.t0 - x.end < 4000).slice(-12), r])
  }

  const waiting = reqs.filter(r => r.start === undefined)
  const inflight = reqs.filter(r => r.start !== undefined && r.end === undefined)
  const lastDone = [...reqs].reverse().find(r => r.end !== undefined)
  const longestWait = waiting.length ? Math.max(...waiting.map(r => now - r.t0)) : 0
  const used = usesH2 ? 1 : Math.min(SLOTS, sseHolders.length + inflight.length)
  const deaf = sseWaiting.length
  return (
    <div className="nw-col">
      {fixed && <Seg value={mode} onChange={setMode} className="nw-seg" options={[['leader', '리더 탭 하나만 연결'], ['h2', 'HTTP/2 서버']]} />}
      <div className="nw-tabs">
        {tabs.map((t, i) => {
          const holds = sseHolders.includes(t)
          const isLeader = fixed && mode === 'leader' && i === 0
          return shared && !isLeader
            ? <FollowerTab key={t} id={t} chan={chanName} />
            : (
              <div key={t} className={'nw-tab' + (sseWaiting.includes(t) ? ' stuck' : '')}>
                <b>탭 {t}{isLeader && <em>리더</em>}</b>
                <small>{holds ? `알림 ${got[t] ?? 0}개` : '알림 연결 대기…'}</small>
              </div>
            )
        })}
      </div>
      <div className="nw-slots" aria-label="연결 자리">
        <small>{usesH2 ? 'shop.example 연결 (HTTP/2 · 한 연결에 여러 요청)' : `shop.example 연결 자리 (HTTP/1.1 · 최대 ${SLOTS}개)`}</small>
        <div>
          {usesH2
            ? <span className="nw-slot h2">연결 1개 · 알림 스트림 {tabs.length}개 + 요청 {inflight.length}개</span>
            : Array.from({ length: SLOTS }, (_, i) => {
              const sse = i < sseHolders.length
              const req = !sse && i < sseHolders.length + inflight.length
              return <span key={i} className={'nw-slot' + (sse ? ' sse' : req ? ' req' : '')}>{sse ? `SSE 탭${sseHolders[i]}` : req ? 'API' : '비어 있음'}</span>
            })}
        </div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm ghost" onClick={() => addTab()} disabled={tabs.length >= 8}>탭 열기</button>
        <button type="button" className="btn sm ghost" onClick={() => addTab(7 - tabs.length)} disabled={tabs.length >= 7}>탭 7개로</button>
        <button type="button" className="btn sm ghost" onClick={closeTab} disabled={tabs.length <= 1}>탭 닫기</button>
        <button type="button" className="btn sm" onClick={send}>마지막 탭에서 API 요청</button>
      </div>
      <div className="dv-meters">
        <Meter label="쓰는 연결" value={`${used}/${usesH2 ? 1 : SLOTS}`} bad={!usesH2 && used >= SLOTS} />
        <Meter label="줄 선 API 요청" value={`${waiting.length}개`} bad={waiting.length > 0} />
        <Meter label="가장 오래 기다림" value={waiting.length ? `${(longestWait / 1000).toFixed(1)}초` : lastDone ? `${Math.round(lastDone.end! - lastDone.t0)}ms` : '—'} bad={waiting.length ? longestWait > 1000 : lastDone ? false : undefined} />
        <Meter label="알림 못 받는 탭" value={`${deaf}개`} bad={deaf > 0} />
      </div>
    </div>
  )
}
function FollowerTab({ id, chan }: { id: number; chan: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const bc = new BroadcastChannel(chan) // 진짜 BroadcastChannel — 이 데모 이름으로만 주고받아요
    bc.onmessage = () => setN(x => x + 1)
    return () => bc.close()
  }, [chan])
  return <div className="nw-tab follow"><b>탭 {id}</b><small>알림 {n}개 · 리더가 전달</small></div>
}

/* =====================================================================
 * 08 오프라인 안내 — 진짜 navigator.onLine + 가짜 터널
 * ===================================================================== */
type Msg = { id: number; text: string; st: 'sent' | 'queued' | 'lost' | 'sending' }
const CHEERS = ['힘내요!', '오늘도 수고했어요', '응원해요 🙌', '거의 다 왔어요', '최고예요']
export function OfflineDemo({ fixed }: { fixed: boolean }) {
  const sim = useSim()
  const [real, setReal] = useState(() => navigator.onLine)
  const [tunnel, setTunnel] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [events, setEvents] = useState<string[]>([])
  const n = useRef(0)
  const online = real && !tunnel
  const onlineRef = useRef(online)
  useEffect(() => { onlineRef.current = online }, [online])

  useEffect(() => {
    const on = () => { setReal(true); setEvents(e => [...e.slice(-2), 'online 이벤트']) }
    const off = () => { setReal(false); setEvents(e => [...e.slice(-2), 'offline 이벤트']) }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const patch = (id: number, st: Msg['st']) => setMsgs(l => l.map(m => (m.id === id ? { ...m, st } : m)))
  /** 가짜 POST — 끊겼으면 잠시 매달렸다가 실패해요 */
  const fakePost = async () => { await sim.wait(onlineRef.current ? 260 : 900); if (!onlineRef.current) throw new TypeError('Failed to fetch') }
  const send = async () => {
    const id = ++n.current
    const text = CHEERS[(id - 1) % CHEERS.length]
    if (!fixed) {
      try { await fakePost(); setMsgs(l => [...l, { id, text, st: 'sent' }]) } catch { setMsgs(l => [...l, { id, text, st: 'lost' }]) /* 화면엔 아무것도 안 보여요 */ }
      return
    }
    setMsgs(l => [...l, { id, text, st: onlineRef.current ? 'sending' : 'queued' }])
    if (!onlineRef.current) return
    try { await fakePost(); patch(id, 'sent') } catch { patch(id, 'queued') }
  }
  // 다시 연결되면 대기열을 차례로 보내요
  useEffect(() => {
    if (!fixed || !online) return
    let stop = false
    const flush = async () => {
      for (const m of msgs.filter(x => x.st === 'queued')) {
        if (stop) return
        patch(m.id, 'sending')
        try { await fakePost(); patch(m.id, 'sent') } catch { patch(m.id, 'queued'); return }
      }
    }
    void flush()
    return () => { stop = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, fixed])

  const sent = msgs.filter(m => m.st === 'sent').length
  const lost = msgs.filter(m => m.st === 'lost').length
  const queued = msgs.filter(m => m.st === 'queued' || m.st === 'sending').length
  const shown = fixed ? msgs : msgs.filter(m => m.st === 'sent')
  return (
    <div className="nw-col">
      <div className="dv-row">
        <label className="nw-check"><input type="checkbox" checked={tunnel} onChange={e => setTunnel(e.target.checked)} />터널 들어가기 (이 데모만 끊어요)</label>
        <span className={'nw-pill ' + (real ? 'open' : 'closed')}>브라우저: {real ? 'online' : 'offline'}</span>
      </div>
      <div className="nw-screen">
        <div className="nw-screen-bar">응원 보내기</div>
        {fixed && !online && <div className="nw-banner warn" role="status"><span>오프라인이에요. 연결되면 자동으로 보낼게요</span></div>}
        <ul className="nw-msgs" aria-live="polite">
          {shown.length === 0 && <li className="nw-empty">아직 보낸 응원이 없어요</li>}
          {shown.map(m => (
            <li key={m.id} className={'st-' + m.st}>{m.text}<small>{m.st === 'sent' ? '보냄' : m.st === 'sending' ? '보내는 중…' : '대기 중'}</small></li>
          ))}
        </ul>
        <button type="button" className="btn sm nw-send" onClick={send}>{fixed && !online ? '응원 보내기 (연결되면 보내요)' : '응원 보내기'}</button>
      </div>
      <div className="dv-meters">
        <Meter label="navigator.onLine (진짜)" value={String(real)} />
        <Meter label="보냄" value={`${sent}개`} />
        {fixed ? <Meter label="대기열" value={`${queued}개`} /> : <Meter label="말없이 사라짐" value={`${lost}개`} bad={lost > 0} />}
      </div>
      <p className="dv-log">{events.length ? <>이 탭에서 받은 진짜 이벤트: <b>{events.join(' → ')}</b></> : <>개발자 도구 Network에서 ‘Offline’을 고르면 진짜 <code>offline</code> 이벤트도 받아요.</>}</p>
    </div>
  )
}

/* =====================================================================
 * 09 API 스키마 변경 — 런타임 검증
 * ===================================================================== */
const V1 = { title: '접이식 캠핑 의자', price: 12900, seller: { name: '숲속상회' }, options: [{ label: '올리브' }, { label: '베이지' }] }
const V2 = { title: '접이식 캠핑 의자', price: '12,900원', seller: null, variants: [{ label: '올리브' }, { label: '베이지' }] }

/* 손으로 짠 작은 검증기 — 실제로는 zod · valibot 같은 라이브러리를 써요 */
type Issue = { path: string; msg: string }
type Check = (v: unknown, path: string, out: Issue[]) => boolean
const kind = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)
const str: Check = (v, p, o) => (typeof v === 'string' ? true : (o.push({ path: p, msg: `문자열이어야 하는데 ${kind(v)}` }), false))
const num: Check = (v, p, o) => (typeof v === 'number' && Number.isFinite(v) ? true : (o.push({ path: p, msg: `숫자여야 하는데 ${kind(v)}${typeof v === 'string' ? ` "${v}"` : ''}` }), false))
const obj = (shape: Record<string, Check>): Check => (v, p, o) => {
  if (kind(v) !== 'object') { o.push({ path: p, msg: `객체여야 하는데 ${kind(v)}` }); return false }
  let ok = true
  for (const [k, c] of Object.entries(shape)) if (!c((v as Record<string, unknown>)[k], p ? `${p}.${k}` : k, o)) ok = false
  return ok
}
const arr = (item: Check): Check => (v, p, o) => {
  if (!Array.isArray(v)) { o.push({ path: p, msg: `배열이어야 하는데 ${kind(v)}` }); return false }
  return v.every((x, i) => item(x, `${p}[${i}]`, o))
}
const ProductCheck = { title: str, price: num, seller: obj({ name: str }), options: arr(obj({ label: str })) }

function badView(raw: unknown) {
  const p = raw as { title: string; price: number; seller: { name: string }; options: { label: string }[] } // ✕ 검사가 아니라 '믿을게요'
  return { title: p.title, price: p.price.toLocaleString() + '원', seller: p.seller.name, options: p.options.map(o => o.label).join(' · ') }
}
export function SchemaDemo({ fixed }: { fixed: boolean }) {
  const sim = useSim()
  const [ver, setVer] = useState<1 | 2>(1)
  const [res, setRes] = useState<null | { crash?: string; view?: Record<string, string | null>; issues: Issue[]; reported: boolean }>(null)
  const [loading, setLoading] = useState(false)

  const open = async () => {
    sim.reset(); setLoading(true); setRes(null)
    await sim.wait(350)
    const raw: unknown = JSON.parse(JSON.stringify(ver === 1 ? V1 : V2)) // 진짜 응답처럼 JSON 왕복
    setLoading(false)
    if (!fixed) {
      try { setRes({ view: badView(raw), issues: [], reported: false }) } catch (e) { setRes({ crash: `${(e as Error).name}: ${(e as Error).message}`, issues: [], reported: false }) }
      return
    }
    // ✓ 칸마다 따로 검사하고, 틀린 칸만 안내로 바꿔요
    const issues: Issue[] = []
    const r = raw as Record<string, unknown>
    const field = (k: keyof typeof ProductCheck) => ProductCheck[k](r[k], k, issues)
    const view: Record<string, string | null> = {
      title: field('title') ? (r.title as string) : null,
      price: field('price') ? (r.price as number).toLocaleString('ko-KR') + '원' : null,
      seller: r.seller === null ? '판매자 정보 없음' : field('seller') ? (r.seller as { name: string }).name : null,
      options: field('options') ? (r.options as { label: string }[]).map(o => o.label).join(' · ') : null,
    }
    if (r.seller === null) issues.push({ path: 'seller', msg: '객체여야 하는데 null — 안내 문구로 바꿨어요' })
    setRes({ view, issues, reported: issues.length > 0 })
  }
  const shown = res?.view
  return (
    <div className="nw-col">
      <div className="dv-row">
        <span className="nw-lab">서버 응답</span>
        <Seg value={ver} onChange={v => { setVer(v); setRes(null) }} className="nw-seg" options={[[1, 'v1 약속대로'], [2, 'v2 예고 없이 바뀜']]} />
      </div>
      <pre className="nw-json allow-select">{JSON.stringify(ver === 1 ? V1 : V2, null, 1).replace(/\n\s*/g, ' ')}</pre>
      <div className="nw-screen">
        <div className="nw-screen-bar">상품 상세</div>
        {!res && !loading && <p className="nw-blank-note">‘상품 열기’를 눌러 보세요</p>}
        {loading && <div className="nw-skel"><i /><i /></div>}
        {res?.crash && <div className="nw-white"><span>(화면 전체가 지워졌어요 · 흰 화면)</span><code>{res.crash}</code></div>}
        {shown && (
          <dl className="nw-detail">
            <dt>상품</dt><dd>{shown.title ?? <i>이름을 불러오지 못했어요</i>}</dd>
            <dt>가격</dt><dd>{shown.price ?? <i>가격을 확인하고 있어요</i>}</dd>
            <dt>판매자</dt><dd>{shown.seller ?? <i>판매자 정보를 불러오지 못했어요</i>}</dd>
            <dt>옵션</dt><dd>{shown.options ?? <i>옵션을 불러오지 못했어요</i>}</dd>
          </dl>
        )}
      </div>
      <button type="button" className="btn sm" onClick={open} disabled={loading}>상품 열기</button>
      {res && res.issues.length > 0 && (
        <ul className="nw-issues">{res.issues.map((x, i) => <li key={i}><code>{x.path}</code>{x.msg}</li>)}</ul>
      )}
      <div className="dv-meters">
        <Meter label="화면" value={!res ? '—' : res.crash ? '흰 화면' : res.issues.length ? '일부만 안내' : '정상'} bad={res ? !!res.crash : undefined} />
        <Meter label="잡아낸 스키마 위반" value={res ? `${res.issues.length}개` : '—'} />
        <Meter label="오류 수집기 보고" value={res ? (res.reported ? '보냄' : res.crash ? '없음' : '필요 없음') : '—'} bad={res ? !!res.crash : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 10 인터셉터가 에러를 삼킴
 * ===================================================================== */
type Outcome = 200 | 409 | 500 | 0
class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) { super(message); this.name = 'ApiError'; this.status = status; this.code = code }
}
const MESSAGE: Record<string, string> = {
  ALREADY_SHIPPED: '이미 배송이 시작돼서 취소할 수 없어요. 반품 신청을 이용해 주세요',
  SERVER: '잠시 문제가 생겼어요. 조금 뒤 다시 시도해 주세요',
  NETWORK: '연결을 확인하고 다시 시도해 주세요',
}
export function InterceptorDemo({ fixed }: { fixed: boolean }) {
  const sim = useSim()
  const [outcome, setOutcome] = useState<Outcome>(500)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const [order, setOrder] = useState<'결제 완료' | '취소됨'>('결제 완료')
  const [consoleLines, setConsole] = useState<string[]>([])
  const [reports, setReports] = useState(0)
  const [busy, setBusy] = useState(false)
  const [truth, setTruth] = useState<string | null>(null)

  /** 가짜 axios: 응답 인터셉터 하나 */
  const request = async (): Promise<{ data: unknown }> => {
    await sim.wait(420)
    const fail = (): { status: number; data?: unknown } => {
      if (outcome === 409) return { status: 409, data: { code: 'ALREADY_SHIPPED' } }
      if (outcome === 500) return { status: 500, data: { code: 'SERVER' } }
      return { status: 0 }
    }
    if (outcome === 200) { setOrder('취소됨'); return { data: { ok: true } } }
    const err = fail()
    // ---- 응답 인터셉터 (에러 쪽) ----
    if (!fixed) {
      setConsole(c => [...c.slice(-2), `AxiosError: Request failed with status code ${err.status || '(network)'}`]) // console.error 흉내
      return { data: undefined } // ✕ 실패를 성공으로 바꿔요
    }
    const e = err.status === 0
      ? new ApiError(0, 'NETWORK', 'Network Error')
      : new ApiError(err.status, (err.data as { code: string }).code, `HTTP ${err.status}`)
    setReports(r => r + 1)
    throw e // ✓ 다시 던져요
  }
  const cancel = async () => {
    sim.reset(); setBusy(true); setToast(null)
    setTruth(outcome === 200 ? '200 취소 성공' : outcome === 0 ? '네트워크 끊김' : `${outcome} 실패`)
    try {
      await request()
      setToast({ ok: true, text: '주문을 취소했어요' })
    } catch (e) {
      const err = e as ApiError
      setToast({ ok: false, text: MESSAGE[err.code] ?? '알 수 없는 문제가 생겼어요' })
    } finally { setBusy(false) }
  }
  const lie = toast?.ok && outcome !== 200
  return (
    <div className="nw-col">
      <div className="dv-row">
        <span className="nw-lab">서버가 줄 응답</span>
        <Seg value={outcome} onChange={v => { setOutcome(v); setToast(null); setTruth(null); setOrder('결제 완료') }} className="nw-seg"
          options={[[200, '200'], [409, '409'], [500, '500'], [0, '끊김']]} />
      </div>
      <div className="nw-screen">
        <div className="nw-screen-bar">주문 #A-2041</div>
        <div className="nw-order"><span>캠핑 의자 외 1건</span><b>{order}</b></div>
        <button type="button" className="btn sm danger" onClick={cancel} disabled={busy}>{busy ? '취소하는 중…' : '주문 취소하기'}</button>
        {toast && <div className={'nw-toast ' + (toast.ok ? 'ok' : 'bad')} role="status">{toast.ok ? '✓ ' : '! '}{toast.text}{!toast.ok && outcome !== 409 && <button type="button" className="btn sm ghost" onClick={cancel}>다시 시도</button>}</div>}
      </div>
      <div className="nw-console" aria-label="콘솔 흉내">
        <small>개발자 콘솔 (사용자는 못 봐요)</small>
        {consoleLines.length === 0 ? <span className="nw-empty">비어 있어요</span> : consoleLines.map((l, i) => <code key={i}>{l}</code>)}
      </div>
      <div className="dv-meters">
        <Meter label="서버 실제 결과" value={truth ?? '—'} />
        <Meter label="화면 안내" value={toast ? (lie ? '성공 (거짓)' : toast.ok ? '성공' : '실패 안내') : '—'} bad={toast ? !!lie : undefined} />
        <Meter label="오류 수집기 보고" value={`${reports}건`} bad={truth && truth !== '200 취소 성공' && !busy ? reports === 0 : undefined} />
      </div>
    </div>
  )
}
