import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { DAYS, fmt, linePath, niceTicks, seeded, useShow } from '../data'
import { Legend, Tip } from '../shared'

/* ================= 01 막대 그래프 ================= */
const SALES = { now: [62, 58, 71, 66, 84, 128, 117], prev: [55, 60, 64, 70, 79, 110, 121] }
type Period = keyof typeof SALES
type Axis = 'zero' | 'cut'
const BW = 320, BH = 200, BL = 34, BR = 8, BT = 14, BB = 24
const BAR_LOG = <>막대를 <b>눌러</b> 값을 보고, 축을 <b>잘라</b> 보세요</>

export function BarChart() {
  const show = useShow()
  const box = useRef<HTMLDivElement>(null)
  const [period, setPeriod] = useState<Period>('now')
  const [axis, setAxis] = useState<Axis>('zero')
  const [act, setAct] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(BAR_LOG)

  const data = SALES[period], other = SALES[period === 'now' ? 'prev' : 'now']
  const ticks = axis === 'zero' ? niceTicks(0, 128, 3) : [50, 70, 90, 110, 130]
  const lo = ticks[0], hi = ticks[ticks.length - 1]
  const pw = BW - BL - BR, ph = BH - BT - BB, band = pw / 7, bw = band * 0.56
  const y = (v: number) => BT + ph * (1 - (v - lo) / (hi - lo))
  const base = BT + ph

  const pickAxis = (a: Axis) => {
    setAxis(a)
    const mx = Math.max(...data), mn = Math.min(...data)
    const real = mx / mn, seen = a === 'cut' ? (mx - 50) / (mn - 50) : real
    setLog(a === 'cut'
      ? <>잘린 축: 가장 큰 날이 작은 날의 <b>{seen.toFixed(1)}배</b>처럼 보여요 (실제 {real.toFixed(1)}배)</>
      : <>0부터 시작: 막대 길이가 <b>실제 비율 {real.toFixed(1)}배</b> 그대로예요</>)
  }
  const pick = (i: number | null) => setAct(i)

  const demo = useDemo({
    reset() { show.hide(); setPeriod('now'); setAxis('zero'); setAct(null); setLog(BAR_LOG) },
    async play(c) {
      show.show(); await c.sleep(1000)
      const hit = box.current?.querySelectorAll('.ch-hit')[5] ?? null
      c.tap(box.current, hit); setAct(5); setLog(<>토요일 <b>128만 원</b> — 이번 주 최고예요</>); await c.sleep(1500)
      setAct(null); pickAxis('cut'); await c.sleep(2200)
      pickAxis('zero'); await c.sleep(600)
    },
  })

  return (
    <Card id="chart-bar" num="01" title="막대 그래프" en="Bar Chart" demo={demo}
      desc="항목끼리 크기를 견줄 때 써요. 막대 길이가 곧 값이라 가장 정확하게 읽혀요.">
      <Stage log={log} logId="chart-bar-log">
        <div className="box left ch-box" ref={box}>
          <div className="ch-ctl">
            <Seg value={period} onChange={v => { setPeriod(v); setLog(v === 'now' ? '이번 주 매출이에요' : '지난주 매출이에요') }} options={[['now', '이번 주'], ['prev', '지난주']]} />
            <Seg value={axis} onChange={pickAxis} options={[['zero', '0부터'], ['cut', '잘린 축']]} />
          </div>
          <div className="ch-title">달빛커피 요일별 매출 <span>단위: 만 원</span></div>
          <div className={'ch-plot' + (show.on ? '' : ' off')}>
            <svg viewBox={`0 0 ${BW} ${BH}`} role="img" aria-label={'요일별 매출 ' + data.map((v, i) => DAYS[i] + ' ' + v + '만 원').join(', ')}>
              {ticks.map(t => (
                <g key={t} className="ch-grid">
                  <line x1={BL} x2={BW - BR} y1={y(t)} y2={y(t)} />
                  <text x={BL - 6} y={y(t) + 3.5} textAnchor="end">{t}</text>
                </g>
              ))}
              {axis === 'cut' && <path className="ch-break" d={`M${BL - 4} ${base - 4} l8 -4 M${BL - 4} ${base + 1} l8 -4`} />}
              {data.map((v, i) => {
                const x = BL + band * i + (band - bw) / 2
                const h = show.on ? base - y(v) : 0
                return (
                  <rect key={i} className={'ch-bar' + (act !== null && act !== i ? ' dim' : '')} width="1" height="1"
                    style={{ transform: `translate(${x}px, ${base - h}px) scale(${bw}, ${h})`, transitionDelay: show.on ? `calc(${i * 45}ms * var(--slow))` : '0ms' }} />
                )
              })}
              {DAYS.map((d, i) => <text key={d} className={'ch-xl' + (act === i ? ' on' : '')} x={BL + band * i + band / 2} y={BH - 7} textAnchor="middle">{d}</text>)}
              {data.map((v, i) => (
                <rect key={i} className="ch-hit" x={BL + band * i} y={BT} width={band} height={ph} tabIndex={0}
                  aria-label={DAYS[i] + '요일 ' + v + '만 원'}
                  onPointerEnter={() => pick(i)} onPointerLeave={() => pick(null)} onFocus={() => pick(i)} onBlur={() => pick(null)}
                  onClick={() => { pick(i); setLog(<>{DAYS[i]}요일 <b>{v}만 원</b></>) }} />
              ))}
            </svg>
            {act !== null && (
              <Tip x={BL + band * act + band / 2} y={y(data[act])} W={BW} H={BH}>
                <b>{DAYS[act]}요일 {data[act]}만 원</b>
                <span>{period === 'now' ? '지난주' : '이번 주'}보다 {data[act] - other[act] >= 0 ? '+' : ''}{data[act] - other[act]}</span>
              </Tip>
            )}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['읽는 것', '길이'], ['축', '0에서 시작'], ['항목', '12개 이하']]}
        usage={[
          ['언제', '요일·지점·메뉴처럼 나뉜 항목끼리 많고 적음을 비교할 때'],
          ['주의', '막대는 y축을 0에서 시작해야 해요. 축을 자르면 작은 차이가 몇 배처럼 부풀어 보여요'],
        ]}
      />
    </Card>
  )
}

