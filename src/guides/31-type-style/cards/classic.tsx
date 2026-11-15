import { useRef, useState, type CSSProperties } from 'react'
import { useDemo } from '../../../components/Card'
import { Range, Seg } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { Knob, TypeCard } from '../shared'
import { reduced, wobble } from '../util'

const v = (o: Record<string, string | number>) => o as CSSProperties

/* ---------- 04 바우하우스 ---------- */
type Lay = 'grid' | 'stair'
type Pal = 'primary' | 'mono'
const SHAPES = ['circle', 'square', 'tri', 'half'] as const
export function Bauhaus() {
  const [text, setText] = useState('형태 FORM')
  const [lay, setLay] = useState<Lay>('grid')
  const [pal, setPal] = useState<Pal>('primary')
  const chars = Array.from(text || '\u00a0')
  const demo = useDemo({
    reset() { setLay('grid'); setPal('mono') },
    async play(c) { await c.sleep(600); setPal('primary'); await c.sleep(1100); setLay('stair'); await c.sleep(1200); setLay('grid') },
  })
  let k = 0
  return (
    <TypeCard id="tys-bauhaus" num="04" title="바우하우스" en="Bauhaus" demo={demo}
      desc="원·사각·삼각 같은 기본 도형 위에 굵은 글자를 하나씩 얹어요. 빨강·노랑·파랑 원색이 또렷한 1920년대 학교 포스터 느낌이에요."
      log={<>{lay === 'grid' ? '격자에 반듯하게' : '계단처럼 어긋나게'} · {pal === 'primary' ? '삼원색 + 검정' : '흑백만으로도 도형이 살아 있어요'}</>}
      text={text} onText={setText} view={'tys-bh-v p-' + pal} maxLength={12}
      preview={
        <span className={'tys-bh l-' + lay}>
          <span className="tys-sr">{text}</span>
          {chars.map((ch, i) => {
            if (ch === ' ') return <span key={i} className="tys-bh-gap" aria-hidden="true" />
            const s = SHAPES[k++ % SHAPES.length]
            return <span key={i} className={'tys-bh-c s-' + s} style={v({ '--i': i })} aria-hidden="true"><i />{ch}</span>
          })}
        </span>
      }
      knobs={<>
        <Knob label="배치"><Seg value={lay} onChange={setLay} options={[['grid', '격자'], ['stair', '계단']]} /></Knob>
        <Knob label="색"><Seg value={pal} onChange={setPal} options={[['primary', '삼원색'], ['mono', '흑백']]} /></Knob>
      </>}
      say={['바우하우스 타이포, 원·사각·삼각 기하 도형, 빨강·노랑·파랑 원색과 검정, 격자 구성, 산세리프', 'Bauhaus typography, geometric circle square triangle, primary red yellow blue with black, grid composition, sans-serif']}
      spec={[['도형', '원 · 사각 · 삼각'], ['색', '원색 3 + 검정'], ['글자', '굵은 산세리프']]}
      usage={[
        ['언제', '전시·강연 포스터, 교육·건축 브랜드, 정돈됐지만 힘 있는 표지'],
        ['실무', '도형과 글자의 크기를 같은 격자 단위로 맞추면 단단해 보여요. 색은 세 가지 원색 안에서만 골라요.'],
        ['주의', '글자를 도형 위에 얹을 땐 노랑 위 검정처럼 대비를 지켜요. 글자가 많아지면 도형이 시끄러워지니 짧은 제목에만 써요.'],
      ]}
    />
  )
}

