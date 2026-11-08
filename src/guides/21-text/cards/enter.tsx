import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { EASE, useMotion } from '../../../lib/motion'
import { Opt, Split, easeOut, jamoSteps, useRun } from '../shared'

/* ---------- 01 타이핑 ---------- */
const TYPE_TEXT = '오늘 저녁은 따뜻한 국물 요리 어때요?'
type Unit = 'char' | 'jamo'
export function Typing() {
  const [speed, setSpeed] = useState(60)
  const [unit, setUnit] = useState<Unit>('char')
  const [shown, setShown] = useState(TYPE_TEXT)
  const [busy, setBusy] = useState(false)
  const { run, stop } = useRun()
  const n = Array.from(TYPE_TEXT).length
  const play = (sp = speed, u: Unit = unit) => run(async sl => {
    setBusy(true); setShown('')
    let acc = ''
    for (const ch of Array.from(TYPE_TEXT)) {
      if (u === 'jamo' && ch !== ' ') {
        const st = jamoSteps(ch)
        for (const s of st) { setShown(acc + s); await sl(sp / st.length + 10) }
      } else { setShown(acc + ch); await sl(ch === ' ' ? sp / 2 : sp) }
      acc += ch
    }
    setBusy(false)
  })
  const skip = () => { stop(); setShown(TYPE_TEXT); setBusy(false) }
  const demo = useDemo({ reset() { stop(); setShown('') }, async play(c) { await play(); await c.sleep(600) } })
  const sec = ((n * speed) / 1000).toFixed(1)
  return (
    <Card id="text-typing" num="01" title="타이핑" en="Typewriter" demo={demo}
      desc="글자를 한 자씩 찍어요. 누군가 지금 쓰고 있다는 느낌을 줘요.">
      <Stage log={<>{n}자 × {speed}ms = 약 <b>{sec}초</b>{speed >= 120 ? ' · 문장이 끝나기를 기다리게 돼요' : speed <= 30 ? ' · 빨라서 거의 한 번에 보여요' : ' · 읽는 속도와 비슷해요'}</>}>
        <div className="box left tx-box">
          <div className="tx-type">
            <span className="tx-sr">{TYPE_TEXT}</span>
            <span aria-hidden="true">{shown}</span><i className={'tx-caret' + (busy ? ' on' : '')} aria-hidden="true" />
          </div>
          <div className="tx-ctrl">
            <Opt label="속도" value={speed} onChange={v => { setSpeed(v); play(v) }} options={[[30, '30ms'], [60, '60ms'], [120, '120ms']]} />
            <Opt label="단위" value={unit} onChange={v => { setUnit(v); play(speed, v) }} options={[['char', '글자'], ['jamo', '자모 (ㅇ→오→옥)']]} />
            <button className="btn ghost sm" onClick={skip} disabled={!busy}>건너뛰기</button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['간격', '글자당 40–80ms'], ['커서', '깜빡임 500ms'], ['길이', '20자 안팎']]}
        usage={[
          ['언제', '검색창 예시 문구, 온보딩 인사말, 히어로 한 줄 카피'],
          ['한글', '자모 단위는 실제로 쓰는 느낌이 나지만 중간 글자(ㅇ, 오)가 깜빡여 읽기엔 글자 단위가 편해요.'],
          ['주의', '두 줄이 넘는 글은 타이핑하지 않아요. 반드시 건너뛰거나 누르면 바로 완성되게 해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 글자 순차 등장 ---------- */
const ST_LINES = ['작은 변화가 모여', '큰 차이를 만들어요']
type StUnit = 'char' | 'word' | 'line'
const ST_GAP: Record<StUnit, number> = { char: 35, word: 90, line: 160 }
const ST_NAME: Record<StUnit, string> = { char: '글자', word: '단어', line: '줄' }
export function Stagger() {
  const { A, clearA } = useMotion()
  const [unit, setUnit] = useState<StUnit>('word')
  const c0 = useRef<HTMLElement[]>([]), c1 = useRef<HTMLElement[]>([])
  const w0 = useRef<HTMLElement[]>([]), w1 = useRef<HTMLElement[]>([])
  const lines = useRef<(HTMLElement | null)[]>([])
  const els = (u: StUnit) => u === 'char' ? [...c0.current, ...c1.current] : u === 'word' ? [...w0.current, ...w1.current] : lines.current.filter(Boolean) as HTMLElement[]
  const total = (u: StUnit) => (els(u).length - 1) * ST_GAP[u] + 420
  const play = async (u = unit) => {
    const all = [...c0.current, ...c1.current, ...w0.current, ...w1.current, ...lines.current]
    clearA(...all)
    const list = els(u)
    const anims = list.map((el, i) => A(el, [{ opacity: 0, transform: 'translateY(.45em)' }, { opacity: 1, transform: 'none' }], 420, EASE.out, i * ST_GAP[u]))
    await anims.at(-1)?.finished.catch(() => {})
  }
  const demo = useDemo({ reset() { setUnit('word') }, async play(c) { await play('word'); await c.sleep(700) } })
  const cnt = els(unit).length || (unit === 'char' ? 18 : unit === 'word' ? 5 : 2)
  return (
    <Card id="text-stagger" num="02" title="글자 순차 등장" en="Letter Stagger" demo={demo}
      desc="글자·단어·줄을 조금씩 늦게 올려요. 단위가 커질수록 읽기 쉬워요.">
      <Stage log={<>{ST_NAME[unit]} {cnt}개 × {ST_GAP[unit]}ms → 전체 <b>{total(unit)}ms</b></>}>
        <div className="box left tx-box">
          <div className="tx-head tx-stg">
            <span className="tx-line" ref={el => { lines.current[0] = el }}><Split text={ST_LINES[0]} chars={c0} words={w0} /></span>
            <span className="tx-line" ref={el => { lines.current[1] = el }}><Split text={ST_LINES[1]} chars={c1} words={w1} /></span>
          </div>
          <div className="tx-ctrl">
            <Opt label="단위" value={unit} onChange={v => { setUnit(v); play(v) }} options={[['char', '글자'], ['word', '단어'], ['line', '줄']]} />
            <button className="btn sm" onClick={() => play()}>재생</button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['글자', '30–40ms 간격'], ['단어', '80–100ms'], ['줄', '120–160ms'], ['개별', '400ms · ease-out']]}
        usage={[
          ['언제', '랜딩 첫 화면 제목, 섹션 타이틀처럼 크고 짧은 글'],
          ['한글', '한글은 글자 하나가 음절이라 글자 단위는 리듬이 잘게 끊겨요. 단어 단위가 가장 자연스러워요.'],
          ['주의', '쪼갠 글자는 화면 낭독기가 한 자씩 읽을 수 있어요. 조각은 숨기고 완성 문장을 따로 줘요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 스크램블 ---------- */
const SCR: Record<'ko' | 'en', { text: string; set: string; name: string }> = {
  ko: { text: '결제가 완료됐어요', set: '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허', name: '한글' },
  en: { text: 'ORDER #A7K-2048', set: 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#-', name: '영문·숫자' },
}
export function Scramble() {
  const [lang, setLang] = useState<'ko' | 'en'>('en')
  const [per, setPer] = useState(2)
  const [cells, setCells] = useState(() => Array.from(SCR.en.text).map(ch => ({ ch, ok: true })))
  const { run } = useRun()
  const play = (l = lang, p = per) => run(async sl => {
    const target = Array.from(SCR[l].text), set = SCR[l].set
    const start = target.map((_, i) => i * p + Math.floor(Math.random() * 3))
    const end = Math.max(...start) + 2
    for (let f = 0; f <= end; f++) {
      setCells(target.map((ch, i) => ch === ' ' || f >= start[i] ? { ch, ok: true } : { ch: set[Math.floor(Math.random() * set.length)], ok: false }))
      await sl(45)
    }
  })
  const demo = useDemo({ async play(c) { await play(); await c.sleep(600) } })
  const ms = (Array.from(SCR[lang].text).length * per + 4) * 45
  return (
    <Card id="text-scramble" num="03" title="스크램블" en="Scramble" demo={demo}
      desc="무작위 글자가 돌다가 앞에서부터 제자리를 찾아요. 계산·해독하는 느낌이에요.">
      <Stage log={<>45ms마다 바뀌고 글자당 {per}번 돌아요 → 약 <b>{(ms / 1000).toFixed(1)}초</b></>}>
        <div className="box left tx-box">
          <div className={'tx-scr ' + lang}>
            <span className="tx-sr">{SCR[lang].text}</span>
            {cells.map((c, i) => <span key={i} aria-hidden="true" className={c.ok ? '' : 'wait'}>{c.ch === ' ' ? ' ' : c.ch}</span>)}
          </div>
          <div className="tx-ctrl">
            <Opt label="문장" value={lang} onChange={v => { setLang(v); play(v) }} options={[['en', '영문·숫자'], ['ko', '한글']]} />
            <Opt label="회전" value={per} onChange={v => { setPer(v); play(lang, v) }} options={[[1, '1번'], [2, '2번'], [5, '5번']]} />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['갱신', '30–60ms'], ['전체', '1초 이내'], ['글꼴', '고정폭 숫자 권장']]}
        usage={[
          ['언제', '주문번호·쿠폰 코드 발급, 결과 공개, 기술 느낌의 브랜드 문구'],
          ['한글', '한글은 무작위 음절이 그럴듯한 단어로 읽혀 오히려 헷갈려요. 영문·숫자 코드에 더 잘 어울려요.'],
          ['주의', '글자 폭이 제각각이면 문장이 출렁여요. 고정폭 글꼴이나 tabular-nums를 써요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 페이드업 ---------- */
export function FadeUp() {
  const { A, clearA } = useMotion()
  const [dist, setDist] = useState(16)
  const [seq, setSeq] = useState(true)
  const items = useRef<(HTMLElement | null)[]>([])
  const play = async (d = dist, s = seq) => {
    const list = items.current.filter(Boolean) as HTMLElement[]
    clearA(...list)
    const an = list.map((el, i) => A(el, [{ opacity: 0, transform: `translateY(${d}px)` }, { opacity: 1, transform: 'none' }], 450, EASE.out, s ? i * 90 : 0))
    await an.at(-1)?.finished.catch(() => {})
  }
  const demo = useDemo({ async play(c) { await play(); await c.sleep(600) } })
  const msg: ReactNode = dist >= 60 ? '너무 멀리서 올라와 붕 뜬 느낌이에요' : dist <= 8 ? '거의 제자리에서 차분하게 나타나요' : '살짝 떠오르는 가장 무난한 거리예요'
  return (
    <Card id="text-fadeup" num="04" title="페이드업" en="Fade Up" demo={demo}
      desc="살짝 아래에서 떠오르며 나타나요. 가장 무난하고 많이 쓰는 등장이에요.">
      <Stage log={<><b>{dist}px</b> · {msg}</>}>
        <div className="box left tx-box">
          <div className="tx-fu">
            <small ref={el => { items.current[0] = el }}>이번 주 장보기</small>
            <strong ref={el => { items.current[1] = el }}>필요한 것만 담았어요</strong>
            <p ref={el => { items.current[2] = el }}>자주 사는 재료 12개를 먼저 골라뒀어요. 빼거나 더하기만 하면 돼요.</p>
            <span className="btn sm" ref={el => { items.current[3] = el }}>목록 확인하기</span>
          </div>
          <div className="tx-ctrl">
            <Opt label="거리" value={dist} onChange={v => { setDist(v); play(v) }} options={[[8, '8px'], [16, '16px'], [60, '60px']]} />
            <Opt label="순서" value={seq ? 1 : 0} onChange={v => { setSeq(!!v); play(dist, !!v) }} options={[[0, '함께'], [1, '차례로']]} />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['거리', '8–24px'], ['시간', '300–500ms'], ['곡선', 'ease-out'], ['간격', '60–100ms']]}
        usage={[
          ['언제', '스크롤해서 섹션이 보일 때, 카드·모달 안 내용이 처음 나타날 때'],
          ['실무', '제목 → 설명 → 버튼 순서로 차례로 올리면 읽는 순서를 안내할 수 있어요.'],
          ['주의', '스크롤할 때마다 모든 문단이 올라오면 피곤해요. 섹션 첫 등장 한 번만 해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 카운트업 ---------- */
const STATS = [
  { label: '누적 주문', to: 128400, dec: 0, unit: '건' },
  { label: '만족도', to: 4.8, dec: 1, unit: '점' },
  { label: '평균 배송', to: 23, dec: 0, unit: '분' },
]
export function CountUp() {
  const { D } = useMotion()
  const [dur, setDur] = useState(1200)
  const [tab, setTab] = useState(true)
  const [p, setP] = useState(1)
  const { run } = useRun()
  const play = (ms = dur) => run(async (_sl, alive) => {
    await new Promise<void>(res => {
      const t0 = performance.now(), T = D(ms)
      const tick = (now: number) => {
        if (!alive()) return res()
        const t = Math.min(1, (now - t0) / T)
        setP(easeOut(t))
        if (t < 1) requestAnimationFrame(tick); else res()
      }
      setP(0); requestAnimationFrame(tick)
    })
  })
  const demo = useDemo({ async play(c) { await play(); await c.sleep(600) } })
  const fmt = (s: (typeof STATS)[number]) => (s.to * p).toLocaleString('ko-KR', { minimumFractionDigits: s.dec, maximumFractionDigits: s.dec })
  return (
    <Card id="text-count" num="05" title="카운트업" en="Count Up" demo={demo}
      desc="숫자가 0에서 목표까지 올라가요. 크기를 몸으로 느끼게 해요.">
      <Stage log={<><b>{dur}ms</b> · {dur >= 3000 ? '숫자를 기다리게 돼요' : dur <= 600 ? '빠르게 끝나 결과가 바로 읽혀요' : '올라가는 느낌과 읽기가 균형 잡혀요'}{!tab && ' · 숫자 폭이 바뀌어 옆 글자가 흔들려요'}</>}>
        <div className="box left tx-box">
          <div className={'tx-stats' + (tab ? ' tab' : '')}>
            {STATS.map(s => (
              <div key={s.label}>
                <span className="tx-sr">{`${s.label} ${s.to.toLocaleString('ko-KR')}${s.unit}`}</span>
                <small aria-hidden="true">{s.label}</small>
                <b aria-hidden="true">{fmt(s)}<em>{s.unit}</em></b>
              </div>
            ))}
          </div>
          <div className="tx-ctrl">
            <Opt label="시간" value={dur} onChange={v => { setDur(v); play(v) }} options={[[600, '0.6초'], [1200, '1.2초'], [3000, '3초']]} />
            <Opt label="숫자 폭" value={tab ? 1 : 0} onChange={v => { setTab(!!v); play() }} options={[[1, '고정'], [0, '고정 안 함']]} />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['시간', '0.8–1.5초'], ['곡선', 'ease-out (끝에서 느려짐)'], ['숫자', 'tabular-nums']]}
        usage={[
          ['언제', '대시보드 핵심 지표, 랜딩의 성과 숫자, 포인트 적립 결과'],
          ['실무', '끝에서 느려져야 마지막 숫자가 읽혀요. 일정한 속도(linear)면 목표에서 툭 멈춰요.'],
          ['주의', '자주 바뀌는 실시간 숫자에는 쓰지 않아요. 매번 0부터 올라가면 값을 비교할 수 없어요.'],
        ]}
      />
    </Card>
  )
}
