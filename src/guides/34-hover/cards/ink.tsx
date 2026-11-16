import { useRef, useState } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { Knob } from '../shared'
import { useHot } from '../util'

/* ---------- 02 밑줄 그리기 ---------- */
type Line = 'left' | 'center' | 'mark'
const LINKS = ['작업 모음', '쓰는 도구', '연락하기']
export function Underline() {
  const { hot, setHot, bind } = useHot()
  const [kind, setKind] = useState<Line>('left')
  const box = useRef<HTMLDivElement>(null)
  const items = useRef<HTMLButtonElement[]>([])
  const demo = useDemo({
    reset() { setHot(-1) },
    async play(c) {
      for (const i of [0, 1, 2]) { c.tap(box.current, items.current[i]); setHot(i); await c.sleep(800) }
      setHot(-1)
    },
  })
  const say = { left: <>밑줄이 <b>왼쪽에서</b> 그어져요 · 읽는 방향과 같아요</>, center: <>밑줄이 <b>가운데서</b> 양쪽으로 펴져요</>, mark: <>형광펜처럼 <b>아래에서</b> 차올라요</> }
  return (
    <Card id="hover-underline" num="02" title="밑줄 그리기" en="Underline Draw" demo={demo}
      desc="밑줄이 한쪽에서 그어지거나 형광펜처럼 채워져요. 글자 링크가 반응하는 가장 조용한 방법이에요.">
      <Stage log={hot >= 0 ? say[kind] : <>링크에 <b>커서를 올려</b> 보세요</>}>
        <div className="box hv-box" ref={box}>
          <nav className={'hv-ul ' + kind} aria-label="밑줄 데모">
            {LINKS.map((t, i) => (
              <button key={t} ref={el => { if (el) items.current[i] = el }} className={hot === i ? 'on' : ''} {...bind(i)}><span>{t}</span></button>
            ))}
          </nav>
          <div className="hv-ctrl">
            <Knob label="방식"><Seg value={kind} onChange={setKind} options={[['left', '왼쪽에서'], ['center', '가운데서'], ['mark', '형광펜']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['두께', '1–2px'], ['시간', '200–300ms'], ['간격', '글자 아래 2–4px']]}
        usage={[
          ['언제', '상단 메뉴, 바닥글 링크, 글 목록 제목처럼 글자만으로 된 링크'],
          ['원리', '밑줄을 배경 그림으로 그려 놓고 background-size를 0에서 100%로 늘려요. 이렇게 하면 두 줄로 넘어간 링크도 줄마다 밑줄이 그어져요.'],
          ['주의', '본문 한가운데 있는 링크는 올리기 전에도 밑줄이나 색으로 링크임이 보여야 해요. 호버에서만 밑줄이 생기는 건 메뉴처럼 링크인 게 뻔한 자리에서만 써요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 버튼 채우기 ---------- */
type Fill = 'left' | 'up' | 'circle'
export function FillSweep() {
  const { hot, setHot, bind } = useHot()
  const [dir, setDir] = useState<Fill>('left')
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const demo = useDemo({
    reset() { setHot(-1) },
    async play(c) {
      c.tap(box.current, btn.current); setHot(0); await c.sleep(1100)
      setHot(-1); await c.sleep(600)
      c.tap(box.current, btn.current); setHot(0); await c.sleep(900)
      setHot(-1)
    },
  })
  const say = { left: <>색이 <b>왼쪽에서</b> 밀려 들어와요 · 앞으로 나아가는 느낌</>, up: <>색이 <b>아래에서</b> 차올라요 · 묵직하고 차분한 느낌</>, circle: <>색이 <b>가운데서</b> 번져요 · 부드럽고 가벼운 느낌</> }
  return (
    <Card id="hover-fill" num="03" title="버튼 채우기" en="Fill Sweep" demo={demo}
      desc="테두리만 있던 버튼에 색이 밀려 들어와요. 들어오는 방향이 버튼의 성격을 만들어요.">
      <Stage log={hot === 0 ? say[dir] : <>버튼에 <b>커서를 올려</b> 보세요</>}>
        <div className="box hv-box" ref={box}>
          <div className="hv-fill-zone">
            <button ref={btn} className={`hv-fill ${dir}` + (hot === 0 ? ' on' : '')} {...bind(0)}><span>둘러보기</span></button>
          </div>
          <div className="hv-ctrl">
            <Knob label="방향"><Seg value={dir} onChange={setDir} options={[['left', '왼쪽에서'], ['up', '아래에서'], ['circle', '가운데서']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['시간', '250–400ms'], ['글자 색', '채움과 함께 반전'], ['나갈 때', '같은 길로 되돌아가기']]}
        usage={[
          ['언제', '테두리 버튼, 보조 버튼처럼 평소에는 조용하다가 올렸을 때만 힘을 주고 싶은 버튼'],
          ['원리', '버튼 뒤에 색 면을 하나 깔고 scaleX, scaleY, clip-path로 0에서 100%까지 펼쳐요. 글자 색은 채움과 같은 시간에 바꿔요.'],
          ['주의', '채워지는 도중에 글자와 배경이 비슷한 색이 되는 순간이 있어요. 400ms를 넘기면 그 순간이 눈에 띄고, 누르기 전에 기다리게 만들어요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 화살표 움직임 ---------- */
type Nudge = 'slide' | 'swap'
const ROWS = ['이번 달 소식', '자주 묻는 질문', '문의하기']
export function IconNudge() {
  const { hot, setHot, bind } = useHot()
  const [kind, setKind] = useState<Nudge>('slide')
  const box = useRef<HTMLDivElement>(null)
  const items = useRef<HTMLButtonElement[]>([])
  const demo = useDemo({
    reset() { setHot(-1) },
    async play(c) {
      for (const i of [0, 1, 2]) { c.tap(box.current, items.current[i]); setHot(i); await c.sleep(800) }
      setHot(-1)
    },
  })
  return (
    <Card id="hover-icon" num="06" title="화살표 움직임" en="Icon Nudge" demo={demo}
      desc="줄 끝의 화살표가 가는 방향으로 살짝 밀려요. 4px짜리 움직임으로 ‘다음으로 넘어가요’를 말해요.">
      <Stage log={hot < 0 ? <>줄에 <b>커서를 올려</b> 보세요</> : kind === 'slide' ? <>화살표가 <b>4px</b> 밀려요 · 가는 방향을 가리켜요</> : <>화살표가 나가고 <b>새 화살표</b>가 뒤따라 들어와요</>}>
        <div className="box hv-box" ref={box}>
          <div className={'hv-ic ' + kind}>
            {ROWS.map((t, i) => (
              <button key={t} ref={el => { if (el) items.current[i] = el }} className={hot === i ? 'on' : ''} {...bind(i)}>
                <b>{t}</b>
                <span className="hv-ic-a" aria-hidden="true"><i>→</i><i>→</i></span>
              </button>
            ))}
          </div>
          <div className="hv-ctrl">
            <Knob label="방식"><Seg value={kind} onChange={setKind} options={[['slide', '밀기'], ['swap', '갈아타기']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['이동', '3–6px'], ['시간', '150–250ms'], ['방향', '행동의 방향과 같게']]}
        usage={[
          ['언제', '‘더 보기’, 목록의 줄, 다음 단계 버튼처럼 눌렀을 때 어딘가로 넘어가는 것'],
          ['원리', '아이콘에만 transform을 줘요. 오른쪽 화살표는 오른쪽으로, 내려받기는 아래로, 바깥 링크는 대각선 위로 움직여야 뜻이 맞아요.'],
          ['주의', '글자까지 같이 밀면 줄 전체가 흔들려 보여요. 아이콘만 움직이고, 줄 어디에 올려도 반응하도록 줄 전체를 누르는 영역으로 잡아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 나머지 흐리게 ---------- */
type Dim = 'dim' | 'pop'
const TAGS = ['브랜딩', '웹', '앱', '편집', '그림', '사진']
export function DimOthers() {
  const { hot, setHot, bind } = useHot()
  const [kind, setKind] = useState<Dim>('dim')
  const box = useRef<HTMLDivElement>(null)
  const items = useRef<HTMLButtonElement[]>([])
  const demo = useDemo({
    reset() { setHot(-1) },
    async play(c) {
      for (const i of [1, 4, 2]) { c.tap(box.current, items.current[i]); setHot(i); await c.sleep(800) }
      setHot(-1)
    },
  })
  return (
    <Card id="hover-dim" num="07" title="나머지 흐리게" en="Dim Others" demo={demo}
      desc="하나에 올리면 나머지가 물러나요. 고른 것을 키우는 대신 주변을 낮춰서 눈에 띄게 해요.">
      <Stage log={hot < 0 ? <>항목에 <b>커서를 올려</b> 보세요</> : kind === 'dim' ? <>‘{TAGS[hot]}’만 남고 <b>나머지 다섯</b>이 흐려져요</> : <>‘{TAGS[hot]}’만 <b>색이 바뀌어요</b> · 나머지는 그대로</>}>
        <div className="box hv-box" ref={box}>
          <div className={`hv-dim ${kind}` + (hot >= 0 ? ' any' : '')}>
            {TAGS.map((t, i) => (
              <button key={t} ref={el => { if (el) items.current[i] = el }} className={hot === i ? 'on' : ''} {...bind(i)}>{t}</button>
            ))}
          </div>
          <div className="hv-ctrl">
            <Knob label="방식"><Seg value={kind} onChange={setKind} options={[['dim', '나머지 흐리게'], ['pop', '고른 것만 강조']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['흐림', '투명도 30–50%'], ['시간', '150–250ms'], ['항목', '4–12개']]}
        usage={[
          ['언제', '큰 글자 메뉴, 작업 목록, 로고 모음처럼 비슷한 항목이 나란히 있고 하나를 고르는 자리'],
          ['원리', 'CSS만으로 돼요. 묶음에 커서가 있는 동안 모든 항목을 흐리게 하고, 커서가 올라간 항목만 원래대로 되돌려요. (.묶음:hover .항목:not(:hover))'],
          ['주의', '항목 사이 틈을 지날 때마다 전부 밝아졌다 흐려져서 깜빡여요. 틈을 여백(padding)으로 채워 끊기지 않게 하고, 흐린 글자도 읽을 수 있는 정도로만 낮춰요.'],
        ]}
      />
    </Card>
  )
}
