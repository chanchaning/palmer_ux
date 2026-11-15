/* 11 실시간 통신 — MQTT 한눈에: 페이지 안의 가짜 브로커 (바깥 연결 없음) */
import { useEffect, useState } from 'react'
import { Seg, useTimers } from '../../components/ui'
import { Meter } from '../ui'

type Q = 0 | 1 | 2
type Timers = ReturnType<typeof useTimers>
interface Sub { f: string; q: Q }
interface Msg { id: number; t: string; p: string; q: Q; ret: boolean; delivered: boolean }
interface Got { k: number; t: string; p: string; q: Q; ret: boolean; dup: boolean }
interface Line { k: number; s: string; tone?: 'bad' | 'ok' }
interface Dev { on: boolean; willAt: number; left: number }

const KEEPALIVE = 4 // 초 (보기 좋게 줄인 값)
const DEVICES = ['s1', 's2'] as const
const CAP = 8

/** 토픽 필터 매칭 — '+' 한 단계, '#' 그 아래 전부(부모 단계 포함) */
function topicMatch(filter: string, topic: string) {
  const f = filter.split('/'), t = topic.split('/')
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true
    if (i >= t.length) return false
    if (f[i] !== '+' && f[i] !== t[i]) return false
  }
  return f.length === t.length
}

