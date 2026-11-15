import { useId, useState, type CSSProperties } from 'react'
import { useDemo } from '../../../components/Card'
import { Range, Seg } from '../../../components/ui'
import { Knob, TypeCard } from '../shared'
import { reduced, safeId } from '../util'

const v = (o: Record<string, string | number>) => o as CSSProperties

/* ---------- 01 애시드 그래픽 ---------- */
type Metal = 'chrome' | 'holo'
export function Acid() {
  const fid = safeId(useId())
  const [text, setText] = useState('밤의 RAVE 2026')
  const [metal, setMetal] = useState<Metal>('chrome')
  const [warp, setWarp] = useState(14)
  const demo = useDemo({
    reset() { setMetal('chrome'); setWarp(0) },
    async play(c) {
      for (const w of [6, 14, 24, 32, 14]) { setWarp(w); await c.sleep(380) }
      setMetal('holo'); await c.sleep(1100); setMetal('chrome')
    },
  })
  return (
    <TypeCard id="tys-acid" num="01" title="애시드 그래픽" en="Acid Graphics" demo={demo}
      desc="크롬처럼 번쩍이는 금속 글자가 녹아내린 듯 휘어져요. 2000년대 레이브 포스터의 들뜬 기분이에요."
      log={<>{metal === 'chrome' ? '크롬' : '홀로그램'} · 왜곡 <b>{warp}</b>{warp >= 28 ? ' · 이쯤 되면 글자보다 그림이에요' : warp === 0 ? ' · 휘지 않으면 그냥 금속 글자예요' : ''}</>}
      text={text} onText={setText} view="tys-acid-v"
      preview={
        <>
          <svg className="tys-defs" aria-hidden="true" focusable="false">
            <filter id={fid} x="-10%" y="-30%" width="120%" height="160%">
              <feTurbulence type="turbulence" baseFrequency="0.011 0.045" numOctaves="2" seed="4" />
              <feDisplacementMap in="SourceGraphic" scale={warp} />
            </filter>
          </svg>
          <span className="tys-acid-star" aria-hidden="true">✦</span>
          <span className={'tys-acid ' + metal} style={{ filter: warp ? `url(#${fid})` : undefined }}>{text || '\u00a0'}</span>
          <span className="tys-acid-star r" aria-hidden="true">✦</span>
        </>
      }
      knobs={<>
        <Knob label="재질"><Seg value={metal} onChange={setMetal} options={[['chrome', '크롬'], ['holo', '홀로그램']]} /></Knob>
        <Knob label="왜곡" wide><Range value={warp} min={0} max={40} onChange={setWarp} label="왜곡 정도" /></Knob>
      </>}
      say={['애시드 그래픽, 크롬·리퀴드 메탈 글자, 녹아 휘어진 형태, 검은 바탕, Y2K 레이브 포스터', 'acid graphics, chrome liquid-metal type, warped and melted letterforms, black background, Y2K rave poster']}
      spec={[['재질', '금속 그라디언트'], ['형태', '휨·늘림'], ['바탕', '검정 + 형광']]}
      usage={[
        ['언제', '음악·패션·클럽 행사 포스터, 굿즈, 앨범 커버처럼 ‘튀어야 하는’ 한 장짜리 그래픽'],
        ['차이', '04 디자인 스타일의 Y2K는 버튼·창 같은 화면 전체의 옷이고, 애시드는 글자 자체를 금속 덩어리처럼 다루는 그래픽 스타일이에요.'],
        ['주의', '많이 휠수록 읽기 어려워요. 날짜·장소 같은 정보는 꼭 평범한 글자로 따로 적어요.'],
      ]}
    />
  )
}

