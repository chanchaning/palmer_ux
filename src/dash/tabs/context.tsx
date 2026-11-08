/* 04 값보다 맥락 — 모든 선택자는 [data-dash="context"] 범위 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Range, Seg } from '../../components/ui'
import { CodeBlock, Note, Section, SliderRow, SysGrid } from '../../system/ui'
import { Term, TermList } from '../../components/Term'
import { SAFE_ALARMS, SAFE_CENTER, SAFE_RANGES, SAFE_SITES, rng, series, type Pri } from '../data'
import { AnalogBar, CaseCard, Cite, Finding, Hmi, PriBadge, Refs, Sparkline, useVisibleInterval } from '../ui'
import './context.css'

/** 가람산업(가상) 현장 3곳의 구역 9개 */
const ZONES = SAFE_SITES.flatMap(s => s.zones.map(z => ({ ...z, site: s.name })))
const R = SAFE_RANGES
const sec = (ms: number) => (ms / 1000).toFixed(1)
const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
type MK = 'lel' | 'co' | 'temp'
/** 이 탭의 구역 측정값 세 가지: 고정식 가스 감지기 두 개 + 환기팬 모터 온도 */
const COL: Record<MK, { short: string; name: string }> = {
  lel: { short: '가스', name: '가연성 가스' },
  co: { short: 'CO', name: '일산화탄소' },
  temp: { short: '환기팬 모터', name: '환기팬 모터 온도' },
}
const isOut = (k: keyof typeof R, v: number) => v < R[k].normal[0] || v > R[k].normal[1]

/* 공용 사전(glossary.ts)에 없는 말 — 이 탭에서만 쓰는 쉬운 뜻 */
const EXTRA: Record<string, string> = {
  '맥락': '숫자를 이해하는 데 필요한 주변 정보예요. 단위, 정상 범위, 추세, 비교 기준 같은 것이에요.',
  '고성능 HMI': '평소엔 회색으로 조용하고, 이상이 생긴 곳에만 색을 쓰는 관제 화면 설계 방식이에요. 국제 표준 ISA-101이 정리한 원칙이에요.',
  '%LEL': '불이 붙어 폭발할 수 있는 가장 낮은 가스 농도를 100으로 볼 때, 지금 농도가 얼마인지예요. 10%LEL이면 그 농도의 10분의 1이에요.',
  'CO': '일산화탄소예요. 색도 냄새도 없어서 센서로만 알 수 있어요. 지게차·트럭 배기가스나 덜 탄 불에서 나와요.',
  'ppm': '백만분의 1을 뜻하는 단위예요. 공기 알갱이 100만 개 중 몇 개가 그 가스인지예요.',
  'mm/s': '진동 세기를 나타내는 단위예요. 설비 표면이 1초에 몇 mm 빠르기로 떨리는지예요.',
  '아날로그 막대': '가로 막대에 정상 범위와 경보 범위를 칠해 두고, 지금 값을 화살표로 찍는 표시예요. 온도계 눈금처럼 값이 범위의 어디쯤인지 한눈에 보여요.',
  '기울기': '값이 일정 시간 동안 얼마나 오르거나 내리는지예요. 언덕길 경사처럼 가파를수록 빨리 변하는 거예요.',
  '%p': '퍼센트포인트예요. 퍼센트끼리 뺀 차이를 말해요. 착용률이 92%에서 83%가 되면 9%p 내린 거예요(9% 내린 게 아니에요).',
  '고정폭 숫자': '0부터 9까지 모든 숫자의 너비를 똑같이 맞춘 글꼴 설정이에요. 값이 바뀌어도 자릿수가 옆으로 흔들리지 않아요. CSS로는 tabular-nums 라고 써요.',
  '24시간제': '오전·오후 없이 0시부터 23시까지로 시각을 쓰는 방식이에요. 오후 2시 5분은 14:05예요.',
  '게이지': '자동차 속도계처럼 반원 눈금 위에서 바늘이 움직이는 표시예요.',
  'Cleveland & McGill': '사람이 그래프에서 위치, 길이, 각도, 면적 등을 얼마나 정확히 읽는지 1984년에 실험으로 비교한 두 연구자예요.',
}
const T = ({ k, children }: { k: string; children?: ReactNode }) => <Term k={k} d={EXTRA[k]}>{children}</Term>

/* 화학물질 창고 가연성 가스: 2시간 동안 1%LEL 안팎이다가 15분째 빠르게 오름(5분마다 약 2%LEL) */
const GAS_SPARK = [1, 1.5, 1, 0.5, 1, 1.5, 1, 1, 0.5, 1, 1.5, 1, 0.5, 1, 1, 1.5, 1, 0.5, 1, 1, 2, 4, 6, 8]

/* ================= 0. 흔한 실수 목업 ================= */
/* before = 흔한 안전관리 화면(어두운 남색, 네온 숫자), after = 이 탭 원칙을 적용한 화면 */
const MK_ROWS: { k: 'lel' | 'co' | 'vib'; where: string; v: number; lo: number; hi: number; spark: number[]; st: ReactNode; pri?: Pri }[] = [
  { k: 'lel', where: '화학물질 창고', v: 8, lo: 0, hi: 30, spark: GAS_SPARK, st: <>정상 · <b>빠르게 오름</b>, 이대로면 약 40분 뒤 경보</> },
  { k: 'co', where: '상하차장', v: 22, lo: 0, hi: 60, spark: [19, 20, 21, 20, 19, 20, 21, 22, 21, 20, 21, 22, 21, 20, 21, 22, 23, 22, 21, 22, 21, 22, 23, 22], st: <>정상 · 거의 그대로</> },
  { k: 'vib', where: '프레스 라인 3호기', v: 5.1, lo: 0, hi: 8, spark: [3.9, 4, 4.1, 4, 4.2, 4.1, 4.3, 4.2, 4.4, 4.3, 4.5, 4.4, 4.6, 4.5, 4.7, 4.6, 4.8, 4.7, 4.9, 4.8, 5, 4.9, 5, 5.1], st: <>정상 범위(4.5 이하) 밖 · 천천히 오름</>, pri: 3 },
]
const vs = (k: 'lel' | 'co' | 'vib', v: number) => (k === 'vib' ? v.toFixed(1) : String(v))

function MkNumbers({ up }: { up: boolean }) {
  if (!up) return (
    <Hmi dark className="cx-mk-old" title="구역 센서 현황" right="실시간">
      <div className="cx-mk-tiles">
        {MK_ROWS.map(r => (
          <div key={r.k} className="cx-mk-tile">
            <span className="nm">{r.where} · {R[r.k].name}</span>
            <b className="big">{vs(r.k, r.v)}<small>{R[r.k].unit}</small></b>
          </div>
        ))}
      </div>
    </Hmi>
  )
  return (
    <Hmi title="구역 센서 현황" right="최근 2시간">
      <div className="cx-mk-rows">
        {MK_ROWS.map(r => (
          <div key={r.k} className={'cx-mk-row' + (r.pri ? ' out' : '')}>
            <div className="top">
              <span className="nm">{r.where} · {R[r.k].name}</span>
              <b className="v">{r.pri && <PriBadge p={r.pri} size={16} />}{vs(r.k, r.v)}<small>{R[r.k].unit}</small></b>
            </div>
            <div className="viz">
              <AnalogBar value={r.v} min={r.lo} max={r.hi} normal={R[r.k].normal} alarm={R[r.k].alarm} unit={R[r.k].unit} name={r.where + ' ' + R[r.k].name} w="100%" />
              <Sparkline data={r.spark} w={80} h={22} min={r.lo} max={r.k === 'lel' ? 12 : r.hi} band={R[r.k].normal} />
            </div>
            <span className="st">{r.st}</span>
          </div>
        ))}
      </div>
    </Hmi>
  )
}

function MkUnits({ up }: { up: boolean }) {
  const rows: { where: string; k: 'lel' | 'co' | 'vib'; v: number; pri?: Pri }[] = [
    { where: '화학물질 창고', k: 'lel', v: 12, pri: 2 },
    { where: '상하차장', k: 'co', v: 12 },
    { where: '프레스 라인 3호기', k: 'vib', v: 4.8, pri: 3 },
  ]
  return (
    <Hmi dark={!up} className={up ? '' : 'cx-mk-old'} title="측정값 목록" right={up ? '단위는 숫자 바로 뒤' : '단위 없음'}>
      <table className="cx-mk-t">
        <thead><tr><th>구역</th><th>항목</th><th>값</th>{up && <th>상태</th>}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.k}>
              <td>{r.where}</td>
              <td>{up ? R[r.k].name : { lel: '가스', co: 'CO', vib: '진동' }[r.k]}</td>
              <td className="v">{vs(r.k, r.v)}{up && <small>{R[r.k].unit}</small>}</td>
              {up && <td>{r.pri ? <span className="cx-mk-st"><PriBadge p={r.pri} size={15} />정상 범위 밖</span> : <span className="cx-mk-st q">정상</span>}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </Hmi>
  )
}

