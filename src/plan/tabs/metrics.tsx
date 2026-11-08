import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Note, Section, SysGrid } from '../../system/ui'
import { Seg } from '../../components/ui'
import { download } from '../../system/export'
import { Term, TermList } from '../../components/Term'
import './metrics.css'

/* ---------- 이 탭에만 쓰는 용어 풀이 (공용 사전에 없는 말) ---------- */
const D: Record<string, string> = {
  '로그': '앱이 사용자 행동을 자동으로 적어 두는 기록이에요. 가계부처럼 쌓이고, 나중에 이걸로 숫자를 계산해요.',
  '전환율': '앞 단계에 온 사람 중 다음 단계까지 간 사람의 비율이에요. 100명이 장바구니에 담고 30명이 결제하면 결제 전환율은 30%예요.',
  '이탈률': '앞 단계까지 왔다가 다음 단계로 가지 않은 사람의 비율이에요. 전환율의 반대예요.',
  '북극성 지표': '팀 전체가 함께 키우는 숫자 딱 하나예요. 길 잃은 여행자가 북극성을 보고 방향을 잡듯, 무엇을 할지 헷갈릴 때 이 숫자를 기준으로 삼아요.',
  '입력 지표': '북극성 지표를 움직이는 더 작은 숫자예요. 팀이 매일 직접 바꿀 수 있어요. 예: 첫 주문 전환율.',
  '가드레일 지표': '북극성을 키우다가 망가지면 안 되는 숫자예요. 도로의 가드레일처럼 “여기를 넘으면 멈춰”라는 신호예요. 예: 주문 취소율.',
  '허영 지표': '보기에는 좋지만 실제로 잘되고 있는지는 알려주지 않는 숫자예요. 예: 앱 다운로드 수, 누적 가입자 수.',
  '이벤트': '앱에서 기록하는 사용자 행동 하나예요. 예: “다시 담기 버튼을 눌렀다”, “결제가 끝났다”.',
  '스네이크 케이스': '영어 소문자로 쓰고 단어 사이를 밑줄(_)로 잇는 이름 짓는 법이에요. 예: cart_item_add.',
  '속성': '이벤트에 함께 붙여 보내는 추가 정보예요. 예: “다시 담기”를 누를 때 몇 개를 담았는지(item_count).',
  '발생 시점': '이벤트를 정확히 언제 기록하는지예요. 버튼을 누른 순간인지, 서버가 성공을 확인한 뒤인지 정해야 숫자가 맞아요.',
  '가설': '“이렇게 바꾸면 이 숫자가 이렇게 바뀔 것이다, 왜냐하면 …”처럼 맞는지 틀리는지 확인할 수 있게 쓴 예상이에요.',
  '대조군': 'A/B 테스트에서 아무것도 바꾸지 않은 원래 화면을 보는 그룹(A)이에요. 비교 기준이 돼요.',
  '실험군': 'A/B 테스트에서 바꾼 새 화면을 보는 그룹(B)이에요.',
  '의미 있는 최소 차이': '“적어도 이만큼은 올라야 만든 보람이 있다”고 미리 정한 차이예요. 영어 약자로 MDE라고도 해요. 예: +2%p.',
  '%p': '퍼센트포인트예요. 10%가 12%가 되면 “2%p 올랐다”고 해요. “20% 올랐다”와 헷갈리지 않게 따로 써요.',
  '표본': '실험에 참여한 사람들이에요. 표본이 작으면 우연 때문에 결과가 크게 흔들려요. 동전을 네 번 던져 앞면이 세 번 나와도 이상하지 않은 것과 같아요.',
  '유의 수준': '“사실은 우연인데 진짜 차이로 착각할” 위험을 어디까지 받아들일지 미리 정한 값이에요.',
  '검정력': '진짜 차이가 있을 때 실험이 그 차이를 찾아낼 확률이에요.',
}
/** 사전(D → 공용 glossary) 순서로 뜻을 찾는 Term */
const T = ({ k, children }: { k: string; children?: ReactNode }) => <Term k={k} d={D[k]}>{children}</Term>

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
  { k: 'acq', en: 'Acquisition', ko: '획득', def: '앱 첫 방문 (설치·웹 유입)', n: 20000, metrics: '유입 수 · 채널별 유입 · CAC(고객 한 명을 데려오는 데 드는 비용)' },
  { k: 'act', en: 'Activation', ko: '활성화', def: '회원가입 후 첫 장바구니 담기', n: 6000, metrics: '가입 완료율 · 첫 핵심 행동(첫 장바구니, 첫 주문)까지 걸린 시간' },
  { k: 'ret', en: 'Retention', ko: '유지', def: '14일 안에 다시 방문', n: 3300, metrics: '재방문율 · DAU/MAU(하루 방문자 ÷ 한 달 방문자) · 가입 시기별로 남은 비율(코호트 잔존율)' },
  { k: 'rev', en: 'Revenue', ko: '매출', def: '첫 결제 완료', n: 1200, metrics: 'CVR(구매 전환율) · ARPU(1인당 매출) · LTV(고객 생애 가치)' },
  { k: 'ref', en: 'Referral', ko: '추천', def: '친구 초대 링크 보내기', n: 180, metrics: '초대 수 · 초대 수락률 · 바이럴 계수(한 명이 새로 데려오는 사람 수)' },
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
                  <span>{step.over ? '앞 단계보다 사람이 많아요. 두 단계가 같은 사람들을 세는지 정의를 확인해요.' : `${pct(step.drop)} 이탈 · ${n0(step.lost)}명`}</span>
                  {isLeak && <em>가장 많이 새는 곳</em>}
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
          <b>가장 많이 새는 곳: {st[leak.i - 1].ko} → {st[leak.i].ko}</b> ({mode === 'rate' ? `${pct(leak.drop)}가 빠져요` : `${n0(leak.lost)}명이 빠져요`}).{' '}
          {mode === 'rate'
            ? '비율로만 보면 뒤쪽 단계가 커 보이기 쉬워요. “이탈 인원으로 보기”를 눌러 실제로 몇 명을 잃는지도 봐요.'
            : '인원으로만 보면 앞쪽 단계가 커 보이기 쉬워요. 앞 단계는 원래 사람이 많아서예요. 비율도 같이 봐요.'}
          {' '}두 기준 모두에서 크게 나오는 곳부터 고쳐 봐요. 그곳이 첫 번째 실험 후보예요.
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
      <Note>단계 순서는 서비스마다 달라요. 오늘반찬처럼 첫 주문이 곧 매출인 서비스는 매출 단계가 유지보다 먼저 올 수도 있어요. 가장 중요한 건 <b>단계마다 “누가 이 단계에 들어왔나”를 한 줄로 정해 두는 것</b>이에요. 예: 활성화 = 가입 후 첫 장바구니 담기.</Note>
    </>
  )
}