/* ---------- 05 아르데코 ---------- */
type Orn = 'line' | 'sun'
export function ArtDeco() {
  const [text, setText] = useState('GRAND 호텔 1925')
  const [track, setTrack] = useState(32)
  const [orn, setOrn] = useState<Orn>('line')
  const demo = useDemo({
    reset() { setTrack(0); setOrn('line') },
    async play(c) {
      for (const t of [8, 16, 24, 32]) { setTrack(t); await c.sleep(300) }
      await c.sleep(500); setOrn('sun'); await c.sleep(1300); setOrn('line')
    },
  })
  return (
    <TypeCard id="tys-deco" num="05" title="아르데코" en="Art Deco" demo={demo}
      desc="가늘고 키 큰 대문자를 넓게 벌리고, 금빛과 대칭 장식선으로 감싸요. 1920년대 호텔 로비 같은 화려한 품격이에요."
      log={<>자간 <b>{(track / 100).toFixed(2)}em</b>{track < 12 ? ' · 좁으면 데코의 여유가 사라져요' : track >= 50 ? ' · 너무 벌리면 단어가 흩어져요' : ''} · {orn === 'line' ? '위아래 대칭 선' : '뒤로 퍼지는 햇살'}</>}
      text={text} onText={setText} view={'tys-deco-v o-' + orn}
      preview={
        <span className="tys-deco" style={v({ '--tr': track / 100 + 'em' })}>
          <i className="tys-deco-rule" aria-hidden="true" />
          <span className="tys-deco-t">{text || '\u00a0'}</span>
          <i className="tys-deco-rule b" aria-hidden="true" />
        </span>
      }
      knobs={<>
        <Knob label="자간" wide><Range value={track} min={0} max={60} onChange={setTrack} label="자간" /></Knob>
        <Knob label="장식"><Seg value={orn} onChange={setOrn} options={[['line', '대칭 선'], ['sun', '햇살']]} /></Knob>
      </>}
      say={['아르데코 타이포, 가늘고 키 큰 대문자, 넓은 자간, 금색 메탈, 대칭 장식선과 햇살 무늬, 1920년대 호텔', 'Art Deco typography, thin tall capitals, wide letter-spacing, gold metallic, symmetrical ornament, sunburst, 1920s grand hotel']}
      spec={[['자간', '0.2–0.4em'], ['굵기', '가늘게 200–300'], ['구성', '가운데 대칭']]}
      usage={[
        ['언제', '호텔·바·향수·초대장처럼 고급스럽고 의식(儀式) 같은 분위기가 필요할 때'],
        ['실무', '진짜 아르데코는 굵기 차이가 큰 전용 장식 글꼴이 핵심이에요. 여기선 기본 글꼴의 얇은 굵기 + 넓은 자간 + 금빛으로 흉내 냈어요.'],
        ['주의', '금색은 밝은 바탕에서 대비가 약해요. 짙은 금색을 쓰거나 어두운 바탕에 올리고, 한글은 자간을 영문보다 덜 벌려요.'],
      ]}
    />
  )
}

/* ---------- 07 미니멀 ---------- */
export function MinimalType() {
  const [text, setText] = useState('적게, 그러나 더 좋게')
  const [weights, setWeights] = useState<1 | 3>(1)
  const [space, setSpace] = useState(36)
  const demo = useDemo({
    reset() { setWeights(3); setSpace(10) },
    async play(c) {
      await c.sleep(800); setWeights(1); await c.sleep(700)
      for (const s of [18, 26, 36]) { setSpace(s); await c.sleep(350) }
    },
  })
  return (
    <TypeCard id="tys-minimal" num="07" title="미니멀" en="Minimal Type" demo={demo}
      desc="굵기 한 가지, 크기 두세 가지, 그리고 넉넉한 빈자리. 꾸밈을 빼서 글자 자체를 또렷하게 보여줘요."
      log={<>굵기 <b>{weights}가지</b> · 여백 <b>{space}px</b>{weights === 3 ? ' · 굵기가 섞이면 금세 시끄러워져요' : space < 16 ? ' · 여백이 좁으면 그냥 빽빽한 글이에요' : ' · 빈자리가 글자를 받쳐 줘요'}</>}
      text={text} onText={setText} view={'tys-min-v w' + weights}
      preview={
        <span className="tys-min" style={v({ '--sp': space + 'px' })}>
          <small className="tys-min-idx">01 — 소개</small>
          <span className="tys-min-t">{text || '\u00a0'}</span>
          <span className="tys-min-meta"><span>Less but better</span><span>2026 · 서울</span></span>
        </span>
      }
      knobs={<>
        <Knob label="굵기"><Seg value={weights} onChange={setWeights} options={[[1, '한 가지'], [3, '세 가지 섞기']]} /></Knob>
        <Knob label="여백" wide><Range value={space} min={6} max={48} onChange={setSpace} label="여백" /></Knob>
      </>}
      say={['미니멀 타이포, 굵기 한 가지, 넉넉한 여백, 왼쪽 정렬, 작은 글자와 큰 글자 두 단계, 장식 없음', 'minimal typography, single font weight, generous whitespace, left-aligned, two-size scale, no ornament']}
      spec={[['굵기', '1가지 (400–500)'], ['크기', '2–3단계'], ['정렬', '왼쪽']]}
      usage={[
        ['언제', '포트폴리오, 건축·가구·의류 브랜드, 정보가 적고 분위기가 중요한 첫 화면'],
        ['차이', '04 디자인 스타일의 미니멀이 화면 전체에서 장식을 빼는 거라면, 여기서는 글자만 봐요 — 굵기 수를 줄이고 크기 차이와 빈자리로 순서를 만들어요.'],
        ['주의', '굵기를 하나로 줄이면 강약이 약해져요. 크기·위치·여백으로 무엇이 먼저인지 분명히 보여줘요.'],
      ]}
    />
  )
}