/* ================= 02 선 그래프 ================= */
const rnd = seeded(7)
const MONTH = Array.from({ length: 30 }, (_, i) => Math.round(140 + i * 1.6 + ([0, 0, 0, 0, 30, 85, 70][i % 7]) + rnd() * 24))
const MONTH_PREV = Array.from({ length: 30 }, (_, i) => Math.round(128 + i * 0.6 + ([0, 0, 0, 0, 24, 70, 66][i % 7]) + rnd() * 24))
const VISIT = {
  w: { now: [132, 141, 128, 150, 176, 231, 214], prev: [120, 126, 131, 138, 160, 205, 220], label: (i: number) => DAYS[i] + '요일', tick: (i: number) => DAYS[i], every: 1 },
  m: { now: MONTH, prev: MONTH_PREV, label: (i: number) => '11월 ' + (i + 1) + '일', tick: (i: number) => String(i + 1), every: 7 },
}
const LW = 320, LH = 190, LL = 34, LR = 10, LT = 14, LB = 24
const LINE_LOG = <>그래프 위를 <b>훑어</b> 보세요 (키보드는 ← →)</>

export function LineChart() {
  const T = useTimers()
  const show = useShow()
  const box = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [range, setRange] = useState<'w' | 'm'>('w')
  const [cmp, setCmp] = useState(false)
  const [act, setAct] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(LINE_LOG)

  const D = VISIT[range], n = D.now.length
  const all = cmp ? [...D.now, ...D.prev] : D.now
  const ticks = niceTicks(0, Math.max(...all), 3)
  const hi = ticks[ticks.length - 1]
  const pw = LW - LL - LR, ph = LH - LT - LB
  const x = (i: number) => LL + (i / (n - 1)) * pw
  const y = (v: number) => LT + ph * (1 - v / hi)
  const pts = (arr: number[]) => arr.map((v, i): [number, number] => [x(i), y(v)])

  const redraw = () => { show.hide(); T.set(show.show, 40) }
  const pickRange = (r: 'w' | 'm') => { setRange(r); setAct(null); redraw(); setLog(r === 'w' ? '최근 7일 방문자예요' : <>30일로 넓히니 <b>주말마다 솟는</b> 패턴이 보여요</>) }
  const toggleCmp = () => { const v = !cmp; setCmp(v); setLog(v ? <>지난 기간은 <b>점선 회색</b>으로 한 걸음 뒤에 둬요</> : '비교선을 껐어요') }
  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * LW
    setAct(Math.max(0, Math.min(n - 1, Math.round(((vx - LL) / pw) * (n - 1)))))
  }
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setAct(a => Math.max(0, Math.min(n - 1, (a ?? (e.key === 'ArrowLeft' ? n : -1)) + (e.key === 'ArrowLeft' ? -1 : 1))))
  }

  const demo = useDemo({
    reset() { show.hide(); setRange('w'); setCmp(false); setAct(null); setLog(LINE_LOG) },
    async play(c) {
      show.show(); await c.sleep(1100)
      for (const i of [1, 3, 5]) { setAct(i); await c.sleep(450) }
      setLog(<>토요일 <b>231명</b> — 선은 ‘흐름’을 읽게 해줘요</>); await c.sleep(1200)
      setAct(null)
      const btn = box.current?.querySelector<HTMLElement>('.ch-cmp') ?? null
      await c.press(box.current, btn); await c.sleep(1400)
      const seg = box.current?.querySelector<HTMLElement>('.seg-x [data-v="m"]') ?? null
      await c.press(box.current, seg); await c.sleep(1200)
    },
  })

  return (
    <Card id="chart-line" num="02" title="선 그래프" en="Line Chart" demo={demo}
      desc="시간에 따라 값이 어떻게 오르내리는지 보여줘요. 점보다 ‘흐름’을 읽는 그래프예요.">
      <Stage log={log} logId="chart-line-log">
        <div className="box left ch-box" ref={box}>
          <div className="ch-ctl">
            <Seg value={range} onChange={pickRange} options={[['w', '7일'], ['m', '30일']]} />
            <button type="button" className="chip ch-cmp" aria-pressed={cmp} onClick={toggleCmp}>지난 기간 비교</button>
          </div>
          <div className="ch-title">하루 방문자 <span>단위: 명</span></div>
          {cmp && <Legend items={[['var(--c1)', '이번 기간'], ['var(--c4)', '지난 기간']]} />}
          <div className={'ch-plot' + (show.on ? '' : ' off')}>
            <svg ref={svg} viewBox={`0 0 ${LW} ${LH}`} tabIndex={0} role="img" className="ch-line-svg"
              aria-label={'하루 방문자 선 그래프, 최고 ' + Math.max(...D.now) + '명. 좌우 화살표로 날짜별 값을 볼 수 있어요'}
              onPointerMove={fromPointer} onPointerDown={fromPointer} onPointerLeave={() => setAct(null)} onKeyDown={onKey} onBlur={() => setAct(null)}>
              {ticks.map(t => (
                <g key={t} className="ch-grid">
                  <line x1={LL} x2={LW - LR} y1={y(t)} y2={y(t)} />
                  <text x={LL - 6} y={y(t) + 3.5} textAnchor="end">{t}</text>
                </g>
              ))}
              {D.now.map((_, i) => (i % D.every === 0 || i === n - 1) && (
                <text key={i} className={'ch-xl' + (act === i ? ' on' : '')} x={x(i)} y={LH - 7} textAnchor="middle">{D.tick(i)}</text>
              ))}
              {act !== null && <line className="ch-cross" x1={x(act)} x2={x(act)} y1={LT} y2={LT + ph} />}
              {cmp && <path className={'ch-ln prev' + (show.on ? ' in' : '')} d={linePath(pts(D.prev))} pathLength={1} />}
              <path className={'ch-ln' + (show.on ? ' in' : '')} d={linePath(pts(D.now))} pathLength={1} />
              {act !== null && <>
                {cmp && <circle className="ch-dot prev" cx={x(act)} cy={y(D.prev[act])} r="4" />}
                <circle className="ch-dot" cx={x(act)} cy={y(D.now[act])} r="4.5" />
              </>}
              {act === null && show.on && <circle className="ch-dot end" cx={x(n - 1)} cy={y(D.now[n - 1])} r="4" />}
            </svg>
            {act !== null && (
              <Tip x={x(act)} y={Math.min(y(D.now[act]), cmp ? y(D.prev[act]) : 999)} W={LW} H={LH}>
                <b>{D.label(act)} {D.now[act]}명</b>
                {cmp && <span>지난 기간 {D.prev[act]}명</span>}
              </Tip>
            )}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['읽는 것', '기울기 · 흐름'], ['선', '2px · 4개 이하'], ['비교', '점선 · 회색']]}
        usage={[
          ['언제', '날짜·시간처럼 이어지는 축에서 오르내림과 추세를 볼 때'],
          ['주의', '선이 4개를 넘으면 엉킨 국수가 돼요. 단위가 다른 두 값을 y축 두 개로 겹치지 말고 그래프를 나누세요'],
        ]}
      />
    </Card>
  )
}