/* ---------- 북극성 · 가드레일 ---------- */
const NODES: { id: string; kind: 'ns' | 'in' | 'gr'; name: string; why: string }[] = [
  { id: 'ns', kind: 'ns', name: '주간 주문 완료 구매자 수', why: '구매자는 반찬을 받았어요(고객이 얻는 것). 사장님과 우리는 매출이 생겼어요(회사가 얻는 것). 두 가지가 함께 움직이는 숫자라서 북극성으로 골랐어요. 반찬은 매일이 아니라 주 1~2회 사는 물건이라서 주 단위로 세요.' },
  { id: 'i1', kind: 'in', name: '신규 구매자의 첫 주문 전환율', why: '북극성을 키우는 입력 지표예요. 새 사용자를 데려와 첫 주문까지 이끄는 팀(획득·활성화)이 매일 봐요.' },
  { id: 'i2', kind: 'in', name: '2주 내 재주문율', why: '재주문 기능이 직접 올리려는 숫자예요. 퍼널의 유지 단계를 대표해요.' },
  { id: 'i3', kind: 'in', name: '장바구니 → 결제 완료율', why: '결제 단계에서 사람이 얼마나 막히는지 보여줘요. 결제 수단을 늘리는 것 같은 일로 올릴 수 있어요.' },
  { id: 'g1', kind: 'gr', name: '주문 취소율', why: '쿠폰으로 주문을 억지로 늘리면 취소가 같이 늘 수 있어요. 북극성이 올라도 이 숫자가 나빠지면 멈춰요.' },
  { id: 'g2', kind: 'gr', name: '배송 지연율', why: '주문이 갑자기 몰리면 사장님과 배송이 감당하지 못해요. 빨리 크다가 생기는 부작용을 잡는 숫자예요.' },
  { id: 'g3', kind: 'gr', name: 'CS 문의율 (주문 100건당)', why: '화면을 바꾼 뒤 헷갈려서 문의하는 사람이 늘었는지 알려줘요.' },
  { id: 'g4', kind: 'gr', name: '사장님 주문 거절률', why: '구매자 숫자만 보다 보면, 반찬을 만드는 사장님 쪽이 버티지 못할 수 있어요.' },
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
        bad={<><b>북극성: 앱 다운로드 수</b><p>이 숫자가 올라가도 반찬을 받은 사람이 늘었는지는 알 수 없어요. 광고비만 늘려도 올라요. 이런 숫자를 <b><T k="허영 지표" /></b>라고 해요. 페이지뷰, 누적 가입자 수도 같은 함정이에요.</p></>}
        good={<><b>북극성: 주간 주문 완료 구매자 수 + 가드레일 4개</b><p>고객이 얻는 것과 회사가 얻는 것이 함께 움직여요. 팀이 할 일로 직접 움직일 수 있는 숫자예요. 가드레일이 있어서 “취소가 늘어도 주문 수만 올리는” 일을 막아요.</p></>}
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
  { id: 3, name: 'cart_item_add', desc: '장바구니에 반찬이 담겼을 때', trigger: '서버에서 담기 성공 응답을 받은 후', screen: 'MENU-03', props: 'item_id:string, item_price:number, quantity:number, add_source:string' },
  { id: 4, name: 'checkout_button_click', desc: '장바구니에서 주문하기를 눌렀을 때', trigger: '버튼 클릭 시 (앱에서 기록)', screen: 'CART-01', props: 'cart_total:number, item_count:number, user_grade:string' },
  { id: 5, name: 'payment_complete', desc: '결제가 승인됐을 때', trigger: '결제 대행사(PG) 승인 후 서버에서 기록', screen: 'PAY-01', props: 'order_id:string, payment_method:string, amount:number, is_reorder:boolean' },
]
const BAD_EVS = ['ReorderBtnClicked', '재주문클릭', 'click-reorder']
const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/
const TYPES = ['string', 'number', 'boolean']

