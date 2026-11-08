import { Fragment, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { GR, Tag } from '../shared'

/* ---------- 01 하단 탭바 ---------- */
const TABS: [string, string][] = [['⌂', '홈'], ['⌕', '검색'], ['◫', '장바구니'], ['◉', '마이']]

export function TabBar() {
  const dev = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>아래 탭을 눌러 <b>최상위 화면</b> 바꾸기</>)

  const go = (i: number) => {
    if (i === cur) { setLog(<>지금 탭을 다시 누르면 <b>맨 위로</b> 올라가요</>); return }
    setCur(i)
    setLog(<><b>{TABS[i][1]}</b> 탭 — 탭바는 그대로, 위 내용만 바뀌어요</>)
  }
  const btn = (i: number) => bar.current?.querySelectorAll<HTMLElement>('button')[i] ?? null

  const demo = useDemo({
    reset() { setCur(0); setLog(<>아래 탭을 눌러 <b>최상위 화면</b> 바꾸기</>) },
    async play(c) {
      for (const i of [1, 2, 3]) { await c.press(dev.current, btn(i)); await c.sleep(1000) }
      await c.press(dev.current, btn(0)); await c.sleep(400)
    },
  })

  const pane = (i: number) => 'ly-pane' + (cur === i ? ' on' : '')
  return (
    <Card id="layout-tabbar" num="01" title="하단 탭바" en="Bottom Tab Bar"
      desc="화면 맨 아래에 고정된 3~5개의 최상위 메뉴. 엄지로 바로 오가요." demo={demo}>
      <Stage log={log} logId="layout-tabbar-log">
        <Device ref={dev}>
          <div className="scr">
            <div className="bar"><span>{TABS[cur][1]}</span></div>
            <div className="ly-panes">
              <div className={pane(0)}><div className="ly-banner g1">이번 주 특가<br />최대 50%</div><div className="ly-2"><span /><span /><span /><span /></div></div>
              <div className={pane(1)}>
                <div className="ly-search">⌕ 무엇을 찾고 있나요?</div>
                <div className="chips"><span className="chip">러닝화</span><span className="chip">텀블러</span><span className="chip">캠핑</span></div>
                <div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" style={{ width: '45%' }} />
              </div>
              <div className={pane(2)}>
                <div className="ly-cart"><span className="ly-thumb g2" /><div><b>무선 이어폰</b>89,000원</div></div>
                <div className="ly-cart"><span className="ly-thumb g3" /><div><b>여행용 파우치</b>12,000원</div></div>
                <div style={{ flex: 1 }} /><button className="btn">101,000원 결제하기</button>
              </div>
              <div className={pane(3)}>
                <div className="profile"><span className="ph" /><div><div className="t1">Palmer</div><div className="t2">골드 등급</div></div></div>
                <div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} /><div className="fake-line" style={{ width: '80%' }} />
              </div>
            </div>
            <div className="tabbar ly-tabbar ly-hl" ref={bar}>
              {TABS.map(([ic, t], i) => (
                <button key={t} className={cur === i ? 'on' : ''} onClick={() => go(i)}>
                  <i>{ic}</i>{t}{i === 2 && <em className="ly-badge">2</em>}
                </button>
              ))}
              <Tag style={{ right: 6, top: -24 }}>하단 탭바</Tag>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['위치', '화면 맨 아래 고정'], ['역할', '최상위 화면 전환'], ['예시', '쇼핑앱 · SNS · 은행앱']]}
        usage={[['언제', '자주 오가는 최상위 화면이 3~5개일 때'], ['주의', '탭마다 스크롤·상태를 기억해요. 지금 탭을 다시 누르면 맨 위로 올려줘요']]}
      />
    </Card>
  )
}

/* ---------- 02 드로어 ---------- */
const BOXES: [string, string, string?][] = [['▤', '받은편지함', '12'], ['☆', '별표편지함'], ['➤', '보낸편지함'], ['✎', '임시보관함', '2'], ['✕', '휴지통']]
const MAILS: [string, string, string][] = [['김', '김하늘', '회의 일정 확인 부탁드려요'], ['박', '박서준', '디자인 시안 공유드립니다'], ['이', '이도윤', '다음 주 출장 건'], ['최', '최유나', '계약서 초안 전달'], ['정', '정민호', '점심 같이 하실래요?']]

