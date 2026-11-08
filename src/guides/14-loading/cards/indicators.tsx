import { useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { EASE, useMotion } from '../../../lib/motion'
import { REPLAY, now, pct, tween, uneven, useRunner } from '../shared'

/* ---------- 01 스피너 ---------- */
const RESP = [200, 1500, 3000]

export function Spinner() {
  const m = useMotion()
  const R = useRunner()
  const box = useRef<HTMLDivElement>(null)
  const goBtn = useRef<HTMLButtonElement>(null)
  const [resp, setResp] = useState(1)
  const [delayed, setDelayed] = useState(true)
  const [sp, setSp] = useState(false)
  const [ct, setCt] = useState(true)
  const [ctKey, setCtKey] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>응답 시간을 바꿔 <b>스피너가 필요한지</b> 비교</>)

  const load = async () => {
    R.cancel()
    const ok = R.token(), ms = RESP[resp], dl = delayed
    setCt(false); setSp(false)
    let shownAt = 0, arrived = false
    const show = () => { if (!arrived && ok()) { setSp(true); shownAt = now() } }
    if (dl) R.wait(300).then(v => v && show()); else show()
    setLog(<>요청 보냄… {dl ? <><b>300ms</b> 안에 오면 스피너 생략</> : <>스피너 <b>바로</b> 표시</>}</>)
    if (!await R.wait(ms)) return
    arrived = true
    const vis = shownAt ? now() - shownAt : 0
    if (shownAt && dl && vis < m.D(500)) { if (!await R.wait(m.D(500) - vis, true)) return }
    setSp(false); setCt(true); setCtKey(k => k + 1)
    const s = ms / 1000 + '초'
    if (!shownAt) setLog(<>{s} 만에 도착 → 스피너 <b>생략</b> (깜빡임 방지)</>)
    else if (!dl && ms < 500) setLog(<>스피너가 <b>{s} 깜빡</b> — 오히려 거슬려요</>)
    else if (ms >= 3000) setLog(<>{s} 대기 — 이만큼 길면 <b>스켈레톤·진행률</b>이 더 친절해요</>)
    else setLog(<>{s} 대기 · 스피너 표시 <b>{dl ? '300ms 뒤부터' : '바로'}</b></>)
  }

  const demo = useDemo({
    reset() { R.cancel(); setSp(false); setCt(false) },
    async play(c) { c.tap(box.current, goBtn.current); await load() },
  })

  return (
    <Card id="loading-spinner" num="01" title="스피너" en="Spinner"
      desc="‘뭔가 하고 있어요’만 알려요. 짧고 끝을 모를 때 쓰고, 아주 짧으면 아예 숨겨요." demo={demo}>
      <Stage log={log} logId="loading-spinner-log">
        <div className="box ld-box" ref={box}>
          <div className="ld-panel">
            <div className="ld-sp" hidden={!sp}><div className="spinner" /><span className="muted">불러오는 중</span></div>
            <div className="loaded" hidden={!ct} key={ctKey}>
              <div className="profile"><div className="ph" /><div><div className="t1">Palmer</div><div className="t2">디자이너 · 서울</div></div></div>
              <p className="content-p">팔로워 2.4k · 게시물 128 · 최근 활동 3분 전</p>
            </div>
          </div>
          <div className="ld-ctrl">
            <button className="btn sm" ref={goBtn} onClick={load}>불러오기</button>
            <button className="chip" onClick={() => setResp(i => (i + 1) % RESP.length)}>응답 <b>{RESP[resp] / 1000}초</b></button>
            <button className="chip" aria-pressed={delayed} onClick={() => setDelayed(v => !v)}>300ms 늦게 표시</button>
          </div>
        </div>
      </Stage>
      <Info replayLabel={REPLAY}
        spec={[['권장', '1–4초 · 끝을 모를 때'], ['표시 지연', '300ms'], ['최소 노출', '500ms']]}
        usage={[['언제', '버튼을 누른 뒤 짧은 저장, 작은 영역 새로고침'], ['주의', '1초 미만이면 깜빡임만 남아요 — 늦게 띄우고, 한번 띄우면 잠깐은 유지']]}
      />
    </Card>
  )
}