function lintName(name: string, rule: Rule, all: Ev[], id: number): string[] {
  const w: string[] = []
  const n = name.trim()
  if (!n) return ['이름이 비어 있어요.']
  if (/[^\x20-\x7e]/.test(n)) w.push('한글·특수문자는 쓰지 않아요. 영문 소문자, 숫자, _만 써요.')
  if (/[A-Z]/.test(n)) w.push('대문자는 쓰지 않아요. ReorderClick처럼 쓰지 말고 모두 소문자로 써요.')
  if (/[\s-]/.test(n)) w.push('띄어쓰기나 - 대신 _로 단어를 이어요.')
  if (!w.length && !SNAKE.test(n)) w.push('소문자_소문자 모양이 아니에요. _를 두 번 겹쳐 썼거나 숫자로 시작하지 않았는지 봐요.')
  const t = n.toLowerCase().split(/[_\s-]+/).filter(Boolean)
  if (t.length < 2) w.push('대상(무엇을)과 행동(어떻게 했나), 두 단어 이상이 필요해요.')
  else if (!w.length) {
    if (t.some(x => VERBS.some(v => x === v + 'ed' || x === v + 'd' || x === v + 'ing' || x === v.replace(/e$/, '') + 'ing'))) w.push('clicked, viewing 대신 기본형 click, view로 써요.')
    const last = t[t.length - 1], first = t[0]
    if (rule === 'oa') {
      if (!VERBS.includes(last)) w.push(VERBS.includes(first) ? '행동 단어가 앞에 있어요. 이 팀 규칙은 대상_행동 순서예요(예: checkout_button_click).' : `마지막 단어는 정해진 행동 단어여야 해요 (${VERBS.slice(0, 6).join(', ')} …).`)
    } else if (!VERBS.includes(first)) {
      w.push(VERBS.includes(last) ? '행동 단어가 뒤에 있어요. 이 팀 규칙은 행동_대상 순서예요(예: click_checkout_button).' : `첫 단어는 정해진 행동 단어여야 해요 (${VERBS.slice(0, 6).join(', ')} …).`)
    }
  }
  if (all.some(e => e.id !== id && e.name.trim() === n)) w.push('같은 이름이 이미 있어요. 이름 하나에는 뜻 하나만 담아요.')
  return w
}
function parseProps(s: string) {
  return s.split(',').map(x => x.trim()).filter(Boolean).map(x => { const [k, t] = x.split(':').map(y => y?.trim() ?? ''); return { k, t } })
}
function lintRow(e: Ev, rule: Rule, all: Ev[]) {
  const w = lintName(e.name, rule, all, e.id)
  if (!e.trigger.trim()) w.push('발생 시점이 비었어요. 누른 순간(“클릭 시”)인지, 서버가 확인한 뒤(“서버 성공 후”)인지 적어요.')
  if (e.screen.trim() && !/^[A-Z]{2,5}-\d{2}(-\d{2})?$/.test(e.screen.trim())) w.push('화면 ID 형식이 달라요 (예: ORD-02-01). 화면설계서의 ID와 맞춰요.')
  if (!e.screen.trim()) w.push('화면 ID가 비었어요.')
  for (const p of parseProps(e.props)) {
    if (!SNAKE.test(p.k)) w.push(`속성 “${p.k}”도 소문자_소문자로 써요.`)
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
          <li>영어 소문자와 _만 써요 (<T k="스네이크 케이스" />)</li>
          <li>행동 단어는 이 목록에서만 골라요: <code>{VERBS.join(' · ')}</code></li>
          <li><T k="속성" />은 <code>이름:타입</code>으로 적어요. 타입은 string(글자) · number(숫자) · boolean(예/아니요)</li>
        </ul>
      </div>
      {needsFlip && (
        <Note tone="warn"><b>규칙을 바꿨더니 맞지 않는 이름이 생겼어요.</b> <button type="button" className="btn sm" onClick={convert} data-act="convert">자동으로 바꾸기</button> 실제 서비스에서는 이름을 바꾸면 그전에 쌓인 데이터와 이어지지 않아요. 그래서 규칙은 첫 기록을 심기 전에 정해요.</Note>
      )}
      <div className="mt-scroll">
        <table className="mt-ev">
          <thead><tr><th style={{ width: 230 }}>이벤트 이름</th><th>설명 · 발생 시점</th><th style={{ width: 120 }}>화면 ID</th><th style={{ width: 380 }}>속성 (이름:타입, …)</th><th style={{ width: 36 }}><span className="sr">삭제</span></th></tr></thead>
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
        <b>가장 자주 틀리는 건 <T k="발생 시점" />이에요.</b> <code>checkout_button_click</code>은 앱에서 누른 순간 기록해요. 하지만 <code>payment_complete</code>는 결제가 실패했을 때 찍히면 안 돼요. 그래서 <b>서버가 승인을 확인한 뒤</b> 기록해요. 화면 ID는 <a href="#/plan/storyboard">화면설계서</a>의 ID와 똑같이 맞춰요.
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
  period: '2주 (요일마다 주문이 달라서, 요일이 고르게 들어가게 주 단위로 채워요)',
  decision: '이기면 전체 적용 / 지면 되돌리고 인터뷰로 원인 찾기 / 차이가 없으면 더 단순한 쪽 유지',
}
const VAGUE = ['좋아', '편해', '편리', '만족', '개선', '향상', '나아']

function ABTemplate() {
  const [f, setF] = useState<AB>(ABSEED)
  const set = (k: keyof AB) => (e: { target: { value: string } }) => setF(x => ({ ...x, [k]: k === 'split' ? +e.target.value : e.target.value }))
  const warn: string[] = []
  if (!f.change.trim()) warn.push('무엇을 바꾸는지가 비었어요.')
  if (!f.metric.trim()) warn.push('지표가 비었어요.')
  else if (VAGUE.some(v => f.metric.includes(v))) warn.push('지표에 “좋아짐·개선” 같은 말이 있어요. 숫자로 셀 수 있는 이름으로 바꿔요. 예: 재주문 전환율.')
  if (!f.reason.trim()) warn.push('근거가 비었어요. 근거 없는 가설은 그냥 바람이에요. 관찰한 것이나 데이터를 적어요.')
  if (!/\d/.test(f.mde)) warn.push('의미 있는 최소 차이를 숫자로 적어요 (예: +2%p).')
  if (!f.guard.trim()) warn.push('가드레일 지표가 없어요. 무엇이 나빠지면 멈출지 정해요.')
  if (!/\d/.test(f.period)) warn.push('기간을 숫자로 정해요. 결과를 보면서 끝낼 날을 고르면 안 돼요.')
  const sentence = `${f.change || '[변경]'} ${f.metric || '[지표]'}이(가) ${f.dir || '[방향]'} 것이다. 왜냐하면 ${f.reason || '[근거]'}.`
  const md = `# A/B 테스트 계획서 — 오늘반찬\n\n## 가설\n${sentence}\n\n## 그룹\n- ${f.control}\n- ${f.variant}\n- 나누는 비율(트래픽 분배): A ${100 - f.split}% / B ${f.split}%\n\n## 판단 기준\n- 주요 지표: ${f.metric}\n- 의미 있는 최소 차이: ${f.mde}\n- 성공 기준: ${f.success}\n- 가드레일: ${f.guard}\n\n## 기간\n- ${f.period}\n- 실험 도중에 결과를 보고 멈추지 않아요.\n\n## 결과에 따른 행동\n- ${f.decision}\n\n## 표본 크기\n- 그룹마다 몇 명이 필요한지(표본 수) 시작 전에 분석 담당자와 계산해 적어요: ____명/그룹\n`
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
        {field('reason', '근거', '관찰·데이터·인터뷰에서 본 것')}
        <div className="mt-two">{field('control', '대조군', '그대로 둔 A')}{field('variant', '실험군', '바꾼 B')}</div>
        <label className="mt-field"><span>나누는 비율 <small>A {100 - f.split}% / B {f.split}%</small></span>
          <input type="range" min={10} max={90} step={10} value={f.split} onChange={set('split')} aria-label="실험군 비율" style={{ ['--p' as string]: ((f.split - 10) / 80) * 100 + '%' }} />
        </label>
        {field('mde', '의미 있는 최소 차이', '이만큼은 올라야 만들 가치가 있어요')}
        {field('success', '성공 기준')}
        {field('guard', '가드레일', '나빠지면 멈출 숫자')}
        {field('period', '기간', '시작 전에 정해요')}
        {field('decision', '결과에 따른 행동')}
      </div>
      <div className="mt-ab-side">
        {warn.length > 0
          ? <Note tone="warn"><b>빠진 곳 {warn.length}개</b><ul className="mt-warn">{warn.map((w, i) => <li key={i}>{w}</li>)}</ul></Note>
          : <Note tone="tip"><b>✓ 계획서의 뼈대가 다 찼어요.</b> 이제 분석 담당자와 함께 그룹마다 몇 명이 필요한지(표본 수) 계산해 적어요.</Note>}
        <div className="mt-btns">
          <CopyBtn text={md} label="마크다운 복사" />
          <button type="button" className="btn ghost sm" data-export="ab" onClick={() => download('AB테스트_계획서.md', md, 'text/markdown;charset=utf-8')}>.md 내려받기</button>
          <button type="button" className="btn ghost sm" onClick={() => setF(ABSEED)}>예시로 되돌리기</button>
        </div>
        <GoodBad
          bad={<><b>“재주문 버튼을 바꾸면 좋아질 것이다.”</b><p>무엇이(지표), 얼마나(최소 차이), 왜(근거) 좋아지는지가 없어요. 그래서 결과가 어떻게 나와도 “좋아졌다”고 말할 수 있어요. 배우는 게 없어요.</p></>}
          good={<><b>“버튼을 카드 오른쪽 위로 옮기면 재주문 전환율이 올라갈 것이다. 왜냐하면 5명 중 4명이 버튼을 찾으려고 스크롤했기 때문이다.”</b><p>결과를 보면 맞았는지 틀렸는지 알 수 있는 문장이에요. 틀려도 “버튼 위치가 문제가 아니었다”는 걸 배워요.</p></>}
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
        두 안의 진짜 전환율은 <b>똑같이 10%</b>예요. 그런데도 그룹당 {n0(n)}명이면, 20번 중 가장 큰 차이가 <b className={maxAbs >= 2 ? 'bad' : 'ok'}>{maxAbs.toFixed(1)}<T k="%p" /></b>까지 나왔어요.
        {maxAbs >= 2 ? ' 이건 우연히 생긴 차이예요. “B가 이겼다”로 읽으면 안 돼요.' : ' 사람이 많을수록 우연한 차이가 줄어들어요.'}
      </p>
    </div>
  )
}

