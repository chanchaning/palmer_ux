import { useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, Seg, useTimers } from '../../../components/ui'
import { MENU, won, type Item } from '../data'
import { Ctrl, Thumb } from '../shared'

const q = <T extends HTMLElement>(root: HTMLElement | null, sel: string) => root?.querySelector<T>(sel) ?? null

/* ---------- 04 캐러셀 ---------- */
const TOP = [...MENU].sort((a, b) => b.orders - a.orders).slice(0, 5)
const CAR_LOG = <>밀어서 넘기거나 <b>화살표 · 점</b>을 눌러 보세요</>

export function Carousel() {
  const [idx, setIdx] = useState(0)
  const [peek, setPeek] = useState(true)
  const [log, setLog] = useState<ReactNode>(CAR_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  /** 버튼으로 넘기는 중이면 도착할 장 (중간 장 문구를 건너뛰어요) */
  const target = useRef<number | null>(null)
  const timers = useTimers()

  const step = () => {
    const t = track.current, first = t?.firstElementChild as HTMLElement | null
    if (!t || !first) return 1
    return first.offsetWidth + parseFloat(getComputedStyle(t).columnGap || '0')
  }
  const go = (i: number) => {
    const n = Math.max(0, Math.min(TOP.length - 1, i))
    target.current = n
    timers.clear(); timers.set(() => { target.current = null }, 900)
    track.current?.scrollTo({ left: n * step(), behavior: 'smooth' })
    setIdx(n)
    setLog(<><b>{n + 1} / {TOP.length}</b> · {TOP[n].name}{n === TOP.length - 1 ? ' — 마지막 장이에요' : ''}</>)
  }
  const onScroll = () => {
    if (drag.current) return
    const t = track.current
    if (!t) return
    const n = Math.round(t.scrollLeft / step())
    if (target.current !== null) {
      const goal = Math.min(target.current * step(), t.scrollWidth - t.clientWidth)
      if (Math.abs(t.scrollLeft - goal) < 2) target.current = null
      return
    }
    if (n !== idx) { setIdx(n); setLog(<><b>{n + 1} / {TOP.length}</b> · {TOP[n].name}</>) }
  }
  /* 마우스로 끌기 (터치는 브라우저 기본 스크롤 + scroll-snap) */
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !track.current) return
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false }
    track.current.classList.add('dragging')
    track.current.setPointerCapture(e.pointerId)
  }
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current, t = track.current
    if (!d || !t) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 3) d.moved = true
    t.scrollLeft = d.left - dx
  }
  const up = () => {
    const d = drag.current, t = track.current
    if (!d || !t) return
    drag.current = null
    t.classList.remove('dragging')
    const raw = t.scrollLeft / step(), base = d.left / step()
    // 조금만 밀어도 다음 장으로 (1/5 넘으면)
    const n = raw > base + 0.2 ? Math.ceil(raw) : raw < base - 0.2 ? Math.floor(raw) : Math.round(raw)
    go(n)
  }
  const pickPeek = (v: boolean) => {
    setPeek(v)
    setLog(v ? <>다음 장이 <b>살짝 보여서</b> 넘길 수 있다는 걸 알아채요</> : <>한 장씩 꽉 차면 <b>옆에 더 있다는 걸</b> 놓치기 쉬워요</>)
    requestAnimationFrame(() => track.current?.scrollTo({ left: idx * step() }))
  }
  const demo = useDemo({
    reset() { setPeek(true); setIdx(0); setLog(CAR_LOG); if (track.current) track.current.scrollLeft = 0 },
    async play(c) {
      await c.press(dev.current, q(dev.current, '.cl-arrow.next')); await c.sleep(1000)
      await c.press(dev.current, q(dev.current, '.cl-arrow.next')); await c.sleep(1000)
      await c.press(dev.current, q(dev.current, '.cl-dots button:last-child')); await c.sleep(1100)
      await c.press(stage.current, q(stage.current, '[data-v="full"]')); await c.sleep(1400)
      await c.press(stage.current, q(stage.current, '[data-v="peek"]')); await c.sleep(600)
      await c.press(dev.current, q(dev.current, '.cl-dots button:first-child')); await c.sleep(600)
    },
  })

  return (
    <Card id="col-carousel" num="04" title="캐러셀" en="Carousel" demo={demo}
      desc="가로로 한 장씩 넘겨 봐요. 좁은 자리에 여러 개를 담지만, 한 번에 보이는 건 한두 개뿐이에요.">
      <Stage log={log} logId="col-carousel-log">
        <div className="cl-stage" ref={stage}>
          <Ctrl label="옆 장"><Seg value={peek ? 'peek' : 'full'} onChange={v => pickPeek(v === 'peek')} options={[['peek', '살짝 보이기'], ['full', '한 장씩']]} /></Ctrl>
        </div>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">홈<span className="sp" /></div>
            <div className="cl-body">
              <div className="cl-sec-t">이번 주 인기 TOP 5</div>
              <div className="cl-car" role="region" aria-roledescription="캐러셀" aria-label="이번 주 인기 메뉴">
                <div className={'cl-track' + (peek ? ' peek' : '')} ref={track} onScroll={onScroll}
                  onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                  {TOP.map((m, i) => (
                    <div key={m.id} className="cl-slide" role="group" aria-roledescription="슬라이드" aria-label={`${i + 1} / ${TOP.length}`}>
                      <Thumb item={m} className="wide tall"><span className="cl-rank">{i + 1}</span></Thumb>
                      <b>{m.name}</b><small>{won(m.price)} · 주문 {m.orders}</small>
                    </div>
                  ))}
                </div>
                <button type="button" className="cl-arrow prev" aria-label="이전" disabled={idx === 0} onClick={() => go(idx - 1)}>‹</button>
                <button type="button" className="cl-arrow next" aria-label="다음" disabled={idx === TOP.length - 1} onClick={() => go(idx + 1)}>›</button>
              </div>
              <div className="cl-dots">
                {TOP.map((m, i) => <button key={m.id} type="button" aria-label={`${i + 1}번째 슬라이드`} aria-current={i === idx} onClick={() => go(i)} />)}
              </div>
              <div className="cl-sec-t">새로 나왔어요</div>
              <div className="cl-fake"><span className="fake-line" style={{ width: '70%' }} /><span className="fake-line" style={{ width: '45%' }} /></div>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['넘김', '밀기 · 화살표 · 점'], ['옆 장', '10–20% 보이기'], ['개수', '3–7장']]}
        usage={[
          ['언제', '홈 배너, 추천 묶음처럼 고를 거리를 보여주되 화면을 많이 차지하면 안 될 때'],
          ['주의', '뒤쪽 장은 거의 안 봐요 — 중요한 건 첫 장에. 저절로 넘어가게 했다면 멈춤 버튼도 꼭'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 테이블 ---------- */
type Key = 'name' | 'cat' | 'price' | 'orders'
const COLS: [Key, string, boolean][] = [['name', '메뉴', false], ['cat', '분류', false], ['price', '가격', true], ['orders', '주문', true]]
const TABLE_LOG = <>머리글을 눌러 <b>정렬</b>해 보세요 · 한 번 더 누르면 반대로</>
const sortBy = (k: Key, dir: 1 | -1) => (a: Item, b: Item) =>
  (typeof a[k] === 'number' ? (a[k] as number) - (b[k] as number) : String(a[k]).localeCompare(String(b[k]), 'ko')) * dir

export function Table() {
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 } | null>(null)
  const [log, setLog] = useState<ReactNode>(TABLE_LOG)
  const box = useRef<HTMLDivElement>(null)

  const rows = sort ? [...MENU].sort(sortBy(sort.k, sort.dir)) : MENU
  const click = (k: Key, num: boolean) => {
    // 숫자는 처음엔 큰 순, 글자는 가나다순부터
    const dir: 1 | -1 = sort?.k === k ? (sort.dir === 1 ? -1 : 1) : num ? -1 : 1
    setSort({ k, dir })
    const top = [...MENU].sort(sortBy(k, dir))[0]
    const label = COLS.find(c => c[0] === k)![1]
    const how = num ? (dir === 1 ? '낮은 순' : '높은 순') : (dir === 1 ? '가나다순' : '역순')
    setLog(<>{label} <b>{how}</b> — 맨 위는 ‘{top.name}’{k === 'price' ? ` ${won(top.price)}` : k === 'orders' ? ` ${top.orders}잔` : ''}</>)
    const sc = box.current?.querySelector('.cl-tscroll')
    if (sc) sc.scrollTop = 0
  }
  const demo = useDemo({
    reset() { setSort(null); setLog(TABLE_LOG) },
    async play(c) {
      await c.press(box.current, q(box.current, '[data-k="price"]')); await c.sleep(1500)
      await c.press(box.current, q(box.current, '[data-k="price"]')); await c.sleep(1500)
      await c.press(box.current, q(box.current, '[data-k="orders"]')); await c.sleep(800)
    },
  })

  return (
    <Card id="col-table" num="05" title="테이블" en="Table · Data Grid" demo={demo}
      desc="가로는 항목, 세로는 속성으로 칸을 맞춰요. 여러 기준을 한꺼번에 비교하고 정렬할 수 있어요.">
      <Stage log={log} logId="col-table-log">
        <div className="cl-tbox" ref={box}>
          <div className="cl-tscroll">
            <table className="cl-table">
              <caption className="cl-sr">솔방울 커피 메뉴 — 머리글 버튼으로 정렬</caption>
              <thead>
                <tr>
                  {COLS.map(([k, label, num]) => {
                    const on = sort?.k === k
                    return (
                      <th key={k} className={num ? 'num' : ''} aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" data-k={k} className={on ? 'on' : ''} onClick={() => click(k, num)}>
                          {label}<span className="cl-sort" aria-hidden="true">{on ? (sort.dir === 1 ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.id}>
                    <td><b>{m.name}</b></td>
                    <td className="cl-cat">{m.cat}</td>
                    <td className="num">{m.price.toLocaleString('ko-KR')}</td>
                    <td className="num">{m.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['숫자', '오른쪽 정렬 · 고정폭'], ['정렬', '머리글 클릭'], ['머리글', '스크롤해도 고정']]}
        usage={[
          ['언제', '주문 관리, 재고, 정산처럼 여러 속성을 나란히 놓고 비교·정렬해야 할 때'],
          ['주의', '폰에서 칸이 5개를 넘으면 읽기 어려워요 — 중요한 칸만 남기거나 리스트로 바꾸세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 타임라인 ---------- */
interface Ev { id: number; day: '오늘' | '어제'; time: string; title: string; note: string; kind: 'order' | 'done' | 'stock' }
const BASE: Ev[] = [
  { id: 1, day: '오늘', time: '13:05', title: '카페라떼 2잔 주문', note: '픽업 · 김하늘님', kind: 'order' },
  { id: 2, day: '오늘', time: '12:40', title: '아메리카노 4잔 픽업 완료', note: '단체 주문', kind: 'done' },
  { id: 3, day: '오늘', time: '11:10', title: '레몬 재고 채움', note: '+20개', kind: 'stock' },
  { id: 4, day: '오늘', time: '09:00', title: '영업 시작', note: '오픈 담당 · 박도윤', kind: 'done' },
  { id: 5, day: '어제', time: '20:30', title: '영업 종료', note: '총 142건', kind: 'done' },
  { id: 6, day: '어제', time: '18:15', title: '당근 케이크 품절', note: '재입고 내일 오전', kind: 'stock' },
]
const NEXT: [string, string, string][] = [['13:22', '바닐라라떼 1잔 주문', '배달 · 이서준님'], ['13:31', '콜드브루 3잔 주문', '픽업 · 최유나님'], ['13:47', '버터 스콘 2개 주문', '픽업 · 정민호님']]
const TL_LOG = <><b>+ 새 기록</b>을 눌러 시간 순서에 끼워 보세요</>

export function Timeline() {
  const [evs, setEvs] = useState<Ev[]>(BASE)
  const [n, setN] = useState(0)
  const [asc, setAsc] = useState(false)
  const [fresh, setFresh] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(TL_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  const add = () => {
    if (n >= NEXT.length) { setLog(<>예시는 여기까지예요 — <b>다시 보기</b>로 처음부터</>); return }
    const [time, title, note] = NEXT[n], id = 100 + n
    setEvs(e => [{ id, day: '오늘', time, title, note, kind: 'order' }, ...e])
    setN(n + 1); setFresh(id)
    setLog(asc ? <>오래된순이라 새 기록은 <b>맨 아래</b>에 붙어요</> : <>새 기록이 <b>맨 위</b>에 — 최신순이 기본이에요</>)
    requestAnimationFrame(() => { const b = body.current; if (b) b.scrollTo({ top: asc ? b.scrollHeight : 0, behavior: 'smooth' }) })
  }
  const order = (v: boolean) => {
    setAsc(v)
    setLog(v ? <>오래된순 — <b>무슨 일이 있었는지</b> 처음부터 따라 읽을 때</> : <>최신순 — <b>방금 일어난 일</b>을 먼저 볼 때</>)
    if (body.current) body.current.scrollTop = 0
  }
  const demo = useDemo({
    reset() { setEvs(BASE); setN(0); setAsc(false); setFresh(null); setLog(TL_LOG); if (body.current) body.current.scrollTop = 0 },
    async play(c) {
      await c.press(dev.current, q(dev.current, '.cl-tl-add')); await c.sleep(1300)
      await c.press(dev.current, q(dev.current, '.cl-tl-add')); await c.sleep(1300)
      await c.press(stage.current, q(stage.current, '[data-v="asc"]')); await c.sleep(1200)
      await c.press(stage.current, q(stage.current, '[data-v="desc"]')); await c.sleep(400)
    },
  })

  const sorted = asc ? [...evs].reverse() : evs
  const days = asc ? (['어제', '오늘'] as const) : (['오늘', '어제'] as const)
  return (
    <Card id="col-timeline" num="06" title="타임라인" en="Timeline" demo={demo}
      desc="시간 순서대로 세로 선 위에 점을 찍어 이어요. ‘언제 무슨 일이 있었는지’가 한눈에 보여요.">
      <Stage log={log} logId="col-timeline-log">
        <div className="cl-stage" ref={stage}>
          <Ctrl label="순서"><Seg value={asc ? 'asc' : 'desc'} onChange={v => order(v === 'asc')} options={[['desc', '최신순'], ['asc', '오래된순']]} /></Ctrl>
        </div>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">매장 기록<span className="sp" /><button type="button" className="cl-tl-add" onClick={add}>+ 새 기록</button></div>
            <div className="cl-body" ref={body}>
              {days.map(d => (
                <section key={d} className="cl-tl-day">
                  <h3>{d === '오늘' ? '오늘 · 11월 16일 (월)' : '어제 · 11월 15일 (일)'}</h3>
                  <ol className="cl-tl">
                    {sorted.filter(e => e.day === d).map(e => (
                      <li key={e.id} className={e.kind + (e.id === fresh ? ' fresh' : '')}>
                        <time>{e.time}</time>
                        <span className="cl-tl-dot" aria-hidden="true" />
                        <span className="grow"><b>{e.title}</b><small>{e.note}</small></span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['기준', '시간 하나'], ['묶음', '날짜 머리글'], ['기본 순서', '최신이 위']]}
        usage={[
          ['언제', '배송 조회, 활동 기록, 변경 이력처럼 순서와 시각 자체가 중요한 정보일 때'],
          ['주의', '시간이 상관없는 목록에 쓰면 선과 점이 장식일 뿐이에요 — 그땐 그냥 리스트로'],
        ]}
      />
    </Card>
  )
}
