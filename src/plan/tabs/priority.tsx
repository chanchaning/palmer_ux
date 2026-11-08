import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Note, Section, SysGrid } from '../../system/ui'
import { Seg } from '../../components/ui'
import { download } from '../../system/export'
import './priority.css'

/* ---------- 공용 작은 도구 ---------- */
const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
const toCSV = (rows: (string | number)[][]) => '﻿' + rows.map(r => r.map(cell).join(',')).join('\n')
const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })

function CopyBtn({ text, label = '복사' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* 복사 불가 환경 */ }
    setOk(true); setTimeout(() => setOk(false), 1400)
  }
  return <button type="button" className="btn ghost sm" onClick={copy}>{ok ? '✓ 복사됨' : label}</button>
}

function GoodBad({ bad, good, badLabel = '나쁜 예', goodLabel = '좋은 예' }: { bad: ReactNode; good: ReactNode; badLabel?: string; goodLabel?: string }) {
  const [v, setV] = useState<'bad' | 'good'>('bad')
  return (
    <div className="pr-gb">
      <Seg value={v} onChange={setV} options={[['bad', '✕ ' + badLabel], ['good', '✓ ' + goodLabel]]} />
      <div className={'pr-gb-body is-' + v} aria-live="polite">{v === 'bad' ? bad : good}</div>
    </div>
  )
}

function Checklist({ items, name }: { items: [string, string][]; name: string }) {
  const [on, setOn] = useState<Set<number>>(new Set())
  const md = `# ${name}\n\n` + items.map(([q, w]) => `- [ ] ${q}\n  - ${w}`).join('\n')
  return (
    <div className="pr-check">
      <ul>
        {items.map(([q, w], i) => (
          <li key={i} className={on.has(i) ? 'on' : ''}>
            <label>
              <input type="checkbox" checked={on.has(i)} onChange={() => setOn(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })} />
              <span><b>{q}</b><small>{w}</small></span>
            </label>
          </li>
        ))}
      </ul>
      <div className="pr-bar-row">
        <div className="pr-progress" aria-live="polite"><i style={{ width: (on.size / items.length) * 100 + '%' }} /><span>{on.size} / {items.length}</span></div>
        <CopyBtn text={md} label="마크다운 복사" />
      </div>
    </div>
  )
}

/* ---------- RICE ---------- */
type Row = { id: number; name: string; reach: number; impact: number; conf: number; effort: number; why: string }
const IMPACT: readonly (readonly [number, string])[] = [[3, '3 · 엄청 큼'], [2, '2 · 큼'], [1, '1 · 보통'], [0.5, '0.5 · 작음'], [0.25, '0.25 · 아주 작음']]
const CONF: readonly (readonly [number, string])[] = [[100, '100% · 데이터 있음'], [80, '80% · 근거 일부'], [50, '50% · 감에 가까움']]
const SEED: Row[] = [
  { id: 1, name: '재주문 버튼 (최근 주문 다시 담기)', reach: 4000, impact: 2, conf: 80, effort: 1, why: '지난 분기 2회 이상 주문한 구매자 4,000명. 재주문까지 탭 6번 → 2번 예상' },
  { id: 2, name: '반찬 정기 배송(구독)', reach: 1500, impact: 3, conf: 50, effort: 4, why: '설문에서 “매주 받고 싶다” 응답 기준 추정. 검증 데이터 없음' },
  { id: 3, name: '리뷰에 사진 올리기', reach: 2500, impact: 1, conf: 80, effort: 0.5, why: '분기 리뷰 작성자 수 기준. 사진 리뷰가 있는 반찬의 상세 체류가 더 긴 것은 로그로 확인' },
  { id: 4, name: '사장님 품절 일괄 처리', reach: 300, impact: 2, conf: 100, effort: 0.5, why: '입점 사장님 300명 전원. 품절 처리 CS 문의가 매주 들어옴' },
  { id: 5, name: '다크 모드', reach: 6000, impact: 0.25, conf: 50, effort: 1, why: '전체 활성 구매자. 요청은 있지만 주문에 주는 영향은 작다고 봄' },
]
const score = (r: Row) => (r.effort > 0 ? (r.reach * r.impact * (r.conf / 100)) / r.effort : 0)

