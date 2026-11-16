import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { Knob } from '../shared'
import { bell, reduced, useRun } from '../util'

/* ---------- 09 생각 중 표시 ---------- */
type Kind = 'shimmer' | 'dots' | 'steps'
/** [하는 중, 끝난 뒤] */
const STEPS: [string, string][] = [['질문 읽는 중', '질문 읽음'], ['회의록 3건 찾는 중', '회의록 3건 찾음'], ['답 정리하는 중', '답 정리함']]
export function Thinking() {
  const [kind, setKind] = useState<Kind>('shimmer')
  const [ph, setPh] = useState<'idle' | 'think' | 'done'>('idle')
  const [step, setStep] = useState(0)
  const { run, stop } = useRun()
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const go = () => run(async sl => {
    setPh('think')
    for (let s = 0; s < STEPS.length; s++) { setStep(s); await sl(950) }
    setPh('done')
  })
  const demo = useDemo({
    reset() { stop(); setPh('idle'); setStep(0) },
    async play(c) { await c.press(box.current, btn.current); await c.sleep(3800) },
  })
  const logs: Record<Kind, ReactNode> = {
    shimmer: <>글자 위로 빛이 <b>지나가요</b> · 조용하지만 살아 있다는 신호</>,
    dots: <>점 세 개가 <b>차례로</b> 튀어요 · 채팅에서 익숙한 표현</>,
    steps: <>지금 하는 일을 <b>한 줄씩</b> 알려줘요 · 오래 걸릴수록 좋아요</>,
  }
  return (
    <Card id="micro-thinking" num="09" title="생각 중 표시" en="Thinking Indicator" demo={demo}
      desc="AI가 답을 준비하는 동안 글자가 반짝이거나, 점이 튀거나, 지금 하는 일을 한 줄씩 알려줘요.">
      <Stage log={ph === 'done' ? <>답이 나오면 표시는 <b>바로 사라져요</b></> : ph === 'idle' ? <>질문을 보내고 기다리는 동안을 보세요</> : logs[kind]}>
        <div className="box left mc-box" ref={box}>
          <div className="mc-chat">
            <p className="mc-q">이번 주 회의록 요약해 줘</p>
            {ph === 'think' && (
              <div className="mc-think" role="status" aria-label={kind === 'steps' ? STEPS[step][0] : '답을 준비하고 있어요'}>
                {kind === 'shimmer' && <span className="mc-shim">생각하는 중</span>}
                {kind === 'dots' && <span className="mc-tdots" aria-hidden="true"><i /><i /><i /></span>}
                {kind === 'steps' && (
                  <ul className="mc-tsteps" aria-hidden="true">
                    {STEPS.map(([now, done], i) => i <= step && (
                      <li key={now} className={i < step ? 'ok' : 'now'}><i />{i < step ? done : now}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {ph === 'done' && (
              <p className="mc-a">세 가지로 정리했어요. 출시는 3월 둘째 주로 미뤘고, 결제 화면은 다시 그리기로 했고, 다음 회의는 목요일이에요.</p>
            )}
          </div>
          <div className="mc-ctrl">
            <button className="btn sm" ref={btn} onClick={go} disabled={ph === 'think'}>{ph === 'idle' ? '질문 보내기' : '다시 보내기'}</button>
            <Knob label="표시"><Seg value={kind} onChange={setKind} options={[['shimmer', '반짝임'], ['dots', '점 세 개'], ['steps', '단계']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['반짝임 주기', '1.2–1.6초'], ['점 간격', '120–160ms'], ['단계', '3–5개']]}
        usage={[
          ['언제', '답이 나오기까지 1초 넘게 걸리는 AI 대화, 검색, 긴 계산'],
          ['실무', '2–3초면 반짝임이나 점으로 충분해요. 10초를 넘기면 ‘자료 찾는 중’처럼 무엇을 하는지 보여줘야 멈춘 게 아니라고 믿어요.'],
          ['주의', '실제로 하지 않는 단계를 지어내면 안 돼요. 답의 첫 글자가 나오는 즉시 표시를 치우고, 화면 낭독기에는 role="status"로 한 번만 알려요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 10 유령 제안 ---------- */
const SUGGEST = ['회의록을 세 줄로 요약해 줘', '내일 오전 일정을 알려 줘', '오늘 할 일을 정리해 줘', '이 문장을 더 정중하게 바꿔 줘']
export function Ghost() {
  const m = useMotion()
  const timers = useTimers()
  const [v, setV] = useState('')
  const [show, setShow] = useState(false)
  const [delay, setDelay] = useState(300)
  const [took, setTook] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const full = v ? SUGGEST.find(s => s.startsWith(v) && s !== v) : undefined
  const rest = full && show ? full.slice(v.length) : ''
  const change = (nv: string, d = delay) => {
    setV(nv); setShow(false); setTook(false)
    timers.clear()
    timers.set(() => setShow(true), m.D(d))
  }
  const accept = () => {
    if (!full || !show) return
    timers.clear(); setV(full); setShow(false); setTook(true)
  }
  const demo = useDemo({
    reset() { timers.clear(); setV(''); setShow(false); setTook(false) },
    async play(c) {
      c.tap(box.current, input.current)
      for (const s of ['회', '회의', '회의록']) { await c.sleep(260); change(s) }
      await c.sleep(delay + 900)
      setV(SUGGEST[0]); setShow(false); setTook(true)
      await c.sleep(1200)
    },
  })
  const log: ReactNode = took ? <>제안을 <b>받아들였어요</b> · 계속 고쳐 쓸 수 있어요</>
    : rest ? <>흐린 글자가 제안이에요 · <b>Tab</b>으로 받고 <b>Esc</b>로 지워요</>
    : v ? <>맞는 제안이 없으면 <b>아무것도 안 보여요</b></>
    : <>‘회의’, ‘내일’, ‘오늘’로 시작해 보세요</>
  return (
    <Card id="micro-ghost" num="10" title="유령 제안" en="Ghost Suggestion" demo={demo}
      desc="쓰고 있는 글 뒤에 이어질 말이 흐린 글자로 나타나요. Tab을 누르면 그대로 받아들여요.">
      <Stage log={log}>
        <div className="box left mc-box" ref={box}>
          <label className="mc-gh-l" htmlFor="mc-gh-in">무엇을 도와드릴까요?</label>
          <div className="mc-gh">
            <div className="mc-gh-mirror" aria-hidden="true"><span className="t">{v}</span>{rest && <span className="g" key={full}>{rest}</span>}</div>
            <input id="mc-gh-in" ref={input} value={v} autoComplete="off" spellCheck={false} placeholder="예: 회의록을…"
              aria-describedby="mc-gh-hint"
              onChange={e => change(e.target.value)}
              onKeyDown={e => {
                if (!rest) return
                const atEnd = e.currentTarget.selectionStart === v.length
                if (e.key === 'Tab' || (e.key === 'ArrowRight' && atEnd)) { e.preventDefault(); accept() }
                else if (e.key === 'Escape') setShow(false)
              }} />
          </div>
          <div className="mc-gh-foot">
            <span id="mc-gh-hint" className="mc-gh-hint" role="status">{rest ? `제안: ${full}` : ' '}</span>
            {rest && <button className="btn ghost sm" onClick={() => { accept(); input.current?.focus() }}><kbd>Tab</kbd> 받기</button>}
          </div>
          <div className="mc-ctrl">
            <Knob label="나타나는 때"><Seg value={delay} onChange={setDelay} options={[[0, '바로'], [300, '0.3초 뒤'], [900, '0.9초 뒤']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['등장 지연', '200–400ms'], ['받기', 'Tab · →'], ['무시', 'Esc · 계속 입력']]}
        usage={[
          ['언제', '검색어, 메일 문장, 코드, AI에게 보낼 질문처럼 다음 말을 예측할 수 있는 입력'],
          ['실무', '입력을 멈춘 뒤 잠깐 기다렸다가 보여줘요. 글자마다 바로 바뀌면 깜빡여서 읽을 수 없어요. 키보드가 없는 터치 화면에는 ‘받기’ 버튼을 따로 둬요.'],
          ['주의', 'Tab은 원래 다음 칸으로 넘어가는 키예요. 제안이 보일 때만 가로채고, 흐린 글자는 화면 낭독기가 못 읽으니 제안 내용을 글로도 알려요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 11 굵기 물결 ---------- */
const WAVE = '굵기가 물결쳐요'
export function WeightWave() {
  const [spread, setSpread] = useState(55)
  const [live, setLive] = useState(false)
  const line = useRef<HTMLParagraphElement>(null)
  const chars = useRef<HTMLSpanElement[]>([])
  const apply = (cx: number | null, sp = spread) => {
    chars.current.forEach(el => {
      if (!el) return
      if (cx == null) { el.style.fontWeight = ''; return }
      const r = el.getBoundingClientRect()
      el.style.fontWeight = String(Math.round(250 + 650 * bell(cx - (r.left + r.width / 2), sp)))
    })
    setLive(cx != null)
  }
  const demo = useDemo({
    reset() { apply(null) },
    async play(c) {
      const l = line.current
      if (!l || reduced()) return
      const N = 110
      for (let i = 0; i <= N; i++) {
        const r = l.getBoundingClientRect(), t = i / N
        const p = t < 0.5 ? t * 2 : 2 - t * 2
        apply(r.left - 30 + (r.width + 60) * p)
        await c.sleep(16)
      }
      apply(null)
    },
  })
  return (
    <Card id="micro-weight" num="11" title="굵기 물결" en="Weight Wave" demo={demo}
      desc="커서가 지나가는 자리의 글자만 굵어졌다가 돌아와요. 가변 폰트 하나로 만드는 움직임이에요.">
      <Stage log={live ? <>커서 아래는 <b>900</b>, 멀어질수록 <b>250</b>까지 가늘어져요</> : <>글자 위로 커서를 <b>쓸어</b> 보세요</>}>
        <div className="box mc-box">
          <p className="mc-wave" ref={line} aria-label={WAVE} onPointerMove={e => apply(e.clientX)} onPointerLeave={() => apply(null)}>
            {Array.from(WAVE).map((ch, i) => ch === ' '
              ? <span key={i} className="sp" aria-hidden="true" />
              : <span key={i} ref={el => { if (el) chars.current[i] = el }} aria-hidden="true">{ch}</span>)}
          </p>
          <div className="mc-ctrl">
            <Knob label="퍼짐"><Seg value={spread} onChange={setSpread} options={[[28, '좁게'], [55, '보통'], [110, '넓게']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['굵기', '250 → 900'], ['따라오기', '100–150ms'], ['폰트', '가변(Variable)']]}
        usage={[
          ['언제', '랜딩 페이지의 큰 제목, 로고 글자처럼 짧고 크게 쓰는 글에 장난기를 더할 때'],
          ['원리', '가변 폰트는 굵기를 100 단위가 아니라 1 단위로 바꿀 수 있어요. 글자마다 커서와의 거리로 font-weight를 정하면 굵기가 물결처럼 번져요.'],
          ['주의', '굵어지면 글자 폭이 달라져서 줄 전체가 흔들려요. 글자마다 칸 폭을 고정하고, 본문처럼 읽어야 하는 글에는 쓰지 않아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 12 굴러가는 링크 ---------- */
const LINKS = ['작업물', '소개', '기록', '문의하기']
type Unit = 'char' | 'whole'
export function RollLinks() {
  const [unit, setUnit] = useState<Unit>('char')
  const [hot, setHot] = useState(-1)
  const [picked, setPicked] = useState('')
  const demo = useDemo({
    reset() { setHot(-1) },
    async play(c) {
      for (let i = 0; i < LINKS.length; i++) { setHot(i); await c.sleep(620); setHot(-1); await c.sleep(160) }
    },
  })
  return (
    <Card id="micro-roll" num="12" title="굴러가는 링크" en="Roll Links" demo={demo}
      desc="링크에 커서를 올리면 글자가 위로 굴러 올라가고 같은 글자가 아래에서 따라와요.">
      <Stage log={picked ? <>‘<b>{picked}</b>’ 메뉴를 눌렀어요</> : unit === 'char' ? <>글자가 <b>하나씩 늦게</b> 굴러서 물결처럼 보여요</> : <>단어가 <b>통째로</b> 굴러요 · 더 차분해요</>}>
        <div className="box mc-box">
          <nav className={'mc-roll-nav ' + unit} aria-label="예시 메뉴">
            {LINKS.map((t, i) => (
              <button key={t} className={'mc-roll' + (hot === i ? ' on' : '')} aria-label={t} onClick={() => setPicked(t)}>
                {Array.from(t).map((ch, k) => (
                  <span key={k} className="mc-roll-c" style={{ ['--i' as string]: k }} aria-hidden="true"><i>{ch}</i><i>{ch}</i></span>
                ))}
              </button>
            ))}
          </nav>
          <div className="mc-ctrl center">
            <Knob label="단위"><Seg value={unit} onChange={setUnit} options={[['char', '글자별'], ['whole', '통째로']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['굴림', '250–350ms'], ['글자 간 지연', '20–30ms'], ['이동', '글자 높이 100%']]}
        usage={[
          ['언제', '포트폴리오나 브랜드 사이트의 상단 메뉴, 바닥글 링크처럼 짧은 단어가 몇 개 놓인 곳'],
          ['원리', '같은 글자를 위아래로 두 벌 겹쳐 놓고, 한 줄 높이만 보이게 가려요. 올리면 두 벌이 함께 한 칸 올라가서 글자가 굴러 바뀌는 것처럼 보여요.'],
          ['주의', '글자를 두 번 넣었으니 화면 낭독기가 두 번 읽지 않게 조각은 숨기고 이름은 따로 줘요. 키보드로 옮겨 갈 때도 똑같이 굴러야 해요.'],
        ]}
      />
    </Card>
  )
}
