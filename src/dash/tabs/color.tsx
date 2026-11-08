/* 02 회색이 기본, 색은 신호 — 모든 선택자는 [data-dash="color"] 범위 */
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Seg, useTimers } from '../../components/ui'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { Term, TermList } from '../../components/Term'
import { contrast, fmtRatio, luminance, simulate, toHex, type RGB, type Vision } from '../../guides/20-contrast/lib'
import { VisionFilters } from '../../guides/20-contrast/shared'
import { PRI, SAFE_ALARMS, SAFE_CENTER, SAFE_RANGES, SAFE_SITES, rng, type Pri } from '../data'
import { CaseCard, Cite, Finding, Hmi, PriBadge, Refs, useVisibleInterval } from '../ui'
import './color.css'

/* ---------- 공용 ---------- */
const hexRgb = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB
const ALARM_HEX: Record<Pri, string> = { 1: '#c92a2a', 2: '#e8590c', 3: '#f2c230' }
/** 가람산업(가상) 현장 3곳의 구역 9개 */
const ZONES = SAFE_SITES.flatMap(s => s.zones.map(z => ({ ...z, site: s.name })))
const zone = (id: string) => ZONES.find(z => z.id === id)!
const alarm = (id: string) => SAFE_ALARMS.find(a => a.id === id)!
const sec = (ms: number) => (ms / 1000).toFixed(1)

/* 공용 사전(glossary.ts)에 없는 말 — 이 탭에서만 쓰는 쉬운 뜻 */
const EXTRA: Record<string, string> = {
  '고성능 HMI': '평소엔 회색으로 조용하고, 이상이 생긴 곳에만 색을 쓰는 관제 화면 설계 방식이에요. 국제 표준 ISA-101이 정리한 원칙이에요.',
  '%LEL': '불이 붙어 폭발할 수 있는 가장 낮은 가스 농도를 100으로 볼 때, 지금 농도가 얼마인지예요. 10%LEL이면 그 농도의 10분의 1이에요.',
  'CO': '일산화탄소예요. 색도 냄새도 없어서 센서로만 알 수 있어요. 지게차·트럭 배기가스나 덜 탄 불에서 나와요.',
  'ppm': '백만분의 1을 뜻하는 단위예요. 공기 알갱이 100만 개 중 몇 개가 그 가스인지예요.',
  '보호구': '안전모, 안전화, 보호조끼처럼 작업자가 몸을 지키려고 입고 쓰는 장비예요.',
  '펄스': '램프가 숨 쉬듯 밝아졌다 어두워졌다를 되풀이하는 효과예요. 움직임이라 눈이 저절로 끌려가요.',
  '색각 이상': '빨강과 초록처럼 특정 색끼리 잘 구분하지 못하는 시각 특성이에요. 생각보다 흔해서 상황실 동료 중에도 있을 수 있어요.',
  '대비': '두 색의 밝기가 얼마나 다른지를 비율로 나타낸 값이에요. 숫자가 클수록 잘 구분돼요. 웹 접근성 기준(WCAG)은 아이콘·모양에 3:1 이상을 요구해요.',
  'ASM 컨소시엄': '정유·화학 회사와 연구 기관이 모여, 관제실에서 생기는 사고와 실수를 줄이는 방법을 함께 연구하는 모임이에요.',
  '팔레트': '한 화면에서 쓰기로 정해 둔 색 목록이에요. 그림 그릴 때 쓰는 물감 판과 같아요.',
  '토큰': '색 같은 디자인 값에 붙인 이름표예요. #c92a2a 대신 --alarm-1 처럼 이름으로 쓰면, 어디에 어떤 뜻으로 쓰는지 관리하기 쉬워요.',
  '상대 휘도': '사람 눈이 느끼는 밝기를 0(검정)부터 1(흰색)까지로 나타낸 값이에요.',
}
const T = ({ k, children }: { k: string; children?: ReactNode }) => <Term k={k} d={EXTRA[k]}>{children}</Term>

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

/* ================= 0. 흔한 실수 목업 ================= */
/* before = 흔한 안전관리 화면(어두운 남색, 초록 램프, 빨강 장식), after = 이 탭 원칙을 적용한 화면 */

/** 정상 = 초록 펄스 */
function MkGreen({ up }: { up: boolean }) {
  const fire = alarm('S-101')
  if (!up) return (
    <Hmi dark className="cl-mk-old" title="전체 현장 개요" right="실시간">
      <div className="cl-mk-zones">
        {ZONES.map(z => {
          const bad = z.id === 'F2'
          return (
            <div key={z.id} className={'cl-mk-z' + (bad ? ' bad' : '')}>
              <span className="nm">{z.name}</span>
              <span className={'cl-mk-lamp' + (bad ? ' red' : '')}><i />{bad ? '이상' : '정상'}</span>
            </div>
          )
        })}
      </div>
    </Hmi>
  )
  return (
    <Hmi title="전체 현장 개요" right="마지막 수신 14:05:12">
      <div className="cl-mk-zones">
        {ZONES.map(z => {
          const bad = z.id === 'F2'
          return (
            <div key={z.id} className={'cl-mk-z' + (bad ? ' bad' : '')}>
              <span className="nm">{z.name}</span>
              {bad
                ? <span className="st"><PriBadge p={fire.pri} size={16} />{fire.what.split(' + ')[0]}</span>
                : <span className="st q">{z.workers}명</span>}
            </div>
          )
        })}
      </div>
    </Hmi>
  )
}