/* ---------- 02 글리치 ---------- */
type Jit = 'still' | 'jitter'
export function Glitch() {
  const [text, setText] = useState('신호 ERROR 404')
  const [shift, setShift] = useState(3)
  const [jit, setJit] = useState<Jit>('jitter')
  const calm = reduced()
  const demo = useDemo({
    reset() { setShift(0); setJit('still') },
    async play(c) {
      for (const s of [1, 2, 4, 6]) { setShift(s); await c.sleep(350) }
      setJit('jitter'); await c.sleep(1400); setShift(3)
    },
  })
  return (
    <TypeCard id="tys-glitch" num="02" title="글리치" en="Glitch" demo={demo}
      desc="빨강·파랑 색이 어긋나고 글자가 순간순간 찢겨요. 신호가 고장 난 화면 같은 긴장감이에요."
      log={<>색 어긋남 <b>{shift}px</b>{jit === 'jitter' ? (calm ? ' · 동작 줄이기가 켜져 있어 멈춘 모습만 보여요' : ' · 찢김은 가끔, 짧게') : ' · 멈춰 있어도 글리치로 읽혀요'}</>}
      text={text} onText={setText} view="tys-glitch-v"
      preview={<span className={'tys-glitch' + (jit === 'jitter' ? ' on' : '')} data-text={text} style={v({ '--g': shift + 'px' })}>{text || '\u00a0'}</span>}
      knobs={<>
        <Knob label="어긋남" wide><Range value={shift} min={0} max={8} onChange={setShift} label="색 어긋남" /></Knob>
        <Knob label="움직임"><Seg value={jit} onChange={setJit} options={[['still', '멈춤'], ['jitter', '지글지글']]} /></Knob>
      </>}
      say={['글리치 타이포, RGB 색 분리, 가로로 찢긴 조각, 스캔라인, 디지털 노이즈', 'glitch typography, RGB split, chromatic aberration, sliced displacement, scanlines, digital noise']}
      spec={[['색 분리', '2–4px'], ['찢김', '가끔 0.1–0.2초'], ['색', '빨강 + 청록']]}
      usage={[
        ['언제', '게임·보안·테크 행사, 오류 페이지(404)처럼 ‘고장·해킹·미래’ 느낌이 필요한 제목'],
        ['실무', '색 조각은 ::before·::after에 같은 글자를 겹쳐 만들고, 화면 낭독기는 원래 글자 하나만 읽게 둬요.'],
        ['주의', '계속 번쩍이면 어지럼을 줄 수 있어요. 1초에 3번 넘게 깜빡이지 않게 하고, 동작 줄이기가 켜져 있으면 멈춰요.'],
      ]}
    />
  )
}

/* ---------- 03 인플레이트 3D ---------- */
type Candy = 'candy' | 'mint' | 'lemon'
export function Puffy() {
  const [text, setText] = useState('말랑 POP!')
  const [depth, setDepth] = useState(6)
  const [tone, setTone] = useState<Candy>('candy')
  const shadow = Array.from({ length: depth }, (_, i) => `0 ${i + 1}px 0 var(--ps)`).concat(`0 ${depth + 6}px 14px var(--tys-drop)`).join(', ')
  const demo = useDemo({
    reset() { setDepth(0); setTone('candy') },
    async play(c) {
      for (const d of [2, 4, 6, 8, 10]) { setDepth(d); await c.sleep(260) }
      await c.sleep(500); setTone('mint'); await c.sleep(900); setTone('lemon'); await c.sleep(900); setTone('candy'); setDepth(6)
    },
  })
  return (
    <TypeCard id="tys-puffy" num="03" title="인플레이트 3D" en="Inflated 3D · Puffy Type" demo={demo}
      desc="풍선에 바람을 넣은 듯 통통하게 부푼 글자예요. 반들반들한 광택과 두께가 귀엽고 말랑해 보여요."
      log={<>두께 <b>{depth}층</b>{depth === 0 ? ' · 두께가 없으면 그냥 색 글자예요' : depth >= 9 ? ' · 너무 두꺼우면 작은 글자에서 뭉개져요' : ' · 위 광택 + 아래 두께로 부풀어 보여요'}</>}
      text={text} onText={setText} view="tys-puffy-v"
      preview={
        <span className={'tys-puffy c-' + tone} data-text={text}>
          <span className="tys-puffy-back" aria-hidden="true" style={{ textShadow: shadow }}>{text || '\u00a0'}</span>
          <span className="tys-puffy-body">{text || '\u00a0'}</span>
          <span className="tys-puffy-gloss" aria-hidden="true">{text || '\u00a0'}</span>
        </span>
      }
      knobs={<>
        <Knob label="두께" wide><Range value={depth} min={0} max={10} onChange={setDepth} label="부푼 두께" /></Knob>
        <Knob label="색"><Seg value={tone} onChange={setTone} options={[['candy', '딸기'], ['mint', '민트'], ['lemon', '레몬']]} /></Knob>
      </>}
      say={['인플레이트 3D 글자, 풍선처럼 부푼 버블 레터, 반들반들한 광택, 사탕 같은 파스텔색', 'inflated 3D type, puffy bubble letters, glossy highlight, soft depth, candy pastel colors']}
      spec={[['굵기', '가장 굵게'], ['층', '위 광택 · 몸 · 아래 두께'], ['모서리', '둥글게']]}
      usage={[
        ['언제', '어린이·간식·캐릭터 브랜드, 이벤트 배너, 앱 아이콘 옆 짧은 제목'],
        ['실무', '진짜 부푼 느낌은 3D 툴이나 둥근 글꼴이 있어야 또렷해요. 웹에선 그림자 여러 겹과 광택 레이어로 흉내 내요.'],
        ['주의', '긴 문장에는 못 써요. 두세 단어까지만, 그리고 배경과 몸 색의 대비를 꼭 확인해요.'],
      ]}
    />
  )
}

