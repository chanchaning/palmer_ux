import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { fv } from '../shared'

/* ---------- 07 평점 요약 ---------- */
const COUNTS: Record<number, number> = { 5: 867, 4: 217, 3: 72, 2: 24, 1: 24 }
const TOTAL = 1204
const REVIEWS: [number, string][] = [
  [5, '배송 빠르고 포장도 꼼꼼했어요'], [4, '색은 좋은데 살짝 커요'], [5, '재구매 의사 100%예요'], [2, '두 번 빨았더니 보풀이 생겼어요'],
  [3, '가격 생각하면 무난해요'], [5, '선물했는데 반응 최고였어요'], [1, '사이즈 교환이 너무 느려요'], [4, '두께감이 딱 좋아요'], [3, '사진보다 색이 조금 어두워요'],
]
const SUM_LOG = <>막대를 눌러 <b>점수별 리뷰</b>를 걸러 보세요</>

export function Summary() {
  const [sel, setSel] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(SUM_LOG)
  const box = useRef<HTMLDivElement>(null)
  const dist = useRef<HTMLDivElement>(null)
  const bar = (i: number) => (dist.current?.children[i] as HTMLElement | undefined) ?? null

  const pick = (s: number) => {
    const next = sel === s ? null : s
    setSel(next)
    setLog(next === null ? <>필터 해제 → <b>전체 리뷰</b></> : <><b>{s}점 막대</b>를 눌러 {COUNTS[s].toLocaleString()}개만 보기 · 다시 누르면 해제</>)
  }
  const demo = useDemo({
    reset() { setSel(null); setLog(SUM_LOG) },
    async play(c) {
      await c.press(box.current, bar(3)); await c.sleep(1400)
      await c.press(box.current, bar(0)); await c.sleep(1300)
      await c.press(box.current, bar(0)); await c.sleep(700)
    },
  })

  const rows = (sel === null ? REVIEWS : REVIEWS.filter(r => r[0] === sel)).slice(0, 3)
  return (
    <Card id="rating-summary" num="07" title="평점 요약" en="Rating Summary" demo={demo}
      desc="평균 점수와 5→1점 분포 막대를 함께 보여줘요. 막대를 누르면 그 점수 리뷰만 걸러져요.">
      <Stage log={log} logId="rating-summary-log">
        <div className="box rt-box left" ref={box} style={{ gap: 10 }}>
          <div className="rt-sum">
            <div className="rt-avg">
              <div className="rt-big">4.6</div>
              <div className="rt-stars" aria-label="5점 만점에 4.6점">
                {[1, 1, 1, 1, 0.6].map((f, i) => <span key={i} className="rt-s" style={fv(f)} />)}
              </div>
              <span className="muted">리뷰 1,204개</span>
            </div>
            <div className={'rt-dist' + (sel !== null ? ' f' : '')} ref={dist}>
              {[5, 4, 3, 2, 1].map(s => {
                const p = Math.round((COUNTS[s] / TOTAL) * 100)
                return (
                  <button key={s} className="rt-bar" aria-pressed={sel === s} aria-label={s + '점 리뷰 ' + COUNTS[s] + '개만 보기'} onClick={() => pick(s)}>
                    <span>{s}★</span><span className="tr"><i style={{ width: p + '%' }} /></span><span className="pc">{p}%</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="rt-rhead">
            <span>{sel === null ? '최신 리뷰' : sel + '점 리뷰 ' + COUNTS[sel].toLocaleString() + '개'}</span>
            <button hidden={sel === null} onClick={() => { setSel(null); setLog(<>필터 해제 → <b>전체 리뷰</b></>) }}>전체 보기</button>
          </div>
          <div className="rt-rlist">
            {rows.map((r, i) => <div className="rt-ri" key={String(sel) + '-' + i}><span className="sc">★{r[0]}</span><span>{r[1]}</span></div>)}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['평균', '소수 첫째 자리'], ['분포', '5 → 1 순서'], ['막대', '= 필터']]}
        usage={[
          ['언제', '상품 상세·앱 스토어처럼 많은 평가를 한눈에 요약해야 할 때'],
          ['주의', '평균만 보이면 극단값이 숨어요 — 분포와 리뷰 수를 꼭 함께 보여주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 평가 태그 ---------- */
type Kind = 'hi' | 'mid' | 'lo'
const SETS: Record<Kind, string[]> = {
  hi: ['맛있어요', '양이 넉넉해요', '포장이 꼼꼼해요', '배달이 빨라요', '재주문할게요'],
  mid: ['무난해요', '가격이 조금 비싸요', '양이 아쉬워요', '맛이 평범해요', '배달이 조금 늦어요'],
  lo: ['음식이 식었어요', '양이 적어요', '배달이 늦었어요', '포장이 샜어요', '주문과 달라요'],
}
const kindOf = (v: number): Kind => (v >= 4 ? 'hi' : v === 3 ? 'mid' : 'lo')
const QUESTION: Record<Kind, string> = { hi: '어떤 점이 좋았나요?', mid: '어떤 점이 아쉬웠나요?', lo: '어떤 문제가 있었나요?' }
const TONE: Record<Kind, string> = { hi: '칭찬', mid: '보통·아쉬움', lo: '불만' }
const TAGS_LOG = <>별점이 바뀌면 <b>태그 목록도 바뀌어요</b></>

export function Tags() {
  const [val, setVal] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const [gen, setGen] = useState(0)
  const [log, setLog] = useState<ReactNode>(TAGS_LOG)
  const box = useRef<HTMLDivElement>(null)
  const grp = useRef<HTMLDivElement>(null)
  const chipsEl = useRef<HTMLDivElement>(null)
  const star = (i: number) => (grp.current?.children[i] as HTMLElement | undefined) ?? null
  const chip = (i: number) => chipsEl.current?.querySelectorAll<HTMLElement>('.chip')[i] ?? null

  const logPick = (v: number, p: string[]) =>
    setLog(<><b>{v}점</b> · {p.length ? <>태그 {p.length}개: <b>{p.join(', ')}</b></> : '태그를 골라 이유를 남겨요'}</>)
  const setStar = (v: number) => {
    const changed = !val || kindOf(v) !== kindOf(val)
    setVal(v)
    if (changed) {
      const k = kindOf(v)
      setPicked([]); setGen(g => g + 1)
      setLog(<><b>{v}점</b> → {TONE[k]} 태그로 <b>교체</b></>)
    } else logPick(v, picked)
  }
  const toggle = (t: string) => {
    const on = !picked.includes(t)
    const next = SETS[kindOf(val)].filter(x => (x === t ? on : picked.includes(x)))
    setPicked(next)
    logPick(val, next)
  }
  const demo = useDemo({
    reset() { setVal(0); setPicked([]); setLog(TAGS_LOG) },
    async play(c) {
      await c.press(box.current, star(4)); await c.sleep(700)
      await c.press(box.current, chip(0)); await c.sleep(450)
      await c.press(box.current, chip(3)); await c.sleep(1000)
      await c.press(box.current, star(1)); await c.sleep(800)
      await c.press(box.current, chip(0)); await c.sleep(700)
    },
  })

  const k = val ? kindOf(val) : null
  return (
    <Card id="rating-tags" num="08" title="평가 태그" en="Rating Tags" demo={demo}
      desc="별점을 고르면 그 점수에 맞는 이유 태그가 나타나요. 글을 안 써도 ‘왜’를 알 수 있어요.">
      <Stage log={log} logId="rating-tags-log">
        <div className="box rt-box" ref={box}>
          <div className="rt-prod"><span className="rt-thumb g4" /><div><b>와플 하우스 · 크로플 세트</b><span>배달 완료 · 18:42</span></div></div>
          <div className="rt-stars sm" ref={grp} role="radiogroup" aria-label="음식 별점">
            {[1, 2, 3, 4, 5].map((v, i) => (
              <button key={v} className="rt-s" role="radio" aria-checked={v === val} aria-label={v + '점'} style={fv(i < val ? 1 : 0)} onClick={() => setStar(v)} />
            ))}
          </div>
          <p className="rt-q">{k ? QUESTION[k] : '먼저 별점을 골라 주세요'}</p>
          <div className={'chips rt-tags' + (k && k !== 'hi' ? ' neg' : '')} ref={chipsEl}>
            {k && SETS[k].map((t, i) => (
              <button key={gen + '-' + t} className="chip" aria-pressed={picked.includes(t)}
                style={{ animationDelay: `calc(${i * 40}ms * var(--slow))` }} onClick={() => toggle(t)}>{t}</button>
            ))}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['태그', '점수별 5개'], ['선택', '여러 개'], ['톤', '칭찬 / 아쉬움']]}
        usage={[
          ['언제', '배달·택시·숙소처럼 리뷰를 길게 쓰지 않는 서비스에서 이유를 모을 때'],
          ['주의', '1점에 ‘맛있어요’가 보이면 안 돼요 — 점수와 태그의 방향을 맞추세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 평점 배지 ---------- */
type BadgeKind = 'sm' | 'inl' | 'cnt'
const BADGE_OPTS: [BadgeKind, string][] = [['sm', '스몰'], ['inl', '인라인'], ['cnt', '개수 포함']]
const PLACES: [string, string, number, number, string][] = [
  ['와플 로스터리', '카페 · 성수동 · 도보 6분', 4.8, 1204, 'g1'],
  ['새벽 호수 베이커리', '베이커리 · 서울숲', 4.6, 312, 'g2'],
  ['여름 숲 키친', '브런치 · 뚝섬역', 5.0, 3, 'g3'],
]
const BADGE_DESC: Record<BadgeKind, ReactNode> = {
  sm: <><b>스몰</b> — 썸네일 위 모서리에 얹어 사진 그리드에서 써요</>,
  inl: <><b>인라인</b> — 부가 정보 줄에 섞어 공간을 아껴요</>,
  cnt: <><b>개수 포함</b> — 리뷰 3개의 5.0과 1,204개의 4.8을 구분해요</>,
}
const BADGE_LOG = <>위 세그먼트로 <b>배지 모양</b>을 바꿔 보세요</>

export function Badge() {
  const [idx, setIdx] = useState(0)
  const [log, setLog] = useState<ReactNode>(BADGE_DESC.sm)
  const box = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const segBtn = (i: number) => seg.current?.querySelectorAll<HTMLElement>('button')[i] ?? null

  const set = (i: number) => { setIdx(i); setLog(BADGE_DESC[BADGE_OPTS[i][0]]) }
  const demo = useDemo({
    reset() { setIdx(0); setLog(BADGE_LOG) },
    async play(c) {
      await c.press(box.current, segBtn(1)); await c.sleep(1300)
      await c.press(box.current, segBtn(2)); await c.sleep(1300)
      await c.press(box.current, segBtn(0)); await c.sleep(600)
    },
  })

  const v = BADGE_OPTS[idx][0]
  return (
    <Card id="rating-badge" num="09" title="평점 배지" en="Rating Badge" demo={demo}
      desc="목록 속에서 평점을 작게 압축해 보여주는 표시예요. 공간에 따라 모양을 골라요.">
      <Stage log={log} logId="rating-badge-log">
        <div className="box rt-box left" ref={box}>
          <div className="seg rt-bseg" ref={seg}>
            <span className="seg-thumb" style={{ transform: `translateX(${idx * 100}%)` }} />
            {BADGE_OPTS.map(([k, label], i) => <button key={k} aria-pressed={i === idx} onClick={() => set(i)}>{label}</button>)}
          </div>
          <div className="rt-list">
            {PLACES.map(([nm, sub, rate, cnt, g]) => {
              const r = rate.toFixed(1), n = cnt.toLocaleString(), aria = '평점 ' + r + '점, 리뷰 ' + n + '개'
              return (
                <div className="rt-item" key={nm + v}>
                  <span className={'rt-thumb ' + g}>
                    {v === 'sm' && <i className="rt-bdg sm" aria-label={aria}><span className="st">★</span>{r}</i>}
                  </span>
                  <div className="meta">
                    <div className="nm"><em>{nm}</em>{v === 'cnt' && <i className="rt-bdg cnt" aria-label={aria}><span className="st">★</span>{r} <small>({n})</small></i>}</div>
                    <div className="sub">{v === 'inl' && <><i className="rt-bdg inl" aria-label={aria}><span className="st">★</span> {r}</i> · </>}{sub}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['형식', '★4.8 (1,204)'], ['변형', '스몰 · 인라인 · 개수'], ['읽기', 'aria-label 풀어 쓰기']]}
        usage={[
          ['언제', '검색 결과·지도 목록·상품 그리드처럼 여러 항목을 빠르게 비교할 때'],
          ['주의', '리뷰 3개의 5.0과 1,204개의 4.8은 달라요 — 공간이 되면 개수를 붙이세요'],
        ]}
      />
    </Card>
  )
}
