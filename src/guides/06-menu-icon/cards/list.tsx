import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { EASE, useMotion } from '../../../lib/motion'
import { Hero, Icon, useOutside } from '../shared'

/** 툴바 버튼 아래에 붙는 메뉴 위치 */
function useDropPos(right: number) {
  const m = useMotion()
  const [pos, setPos] = useState<CSSProperties | undefined>(undefined)
  const place = (box: HTMLElement | null, btn: HTMLElement | null) => {
    if (!box || !btn) return
    const r = m.rel(box, btn)
    setPos({ top: r.top + r.height + 6, right })
  }
  return [pos, place] as const
}

/* ---------- 06 도너 (필터) ---------- */
const PRODUCTS: { n: string; c: string; sw: string; pr: string; so?: boolean }[] = [
  { n: '린넨 셔츠', c: '의류', sw: '#9bb7ff', pr: '39,000' },
  { n: '와이드 팬츠', c: '의류', sw: '#b4a7ff', pr: '45,000' },
  { n: '러닝화', c: '신발', sw: '#ffb38a', pr: '89,000', so: true },
  { n: '캔버스 스니커즈', c: '신발', sw: '#ffd166', pr: '59,000' },
  { n: '토트백', c: '가방', sw: '#7fd6b0', pr: '72,000' },
  { n: '미니 크로스백', c: '가방', sw: '#9ad1e8', pr: '54,000', so: true },
]
const CATS = ['의류', '신발', '가방']
const DN_INIT = [true, true, true, false]
const DN_LOG = <><b>필터</b>를 열고 체크를 바꿔 보세요 — 목록이 바로 줄어요</>

