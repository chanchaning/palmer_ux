/* 11 실시간 · WebSocket — 데모 모음. fixed=false 문제 그대로, true 해결 적용
 * 서버·소켓·네트워크는 전부 이 파일 안의 가짜예요. 바깥으로 연결을 열지 않아요. */
import { memo, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Meter } from '../ui'

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const sec = (ms: number) => (ms / 1000).toFixed(1) + '초'
const valueOf = (s: number) => Math.round((21 + Math.sin(s / 4) * 2.4 + ((s * 37) % 7) / 10) * 10) / 10

/** 데모 안 타이머 묶음 — stop() 하면 기다리던 것까지 전부 멈춰요 */
function makeTimers() {
  const outs = new Set<number>()
  const ins = new Set<number>()
  let alive = true
  return {
    later(fn: () => void, ms: number) {
      const id = window.setTimeout(() => { outs.delete(id); if (alive) fn() }, ms)
      outs.add(id)
    },
    every(fn: () => void, ms: number) {
      const id = window.setInterval(() => { if (alive) fn() }, ms)
      ins.add(id)
      return () => { clearInterval(id); ins.delete(id) }
    },
    stop() { alive = false; outs.forEach(clearTimeout); ins.forEach(clearInterval) },
  }
}
type Timers = ReturnType<typeof makeTimers>

type Conn = 'open' | 'connecting' | 'closed'
const PILL: Record<Conn, string> = { open: '연결됨', connecting: '연결 중', closed: '끊김' }

