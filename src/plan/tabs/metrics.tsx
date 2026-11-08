import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Note, Section, SysGrid } from '../../system/ui'
import { Seg } from '../../components/ui'
import { download } from '../../system/export'
import './metrics.css'

/* ---------- 공용 작은 도구 ---------- */
const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
const toCSV = (rows: (string | number)[][]) => '﻿' + rows.map(r => r.map(cell).join(',')).join('\n')
const n0 = (n: number) => n.toLocaleString('ko-KR')
const pct = (v: number) => (Number.isFinite(v) ? (v * 100).toFixed(1) + '%' : '—')

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
    <div className="mt-gb">
      <Seg value={v} onChange={setV} options={[['bad', '✕ ' + badLabel], ['good', '✓ ' + goodLabel]]} />
      <div className={'mt-gb-body is-' + v} aria-live="polite">{v === 'bad' ? bad : good}</div>
    </div>
  )
}

function Checklist({ items, name }: { items: [string, string][]; name: string }) {
  const [on, setOn] = useState<Set<number>>(new Set())
  const md = `# ${name}\n\n` + items.map(([q, w]) => `- [ ] ${q}\n  - ${w}`).join('\n')
  return (
    <div className="mt-check">
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
      <div className="mt-row">
        <div className="mt-progress" aria-live="polite"><i style={{ width: (on.size / items.length) * 100 + '%' }} /><span>{on.size} / {items.length}</span></div>
        <CopyBtn text={md} label="마크다운 복사" />
      </div>
    </div>
  )
}

/* ---------- AARRR 퍼널 ---------- */
type Stage = { k: string; en: string; ko: string; def: string; n: number; metrics: string }
const FUNNEL: Stage[] = [
  { k: 'acq', en: 'Acquisition', ko: '획득', def: '앱 첫 방문 (설치·웹 유입)', n: 20000, metrics: '유입 수 · 채널별 유입 · CAC(고객 한 명을 데려오는 비용)' },
  { k: 'act', en: 'Activation', ko: '활성화', def: '회원가입 후 첫 장바구니 담기', n: 6000, metrics: '가입 완료율 · 첫 핵심 행동(첫 장바구니, 첫 주문)까지 걸린 시간' },
  { k: 'ret', en: 'Retention', ko: '유지', def: '14일 안에 다시 방문', n: 3300, metrics: '재방문율 · DAU/MAU · 코호트 잔존율' },
  { k: 'rev', en: 'Revenue', ko: '매출', def: '첫 결제 완료', n: 1200, metrics: 'CVR(구매 전환율) · ARPU(1인당 매출) · LTV(고객 생애 가치)' },
  { k: 'ref', en: 'Referral', ko: '추천', def: '친구 초대 링크 보내기', n: 180, metrics: '초대 수 · 초대 수락률 · 바이럴 계수' },
]

