import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { BOOKS, CATS, bookHit } from '../data'
import { BookRow, Cover, Field, Glass } from '../shared'

/* ---------- 01 검색창 ---------- */
type Phase = 'idle' | 'focus' | 'typing' | 'clear' | 'cancel'
const PHASES: [Phase, string][] = [['idle', '기본'], ['focus', '포커스'], ['typing', '입력 중'], ['clear', '지우기'], ['cancel', '취소']]
const BAR_LOG = <>검색창을 눌러 <b>상태가 바뀌는 순서</b>를 따라가 보세요</>
const RECENT_MINI = ['밤의 도서관', '고양이', '별자리']

export function SearchBar() {
  const [active, setActive] = useState(false)
  const [q, setQ] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [log, setLog] = useState<ReactNode>(BAR_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const hits = BOOKS.filter(b => q.trim() && bookHit(b, q))
  const focus = () => {
    setActive(true)
    setPhase(p => (p === 'typing' ? p : 'focus'))
    setLog(<><b>포커스</b> — 테두리가 진해지고, 취소 버튼과 최근 검색어가 나타나요</>)
  }
  const change = (v: string) => {
    setActive(true); setQ(v); setPhase(v ? 'typing' : 'focus')
    const n = BOOKS.filter(b => v.trim() && bookHit(b, v)).length
    setLog(v ? <><b>입력 중</b> — 오른쪽에 ✕ 지우기가 생겨요 · {n}권</> : <>글자를 다 지우면 다시 <b>포커스</b> 상태예요</>)
  }
  const clear = () => {
    setQ(''); setPhase('clear')
    setLog(<><b>지우기 ✕</b> — 글자만 지워요. 키보드와 검색 모드는 그대로예요</>)
  }
  const cancel = () => {
    setQ(''); setActive(false); setPhase('cancel'); input.current?.blur()
    setLog(<><b>취소</b> — 글자도 지우고 검색 전 화면으로 돌아가요</>)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && q.trim()) {
      input.current?.blur()
      setLog(<>Enter로 <b>‘{q.trim()}’ 검색</b> — 키보드는 내려가고 결과만 남아요</>)
    }
  }

  const demo = useDemo({
    reset() { setActive(false); setQ(''); setPhase('idle'); setLog(BAR_LOG) },
    async play(c) {
      c.tap(dev.current, input.current); focus(); await c.sleep(1300)
      let s = ''
      for (const ch of '고양이') { s += ch; change(s); await c.sleep(220) }
      await c.sleep(1300)
      await c.press(dev.current, dev.current?.querySelector<HTMLElement>('.sr-clear') ?? null); await c.sleep(1300)
      s = ''
      for (const ch of '여름') { s += ch; change(s); await c.sleep(220) }
      await c.sleep(1200)
      await c.press(dev.current, dev.current?.querySelector<HTMLElement>('.sr-cancel') ?? null); await c.sleep(600)
    },
  })

  return (
    <Card id="search-bar" num="01" title="검색창" en="Search Bar · Search Field" demo={demo}
      desc="돋보기와 입력칸, 지우기 ✕, 취소로 이뤄진 검색의 입구예요. 누르기 전과 후의 모습이 달라요.">
      <Stage log={log} logId="search-bar-log">
        <Device ref={dev}>
          <div className={'scr sr-scr' + (active ? ' is-active' : '')}>
            <div className="sr-hd" aria-hidden={active}>책방 한켠</div>
            <div className="sr-top">
              <Field value={q} onChange={change} onFocus={focus} onClear={clear} onKeyDown={onKey} inputRef={input} />
              <button type="button" className="sr-cancel" tabIndex={active ? 0 : -1} aria-hidden={!active} onClick={cancel}>취소</button>
            </div>
            <div className="sr-body">
              {!active ? (
                <div className="sr-home">
                  <div className="sr-cap">이번 주 새로 들어온 책</div>
                  <div className="sr-tiles">{BOOKS.slice(6, 9).map(b => <div key={b.id} className="sr-tile"><Cover b={b} /><span>{b.t}</span></div>)}</div>
                  <div className="sr-cap">지금 많이 읽는 책</div>
                  {[BOOKS[3], BOOKS[0]].map(b => <BookRow key={b.id} b={b} />)}
                </div>
              ) : q.trim() ? (
                <div className="sr-list">
                  <div className="sr-cap">‘{q.trim()}’ {hits.length}권</div>
                  {hits.slice(0, 5).map(b => <BookRow key={b.id} b={b} q={q} />)}
                  {!hits.length && <div className="sr-note">결과가 없어요. 다른 낱말로 찾아보세요.</div>}
                </div>
              ) : (
                <div className="sr-list">
                  <div className="sr-cap">최근 검색어</div>
                  <div className="chips sr-chips">{RECENT_MINI.map(t => <button key={t} className="chip" onClick={() => change(t)}>{t}</button>)}</div>
                </div>
              )}
            </div>
          </div>
        </Device>
        <div className="sr-states" aria-hidden="true">
          {PHASES.map(([p, label]) => <span key={p} className={phase === p ? 'on' : ''}>{label}</span>)}
        </div>
      </Stage>
      <Info
        spec={[['구성', '돋보기 · 입력칸 · ✕ · 취소'], ['높이', '36–44px'], ['키보드', '검색 키(enterkeyhint)']]}
        usage={[
          ['언제', '찾을 게 많은 앱의 맨 위. 누르면 검색 전용 화면으로 바뀌고 취소로 돌아와요'],
          ['주의', '✕(지우기)와 취소는 달라요. ✕는 글자만, 취소는 검색 모드 자체를 끝내요 — 하나로 합치면 사용자가 길을 잃어요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 자동완성 ---------- */
type Sugg = { t: string; k: string }
const SUGG: Sugg[] = [
  ...BOOKS.map(b => ({ t: b.t, k: '책' })),
  ...[...new Set(BOOKS.map(b => b.a))].map(a => ({ t: a, k: '작가' })),
  ...CATS.map(c => ({ t: c, k: '분야' })),
  { t: '여름 휴가에 읽을 책', k: '추천' }, { t: '고양이 소설', k: '추천' }, { t: '여름 요리', k: '추천' }, { t: '별자리 보는 법', k: '추천' },
]
const suggest = (q: string) => {
  const v = q.trim()
  if (!v) return []
  return SUGG.filter(s => s.t.includes(v))
    .sort((a, b) => Number(b.t.startsWith(v)) - Number(a.t.startsWith(v)) || a.t.length - b.t.length)
    .slice(0, 6)
}
const AUTO_LOG = <>‘<b>여름</b>’을 입력하고 <b>↑ ↓ Enter</b>로 골라 보세요</>

export function Autocomplete() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [act, setAct] = useState(-1)
  const [picked, setPicked] = useState<string | null>(null)
  const [log, setLog] = useState<ReactNode>(AUTO_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const keys = useRef<HTMLDivElement>(null)

  const list = suggest(q)
  const shown = open && list.length > 0
  const change = (v: string) => {
    setQ(v); setOpen(true); setAct(-1); setPicked(null)
    const n = suggest(v).length
    setLog(v.trim() ? <>입력할 때마다 <b>추천 {n}개</b> — 맞는 부분은 진하게</> : AUTO_LOG)
  }
  const pick = (t: string, how: string) => {
    setQ(t); setOpen(false); setAct(-1); setPicked(t)
    setLog(<>{how} <b>‘{t}’</b> 검색</>)
  }
  const move = (d: 1 | -1) => {
    if (!shown) { if (list.length) { setOpen(true); setAct(d > 0 ? 0 : list.length - 1) } return }
    const n = list.length
    const next = act < 0 ? (d > 0 ? 0 : n - 1) : (act + d + n) % n
    setAct(next)
    setLog(<>{d > 0 ? '↓' : '↑'} <b>{list[next].t}</b> — 아직 검색 전이에요</>)
  }
  const enter = () => {
    if (shown && act >= 0) pick(list[act].t, 'Enter로')
    else if (q.trim()) pick(q.trim(), '입력한 그대로')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // 한글은 조합 중에 Enter가 두 번 들어올 수 있어요
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'Enter') { e.preventDefault(); enter() }
    else if (e.key === 'Escape' && shown) { e.preventDefault(); setOpen(false); setLog(<>Esc — 추천만 닫고 <b>입력은 그대로</b></>) }
  }
  const hit = (t: string) => {
    const v = q.trim(), i = t.indexOf(v)
    if (!v || i < 0) return t
    return <>{t.slice(0, i)}<b className="sr-hit">{v}</b>{t.slice(i + v.length)}</>
  }
  const results = picked ? BOOKS.filter(b => bookHit(b, picked) || b.blurb.includes(picked)) : []

  const demo = useDemo({
    reset() { setQ(''); setOpen(false); setAct(-1); setPicked(null); setLog(AUTO_LOG) },
    async play(c) {
      const k = (i: number) => keys.current?.querySelectorAll<HTMLElement>('button')[i] ?? null
      c.tap(dev.current, dev.current?.querySelector('input') ?? null)
      let s = ''
      for (const ch of '여름') { s += ch; change(s); await c.sleep(260) }
      await c.sleep(1200)
      await c.press(keys.current, k(1)); await c.sleep(650)
      await c.press(keys.current, k(1)); await c.sleep(650)
      await c.press(keys.current, k(1)); await c.sleep(900)
      await c.press(keys.current, k(2)); await c.sleep(900)
    },
  })

  return (
    <Card id="search-auto" num="02" title="자동완성" en="Autocomplete · Suggestions" demo={demo}
      desc="몇 글자만 쳐도 완성된 검색어를 아래에 펼쳐 줘요. 맞는 부분을 표시하고 키보드로도 고를 수 있어요.">
      <Stage log={log} logId="search-auto-log">
        <Device ref={dev}>
          <div className="scr sr-scr is-active">
            <div className="sr-top">
              <Field value={q} onChange={change} onKeyDown={onKey}
                extra={{
                  role: 'combobox', 'aria-expanded': shown, 'aria-controls': 'search-auto-lb', 'aria-autocomplete': 'list',
                  'aria-activedescendant': shown && act >= 0 ? 'search-auto-o' + act : undefined,
                }} />
            </div>
            <div className="sr-body">
              {shown ? (
                <ul className="sr-sugg" role="listbox" id="search-auto-lb" aria-label="추천 검색어">
                  {list.map((s, i) => (
                    <li key={s.t} id={'search-auto-o' + i} role="option" aria-selected={i === act} className={i === act ? 'on' : ''}
                      onMouseDown={e => e.preventDefault()} onClick={() => pick(s.t, '눌러서')}>
                      <Glass /><span className="sr-grow">{hit(s.t)}</span><span className="sr-kind">{s.k}</span>
                      <button type="button" tabIndex={-1} className="sr-fill" aria-label={s.t + ' 입력칸에 채우기'}
                        onClick={e => { e.stopPropagation(); change(s.t) }}>↖</button>
                    </li>
                  ))}
                </ul>
              ) : picked ? (
                <div className="sr-list">
                  <div className="sr-cap">‘{picked}’ {results.length}권</div>
                  {results.slice(0, 5).map(b => <BookRow key={b.id} b={b} />)}
                </div>
              ) : (
                <div className="sr-note">{q.trim() ? '맞는 추천이 없어요. Enter로 그대로 검색해요.' : '책 제목·작가·분야를 입력해 보세요'}</div>
              )}
            </div>
          </div>
        </Device>
        <div className="sr-keys" ref={keys} aria-label="키보드 흉내">
          <button type="button" className="btn ghost sm" onClick={() => move(-1)} aria-label="위 화살표">↑</button>
          <button type="button" className="btn ghost sm" onClick={() => move(1)} aria-label="아래 화살표">↓</button>
          <button type="button" className="btn ghost sm" onClick={enter}>Enter</button>
        </div>
      </Stage>
      <Info
        spec={[['개수', '5–8개'], ['표시', '입력과 맞는 부분'], ['키', '↑ ↓ Enter Esc']]}
        usage={[
          ['언제', '이름이 길거나 철자가 헷갈리는 것(책 제목, 지명, 상품명)을 찾을 때'],
          ['주의', '한글은 글자를 조합하는 중에도 Enter가 들어와요. isComposing을 확인하지 않으면 ‘여르’로 검색되거나 두 번 실행돼요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 최근 검색어 ---------- */
type Term = { t: string; d: string }
const TERMS: Term[] = [{ t: '밤의 도서관', d: '11.14' }, { t: '고양이', d: '11.12' }, { t: '여름 요리', d: '11.10' }, { t: '별자리', d: '11.03' }]
const RECENT_LOG = <>검색하거나 ✕로 지우고, <b>저장 끄기</b>도 눌러 보세요</>

export function RecentSearches() {
  const [terms, setTerms] = useState<Term[]>(TERMS)
  const [save, setSave] = useState(true)
  const [q, setQ] = useState('')
  const [log, setLog] = useState<ReactNode>(RECENT_LOG)
  const saveRef = useRef(true)
  const dev = useRef<HTMLDivElement>(null)

  const submit = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    setQ('')
    if (saveRef.current) {
      setTerms(ts => [{ t, d: '11.15' }, ...ts.filter(x => x.t !== t)].slice(0, 6))
      setLog(<><b>‘{t}’</b> 검색 → 맨 위에 쌓여요 (같은 말은 한 번만)</>)
    } else setLog(<><b>‘{t}’</b> 검색 — 저장이 꺼져 있어 <b>남지 않아요</b></>)
  }
  const del = (t: string) => { setTerms(ts => ts.filter(x => x.t !== t)); setLog(<><b>‘{t}’</b> 하나만 지웠어요</>) }
  const clearAll = () => { setTerms([]); setLog(<><b>전체 삭제</b> — 목록이 비었어요</>) }
  const flip = () => {
    const on = !saveRef.current
    saveRef.current = on; setSave(on)
    setLog(on ? <>저장 <b>켜짐</b> — 이전 기록이 다시 보여요</> : <>저장 <b>꺼짐</b> — 목록을 숨기고 새 검색도 남기지 않아요</>)
  }

  const demo = useDemo({
    reset() { setTerms(TERMS); saveRef.current = true; setSave(true); setQ(''); setLog(RECENT_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      c.tap(dev.current, q1('input'))
      let s = ''
      for (const ch of '고요한 바다') { s += ch; setQ(s); await c.sleep(130) }
      await c.sleep(400); submit(s); await c.sleep(1300)
      await c.press(dev.current, q1('[data-del="별자리"]')); await c.sleep(1200)
      await c.press(dev.current, q1('.switch')); await c.sleep(1100)
      s = ''
      for (const ch of '생일 선물') { s += ch; setQ(s); await c.sleep(130) }
      await c.sleep(400); submit(s); await c.sleep(1400)
      await c.press(dev.current, q1('.switch')); await c.sleep(700)
    },
  })

  return (
    <Card id="search-recent" num="03" title="최근 검색어" en="Recent Searches · Search History" demo={demo}
      desc="내가 찾았던 말을 최신순으로 남겨 두는 목록이에요. 하나씩, 또는 전부 지울 수 있어야 해요.">
      <Stage log={log} logId="search-recent-log">
        <Device ref={dev}>
          <div className="scr sr-scr is-active">
            <div className="sr-top">
              <Field value={q} onChange={setQ} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(q) }} />
            </div>
            <div className="sr-body">
              <div className="sr-sec">
                <span>최근 검색어</span>
                {save && terms.length > 0 && <button type="button" className="sr-link" onClick={clearAll}>전체 삭제</button>}
              </div>
              {!save ? (
                <div className="sr-note">검색어 저장이 꺼져 있어요.<br />켜면 다시 쌓기 시작해요.</div>
              ) : terms.length ? (
                <ul className="sr-recent">
                  {terms.map(x => (
                    <li key={x.t}>
                      <button type="button" className="sr-grow sr-term" onClick={() => submit(x.t)}>
                        <span aria-hidden="true">🕘</span>{x.t}
                      </button>
                      <span className="sr-date">{x.d}</span>
                      <button type="button" className="sr-x" data-del={x.t} aria-label={x.t + ' 삭제'} onClick={() => del(x.t)}>✕</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="sr-note">최근 검색어가 없어요</div>
              )}
            </div>
            <div className="sr-save">
              <span>검색어 저장</span>
              <button type="button" className="switch" role="switch" aria-checked={save} aria-label="검색어 저장" onClick={flip} />
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['개수', '최대 10개 안팎'], ['순서', '최신순 · 중복 제거'], ['지우기', '하나 · 전체 · 끄기']]}
        usage={[
          ['언제', '같은 걸 자주 다시 찾는 앱(쇼핑, 지도, 서점). 검색창을 누르자마자 보여줘요'],
          ['주의', '가족과 함께 쓰는 기기에선 검색 기록이 사생활이에요. 하나씩 지우기와 저장 끄기를 꼭 같이 주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 인기 검색어 ---------- */
type Delta = number | 'new'
const POOL = ['밤의 도서관', '고양이와 보낸 여름', '우주를 여행하는 법', '여름의 레시피', '매일 만드는 빵', '고요한 바다', '디자인 첫걸음', '도시 산책자', '고양이 집사 첫걸음', '여름 밤 별자리', '커피 한 잔의 철학', '작은 정원 가꾸기']
const FIRST: [string, Delta][] = [
  ['밤의 도서관', 2], ['고양이와 보낸 여름', 0], ['우주를 여행하는 법', 'new'], ['여름의 레시피', -1], ['매일 만드는 빵', 3],
  ['고요한 바다', -2], ['디자인 첫걸음', 0], ['도시 산책자', 1], ['고양이 집사 첫걸음', -3], ['여름 밤 별자리', 'new'],
]
/** 같은 입력이면 늘 같은 값 (0–1) */
const seeded = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 1000) / 1000 }
const TREND_LOG = <>순위가 <b>한 줄씩 굴러가요</b> — 눌러서 펼쳐 보세요</>

export function Trending() {
  const [rank, setRank] = useState<[string, Delta][]>(FIRST)
  const [hour, setHour] = useState(11)
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<ReactNode>(TREND_LOG)
  const dev = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) return
    const id = window.setInterval(() => setIdx(i => (i + 1) % 10), 2200)
    return () => clearInterval(id)
  }, [open])

  const refresh = () => {
    const h = hour + 1
    const prev = rank.map(r => r[0])
    const next = [...POOL]
      .map((t, i) => ({ t, s: (POOL.length - i) * 0.55 + seeded(t + h) * 5 }))
      .sort((a, b) => b.s - a.s).slice(0, 10).map(x => x.t)
    setRank(next.map((t, i): [string, Delta] => [t, prev.includes(t) ? prev.indexOf(t) - i : 'new']))
    setHour(h)
    setLog(<><b>{h}:00 기준</b>으로 갱신 — ▲▼는 지난 시간과 비교한 칸 수예요</>)
  }
  const mark = (d: Delta) =>
    d === 'new' ? <span className="sr-d new">NEW</span>
      : d > 0 ? <span className="sr-d up" aria-label={d + '계단 상승'}>▲{d}</span>
        : d < 0 ? <span className="sr-d down" aria-label={-d + '계단 하락'}>▼{-d}</span>
          : <span className="sr-d same" aria-label="변동 없음">–</span>

  const demo = useDemo({
    reset() { setRank(FIRST); setHour(11); setIdx(0); setOpen(false); setLog(TREND_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.sleep(3600)
      await c.press(dev.current, q1('.sr-ticker')); await c.sleep(1200)
      await c.press(dev.current, q1('.sr-refresh')); await c.sleep(1800)
      await c.press(dev.current, q1('.sr-rank li button')); await c.sleep(1000)
      await c.press(dev.current, q1('.sr-ticker')); await c.sleep(500)
    },
  })

  const cur = rank[idx % 10]
  return (
    <Card id="search-trend" num="04" title="인기 검색어" en="Trending · Popular Searches" demo={demo}
      desc="지금 많은 사람이 찾는 말을 1위부터 보여줘요. 오르고 내린 칸 수를 함께 달아 흐름을 읽게 해요.">
      <Stage log={log} logId="search-trend-log">
        <Device ref={dev}>
          <div className="scr sr-scr is-active">
            <div className="sr-top"><Field value="" onChange={() => setLog(<>이 카드에서는 <b>인기 검색어</b>를 눌러 보세요</>)} /></div>
            <div className="sr-body">
              <div className="sr-sec">
                <span>인기 검색어 <small>{hour}:00 기준</small></span>
                <button type="button" className="sr-link sr-refresh" aria-label="순위 새로고침" onClick={refresh}>↻</button>
              </div>
              <button type="button" className={'sr-ticker' + (open ? ' on' : '')} aria-expanded={open} aria-controls="search-trend-list"
                aria-label={open ? '인기 검색어 접기' : '인기 검색어 펼치기, 지금 ' + (idx % 10 + 1) + '위 ' + cur[0]}
                onClick={() => { setOpen(o => !o); setLog(open ? <>접으면 다시 <b>한 줄 티커</b>로 굴러가요</> : <>펼친 동안엔 <b>굴러가기를 멈춰요</b> — 읽는 중에 바뀌면 곤란하니까요</>) }}>
                {open ? <span className="sr-grow">전체 순위</span> : (
                  <span className="sr-roll" key={idx + cur[0]}><b>{idx % 10 + 1}</b><span className="sr-grow">{cur[0]}</span>{mark(cur[1])}</span>
                )}
                <span className="sr-chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
              </button>
              {open && (
                <ol className="sr-rank" id="search-trend-list">
                  {rank.map(([t, d], i) => (
                    <li key={t}>
                      <button type="button" onClick={() => setLog(<><b>{i + 1}위 ‘{t}’</b> 검색 — 누르면 바로 결과로 가요</>)}>
                        <b className={i < 3 ? 'top' : ''}>{i + 1}</b><span className="sr-grow">{t}</span>{mark(d)}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['개수', '10개'], ['변동', '▲ ▼ – NEW'], ['기준', '시각을 함께 표시']]}
        usage={[
          ['언제', '무엇을 찾을지 아직 정하지 못한 사람에게 출발점을 줄 때. 검색창을 누른 직후 화면에 잘 어울려요'],
          ['주의', '한 줄 티커는 사용자가 펼치거나 읽는 동안 멈춰야 해요. 몇 시 기준인지도 꼭 적어 주세요'],
        ]}
      />
    </Card>
  )
}

