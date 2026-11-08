/* 06 지도 · 계통도 — 가상의 누리시 설비 지도(SVG)와 단선도 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { Term, TermList } from '../../components/Term'
import { Seg } from '../../components/ui'
import { Note, Section, SysGrid } from '../../system/ui'
import { ALARMS, PRI, RANGES, SUBSTATIONS, rng, type AlarmDef, type Pri } from '../data'
import { AnalogBar, Cite, Finding, Hmi, PriBadge, Refs } from '../ui'
import './map.css'

/* ================= 공용 ================= */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const onKey = (fn: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } }

/** 지도 위 우선순위 표식 — PriBadge와 같은 모양·숫자를 SVG 좌표로 그려요 */
function PriMark({ p, x, y, s }: { p: Pri; x: number; y: number; s: number }) {
  const h = s / 2, shape = PRI[p].shape
  return (
    <g className={'pm p' + p} transform={`translate(${x} ${y})`}>
      {shape === 'square' && <rect x={-h} y={-h} width={s} height={s} rx={s * 0.12} />}
      {shape === 'triangle' && <path d={`M0 ${-h * 1.12} L${h * 1.12} ${h * 0.86} L${-h * 1.12} ${h * 0.86}Z`} />}
      {shape === 'circle' && <circle r={h} />}
      <text y={shape === 'triangle' ? h * 0.62 : h * 0.4} fontSize={s * 0.62} textAnchor="middle">{p}</text>
    </g>
  )
}

/* ================= 가상 도시 데이터 ================= */
const W = 1000, H = 700, M_PER_U = 10 // 1 단위 = 10m → 도시 폭 10km
type Kind = 'sw' | 'tr' | 'pole'
const KIND_NAME: Record<Kind, string> = { sw: '개폐기', tr: '주상변압기', pole: '전주' }
interface Dev { id: string; name: string; kind: Kind; feeder: string; fname: string; sub: string; x: number; y: number; alarm?: AlarmDef }
interface SubPt { id: string; name: string; x: number; y: number; alarm?: AlarmDef }

/** 선로가 뻗어 가는 끝점 */
const TARGET: Record<string, [number, number]> = {
  N1: [80, 70], N2: [110, 380], N3: [540, 50],
  R1: [940, 110], R2: [950, 470], R3: [780, 640],
  I1: [170, 640], I2: [640, 665], I3: [250, 420],
}
/** 알람이 걸린 설비 (선로 id, 설비 순번) 또는 변전소 id */
const ALARM_AT: Record<string, [string, number] | string> = {
  'A-101': ['I1', 26], 'A-102': ['R1', 0], 'A-103': 'I', 'A-104': ['N2', 47], 'A-105': ['R2', 44], 'A-106': 'N',
}
/** 한 전주에 변압기 3대(뱅크)가 같은 좌표에 겹쳐 있는 곳 */
const STACK_AT: [string, number][] = [['I2', 30], ['R3', 22], ['N1', 14], ['N3', 34], ['I1', 14]]

function buildCity() {
  const subs: SubPt[] = SUBSTATIONS.map(s => ({ id: s.id, name: s.name, x: s.x * 10, y: s.y * 7 }))
  const devs: Dev[] = []
  const lines: Record<string, [number, number][]> = {}
  let seed = 7
  for (const s of SUBSTATIONS) {
    const sx = s.x * 10, sy = s.y * 7
    for (const f of s.feeders) {
      const r = rng(seed++ * 131)
      const [tx, ty] = TARGET[f.id]
      const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy)
      const nx = -dy / len, ny = dx / len
      const amp = 16 + r() * 26, ph = r() * 6
      let drift = 0
      const pts: [number, number][] = [[sx, sy]]
      for (let i = 0; i < 48; i++) {
        const t = (i + 1) / 48
        drift = drift * 0.8 + (r() - 0.5) * 9
        const off = (Math.sin(t * Math.PI * 2.3 + ph) * amp + drift) * Math.sin(t * Math.PI)
        const x = clamp(sx + dx * t + nx * off, 10, W - 10), y = clamp(sy + dy * t + ny * off, 10, H - 10)
        pts.push([x, y])
        const kind: Kind = i % 4 === 0 ? 'sw' : i % 2 === 0 ? 'tr' : 'pole'
        const name = kind === 'sw' ? `${f.name} R/C-${i / 4 + 1}` : kind === 'tr' ? `${f.name} TR-${i}` : `${f.name} 전주 #${i}`
        devs.push({ id: `${f.id}-${i}`, name, kind, feeder: f.id, fname: f.name, sub: s.name, x, y })
      }
      lines[f.id] = pts
    }
  }
  for (const [fid, i] of STACK_AT) {
    const d = devs.find(v => v.id === `${fid}-${i}`)!
    d.name += 'A'
    for (const k of ['B', 'C']) devs.push({ ...d, id: d.id + k, name: d.name.slice(0, -1) + k })
  }
  for (const a of ALARMS) {
    const at = ALARM_AT[a.id]
    if (typeof at === 'string') subs.find(s => s.id === at)!.alarm = a
    else devs.find(v => v.id === `${at[0]}-${at[1]}`)!.alarm = a
  }
  return { subs, devs, lines }
}
const CITY = buildCity()
/** 산단 1선 끝 ↔ 산단 2선 끝을 잇는 연계선 (평소 열림) */
const TIE: [number, number][] = [CITY.lines.I1[48], [CITY.lines.I1[48][0] + 120, 678], [CITY.lines.I2[48][0] - 140, 682], CITY.lines.I2[48]]
const TIE_MID: [number, number] = [(TIE[1][0] + TIE[2][0]) / 2, (TIE[1][1] + TIE[2][1]) / 2]

/* ---------- 배경 지도 (회색조 / 컬러) ---------- */
const BLOCKS = (() => {
  const r = rng(404), out: [number, number, number, number][] = []
  for (let gx = 0; gx < 17; gx++) for (let gy = 0; gy < 12; gy++) {
    if (r() < 0.35) continue
    out.push([gx * 60 + 6 + r() * 8, gy * 60 + 6 + r() * 8, 30 + r() * 18, 26 + r() * 18])
  }
  return out
})()
const RIVER = 'M1010,150 C900,200 820,250 760,330 S640,420 520,420 S330,440 250,540 S120,690 -10,700'
const ROADS = [
  'M0,300 C200,290 420,250 600,240 S900,230 1000,240',
  'M360,0 C350,150 380,300 430,440 S470,620 480,700',
  'M0,600 C200,590 400,600 600,580 S850,560 1000,520',
  'M700,0 C690,120 700,220 720,330 S820,520 860,700',
]
const MINOR = ['M0,120 L1000,130', 'M0,450 L380,470', 'M560,470 L1000,420', 'M160,0 L190,700', 'M560,0 L580,330', 'M900,0 L940,700', 'M600,520 L620,700']
const PARKS = ['M120,120 L220,110 L230,190 L130,200Z', 'M800,420 L900,400 L930,480 L820,500Z', 'M560,300 L620,295 L625,345 L565,350Z', 'M40,470 L120,460 L130,520 L50,530Z']
const DISTRICTS: [string, number, number][] = [['누리1동', 170, 250], ['누리2동', 540, 150], ['강변동', 860, 300], ['산단동', 560, 625], ['남누리동', 260, 660], ['서누리동', 70, 420]]

function BaseMap({ color, labels = true, k = 1 }: { color: boolean; labels?: boolean; k?: number }) {
  return (
    <g className={'bm ' + (color ? 'bm-color' : 'bm-gray')} aria-hidden="true">
      <rect className="land" x={-50} y={-50} width={W + 100} height={H + 100} />
      {BLOCKS.map((b, i) => <rect key={i} className="block" x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx={2} />)}
      {PARKS.map((d, i) => <path key={i} className="park" d={d} />)}
      <path className="river" d={RIVER} />
      {MINOR.map((d, i) => <path key={i} className="minor" d={d} />)}
      {ROADS.map((d, i) => <path key={i} className="road" d={d} />)}
      {labels && DISTRICTS.map(([n, x, y]) => <text key={n} className="dist" x={x} y={y} fontSize={13 * k} textAnchor="middle">{n}</text>)}
      {labels && <text className="dist river-l" x={600} y={448} fontSize={12 * k} textAnchor="middle">누리강</text>}
    </g>
  )
}