/* ---------- 06 아웃라인 ---------- */
type Fill = 'hollow' | 'mix' | 'echo'
export function Outline() {
  const [text, setText] = useState('윤곽 OUTLINE')
  const [fill, setFill] = useState<Fill>('mix')
  const [w, setW] = useState(2)
  const words = (text || '\u00a0').split(' ')
  const demo = useDemo({
    reset() { setFill('hollow'); setW(2) },
    async play(c) {
      await c.sleep(700); setFill('mix'); await c.sleep(1000); setFill('echo'); await c.sleep(1100)
      for (const x of [1, 3, 2]) { setW(x); await c.sleep(450) }
      setFill('mix')
    },
  })
  return (
    <TypeCard id="tys-outline" num="06" title="아웃라인" en="Outline Type" demo={demo}
      desc="글자 속을 비우고 테두리만 남겨요. 꽉 찬 글자와 섞으면 리듬이 생기고, 겹쳐 쓰면 울림이 생겨요."
      log={<>선 <b>{w}px</b> · {fill === 'hollow' ? '속이 비면 가볍고 세련돼 보여요' : fill === 'mix' ? '찬 글자 · 빈 글자를 번갈아 강약을 줘요' : '같은 줄을 빈 글자로 반복해 메아리처럼'}{w === 1 ? ' · 1px은 작은 화면에서 흐려져요' : ''}</>}
      text={text} onText={setText} view="tys-outline-v"
      preview={
        <span className={'tys-outline f-' + fill} style={v({ '--w': w + 'px' })}>
          {fill === 'echo'
            ? [0, 1, 2].map(k => <span key={k} className={'tys-ol-line' + (k ? ' ghost' : '')} aria-hidden={k > 0}>{text || '\u00a0'}</span>)
            : words.map((wd, k) => <span key={k} className={fill === 'mix' && k % 2 === 0 ? 'solid' : 'hollow'}>{wd}{k < words.length - 1 ? ' ' : ''}</span>)}
        </span>
      }
      knobs={<>
        <Knob label="채움"><Seg value={fill} onChange={setFill} options={[['hollow', '속 비움'], ['mix', '섞기'], ['echo', '겹쳐 반복']]} /></Knob>
        <Knob label="선 굵기" wide><Range value={w} min={1} max={4} onChange={setW} label="테두리 굵기" /></Knob>
      </>}
      say={['아웃라인 타이포, 속 빈 윤곽선 글자, 꽉 찬 글자와 섞기, 같은 줄 반복', 'outline typography, hollow stroke-only letters, mixed solid and outline, repeated echo lines']}
      spec={[['굵기', '700–900'], ['선', '1.5–3px'], ['크기', '40px 이상']]}
      usage={[
        ['언제', '포스터 큰 제목, 스포츠·패션 브랜드, 배경 위에 겹치는 장식 글자'],
        ['실무', '-webkit-text-stroke로 테두리를 그리고 color: transparent 로 속을 비워요. 지원하지 않는 곳을 위해 기본 색 글자를 먼저 써 둬요.'],
        ['주의', '가는 글자에 테두리만 남기면 거의 안 보여요. 굵은 글자 + 큰 크기에서만 쓰고, 본문에는 쓰지 않아요.'],
      ]}
    />
  )
}

