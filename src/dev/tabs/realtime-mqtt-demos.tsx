/* 11 실시간 통신 · MQTT 데모 — fixed=false 문제 그대로, true 해결 적용
 * 브로커·기기·탭은 전부 이 파일 안의 가짜예요. 바깥으로 연결을 열지 않아요. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Meter } from '../ui'

const fmt = (n: number) => n.toLocaleString('ko-KR')
const hex4 = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')

/* ---------- 타이머 묶음 — 이펙트 정리 때 한 번에 멈춰요 ---------- */
function timers() {
  const ids = new Set<number>()
  const ivs = new Set<number>()
  return {
    later(fn: () => void, ms: number) {
      const id = window.setTimeout(() => { ids.delete(id); fn() }, ms)
      ids.add(id)
    },
    every(fn: () => void, ms: number) { ivs.add(window.setInterval(fn, ms)) },
    stop() { ids.forEach(clearTimeout); ivs.forEach(clearInterval); ids.clear(); ivs.clear() },
  }
}

/* ---------- 기록 ---------- */
type Tone = 'ok' | 'bad' | 'warn' | 'info' | ''
type Line = { id: number; t: number; text: ReactNode; tone: Tone }
function useLog(max = 40) {
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
function RcmLog({ lines, empty, h = 132 }: { lines: Line[]; empty: string; h?: number }) {
  const box = useRef<HTMLOListElement>(null)
  useLayoutEffect(() => { const b = box.current; if (b) b.scrollTop = b.scrollHeight }, [lines])
  return (
    <ol className="rcm-log" ref={box} style={{ maxHeight: h }} aria-label="브로커 기록" tabIndex={0}>
      {lines.length === 0 && <li className="rcm-l rcm-empty">{empty}</li>}
      {lines.map(l => (
        <li key={l.id} className={'rcm-l ' + l.tone}><time>{(l.t / 1000).toFixed(1)}s</time><span>{l.text}</span></li>
      ))}
    </ol>
  )
}

/* =====================================================================
 * 가짜 브로커 — 토픽 매칭 · retained · clientId takeover · keepalive · will
 * ===================================================================== */
function matchTopic(filter: string, topic: string) {
  const f = filter.split('/'), t = topic.split('/')
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true
    if (i >= t.length) return false
    if (f[i] !== '+' && f[i] !== t[i]) return false
  }
  return f.length === t.length
}

type Msg = { topic: string; payload: string; retain: boolean }
type CloseWhy = 'takeover' | 'keepalive'
type Conn = {
  clientId: string
  open: boolean
  subs: string[]
  keepalive: number
  will?: Msg
  lastSeen: number
  onMessage: (m: Msg) => void
  onClose: (why: CloseWhy) => void
}
type Note = (text: ReactNode, tone?: Tone) => void

class FakeBroker {
  conns = new Map<string, Conn>()
  retained = new Map<string, Msg>()
  private note: Note
  constructor(note: Note = () => {}) { this.note = note }