export default function Tab() {
  return (
    <div data-plan="metrics">
      <TermList keys={['퍼널', 'AARRR', '전환율', '북극성 지표', '가드레일 지표', '허영 지표', '로그', '이벤트 택소노미', '스네이크 케이스', 'A/B 테스트', '대조군', '실험군', '의미 있는 최소 차이', '표본']} extra={D} />
      <SysGrid>
        <Section id="plan-metrics-why" wide title="기획자가 성공 기준을 숫자로 정하는 이유"
          gist="출시 전에 “무엇이 얼마나 오르면 성공인지” 숫자로 정해 둬요."
          desc="출시 전에 성공 기준을 정하지 않으면, 출시 후에 아무도 성공인지 몰라요.">
          <div className="mt-intro">
            <div className="mt-quote">
              <b>주니어가 자주 하는 실수</b>
              <p>“<T k="로그" />는 출시하고 나서 심죠.” 이러면 출시 후 2주 동안 비교할 숫자가 없어요. 또 이벤트 이름을 개발자마다 다르게 지어요. 그래서 <code>ReorderClick</code>, <code>reorder_btn</code>, <code>재주문클릭</code>이 같은 뜻인데 따로따로 쌓여요.</p>
            </div>
            <ol className="mt-flow">
              <li><b><T k="퍼널" /></b>로 사람이 어디서 빠지는지 찾아요</li>
              <li><b><T k="북극성 지표">북극성</T>·<T k="가드레일 지표">가드레일</T></b>로 키울 숫자와 지킬 숫자를 정해요</li>
              <li><b><T k="이벤트 택소노미" /></b>로 그 숫자를 셀 기록의 이름표를 설계해요</li>
              <li><b><T k="A/B 테스트" /></b>로 바꾼 게 정말 효과가 있었는지 확인해요</li>
            </ol>
          </div>
        </Section>

        <Section id="plan-metrics-aarrr" wide title="AARRR 퍼널: 어디서 사람을 잃나"
          gist="단계마다 몇 명이 빠지는지 보면, 어디부터 고칠지 보여요."
          desc={<>물이 새는 양동이를 떠올려 보세요. 어느 구멍이 가장 큰지 알아야 먼저 막을 수 있어요. <T k="AARRR" />은 Dave McClure가 제안한 다섯 단계(획득·활성화·유지·매출·추천)예요. 오늘반찬의 한 달 숫자(예시)를 넣어 두었어요. 숫자를 바꾸면 <T k="전환율" />과 가장 많이 새는 곳이 바로 바뀌어요.</>}>
          <Funnel />
        </Section>

        <Section id="plan-metrics-north" wide title="키울 숫자 하나, 지킬 숫자 몇 개"
          gist="팀이 함께 키울 숫자 하나를 정하고, 망가지면 안 되는 숫자로 옆을 지켜요."
          desc={<>북극성은 여행자가 방향을 잡는 별이고, 가드레일은 차가 길 밖으로 떨어지지 않게 막는 난간이에요. <T k="북극성 지표" />는 팀 전체가 키우는 숫자 하나예요. <T k="가드레일 지표" />는 그걸 키우다가 망가지면 안 되는 숫자예요. 상자를 눌러 왜 골랐는지 보세요.</>}>
          <NorthStar />
        </Section>

        <Section id="plan-metrics-taxonomy" wide title="기록할 행동에 이름표 붙이기 (이벤트 택소노미)"
          gist="기록 이름 규칙을 처음에 정해야, 나중에 숫자를 믿고 쓸 수 있어요."
          desc={<>도서관 책에 분류 번호가 없으면 같은 책이 여기저기 꽂혀요. 앱 기록도 같아요. 먼저 이름 규칙을 하나 정해요. 그다음 <T k="이벤트" />마다 이름·발생 시점·화면 ID·속성을 적어요. 규칙을 어기면 바로 알려줘요. 어떤 분석 도구를 써도 이 표는 똑같이 써요.</>}>
          <Taxonomy />
        </Section>

        <Section id="plan-metrics-ab" wide title="A/B 테스트 계획서 쓰기"
          gist="시작하기 전에 무엇이, 얼마나, 왜 바뀔지 한 문장으로 적어요."
          desc={<>같은 반찬을 두 가지 레시피로 만들어 손님 절반씩에게 내고, 어느 쪽이 더 팔리는지 보는 것과 같아요. 출발점은 “[변경]하면 [지표]가 [방향]할 것이다. 왜냐하면 [근거]” 한 문장(<T k="가설" />)이에요. 두 그룹(<T k="대조군" />·<T k="실험군" />), 성공 기준, 가드레일, 기간도 시작 전에 정해요.</>}>
          <ABTemplate />
        </Section>

        <Section id="plan-metrics-sample" wide title="참여자가 적으면 결론을 내리지 않아요"
          gist="사람이 적으면 똑같은 두 안도 우연히 크게 달라 보여요."
          desc={<>동전을 10번 던지면 앞면이 7번 나와도 이상하지 않아요. 1,000번 던지면 거의 반반이 돼요. 실험도 같아요. 아래에서 똑같은 두 안을 20번 실험해 봐요. 그룹당 인원(<T k="표본" />)을 바꾸면 우연히 생기는 차이의 크기가 달라져요.</>}>
          <SampleSim />
          <Note tone="warn">
            <b>지켜야 할 세 가지</b><br />
            ① 그룹마다 몇 명이 필요한지는 시작 전에 분석 담당자와 계산해요. 계산하려면 기준 전환율, <T k="의미 있는 최소 차이" />, <T k="유의 수준" />, <T k="검정력" />이 필요해요. 여기서는 수식 대신 감만 잡아요.<br />
            ② 실험 도중에 결과를 보고 “이겼으니 멈추자”고 하지 않아요. 우연한 차이를 정답으로 착각하기 쉬워요.<br />
            ③ 주요 지표가 좋아도 가드레일이 나빠지면 멈추고 다시 봐요.
          </Note>
        </Section>

        <Section id="plan-metrics-check" title="지표·로그 리뷰 체크리스트"
          gist="성공 기준, 기록 규칙, 실험 계획을 출시 전에 다 정했는지 확인해요."
          desc="지표·로그 설계서를 리뷰할 때 제가 묻는 질문이에요.">
          <Checklist name="지표·데이터 리뷰 체크리스트" items={[
            ['성공 기준이 숫자로 있나요?', '“재주문율 개선” 말고 “2주 내 재주문율 18% → 22%”처럼 적어요.'],
            ['퍼널 단계마다 정의가 한 줄로 있나요?', '“활성화 = 가입 후 첫 장바구니 담기”처럼요. 누가 뽑아도 같은 숫자가 나와야 해요.'],
            ['가드레일 지표를 정했나요?', '북극성을 올리다가 망가지면 안 되는 숫자 2~4개예요.'],
            ['이벤트 이름이 팀 규칙을 지키나요?', '대상_행동, 행동_대상 중 하나로만 써요.'],
            ['발생 시점이 앱인지 서버인지 적었나요?', '결제·주문 완료는 서버가 확인한 뒤 기록해요.'],
            ['속성 이름과 타입을 정했나요?', 'item_price:number처럼 적어요. 개발자와 QA가 같은 표를 봐요.'],
            ['A/B 기간과 표본 수를 시작 전에 정했나요?', '결과를 보면서 끝낼 날을 고르지 않아요.'],
            ['출시 후 2주 리뷰 날짜를 잡았나요?', '숫자를 보는 날을 정하지 않으면 아무도 안 봐요.'],
          ]} />
        </Section>

        <Section id="plan-metrics-ref" title="참고"
          gist="이 탭의 내용은 아래 자료를 바탕으로 했어요."
          desc="확인된 자료만 적었어요.">
          <ul className="mt-ref">
            <li><b>Dave McClure</b> — “Startup Metrics for Pirates: AARRR!” 발표. 다섯 단계 퍼널의 출처예요.</li>
            <li><b>Sean Ellis · Morgan Brown, 『진화된 마케팅 그로스 해킹』(Hacking Growth)</b> — 북극성 지표, 그리고 작게 자주 실험하며 성장하는 법.</li>
            <li><b>Ron Kohavi 외, 『Trustworthy Online Controlled Experiments』</b> — A/B 테스트 설계법, 가드레일 지표, 실험 도중에 결과를 들여다보면 왜 위험한지.</li>
            <li><b>Marty Cagan, 『인스파이어드』(SVPG)</b> — 기능을 내놓은 것(output)이 아니라, 그래서 무엇이 달라졌는지(outcome)로 성공을 판단하기.</li>
            <li>함께 보기: 숫자만 쫓으면 사용자를 속이는 설계로 흐르기 쉬워요. <a href="#/darkpattern">다크 패턴 가이드 →</a></li>
            <li>다음 단계: 출시 후 숫자 확인은 <a href="#/plan/qa">QA · 출시</a> 탭의 ‘출시 후 2주 리뷰’에서 이어가요.</li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
