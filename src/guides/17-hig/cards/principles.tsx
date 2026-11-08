import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as RMouseEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Range, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { HSeg, Icon, clamp, pulse, segBtn, useStateRef, vars, vibrate } from '../shared'

/* ---------- 01 명료함 ---------- */
const SZ: [string, number][] = [['아주 작게', 0.85], ['작게', 0.92], ['기본', 1], ['크게', 1.15], ['더 크게', 1.32], ['최대 · 손쉬운 사용', 1.6]]

export function Clarity() {
  const [mode, setMode] = useState<'deco' | 'clear'>('clear')
  const [size, setSize] = useState(2)
  const seg = useRef<HTMLDivElement>(null)
  const [n, s] = SZ[size]
  const log: ReactNode = mode === 'clear'
    ? <>텍스트 크기 <b>{n}</b> — 줄이 늘어나며 끝까지 읽혀요</>
    : <>텍스트 크기 <b>{n}</b> — {size > 2 ? '고정 높이에 글자가 잘리고 흐려요' : '장식에 묻혀 핵심이 안 보여요 · 아이콘 뜻도 모호해요'}</>

  const demo = useDemo({
    reset() { setMode('clear'); setSize(2) },
    async play(c) {
      for (const v of [3, 4, 5]) { setSize(v); await c.sleep(650) }
      await c.sleep(500)
      await c.press(seg.current, segBtn(seg.current, 'deco')); await c.sleep(1700)
      await c.press(seg.current, segBtn(seg.current, 'clear')); await c.sleep(900)
      setSize(2)
    },
  })

  return (
    <Card id="hig-clarity" num="01" title="명료함" en="Clarity" demo={demo}
      desc="어떤 크기에서도 읽히는 글자와 뜻이 하나로 읽히는 아이콘. 장식은 덜고 기능에 집중해요.">
      <Stage log={log}>
        <div className="box left hig-cl-box">
          <HSeg ref={seg} id="hig-cl-seg" value={mode} onChange={setMode} options={[['deco', '장식 많음'], ['clear', '명료함']]} />
          <div className={'hig-cl-scr' + (mode === 'deco' ? ' deco' : '')} id="hig-cl-scr" style={vars({ '--ts': s })}>
            <div className="hig-cl-h">오늘 할 일</div>
            <div className="hig-cl-row"><i className="hig-cl-ic">✓</i><span className="hig-cl-t">디자인 리뷰 자료 정리하기<small>오전 10:00 · 업무</small></span></div>
            <div className="hig-cl-row"><i className="hig-cl-ic o">☏</i><span className="hig-cl-t">병원에 예약 전화하기<small>오후 2:30 · 개인</small></span></div>
            <div className="hig-cl-row"><i className="hig-cl-ic g">✉</i><span className="hig-cl-t">팀에 회의록 메일 보내기<small>오후 5:00 · 업무</small></span></div>
          </div>
          <div className="hig-cl-size">
            <span style={{ fontSize: 13 }}>가</span>
            <Range value={size} min={0} max={5} onChange={setSize} label="텍스트 크기" />
            <span style={{ fontSize: 20 }}>가</span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['서체', 'SF Pro · Apple SD 산돌고딕'], ['단위', 'pt'], ['원칙', '장식 ↓ 기능 ↑']]}
        usage={[
          ['언제', '모든 화면의 기본이에요. 사용자가 글자를 키우면 줄이 늘어나고 자르지 않아요.'],
          ['주의', '그라데이션·그림자·장식 서체는 정보를 가려요. 높이를 고정하면 큰 글자가 잘려요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 존중 ---------- */
const DF_INIT: ReactNode = <>사진을 <b>탭</b>해서 바를 숨기고 다시 꺼내보세요</>
const DF_BTNS: [string, string][] = [['공유', 'share'], ['좋아요', 'heart'], ['정보', 'info'], ['삭제', 'trash']]

export function Deference() {
  const [mode, setMode] = useState<'defer' | 'loud'>('defer')
  const [hidden, setHidden] = useState(false)
  const [liked, setLiked] = useState(false)
  const [log, setLog] = useState<ReactNode>(DF_INIT)
  const dev = useRef<HTMLDivElement>(null)
  const photo = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)

  const hide = (h: boolean) => {
    setHidden(h)
    setLog(h ? <><b>크롬 숨김</b> — 사진만 화면 가득. 다시 탭하면 돌아와요</> : <><b>반투명 바</b> — 사진 색이 바 뒤로 은은하게 비쳐요</>)
  }
  const onDevClick = (e: RMouseEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('button') || t.closest('.hig-df-top, .hig-df-bot')) return
    if (mode === 'loud') { setLog(<>배너·광고·불투명 바가 <b>사라지지 않아요</b> — 사진은 뒷전이에요</>); return }
    hide(!hidden)
  }
  const changeMode = (v: 'defer' | 'loud') => {
    setMode(v); setHidden(false)
    setLog(v === 'loud' ? <>로고·배너·광고가 <b>사진보다 먼저</b> 눈에 들어와요</> : <><b>UI가 물러나고</b> 사진이 주인공이 돼요</>)
  }

  const demo = useDemo({
    reset() { setMode('defer'); setHidden(false); setLog(DF_INIT) },
    async play(c) {
      await c.press(dev.current, photo.current); await c.sleep(1600)
      await c.press(dev.current, photo.current); await c.sleep(1000)
      await c.press(seg.current, segBtn(seg.current, 'loud')); await c.sleep(1800)
      await c.press(seg.current, segBtn(seg.current, 'defer')); await c.sleep(500)
    },
  })

  return (
    <Card id="hig-defer" num="02" title="존중" en="Deference" demo={demo}
      desc="UI는 콘텐츠를 가리지 않고 한 발 물러나요. 사진이 주인공이면 바는 반투명하게, 필요 없으면 숨겨요.">
      <Stage log={log}>
        <div className={'device hig-df-dev' + (hidden ? ' immersive' : '') + (mode === 'loud' ? ' loud' : '')} id="hig-df-dev" ref={dev} onClick={onDevClick}>
          <div className="hig-photo" id="hig-df-photo" ref={photo} role="img" aria-label="노을 진 호수 사진"><i className="sun" /><i className="m1" /><i className="m2" /><i className="rf" /></div>
          <div className="hig-df-top hig-blur">
            <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
            <div className="hig-df-promo">⭐ 프로 버전 무료 체험 시작하기!</div>
            <div className="hig-df-nav">
              <button>‹ 앨범</button>
              <div className="hig-df-ttl" id="hig-df-ttl">{mode === 'loud' ? 'MY GALLERY PRO' : <>11월 8일<small>오후 5:12</small></>}</div>
              <button>편집</button>
            </div>
          </div>
          <div className="hig-df-ad">📢 사진 인화 50% 할인 · 지금 주문하세요 <span style={{ marginLeft: 'auto' }}>✕</span></div>
          <div className="hig-df-bot hig-blur" id="hig-df-bot">
            {DF_BTNS.map(([n, ic]) => (
              <button key={n} aria-label={n} className={n === '좋아요' && liked ? 'on' : undefined}
                onClick={() => { if (n === '좋아요') setLiked(l => !l); setLog(<><b>{n}</b> — 바는 필요할 때만 꺼내 쓰는 도구예요</>) }}>
                <Icon name={ic} />
              </button>
            ))}
          </div>
        </div>
        <HSeg ref={seg} id="hig-df-seg" value={mode} onChange={changeMode} options={[['defer', '존중 · 물러나는 UI'], ['loud', '방해 · 앞에 나서는 UI']]} />
      </Stage>
      <Info
        spec={[['크롬', '반투명 · 탭하면 숨김'], ['주인공', '콘텐츠']]}
        usage={[
          ['언제', '사진·영상·지도·문서처럼 콘텐츠 자체를 보는 화면'],
          ['주의', '로고·배너·불투명한 큰 바는 콘텐츠의 자리를 빼앗아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 깊이 ---------- */
type Mat = 'blur' | 'clear' | 'solid'
const DP_MSG: Record<Mat, ReactNode> = {
  blur: <><b>반투명 블러</b> — 뒤 색이 은은하게 비쳐 ‘어디 위에 떠 있는지’ 알 수 있어요</>,
  clear: <><b>블러 없음</b> — 뒤 글자·사진과 겹쳐 시트 내용이 안 읽혀요</>,
  solid: <><b>불투명</b> — 읽기는 쉽지만 뒤 화면과의 연결감이 끊겨요</>,
}
const DP_INIT: ReactNode = <>시트를 열고 <b>재질</b>을 바꿔 계층감을 비교해보세요</>

export function Depth() {
  const [lv, setLv, lvRef] = useStateRef(0)
  const [mat, setMat] = useState<Mat>('blur')
  const [log, setLog] = useState<ReactNode>(DP_INIT)
  const dev = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)

  const setL = (n: number) => {
    const v = clamp(n, 0, 2)
    setLv(v)
    setLog(v === 0 ? <>시트가 내려가고 <b>원래 화면</b>이 다시 앞으로 와요</>
      : v === 1 ? <>시트가 떠오르고 <b>뒤 화면은 작아지며 물러나요</b></> : <><b>두 겹</b> — 층이 쌓일수록 아래 층은 더 뒤로 가요</>)
  }
  const changeMat = (v: Mat) => { setMat(v); if (!lvRef.current) setL(1); setLog(DP_MSG[v]) }
  const q = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null

  const demo = useDemo({
    reset() { setL(0); setMat('blur'); setLog(DP_INIT) },
    async play(c) {
      await c.press(dev.current, q('#hig-dp-open')); await c.sleep(1100)
      await c.press(dev.current, q('#hig-dp-more')); await c.sleep(1300)
      await c.press(seg.current, segBtn(seg.current, 'clear')); await c.sleep(1500)
      await c.press(seg.current, segBtn(seg.current, 'solid')); await c.sleep(1400)
      await c.press(seg.current, segBtn(seg.current, 'blur')); await c.sleep(900)
      await c.press(dev.current, q('#hig-dp-c2')); await c.sleep(600)
      await c.press(dev.current, q('#hig-dp-c1')); await c.sleep(400)
    },
  })

  return (
    <Card id="hig-depth" num="03" title="깊이" en="Depth" demo={demo}
      desc="반투명 블러와 레이어 겹침, 자연스러운 전환으로 ‘무엇이 무엇 위에 있는지’ 계층을 보여줘요.">
      <Stage log={log}>
        <div className={'device black hig-dp-dev m-' + mat + (lv === 1 ? ' l1' : lv === 2 ? ' l2' : '')} id="hig-dp-dev" ref={dev}>
          <div className="statusbar light"><span>9:41</span><span>●●● 100%</span></div>
          <div className="scr hig-dp-base" id="hig-dp-base"
            onClick={e => { if (lvRef.current > 0 && !(e.target as HTMLElement).closest('#hig-dp-open')) setL(lvRef.current - 1) }}>
            <div className="hig-dp-ttl">둘러보기</div>
            <div className="hig-dp-tiles">
              <span className="g1">노을 바다</span><span className="g2">새벽 호수</span><span className="g3">여름 숲</span><span className="g4">벚꽃길</span>
              <span className="g2">겨울 산</span><span className="g1">사막 길</span><span className="g4">꽃 시장</span><span className="g3">계곡</span>
            </div>
            <button className="btn sm hig-dp-open" id="hig-dp-open" onClick={e => { e.stopPropagation(); setL(1) }}>⬆ 공유 시트 열기</button>
          </div>
          <div className={'hig-dp-sheet' + (lv >= 1 ? ' on' : '')} id="hig-dp-s1">
            <button className="grabber" aria-label="시트" />
            <div className="hig-dp-hd"><span>공유</span><button id="hig-dp-c1" onClick={() => setL(0)}>완료</button></div>
            <div className="hig-dp-people">
              <span><i className="g1" />김디자</span><span><i className="g2" />박기획</span><span><i className="g3" />이개발</span><span><i className="g4" />정와플</span>
            </div>
            <div className="hig-dp-grp">
              <div>사진 복사<span>⧉</span></div><div>앨범에 추가<span>＋</span></div>
              <button id="hig-dp-more" onClick={() => setL(2)}>옵션 더 보기 <span>›</span></button>
            </div>
          </div>
          <div className={'hig-dp-sheet' + (lv >= 2 ? ' on' : '')} id="hig-dp-s2">
            <button className="grabber" aria-label="시트" />
            <div className="hig-dp-hd"><span>옵션</span><button id="hig-dp-c2" onClick={() => setL(1)}>완료</button></div>
            <div className="hig-dp-grp"><div>위치 정보 포함<span>켬</span></div><div>원본 화질<span>켬</span></div><div>모든 사진 데이터<span>끔</span></div></div>
          </div>
        </div>
        <HSeg ref={seg} id="hig-dp-seg" value={mat} onChange={changeMat} options={[['blur', '반투명 블러'], ['clear', '블러 없음'], ['solid', '불투명']]} />
      </Stage>
      <Info
        spec={[['입체감', '반투명 블러 + 레이어 겹침'], ['뒤 화면', '작아지며 물러남']]}
        usage={[
          ['언제', '시트·메뉴·바처럼 콘텐츠 위에 잠깐 떠 있는 층'],
          ['주의', '블러 없는 투명은 글자가 겹쳐 안 읽히고, 불투명은 뒤 맥락이 끊겨요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 하드웨어와의 일체감 ---------- */
const TOTAL = 30
const fmtT = (s: number) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
const HW_INIT: ReactNode = <><b>시작</b>을 누르면 타이머가 아일랜드로 들어가요</>
type Isl = '' | 'c' | 'e'

export function Hardware() {
  const m = useMotion()
  const timers = useTimers()
  const [left, setLeft, leftRef] = useStateRef(TOTAL)
  const [running, setRunning, runRef] = useStateRef(false)
  const [active, setActive, activeRef] = useStateRef(false)
  const [isl, setIsl, islRef] = useStateRef<Isl>('')
  const [doneMsg, setDoneMsg] = useState(false)
  const [r, setR] = useState(11)
  const [log, setLog] = useState<ReactNode>(HW_INIT)
  const dev = useRef<HTMLDivElement>(null)
  const is = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const iv = useRef(0)
  const doneT = useRef(0)
  useEffect(() => () => clearInterval(iv.current), [])

  const stopIv = () => { clearInterval(iv.current); iv.current = 0 }
  const haptic = (el: Element, msg?: ReactNode) => {
    const ok = vibrate(12)
    if (dev.current) {
      pulse(m, dev.current, el)
      m.A(dev.current, [{ transform: 'translateX(0)' }, { transform: 'translateX(-1.5px)' }, { transform: 'translateX(1.5px)' }, { transform: 'translateX(0)' }], 120)
    }
    setLog(msg ?? (ok ? <><b>탁</b> — 손끝에 짧은 진동이 전해졌어요</> : <><b>탁</b> — 이 기기는 진동을 지원하지 않아 화면 반응만 보여요 (아이폰에선 탭틱 엔진)</>))
  }
  const run = () => {
    setRunning(true); setActive(true); setDoneMsg(false)
    if (islRef.current !== 'e') setIsl('c')
    stopIv()
    iv.current = window.setInterval(() => {
      const l = Math.max(0, leftRef.current - 1)
      setLeft(l)
      if (l === 0) {
        stopIv(); setRunning(false); setActive(false)
        setIsl('e'); setDoneMsg(true)
        if (is.current) haptic(is.current, <>타이머 <b>완료</b> — 아일랜드가 커지며 햅틱으로 알려요</>)
        timers.clear(doneT.current)
        doneT.current = timers.set(() => { setIsl(''); setLeft(TOTAL); setDoneMsg(false) }, m.D(2200))
      }
    }, 1000)
  }
  const pause = () => { setRunning(false); stopIv(); setLog(<><b>일시정지</b> — 아일랜드에 남아 언제든 다시 재개할 수 있어요</>) }
  const cancel = () => {
    stopIv(); timers.clear(doneT.current)
    setRunning(false); setActive(false); setLeft(TOTAL); setIsl(''); setDoneMsg(false)
  }
  const onStart = () => {
    if (runRef.current) pause()
    else {
      timers.clear(doneT.current)
      if (leftRef.current === 0) setLeft(TOTAL)
      run()
      setLog(<>타이머가 <b>아일랜드 안으로</b> — 카메라 영역이 살아있는 상태 표시가 돼요</>)
    }
  }
  const toggleIsland = () => {
    if (!activeRef.current) { setLog(<>실행 중인 활동이 없으면 <b>카메라 영역</b>으로만 보여요 — 먼저 시작을 눌러요</>); return }
    const toE = islRef.current !== 'e'
    setIsl(toE ? 'e' : 'c')
    setLog(toE ? <>아일랜드가 <b>펼쳐져</b> 남은 시간과 버튼을 보여줘요</> : <>다시 <b>작게</b> — 화면을 가리지 않아요</>)
  }
  const onIsKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleIsland() } }
  const changeR = (v: string) => {
    const n = +v; setR(n)
    setLog(n === 11 ? <><b>동심원</b> — 두 곡선의 중심이 겹쳐 여백 폭이 고르게 보여요</>
      : n === 23 ? <><b>같은 R</b> — 안쪽이 너무 둥글어 모서리 여백이 두꺼워 보여요</> : <><b>직각</b> — 둥근 화면 안에서 모서리가 툭 튀어나와 보여요</>)
  }
  const q = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
  const t = fmtT(left)

  const demo = useDemo({
    reset() { cancel(); setR(11); setLog(HW_INIT) },
    async play(c) {
      await c.press(dev.current, q('#hig-hw-start')); await c.sleep(1500)
      await c.press(dev.current, is.current); await c.sleep(1600)
      await c.press(dev.current, is.current); await c.sleep(900)
      await c.press(dev.current, q('#hig-hw-cancel')); await c.sleep(700)
      await c.press(seg.current, segBtn(seg.current, '23')); await c.sleep(1300)
      await c.press(seg.current, segBtn(seg.current, '2')); await c.sleep(1300)
      await c.press(seg.current, segBtn(seg.current, '11')); await c.sleep(1100)
      await c.press(dev.current, q('#hig-hw-tap')); await c.sleep(500)
    },
  })

  return (
    <Card id="hig-hw" num="04" title="하드웨어와의 일체감" en="Hardware Harmony" demo={demo}
      desc="다이내믹 아일랜드, 화면 모서리 곡률, 햅틱까지 기기와 소프트웨어가 한 몸처럼 느껴지게 해요.">
      <Stage log={log}>
        <div className="device hig-hw-dev" id="hig-hw-dev" ref={dev}>
          <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
          <div className={'hig-island' + (isl ? ' ' + isl : '')} id="hig-hw-is" ref={is} role="button" tabIndex={0} aria-label="다이내믹 아일랜드"
            onClick={e => { if ((e.target as HTMLElement).closest('button')) return; toggleIsland() }} onKeyDown={onIsKey}>
            <div className="hig-is-c"><span>⏱</span><span className="hig-is-r" id="hig-hw-isr">{t}</span></div>
            <div className="hig-is-x">
              <div className="hig-is-row"><span>⏱ 타이머</span><b id="hig-hw-isx">{doneMsg ? '완료!' : t}</b></div>
              <div className="hig-is-btns">
                <button id="hig-hw-ispause" aria-label="일시정지"
                  onClick={() => { if (runRef.current) pause(); else if (activeRef.current) { run(); setLog(<>아일랜드에서 바로 <b>재개</b></>) } }}>{running ? '❚❚' : '▶'}</button>
                <button className="stop" id="hig-hw-isstop" aria-label="종료"
                  onClick={() => { cancel(); setLog(<>아일랜드에서 <b>종료</b> — 앱을 열지 않고도 제어해요</>) }}>✕</button>
              </div>
            </div>
          </div>
          <div className="scr hig-hw-scr">
            <div className="hig-hw-ttl">타이머</div>
            <div className="hig-hw-time" id="hig-hw-time">{t}</div>
            <div className="hig-hw-btns">
              <button className="hig-round" id="hig-hw-cancel" onClick={() => { cancel(); setLog(<><b>취소</b> — 활동이 없으면 아일랜드는 작은 알약으로 돌아가요</>) }}>취소</button>
              <button className={'hig-round go' + (running ? ' pause' : '')} id="hig-hw-start" onClick={onStart}>{running ? '일시정지' : active ? '재개' : '시작'}</button>
            </div>
            <span className="hig-hw-c c1" /><span className="hig-hw-c c2" id="hig-hw-c2" style={{ left: 12 + r, bottom: 12 + r }} />
            <div className="hig-hw-wid hig-blur" id="hig-hw-wid" style={{ borderRadius: r }}>
              <div className="hig-hw-wrow"><b>햅틱 피드백</b><span id="hig-hw-r">{r === 11 ? '23 − 12 = 11 ✓' : 'r ' + r + (r === 23 ? ' (바깥과 같음)' : ' (직각)')}</span></div>
              <button className="hig-hw-tap" id="hig-hw-tap" onClick={e => haptic(e.currentTarget)}>탁! 눌러보기</button>
            </div>
          </div>
        </div>
        <HSeg ref={seg} id="hig-hw-seg" value={String(r)} onChange={changeR} options={[['11', '동심원 ✓'], ['23', '같은 R'], ['2', '직각']]} />
        <div className="hig-hw-legend">
          <span><i style={{ background: 'var(--b)' }} />화면 모서리 중심</span>
          <span><i style={{ background: 'var(--accent)' }} />카드 모서리 중심</span>
        </div>
      </Stage>
      <Info
        spec={[['모서리', '안쪽 R = 바깥 R − 여백'], ['햅틱', '탁 · 짧고 가볍게']]}
        usage={[
          ['언제', '카메라 영역을 살아있는 상태 표시로 쓰고, 화면 곡률에 맞춰 카드 모서리를 깎아요.'],
          ['주의', '두 곡선의 중심이 어긋나면 모서리 폭이 들쭉날쭉해 보여요. 햅틱은 의미 있는 순간에만.'],
        ]}
      />
    </Card>
  )
}
