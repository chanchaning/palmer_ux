import { Fragment, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { EASE, useMotion } from '../../../lib/motion'
import { REPLAY, pct, tween, uneven, useRunner } from '../shared'

/* ---------- 05 단계 표시 ---------- */
type St = '' | 'doing' | 'done'
const STEP_NAMES = ['업로드', '분석', '완료']
const IDLE_SUB = '회의 녹음.m4a · 7.4MB'

export function Steps() {
  const m = useMotion()
  const R = useRunner()
  const box = useRef<HTMLDivElement>(null)
  const goBtn = useRef<HTMLButtonElement>(null)
  const lastDot = useRef<HTMLSpanElement>(null)
  const [st, setSt] = useState<St[]>(['', '', ''])
  const [ln, setLn] = useState([0, 0])
  const [sub, setSub] = useState(IDLE_SUB)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>파일을 올리면 <b>업로드 → 분석 → 완료</b></>)

  const mark = (i: number, s: St) => setSt(a => a.map((v, j) => (j === i ? s : v)))
  const idle = () => { R.cancel(); setSt(['', '', '']); setLn([0, 0]); setSub(IDLE_SUB); setBusy(false) }
  const load = async () => {
    idle(); setBusy(true)
    mark(0, 'doing'); setLog(<>1단계 <b>업로드</b> — %로 보여요</>)
    if (!await tween(R, m.D, 2000, k => {
      const p = uneven(k)
      setSub('업로드 ' + pct(p) + ' · ' + (7.4 * p).toFixed(1) + ' / 7.4MB')
      setLn(l => [p * 100, l[1]])
    })) return
    mark(0, 'done'); mark(1, 'doing'); setSub('음성 분석 중… 약 2초 남음')
    setLog(<>2단계 <b>분석</b> — 진행률을 몰라 스피너 + 예상 시간</>)
    if (!await R.wait(1800)) return
    mark(1, 'done')
    if (!await tween(R, m.D, 300, k => setLn(l => [l[0], k * 100]))) return
    mark(2, 'done'); setSub('완료! 회의록 3쪽이 준비됐어요')
    if (lastDot.current) m.A(lastDot.current, [{ transform: 'scale(.6)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 320, EASE.out)
    setBusy(false)
    setLog(<>✓ <b>업로드 → 분석 → 완료</b> · 지금 어디쯤인지 계속 보였어요</>)
  }
  const cancel = () => {
    const was = sub
    idle()
    setSub('취소됨 — 파일은 저장되지 않았어요')
    setLog(<><b>취소</b> ({was}) — 긴 작업엔 취소가 꼭 있어야 해요</>)
  }

  const demo = useDemo({ reset: idle, async play(c) { c.tap(box.current, goBtn.current); await load() } })

  const dot = (i: number) => st[i] === 'done' ? '✓' : st[i] === 'doing' && i === 1 ? <i className="ld-mini" /> : String(i + 1)
  return (
    <Card id="loading-steps" num="05" title="단계 표시" en="Multi-step Progress"
      desc="긴 작업을 단계로 나눠 지금 어디쯤인지 보여줘요. 단계마다 다른 표시를 써요." demo={demo}>
      <Stage log={log} logId="loading-steps-log">
        <div className="box ld-box" ref={box}>
          <div className="ld-steps">
            {STEP_NAMES.map((n, i) => (
              <Fragment key={n}>
                {i > 0 && <div className="ld-ln"><i style={{ width: ln[i - 1] + '%' }} /></div>}
                <div className={'ld-st' + (st[i] ? ' ' + st[i] : '')}>
                  <span className="ld-dot" ref={i === 2 ? lastDot : undefined}>{dot(i)}</span>{n}
                </div>
              </Fragment>
            ))}
          </div>
          <div className="ld-stsub">{sub}</div>
          <div className="ld-ctrl">
            <button className="btn sm" ref={goBtn} disabled={busy} onClick={load}>파일 올리기</button>
            <button className="btn ghost sm" disabled={!busy} onClick={cancel}>취소</button>
          </div>
        </div>
      </Stage>
      <Info replayLabel={REPLAY}
        spec={[['권장', '4초+ · 단계가 여럿일 때'], ['업로드', '% 표시'], ['분석', '예상 시간 + 스피너']]}
        usage={[['언제', '녹음 → 텍스트 변환, 영상 업로드 → 인코딩, 결제 → 승인'], ['주의', '단계 이름은 사용자 말로 — ‘인코딩’보다 ‘영상 준비 중’']]}
      />
    </Card>
  )
}

/* ---------- 06 블러 업 ---------- */
const PH = ['#ff922b', '#f76707', '#e8590c', '#ae3ec9', '#f783ac', '#ffa94d', '#d6336c', '#7048e8', '#343a40', '#495057', '#212529', '#343a40']
const MODES = ['블러 업', '빈 상자'] as const
type Mode = typeof MODES[number]
const BLDG = [[0, 110, 34, 70], [38, 90, 26, 90], [68, 120, 30, 60], [102, 76, 22, 104], [128, 128, 40, 52], [172, 96, 28, 84], [204, 66, 24, 114], [232, 116, 36, 64], [272, 88, 48, 92]]
const WIN = [[44, 100], [54, 112], [108, 88], [108, 104], [178, 108], [210, 80], [218, 96], [280, 100], [296, 116], [14, 124]]

export function BlurUp() {
  const m = useMotion()
  const R = useRunner()
  const box = useRef<HTMLDivElement>(null)
  const goBtn = useRef<HTMLButtonElement>(null)
  const full = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('블러 업')
  const [fullOp, setFullOp] = useState(1)
  const [phOp, setPhOp] = useState(1)
  const [badge, setBadge] = useState<string | null>(null)
  const [log, setLog] = useState<ReactNode>(<>방식 칩으로 <b>블러 업 / 빈 상자</b> 비교</>)

  const idle = (md: Mode = mode) => {
    R.cancel(); m.clearA(full.current)
    setFullOp(0); setPhOp(md === '블러 업' ? 1 : 0)
    setBadge(md === '블러 업' ? '미리보기 24B' : '0B')
  }
  const load = async (md: Mode = mode) => {
    idle(md)
    const blur = md === '블러 업'
    setLog(blur ? <><b>24바이트</b> 색상 미리보기를 흐리게 먼저</> : <>원본이 올 때까지 <b>빈 회색 상자</b></>)
    if (!await tween(R, m.D, 1800, k => setBadge('원본 ' + Math.round(180 * uneven(k)) + ' / 180KB'))) return
    setBadge(null)
    setFullOp(1)
    if (blur) {
      const ok = R.token()
      if (full.current) await m.A(full.current, [{ opacity: 0, filter: 'blur(12px)' }, { opacity: 1, filter: 'blur(0px)' }], 450, EASE.out).finished.catch(() => {})
      if (ok()) setLog(<>흐린 색이 <b>선명하게</b> — 같은 색이라 바뀌는 순간이 부드러워요</>)
    } else {
      setLog(<>회색 상자에서 <b>갑자기 툭</b> — 빈 시간이 더 길게 느껴져요</>)
    }
  }

  const demo = useDemo({ reset: () => idle(), async play(c) { c.tap(box.current, goBtn.current); await load() } })

  return (
    <Card id="loading-blur" num="06" title="블러 업" en="Blur-up Image"
      desc="아주 작은 색상 미리보기를 흐리게 깔고, 원본이 오면 선명해지며 바뀌어요." demo={demo}>
      <Stage log={log} logId="loading-blur-log">
        <div className="box ld-box" ref={box}>
          <div className="ld-photo">
            <div className="ld-ph" style={{ opacity: phOp }}>{PH.map((c, i) => <i key={i} style={{ background: c }} />)}</div>
            <div className="ld-full" ref={full} style={{ opacity: fullOp }}>
              <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <defs><linearGradient id="loading-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7048e8" /><stop offset=".5" stopColor="#f783ac" /><stop offset="1" stopColor="#ffa94d" /></linearGradient></defs>
                <rect width="320" height="180" fill="url(#loading-sky)" />
                <circle cx="160" cy="112" r="34" fill="#ffd43b" opacity=".95" />
                <g fill="#212529">{BLDG.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}</g>
                <g fill="#ffe066" opacity=".85">{WIN.map(([x, y], i) => <rect key={i} x={x} y={y} width="4" height="5" />)}</g>
              </svg>
            </div>
            <span className="ld-badge" hidden={badge === null}>{badge}</span>
          </div>
          <div className="ld-ctrl">
            <button className="btn sm" ref={goBtn} onClick={() => load()}>사진 불러오기</button>
            <button className="chip" onClick={() => { const n = MODES[(MODES.indexOf(mode) + 1) % 2]; setMode(n); load(n) }}>방식 <b>{mode}</b></button>
          </div>
        </div>
      </Stage>
      <Info replayLabel={REPLAY}
        spec={[['권장', '1–4초 · 큰 이미지'], ['미리보기', '4×3 색상 · 수십 바이트'], ['전환', '450ms 블러 → 선명']]}
        usage={[['언제', '갤러리, 상품 사진, 기사 대표 이미지'], ['주의', '이미지 크기(비율)를 미리 잡아야 자리가 안 튀어요']]}
      />
    </Card>
  )
}
