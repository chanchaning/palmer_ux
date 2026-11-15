import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { DAYS, fmt, seeded, useShow } from '../data'
import { Legend, Spark, Tip } from '../shared'

/* ================= 07 히트맵 ================= */
const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i)
const hr = seeded(21)
const HEAT = DAYS.map((_, d) => HOURS.map(h => {
  const wk = d < 5
  const base = wk
    ? (h === 8 ? 30 : h === 9 ? 22 : h === 12 ? 36 : h === 13 ? 32 : h >= 17 ? 12 : 14) + (d === 4 ? 4 : 0)
    : (h < 10 ? 6 : h >= 13 && h <= 16 ? 38 + (h === 15 ? 8 : 0) : 20)
  return Math.round(base + hr() * 8)
}))
const H_MAX = Math.max(...HEAT.flat()), H_MIN = Math.min(...HEAT.flat())
const peak = (() => { let best = [0, 0]; HEAT.forEach((row, d) => row.forEach((v, h) => { if (v > HEAT[best[0]][best[1]]) best = [d, h] })); return best })()
const HW = 320, HH = 206, HL = 22, HR = 4, HT = 6, HB = 20
const cw = (HW - HL - HR) / 12, chh = (HH - HT - HB) / 7
const mono = (t: number) => `color-mix(in srgb, var(--c1) ${Math.round(8 + 92 * t)}%, var(--surface))`
const rainbow = (t: number) => `hsl(${Math.round(250 - 250 * t)} 80% 55%)`
const HEAT_LOG = <>칸에 <b>올리거나</b> 화살표 키로 움직여 보세요</>