/* ---------- 10 네온 ---------- */
type Neon = 'pink' | 'sky' | 'lime'
type Flick = 'off' | 'on'
export function NeonSign() {
  const [text, setText] = useState('심야 OPEN 24')
  const [tone, setTone] = useState<Neon>('pink')
  const [glow, setGlow] = useState(16)
  const [flick, setFlick] = useState<Flick>('off')
  const calm = reduced()
  const demo = useDemo({
    reset() { setGlow(0); setTone('pink'); setFlick('off') },
    async play(c) {
      for (const g of [4, 8, 12, 16, 20]) { setGlow(g); await c.sleep(260) }
      await c.sleep(400); setTone('sky'); await c.sleep(900); setTone('lime'); await c.sleep(900); setTone('pink'); setGlow(16)
    },
  })
  return (
    <TypeCard id="tys-neon" num="10" title="네온사인" en="Neon Sign" demo={demo}
      desc="어두운 벽에 유리관 불빛이 번져요. 가는 선 하나와 빛 번짐만으로 밤거리 간판 느낌이 나요."
      log={<>빛 번짐 <b>{glow}px</b>{glow === 0 ? ' · 번짐이 없으면 그냥 형광색 글자예요' : glow >= 26 ? ' · 너무 번지면 글자 모양이 흐려져요' : ''}{flick === 'on' && calm ? ' · 동작 줄이기가 켜져 있어 깜빡이지 않아요' : ''}</>}
      text={text} onText={setText} view="tys-neon-v"
      preview={<span className={'tys-neon n-' + tone + (flick === 'on' ? ' flick' : '')} style={v({ '--glow': glow + 'px' })}>{text || '\u00a0'}</span>}
      knobs={<>
        <Knob label="색"><Seg value={tone} onChange={setTone} options={[['pink', '분홍'], ['sky', '하늘'], ['lime', '라임']]} /></Knob>
        <Knob label="깜빡임"><Seg value={flick} onChange={setFlick} options={[['off', '켜 둠'], ['on', '가끔 깜빡']]} /></Knob>
        <Knob label="빛 번짐" wide><Range value={glow} min={0} max={30} onChange={setGlow} label="빛 번짐" /></Knob>
      </>}
      say={['네온사인 글자, 어두운 벽돌 벽, 유리관 불빛, 은은한 빛 번짐, 심야 간판', 'neon sign typography, glowing glass tube, soft bloom, dark brick wall, late-night signage']}
      spec={[['굵기', '가늘게 200–400'], ['번짐', '그림자 3–4겹'], ['바탕', '아주 어둡게']]}
      usage={[
        ['언제', '야간 행사, 바·공연 포스터, 다크 모드 랜딩의 큰 제목 한 줄'],
        ['실무', '흰색에 가까운 가운데 선 + 같은 색 그림자 여러 겹(text-shadow)이면 유리관처럼 보여요. 밝은 바탕에서는 빛이 안 보여요.'],
        ['주의', '깜빡임은 몇 초에 한 번, 아주 짧게만. 동작 줄이기가 켜져 있으면 켜 둔 상태로 보여줘요.'],
      ]}
    />
  )
}
