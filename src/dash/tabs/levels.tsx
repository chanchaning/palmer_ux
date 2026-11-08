import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Seg } from '../../components/ui'
import { Note, Section, SysGrid } from '../../system/ui'
import { ALARMS, RANGES, SUBSTATIONS, series, type Pri } from '../data'
import { AnalogBar, Cite, Finding, Hmi, PriBadge, Refs, Sparkline } from '../ui'
import './levels.css'

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
      { key: 'temp', name: '절연유 온도(유온)', value: oil, unit: '℃', min: T.min, max: T.max, normal: T.normal, alarm: T.alarm },
      { key: 'wind', name: '권선 온도', value: oil + 12, unit: '℃', min: T.min, max: 130, normal: [30, 95], alarm: [0, 110] },
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
  1: { name: '전체 개요', scope: '담당 범위 전체', where: '벽면 대형 화면 · 상시', doo: ['담당 범위 전체가 괜찮은지 몇 초 안에 확인', '이상이 어디쯤 있는지 위치만 파악'], dont: ['조작(차단기 열고 닫기)', '세부 수치 읽기 — 숫자는 최소로'] },
  2: { name: '구역 운전', scope: '변전소 하나 · 선로 몇 개', where: '운영자 주 모니터', doo: ['대부분의 근무 시간을 여기서 보내요', '선로 운전값 감시, 일상 조작(부하 절체 등)'], dont: ['센서 하나하나의 진단', '다른 구역을 잊어버리기 — 알람 줄은 계속 보여요'] },
  3: { name: '설비 상세', scope: '설비 하나 · 제어 계통 하나', where: '운영자 보조 모니터', doo: ['한 설비의 상태를 모아 보고 원인을 좁혀요', '그 설비의 조작과 확인'], dont: ['오래 머물며 감시하기 — 볼 일을 마치면 레벨 2로'] },
  4: { name: '진단 · 보조', scope: '센서 · 부품 하나', where: '보조 모니터 · 정비 담당', doo: ['센서별 추세와 이력, 교정 상태 확인', '정비 요청과 사후 분석'], dont: ['상시 감시 — 운전 중 띄워 두는 화면이 아니에요'] },
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
              <span className="cb">차단기 <b>{trip ? '개방(트립)' : '투입'}</b></span>
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
    ? [['냉각팬 1', '운전'], ['냉각팬 2', TR_TEMP[sub] > 85 ? '운전' : '정지 (대기)'], ['탭 위치', '9 / 17']]
    : [['차단기', trip ? <b key="t">개방 — 트립 14:27</b> : '투입'], ['자동 재폐로', trip ? '실패 (1회 시도)' : '대기'], ...(['11', '12', '13'].map(n => [`개폐기 R/C-${n}`, COMM_LOST.has(eq) && n === '12' ? <b key="c">통신 두절</b> : '정상'] as [string, ReactNode]))]
  return (
    <div className="lv-l3">
      <div className="lv-l3-pts">
        <div className="k">측정값 — 눌러서 진단</div>
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
    '10월 14일  센서 교정 (정비팀)',
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
          <div><dt>측정 주기</dt><dd>2초</dd></div>
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
          <div className="lv-alarms" aria-label="알람 목록 — 눌러서 해당 화면으로">
            <div className="lv-alarms-h"><b>알람 {ALARMS.length}</b><span>눌러서 해당 화면으로 바로 가요</span></div>
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
            {last?.via === 'alarm' && <span>알람 한 번으로 레벨 {lv}까지 왔어요. 위계를 따라오면 {last.n}번이에요.</span>}
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
          <div className="lv-race-h"><b>메뉴 트리 6단계</b><span className="muted">클릭 {menu.clicks}</span></div>
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
            <p className="muted">알람 줄의 한 행이 곧 그 설비 화면으로 가는 링크예요.</p>
          </div>
          {jump.done && <div className="lv-race-res"><b>{jump.done.clicks}번</b> 클릭 · {sec(jump.done)}</div>}
        </div>
      </div>
      {(menu.done || jump.done) && (
        <div className="lv-row">
          <span className="muted">{menu.done && jump.done ? `메뉴로는 ${menu.done.clicks}번, 알람으로는 ${jump.done.clicks}번이에요. 사고 대응 중에는 이 차이가 몇 분이 돼요.` : '나머지 쪽도 해 보세요.'}</span>
          <button type="button" className="btn sm ghost" onClick={() => { menu.reset(); jump.reset(); setDepth(0); setMiss('') }}>다시 하기</button>
        </div>
      )}
    </div>
  )
}

