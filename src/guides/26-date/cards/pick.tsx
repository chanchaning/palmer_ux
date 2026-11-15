import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { NOW_MIN, TODAY, WD, addDays, fmt, fmtTime, key, rel, same } from '../date'

const q = <T extends HTMLElement>(root: HTMLElement | null, sel: string) => root?.querySelector<T>(sel) ?? null

/* ---------- 01 빠른 선택 칩 ---------- */
const SAT = addDays(TODAY, 6 - TODAY.getDay())
const NEXT_MON = addDays(TODAY, 8 - TODAY.getDay())
const QUICK: [string, string, Date | null][] = [
  ['today', '오늘', TODAY],
  ['tom', '내일', addDays(TODAY, 1)],
  ['wkend', '이번 주말', SAT],
  ['nextwk', '다음 주', NEXT_MON],
  ['none', '날짜 없음', null],
]
const STRIP = Array.from({ length: 14 }, (_, i) => addDays(TODAY, i))
const QUICK_LOG = <>칩 하나로 끝내거나, <b>직접 고르기</b>로 날짜를 골라 보세요</>

export function QuickChips() {
  const [sel, setSel] = useState<string>('none')
  const [date, setDate] = useState<Date | null>(null)
  const [more, setMore] = useState(false)
  const [log, setLog] = useState<ReactNode>(QUICK_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const pick = (id: string, d: Date | null, label: string) => {
    setSel(id); setDate(d)
    setLog(d ? <>‘{label}’ → <b>{fmt(d)}</b> · 탭 한 번으로 끝</> : <>마감일 <b>없음</b> — 고르지 않는 것도 선택지예요</>)
  }
  const custom = (d: Date) => {
    setSel('custom'); setDate(d)
    setLog(<>직접 고르기 → <b>{fmt(d)}</b> ({rel(d)})</>)
  }
  const demo = useDemo({
    reset() { setSel('none'); setDate(null); setMore(false); setLog(QUICK_LOG) },
    async play(c) {
      await c.press(dev.current, q(dev.current, '[data-q="tom"]')); await c.sleep(1100)
      await c.press(dev.current, q(dev.current, '[data-q="wkend"]')); await c.sleep(1100)
      await c.press(dev.current, q(dev.current, '.dt-more')); await c.sleep(700)
      await c.press(dev.current, q(dev.current, `[data-key="${key(addDays(TODAY, 10))}"]`)); await c.sleep(600)
    },
  })

  return (
    <Card id="date-quick" num="01" title="빠른 선택 칩" en="Quick Pick Chips" demo={demo}
      desc="자주 고르는 날짜를 ‘오늘 · 내일 · 이번 주말’ 칩으로 먼저 보여줘요. 달력은 그다음이에요.">
      <Stage log={log} logId="date-quick-log">
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">할 일 추가<span className="sp" /><button type="button" onClick={() => setLog(<>저장 — 마감일 <b>{date ? fmt(date) : '없음'}</b></>)}>저장</button></div>
            <div className="dt-pad">
              <div className="dt-todo">장보기 목록 정리하기</div>
              <div className="dt-field-l">마감일</div>
              <div className="dt-value">{date ? <><b>{fmt(date)}</b><small>{rel(date)}</small></> : <span className="muted">정하지 않음</span>}</div>
              <div className="dt-chips" role="radiogroup" aria-label="마감일 빠르게 고르기">
                {QUICK.map(([id, label, d]) => (
                  <button key={id} type="button" role="radio" data-q={id} aria-checked={sel === id} className="dt-qchip" onClick={() => pick(id, d, label)}>
                    {label}{d && <small>{d.getMonth() + 1}.{d.getDate()} {WD[d.getDay()]}</small>}
                  </button>
                ))}
              </div>
              <button type="button" className="dt-more" aria-expanded={more} onClick={() => setMore(v => !v)}>📅 직접 고르기 <span aria-hidden="true">{more ? '⌃' : '⌄'}</span></button>
              {more && (
                <div className="dt-strip" role="listbox" aria-label="2주 안에서 고르기">
                  {STRIP.map(d => (
                    <button key={key(d)} type="button" role="option" data-key={key(d)} aria-selected={sel === 'custom' && same(d, date)}
                      className={d.getDay() === 0 ? 'sun' : d.getDay() === 6 ? 'sat' : ''} onClick={() => custom(d)}>
                      <small>{WD[d.getDay()]}</small><b>{d.getDate()}</b>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['칩', '3–5개'], ['칩 안', '실제 날짜 함께'], ['기본값', '날짜 없음']]}
        usage={[
          ['언제', '할 일 마감, 배송 희망일, 알림 미루기처럼 대부분 가까운 며칠 안에서 고를 때'],
          ['주의', '‘이번 주말’은 사람마다 토요일·일요일로 달라요 — 칩 안에 실제 날짜를 꼭 같이 보여주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 시간 슬롯 ---------- */
const DAYS7 = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i))
const SLOTS = Array.from({ length: 18 }, (_, i) => 10 * 60 + i * 30) // 10:00 – 18:30
/** 이미 찬 자리 (날짜·시간으로 정해진 모양) */
const taken = (d: Date, t: number) => (d.getDate() * 7 + t / 30 * 3) % 5 === 0 || (d.getDate() * 3 + t / 30) % 7 === 1
const slotState = (d: Date, t: number): 'past' | 'full' | 'open' | 'closed' =>
  d.getDay() === 0 ? 'closed' : same(d, TODAY) && t <= NOW_MIN ? 'past' : taken(d, t) ? 'full' : 'open'
const openCount = (d: Date) => SLOTS.filter(t => slotState(d, t) === 'open').length
const SLOT_LOG = <>날짜를 고르고 <b>비어 있는 시간</b>을 눌러 보세요</>

export function TimeSlots() {
  const [d, setD] = useState<Date>(TODAY)
  const [t, setT] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<ReactNode>(SLOT_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const pickDay = (x: Date) => {
    setD(x); setT(null); setDone(false)
    setLog(x.getDay() === 0 ? <>일요일은 <b>휴무</b> — 칸을 숨기지 말고 이유를 보여줘요</> : <>{fmt(x)} · 빈 자리 <b>{openCount(x)}개</b></>)
  }
  const pickSlot = (x: number) => {
    const s = slotState(d, x)
    if (s !== 'open') { setLog(s === 'past' ? <>{fmtTime(x)}는 <b>이미 지난 시간</b>이에요 (지금 오후 1:20)</> : <>{fmtTime(x)}는 <b>예약이 찼어요</b> — 다른 시간을 골라 주세요</>); return }
    setT(x); setDone(false)
    setLog(<><b>{fmt(d)} {fmtTime(x)}</b> 선택 · 아래 버튼으로 확정</>)
  }
  const book = () => { if (t === null) return; setDone(true); setLog(<>✓ <b>{fmt(d)} {fmtTime(t)}</b> 예약 완료</>) }
  const demo = useDemo({
    reset() { setD(TODAY); setT(null); setDone(false); setLog(SLOT_LOG) },
    async play(c) {
      await c.press(dev.current, q(dev.current, '[data-slot="780"]')); await c.sleep(1200)
      await c.press(dev.current, q(dev.current, `[data-day="${key(addDays(TODAY, 1))}"]`)); await c.sleep(900)
      const open = dev.current?.querySelectorAll<HTMLElement>('.dt-slot.open')
      await c.press(dev.current, open?.[Math.min(4, (open?.length ?? 1) - 1)] ?? null); await c.sleep(900)
      await c.press(dev.current, q(dev.current, '.dt-book')); await c.sleep(600)
    },
  })

  const groups: [string, number[]][] = [['오전', SLOTS.filter(x => x < 720)], ['오후', SLOTS.filter(x => x >= 720)]]
  const closed = d.getDay() === 0
  return (
    <Card id="date-slots" num="02" title="시간 슬롯" en="Time Slots" demo={demo}
      desc="고를 수 있는 시간을 버튼 칸으로 미리 펼쳐 둬요. 찬 자리와 지난 시간은 흐리게 보여줘요.">
      <Stage log={log} logId="date-slots-log">
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">솔방울 헤어 예약</div>
            <div className="dt-days" role="radiogroup" aria-label="날짜">
              {DAYS7.map(x => (
                <button key={key(x)} type="button" role="radio" data-day={key(x)} aria-checked={same(x, d)} onClick={() => pickDay(x)}
                  className={x.getDay() === 0 ? 'sun' : x.getDay() === 6 ? 'sat' : ''}>
                  <small>{same(x, TODAY) ? '오늘' : WD[x.getDay()]}</small><b>{x.getDate()}</b>
                  <i>{x.getDay() === 0 ? '휴무' : openCount(x) + '자리'}</i>
                </button>
              ))}
            </div>
            <div className="dt-body">
              {closed ? <div className="dt-closed">🌙<b>일요일은 쉬어요</b><span className="muted">월요일 오전 10시부터 예약할 수 있어요</span></div>
                : groups.map(([g, ts]) => (
                  <section key={g}>
                    <h3>{g}</h3>
                    <div className="dt-slots">
                      {ts.map(x => {
                        const s = slotState(d, x)
                        return (
                          <button key={x} type="button" data-slot={x} className={'dt-slot ' + s} aria-disabled={s !== 'open' || undefined}
                            aria-pressed={t === x} aria-label={fmtTime(x) + (s === 'full' ? ', 마감' : s === 'past' ? ', 지난 시간' : '')} onClick={() => pickSlot(x)}>
                            {String(Math.floor(x / 60) % 12 || 12)}:{String(x % 60).padStart(2, '0')}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                ))}
            </div>
            <div className="dt-foot">
              <button type="button" className={'btn dt-book' + (done ? ' ghost' : '')} disabled={t === null} onClick={book}>
                {done ? '예약했어요 ✓' : t === null ? '시간을 골라 주세요' : `${d.getMonth() + 1}/${d.getDate()} ${fmtTime(t)} 예약`}
              </button>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['간격', '15 · 30 · 60분'], ['묶음', '오전 / 오후'], ['못 고르는 칸', '흐리게 + 이유']]}
        usage={[
          ['언제', '병원 · 미용실 · 상담 예약처럼 가게가 정한 시간 중에서 골라야 할 때'],
          ['주의', '찬 자리를 아예 숨기면 ‘왜 이 시간이 없지?’ 헷갈려요 — 보이되 누를 수 없게, 누르면 이유를'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 월 선택 ---------- */
const MIN_Y = 2024
const spend = (y: number, m: number) => { const s = (y * 13 + m * 7) % 17; return { n: 12 + s, won: (180 + s * 23) * 1000 + (m * 300) } }
const MONTH_LOG = <>연도를 넘기고 <b>달</b>을 눌러 그달 내역을 보세요</>

export function MonthPicker() {
  const ty = TODAY.getFullYear(), tm = TODAY.getMonth()
  const [y, setY] = useState(ty)
  const [sel, setSel] = useState<[number, number]>([ty, tm])
  const [log, setLog] = useState<ReactNode>(MONTH_LOG)
  const box = useRef<HTMLDivElement>(null)

  const pick = (m: number) => {
    if (y === ty && m > tm) { setLog(<>{m + 1}월은 <b>아직 오지 않은 달</b>이라 고를 수 없어요</>); return }
    setSel([y, m])
    const s = spend(y, m)
    setLog(<>{y}년 {m + 1}월 · <b>{s.n}건 {s.won.toLocaleString('ko-KR')}원</b></>)
  }
  const move = (dl: number) => { setY(v => v + dl); setLog(<><b>{y + dl}년</b> — 해를 넘겨도 고른 달은 그대로예요</>) }
  const demo = useDemo({
    reset() { setY(ty); setSel([ty, tm]); setLog(MONTH_LOG) },
    async play(c) {
      await c.press(box.current, q(box.current, '[data-m="9"]')); await c.sleep(1100)
      await c.press(box.current, q(box.current, '[data-m="11"]')); await c.sleep(1200)
      await c.press(box.current, q(box.current, '.dt-nav.prev')); await c.sleep(800)
      await c.press(box.current, q(box.current, '[data-m="2"]')); await c.sleep(700)
    },
  })

  const s = spend(sel[0], sel[1])
  return (
    <Card id="date-month" num="03" title="월 선택" en="Month Picker" demo={demo}
      desc="날짜까지 필요 없을 때 열두 달을 바둑판으로 보여줘요. 한 번에 한 달 단위로 골라요.">
      <Stage log={log} logId="date-month-log">
        <div className="dt-panel" ref={box}>
          <div className="dt-head">
            <button type="button" className="dt-nav prev" aria-label="이전 해" disabled={y <= MIN_Y} onClick={() => move(-1)}>‹</button>
            <b aria-live="polite">{y}년</b>
            <button type="button" className="dt-nav next" aria-label="다음 해" disabled={y >= ty} onClick={() => move(1)}>›</button>
          </div>
          <div className="dt-months" role="radiogroup" aria-label={y + '년의 달'}>
            {Array.from({ length: 12 }, (_, m) => {
              const future = y === ty && m > tm, on = sel[0] === y && sel[1] === m, now = y === ty && m === tm
              return (
                <button key={m} type="button" role="radio" data-m={m} aria-checked={on} aria-disabled={future || undefined}
                  className={(future ? 'off' : '') + (now ? ' now' : '')} onClick={() => pick(m)}>
                  {m + 1}월{now && <small>이번 달</small>}
                </button>
              )
            })}
          </div>
          <div className="dt-sum">
            <span className="muted">{sel[0]}년 {sel[1] + 1}월 카드 이용</span>
            <b>{s.won.toLocaleString('ko-KR')}원</b><span className="muted">{s.n}건</span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['칸', '3 × 4'], ['넘김', '연도 단위'], ['미래 달', '흐리게']]}
        usage={[
          ['언제', '카드 이용 내역, 월간 리포트, 카드 유효기간처럼 ‘몇 월’만 알면 될 때'],
          ['주의', '날짜 달력을 띄워 놓고 아무 날이나 누르게 하지 마세요 — 고르는 단위와 칸을 맞춰야 해요'],
        ]}
      />
    </Card>
  )
}
