import { Fragment, useEffect, useRef, useState } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { Knob, Para, View } from '../shared'
import { clamp, reduced, useScroller } from '../util'

/* ---------- 01 패럴랙스 ---------- */
export function Parallax() {
  const s = useScroller()
  const [y, setY] = useState(0)
  const [depth, setDepth] = useState<number>(1)
  const k = reduced() ? 0 : depth
  /** f가 클수록 스크롤을 덜 따라가요 = 멀리 있는 층 */
  const layer = (f: number) => ({ transform: `translate3d(0, ${(y * f * k).toFixed(1)}px, 0)` })
  const demo = useDemo({
    reset() { s.home(); setY(0) },
    async play(c) {
      await s.glide(c, 200, 1900); await c.sleep(500)
      await s.glide(c, 0, 1300)
    },
  })
  return (
    <Card id="scroll-parallax" num="01" title="패럴랙스" en="Parallax" demo={demo}
      desc="먼 배경은 천천히, 가까운 것은 빨리 움직여요. 속도 차이만으로 평평한 화면에 깊이가 생겨요.">
      <Stage log={y < 4 ? <>창 안에서 <b>아래로</b> 스크롤해 보세요</> : k === 0 ? <>모든 층이 <b>같은 속도</b> · 그림 한 장이 통째로 올라가요</> : <>해와 먼 산은 <b>천천히</b>, 앞 언덕은 <b>빨리</b> · 속도 차이가 깊이로 읽혀요</>}>
        <div className="box left sc-box">
          <View s={s} label="패럴랙스 데모" onScroll={el => setY(el.scrollTop)}>
            <div className="sc-px-hero" aria-hidden="true">
              <i className="sc-px-sun" style={layer(0.82)} />
              <i className="sc-px-far" style={layer(0.62)} />
              <i className="sc-px-mid" style={layer(0.36)} />
              <i className="sc-px-near" style={layer(0.12)} />
              <b className="sc-px-title" style={layer(0.5)}>산 너머 마을</b>
            </div>
            <div className="sc-body sc-px-body">
              <h4>걸어서 넘는 길</h4>
              <Para>아침 일곱 시에 출발하면 점심 전에 고개를 넘어요. 길은 하나뿐이라 헤맬 일이 없어요.</Para>
              <Para>고개 위에서는 지나온 마을과 갈 마을이 한눈에 보여요. 물은 미리 채워 가세요.</Para>
              <Para>내려가는 길은 올라온 길보다 짧고 가팔라요. 해가 지기 전에 닿을 수 있어요.</Para>
            </div>
          </View>
          <div className="sc-ctrl">
            <Knob label="깊이"><Seg value={depth} onChange={setDepth} options={[[0, '없음'], [0.5, '약하게'], [1, '강하게']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['속도 차이', '본문의 30–80%'], ['층 수', '2–4개'], ['이동 거리', '화면 높이의 10–20%']]}
        usage={[
          ['언제', '첫 화면의 큰 그림, 상품 소개, 이야기형 페이지처럼 분위기를 만들어야 할 때'],
          ['원리', '스크롤한 거리에 층마다 다른 비율을 곱해 반대로 밀어 줘요. 비율이 클수록 덜 올라가서 멀리 있는 것처럼 보여요.'],
          ['주의', '글자가 얹힌 층까지 따로 놀면 읽기 어렵고 멀미가 나요. 움직이는 건 배경 장식으로 한정하고, 동작 줄이기 설정에서는 꺼요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 페이드 업 ---------- */
const NEWS: [number, string, string][] = [
  [228, '이번 주 새 소식', '달라진 점 세 가지'], [262, '검색이 빨라졌어요', '결과가 0.3초 안에'], [18, '보관함 정리', '폴더를 끌어서 옮겨요'],
  [158, '어두운 화면', '밤에도 눈이 편하게'], [330, '알림 묶어 보기', '하루 한 번만 받아요'], [42, '다음 달 예고', '함께 쓰는 메모'],
]
export function FadeUp() {
  const s = useScroller()
  const [shown, setShown] = useState<ReadonlySet<number>>(new Set())
  const [once, setOnce] = useState(true)
  const [dy, setDy] = useState(28)
  const [gen, setGen] = useState(0)
  useEffect(() => {
    const root = s.ref.current
    if (!root) return
    // 30% 넘게 보이면 나타나고, ‘매번’일 때는 완전히 벗어나야 다시 숨어요
    const io = new IntersectionObserver(es => setShown(prev => {
      const next = new Set(prev)
      es.forEach(e => {
        const i = Number((e.target as HTMLElement).dataset.i)
        if (e.intersectionRatio >= 0.3) next.add(i)
        else if (!e.isIntersecting && !once) next.delete(i)
      })
      return next
    }), { root, threshold: [0, 0.3] })
    root.querySelectorAll('.sc-fu').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [s, once, gen])
  const demo = useDemo({
    reset() { s.home(); setShown(new Set()); setGen(g => g + 1) },
    async play(c) {
      await c.sleep(500)
      await s.glide(c, s.max(), 2600); await c.sleep(500)
    },
  })
  return (
    <Card id="scroll-fadeup" num="02" title="페이드 업" en="Fade Up" demo={demo}
      desc="화면에 들어오는 순간 아래에서 살짝 떠오르며 나타나요. 가장 흔하고, 가장 쉽게 과해지는 효과예요.">
      <Stage log={<><b>{shown.size}</b> / {NEWS.length}개가 나타났어요 · {once ? '한 번 나타나면 그대로 있어요' : '벗어나면 숨어서, 돌아올 때마다 또 움직여요'}</>}>
        <div className="box left sc-box">
          <View s={s} label="페이드 업 데모">
            <div className="sc-body" style={{ ['--dy' as string]: dy + 'px' }}>
              <h4>소식</h4>
              {NEWS.map(([h, t, d], i) => (
                <div key={t} data-i={i} className={'sc-fu' + (shown.has(i) ? ' in' : '')}>
                  <i style={{ ['--h' as string]: h }} aria-hidden="true" />
                  <div><b>{t}</b><span>{d}</span></div>
                </div>
              ))}
            </div>
          </View>
          <div className="sc-ctrl">
            <Knob label="거리"><Seg value={dy} onChange={setDy} options={[[12, '12px'], [28, '28px'], [64, '64px']]} /></Knob>
            <Knob label="반복"><Seg value={once ? 1 : 0} onChange={v => setOnce(v === 1)} options={[[1, '한 번만'], [0, '매번']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['이동', '12–32px'], ['시간', '400–600ms'], ['시작', '20–30% 보일 때']]}
        usage={[
          ['언제', '긴 소개 페이지에서 구역이 바뀌는 걸 알려주거나, 카드 묶음을 차례로 보여줄 때'],
          ['원리', 'IntersectionObserver로 요소가 화면에 걸리는 순간만 잡아서 클래스를 붙여요. 스크롤할 때마다 위치를 계산하지 않아서 가벼워요.'],
          ['주의', '64px처럼 멀리서 오거나 매번 반복하면 빨리 내리는 사람은 빈 화면만 봐요. 한 번만, 짧게, 그리고 스크립트가 안 돌아도 내용은 보이게 해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 스케일 인 ---------- */
type Play = 'scrub' | 'once'
export function ScaleIn() {
  const s = useScroller()
  const slot = useRef<HTMLDivElement>(null)
  const [p, setP] = useState(0)
  const [hit, setHit] = useState(false)
  const [mode, setMode] = useState<Play>('scrub')
  const onScroll = (el: HTMLDivElement) => {
    if (!slot.current) return
    const v = el.getBoundingClientRect(), r = slot.current.getBoundingClientRect()
    // 사진 윗변이 창 아래에 닿으면 0, 창 높이의 72%만큼 올라오면 1
    const np = clamp((v.bottom - r.top) / (v.height * 0.72))
    setP(np)
    if (np > 0.4) setHit(true)
    else if (np < 0.2) setHit(false)
  }
  const on = mode === 'scrub' ? p : hit ? 1 : 0
  const scale = reduced() ? 1 : 0.72 + 0.28 * on
  const demo = useDemo({
    reset() { s.home(); setP(0); setHit(false) },
    async play(c) {
      await s.glide(c, 110, 1000); await c.sleep(700) // 중간에 멈추면 차이가 보여요
      await s.glide(c, 240, 1100); await c.sleep(600)
    },
  })
  return (
    <Card id="scroll-scalein" num="05" title="스케일 인" en="Scale In" demo={demo}
      desc="작게 들어온 사진이 가운데로 올수록 커져요. 스크롤을 따라갈지, 한 번에 재생할지에 따라 느낌이 달라요.">
      <Stage log={p < 0.2 ? <>아래로 내리면 <b>사진</b>이 들어와요</> : mode === 'scrub' ? <>크기 <b>{Math.round(scale * 100)}%</b> · 손을 멈추면 사진도 그 자리에서 멈춰요</> : hit ? <>한 번 걸리면 손을 멈춰도 <b>끝까지</b> 커져요</> : <>사진이 조금 더 올라오면 <b>시작</b>해요</>}>
        <div className="box left sc-box">
          <View s={s} label="스케일 인 데모" onScroll={onScroll}>
            <div className="sc-body sc-si-intro">
              <h4>바다 앞 작업실</h4>
              <Para>창문을 열면 파도 소리가 먼저 들어와요. 책상은 창 쪽으로 붙였어요.</Para>
              <Para>아래 사진은 작업실에서 본 오후 네 시의 바다예요.</Para>
            </div>
            <div className="sc-si-slot" ref={slot}>
              <div className={'sc-si-img' + (mode === 'once' ? ' once' : '')} role="img" aria-label="바다 사진 자리"
                style={{ transform: `scale(${scale.toFixed(3)})`, borderRadius: 28 - 16 * on, opacity: 0.45 + 0.55 * on }}>
                <span>오후 네 시</span>
              </div>
            </div>
            <div className="sc-body">
              <Para>해가 기울면 물빛이 주황으로 바뀌어요. 그때가 하루 중 가장 조용해요.</Para>
              <Para>저녁에는 불을 하나만 켜고 일해요.</Para>
            </div>
          </View>
          <div className="sc-ctrl">
            <Knob label="재생"><Seg value={mode} onChange={setMode} options={[['scrub', '스크롤 따라'], ['once', '한 번에']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['시작 크기', '70–90%'], ['구간', '화면 높이의 50–80%'], ['한 번에', '500–700ms']]}
        usage={[
          ['언제', '대표 사진이나 영상처럼 한 구역의 주인공을 무대 가운데로 데려올 때'],
          ['원리', '요소가 화면 아래에서 가운데까지 온 정도를 0–1로 바꿔 크기에 써요. ‘스크롤 따라’는 그 값을 그대로, ‘한 번에’는 기준을 넘는 순간 전환을 재생해요.'],
          ['주의', '100%보다 크게 키우면 옆 내용을 덮거나 가로 스크롤이 생겨요. 크기는 transform으로만 바꿔야 주변 배치가 흔들리지 않아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 텍스트 리빌 ---------- */
const LINE = '좋은 화면은 설명하지 않아요. 손이 먼저 알고, 눈이 따라가고, 생각은 그다음에 와요.'
const WORDS = LINE.split(' ')
/** 각 단어의 첫 글자가 전체에서 몇 번째 글자인지 */
const STARTS = WORDS.map((_, i) => WORDS.slice(0, i).join('').length)
const CHARS = WORDS.join('').length
type Unit = 'word' | 'char'
export function TextReveal() {
  const s = useScroller()
  const sec = useRef<HTMLDivElement>(null)
  const [p, setP] = useState(0)
  const [unit, setUnit] = useState<Unit>('word')
  const total = unit === 'word' ? WORDS.length : CHARS
  /** i번째 조각의 밝기: 차례가 오기 전엔 흐리게, 지나면 또렷하게 */
  const o = (i: number) => ({ opacity: 0.16 + 0.84 * clamp(p * total - i) })
  const travel = () => (sec.current && s.ref.current ? sec.current.offsetHeight - s.ref.current.clientHeight : 0)
  const demo = useDemo({
    reset() { s.home(); setP(0) },
    async play(c) { await s.glide(c, travel() * 0.95, 3200); await c.sleep(500) },
  })
  return (
    <Card id="scroll-textreveal" num="06" title="텍스트 리빌" en="Text Reveal" demo={demo}
      desc="흐리던 문장이 내리는 만큼 한 단어씩 또렷해져요. 스크롤이 곧 읽는 속도가 돼요.">
      <Stage log={p === 0 ? <>내리는 만큼 문장이 <b>밝아져요</b></> : p >= 1 ? <>다 읽으면 붙잡았던 화면을 <b>놓아줘요</b></> : <><b>{Math.round(p * 100)}%</b> · 문장은 제자리에 붙어 있고 밝기만 바뀌어요</>}>
        <div className="box left sc-box">
          <View s={s} label="텍스트 리빌 데모" onScroll={el => setP(clamp(el.scrollTop / Math.max(1, travel() * 0.9)))}>
            <div className="sc-tr" ref={sec}>
              <div className="sc-tr-pin">
                <p aria-label={LINE}>
                  {WORDS.map((w, wi) => (
                    <Fragment key={wi}>
                      <span className="sc-tr-w" aria-hidden="true">
                        {unit === 'word'
                          ? <span style={o(wi)}>{w}</span>
                          : [...w].map((ch, ci) => <span key={ci} style={o(STARTS[wi] + ci)}>{ch}</span>)}
                      </span>{' '}
                    </Fragment>
                  ))}
                </p>
              </div>
            </div>
            <div className="sc-body">
              <Para>문장이 끝나면 다음 내용이 평소처럼 올라와요.</Para>
            </div>
          </View>
          <div className="sc-ctrl">
            <Knob label="단위"><Seg value={unit} onChange={setUnit} options={[['word', '단어'], ['char', '글자']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['흐린 정도', '15–30%'], ['붙잡는 길이', '화면 1.5–2.5배'], ['문장', '1–3줄']]}
        usage={[
          ['언제', '브랜드 한 줄 소개, 선언문처럼 짧고 꼭 읽혔으면 하는 문장'],
          ['원리', '구간을 화면에 붙여 두고(sticky), 구간 안에서 내린 비율에 조각 수를 곱해 몇 번째까지 밝힐지 정해요. 조각마다 투명도만 바꿔요.'],
          ['주의', '긴 문단에 쓰면 읽으려고 한참을 내려야 해요. 흐린 글자는 대비가 낮아 그 자체로는 읽을 수 없으니, 화면 낭독기에는 문장 전체를 한 번에 전달해요.'],
        ]}
      />
    </Card>
  )
}
