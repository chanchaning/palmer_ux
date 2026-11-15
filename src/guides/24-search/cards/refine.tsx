import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { BOOKS, CATS, type Book, won } from '../data'
import { BookRow } from '../shared'

/* ---------- 05 필터 ---------- */
type Price = 'all' | 'u15' | 'm15' | 'o20'
const PRICES: [Price, string][] = [['all', '전체'], ['u15', '1.5만원 미만'], ['m15', '1.5–2만원'], ['o20', '2만원 이상']]
type F = { cats: string[]; price: Price; ebook: boolean }
const NONE: F = { cats: [], price: 'all', ebook: false }
const priceOk = (p: Price, n: number) => p === 'all' || (p === 'u15' ? n < 15000 : p === 'm15' ? n >= 15000 && n < 20000 : n >= 20000)
const apply = (f: F) => BOOKS.filter(b => (!f.cats.length || f.cats.includes(b.cat)) && priceOk(f.price, b.price) && (!f.ebook || b.ebook))
const countOf = (f: F) => f.cats.length + (f.price !== 'all' ? 1 : 0) + (f.ebook ? 1 : 0)
const FILTER_LOG = <><b>필터</b> 버튼을 눌러 조건을 골라 보세요</>

export function Filters() {
  const [on, setOn] = useState<F>(NONE)
  const [draft, setDraft] = useState<F>(NONE)
  const [sheet, setSheet] = useState(false)
  const [log, setLog] = useState<ReactNode>(FILTER_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const list = apply(on), n = countOf(on), preview = apply(draft).length
  const open = () => { setDraft(on); setSheet(true); setLog(<>바텀 시트에서 고르는 동안엔 <b>아직 적용 전</b>이에요</>) }
  const close = () => { setSheet(false); setLog(<>닫으면 고르던 건 버리고 <b>이전 조건</b>을 그대로 둬요</>) }
  const commit = () => {
    setOn(draft); setSheet(false)
    setLog(<><b>필터 {countOf(draft)}개 적용</b> — 버튼에 개수가 붙고 칩으로 펼쳐져요 · {apply(draft).length}권</>)
  }
  const set = (f: F, msg: ReactNode) => { setOn(f); setLog(msg) }
  const toggleCat = (c: string) => setDraft(d => ({ ...d, cats: d.cats.includes(c) ? d.cats.filter(x => x !== c) : CATS.filter(x => x === c || d.cats.includes(x)) }))

  const demo = useDemo({
    reset() { setOn(NONE); setDraft(NONE); setSheet(false); setLog(FILTER_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(dev.current, q1('.sr-fbtn')); await c.sleep(900)
      await c.press(dev.current, q1('[data-cat="소설"]')); await c.sleep(600)
      await c.press(dev.current, q1('[data-cat="요리"]')); await c.sleep(700)
      await c.press(dev.current, q1('[data-price="u15"]')); await c.sleep(1100)
      await c.press(dev.current, q1('.sr-apply')); await c.sleep(1700)
      await c.press(dev.current, q1('[data-rm="price"]')); await c.sleep(900)
    },
  })

  return (
    <Card id="search-filter" num="05" title="필터" en="Filters · Facets" demo={demo}
      desc="조건에 안 맞는 결과를 걸러내서 개수를 줄여요. 고르는 동안 몇 개가 남는지 미리 알려줘요.">
      <Stage log={log} logId="search-filter-log">
        <Device ref={dev}>
          <div className="scr sr-scr is-active">
            <div className="bar">전체 도서<span className="sp" /><span className="muted">{list.length}권</span></div>
            <div className="sr-fchips">
              <button type="button" className={'chip sr-fbtn' + (n ? ' has' : '')} onClick={open} aria-label={'필터' + (n ? ', ' + n + '개 적용됨' : '')}>
                <span aria-hidden="true">⚙</span>필터{n > 0 && <span className="sr-cnt">{n}</span>}
              </button>
              <button type="button" className="chip" aria-pressed={on.ebook}
                onClick={() => set({ ...on, ebook: !on.ebook }, <>빠른 필터 <b>전자책</b> {on.ebook ? '해제' : '적용'} — 시트를 열지 않아도 돼요</>)}>전자책</button>
              {on.cats.map(c => (
                <span key={c} className="chip input">{c}
                  <button type="button" aria-label={c + ' 조건 빼기'} onClick={() => set({ ...on, cats: on.cats.filter(x => x !== c) }, <><b>{c}</b> 조건만 뺐어요</>)}>✕</button>
                </span>
              ))}
              {on.price !== 'all' && (
                <span className="chip input">{PRICES.find(p => p[0] === on.price)?.[1]}
                  <button type="button" data-rm="price" aria-label="가격 조건 빼기" onClick={() => set({ ...on, price: 'all' }, <><b>가격</b> 조건만 뺐어요 — 칩마다 ✕가 있어 하나씩 풀 수 있어요</>)}>✕</button>
                </span>
              )}
            </div>
            <div className="sr-body">
              {list.map(b => <BookRow key={b.id} b={b} />)}
              {!list.length && <div className="sr-note">조건에 맞는 책이 없어요</div>}
            </div>
            <div className={'scrim' + (sheet ? ' on' : '')} onClick={close} aria-hidden="true" />
            <div className={'sheet sr-sheet' + (sheet ? ' on' : '')} role="dialog" aria-label="필터" aria-hidden={!sheet} inert={!sheet}>
              <div className="sr-sh-hd"><b>필터</b><button type="button" className="sr-link" onClick={() => setDraft(NONE)}>초기화</button></div>
              <div className="sr-sh-t">분야 <small>여러 개</small></div>
              <div className="chips">
                {CATS.map(c => <button key={c} type="button" className="chip" data-cat={c} aria-pressed={draft.cats.includes(c)} onClick={() => toggleCat(c)}>{c}</button>)}
              </div>
              <div className="sr-sh-t">가격 <small>하나만</small></div>
              <div className="chips" role="radiogroup" aria-label="가격">
                {PRICES.map(([p, l]) => <button key={p} type="button" role="radio" className="chip" data-price={p} aria-checked={draft.price === p} onClick={() => setDraft(d => ({ ...d, price: p }))}>{l}</button>)}
              </div>
              <div className="sr-sh-row">
                <span>전자책만</span>
                <button type="button" className="switch" role="switch" aria-checked={draft.ebook} aria-label="전자책만" onClick={() => setDraft(d => ({ ...d, ebook: !d.ebook }))} />
              </div>
              <button type="button" className="btn sr-apply" disabled={!preview} onClick={commit}>{preview ? preview + '권 보기' : '맞는 책이 없어요'}</button>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['열기', '버튼 + 바텀 시트'], ['표시', '적용 개수 배지 · 칩'], ['버튼', '‘n개 보기’ 미리 계산']]}
        usage={[
          ['언제', '결과가 많고 고를 기준(분야, 가격, 형태)이 분명할 때. 자주 쓰는 건 칩으로 밖에 꺼내 두세요'],
          ['주의', '적용 버튼에 남는 개수를 미리 보여주세요. 눌렀더니 0개면 다시 시트를 열어야 해요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 정렬 ---------- */
type SortKey = 'pick' | 'new' | 'low' | 'high' | 'rate' | 'rev'
const SORTS: [SortKey, string][] = [['pick', '추천순'], ['new', '최신순'], ['low', '낮은 가격순'], ['high', '높은 가격순'], ['rate', '평점 높은순'], ['rev', '리뷰 많은순']]
const CMP: Record<SortKey, (a: Book, b: Book) => number> = {
  pick: (a, b) => b.pick - a.pick,
  new: (a, b) => b.date.localeCompare(a.date),
  low: (a, b) => a.price - b.price,
  high: (a, b) => b.price - a.price,
  rate: (a, b) => b.rate - a.rate,
  rev: (a, b) => b.rev - a.rev,
}
const metaOf = (k: SortKey, b: Book): ReactNode =>
  k === 'new' ? b.date.slice(2).replace(/-/g, '.') : k === 'rate' ? '★ ' + b.rate.toFixed(1) : k === 'rev' ? '리뷰 ' + b.rev : won(b.price)
const SORT_LOG = <>정렬을 바꾸면 <b>순서만</b>, 필터를 걸면 <b>개수</b>가 바뀌어요</>

export function Sort() {
  const m = useMotion()
  const [key, setKey] = useState<SortKey>('pick')
  const [novel, setNovel] = useState(false)
  const [menu, setMenu] = useState(false)
  const [log, setLog] = useState<ReactNode>(SORT_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const rows = useRef(new Map<number, HTMLElement>())
  const tops = useRef(new Map<number, number>())

  const list = BOOKS.filter(b => !novel || b.cat === '소설').sort(CMP[key])
  const order = list.map(b => b.id).join(',')

  // FLIP: 자리를 옮긴 줄이 이전 위치에서 미끄러져 와요
  useLayoutEffect(() => {
    rows.current.forEach((el, id) => {
      const top = el.offsetTop, old = tops.current.get(id)
      if (old !== undefined && old !== top) m.A(el, [{ transform: `translateY(${old - top}px)` }, { transform: 'none' }], 360, EASE.std)
      tops.current.set(id, top)
    })
  }, [order, m])

  const choose = (k: SortKey) => {
    setKey(k); setMenu(false)
    const label = SORTS.find(s => s[0] === k)?.[1]
    setLog(<><b>{label}</b> — 순서만 바뀌고 <b>{list.length}권 그대로</b>예요</>)
  }
  const flipNovel = () => {
    const next = !novel, n = BOOKS.filter(b => !next || b.cat === '소설').length
    setNovel(next)
    setLog(<>필터 <b>소설만</b> {next ? '적용' : '해제'} — {list.length}권 → <b>{n}권</b>, 정렬 규칙은 그대로</>)
  }

  const demo = useDemo({
    reset() { setKey('pick'); setNovel(false); setMenu(false); setLog(SORT_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(dev.current, q1('.sr-sortbtn')); await c.sleep(800)
      await c.press(dev.current, q1('[data-sort="low"]')); await c.sleep(1700)
      await c.press(dev.current, q1('.sr-novel')); await c.sleep(1700)
      await c.press(dev.current, q1('.sr-sortbtn')); await c.sleep(700)
      await c.press(dev.current, q1('[data-sort="new"]')); await c.sleep(1000)
    },
  })

  const label = SORTS.find(s => s[0] === key)?.[1]
  return (
    <Card id="search-sort" num="06" title="정렬" en="Sort · Order by" demo={demo}
      desc="같은 결과를 어떤 순서로 늘어놓을지 정해요. 필터와 달리 개수는 그대로이고 순서만 바뀌어요.">
      <Stage log={log} logId="search-sort-log">
        <Device ref={dev}>
          <div className="scr sr-scr is-active">
            <div className="bar">‘책’ 검색 결과</div>
            <div className="sr-sortbar">
              <span className="muted">{list.length}권</span>
              <button type="button" className={'chip sr-novel'} aria-pressed={novel} onClick={flipNovel}>소설만</button>
              <span className="sp" />
              <button type="button" className="sr-sortbtn" aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(true)}>{label} ▾</button>
            </div>
            <div className="sr-body sr-sorted">
              {list.map(b => (
                <div key={b.id} ref={el => { if (el) rows.current.set(b.id, el); else rows.current.delete(b.id) }}>
                  <BookRow b={b} meta={<span className={key === 'pick' ? '' : 'sr-key'}>{metaOf(key, b)}</span>} />
                </div>
              ))}
            </div>
            <div className={'scrim' + (menu ? ' on' : '')} onClick={() => setMenu(false)} aria-hidden="true" />
            <div className={'sheet sr-sheet' + (menu ? ' on' : '')} role="dialog" aria-label="정렬" aria-hidden={!menu} inert={!menu}>
              <div className="sr-sh-hd"><b>정렬</b></div>
              <div role="radiogroup" aria-label="정렬 기준">
                {SORTS.map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={k === key} data-sort={k} className={'sr-opt' + (k === key ? ' on' : '')} onClick={() => choose(k)}>
                    {l}{k === key && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['선택', '하나만 (라디오)'], ['기본값', '추천순'], ['표시', '현재 기준을 버튼에']]}
        usage={[
          ['언제', '결과를 다 보되 먼저 보고 싶은 게 있을 때 — 싼 것, 새 것, 평이 좋은 것'],
          ['vs 필터', '정렬은 순서, 필터는 개수예요. 둘을 한 메뉴에 섞으면 ‘왜 책이 줄었지?’ 하고 헷갈려요'],
        ]}
      />
    </Card>
  )
}
