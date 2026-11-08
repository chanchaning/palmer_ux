import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { lv } from '../shared'

/* ---------- 07 툴팁 ---------- */
const TOOLS: { tip: string; kbd: string; label: string; style?: CSSProperties }[] = [
  { tip: '굵게', kbd: 'Ctrl+B', label: 'B' },
  { tip: '기울임', kbd: 'Ctrl+I', label: 'I', style: { fontStyle: 'italic', fontFamily: 'serif' } },
  { tip: '링크 넣기', kbd: 'Ctrl+K', label: '🔗' },
  { tip: '체크리스트', kbd: '', label: '☑' },
  { tip: '더 많은 서식', kbd: '', label: '⋯' },
]
const Q = 5 // '?' 토글팁 버튼의 owner 번호
const tipOf = (i: number): ReactNode => <>{TOOLS[i].tip}{TOOLS[i].kbd && <kbd>{TOOLS[i].kbd}</kbd>}</>

export function Tooltip() {
  const { D, rel } = useMotion()
  const timers = useTimers()
  const box = useRef<HTMLDivElement>(null), tip = useRef<HTMLDivElement>(null)
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const qBtn = useRef<HTMLButtonElement>(null)
  const ownerRef = useRef<number | null>(null), showT = useRef<number | undefined>(undefined), pressT = useRef<number | undefined>(undefined)
  const [owner, setOwnerState] = useState<number | null>(null)
  const [content, setContent] = useState<{ node: ReactNode; seq: number }>({ node: null, seq: 0 })
  const [log, setLog] = useState<ReactNode>(<>아이콘에 <b>마우스를 올리거나</b> Tab으로 이동해 보세요</>)
  const setOwner = (i: number | null) => { ownerRef.current = i; setOwnerState(i) }
  const elOf = (i: number) => (i === Q ? qBtn.current : btns.current[i])

  // 내용이 바뀐 뒤 크기를 재서 위치를 잡아요 (페인트 전)
  useLayoutEffect(() => {
    const b = box.current, t = tip.current, el = owner === null ? null : elOf(owner)
    if (!b || !t || !el) return
    const r = rel(b, el), bw = b.clientWidth, tw = t.offsetWidth
    const cx = r.left + r.width / 2, left = Math.max(6, Math.min(bw - tw - 6, cx - tw / 2))
    t.style.left = left + 'px'; t.style.top = (r.top - t.offsetHeight - 8) + 'px'
    t.style.setProperty('--ax', (cx - left) + 'px')
  }, [owner, content.seq]) // rel은 안정된 함수라 의존성에서 빼요

  const show = (i: number, node: ReactNode, how: ReactNode) => {
    timers.clear(showT.current)
    setOwner(i)
    setContent(c => ({ node, seq: c.seq + 1 }))
    setLog(how)
  }
  const hide = (how?: ReactNode) => {
    timers.clear(showT.current)
    if (ownerRef.current === null) return
    setOwner(null)
    if (how) setLog(how)
  }

  // 토글팁은 바깥을 누르면 닫혀요
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ownerRef.current === Q && !box.current?.contains(e.target as Node)) hide() }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  })

  const demo = useDemo({
    reset() { hide(); setLog(<>아이콘에 <b>마우스를 올리거나</b> Tab으로 이동해 보세요</>) },
    async play(c) {
      const b = btns.current
      c.tap(box.current, b[0]); setLog(<>⏳ <b>400ms</b> 머무르면 표시 — 스쳐 지나가면 안 떠요</>); await c.sleep(400)
      show(0, tipOf(0), <><b>굵게</b> 툴팁 표시 · 벗어나면 사라짐</>); await c.sleep(900)
      c.tap(box.current, b[2]); show(2, tipOf(2), <>이미 떠 있으면 <b>지연 없이</b> 옆으로 이동</>); await c.sleep(1000)
      hide(); await c.sleep(300)
      await c.press(box.current, qBtn.current); await c.sleep(1500)
    },
  })

  return (
    <Card id="feedback-tip" num="07" title="툴팁" en="Tooltip" desc="먼저 찾아온 사람에게만 짧게 설명해요. 올리거나 포커스하면 뜨고, 벗어나면 사라져요." demo={demo}>
      <Stage log={log}>
        <div className="box" ref={box}>
          <div className="fb-toolbar" role="toolbar" aria-label="서식">
            {TOOLS.map((t, i) => (
              <button key={t.tip} className="fb-tb" aria-label={t.tip} style={t.style} ref={el => { btns.current[i] = el }}
                aria-describedby={owner === i ? 'feedback-tip-el' : undefined}
                onPointerEnter={e => {
                  if (e.pointerType !== 'mouse') return
                  timers.clear(showT.current)
                  if (ownerRef.current !== null && ownerRef.current !== Q) { show(i, tipOf(i), <>이미 떠 있으면 <b>지연 없이</b> 옆으로 이동</>); return }
                  setLog(<>⏳ <b>400ms</b> 머무르면 표시 — 스쳐 지나가면 안 떠요</>)
                  showT.current = timers.set(() => show(i, tipOf(i), <><b>{t.tip}</b> 툴팁 표시 · 벗어나면 사라짐</>), D(400))
                }}
                onPointerLeave={e => { if (e.pointerType === 'mouse') hide(<>포인터가 떠나 <b>툴팁 사라짐</b></>) }}
                onFocus={e => { if (e.currentTarget.matches(':focus-visible')) show(i, tipOf(i), <><b>키보드 포커스</b>는 즉시 표시 · Esc로 닫기</>) }}
                onBlur={() => { if (ownerRef.current === i) hide() }}
                onKeyDown={e => { if (e.key === 'Escape') hide(<><b>Esc</b>로 툴팁만 닫힘</>) }}
                onPointerDown={e => {
                  if (e.pointerType === 'mouse') { hide(); return }
                  timers.clear(pressT.current)
                  pressT.current = timers.set(() => show(i, tipOf(i), <><b>길게 누르기</b>로 표시 — 터치에선 호버가 없어요</>), D(500))
                }}
                onPointerUp={e => { if (e.pointerType !== 'mouse') { timers.clear(pressT.current); timers.set(() => { if (ownerRef.current === i) hide() }, D(1200)) } }}
                onPointerCancel={e => { if (e.pointerType !== 'mouse') { timers.clear(pressT.current); timers.set(() => { if (ownerRef.current === i) hide() }, D(1200)) } }}
                onContextMenu={e => e.preventDefault()}
                onClick={() => setLog(<><b>{t.tip}</b> 실행 — 툴팁은 실행을 막지 않아요</>)}>{t.label}</button>
            ))}
          </div>
          <div className="fb-pay">
            <div className="row"><span>월 급여</span><span>3,200,000원</span></div>
            <div className="row">
              <span>실수령액<button className="fb-q" ref={qBtn} aria-expanded={owner === Q} aria-label="실수령액 설명"
                aria-describedby={owner === Q ? 'feedback-tip-el' : undefined}
                onClick={() => {
                  if (ownerRef.current === Q) { hide(<><b>?</b> 다시 눌러 닫음</>); return }
                  show(Q, '세금·4대 보험을 뺀 뒤 실제로 통장에 들어오는 금액이에요.', <><b>? 토글팁</b> — 탭으로 열고 닫아 터치에서도 보여요</>)
                }}>?</button></span>
              <span>2,846,000원</span>
            </div>
          </div>
          <div className={'fb-tip' + (owner !== null ? ' on' : '')} id="feedback-tip-el" role="tooltip" ref={tip}>{content.node}</div>
        </div>
      </Stage>
      <Info
        spec={[lv(1, '거의 없음'), ['지연', '호버 400ms · 포커스 즉시'], ['터치', '길게 누르기']]}
        usage={[['언제', '아이콘만 있는 버튼의 이름, 단축키, 용어 한 줄 설명'], ['주의', '꼭 알아야 할 정보를 숨기지 마세요 — 터치 기기에선 호버가 없어서 못 봐요']]}
      />
    </Card>
  )
}

