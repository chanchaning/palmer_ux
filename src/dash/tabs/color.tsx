/* 02 회색이 기본, 색은 신호 — 모든 선택자는 [data-dash="color"] 범위 */
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Seg, useTimers } from '../../components/ui'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { contrast, fmtRatio, luminance, simulate, toHex, type RGB, type Vision } from '../../guides/20-contrast/lib'
import { VisionFilters } from '../../guides/20-contrast/shared'
import { PRI, SUBSTATIONS, rng, type Pri } from '../data'
import { Cite, Finding, Hmi, PriBadge, Refs, useVisibleInterval } from '../ui'
import './color.css'

/* ---------- 공용 ---------- */
const hexRgb = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB
const ALARM_HEX: Record<Pri, string> = { 1: '#c92a2a', 2: '#e8590c', 3: '#f2c230' }
const FEEDERS = SUBSTATIONS.flatMap(s => s.feeders.map(f => ({ ...f, sub: s.name })))
const sec = (ms: number) => (ms / 1000).toFixed(1)

function Shape({ p, size = 22, outline }: { p: Pri; size?: number; outline?: string }) {
  const s = PRI[p].shape
  const st = outline ? { stroke: outline, strokeWidth: 1.5 } : {}
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      {s === 'square' && <rect x="2" y="2" width="16" height="16" rx="2" fill={ALARM_HEX[p]} {...st} />}
      {s === 'triangle' && <path d="M10 1.8 18.6 17.6H1.4z" fill={ALARM_HEX[p]} {...st} />}
      {s === 'circle' && <circle cx="10" cy="10" r="8.2" fill={ALARM_HEX[p]} {...st} />}
    </svg>
  )
}

/* ================= 1. 숨은 이상 찾기 ================= */
type Mode = 'trad' | 'hp'
type Metric = 'load' | 'kv' | 'temp'
interface Board { vals: { load: number; kv: number; temp: number }[]; target: number; metric: Metric; phase: number[][] }

function makeBoard(seed: number, withTarget: boolean): Board {
  const r = rng(seed)
  const between = (a: number, b: number, d = 0) => +(a + r() * (b - a)).toFixed(d)
  const vals = FEEDERS.map(() => ({ load: between(46, 76), kv: between(22.5, 23.2, 1), temp: between(50, 70) }))
  const phase = FEEDERS.map(() => [0, 1, 2].map(() => 0.55 + r() * 0.4))
  const target = withTarget ? Math.floor(r() * FEEDERS.length) : -1
  const metric = (['load', 'kv', 'temp'] as Metric[])[Math.floor(r() * 3)]
  if (target >= 0) {
    if (metric === 'load') vals[target].load = between(96, 99)
    if (metric === 'kv') vals[target].kv = between(21.8, 21.9, 1)
    if (metric === 'temp') vals[target].temp = between(91, 94)
  }
  return { vals, target, metric, phase }
}

const MET: { k: Metric; name: string; unit: string; fmt: (v: number) => string }[] = [
  { k: 'load', name: '부하율', unit: '%', fmt: v => String(v) },
  { k: 'kv', name: '전압', unit: 'kV', fmt: v => v.toFixed(1) },
  { k: 'temp', name: '유온', unit: '℃', fmt: v => String(v) },
]

function FeederCard({ i, b, mode, onPick, state }: { i: number; b: Board; mode: Mode; onPick: (i: number) => void; state: '' | 'hit' | 'miss' | 'reveal' }) {
  const f = FEEDERS[i], v = b.vals[i], bad = b.target === i
  return (
    <button type="button" className={'cl-fd' + (state ? ' is-' + state : '')} onClick={() => onPick(i)} aria-label={f.name}>
      <span className="cl-fd-top">
        <b>{f.name}</b>
        {mode === 'trad'
          ? <span className={'cl-lamp' + (bad ? ' red' : '')}><i />{bad ? '이상' : '운전'}</span>
          : <span className="cl-hp-state">{bad ? <PriBadge p={2} size={16} /> : null}</span>}
      </span>
      <span className="cl-fd-line" aria-hidden="true">
        <svg viewBox="0 0 120 14" preserveAspectRatio="none">
          <line x1="0" y1="7" x2="120" y2="7" className="ln" />
          <rect x="22" y="2" width="12" height="10" className="cb" />
          <circle cx="96" cy="7" r="4" className="sw" />
        </svg>
        <span className="cb-tx">투입</span>
      </span>
      <span className="cl-fd-vals">
        {MET.map(m => {
          const out = bad && b.metric === m.k
          return (
            <span key={m.k} className={'cl-v ' + m.k + (out ? ' out' : '')}>
              <span className="nm">{m.name}</span>
              <span className="nv">{mode === 'hp' && out && <PriBadge p={2} size={14} />}{m.fmt(v[m.k])}<small>{m.unit}</small></span>
            </span>
          )
        })}
      </span>
      <span className="cl-fd-phase" aria-hidden="true">
        {b.phase[i].map((p, k) => <i key={k} className={'ph' + k} style={{ height: p * 100 + '%' }} />)}
      </span>
    </button>
  )
}

