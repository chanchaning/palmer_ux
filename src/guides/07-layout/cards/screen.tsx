import { Fragment, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { GR, Tag, scrollAnim } from '../shared'

/* ---------- 05 고정 헤더 ---------- */
const SETTINGS: [string, [string, string][], boolean][] = [
  ['계정', [['👤', '프로필'], ['🔒', '비밀번호와 보안'], ['💳', '결제 수단']], false],
  ['알림', [['🔔', '푸시 알림'], ['✉', '이메일 알림'], ['🌙', '방해 금지 시간']], true],
  ['일반', [['🎨', '화면 테마'], ['🌐', '언어'], ['💾', '저장 공간'], ['ⓘ', '앱 정보']], false],
]
type FhState = 'top' | 'raised' | 'small'

export function Sticky() {
  const m = useMotion()
  const dev = useRef<HTMLDivElement>(null)
  const sc = useRef<HTMLDivElement>(null)
  const [y, setY] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>폰 안을 <b>아래로 스크롤</b>해 보세요</>)
  const state = useRef<FhState>('top')

  const raised = y > 2, small = y > 34
  const upd = () => {
    const v = sc.current?.scrollTop ?? 0
    setY(v)
    const s: FhState = v > 34 ? 'small' : v > 2 ? 'raised' : 'top'
    if (s !== state.current) {
      state.current = s
      setLog(s === 'top' ? <>맨 위 — 헤더와 내용 사이 <b>경계 없음</b></>
        : s === 'raised' ? <>내용이 헤더 밑으로 — <b>그림자</b>로 층을 나눠요</>
          : <>큰 제목은 접히고 <b>헤더 안 작은 제목</b>으로 바뀌어요</>)
    }
  }

  const demo = useDemo({
    reset() { if (sc.current) sc.current.scrollTop = 0; upd() },
    async play(c) {
      const el = sc.current
      c.tap(dev.current, el)
      await scrollAnim(el, 18, 500, m.D, c.alive); await c.sleep(800)
      await scrollAnim(el, 260, 1000, m.D, c.alive); await c.sleep(1100)
      await scrollAnim(el, 0, 800, m.D, c.alive); await c.sleep(400)
    },
  })

  return (
    <Card id="layout-sticky" num="05" title="고정 헤더" en="Sticky Header"
      desc="내용을 스크롤해도 헤더는 제자리에 남고, 내려가면 그림자로 경계를 보여줘요." demo={demo}>
      <Stage log={log} logId="layout-sticky-log">
        <Device ref={dev}>
          <div className="scr">
            <div className={'bar ly-fh ly-hl' + (raised ? ' raised' : '') + (small ? ' small' : '')}>
              <span className="ly-fh-small">설정</span><Tag style={{ right: 8, top: 13 }}>고정 헤더</Tag>
            </div>
            <div className="ly-scroll" ref={sc} onScroll={upd}>
              <h3 className="ly-large" style={{ opacity: Math.max(0, 1 - y / 40), transform: 'scale(' + Math.max(0.85, 1 - y / 300) + ')' }}>설정</h3>
              <div style={{ padding: '0 12px 4px' }}><div className="ly-search">⌕ 설정 검색</div></div>
              {SETTINGS.map(([g, rows, o]) => (
                <Fragment key={g}>
                  <div className="ly-group">{g}</div>
                  {rows.map(([ic, t]) => <div className="li" key={t}><i className={'ic' + (o ? ' o' : '')}>{ic}</i>{t}<span className="chev">›</span></div>)}
                </Fragment>
              ))}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['위치', '화면 맨 위'], ['역할', '제목·주요 작업 유지'], ['예시', '설정 화면 · 메신저']]}
        usage={[['언제', '긴 목록에서도 제목·검색·뒤로 가기가 늘 필요할 때'], ['주의', '두꺼우면 볼 공간이 줄어요. 큰 제목은 스크롤하면 헤더 안 작은 제목으로 접어요']]}
      />
    </Card>
  )
}

/* ---------- 06 플로팅 버튼 ---------- */
const NAMES = ['하린', '도윤', '서아', '지호', '민준', '예린', '건우', '수아', '시우', '나은', '현우', '다인']
const DIAL: [string, string][] = [['일정', '◷'], ['사진', '▣'], ['글쓰기', '✎']]

