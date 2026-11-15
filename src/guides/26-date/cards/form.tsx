import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { NOW_MIN, NTH, TODAY, WD, addDays, addMonths, diffDays, fmt, fmtMonth, fmtTime, key, lastDate, nthOfMonth, same } from '../date'
import { CalHead, Ctrl, MonthGrid } from '../shared'

const q = <T extends HTMLElement>(root: HTMLElement | null, sel: string) => root?.querySelector<T>(sel) ?? null
const monthDelta = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()

/* ---------- 07 날짜 입력 ---------- */
const shape = (dg: string) => dg.slice(0, 4) + (dg.length > 4 ? '.' + dg.slice(4, 6) : '') + (dg.length > 6 ? '.' + dg.slice(6, 8) : '')
type Check = { ok: false; msg: string } | { ok: true; d: Date; age: number } | null
const check = (dg: string): Check => {
  const y = +dg.slice(0, 4), m = +dg.slice(4, 6), dd = +dg.slice(6, 8)
  if (dg.length >= 4 && y < 1900) return { ok: false, msg: '1900년 이후로 적어 주세요' }
  if (dg.length >= 4 && y > TODAY.getFullYear()) return { ok: false, msg: '아직 오지 않은 해예요' }
  if (dg.length >= 6 && (m < 1 || m > 12)) return { ok: false, msg: '월은 01부터 12 사이로 적어 주세요' }
  if (dg.length < 8) return null
  const last = lastDate(y, m - 1)
  if (dd < 1 || dd > last) return { ok: false, msg: `${y}년 ${m}월은 ${last}일까지 있어요` + (m === 2 && last === 28 ? ' (윤년이 아니에요)' : '') }
  const d = new Date(y, m - 1, dd)
  if (diffDays(TODAY, d) > 0) return { ok: false, msg: '아직 오지 않은 날이에요' }
  const before = TODAY.getMonth() < m - 1 || (TODAY.getMonth() === m - 1 && TODAY.getDate() < dd)
  return { ok: true, d, age: TODAY.getFullYear() - y - (before ? 1 : 0) }
}
const INPUT_LOG = <>숫자만 쳐 보세요 — <b>점(.)은 알아서</b> 들어가요</>

