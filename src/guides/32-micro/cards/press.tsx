import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { Knob } from '../shared'
import { reduced, useRun } from '../util'

/* ---------- 01 자석 버튼 ---------- */
const MAG_R = 120
export function Magnetic() {
  const [k, setK] = useState(0.35)
  const [near, setNear] = useState(false)
  const [hits, setHits] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const lab = useRef<HTMLSpanElement>(null)
  const cur = useRef<HTMLSpanElement>(null)
  const release = () => {
    const b = btn.current, l = lab.current
    if (!b || !l) return
    b.classList.remove('pull'); b.style.transform = ''; l.style.transform = ''
    setNear(false)
  }
  /** 커서 위치(화면 좌표)를 받아 버튼을 그쪽으로 당겨요. 버튼의 ‘원래 자리’를 기준으로 계산해야 떨리지 않아요. */
  const pull = (cx: number, cy: number, str = k) => {
    const b = btn.current, l = lab.current, bx = box.current
    if (!b || !l || !bx) return
    const r = bx.getBoundingClientRect()
    const dx = cx - (r.left + b.offsetLeft + b.offsetWidth / 2)
    const dy = cy - (r.top + b.offsetTop + b.offsetHeight / 2)
    if (Math.hypot(dx, dy) > MAG_R || reduced()) { release(); return }
    b.classList.add('pull')
    b.style.transform = `translate(${(dx * str).toFixed(1)}px, ${(dy * str).toFixed(1)}px)`
    l.style.transform = `translate(${(dx * str * 0.35).toFixed(1)}px, ${(dy * str * 0.35).toFixed(1)}px)`
    setNear(true)
  }
  const demo = useDemo({
    reset() { cur.current?.classList.remove('on'); release() },
    async play(c) {
      const bx = box.current, b = btn.current, cu = cur.current
      if (!bx || !b || !cu || reduced()) return
      cu.classList.add('on')
      const N = 84
      for (let i = 0; i <= N; i++) {
        const t = i / N
        const r = bx.getBoundingClientRect()
        const ox = b.offsetLeft + b.offsetWidth / 2, oy = b.offsetTop + b.offsetHeight / 2
        // 멀리서 다가와서, 버튼 둘레를 한 바퀴 돌고, 빠져나가요
        const rad = t < 0.25 ? 170 - 440 * t : t < 0.75 ? 60 : 60 + 480 * (t - 0.75)
        const ang = -2.4 + t * 7
        const x = ox + Math.cos(ang) * rad, y = oy + Math.sin(ang) * rad * 0.6
        cu.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        pull(r.left + x, r.top + y)
        await c.sleep(16)
      }
      cu.classList.remove('on'); release()
    },
  })
  const log: ReactNode = near ? <>버튼이 커서 쪽으로 <b>끌려와요</b> · 멀어지면 튕겨 돌아가요</>
    : hits ? <>눌렀어요 <b>{hits}번</b> · 끌려와도 누르는 자리는 그대로예요</>
    : <>커서를 버튼 <b>가까이</b> 가져가 보세요</>
  return (
    <Card id="micro-magnetic" num="01" title="자석 버튼" en="Magnetic Button" demo={demo}
      desc="커서가 가까이 오면 버튼이 그쪽으로 끌려오고, 멀어지면 튕기듯 제자리로 돌아가요.">
      <Stage log={log}>
        <div className="box mc-box" ref={box} onPointerMove={e => pull(e.clientX, e.clientY)} onPointerLeave={release}>
          <span className="mc-cursor" ref={cur} aria-hidden="true" />
          <div className="mc-mag-zone">
            <button className="mc-mag" ref={btn} onClick={() => setHits(h => h + 1)}><span ref={lab}>시작하기</span></button>
          </div>
          <div className="mc-ctrl">
            <Knob label="끌림"><Seg value={k} onChange={setK} options={[[0.15, '약하게'], [0.35, '보통'], [0.7, '세게']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['반응 거리', '80–120px'], ['끌림', '거리의 20–40%'], ['복귀', '400–600ms 스프링']]}
        usage={[
          ['언제', '랜딩 페이지의 대표 버튼처럼, 화면에 하나뿐이고 눈에 띄어야 하는 버튼'],
          ['원리', '커서와 버튼 중심 사이 거리에 0.2–0.4를 곱한 만큼만 옮겨요. 따라올 때는 지연 없이, 놓을 때는 살짝 넘쳤다 돌아오는 곡선을 써요.'],
          ['주의', '세게 하면 버튼이 도망 다녀서 오히려 누르기 어려워요. 버튼 여러 개에 쓰지 말고, 터치 화면에서는 꺼요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 좋아요 터짐 ---------- */
const DOT_COLORS = ['var(--mc-pink)', 'var(--mc-yellow)', 'var(--accent)', 'var(--b)']
export function LikeBurst() {
  const m = useMotion()
  const [on, setOn] = useState(false)
  const [n, setN] = useState(10)
  const [count, setCount] = useState(128)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const heart = useRef<HTMLSpanElement>(null)
  const fx = useRef<HTMLSpanElement>(null)
  const toggle = () => {
    const next = !on
    setOn(next); setCount(c => c + (next ? 1 : -1))
    const h = heart.current, layer = fx.current
    if (!h || !layer || reduced()) return
    m.clearA(h)
    if (!next) { m.A(h, [{ transform: 'scale(1)' }, { transform: 'scale(.82)' }, { transform: 'scale(1)' }], 200); return }
    m.A(h, [{ transform: 'scale(.3)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], 420, EASE.spring)
    const ring = document.createElement('i')
    ring.className = 'mc-ring'
    layer.appendChild(ring)
    m.A(ring, [{ transform: 'scale(.3)', opacity: 0.9 }, { transform: 'scale(1.5)', opacity: 0 }], 420, EASE.out).onfinish = () => ring.remove()
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const d = 30 + Math.random() * 14
      const dot = document.createElement('i')
      dot.className = 'mc-dot'
      dot.style.background = DOT_COLORS[i % DOT_COLORS.length]
      layer.appendChild(dot)
      m.A(dot, [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${(Math.cos(a) * d).toFixed(1)}px, ${(Math.sin(a) * d).toFixed(1)}px) scale(0)`, opacity: 0.9 },
      ], 520, EASE.out, 60).onfinish = () => dot.remove()
    }
  }
  const demo = useDemo({
    reset() { setOn(false); setCount(128); fx.current?.replaceChildren() },
    async play(c) { await c.press(box.current, btn.current); await c.sleep(1200) },
  })
  return (
    <Card id="micro-like" num="02" title="좋아요 터짐" en="Like Burst" demo={demo}
      desc="하트가 톡 커지면서 작은 조각이 사방으로 튀어요. 누른 보람을 0.4초 안에 돌려줘요.">
      <Stage log={on ? <>좋아요를 <b>눌렀어요</b>{n === 0 ? ' · 조각 없이 하트만 커져요' : n >= 16 ? ' · 조각이 많으면 축하처럼 보여요' : ''}</> : <>취소할 때는 <b>조용히</b> 줄어들기만 해요</>}>
        <div className="box mc-box" ref={box}>
          <div className="mc-post">
            <div className="mc-post-img" aria-hidden="true" />
            <div className="mc-post-row">
              <button className={'mc-like' + (on ? ' on' : '')} ref={btn} onClick={toggle} aria-pressed={on} aria-label="좋아요">
                <span className="mc-like-fx" ref={fx} aria-hidden="true" />
                <span className="mc-heart" ref={heart}>
                  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>
                </span>
              </button>
              <span className="mc-cnt-wrap">좋아요 <span key={count} className={'mc-cnt ' + (on ? 'up' : 'down')}>{count}</span>개</span>
            </div>
          </div>
          <div className="mc-ctrl">
            <Knob label="조각"><Seg value={n} onChange={setN} options={[[0, '없음'], [10, '10개'], [18, '18개']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['하트', '300–450ms 스프링'], ['조각', '6–12개'], ['거리', '30–45px']]}
        usage={[
          ['언제', '좋아요, 찜, 북마크처럼 가볍고 기분 좋은 행동에 대한 보상'],
          ['실무', '켤 때만 터뜨리고 끌 때는 조용히 줄여요. 취소까지 축하하면 어색해요. 조각은 끝나면 화면에서 지워야 쌓이지 않아요.'],
          ['주의', '목록에서 연달아 누르는 버튼이라면 조각을 줄이거나 빼요. 색만 바뀌면 놓치니, 숫자와 aria-pressed로도 상태를 알려요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 인증번호 칸 ---------- */
const CODE = '123456'
type OtpSt = 'idle' | 'check' | 'ok' | 'bad'
export function Otp() {
  const [v, setV] = useState('')
  const [st, setSt] = useState<OtpSt>('idle')
  const [focus, setFocus] = useState(false)
  const { run, stop } = useRun()
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const set = (raw: string) => {
    if (st === 'check' || st === 'ok') return
    const d = raw.replace(/\D/g, '').slice(0, 6)
    stop(); setV(d); setSt('idle')
    if (d.length < 6) return
    run(async sl => {
      setSt('check'); await sl(700)
      if (d === CODE) { setSt('ok'); return }
      setSt('bad'); await sl(650)
      setV(''); setSt('idle')
    })
  }
  const again = () => { stop(); setV(''); setSt('idle'); input.current?.focus() }
  const demo = useDemo({
    reset() { stop(); setV(''); setSt('idle') },
    async play(c) {
      c.tap(box.current, input.current)
      for (let i = 1; i <= CODE.length; i++) { await c.sleep(190); set(CODE.slice(0, i)) }
      await c.sleep(1800)
    },
  })
  const logs: Record<OtpSt, ReactNode> = {
    idle: v ? <><b>{v.length}</b> / 6 · 다 채우면 버튼 없이 바로 확인해요</> : <>연습용 번호는 <b>123456</b> · 다른 번호를 넣으면 흔들려요</>,
    check: <>확인하는 중 · 이때는 <b>입력을 잠가요</b></>,
    ok: <>칸이 차례로 <b>초록</b>으로 바뀌었어요</>,
    bad: <>좌우로 흔들고 <b>칸을 비워요</b> · 다시 넣기 쉽게</>,
  }
  return (
    <Card id="micro-otp" num="03" title="인증번호 칸" en="OTP Code Input" demo={demo}
      desc="숫자를 넣으면 칸이 하나씩 차고, 틀리면 좌우로 흔들려요. 칸은 여섯 개지만 입력창은 하나예요.">
      <Stage log={logs[st]}>
        <div className="box mc-box" ref={box}>
          <p className="mc-otp-h">문자로 받은 6자리 번호를 넣어 주세요</p>
          <div className={'mc-otp ' + st}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={'mc-otp-b' + (v[i] ? ' filled' : '') + (focus && st === 'idle' && i === Math.min(v.length, 5) ? ' cur' : '')}
                style={{ ['--i' as string]: i }} aria-hidden="true">
                {v[i] && <span key={v[i] + i}>{v[i]}</span>}
              </div>
            ))}
            <input ref={input} value={v} onChange={e => set(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="인증번호 6자리" aria-invalid={st === 'bad'} />
          </div>
          <p className={'mc-otp-msg ' + st} role="status">
            {st === 'check' ? '확인하고 있어요' : st === 'ok' ? '인증했어요' : st === 'bad' ? '번호가 달라요. 다시 넣어 주세요' : ' '}
          </p>
          {st === 'ok' && <button className="btn ghost sm" onClick={again}>다시 해 보기</button>}
        </div>
      </Stage>
      <Info
        spec={[['칸 채움', '150–200ms'], ['흔들기', '350–400ms'], ['입력창', '1개']]}
        usage={[
          ['언제', '문자·메일 인증번호, 2단계 인증, 초대 코드처럼 자릿수가 정해진 짧은 번호'],
          ['실무', '칸마다 입력창을 두면 붙여넣기와 문자 자동 입력이 깨지기 쉬워요. 보이지 않는 입력창 하나를 칸 위에 덮고, autocomplete="one-time-code"를 달아요.'],
          ['주의', '흔들림만으로는 왜 틀렸는지 몰라요. ‘번호가 달라요’ 같은 글을 꼭 같이 띄우고, 화면 낭독기에도 알려요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 숫자 스테퍼 ---------- */
const PRICE = 4900
export function Stepper() {
  const [n, setN] = useState(1)
  const [prev, setPrev] = useState(1)
  const [dir, setDir] = useState<'up' | 'down'>('up')
  const [roll, setRoll] = useState(true)
  const [nudge, setNudge] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const plus = useRef<HTMLButtonElement>(null)
  const minus = useRef<HTMLButtonElement>(null)
  const step = (d: 1 | -1) => {
    const next = n + d
    if (next < 1 || next > 9) { setNudge(x => x + 1); return }
    setPrev(n); setDir(d > 0 ? 'up' : 'down'); setN(next)
  }
  const demo = useDemo({
    reset() { setN(1); setPrev(1); setNudge(0) },
    async play(c) {
      for (let i = 0; i < 3; i++) { await c.press(box.current, plus.current); await c.sleep(420) }
      await c.press(box.current, minus.current); await c.sleep(900)
    },
  })
  const atEdge = nudge > 0 && (n === 1 || n === 9)
  return (
    <Card id="micro-stepper" num="04" title="숫자 스테퍼" en="Number Stepper" demo={demo}
      desc="더하면 숫자가 아래에서 올라오고, 빼면 위에서 내려와요. 방향이 늘었는지 줄었는지를 말해 줘요.">
      <Stage log={atEdge ? <>{n === 1 ? '1개보다 줄일 수 없어요' : '한 번에 9개까지 담을 수 있어요'} · 버튼이 <b>고개를 저어요</b></> : roll ? <>숫자가 <b>{dir === 'up' ? '아래에서 위로' : '위에서 아래로'}</b> 굴러요</> : <>숫자가 <b>그 자리에서</b> 바뀌어요 · 놓치기 쉬워요</>}>
        <div className="box mc-box" ref={box}>
          <div className="mc-item">
            <div className="mc-item-t"><b>제철 반찬 세트</b><span>1개 {PRICE.toLocaleString()}원</span></div>
            <div className={'mc-step' + (atEdge ? ' nudge' : '')} key={nudge} role="group" aria-label="수량">
              <button ref={minus} onClick={() => step(-1)} aria-label="하나 빼기" aria-disabled={n === 1}>−</button>
              <span className={'mc-step-n ' + (roll ? dir : 'flat')} aria-live="polite" aria-atomic="true">
                {roll && prev !== n && <i key={'o' + n} className="out" aria-hidden="true">{prev}</i>}
                <b key={n}>{n}</b>
              </span>
              <button ref={plus} onClick={() => step(1)} aria-label="하나 더하기" aria-disabled={n === 9}>+</button>
            </div>
          </div>
          <p className="mc-total">합계 <b>{(n * PRICE).toLocaleString()}원</b></p>
          <div className="mc-ctrl">
            <Knob label="바뀔 때"><Seg value={roll ? 1 : 0} onChange={v => setRoll(!!v)} options={[[1, '굴리기'], [0, '그냥 바꾸기']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['굴림', '180–240ms'], ['이동 거리', '글자 높이만큼'], ['방향', '＋ 위로 / − 아래로']]}
        usage={[
          ['언제', '장바구니 수량, 인원 수, 객실 수처럼 한 칸씩 올리고 내리는 작은 숫자'],
          ['원리', '숫자 칸의 넘치는 부분을 가리고, 이전 숫자는 밀어내고 새 숫자는 반대쪽에서 들여와요. 숫자 폭이 같도록 tabular-nums를 써요.'],
          ['주의', '끝에 닿았을 때 버튼을 그냥 죽이면 고장처럼 보여요. 왜 더 못 가는지 글로 알려주고, 빠르게 연타해도 밀리지 않게 짧게 가져가요.'],
        ]}
      />
    </Card>
  )
}