/* ================= 03 도넛 차트 ================= */
type Slice = { name: string; v: number; c: string }
const RAW: Slice[] = [
  { name: '아메리카노', v: 38, c: 'var(--c1)' },
  { name: '카페라떼', v: 15, c: 'var(--c2)' },
  { name: '바닐라라떼', v: 12, c: 'var(--c3)' },
  { name: '치즈케이크', v: 10, c: 'color-mix(in srgb, var(--c1) 55%, var(--surface))' },
  { name: '쿠키', v: 8, c: 'color-mix(in srgb, var(--c2) 55%, var(--surface))' },
  { name: '콜드브루', v: 6, c: 'color-mix(in srgb, var(--c3) 55%, var(--surface))' },
  { name: '레몬에이드', v: 5, c: 'color-mix(in srgb, var(--c1) 30%, var(--surface))' },
  { name: '녹차라떼', v: 4, c: 'color-mix(in srgb, var(--c2) 30%, var(--surface))' },
  { name: '스콘', v: 2, c: 'color-mix(in srgb, var(--c3) 30%, var(--surface))' },
]
const TIDY: Slice[] = [
  { name: '아메리카노', v: 38, c: 'var(--c1)' },
  { name: '라떼 종류', v: 27, c: 'var(--c2)' },
  { name: '디저트', v: 20, c: 'var(--c3)' },
  { name: '기타', v: 15, c: 'var(--c4)' },
]
const CUPS = 1240
const DONUT_LOG = <>조각이나 범례에 <b>올려</b> 보세요</>

