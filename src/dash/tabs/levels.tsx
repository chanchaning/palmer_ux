import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Term, TermList } from '../../components/Term'
import { Seg } from '../../components/ui'
import { Note, Section, SysGrid } from '../../system/ui'
import { ALARMS, RANGES, SUBSTATIONS, series, type Pri } from '../data'
import { AnalogBar, Cite, Finding, Hmi, PriBadge, Refs, Sparkline } from '../ui'
import './levels.css'

/** 사전(glossary.ts)에 없는 이 탭 전용 용어 */
const X: Record<string, string> = {
  '위계': '큰 것에서 작은 것으로 내려가는 단계 구조예요. 회사 조직도처럼 전체 → 부서 → 팀 → 사람 순서로 좁혀 가요.',
  '빵부스러기': '‘누리시 전체 › 강변 변전소 › 강변 1선’처럼 지금 화면까지 온 길을 보여 주는 줄이에요. 동화에서 길에 떨어뜨린 빵부스러기에서 온 이름이에요. 누르면 위 단계로 바로 돌아가요.',
  '시각적 연속성': '화면이 바뀌어도 “어디서 왔고 지금 어디인지”를 잃지 않게 하는 것이에요. 지도 앱에서 확대해도 주변이 이어져 보여서 길을 잃지 않는 것과 같아요.',
  '자동 재폐로': '전기가 끊긴 뒤 잠시 기다렸다가 자동으로 다시 붙여 보는 기능이에요. 잠깐 스친 고장이면 이걸로 저절로 복구돼요.',
  '만트라': '주문처럼 외워 두고 늘 되새기는 짧은 원칙이에요.',
}

/* ================= 예시 상황: 알람 6개가 동시에 떠 있는 순간 =================
 * data.ts 의 기본값에 알람과 맞는 값을 덮어써요(가상). */
type Lv = 1 | 2 | 3 | 4
type MKey = 'load' | 'kv' | 'temp' | 'wind'
interface Point { key: MKey; name: string; value: number; unit: string; min: number; max: number; normal: [number, number]; alarm: [number, number] }
interface Path { sub?: string; eq?: string; pt?: MKey }

const OVERRIDE: Record<string, Partial<{ load: number; kv: number; temp: number }>> = {
  R1: { load: 96 }, I1: { load: 0 }, N2: { kv: 22.3 },
}
const TR_TEMP: Record<string, number> = { N: 61, R: 72, I: 91 }
const TRIPPED = new Set(['I1'])
const COMM_LOST = new Set(['R2'])

const feeder = (id: string) => {
  for (const s of SUBSTATIONS) for (const f of s.feeders) if (f.id === id) return { ...f, ...OVERRIDE[id] }
  return undefined
}
const subOf = (id: string) => SUBSTATIONS.find(s => s.id === id)!
const eqName = (sub: string, eq: string) => (eq === 'TR' ? `${subOf(sub).name.replace(' 변전소', '')} 주변압기` : feeder(eq)!.name)

const pointsOf = (sub: string, eq: string): Point[] => {
  const L = RANGES.load, K = RANGES.kv, T = RANGES.temp
  if (eq === 'TR') {
    const s = subOf(sub)
    const avg = Math.round(s.feeders.reduce((a, f) => a + (feeder(f.id)!.load), 0) / s.feeders.length)
    const oil = TR_TEMP[sub]
    return [
      { key: 'temp', name: '기름 온도(유온)', value: oil, unit: '℃', min: T.min, max: T.max, normal: T.normal, alarm: T.alarm },
      { key: 'wind', name: '코일 온도(권선)', value: oil + 12, unit: '℃', min: T.min, max: 130, normal: [30, 95], alarm: [0, 110] },
      { key: 'load', name: '변압기 부하율', value: avg, unit: '%', min: L.min, max: L.max, normal: L.normal, alarm: L.alarm },
    ]
  }
  const f = feeder(eq)!
  return [
    { key: 'load', name: '부하율', value: f.load, unit: '%', min: L.min, max: L.max, normal: L.normal, alarm: L.alarm },
    { key: 'kv', name: '전압', value: f.kv, unit: 'kV', min: K.min, max: K.max, normal: K.normal, alarm: K.alarm },
  ]
}
const outOf = (p: Point) => p.value < p.normal[0] || p.value > p.normal[1]
const badOf = (p: Point) => p.value < p.alarm[0] || p.value > p.alarm[1]

/** 알람 → 바로 갈 화면 */
const ALARM_TARGET: Record<string, Path> = {
  'A-101': { sub: 'I', eq: 'I1' },
  'A-102': { sub: 'R', eq: 'R1', pt: 'load' },
  'A-103': { sub: 'I', eq: 'TR', pt: 'temp' },
  'A-104': { sub: 'N', eq: 'N2', pt: 'kv' },
  'A-105': { sub: 'R', eq: 'R2' },
  'A-106': { sub: 'N' },
}
const alarmsAt = (p: Path) => ALARMS.filter(a => {
  const t = ALARM_TARGET[a.id]
  if (p.sub && t.sub !== p.sub) return false
  if (p.eq && t.eq !== p.eq) return false
  return true
})
const topPri = (p: Path): Pri | null => {
  const a = alarmsAt(p)
  return a.length ? (Math.min(...a.map(x => x.pri)) as Pri) : null
}
const lvOf = (p: Path): Lv => (p.pt ? 4 : p.eq ? 3 : p.sub ? 2 : 1)