/* ---------- 02 진행 바 ---------- */
export function Bar() {
  const m = useMotion()
  const R = useRunner()
  const box = useRef<HTMLDivElement>(null)
  const goBtn = useRef<HTMLButtonElement>(null)
  const [mode, setMode] = useState<'det' | 'ind'>('det')
  const [ind, setInd] = useState(false)
  const [w, setW] = useState(0)
  const [pc, setPc] = useState('0%')
  const [eta, setEta] = useState('대기 중')
  const [size, setSize] = useState('12.4MB')
  const [log, setLog] = useState<ReactNode>(<>확정형 / 불확정형을 <b>바꿔서</b> 다운로드</>)

  const idle = () => { R.cancel(); setInd(false); setW(0); setPc('0%'); setEta('대기 중'); setSize('12.4MB') }
  const pick = (v: 'det' | 'ind') => {
    setMode(v); idle()
    setLog(v === 'det' ? <><b>확정형</b> — 크기를 알아서 %를 보여줘요</> : <><b>불확정형</b> — 크기를 몰라 흐르기만 해요</>)
  }
  const load = async () => {
    idle()
    const ok = R.token()
    if (mode === 'det') {
      const t0 = now()
      setLog(<>다운로드 중 — <b>남은 양</b>이 보여요</>)
      const done = await tween(R, m.D, 3600, k => {
        const p = uneven(k), el = now() - t0
        setW(p * 100); setPc(pct(p))
        setSize((12.4 * p).toFixed(1) + ' / 12.4MB')
        setEta(p > 0.03 && p < 1 ? '남은 시간 약 ' + Math.max(1, Math.round((el / p) * (1 - p) / m.D(1000))) + '초' : '')
      })
      if (!done) return
      setEta('완료'); setLog(<>✓ <b>다운로드 완료</b> · 멈칫해도 %가 있어 기다릴 만해요</>)
    } else {
      setInd(true); setPc('—'); setEta('크기 확인 중…'); setSize('크기 알 수 없음')
      setLog(<>얼마나 남았는지 <b>알 수 없어요</b> — 흐르는 막대만</>)
      if (!await R.wait(3200) || !ok()) return
      setInd(false); setW(100); setPc('100%'); setEta('완료'); setSize('12.4MB')
      setLog(<>✓ 완료 · 길어지면 <b>확정형</b>으로 바꿀 수 있는지 먼저 확인해요</>)
    }
  }

  const demo = useDemo({ reset: idle, async play(c) { c.tap(box.current, goBtn.current); await load() } })

  return (
    <Card id="loading-bar" num="02" title="진행 바" en="Progress Bar"
      desc="얼마나 남았는지 알면 채워지는 막대로, 모르면 흐르는 막대로 보여줘요." demo={demo}>
      <Stage log={log} logId="loading-bar-log">
        <div className="box ld-box" ref={box}>
          <div className="ld-panel">
            <div className="ld-file"><i className="ic">📦</i><span>디자인-에셋.zip<small>{size}</small></span></div>
            <div className={'ld-track' + (ind ? ' ind' : '')}><div className="ld-fill" style={{ width: w + '%' }} /></div>
            <div className="ld-meta"><span>{pc}</span><span>{eta}</span></div>
          </div>
          <div className="ld-ctrl">
            <button className="btn sm" ref={goBtn} onClick={load}>다운로드</button>
            <button className="chip ld-mode" aria-pressed={mode === 'det'} onClick={() => pick('det')}>확정형</button>
            <button className="chip ld-mode" aria-pressed={mode === 'ind'} onClick={() => pick('ind')}>불확정형</button>
          </div>
        </div>
      </Stage>
      <Info replayLabel={REPLAY}
        spec={[['권장', '4초+ · 진행률을 알 때'], ['불확정', '양을 모를 때'], ['함께', '% · 남은 시간']]}
        usage={[['언제', '파일 다운로드·업로드, 설치, 내보내기'], ['주의', '99%에서 멈추면 신뢰를 잃어요 — 마지막 구간을 짧게 남기고, 남은 시간은 ‘약’으로']]}
      />
    </Card>
  )
}

/* ---------- 03 스켈레톤 ---------- */
const PEOPLE = [['김디자', '성수 카페 시안 올렸어요', 'g2', 'g3'], ['박기획', '다음 주 일정 공유해요', 'g1', 'g4']]