/** 빨강을 녹화 표시·로고·버튼에도 씀 */
const CAMS = ['F2', 'F1', 'W3', 'W1'].map(zone)
function MkRed({ up }: { up: boolean }) {
  const fire = alarm('S-101')
  if (!up) return (
    <Hmi dark className="cl-mk-old" title={<span className="cl-mk-logo"><i aria-hidden="true" />통합 안전관리</span>} right={<span className="cl-mk-sos old">긴급 호출</span>}>
      <div className="cl-mk-cams">
        {CAMS.map((z, i) => (
          <div key={z.id} className={'cl-mk-cam' + (z.id === 'F2' ? ' fire' : '')}>
            <span className="rec"><i aria-hidden="true" />녹화</span>
            <span className="nm">카메라 {i + 1} · {z.name}</span>
          </div>
        ))}
      </div>
    </Hmi>
  )
  return (
    <Hmi title="CCTV 4분할" right={<span className="cl-mk-sos">긴급 호출</span>}>
      <div className="cl-mk-cams">
        {CAMS.map((z, i) => (
          <div key={z.id} className={'cl-mk-cam' + (z.id === 'F2' ? ' fire' : '')}>
            <span className="rec">녹화 중</span>
            {z.id === 'F2' && <span className="al"><PriBadge p={fire.pri} size={16} />{fire.id} 연기 감지</span>}
            <span className="nm">카메라 {i + 1} · {z.name}</span>
          </div>
        ))}
      </div>
    </Hmi>
  )
}

/** 같은 '경고'가 화면마다 다른 색, '예정'에도 경고색 */
const OLD_WARN = ['#ffa94d', '#ffe066', '#f76707']
function MkPalette({ up }: { up: boolean }) {
  const gas = alarm('S-103')
  const warn = (i: number, t: string) => up
    ? <span className="cl-mk-w"><PriBadge p={2} size={16} label /></span>
    : <span className="cl-mk-chip" style={{ background: OLD_WARN[i] }}>{t}</span>
  const plan: [string, string, string][] = [['도장 작업', '예정', '#fcc419'], ['배관 교체', '준비 중', '#ff922b'], ['크레인 점검', '진행 중', '#40c057']]
  return (
    <Hmi dark={!up} className={up ? '' : 'cl-mk-old'} title="통합 안전관리" right={up ? '경고 = 세모 2, 어디서나 같음' : '화면마다 다른 경고색'}>
      <div className="cl-mk-panels">
        <div className="cl-mk-p"><h5>현장 지도</h5><p>물류센터 · 상하차장 {warn(0, '경고')}</p></div>
        <div className="cl-mk-p"><h5>알람 목록</h5><p>{gas.id} 가스 12%LEL {warn(1, '경고')}</p></div>
        <div className="cl-mk-p"><h5>오늘 통계</h5><p>경고 3건 {warn(2, '경고')}</p></div>
        <div className="cl-mk-p"><h5>작업 일정</h5>
          {plan.map(([n, s, c]) => <p key={n}>{n} {up ? <span className="cl-mk-plain">{s}</span> : <span className="cl-mk-chip" style={{ background: c }}>{s}</span>}</p>)}
        </div>
      </div>
    </Hmi>
  )
}

/** 우선순위를 색 점으로만 */
const DOTS = ['S-101', 'S-103', 'S-105'].map(alarm)
const OLD_DOT: Record<Pri, string> = { 1: '#fa5252', 2: '#ff922b', 3: '#ffd43b' }
function MkDots({ up }: { up: boolean }) {
  const list = (sim: boolean) => (
    <ul className="cl-mk-list" style={sim ? { filter: 'url(#clmk-deutan)' } : undefined}>
      {DOTS.map(a => (
        <li key={a.id}>
          {up ? <PriBadge p={a.pri} size={18} /> : <i className="dot" style={{ background: OLD_DOT[a.pri] }} />}
          <b>{a.where.split(' · ')[1]}</b><span>{a.what}</span>
        </li>
      ))}
    </ul>
  )
  return (
    <Hmi dark={!up} className={up ? '' : 'cl-mk-old'} title="알람 목록" right={up ? '색 + 모양 + 숫자' : '색 점만'}>
      <VisionFilters prefix="clmk" />
      <div className="cl-mk-two">
        <figure><figcaption>정상 시각</figcaption>{list(false)}</figure>
        <figure><figcaption>녹색맹 시뮬레이션</figcaption>{list(true)}</figure>
      </div>
    </Hmi>
  )
}

/* ================= 1. 숨은 이상 찾기 ================= */
type Mode = 'trad' | 'hp'
type Metric = 'lel' | 'co'
interface Board { vals: { lel: number; co: number }[]; target: number; metric: Metric; ppe: number[][] }

function makeBoard(seed: number, withTarget: boolean): Board {
  const r = rng(seed)
  const between = (a: number, b: number, d = 0) => +(a + r() * (b - a)).toFixed(d)
  const vals = ZONES.map(() => ({ lel: between(0, 6), co: between(2, 18) }))
  const ppe = ZONES.map(() => [0, 1, 2].map(() => 0.7 + r() * 0.3))
  const target = withTarget ? Math.floor(r() * ZONES.length) : -1
  const metric: Metric = r() < 0.5 ? 'lel' : 'co'
  if (target >= 0) {
    if (metric === 'lel') vals[target].lel = between(SAFE_RANGES.lel.alarm[1] + 1, SAFE_RANGES.lel.alarm[1] + 7)
    if (metric === 'co') vals[target].co = between(SAFE_RANGES.co.alarm[1] + 2, SAFE_RANGES.co.alarm[1] + 14)
  }
  return { vals, target, metric, ppe }
}

