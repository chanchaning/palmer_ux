import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { Browser, R, Regions, Say, ViewSeg } from '../shared'
import { tourRegions, useLayoutCard } from '../hooks'

/* ---------- 01 히어로 ---------- */
type HeroV = 'center' | 'split'
const HERO_REG = [['nav', '내비게이션'], ['head', '큰 제목'], ['cta', '버튼'], ['media', '이미지']] as const
const HERO_SAY: Record<HeroV, string> = {
  center: '첫 화면은 히어로 섹션으로 만들어줘. 가운데 정렬로 큰 제목 한 줄, 설명 두 줄, 버튼 하나, 그 아래에 넓은 제품 이미지.',
  split: '첫 화면은 좌우로 나눈 히어로로 만들어줘. 왼쪽에 큰 제목·설명·버튼, 오른쪽에 제품 이미지. 모바일에선 글을 먼저, 이미지는 아래로.',
}

export function Hero() {
  const { view, setView, hl, setHl, frame } = useLayoutCard()
  const [v, setV] = useState<HeroV>('center')
  const [log, setLog] = useState<ReactNode>(<>모양과 화면 크기를 바꿔 보세요</>)
  const cta = useRef<HTMLElement>(null)

  const demo = useDemo({
    reset() { setView('desk'); setV('center'); setHl(null); setLog(<>모양과 화면 크기를 바꿔 보세요</>) },
    async play(c) {
      await tourRegions(c, ['head', 'cta', 'media'], setHl)
      setV('split'); setLog(<><b>좌우 분할</b> 히어로 · 글 왼쪽, 이미지 오른쪽</>); await c.sleep(1200)
      setView('mob'); setLog(<>모바일에선 <b>글 → 이미지</b> 순서로 쌓여요</>); await c.sleep(1400)
      await c.press(frame.current, cta.current); await c.sleep(900)
      setView('desk')
    },
  })

  return (
    <Card id="pl-hero" num="01" title="히어로" en="Hero Section" demo={demo}
      desc="페이지 맨 위를 크게 차지하는 첫인상 구역이에요. 큰 제목 하나, 짧은 설명, 버튼 하나로 ‘여기가 뭐 하는 곳인지’ 알려줘요.">
      <Stage log={log}>
        <div className="pl-ctrl">
          <ViewSeg view={view} set={setView} />
          <Seg value={v} onChange={x => { setV(x); setLog(x === 'center' ? <><b>가운데 정렬</b> · 시선이 한가운데로 모여요</> : <><b>좌우 분할</b> · 글 왼쪽, 이미지 오른쪽</>) }}
            options={[['center', '가운데'], ['split', '좌우']]} />
        </div>
        <Browser view={view} url="haru-english.app" hl={hl} ref={frame}>
          <R k="nav" className="pl-nav"><b>하루영어</b><span className="pl-links"><i /><i /><i /></span><span className="pl-burger" /></R>
          <section className={'pl-hero ' + v}>
            <div className="pl-hero-txt">
              <R k="head" className="pl-h1">하루 10분, 영어가 습관이 돼요</R>
              <div className="pl-p"><i /><i style={{ width: '70%' }} /></div>
              <R k="cta" className="pl-cta" ref={cta} onClick={() => setLog(<>히어로의 주인공은 <b>이 버튼 하나</b>예요</>)}>무료로 시작하기</R>
            </div>
            <R k="media" className="pl-media g2" />
          </section>
          <div className="pl-below"><i /><i /><i /></div>
        </Browser>
        <Regions items={HERO_REG} hl={hl} set={setHl} />
      </Stage>
      <Say text={HERO_SAY[v]} />
      <Info
        spec={[['구성', '제목 · 설명 · 버튼 · 이미지'], ['높이', '첫 화면의 60~100%'], ['버튼', '1개 (많아야 2개)']]}
        usage={[
          ['언제', '랜딩 페이지나 서비스 첫 화면처럼 ‘이게 뭔지’를 3초 안에 알려야 할 때'],
          ['주의', '슬라이드 여러 장, 버튼 여러 개를 넣으면 어디를 봐야 할지 몰라요. 한 문장, 한 버튼이면 충분해요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 Z패턴 ---------- */
const Z_REG = [['logo', '① 로고'], ['login', '② 로그인'], ['perks', '③ 장점'], ['go', '④ 시작 버튼']] as const
const Z_KEYS = ['logo', 'login', 'perks', 'go'] as const

export function ZPattern() {
  const { view, setView, hl, setHl, frame } = useLayoutCard()
  const [run, setRun] = useState(0)
  const [pts, setPts] = useState<string>('')
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [log, setLog] = useState<ReactNode>(<>‘시선 따라가기’를 눌러 보세요</>)
  const wrap = useRef<HTMLDivElement>(null)
  const els = useRef<Record<string, HTMLElement | null>>({})
  const go = useRef<HTMLButtonElement>(null)

  /** 네 지점의 가운데를 이어 선을 그려요 */
  const measure = useCallback(() => {
    const w = wrap.current
    if (!w) return
    const box = w.getBoundingClientRect()
    setSize({ w: box.width, h: box.height })
    setPts(Z_KEYS.map(k => {
      const r = els.current[k]?.getBoundingClientRect()
      return r ? `${r.left - box.left + r.width / 2},${r.top - box.top + r.height / 2}` : '0,0'
    }).join(' '))
  }, [])
  useLayoutEffect(() => {
    const w = wrap.current
    if (!w) return
    const ro = new ResizeObserver(measure)
    ro.observe(w)
    return () => ro.disconnect()
  }, [measure])
  useEffect(() => { if (run) measure() }, [run, view, measure])

  const follow = (v = view) => {
    setRun(r => r + 1)
    setLog(v === 'desk' ? <>왼쪽 위 → 오른쪽 위 → <b>대각선</b> → 오른쪽 아래 버튼</> : <>좁은 화면에선 Z가 펴져 <b>위에서 아래로</b> 읽어요</>)
  }

  const demo = useDemo({
    reset() { setView('desk'); setRun(0); setHl(null); setLog(<>‘시선 따라가기’를 눌러 보세요</>) },
    async play(c) {
      await c.sleep(300)
      await c.press(frame.current?.parentElement?.parentElement ?? null, go.current); await c.sleep(2400)
      await tourRegions(c, [...Z_KEYS], setHl, 500)
      setView('mob'); await c.sleep(700)
      follow('mob'); await c.sleep(2000)
      setView('desk')
    },
  })

  return (
    <Card id="pl-zpattern" num="08" title="Z패턴" en="Z-Pattern Layout" demo={demo}
      desc="눈이 왼쪽 위 → 오른쪽 위 → 대각선 → 오른쪽 아래로 Z를 그리며 움직인다는 데 맞춘 배치예요. 마지막 끝점에 가장 중요한 버튼을 둬요.">
      <Stage log={log}>
        <div className="pl-ctrl">
          <ViewSeg view={view} set={v => { setView(v); setRun(0) }} />
          <button type="button" className="btn sm" ref={go} onClick={() => follow()}>시선 따라가기</button>
        </div>
        <Browser view={view} url="plantly.kr" hl={hl} ref={frame}>
          <div className="pl-z" ref={wrap}>
            <div className="pl-z-top">
              <R k="logo" className="pl-z-logo" ref={el => { els.current.logo = el }}>🌱 플랜틀리</R>
              <R k="login" className="pl-z-login" ref={el => { els.current.login = el }}>로그인</R>
            </div>
            <div className="pl-z-mid">
              <div className="pl-h1">식물 돌보기, 알림 하나로 끝</div>
              <div className="pl-media g3" />
            </div>
            <div className="pl-z-bot">
              <R k="perks" className="pl-z-perks" ref={el => { els.current.perks = el }}><i>물 주기 알림</i><i>병충해 진단</i><i>성장 기록</i></R>
              <R k="go" className="pl-cta pl-z-go" ref={el => { els.current.go = el }}>지금 시작</R>
            </div>
            {run > 0 && pts && (
              <svg className="pl-z-path" key={run + view} width={size.w} height={size.h} aria-hidden="true">
                <polyline points={pts} pathLength={1} />
                {pts.split(' ').map((p, i) => {
                  const [x, y] = p.split(',').map(Number)
                  return <g key={i} style={{ animationDelay: `calc(${i * 380}ms * var(--slow))` }}><circle cx={x} cy={y} r={7} /><text x={x} y={y + 3.5}>{i + 1}</text></g>
                })}
              </svg>
            )}
          </div>
        </Browser>
        <Regions items={Z_REG} hl={hl} set={setHl} />
      </Stage>
      <Say text="Z패턴으로 배치해줘. 왼쪽 위 로고, 오른쪽 위 로그인, 가운데 큰 제목과 이미지가 대각선을 잇고, 왼쪽 아래 장점 3가지, 오른쪽 아래에 가장 눈에 띄는 시작 버튼." />
      <Info
        spec={[['시선', '① → ② → ③ → ④'], ['끝점', '오른쪽 아래 = 행동 버튼'], ['어울림', '글이 적은 랜딩']]}
        usage={[
          ['언제', '글이 적고 목적이 하나뿐인 랜딩·광고 페이지, 가입 유도 화면'],
          ['주의', '글이 많은 페이지에선 사람들이 F자로 훑어 내려가요. Z패턴은 요소가 적을 때만 통해요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 풀블리드 ---------- */
const BLEED_REG = [['col', '본문 폭'], ['photo', '사진'], ['band', '인용 띠']] as const

export function FullBleed() {
  const { view, setView, hl, setHl, frame } = useLayoutCard()
  const [bleed, setBleed] = useState(true)
  const [log, setLog] = useState<ReactNode>(<>글은 좁게, <b>사진과 띠만</b> 끝까지 꽉 차요</>)
  const sw = useRef<HTMLButtonElement>(null)
  const flip = () => {
    const on = !bleed
    setBleed(on)
    setLog(on ? <>사진과 띠가 <b>화면 끝에서 끝까지</b> · 글 폭은 그대로</> : <>모두 <b>본문 폭 안</b>에 갇혔어요 · 밋밋해졌죠?</>)
  }

  const demo = useDemo({
    reset() { setView('desk'); setBleed(true); setHl(null); setLog(<>글은 좁게, <b>사진과 띠만</b> 끝까지 꽉 차요</>) },
    async play(c) {
      await tourRegions(c, ['col', 'photo', 'band'], setHl)
      await c.press(frame.current?.parentElement?.parentElement ?? null, sw.current); await c.sleep(1300)
      await c.press(frame.current?.parentElement?.parentElement ?? null, sw.current); await c.sleep(1100)
      setView('mob'); await c.sleep(1400)
      setView('desk')
    },
  })

  return (
    <Card id="pl-fullbleed" num="09" title="풀블리드" en="Full Bleed" demo={demo}
      desc="글은 읽기 좋은 좁은 폭에 두고, 사진이나 색 띠만 여백을 무시하고 화면 끝까지 꽉 채우는 배치예요. 인쇄에서 ‘잘리는 곳까지 칠한다’는 말에서 왔어요.">
      <Stage log={log}>
        <div className="pl-ctrl">
          <ViewSeg view={view} set={setView} />
          <label className="pl-sw"><span>풀블리드</span>
            <button type="button" className="switch" role="switch" aria-checked={bleed} aria-label="풀블리드" ref={sw} onClick={flip} /></label>
        </div>
        <Browser view={view} url="slowtrip.blog/jeju" hl={hl} ref={frame}>
          <div className={'pl-bleed' + (bleed ? ' on' : '')}>
            <R k="col" className="pl-col">
              <div className="pl-h1">제주에서 보낸 느린 일주일</div>
              <div className="pl-p"><i /><i /><i style={{ width: '60%' }} /></div>
            </R>
            <R k="photo" className="pl-wide pl-photo g2" />
            <div className="pl-col"><div className="pl-p"><i /><i /><i style={{ width: '80%' }} /></div></div>
            <R k="band" className="pl-wide pl-band">“바다는 매일 다른 색이었어요.”</R>
            <div className="pl-col"><div className="pl-p"><i /><i style={{ width: '50%' }} /></div></div>
          </div>
        </Browser>
        <Regions items={BLEED_REG} hl={hl} set={setHl} />
      </Stage>
      <Say text="본문은 가운데 좁은 폭(최대 680px)으로 두고, 대표 사진과 인용 띠만 화면 끝에서 끝까지 꽉 차게 풀블리드로 만들어줘." />
      <Info
        spec={[['본문 폭', '600~720px'], ['꽉 채우는 것', '사진 · 색 띠 · 지도'], ['횟수', '한 페이지에 1~3번']]}
        usage={[
          ['언제', '긴 글 중간에 분위기를 바꾸는 큰 사진, 섹션을 나누는 색 띠가 필요할 때'],
          ['주의', '글까지 꽉 채우면 한 줄이 너무 길어져 읽기 힘들어요. 넓히는 건 사진과 배경만이에요'],
        ]}
      />
    </Card>
  )
}