export function Skeleton() {
  const m = useMotion()
  const R = useRunner()
  const box = useRef<HTMLDivElement>(null)
  const goBtn = useRef<HTMLButtonElement>(null)
  const feed = useRef<HTMLDivElement>(null)
  const [match, setMatch] = useState(true)
  const [view, setView] = useState<'real' | 'sk' | 'sk-rough'>('real')
  const [log, setLog] = useState<ReactNode>(<>뼈대 모양을 <b>일치 / 불일치</b>로 바꿔보세요</>)

  const load = async () => {
    R.cancel()
    flushSync(() => setView(match ? 'sk' : 'sk-rough'))
    const h0 = feed.current?.offsetHeight ?? 0
    setLog(<>뼈대 먼저 — <b>어떤 모양이 올지</b> 미리 보여요</>)
    if (!await R.wait(1800)) return
    flushSync(() => setView('real'))
    const f = feed.current
    if (!f) return
    const d = f.offsetHeight - h0
    m.A(f, [{ opacity: 0.4 }, { opacity: 1 }], 250, EASE.out)
    setLog(Math.abs(d) < 4 ? <>모양이 같아서 <b>튐 없이</b> 교체됐어요</> : <>레이아웃이 <b>{d}px</b> 튀었어요 — 아래 내용이 밀려났죠?</>)
  }

  const demo = useDemo({
    reset() { R.cancel(); setView(match ? 'sk' : 'sk-rough') },
    async play(c) { c.tap(box.current, goBtn.current); await load() },
  })

  return (
    <Card id="loading-skeleton" num="03" title="스켈레톤" en="Skeleton"
      desc="내용이 들어올 자리를 회색 뼈대로 먼저 그려요. 구조를 미리 알 때 가장 덜 지루해요." demo={demo}>
      <Stage log={log} logId="loading-skeleton-log">
        <div className="box ld-box" style={{ justifyContent: 'flex-start' }} ref={box}>
          <div className="ld-feed" ref={feed}>
            {PEOPLE.map(p => view === 'real'
              ? <div className="ld-item" key={p[0]}><span className={'ld-av ' + p[2]} /><div className="ld-lines"><b>{p[0]}</b><span>{p[1]}</span><span className={'ld-pic ' + p[3]} /></div></div>
              : <div className="ld-item" key={p[0]}>
                <span className="sk circle" style={{ width: 36, height: 36 }} />
                <div className="ld-lines">
                  <span className="sk t1" style={{ width: '40%' }} /><span className="sk t2" style={{ width: '85%' }} />
                  {view === 'sk' && <span className="sk" style={{ height: 44 }} />}
                </div>
              </div>)}
          </div>
          <div className="ld-after"><div className="fake-line" style={{ width: '70%' }} /><div className="fake-line" style={{ width: '45%' }} /></div>
          <div className="ld-ctrl">
            <button className="btn sm" ref={goBtn} onClick={load}>불러오기</button>
            <button className="chip" onClick={() => setMatch(v => !v)}>뼈대 <b>{match ? '실제와 일치' : '대충 그림'}</b></button>
          </div>
        </div>
      </Stage>
      <Info replayLabel={REPLAY}
        spec={[['권장', '1–4초 · 구조를 알 때'], ['쉬머', '1.2초 주기'], ['모양', '실제와 같은 크기']]}
        usage={[['언제', '피드·목록·상세 화면의 첫 로딩'], ['주의', '뼈대와 실제 크기가 다르면 화면이 튀어요 — 이미지 자리까지 똑같이']]}
      />
    </Card>
  )
}

/* ---------- 04 진행 링 ---------- */
const C = 326.73

export function Ring() {
  const m = useMotion()
  const R = useRunner()
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [p, setP] = useState(0)
  const [done, setDone] = useState(false)
  const [paused, setPausedS] = useState(false)
  const [sub, setSub] = useState('눌러서 시작')
  const [note, setNote] = useState('사진 24장 · 86MB')
  const [log, setLog] = useState<ReactNode>(<>링을 눌러 <b>업로드 시작 · 일시정지</b></>)
  const running = useRef(false), pausedR = useRef(false)

  const set = (v: number) => { setP(v); setNote('사진 ' + Math.round(24 * v) + ' / 24장 · ' + Math.round(86 * v) + 'MB') }
  const setPaused = (v: boolean) => { pausedR.current = v; setPausedS(v) }
  const idle = () => { R.cancel(); running.current = false; setPaused(false); setP(0); setDone(false); setSub('눌러서 시작'); setNote('사진 24장 · 86MB') }
  const load = async () => {
    idle(); running.current = true; setSub('업로드 중')
    setLog(<>업로드 중 — <b>링을 누르면</b> 일시정지</>)
    const ok = await tween(R, m.D, 4200, k => set(uneven(k)), () => pausedR.current)
    if (!ok) return
    running.current = false; setDone(true); setSub('완료')
    if (btn.current) m.A(btn.current, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], 300, EASE.out)
    setLog(<>✓ <b>24장 업로드 완료</b> · 숫자가 함께라 남은 양이 분명해요</>)
  }
  const onClick = () => {
    if (!running.current) { load(); return }
    const v = !pausedR.current
    setPaused(v)
    setSub(v ? '일시정지 · 눌러서 계속' : '업로드 중')
    setLog(v ? <><b>{pct(p)}</b>에서 일시정지</> : <><b>다시 시작</b></>)
  }

  const demo = useDemo({ reset: idle, async play(c) { c.tap(box.current, btn.current); await load() } })

  return (
    <Card id="loading-ring" num="04" title="진행 링" en="Progress Ring"
      desc="원이 채워지며 퍼센트를 보여줘요. 좁은 자리에서 진행률을 알릴 때 좋아요." demo={demo}>
      <Stage log={log} logId="loading-ring-log">
        <div className="box ld-box" ref={box}>
          <button className={'ld-ring' + (paused ? ' paused' : '')} ref={btn} aria-label="업로드 일시정지 또는 시작" onClick={onClick}>
            <svg viewBox="0 0 120 120">
              <circle className="bg" cx="60" cy="60" r="52" />
              <circle className="fg" cx="60" cy="60" r="52" style={{ strokeDashoffset: C * (1 - p) }} />
            </svg>
            <span className="ld-rt"><b>{done ? '✓' : pct(p)}</b><small>{sub}</small></span>
          </button>
          <div className="ld-note">{note}</div>
        </div>
      </Stage>
      <Info replayLabel={REPLAY}
        spec={[['권장', '4초+ · 진행률을 알 때'], ['자리', '좁은 공간 · 카드 안'], ['완료', '✓로 바뀜']]}
        usage={[['언제', '사진 업로드, 동기화, 앱 내 다운로드 버튼'], ['주의', '숫자 없이 원만 있으면 읽기 어려워요 — 가운데 %를 같이']]}
      />
    </Card>
  )
}
