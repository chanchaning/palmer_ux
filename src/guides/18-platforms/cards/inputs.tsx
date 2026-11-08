import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Diff3, Icon, Lines, Pane, PfCard, useOutsideClose, useTabInd, type IconName } from '../shared'

/* ================= 12 클릭 시 펼쳐지는 메뉴 ================= */
const SHIP = ['일반 배송', '빠른 배송', '새벽 배송']
const ACTS: [string, IconName][] = [['공유', 'share'], ['복사', 'copy'], ['삭제', 'trash']]

function MenuM() {
  const [fOpen, setFOpen] = useState(false)
  const [mOpen, setMOpen] = useState(false)
  const [val, setVal] = useState(0)
  const [fPos, setFPos] = useState<CSSProperties>({})
  const [mPos, setMPos] = useState<CSSProperties>({})
  const [log, setLog] = useState<ReactNode>(<>필드를 누르면 <b>바로 아래</b>로 펼쳐져요.</>)
  const field = useRef<HTMLButtonElement>(null), fmenu = useRef<HTMLDivElement>(null)
  const more = useRef<HTMLButtonElement>(null), mmenu = useRef<HTMLDivElement>(null)
  useOutsideClose([
    { open: fOpen, menu: fmenu, trig: field, close: () => setFOpen(false) },
    { open: mOpen, menu: mmenu, trig: more, close: () => setMOpen(false) },
  ])
  const openF = (on: boolean) => {
    const f = field.current!
    if (on) setFPos({ left: f.offsetLeft, top: f.offsetTop + f.offsetHeight + 2, width: f.offsetWidth })
    setFOpen(on)
  }
  const openM = (on: boolean) => {
    if (on) setMPos({ right: 6, left: 'auto', top: more.current!.offsetTop + 4, transformOrigin: 'top right' })
    setMOpen(on)
  }
  return (
    <Pane side="m" label="Exposed Dropdown / Menus" en="Material" log={log}>
      <div className="pf-scr">
        <div className="pf-mbar sm"><b>주문서</b><span className="sp" />
          <button className="pf-ib pf-rp" data-more aria-label="더보기" ref={more} onClick={() => { openM(!mOpen); setFOpen(false) }}><Icon k="more" /></button>
        </div>
        <button className={'pf-mfield' + (fOpen ? ' open' : '')} data-field ref={field} onClick={() => { openF(!fOpen); setMOpen(false) }}>
          <span className="lab">배송 방법</span><span data-val>{SHIP[val]}</span><span className="arr"><Icon k="down" /></span>
        </button>
        <Lines widths={['70%', undefined]} />
        <div className={'pf-mmenu' + (fOpen ? ' on' : '')} data-fmenu ref={fmenu} style={fPos}>
          {SHIP.map((t, i) => <button key={t} className={'pf-rp' + (i === val ? ' sel' : '')} onClick={() => {
            setVal(i); setFOpen(false)
            setLog(<>고른 값 <b>{t}</b>이(가) <b>필드에 채워졌어요</b>.</>)
          }}>{t}</button>)}
        </div>
        <div className={'pf-mmenu' + (mOpen ? ' on' : '')} data-mmenu ref={mmenu} style={mPos}>
          {ACTS.map(([a, ic]) => <button key={a} className="pf-rp" data-a={a} onClick={() => { setMOpen(false); setLog(<>⋮ 메뉴에서 <b>{a}</b> 실행</>) }}><Icon k={ic} />{a}</button>)}
        </div>
      </div>
    </Pane>
  )
}

