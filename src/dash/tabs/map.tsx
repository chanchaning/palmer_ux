/* 06 지도 · 배치도 — 가상의 가람산업 현장 지도(SVG)와 제2공장 배치도 · 대피 경로 · 인원 확인
 * 예시: data.ts SAFE_* (현장 3곳 · 구역 9개). 모든 위치·인원·시각은 가상이에요. */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { Term, TermList } from '../../components/Term'
import { Seg } from '../../components/ui'
import { Note, Section, SysGrid } from '../../system/ui'
import { PRI, SAFE_ALARMS, SAFE_CENTER, SAFE_SITES, rng, type Pri, type SafeAlarm } from '../data'
import { CaseCard, Cite, Finding, Hmi, PriBadge, Refs } from '../ui'
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

/* ================= 제2공장 배치도 (대피 시뮬레이션과 지도가 같은 좌표를 써요) ================= */
type RoomId = 'F1' | 'F2' | 'F3' | 'OF' | 'MS'
type ExitId = 'E0' | 'E1' | 'E2' | 'E3'
type AsmId = 'A' | 'B'
type NodeId = RoomId | ExitId | AsmId | 'c1' | 'c2' | 'c3' | 'c4' | 'c45' | 'c5' | 'c6' | 'p' | 'o1' | 'o2' | 'o3' | 'o4'
/** 구역 — 인원은 data.ts SAFE_SITES(제2공장)와 같고, 사무동·자재 창고는 이 탭에서만 쓰는 가상 구역 */
const F_ZONES = SAFE_SITES[0].zones
const ROOMS: Record<RoomId, { name: string; rect: [number, number, number, number]; n: number }> = {
  F1: { name: F_ZONES[0].name, rect: [60, 60, 320, 140], n: F_ZONES[0].workers },
  F2: { name: F_ZONES[1].name, rect: [400, 60, 180, 140], n: F_ZONES[1].workers },
  F3: { name: F_ZONES[2].name, rect: [600, 60, 140, 140], n: F_ZONES[2].workers },
  OF: { name: '사무동', rect: [60, 260, 230, 100], n: 5 },
  MS: { name: '자재 창고', rect: [350, 260, 390, 100], n: 0 },
}
const ROOM_IDS = Object.keys(ROOMS) as RoomId[]
const GATE_TOTAL = ROOM_IDS.reduce((a, r) => a + ROOMS[r].n, 0)
const EXITS: Record<ExitId, { name: string; v: boolean }> = { E0: { name: '정문', v: false }, E1: { name: '비상구 1', v: true }, E2: { name: '비상구 2', v: false }, E3: { name: '비상구 3', v: true } }
const EXIT_IDS = Object.keys(EXITS) as ExitId[]
const NODE: Record<NodeId, [number, number]> = {
  F1: [220, 130], F2: [490, 130], F3: [670, 130], OF: [175, 310], MS: [545, 310],
  c1: [175, 230], c2: [220, 230], c3: [320, 230], c4: [490, 230], c45: [545, 230], c5: [670, 230], c6: [740, 230], p: [320, 320],
  E0: [320, 380], E1: [40, 130], E2: [490, 40], E3: [760, 230], A: [320, 428], B: [880, 230],
  o1: [16, 130], o2: [16, 428], o3: [490, 16], o4: [880, 16],
}
const EDGES: [NodeId, NodeId][] = [
  ['F1', 'E1'], ['F1', 'c2'], ['F2', 'c4'], ['F2', 'E2'], ['F3', 'c5'], ['OF', 'c1'], ['OF', 'p'], ['MS', 'c45'], ['MS', 'p'],
  ['c1', 'c2'], ['c2', 'c3'], ['c3', 'c4'], ['c4', 'c45'], ['c45', 'c5'], ['c5', 'c6'], ['c3', 'p'], ['p', 'E0'], ['c6', 'E3'],
  ['E0', 'A'], ['E1', 'o1'], ['o1', 'o2'], ['o2', 'A'], ['E2', 'o3'], ['o3', 'o4'], ['o4', 'B'], ['E3', 'B'],
]
/** 격리 구역: 도장 부스와 그 앞 통로 */
const HAZ: [number, number, number, number] = [400, 60, 180, 200]
const inHaz = (n: NodeId) => { const [x, y] = NODE[n]; return x >= HAZ[0] && x <= HAZ[0] + HAZ[2] && y >= HAZ[1] && y <= HAZ[1] + HAZ[3] }
const dist = (a: NodeId, b: NodeId) => Math.hypot(NODE[a][0] - NODE[b][0], NODE[a][1] - NODE[b][1])
interface Route { path: NodeId[]; unsafe: boolean; dest: AsmId }
/** 다익스트라: 다른 구역(방)은 지나가지 않고, 막힌 비상구는 못 쓰고, 격리 구역은 아주 비싸게(다른 길이 없을 때만) */
function findRoute(src: RoomId, blocked: ExitId[], haz: boolean): Route | null {
  const D = new Map<NodeId, number>([[src, 0]]), prev = new Map<NodeId, NodeId>(), done = new Set<NodeId>()
  const ok = (n: NodeId) => !(ROOM_IDS as string[]).includes(n) && !(blocked as string[]).includes(n)
  for (;;) {
    let u: NodeId | null = null
    for (const [n, d] of D) if (!done.has(n) && (u === null || d < D.get(u)!)) u = n
    if (u === null) return null
    if (u === 'A' || u === 'B') {
      const path: NodeId[] = [u]; let c: NodeId = u
      while (prev.has(c)) { c = prev.get(c)!; path.unshift(c) }
      return { path, dest: u, unsafe: haz && path.some(n => n !== src && inHaz(n)) }
    }
    done.add(u)
    for (const [a, b] of EDGES) {
      const v = a === u ? b : b === u ? a : null
      if (!v || done.has(v) || !ok(v)) continue
      const nd = D.get(u)! + dist(u, v) + (haz && inHaz(v) ? 5000 : 0)
      if (nd < (D.get(v) ?? Infinity)) { D.set(v, nd); prev.set(v, u) }
    }
  }
}
/** 확인되지 않은 2명 — 이름 대신 위치 태그 번호 */
const MISSING: { id: string; zone: RoomId; tag: string; at: [number, number]; note: string; found: boolean }[] = [
  { id: 'm1', zone: 'F2', tag: '태그 F2-6', at: [842, 282], note: '14:06 집결지 B 옆 · 집계 누락', found: true },
  { id: 'm2', zone: 'F3', tag: '태그 F3-2', at: [708, 96], note: '14:05부터 움직임 없음', found: false },
]
/** 배치도 viewBox — 왼쪽 비상구 이름표가 잘리지 않게 왼쪽 여백을 둬요 */
const EV_VB = '-60 0 1020 460'
interface EvSt { fire: boolean; haz: boolean; routes: boolean; blocked: ExitId[]; count: 0 | 4 | 5 }
const EV_NORMAL: EvSt = { fire: false, haz: false, routes: false, blocked: [], count: 0 }