const LEVELS: Record<Lv, { name: string; scope: string; where: string; doo: string[]; dont: string[] }> = {
  1: { name: '전체 개요', scope: '맡은 범위 전체', where: '벽면 대형 화면 · 늘 띄워 둠', doo: ['맡은 범위 전체가 괜찮은지 몇 초 안에 확인', '이상이 어디쯤 있는지 위치만 파악'], dont: ['조작(차단기 열고 닫기)', '자세한 숫자 읽기 — 숫자는 최소로'] },
  2: { name: '구역 운전', scope: '변전소 하나 · 선로 몇 개', where: '운영자 정면 모니터', doo: ['근무 시간 대부분을 여기서 보내요', '선로 값 지켜보기, 일상 조작(부하를 옆 선로로 옮기기 등)'], dont: ['센서 하나하나 진단하기', '다른 구역 잊어버리기 — 그래서 알람 줄은 늘 보여요'] },
  3: { name: '설비 상세', scope: '설비 하나와 그 제어 장치', where: '운영자 옆 모니터', doo: ['설비 하나의 상태를 모아 보고 원인을 좁혀요', '그 설비를 조작하고 결과를 확인해요'], dont: ['오래 머물며 지켜보기 — 볼 일을 마치면 레벨 2로 돌아가요'] },
  4: { name: '진단 · 보조', scope: '센서 · 부품 하나', where: '옆 모니터 · 정비 담당', doo: ['센서마다 값의 흐름, 지난 기록, 교정(눈금 맞추기) 상태 확인', '정비 요청, 사고 뒤 원인 분석'], dont: ['계속 띄워 두고 지켜보기 — 그런 용도의 화면이 아니에요'] },
}

/* ---------- 레벨별 화면 ---------- */
type Go = (p: Path, e?: MouseEvent<HTMLElement>) => void

function L1View({ go }: { go?: Go }) {
  const Tag = go ? 'button' : 'div'
  return (
    <div className="lv-l1">
      {SUBSTATIONS.map(s => {
        const pr = topPri({ sub: s.id })
        const n = alarmsAt({ sub: s.id }).length
        return (
          <Tag key={s.id} type={go ? 'button' : undefined} className={'lv-l1-sub' + (pr ? ' alarm' : '')} onClick={go ? (e: MouseEvent<HTMLElement>) => go({ sub: s.id }, e) : undefined}>
            <span className="h"><b>{s.name}</b>{pr && <PriBadge p={pr} />}</span>
            <span className="bars" aria-hidden="true">
              {s.feeders.map(f => {
                const v = feeder(f.id)!.load
                return <i key={f.id} className={TRIPPED.has(f.id) ? 'trip' : v > RANGES.load.alarm[1] ? 'bad' : ''} style={{ height: Math.max(6, (v / 120) * 100) + '%' }} />
              })}
            </span>
            <span className="s">{n ? `알람 ${n}건` : '정상'} · 선로 {s.feeders.length}개</span>
          </Tag>
        )
      })}
    </div>
  )
}