  connect(clientId: string, o: { keepalive?: number; will?: Msg; onMessage?: (m: Msg) => void; onClose?: (why: CloseWhy) => void } = {}) {
    const old = this.conns.get(clientId)
    if (old?.open) {
      // 같은 clientId로 새 연결이 오면 먼저 있던 연결을 끊어요 (session takeover)
      old.open = false
      this.note(<>브로커: <code>{clientId}</code>로 새 연결이 와서 <b>먼저 있던 연결을 끊어요</b></>, 'bad')
      old.onClose('takeover')
    }
    const c: Conn = {
      clientId, open: true, subs: [], keepalive: o.keepalive ?? 0, will: o.will, lastSeen: performance.now(),
      onMessage: o.onMessage ?? (() => {}), onClose: o.onClose ?? (() => {}),
    }
    this.conns.set(clientId, c)
    return c
  }
  subscribe(c: Conn, filter: string) {
    if (!c.open) return
    c.subs.push(filter)
    this.retained.forEach(m => { if (matchTopic(filter, m.topic)) c.onMessage({ ...m, retain: true }) })
  }
  publish(topic: string, payload: string, retain = false) {
    if (retain) {
      if (payload === '') this.retained.delete(topic)
      else this.retained.set(topic, { topic, payload, retain: true })
    }
    this.conns.forEach(c => {
      if (c.open && c.subs.some(f => matchTopic(f, topic))) c.onMessage({ topic, payload, retain: false })
    })
  }
  /** 클라이언트가 보낸 패킷(값·PINGREQ) — 살아 있다는 표시 */
  seen(c: Conn) { c.lastSeen = performance.now() }
  /** 정상 종료(DISCONNECT) — will은 보내지 않아요 */
  disconnect(c: Conn) {
    c.open = false
    if (this.conns.get(c.clientId) === c) this.conns.delete(c.clientId)
  }
  /** keepalive 검사 — 1.5배 동안 조용하면 끊고 will을 보내요. keepalive 0이면 검사 안 해요 */
  check() {
    const now = performance.now()
    this.conns.forEach(c => {
      if (!c.open || c.keepalive <= 0 || now - c.lastSeen <= c.keepalive * 1.5) return
      c.open = false
      this.conns.delete(c.clientId)
      this.note(<>브로커: <code>{c.clientId}</code>가 keepalive의 1.5배 동안 조용해서 연결을 끊어요</>, 'warn')
      c.onClose('keepalive')
      if (c.will) {
        this.note(<>브로커: 맡아 둔 will 발행 → <code>{c.will.topic}</code> = <b>{c.will.payload}</b></>, 'info')
        this.publish(c.will.topic, c.will.payload, c.will.retain)
      }
    })
  }
}

/* =====================================================================
 * 01 clientId 충돌
 * ===================================================================== */
type TabV = { label: string; clientId: string; on: boolean; got: number; drops: number }

