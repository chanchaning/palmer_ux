import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { Browser, R, Regions, Say, ViewSeg } from '../shared'
import { tourRegions, useLayoutCard } from '../hooks'

/* ---------- 02 벤토 그리드 ---------- */
const FEATS = [['AI 요약', '✦'], ['실시간 공유', '⇄'], ['오프라인', '◐'], ['태그 정리', '#']] as const
const BENTO_REG = [['big', '큰 칸 2×2'], ['wide', '넓은 칸 2×1'], ['small', '작은 칸 1×1']] as const

export function Bento() {
  const { view, setView, hl, setHl, frame } = useLayoutCard()
  const [main, setMain] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>칸을 누르면 그 기능이 <b>큰 칸</b>으로 와요</>)
  const order = [main, ...FEATS.map((_, i) => i).filter(i => i !== main)]
  const pick = (i: number) => { setMain(i); setLog(<><b>{FEATS[i][0]}</b>이(가) 대표 기능 · 큰 칸 = 가장 중요한 것</>) }
  const tiles = useRef<(HTMLElement | null)[]>([])

  const demo = useDemo({
    reset() { setView('desk'); setMain(0); setHl(null); setLog(<>칸을 누르면 그 기능이 <b>큰 칸</b>으로 와요</>) },
    async play(c) {
      await tourRegions(c, ['big', 'wide', 'small'], setHl)
      await c.press(frame.current, tiles.current[2]); await c.sleep(1300)
      setView('mob'); setLog(<>모바일에선 <b>2열</b>로 접혀요 · 큰 칸은 여전히 맨 위</>); await c.sleep(1500)
      setView('desk'); await c.sleep(400)
      pick(0)
    },
  })

  return (
    <Card id="pl-bento" num="02" title="벤토 그리드" en="Bento Grid" demo={demo}
      desc="도시락 칸처럼 크기가 다른 칸을 빈틈없이 끼워 맞추는 배치예요. 가이드 04의 벤토가 ‘보이는 스타일’이라면, 여기는 ‘칸을 나누는 구조’예요.">
      <Stage log={log}>
        <div className="pl-ctrl"><ViewSeg view={view} set={setView} /></div>
        <Browser view={view} url="memoring.app/features" hl={hl} ref={frame}>
          <div className="pl-title">메모링이 잘하는 것</div>
          <div className="pl-bento">
            {order.map((fi, pos) => {
              const role = pos === 0 ? 'big' : pos === 1 ? 'wide' : 'small'
              return (
                <R key={FEATS[fi][0]} k={role} className={'pl-tile ' + role} onClick={() => pick(fi)} label={`${FEATS[fi][0]}을(를) 큰 칸으로`}
                  ref={el => { tiles.current[pos] = el }}>
                  <i aria-hidden="true">{FEATS[fi][1]}</i><b>{FEATS[fi][0]}</b>
                </R>
              )
            })}
          </div>
        </Browser>
        <Regions items={BENTO_REG} hl={hl} set={setHl} />
      </Stage>
      <Say text={`기능 소개는 벤토 그리드로 만들어줘. 4열 격자에 대표 기능(${FEATS[main][0]})은 2×2 큰 칸, 두 번째 기능은 2×1 넓은 칸, 나머지 둘은 1×1 작은 칸으로 빈틈없이 채우고, 칸 사이 간격은 모두 같게. 모바일에선 2열로.`} />
      <Info
        spec={[['격자', '4열 · 칸 크기 2~3종'], ['큰 칸', '1개 (대표)'], ['간격', '모든 칸 같게']]}
        usage={[
          ['언제', '기능이나 특징 여러 개를 한 화면에 모아 보여주는데, 중요도가 서로 다를 때'],
          ['주의', '칸 크기를 중요도와 맞추지 않으면 그냥 어수선한 모자이크가 돼요. 큰 칸은 하나만 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 카드 그리드 ---------- */
const GOODS = [['리넨 셔츠', '39,000', 'g2'], ['캔버스 백', '24,000', 'g1'], ['머그컵', '12,000', 'g3'], ['울 비니', '18,000', 'g4'], ['데님 캡', '21,000', 'g2'], ['양말 세트', '9,000', 'g3'], ['우산', '15,000', 'g1'], ['손수건', '7,000', 'g4']] as const
const CG_REG = [['card', '카드 한 장'], ['img', '이미지'], ['gap', '간격']] as const

export function CardGrid() {
  const { view, setView, hl, setHl, frame } = useLayoutCard()
  const [cols, setCols] = useState(3)
  const [n, setN] = useState(6)
  const [log, setLog] = useState<ReactNode>(<>열 수를 바꾸거나 <b>카드를 더해</b> 보세요</>)
  const addBtn = useRef<HTMLButtonElement>(null)
  const add = () => {
    const next = n >= GOODS.length ? 3 : n + 1
    setN(next)
    setLog(next > n ? <>{next}번째 카드 · 자리가 모자라면 <b>다음 줄로</b> 흘러요</> : <>카드를 <b>3장</b>으로 되돌렸어요</>)
  }

  const demo = useDemo({
    reset() { setView('desk'); setCols(3); setN(6); setHl(null); setLog(<>열 수를 바꾸거나 <b>카드를 더해</b> 보세요</>) },
    async play(c) {
      await tourRegions(c, ['card', 'img'], setHl)
      setCols(4); setLog(<><b>4열</b> · 한 줄에 더 많이, 카드는 작게</>); await c.sleep(1100)
      await c.press(frame.current?.parentElement?.parentElement ?? null, addBtn.current); await c.sleep(1100)
      setView('mob'); setLog(<>모바일에선 <b>1열</b>로 한 장씩 내려와요</>); await c.sleep(1500)
      setView('desk'); setCols(3)
    },
  })

  return (
    <Card id="pl-cardgrid" num="04" title="카드 그리드" en="Card Grid" demo={demo}
      desc="같은 모양의 카드를 바둑판처럼 같은 간격으로 줄 세우는 배치예요. 칸이 모자라면 다음 줄로 자연스럽게 흘러요.">
      <Stage log={log}>
        <div className="pl-ctrl">
          <ViewSeg view={view} set={setView} />
          <Seg value={cols} onChange={v => { setCols(v); setLog(<><b>{v}열</b> 카드 그리드 {view === 'mob' ? '· 모바일에선 1열 그대로' : ''}</>) }} options={[[2, '2열'], [3, '3열'], [4, '4열']]} />
          <button type="button" className="btn ghost sm" ref={addBtn} onClick={add} aria-label="카드 더하기">+ 카드</button>
        </div>
        <Browser view={view} url="moa-goods.shop" hl={hl} ref={frame}>
          <div className="pl-title">새로 들어온 물건</div>
          <R k="gap" group className="pl-cgrid" style={{ ['--cols' as string]: cols }}>
            {GOODS.slice(0, n).map(([name, price, g], i) => (
              <R k={i === 0 ? 'card' : 'card-x'} group={i === 0} key={name} className="pl-gcard">
                <R k={i === 0 ? 'img' : 'img-x'} className={'pl-gimg ' + g} />
                <b>{name}</b><span>{price}원</span>
              </R>
            ))}
          </R>
        </Browser>
        <Regions items={CG_REG} hl={hl} set={setHl} />
      </Stage>
      <Say text={`상품 목록은 ${cols}열 카드 그리드로 만들어줘. 카드마다 이미지·이름·가격을 같은 순서로 넣고, 카드 높이와 간격은 모두 같게. 모바일에선 1열로.`} />
      <Info
        spec={[['열', 'PC 3~4 · 모바일 1~2'], ['카드', '모양·높이 모두 같게'], ['간격', '16~24px 고르게']]}
        usage={[
          ['언제', '상품, 글, 프로젝트처럼 같은 종류가 여러 개일 때'],
          ['주의', '카드마다 구성이 다르면(어떤 건 버튼이 있고 어떤 건 없고) 격자가 들쭉날쭉해 보여요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 매거진 ---------- */
const STORIES = ['도시 정원이 늘고 있어요', '올여름 걷기 좋은 길 10곳', '집에서 하는 커피 실험', '새 버스 노선이 생겨요', '동네 작은 서점의 귀환', '주말 마라톤 완주기']
const G = ['g2', 'g1', 'g3', 'g4', 'g2', 'g3']
const MAG_REG = [['lead', '대표 기사'], ['mid', '중간 기사'], ['side', '짧은 기사 목록']] as const

export function Magazine() {
  const { view, setView, hl, setHl, frame } = useLayoutCard()
  const [order, setOrder] = useState([0, 1, 2, 3, 4, 5])
  const [log, setLog] = useState<ReactNode>(<>다른 기사를 누르면 <b>대표 기사</b>로 올라가요</>)
  const promote = (pos: number) => {
    if (pos === 0) { setLog(<>이미 <b>대표 기사</b>예요 · 가장 큰 사진과 제목</>); return }
    const o = [...order];[o[0], o[pos]] = [o[pos], o[0]]
    setOrder(o)
    setLog(<>‘{STORIES[o[0]]}’이(가) <b>대표 기사</b>로 · 크기가 곧 중요도</>)
  }
  const els = useRef<(HTMLElement | null)[]>([])

  const demo = useDemo({
    reset() { setView('desk'); setOrder([0, 1, 2, 3, 4, 5]); setHl(null); setLog(<>다른 기사를 누르면 <b>대표 기사</b>로 올라가요</>) },
    async play(c) {
      await tourRegions(c, ['lead', 'mid', 'side'], setHl)
      await c.press(frame.current, els.current[2]); await c.sleep(1300)
      setView('mob'); setLog(<>모바일에선 <b>대표 → 중간 → 목록</b> 순서로 쌓여요</>); await c.sleep(1500)
      setView('desk')
    },
  })

  const story = (pos: number, cls: string, k: string, withImg: boolean) => {
    const s = order[pos]
    return (
      <R k={k} key={s} className={'pl-story ' + cls} onClick={() => promote(pos)} ref={el => { els.current[pos] = el }}>
        {withImg && <span className={'pl-simg ' + G[s]} />}
        <b>{STORIES[s]}</b>
        {cls === 'lead' && <span className="pl-p"><i /><i style={{ width: '70%' }} /></span>}
      </R>
    )
  }

  return (
    <Card id="pl-magazine" num="06" title="매거진" en="Magazine Layout" demo={demo}
      desc="잡지 표지처럼 크기가 다른 기사를 섞어 두는 배치예요. 가장 큰 사진과 제목이 ‘오늘의 이야기’, 작아질수록 덜 중요한 소식이에요.">
      <Stage log={log}>
        <div className="pl-ctrl"><ViewSeg view={view} set={setView} /></div>
        <Browser view={view} url="weekly-town.news" hl={hl} ref={frame}>
          <div className="pl-masthead">WEEKLY TOWN</div>
          <div className="pl-mag">
            {story(0, 'lead', 'lead', true)}
            <div className="pl-mag-mid">{story(1, 'mid', 'mid', true)}{story(2, 'mid', 'mid', true)}</div>
            <div className="pl-mag-side">
              <span className="pl-kicker">짧은 소식</span>
              {story(3, 'side', 'side', false)}{story(4, 'side', 'side', false)}{story(5, 'side', 'side', false)}
            </div>
          </div>
        </Browser>
        <Regions items={MAG_REG} hl={hl} set={setHl} />
      </Stage>
      <Say text="매거진 레이아웃으로 만들어줘. 맨 위에 큰 사진의 대표 기사 1개(2칸 폭), 그 아래 중간 기사 2개, 오른쪽 좁은 열에는 짧은 기사 제목 목록. 제목 크기를 3단계로 나눠 중요도를 보여줘." />
      <Info
        spec={[['열', '3열 (2 + 1)'], ['제목 크기', '3단계'], ['대표 기사', '1개']]}
        usage={[
          ['언제', '뉴스, 블로그 홈처럼 콘텐츠가 많고 중요도가 서로 다를 때'],
          ['주의', '모든 기사를 같은 크기로 두면 매거진이 아니라 그냥 카드 그리드예요. 크기 차이를 분명하게 두세요'],
        ]}
      />
    </Card>
  )
}
