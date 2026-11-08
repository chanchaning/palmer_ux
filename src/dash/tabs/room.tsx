import { useEffect, useMemo, useRef, useState } from 'react'
import { Range, Seg } from '../../components/ui'
import { Note, Section, SliderRow, SysGrid } from '../../system/ui'
import { ALARMS, RANGES, SUBSTATIONS } from '../data'
import { AnalogBar, Cite, Finding, Hmi, PriBadge, Refs } from '../ui'
import './room.css'

/* ================= 공용: 대비 계산 ================= */
const hexRgb = (h: string) => {
  const s = h.trim().replace('#', '')
  const f = s.length === 3 ? s.split('').map(c => c + c).join('') : s
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255)
}
const lum = (h: string) => {
  const [r, g, b] = hexRgb(h).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/* ================= 1. 시청 거리 → 글자 크기 ================= */
interface Disp { id: string; name: string; diag: number; rx: number; ry: number; tile: number; where: 'wall' | 'desk'; dist: number }
const DISPS: Disp[] = [
  { id: 'w-fhd', name: '벽면 55인치 FHD 2×2', diag: 55, rx: 1920, ry: 1080, tile: 2, where: 'wall', dist: 5 },
  { id: 'w-4k', name: '벽면 55인치 4K 2×2', diag: 55, rx: 3840, ry: 2160, tile: 2, where: 'wall', dist: 5 },
  { id: 'd-24', name: '콘솔 24인치 FHD', diag: 24, rx: 1920, ry: 1080, tile: 1, where: 'desk', dist: 0.7 },
  { id: 'd-27', name: '콘솔 27인치 QHD', diag: 27, rx: 2560, ry: 1440, tile: 1, where: 'desk', dist: 0.7 },
]
const geom = (d: Disp) => {
  const k = 25.4 / Math.hypot(16, 9)
  const w = d.diag * 16 * k, h = d.diag * 9 * k // mm, 한 장
  return { pitch: w / d.rx, wallH: h * d.tile, wallW: w * d.tile }
}
/** 글자 높이(mm) = 2 × 거리 × tan(시각도 ÷ 2) */
const charMm = (distM: number, arcmin: number) => 2 * distM * 1000 * Math.tan(((arcmin / 60) * Math.PI) / 180 / 2)

/** 이 사이트 글꼴에서 한글 글자 높이가 font-size의 몇 %인지 실제로 재요 */
function useGlyphRatio() {
  const [r, setR] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    const measure = () => {
      const c = document.createElement('canvas').getContext('2d')
      if (!c) return
      c.font = '700 100px Pretendard, system-ui, sans-serif'
      const m = c.measureText('관제')
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
      if (alive && h > 0) setR(h / 100)
    }
    if (document.fonts?.ready) document.fonts.ready.then(measure); else measure()
    return () => { alive = false }
  }, [])
  return r
}

