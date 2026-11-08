import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'

/* ---------- 07 순차 등장 ---------- */
const NOTI = [
  ['김', '', '김디자 님이 댓글을 남겼어요', '방금 전'],
  ['박', 'o', '박기획 님이 시안을 공유했어요', '3분 전'],
  ['🎉', '', '프로젝트가 완료되었어요', '1시간 전'],
  ['이', 'o', '이개발 님이 회원님을 언급했어요', '2시간 전'],
  ['📌', '', '회의가 30분 뒤 시작돼요', '어제'],
  ['정', 'o', '정와플 님이 팔로우했어요', '어제'],
] as const

export function Stagger() {
  const { A, clearA, sleep } = useMotion()
  const dev = useRef<HTMLDivElement>(null), refresh = useRef<HTMLButtonElement>(null)
  const items = useRef<(HTMLDivElement | null)[]>([])
  const [log, setLog] = useState<ReactNode>(<>새로고침으로 <b>순차 등장</b> 확인</>)

  const run = async (gap: number, label: ReactNode) => {
    items.current.forEach((it, i) => {
      if (!it) return
      clearA(it)
      A(it, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], 320, EASE.out, gap * i)
    })
    setLog(label)
    await sleep(320 + gap * items.current.length)
  }
  const stagger = () => run(60, <><b>60ms 간격</b>으로 하나씩 — 시선이 위→아래로 흐름</>)

  const demo = useDemo({
    reset() { items.current.forEach(it => { if (!it) return; clearA(it); it.animate([{ opacity: 0 }], { duration: 0, fill: 'forwards' }) }) },
    async play(c) { await c.press(dev.current, refresh.current); await c.sleep(900) },
  })

  return (
    <Card id="t-stagger" num="07" title="순차 등장" en="Stagger" desc="여러 요소가 한꺼번에가 아니라 일정한 간격을 두고 하나씩 나타나요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">알림함<span className="sp" /><button ref={refresh} aria-label="새로고침" onClick={stagger}>↻ 새로고침</button></div>
            <div>
              {NOTI.map(([av, o, t, sub], i) => (
                <div className="li st-item" key={t} ref={el => { items.current[i] = el }}>
                  <i className={'ic round' + (o ? ' o' : '')}>{av}</i><span>{t}<span className="sub">{sub}</span></span>
                </div>
              ))}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['간격', '60ms'], ['개별', '320ms'], ['전체', '~600ms 이내']]}
        usage={[['언제', '리스트·피드 첫 로딩, 대시보드 위젯, 메뉴 펼침'], ['규칙', '항목이 많으면 앞의 5~7개만 순차로, 나머지는 함께']]}
        replayLabel="▶ 순차 등장"
        actions={<button className="btn ghost sm" onClick={() => run(0, <><b>한 번에</b> 등장 — 덩어리로 느껴짐</>)}>한 번에 등장 (비교)</button>}
      />
    </Card>
  )
}

/* ---------- 08 탭 전환 ---------- */
const TAB_NAMES = ['전체', '진행중', '완료']
type Order = readonly [string, 'ship' | 'done' | 'blue', string]
const PANES: Order[][] = [
  [['무선 이어폰', 'ship', '배송중'], ['텀블러', 'done', '완료'], ['노트 세트', 'blue', '결제완료'], ['데스크 매트', 'done', '완료']],
  [['무선 이어폰', 'ship', '배송중'], ['노트 세트', 'blue', '결제완료']],
  [['텀블러', 'done', '완료'], ['데스크 매트', 'done', '완료']],
]

