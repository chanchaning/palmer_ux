import { useRef, useState } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { Knob } from '../shared'

/* ---------- 09 툴팁 지연 ---------- */
const TOOLS: [string, string][] = [['B', '굵게'], ['I', '기울임'], ['U', '밑줄'], ['S', '취소선'], ['L', '링크']]
export function TooltipDelay() {
  const m = useMotion()
  const timers = useTimers()
  const [tip, setTip] = useState(-1)
  const [delay, setDelay] = useState(500)
  const [shows, setShows] = useState(0)
  /** 툴팁이 한 번 뜬 뒤 잠깐은 ‘달궈진’ 상태 — 옆으로 옮기면 기다리지 않고 바로 떠요 */
  const warm = useRef(false)
  const box = useRef<HTMLDivElement>(null)
  const items = useRef<HTMLButtonElement[]>([])
  const open = (i: number) => { warm.current = true; setTip(i); setShows(n => n + 1) }
  const enter = (i: number, wait = delay) => {
    timers.clear()
    if (wait === 0 || warm.current) open(i)
    else timers.set(() => open(i), m.D(wait))
  }
  const leave = () => {
    timers.clear(); setTip(-1)
    timers.set(() => { warm.current = false }, m.D(300))
  }
  const demo = useDemo({
    reset() { timers.clear(); warm.current = false; setTip(-1); setShows(0) },
    async play(c) {
      // 막대 위를 빠르게 지나간 다음, 한 곳에 머물러요
      for (const i of [0, 1, 2, 3, 4]) { c.tap(box.current, items.current[i]); enter(i); await c.sleep(170); leave() }
      await c.sleep(700)
      c.tap(box.current, items.current[1]); enter(1); await c.sleep(1300)
      c.tap(box.current, items.current[2]); leave(); enter(2); await c.sleep(1000)
      leave()
    },
  })
  return (
    <Card id="hover-tooltip" num="09" title="툴팁 지연" en="Tooltip Delay" demo={demo}
      desc="올리자마자 뜨면 지나가기만 해도 번쩍여요. 잠깐 머문 뒤에 띄우고, 한 번 뜬 뒤에는 옆으로 옮겨도 바로 보여줘요.">
      <Stage log={<>툴팁이 <b>{shows}번</b> 떴어요 · {delay === 0 ? '지나가기만 해도 전부 떠요' : `${delay}ms 머물러야 뜨고, 뜬 뒤에는 옆 버튼에서 바로 떠요`}</>}>
        <div className="box hv-box" ref={box}>
          <div className="hv-tt-zone">
            <div className="hv-tt" role="toolbar" aria-label="글자 꾸미기">
              {TOOLS.map(([ch, name], i) => (
                <button key={name} ref={el => { if (el) items.current[i] = el }} aria-label={name}
                  onPointerEnter={() => enter(i)} onPointerLeave={leave} onFocus={() => enter(i, 0)} onBlur={leave}>
                  <span aria-hidden="true">{ch}</span>
                  {tip === i && <span className="hv-tt-tip" role="tooltip">{name}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="hv-ctrl">
            <Knob label="뜨기까지"><Seg value={delay} onChange={setDelay} options={[[0, '바로'], [500, '500ms'], [1200, '1.2초']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['뜨는 지연', '300–700ms'], ['이어 보기', '0ms'], ['사라짐', '바로']]}
        usage={[
          ['언제', '아이콘만 있는 버튼, 잘린 글자, 단축키 안내처럼 화면에 다 못 쓴 짧은 설명'],
          ['원리', '올린 순간 타이머를 걸고, 그 전에 나가면 취소해요. 한 번 뜨고 나면 ‘설명을 보려는 중’이라고 보고, 잠깐 동안은 옆 버튼에서 기다림 없이 띄워요.'],
          ['주의', '1초를 넘기면 고장 난 줄 알아요. 키보드 초점에서는 기다리지 않고 바로 보여주고, 터치에는 호버가 없으니 꼭 필요한 설명은 툴팁에만 두지 않아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 10 미리보기 카드 ---------- */
export function HoverCard() {
  const m = useMotion()
  const timers = useTimers()
  const [open, setOpen] = useState(false)
  const [inside, setInside] = useState(false)
  const [missed, setMissed] = useState(false)
  const [grace, setGrace] = useState(250)
  const box = useRef<HTMLDivElement>(null)
  const link = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLDivElement>(null)
  /** 링크에 올림: 350ms 머물면 열어요 */
  const show = () => { timers.clear(); setMissed(false); timers.set(() => setOpen(true), m.D(350)) }
  /** 카드 안으로 들어옴: 닫으려던 걸 취소해요 */
  const keep = () => { timers.clear(); setInside(true) }
  /** 링크나 카드에서 벗어남: 여유 시간 뒤에 닫아요 */
  const hide = (wait = grace) => {
    timers.clear(); setInside(false)
    timers.set(() => setOpen(o => { if (o && wait === 0) setMissed(true); return false }), m.D(wait))
  }
  const shut = () => { timers.clear(); setOpen(false); setInside(false) }
  const demo = useDemo({
    reset() { shut(); setMissed(false) },
    async play(c) {
      c.tap(box.current, link.current); show(); await c.sleep(1100)
      hide(); await c.sleep(140) // 커서가 링크와 카드 사이 틈을 건너는 시간
      if (card.current) { c.tap(box.current, card.current); keep(); await c.sleep(1400); hide() }
      await c.sleep(700)
    },
  })
  return (
    <Card id="hover-card" num="10" title="미리보기 카드" en="Hover Card" demo={demo}
      desc="링크에 머물면 작은 카드가 떠서 누르기 전에 내용을 보여줘요. 커서가 카드까지 건너갈 시간을 줘야 해요.">
      <Stage log={inside ? <>카드 <b>안으로</b> 들어왔어요 · 안의 버튼을 누를 수 있어요</> : open ? <>0.35초 머물러서 <b>열렸어요</b> · 카드로 커서를 옮겨 보세요</> : missed ? <>틈을 건너는 사이에 <b>닫혔어요</b> · 카드에 닿을 수가 없어요</> : <>밑줄 친 이름에 <b>커서를 올려</b> 보세요</>}>
        <div className="box hv-box" ref={box}>
          <div className="hv-hc-zone" onKeyDown={e => { if (e.key === 'Escape') shut() }}>
            <p className="hv-hc-p">
              이 글은 <span className="hv-hc-anchor">
                <button ref={link} className="hv-hc-link" aria-expanded={open}
                  onPointerEnter={show} onPointerLeave={() => hide()} onFocus={show} onBlur={() => hide()}>도예가 한솔</button>
                {open && (
                  <span className="hv-hc" ref={card} onPointerEnter={keep} onPointerLeave={() => hide()} onFocus={keep} onBlur={() => hide()}>
                    <i aria-hidden="true">솔</i>
                    <span className="hv-hc-t"><b>한솔</b><span>도예가 · 글 42편</span></span>
                    <button className="btn sm">구독</button>
                  </span>
                )}
              </span>이 썼어요.
            </p>
          </div>
          <div className="hv-ctrl">
            <Knob label="닫힘 여유"><Seg value={grace} onChange={setGrace} options={[[0, '없음'], [250, '250ms']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['열림 지연', '300–500ms'], ['닫힘 여유', '150–300ms'], ['틈', '8px 이하']]}
        usage={[
          ['언제', '사람 이름, 용어, 다른 글 링크처럼 눌러서 넘어가기 전에 살짝 확인하고 싶은 것'],
          ['원리', '여는 타이머와 닫는 타이머를 따로 둬요. 링크에서 벗어나도 바로 닫지 않고 잠깐 기다렸다가, 그 사이 커서가 카드에 들어오면 닫기를 취소해요.'],
          ['주의', '카드 안에만 있는 기능을 만들면 터치와 키보드 사용자는 쓸 수 없어요. 같은 내용을 링크를 눌러 들어간 화면에서도 볼 수 있어야 하고, Esc로 닫혀야 해요.'],
        ]}
      />
    </Card>
  )
}