/* ================= Shneiderman 만트라 ================= */
const MANTRA: { k: string; d: string; lv: Lv[] }[] = [
  { k: '개요 먼저', d: '전체를 먼저 보여 줘요. 어디를 볼지는 그다음이에요.', lv: [1] },
  { k: '확대 · 필터', d: '관심 있는 구역과 설비로 좁혀 들어가요.', lv: [2, 3] },
  { k: '세부는 요청할 때', d: '센서 하나의 이력은 누를 때만 열어요.', lv: [4] },
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
      <div className="lv-scr-cap">운영자 콘솔 · 혼자</div>
    </div>
  )
}

/* ================= 나쁜 예: 모든 걸 한 화면에 ================= */
function AllInOne() {
  const [mode, setMode] = useState<'all' | 'l1'>('all')
  const cells = useMemo(() => SUBSTATIONS.flatMap(s => s.feeders.map(f0 => {
    const f = feeder(f0.id)!
    return { s: s.name.replace(' 변전소', ''), f, vals: [f.load + '%', f.kv + 'kV', f.temp + '℃', (f.load * 4.1).toFixed(0) + 'A', (f.load * 0.093).toFixed(2) + 'MW', '0.9' + (f.load % 7), TRIPPED.has(f.id) ? '개방' : '투입', (f.load % 4) + 1 + '회'] }
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
      <p className="muted lv-bad-q">{mode === 'all' ? '산단 1선이 트립됐고 산업단지 주변압기 유온이 경보를 넘었어요. 찾으셨나요? 숫자 사이에 섞여 있어요.' : '같은 상황이에요. 어느 변전소를 봐야 하는지 바로 보여요. 숫자는 레벨 2부터 읽어요.'}</p>
    </div>
  )
}

/* ================= 탭 ================= */
const TABLE: Lv[] = [1, 2, 3, 4]
export default function Tab() {
  return (
    <div data-dash="levels">
      <SysGrid>
        <Section id="dash-levels-why" wide title="한 화면에 다 넣지 않고, 4단계로 나눠요"
          desc={<>고성능 HMI 표준 ISA-101은 관제 화면을 위계로 나누라고 해요<Cite n={1} />. 넓게 보는 화면과 깊게 보는 화면을 나누면, 각 화면은 자기 질문 하나에만 답하면 돼요.</>}>
          <div className="lv-why">
            <Finding src={<>ANSI/ISA-101.01-2015 · ISA 블로그 해설 — 한국어 요약</>}>
              레벨 1은 담당 범위 전체의 건강 상태를 보여주는 개요예요. 여기서는 조작하지 않아요. 운영자는 대부분의 시간을 레벨 2에서 보내고, 레벨 3·4는 설비 하나와 그 부품을 진단할 때 열어요.
            </Finding>
            <ol className="lv-pyr" aria-label="4단계 화면 위계">
              {TABLE.map(l => <li key={l} style={{ width: 52 + (l - 1) * 16 + '%' }}><small>레벨 {l}</small><b>{LEVELS[l].name}</b><span>{LEVELS[l].scope}</span></li>)}
            </ol>
          </div>
        </Section>

        <Section id="dash-levels-zoom" wide title="눌러서 들어가 보기 — 누리시 전체에서 센서 하나까지"
          desc="변전소를 누르면 레벨 2, 설비를 누르면 레벨 3, 측정값을 누르면 레벨 4예요. 아래 알람 줄을 누르면 해당 화면으로 바로 가요. 위쪽 빵부스러기나 왼쪽 위 작은 지도로 언제든 돌아올 수 있어요.">
          <Explorer />
          <Note>이 예시는 알람 6개가 한꺼번에 떠 있는 바쁜 순간이에요. 수치는 모두 가상이에요. 어느 레벨에 있든 <b>알람 줄은 같은 자리</b>에 있고, 왼쪽 위 작은 지도가 "지금 전체 중 어디"를 알려줘요. 이게 Woods가 말한 시각적 연속성(visual momentum)이에요<Cite n={4} />.</Note>
        </Section>

        <Section id="dash-levels-table" wide title="레벨별로 정할 것" desc="화면 목록을 만들 때 이 표의 칸을 채우면, 레벨마다 무엇을 넣고 뺄지가 정해져요.">
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

        <Section id="dash-levels-nav" wide title="이동 규칙 — 몇 번 만에 닿나요"
          desc="같은 화면을 두 가지 방법으로 열어 보세요. 클릭 수와 걸린 시간을 재요.">
          <NavRace />
          <div className="lv-rules">
            <div><b>몇 번 안에 도달</b><p>어떤 화면이든 몇 번 안 눌러 닿게 해요. 현장에서는 "세 번 이내"를 목표로 자주 말해요<Cite n={6} />. 표준의 숫자가 아니라 경험칙이에요.</p></div>
            <div><b>빵부스러기</b><p>지금 위계의 어디에 있는지, 한 번에 위로 돌아가는 길을 늘 보여 줘요.</p></div>
            <div><b>알람에서 바로</b><p>알람 한 행이 해당 설비 화면으로 가는 링크예요. 사고 대응 중 메뉴를 뒤지지 않게요.</p></div>
            <div><b>전환해도 맥락 유지</b><p>화면이 바뀌어도 알람 줄·작은 지도·시각은 같은 자리에. 들어간 곳에서 확대되듯 열리면 "어디서 왔는지"가 남아요<Cite n={4} />.</p></div>
          </div>
        </Section>

        <Section id="dash-levels-mantra" title="개요 먼저, 확대와 필터, 세부는 요청할 때"
          desc={<>Shneiderman의 정보 탐색 만트라예요<Cite n={3} />. 단계를 누르면 이어지는 레벨이 보여요.</>}>
          <Mantra />
        </Section>

        <Section id="dash-levels-screens" title="벽면엔 레벨 1, 개인 화면엔 레벨 2~4"
          desc="벽면 화면은 모두가 같이 보는 공유 화면이라 레벨 1만 올려요. 들어가서 보는 화면은 각자의 모니터에서 열어요.">
          <Screens />
          <Note>벽면 화면을 누군가 레벨 3으로 바꿔 버리면, 나머지 사람은 전체 개요를 잃어요. 시청 거리와 글자 크기는 <a href="#/dash/room">07 관제실 환경</a>에서 계산해 봐요.</Note>
        </Section>

        <Section id="dash-levels-bad" wide title="나쁜 예: 모든 걸 한 화면에"
          desc="위계 없이 '종합 현황' 한 장에 모든 값을 넣으면 이렇게 돼요. 같은 상황을 레벨 1로 바꿔 보세요.">
          <AllInOne />
          <Note tone="warn"><b>반대쪽 실수도 있어요.</b> 메뉴 트리를 6단계로 깊게 만들면 화면 하나하나는 깔끔해도 닿기까지 오래 걸려요. 위의 '몇 번 만에 닿나요'에서 직접 느껴 보셨을 거예요. 위계는 4단계, 그리고 알람·빵부스러기 같은 지름길을 함께 둬요.</Note>
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