function MenuH() {
  const [pOpen, setPOpen] = useState(false)
  const [dOpen, setDOpen] = useState(false)
  const [val, setVal] = useState(0)
  const [pPos, setPPos] = useState<CSSProperties>({})
  const [dPos, setDPos] = useState<CSSProperties>({})
  const [log, setLog] = useState<ReactNode>(<>팝업 버튼은 <b>현재 값에 ✓</b>, 풀다운은 <b>동작 목록</b>이에요.</>)
  const scr = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLButtonElement>(null), pmenu = useRef<HTMLDivElement>(null)
  const pull = useRef<HTMLButtonElement>(null), dmenu = useRef<HTMLDivElement>(null)
  useOutsideClose([
    { open: pOpen, menu: pmenu, trig: pop, close: () => setPOpen(false) },
    { open: dOpen, menu: dmenu, trig: pull, close: () => setDOpen(false) },
  ])
  const relTo = (el: HTMLElement) => {
    const root = scr.current!, a = el.getBoundingClientRect(), b = root.getBoundingClientRect()
    return { l: a.left - b.left - root.clientLeft, t: a.top - b.top - root.clientTop, w: a.width, h: a.height }
  }
  const openP = (on: boolean) => {
    if (on) {
      const r = relTo(pop.current!), W = Math.max(150, pmenu.current!.offsetWidth)
      setPPos({ left: Math.max(6, Math.min(scr.current!.clientWidth - W - 6, r.l + r.w - W + 8)), top: r.t - 6, transformOrigin: 'top right' })
    }
    setPOpen(on)
  }
  const openD = (on: boolean) => {
    if (on) { const r = relTo(pull.current!); setDPos({ right: 6, left: 'auto', top: r.t + r.h + 2, transformOrigin: 'top right' }) }
    setDOpen(on)
  }
  return (
    <Pane side="h" label="Pop-Up / Pull-Down Button" en="HIG" log={log}>
      <div className="pf-scr grp" ref={scr}>
        <div className="pf-hbar"><span /><b className="pf-htitle">주문서</b>
          <button className="pf-tint" data-pull aria-label="더보기" style={{ fontSize: 21 }} ref={pull} onClick={() => { openD(!dOpen); setPOpen(false) }}><Icon k="morec" /></button>
        </div>
        <div className="pf-grp"><div className="pf-hli">배송 방법
          <button className="pf-tint pf-popbtn" data-pop style={{ marginLeft: 'auto' }} ref={pop} onClick={() => { openP(!pOpen); setDOpen(false) }}><span data-val>{SHIP[val]}</span><Icon k="updown" /></button>
        </div></div>
        <Lines widths={['70%', undefined]} bg="var(--surface)" />
        <div className={'pf-hmenu' + (pOpen ? ' on' : '')} data-pmenu ref={pmenu} style={pPos}>
          {SHIP.map((t, i) => <button key={t} className={i === val ? 'sel' : ''} onClick={() => {
            setVal(i); setPOpen(false)
            setLog(<>Pop-Up Button — <b>✓ {t}</b>, 버튼 글자도 바뀌었어요.</>)
          }}><span className="ck"><Icon k="check" /></span>{t}</button>)}
        </div>
        <div className={'pf-hmenu' + (dOpen ? ' on' : '')} data-dmenu ref={dmenu} style={dPos}>
          {ACTS.map(([a, ic]) => <button key={a} className={a === '삭제' ? 'pf-red' : undefined} data-a={a} onClick={() => { setDOpen(false); setLog(<>Pull-Down Button — <b>{a}</b> 실행 (값은 그대로)</>) }}>{a}<span className="ic"><Icon k={ic} /></span></button>)}
        </div>
      </div>
    </Pane>
  )
}

export function Menu() {
  return (
    <PfCard id="menu" num="12" title="클릭 시 펼쳐지는 메뉴" en="Dropdown" desc="버튼을 누르면 선택지나 동작 목록이 펼쳐져요."
      diff={Diff3(
        ['Menus / Exposed Dropdown Menu', 'Pull-Down Button (동작) / Pop-Up Button (값 선택)'],
        ['입력창처럼 생긴 필드 + ▾, 그림자 있는 메뉴 카드', '버튼 글자 + 위아래 화살표(팝업)·⋯ 아이콘(풀다운), 반투명 메뉴에 아이콘은 오른쪽'],
        ['고른 값이 필드에 채워지고, ⋮ 메뉴는 아이콘 근처에 펼쳐져요', '팝업은 현재 값에 ✓ 후 버튼 글자가 바뀌고, 풀다운은 동작을 바로 실행해요'],
      )}>
      <div className="demos"><MenuM /><MenuH /></div>
    </PfCard>
  )
}

/* ================= 13 날짜 및 시간 선택기 ================= */
const WD = ['일', '월', '화', '수', '목', '금', '토']
const fmtD = (d: Date) => (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + WD[d.getDay()] + ')'
const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t }
const R = 58

