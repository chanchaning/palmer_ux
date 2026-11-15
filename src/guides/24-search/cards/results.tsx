import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, Seg } from '../../../components/ui'
import { BOOKS, VOCAB, bookHit, lev, won, words, type Book } from '../data'
import { BookRow, Cover, Field, Hi } from '../shared'

/* ---------- 07 검색어 강조 ---------- */
type Look = 'mark' | 'b' | 'none'
const hayOf = (b: Book) => b.t + ' ' + b.a + ' ' + b.cat + ' ' + b.blurb
/** 첫 번째로 맞는 곳 앞뒤만 잘라 보여줘요 */
const snippet = (text: string, q: string) => {
  const idx = Math.min(...words(q).map(w => text.indexOf(w)).filter(i => i >= 0), text.length)
  if (idx >= text.length) return text.slice(0, 34) + (text.length > 34 ? '…' : '')
  const start = Math.max(0, idx - 10), end = Math.min(text.length, start + 36)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}
const MARK_LOG = <>‘<b>여름 바다</b>’처럼 두 낱말로 찾아 보세요</>

export function Highlight() {
  const [q, setQ] = useState('')
  const [look, setLook] = useState<Look>('mark')
  const [log, setLog] = useState<ReactNode>(MARK_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const segBox = useRef<HTMLDivElement>(null)

  const ws = words(q)
  const list = ws.length ? BOOKS.filter(b => ws.every(w => hayOf(b).includes(w))) : []
  const change = (v: string) => {
    setQ(v)
    const n = words(v).length ? BOOKS.filter(b => words(v).every(w => hayOf(b).includes(w))).length : 0
    setLog(v.trim() ? <>{n}권 — 제목·소개 속 <b>맞는 낱말마다</b> 표시해요</> : MARK_LOG)
  }
  const pickLook = (l: Look) => {
    setLook(l)
    setLog(l === 'mark' ? <><b>배경 강조</b> — 훑어볼 때 가장 빨리 눈에 띄어요</> : l === 'b' ? <><b>굵게</b> — 차분하지만 짧은 낱말은 잘 안 보여요</> : <><b>강조 없음</b> — 왜 이 결과가 나왔는지 찾아 읽어야 해요</>)
  }

  const demo = useDemo({
    reset() { setQ(''); setLook('mark'); setLog(MARK_LOG) },
    async play(c) {
      const seg = (v: string) => segBox.current?.querySelector<HTMLElement>(`[data-v="${v}"]`) ?? null
      c.tap(dev.current, dev.current?.querySelector('input') ?? null)
      let s = ''
      for (const ch of '여름 바다') { s += ch; change(s); await c.sleep(200) }
      await c.sleep(1600)
      await c.press(segBox.current, seg('none')); await c.sleep(1400)
      await c.press(segBox.current, seg('b')); await c.sleep(1400)
      await c.press(segBox.current, seg('mark')); await c.sleep(600)
    },
  })

  return (
    <Card id="search-mark" num="07" title="검색어 강조" en="Highlight in Results · <mark>" demo={demo}
      desc="결과 속에서 내가 친 낱말을 칠해서 보여줘요. 왜 이 결과가 나왔는지 한눈에 알 수 있어요.">
      <Stage log={log} logId="search-mark-log">
        <Device ref={dev}>
          <div className="scr sr-scr is-active">
            <div className="sr-top"><Field value={q} onChange={change} /></div>
            <div className={'sr-body sr-look-' + look}>
              {ws.length ? (
                <>
                  <div className="sr-cap">‘{q.trim()}’ {list.length}권</div>
                  {list.map(b => (
                    <div key={b.id} className="sr-hitrow">
                      <Cover b={b} />
                      <span className="sr-grow">
                        <span className="sr-t"><Hi text={b.t} q={q} as={look} /></span>
                        <span className="sr-snip"><Hi text={snippet(b.blurb, q)} q={q} as={look} /></span>
                      </span>
                    </div>
                  ))}
                  {!list.length && <div className="sr-note">두 낱말이 모두 들어간 책이 없어요</div>}
                </>
              ) : <div className="sr-note">검색하면 결과 속 낱말이 칠해져요</div>}
            </div>
          </div>
        </Device>
        <div ref={segBox}>
          <Seg value={look} onChange={pickLook} options={[['mark', '배경 강조'], ['b', '굵게'], ['none', '강조 없음']]} />
        </div>
      </Stage>
      <Info
        spec={[['태그', '<mark>'], ['단위', '낱말마다 따로'], ['본문', '맞는 곳 앞뒤만 자르기']]}
        usage={[
          ['언제', '결과가 긴 글(소개, 리뷰, 메일)이라 어디가 맞았는지 바로 안 보일 때'],
          ['vs 자동완성', '자동완성의 진한 글씨는 검색 ‘전’ 추천, 강조는 검색 ‘후’ 결과예요. 배경색은 다크 모드에서도 글자가 잘 읽히는지 확인하세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 결과 없음 ---------- */
const findBooks = (q: string, ebook: boolean) => BOOKS.filter(b => bookHit(b, q) && (!ebook || b.ebook))
/** 사전에 없는 낱말을 가장 가까운 낱말로 바꿔요 */
const fixTypo = (q: string) => {
  const fixed = words(q).map(w => {
    if (VOCAB.some(v => v.includes(w))) return w
    let best = w, bd = 99
    VOCAB.forEach(v => { const d = lev(w, v); if (d < bd) { bd = d; best = v } })
    return bd <= Math.max(1, Math.floor([...w].length / 3)) ? best : w
  }).join(' ')
  return fixed !== words(q).join(' ') ? fixed : null
}
const NONE_LOG = <>‘<b>고양이 여룸</b>’처럼 틀리게 쳐 보세요</>

export function NoResults() {
  const [q, setQ] = useState('')
  const [ebook, setEbook] = useState(true)
  const [log, setLog] = useState<ReactNode>(NONE_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const v = q.trim(), list = v ? findBooks(v, ebook) : []
  const empty = !!v && !list.length
  const typo = empty ? fixTypo(v) : null
  const typoN = typo ? findBooks(typo, ebook).length : 0
  const freeN = empty && ebook ? findBooks(v, false).length : 0
  const singles = empty && words(v).length > 1 ? words(v).map(w => [w, findBooks(w, ebook).length] as const).filter(x => x[1] > 0) : []

  const change = (s: string) => {
    setQ(s)
    const t = s.trim()
    if (!t) { setLog(NONE_LOG); return }
    const n = findBooks(t, ebook).length
    setLog(n ? <>결과 {n}권</> : <>0권 → 막다른 길 대신 <b>되돌아갈 길</b>을 보여줘요</>)
  }

  const demo = useDemo({
    reset() { setQ(''); setEbook(true); setLog(NONE_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      c.tap(dev.current, q1('input'))
      let s = ''
      for (const ch of '고양이 여룸') { s += ch; change(s); await c.sleep(170) }
      await c.sleep(1800)
      await c.press(dev.current, q1('[data-fix="typo"]')); await c.sleep(1500)
      s = ''
      change('')
      for (const ch of '집사') { s += ch; change(s); await c.sleep(200) }
      await c.sleep(1600)
      await c.press(dev.current, q1('[data-fix="filter"]')); await c.sleep(900)
    },
  })

  return (
    <Card id="search-none" num="08" title="결과 없음" en="No Results · Zero Results Recovery" demo={demo}
      desc="0개일 때 ‘없어요’로 끝내지 않고 오타 고치기, 필터 풀기, 낱말 줄이기처럼 되돌아갈 길을 줘요.">
      <Stage log={log} logId="search-none-log">
        <Device ref={dev}>
          <div className="scr sr-scr is-active">
            <div className="sr-top"><Field value={q} onChange={change} /></div>
            <div className="sr-fchips">
              <button type="button" className="chip" aria-pressed={ebook}
                onClick={() => { setEbook(!ebook); setLog(<>필터 <b>전자책만</b> {ebook ? '해제' : '적용'}</>) }}>전자책만</button>
            </div>
            <div className="sr-body">
              {!v ? <div className="sr-note">필터 ‘전자책만’이 켜져 있어요</div> : list.length ? (
                <>
                  <div className="sr-cap">‘{v}’ {list.length}권</div>
                  {list.map(b => <BookRow key={b.id} b={b} q={v} />)}
                </>
              ) : (
                <div className="sr-zero">
                  <div className="sr-zt">‘{v}’ 결과가 없어요</div>
                  {typo && typoN > 0 && (
                    <button type="button" className="sr-fix main" data-fix="typo"
                      onClick={() => { change(typo); setLog(<><b>오타 고치기</b> — ‘{v}’ → ‘{typo}’</>) }}>
                      혹시 <b>‘{typo}’</b> 찾으세요? <small>{typoN}권</small>
                    </button>
                  )}
                  {freeN > 0 && (
                    <button type="button" className="sr-fix" data-fix="filter"
                      onClick={() => { setEbook(false); setLog(<><b>필터 풀기</b> — ‘전자책만’을 빼니 {freeN}권</>) }}>
                      ‘전자책만’을 풀면 <b>{freeN}권</b> 있어요
                    </button>
                  )}
                  {singles.map(([w, n]) => (
                    <button key={w} type="button" className="sr-fix" onClick={() => { change(w); setLog(<><b>낱말 줄이기</b> — ‘{w}’만으로 넓혀서 찾아요</>) }}>
                      ‘{w}’만 찾기 <small>{n}권</small>
                    </button>
                  ))}
                  <button type="button" className="sr-link" onClick={() => setLog(<>그래도 없으면 <b>입고 요청</b>처럼 마지막 길을 남겨요</>)}>찾는 책이 없나요? 입고 요청하기</button>
                </div>
              )}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['순서', '오타 → 필터 → 낱말'], ['버튼', '남는 개수 함께'], ['마지막', '요청·문의']]}
        usage={[
          ['언제', '검색이 0개일 때. 빈 화면의 기본 모양(일러스트·제목·설명)은 05 빈 화면 가이드의 ‘검색 결과 없음’을 보세요'],
          ['주의', '고쳐 줄 길마다 몇 개가 나오는지 미리 셈해서 보여주세요. 눌렀는데 또 0개면 신뢰를 잃어요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 검색 범위 탭 ---------- */
type Scope = 'all' | 'goods' | 'review' | 'user'
const GOODS = [{ t: '고양이 북엔드', p: 12000 }, { t: '여름 한정 책갈피 세트', p: 6000 }, { t: '밤의 도서관 노트', p: 8500 }]
const REVIEWS = [
  { u: '책벌레하린', b: '고양이와 보낸 여름', t: '여름마다 꺼내 읽고 싶어요. 고양이가 떠나는 장면에서 울었어요.' },
  { u: '밤산책', b: '밤의 도서관', t: '자기 전에 한 장씩 읽었어요. 고양이 사서가 귀여워요.' },
  { u: '바다곁에', b: '고요한 바다', t: '여름 휴가 때 바닷가에서 읽기 딱 좋았어요.' },
  { u: '빵굽는도윤', b: '여름의 레시피', t: '불 없이 만드는 요리라 여름에 정말 편해요.' },
  { u: '별보는준', b: '여름 밤 별자리', t: '캠핑 가서 아이랑 별을 찾았어요.' },
]
const USERS = [
  { n: '여름책방', bio: '여름에 읽기 좋은 책만 모아요', f: 1203 },
  { n: '고양이서재', bio: '고양이가 나오는 책 기록', f: 845 },
  { n: '밤산책', bio: '밤에 읽는 소설 이야기', f: 312 },
  { n: '한여름독서회', bio: '매주 토요일 여름 독서 모임', f: 96 },
]
const SCOPES: [Scope, string][] = [['all', '전체'], ['goods', '상품'], ['review', '리뷰'], ['user', '사용자']]
const has = (text: string, q: string) => words(q).every(w => text.includes(w))
const SCOPE_LOG = <>탭을 바꿔도 <b>검색어는 그대로</b>예요</>

export function ScopeTabs() {
  const [q, setQ] = useState('여름')
  const [tab, setTab] = useState<Scope>('all')
  const [log, setLog] = useState<ReactNode>(SCOPE_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const v = q.trim()
  const goods = v ? [...BOOKS.filter(b => bookHit(b, v)).map(b => ({ k: 'b' + b.id, t: b.t, p: b.price, b })), ...GOODS.filter(g => has(g.t, v)).map(g => ({ k: g.t, t: g.t, p: g.p, b: null }))] : []
  const reviews = v ? REVIEWS.filter(r => has(r.t + ' ' + r.b, v)) : []
  const users = v ? USERS.filter(u => has(u.n + ' ' + u.bio, v)) : []
  const counts: Record<Scope, number> = { all: goods.length + reviews.length + users.length, goods: goods.length, review: reviews.length, user: users.length }

  const go = (s: Scope, how = '탭') => {
    setTab(s)
    const name = SCOPES.find(x => x[0] === s)?.[1]
    setLog(<>{how} → <b>{name} {counts[s]}개</b> · 검색어 ‘{v}’는 그대로</>)
  }
  const change = (s: string) => { setQ(s); setLog(<>검색어를 바꾸면 <b>탭마다 숫자</b>가 함께 바뀌어요</>) }

  const goodsRows = (n: number) => goods.slice(0, n).map(g => (
    <div className="sr-row" key={g.k}>
      {g.b ? <Cover b={g.b} /> : <span className="sr-cover c4" aria-hidden="true">✦</span>}
      <span className="sr-grow"><span className="sr-t"><Hi text={g.t} q={v} /></span><span className="sr-sub">{g.b ? '도서' : '굿즈'}</span></span>
      <span className="sr-meta">{won(g.p)}</span>
    </div>
  ))
  const reviewRows = (n: number) => reviews.slice(0, n).map(r => (
    <div className="sr-rev" key={r.u + r.b}><b>{r.u}</b> · {r.b}<p><Hi text={r.t} q={v} /></p></div>
  ))
  const userRows = (n: number) => users.slice(0, n).map(u => (
    <div className="sr-row" key={u.n}>
      <span className="sr-av" aria-hidden="true">{u.n[0]}</span>
      <span className="sr-grow"><span className="sr-t"><Hi text={u.n} q={v} /></span><span className="sr-sub"><Hi text={u.bio} q={v} /></span></span>
      <span className="sr-meta">{u.f.toLocaleString('ko-KR')}</span>
    </div>
  ))
  const more = (s: Scope) => counts[s] > 2 && (
    <button type="button" className="sr-more" data-more={s} onClick={() => go(s, '더 보기')}>{SCOPES.find(x => x[0] === s)?.[1]} {counts[s]}개 모두 보기 ›</button>
  )

  const demo = useDemo({
    reset() { setQ('여름'); setTab('all'); setLog(SCOPE_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.sleep(500)
      await c.press(dev.current, q1('[data-tab="review"]')); await c.sleep(1500)
      await c.press(dev.current, q1('[data-tab="all"]')); await c.sleep(1000)
      await c.press(dev.current, q1('[data-more="goods"]')); await c.sleep(1500)
      let s = ''
      change('')
      for (const ch of '고양이') { s += ch; change(s); await c.sleep(220) }
      await c.sleep(1200)
      await c.press(dev.current, q1('[data-tab="user"]')); await c.sleep(800)
    },
  })

  const empty = <div className="sr-note">‘{v}’ {SCOPES.find(x => x[0] === tab)?.[1]} 결과는 없어요.<br />다른 탭을 확인해 보세요.</div>
  return (
    <Card id="search-scope" num="09" title="검색 범위 탭" en="Scope Tabs · Search Verticals" demo={demo}
      desc="한 번 검색한 말을 상품·리뷰·사용자처럼 종류별로 나눠 보여줘요. 탭마다 개수를 달아 둬요.">
      <Stage log={log} logId="search-scope-log">
        <Device ref={dev}>
          <div className="scr sr-scr is-active">
            <div className="sr-top"><Field value={q} onChange={change} /></div>
            <div className="sr-tabs" role="tablist" aria-label="검색 범위">
              {SCOPES.map(([s, l]) => (
                <button key={s} type="button" role="tab" data-tab={s} aria-selected={tab === s} aria-controls="search-scope-panel"
                  className={counts[s] ? '' : 'zero'} onClick={() => go(s)}>
                  {l}<span>{counts[s]}</span>
                </button>
              ))}
            </div>
            <div className="sr-body" role="tabpanel" id="search-scope-panel" key={tab}>
              {!v ? <div className="sr-note">검색어를 입력해 보세요</div> : tab === 'all' ? (
                counts.all ? (
                  <>
                    {goods.length > 0 && <><div className="sr-cap">상품</div>{goodsRows(2)}{more('goods')}</>}
                    {reviews.length > 0 && <><div className="sr-cap">리뷰</div>{reviewRows(1)}{more('review')}</>}
                    {users.length > 0 && <><div className="sr-cap">사용자</div>{userRows(2)}{more('user')}</>}
                  </>
                ) : <div className="sr-note">‘{v}’ 결과가 없어요</div>
              ) : tab === 'goods' ? (goods.length ? goodsRows(9) : empty)
                : tab === 'review' ? (reviews.length ? reviewRows(9) : empty)
                  : (users.length ? userRows(9) : empty)}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['탭', '3–5개'], ['숫자', '탭마다 결과 개수'], ['전체', '종류별 2–3개 + 더 보기']]}
        usage={[
          ['언제', '한 검색어로 서로 다른 종류(상품, 글, 사람)가 함께 나오는 앱'],
          ['주의', '탭을 바꿔도 검색어와 필터는 지켜 주세요. 0개인 탭은 숨기지 말고 흐리게 두면 ‘없다’는 것도 정보가 돼요'],
        ]}
      />
    </Card>
  )
}
