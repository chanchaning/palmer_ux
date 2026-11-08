import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMotion } from '../../../lib/motion'
import { useTimers } from '../../../components/ui'
import { Diff3, HRows, Icon, Lines, MAILS, MRows, Pane, PfCard, PHOTO, Photos, useTabInd, type IconName } from '../shared'

/* ================= 01 화면 최상단 바 ================= */
export function TopBar() {
  const [lift, setLift] = useState(false)
  const [mLog, setMLog] = useState<ReactNode>(<>스크롤하면 그림자 대신 <b>바 색이 진해져요</b>.</>)
  const [hState, setHState] = useState(0)
  const [glass, setGlass] = useState(false)
  const [hLog, setHLog] = useState<ReactNode>(<>스크롤하면 <b>큰 타이틀이 가운데로</b> 작아져요.</>)
  const large = useRef<HTMLDivElement>(null)

  return (
    <PfCard id="topbar" num="01" title="화면 최상단 바" en="Top Bar" desc="제목과 주요 동작을 담는 맨 위 막대예요. 양쪽 다 스크롤해 보세요."
      diff={Diff3(
        ['Top App Bar (Small · Center-aligned · Medium · Large)', 'Navigation Bar (기본 · Large Title)'],
        ['제목 왼쪽 정렬, 왼쪽 내비 아이콘 + 오른쪽 액션 아이콘', '제목 가운데 정렬, 왼쪽에 ‹ 이전 화면 이름, 오른쪽 텍스트 버튼'],
        ['스크롤하면 그림자 대신 컨테이너 색이 진해져요', '큰 타이틀이 스크롤에 맞춰 작아지고 바가 반투명 블러로 바뀌어요'],
      )}>
      <div className="demos">
        <Pane side="m" label="Top App Bar" en="Material" log={mLog}>
          <div className="pf-scr">
            <div className={'pf-mbar' + (lift ? ' lift' : '')} data-bar>
              <button className="pf-ib pf-rp" aria-label="메뉴"><Icon k="menu" /></button><b>받은편지함</b><span className="sp" />
              <button className="pf-ib pf-rp" aria-label="검색"><Icon k="search" /></button><button className="pf-ib pf-rp" aria-label="더보기"><Icon k="more" /></button>
            </div>
            <div className="pf-body" data-scroll onScroll={e => {
              const on = e.currentTarget.scrollTop > 2
              if (on === lift) return
              setLift(on)
              setMLog(on ? <>스크롤 중 — 바가 <b>톤이 진한 표면색</b>으로 바뀌었어요.</> : <>맨 위 — 바가 <b>배경과 같은 색</b>이에요.</>)
            }}><MRows list={MAILS} /></div>
          </div>
        </Pane>
        <Pane side="h" label="Navigation Bar" en="HIG" extra={<span className="pf-warn">이름 주의</span>} log={hLog}>
          <div className="pf-scr">
            <div className={'pf-hbar over' + (glass ? ' glass' : '')} data-bar>
              <button className="pf-tint"><Icon k="chev" />메일상자</button>
              <b className="pf-htitle" data-inline style={{ opacity: hState }}>받은편지함</b>
              <button className="pf-tint">편집</button>
            </div>
            <div className="pf-body" data-scroll style={{ paddingTop: 44 }} onScroll={e => {
              const y = e.currentTarget.scrollTop
              const k = Math.max(0, Math.min(1, y / 34))
              const l = large.current!
              l.style.opacity = String(1 - k)
              l.style.transform = y < 0 ? 'scale(' + (1 - y / 300) + ')' : ''
              setGlass(y > 30)
              const ns = k >= 1 ? 1 : 0
              if (ns !== hState) {
                setHState(ns)
                setHLog(ns ? <>큰 타이틀이 접혀 <b>가운데 작은 제목</b>이 되고 바가 <b>반투명</b>해졌어요.</> : <>맨 위 — <b>왼쪽 큰 타이틀</b>이 보여요.</>)
              }
            }}>
              <div className="pf-large" data-large ref={large}>받은편지함</div>
              <div data-fill="h"><HRows list={MAILS} /></div>
            </div>
          </div>
        </Pane>
      </div>
    </PfCard>
  )
}

/* ================= 02 화면 최하단 메뉴 바 ================= */
const NAV: [string, IconName][] = [['홈', 'home'], ['검색', 'search'], ['보관함', 'star'], ['내 정보', 'person']]

