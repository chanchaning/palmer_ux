import { useRef, useState } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { Knob } from '../shared'
import { useHot } from '../util'

/* ---------- 01 떠오르는 카드 ---------- */
const GOODS: [string, string, number][] = [['도자기 머그', '18,000원', 24], ['리넨 앞치마', '32,000원', 205]]
export function Lift() {
  const { hot, setHot, bind } = useHot()
  const [rise, setRise] = useState(6)
  const box = useRef<HTMLDivElement>(null)
  const items = useRef<HTMLButtonElement[]>([])
  const demo = useDemo({
    reset() { setHot(-1) },
    async play(c) {
      for (const i of [0, 1]) { c.tap(box.current, items.current[i]); setHot(i); await c.sleep(1000) }
      setHot(-1)
    },
  })
  return (
    <Card id="hover-lift" num="01" title="떠오르는 카드" en="Lift" demo={demo}
      desc="카드가 살짝 올라오고 그림자가 넓어져요. ‘이 카드는 통째로 누를 수 있어요’를 알려주는 가장 흔한 신호예요.">
      <Stage log={hot >= 0 ? <>‘{GOODS[hot][0]}’가 <b>{rise}px</b> 올라오고 그림자가 넓어졌어요</> : <>카드에 <b>커서를 올려</b> 보세요</>}>
        <div className="box hv-box" ref={box}>
          <div className="hv-lift-row" style={{ ['--rise' as string]: rise + 'px' }}>
            {GOODS.map(([name, price, h], i) => (
              <button key={name} ref={el => { if (el) items.current[i] = el }} className={'hv-lift' + (hot === i ? ' on' : '')} {...bind(i)}>
                <i style={{ ['--h' as string]: h }} aria-hidden="true" />
                <b>{name}</b><span>{price}</span>
              </button>
            ))}
          </div>
          <div className="hv-ctrl">
            <Knob label="높이"><Seg value={rise} onChange={setRise} options={[[2, '2px'], [6, '6px'], [16, '16px']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['이동', '2–6px'], ['시간', '150–250ms'], ['그림자', '함께 넓어지게']]}
        usage={[
          ['언제', '상품, 글, 프로젝트처럼 카드 전체가 하나의 링크일 때'],
          ['원리', 'transform으로 위로 올리고 그림자의 번짐과 거리를 같이 키워요. 물건이 바닥에서 뜨면 그림자가 멀어지는 것과 같은 이치예요.'],
          ['주의', '16px처럼 높이 뜨면 커서가 카드 아래 틈으로 빠져서 올라갔다 내려갔다 떨어요. 누를 수 없는 카드에는 쓰지 않아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 사진 확대 ---------- */
type ZoomMode = 'inside' | 'whole'
const SHOTS: [string, number][] = [['아침 숲', 150], ['저녁 바다', 215]]
export function Zoom() {
  const { hot, setHot, bind } = useHot()
  const [mode, setMode] = useState<ZoomMode>('inside')
  const box = useRef<HTMLDivElement>(null)
  const items = useRef<HTMLButtonElement[]>([])
  const demo = useDemo({
    reset() { setHot(-1) },
    async play(c) {
      for (const i of [0, 1]) { c.tap(box.current, items.current[i]); setHot(i); await c.sleep(1100) }
      setHot(-1)
    },
  })
  return (
    <Card id="hover-zoom" num="04" title="사진 확대" en="Image Zoom" demo={demo}
      desc="틀은 그대로 두고 안의 사진만 조금 커져요. 틀째 키우면 옆 칸을 덮어요.">
      <Stage log={hot < 0 ? <>사진에 <b>커서를 올려</b> 보세요</> : mode === 'inside' ? <>틀은 그대로, 안쪽 사진만 <b>108%</b> · 옆 칸을 건드리지 않아요</> : <>틀째 <b>108%</b> · 옆 사진과 글자를 덮어요</>}>
        <div className="box hv-box" ref={box}>
          <div className={'hv-zoom-row ' + mode}>
            {SHOTS.map(([name, h], i) => (
              <button key={name} ref={el => { if (el) items.current[i] = el }} className={'hv-zoom' + (hot === i ? ' on' : '')} {...bind(i)}>
                <span className="hv-zoom-frame"><i style={{ ['--h' as string]: h }} aria-hidden="true" /></span>
                <b>{name}</b>
              </button>
            ))}
          </div>
          <div className="hv-ctrl">
            <Knob label="키우는 것"><Seg value={mode} onChange={setMode} options={[['inside', '안쪽 사진만'], ['whole', '틀째']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['확대', '103–110%'], ['시간', '300–500ms'], ['틀', 'overflow: hidden']]}
        usage={[
          ['언제', '사진 모음, 글 목록의 대표 사진, 상품 사진처럼 그림이 주인공인 격자'],
          ['원리', '틀에 overflow: hidden을 주고 안의 사진만 scale로 키워요. 넘친 부분이 틀에 잘려서 사진이 다가오는 것처럼 보여요.'],
          ['주의', '사진은 천천히(300ms 이상) 움직여야 고급스럽고, 빠르면 툭 튀어요. 얼굴이나 글자가 가장자리에 있으면 잘려 나가니 5–8%면 충분해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 설명 올라오기 ---------- */
type CapMode = 'slide' | 'fade' | 'always'
export function Caption() {
  const { hot, setHot, bind } = useHot()
  const [mode, setMode] = useState<CapMode>('slide')
  const box = useRef<HTMLDivElement>(null)
  const tile = useRef<HTMLButtonElement>(null)
  const demo = useDemo({
    reset() { setHot(-1) },
    async play(c) { c.tap(box.current, tile.current); setHot(0); await c.sleep(1700); setHot(-1) },
  })
  const on = hot === 0
  return (
    <Card id="hover-caption" num="05" title="설명 올라오기" en="Caption Reveal" demo={demo}
      desc="사진 위로 제목과 설명이 올라와요. 깔끔하지만, 커서가 없는 화면에서는 영영 안 보일 수 있어요.">
      <Stage log={mode === 'always' ? <>설명이 <b>늘 보여요</b> · 터치 화면에서는 이 모습이어야 해요</> : on ? <>설명이 {mode === 'slide' ? <><b>아래에서</b> 올라왔어요</> : <><b>서서히</b> 나타났어요</>} · 사진은 어두워져서 글자가 읽혀요</> : <>올리기 전에는 <b>무슨 사진인지</b> 알 수 없어요</>}>
        <div className="box hv-box" ref={box}>
          <button ref={tile} className={`hv-cap ${mode}` + (on ? ' on' : '')} {...bind(0)}>
            <i aria-hidden="true" />
            <span className="hv-cap-t"><b>겨울 작업 노트</b><span>도자기 유약 실험 열두 번의 기록</span></span>
          </button>
          <div className="hv-ctrl">
            <Knob label="설명"><Seg value={mode} onChange={setMode} options={[['slide', '올라오기'], ['fade', '서서히'], ['always', '늘 보이기']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['이동', '8–16px'], ['시간', '200–300ms'], ['어둡게', '검정 40–60%']]}
        usage={[
          ['언제', '작품 모음처럼 그림을 먼저 보여주고 싶고, 글은 궁금할 때만 보면 되는 격자'],
          ['원리', '설명을 아래로 살짝 내려 투명하게 둔 뒤, 올리면 제자리로 올려요. 사진 위에 어두운 막을 같이 깔아야 흰 글자가 읽혀요.'],
          ['주의', '제목이나 가격처럼 꼭 알아야 하는 정보를 호버 뒤에 숨기면 안 돼요. @media (hover: none)에서는 ‘늘 보이기’로 바꾸고, 키보드 초점에도 똑같이 보여줘요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 스포트라이트 ---------- */
const PLANS: [string, string][] = [['기록', '하루를 한 줄로'], ['검색', '단어 하나로 찾기'], ['공유', '링크로 보여주기'], ['보관', '오래된 건 접어 두기']]
export function Spotlight() {
  const [size, setSize] = useState(150)
  const [live, setLive] = useState(false)
  const grid = useRef<HTMLDivElement>(null)
  /** 카드마다 ‘자기 기준’ 커서 좌표를 넘겨요. 빛 하나가 여러 카드에 걸쳐 보여요. */
  const move = (cx: number, cy: number) => {
    grid.current?.querySelectorAll<HTMLElement>('.hv-sp-c').forEach(el => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--x', (cx - r.left).toFixed(1) + 'px')
      el.style.setProperty('--y', (cy - r.top).toFixed(1) + 'px')
    })
    setLive(true)
  }
  const demo = useDemo({
    reset() { setLive(false) },
    async play(c) {
      const g = grid.current
      if (!g) return
      const N = 110
      for (let i = 0; i <= N; i++) {
        const r = g.getBoundingClientRect(), a = (i / N) * Math.PI * 2.5 - 2.4
        move(r.left + r.width * (0.5 + 0.36 * Math.cos(a)), r.top + r.height * (0.5 + 0.36 * Math.sin(a)))
        await c.sleep(16)
      }
      setLive(false)
    },
  })
  return (
    <Card id="hover-spotlight" num="08" title="스포트라이트" en="Spotlight" demo={demo}
      desc="커서 주변만 은은하게 밝아지고 테두리에 빛이 따라와요. 카드 여러 장이 한 판처럼 묶여 보여요.">
      <Stage log={live ? <>빛 하나가 <b>여러 카드의 테두리</b>에 걸쳐 보여요</> : <>카드 위에서 커서를 <b>천천히</b> 움직여 보세요</>}>
        <div className="box hv-box">
          <div className={'hv-sp' + (live ? ' live' : '')} ref={grid} style={{ ['--size' as string]: size + 'px' }}
            onPointerMove={e => move(e.clientX, e.clientY)} onPointerLeave={e => { if (e.pointerType !== 'touch') setLive(false) }}>
            {PLANS.map(([t, d]) => (
              <div key={t} className="hv-sp-c"><div className="hv-sp-in"><b>{t}</b><span>{d}</span></div></div>
            ))}
          </div>
          <div className="hv-ctrl">
            <Knob label="빛 크기"><Seg value={size} onChange={setSize} options={[[90, '작게'], [150, '보통'], [260, '크게']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['빛 반지름', '120–200px'], ['세기', '투명도 10–25%'], ['갱신', '커서 이동마다']]}
        usage={[
          ['언제', '기능 소개 격자, 요금제 카드처럼 어두운 배경 위에 비슷한 카드가 나란히 있을 때'],
          ['원리', '커서 좌표를 CSS 변수로 넘기고, 그 자리에 둥근 그러데이션을 그려요. 테두리와 안쪽 면에 같은 좌표를 쓰면 빛이 카드 경계를 넘나드는 것처럼 보여요.'],
          ['주의', '밝은 배경에서는 거의 안 보여요. 분위기를 더하는 장식일 뿐이라, 어떤 카드를 고르고 있는지는 테두리 색처럼 다른 신호로도 알려줘야 해요.'],
        ]}
      />
    </Card>
  )
}