function Live({ label, value, seq, conn, frozen, unit = '°C', children }: {
  label: string; value: string; seq?: number; conn: Conn; frozen?: boolean; unit?: string; children?: ReactNode
}) {
  return (
    <div className="rcw-live">
      <div>
        <small>{label}</small>
        <b className={frozen ? 'frozen' : ''}>{value}<em>{unit}</em></b>
        {seq !== undefined && <span className="rcw-seqno">#{seq}</span>}
      </div>
      <span className={'rcw-pill ' + conn}>{PILL[conn]}</span>
      {children}
    </div>
  )
}

/* =====================================================================
 * 하트비트 없는 반쯤 열린 연결
 * ===================================================================== */
type HbView = { conn: Conn; seq: number; ago: number; detect: number | null; since: number; pings: number; down: boolean }
export function HeartbeatDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState<HbView>({ conn: 'connecting', seq: 0, ago: 0, detect: null, since: 0, pings: 0, down: false })
  const api = useRef<(() => void) | null>(null)

  useEffect(() => {
    const t = makeTimers()
    let seq = 0, lastSeq = 0, lastAt = performance.now(), lastPong = performance.now()
    let conn: Conn = 'connecting'
    let sock: { broken: boolean } | null = null
    let linkDown = false, dropAt = 0, detect: number | null = null, pings = 0
    const connect = () => {
      conn = 'connecting'
      t.later(() => {
        if (linkDown) { conn = 'closed'; t.later(connect, 600); return }
        sock = { broken: false }; conn = 'open'; lastPong = performance.now()
      }, 250)
    }
    const drop = () => { sock = null; conn = 'closed'; t.later(connect, 300) }
    connect()
    // 가짜 서버: 0.5초마다 값을 보내요. 연결이 망가졌으면 어디에도 닿지 않아요
    t.every(() => { seq++; if (sock && !sock.broken) { lastSeq = seq; lastAt = performance.now() } }, 500)
    // ✓ 앱 레벨 하트비트: 1초마다 ping, 2초 넘게 pong이 없으면 스스로 끊어요
    if (fixed) t.every(() => {
      if (!sock) return
      const now = performance.now()
      if (now - lastPong > 2000) { if (dropAt && detect === null) detect = now - dropAt; drop(); return }
      pings++
      const s = sock
      t.later(() => { if (s === sock && !s.broken) lastPong = performance.now() }, 60)
    }, 1000)
    t.every(() => {
      const now = performance.now()
      setV({ conn, seq: lastSeq, ago: now - lastAt, detect, since: dropAt ? now - dropAt : 0, pings, down: linkDown })
    }, 200)
    api.current = () => {
      if (linkDown || !sock) return
      linkDown = true; dropAt = performance.now(); detect = null
      sock.broken = true // 공유기가 연결 기록을 잃어요. 양쪽 다 끊겼다는 신호를 못 받아요
      t.later(() => { linkDown = false }, 2000)
    }
    return () => { t.stop(); api.current = null }
  }, [fixed])

  const stale = v.conn === 'open' && v.ago > 1500
  return (
    <div className="rcw-col">
      <Live label="3번 라인 온도" value={v.seq ? valueOf(v.seq).toFixed(1) : '—'} seq={v.seq} conn={v.conn} frozen={stale} />
      <p className="dv-log">{fixed
        ? <>하트비트 1초마다 ping → pong <b>{v.pings}번</b></>
        : <>하트비트 없음 · <code>onclose</code>만 기다려요</>}</p>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => api.current?.()} disabled={v.down || v.conn !== 'open'}>
          {v.down ? '공유기 재부팅 중…' : '공유기 재부팅 (2초)'}
        </button>
      </div>
      <div className="dv-meters">
        <Meter label="마지막 메시지" value={sec(v.ago) + ' 전'} bad={v.seq ? stale : undefined} />
        <Meter label="끊김 알아챔" value={v.detect !== null ? sec(v.detect) + ' 만에' : v.since ? sec(v.since) + '째 모름' : '—'}
          bad={v.detect !== null ? false : v.since ? true : undefined} />
        <Meter label="화면 표시" value={stale ? '연결됨 (거짓)' : PILL[v.conn]} bad={stale ? true : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 재연결 폭주 (Thundering Herd)
 * ===================================================================== */
const HERD = 40, CAP = 8, HIST = 40
type Cl = { on: boolean; at: number; n: number }
type StormView = { cls: boolean[]; down: boolean; crashes: number; peak: number; hist: number[]; restarted: boolean }
export function StormDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState<StormView>({ cls: Array(HERD).fill(true), down: false, crashes: 0, peak: 0, hist: Array(HIST).fill(0), restarted: false })
  const api = useRef<(() => void) | null>(null)

  useEffect(() => {
    const t = makeTimers()
    const cls: Cl[] = Array.from({ length: HERD }, () => ({ on: true, at: 0, n: 0 }))
    const hist: number[] = Array(HIST).fill(0)
    let downUntil = 0, crashes = 0, peak = 0, restarted = false
    const schedule = (c: Cl, now: number) => {
      c.on = false
      if (fixed) { c.n++; c.at = now + rand(0, Math.min(16000, 1000 * 2 ** c.n)) } // ✓ 지수 백오프 + full jitter
      else c.at = now + 1000 // ✕ 모두 똑같이 1초 뒤
    }
    const goDown = (now: number, ms: number) => {
      downUntil = now + ms
      cls.forEach(c => { if (c.on) schedule(c, now) })
    }
    t.every(() => {
      const now = performance.now()
      const knock = cls.filter(c => !c.on && c.at <= now)
      hist.push(knock.length); hist.shift()
      if (restarted) peak = Math.max(peak, knock.length)
      if (now < downUntil) knock.forEach(c => schedule(c, now)) // 서버가 아직 안 떴어요
      else if (knock.length > CAP) { crashes++; knock.forEach(c => schedule(c, now)); goDown(now, 1200) } // 한꺼번에 몰려서 다시 죽어요
      else knock.forEach(c => { c.on = true; c.n = 0 })
      setV({ cls: cls.map(c => c.on), down: now < downUntil, crashes, peak, hist: [...hist], restarted })
    }, 100)
    api.current = () => { crashes = 0; peak = 0; restarted = true; goDown(performance.now(), 1000) }
    return () => { t.stop(); api.current = null }
  }, [fixed])

  const on = v.cls.filter(Boolean).length
  return (
    <div className="rcw-col">
      <div className="rcw-server">
        <span className={'rcw-pill ' + (v.down ? 'closed' : 'open')}>{v.down ? '서버 다운' : '서버 정상'}</span>
        <small>0.1초에 {CAP}개 넘게 몰리면 다시 죽어요</small>
      </div>
      <div className="rcw-dots" aria-label={`클라이언트 ${HERD}개 중 ${on}개 연결`}>
        {v.cls.map((c, i) => <i key={i} className={c ? 'on' : ''} />)}
      </div>
      <div className="rcw-bars" aria-label="0.1초마다 들어온 접속 시도">
        <span className="rcw-cap" style={{ bottom: `${(CAP / HERD) * 100}%` }} />
        {v.hist.map((n, i) => <i key={i} className={n > CAP ? 'over' : ''} style={{ height: `${(Math.min(n, HERD) / HERD) * 100}%` }} />)}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => api.current?.()} disabled={v.down}>서버 재시작</button>
      </div>
      <div className="dv-meters">
        <Meter label="붙은 클라이언트" value={`${on}/${HERD}`} bad={v.restarted ? on < HERD && v.crashes > 0 : undefined} />
        <Meter label="몰려서 다시 죽음" value={`${v.crashes}번`} bad={v.restarted ? v.crashes > 0 : undefined} />
        <Meter label="0.1초 최대 접속" value={`${v.peak}개`} bad={v.restarted ? v.peak > CAP : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 재연결 후 구독 · 누락 이벤트 복구 실패
 * ===================================================================== */
type Got = 'live' | 'replay'
type WsView = { seq: number; got: Map<number, Got>; conn: Conn; tries: number; lastSeq: number; down: boolean; staleMs: number }
export function ResubDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState<WsView>({ seq: 0, got: new Map(), conn: 'connecting', tries: 0, lastSeq: 0, down: false, staleMs: 0 })
  const api = useRef<(() => void) | null>(null)

  useEffect(() => {
    const t = makeTimers()
    // 가짜 서버: 0.4초마다 이벤트 하나, 순서 번호(seq)를 붙여 최근 것들을 보관해요
    const srv = { seq: 0 }
    let down = false
    let conn: { sub: boolean } | null = null
    let state: Conn = 'connecting'
    let lastSeq = 0, backoff = 0, tries = 0, lastAt = performance.now(), firstSub = true
    const got = new Map<number, Got>()
    const deliver = (s: number, how: Got) => {
      if (fixed && s <= lastSeq) return // 다시 받은 중복은 버려요
      got.set(s, how); lastSeq = Math.max(lastSeq, s); lastAt = performance.now()
    }
    const subscribe = () => {
      if (!conn) return
      conn.sub = true
      if (fixed) for (let s = lastSeq + 1; s <= srv.seq; s++) deliver(s, 'replay') // since=lastSeq 이후를 먼저 보내 줘요
    }
    const onClose = () => {
      conn = null; state = 'closed'
      const cap = Math.min(4000, 400 * 2 ** backoff++)
      t.later(connect, rand(cap / 2, cap))
    }
    function connect() {
      state = 'connecting'; tries++
      t.later(() => {
        if (down) { onClose(); return }
        conn = { sub: false }; state = 'open'; backoff = 0
        if (fixed || firstSub) { firstSub = false; subscribe() } // ✕ 문제 코드는 첫 연결에서만 구독해요
      }, 150)
    }
    connect()
    t.every(() => {
      srv.seq++
      if (conn && conn.sub && !down) deliver(srv.seq, 'live')
      setV({ seq: srv.seq, got: new Map(got), conn: state, tries: Math.max(0, tries - 1), lastSeq, down, staleMs: performance.now() - lastAt })
    }, 400)
    api.current = () => {
      if (down) return
      down = true
      t.later(() => { if (conn) onClose() }, 300) // 하트비트로 끊김을 알아채는 데 걸리는 시간
      t.later(() => { down = false }, 3000)
    }
    return () => { t.stop(); api.current = null }
  }, [fixed])

  const missed = Math.max(0, v.seq - v.got.size)
  const frozen = v.conn === 'open' && v.staleMs > 1500
  const from = Math.max(1, v.seq - 39)
  const cells = []
  for (let s = from; s <= v.seq; s++) cells.push(<i key={s} className={'rcw-cell ' + (v.got.get(s) ?? 'miss')} title={'#' + s} />)
  return (
    <div className="rcw-col">
      <Live label="3번 라인 온도" value={v.lastSeq ? valueOf(v.lastSeq).toFixed(1) : '—'} seq={v.lastSeq} conn={v.conn} frozen={frozen} />
      {fixed && v.conn !== 'open' && v.lastSeq > 0 && <div className="rcw-banner" role="status">연결이 끊겼어요 · {sec(v.staleMs)} 전 값이에요. 다시 연결하고 있어요</div>}
      <div className="rcw-cells" aria-label="최근 이벤트 40개">{cells}</div>
      <div className="rcw-legend"><span className="live">실시간으로 받음</span><span className="replay">재연결 뒤 다시 받음</span><span className="miss">놓침</span></div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => api.current?.()} disabled={v.down}>{v.down ? '와이파이 끊김…' : '와이파이 3초 끊기'}</button>
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
 * 앱 복귀 후 끊겨 있는 소켓
 * ===================================================================== */
type RsView = { conn: Conn; seq: number; ago: number; hidden: boolean; back: number | null; since: number; step: string }
export function ResumeDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState<RsView>({ conn: 'connecting', seq: 0, ago: 0, hidden: false, back: null, since: 0, step: '' })
  const api = useRef<(() => void) | null>(null)

  useEffect(() => {
    const t = makeTimers()
    let seq = 0, lastSeq = 0, lastAt = performance.now()
    let conn: Conn = 'connecting'
    let sock: { dead: boolean } | null = null
    let hidden = false, wakeAt = 0, back: number | null = null, step = ''
    const got = (s: number) => {
      lastSeq = s; lastAt = performance.now()
      if (wakeAt && back === null) back = lastAt - wakeAt
    }
    const open = (then?: () => void) => {
      conn = 'connecting'
      t.later(() => { sock = { dead: false }; conn = 'open'; then?.() }, 250)
    }
    open()
    // 가짜 서버: 0.5초마다 값. 숨어 있는 동안은 JS가 멈춰서 아무것도 처리하지 못해요
    t.every(() => { seq++; if (!hidden && sock && !sock.dead) got(seq) }, 500)
    const sleep = () => {
      if (hidden) return
      hidden = true; back = null; wakeAt = 0; step = ''
      if (sock) sock.dead = true // 백그라운드에서 운영체제가 연결을 정리해요. close 이벤트는 오지 않아요
    }
    const wake = () => {
      if (!hidden) return
      hidden = false; wakeAt = performance.now()
      if (!fixed) return // ✕ 아무것도 확인하지 않아요. readyState는 여전히 OPEN
      step = 'ping 보냄…'
      const s = sock
      t.later(() => {
        if (s && !s.dead && s === sock) { step = 'pong 받음 · 그대로 써요'; return }
        step = 'pong 없음 · 새로 연결'
        sock = null
        open(() => t.later(() => { step = '스냅숏으로 최신 값 채움'; got(seq) }, 150))
      }, 600)
    }
    const onVis = () => (document.hidden ? sleep() : wake())
    document.addEventListener('visibilitychange', onVis)
    t.every(() => {
      const now = performance.now()
      setV({ conn, seq: lastSeq, ago: now - lastAt, hidden, back, since: wakeAt ? now - wakeAt : 0, step })
    }, 200)
    api.current = () => { sleep(); t.later(wake, 3000) }
    return () => { t.stop(); document.removeEventListener('visibilitychange', onVis); api.current = null }
  }, [fixed])

  const stale = !v.hidden && v.conn === 'open' && v.ago > 1500
  return (
    <div className="rcw-col">
      <div className="rcw-phone">
        <Live label="배송 기사 위치 갱신" value={v.seq ? String(v.seq) : '—'} unit="번째" conn={v.conn} frozen={stale} />
        {v.hidden && <div className="rcw-lock" role="status">화면 잠김 · 백그라운드</div>}
      </div>
      <p className="dv-log">{v.step ? <>돌아온 뒤: <b>{v.step}</b></> : fixed ? '돌아오면 ping으로 연결부터 확인해요' : '돌아와도 아무것도 확인하지 않아요'}</p>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => api.current?.()} disabled={v.hidden || v.conn !== 'open'}>휴대폰 잠갔다 3초 뒤 켜기</button>
      </div>
      <div className="dv-meters">
        <Meter label="화면 값 나이" value={sec(v.ago)} bad={v.seq ? stale : undefined} />
        <Meter label="돌아온 뒤 최신 값까지" value={v.back !== null ? sec(v.back) : v.since && !v.hidden ? sec(v.since) + '째 멈춤' : '—'}
          bad={v.back !== null ? v.back > 3000 : v.since && !v.hidden ? true : undefined} />
        <Meter label="화면 표시" value={stale ? '연결됨 (거짓)' : v.hidden ? '숨김' : PILL[v.conn]} bad={stale ? true : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 토큰 만료 · 로그아웃 뒤에도 열린 소켓
 * ===================================================================== */
type Note = { id: number; text: string; leak: boolean }
type AuView = { user: string | null; sock: boolean; notes: Note[]; leaked: number; tokenLeft: number; staleMs: number; log: string[] }
const LIFE = 6000
export function AuthDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState<AuView>({ user: '민지', sock: false, notes: [], leaked: 0, tokenLeft: LIFE, staleMs: 0, log: [] })
  const api = useRef<{ logout: () => void; login: () => void } | null>(null)

  useEffect(() => {
    const t = makeTimers()
    let user: string | null = '민지'
    let tokenExp = performance.now() + LIFE
    let sock: { user: string; exp: number } | null = null
    let n = 0, leaked = 0, staleMs = 0
    const notes: Note[] = []
    const log: string[] = []
    const say = (s: string) => { log.push(s); if (log.length > 3) log.shift() }
    const connect = () => { if (user) { sock = { user, exp: tokenExp }; say('소켓 연결 (토큰은 연결할 때 한 번 확인)') } }
    connect()
    // 가짜 서버: 연결에 묶인 사용자에게 1초마다 알림을 보내요
    t.every(() => {
      if (!sock) return
      n++
      const leak = user === null
      if (leak) leaked++
      notes.push({ id: n, text: `${sock.user} 님, 새 주문 #${n}`, leak })
      if (notes.length > 4) notes.shift()
    }, 1000)
    t.every(() => {
      const now = performance.now()
      if (user && now > tokenExp - 1000) { // 화면용 토큰은 만료 1초 전에 HTTP로 갱신돼요
        tokenExp = now + LIFE
        say('HTTP 토큰 갱신')
        if (fixed && sock) { sock.exp = tokenExp; say('소켓에도 새 토큰 전달 → 서버가 만료 연장') } // ✓
      }
      if (sock && now > sock.exp) {
        if (fixed) { sock = null; say('서버: 만료된 토큰이라 4401로 닫음') } // ✓ 서버도 만료를 확인해요
        else staleMs += 100
      }
      setV({ user, sock: !!sock, notes: [...notes], leaked, tokenLeft: Math.max(0, tokenExp - now), staleMs, log: [...log] })
    }, 100)
    api.current = {
      logout() {
        if (!user) return
        user = null
        say('로그아웃: 토큰 지우고 로그인 화면으로')
        if (fixed && sock) { sock = null; say('소켓 닫음 (1000, logout)') } // ✓ 연결도 같이 끊어요
      },
      login() {
        if (user) return
        user = '민지'; tokenExp = performance.now() + LIFE; leaked = 0; staleMs = 0
        notes.length = 0
        if (!sock) connect()
      },
    }
    return () => { t.stop(); api.current = null }
  }, [fixed])

  return (
    <div className="rcw-col">
      <div className="rcw-app">
        <div className="rcw-app-bar">
          <b>{v.user ? `${v.user} 님` : '로그인 화면'}</b>
          <small>{v.user ? `토큰 ${sec(v.tokenLeft)} 남음` : '로그아웃됨'}</small>
          <span className={'rcw-pill ' + (v.sock ? 'open' : 'closed')}>{v.sock ? '소켓 열림' : '소켓 닫힘'}</span>
        </div>
        <ul className="rcw-notes" aria-label="받은 알림">
          {v.notes.length === 0 && <li className="rcw-empty">알림 없음</li>}
          {v.notes.map(n => <li key={n.id} className={n.leak ? 'leak' : ''}>{n.text}{n.leak && <em>로그아웃 상태</em>}</li>)}
        </ul>
      </div>
      <ol className="rcw-mini-log" aria-label="인증 기록">{v.log.map((l, i) => <li key={i}>{l}</li>)}</ol>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => api.current?.logout()} disabled={!v.user}>로그아웃</button>
        <button type="button" className="btn sm ghost" onClick={() => api.current?.login()} disabled={!!v.user}>다시 로그인</button>
      </div>
      <div className="dv-meters">
        <Meter label="로그아웃 뒤 받은 알림" value={`${v.leaked}개`} bad={v.user ? undefined : v.leaked > 0} />
        <Meter label="만료 토큰으로 버틴 시간" value={sec(v.staleMs)} bad={v.staleMs > 0 ? true : v.user ? false : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 서버 여러 대에서 메시지 누락
 * ===================================================================== */
const PEOPLE = ['민지', '준호', '서연', '도윤', '하은', '지우']
const srvOf = (i: number) => (i % 2 ? 'B' : 'A')
type ScView = { sent: number; should: number; got: number; recv: number[]; from: number; hit: (boolean | null)[] }
export function ScaleDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState<ScView>({ sent: 0, should: 0, got: 0, recv: PEOPLE.map(() => 0), from: -1, hit: PEOPLE.map(() => null) })

  useEffect(() => {
    const t = makeTimers()
    let sent = 0, should = 0, got = 0
    const recv = PEOPLE.map(() => 0)
    t.every(() => {
      const from = Math.floor(Math.random() * PEOPLE.length)
      sent++
      const hit = PEOPLE.map((_, j) => {
        if (j === from) return null
        should++
        // ✕ 받은 서버가 자기 메모리의 방 목록에만 보내요 / ✓ Redis로 다른 서버에도 전달해요
        const ok = fixed || srvOf(j) === srvOf(from)
        if (ok) { got++; recv[j]++ }
        return ok
      })
      setV({ sent, should, got, recv: [...recv], from, hit })
    }, 1100)
    return () => t.stop()
  }, [fixed])

  const box = (s: 'A' | 'B') => (
    <div className="rcw-node">
      <b>서버 {s}</b>
      <div className="rcw-chips">
        {PEOPLE.map((p, i) => srvOf(i) !== s ? null : (
          <span key={p} className={'rcw-chip' + (i === v.from ? ' from' : v.hit[i] === true ? ' ok' : v.hit[i] === false ? ' miss' : '')}>
            {p}<small>{i === v.from ? '보냄' : v.recv[i]}</small>
          </span>
        ))}
      </div>
    </div>
  )
  const missed = v.should - v.got
  return (
    <div className="rcw-col">
      <div className="rcw-lb">로드밸런서 · ‘3번 방’ 6명</div>
      <div className="rcw-nodes">{box('A')}{box('B')}</div>
      <div className={'rcw-bus' + (fixed ? ' on' : '')}>{fixed ? 'Redis pub/sub · 서버끼리 방 메시지를 나눠요' : '서버끼리 연결 없음'}</div>
      <div className="dv-meters">
        <Meter label="보낸 메시지" value={`${v.sent}개`} />
        <Meter label="받아야 할 횟수 중" value={v.should ? `${Math.round((v.got / v.should) * 100)}%` : '—'} bad={v.should ? missed > 0 : undefined} />
        <Meter label="못 받은 횟수" value={`${missed}번`} bad={v.should ? missed > 0 : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 메시지 순서 뒤바뀜 · 중복
 * ===================================================================== */
const OTX = ['지금 나가요', '버스 탔어요', '10분 늦어요', '도착했어요']
const OLAT = [500, 120, 1000, 250] // 요청마다 걸리는 시간 (세 번째는 응답이 늦어요)
const OTIMEOUT = 700, ORETRY = 200
type Bub = { k: string; i: number; seq?: number; pending?: boolean }
const bySeq = (a: Bub, b: Bub) => (a.seq ?? Infinity) - (b.seq ?? Infinity)
export function OrderDemo({ fixed }: { fixed: boolean }) {
  const [mine, setMine] = useState<Bub[]>([])
  const [theirs, setTheirs] = useState<Bub[]>([])
  const [busy, setBusy] = useState(false)
  const tm = useRef<Timers | null>(null)
  useEffect(() => { const t = makeTimers(); tm.current = t; return () => { t.stop(); tm.current = null } }, [])

  const send = () => {
    const t = tm.current
    if (!t || busy) return
    setMine([]); setTheirs([]); setBusy(true)
    let seq = 0
    const seen = new Set<string>()
    // 가짜 서버: 받은 순서대로 seq를 매기고 웹소켓으로 두 화면에 뿌려요
    const recv = (i: number, cid: string, ack?: () => void) => {
      if (fixed && seen.has(cid)) { ack?.(); return } // ✓ 같은 cid는 다시 저장하지 않아요
      seen.add(cid)
      const s = ++seq
      ack?.()
      t.later(() => {
        if (fixed) {
          setMine(m => m.map(b => (b.k === cid ? { ...b, seq: s, pending: false } : b)).sort(bySeq)) // cid로 찾아 바꿔 끼워요
          setTheirs(m => [...m, { k: cid, i, seq: s }].sort(bySeq))
        } else {
          setMine(m => [...m, { k: `${cid}-${s}`, i, seq: s }]) // ✕ 온 순서대로 또 붙여요
          setTheirs(m => [...m, { k: `${cid}-${s}`, i, seq: s }])
        }
      }, 40)
    }
    OTX.forEach((_, i) => t.later(() => setMine(m => [...m, { k: 'c' + i, i, pending: fixed }]), i * 80)) // 낙관적으로 먼저 그려요
    if (!fixed) {
      // ✕ 네 개를 동시에 REST로 보내요. 늦으면 재시도
      OTX.forEach((_, i) => t.later(() => {
        t.later(() => recv(i, 'c' + i), OLAT[i])
        if (OLAT[i] > OTIMEOUT) t.later(() => t.later(() => recv(i, 'c' + i), ORETRY), OTIMEOUT)
      }, i * 80))
    } else {
      // ✓ 한 줄로 세워 앞 메시지 응답을 받고 다음을 보내요
      const next = (i: number) => {
        if (i >= OTX.length) return
        let acked = false
        const ack = () => { if (!acked) { acked = true; next(i + 1) } }
        t.later(() => recv(i, 'c' + i, ack), OLAT[i])
        if (OLAT[i] > OTIMEOUT) t.later(() => { if (!acked) t.later(() => recv(i, 'c' + i, ack), ORETRY) }, OTIMEOUT)
      }
      next(0)
    }
    t.later(() => setBusy(false), 2600)
  }

  const dup = (l: Bub[]) => l.length - new Set(l.map(b => b.i)).size
  const dupes = dup(mine) + dup(theirs)
  const done = !busy && theirs.length > 0
  const same = mine.map(b => b.i).join() === theirs.map(b => b.i).join()
  const typed = theirs.map(b => b.i).filter((x, j, a) => a.indexOf(x) === j).join() === '0,1,2,3'
  const pane = (title: string, list: Bub[], me: boolean) => (
    <div className="rcw-pane">
      <small>{title}</small>
      <ol>
        {list.map(b => <li key={b.k} className={(me ? 'me' : '') + (b.pending ? ' pending' : '')}>{OTX[b.i]}{b.pending && <em>보내는 중</em>}</li>)}
      </ol>
    </div>
  )
  return (
    <div className="rcw-col">
      <div className="rcw-panes">{pane('내 화면', mine, true)}{pane('상대 화면', theirs, false)}</div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={send} disabled={busy}>{busy ? '보내는 중…' : '4개 빠르게 보내기'}</button>
      </div>
      <div className="dv-meters">
        <Meter label="중복 말풍선" value={`${dupes}개`} bad={done ? dupes > 0 : undefined} />
        <Meter label="두 화면 순서" value={done ? (same ? '같음' : '다름') : '—'} bad={done ? !same : undefined} />
        <Meter label="보낸 순서대로" value={done ? (typed ? '예' : '아니요') : '—'} bad={done ? !typed : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 메시지 폭주로 렌더링 과부하 — 렌더 비용은 진짜예요
 * ===================================================================== */
const busyWait = (ms: number) => { const s = performance.now(); while (performance.now() - s < ms) { /* 일부러 메인 스레드를 잡아요 */ } }
const SYMS = ['삼성', 'LG', 'SK', '현대', '기아', '네이버', '카카오', '셀트리온', '포스코', 'KB', '신한', '한화', 'CJ', 'GS', '롯데', 'KT']
const RATE = 400 // 초당 메시지
const MAX_BEHIND = 400 // 데모가 너무 오래 멈추지 않게 밀린 메시지는 여기까지만 쌓아요
type Px = { p: number[]; at: number }
function createStore(init: Px) {
  let s = init
  const ls = new Set<() => void>()
  return {
    get: () => s,
    set(n: Px) { s = n; ls.forEach(l => l()) },
    sub(l: () => void) { ls.add(l); return () => { ls.delete(l) } },
  }
}
function FloodRow({ name, price }: { name: string; price: number }) {
  busyWait(0.15) // 행 하나 그리는 비용 (서식 계산·차트 조각 같은 일)
  return <li><span>{name}</span><b>{price.toLocaleString('ko-KR')}</b></li>
}
const FloodRowMemo = memo(FloodRow)
type FlStat = { msgs: number; renders: number; lag: number; behind: number; delay: number; running: boolean; left: number }
export function FloodDemo({ fixed }: { fixed: boolean }) {
  const [store] = useState(() => createStore({ p: SYMS.map((_, i) => 10000 + i * 1300), at: 0 }))
  const px = useSyncExternalStore(store.sub, store.get)
  const [st, setSt] = useState<FlStat>({ msgs: 0, renders: 0, lag: 0, behind: 0, delay: 0, running: false, left: 0 })
  const renders = useRef(0)
  const api = useRef<(() => void) | null>(null)
  useEffect(() => { renders.current++ })

  useEffect(() => {
    const t = makeTimers()
    const ch = new MessageChannel() // 메시지마다 따로 실행되는 작업을 만들어요 (웹소켓 onmessage와 같아요)
    let posted = 0, handled = 0, running = false, endAt = 0
    let msgs = 0, lag = 0, expect = performance.now() + 50, firstAt = 0, worst = 0 // worst: 받은 메시지가 화면에 닿기까지 가장 오래 걸린 시간
    const buf = new Map<number, number>()
    let raf = 0
    ch.port1.onmessage = (e: MessageEvent<[number, number, number]>) => {
      const [i, price, sentAt] = e.data
      handled++; msgs++
      if (!fixed) { // ✕ 메시지마다 스토어를 바꿔요 → 메시지마다 렌더
        const cur = store.get()
        const p = cur.p.slice(); p[i] = price
        store.set({ p, at: sentAt })
        worst = Math.max(worst, performance.now() - sentAt)
        return
      }
      buf.set(i, price); if (!firstAt) firstAt = sentAt // ✓ 모아 두었다가 프레임마다 한 번만
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0
        const p = store.get().p.slice()
        buf.forEach((val, k) => { p[k] = val })
        buf.clear()
        store.set({ p, at: firstAt })
        worst = Math.max(worst, performance.now() - firstAt); firstAt = 0
      })
    }
    // 메인 스레드가 얼마나 밀리는지: 50ms 타이머가 늦게 불리는 정도
    t.every(() => { const now = performance.now(); lag = Math.max(lag, now - expect); expect = now + 50 }, 50)
    let stopStream: (() => void) | null = null
    let lastRenders = renders.current, lastAt = performance.now()
    t.every(() => {
      const now = performance.now(), dt = (now - lastAt) / 1000
      const r = renders.current - lastRenders
      lastRenders = renders.current; lastAt = now
      setSt({ msgs: Math.round(msgs / dt), renders: Math.round(r / dt), lag: Math.round(lag), behind: posted - handled,
        delay: Math.round(worst), running, left: running ? Math.max(0, endAt - now) : 0 })
      msgs = 0; lag = 0; worst = 0
    }, 500)
    api.current = () => {
      if (running) return
      const startAt = performance.now()
      let gen = 0
      running = true; endAt = startAt + 4000
      // 서버는 화면 사정과 상관없이 보내요. 타이머가 늦게 불려도 그동안 쌓인 만큼 한꺼번에 도착해요
      stopStream = t.every(() => {
        const now = Math.min(performance.now(), endAt)
        const due = Math.floor(((now - startAt) * RATE) / 1000) - gen
        if (now >= endAt) { running = false; stopStream?.() }
        for (let k = 0; k < due; k++) {
          gen++
          if (posted - handled >= MAX_BEHIND) continue
          const i = Math.floor(Math.random() * SYMS.length)
          ch.port2.postMessage([i, 10000 + i * 1300 + Math.round(rand(-300, 300)), performance.now()])
          posted++
        }
      }, 20)
    }
    return () => { t.stop(); if (raf) cancelAnimationFrame(raf); ch.port1.onmessage = null; ch.port1.close(); ch.port2.close(); api.current = null }
  }, [fixed, store])

  const Row = fixed ? FloodRowMemo : FloodRow
  const active = st.running || st.behind > 0
  return (
    <div className="rcw-col">
      <ul className="rcw-ticker" aria-label="시세">
        {SYMS.map((s, i) => <Row key={s} name={s} price={px.p[i]} />)}
      </ul>
      <input className="rcw-input" placeholder="받는 동안 여기에 타이핑해 보세요" aria-label="입력 시험" />
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => api.current?.()} disabled={st.running}>
          {st.running ? `받는 중… ${sec(st.left)}` : `4초 동안 초당 ${RATE}개 받기`}
        </button>
      </div>
      <div className="dv-meters">
        <Meter label="초당 메시지 · 렌더" value={`${st.msgs} · ${st.renders}번`} bad={active ? st.renders > 120 : undefined} />
        <Meter label="화면에 닿기까지" value={active ? `${st.delay}ms` : '—'} bad={active ? st.delay > 200 : undefined} />
        <Meter label="밀린 메시지" value={`${st.behind}개`} bad={active ? st.behind > 50 : undefined} />
        <Meter label="타이머 최대 지연" value={`${st.lag}ms`} bad={active ? st.lag > 50 : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 큰 메시지 전송과 bufferedAmount
 * ===================================================================== */
const BW = 40_000 // 0.1초에 나가는 바이트 (400KB/s 업로드)
const FILE = 4_000_000, CHUNK = 64_000, HIGH = 128_000
type Qi = { kind: 'file' | 'chat'; left: number; t0: number; id: number }
type BpView = { buffered: number; sent: number; total: number; chats: { id: number; ms: number | null }[] }
export function BackpressureDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState<BpView>({ buffered: 0, sent: 0, total: 0, chats: [] })
  const api = useRef<(() => void) | null>(null)

  useEffect(() => {
    const t = makeTimers()
    const q: Qi[] = []
    let buffered = 0, sent = 0, total = 0, toQueue = 0, nChat = 0
    const chats: { id: number; ms: number | null }[] = []
    const push = (it: Qi) => { q.push(it); buffered += it.left }
    t.every(() => {
      const now = performance.now()
      // ✓ 대기열이 HIGH 아래일 때만 다음 조각을 넣어요
      while (fixed && toQueue > 0 && buffered < HIGH) { const c = Math.min(CHUNK, toQueue); toQueue -= c; push({ kind: 'file', left: c, t0: now, id: 0 }) }
      let budget = BW
      while (budget > 0 && q.length) {
        const h = q[0], take = Math.min(budget, h.left)
        h.left -= take; buffered -= take; budget -= take
        if (h.kind === 'file') sent += take
        if (h.left === 0) {
          q.shift()
          if (h.kind === 'chat') { const c = chats.find(x => x.id === h.id); if (c) c.ms = now - h.t0 }
        }
      }
      setV({ buffered, sent, total, chats: chats.slice(-5).map(c => ({ ...c, ms: c.ms ?? -(now - (q.find(x => x.id === c.id)?.t0 ?? now)) })) })
    }, 100)
    t.every(() => { // 0.8초마다 채팅 하나 (300바이트)
      nChat++
      chats.push({ id: nChat, ms: null }); if (chats.length > 20) chats.shift()
      push({ kind: 'chat', left: 300, t0: performance.now(), id: nChat })
    }, 800)
    api.current = () => {
      total += FILE
      if (fixed) toQueue += FILE
      else push({ kind: 'file', left: FILE, t0: performance.now(), id: 0 }) // ✕ 4MB를 한 번에 send
    }
    return () => { t.stop(); api.current = null }
  }, [fixed])

  const pct = v.total ? Math.round((v.sent / v.total) * 100) : 0
  const last = v.chats.length ? v.chats[v.chats.length - 1] : null
  const worst = v.chats.reduce((m, c) => Math.max(m, Math.abs(c.ms ?? 0)), 0)
  return (
    <div className="rcw-col">
      <div className="rcw-buf">
        <small>bufferedAmount · {Math.round(v.buffered / 1000).toLocaleString('ko-KR')}KB</small>
        <div className="rcw-track"><i style={{ width: `${Math.min(100, (v.buffered / FILE) * 100)}%` }} /></div>
        <small>파일 전송 {pct}%</small>
        <div className="rcw-track ok"><i style={{ width: `${pct}%` }} /></div>
      </div>
      <ul className="rcw-chats" aria-label="최근 채팅 지연">
        {v.chats.map(c => {
          const ms = c.ms ?? 0, wait = ms < 0
          return <li key={c.id} className={Math.abs(ms) > 1000 ? 'slow' : ''}>채팅 #{c.id}<b>{wait ? `${sec(-ms)}째 대기` : `${Math.round(ms)}ms`}</b></li>
        })}
      </ul>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => api.current?.()} disabled={v.total > 0 && v.sent < v.total}>사진 묶음 4MB 보내기</button>
      </div>
      <div className="dv-meters">
        <Meter label="최근 채팅 지연" value={last ? (last.ms !== null && last.ms < 0 ? sec(-last.ms) + '+' : `${Math.round(last.ms ?? 0)}ms`) : '—'} bad={v.total ? worst > 1000 : undefined} />
        <Meter label="가장 늦은 채팅" value={sec(worst)} bad={v.total ? worst > 1000 : undefined} />
        <Meter label="파일" value={`${pct}%`} />
      </div>
    </div>
  )
}