function PickerM({ today }: { today: Date }) {
  const [tab, setTab] = useState<'d' | 't'>('d')
  const [sel, setSel] = useState(() => new Date(today))
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [hour, setHour] = useState(9)
  const [pm, setPm] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>달력에서 <b>날짜를 탭</b>, 시계에서 <b>바늘을 끌어요</b>.</>)
  const tabs = useRef<HTMLDivElement>(null), dial = useRef<HTMLDivElement>(null)
  const hourRef = useRef(hour)
  hourRef.current = hour
  useTabInd(tabs, [tab])
  const fmtT = (h = hour, p = pm) => (p ? '오후 ' : '오전 ') + h + ':00'

  const first = view.getDay(), days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const fromPt = (e: React.PointerEvent) => {
    const r = dial.current!.getBoundingClientRect()
    const ang = (Math.atan2(e.clientX - r.left - r.width / 2, -(e.clientY - r.top - r.height / 2)) * 180) / Math.PI
    let h = Math.round(((ang + 360) % 360) / 30) % 12
    if (h === 0) h = 12
    if (h !== hourRef.current) { hourRef.current = h; setHour(h) }
  }
  const dEnd = () => { if (!dragging) return; setDragging(false); setLog(<>다이얼로 <b>{fmtT(hourRef.current)}</b> 선택 · {fmtD(sel)}</>) }

  return (
    <Pane side="m" label="Date Picker / Time Picker" en="Material" log={log}>
      <div className="pf-scr auto">
        <div className="pf-mtabs" data-pt ref={tabs}>
          {([['d', '날짜'], ['t', '시간']] as const).map(([v, l]) => <button key={v} className={'pf-rp' + (tab === v ? ' on' : '')} data-v={v} onClick={() => {
            setTab(v)
            setLog(v === 'd' ? <>달력에서 <b>날짜를 탭</b>해요.</> : <>시계 다이얼에서 <b>바늘을 끌어</b> 시간을 골라요.</>)
          }}>{l}</button>)}
          <span className="pf-ind" />
        </div>
        <div className="pf-mpk" data-pd style={tab === 'd' ? undefined : { display: 'none' }}>
          <div className="head">날짜 선택</div><div className="headv" data-hv>{fmtD(sel)}</div>
          <div className="pf-cal-h">
            <button className="pf-ib pf-rp" data-mo="-1" aria-label="이전 달" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><Icon k="chev" /></button>
            <span data-mt>{view.getFullYear()}년 {view.getMonth() + 1}월</span>
            <button className="pf-ib pf-rp" data-mo="1" aria-label="다음 달" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><Icon k="chevr" /></button>
          </div>
          <div className="pf-cal-g" data-cal>
            {WD.map(w => <span key={w}>{w}</span>)}
            {Array.from({ length: first }, (_, i) => <i key={'b' + i} />)}
            {Array.from({ length: days }, (_, k) => {
              const dd = k + 1, dt = new Date(view.getFullYear(), view.getMonth(), dd)
              const cls = (dt.getTime() === sel.getTime() ? 'sel ' : '') + (dt.getTime() === today.getTime() ? 'today' : '')
              return <button key={dd} className={'pf-rp ' + cls} data-d={dd} onClick={() => { setSel(dt); setLog(<>날짜 <b>{fmtD(dt)}</b> · 시간 {fmtT()}</>) }}>{dd}</button>
            })}
          </div>
        </div>
        <div className="pf-mpk" data-ptm style={tab === 't' ? undefined : { display: 'none' }}>
          <div className="head">시간 선택</div>
          <div className="pf-time">
            <span className="box2 on" data-hh>{String(hour).padStart(2, '0')}</span><b>:</b><span className="box2">00</span>
            <div className="pf-ampm">
              {['오전', '오후'].map((l, i) => <button key={l} className={pm === i ? 'on' : ''} data-ap={i} onClick={() => { setPm(i); setLog(<b>{fmtT(hour, i)}</b>) }}>{l}</button>)}
            </div>
          </div>
          <div className="pf-dial" data-dial ref={dial}
            onPointerDown={e => { setDragging(true); dial.current!.setPointerCapture(e.pointerId); fromPt(e) }}
            onPointerMove={e => { if (dragging) fromPt(e) }}
            onPointerUp={dEnd} onPointerCancel={dEnd}>
            <span className="pf-hand" data-hand style={{ height: R, transform: 'rotate(' + ((hour % 12) * 30 + 180) + 'deg)', transition: dragging ? 'none' : undefined }} />
            {Array.from({ length: 12 }, (_, i) => {
              const n = i === 0 ? 12 : i, a = (i * 30 * Math.PI) / 180
              return <span key={n} data-n={n} className={n === hour ? 'sel' : undefined} style={{ left: (78 + R * Math.sin(a)).toFixed(1) + 'px', top: (78 - R * Math.cos(a)).toFixed(1) + 'px' }}>{n}</span>
            })}
          </div>
        </div>
      </div>
    </Pane>
  )
}

