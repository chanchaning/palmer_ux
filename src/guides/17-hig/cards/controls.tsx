import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent, type MouseEvent as RMouseEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { HSeg, clamp, segBtn, useStateRef, vars, vibrate } from '../shared'

/* ---------- 13 페이지 컨트롤 · 스테퍼 · 컬러 웰 ---------- */
const SLIDES = ['가을 산책 코스', '조용한 북카페', '11월 전시 모음', '주말 근교 캠핑']
const N = SLIDES.length
const PAL: [string, string][] = [['코랄', '#ff6b6b'], ['오렌지', '#ff922b'], ['노랑', '#fcc419'], ['초록', '#51cf66'], ['민트', '#20c997'], ['하늘', '#339af0'], ['파랑', '#4c6ef5'], ['보라', '#845ef7'], ['분홍', '#f06595'], ['갈색', '#a9805b'], ['회색', '#868e96'], ['먹색', '#343a40']]
const MIN = 1, MAX = 6
const CT_INIT: ReactNode = <>캐러셀을 <b>쓸어 넘기거나</b> 점을 눌러보세요</>

export function Controls() {
  const [idx, setIdx, idxRef] = useStateRef(0)
  const [n, setNState] = useState(2)
  const [pal, setPal] = useState(0)
  const [palOn, setPalOn] = useState(false)
  const [show44, setShow44] = useState(false)
  const [log, setLog] = useState<ReactNode>(CT_INIT)
  const box = useRef<HTMLDivElement>(null)
  const car = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const pc = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x0: number; lx: number; lt: number; v: number; dx: number } | null>(null)

  /** 트랙 위치는 드래그와 같이 쓰므로 직접 갱신 */
  const go = (i: number, how = '') => {
    const v = clamp(i, 0, N - 1)
    setIdx(v)
    if (track.current) track.current.style.transform = 'translateX(' + -v * 100 + '%)'
    setLog(<>{how}페이지 <b>{v + 1} / {N}</b> · {SLIDES[v]}</>)
  }
  useLayoutEffect(() => { if (track.current) track.current.style.transform = 'translateX(0%)' }, [])

  const onPc = (e: RMouseEvent<HTMLDivElement>) => {
    const d = (e.target as HTMLElement).closest('button')
    if (d) { go(+(d.dataset.i ?? 0), '점을 눌러 이동 — '); return }
    const r = e.currentTarget.getBoundingClientRect()
    go(idxRef.current + (e.clientX < r.left + r.width / 2 ? -1 : 1), '점 옆을 탭해서 한 칸 — ')
  }
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    drag.current = { x0: e.clientX, lx: e.clientX, lt: performance.now(), v: 0, dx: 0 }
    track.current?.classList.add('drag'); try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* 합성 이벤트 */ }
  }
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = drag.current
    if (!g) return
    const now = performance.now(), i = idxRef.current
    g.v = (e.clientX - g.lx) / Math.max(1, now - g.lt); g.lx = e.clientX; g.lt = now
    let dx = e.clientX - g.x0
    if ((i === 0 && dx > 0) || (i === N - 1 && dx < 0)) dx = dx * 0.3
    g.dx = dx
    if (track.current) track.current.style.transform = 'translateX(calc(' + -i * 100 + '% + ' + dx + 'px))'
  }
  const onEnd = () => {
    const g = drag.current
    if (!g) return
    const { dx, v } = g, i = idxRef.current
    drag.current = null; track.current?.classList.remove('drag')
    const W = car.current?.clientWidth ?? 300
    if ((dx < -W * 0.2 || v < -0.4) && i < N - 1) go(i + 1, '쓸어 넘기기 — ')
    else if ((dx > W * 0.2 || v > 0.4) && i > 0) go(i - 1, '쓸어 넘기기 — ')
    else go(i, (i === 0 && dx > 0) || (i === N - 1 && dx < 0) ? '끝이라 고무줄처럼 버텨요 — ' : '')
  }

  const setN = (v: number) => {
    const k = clamp(v, MIN, MAX)
    setNState(k)
    setLog(<>스테퍼 · 인원 <b>{k}명</b>{k === MAX ? <> — 최대치라 <b>+</b>가 비활성</> : k === MIN ? <> — 최소치라 <b>−</b>가 비활성</> : null}</>)
  }
  const pick = (i: number) => {
    setPal(i); setPalOn(false)
    setLog(<>컬러 웰 · <b>{PAL[i][0]}</b> — 캐러셀 색이 바로 바뀌어요</>)
  }
  const set44 = (on: boolean) => {
    setShow44(on)
    setLog(on ? <>점선 = <b>44×44pt</b> — 작은 점·버튼도 누르는 영역은 이만큼. 점들은 영역이 겹쳐서 쓸어 넘기기를 함께 써요</> : <>터치 영역 표시를 껐어요</>)
  }
  const q = (s: string) => box.current?.querySelector<HTMLElement>(s) ?? null

  const demo = useDemo({
    reset() { go(0); setN(2); pick(0); set44(false); setLog(CT_INIT) },
    async play(c) {
      const dots = pc.current?.querySelectorAll<HTMLElement>('button')
      await c.press(box.current, dots?.[1] ?? null); await c.sleep(900)
      await c.press(box.current, dots?.[2] ?? null); await c.sleep(900)
      await c.press(box.current, q('#hig-ct-plus')); await c.sleep(600)
      await c.press(box.current, q('#hig-ct-plus')); await c.sleep(800)
      await c.press(box.current, q('#hig-ct-cw')); await c.sleep(800)
      await c.press(box.current, q('#hig-ct-pal button:nth-child(7)')); await c.sleep(1100)
      await c.press(box.current, q('#hig-ct-44')); await c.sleep(1800)
      await c.press(box.current, q('#hig-ct-44')); await c.sleep(300)
    },
  })

  return (
    <Card id="hig-ctrl" num="13" title="페이지 컨트롤 · 스테퍼 · 컬러 웰" en="Page Control · Stepper · Color Well" demo={demo}
      desc="HIG 고유 이름의 작은 컨트롤들. 캐러셀 아래 • • •, [− | +] 버튼, 누르면 팔레트가 열리는 동그란 색 버튼이에요.">
      <Stage log={log}>
        <div className={'box left hig-ct-box' + (show44 ? ' show44' : '')} id="hig-ct-box" ref={box} style={vars({ '--hig-tint': PAL[pal][1] })}
          onPointerDown={e => {
            const t = e.target as HTMLElement
            if (palOn && !t.closest('.hig-cw-pal') && !t.closest('.hig-cw')) setPalOn(false)
          }}>
          <div className="hig-ct-car" id="hig-ct-car" ref={car} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}>
            <div className="hig-ct-track" id="hig-ct-track" ref={track}>
              {SLIDES.map((s, i) => <div className="hig-ct-slide" key={s}><small>오늘의 추천 {i + 1} / 4</small><b>{s}</b></div>)}
            </div>
          </div>
          <div className="hig-ct-pc" id="hig-ct-pc" ref={pc} aria-label="페이지 컨트롤" onClick={onPc}>
            {SLIDES.map((_, i) => <button key={i} data-i={i} className={'hig-t44' + (i === idx ? ' on' : '')} aria-label={i + 1 + '페이지'} />)}
          </div>
          <div className="hig-ct-row">
            <span>인원<b id="hig-ct-n">{n}명</b></span>
            <div className="hig-st">
              <button className="hig-t44" id="hig-ct-minus" aria-label="빼기" disabled={n <= MIN} onClick={() => setN(n - 1)}>−</button><i />
              <button className="hig-t44" id="hig-ct-plus" aria-label="더하기" disabled={n >= MAX} onClick={() => setN(n + 1)}>+</button>
            </div>
          </div>
          <div className="hig-ct-row">
            <span>강조 색<b id="hig-ct-cname">{PAL[pal][0]}</b></span>
            <button className="hig-cw hig-t44" id="hig-ct-cw" aria-label="색상 선택"
              onClick={() => { const on = !palOn; setPalOn(on); if (on) setLog(<><b>컬러 웰</b>을 누르면 색상 팔레트가 열려요</>) }}><span /></button>
            <div className={'hig-cw-pal' + (palOn ? ' on' : '')} id="hig-ct-pal">
              {PAL.map(([nm, c], i) => <button key={nm} data-i={i} aria-label={nm} style={{ background: c }} className={i === pal ? 'on' : undefined} onClick={() => pick(i)} />)}
            </div>
          </div>
          <div className="hig-ct-row">
            <span>44×44pt 터치 영역 보기</span>
            <button className="switch" role="switch" aria-checked={show44} id="hig-ct-44" aria-label="터치 영역 보기" onClick={() => set44(!show44)} />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['최소 터치 영역', '44×44pt'], ['단위', 'pt (포인트)']]}
        usage={[
          ['pt', '화면 밀도와 상관없는 논리 단위예요. 레티나 화면에서는 1pt가 2~3픽셀로 그려져요.'],
          ['규칙', '눈에 보이는 크기는 작아도 누르는 영역은 44×44pt 이상 확보해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 14 라이브 액티비티 ---------- */
const STAGES: [number, string, string][] = [[0, '주문 접수', '가게에서 주문을 확인했어요'], [0.15, '조리 중', '맛있게 만들고 있어요'], [0.45, '배달 중', '라이더가 출발했어요'], [1, '도착', '문 앞에 도착했어요 🎉']]
const stageIdx = (pr: number) => (pr >= 1 ? 3 : pr >= 0.45 ? 2 : pr >= 0.15 ? 1 : 0)
const APPS = Array.from({ length: 16 }, (_, i) => `linear-gradient(135deg,hsl(${(i * 53) % 360},72%,62%),hsl(${(i * 53 + 30) % 360},68%,46%))`)
const LA_INIT: ReactNode = <><b>주문하기</b>로 실시간 현황을 시작해보세요</>
type Isl = '' | 'c' | 'e'

export function LiveActivity() {
  const m = useMotion()
  const timers = useTimers()
  const [pr, setPr, prRef] = useStateRef(0)
  const [live, setLive, liveRef] = useStateRef(false)
  const [view, setView, viewRef] = useStateRef<'lock' | 'home'>('lock')
  const [isl, setIsl, islRef] = useStateRef<Isl>('')
  const [log, setLog] = useState<ReactNode>(LA_INIT)
  const dev = useRef<HTMLDivElement>(null)
  const is = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const iv = useRef(0)
  const endT = useRef(0)
  const lastSi = useRef(0)
  useEffect(() => () => clearInterval(iv.current), [])

  const islandForView = () => {
    if (viewRef.current === 'home' && liveRef.current) { if (islRef.current !== 'e') setIsl('c') } else setIsl('')
  }
  const stopIv = () => { clearInterval(iv.current); iv.current = 0 }
  const start = () => {
    stopIv(); timers.clear(endT.current)
    setPr(0); lastSi.current = 0; setLive(true); islandForView()
    setLog(viewRef.current === 'lock' ? <>잠금 화면에 <b>실시간 배달 현황</b>이 떴어요</> : <>아일랜드에 <b>작게</b> 들어갔어요 — 눌러서 펼쳐보세요</>)
    iv.current = window.setInterval(() => {
      const p = Math.min(1, prRef.current + 0.02)
      setPr(p)
      const si = stageIdx(p)
      if (si !== lastSi.current) { lastSi.current = si; setLog(<><b>{STAGES[si][1]}</b> — 앱을 열지 않아도 단계가 바로 바뀌어요</>) }
      if (p >= 1) {
        stopIv(); vibrate(20)
        if (viewRef.current === 'home') {
          setIsl('e'); timers.clear(endT.current)
          endT.current = timers.set(() => { if (liveRef.current) setIsl('c') }, m.D(2500))
        }
        setLog(<><b>도착!</b> — 일이 끝났으니 활동도 곧 끝내요 (■ 종료)</>)
      }
    }, m.D(400))
  }
  const end = () => { stopIv(); timers.clear(endT.current); setLive(false); setIsl(''); setPr(0) }
  const toggleIs = () => {
    if (!liveRef.current || viewRef.current !== 'home') {
      setLog(viewRef.current === 'lock' ? <>잠금 화면에선 아래 <b>카드</b>로 보여요 — 홈으로 바꿔보세요</> : <>진행 중인 활동이 없으면 <b>카메라 영역</b>만 보여요</>)
      return
    }
    const toE = islRef.current !== 'e'
    setIsl(toE ? 'e' : 'c'); timers.clear(endT.current)
    setLog(toE ? <>아일랜드가 <b>펼쳐졌어요</b> (실제 기기에서는 길게 누르면 펼쳐져요)</> : <><b>압축 보기</b> — 왼쪽 아이콘, 오른쪽 남은 시간</>)
  }
  const onIsKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleIs() } }
  const changeView = (v: 'lock' | 'home') => {
    setView(v); setIsl(''); islandForView()
    const lv = liveRef.current
    setLog(v === 'home' ? (lv ? <>홈 화면에선 <b>다이내믹 아일랜드</b>로 옮겨가요</> : <>홈 화면 — 활동을 시작하면 아일랜드에 나타나요</>)
      : (lv ? <>잠금 화면에선 <b>카드</b>로 크게 보여요</> : <>잠금 화면 — <b>주문하기</b>를 눌러보세요</>))
  }

  const si = stageIdx(pr), eta = pr >= 1 ? '도착' : Math.max(1, Math.ceil((1 - pr) * 15)) + '분'
  const q = (s: string) => dev.current?.parentElement?.querySelector<HTMLElement>(s) ?? null

  const demo = useDemo({
    reset() { end(); setView('lock'); setLog(LA_INIT) },
    async play(c) {
      await c.press(dev.current, q('#hig-la-go')); await c.sleep(3200)
      await c.press(seg.current, segBtn(seg.current, 'home')); await c.sleep(1400)
      await c.press(dev.current, is.current); await c.sleep(2600)
      await c.press(dev.current, is.current); await c.sleep(1000)
      await c.press(seg.current, segBtn(seg.current, 'lock')); await c.sleep(600)
    },
  })

  return (
    <Card id="hig-live" num="14" title="라이브 액티비티" en="Live Activities" demo={demo}
      desc="잠금 화면과 다이내믹 아일랜드에 배달 현황·경기 점수 같은 진행 중인 정보를 실시간으로 보여줘요.">
      <Stage log={log}>
        <div className={'device black hig-la-dev' + (live ? ' live' : '') + (view === 'home' ? ' home' : '')} id="hig-la-dev" ref={dev}>
          <div className="statusbar light"><span>9:41</span><span>●●● 100%</span></div>
          <div className={'hig-island' + (isl ? ' ' + isl : '')} id="hig-la-is" ref={is} role="button" tabIndex={0} aria-label="다이내믹 아일랜드"
            onClick={toggleIs} onKeyDown={onIsKey}>
            <div className="hig-is-c"><span>🛵</span><span className="hig-is-r" id="hig-la-isr">{eta}</span></div>
            <div className="hig-is-x">
              <div className="hig-is-row"><span>🛵 와플 버거</span><b id="hig-la-isx">{eta}</b></div>
              <div className="hig-is-bar"><i id="hig-la-isfill" style={{ width: pr * 100 + '%' }} /></div>
              <small id="hig-la-ismsg">{STAGES[si][2]}</small>
            </div>
          </div>
          <div className="hig-la-lock">
            <div className="hig-la-date">🔒 11월 8일 일요일</div>
            <div className="hig-la-clock">9:41</div>
            <div className="hig-la-hint">아래 <b>주문하기</b>를 누르면 잠금 화면에 실시간 배달 현황이 떠요</div>
            <div className="hig-la-card" id="hig-la-card">
              <div className="hig-la-top">
                <span className="hig-la-ico">🍔</span>
                <span className="hig-la-t"><b>와플 버거</b><span id="hig-la-stage">{STAGES[si][1]}</span></span>
                <span className="hig-la-eta">도착까지<b id="hig-la-eta">{eta}</b></span>
              </div>
              <div className="hig-la-track">
                <div className="hig-la-fill" id="hig-la-fill" style={{ width: pr * 100 + '%' }} />
                <span className="hig-la-rider" id="hig-la-rider" style={{ left: pr * 100 + '%' }}>🛵</span>
              </div>
              <div className="hig-la-steps" id="hig-la-steps">
                {['접수', '조리', '배달', '도착'].map((s, j) => <span key={s} className={j <= si ? 'on' : undefined}>{s}</span>)}
              </div>
              <div className="hig-la-msg" id="hig-la-msg">{STAGES[si][2]}</div>
            </div>
            <div className="hig-la-btm"><span>🔦</span><span>📷</span></div>
          </div>
          <div className="hig-la-home"><div className="hig-la-apps" id="hig-la-apps">{APPS.map((bg, i) => <span key={i} style={{ background: bg }} />)}</div></div>
        </div>
        <div className="hig-ctl"><HSeg ref={seg} id="hig-la-seg" value={view} onChange={changeView} options={[['lock', '잠금 화면'], ['home', '홈 · 아일랜드']]} /></div>
        <div className="hig-ctl">
          <button className="btn sm" id="hig-la-go" onClick={start}>▶ 주문하기</button>
          <button className="btn ghost sm" id="hig-la-end"
            onClick={() => { const was = liveRef.current; end(); setLog(was ? <>활동 <b>종료</b> — 잠금 화면과 아일랜드에서 사라져요</> : <>진행 중인 활동이 없어요 — <b>주문하기</b>부터</>) }}>■ 종료</button>
        </div>
      </Stage>
      <Info
        spec={[['위치', '잠금 화면 · 다이내믹 아일랜드'], ['예', '배달 현황 · 경기 점수']]}
        usage={[
          ['언제', '곧 끝나는, 계속 바뀌는 일 — 배달·택시·경기·타이머처럼 앱을 열지 않고 확인하고 싶은 것'],
          ['주의', '광고나 끝나지 않는 정보는 넣지 않아요. 일이 끝나면 활동도 끝내요.'],
        ]}
      />
    </Card>
  )
}