interface Rec { mode: Mode; ms: number; miss: number }

function HuntGame() {
  const [mode, setMode] = useState<Mode>('trad')
  const [seed, setSeed] = useState(7)
  const [run, setRun] = useState<{ t0: number; miss: number } | null>(null)
  const [last, setLast] = useState<{ i: number; ok: boolean } | null>(null)
  const [done, setDone] = useState<{ ms: number; miss: number; gave?: boolean } | null>(null)
  const [recs, setRecs] = useState<Rec[]>([])
  const [, setTick] = useState(0)
  const watch = useVisibleInterval(() => setTick(t => t + 1), 100, !!run)
  const board = useMemo(() => makeBoard(seed, run !== null || done !== null), [seed, run, done])

  const start = () => { setSeed(Math.floor(Math.random() * 1e9)); setDone(null); setLast(null); setRun({ t0: performance.now(), miss: 0 }) }
  const changeMode = (m: Mode) => { setMode(m); setRun(null); setDone(null); setLast(null) }
  const pick = (i: number) => {
    if (!run) return
    if (i === board.target) {
      const ms = performance.now() - run.t0
      setRecs(r => [...r, { mode, ms, miss: run.miss }])
      setDone({ ms, miss: run.miss }); setRun(null); setLast({ i, ok: true })
    } else { setRun({ ...run, miss: run.miss + 1 }); setLast({ i, ok: false }) }
  }
  const giveUp = () => { if (!run) return; setDone({ ms: performance.now() - run.t0, miss: run.miss, gave: true }); setRun(null); setLast(null) }

  const avg = (m: Mode) => { const a = recs.filter(r => r.mode === m); return a.length ? a.reduce((s, r) => s + r.ms, 0) / a.length : 0 }
  const cnt = (m: Mode) => recs.filter(r => r.mode === m).length
  const maxAvg = Math.max(avg('trad'), avg('hp'), 1)
  const elapsed = run ? performance.now() - run.t0 : done ? done.ms : 0
  const tgt = FEEDERS[board.target]

  return (
    <div className="cl-hunt">
      <div className="cl-hunt-ctl">
        <Seg value={mode} onChange={changeMode} options={[['trad', '전통형 화면'], ['hp', '고성능형 화면']] as const} />
        <button type="button" className="btn sm" onClick={start}>{run ? '새 문제로 다시' : done ? '한 번 더' : '시작'}</button>
        {run && <button type="button" className="btn sm ghost" onClick={giveUp}>정답 보기</button>}
        <div ref={watch} className={'cl-watch' + (run ? ' on' : '')} aria-live="off">
          <span className="muted">걸린 시간</span><b>{sec(elapsed)}초</b>
        </div>
      </div>
      <p className="cl-hunt-msg" role="status">
        {!run && !done && <>시작을 누르면 9개 선로 중 한 곳에 <b>경보 범위를 넘은 값 1개</b>가 숨어요. 찾으면 그 선로 칸을 누르세요.</>}
        {run && (last && !last.ok ? <>{FEEDERS[last.i].name}은 정상이에요. 계속 찾아보세요. (헛짚음 {run.miss}번)</> : <>찾는 중이에요. 이상이 있는 선로를 누르세요.</>)}
        {done && !done.gave && <><b>{sec(done.ms)}초</b> 만에 찾았어요 ({mode === 'trad' ? '전통형' : '고성능형'}, 헛짚음 {done.miss}번). {tgt.name} {MET.find(m => m.k === board.metric)!.name}이 경보 범위를 넘었어요. 이번엔 화면 방식을 바꿔서 해 보세요.</>}
        {done?.gave && <>정답은 <b>{tgt.name}</b>의 {MET.find(m => m.k === board.metric)!.name}이에요. 기록에는 넣지 않았어요.</>}
      </p>

      <Hmi className={'cl-board ' + mode} title={mode === 'trad' ? '전체 개요 · 전통형' : '전체 개요 · 고성능형'} right="누리시 배전 관제센터">
        <div className="cl-board-grid">
          {SUBSTATIONS.map((s, si) => (
            <div key={s.id} className="cl-sub">
              <div className="cl-sub-name"><span className="bus" aria-hidden="true" />{s.name}</div>
              <div className="cl-sub-fds">
                {s.feeders.map((_, fi) => {
                  const i = si * 3 + fi
                  const st = last?.i === i ? (last.ok ? 'hit' : 'miss') : done?.gave && board.target === i ? 'reveal' : ''
                  return <FeederCard key={i} i={i} b={board} mode={mode} onPick={pick} state={st} />
                })}
              </div>
            </div>
          ))}
        </div>
      </Hmi>

      <div className="cl-rec">
        <div className="cl-rec-bars" aria-label="방식별 평균 시간">
          {(['trad', 'hp'] as Mode[]).map(m => (
            <div key={m} className={'cl-rec-row ' + m}>
              <span>{m === 'trad' ? '전통형' : '고성능형'} <small className="muted">{cnt(m)}번</small></span>
              <span className="bar"><i style={{ width: (avg(m) / maxAvg) * 100 + '%' }} /></span>
              <b>{cnt(m) ? sec(avg(m)) + '초' : '–'}</b>
            </div>
          ))}
        </div>
        <div className="cl-rec-side">
          {cnt('trad') && cnt('hp') ? (
            <p>지금까지 평균으로 보면 고성능형이 전통형보다 <b>{avg('trad') / avg('hp') >= 1.1 ? `${(avg('trad') / avg('hp')).toFixed(1)}배 빨랐어요` : '크게 빠르지 않았어요'}</b>. 여러분 한 사람의 몇 번 기록이라 실험은 아니에요. 그래도 차이가 어디서 오는지는 몸으로 느껴져요.</p>
          ) : <p className="muted">두 방식으로 각각 3번 정도 해 보면 평균이 비교돼요.</p>}
          {recs.length > 0 && <button type="button" className="btn sm ghost" onClick={() => setRecs([])}>기록 지우기</button>}
        </div>
      </div>
    </div>
  )
}