function ViewDistance() {
  const [dispId, setDispId] = useState('w-fhd')
  const disp = DISPS.find(d => d.id === dispId)!
  const [dist, setDist] = useState(disp.dist)
  const [arc, setArc] = useState<16 | 20>(20)
  const [zone, setZone] = useState<'wall' | 'desk' | 'sup'>('wall')
  const ratio = useGlyphRatio()
  const g = geom(disp)
  const mm = charMm(dist, arc)
  const px = mm / g.pitch
  const fs = ratio ? px / ratio : null
  const minDist = (2 * g.wallH) / 1000
  const isWall = disp.where === 'wall'
  const tooClose = isWall && dist < minDist

  const pickDisp = (id: string) => { const d = DISPS.find(x => x.id === id)!; setDispId(id); setDist(d.dist); setZone(d.where) }

  /* 단면도: 방 12m → 600px */
  const S = 50, X0 = 30, FLOOR = 210
  const wallTop = FLOOR - 1.0 * S - (g.wallH / 1000) * S
  const wallBot = FLOOR - 1.0 * S
  const opDist = isWall ? dist : 4
  const opX = X0 + opDist * S
  const eyeY = FLOOR - 1.2 * S
  const supX = Math.min(X0 + 11.2 * S, opX + 2.6 * S)
  const wallMid = (wallTop + wallBot) / 2

  const ZONES = {
    wall: { name: '벽면 대형 화면', lv: '레벨 1 · 공유', d: '모두가 같은 그림을 봐요. 누가 봐도 같은 결론이 나와야 해서 전체 개요만 올리고, 조작하지 않아요. 멀리서 읽혀야 하니 글자와 기호가 커요.' },
    desk: { name: '운영자 콘솔', lv: '레벨 2~4 · 개인', d: '모니터 여러 대로 각자 들어가 보는 화면이에요. 팔 길이 정도 거리라 글자는 작아도 되지만, 고개를 돌리는 범위 안에 모아요.' },
    sup: { name: '감독자 자리', lv: '전체 조율', d: '운영자 뒤, 벽면 화면과 운영자를 함께 볼 수 있는 자리예요. 벽면 화면이 감독자 시선에서도 가리지 않게 배치해요.' },
  }

  return (
    <div className="rm-vd">
      <div className="rm-vd-top">
        <svg className="rm-sec" viewBox="0 0 640 240" role="img" aria-label={`관제실 단면. 운영자는 벽면 화면에서 ${opDist.toFixed(1)}m 떨어져 있어요.`}>
          <line className="floor" x1="10" x2="630" y1={FLOOR} y2={FLOOR} />
          <line className="wallln" x1={X0 - 6} x2={X0 - 6} y1="14" y2={FLOOR} />
          {/* 벽면 화면 */}
          <g className={'z' + (zone === 'wall' ? ' on' : '')}>
            <rect x={X0 - 4} y={wallTop} width="8" height={wallBot - wallTop} />
            <text x={X0 + 10} y={wallTop + 12}>벽면 화면</text>
          </g>
          {/* 시선 */}
          <line className="sight" x1={opX - 6} y1={eyeY} x2={X0 + 4} y2={wallMid} />
          <line className="sight" x1={supX - 6} y1={FLOOR - 1.45 * S} x2={X0 + 4} y2={wallTop + 6} />
          {/* 거리 */}
          <line className="dim" x1={X0} x2={opX - 6} y1={FLOOR + 14} y2={FLOOR + 14} />
          <text className="dimt" x={(X0 + opX) / 2} y={FLOOR + 28} textAnchor="middle">{opDist.toFixed(1)}m{!isWall && ' (예시)'}</text>
          {/* 운영자 + 콘솔 */}
          <g className={'z' + (zone === 'desk' ? ' on' : '')}>
            <rect x={opX + 10} y={FLOOR - 0.75 * S} width={0.9 * S} height="5" />
            <rect x={opX + 14} y={FLOOR - 0.75 * S - 22} width="4" height="22" />
            <rect x={opX + 12} y={FLOOR - 0.75 * S} width="4" height={0.75 * S} />
            <circle cx={opX + 2} cy={eyeY - 6} r="8" />
            <path d={`M${opX + 2},${eyeY + 2} L${opX + 6},${FLOOR - 0.45 * S} L${opX + 28},${FLOOR - 0.45 * S} L${opX + 30},${FLOOR}`} className="body" />
            <text x={opX + 10} y={FLOOR - 0.75 * S - 30}>운영자 콘솔</text>
          </g>
          {/* 감독자 (단 위) */}
          <g className={'z' + (zone === 'sup' ? ' on' : '')}>
            <rect className="dais" x={supX - 20} y={FLOOR - 0.25 * S} width={1.6 * S} height={0.25 * S} />
            <circle cx={supX + 2} cy={FLOOR - 1.45 * S - 6} r="8" />
            <path d={`M${supX + 2},${FLOOR - 1.45 * S + 2} L${supX + 6},${FLOOR - 0.7 * S} L${supX + 28},${FLOOR - 0.7 * S} L${supX + 30},${FLOOR - 0.25 * S}`} className="body" />
            <text x={supX - 20} y={FLOOR - 1.45 * S - 22}>감독자</text>
          </g>
          {isWall && <><rect className="minzone" x={X0} y={FLOOR - 4} width={minDist * S} height="4" /><text className="mint" x={X0 + 4} y={FLOOR - 8}>너무 가까운 구간 ~{minDist.toFixed(1)}m</text></>}
        </svg>
        <div className="rm-zones" role="group" aria-label="관제실 구역">
          {(Object.keys(ZONES) as (keyof typeof ZONES)[]).map(k => (
            <button key={k} type="button" className={zone === k ? 'on' : ''} aria-pressed={zone === k} onClick={() => setZone(k)}>
              <b>{ZONES[k].name}</b><small>{ZONES[k].lv}</small>
            </button>
          ))}
          <p>{ZONES[zone].d}</p>
        </div>
      </div>

      <div className="rm-vd-calc">
        <div className="rm-vd-ctl">
          <div className="rm-k">화면</div>
          <Seg value={dispId} onChange={pickDisp} options={DISPS.map(d => [d.id, d.name] as const)} />
          <SliderRow label="눈에서 화면까지 거리" value={dist.toFixed(1)} unit="m" ok={tooClose ? false : undefined}
            hint={isWall ? <>벽면 전체 높이 {(g.wallH / 1000).toFixed(2)}m → 경험칙상 최소 {minDist.toFixed(1)}m<Cite n={3} />{tooClose && ' — 지금은 너무 가까워요'}</> : '콘솔 모니터는 보통 팔 길이 안팎이에요.'}>
            <Range value={dist} min={isWall ? 1.5 : 0.4} max={isWall ? 8 : 1.2} step={0.1} onChange={setDist} label="눈에서 화면까지 거리(m)" />
          </SliderRow>
          <div className="rm-k">글자가 차지할 시각도</div>
          <Seg value={arc} onChange={setArc} options={[[16, '16′ (최소로 자주 쓰는 값)'], [20, '20′ (여유 있게)']]} />
          <small className="muted">′는 각도의 분(1도의 1/60)이에요. 16~20′은 2차 자료에서 확인한 값이에요<Cite n={4} />.</small>
        </div>

        <div className="rm-vd-out">
          <svg className="rm-angle" viewBox="0 0 300 90" aria-hidden="true">
            <circle cx="20" cy="45" r="7" className="eye" />
            <line x1="26" y1="45" x2="270" y2="25" /><line x1="26" y1="45" x2="270" y2="65" />
            <line className="dist" x1="26" y1="80" x2="270" y2="80" />
            <text x="148" y="76" textAnchor="middle">거리 d = {dist.toFixed(1)}m</text>
            <line className="h" x1="276" x2="276" y1="25" y2="65" />
            <text x="282" y="49">h</text>
            <path className="arc" d="M60,40.5 A35,35 0 0,1 60,49.5" />
            <text x="66" y="40">θ = {arc}′</text>
          </svg>
          <div className="rm-formula">h = 2 × d × tan(θ ÷ 2)</div>
          <dl className="rm-res">
            <div><dt>필요한 글자 높이</dt><dd><b>{mm.toFixed(1)}</b> mm</dd></div>
            <div><dt>이 화면의 화소 간격</dt><dd>{g.pitch.toFixed(3)} mm</dd></div>
            <div><dt>글자 높이 (화면 화소)</dt><dd><b>{Math.ceil(px)}</b> px</dd></div>
            <div><dt>글꼴 크기로 바꾸면</dt><dd>{fs ? <><b>{Math.ceil(fs)}</b> px 이상</> : '측정 중'}</dd></div>
          </dl>
          <small className="muted">{ratio ? <>이 사이트 글꼴(Pretendard 굵게)로 '관제'를 실제로 재 보니 글자 높이가 글꼴 크기의 {Math.round(ratio * 100)}%예요. 글꼴마다 달라서 쓰는 글꼴로 다시 재야 해요.</> : '글꼴을 재는 중이에요.'}</small>
        </div>
      </div>
      <div className="rm-sample" aria-hidden="true">
        <span className="muted">벽면 화면 화소 {fs ? Math.ceil(fs) : '–'}px 글꼴로 쓴 예</span>
        <div className="rm-sample-box"><span style={{ fontSize: Math.min(72, Math.max(10, fs ?? 16)) }}>강변 1선 83%</span></div>
        <small className="muted">지금 보는 화면과 화소 크기가 달라서 실제 보이는 크기는 아니에요. 크기 관계만 보세요.</small>
      </div>
    </div>
  )
}