function EvacSvg({ st, mini = false, bare = false, onExit, sel, onRoom }: {
  st: EvSt; mini?: boolean; bare?: boolean; onExit?: (id: ExitId) => void; sel?: string | null; onRoom?: (id: RoomId) => void
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const routes = st.routes ? ROOM_IDS.filter(r => ROOMS[r].n > 0).map(r => ({ r, rt: findRoute(r, st.blocked, st.haz) })) : []
  const cnt = st.count ? headcount(st) : null
  return (
    <g className={'ev' + (mini ? ' mini' : '')}>
      <defs>
        <pattern id={'hz' + uid} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" className="hz-bg" /><line x1="0" y1="0" x2="0" y2="10" className="hz-ln" /></pattern>
        <marker id={'ar' + uid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" className="ar" /></marker>
        <marker id={'arb' + uid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" className="ar bad" /></marker>
      </defs>
      <rect className="bld" x={40} y={40} width={720} height={340} />
      {!mini && <text className="ev-cor" x={52} y={252}>중앙 통로</text>}
      {ROOM_IDS.map(id => {
        const [x, y, w, h] = ROOMS[id].rect, on = sel === id
        const body = <>
          <rect className={'room' + (on ? ' sel' : '')} x={x} y={y} width={w} height={h} />
          {!mini && <text className="ev-rn" x={x + 12} y={y + 24}>{ROOMS[id].name}</text>}
          {!mini && <text className="ev-rc" x={x + 12} y={y + 44}>{ROOMS[id].n}명</text>}
        </>
        return onRoom ? <g key={id} className="ev-hit" role="button" tabIndex={0} aria-label={`배치도에서 ${ROOMS[id].name}`} onClick={() => onRoom(id)} onKeyDown={onKey(() => onRoom(id))}>{body}</g> : <g key={id}>{body}</g>
      })}
      {st.haz && <g>
        <rect x={HAZ[0]} y={HAZ[1]} width={HAZ[2]} height={HAZ[3]} fill={`url(#hz${uid})`} className="haz" />
        {!mini && <text className="ev-hz" x={HAZ[0] + HAZ[2] / 2} y={HAZ[1] + HAZ[3] - 10} textAnchor="middle">격리 구역 · 출입 금지</text>}
      </g>}
      {st.fire && <g>
        <PriMark p={1} x={545} y={100} s={mini ? 40 : 30} />
        {!mini && <text className="ev-fire" x={490} y={180} textAnchor="middle">연기 · 온도 급상승</text>}
      </g>}
      {routes.map(({ r, rt }) => rt && (
        <polyline key={r} className={'rt' + (rt.unsafe ? ' bad' : '')} points={rt.path.map(n => NODE[n].join(',')).join(' ')} markerMid={mini ? undefined : `url(#${rt.unsafe ? 'arb' : 'ar'}${uid})`} />
      ))}
      {routes.filter(x => !x.rt).map(({ r }) => {
        const [x, y] = NODE[r]
        return <g key={'nr' + r}><circle className="norte" cx={x} cy={y + 40} r={12} /><text className="norte-t" x={x} y={y + 45} textAnchor="middle">✕</text>{!mini && <text className="ev-warn" x={x + 18} y={y + 45}>안전한 길 없음</text>}</g>
      })}
      {!bare && EXIT_IDS.map(id => {
        const [x, y] = NODE[id], b = st.blocked.includes(id), v = EXITS[id].v, on = sel === id
        const w = v ? 12 : 40, h = v ? 40 : 12
        const lx = id === 'E1' ? x - 8 : id === 'E3' ? x + 10 : id === 'E2' ? x - 26 : x + 26, ly = id === 'E2' ? y - 4 : id === 'E0' ? y + 22 : y - 26
        const inner = <>
          <rect className="ex-hit" x={x - w / 2 - 8} y={y - h / 2 - 8} width={w + 16} height={h + 16} />
          {on && <rect className="ex-sel" x={x - w / 2 - 5} y={y - h / 2 - 5} width={w + 10} height={h + 10} rx={3} />}
          <rect className={'ex' + (b ? ' blocked' : '')} x={x - w / 2} y={y - h / 2} width={w} height={h} />
          {b && <path className="ex-x" d={`M${x - 7} ${y - 7} L${x + 7} ${y + 7} M${x + 7} ${y - 7} L${x - 7} ${y + 7}`} />}
          {!mini && <text className={'ev-ex' + (b ? ' b' : '')} x={lx} y={ly} textAnchor={id === 'E1' || id === 'E2' ? 'end' : 'start'}>{EXITS[id].name}{b ? ' · 막힘' : ''}</text>}
        </>
        return onExit ? (
          <g key={id} className="ev-hit" role="button" tabIndex={0} aria-label={`${EXITS[id].name}, ${b ? '막힘' : '열림'}. 눌러서 ${b ? '열림으로' : '막힘으로'} 표시`} onClick={() => onExit(id)} onKeyDown={onKey(() => onExit(id))}>{inner}</g>
        ) : <g key={id}>{inner}</g>
      })}
      {!bare && (['A', 'B'] as AsmId[]).map(id => {
        const [x, y] = NODE[id]
        return (
          <g key={id} className={sel === id ? 'asm-sel' : ''}>
            <rect className="asm" x={x - 46} y={y - 18} width={92} height={36} rx={18} />
            <text className="ev-asm" x={x} y={cnt && !mini ? y - 2 : y + 5} textAnchor="middle">집결지 {id}</text>
            {cnt && !mini && <text className="ev-asm-n" x={x} y={y + 12} textAnchor="middle">{cnt.arrived[id]}/{cnt.expect[id]}명</text>}
          </g>
        )
      })}
      {st.count === 5 && MISSING.map(m => (
        <g key={m.id} className={'miss' + (m.found ? ' found' : '')}>
          <circle cx={m.at[0]} cy={m.at[1]} r={11} />
          <text className="miss-q" x={m.at[0]} y={m.at[1] + 4.5} textAnchor="middle">{m.found ? '✓' : '?'}</text>
          {!mini && <text className="miss-t" x={m.at[0]} y={m.at[1] + 28} textAnchor="middle">{m.tag}</text>}
        </g>
      ))}
    </g>
  )
}
function headcount(st: EvSt) {
  const expect: Record<AsmId, number> = { A: 0, B: 0 }, arrived: Record<AsmId, number> = { A: 0, B: 0 }
  let noRoute = 0
  for (const r of ROOM_IDS) {
    if (!ROOMS[r].n) continue
    const rt = findRoute(r, st.blocked, st.haz)
    if (!rt) { noRoute += ROOMS[r].n; continue }
    expect[rt.dest] += ROOMS[r].n
    const miss = MISSING.filter(m => m.zone === r && !(st.count === 5 && m.found)).length
    arrived[rt.dest] += ROOMS[r].n - miss
  }
  const missing = st.count ? MISSING.filter(m => !(st.count === 5 && m.found)).length : 0
  return { expect, arrived, noRoute, missing }
}

/* ================= 가상 지역 · 현장 지도 데이터 ================= */
const W = 1000, H = 700, M_PER_U = 2 // 1 단위 = 2m → 지도 폭 2km
type Kind = 'det' | 'gas' | 'eq' | 'cam' | 'tag'
const KIND_NAME: Record<Kind, string> = { det: '화재 감지기', gas: '가스 센서', eq: '설비 센서', cam: 'CCTV', tag: '작업자(위치 태그)' }
interface Dev { id: string; name: string; kind: Kind; site: string; zone: string; zname: string; x: number; y: number; alarm?: SafeAlarm }
interface SitePt { id: string; name: string; kind: string; x: number; y: number; fp: [number, number, number, number] }
/** 제2공장은 배치도를 0.2배로 줄여 지도에 얹어요(같은 좌표계) */
const toMapF = (x: number, y: number): [number, number] => [208 + (x - 40) * 0.2, 176 + (y - 40) * 0.2]
const rectF = (r: [number, number, number, number]): [number, number, number, number] => { const [x, y] = toMapF(r[0], r[1]); return [x, y, r[2] * 0.2, r[3] * 0.2] }
const ZRECT: Record<string, [number, number, number, number]> = {
  F1: rectF(ROOMS.F1.rect), F2: rectF(ROOMS.F2.rect), F3: rectF(ROOMS.F3.rect),
  W1: [625, 226, 50, 80], W2: [675, 226, 50, 80], W3: [725, 226, 50, 80],
  C1: [385, 473, 55, 90], C2: [440, 473, 55, 90], C3: [495, 473, 40, 90],
}
const SITES: SitePt[] = SAFE_SITES.map(s => ({
  id: s.id, name: s.name, kind: s.kind, x: s.x * 10, y: s.y * 7,
  fp: s.id === 'F' ? [208, 176, 144, 68] : s.id === 'W' ? [625, 226, 150, 80] : [385, 473, 150, 90],
}))
/** 현장별 집결지(지도 좌표) — 제2공장은 배치도의 집결지 A·B */
const SITE_ASM: { site: string; name: string; at: [number, number] }[] = [
  { site: 'F', name: '집결 A', at: toMapF(...NODE.A) }, { site: 'F', name: '집결 B', at: toMapF(...NODE.B) },
  { site: 'W', name: '집결', at: [700, 326] }, { site: 'C', name: '집결', at: [460, 585] },
]
const SENSOR_KEY: Record<string, { key: string; kind: Kind; n: number; name: (z: string, k: number) => string }> = {
  '가연성 가스': { key: 'gas', kind: 'gas', n: 2, name: (z, k) => `${z} 가연성 가스 센서 #${k + 1}` },
  '일산화탄소': { key: 'co', kind: 'gas', n: 2, name: (z, k) => `${z} 일산화탄소 센서 #${k + 1}` },
  '산소': { key: 'o2', kind: 'gas', n: 2, name: (z, k) => `${z} 산소 센서 #${k + 1}` },
  '진동': { key: 'vib', kind: 'eq', n: 4, name: (z, k) => `${z} ${k + 1}호기 진동 센서` },
  '온도': { key: 'tmp', kind: 'eq', n: 2, name: (z, k) => `${z} 모터 온도 센서 #${k + 1}` },
}
const ALARM_AT: Record<string, string> = { 'S-101': 'F2-det0', 'S-102': 'C3-tag0', 'S-103': 'F3-gas0', 'S-104': 'C1-tag0', 'S-105': 'W3-cam0', 'S-106': 'F1-vib2' }
/** 같은 작업대에 붙어 선 작업자 — 위치 태그 좌표가 같아요 */
const STACK_ZONES = ['W2', 'F1', 'C2']

function buildArea() {
  const devs: Dev[] = []
  let seed = 11
  for (const s of SAFE_SITES) for (const z of s.zones) {
    const r = rng(seed++ * 977)
    const [x, y, w, h] = ZRECT[z.id]
    const add = (key: string, kind: Kind, n: number, name: (k: number) => string) => {
      for (let k = 0; k < n; k++) devs.push({ id: `${z.id}-${key}${k}`, name: name(k), kind, site: s.name, zone: z.id, zname: z.name, x: x + 3 + r() * (w - 6), y: y + 3 + r() * (h - 6) })
    }
    add('det', 'det', clamp(Math.round((w * h) / 150), 3, 10), k => `${z.name} 화재 감지기 #${k + 1}`)
    for (const sn of z.sensors) { const d = SENSOR_KEY[sn]; add(d.key, d.kind, d.n, k => d.name(z.name, k)) }
    add('cam', 'cam', 2, k => `${z.name} CCTV-${k + 1}`)
    add('tag', 'tag', z.workers, k => `작업자 태그 ${z.id}-${k + 1}`)
    if (STACK_ZONES.includes(z.id)) {
      const t0 = devs.find(d => d.id === `${z.id}-tag0`)!
      for (const k of [1, 2]) { const d = devs.find(v => v.id === `${z.id}-tag${k}`); if (d) { d.x = t0.x; d.y = t0.y } }
    }
  }
  for (const a of SAFE_ALARMS) devs.find(d => d.id === ALARM_AT[a.id])!.alarm = a
  return devs
}
const DEVS = buildArea()
const FIRE_AT = toMapF(490, 130)

/* ---------- 배경 지도 (회색조 / 컬러) ---------- */
const BLOCKS = (() => {
  const r = rng(404), out: [number, number, number, number][] = []
  for (let gx = 0; gx < 17; gx++) for (let gy = 0; gy < 12; gy++) {
    if (r() < 0.35) continue
    const bx = gx * 60 + 6 + r() * 8, by = gy * 60 + 6 + r() * 8, bw = 30 + r() * 18, bh = 26 + r() * 18
    if (SITES.some(s => bx < s.fp[0] + s.fp[2] + 14 && bx + bw > s.fp[0] - 14 && by < s.fp[1] + s.fp[3] + 30 && by + bh > s.fp[1] - 24)) continue
    out.push([bx, by, bw, bh])
  }
  return out
})()
const RIVER = 'M1010,150 C900,200 820,170 760,120 S640,90 520,110 S330,120 250,90 S120,60 -10,80'
const ROADS = [
  'M0,330 C200,320 420,300 600,330 S900,350 1000,340',
  'M380,0 C370,150 390,300 420,440 S470,620 480,700',
  'M0,640 C200,630 400,620 600,630 S850,610 1000,590',
  'M620,0 C610,120 600,220 610,330 S760,520 860,700',
]
const MINOR = ['M0,160 L1000,170', 'M0,450 L380,470', 'M560,470 L1000,440', 'M160,0 L190,700', 'M900,0 L940,700']
const PARKS = ['M120,400 L220,390 L230,470 L130,480Z', 'M820,420 L920,400 L950,480 L840,500Z', 'M520,380 L580,375 L585,425 L525,430Z']
const DISTRICTS: [string, number, number][] = [['북쪽 공단', 150, 280], ['물류단지', 860, 210], ['신도시 부지', 640, 560], ['주거지', 140, 560]]

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
      {labels && <text className="dist river-l" x={560} y={92} fontSize={12 * k} textAnchor="middle">가람천</text>}
    </g>
  )
}
/** 현장 건물 윤곽과 구역 */
function Sites({ k = 1, labels = true, zoneLabels = false, asm = true, sel, onZone }: { k?: number; labels?: boolean; zoneLabels?: boolean; asm?: boolean; sel?: string | null; onZone?: (id: string) => void }) {
  return (
    <g className="mp-sites">
      {SITES.map(s => <rect key={s.id} className="mp-fp" x={s.fp[0]} y={s.fp[1]} width={s.fp[2]} height={s.fp[3]} rx={1.5} />)}
      {Object.entries(ZRECT).map(([id, [x, y, w, h]]) => {
        const z = SAFE_SITES.flatMap(s => s.zones).find(v => v.id === id)!
        const body = <>
          <rect className={'mp-zone' + (sel === id ? ' sel' : '')} x={x} y={y} width={w} height={h} />
          {zoneLabels && <text className="mp-zl" x={x + 2.5 * k} y={y + 11 * k} fontSize={10 * k}>{z.name}</text>}
        </>
        return onZone ? <g key={id} className="mp-hitg" role="button" tabIndex={0} aria-label={`지도에서 ${z.name}`} onClick={() => onZone(id)} onKeyDown={onKey(() => onZone(id))}>{body}</g> : <g key={id}>{body}</g>
      })}
      {asm && SITE_ASM.map(a => (
        <g key={a.site + a.name}>
          <rect className="mp-asm" x={a.at[0] - 13 * k} y={a.at[1] - 6 * k} width={26 * k} height={12 * k} rx={6 * k} />
          <text className="mp-asm-t" x={a.at[0]} y={a.at[1] + 3.4 * k} fontSize={8.5 * k} textAnchor="middle">{a.name}</text>
        </g>
      ))}
      {labels && SITES.map(s => <text key={s.id} className="mp-sub-l" x={s.fp[0] + s.fp[2] / 2} y={s.fp[1] - 6 * k} fontSize={12 * k} textAnchor="middle">{s.name}</text>)}
    </g>
  )
}

/* ================= 1. 지도와 배치도, 무엇을 묻나 ================= */
type View = 'map' | 'plan' | 'both'
const QUESTIONS: { q: string; a: View; why: string }[] = [
  { q: '구급차가 신축 현장에 가장 빨리 닿는 길은 어디인가요?', a: 'map', why: '답은 도로·거리·방향이에요. 건물 안 배치도에는 바깥 길이 없어요.' },
  { q: '도장 부스에서 불이 났어요. 프레스 라인 작업자는 어느 문으로 나가야 하나요?', a: 'plan', why: '답은 건물 안의 길이에요. 어느 통로가 막혔고, 어느 비상구가 가까운지 봐야 해요. 지도에서는 건물이 점 하나라서 길이 안 보여요.' },
  { q: '오늘 가스 알람이 난 현장은 세 곳 중 어디인가요?', a: 'map', why: '현장이 여러 곳일 때 ‘어디서’를 묻는 질문이에요. 전체 지역 지도에 알람 배지를 얹어 봐요.' },
  { q: '화학물질 창고와 벽 하나를 사이에 둔 구역은 어디인가요?', a: 'plan', why: '구역끼리 붙어 있는지, 어느 문으로 이어지는지를 묻고 있어요. 배치도로 봐요.' },
  { q: '협력업체 작업자 몇 명이 지금 어느 현장에 들어가 있나요?', a: 'map', why: '현장별 출입 인원을 묻고 있어요. 지도 위 현장마다 인원을 붙여 봐요.' },
  { q: '작업자 무응답 알람이에요. 그 사람의 마지막 위치와 구조 경로는요?', a: 'both', why: '마지막 위치(어느 현장, 어느 구역)는 지도에서, 들어갈 길(어느 문, 어느 통로)은 배치도에서 봐요. 그래서 두 화면은 같은 이름을 쓰고, 한쪽에서 고른 구역을 다른 쪽에도 표시해야 해요.' },
]
function WhichView() {
  const [i, setI] = useState(1)
  const q = QUESTIONS[i]
  const hit = (v: 'map' | 'plan') => q.a === v || q.a === 'both'
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
          <svg viewBox="150 100 700 500" className="mp-thumb" aria-hidden="true">
            <BaseMap color={false} labels={false} />
            <Sites labels={false} asm={false} />
          </svg>
          <div><b>지도</b> · 위치 문제<p>어느 현장에 있나, 얼마나 먼가, 무엇과 가까운가</p></div>
          {hit('map') && <span className="mp-hit">이 화면으로 답해요</span>}
        </div>
        <div className={'mp-vcard' + (hit('plan') ? ' hit' : '')}>
          <svg viewBox={EV_VB} className="mp-thumb plan" aria-hidden="true">
            <EvacSvg st={{ ...EV_NORMAL, routes: true }} mini />
          </svg>
          <div><b>배치도(평면도)</b> · 건물 안 문제<p>어느 구역이 붙어 있나, 어느 문으로 나가나, 어디서 모이나</p></div>
          {hit('plan') && <span className="mp-hit">이 화면으로 답해요</span>}
        </div>
        <p className="mp-why"><b>{q.a === 'map' ? '지도' : q.a === 'plan' ? '배치도' : '둘 다'}</b> — {q.why}</p>
      </div>
    </div>
  )
}