export function Doner() {
  const [open, setOpen] = useState(false)
  const [cbs, setCbs] = useState(DN_INIT)
  const [pos, place] = useDropPos(10)
  const [log, setLog] = useState<ReactNode>(DN_LOG)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const big = useRef<HTMLButtonElement>(null)

  const set = (on: boolean) => { if (on) place(box.current, btn.current); setOpen(on) }
  const cats = CATS.filter((_, i) => cbs[i]), noSold = cbs[3]
  const shown = PRODUCTS.map(p => cats.includes(p.c) && !(noSold && p.so))
  const n = shown.filter(Boolean).length
  const active = 3 - cats.length + (noSold ? 1 : 0)

  const toggle = (i: number) => {
    const next = cbs.map((v, j) => (j === i ? !v : v))
    setCbs(next)
    const c = CATS.filter((_, j) => next[j]), ns = next[3]
    const cnt = PRODUCTS.filter(p => c.includes(p.c) && !(ns && p.so)).length
    const act = 3 - c.length + (ns ? 1 : 0)
    setLog(act ? <>{c.length ? c.join('·') : '없음'}{ns ? ' · 품절 제외' : ''} → <b>{cnt}개</b> · 아이콘에 배지 {act}</> : <>필터 없음 · <b>전체 6개</b></>)
  }
  useOutside(open, () => [menu.current, btn.current, big.current], () => set(false))
  const demo = useDemo({
    reset() { set(false); setCbs(DN_INIT); setLog(DN_LOG) },
    async play(c) {
      const cb = (i: number) => menu.current?.querySelectorAll<HTMLElement>('input')[i] ?? null
      await c.press(box.current, btn.current); await c.sleep(900)
      await c.press(box.current, cb(1)); await c.sleep(900)
      await c.press(box.current, cb(3)); await c.sleep(1200)
      await c.press(box.current, btn.current); await c.sleep(400)
    },
  })

  return (
    <Card id="menu-icon-doner" num="06" title="도너" en="Döner" demo={demo}
      desc="길이가 점점 짧아지는 가로선. 목록을 걸러내는 필터 메뉴를 열어요.">
      <Stage log={log} logId="menu-icon-doner-log">
        <Hero k="doner" label="도너 아이콘 눌러보기" title="☰ 짧아지는 선 3개" sub="깔때기처럼 ‘좁혀 간다’는 뜻" hint="아래 상품 목록에서 열어보기 ↓" open={open} target={btn} bigRef={big} />
        <div className="box left mi-box" ref={box}>
          <div className="mi-tool">
            <b>상품 {n}개</b>
            <button ref={btn} className={'mi-btn lbl' + (open ? ' is-open' : '')} aria-expanded={open}
              onClick={() => { set(!open); if (!open) setLog(<><b>무엇만</b> 볼지 고르는 필터 메뉴</>) }}>
              <Icon k="doner" />필터<em className="mi-badge" hidden={!active}>{active}</em>
            </button>
          </div>
          <div className="mi-list">
            {PRODUCTS.map((p, i) => (
              <div key={p.n} className={'mi-item' + (shown[i] ? '' : ' out')}>
                <span className="sw" style={{ background: p.sw }} />
                <span className="nm">{p.n}<small>{p.c}</small>{p.so && <span className="so">품절</span>}</span>
                <span className="pr">{p.pr}</span>
              </div>
            ))}
            <div className="mi-empty" style={{ display: n ? 'none' : 'block' }}>조건에 맞는 상품이 없어요</div>
          </div>
          <div ref={menu} className={'mi-menu' + (open ? ' on' : '')} role="menu" style={pos}>
            <div className="mi-mt">카테고리</div>
            {CATS.map((c, i) => <label key={c} className="opt"><input type="checkbox" value={c} checked={cbs[i]} onChange={() => toggle(i)} /> {c}</label>)}
            <hr />
            <label className="opt"><input type="checkbox" value="soldout" checked={cbs[3]} onChange={() => toggle(3)} /> 품절 상품 빼기</label>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['모양', '짧아지는 가로선 3개'], ['여는 것', '필터 메뉴'], ['흔한 위치', '목록 위 툴바']]}
        usage={[
          ['언제', '카테고리·상태 같은 조건으로 긴 목록을 좁힐 때'],
          ['주의', '알아보는 사람이 적은 아이콘이에요. ‘필터’ 글자를 붙이고, 적용 중이면 개수 배지를 보여줘요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 계단 (정렬) ---------- */
type SortKey = 'pop' | 'date' | 'low' | 'high'
const BEANS = [
  { n: '예가체프', price: 18000, date: 3, pop: 1, sw: '#c08457' },
  { n: '수프리모', price: 14000, date: 10, pop: 2, sw: '#8d5a3b' },
  { n: '케냐 AA', price: 21000, date: 1, pop: 4, sw: '#a0522d' },
  { n: '안티구아', price: 16500, date: 6, pop: 3, sw: '#6f4e37' },
  { n: '산토스', price: 12000, date: 20, pop: 5, sw: '#d2a679' },
]
type Bean = typeof BEANS[number]
const CMP: Record<SortKey, (a: Bean, b: Bean) => number> = {
  pop: (a, b) => a.pop - b.pop, date: (a, b) => a.date - b.date,
  low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price,
}
const SORTS: [SortKey, string][] = [['pop', '추천순'], ['date', '최신순'], ['low', '낮은 가격순'], ['high', '높은 가격순']]
const ST_LOG = <>정렬을 바꾸면 <b>목록 순서</b>가 움직여요</>

export function Stair() {
  const m = useMotion()
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState<SortKey>('pop')
  // 처음엔 원본 HTML 순서 그대로 (정렬은 고른 뒤부터)
  const [order, setOrder] = useState<Bean[]>(BEANS)
  const [pos, place] = useDropPos(10)
  const [log, setLog] = useState<ReactNode>(ST_LOG)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const big = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const first = useRef<Map<string, number> | null>(null)
  const rows = () => [...(list.current?.querySelectorAll<HTMLElement>('.mi-item') ?? [])]

  const set = (on: boolean) => { if (on) place(box.current, btn.current); setOpen(on) }
  const sortBy = (k: SortKey, animate = true) => {
    first.current = animate ? new Map(rows().map(el => [el.dataset.n ?? '', el.getBoundingClientRect().top])) : null
    setKey(k)
    setOrder([...BEANS].sort(CMP[k]))
  }
  // FLIP: 순서가 바뀐 뒤 이전 위치에서 미끄러져 오기
  useLayoutEffect(() => {
    const f = first.current
    first.current = null
    if (!f) return
    rows().forEach(el => {
      const d = (f.get(el.dataset.n ?? '') ?? 0) - el.getBoundingClientRect().top
      if (d) m.A(el, [{ transform: `translateY(${d}px)` }, { transform: 'none' }], 380, EASE.std)
    })
  }, [order, m])
  useOutside(open, () => [menu.current, btn.current, big.current], () => set(false))
  const demo = useDemo({
    reset() { set(false); sortBy('pop', false); setLog(ST_LOG) },
    async play(c) {
      const opt = (i: number) => menu.current?.querySelectorAll<HTMLElement>('.chk')[i] ?? null
      await c.press(box.current, btn.current); await c.sleep(900)
      await c.press(box.current, opt(2)); await c.sleep(1400)
      await c.press(box.current, btn.current); await c.sleep(700)
      await c.press(box.current, opt(3)); await c.sleep(500)
    },
  })

  const name = SORTS.find(s => s[0] === key)![1]
  const flip = key === 'low'
  return (
    <Card id="menu-icon-stair" num="08" title="계단" en="Staircase" demo={demo}
      desc="계단처럼 한 칸씩 어긋난 선. 목록의 정렬 순서를 고르는 메뉴를 열어요.">
      <Stage log={log} logId="menu-icon-stair-log">
        <Hero k="stair" label="계단 아이콘 눌러보기" title="⋰ 어긋난 선 3개" sub="높낮이 = 순서를 떠올리게 해요" hint="아래 목록에서 열어보기 ↓" open={open} flip={flip} target={btn} bigRef={big} />
        <div className="box left mi-box" ref={box}>
          <div className="mi-tool">
            <b>원두<small>5개</small></b>
            <button ref={btn} className={'mi-btn lbl' + (open ? ' is-open' : '') + (flip ? ' mi-flip' : '')} aria-expanded={open}
              onClick={() => { set(!open); if (!open) setLog(<>같은 목록의 <b>순서만</b> 바꾸는 정렬 옵션</>) }}>
              <Icon k="stair" /><span>{name}</span>
            </button>
          </div>
          <div className="mi-list" ref={list}>
            {order.map(b => (
              <div key={b.n} className="mi-item" data-n={b.n}>
                <span className="sw" style={{ background: b.sw }} />
                <span className="nm">{b.n}<small>{b.date}일 전</small></span>
                <span className="pr">{b.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div ref={menu} className={'mi-menu' + (open ? ' on' : '')} role="menu" style={pos}>
            <div className="mi-mt">정렬</div>
            {SORTS.map(([k, label]) => (
              <button key={k} className="chk" aria-checked={key === k} onClick={() => {
                set(false); sortBy(k)
                setLog(<><b>{label}</b>으로 다시 줄 세웠어요{k === 'low' ? ' — 아이콘 계단도 뒤집혀요' : ''}</>)
              }}>{label}</button>
            ))}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['모양', '어긋난 가로선 3개'], ['여는 것', '정렬 옵션'], ['흔한 위치', '목록 위 오른쪽']]}
        usage={[
          ['언제', '최신순·가격순처럼 같은 목록의 순서만 바꿀 때'],
          ['주의', '아이콘만으론 지금 무슨 순서인지 몰라요. 현재 정렬 이름을 옆에 꼭 써줘요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 슬라이더 (필터 패널) ---------- */
type F = { p: number; d: number; rate: number }
const F0: F = { p: 30, d: 10, rate: 0 }
const countOf = (f: F) => Math.max(0, Math.round(128 * Math.pow(f.p / 30, 1.3) * Math.pow(f.d / 10, 0.9) * (f.rate === 0 ? 1 : f.rate === 4 ? 0.55 : 0.22)))
const activeOf = (f: F) => +(f.p < 30) + +(f.d < 10) + +(f.rate > 0)
const RATES: [number, string][] = [[0, '평점 전체'], [4, '4.0+'], [4.5, '4.5+']]
const SL_LOG = <>손잡이를 움직이면 <b>결과 개수</b>가 바로 바뀌어요</>
const fill = (v: number, min: number, max: number) => ({ ['--p' as string]: ((v - min) / (max - min)) * 100 + '%' }) as CSSProperties

export function SliderFilter() {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState<F>(F0)
  const [applied, setApplied] = useState({ n: 128, active: 0 })
  const [log, setLog] = useState<ReactNode>(SL_LOG)
  const cur = useRef<F>(F0)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const price = useRef<HTMLInputElement>(null)
  const dist = useRef<HTMLInputElement>(null)
  const sheet = useRef<HTMLDivElement>(null)

  const change = (patch: Partial<F>) => {
    const next = { ...cur.current, ...patch }
    cur.current = next; setF(next)
    setLog(<>조건을 바꾸는 즉시 <b>{countOf(next)}개</b> — 버튼에 미리 보여줘요</>)
  }
  const n = countOf(f)
  const demo = useDemo({
    reset() { setOpen(false); cur.current = F0; setF(F0); setApplied({ n: 128, active: 0 }); setLog(SL_LOG) },
    async play(c) {
      const slide = async (k: 'p' | 'd', to: number) => {
        const from = cur.current[k], steps = 10
        for (let i = 1; i <= steps; i++) { change({ [k]: Math.round(from + ((to - from) * i) / steps) }); await c.sleep(45) }
      }
      await c.press(box.current, btn.current); await c.sleep(700)
      c.tap(box.current, price.current); await slide('p', 18); await c.sleep(300)
      c.tap(box.current, dist.current); await slide('d', 5); await c.sleep(300)
      await c.press(box.current, sheet.current?.querySelectorAll<HTMLElement>('.chip')[1] ?? null); await c.sleep(900)
      await c.press(box.current, sheet.current?.querySelector<HTMLElement>('.btn') ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="menu-icon-slider" num="09" title="슬라이더" en="Slider · Filter" demo={demo}
      desc="손잡이가 달린 선 세 개. 범위를 조절하는 상세 필터 패널을 열어요.">
      <Stage log={log} logId="menu-icon-slider-log">
        <Hero k="slider" label="슬라이더 아이콘 눌러보기" title="⫶ 손잡이 달린 선 3개" sub="오디오 믹서의 슬라이더 모양" hint="아래 검색 결과에서 열어보기 ↓" open={open} target={btn} />
        <div className="box left mi-box" ref={box}>
          <div className="mi-tool">
            <b>제주 숙소<small>{applied.n}개</small></b>
            <button ref={btn} className={'mi-btn lbl' + (open ? ' is-open' : '')} aria-expanded={open}
              onClick={() => { setOpen(!open); setLog(<><b>얼마나</b>를 정하는 범위 필터 패널</>) }}>
              <Icon k="slider" />필터<em className="mi-badge" hidden={!applied.active}>{applied.active}</em>
            </button>
          </div>
          <div className="mi-res"><span className="th g3" /><div className="grow"><b>바다 앞 스테이</b><small>★ 4.8 · 2.1km · 18만원</small></div></div>
          <div className="mi-res"><span className="th g2" /><div className="grow"><b>숲속 오두막</b><small>★ 4.6 · 7.4km · 12만원</small></div></div>
          <div className="mi-res"><span className="th g1" /><div className="grow"><b>노을 게스트하우스</b><small>★ 4.3 · 3.0km · 6만원</small></div></div>
          <div className={'mi-scrim' + (open ? ' on' : '')} onClick={() => { setOpen(false); setLog(<>적용하지 않고 <b>닫았어요</b></>) }} />
          <div ref={sheet} className={'mi-fsheet' + (open ? ' on' : '')} role="dialog" aria-label="필터">
            <div className="grabber" />
            <div className="mi-rg">
              <div className="row">1박 최대 가격 <span>{f.p}만원{f.p < 30 ? ' 이하' : '+'}</span></div>
              <input ref={price} type="range" min={5} max={30} value={f.p} aria-label="최대 가격" style={fill(f.p, 5, 30)} onChange={e => change({ p: +e.target.value })} />
            </div>
            <div className="mi-rg">
              <div className="row">거리 <span>{f.d}km 이내</span></div>
              <input ref={dist} type="range" min={1} max={10} value={f.d} aria-label="거리" style={fill(f.d, 1, 10)} onChange={e => change({ d: +e.target.value })} />
            </div>
            <div className="chips">
              {RATES.map(([r, label]) => <button key={r} className="chip" aria-pressed={f.rate === r} onClick={() => change({ rate: r })}>{label}</button>)}
            </div>
            <button className="btn" disabled={!n} onClick={() => {
              const active = activeOf(cur.current), cnt = countOf(cur.current)
              setOpen(false); setApplied({ n: cnt, active })
              setLog(<><b>{cnt}개</b>로 좁혔어요 · 필터 {active}개 적용 중</>)
            }}>{n ? n + '개 숙소 보기' : '조건에 맞는 숙소가 없어요'}</button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['모양', '손잡이 달린 선 3개'], ['여는 것', '범위 필터 패널'], ['흔한 위치', '검색 결과 위 오른쪽']]}
        usage={[
          ['언제', '가격·거리·평점처럼 범위로 거르는 조건이 여러 개일 때'],
          ['vs 도너', '도너는 ‘무엇만’(종류), 슬라이더는 ‘얼마나’(범위). 결과 개수를 미리 보여줘 0개를 피하게 해요'],
        ]}
      />
    </Card>
  )
}
