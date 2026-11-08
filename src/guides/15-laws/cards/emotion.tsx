import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { Cat } from '../shared'

/* ---------- 06 피크엔드 법칙 ---------- */
const DATA = [[0, -1, -1.6, -0.8, -0.4], [0, -0.6, -0.3, 0.8, 2]]
const NOTES = [
  '가입·정보 입력이 길고 지루해요(부정적 피크). 완료 화면도 밋밋하게 끝나요.',
  '자동 입력으로 고통을 줄이고, 송금 완료에 🎉 축하 순간을 넣어 기분 좋게 끝내요.',
]
const STEPS = ['시작', '가입', '정보 입력', '송금', '완료']
const stats = (v: number[]) => {
  const avg = v.reduce((a, b) => a + b, 0) / v.length
  const peak = v.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0)
  const end = v[v.length - 1]
  return { avg, peak, end, mem: (peak + end) / 2 }
}
const sg = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1)
const PX = (i: number) => 30 + i * 60
const PY = (v: number) => 70 - v * 26

export function PeakEnd() {
  const [mode, setMode] = useState<0 | 1>(0)
  const [cur, setCur] = useState(DATA[0])
  const [dot, setDot] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(<>설계 전·후를 바꿔 <b>기억되는 값</b>을 비교해보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const raf = useRef(0)
  const curRef = useRef(cur)
  curRef.current = cur
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const morph = (to: number[]) => {
    cancelAnimationFrame(raf.current)
    const from = curRef.current.slice(), t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3)
      setCur(from.map((v, i) => v + (to[i] - v) * e))
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }
  const choose = (m: 0 | 1) => {
    setMode(m); morph(DATA[m])
    const s = stats(DATA[m])
    setLog(m ? <>평균은 <b>{sg(s.avg)}</b>이지만 기억은 <b>{sg(s.mem)}</b> — “좋은 경험이었다”</> : <>평균 <b>{sg(s.avg)}</b>, 기억은 <b>{sg(s.mem)}</b> — 힘들었던 순간이 남아요</>)
  }
  const confetti = () => {
    const b = box.current, s = svg.current
    if (!b || !s) return
    const colors = ['#3b5bfd', '#e8590c', '#0ca678', '#fab005', '#d6336c']
    const br = b.getBoundingClientRect(), sr = s.getBoundingClientRect()
    const ex = (PX(4) / 300) * sr.width + sr.left - br.left, ey = (PY(curRef.current[4]) / 140) * sr.height + sr.top - br.top
    for (let i = 0; i < 18; i++) {
      const c = document.createElement('span')
      c.className = 'lw-confetti'
      c.style.background = colors[i % colors.length]
      c.style.left = ex + 'px'; c.style.top = ey + 'px'
      b.appendChild(c)
      const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 60
      c.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r - 30}px) rotate(${Math.random() * 540}deg)`, opacity: 0 }],
        { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => c.remove()
    }
  }
  /** 단계를 따라 점이 이동 — sleep은 데모 재생 중이면 취소 가능한 것을 사용 */
  const walk = async (sleep: (ms: number) => Promise<void>, m: 0 | 1) => {
    for (let i = 0; i < 5; i++) {
      setDot(i)
      setLog(<><b>{STEPS[i]}</b> 단계 — 감정 {sg(DATA[m][i])}</>)
      await sleep(550)
    }
    setDot(null)
    if (m) confetti()
    choose(m)
  }
  const playManual = () => walk(ms => new Promise(r => setTimeout(r, ms)), mode)

  const demo = useDemo({
    reset() { cancelAnimationFrame(raf.current); setMode(0); setCur(DATA[0]); setDot(null) },
    async play(c) {
      await walk(c.sleep, 0)
      await c.sleep(500)
      await c.press(box.current, box.current?.querySelector<HTMLElement>('.seg-x button:nth-child(2)') ?? null)
      await c.sleep(700)
      await walk(c.sleep, 1)
    },
  })

  const s = stats(cur)
  const pi = cur.indexOf(s.peak)
  const label = (i: number, text: string, anchor: 'middle' | 'end' = 'middle', dx = 0) => (
    <text x={PX(i) + dx} y={PY(cur[i]) + (anchor === 'end' ? 4 : cur[i] < 0 ? 18 : -10)} fontSize="11" fontWeight="700" fill="var(--b)" textAnchor={anchor}>{text}</text>
  )

  return (
    <Card id="laws-peak" num="06" tag={<Cat tone="g">감정과 예외 처리</Cat>} title="피크엔드 법칙" en="Peak-End Rule"
      desc="경험의 평균이 아니라 가장 강렬한 순간(피크)과 마지막(엔드)으로 기억해요." demo={demo}>
      <Stage log={log}>
        <div className="box left" ref={box}>
          <div className="lw-toolbar">
            <Seg value={mode} onChange={choose} options={[[0, '설계 전'], [1, '설계 후']]} />
            <button className="btn sm ghost" onClick={playManual}>▶ 경험해보기</button>
          </div>
          <svg className="lw-plot" ref={svg} viewBox="0 0 300 140" role="img" aria-label="단계별 감정 곡선">
            <rect x="20" y="18" width="270" height="52" fill="color-mix(in srgb, #0ca678 8%, transparent)" />
            <rect x="20" y="70" width="270" height="52" fill="color-mix(in srgb, var(--danger) 7%, transparent)" />
            <line x1="20" y1="70" x2="290" y2="70" stroke="var(--line)" />
            <text x="22" y="28" fontSize="10" fill="var(--text-3)">😊 좋음</text>
            <text x="22" y="118" fontSize="10" fill="var(--text-3)">😣 나쁨</text>
            <polyline points={cur.map((v, i) => PX(i) + ',' + PY(v)).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
            {cur.map((v, i) => {
              const hi = i === pi || i === 4
              return <circle key={i} cx={PX(i)} cy={PY(v)} r={hi ? 6 : 4} fill={hi ? 'var(--b)' : 'var(--accent)'} stroke="var(--surface)" strokeWidth="2" />
            })}
            {pi !== 4 ? <>{label(pi, '피크')}{label(4, '엔드')}</> : label(4, '피크=엔드', 'end', -12)}
            {dot !== null && <circle cx={PX(dot)} cy={PY(cur[dot])} r="8" fill="var(--b)" opacity=".85" />}
          </svg>
          <div className="lw-steps">{STEPS.map(t => <span key={t}><b>{t}</b></span>)}</div>
          <div className="lw-mem">
            <div>전체 평균<b>{sg(s.avg)}</b></div>
            <div className="hi">기억되는 값 (피크+엔드)/2<b>{sg(s.mem)}</b></div>
          </div>
          <p className="lw-note">{NOTES[mode]}</p>
        </div>
      </Stage>
      <Info
        spec={[['기억', '= 피크 + 엔드'], ['무시되는 것', '지속 시간']]}
        usage={[
          ['개념', '사람은 경험 전체의 평균이 아니라 감정이 가장 높았던 순간과 마지막 순간으로 경험을 기억해요.'],
          ['실무', '세금 신고나 송금을 마치면 축하 애니메이션을 보여주고, 404 같은 오류 화면에는 위트 있는 문구로 부정적인 감정을 줄여요.'],
          ['주의', '마지막만 꾸미고 중간의 고통을 방치하면 안 돼요. 부정적 피크부터 낮춰요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 포스텔의 법칙 ---------- */
const WD = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n: number) => String(n).padStart(2, '0')
const make = (y: number, m: number, d: number) => {
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null
}
/** 너그러운 날짜 해석 */
export function parseLenient(raw: string): Date | null {
  const s = raw.trim().replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  if (!s) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const rel: Record<string, number> = { 오늘: 0, 내일: 1, 모레: 2, 어제: -1 }
  if (s in rel) { const d = new Date(today); d.setDate(d.getDate() + rel[s]); return d }
  if (/^\d{8}$/.test(s)) return make(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6))
  if (/^\d{6}$/.test(s)) return make(2000 + +s.slice(0, 2), +s.slice(2, 4), +s.slice(4))
  const parts = s.split(/[^0-9]+/).filter(Boolean).map(Number)
  if (parts.length === 3) { const [a, b, c] = parts; return make(a < 100 ? a + 2000 : a, b, c) }
  if (parts.length === 2) return make(today.getFullYear(), parts[0], parts[1])
  return null
}
const parseStrict = (raw: string) => {
  const t = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  const [y, m, d] = t.split('-').map(Number)
  return make(y, m, d)
}
const EXAMPLES = ['20261108', '2026.11.8', '26/11/08', '2026년 11월 8일', '11월 8일', '내일', '2026-11-08']

export function Postel() {
  const [lenient, setLenient] = useState<0 | 1>(1)
  const [value, setValue] = useState('')
  const exRef = useRef<HTMLDivElement>(null)
  const segRef = useRef<HTMLDivElement>(null)

  const d = value.trim() ? (lenient ? parseLenient(value) : parseStrict(value)) : null
  const log = !value.trim() ? <>예시를 눌러 <b>엄격 vs 너그러움</b>을 비교해보세요</>
    : d ? (lenient ? <>어떻게 써도 <b>알아듣고</b>, 저장은 <b>한 가지 형식</b>으로</> : <>정확히 <b>YYYY-MM-DD</b>로 썼을 때만 통과</>)
      : (lenient ? <>정말 모호할 때만 <b>예시로 안내</b>해요</> : <>사람은 맞게 썼는데 <b>시스템이 거절</b>했어요</>)

  const demo = useDemo({
    reset() { setLenient(0); setValue('') },
    async play(c) {
      const ex = [...(exRef.current?.querySelectorAll<HTMLElement>('button') ?? [])]
      await c.press(exRef.current, ex[0]); await c.sleep(1100)
      await c.press(segRef.current, segRef.current?.querySelector<HTMLElement>('button:nth-child(2)') ?? null); await c.sleep(900)
      for (const i of [1, 3, 5]) { await c.press(exRef.current, ex[i]); await c.sleep(900) }
    },
  })

  return (
    <Card id="laws-postel" num="07" tag={<Cat tone="g">감정과 예외 처리</Cat>} title="포스텔의 법칙" en="Postel's Law"
      desc="입력은 너그럽게 받고, 출력은 엄격하게 내보내요. (견고성의 원칙)" demo={demo}>
      <Stage log={log}>
        <div className="box left">
          <div ref={segRef} style={{ alignSelf: 'flex-start' }}>
            <Seg value={lenient} onChange={setLenient} options={[[0, '엄격한 입력'], [1, '너그러운 입력']]} />
          </div>
          <input className="lw-in" placeholder="생년월일이나 날짜를 아무렇게나 입력" autoComplete="off" value={value} onChange={e => setValue(e.target.value)} />
          <div className="lw-ex" ref={exRef}>
            {EXAMPLES.map(t => <button key={t} onClick={() => setValue(t)}>{t}</button>)}
          </div>
          {!value.trim() ? (
            <div className="lw-out"><small>시스템이 저장하는 값 (항상 같은 형식)</small><b>–</b></div>
          ) : d ? (
            <div className="lw-out ok"><small>“{value}” → 저장</small><b>{d.getFullYear()}-{pad(d.getMonth() + 1)}-{pad(d.getDate())} ({WD[d.getDay()]})</b></div>
          ) : (
            <div className="lw-out err"><small>입력값 “{value}”</small><b>{lenient ? '날짜로 이해하지 못했어요. 예: 2026-11-08' : '⚠ 형식이 올바르지 않습니다 (YYYY-MM-DD)'}</b></div>
          )}
        </div>
      </Stage>
      <Info
        spec={[['입력', '너그럽게'], ['출력', '엄격하게 · YYYY-MM-DD']]}
        usage={[
          ['개념', '사람이 입력하는 방식은 제각각이에요. 시스템이 맞춰주고, 내보낼 때는 한 가지 형식으로 정리해요.'],
          ['실무', '‘20261108’이든 ‘2026-11-08’이든 찰떡같이 알아듣고, 하이픈·공백·전각 숫자도 받아줘요.'],
          ['주의', '애매하면 추측하지 말고 해석 결과를 보여주며 확인받아요. (예: 01/02 → 1월 2일?)'],
        ]}
      />
    </Card>
  )
}