/* ---------- 08 코치마크 ---------- */
const STEPS = [
  ['검색은 여기서', '가게 이름도, 메뉴 이름도 한 번에 찾아요.'],
  ['바로 주문 담기', '자주 시키는 메뉴를 + 버튼으로 바로 담아요.'],
  ['주문 내역은 내 정보에', '배달 상태와 지난 주문을 여기서 확인해요.'],
] as const

export function CoachMark() {
  const { rel } = useMotion()
  const dev = useRef<HTMLDivElement>(null), spot = useRef<HTMLDivElement>(null), tipEl = useRef<HTMLDivElement>(null)
  const start = useRef<HTMLButtonElement>(null), next = useRef<HTMLButtonElement>(null)
  const t1 = useRef<HTMLDivElement>(null), t2 = useRef<HTMLButtonElement>(null), t3 = useRef<HTMLButtonElement>(null)
  const [on, setOn] = useState(false)
  const [step, setStep] = useState(-1)
  const [log, setLog] = useState<ReactNode>(<><b>둘러보기 시작</b>을 눌러 보세요</>)

  // 단계가 바뀌면 구멍(spot)과 설명 위치를 다시 잡아요
  useLayoutEffect(() => {
    const d = dev.current, s = spot.current, tp = tipEl.current
    const t = [t1.current, t2.current, t3.current][step]
    if (step < 0 || !d || !s || !tp || !t) return
    const r = rel(d, t), pad = 5
    Object.assign(s.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px', borderRadius: step === 1 ? '50%' : '12px' })
    const th = tp.offsetHeight, H = d.clientHeight
    tp.style.top = (r.top + r.height / 2 < H / 2 ? r.top + r.height + 14 : r.top - th - 14) + 'px'
  }, [step, on]) // rel은 안정된 함수라 의존성에서 빼요

  const go = (n: number) => { setStep(n); setLog(<><b>{n + 1} / 3 · {STEPS[n][0]}</b> — 나머지 화면은 어둡게 막힘</>) }
  const end = (how: ReactNode) => { setOn(false); setStep(-1); setLog(how) }

  const demo = useDemo({
    reset() { setOn(false); setStep(-1); setLog(<><b>둘러보기 시작</b>을 눌러 보세요</>) },
    async play(c) {
      await c.press(dev.current, start.current); await c.sleep(1400)
      await c.press(dev.current, next.current); await c.sleep(1400)
      await c.press(dev.current, next.current); await c.sleep(1400)
      await c.press(dev.current, next.current); await c.sleep(500)
    },
  })

  const cur = Math.max(0, step)
  return (
    <Card id="feedback-coach" num="08" title="코치마크" en="Coach Mark" desc="화면을 어둡게 덮고 한 곳만 뚫어 비춰요. 처음 쓰는 사람에게 단계별로 길을 알려줘요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">와플 마켓</div>
            <div className="pad">
              <div className="ft-search" ref={t1}>🔍 가게, 메뉴 검색</div>
              <div style={{ height: 70, borderRadius: 12 }} className="g1" />
              <div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} />
              <button className="btn sm ghost" ref={start} onClick={() => { setOn(true); go(0) }}>✨ 둘러보기 시작</button>
            </div>
            <div className="fb-grow" />
            <div className="tabbar">
              <button className="on"><i>⌂</i>홈</button>
              <button><i>♡</i>찜</button>
              <button ref={t3}><i>◉</i>내 정보</button>
            </div>
          </div>
          <button className="fb-fab" ref={t2} aria-label="새 주문">+</button>
          <div className={'fb-cm' + (on ? ' on' : '')} role="dialog" aria-label="둘러보기"
            onKeyDown={e => { if (e.key === 'Escape') end(<><b>Esc</b>로 투어 종료</>) }}>
            <div className="fb-spot" ref={spot} />
            <div className="fb-cm-tip" ref={tipEl}>
              <span className="step">{cur + 1} / 3</span>
              <b>{step >= 0 ? STEPS[cur][0] : ''}</b><span>{step >= 0 ? STEPS[cur][1] : ''}</span>
              <div className="row">
                <button className="skip" onClick={() => end(<><b>건너뛰기</b> — 언제든 빠져나갈 수 있어야 해요</>)}>건너뛰기</button>
                <span className="dots">{[0, 1, 2].map(j => <i key={j} className={j === step ? 'on' : ''} />)}</span>
                <button className="btn sm orange" ref={next}
                  onClick={() => { if (step < 2) go(step + 1); else end(<>투어 끝 — <b>다시는 자동으로 안 띄워요</b></>) }}>{step === 2 ? '시작하기' : '다음'}</button>
              </div>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[lv(4, '높음'), ['단계', '3개 이하'], ['탈출', '건너뛰기 항상']]}
        usage={[['언제', '첫 실행, 큰 업데이트 직후처럼 새 기능의 위치를 알려줘야 할 때'], ['주의', '한 번만 보여주고 다시 띄우지 마세요 — ‘건너뛰기’는 첫 단계부터 있어야 해요']]}
      />
    </Card>
  )
}

