import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Range, Seg } from '../../../components/ui'
import { DAYS, fmt, useShow } from '../data'
import { Spark } from '../shared'

/* ================= 04 스파크라인 ================= */
const MENU_ROWS: { name: string; w: number[]; m: number[] }[] = [
  { name: '아메리카노', w: [62, 58, 66, 61, 70, 95, 88], m: [410, 432, 455, 480] },
  { name: '카페라떼', w: [28, 30, 27, 31, 33, 48, 44], m: [210, 220, 214, 241] },
  { name: '치즈케이크', w: [9, 8, 11, 10, 12, 22, 19], m: [80, 76, 71, 66] },
  { name: '레몬에이드', w: [4, 5, 3, 6, 8, 14, 12], m: [30, 38, 45, 57] },
]
const SP_W = 84
const SPARK_LOG = <>작은 선 위를 <b>훑어</b> 보세요</>

export function Sparkline() {
  const box = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState<'w' | 'm'>('w')
  const [scale, setScale] = useState<'own' | 'shared'>('own')
  const [hov, setHov] = useState<{ r: number; i: number } | null>(null)
  const [log, setLog] = useState<ReactNode>(SPARK_LOG)

  const series = MENU_ROWS.map(r => r[range])
  const gMax = Math.max(...series.flat())
  const label = (i: number) => (range === 'w' ? DAYS[i] : i + 1 + '주')
  const n = series[0].length

  const move = (r: number) => (e: PointerEvent<HTMLSpanElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - b.left) / b.width) * (n - 1))))
    setHov({ r, i })
  }
  const key = (r: number) => (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setHov(h => ({ r, i: Math.max(0, Math.min(n - 1, (h && h.r === r ? h.i : n - 1) + (e.key === 'ArrowLeft' ? -1 : 1))) }))
  }
  const pickScale = (s: 'own' | 'shared') => {
    setScale(s)
    setLog(s === 'shared' ? <>같은 축: 크기는 비교되지만 <b>레몬에이드의 급상승</b>이 납작하게 묻혀요</> : <>줄마다 축: <b>모양(추세)</b>은 잘 보이지만 줄끼리 높이는 비교하면 안 돼요</>)
  }

  const demo = useDemo({
    reset() { setRange('w'); setScale('own'); setHov(null); setLog(SPARK_LOG) },
    async play(c) {
      const sp = box.current?.querySelectorAll('.ch-sp-cell')[3] ?? null
      c.tap(box.current, sp)
      for (let i = 0; i < 7; i++) { setHov({ r: 3, i }); await c.sleep(230) }
      setLog(<>레몬에이드는 <b>주말에 3배</b> 가까이 팔려요</>); await c.sleep(1300)
      setHov(null); pickScale('shared'); await c.sleep(2200)
      pickScale('own'); await c.sleep(500)
    },
  })

  return (
    <Card id="chart-spark" num="04" title="스파크라인" en="Sparkline" demo={demo}
      desc="축도 눈금도 없는 글자 크기만 한 선 그래프예요. 표 한 줄, 숫자 옆에 ‘흐름’만 살짝 붙여요.">
      <Stage log={log} logId="chart-spark-log">
        <div className="box left ch-box" ref={box}>
          <div className="ch-ctl">
            <Seg value={range} onChange={v => { setRange(v); setHov(null); setLog(v === 'w' ? '최근 7일 판매량이에요' : '최근 4주 판매량이에요') }} options={[['w', '7일'], ['m', '4주']]} />
            <Seg value={scale} onChange={pickScale} options={[['own', '줄마다 축'], ['shared', '같은 축']]} />
          </div>
          <table className="ch-table">
            <thead><tr><th scope="col">메뉴</th><th scope="col">추이</th><th scope="col">판매</th><th scope="col">변화</th></tr></thead>
            <tbody>
              {MENU_ROWS.map((row, r) => {
                const d = series[r], first = d[0], last = d[d.length - 1]
                const ch = Math.round(((last - first) / first) * 100)
                const h = hov && hov.r === r ? hov.i : null
                return (
                  <tr key={row.name} className={h !== null ? 'on' : ''}>
                    <th scope="row">{row.name}</th>
                    <td>
                      <span className="ch-sp-cell" tabIndex={0} aria-label={row.name + ' 추이. 좌우 화살표로 값 보기'}
                        onPointerMove={move(r)} onPointerDown={move(r)} onPointerLeave={() => setHov(null)} onKeyDown={key(r)} onBlur={() => setHov(null)}>
                        <Spark data={d} w={SP_W} min={scale === 'shared' ? 0 : undefined} max={scale === 'shared' ? gMax : undefined} active={h} />
                      </span>
                    </td>
                    <td className="num">{h !== null ? <><small>{label(h)}</small> {fmt(d[h])}</> : fmt(d.reduce((a, b) => a + b, 0))}</td>
                    <td className={'num ' + (ch >= 0 ? 'up' : 'down')}>{ch >= 0 ? '▲' : '▼'} {Math.abs(ch)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="ch-foot">변화: 첫날 → 마지막 날 · 판매: 기간 합계 (개)</p>
        </div>
      </Stage>
      <Info
        spec={[['크기', '글자 높이 · 80px 안팎'], ['축', '없음'], ['강조', '마지막 점']]}
        usage={[
          ['언제', '표·목록·KPI 카드에서 숫자 옆에 오르는 중인지 내리는 중인지만 알려줄 때'],
          ['주의', '줄마다 축이 따로라 높이로 줄끼리 크기를 비교하면 안 돼요. 정확한 값은 옆 숫자가 맡아요'],
        ]}
      />
    </Card>
  )
}

/* ================= 05 게이지 ================= */
const ZONES: { from: number; to: number; name: string; c: string; tip: string }[] = [
  { from: 0, to: 20, name: '부족', c: 'var(--danger)', tip: '오늘 바로 주문하세요' },
  { from: 20, to: 50, name: '보통', c: 'var(--b)', tip: '이틀 안에 주문하면 돼요' },
  { from: 50, to: 100, name: '넉넉', c: 'var(--ok)', tip: '주문하지 않아도 돼요' },
]
const zoneOf = (v: number) => ZONES.find(z => v < z.to) ?? ZONES[2]
const GX = 100, GY = 104, GR = 78
const gp = (v: number, r = GR) => { const t = Math.PI * (1 - v / 100); return [GX + r * Math.cos(t), GY - r * Math.sin(t)] }
const arc = (a: number, b: number) => { const [x1, y1] = gp(a), [x2, y2] = gp(b); return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${GR} ${GR} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}` }

export function Gauge() {
  const show = useShow()
  const box = useRef<HTMLDivElement>(null)
  const [v, setV] = useState(34)
  const [form, setForm] = useState<'gauge' | 'bar'>('gauge')
  const z = zoneOf(v)
  const shown = show.on ? v : 0
  const [log, setLog] = useState<ReactNode>(<>슬라이더로 <b>원두 재고</b>를 바꿔 보세요</>)
  const change = (x: number) => { setV(x); const zz = zoneOf(x); setLog(<><b>{x}% · {zz.name}</b> — {zz.tip}</>) }

  const demo = useDemo({
    reset() { show.hide(); setV(34); setForm('gauge') },
    async play(c) {
      show.show(); await c.sleep(900)
      setLog(<><b>34% · 보통</b> — 바늘과 글자가 함께 알려줘요</>); await c.sleep(1200)
      change(12); await c.sleep(1300)
      change(72); await c.sleep(1300)
      const seg = box.current?.querySelector<HTMLElement>('.seg-x [data-v="bar"]') ?? null
      await c.press(box.current, seg); await c.sleep(1400)
    },
  })

  return (
    <Card id="chart-gauge" num="05" title="게이지" en="Gauge" demo={demo}
      desc="숫자 하나가 정해진 범위 안 어디쯤인지 계기판처럼 보여줘요. ‘좋음·나쁨’ 구간과 함께 읽어요.">
      <Stage log={log} logId="chart-gauge-log">
        <div className="box left ch-box" ref={box}>
          <div className="ch-ctl">
            <Seg value={form} onChange={f => { setForm(f); setLog(f === 'bar' ? <>같은 정보를 <b>가로 막대</b>로 — 높이가 3분의 1로 줄어요</> : '게이지로 돌아왔어요') }} options={[['gauge', '게이지'], ['bar', '가로 막대']]} />
          </div>
          <div className="ch-title">원두 재고 <span>창고 기준</span></div>
          {form === 'gauge' ? (
            <div className={'ch-gauge' + (show.on ? '' : ' off')}>
              <svg viewBox="0 0 200 122" role="img" aria-label={`원두 재고 ${v}%, ${z.name}`}>
                {ZONES.map(zz => <path key={zz.name} className={'ch-zone' + (zz === z ? ' on' : '')} d={arc(zz.from + (zz.from ? 0.8 : 0), zz.to - (zz.to < 100 ? 0.8 : 0))} style={{ stroke: zz.c }} />)}
                {ZONES.map(zz => { const [x, y] = gp((zz.from + zz.to) / 2, GR - 22); return <text key={zz.name} className="ch-zl" x={x} y={y + 3} textAnchor="middle">{zz.name}</text> })}
                <g className="ch-needle" style={{ transform: `rotate(${-90 + (180 * shown) / 100}deg)` }}>
                  <path d={`M${GX - 3} ${GY} L${GX} ${GY - GR + 14} L${GX + 3} ${GY} Z`} />
                </g>
                <circle cx={GX} cy={GY} r="6" className="ch-hub" />
                <text x="8" y="120" className="ch-zl">0</text><text x="192" y="120" className="ch-zl" textAnchor="end">100</text>
              </svg>
              <div className="ch-gv"><b>{v}%</b><span>{z.name}</span></div>
            </div>
          ) : (
            <div className="ch-bullet" role="img" aria-label={`원두 재고 ${v}%, ${z.name}`}>
              <div className="ch-bl-row"><b>{v}%</b><span>{z.name} · {z.tip}</span></div>
              <div className="ch-bl-track">
                {ZONES.map(zz => <i key={zz.name} style={{ width: zz.to - zz.from + '%', background: zz.c }} className={zz === z ? 'on' : ''} />)}
                <em style={{ left: v + '%' }} />
              </div>
              <div className="ch-bl-lab">{ZONES.map(zz => <span key={zz.name} style={{ width: zz.to - zz.from + '%' }}>{zz.name}</span>)}</div>
            </div>
          )}
          <Range value={v} min={0} max={100} onChange={change} label="원두 재고 퍼센트" />
        </div>
      </Stage>
      <Info
        spec={[['읽는 것', '범위 속 위치'], ['구간', '이름표 필수'], ['바늘', '0.6초 이동']]}
        usage={[
          ['언제', '최소·최대와 위험 구간이 분명한 값 하나 (재고, 배터리, 서버 사용률)'],
          ['주의', '자리를 많이 차지해 여러 개를 늘어놓으면 대시보드가 계기판 벽이 돼요. 빨강·초록만으로 구간을 나누지 말고 이름을 붙이세요'],
        ]}
      />
    </Card>
  )
}

/* ================= 06 진행 링 (목표 달성) ================= */
const GOAL = 1200
const WEEK_SALES = [280, 610, 930, 1310]
const MINI: { name: string; goal: number; unit: string; v: number[] }[] = [
  { name: '단골 등록', goal: 40, unit: '명', v: [9, 18, 26, 33] },
  { name: '리뷰', goal: 20, unit: '개', v: [3, 7, 12, 21] },
]
const RR = 52, RC = 2 * Math.PI * RR

function MiniRing({ p }: { p: number }) {
  const r = 14, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" className="ch-mini" aria-hidden="true">
      <circle cx="18" cy="18" r={r} className="bg" />
      <circle cx="18" cy="18" r={r} className="fg" style={{ strokeDasharray: c, strokeDashoffset: c * (1 - Math.min(1, p)) }} />
    </svg>
  )
}

export function GoalRing() {
  const show = useShow()
  const box = useRef<HTMLDivElement>(null)
  const [wk, setWk] = useState(2)
  const [money, setMoney] = useState(false)
  const v = WEEK_SALES[wk], p = show.on ? v / GOAL : 0
  const lap1 = Math.min(1, p), lap2 = Math.max(0, p - 1)
  const left = GOAL - v
  const msg = (w: number) => {
    const x = WEEK_SALES[w], l = GOAL - x
    return l > 0 ? <>{w + 1}주차 <b>{Math.round((x / GOAL) * 100)}%</b> — 목표까지 {fmt(l)}만 원 남았어요</> : <>{w + 1}주차 <b>목표 달성!</b> 100%를 넘은 만큼 한 바퀴 더 돌아요</>
  }
  const [log, setLog] = useState<ReactNode>(<>주차를 바꾸고 <b>링을 눌러</b> 보세요</>)
  const pick = (w: number) => { setWk(w); setLog(msg(w)) }

  const demo = useDemo({
    reset() { show.hide(); setWk(0); setMoney(false) },
    async play(c) {
      show.show(); setLog(msg(0)); await c.sleep(1100)
      for (const w of [1, 2, 3]) { pick(w); await c.sleep(1200) }
      const ring = box.current?.querySelector<HTMLElement>('.ch-ring') ?? null
      await c.press(box.current, ring); await c.sleep(1400)
    },
  })

  return (
    <Card id="chart-ring" num="06" title="진행 링" en="Progress Ring · Goal" demo={demo}
      desc="목표를 한 바퀴로 두고 지금까지 얼마나 해냈는지 채워 보여줘요. 기다림이 아니라 ‘성과’를 보여주는 링이에요.">
      <Stage log={log} logId="chart-ring-log">
        <div className="box left ch-box" ref={box}>
          <div className="ch-ctl">
            <Seg value={wk} onChange={pick} options={[[0, '1주'], [1, '2주'], [2, '3주'], [3, '4주']]} />
          </div>
          <div className="ch-title">11월 매출 목표 <span>{fmt(GOAL)}만 원</span></div>
          <div className="ch-ring-wrap">
            <button type="button" className={'ch-ring' + (show.on ? '' : ' off')} aria-pressed={money}
              aria-label={`목표 달성률 ${Math.round((v / GOAL) * 100)}%, ${fmt(v)}만 원. 눌러서 금액과 퍼센트 바꾸기`}
              onClick={() => { setMoney(m => !m); setLog(!money ? '금액으로 보면 ‘얼마나 벌었나’가, %로 보면 ‘얼마나 왔나’가 보여요' : '다시 퍼센트로') }}>
              <svg viewBox="0 0 128 128" aria-hidden="true">
                <circle cx="64" cy="64" r={RR} className="bg" />
                <circle cx="64" cy="64" r={RR} className="fg" style={{ strokeDasharray: RC, strokeDashoffset: RC * (1 - lap1) }} />
                {lap2 > 0 && <circle cx="64" cy="64" r={RR} className="fg over" style={{ strokeDasharray: RC, strokeDashoffset: RC * (1 - Math.min(1, lap2)) }} />}
              </svg>
              <span className="ch-ring-t">
                <b>{money ? fmt(v) : Math.round((v / GOAL) * 100) + '%'}</b>
                <small>{money ? '만 원' : left > 0 ? '달성' : '초과 달성'}</small>
              </span>
            </button>
            <ul className="ch-goals">
              <li><span>남은 금액</span><b>{left > 0 ? fmt(left) + '만 원' : '없음 ✓'}</b></li>
              {MINI.map(g => (
                <li key={g.name}>
                  <MiniRing p={show.on ? g.v[wk] / g.goal : 0} />
                  <span>{g.name}</span><b>{g.v[wk]}/{g.goal}{g.unit}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['읽는 것', '목표 대비 %'], ['남는 시간', '계속 남아요'], ['100%+', '한 바퀴 더']]}
        usage={[
          ['언제', '월 매출 목표, 하루 걸음 수, 적금처럼 ‘정해진 목표’가 있는 값'],
          ['vs 로딩 링', <>모양은 <a href="#/loading/loading-ring">로딩의 진행 링</a>과 같지만, 로딩 링은 기다림을 보여주고 끝나면 사라져요. 목표 링은 성과라 화면에 계속 남아요</>],
          ['주의', '목표가 없는 숫자(방문자 수 등)에 링을 쓰면 ‘무엇의 몇 %’인지 알 수 없어요. 가운데 숫자와 목표값을 꼭 같이 쓰세요'],
        ]}
      />
    </Card>
  )
}