function NavPane({ s }: { s: 'm' | 'h' }) {
  const [on, setOn] = useState(0)
  const [nonce, setNonce] = useState(0)
  const [log, setLog] = useState<ReactNode>(s === 'm' ? <>선택하면 아이콘 뒤에 <b>알약 인디케이터</b>가 퍼져요.</> : <>선택한 탭은 <b>틴트 색</b>으로만 바뀌어요.</>)
  const pick = (i: number) => {
    const same = i === on, l = NAV[i][0]
    setOn(i); setNonce(n => n + 1)
    setLog(s === 'm'
      ? (same ? <>같은 항목을 다시 누르면 보통 <b>맨 위로</b> 돌아가요.</> : <><b>{l}</b> — 알약 인디케이터가 <b>가로로 퍼지며</b> 옮겨왔어요.</>)
      : (same ? <>같은 탭을 다시 누르면 그 탭의 <b>첫 화면</b>으로 돌아가요.</> : <><b>{l}</b> — 아이콘이 <b>채워지고 틴트 색</b>으로 바뀌었어요.</>))
  }
  const pane = (
    <div className="pf-pane" data-pane key={nonce} style={s === 'h' ? { paddingBottom: 50 } : undefined}>
      <span className="big"><Icon k={NAV[on][1]} /></span><b style={{ color: 'var(--text)' }}>{NAV[on][0]}</b>
      <span className="muted">{s === 'm' ? 'Navigation Bar 목적지' : 'Tab Bar 탭'}</span>
    </div>
  )
  if (s === 'm') return (
    <Pane side="m" label="Navigation Bar" en="Material · 구 Bottom Navigation" log={log}>
      <div className="pf-scr">
        {pane}
        <nav className="pf-mnav" data-nav>
          {NAV.map(([l, ic], i) => <button key={l} className={'pf-rp' + (i === on ? ' on' : '')} data-l={l} onClick={() => pick(i)}><span className="pf-pill"><Icon k={ic} /></span>{l}</button>)}
        </nav>
      </div>
    </Pane>
  )
  return (
    <Pane side="h" label="Tab Bar" en="HIG" log={log}>
      <div className="pf-scr">
        {pane}
        <nav className="pf-htab" data-nav>
          {NAV.map(([l, ic], i) => <button key={l} className={i === on ? 'on' : ''} data-l={l} onClick={() => pick(i)}><Icon k={ic} />{l}</button>)}
        </nav>
      </div>
    </Pane>
  )
}

export function BottomBar() {
  return (
    <PfCard id="bottombar" num="02" title="화면 최하단 메뉴 바" en="Bottom Bar" desc="앱의 주요 화면 3~5개를 오가는 맨 아래 메뉴예요."
      tag={<span className="pf-warn" style={{ marginLeft: 4 }}>⚠ 혼동 주의</span>}
      head={
        <div className="pf-confuse">
          <div className="pf-cfp"><figure><span className="ph m"><i /></span>M</figure><figure><span className="ph h"><i /></span>HIG</figure></div>
          <span>같은 <b>“Navigation Bar”</b>라도 머티리얼에선 <b className="a">화면 아래 메뉴</b>, HIG에선 <b className="b">화면 위 제목 바</b>예요. iOS의 아래 메뉴는 <b>Tab Bar</b>라고 불러요.</span>
        </div>
      }
      diff={Diff3(
        ['Navigation Bar (M2까지 Bottom Navigation)', 'Tab Bar (HIG의 Navigation Bar는 상단 바)'],
        ['선택 아이콘 뒤 알약 모양 인디케이터, 톤이 들어간 불투명 배경', '선택 아이콘·라벨이 틴트 색, 반투명 배경과 위쪽 구분선'],
        ['인디케이터가 가로로 퍼지며 등장해요', '탭마다 따로 쌓인 화면 상태를 기억해요'],
      )}>
      <div className="demos"><NavPane s="m" /><NavPane s="h" /></div>
    </PfCard>
  )
}

/* ================= 03 화면 내 가로 탭 전환 ================= */
const TABS = ['전체', '사진', '동영상']
const SEGS: [number, string][] = [[3, '크게'], [4, '보통'], [6, '작게']]
const CHART = [
  { v: [3, 5, 8, 6, 9, 12, 7, 4], l: ['09시', '18시'], u: '오늘' },
  { v: [40, 52, 38, 61, 70, 88, 45], l: ['월', '일'], u: '이번 주' },
  { v: [210, 180, 260, 240, 300, 280, 320, 350, 290, 310, 380, 420], l: ['1월', '12월'], u: '올해' },
]