export function Heatmap() {
  const show = useShow()
  const box = useRef<HTMLDivElement>(null)
  const [pal, setPal] = useState<'mono' | 'rainbow'>('mono')
  const [act, setAct] = useState<[number, number] | null>(null)
  const [log, setLog] = useState<ReactNode>(HEAT_LOG)
  const color = pal === 'mono' ? mono : rainbow
  const t = (v: number) => (v - H_MIN) / (H_MAX - H_MIN)

  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * HW, vy = ((e.clientY - r.top) / r.height) * HH
    const h = Math.floor((vx - HL) / cw), d = Math.floor((vy - HT) / chh)
    setAct(h >= 0 && h < 12 && d >= 0 && d < 7 ? [d, h] : null)
  }
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const mv: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }
    const m = mv[e.key]
    if (!m) return
    e.preventDefault()
    setAct(a => { const [d, h] = a ?? [0, 0]; return [Math.max(0, Math.min(6, d + m[0])), Math.max(0, Math.min(11, h + m[1]))] })
  }
  const pickPal = (p: 'mono' | 'rainbow') => {
    setPal(p)
    setLog(p === 'rainbow' ? <>무지개: 초록·노랑 사이에 없는 <b>경계선</b>이 생기고, 어느 색이 큰지 범례를 봐야 알아요</> : <>한 가지 색: <b>진할수록 많다</b> — 범례 없이도 읽혀요</>)
  }

  const demo = useDemo({
    reset() { show.hide(); setPal('mono'); setAct(null); setLog(HEAT_LOG) },
    async play(c) {
      show.show(); await c.sleep(1100)
      setAct([peak[0], peak[1]]); setLog(<>가장 바쁜 때: <b>{DAYS[peak[0]]} {HOURS[peak[1]]}시</b></>); await c.sleep(1300)
      setAct([0, 0]); setLog(<>평일은 <b>아침 8시와 점심</b>에 몰려요</>); await c.sleep(1300)
      setAct(null)
      const seg = box.current?.querySelector<HTMLElement>('.seg-x [data-v="rainbow"]') ?? null
      await c.press(box.current, seg); await c.sleep(2200)
      pickPal('mono'); await c.sleep(500)
    },
  })

  return (
    <Card id="chart-heat" num="07" title="히트맵" en="Heatmap" demo={demo}
      desc="가로·세로 두 기준이 만나는 칸을 색의 진하기로 칠해요. 많은 숫자 속에서 ‘언제 몰리는지’가 한눈에 보여요.">
      <Stage log={log} logId="chart-heat-log">
        <div className="box left ch-box" ref={box}>
          <div className="ch-ctl">
            <Seg value={pal} onChange={pickPal} options={[['mono', '한 가지 색'], ['rainbow', '무지개 색']]} />
          </div>
          <div className="ch-title">요일 × 시간 주문 수 <span>한 달 평균 · 건</span></div>
          <div className={'ch-plot' + (show.on ? '' : ' off')}>
            <svg viewBox={`0 0 ${HW} ${HH}`} tabIndex={0} role="img" className="ch-heat"
              aria-label={`요일과 시간별 주문 수 히트맵. 가장 많은 때는 ${DAYS[peak[0]]}요일 ${HOURS[peak[1]]}시. 화살표 키로 칸을 옮겨 값을 볼 수 있어요`}
              onPointerMove={fromPointer} onPointerDown={fromPointer} onPointerLeave={() => setAct(null)} onKeyDown={onKey} onBlur={() => setAct(null)}>
              {DAYS.map((d, i) => <text key={d} className={'ch-xl' + (act?.[0] === i ? ' on' : '')} x={HL - 8} y={HT + chh * i + chh / 2 + 3.5} textAnchor="middle">{d}</text>)}
              {HOURS.map((h, i) => (i % 2 === 0 || act?.[1] === i) && <text key={h} className={'ch-xl' + (act?.[1] === i ? ' on' : '')} x={HL + cw * i + cw / 2} y={HH - 6} textAnchor="middle">{h}</text>)}
              {HEAT.map((row, d) => row.map((v, h) => (
                <rect key={d + '-' + h} className={'ch-cell' + (act && act[0] === d && act[1] === h ? ' on' : '')}
                  x={HL + cw * h + 1} y={HT + chh * d + 1} width={cw - 2} height={chh - 2} rx="3"
                  style={{ fill: color(t(v)), transitionDelay: show.on ? `calc(${h * 35 + d * 15}ms * var(--slow))` : '0ms' }} />
              )))}
            </svg>
            {act && (
              <Tip x={HL + cw * act[1] + cw / 2} y={HT + chh * act[0]} W={HW} H={HH}>
                <b>{DAYS[act[0]]}요일 {HOURS[act[1]]}시</b><span>주문 {HEAT[act[0]][act[1]]}건</span>
              </Tip>
            )}
          </div>
          <div className="ch-scale">
            <span>{H_MIN}건</span>
            <i style={{ background: `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1].map(color).join(', ')})` }} />
            <span>{H_MAX}건</span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['읽는 것', '색의 진하기'], ['색', '한 색 · 연한→진한'], ['범례', '최소 · 최대']]}
        usage={[
          ['언제', '요일 × 시간, 날짜 달력처럼 두 기준이 겹친 많은 칸에서 몰리는 곳을 찾을 때'],
          ['주의', '무지개 색은 순서가 없어 어느 쪽이 큰지 헷갈리고, 색약이면 더 어려워요. 한 가지 색의 진하기로 칠하고, 정확한 값은 말풍선으로 주세요'],
        ]}
      />
    </Card>
  )
}

/* ================= 08 KPI 카드 ================= */
type Kpi = { name: string; unit: string; v: number; w: number; m: number; good: 'up' | 'down'; spark: number[]; dec?: number }
const KPIS: Kpi[] = [
  { name: '매출', unit: '만 원', v: 412, w: 381, m: 398, good: 'up', spark: [52, 48, 55, 53, 64, 74, 66] },
  { name: '주문 수', unit: '건', v: 1284, w: 1302, m: 1190, good: 'up', spark: [176, 168, 181, 170, 195, 214, 180] },
  { name: '객단가', unit: '원', v: 3210, w: 2926, m: 3345, good: 'up', spark: [2950, 2860, 3040, 3120, 3280, 3460, 3670] },
  { name: '평균 대기', unit: '분', v: 4.2, w: 3.5, m: 4.6, good: 'down', spark: [3.1, 3.4, 3.2, 3.9, 4.6, 5.8, 5.4], dec: 1 },
]
const CMP = { w: '지난주', m: '지난달 같은 주' } as const
const KPI_LOG = <>비교 기간과 <b>표시 방식</b>을 바꿔 보세요</>