const IH = 28

function WheelCol({ k, items, init, onCommit }: { k: string; items: string[]; init: number; onCommit: (i: number) => void }) {
  const col = useRef<HTMLDivElement>(null)
  const cur = useRef(init)
  const raf = useRef(0), settle = useRef(0)
  const dg = useRef<{ y: number; s: number; moved: boolean } | null>(null)
  const [dragging, setDragging] = useState(false)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  const paint = () => {
    raf.current = 0
    const c = col.current
    if (!c) return
    const pos = c.scrollTop / IH
    ;[...c.children].forEach((node, i) => {
      const el = node as HTMLElement, dist = i - pos, ad = Math.abs(dist)
      if (ad > 4) { el.style.opacity = '0'; return }
      el.style.opacity = String(Math.max(0.25, 1 - ad * 0.22))
      el.style.transform = 'rotateX(' + (-dist * 20).toFixed(1) + 'deg) scale(' + (1 - ad * 0.04).toFixed(3) + ')'
      el.style.fontWeight = ad < 0.5 ? '600' : '400'
    })
  }
  useLayoutEffect(() => {
    if (col.current) col.current.scrollTop = init * IH
    paint()
    return () => { cancelAnimationFrame(raf.current); clearTimeout(settle.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const commit = () => {
    const c = col.current
    if (!c) return
    const i = Math.max(0, Math.min(items.length - 1, Math.round(c.scrollTop / IH)))
    if (i !== cur.current) { cur.current = i; commitRef.current(i) }
  }
  const up = (e: React.PointerEvent) => {
    const d = dg.current, c = col.current!
    if (!d) return
    dg.current = null
    c.style.scrollSnapType = ''
    c.classList.remove('dragging') // 스냅을 즉시 되살려 원본과 같은 칸에 맞춰요
    setDragging(false)
    if (d.moved) c.scrollTo({ top: Math.round(c.scrollTop / IH) * IH, behavior: 'smooth' })
    else {
      const r = c.getBoundingClientRect()
      const off = Math.round((e.clientY - r.top - r.height / 2) / IH)
      if (off) c.scrollTo({ top: (Math.round(c.scrollTop / IH) + off) * IH, behavior: 'smooth' })
    }
  }
  return (
    <div className={'pf-wcol' + (k === 'd' ? ' wide' : '') + (dragging ? ' dragging' : '')} data-col={k} ref={col}
      onScroll={() => {
        if (!raf.current) raf.current = requestAnimationFrame(paint)
        clearTimeout(settle.current); settle.current = window.setTimeout(commit, 120)
      }}
      onPointerDown={e => {
        if (e.pointerType !== 'mouse') return
        dg.current = { y: e.clientY, s: col.current!.scrollTop, moved: false }
        col.current!.setPointerCapture(e.pointerId)
      }}
      onPointerMove={e => {
        const d = dg.current
        if (!d) return
        const dy = e.clientY - d.y
        if (!d.moved && Math.abs(dy) > 3) { d.moved = true; col.current!.style.scrollSnapType = 'none'; setDragging(true) }
        if (d.moved) col.current!.scrollTop = d.s - dy
      }}
      onPointerUp={up} onPointerCancel={up}>
      {items.map((t, i) => <div key={i}>{t}</div>)}
    </div>
  )
}

function PickerH({ today }: { today: Date }) {
  const dayList = useMemo(() => Array.from({ length: 21 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i - 7); return d }), [today])
  const COLS = useMemo(() => ({
    d: dayList.map(d => (d.getTime() === today.getTime() ? '오늘' : (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WD[d.getDay()])),
    ap: ['오전', '오후'],
    h: Array.from({ length: 12 }, (_, i) => String(i + 1)),
    m: Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')),
  }), [dayList, today])
  const [idx, setIdx] = useState({ d: 7, ap: 0, h: 8, m: 1 })
  const [log, setLog] = useState<ReactNode>(<>휠을 <b>위아래로 굴리거나 끌어</b> 보세요.</>)
  const keys = ['d', 'ap', 'h', 'm'] as const
  return (
    <Pane side="h" label="Pickers (wheel)" en="HIG · Date Picker" log={log}>
      <div className="pf-scr auto grp">
        <div className="pf-hbar"><button className="pf-tint">취소</button><b className="pf-htitle">알림 시간</b><button className="pf-tint" style={{ fontWeight: 600 }}>완료</button></div>
        <div className="pf-hval" data-out><b>{fmtD(dayList[idx.d])} {COLS.ap[idx.ap]} {COLS.h[idx.h]}:{COLS.m[idx.m]}</b></div>
        <div className="pf-wheel" data-wheel>
          {keys.map(k => <WheelCol key={k} k={k} items={COLS[k]} init={idx[k]} onCommit={i => {
            setIdx(x => ({ ...x, [k]: i }))
            setLog(<>휠이 <b>{COLS[k][i]}</b>에 딱 맞춰졌어요 (스냅).</>)
          }} />)}
        </div>
      </div>
    </Pane>
  )
}

export function Picker() {
  const [today] = useState(startOfToday)
  return (
    <PfCard id="picker" num="13" title="날짜 및 시간 선택기" en="Date & Time" desc="날짜와 시간을 고르는 입력 도구예요. 고르는 손동작부터 달라요."
      diff={Diff3(
        ['Date Picker / Time Picker (Docked · Modal)', 'Pickers · Date Picker (Wheels · Compact · Inline)'],
        ['달력 격자와 시계 다이얼, 고른 값은 진한 원', '돌아가는 휠과 가운데 선택 띠 (달력형 Inline 스타일도 있어요)'],
        ['날짜는 탭, 시간은 다이얼 바늘을 끌거나 키보드 입력으로 바꿔요', '열마다 위아래로 굴려서 가운데 띠에 맞춰요 (스냅)'],
      )}>
      <div className="demos"><PickerM today={today} /><PickerH today={today} /></div>
    </PfCard>
  )
}

/* ================= 14 텍스트 입력창 ================= */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function FieldM() {
  const [kind, setKind] = useState<'f' | 'o'>('f')
  const [name, setName] = useState('')
  const [mail, setMail] = useState('')
  const [mailErr, setMailErr] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>누르면 <b>라벨이 위로 떠올라요</b>.</>)
  const n = name.length
  return (
    <Pane side="m" label="Text Fields" en="Material · Filled / Outlined" log={log}>
      <div className="pf-scr auto">
        <div className="pf-mseg" data-kind style={{ margin: '12px 14px 14px' }}>
          {([['f', 'Filled'], ['o', 'Outlined']] as const).map(([v, l]) => <button key={v} className={'pf-rp' + (kind === v ? ' on' : '')} data-v={v} onClick={() => {
            setKind(v)
            setLog(v === 'o' ? <><b>Outlined</b> — 라벨이 테두리 위로 올라가 선을 끊어요.</> : <><b>Filled</b> — 채워진 배경 + 아래 밑줄이에요.</>)
          }}><Icon k="check" />{l}</button>)}
        </div>
        <div className={'pf-mtfs' + (kind === 'o' ? ' out' : '')} data-tfs>
          <div className={'pf-mtf' + (n > 20 ? ' err' : '')} data-tf="name">
            <input placeholder=" " maxLength={30} data-in value={name}
              onChange={e => {
                const v = e.target.value
                setName(v)
                setLog(v.length > 20 ? <>20자를 넘으면 <b>빨간색 오류 상태</b>가 돼요.</> : <>라벨이 <b>위로 떠서</b> 계속 보여요 · {v.length}/20</>)
              }}
              onFocus={() => setLog(<>포커스 — 라벨이 <b>작아지며 위로</b> 올라가요.</>)} />
            <label>이름</label>
            <div className="sup"><span>실명을 입력해요</span><span data-cnt>{n}/20</span></div>
          </div>
          <div className={'pf-mtf' + (mailErr ? ' err' : '')} data-tf="mail" style={{ marginTop: 6 }}>
            <input placeholder=" " data-in value={mail}
              onChange={e => { const v = e.target.value; setMail(v); if (mailErr && EMAIL.test(v)) setMailErr(false) }}
              onBlur={() => {
                const bad = !!mail && !EMAIL.test(mail)
                setMailErr(bad)
                if (bad) setLog(<>오류는 <b>빨간 테두리 + 도움말</b>로 알려줘요.</>)
              }} />
            <label>이메일</label>
            <div className="sup"><span data-help>{mailErr ? '이메일 형식이 아니에요' : '예: palmer@mail.com'}</span></div>
          </div>
        </div>
      </div>
    </Pane>
  )
}

function HInput({ ph, max, setLog }: { ph: string; max?: number; setLog: (n: ReactNode) => void }) {
  const [v, setV] = useState('')
  const [focus, setFocus] = useState(false)
  const inp = useRef<HTMLInputElement>(null)
  const t = useRef(0)
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <div className="pf-hli">
      <input className="pf-hin" placeholder={ph} maxLength={max} ref={inp} value={v}
        onChange={e => { setV(e.target.value); setLog(e.target.value ? <>입력하면 <b>ⓧ 지우기 버튼</b>이 생겨요.</> : <>비우면 <b>플레이스홀더</b>가 다시 보여요.</>) }}
        onFocus={() => { clearTimeout(t.current); setFocus(true) }}
        onBlur={() => { t.current = window.setTimeout(() => setFocus(document.activeElement === inp.current), 120) }} />
      <button className={'pf-clr' + (v && focus ? ' on' : '')} aria-label="지우기"
        onPointerDown={e => e.preventDefault()}
        onClick={() => { setV(''); inp.current?.focus(); setLog(<><b>ⓧ</b>로 한 번에 지웠어요.</>) }}><Icon k="close" /></button>
    </div>
  )
}

function FieldH() {
  const [log, setLog] = useState<ReactNode>(<>라벨 대신 <b>플레이스홀더</b>, 입력하면 <b>ⓧ 지우기</b>가 생겨요.</>)
  return (
    <Pane side="h" label="Text Field / Text View" en="HIG · 한 줄 / 여러 줄" log={log}>
      <div className="pf-scr auto grp">
        <div className="pf-hbar"><span /><b className="pf-htitle">새 연락처</b><span /></div>
        <div className="pf-hcap">TEXT FIELD · 한 줄</div>
        <div className="pf-grp">
          <HInput ph="이름" max={20} setLog={setLog} />
          <HInput ph="이메일" setLog={setLog} />
        </div>
        <div className="pf-hcap">TEXT VIEW · 여러 줄 메모</div>
        <div className="pf-grp">
          <textarea className="pf-htv" aria-label="메모" onInput={e => {
            const v = e.currentTarget.value
            setLog(<>Text View — <b>{v.split('\n').length}줄</b>, {v.length}자 · 줄바꿈과 스크롤이 돼요.</>)
          }} />
        </div>
      </div>
    </Pane>
  )
}

export function Field() {
  return (
    <PfCard id="field" num="14" title="텍스트 입력창" en="Text Input" desc="글자를 입력받는 칸이에요. 라벨을 보여주는 방식이 달라요."
      diff={Diff3(
        ['Text Fields (Filled · Outlined)', 'Text Field (한 줄) / Text View (여러 줄)'],
        ['플로팅 라벨이 위로 작아지며 이동, 아래 도움말과 글자 수', '테두리 없이 목록 행에 녹아들고, 라벨 대신 플레이스홀더'],
        ['오류는 빨간 테두리와 도움말로 알려줘요', '입력하면 지우기 버튼이 생겨요. Text View는 여러 줄·스크롤 (UIKit 기본엔 플레이스홀더 없음)'],
      )}>
      <div className="demos"><FieldM /><FieldH /></div>
    </PfCard>
  )
}
