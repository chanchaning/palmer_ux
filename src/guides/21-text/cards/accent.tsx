import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { EASE, useMotion } from '../../../lib/motion'
import { Opt, Split, useRun } from '../shared'

const fin = (a?: Animation) => a?.finished.then(() => {}, () => {})

/* ---------- 06 마스크 리빌 ---------- */
const MK_LINES = ['좋은 재료가', '좋은 한 끼를', '만들어요']
type MkDir = 'up' | 'wipe'
export function MaskReveal() {
  const { A, clearA } = useMotion()
  const [dir, setDir] = useState<MkDir>('up')
  const [mask, setMask] = useState(true)
  const inner = useRef<(HTMLElement | null)[]>([])
  const play = async (d = dir) => {
    const list = inner.current.filter(Boolean) as HTMLElement[]
    clearA(...list)
    const fr: Keyframe[] = d === 'up'
      ? [{ transform: 'translateY(105%)' }, { transform: 'none' }]
      : [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }]
    const an = list.map((el, i) => A(el, fr, 700, EASE.emph, i * 120))
    await fin(an.at(-1))
  }
  const demo = useDemo({ async play(c) { await play(); await c.sleep(600) } })
  return (
    <Card id="text-mask" num="06" title="마스크 리빌" en="Mask Reveal" demo={demo}
      desc="보이지 않는 선 아래에서 글자가 밀려 올라와요. 단정하고 고급스러운 느낌이에요.">
      <Stage log={<>{dir === 'up' ? '줄마다 보이지 않는 창(overflow: hidden) 아래에서 올라와요' : '왼쪽부터 가림막(clip-path)이 걷혀요'}{!mask && dir === 'up' && ' · 창을 끄면 아래 줄과 겹쳐 보여요'}</>}>
        <div className="box left tx-box">
          <div className={'tx-head tx-mk' + (mask ? '' : ' nomask')}>
            <span className="tx-sr">{MK_LINES.join(' ')}</span>
            {MK_LINES.map((l, i) => (
              <span key={l} className="tx-mk-line" aria-hidden="true"><span ref={el => { inner.current[i] = el }}>{l}</span></span>
            ))}
          </div>
          <div className="tx-ctrl">
            <Opt label="방향" value={dir} onChange={v => { setDir(v); play(v) }} options={[['up', '아래에서 위로'], ['wipe', '왼쪽에서 오른쪽']]} />
            <Opt label="창 보기" value={mask ? 1 : 0} onChange={v => { setMask(!!v); play() }} options={[[1, '가림'], [0, '안 가림']]} />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['시간', '600–800ms'], ['곡선', '강조형 ease-out'], ['줄 간격', '100–150ms']]}
        usage={[
          ['언제', '브랜드 소개, 캠페인 페이지의 큰 제목, 포트폴리오 첫 화면'],
          ['원리', '줄마다 넘치는 부분을 숨기는 창을 두고, 안쪽 글자를 아래에서 올려요. 창이 없으면 그냥 미끄러지는 글자가 돼요.'],
          ['주의', '창 높이가 글자보다 낮으면 받침·영문 g·y 아래가 잘려요. 행간을 1.2 이상 줘요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 블러 인 ---------- */
const BL_TEXT = '천천히 선명해지는 오늘의 메뉴'
export function BlurIn() {
  const { A, clearA } = useMotion()
  const [blur, setBlur] = useState(10)
  const [byWord, setByWord] = useState(true)
  const words = useRef<HTMLElement[]>([])
  const whole = useRef<HTMLDivElement>(null)
  const play = async (b = blur, w = byWord) => {
    clearA(whole.current, ...words.current)
    const list = w ? words.current : [whole.current!]
    const an = list.map((el, i) => A(el, [{ filter: `blur(${b}px)`, opacity: 0 }, { filter: 'blur(0px)', opacity: 1 }], 650, EASE.out, i * 110))
    await fin(an.at(-1))
  }
  const demo = useDemo({ async play(c) { await play(); await c.sleep(600) } })
  return (
    <Card id="text-blur" num="07" title="블러 인" en="Blur In" demo={demo}
      desc="흐릿한 글자가 초점이 맞듯 선명해져요. 부드럽고 몽환적인 느낌이에요.">
      <Stage log={<>흐림 <b>{blur}px</b> · {blur >= 20 ? '처음엔 글자가 아니라 얼룩처럼 보여요' : blur <= 4 ? '변화가 거의 느껴지지 않아요' : '초점이 맞춰지는 느낌이 또렷해요'}</>}>
        <div className="box left tx-box">
          <div className="tx-head tx-bl" ref={whole}><Split text={BL_TEXT} words={words} /></div>
          <div className="tx-ctrl">
            <Opt label="흐림" value={blur} onChange={v => { setBlur(v); play(v) }} options={[[4, '4px'], [10, '10px'], [20, '20px']]} />
            <Opt label="단위" value={byWord ? 1 : 0} onChange={v => { setByWord(!!v); play(blur, !!v) }} options={[[0, '한 번에'], [1, '단어별']]} />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['흐림', '8–12px'], ['시간', '500–700ms'], ['함께', 'opacity 0 → 1']]}
        usage={[
          ['언제', '감성적인 브랜드 카피, 이미지 위 큰 문구, 꿈·휴식 같은 주제'],
          ['성능', 'blur는 그리는 비용이 커요. 큰 제목 한두 줄에만 쓰고, 긴 문단이나 목록 전체에는 쓰지 않아요.'],
          ['주의', '업무용 화면에서는 ‘화면이 덜 불러와졌나?’ 하는 오해를 줄 수 있어요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 단어 교체 ---------- */
const RT_WORDS = ['산책', '독서', '요리', '대청소']
export function WordRotate() {
  const { A, clearA } = useMotion()
  const [i, setI] = useState(0)
  const [fit, setFit] = useState(true)
  const [gap, setGap] = useState(1600)
  const wrap = useRef<HTMLSpanElement>(null)
  const word = useRef<HTMLSpanElement>(null)
  const { run } = useRun()
  const swap = async (smooth: boolean) => {
    const box = wrap.current, w = word.current
    if (!box || !w) return
    const w0 = box.getBoundingClientRect().width
    clearA(w)
    await fin(A(w, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-60%)', opacity: 0 }], 200, EASE.in))
    clearA(box)
    flushSync(() => setI(x => (x + 1) % RT_WORDS.length))
    const nw = word.current
    if (!nw) return
    clearA(nw)
    const w1 = nw.getBoundingClientRect().width
    if (smooth) A(box, [{ width: w0 + 'px' }, { width: w1 + 'px' }], 280, EASE.std)
    await fin(A(nw, [{ transform: 'translateY(60%)', opacity: 0 }, { transform: 'none', opacity: 1 }], 280, EASE.out))
  }
  const play = (f = fit, g = gap) => run(async sl => {
    for (let k = 0; k < RT_WORDS.length * 2; k++) { await sl(g); await swap(f) }
  })
  const demo = useDemo({ reset() { setI(0) }, async play(c) { await play(); await c.sleep(300) } })
  return (
    <Card id="text-rotate" num="08" title="단어 교체" en="Word Rotate" demo={demo}
      desc="문장은 그대로 두고 한 단어만 돌아가며 바뀌어요. 여러 쓰임새를 한 줄로 말해요.">
      <Stage log={<>{(gap / 1000).toFixed(1)}초마다 교체{gap < 1500 ? ' · 읽기도 전에 바뀌어요' : ''}{!fit && ' · 뒤 글자가 툭툭 튀어요'}</>}>
        <div className="box left tx-box">
          <div className="tx-head tx-rt">
            <span className="tx-sr">오늘은 {RT_WORDS.join(', ')} 하기 좋은 날</span>
            <span aria-hidden="true">오늘은 <span className="tx-rt-wrap" ref={wrap}><span className="tx-rt-word" ref={word} key={i}>{RT_WORDS[i]}</span></span> 하기 좋은 날</span>
          </div>
          <div className="tx-ctrl">
            <Opt label="간격" value={gap} onChange={v => { setGap(v); play(fit, v) }} options={[[900, '0.9초'], [1600, '1.6초'], [2500, '2.5초']]} />
            <Opt label="폭" value={fit ? 1 : 0} onChange={v => { setFit(!!v); play(!!v, gap) }} options={[[1, '부드럽게 맞춤'], [0, '맞추지 않음']]} />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['머무름', '2–3초'], ['교체', '200–300ms'], ['단어 수', '3–5개']]}
        usage={[
          ['언제', '랜딩 첫 화면에서 ‘누구를 위한 서비스인지’ 여러 쓰임새를 보여줄 때'],
          ['실무', '단어 길이가 다르면 뒤 문장이 흔들려요. 폭을 부드럽게 맞추거나, 바뀌는 단어를 문장 끝에 둬요.'],
          ['주의', '화면 낭독기가 바뀔 때마다 읽지 않게 aria-live를 쓰지 않아요. 멈춤 버튼이나 몇 바퀴 뒤 멈추는 규칙을 둬요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 하이라이트 ---------- */
type HlStyle = 'half' | 'full' | 'line'
const HL_SIZE: Record<HlStyle, string> = { half: '45%', full: '100%', line: '2px' }
export function Highlight() {
  const { A, clearA } = useMotion()
  const [st, setSt] = useState<HlStyle>('half')
  const marks = useRef<(HTMLElement | null)[]>([])
  const play = async (s = st) => {
    const list = marks.current.filter(Boolean) as HTMLElement[]
    clearA(...list)
    const an = list.map((el, k) => A(el, [{ backgroundSize: `0% ${HL_SIZE[s]}` }, { backgroundSize: `100% ${HL_SIZE[s]}` }], 650, EASE.std, 300 + k * 700))
    await fin(an.at(-1))
  }
  const demo = useDemo({ async play(c) { await play(); await c.sleep(600) } })
  return (
    <Card id="text-highlight" num="09" title="하이라이트" en="Highlight" demo={demo}
      desc="형광펜이 지나가듯 핵심 구절에 색이 칠해져요. 읽는 흐름 안에서 강조해요.">
      <Stage log={<>구절 2곳 · 읽는 순서대로 <b>0.7초</b> 간격{st === 'full' ? ' · 전체 칠은 눈에 띄지만 글자 대비를 꼭 확인해요' : ''}</>}>
        <div className="box left tx-box">
          <p className={'tx-hl-p s-' + st} style={{ ['--hl-h' as string]: HL_SIZE[st] }}>
            주문은 밤 10시까지 받아요. 그 전에 결제하면 <mark ref={el => { marks.current[0] = el }}>다음 날 아침 7시 전에</mark> 문 앞에 도착해요.
            포장재는 <mark ref={el => { marks.current[1] = el }}>다음 배송 때 회수</mark>해 다시 써요.
          </p>
          <div className="tx-ctrl">
            <Opt label="모양" value={st} onChange={v => { setSt(v); play(v) }} options={[['half', '아래 절반'], ['full', '전체 칠'], ['line', '밑줄']]} />
            <button className="btn sm" onClick={() => play()}>재생</button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['시간', '구절당 500–700ms'], ['방향', '읽는 방향(왼→오)'], ['개수', '한 문단 1–2곳']]}
        usage={[
          ['언제', '약관·안내문의 핵심 조건, 블로그·리포트의 결론 문장, 온보딩 설명'],
          ['실무', '<mark> 태그를 쓰면 화면 낭독기와 검색에도 ‘강조된 구절’로 전달돼요. 칠하는 모양은 CSS 배경으로 그려요.'],
          ['주의', '색만으로 강조하면 색각이 다른 사람은 놓쳐요. 굵기나 밑줄을 함께 쓰고, 칠한 뒤 글자 대비 4.5:1을 확인해요.'],
        ]}
      />
    </Card>
  )
}