/* ================= 2. ASM 실험 보고 수치 ================= */
function AsmChart() {
  const [v, setV] = useState<'old' | 'hp'>('old')
  const hp = v === 'hp'
  return (
    <div className="cl-asm">
      <div className="cl-asm-ctl">
        <Seg value={v} onChange={setV} options={[['old', '기존 화면'], ['hp', '고성능 화면']] as const} />
        <span className="dash-kind k-reported">보고된 수치</span>
      </div>
      <div className="cl-asm-grid">
        <figure className="cl-asm-card">
          <figcaption>알람이 울리기 <b>전에</b> 이상을 알아챈 비율</figcaption>
          <div className="cl-dots" role="img" aria-label={`10번 중 ${hp ? 5 : 1}번`}>
            {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < (hp ? 5 : 1) ? 'on' : ''} />)}
          </div>
          <div className="cl-asm-num"><b>{hp ? 5 : 1}</b><span>/ 10번</span></div>
          <p>기존 1번 → 고성능 5번, <b>5배</b></p>
        </figure>
        <figure className="cl-asm-card">
          <figcaption>상황 대응에 성공한 비율</figcaption>
          <div className="cl-hbar" role="img" aria-label={`${hp ? 96 : 70}%`}>
            <i className="ghost" style={{ width: '96%' }} />
            <i className="cur" style={{ width: (hp ? 96 : 70) + '%' }} />
            <span className="tick" style={{ left: '70%' }} />
          </div>
          <div className="cl-asm-num"><b>{hp ? 96 : 70}</b><span>%</span></div>
          <p>기존 70% → 고성능 96%</p>
        </figure>
        <figure className="cl-asm-card">
          <figcaption>상황을 처리하는 데 걸린 시간</figcaption>
          <div className="cl-hbar time" role="img" aria-label={`${hp ? 10.6 : 18.1}분`}>
            <i className="ghost" style={{ width: (18.1 / 20) * 100 + '%' }} />
            <i className="cur" style={{ width: ((hp ? 10.6 : 18.1) / 20) * 100 + '%' }} />
          </div>
          <div className="cl-asm-num"><b>{hp ? '10.6' : '18.1'}</b><span>분</span></div>
          <p>18.1분 → 10.6분, <b>41% 단축</b></p>
        </figure>
      </div>
    </div>
  )
}

/* ================= 3. 전주의 처리 ================= */
type FieldSt = 'show' | 'flash' | 'guess' | 'result'
function layout(seed: number) {
  const r = rng(seed)
  const slots: [number, number][] = []
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) slots.push([22 + x * 39.5 + (r() - 0.5) * 14, 24 + y * 40 + (r() - 0.5) * 14])
  slots.splice(Math.floor(r() * slots.length), 1) // 31개
  return { pts: slots, odd: Math.floor(r() * slots.length) }
}