/* ---------- 08 핸드레터링 ---------- */
type Face = 'cursive' | 'sans'
export function HandLettering() {
  const { A, clearA } = useMotion()
  const [text, setText] = useState('고마워요 thanks')
  const [jit, setJit] = useState(5)
  const [face, setFace] = useState<Face>('cursive')
  const svg = useRef<HTMLSpanElement>(null)
  const draw = () => {
    const paths = Array.from(svg.current?.querySelectorAll('svg path') ?? [])
    clearA(...paths)
    if (reduced()) return
    paths.forEach((p, i) => A(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], i === 0 ? 700 : 420, 'cubic-bezier(.5,0,.3,1)', i * 260))
  }
  const demo = useDemo({
    reset() { setJit(0); setFace('sans') },
    async play(c) {
      draw(); await c.sleep(900)
      for (const j of [2, 4, 6]) { setJit(j); await c.sleep(300) }
      setFace('cursive'); await c.sleep(1200); setJit(5)
    },
  })
  const chars = Array.from(text || '\u00a0')
  return (
    <TypeCard id="tys-hand" num="08" title="핸드레터링" en="Hand Lettering" demo={demo}
      desc="손으로 쓴 듯 기준선이 살짝 출렁이고, 펜으로 그은 밑줄과 낙서가 따라와요. 따뜻하고 사람 냄새가 나요."
      log={<>손맛 <b>{jit}</b> · {face === 'cursive' ? '기기 기본 손글씨체(cursive) — 기기마다 모양이 달라요' : '반듯한 글꼴도 흔들면 조금은 손맛이 나요'}{jit >= 9 ? ' · 너무 흔들면 술 취한 글씨예요' : ''}</>}
      text={text} onText={setText} view={'tys-hand-v f-' + face}
      preview={
        <span className="tys-hand" ref={svg}>
          <span className="tys-sr">{text}</span>
          <span className="tys-hand-t" aria-hidden="true">
            {chars.map((ch, i) => (
              <span key={i} style={{ transform: `translateY(${(wobble(i, 3) * jit * 0.5).toFixed(1)}px) rotate(${(wobble(i, 7) * jit * 0.9).toFixed(1)}deg)` }}>{ch === ' ' ? '\u00a0' : ch}</span>
            ))}
          </span>
          <svg className="tys-hand-svg" viewBox="0 0 300 30" aria-hidden="true" preserveAspectRatio="none">
            <path d="M6 18 C 60 26, 140 8, 210 15 S 280 22, 294 8" pathLength={1} />
          </svg>
          <svg className="tys-hand-sig" viewBox="0 0 80 44" aria-hidden="true">
            <path d="M6 38 C 12 16, 18 4, 15 7 C 11 11, 10 28, 9 38 C 13 28, 20 24, 23 30 C 25 34, 23 38, 29 37 C 33 36, 34 30, 36 26 C 35 32, 35 38, 41 37" pathLength={1} />
            <path d="M36.8 18 l .8 .8 M50 10 C 50 18, 49 24, 48 30 M47.6 37 l .6 .6" pathLength={1} />
            <path d="M66 22 c 2 -6 9 -6 7 0 c -1 4 -5 6 -7 9 c -2 -3 -6 -5 -7 -9 c -2 -6 5 -6 7 0" pathLength={1} />
          </svg>
        </span>
      }
      knobs={<>
        <Knob label="손맛" wide><Range value={jit} min={0} max={10} onChange={setJit} label="흔들림" /></Knob>
        <Knob label="글꼴"><Seg value={face} onChange={setFace} options={[['cursive', '손글씨체 (cursive)'], ['sans', '기본 글꼴']]} /></Knob>
        <button type="button" className="btn ghost sm" onClick={draw}>밑줄 다시 긋기</button>
      </>}
      say={['핸드레터링, 손으로 쓴 붓·펜 글씨, 살짝 출렁이는 기준선, 손으로 그린 밑줄과 낙서, 따뜻한 잉크색', 'hand lettering, brush and pen script, organic bouncy baseline, hand-drawn underline and doodles, warm ink color']}
      spec={[['기준선', '±2–4px 출렁'], ['기울기', '±3–6°'], ['장식', '손 밑줄 · 낙서']]}
      usage={[
        ['언제', '카페·베이커리 간판, 감사 카드, 개인 브랜드, 친근함이 먼저인 캠페인 한 줄'],
        ['실무', '진짜 손글씨 느낌은 글꼴 하나로는 안 나요. 실제 작업에선 손글씨(스크립트) 글꼴을 라이선스를 확인해 쓰거나, 손으로 그린 글자를 SVG로 만들어요. 오른쪽 위 ‘hi’처럼요.'],
        ['주의', 'cursive는 기기마다 다른 글꼴이 나오고 한글은 대부분 그냥 기본 글꼴로 보여요. 본문·버튼에는 쓰지 말고, 짧은 문구에만 써요.'],
      ]}
    />
  )
}

