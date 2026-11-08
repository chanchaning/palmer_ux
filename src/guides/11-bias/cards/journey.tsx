import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { EASE, useMotion } from '../../../lib/motion'
import { ABSeg, DpLink, View, abBtn, useAB, type AB } from '../shared'

/* ---------- 07 선택 과부하 ---------- */
const BEANS = ['예가체프', '시다모', '케냐AA', '수프리모', '안티구아', '산토스', '타라주', '게이샤', '만델링', '코나', '탄자니아', '르완다', '온두라스', '페루', '멕시코', '니카라과', '볼리비아', '부룬디', '우간다', '모카', '베트남', '인도', '하라', '디카페인']
const TOP3: [string, string, string, string][] = [
  ['예가체프', '🍋', '산뜻한 산미 · 예가체프', '가볍고 꽃향이 좋아요'],
  ['산토스', '🌰', '고소한 맛 · 산토스', '우유와 잘 어울려요'],
  ['만델링', '🍫', '묵직한 단맛 · 만델링', '진하고 쌉쌀해요'],
]
interface PickState { tm: string; picked: string | null; done: boolean; started: boolean }
const P0: PickState = { tm: '0.0초', picked: null, done: false, started: false }

export function Choice() {
  const [run, setRun] = useState<{ k: AB; t0: number } | null>(null)
  const [ps, setPs] = useState<Record<AB, PickState>>({ a: P0, b: P0 })
  const [res, setRes] = useState<Record<AB, number | null>>({ a: null, b: null })
  const [log, setLog] = useState<ReactNode>(<><b>고르기 시작</b>을 누르면 시간을 재요</>)
  const ab = useAB(v => {
    setRun(null)
    setLog(v === 'a' ? <><b>24종</b> — 고르기 시작을 누르면 시간을 재요</> : <><b>추천 3종</b> — 이번엔 얼마나 걸릴까요?</>)
  })

  // 재는 동안 타이머 표시 갱신
  useEffect(() => {
    if (!run) return
    let raf = 0
    const tick = () => {
      setPs(p => ({ ...p, [run.k]: { ...p[run.k], tm: ((performance.now() - run.t0) / 1000).toFixed(1) + '초' } }))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [run])

  const start = (k: AB) => {
    setPs(p => ({ ...p, [k]: { ...p[k], picked: null, done: false, started: true } }))
    setRun({ k, t0: performance.now() })
    setLog(<>시간 재는 중… 마음에 드는 원두를 <b>하나</b> 고르세요</>)
  }
  const pick = (k: AB, n: string) => {
    if (!run || run.k !== k) return
    const s = (performance.now() - run.t0) / 1000
    setRun(null)
    setPs(p => ({ ...p, [k]: { ...p[k], picked: n, done: true, tm: s.toFixed(1) + '초' } }))
    const nr = { ...res, [k]: s }
    setRes(nr)
    const other = nr[k === 'a' ? 'b' : 'a']
    if (other != null) {
      const ra = nr.a!, rb = nr.b!
      setLog(<>24개 <b>{ra.toFixed(1)}초</b> vs 3개 <b>{rb.toFixed(1)}초</b> — {ra > rb ? <>추천이 <b>{(ra / Math.max(rb, 0.1)).toFixed(1)}배</b> 빨랐어요</> : '이번엔 24개도 빨랐네요. 이미 원하는 게 있었나 봐요'}</>)
    } else {
      setLog(<><b>{n}</b> · {s.toFixed(1)}초 — 이제 {k === 'a' ? <b>적용 후</b> : <b>적용 전</b>}에서도 재보세요</>)
    }
  }
  const pickBox = (k: AB, opts: ReactNode) => {
    const p = ps[k], running = run?.k === k
    return (
      <div className={'bias-pick' + (running ? ' run' : '') + (p.done ? ' done' : '')} id={'bias-choice-p' + k}>
        {opts}
        <button className="btn sm orange bias-start" data-start onClick={() => start(k)}>{p.started ? '↻ 다시 재기' : '▶ 고르기 시작'}</button>
      </div>
    )
  }
  const cls = (k: AB, n: string) => (ps[k].picked === n ? 'picked' : undefined)

  return (
    <Card id="bias-choice" num="07" title="선택 과부하" en="Choice Overload" desc="선택지가 너무 많으면 고르는 데 오래 걸리고, 아예 포기하기도 해요.">
      <Stage log={log} logId="bias-choice-log">
        <ABSeg ab={ab} />
        <div className="box left bias-box" id="bias-choice-box" data-ab={ab.v}>
          <View k="a" ab={ab}>
            <div className="row"><span className="bias-cap">원두 24종 중 하나 고르기</span><span className="bias-timer" id="bias-choice-ta">{ps.a.tm}</span></div>
            {pickBox('a', (
              <div className="opts bias-g24" id="bias-choice-grid">
                {BEANS.map(b => <button key={b} data-n={b} className={cls('a', b)} onClick={() => pick('a', b)}>{b}</button>)}
              </div>
            ))}
          </View>
          <View k="b" ab={ab}>
            <div className="row"><span className="bias-cap">추천 원두 3종 중 하나 고르기</span><span className="bias-timer" id="bias-choice-tb">{ps.b.tm}</span></div>
            {pickBox('b', (
              <div className="opts bias-g3">
                {TOP3.map(([n, e, t, s]) => (
                  <button key={n} data-n={n} className={cls('b', n)} onClick={() => pick('b', n)}><span className="e">{e}</span><span><b>{t}</b><small>{s}</small></span></button>
                ))}
              </div>
            ))}
          </View>
          <div className="bias-res">
            <span>24개에서<b id="bias-choice-ra">{res.a != null ? res.a.toFixed(1) + '초' : '—'}</b></span>
            <span>3개에서<b id="bias-choice-rb">{res.b != null ? res.b.toFixed(1) + '초' : '—'}</b></span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['선택지', '24 vs 3'], ['효과', '결정 지연·포기'], ['쓰임', '상품 목록·플랜']]}
        usage={[
          ['활용 팁', '처음엔 추천 3~5개로 좁히고, ‘전체 보기’로 나머지를 열어 두세요'],
          ['주의', <>비싼 것만 남기려고 다른 옵션을 숨기면 선택권 침해예요 · <DpLink /></>],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 피크엔드 법칙 ---------- */
const NAMES = ['장바구니', '배송지', '결제', '완료']
const PEAK: Record<AB, { v: number[]; s: ReactNode[] }> = {
  a: {
    v: [3, 2, 3, 2],
    s: [
      <>🛒 <b>장바구니</b> · 상품 2개 54,000원</>,
      <>📦 <b>배송지</b>를 입력해 주세요<span className="muted">주소 · 연락처 · 요청사항</span></>,
      <>💳 <b>결제 수단</b>을 선택해 주세요<span className="muted">총 54,000원</span></>,
      <>결제가 완료되었습니다.<span className="muted">주문번호 1108-0042</span></>,
    ],
  },
  b: {
    v: [3, 2, 4, 5],
    s: [
      <>🛒 <b>장바구니</b> · 상품 2개 54,000원</>,
      <>📦 <b>배송지</b>를 입력해 주세요<span className="muted">주소 · 연락처 · 요청사항</span></>,
      <>💳 쿠폰이 <b>자동 적용</b>됐어요<span className="muted">3,000원 아꼈어요 · 총 51,000원</span></>,
      <><span className="big-e">🎉 주문 완료!</span><span>내일 아침 7시 전에 도착해요</span></>,
    ],
  },
}
const PX = (i: number) => 22 + i * 72
const PY = (v: number) => 64 - (v - 1) * 13

export function Peak() {
  const m = useMotion()
  const [step, setStep] = useState(0)
  const [tick, setTick] = useState(0) // 화면 갱신마다 등장 효과
  const ab = useAB(() => { setStep(0); setTick(t => t + 1) })
  const box = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const scr = useRef<HTMLDivElement>(null)
  const next = useRef<HTMLButtonElement>(null)
  const celebrate = useRef(false)

  const d = PEAK[ab.v], end = step === 3

  useLayoutEffect(() => {
    const el = scr.current
    if (!el) return
    m.clearA(el)
    m.A(el, [{ opacity: 0, transform: 'translateX(10px)' }, { opacity: 1, transform: 'none' }], 240, EASE.out)
    if (!celebrate.current) return
    celebrate.current = false
    const cols = ['var(--accent)', 'var(--b)', 'var(--danger)', 'var(--text-3)']
    for (let i = 0; i < 18; i++) {
      const c = document.createElement('i')
      c.className = 'bias-conf'; c.style.background = cols[i % 4]
      el.appendChild(c)
      const a = (Math.PI * 2 * i) / 18, dd = 50 + Math.random() * 50
      m.A(c, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * dd}px,${Math.sin(a) * dd * 0.6}px) rotate(${i * 40}deg) scale(.6)`, opacity: 0 }], 900, EASE.out).onfinish = () => c.remove()
    }
  }, [tick, m])

  const onNext = () => {
    const s = step === 3 ? 0 : step + 1
    if (s === 3 && ab.v === 'b') celebrate.current = true
    setStep(s); setTick(t => t + 1)
  }

  let score: ReactNode, log: ReactNode
  if (end) {
    const peak = Math.max(...d.v), last = d.v[3]
    score = <>기억 점수 = (최고 {peak} + 마지막 {last}) ÷ 2 = <b>{((peak + last) / 2).toFixed(1)}</b></>
    log = ab.v === 'a' ? <>끝이 밋밋하면 <b>전체가 밋밋하게</b> 기억돼요</> : <>중간 배송지 입력은 똑같이 귀찮았지만 <b>좋은 기억</b>으로 남아요</>
  } else {
    score = <>지금 기분 <b>{d.v[step]}</b> / 5</>
    log = <><b>{NAMES[step]}</b> 단계{ab.v === 'b' && step === 2 && <> — 예상 못 한 <b>절정</b>이에요</>}</>
  }
  const vs = d.v.slice(0, step + 1)

  const demo = useDemo({
    reset() { ab.set('a', true) },
    async play(c) {
      await c.sleep(300); await c.press(seg.current?.parentElement ?? null, abBtn(seg.current, 'b')); await c.sleep(700)
      for (let i = 0; i < 3; i++) { await c.press(box.current, next.current); await c.sleep(850) }
      await c.sleep(400)
    },
  })

  return (
    <Card id="bias-peak" num="08" title="피크엔드 법칙" en="Peak-End Rule" desc="경험 전체가 아니라 가장 강렬했던 순간과 마지막 순간으로 기억해요." demo={demo}>
      <Stage log={log} logId="bias-peak-log">
        <ABSeg ab={ab} ref={seg} />
        <div className="box left bias-box" id="bias-peak-box" data-ab={ab.v} ref={box}>
          <div className="bias-steps" id="bias-peak-steps">{NAMES.map((n, i) => <span key={n} className={i <= step ? 'on' : undefined}>{n}</span>)}</div>
          <div className={'bias-scr' + (ab.v === 'b' && step >= 2 ? ' peak' : '')} id="bias-peak-scr" ref={scr}>
            <div>{d.s[step]}</div>
          </div>
          <svg className="bias-chart" id="bias-peak-chart" viewBox="0 0 260 72" aria-hidden="true">
            <line className="grid-l" x1="0" x2="260" y1={PY(3)} y2={PY(3)} />
            <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              points={vs.map((v, i) => PX(i) + ',' + PY(v)).join(' ')} />
            {vs.map((v, i) => <circle key={i} cx={PX(i)} cy={PY(v)} r="3.5" fill="currentColor" />)}
          </svg>
          <div className="bias-score" id="bias-peak-score">{score}</div>
          <button className="btn sm bias-cta" id="bias-peak-next" ref={next} onClick={onNext}>{end ? '↻ 처음부터' : '다음 단계 →'}</button>
        </div>
      </Stage>
      <Info
        spec={[['기억', '절정 + 끝'], ['효과', '전체 평가 좌우'], ['쓰임', '완료 화면·온보딩']]}
        usage={[
          ['활용 팁', '완료 화면에 도착 시간·아낀 금액처럼 쓸모 있는 정보와 작은 축하를 넣어요'],
          ['주의', <>불편한 과정이나 추가 결제를 마지막 축하로 덮으면 조종이에요 · <DpLink /></>],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 자이가르닉 효과 ---------- */
type Task = 'photo' | 'tags' | 'bio'
const MENU: [Task, string][] = [['photo', '프로필 사진'], ['tags', '관심 분야'], ['bio', '소개']]
const TASKS: [Task, string][] = [['photo', '📷 프로필 사진 추가'], ['tags', '🏷️ 관심 분야 고르기'], ['bio', '✍️ 소개 한 줄 쓰기']]

export function Zeigarnik() {
  const [done, setDone] = useState<Set<Task>>(new Set())
  const [log, setLog] = useState<ReactNode>(<>남은 일이 <b>보이지 않는</b> 평범한 메뉴예요</>)
  const ab = useAB(v => setLog(v === 'a' ? <>남은 일이 <b>보이지 않는</b> 평범한 메뉴예요</> : <><b>70%</b> — 거의 다 됐다는 느낌이 마저 하고 싶게 만들어요</>))
  const box = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const p = 70 + done.size * 10

  const doTask = (t: Task) => {
    const was = done.has(t)
    const nd = new Set(done).add(t)
    setDone(nd)
    const np = 70 + nd.size * 10
    if (ab.v === 'a') setLog(was ? '이미 설정했어요' : <>설정됨 — 진행 상황이 안 보여 <b>남은 일</b>을 알기 어려워요</>)
    else setLog(np === 100 ? <>🎉 <b>100% 완성!</b> 미완료의 긴장이 풀리며 뿌듯해요</> : <><b>{np}%</b> — 끝나지 않은 일이 머리에 남아 마저 하고 싶어져요</>)
  }

  const demo = useDemo({
    reset() { setDone(new Set()); ab.set('a', true) },
    async play(c) {
      const q = (s: string) => box.current?.querySelector<HTMLElement>(s) ?? null
      await c.sleep(500); await c.press(seg.current?.parentElement ?? null, abBtn(seg.current, 'b')); await c.sleep(1100)
      await c.press(box.current, q('.bias-task[data-task="photo"]')); await c.sleep(900)
      await c.press(box.current, q('.bias-task[data-task="tags"]')); await c.sleep(400)
    },
  })

  return (
    <Card id="bias-zeig" num="09" title="자이가르닉 효과" en="Zeigarnik Effect" desc="끝내지 못한 일은 머릿속에 계속 남아서 마저 끝내고 싶어져요." demo={demo}>
      <Stage log={log} logId="bias-zeig-log">
        <ABSeg ab={ab} ref={seg} />
        <div className="box left bias-box" id="bias-zeig-box" data-ab={ab.v} ref={box}>
          <div className="bias-me">
            <span className={'av' + (done.has('photo') ? ' set' : '')} id="bias-zeig-av">{done.has('photo') ? '🙂' : '👤'}</span>
            <div><b style={{ fontSize: 15 }}>김와플</b><div className="muted">waffle@example.com</div></div>
          </div>
          <View k="a" ab={ab}>
            <div className="bias-cap">내 프로필</div>
            <div>
              {MENU.map(([t, label]) => (
                <button key={t} className="bias-menu" data-task={t} onClick={() => doTask(t)}>
                  <span className="t">{label}</span><span className={'st' + (done.has(t) ? ' ok' : '')}>{done.has(t) ? '설정됨' : '›'}</span>
                </button>
              ))}
            </div>
          </View>
          <View k="b" ab={ab}>
            <div className="row"><b style={{ fontSize: 14 }}>프로필 완성도</b><b style={{ fontSize: 14 }} id="bias-zeig-pct">{p}%</b></div>
            <div className={'bias-bar' + (p === 100 ? ' full' : '')} id="bias-zeig-bar"><i id="bias-zeig-fill" style={{ width: p + '%' }} /></div>
            <span className="muted" id="bias-zeig-left">{p === 100 ? '🎉 프로필이 완성됐어요' : (3 - done.size) + '단계만 더 하면 완성이에요'}</span>
            {TASKS.map(([t, label]) => (
              <button key={t} className={'bias-task' + (done.has(t) ? ' done' : '')} data-task={t} disabled={done.has(t)} onClick={() => doTask(t)}>
                <span className="ck">✓</span><span className="t">{label}</span><span className="muted">+10%</span>
              </button>
            ))}
          </View>
        </div>
      </Stage>
      <Info
        spec={[['진행률', '70%에서 시작'], ['효과', '마저 끝내고 싶음'], ['쓰임', '온보딩·프로필']]}
        usage={[
          ['활용 팁', '이미 한 일을 진행률에 반영하고, 남은 단계를 구체적으로 보여 주세요'],
          ['주의', <>끝나지 않는 진행률로 불필요한 정보를 계속 받아내면 조종이에요 · <DpLink /></>],
        ]}
      />
    </Card>
  )
}
