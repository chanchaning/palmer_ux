import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { Knob } from '../shared'
import { fin, reduced, useRun } from '../util'

/* ---------- 05 보냄 ---------- */
type SendFx = 'plane' | 'bubble' | 'none'
interface Msg { id: number; text: string; fresh: boolean }
export function Sent() {
  const { A, clearA } = useMotion()
  const [fx, setFx] = useState<SendFx>('plane')
  const [text, setText] = useState('내일 10시에 봬요!')
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, text: '회의실은 3층이에요', fresh: false }])
  const [status, setStatus] = useState<'' | 'sending' | 'sent'>('')
  const { run, stop } = useRun()
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const plane = useRef<SVGSVGElement>(null)
  const nid = useRef(1)
  const send = (f = fx, t = text) => run(async sl => {
    const v = t.trim()
    if (!v) return
    clearA(plane.current)
    setStatus('sending')
    if (f === 'plane' && plane.current && !reduced()) {
      await fin(A(plane.current, [
        { transform: 'none', opacity: 1 },
        { transform: 'translate(-6px, 4px) rotate(-8deg)', opacity: 1, offset: 0.2 },
        { transform: 'translate(70px, -90px) rotate(18deg) scale(.6)', opacity: 0 },
      ], 520, EASE.in))
    }
    setText('')
    setMsgs(ms => [...ms.map(x => ({ ...x, fresh: false })), { id: nid.current++, text: v, fresh: f !== 'none' }].slice(-3))
    await sl(f === 'none' ? 50 : 350)
    setStatus(f === 'none' ? '' : 'sent')
    if (plane.current) A(plane.current, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], 260, EASE.spring)
  })
  const demo = useDemo({
    reset() { stop(); clearA(plane.current); setText('내일 10시에 봬요!'); setStatus(''); setMsgs([{ id: 0, text: '회의실은 3층이에요', fresh: false }]) },
    async play(c) { await c.press(box.current, btn.current); await c.sleep(1600) },
  })
  const log = status === 'sent' ? <>말풍선 아래 <b>‘보냈어요’</b>로 끝을 알려요</>
    : fx === 'none' && msgs.length > 1 && !text ? <>입력칸만 비었어요 · <b>보내진 건지 지워진 건지</b> 헷갈려요</>
    : <>입력하고 <b>보내기</b>를 눌러 보세요</>
  return (
    <Card id="done-sent" num="05" title="보냄 애니메이션" en="Sent" demo={demo}
      desc="종이비행기가 날아가고 말풍선이 올라가요. 내 손을 떠났다는 걸 눈으로 보여줘요.">
      <Stage log={log}>
        <div className="box left dn-box dn-chat" ref={box}>
          <ul className="dn-msgs">
            {msgs.map((x, i) => (
              <li key={x.id} className={'dn-msg' + (x.fresh ? ' fresh' : '')}>
                <span>{x.text}</span>
                {i === msgs.length - 1 && status === 'sent' && x.fresh && <small className="dn-msg-st">보냈어요 · 오후 3:12</small>}
              </li>
            ))}
          </ul>
          <form className="dn-compose" onSubmit={e => { e.preventDefault(); send() }}>
            <input value={text} onChange={e => setText(e.target.value)} aria-label="보낼 메시지" placeholder="메시지 입력" maxLength={40} />
            <button className="dn-send" ref={btn} type="submit" aria-label="보내기" disabled={!text.trim()}>
              <svg ref={plane} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 11.5 21 3l-6.5 18-3.2-7.3z" /><path d="m11.3 13.7 4-4" /></svg>
            </button>
          </form>
          <div className="dn-ctrl">
            <Knob label="연출"><Seg value={fx} onChange={v => { setFx(v); if (!text) setText('자료 보내 드렸어요') }} options={[['plane', '비행기 + 말풍선'], ['bubble', '말풍선만'], ['none', '아무것도']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['날아감', '400–550ms'], ['말풍선', '200–300ms'], ['상태', '보내는 중 → 보냈어요']]}
        usage={[
          ['언제', '메시지, 이메일, 문의, 초대장처럼 ‘남에게 건너간’ 일이 끝났을 때'],
          ['실무', '서버가 받았다고 답한 뒤에 ‘보냈어요’를 붙여요. 실패하면 말풍선 옆에 다시 보내기를 둬요.'],
          ['주의', '채팅처럼 계속 보내는 곳에서 매번 크게 날리면 피곤해요. 말풍선이 올라가는 정도로 줄여요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 스탬프 ---------- */
const DAYS = ['월', '화', '수', '목', '금', '토', '일']
type Bounce = 0 | 1 | 2
/** 도장 기울기: 칸마다 조금씩 달라 손으로 찍은 느낌 */
const rotOf = (i: number) => -14 + (i % 3) * 4
const stampFrames = (b: Bounce, r: number): Keyframe[] => {
  const end = `scale(1) rotate(${r}deg)`
  if (b === 0) return [{ transform: `scale(1.8) rotate(${r - 12}deg)`, opacity: 0 }, { transform: end, opacity: 1 }]
  if (b === 1) return [{ transform: `scale(1.8) rotate(${r - 12}deg)`, opacity: 0 }, { transform: `scale(.9) rotate(${r}deg)`, opacity: 1, offset: 0.6 }, { transform: end, opacity: 1 }]
  return [{ transform: `scale(2.4) rotate(${r - 18}deg)`, opacity: 0 }, { transform: `scale(.72) rotate(${r}deg)`, opacity: 1, offset: 0.5 }, { transform: `scale(1.12) rotate(${r}deg)`, opacity: 1, offset: 0.75 }, { transform: end, opacity: 1 }]
}
export function Stamp() {
  const { A, clearA } = useMotion()
  const [n, setN] = useState(3)
  const [bounce, setBounce] = useState<Bounce>(1)
  const [fresh, setFresh] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const slots = useRef<(HTMLElement | null)[]>([])
  const hit = (b = bounce, i = n) => {
    if (i >= DAYS.length) { setN(0); setFresh(-1); return }
    setN(i + 1); setFresh(i)
    requestAnimationFrame(() => {
      const s = slots.current[i]?.querySelector('.dn-stamp')
      if (!s || reduced()) return
      clearA(s, paper.current)
      A(s, stampFrames(b, rotOf(i)), b === 2 ? 420 : 300, EASE.in)
      if (paper.current && b > 0) A(paper.current, [{ transform: 'none' }, { transform: `translateY(${b * 2}px)` }, { transform: 'none' }], 160, EASE.out, b === 2 ? 210 : 180)
    })
  }
  const demo = useDemo({
    reset() { setN(3); setFresh(-1) },
    async play(c) { await c.press(box.current, btn.current); await c.sleep(900); await c.press(box.current, btn.current); await c.sleep(900) },
  })
  const full = n >= DAYS.length
  return (
    <Card id="done-stamp" num="06" title="스탬프" en="Stamp" demo={demo}
      desc="도장이 위에서 ‘쾅’ 내려와 살짝 눌렸다 자리를 잡아요. 기록이 남았다는 무게감을 줘요.">
      <Stage log={full ? <>7일 모두 찍었어요 · 한 번 더 누르면 <b>새 주</b>를 시작해요</> : <><b>{n}일째</b> 도장 · {bounce === 0 ? '반동이 없으면 그냥 나타난 것 같아요' : bounce === 2 ? '크게 튀면 장난스러워요' : '살짝 눌렸다 돌아와 무게가 느껴져요'}</>}>
        <div className="box dn-box" ref={box}>
          <div className="dn-paper" ref={paper}>
            <div className="dn-paper-h"><b>아침 산책 출석부</b><span>{Math.min(n, 7)} / 7</span></div>
            <ol className="dn-slots">
              {DAYS.map((d, i) => (
                <li key={d} ref={el => { slots.current[i] = el }} aria-label={d + (i < n ? ' 출석' : ' 아직')}>
                  <span className="dn-day" aria-hidden="true">{d}</span>
                  {i < n && <span className={'dn-stamp' + (i === fresh ? ' fresh' : '')} style={{ transform: `rotate(${rotOf(i)}deg)` }} aria-hidden="true">참 잘<br />했어요</span>}
                </li>
              ))}
            </ol>
          </div>
          <button className="btn" ref={btn} onClick={() => hit()}>{full ? '새 주 시작하기' : '오늘 출석하기'}</button>
          <div className="dn-ctrl">
            <Knob label="반동"><Seg value={bounce} onChange={v => { setBounce(v); hit(v, n >= 7 ? 0 : n) }} options={[[0, '없음'], [1, '살짝'], [2, '크게']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['내려오기', '250–350ms'], ['눌림', '90% → 100%'], ['기울기', '10–15°']]}
        usage={[
          ['언제', '출석, 적립 쿠폰, 승인·결재, 방문 인증처럼 ‘기록이 남는’ 완료'],
          ['실무', '도장이 닿는 순간 종이를 1–2px 눌러 주면 무게가 생겨요. 도장마다 기울기를 조금씩 달리하면 손으로 찍은 느낌이 나요.'],
          ['주의', '크게 튀는 반동은 결재·계약 같은 진지한 일에는 가벼워 보여요. 일의 무게에 맞게 줄여요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 배지 획득 ---------- */
type BadgeSize = 'toast' | 'modal'
export function BadgeUnlock() {
  const { A, clearA } = useMotion()
  const [size, setSize] = useState<BadgeSize>('modal')
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>기록하기를 눌러 <b>7일 연속</b>을 채워 보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const { run, stop } = useRun()
  const pop = (sz = size) => run(async sl => {
    setOpen(false); await sl(80)
    setOpen(true); await sl(10)
    const host = box.current
    const b = host?.querySelector('.dn-badge'), shine = host?.querySelector('.dn-shine'), ring = host?.querySelector('.dn-ring'), panel = host?.querySelector('.dn-bd-panel')
    if (!b || !shine || !ring || !panel) return
    clearA(b, shine, ring, panel)
    setLog(sz === 'modal' ? <>화면 가운데서 <b>크게</b> · 확인을 눌러야 닫혀요</> : <>아래에서 <b>작게</b> 올라왔다 3초 뒤 저절로 사라져요</>)
    if (reduced()) return
    A(panel, sz === 'modal' ? [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }] : [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], 260, EASE.out)
    A(b, [{ transform: 'scale(0) rotate(-25deg)' }, { transform: 'scale(1.15) rotate(6deg)', offset: 0.65 }, { transform: 'scale(1) rotate(0)' }], 560, EASE.out, 120)
    A(ring, [{ transform: 'scale(.6)', opacity: 0.7 }, { transform: 'scale(1.7)', opacity: 0 }], 600, EASE.out, 380)
    A(shine, [{ transform: 'translateX(-120%) rotate(20deg)' }, { transform: 'translateX(220%) rotate(20deg)' }], 700, EASE.std, 640)
    if (sz === 'toast') { await sl(3200); setOpen(false); setLog(<>토스트가 사라졌어요 · 배지는 <b>내 기록</b>에 남아요</>) }
  })
  const demo = useDemo({
    reset() { stop(); setOpen(false) },
    async play(c) { await c.press(box.current, btn.current); await c.sleep(2000) },
  })
  return (
    <Card id="done-badge" num="07" title="배지 획득" en="Badge Unlock" demo={demo}
      desc="배지가 톡 튀어나오며 빛이 한 번 훑고 지나가요. 쌓아 온 노력에 이름을 붙여 줘요.">
      <Stage log={log}>
        <div className="box dn-box dn-bd-host" ref={box}>
          <div className="dn-streak" aria-label="7일 중 6일 기록함">
            {DAYS.map((d, i) => <span key={d} className={i < 6 || open ? 'on' : ''}>{d}</span>)}
          </div>
          <button className="btn" ref={btn} onClick={() => pop()}>오늘 기록하기</button>
          {open && (
            <div className={'dn-bd ' + size} role={size === 'modal' ? 'dialog' : 'status'} aria-label="새 배지">
              <div className="dn-bd-panel">
                <div className="dn-badge-wrap">
                  <i className="dn-ring" aria-hidden="true" />
                  <div className="dn-badge" aria-hidden="true">
                    <svg viewBox="0 0 64 64" width="100%" height="100%"><path className="dn-hex" d="M32 3 57 17.5v29L32 61 7 46.5v-29z" /><path className="dn-hex-in" d="M32 11 50 21.5v21L32 53 14 42.5v-21z" /><text x="32" y="38" textAnchor="middle">7</text></svg>
                    <i className="dn-shine" />
                  </div>
                </div>
                <div className="dn-bd-txt">
                  <small>새 배지를 얻었어요</small>
                  <b>꾸준한 7일</b>
                  {size === 'modal' && <p>일주일 동안 하루도 빠짐없이 기록했어요.</p>}
                </div>
                {size === 'modal' && <button className="btn sm" onClick={() => { stop(); setOpen(false); setLog(<>닫았어요 · 배지는 <b>내 기록</b>에서 다시 볼 수 있어요</>) }}>좋아요</button>}
              </div>
            </div>
          )}
          <div className="dn-ctrl">
            <Knob label="크기"><Seg value={size} onChange={v => { setSize(v); pop(v) }} options={[['toast', '작게 (토스트)'], ['modal', '크게 (가운데)']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['튀어나옴', '450–600ms'], ['반짝임', '1번'], ['넘침', '110–115%']]}
        usage={[
          ['언제', '연속 기록, 첫 완주, 레벨 달성처럼 시간을 들여 쌓은 일이 끝났을 때'],
          ['실무', '자주 나오는 배지는 작게 토스트로, 드문 배지만 가운데 크게 보여줘요. 받은 배지는 다시 볼 곳을 만들어 둬요.'],
          ['주의', '하는 일마다 배지를 주면 금방 아무 의미가 없어져요. 크게 띄우는 창은 하던 일을 끊으니 꼭 닫기 쉬워야 해요.'],
        ]}
      />
    </Card>
  )
}