/* ================= 2. 조명과 화면 밝기 ================= */
type Light = 'bright' | 'dim'
type Scr = 'gray' | 'dark'
const DARK_P = { p1: '#ff6b6b', p2: '#ff922b', p3: '#ffd43b' }

function LightAndScreen() {
  const [light, setLight] = useState<Light>('bright')
  const [scr, setScr] = useState<Scr>('gray')
  const fit = (light === 'bright' && scr === 'gray') || (light === 'dim' && scr === 'dark')
  const msg = light === 'bright'
    ? scr === 'gray' ? '밝은 방과 밝기가 비슷해서 눈이 편하고, 조명이 비쳐도 잘 안 보여요.' : '어두운 화면에 천장 조명과 창이 비쳐 보여요. 반사가 값을 가려요.'
    : scr === 'dark' ? '어두운 방에서 화면이 눈부시지 않아요. 알람 색은 다크 배경에 맞게 밝혀 써요.' : '화면이 방에서 가장 밝은 물체가 돼요. 눈이 계속 화면 밝기에 맞추느라 피곤해요.'
  return (
    <div className="rm-ls">
      <div className="rm-ls-ctl">
        <div><span className="rm-k">관제실 조명</span><Seg value={light} onChange={setLight} options={[['bright', '밝은 관제실 (주간)'], ['dim', '어두운 관제실 (야간)']]} /></div>
        <div><span className="rm-k">화면 배경</span><Seg value={scr} onChange={setScr} options={[['gray', '회색 배경'], ['dark', '다크 배경']]} /></div>
      </div>
      <div className={'rm-room ' + light}>
        <div className={'rm-room-scr ' + scr + (light === 'dim' && scr === 'gray' ? ' glow' : '')}>
          <Hmi dark={scr === 'dark'} title="강변 변전소" right="02:14" className="rm-ls-hmi">
            <div className="rm-ls-rows">
              {SUBSTATIONS[1].feeders.map(f => (
                <div key={f.id} className="rm-ls-row">
                  <span>{f.name}</span>
                  <AnalogBar value={f.load} min={0} max={120} normal={RANGES.load.normal} alarm={RANGES.load.alarm} unit="%" name={f.name} w={120} />
                  <em>{f.load}%</em>
                </div>
              ))}
              <div className="rm-ls-al"><PriBadge p={2} /> 강변 1선 부하율 높음</div>
            </div>
          </Hmi>
          {light === 'bright' && scr === 'dark' && <div className="rm-refl" aria-hidden="true"><i className="a" /><i className="b" /></div>}
        </div>
        <div className={'rm-room-msg' + (fit ? ' ok' : '')} aria-live="polite"><b>{fit ? '✓ 잘 맞는 조합' : '✕ 맞지 않는 조합'}</b> {msg}</div>
      </div>
    </div>
  )
}