function L2View({ sub, go }: { sub: string; go: Go }) {
  const s = subOf(sub)
  const tr = TR_TEMP[sub]
  const trPri = topPri({ sub, eq: 'TR' })
  return (
    <div className="lv-l2">
      <button type="button" className={'lv-eq tr' + (trPri ? ' alarm' : '')} onClick={e => go({ sub, eq: 'TR' }, e)}>
        <span className="h"><b>주변압기</b>{trPri && <PriBadge p={trPri} />}</span>
        <span className="row"><span>유온</span><AnalogBar value={tr} min={RANGES.temp.min} max={RANGES.temp.max} normal={RANGES.temp.normal} alarm={RANGES.temp.alarm} unit="℃" name="주변압기 유온" w={110} /><em>{tr}℃</em></span>
      </button>
      <div className="lv-l2-bus" aria-hidden="true" />
      <div className="lv-l2-feeders">
        {s.feeders.map(f0 => {
          const f = feeder(f0.id)!
          const pr = topPri({ sub, eq: f.id })
          const trip = TRIPPED.has(f.id)
          return (
            <button key={f.id} type="button" className={'lv-eq' + (pr ? ' alarm' : '')} onClick={e => go({ sub, eq: f.id }, e)}>
              <span className="h"><b>{f.name}</b>{pr && <PriBadge p={pr} />}</span>
              <span className="cb">차단기 <b>{trip ? '끊김(트립)' : '연결(투입)'}</b></span>
              <span className="row"><span>부하</span><AnalogBar value={f.load} min={0} max={120} normal={RANGES.load.normal} alarm={RANGES.load.alarm} unit="%" name={f.name + ' 부하율'} w={110} /><em>{trip ? '–' : f.load + '%'}</em></span>
              <span className="row"><span>전압</span><AnalogBar value={trip ? 21.5 : f.kv} min={RANGES.kv.min} max={RANGES.kv.max} normal={RANGES.kv.normal} alarm={RANGES.kv.alarm} unit="kV" name={f.name + ' 전압'} w={110} /><em>{trip ? '–' : f.kv}</em></span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function L3View({ sub, eq, go }: { sub: string; eq: string; go: Go }) {
  const pts = pointsOf(sub, eq)
  const trip = TRIPPED.has(eq)
  const status: [string, ReactNode][] = eq === 'TR'
    ? [['냉각팬 1', '운전'], ['냉각팬 2', TR_TEMP[sub] > 85 ? '운전' : '정지 (대기)'], ['탭 위치(전압 조절 단계)', '9 / 17']]
    : [['차단기', trip ? <b key="t">끊김 — 14:27 트립</b> : '연결(투입)'], ['자동 재폐로', trip ? '실패 (다시 붙이기 1번 시도)' : '대기'], ...(['11', '12', '13'].map(n => [`개폐기 R/C-${n}`, COMM_LOST.has(eq) && n === '12' ? <b key="c">통신 두절</b> : '정상'] as [string, ReactNode]))]
  return (
    <div className="lv-l3">
      <div className="lv-l3-pts">
        <div className="k">측정값 — 누르면 레벨 4에서 자세히</div>
        {pts.map((p, i) => (
          <button key={p.key} type="button" className={'lv-pt' + (badOf(p) && !(trip && p.key !== 'temp') ? ' alarm' : '')} onClick={e => go({ sub, eq, pt: p.key }, e)}>
            <span className="n">{p.name}</span>
            <AnalogBar value={trip ? p.min : p.value} min={p.min} max={p.max} normal={p.normal} alarm={p.alarm} unit={p.unit} name={p.name} w={140} />
            <em>{trip ? '–' : p.value + p.unit}</em>
            <Sparkline data={trendOf(sub, eq, p, i, 24)} w={90} h={26} band={p.normal} min={p.min} max={p.max} />
          </button>
        ))}
      </div>
      <div className="lv-l3-st">
        <div className="k">설비 상태</div>
        <dl>{status.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </div>
    </div>
  )
}

/** 24시간 추세 (30분 간격) — 마지막 값이 현재 값에 닿게 */
function trendOf(sub: string, eq: string, p: Point, i: number, n = 48) {
  const seed = (sub.charCodeAt(0) * 31 + eq.charCodeAt(eq.length - 1) * 7 + i) | 0
  const span = p.normal[1] - p.normal[0]
  const raw = series(seed, n, p.normal[0] + span * 0.55, span * 0.18, span * 0.08)
  const gap = (TRIPPED.has(eq) && p.key !== 'temp' ? p.min : p.value) - raw[n - 1]
  return raw.map((v, k) => +(v + gap * Math.max(0, (k - n * 0.7) / (n * 0.3))).toFixed(2))
}

function L4View({ sub, eq, pt }: { sub: string; eq: string; pt: MKey }) {
  const pts = pointsOf(sub, eq)
  const i = pts.findIndex(p => p.key === pt)
  const p = pts[i]
  const data = trendOf(sub, eq, p, i)
  const W = 560, H = 170, Lp = 36, R = 8, T = 10, B = 22
  const x = (k: number) => Lp + (k / (data.length - 1)) * (W - Lp - R)
  const y = (v: number) => T + (1 - (v - p.min) / (p.max - p.min)) * (H - T - B)
  const d = data.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const hiAl = p.alarm[1]
  const loAl = p.alarm[0] > p.min ? p.alarm[0] : null
  const id = `${eq}-${pt.toUpperCase()}-01`
  const hist = [
    badOf(p) ? `14:27  경보 — ${p.name} ${p.value}${p.unit}` : outOf(p) ? `13:50  정상 범위 벗어남 — ${p.value}${p.unit}` : '오늘  이벤트 없음',
    '어제 18:40  정상 범위 안에서 최고값',
    '10월 14일  센서 눈금 맞춤(교정) · 정비팀',
  ]
  return (
    <div className="lv-l4">
      <div className="lv-l4-chart">
        <div className="k">{p.name} · 최근 24시간</div>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${p.name} 24시간 추세, 현재 ${p.value}${p.unit}`}>
          <rect className="band" x={Lp} width={W - Lp - R} y={y(p.normal[1])} height={y(p.normal[0]) - y(p.normal[1])} />
          <line className="al" x1={Lp} x2={W - R} y1={y(hiAl)} y2={y(hiAl)} />
          <text className="ax" x={W - R} y={y(hiAl) - 4} textAnchor="end">경보 {hiAl}{p.unit}</text>
          {loAl !== null && <line className="al" x1={Lp} x2={W - R} y1={y(loAl)} y2={y(loAl)} />}
          {[p.min, (p.min + p.max) / 2, p.max].map(v => <text key={v} className="ax" x={Lp - 5} y={y(v) + 4} textAnchor="end">{+v.toFixed(1)}</text>)}
          {['-24h', '-12h', '지금'].map((s, k) => <text key={s} className="ax" x={Lp + (k / 2) * (W - Lp - R)} y={H - 5} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}>{s}</text>)}
          <path className="line" d={d} />
        </svg>
      </div>
      <div className="lv-l4-info">
        <div className="k">센서</div>
        <dl>
          <div><dt>센서 ID</dt><dd><code>{id}</code></dd></div>
          <div><dt>측정 주기</dt><dd>2초마다</dd></div>
          <div><dt>통신</dt><dd>{COMM_LOST.has(eq) ? '일부 두절' : '정상'}</dd></div>
        </dl>
        <div className="k">이력</div>
        <ul>{hist.map(h => <li key={h}>{h}</li>)}</ul>
      </div>
    </div>
  )
}

/* ---------- 줌인 탐색기 ---------- */
function Explorer() {
  const [path, setPath] = useState<Path>({})
  const [moves, setMoves] = useState(0)
  const [last, setLast] = useState<{ via: 'alarm' | 'nav'; n: number } | null>(null)
  const [dir, setDir] = useState<'in' | 'out'>('in')
  const [origin, setOrigin] = useState('50% 50%')
  const stage = useRef<HTMLDivElement>(null)
  const lv = lvOf(path)
  const info = LEVELS[lv]

  const go: Go = (p, e) => {
    const nl = lvOf(p)
    setDir(nl >= lv ? 'in' : 'out')
    if (e && stage.current) {
      const a = stage.current.getBoundingClientRect(), b = e.currentTarget.getBoundingClientRect()
      setOrigin(`${b.left - a.left + b.width / 2}px ${b.top - a.top + b.height / 2}px`)
    } else setOrigin('50% 50%')
    setPath(p); setMoves(m => m + 1)
  }
  const fromAlarm = (id: string) => {
    const t = ALARM_TARGET[id]
    setDir('in'); setOrigin('50% 100%'); setPath(t); setMoves(m => m + 1)
    setLast({ via: 'alarm', n: lvOf(t) - 1 })
  }

  const crumbs: { label: string; p: Path }[] = [{ label: '누리시 전체', p: {} }]
  if (path.sub) crumbs.push({ label: subOf(path.sub).name, p: { sub: path.sub } })
  if (path.sub && path.eq) crumbs.push({ label: eqName(path.sub, path.eq), p: { sub: path.sub, eq: path.eq } })
  if (path.sub && path.eq && path.pt) crumbs.push({ label: pointsOf(path.sub, path.eq).find(x => x.key === path.pt)!.name, p: path })
  const key = JSON.stringify(path)

  return (
    <div className="lv-ex">
      <div className="lv-ex-ladder" role="group" aria-label="화면 레벨">
        {([1, 2, 3, 4] as Lv[]).map(l => {
          const can = l <= lv
          return (
            <button key={l} type="button" className={'lv-step' + (l === lv ? ' on' : '') + (can ? '' : ' off')} disabled={!can} aria-current={l === lv ? 'step' : undefined}
              onClick={() => can && l !== lv && go(crumbs[l - 1].p)}>
              <small>레벨 {l}</small><b>{LEVELS[l].name}</b><span>{LEVELS[l].scope}</span>
            </button>
          )
        })}
      </div>

      <div className="lv-ex-main">
        <Hmi title={
          <nav className="lv-crumb" aria-label="빵부스러기">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <i aria-hidden="true">›</i>}
                {i < crumbs.length - 1 ? <button type="button" onClick={() => go(c.p)}>{c.label}</button> : <b aria-current="page">{c.label}</b>}
              </span>
            ))}
          </nav>
        } right={<span className="lv-lvtag">레벨 {lv}</span>} className="lv-hmi">
          <div className="lv-stage" ref={stage}>
            {lv > 1 && (
              <div className="lv-mini" aria-label="현재 위치 (전체 중)">
                {SUBSTATIONS.map(s => (
                  <button key={s.id} type="button" className={s.id === path.sub ? 'on' : ''} onClick={() => go({ sub: s.id })} aria-label={s.name + '로 이동'}>
                    {s.name.slice(0, 2)}{topPri({ sub: s.id }) && <i className={'p' + topPri({ sub: s.id })} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
            <div key={key} className={'lv-view z' + dir} style={{ transformOrigin: origin }}>
              {lv === 1 && <L1View go={go} />}
              {lv === 2 && <L2View sub={path.sub!} go={go} />}
              {lv === 3 && <L3View sub={path.sub!} eq={path.eq!} go={go} />}
              {lv === 4 && <L4View sub={path.sub!} eq={path.eq!} pt={path.pt!} />}
            </div>
          </div>
          <div className="lv-alarms" aria-label="알람 목록 — 누르면 그 설비 화면으로">
            <div className="lv-alarms-h"><b>알람 {ALARMS.length}</b><span>누르면 그 설비 화면으로 바로 가요</span></div>
            <ul>
              {ALARMS.map(a => {
                const here = JSON.stringify(ALARM_TARGET[a.id]) === key
                return (
                  <li key={a.id}>
                    <button type="button" className={here ? 'here' : ''} onClick={() => fromAlarm(a.id)}>
                      <PriBadge p={a.pri} /><b>{a.where}</b><span>{a.what}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </Hmi>

        <aside className="lv-ex-side" aria-live="polite">
          <div className="lv-side-h"><small>레벨 {lv}</small><b>{info.name}</b></div>
          <div className="lv-side-where">{info.where}</div>
          <div className="lv-side-k">여기서 하는 일</div>
          <ul className="do">{info.doo.map(s => <li key={s}>{s}</li>)}</ul>
          <div className="lv-side-k">여기서 하지 않는 일</div>
          <ul className="dont">{info.dont.map(s => <li key={s}>{s}</li>)}</ul>
          <div className="lv-side-moves">
            <span>지금까지 이동 <b>{moves}</b>번</span>
            {last?.via === 'alarm' && <span>알람 한 번 눌러 레벨 {lv}까지 왔어요. 단계를 하나씩 눌러 오면 {last.n}번 걸려요.</span>}
            {moves > 0 && <button type="button" className="btn sm ghost" onClick={() => { setPath({}); setMoves(0); setLast(null); setDir('out') }}>처음으로</button>}
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ================= 이동 비교: 메뉴 트리 vs 알람 점프 ================= */
const MENU: { opts: string[]; ok: string }[] = [
  { opts: ['운영 현황', '설비 관리', '보고서', '설정'], ok: '설비 관리' },
  { opts: ['발전 설비', '배전 설비', '통신 설비', '건물 설비'], ok: '배전 설비' },
  { opts: ['변전소', '선로 구간', '개폐기', '계량기'], ok: '변전소' },
  { opts: ['북부 변전소', '강변 변전소', '산업단지 변전소'], ok: '산업단지 변전소' },
  { opts: ['주변압기', '배전선로', '보호 계전기', '축전지'], ok: '배전선로' },
  { opts: ['산단 1선', '산단 2선', '산단 3선'], ok: '산단 1선' },
]
interface Run { clicks: number; ms: number }

function useRun() {
  const [clicks, setClicks] = useState(0)
  const [start, setStart] = useState<number | null>(null)
  const [done, setDone] = useState<Run | null>(null)
  return {
    clicks, done,
    click(finish: boolean) {
      const t0 = start ?? performance.now()
      if (start === null) setStart(t0)
      const c = clicks + 1
      setClicks(c)
      if (finish) setDone({ clicks: c, ms: performance.now() - t0 })
    },
    reset() { setClicks(0); setStart(null); setDone(null) },
  }
}
const sec = (r: Run) => (r.ms / 1000).toFixed(1) + '초'

function NavRace() {
  const menu = useRun(), jump = useRun()
  const [depth, setDepth] = useState(0)
  const [miss, setMiss] = useState('')
  const a = ALARMS[0]
  return (
    <div className="lv-race">
      <div className="lv-race-task"><span className="muted">할 일</span> <b>산단 1선 차단기 상태 화면을 여세요.</b></div>
      <div className="lv-race-grid">
        <div className="lv-race-col">
          <div className="lv-race-h"><b>메뉴 6단계 따라가기</b><span className="muted">클릭 {menu.clicks}</span></div>
          <div className="lv-menu">
            <div className="lv-menu-path" aria-label="지금까지 고른 메뉴">{depth === 0 ? <span className="muted">메뉴</span> : MENU.slice(0, depth).map(m => m.ok).join(' › ')}</div>
            {!menu.done ? (
              <ul aria-label={`메뉴 ${depth + 1}단계`}>
                {MENU[depth].opts.map(o => (
                  <li key={o}><button type="button" onClick={() => {
                    const ok = o === MENU[depth].ok
                    const fin = ok && depth === MENU.length - 1
                    menu.click(fin)
                    if (ok) { setDepth(d => Math.min(MENU.length - 1, d + 1)); setMiss('') } else setMiss(o)
                  }}>{o}<i aria-hidden="true">›</i></button></li>
                ))}
              </ul>
            ) : <div className="lv-race-ok">산단 1선 화면 도착</div>}
            <div className="lv-menu-miss" aria-live="polite">{miss && !menu.done ? `'${miss}'에는 없어요` : ''}</div>
          </div>
          {menu.done && <div className="lv-race-res"><b>{menu.done.clicks}번</b> 클릭 · {sec(menu.done)}</div>}
        </div>
        <div className="lv-race-col">
          <div className="lv-race-h"><b>알람에서 바로</b><span className="muted">클릭 {jump.clicks}</span></div>
          <div className="lv-jump">
            {!jump.done ? (
              <button type="button" className="lv-jump-a" onClick={() => jump.click(true)}>
                <PriBadge p={a.pri} /><b>{a.where}</b><span>{a.what}</span>
              </button>
            ) : <div className="lv-race-ok">산단 1선 화면 도착</div>}
            <p className="muted">알람 목록의 한 줄을 누르면 그 설비 화면으로 바로 가요.</p>
          </div>
          {jump.done && <div className="lv-race-res"><b>{jump.done.clicks}번</b> 클릭 · {sec(jump.done)}</div>}
        </div>
      </div>
      {(menu.done || jump.done) && (
        <div className="lv-row">
          <span className="muted">{menu.done && jump.done ? `메뉴로는 ${menu.done.clicks}번, 알람으로는 ${jump.done.clicks}번이에요. 사고가 나서 급할 때는 이 차이가 몇 분으로 벌어져요.` : '나머지 쪽도 해 보세요.'}</span>
          <button type="button" className="btn sm ghost" onClick={() => { menu.reset(); jump.reset(); setDepth(0); setMiss('') }}>다시 하기</button>
        </div>
      )}
    </div>
  )
}

/* ================= Shneiderman 만트라 ================= */
const MANTRA: { k: string; d: string; lv: Lv[] }[] = [
  { k: '전체 먼저', d: '전체를 먼저 보여 줘요. 어디를 볼지는 그다음에 정해요.', lv: [1] },
  { k: '좁혀 들어가기', d: '관심 있는 구역과 설비로 좁혀 들어가요(확대 · 필터).', lv: [2, 3] },
  { k: '자세한 건 누를 때', d: '센서 하나의 지난 기록은 사용자가 누를 때만 열어요.', lv: [4] },
]
function Mantra() {
  const [i, setI] = useState(0)
  return (
    <div className="lv-mantra">
      <ol className="lv-mantra-steps">
        {MANTRA.map((m, k) => (
          <li key={m.k}><button type="button" className={k === i ? 'on' : ''} aria-pressed={k === i} onClick={() => setI(k)}><small>{k + 1}</small><b>{m.k}</b></button></li>
        ))}
      </ol>
      <p className="lv-mantra-d">{MANTRA[i].d}</p>
      <div className="lv-mantra-stack" aria-label="이어지는 레벨">
        {([1, 2, 3, 4] as Lv[]).map(l => (
          <div key={l} className={MANTRA[i].lv.includes(l) ? 'on' : ''} style={{ width: 100 - (l - 1) * 16 + '%' }}>
            <small>레벨 {l}</small> {LEVELS[l].name}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================= 벽면 · 개인 화면 배치 ================= */
function Screens() {
  return (
    <div className="lv-scr" role="img" aria-label="벽면 화면에는 레벨 1, 운영자 콘솔의 모니터에는 레벨 2, 레벨 3과 4, 알람 목록">
      <div className="lv-scr-wall"><small>벽면 화면 · 모두가 같이</small><b>레벨 1 전체 개요</b></div>
      <div className="lv-scr-desk">
        <div><small>모니터 1</small><b>알람 목록</b></div>
        <div className="main"><small>모니터 2</small><b>레벨 2 구역 운전</b></div>
        <div><small>모니터 3</small><b>레벨 3 · 4</b></div>
      </div>
      <div className="lv-scr-cap">운영자 책상(콘솔) · 혼자 봄</div>
    </div>
  )
}

/* ================= 나쁜 예: 모든 걸 한 화면에 ================= */
function AllInOne() {
  const [mode, setMode] = useState<'all' | 'l1'>('all')
  const cells = useMemo(() => SUBSTATIONS.flatMap(s => s.feeders.map(f0 => {
    const f = feeder(f0.id)!
    return { s: s.name.replace(' 변전소', ''), f, vals: [f.load + '%', f.kv + 'kV', f.temp + '℃', (f.load * 4.1).toFixed(0) + 'A', (f.load * 0.093).toFixed(2) + 'MW', '0.9' + (f.load % 7), TRIPPED.has(f.id) ? '끊김' : '연결', (f.load % 4) + 1 + '회'] }
  })), [])
  const numCount = cells.length * 8 + 9
  return (
    <div className="lv-bad">
      <div className="lv-row">
        <Seg value={mode} onChange={setMode} options={[['all', '모든 걸 한 화면에'], ['l1', '레벨 1로 나눔']]} />
        <span className="muted">화면 안의 값 <b>{mode === 'all' ? numCount : 3}</b>개</span>
      </div>
      <Hmi title={mode === 'all' ? '종합 현황 (전체 설비)' : '누리시 전체 개요'} right="14:42">
        {mode === 'all' ? (
          <div className="lv-bad-wrap">
            <table className="lv-bad-t">
              <thead><tr><th>변전소</th><th>선로</th><th>부하</th><th>전압</th><th>유온</th><th>전류</th><th>유효전력</th><th>역률</th><th>차단기</th><th>재폐로</th></tr></thead>
              <tbody>{cells.map(c => <tr key={c.f.id}><td>{c.s}</td><td>{c.f.name}</td>{c.vals.map((v, k) => <td key={k}>{v}</td>)}</tr>)}</tbody>
            </table>
            <div className="lv-bad-tr">주변압기 유온 N 61 · R 72 · I 91 | 권선 N 73 · R 84 · I 103 | 탭 9 · 9 · 10 | 팬 운전·정지·운전 | 축전지 125.1V · 124.8V · 125.3V</div>
          </div>
        ) : <L1View />}
      </Hmi>
      <p className="muted lv-bad-q">{mode === 'all' ? '산단 1선이 트립됐어요. 산업단지 주변압기 기름 온도(유온)도 경보를 넘었어요. 찾으셨나요? 숫자 사이에 섞여 있어요.' : '같은 상황이에요. 어느 변전소를 봐야 하는지 바로 보여요. 숫자는 레벨 2부터 읽어요.'}</p>
    </div>
  )
}

/* ================= 탭 ================= */
const TABLE: Lv[] = [1, 2, 3, 4]
export default function Tab() {
  return (
    <div data-dash="levels">
      <TermList keys={['위계', '빵부스러기', '드릴다운', '시각적 연속성', 'HMI', '운영자', '차단기', '트립', '자동 재폐로', '개폐기', '주변압기', '유온', '부하율', '절체']} extra={X} />
      <SysGrid>
        <Section id="dash-levels-why" wide title="한 화면에 다 넣지 않고, 4단계로 나눠요"
          gist="넓게 보는 화면과 깊게 보는 화면을 나눠요. 그래야 화면마다 할 일이 분명해져요."
          desc={<>지도 앱을 떠올려 보세요. 처음엔 도시 전체가 보이고, 확대하면 동네, 더 확대하면 건물 하나가 보여요. 관제 화면도 이렇게 단계(<Term k="위계" d={X['위계']} />)를 나눠요. 고성능 <Term k="HMI" /> 표준인 ISA-101이 이렇게 하라고 해요<Cite n={1} />. 단계를 나누면 화면마다 질문 하나에만 답하면 돼요.</>}>
          <div className="lv-why">
            <Finding src={<>ANSI/ISA-101.01-2015 · ISA 블로그 해설 — 한국어 요약</>}>
              레벨 1은 맡은 범위 전체가 괜찮은지 보여 주는 개요예요. 여기서는 조작하지 않아요. <Term k="운영자" />는 근무 시간 대부분을 레벨 2에서 보내요. 레벨 3·4는 설비 하나나 그 부품을 자세히 살펴볼 때 열어요.
            </Finding>
            <ol className="lv-pyr" aria-label="4단계 화면 위계">
              {TABLE.map(l => <li key={l} style={{ width: 52 + (l - 1) * 16 + '%' }}><small>레벨 {l}</small><b>{LEVELS[l].name}</b><span>{LEVELS[l].scope}</span></li>)}
            </ol>
          </div>
        </Section>

        <Section id="dash-levels-zoom" wide title="눌러서 들어가 보기 — 누리시 전체에서 센서 하나까지"
          gist="알람 줄과 작은 지도가 늘 같은 자리에 있어서, 어디까지 들어가도 길을 잃지 않아요."
          desc={<>변전소를 누르면 레벨 2로 들어가요(<Term k="드릴다운" />). 그 안에서 설비를 누르면 레벨 3, 측정값을 누르면 레벨 4예요. 아래 알람 줄을 누르면 그 화면으로 한 번에 가요. 돌아올 때는 위쪽 경로 줄(<Term k="빵부스러기" d={X['빵부스러기']} />)이나 왼쪽 위 작은 지도를 눌러요.</>}>
          <Explorer />
          <Note>이 예시는 알람 6개가 한꺼번에 떠 있는 바쁜 순간이에요. 수치는 모두 가상이에요. 어느 레벨에 있든 <b>알람 줄은 같은 자리</b>에 있어요. 왼쪽 위 작은 지도는 "지금 전체 중 어디인지"를 알려 줘요. Woods는 이렇게 길을 잃지 않게 하는 것을 <Term k="시각적 연속성" d={X['시각적 연속성']} />(visual momentum)이라고 불렀어요<Cite n={4} />.</Note>
        </Section>

        <Section id="dash-levels-table" wide title="레벨마다 정할 것 — 화면 목록 표"
          gist="레벨마다 '여기서 하는 일'과 '하지 않는 일'을 먼저 정해요."
          desc="화면 목록을 만들 때 이 표의 칸을 채워 보세요. 그러면 레벨마다 무엇을 넣고 뺄지가 정해져요.">
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th>레벨</th><th>범위</th><th>어디서 · 누가</th><th>여기서 하는 일</th><th>하지 않는 일</th></tr></thead>
              <tbody>{TABLE.map(l => (
                <tr key={l}>
                  <td><b>{l} {LEVELS[l].name}</b></td><td>{LEVELS[l].scope}</td><td>{LEVELS[l].where}</td>
                  <td>{LEVELS[l].doo.join(' · ')}</td><td>{LEVELS[l].dont.join(' · ')}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Section>

        <Section id="dash-levels-nav" wide title="원하는 화면까지 몇 번 눌러야 하나요"
          gist="알람을 누르면 한 번에 가야 해요. 메뉴를 뒤지면 사고 대응이 늦어져요."
          desc="같은 화면을 두 가지 방법으로 열어 보세요. 누른 횟수와 걸린 시간을 재 드려요.">
          <NavRace />
          <div className="lv-rules">
            <div><b>몇 번 안에 닿기</b><p>어떤 화면이든 몇 번만 눌러 닿게 해요. 현장에서는 "세 번 이내"를 목표로 자주 말해요<Cite n={6} />. 표준이 정한 숫자가 아니라 경험에서 나온 기준이에요.</p></div>
            <div><b><Term k="빵부스러기" d={X['빵부스러기']} /></b><p>지금 전체 중 어디에 있는지 늘 보여 줘요. 누르면 위 단계로 한 번에 돌아가요.</p></div>
            <div><b>알람에서 바로</b><p>알람 한 줄이 곧 그 설비 화면으로 가는 링크예요. 사고 대응 중에 메뉴를 뒤지지 않게요.</p></div>
            <div><b>화면이 바뀌어도 길 잃지 않기</b><p>화면이 바뀌어도 알람 줄, 작은 지도, 시각은 같은 자리에 둬요. 누른 곳에서 확대되듯 열리면 "어디서 왔는지"를 기억하기 쉬워요<Cite n={4} />.</p></div>
          </div>
        </Section>

        <Section id="dash-levels-mantra" title="전체를 먼저, 그다음 좁혀서, 자세한 건 누를 때"
          gist="처음엔 전체만 보여 줘요. 자세한 내용은 사용자가 원할 때 열어요."
          desc={<>Shneiderman이 정리한 정보 탐색 순서예요<Cite n={3} />. 흔히 정보 탐색 <Term k="만트라" d={X['만트라']} />라고 불러요. 단계를 누르면 어느 레벨에 해당하는지 보여요.</>}>
          <Mantra />
        </Section>

        <Section id="dash-levels-screens" title="벽면엔 레벨 1, 개인 화면엔 레벨 2~4"
          gist="벽면은 모두가 같이 보는 화면이라 바꾸지 않아요. 깊이 볼 땐 내 모니터에서 봐요."
          desc="벽면 화면은 모두가 같이 보는 화면이라 레벨 1만 올려요. 자세히 들어가 보는 화면은 각자 모니터에서 열어요.">
          <Screens />
          <Note>누군가 벽면 화면을 레벨 3으로 바꿔 버리면, 다른 사람들은 전체 상황을 볼 수 없게 돼요. 얼마나 떨어져서 보는지, 글자는 얼마나 커야 하는지는 <a href="#/dash/room">07 관제실 환경</a>에서 계산해 봐요.</Note>
        </Section>

        <Section id="dash-levels-bad" wide title="나쁜 예: 모든 걸 한 화면에"
          gist="숫자를 전부 보여 주면, 정작 중요한 이상이 숫자 사이에 묻혀요."
          desc="단계 없이 '종합 현황' 한 장에 모든 값을 넣으면 이렇게 돼요. 같은 상황을 레벨 1로 바꿔 보세요.">
          <AllInOne />
          <Note tone="warn"><b>반대쪽 실수도 있어요.</b> 메뉴를 6단계로 깊게 만들면, 화면 하나하나는 깔끔해도 원하는 화면까지 오래 걸려요. 위의 '몇 번 눌러야 하나요'에서 직접 느껴 보셨을 거예요. 그래서 단계는 4개로 두고, 알람·빵부스러기 같은 지름길을 함께 둬요.</Note>
        </Section>

        <Refs items={[
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015 Human Machine Interfaces for Process Automation Systems — 화면 위계 4단계', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'standard', text: 'ISA Interchange, Modern DCS Graphics: Level 1 Overview Displays (ISA-101 해설)', url: 'https://blog.isa.org/modern-dcs-graphics-level-1-overview-displays' },
          { kind: 'paper', text: 'Shneiderman, B. (1996). The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations. IEEE Symposium on Visual Languages.' },
          { kind: 'paper', text: 'Woods, D. D. (1984). Visual momentum: a concept to improve the cognitive coupling of person and computer. International Journal of Man-Machine Studies.' },
          { kind: 'book', text: 'Hollifield, B., Oliver, D., Nimmo, I., Habibi, E. The High Performance HMI Handbook (PAS, 2008).' },
          { kind: 'practice', text: '"어떤 화면이든 세 번 이내"는 현장과 업체 자료에서 자주 쓰는 경험칙이에요. 표준이 정한 숫자로 옮기지 마세요.' },
        ]} />
      </SysGrid>
    </div>
  )
}