export function Drawer() {
  const dev = useRef<HTMLDivElement>(null)
  const nav = useRef<HTMLElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const openBtn = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [scrimDrag, setScrimDrag] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>≡ 버튼 또는 <b>왼쪽 가장자리를 밀어서</b> 열기</>)
  const drag = useRef<{ x0: number; from: number; p: number } | null>(null)

  const set = (on: boolean, msg?: ReactNode) => {
    if (nav.current) nav.current.style.transform = ''
    if (scrim.current) scrim.current.style.opacity = ''
    setOpen(on); setScrimDrag(false)
    if (msg) setLog(msg)
  }

  // 가장자리에서 밀어 열기 / 드로어를 밀어 닫기
  const start = (e: PointerEvent<HTMLElement>, from: number) => {
    drag.current = { x0: e.clientX, from, p: from }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d || !nav.current || !scrim.current) return
    d.p = Math.max(0, Math.min(1, d.from + (e.clientX - d.x0) / nav.current.offsetWidth))
    nav.current.style.transform = 'translateX(' + (d.p - 1) * 100 + '%)'
    scrim.current.style.opacity = String(d.p)
    setScrimDrag(true)
  }
  const end = () => {
    const d = drag.current
    if (!d) return
    const moved = Math.abs(d.p - d.from) > 0.02, on = d.p > 0.5
    setDragging(false)
    if (moved) set(on, on ? <><b>가장자리 스와이프</b>로 열었어요</> : <><b>왼쪽으로 밀어</b> 닫았어요</>)
    else if (d.from === 0) set(false)
    setTimeout(() => { drag.current = null }, 0)
  }

  const demo = useDemo({
    reset() { set(false, <>≡ 버튼 또는 <b>왼쪽 가장자리를 밀어서</b> 열기</>); setActive(0) },
    async play(c) {
      await c.press(dev.current, openBtn.current); await c.sleep(1300)
      await c.press(dev.current, nav.current?.querySelectorAll<HTMLElement>('.ly-dnav')[3] ?? null); await c.sleep(500)
    },
  })

  return (
    <Card id="layout-drawer" num="02" title="드로어" en="Navigation Drawer"
      desc="화면 옆에서 밀려 나오는 패널에 전체 메뉴를 담아요." demo={demo}>
      <Stage log={log} logId="layout-drawer-log">
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">
              <button className="ly-ib" ref={openBtn} aria-label="메뉴 열기" aria-expanded={open}
                onClick={() => set(true, <><b>≡ 버튼</b>으로 열었어요 — 배경을 누르거나 왼쪽으로 밀어 닫기</>)}>
                <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <span>{BOXES[active][1]}</span>
            </div>
            {MAILS.map(([ic, n, sub], i) => (
              <div className="li" key={n}><i className={'ic round' + (i % 2 ? ' o' : '')}>{ic}</i><div>{n}<span className="sub">{sub}</span></div></div>
            ))}
          </div>
          <Tag style={{ right: 8, top: 35, opacity: open ? 0 : 1 }}>≡ · 가장자리로 열기</Tag>
          <div className="ly-edge" onPointerDown={e => start(e, 0)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
          <div className={'ly-scrim' + (open || scrimDrag ? ' on' : '')} ref={scrim}
            onClick={() => { if (!drag.current) set(false, <><b>배경(스크림)</b>을 눌러 닫았어요</>) }} />
          <nav className={'ly-drawer ly-hl' + (open ? ' on' : '') + (dragging ? ' drag' : '')} ref={nav} aria-label="메일함"
            onPointerDown={e => { if (!(e.target as Element).closest('button')) start(e, 1) }}
            onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
            <Tag style={{ right: 8, top: 30 }}>드로어</Tag>
            <h5>메일</h5>
            {BOXES.map(([ic, t, n], i) => (
              <button key={t} className={'ly-dnav' + (active === i ? ' on' : '')}
                onClick={() => { setActive(i); set(false, <><b>{t}</b>(으)로 이동 — 고르면 자동으로 닫혀요</>) }}>
                <i>{ic}</i>{t}{n && <em>{n}</em>}
              </button>
            ))}
          </nav>
        </Device>
      </Stage>
      <Info
        spec={[['위치', '화면 왼쪽 가장자리'], ['역할', '전체·보조 메뉴'], ['예시', '메일앱 · 업무 도구']]}
        usage={[['언제', '메뉴가 많거나 폴더·계정처럼 목록이 길어질 때'], ['주의', '배경 탭·밀어서 닫기를 모두 지원해요. 핵심 기능을 드로어 안에만 숨기지 마세요']]}
      />
    </Card>
  )
}