/* ================= 2. 현장 지도: 묶음과 이상 ================= */
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
const ZNAME: Record<number, string> = { 1: '전체 지역', 2: '현장 주변', 4: '현장', 8: '구역' }
const SCALES = [20, 50, 100, 200, 500, 1000]
const sameSpot = (ds: Dev[]) => ds.every(d => Math.abs(d.x - ds[0].x) < 0.01 && Math.abs(d.y - ds[0].y) < 0.01)
/** 설비 하나를 그 종류 모양으로 (r = 화면 px → 세계 단위) */
function DevDot({ d, r, cls = '' }: { d: { kind: Kind; x: number; y: number }; r: (p: number) => number; cls?: string }) {
  const { x, y } = d
  if (d.kind === 'gas') return <rect className={'dv k-gas ' + cls} x={x - r(3.5)} y={y - r(3.5)} width={r(7)} height={r(7)} />
  if (d.kind === 'cam') return <rect className={'dv k-cam ' + cls} x={x - r(4.5)} y={y - r(3)} width={r(9)} height={r(6)} rx={r(1)} />
  if (d.kind === 'tag') return <circle className={'dv k-tag ' + cls} cx={x} cy={y} r={r(3.4)} />
  return <circle className={'dv k-' + d.kind + ' ' + cls} cx={x} cy={y} r={r(d.kind === 'eq' ? 3.6 : 2.4)} />
}