function TabsM() {
  const [tab, setTab] = useState(0)
  const [cols, setCols] = useState(4)
  const [log, setLog] = useState<ReactNode>(<>탭은 <b>내용</b>을, 세그먼트 버튼은 <b>보기 방식</b>을 바꿔요.</>)
  const tabs = useRef<HTMLDivElement>(null)
  useTabInd(tabs, [tab])
  return (
    <Pane side="m" label="Tabs / Segmented Button" en="Material" log={log}>
      <div className="pf-scr">
        <div className="pf-mtabs" data-tabs ref={tabs}>
          {TABS.map((t, i) => <button key={t} className={'pf-rp' + (i === tab ? ' on' : '')} onClick={() => { setTab(i); setLog(<>Tabs <b>{t}</b> — 보여주는 <b>콘텐츠 자체</b>가 바뀌었어요.</>) }}>{t}</button>)}
          <span className="pf-ind" />
        </div>
        <div className="pf-body">
          <div className="pf-thumbs" data-thumbs style={{ gridTemplateColumns: 'repeat(' + cols + ', 1fr)' }}>
            {Array.from({ length: cols * 3 }, (_, i) => {
              const kind = tab === 0 ? (i % 3 === 1 ? 'v' : 'p') : tab === 1 ? 'p' : 'v'
              return <span key={i} style={{ background: PHOTO[(i + tab) % PHOTO.length], opacity: 0.55, color: '#fff' }}>{kind === 'v' ? '▶' : ''}</span>
            })}
          </div>
        </div>
        <div className="pf-cap">SEGMENTED BUTTON · 보기 크기</div>
        <div className="pf-mseg" data-seg>
          {SEGS.map(([n, l]) => <button key={n} className={'pf-rp' + (n === cols ? ' on' : '')} data-n={n} onClick={() => { setCols(n); setLog(<>Segmented Button <b>{l}</b> — 같은 콘텐츠의 <b>보기 크기</b>만 바뀌어요.</>) }}><Icon k="check" />{l}</button>)}
        </div>
      </div>
    </Pane>
  )
}

function SegH() {
  const [i, setI] = useState(0)
  const [nonce, setNonce] = useState(0)
  const [grow, setGrow] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>흰 썸이 <b>미끄러지듯</b> 옮겨가요.</>)
  useEffect(() => {
    setGrow(false)
    let r2 = 0
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setGrow(true)) })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [i, nonce])
  const d = CHART[i], max = Math.max(...d.v)
  return (
    <Pane side="h" label="Segmented Control" en="HIG" log={log}>
      <div className="pf-scr">
        <div className="pf-hseg" data-seg>
          <span className="th" style={{ transform: 'translateX(' + i * 100 + '%)' }} />
          {['일', '주', '월'].map((t, j) => <button key={t} className={i === j ? 'on' : ''} onClick={() => { setI(j); setNonce(n => n + 1); setLog(<>Segmented Control <b>{t}</b> — 같은 데이터, <b>보기 단위</b>만 바뀌었어요.</>) }}>{t}</button>)}
        </div>
        <div className="pf-hchart" data-chart>
          {d.v.map((v, k) => <span key={nonce + '-' + k} style={{ height: grow ? (v / max) * 100 + '%' : 0 }} />)}
        </div>
        <div className="pf-hcapt"><span data-c1>{d.l.join(' → ')}</span><span data-c2>{d.u} 걸음 수</span></div>
      </div>
    </Pane>
  )
}

export function Tabs() {
  return (
    <PfCard id="tabs" num="03" title="화면 내 가로 탭 전환" en="In-page Switch" desc="한 화면 안에서 보기를 바꾸는 가로 버튼 묶음이에요."
      diff={Diff3(
        ['Tabs(Primary · Secondary) / Segmented Button', 'Segmented Control (화면 안 ‘탭’ 컴포넌트는 따로 없음)'],
        ['탭은 밑줄 인디케이터, 세그먼트 버튼은 테두리 알약 + 선택 시 ✓', '회색 트랙 위로 흰 썸이 움직이는 캡슐'],
        ['탭은 콘텐츠 영역을 통째로 바꾸고 좌우 스와이프로도 넘겨요', '같은 콘텐츠의 보기·필터를 바꿔요. 2~5개 짧은 라벨'],
      )}>
      <div className="demos"><TabsM /><SegH /></div>
    </PfCard>
  )
}