function DarkContrast() {
  const ref = useRef<HTMLDivElement>(null)
  const [base, setBase] = useState<{ p1: string; p2: string; p3: string } | null>(null)
  useEffect(() => {
    const el = ref.current?.closest('.dashpage') ?? document.documentElement
    const cs = getComputedStyle(el)
    const g = (k: string, d: string) => cs.getPropertyValue(k).trim() || d
    setBase({ p1: g('--p1', '#c92a2a'), p2: g('--p2', '#e8590c'), p3: g('--p3', '#f2c230') })
  }, [])
  const BG = { gray: '#dcdcd8', dark: '#2a2c2f' }
  const rows = base ? ([1, 2, 3] as const).map(n => {
    const k = ('p' + n) as 'p1' | 'p2' | 'p3'
    return { n, k, lightC: base[k], darkC: DARK_P[k], onGray: contrast(base[k], BG.gray), onDarkSame: contrast(base[k], BG.dark), onDarkAdj: contrast(DARK_P[k], BG.dark) }
  }) : []
  const fmt = (r: number) => <span className={r >= 3 ? 'pass' : 'fail'}>{r.toFixed(2)} : 1 {r >= 3 ? '✓' : '✕'}</span>
  return (
    <div className="rm-dc" ref={ref}>
      <div className="sys-table-wrap">
        <table className="sys-table rm-dc-t">
          <thead><tr><th>우선순위</th><th>회색 배경 (기본 색)</th><th>다크 배경 (기본 색 그대로)</th><th>다크 배경 (밝힌 색)</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.k}>
              <td><PriBadge p={r.n} label /></td>
              <td><span className="bgchip gray"><i style={{ background: r.lightC }} /></span>{fmt(r.onGray)}</td>
              <td><span className="bgchip dark"><i style={{ background: r.lightC }} /></span>{fmt(r.onDarkSame)}</td>
              <td><span className="bgchip dark"><i style={{ background: r.darkC }} /></span>{fmt(r.onDarkAdj)} <code>{r.darkC}</code></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <small className="muted">대비는 이 페이지가 쓰는 실제 색값으로 계산했어요(WCAG 상대 휘도 공식). 기호·막대 같은 UI 요소는 3:1 이상이 기준이에요<Cite n={7} />.</small>
    </div>
  )
}

