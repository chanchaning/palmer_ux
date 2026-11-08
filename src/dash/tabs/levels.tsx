import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Term, TermList } from '../../components/Term'
import { Note, Section, SysGrid } from '../../system/ui'
import { SAFE_ALARMS, SAFE_CENTER, SAFE_RANGES, SAFE_SITES, series, type Pri } from '../data'
import { AnalogBar, CaseCard, Cite, Finding, Hmi, PriBadge, Refs, Sparkline, useVisibleInterval } from '../ui'
import './levels.css'

/** 사전(glossary.ts)에 없는 이 탭 전용 용어 */
const X: Record<string, string> = {
  '위계': '큰 것에서 작은 것으로 내려가는 단계 구조예요. 회사 조직도처럼 전체 → 부서 → 팀 → 사람 순서로 좁혀 가요.',
  '빵부스러기': '‘전체 현장 › 제2공장 › 도장 부스’처럼 지금 화면까지 온 길을 보여 주는 줄이에요. 동화에서 길에 떨어뜨린 빵부스러기에서 온 이름이에요. 누르면 위 단계로 바로 돌아가요.',
  '시각적 연속성': '화면이 바뀌어도 “어디서 왔고 지금 어디인지”를 잃지 않게 하는 것이에요. 지도 앱에서 확대해도 주변이 이어져 보여서 길을 잃지 않는 것과 같아요.',
  '만트라': '주문처럼 외워 두고 늘 되새기는 짧은 원칙이에요.',
  '%LEL': '가연성 가스가 폭발할 수 있는 가장 낮은 농도를 100으로 볼 때, 지금 농도가 얼마인지예요. 10%LEL이면 폭발 농도의 10분의 1이에요.',
  'ppm': '백만분의 1을 뜻하는 단위예요. 일산화탄소 50ppm은 공기 100만 중 50이 일산화탄소라는 뜻이에요.',
  '위치 태그': '작업자가 몸에 다는 작은 장치예요. 지금 어느 구역에 있는지를 시스템에 알려 줘요.',
  'CCTV 자동 순환': '카메라 여러 대의 영상을 몇 초씩 차례로 돌려 보여 주는 기능이에요. 화면 수보다 카메라가 많을 때 써요.',
  '교정': '센서 눈금을 기준 가스나 기준 값에 맞춰 바로잡는 일이에요. 기한이 지나면 값이 실제와 달라질 수 있어요.',
  '감시인': '밀폐공간처럼 위험한 곳에서 일할 때 바깥에서 작업자를 지켜보는 사람이에요. 이상이 생기면 바로 구조를 요청해요.',
}

/* ================= 예시 상황: 알람 6개가 동시에 떠 있는 순간 =================
 * data.ts 의 SAFE_* 를 쓰고, 센서 값은 알람과 맞게 이 탭에서 정해요(가상). */
type Lv = 1 | 2 | 3 | 4
type PKey = 'lel' | 'co' | 'temp' | 'vib' | 'btemp'
interface Point { key: PKey; name: string; value: number; unit: string; min: number; max: number; normal: [number, number]; alarm: [number, number] }
interface Path { site?: string; zone?: string; pt?: PKey }

/** 도장 부스 실내 온도 — 이 탭에서만 쓰는 가상 범위 */
const BOOTH_T = { unit: '℃', min: 0, max: 80, normal: [15, 35] as [number, number], alarm: [0, 50] as [number, number], name: '부스 온도' }
const VALUES: Record<string, Partial<Record<PKey, number>>> = {
  F1: { vib: 5.1, temp: 64 }, F2: { lel: 4, btemp: 58 }, F3: { lel: 12, co: 6 }, W3: { co: 18 }, C3: { co: 9 },
}
const SHORT: Record<string, string> = { F: '공장', W: '물류', C: '신축' }

const siteOf = (id: string) => SAFE_SITES.find(s => s.id === id)!
const zoneOf = (id: string) => SAFE_SITES.flatMap(s => s.zones).find(z => z.id === id)!

const pointsOf = (zone: string): Point[] => {
  const z = zoneOf(zone)
  const out: Point[] = []
  for (const s of z.sensors) {
    const key: PKey | null = s === '가연성 가스' ? 'lel' : s === '일산화탄소' ? 'co' : s === '진동' ? 'vib' : s === '온도' ? (zone === 'F2' ? 'btemp' : 'temp') : null
    if (!key) continue
    const r = key === 'btemp' ? BOOTH_T : SAFE_RANGES[key]
    out.push({ key, name: r.name, value: VALUES[zone]?.[key] ?? r.normal[0] + (r.normal[1] - r.normal[0]) * 0.3, unit: r.unit, min: r.min, max: r.max, normal: r.normal, alarm: r.alarm })
  }
  return out
}
const outOf = (p: Point) => p.value < p.normal[0] || p.value > p.normal[1]
const badOf = (p: Point) => p.value < p.alarm[0] || p.value > p.alarm[1]
const fmt = (p: Point) => +p.value.toFixed(1) + p.unit