/* ================= 04 중앙 팝업 알림창 ================= */
function DialogPane({ s }: { s: 'm' | 'h' }) {
  const { D } = useMotion()
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>열고 나서 <b>바깥을 눌러보세요</b>.</>)
  const dlg = useRef<HTMLDivElement>(null)
  const openIt = () => { setOpen(true); setLog(<>열렸어요. 이제 <b>바깥을 눌러보세요</b>.</>) }
  const pick = (r: string) => { setOpen(false); setLog(<><b>{r}</b>을(를) 골랐어요.</>) }
  const scrim = () => {
    if (s === 'm') { setOpen(false); setLog(<>바깥(스크림)을 눌러 <b>닫혔어요</b> — 기본 다이얼로그는 가볍게 닫혀요.</>) }
    else {
      dlg.current?.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.03)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: D(220) })
      setLog(<>바깥을 눌러도 <b>안 닫혀요</b> — 버튼으로 결정해야 해요.</>)
    }
  }
  const on = open ? ' on' : ''
  if (s === 'm') return (
    <Pane side="m" label="Dialog" en="Material" log={log}>
      <div className="pf-scr">
        <div className="pf-mbar sm"><b>임시 저장</b></div>
        <div className="pf-center"><span className="muted">저장한 글 1개</span><button className="pf-mbtn pf-rp" data-open onClick={openIt}>삭제하기</button></div>
        <div className={'pf-scrim' + on} data-scrim onClick={scrim} />
        <div className={'pf-mdlg' + on} data-dlg role="dialog" aria-modal="true" ref={dlg}>
          <h4>임시 저장글을 삭제할까요?</h4>
          <p>삭제한 글은 복구할 수 없어요.</p>
          <div className="acts">{['취소', '삭제'].map(r => <button key={r} className="pf-mtext pf-rp" data-r={r} onClick={() => pick(r)}>{r}</button>)}</div>
        </div>
      </div>
    </Pane>
  )
  return (
    <Pane side="h" label="Alert" en="HIG" log={log}>
      <div className="pf-scr grp">
        <div className="pf-hbar"><span /><b className="pf-htitle">임시 저장</b><span /></div>
        <div className="pf-center"><span className="muted">저장한 글 1개</span><button className="pf-hbtn" data-open onClick={openIt}>삭제하기</button></div>
        <div className={'pf-scrim' + on} data-scrim onClick={scrim} />
        <div className={'pf-halert' + on} data-dlg role="alertdialog" aria-modal="true" ref={dlg}>
          <div className="tx"><h4>임시 저장글을 삭제할까요?</h4><p>삭제한 글은 복구할 수 없어요.</p></div>
          <div className="acts"><button className="bold" data-r="취소" onClick={() => pick('취소')}>취소</button><button className="pf-red" data-r="삭제" onClick={() => pick('삭제')}>삭제</button></div>
        </div>
      </div>
    </Pane>
  )
}

export function Dialog() {
  return (
    <PfCard id="dialog" num="04" title="중앙 팝업 알림창" en="Modal Prompt" desc="하던 일을 멈추고 결정을 받아야 할 때 가운데 뜨는 창이에요."
      diff={Diff3(
        ['Dialog (Basic · Full-screen)', 'Alert'],
        ['28dp 둥근 모서리, 제목·본문 왼쪽 정렬, 텍스트 버튼은 오른쪽 끝', '좁은 폭, 가운데 정렬, 구분선으로 나뉜 버튼이 바닥을 꽉 채워요. 파괴적 동작은 빨간색'],
        ['기본 다이얼로그는 바깥(스크림)을 누르면 닫혀요', '바깥을 눌러도 안 닫혀요. 살짝 크게 시작해 줄어들며 나타나요'],
      )}>
      <div className="demos"><DialogPane s="m" /><DialogPane s="h" /></div>
    </PfCard>
  )
}

