import { useRef, useState } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { Knob } from '../shared'
import { bell, reduced } from '../util'

/* ---------- 05 독 확대 ---------- */
const APPS: [string, string, string][] = [
  ['메', '메일', '#3b6cf6'], ['지', '지도', '#12a37f'], ['사', '사진', '#e8590c'], ['음', '음악', '#c2255c'], ['설', '설정', '#5c677d'],
]
export function Dock() {
  const [max, setMax] = useState(1.6)
  const [hot, setHot] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  const dock = useRef<HTMLDivElement>(null)
  const items = useRef<HTMLButtonElement[]>([])
  /** 커서의 가로 위치에서 가까운 아이콘일수록 크게. null이면 원래 크기로 */
  const apply = (cx: number | null, mx = max) => {
    let best = -1, bestS = 1.05
    items.current.forEach((el, i) => {
      if (!el) return
      let s = 1
      if (cx != null && !reduced()) {
        const r = el.getBoundingClientRect()
        s = 1 + (mx - 1) * bell(cx - (r.left + r.width / 2), 40)
      }
      el.style.setProperty('--s', s.toFixed(3))
      if (s > bestS) { bestS = s; best = i }
    })
    dock.current?.classList.toggle('live', cx != null)
    setHot(best)
  }
  const demo = useDemo({
    reset() { apply(null) },
    async play(c) {
      const d = dock.current
      if (!d || reduced()) return
      const N = 90
      for (let i = 0; i <= N; i++) {
        const r = d.getBoundingClientRect()
        const t = i / N
        const p = t < 0.5 ? t * 2 : 2 - t * 2 // 왼쪽 → 오른쪽 → 왼쪽
        apply(r.left + r.width * p)
        await c.sleep(16)
      }
      apply(null)
    },
  })
  return (
    <Card id="micro-dock" num="05" title="독 확대" en="Dock Magnification" demo={demo}
      desc="커서 아래 아이콘이 가장 크게, 옆 아이콘은 조금씩 덜 커져요. 작은 아이콘을 고르기 쉽게 해 줘요.">
      <Stage log={hot >= 0 ? <><b>{APPS[hot][1]}</b>이 가장 크고, 양옆은 거리만큼 덜 커져요</> : <>아이콘 위로 커서를 <b>좌우로</b> 움직여 보세요</>}>
        <div className="box mc-box" ref={box}>
          <div className="mc-dock-area" onPointerMove={e => apply(e.clientX)} onPointerLeave={() => apply(null)}>
            <div className="mc-dock" ref={dock} role="toolbar" aria-label="앱 바로가기">
              {APPS.map(([ch, name, color], i) => (
                <button key={name} ref={el => { if (el) items.current[i] = el }} className={'mc-app' + (hot === i ? ' hot' : '')}
                  style={{ background: color }} aria-label={name}
                  onFocus={e => apply(e.currentTarget.getBoundingClientRect().left + e.currentTarget.offsetWidth / 2)} onBlur={() => apply(null)}>
                  <span className="mc-app-tip" aria-hidden="true">{name}</span>{ch}
                </button>
              ))}
            </div>
          </div>
          <div className="mc-ctrl">
            <Knob label="확대"><Seg value={max} onChange={setMax} options={[[1.25, '1.25배'], [1.6, '1.6배']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['최대 확대', '1.3–1.8배'], ['퍼짐', '아이콘 1–2개 폭'], ['복귀', '200–300ms']]}
        usage={[
          ['언제', '아이콘만 나열된 도구 막대나 바로가기 줄처럼, 항목이 작고 촘촘할 때'],
          ['원리', '커서와 각 아이콘 중심의 거리를 종 모양 곡선에 넣어 크기를 정해요. 커지는 만큼 폭도 같이 늘려야 옆 아이콘이 밀려나며 자연스러워요.'],
          ['주의', '아이콘이 움직이는 표적이 돼서 과하면 오히려 누르기 어려워요. 키보드로 옮겨 갈 때도 같은 확대를 주고, 이름표를 꼭 붙여요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 늘어나는 페이지 점 ---------- */
const SLIDES = ['오늘의 추천', '새로 들어온 것', '다시 볼 만한 것', '모아 보기', '이번 주 소식']
type DotMode = 'stretch' | 'jump'
export function Dots() {
  const m = useMotion()
  const timers = useTimers()
  const [i, setI] = useState(0)
  const [span, setSpan] = useState<[number, number]>([0, 0])
  const [mode, setMode] = useState<DotMode>('stretch')
  const box = useRef<HTMLDivElement>(null)
  const next = useRef<HTMLButtonElement>(null)
  const prev = useRef<HTMLButtonElement>(null)
  const go = (to: number) => {
    if (to < 0 || to >= SLIDES.length || to === i) return
    timers.clear()
    setI(to)
    if (mode === 'stretch' && !reduced()) {
      setSpan([Math.min(i, to), Math.max(i, to)]) // 먼저 두 점을 다 덮게 늘리고
      timers.set(() => setSpan([to, to]), m.D(190)) // 그다음 도착한 쪽으로 줄여요
    } else setSpan([to, to])
  }
  const demo = useDemo({
    reset() { timers.clear(); setI(0); setSpan([0, 0]) },
    async play(c) {
      await c.press(box.current, next.current); await c.sleep(650)
      await c.press(box.current, next.current); await c.sleep(650)
      await c.press(box.current, prev.current); await c.sleep(700)
    },
  })
  return (
    <Card id="micro-dots" num="06" title="늘어나는 페이지 점" en="Stretchy Pagination Dots" demo={demo}
      desc="현재 위치 표시가 다음 점까지 쭉 늘어났다가 줄어들어요. 어느 쪽으로 넘어갔는지 눈으로 따라갈 수 있어요.">
      <Stage log={<><b>{i + 1}</b> / {SLIDES.length} · {mode === 'stretch' ? '표시가 늘어났다 줄며 방향을 보여줘요' : '표시가 순간 이동해서 방향이 안 보여요'}</>}>
        <div className="box mc-box" ref={box}>
          <div className="mc-car" aria-roledescription="캐러셀" aria-label="추천 모음">
            <div className="mc-car-track" style={{ transform: `translateX(${-i * 100}%)` }}>
              {SLIDES.map((s, k) => (
                <div key={s} className="mc-slide" style={{ ['--h' as string]: 225 + k * 32 }} aria-hidden={k !== i}><small>{k + 1}</small><b>{s}</b></div>
              ))}
            </div>
          </div>
          <div className="mc-dots-row">
            <button className="mc-arrow" ref={prev} onClick={() => go(i - 1)} disabled={i === 0} aria-label="이전">‹</button>
            <div className={'mc-dots ' + mode}>
              <i className="mc-pill" style={{ left: span[0] * 16 - 6, width: (span[1] - span[0]) * 16 + 20 }} aria-hidden="true" />
              {SLIDES.map((s, k) => (
                <button key={s} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={`${k + 1}번째: ${s}`} aria-current={k === i} />
              ))}
            </div>
            <button className="mc-arrow" ref={next} onClick={() => go(i + 1)} disabled={i === SLIDES.length - 1} aria-label="다음">›</button>
          </div>
          <div className="mc-ctrl">
            <Knob label="표시"><Seg value={mode} onChange={setMode} options={[['stretch', '늘어나기'], ['jump', '순간 이동']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['늘어남', '150–200ms'], ['줄어듦', '150–200ms'], ['점 간격', '14–16px']]}
        usage={[
          ['언제', '배너 캐러셀, 온보딩, 사진 넘기기처럼 몇 장 중 어디인지 보여줄 때'],
          ['원리', '표시 하나의 왼쪽 위치와 폭만 바꿔요. 출발점과 도착점을 다 덮도록 늘린 뒤, 도착한 쪽으로 줄이면 애벌레처럼 기어가요.'],
          ['주의', '점은 너무 작아서 누르는 버튼으로는 부족해요. 화살표나 밀어 넘기기를 함께 주고, 7장이 넘으면 ‘3 / 12’ 같은 숫자가 나아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 기울어지는 카드 ---------- */
export function Tilt() {
  const [deg, setDeg] = useState(12)
  const [live, setLive] = useState(false)
  const zone = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const tilt = (cx: number, cy: number, dg = deg) => {
    const z = zone.current, el = card.current
    if (!z || !el) return
    const r = z.getBoundingClientRect()
    const px = Math.min(1, Math.max(0, (cx - r.left) / r.width)), py = Math.min(1, Math.max(0, (cy - r.top) / r.height))
    el.classList.add('live')
    // 커서가 있는 쪽이 화면 안으로 눌리게: 세로 위치는 X축, 가로 위치는 Y축 회전
    el.style.transform = reduced() ? '' : `rotateX(${((0.5 - py) * 2 * dg).toFixed(2)}deg) rotateY(${((px - 0.5) * 2 * dg).toFixed(2)}deg)`
    el.style.setProperty('--gx', (px * 100).toFixed(1) + '%')
    el.style.setProperty('--gy', (py * 100).toFixed(1) + '%')
    setLive(true)
  }
  const rest = () => {
    const el = card.current
    if (!el) return
    el.classList.remove('live'); el.style.transform = ''
    setLive(false)
  }
  const demo = useDemo({
    reset: rest,
    async play(c) {
      const z = zone.current
      if (!z) return
      const N = 100
      for (let i = 0; i <= N; i++) {
        const r = z.getBoundingClientRect(), a = (i / N) * Math.PI * 3 - 2.2
        tilt(r.left + r.width * (0.5 + 0.42 * Math.cos(a)), r.top + r.height * (0.5 + 0.42 * Math.sin(a)))
        await c.sleep(16)
      }
      rest()
    },
  })
  return (
    <Card id="micro-tilt" num="07" title="기울어지는 카드" en="Tilt Card" demo={demo}
      desc="커서 위치에 따라 카드가 입체로 기울고 빛이 따라 움직여요. 실물 카드를 손에 쥔 느낌을 줘요.">
      <Stage log={live ? <>커서가 있는 쪽이 <b>눌리고</b>, 빛이 따라와요</> : <>카드 위에서 커서를 <b>천천히</b> 돌려 보세요</>}>
        <div className="box mc-box">
          <div className="mc-tilt-zone" ref={zone} onPointerMove={e => tilt(e.clientX, e.clientY)} onPointerLeave={rest}>
            <div className="mc-tilt" ref={card}>
              <i className="mc-glare" aria-hidden="true" />
              <small>PALMER 웹 도감</small>
              <strong>평생 열람증</strong>
              <div className="mc-tilt-foot"><span>가이드 32권</span><span>No. 0032</span></div>
            </div>
          </div>
          <div className="mc-ctrl">
            <Knob label="기울기"><Seg value={deg} onChange={setDeg} options={[[6, '6°'], [12, '12°'], [24, '24°']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['기울기', '6–12°'], ['원근', '600–900px'], ['복귀', '400–500ms']]}
        usage={[
          ['언제', '멤버십 카드, 티켓, 상품 대표 이미지처럼 ‘갖고 싶은 물건’으로 보이게 하고 싶을 때'],
          ['원리', '카드 안에서 커서 위치를 0–1로 바꿔 회전 각도로 써요. 부모에 원근(perspective)을 주고, 빛은 같은 좌표에 둥근 그러데이션을 얹어요.'],
          ['주의', '기울면 글자가 일그러져서 읽기 어려워요. 목록의 모든 카드나 글이 많은 카드에는 쓰지 말고, 각도는 작게 잡아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 부채꼴 카드 ---------- */
const FAN: [string, string][] = [['월', '월간 정리'], ['사', '사진 모음'], ['메', '메모 12개'], ['링', '저장한 링크']]
type Shape = 'fan' | 'row'
export function Fan() {
  const [open, setOpen] = useState(false)
  const [shape, setShape] = useState<Shape>('fan')
  const [top, setTop] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const cards = useRef<HTMLButtonElement[]>([])
  const tf = (i: number) => {
    const o = i - (FAN.length - 1) / 2, a = Math.abs(o), lift = top === i ? 22 : 0
    if (!open) return `translate(${o * 3}px, ${-a}px) rotate(${o * 2.5}deg)`
    if (shape === 'fan') return `translate(${o * 40}px, ${a * a * 7 - lift}px) rotate(${o * 11}deg)`
    return `translate(${o * 52}px, ${-lift}px)`
  }
  const flip = () => { setOpen(o => !o); setTop(-1) }
  const demo = useDemo({
    reset() { setOpen(false); setTop(-1) },
    async play(c) {
      await c.press(box.current, toggle.current); await c.sleep(900)
      await c.press(box.current, cards.current[2]); await c.sleep(1000)
    },
  })
  return (
    <Card id="micro-fan" num="08" title="부채꼴 카드" en="Fan Cards" demo={demo}
      desc="겹쳐 있던 카드가 부채처럼 펼쳐져요. 좁은 자리에 여러 장을 넣고, 필요할 때만 보여줘요.">
      <Stage log={!open ? <>겹쳐 둔 카드 <b>{FAN.length}장</b> · 눌러서 펼쳐 보세요</> : top >= 0 ? <>‘<b>{FAN[top][1]}</b>’ 카드를 골랐어요 · 고른 카드만 위로 올라와요</> : <>가운데부터 <b>차례로</b> 펼쳐졌어요 · 카드를 골라 보세요</>}>
        <div className="box mc-box" ref={box}>
          <div className={'mc-fan' + (open ? ' open' : '')}>
            {FAN.map(([ch, name], i) => (
              <button key={name} ref={el => { if (el) cards.current[i] = el }} className={'mc-fan-c' + (top === i ? ' top' : '')}
                style={{ transform: tf(i), ['--d' as string]: Math.abs(i - (FAN.length - 1) / 2), ['--h' as string]: 215 + i * 40 }}
                onClick={() => (open ? setTop(t => (t === i ? -1 : i)) : flip())}
                aria-label={open ? name : '카드 펼치기'} aria-pressed={open ? top === i : undefined} tabIndex={open || i === FAN.length - 1 ? 0 : -1}>
                <b aria-hidden="true">{ch}</b><span>{name}</span>
              </button>
            ))}
          </div>
          <div className="mc-ctrl center">
            <button className="btn ghost sm" ref={toggle} onClick={flip} aria-expanded={open}>{open ? '접기' : '펼치기'}</button>
            <Knob label="모양"><Seg value={shape} onChange={setShape} options={[['fan', '부채'], ['row', '나란히']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['펼침', '350–450ms'], ['카드 간 지연', '30–50ms'], ['각도', '장당 8–12°']]}
        usage={[
          ['언제', '보관함 미리보기, 사진 묶음, 카드 지갑처럼 여러 장이 한 묶음이라는 걸 보여줄 때'],
          ['원리', '가운데에서 몇 번째인지에 각도와 가로 이동을 곱해요. 바깥 카드일수록 조금 아래로 내리면 호를 그리며 부채 모양이 돼요.'],
          ['주의', '접힌 상태에서는 맨 위 한 장만 보여요. 안에 몇 장이 있는지 숫자로 알려주고, 5–6장을 넘으면 목록으로 보여주는 편이 나아요.'],
        ]}
      />
    </Card>
  )
}
