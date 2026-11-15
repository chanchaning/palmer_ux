import { useRef, useState, type ReactNode } from 'react'
import { DemoPane, PairCard } from '../../../components/Card'
import { IcBack, IcBell, IcHeart, IcHome, IcKebab, IcMenu, IcPlus, IcSearch, IcShare, IcStar, IcTrash, IcUser } from './bits'
import { useOutside } from './useOutside'

/* ---------- 13 햄버거 vs 케밥 ---------- */
const SECTIONS = ['홈', '카테고리', '주문 내역', '설정']
const FILES0 = ['여행.jpg', '회의록.pdf', '예산.xlsx']

export function HamburgerVsKebab() {
  const [drawer, setDrawer] = useState(false)
  const [sec, setSec] = useState('홈')
  const [hLog, setHLog] = useState<ReactNode>(<>☰를 눌러 <b>앱의 다른 곳</b>으로 가 보세요</>)

  const wrap = useRef<HTMLDivElement>(null)
  const [files, setFiles] = useState(FILES0)
  const [open, setOpen] = useState<string | null>(null)
  const [kLog, setKLog] = useState<ReactNode>(<>⋮를 누르면 <b>그 줄에 대한</b> 작업만 나와요</>)
  useOutside(wrap, open !== null, () => setOpen(null))

  const act = (f: string, a: string) => {
    setOpen(null)
    if (a === '삭제') setFiles(fs => fs.filter(x => x !== f))
    if (a === '즐겨찾기') setFiles(fs => fs.map(x => (x === f ? (x.startsWith('★ ') ? x : '★ ' + x) : x)))
    setKLog(<>‘{f.replace('★ ', '')}’ 하나에만 <b>{a}</b> 적용</>)
  }

  return (
    <PairCard id="c-hamburger" num="13" a="햄버거" b="케밥" desc="앱 전체의 길(메뉴)을 열면 햄버거 ☰, 이 항목·이 화면에서 할 작업을 열면 케밥 ⋮."
      diff={[
        ['여는 것', '앱 전체 메뉴 · 어디로 갈지', '이 항목의 작업 · 무엇을 할지'],
        ['위치', '화면 위 왼쪽에 하나', '항목마다 오른쪽 · 화면 위 오른쪽'],
        ['모양', '가로줄 세 개 ☰', '세로 점 세 개 ⋮ (가로면 미트볼 ⋯)'],
      ]}>
      <DemoPane label="햄버거" en="Hamburger Menu" log={hLog}>
        <div className="stage phone">
          <div className="sm-appbar">
            <button className="sm-ib" aria-label="메뉴 열기" aria-expanded={drawer} onClick={() => setDrawer(true)}><IcMenu /></button>
            <b>{sec}</b>
          </div>
          <div className="app-mock"><div className="fake-line" style={{ width: '50%' }} /><div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} /></div>
          <div className={'scrim' + (drawer ? ' on' : '')} onClick={() => setDrawer(false)} />
          <nav className={'sm-drawer' + (drawer ? ' on' : '')} aria-label="앱 메뉴" aria-hidden={!drawer}>
            <div className="muted">모아마켓</div>
            {SECTIONS.map(s => (
              <button key={s} tabIndex={drawer ? 0 : -1} className={s === sec ? 'on' : ''} aria-current={s === sec ? 'page' : undefined}
                onClick={() => { setSec(s); setDrawer(false); setHLog(<>앱 안의 다른 곳 <b>‘{s}’</b>(으)로 이동</>) }}>{s}</button>
            ))}
          </nav>
        </div>
      </DemoPane>
      <DemoPane side="b" label="케밥" en="Kebab Menu" log={kLog}>
        <div className="stage sm-top" ref={wrap}>
          {files.length === 0 && <button className="btn sm ghost" onClick={() => { setFiles(FILES0); setKLog(<>파일을 <b>되돌렸어요</b></>) }}>파일 되돌리기</button>}
          {files.map(f => (
            <div className="sm-frow" key={f}>
              <span className="grow">{f}</span>
              <div className="sm-anchor">
                <button className="sm-ib" aria-label={`${f} 더보기`} aria-haspopup="menu" aria-expanded={open === f} onClick={() => setOpen(o => (o === f ? null : f))}><IcKebab /></button>
                {open === f && (
                  <div className="sm-menu right" role="menu">
                    {['즐겨찾기', '공유', '삭제'].map(a => <button key={a} role="menuitem" className={a === '삭제' ? 'danger' : ''} onClick={() => act(f, a)}>{a}</button>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 14 앱 바 vs 탭바 ---------- */
const PLACES = ['한옥 스테이', '바닷가 캠핑장', '숲속 오두막']
const TABS: [string, string, () => ReactNode][] = [['home', '홈', IcHome], ['search', '검색', IcSearch], ['bell', '알림', IcBell], ['me', '내 정보', IcUser]]

export function AppBarVsTabBar() {
  const [detail, setDetail] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [aLog, setALog] = useState<ReactNode>(<>항목을 눌러 <b>앱 바가 어떻게 바뀌는지</b> 보세요</>)
  const [tab, setTab] = useState('home')
  const [visits, setVisits] = useState<Record<string, number>>({ home: 1 })
  const tabName = TABS.find(t => t[0] === tab)?.[1]

  return (
    <PairCard id="c-appbar" num="14" a="앱 바" b="탭바" desc="지금 화면의 제목과 작업을 위에 두면 앱 바, 앱의 큰 구역 사이를 오가게 아래에 두면 탭바."
      diff={[
        ['위치', '화면 맨 위', '화면 맨 아래'],
        ['담는 것', '제목 · 뒤로 · 이 화면의 작업', '앱의 주요 구역 3~5개'],
        ['화면이 바뀌면', '제목과 버튼도 바뀌어요', '어디서든 같은 모양이에요'],
      ]}>
      <DemoPane label="앱 바" en="Top App Bar" log={aLog}>
        <div className="stage phone">
          <div className="sm-appbar">
            {detail && <button className="sm-ib" aria-label="뒤로" onClick={() => { setDetail(null); setALog(<>목록으로 · 제목과 버튼이 <b>다시 바뀜</b></>) }}><IcBack /></button>}
            <b className="grow">{detail ?? '숙소 목록'}</b>
            {detail ? (
              <>
                <button className="sm-ib" aria-label="찜하기" aria-pressed={liked} onClick={() => { setLiked(!liked); setALog(<>이 화면의 작업 <b>{liked ? '찜 해제' : '찜'}</b></>) }}><IcHeart on={liked} /></button>
                <button className="sm-ib" aria-label="공유" onClick={() => setALog(<>이 숙소를 <b>공유</b> · 앱 바의 작업은 이 화면 전용</>)}><IcShare /></button>
              </>
            ) : (
              <button className="sm-ib" aria-label="검색" onClick={() => setALog(<>목록 화면에서는 <b>검색</b>이 앱 바의 작업이에요</>)}><IcSearch /></button>
            )}
          </div>
          <div className="sm-body" key={detail ?? 'list'}>
            {detail ? (
              <><span className="sm-hero g3" aria-hidden="true" /><div className="fake-line" /><div className="fake-line" style={{ width: '60%' }} /></>
            ) : PLACES.map(p => (
              <button key={p} className="sm-li" onClick={() => { setDetail(p); setLiked(false); setALog(<>제목이 <b>‘{p}’</b>로, 버튼은 찜·공유로 바뀜</>) }}>{p}<span aria-hidden="true">›</span></button>
            ))}
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="탭바" en="Tab Bar" log={<>지금 <b>{tabName}</b> · 탭바는 어느 구역에서도 그대로</>}>
        <div className="stage phone">
          <div className="sm-body" key={tab}>
            <b>{tabName}</b>
            <div className="muted">이 구역에 {visits[tab] ?? 1}번째 왔어요</div>
            <div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} />
          </div>
          <nav className="tabbar sm-tabbar" aria-label="주요 구역">
            {TABS.map(([k, label, Ic]) => (
              <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined}
                onClick={() => { setTab(k); setVisits(v => ({ ...v, [k]: (v[k] ?? 0) + (k === tab ? 0 : 1) })) }}><Ic />{label}</button>
            ))}
          </nav>
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 18 FAB vs 아이콘 버튼 ---------- */
interface Note { id: number; text: string; star: boolean }
const NOTES0: Note[] = [{ id: 1, text: '장보기 목록', star: false }, { id: 2, text: '여름 휴가 계획', star: true }, { id: 3, text: '읽을 책', star: false }]

export function FabVsIconButton() {
  const [notes, setNotes] = useState(NOTES0.slice(0, 2))
  const [fLog, setFLog] = useState<ReactNode>(<>떠 있는 <b>+</b>는 이 화면의 주인공 행동이에요</>)
  const nextId = useRef(10)

  const [items, setItems] = useState(NOTES0)
  const [iLog, setILog] = useState<ReactNode>(<>줄마다 작은 버튼으로 <b>그 메모만</b> 다뤄요</>)

  return (
    <PairCard id="c-fab" num="18" a="FAB" b="아이콘 버튼" desc="화면에서 가장 중요한 행동 하나를 떠 있는 둥근 버튼으로 두면 FAB, 곁에서 돕는 작은 행동들은 아이콘 버튼."
      diff={[
        ['개수', '화면에 딱 하나', '여러 개 나란히'],
        ['위치', '화면 위에 떠서 고정 (오른쪽 아래)', '그 항목·도구 줄 바로 옆'],
        ['중요도', '주인공 행동 (새로 쓰기·추가)', '보조 행동 (별표·공유·삭제)'],
      ]}>
      <DemoPane label="FAB" en="Floating Action Button" log={fLog}>
        <div className="stage phone">
          <div className="sm-appbar"><b>메모</b></div>
          <div className="sm-body sm-scroll">
            {notes.map(n => <div className="sm-note" key={n.id}>{n.text}</div>)}
          </div>
          <button className="sm-fab" aria-label="새 메모 쓰기" onClick={() => {
            const id = nextId.current++
            setNotes(ns => [{ id, text: `새 메모 ${id - 9}`, star: false }, ...ns])
            setFLog(<><b>새 메모 {id - 9}</b> 추가 · 스크롤해도 + 는 제자리</>)
          }}><IcPlus size={22} /></button>
        </div>
      </DemoPane>
      <DemoPane side="b" label="아이콘 버튼" en="Icon Button" log={iLog}>
        <div className="stage sm-top">
          {items.length === 0 && <button className="btn sm ghost" onClick={() => setItems(NOTES0)}>메모 되돌리기</button>}
          {items.map(n => (
            <div className="sm-frow" key={n.id}>
              <span className="grow">{n.text}</span>
              <button className={'sm-ib' + (n.star ? ' on' : '')} aria-label={`${n.text} 별표`} aria-pressed={n.star}
                onClick={() => { setItems(is => is.map(x => (x.id === n.id ? { ...x, star: !x.star } : x))); setILog(<>‘{n.text}’ <b>{n.star ? '별표 해제' : '별표'}</b></>) }}><IcStar on={n.star} /></button>
              <button className="sm-ib" aria-label={`${n.text} 삭제`}
                onClick={() => { setItems(is => is.filter(x => x.id !== n.id)); setILog(<>‘{n.text}’ <b>삭제</b> · 작은 버튼은 보조 행동</>) }}><IcTrash /></button>
            </div>
          ))}
        </div>
      </DemoPane>
    </PairCard>
  )
}