/** 알람 → 바로 갈 화면 */
const ALARM_TARGET: Record<string, Path> = {
  'S-101': { site: 'F', zone: 'F2' },
  'S-102': { site: 'C', zone: 'C3' },
  'S-103': { site: 'F', zone: 'F3', pt: 'lel' },
  'S-104': { site: 'C', zone: 'C1' },
  'S-105': { site: 'W', zone: 'W3' },
  'S-106': { site: 'F', zone: 'F1', pt: 'vib' },
}
const alarmsAt = (p: Path) => SAFE_ALARMS.filter(a => {
  const t = ALARM_TARGET[a.id]
  if (p.site && t.site !== p.site) return false
  if (p.zone && t.zone !== p.zone) return false
  return true
})
const topPri = (p: Path): Pri | null => {
  const a = alarmsAt(p)
  return a.length ? (Math.min(...a.map(x => x.pri)) as Pri) : null
}
const lvOf = (p: Path): Lv => (p.pt ? 4 : p.zone ? 3 : p.site ? 2 : 1)

const LEVELS: Record<Lv, { name: string; scope: string; where: string; doo: string[]; dont: string[] }> = {
  1: { name: '전체 개요', scope: '맡은 현장 전체', where: '상황실 벽면 대형 화면 · 늘 띄워 둠', doo: ['현장 3곳이 괜찮은지 몇 초 안에 확인', '이상이 어느 현장·구역에 있는지 위치만 파악'], dont: ['조치(대피 방송·설비 정지)', '자세한 숫자 읽기 — 숫자는 최소로'] },
  2: { name: '현장 화면', scope: '현장 하나 · 구역 몇 개', where: '근무자 정면 모니터', doo: ['근무 시간 대부분을 여기서 보내요', '구역별 센서 값과 인원 지켜보기, 일상 조치(구역 반장에게 알림 등)'], dont: ['센서 하나하나 진단하기', '다른 현장 잊어버리기 — 그래서 알람 줄은 늘 보여요'] },
  3: { name: '구역 상세', scope: '구역 하나와 그 센서·CCTV', where: '근무자 옆 모니터', doo: ['구역의 센서, CCTV, 인원을 모아 보고 원인을 좁혀요', '작업 중지·대피 방송 같은 조치를 하고 결과를 확인해요'], dont: ['오래 머물며 지켜보기 — 볼 일을 마치면 레벨 2로 돌아가요'] },
  4: { name: '진단 · 보조', scope: '센서 하나', where: '옆 모니터 · 설비·정비 담당', doo: ['센서 값의 흐름, 지난 기록, 교정(눈금 맞추기) 상태 확인', '정비 요청, 사고 뒤 원인 분석'], dont: ['계속 띄워 두고 지켜보기 — 그런 용도의 화면이 아니에요'] },
}

/* ---------- 레벨별 화면 ---------- */
type Go = (p: Path, e?: MouseEvent<HTMLElement>) => void

function L1View({ go }: { go?: Go }) {
  const Tag = go ? 'button' : 'div'
  return (
    <div className="lv-l1">
      {SAFE_SITES.map(s => {
        const pr = topPri({ site: s.id })
        const n = alarmsAt({ site: s.id }).length
        const people = s.zones.reduce((a, z) => a + z.workers, 0)
        return (
          <Tag key={s.id} type={go ? 'button' : undefined} className={'lv-l1-sub' + (pr ? ' alarm' : '')} onClick={go ? (e: MouseEvent<HTMLElement>) => go({ site: s.id }, e) : undefined}>
            <span className="h"><b>{s.name}</b>{pr && <PriBadge p={pr} />}</span>
            <span className="zones" aria-hidden="true">
              {s.zones.map(z => {
                const zp = topPri({ site: s.id, zone: z.id })
                return <i key={z.id} className={zp ? 'p' + zp : ''}>{z.name}</i>
              })}
            </span>
            <span className="s">{n ? `알람 ${n}건` : '정상'} · 인원 {people}명</span>
          </Tag>
        )
      })}
    </div>
  )
}

function L2View({ site, go }: { site: string; go: Go }) {
  const s = siteOf(site)
  return (
    <div className="lv-l2">
      {s.zones.map(z => {
        const pr = topPri({ site, zone: z.id })
        const pts = pointsOf(z.id)
        return (
          <button key={z.id} type="button" className={'lv-eq' + (pr ? ' alarm' : '')} onClick={e => go({ site, zone: z.id }, e)}>
            <span className="h"><b>{z.name}</b>{pr && <PriBadge p={pr} />}</span>
            <span className="cb">인원 <b>{z.workers}명</b> · CCTV 2대</span>
            {pts.length ? pts.map(p => (
              <span key={p.key} className="row"><span>{p.name}</span><AnalogBar value={p.value} min={p.min} max={p.max} normal={p.normal} alarm={p.alarm} unit={p.unit} name={z.name + ' ' + p.name} w={100} /><em>{fmt(p)}</em></span>
            )) : <span className="none">센서 없음 — CCTV와 위치 태그로 지켜봐요</span>}
          </button>
        )
      })}
    </div>
  )
}