/* ================= 05 하단에서 올라오는 선택창 ================= */
/** 손잡이를 아래로 40px 넘게 끌면 닫혀요 */
function useDragClose(sheet: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  const [drag, setDrag] = useState(false)
  const st = useRef<{ y0: number; dy: number } | null>(null)
  const end = () => {
    const t = st.current
    if (!t) return
    st.current = null
    setDrag(false)
    if (sheet.current) sheet.current.style.transform = ''
    if (t.dy > 40) onClose()
  }
  return {
    drag,
    handle: {
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => { st.current = { y0: e.clientY, dy: 0 }; setDrag(true); e.currentTarget.setPointerCapture(e.pointerId) },
      onPointerMove: (e: React.PointerEvent) => {
        const t = st.current
        if (!t || !sheet.current) return
        t.dy = Math.max(0, e.clientY - t.y0)
        sheet.current.style.transform = 'translateY(' + t.dy + 'px)'
      },
      onPointerUp: end, onPointerCancel: end,
    },
  }
}

function SheetM() {
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<ReactNode>(<><b>손잡이를 끌어 내리거나</b> 바깥을 눌러 닫아요.</>)
  const sheet = useRef<HTMLDivElement>(null)
  const dc = useDragClose(sheet, () => { setOpen(false); setLog(<><b>아래로 끌어서</b> 닫혔어요.</>) })
  const PICKS: [string, IconName, string][] = [['메시지', 'mail', '메시지로 보내기'], ['링크 복사', 'link', '링크 복사'], ['삭제', 'trash', '삭제']]
  return (
    <Pane side="m" label="Bottom Sheet" en="Material" log={log}>
      <div className="pf-scr">
        <Photos />
        <div className="pf-center">
          <button className="pf-mbtn tonal pf-rp" data-open style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => { setOpen(true); setLog(<>바닥에 붙은 <b>Bottom Sheet</b> — 손잡이를 끌어 내려보세요.</>) }}><Icon k="share" />공유</button>
        </div>
        <div className={'pf-scrim' + (open ? ' on' : '')} data-scrim onClick={() => { setOpen(false); setLog(<><b>바깥 탭</b>으로 닫혔어요.</>) }} />
        <div className={'pf-msheet' + (open ? ' on' : '') + (dc.drag ? ' drag' : '')} data-sheet ref={sheet}>
          <div className="pf-handle" data-handle {...dc.handle} />
          {PICKS.map(([p, ic, t]) => <button key={p} className="pf-mli pf-rp" data-pick={p} onClick={() => { setOpen(false); setLog(<><b>{p}</b> 선택</>) }}><span className="pf-av"><Icon k={ic} /></span>{t}</button>)}
        </div>
      </div>
    </Pane>
  )
}

function SheetH() {
  const [act, setAct] = useState(false)
  const [sh, setSh] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>액션 시트는 <b>취소</b>가 따로 떨어져 있어요.</>)
  const sheet = useRef<HTMLDivElement>(null)
  const closeAll = (msg?: ReactNode) => { setAct(false); setSh(false); if (msg) setLog(msg) }
  const dc = useDragClose(sheet, () => closeAll(<><b>아래로 끌어서</b> 닫혔어요.</>))
  const pick = (p: string) => closeAll(p ? <><b>{p}</b> 선택</> : <><b>취소</b> — 아무것도 하지 않아요.</>)
  return (
    <Pane side="h" label="Action Sheet / Sheet" en="HIG" log={log}>
      <div className={'pf-scr' + (sh ? ' sheeted' : '')} data-scr>
        <div className="pf-under">
          <Photos />
          <div className="pf-center"><div className="pf-row">
            <button className="pf-hbtn" data-open="act" onClick={() => { setAct(true); setLog(<>떠 있는 <b>Action Sheet</b> — 취소 버튼이 따로 있어요.</>) }}>Action Sheet</button>
            <button className="pf-hbtn gray" data-open="sheet" onClick={() => { setSh(true); setLog(<><b>Sheet</b> — 뒤 화면이 살짝 작아지며 <b>카드처럼 겹쳐요</b>.</>) }}>Sheet</button>
          </div></div>
        </div>
        <div className={'pf-scrim' + (act || sh ? ' on' : '')} data-scrim onClick={() => closeAll(act ? <><b>바깥 탭</b> = 취소로 처리돼요.</> : <><b>바깥 탭</b>으로 닫혔어요.</>)} />
        <div className={'pf-hact' + (act ? ' on' : '')} data-act>
          <div className="g">
            <div className="ttl">이 사진을 어떻게 할까요?</div>
            <button data-pick="메시지" onClick={() => pick('메시지')}>메시지로 보내기</button>
            <button data-pick="링크 복사" onClick={() => pick('링크 복사')}>링크 복사</button>
            <button className="pf-red" data-pick="삭제" onClick={() => pick('삭제')}>삭제</button>
          </div>
          <div className="g cancel"><button className="bold" data-pick="" onClick={() => pick('')}>취소</button></div>
        </div>
        <div className={'pf-hsheet' + (sh ? ' on' : '') + (dc.drag ? ' drag' : '')} data-sheet ref={sheet}>
          <div className="pf-handle" data-handle {...dc.handle} />
          <div className="hd">
            <button className="pf-tint" data-close onClick={() => closeAll(<><b>취소</b>로 닫혔어요.</>)}>취소</button><span>새 앨범</span>
            <button className="pf-tint" data-close="done" style={{ fontWeight: 600 }} onClick={() => closeAll(<><b>완료</b> — 저장하고 닫혔어요.</>)}>완료</button>
          </div>
          <Lines widths={['60%', undefined, '75%']} />
        </div>
      </div>
    </Pane>
  )
}

