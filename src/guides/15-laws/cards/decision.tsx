import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage } from '../../../components/Card'
import { Range, Seg, useTimers } from '../../../components/ui'
import { Cat, fmt, shake } from '../shared'

/* ---------- 03 힉의 법칙 ---------- */
const POOL = ['🍔', '🍟', '🌭', '🌮', '🌯', '🥗', '🍣', '🍜', '🍝', '🍛', '🍙', '🍤', '🥟', '🍗', '🥩', '🥓', '🧀', '🥚', '🥞', '🧇', '🥐', '🥨', '🥯', '🍞', '🍰', '🧁', '🍩', '🍪', '🍫', '🍦', '🍉']
const hickT = (n: number) => 200 + 150 * Math.log2(n + 1)
const shuffle = <T,>(a: T[]) => a.map(v => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(x => x[1])

export function Hick() {
  const [n, setN] = useState(8)
  const [items, setItems] = useState<string[]>(() => [...shuffle(POOL).slice(0, 7), '🍕'])
  const [running, setRunning] = useState(false)
  const [mine, setMine] = useState<{ n: number; t: number }[]>([])
  const [log, setLog] = useState<ReactNode>(<>선택지 수를 바꿔가며 <b>내 기록(주황 점)</b>을 쌓아보세요</>)
  const t0 = useRef(0)

  const X = (k: number) => 30 + ((k - 1) / 29) * 260
  const Y = (t: number) => 100 - (t / 1000) * 88
  const path = useMemo(() => Array.from({ length: 30 }, (_, i) => (i ? 'L' : 'M') + X(i + 1).toFixed(1) + ' ' + Y(hickT(i + 1)).toFixed(1)).join(''), [])

  const changeN = (v: number) => { setN(v); setRunning(false); setItems([...shuffle(POOL).slice(0, v - 1), '🍕']) }
  const start = () => { setItems(shuffle([...shuffle(POOL).slice(0, n - 1), '🍕'])); setRunning(true); t0.current = performance.now(); setLog(<>⏱ <b>🍕</b>를 찾아 누르세요</>) }
  const pick = (e: string, el: HTMLElement) => {
    if (!running) return
    if (e !== '🍕') { shake(el); return }
    const ms = performance.now() - t0.current
    setRunning(false)
    setMine(m => [...m, { n, t: ms }])
    setLog(<>선택지 <b>{n}개</b>에서 <b>{fmt(ms)}</b> 걸렸어요 — 개수를 늘려 다시 해보세요</>)
  }

  return (
    <Card id="laws-hick" num="03" tag={<Cat tone="o">의사결정과 상호작용</Cat>} title="힉의 법칙" en="Hick's Law"
      desc="선택지가 많고 복잡할수록 결정하는 데 시간이 더 걸려요.">
      <Stage log={log}>
        <div className="box left">
          <svg className="lw-plot" viewBox="0 0 300 120" role="img" aria-label="선택지 수에 따른 결정 시간 그래프">
            <line x1="30" y1="100" x2="292" y2="100" stroke="var(--line)" />
            <line x1="30" y1="8" x2="30" y2="100" stroke="var(--line)" />
            <text x="26" y="104" fontSize="10" fill="var(--text-3)" textAnchor="end">0</text>
            <text x="26" y="16" fontSize="10" fill="var(--text-3)" textAnchor="end">1s</text>
            <text x="292" y="114" fontSize="10" fill="var(--text-3)" textAnchor="end">선택지 30개</text>
            <text x="30" y="114" fontSize="10" fill="var(--text-3)">1개</text>
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1={X(n)} y1="8" x2={X(n)} y2="100" stroke="var(--accent)" strokeDasharray="3 3" opacity=".5" />
            <circle cx={X(n)} cy={Y(hickT(n))} r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
            {mine.map((p, i) => <circle key={i} cx={X(p.n)} cy={Y(Math.min(p.t, 1000))} r="3.5" fill="var(--b)" />)}
          </svg>
          <div className="lw-label"><span>선택지 개수</span><b>{n}개 · 예상 {fmt(hickT(n))}</b></div>
          <Range value={n} min={2} max={30} onChange={changeN} label="선택지 개수" />
          <div className="lw-toolbar">
            <span className="muted">시작하면 <b style={{ fontSize: 16 }}>🍕</b> 를 찾아 누르세요</span>
            <button className="btn sm orange" onClick={start}>▶ 시작</button>
          </div>
          <div className={'lw-grid' + (running ? '' : ' idle')}>
            {items.map((e, i) => <button key={i + e} onClick={ev => pick(e, ev.currentTarget)}>{e}</button>)}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['공식', 'T = a + b·log₂(n+1)']]}
        usage={[
          ['개념', '결정 시간은 선택지 개수와 복잡도에 따라 늘어나요.'],
          ['실무', '영상 앱의 ‘오늘의 추천’처럼 먼저 골라 주거나, 회원가입을 여러 단계로 나눠 한 화면의 선택을 줄여요.'],
          ['주의', '지나치게 쪼개면 단계가 늘어 오히려 피곤해요. 자주 쓰는 것만 앞에 꺼내요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 피츠의 법칙 ---------- */
export function Fitts() {
  const area = useRef<HTMLDivElement>(null)
  const [dPct, setDPct] = useState(80)
  const [W, setW] = useState(32)
  const [areaW, setAreaW] = useState(400)
  const [armed, setArmed] = useState(false)
  const [pay, setPay] = useState<'top' | 'bottom'>('bottom')
  const [log, setLog] = useState<ReactNode>(<><b>시작</b>을 누른 뒤 파란 원을 최대한 빨리 눌러보세요</>)
  const t0 = useRef(0)

  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    const ro = new ResizeObserver(() => setAreaW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const sx = 27
  const D = Math.round(Math.max(60, areaW - sx - 46) * dPct / 100)
  const id = Math.log2(D / W + 1)

  const hitTarget = () => {
    if (!armed) { setLog(<>먼저 <b>시작</b>을 눌러주세요</>); return }
    const ms = performance.now() - t0.current
    setArmed(false)
    setLog(<>거리 {D}px · 크기 {W}px → <b>{fmt(ms)}</b> (난이도 {id.toFixed(2)} bits) — 크기를 줄이고 다시 해보세요</>)
  }

  return (
    <Card id="laws-fitts" num="04" tag={<Cat tone="o">의사결정과 상호작용</Cat>} title="피츠의 법칙" en="Fitts's Law"
      desc="목표가 가까울수록, 클수록 더 빨리 정확하게 누를 수 있어요.">
      <Stage log={log}>
        <div className="box left">
          <div className="lw-fz" ref={area}
            onClick={e => { if (armed && e.target === area.current) setLog(<>빗나갔어요 — <b>작고 멀수록</b> 놓치기 쉬워요</>) }}>
            <button className={'lw-start' + (armed ? ' armed' : '')} aria-label="시작점"
              onClick={() => { t0.current = performance.now(); setArmed(true); setLog(<>⏱ 지금 <b>파란 원</b>을 누르세요!</>) }}>시작</button>
            <div className="lw-dist" style={{ left: sx, width: D }}><span>D = {D}px</span></div>
            <button className="lw-tgt" aria-label="목표" style={{ left: sx + D, width: W, height: W }} onClick={hitTarget} />
          </div>
          <div className="lw-sl">
            <label>거리 D <Range value={dPct} min={20} max={100} onChange={v => { setDPct(v); setArmed(false) }} label="거리" /></label>
            <label>크기 W <Range value={W} min={14} max={80} onChange={v => { setW(v); setArmed(false) }} label="크기" /></label>
          </div>
          <div className="lw-formula">난이도 ID = log₂({D}/{W} + 1) = <b>{id.toFixed(2)} bits</b> · 예상 <b>{fmt(100 + 150 * id)}</b></div>
          <div className="lw-thumb">
            <div className="lw-phone"><div className="lw-pay" style={{ top: pay === 'top' ? 10 : 126 }}>결제하기</div></div>
            <div className="lw-zone">
              <b style={{ fontSize: 13, color: 'var(--text)' }}>모바일 엄지 영역</b>
              <span><i style={{ background: 'rgba(12,166,120,.6)' }} />편함</span>
              <span><i style={{ background: 'rgba(250,176,5,.6)' }} />닿음</span>
              <span><i style={{ background: 'rgba(224,49,49,.5)' }} />어려움</span>
              <Seg value={pay} style={{ marginTop: 4 }} options={[['top', '위에'], ['bottom', '아래에']]}
                onChange={v => {
                  setPay(v)
                  setLog(v === 'top' ? <>결제 버튼이 <b>빨간 영역</b> — 한 손으로는 닿기 어려워요</> : <>결제 버튼이 <b>초록 영역</b> — 엄지로 편하게 눌러요</>)
                }} />
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['공식', 'T = a + b·log₂(D/W+1)'], ['터치 최소', '44–48px']]}
        usage={[
          ['개념', '목표까지 걸리는 시간은 거리와 크기로 정해져요. 멀고 작을수록 어려워요.'],
          ['실무', '‘결제하기’ 같은 핵심 버튼은 엄지가 닿는 하단에 크고 넓게 둬요.'],
          ['주의', '삭제처럼 위험한 버튼은 일부러 주요 버튼과 떨어뜨려 실수를 줄여요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 도허티 임계 ---------- */
const dohPos = (ms: number) => Math.max(0, Math.min(1, Math.log10(ms / 50) / Math.log10(3000 / 50))) * 100
const verdict = (ms: number): [string, string] =>
  ms <= 100 ? ['즉각', '직접 만지는 것처럼 느껴져요']
    : ms <= 400 ? ['도허티 임계 이내', '흐름이 끊기지 않아요']
      : ms <= 1000 ? ['지연 인지', '기다린다는 느낌이 들어요 — 피드백이 필요해요']
        : ['흐름 끊김', '멈춘 것 같아요 — 진행 표시가 꼭 필요해요']

export function Doherty() {
  const [ms, setMs] = useState(1200)
  const [fb, setFb] = useState<0 | 1>(0)
  const [state, setState] = useState<'idle' | 'wait' | 'done'>('idle')
  const [log, setLog] = useState<ReactNode>(<>응답 시간을 바꾸고 <b>검색</b>을 눌러 체감해보세요</>)
  const timers = useTimers()
  useEffect(() => () => timers.clear(), [timers])

  const go = () => {
    timers.clear()
    const t0 = performance.now(), wait = ms, withFb = fb
    setState('wait')
    setLog(withFb ? <>바로 <b>뼈대</b>가 보여서 작동 중임을 알 수 있어요</> : <>… <b>아무 반응이 없어요</b></>)
    timers.set(() => {
      setState('done')
      const [z, msg] = verdict(wait)
      setLog(<><b>{Math.round(performance.now() - t0).toLocaleString()}ms</b> · {z} — {msg}{withFb ? ' (스켈레톤 덕분에 덜 답답해요)' : ''}</>)
    }, wait)
  }

  return (
    <Card id="laws-doherty" num="05" tag={<Cat tone="o">의사결정과 상호작용</Cat>} title="도허티 임계" en="Doherty Threshold"
      desc="시스템이 0.4초 안에 반응하면 사람은 흐름을 잃지 않고 더 몰입해요.">
      <Stage log={log}>
        <div className="box left">
          <div className="lw-scale">
            <div className="lw-zones">
              <span style={{ width: '16.9%', background: '#0ca678' }} />
              <span style={{ width: '33.9%', background: '#63e6be' }} />
              <span style={{ width: '22.4%', background: '#fab005' }} />
              <span style={{ width: '26.8%', background: '#ff6b6b' }} />
            </div>
            <div className="lw-mark" style={{ left: dohPos(ms) + '%' }} />
            <div className="lw-ticks">
              <span style={{ left: '16.9%' }}>0.1초</span><span style={{ left: '50.8%' }}>0.4초</span>
              <span style={{ left: '73.2%' }}>1초</span><span style={{ left: '97%' }}>3초</span>
            </div>
          </div>
          <div className="lw-label"><span>응답 시간</span><b>{ms.toLocaleString()}ms · {verdict(ms)[0]}</b></div>
          <Range value={ms} min={50} max={3000} step={50} onChange={setMs} label="응답 시간" />
          <Seg value={fb} onChange={setFb} options={[[0, '피드백 없음'], [1, '스켈레톤 표시']]} />
          <div className="lw-mini">
            <div className="lw-qrow"><div className="lw-q">🔍 성수동 브런치</div><button className="btn sm" onClick={go} disabled={state === 'wait'}>검색</button></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {state === 'wait' && fb === 1 && [1, 0.7, 0.85].map((f, i) => <div className="lw-r sk-row" key={i}><i /><span style={{ flex: f }} /></div>)}
              {state === 'done' && ['브런치 카페 A · ★4.7', '베이커리 B · ★4.5', '다이닝 C · ★4.6'].map(t => <div className="lw-r in" key={t}><i />{t}</div>)}
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['기준', '400ms'], ['보완', '스켈레톤 · 애니메이션']]}
        usage={[
          ['개념', '컴퓨터와 사람이 0.4초 이내로 주고받으면 생산성과 만족도가 크게 올라가요.'],
          ['실무', '로딩이 길어지면 스켈레톤이나 애니메이션을 바로 보여줘서 ‘작동 중’임을 알리고 체감 대기를 줄여요.'],
          ['주의', '피드백은 실제 속도 개선을 대신하지 못해요. 둘 다 챙겨요.'],
        ]}
      />
    </Card>
  )
}
