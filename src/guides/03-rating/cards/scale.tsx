import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'

/* ---------- 05 평점 슬라이더 ---------- */
const band = (v: number): [string, string, string, string] =>
  v <= 3 ? ['var(--danger)', '실망했어요', '😣', '불만']
    : v <= 6 ? ['var(--b)', '보통이었어요', '😐', '보통']
      : v <= 8 ? ['var(--accent)', '좋았어요', '🙂', '만족']
        : ['var(--accent)', '최고였어요!', '🤩', '매우 만족']
const SLIDER_LOG = <>손잡이를 <b>좌우로 끌어</b> 보세요</>

export function Slider() {
  const [v, setV] = useState(7)
  const cur = useRef(7)
  const [log, setLog] = useState<ReactNode>(SLIDER_LOG)
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const change = (n: number) => {
    const before = band(cur.current)[3], b = band(n)
    cur.current = n
    setV(n)
    setLog(before !== b[3]
      ? <><b>{n}점</b> · 구간이 <b>{b[3]}</b>(으)로 바뀌며 색도 변경</>
      : <><b>{n}점</b> · {b[3]} 구간 안에서 이동</>)
  }
  const demo = useDemo({
    reset() { cur.current = 7; setV(7); setLog(SLIDER_LOG) },
    async play(c) {
      c.tap(box.current, input.current)
      for (const n of [6, 5, 4, 3, 2]) { change(n); await c.sleep(170) }
      await c.sleep(700)
      for (const n of [3, 4, 5, 6, 7, 8, 9, 10]) { change(n); await c.sleep(150) }
      await c.sleep(500)
    },
  })

  const b = band(v)
  return (
    <Card id="rating-slider" num="05" title="평점 슬라이더" en="Rating Slider" demo={demo}
      desc="1부터 10까지 끌어서 점수를 정해요. 값에 따라 색과 문구가 함께 바뀌어요.">
      <Stage log={log} logId="rating-slider-log">
        <div className="box rt-box" ref={box} style={{ ['--rt-c' as string]: b[0] } as CSSProperties}>
          <p className="rt-q">이번 여행 숙소는 몇 점인가요?</p>
          <div style={{ fontSize: 35, lineHeight: 1 }} aria-hidden="true">{b[2]}</div>
          <div className="rt-big" style={{ color: b[0] }}>{v}<small> / 10</small></div>
          <div className="rt-label" style={{ color: b[0] }}>{b[1]}</div>
          <div className="rt-slider-wrap">
            <input ref={input} type="range" min={1} max={10} step={1} value={v} aria-label="숙소 평점" aria-valuetext={v + '점, ' + b[1]}
              style={{ ['--p' as string]: ((v - 1) / 9) * 100 + '%' } as CSSProperties}
              onChange={e => change(+e.target.value)} />
            <div className="rt-scale">{Array.from({ length: 10 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['척도', '1–10 · step 1'], ['구간', '4색 · 4문구'], ['키보드', '← → Home End']]}
        usage={[
          ['언제', '별 다섯 개로는 차이가 안 드러나는 세밀한 평가, 연속적인 만족도'],
          ['주의', '시작 위치가 곧 기본값이 돼요 — 가운데에 두면 ‘보통’ 응답이 늘어나요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 NPS ---------- */
type Bucket = 'd' | 'p' | 'r'
const bucket = (n: number): Bucket => (n <= 6 ? 'd' : n <= 8 ? 'p' : 'r')
const BASE: Record<Bucket, number> = { r: 26, p: 15, d: 9 }
const FQ: Record<Bucket, [string, string]> = {
  d: ['어떤 점이 가장 아쉬웠나요?', '불편했던 순간을 알려주세요'],
  p: ['10점이 되려면 무엇이 필요할까요?', '한 가지만 바꾼다면…'],
  r: ['어떤 점이 가장 좋았나요?', '추천하고 싶은 이유를 적어주세요'],
}
const BUCKET_NAME: Record<Bucket, string> = { d: '비추천', p: '중립', r: '추천' }
const NPS_LOG = <>응답 <b>50명</b> 기준 · 내 점수를 더해 보세요</>

const tally = (mine: number | null) => {
  const c = { ...BASE }
  if (mine !== null) c[bucket(mine)]++
  const tot = c.r + c.p + c.d, rp = Math.round((c.r / tot) * 100), dp = Math.round((c.d / tot) * 100)
  return { c, tot, rp, dp, nps: rp - dp }
}
const sign = (n: number) => (n > 0 ? '+' : '') + n

export function Nps() {
  const [mine, setMine] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(NPS_LOG)
  const box = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = (i: number) => (wrap.current?.children[i] as HTMLElement | undefined) ?? null

  const pick = (n: number) => {
    setMine(n)
    const k = bucket(n), t = tally(n)
    setLog(<><b>{n}점 = {BUCKET_NAME[k]}</b> · 응답 {t.tot}명으로 NPS {sign(t.nps)}{k === 'p' ? ' (중립은 공식에서 빠짐)' : ''}</>)
  }
  const demo = useDemo({
    reset() { setMine(null); setLog(NPS_LOG) },
    async play(c) {
      await c.press(box.current, btn(4)); await c.sleep(1300)
      await c.press(box.current, btn(8)); await c.sleep(1300)
      await c.press(box.current, btn(10)); await c.sleep(800)
    },
  })

  const t = tally(mine)
  const k = mine === null ? null : bucket(mine)
  return (
    <Card id="rating-nps" num="06" title="NPS 점수" en="Net Promoter Score" demo={demo}
      desc="‘친구에게 추천하겠어요?’를 0–10으로 묻고, 점수대마다 다른 후속 질문을 던져요.">
      <Stage log={log} logId="rating-nps-log">
        <div className="box rt-box" ref={box} style={{ gap: 9 }}>
          <p className="rt-q">친구에게 이 앱을 추천할 가능성은?</p>
          <div style={{ width: '100%' }}>
            <div className="rt-nps" ref={wrap} role="radiogroup" aria-label="추천 가능성 0점부터 10점">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} data-b={bucket(i)} role="radio" aria-checked={mine === i} aria-label={i + '점'} onClick={() => pick(i)}>{i}</button>
              ))}
            </div>
            <div className="rt-buckets"><span className="d">비추천 0–6</span><span className="p">중립</span><span className="r">추천</span></div>
          </div>
          <div className="rt-follow">
            {k ? <><b>{FQ[k][0]}</b><div className="fake">{FQ[k][1]}</div></> : <><b>점수를 골라 주세요</b>0은 전혀 아니다, 10은 매우 그렇다예요</>}
          </div>
          <div className="rt-mix">
            <span style={{ background: 'var(--accent)', flexGrow: t.c.r }} />
            <span style={{ background: 'var(--rt-pass)', flexGrow: t.c.p }} />
            <span style={{ background: 'var(--danger)', flexGrow: t.c.d }} />
          </div>
          <div className="rt-formula">
            <span className="r">추천 {t.rp}%</span><span>−</span><span className="d">비추천 {t.dp}%</span><span>=</span><span className="eq">NPS {sign(t.nps)}</span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['척도', '0–10 · 11단계'], ['공식', '추천% − 비추천%'], ['범위', '−100 ~ +100']]}
        usage={[
          ['언제', '서비스 전체 충성도를 분기마다 같은 질문으로 추적할 때'],
          ['주의', '7–8점(중립)은 공식에서 빠져요 — 평균 점수와 헷갈리지 마세요'],
        ]}
      />
    </Card>
  )
}