export function TabSlide() {
  const dev = useRef<HTMLDivElement>(null), bar = useRef<HTMLDivElement>(null)
  const cur = useRef(0), x0 = useRef<number | null>(null)
  const [tab, setTab] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>탭을 누르거나 <b>좌우로 스와이프</b></>)

  const go = (n: number) => {
    const i = Math.max(0, Math.min(2, n)), from = cur.current
    if (i === from) return
    setTab(i)
    setLog(<>{TAB_NAMES[from]} → <b>{TAB_NAMES[i]}</b> · {i > from ? '← 왼쪽으로' : '오른쪽으로 →'} 밀림</>)
    cur.current = i
  }

  const demo = useDemo({
    reset() { go(0) },
    async play(c) {
      const btn = (i: number) => bar.current?.children[i] as HTMLElement | null
      await c.press(dev.current, btn(2)); await c.sleep(1000)
      await c.press(dev.current, btn(1)); await c.sleep(900)
      await c.press(dev.current, btn(0)); await c.sleep(400)
    },
  })

  return (
    <Card id="t-tabs" num="08" title="탭 전환" en="Tab Slide" desc="같은 층위의 탭 사이를 좌우로 슬라이드해요. 방향은 탭 순서를 따라가요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">주문 내역</div>
            <div className="tbar" ref={bar}>
              {TAB_NAMES.map((n, i) => <button key={n} className={tab === i ? 'on' : ''} onClick={() => go(i)}>{n}</button>)}
              <span className="tind" style={{ transform: `translateX(${tab * 100}%)` }} />
            </div>
            <div className="tview"
              onPointerDown={e => { x0.current = e.clientX }}
              onPointerUp={e => {
                if (x0.current === null) return
                const dx = e.clientX - x0.current
                x0.current = null
                if (dx < -40) go(cur.current + 1); else if (dx > 40) go(cur.current - 1)
              }}>
              <div className="tstrip" style={{ transform: `translateX(${(-tab * 100) / 3}%)` }}>
                {PANES.map((p, i) => (
                  <div className="tpane" key={i}>
                    {p.map(([n, cls, label]) => <div className="oi" key={n}><span>{n}</span><span className={'badge ' + cls}>{label}</span></div>)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['방향', '↔ 탭 순서대로'], ['시간', '300ms'], ['이징', 'Standard']]}
        usage={[['언제', '같은 화면 안에서 나란한 분류(전체/진행중/완료)를 오갈 때'], ['vs 푸시', '깊이가 아니라 ‘옆으로’ 이동 — 인디케이터가 함께 움직여요']]}
      />
    </Card>
  )
}

/* ---------- 09 시트 확장 ---------- */
const ORDER = ['peek', 'half', 'full'] as const
type Snap = (typeof ORDER)[number]
const LABEL: Record<Snap, string> = { peek: '미리보기 (Peek)', half: '절반 (Half)', full: '전체 (Full)' }

export function SheetExpand() {
  const dev = useRef<HTMLDivElement>(null), sh = useRef<HTMLDivElement>(null), scrim = useRef<HTMLDivElement>(null), grab = useRef<HTMLButtonElement>(null)
  const st = useRef({ state: 'peek' as Snap, y: 0, startY: null as number | null, startT: 0, moved: false, suppress: false, onGrab: false })
  const [log, setLog] = useState<ReactNode>(<b>{LABEL.peek}</b>)

  const snaps = (): Record<Snap, number> => { const H = dev.current?.clientHeight ?? 420; return { peek: H - 104, half: Math.round(H * 0.46), full: 26 } }
  const setY = (v: number) => {
    st.current.y = v
    const s = snaps(), el = sh.current
    if (!el || !scrim.current) return
    el.style.transform = `translateY(${v}px)`
    scrim.current.style.opacity = String(Math.max(0, Math.min(1, (s.half - v) / (s.half - s.full))) * 0.3)
    el.style.borderRadius = v <= s.full + 2 ? '12px 12px 0 0' : '16px 16px 0 0'
  }
  const setState = (k: Snap, how?: string) => {
    st.current.state = k
    setY(snaps()[k])
    setLog(<><b>{LABEL[k]}</b>{how ? ' · ' + how : ''}</>)
  }

  useLayoutEffect(() => { setY(snaps()[st.current.state]) }, []) // 첫 위치(미리보기)
  useEffect(() => {
    const onResize = () => setY(snaps()[st.current.state])
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 원본은 pointerdown에서 bs-head를 캡처해서, 마우스로 손잡이를 탭하면 click이 bs-head로 가 버려 탭이 먹지 않았어요.
  // 여기선 손잡이 위에서 누르고 안 움직였으면 pointerup에서 탭으로 처리하고, 혹시 뒤따르는 click은 한 번 무시해요.
  const down = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current
    s.startY = e.clientY; s.startT = s.y; s.moved = false
    s.onGrab = !!grab.current?.contains(e.target as Node)
    sh.current?.classList.add('drag')
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent) => {
    const s = st.current
    if (s.startY === null) return
    const dy = e.clientY - s.startY
    if (Math.abs(dy) > 5) s.moved = true
    const p = snaps()
    setY(Math.max(p.full - 10, Math.min(p.peek + 30, s.startT + dy)))
  }
  const end = (e: PointerEvent) => {
    const s = st.current
    if (s.startY === null) return
    s.startY = null
    sh.current?.classList.remove('drag')
    const suppressNextClick = () => { s.suppress = true; setTimeout(() => { s.suppress = false }, 0) }
    if (!s.moved) {
      if (s.onGrab && e.type === 'pointerup') { suppressNextClick(); setState(ORDER[(ORDER.indexOf(s.state) + 1) % 3], '탭') }
      else setY(snaps()[s.state])
      return
    }
    suppressNextClick()
    const p = snaps()
    const near = ORDER.reduce((a, b) => (Math.abs(p[b] - s.y) < Math.abs(p[a] - s.y) ? b : a))
    setState(near, '가장 가까운 단계로 착')
  }
  const tapGrab = () => {
    const s = st.current
    if (s.suppress) { s.suppress = false; return }
    setState(ORDER[(ORDER.indexOf(s.state) + 1) % 3], '탭')
  }

  const demo = useDemo({
    reset() { st.current.suppress = false; setState('peek'); setLog(<>손잡이를 <b>탭하거나 끌어올리기</b></>) },
    async play(c) {
      await c.press(dev.current, grab.current); await c.sleep(1100)
      await c.press(dev.current, grab.current); await c.sleep(1200)
      await c.press(dev.current, grab.current); await c.sleep(600)
    },
  })

  return (
    <Card id="t-sheet" num="09" title="시트 확장" en="Sheet Expand" desc="하단 시트를 끌어올리면 미리보기 → 절반 → 전체로 단계별로 펼쳐져요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="map">
            <span className="pin" style={{ left: 40, top: 90 }} />
            <span className="pin" style={{ left: 160, top: 140 }} />
            <span className="pin main" style={{ left: 100, top: 180 }} />
            <span className="pin" style={{ left: 60, top: 250 }} />
          </div>
          <div className="bsheet" ref={sh}>
            <div className="bs-head" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
              <button className="grabber" ref={grab} aria-label="시트 펼치기" onClick={tapGrab} />
              <h4>와플 로스터리</h4>
              <div className="muted">카페 · ★ 4.7 · 도보 6분</div>
            </div>
            <div className="bs-body">
              <div style={{ display: 'flex', gap: 6 }}><button className="btn sm" style={{ flex: 1 }}>길찾기</button><button className="btn ghost sm" style={{ flex: 1 }}>저장</button></div>
              <div className="photos"><span className="g1" /><span className="g3" /><span className="g2" /></div>
              <div className="info-row">🕘 영업 중 · 22:00에 영업 종료</div>
              <div className="info-row">📍 서울 성동구 성수이로 00</div>
              <div className="info-row">☎ 02-000-0000</div>
              <div className="info-row">💬 리뷰 312개</div>
            </div>
          </div>
          <div className="mscrim" ref={scrim} />
        </Device>
      </Stage>
      <Info
        spec={[['단계', 'Peek · Half · Full'], ['시간', '420ms'], ['이징', 'Spring']]}
        usage={[['언제', '지도 위 장소 정보, 음악 플레이어, 길찾기 경로처럼 배경을 보면서 정보를 늘려갈 때'], ['규칙', '손을 놓으면 가장 가까운 단계로 착 붙어야 해요']]}
      />
    </Card>
  )
}
