import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { Hero, Icon, useOutside } from '../shared'

/* ---------- 01 햄버거 ---------- */
const NAV: [string, string][] = [['⌂', '홈'], ['⌕', '검색'], ['☆', '저장함'], ['◔', '알림'], ['⚙', '설정']]
const HB_LOG = <>왼쪽 위 <b>≡</b>를 눌러 사이드 메뉴 열기</>

export function Hamburger() {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState('홈')
  const [log, setLog] = useState<ReactNode>(HB_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const drawer = useRef<HTMLElement>(null)

  const set = (on: boolean, msg?: ReactNode) => {
    setOpen(on)
    setLog(msg ?? (on ? <>≡ → <b>X</b>로 바뀌며 드로어가 열렸어요</> : <><b>X</b>를 눌러 닫았어요 — 다시 ≡로</>))
  }
  const demo = useDemo({
    reset() { set(false, HB_LOG); setSel('홈') },
    async play(c) {
      await c.press(dev.current, btn.current); await c.sleep(1300)
      await c.press(dev.current, drawer.current?.querySelectorAll<HTMLElement>('.mi-nav')[2] ?? null); await c.sleep(500)
    },
  })

  return (
    <Card id="menu-icon-hamburger" num="01" title="햄버거" en="Hamburger" demo={demo}
      desc="가로선 세 개. 화면 밖에 숨겨둔 전체 메뉴(내비게이션)를 열어요.">
      <Stage log={log} logId="menu-icon-hamburger-log">
        <Hero k="hb" label="햄버거 아이콘 눌러보기" title="≡ 가로선 3개" sub="열리면 X로 바뀌어 ‘닫기’가 돼요" hint="아래 폰에서 실제로 열어보기 ↓" open={open} target={btn} />
        <Device ref={dev}>
          <div className="scr">
            <div className="bar"><span style={{ width: 34, flex: 'none' }} /><span>{sel}</span></div>
            <div className="pad">
              <div className="fake-line" style={{ width: '45%' }} />
              <div className="mi-feed" />
              <div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} />
              <div className="mi-feed" />
              <div className="fake-line" style={{ width: '60%' }} />
            </div>
          </div>
          <button ref={btn} className={'mi-btn mi-fixed' + (open ? ' is-open' : '')} aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open}
            onClick={() => set(!open)}><Icon k="hb" /></button>
          <div className={'mi-scrim' + (open ? ' on' : '')} onClick={() => set(false, <><b>바깥(배경)</b>을 눌러도 닫혀요</>)} />
          <nav ref={drawer} className={'mi-drawer' + (open ? ' on' : '')} aria-label="전체 메뉴">
            <div className="mi-prof"><span className="av">P</span><div className="grow"><b>Palmer</b><small>palmer@mail.com</small></div></div>
            {NAV.map(([ic, t]) => (
              <button key={t} className={'mi-nav' + (sel === t ? ' on' : '')}
                onClick={() => { setSel(t); set(false, <><b>{t}</b>(으)로 이동 — 고르면 드로어는 자동으로 닫혀요</>) }}><i>{ic}</i>{t}</button>
            ))}
          </nav>
        </Device>
      </Stage>
      <Info
        spec={[['모양', '가로선 3개'], ['여는 것', '사이드 드로어'], ['흔한 위치', '앱바 왼쪽 위']]}
        usage={[
          ['언제', '이동할 곳이 5개보다 많고, 자주 쓰지 않는 메뉴까지 담아야 할 때'],
          ['주의', '숨기면 덜 눌러요. 자주 쓰는 3~5개는 하단 탭바로 꺼내 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 와플 ---------- */
const APPS: [string, string, string][] = [
  ['메일', '#c92a2a', '✉'], ['캘린더', '#3b5bfd', '31'], ['드라이브', '#f5a524', '▲'], ['문서', '#0091ff', '≣'], ['시트', '#18794e', '▦'],
  ['슬라이드', '#f76b15', '▭'], ['사진', '#d6409f', '◉'], ['채팅', '#12a594', '✦'], ['메모', '#8e4ec6', '✓'],
]
const WF_LOG = <>오른쪽 위 <b>▦</b>로 다른 앱으로 건너가기</>

export function Waffle() {
  const m = useMotion()
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState<number | undefined>(undefined)
  const [app, setApp] = useState('메일')
  const [log, setLog] = useState<ReactNode>(WF_LOG)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const big = useRef<HTMLButtonElement>(null)

  const set = (on: boolean) => {
    if (on && box.current && btn.current) { const r = m.rel(box.current, btn.current); setTop(r.top + r.height + 6) }
    setOpen(on)
  }
  useOutside(open, () => [menu.current, btn.current, big.current], () => set(false))
  const demo = useDemo({
    reset() { set(false); setApp('메일'); setLog(WF_LOG) },
    async play(c) {
      await c.press(box.current, btn.current); await c.sleep(1300)
      await c.press(box.current, menu.current?.querySelectorAll<HTMLElement>('button')[1] ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="menu-icon-waffle" num="04" title="와플" en="Waffle" demo={demo}
      desc="3×3 네모. 같은 회사의 다른 앱·서비스로 건너가는 런처를 열어요.">
      <Stage log={log} logId="menu-icon-waffle-log">
        <Hero k="waffle" label="와플 아이콘 눌러보기" title="▦ 3×3 사각형" sub="와플 격자처럼 네모 9칸" hint="아래 웹 헤더에서 열어보기 ↓" open={open} target={btn} bigRef={big} />
        <div className="box left mi-box" ref={box}>
          <div className="mi-webbar">
            <b className="mi-logo"><i>◆</i>워크스페이스 · {app}</b>
            <button ref={btn} className={'mi-btn' + (open ? ' is-open' : '')} aria-label="앱 런처" aria-expanded={open}
              onClick={() => { set(!open); setLog(!open ? <>같은 계정의 <b>다른 앱 9개</b>로 가는 런처</> : '런처를 닫았어요') }}><Icon k="waffle" /></button>
            <span className="av">P</span>
          </div>
          <div className="mi-webbody">
            <div className="col"><div className="fake-line" /><div className="fake-line" style={{ width: '80%' }} /><div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" style={{ width: '85%' }} /></div>
            <div className="col"><div className="fake-line" style={{ width: '50%' }} /><div className="fake-line" /><div className="fake-line" style={{ width: '90%' }} /><div className="fake-line" style={{ width: '70%' }} /><div className="fake-line" /><div className="fake-line" style={{ width: '40%' }} /></div>
          </div>
          <div ref={menu} className={'mi-menu mi-launch' + (open ? ' on' : '')} role="menu" style={top === undefined ? undefined : { top, right: 8 }}>
            {APPS.map(([a, bg, ic]) => (
              <button key={a} onClick={() => { set(false); setApp(a); setLog(<><b>{a}</b> 앱으로 건너갔어요 — 이 앱의 메뉴가 아니라 다른 앱</>) }}>
                <i className="mi-app" style={{ background: bg }}>{ic}</i>{a}
              </button>
            ))}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['모양', '3×3 사각형'], ['여는 것', '앱 런처'], ['흔한 위치', '웹 헤더 오른쪽 위']]}
        usage={[
          ['언제', '여러 제품을 함께 쓰는 업무 도구·포털에서 앱 사이를 오갈 때'],
          ['주의', '이 앱 안의 메뉴가 아니라 ‘다른 앱으로 가는 문’이에요. 햄버거와 역할을 섞지 마세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 벤토 ---------- */
const BT_LOG = <><b>⁘ 전체</b>를 눌러 서비스 타일 열기</>

export function Bento() {
  const m = useMotion()
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<ReactNode>(BT_LOG)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const sheet = useRef<HTMLDivElement>(null)

  const set = (on: boolean) => {
    setOpen(on)
    if (on) sheet.current?.querySelectorAll('.mi-bento button').forEach((t, i) => {
      m.clearA(t)
      m.A(t, [{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'none' }], 260, EASE.spring, 40 + i * 35)
    })
  }
  const go = (a: string) => { set(false); setLog(<><b>{a}</b> 서비스로 이동</>) }
  const demo = useDemo({
    reset() { set(false); setLog(BT_LOG) },
    async play(c) {
      await c.press(box.current, btn.current); await c.sleep(1500)
      await c.press(box.current, sheet.current?.querySelector<HTMLElement>('[data-a="택시"]') ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="menu-icon-bento" num="05" title="벤토" en="Bento" demo={demo}
      desc="3×3 점. 칸칸이 나뉜 도시락처럼 전체 서비스를 크기가 다른 타일로 보여줘요.">
      <Stage log={log} logId="menu-icon-bento-log">
        <Hero k="bento" label="벤토 아이콘 눌러보기" title="⁘ 3×3 점" sub="와플과 닮았지만 점으로 그려요" hint="아래 앱 홈에서 열어보기 ↓" open={open} target={btn} />
        <div className="box left mi-box" ref={box}>
          <div className="mi-tool">
            <div><b>홈</b><div className="mi-hello">안녕하세요, Palmer님</div></div>
            <button ref={btn} className="mi-btn lbl" aria-label="전체 서비스" aria-expanded={open}
              onClick={() => { set(true); setLog(<>크기가 다른 <b>도시락 칸</b> — 자주 쓰는 송금이 가장 커요</>) }}><Icon k="bento" />전체</button>
          </div>
          <div className="mi-bal"><small>내 지갑</small><b>1,284,500원</b></div>
          <div className="mi-quick"><span /><span /><span /></div>
          <div className="fake-line" style={{ width: '70%' }} /><div className="fake-line" style={{ width: '50%' }} />
          <div ref={sheet} className={'mi-sheet' + (open ? ' on' : '')} role="dialog" aria-label="전체 서비스">
            <div className="mi-tool"><b>전체 서비스<small>8개</small></b>
              <button className="mi-btn" aria-label="닫기" onClick={() => { set(false); setLog(<>전체 서비스를 <b>닫았어요</b></>) }}>✕</button>
            </div>
            <div className="mi-bento">
              <button className="w2 h2 hot" data-a="송금" onClick={() => go('송금')}><i>⇄</i><span>송금<br /><small>수수료 0원</small></span></button>
              <button className="w2" data-a="결제" onClick={() => go('결제')}><i>▣</i>결제</button>
              {([['◫', '쇼핑'], ['◔', '배달'], ['◈', '택시'], ['✈', '여행']] as const).map(([ic, a]) => (
                <button key={a} data-a={a} onClick={() => go(a)}><i>{ic}</i>{a}</button>
              ))}
              <button className="w2 warm" data-a="포인트" onClick={() => go('포인트')}><i>★</i>포인트 3,200P</button>
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['모양', '3×3 점'], ['여는 것', '전체 서비스 타일'], ['흔한 위치', '슈퍼앱 홈 오른쪽 위']]}
        usage={[
          ['언제', '송금·쇼핑·이동처럼 서비스가 많은 앱의 ‘전체 보기’'],
          ['주의', '와플과 거의 같아 보여요. ‘전체’ 같은 라벨을 붙이고, 자주 쓰는 서비스를 큰 칸에 둬요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 베지 버거 ---------- */
const SECTIONS = ['소개', '작업', '서비스', '문의']
const VG_LOG = <>오른쪽 위 아이콘으로 <b>위에서 펼치기</b></>

export function Veggie() {
  const [open, setOpen] = useState(false)
  const [sec, setSec] = useState('소개')
  const [log, setLog] = useState<ReactNode>(VG_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const drop = useRef<HTMLDivElement>(null)

  const set = (on: boolean, msg?: ReactNode) => {
    setOpen(on)
    setLog(msg ?? (on ? <>가운데 선이 빠지며 <b>X</b> — 메뉴가 헤더 아래로 내려와요</> : <>다시 <b>베지 버거</b>로</>))
  }
  const demo = useDemo({
    reset() { set(false, VG_LOG); setSec('소개') },
    async play(c) {
      await c.press(dev.current, btn.current); await c.sleep(1300)
      await c.press(dev.current, drop.current?.querySelectorAll<HTMLElement>('.lk')[1] ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="menu-icon-veggie" num="07" title="베지 버거" en="Veggie Burger" demo={demo}
      desc="가운데 선만 짧은 햄버거. 헤더 아래로 펼쳐지는 메뉴를 열어요.">
      <Stage log={log} logId="menu-icon-veggie-log">
        <Hero k="veg" label="베지 버거 아이콘 눌러보기" title="≡ 가운데가 짧은 선" sub="패티 대신 채소가 얇게 끼인 버거" hint="아래 모바일 웹에서 열어보기 ↓" open={open} target={btn} />
        <Device ref={dev}>
          <div className="scr">
            <div className="mi-vbar">
              <b><i>◐</i> 스튜디오 <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>· {sec}</span></b>
              <button ref={btn} className={'mi-btn' + (open ? ' is-open' : '')} aria-label="메뉴 펼치기" aria-expanded={open} onClick={() => set(!open)}><Icon k="veg" /></button>
            </div>
            <div className="pad">
              <div className="mi-hero-band">작고 단단한<br />브랜드를 만들어요</div>
              <div className="fake-line" /><div className="fake-line" style={{ width: '80%' }} /><div className="fake-line" style={{ width: '65%' }} />
              <div className="fake-line" style={{ width: '90%' }} /><div className="fake-line" style={{ width: '50%' }} />
            </div>
          </div>
          <div ref={drop} className={'mi-drop' + (open ? ' on' : '')}>
            <div className={'mi-scrim' + (open ? ' on' : '')} onClick={() => set(false, <><b>아래 빈 곳</b>을 눌러 닫았어요</>)} />
            <div className="mi-drop-in">
              {SECTIONS.map(s => (
                <button key={s} className={'lk' + (sec === s ? ' on' : '')} onClick={() => { setSec(s); set(false, <><b>{s}</b> 페이지로 이동했어요</>) }}>{s}<span>→</span></button>
              ))}
              <button className="btn orange sm" onClick={() => set(false, <><b>상담 신청</b> 페이지로 이동했어요</>)}>상담 신청하기</button>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['모양', '가운데가 짧은 ≡'], ['여는 것', '헤더 아래 펼침 메뉴'], ['흔한 위치', '모바일 웹 헤더 오른쪽']]}
        usage={[
          ['언제', '브랜드·포트폴리오 사이트처럼 아이콘에도 개성을 주고 싶을 때'],
          ['주의', '결국 햄버거로 읽혀요. 모양은 바꿔도 여는 동작과 닫기(X)는 예측 가능하게'],
        ]}
      />
    </Card>
  )
}