function Funnel() {
  const [st, setSt] = useState<Stage[]>(() => FUNNEL.map(s => ({ ...s })))
  const [mode, setMode] = useState<'rate' | 'count'>('rate')
  const upd = (i: number, p: Partial<Stage>) => setSt(a => a.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const top = Math.max(1, st[0].n)
  const steps = st.slice(1).map((s, i) => {
    const prev = st[i].n
    const conv = prev > 0 ? s.n / prev : NaN
    return { i: i + 1, conv, drop: 1 - conv, lost: Math.max(0, prev - s.n), over: s.n > prev }
  })
  const valid = steps.filter(s => Number.isFinite(s.conv))
  const leak = valid.length ? valid.reduce((a, b) => (mode === 'rate' ? (b.drop > a.drop ? b : a) : (b.lost > a.lost ? b : a))) : null
  const csv = toCSV([
    ['단계', '영문', '정의', '인원', '이전 단계 전환율', '이탈률', '이탈 인원', '첫 단계 대비'],
    ...st.map((s, i) => {
      const step = steps[i - 1]
      return [s.ko, s.en, s.def, s.n, i ? pct(step.conv) : '', i ? pct(step.drop) : '', i ? step.lost : '', pct(s.n / top)]
    }),
  ])

  return (
    <>
      <div className="mt-row">
        <Seg value={mode} onChange={setMode} options={[['rate', '이탈률로 보기'], ['count', '이탈 인원으로 보기']]} />
        <div className="mt-btns">
          <button type="button" className="btn ghost sm" onClick={() => setSt(FUNNEL.map(s => ({ ...s })))}>예시로 되돌리기</button>
          <button type="button" className="btn ghost sm" data-export="funnel" onClick={() => download('오늘반찬_AARRR_퍼널.csv', csv, 'text/csv;charset=utf-8')}>CSV 내려받기</button>
        </div>
      </div>
      <div className="mt-funnel">
        {st.map((s, i) => {
          const step = i ? steps[i - 1] : null
          const isLeak = !!step && leak?.i === step.i
          return (
            <div key={s.k} className="mt-stage-wrap">
              {step && (
                <div className={'mt-gap' + (isLeak ? ' leak' : '') + (step.over ? ' over' : '')} data-leak={isLeak || undefined}>
                  <span className="mt-gap-arrow" aria-hidden="true">↓</span>
                  <b>{pct(step.conv)} 전환</b>
                  <span>{step.over ? '앞 단계보다 많아요 — 같은 사람 집합인지 정의를 확인해요' : `${pct(step.drop)} 이탈 · ${n0(step.lost)}명`}</span>
                  {isLeak && <em>가장 큰 누수</em>}
                </div>
              )}
              <div className={'mt-stage' + (isLeak ? ' leak' : '')}>
                <div className="mt-stage-label"><b>{s.ko}</b><small>{s.en}</small></div>
                <div className="mt-stage-bar"><i className={(s.n / top) * 100 < 22 ? 'tiny' : ''} style={{ width: Math.max(3, Math.min(100, (s.n / top) * 100)) + '%' }}><span>{pct(s.n / top)}</span></i></div>
                <div className="mt-stage-in">
                  <input className="mt-in num" type="number" min={0} value={s.n} aria-label={s.ko + ' 인원'} data-stage={s.k} onChange={e => upd(i, { n: Math.max(0, +e.target.value) })} />
                  <input className="mt-in def" value={s.def} aria-label={s.ko + ' 정의'} onChange={e => upd(i, { def: e.target.value })} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {leak && (
        <Note tone="warn">
          <b>가장 큰 누수: {st[leak.i - 1].ko} → {st[leak.i].ko}</b> ({mode === 'rate' ? `${pct(leak.drop)}가 빠져요` : `${n0(leak.lost)}명이 빠져요`}).{' '}
          {mode === 'rate'
            ? '비율로 보면 뒤쪽 단계가 커 보이기 쉬워요. “이탈 인원으로 보기”로 바꿔서 몇 명을 잃는지도 같이 봐요.'
            : '인원으로 보면 앞쪽 단계가 커 보이기 쉬워요. 앞 단계는 원래 사람이 많으니 비율도 같이 봐요.'}
          {' '}두 기준에서 모두 크게 나오는 곳이 첫 번째 실험 후보예요.
        </Note>
      )}
      <div className="mt-scroll">
        <table className="sys-table mt-metric-table">
          <thead><tr><th style={{ width: '18%' }}>단계</th><th>대표 지표</th><th style={{ width: '34%' }}>오늘반찬에서 묻는 질문</th></tr></thead>
          <tbody>
            {st.map((s, i) => (
              <tr key={s.k}>
                <td><b>{s.ko}</b> <span className="muted">{s.en}</span></td>
                <td>{s.metrics}</td>
                <td>{['어느 채널에서 온 사람이 첫 주문까지 가나요?', '가입하고 첫 반찬을 담기까지 어디서 멈추나요?', '첫 주문 후 2주 안에 다시 오나요?', '첫 결제까지 무엇이 막나요?', '이웃에게 소개하고 싶은 순간은 언제인가요?'][i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>단계 순서는 서비스마다 달라요. 오늘반찬처럼 첫 주문이 곧 매출인 서비스는 매출이 유지보다 먼저 오기도 해요. 중요한 건 <b>단계마다 “누가 그 단계에 들어갔다”는 정의를 한 줄로 적는 것</b>이에요.</Note>
    </>
  )
}

/* ---------- 북극성 · 가드레일 ---------- */
const NODES: { id: string; kind: 'ns' | 'in' | 'gr'; name: string; why: string }[] = [
  { id: 'ns', kind: 'ns', name: '주간 주문 완료 구매자 수', why: '구매자는 반찬을 받았고(고객 가치), 사장님과 우리는 매출이 생겼어요(사업 가치). 둘이 동시에 움직이는 숫자라서 북극성으로 골랐어요. 주 단위인 이유는 반찬이 매일이 아니라 주 1~2회 사는 물건이라서예요.' },
  { id: 'i1', kind: 'in', name: '신규 구매자의 첫 주문 전환율', why: '북극성을 키우는 입력 지표예요. 획득·활성화 팀이 매일 보는 숫자예요.' },
  { id: 'i2', kind: 'in', name: '2주 내 재주문율', why: '재주문 기능이 직접 움직이려는 숫자예요. 유지 단계를 대표해요.' },
  { id: 'i3', kind: 'in', name: '장바구니 → 결제 완료율', why: '결제 단계의 마찰을 보여줘요. 결제 수단 추가 같은 과제로 움직여요.' },
  { id: 'g1', kind: 'gr', name: '주문 취소율', why: '쿠폰으로 주문을 억지로 늘리면 취소가 같이 늘 수 있어요. 북극성이 올라도 이 숫자가 나빠지면 멈춰요.' },
  { id: 'g2', kind: 'gr', name: '배송 지연율', why: '주문이 몰리면 사장님과 배송이 버티지 못해요. 성장의 부작용을 잡는 숫자예요.' },
  { id: 'g3', kind: 'gr', name: 'CS 문의율 (주문 100건당)', why: '화면을 바꾼 뒤 헷갈리는 사람이 늘었는지 알려줘요.' },
  { id: 'g4', kind: 'gr', name: '사장님 주문 거절률', why: '구매자만 보다 보면 공급자(사장님) 쪽이 무너질 수 있어요.' },
]
function NorthStar() {
  const [sel, setSel] = useState('ns')
  const cur = NODES.find(n => n.id === sel)!
  const btn = (n: (typeof NODES)[number]) => (
    <button key={n.id} type="button" className={'mt-node k-' + n.kind + (sel === n.id ? ' on' : '')} aria-pressed={sel === n.id} onClick={() => setSel(n.id)}>{n.name}</button>
  )
  return (
    <>
      <div className="mt-tree">
        <div className="mt-tree-col"><small>입력 지표 · 팀이 매일 움직이는 숫자</small>{NODES.filter(n => n.kind === 'in').map(btn)}</div>
        <div className="mt-tree-ns"><small>북극성 지표</small>{btn(NODES[0])}</div>
        <div className="mt-tree-col"><small>가드레일 · 나빠지면 멈추는 숫자</small>{NODES.filter(n => n.kind === 'gr').map(btn)}</div>
      </div>
      <div className={'mt-node-why k-' + cur.kind} aria-live="polite"><b>{cur.name}</b><p>{cur.why}</p></div>
      <GoodBad
        bad={<><b>북극성: 앱 다운로드 수</b><p>올라가도 반찬을 받은 사람이 늘었는지 알 수 없어요. 광고비만 늘려도 오르는 <b>허영 지표</b>예요. 페이지뷰, 누적 가입자 수도 같은 함정이에요.</p></>}
        good={<><b>북극성: 주간 주문 완료 구매자 수 + 가드레일 4개</b><p>고객 가치와 사업 가치가 함께 움직이고, 팀이 행동으로 바꿀 수 있어요. 가드레일이 있어서 “취소율을 희생해 숫자를 올리는” 일을 막아요.</p></>}
      />
    </>
  )
}

/* ---------- 이벤트 택소노미 ---------- */
type Rule = 'oa' | 'ao'
type Ev = { id: number; name: string; desc: string; trigger: string; screen: string; props: string }
const VERBS = ['view', 'click', 'submit', 'complete', 'start', 'add', 'remove', 'fail', 'open', 'close', 'select', 'search', 'share', 'cancel', 'request', 'apply']
const EVSEED: Ev[] = [
  { id: 1, name: 'home_view', desc: '홈 화면이 보였을 때', trigger: '화면 진입 (앱 실행, 탭 이동 포함)', screen: 'HOME-01', props: 'entry_source:string' },
  { id: 2, name: 'reorder_button_click', desc: '주문 내역의 “다시 담기”를 눌렀을 때', trigger: '버튼 클릭 시 (앱에서 기록)', screen: 'ORD-02-01', props: 'order_id:string, item_count:number, days_since_last_order:number' },
  { id: 3, name: 'cart_item_add', desc: '장바구니에 반찬이 담겼을 때', trigger: '담기 API 성공 응답 후', screen: 'MENU-03', props: 'item_id:string, item_price:number, quantity:number, add_source:string' },
  { id: 4, name: 'checkout_button_click', desc: '장바구니에서 주문하기를 눌렀을 때', trigger: '버튼 클릭 시 (앱에서 기록)', screen: 'CART-01', props: 'cart_total:number, item_count:number, user_grade:string' },
  { id: 5, name: 'payment_complete', desc: '결제가 승인됐을 때', trigger: 'PG 승인 후 서버에서 기록', screen: 'PAY-01', props: 'order_id:string, payment_method:string, amount:number, is_reorder:boolean' },
]
const BAD_EVS = ['ReorderBtnClicked', '재주문클릭', 'click-reorder']
const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/
const TYPES = ['string', 'number', 'boolean']

function lintName(name: string, rule: Rule, all: Ev[], id: number): string[] {
  const w: string[] = []
  const n = name.trim()
  if (!n) return ['이름이 비어 있어요.']
  if (/[^\x20-\x7e]/.test(n)) w.push('한글·특수문자는 쓰지 않아요. 영문 소문자, 숫자, _만 써요.')
  if (/[A-Z]/.test(n)) w.push('대문자 금지 — 모두 소문자로 써요 (camelCase ✕).')
  if (/[\s-]/.test(n)) w.push('공백·하이픈 대신 _로 이어요.')
  if (!w.length && !SNAKE.test(n)) w.push('스네이크 케이스(소문자_소문자)가 아니에요. _가 겹치거나 숫자로 시작하지 않는지 봐요.')
  const t = n.toLowerCase().split(/[_\s-]+/).filter(Boolean)
  if (t.length < 2) w.push('대상과 행동, 두 단어 이상이 필요해요.')
  else if (!w.length) {
    if (t.some(x => VERBS.some(v => x === v + 'ed' || x === v + 'd' || x === v + 'ing' || x === v.replace(/e$/, '') + 'ing'))) w.push('과거형·진행형 대신 원형(click, view)으로 써요.')
    const last = t[t.length - 1], first = t[0]
    if (rule === 'oa') {
      if (!VERBS.includes(last)) w.push(VERBS.includes(first) ? '행동이 앞에 있어요 — 이 팀 규칙은 대상_행동(object_action)이에요.' : `마지막 단어가 정해진 행동 단어가 아니에요 (${VERBS.slice(0, 6).join(', ')} …).`)
    } else if (!VERBS.includes(first)) {
      w.push(VERBS.includes(last) ? '행동이 뒤에 있어요 — 이 팀 규칙은 행동_대상(action_object)이에요.' : `첫 단어가 정해진 행동 단어가 아니에요 (${VERBS.slice(0, 6).join(', ')} …).`)
    }
  }
  if (all.some(e => e.id !== id && e.name.trim() === n)) w.push('같은 이름이 이미 있어요. 이벤트 하나는 뜻이 하나예요.')
  return w
}
function parseProps(s: string) {
  return s.split(',').map(x => x.trim()).filter(Boolean).map(x => { const [k, t] = x.split(':').map(y => y?.trim() ?? ''); return { k, t } })
}
function lintRow(e: Ev, rule: Rule, all: Ev[]) {
  const w = lintName(e.name, rule, all, e.id)
  if (!e.trigger.trim()) w.push('발생 시점이 비었어요. “클릭 시”인지 “서버 성공 후”인지 꼭 적어요.')
  if (e.screen.trim() && !/^[A-Z]{2,5}-\d{2}(-\d{2})?$/.test(e.screen.trim())) w.push('화면 ID 형식이 달라요 (예: ORD-02-01). 화면설계서의 ID와 맞춰요.')
  if (!e.screen.trim()) w.push('화면 ID가 비었어요.')
  for (const p of parseProps(e.props)) {
    if (!SNAKE.test(p.k)) w.push(`속성 “${p.k}”도 스네이크 케이스로 써요.`)
    if (!TYPES.includes(p.t)) w.push(`속성 “${p.k}”의 타입을 string·number·boolean 중 하나로 적어요.`)
  }
  return w
}
const flip = (name: string, to: Rule) => {
  if (!SNAKE.test(name)) return name
  const t = name.split('_')
  if (to === 'ao' && VERBS.includes(t[t.length - 1])) return [t[t.length - 1], ...t.slice(0, -1)].join('_')
  if (to === 'oa' && VERBS.includes(t[0])) return [...t.slice(1), t[0]].join('_')
  return name
}

function Taxonomy() {
  const [rule, setRule] = useState<Rule>('oa')
  const [evs, setEvs] = useState<Ev[]>(() => EVSEED.map(e => ({ ...e })))
  const nextId = useRef(100)
  const upd = (id: number, p: Partial<Ev>) => setEvs(a => a.map(e => (e.id === id ? { ...e, ...p } : e)))
  const lints = useMemo(() => new Map(evs.map(e => [e.id, lintRow(e, rule, evs)])), [evs, rule])
  const total = [...lints.values()].reduce((a, b) => a + b.length, 0)
  const csv = toCSV([['event_name', 'description', 'trigger', 'screen_id', 'properties'], ...evs.map(e => [e.name, e.desc, e.trigger, e.screen, e.props])])
  const json = JSON.stringify({
    naming_rule: rule === 'oa' ? 'object_action (snake_case)' : 'action_object (snake_case)',
    events: evs.map(e => ({ event_name: e.name, description: e.desc, trigger: e.trigger, screen_id: e.screen, properties: Object.fromEntries(parseProps(e.props).map(p => [p.k, p.t || 'string'])) })),
  }, null, 2)
  const changeRule = (r: Rule) => setRule(r)
  const convert = () => setEvs(a => a.map(e => ({ ...e, name: flip(e.name.trim(), rule) })))
  const needsFlip = evs.some(e => flip(e.name.trim(), rule) !== e.name.trim())

  return (
    <>
      <div className="mt-rule">
        <div>
          <small>팀 이름 규칙 (하나만 골라 통일해요)</small>
          <Seg value={rule} onChange={changeRule} options={[['oa', <>대상_행동 <code>checkout_button_click</code></>], ['ao', <>행동_대상 <code>click_checkout_button</code></>]]} />
        </div>
        <ul className="mt-rule-list">
          <li>소문자 스네이크 케이스, 영어만</li>
          <li>행동 단어는 정해진 목록에서만: <code>{VERBS.join(' · ')}</code></li>
          <li>속성은 <code>이름:타입</code> (string · number · boolean)</li>
        </ul>
      </div>
      {needsFlip && (
        <Note tone="warn"><b>규칙을 바꿨더니 맞지 않는 이름이 생겼어요.</b> <button type="button" className="btn sm" onClick={convert} data-act="convert">자동으로 바꾸기</button> 실제 서비스에서는 이름을 바꾸면 과거 데이터와 끊겨요. 규칙은 첫 로그를 심기 전에 정해요.</Note>
      )}
      <div className="mt-scroll">
        <table className="mt-ev">
          <thead><tr><th style={{ width: 230 }}>event_name</th><th>설명 · 발생 시점</th><th style={{ width: 120 }}>화면 ID</th><th style={{ width: 380 }}>속성 (이름:타입, …)</th><th style={{ width: 36 }}><span className="sr">삭제</span></th></tr></thead>
          <tbody>
            {evs.map(e => {
              const w = lints.get(e.id) ?? []
              return (
                <tr key={e.id} className={w.length ? 'has-warn' : 'is-ok'} data-ev={e.id}>
                  <td>
                    <input className="mt-in mono" value={e.name} aria-label="이벤트 이름" spellCheck={false} onChange={x => upd(e.id, { name: x.target.value })} />
                    <span className={'mt-ev-state ' + (w.length ? 'bad' : 'ok')}>{w.length ? `⚠ ${w.length}건` : '✓ 규칙 통과'}</span>
                  </td>
                  <td>
                    <input className="mt-in" value={e.desc} aria-label="설명" onChange={x => upd(e.id, { desc: x.target.value })} />
                    <input className="mt-in sub" value={e.trigger} aria-label="발생 시점" placeholder="발생 시점 (클릭 시 / 서버 성공 후)" onChange={x => upd(e.id, { trigger: x.target.value })} />
                    {w.length > 0 && <ul className="mt-ev-warn">{w.map((m, i) => <li key={i}>{m}</li>)}</ul>}
                  </td>
                  <td><input className="mt-in mono" value={e.screen} aria-label="화면 ID" spellCheck={false} onChange={x => upd(e.id, { screen: x.target.value })} /></td>
                  <td><textarea className="mt-in mono" rows={3} value={e.props} aria-label="속성" spellCheck={false} onChange={x => upd(e.id, { props: x.target.value })} /></td>
                  <td><button type="button" className="mt-x" aria-label={e.name + ' 삭제'} onClick={() => setEvs(a => a.filter(x => x.id !== e.id))}>×</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-row">
        <div className="mt-btns">
          <button type="button" className="btn sm" onClick={() => setEvs(a => [...a, { id: nextId.current++, name: rule === 'oa' ? 'review_photo_add' : 'add_review_photo', desc: '리뷰에 사진을 붙였을 때', trigger: '업로드 성공 후', screen: 'REV-01', props: 'photo_count:number' }])}>+ 이벤트 추가</button>
          <button type="button" className="btn ghost sm" data-act="bad" onClick={() => setEvs(a => [...a, ...BAD_EVS.map(n => ({ id: nextId.current++, name: n, desc: '재주문 버튼 클릭', trigger: '', screen: 'ord02', props: 'orderId' }))])}>나쁜 이름 넣어 보기</button>
          <button type="button" className="btn ghost sm" onClick={() => { setRule('oa'); setEvs(EVSEED.map(e => ({ ...e }))) }}>예시로 되돌리기</button>
        </div>
        <div className="mt-btns">
          <span className={'mt-lint-sum ' + (total ? 'bad' : 'ok')} aria-live="polite">{total ? `규칙 위반 ${total}건` : '✓ 모든 이벤트가 규칙을 지켜요'}</span>
          <button type="button" className="btn ghost sm" data-export="ev-csv" onClick={() => download('오늘반찬_이벤트_택소노미.csv', csv, 'text/csv;charset=utf-8')}>CSV</button>
          <button type="button" className="btn ghost sm" data-export="ev-json" onClick={() => download('오늘반찬_이벤트_택소노미.json', json, 'application/json')}>JSON</button>
          <CopyBtn text={json} label="JSON 복사" />
        </div>
      </div>
      <Note tone="tip">
        <b>발생 시점이 가장 자주 틀려요.</b> <code>checkout_button_click</code>은 앱에서 누른 순간 기록하지만, <code>payment_complete</code>는 결제가 실패해도 찍히면 안 되니 <b>서버에서 승인 후</b> 기록해요. 화면 ID는 <a href="#/plan/storyboard">화면설계서</a>의 ID와 똑같이 맞춰요.
      </Note>
    </>
  )
}

/* ---------- A/B 테스트 ---------- */
type AB = { change: string; metric: string; dir: string; reason: string; control: string; variant: string; split: number; mde: string; success: string; guard: string; period: string; decision: string }
const ABSEED: AB = {
  change: '주문 내역의 “다시 담기” 버튼을 주문 카드 오른쪽 위로 옮기면',
  metric: '재주문 전환율(주문 내역 진입 → 결제 완료)',
  dir: '올라갈',
  reason: '사용성 테스트(예시) 5명 중 4명이 버튼을 찾으려고 카드를 끝까지 스크롤했기 때문이다',
  control: 'A(대조군): 지금처럼 주문 카드 맨 아래에 버튼',
  variant: 'B(실험군): 주문 카드 오른쪽 위에 버튼 고정',
  split: 50,
  mde: '+2%p 이상이어야 만들 가치가 있어요',
  success: '재주문 전환율이 대조군보다 높고, 분석 담당자와 미리 정한 통계 기준을 통과할 때',
  guard: '주문 취소율, 결제 오류율, 앱 크래시율이 대조군보다 나빠지지 않을 것',
  period: '2주 (요일별 차이를 고르게 담도록 주 단위로 채워요)',
  decision: '이기면 전체 적용 / 지면 되돌리고 인터뷰로 원인 찾기 / 차이가 없으면 더 단순한 쪽 유지',
}
const VAGUE = ['좋아', '편해', '편리', '만족', '개선', '향상', '나아']

function ABTemplate() {
  const [f, setF] = useState<AB>(ABSEED)
  const set = (k: keyof AB) => (e: { target: { value: string } }) => setF(x => ({ ...x, [k]: k === 'split' ? +e.target.value : e.target.value }))
  const warn: string[] = []
  if (!f.change.trim()) warn.push('무엇을 바꾸는지가 비었어요.')
  if (!f.metric.trim()) warn.push('지표가 비었어요.')
  else if (VAGUE.some(v => f.metric.includes(v))) warn.push('지표에 “좋아짐·개선” 같은 말이 있어요. 숫자로 셀 수 있는 지표 이름으로 바꿔요.')
  if (!f.reason.trim()) warn.push('근거가 없으면 가설이 아니라 희망이에요.')
  if (!/\d/.test(f.mde)) warn.push('의미 있는 최소 차이를 숫자로 적어요 (예: +2%p).')
  if (!f.guard.trim()) warn.push('가드레일 지표가 없어요. 무엇이 나빠지면 멈출지 정해요.')
  if (!/\d/.test(f.period)) warn.push('기간을 숫자로 정해요. 결과를 보면서 끝내는 날을 정하면 안 돼요.')
  const sentence = `${f.change || '[변경]'} ${f.metric || '[지표]'}이(가) ${f.dir || '[방향]'} 것이다. 왜냐하면 ${f.reason || '[근거]'}.`
  const md = `# A/B 테스트 계획서 — 오늘반찬\n\n## 가설\n${sentence}\n\n## 그룹\n- ${f.control}\n- ${f.variant}\n- 트래픽 분배: A ${100 - f.split}% / B ${f.split}%\n\n## 판단 기준\n- 주요 지표: ${f.metric}\n- 의미 있는 최소 차이: ${f.mde}\n- 성공 기준: ${f.success}\n- 가드레일: ${f.guard}\n\n## 기간\n- ${f.period}\n- 기간 중간에 결과를 보고 멈추지 않아요.\n\n## 결과에 따른 행동\n- ${f.decision}\n\n## 표본 크기\n- 필요한 표본 수는 분석 담당자와 시작 전에 계산해 적어요: ____명/그룹\n`
  const field = (k: keyof AB, label: string, hint?: string) => (
    <label className="mt-field"><span>{label}{hint && <small>{hint}</small>}</span><input className="mt-in" value={String(f[k])} onChange={set(k)} data-field={k} /></label>
  )
  return (
    <div className="mt-ab">
      <div className="mt-ab-form">
        <div className="mt-sentence" aria-live="polite">
          <small>가설 한 문장</small>
          <p>“<mark>{f.change || '[변경]'}</mark> <mark>{f.metric || '[지표]'}</mark>이(가) <mark>{f.dir || '[방향]'}</mark> 것이다. 왜냐하면 <mark>{f.reason || '[근거]'}</mark>.”</p>
        </div>
        {field('change', '변경', '[무엇을] 하면')}
        {field('metric', '지표', '숫자로 셀 수 있는 이름')}
        <label className="mt-field"><span>방향</span>
          <select className="mt-in" value={f.dir} onChange={set('dir')}><option>올라갈</option><option>내려갈</option></select>
        </label>
        {field('reason', '근거', '관찰·데이터·인터뷰')}
        <div className="mt-two">{field('control', '대조군')}{field('variant', '실험군')}</div>
        <label className="mt-field"><span>트래픽 분배 <small>A {100 - f.split}% / B {f.split}%</small></span>
          <input type="range" min={10} max={90} step={10} value={f.split} onChange={set('split')} aria-label="실험군 비율" style={{ ['--p' as string]: ((f.split - 10) / 80) * 100 + '%' }} />
        </label>
        {field('mde', '의미 있는 최소 차이')}
        {field('success', '성공 기준')}
        {field('guard', '가드레일')}
        {field('period', '기간')}
        {field('decision', '결과에 따른 행동')}
      </div>
      <div className="mt-ab-side">
        {warn.length > 0
          ? <Note tone="warn"><b>빠진 곳 {warn.length}개</b><ul className="mt-warn">{warn.map((w, i) => <li key={i}>{w}</li>)}</ul></Note>
          : <Note tone="tip"><b>✓ 계획서의 뼈대가 다 찼어요.</b> 이제 분석 담당자와 필요한 표본 수를 계산해 적어요.</Note>}
        <div className="mt-btns">
          <CopyBtn text={md} label="마크다운 복사" />
          <button type="button" className="btn ghost sm" data-export="ab" onClick={() => download('AB테스트_계획서.md', md, 'text/markdown;charset=utf-8')}>.md 내려받기</button>
          <button type="button" className="btn ghost sm" onClick={() => setF(ABSEED)}>예시로 되돌리기</button>
        </div>
        <GoodBad
          bad={<><b>“재주문 버튼을 바꾸면 좋아질 것이다.”</b><p>무엇이 좋아지는지(지표), 얼마나(최소 차이), 왜(근거)가 없어요. 결과가 어떻게 나와도 “좋아졌다”고 말할 수 있어서 배우는 게 없어요.</p></>}
          good={<><b>“버튼을 카드 오른쪽 위로 옮기면 재주문 전환율이 올라갈 것이다. 왜냐하면 5명 중 4명이 버튼을 찾으려고 스크롤했기 때문이다.”</b><p>틀릴 수 있는 문장이에요. 틀리면 “위치가 문제가 아니었다”는 걸 배워요.</p></>}
        />
      </div>
    </div>
  )
}

/* 같은 두 안을 여러 번 실험했을 때 차이가 얼마나 튀는지 */
function SampleSim() {
  const [n, setN] = useState(100)
  const [seed, setSeed] = useState(0)
  const P = 0.1, RUNS = 20
  const diffs = useMemo(() => {
    void seed
    const draw = () => { let c = 0; for (let i = 0; i < n; i++) if (Math.random() < P) c++; return c / n }
    return Array.from({ length: RUNS }, () => (draw() - draw()) * 100)
  }, [n, seed])
  const maxAbs = Math.max(...diffs.map(Math.abs))
  const R = 10
  return (
    <div className="mt-sim">
      <div className="mt-row">
        <Seg value={n} onChange={setN} options={[[50, '그룹당 50명'], [100, '100명'], [500, '500명'], [2000, '2,000명'], [5000, '5,000명']]} />
        <button type="button" className="btn sm" onClick={() => setSeed(s => s + 1)}>↻ 20번 다시 실험</button>
      </div>
      <div className="mt-sim-axis" aria-label={`관찰된 차이 20개, 가장 큰 차이 ${maxAbs.toFixed(1)}%p`}>
        <span className="mt-sim-zero" />
        {diffs.map((d, i) => (
          <i key={seed + '-' + i} className={Math.abs(d) >= 2 ? 'big' : ''} style={{ left: `${50 + (Math.max(-R, Math.min(R, d)) / R) * 50}%`, top: `${12 + (i % 5) * 12}px` }} title={d.toFixed(1) + '%p'} />
        ))}
        <small className="l">B가 {R}%p 낮음</small><small className="c">차이 0</small><small className="r">B가 {R}%p 높음</small>
      </div>
      <p className="mt-sim-msg" aria-live="polite">
        두 안의 진짜 전환율은 <b>똑같이 10%</b>예요. 그런데도 그룹당 {n0(n)}명이면 20번 중 가장 큰 차이가 <b className={maxAbs >= 2 ? 'bad' : 'ok'}>{maxAbs.toFixed(1)}%p</b>까지 나왔어요.
        {maxAbs >= 2 ? ' 이 정도 우연한 차이를 “B가 이겼다”로 읽으면 안 돼요.' : ' 표본이 크면 우연한 차이가 줄어들어요.'}
      </p>
    </div>
  )
}

export default function Tab() {
  return (
    <div data-plan="metrics">
      <SysGrid>
        <Section id="plan-metrics-why" wide title="숫자로 말하는 기획" desc="출시 전에 “무엇이 오르면 성공인지”를 정하지 않으면, 출시 후에 아무도 성공인지 몰라요.">
          <div className="mt-intro">
            <div className="mt-quote">
              <b>주니어가 자주 하는 실수</b>
              <p>“로그는 출시하고 나서 심죠.” 그러면 출시 후 2주 동안 비교할 숫자가 없어요. 이벤트 이름도 개발자마다 달라서 <code>ReorderClick</code>, <code>reorder_btn</code>, <code>재주문클릭</code>이 같은 뜻으로 섞여요.</p>
            </div>
            <ol className="mt-flow">
              <li><b>퍼널</b>로 어디서 사람을 잃는지 찾고</li>
              <li><b>북극성·가드레일</b>로 무엇을 키우고 무엇을 지킬지 정하고</li>
              <li><b>이벤트 택소노미</b>로 그 숫자를 셀 로그를 설계하고</li>
              <li><b>A/B 가설</b>로 바꾼 것이 정말 효과가 있었는지 확인해요</li>
            </ol>
          </div>
        </Section>

        <Section id="plan-metrics-aarrr" wide title="AARRR 퍼널" desc="Dave McClure가 제안한 다섯 단계(획득·활성화·유지·매출·추천)예요. 오늘반찬 한 달 숫자(예시)를 넣어 두었어요. 숫자를 바꾸면 전환율과 가장 큰 누수 지점이 바로 바뀌어요.">
          <Funnel />
        </Section>

        <Section id="plan-metrics-north" wide title="북극성 지표와 가드레일" desc="북극성은 “팀 전체가 키우는 숫자 하나”, 가드레일은 “그걸 키우다 망가지면 안 되는 숫자”예요. 눌러서 고른 이유를 보세요.">
          <NorthStar />
        </Section>

        <Section id="plan-metrics-taxonomy" wide title="이벤트 택소노미 빌더" desc="이벤트 이름 규칙을 하나 정하고, 이름·발생 시점·화면 ID·속성을 정의해요. 규칙을 어기면 바로 알려줘요. 분석 도구에 상관없이 같은 표를 써요.">
          <Taxonomy />
        </Section>

        <Section id="plan-metrics-ab" wide title="A/B 테스트 가설 템플릿" desc="“[변경]하면 [지표]가 [방향]할 것이다, 왜냐하면 [근거]”. 대조군·실험군, 성공 기준, 가드레일, 기간까지 시작 전에 정해요.">
          <ABTemplate />
        </Section>

        <Section id="plan-metrics-sample" wide title="표본이 작으면 결론을 내리지 않아요" desc="똑같은 두 안을 20번 실험해 봐요. 그룹당 인원을 바꾸면 ‘우연히 생기는 차이’의 크기가 달라져요.">
          <SampleSim />
          <Note tone="warn">
            <b>지켜야 할 세 가지</b><br />
            ① 필요한 표본 수는 시작 전에 분석 담당자와 계산해요(기준 전환율, 의미 있는 최소 차이, 유의 수준, 검정력이 필요해요). 여기서는 수식 대신 감만 보여드려요.<br />
            ② 기간 중간에 결과를 들여다보고 “이겼으니 멈추자”고 하지 않아요. 우연한 차이를 정답으로 착각하기 쉬워요.<br />
            ③ 가드레일이 나빠지면 주요 지표가 좋아도 멈추고 다시 봐요.
          </Note>
        </Section>

        <Section id="plan-metrics-check" title="사수의 체크리스트" desc="지표·로그 설계서를 리뷰할 때 제가 묻는 질문이에요.">
          <Checklist name="지표·데이터 리뷰 체크리스트" items={[
            ['성공 기준이 숫자로 있나요?', '“재주문율 개선” 말고 “2주 내 재주문율 18% → 22%”.'],
            ['퍼널 단계마다 정의가 한 줄로 있나요?', '“활성화 = 가입 후 첫 장바구니 담기”처럼 누구든 같은 숫자를 뽑을 수 있어야 해요.'],
            ['가드레일 지표를 정했나요?', '북극성을 올리다 망가지면 안 되는 숫자 2~4개.'],
            ['이벤트 이름이 팀 규칙을 지키나요?', '대상_행동 / 행동_대상 중 하나로만.'],
            ['발생 시점이 앱인지 서버인지 적었나요?', '결제·주문 완료는 서버 기준이에요.'],
            ['속성 이름과 타입을 정했나요?', 'item_price:number처럼. 개발자와 QA가 같은 표를 봐요.'],
            ['A/B 기간과 표본 수를 시작 전에 정했나요?', '결과를 보면서 끝내는 날을 정하지 않아요.'],
            ['출시 후 2주 리뷰 날짜를 잡았나요?', '숫자를 보는 날이 없으면 지표는 아무도 안 봐요.'],
          ]} />
        </Section>

        <Section id="plan-metrics-ref" title="참고" desc="확인된 자료만 적었어요.">
          <ul className="mt-ref">
            <li><b>Dave McClure</b> — “Startup Metrics for Pirates: AARRR!” 발표. 다섯 단계 퍼널의 출처예요.</li>
            <li><b>Sean Ellis · Morgan Brown, 『진화된 마케팅 그로스 해킹』(Hacking Growth)</b> — 북극성 지표와 성장 실험.</li>
            <li><b>Ron Kohavi 외, 『Trustworthy Online Controlled Experiments』</b> — A/B 테스트 설계, 가드레일 지표, 중간에 결과 들여다보기의 위험.</li>
            <li><b>Marty Cagan, 『인스파이어드』(SVPG)</b> — 기능 출시(output)가 아니라 결과(outcome)로 성공을 판단하기.</li>
            <li>함께 보기: 숫자만 쫓으면 사용자를 속이는 설계로 흐르기 쉬워요. <a href="#/darkpattern">다크 패턴 가이드 →</a></li>
            <li>다음 단계: 출시 후 숫자 확인은 <a href="#/plan/qa">QA · 출시</a> 탭의 ‘출시 후 2주 리뷰’에서 이어가요.</li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
