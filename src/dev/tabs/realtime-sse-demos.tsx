/* 11 실시간 통신 · 폴링·SSE 데모 — fixed=false 문제 그대로, true 해결 적용
 * 서버·프록시·게이트웨이는 전부 이 파일 안의 가짜예요. 바깥으로 연결을 열지 않아요.
 * 진짜로 쓰는 브라우저 기능: visibilitychange(폴링), BroadcastChannel(탭 나눠 주기) */
import { useEffect, useRef, useState } from 'react'
import { Seg } from '../../components/ui'
import { Meter } from '../ui'

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const sec = (ms: number) => (ms / 1000).toFixed(1) + '초'

/** 데모 안 타이머 묶음 — stop() 하면 기다리던 것까지 전부 멈춰요 */
function timers() {
  let alive = true
  const ids = new Set<number>()
  return {
    later(fn: () => void, ms: number) {
      const id = window.setTimeout(() => { ids.delete(id); if (alive) fn() }, ms)
      ids.add(id)
    },
    every(fn: () => void, ms: number) {
      const id = window.setInterval(() => { if (alive) fn() }, ms)
      ids.add(id)
    },
    stop() {
      alive = false
      ids.forEach(id => { clearTimeout(id); clearInterval(id) })
      ids.clear()
    },
  }
}
type Timers = ReturnType<typeof timers>

type Tone = '' | 'ok' | 'bad' | 'warn'
type Line = { id: number; t: string; text: string; tone: Tone }
function RcsLog({ lines, empty }: { lines: Line[]; empty: string }) {
  return (
    <ol className="rcs-log" aria-label="기록">
      {lines.length === 0 && <li className="rcs-l rcs-empty">{empty}</li>}
      {lines.map(l => <li key={l.id} className={'rcs-l ' + l.tone}><time>{l.t}</time><span>{l.text}</span></li>)}
    </ol>
  )
}

/* =====================================================================
 * 01 setInterval 폴링의 요청 겹침
 * ===================================================================== */