function filterError(f: string) {
  if (!f) return '필터를 적어요'
  const parts = f.split('/')
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.includes('#') && (p !== '#' || i !== parts.length - 1)) return '#는 맨 끝 단계에 혼자만 쓸 수 있어요'
    if (p.includes('+') && p !== '+') return '+는 한 단계를 혼자 차지해야 해요 (a/+/b)'
  }
  return ''
}
function topicError(t: string) {
  if (!t) return '토픽을 적어요'
  if (/[+#]/.test(t)) return '발행 토픽에는 와일드카드를 못 써요'
  return ''
}

/** 가짜 브로커 + 이 브라우저(구독자) 연결 */
function createBroker(bump: () => void, timers: Timers) {
  const S = {
    subs: [{ f: 'devices/+/temp', q: 0 }] as Sub[],
    retained: new Map<string, { p: string; q: Q }>([['devices/s1/status', { p: 'online', q: 1 }], ['devices/s2/status', { p: 'online', q: 1 }]]),
    online: true,
    clean: false,
    loss: 0,
    pending: [] as Msg[],
    seen: new Set<number>(),
    got: [] as Got[],
    log: [] as Line[],
    n: { got: 0, lost: 0, dup: 0, drops: 0, kicks: 0 },
    dev: { s1: { on: true, willAt: 0, left: 0 }, s2: { on: true, willAt: 0, left: 0 } } as Record<string, Dev>,
  }
  let pid = 0, k = 0, ticks = 0

  const log = (s: string, tone?: Line['tone']) => { S.log = [{ k: ++k, s, tone }, ...S.log].slice(0, CAP) }
  const hand = (m: Msg, dup: boolean) => {
    S.n.got++
    if (dup) S.n.dup++
    S.got = [{ k: ++k, t: m.t, p: m.p, q: m.q, ret: m.ret, dup }, ...S.got].slice(0, CAP)
  }
  /** 앱에 넘기기 — QoS 2는 같은 id를 두 번 넘기지 않아요 */
  const receive = (m: Msg) => {
    if (m.q === 2 && S.seen.has(m.id)) { log(`같은 id ${m.id}라 앱에 다시 넘기지 않아요`, 'ok'); return }
    if (m.q === 2) S.seen.add(m.id)
    hand(m, m.delivered)
    m.delivered = true
  }

  const drop = (why: string) => {
    if (!S.online) return
    S.online = false
    S.n.drops++
    log(why, 'bad')
    timers.set(reconnect, 1000)
  }

  const reconnect = () => {
    S.online = true
    if (S.clean) {
      const lost = S.pending.filter(m => !m.delivered).length
      S.n.lost += lost
      S.pending = []
      log(`다시 연결 (clean) · 세션이 없어 못 받은 QoS 1·2 ${lost}개를 잃어요`, lost ? 'bad' : undefined)
      // mqtt.js는 구독을 다시 보내요 → 브로커가 retained를 또 줘요
      for (const s of S.subs) for (const [t, r] of S.retained) if (topicMatch(s.f, t)) send(mk(t, r.p, Math.min(r.q, s.q) as Q, true), false)
    } else {
      const list = S.pending
      S.pending = []
      log(list.length ? `다시 연결 · 세션이 남아 있어 ${list.length}개를 DUP으로 다시 보내요` : '다시 연결 · 세션을 이어 받아요', 'ok')
      list.forEach((m, i) => timers.set(() => send(m, true), 120 * (i + 1)))
    }
    bump()
  }

  const mk = (t: string, p: string, q: Q, ret: boolean): Msg => ({ id: ++pid, t, p, q, ret, delivered: false })

  const send = (m: Msg, dup: boolean) => {
    if (!S.online) {
      if (m.q > 0 && !S.clean) { S.pending.push(m); return }
      if (!m.delivered) { S.n.lost++; log(`끊긴 사이 온 QoS ${m.q} ${m.t} 를 버려요`, 'bad') }
      return
    }
    const tag = `${m.t} = ${m.p} (QoS ${m.q}${m.q ? ', id ' + m.id : ''}${dup ? ', DUP' : ''}${m.ret ? ', retained' : ''})`
    const broken = Math.random() < S.loss
    const early = Math.random() < 0.5
    if (m.q === 0) {
      if (broken) { S.n.lost++; log(`→ ${tag}`); drop('✕ 가는 길에 연결이 끊겨 사라졌어요') }
      else receive(m)
      return
    }
    log(`→ PUBLISH ${tag}`)
    if (broken && early) { S.pending.push(m); drop('✕ PUBLISH가 닿기 전에 끊겼어요') }
    else if (broken) {
      receive(m)
      S.pending.push(m)
      drop(m.q === 1 ? '✕ 받았는데 PUBACK이 돌아가다 끊겼어요' : '✕ 받았는데 PUBREC이 돌아가다 끊겼어요')
    } else {
      receive(m)
      log(m.q === 1 ? '← PUBACK' : '← PUBREC → PUBREL ← PUBCOMP', 'ok')
    }
  }

  /** 브로커에 발행이 들어왔을 때 (발행자 → 브로커 구간은 안정하다고 봐요) */
  const route = (t: string, p: string, q: Q, retain: boolean) => {
    if (retain) {
      if (p === '') { S.retained.delete(t); log(`retained 지움: ${t}`) }
      else S.retained.set(t, { p, q })
    }
    const hits = S.subs.filter(s => topicMatch(s.f, t))
    if (hits.length) {
      // 겹치는 구독이 여럿이면 가장 높은 구독 QoS로 한 번만 (MQTT 5 브로커 대부분의 동작)
      const subQ = Math.max(...hits.map(h => h.q)) as Q
      send(mk(t, p, Math.min(q, subQ) as Q, false), false)
    }
  }

  return {
    S,
    publish(t: string, p: string, q: Q, retain: boolean) { route(t, p, q, retain); bump() },
    subscribe(f: string, q: Q) {
      if (!S.online) { log('연결 중이 아니라 SUBSCRIBE를 못 보냈어요', 'bad'); bump(); return }
      S.subs = [...S.subs.filter(s => s.f !== f), { f, q }]
      log(`SUBSCRIBE ${f} (QoS ${q}) ← SUBACK`, 'ok')
      for (const [t, r] of S.retained) if (topicMatch(f, t)) send(mk(t, r.p, Math.min(r.q, q) as Q, true), false)
      bump()
    },
    unsubscribe(f: string) { S.subs = S.subs.filter(s => s.f !== f); log(`UNSUBSCRIBE ${f}`); bump() },
    set(o: { loss?: number; clean?: boolean }) { Object.assign(S, o); bump() },
    unplug(d: string) {
      S.dev[d] = { on: false, willAt: Date.now() + KEEPALIVE * 1500, left: KEEPALIVE * 1.5 }
      log(`${d} 전원이 빠졌어요. 브로커는 아직 몰라요`)
      bump()
    },
    plug(d: string) {
      S.dev[d] = { on: true, willAt: 0, left: 0 }
      route(`devices/${d}/status`, 'online', 1, true)
      bump()
    },
    kick() {
      if (!S.online) return
      S.n.kicks++
      drop('✕ 다른 탭이 같은 clientId로 접속 → 브로커가 이 연결을 끊었어요')
      bump()
    },
    tick() {
      ticks++
      const now = Date.now()
      for (const d of DEVICES) {
        const v = S.dev[d]
        v.left = v.willAt ? Math.max(0, (v.willAt - now) / 1000) : 0
        if (!v.on && v.willAt && now >= v.willAt) {
          v.willAt = 0
          log(`${KEEPALIVE}초 × 1.5 동안 ${d} 소식이 없어 브로커가 LWT를 발행해요`, 'bad')
          route(`devices/${d}/status`, 'offline', 1, true)
        }
      }
      if (ticks % 5 === 0) for (const d of DEVICES) if (S.dev[d].on) route(`devices/${d}/temp`, (20 + Math.random() * 5).toFixed(1), 0, false)
      bump()
    },
  }
}

const PRESETS = ['devices/+/temp', 'devices/+/status', 'devices/s1/#', 'devices/#']
const rand4 = () => Math.random().toString(36).slice(2, 6)

export function MqttSim() {
  const timers = useTimers()
  const [, setV] = useState(0)
  const [B] = useState(() => createBroker(() => setV(v => v + 1), timers))
  const S = B.S

  const [f, setF] = useState('devices/+/status')
  const [fq, setFq] = useState<Q>(1)
  const [t, setT] = useState('devices/s1/cmd')
  const [p, setP] = useState('reboot')
  const [pq, setPq] = useState<Q>(1)
  const [ret, setRet] = useState(false)
  const [idMode, setIdMode] = useState<'fixed' | 'unique'>('fixed')
  const [twin, setTwin] = useState(false)
  const [suffix] = useState(rand4)
  const fErr = filterError(f.trim()), tErr = topicError(t.trim())

  useEffect(() => {
    const id = window.setInterval(() => B.tick(), 500)
    return () => clearInterval(id)
  }, [B])
  useEffect(() => {
    if (!twin || idMode !== 'fixed') return
    const id = window.setInterval(() => B.kick(), 1700)
    return () => clearInterval(id)
  }, [B, twin, idMode])

  const clientId = idMode === 'fixed' ? 'dashboard' : 'dashboard-' + suffix

  return (
    <div className="rcp-mq">
      <div className="rcp-mq-col">
        <div className="rcp-box">
          <div className="rcp-box-h">
            <span>이 브라우저</span>
            <code>{clientId}</code>
            <span className={'rcp-dot' + (S.online ? ' on' : '')}>{S.online ? '연결됨' : '다시 연결 중'}</span>
          </div>
          <div className="rcp-ctl">
            <span className="rcp-l">브로커 → 브라우저 링크</span>
            <Seg value={S.loss} onChange={v => B.set({ loss: v })} className="rcp-seg"
              options={[[0, '안정'], [0.25, '가끔 끊김'], [0.5, '자주 끊김']]} />
          </div>
          <label className="rcp-check"><input type="checkbox" checked={S.clean} onChange={e => B.set({ clean: e.target.checked })} />다시 붙을 때 세션 새로 시작 (clean start)</label>
          <div className="rcp-ctl">
            <span className="rcp-l">clientId</span>
            <Seg value={idMode} onChange={setIdMode} className="rcp-seg" options={[['fixed', '고정'], ['unique', '탭마다 다르게']]} />
          </div>
          <label className="rcp-check"><input type="checkbox" checked={twin} onChange={e => setTwin(e.target.checked)} />같은 화면을 탭 하나 더 열기</label>
        </div>

        <div className="rcp-box">
          <div className="rcp-box-h"><span>구독</span></div>
          <div className="rcp-form">
            <input className="rcp-in" value={f} onChange={e => setF(e.target.value)} aria-label="구독할 토픽 필터" spellCheck={false} />
            <Seg value={fq} onChange={setFq} className="rcp-seg" options={[[0, 'QoS 0'], [1, '1'], [2, '2']]} />
            <button type="button" className="btn sm" disabled={!!fErr} onClick={() => B.subscribe(f.trim(), fq)}>구독</button>
          </div>
          {fErr && <p className="rcp-err">{fErr}</p>}
          <div className="rcp-presets">{PRESETS.map(x => <button key={x} type="button" className="rcp-chip" onClick={() => setF(x)}>{x}</button>)}</div>
          <ul className="rcp-subs">
            {S.subs.length === 0 && <li className="rcp-empty">구독 없음</li>}
            {S.subs.map(s => (
              <li key={s.f}><code>{s.f}</code><small>QoS {s.q}</small>
                <button type="button" className="rcp-x" aria-label={s.f + ' 구독 해제'} onClick={() => B.unsubscribe(s.f)}>×</button></li>
            ))}
          </ul>
        </div>

        <div className="rcp-box">
          <div className="rcp-box-h"><span>다른 클라이언트에서 발행</span></div>
          <div className="rcp-form">
            <input className="rcp-in" value={t} onChange={e => setT(e.target.value)} aria-label="발행 토픽" spellCheck={false} />
            <input className="rcp-in rcp-in-s" value={p} onChange={e => setP(e.target.value)} aria-label="payload" spellCheck={false} placeholder="(빈 값)" />
          </div>
          {tErr && <p className="rcp-err">{tErr}</p>}
          <div className="rcp-form">
            <Seg value={pq} onChange={setPq} className="rcp-seg" options={[[0, 'QoS 0'], [1, '1'], [2, '2']]} />
            <label className="rcp-check"><input type="checkbox" checked={ret} onChange={e => setRet(e.target.checked)} />retain</label>
            <button type="button" className="btn sm" disabled={!!tErr} onClick={() => B.publish(t.trim(), p, pq, ret)}>발행</button>
          </div>
        </div>

        <div className="rcp-box">
          <div className="rcp-box-h"><span>기기</span><small>2.5초마다 온도를 QoS 0으로 보내요 · LWT는 status에 offline</small></div>
          <ul className="rcp-devs">
            {DEVICES.map(d => {
              const v = S.dev[d]
              const left = v.willAt ? v.left : 0
              const st = S.retained.get(`devices/${d}/status`)?.p ?? '없음'
              return (
                <li key={d}>
                  <b>{d}</b>
                  <span className={'rcp-dot' + (v.on ? ' on' : '')}>{v.on ? '켜짐' : '꺼짐'}</span>
                  <small>브로커가 아는 상태: <code>{st}</code>{left > 0 && <> · LWT까지 {left.toFixed(1)}초</>}</small>
                  {v.on
                    ? <button type="button" className="btn ghost sm" onClick={() => B.unplug(d)}>전원 뽑기</button>
                    : <button type="button" className="btn ghost sm" onClick={() => B.plug(d)}>다시 켜기</button>}
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="rcp-mq-col">
        <div className="dv-meters">
          <Meter label="앱이 받음" value={S.n.got} />
          <Meter label="유실" value={S.n.lost} bad={S.n.lost > 0} />
          <Meter label="중복" value={S.n.dup} bad={S.n.dup > 0} />
          <Meter label="끊김" value={S.n.drops} bad={S.n.drops > 0} />
          {twin && idMode === 'fixed' && <Meter label="서로 끊어냄" value={S.n.kicks} bad />}
        </div>
        <div className="rcp-box">
          <div className="rcp-box-h"><span>앱이 받은 메시지</span><small>최근 {CAP}개</small></div>
          <ul className="rcp-got">
            {S.got.length === 0 && <li className="rcp-empty">아직 없어요. 기기가 곧 온도를 보내요.</li>}
            {S.got.map(g => (
              <li key={g.k} className={g.dup ? 'dup' : undefined}>
                <code>{g.t}</code><b>{g.p}</b>
                <span className="rcp-tags"><i>QoS {g.q}</i>{g.ret && <i className="ret">retained</i>}{g.dup && <i className="dup">중복</i>}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rcp-box">
          <div className="rcp-box-h"><span>브로커가 들고 있는 retained</span></div>
          <ul className="rcp-ret">
            {S.retained.size === 0 && <li className="rcp-empty">없음</li>}
            {[...S.retained].map(([tp, r]) => <li key={tp}><code>{tp}</code><b>{r.p}</b></li>)}
          </ul>
        </div>
        <div className="rcp-box">
          <div className="rcp-box-h"><span>패킷 기록</span></div>
          <ol className="rcp-log">
            {S.log.length === 0 && <li className="rcp-empty">QoS 1·2로 구독하거나 발행하면 주고받는 패킷이 보여요.</li>}
            {S.log.map(l => <li key={l.k} className={l.tone}>{l.s}</li>)}
          </ol>
        </div>
      </div>
    </div>
  )
}