/** 0 → 목표값으로 숫자 올리기 */
function useCountUp(target: number, on: boolean) {
  const m = useMotion()
  const [v, setV] = useState(target)
  useEffect(() => {
    if (!on) { const id = requestAnimationFrame(() => setV(0)); return () => cancelAnimationFrame(id) }
    let id = 0
    const t0 = performance.now(), dur = m.D(700)
    const from = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3
      setV(from + (target - from) * e)
      if (k < 1) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [target, on, m])
  return v
}

function KpiTile({ k, cmp, honest, on }: { k: Kpi; cmp: 'w' | 'm'; honest: boolean; on: boolean }) {
  const [hov, setHov] = useState<number | null>(null)
  const val = useCountUp(k.v, on)
  const base = k[cmp]
  const d = ((k.v - base) / base) * 100
  const up = d >= 0
  const better = k.good === 'up' ? up : !up
  const tone = honest ? (better ? 'good' : 'bad') : up ? 'good' : 'bad'
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    setHov(Math.max(0, Math.min(6, Math.round(((e.clientX - b.left) / b.width) * 6))))
  }
  return (
    <div className="ch-kpi">
      <div className="ch-kpi-k">{k.name}</div>
      <div className="ch-kpi-v"><b>{k.dec ? val.toFixed(k.dec) : fmt(val)}</b><span>{k.unit}</span></div>
      <div className={'ch-kpi-d ' + tone}>
        {honest
          ? <><span aria-hidden="true">{up ? '▲' : '▼'}</span> {up ? '+' : '−'}{Math.abs(d).toFixed(1)}% <em>{CMP[cmp]}보다</em><span className="sr">{better ? ', 좋아졌어요' : ', 나빠졌어요'}</span></>
          : <>{Math.abs(d).toFixed(1)}%</>}
      </div>
      <div className="ch-kpi-sp" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHov(null)} aria-hidden="true">
        <Spark data={k.spark} w={120} h={24} active={hov} />
        <small>{hov !== null ? `${DAYS[hov]} ${k.dec ? k.spark[hov].toFixed(k.dec) : fmt(k.spark[hov])}${k.unit}` : '최근 7일'}</small>
      </div>
    </div>
  )
}

export function KpiCard() {
  const show = useShow()
  const box = useRef<HTMLDivElement>(null)
  const [cmp, setCmp] = useState<'w' | 'm'>('w')
  const [honest, setHonest] = useState(true)
  const [log, setLog] = useState<ReactNode>(KPI_LOG)
  const pickHonest = (h: boolean) => {
    setHonest(h)
    setLog(h ? <><b>▲▼ 기호 + 부호 + 비교 기간</b> — 대기 시간이 늘어난 건 빨강이에요</> : <>색만: 오른 건지 내린 건지 모르고, <b>대기 시간 증가</b>가 초록으로 칭찬받아요</>)
  }

  const demo = useDemo({
    reset() { show.hide(); setCmp('w'); setHonest(true); setLog(KPI_LOG) },
    async play(c) {
      show.show(); await c.sleep(1300)
      const seg = (v: string) => box.current?.querySelector<HTMLElement>(`.seg-x [data-v="${v}"]`) ?? null
      await c.press(box.current, seg('m')); await c.sleep(1500)
      await c.press(box.current, seg('w')); await c.sleep(600)
      await c.press(box.current, seg('0')); await c.sleep(2200)
      await c.press(box.current, seg('1')); await c.sleep(600)
    },
  })

  return (
    <Card id="chart-kpi" num="08" title="KPI 카드" en="KPI Card · Stat Tile" demo={demo}
      desc="가장 중요한 숫자 하나를 크게, 그 옆에 ‘무엇과 비교해 얼마나 변했는지’를 붙인 카드예요.">
      <Stage log={log} logId="chart-kpi-log">
        <div className="box left ch-box" ref={box}>
          <div className="ch-ctl">
            <Seg value={cmp} onChange={v => { setCmp(v); setLog(<>비교 기준이 <b>{CMP[v]}</b>로 바뀌자 화살표 방향도 달라져요</>) }} options={[['w', '지난주 대비'], ['m', '지난달 대비']]} />
            <Seg value={honest ? 1 : 0} onChange={v => pickHonest(v === 1)} options={[[0, '색만'], [1, '기호 + 색']]} />
          </div>
          <div className="ch-kpis">
            {KPIS.map(k => <KpiTile key={k.name} k={k} cmp={cmp} honest={honest} on={show.on} />)}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['구성', '값 · 변화 · 비교 기간 · 추이'], ['변화', '▲▼ + 부호'], ['색', '좋고 나쁨 기준']]}
        usage={[
          ['언제', '대시보드 맨 위, 오늘 상황을 3초 안에 알아야 할 때 (3~4개가 적당)'],
          ['주의', '초록·빨강만으로 오르내림을 알리면 색약 사용자는 못 읽어요. ▲▼와 +/−를 같이 쓰고, ‘오르면 나쁜’ 지표(대기 시간·이탈률)는 색을 거꾸로 칠하세요'],
        ]}
      />
    </Card>
  )
}