export function DateInput() {
  const [dg, setDg] = useState('')
  const [touched, setTouched] = useState(false)
  const [log, setLog] = useState<ReactNode>(INPUT_LOG)
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const apply = (next: string) => {
    setDg(next)
    const r = check(next)
    if (r && !r.ok) setLog(<>바로 알려줘요 — <b>{r.msg}</b></>)
    else if (r?.ok) setLog(<>✓ <b>{r.d.getFullYear()}년 {fmt(r.d)}</b> · 만 {r.age}세</>)
    else setLog(next.length ? <>{next.length < 4 ? '연도' : next.length < 6 ? '월' : '일'} 입력 중 — <b>다 치기 전엔 재촉하지 않아요</b></> : INPUT_LOG)
  }
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    let next = v.replace(/\D/g, '').slice(0, 8)
    // 점만 지웠다면 숫자 하나를 지운 것으로
    if (v.length < shape(dg).length && next === dg) next = next.slice(0, -1)
    setTouched(false)
    apply(next)
  }
  const demo = useDemo({
    reset() { setDg(''); setTouched(false); setLog(INPUT_LOG) },
    async play(c) {
      c.tap(box.current, input.current)
      let s = ''
      for (const ch of '19950230') { s += ch; apply(s); await c.sleep(150) }
      await c.sleep(1500)
      s = s.slice(0, -2); apply(s); await c.sleep(400)
      for (const ch of '28') { s += ch; apply(s); await c.sleep(180) }
      await c.sleep(500)
    },
  })

  const r = check(dg)
  const err = r && !r.ok ? r.msg : touched && dg.length > 0 && dg.length < 8 ? '날짜를 8자리까지 적어 주세요' : null
  const part = dg.length < 4 ? 0 : dg.length < 6 ? 1 : 2
  return (
    <Card id="date-input" num="07" title="날짜 입력" en="Date Input · Masked Field" demo={demo}
      desc="달력 없이 숫자로 바로 쳐요. 점은 알아서 들어가고, 없는 날짜는 다 치자마자 알려줘요.">
      <Stage log={log} logId="date-input-log">
        <div className="dt-panel" ref={box}>
          <label className="dt-label" htmlFor="date-input-field">생년월일</label>
          <div className={'dt-input' + (err ? ' bad' : r?.ok ? ' good' : '')}>
            <input id="date-input-field" ref={input} inputMode="numeric" autoComplete="bday" placeholder="YYYY.MM.DD" maxLength={10}
              value={shape(dg)} onChange={onChange} onBlur={() => setTouched(true)}
              aria-invalid={!!err} aria-describedby="date-input-help" />
            {dg && <button type="button" aria-label="지우기" onClick={() => { apply(''); setTouched(false); input.current?.focus() }}>✕</button>}
          </div>
          <div className="dt-parts" aria-hidden="true">
            {['연도 4자리', '월 2자리', '일 2자리'].map((t, i) => <span key={t} className={(i === part && dg.length < 8 ? 'on' : '') + (i < part || dg.length === 8 ? ' done' : '')}>{t}</span>)}
          </div>
          <p id="date-input-help" className={'dt-help' + (err ? ' bad' : '')}>
            {err ?? (r?.ok ? `${r.d.getFullYear()}년 ${fmt(r.d)} · 만 ${r.age}세` : '예: 19950302 → 1995.03.02')}
          </p>
          <div className="dt-try">
            <span className="muted">넣어 보기</span>
            {[['20240229', '윤년 2/29'], ['20230229', '2/29 (평년)'], ['20271201', '미래 날짜']].map(([v, l]) => (
              <button key={v} type="button" className="chip" onClick={() => { apply(v); setTouched(true) }}>{l}</button>
            ))}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['키패드', '숫자 (inputmode)'], ['형식', '점 자동 · 자리 안내'], ['검사', '칸을 다 채운 순간']]}
        usage={[
          ['언제', '생년월일, 서류 발급일처럼 사용자가 이미 날짜를 알고 있고 멀리 떨어진 날짜일 때'],
          ['주의', '‘03/02’처럼 순서가 애매한 형식은 피하세요 — 연 · 월 · 일 순서를 자리 안내로 보여줘요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 체크인 · 체크아웃 ---------- */
const MIN_N = 2
const PRICE = 89000, WEEKEND = 20000
const SOLD = new Set(['2026-11-21', '2026-11-28', '2026-12-05', '2026-12-24', '2026-12-25'])
const STAY_MAX = addMonths(TODAY, 3)
const THIS_MONTH = addMonths(TODAY, 0)
const nightsCost = (a: Date, n: number) => Array.from({ length: n }, (_, i) => addDays(a, i)).reduce((s, d) => s + PRICE + (d.getDay() === 5 || d.getDay() === 6 ? WEEKEND : 0), 0)
const firstSold = (a: Date, b: Date) => { for (let d = a; diffDays(d, b) > 0; d = addDays(d, 1)) if (SOLD.has(key(d))) return d; return null }
const STAY_LOG = <><b>체크인</b> 날짜부터 눌러 보세요 · 최소 {MIN_N}박</>

export function CheckInOut() {
  const [month, setMonth] = useState(THIS_MONTH)
  const [ci, setCi] = useState<Date | null>(null)
  const [co, setCo] = useState<Date | null>(null)
  const [field, setField] = useState<'in' | 'out'>('in')
  const [hover, setHover] = useState<Date | null>(null)
  const [log, setLog] = useState<ReactNode>(STAY_LOG)
  const box = useRef<HTMLDivElement>(null)

  const picksOut = field === 'out' && !!ci
  const block = (d: Date): string | false => {
    if (diffDays(TODAY, d) < 0) return '지난 날이에요'
    if (picksOut && ci && diffDays(ci, d) >= 0) {
      const n = diffDays(ci, d)
      if (n === 0) return '체크아웃은 체크인 다음 날부터예요'
      if (n < MIN_N) return `최소 ${MIN_N}박부터 예약할 수 있어요`
      const s = firstSold(ci, d)
      if (s) return `${s.getMonth() + 1}월 ${s.getDate()}일 밤은 방이 다 찼어요`
      return false
    }
    return SOLD.has(key(d)) ? '이 날 밤은 방이 다 찼어요' : false
  }
  const pick = (d: Date) => {
    if (!picksOut || !ci || diffDays(ci, d) < 0) {
      setCi(d); setCo(null); setField('out')
      setLog(<>체크인 <b>{fmt(d)}</b> — 이제 체크아웃을 골라요</>)
      return
    }
    const n = diffDays(ci, d)
    setCo(d); setField('in')
    setLog(<>✓ <b>{n}박</b> · {nightsCost(ci, n).toLocaleString('ko-KR')}원</>)
  }
  const move = (dl: number) => {
    const n = addMonths(month, dl)
    if (monthDelta(THIS_MONTH, n) < 0 || monthDelta(n, STAY_MAX) < 0) return false
    setMonth(n)
  }
  const to = co ?? (picksOut && ci && hover && !block(hover) && diffDays(ci, hover) > 0 ? hover : null)
  const cls = (d: Date) => {
    const c: string[] = []
    if (SOLD.has(key(d))) c.push('sold')
    if (!ci) return c.join(' ')
    if (same(d, ci)) c.push(to && !same(ci, to) ? 'start cont' : 'start')
    if (to && same(d, to)) c.push(co ? 'end' : 'end prev')
    if (to && diffDays(ci, d) > 0 && diffDays(d, to) > 0) c.push(co ? 'in' : 'in prev')
    return c.join(' ')
  }
  const sub = (d: Date) => {
    if (picksOut && ci && same(d, hover) && !block(d) && diffDays(ci, d) > 0) return `${diffDays(ci, d)}박`
    if (!picksOut && SOLD.has(key(d)) && diffDays(TODAY, d) >= 0) return '마감'
    return null
  }
  const demo = useDemo({
    reset() { setMonth(THIS_MONTH); setCi(null); setCo(null); setField('in'); setHover(null); setLog(STAY_LOG) },
    async play(c) {
      await c.press(box.current, q(box.current, '[data-key="2026-11-23"]')); await c.sleep(900)
      await c.press(box.current, q(box.current, '[data-key="2026-11-24"]')); await c.sleep(1300)
      setHover(new Date(2026, 10, 26)); await c.sleep(700)
      await c.press(box.current, q(box.current, '[data-key="2026-11-26"]')); await c.sleep(800)
    },
  })

  const n = ci && co ? diffDays(ci, co) : 0
  return (
    <Card id="date-stay" num="08" title="체크인 · 체크아웃" en="Check-in / Check-out" demo={demo}
      desc="숙박처럼 ‘몇 밤’이 중요한 기간이에요. 고르는 칸이 두 개고, 그 사이 밤 수와 규칙을 바로 보여줘요.">
      <Stage log={log} logId="date-stay-log">
        <div className="dt-panel" ref={box}>
          <div className="dt-stay" role="group" aria-label="고를 날짜">
            <button type="button" className={field === 'in' ? 'on' : ''} aria-pressed={field === 'in'} onClick={() => { setField('in'); setLog(<><b>체크인</b>을 다시 골라요</>) }}>
              <small>체크인 · 15:00</small><b>{ci ? fmt(ci) : '날짜 선택'}</b>
            </button>
            <span className="dt-nights">{n ? `${n}박` : picksOut ? '…' : ''}</span>
            <button type="button" className={field === 'out' ? 'on' : ''} aria-pressed={field === 'out'} disabled={!ci} onClick={() => { setField('out'); setLog(<><b>체크아웃</b>을 다시 골라요</>) }}>
              <small>체크아웃 · 11:00</small><b>{co ? fmt(co) : '날짜 선택'}</b>
            </button>
          </div>
          <CalHead month={month} onMove={move} canPrev={monthDelta(THIS_MONTH, month) > 0} canNext={monthDelta(month, STAY_MAX) > 0} />
          <MonthGrid month={month} label={fmtMonth(month) + (picksOut ? ' 체크아웃 선택' : ' 체크인 선택')} block={block} cls={cls} sub={sub}
            focusDate={picksOut ? ci : ci ?? null} onPick={pick} onHover={setHover} onMonth={move}
            onBlocked={(_, why) => setLog(<>고를 수 없어요 — <b>{why}</b></>)} />
          <div className="dt-sum">
            <span className="muted">바다숲 펜션 · 1박 {PRICE.toLocaleString('ko-KR')}원~</span>
            <b>{n && ci ? nightsCost(ci, n).toLocaleString('ko-KR') + '원' : '—'}</b>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['칸', '체크인 / 체크아웃 2개'], ['보여줄 것', '몇 박 · 총액'], ['규칙', '최소 숙박 · 마감일']]}
        usage={[
          ['언제', '숙소, 렌터카, 장비 대여처럼 시작과 끝 사이의 ‘밤 수’나 ‘일 수’로 값이 정해질 때'],
          ['주의', '최소 숙박 · 마감 날짜를 몰래 막지 마세요 — 누르면 왜 안 되는지, 올리면 몇 박인지 보여줘요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 반복 설정 ---------- */
type Freq = 'day' | 'week' | 'month'
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const TIMES = [420, 540, 720, 1080, 1260]
const describeDays = (ds: number[]) => {
  const s = WEEK_ORDER.filter(d => ds.includes(d))
  if (s.length === 7) return '매일'
  if (s.length === 5 && !s.includes(0) && !s.includes(6)) return '평일마다'
  if (s.length === 2 && s.includes(0) && s.includes(6)) return '주말마다'
  return '매주 ' + s.map(d => WD[d]).join('·')
}
const REPEAT_LOG = <>반복 주기와 요일을 바꾸면 <b>문장</b>과 <b>다음 알림 날짜</b>가 바로 바뀌어요</>

export function Recurrence() {
  const [freq, setFreq] = useState<Freq>('week')
  const [days, setDays] = useState<number[]>([1])
  const [mmode, setMmode] = useState<'date' | 'nth'>('date')
  const [mday, setMday] = useState(TODAY.getDate())
  const [time, setTime] = useState(540)
  const box = useRef<HTMLDivElement>(null)

  const nth = nthOfMonth(TODAY), wd = TODAY.getDay()
  const rule = freq === 'day' ? '매일'
    : freq === 'week' ? (days.length ? describeDays(days) : '')
      : mmode === 'date' ? `매월 ${mday}일` : `매월 ${NTH[nth - 1]} ${WD[wd]}요일`
  const summary = rule ? `${rule} ${fmtTime(time)}` : '요일을 하나 이상 골라 주세요'
  const match = (d: Date) => freq === 'day' ? true
    : freq === 'week' ? days.includes(d.getDay())
      : mmode === 'date' ? d.getDate() === Math.min(mday, lastDate(d.getFullYear(), d.getMonth()))
        : d.getDay() === wd && nthOfMonth(d) === nth
  const next: Date[] = []
  if (rule) for (let i = 0; i < 800 && next.length < 3; i++) {
    const d = addDays(TODAY, i)
    if (i === 0 && time <= NOW_MIN) continue
    if (match(d)) next.push(d)
  }
  const toggleDay = (d: number) => setDays(ds => ds.includes(d) ? ds.filter(x => x !== d) : [...ds, d])

  const demo = useDemo({
    reset() { setFreq('week'); setDays([1]); setMmode('date'); setMday(TODAY.getDate()); setTime(540) },
    async play(c) {
      await c.press(box.current, q(box.current, '[data-wd="3"]')); await c.sleep(1100)
      await c.press(box.current, q(box.current, '[data-t="1080"]')); await c.sleep(1100)
      await c.press(box.current, q(box.current, '.dt-rep-freq [data-v="month"]')); await c.sleep(1100)
      await c.press(box.current, q(box.current, '.dt-rep-mm [data-v="nth"]')); await c.sleep(1100)
      await c.press(box.current, q(box.current, '.dt-rep-freq [data-v="week"]')); await c.sleep(500)
    },
  })

  return (
    <Card id="date-repeat" num="09" title="반복 설정" en="Recurrence" demo={demo}
      desc="‘언제마다’를 정해요. 고른 결과를 ‘매주 월·수 오전 9시’ 같은 한 문장과 다음 날짜로 다시 읽어줘요.">
      <Stage log={<>{rule ? <>다음 알림 <b>{next[0] ? fmt(next[0]) : '—'}</b> · {fmtTime(time)}</> : REPEAT_LOG}</>} logId="date-repeat-log">
        <div className="dt-panel" ref={box}>
          <div className="dt-title">🪴 화분 물 주기 알림</div>
          <div className="dt-rep-say" aria-live="polite"><b>{summary}</b>{rule && <small>에 알려드려요</small>}</div>
          <Ctrl label="반복"><Seg className="dt-rep-freq" value={freq} onChange={setFreq} options={[['day', '매일'], ['week', '매주'], ['month', '매월']]} /></Ctrl>
          {freq === 'week' && (
            <div className="dt-wds" role="group" aria-label="요일">
              {WEEK_ORDER.map(d => (
                <button key={d} type="button" data-wd={d} aria-pressed={days.includes(d)} aria-label={WD[d] + '요일'}
                  className={d === 0 ? 'sun' : d === 6 ? 'sat' : ''} onClick={() => toggleDay(d)}>{WD[d]}</button>
              ))}
            </div>
          )}
          {freq === 'month' && (
            <div className="dt-rep-m">
              <Seg className="dt-rep-mm" value={mmode} onChange={setMmode} options={[['date', `${mmode === 'date' ? mday : TODAY.getDate()}일마다`], ['nth', `${NTH[nth - 1]} ${WD[wd]}요일`]]} />
              {mmode === 'date' && (
                <div className="dt-rep-day">
                  <div className="stepper">
                    <button type="button" aria-label="하루 앞으로" disabled={mday <= 1} onClick={() => setMday(v => v - 1)}>−</button>
                    <output aria-live="polite">{mday}일</output>
                    <button type="button" aria-label="하루 뒤로" disabled={mday >= 31} onClick={() => setMday(v => v + 1)}>+</button>
                  </div>
                  {mday > 28 && <small className="dt-note">{mday}일이 없는 달은 <b>그달 마지막 날</b>에 알려드려요</small>}
                </div>
              )}
            </div>
          )}
          <Ctrl label="시각">
            <div className="dt-times">
              {TIMES.map(t => <button key={t} type="button" data-t={t} className="chip" aria-pressed={time === t} onClick={() => setTime(t)}>{fmtTime(t).replace('오전 ', '오전 ').replace('오후 ', '오후 ')}</button>)}
            </div>
          </Ctrl>
          <div className="dt-next">
            <span className="muted">다음 알림</span>
            <ol>{next.map(d => {
              const clamp = freq === 'month' && mmode === 'date' && d.getDate() !== mday
              return <li key={key(d)}>{fmt(d)}{clamp && <small> 말일</small>}</li>
            })}</ol>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['주기', '매일 · 매주 · 매월'], ['다시 읽기', '한 문장 요약'], ['확인', '다음 날짜 3개']]}
        usage={[
          ['언제', '알림, 정기 결제, 반복 일정처럼 한 번 정하면 계속 이어지는 일정일 때'],
          ['주의', '매월 31일 · 2월 29일처럼 없는 날이 생겨요 — 어떻게 처리하는지 미리 말하고 다음 날짜로 보여주세요'],
        ]}
      />
    </Card>
  )
}
