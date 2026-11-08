import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { Ic, MdSeg, useWinDrag, type IconName } from '../shared'

const q = (root: HTMLElement | null, sel: string) => root?.querySelector<HTMLElement>(sel) ?? null

/* ---------- 04 FAB ---------- */
const MAIL = [['민지', '회의록 공유드려요'], ['서준', '주말 등산 어때요?'], ['하은', '시안 2차 피드백'], ['도윤', '택배 도착 알림'], ['지우', '청첩장 보내드려요'], ['예린', '스터디 자료'], ['시우', '견적서 확인 부탁'], ['유나', '사진 보내요 📷'], ['준호', '다음 주 일정'], ['수아', '감사 인사드려요'], ['현우', '계약서 초안'], ['채원', '오늘 저녁 메뉴'], ['태윤', '출장 보고'], ['서연', '생일 축하해!']]
const AV = ['#ffd8a8', '#c5f6fa', '#d0bfff', '#b2f2bb', '#ffc9c9', '#ffec99']
type FabT = 's' | 'm' | 'l' | 'x'
const FAB_NAMES: Record<FabT, string> = { s: 'Small FAB', m: 'FAB', l: 'Large FAB', x: 'Extended FAB' }
const FAB_MSG: Record<FabT, string> = {
  s: '작은 화면이나 보조 위치에 써요', l: '핵심 동작을 크게 강조할 때 써요',
  x: '아이콘 + 글자로 동작을 분명히 알려요. 아래로 스크롤해 보세요', m: '가장 흔한 기본 크기예요',
}