export function ClientIdDemo({ fixed }: { fixed: boolean }) {
  const { lines, add, clear } = useLog()
  const [tabs, setTabs] = useState<TabV[]>([])

  useEffect(() => {
    const tm = timers()
    clear()
    const b = new FakeBroker(add)
    const view: TabV[] = ['탭 A', '탭 B'].map(label => ({
      label, clientId: fixed ? `web-u42-${hex4()}` : 'web-u42', on: false, got: 0, drops: 0,
    }))
    const sync = () => setTabs(view.map(v => ({ ...v })))
    const open = (i: number) => {
      const v = view[i]
      const c = b.connect(v.clientId, {
        onMessage: () => { v.got++ },
        onClose: () => {
          v.on = false; v.drops++
          add(<>{v.label}: 연결 끊김 → 1초 뒤 다시 연결</>, 'warn')
          sync()
          tm.later(() => open(i), 1000) // mqtt.js reconnectPeriod 기본값
        },
      })
      v.on = true
      b.subscribe(c, 'line-3/temp')
      add(<>{v.label}: 연결됨 (clientId <code>{v.clientId}</code>)</>, 'ok')
      sync()
    }
    sync()
    tm.later(() => open(0), 300)
    tm.later(() => open(1), 1500)
    tm.every(() => { b.publish('line-3/temp', (60 + Math.random() * 5).toFixed(1)); sync() }, 250)
    return () => tm.stop()
  }, [fixed, add, clear])

  const drops = tabs.reduce((s, t) => s + t.drops, 0)
  const onN = tabs.filter(t => t.on).length
  return (
    <div className="rcm-col">
      <div className="rcm-tabs">
        {tabs.map(t => (
          <div key={t.label} className={'rcm-box' + (t.on ? ' on' : ' off')}>
            <small>{t.label} · 대시보드</small>
            <code>{t.clientId}</code>
            <span className="rcm-state"><i />{t.on ? '연결됨' : '끊김'}</span>
            <span className="rcm-sub">받은 값 {fmt(t.got)}개</span>
          </div>
        ))}
      </div>
      <RcmLog lines={lines} empty="곧 두 탭이 차례로 연결돼요" />
      <div className="dv-meters">
        <Meter label="지금 연결된 탭" value={`${onN}/2`} bad={tabs.length ? onN < 2 : undefined} />
        <Meter label="끊김 횟수" value={fmt(drops)} bad={drops > 0} />
        <Meter label="탭 A · B 받은 값" value={tabs.length ? `${fmt(tabs[0].got)} · ${fmt(tabs[1].got)}` : '—'} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 02 retained 옛 값
 * ===================================================================== */
const HOUR = 3_600_000
function ago(ms: number) {
  if (ms < 5_000) return '방금'
  if (ms < 60_000) return `${Math.round(ms / 1000)}초 전`
  if (ms < HOUR) return `${Math.round(ms / 60_000)}분 전`
  return `${Math.floor(ms / HOUR)}시간 ${Math.round((ms % HOUR) / 60_000)}분 전`
}
type Shown = { v: number; madeAt: number; shownAt: number; ts?: number }

export function RetainedDemo({ fixed }: { fixed: boolean }) {
  const { lines, add, clear } = useLog()
  const api = useRef<{ open: () => void; boot: () => void } | null>(null)
  const [shown, setShown] = useState<Shown | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [opened, setOpened] = useState(false)
  const [booted, setBooted] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tm = timers()
    clear()
    const b = new FakeBroker(add)
    const T = 'plant/boiler-7/temp', S = 'plant/boiler-7/status'
    // 3시간 12분 전에 마지막으로 보내고 꺼진 기기 — 브로커에 retained로 남아 있어요
    const madeAt = Date.now() - 3 * HOUR - 12 * 60_000
    let realMade = madeAt
    b.publish(T, fixed ? JSON.stringify({ v: 72.4, ts: madeAt }) : '72.4', true)
    if (fixed) b.publish(S, 'offline', true)

    api.current = {
      open() {
        setOpened(true)
        const c = b.connect('web-dash-' + hex4(), {
          onMessage: m => {
            if (m.topic === S) { setStatus(m.payload); return }
            if (fixed) {
              const { v, ts } = JSON.parse(m.payload) as { v: number; ts: number }
              setShown({ v, madeAt: ts, shownAt: Date.now(), ts })
            } else {
              setShown({ v: Number(m.payload), madeAt: realMade, shownAt: Date.now() })
            }
            add(<>대시보드: <code>{m.topic.split('/').pop()}</code> 받음{m.retain ? <> · <b>retained</b> (브로커가 보관하던 값)</> : ' · 기기가 방금 보낸 값'}</>, m.retain ? 'warn' : 'ok')
          },
        })
        add(<>대시보드: 연결 후 <code>plant/boiler-7/#</code> 구독</>, 'info')
        b.subscribe(c, 'plant/boiler-7/#')
      },
      boot() {
        setBooted(true)
        add(<>보일러 7: 다시 켜짐</>, 'ok')
        if (fixed) b.publish(S, 'online', true)
        const send = () => {
          const v = +(68 + Math.random() * 2).toFixed(1)
          realMade = Date.now()
          b.publish(T, fixed ? JSON.stringify({ v, ts: realMade }) : String(v), true)
        }
        send()
        tm.every(send, 1500)
      },
    }
    tm.every(() => setNow(Date.now()), 1000)
    return () => { tm.stop(); api.current = null }
  }, [fixed, add, clear])

  const realAge = shown ? now - shown.madeAt : 0
  const old = !!shown && realAge > 30_000
  // 고치기 전: 화면은 받은 시각을 갱신 시각으로 써요
  const label = !shown ? '' : fixed ? (old ? `${ago(realAge)} 값` : '실시간') : (now - shown.shownAt < 5_000 ? '방금 갱신' : `${ago(now - shown.shownAt)} 갱신`)
  return (
    <div className="rcm-col">
      <div className="rcm-screen">
        <div className="rcm-screen-bar">보일러 7 · 온도
          {fixed && status && <span className={'rcm-pill ' + (status === 'online' ? 'ok' : 'off')}>{status === 'online' ? '기기 온라인' : '기기 오프라인'}</span>}
        </div>
        {shown ? (
          <div className={'rcm-temp' + (fixed && old ? ' stale' : '')}>
            <b>{shown.v.toFixed(1)}<small>°C</small></b>
            <span><i className={fixed && old ? 'off' : 'on'} />{label}</span>
          </div>
        ) : <p className="rcm-blank">{opened ? '…' : '대시보드를 열면 값이 떠요'}</p>}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" disabled={opened} onClick={() => api.current?.open()}>대시보드 열기</button>
        <button type="button" className="btn sm ghost" disabled={!opened || booted} onClick={() => api.current?.boot()}>보일러 다시 켜기</button>
      </div>
      <RcmLog lines={lines} empty="보일러 7은 3시간 전에 꺼졌어요. 브로커에는 마지막 값이 retained로 남아 있어요" h={110} />
      <div className="dv-meters">
        <Meter label="실제로 측정된 때" value={shown ? ago(realAge) : '—'} bad={shown ? old : undefined} />
        <Meter label="화면이 말하는 것" value={shown ? label : '—'} bad={shown ? (old && !fixed) : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 03 QoS 0 유실
 * ===================================================================== */
const N_CMD = 16
const GAP = 380
const HOP = 140
type CmdSt = 'wait' | 'fly' | 'queued' | 'ok' | 'lost'
type Cmd = { st: CmdSt; dup: number; late: boolean }

export function QosDemo({ fixed }: { fixed: boolean }) {
  const { lines, add, clear } = useLog()
  const [cmds, setCmds] = useState<Cmd[]>(() => Array.from({ length: N_CMD }, () => ({ st: 'wait', dup: 0, late: false })))
  const [linkUp, setLinkUp] = useState(true)
  const [running, setRunning] = useState(false)
  const [ran, setRan] = useState(false)
  const tmRef = useRef<ReturnType<typeof timers> | null>(null)
  useEffect(() => () => tmRef.current?.stop(), [])

  const run = () => {
    tmRef.current?.stop()
    const tm = timers(); tmRef.current = tm
    clear(); setRunning(true); setRan(true); setLinkUp(true)
    setCmds(Array.from({ length: N_CMD }, () => ({ st: 'wait', dup: 0, late: false })))
    const set = (i: number, p: Partial<Cmd>) => setCmds(a => a.map((c, j) => (j === i ? { ...c, ...p } : c)))
    const bump = (i: number) => setCmds(a => a.map((c, j) => (j === i ? { ...c, dup: c.dup + 1 } : c)))

    // 기기 쪽 망이 끊기는 구간 (ms) — 세 번쯤 끊겨요
    const down: [number, number][] = [900, 2700, 4400].map(s => {
      const a = s + Math.random() * 400
      return [a, a + 550 + Math.random() * 400]
    })
    const up = (t: number) => !down.some(([a, b]) => t >= a && t < b)
    const nextUp = (t: number) => { const w = down.find(([a, b]) => t >= a && t < b); return w ? w[1] + 120 : t }
    down.forEach(([a, b]) => {
      tm.later(() => { setLinkUp(false); add('기기: 망 끊김', 'bad') }, a)
      tm.later(() => { setLinkUp(true); add(fixed ? '기기: 다시 연결 · 세션 이어 받기 (clean: false)' : '기기: 다시 연결 · 새 세션', fixed ? 'ok' : '') }, b)
    })

    for (let i = 0; i < N_CMD; i++) {
      const t0 = 150 + i * GAP
      const no = i + 1
      tm.later(() => set(i, { st: 'fly' }), t0)
      if (!fixed) {
        // QoS 0 — 보내고 끝. 브로커는 기기가 없으면 버리고, 가는 중에 끊기면 사라져요
        if (!up(t0)) tm.later(() => { set(i, { st: 'lost' }); add(<>명령 {no}: 기기가 끊겨 있어 브로커가 <b>버림</b></>, 'bad') }, t0 + 40)
        else if (!up(t0 + HOP)) tm.later(() => { set(i, { st: 'lost' }); add(<>명령 {no}: 가는 중에 끊겨 <b>사라짐</b></>, 'bad') }, t0 + HOP)
        else tm.later(() => set(i, { st: 'ok' }), t0 + HOP)
        continue
      }
      // QoS 1 + 세션 유지 — 기기가 없으면 쌓아 뒀다가, PUBACK 못 받은 건 다시 보내요
      let at = t0
      let late = false
      if (!up(at)) {
        late = true
        tm.later(() => { set(i, { st: 'queued' }); add(<>명령 {no}: 기기가 끊겨 있어 브로커가 <b>보관</b></>, 'info') }, at + 40)
        at = nextUp(at)
      }
      let arrive = at + HOP
      if (!up(arrive)) {
        late = true
        tm.later(() => set(i, { st: 'queued' }), arrive)
        arrive = nextUp(arrive) + HOP
      }
      const lateNow = late
      tm.later(() => {
        set(i, { st: 'ok', late: lateNow })
        if (lateNow) add(<>명령 {no}: 다시 붙은 뒤 받아서 실행</>, 'ok')
      }, arrive)
      const ack = arrive + HOP
      if (!up(ack)) {
        // 실행은 했는데 PUBACK이 브로커에 못 갔어요 → 다시 붙으면 DUP으로 또 와요
        tm.later(() => { bump(i); add(<>명령 {no}: DUP으로 다시 옴 → 이미 처리한 id라 <b>걸러냄</b></>, 'warn') }, nextUp(ack) + HOP)
      }
    }
    tm.later(() => setRunning(false), 150 + N_CMD * GAP + 1400)
  }

  const okN = cmds.filter(c => c.st === 'ok').length
  const lost = cmds.filter(c => c.st === 'lost').length
  const late = cmds.filter(c => c.late).length
  const dups = cmds.reduce((s, c) => s + c.dup, 0)
  const sent = cmds.filter(c => c.st !== 'wait').length
  return (
    <div className="rcm-col">
      <div className="rcm-qos-head">
        <span>브라우저 → 브로커 → 문 7 · <code>{fixed ? 'QoS 1 · clean: false' : 'QoS 0 · clean: true'}</code></span>
        <span className={'rcm-state ' + (linkUp ? 'on' : 'off')}><i />기기 망 {linkUp ? '연결' : '끊김'}</span>
      </div>
      <ol className="rcm-cmds" aria-label="명령 상태">
        {cmds.map((c, i) => (
          <li key={i} className={c.st} title={c.st}>
            {i + 1}{c.dup > 0 && <sup>×2</sup>}
          </li>
        ))}
      </ol>
      <div className="dv-row">
        <button type="button" className="btn sm" disabled={running} onClick={run}>{ran ? '다시 보내기' : `명령 ${N_CMD}개 보내기`}</button>
        <span className="rcm-legend"><i className="ok" />실행 <i className="lost" />유실 <i className="queued" />보관 중</span>
      </div>
      <RcmLog lines={lines} empty="버튼을 누르면 0.4초마다 명령을 보내고, 그 사이 기기 쪽 망이 몇 번 끊겨요" h={110} />
      <div className="dv-meters">
        <Meter label="보낸 명령" value={fmt(sent)} />
        <Meter label="기기가 실행" value={fmt(okN)} bad={ran && !running ? okN < N_CMD : undefined} />
        <Meter label="유실" value={fmt(lost)} bad={ran ? lost > 0 : undefined} />
        {fixed && <Meter label="늦게 실행 · 중복 걸러냄" value={`${late} · ${dups}`} />}
      </div>
    </div>
  )
}

/* =====================================================================
 * 04 keepalive · LWT
 * ===================================================================== */
const SPEED = 30 // 데모 시간 1초 = 실제 30초
const KA = 60 // keepalive (데모 초)
type Power = 'on' | 'pulled' | 'shutdown'

export function LwtDemo({ fixed }: { fixed: boolean }) {
  const { lines, add, clear } = useLog()
  const api = useRef<{ pull: () => void; shutdown: () => void; boot: () => void } | null>(null)
  const [power, setPower] = useState<Power>('on')
  const [shownOnline, setShownOnline] = useState<boolean | null>(null)
  const [offAt, setOffAt] = useState<number | null>(null)
  const [noticed, setNoticed] = useState<number | null>(null)
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    const tm = timers()
    clear()
    const b = new FakeBroker(add)
    const S = 'plant/boiler-7/status'
    let dev: ReturnType<FakeBroker['connect']> | null = null
    let pulledAt = 0
    const pw = { current: 'on' as Power }

    const dash = b.connect('web-dash-' + hex4(), {
      onMessage: m => {
        if (m.topic !== S) return
        setShownOnline(m.payload === 'online')
        if (m.payload === 'offline' && pulledAt) { setNoticed(performance.now() - pulledAt); pulledAt = 0 }
      },
    })
    b.subscribe(dash, S)

    const boot = () => {
      dev = b.connect('boiler-7', fixed
        ? { keepalive: (KA * 1000) / SPEED, will: { topic: S, payload: 'offline', retain: true } }
        : { keepalive: 0 })
      b.publish(S, 'online', true)
      add(<>보일러 7: 연결 · <code>status = online</code> (retain){fixed ? ' · will 맡김' : ''}</>, 'ok')
      setPower('on'); setOffAt(null); setNoticed(null)
    }
    boot()
    // 켜져 있는 동안 값을 보내요 (= 살아 있다는 표시)
    tm.every(() => { const d = dev; if (d?.open && pw.current === 'on') b.seen(d) }, 500)
    tm.every(() => { b.check(); setNow(performance.now()) }, 200)

    api.current = {
      pull() {
        pw.current = 'pulled'; pulledAt = performance.now()
        setPower('pulled'); setOffAt(pulledAt)
        add(<>보일러 7: <b>전원이 뽑힘</b> · 인사 없이 사라져요(TCP FIN 없음)</>, 'bad')
      },
      shutdown() {
        pw.current = 'shutdown'
        setPower('shutdown'); setOffAt(performance.now())
        if (fixed) {
          b.publish(S, 'offline', true)
          add(<>보일러 7: <code>status = offline</code> 보내고 DISCONNECT</>, 'ok')
          setNoticed(0)
        } else {
          add(<>보일러 7: DISCONNECT (정상 종료라 will도 안 나가요)</>, 'warn')
        }
        const d = dev
        if (d) b.disconnect(d)
      },
      boot() { pw.current = 'on'; pulledAt = 0; boot() },
    }
    return () => { tm.stop(); api.current = null }
  }, [fixed, add, clear])

  const off = power !== 'on'
  const elapsed = offAt === null ? 0 : ((now - offAt) * SPEED) / 1000
  const wrong = off && shownOnline === true
  return (
    <div className="rcm-col">
      <div className="rcm-tabs">
        <div className={'rcm-box ' + (off ? 'off' : 'on')}>
          <small>보일러 7 (실제)</small>
          <span className="rcm-state"><i />{power === 'on' ? '켜짐' : power === 'pulled' ? '전원 뽑힘' : '정상 종료'}</span>
          <span className="rcm-sub">keepalive {fixed ? `${KA}초 · will 있음` : '0 · will 없음'}</span>
        </div>
        <div className={'rcm-box ' + (shownOnline ? 'on' : 'off') + (wrong ? ' wrong' : '')}>
          <small>대시보드에 보이는 상태</small>
          <span className="rcm-state"><i />{shownOnline === null ? '—' : shownOnline ? '온라인' : '오프라인'}</span>
          <span className="rcm-sub">status 토픽 (retained)</span>
        </div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" disabled={off} onClick={() => api.current?.pull()}>전원 뽑기</button>
        <button type="button" className="btn sm ghost" disabled={off} onClick={() => api.current?.shutdown()}>정상 종료</button>
        <button type="button" className="btn sm ghost" disabled={!off} onClick={() => api.current?.boot()}>다시 켜기</button>
      </div>
      <RcmLog lines={lines} empty="" h={110} />
      <div className="dv-meters">
        <Meter label="꺼진 뒤 지난 시간" value={off ? `${Math.floor(elapsed)}초` : '—'} />
        <Meter label="대시보드가 알아챈 때"
          value={!off ? '—' : noticed !== null ? `${Math.round((noticed * SPEED) / 1000)}초 뒤` : '아직 몰라요'}
          bad={off ? noticed === null && elapsed > 100 : undefined} />
      </div>
    </div>
  )
}

/* =====================================================================
 * 05 # 와일드카드 · 토픽 권한
 * ===================================================================== */
type Kind = { name: string; hz: number; bytes: number }
const KINDS: Kind[] = [
  { name: 'status', hz: 0.2, bytes: 60 },
  { name: 'vibration', hz: 5, bytes: 420 },
  { name: 'log', hz: 0.5, bytes: 180 },
]
const TOPICS = ['acme', 'other-co'].flatMap(co => [1, 2, 3, 4].flatMap(line =>
  Array.from({ length: 30 }, (_, d) => KINDS.map(k => ({ topic: `factory/${co}/line-${line}/m${String(d + 1).padStart(2, '0')}/${k.name}`, k, co })))).flat())
const NEED = 'factory/acme/line-3/+/status'
type Feed = { id: number; topic: string; other: boolean }

export function WildcardDemo({ fixed }: { fixed: boolean }) {
  const { lines, add, clear } = useLog()
  const [rate, setRate] = useState({ msg: 0, kb: 0, used: 0 })
  const [otherN, setOtherN] = useState(0)
  const [feed, setFeed] = useState<Feed[]>([])
  const filter = fixed ? NEED : 'factory/#'

  useEffect(() => {
    const tm = timers()
    clear()
    const mine = TOPICS.filter(t => matchTopic(filter, t.topic))
    add(<>대시보드: <code>{filter}</code> 구독 → 토픽 {fmt(mine.length)}개가 걸려요</>, fixed ? 'ok' : 'warn')
    let fid = 0
    let other = 0
    const win: { msg: number; bytes: number; used: number }[] = []
    tm.every(() => {
      let msg = 0, bytes = 0, used = 0
      const sample: Feed[] = []
      for (const t of mine) {
        const n = Math.floor(t.k.hz * 0.5 + Math.random())
        if (!n) continue
        msg += n; bytes += n * t.k.bytes
        if (matchTopic(NEED, t.topic)) used += n
        if (t.co !== 'acme') other += n
        if (sample.length < 3 && Math.random() < 0.02 + 6 / mine.length) sample.push({ id: fid++, topic: t.topic, other: t.co !== 'acme' })
      }
      win.push({ msg, bytes, used }); if (win.length > 2) win.shift()
      const s = win.reduce((a, w) => ({ msg: a.msg + w.msg, bytes: a.bytes + w.bytes, used: a.used + w.used }), { msg: 0, bytes: 0, used: 0 })
      setRate({ msg: s.msg, kb: s.bytes / 1024, used: s.used })
      setOtherN(other)
      if (sample.length) setFeed(f => [...f, ...sample].slice(-6))
    }, 500)
    return () => tm.stop()
  }, [filter, fixed, add, clear])

  const tryHash = () => {
    add(<>대시보드: <code>factory/#</code> 구독 시도 → SUBACK <b>0x80 실패</b> · 브로커 ACL이 거부했어요</>, 'bad')
  }
  const pct = rate.msg ? (rate.used / rate.msg) * 100 : 0
  return (
    <div className="rcm-col">
      <div className="rcm-qos-head">
        <span>구독 <code>{filter}</code></span>
        <span className="rcm-sub">{fixed ? 'ACL: factory/acme/+/+/status 읽기만' : 'ACL 없음 · 공용 계정'}</span>
      </div>
      <ul className="rcm-feed" aria-label="받은 메시지 일부">
        {feed.length === 0 && <li className="rcm-empty">받은 메시지 일부가 여기에 흘러가요</li>}
        {feed.map(f => <li key={f.id} className={f.other ? 'bad' : ''}><code>{f.topic}</code>{f.other && <em>다른 회사</em>}</li>)}
      </ul>
      {fixed && <div className="dv-row"><button type="button" className="btn sm ghost" onClick={tryHash}>콘솔에서 factory/# 구독해 보기</button></div>}
      {fixed && <RcmLog lines={lines} empty="" h={84} />}
      <div className="dv-meters">
        <Meter label="초당 받은 메시지" value={fmt(rate.msg)} bad={rate.msg > 100} />
        <Meter label="초당 받은 데이터" value={`${rate.kb < 10 ? rate.kb.toFixed(1) : fmt(Math.round(rate.kb))}KB`} bad={rate.kb > 50} />
        <Meter label="화면에 쓰는 비율" value={rate.msg ? `${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%` : '—'} bad={rate.msg ? pct < 50 : undefined} />
        <Meter label="다른 회사 메시지" value={fmt(otherN)} bad={otherN > 0} />
      </div>
    </div>
  )
}