/* ================= 1. 지도와 계통도, 무엇을 묻나 ================= */
type View = 'map' | 'sld' | 'both'
const QUESTIONS: { q: string; a: View; why: string }[] = [
  { q: '점검반을 어느 길로 보내야 가장 빨리 도착하나요?', a: 'map', why: '답은 거리·도로·방향이에요. 계통도에는 실제 거리가 없어요.' },
  { q: '산단 1선 차단기가 내려갔어요(트립). 어느 개폐기를 열면 고장 구간만 떼어 낼 수 있나요?', a: 'sld', why: '답은 연결 관계예요. 어느 구간이 어느 개폐기 사이에 있는지 봐야 해요. 지도에서는 전깃줄이 겹치고 꺾여서 순서가 안 보여요.' },
  { q: '정전 신고 전화가 몰리는 동네가 어디인가요?', a: 'map', why: '신고가 들어온 주소를 지도 위에 찍어 봐야 해요. 위치를 묻는 질문이에요.' },
  { q: '강변 1선에 걸린 전기 사용량(부하)을 옆 선로로 넘길 수 있나요?', a: 'sld', why: '두 가지를 봐야 해요. 어느 선로와 연계 개폐기로 이어져 있는지, 그리고 받는 쪽에 여유가 있는지예요.' },
  { q: '도로 공사 구역 근처에 우리 설비가 있나요?', a: 'map', why: '공사 구역과 겹치는지 묻고 있어요. 위치 문제라서 지도로 봐요.' },
  { q: '강변 2선 R/C-12 통신이 끊겼어요. 이 개폐기가 맡은 구간과 현장 위치는요?', a: 'both', why: '이 개폐기가 맡은 구간(연결)은 계통도에서 봐요. 출동할 위치는 지도에서 봐요. 그래서 두 화면은 같은 이름을 쓰고, 한쪽에서 고른 설비를 다른 쪽에도 표시해야 해요.' },
]
function WhichView() {
  const [i, setI] = useState(1)
  const q = QUESTIONS[i]
  const hit = (v: 'map' | 'sld') => q.a === v || q.a === 'both'
  return (
    <div className="mp-which">
      <ol className="mp-qs">
        {QUESTIONS.map((x, j) => (
          <li key={j}><button type="button" className={'mp-q' + (j === i ? ' on' : '')} aria-pressed={j === i} onClick={() => setI(j)}>
            <span className="n">{j + 1}</span><span>{x.q}</span>
          </button></li>
        ))}
      </ol>
      <div className="mp-which-ans" aria-live="polite">
        <div className={'mp-vcard' + (hit('map') ? ' hit' : '')}>
          <svg viewBox="380 380 620 320" className="mp-thumb" aria-hidden="true">
            <BaseMap color={false} labels={false} />
            {(['I1', 'I2', 'R3'] as const).map(f => <polyline key={f} className="mp-fl" points={CITY.lines[f].map(p => p.join(',')).join(' ')} />)}
            {CITY.subs.map(s => <rect key={s.id} className="mp-sub" x={s.x - 9} y={s.y - 9} width={18} height={18} />)}
          </svg>
          <div><b>지도</b> · 위치 문제<p>어디에 있나, 얼마나 먼가, 무엇과 가까운가</p></div>
          {hit('map') && <span className="mp-hit">이 화면으로 답해요</span>}
        </div>
        <div className={'mp-vcard' + (hit('sld') ? ' hit' : '')}>
          <svg viewBox="0 40 1000 170" className="mp-thumb" aria-hidden="true">
            <SldSvg st={NORMAL_ST} mini />
          </svg>
          <div><b>계통도(단선도)</b> · 연결 문제<p>무엇이 무엇에 이어져 있나, 어디를 끊으면 어디가 정전되나</p></div>
          {hit('sld') && <span className="mp-hit">이 화면으로 답해요</span>}
        </div>
        <p className="mp-why"><b>{q.a === 'map' ? '지도' : q.a === 'sld' ? '계통도' : '둘 다'}</b> — {q.why}</p>
      </div>
    </div>
  )
}

/* ================= 2. 설비 지도: 묶음과 이상 ================= */
interface Item { key: string; x: number; y: number; devs: Dev[]; top: Pri | 0; nBad: number }
function clusterize(devs: Dev[], cell: number, pull: boolean, z: number): Item[] {
  const m = new Map<string, Dev[]>()
  const solo: Item[] = []
  for (const d of devs) {
    if (pull && d.alarm) { solo.push({ key: 'd:' + d.id, x: d.x, y: d.y, devs: [d], top: d.alarm.pri, nBad: 1 }); continue }
    const k = `${z}:${Math.floor(d.x / cell)}:${Math.floor(d.y / cell)}`
    const a = m.get(k); if (a) a.push(d); else m.set(k, [d])
  }
  const out: Item[] = []
  for (const [key, ds] of m) {
    let x = 0, y = 0, top: Pri | 0 = 0, nBad = 0
    for (const d of ds) { x += d.x; y += d.y; if (d.alarm) { nBad++; if (!top || d.alarm.pri < top) top = d.alarm.pri } }
    out.push({ key: ds.length === 1 ? 'd:' + ds[0].id : key, x: x / ds.length, y: y / ds.length, devs: ds, top, nBad })
  }
  return [...out, ...solo]
}
const ZOOMS = [1, 2, 4, 8] as const
const ZNAME: Record<number, string> = { 1: '도시 전체', 2: '구역', 4: '동네', 8: '거리' }
const SCALES = [100, 200, 500, 1000, 2000, 5000]
const sameSpot = (ds: Dev[]) => ds.every(d => Math.abs(d.x - ds[0].x) < 0.01 && Math.abs(d.y - ds[0].y) < 0.01)