function PopField({ base, title, sub }: { base: 'green' | 'gray'; title: string; sub: ReactNode }) {
  const [seed, setSeed] = useState(base === 'green' ? 11 : 23)
  const [st, setSt] = useState<FieldSt>('show')
  const [guess, setGuess] = useState(-1)
  const [score, setScore] = useState({ ok: 0, n: 0 })
  const tm = useTimers()
  const { pts, odd } = useMemo(() => layout(seed), [seed])
  const flash = () => {
    tm.clear(); setSeed(Math.floor(Math.random() * 1e9)); setGuess(-1); setSt('flash')
    tm.set(() => setSt('guess'), 250)
  }
  const answer = (i: number) => { if (st !== 'guess') return; setGuess(i); setSt('result'); setScore(s => ({ ok: s.ok + (i === odd ? 1 : 0), n: s.n + 1 })) }
  const near = guess === odd
  return (
    <figure className={'cl-pop ' + base}>
      <figcaption><b>{title}</b><span className="muted">{sub}</span></figcaption>
      <svg viewBox="0 0 320 170" className={'cl-pop-svg st-' + st} role="group" aria-label={st === 'guess' ? '빨간 램프가 있던 자리를 고르세요' : title}>
        <rect x="0" y="0" width="320" height="170" rx="10" className="bg" />
        {pts.map(([x, y], i) => {
          const hidden = st === 'guess'
          const cls = hidden ? 'lamp hid' : i === odd ? 'lamp odd' : 'lamp'
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="9" className={cls + (st === 'result' && i === guess ? ' picked' : '')}
                {...(hidden ? {
                  role: 'button', tabIndex: 0, 'aria-label': `${i + 1}번째 자리`,
                  onClick: () => answer(i),
                  onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answer(i) } },
                } : {})} />
              {st === 'result' && i === odd && <circle cx={x} cy={y} r="15" className="ring" />}
            </g>
          )
        })}
        {st === 'guess' && <text x="160" y="164" textAnchor="middle" className="hint">빨간 램프가 있던 자리를 누르세요</text>}
      </svg>
      <div className="cl-pop-foot">
        <button type="button" className="btn sm" onClick={flash}>0.25초만 보고 맞히기</button>
        <span role="status" className="cl-pop-res">
          {st === 'result' && (near ? <b className="ok">맞혔어요</b> : <b className="no">빗나갔어요</b>)}
          {score.n > 0 && <span className="muted"> 지금까지 {score.n}번 중 {score.ok}번</span>}
        </span>
      </div>
    </figure>
  )
}