export function DonutChart() {
  const show = useShow()
  const box = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'tidy' | 'raw'>('tidy')
  const [act, setAct] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(DONUT_LOG)
  const data = mode === 'tidy' ? TIDY : RAW
  const segs = data.map((s, i) => ({ ...s, start: data.slice(0, i).reduce((a, b) => a + b.v, 0) }))

  const pickMode = (m: 'tidy' | 'raw') => {
    setMode(m); setAct(null)
    setLog(m === 'raw' ? <>9조각: <b>6% · 5% · 4%</b> 조각은 크기도 색도 구분이 안 돼요</> : <>큰 3개 + <b>기타</b>로 묶으니 한눈에 읽혀요</>)
  }
  const a = act !== null ? data[act] : null

  const demo = useDemo({
    reset() { show.hide(); setMode('tidy'); setAct(null); setLog(DONUT_LOG) },
    async play(c) {
      show.show(); await c.sleep(1000)
      setAct(0); await c.sleep(1100); setAct(null)
      pickMode('raw'); await c.sleep(900)
      for (const i of [5, 6, 7]) { setAct(i); await c.sleep(600) }
      setAct(null); await c.sleep(700)
      pickMode('tidy'); await c.sleep(600)
    },
  })

  return (
    <Card id="chart-donut" num="03" title="도넛 차트" en="Donut Chart" demo={demo}
      desc="전체를 100으로 두고 각 부분이 얼마나 차지하는지 보여줘요. 가운데에 핵심 숫자를 둘 수 있어요.">
      <Stage log={log} logId="chart-donut-log">
        <div className="box left ch-box" ref={box}>
          <div className="ch-ctl">
            <Seg value={mode} onChange={pickMode} options={[['raw', '메뉴 9개 그대로'], ['tidy', '4개로 묶기']]} />
          </div>
          <div className="ch-title">이번 달 판매 비중 <span>총 {fmt(CUPS)}개</span></div>
          <div className="ch-donut-wrap">
            <svg viewBox="0 0 140 140" className="ch-donut" role="img" aria-label={'판매 비중 ' + data.map(s => s.name + ' ' + s.v + '%').join(', ')}>
              <g className={'ch-donut-g' + (show.on ? ' in' : '')}>
                <g transform="rotate(-90 70 70)">
                  {segs.map((s, i) => (
                    <circle key={s.name} cx="70" cy="70" r="52" pathLength={100} className={'ch-arc' + (act === i ? ' on' : act !== null ? ' dim' : '')}
                      style={{ stroke: s.c, strokeDasharray: `${s.v - 0.8} ${100 - s.v + 0.8}`, strokeDashoffset: -s.start }}
                      onPointerEnter={() => setAct(i)} onPointerLeave={() => setAct(null)} onClick={() => setAct(i)} />
                  ))}
                </g>
              </g>
              <text x="70" y="66" textAnchor="middle" className="ch-dn-k">{a ? a.name : '아메리카노'}</text>
              <text x="70" y="86" textAnchor="middle" className="ch-dn-v">{a ? a.v : 38}%</text>
            </svg>
            <ul className="ch-dn-legend">
              {data.map((s, i) => (
                <li key={s.name}>
                  <button type="button" className={act === i ? 'on' : ''} onPointerEnter={() => setAct(i)} onPointerLeave={() => setAct(null)}
                    onFocus={() => setAct(i)} onBlur={() => setAct(null)} aria-label={`${s.name} ${s.v}%, ${fmt((CUPS * s.v) / 100)}개`}>
                    <i style={{ background: s.c }} /><span>{s.name}</span><b>{s.v}%</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['읽는 것', '비율 (합 100%)'], ['조각', '5개 이하'], ['가운데', '핵심 숫자']]}
        usage={[
          ['언제', '구성 비율이 핵심이고 조각이 2~5개일 때 (예: 결제 수단 비중)'],
          ['주의', '조각이 5개를 넘으면 작은 조각끼리 구분이 안 돼요. 작은 것은 ‘기타’로 묶거나 가로 막대로 바꾸세요'],
        ]}
      />
    </Card>
  )
}