type PReq = { id: number; t0: number; end?: number; stale?: boolean }
const P_WIN = 8000
export function PollDemo({ fixed }: { fixed: boolean }) {
  const [slow, setSlow] = useState(false)
  const slowRef = useRef(false)
  const [v, setV] = useState({ now: 0, reqs: [] as PReq[], stale: 0, lastMs: 0, paused: false, sent: 0 })

  useEffect(() => {
    const T = timers()
    let reqs: PReq[] = []
    let seq = 0, applied = 0, stale = 0, lastMs = 0, paused = false
    const inflight = () => reqs.filter(r => r.end === undefined).length
    // 가짜 서버: 동시에 걸린 요청이 많을수록 느리게 답해요
    const send = (after?: () => void) => {
      const r: PReq = { id: ++seq, t0: performance.now() }
      const busy = inflight()
      reqs.push(r)
      const s = slowRef.current
      const ms = Math.min(9000, ((s ? 1300 : 220) + busy * (s ? 1000 : 40)) * rand(0.8, 1.25))
      T.later(() => {
        r.end = performance.now()
        lastMs = r.end - r.t0
        if (r.id < applied) { r.stale = true; stale++ } // 나중에 보낸 요청보다 늦게 온 옛 응답이 화면 값을 덮어써요
        else applied = r.id
        after?.()
      }, ms)
    }
    if (!fixed) {
      send()
      T.every(() => send(), 1000) // ✕ 앞 요청이 끝났는지 보지 않아요
    } else {
      const tick = () => {
        if (document.hidden) { paused = true; T.later(tick, 500); return } // ✓ 숨긴 탭에서는 쉬어요
        paused = false
        send(() => T.later(tick, 1000)) // ✓ 응답을 받은 뒤에 다음 예약
      }
      tick()
    }
    T.every(() => {
      const now = performance.now()
      reqs = reqs.filter(r => r.end === undefined || r.end > now - P_WIN)
      setV({ now, reqs: reqs.slice(-12).map(r => ({ ...r })), stale, lastMs, paused, sent: seq })
    }, 100)
    return () => T.stop()
  }, [fixed])

  const toggle = () => { slowRef.current = !slowRef.current; setSlow(s => !s) }
  const open = v.reqs.filter(r => r.end === undefined).length
  const from = v.now - P_WIN
  return (
    <div className="rcs-col">
      <div className="rcs-lanes" aria-label="최근 8초 요청">
        <div className="rcs-lanes-head"><small>요청 (최근 8초)</small><small>지금 →</small></div>
        {v.reqs.length === 0 && <p className="rcs-empty">요청을 기다리는 중…</p>}
        {v.reqs.map(r => {
          const left = Math.max(0, (r.t0 - from) / P_WIN) * 100
          const right = (((r.end ?? v.now) - from) / P_WIN) * 100
          const cls = r.end === undefined ? ' open' : r.stale ? ' stale' : ''
          return (
            <div className="rcs-lane" key={r.id}>
              <span>#{r.id}</span>
              <div className="rcs-track"><i className={'rcs-bar' + cls} style={{ left: left + '%', width: Math.max(1, right - left) + '%' }} /></div>
            </div>
          )
        })}
      </div>
      <div className="rcs-legend">
        <span className="open">기다리는 중</span><span>응답 받음</span><span className="stale">옛 응답이 덮어씀</span>
      </div>
      <div className="dv-row">
        <button type="button" className={'btn sm' + (slow ? '' : ' ghost')} onClick={toggle}>{slow ? '서버 원래대로' : '서버 느리게 (응답 1.3초+)'}</button>
        {fixed && v.paused && <span className="rcs-hint">탭이 숨겨져서 쉬는 중</span>}
      </div>
      <div className="dv-meters">
        <Meter label="동시에 걸린 요청" value={`${open}개`} bad={open > 1} />
        <Meter label="마지막 응답" value={v.lastMs ? sec(v.lastMs) : '—'} bad={v.lastMs ? v.lastMs > 2000 : undefined} />
        <Meter label="옛 응답이 덮어씀" value={`${v.stale}번`} bad={v.stale > 0} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 02 프록시 버퍼링으로 몰려 오는 SSE
 * ===================================================================== */
type BEv = { id: number; sent: number; got?: number }
const B_WIN = 10000
const B_CAP = 4096
export function BufferDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState({ now: 0, evs: [] as BEv[], buf: 0, held: 0, maxBatch: 0, avg: 0, max: 0 })

  useEffect(() => {
    const T = timers()
    let evs: BEv[] = []
    let id = 0, buf = 0, maxBatch = 0
    let held: BEv[] = []
    // 가짜 서버: 0.6초마다 알림 하나(300~500바이트)
    T.every(() => {
      const e: BEv = { id: ++id, sent: performance.now() }
      evs.push(e)
      if (fixed) { // ✓ 버퍼링 꺼짐 — 받는 대로 흘려 보내요
        T.later(() => { e.got = performance.now() }, rand(20, 60))
        maxBatch = Math.max(maxBatch, 1)
        return
      }
      buf += Math.round(rand(300, 520)) // ✕ 프록시가 4KB가 찰 때까지 모아요
      held.push(e)
      if (buf >= B_CAP) {
        const batch = held
        held = []; buf = 0
        maxBatch = Math.max(maxBatch, batch.length)
        T.later(() => { const t = performance.now(); batch.forEach(x => { x.got = t }) }, 30)
      }
    }, 600)
    T.every(() => {
      const now = performance.now()
      evs = evs.filter(e => e.sent > now - B_WIN * 2)
      const done = evs.filter(e => e.got !== undefined).slice(-20)
      const lags = done.map(e => e.got! - e.sent)
      setV({
        now, evs: evs.map(e => ({ ...e })), buf, held: held.length, maxBatch,
        avg: lags.length ? lags.reduce((a, b) => a + b, 0) / lags.length : 0,
        max: lags.length ? Math.max(...lags) : 0,
      })
    }, 100)
    return () => T.stop()
  }, [fixed])

  const pos = (t: number) => ((t - (v.now - B_WIN)) / B_WIN) * 100
  const shown = v.evs.filter(e => pos(e.sent) >= 0 || (e.got !== undefined && pos(e.got) >= 0))
  // 같은 순간에 도착한 알림은 점 하나에 개수로 묶어요
  const arrivals = new Map<number, number>()
  shown.forEach(e => { if (e.got !== undefined && pos(e.got) >= 0) arrivals.set(e.got, (arrivals.get(e.got) ?? 0) + 1) })
  return (
    <div className="rcs-col">
      <div className="rcs-flow" aria-label="최근 10초 알림 흐름">
        <div className="rcs-flow-row"><small>서버가 보냄</small>
          <div className="rcs-dots">{shown.filter(e => pos(e.sent) >= 0).map(e => <i key={e.id} style={{ left: pos(e.sent) + '%' }} />)}</div>
        </div>
        <div className="rcs-flow-row"><small>브라우저 도착</small>
          <div className="rcs-dots got">{[...arrivals].map(([t, c]) => <i key={t} className={c > 1 ? 'many' : ''} style={{ left: pos(t) + '%' }}>{c > 1 ? c : ''}</i>)}</div>
        </div>
      </div>
      <div className="rcs-gauge">
        <small>{fixed ? '프록시 버퍼 · 꺼짐 (X-Accel-Buffering: no)' : `프록시 버퍼 · ${(v.buf / 1024).toFixed(1)}KB / 4KB`}</small>
        <div><i style={{ width: (fixed ? 0 : Math.min(100, (v.buf / B_CAP) * 100)) + '%' }} /></div>
      </div>
      <div className="dv-meters">
        <Meter label="평균 지연" value={v.avg ? sec(v.avg) : '—'} bad={v.avg ? v.avg > 1000 : undefined} />
        <Meter label="최대 지연" value={v.max ? sec(v.max) : '—'} bad={v.max ? v.max > 1000 : undefined} />
        <Meter label="한 번에 도착" value={v.maxBatch ? `${v.maxBatch}개` : '—'} bad={v.maxBatch ? v.maxBatch > 1 : undefined} />
        <Meter label="버퍼에 갇힌 알림" value={`${v.held}개`} bad={v.held > 0} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 03 게이트웨이 idle timeout — 시간은 10배 빠르게 (0.1초 = 1초)
 * ===================================================================== */
const IDLE = 60
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
export function TimeoutDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState({ t: 0, idle: 0, open: true, reconnects: 0, pings: 0, notices: 0, lost: 0, down: 0, lines: [] as Line[] })

  useEffect(() => {
    const T = timers()
    let t = 0, idle = 0, open = true, upAt = 0, reconnects = 0, pings = 0, notices = 0, lost = 0, down = 0, n = 0
    let next = Math.round(rand(6, 12))
    let lines: Line[] = []
    const log = (text: string, tone: Tone = '') => { lines = [...lines.slice(-5), { id: n++, t: mmss(t), text, tone }] }
    T.every(() => {
      t++
      const notice = t >= next
      if (notice) next = t + Math.round(rand(35, 140)) // 알림은 띄엄띄엄 와요
      if (open) {
        idle++
        if (fixed && t % 15 === 0) { idle = 0; pings++ } // ✓ 15초마다 `: ping` 주석 한 줄
        if (notice) { idle = 0; notices++; log('알림 도착', 'ok') }
        if (idle >= IDLE) {
          open = false; reconnects++; upAt = t + 4
          log('게이트웨이가 연결을 끊음 (60초 동안 오간 바이트 없음)', 'bad')
        }
      } else {
        down++
        if (notice) { lost++; log('끊긴 사이 보낸 알림을 놓침', 'bad') }
        if (t >= upAt) { open = true; idle = 0; log('EventSource가 다시 연결함', 'warn') }
      }
      setV({ t, idle, open, reconnects, pings, notices, lost, down, lines })
    }, 100)
    return () => T.stop()
  }, [fixed])

  const pct = Math.min(100, (v.idle / IDLE) * 100)
  return (
    <div className="rcs-col">
      <div className="rcs-live">
        <div><small>경과 (10배 빠르게)</small><b>{mmss(v.t)}</b></div>
        <span className={'rcs-pill ' + (v.open ? 'open' : 'connecting')}>{v.open ? '연결됨' : '다시 연결 중'}</span>
      </div>
      <div className={'rcs-gauge' + (pct > 75 ? ' hot' : '')}>
        <small>게이트웨이 idle 타이머 · 마지막 바이트 후 {v.open ? v.idle : 0}초 / {IDLE}초</small>
        <div><i style={{ width: (v.open ? pct : 0) + '%' }} /></div>
      </div>
      <RcsLog lines={v.lines} empty="알림이 오면 여기에 기록돼요" />
      <div className="dv-meters">
        <Meter label="재연결" value={`${v.reconnects}번`} bad={v.t > 70 ? v.reconnects > 0 : undefined} />
        <Meter label="끊겨 있던 시간" value={`${v.down}초`} bad={v.down > 0} />
        <Meter label="받은 핑" value={`${v.pings}번`} />
        <Meter label="놓친 알림" value={`${v.lost}개`} bad={v.lost > 0} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 04 탭마다 SSE — HTTP/1.1 연결 6개 제한
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
  const [chanName] = useState(() => 'rcs-demo-' + Math.random().toString(36).slice(2))
  const shared = fixed && mode === 'leader' // 리더 탭이 받아서 나눠 주는 방식

  // 연결 자리: 문제 그대로면 탭마다 SSE 하나가 자리를 계속 붙잡아요
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
    <div className="rcs-col">
      {fixed && <Seg value={mode} onChange={setMode} className="rcs-seg" options={[['leader', '리더 탭 하나만 연결'], ['h2', 'HTTP/2 서버']]} />}
      <div className="rcs-tabs">
        {tabs.map((t, i) => {
          const holds = sseHolders.includes(t)
          const isLeader = fixed && mode === 'leader' && i === 0
          return shared && !isLeader
            ? <FollowerTab key={t} id={t} chan={chanName} />
            : (
              <div key={t} className={'rcs-tab' + (sseWaiting.includes(t) ? ' stuck' : '')}>
                <b>탭 {t}{isLeader && <em>리더</em>}</b>
                <small>{holds ? `알림 ${got[t] ?? 0}개` : '알림 연결 대기…'}</small>
              </div>
            )
        })}
      </div>
      <div className="rcs-slots" aria-label="연결 자리">
        <small>{usesH2 ? 'shop.example 연결 (HTTP/2 · 한 연결에 여러 요청)' : `shop.example 연결 자리 (HTTP/1.1 · 최대 ${SLOTS}개)`}</small>
        <div>
          {usesH2
            ? <span className="rcs-slot h2">연결 1개 · 알림 스트림 {tabs.length}개 + 요청 {inflight.length}개</span>
            : Array.from({ length: SLOTS }, (_, i) => {
              const sse = i < sseHolders.length
              const req = !sse && i < sseHolders.length + inflight.length
              return <span key={i} className={'rcs-slot' + (sse ? ' sse' : req ? ' req' : '')}>{sse ? `SSE 탭${sseHolders[i]}` : req ? 'API' : '비어 있음'}</span>
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
        <Meter label="가장 오래 기다림" value={waiting.length ? sec(longestWait) : lastDone ? `${Math.round(lastDone.end! - lastDone.t0)}ms` : '—'} bad={waiting.length ? longestWait > 1000 : lastDone ? false : undefined} />
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
  return <div className="rcs-tab follow"><b>탭 {id}</b><small>알림 {n}개 · 리더가 전달</small></div>
}

/* =====================================================================
 * 05 재연결 사이에 놓친 이벤트 — Last-Event-ID
 * ===================================================================== */
type Got = 'live' | 'replay'
export function LastIdDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState({ seq: 0, got: new Map<number, Got>(), state: 'connecting' as 'open' | 'connecting', tries: 0, lastId: 0, down: false, replayed: 0 })
  const api = useRef<{ drop: () => void } | null>(null)

  useEffect(() => {
    const T = timers()
    const KEEP = 100 // 서버가 보관하는 최근 알림 수
    let seq = 0, lastId = 0, tries = 0, replayed = 0
    let open = false, down = false
    const got = new Map<number, Got>()
    const deliver = (s: number, how: Got) => {
      if (s <= lastId) return // seq로 중복을 걸러요
      got.set(s, how); lastId = s
    }
    const connect = () => { // EventSource가 하는 일: 실패하면 retry 간격(여기선 1초) 뒤 다시
      tries++
      T.later(() => {
        if (down) { connect(); return }
        open = true
        // ✓ 서버가 Last-Event-ID 뒤의 알림을 먼저 다시 보내요 / ✕ 헤더를 안 보고 지금부터만 보내요
        if (fixed) for (let s = Math.max(lastId + 1, seq - KEEP + 1); s <= seq; s++) { deliver(s, 'replay'); replayed++ }
      }, 1000)
    }
    T.later(() => { open = true }, 150)
    T.every(() => {
      seq++
      if (open && !down) deliver(seq, 'live')
      setV({ seq, got: new Map(got), state: open ? 'open' : 'connecting', tries, lastId, down, replayed })
    }, 400)
    api.current = {
      drop() {
        if (down) return
        down = true
        T.later(() => { if (open) { open = false; connect() } }, 300) // 브라우저가 끊김을 알아채는 데 걸리는 시간
        T.later(() => { down = false }, 3000)
      },
    }
    return () => { T.stop(); api.current = null }
  }, [fixed])

  const missed = Math.max(0, v.seq - v.got.size)
  const from = Math.max(1, v.seq - 39)
  const cells = []
  for (let s = from; s <= v.seq; s++) cells.push(<i key={s} className={'rcs-cell ' + (v.got.get(s) ?? 'miss')} title={'id ' + s} />)
  return (
    <div className="rcs-col">
      <div className="rcs-live">
        <div><small>마지막으로 받은 id</small><b>{v.lastId ? '#' + v.lastId : '—'}</b></div>
        <span className={'rcs-pill ' + (v.down ? 'closed' : v.state)}>{v.down ? '와이파이 끊김' : v.state === 'open' ? '연결됨' : '다시 연결 중'}</span>
      </div>
      <div className="rcs-cells" aria-label="최근 알림 40개">{cells}</div>
      <div className="rcs-legend"><span>실시간으로 받음</span><span className="replay">다시 붙은 뒤 받음</span><span className="miss">놓침</span></div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => api.current?.drop()} disabled={v.down}>{v.down ? '와이파이 끊김…' : '와이파이 3초 끊기'}</button>
      </div>
      <div className="dv-meters">
        <Meter label="놓친 알림" value={`${missed}개`} bad={v.seq > 3 ? missed > 0 : undefined} />
        <Meter label="다시 받은 알림" value={`${v.replayed}개`} />
        <Meter label="재연결 시도" value={`${Math.max(0, v.tries)}번`} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 06 EventSource에 헤더를 못 붙여 URL에 토큰
 * ===================================================================== */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const p2 = (n: number) => String(n).padStart(2, '0')
function stamp() {
  const d = new Date()
  const off = -d.getTimezoneOffset()
  const tz = (off >= 0 ? '+' : '-') + p2(Math.floor(Math.abs(off) / 60)) + p2(Math.abs(off) % 60)
  return `${p2(d.getDate())}/${MON[d.getMonth()]}/${d.getFullYear()}:${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${tz}`
}
const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTE4MiIsImV4cCI6MTk5OTk5OTk5OX0.dEmO_fAkE_sIgNaTuRe'
type ALine = { id: number; text: string; tone: Tone }
export function TokenDemo({ fixed }: { fixed: boolean }) {
  const [lines, setLines] = useState<ALine[]>([])
  const [streamUrl, setStreamUrl] = useState('')
  const [reuse, setReuse] = useState<'' | 'ok' | 'no'>('')
  const [busy, setBusy] = useState(false)
  const T = useRef<Timers | null>(null)
  const n = useRef(0)
  useEffect(() => { const t = timers(); T.current = t; return () => { t.stop(); T.current = null } }, [])

  const add = (ip: string, req: string, code: number, tone: Tone = '') => {
    const text = `${ip} - - [${stamp()}] "${req} HTTP/1.1" ${code} -`
    const id = n.current++
    setLines(l => [...l.slice(-5), { id, text, tone }])
  }
  const connect = () => {
    setBusy(true); setReuse('')
    if (!fixed) {
      const url = `/api/notices/stream?token=${FAKE_TOKEN}`
      T.current?.later(() => { add('203.0.113.24', 'GET ' + url, 200, 'bad'); setStreamUrl(url); setBusy(false) }, 250)
      return
    }
    const ticket = 'tk_' + Math.random().toString(36).slice(2, 10)
    const url = `/api/notices/stream?ticket=${ticket}`
    T.current?.later(() => add('203.0.113.24', 'POST /api/notices/ticket', 200), 200) // 토큰은 Authorization 헤더라 로그에 안 남아요
    T.current?.later(() => { add('203.0.113.24', 'GET ' + url, 200); setStreamUrl(url); setBusy(false) }, 450)
  }
  const steal = () => {
    if (!streamUrl) return
    setBusy(true)
    T.current?.later(() => {
      if (!fixed) {
        add('198.51.100.7', 'GET ' + streamUrl, 200, 'bad') // 남의 알림 스트림이 열려요
        add('198.51.100.7', 'GET /api/orders', 200, 'bad') // 같은 토큰을 헤더에 넣으면 다른 API도 돼요
        setReuse('ok')
      } else {
        add('198.51.100.7', 'GET ' + streamUrl, 401, 'ok') // 이미 쓴 티켓
        setReuse('no')
      }
      setBusy(false)
    }, 300)
  }

  return (
    <div className="rcs-col">
      <div className="rcs-code-line"><small>브라우저</small>
        <code>{fixed ? "new EventSource('/api/notices/stream?ticket=' + ticket)" : "new EventSource('/api/notices/stream?token=' + accessToken)"}</code>
      </div>
      <div className="rcs-access">
        <small>nginx access.log</small>
        <ol>
          {lines.length === 0 && <li className="rcs-empty">연결을 열면 서버 접근 로그가 여기에 쌓여요</li>}
          {lines.map(l => <li key={l.id} className={l.tone}>{l.text}</li>)}
        </ol>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={connect} disabled={busy}>알림 연결 열기</button>
        <button type="button" className="btn sm ghost" onClick={steal} disabled={busy || !streamUrl}>로그 속 URL을 다른 PC에서 다시 쓰기</button>
      </div>
      {reuse === 'ok' && <p className="rcs-hint bad">로그만 본 사람이 이 사용자의 알림을 받고, 주문 목록까지 불러왔어요</p>}
      {reuse === 'no' && <p className="rcs-hint ok">이미 쓴 티켓이라 401로 거절됐어요</p>}
      <div className="dv-meters">
        <Meter label="로그에 남은 값" value={!streamUrl ? '—' : fixed ? '쓴 티켓' : '액세스 토큰'} bad={!streamUrl ? undefined : !fixed} />
        <Meter label="그 값의 수명" value={!streamUrl ? '—' : fixed ? '30초 · 1회' : '토큰 만료까지'} bad={!streamUrl ? undefined : !fixed} />
        <Meter label="다시 쓰기" value={reuse === 'ok' ? '성공' : reuse === 'no' ? '401 거절' : '—'} bad={reuse ? reuse === 'ok' : undefined} />
      </div>
    </div>
  )
}