/* ================= 3. 멀티 모니터: 알람 목록 위치 ================= */
type Layout = 'fixed' | 'moving'
const MON_ROLES = ['알람 목록', '레벨 2 구역 운전', '레벨 3 · 4 상세', '추세 · 보조']
const MOVE_SEQ = [2, 0, 3, 1, 2, 3, 0, 1]

function Monitors() {
  const [layout, setLayout] = useState<Layout>('moving')
  const [round, setRound] = useState(0)
  const [t0, setT0] = useState<number | null>(null)
  const [times, setTimes] = useState<Record<Layout, number[]>>({ fixed: [], moving: [] })
  const [miss, setMiss] = useState(0)
  const alarmAt = layout === 'fixed' ? 0 : MOVE_SEQ[round % MOVE_SEQ.length]
  const roles = useMemo(() => {
    const others = MON_ROLES.slice(1)
    const arr: string[] = []
    let k = 0
    for (let i = 0; i < 4; i++) arr.push(i === alarmAt ? MON_ROLES[0] : others[(k++ + round) % 3])
    return arr
  }, [alarmAt, round])
  const a = ALARMS[round % ALARMS.length]
  const avg = (l: Layout) => times[l].length ? (times[l].reduce((s, v) => s + v, 0) / times[l].length / 1000).toFixed(2) + '초' : '–'

  const start = () => { setRound(r => r + 1); setT0(performance.now()); setMiss(0) }
  const hit = (i: number) => {
    if (t0 === null) return
    if (i !== alarmAt) { setMiss(m => m + 1); return }
    const dt = performance.now() - t0
    setTimes(s => ({ ...s, [layout]: [...s[layout], dt].slice(-5) }))
    setT0(null)
  }
  return (
    <div className="rm-mon">
      <div className="rm-row">
        <Seg value={layout} onChange={v => { setLayout(v); setT0(null) }} options={[['moving', '화면마다 다른 배치'], ['fixed', '알람 목록 고정']]} />
        <button type="button" className="btn sm" onClick={start} disabled={t0 !== null}>{t0 === null ? '새 알람 울리기' : '알람 목록을 누르세요'}</button>
        <span className="muted">평균 — 다른 배치 <b>{avg('moving')}</b> · 고정 <b>{avg('fixed')}</b></span>
      </div>
      <div className="rm-mon-desk">
        {roles.map((r, i) => {
          const isAl = i === alarmAt
          return (
            <button key={i} type="button" className={'rm-mon-m' + (isAl ? ' al' : '') + (t0 !== null ? ' live' : '')} onClick={() => hit(i)} disabled={t0 === null}
              aria-label={`모니터 ${i + 1}: ${t0 === null ? r : '눌러서 고르기'}`}>
              <small>모니터 {i + 1}</small>
              {t0 === null ? <b>{r}</b> : (
                isAl ? <span className="rm-mon-al"><PriBadge p={a.pri} /> {a.where}</span> : <span className="rm-mon-ph" aria-hidden="true"><i /><i /><i /></span>
              )}
            </button>
          )
        })}
      </div>
      <p className="muted rm-mon-cap" aria-live="polite">{t0 !== null ? `어느 모니터에 알람 목록이 있을까요?${miss ? ` (헛짚음 ${miss}번)` : ''}` : '버튼을 누르면 화면 내용이 가려지고 새 알람이 와요. 알람 목록을 찾아 누르세요. 두 배치를 번갈아 해 보세요.'}</p>
    </div>
  )
}