function lintRow(r: Row): string[] {
  const w: string[] = []
  if (!r.name.trim()) w.push('이름이 비어 있어요.')
  if (!(r.effort > 0)) w.push('Effort가 0이면 나눌 수 없어요. 아주 작아도 0.5인월로 적어요.')
  if (!(r.reach > 0)) w.push('Reach가 0이에요. “분기 동안 이 기능을 만나는 사람 수”를 숫자로 적어요.')
  if (r.conf === 50 && r.impact >= 2) w.push('기대는 큰데 확신은 50%예요. 크게 만들기 전에 작은 실험으로 근거부터 모아요.')
  if (!r.why.trim()) w.push('근거 칸이 비었어요. 숫자의 출처가 없으면 회의에서 바로 깨져요.')
  return w
}

function Rice({ rows, setRows }: { rows: Row[]; setRows: (f: (r: Row[]) => Row[]) => void }) {
  const nextId = useRef(100)
  const ranked = useMemo(() => [...rows].sort((a, b) => score(b) - score(a)), [rows])
  const rankOf = (id: number) => ranked.findIndex(r => r.id === id) + 1
  const max = Math.max(1, ...rows.map(score))
  const upd = (id: number, patch: Partial<Row>) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
  const csv = toCSV([
    ['순위', '항목', 'Reach(분기·명)', 'Impact', 'Confidence(%)', 'Effort(인월)', 'RICE 점수', '근거'],
    ...ranked.map((r, i) => [i + 1, r.name, r.reach, r.impact, r.conf, r.effort, Math.round(score(r) * 10) / 10, r.why]),
  ])
  const warnings = rows.flatMap(r => lintRow(r).map(m => [r.name || '(이름 없음)', m] as const))
  const top = ranked[0]

  return (
    <>
      <div className="pr-formula" aria-label="RICE 공식">
        <span><b>R</b>each</span><i>×</i><span><b>I</b>mpact</span><i>×</i><span><b>C</b>onfidence</span><i>÷</i><span><b>E</b>ffort</span>
        <em>= 점수</em>
      </div>
      <div className="pr-table-wrap">
        <table className="pr-rice">
          <thead>
            <tr>
              <th style={{ width: 48 }}>순위</th>
              <th>항목 · 근거</th>
              <th style={{ width: 104 }}>Reach<small>분기·명</small></th>
              <th style={{ width: 150 }}>Impact</th>
              <th style={{ width: 176 }}>Confidence</th>
              <th style={{ width: 92 }}>Effort<small>인월</small></th>
              <th style={{ width: 92 }} className="num">점수</th>
              <th style={{ width: 40 }}><span className="sr">삭제</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const bad = lintRow(r).length > 0
              return (
                <tr key={r.id} data-row={r.id} className={bad ? 'has-warn' : ''}>
                  <td><span className={'pr-rank r' + rankOf(r.id)}>{rankOf(r.id)}</span></td>
                  <td>
                    <input className="pr-in name" value={r.name} aria-label="항목 이름" onChange={e => upd(r.id, { name: e.target.value })} />
                    <input className="pr-in why" value={r.why} aria-label="근거" placeholder="숫자의 근거 (데이터 출처)" onChange={e => upd(r.id, { why: e.target.value })} />
                  </td>
                  <td><input className="pr-in num" type="number" min={0} step={100} value={r.reach} aria-label="Reach" data-f="reach" onChange={e => upd(r.id, { reach: Math.max(0, +e.target.value) })} /></td>
                  <td>
                    <select className="pr-in" value={r.impact} aria-label="Impact" data-f="impact" onChange={e => upd(r.id, { impact: +e.target.value })}>
                      {IMPACT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="pr-in" value={r.conf} aria-label="Confidence" data-f="conf" onChange={e => upd(r.id, { conf: +e.target.value })}>
                      {CONF.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td><input className="pr-in num" type="number" min={0} step={0.5} value={r.effort} aria-label="Effort" data-f="effort" onChange={e => upd(r.id, { effort: Math.max(0, +e.target.value) })} /></td>
                  <td className="num"><b className="pr-score">{r.effort > 0 ? fmt(score(r)) : '—'}</b></td>
                  <td><button type="button" className="pr-x" aria-label={r.name + ' 삭제'} onClick={() => setRows(rs => rs.filter(x => x.id !== r.id))}>×</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="pr-bar-row">
        <div className="pr-btns">
          <button type="button" className="btn sm" onClick={() => setRows(rs => [...rs, { id: nextId.current++, name: '새 항목', reach: 1000, impact: 1, conf: 80, effort: 1, why: '' }])}>+ 행 추가</button>
          <button type="button" className="btn ghost sm" onClick={() => setRows(() => [...ranked])}>표를 점수순으로 정렬</button>
          <button type="button" className="btn ghost sm" onClick={() => setRows(() => SEED.map(r => ({ ...r })))}>예시로 되돌리기</button>
        </div>
        <div className="pr-btns">
          <CopyBtn text={csv.slice(1)} label="CSV 복사" />
          <button type="button" className="btn ghost sm" data-export="rice" onClick={() => download('오늘반찬_RICE.csv', csv, 'text/csv;charset=utf-8')}>CSV 내려받기</button>
        </div>
      </div>

      <div className="pr-ranked" aria-label="점수순 결과">
        <div className="pr-sub">점수순 결과 <span className="muted">입력하면 바로 다시 줄 세워요</span></div>
        <ol>
          {ranked.map((r, i) => (
            <li key={r.id}>
              <span className="pr-rank-n">{i + 1}</span>
              <span className="pr-ranked-name">{r.name || '(이름 없음)'}</span>
              <span className="pr-ranked-bar"><i style={{ width: (score(r) / max) * 100 + '%' }} /></span>
              <b>{fmt(score(r))}</b>
            </li>
          ))}
        </ol>
      </div>
      {warnings.length > 0 && (
        <Note tone="warn">
          <b>점검할 곳 {warnings.length}개</b>
          <ul className="pr-warn">{warnings.map(([n, m], i) => <li key={i}><b>{n}</b> — {m}</li>)}</ul>
        </Note>
      )}
      {top && (
        <Note tone="tip">
          <b>1위는 “{top.name}”({fmt(score(top))}점)이에요.</b> 그래도 점수는 회의의 <b>출발점</b>이지 결론이 아니에요. 2위와 점수 차가 작으면 둘 다 근거를 다시 보고, 점수가 낮은데 꼭 해야 하는 일(법 규정, 장애 대응)은 RICE 밖에서 따로 다뤄요.
        </Note>
      )}
    </>
  )
}

/* ---------- MoSCoW ---------- */
type Col = 'M' | 'S' | 'C' | 'W'
const COLS: { id: Col; name: string; ko: string; q: string }[] = [
  { id: 'M', name: 'Must', ko: '꼭 있어야 함', q: '없으면 이번 출시를 미루나요?' },
  { id: 'S', name: 'Should', ko: '중요하지만 미룰 수 있음', q: '빠지면 아프지만 우회로가 있나요?' },
  { id: 'C', name: 'Could', ko: '여유 있으면', q: '일정이 남을 때만 하나요?' },
  { id: 'W', name: "Won't", ko: '이번엔 안 함', q: '“영원히 안 함”이 아니라 “이번엔 안 함”이에요.' },
]
type Card = { id: number; text: string; col: Col; sure?: boolean }
const MSEED: Card[] = [
  { id: 1, text: '최근 주문 목록 (6개월)', col: 'M', sure: true },
  { id: 2, text: '“다시 담기” 버튼', col: 'M', sure: true },
  { id: 3, text: '품절 반찬 대체 안내', col: 'M' },
  { id: 4, text: '주문 메모 그대로 가져오기', col: 'S' },
  { id: 5, text: '재주문 알림 푸시', col: 'S' },
  { id: 6, text: '자주 산 반찬 즐겨찾기', col: 'C' },
  { id: 7, text: '재주문 전용 쿠폰', col: 'C' },
  { id: 8, text: '반찬 정기 배송', col: 'W' },
]
const ORDER: Col[] = ['M', 'S', 'C', 'W']

function Moscow() {
  const [cards, setCards] = useState<Card[]>(MSEED)
  const [over, setOver] = useState<Col | null>(null)
  const [msg, setMsg] = useState('카드를 끌어다 놓거나, 카드에 포커스를 두고 ← → 키(또는 1~4)로 옮겨요.')
  const [draft, setDraft] = useState('')
  const focusId = useRef<number | null>(null)
  const nextId = useRef(100)
  const refs = useRef(new Map<number, HTMLLIElement>())

  useEffect(() => {
    if (focusId.current != null) { refs.current.get(focusId.current)?.focus(); focusId.current = null }
  })

  const move = (id: number, col: Col, keepFocus = false) => {
    const c = cards.find(x => x.id === id)
    if (!c || c.col === col) return
    setCards(cs => cs.map(x => (x.id === id ? { ...x, col, sure: col === 'M' ? x.sure : undefined } : x)))
    const name = COLS.find(k => k.id === col)!.name
    setMsg(`“${c.text}”을(를) ${name}(으)로 옮겼어요.` + (col === 'M' ? ' 없으면 출시 불가인지 확인해 주세요.' : ''))
    if (keepFocus) focusId.current = id
  }
  const onKey = (e: KeyboardEvent, c: Card) => {
    const i = ORDER.indexOf(c.col)
    if (e.key === 'ArrowRight' && i < 3) { e.preventDefault(); move(c.id, ORDER[i + 1], true) }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); move(c.id, ORDER[i - 1], true) }
    else if (['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); move(c.id, ORDER[+e.key - 1], true) }
    else if (e.key === 'Delete') { e.preventDefault(); setCards(cs => cs.filter(x => x.id !== c.id)); setMsg(`“${c.text}”을(를) 지웠어요.`) }
  }
  const onDrop = (e: DragEvent, col: Col) => {
    e.preventDefault(); setOver(null)
    const id = +e.dataTransfer.getData('text/plain')
    if (id) move(id, col)
  }
  const add = () => {
    const t = draft.trim(); if (!t) return
    setCards(cs => [...cs, { id: nextId.current++, text: t, col: 'S' }]); setDraft('')
    setMsg(`“${t}”을(를) Should에 추가했어요. 알맞은 칸으로 옮겨 주세요.`)
  }
  const unsure = cards.filter(c => c.col === 'M' && !c.sure)
  const md = '# 재주문 기능 v1 출시 범위 (MoSCoW)\n\n' + COLS.map(k => `## ${k.name} — ${k.ko}\n` + (cards.filter(c => c.col === k.id).map(c => `- ${c.text}`).join('\n') || '- (없음)')).join('\n\n') +
    '\n\n> Won\'t는 “이번 출시에서는 안 함”이에요. 다음 분기 백로그에서 다시 봐요.\n'

  return (
    <>
      <div className="pr-board">
        {COLS.map(k => (
          <div key={k.id} className={'pr-col c-' + k.id + (over === k.id ? ' over' : '')} data-col={k.id}
            onDragOver={e => { e.preventDefault(); setOver(k.id) }} onDragLeave={() => setOver(o => (o === k.id ? null : o))} onDrop={e => onDrop(e, k.id)}>
            <header><b>{k.name}</b><span>{k.ko}</span><em>{cards.filter(c => c.col === k.id).length}</em></header>
            <p className="pr-col-q">{k.q}</p>
            <ul>
              {cards.filter(c => c.col === k.id).map(c => {
                const i = ORDER.indexOf(c.col)
                return (
                  <li key={c.id} ref={el => { if (el) refs.current.set(c.id, el); else refs.current.delete(c.id) }} tabIndex={0} draggable data-card={c.id}
                    aria-label={`${c.text}, ${k.name}. 좌우 화살표로 옮기기`}
                    onDragStart={e => { e.dataTransfer.setData('text/plain', String(c.id)); e.dataTransfer.effectAllowed = 'move' }}
                    onKeyDown={e => onKey(e, c)} className={c.col === 'M' && !c.sure ? 'unsure' : ''}>
                    <span className="pr-card-text">{c.text}</span>
                    {c.col === 'M' && (
                      <label className="pr-sure">
                        <input type="checkbox" checked={!!c.sure} onChange={e => setCards(cs => cs.map(x => (x.id === c.id ? { ...x, sure: e.target.checked } : x)))} />
                        없으면 출시 불가 확인
                      </label>
                    )}
                    <span className="pr-card-move">
                      <button type="button" tabIndex={-1} aria-hidden="true" disabled={i === 0} onClick={() => move(c.id, ORDER[i - 1])}>‹</button>
                      <button type="button" tabIndex={-1} aria-hidden="true" disabled={i === 3} onClick={() => move(c.id, ORDER[i + 1])}>›</button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="pr-live muted" role="status" aria-live="polite">{msg}</p>
      <div className="pr-bar-row">
        <form className="pr-add" onSubmit={e => { e.preventDefault(); add() }}>
          <input className="pr-in" value={draft} onChange={e => setDraft(e.target.value)} placeholder="카드 추가 (예: 배송지 변경)" aria-label="새 카드" />
          <button type="submit" className="btn sm">추가</button>
        </form>
        <div className="pr-btns">
          <CopyBtn text={md} label="마크다운 복사" />
          <button type="button" className="btn ghost sm" data-export="moscow" onClick={() => download('재주문_출시범위_MoSCoW.md', md, 'text/markdown;charset=utf-8')}>.md 내려받기</button>
        </div>
      </div>
      {unsure.length > 0
        ? <Note tone="warn"><b>Must인데 아직 확인 안 한 카드 {unsure.length}개:</b> {unsure.map(c => '“' + c.text + '”').join(', ')}. 회의에서 “이게 없으면 출시를 미룰 건가요?”라고 한 번 더 물어요. 아니라는 답이 나오면 Should로 내려요.</Note>
        : <Note tone="tip"><b>Must 카드 모두 확인했어요.</b> 이제 Must만으로 일정 안에 들어가는지 개발 공수를 다시 물어봐요.</Note>}
    </>
  )
}

/* ---------- 가치 vs 노력 2×2 ---------- */
const QUAD = {
  qw: ['빨리 하기', 'Quick win', '가치는 크고 노력은 적어요. 이번 스프린트 후보 1순위예요.'],
  bb: ['크게 걸기', 'Big bet', '가치도 노력도 커요. 쪼개서 MVP부터 검증해요.'],
  fi: ['틈틈이', 'Fill-in', '작고 쉬워요. 여유 있을 때 끼워 넣어요.'],
  mp: ['다시 보기', 'Money pit', '노력은 큰데 가치가 작아요. 정말 해야 하는지 먼저 물어요.'],
} as const
type QK = keyof typeof QUAD

function Matrix({ rows }: { rows: Row[] }) {
  const [sel, setSel] = useState<number | null>(rows[0]?.id ?? null)
  const val = (r: Row) => r.reach * r.impact * (r.conf / 100)
  const maxV = Math.max(1, ...rows.map(val)), maxE = Math.max(0.5, ...rows.map(r => r.effort))
  const pos = (r: Row) => ({ x: Math.min(1, r.effort / maxE), y: Math.min(1, val(r) / maxV) })
  const quad = (r: Row): QK => { const p = pos(r); return p.y >= 0.5 ? (p.x < 0.5 ? 'qw' : 'bb') : (p.x < 0.5 ? 'fi' : 'mp') }
  const cur = rows.find(r => r.id === sel)
  return (
    <div className="pr-mx-wrap">
      <div className="pr-mx" role="group" aria-label="가치 대 노력 매트릭스">
        <div className="pr-mx-q qw"><b>{QUAD.qw[0]}</b><small>{QUAD.qw[1]}</small></div>
        <div className="pr-mx-q bb"><b>{QUAD.bb[0]}</b><small>{QUAD.bb[1]}</small></div>
        <div className="pr-mx-q fi"><b>{QUAD.fi[0]}</b><small>{QUAD.fi[1]}</small></div>
        <div className="pr-mx-q mp"><b>{QUAD.mp[0]}</b><small>{QUAD.mp[1]}</small></div>
        <span className="pr-mx-ax y">가치 →</span>
        <span className="pr-mx-ax x">노력 →</span>
        {rows.map((r, i) => {
          const p = pos(r)
          return (
            <button key={r.id} type="button" className={'pr-dot' + (sel === r.id ? ' on' : '')} aria-pressed={sel === r.id}
              style={{ left: `calc(22px + (100% - 22px) * ${(0.06 + p.x * 0.88).toFixed(3)} - 14px)`, bottom: `calc(22px + (100% - 22px) * ${(0.06 + p.y * 0.88).toFixed(3)} - 14px)` }}
              onClick={() => setSel(r.id)} aria-label={r.name}>{i + 1}</button>
          )
        })}
      </div>
      <div className="pr-mx-side">
        <ol className="pr-mx-legend">
          {rows.map((r, i) => <li key={r.id}><button type="button" className={sel === r.id ? 'on' : ''} onClick={() => setSel(r.id)}><span>{i + 1}</span>{r.name}</button></li>)}
        </ol>
        {cur && (
          <div className={'pr-mx-pick q-' + quad(cur)} aria-live="polite">
            <small>{QUAD[quad(cur)][1]}</small>
            <b>{cur.name} → {QUAD[quad(cur)][0]}</b>
            <p>{QUAD[quad(cur)][2]}</p>
          </div>
        )}
        <p className="muted">가치 = Reach × Impact × Confidence, 노력 = Effort예요. 위 RICE 표를 고치면 점도 움직여요. 위치는 이 목록 안에서의 <b>상대 비교</b>예요.</p>
      </div>
    </div>
  )
}

/* ---------- 회의 ---------- */
const STEPS: [string, string][] = [
  ['하루 전', '후보 목록과 RICE 초안을 미리 공유해요. “숫자가 틀렸으면 회의 전에 알려 주세요.”'],
  ['5분', '이번 분기 목표(예: 재구매율)부터 다시 읽어요. 기준이 같아야 싸우지 않아요.'],
  ['15분', '점수가 크게 갈리는 항목만 토론해요. 근거가 약한 칸(Confidence 50%)을 먼저 봐요.'],
  ['10분', 'MoSCoW로 이번 출시 범위를 합의해요. Must 카드마다 “없으면 출시 불가?”를 물어요.'],
  ['5분', '결정, 빠진 항목, 다음에 다시 볼 날짜를 회의록에 남겨요.'],
]
const SAY: { who: string; bad: string; good: string }[] = [
  { who: '대표님이 새 아이디어를 바로 넣자고 할 때', bad: '“네, 바로 넣을게요.”', good: '“좋은 아이디어예요. 같은 기준으로 RICE에 넣어 보면 지금 2위와 비교할 수 있어요. 금요일까지 Reach 숫자를 뽑아서 다시 말씀드릴게요.”' },
  { who: '영업팀이 “고객이 원해요”라고 할 때', bad: '“그건 근거가 없어서 안 돼요.”', good: '“몇 곳에서 요청했는지 알려 주시면 Reach에 반영할게요. 지금은 Confidence를 50%로 두고, 요청이 쌓이면 올릴게요.”' },
  { who: '개발에서 “생각보다 오래 걸려요”라고 할 때', bad: '“그래도 이번에 꼭 해야 해요.”', good: '“Effort가 1인월에서 3인월이면 순위가 3위로 내려가요. 범위를 줄여서 1인월 안에 되는 버전이 있을까요?”' },
  { who: '우선순위에서 빠진 팀에게 알릴 때', bad: '“이번엔 우선순위가 낮아서요.”', good: '“이번 분기 목표가 재구매율이라 재주문 기능이 먼저예요. 요청하신 기능은 Won’t(이번엔 안 함)에 기록했고, 7월 계획 때 다시 올릴게요.”' },
]

export default function Tab() {
  const [rows, setRows] = useState<Row[]>(() => SEED.map(r => ({ ...r })))
  const [sayIdx, setSayIdx] = useState(0)
  return (
    <div data-plan="priority">
      <SysGrid>
        <Section id="plan-priority-why" wide title="무엇을 먼저 만들까" desc="우선순위는 “무엇을 할까”보다 “무엇을 안 할까”를 정하는 일이에요.">
          <div className="pr-intro">
            <div className="pr-quote">
              <b>주니어가 자주 하는 실수</b>
              <p>목소리 큰 사람의 요청부터 넣고, 나머지는 전부 “Must”라고 적어요. 그러면 회의 때마다 순서가 바뀌고, 왜 그 순서인지 아무도 설명하지 못해요.</p>
            </div>
            <ul className="pr-points">
              <li><b>같은 자로 재요.</b> 모든 후보를 같은 기준(도달·효과·확신·공수)으로 숫자를 매겨야 비교가 돼요.</li>
              <li><b>근거를 적어요.</b> 숫자 옆에 출처를 써 두면 “왜 이게 1위예요?”에 바로 답할 수 있어요.</li>
              <li><b>범위를 합의해요.</b> 순위가 정해져도 “이번 출시에 어디까지 넣을까”는 따로 합의해야 해요.</li>
            </ul>
          </div>
        </Section>

        <Section id="plan-priority-rice" wide title="RICE 계산기" desc="Intercom이 공개한 방식이에요. 오늘반찬 다음 분기 백로그 5개를 채워 두었어요. 값을 바꾸면 점수와 순위가 바로 바뀌어요.">
          <Rice rows={rows} setRows={setRows} />
          <div className="pr-scales">
            <div><b>Reach</b><p>정한 기간(보통 분기) 동안 이 기능을 만나는 사람 수예요. “많음” 대신 “4,000명”처럼 적어요.</p></div>
            <div><b>Impact</b><p>한 사람에게 주는 효과예요. 3 엄청 큼 · 2 큼 · 1 보통 · 0.5 작음 · 0.25 아주 작음, 다섯 단계만 써요.</p></div>
            <div><b>Confidence</b><p>위 숫자를 얼마나 믿는지예요. 100% 데이터 있음 · 80% 근거 일부 · 50% 감. 50% 아래는 아이디어 단계로 따로 둬요.</p></div>
            <div><b>Effort</b><p>기획·디자인·개발·QA 모두 합친 인월(한 사람이 한 달 일하는 양)이에요. 아주 작으면 0.5로 적어요.</p></div>
          </div>
          <GoodBad
            bad={<div className="pr-ex"><code>재주문 버튼 | Reach: 많음 | Impact: 3 | Confidence: 100% | Effort: ?</code><p>모든 칸이 감이에요. “많음”은 계산할 수 없고, 데이터 없이 100%를 주면 Confidence가 의미를 잃어요.</p></div>}
            good={<div className="pr-ex"><code>재주문 버튼 | Reach: 4,000명/분기 | Impact: 2 | Confidence: 80% | Effort: 1인월</code><p>Reach는 “지난 분기 2회 이상 주문한 구매자 수”, Impact는 “재주문까지 탭 6번 → 2번 예상”, Effort는 “FE 2주 + BE 1주 + QA 1주”로 근거를 함께 적었어요.</p></div>}
          />
        </Section>

        <Section id="plan-priority-moscow" wide title="MoSCoW 보드 — 이번 출시 범위 합의" desc="오늘반찬 ‘재주문 기능 v1’에 넣을 것을 네 칸으로 나눠요. 카드를 끌어다 놓거나, 키보드(← → 또는 1~4)로 옮겨요. 모바일에서는 ‹ › 버튼을 눌러요.">
          <Moscow />
        </Section>

        <Section id="plan-priority-when" wide title="언제 무엇을 쓸까" desc="세 도구는 경쟁 관계가 아니에요. 질문이 다를 뿐이에요.">
          <div className="pr-table-wrap">
            <table className="sys-table pr-cmp">
              <thead><tr><th style={{ width: '16%' }}>도구</th><th>답하는 질문</th><th>잘 맞을 때</th><th>함정</th></tr></thead>
              <tbody>
                <tr><td><b>RICE</b></td><td>여러 후보 중 무엇이 더 가치 있나요? <span className="m">비교·설득용 숫자</span></td><td>후보가 5개 이상이고, 이해관계자에게 순서를 설명해야 할 때</td><td>숫자가 정확해 보여서 감으로 넣은 값도 믿게 돼요. 근거 칸을 꼭 채워요.</td></tr>
                <tr><td><b>MoSCoW</b></td><td>이번 출시에 어디까지 넣나요? <span className="m">범위 합의</span></td><td>마감이 정해진 출시에서 팀이 같은 그림을 볼 때</td><td>모두 Must가 되기 쉬워요. Must마다 “없으면 출시 불가?”를 물어요.</td></tr>
                <tr><td><b>가치 vs 노력 2×2</b></td><td>대충 어디부터 손댈까요? <span className="m">빠른 감 잡기</span></td><td>워크숍이나 첫 회의에서 10분 안에 정리할 때</td><td>칸 경계가 주관적이에요. 결정 근거로 쓰기엔 거칠어요.</td></tr>
              </tbody>
            </table>
          </div>
          <Matrix rows={rows} />
          <Note>이 순서로 많이 써요: <b>2×2로 감을 잡고</b> → 후보가 좁혀지면 <b>RICE로 순위를 설명</b>하고 → 출시 직전에 <b>MoSCoW로 범위를 합의</b>해요.</Note>
        </Section>

        <Section id="plan-priority-meeting" title="우선순위 회의 진행법" desc="40분 회의 기준이에요. 회의 전에 이미 절반이 끝나 있어야 해요.">
          <ol className="pr-steps">
            {STEPS.map(([t, d], i) => <li key={i}><span>{t}</span><p>{d}</p></li>)}
          </ol>
          <Note tone="tip">회의 결과는 <a href="#/plan/collab">협업 · 소통</a> 탭의 회의록 템플릿에 “결정 / 빠진 항목 / 다시 볼 날짜”로 남겨요.</Note>
        </Section>

        <Section id="plan-priority-say" title="이해관계자 설득 문장" desc="“안 돼요” 대신 기준과 다음 행동을 함께 말해요.">
          <Seg value={sayIdx} onChange={setSayIdx} options={SAY.map((_s, i) => [i, ['대표님', '영업팀', '개발', '빠진 팀'][i]] as const)} />
          <p className="pr-say-who">{SAY[sayIdx].who}</p>
          <GoodBad key={sayIdx} badLabel="막는 말" goodLabel="설득하는 말"
            bad={<p className="pr-say">{SAY[sayIdx].bad}</p>}
            good={<p className="pr-say">{SAY[sayIdx].good}</p>} />
        </Section>

        <Section id="plan-priority-check" title="사수의 체크리스트" desc="우선순위 문서를 리뷰할 때 제가 실제로 묻는 질문이에요.">
          <Checklist name="우선순위 리뷰 체크리스트" items={[
            ['이번 분기 목표와 연결되나요?', '목표가 재구매율이면, 신규 가입 기능이 1위인 이유를 설명할 수 있어야 해요.'],
            ['Reach가 숫자이고 기간이 같나요?', '어떤 건 월, 어떤 건 분기면 비교가 틀어져요.'],
            ['Confidence 100%에 데이터가 있나요?', '데이터 없이 100%면 80%로 내려요.'],
            ['Effort를 개발·디자인에게 직접 물었나요?', '기획자가 혼자 추정한 공수는 거의 항상 작아요.'],
            ['Must 카드마다 “없으면 출시 불가”인가요?', '아니라면 Should예요.'],
            ['Won’t를 기록했나요?', '빠진 항목과 다시 볼 날짜를 남겨야 같은 요청이 반복되지 않아요.'],
            ['점수 밖에서 해야 할 일을 따로 뒀나요?', '법 규정, 보안, 장애 대응은 점수와 상관없이 먼저 해요.'],
          ]} />
        </Section>

        <Section id="plan-priority-ref" title="참고" desc="확인된 자료만 적었어요.">
          <ul className="pr-ref">
            <li><b>Intercom</b> — Sean McBride, “RICE: Simple prioritization for product managers”. Impact·Confidence 단계와 인월 Effort가 여기서 왔어요.</li>
            <li><b>MoSCoW</b> — Dai Clegg가 만들고 DSDM(애자일 방법론)에서 널리 쓰인 분류예요.</li>
            <li><b>Atlassian Agile Coach</b> — 백로그 관리와 우선순위 정하기 글.</li>
            <li><b>Marty Cagan, 『인스파이어드』(SVPG)</b> — 로드맵보다 문제와 결과(outcome)를 먼저 보라는 관점.</li>
            <li>함께 보기: <a href="#/laws/laws-hick">힉의 법칙</a> — 한 번에 보여주는 선택지를 줄이는 것도 우선순위의 결과예요.</li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
