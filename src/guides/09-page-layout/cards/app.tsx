import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { Browser, R, Regions, Say, ViewSeg } from '../shared'
import { tourRegions, useLayoutCard } from '../hooks'

/* ---------- 03 스플릿 ---------- */
type Ratio = '5:5' | '4:6'
const SPLIT_REG = [['brand', '이미지 쪽'], ['form', '할 일 쪽']] as const

export function Split() {
  const { view, setView, hl, setHl, frame } = useLayoutCard()
  const [ratio, setRatio] = useState<Ratio>('5:5')
  const [flip, setFlip] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>한쪽은 <b>분위기</b>, 한쪽은 <b>할 일</b>이에요</>)
  const swap = useRef<HTMLButtonElement>(null)

  const demo = useDemo({
    reset() { setView('desk'); setRatio('5:5'); setFlip(false); setHl(null); setLog(<>한쪽은 <b>분위기</b>, 한쪽은 <b>할 일</b>이에요</>) },
    async play(c) {
      await tourRegions(c, ['brand', 'form'], setHl, 800)
      setRatio('4:6'); setLog(<><b>4:6</b> · 할 일 쪽을 더 넓게</>); await c.sleep(1100)
      await c.press(frame.current?.parentElement?.parentElement ?? null, swap.current); await c.sleep(1200)
      setView('mob'); setLog(<>모바일에선 <b>위아래</b>로 · 이미지는 얇은 띠로 줄어요</>); await c.sleep(1500)
      setView('desk'); setFlip(false); setRatio('5:5')
    },
  })

  const [l, r] = ratio === '5:5' ? [1, 1] : [4, 6]
  return (
    <Card id="pl-split" num="03" title="스플릿" en="Split Screen" demo={demo}
      desc="화면을 세로로 반 갈라 양쪽에 서로 다른 내용을 두는 배치예요. 로그인 화면처럼 한쪽은 분위기, 한쪽은 할 일을 맡아요.">
      <Stage log={log}>
        <div className="pl-ctrl">
          <ViewSeg view={view} set={setView} />
          <Seg value={ratio} onChange={v => { setRatio(v); setLog(<><b>{v}</b> 비율로 나눴어요</>) }} options={[['5:5', '5:5'], ['4:6', '4:6']]} />
          <button type="button" className="btn ghost sm" ref={swap} onClick={() => { setFlip(!flip); setLog(<>좌우를 <b>바꿨어요</b> · 폼이 {flip ? '오른쪽' : '왼쪽'}</>) }}>좌우 바꾸기</button>
        </div>
        <Browser view={view} url="dayplan.io/login" hl={hl} ref={frame}>
          <div className={'pl-split' + (flip ? ' flip' : '')} style={{ ['--cols' as string]: flip ? `${r}fr ${l}fr` : `${l}fr ${r}fr` }}>
            <R k="brand" className="pl-sp-brand g2"><b>데이플랜</b><span>하루를 가볍게 정리해요</span></R>
            <R k="form" className="pl-sp-form">
              <div className="pl-h2">다시 만나서 반가워요</div>
              <span className="pl-in" /><span className="pl-in" />
              <button type="button" className="pl-cta" onClick={() => setLog(<>할 일 쪽의 주인공은 <b>로그인 버튼</b></>)}>로그인</button>
            </R>
          </div>
        </Browser>
        <Regions items={SPLIT_REG} hl={hl} set={setHl} />
      </Stage>
      <Say text={`스플릿 화면으로 만들어줘. 화면을 ${ratio}로 나눠 ${flip ? '왼쪽은 로그인 폼, 오른쪽은 브랜드 이미지' : '왼쪽은 브랜드 이미지, 오른쪽은 로그인 폼'}. 모바일에선 이미지를 위쪽 얇은 띠로 줄이고 폼을 아래에.`} />
      <Info
        spec={[['비율', '5:5 · 4:6'], ['양쪽', '역할이 다른 두 내용'], ['모바일', '위아래로 쌓기']]}
        usage={[
          ['언제', '로그인·가입처럼 분위기와 할 일을 같이 보여줄 때, 전·후 비교, 두 갈래(개인·기업) 고르기'],
          ['주의', '양쪽 다 글이 빽빽하면 눈 둘 곳이 없어요. 한쪽은 이미지로 쉬게 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 사이드바 레이아웃 ---------- */
const MENU = [['홈', '⌂'], ['프로젝트', '▦'], ['팀', '☺'], ['설정', '⚙']] as const
const SIDE_REG = [['side', '사이드바'], ['main', '본문']] as const

export function SidebarLayout() {
  const { view, setView, hl, setHl, frame } = useLayoutCard()
  const [mini, setMini] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [cur, setCur] = useState('프로젝트')
  const [log, setLog] = useState<ReactNode>(<>메뉴를 누르면 <b>본문만</b> 바뀌어요</>)
  const toggle = useRef<HTMLButtonElement>(null)
  const burger = useRef<HTMLButtonElement>(null)
  const changeView = (v: typeof view) => { setView(v); setDrawer(false) }

  const go = (m: string) => {
    setCur(m); setDrawer(false)
    setLog(<><b>{m}</b> · 사이드바는 그대로, 본문만 바뀜</>)
  }

  const demo = useDemo({
    reset() { changeView('desk'); setMini(false); setCur('프로젝트'); setHl(null); setLog(<>메뉴를 누르면 <b>본문만</b> 바뀌어요</>) },
    async play(c) {
      await tourRegions(c, ['side', 'main'], setHl, 800)
      await c.press(frame.current, toggle.current); await c.sleep(1100)
      await c.press(frame.current, toggle.current); await c.sleep(700)
      changeView('mob'); setLog(<>모바일에선 사이드바가 숨고 <b>☰ 버튼</b>이 생겨요</>); await c.sleep(1200)
      await c.press(frame.current, burger.current); await c.sleep(1300)
      changeView('desk')
    },
  })

  const items = MENU.map(([m, ic]) => (
    <button type="button" key={m} className={m === cur ? 'on' : ''} aria-current={m === cur ? 'page' : undefined} onClick={() => go(m)} title={m}>
      <i aria-hidden="true">{ic}</i><span>{m}</span>
    </button>
  ))

  return (
    <Card id="pl-sidebar" num="05" title="사이드바 레이아웃" en="Sidebar Layout" demo={demo}
      desc="왼쪽에 메뉴 기둥을 세워 두고, 나머지 넓은 자리를 본문이 쓰는 배치예요. 메뉴는 늘 그 자리에 있고 본문만 바뀌어요.">
      <Stage log={log}>
        <div className="pl-ctrl"><ViewSeg view={view} set={changeView} /></div>
        <Browser view={view} url="teamboard.app/projects" hl={hl} ref={frame}>
          <div className={'pl-sb' + (mini ? ' mini' : '') + (view === 'mob' ? ' mob' : '')}>
            {view === 'desk' && (
              <R k="side" className="pl-sb-side">
                <button type="button" className="pl-sb-toggle" ref={toggle} aria-label={mini ? '사이드바 펼치기' : '사이드바 접기'} aria-expanded={!mini}
                  onClick={() => { setMini(!mini); setLog(mini ? <>사이드바를 <b>펼쳤어요</b> · 이름까지 보여요</> : <>사이드바를 <b>접었어요</b> · 아이콘만, 본문은 넓게</>) }}>{mini ? '»' : '«'}</button>
                <nav aria-label="사이드 메뉴">{items}</nav>
              </R>
            )}
            <R k="main" className="pl-sb-main">
              <div className="pl-sb-head">
                {view === 'mob' && <button type="button" className="pl-sb-burger" ref={burger} aria-label="메뉴 열기" aria-expanded={drawer}
                  onClick={() => { setDrawer(true); setLog(<><b>☰</b>를 누르면 사이드바가 <b>서랍처럼</b>나와요</>) }}>☰</button>}
                <b>{cur}</b>
              </div>
              <div className="pl-sb-body" key={cur}><span /><span /><span /><span /></div>
            </R>
            {view === 'mob' && (
              <>
                <div className={'pl-sb-scrim' + (drawer ? ' on' : '')} onClick={() => setDrawer(false)} />
                <nav className={'pl-sb-drawer' + (drawer ? ' on' : '')} aria-label="사이드 메뉴" aria-hidden={!drawer}>{drawer && items}</nav>
              </>
            )}
          </div>
        </Browser>
        <Regions items={SIDE_REG} hl={hl} set={setHl} />
      </Stage>
      <Say text="사이드바 레이아웃으로 만들어줘. 왼쪽에 고정 메뉴(접으면 아이콘만 보이게), 오른쪽은 넓은 본문. 모바일에선 사이드바를 숨기고 햄버거 버튼으로 서랍처럼 열어줘." />
      <Info
        spec={[['사이드바 폭', '200~280px · 접으면 64px'], ['본문', '남은 폭 전부'], ['모바일', '햄버거 서랍']]}
        usage={[
          ['언제', '관리자 화면, 문서, 메일처럼 메뉴가 많고 자주 오가는 업무용 화면'],
          ['주의', '메뉴가 3~4개뿐이면 사이드바는 자리만 차지해요. 위쪽 탭이 더 가벼워요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 대시보드 ---------- */
const DATA = {
  today: { kpi: [['방문', '1,204'], ['주문', '86'], ['매출', '320만'], ['문의', '7']], bars: [3, 5, 4, 7, 6, 9, 8], feed: ['주문 #2041 결제', '새 회원 가입', '문의 답변 완료'] },
  week: { kpi: [['방문', '8,930'], ['주문', '612'], ['매출', '2,140만'], ['문의', '41']], bars: [6, 8, 5, 9, 7, 4, 10], feed: ['주간 리포트 생성', '재고 부족 알림 3건', '쿠폰 사용 128건'] },
} as const
type Period = keyof typeof DATA
const DASH_REG = [['filter', '기간 선택'], ['kpi', '숫자 카드'], ['chart', '그래프'], ['feed', '활동 목록']] as const

export function Dashboard() {
  const { view, setView, hl, setHl, frame } = useLayoutCard()
  const [p, setP] = useState<Period>('today')
  const [log, setLog] = useState<ReactNode>(<>요약 → 추이 → 세부 순서로 <b>위에서 아래로</b> 읽어요</>)
  const weekBtn = useRef<HTMLButtonElement>(null)
  const d = DATA[p], max = Math.max(...d.bars)
  const pick = (v: Period) => { setP(v); setLog(<><b>{v === 'today' ? '오늘' : '이번 주'}</b> · 숫자·그래프·목록이 함께 바뀌어요</>) }

  const demo = useDemo({
    reset() { setView('desk'); setP('today'); setHl(null); setLog(<>요약 → 추이 → 세부 순서로 <b>위에서 아래로</b> 읽어요</>) },
    async play(c) {
      await tourRegions(c, ['kpi', 'chart', 'feed'], setHl)
      await c.press(frame.current, weekBtn.current); await c.sleep(1300)
      setView('mob'); setLog(<>모바일에선 숫자 카드가 <b>2×2</b>, 나머지는 세로로</>); await c.sleep(1600)
      setView('desk')
    },
  })

  return (
    <Card id="pl-dashboard" num="07" title="대시보드" en="Dashboard Layout" demo={demo}
      desc="여러 숫자와 그래프를 한 화면에 모아 상태를 한눈에 보는 배치예요. 맨 위 핵심 숫자 → 가운데 추이 → 아래·옆 세부 순서로 놓아요.">
      <Stage log={log}>
        <div className="pl-ctrl"><ViewSeg view={view} set={setView} /></div>
        <Browser view={view} url="admin.moa-goods.shop" hl={hl} ref={frame}>
          <div className="pl-dash">
            <div className="pl-dash-head">
              <b>오늘의 가게</b>
              <R k="filter" group className="pl-dash-filter">
                <button type="button" aria-pressed={p === 'today'} onClick={() => pick('today')}>오늘</button>
                <button type="button" aria-pressed={p === 'week'} ref={weekBtn} onClick={() => pick('week')}>이번 주</button>
              </R>
            </div>
            <R k="kpi" group className="pl-kpis">
              {d.kpi.map(([k, v]) => <div className="pl-kpi" key={k}><span>{k}</span><b key={v}>{v}</b></div>)}
            </R>
            <div className="pl-dash-row">
              <R k="chart" className="pl-chart">
                <span className="pl-cap">방문 추이</span>
                <div className="pl-bars">{d.bars.map((b, i) => <i key={i} style={{ height: (b / max) * 100 + '%' }} />)}</div>
              </R>
              <R k="feed" className="pl-feed">
                <span className="pl-cap">최근 활동</span>
                {d.feed.map(f => <span key={f} className="pl-feed-i">{f}</span>)}
              </R>
            </div>
          </div>
        </Browser>
        <Regions items={DASH_REG} hl={hl} set={setHl} />
      </Stage>
      <Say text="관리자 대시보드로 만들어줘. 맨 위에 기간 선택, 그 아래 핵심 숫자 카드 4개를 한 줄로, 가운데 큰 막대그래프, 오른쪽에 최근 활동 목록. 모바일에선 숫자 카드를 2×2로." />
      <Info
        spec={[['숫자 카드', '3~5개'], ['읽는 순서', '요약 → 추이 → 세부'], ['모바일', '2×2 + 세로 쌓기']]}
        usage={[
          ['언제', '숫자를 매일 확인하고 판단해야 하는 운영·관리 화면'],
          ['주의', '그래프를 많이 넣을수록 좋아 보이지만, 가장 중요한 숫자 3~5개가 맨 위에 없으면 아무것도 안 읽혀요'],
        ]}
      />
    </Card>
  )
}