/* ================= 4. 번인(잔상) 시뮬레이션 ================= */
function BurnIn() {
  const [mode, setMode] = useState<'static' | 'shift'>('static')
  const [reveal, setReveal] = useState(false)
  return (
    <div className="rm-bi">
      <div className="rm-row">
        <Seg value={mode} onChange={setMode} options={[['static', '고정 요소 그대로'], ['shift', '번인 줄이기 적용']]} />
        <button type="button" className="btn sm ghost" aria-pressed={reveal} onClick={() => setReveal(r => !r)}>{reveal ? '원래 화면 보기' : '오래 켠 뒤 회색 화면 띄우기'}</button>
      </div>
      <div className={'rm-bi-scr ' + mode + (reveal ? ' reveal' : '')}>
        <div className="ghost" aria-hidden="true">
          <div className="gh-top"><span className="gh-logo">누리시 배전 관제센터</span></div><div className="gh-side" />
        </div>
        {!reveal && (
          <div className="live">
            <div className="lv-top"><b>누리시 배전 관제센터 · 전체 개요</b><span>14:42:07</span></div>
            <div className="lv-mid">{SUBSTATIONS.map(s => <div key={s.id}><b>{s.name}</b><span>정상</span></div>)}</div>
          </div>
        )}
      </div>
      <small className="muted">시뮬레이션이에요. 실제 잔상은 패널 종류(LCD·OLED 등)와 켜 둔 시간에 따라 달라요.</small>
    </div>
  )
}

/* ================= 체크리스트 ================= */
const CHECK = [
  '벽면 화면에는 레벨 1(전체 개요)만 올리고, 누가 조작해도 바뀌지 않게 했나요?',
  '가장 먼 자리에서 시청 거리를 재고, 글자 높이를 계산식으로 확인했나요?',
  '관제실 조명(주간·야간)을 확인하고 배경 밝기를 그에 맞췄나요?',
  '다크 화면을 쓴다면 알람 색을 다크 배경에서 다시 검사했나요?',
  '알람 목록은 어느 화면에서든 같은 모니터, 같은 자리에 있나요?',
  '12시간 켜 둬도 같은 자리에 오래 머무는 밝은 요소가 적나요?',
  '감독자 자리에서도 벽면 화면이 가리지 않나요?',
]
function CheckList() {
  const [on, setOn] = useState(() => CHECK.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <div className="rm-check">
      <div className="rm-check-top"><span>현장에 가기 전에</span><b className={n === CHECK.length ? 'ok' : ''}>{n} / {CHECK.length}</b></div>
      <ul>{CHECK.map((q, i) => (
        <li key={i}><label><input type="checkbox" checked={on[i]} onChange={() => setOn(a => a.map((v, j) => (j === i ? !v : v)))} /><span>{q}</span></label></li>
      ))}</ul>
    </div>
  )
}