function CityMap() {
  const { subs, devs, lines } = CITY
  const [z, setZ] = useState<number>(1)
  const [c, setC] = useState<[number, number]>([W / 2, H / 2])
  const [badge, setBadge] = useState(true)
  const [pull, setPull] = useState(false)
  const [colorBase, setColorBase] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [spider, setSpider] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [px, setPx] = useState(900)
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(es => setPx(Math.max(240, es[0].contentRect.width)))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  const vw = W / z, vh = H / z
  const cx = clamp(c[0], vw / 2, W - vw / 2), cy = clamp(c[1], vh / 2, H - vh / 2)
  const vx = cx - vw / 2, vy = cy - vh / 2
  const u = vw / px // 화면 1px 이 세계 좌표 몇 단위인지
  const items = useMemo(() => clusterize(devs, 70 * u, pull, z), [devs, u, pull, z])
  const inView = (x: number, y: number, m = 0) => x >= vx - m && x <= vx + vw + m && y >= vy - m && y <= vy + vh + m
  const vis = items.filter(it => inView(it.x, it.y, 30 * u))
  const normal = vis.filter(it => !(it.devs.length === 1 && it.devs[0].alarm) && !(badge && it.top))
  const flagged = vis.filter(it => !normal.includes(it))
  const alarmPts = [...devs.filter(d => d.alarm), ...subs.filter(s => s.alarm)] as (Dev | SubPt)[]
  const off = z > 1 ? alarmPts.filter(a => !inView(a.x, a.y)) : []
  const visBad = alarmPts.length - off.length

  const zoomTo = (nz: number, at?: [number, number]) => { setZ(nz); if (at) setC(at); setSpider(null) }
  const zoomStep = (d: 1 | -1) => { const i = ZOOMS.indexOf(z as typeof ZOOMS[number]); const ni = clamp(i + d, 0, ZOOMS.length - 1); zoomTo(ZOOMS[ni], [cx, cy]) }
  const pick = (it: Item) => {
    if (it.devs.length === 1) { setSel(it.devs[0].id); setSpider(null); return }
    if (z < 8 && !sameSpot(it.devs)) { zoomTo(Math.min(8, z * 2), [it.x, it.y]); return }
    setSpider(s => (s === it.key ? null : it.key))
  }
  const jump = (id: string) => {
    const p = devs.find(d => d.id === id) ?? subs.find(s => s.id === id)
    if (!p) return
    setSel(id); setSpider(null); setZ(8); setC([p.x, p.y])
  }

  /* 끌어서 이동 (가로 끌기 · 마우스), 키보드 화살표 */
  const drag = useRef<{ x: number; y: number; c: [number, number]; moved: boolean } | null>(null)
  const down = (e: RPointerEvent<SVGSVGElement>) => { drag.current = { x: e.clientX, y: e.clientY, c: [cx, cy], moved: false } }
  const move = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) > 5) { d.moved = true; e.currentTarget.setPointerCapture(e.pointerId) }
    if (d.moved && z > 1) setC([d.c[0] - dx * u, d.c[1] - dy * u])
  }
  const up = () => { setTimeout(() => { drag.current = null }, 0) }
  const clickOk = () => !drag.current?.moved
  const keys = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget) return
    const s = vw * 0.15
    const mv: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }
    if (mv[e.key]) { e.preventDefault(); setC([cx + mv[e.key][0], cy + mv[e.key][1]]) }
    if (e.key === '+' || e.key === '=') zoomStep(1)
    if (e.key === '-') zoomStep(-1)
  }

  const selDev = devs.find(d => d.id === sel), selSub = subs.find(s => s.id === sel)
  const selItem = sel ? vis.find(it => it.devs.some(d => d.id === sel)) : undefined
  const scaleM = SCALES.find(m => m / M_PER_U / u >= 64) ?? 5000
  const scalePx = scaleM / M_PER_U / u
  const nearest = subs.reduce((a, s) => (Math.hypot(s.x - cx, s.y - cy) < Math.hypot(a.x - cx, a.y - cy) ? s : a))
  const r = (p: number) => p * u // 화면 px → 세계 단위

  const renderItem = (it: Item) => {
    const d = it.devs[0], one = it.devs.length === 1, isSel = !!sel && it.devs.some(v => v.id === sel)
    if (one && d.alarm) return (
      <g key={it.key} className="mp-hitg" role="button" tabIndex={0} aria-label={`${d.name}, 우선순위 ${d.alarm.pri} ${PRI[d.alarm.pri].name}: ${d.alarm.what}`}
        onClick={() => clickOk() && pick(it)} onKeyDown={onKey(() => pick(it))}>
        <circle className="mp-halo" cx={d.x} cy={d.y} r={r(15)} />
        <PriMark p={d.alarm.pri} x={d.x} y={d.y} s={r(19)} />
        {isSel && <circle className="mp-sel" cx={d.x} cy={d.y} r={r(16)} />}
      </g>
    )
    if (one) return (
      <g key={it.key} className={'mp-dev k-' + d.kind} onClick={() => clickOk() && pick(it)}>
        <circle className="mp-tap" cx={d.x} cy={d.y} r={r(9)} />
        {d.kind === 'sw' ? <rect x={d.x - r(4)} y={d.y - r(4)} width={r(8)} height={r(8)} /> : <circle cx={d.x} cy={d.y} r={r(d.kind === 'tr' ? 3.6 : 2.4)} />}
        {isSel && <circle className="mp-sel" cx={d.x} cy={d.y} r={r(10)} />}
      </g>
    )
    const n = it.devs.length, rad = r(11 + Math.min(9, Math.sqrt(n) * 1.5)), stack = sameSpot(it.devs)
    const label = `설비 ${n}개 묶음${it.top ? `, 이상 ${it.nBad}건 포함, 가장 높은 우선순위 ${it.top}` : ''}. ${z < 8 && !stack ? '눌러서 확대' : '눌러서 펼치기'}`
    return (
      <g key={it.key} className="mp-hitg" role="button" tabIndex={0} aria-label={label} onClick={() => clickOk() && pick(it)} onKeyDown={onKey(() => pick(it))}>
        <circle className={'mp-cl' + (stack ? ' stack' : '')} cx={it.x} cy={it.y} r={rad} />
        <text className="mp-cl-n" x={it.x} y={it.y + r(4)} fontSize={r(12)} textAnchor="middle">{n}</text>
        {badge && it.top !== 0 && <PriMark p={it.top} x={it.x + rad * 0.8} y={it.y - rad * 0.8} s={r(17)} />}
        {badge && it.nBad > 1 && <text className="mp-cl-bad" x={it.x + rad * 0.8 + r(11)} y={it.y - rad * 0.8 + r(4)} fontSize={r(10.5)}>+{it.nBad - 1}</text>}
        {isSel && <circle className="mp-sel" cx={it.x} cy={it.y} r={rad + r(4)} />}
      </g>
    )
  }
  const spiderItem = spider ? vis.find(it => it.key === spider) : undefined

  return (
    <div className="mp-city">
      <div className="mp-tools">
        <div className="mp-zoom" role="group" aria-label="확대·축소">
          <button type="button" className="btn sm ghost" aria-label="축소" disabled={z === 1} onClick={() => zoomStep(-1)}>−</button>
          <Seg value={z} onChange={v => zoomTo(v, [cx, cy])} options={ZOOMS.map(v => [v, ZNAME[v]] as const)} />
          <button type="button" className="btn sm ghost" aria-label="확대" disabled={z === 8} onClick={() => zoomStep(1)}>+</button>
        </div>
        <div className="mp-opts">
          <button type="button" className="chip" aria-pressed={badge} onClick={() => setBadge(v => !v)}>묶음에 이상 배지</button>
          <button type="button" className="chip" aria-pressed={pull} onClick={() => setPull(v => !v)}>이상 설비는 묶지 않기</button>
          <Seg value={colorBase ? 'c' : 'g'} onChange={v => setColorBase(v === 'c')} options={[['g', '회색조 지도'], ['c', '컬러 지도']]} />
        </div>
      </div>
      <div className="mp-city-grid">
        <Hmi title="누리시 배전 설비 지도 (가상)" right={<>설비 {devs.length + subs.length}개 · 이상 {alarmPts.length}건</>} className="mp-hmi">
          <div className="mp-stage" ref={box}>
            <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className={'mp-svg' + (colorBase ? ' is-color' : '') + (z > 1 ? ' can-pan' : '')} tabIndex={0}
              role="group" aria-label={`누리시 가상 설비 지도, ${ZNAME[z]} 보기. 화살표 키로 이동, 더하기·빼기로 확대·축소`}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={keys}>
              <BaseMap color={colorBase} k={u} />
              <g className="mp-lines">
                {Object.entries(lines).map(([f, pts]) => <polyline key={f} className="mp-fl" points={pts.map(p => p.join(',')).join(' ')} />)}
                <polyline className="mp-fault" points={lines.I1.slice(21, 34).map(p => p.join(',')).join(' ')} />
                <polyline className="mp-tie" points={TIE.map(p => p.join(',')).join(' ')} />
              </g>
              <g>{normal.map(renderItem)}</g>
              <rect className="mp-ts" x={TIE_MID[0] - r(5)} y={TIE_MID[1] - r(5)} width={r(10)} height={r(10)} />
              {z >= 4 && <text className="mp-lab" x={TIE_MID[0]} y={TIE_MID[1] - r(10)} fontSize={r(11)} textAnchor="middle">연계 T/S (평소 열림)</text>}
              {subs.map(s => (
                <g key={s.id} className="mp-hitg" role="button" tabIndex={0} aria-label={`${s.name}${s.alarm ? `, 우선순위 ${s.alarm.pri}: ${s.alarm.what}` : ''}`}
                  onClick={() => clickOk() && setSel(s.id)} onKeyDown={onKey(() => setSel(s.id))}>
                  <rect className="mp-sub" x={s.x - r(11)} y={s.y - r(11)} width={r(22)} height={r(22)} rx={r(3)} />
                  <path className="mp-sub-i" d={`M${s.x - r(5)} ${s.y + r(4)} L${s.x} ${s.y - r(5)} L${s.x + r(5)} ${s.y + r(4)}`} />
                  <text className="mp-sub-l" x={s.x} y={s.y + r(26)} fontSize={r(12)} textAnchor="middle">{s.name}</text>
                  {s.alarm && <PriMark p={s.alarm.pri} x={s.x + r(13)} y={s.y - r(13)} s={r(17)} />}
                  {sel === s.id && <circle className="mp-sel" cx={s.x} cy={s.y} r={r(18)} />}
                </g>
              ))}
              <g>{flagged.map(renderItem)}</g>
              {spiderItem && (() => {
                const n = spiderItem.devs.length, R = r(26 + n * 2)
                return (
                  <g className="mp-spider">
                    <circle className="mp-spider-bg" cx={spiderItem.x} cy={spiderItem.y} r={R + r(12)} />
                    {spiderItem.devs.map((d, i) => {
                      const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = spiderItem.x + Math.cos(a) * R, y = spiderItem.y + Math.sin(a) * R
                      return (
                        <g key={d.id} className="mp-hitg" role="button" tabIndex={0} aria-label={d.name} onClick={() => { setSel(d.id); setSpider(null) }} onKeyDown={onKey(() => { setSel(d.id); setSpider(null) })}>
                          <line className="mp-leg" x1={spiderItem.x} y1={spiderItem.y} x2={x} y2={y} />
                          {d.alarm ? <PriMark p={d.alarm.pri} x={x} y={y} s={r(17)} /> : <circle className={'mp-sp k-' + d.kind} cx={x} cy={y} r={r(6)} />}
                        </g>
                      )
                    })}
                    <circle className="mp-sp-c" cx={spiderItem.x} cy={spiderItem.y} r={r(3)} />
                  </g>
                )
              })()}
              {off.map(a => {
                const m = r(16)
                const ex = clamp(a.x, vx + m, vx + vw - m), ey = clamp(a.y, vy + m, vy + vh - m)
                const ang = Math.atan2(a.y - ey, a.x - ex) * 180 / Math.PI
                const al = a.alarm!
                return (
                  <g key={'off' + al.id} className="mp-hitg mp-off" role="button" tabIndex={0} aria-label={`화면 밖 알람: ${al.where}, 우선순위 ${al.pri}. 눌러서 이동`}
                    onClick={() => clickOk() && jump(a.id)} onKeyDown={onKey(() => jump(a.id))}>
                    <path className="mp-off-arr" transform={`translate(${ex} ${ey}) rotate(${ang})`} d={`M${r(9)} 0 L${r(16)} ${-r(5)} L${r(16)} ${r(5)}Z`} />
                    <PriMark p={al.pri} x={ex} y={ey} s={r(15)} />
                  </g>
                )
              })}
            </svg>
            <div className="mp-scale" aria-label={`축척 ${scaleM >= 1000 ? scaleM / 1000 + 'km' : scaleM + 'm'}`}>
              <i style={{ width: scalePx }} /><span>{scaleM >= 1000 ? scaleM / 1000 + 'km' : scaleM + 'm'}</span>
            </div>
            <span className="mp-north" aria-label="위쪽이 북쪽">북 ↑</span>
            <button type="button" className="mp-mini" aria-label="미니맵: 현재 보는 범위. 누르면 도시 전체로" onClick={() => zoomTo(1, [W / 2, H / 2])}>
              <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
                <rect className="mm-land" width={W} height={H} />
                <path className="mm-river" d={RIVER} />
                {Object.values(lines).map((pts, i) => <polyline key={i} className="mm-fl" points={pts.map(p => p.join(',')).join(' ')} />)}
                {alarmPts.map(a => <circle key={a.alarm!.id} className={'mm-al p' + a.alarm!.pri} cx={a.x} cy={a.y} r={16} />)}
                <rect className="mm-view" x={vx} y={vy} width={vw} height={vh} />
              </svg>
            </button>
          </div>
          <div className="mp-status">
            <span>보는 범위 약 {(vw * M_PER_U / 1000).toFixed(1)}km × {(vh * M_PER_U / 1000).toFixed(1)}km · {nearest.name} 근처</span>
            <span>화면 안 이상 <b>{visBad}</b>건{off.length > 0 && <> · 화면 밖 <b>{off.length}</b>건(가장자리 화살표)</>}</span>
          </div>
        </Hmi>

        <aside className="mp-side">
          <div className="mp-panel" aria-live="polite">
            {selDev || selSub ? (
              <>
                <small>{selDev ? `${KIND_NAME[selDev.kind]} · ${selDev.sub}` : '변전소'}</small>
                <b className="mp-pname">{selDev?.name ?? selSub?.name}</b>
                {(selDev?.alarm ?? selSub?.alarm) ? (() => {
                  const a = (selDev?.alarm ?? selSub?.alarm)!
                  return (
                    <div className="mp-palarm">
                      <PriBadge p={a.pri} label />
                      <span>{a.what}</span>
                      <small>대응: {a.action} · {PRI[a.pri].respond}</small>
                      {selDev?.feeder === 'I1' && <a href="#dash-map-sld" onClick={e => { e.preventDefault(); document.getElementById('dash-map-sld')?.scrollIntoView({ behavior: 'smooth' }) }}>계통도에서 고장 구간 보기 →</a>}
                    </div>
                  )
                })() : <span className="mp-ok">정상 · 알람 없음</span>}
                {selDev && !selItem?.devs.every(d => d.id === sel) && selItem && <small className="muted">지금 확대 단계에서는 {selItem.devs.length}개짜리 묶음 안에 들어 있어요(테두리로 표시).</small>}
              </>
            ) : (
              <><small>선택 없음</small><b className="mp-pname">설비나 묶음을 눌러 보세요</b><span className="muted">묶음을 누르면 그 자리로 확대돼요. 한 전주에 겹쳐 있는 설비는 가장 크게 확대한 ‘거리’ 단계에서 누르면 둥글게 펼쳐져요.</span></>
            )}
          </div>
          <div className="mp-alist">
            <b>알람에서 바로 위치로</b>
            <ul>
              {[...ALARMS].sort((a, b) => a.pri - b.pri).map(a => {
                const at = ALARM_AT[a.id], id = typeof at === 'string' ? at : `${at[0]}-${at[1]}`
                return (
                  <li key={a.id}><button type="button" className={'mp-arow' + (sel === id ? ' on' : '')} onClick={() => jump(id)}>
                    <PriBadge p={a.pri} /><span><b>{a.where}</b><small>{a.what}</small></span>
                  </button></li>
                )
              })}
            </ul>
          </div>
        </aside>
      </div>
      <div className="mp-legend" aria-label="범례">
        <span><svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true"><rect className="lg-sub" x="-7" y="-7" width="14" height="14" rx="2" /></svg>변전소</span>
        <span><svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true"><rect className="lg-sw" x="-4" y="-4" width="8" height="8" /></svg>개폐기</span>
        <span><svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true"><circle className="lg-tr" r="3.6" /></svg>주상변압기</span>
        <span><svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true"><circle className="lg-tr" r="2.4" /></svg>전주</span>
        <span><svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true"><circle className="lg-cl" r="9" /></svg>묶음(숫자 = 설비 수)</span>
        <span><svg width="26" height="8" viewBox="0 0 26 8" aria-hidden="true"><line className="lg-fault" x1="1" y1="4" x2="25" y2="4" /></svg>고장 났을 것으로 보이는 구간</span>
        <span className="lg-pri"><PriBadge p={1} label /><PriBadge p={2} label /><PriBadge p={3} label /></span>
      </div>
    </div>
  )
}