const LOG: { id: string; t: string; old: string; day: string; ago: string }[] = [
  { id: 'S-101', t: '14:07:40', old: '2:07', day: '11/09', ago: '1분 전' },
  { id: 'S-103', t: '14:05:12', old: '2:05', day: '11/09', ago: '3분 전' },
  { id: 'S-105', t: '11:58:03', old: '11:58', day: '11/09', ago: '2시간 전' },
  { id: 'S-106', t: '02:10:55', old: '2:10', day: '11/08', ago: '어제' },
]
function MkTime({ up }: { up: boolean }) {
  return (
    <Hmi dark={!up} className={up ? '' : 'cx-mk-old'} title="이벤트 기록" right={up ? '24시간제 · 서버 시각' : ''}>
      <ul className="cx-mk-log">
        {LOG.map(l => {
          const a = SAFE_ALARMS.find(x => x.id === l.id)!
          return (
            <li key={l.id}>
              {up
                ? <span className="tm"><b>{l.t}</b><small>{l.day} · {l.ago}</small></span>
                : <span className="tm"><b>{l.old}</b></span>}
              <span className="ev">{a.where.split(' · ')[1]} · {a.what}</span>
            </li>
          )
        })}
      </ul>
    </Hmi>
  )
}

/* ================= 1. 맥락 쌓기 ================= */
type Layer = 'unit' | 'range' | 'trend' | 'compare'
const LAYERS: { k: Layer; name: string; lv: string }[] = [
  { k: 'unit', name: '이름과 단위', lv: '지각' },
  { k: 'range', name: '정상 범위', lv: '이해' },
  { k: 'trend', name: '추세', lv: '예측' },
  { k: 'compare', name: '비교 기준', lv: '이해' },
]
function ContextBuilder() {
  const [on, setOn] = useState<Record<Layer, boolean>>({ unit: false, range: false, trend: false, compare: false })
  const t = (k: Layer) => setOn(o => ({ ...o, [k]: !o[k] }))
  const all = () => setOn({ unit: true, range: true, trend: true, compare: true })
  const none = () => setOn({ unit: false, range: false, trend: false, compare: false })
  const L = R.lel
  const qs: { q: string; ok: boolean; a: string }[] = [
    { q: '무엇을 잰 값이지?', ok: on.unit, a: '화학물질 창고의 가연성 가스 농도예요' },
    { q: '괜찮은 건가?', ok: on.range, a: `아직 정상(${L.normal[1]}%LEL 이하)이지만 상한에 가까워요` },
    { q: '어디로 가고 있지?', ok: on.trend, a: `15분째 빠르게 오르는 중, 이대로면 약 40분 뒤 경보(${L.alarm[1]}%LEL)` },
    { q: '평소와 비교하면?', ok: on.compare, a: '어제 같은 시각(1%LEL)보다 7%LEL 높아요' },
  ]
  return (
    <div className="cx-build">
      <div className="cx-build-ctl">
        {LAYERS.map(l => (
          <button key={l.k} type="button" className="chip" aria-pressed={on[l.k]} onClick={() => t(l.k)}>
            {l.name}<small>{l.lv}</small>
          </button>
        ))}
        <button type="button" className="btn sm ghost" onClick={Object.values(on).every(Boolean) ? none : all}>{Object.values(on).every(Boolean) ? '모두 끄기' : '모두 켜기'}</button>
      </div>
      <div className="cx-build-body">
        <Hmi title={on.unit ? '제2공장 · 화학물질 창고' : ' '} right={on.unit ? '14:00' : undefined} className="cx-build-hmi">
          <div className="cx-tile">
            {on.unit && <span className="cx-tile-name">가연성 가스</span>}
            <div className="cx-tile-main">
              <b className="cx-big">8{on.unit && <small>%LEL</small>}</b>
              {on.range && <span className="cx-tile-st">정상 범위 안 · 상한 {L.normal[1]}%LEL에 가까움</span>}
            </div>
            {on.range && <div className="cx-tile-bar"><AnalogBar value={8} min={0} max={30} normal={L.normal} alarm={L.alarm} unit="%LEL" name="화학물질 창고 가연성 가스" w={260} /><span className="cx-scale"><span>0</span><span>정상 0~{L.normal[1]} · 경보 {L.alarm[1]}</span><span>30</span></span></div>}
            {on.trend && <div className="cx-tile-trend"><Sparkline data={GAS_SPARK} w={260} h={40} min={0} max={12} band={on.range ? L.normal : undefined} /><span>최근 2시간 · 15분째 빠르게 오르는 중 <b>이대로면 약 40분 뒤 {L.alarm[1]}%LEL 경보</b></span></div>}
            {on.compare && <div className="cx-tile-cmp">어제 같은 시각 1%LEL <b>+7%LEL</b></div>}
          </div>
        </Hmi>
        <ul className="cx-qs" aria-label="읽는 사람이 답할 수 있는 질문">
          {qs.map(q => (
            <li key={q.q} className={q.ok ? 'ok' : ''}>
              <b>{q.q}</b>
              <span>{q.ok ? q.a : '아직 알 수 없어요'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ================= 2. 세 가지 표시 + 범위 밖 세기 ================= */
type View = 'num' | 'color' | 'analog'
const VIEW_NAME: Record<View, string> = { num: '숫자만', color: '숫자 + 이상만 색', analog: '아날로그 막대 + 추세' }
interface QRow { lel: number; co: number; temp: number; spark: number[] }
interface Quiz { rows: QRow[]; outs: number; riser: number }

function makeQuiz(seed: number): Quiz {
  const r = rng(seed)
  const between = (a: number, b: number) => a + r() * (b - a)
  const k = 2 + Math.floor(r() * 4)
  const cells = Array.from({ length: 27 }, (_, i) => i)
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]] }
  const outSet = new Set(cells.slice(0, k))
  const okGas = ZONES.map((_, i) => !outSet.has(i * 3)).map((ok, i) => (ok ? i : -1)).filter(i => i >= 0)
  const riser = okGas[Math.floor(r() * okGas.length)]
  const rows: QRow[] = ZONES.map((_, i) => {
    const near = () => r() < 0.3
    const out = (m: number) => outSet.has(i * 3 + m)
    const lel = Math.round(i === riser ? between(6, 8) : out(0) ? between(12, 20) : near() ? between(9, 10) : between(0, 6))
    const co = Math.round(out(1) ? between(28, 45) : near() ? between(23, 25) : between(2, 18))
    const temp = Math.round(out(2) ? between(72, 84) : near() ? between(66, 69) : between(35, 62))
    const slope = i === riser ? between(9, 12) : between(-1.5, 1.5)
    const spark = Array.from({ length: 24 }, (_, t) => +Math.max(0, lel - slope * (1 - t / 23) + (t === 23 ? 0 : (r() - 0.5) * 0.8)).toFixed(1))
    return { lel, co, temp, spark }
  })
  const outs = rows.reduce((n, row) => n + (['lel', 'co', 'temp'] as MK[]).filter(m => isOut(m, row[m])).length, 0)
  return { rows, outs, riser }
}

function QuizCell({ k, v, view, spark, reveal }: { k: MK; v: number; view: View; spark?: number[]; reveal: boolean }) {
  const out = isOut(k, v), S = R[k]
  const showOut = (view === 'color' && out) || (reveal && out)
  return (
    <td className={(showOut ? 'out' : '') + (reveal && out ? ' rv' : '')}>
      <span className="cx-qv">{v}<small>{S.unit}</small></span>
      {view === 'analog' && <AnalogBar value={v} min={S.min} max={k === 'co' ? 100 : k === 'lel' ? 30 : S.max} normal={S.normal} alarm={S.alarm} unit={S.unit} name={COL[k].name} w={100} />}
      {view === 'analog' && spark && <Sparkline data={spark} w={100} h={24} min={v - 10} max={v + 10} band={S.normal} />}
    </td>
  )
}

interface QRec { view: View; ms: number; ok: boolean }
function ThreeViews() {
  const [view, setView] = useState<View>('num')
  const [seed, setSeed] = useState(3)
  const [phase, setPhase] = useState<'idle' | 'run' | 'q2' | 'done'>('idle')
  const [t0, setT0] = useState(0)
  const [res, setRes] = useState<{ ms: number; guess: number; q2?: number } | null>(null)
  const [recs, setRecs] = useState<QRec[]>([])
  const [, setTick] = useState(0)
  const watch = useVisibleInterval(() => setTick(x => x + 1), 100, phase === 'run')
  const quiz = useMemo(() => makeQuiz(seed), [seed])

  const start = () => { setSeed(Math.floor(Math.random() * 1e9)); setRes(null); setT0(performance.now()); setPhase('run') }
  const answer = (n: number) => {
    const ms = performance.now() - t0
    setRes({ ms, guess: n }); setRecs(r => [...r, { view, ms, ok: n === quiz.outs }]); setPhase('q2')
  }
  const answer2 = (i: number) => { setRes(r => (r ? { ...r, q2: i } : r)); setPhase('done') }
  const changeView = (v: View) => { setView(v); if (phase === 'run') setPhase('idle') }
  const q2ok = res?.q2 !== undefined && (view === 'analog' ? res.q2 === quiz.riser : res.q2 === -1)
  const reveal = phase === 'q2' || phase === 'done'
  const elapsed = phase === 'run' ? performance.now() - t0 : res?.ms ?? 0
  const stat = (v: View) => { const a = recs.filter(r => r.view === v); return { n: a.length, ms: mean(a.map(r => r.ms)), ok: a.filter(r => r.ok).length } }
  const maxMs = Math.max(...(['num', 'color', 'analog'] as View[]).map(v => stat(v).ms), 1)
  const rz = ZONES[quiz.riser]

  return (
    <div className="cx-three">
      <div className="cx-three-ctl">
        <Seg value={view} onChange={changeView} options={(['num', 'color', 'analog'] as View[]).map(v => [v, VIEW_NAME[v]] as const)} />
        <button type="button" className="btn sm" onClick={start}>{phase === 'idle' ? '시작' : '새 문제'}</button>
        <div ref={watch} className={'cx-watch' + (phase === 'run' ? ' on' : '')}><span className="muted">걸린 시간</span><b>{sec(elapsed)}초</b></div>
      </div>
      <div className="cx-legend">
        <span>정상 범위</span>
        {(['lel', 'co', 'temp'] as MK[]).map(k => <span key={k}><b>{COL[k].name}</b> {R[k].normal[0]}~{R[k].normal[1]}{R[k].unit}</span>)}
      </div>

      <div className="cx-q" role="status">
        {phase === 'idle' && <p>시작을 누르면 값이 새로 바뀌어요. <b>정상 범위를 벗어난 값이 모두 몇 개인지</b> 세어서 아래 숫자를 누르세요.</p>}
        {phase === 'run' && <p><b>정상 범위를 벗어난 값은 모두 몇 개일까요?</b></p>}
        {phase === 'q2' && res && <p>{res.guess === quiz.outs ? <b className="ok">맞혔어요.</b> : <b className="no">정답은 {quiz.outs}개예요.</b>} {sec(res.ms)}초 걸렸어요. 범위 밖 값을 표시해 뒀어요. <b>한 문제 더 — 앞으로 30분 안에 가장 먼저 걱정해야 할 구역은?</b></p>}
        {phase === 'done' && res && (
          <p>{q2ok ? <b className="ok">맞아요.</b> : <b className="no">아쉬워요.</b>}{' '}
            {view === 'analog'
              ? <><b>{rz.site} {rz.name}</b>의 가스 값은 지금 {quiz.rows[quiz.riser].lel}%LEL로 정상 범위 안이에요. 그런데 추세선이 가파르게 오르고 있어요. 지금 값이 가장 높은 구역이 아니라 <b>가장 빨리 나빠지는 구역</b>이 답이에요.</>
              : <>이 화면에는 추세가 없어서 <b>알 수 없는 게 정답</b>이에요. 사실은 {rz.site} {rz.name}의 가스 값이 지금 {quiz.rows[quiz.riser].lel}%LEL로 정상이지만 빠르게 오르는 중이었어요. ‘아날로그 막대 + 추세’로 바꿔서 다시 해 보세요.</>}
          </p>
        )}
        {phase === 'run' && (
          <div className="cx-q-btns" aria-label="범위 밖 값의 개수">
            {[0, 1, 2, 3, 4, 5, 6].map(n => <button key={n} type="button" className="btn sm ghost" onClick={() => answer(n)}>{n}개</button>)}
          </div>
        )}
        {phase === 'q2' && (
          <div className="cx-q-btns" aria-label="가장 먼저 걱정할 구역">
            {ZONES.map((z, i) => <button key={z.id} type="button" className="btn sm ghost" onClick={() => answer2(i)}>{z.name}</button>)}
            <button type="button" className="btn sm ghost" onClick={() => answer2(-1)}>이 화면으로는 알 수 없어요</button>
          </div>
        )}
      </div>

      <Hmi title={'9개 구역 측정값 · ' + VIEW_NAME[view]} right={SAFE_CENTER} className="cx-qhmi">
        <div className="cx-qwrap">
          <table className={'cx-qt v-' + view}>
            <thead><tr><th>구역</th>{(['lel', 'co', 'temp'] as MK[]).map(k => <th key={k}>{COL[k].short}</th>)}</tr></thead>
            <tbody>
              {quiz.rows.map((row, i) => (
                <tr key={i} className={i % 3 === 0 && i ? 'grp' : ''}>
                  <th scope="row">{ZONES[i].name}{reveal && phase === 'done' && i === quiz.riser && <small className="cx-riser">빠르게 오름</small>}</th>
                  <QuizCell k="lel" v={row.lel} view={view} spark={row.spark} reveal={reveal} />
                  <QuizCell k="co" v={row.co} view={view} reveal={reveal} />
                  <QuizCell k="temp" v={row.temp} view={view} reveal={reveal} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Hmi>

      <div className="cx-rec">
        {(['num', 'color', 'analog'] as View[]).map(v => {
          const s = stat(v)
          return (
            <div key={v} className={'cx-rec-row ' + v}>
              <span>{VIEW_NAME[v]}</span>
              <span className="bar"><i style={{ width: (s.ms / maxMs) * 100 + '%' }} /></span>
              <b>{s.n ? sec(s.ms) + '초' : '–'}</b>
              <small className="muted">{s.n ? `${s.n}번 중 ${s.ok}번 정답` : '기록 없음'}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================= 3. Cleveland & McGill ================= */
type Enc = 'pos' | 'len' | 'angle' | 'area' | 'shade'
const ENCS: [Enc, string][] = [['pos', '같은 축 위 위치'], ['len', '길이'], ['angle', '각도'], ['area', '면적'], ['shade', '색 농도']]
interface Prob { a: number; p: number; rot: number; off: number }
const newProb = (): Prob => ({ a: 60 + Math.round(Math.random() * 40), p: 10 + Math.round(Math.random() * 80), rot: Math.random() * 360, off: 8 + Math.random() * 17 })

function wedge(cx: number, cy: number, r: number, start: number, deg: number) {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(rad(start)), y1 = cy + r * Math.sin(rad(start))
  const x2 = cx + r * Math.cos(rad(start + deg)), y2 = cy + r * Math.sin(rad(start + deg))
  return `M${cx},${cy}L${x1.toFixed(2)},${y1.toFixed(2)}A${r},${r} 0 ${deg > 180 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)}Z`
}

function EncView({ enc, pr }: { enc: Enc; pr: Prob }) {
  const A = pr.a, B = (pr.a * pr.p) / 100
  const lbl = (x: number, t: string) => <text x={x} y="166" textAnchor="middle" className="lb">{t}</text>
  return (
    <svg viewBox="0 0 300 172" className="cx-cm-svg" role="img" aria-label={`${ENCS.find(e => e[0] === enc)![1]}로 그린 두 값 A와 B`}>
      {enc === 'pos' && <>
        <line x1="40" y1="148" x2="260" y2="148" className="ax" />
        <line x1="40" y1="148" x2="40" y2="12" className="ax" />
        <circle cx="110" cy={148 - A * 1.3} r="6" className="mk" />
        <circle cx="200" cy={148 - B * 1.3} r="6" className="mk" />
        {lbl(110, 'A')}{lbl(200, 'B')}
      </>}
      {enc === 'len' && <>
        <rect x="90" y={150 - A * 1.2} width="34" height={A * 1.2} className="mk" />
        <rect x="186" y={150 - pr.off - B * 1.2} width="34" height={B * 1.2} className="mk" />
        {lbl(107, 'A')}{lbl(203, 'B')}
      </>}
      {enc === 'angle' && <>
        <circle cx="85" cy="80" r="62" className="ring" />
        <circle cx="215" cy="80" r="62" className="ring" />
        <path d={wedge(85, 80, 62, 0, A * 3.3)} className="mk" />
        <path d={wedge(215, 80, 62, pr.rot, B * 3.3)} className="mk" />
        {lbl(85, 'A')}{lbl(215, 'B')}
      </>}
      {enc === 'area' && <>
        <circle cx="90" cy="80" r={Math.sqrt(A / 100) * 66} className="mk" />
        <circle cx="220" cy="80" r={Math.sqrt(B / 100) * 66} className="mk" />
        {lbl(90, 'A')}{lbl(220, 'B')}
      </>}
      {enc === 'shade' && <>
        <rect x="40" y="14" width="100" height="130" rx="6" className="ring" />
        <rect x="160" y="14" width="100" height="130" rx="6" className="ring" />
        <rect x="40" y="14" width="100" height="130" rx="6" className="mk" style={{ opacity: A / 100 }} />
        <rect x="160" y="14" width="100" height="130" rx="6" className="mk" style={{ opacity: B / 100 }} />
        {lbl(90, 'A')}{lbl(210, 'B')}
      </>}
    </svg>
  )
}

function CMDemo() {
  const [enc, setEnc] = useState<Enc>('pos')
  const [pr, setPr] = useState<Prob>(newProb)
  const [g, setG] = useState(50)
  const [done, setDone] = useState(false)
  const [auto, setAuto] = useState(true)
  const [hist, setHist] = useState<Record<Enc, number[]>>({ pos: [], len: [], angle: [], area: [], shade: [] })
  const err = Math.abs(g - pr.p)
  const submit = () => { setDone(true); setHist(h => ({ ...h, [enc]: [...h[enc], err] })) }
  const next = () => {
    if (auto) setEnc(e => ENCS[(ENCS.findIndex(x => x[0] === e) + 1) % ENCS.length][0])
    setPr(newProb()); setG(50); setDone(false)
  }
  const pick = (e: Enc) => { setEnc(e); setPr(newProb()); setG(50); setDone(false) }
  const maxErr = Math.max(10, ...ENCS.map(([e]) => mean(hist[e])))
  const total = ENCS.reduce((n, [e]) => n + hist[e].length, 0)
  return (
    <div className="cx-cm">
      <div className="cx-cm-ctl">
        <Seg value={enc} onChange={pick} options={ENCS} />
        <label className="cx-check"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />다음 문제는 다음 방식으로</label>
      </div>
      <div className="cx-cm-body">
        <div className="cx-cm-q">
          <EncView enc={enc} pr={pr} />
          <SliderRow label="B는 A의 몇 %일까요?" value={g} unit="%">
            <Range value={g} min={1} max={100} onChange={v => { if (!done) setG(v) }} label="B는 A의 몇 퍼센트" />
          </SliderRow>
          <div className="cx-cm-act">
            {!done ? <button type="button" className="btn sm" onClick={submit}>확인</button> : <button type="button" className="btn sm" onClick={next}>다음 문제</button>}
            <span role="status">{done && <>정답 <b>{pr.p}%</b> · 내 답 {g}% · 오차 <b className={err <= 5 ? 'ok' : err >= 15 ? 'no' : ''}>{err}%p</b></>}</span>
          </div>
        </div>
        <div className="cx-cm-sum">
          <h4>방식별 평균 오차 <small className="muted">{total}문제</small></h4>
          {ENCS.map(([e, n], i) => {
            const h = hist[e], m = mean(h)
            return (
              <div key={e} className={'cx-cm-row' + (e === enc ? ' cur' : '')}>
                <span className="rk">{i + 1}</span>
                <span className="nm">{n}</span>
                <span className="bar"><i style={{ width: (m / maxErr) * 100 + '%' }} /></span>
                <b>{h.length ? m.toFixed(1) + '%p' : '–'}</b>
              </div>
            )
          })}
          <p className="muted">왼쪽 숫자는 Cleveland & McGill이 정리한 정확도 순서예요. 1이 가장 정확해요. 몇 문제씩 풀고 내 오차와 비교해 보세요.</p>
        </div>
      </div>
    </div>
  )
}

/* ================= 4. 추세 ================= */
function TrendDemo() {
  const [rate, setRate] = useState(6)
  const [ly, setLy] = useState({ band: true, arrow: true, fc: true, alarm: true })
  const tg = (k: keyof typeof ly) => setLy(s => ({ ...s, [k]: !s[k] }))
  const now = 64
  const N = R.temp.normal, AL = R.temp.alarm[1]
  const pts = useMemo(() => {
    const r = rng(5)
    return Array.from({ length: 25 }, (_, i) => +(now - rate * (2 - i / 12) + (i === 24 ? 0 : (r() - 0.5) * 0.9)).toFixed(2))
  }, [rate])
  // 최근 30분(7점) 선형 회귀 → 시간당 기울기
  const slope = useMemo(() => {
    const ys = pts.slice(-7), xs = ys.map((_, i) => i / 12)
    const mx = mean(xs), my = mean(ys)
    const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0), den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
    return num / den
  }, [pts])
  const reachH = slope > 0.2 ? (AL - now) / slope : Infinity
  const W = 640, H = 240, X0 = 44, X1 = 624, Y0 = 16, Y1 = 208
  const tx = (h: number) => X0 + ((h + 2) / 8) * (X1 - X0) // -2h ~ +6h
  const ty = (v: number) => Y1 - ((v - 20) / 80) * (Y1 - Y0) // 20 ~ 100℃
  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${tx(-2 + i / 12).toFixed(1)},${ty(v).toFixed(1)}`).join('')
  const fcEnd = Math.min(6, Number.isFinite(reachH) ? reachH : 6)
  const hm = (h: number) => { const m = Math.round(h * 60); return m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ' ' + (m % 60) + '분' : ''}` : `${m}분` }
  const arrowDeg = Math.max(-80, Math.min(80, -slope * 10))
  const word = Math.abs(slope) < 1 ? '거의 그대로' : slope < 3 ? '천천히 오름' : '빠르게 오름'

  return (
    <div className="cx-trend">
      <div className="cx-trend-ctl">
        <SliderRow label="오르는 속도 (가정)" value={rate.toFixed(1)} unit="℃/시간">
          <Range value={rate} min={0} max={10} step={0.5} onChange={setRate} label="오르는 속도" />
        </SliderRow>
        <div className="cx-chips">
          {([['band', '정상 범위 띠'], ['alarm', `경보선 ${AL}℃`], ['fc', '예측선'], ['arrow', '기울기 화살표']] as const).map(([k, n]) => (
            <button key={k} type="button" className="chip" aria-pressed={ly[k]} onClick={() => tg(k)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="cx-trend-body">
        <svg viewBox={`0 0 ${W} ${H}`} className="cx-trend-svg" role="img" aria-label={`프레스 라인 3호기 모터 온도 추세. 현재 ${now}℃, 시간당 ${slope.toFixed(1)}℃${Number.isFinite(reachH) ? `, 약 ${hm(reachH)} 뒤 ${AL}℃ 도달 예상` : ''}`}>
          {ly.band && <rect x={X0} width={X1 - X0} y={ty(N[1])} height={ty(N[0]) - ty(N[1])} className="band" />}
          {[20, 40, 60, 80, 100].map(v => <g key={v}><line x1={X0} x2={X1} y1={ty(v)} y2={ty(v)} className="grid" /><text x={X0 - 8} y={ty(v) + 4} textAnchor="end" className="tk">{v}</text></g>)}
          {[-2, 0, 2, 4, 6].map(h => <text key={h} x={tx(h)} y={H - 10} textAnchor="middle" className="tk">{h === 0 ? '지금' : (h > 0 ? '+' : '') + h + '시간'}</text>)}
          {ly.alarm && <><line x1={X0} x2={X1} y1={ty(AL)} y2={ty(AL)} className="alarm" /><text x={X0 + 6} y={ty(AL) - 6} className="tk al">경보 {AL}℃</text></>}
          <line x1={tx(0)} x2={tx(0)} y1={Y0} y2={Y1} className="now" />
          <path d={path} className="ln" />
          {ly.fc && slope > 0.2 && <line x1={tx(0)} y1={ty(now)} x2={tx(fcEnd)} y2={ty(now + slope * fcEnd)} className="fc" />}
          {ly.fc && Number.isFinite(reachH) && reachH <= 6 && <><circle cx={tx(reachH)} cy={ty(AL)} r="5" className="hit" /><text x={tx(reachH)} y={ty(AL) + 20} textAnchor="middle" className="tk hitx">약 {hm(reachH)} 뒤</text></>}
          <circle cx={tx(0)} cy={ty(now)} r="4.5" className="dot" />
        </svg>
        <div className="cx-trend-tiles">
          <div className="cx-mini">
            <span className="muted">숫자만</span>
            <b className="cx-mini-v">{now}<small>℃</small></b>
            <span className="cx-mini-s">정상 범위 안이에요. 아무 일 없어 보여요.</span>
          </div>
          <div className="cx-mini">
            <span className="muted">숫자 + 추세</span>
            <span className="cx-mini-row">
              <b className="cx-mini-v">{now}<small>℃</small></b>
              {ly.arrow && <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="cx-arrow" style={{ transform: `rotate(${arrowDeg}deg)` }}><path d="M4 17h22M19 9l8 8-8 8" /></svg>}
            </span>
            <span className="cx-mini-s"><b>{slope >= 0 ? '+' : ''}{slope.toFixed(1)}℃/시간 · {word}</b>{Number.isFinite(reachH) ? <> 이대로면 약 {hm(reachH)} 뒤 {AL}℃</> : <> 경보선에 다가가지 않아요</>}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================= 5. 비교 기준 ================= */
const NOW_I = 56 // 14:00 (15분 간격)
const CO_NOW = 22
function shiftTo(a: number[], i: number, v: number) { const d = v - a[i]; return a.map(x => +Math.max(0, x + d).toFixed(1)) }
function CompareDemo() {
  const [base, setBase] = useState<'none' | 'yday' | 'season'>('yday')
  const [lim, setLim] = useState({ hi: true, al: false })
  const C = R.co
  const today = useMemo(() => shiftTo(series(41, 96, 14, 8, 1.6), NOW_I, CO_NOW).slice(0, NOW_I + 1), [])
  const yday = useMemo(() => shiftTo(series(42, 96, 12, 7, 1.6), NOW_I, 14), [])
  const season = useMemo(() => shiftTo(series(43, 96, 11, 6, 0.4), NOW_I, 12), [])
  const W = 640, H = 220, X0 = 40, X1 = 624, Y0 = 12, Y1 = 188
  const tx = (i: number) => X0 + (i / 95) * (X1 - X0)
  const ty = (v: number) => Y1 - (v / 60) * (Y1 - Y0) // 0 ~ 60ppm
  const d = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${tx(i).toFixed(1)},${ty(v).toFixed(1)}`).join('')
  const ref = base === 'yday' ? yday : base === 'season' ? season : null
  const refName = base === 'yday' ? '어제 같은 시각' : '이번 계절 같은 시각 평균'
  const diff = ref ? CO_NOW - ref[NOW_I] : 0
  return (
    <div className="cx-cmp">
      <div className="cx-cmp-ctl">
        <Seg value={base} onChange={setBase} options={[['none', '비교 없음'], ['yday', '어제'], ['season', '계절 평균']] as const} />
        <div className="cx-chips">
          <button type="button" className="chip" aria-pressed={lim.hi} onClick={() => setLim(l => ({ ...l, hi: !l.hi }))}>정상 상한 {C.normal[1]}ppm</button>
          <button type="button" className="chip" aria-pressed={lim.al} onClick={() => setLim(l => ({ ...l, al: !l.al }))}>경보 {C.alarm[1]}ppm</button>
        </div>
      </div>
      <div className="cx-cmp-head">
        <span className="muted">물류센터 상하차장 일산화탄소</span>
        <b>{CO_NOW}ppm</b>
        <span>{ref ? <>{refName} {Math.round(ref[NOW_I])}ppm보다 <b>{diff >= 0 ? '+' : ''}{Math.round(diff)}ppm</b></> : '비교할 기준이 없어서 높은지 낮은지 말하기 어려워요'}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="cx-cmp-svg" role="img" aria-label="상하차장 오늘 일산화탄소 곡선과 비교 기준">
        {[0, 20, 40, 60].map(v => <g key={v}><line x1={X0} x2={X1} y1={ty(v)} y2={ty(v)} className="grid" /><text x={X0 - 6} y={ty(v) + 4} textAnchor="end" className="tk">{v}</text></g>)}
        {[0, 24, 48, 72, 95].map(i => <text key={i} x={tx(i)} y={H - 8} textAnchor="middle" className="tk">{i === 95 ? '24시' : `${i / 4}시`}</text>)}
        {lim.hi && <><line x1={X0} x2={X1} y1={ty(C.normal[1])} y2={ty(C.normal[1])} className="lim" /><text x={X1} y={ty(C.normal[1]) - 5} textAnchor="end" className="tk">정상 상한</text></>}
        {lim.al && <><line x1={X0} x2={X1} y1={ty(C.alarm[1])} y2={ty(C.alarm[1])} className="lim al" /><text x={X1} y={ty(C.alarm[1]) - 5} textAnchor="end" className="tk">경보</text></>}
        {ref && <path d={d(ref)} className={'ref ' + base} />}
        <path d={d(today)} className="today" />
        <line x1={tx(NOW_I)} x2={tx(NOW_I)} y1={Y0} y2={Y1} className="now" />
        {ref && <line x1={tx(NOW_I)} x2={tx(NOW_I)} y1={ty(CO_NOW)} y2={ty(ref[NOW_I])} className="gap" />}
        <circle cx={tx(NOW_I)} cy={ty(CO_NOW)} r="4.5" className="dot" />
        <text x={tx(NOW_I) + 8} y={ty(CO_NOW) - 6} className="tk now-t">14:00</text>
      </svg>
      <div className="cx-cmp-key"><span><i className="k today" />오늘</span>{ref && <span><i className={'k ref ' + base} />{base === 'yday' ? '어제' : '계절 평균'}</span>}</div>
    </div>
  )
}

/* ================= 6. 숫자 표기 ================= */
const CO_ZONE = [6, 4, 12, 3, 5, 22, 2, 3, 18]
function TabularDemo() {
  const [tab, setTab] = useState(true)
  const [run, setRun] = useState(true)
  const [vals, setVals] = useState(() => CO_ZONE.map(v => v + 0.4))
  const ref = useVisibleInterval(() => setVals(v => v.map(x => +(Math.max(0.5, Math.min(48, x + (Math.random() - 0.5) * 6))).toFixed(1))), 1000, run)
  return (
    <div className="cx-tab" ref={ref}>
      <div className="cx-tab-ctl">
        <Seg value={tab ? 'y' : 'n'} onChange={v => setTab(v === 'y')} options={[['n', '기본 숫자'], ['y', '고정폭 숫자']] as const} />
        <button type="button" className="btn sm ghost" onClick={() => setRun(r => !r)}>{run ? '값 변화 멈추기' : '값 변화 다시 켜기'}</button>
      </div>
      <ul className={'cx-tab-list' + (tab ? ' tnum' : '')} aria-label="구역별 일산화탄소">
        {ZONES.map((z, i) => <li key={z.id}><span>{z.name}</span><b>{vals[i].toFixed(1)}<small>ppm</small></b></li>)}
      </ul>
    </div>
  )
}

type FK = 'lel' | 'co' | 'vib' | 'cnt'
const FMT: Record<FK, { name: string; unit: string; dig: number; raw: string; why: string }> = {
  lel: { name: '가연성 가스', unit: '%LEL', dig: 0, raw: '8.3721', why: '정상 범위가 0~10%LEL이에요. 1보다 작은 차이로 판단이 바뀌지 않아서 정수면 충분해요.' },
  co: { name: '일산화탄소', unit: 'ppm', dig: 0, raw: '22.4587', why: '1ppm보다 작은 차이로 판단이 바뀌지 않아요. 그래서 정수면 충분해요.' },
  vib: { name: '진동', unit: 'mm/s', dig: 1, raw: '4.8372', why: '정상 상한이 4.5mm/s처럼 소수예요. 그래서 소수 첫째 자리까지 봐야 해요.' },
  cnt: { name: '오늘 출입 기록', unit: '건', dig: 0, raw: '12345', why: '큰 수는 천 단위마다 쉼표를 넣어 끊어 읽게 해요.' },
}
function Formatter() {
  const [k, setK] = useState<FK>('vib')
  const [raw, setRaw] = useState(FMT.vib.raw)
  const n = Number(raw.replace(/,/g, ''))
  const ok = raw.trim() !== '' && Number.isFinite(n)
  const out = ok ? new Intl.NumberFormat('ko-KR', { minimumFractionDigits: FMT[k].dig, maximumFractionDigits: FMT[k].dig }).format(n) + FMT[k].unit : '–'
  return (
    <div className="cx-fmt">
      <Seg value={k} onChange={v => { setK(v); setRaw(FMT[v].raw) }} options={(Object.keys(FMT) as FK[]).map(x => [x, FMT[x].name] as const)} />
      <div className="cx-fmt-row">
        <label><span className="muted">센서에서 온 값</span><input value={raw} onChange={e => setRaw(e.target.value)} inputMode="decimal" aria-label="센서에서 온 값" /></label>
        <span className="cx-fmt-arrow" aria-hidden="true">→</span>
        <div><span className="muted">화면에 쓰는 값</span><output className="cx-fmt-out">{out}</output></div>
      </div>
      <p className="cx-fmt-why">{ok ? FMT[k].why : '값이 없을 때는 0이 아니라 – 로 보여줘요. 0은 "측정했더니 0"이라는 뜻이 돼요.'}</p>
    </div>
  )
}

/* ================= 7. 게이지 vs 막대 ================= */
const CO_GAUGE = [6, 4, 12, 3, 5, 22, 2, 3, 31] // 지하 밀폐공간만 정상 범위 밖
const G_MAX = 100
function useArea() {
  const ref = useRef<HTMLDivElement>(null)
  const [a, setA] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setA(el.offsetWidth * el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, a] as const
}
function Gauge({ v, name }: { v: number; name: string }) {
  const ang = (x: number) => Math.PI * (1 - x / G_MAX)
  const pt = (x: number, r: number) => [60 + r * Math.cos(ang(x)), 62 - r * Math.sin(ang(x))]
  const arc = (a: number, b: number) => { const [x1, y1] = pt(a, 48), [x2, y2] = pt(b, 48); return `M${x1},${y1}A48,48 0 0 1 ${x2},${y2}` }
  const [nx, ny] = pt(v, 40)
  const n1 = R.co.normal[1], a1 = R.co.alarm[1]
  return (
    <figure className="cx-gauge">
      <svg viewBox="0 0 120 74" aria-hidden="true">
        <path d={arc(0, n1)} className="z1" /><path d={arc(n1, a1)} className="z2" /><path d={arc(a1, G_MAX)} className="z3" />
        <line x1="60" y1="62" x2={nx} y2={ny} className="nd" /><circle cx="60" cy="62" r="4" className="hub" />
      </svg>
      <figcaption>{name}<b>{v}ppm</b></figcaption>
    </figure>
  )
}
function GaugeVsBar() {
  const [gRef, gA] = useArea()
  const [bRef, bA] = useArea()
  const k = (a: number) => (a / 10000).toFixed(1)
  const C = R.co
  return (
    <div className="cx-gvb">
      <div className="cx-gvb-col">
        <h4>게이지 9개 <small className="muted">{gA ? `${k(gA)}만 px² 차지` : ''}</small></h4>
        <div ref={gRef} className="cx-gauges">{ZONES.map((z, i) => <Gauge key={z.id} v={CO_GAUGE[i]} name={z.name} />)}</div>
        <p className="muted">지금 값 하나만 보여줘요. 초록·노랑·빨강 구역을 칠해 두어서, 정상일 때도 화면에 색이 가득해요.</p>
      </div>
      <div className="cx-gvb-col">
        <h4>아날로그 막대 + 추세 9줄 <small className="muted">{bA ? `${k(bA)}만 px² 차지` : ''}</small></h4>
        <div ref={bRef} className="cx-bars">
          {ZONES.map((z, i) => {
            const v = CO_GAUGE[i]
            return (
              <div key={z.id} className="cx-bars-row">
                <span className="nm">{z.name}</span>
                <AnalogBar value={v} min={0} max={G_MAX} normal={C.normal} alarm={C.alarm} unit="ppm" name={z.name + ' 일산화탄소'} w={120} />
                <Sparkline data={series(60 + i, 24, v - 2, 2, 1.5).map((x, j, a) => +(j === a.length - 1 ? v : Math.max(0, x)).toFixed(1))} w={70} h={20} min={Math.max(0, v - 15)} max={v + 15} band={C.normal} />
                <b className={isOut('co', v) ? 'out' : ''}>{v}ppm</b>
              </div>
            )
          })}
        </div>
        <p className="muted">정상 범위, 범위를 벗어났는지, 최근 추세까지 보여줘요. 그런데 차지하는 면적은 {gA && bA ? <>게이지의 <b>{(gA / bA).toFixed(1)}분의 1</b>이에요</> : '게이지보다 훨씬 작아요'}.</p>
      </div>
    </div>
  )
}

/* ================= 체크리스트 · 코드 ================= */
function CheckList({ items }: { items: string[] }) {
  const [on, setOn] = useState<boolean[]>(() => items.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <div className="cx-checklist">
      <div className="top"><span>값 하나를 화면에 올리기 전에</span><b className={n === items.length ? 'ok' : ''}>{n} / {items.length}</b></div>
      <ul>{items.map((q, i) => <li key={i}><label><input type="checkbox" checked={on[i]} onChange={() => setOn(a => a.map((v, j) => (j === i ? !v : v)))} /><span>{q}</span></label></li>)}</ul>
    </div>
  )
}

const CODE = `// 센서 값 하나를 '맥락이 붙은 값'으로 만드는 함수
type Status = 'normal' | 'out' | 'alarm'
interface Spec { unit: string; digits: number; normal: [number, number]; alarm: [number, number] }

// 기준값은 화면마다 적지 말고, 이벤트 정의서(08 운영 탭) 한 곳에서 받아 와요.
// 아래 숫자는 설명용 가상 값이에요. 법정 기준값이 아니에요.
const SPEC: Record<'lel' | 'co' | 'vib', Spec> = {
  lel: { unit: '%LEL', digits: 0, normal: [0, 10], alarm: [0, 25] },
  co: { unit: 'ppm', digits: 0, normal: [0, 25], alarm: [0, 50] },
  vib: { unit: 'mm/s', digits: 1, normal: [0, 4.5], alarm: [0, 7] },
}

export function describe(kind: keyof typeof SPEC, value: number | null, history: number[]) {
  const s = SPEC[kind]
  if (value === null || !Number.isFinite(value)) return { text: '–', status: 'normal' as Status, trend: null }
  const nf = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: s.digits, maximumFractionDigits: s.digits })
  const status: Status =
    value < s.alarm[0] || value > s.alarm[1] ? 'alarm'
    : value < s.normal[0] || value > s.normal[1] ? 'out' : 'normal'
  // 최근 n개 점의 기울기(점 하나당 얼마나 변했나) — 화살표 방향과 '이대로면' 예측에 써요
  const n = history.length
  const mx = (n - 1) / 2, my = history.reduce((a, b) => a + b, 0) / n
  const slope = history.reduce((a, y, i) => a + (i - mx) * (y - my), 0) /
                history.reduce((a, _, i) => a + (i - mx) ** 2, 0)
  // 단위는 숫자 바로 뒤에 붙여요: 12%LEL, 12ppm
  return { text: nf.format(value) + s.unit, status, trend: slope }
}

// 시각은 24시간제, 초까지. 오전·오후를 빼먹는 일이 없어요 → 14:05:12
export const clock = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul',
})

/* CSS: 숫자 열은 고정폭 숫자로, 오른쪽 정렬해요
.value { font-variant-numeric: tabular-nums; text-align: right; } */`

/* ================= 탭 ================= */
function Rule({ a, b, c }: { a: ReactNode; b: ReactNode; c: ReactNode }) {
  return <tr><td>{a}</td><td className="bad">{b}</td><td className="good">{c}</td></tr>
}

export default function Tab() {
  return (
    <div data-dash="context">
      <TermList
        keys={['맥락', '상황 인식', '%LEL', 'CO', 'ppm', 'mm/s', '정상 범위', '경보 범위', '추세', '스파크라인', '아날로그 막대', '%p', '고정폭 숫자', '24시간제']}
        extra={EXTRA}
      />
      <SysGrid>
        <Section id="dash-context-why" wide title="8이라는 숫자만으로는 아무것도 알 수 없어요"
          gist="숫자 옆에 단위, 정상 범위, 추세, 비교 기준을 붙여야 읽혀요."
          desc={<>체온계에 ‘38’만 떠 있으면, 단위가 ℃이고 정상 체온이 36~37.5℃라는 걸 알아야 ‘열이 난다’고 판단할 수 있어요. 안전관리 화면의 숫자도 같아요. 화학물질 창고에 ‘8’이 떠 있다면 무엇을 잰 값인지, 괜찮은지, 어디로 가는지는 숫자 옆에 정보(<T k="맥락" />)가 붙어야 알 수 있어요. 버튼을 하나씩 켜 보세요.</>}>
          <ContextBuilder />
          <Finding src={<>Few, Information Dashboard Design (2006) 요약 <Cite n={1} /> · Endsley (1995) 상황 인식 3단계 요약 <Cite n={3} /></>}>
            값은 비교할 대상이 있어야 의미가 생겨요. 운영자는 값을 보고(지각), 그 뜻을 알고(이해), 앞일을 내다봐요(예측). 화면이 이 세 단계를 많이 대신해 줄수록 판단이 빨라져요.
          </Finding>
          <Note>버튼 옆 작은 글자(지각·이해·예측)는 Endsley가 말한 <Term k="상황 인식" /> 3단계예요. 운전에 빗대면 “앞차 브레이크등이 켜졌다(지각) → 앞차가 선다(이해) → 이대로면 부딪힌다(예측)”예요. 이 탭의 예시는 가상의 가람산업이고, 구역 이름과 수치는 설명을 위해 만든 값이에요. 법정 기준값이나 실제 설비 기준이 아니에요.</Note>
        </Section>

        <Section id="dash-context-mistakes" wide title="흔한 실수 — 숫자만 크게, 단위·기준·시각은 빠진 안전관리 화면"
          gist="숫자만 띄우면 운영자가 기준값을 외워서 판단해야 해요."
          desc={<>안전관리 대시보드에서 아주 흔하게 보는 숫자 실수 세 가지예요. 카드마다 ‘흔한 화면’과 ‘업그레이드하면’을 눌러 비교해 보세요. 탓할 대상은 화면을 보는 사람이 아니라 화면 설계예요.</>}>
          <div className="cx-cases">
            <CaseCard sev="치명" title="가스·CO·진동 값이 숫자만 크게 떠 있어요"
              now={<>구역 타일마다 숫자만 크게 떠 있어요. 8%LEL, 22ppm, 5.1mm/s. 정상 범위도, 경보 기준도, 최근 추세도 없어요.</>}
              why={<>이건 운영자에게 기준값을 외우라고 떠넘기는 화면이에요. 숫자만으로는 ‘괜찮은가’(이해)에도, ‘곧 어떻게 되나’(예측)에도 답할 수 없어요 <Cite n={3} />. 진동 5.1mm/s가 이미 정상 범위를 벗어났다는 것도, 가스 8%LEL이 15분째 빠르게 오르는 중이라는 것도 화면 어디에도 없어요.</>}
              fix={<>값마다 정상·경보 범위를 그린 <T k="아날로그 막대" />와, 정상 범위 띠를 깐 <Term k="스파크라인" />을 붙여요 <Cite n={4} /><Cite n={5} />. 범위 밖 값에만 우선순위 배지를 달아요. 오르는 값에는 ‘이대로면 약 40분 뒤 경보’처럼 조건을 붙인 예측을 적어요.</>}
              before={<MkNumbers up={false} />} after={<MkNumbers up />} />
            <CaseCard sev="높음" title="단위가 빠져서 ‘12’가 무엇의 12인지 몰라요"
              now={<>단위를 열 제목에만 적거나 아예 빼요. 화학물질 창고 가스 ‘12’와 상하차장 CO ‘12’가 나란히 있어요.</>}
              why={<>12%LEL과 12ppm은 전혀 다른 양이에요. 가스 12는 정상 상한(10%LEL)을 넘었고, CO 12는 정상(25ppm 이하)이에요. 단위가 없으면 둘 다 같은 ‘12’로 읽혀요. 대시보드는 한 번 보고 바로 읽혀야 한다는 기본을 어겨요 <Cite n={1} />.</>}
              fix={<>단위는 숫자 바로 뒤에 붙여요(12%LEL, 12ppm, 4.8mm/s). 범위를 벗어났는지는 숫자 색이 아니라 배지와 글자로 따로 보여줘요. 단위와 자릿수는 한 함수에서 정해서 모든 화면이 같게 써요(아래 FE 코드).</>}
              before={<MkUnits up={false} />} after={<MkUnits up />} />
            <CaseCard sev="높음" title="시각이 12시간제인데 오전·오후가 없어요"
              now={<>이벤트 기록에 ‘2:07’, ‘2:05’, ‘11:58’, ‘2:10’처럼 시각만 있어요. 오전인지 오후인지, 오늘인지 어제인지 없어요.</>}
              why={<>교대 인수인계 때 ‘2:10 진동 이상’이 새벽 일인지 낮 일인지 다시 확인해야 해요. 사고 뒤 기록을 맞춰 볼 때도 순서가 헷갈려요. 11:58이 2:05보다 아래에 있으니 정렬이 틀린 것처럼 보여요. 시각을 잘못 읽으면 지금 상황에 대한 이해도 틀려요 <Cite n={3} />.</>}
              fix={<>시각은 <T k="24시간제" />로, 초까지 써요(14:05:12). 날짜가 바뀌는 기록에는 날짜를 붙이고, 최근 기록은 ‘3분 전’을 함께 보여줘요. 기준은 서버 시각 하나로 맞춰요 <Cite n={6} />.</>}
              before={<MkTime up={false} />} after={<MkTime up />} />
            <CaseCard good sev="보통" title="기준값을 한 곳에서 받아 와서, 모든 화면이 같은 선을 그려요"
              now={<>정상 범위와 경보 기준을 이벤트 정의서 한 곳에 적어 둬요. 지도, 목록, 추세 그래프가 모두 그 값을 받아 와서 막대와 선을 그려요.</>}
              why={<>기준이 바뀌어도 화면마다 따로 고칠 일이 없어요. 지도에서는 ‘정상’인데 목록에서는 ‘경고’인 일이 생기지 않아요. 운영자가 숫자 대신 그려진 기준을 보고 판단할 수 있어요 <Cite n={4} />.</>}
              fix={<>기준값마다 누가, 언제, 왜 바꿨는지 기록을 남겨요. 정의서를 만드는 방법은 <a href="#/dash/ops">08 기획 · 운영 정의</a>에서 다뤄요.</>} />
          </div>
        </Section>

        <Section id="dash-context-three" wide title="같은 값 27개를 세 가지 방식으로 보여주기"
          gist="색은 ‘범위 밖’만 알려줘요. 막대와 추세는 ‘곧 나빠질 곳’까지 알려줘요."
          desc={<>9개 구역마다 <T k="%LEL" />로 잰 가연성 가스, <T k="ppm" />으로 잰 일산화탄소, 환기팬 모터 온도가 있어서 값이 모두 27개예요. 표시 방식을 고르고 시작을 누르세요. <Term k="정상 범위" />를 벗어난 값이 몇 개인지 세는 문제가 나와요. 세 방식으로 몇 번씩 풀어 보세요.</>}>
          <ThreeViews />
          <Note tone="tip"><b>색은 ‘범위 밖인지 아닌지’만 알려줘요.</b> 얼마나 벗어났는지, 경계 바로 안쪽에 있는 값이 무엇인지, 어느 쪽으로 움직이는지는 알려주지 못해요. 이건 <T k="아날로그 막대" />와 추세선이 알려줘요. 그래서 <T k="고성능 HMI" />에서는 숫자만 쓰지 않아요. 정상·경보 범위를 그린 막대 위에 지금 값을 화살표로 찍어요 <Cite n={4} /><Cite n={5} />. 안전관리 화면에서는 ‘아직 정상인데 빠르게 오르는 가스’를 먼저 찾는 게 이 차이예요.</Note>
        </Section>

        <Section id="dash-context-cm" wide title="눈은 무엇을 가장 정확하게 읽을까"
          gist="위치로 그린 값이 가장 정확하게 읽혀요. 면적과 색 농도는 대충만 읽혀요."
          desc="두 값 A와 B를 다섯 가지 방식으로 그렸어요. B가 A의 몇 %인지 맞혀 보세요. 문제를 풀수록 방식별 오차가 쌓여서 비교돼요.">
          <CMDemo />
          <Finding src={<>Cleveland & McGill (1984) Graphical Perception 요약 <Cite n={2} /></>}>
            사람은 같은 축 위의 위치를 가장 정확하게 읽어요. 그다음은 길이예요. 각도·기울기, 면적, 부피·색 농도 순으로 점점 부정확해져요.
          </Finding>
          <Note>안전관리 화면에 옮기면 이래요. 같은 축 위의 위치(아날로그 막대의 화살표, 추세선)는 정확하게 비교돼요. 지도 위 원 크기나 색 진하기로 가스 농도를 그리면 대충만 읽혀요. 그래서 정확히 비교해야 하는 값은 위치로 그려요.</Note>
        </Section>

        <Section id="dash-context-trend" wide title="지금 값보다 어디로, 얼마나 빨리 가는지"
          gist="정상 범위 안이라도 빠르게 오르는 값은 먼저 챙겨야 해요."
          desc={<>주전자 물이 지금 70℃라는 것보다, 빠르게 끓어오르는 중인지가 더 중요할 때가 있어요. 제2공장 프레스 라인 3호기의 모터 온도가 64℃예요. 정상 범위(20~70℃) 안이라 숫자만 보면 괜찮아 보여요. 그런데 계속 오르는 중이라면 어떨까요? 오르는 속도를 바꿔 보세요.</>}>
          <TrendDemo />
          <Note>예측선은 최근 30분 값으로 그은 직선이에요. 실제 모터 온도는 작업량과 실내 기온에 따라 달라져요. 그래서 예측에는 꼭 <b>“이대로면”</b>이라는 조건을 붙여 보여줘요. <Term k="상황 인식" /> 3단계 중 ‘예측’을 화면이 도와주는 방법이에요 <Cite n={3} />. 안전관리 화면에서는 설비가 멈추거나 사람이 다치기 전에 알아채는 게 목표예요. 화살표를 몇 단계(거의 그대로 · 천천히 · 빠르게)로 나눌지, 기준값을 얼마로 할지는 현장 안전 담당과 함께 정해요.</Note>
        </Section>

        <Section id="dash-context-compare" title="무엇과 비교할까: 어제, 계절 평균, 정상 상한"
          gist="비교 기준을 함께 보여줘야 ‘높다, 낮다’를 말할 수 있어요."
          desc={<>시험 점수 83점도 반 평균이 60점인지 90점인지에 따라 뜻이 달라져요. 상하차장 일산화탄소 22ppm이 높은지도 무엇과 비교하느냐에 달려 있어요. 트럭이 드나드는 낮에 오르는 값이라 하루 모양을 함께 봐야 해요. 비교 기준을 바꿔 보세요.</>}>
          <CompareDemo />
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th>비교 기준</th><th>언제 쓰나요</th><th>주의할 점</th></tr></thead>
              <tbody>
                <tr><td>정상 범위 · 경보값</td><td>항상 써요. 가장 기본이에요.</td><td>기준값은 한 곳에서 관리해요. 그래야 기준이 바뀔 때 모든 화면이 같이 바뀌어요.</td></tr>
                <tr><td>어제 같은 시각</td><td>하루를 주기로 오르내리는 값(트럭이 드나드는 상하차장의 일산화탄소 등)</td><td>어제가 휴일이었다면 비교가 맞지 않아요. 그럴 땐 같은 요일과 비교하기도 해요.</td></tr>
                <tr><td>계절 평균</td><td>여름 실내 온도처럼 계절 영향이 큰 값</td><td>평균만 보면 날마다 다른 차이가 가려져요. 최소~최대 범위를 같이 보여주면 좋아요.</td></tr>
                <tr><td>계획값 · 작업 일정</td><td>작업 계획이 있는 곳(도장 작업 시간, 크레인 인양 일정 등)</td><td>누가 언제 계획을 바꿨는지 기록이 남아 있어야 해요.</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="dash-context-num" title="단위와 자릿수: 숫자를 한눈에 읽히게"
          gist="단위는 붙이고, 자릿수는 필요한 만큼만, 시각은 24시간제로 써요."
          desc={<>안전관리 화면의 숫자는 한 번 보고 바로 읽혀야 해요. 1초마다 바뀌는 숫자라면 더 그래요. 아래 목록에서 ‘기본 숫자’와 <T k="고정폭 숫자" />를 번갈아 눌러 보며, 값이 바뀔 때 숫자가 옆으로 흔들리는지 보세요.</>}>
          <TabularDemo />
          <Formatter />
          <div className="sys-table-wrap">
            <table className="sys-table cx-rules">
              <thead><tr><th>규칙</th><th>이렇게 말고</th><th>이렇게</th></tr></thead>
              <tbody>
                <Rule a="단위는 숫자 바로 뒤에 붙여요" b="12 (단위는 열 제목에만)" c="12%LEL" />
                <Rule a="필요한 자릿수까지만 보여줘요" b="4.8372mm/s" c="4.8mm/s" />
                <Rule a="같은 열은 소수 자리를 맞춰요" b="4.5 / 4.75 / 5" c="4.5 / 4.8 / 5.0" />
                <Rule a="큰 수는 천 단위마다 쉼표" b="12345건" c="12,345건" />
                <Rule a={<>퍼센트끼리의 차이는 <T k="%p" />로 써요</>} b="보호구 착용률 9% 감소 (92%→83%)" c="−9%p (92% → 83%)" />
                <Rule a={<>시각은 <T k="24시간제" />로 써요</>} b="2:05 (오전? 오후?)" c="14:05" />
                <Rule a="값이 없으면 0 대신 – 와 이유" b="0ppm (통신 끊김)" c="– 통신 끊김" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="dash-context-gauge" wide title="나쁜 예: 자동차 속도계 모양 게이지"
          gist="게이지는 자리만 크게 차지하고, 알려주는 건 값 하나뿐이에요."
          desc={<><T k="게이지" />는 계기판처럼 보여서 안전관리 화면에 자주 쓰여요. 구역마다 일산화탄소 게이지를 하나씩 두는 식이에요. 하지만 차지하는 자리에 비해 알려주는 정보가 적어요. 아래 면적(px²)은 이 화면에서 실제로 잰 값이에요.</>}>
          <GaugeVsBar />
          <Finding src={<>Few, Information Dashboard Design 요약 <Cite n={1} /></>}>
            게이지는 자리를 많이 쓰면서 값 하나만 보여줘요. 대시보드는 한 화면에서 한눈에 봐야 해요. 그래서 막대처럼 작고 서로 비교하기 쉬운 표시가 더 나아요.
          </Finding>
        </Section>

        <Section id="dash-context-check" title="값에 맥락이 붙었는지 점검표"
          gist="값 하나를 화면에 올릴 때마다 이 여덟 가지를 물어봐요."
          desc="기획서를 쓸 때나 화면을 리뷰할 때, 값 하나마다 물어봐요.">
          <CheckList items={[
            '이름과 단위가 값 바로 옆에 있나요?',
            '정상 범위와 경보값이 화면에 그려져 있나요? (숫자로 외우게 하지 않나요?)',
            '방향과 속도가 중요한 값에는 추세나 기울기가 보이나요?',
            '무엇과 비교했는지(어제, 계절, 계획) 적혀 있나요?',
            '자릿수가 측정 정밀도에 맞나요? 같은 열은 소수 자리가 같나요?',
            '시각은 24시간제로, 날짜가 바뀌면 날짜까지 보이나요?',
            '값이 없을 때 0 대신 – 와 그 이유가 보이나요?',
            '게이지 대신 더 작은 막대로 같은 정보를 줄 수 있지 않나요?',
          ]} />
        </Section>

        <Section id="dash-context-code" title="FE · 값에 맥락을 붙이는 함수 하나"
          gist="판정, 단위, 자릿수, 기울기, 시각 표기를 한곳에 모아 모든 화면이 같은 기준을 써요."
          desc={<>상태 판정(정상·범위 밖·경보), 단위와 자릿수, <T k="기울기" /> 계산, 시각 표기를 한 곳에 모아 두세요. 그러면 화면마다 기준이 달라지는 일이 없어요.</>}>
          <CodeBlock code={CODE} label="TypeScript" maxHeight={420} />
        </Section>

        <Refs items={[
          { kind: 'book', text: 'Few, S., Information Dashboard Design, O’Reilly (2006, 2판 2013)' },
          { kind: 'paper', text: 'Cleveland, W. S. & McGill, R. (1984), Graphical Perception: Theory, Experimentation, and Application to the Development of Graphical Methods, JASA 79(387)' },
          { kind: 'paper', text: 'Endsley, M. R. (1995), Toward a Theory of Situation Awareness in Dynamic Systems, Human Factors 37(1)', url: 'https://en.wikipedia.org/wiki/Situation_awareness' },
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015, Human Machine Interfaces for Process Automation Systems — 고성능 HMI', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'practice', text: 'Inductive Automation, High Performance HMI Techniques — 아날로그 막대(정상·경보 범위를 그린 막대 위에 지금 값을 화살표로 표시), 정상 범위 띠를 깐 스파크라인 (업체 문서)', url: 'https://docs.inductiveautomation.com/docs/8.1/ignition-modules/vision/common-tasks-in-vision/high-performance-hmitechniques' },
          { kind: 'practice', text: '실무 경험 — 시각은 24시간제·초 단위·서버 시각 하나로, 단위는 숫자 바로 뒤에, 기준값은 한 곳에서 관리' },
        ]} />
      </SysGrid>
    </div>
  )
}