/* ---------- 09 모노스페이스 ---------- */
type MonoFace = 'mono' | 'prop'
type Scene = 'term' | 'receipt'
const ROWS: [string, string, string][] = [['index.js', '12.4kB', '0.31s'], ['style.css', '3.9kB', '0.08s'], ['logo.svg', '1.1kB', '0.02s']]
const ITEMS: [string, number][] = [['Americano', 4500], ['Bagel', 3800], ['Latte x2', 11000]]
export function Monospace() {
  const [text, setText] = useState('빌드 시작 build')
  const [face, setFace] = useState<MonoFace>('mono')
  const [scene, setScene] = useState<Scene>('term')
  const demo = useDemo({
    reset() { setFace('mono'); setScene('term') },
    async play(c) { await c.sleep(900); setFace('prop'); await c.sleep(1200); setFace('mono'); await c.sleep(900); setScene('receipt'); await c.sleep(1200); setScene('term') },
  })
  const total = ITEMS.reduce((s, [, p]) => s + p, 0)
  const won = (n: number) => n.toLocaleString('ko-KR')
  return (
    <TypeCard id="tys-mono" num="09" title="모노스페이스" en="Monospace" demo={demo}
      desc="모든 글자가 같은 폭을 차지해요. 칸이 딱딱 맞아서 터미널·코드·영수증 같은 기계 느낌이 나요."
      log={face === 'mono' ? <>고정폭 · 띄어쓰기만으로 <b>세로 줄이 딱 맞아요</b></> : <>비례폭 · 같은 칸 수인데 <b>i와 m 폭이 달라 줄이 틀어졌어요</b></>}
      text={text} onText={setText} view={'tys-mono-v s-' + scene + ' f-' + face} maxLength={28}
      preview={scene === 'term'
        ? (
          <pre className="tys-mono-pre">
            <span className="g">$</span> {text}{'\n'}
            <span className="d">{'file'.padEnd(12)}{'size'.padStart(8)}{'time'.padStart(8)}</span>{'\n'}
            {ROWS.map(([f, s, t]) => f.padEnd(12) + s.padStart(8) + t.padStart(8) + '\n')}
            <span className="g">✓ done</span> <span className="d">in 0.41s</span><i className="tys-caret" aria-hidden="true" />
          </pre>
        )
        : (
          <pre className="tys-mono-pre">
            {'    CAFE PALMER\n'}
            <span className="d">{'-'.repeat(24)}</span>{'\n'}
            {ITEMS.map(([n, p]) => n.padEnd(14, '.') + won(p).padStart(10) + '\n')}
            <span className="d">{'-'.repeat(24)}</span>{'\n'}
            {'TOTAL'.padEnd(14) + won(total).padStart(10)}{'\n'}
            <span className="d">{text}</span>
          </pre>
        )}
      knobs={<>
        <Knob label="글꼴"><Seg value={face} onChange={setFace} options={[['mono', '고정폭'], ['prop', '비례폭 (기본)']]} /></Knob>
        <Knob label="장면"><Seg value={scene} onChange={setScene} options={[['term', '터미널'], ['receipt', '영수증']]} /></Knob>
      </>}
      say={['모노스페이스 타이포, 고정폭 글꼴, 터미널·코드 화면 느낌, 칸 맞춤 표, 기계로 찍은 영수증', 'monospace typography, fixed-width font, terminal and code aesthetic, tabular column alignment, printed receipt']}
      spec={[['글꼴', 'ui-monospace 계열'], ['숫자', 'tabular-nums'], ['정렬', '칸 단위']]}
      usage={[
        ['언제', '개발자 도구, 코드·로그 화면, 영수증·티켓, ‘기술적인’ 브랜드 분위기'],
        ['실무', '글꼴을 따로 받지 않아도 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace 순서로 쓰면 기기마다 알맞은 고정폭 글꼴이 나와요. 숫자 표만 맞추려면 font-variant-numeric: tabular-nums 로도 충분해요.'],
        ['주의', '한글은 고정폭 글꼴에서도 영문 두 칸과 폭이 딱 맞지 않는 경우가 많아요. 칸을 맞출 열은 영문·숫자로 두고, 긴 본문은 비례폭으로 써요.'],
      ]}
    />
  )
}