/* ---------- 09 배지 ---------- */
const STATES = [['온라인', 'var(--accent)'], ['자리 비움', 'var(--b)'], ['방해 금지', 'var(--danger)'], ['오프라인', 'var(--text-3)']] as const

export function Badge() {
  const box = useRef<HTMLDivElement>(null), dotBtn = useRef<HTMLButtonElement>(null), bell = useRef<HTMLButtonElement>(null)
  const addBtn = useRef<HTMLButtonElement>(null), cycleBtn = useRef<HTMLButtonElement>(null), cnt = useRef<HTMLSpanElement>(null)
  const nRef = useRef(3), sRef = useRef(0)
  const [n, setN] = useState(3)
  const [tick, setTick] = useState(0)
  const [dot, setDot] = useState(true)
  const [s, setS] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>아이콘을 누르면 <b>읽음 처리</b>돼 배지가 사라져요</>)

  const setCount = (v: number) => { nRef.current = v; setN(v); setTick(t => t + 1) }
  // 숫자가 바뀔 때마다 통통 튀어요 (원본: bump 클래스를 뺐다 다시 붙임)
  useEffect(() => {
    const c = cnt.current
    if (!c || !tick) return
    c.classList.remove('bump'); void c.offsetWidth
    if (nRef.current) c.classList.add('bump')
  }, [tick])
  const setSt = (v: number) => { sRef.current = v; setS(v) }
  const cycle = () => { const v = (sRef.current + 1) % 4; setSt(v); setLog(<>상태 → <b>{STATES[v][0]}</b> · 색만으로 구분하지 않게 글자도 함께</>) }

  const demo = useDemo({
    reset() { setCount(3); setDot(true); setSt(0); setLog(<>아이콘을 누르면 <b>읽음 처리</b>돼 배지가 사라져요</>) },
    async play(c) {
      await c.press(box.current, addBtn.current); await c.sleep(700)
      await c.press(box.current, addBtn.current); await c.sleep(900)
      await c.press(box.current, dotBtn.current); await c.sleep(1000)
      await c.press(box.current, cycleBtn.current); await c.sleep(1000)
      await c.press(box.current, bell.current); await c.sleep(800)
    },
  })

  return (
    <Card id="feedback-badge" num="09" title="배지" en="Badge" desc="아이콘 귀퉁이에 붙어 ‘새것이 있다’만 조용히 알려요. 점, 숫자, 상태 세 가지가 있어요." demo={demo}>
      <Stage log={log}>
        <div className="box" ref={box}>
          <div className="fb-badges">
            <div className="fb-bcell">
              <button className="icon-btn" ref={dotBtn} aria-label={dot ? '소식, 새 글 있음' : '소식'}
                onClick={() => { setDot(false); setLog(<><b>점 배지</b> — 들어가 보면 사라져요. 개수는 몰라도 돼요</>) }}>
                📰<span className={'fb-dot' + (dot ? '' : ' hide')} />
              </button>
              <div><b>점</b><small>있다 / 없다</small></div>
            </div>
            <div className="fb-bcell">
              <button className="icon-btn" ref={bell} aria-label={n ? '알림 ' + n + '개' : '알림 없음'}
                onClick={() => { setCount(0); setLog(<><b>숫자 배지</b> — 확인하면 0이 되며 사라져요</>) }}>
                🔔<span className={'count' + (n === 0 ? ' hide' : '')} ref={cnt}>{n > 99 ? '99+' : n}</span>
              </button>
              <div><b>숫자</b><small>몇 개인지</small></div>
            </div>
            <div className="fb-bcell">
              <button className="fb-av" aria-label={'내 상태: ' + STATES[s][0]} onClick={cycle}>
                P<span className="fb-status" style={{ ['--fb-s' as string]: STATES[s][1] }} />
              </button>
              <div><b>상태</b><small>{STATES[s][0]}</small></div>
            </div>
          </div>
          <div className="fb-ctrl">
            <button className="btn ghost sm" ref={addBtn} onClick={() => {
              const v = nRef.current >= 99 ? nRef.current + 37 : nRef.current + 1
              setCount(v); setDot(true)
              setLog(v > 99 ? <><b>99+</b>로 잘라 표시 — 정확한 숫자보다 ‘많다’가 중요</> : <>새 알림 → 숫자 <b>{v}</b>, 점도 다시 켜짐</>)
            }}>+ 새 알림</button>
            <button className="btn ghost sm" onClick={() => { setCount(0); setDot(false); setLog(<><b>모두 읽음</b> — 배지가 없는 게 기본 상태예요</>) }}>모두 읽음</button>
            <button className="btn ghost sm" ref={cycleBtn} onClick={cycle}>상태 바꾸기</button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[lv(1, '거의 없음'), ['숫자', '99+ 상한'], ['상태', '색 + 글자']]}
        usage={[['언제', '안 읽은 알림·메시지 수, 새 기능 표시, 사용자 접속 상태'], ['주의', '모든 탭에 숫자를 달면 아무것도 안 보여요 — 정말 확인할 것에만 붙이세요']]}
      />
    </Card>
  )
}
