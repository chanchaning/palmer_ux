import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { NOW_MIN, TODAY, addDays, addMonths, diffDays, fmt, fmtMonth, key, rel, same } from '../date'
import { CalHead, MonthGrid } from '../shared'

const q = <T extends HTMLElement>(root: HTMLElement | null, sel: string) => root?.querySelector<T>(sel) ?? null
const THIS_MONTH = addMonths(TODAY, 0)
const monthDelta = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()

/* ---------- 04 캘린더 ---------- */
const CAL_MAX = addMonths(TODAY, 2)
const calBlock = (d: Date) => diffDays(TODAY, d) < 0 ? '지난 날이에요' : same(d, TODAY) ? '오늘 주문은 내일부터 받을 수 있어요' : d.getDay() === 0 ? '일요일은 배송을 쉬어요' : false
const CAL_LOG = <>날짜를 누르거나, 칸에 포커스를 두고 <b>방향키</b>로 움직여 보세요</>

export function Calendar() {
  const [month, setMonth] = useState(THIS_MONTH)
  const [sel, setSel] = useState<Date | null>(null)
  const [log, setLog] = useState<ReactNode>(CAL_LOG)
  const box = useRef<HTMLDivElement>(null)

  const move = (dl: number) => {
    const n = addMonths(month, dl)
    if (monthDelta(THIS_MONTH, n) < 0 || monthDelta(n, CAL_MAX) < 0) return false
    setMonth(n)
    setLog(<><b>{fmtMonth(n)}</b> — 6주 칸은 그달 1일의 요일로 새로 계산돼요</>)
  }
  const pick = (d: Date) => { setSel(d); setLog(<><b>{fmt(d)}</b> 배송 · {rel(d)}</>) }
  const demo = useDemo({
    reset() { setMonth(THIS_MONTH); setSel(null); setLog(CAL_LOG) },
    async play(c) {
      await c.press(box.current, q(box.current, `[data-key="${key(addDays(TODAY, -2))}"]`)); await c.sleep(1100)
      await c.press(box.current, q(box.current, `[data-key="${key(addDays(TODAY, 6))}"]`)); await c.sleep(1100)
      await c.press(box.current, q(box.current, `[data-key="${key(addDays(TODAY, 4))}"]`)); await c.sleep(1100)
      await c.press(box.current, q(box.current, '.dt-nav.next')); await c.sleep(1100)
      await c.press(box.current, q(box.current, '.dt-jump')); await c.sleep(600)
    },
  })

  return (
    <Card id="date-cal" num="04" title="캘린더" en="Calendar · Date Picker" demo={demo}
      desc="한 달을 요일 칸에 맞춰 펼쳐요. 요일과 앞뒤 날짜가 함께 보여서 ‘언제쯤’을 감으로 고를 수 있어요.">
      <Stage log={log} logId="date-cal-log">
        <div className="dt-panel" ref={box}>
          <div className="dt-title">배송 희망일<span className="sp" /><button type="button" className="dt-jump" onClick={() => { setMonth(THIS_MONTH); setLog(<><b>오늘</b>이 있는 달로 돌아왔어요</>) }} disabled={same(month, THIS_MONTH)}>오늘</button></div>
          <CalHead month={month} onMove={move} canPrev={monthDelta(THIS_MONTH, month) > 0} canNext={monthDelta(month, CAL_MAX) > 0} />
          <MonthGrid month={month} label={fmtMonth(month) + ' 배송 희망일'} block={calBlock}
            cls={d => same(d, sel) ? 'sel' : ''} focusDate={sel}
            onPick={pick} onBlocked={(_, why) => setLog(<>고를 수 없어요 — <b>{why}</b></>)} onMonth={move} />
          <div className="dt-legend"><span><i className="today" />오늘</span><span><i className="sel" />선택</span><span><i className="off" />고를 수 없음</span></div>
        </div>
      </Stage>
      <Info
        spec={[['칸', '7열 × 6주'], ['막힌 날', '흐리게 + 이유'], ['키보드', '방향키 · PageUp/Down']]}
        usage={[
          ['언제', '배송일, 일정처럼 앞으로 몇 주 안에서 요일을 보며 고를 때'],
          ['주의', '생년월일처럼 먼 날짜를 달력으로 고르게 하면 수십 번 넘겨야 해요 — 그땐 입력이나 휠로'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 휠 피커 ---------- */
const ITEM = 36
function WheelCol({ items, value, onChange, label, valueText }: {
  items: string[]; value: number; onChange: (i: number) => void; label: string; valueText: string
}) {
  const el = useRef<HTMLDivElement>(null)
  const init = useRef(value)
  useLayoutEffect(() => { if (el.current) el.current.scrollTop = init.current * ITEM }, [])
  useEffect(() => {
    const c = el.current
    if (c && Math.round(c.scrollTop / ITEM) !== value) c.scrollTo({ top: value * ITEM, behavior: 'smooth' })
  }, [value])
  const onScroll = () => {
    const c = el.current
    if (!c) return
    const i = Math.max(0, Math.min(items.length - 1, Math.round(c.scrollTop / ITEM)))
    if (i !== value) onChange(i)
  }
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (!d) return
    e.preventDefault()
    onChange(Math.max(0, Math.min(items.length - 1, value + d)))
  }
  return (
    <div className="dt-wcol" ref={el} onScroll={onScroll} onKeyDown={onKey} tabIndex={0}
      role="spinbutton" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={items.length - 1} aria-valuetext={valueText}>
      {items.map((t, i) => (
        <div key={t} className={'dt-witem d' + Math.min(3, Math.abs(i - value))} onClick={() => onChange(i)} aria-hidden="true">{t}</div>
      ))}
    </div>
  )
}

const AP = ['오전', '오후']
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
const WHEEL_LOG = <>칸을 <b>위아래로 굴리거나</b> 눌러서 알람 시각을 맞춰 보세요</>

export function Wheel() {
  const [ap, setAp] = useState(0)
  const [h, setH] = useState(6) // 7시
  const [mi, setMi] = useState(6) // 30분
  const [moved, setMoved] = useState(false)
  const on = (f: (i: number) => void) => (i: number) => { setMoved(true); f(i) }
  const dev = useRef<HTMLDivElement>(null)

  const hour24 = (Number(HOURS[h]) % 12) + (ap ? 12 : 0)
  const total = hour24 * 60 + mi * 5
  let left = total - NOW_MIN
  if (left <= 0) left += 1440
  const valueText = `${AP[ap]} ${HOURS[h]}시 ${mi * 5}분`
  const log: ReactNode = !moved ? WHEEL_LOG : <>알람까지 <b>{Math.floor(left / 60)}시간 {left % 60}분</b> · {total <= NOW_MIN ? '내일' : '오늘'} 울려요</>

  const demo = useDemo({
    reset() { setAp(0); setH(6); setMi(6); setMoved(false) },
    async play(c) {
      const cols = dev.current?.querySelectorAll<HTMLElement>('.dt-wcol')
      c.tap(dev.current, cols?.[0] ?? null); await c.sleep(250); on(setAp)(1); await c.sleep(900)
      c.tap(dev.current, cols?.[1] ?? null); await c.sleep(250); on(setH)(1); await c.sleep(1000)
      c.tap(dev.current, cols?.[2] ?? null); await c.sleep(250); on(setMi)(9); await c.sleep(900)
    },
  })

  return (
    <Card id="date-wheel" num="05" title="휠 피커" en="Wheel Picker" demo={demo}
      desc="숫자를 세로 바퀴처럼 굴려서 가운데 칸에 맞춰요. 엄지로 빠르게 밀기 좋아 폰에서 많이 써요.">
      <Stage log={log} logId="date-wheel-log">
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">알람 추가<span className="sp" /><button type="button">저장</button></div>
            <div className="dt-wbig" aria-hidden="true">{AP[ap]} <b>{HOURS[h]}:{MINS[mi]}</b></div>
            <div className="dt-wheel">
              <div className="dt-wband" aria-hidden="true" />
              <WheelCol items={AP} value={ap} onChange={on(setAp)} label="오전 오후" valueText={AP[ap]} />
              <WheelCol items={HOURS} value={h} onChange={on(setH)} label="시" valueText={HOURS[h] + '시'} />
              <WheelCol items={MINS} value={mi} onChange={on(setMi)} label="분" valueText={MINS[mi] + '분'} />
            </div>
            <span className="dt-sr" aria-live="polite">{valueText}</span>
            <div className="dt-wopts">
              <div className="row"><span>반복</span><span className="muted">안 함 ›</span></div>
              <div className="row"><span>소리</span><span className="muted">새소리 ›</span></div>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['칸 높이', '32–44px'], ['보이는 칸', '5–7개'], ['맞춤', 'scroll-snap']]}
        usage={[
          ['언제', '알람 · 타이머 · 출생 연도처럼 정해진 범위에서 숫자 하나씩 맞출 때'],
          ['주의', '항목이 100개를 넘으면 굴리기 지쳐요 — 분은 5분 단위로, 연도는 입력칸을 함께 주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 기간 선택 ---------- */
const RANGE_MIN = addMonths(TODAY, -12)
const PRESETS: [string, string, () => [Date, Date]][] = [
  ['7', '최근 7일', () => [addDays(TODAY, -6), TODAY]],
  ['30', '최근 30일', () => [addDays(TODAY, -29), TODAY]],
  ['this', '이번 달', () => [THIS_MONTH, TODAY]],
  ['last', '지난달', () => [addMonths(TODAY, -1), addDays(THIS_MONTH, -1)]],
]
const RANGE_LOG = <><b>시작일</b>을 누르고, 이어서 <b>종료일</b>을 눌러 보세요</>

export function Range() {
  const [month, setMonth] = useState(THIS_MONTH)
  const [start, setStart] = useState<Date | null>(null)
  const [end, setEnd] = useState<Date | null>(null)
  const [hover, setHover] = useState<Date | null>(null)
  const [preset, setPreset] = useState<string | null>(null)
  const [log, setLog] = useState<ReactNode>(RANGE_LOG)
  const box = useRef<HTMLDivElement>(null)

  const move = (dl: number) => {
    const n = addMonths(month, dl)
    if (monthDelta(RANGE_MIN, n) < 0 || monthDelta(n, THIS_MONTH) < 0) return false
    setMonth(n)
  }
  const pick = (d: Date) => {
    setPreset(null)
    if (!start || end) { setStart(d); setEnd(null); setLog(<>시작 <b>{fmt(d)}</b> — 이제 종료일을 골라요</>); return }
    if (diffDays(start, d) < 0) { setStart(d); setLog(<>시작보다 앞이라 <b>시작일을 바꿨어요</b> → {fmt(d)}</>); return }
    setEnd(d)
    setLog(<><b>{diffDays(start, d) + 1}일</b> 기간을 골랐어요</>)
  }
  const applyPreset = (id: string, label: string, f: () => [Date, Date]) => {
    const [a, b] = f()
    setStart(a); setEnd(b); setPreset(id); setMonth(addMonths(b, 0))
    setLog(<>‘{label}’ — 버튼 하나로 <b>{diffDays(a, b) + 1}일</b>이 채워져요</>)
  }
  const to = end ?? (start && hover && diffDays(start, hover) >= 0 ? hover : null)
  const cls = (d: Date) => {
    if (!start) return ''
    const c: string[] = []
    if (same(d, start)) c.push(to && !same(start, to) ? 'start cont' : 'start')
    if (to && same(d, to)) c.push(end ? 'end' : 'end prev')
    if (to && diffDays(start, d) > 0 && diffDays(d, to) > 0) c.push(end ? 'in' : 'in prev')
    return c.join(' ')
  }
  const demo = useDemo({
    reset() { setMonth(THIS_MONTH); setStart(null); setEnd(null); setHover(null); setPreset(null); setLog(RANGE_LOG) },
    async play(c) {
      await c.press(box.current, q(box.current, '[data-key="2026-11-03"]')); await c.sleep(700)
      setHover(new Date(2026, 10, 7)); await c.sleep(500)
      await c.press(box.current, q(box.current, '[data-key="2026-11-09"]')); await c.sleep(1300)
      await c.press(box.current, q(box.current, '[data-p="30"]')); await c.sleep(800)
    },
  })

  const days = start && end ? diffDays(start, end) + 1 : 0
  return (
    <Card id="date-range" num="06" title="기간 선택" en="Date Range Picker" demo={demo}
      desc="시작일과 종료일, 두 번 눌러 기간을 정해요. 사이 날짜가 띠로 칠해져 길이가 한눈에 보여요.">
      <Stage log={log} logId="date-range-log">
        <div className="dt-panel" ref={box}>
          <div className="dt-rfields">
            <div className={!start || end ? 'on' : ''}><small>시작</small><b>{start ? fmt(start) : '—'}</b></div>
            <span aria-hidden="true">→</span>
            <div className={start && !end ? 'on' : ''}><small>종료</small><b>{end ? fmt(end) : '—'}</b></div>
          </div>
          <div className="dt-presets">
            {PRESETS.map(([id, label, f]) => <button key={id} type="button" data-p={id} className="chip" aria-pressed={preset === id} onClick={() => applyPreset(id, label, f)}>{label}</button>)}
          </div>
          <CalHead month={month} onMove={move} canPrev={monthDelta(RANGE_MIN, month) > 0} canNext={monthDelta(month, THIS_MONTH) > 0} />
          <MonthGrid month={month} label={fmtMonth(month) + ' 기간 선택'} block={d => diffDays(TODAY, d) > 0 ? '아직 오지 않은 날이에요' : false}
            cls={cls} focusDate={end ?? start} onPick={pick} onHover={setHover} onMonth={move}
            onBlocked={(_, why) => setLog(<>고를 수 없어요 — <b>{why}</b></>)} />
          <div className="dt-sum"><span className="muted">리포트 기간</span><b>{days ? `${days}일` : start ? '종료일 선택 중' : '—'}</b></div>
        </div>
      </Stage>
      <Info
        spec={[['누르기', '2번 (시작 · 종료)'], ['자주 쓰는 기간', '버튼으로'], ['미리보기', '올리면 띠 표시']]}
        usage={[
          ['언제', '리포트 조회, 휴가 신청, 거래 내역 필터처럼 ‘언제부터 언제까지’가 필요할 때'],
          ['주의', '시작보다 앞 날짜를 누르면 오류 대신 시작일을 바꿔 주세요 — 사람은 순서대로 누르지 않아요'],
        ]}
      />
    </Card>
  )
}