/* ================= 4. 색각 이상 ================= */
const VIS: [Vision, string][] = [['normal', '정상 시각'], ['protan', '적색맹 시뮬레이션'], ['deutan', '녹색맹 시뮬레이션'], ['achroma', '흑백']]
const LIST: { p: Pri; where: string; what: string }[] = [
  { p: 1, where: '산단 1선', what: '차단기 트립' },
  { p: 2, where: '강변 1선', what: '부하율 95% 초과' },
  { p: 3, where: '북부 2선', what: '전압 22.4kV 미만' },
]
function CvdDemo() {
  const [v, setV] = useState<Vision>('deutan')
  const sim = (h: string) => toHex(simulate(hexRgb(h), v))
  const pairs: [Pri, Pri][] = [[1, 2], [2, 3], [1, 3]]
  return (
    <div className="cl-cvd">
      <VisionFilters prefix="dcol" />
      <Seg value={v} onChange={setV} options={VIS} />
      <div className="cl-cvd-grid" style={{ filter: v === 'normal' ? undefined : `url(#dcol-${v})` }}>
        <div className="cl-cvd-box">
          <h4>정상은 초록, 고장은 빨강</h4>
          <div className="cl-cvd-lamps">
            <span><i style={{ background: '#2f9e44' }} />북부 3선</span>
            <span><i style={{ background: '#c92a2a' }} />산단 1선</span>
            <span><i style={{ background: '#2f9e44' }} />강변 3선</span>
          </div>
        </div>
        <div className="cl-cvd-box">
          <h4>우선순위를 색으로만</h4>
          <ul>{LIST.map(a => <li key={a.p}><i className="dot" style={{ background: ALARM_HEX[a.p] }} /><b>{a.where}</b><span>{a.what}</span></li>)}</ul>
        </div>
        <div className="cl-cvd-box good">
          <h4>색 + 모양 + 숫자</h4>
          <ul>{LIST.map(a => <li key={a.p}><PriBadge p={a.p} size={20} /><b>{a.where}</b><span>{a.what}</span></li>)}</ul>
        </div>
      </div>
      <div className="sys-table-wrap">
        <table className="sys-table cl-cvd-tbl">
          <thead><tr><th>짝</th><th>정상 시각 밝기 대비</th><th>{VIS.find(x => x[0] === v)![1]} 밝기 대비</th><th>구분 단서</th></tr></thead>
          <tbody>
            {pairs.map(([a, b]) => {
              const c0 = contrast(hexRgb(ALARM_HEX[a]), hexRgb(ALARM_HEX[b]))
              const c1 = contrast(simulate(hexRgb(ALARM_HEX[a]), v), simulate(hexRgb(ALARM_HEX[b]), v))
              return (
                <tr key={a + '-' + b}>
                  <td><span className="cl-sw2"><i style={{ background: sim(ALARM_HEX[a]) }} /><i style={{ background: sim(ALARM_HEX[b]) }} /></span>{PRI[a].name} · {PRI[b].name}</td>
                  <td>{fmtRatio(c0)} : 1</td>
                  <td>{fmtRatio(c1)} : 1</td>
                  <td>{PRI[a].shape === 'square' ? '네모' : PRI[a].shape === 'triangle' ? '세모' : '동그라미'} vs {PRI[b].shape === 'square' ? '네모' : PRI[b].shape === 'triangle' ? '세모' : '동그라미'}, 숫자 {a} vs {b}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================= 5. 배경 밝기와 알람 색 ================= */
function BgDemo() {
  const [g, setG] = useState(220)
  const [outline, setOutline] = useState(false)
  const bg: RGB = [g, g, g]
  const txt: RGB = contrast([27, 27, 25], bg) >= contrast([240, 240, 236], bg) ? [27, 27, 25] : [240, 240, 236]
  const ol = toHex(txt)
  const lum = luminance(bg)
  const allPass = useMemo(() => {
    const ok: number[] = []
    for (let x = 0; x <= 255; x++) if (([1, 2, 3] as Pri[]).every(p => contrast(hexRgb(ALARM_HEX[p]), [x, x, x]) >= 3)) ok.push(x)
    return ok
  }, [])
  const presets: [string, number][] = [['흰색', 255], ['밝은 회색', 220], ['중간 회색', 150], ['어두운 회색', 44], ['검정', 0]]
  return (
    <div className="cl-bg">
      <div className="cl-bg-ctl">
        <label className="cl-bg-slider">
          <span>배경 밝기 <b>{toHex(bg)}</b></span>
          <input type="range" min={0} max={255} value={g} onChange={e => setG(+e.target.value)} aria-label="배경 밝기" style={{ ['--p' as string]: (g / 255) * 100 + '%' }} />
        </label>
        <div className="cl-bg-pre">
          {presets.map(([n, v]) => <button key={n} type="button" className="chip" aria-pressed={g === v} onClick={() => setG(v)}>{n}</button>)}
        </div>
        <label className="cl-check"><input type="checkbox" checked={outline} onChange={e => setOutline(e.target.checked)} />알람 모양에 글자색 테두리 두르기</label>
      </div>
      <div className="cl-bg-wrap">
        <div className="cl-bg-panel" style={{ background: toHex(bg), color: toHex(txt) }}>
          <div className="row"><b>강변 1선</b><span>부하율 83%</span></div>
          <div className="row shapes">
            {([1, 2, 3] as Pri[]).map(p => <span key={p}><Shape p={p} size={30} outline={outline ? ol : undefined} />{PRI[p].name}</span>)}
          </div>
        </div>
        <dl className="cl-bg-stats">
          <div><dt>화면 밝기(상대 휘도)</dt><dd><span className="cl-meter"><i style={{ width: lum * 100 + '%' }} /></span>{Math.round(lum * 100)}%</dd></div>
          <div><dt>글자 대비</dt><dd>{fmtRatio(contrast(txt, bg))} : 1</dd></div>
          {([1, 2, 3] as Pri[]).map(p => {
            const c = outline ? contrast(txt, bg) : contrast(hexRgb(ALARM_HEX[p]), bg)
            return <div key={p}><dt>{PRI[p].name} 모양 경계 대비</dt><dd className={c >= 3 ? 'pass' : 'fail'}>{fmtRatio(c)} : 1 <small>{c >= 3 ? '3:1 통과' : '3:1 미달'}</small></dd></div>
          })}
        </dl>
      </div>
      <Note><b>세 알람 색이 모두 배경과 3:1을 넘는 회색은 {allPass.length ? `${toHex([allPass[0], allPass[0], allPass[0]])}~${toHex([allPass[allPass.length - 1], allPass[allPass.length - 1], allPass[allPass.length - 1]])}, 거의 검정에 가까운 배경뿐이에요` : '하나도 없어요'}.</b> 노랑과 주황은 밝은 색이라, 권장하는 밝은 회색 배경 위에서는 경계가 흐려져요(이 숫자들은 이 화면에서 직접 계산한 값이에요). 그래서 밝은 배경에서는 알람 모양에 <b>어두운 테두리</b>와 <b>숫자</b>처럼 밝기 차이로 읽히는 단서를 같이 붙여요. 위의 체크를 켜 보세요.</Note>
    </div>
  )
}

/* ================= 6. 체크리스트 ================= */
function CheckList({ items }: { items: string[] }) {
  const [on, setOn] = useState<boolean[]>(() => items.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <div className="cl-checklist">
      <div className="top"><span>화면 리뷰 때 하나씩 확인해요</span><b className={n === items.length ? 'ok' : ''}>{n} / {items.length}</b></div>
      <ul>{items.map((q, i) => <li key={i}><label><input type="checkbox" checked={on[i]} onChange={() => setOn(a => a.map((v, j) => (j === i ? !v : v)))} /><span>{q}</span></label></li>)}</ul>
    </div>
  )
}

const TOKENS = `/* 관제 화면 색 토큰 — 회색조가 기본, 알람 색은 알람에만 */
:root {
  /* 회색조: 화면 대부분은 이 다섯 개로 그려요 */
  --hmi-bg: #dcdcd8;      /* 배경. 흰색보다 어둡게 → 눈부심 줄이기 */
  --hmi-panel: #e9e9e6;   /* 패널·카드 */
  --hmi-line: #b4b4ae;    /* 구분선, 꺼진 설비 */
  --hmi-equip: #8a8a84;   /* 정상 운전 중인 설비(배관·선로·차단기) */
  --hmi-text: #1b1b19;    /* 값과 이름 */

  /* 알람 우선순위: 이 세 개는 알람 표시 컴포넌트에서만 참조해요 */
  --alarm-1: #c92a2a;     /* 긴급 · 네모 · 1 */
  --alarm-2: #e8590c;     /* 높음 · 세모 · 2 */
  --alarm-3: #f2c230;     /* 주의 · 동그라미 · 3 */
  --alarm-outline: var(--hmi-text); /* 밝은 배경 위 노랑·주황 경계 확보 */
}

/* 금지: 버튼·브랜드·차트 범주에 --alarm-* 를 쓰지 않아요.
   린트 규칙으로 막아 두면 좋아요 (예: stylelint 의 declaration-property-value-disallowed-list) */
.btn-primary { background: var(--hmi-text); }   /* 강조 버튼도 회색조 안에서 */
.chart-series-1 { stroke: var(--hmi-text); }
.chart-series-2 { stroke: var(--hmi-equip); stroke-dasharray: 4 3; }`

/* ================= 탭 ================= */
export default function Tab() {
  return (
    <div data-dash="color">
      <SysGrid>
        <Section id="dash-color-why" wide title="평상시 화면은 지루해야 해요" desc="관제 화면은 하루 대부분 '아무 일 없음'을 보여줘요. 그 시간 동안 화면이 조용해야, 드물게 생긴 이상 하나가 저절로 눈에 들어와요.">
          <Finding src={<>ANSI/ISA-101.01-2015 고성능 HMI 원칙 요약 <Cite n={1} /></>}>
            화면의 기본은 회색조예요. 색은 비정상 상태를 알릴 때만 써요. 정상 상태를 색으로 칠하지 않아요.
          </Finding>
          <div className="cl-why">
            <div><b>정상은 말이 없어요</b><p>정상 운전 중인 선로에 초록 램프를 켜 두면, 화면 대부분이 초록이 돼요. 운영자는 결국 그 초록을 '배경'으로 보기 시작해요.</p></div>
            <div><b>색 하나 = 뜻 하나</b><p>빨강이 '긴급 알람'이면, 로고에도 버튼에도 차트에도 빨강이 없어야 해요. 그래야 빨강을 본 순간 고민 없이 알람이라고 읽어요.</p></div>
            <div><b>색만 믿지 않아요</b><p>색을 잘 구분하지 못하는 사람도 같은 자리에 앉아요. 우선순위는 색 + 모양 + 숫자로 겹쳐서 보여줘요 <Cite n={6} />.</p></div>
          </div>
          <Note>이 탭의 선로 이름과 수치는 설명을 위해 만든 가상 예시예요. 실제 설비 기준값이 아니에요.</Note>
        </Section>

        <Section id="dash-color-hunt" wide title="직접 찾아보기 — 숨은 이상 하나" desc="같은 9개 선로, 같은 값이에요. 칠하는 방식만 달라요. 시작을 누르고 경보 범위를 넘은 값을 찾아 그 선로를 눌러 보세요.">
          <HuntGame />
          <Note tone="tip"><b>전통형에서 왜 오래 걸렸을까요?</b> 빨강이 이미 차단기 '투입' 표시, 3상 막대에 쓰이고 있어서 이상 램프의 빨강이 섞여 버려요. 고성능형은 정상 설비가 모두 회색이라, 색이 있는 곳이 곧 볼 곳이에요. 전통형 화면은 흔히 보이는 방식을 모아 과장해서 만든 예시예요.</Note>
        </Section>

        <Section id="dash-color-asm" wide title="실험에서는 얼마나 달랐나" desc="ASM 컨소시엄이 에틸렌 플랜트 운전 상황에서 기존 화면과 고성능 화면을 비교한 실험이 있어요. 업체 요약으로 전해진 수치예요. 토글로 두 화면의 결과를 바꿔 보세요.">
          <AsmChart />
          <Finding src={<>Hollifield 외, The High Performance HMI Handbook (2008) 및 ASM 컨소시엄 실험 — 업체 요약에서 확인한 보고된 수치 <Cite n={2} /><Cite n={3} /></>}>
            고성능 화면에서 운전원은 알람 전에 이상을 더 자주 알아챘고, 대응에 더 자주 성공했고, 더 빨리 끝냈다고 보고됐어요.
          </Finding>
          <Note tone="warn"><b>읽을 때 조심할 점</b> 한 산업, 한 실험의 결과를 업체 문서가 요약한 값이에요. 원 논문의 실험 조건을 확인하지 못했어요. "회색조로 바꾸면 41% 빨라진다"처럼 그대로 약속하지 말고, 방향을 잡는 근거로 써 주세요.</Note>
        </Section>

        <Section id="dash-color-pop" wide title="튀는 색은 주변이 조용할 때만 튀어요" desc="색·모양·움직임은 눈이 하나하나 살피기 전, 약 0.2~0.25초 안에 '튀어 보인다'고 알려져 있어요. 이것을 전주의 처리라고 해요. 단, 주변에 비슷한 색이 많으면 그 효과가 약해져요.">
          <div className="cl-pop-pair">
            <PopField base="green" title="정상 = 초록 램프 30개" sub="그 사이 빨강 1개" />
            <PopField base="gray" title="정상 = 회색 램프 30개" sub="그 사이 빨강 1개" />
          </div>
          <Note>버튼을 누르면 램프가 0.25초 동안만 보였다가 사라져요 <Cite n={5} />. 사라진 뒤 빨강이 있던 자리를 눌러 보세요. 회색 쪽이 훨씬 쉬울 거예요. 빨강과 초록은 밝기 차이가 작아서, 색 차이 말고는 단서가 거의 없기 때문이에요. 한 번만 짧게 보여주고, 깜빡이지 않아요.</Note>
        </Section>

        <Section id="dash-color-palette" title="알람 색은 알람에만" desc="관제 화면의 팔레트는 회색 다섯 단계와 알람 색 세 개면 충분해요.">
          <div className="cl-pal">
            <div className="cl-pal-row" aria-label="회색조">
              {[['배경', '#dcdcd8'], ['패널', '#e9e9e6'], ['선', '#b4b4ae'], ['설비', '#8a8a84'], ['글자', '#1b1b19']].map(([n, h]) => (
                <span key={n} className="cl-sw"><i style={{ background: h }} /><b>{n}</b><code>{h}</code></span>
              ))}
            </div>
            <div className="cl-pal-row" aria-label="알람 색">
              {([1, 2, 3] as Pri[]).map(p => (
                <span key={p} className="cl-sw"><i style={{ background: ALARM_HEX[p] }} /><b><PriBadge p={p} size={16} label /></b><code>{ALARM_HEX[p]}</code></span>
              ))}
            </div>
          </div>
          <ul className="cl-dodont">
            <li className="no"><b>안 돼요</b><span>정상 운전 선로를 초록 램프로 표시</span></li>
            <li className="no"><b>안 돼요</b><span>'저장' 버튼, 로고, 탭 강조에 빨강·주황</span></li>
            <li className="no"><b>안 돼요</b><span>차트 범주(북부·강변·산단)를 빨강·주황·노랑으로 구분</span></li>
            <li className="no"><b>안 돼요</b><span>우선순위를 색 점 하나로만 표시</span></li>
            <li className="ok"><b>좋아요</b><span>정상 설비는 회색, 이상이 생긴 값 옆에만 <PriBadge p={2} size={16} /> 표시</span></li>
            <li className="ok"><b>좋아요</b><span>차트 범주는 회색 농도와 선 모양(실선·점선)으로 구분</span></li>
          </ul>
          <Note>우선순위 단계는 3~4개 이하로 두는 것이 일반적인 권고예요 <Cite n={7} />. 색이 늘어날수록 서로 구분하기 어려워지고, 외워야 할 규칙도 늘어요.</Note>
        </Section>

        <Section id="dash-color-cvd" title="모양이 왜 필요한가 — 색각 이상 시뮬레이션" desc="같은 화면을 적록 색각 이상 시뮬레이션으로 바꿔 보세요. 색만 쓴 줄은 무너지고, 모양과 숫자를 겹친 줄은 그대로 읽혀요.">
          <CvdDemo />
          <Note>시뮬레이션은 Machado 외(2009) 모델의 심도 1.0 행렬을 썼어요 <Cite n={8} />. 실제 보이는 정도는 사람마다 달라요. 표의 '밝기 대비'는 두 알람 색끼리의 대비로, 이 화면에서 직접 계산한 값이에요.</Note>
        </Section>

        <Section id="dash-color-bg" wide title="배경은 왜 흰색이 아니라 회색일까" desc={<>고성능 HMI 지침은 밝은 회색 배경을 권해요 <Cite n={2} />. 흰 배경은 하루 종일 보기엔 눈이 부시고, 관제실 조명이 화면에 비칠 때 반사도 커져요. 배경 밝기를 바꿔 보며 글자와 알람 모양의 대비가 어떻게 변하는지 보세요.</>}>
          <BgDemo />
          <Note tone="tip">어두운 관제실이나 야간 근무용 다크 화면은 조명 조건과 함께 <a href="#/dash/room">07 관제실 환경</a>에서 다뤄요.</Note>
        </Section>

        <Section id="dash-color-check" title="색 규칙 점검표" desc="디자이너·기획자·개발자가 화면 리뷰 때 함께 보는 질문이에요.">
          <CheckList items={[
            '모든 색을 회색으로 바꿨을 때, 정상 화면에서 잃는 정보가 없나요?',
            '빨강·주황·노랑이 알람 말고 다른 곳(버튼, 로고, 차트 범주)에 쓰이지 않나요?',
            '우선순위가 색 + 모양 + 숫자로 겹쳐 표시되나요?',
            '노랑·주황 알람 모양이 배경과 3:1 이상 대비가 나오나요(테두리 포함)?',
            '정상 상태를 초록으로 칠한 곳이 남아 있지 않나요?',
            '흰 배경 대신 밝은 회색 배경을 썼나요(또는 조명에 맞춘 다크)?',
          ]} />
        </Section>

        <Section id="dash-color-code" title="FE · 색 토큰 예시" desc="알람 색을 '아무 데서나 쓸 수 없는 토큰'으로 따로 두면 실수가 줄어요.">
          <CodeBlock code={TOKENS} label="CSS" maxHeight={380} />
        </Section>

        <Refs items={[
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015, Human Machine Interfaces for Process Automation Systems — 고성능 HMI(회색조 기본, 색은 비정상에만)', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'book', text: 'Hollifield, Oliver, Nimmo, Habibi, The High Performance HMI Handbook, PAS (2008)', url: 'https://docs.tatsoft.com/display/FX/ISA-101+HMI+Compliance+How-to' },
          { kind: 'reported', text: 'ASM 컨소시엄 에틸렌 플랜트 실험: 알람 전 감지 10번 중 1번 → 5번, 대응 성공률 70% → 96%, 처리 시간 18.1분 → 10.6분 (업체 요약)', url: 'https://new.abb.com/power-generation/in-control/01-2016/the-key-to-operator-effectiveness' },
          { kind: 'book', text: 'ASM Consortium, Effective Console Operator HMI Design Practices, 2판 (2013)', url: 'https://www.automation.com/en-us/articles/2013-2/asm-publishes-2nd-edition-of-hmi-design-guidelines' },
          { kind: 'paper', text: 'Healey, C. G. & Enns, J. T. (2012), Attention and Visual Memory in Visualization and Computer Graphics, IEEE TVCG 18(7) — 전주의 처리' },
          { kind: 'standard', text: 'W3C WCAG 2.2 — 1.4.1 색 사용, 1.4.3 대비(최소), 1.4.11 비텍스트 대비', url: 'https://www.w3.org/TR/WCAG22/' },
          { kind: 'reported', text: 'ANSI/ISA-18.2 (IEC 62682) · EEMUA 191 알람 관리 — 우선순위는 3~4단계 이하 (2차 자료)', url: 'https://ifactoryapp.com/industries/oil-and-gas/alarm-management-isa-18-2-rationalization-flooding' },
          { kind: 'paper', text: 'Machado, Oliveira, Fernandes (2009), A Physiologically-based Model for Simulation of Color Vision Deficiency, IEEE TVCG 15(6)' },
        ]} />
      </SysGrid>
    </div>
  )
}