export function Fab() {
  const [type, setType] = useState<FabT>('m')
  const [shrink, setShrink] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>크기를 바꾸고, <b>Extended</b>에서 목록을 스크롤해 보세요</>)
  const dev = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const fab = useRef<HTMLButtonElement>(null)
  const lastY = useRef(0)

  const set = (v: FabT) => { setType(v); setShrink(false); setLog(<><b>{FAB_NAMES[v]}</b> — {FAB_MSG[v]}</>) }
  const onScroll = () => {
    const el = list.current
    if (!el) return
    const y = el.scrollTop, dy = y - lastY.current
    if (type === 'x' && Math.abs(dy) > 3) {
      const s = dy > 0 && y > 8
      if (s !== shrink) {
        setShrink(s)
        setLog(s ? <>아래로 스크롤 → <b>아이콘만</b> 남겨 내용을 덜 가려요</> : <>위로 스크롤 → <b>글자</b>가 다시 펼쳐져요</>)
      }
    }
    lastY.current = y
  }

  const demo = useDemo({
    reset() { set('m'); if (list.current) list.current.scrollTop = 0; lastY.current = 0 },
    async play(c) {
      const seg = q(dev.current?.closest<HTMLElement>('.t-stage') ?? null, '.md-seg')
      for (const v of ['s', 'm', 'l', 'x']) { await c.press(seg, q(seg, 'button[data-v="' + v + '"]')); await c.sleep(1000) }
      list.current?.scrollTo({ top: 220, behavior: 'smooth' }); await c.sleep(1300)
      list.current?.scrollTo({ top: 0, behavior: 'smooth' }); await c.sleep(1100)
      await c.press(dev.current, fab.current)
    },
  })

  return (
    <Card id="material-fab" num="04" title="플로팅 액션 버튼" en="FAB"
      desc="화면 우측 하단에 떠서, 그 화면의 가장 중요한 동작 하나를 맡아요." demo={demo}>
        <Stage log={log}>
          <MdSeg value={type} onChange={set} options={[['s', 'Small'], ['m', 'FAB'], ['l', 'Large'], ['x', 'Extended']]} />
          <Device ref={dev}>
            <div className="scr">
              <div className="md-appbar">
                <button className="md-ib" data-rip="u" aria-label="메뉴"><Ic n="menu" /></button>
                <span className="md-ab-t">받은편지함</span>
                <button className="md-ib" data-rip="u" aria-label="검색"><Ic n="search" /></button>
              </div>
              <div className="md-scroll" ref={list} onScroll={onScroll}>
                {MAIL.map((m, i) => (
                  <div key={i} className="md-mail md-sl" data-rip="">
                    <span className="md-av" style={{ background: AV[i % 6], color: '#333' }}>{m[0][0]}</span>
                    <div><b>{m[0]}</b><span>{m[1]} — 내용 미리보기가 여기에 이어져요</span></div>
                  </div>
                ))}
              </div>
              <button ref={fab} className={'md-fab' + (type !== 'm' ? ' ' + type : '') + (shrink ? ' shrink' : '')} data-rip=""
                aria-label={type === 'x' ? undefined : '편지 쓰기'}
                onClick={() => setLog(<>✎ 핵심 동작 <b>편지 쓰기</b> 실행 — 화면당 하나만 둬요</>)}>
                <Ic n="edit" /><span className="md-fab-lbl">편지 쓰기</span>
              </button>
            </div>
          </Device>
        </Stage>
      <Info
        spec={[['위치', '우측 하단'], ['종류', 'Small · 기본 · Large · Extended']]}
        usage={[
          ['언제', '메일 쓰기, 새 일정처럼 그 화면에서 가장 많이 하는 핵심 동작 하나에만 써요.'],
          ['주의', '한 화면에 FAB 여러 개는 금물이에요. Extended는 아래로 스크롤하면 아이콘만 남겨 내용을 덜 가려요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 Navigation Drawer ---------- */
const DRW: [string, IconName, string][] = [['받은편지함', 'mail', '24'], ['별표편지함', 'star', '3'], ['보낸편지함', 'send', ''], ['임시보관함', 'edit', '1'], ['여행', 'place', ''], ['업무', 'event', '']]

export function Drawer() {
  const m = useMotion()
  const timers = useTimers()
  const drag = useWinDrag()
  const [open, setOpenS] = useState(false)
  const [sel, setSel] = useState(0)
  const [log, setLog] = useState<ReactNode>(<><b>☰</b>을 누르거나 화면 <b>왼쪽 끝에서 끌어</b> 열어보세요</>)
  const dev = useRef<HTMLDivElement>(null)
  const drw = useRef<HTMLElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const openB = useRef<HTMLButtonElement>(null)
  const moved = useRef(false)
  const openRef = useRef(open)
  openRef.current = open

  const set = (on: boolean) => {
    setOpenS(on); openRef.current = on
    drw.current?.classList.toggle('on', on); scrim.current?.classList.toggle('on', on)
    if (drw.current) drw.current.style.transform = ''
  }
  const W = () => drw.current?.offsetWidth ?? 1

  const onDrwDown = (e: PointerEvent) => {
    const d = drw.current, s = scrim.current
    if (!openRef.current || !d || !s) return
    const x0 = e.clientX
    let dx = 0
    moved.current = false
    drag(ev => {
      dx = Math.min(0, ev.clientX - x0)
      if (Math.abs(dx) > 6) { moved.current = true; d.classList.add('drag'); d.style.transform = 'translateX(' + dx + 'px)'; s.style.opacity = String(1 + dx / W()) }
    }, () => {
      d.classList.remove('drag'); s.style.opacity = ''
      if (moved.current) { const close = dx < -W() * 0.3; set(!close); if (close) setLog(<><b>왼쪽으로 밀어</b> 닫았어요</>) }
      timers.set(() => { moved.current = false }, 0)
    })
  }
  const onEdgeDown = (e: PointerEvent) => {
    const d = drw.current, s = scrim.current
    if (openRef.current || !d || !s) return
    e.preventDefault()
    const x0 = e.clientX
    let dx = 0
    d.classList.add('drag'); s.classList.add('on')
    drag(ev => {
      dx = Math.max(0, Math.min(W(), ev.clientX - x0))
      d.style.transform = 'translateX(' + (dx - W()) + 'px)'; s.style.opacity = String(dx / W())
    }, () => {
      d.classList.remove('drag'); s.style.opacity = ''
      const on = dx > W() * 0.3
      set(on)
      if (on) setLog(<><b>왼쪽 끝에서 끌어</b> 서랍을 열었어요</>)
    })
  }
  const pick = (i: number) => {
    if (moved.current) return
    setSel(i)
    timers.set(() => set(false), m.D(160))
    setLog(<><b>{DRW[i][0]}</b>(으)로 이동 — 선택 표시는 알약 모양 인디케이터예요</>)
  }
  const item = (i: number) => (
    <button key={i} className={'md-drw-it' + (i === sel ? ' on' : '')} data-rip="" data-v={DRW[i][0]} onClick={() => pick(i)}>
      <Ic n={DRW[i][1]} /><span>{DRW[i][0]}</span><em>{DRW[i][2]}</em>
    </button>
  )

  const demo = useDemo({
    reset() { set(false); setSel(0) },
    async play(c) {
      await c.press(dev.current, openB.current); await c.sleep(1000)
      await c.press(dev.current, drw.current?.querySelectorAll<HTMLElement>('.md-drw-it')[1] ?? null); await c.sleep(1200)
      await c.press(dev.current, openB.current); await c.sleep(900)
      await c.press(dev.current, scrim.current)
    },
  })

  return (
    <Card id="material-drawer" num="05" title="내비게이션 드로어" en="Navigation Drawer"
      desc="화면 왼쪽 끝에서 서랍처럼 꺼내 쓰는 메뉴예요. 뒤는 반투명 막(스크림)으로 가려요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="md-appbar">
              <button className="md-ib" data-rip="u" ref={openB} aria-label="메뉴 열기" aria-expanded={open}
                onClick={() => { set(true); setLog(<>서랍이 <b>왼쪽에서</b> 나왔어요 — 바깥을 누르거나 왼쪽으로 밀면 닫혀요</>) }}><Ic n="menu" /></button>
              <span className="md-ab-t">{DRW[sel][0]}</span>
              <button className="md-ib" data-rip="u" aria-label="검색"><Ic n="search" /></button>
            </div>
            <div className="pad">
              <div className="md-ph" style={{ height: 72 }} />
              <div className="fake-line" style={{ width: '70%' }} /><div className="fake-line" /><div className="fake-line" style={{ width: '55%' }} />
              <div className="md-ph" style={{ height: 72 }} />
              <div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" style={{ width: '80%' }} />
            </div>
            <div className="md-edge" aria-hidden="true" onPointerDown={onEdgeDown} />
            <div className={'md-scrim' + (open ? ' on' : '')} ref={scrim}
              onClick={() => { set(false); setLog(<><b>스크림</b>을 눌러 닫았어요</>) }} />
            <nav className={'md-drw' + (open ? ' on' : '')} ref={drw} aria-label="메일 메뉴" onPointerDown={onDrwDown}>
              <div className="md-drw-h">메일</div>
              {[0, 1, 2, 3].map(item)}
              <hr />
              <div className="md-drw-h" style={{ paddingTop: 2 }}>라벨</div>
              {[4, 5].map(item)}
            </nav>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['위치', '왼쪽 끝'], ['닫기', '스크림 탭 · 왼쪽으로 밀기']]}
        usage={[
          ['언제', '메일함·라벨처럼 목적지가 많거나, 자주 오가지 않는 메뉴를 담을 때 좋아요.'],
          ['주의', '숨겨져 있어서 덜 발견돼요. 자주 쓰는 3~4개는 하단 바나 레일로 꺼내 둬요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 Navigation Rail ---------- */
type RlMode = 'phone' | 'tab' | 'desk'
const RL_MSG: Record<RlMode, ReactNode> = {
  phone: <><b>휴대폰</b> — 엄지가 닿는 하단 <b>Navigation bar</b></>,
  tab: <><b>태블릿</b> — 왼쪽 세로로 얇은 <b>Navigation Rail</b></>,
  desk: <><b>데스크톱</b> — 글자까지 보이는 <b>Navigation Drawer</b>(고정형)</>,
}
const RL: [string, IconName][] = [['메일', 'mail'], ['채팅', 'chat'], ['회의', 'event'], ['사람', 'person']]

export function Rail() {
  const [mode, setModeS] = useState<RlMode>('tab')
  const [sel, setSel] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>기기 폭을 바꿔 <b>내비게이션이 변하는 모습</b>을 보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const win = useRef<HTMLDivElement>(null)
  const setMode = (v: RlMode) => { setModeS(v); setLog(RL_MSG[v]) }

  const demo = useDemo({
    reset() { setMode('phone') },
    async play(c) {
      const seg = q(box.current, '.md-seg')
      await c.sleep(700)
      await c.press(seg, q(seg, 'button[data-v="tab"]')); await c.sleep(1300)
      await c.press(seg, q(seg, 'button[data-v="desk"]')); await c.sleep(1300)
      await c.press(win.current, win.current?.querySelectorAll<HTMLElement>('.md-rl-it')[2] ?? null); await c.sleep(900)
      await c.press(seg, q(seg, 'button[data-v="tab"]'))
    },
  })

  return (
    <Card id="material-rail" num="06" title="내비게이션 레일" en="Navigation Rail"
      desc="태블릿·데스크톱 왼쪽에 세로로 놓이는 얇은 메뉴예요. 화면 폭에 따라 바 → 레일 → 드로어로 바뀌어요." demo={demo}>
      <Stage log={log}>
        <div className="box left" ref={box}>
          <MdSeg value={mode} onChange={setMode} options={[['phone', '휴대폰'], ['tab', '태블릿'], ['desk', '데스크톱']]} />
          <div className="md-rl">
            <div className={'md-rl-win m-' + mode} ref={win}>
              <nav className="md-rl-nav">
                <button className="md-rl-fab" data-rip="" aria-label="새로 만들기"
                  onClick={() => setLog(<>레일 맨 위의 <b>FAB</b> — 핵심 동작 자리도 함께 옮겨와요</>)}><Ic n="edit" /><b>새로 만들기</b></button>
                {RL.map(([t, ic], i) => (
                  <button key={t} className={'md-rl-it' + (i === sel ? ' on' : '')} data-v={t}
                    onClick={() => { setSel(i); setLog(<><b>{t}</b> 선택 — 폭을 바꿔도 선택 상태가 그대로 유지돼요</>) }}>
                    <span className="md-rl-ic md-sl" data-rip=""><Ic n={ic} /></span><span>{t}</span>
                  </button>
                ))}
              </nav>
              <div className="md-rl-main"><b>{RL[sel][0]}</b><div className="md-rl-grid">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div></div>
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['휴대폰', 'Navigation bar'], ['태블릿', 'Rail'], ['데스크톱', 'Drawer']]}
        usage={[
          ['언제', '가로로 넓은 화면에서 하단 바 대신 써요. 엄지 대신 왼쪽 가장자리가 손이 닿는 자리예요.'],
          ['규칙', '형태가 바뀌어도 목적지 순서·아이콘·선택 상태는 그대로 유지해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 Bottom Sheet ---------- */
type BsMode = 'std' | 'modal'
const PEEK = 152
const PINS: [string, string, string, boolean][] = [['카페 온도', '28%', '18%', false], ['내 위치', '56%', '32%', true], ['브루잉 랩', '74%', '12%', false]]
const CAFES: [string, string, string][] = [['☕', '카페 온도', '도보 4분 · ★4.7'], ['🥐', '브루잉 랩', '도보 7분 · ★4.5'], ['🍵', '차 마시는 집', '도보 9분 · ★4.6']]
const SHARES: [IconName, string][] = [['copy', '링크 복사'], ['chat', '메시지'], ['mail', '메일'], ['more', '더보기']]

export function Sheet() {
  const drag = useWinDrag()
  const S = useRef({ mode: 'std' as BsMode, expanded: false, mOpen: false })
  const [v, setV] = useState(S.current)
  const [log, setLog] = useState<ReactNode>(<>Standard 시트는 <b>지도와 함께</b> 조작할 수 있어요</>)
  const dev = useRef<HTMLDivElement>(null)
  const std = useRef<HTMLDivElement>(null)
  const modal = useRef<HTMLDivElement>(null)
  const stdH = useRef<HTMLDivElement>(null)
  const share = useRef<HTMLButtonElement>(null)
  const scrim = useRef<HTMLDivElement>(null)

  const paint = () => {
    const s = S.current
    if (std.current) std.current.style.transform = s.mode !== 'std' ? 'translateY(105%)' : 'translateY(' + (s.expanded ? 0 : PEEK) + 'px)'
    if (modal.current) modal.current.style.transform = s.mOpen ? 'translateY(0)' : 'translateY(105%)'
  }
  const update = (patch: Partial<typeof S.current>) => { S.current = { ...S.current, ...patch }; setV(S.current); paint() }
  useLayoutEffect(paint, [])

  const setModal = (on: boolean) => update({ mOpen: on })
  const setMode = (m: BsMode) => {
    update({ mode: m, mOpen: false, expanded: false })
    setLog(m === 'std' ? <>Standard 시트는 <b>지도와 함께</b> 조작할 수 있어요</> : <><b>공유하기</b>를 눌러 Modal 시트를 열어보세요</>)
  }
  const toggleStd = (expanded: boolean) => {
    update({ expanded })
    setLog(expanded ? <>시트를 <b>펼쳤어요</b> — 그래도 뒤 지도는 막지 않아요</> : <>시트를 <b>접었어요</b> — 손잡이만 살짝 보여요</>)
  }
  const startDrag = (e: PointerEvent, sheet: HTMLElement | null, onMove: (dy: number) => void, onEnd: (dy: number) => void) => {
    if (!sheet) return
    const y0 = e.clientY
    let dy = 0
    sheet.classList.add('drag')
    drag(ev => { dy = ev.clientY - y0; onMove(dy) }, () => { sheet.classList.remove('drag'); onEnd(dy) })
  }
  const onStdDown = (e: PointerEvent) => startDrag(e, std.current, dy => {
    const base = S.current.expanded ? 0 : PEEK
    if (std.current) std.current.style.transform = 'translateY(' + Math.max(0, Math.min(PEEK, base + dy)) + 'px)'
  }, dy => {
    const base = S.current.expanded ? 0 : PEEK
    toggleStd(Math.abs(dy) < 5 ? !S.current.expanded : (base + dy) < PEEK / 2)
  })
  const onModalDown = (e: PointerEvent) => startDrag(e, modal.current, dy => {
    if (modal.current) modal.current.style.transform = 'translateY(' + Math.max(0, dy) + 'px)'
  }, dy => {
    if (dy > 60) { setModal(false); setLog(<><b>아래로 끌어</b> 닫았어요</>) } else setModal(true)
  })

  const demo = useDemo({
    reset() { setMode('std') },
    async play(c) {
      const seg = q(dev.current?.closest<HTMLElement>('.t-stage') ?? null, '.md-seg')
      await c.press(dev.current, stdH.current); await c.sleep(1100)
      await c.press(dev.current, stdH.current); await c.sleep(900)
      await c.press(seg, q(seg, 'button[data-v="modal"]')); await c.sleep(800)
      await c.press(dev.current, share.current); await c.sleep(1300)
      await c.press(dev.current, scrim.current)
    },
  })

  return (
    <Card id="material-sheet" num="07" title="바텀 시트" en="Bottom Sheet"
      desc="아래에서 올라오는 보조 화면이에요. 뒤 화면과 함께 쓰는 Standard, 막고 집중시키는 Modal이 있어요." demo={demo}>
        <Stage log={log}>
          <MdSeg value={v.mode} onChange={setMode} options={[['std', 'Standard'], ['modal', 'Modal']]} />
          <Device ref={dev}>
            <div className="scr">
              <div className="md-appbar"><button className="md-ib" data-rip="u" aria-label="뒤로"><Ic n="back" /></button><span className="md-ab-t">주변 탐색</span></div>
              <div className={'md-bs-area' + (v.mode === 'modal' ? ' is-modal' : '')}>
                <div className="map" />
                {PINS.map(([n, l, t, main]) => (
                  <button key={n} className={'pin' + (main ? ' main' : '')} style={{ left: l, top: t }} data-n={n} aria-label={n}
                    onClick={() => setLog(S.current.mode === 'std' ? <>지도 핀 <b>{n}</b> — Standard 시트가 있어도 지도를 계속 쓸 수 있어요</> : <>지도 핀 <b>{n}</b> 선택</>)} />
                ))}
                <button className="md-btn f md-bs-share" ref={share} data-rip=""
                  onClick={() => { setModal(true); setLog(<><b>Modal</b> — 스크림이 뒤 화면을 막고 이 작업에 집중시켜요</>) }}>
                  <Ic n="share" style={{ width: 18, height: 18 }} />공유하기
                </button>
                <div className="md-bs std" ref={std}>
                  <div className="md-bs-h" ref={stdH} onPointerDown={onStdDown}
                    onClick={e => { if (e.detail === 0) toggleStd(!S.current.expanded) }}>
                    <b>주변 카페 3곳</b><small>핸들을 끌어 올리거나 눌러 펼쳐요</small>
                  </div>
                  {CAFES.map(([e, n, s]) => (
                    <button key={n} className="md-li md-sl" data-rip="" data-n={n}
                      onClick={() => setLog(<><b>{n}</b> 선택 — 시트 안 목록도 바로 눌러 쓸 수 있어요</>)}>
                      <span className="md-av">{e}</span><span>{n}<small>{s}</small></span>
                    </button>
                  ))}
                </div>
                <div className={'md-scrim' + (v.mOpen ? ' on' : '')} ref={scrim}
                  onClick={() => { setModal(false); setLog(<><b>바깥(스크림)</b>을 눌러 닫았어요</>) }} />
                <div className="md-bs modal" ref={modal} role="dialog" aria-label="공유하기">
                  <div className="md-bs-h" onPointerDown={onModalDown}><b>공유하기</b><small>아래로 끌거나 바깥을 누르면 닫혀요</small></div>
                  <div className="md-share">
                    {SHARES.map(([ic, n]) => (
                      <button key={n} data-rip="" data-n={n} onClick={() => { setModal(false); setLog(<><b>{n}</b>(으)로 공유 — 고르면 시트가 바로 닫혀요</>) }}>
                        <Ic n={ic} />{n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Device>
        </Stage>
      <Info
        spec={[['손잡이', 'Drag handle'], ['Modal', '스크림 + 끌어서 닫기']]}
        usage={[
          ['표준', '지도 위 장소 목록처럼 뒤 화면을 계속 보면서 쓰는 보조 정보에 써요.'],
          ['모달', '공유·옵션 선택처럼 잠깐 집중이 필요할 때 써요. 닫는 방법(스크림·끌기·뒤로)을 모두 열어둬요.'],
        ]}
      />
    </Card>
  )
}