function L3View({ site, zone, go }: { site: string; zone: string; go: Go }) {
  const z = zoneOf(zone)
  const pts = pointsOf(zone)
  const al = alarmsAt({ site, zone })[0]
  const status: [string, ReactNode][] = [
    ['인원 (위치 태그)', `${z.workers}명`],
    ['작업 상태', al?.type === 'fire' ? <b key="s">작업 중지 요청됨</b> : '작업 중'],
    ['출입', zone === 'C3' ? '허가받은 작업만 · 감시인 1명' : '일반'],
    ['마지막 순회 점검', '13:30'],
  ]
  return (
    <div className="lv-l3">
      <div className="lv-l3-pts">
        {pts.length > 0 && <div className="k">센서 — 누르면 레벨 4에서 자세히</div>}
        {pts.map((p, i) => (
          <button key={p.key} type="button" className={'lv-pt' + (badOf(p) || (outOf(p) && al) ? ' alarm' : '')} onClick={e => go({ site, zone, pt: p.key }, e)}>
            <span className="n">{p.name}</span>
            <AnalogBar value={p.value} min={p.min} max={p.max} normal={p.normal} alarm={p.alarm} unit={p.unit} name={p.name} w={140} />
            <em>{fmt(p)}</em>
            <Sparkline data={trendOf(zone, p, i, 24)} w={90} h={26} band={p.normal} min={p.min} max={p.max} />
          </button>
        ))}
        <div className="k">CCTV</div>
        <div className="lv-cams">
          {[1, 2].map(n => (
            <div key={n} className={'lv-cam' + (al && n === 1 ? ' hit' : '')}>
              <span>CCTV {n} · {n === 1 ? '입구' : '안쪽'}</span>
              {al && n === 1 && <b>{al.what}</b>}
            </div>
          ))}
        </div>
      </div>
      <div className="lv-l3-st">
        <div className="k">구역 상태</div>
        <dl>{status.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {al && <div className="lv-l3-al"><PriBadge p={al.pri} /> <span>{al.action}</span></div>}
      </div>
    </div>
  )
}

/** 24시간 추세 (30분 간격) — 마지막 값이 현재 값에 닿게 */
function trendOf(zone: string, p: Point, i: number, n = 48) {
  const seed = (zone.charCodeAt(0) * 31 + zone.charCodeAt(1) * 7 + i) | 0
  const span = p.normal[1] - p.normal[0]
  const raw = series(seed, n, p.normal[0] + span * 0.45, span * 0.15, span * 0.08)
  const gap = p.value - raw[n - 1]
  return raw.map((v, k) => +Math.max(p.min, v + gap * Math.max(0, (k - n * 0.7) / (n * 0.3))).toFixed(2))
}

function L4View({ zone, pt }: { zone: string; pt: PKey }) {
  const pts = pointsOf(zone)
  const i = pts.findIndex(p => p.key === pt)
  const p = pts[i]
  const data = trendOf(zone, p, i)
  const W = 560, H = 170, Lp = 36, R = 8, T = 10, B = 22
  const x = (k: number) => Lp + (k / (data.length - 1)) * (W - Lp - R)
  const y = (v: number) => T + (1 - (v - p.min) / (p.max - p.min)) * (H - T - B)
  const d = data.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const hiAl = p.alarm[1]
  const id = `${zone}-${pt.toUpperCase()}-01`
  const hist = [
    badOf(p) ? `14:27  경보 — ${p.name} ${fmt(p)}` : outOf(p) ? `13:50  정상 범위 벗어남 — ${fmt(p)}` : '오늘  이벤트 없음',
    '어제 18:40  정상 범위 안에서 최고값',
    '10월 14일  센서 눈금 맞춤(교정) · 설비팀',
  ]
  return (
    <div className="lv-l4">
      <div className="lv-l4-chart">
        <div className="k">{p.name} · 최근 24시간</div>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${p.name} 24시간 추세, 현재 ${fmt(p)}`}>
          <rect className="band" x={Lp} width={W - Lp - R} y={y(p.normal[1])} height={y(p.normal[0]) - y(p.normal[1])} />
          <line className="al" x1={Lp} x2={W - R} y1={y(hiAl)} y2={y(hiAl)} />
          <text className="ax" x={W - R} y={y(hiAl) - 4} textAnchor="end">경보 {hiAl}{p.unit}</text>
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
          <div><dt>통신</dt><dd>정상</dd></div>
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
    setPath(p); setMoves(m => m + 1); setLast(null)
  }
  const fromAlarm = (id: string) => {
    const t = ALARM_TARGET[id]
    setDir('in'); setOrigin('50% 100%'); setPath(t); setMoves(m => m + 1)
    setLast({ via: 'alarm', n: lvOf(t) - 1 })
  }

  const crumbs: { label: string; p: Path }[] = [{ label: '전체 현장', p: {} }]
  if (path.site) crumbs.push({ label: siteOf(path.site).name, p: { site: path.site } })
  if (path.site && path.zone) crumbs.push({ label: zoneOf(path.zone).name, p: { site: path.site, zone: path.zone } })
  if (path.site && path.zone && path.pt) crumbs.push({ label: pointsOf(path.zone).find(x => x.key === path.pt)!.name, p: path })
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
                {SAFE_SITES.map(s => (
                  <button key={s.id} type="button" className={s.id === path.site ? 'on' : ''} onClick={() => go({ site: s.id })} aria-label={s.name + '로 이동'}>
                    {SHORT[s.id]}{topPri({ site: s.id }) && <i className={'p' + topPri({ site: s.id })} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
            <div key={key} className={'lv-view z' + dir} style={{ transformOrigin: origin }}>
              {lv === 1 && <L1View go={go} />}
              {lv === 2 && <L2View site={path.site!} go={go} />}
              {lv === 3 && <L3View site={path.site!} zone={path.zone!} go={go} />}
              {lv === 4 && <L4View zone={path.zone!} pt={path.pt!} />}
            </div>
          </div>
          <div className="lv-alarms" aria-label="알람 목록 — 누르면 그 구역 화면으로">
            <div className="lv-alarms-h"><b>알람 {SAFE_ALARMS.length}</b><span>누르면 그 구역·센서 화면으로 바로 가요</span></div>
            <ul>
              {SAFE_ALARMS.map(a => {
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
  { opts: ['운영 현황', '현장 관리', '보고서', '설정'], ok: '현장 관리' },
  { opts: ['제2공장', '물류센터', '신축 현장'], ok: '제2공장' },
  { opts: ['구역', '설비', '출입 게이트', '작업자'], ok: '구역' },
  { opts: ['프레스 라인', '도장 부스', '화학물질 창고'], ok: '도장 부스' },
  { opts: ['센서', 'CCTV', '출입 기록', '점검 일지'], ok: 'CCTV' },
  { opts: ['CCTV 1 · 입구', 'CCTV 2 · 안쪽', 'CCTV 3 · 배기구'], ok: 'CCTV 1 · 입구' },
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
  const a = SAFE_ALARMS[0]
  return (
    <div className="lv-race">
      <div className="lv-race-task"><span className="muted">할 일</span> <b>도장 부스 입구 CCTV 화면을 여세요.</b></div>
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
            ) : <div className="lv-race-ok">도장 부스 CCTV 화면 도착</div>}
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
            ) : <div className="lv-race-ok">도장 부스 CCTV 화면 도착</div>}
            <p className="muted">알람 목록의 한 줄을 누르면 그 구역 화면과 감지한 카메라가 바로 열려요.</p>
          </div>
          {jump.done && <div className="lv-race-res"><b>{jump.done.clicks}번</b> 클릭 · {sec(jump.done)}</div>}
        </div>
      </div>
      {(menu.done || jump.done) && (
        <div className="lv-row">
          <span className="muted">{menu.done && jump.done ? `메뉴로는 ${menu.done.clicks}번, 알람으로는 ${jump.done.clicks}번이에요. 화재처럼 급할 때는 이 차이가 몇 분으로 벌어져요.` : '나머지 쪽도 해 보세요.'}</span>
          <button type="button" className="btn sm ghost" onClick={() => { menu.reset(); jump.reset(); setDepth(0); setMiss('') }}>다시 하기</button>
        </div>
      )}
    </div>
  )
}

/* ================= Shneiderman 만트라 ================= */
const MANTRA: { k: string; d: string; lv: Lv[] }[] = [
  { k: '전체 먼저', d: '현장 전체를 먼저 보여 줘요. 어디를 볼지는 그다음에 정해요.', lv: [1] },
  { k: '좁혀 들어가기', d: '관심 있는 현장과 구역으로 좁혀 들어가요(확대 · 필터).', lv: [2, 3] },
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
    <div className="lv-scr" role="img" aria-label="벽면 화면에는 레벨 1, 근무자 책상의 모니터에는 알람 목록, 레벨 2, 레벨 3과 4">
      <div className="lv-scr-wall"><small>상황실 벽면 화면 · 모두가 같이</small><b>레벨 1 전체 개요</b></div>
      <div className="lv-scr-desk">
        <div><small>모니터 1</small><b>알람 목록</b></div>
        <div className="main"><small>모니터 2</small><b>레벨 2 현장 화면</b></div>
        <div><small>모니터 3</small><b>레벨 3 · 4 · CCTV</b></div>
      </div>
      <div className="lv-scr-cap">근무자 책상(콘솔) · 혼자 봄</div>
    </div>
  )
}

/* ================= 흔한 실수: before / after 목업 ================= */
function OldBar({ title }: { title: string }) {
  return <div className="lv-old-bar"><b>{title}</b><span><i className="lamp" aria-hidden="true" />정상 운영 중</span></div>
}

/** 흔한 화면: 현장을 하나씩 골라 보는 화면 */
function PickerBefore() {
  const s = SAFE_SITES[1]
  return (
    <div className="lv-old" role="img" aria-label="흔한 화면: 현장 선택 상자에서 물류센터만 보이고 다른 현장의 알람은 보이지 않음">
      <OldBar title="안전관리 모니터링" />
      <div className="lv-old-pick"><span>현장 선택</span><b>{s.name} ▾</b></div>
      <div className="lv-old-zones">
        {s.zones.map(z => <div key={z.id}><i className="lamp" aria-hidden="true" /><b>{z.name}</b><span>정상</span></div>)}
      </div>
      <p className="lv-old-cap">지금 제2공장 도장 부스에서 연기가 감지됐어요. 이 화면에는 아무 흔적도 없어요. 근무자가 '제2공장'을 골라야 비로소 보여요.</p>
    </div>
  )
}

/** 흔한 화면: 모든 걸 한 장에 */
const ALL_COLS = ['현장', '구역', '인원', '가스', 'CO', '온도', '진동', 'CCTV', '출입', '보호구', '점검']
function AllBefore() {
  const rows = SAFE_SITES.flatMap(s => s.zones.map(z => {
    const v = VALUES[z.id] ?? {}
    const g = (k: PKey, u: string) => (v[k] !== undefined ? v[k] + u : '-')
    return [s.name, z.name, z.workers + '명', g('lel', '%'), g('co', 'ppm'), v.btemp !== undefined ? v.btemp + '℃' : g('temp', '℃'), g('vib', ''), '2/2', z.id === 'C3' ? '허가' : '정상', z.id === 'W3' ? '미착용 1' : '정상', '13:30']
  }))
  return (
    <div className="lv-old" role="img" aria-label="흔한 화면: 모든 구역의 모든 값이 작은 표 하나에 들어감">
      <OldBar title="종합 현황 (전체 현장 · 전체 항목)" />
      <div className="lv-old-t">
        <table>
          <thead><tr>{ALL_COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, k) => <td key={k} className={c === '정상' ? 'g' : ''}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="lv-old-cap">값 {rows.length * ALL_COLS.length}개. 도장 부스 온도 58℃, 화학물질 창고 가스 12%가 이 사이 어딘가에 있어요. 찾으셨나요?</p>
    </div>
  )
}

function OverviewAfter({ note }: { note: string }) {
  return (
    <Hmi title={`${SAFE_CENTER} · 전체 개요`} right="14:42" className="lv-mk">
      <L1View />
      <p className="lv-mk-note">{note}</p>
    </Hmi>
  )
}

/** 흔한 화면: 알람이 그냥 글자 */
function JumpBefore() {
  return (
    <div className="lv-old" role="img" aria-label="흔한 화면: 알람 줄을 눌러도 아무 데도 가지 않고, 구역 화면은 메뉴 6단계 아래에 있음">
      <OldBar title="이벤트 현황" />
      <ul className="lv-old-al">
        {SAFE_ALARMS.slice(0, 3).map(a => <li key={a.id}><span>14:2{a.pri}</span><b className="red">{a.where}</b><span className="red">{a.what}</span></li>)}
      </ul>
      <div className="lv-old-menu">메뉴 › 현장 관리 › 제2공장 › 구역 › 도장 부스 › CCTV › CCTV 1</div>
      <p className="lv-old-cap">알람 줄은 눌러도 아무 일이 없어요. 구역 CCTV를 보려면 위의 메뉴를 6번 내려가야 해요.</p>
    </div>
  )
}
function JumpAfter() {
  const a = SAFE_ALARMS[0]
  return (
    <Hmi title="알람 목록" right="14:42" className="lv-mk">
      <div className="lv-mk-al">
        <div className="top"><PriBadge p={a.pri} /><b>{a.where}</b><span>{a.what}</span></div>
        <div className="acts"><span>구역 화면 열기 ›</span><span>감지한 CCTV 1 · 입구 ›</span><span>대응 절차 ›</span></div>
      </div>
      <p className="lv-mk-note">알람 한 줄이 곧 그 구역 화면, 감지한 카메라, 대응 절차로 가는 길이에요. 열린 화면 위에는 빵부스러기가 붙어서 돌아오는 길도 보여요.</p>
    </Hmi>
  )
}

/** 잘한 예: 알람이 뜨면 CCTV 자동 순환을 멈춤 */
const CAMS = ['지게차 통로', '고층 랙 구역', '상하차장', '프레스 라인', '타워크레인 반경', '고소작업 구역']
function RotateBefore() {
  const [i, setI] = useState(0)
  const ref = useVisibleInterval(() => setI(k => (k + 1) % CAMS.length), 2000)
  return (
    <div ref={ref} className="lv-old" role="img" aria-label="흔한 화면: 알람이 떠도 CCTV가 2초마다 다른 카메라로 넘어감">
      <OldBar title="CCTV 자동 순환" />
      <div className="lv-old-cam"><span>자동 순환 {i + 1}/{CAMS.length}</span><b>{CAMS[i]}</b></div>
      <div className="lv-old-al1"><b className="red">[화재] 제2공장 도장 부스 연기 감지</b></div>
      <p className="lv-old-cap">화재 알람이 떴는데 카메라는 2초마다 다른 구역으로 넘어가요. 도장 부스 영상은 이 순환 목록에도 없어요.</p>
    </div>
  )
}
function RotateAfter() {
  const a = SAFE_ALARMS[0]
  return (
    <Hmi title="CCTV" right="14:42" className="lv-mk">
      <div className="lv-mk-cam"><span className="tag">순환 멈춤 · 알람 카메라</span><b>제2공장 도장 부스 · CCTV 1 입구</b></div>
      <div className="lv-mk-al"><div className="top"><PriBadge p={a.pri} /><b>{a.where}</b><span>{a.what}</span></div></div>
      <p className="lv-mk-note">알람이 확인될 때까지 이 카메라를 앞에 고정해요. 순환은 근무자가 직접 다시 켜요.</p>
    </Hmi>
  )
}

function Mistakes() {
  return (
    <div className="lv-cases">
      <CaseCard sev="높음" title="전체를 한눈에 보는 화면이 없어요. 현장을 하나씩 골라 봐야 해요"
        now={<>첫 화면에 '현장 선택' 상자가 있어요. 고른 현장 하나만 보여요. 다른 현장은 다시 골라야 보여요.</>}
        why={<>안전관리 화면이 해서는 안 되는 일이에요. 고르지 않은 현장의 화재는 화면 어디에도 없어요. ISA-101의 레벨 1은 맡은 범위 <b>전체</b>의 상태를 늘 띄워 두는 화면이에요<Cite n={1} /><Cite n={2} />. "전체를 먼저 보여 준다"는 원칙과도 정반대예요<Cite n={3} />.</>}
        fix={<><b>첫 화면을 레벨 1 전체 개요로 바꿔요.</b> 현장 3곳과 구역 9개의 상태를 한 장에 둬요. 현장 선택 상자는 레벨 2로 들어가는 버튼이 돼요. 알람이 있는 현장에는 우선순위 배지를 붙여요.</>}
        before={<PickerBefore />} after={<OverviewAfter note="현장 3곳이 한 화면에 늘 떠 있어요. 제2공장의 알람이 바로 보이고, 누르면 그 현장 화면으로 들어가요." />} />
      <CaseCard sev="높음" title="반대로 모든 단계를 한 장에 몰아넣어요"
        now={<>'종합 현황' 한 장에 모든 현장, 모든 구역, 모든 항목을 표로 넣어요. 글자는 10px 남짓이고, '정상'은 초록 글자로 칸마다 반복돼요.</>}
        why={<>값이 많을수록 이상은 숫자 사이에 묻혀요. 레벨 1은 상태를 보여 주는 곳이지 숫자를 읽는 곳이 아니에요<Cite n={2} />. 고성능 HMI는 화면마다 할 일을 하나로 좁히라고 해요<Cite n={5} />.</>}
        fix={<><b>값을 레벨로 나눠 담아요.</b> 레벨 1에는 현장 상태만, 숫자는 레벨 2부터, 센서 하나의 기록은 레벨 4에 둬요. 화면 목록 표(아래)를 채우면 무엇을 어디에 둘지 정해져요.</>}
        before={<AllBefore />} after={<OverviewAfter note="같은 상황이에요. 어느 현장을 봐야 하는지 바로 보여요. 숫자는 레벨 2부터 읽어요." />} />
      <CaseCard sev="치명" title="알람에서 그 구역과 CCTV로 바로 못 가요"
        now={<>알람 목록은 글자만 있어요. 눌러도 아무 데도 안 가요. 구역 CCTV는 메뉴 6단계 아래에 있어요.</>}
        why={<>화재 대응에서 가장 비싼 건 시간이에요. 메뉴를 뒤지는 동안 근무자는 지금 어디를 보고 있었는지도 잃어요<Cite n={4} />. 현장에서는 "어떤 화면이든 세 번 안에"를 목표로 자주 말해요<Cite n={6} />.</>}
        fix={<><b>알람 한 줄을 링크로 만들어요.</b> 누르면 그 구역 화면(레벨 3)이 열리고, 감지한 카메라가 앞에 와요. 같은 줄에서 대응 절차도 바로 열어요. 열린 화면에는 빵부스러기를 붙여 돌아오는 길을 보여 줘요.</>}
        before={<JumpBefore />} after={<JumpAfter />} />
      <CaseCard sev="보통" good title="알람이 뜨면 CCTV 자동 순환을 멈추고 그 카메라를 앞으로"
        now={<>평소에는 카메라를 몇 초씩 돌려 보여 줘요(<Term k="CCTV 자동 순환" d={X['CCTV 자동 순환']} />). 알람이 뜨면 순환을 멈추고, 알람을 낸 구역의 카메라를 앞에 고정해요.</>}
        why={<>알람에서 바로 '보는 화면'으로 이어져요. 근무자가 카메라를 찾지 않아도 돼요. 화면이 바뀌어도 알람과 영상이 같은 자리에 있어 맥락이 끊기지 않아요<Cite n={4} />.</>}
        fix={<>순환을 언제 다시 켤지도 정해요. 알람을 확인할 때까지는 고정하고, 다시 켜는 건 근무자가 해요. 알람이 여러 개면 우선순위가 가장 높은 카메라를 앞에 둬요.</>}
        before={<RotateBefore />} after={<RotateAfter />} />
    </div>
  )
}

/* ================= 탭 ================= */
const TABLE: Lv[] = [1, 2, 3, 4]
export default function Tab() {
  return (
    <div data-dash="levels">
      <TermList keys={['위계', '빵부스러기', '드릴다운', '시각적 연속성', 'HMI', '운영자', 'CCTV 자동 순환', '위치 태그', '%LEL', 'ppm', '교정', '감시인']} extra={X} />
      <SysGrid>
        <Section id="dash-levels-why" wide title="한 화면에 다 넣지 않고, 4단계로 나눠요"
          gist="넓게 보는 화면과 깊게 보는 화면을 나눠요. 그래야 화면마다 할 일이 분명해져요."
          desc={<>지도 앱을 떠올려 보세요. 처음엔 도시 전체가 보이고, 확대하면 동네, 더 확대하면 건물 하나가 보여요. 안전관리 화면도 이렇게 단계(<Term k="위계" d={X['위계']} />)를 나눠요. 전체 현장 → 현장 → 구역 → 센서 순서예요. 고성능 <Term k="HMI" /> 표준인 ISA-101이 이렇게 하라고 해요<Cite n={1} />. 단계를 나누면 화면마다 질문 하나에만 답하면 돼요.</>}>
          <div className="lv-why">
            <Finding src={<>ANSI/ISA-101.01-2015 · ISA 블로그 해설 — 한국어 요약</>}>
              레벨 1은 맡은 범위 전체가 괜찮은지 보여 주는 개요예요. 여기서는 조작하지 않아요. <Term k="운영자">근무자</Term>는 근무 시간 대부분을 레벨 2에서 보내요. 레벨 3·4는 설비 하나나 그 부품을 자세히 살펴볼 때 열어요.
            </Finding>
            <ol className="lv-pyr" aria-label="4단계 화면 위계">
              {TABLE.map(l => <li key={l} style={{ width: 52 + (l - 1) * 16 + '%' }}><small>레벨 {l}</small><b>{LEVELS[l].name}</b><span>{LEVELS[l].scope}</span></li>)}
            </ol>
          </div>
        </Section>

        <Section id="dash-levels-mistakes" wide title="흔한 실수 — 전체가 없거나, 전부 한 장이거나, 길이 없어요"
          gist="전체는 한 장에, 자세한 건 단계로, 알람에서는 한 번에 가요."
          desc={<>업계에서 흔히 보는 안전관리 대시보드는 위계를 잘못 잡아요. 전체를 볼 화면이 없거나, 반대로 모든 걸 한 장에 넣어요. 그리고 알람에서 현장 화면으로 가는 길이 없어요. 카드마다 '흔한 화면'과 '업그레이드하면'을 눌러 비교해 보세요. 화면 속 회사와 수치는 모두 가상이에요.</>}>
          <Mistakes />
        </Section>

        <Section id="dash-levels-zoom" wide title="눌러서 들어가 보기 — 전체 현장에서 센서 하나까지"
          gist="알람 줄과 작은 지도가 늘 같은 자리에 있어서, 어디까지 들어가도 길을 잃지 않아요."
          desc={<>현장을 누르면 레벨 2로 들어가요(<Term k="드릴다운" />). 그 안에서 구역을 누르면 레벨 3, 센서를 누르면 레벨 4예요. 아래 알람 줄을 누르면 그 화면으로 한 번에 가요. 돌아올 때는 위쪽 경로 줄(<Term k="빵부스러기" d={X['빵부스러기']} />)이나 왼쪽 위 작은 지도를 눌러요.</>}>
          <Explorer />
          <Note>이 예시는 알람 6개가 한꺼번에 떠 있는 바쁜 순간이에요. 회사와 수치는 모두 가상이에요. 어느 레벨에 있든 <b>알람 줄은 같은 자리</b>에 있어요. 왼쪽 위 작은 지도는 "지금 전체 중 어디인지"를 알려 줘요. Woods는 이렇게 길을 잃지 않게 하는 것을 <Term k="시각적 연속성" d={X['시각적 연속성']} />(visual momentum)이라고 불렀어요<Cite n={4} />. 센서가 없는 구역(지게차 통로 등)은 <Term k="위치 태그" d={X['위치 태그']} />와 CCTV로 지켜봐서 레벨 4가 없어요.</Note>
        </Section>

        <Section id="dash-levels-table" wide title="레벨마다 정할 것 — 화면 목록 표"
          gist="레벨마다 '여기서 하는 일'과 '하지 않는 일'을 먼저 정해요."
          desc="화면 목록을 만들 때 이 표의 칸을 채워 보세요. 그러면 레벨마다 무엇을 넣고 뺄지가 정해져요. 안전관리 화면에서는 '대피 방송·작업 중지 같은 조치를 어느 레벨에서 하나'를 꼭 적어요.">
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
            <div><b>알람에서 바로</b><p>알람 한 줄이 곧 그 구역 화면과 카메라로 가는 링크예요. 사고 대응 중에 메뉴를 뒤지지 않게요.</p></div>
            <div><b>화면이 바뀌어도 길 잃지 않기</b><p>화면이 바뀌어도 알람 줄, 작은 지도, 시각은 같은 자리에 둬요. 누른 곳에서 확대되듯 열리면 "어디서 왔는지"를 기억하기 쉬워요<Cite n={4} />.</p></div>
          </div>
        </Section>

        <Section id="dash-levels-mantra" title="전체를 먼저, 그다음 좁혀서, 자세한 건 누를 때"
          gist="처음엔 전체만 보여 줘요. 자세한 내용은 사용자가 원할 때 열어요."
          desc={<>Shneiderman이 정리한 정보 탐색 순서예요<Cite n={3} />. 흔히 정보 탐색 <Term k="만트라" d={X['만트라']} />라고 불러요. 안전관리 화면에서는 현장 전체 → 구역 → 센서 기록 순서가 돼요. 단계를 누르면 어느 레벨에 해당하는지 보여요.</>}>
          <Mantra />
        </Section>

        <Section id="dash-levels-screens" title="벽면엔 레벨 1, 개인 화면엔 레벨 2~4"
          gist="벽면은 모두가 같이 보는 화면이라 바꾸지 않아요. 깊이 볼 땐 내 모니터에서 봐요."
          desc="상황실 벽면 화면은 모두가 같이 보는 화면이라 레벨 1만 올려요. 자세히 들어가 보는 화면과 CCTV는 각자 모니터에서 열어요.">
          <Screens />
          <Note>누군가 벽면 화면을 한 구역의 CCTV로 바꿔 버리면, 다른 사람들은 전체 상황을 볼 수 없게 돼요. 얼마나 떨어져서 보는지, 글자는 얼마나 커야 하는지는 <a href="#/dash/room">07 관제실 환경</a>에서 계산해 봐요.</Note>
        </Section>

        <Refs items={[
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015 Human Machine Interfaces for Process Automation Systems — 화면 위계 4단계', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'standard', text: 'ISA Interchange, Modern DCS Graphics: Level 1 Overview Displays (ISA-101 해설)', url: 'https://blog.isa.org/modern-dcs-graphics-level-1-overview-displays' },
          { kind: 'paper', text: 'Shneiderman, B. (1996). The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations. IEEE Symposium on Visual Languages.' },
          { kind: 'paper', text: 'Woods, D. D. (1984). Visual momentum: a concept to improve the cognitive coupling of person and computer. International Journal of Man-Machine Studies.' },
          { kind: 'book', text: 'Hollifield, B., Oliver, D., Nimmo, I., Habibi, E. The High Performance HMI Handbook (PAS, 2008).' },
          { kind: 'practice', text: '"어떤 화면이든 세 번 이내"는 현장과 업체 자료에서 자주 쓰는 경험칙이에요. 표준이 정한 숫자로 옮기지 마세요.' },
          { kind: 'practice', text: "'흔한 실수'의 흔한 화면은 업계에서 자주 보이는 패턴을 일반화한 가상 화면이에요. 특정 회사나 제품을 가리키지 않아요." },
        ]} />
      </SysGrid>
    </div>
  )
}