function AreaMap() {
  const devs = DEVS
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
  const alarmPts = devs.filter(d => d.alarm)
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
    const p = devs.find(d => d.id === id) ?? SITES.find(s => s.id === id)
    if (!p) return
    setSel(id); setSpider(null); setZ(8); setC([p.x, p.y])
  }

  /* 끌어서 이동, 키보드 화살표 */
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

  const selDev = devs.find(d => d.id === sel), selSite = SITES.find(s => s.id === sel)
  const selItem = sel ? vis.find(it => it.devs.some(d => d.id === sel)) : undefined
  const scaleM = SCALES.find(m => m / M_PER_U / u >= 64) ?? 1000
  const scalePx = scaleM / M_PER_U / u
  const nearest = SITES.reduce((a, s) => (Math.hypot(s.x - cx, s.y - cy) < Math.hypot(a.x - cx, a.y - cy) ? s : a))
  const r = (p: number) => p * u // 화면 px → 세계 단위
  const fireOn = inView(FIRE_AT[0], FIRE_AT[1], 40)

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
      <g key={it.key} className="mp-dev" onClick={() => clickOk() && pick(it)}>
        <circle className="mp-tap" cx={d.x} cy={d.y} r={r(9)} />
        <DevDot d={d} r={r} />
        {isSel && <circle className="mp-sel" cx={d.x} cy={d.y} r={r(10)} />}
      </g>
    )
    const n = it.devs.length, rad = r(11 + Math.min(9, Math.sqrt(n) * 1.5)), stack = sameSpot(it.devs)
    const label = `설비·작업자 ${n}개 묶음${it.top ? `, 이상 ${it.nBad}건 포함, 가장 높은 우선순위 ${it.top}` : ''}. ${z < 8 && !stack ? '눌러서 확대' : '눌러서 펼치기'}`
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
  const selAlarm = selDev?.alarm

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
          <button type="button" className="chip" aria-pressed={pull} onClick={() => setPull(v => !v)}>이상은 묶지 않기</button>
          <Seg value={colorBase ? 'c' : 'g'} onChange={v => setColorBase(v === 'c')} options={[['g', '회색조 지도'], ['c', '컬러 지도']]} />
        </div>
      </div>
      <div className="mp-city-grid">
        <Hmi title="가람산업 현장 지도 (가상)" right={<>센서·CCTV·작업자 {devs.length}개 · 이상 {alarmPts.length}건</>} className="mp-hmi">
          <div className="mp-stage" ref={box}>
            <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className={'mp-svg' + (colorBase ? ' is-color' : '') + (z > 1 ? ' can-pan' : '')} tabIndex={0}
              role="group" aria-label={`가람산업 가상 현장 지도, ${ZNAME[z]} 보기. 화살표 키로 이동, 더하기·빼기로 확대·축소`}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={keys}>
              <BaseMap color={colorBase} k={u} />
              <Sites k={u} zoneLabels={z >= 8} asm={z >= 2} />
              {fireOn && <circle className="mp-haz" cx={FIRE_AT[0]} cy={FIRE_AT[1]} r={18} />}
              <g>{normal.map(renderItem)}</g>
              {SITES.map(s => (
                <g key={s.id} className="mp-hitg" role="button" tabIndex={0} aria-label={`${s.name} 현장`} onClick={() => clickOk() && setSel(s.id)} onKeyDown={onKey(() => setSel(s.id))}>
                  <rect className="mp-site-hit" x={s.fp[0] + s.fp[2] / 2 - r(40)} y={s.fp[1] - r(22)} width={r(80)} height={r(18)} />
                  {sel === s.id && <rect className="mp-sel" x={s.fp[0] - r(4)} y={s.fp[1] - r(4)} width={s.fp[2] + r(8)} height={s.fp[3] + r(8)} />}
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
                          <circle className="mp-sp-bg" cx={x} cy={y} r={r(8)} />
                          {d.alarm ? <PriMark p={d.alarm.pri} x={x} y={y} s={r(17)} /> : <DevDot d={{ kind: d.kind, x, y }} r={(p: number) => r(p * 1.5)} />}
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
            <button type="button" className="mp-mini" aria-label="미니맵: 현재 보는 범위. 누르면 전체 지역으로" onClick={() => zoomTo(1, [W / 2, H / 2])}>
              <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
                <rect className="mm-land" width={W} height={H} />
                <path className="mm-river" d={RIVER} />
                {SITES.map(s => <rect key={s.id} className="mm-fp" x={s.fp[0]} y={s.fp[1]} width={s.fp[2]} height={s.fp[3]} />)}
                {alarmPts.map(a => <circle key={a.alarm!.id} className={'mm-al p' + a.alarm!.pri} cx={a.x} cy={a.y} r={16} />)}
                <rect className="mm-view" x={vx} y={vy} width={vw} height={vh} />
              </svg>
            </button>
          </div>
          <div className="mp-status">
            <span>보는 범위 약 {Math.round(vw * M_PER_U)}m × {Math.round(vh * M_PER_U)}m · {nearest.name} 근처</span>
            <span>화면 안 이상 <b>{visBad}</b>건{off.length > 0 && <> · 화면 밖 <b>{off.length}</b>건(가장자리 화살표)</>}</span>
          </div>
        </Hmi>

        <aside className="mp-side">
          <div className="mp-panel" aria-live="polite">
            {selDev ? (
              <>
                <small>{KIND_NAME[selDev.kind]} · {selDev.site} · {selDev.zname}</small>
                <b className="mp-pname">{selDev.name}</b>
                {selAlarm ? (
                  <div className="mp-palarm">
                    <PriBadge p={selAlarm.pri} label />
                    <span>{selAlarm.what}</span>
                    <small>대응: {selAlarm.action} · {PRI[selAlarm.pri].respond}</small>
                    {selAlarm.type === 'fire' && <a href="#dash-map-evac" onClick={e => { e.preventDefault(); document.getElementById('dash-map-evac')?.scrollIntoView({ behavior: 'smooth' }) }}>배치도에서 대피 경로 보기 →</a>}
                  </div>
                ) : <span className="mp-ok">정상 · 알람 없음</span>}
                {selDev.kind === 'tag' && <small className="muted">작업자는 이름 대신 태그 번호로 보여줘요. 연락처는 권한이 있는 사람만 열어요.</small>}
                {!selItem?.devs.every(d => d.id === sel) && selItem && <small className="muted">지금 확대 단계에서는 {selItem.devs.length}개짜리 묶음 안에 들어 있어요(테두리로 표시).</small>}
              </>
            ) : selSite ? (
              <>
                <small>현장 · {selSite.kind}</small>
                <b className="mp-pname">{selSite.name}</b>
                <ul className="mp-zlist">
                  {SAFE_SITES.find(s => s.id === selSite.id)!.zones.map(zz => {
                    const a = devs.find(d => d.zone === zz.id && d.alarm)?.alarm
                    return <li key={zz.id}><span>{zz.name}</span><b>{zz.workers}명</b>{a ? <PriBadge p={a.pri} /> : <i />}</li>
                  })}
                </ul>
              </>
            ) : (
              <><small>선택 없음</small><b className="mp-pname">센서·작업자나 묶음을 눌러 보세요</b><span className="muted">묶음을 누르면 그 자리로 확대돼요. 같은 작업대에 붙어 선 작업자처럼 겹친 점은 가장 크게 확대한 ‘구역’ 단계에서 누르면 둥글게 펼쳐져요.</span></>
            )}
          </div>
          <div className="mp-alist">
            <b>알람에서 바로 위치로</b>
            <ul>
              {[...SAFE_ALARMS].sort((a, b) => a.pri - b.pri).map(a => {
                const id = ALARM_AT[a.id]
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
        {(['det', 'gas', 'eq', 'cam', 'tag'] as Kind[]).map(k => (
          <span key={k}><svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true"><DevDot d={{ kind: k, x: 0, y: 0 }} r={p => p * 1.3} cls="lg" /></svg>{KIND_NAME[k]}</span>
        ))}
        <span><svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true"><circle className="lg-cl" r="9" /></svg>묶음(숫자 = 개수)</span>
        <span><svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"><rect className="lg-asm" x="1" y="1" width="26" height="12" rx="6" /></svg>집결지</span>
        <span><svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true"><circle className="lg-haz" r="8" /></svg>격리 구역</span>
        <span className="lg-pri"><PriBadge p={1} label /><PriBadge p={2} label /><PriBadge p={3} label /></span>
      </div>
    </div>
  )
}

/* ================= 3. 겹침 처리 ================= */
type OvMode = 'raw' | 'top' | 'cluster' | 'spider' | 'list'
const OV_PTS: { x: number; y: number; k: Kind | 'alarm'; name: string }[] = [
  { x: 160, y: 100, k: 'alarm', name: '상하차장 CCTV-1 · 안전모 미착용' },
  { x: 162, y: 98, k: 'tag', name: '작업자 태그 W3-4' },
  { x: 162, y: 98, k: 'tag', name: '작업자 태그 W3-5' },
  { x: 162, y: 98, k: 'tag', name: '작업자 태그 W3-6' },
  { x: 150, y: 106, k: 'det', name: '상하차장 화재 감지기 #2' },
  { x: 171, y: 92, k: 'det', name: '상하차장 화재 감지기 #3' },
  { x: 168, y: 108, k: 'gas', name: '상하차장 일산화탄소 센서 #1' },
]
const OV_TEXT: Record<OvMode, [string, string]> = {
  raw: ['그대로 그리기', '데이터가 들어온 순서대로 그렸어요. 알람이 가장 먼저 그려져서 작업자 점 밑에 깔렸어요. 몇 개가 겹쳤는지, 이상이 있는지 알 수 없어요.'],
  top: ['이상은 맨 위', '그리는 순서를 바꿔서 이상은 늘 맨 위에 그려요. 사용자가 선택한 점은 그보다도 위에 그려요. 겹침 처리에서 가장 먼저 할 일이에요.'],
  cluster: ['묶음 + 이상 배지', '몇 개가 겹쳤는지는 숫자로 보여줘요. 그 안에서 가장 급한 알람의 우선순위는 배지로 붙여요. 그래서 이상이 묶음 속에 묻히지 않아요.'],
  spider: ['펼치기', '한 작업대에 세 사람이 붙어 서 있으면 위치 태그 좌표가 거의 같아요. 아무리 확대해도 겹쳐요. 이럴 땐 둥글게 펼치고, 선으로 원래 자리와 이어 줘요.'],
  list: ['목록으로 보기', '펼쳐도 너무 많으면 목록이 나아요. 이상을 맨 위에 두고, 급한 순서대로 정렬해요.'],
}
function Overlap() {
  const [m, setM] = useState<OvMode>('raw')
  const draw = m === 'raw' ? OV_PTS : [...OV_PTS].sort((a, b) => (a.k === 'alarm' ? 1 : 0) - (b.k === 'alarm' ? 1 : 0))
  const one = (p: typeof OV_PTS[number], x = p.x, y = p.y, big = false, key?: string) => p.k === 'alarm'
    ? <PriMark key={key} p={3} x={x} y={y} s={big ? 17 : 12} />
    : <DevDot key={key} d={{ kind: p.k, x, y }} r={v => v * (big ? 1.6 : 2.2)} cls="ov" />
  return (
    <div className="mp-ov">
      <Seg value={m} onChange={setM} options={(Object.keys(OV_TEXT) as OvMode[]).map(k => [k, OV_TEXT[k][0]] as const)} />
      <div className="mp-ov-grid">
        <Hmi title="물류센터 상하차장 한쪽" right="구역 배율">
          <svg viewBox="40 30 240 140" className="mp-ov-svg" role="img" aria-label={`겹침 처리: ${OV_TEXT[m][0]}`}>
            <rect className="ov-floor" x={40} y={30} width={240} height={140} />
            <path className="ov-road" d="M40,150 C120,140 200,130 280,128" />
            <line className="ov-wall" x1={40} y1={60} x2={280} y2={60} />
            {(m === 'raw' || m === 'top') && draw.map((p, i) => one(p, p.x, p.y, false, 'p' + i))}
            {(m === 'cluster' || m === 'list') && <g>
              <circle className="ov-cl" cx={161} cy={100} r={17} />
              <text className="ov-cl-n" x={161} y={105} textAnchor="middle">{OV_PTS.length}</text>
              <PriMark p={3} x={175} y={86} s={15} />
            </g>}
            {m === 'spider' && <g>
              {OV_PTS.map((p, i) => {
                const a = (i / OV_PTS.length) * Math.PI * 2 - Math.PI / 2, x = 161 + Math.cos(a) * 44, y = 100 + Math.sin(a) * 44
                return <g key={i}><line className="ov-leg" x1={p.x} y1={p.y} x2={x} y2={y} /><circle className="ov-sp-bg" cx={x} cy={y} r={10} />{one(p, x, y, true)}</g>
              })}
            </g>}
          </svg>
          {m === 'list' && (
            <ul className="mp-ov-list" aria-label="겹친 점 목록">
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
            <li>그리는 순서: 정상 점 → 묶음 → 이상(덜 급한 것부터) → 선택한 점. 나중에 그린 것이 위에 올라와요.</li>
            <li>이름표끼리 겹치면 이름표를 숨겨요. 이상과 선택한 점의 이름만 남겨요.</li>
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
  const vb = '180 140 640 380'
  const pts = DEVS.filter(d => d.kind !== 'tag' && d.x > 180 && d.x < 820 && d.y > 140 && d.y < 520)
  const rr = (p: number) => p * 1.15
  const panel = (color: boolean) => (
    <figure className="mp-bc-fig">
      <svg viewBox={vb} className={'mp-bc-svg' + (color ? ' is-color' : '')} role="img" aria-label={color ? '컬러 배경 지도 위 알람' : '회색조 배경 지도 위 알람'}>
        <g style={{ opacity: color ? 1 : dim / 100 }}><BaseMap color={color} k={0.6} /></g>
        <Sites k={0.9} asm={false} labels={false} />
        {pts.filter(d => !d.alarm).map(d => <DevDot key={d.id} d={d} r={rr} cls={color ? 'g' : ''} />)}
        {pts.filter(d => d.alarm).map(d => <PriMark key={d.id} p={d.alarm!.pri} x={d.x} y={d.y} s={30} />)}
      </svg>
      <figcaption>{color ? '컬러 지도 · 정상 센서 초록' : '회색조 지도 · 정상 센서 회색'}</figcaption>
    </figure>
  )
  return (
    <div className="mp-bc">
      <div className="mp-bc-grid">{panel(true)}{panel(false)}</div>
      <label className="mp-bc-slider">
        <span>오른쪽 배경 지도 진하기 <b>{dim}%</b></span>
        <input type="range" min={20} max={100} value={dim} onChange={e => setDim(+e.target.value)} style={{ ['--p' as string]: ((dim - 20) / 80) * 100 + '%' }} />
      </label>
      <p className="mp-bc-q">두 지도에는 같은 알람 4건(<PriBadge p={1} /> 도장 부스 화재 · <PriBadge p={2} /> 화학물질 창고 가스 · <PriBadge p={3} /> 프레스 진동 · <PriBadge p={3} /> 상하차장 보호구)이 있어요. 왼쪽 컬러 지도에서는 노란 알람이 주황 도로, 초록 센서와 섞여서 눈에 덜 띄어요.</p>
    </div>
  )
}

/* ================= 5. 배치도: 격리 → 대피 경로 → 인원 확인 ================= */
const STEPS: { t: string; d: string; at: string; st: EvSt; log: string }[] = [
  { t: '평상시', at: '14:00:00', st: EV_NORMAL, log: '평상시. 출입 기록상 제2공장 안에 27명.',
    d: '제2공장 배치도예요. 구역마다 지금 몇 명이 있는지 보여요(출입 기록 기준). 비상구 4곳과 집결지 2곳은 평소에도 늘 그려 둬요.' },
  { t: '화재 감지', at: '14:02:08', st: { ...EV_NORMAL, fire: true }, log: 'S-101 도장 부스 연기 감지기 2개 + 온도 급상승. 우선순위 1.',
    d: '도장 부스에서 연기 감지기 2개와 온도 급상승이 함께 떴어요. 지도에는 위치만 찍히면 안 돼요. 이 구역에 6명이 있다는 것까지 같이 보여야 해요.' },
  { t: '사고 구역 격리', at: '14:02:40', st: { ...EV_NORMAL, fire: true, haz: true }, log: '도장 부스 작업 중지, 방화문 닫음. 도장 부스와 앞 통로를 격리 구역으로 지정.',
    d: '도장 부스 작업을 멈추고 방화문을 닫아요. 도장 부스와 그 앞 통로를 ‘격리 구역’으로 묶어요. 이제 다른 구역 사람은 이 통로를 지나면 안 돼요.' },
  { t: '대피 경로 안내', at: '14:03:10', st: { ...EV_NORMAL, fire: true, haz: true, routes: true }, log: '대피 방송. 구역별 대피 경로 표시 — 격리 구역을 피해 정문·비상구 2·비상구 3으로.',
    d: '격리 구역을 피해서 구역마다 대피 경로를 계산해요. 프레스 라인과 사무동은 정문으로 나가 집결지 A로, 도장 부스와 화학물질 창고는 집결지 B로 가요. 비상구를 눌러 막아 보세요. 경로가 다시 계산돼요.' },
  { t: '인원 확인', at: '14:08:00', st: { ...EV_NORMAL, fire: true, haz: true, routes: true, count: 4 }, log: '집결지 A 19명, B 6명 도착. 출입 기록 27명 → 확인 안 된 사람 2명.',
    d: '집결지마다 도착한 사람을 세고 출입 기록과 맞춰요. 출입 기록은 27명인데 집결지에는 25명이에요. 2명이 확인되지 않았어요. 화면이 이 뺄셈을 대신 해 줘야 해요.' },
  { t: '미확인 인원 찾기', at: '14:09:30', st: { ...EV_NORMAL, fire: true, haz: true, routes: true, count: 5 }, log: '태그 F2-6: 집결지 B 옆에서 확인(집계 누락). 태그 F3-2: 화학물질 창고 안쪽, 소방대에 위치 전달.',
    d: '위치 태그의 마지막 위치를 봐요. 1명은 집결지 B 옆에 있었어요(세는 데서 빠짐). 다른 1명은 화학물질 창고 안쪽에서 움직임이 없어요. 소방대에 그 위치를 바로 전달해요.' },
]

function EvacSim() {
  const [step, setStep] = useState(0)
  const [st, setSt] = useState<EvSt>(EV_NORMAL)
  const [manual, setManual] = useState(false)
  const [log, setLog] = useState<{ t: string; m: string; bad?: boolean }[]>([{ t: STEPS[0].at, m: STEPS[0].log }])
  const clock = useRef(0)
  const go = (i: number) => {
    setStep(i); setManual(false); setSt(STEPS[i].st)
    clock.current = 0
    setLog(STEPS.slice(0, i + 1).map(s => ({ t: s.at, m: s.log })).reverse())
  }
  const toggle = (id: ExitId) => {
    const blocked = st.blocked.includes(id) ? st.blocked.filter(b => b !== id) : [...st.blocked, id]
    const next: EvSt = { ...st, blocked, routes: true }
    clock.current += 10
    const last = STEPS[step].at.split(':').map(Number)
    const sec = last[0] * 3600 + last[1] * 60 + last[2] + clock.current
    const t = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map(v => String(v).padStart(2, '0')).join(':')
    const add: { t: string; m: string; bad?: boolean }[] = [{ t, m: `${EXITS[id].name} ${blocked.includes(id) ? '막힘으로 표시' : '다시 열림'} — 경로 다시 계산` }]
    for (const r of ROOM_IDS) {
      if (!ROOMS[r].n) continue
      const rt = findRoute(r, blocked, next.haz)
      if (!rt) add.push({ t, m: `${ROOMS[r].name}: 나갈 길이 없어요 — 구조 요청`, bad: true })
      else if (rt.unsafe) add.push({ t, m: `${ROOMS[r].name}: 안전한 길이 없어 격리 구역을 지나요 — 현장 안내 필요`, bad: true })
    }
    setSt(next); setManual(true)
    setLog(l => [...add.reverse(), ...l].slice(0, 12))
  }
  const hc = headcount({ ...st, count: st.count || 4 })
  const cur = STEPS[step]
  const showCount = st.count > 0
  return (
    <div className="mp-flisr">
      <ol className="mp-steps" aria-label="대피 단계">
        {STEPS.map((s, i) => (
          <li key={i}><button type="button" className={'mp-step' + (i === step && !manual ? ' on' : '') + (i < step ? ' done' : '')} aria-pressed={i === step && !manual} onClick={() => go(i)}>
            <span className="n">{i}</span><span>{s.t}</span>
          </button></li>
        ))}
      </ol>
      <Hmi title="제2공장 배치도 · 대피 경로" right={<>출입 기록 <b>{GATE_TOTAL}명</b>{showCount && <> · 미확인 <b className={hc.missing ? 'mp-out' : ''}>{hc.missing}명</b></>}</>} className="mp-sld-hmi">
        <div className="mp-sld-scroll">
          <svg viewBox={EV_VB} className="mp-ev-svg" role="group" aria-label="제2공장 배치도. 비상구를 눌러 막힘·열림을 바꿀 수 있어요.">
            <EvacSvg st={st} onExit={toggle} />
          </svg>
        </div>
        <div className="mp-sld-legend" aria-label="배치도 범례">
          <span><i className="l rt" />대피 경로</span><span><i className="l bad" />격리 구역을 지나는 경로</span><span><i className="hz" />격리 구역</span>
          <span><i className="sq" />비상구(열림)</span><span><i className="sq b" />막힘</span><span><i className="asm" />집결지</span><span><i className="ms" />확인 안 된 위치 태그</span>
        </div>
      </Hmi>
      <div className="mp-flisr-grid">
        <div className="mp-flisr-say" aria-live="polite">
          {manual ? <><b>직접 조작 중</b><p>비상구를 눌러 막힘·열림을 바꿔 보세요. 경로가 다시 계산돼요. 안전한 길이 없으면 경로가 빨간 점선으로 바뀌고 기록에 경고가 남아요. 단계 버튼을 누르면 정해진 순서로 돌아가요.</p></>
            : <><b>{step}. {cur.t}</b><p>{cur.d}</p></>}
          <div className="mp-row">
            <button type="button" className="btn sm ghost" disabled={step === 0 && !manual} onClick={() => go(Math.max(0, manual ? step : step - 1))}>{manual ? '이 단계로 되돌리기' : '이전 단계'}</button>
            <button type="button" className="btn sm" disabled={step === STEPS.length - 1 && !manual} onClick={() => go(Math.min(STEPS.length - 1, step + 1))}>다음 단계</button>
          </div>
        </div>
        <div className="mp-flisr-load">
          <b>인원 확인 {showCount ? '' : '(예상)'}</b>
          <div className="mp-hc">
            <div><small>출입 기록</small><b>{GATE_TOTAL}명</b></div>
            {(['A', 'B'] as AsmId[]).map(a => (
              <div key={a}><small>집결지 {a}</small><b>{showCount ? `${hc.arrived[a]}/${hc.expect[a]}` : hc.expect[a]}명</b></div>
            ))}
            <div className={showCount && hc.missing ? 'bad' : ''}><small>{showCount ? '미확인' : '나갈 길 없음'}</small><b>{showCount ? hc.missing : hc.noRoute}명</b></div>
          </div>
          {st.count === 5 && <ul className="mp-miss">{MISSING.map(m => <li key={m.id} className={m.found ? '' : 'bad'}><b>{m.tag}</b><span>{m.note}</span></li>)}</ul>}
          <small className="muted">집결지 숫자는 ‘도착/와야 할 인원’이에요. 와야 할 인원은 대피 경로가 어느 집결지로 가는지로 계산해요. 비상구를 막으면 이 숫자도 바뀌어요.</small>
        </div>
        <div className="mp-flisr-log">
          <b>조치 기록</b>
          <ol>{log.map((e, i) => <li key={i} className={e.bad ? 'bad' : ''}><time>{e.t}</time><span>{e.m}</span></li>)}</ol>
        </div>
      </div>
    </div>
  )
}

/* ================= 6. 지도 ↔ 배치도 같이 보기 ================= */
type LinkId = RoomId | ExitId | AsmId
const LINK_NAME = (id: LinkId) => (id in ROOMS ? ROOMS[id as RoomId].name : id in EXITS ? EXITS[id as ExitId].name : `집결지 ${id}`)
const ZONE_OF: Record<string, RoomId> = { F1: 'F1', F2: 'F2', F3: 'F3' }
function LinkedViews() {
  const [sel, setSel] = useState<LinkId | null>('F3')
  const [linked, setLinked] = useState(true)
  const [lastFrom, setLastFrom] = useState<'map' | 'plan'>('map')
  const pick = (id: LinkId, from: 'map' | 'plan') => { setSel(id); setLastFrom(from) }
  const show = (where: 'map' | 'plan') => (linked || lastFrom === where ? sel : null)
  const mapSel = show('map')
  return (
    <div className="mp-link">
      <div className="mp-row">
        <button type="button" className="chip" aria-pressed={linked} onClick={() => setLinked(v => !v)}>두 화면 선택 연결</button>
        <span className="muted" aria-live="polite">{sel ? <>선택: <b>{LINK_NAME(sel)}</b>{!linked && ` — ${lastFrom === 'map' ? '배치도' : '지도'}에서는 다시 찾아야 해요`}</> : '구역이나 비상구를 눌러 보세요'}</span>
      </div>
      <div className="mp-link-grid">
        <Hmi title="지도 · 제2공장 주변" right="위치">
          <svg viewBox="186 150 214 120" className="mp-link-svg" role="group" aria-label="제2공장 주변 지도">
            <BaseMap color={false} labels={false} k={0.3} />
            <Sites k={0.3} labels={false} asm={false} sel={mapSel && mapSel in ZONE_OF ? mapSel : null} onZone={id => ZONE_OF[id] && pick(ZONE_OF[id], 'map')} />
            {(['E0', 'E1', 'E2', 'E3', 'A', 'B'] as LinkId[]).map(id => {
              const [x, y] = toMapF(...NODE[id as NodeId]), on = mapSel === id, asm = id === 'A' || id === 'B'
              return (
                <g key={id} className="mp-hitg" role="button" tabIndex={0} aria-label={`지도에서 ${LINK_NAME(id)}`} onClick={() => pick(id, 'map')} onKeyDown={onKey(() => pick(id, 'map'))}>
                  <rect className="mp-site-hit" x={x - 6} y={y - 6} width={12} height={12} />
                  {on && <circle className="mp-sel" cx={x} cy={y} r={7} />}
                  {asm ? <rect className="mp-asm" x={x - 7} y={y - 3.5} width={14} height={7} rx={3.5} /> : <rect className="mp-lsw" x={x - 2.5} y={y - 2.5} width={5} height={5} />}
                  {on && <text className="mp-lab on" x={x} y={y - 8} fontSize={6} textAnchor="middle">{LINK_NAME(id)}</text>}
                </g>
              )
            })}
            {mapSel && mapSel in ZONE_OF && (() => { const [x, y, w] = ZRECT[mapSel]; return <text className="mp-lab on" x={x + w / 2} y={y - 3} fontSize={6} textAnchor="middle">{LINK_NAME(mapSel)}</text> })()}
          </svg>
        </Hmi>
        <Hmi title="배치도 · 같은 공장" right="건물 안">
          <div className="mp-sld-scroll">
            <svg viewBox={EV_VB} className="mp-ev-svg sm" role="group" aria-label="같은 공장의 배치도">
              <EvacSvg st={EV_NORMAL} sel={show('plan')} onRoom={id => pick(id, 'plan')} onExit={id => pick(id, 'plan')} />
            </svg>
          </div>
        </Hmi>
      </div>
    </div>
  )
}

/* ================= 7. 지도 화면에 늘 있어야 할 것 ================= */
const CHROME: { t: string; d: string; cls: string; el: ReactNode }[] = [
  { t: '범례', cls: 'leg', el: <>■ ▲ ● 범례</>, d: '지도 위 모양과 색이 각각 무슨 뜻인지 알려 줘요. 우선순위 배지(색 + 모양 + 숫자)와 점 종류(감지기·가스·CCTV·작업자)를 함께 넣어요.' },
  { t: '축척', cls: 'scale', el: <><i />100m</>, d: '“여기서 집결지까지 몇 m?”에 바로 답해요. 확대할 때마다 막대 길이를 다시 계산해요.' },
  { t: '현재 보는 범위', cls: 'mini', el: <i />, d: '지금 어디를 보고 있는지 알려 줘요. 미니맵(작은 전체 지도)의 사각형이나 “보는 범위 250m × 175m · 제2공장 근처” 같은 글로 보여줘요.' },
  { t: '화면 밖 이상', cls: 'off', el: <>◀ <i className="tri" /></>, d: '확대해서 보는 동안 화면 밖에서 알람이 생길 수 있어요. 그럴 땐 화면 가장자리에 그쪽을 가리키는 화살표를 둬요.' },
  { t: '방위', cls: 'north', el: <>북 ↑</>, d: '지도가 돌아가지 않더라도 “위가 북쪽”이라고 적어 둬요. 현장 작업자와 무전할 때 방향이 서로 맞아요.' },
  { t: '갱신 시각', cls: 'upd', el: <>갱신 14:05:20</>, d: '센서 자리는 그대로여도 상태와 작업자 위치는 계속 바뀌어요. 마지막으로 새 데이터를 받은 시각을 늘 보여줘요.' },
  { t: '레이어 켜고 끄기', cls: 'lay', el: <>센서 · CCTV · 작업자</>, d: '센서·CCTV·작업자처럼 지도에 겹쳐 그리는 층(레이어)을 켜고 끌 수 있게 해요. 단, 알람과 대피 경로 레이어는 끌 수 없게 해요.' },
  { t: '비상구 · 집결지', cls: 'asm', el: <>집결 A</>, d: '사고가 나면 가장 먼저 묻는 게 “어디로 나가나, 어디서 모이나”예요. 비상구와 집결지는 평소에도 지도에 늘 그려 둬요.' },
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

/* ================= 0. 흔한 실수 ================= */
/** 목업용 배치도 점 — 구역마다 센서 몇 개 */
const MK_DOTS = (() => {
  const r = rng(61), out: { x: number; y: number; room: RoomId }[] = []
  for (const id of ROOM_IDS) { const [x, y, w, h] = ROOMS[id].rect; for (let k = 0; k < 6; k++) out.push({ x: x + 20 + r() * (w - 40), y: y + 56 + r() * (h - 70), room: id }) }
  return out
})()
function MkPlan({ dark, children }: { dark?: boolean; children?: ReactNode }) {
  return (
    <svg viewBox={EV_VB} className={'mk-plan' + (dark ? ' dark' : '')} aria-hidden="true">
      <rect className="bld" x={40} y={40} width={720} height={340} />
      {ROOM_IDS.map(id => { const [x, y, w, h] = ROOMS[id].rect; return <g key={id}><rect className="room" x={x} y={y} width={w} height={h} /><text className="rn" x={x + 12} y={y + 26}>{ROOMS[id].name}</text></g> })}
      {children}
    </svg>
  )
}
function MkLegendBefore() {
  const col = (i: number) => (i % 7 === 3 ? 'blue' : 'green')
  return (
    <Hmi dark title="현장 지도" right={<span className="mk-red">● 사고 3</span>} className="mp-mk">
      <MkPlan dark>
        {MK_DOTS.map((d, i) => <circle key={i} className={'mk-d ' + col(i)} cx={d.x} cy={d.y} r={9} />)}
        <circle className="mk-d red" cx={490} cy={110} r={11} /><circle className="mk-d red" cx={680} cy={110} r={11} /><circle className="mk-d red" cx={200} cy={110} r={11} />
      </MkPlan>
      <div className="mk-leg"><span><i className="green" />정상</span><span><i className="blue" />예정</span><span><i className="red" />사고</span></div>
      <p className="mk-foot">화재도, 가스도, 진동도 모두 같은 빨간 점이에요. 색을 구분하지 못하면 셋 다 안 보여요</p>
    </Hmi>
  )
}
function MkLegendAfter() {
  return (
    <Hmi title="현장 지도" right="이상 3 · 긴급 1" className="mp-mk up">
      <MkPlan>
        {MK_DOTS.map((d, i) => <circle key={i} className="mk-d gray" cx={d.x} cy={d.y} r={6} />)}
        <PriMark p={1} x={490} y={110} s={34} /><PriMark p={2} x={680} y={110} s={34} /><PriMark p={3} x={200} y={110} s={34} />
      </MkPlan>
      <div className="mk-leg"><PriBadge p={1} label /><PriBadge p={2} label /><PriBadge p={3} label /><span><i className="gray" />정상(회색)</span></div>
      <p className="mk-sub">정상은 회색 점으로 물러나고, 이상만 색 + 모양 + 숫자로 떠요. ‘예정’ 같은 평범한 상태는 색을 쓰지 않아요</p>
    </Hmi>
  )
}
function MkPopupBefore() {
  return (
    <Hmi dark title="현장 지도" right={<span className="mk-red">● 화재</span>} className="mp-mk">
      <div className="mk-pop-wrap">
        <MkPlan dark>
          {MK_DOTS.map((d, i) => <circle key={i} className="mk-d green" cx={d.x} cy={d.y} r={9} />)}
          <circle className="mk-d red" cx={490} cy={110} r={12} /><circle className="mk-d red" cx={640} cy={140} r={12} />
        </MkPlan>
        <div className="mk-pop">
          <b className="mk-red">화재 발생!!</b>
          <span>제2공장 도장 부스</span>
          <span className="mk-vid">CCTV 영상</span>
          <span>발생 14:02:08 · 담당자 연락처 · 조치 이력 · 관련 문서</span>
          <span className="mk-x">닫기 ✕</span>
        </div>
      </div>
      <p className="mk-foot">팝업이 처음부터 열려 지도 가운데를 덮어요. 바로 옆 화학물질 창고의 가스 알람이 그 밑에 깔렸어요</p>
    </Hmi>
  )
}
function MkPopupAfter() {
  return (
    <Hmi title="현장 지도" right="이상 2" className="mp-mk up">
      <div className="mk-side">
        <MkPlan>
          {MK_DOTS.map((d, i) => <circle key={i} className="mk-d gray" cx={d.x} cy={d.y} r={6} />)}
          <PriMark p={1} x={490} y={110} s={34} /><PriMark p={2} x={640} y={140} s={34} />
          <rect className="mk-callout" x={402} y={146} width={176} height={34} rx={4} /><text className="mk-callout-t" x={490} y={169} textAnchor="middle">화재 · 6명</text>
        </MkPlan>
        <div className="mk-panel">
          <b>선택: 도장 부스</b>
          <span><PriBadge p={1} /> 연기 + 온도 급상승</span>
          <span>먼저: 작업 중지 · 대피 방송</span>
          <small>자세한 정보는 누를 때만 이 칸에 열려요</small>
        </div>
      </div>
    </Hmi>
  )
}
function MkClusterBefore() {
  const C: [number, number, number][] = [[200, 130, 31], [500, 130, 24], [670, 130, 12], [180, 310, 9], [540, 310, 18]]
  return (
    <Hmi dark title="현장 지도 · 전체" right={<span className="mk-ok">● 시스템 정상</span>} className="mp-mk">
      <MkPlan dark>{C.map(([x, y, n], i) => <g key={i}><circle className="mk-cl dark" cx={x} cy={y} r={30} /><text className="mk-cl-n dark" x={x} y={y + 9} textAnchor="middle">{n}</text></g>)}</MkPlan>
      <p className="mk-foot">숫자 원 안에 화재 알람이 들어 있지만 겉모습은 다른 원과 똑같아요</p>
    </Hmi>
  )
}
function MkClusterAfter() {
  const C: [number, number, number, Pri | 0][] = [[200, 130, 31, 3], [500, 130, 24, 1], [670, 130, 12, 2], [180, 310, 9, 0], [540, 310, 18, 0]]
  return (
    <Hmi title="현장 지도 · 전체" right="이상 3 · 긴급 1" className="mp-mk up">
      <MkPlan>{C.map(([x, y, n, p], i) => <g key={i}><circle className="mk-cl" cx={x} cy={y} r={30} /><text className="mk-cl-n" x={x} y={y + 9} textAnchor="middle">{n}</text>{p ? <PriMark p={p} x={x + 26} y={y - 26} s={30} /> : null}</g>)}</MkPlan>
      <p className="mk-sub">묶음마다 그 안에서 가장 급한 알람의 배지를 붙여요. 긴급 알람은 아예 묶지 않고 따로 그려도 돼요</p>
    </Hmi>
  )
}
function MkEvacBefore() {
  return (
    <Hmi dark title="제2공장" right={<span className="mk-red">● 화재 발생</span>} className="mp-mk">
      <svg viewBox={EV_VB} className="mk-plan dark" aria-hidden="true"><EvacSvg st={{ ...EV_NORMAL, fire: true }} bare /></svg>
      <p className="mk-foot">불이 난 자리는 보이지만 어디로 나가야 하는지, 몇 명이 남았는지는 없어요. 인원은 종이 명단으로 세요</p>
    </Hmi>
  )
}
function MkEvacAfter() {
  const st: EvSt = { ...EV_NORMAL, fire: true, haz: true, routes: true, count: 4 }
  const hc = headcount(st)
  return (
    <Hmi title="제2공장 · 대피 중" right={<>출입 기록 {GATE_TOTAL}명 · 미확인 <b className="mp-out">{hc.missing}명</b></>} className="mp-mk up">
      <svg viewBox={EV_VB} className="mk-plan" aria-hidden="true"><EvacSvg st={st} /></svg>
      <p className="mk-sub">격리 구역, 피해 가는 경로, 집결지별 도착/와야 할 인원, 미확인 인원이 한 화면에 있어요</p>
    </Hmi>
  )
}
function Mistakes() {
  return (
    <div className="mp-cases">
      <CaseCard sev="치명" title="대피 경로와 집결지가 지도에 없어요 — 불은 보이는데 ‘어디로, 몇 명’이 없어요"
        before={<MkEvacBefore />} after={<MkEvacAfter />}
        now={<>지도에는 센서와 알람 위치만 있어요. 화재가 나면 빨간 점이 깜빡이지만, 비상구·대피 경로·집결지는 벽에 붙은 종이 대피도에만 있어요. 인원은 집결지에서 종이 명단으로 세요.</>}
        why={<>안전관리 화면이 해서는 안 되는 일이에요. 사고 때 근무자가 알아야 할 것은 ‘불이 어디냐’에서 끝나지 않아요. ‘어디로 내보내나, 다 나왔나’를 미리 내다봐야 해요(상황 인식의 예측 단계) <Cite n={5} />. 이 계산을 사람 머리와 종이에 맡기면 가장 급할 때 가장 느려져요.</>}
        fix={<>배치도에 비상구와 집결지를 <b>평소에도</b> 그려 둬요. 사고가 나면 격리 구역을 칠하고, 그 구역을 피하는 경로를 계산해 보여줘요. 집결지마다 ‘도착/와야 할 인원’을 세고, 출입 기록과의 차이(미확인)를 맨 위에 띄워요. 아래 ‘배치도로 대피 따라 하기’가 그 화면이에요.</>} />
      <CaseCard sev="치명" title="묶음 안에 숨은 긴급 알람이 안 보여요"
        before={<MkClusterBefore />} after={<MkClusterAfter />}
        now={<>멀리서 보면 점들이 숫자 원으로 묶여요. 그 안에 화재 알람이 들어 있어도 원은 다른 원과 똑같은 모양이에요. 오른쪽 위에는 ‘시스템 정상’ 초록 불이 켜져 있어요.</>}
        why={<>숫자는 읽어야 알 수 있어요. 색·모양은 따로 집중하지 않아도 저절로 튀어 보여요(전주의 처리) <Cite n={4} />. 묶음이 숫자만 보여주면 가장 급한 정보가 가장 안 보이는 곳에 숨어요.</>}
        fix={<>묶음마다 그 안에서 <b>가장 급한 알람의 우선순위 배지</b>를 붙여요. 긴급 알람은 아예 묶지 않고 따로 그려요. 둘 다 켜 두는 게 가장 안전해요. 아래 현장 지도에서 직접 켜고 꺼 보세요.</>} />
      <CaseCard sev="높음" title="범례가 ‘정상·예정·사고’ 3색뿐이에요 — 화재와 진동이 같은 빨간 점"
        before={<MkLegendBefore />} after={<MkLegendAfter />}
        now={<>지도 범례에 초록 ‘정상’, 파랑 ‘예정’, 빨강 ‘사고’ 세 가지만 있어요. 화재도, 가스도, 진동 경고도 모두 같은 빨간 점이에요. 정상인 점 수십 개가 초록으로 빛나요.</>}
        why={<>우선순위가 없으니 무엇부터 볼지 알 수 없어요. 정상에 초록을 쓰면 화면이 색으로 가득 차서 진짜 이상이 덜 튀어요 <Cite n={2} />. 색만으로 뜻을 구분하면 색을 잘 구분하지 못하는 사람에게는 정보가 사라져요 <Cite n={8} />.</>}
        fix={<>정상은 회색으로 물러나게 해요. 이상만 <b>색 + 모양 + 숫자</b>로 그려요(긴급 ■1 · 높음 ▲2 · 주의 ●3). ‘예정’ 같은 평범한 상태에는 색을 쓰지 않아요. 범례에 우선순위 배지와 점 종류를 함께 넣어요.</>} />
      <CaseCard sev="높음" title="사고 팝업이 처음부터 열려 지도의 다른 곳을 가려요"
        before={<MkPopupBefore />} after={<MkPopupAfter />}
        now={<>화재가 나면 지도 한가운데에 큰 팝업이 자동으로 열려요. CCTV, 연락처, 이력, 문서까지 다 들어 있어요. 그 밑에 깔린 화학물질 창고의 가스 알람은 팝업을 닫아야 보여요.</>}
        why={<>사고가 하나일 거라는 가정은 위험해요. 화재 옆 가스 누출처럼 함께 생기는 사고가 가장 위험해요. 정보 탐색의 원칙은 ‘전체 먼저, 자세한 건 요청할 때’예요 <Cite n={1} />. 팝업이 전체를 가리면 첫 단계인 ‘보기’부터 막혀요 <Cite n={5} />.</>}
        fix={<>지도는 늘 다 보이게 둬요. 알람 옆에는 ‘화재 · 6명’ 같은 짧은 이름표만 붙여요. 자세한 정보는 <b>옆 패널</b>에, 누를 때만 열어요. 패널 맨 위에는 첫 행동(작업 중지 · 대피 방송)을 둬요.</>} />
      <CaseCard good sev="보통" title="알람을 누르면 지도가 그 자리로 가고, CCTV 자동 순환을 멈춰 그 카메라를 앞으로 가져와요"
        now={<>알람 목록에서 화재를 누르면 지도가 도장 부스로 확대돼요. 상황실 CCTV 화면은 평소 카메라를 몇 초마다 돌려 보여주다가, 이때 순환을 멈추고 도장 부스 카메라를 맨 앞에 띄워요. 화면 밖에서 새 알람이 생기면 가장자리 화살표로 알려 줘요.</>}
        why={<>근무자가 직접 지도를 옮기고 카메라 번호를 찾는 동안 시간이 흘러요. 화면을 바꿔도 보던 대상이 그대로 이어지면 길을 잃지 않아요(시각적 운동량) <Cite n={3} />.</>}
        fix={<>순환을 멈췄다는 표시(“자동 순환 멈춤 · 화재 S-101”)를 꼭 보여줘요. 알람을 확인하거나 근무자가 직접 풀 때만 다시 돌아가게 해요. 지도와 배치도에서도 같은 구역이 함께 선택되게 해요(아래 섹션).</>} />
    </div>
  )
}

/* ================= 탭 ================= */
const EXTRA: Record<string, string> = {
  '배치도': '건물 안을 위에서 내려다본 그림이에요. 엘리베이터 옆에 붙은 비상 대피도를 떠올리면 돼요. 구역, 통로, 문, 비상구가 그려져요.',
  '대피 경로': '사고가 난 곳을 피해서 건물 밖 안전한 곳까지 가는 길이에요.',
  '집결지': '대피한 사람들이 모여 인원을 확인하는 건물 밖의 정해진 장소예요.',
  '비상구': '사고가 났을 때 건물 밖으로 나가는 문이에요. 평소 쓰는 정문과 따로 있어요.',
  '격리 구역': '사고가 난 곳과 그 주변을 묶어 아무도 들어가지 못하게 정한 구역이에요.',
  '위치 태그': '작업자가 몸에 지니는 작은 장치예요. 지금 어느 구역에 있는지 상황실에 알려 줘요.',
  '인원 확인': '출입 기록에 남은 사람 수와 집결지에 모인 사람 수를 맞춰 보는 일이에요. 차이가 나면 아직 안에 있을 수 있어요.',
  '%LEL': '불이 붙을 수 있는 가장 낮은 가스 농도를 100으로 볼 때 지금 농도예요. 10%LEL이면 그 최저 농도의 10분의 1이에요.',
}

export default function Tab() {
  return (
    <div data-dash="map">
      <TermList keys={['우선순위', '클러스터', '전주의 처리', '상황 인식']} extra={EXTRA} />
      <SysGrid>
        <Section id="dash-map-which" wide title="지도는 ‘어느 현장, 얼마나 먼가’, 배치도는 ‘건물 안 어디, 어느 길로’"
          gist="현장 사이를 물으면 지도로, 건물 안 길을 물으면 배치도로 답해요."
          desc={<>내비게이션 지도와 엘리베이터 옆 비상 대피도를 떠올려 보세요. 지도는 현장이 어디에 있고 얼마나 먼지 보여줘요. <Term k="배치도" />는 건물 안 어느 구역이 붙어 있고 어느 문으로 나가는지 보여줘요. 안전관리 상황실에는 이 두 화면이 다 필요해요. 질문을 하나씩 눌러 어느 화면이 답하는지 보세요.</>}>
          <WhichView />
          <Note>이 탭의 현장·구역·인원·시각은 모두 설명을 위해 만든 <b>가상의 가람산업 {SAFE_CENTER}</b> 예시예요. 실제 지도가 아니고, 실제 대피 계획이나 법정 기준도 아니에요.</Note>
        </Section>

        <Section id="dash-map-mistakes" wide title="흔한 실수 — 지도가 ‘어디서’만 말하고 ‘어떻게’를 말하지 않아요"
          gist="안전관리 지도는 알람 위치판이 아니에요. 나갈 길과 남은 사람까지 보여줘야 해요."
          desc={<>업계 안전관리 대시보드의 지도 화면에서 흔히 보는 문제 네 가지와 잘한 예 하나예요. 대부분 ‘예뻐 보이는’ 선택이 정작 사고 때 판단을 막아요. ‘흔한 화면’과 ‘업그레이드하면’을 눌러 비교해 보세요.</>}>
          <Mistakes />
        </Section>

        <Section id="dash-map-city" wide title="센서·CCTV·작업자 180여 개를 한 지도에 — 묶어서 보여주되 이상은 드러내기"
          gist="멀리선 묶어서, 가까이선 하나씩. 묶어도 알람은 꼭 보이게 해요."
          desc={<>가람산업 현장 세 곳에는 화재 감지기, 가스 센서, CCTV, 작업자 <Term k="위치 태그" />가 180개 넘게 있어요. 멀리서 보면 가까운 점끼리 묶음(<Term k="클러스터" />)으로, 가까이 가면 하나씩 보여요. ‘묶음에 이상 배지’를 꺼 보세요. 도장 부스의 화재 알람이 숫자 뭉치 속으로 사라져요.</>}>
          <AreaMap />
          <SysGridPair>
            <Finding src={<>Shneiderman (1996) 정보 시각화 탐색 원칙 — 한국어 요약 <Cite n={1} /></>}>
              먼저 전체를 훑어보고, 그다음 확대하고 걸러 내요. 자세한 정보는 필요할 때 봐요.
            </Finding>
            <Note tone="tip"><b>확대 단계마다 할 일을 정해요.</b> ‘전체 지역’에서는 현장 3곳과 알람 배지만 읽히면 충분해요(전체 훑기). ‘현장 주변·현장’에서는 구역과 <Term k="집결지" />를 보며 좁혀요(확대·거르기). ‘구역’에서는 점 하나를 눌러 정보를 봐요(자세히 보기). <Term k="ISA-101" d="공장·발전소 같은 산업 현장의 관제 화면을 어떻게 만들지 정리한 국제 표준이에요." />이 화면을 단계별로 나누는 방식(01 탭)과 같은 생각이에요 <Cite n={2} />.</Note>
          </SysGridPair>
          <Note tone="warn"><b>묶음은 이상을 숨기기 쉬워요.</b> 숫자 묶음은 “여기에 점이 몇 개 있다”만 알려 줘요. 그 안에 긴급 알람이 있어도 겉모습은 똑같아요. 그래서 방법이 두 가지예요. ① 묶음 안에서 가장 급한 알람의 우선순위 배지를 묶음에 붙여요. ② 이상은 아예 묶지 않고 따로 그려요. 둘 다 켜 두는 게 가장 안전해요. 안전관리 화면에서는 작업자 점도 이름 대신 태그 번호로 보여줘요.</Note>
        </Section>

        <Section id="dash-map-overlap" title="겹친 점 처리 — 알람이 밑에 깔리지 않게"
          gist="알람은 늘 맨 위에 그려요. 겹친 건 숫자·펼치기·목록으로 풀어요."
          desc="한 작업대에 작업자 세 명이 붙어 서 있으면 위치 태그 좌표가 거의 같아요. 그래서 아무리 확대해도 겹쳐요. 버튼을 바꿔 가며 다섯 가지 방법을 비교해 보세요.">
          <Overlap />
        </Section>

        <Section id="dash-map-base" title="배경 지도는 흐리게 — 그래야 알람이 보여요"
          gist="배경 지도는 회색으로 흐리게 깔아요. 색은 알람에만 써요."
          desc="시끄러운 카페에서는 작은 목소리가 묻히죠. 지도 앱의 컬러 지도를 그대로 깔면 공원 초록, 하천 파랑, 도로 주황·노랑 때문에 알람 색이 묻혀요. 슬라이더로 오른쪽 지도를 흐리게 해 보세요.">
          <BaseContrast />
          <Note>02 탭의 원칙을 지도에도 그대로 써요. 기본은 회색이고, 색은 비정상일 때만 써요 <Cite n={2} />. 회색 배경은 눈부심과 화면 반사도 줄여 줘요 <Cite n={6} />. 색이나 모양은 주변에 비슷한 것이 많을수록 덜 튀어 보여요 <Cite n={4} />. 그래서 배경 지도는 <b>밝기 차이만 조금</b> 두고, 정상 센서도 회색으로 그려요.</Note>
        </Section>

        <Section id="dash-map-evac" wide title="배치도로 대피 따라 하기 — 격리하고, 길을 안내하고, 사람을 세요"
          gist="위험 구역을 떼어 내고, 피해 가는 길을 보여주고, 다 나왔는지 세요."
          desc={<>엘리베이터 옆 비상 대피도가 살아 움직인다고 생각해 보세요. 사고 구역을 <Term k="격리 구역" />으로 묶고, 그곳을 피하는 <Term k="대피 경로" />를 보여주고, 집결지에서 <Term k="인원 확인" />을 해요. 단계 버튼을 차례로 누르거나, <Term k="비상구" />를 직접 눌러 막아 보세요.</>}>
          <EvacSim />
          <SysGridPair>
            <Note><b>배치도에서 지킬 것.</b> 막힌 비상구는 색이 아니라 <b>✕ 표시와 빈 칸</b>으로, 격리 구역은 <b>빗금</b>으로 구분해요. 대피 경로는 검은 화살표로 그려요. 빨강은 ‘격리 구역을 지나는 위험한 경로’에만 써요. 비상구 표지판의 초록은 현장 관습이지만, 화면에서는 알람 색과 섞이지 않게 모양으로 보여줘요 <Cite n={2} />.</Note>
            <Note tone="tip"><b>화면이 대신 해 줄 계산.</b> 근무자가 머리로 계산하지 않게 화면이 먼저 보여줘요. 예를 들면 집결지별 ‘와야 할 인원’, 출입 기록과의 차이(미확인), “이 비상구가 막히면 사무동은 나갈 길이 격리 구역뿐이에요” 같은 경고예요. 운전 중 “곧 앞차와 부딪히겠다”를 미리 아는 것처럼, <Term k="상황 인식" />의 ‘예측’ 단계를 돕는 일이에요 <Cite n={5} />.</Note>
          </SysGridPair>
        </Section>

        <Section id="dash-map-link" wide title="지도와 배치도를 오갈 때 — 고른 구역을 양쪽에 함께 표시"
          gist="한쪽 화면에서 고른 구역은 다른 화면에서도 바로 보여야 해요."
          desc="구역이나 비상구를 지도에서 누르면 배치도에서도 표시되고, 배치도에서 누르면 지도에서도 표시돼요. ‘두 화면 선택 연결’을 꺼 보세요. 화면을 바꿀 때마다 같은 곳을 다시 찾아야 해요.">
          <LinkedViews />
          <Finding src={<>Woods (1984) 시각적 운동량(visual momentum, 화면을 바꿔도 보던 흐름이 끊기지 않는 정도) — 한국어 요약 <Cite n={3} /></>}>
            화면을 바꿔도 사용자가 방금 보던 것을 새 화면에서 바로 다시 찾을 수 있어야 해요.
          </Finding>
          <Note>네 가지만 지켜도 화면을 바꿀 때 길을 잃지 않아요. ① 같은 <b>이름</b>을 써요(화학물질 창고, 비상구 3). ② 같은 <b>선택</b>을 유지해요. ③ 같은 <b>방향</b>으로 그려요(지도와 배치도 모두 위가 북쪽). ④ 화면 전환 버튼은 늘 같은 자리에 둬요.</Note>
        </Section>

        <Section id="dash-map-chrome" wide title="지도 화면에 늘 있어야 할 것 8가지"
          gist="범례·축척·집결지 같은 작은 정보가 판단의 근거가 돼요."
          desc="항목을 누르면 화면 그림에서 그 위치가 표시돼요. 안전관리 지도에서는 이것들이 꾸밈이 아니라 판단에 꼭 필요한 정보예요.">
          <MapChrome />
        </Section>

        <Refs items={[
          { kind: 'paper', text: 'Shneiderman, B. (1996). The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations. IEEE Symposium on Visual Languages.' },
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015 Human Machine Interfaces for Process Automation Systems — 기본은 회색, 색은 비정상일 때만, 화면은 4단계로 나눔 (ISA 블로그 요약)', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'paper', text: 'Woods, D. D. (1984). Visual momentum: a concept to improve the cognitive coupling of person and computer. International Journal of Man-Machine Studies, 21(3).' },
          { kind: 'paper', text: 'Healey, C. G. & Enns, J. T. (2012). Attention and Visual Memory in Visualization and Computer Graphics. IEEE TVCG 18(7) — 전주의 처리(preattentive, 눈이 따로 집중하지 않아도 저절로 알아채는 처리) 정리.' },
          { kind: 'paper', text: 'Endsley, M. R. (1995). Toward a Theory of Situation Awareness in Dynamic Systems. Human Factors 37(1).', url: 'https://en.wikipedia.org/wiki/Situation_awareness' },
          { kind: 'book', text: 'Hollifield, B., Oliver, D., Nimmo, I., Habibi, E. (2008). The High Performance HMI Handbook. PAS.' },
          { kind: 'practice', text: '사고 구역 격리 → 대피 경로 안내 → 집결지 인원 확인 순서, 묶음·펼치기·화면 밖 표시, 알람 때 CCTV 순환 멈추기는 안전관리 상황실과 지도 UI 실무에서 쓰는 방식이에요. 실제 대피 계획과 절차는 각 사업장의 비상 조치 계획을 따라요.' },
          { kind: 'standard', text: 'WCAG 2.1 성공 기준 1.4.1 색 사용 — 색만으로 정보를 구분하지 않기', url: 'https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html' },
        ]} />
      </SysGrid>
    </div>
  )
}

/** 섹션 안에서 두 덩어리를 나란히 (모바일은 세로) */
function SysGridPair({ children }: { children: ReactNode }) {
  return <div className="mp-pair">{children}</div>
}