export function Fab() {
  const m = useMotion()
  const dev = useRef<HTMLDivElement>(null)
  const sc = useRef<HTMLDivElement>(null)
  const fab = useRef<HTMLButtonElement>(null)
  const dial = useRef<HTMLDivElement>(null)
  const [open, setOpenS] = useState(false)
  const [hidden, setHiddenS] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>스크롤을 <b>내리면 숨고, 올리면</b> 다시 나와요</>)
  const lastY = useRef(0), hiddenR = useRef(false), openR = useRef(false)

  const setOpen = (on: boolean) => { openR.current = on; setOpenS(on) }
  const setHidden = (h: boolean) => {
    if (h === hiddenR.current) return
    hiddenR.current = h; setHiddenS(h)
    setLog(h ? <>↓ 내리는 중 — 내용을 가리지 않게 <b>숨었어요</b></> : <>↑ 올리면 <b>다시 나타나요</b></>)
  }
  const onScroll = () => {
    const y = sc.current?.scrollTop ?? 0, dy = y - lastY.current
    if (Math.abs(dy) > 4) { if (!openR.current) setHidden(dy > 0 && y > 20); lastY.current = y }
  }

  const demo = useDemo({
    reset() {
      setOpen(false)
      if (sc.current) sc.current.scrollTop = 0
      lastY.current = 0; hiddenR.current = false; setHiddenS(false)
      setLog(<>스크롤을 <b>내리면 숨고, 올리면</b> 다시 나와요</>)
    },
    async play(c) {
      c.tap(dev.current, sc.current)
      await scrollAnim(sc.current, 220, 900, m.D, c.alive); await c.sleep(900)
      await scrollAnim(sc.current, 120, 600, m.D, c.alive); await c.sleep(800)
      await c.press(dev.current, fab.current); await c.sleep(1300)
      await c.press(dev.current, dial.current?.querySelectorAll<HTMLElement>('button')[2] ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="layout-fab" num="06" title="플로팅 버튼" en="FAB"
      desc="화면 위에 떠 있는 둥근 버튼 하나로 가장 중요한 작업을 바로 시작해요." demo={demo}>
      <Stage log={log} logId="layout-fab-log">
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">피드</div>
            <div className="ly-scroll" ref={sc} onScroll={onScroll}>
              {NAMES.map((n, i) => (
                <div className="ly-post" key={n}>
                  <span className={'av ' + GR[i % 4]} />
                  <div className="tx">{n}<div className="fake-line" style={{ width: 55 + ((i * 17) % 40) + '%' }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className={'ly-scrim' + (open ? ' on' : '')} onClick={() => { setOpen(false); setLog(<>배경을 눌러 <b>접었어요</b></>) }} />
          <div className={'ly-fabwrap' + (hidden ? ' hide' : '')}>
            <div className={'ly-dial' + (open ? ' on' : '')} ref={dial}>
              {DIAL.map(([a, ic]) => (
                <button key={a} onClick={() => { setOpen(false); setLog(<><b>{a}</b> 작성 화면으로</>) }}><span>{a}</span><i>{ic}</i></button>
              ))}
            </div>
            <button className="ly-fab ly-hl" ref={fab} aria-label={open ? '닫기' : '새로 만들기'} aria-expanded={open}
              onClick={() => {
                const v = !openR.current
                setOpen(v)
                setLog(v ? <><b>스피드 다이얼</b> — 관련 작업 3개가 펼쳐졌어요</> : <><b>×</b>를 눌러 접었어요</>)
              }}><span>+</span></button>
            <Tag className="ly-fabtag">플로팅 버튼</Tag>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['위치', '오른쪽 아래'], ['역할', '대표 작업 1개'], ['예시', '메모앱 · SNS 글쓰기']]}
        usage={[['언제', '새 글·새 메모처럼 그 화면의 주인공 작업이 하나일 때'], ['주의', '내용을 가리니 내려갈 땐 숨겨요. 작업이 여러 개면 스피드 다이얼로 묶어요(3개 이하)']]}
      />
    </Card>
  )
}

/* ---------- 09 뒤로 가기 ---------- */
const L0: [string, string][] = [['🍳', '주방용품'], ['✏', '문구'], ['⛺', '캠핑']]
const L1: [string, string][] = [['A', '베스트 상품 A'], ['B', '새로 나온 B'], ['C', '한정판 C']]

export function Back() {
  const m = useMotion()
  const dev = useRef<HTMLDivElement>(null)
  const scrs = useRef<(HTMLDivElement | null)[]>([])
  const edge = useRef<HTMLDivElement>(null)
  const [stack, setStackS] = useState(['홈'])
  const [ver, setVer] = useState(0)
  const [t1, setT1] = useState('카테고리')
  const [t2, setT2] = useState('상품')
  const [log, setLog] = useState<ReactNode>(<>항목을 눌러 <b>두 단계</b> 들어가 보세요</>)
  const stackR = useRef(['홈'])
  const busy = useRef(false)
  const drag = useRef<{ x0: number; k: number } | null>(null)

  const setStack = (s: string[]) => { stackR.current = s; setStackS(s); setVer(v => v + 1) }
  const tr = (i: number, v: string) => { const s = scrs.current[i]; if (s) s.style.transform = v }
  const place = () => {
    const d = stackR.current.length - 1
    scrs.current.forEach((s, i) => { m.clearA(s); if (s) s.style.transform = i < d ? 'translateX(-30%)' : i === d ? 'none' : 'translateX(100%)' })
  }
  useLayoutEffect(place, [m])

  const push = async (name: string) => {
    const st = stackR.current
    if (busy.current || st.length >= 3) return
    busy.current = true
    const lv = st.length, nx = scrs.current[lv], cu = scrs.current[lv - 1]
    if (lv === 1) setT1(name); else setT2(name)
    const ns = [...st, name]
    setStack(ns)
    tr(lv, 'none'); tr(lv - 1, 'translateX(-30%)')
    if (cu) m.A(cu, [{ transform: 'none' }, { transform: 'translateX(-30%)' }], 300)
    const an = nx ? m.A(nx, [{ transform: 'translateX(100%)' }, { transform: 'none' }], 300) : null
    setLog(<><b>{name}</b> — 깊이 {ns.length - 1}{ns.length === 3 ? ' · 이제 ‹ 또는 가장자리를 밀어 돌아가요' : ''}</>)
    await an?.finished.catch(() => {})
    busy.current = false
  }
  const pop = async (how: string, fromX = 0) => {
    const st = stackR.current
    if (busy.current || st.length < 2) return
    busy.current = true
    const lv = st.length - 1, cu = scrs.current[lv], pv = scrs.current[lv - 1], left = st[lv]
    const ns = st.slice(0, -1)
    setStack(ns)
    const k = fromX
    tr(lv, 'translateX(100%)'); tr(lv - 1, 'none')
    if (pv) m.A(pv, [{ transform: 'translateX(' + (-30 + 30 * k) + '%)' }, { transform: 'none' }], 280 * (1 - k * 0.5))
    const an = cu ? m.A(cu, [{ transform: 'translateX(' + 100 * k + '%)' }, { transform: 'translateX(100%)' }], 280 * (1 - k * 0.5)) : null
    setLog(<>{how} → <b>{ns[ns.length - 1]}</b> ({left} 닫힘)</>)
    await an?.finished.catch(() => {})
    busy.current = false
  }

  // 가장자리 스와이프
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const st = stackR.current
    if (busy.current || st.length < 2) return
    drag.current = { x0: e.clientX, k: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    const lv = st.length - 1
    m.clearA(scrs.current[lv], scrs.current[lv - 1])
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || !dev.current) return
    const lv = stackR.current.length - 1
    d.k = Math.max(0, Math.min(1, (e.clientX - d.x0) / dev.current.clientWidth))
    tr(lv, 'translateX(' + d.k * 100 + '%)')
    tr(lv - 1, 'translateX(' + (-30 + 30 * d.k) + '%)')
  }
  const onUp = () => {
    const d = drag.current
    if (!d) return
    const k = d.k
    drag.current = null
    if (k > 0.3) pop('가장자리 스와이프', k)
    else { place(); if (k > 0.02) setLog(<>조금만 밀면 <b>제자리로</b> 돌아와요 — 30% 넘게 밀어야 뒤로</>) }
  }

  const demo = useDemo({
    reset() { busy.current = false; stackR.current = ['홈']; place(); setStack(['홈']); setLog(<>항목을 눌러 <b>두 단계</b> 들어가 보세요</>) },
    async play(c) {
      const q = (i: number, s: string) => scrs.current[i]?.querySelector<HTMLElement>(s) ?? null
      await c.press(dev.current, q(0, '[data-go]')); await c.sleep(900)
      await c.press(dev.current, q(1, '[data-go]')); await c.sleep(1300)
      await c.press(dev.current, q(2, '[data-back]')); await c.sleep(900)
      // 가장자리 스와이프 연출
      c.tap(dev.current, edge.current); await c.sleep(150)
      let k = 0
      while (k < 0.55) { k += 0.06; tr(1, 'translateX(' + k * 100 + '%)'); tr(0, 'translateX(' + (-30 + 30 * k) + '%)'); await c.sleep(25) }
      await pop('가장자리 스와이프', k); await c.sleep(400)
    },
  })

  const reg = (i: number) => (el: HTMLDivElement | null) => { scrs.current[i] = el }
  const row = (ic: string, t: string, o = false) => (
    <div className="li" key={t} data-go={t} onClick={() => push(t)}><i className={'ic' + (o ? ' o' : '')}>{ic}</i>{t}<span className="chev">›</span></div>
  )
  const backBtn = <button className="back ly-hl" data-back aria-label="뒤로" onClick={() => pop('‹ 버튼')}>‹</button>

  return (
    <Card id="layout-back" num="09" title="뒤로 가기" en="Back Navigation"
      desc="한 단계씩 들어온 길을 그대로 거슬러 이전 화면으로 돌아가요." demo={demo}>
      <Stage log={log} logId="layout-back-log">
        <Device ref={dev}>
          <div className="scr ly-bk-scr" data-lv="0" style={{ zIndex: 1 }} ref={reg(0)}>
            <div className="bar">홈</div>
            {L0.map(([ic, t]) => row(ic, t))}
            <div className="pad"><div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" style={{ width: '40%' }} /></div>
          </div>
          <div className="scr ly-bk-scr" data-lv="1" style={{ zIndex: 2 }} ref={reg(1)}>
            <div className="bar">{backBtn}<span className="ly-t1">{t1}</span></div>
            <Tag className="ly-bk-tag">뒤로 가기</Tag>
            {L1.map(([ic, t]) => row(ic, t, true))}
          </div>
          <div className="scr ly-bk-scr" data-lv="2" style={{ zIndex: 3 }} ref={reg(2)}>
            <div className="bar">{backBtn}<span className="ly-t2">{t2}</span></div>
            <Tag className="ly-bk-tag">뒤로 가기</Tag>
            <div className="pad" style={{ paddingTop: 34 }}>
              <div className="ly-detail g4" />
              <b className="ly-t2b">{t2}</b>
              <div className="ly-price">24,900원</div>
              <div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} />
              <button className="btn">장바구니 담기</button>
            </div>
          </div>
          <div className={'ly-edgehint' + (stack.length > 1 ? ' on' : '')} ref={edge}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <span>밀어서 뒤로 →</span>
          </div>
        </Device>
        <div className="ly-stack">
          <span className="lb">기록</span>
          {stack.map((s, i) => (
            <Fragment key={ver + '-' + i}>
              {i > 0 && <span className="ar">›</span>}
              <span className={'it' + (i === stack.length - 1 ? ' cur' : '')}>{s}</span>
            </Fragment>
          ))}
        </div>
      </Stage>
      <Info
        spec={[['위치', '앱바 왼쪽 위 · 왼쪽 가장자리'], ['역할', '이전 화면 복귀'], ['예시', '모든 앱의 상세 화면']]}
        usage={[['언제', '목록 → 상세처럼 계층을 들어간 화면이라면 어디서나'], ['주의', '앱 안 ‹ 버튼, 시스템 뒤로, 가장자리 스와이프가 모두 같은 화면으로 돌아가야 해요']]}
      />
    </Card>
  )
}
