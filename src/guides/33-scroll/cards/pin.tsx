import { useRef, useState } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { Knob, Para, View } from '../shared'
import { clamp, reduced, useScroller } from '../util'

/* ---------- 03 스티키 헤더 ---------- */
type HMode = 'fixed' | 'shrink' | 'smart'
const ROWS = ['월요일 회의 정리', '새 화면 시안 공유', '검색 개선 안내', '이번 주 배포 일정', '사용성 점검 결과', '휴가 일정 모음', '다음 달 목표', '자주 묻는 질문', '지난 소식 모아 보기']
export function Sticky() {
  const s = useScroller()
  const last = useRef(0)
  const [mode, setMode] = useState<HMode>('smart')
  const [small, setSmall] = useState(false)
  const [hidden, setHidden] = useState(false)
  const onScroll = (el: HTMLDivElement) => {
    const y = el.scrollTop, d = y - last.current
    setSmall(y > 24)
    if (y < 64) { setHidden(false); last.current = y; return }
    if (Math.abs(d) <= 3) return // 손떨림 정도는 방향으로 치지 않아요
    setHidden(d > 0)
    last.current = y
  }
  const demo = useDemo({
    reset() { s.home(); last.current = 0; setSmall(false); setHidden(false) },
    async play(c) {
      await s.glide(c, 240, 1500); await c.sleep(600)
      await s.glide(c, 170, 700); await c.sleep(800) // 살짝만 올려도 돌아와요
      await s.glide(c, 0, 900)
    },
  })
  const cls = 'sc-hd' + (small ? ' lifted' : '') + (mode === 'shrink' && small ? ' small' : '') + (mode === 'smart' && hidden ? ' hidden' : '')
  return (
    <Card id="scroll-sticky" num="03" title="스티키 헤더" en="Sticky Header" demo={demo}
      desc="머리글이 위에 붙어서 따라와요. 늘 붙여 둘지, 줄일지, 내릴 때는 숨길지에 따라 본문 자리가 달라져요.">
      <Stage log={mode === 'fixed' ? <>머리글이 늘 <b>60px</b>을 차지해요 · 가장 단순하고 예측하기 쉬워요</>
        : mode === 'shrink' ? (small ? <><b>40px</b>로 줄었어요 · 제목만 남기고 자리를 돌려줘요</> : <>맨 위에서는 <b>크게</b>, 내리면 줄어들어요</>)
          : hidden ? <>내리는 동안은 <b>숨어요</b> · 본문이 창을 다 써요</> : <>살짝 <b>올리면</b> 바로 돌아와요 · 맨 위까지 갈 필요가 없어요</>}>
        <div className="box left sc-box">
          <View s={s} label="스티키 헤더 데모" onScroll={onScroll}>
            <div className={cls}>
              <div className="sc-hd-bar"><b>소식</b><span className="sc-hd-ico" aria-hidden="true" /></div>
            </div>
            <ul className="sc-rows">
              {ROWS.map((r, i) => <li key={r}><b>{r}</b><span>{i + 1}일 전</span></li>)}
            </ul>
          </View>
          <div className="sc-ctrl">
            <Knob label="방식"><Seg value={mode} onChange={setMode} options={[['fixed', '항상 고정'], ['shrink', '줄어들기'], ['smart', '숨었다 나오기']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['높이', '48–64px'], ['숨김·등장', '200–250ms'], ['방향 판정', '3–10px 이상']]}
        usage={[
          ['언제', '긴 목록이나 글에서 검색, 뒤로 가기, 장바구니처럼 늘 손 닿는 데 있어야 하는 기능이 있을 때'],
          ['원리', '붙이는 건 position: sticky 한 줄이면 돼요. ‘숨었다 나오기’는 직전 위치와 비교해 내리는 중이면 위로 밀어 올리고, 올리는 중이면 다시 내려요.'],
          ['주의', <>화면이 작은데 머리글이 크면 본문이 창문만 해져요. 숨길 때는 높이를 바꾸지 말고 transform으로 밀어야 본문이 덜컥거리지 않아요. 배치는 <a href="#/layout/layout-sticky">앱 화면 구성 › 고정 헤더</a>도 같이 보세요.</>],
        ]}
      />
    </Card>
  )
}
/* ---------- 04 가로 스크롤 ---------- */
const PANELS: [string, string, string][] = [
  ['01', '기획', '무엇을 왜 만드는지 정해요'], ['02', '설계', '화면과 흐름을 그려요'], ['03', '디자인', '모양과 움직임을 입혀요'],
  ['04', '개발', '실제로 돌아가게 만들어요'], ['05', '출시', '내보내고 반응을 봐요'],
]
type HzMode = 'pin' | 'native'
function Panels() {
  return <>{PANELS.map(([n, t, d], i) => (
    <div key={n} className="sc-hz-panel" style={{ ['--h' as string]: 222 + i * 28 }}><small>{n}</small><b>{t}</b><span>{d}</span></div>
  ))}</>
}
export function Horizontal() {
  const s = useScroller()
  const sec = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<HzMode>(() => (reduced() ? 'native' : 'pin'))
  const [p, setP] = useState(0)
  const [x, setX] = useState(0)
  const [idx, setIdx] = useState(0)
  const onScroll = (el: HTMLDivElement) => {
    const h = sec.current, t = track.current
    if (!h || !t) return
    // 붙잡힌 구간 안에서 내린 비율(0–1)을 가로 이동 거리로 바꿔요
    const np = clamp((el.scrollTop - h.offsetTop) / Math.max(1, h.offsetHeight - el.clientHeight))
    setP(np); setX(np * Math.max(0, t.offsetWidth - el.clientWidth))
  }
  const step = () => ((row.current?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 210) + 12
  const change = (v: HzMode) => { setMode(v); s.home(); setP(0); setX(0); setIdx(0) }
  const demo = useDemo({
    reset() { s.home(); setP(0); setX(0); setIdx(0); if (row.current) row.current.scrollLeft = 0 },
    async play(c) {
      if (mode === 'pin') { await s.glide(c, s.max(), 3600); await c.sleep(500); return }
      await s.glide(c, 70, 700); await c.sleep(300)
      for (const k of [1, 2]) {
        if (!c.alive()) return
        row.current?.scrollTo({ left: step() * k, behavior: reduced() ? 'auto' : 'smooth' })
        await c.sleep(900)
      }
    },
  })
  const at = mode === 'pin' ? Math.round(p * (PANELS.length - 1)) : idx
  return (
    <Card id="scroll-horizontal" num="04" title="가로 스크롤" en="Horizontal Scroll" demo={demo}
      desc="세로로 내리는데 화면이 옆으로 흘러가요. 구간을 붙잡아 두고 스크롤을 가로 이동으로 바꿔 쓰는 방식이에요.">
      <Stage log={mode === 'pin'
        ? (p > 0 && p < 1 ? <><b>{at + 1}</b> / {PANELS.length} · 세로로 내리는데 화면은 <b>옆으로</b> 가요</> : p >= 1 ? <>끝까지 지나야 <b>아래 내용</b>이 이어져요 · 건너뛸 수 없어요</> : <>아래로 내리면 구간이 <b>붙잡혀요</b></>)
        : <><b>{at + 1}</b> / {PANELS.length} · 세로는 그대로, 줄을 <b>옆으로 밀 때만</b> 가로로 움직여요</>}>
        <div className="box left sc-box">
          <View s={s} label="가로 스크롤 데모" onScroll={onScroll}>
            <div className="sc-body sc-hz-intro">
              <h4>만드는 순서</h4>
              <Para>다섯 단계를 차례로 지나가요.</Para>
            </div>
            {mode === 'pin' ? (
              <div className="sc-hz" ref={sec}>
                <div className="sc-hz-pin">
                  <div className="sc-hz-track" ref={track} style={{ transform: `translate3d(${(-x).toFixed(1)}px, 0, 0)` }}><Panels /></div>
                  <div className="sc-hz-bar" aria-hidden="true"><i style={{ transform: `scaleX(${p})` }} /></div>
                </div>
              </div>
            ) : (
              <div className="sc-hz-row" ref={row} tabIndex={0} role="group" aria-label="만드는 순서 다섯 단계 (옆으로 스크롤)"
                onScroll={e => setIdx(clamp(Math.round(e.currentTarget.scrollLeft / step()), 0, PANELS.length - 1))}>
                <Panels />
              </div>
            )}
            <div className="sc-body">
              <Para>단계가 끝나면 다시 세로로 이어져요. 여기부터는 평소처럼 내려가요.</Para>
              <Para>출시가 끝이 아니라 다음 기획의 시작이에요.</Para>
            </div>
          </View>
          <div className="sc-ctrl">
            <Knob label="방식"><Seg value={mode} onChange={change} options={[['pin', '세로를 가로로'], ['native', '옆으로 밀기']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['붙잡는 길이', '가로 이동 거리만큼'], ['패널', '3–6장'], ['위치 표시', '필수']]}
        usage={[
          ['언제', '단계, 연표, 작품 모음처럼 순서대로 한 장씩 봐야 뜻이 통하는 내용'],
          ['원리', '구간의 높이를 가로로 움직일 거리만큼 늘려 놓고, 안쪽을 sticky로 붙여요. 구간 안에서 내린 비율을 translateX에 그대로 써요.'],
          ['주의', '손은 아래로 가는데 화면은 옆으로 가니 처음엔 고장처럼 느껴져요. 몇 장 중 어디인지 꼭 보여주고, 훑어보기만 하면 되는 내용은 ‘옆으로 밀기’가 덜 붙잡아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 스태커 ---------- */
// scroll.css 의 .sc-st-c 값과 같아야 해요
const CARD_H = 168, GAP = 44, TOP = 12, STEP = 14
const STACK: [string, string, string][] = [
  ['1', '문제 찾기', '누가 어디서 막히는지 직접 봐요'], ['2', '가설 세우기', '이렇게 바꾸면 나아질 거라고 적어요'],
  ['3', '작게 만들기', '하루 안에 보여줄 수 있는 크기로'], ['4', '확인하기', '숫자와 말, 둘 다로 확인해요'],
]
export function Stack() {
  const s = useScroller()
  const wrap = useRef<HTMLDivElement>(null)
  const cards = useRef<HTMLDivElement[]>([])
  const [shrink, setShrink] = useState(true)
  /** 카드마다 제자리에 얼마나 다 왔는지 (1이면 붙음) */
  const [prog, setProg] = useState<number[]>(() => STACK.map(() => 0))
  const onScroll = (el: HTMLDivElement) => {
    const top = el.getBoundingClientRect().top + el.clientTop
    setProg(cards.current.map((c, j) => clamp(1 - (c.getBoundingClientRect().top - top - (TOP + j * STEP)) / (CARD_H + GAP))))
  }
  const stuck = prog.filter(v => v >= 0.995).length
  /** 내 위로 덮인 카드 수만큼 조금씩 작아져요 */
  const scale = (i: number) => (shrink && !reduced() ? 1 - 0.05 * prog.slice(i + 1).reduce((a, b) => a + b, 0) : 1)
  const demo = useDemo({
    reset() { s.home(); setProg(STACK.map(() => 0)) },
    async play(c) {
      const to = (wrap.current?.offsetTop ?? 0) + (STACK.length - 1) * (CARD_H + GAP) - (TOP + (STACK.length - 1) * STEP)
      await s.glide(c, to, 3400); await c.sleep(600)
    },
  })
  return (
    <Card id="scroll-stack" num="07" title="스태커" en="Stacking Cards" demo={demo}
      desc="카드가 위에 붙은 채로 다음 카드가 그 위에 차곡차곡 쌓여요. 순서가 있는 내용을 한 장씩 넘겨 보여줘요.">
      <Stage log={stuck === 0 ? <>아래로 내리면 카드가 <b>한 장씩</b> 붙어요</> : <><b>{stuck}</b> / {STACK.length}장이 쌓였어요 · 지나온 카드는 {shrink ? <><b>작아지며</b> 뒤로 물러나요</> : <>윗줄만 남기고 가려져요</>}</>}>
        <div className="box left sc-box">
          <View s={s} label="스태커 데모" onScroll={onScroll}>
            <div className="sc-body sc-st-intro"><h4>실험 한 바퀴</h4></div>
            <div className="sc-st" ref={wrap}>
              {STACK.map(([n, t, d], i) => (
                <div key={n} ref={el => { if (el) cards.current[i] = el }} className="sc-st-c"
                  style={{ top: TOP + i * STEP, transform: `scale(${scale(i).toFixed(3)})`, ['--h' as string]: 218 + i * 34 }}>
                  <small>{n}단계</small><b>{t}</b><span>{d}</span>
                </div>
              ))}
            </div>
            <div className="sc-body">
              <Para>네 단계를 돌고 나면 다시 처음으로 돌아가요. 한 바퀴는 짧을수록 좋아요.</Para>
            </div>
          </View>
          <div className="sc-ctrl">
            <Knob label="지나온 카드"><Seg value={shrink ? 1 : 0} onChange={v => setShrink(v === 1)} options={[[1, '작아지기'], [0, '그대로']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['겹침 간격', '10–20px'], ['축소', '장당 4–6%'], ['카드', '3–5장']]}
        usage={[
          ['언제', '기능 소개, 진행 단계, 후기처럼 같은 모양의 덩어리 몇 개를 차례로 보여줄 때'],
          ['원리', '카드 모두에 position: sticky를 주고 붙는 위치(top)만 조금씩 늘려요. 겹쳐 쌓이는 건 CSS만으로 되고, 작아지는 것만 스크립트로 계산해요.'],
          ['주의', '카드 높이가 화면보다 크면 아래쪽은 영영 못 봐요. 높이를 화면 안에 들어오게 잡고, 덮인 카드는 다시 읽기 어려우니 서로 이어지는 문장은 넣지 않아요.'],
        ]}
      />
    </Card>
  )
}
