import { Fragment, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Empty, Hl, Phone, useAnatomy } from '../shared'

/* ---------- 01 첫 사용 ---------- */
const POOL = ['물 2L 마시기', '디자인 리뷰 준비', '운동 30분', '책 20쪽 읽기', '내일 일정 확인']
const FIRST_LOG = <>버튼을 눌러 <b>첫 항목</b>을 만들어 보세요</>

export function FirstUse() {
  const { hl, spec } = useAnatomy()
  const [n, setN] = useState(0)
  const [log, setLog] = useState<ReactNode>(FIRST_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const add2 = useRef<HTMLButtonElement>(null)

  const add = () => {
    if (n >= POOL.length) { setLog(<>예시는 여기까지예요 — <b>다시 보기</b>로 처음부터</>); return }
    const next = n + 1
    setN(next)
    setLog(next === 1 ? <>첫 항목이 생기자 <b>빈 화면은 사라지고</b> 목록으로</> : <>이제 추가는 <b>상단 + 버튼</b>이 맡아요 ({next}개)</>)
  }
  const demo = useDemo({
    reset() { setN(0); setLog(FIRST_LOG) },
    async play(c) {
      await c.sleep(600)
      await c.press(dev.current, dev.current?.querySelector<HTMLElement>('.em-act .btn') ?? null); await c.sleep(1000)
      await c.press(dev.current, add2.current); await c.sleep(700)
    },
  })

  return (
    <Card id="empty-first" num="01" title="첫 사용" en="First Use · Onboarding" demo={demo}
      desc="아직 아무것도 만들지 않은 상태예요. 비어 있는 이유 대신 ‘무엇을 하면 되는지’를 알려줘요.">
      <Stage log={log} logId="empty-first-log">
        <Hl hl={hl}>
          <Phone ref={dev}>
            <div className="scr">
              <div className="bar">할 일<span className="sp" /><button ref={add2} aria-label="할 일 추가" hidden={!n} onClick={add}>+ 추가</button></div>
              <div className="em-scr">
                {n ? POOL.slice(0, n).map(t => (
                  <div className="em-row" key={t}><label className="opt"><input type="checkbox" aria-label={t} /></label><span className="grow">{t}</span></div>
                )) : (
                  <Empty ill="first" title="아직 할 일이 없어요" desc="오늘 꼭 할 일 하나만 적어볼까요? 끝내면 체크해서 지워요.">
                    <button className="btn sm" onClick={add}>+ 첫 할 일 추가</button>
                  </Empty>
                )}
              </div>
            </div>
          </Phone>
        </Hl>
      </Stage>
      <Info
        spec={[spec, ['톤', '환영 · 격려'], ['행동', '만들기 1개']]}
        usage={[
          ['언제', '가입 직후, 새 폴더·새 프로젝트처럼 사용자가 아직 아무것도 만들지 않았을 때'],
          ['주의', '‘데이터가 없습니다’로 끝내지 마세요 — 첫 행동 버튼이 핵심이에요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 검색 결과 없음 ---------- */
const MENU: [string, string][] = [['아메리카노', '4,500원'], ['카페라떼', '5,000원'], ['바닐라라떼', '5,500원'], ['콜드브루', '5,000원'], ['카푸치노', '5,000원'], ['녹차라떼', '5,500원'], ['레몬에이드', '5,800원'], ['자몽에이드', '5,800원']]
const lev = (a: string, b: string) => {
  const m = [...a], n = [...b], d = Array.from({ length: m.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= n.length; j++) d[0][j] = j
  for (let i = 1; i <= m.length; i++) for (let j = 1; j <= n.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (m[i - 1] === n[j - 1] ? 0 : 1))
  return d[m.length][n.length]
}
const guess = (qs: string) => {
  let best: string | null = null, bd = 99
  MENU.forEach(([nm]) => {
    const chars = [...nm], L = [...qs].length
    for (let s = 0; s <= Math.max(0, chars.length - L); s++) {
      const dd = Math.min(lev(qs, chars.slice(s, s + L).join('')), lev(qs, nm))
      if (dd < bd) { bd = dd; best = nm }
    }
  })
  return bd <= Math.max(1, Math.floor([...qs].length / 3)) ? best : null
}
const hitsOf = (v: string) => (v ? MENU.filter(m => m[0].includes(v)) : MENU.slice(0, 5))
const SEARCH_LOG = <>‘<b>아메리카도</b>’처럼 틀리게 입력해 보세요</>

export function NoResults() {
  const { hl, spec } = useAnatomy()
  const [q, setQ] = useState('')
  const [log, setLog] = useState<ReactNode>(SEARCH_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  /** 원본 render()처럼 값이 바뀌면 상태 문구도 함께 갱신 */
  const update = (raw: string) => {
    setQ(raw)
    const v = raw.trim(), hits = hitsOf(v)
    if (hits.length) { if (v) setLog(<>‘{v}’ 결과 <b>{hits.length}개</b></>); return }
    const g = guess(v)
    setLog(<>결과 0개 → {g ? <><b>오타 교정</b> 제안 + 인기 검색어</> : <><b>인기 검색어</b>로 다음 길 제시</>}</>)
  }
  const suggest = (s: string) => { update(s); setLog(<>제안을 눌러 <b>‘{s}’</b> 결과로 바로 이동</>) }
  const demo = useDemo({
    reset() { setQ(''); setLog(SEARCH_LOG) },
    async play(c) {
      c.tap(dev.current, input.current)
      let s = ''
      for (const ch of '아메리카도') { s += ch; update(s); await c.sleep(160) }
      await c.sleep(1500)
      await c.press(dev.current, dev.current?.querySelector<HTMLElement>('.em-hint') ?? null); await c.sleep(900)
    },
  })

  const v = q.trim(), hits = hitsOf(v), g = hits.length ? null : guess(v)
  return (
    <Card id="empty-search" num="02" title="검색 결과 없음" en="No Results" demo={demo}
      desc="찾는 게 없을 때 막다른 길 대신 오타 교정과 대안 검색어로 다음 길을 열어줘요.">
      <Stage log={log} logId="empty-search-log">
        <Hl hl={hl}>
          <Phone ref={dev}>
            <div className="scr">
              <div className="bar">메뉴 검색</div>
              <div className="em-search">
                <span aria-hidden="true">🔍</span>
                <input ref={input} type="search" placeholder="메뉴 이름을 입력하세요" autoComplete="off" aria-label="메뉴 검색"
                  value={q} onChange={e => update(e.target.value)} />
                <button aria-label="지우기" hidden={!v} onClick={() => { update(''); setLog(<>검색어를 지우면 <b>인기 메뉴</b>로 복귀</>) }}>✕</button>
              </div>
              <div className="em-scr" aria-live="polite">
                {hits.length ? (
                  <>
                    {!v && <div className="muted" style={{ padding: '8px 12px 0' }}>인기 메뉴</div>}
                    {hits.map(m => (
                      <div className="em-row" key={m[0]}>
                        <span className="grow">{v ? m[0].split(v).map((part, i) => <Fragment key={i}>{i > 0 && <mark>{v}</mark>}{part}</Fragment>) : m[0]}</span>
                        <span className="muted">{m[1]}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <Empty ill="search" title={'‘' + v + '’ 검색 결과가 없어요'} desc="철자를 확인하거나 더 짧은 단어로 검색해 보세요.">
                    {g && <button className="em-hint" onClick={() => suggest(g)}>혹시 ‘<b>{g}</b>’를 찾으셨나요?</button>}
                    <div className="em-pop" style={{ width: '100%' }}>인기 검색어
                      <div className="chips">
                        {['라떼', '콜드브루', '에이드'].map(s => <button key={s} className="chip" onClick={() => suggest(s)}>{s}</button>)}
                      </div>
                    </div>
                  </Empty>
                )}
              </div>
            </div>
          </Phone>
        </Hl>
      </Stage>
      <Info
        spec={[spec, ['제목', '검색어 그대로 인용'], ['행동', '오타 교정 · 인기어']]}
        usage={[
          ['언제', '검색어와 맞는 결과가 0개일 때 — 사용자가 직접 만든 빈 화면이에요'],
          ['주의', '검색어를 지우지 말고 제목에 보여주세요 — 무엇이 틀렸는지 바로 보여요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 필터 결과 없음 ---------- */
const FILTERS: [string, string][] = [['비건', '🌱 비건'], ['매운맛', '🌶 매운맛'], ['1만원 이하', '💸 1만원 이하'], ['무료배달', '🛵 무료배달']]
const ITEMS: [string, string[]][] = [
  ['두부 포케', ['비건', '1만원 이하']], ['마라 샹궈', ['매운맛', '무료배달']], ['비건 버거', ['비건', '무료배달']],
  ['국물 떡볶이', ['매운맛', '1만원 이하', '무료배달']], ['연어 샐러드', ['1만원 이하']], ['불닭 파스타', ['매운맛']],
]
const match = (fs: string[]) => ITEMS.filter(it => fs.every(f => it[1].includes(f)))
/** 하나만 빼면 가장 많이 살아나는 ‘범인’ 필터 */
const culprit = (fs: string[]) => {
  let best: string | null = null, bn = 0
  fs.forEach(f => { const c = match(fs.filter(x => x !== f)).length; if (c > bn) { bn = c; best = f } })
  return { best, bn }
}
const FILTER_LOG = <>필터를 <b>겹쳐 걸어</b> 0개를 만들어 보세요</>

export function OverFiltered() {
  const { hl, spec } = useAnatomy()
  const [fs, setFs] = useState<string[]>([])
  const [log, setLog] = useState<ReactNode>(FILTER_LOG)
  const box = useRef<HTMLDivElement>(null)
  const chipsEl = useRef<HTMLDivElement>(null)

  const apply = (next: string[]) => {
    const ordered = FILTERS.map(f => f[0]).filter(f => next.includes(f))
    setFs(ordered)
    const hits = match(ordered)
    if (hits.length) setLog(ordered.length ? <><b>{ordered.join(' + ')}</b> → {hits.length}개</> : FILTER_LOG)
    else setLog(<><b>{ordered.join(' + ')}</b> = 0개 → 범인 필터 <b>‘{String(culprit(ordered).best)}’</b> 지목</>)
  }
  const toggle = (f: string) => apply(fs.includes(f) ? fs.filter(x => x !== f) : [...fs, f])
  const demo = useDemo({
    reset() { apply([]) },
    async play(c) {
      const chip = (i: number) => chipsEl.current?.querySelectorAll<HTMLElement>('.chip')[i] ?? null
      await c.press(box.current, chip(0)); await c.sleep(700)
      await c.press(box.current, chip(1)); await c.sleep(1700)
      await c.press(box.current, box.current?.querySelector<HTMLElement>('[data-drop]') ?? null); await c.sleep(800)
    },
  })

  const hits = match(fs), { best, bn } = culprit(fs)
  return (
    <Card id="empty-filter" num="03" title="필터 결과 없음" en="Over-filtered" demo={demo}
      desc="조건을 겹겹이 걸다 보면 0개가 돼요. 무엇 때문인지 짚어주고 한 번에 풀 수 있게 해요.">
      <Stage log={log} logId="empty-filter-log">
        <Hl hl={hl}>
          <div className="box left" ref={box}>
            <div className="em-fbox">
              <div className="chips" ref={chipsEl}>
                {FILTERS.map(([f, label]) => <button key={f} className="chip" aria-pressed={fs.includes(f)} onClick={() => toggle(f)}>{label}</button>)}
              </div>
              <div className="em-count"><span>메뉴 <b>{hits.length}</b>개</span><span>{fs.length ? '필터 ' + fs.length + '개' : '필터 없음'}</span></div>
              <div className="em-list" aria-live="polite">
                {hits.length ? hits.map(it => (
                  <div className="em-row" key={it[0]}><span className="grow">{it[0]}</span><span className="em-tags">{it[1].map(t => <span key={t}>{t}</span>)}</span></div>
                )) : (
                  <Empty ill="filter" title="조건에 맞는 메뉴가 없어요" desc={best ? '‘' + best + '’ 조건을 빼면 ' + bn + '개가 있어요.' : '조건을 줄여 보세요.'}>
                    <button className="btn sm" onClick={() => { apply([]); setLog(<><b>필터 초기화</b> — 한 번에 전체 목록으로</>) }}>필터 초기화</button>
                    {best && <button className="btn ghost sm" data-drop={best} onClick={() => { apply(fs.filter(x => x !== best)); setLog(<><b>‘{best}’</b> 하나만 빼서 결과 회복</>) }}>‘{best}’ 빼기</button>}
                  </Empty>
                )}
              </div>
            </div>
          </div>
        </Hl>
      </Stage>
      <Info
        spec={[spec, ['설명', '범인 필터 지목'], ['행동', '초기화 · 하나 빼기']]}
        usage={[
          ['언제', '쇼핑·배달·숙소 목록에서 필터 조합 때문에 결과가 0개일 때'],
          ['vs 검색 없음', '원인이 검색어가 아니라 ‘조건’이에요 — 필터 초기화 버튼을 꼭 주세요'],
        ]}
      />
    </Card>
  )
}
