import { useMemo, useRef, useState } from 'react'
import { Range, Seg } from '../../components/ui'
import { Note, Section, SysGrid } from '../../system/ui'
import { AnalogBar, Cite, Finding, Hmi, PriBadge, Refs, Sparkline, hhmmss, useVisibleInterval, type RefItem } from '../ui'
import { RANGES, rng } from '../data'
import './realtime.css'

/* 참고 문헌 번호 — Refs 순서와 같아요 */
const R = { endsley: 1, healey: 2, wcag: 3, isa101: 4, woods: 5, few: 6, hmi: 7, practice: 8 }

const ago = (sec: number) => {
  const s = Math.max(0, Math.round(sec))
  if (s < 60) return `${s}초 전`
  return `${Math.floor(s / 60)}분${s % 60 ? ` ${s % 60}초` : ''} 전`
}

/* ================= 1. 상황 인식이 첫 단계부터 무너져요 ================= */
function SaChain() {
  const [fresh, setFresh] = useState(true)
  const steps = fresh
    ? [
      { lv: '1단계 지각', see: '강변 1선 부하율 96% (방금 받은 값)', ok: true },
      { lv: '2단계 이해', see: '경보선 95%를 넘었다 — 비정상', ok: true },
      { lv: '3단계 예측', see: '이대로면 과부하 — 인접 선로로 절체를 준비하자', ok: true },
    ]
    : [
      { lv: '1단계 지각', see: '강변 1선 부하율 83% (사실은 3분 전에 멈춘 값)', ok: false },
      { lv: '2단계 이해', see: '정상 범위 안이다 — 문제없음', ok: false },
      { lv: '3단계 예측', see: '할 일 없음 — 다른 화면을 보자', ok: false },
    ]
  return (
    <div className="rt-sa">
      <Seg value={fresh ? 'f' : 's'} onChange={v => setFresh(v === 'f')} options={[['f', '데이터가 살아 있을 때'], ['s', '데이터가 멈췄는데 모를 때']]} />
      <ol className="rt-sa-chain">
        {steps.map((s, i) => (
          <li key={s.lv} className={s.ok ? 'ok' : 'bad'}>
            <span className="lv">{s.lv}</span>
            <p>{s.see}</p>
            <span className="mk">{s.ok ? '맞음' : '틀림'}</span>
            {i < 2 && <span className="arr" aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
      <p className="muted">현장의 실제 값은 두 경우 모두 96%예요. 달라진 건 화면이 값을 ‘언제’ 받았는지뿐이에요.</p>
    </div>
  )
}

/* ================= 2. 갱신 주기 ================= */
const PERIODS = [1, 5, 30] as const
interface W { shown: string; num: number; prev: number; chg: number; lastK: number; hist: number[]; changes: number[] }
interface RateS { k: number; raw: number; w: W[] }
const TICK = 250
const fmt = (v: number, tidy: boolean) => (tidy ? String(Math.round(v)) : v.toFixed(2))

function initRate(tidy: boolean): RateS {
  const raw = 83.12
  return { k: 0, raw, w: PERIODS.map(() => ({ shown: fmt(raw, tidy), num: raw, prev: raw, chg: 0, lastK: 0, hist: [raw], changes: [] })) }
}
function RateDemo() {
  const [tidy, setTidy] = useState(false)
  const [st, setSt] = useState<RateS>(() => initRate(false))
  const r = useRef(rng(505))
  const ref = useVisibleInterval(() => {
    setSt(s => {
      const k = s.k + 1
      const target = 83 + Math.sin(k / 90) * 3.5
      const raw = s.raw + (r.current() - 0.5) * 1.1 + (target - s.raw) * 0.08
      const w = s.w.map((x, i) => {
        const every = (PERIODS[i] * 1000) / TICK
        if (k - x.lastK < every) return x
        // 정리 모드: 정수로, 0.8 미만의 작은 출렁임은 무시
        const next = tidy && Math.abs(raw - x.num) < 0.8 ? x.num : raw
        const shown = fmt(next, tidy)
        const changed = shown !== x.shown
        return {
          shown, num: next, prev: x.num, lastK: k, hist: [...x.hist, next].slice(-30),
          chg: changed ? x.chg + 1 : x.chg,
          changes: changed ? [...x.changes, k].filter(c => k - c < 240) : x.changes.filter(c => k - c < 240),
        }
      })
      return { k, raw, w }
    })
  }, TICK)
  const changeTidy = (v: boolean) => { setTidy(v); setSt(initRate(v)) }
  const NOTE = ['읽기도 전에 숫자가 바뀌어요. 바뀔 때마다 눈이 끌려가요.', '읽을 시간은 있어요. 대부분의 아날로그 값에 알맞아요.', '편하게 읽히지만, 급한 변화가 최대 30초 늦게 보여요.']
  return (
    <div className="rt-rate" ref={ref}>
      <div className="rt-row">
        <Seg value={tidy ? 't' : 'r'} onChange={v => changeTidy(v === 't')} options={[['r', '받은 값 그대로 (소수 둘째 자리)'], ['t', '정리해서 (정수 · 작은 출렁임 무시)']]} />
        <span className="muted">세 화면은 같은 신호(강변 1선 부하율, 가상)를 보고 있어요.</span>
      </div>
      <div className="rt-rate-grid">
        {PERIODS.map((p, i) => {
          const x = st.w[i]
          const up = x.num > x.prev, down = x.num < x.prev
          const next = Math.max(0, Math.ceil((p * 1000 - (st.k - x.lastK) * TICK) / 1000))
          const perMin = x.changes.length
          return (
            <Hmi key={p} title={`${p}초마다 갱신`} right={`다음 갱신 ${next}초`} className="rt-w">
              <div className="rt-w-val">
                <b key={x.chg} className="chg">{x.shown}</b><span className="u">%</span>
                <span className={'rt-w-dir' + (up ? ' up' : down ? ' down' : '')} aria-hidden="true">{up ? '▲' : down ? '▼' : '–'}</span>
              </div>
              <Sparkline data={x.hist.length > 1 ? x.hist : [x.hist[0], x.hist[0]]} w={360} h={44} min={74} max={92} className="rt-w-spark" />
              <div className="rt-w-meta"><span>최근 1분 숫자 바뀜</span><b>{perMin}번</b></div>
              <p>{NOTE[i]}</p>
            </Hmi>
          )
        })}
      </div>
      <Note>바뀐 숫자에 깔리는 옅은 배경은 0.6초 안에 사라져요. 갱신이 1초보다 잦지 않으니 깜빡임도 초당 1번을 넘지 않아요 <Cite n={R.wcag} />. 동작 줄이기를 켜면 배경 강조 없이 ▲▼ 표시만 남아요.</Note>
    </div>
  )
}

/* ================= 3. 데이터 신선도 ================= */
type Conn = 'live' | 'retry'
interface StS { k: number; link: boolean; conn: Conn; lastK: number; vals: number[]; truth: number[]; hist: { v: number; f?: boolean }[]; buf: number[][]; attempt: number; nextK: number; filledN: number; filledUntil: number; hot: boolean }
const HALF = 500
const SLOT = 4 // 2초마다 데이터
const LOST_AFTER = 10 // 5초 동안 못 받으면 끊김으로 판단
const FEEDERS = ['강변 1선', '강변 2선', '강변 3선']
function initStale(): StS {
  const truth = [83, 66, 57]
  const hist = series0()
  return { k: 0, link: true, conn: 'live', lastK: 0, vals: [...truth], truth, hist, buf: [], attempt: 0, nextK: 0, filledN: 0, filledUntil: 0, hot: false }
}
function series0() { const r = rng(9); return Array.from({ length: 40 }, () => ({ v: +(83 + (r() - 0.5) * 2.4).toFixed(1) })) }

function StaleDemo() {
  const [st, setSt] = useState<StS>(initStale)
  const [good, setGood] = useState(true)
  const [peek, setPeek] = useState(false)
  const base = useRef(Date.now())
  const r = useRef(rng(77))
  const ref = useVisibleInterval(() => {
    setSt(s0 => {
      const s: StS = { ...s0, k: s0.k + 1 }
      const k = s.k
      if (k % SLOT === 0) {
        const tgt = s.hot ? 97 : 83
        s.truth = [
          +(s.truth[0] + (tgt - s.truth[0]) * 0.18 + (r.current() - 0.5) * 1.2).toFixed(1),
          +(66 + (r.current() - 0.5) * 2).toFixed(1),
          +(57 + (r.current() - 0.5) * 2).toFixed(1),
        ]
        if (s.link && s.conn === 'live') { s.vals = s.truth; s.lastK = k; s.hist = [...s.hist, { v: s.truth[0] }].slice(-40) }
        else s.buf = [...s.buf, s.truth]
      }
      if (s.conn === 'live' && !s.link && k - s.lastK > LOST_AFTER) { s.conn = 'retry'; s.attempt = 1; s.nextK = k + 2 }
      if (s.conn === 'retry' && k >= s.nextK) {
        if (s.link) {
          s.conn = 'live'; s.lastK = k; s.filledN = s.buf.length; s.filledUntil = k + 12
          s.hist = [...s.hist, ...s.buf.map(b => ({ v: b[0], f: true }))].slice(-40)
          if (s.buf.length) s.vals = s.buf[s.buf.length - 1]
          s.buf = []; s.attempt = 0
        } else { s.attempt++; s.nextK = k + Math.min(16, 2 ** s.attempt) }
      }
      return s
    })
  }, HALF)
  const tAt = (k: number) => new Date(base.current + k * HALF)
  const age = ((st.k - st.lastK) * HALF) / 1000
  const stale = good && age > LOST_AFTER * HALF / 1000
  const down = st.conn === 'retry'
  const cut = () => setSt(s => ({ ...s, link: false, hot: true }))
  const fix = () => setSt(s => ({ ...s, link: true }))
  const reset = () => { base.current = Date.now(); setSt(initStale()) }
  const nextTry = Math.max(0, Math.ceil(((st.nextK - st.k) * HALF) / 1000))

  // 추세: 받은 점 + (끊긴 동안) 비어 있는 칸
  const missing = good ? st.buf.length : 0
  const N = 40, W = 600, H = 130, dx = W / (N - 1)
  const pts = [...st.hist.slice(-(N - missing))]
  const y = (v: number) => H - 8 - ((v - 70) / 32) * (H - 16)
  const x0 = (N - missing - pts.length) * dx
  const xy = pts.map((p, i) => [x0 + i * dx, y(p.v)] as const)
  // 받은 구간은 실선, 나중에 채운 구간은 점선 (채운 구간은 직전 점에서 이어 그려요)
  let solid = '', filledD = ''
  pts.forEach((p, i) => {
    const P = `${xy[i][0].toFixed(1)},${xy[i][1].toFixed(1)}`
    const prev = pts[i - 1]
    if (p.f) {
      if (!prev) filledD += `M${P}`
      else if (!prev.f) filledD += `M${xy[i - 1][0].toFixed(1)},${xy[i - 1][1].toFixed(1)}L${P}`
      else filledD += `L${P}`
    } else solid += !prev ? `M${P}` : prev.f ? `M${xy[i - 1][0].toFixed(1)},${xy[i - 1][1].toFixed(1)}L${P}` : `L${P}`
  })

  return (
    <div className="rt-st" ref={ref}>
      <div className="rt-row">
        <Seg value={good ? 'g' : 'b'} onChange={v => setGood(v === 'g')} options={[['b', '신선도 표시 없음'], ['g', '신선도 표시 있음']]} />
        <div className="rt-btns">
          <button type="button" className="btn sm" disabled={!st.link} onClick={cut}>통신 끊기</button>
          <button type="button" className="btn sm ghost" disabled={st.link} onClick={fix}>통신 복구</button>
          <button type="button" className="btn sm ghost" onClick={reset}>처음부터</button>
          <label className="rt-check"><input type="checkbox" checked={peek} onChange={e => setPeek(e.target.checked)} /> 현장 실제 값 함께 보기</label>
        </div>
      </div>

      <Hmi title="강변 변전소 · 선로 운전"
        right={good
          ? <span className={'rt-fresh' + (stale ? ' old' : '')}>{!stale && <i className="rt-live" aria-hidden="true" />}{stale ? '' : '실시간 · '}마지막 갱신 {hhmmss(tAt(st.lastK))} ({ago(age)})</span>
          : <span>{hhmmss(tAt(st.k))}</span>}
        className="rt-st-hmi">
        {good && <div className="rt-banner-slot" aria-live="polite">
          {!down && st.link && st.k >= st.filledUntil && <div className="rt-banner calm"><span>통신 정상 · 2초마다 받고 있어요</span></div>}
          {good && down && (
            <div className="rt-banner bad">
              <b>통신 끊김</b>
              <span>화면의 값은 {hhmmss(tAt(st.lastK))} 기준, {ago(age)} 값이에요. {st.link ? '재연결 중…' : `재연결 ${st.attempt}회째 실패 · ${nextTry}초 뒤 다시 시도`}</span>
            </div>
          )}
          {good && !down && st.k < st.filledUntil && (
            <div className="rt-banner ok"><b>다시 연결됐어요</b><span>끊긴 동안 밀린 데이터 {st.filledN}개를 채웠어요(점선 구간).</span></div>
          )}
          {good && !down && !st.link && st.k >= st.filledUntil && (
            <div className="rt-banner wait"><b>응답 기다리는 중</b><span>{Math.max(0, Math.ceil(LOST_AFTER * HALF / 1000 - age))}초 더 못 받으면 끊김으로 판단해요.</span></div>
          )}
        </div>}
        <div className="rt-st-tiles">
          {FEEDERS.map((f, i) => {
            const v = st.vals[i]
            const al = v > 95
            return (
              <div key={f} className={'rt-tile' + (stale ? ' stale' : '')}>
                <div className="top"><span>{f} 부하율</span>{al && !stale && <PriBadge p={2} />}{stale && <span className="tag">오래된 값</span>}</div>
                <div className="v"><b>{v.toFixed(0)}</b>%</div>
                <AnalogBar value={v} min={RANGES.load.min} max={RANGES.load.max} normal={RANGES.load.normal} alarm={RANGES.load.alarm} unit="%" name={f + ' 부하율'} w={180} />
                {peek && <div className={'truth' + (Math.abs(st.truth[i] - v) >= 3 ? ' diff' : '')}>현장 실제 값 {st.truth[i].toFixed(0)}%</div>}
              </div>
            )
          })}
        </div>
        <div className="rt-st-trend">
          <div className="cap"><span>강변 1선 부하율 추세 (최근 80초)</span><span className="lg"><i className="s" />받은 값 <i className="f" />나중에 채운 값 {good && <><i className="h" />못 받은 구간</>}</span></div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="강변 1선 부하율 추세">
            <defs><pattern id="rt-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" className="hatch" /></pattern></defs>
            <rect x="0" width={W} y={y(80)} height={y(70) - y(80)} className="band" />
            <line x1="0" x2={W} y1={y(95)} y2={y(95)} className="al" />
            {missing > 0 && <rect x={(N - missing) * dx - dx / 2} width={missing * dx + dx / 2} y="0" height={H} fill="url(#rt-hatch)" className="gap" />}
            <path d={solid} className="ln" />
            {filledD && <path d={filledD} className="ln f" />}
          </svg>
          <div className="ax"><span>정상 범위 상한 80%</span><span>경보선 95%</span></div>
        </div>
      </Hmi>
      {!good && !st.link && <Note tone="warn"><b>지금 화면은 멈췄어요.</b> 그런데 시계는 계속 가고 숫자는 정상 범위 안이라 아무 일도 없어 보여요. ‘현장 실제 값 함께 보기’를 켜 보세요.</Note>}
    </div>
  )
}

/* ================= 4. 하트비트 ================= */
function Heartbeat() {
  const [on, setOn] = useState(true)
  const [k, setK] = useState(0)
  const [recv, setRecv] = useState({ n: 1204, at: 0 })
  const base = useRef(Date.now())
  const onRef = useRef(on); onRef.current = on
  const kRef = useRef(0)
  const ref = useVisibleInterval(() => {
    const n = ++kRef.current
    setK(n)
    if (onRef.current && n % 6 === 0) setRecv(r => ({ n: r.n + 1, at: n }))
  }, 250)
  const age = ((k - recv.at) * 250) / 1000
  const quiet = age > 3
  return (
    <div className="rt-hb" ref={ref}>
      <div className="rt-btns">
        <button type="button" className="btn sm" onClick={() => setOn(v => !v)}>{on ? '데이터 끊기' : '데이터 다시 받기'}</button>
        <span className="muted">{on ? '1.5초마다 데이터가 들어오고 있어요.' : '데이터가 들어오지 않아요. 두 표시를 비교해 보세요.'}</span>
      </div>
      <div className="rt-hb-grid">
        <div className="rt-hb-card bad">
          <span className="h">나쁜 예 · 화면 자체 타이머로 움직임</span>
          <Hmi title="강변 변전소" right={<span className="rt-hb-ind"><i key={Math.floor(k / 4)} className="pulse" aria-hidden="true" />{hhmmss(new Date(base.current + k * 250))}</span>}>
            <p className="rt-hb-p">점은 1초마다 뛰고 시계도 가요. 하지만 이건 <b>브라우저가 살아 있다</b>는 뜻일 뿐, 데이터가 오는지와는 상관없어요.</p>
          </Hmi>
        </div>
        <div className="rt-hb-card good">
          <span className="h">좋은 예 · 데이터를 받을 때만 움직임</span>
          <Hmi title="강변 변전소" right={<span className={'rt-hb-ind' + (quiet ? ' quiet' : '')}><i key={recv.n} className={quiet ? 'dead' : 'pulse'} aria-hidden="true" />{quiet ? `${Math.floor(age)}초째 수신 없음` : `수신 #${recv.n} · ${ago(age)}`}</span>}>
            <p className="rt-hb-p">점은 데이터 묶음이 도착할 때만 뛰고, 수신 번호가 올라가요. 멈추면 3초 뒤 회색으로 바뀌며 <b>얼마나 오래 못 받았는지</b>를 보여줘요.</p>
          </Hmi>
        </div>
      </div>
    </div>
  )
}

/* ================= 5. 시간 표기 ================= */
const fmtTz = (d: Date, tz: string) => d.toLocaleTimeString('ko-KR', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
function TimeDemo() {
  const [skew, setSkew] = useState(-180)
  const [tz, setTz] = useState<'Asia/Seoul' | 'UTC'>('Asia/Seoul')
  const [now, setNow] = useState(() => new Date())
  const ev = useMemo(() => new Date(Date.now() - 90_000), [])
  const ref = useVisibleInterval(() => setNow(new Date()), 1000)
  const real = (now.getTime() - ev.getTime()) / 1000
  const pc = (now.getTime() + skew * 1000 - ev.getTime()) / 1000
  const pcTxt = pc < 0 ? `${Math.round(-pc)}초 뒤 (아직 안 일어난 일)` : ago(pc)
  const wrong = Math.abs(pc - real) > 2
  return (
    <div className="rt-tm" ref={ref}>
      <div className="rt-tm-ctrl">
        <div className="sys-slider">
          <div className="sys-slider-top"><span>운영자 PC 시계 오차</span><b>{skew === 0 ? '정확함' : `${Math.abs(skew / 60)}분 ${skew > 0 ? '빠름' : '느림'}`}</b></div>
          <Range value={skew} min={-300} max={300} step={30} onChange={setSkew} label="PC 시계 오차(초)" />
        </div>
        <div className="rt-tm-tz"><span className="muted">PC 시간대</span><Seg value={tz} onChange={setTz} options={[['Asia/Seoul', '서울'], ['UTC', '세계 표준시(UTC)']]} /></div>
      </div>
      <Hmi title="알람 상세 · 강변 1선 부하율 95% 초과">
        <div className="rt-tm-rows">
          <div className="ok"><span className="h">서버 시각으로 계산</span><b>발생 {fmtTz(ev, 'Asia/Seoul')} KST</b><span>{ago(real)}</span></div>
          <div className={wrong || tz === 'UTC' ? 'bad' : 'ok'}><span className="h">PC 시계 · PC 시간대로 계산</span><b>발생 {fmtTz(ev, tz)}</b><span>{pcTxt}</span></div>
        </div>
      </Hmi>
      <p className="muted rt-tm-why">{wrong ? `PC 시계가 ${Math.abs(skew / 60)}분 ${skew > 0 ? '빠르면 모든 알람이 실제보다 오래된 것처럼' : '느리면 모든 알람이 실제보다 최근 것처럼(심하면 미래처럼)'} 보여요.` : 'PC 시계가 맞으면 두 줄이 같아요. 하지만 관제 PC 시계가 늘 맞는다고 기대하면 안 돼요.'}{tz === 'UTC' ? ' 시간대까지 다르면 절대 시각도 9시간 어긋나요.' : ''}</p>
    </div>
  )
}

/* ================= 6. 흔들리지 않는 갱신 ================= */
function Digits() {
  const [tab, setTab] = useState(false)
  const [v, setV] = useState([1118.4, 8086.1, 471.9])
  const r = useRef(rng(31))
  const ref = useVisibleInterval(() => setV(a => a.map(() => +(100 + r.current() * 9800).toFixed(1))), 1000)
  return (
    <div className="rt-dg" ref={ref}>
      <Seg value={tab ? 't' : 'p'} onChange={x => setTab(x === 't')} options={[['p', '숫자 폭이 제각각 (기본)'], ['t', '숫자 폭 고정 (tabular-nums)']]} />
      <div className={'rt-dg-box' + (tab ? ' tab' : '')}>
        {['북부 변전소', '강변 변전소', '산업단지 변전소'].map((n, i) => (
          <div key={n}><span>{n} 유효전력</span><b>{v[i].toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small> kW</small></b></div>
        ))}
      </div>
      <p className="muted">값은 가상이에요. 왼쪽 정렬된 숫자 뒤의 ‘kW’가 {tab ? '제자리에 있어요.' : '1초마다 좌우로 흔들려요. 1이 8보다 좁기 때문이에요.'}</p>
    </div>
  )
}
const BASE_ROWS = ['북부 2선 전압 22.4kV 미만', '강변 2선 R/C-12 개폐기 통신 두절', '북부 변전소 출입문 개방', '산단 2선 부하율 80% 초과', '강변 3선 R/C-04 통신 두절']
const INCOMING = ['산단 3선 R/C-07 배터리 전압 낮음', '북부 1선 부하율 80% 초과', '강변 변전소 출입문 개방', '북부 3선 전압 23.4kV 초과', '산단 2선 R/C-02 통신 두절', '강변 1선 부하율 80% 초과', '북부 2선 R/C-09 통신 두절', '산단 3선 전압 22.4kV 미만']
const TARGET = '강변 2선 R/C-12 개폐기 통신 두절'
function Reorder() {
  const [mode, setMode] = useState<'insert' | 'buffer'>('insert')
  const [rows, setRows] = useState(BASE_ROWS)
  const [pending, setPending] = useState<string[]>([])
  const nRef = useRef(0)
  const [run, setRun] = useState(false)
  const [res, setRes] = useState<{ ok: boolean; txt: string } | null>(null)
  const ref = useVisibleInterval(() => {
    const i = nRef.current
    if (i >= INCOMING.length) { setRun(false); return }
    const a = INCOMING[i]; nRef.current = i + 1
    if (mode === 'insert') setRows(rs => [a, ...rs]); else setPending(p => [a, ...p])
  }, 1300, run)
  const start = () => { setRows(BASE_ROWS); setPending([]); nRef.current = 0; setRes(null); setRun(true) }
  const ack = (row: string) => {
    setRes(row === TARGET ? { ok: true, txt: '맞게 눌렀어요.' } : { ok: false, txt: `다른 알람(‘${row}’)을 확인해 버렸어요.` })
    setRun(false)
  }
  return (
    <div className="rt-ro" ref={ref}>
      <div className="rt-row">
        <Seg value={mode} onChange={v => { setMode(v); setRun(false); setRows(BASE_ROWS); setPending([]); nRef.current = 0; setRes(null) }} options={[['insert', '들어오는 대로 맨 위에 끼우기'], ['buffer', '‘새 알람 n건’으로 모아 두기']]} />
        <button type="button" className="btn sm" onClick={start}>{run ? '다시 시작' : '시작'}</button>
      </div>
      <p className="rt-ro-task"><b>과제</b> 시작을 누른 뒤 <b>‘{TARGET}’</b> 줄의 ‘확인’을 눌러 보세요.</p>
      <Hmi title="알람 목록" right={`${rows.length}건`}>
        {mode === 'buffer' && <div className="rt-ro-slot">
          {pending.length > 0 ? (
            <button type="button" className="rt-ro-new" onClick={() => { setRows(rs => [...pending, ...rs]); setPending([]) }}>새 알람 {pending.length}건 — 눌러서 보기</button>
          ) : <span className="rt-ro-none">새 알람이 오면 여기에 모여요. 목록은 움직이지 않아요.</span>}
        </div>}
        <ul className="rt-ro-list">
          {rows.slice(0, 8).map(row => (
            <li key={row} className={row === TARGET ? 'tg' : ''}>
              <span>{row}</span>
              <button type="button" className="btn sm ghost" onClick={() => ack(row)} aria-label={`${row} 확인`}>확인</button>
            </li>
          ))}
        </ul>
      </Hmi>
      {res && <p className={'rt-ro-res' + (res.ok ? ' ok' : ' bad')} aria-live="polite">{res.txt} {res.ok ? (mode === 'insert' ? '줄이 계속 밀리는데도 잘 잡았네요. 실제 근무에서는 다른 일을 하다 돌아와 누르는 경우가 많아요.' : '목록이 그대로 있어 누를 곳이 움직이지 않았어요.') : '누르려는 순간 새 줄이 위에 끼면서 목록이 한 칸 밀렸어요.'}</p>}
    </div>
  )
}

/* ================= 7. 정리 ================= */
const CHECK = [
  '값마다 ‘언제 받은 값인지’ 알 수 있나요?',
  '통신이 끊긴 걸 몇 초 안에 판단할지 정했고, 화면에 배너로 알려 주나요?',
  '오래된 값은 회색·빗금처럼 살아 있는 값과 다르게 보이나요?',
  '하트비트가 화면 타이머가 아니라 데이터 수신에 묶여 있나요?',
  '시각은 서버 기준이고, 다른 시스템과 주고받을 때 시간대를 적었나요?',
  '갱신 때 레이아웃·스크롤 위치·선택한 줄이 그대로인가요?',
  '보고 있는 목록이 갑자기 재정렬되지 않나요?',
  '변화 강조는 1초 안에 사라지고, 동작 줄이기 설정을 지키나요?',
  '재연결한 뒤 밀린 데이터를 채우고, 채운 구간을 구분해 보여 주나요?',
]
function Checklist() {
  const [on, setOn] = useState<boolean[]>(() => CHECK.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <div className="rt-ck">
      <div className="rt-ck-top"><span>우리 화면은 몇 개를 지키나요?</span><b className={n === CHECK.length ? 'is-ok' : ''}>{n} / {CHECK.length}</b></div>
      <ul>
        {CHECK.map((q, i) => (
          <li key={i}><label><input type="checkbox" checked={on[i]} onChange={() => setOn(a => a.map((v, j) => (j === i ? !v : v)))} /><span>{q}</span></label></li>
        ))}
      </ul>
    </div>
  )
}

const REFS: RefItem[] = [
  { kind: 'paper', text: 'Endsley, M. R. (1995) “Toward a Theory of Situation Awareness in Dynamic Systems”, Human Factors 37(1) — 지각 → 이해 → 예측, 앞 단계가 틀리면 뒤도 틀려요', url: 'https://en.wikipedia.org/wiki/Situation_awareness' },
  { kind: 'paper', text: 'Healey 등, 전주의 처리(preattentive processing) — 색·모양·움직임은 200~250ms 안에 튀어 보여요' },
  { kind: 'standard', text: 'WCAG 2.1 성공 기준 2.3.1 — 초당 3회 이하 깜빡임', url: 'https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html' },
  { kind: 'standard', text: 'ANSI/ISA-101.01-2015 공정 자동화 HMI — 회색조 기본, 색은 비정상에만', url: 'https://blog.isa.org/the-high-performance-hmi' },
  { kind: 'paper', text: 'Woods, D. D. (1984) “Visual momentum: a concept to improve the cognitive coupling of person and computer” — 화면이 바뀌어도 맥락을 잃지 않게' },
  { kind: 'book', text: 'Stephen Few, Information Dashboard Design (2006, 2판 2013) — 한 화면에서 한눈에' },
  { kind: 'practice', text: '고성능 HMI 표시 기법(업체 문서) — 정상 범위가 그려진 아날로그 막대, 정상 범위 띠가 깔린 추세', url: 'https://docs.inductiveautomation.com/docs/8.1/ignition-modules/vision/common-tasks-in-vision/high-performance-hmitechniques' },
  { kind: 'practice', text: '실무 경험 — 데이터 종류별 갱신 방식, 끊김 판단 시간과 배너, 데이터 수신에 묶은 하트비트, 서버 시각 기준 표기, 목록 재정렬 금지' },
]

export default function Tab() {
  return (
    <div data-dash="realtime">
      <SysGrid>
        <Section id="dash-realtime-why" wide title="실시간 화면이 거짓말하는 두 가지 방법"
          desc="하나는 너무 자주 바뀌어서 읽을 수 없는 것, 다른 하나는 멈췄는데 살아 있는 것처럼 보이는 것이에요. 둘 중 더 위험한 건 두 번째예요.">
          <div className="rt-why">
            <Finding src={<>Endsley (1995) 상황 인식 이론 요약 <Cite n={R.endsley} /></>}>
              상황 인식은 지각 → 이해 → 예측 순서로 쌓여요. 첫 단계의 값이 틀리면, 그 위의 판단은 아무리 똑똑해도 틀려요.
            </Finding>
            <SaChain />
          </div>
        </Section>

        <Section id="dash-realtime-rate" wide title="갱신 주기: 빠를수록 좋은 게 아니에요"
          desc={<>같은 신호를 1초·5초·30초마다 갱신해 봤어요. 움직이는 것은 0.2~0.25초 안에 눈을 끌어당겨요 <Cite n={R.healey} />. 숫자가 쉬지 않고 바뀌면, 정작 이상이 생긴 곳으로 가야 할 주의를 계속 빼앗겨요.</>}>
          <RateDemo />
        </Section>

        <Section id="dash-realtime-stale" wide title="멈춘 화면이 정상처럼 보이는 게 가장 위험해요"
          desc="‘통신 끊기’를 누르면 그사이 현장에서는 강변 1선 부하가 오르기 시작해요. 신선도 표시가 없을 때와 있을 때를 비교해 보세요. 숫자는 모두 가상이에요.">
          <StaleDemo />
          <div className="rt-rules3">
            <div><b>끊김을 판단하는 시간을 정해요</b><p>예시는 데이터 2초 주기에 5초 동안 못 받으면 끊김이에요. 주기의 두세 배쯤으로 잡고, 정의서에 적어요 <Cite n={R.practice} />.</p></div>
            <div><b>오래된 값은 다르게 그려요</b><p>회색과 빗금, ‘오래된 값’ 글자를 함께 써요. 색만 바꾸면 회색조 화면에서는 티가 안 나요 <Cite n={R.isa101} />. 오래된 값으로는 알람을 판단하지 않아요.</p></div>
            <div><b>복구하면 빈 구간을 채워요</b><p>끊긴 동안의 값을 서버에서 다시 받아 추세를 이어요. 나중에 채운 구간은 점선으로 구분해요. 구현은 <a href="#/dash/fe">09 FE · 구현</a>에서 다뤄요.</p></div>
          </div>
        </Section>

        <Section id="dash-realtime-heartbeat" title="화면이 살아 있다는 신호"
          desc="관제 화면은 대부분의 시간 동안 아무것도 안 바뀌어요. 그래서 ‘바뀔 게 없는 것’과 ‘멈춘 것’을 구분할 신호가 따로 필요해요.">
          <Heartbeat />
          <Note tone="tip">하트비트의 점은 1초에 한 번 이하로만 뛰고, 동작 줄이기를 켜면 점은 멈추고 수신 번호와 경과 시간 글자만 바뀌어요.</Note>
        </Section>

        <Section id="dash-realtime-time" title="시각은 서버 기준으로 적어요"
          desc="‘3분 전’ 같은 상대 시각은 운영자 PC 시계로 계산하면 틀려요. 기준을 서버 시각 하나로 맞춰요.">
          <TimeDemo />
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th>어디에</th><th>쓰는 표기</th><th>이유</th></tr></thead>
              <tbody>
                <tr><td><b>데이터 신선도</b></td><td>상대 시각 ‘12초 전’ + 절대 시각</td><td>얼마나 오래됐는지가 핵심이라 경과 시간이 먼저 읽혀야 해요.</td></tr>
                <tr><td><b>알람 목록</b></td><td>절대 시각 ‘14:02:11’</td><td>여러 알람의 앞뒤 순서를 비교해야 해요. 상대 시각은 계속 바뀌어 비교가 어려워요.</td></tr>
                <tr><td><b>교대 기록 · 보고</b></td><td>날짜 + 절대 시각 + 시간대</td><td>나중에 다른 사람이 다른 시스템 기록과 맞춰 봐야 해요.</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="dash-realtime-stable" wide title="갱신해도 화면이 흔들리지 않게"
          desc={<>값이 바뀌어도 자리는 그대로여야 해요. 운영자는 ‘어디에 무엇이 있는지’를 몸으로 기억하고 일해요. 화면이 바뀌어도 맥락을 잃지 않게 하는 것을 시각적 연속성(visual momentum)이라고 불러요 <Cite n={R.woods} />.</>}>
          <div className="rt-stable">
            <div><h4>숫자 폭 고정</h4><Digits /></div>
            <div><h4>보고 있는 목록을 갑자기 바꾸지 않기</h4><Reorder /></div>
          </div>
          <Note>스크롤 위치와 선택한 줄도 갱신 뒤에 그대로 둬요. 새 항목은 ‘새 알람 3건 — 눌러서 보기’처럼 사용자가 원할 때 합쳐요. 단, <b>긴급 알람은 예외</b>로 모아 두지 말고 바로 보여 줘요 <Cite n={R.practice} />.</Note>
        </Section>

        <Section id="dash-realtime-rules" wide title="데이터마다 갱신 방식이 달라요"
          desc="모든 값을 같은 주기로 갱신할 필요는 없어요. 무엇을 보여주는지에 따라 정해요. 아래는 실무에서 쓰는 출발점이에요.">
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th>데이터</th><th>갱신</th><th>화면에서</th></tr></thead>
              <tbody>
                <tr><td><b>차단기 트립 같은 상태 변화</b></td><td>바뀌는 즉시(서버가 밀어 줌)</td><td>알람으로 올리고, 해당 설비 표시도 바로 바꿔요.</td></tr>
                <tr><td><b>부하율·전압 같은 측정값</b></td><td>수 초 간격</td><td>의미 있는 자릿수만, 작은 출렁임은 무시해요. 아날로그 막대로 범위 안인지 보여줘요 <Cite n={R.hmi} />.</td></tr>
                <tr><td><b>하루 추세 · 통계</b></td><td>분 단위</td><td>‘14:00 기준’처럼 집계 시각을 붙여요.</td></tr>
                <tr><td><b>통신 상태</b></td><td>하트비트로 상시</td><td>끊기면 바로 배너, 값은 오래된 값 표시로 바꿔요.</td></tr>
              </tbody>
            </table>
          </div>
          <Checklist />
          <Note>한눈에 읽히는 화면이 목표예요 <Cite n={R.few} />. 갱신이 많은 화면일수록 ‘지금 무엇이 바뀌었는지’보다 ‘지금 무엇이 비정상인지’가 먼저 보여야 해요. 알람 쪽 이야기는 <a href="#/dash/alarm">03 알람 설계</a>에 있어요.</Note>
        </Section>

        <Refs items={REFS} />
      </SysGrid>
    </div>
  )
}