const MET: { k: Metric; name: string; full: string; unit: string }[] = [
  { k: 'lel', name: '가스', full: '가연성 가스', unit: '%LEL' },
  { k: 'co', name: 'CO', full: '일산화탄소', unit: 'ppm' },
]

function ZoneCard({ i, b, mode, onPick, state }: { i: number; b: Board; mode: Mode; onPick: (i: number) => void; state: '' | 'hit' | 'miss' | 'reveal' }) {
  const z = ZONES[i], v = b.vals[i], bad = b.target === i
  return (
    <button type="button" className={'cl-fd' + (state ? ' is-' + state : '')} onClick={() => onPick(i)} aria-label={`${z.site} ${z.name}`}>
      <span className="cl-fd-top">
        <b>{z.name}</b>
        {mode === 'trad'
          ? <span className={'cl-lamp' + (bad ? ' red' : '')}><i />{bad ? '이상' : '정상'}</span>
          : <span className="cl-hp-state">{bad ? <PriBadge p={2} size={16} /> : null}</span>}
      </span>
      <span className="cl-fd-cam" aria-hidden="true">
        <span className="rec"><i />{mode === 'trad' ? '녹화' : 'CCTV'}</span>
        <span className="ppl">{z.workers}명</span>
      </span>
      <span className="cl-fd-vals">
        {MET.map(m => {
          const out = bad && b.metric === m.k
          return (
            <span key={m.k} className={'cl-v ' + m.k + (out ? ' out' : '')}>
              <span className="nm">{m.name}</span>
              <span className="nv">{mode === 'hp' && out && <PriBadge p={2} size={14} />}{v[m.k]}<small>{m.unit}</small></span>
            </span>
          )
        })}
      </span>
      <span className="cl-fd-phase" aria-hidden="true">
        {b.ppe[i].map((p, k) => <i key={k} className={'ph' + k} style={{ height: p * 100 + '%' }} />)}
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
  const tgt = ZONES[board.target]
  const met = MET.find(m => m.k === board.metric)!
  const lim = SAFE_RANGES[board.metric].alarm[1]

  return (
    <div className="cl-hunt">
      <div className="cl-hunt-ctl">
        <Seg value={mode} onChange={changeMode} options={[['trad', '흔한 화면'], ['hp', '고성능형 화면']] as const} />
        <button type="button" className="btn sm" onClick={start}>{run ? '새 문제로 다시' : done ? '한 번 더' : '시작'}</button>
        {run && <button type="button" className="btn sm ghost" onClick={giveUp}>정답 보기</button>}
        <div ref={watch} className={'cl-watch' + (run ? ' on' : '')} aria-live="off">
          <span className="muted">걸린 시간</span><b>{sec(elapsed)}초</b>
        </div>
      </div>
      <p className="cl-hunt-msg" role="status">
        {!run && !done && <>시작을 누르면 9개 구역 중 한 곳에 <b>경보 기준을 넘은 가스 값 1개</b>가 숨어요. 찾으면 그 구역 칸을 눌러 주세요.</>}
        {run && (last && !last.ok ? <>{ZONES[last.i].name}은 정상이에요. 계속 찾아보세요. (헛짚음 {run.miss}번)</> : <>찾는 중이에요. 이상이 있는 구역을 누르세요.</>)}
        {done && !done.gave && <><b>{sec(done.ms)}초</b> 만에 찾았어요 ({mode === 'trad' ? '흔한 화면' : '고성능형'}, 헛짚음 {done.miss}번). {tgt.site} {tgt.name}의 {met.full} 값이 경보 기준({lim}{met.unit})을 넘었어요. 이번엔 화면 방식을 바꿔서 해 보세요.</>}
        {done?.gave && <>정답은 <b>{tgt.site} {tgt.name}</b>의 {met.full}이에요. 기록에는 넣지 않았어요.</>}
      </p>

      <Hmi className={'cl-board ' + mode} title={mode === 'trad' ? '전체 현장 개요 · 흔한 화면' : '전체 현장 개요 · 고성능형'} right={SAFE_CENTER}>
        <div className="cl-board-grid">
          {SAFE_SITES.map((s, si) => (
            <div key={s.id} className="cl-sub">
              <div className="cl-sub-name"><span className="mk" aria-hidden="true" />{s.name}</div>
              <div className="cl-sub-fds">
                {s.zones.map((_, zi) => {
                  const i = si * 3 + zi
                  const st = last?.i === i ? (last.ok ? 'hit' : 'miss') : done?.gave && board.target === i ? 'reveal' : ''
                  return <ZoneCard key={i} i={i} b={board} mode={mode} onPick={pick} state={st} />
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
              <span>{m === 'trad' ? '흔한 화면' : '고성능형'} <small className="muted">{cnt(m)}번</small></span>
              <span className="bar"><i style={{ width: (avg(m) / maxAvg) * 100 + '%' }} /></span>
              <b>{cnt(m) ? sec(avg(m)) + '초' : '–'}</b>
            </div>
          ))}
        </div>
        <div className="cl-rec-side">
          {cnt('trad') && cnt('hp') ? (
            <p>지금까지 평균으로 보면 고성능형이 흔한 화면보다 <b>{avg('trad') / avg('hp') >= 1.1 ? `${(avg('trad') / avg('hp')).toFixed(1)}배 빨랐어요` : '크게 빠르지 않았어요'}</b>. 한 사람이 몇 번 해 본 기록이라 정식 실험은 아니에요. 그래도 왜 차이가 나는지는 직접 느낄 수 있어요.</p>
          ) : <p className="muted">두 방식을 각각 3번쯤 해 보면 평균을 비교할 수 있어요.</p>}
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
const LIST: { p: Pri; where: string; what: string }[] = DOTS.map(a => ({ p: a.pri, where: a.where.split(' · ')[1], what: a.what }))
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
          <h4>정상은 초록, 사고는 빨강</h4>
          <div className="cl-cvd-lamps">
            <span><i style={{ background: '#2f9e44' }} />프레스 라인</span>
            <span><i style={{ background: '#c92a2a' }} />도장 부스</span>
            <span><i style={{ background: '#2f9e44' }} />상하차장</span>
          </div>
        </div>
        <div className="cl-cvd-box">
          <h4>우선순위를 색으로만 표시</h4>
          <ul>{LIST.map(a => <li key={a.p}><i className="dot" style={{ background: ALARM_HEX[a.p] }} /><b>{a.where}</b><span>{a.what}</span></li>)}</ul>
        </div>
        <div className="cl-cvd-box good">
          <h4>색 + 모양 + 숫자</h4>
          <ul>{LIST.map(a => <li key={a.p}><PriBadge p={a.p} size={20} /><b>{a.where}</b><span>{a.what}</span></li>)}</ul>
        </div>
      </div>
      <div className="sys-table-wrap">
        <table className="sys-table cl-cvd-tbl">
          <thead><tr><th>비교한 두 색</th><th>정상 시각 밝기 대비</th><th>{VIS.find(x => x[0] === v)![1]} 밝기 대비</th><th>색 말고 구분할 단서</th></tr></thead>
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
          <div className="row"><b>화학물질 창고</b><span>가스 8%LEL</span></div>
          <div className="row shapes">
            {([1, 2, 3] as Pri[]).map(p => <span key={p}><Shape p={p} size={30} outline={outline ? ol : undefined} />{PRI[p].name}</span>)}
          </div>
        </div>
        <dl className="cl-bg-stats">
          <div><dt>배경 밝기(<T k="상대 휘도" />)</dt><dd><span className="cl-meter"><i style={{ width: lum * 100 + '%' }} /></span>{Math.round(lum * 100)}%</dd></div>
          <div><dt>글자와 배경의 대비</dt><dd>{fmtRatio(contrast(txt, bg))} : 1</dd></div>
          {([1, 2, 3] as Pri[]).map(p => {
            const c = outline ? contrast(txt, bg) : contrast(hexRgb(ALARM_HEX[p]), bg)
            return <div key={p}><dt>{PRI[p].name} 모양과 배경의 대비</dt><dd className={c >= 3 ? 'pass' : 'fail'}>{fmtRatio(c)} : 1 <small>{c >= 3 ? '3:1 통과' : '3:1 못 미침'}</small></dd></div>
          })}
        </dl>
      </div>
      <Note><b>세 알람 색이 모두 배경과 3:1 넘게 대비되는 회색은 {allPass.length ? `${toHex([allPass[0], allPass[0], allPass[0]])}~${toHex([allPass[allPass.length - 1], allPass[allPass.length - 1], allPass[allPass.length - 1]])}뿐이에요. 거의 검정에 가까운 배경이에요` : '하나도 없어요'}.</b> 노랑과 주황은 원래 밝은 색이에요. 그래서 권장하는 밝은 회색 배경 위에서는 모양의 경계가 흐려져요. (이 숫자들은 이 화면에서 직접 계산한 값이에요.) 해결법은 밝기 차이로 읽히는 단서를 더하는 거예요. 알람 모양에 <b>어두운 테두리</b>를 두르고 <b>숫자</b>를 같이 붙여요. 위의 체크를 켜 보세요.</Note>
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

const TOKENS = `/* 관제 화면 색 토큰 — 기본은 회색, 알람 색은 알람에만 써요 */
:root {
  /* 회색 다섯 단계: 화면 대부분은 이 다섯 색으로 그려요 */
  --hmi-bg: #dcdcd8;      /* 배경. 흰색보다 살짝 어둡게 해서 눈부심을 줄여요 */
  --hmi-panel: #e9e9e6;   /* 패널·카드 */
  --hmi-line: #b4b4ae;    /* 구분선, 꺼진 설비 */
  --hmi-equip: #8a8a84;   /* 정상인 구역·설비·센서 */
  --hmi-text: #1b1b19;    /* 값과 이름 */

  /* 알람 우선순위 색: 이 세 개는 알람 표시 컴포넌트에서만 써요 */
  --alarm-1: #c92a2a;     /* 긴급 · 네모 · 1 */
  --alarm-2: #e8590c;     /* 높음 · 세모 · 2 */
  --alarm-3: #f2c230;     /* 주의 · 동그라미 · 3 */
  --alarm-outline: var(--hmi-text); /* 밝은 배경에서 노랑·주황 모양의 경계가 보이게 하는 테두리 */
}

/* 금지: 버튼·로고·차트 범주·CCTV 녹화 표시·작업 일정 상태에는 --alarm-* 를 쓰지 않아요.
   린트 규칙으로 막아 두면 실수를 줄일 수 있어요 (예: stylelint 의 declaration-property-value-disallowed-list) */
.btn-primary { background: var(--hmi-text); }   /* 강조 버튼도 회색 안에서 골라요 */
.chart-series-1 { stroke: var(--hmi-text); }
.chart-series-2 { stroke: var(--hmi-equip); stroke-dasharray: 4 3; }
.cctv-rec { color: var(--hmi-text); }            /* CCTV 녹화 표시는 회색 글자로 */`


/* ================= 탭 ================= */
export default function Tab() {
  return (
    <div data-dash="color">
      <TermList
        keys={['관제', 'HMI', '고성능 HMI', '%LEL', 'CO', 'ppm', '보호구', '경보 범위', '우선순위', '전주의 처리', '펄스', '색각 이상', '대비']}
        extra={EXTRA}
      />
      <SysGrid>
        <Section id="dash-color-why" wide title="평소 화면은 조용해야 이상이 보여요"
          gist="정상은 회색으로 두고, 색은 이상이 생긴 곳에만 써요."
          desc={<>조용한 도서관에서는 작은 기침 소리도 바로 들려요. 관제 화면도 같아요. 안전관리 <Term k="관제" /> 화면은 하루 대부분 ‘아무 일 없음’을 보여줘요. 그동안 화면이 조용해야, 가끔 생기는 화재나 가스 이상 하나가 저절로 눈에 띄어요.</>}>
          <Finding src={<>ANSI/ISA-101.01-2015 고성능 HMI 원칙 요약 <Cite n={1} /></>}>
            화면은 기본적으로 회색으로 그려요. 색은 무언가 잘못됐을 때만 써요. 정상 상태에는 색을 칠하지 않아요.
          </Finding>
          <div className="cl-why">
            <div><b>정상은 조용히</b><p>정상인 구역마다 초록 램프를 켜 두면 화면 대부분이 초록이 돼요. 그러면 <Term k="운영자" /> 눈에 초록은 그냥 ‘배경’이 돼 버려요.</p></div>
            <div><b>색 하나에 뜻 하나</b><p>빨강이 ‘긴급 알람’이라면 로고, 버튼, CCTV 녹화 표시에도 빨강을 쓰면 안 돼요. 그래야 빨강을 보자마자 고민 없이 ‘사고다’ 하고 알아채요.</p></div>
            <div><b>색만 믿지 않기</b><p>색을 잘 구분하지 못하는 동료도 같은 화면을 봐요. 그래서 <Term k="우선순위" />는 색, 모양, 숫자를 함께 써서 보여줘요 <Cite n={6} />.</p></div>
          </div>
          <Note>이 탭의 예시는 가상의 가람산업(제2공장 · 물류센터 · 신축 현장)이에요. 구역 이름과 수치는 설명을 위해 만든 값이에요. 법정 기준값이나 실제 설비 기준이 아니에요.</Note>
        </Section>

        <Section id="dash-color-mistakes" wide title="흔한 실수 — 색이 신호가 아니라 장식이 된 안전관리 화면"
          gist="정상에 초록, 장식에 빨강을 쓰면 진짜 사고가 묻혀요."
          desc={<>안전관리 대시보드에서 아주 흔하게 보는 색 실수 네 가지예요. 카드마다 ‘흔한 화면’과 ‘업그레이드하면’을 눌러 비교해 보세요. 탓할 대상은 화면을 보는 사람이 아니라 화면 설계예요.</>}>
          <div className="cl-cases">
            <CaseCard sev="치명" title="정상을 초록으로, 그것도 숨 쉬듯 반짝이게 칠해요"
              now={<>구역마다 초록 ‘정상’ 램프가 켜져 있어요. 화면이 살아 있다는 느낌을 주려고 램프가 천천히 반짝여요(<T k="펄스" />). 화면 전체가 초록으로 움직여요.</>}
              why={<>이건 안전관리 화면이 해서는 안 되는 일이에요. 색과 움직임은 눈이 0.2초 만에 저절로 끌려가는 신호예요 <Cite n={5} />. 그 신호를 정상 구역 여덟 곳에 다 써 버리면, 도장 부스 화재 램프는 아홉 개 중 하나로 묻혀요. ISA-101은 정상 상태에 색을 칠하지 않는다고 정해 두었어요 <Cite n={1} />.</>}
              fix={<>정상 구역은 회색으로 두고 움직이지 않게 해요. 색과 움직임은 이상이 생긴 구역에만 써요. ‘화면이 살아 있다’는 표시는 반짝이는 램프 대신 <b>마지막 수신 14:05:12</b> 같은 글자로 보여줘요(<a href="#/dash/realtime">05 실시간 갱신</a>).</>}
              before={<MkGreen up={false} />} after={<MkGreen up />} />
            <CaseCard sev="높음" title="빨강이 로고, 호출 버튼, CCTV 녹화 표시에도 있어요"
              now={<>로고, ‘긴급 호출’ 버튼, 카메라 화면마다 붙은 ‘● 녹화’ 점이 모두 빨강이에요. 진짜 화재 알람 테두리도 같은 빨강이에요.</>}
              why={<>‘빨강 = 긴급 알람’이라는 약속이 깨져요. 녹화 점 네 개, 로고, 버튼, 화재 테두리가 모두 빨강이면 눈은 일곱 곳을 다 확인해야 해요. 정작 불이 난 카메라는 그중 하나일 뿐이에요. 알람 색은 비정상에만 쓰는 게 고성능 HMI의 기본이에요 <Cite n={1} /><Cite n={2} />.</>}
              fix={<>녹화 표시는 회색 글자 ‘녹화 중’으로 바꿔요. 로고와 버튼은 회색 계열에서 골라요. 빨강은 불이 난 카메라 한 곳에만 쓰고, 네모 모양 ‘1’ 배지와 알람 번호(S-101)를 함께 붙여요.</>}
              before={<MkRed up={false} />} after={<MkRed up />} />
            <CaseCard sev="높음" title="같은 ‘경고’가 화면마다 다른 색이고, ‘예정’에도 경고색을 써요"
              now={<>지도는 연한 주황, 알람 목록은 노랑, 통계는 진한 주황으로 ‘경고’를 칠해요. 작업 일정에서는 ‘예정’이 노랑, ‘준비 중’이 주황이에요.</>}
              why={<>같은 뜻에 색이 세 벌이면, 색만 보고 뜻을 알 수 없어요. 매번 글자를 읽어야 해요. ‘예정’처럼 아무 문제 없는 상태에 경고색을 쓰면, 진짜 가스 경고와 섞여요. 색이 비정상에만 쓰인다는 원칙이 무너진 거예요 <Cite n={1} />.</>}
              fix={<>경고색은 <T k="토큰" /> 하나(<code>--alarm-2</code>)로만 정해요. 지도, 목록, 통계가 모두 같은 세모 ‘2’ 배지를 불러 써요. ‘예정·준비 중’은 회색 글자로 써요. 색이 아니라 글자가 상태를 알려줘요.</>}
              before={<MkPalette up={false} />} after={<MkPalette up />} />
            <CaseCard sev="높음" title="우선순위를 색 점 하나로만 구분해요"
              now={<>알람 목록 맨 앞에 빨강·주황·노랑 점 하나로만 우선순위를 표시해요.</>}
              why={<>녹색맹 시뮬레이션으로 보면 빨강과 주황 점이 거의 같아 보여요. 화재와 가스 경고를 같은 급으로 읽을 수 있다는 뜻이에요. WCAG는 색만으로 정보를 전하지 말라고 해요 <Cite n={6} />.</>}
              fix={<>우선순위는 색 + 모양 + 숫자로 보여줘요. 긴급은 네모 1, 높음은 세모 2, 주의는 동그라미 3이에요. 오른쪽 녹색맹 시뮬레이션에서도 그대로 읽혀요.</>}
              before={<MkDots up={false} />} after={<MkDots up />} />
            <CaseCard good sev="보통" title="깜빡임은 ‘아직 아무도 안 본 알람’에만, 초당 3회 이하로"
              now={<>새 긴급 알람만 1초에 한 번쯤 천천히 깜빡여요. 운영자가 확인을 누르면 깜빡임이 멈추고 색과 모양만 남아요. 움직임 줄이기 설정을 켠 사람에게는 처음부터 깜빡이지 않아요.</>}
              why={<>깜빡임이 ‘미확인 알람’이라는 뜻 하나로만 쓰여서, 움직이는 곳이 곧 아직 안 본 곳이에요 <Cite n={7} />. 초당 3회를 넘는 깜빡임은 광과민성 발작을 일으킬 수 있어 WCAG가 막고 있어요 <Cite n={6} />.</>}
              fix={<>깜빡이는 알람이 여러 개면 모두 같은 박자로 맞춰요. 제각각 깜빡이면 화면이 어지러워요. 정상 구역의 ‘살아 있음’ 표시에는 깜빡임을 쓰지 않아요.</>} />
          </div>
        </Section>

        <Section id="dash-color-hunt" wide title="직접 해 보기: 숨은 이상 하나 찾기"
          gist="회색이 기본인 화면에서 이상 하나를 훨씬 빨리 찾아요."
          desc={<>두 화면은 같은 9개 구역, 같은 값을 보여줘요. 색을 칠하는 방식만 달라요. 시작을 누르고, <Term k="경보 범위" />를 넘은 가스 값(<T k="%LEL" /> 또는 <T k="CO" /> <T k="ppm" />)이 있는 구역을 찾아 눌러 보세요.</>}>
          <HuntGame />
          <Note tone="tip"><b>흔한 화면에서는 왜 오래 걸렸을까요?</b> 흔한 화면은 정상 구역마다 초록 램프를 켜 두었어요. CCTV ‘녹화’ 점과 <T k="보호구" /> 착용률 막대에도 이미 빨강을 쓰고 있어요. 그래서 이상 램프의 빨강이 그 사이에 묻혀요. 고성능형은 정상인 것이 모두 회색이라, 색이 보이는 곳이 곧 봐야 할 곳이에요. 흔한 화면은 업계에서 자주 보는 방식을 모아 조금 과장해서 만든 예시예요.</Note>
        </Section>

        <Section id="dash-color-asm" wide title="실제 실험에서는 얼마나 달랐나"
          gist="회색 기본 화면에서 이상을 더 일찍, 더 자주, 더 빨리 처리했다고 보고됐어요."
          desc={<><T k="ASM 컨소시엄" />이 석유화학 공장(에틸렌 플랜트) 운전 상황으로 실험을 했어요. 기존 화면과 <T k="고성능 HMI">고성능 화면</T>을 비교한 실험이에요. 아래 수치는 업체가 요약해 전한 값이에요. 버튼으로 두 화면의 결과를 바꿔 보세요.</>}>
          <AsmChart />
          <Finding src={<>Hollifield 외, The High Performance HMI Handbook (2008) 및 ASM 컨소시엄 실험 — 업체 요약에서 확인한 보고된 수치 <Cite n={2} /><Cite n={3} /></>}>
            고성능 화면을 쓴 운전원은 세 가지가 나아졌다고 보고됐어요. 알람이 울리기 전에 이상을 더 자주 알아챘어요. 대응에 더 자주 성공했어요. 처리도 더 빨리 끝냈어요.
          </Finding>
          <Note tone="warn"><b>읽을 때 주의할 점</b> 한 산업에서 한 번 한 실험이고, 그 결과를 업체 문서가 요약한 값이에요. 원래 논문의 실험 조건은 확인하지 못했어요. 이 실험은 화학 공장 운전 화면으로 한 것이라, 안전관리 화면에 같은 크기의 효과가 난다는 보장도 없어요. 그러니 “회색으로 바꾸면 41% 빨라진다”처럼 그대로 약속하지 마세요. 어느 쪽이 나은지 방향을 잡는 근거로만 써 주세요.</Note>
        </Section>

        <Section id="dash-color-pop" wide title="빨강은 주변이 회색일 때 가장 잘 보여요"
          gist="주변에 색이 많으면 빨간 점 하나도 묻혀 버려요."
          desc={<>회색 점들 사이의 빨간 점 하나는 찾으려 애쓰지 않아도 바로 보여요. 눈은 색, 모양, 움직임의 차이를 약 0.2~0.25초 안에 저절로 알아채요. 이것을 <Term k="전주의 처리" />라고 해요. 하지만 주변에 비슷한 색이 많으면 이 효과가 약해져요.</>}>
          <div className="cl-pop-pair">
            <PopField base="green" title="정상 = 초록 램프 30개" sub="그 사이 빨강 1개" />
            <PopField base="gray" title="정상 = 회색 램프 30개" sub="그 사이 빨강 1개" />
          </div>
          <Note>버튼을 누르면 램프가 0.25초 동안만 보였다가 사라져요 <Cite n={5} />. 사라진 뒤 빨강이 있던 자리를 눌러 보세요. 아마 회색 쪽이 훨씬 쉬울 거예요. 빨강과 초록은 밝기가 비슷해서, 색 말고는 구별할 단서가 거의 없거든요. 안전관리 화면에서 구역·센서마다 켜 둔 초록 ‘정상’ 램프가 바로 왼쪽 그림이에요. 램프는 한 번만 짧게 보여주고, 깜빡이지 않아요.</Note>
        </Section>

        <Section id="dash-color-palette" title="빨강·주황·노랑은 알람에만 써요"
          gist="회색 다섯 단계와 알람 색 세 개면 충분해요."
          desc={<>관제 화면에 쓸 색 목록(<T k="팔레트" />)은 회색 다섯 단계와 알람 색 세 개면 충분해요. 알람 색은 알람이 아닌 곳에 쓰지 않아요.</>}>
          <div className="cl-pal">
            <div className="cl-pal-row" aria-label="회색 다섯 단계">
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
            <li className="no"><b>안 돼요</b><span>정상인 구역·센서를 초록 램프로 표시</span></li>
            <li className="no"><b>안 돼요</b><span>로고, 호출 버튼, CCTV 녹화 표시에 빨강 쓰기</span></li>
            <li className="no"><b>안 돼요</b><span>작업 일정의 ‘예정·준비 중’을 노랑·주황으로 칠하기</span></li>
            <li className="no"><b>안 돼요</b><span>차트에서 제2공장·물류센터·신축 현장을 빨강·주황·노랑으로 구분</span></li>
            <li className="no"><b>안 돼요</b><span>우선순위를 색 점 하나로만 표시</span></li>
            <li className="ok"><b>좋아요</b><span>정상 구역은 회색, 이상이 생긴 값 옆에만 <PriBadge p={2} size={16} /> 표시</span></li>
            <li className="ok"><b>좋아요</b><span>차트 범주는 회색 농도와 선 모양(실선·점선)으로 구분</span></li>
          </ul>
          <Note><Term k="우선순위" /> 단계는 3~4개 이하로 두라고 흔히 권해요 <Cite n={7} />. 색이 많아질수록 서로 구분하기 어렵고, 외울 규칙도 늘어나요.</Note>
        </Section>

        <Section id="dash-color-cvd" title="모양과 숫자가 왜 필요할까: 색각 이상으로 보기"
          gist="색만 쓴 표시는 구분이 안 되고, 모양·숫자를 함께 쓴 표시는 그대로 읽혀요."
          desc={<>빨강과 초록을 잘 구분하지 못하는 사람(적록 <T k="색각 이상" />)의 눈으로 같은 화면을 바꿔 보세요. 색만 쓴 줄은 화재와 가스 경고가 잘 구분되지 않아요. 모양과 숫자를 함께 쓴 줄은 그대로 읽혀요.</>}>
          <CvdDemo />
          <Note>시뮬레이션은 Machado 외(2009) 모델에서 가장 강한 정도(심도 1.0)의 계산식을 썼어요 <Cite n={8} />. 실제로 보이는 정도는 사람마다 달라요. 표의 ‘밝기 대비’는 두 알람 색끼리 밝기가 얼마나 다른지를 이 화면에서 직접 계산한 값이에요.</Note>
        </Section>

        <Section id="dash-color-bg" wide title="배경은 왜 흰색이 아니라 회색일까"
          gist="밝은 회색 배경이 눈이 덜 부셔요. 대신 노랑·주황 알람엔 테두리가 필요해요."
          desc={<>하루 종일 읽는다면 새하얀 종이보다 연한 회색 종이가 눈이 편해요. 그래서 <T k="고성능 HMI" /> 지침은 밝은 회색 배경을 권해요 <Cite n={2} />. 흰 배경은 오래 보면 눈이 부시고, 상황실 조명도 화면에 더 많이 비쳐요. 배경 밝기를 바꾸면서 글자와 알람 모양이 배경과 얼마나 잘 구분되는지(<T k="대비" />) 보세요.</>}>
          <BgDemo />
          <Note tone="tip">흔한 안전관리 화면은 어두운 남색 배경을 늘 고정으로 써요. 어두운 화면이 맞는 곳은 조명을 낮춘 상황실이나 야간 근무예요. 조명 조건과 함께 <a href="#/dash/room">07 관제실 환경</a>에서 다뤄요.</Note>
        </Section>

        <Section id="dash-color-check" title="색 규칙 점검표"
          gist="화면 리뷰 때 이 일곱 가지를 하나씩 확인해요."
          desc="디자이너, 기획자, 개발자가 화면 리뷰 때 함께 보는 질문이에요.">
          <CheckList items={[
            '모든 색을 회색으로 바꿔도, 정상 화면에서 잃는 정보가 없나요?',
            '정상 상태를 초록으로 칠하거나 반짝이게 한 곳이 남아 있지 않나요?',
            '빨강·주황·노랑을 알람이 아닌 곳(로고, 버튼, CCTV 녹화 표시, 차트 범주)에 쓰지 않았나요?',
            '‘예정·준비 중’ 같은 평범한 상태에 경고색을 쓰지 않았나요?',
            '같은 우선순위가 지도, 목록, 통계에서 같은 색·모양으로 보이나요?',
            '우선순위를 색, 모양, 숫자로 함께 표시하나요? 노랑·주황 모양은 배경과 3:1 이상 대비되나요?',
            '흰 배경 대신 밝은 회색 배경을 썼나요? (또는 조명에 맞춘 어두운 화면)',
          ]} />
        </Section>

        <Section id="dash-color-code" title="FE · 알람 색을 토큰으로 따로 두기"
          gist="알람 색은 알람 표시 컴포넌트에서만 쓰도록 막아 둬요."
          desc={<>색마다 이름(<T k="토큰" />)을 붙이고, 알람 색은 알람 표시에서만 쓰도록 규칙을 정해요. 그러면 실수로 버튼이나 녹화 표시에 빨강을 쓰는 일이 줄어요. 화면마다 경고색이 달라지는 일도 막아요.</>}>
          <CodeBlock code={TOKENS} label="CSS" maxHeight={380} />
        </Section>

        <Refs items={[
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015, Human Machine Interfaces for Process Automation Systems — 고성능 HMI(기본은 회색, 색은 이상이 있을 때만)', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'book', text: 'Hollifield, Oliver, Nimmo, Habibi, The High Performance HMI Handbook, PAS (2008)', url: 'https://docs.tatsoft.com/display/FX/ISA-101+HMI+Compliance+How-to' },
          { kind: 'reported', text: 'ASM 컨소시엄 에틸렌 플랜트 실험: 알람 전 감지 10번 중 1번 → 5번, 대응 성공률 70% → 96%, 처리 시간 18.1분 → 10.6분 (업체 요약)', url: 'https://new.abb.com/power-generation/in-control/01-2016/the-key-to-operator-effectiveness' },
          { kind: 'book', text: 'ASM Consortium, Effective Console Operator HMI Design Practices, 2판 (2013)', url: 'https://www.automation.com/en-us/articles/2013-2/asm-publishes-2nd-edition-of-hmi-design-guidelines' },
          { kind: 'paper', text: 'Healey, C. G. & Enns, J. T. (2012), Attention and Visual Memory in Visualization and Computer Graphics, IEEE TVCG 18(7) — 전주의 처리(눈이 0.2초 안에 저절로 알아채는 것)' },
          { kind: 'standard', text: 'W3C WCAG 2.2 — 1.4.1 색 사용, 1.4.3 대비(최소), 1.4.11 비텍스트 대비, 2.3.1 세 번 깜빡임', url: 'https://www.w3.org/TR/WCAG22/' },
          { kind: 'reported', text: 'ANSI/ISA-18.2 (IEC 62682) · EEMUA 191 알람 관리 — 우선순위는 3~4단계 이하로, 미확인·확인 같은 알람 상태 (2차 자료)', url: 'https://ifactoryapp.com/industries/oil-and-gas/alarm-management-isa-18-2-rationalization-flooding' },
          { kind: 'paper', text: 'Machado, Oliveira, Fernandes (2009), A Physiologically-based Model for Simulation of Color Vision Deficiency, IEEE TVCG 15(6)' },
        ]} />
      </SysGrid>
    </div>
  )
}