/* ================= 탭 ================= */
export default function Tab() {
  return (
    <div data-dash="room">
      <SysGrid>
        <Section id="dash-room-why" wide title="관제 화면은 방 안에서 완성돼요"
          desc={<>같은 화면도 몇 미터 떨어져 보는지, 방이 얼마나 밝은지, 몇 시간째 보고 있는지에 따라 다르게 읽혀요. 관제센터의 인간공학 설계는 ISO 11064가 다뤄요<Cite n={1} /><Cite n={2} />.</>}>
          <div className="rm-why">
            <Finding src={<>ISO 11064 관제센터 인간공학 설계 — 원칙 수준 한국어 요약</>}>
              관제실 배치, 작업대, 표시 장치는 따로 정하지 않아요. 운영자가 하는 일과 시야에서 출발해 방 → 작업대 → 화면 순서로 함께 맞춰요.
            </Finding>
            <ol className="rm-iso" aria-label="ISO 11064 중 이 탭과 관련된 부분">
              <li><small>Part 4 (2013)</small><b>작업대 배치와 치수</b><span>콘솔 높이, 모니터 위치, 벽면 화면까지의 시선</span></li>
              <li><small>Part 5 (2008)</small><b>표시와 조작</b><span>무엇을 어떤 크기·위치로 보여주고, 어떻게 조작하나</span></li>
            </ol>
          </div>
          <Note>표준 원문의 구체적인 시청 거리 수치는 제가 직접 확인하지 못했어요. 그래서 이 탭은 <b>계산하는 방법</b>과 원칙을 보여주고, 2차 자료의 경험칙은 '보고된 수치'로 표시했어요.</Note>
        </Section>

        <Section id="dash-room-distance" wide title="관제실 단면 — 시청 거리와 글자 크기"
          desc="구역을 누르면 그 자리에서 보는 화면이 설명돼요. 화면과 거리를 바꾸면 필요한 글자 크기가 다시 계산돼요.">
          <ViewDistance />
          <Note tone="tip"><b>가장 먼 자리 기준으로 계산해요.</b> 벽면 화면은 맨 뒤 감독자 자리에서도 읽혀야 해요. 계산 결과가 너무 크면 글자를 키우기보다 벽면에 올리는 정보를 줄여요. 그게 <a href="#/dash/levels">01 화면 위계</a>의 레벨 1이에요.</Note>
        </Section>

        <Section id="dash-room-light" wide title="다크냐 라이트냐, 정답은 조명이에요"
          desc={<>ISA-101 쪽은 밝은 관제실에 회색 배경을 권해요<Cite n={5} />. 회색 배경은 눈부심과 반사를 줄여요<Cite n={6} />. 어두운 관제실이나 야간엔 다크 화면이 맞을 수 있어요. 조합을 바꿔 보세요.</>}>
          <LightAndScreen />
        </Section>

        <Section id="dash-room-darkcolor" wide title="다크 화면에서는 알람 색을 다시 맞춰요"
          desc="회색 배경에 맞춘 알람 색을 다크 배경에 그대로 쓰면 대비가 떨어지는 색이 생겨요. 실제 대비를 계산해 봤어요.">
          <DarkContrast />
          <Note>회색 배경 위에서도 주황(높음)과 노랑(주의)은 3:1에 못 미쳐요. 밝은 색끼리라 그래요. 그래서 우선순위는 <b>색만으로 구분하지 않고</b> 모양(■▲●)과 숫자, 진한 테두리를 함께 써요. 자세한 색 규칙은 <a href="#/dash/color">02 회색이 기본, 색은 신호</a>에서 이어져요.</Note>
        </Section>

        <Section id="dash-room-monitors" wide title="멀티 모니터 — 알람 목록은 늘 같은 자리"
          desc="콘솔에 모니터가 여러 대면, 화면을 바꿀 때마다 무엇이 어디에 있는지 다시 찾게 돼요. 두 배치로 알람 목록 찾기를 해 보세요.">
          <Monitors />
          <div className="rm-rules">
            <div><b>알람 목록은 고정</b><p>어느 화면을 열어도 알람 목록은 같은 모니터, 같은 자리. 눈이 위치를 외워요.</p></div>
            <div><b>모니터마다 역할</b><p>주 작업(레벨 2)은 정면, 상세(레벨 3·4)는 옆. 역할이 바뀌지 않게 해요.</p></div>
            <div><b>화면 간 일관성</b><p>시각, 빵부스러기, 메뉴 위치를 모든 모니터에서 같게 둬요.</p></div>
          </div>
        </Section>

        <Section id="dash-room-shift" title="12시간 켜 두는 화면"
          desc="교대 근무자는 한 화면을 몇 시간씩 봐요. 같은 자리에 오래 머무는 밝은 요소는 패널에 잔상(번인)을 남길 수 있어요.">
          <BurnIn />
          <ul className="rm-list">
            <li><b>고정 요소를 줄여요.</b> 큰 로고·밝은 머리글은 빼거나 어둡게.</li>
            <li><b>조금씩 옮겨요.</b> 테두리 몇 화소 단위로 주기적으로 움직이는 기능(픽셀 시프트)을 켜요.</li>
            <li><b>화면 보호기는 안 돼요.</b> 관제 화면은 꺼지거나 가려지면 안 돼요.</li>
            <li><b>피로를 줄여요.</b> 개인 콘솔 밝기는 운영자가 조절할 수 있게, 교대 인수인계는 <a href="#/dash/ops">08 기획 · 운영 정의</a>에서.</li>
          </ul>
        </Section>

        <Section id="dash-room-check" title="관제실 화면 점검표" desc="현장 답사 때 제가 실제로 확인하는 것들이에요.">
          <CheckList />
        </Section>

        <Refs items={[
          { kind: 'standard', text: 'ISO 11064-4:2013 Ergonomic design of control centres — Part 4: Layout and dimensions of workstations', url: 'https://www.iso.org/standard/44691.html' },
          { kind: 'standard', text: 'ISO 11064-5:2008 Ergonomic design of control centres — Part 5: Displays and controls' },
          { kind: 'reported', text: '벽면 화면은 화면 높이의 2배 이상 떨어져서 본다 — 2차 자료의 경험칙. 표준 원문 수치는 미확인.' },
          { kind: 'reported', text: '글자 높이 시각도 16~20 arcmin — 인간공학 지침을 인용한 2차 자료의 값. 계산식(h = 2·d·tan(θ/2))은 기하학이에요.' },
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015 Human Machine Interfaces for Process Automation Systems (고성능 HMI)', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'book', text: 'Hollifield, B., Oliver, D., Nimmo, I., Habibi, E. The High Performance HMI Handbook (PAS, 2008) — 회색 배경과 눈부심' },
          { kind: 'standard', text: 'W3C WCAG 2.x — 1.4.11 비텍스트 대비 3:1, 대비 계산식(상대 휘도)', url: 'https://www.w3.org/TR/WCAG21/#non-text-contrast' },
          { kind: 'practice', text: '멀티 모니터 역할 고정, 번인 줄이기, 화면 크기·거리 예시는 실무 경험과 설명용 예시예요.' },
        ]} />
      </SysGrid>
    </div>
  )
}