/* ---------- 03 상단 탭 ---------- */
const TTABS = ['추천', '랭킹', '신상품', '세일', '뷰티', '패션', '리빙', '식품']

export function TopTabs() {
  const dev = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const ind = useRef<HTMLSpanElement>(null)
  const [cur, setCur] = useState(0)
  const [ver, setVer] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>탭을 누르거나 <b>아래 내용을 좌우로 밀어</b> 보세요</>)
  const sx = useRef<number | null>(null)
  const tab = (i: number) => strip.current?.querySelectorAll<HTMLElement>('button')[i] ?? null

  // 밑줄 위치 · 고른 탭을 가운데로
  useLayoutEffect(() => {
    const t = tab(cur), s = strip.current, u = ind.current
    if (!t || !s || !u) return
    u.style.width = t.offsetWidth - 16 + 'px'
    u.style.transform = 'translateX(' + (t.offsetLeft + 8) + 'px)'
    s.scrollTo({ left: t.offsetLeft - (s.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' })
  }, [cur, ver])

  const go = (i: number, why = '') => {
    const n = Math.max(0, Math.min(TTABS.length - 1, i))
    setCur(n); setVer(v => v + 1)
    setLog(<><b>{TTABS[n]}</b> 탭{why} — 고른 탭이 가운데로 와요</>)
  }

  const demo = useDemo({
    reset() { setCur(0); setVer(v => v + 1); setLog(<>탭을 누르거나 <b>아래 내용을 좌우로 밀어</b> 보세요</>) },
    async play(c) {
      await c.press(dev.current, tab(2)); await c.sleep(1000)
      await c.press(dev.current, tab(4)); await c.sleep(1000)
      await c.press(dev.current, tab(6)); await c.sleep(1100)
      await c.press(dev.current, tab(1)); await c.sleep(400)
    },
  })

  return (
    <Card id="layout-toptabs" num="03" title="상단 탭" en="Top Tabs"
      desc="같은 화면 안의 카테고리를 가로로 나열해요. 많으면 옆으로 스크롤해요." demo={demo}>
      <Stage log={log} logId="layout-toptabs-log">
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">쇼핑<span className="sp" /><span style={{ color: 'var(--text-3)' }}>⌕</span></div>
            <div className="ly-ttabs ly-hl">
              <div className="ly-strip" ref={strip} role="tablist">
                {TTABS.map((t, i) => (
                  <button key={t} role="tab" className={cur === i ? 'on' : ''} aria-selected={cur === i} onClick={() => go(i)}>{t}</button>
                ))}
                <span className="ly-ind" ref={ind} />
              </div>
              <Tag style={{ right: 8, top: 'calc(100% + 4px)' }}>상단 탭 · 가로 스크롤</Tag>
            </div>
            <div className="ly-tgrid in" key={ver}
              onPointerDown={e => { sx.current = e.clientX }}
              onPointerUp={e => {
                if (sx.current === null) return
                const dx = e.clientX - sx.current
                sx.current = null
                if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1), ' (스와이프)')
              }}>
              {[0, 1, 2, 3].map(k => (
                <div className="ly-prod" key={k}>
                  <span className={'ly-thumb ' + GR[(cur + k) % 4]} />{TTABS[cur]} 상품 {k + 1}<small>{10 + ((cur * 7 + k * 13) % 40)}%</small>
                </div>
              ))}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['위치', '앱바 바로 아래'], ['역할', '같은 수준 콘텐츠 분류'], ['예시', '쇼핑앱 · 뉴스앱']]}
        usage={[['언제', '같은 종류의 콘텐츠를 카테고리별로 나눠 보여줄 때'], ['주의', '끝 탭을 살짝 잘라 보여줘서 ‘더 있다’는 걸 알려요. 고른 탭은 가운데로 스크롤해요']]}
      />
    </Card>
  )
}

/* ---------- 04 브레드크럼 ---------- */
const TREE: Record<string, string[]> = {
  홈: ['패션', '가전', '식품'], 패션: ['여성', '남성', '키즈'], 가전: ['TV', '냉장고', '청소기'], 식품: ['과일', '정육', '간식'],
  여성: ['원피스', '니트', '코트'], 남성: ['셔츠', '바지', '신발'], 키즈: ['상의', '하의', '잡화'],
}
const START = ['홈', '패션', '여성', '원피스']