/* ================= 09 누적 막대 ================= */
const MONTHS = ['6월', '7월', '8월', '9월', '10월', '11월']
const CH: { name: string; c: string; v: number[] }[] = [
  { name: '매장', c: 'var(--c1)', v: [820, 790, 760, 740, 700, 680] },
  { name: '포장', c: 'var(--c2)', v: [300, 320, 340, 330, 360, 380] },
  { name: '배달', c: 'var(--c3)', v: [180, 240, 310, 380, 450, 520] },
]
const TOTAL = MONTHS.map((_, i) => CH.reduce((a, c) => a + c.v[i], 0))
const SW = 320, SH = 200, SL = 36, SR = 8, ST = 12, SB = 24
const STACK_LOG = <>막대에 <b>올려</b> 달마다 값을 보세요</>

export function StackedBar() {
  const show = useShow()
  const box = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'abs' | 'pct'>('abs')
  const [act, setAct] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(STACK_LOG)
  const pct = mode === 'pct'
  const ticks = pct ? [0, 25, 50, 75, 100] : [0, 400, 800, 1200, 1600]
  const hi = ticks[ticks.length - 1]
  const pw = SW - SL - SR, ph = SH - ST - SB, band = pw / 6, bw = band * 0.56, base = ST + ph
  const y = (v: number) => ST + ph * (1 - v / hi)
  const val = (c: number, i: number) => (pct ? (CH[c].v[i] / TOTAL[i]) * 100 : CH[c].v[i])

  const pickMode = (m: 'abs' | 'pct') => {
    setMode(m)
    const a = Math.round((CH[2].v[0] / TOTAL[0]) * 100), b = Math.round((CH[2].v[5] / TOTAL[5]) * 100)
    setLog(m === 'pct' ? <>100%로 보면 배달 비중이 <b>{a}% → {b}%</b>로 커진 게 또렷해요</> : <>금액으로 보면 <b>전체 매출</b>이 {fmt(TOTAL[0])} → {fmt(TOTAL[5])}만 원으로 늘었어요</>)
  }

  const demo = useDemo({
    reset() { show.hide(); setMode('abs'); setAct(null); setLog(STACK_LOG) },
    async play(c) {
      show.show(); await c.sleep(1200)
      const hit = box.current?.querySelectorAll('.ch-hit')[5] ?? null
      c.tap(box.current, hit); setAct(5); await c.sleep(1500); setAct(null)
      const seg = box.current?.querySelector<HTMLElement>('.seg-x [data-v="pct"]') ?? null
      await c.press(box.current, seg); await c.sleep(2000)
      pickMode('abs'); await c.sleep(1400)
    },
  })

  return (
    <Card id="chart-stack" num="09" title="누적 막대" en="Stacked Bar Chart" demo={demo}
      desc="막대 하나를 여러 칸으로 쌓아 ‘전체’와 ‘구성’을 함께 보여줘요. 금액과 100% 두 가지로 볼 수 있어요.">
      <Stage log={log} logId="chart-stack-log">
        <div className="box left ch-box" ref={box}>
          <div className="ch-ctl">
            <Seg value={mode} onChange={pickMode} options={[['abs', '금액'], ['pct', '100% 비율']]} />
          </div>
          <div className="ch-title">주문 경로별 매출 <span>{pct ? '단위: %' : '단위: 만 원'}</span></div>
          <Legend items={[...CH].reverse().map(c => [c.c, c.name])} />
          <div className={'ch-plot' + (show.on ? '' : ' off')}>
            <svg viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label={'주문 경로별 월 매출. ' + MONTHS.map((m, i) => `${m} ${CH.map(c => c.name + ' ' + c.v[i]).join(' ')}`).join(', ')}>
              {ticks.map(t => (
                <g key={t} className="ch-grid">
                  <line x1={SL} x2={SW - SR} y1={y(t)} y2={y(t)} />
                  <text x={SL - 6} y={y(t) + 3.5} textAnchor="end">{fmt(t)}</text>
                </g>
              ))}
              {MONTHS.map((m, i) => {
                const x = SL + band * i + (band - bw) / 2
                let cum = 0
                return (
                  <g key={m} className={act !== null && act !== i ? 'dim' : ''}>
                    {CH.map((c, k) => {
                      const v = val(k, i)
                      const top = y(cum + v), bot = y(cum)
                      cum += v
                      const h = show.on ? Math.max(0, bot - top - (k ? 2 : 0)) : 0
                      const ty = show.on ? top : base
                      return <rect key={c.name} className="ch-bar" width="1" height="1" style={{ fill: c.c, transform: `translate(${x}px, ${ty}px) scale(${bw}, ${h})`, transitionDelay: show.on ? `calc(${i * 50 + k * 60}ms * var(--slow))` : '0ms' }} />
                    })}
                  </g>
                )
              })}
              {MONTHS.map((m, i) => <text key={m} className={'ch-xl' + (act === i ? ' on' : '')} x={SL + band * i + band / 2} y={SH - 7} textAnchor="middle">{m}</text>)}
              {MONTHS.map((m, i) => (
                <rect key={m} className="ch-hit" x={SL + band * i} y={ST} width={band} height={ph} tabIndex={0}
                  aria-label={`${m} ` + CH.map(c => `${c.name} ${c.v[i]}만 원`).join(', ')}
                  onPointerEnter={() => setAct(i)} onPointerLeave={() => setAct(null)} onFocus={() => setAct(i)} onBlur={() => setAct(null)} onClick={() => setAct(i)} />
              ))}
            </svg>
            {act !== null && (
              <Tip x={SL + band * act + band / 2} y={y(pct ? 100 : TOTAL[act])} W={SW} H={SH}>
                <b>{MONTHS[act]} {pct ? '' : '합계 ' + fmt(TOTAL[act]) + '만 원'}</b>
                {[...CH].reverse().map(c => <span key={c.name} className="ch-tip-row"><i style={{ background: c.c }} />{c.name} {pct ? Math.round((c.v[act] / TOTAL[act]) * 100) + '%' : fmt(c.v[act])}</span>)}
              </Tip>
            )}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['칸', '4개 이하'], ['맨 아래', '가장 중요한 값'], ['간격', '칸 사이 2px']]}
        usage={[
          ['언제', '전체 크기와 그 안의 구성 변화를 함께 볼 때 (경로별 매출, 연령대별 가입자)'],
          ['주의', '바닥에 붙은 첫 칸만 정확히 비교돼요. 가운데 칸은 시작점이 들쭉날쭉해 비교가 어려우니 칸 수를 줄이고 중요한 값을 맨 아래에 두세요'],
        ]}
      />
    </Card>
  )
}
