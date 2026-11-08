import { Fragment, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { Hero, Icon, useOutside } from '../shared'

/* ---------- 02 케밥 ---------- */
const FILES: [string, string, string, string, string][] = [
  ['회의록.pdf', '회의록', 'PDF', '#e5484d', '어제 · 1.2MB'],
  ['디자인 시안.png', '디자인 시안', 'PNG', '#8e4ec6', '3일 전 · 4.8MB'],
  ['예산안.xlsx', '예산안', 'XLS', '#30a46c', '지난주 · 320KB'],
]
const KB_ACTIONS: [string, string, boolean?][] = [['↗', '열기'], ['✎', '이름 바꾸기'], ['⇪', '공유'], ['✕', '삭제', true]]
const KB_LOG = <>행 오른쪽 <b>⋮</b>를 눌러 더보기 열기</>

export function Kebab() {
  const m = useMotion()
  const timers = useTimers()
  const [cur, setCur] = useState<number | null>(null)
  const [pos, setPos] = useState<CSSProperties | undefined>(undefined)
  const [up, setUp] = useState(false)
  const [gone, setGone] = useState<number[]>([])
  const [hidden, setHidden] = useState<number[]>([])
  const [log, setLog] = useState<ReactNode>(KB_LOG)
  const box = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const big = useRef<HTMLButtonElement>(null)
  const first = useRef<HTMLButtonElement>(null)
  const rowBtns = () => [...(box.current?.querySelectorAll<HTMLElement>('.mi-row .mi-btn') ?? [])]

  const close = () => setCur(null)
  const openFor = (i: number) => {
    if (cur === i) { close(); setLog(<>같은 <b>⋮</b>를 다시 누르면 닫혀요</>); return }
    const b = rowBtns()[i], bx = box.current, mn = menu.current
    if (!b || !bx || !mn) return
    const r = m.rel(bx, b), mh = mn.offsetHeight, below = r.top + r.height + 4
    const isUp = below + mh > bx.clientHeight - 4
    setUp(isUp)
    setPos({ right: bx.clientWidth - r.left - r.width, top: isUp ? r.top - mh - 4 : below })
    setCur(i)
    setLog(<><b>{FILES[i][0]}</b>에 대한 작업만 모은 세로 메뉴</>)
  }
  const act = (a: string) => {
    const i = cur
    close()
    if (i === null) return
    const n = FILES[i][0]
    if (a === '삭제') {
      setGone(g => [...g, i])
      timers.set(() => setHidden(h => [...h, i]), m.D(260))
      setLog(<><b>{n}</b> 삭제 — 위험한 작업은 맨 아래 빨간색</>)
    } else setLog(<><b>{n}</b> · {a} 선택</>)
  }
  useOutside(cur !== null, () => [menu.current, ...rowBtns(), big.current], close)
  const demo = useDemo({
    reset() { timers.clear(); close(); setGone([]); setHidden([]); setLog(KB_LOG) },
    async play(c) {
      await c.press(box.current, rowBtns()[1] ?? null); await c.sleep(1300)
      await c.press(box.current, menu.current?.querySelectorAll<HTMLElement>('button')[2] ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="menu-icon-kebab" num="02" title="케밥" en="Kebab" demo={demo}
      desc="세로 점 세 개. 그 항목에 대한 추가 작업(더보기)을 세로 목록으로 열어요.">
      <Stage log={log} logId="menu-icon-kebab-log">
        <Hero k="kebab" label="케밥 아이콘 눌러보기" title="⋮ 세로 점 3개" sub="꼬치에 꿴 케밥처럼 세로로" hint="아래 파일 목록에서 열어보기 ↓" open={cur !== null} target={first} bigRef={big} />
        <div className="box left mi-box" ref={box}>
          <div className="mi-tool"><b>내 파일<small>3개</small></b></div>
          {FILES.map(([n, short, ft, bg, sub], i) => (
            <div key={n} className={'mi-row' + (cur === i ? ' sel' : '') + (gone.includes(i) ? ' gone' : '')} style={hidden.includes(i) ? { display: 'none' } : undefined}>
              <span className="mi-ft" style={{ background: bg }}>{ft}</span>
              <div className="grow"><b>{n}</b><small>{sub}</small></div>
              <button ref={i === 0 ? first : undefined} className={'mi-btn' + (cur === i ? ' is-open' : '')} aria-label={short + ' 더보기'} aria-expanded={cur === i}
                onClick={() => openFor(i)}><Icon k="kebab" /></button>
            </div>
          ))}
          <div ref={menu} className={'mi-menu' + (up ? ' up' : '') + (cur !== null ? ' on' : '')} role="menu" style={pos}>
            {KB_ACTIONS.map(([ic, a, danger]) => (
              <Fragment key={a}>
                {danger && <hr />}
                <button className={danger ? 'danger' : undefined} onClick={() => act(a)}><i>{ic}</i>{a}</button>
              </Fragment>
            ))}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['모양', '세로 점 3개'], ['여는 것', '세로 컨텍스트 메뉴'], ['흔한 위치', '목록 행 · 앱바 오른쪽']]}
        usage={[
          ['언제', '행마다 공간이 좁아 공유·이름 변경·삭제 같은 보조 작업을 접어둘 때'],
          ['주의', '가장 자주 쓰는 작업까지 숨기지 마세요. 삭제 같은 위험한 작업은 맨 아래, 빨간색으로'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 미트볼 ---------- */
const MB_LOG = <>카드 오른쪽 위 <b>⋯</b>를 눌러 보세요</>

export function Meatball() {
  const m = useMotion()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hiddenPost, setHiddenPost] = useState(false)
  const [log, setLog] = useState<ReactNode>(MB_LOG)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const big = useRef<HTMLButtonElement>(null)

  const set = (on: boolean) => {
    setOpen(on)
    menu.current?.querySelectorAll('button').forEach((b, i) => {
      m.clearA(b)
      if (on) m.A(b, [{ opacity: 0, transform: 'translateX(10px)' }, { opacity: 1, transform: 'none' }], 200, EASE.out, (3 - i) * 40)
    })
  }
  const act = (a: string) => {
    set(false)
    if (a === '저장') { const s = !saved; setSaved(s); setLog(s ? <><b>저장함</b>에 담았어요</> : <>저장을 <b>취소</b>했어요</>) }
    else if (a === '숨기기') { setHiddenPost(true); setLog(<>게시물을 <b>숨겼어요</b> — 되돌리기를 꼭 함께</>) }
    else setLog(<><b>{a}</b> 선택{a === '신고' ? ' — 위험·신고 작업은 빨간색으로 구분' : ''}</>)
  }
  useOutside(open, () => [menu.current, btn.current, big.current], () => set(false))
  const demo = useDemo({
    reset() { set(false); setHiddenPost(false); setSaved(false); setLog(MB_LOG) },
    async play(c) {
      await c.press(box.current, btn.current); await c.sleep(1300)
      await c.press(box.current, menu.current?.querySelector<HTMLElement>('[data-a="저장"]') ?? null); await c.sleep(400)
    },
  })

  const actions: [string, string, boolean?][] = [[saved ? '★' : '☆', '저장'], ['↗', '공유'], ['⊘', '숨기기'], ['⚑', '신고', true]]
  return (
    <Card id="menu-icon-meatball" num="03" title="미트볼" en="Meatball" demo={demo}
      desc="가로 점 세 개. 카드·게시물에 딸린 더보기 작업을 옆으로 펼쳐요.">
      <Stage log={log} logId="menu-icon-meatball-log">
        <Hero k="meat" label="미트볼 아이콘 눌러보기" title="⋯ 가로 점 3개" sub="접시 위 미트볼처럼 가로로" hint="아래 게시물에서 열어보기 ↓" open={open} target={btn} bigRef={big} />
        <div className="box left mi-box" ref={box}>
          <div className="mi-post" style={hiddenPost ? { display: 'none' } : undefined}>
            <div className="mi-post-h">
              <span className="av">J</span><div className="grow"><b>지우</b><small>2시간 전 · 바닷가</small></div>
              <button ref={btn} className={'mi-btn' + (open ? ' is-open' : '')} aria-label="게시물 더보기" aria-expanded={open}
                onClick={() => { set(!open); setLog(!open ? <>작업이 <b>가로로 펼쳐졌어요</b> — 카드 폭을 그대로 활용</> : '다시 누르면 접혀요') }}><Icon k="meat" /></button>
              <div ref={menu} className={'mi-hmenu' + (open ? ' on' : '')} role="menu">
                {actions.map(([ic, a, danger]) => (
                  <button key={a} data-a={a} className={danger ? 'danger' : undefined} onClick={() => act(a)}><i>{ic}</i>{a}</button>
                ))}
              </div>
            </div>
            <p>주말에 다녀온 바닷가, 물빛이 진짜 이랬어요</p>
            <div className="mi-photo" />
            <div className="mi-post-f"><span>♡ 24</span><span>댓글 3</span><span className={saved ? 'saved' : ''}>{saved ? '★ 저장됨' : ''}</span></div>
          </div>
          <div className="mi-hidden" style={hiddenPost ? { display: 'flex' } : undefined}>
            <span>게시물을 숨겼어요</span>
            <button onClick={() => { setHiddenPost(false); setLog(<><b>되돌렸어요</b></>) }}>되돌리기</button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['모양', '가로 점 3개'], ['여는 것', '가로 오버플로 메뉴'], ['흔한 위치', '카드 오른쪽 위 · 툴바 끝']]}
        usage={[
          ['언제', '가로 공간이 있는 카드·툴바에서 남는 작업을 접어둘 때'],
          ['vs 케밥', '역할은 같고 방향만 달라요. 한 서비스 안에서는 하나로 통일해요'],
        ]}
      />
    </Card>
  )
}