export function Sheet() {
  return (
    <PfCard id="sheet" num="05" title="하단에서 올라오는 선택창" en="Bottom Panel" desc="지금 화면 위로 선택지나 부가 화면을 아래에서 올려요."
      diff={Diff3(
        ['Bottom Sheet (Standard · Modal)', 'Action Sheet (선택지) / Sheet (부가 화면)'],
        ['화면 바닥에 붙은 패널, 위쪽 드래그 손잡이, 큰 둥근 모서리', '액션 시트는 바닥에서 떠 있는 버튼 묶음 + 분리된 ‘취소’. 시트는 뒤 화면이 살짝 작아지며 카드처럼 겹쳐요'],
        ['손잡이를 끌어 내리거나 스크림을 눌러 닫아요', '액션 시트는 ‘취소’나 바깥 탭, 시트는 아래로 끌거나 취소·완료로 닫아요'],
      )}>
      <div className="demos"><SheetM /><SheetH /></div>
    </PfCard>
  )
}

/* ================= 06 잠깐 뜨고 사라지는 알림 ================= */
type Mail = [string, string, string]

function SnackM() {
  const { D } = useMotion()
  const timers = useTimers()
  const [list, setList] = useState<Mail[]>(() => MAILS.slice(0, 6))
  const [gone, setGone] = useState<Mail[]>([])
  const [snack, setSnack] = useState(false)
  const [toast, setToast] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>보관 아이콘을 눌러 보관하고 <b>실행취소</b>해 보세요.</>)
  const removed = useRef<{ r: Mail; i: number } | null>(null)
  const st = useRef<number>(undefined), tt = useRef<number>(undefined)

  const archive = (r: Mail, i: number) => {
    removed.current = { r, i }
    setGone(g => [...g, r])
    timers.set(() => { setList(l => l.filter(x => x !== r)); setGone(g => g.filter(x => x !== r)) }, D(200))
    setSnack(true)
    if (st.current !== undefined) timers.clear(st.current)
    st.current = timers.set(() => { setSnack(false); removed.current = null; setLog(<>4초가 지나 <b>저절로 사라졌어요</b>.</>) }, D(4000))
    setLog(<>하단 스낵바 — 4초 안에 <b>실행취소</b>할 수 있어요.</>)
  }
  const undo = () => {
    const r = removed.current
    if (!r) return
    if (st.current !== undefined) timers.clear(st.current)
    removed.current = null
    timers.set(() => setList(l => { const c = [...l]; c.splice(r.i, 0, r.r); return c }), D(220))
    setSnack(false)
    setLog(<>↩ <b>복구했어요</b> — 스낵바엔 동작 버튼을 붙일 수 있어요.</>)
  }
  return (
    <Pane side="m" label="Snackbar / Toast" en="Material · Toast는 안드로이드 OS" log={log}>
      <div className="pf-scr">
        <div className="pf-mbar sm"><b>받은편지함</b><span className="sp" />
          <button className="pf-mtext pf-rp" data-toast style={{ fontSize: 12 }} onClick={() => {
            setToast(true)
            if (tt.current !== undefined) timers.clear(tt.current); tt.current = timers.set(() => setToast(false), D(2000))
            setLog(<><b>Toast</b> — OS가 띄우는 짧은 문구, 버튼은 붙일 수 없어요.</>)
          }}>OS 토스트</button>
        </div>
        <div className="pf-body" data-mails>
          {list.length ? list.map((r, i) => (
            <div className={'pf-mrow' + (gone.includes(r) ? ' gone' : '')} key={r[1]} data-i={i}>
              <span className="pf-av">{r[0]}</span><span className="t">{r[1]}</span>
              <button className="pf-ib pf-rp" data-arc aria-label="보관" style={{ width: 32, height: 32, fontSize: 18 }} onClick={() => archive(r, i)}><Icon k="archive" /></button>
            </div>
          )) : <div className="muted" style={{ textAlign: 'center', padding: '40px 0' }}>모두 보관했어요</div>}
        </div>
        <div className={'pf-toast' + (toast ? ' on' : '')} data-toastel><i />Wi-Fi에 연결되었어요</div>
        <div className={'pf-snack' + (snack ? ' on' : '')} data-snack><span>대화 1개를 보관했어요</span><button className="pf-rp" data-undo onClick={undo}>실행취소</button></div>
      </div>
    </Pane>
  )
}