export function Breadcrumb() {
  const frame = useRef<HTMLDivElement>(null)
  const nav = useRef<HTMLElement>(null)
  const sub = useRef<HTMLDivElement>(null)
  const [path, setPath] = useState(START)
  const [expanded, setExpanded] = useState(false)
  const [fold, setFold] = useState(false)
  const [ver, setVer] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>위쪽 경로에서 <b>상위 단계</b>를 눌러 올라가 보세요</>)

  // 한 줄을 넘기면 가운데를 ‘…’로 접어요 (먼저 다 그려보고 재요)
  useLayoutEffect(() => {
    const n = nav.current
    if (fold || !n || expanded || path.length <= 3) return
    const a = n.firstElementChild as HTMLElement | null, b = n.lastElementChild as HTMLElement | null
    if (a && b && b.offsetTop > a.offsetTop + 4) setFold(true)
  }, [fold, path, expanded, ver])
  useEffect(() => {
    const onResize = () => { setFold(false); setVer(v => v + 1) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const goPath = (p: string[]) => { setPath(p); setExpanded(false); setFold(false); setVer(v => v + 1) }
  const items = fold ? [path[0], '…', ...path.slice(-2)] : path
  const last = path[path.length - 1], kids = TREE[last]

  const demo = useDemo({
    reset() { goPath(START); setLog(<>위쪽 경로에서 <b>상위 단계</b>를 눌러 올라가 보세요</>) },
    async play(c) {
      const q = (root: HTMLElement | null, s: string) => root?.querySelector<HTMLElement>(s) ?? null
      if (!q(nav.current, '[data-i="1"]')) { await c.press(frame.current, q(nav.current, '[data-more]')); await c.sleep(900) }
      await c.press(frame.current, q(nav.current, '[data-i="1"]')); await c.sleep(1100)
      await c.press(frame.current, q(sub.current, '[data-k="남성"]')); await c.sleep(1000)
      await c.press(frame.current, q(sub.current, '[data-k="셔츠"]')); await c.sleep(1100)
      await c.press(frame.current, q(nav.current, '[data-i="0"]')); await c.sleep(500)
    },
  })

  return (
    <Card id="layout-breadcrumb" num="04" title="브레드크럼" en="Breadcrumb"
      desc="지금 위치까지 지나온 단계를 한 줄로 보여주고, 원하는 단계로 바로 올라가요." demo={demo}>
      <Stage log={log} logId="layout-breadcrumb-log">
        <div className="ly-browser" ref={frame}>
          <div className="ly-chrome"><i /><i /><i /><div className="ly-url">{'shop.example/' + path.slice(1).join('/')}</div></div>
          <div className="ly-page">
            <nav className="ly-crumbs ly-hl" ref={nav} aria-label="현재 위치">
              {items.map((c, i) => {
                const sep = i > 0 && <span className="sep">›</span>
                if (c === '…') return <Fragment key="more">{sep}<button data-more aria-label="경로 펼치기"
                  onClick={() => { setExpanded(true); setFold(false); setVer(v => v + 1); setLog(<><b>…</b>을 눌러 접힌 경로를 펼쳤어요</>) }}>…</button></Fragment>
                const idx = path.indexOf(c)
                return (
                  <Fragment key={c}>{sep}
                    {i === items.length - 1
                      ? <span aria-current="page">{c}</span>
                      : <button data-i={idx} onClick={() => {
                        goPath(path.slice(0, idx + 1))
                        setLog(<>{last} → <b>{path[idx]}</b>(으)로 한 번에 올라갔어요</>)
                      }}>{c}</button>}
                  </Fragment>
                )
              })}
            </nav>
            <Tag style={{ left: 12, top: 6 }}>브레드크럼</Tag>
            <h4>{last}</h4>
            <div className="ly-sub in" ref={sub} key={path.join('/')}>
              {kids
                ? kids.map(k => (
                  <button key={k} data-k={k} onClick={() => { goPath([...path, k]); setLog(<><b>{k}</b>(으)로 들어가자 경로가 한 칸 늘었어요</>) }}>{k}<span>›</span></button>
                ))
                : <div className="ly-leaf">{[0, 1, 2, 3].map(k => (
                  <div className="ly-prod" key={k}><span className={'ly-thumb ' + GR[k]} style={{ aspectRatio: '1/.6' }} />{last} {k + 1}</div>
                ))}</div>}
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['위치', '페이지 제목 위'], ['역할', '위치 표시 · 상위 이동'], ['예시', '쇼핑몰 웹 · 문서 사이트']]}
        usage={[['언제', '카테고리가 3단계 이상 깊은 웹 사이트'], ['주의', '현재 페이지는 링크가 아니에요. 경로가 길면 가운데를 ‘…’로 접어요']]}
      />
    </Card>
  )
}