/* ================= 3. 겹침 처리 ================= */
type OvMode = 'raw' | 'top' | 'cluster' | 'spider' | 'list'
const OV_PTS: { x: number; y: number; k: Kind | 'alarm'; name: string }[] = [
  { x: 160, y: 100, k: 'alarm', name: '강변 2선 R/C-12 · 통신 두절' },
  { x: 162, y: 98, k: 'tr', name: '강변 2선 TR-44A' },
  { x: 162, y: 98, k: 'tr', name: '강변 2선 TR-44B' },
  { x: 162, y: 98, k: 'tr', name: '강변 2선 TR-44C' },
  { x: 150, y: 106, k: 'pole', name: '강변 2선 전주 #43' },
  { x: 171, y: 92, k: 'pole', name: '강변 2선 전주 #45' },
  { x: 168, y: 108, k: 'sw', name: '강변 3선 R/C-5' },
]
const OV_TEXT: Record<OvMode, [string, string]> = {
  raw: ['그대로 그리기', '데이터가 들어온 순서대로 그렸어요. 알람이 가장 먼저 그려져서 변압기 밑에 깔렸어요. 설비가 7개인지, 이상이 있는지 알 수 없어요.'],
  top: ['이상은 맨 위', '그리는 순서를 바꿔서 이상 설비를 늘 맨 위에 그려요. 사용자가 선택한 설비는 그보다도 위에 그려요. 겹침 처리에서 가장 먼저 할 일이에요.'],
  cluster: ['묶음 + 이상 배지', '몇 개가 겹쳤는지는 숫자로 보여줘요. 그 안에서 가장 급한 알람의 우선순위는 배지로 붙여요. 그래서 이상이 묶음 속에 묻히지 않아요.'],
  spider: ['펼치기', '한 전주에 달린 변압기 3대처럼 좌표가 똑같으면 아무리 확대해도 겹쳐요. 이럴 땐 둥글게 펼쳐 놓고, 선으로 원래 자리와 이어 줘요.'],
  list: ['목록으로 보기', '펼쳐도 너무 많으면 목록이 나아요. 이상 설비를 맨 위에 두고, 급한 순서대로 정렬해요.'],
}
function Overlap() {
  const [m, setM] = useState<OvMode>('raw')
  const draw = m === 'raw' ? OV_PTS : [...OV_PTS].sort((a, b) => (a.k === 'alarm' ? 1 : 0) - (b.k === 'alarm' ? 1 : 0))
  const dot = (p: typeof OV_PTS[number], x = p.x, y = p.y, big = false, key?: string) => p.k === 'alarm'
    ? <PriMark key={key} p={3} x={x} y={y} s={big ? 17 : 12} />
    : p.k === 'sw' ? <rect key={key} className="ov-sw" x={x - 5} y={y - 5} width={10} height={10} /> : <circle key={key} className={'ov-' + p.k} cx={x} cy={y} r={p.k === 'tr' ? (big ? 6 : 9) : 4} />
  return (
    <div className="mp-ov">
      <Seg value={m} onChange={setM} options={(Object.keys(OV_TEXT) as OvMode[]).map(k => [k, OV_TEXT[k][0]] as const)} />
      <div className="mp-ov-grid">
        <Hmi title="강변 2선 끝 부분" right="거리 배율">
          <svg viewBox="40 30 240 140" className="mp-ov-svg" role="img" aria-label={`겹침 처리: ${OV_TEXT[m][0]}`}>
            <path className="ov-road" d="M40,150 C120,140 200,120 280,70" />
            <polyline className="ov-line" points="40,128 100,118 150,106 162,98 200,80 280,52" />
            {(m === 'raw' || m === 'top') && draw.map((p, i) => dot(p, p.x, p.y, false, 'p' + i))}
            {(m === 'cluster' || m === 'list') && <g>
              <circle className="ov-cl" cx={161} cy={100} r={17} />
              <text className="ov-cl-n" x={161} y={105} textAnchor="middle">{OV_PTS.length}</text>
              <PriMark p={3} x={175} y={86} s={15} />
            </g>}
            {m === 'spider' && <g>
              {OV_PTS.map((p, i) => {
                const a = (i / OV_PTS.length) * Math.PI * 2 - Math.PI / 2, x = 161 + Math.cos(a) * 44, y = 100 + Math.sin(a) * 44
                return <g key={i}><line className="ov-leg" x1={p.x} y1={p.y} x2={x} y2={y} />{dot(p, x, y, true)}</g>
              })}
            </g>}
          </svg>
          {m === 'list' && (
            <ul className="mp-ov-list" aria-label="겹친 설비 목록">
              {[...OV_PTS].sort((a, b) => (a.k === 'alarm' ? -1 : 0) - (b.k === 'alarm' ? -1 : 0)).map((p, i) => (
                <li key={i}>{p.k === 'alarm' ? <PriBadge p={3} /> : <span className="ov-k">{KIND_NAME[p.k]}</span>}<span>{p.name}</span></li>
              ))}
            </ul>
          )}
        </Hmi>
        <div className="mp-ov-text" aria-live="polite">
          <b>{OV_TEXT[m][0]}</b>
          <p>{OV_TEXT[m][1]}</p>
          <ul className="mp-rules">
            <li>그리는 순서: 정상 설비 → 묶음 → 이상 설비(덜 급한 것부터) → 선택한 설비. 나중에 그린 것이 위에 올라와요.</li>
            <li>이름표끼리 겹치면 이름표를 숨겨요. 이상 설비와 선택한 설비의 이름만 남겨요.</li>
            <li>묶음 원은 개수가 늘어도 조금만 커지게 해요. 너무 크면 지도를 가려요.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ================= 4. 배경 지도는 눌러야 해요 ================= */
function BaseContrast() {
  const [dim, setDim] = useState(100)
  const vb = '520 180 440 300'
  const pts = CITY.devs.filter(d => d.x > 500 && d.x < 980 && d.y > 170 && d.y < 490)
  const panel = (color: boolean) => (
    <figure className="mp-bc-fig">
      <svg viewBox={vb} className={'mp-bc-svg' + (color ? ' is-color' : '')} role="img" aria-label={color ? '컬러 배경 지도 위 알람' : '회색조 배경 지도 위 알람'}>
        <g style={{ opacity: color ? 1 : dim / 100 }}><BaseMap color={color} k={0.6} /></g>
        {(['R1', 'R2', 'R3'] as const).map(f => <polyline key={f} className="mp-fl" points={CITY.lines[f].map(p => p.join(',')).join(' ')} />)}
        {pts.filter(d => !d.alarm && d.kind !== 'pole').map(d => <circle key={d.id} className={'mp-bc-dev' + (color ? ' g' : '')} cx={d.x} cy={d.y} r={2.6} />)}
        {CITY.subs.filter(s => s.id === 'R').map(s => <rect key={s.id} className="mp-sub" x={s.x - 8} y={s.y - 8} width={16} height={16} rx={2} />)}
        {pts.filter(d => d.alarm).map(d => <PriMark key={d.id} p={d.alarm!.pri} x={d.x + (d.alarm!.pri === 2 ? 14 : 0)} y={d.y - (d.alarm!.pri === 2 ? 12 : 0)} s={19} />)}
      </svg>
      <figcaption>{color ? '컬러 지도 · 정상 설비 초록' : '회색조 지도 · 정상 설비 회색'}</figcaption>
    </figure>
  )
  return (
    <div className="mp-bc">
      <div className="mp-bc-grid">{panel(true)}{panel(false)}</div>
      <label className="mp-bc-slider">
        <span>오른쪽 배경 지도 진하기 <b>{dim}%</b></span>
        <input type="range" min={20} max={100} value={dim} onChange={e => setDim(+e.target.value)} style={{ ['--p' as string]: ((dim - 20) / 80) * 100 + '%' }} />
      </label>
      <p className="mp-bc-q">두 지도에는 같은 알람 2건(<PriBadge p={2} /> 강변 1선 · <PriBadge p={3} /> 강변 2선 R/C-12)이 있어요. 왼쪽 컬러 지도에서는 노란 알람이 주황 도로, 초록 설비와 섞여서 눈에 덜 띄어요.</p>
    </div>
  )
}

/* ================= 5. 단선도: 고장 구간 분리와 역송 ================= */
type SwId = 'CB1' | 'SW1' | 'SW2' | 'SW3' | 'TS' | 'SW4' | 'CB2'
type NodeId = 'B1' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'B2'
type SecId = Exclude<NodeId, 'B1' | 'B2'>
const SWS: { id: SwId; name: string; x: number; a: NodeId; b: NodeId; cb?: boolean }[] = [
  { id: 'CB1', name: '산단 1선 CB', x: 110, a: 'B1', b: 'S1', cb: true },
  { id: 'SW1', name: '산단 1선 R/C-3', x: 260, a: 'S1', b: 'S2' },
  { id: 'SW2', name: '산단 1선 R/C-6', x: 420, a: 'S2', b: 'S3' },
  { id: 'SW3', name: '산단 1선 R/C-9', x: 580, a: 'S3', b: 'S4' },
  { id: 'TS', name: '연계 T/S', x: 730, a: 'S4', b: 'S5' },
  { id: 'SW4', name: '산단 2선 R/C-10', x: 830, a: 'S5', b: 'S6' },
  { id: 'CB2', name: '산단 2선 CB', x: 910, a: 'S6', b: 'B2', cb: true },
]
const SECS: { id: SecId; x1: number; x2: number; cust: number; f: 'I1' | 'I2'; n: string }[] = [
  { id: 'S1', x1: 110, x2: 260, cust: 520, f: 'I1', n: '구간 1' },
  { id: 'S2', x1: 260, x2: 420, cust: 410, f: 'I1', n: '구간 2' },
  { id: 'S3', x1: 420, x2: 580, cust: 240, f: 'I1', n: '구간 3' },
  { id: 'S4', x1: 580, x2: 730, cust: 260, f: 'I1', n: '구간 4' },
  { id: 'S5', x1: 730, x2: 830, cust: 330, f: 'I2', n: '구간 5' },
  { id: 'S6', x1: 830, x2: 910, cust: 450, f: 'I2', n: '구간 6' },
]
const FEED_LOAD = { I1: SUBSTATIONS[2].feeders[0].load, I2: SUBSTATIONS[2].feeders[1].load } // 88%, 74%
const CUST = { I1: 520 + 410 + 240 + 260, I2: 330 + 450 }
type Closed = Record<SwId, boolean>
interface SldSt { closed: Closed; fault: boolean; fi: boolean }
const ALL_ON: Closed = { CB1: true, SW1: true, SW2: true, SW3: true, TS: false, SW4: true, CB2: true }
const NORMAL_ST: SldSt = { closed: ALL_ON, fault: false, fi: false }

/** 닫힌 개폐기를 따라 전원(B1·B2)에서 닿는 구간 */
function energize(cl: Closed) {
  const live: Partial<Record<NodeId, 'B1' | 'B2'>> = {}
  const via: Partial<Record<NodeId, SwId[]>> = {}
  for (const src of ['B1', 'B2'] as const) {
    const q: NodeId[] = [src]; live[src] = src; via[src] = []
    while (q.length) {
      const n = q.shift()!
      for (const s of SWS) {
        if (!cl[s.id]) continue
        const o = s.a === n ? s.b : s.b === n ? s.a : null
        if (o && !live[o]) { live[o] = src; via[o] = [...via[n]!, s.id]; q.push(o) }
      }
    }
  }
  return { live, via }
}
/** 고장 구간에 전기가 닿으면 그 전원의 변전소 차단기가 트립해요(이 예시에선 차단기만 보호 동작) */
function protect(st: SldSt): { st: SldSt; trips: SwId[] } {
  const trips: SwId[] = []
  let cl = st.closed
  for (let k = 0; k < 2 && st.fault; k++) {
    const { live } = energize(cl)
    const src = live.S3
    if (!src) break
    const cb: SwId = src === 'B1' ? 'CB1' : 'CB2'
    cl = { ...cl, [cb]: false }; trips.push(cb)
  }
  return { st: { ...st, closed: cl }, trips }
}

const STEPS: { t: string; d: string; at: string; st: SldSt; log: string }[] = [
  { t: '정상 운전', at: '14:00:00', st: NORMAL_ST, log: '정상 운전. 연계 T/S는 평소대로 열려 있음.',
    d: '산단 1선(왼쪽)과 산단 2선(오른쪽)은 각자 변전소에서 전기를 받아요. 가운데 연계 개폐기(T/S)는 평소에 열어 둬요. 그래서 두 선로가 서로 떨어져 있어요.' },
  { t: '고장 발생 · 차단기가 끊김', at: '14:02:08', st: { closed: { ...ALL_ON, CB1: false }, fault: true, fi: false }, log: '산단 1선 CB 트립. 보호 계전기(고장 감지 장치)가 동작함. 구간 1~4 정전.',
    d: '집 두꺼비집이 ‘탁’ 내려가듯, 변전소 차단기가 스스로 전기를 끊었어요(트립). 선로 어딘가에 고장이 났다는 뜻이에요. 산단 1선 전체, 고객 1,430호가 정전이에요. 아직 고장 위치는 몰라요.' },
  { t: '고장 구간 찾기', at: '14:02:40', st: { closed: { ...ALL_ON, CB1: false }, fault: true, fi: true }, log: '고장 표시기: CB · R/C-3 · R/C-6 켜짐, R/C-9 안 켜짐 → 구간 3이 고장으로 보임.',
    d: '고장이 나면 아주 큰 전류(고장 전류)가 흘러요. 이 전류는 변전소에서 고장 지점까지만 흘러요. 그 길 위의 개폐기마다 고장 표시기(FI)가 켜져요. 표시기가 켜진 마지막 개폐기(R/C-6)와 안 켜진 첫 개폐기(R/C-9) 사이, 구간 3이 고장 구간이에요.' },
  { t: '고장 구간 떼어 내기', at: '14:03:30', st: { closed: { ...ALL_ON, CB1: false, SW2: false, SW3: false }, fault: true, fi: true }, log: 'R/C-6 · R/C-9 원격으로 엶(개방). 구간 3을 떼어 냄.',
    d: '구간 3 양쪽에 있는 R/C-6과 R/C-9를 관제실에서 원격으로 열어요. 그러면 고장 구간이 떨어져 나가요. 이제 나머지 구간에는 다시 전기를 보내도 안전해요.' },
  { t: '앞쪽 구간 복구', at: '14:04:05', st: { closed: { ...ALL_ON, CB1: true, SW2: false, SW3: false }, fault: true, fi: true }, log: '산단 1선 CB 다시 넣음(투입). 구간 1·2 복구(930호).',
    d: '변전소 차단기를 다시 넣어요(투입). 고장 구간 앞쪽인 구간 1·2에 전기가 다시 들어와요.' },
  { t: '뒤쪽 구간은 옆 선로로(역송)', at: '14:05:20', st: { closed: { ...ALL_ON, CB1: true, SW2: false, SW3: false, TS: true }, fault: true, fi: true }, log: '연계 T/S 닫음(투입). 구간 4에 산단 2선 전기를 보냄(역송, 260호).',
    d: '길이 막히면 옆길로 돌아가듯, 옆 선로에서 전기를 끌어와요. 구간 4는 고장 구간 뒤쪽이라 자기 변전소와 끊겼어요. 연계 T/S를 닫아 옆 산단 2선의 전기를 보내요(역송). 닫기 전에 산단 2선에 여유가 있는지 꼭 확인해요. 이제 정전은 수리할 구간 3만 남아요.' },
]

function SldSvg({ st, mini = false, onSw, sel, focusSw }: { st: SldSt; mini?: boolean; onSw?: (id: SwId) => void; sel?: SwId | null; focusSw?: SwId[] }) {
  const { live } = energize(st.closed)
  const y = 130
  const fiOn = st.fi ? energize({ ...st.closed, CB1: true }).via.S3 ?? [] : []
  return (
    <g className={'sld' + (mini ? ' mini' : '')}>
      <line className="bus" x1={50} y1={y - 44} x2={50} y2={y + 44} />
      <line className="bus" x1={970} y1={y - 44} x2={970} y2={y + 44} />
      <line className="sec live" x1={50} y1={y} x2={110} y2={y} />
      <line className="sec live" x1={910} y1={y} x2={970} y2={y} />
      {!mini && <>
        <text className="sld-l" x={50} y={y - 54} textAnchor="middle">산업단지 변전소</text>
        <text className="sld-l" x={970} y={y - 54} textAnchor="middle">산업단지 변전소</text>
        <text className="sld-s" x={50} y={y + 66} textAnchor="middle">산단 1선</text>
        <text className="sld-s" x={970} y={y + 66} textAnchor="middle">산단 2선</text>
      </>}
      {SECS.map(s => {
        const on = !!live[s.id], fault = st.fault && st.fi && s.id === 'S3'
        const back = on && live[s.id] !== (s.f === 'I1' ? 'B1' : 'B2')
        return (
          <g key={s.id}>
            <line className={'sec' + (on ? ' live' : ' dead') + (fault ? ' fault' : '') + (back ? ' back' : '')} x1={s.x1} y1={y} x2={s.x2} y2={y} />
            {fault && <path className="zig" d={`M${(s.x1 + s.x2) / 2 - 12} ${y - 22} l10 12 -6 4 12 14`} />}
            {!mini && <>
              <text className="sld-n" x={(s.x1 + s.x2) / 2} y={y - 26} textAnchor="middle">{s.n}</text>
              <text className={'sld-c' + (on ? '' : ' off')} x={(s.x1 + s.x2) / 2} y={y + 34} textAnchor="middle">{on ? `${s.cust}호` : fault ? '고장 · 정전' : `정전 ${s.cust}호`}</text>
              {back && <text className="sld-c back" x={(s.x1 + s.x2) / 2} y={y + 52} textAnchor="middle">← 산단 2선에서 역송</text>}
            </>}
          </g>
        )
      })}
      {SWS.map(s => {
        const c = st.closed[s.id], sz = s.cb ? 26 : 20, fi = fiOn.includes(s.id)
        const hl = sel === s.id || focusSw?.includes(s.id)
        const inner = (
          <>
            <rect className="sw-hit" x={s.x - sz / 2 - 10} y={y - sz / 2 - 10} width={sz + 20} height={sz + 20} />
            {hl && <rect className="sw-hl" x={s.x - sz / 2 - 6} y={y - sz / 2 - 6} width={sz + 12} height={sz + 12} rx={4} />}
            <rect className={'sw' + (c ? ' closed' : ' open') + (s.cb ? ' cb' : '')} x={s.x - sz / 2} y={y - sz / 2} width={sz} height={sz} rx={2} />
            {s.cb && <text className={'sw-t' + (c ? ' on' : '')} x={s.x} y={y + 4} textAnchor="middle">CB</text>}
            {!mini && !s.cb && <text className="sld-sw" x={s.x} y={y + (s.id === 'TS' ? -40 : 66)} textAnchor="middle">{s.name.replace(/^산단 [12]선 /, '')}</text>}
            {!mini && <text className={'sld-st' + (c ? '' : ' open')} x={s.x} y={y + (s.id === 'TS' ? -56 : s.cb ? 66 : 82)} textAnchor="middle">{s.id === 'TS' || s.cb ? (c ? '닫힘' : '열림') : (c ? '' : '열림')}</text>}
            {fi && !mini && <g className="fi"><path d={`M${s.x + 10} ${y - 34} l8 0 -5 8 6 0 -10 12 3 -9 -6 0z`} /><text x={s.x + 24} y={y - 24}>FI</text></g>}
          </>
        )
        return onSw ? (
          <g key={s.id} className="sw-btn" role="button" tabIndex={0} aria-label={`${s.name}, ${c ? '닫힘' : '열림'}. 눌러서 ${c ? '열기' : '닫기'}`}
            onClick={() => onSw(s.id)} onKeyDown={onKey(() => onSw(s.id))}>{inner}</g>
        ) : <g key={s.id}>{inner}</g>
      })}
    </g>
  )
}

function FlisrSim() {
  const [step, setStep] = useState(0)
  const [st, setSt] = useState<SldSt>(NORMAL_ST)
  const [manual, setManual] = useState(false)
  const [log, setLog] = useState<{ t: string; m: string; bad?: boolean }[]>([{ t: STEPS[0].at, m: STEPS[0].log }])
  const clock = useRef(0)
  const go = (i: number) => {
    setStep(i); setManual(false); setSt(STEPS[i].st)
    clock.current = 0
    setLog(STEPS.slice(0, i + 1).map(s => ({ t: s.at, m: s.log })).reverse())
  }
  const toggle = (id: SwId) => {
    const base: SldSt = { ...st, closed: { ...st.closed, [id]: !st.closed[id] } }
    const { st: next, trips } = protect(base)
    clock.current += 15
    const last = STEPS[step].at.split(':').map(Number)
    const sec = last[0] * 3600 + last[1] * 60 + last[2] + clock.current
    const t = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map(v => String(v).padStart(2, '0')).join(':')
    const name = SWS.find(s => s.id === id)!.name
    const add: { t: string; m: string; bad?: boolean }[] = [{ t, m: `${name} ${base.closed[id] ? '닫음(투입)' : '열음(개방)'} — 직접 조작` }]
    for (const cb of trips) add.push({ t, m: `${SWS.find(s => s.id === cb)!.name} 트립 — 고장 구간에 다시 전기가 닿아서 차단기가 끊었어요`, bad: true })
    setSt(next); setManual(true)
    setLog(l => [...add.reverse(), ...l].slice(0, 12))
  }
  const { live } = energize(st.closed)
  const out = SECS.filter(s => !live[s.id]).reduce((a, s) => a + s.cust, 0)
  const load = (src: 'B1' | 'B2') => Math.round(SECS.filter(s => live[s.id] === src).reduce((a, s) => a + FEED_LOAD[s.f] * s.cust / CUST[s.f], 0))
  const l1 = load('B1'), l2 = load('B2')
  const R = RANGES.load
  const cur = STEPS[step]
  return (
    <div className="mp-flisr">
      <ol className="mp-steps" aria-label="고장 처리 단계">
        {STEPS.map((s, i) => (
          <li key={i}><button type="button" className={'mp-step' + (i === step && !manual ? ' on' : '') + (i < step ? ' done' : '')} aria-pressed={i === step && !manual} onClick={() => go(i)}>
            <span className="n">{i}</span><span>{s.t}</span>
          </button></li>
        ))}
      </ol>
      <Hmi title="산단 1선 · 산단 2선 단선도" right={<>정전 고객 <b className={out ? 'mp-out' : ''}>{out.toLocaleString('ko-KR')}호</b></>} className="mp-sld-hmi">
        <div className="mp-sld-scroll">
          <svg viewBox="0 30 1020 200" className="mp-sld-svg" role="group" aria-label="단선도. 개폐기를 눌러 열고 닫을 수 있어요.">
            <SldSvg st={st} onSw={toggle} />
          </svg>
        </div>
        <div className="mp-sld-legend" aria-label="단선도 범례">
          <span><i className="l live" />전기 들어옴</span><span><i className="l dead" />정전</span><span><i className="l back" />역송</span>
          <span><i className="sq closed" />닫힘</span><span><i className="sq open" />열림</span><span><i className="l fault" />고장 구간</span><span><b className="fi-t">FI</b>고장 표시기 켜짐</span>
        </div>
      </Hmi>
      <div className="mp-flisr-grid">
        <div className="mp-flisr-say" aria-live="polite">
          {manual ? <><b>직접 조작 중</b><p>개폐기를 눌러 열고 닫아 보세요. 고장 구간(구간 3)에 전기가 닿으면 그쪽 변전소 차단기가 다시 끊겨요. 단계 버튼을 누르면 정해진 순서로 돌아가요.</p></>
            : <><b>{step}. {cur.t}</b><p>{cur.d}</p></>}
          <div className="mp-row">
            <button type="button" className="btn sm ghost" disabled={step === 0 && !manual} onClick={() => go(Math.max(0, manual ? step : step - 1))}>{manual ? '이 단계로 되돌리기' : '이전 단계'}</button>
            <button type="button" className="btn sm" disabled={step === STEPS.length - 1 && !manual} onClick={() => go(Math.min(STEPS.length - 1, step + 1))}>다음 단계</button>
          </div>
        </div>
        <div className="mp-flisr-load">
          <b>선로 <Term k="부하율" /></b>
          {([['산단 1선', l1, 'B1'], ['산단 2선', l2, 'B2']] as const).map(([n, v]) => (
            <div key={n} className="mp-load">
              <span>{n}</span>
              <AnalogBar value={v} min={R.min} max={R.max} normal={R.normal} alarm={R.alarm} unit="%" name={n} w={150} />
              <b className={v > R.alarm[1] ? 'bad' : v > R.normal[1] ? 'warn' : ''}>{v}%</b>
            </div>
          ))}
          <small className="muted">산단 2선은 평소 {FEED_LOAD.I2}%를 써요. 역송을 받으면 정상 범위(~{R.normal[1]}%)는 넘지만 경보 기준({R.alarm[1]}%)보다는 낮아요. 경보 기준까지 넘을 것 같으면 구간을 더 잘게 나눠 일부만 넘겨요.</small>
        </div>
        <div className="mp-flisr-log">
          <b>조작 기록</b>
          <ol>{log.map((e, i) => <li key={i} className={e.bad ? 'bad' : ''}><time>{e.t}</time><span>{e.m}</span></li>)}</ol>
        </div>
      </div>
    </div>
  )
}

/* ================= 6. 지도 ↔ 계통도 같이 보기 ================= */
const LINK_SW: { id: SwId; idx: number | 'cb1' | 'tie' }[] = [
  { id: 'CB1', idx: 'cb1' }, { id: 'SW1', idx: 8 }, { id: 'SW2', idx: 20 }, { id: 'SW3', idx: 32 }, { id: 'TS', idx: 'tie' },
]
function linkPos(idx: number | 'cb1' | 'tie'): [number, number] {
  if (idx === 'cb1') return [CITY.subs[2].x, CITY.subs[2].y]
  if (idx === 'tie') return TIE_MID
  return CITY.lines.I1[idx + 1]
}
function LinkedViews() {
  const [sel, setSel] = useState<SwId | null>('SW2')
  const [linked, setLinked] = useState(true)
  const [lastFrom, setLastFrom] = useState<'map' | 'sld'>('map')
  const pick = (id: SwId, from: 'map' | 'sld') => { setSel(id); setLastFrom(from) }
  const show = (where: 'map' | 'sld') => (linked || lastFrom === where ? sel : null)
  const name = sel ? SWS.find(s => s.id === sel)!.name : ''
  return (
    <div className="mp-link">
      <div className="mp-row">
        <button type="button" className="chip" aria-pressed={linked} onClick={() => setLinked(v => !v)}>두 화면 선택 연결</button>
        <span className="muted" aria-live="polite">{sel ? <>선택: <b>{name}</b>{!linked && ` — ${lastFrom === 'map' ? '계통도' : '지도'}에서는 다시 찾아야 해요`}</> : '개폐기를 눌러 보세요'}</span>
      </div>
      <div className="mp-link-grid">
        <Hmi title="지도 · 산단 1선 주변" right="위치">
          <svg viewBox="120 440 560 250" className="mp-link-svg" role="group" aria-label="산단 1선 주변 지도">
            <BaseMap color={false} k={0.7} />
            {(['I1', 'I2', 'I3'] as const).map(f => <polyline key={f} className={'mp-fl' + (f === 'I1' ? ' strong' : '')} points={CITY.lines[f].map(p => p.join(',')).join(' ')} />)}
            <polyline className="mp-tie" points={TIE.map(p => p.join(',')).join(' ')} />
            {LINK_SW.map(l => {
              const [x, y] = linkPos(l.idx), s = SWS.find(v => v.id === l.id)!, on = show('map') === l.id
              return (
                <g key={l.id} className="mp-hitg" role="button" tabIndex={0} aria-label={`지도에서 ${s.name}`} onClick={() => pick(l.id, 'map')} onKeyDown={onKey(() => pick(l.id, 'map'))}>
                  {on && <circle className="mp-sel" cx={x} cy={y} r={14} />}
                  <rect className={'mp-lsw' + (s.cb ? ' cb' : '') + (l.id === 'TS' ? ' open' : '')} x={x - 6} y={y - 6} width={12} height={12} />
                  <text className={'mp-lab' + (on ? ' on' : '')} x={x} y={y - 12} fontSize={11} textAnchor="middle">{s.name.replace(/^산단 1선 /, '')}</text>
                </g>
              )
            })}
          </svg>
        </Hmi>
        <Hmi title="계통도 · 같은 선로" right="연결">
          <div className="mp-sld-scroll">
            <svg viewBox="0 30 1020 200" className="mp-sld-svg sm" role="group" aria-label="같은 선로의 단선도">
              <SldSvg st={NORMAL_ST} sel={show('sld')} onSw={id => pick(id, 'sld')} />
            </svg>
          </div>
        </Hmi>
      </div>
    </div>
  )
}

/* ================= 7. 지도 화면에 늘 있어야 할 것 ================= */
const CHROME: { t: string; d: string; cls: string; el: ReactNode }[] = [
  { t: '범례', cls: 'leg', el: <>■ ▲ ● 범례</>, d: '지도 위 모양과 색이 각각 무슨 뜻인지 알려 줘요. 우선순위 배지(색 + 모양 + 숫자)도 범례에 넣어요.' },
  { t: '축척', cls: 'scale', el: <><i />1km</>, d: '“여기서 저기까지 몇 km?”에 바로 답해요. 확대할 때마다 막대 길이를 다시 계산해요.' },
  { t: '현재 보는 범위', cls: 'mini', el: <i />, d: '지금 도시의 어디를 보고 있는지 알려 줘요. 미니맵(작은 전체 지도)의 사각형이나 “보는 범위 2.5km × 1.8km · 강변 변전소 근처” 같은 글로 보여줘요.' },
  { t: '화면 밖 이상', cls: 'off', el: <>◀ <i className="tri" /></>, d: '확대해서 보는 동안 화면 밖에서 알람이 생길 수 있어요. 그럴 땐 화면 가장자리에 그쪽을 가리키는 화살표를 둬요.' },
  { t: '방위', cls: 'north', el: <>북 ↑</>, d: '지도가 돌아가지 않더라도 “위가 북쪽”이라고 적어 둬요. 현장 직원과 통화할 때 방향이 서로 맞아요.' },
  { t: '갱신 시각', cls: 'upd', el: <>갱신 14:05:20</>, d: '설비 위치는 그대로여도 상태는 계속 바뀌어요. 마지막으로 새 데이터를 받은 시각을 늘 보여줘요.' },
  { t: '레이어 켜고 끄기', cls: 'lay', el: <>선로 · 통신 · 공사</>, d: '선로·통신·공사 구역처럼 지도에 겹쳐 그리는 층(레이어)을 켜고 끌 수 있게 해요. 단, 알람 레이어는 끌 수 없게 해요.' },
]
function MapChrome() {
  const [on, setOn] = useState(0)
  return (
    <div className="mp-chrome">
      <div className="mp-chrome-mock" aria-hidden="true">
        <svg viewBox="0 0 400 240" preserveAspectRatio="none"><BaseMap color={false} labels={false} /></svg>
        {CHROME.map((c, i) => <span key={i} className={'cm ' + c.cls + (i === on ? ' on' : '')}>{c.el}<b className="cm-n">{i + 1}</b></span>)}
      </div>
      <ol className="mp-chrome-list">
        {CHROME.map((c, i) => (
          <li key={i}><button type="button" className={'mp-cl-item' + (i === on ? ' on' : '')} aria-pressed={i === on} onClick={() => setOn(i)}>
            <span className="n">{i + 1}</span><span><b>{c.t}</b><small>{c.d}</small></span>
          </button></li>
        ))}
      </ol>
    </div>
  )
}

/* ================= 탭 ================= */
const EXTRA: Record<string, string> = {
  '연계 T/S': '두 선로의 끝을 잇는 스위치예요. 평소엔 열어 두고, 한쪽이 정전되면 닫아서 옆 선로의 전기를 보내요. 두 동네 사이 비상 연결 다리와 비슷해요.',
  '고장 표시기': '고장 때 흐르는 큰 전류가 지나가면 불이 켜지는 장치예요(FI). 켜진 곳과 안 켜진 곳 사이에 고장이 있어요.',
}

export default function Tab() {
  return (
    <div data-dash="map">
      <TermList keys={['계통도', '단선도', '변전소', '배전선로', '개폐기', 'R/C', '차단기', '트립', '역송', '부하율', '클러스터', '상황 인식', '연계 T/S', '고장 표시기']} extra={EXTRA} />
      <SysGrid>
        <Section id="dash-map-which" wide title="지도는 ‘어디에 있나’, 계통도는 ‘무엇과 이어졌나’"
          gist="위치를 물으면 지도로, 연결을 물으면 계통도로 답해요."
          desc={<>내비게이션 지도와 지하철 노선도를 떠올려 보세요. 지도는 실제 위치와 거리를, 노선도는 어디서 어디로 이어지는지를 보여줘요. 전력 <Term k="관제">관제실</Term>에도 이 두 화면, 지도와 <Term k="계통도" />가 있어요. 질문을 하나씩 눌러 어느 화면이 답하는지 보세요.</>}>
          <WhichView />
          <Note>이 탭의 도시·설비·고객 수·시각은 모두 설명을 위해 만든 <b>가상 값</b>이에요. 실제 지도가 아니고, 실제 설비 기준도 아니에요.</Note>
        </Section>

        <Section id="dash-map-city" wide title="설비 450개를 한 지도에 — 묶어서 보여주되 이상은 드러내기"
          gist="멀리선 묶어서, 가까이선 하나씩. 묶어도 알람은 꼭 보이게 해요."
          desc={<>누리시에는 배전 설비가 약 450개 있어요. 멀리서 보면 가까운 설비끼리 묶음(<Term k="클러스터" />)으로, 가까이 가면 하나씩 보여요. ‘묶음에 이상 배지’를 꺼 보세요. 산단 1선의 긴급 알람이 숫자 뭉치 속으로 사라져요.</>}>
          <CityMap />
          <SysGridPair>
            <Finding src={<>Shneiderman (1996) 정보 시각화 탐색 원칙 — 한국어 요약 <Cite n={1} /></>}>
              먼저 전체를 훑어보고, 그다음 확대하고 걸러 내요. 자세한 정보는 필요할 때 봐요.
            </Finding>
            <Note tone="tip"><b>확대 단계마다 할 일을 정해요.</b> ‘도시 전체’에서는 <Term k="변전소" /> 3곳과 알람 배지만 읽히면 충분해요(전체 훑기). ‘구역·동네’에서는 <Term k="선로" />를 따라가며 좁혀요(확대·거르기). ‘거리’에서는 설비 하나를 눌러 정보를 봐요(자세히 보기). <Term k="ISA-101" d="공장·발전소 같은 산업 현장의 관제 화면을 어떻게 만들지 정리한 국제 표준이에요." />이 화면을 단계별로 나누는 방식(01 탭)과 같은 생각이에요 <Cite n={2} />.</Note>
          </SysGridPair>
          <Note tone="warn"><b>묶음은 이상을 숨기기 쉬워요.</b> 숫자 묶음은 “여기에 설비가 몇 개 있다”만 알려 줘요. 그 안에 긴급 알람이 있어도 겉모습은 똑같아요. 그래서 방법이 두 가지예요. ① 묶음 안에서 가장 급한 알람의 우선순위 배지를 묶음에 붙여요. ② 이상 설비는 아예 묶지 않고 따로 그려요. 둘 다 켜 두는 게 가장 안전해요.</Note>
        </Section>

        <Section id="dash-map-overlap" title="겹친 설비 처리 — 알람이 밑에 깔리지 않게"
          gist="알람은 늘 맨 위에 그려요. 겹친 건 숫자·펼치기·목록으로 풀어요."
          desc="한 전주에 변압기 3대가 붙어 있으면 지도 좌표가 똑같아요. 그래서 아무리 확대해도 겹쳐요. 버튼을 바꿔 가며 다섯 가지 방법을 비교해 보세요.">
          <Overlap />
        </Section>

        <Section id="dash-map-base" title="배경 지도는 흐리게 — 그래야 알람이 보여요"
          gist="배경 지도는 회색으로 흐리게 깔아요. 색은 알람에만 써요."
          desc="시끄러운 카페에서는 작은 목소리가 묻히죠. 지도 앱의 컬러 지도를 그대로 깔면 공원 초록, 강 파랑, 도로 주황·노랑 때문에 알람 색이 묻혀요. 슬라이더로 오른쪽 지도를 흐리게 해 보세요.">
          <BaseContrast />
          <Note>02 탭의 원칙을 지도에도 그대로 써요. 기본은 회색이고, 색은 비정상일 때만 써요 <Cite n={2} />. 회색 배경은 눈부심과 화면 반사도 줄여 줘요 <Cite n={6} />. 색이나 모양은 주변에 비슷한 것이 많을수록 덜 튀어 보여요 <Cite n={4} />. 그래서 배경 지도는 <b>밝기 차이만 조금</b> 두고, 정상 설비도 회색으로 그려요.</Note>
        </Section>

        <Section id="dash-map-sld" wide title="단선도로 고장 처리 따라 하기 — 찾고, 떼어 내고, 다시 보내기"
          gist="고장 난 구간만 떼어 내고, 나머지는 앞뒤에서 다시 전기를 보내요."
          desc={<><Term k="단선도" />는 지하철 노선도처럼 연결만 단순하게 그린 그림이에요. 실제 전깃줄은 세 가닥(3상)이지만 선 하나로 줄여 그려요. 전력 관제에서 가장 중요한 화면이에요. 단계 버튼을 차례로 누르거나, <Term k="개폐기" />를 직접 눌러 열고 닫아 보세요.</>}>
          <FlisrSim />
          <SysGridPair>
            <Note><b>단선도에서 지킬 것.</b> 전기가 들어오는 쪽은 왼쪽(또는 위)에 두고, 흐름은 한 방향으로 그려요. 열림·닫힘은 색이 아니라 <b>채움(■ 닫힘 · □ 열림)</b>으로 구분해요. 일부 현장은 빨강·초록으로 열림·닫힘을 표시하는 관습이 있어요. 그러면 알람 색과 뜻이 겹쳐요 <Cite n={7} />.</Note>
            <Note tone="tip"><b>화면이 대신 해 줄 계산.</b> <Term k="운영자" />가 머리로 계산하지 않게 화면이 먼저 보여줘요. 예를 들면 정전 고객 수, <Term k="역송" />을 받는 선로의 부하율 예측, “이 개폐기를 닫으면 고장 구간에 전기가 들어가요” 같은 경고예요. 운전 중 “곧 앞차와 부딪히겠다”를 미리 아는 것처럼, <Term k="상황 인식" />의 ‘예측’ 단계를 돕는 일이에요 <Cite n={5} />.</Note>
          </SysGridPair>
        </Section>

        <Section id="dash-map-link" wide title="지도와 계통도를 오갈 때 — 고른 설비를 양쪽에 함께 표시"
          gist="한쪽 화면에서 고른 설비는 다른 화면에서도 바로 보여야 해요."
          desc="개폐기를 지도에서 누르면 계통도에서도 표시되고, 계통도에서 누르면 지도에서도 표시돼요. ‘두 화면 선택 연결’을 꺼 보세요. 화면을 바꿀 때마다 같은 개폐기를 다시 찾아야 해요.">
          <LinkedViews />
          <Finding src={<>Woods (1984) 시각적 운동량(visual momentum, 화면을 바꿔도 보던 흐름이 끊기지 않는 정도) — 한국어 요약 <Cite n={3} /></>}>
            화면을 바꿔도 사용자가 방금 보던 것을 새 화면에서 바로 다시 찾을 수 있어야 해요.
          </Finding>
          <Note>네 가지만 지켜도 화면을 바꿀 때 길을 잃지 않아요. ① 같은 <b>이름</b>을 써요(산단 1선 R/C-6). ② 같은 <b>선택</b>을 유지해요. ③ 같은 <b>방향</b>으로 그려요(산업단지 변전소가 지도에선 왼쪽 아래, 계통도에선 왼쪽). ④ 화면 전환 버튼은 늘 같은 자리에 둬요.</Note>
        </Section>

        <Section id="dash-map-chrome" wide title="지도 화면에 늘 있어야 할 것 7가지"
          gist="범례·축척·갱신 시각 같은 작은 정보가 판단의 근거가 돼요."
          desc="항목을 누르면 화면 그림에서 그 위치가 표시돼요. 알람 지도에서는 이것들이 꾸밈이 아니라 판단에 꼭 필요한 정보예요.">
          <MapChrome />
        </Section>

        <Refs items={[
          { kind: 'paper', text: 'Shneiderman, B. (1996). The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations. IEEE Symposium on Visual Languages.' },
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015 Human Machine Interfaces for Process Automation Systems — 기본은 회색, 색은 비정상일 때만, 화면은 4단계로 나눔 (ISA 블로그 요약)', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'paper', text: 'Woods, D. D. (1984). Visual momentum: a concept to improve the cognitive coupling of person and computer. International Journal of Man-Machine Studies, 21(3).' },
          { kind: 'paper', text: 'Healey, C. G. & Enns, J. T. (2012). Attention and Visual Memory in Visualization and Computer Graphics. IEEE TVCG 18(7) — 전주의 처리(preattentive, 눈이 따로 집중하지 않아도 저절로 알아채는 처리) 정리.' },
          { kind: 'paper', text: 'Endsley, M. R. (1995). Toward a Theory of Situation Awareness in Dynamic Systems. Human Factors 37(1).', url: 'https://en.wikipedia.org/wiki/Situation_awareness' },
          { kind: 'book', text: 'Hollifield, B., Oliver, D., Nimmo, I., Habibi, E. (2008). The High Performance HMI Handbook. PAS.' },
          { kind: 'practice', text: '고장 구간을 찾고, 떼어 내고, 다시 전기를 보내는 순서(FLISR). 묶음·펼치기·화면 밖 표시는 배전 관제와 지도 UI 실무에서 쓰는 방식이에요. 실제 보호 설정과 조작 순서는 각 설비의 운영 기준을 따라요.' },
        ]} />
      </SysGrid>
    </div>
  )
}

/** 섹션 안에서 두 덩어리를 나란히 (모바일은 세로) */
function SysGridPair({ children }: { children: ReactNode }) {
  return <div className="mp-pair">{children}</div>
}