function BannerH() {
  const { D } = useMotion()
  const timers = useTimers()
  const [on, setOn] = useState(false)
  const [drag, setDrag] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>HIG엔 스낵바가 없어서 <b>직접 만든 배너</b>를 써요.</>)
  const ban = useRef<HTMLDivElement>(null)
  const bt = useRef<number>(undefined)
  const st = useRef<{ y: number; dy: number } | null>(null)
  const hide = (msg?: ReactNode) => {
    setOn(false)
    if (ban.current) ban.current.style.transform = ''
    if (bt.current !== undefined) timers.clear(bt.current)
    if (msg) setLog(msg)
  }
  const end = () => {
    const t = st.current
    if (!t) return
    st.current = null
    setDrag(false)
    if (t.dy < -16) hide(<><b>위로 밀어서</b> 닫았어요.</>)
    else if (t.dy === 0) hide(<><b>탭</b>해서 닫았어요. 보통은 관련 화면으로 이동해요.</>)
    else if (ban.current) ban.current.style.transform = ''
  }
  return (
    <Pane side="h" label="배너 · 커스텀 뷰" extra={<span className="pf-none">공식 컴포넌트 없음</span>} log={log}>
      <div className="pf-scr">
        <div className="pf-hbar"><span /><b className="pf-htitle">사진</b>
          <button className="pf-tint" data-save onClick={() => {
            setOn(true)
            if (bt.current !== undefined) timers.clear(bt.current); bt.current = timers.set(() => hide(<>3초 뒤 <b>저절로 올라갔어요</b> (직접 정한 규칙).</>), D(3000))
            setLog(<><b>커스텀 배너</b>가 위에서 내려왔어요. 위로 밀어 닫아 보세요.</>)
          }}>저장</button>
        </div>
        <Photos />
        <div className={'pf-banner' + (on ? ' on' : '') + (drag ? ' drag' : '')} data-banner ref={ban}
          onPointerDown={e => { st.current = { y: e.clientY, dy: 0 }; setDrag(true); e.currentTarget.setPointerCapture(e.pointerId) }}
          onPointerMove={e => {
            const t = st.current
            if (!t || !ban.current) return
            t.dy = Math.min(0, e.clientY - t.y)
            ban.current.style.transform = 'translateY(' + t.dy + 'px)'
          }}
          onPointerUp={end} onPointerCancel={end}>
          <span className="bi"><Icon k="check" /></span><span className="t"><b>사진을 저장했어요</b><small>앨범에서 확인할 수 있어요</small></span>
        </div>
      </div>
    </Pane>
  )
}

export function Snack() {
  return (
    <PfCard id="snack" num="06" title="잠깐 뜨고 사라지는 알림" en="Brief Message" desc="작업 결과를 짧게 알려주고 저절로 사라지는 메시지예요."
      diff={Diff3(
        ['Snackbar (앱 안) / Toast (안드로이드 OS가 띄우는 짧은 문구)', '공식 명칭 없음 — 배너나 커스텀 뷰로 직접 만들어요'],
        ['하단의 어두운 반전 색 막대, 액션 버튼은 최대 1개', '정해진 모양이 없어요. 흔히 위에서 내려오는 반투명 배너'],
        ['몇 초 뒤 저절로 사라지고, 실행취소 같은 동작을 붙일 수 있어요', '표시 시간·닫는 방법을 직접 정해요. 이 데모는 위로 밀거나 탭하면 닫혀요'],
      )}>
      <div className="demos"><SnackM /><BannerH /></div>
    </PfCard>
  )
}
