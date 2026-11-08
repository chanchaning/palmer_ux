import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Seg, useTimers } from '../../components/ui'
import { download } from '../../system/export'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { Term, TermList } from '../../components/Term'
import './policy.css'

/* 사전(glossary.ts)에 없는 말 — 이 탭에서만 쓰는 쉬운 뜻 */
const EXTRA: Record<string, string> = {
  '행복 경로': '아무 문제 없이 처음부터 끝까지 술술 진행되는 흐름이에요. 결제가 한 번에 되고 배송도 제때 오는 경우예요.',
  '상태 머신': '정해진 상태 사이를 정해진 길로만 옮겨 가는 구조예요. 신호등이 초록 → 노랑 → 빨강 순서로만 바뀌는 것과 같아요.',
  '전이': '한 상태에서 다른 상태로 넘어가는 것이에요. 예: 결제완료 → 배송준비중.',
  'RBAC': '역할 기반 권한(Role-Based Access Control)이에요. 사람 한 명 한 명이 아니라 ‘사장님’, ‘운영자’ 같은 역할마다 할 수 있는 일을 정해요.',
  'CRUD': '데이터에 하는 네 가지 일, 생성(Create)·조회(Read)·수정(Update)·삭제(Delete)의 첫 글자예요.',
  '리소스': '권한을 거는 대상이에요. 이 탭에서는 주문, 메뉴, 리뷰, 정산, 공지예요.',
  '정산': '팔린 금액을 계산해 사장님에게 나눠 주는 일이에요. 예: 매주 한 번 지난주 매출을 정리해 입금해요.',
  '멱등키': '요청마다 붙이는 번호표예요. 서버는 같은 번호표를 두 번 받으면 새로 처리하지 않고 처음 결과를 돌려줘요.',
  '오픈 이슈': '아직 정하지 못한 질문을 “누가, 언제까지 정할지”와 함께 적어 둔 목록이에요.',
}

/* ================= 공용 ================= */
const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCSV = (rows: (string | number)[][]) => rows.map(r => r.map(csvCell).join(',')).join('\n')
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

function CopyBtn({ text, label = '복사' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button type="button" className="btn sm ghost" onClick={async () => {
      try { await navigator.clipboard.writeText(text) } catch { /* 복사 불가 환경 */ }
      setOk(true); setTimeout(() => setOk(false), 1400)
    }}>{ok ? '✓ 복사됨' : label}</button>
  )
}

function CheckList({ id, items }: { id: string; items: string[] }) {
  const [on, setOn] = useState<boolean[]>(() => items.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <div className="po-check">
      <div className="po-check-top"><span>리뷰 전에 스스로 답해 보세요</span><b className={n === items.length ? 'is-ok' : ''}>{n} / {items.length}</b></div>
      <ul>
        {items.map((q, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" id={`${id}-${i}`} checked={on[i]} onChange={() => setOn(a => a.map((v, j) => (j === i ? !v : v)))} />
              <span>{q}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ================= 1. 주문 상태 머신 ================= */
type Actor = '구매자' | '사장님' | '시스템' | '운영자'
type SId = 'PENDING' | 'PAID' | 'PREPARING' | 'SHIPPING' | 'DELIVERED' | 'CONFIRMED' | 'CANCELED' | 'RETURN' | 'EXCHANGE'
type Zone = 'cancel' | 'approve' | 'return' | 'closed'
interface Act { label: string; actor: Actor; to?: SId; cond: string; kind?: 'cancel' | 'return' | 'main' }
interface St { name: string; zone: Zone; desc: string; acts: Act[]; auto?: string; buyerBtns: string[] }

const MAIN: SId[] = ['PENDING', 'PAID', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CONFIRMED']
const ST: Record<SId, St> = {
  PENDING: {
    name: '결제대기', zone: 'cancel', desc: '주문서는 냈지만 결제가 아직 승인되지 않았어요.',
    acts: [
      { label: '결제하기', actor: '구매자', to: 'PAID', cond: '결제가 승인되면', kind: 'main' },
      { label: '주문 취소', actor: '구매자', to: 'CANCELED', cond: '언제든 바로 돼요. 결제 전이라 돌려줄 돈이 없어요.', kind: 'cancel' },
    ],
    auto: '결제 기한이 지나면 자동 취소돼요. 기한은 정책으로 정해요 (예: 30분).',
    buyerBtns: ['결제하기', '주문 취소'],
  },
  PAID: {
    name: '결제완료', zone: 'cancel', desc: '돈은 냈고, 사장님이 아직 주문을 접수하지 않았어요.',
    acts: [
      { label: '주문 접수', actor: '사장님', to: 'PREPARING', cond: '사장님용 화면(OWN-01)에서', kind: 'main' },
      { label: '주문 거절', actor: '사장님', to: 'CANCELED', cond: '재료가 떨어졌을 때 등. 거절 이유를 꼭 골라요.', kind: 'cancel' },
      { label: '주문 취소', actor: '구매자', to: 'CANCELED', cond: '바로 취소되고 전액 환불돼요.', kind: 'cancel' },
    ],
    auto: '사장님이 정해진 시간 안에 접수하지 않으면 저절로 취소되고 환불돼요. 시간은 정책으로 정해요 (예: 20분).',
    buyerBtns: ['주문 취소'],
  },
  PREPARING: {
    name: '배송준비중', zone: 'approve', desc: '사장님이 주문을 받고 반찬을 담는 중이에요. 이미 만들기 시작했을 수도 있어요.',
    acts: [
      { label: '배송 시작', actor: '사장님', to: 'SHIPPING', cond: '배달 기사가 출발하면', kind: 'main' },
      { label: '취소 요청', actor: '구매자', cond: '바로 취소되지 않고 사장님에게 요청이 가요.', kind: 'cancel' },
      { label: '취소 요청 승인', actor: '사장님', to: 'CANCELED', cond: '승인하면 취소되고 환불돼요. 거절하면 주문이 그대로 진행돼요.', kind: 'cancel' },
    ],
    auto: '사장님이 취소 요청에 답하지 않으면 어떻게 할지 정책으로 정해요 (예: 10분 뒤 운영자에게 알림).',
    buyerBtns: ['취소 요청'],
  },
  SHIPPING: {
    name: '배송중', zone: 'return', desc: '반찬이 가게를 떠났어요. 이제부터는 "취소"라고 부르지 않아요.',
    acts: [
      { label: '배송 완료 처리', actor: '사장님', to: 'DELIVERED', cond: '문 앞에 전달한 뒤', kind: 'main' },
      { label: '배송 문의', actor: '구매자', cond: '취소 버튼 대신 문의하기를 보여줘요.' },
    ],
    auto: '배달 업체와 시스템이 연결돼 있으면, 도착 신호를 받아 저절로 배송완료가 돼요.',
    buyerBtns: ['배송 문의'],
  },
  DELIVERED: {
    name: '배송완료', zone: 'return', desc: '반찬을 받았어요. 문제가 있으면 반품·교환을 신청해요.',
    acts: [
      { label: '구매 확정', actor: '구매자', to: 'CONFIRMED', cond: '구매자가 직접 누르면 바로', kind: 'main' },
      { label: '반품 신청', actor: '구매자', to: 'RETURN', cond: '상한 반찬, 잘못 온 반찬 등. 이유와 사진을 함께 내요.', kind: 'return' },
      { label: '교환 신청', actor: '구매자', to: 'EXCHANGE', cond: '다른 반찬이 왔을 때', kind: 'return' },
    ],
    auto: '구매자가 아무것도 안 하면 N일 뒤 저절로 구매확정돼요. N은 정책으로 정해요 (예: 3일). 반품·교환을 신청할 수 있는 기간도 같이 정해요.',
    buyerBtns: ['구매 확정', '반품 신청', '교환 신청'],
  },
  CONFIRMED: {
    name: '구매확정', zone: 'closed', desc: '거래가 끝났어요. 이 주문 금액은 사장님에게 줄 돈(정산)에 들어가요.',
    acts: [
      { label: '리뷰 작성', actor: '구매자', cond: '리뷰를 쓸 수 있는 기간은 정책으로 정해요 (예: 30일)' },
      { label: '예외 환불', actor: '운영자', cond: '앱에는 버튼이 없어요. 구매자가 고객센터에 연락하면 운영자가 처리해요.' },
    ],
    auto: '정해진 정산 날이 되면 정산 목록에 들어가요. 얼마마다 할지는 정책으로 정해요 (예: 매주).',
    buyerBtns: ['리뷰 쓰기'],
  },
  CANCELED: { name: '주문취소', zone: 'closed', desc: '주문이 취소됐어요. 결제했다면 환불이 진행돼요.', acts: [], auto: '환불은 결제 수단(카드, 계좌 등)마다 걸리는 시간이 달라요. 수단별 안내 문구를 정책 장표에 적어요.', buyerBtns: ['다시 주문하기'] },
  RETURN: { name: '반품', zone: 'closed', desc: '반품 요청 → 사장님 확인 → 반품 완료(환불) 순서로 가요. 이 안의 작은 단계는 따로 그려요.', acts: [{ label: '반품 승인 / 거절', actor: '사장님', cond: '거절하면 이유를 남겨요. 구매자는 운영자에게 다시 판단해 달라고 할 수 있어요.' }], buyerBtns: ['반품 진행 상황'] },
  EXCHANGE: { name: '교환', zone: 'closed', desc: '교환 요청 → 사장님 확인 → 다시 배송으로 가요. 반찬은 재고가 없으면 교환 대신 반품으로 안내해요.', acts: [{ label: '교환 승인 / 반품 전환', actor: '사장님', cond: '같은 반찬이 없으면 반품으로 바꿔요' }], buyerBtns: ['교환 진행 상황'] },
}
const ZONE_LABEL: Record<Zone, string> = { cancel: '바로 취소', approve: '승인 후 취소', return: '반품·교환', closed: '종료' }

function stateMd() {
  const L = ['# 오늘반찬 주문 상태 정의', '', '| 상태 | 설명 | 행동 | 행위자 | 다음 상태 | 조건 |', '|---|---|---|---|---|---|']
  for (const id of [...MAIN, 'CANCELED', 'RETURN', 'EXCHANGE'] as SId[]) {
    const s = ST[id]
    if (!s.acts.length) L.push(`| ${s.name} | ${s.desc} | - | - | - | - |`)
    s.acts.forEach((a, i) => L.push(`| ${i ? '' : s.name} | ${i ? '' : s.desc} | ${a.label} | ${a.actor} | ${a.to ? ST[a.to].name : '(변화 없음)'} | ${a.cond} |`))
    if (s.auto) L.push(`| | | (자동) | 시스템 | | ${s.auto} |`)
  }
  L.push('', '## 경계', '- 배송준비중까지는 "취소", 배송중부터는 "반품·교환"이라고 불러요. 기준은 상품이 가게를 떠났는지예요.', '- 숫자(N분·N일)는 모두 정책으로 정해요. 정한 값, 정한 날짜, 정한 사람을 함께 적어요.')
  return L.join('\n')
}

function StateMachine() {
  const [sel, setSel] = useState<SId>('PAID')
  const [trail, setTrail] = useState<SId[]>(['PAID'])
  const s = ST[sel]
  const go = (to: SId) => { setSel(to); setTrail(t => [...t, to].slice(-8)) }
  const pick = (id: SId) => { setSel(id); setTrail([id]) }
  const md = useMemo(stateMd, [])
  const reached = (id: SId) => MAIN.indexOf(id) <= MAIN.indexOf(sel) && MAIN.includes(sel)

  return (
    <div className="po-sm">
      <div className="po-sm-zones" aria-hidden="true">
        <span className="z cancel">취소 구간</span>
        <span className="z return">반품·교환 구간</span>
      </div>
      <ol className="po-sm-chain" aria-label="주문 상태 흐름">
        {MAIN.map((id, i) => (
          <li key={id} className={'po-sm-item ' + ST[id].zone + (i === 3 ? ' after-border' : '')}>
            {i === 3 && (
              <div className="po-border" role="note">
                <span>여기서 <b>취소</b>가 <b>반품</b>이 돼요</span>
                <small>반찬이 가게를 떠났기 때문이에요</small>
              </div>
            )}
            <button type="button" className={'po-state' + (sel === id ? ' on' : '') + (reached(id) ? ' reached' : '')} aria-pressed={sel === id} onClick={() => pick(id)}>
              <small>{String(i + 1).padStart(2, '0')}</small>
              <b>{ST[id].name}</b>
              <span className={'po-zone ' + ST[id].zone}>{ZONE_LABEL[ST[id].zone]}</span>
            </button>
            {i < MAIN.length - 1 && <span className="po-arrow" aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
      <div className="po-sm-side" aria-label="종료·예외 상태">
        {(['CANCELED', 'RETURN', 'EXCHANGE'] as SId[]).map(id => (
          <button key={id} type="button" className={'po-state po-side ' + id.toLowerCase() + (sel === id ? ' on' : '')} aria-pressed={sel === id} onClick={() => pick(id)}>
            <b>{ST[id].name}</b>
            <small>{id === 'CANCELED' ? '결제대기·결제완료·배송준비중에서' : '배송완료에서'}</small>
          </button>
        ))}
      </div>

      <div className="po-sm-detail">
        <div className="po-sm-main">
          <div className="po-sm-head">
            <h4>{s.name}</h4>
            <span className={'po-zone ' + s.zone}>{ZONE_LABEL[s.zone]}</span>
          </div>
          <p className="po-sm-desc">{s.desc}</p>
          {s.acts.length > 0 && (
            <div className="sys-table-wrap">
              <table className="sys-table po-acts">
                <thead><tr><th>할 수 있는 행동</th><th style={{ width: 84 }}>누가</th><th>조건</th><th style={{ width: 120 }}>다음 상태</th></tr></thead>
                <tbody>
                  {s.acts.map(a => (
                    <tr key={a.label} className={a.kind ? 'k-' + a.kind : ''}>
                      <td><b>{a.label}</b></td>
                      <td><span className={'po-actor ' + a.actor}>{a.actor}</span></td>
                      <td>{a.cond}</td>
                      <td>{a.to ? <button type="button" className="po-go" onClick={() => go(a.to!)}>{ST[a.to].name} →</button> : <span className="muted">그대로</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.auto && <div className="po-auto"><span className="po-actor 시스템">시스템</span><span><b>저절로 넘어가는 경우</b> {s.auto}</span></div>}
          <div className="po-trail"><span className="muted">따라온 길</span>{trail.map((t, i) => <span key={i} className="po-trail-i">{i > 0 && '→ '}{ST[t].name}</span>)}</div>
        </div>
        <div className="po-mock" aria-label="구매자 주문 상세 화면 미리보기">
          <div className="po-mock-top"><code>ORD-04-01</code> 주문 상세</div>
          <div className="po-mock-body">
            <span className={'po-badge ' + s.zone}>{s.name}</span>
            <b>엄마손 반찬가게</b>
            <span className="muted">장조림 외 2개 · 23,000원</span>
            <div className="po-mock-lines" aria-hidden="true"><i /><i /><i /></div>
          </div>
          <div className="po-mock-btns">
            {s.buyerBtns.map((b, i) => <span key={b} className={'po-mbtn' + (i === 0 ? ' pri' : '')}>{b}</span>)}
          </div>
          <small className="po-mock-cap">상태가 바뀌면 구매자가 보는 버튼도 바뀌어요. 화면설계서에 상태마다 적어요.</small>
        </div>
      </div>
      <div className="po-row">
        <span className="muted">표의 <b>다음 상태 →</b> 버튼을 누르면 상태가 실제로 바뀌어요.</span>
        <span className="po-grow" />
        <CopyBtn text={md} label="상태 정의표 복사(.md)" />
        <button type="button" className="btn sm" onClick={() => download('오늘반찬_주문상태.md', md, 'text/markdown;charset=utf-8')}>마크다운 내려받기</button>
      </div>
    </div>
  )
}

/* ================= 2. 권한 매트릭스 ================= */
const ROLES = ['비로그인', '구매자', '사장님', '운영자', '최고관리자'] as const
const RES = ['주문', '메뉴', '리뷰', '정산', '공지'] as const
const OPS = ['C', 'R', 'U', 'D'] as const
const OP_NAME: Record<typeof OPS[number], string> = { C: '생성', R: '조회', U: '수정', D: '삭제' }
type Role = typeof ROLES[number]; type Res = typeof RES[number]; type Op = typeof OPS[number]
type Lv = 0 | 1 | 2 // 없음 · 본인(자기 가게) 것만 · 전체
type Matrix = Record<Res, Record<Role, Record<Op, Lv>>>
const LV_LABEL = ['없음', '본인 것만', '전체'] as const

const mk = (spec: Record<Res, Record<Role, string>>): Matrix => {
  const m = {} as Matrix
  for (const r of RES) {
    m[r] = {} as Record<Role, Record<Op, Lv>>
    for (const ro of ROLES) {
      const code = spec[r][ro] // 예: "C1R2U0D0" 대신 4글자 "1200"
      m[r][ro] = { C: +code[0] as Lv, R: +code[1] as Lv, U: +code[2] as Lv, D: +code[3] as Lv }
    }
  }
  return m
}
/* 4글자 = C R U D, 0 없음 · 1 본인 · 2 전체. 일부러 실수 3개를 넣어 뒀어요 */
const SEED_M = () => mk({
  주문: { 비로그인: '0000', 구매자: '1110', 사장님: '0110', 운영자: '0220', 최고관리자: '0220' },
  메뉴: { 비로그인: '0200', 구매자: '0200', 사장님: '1211', 운영자: '0222', 최고관리자: '2222' },
  리뷰: { 비로그인: '0200', 구매자: '1211', 사장님: '0210', 운영자: '0002', 최고관리자: '0202' },
  정산: { 비로그인: '0000', 구매자: '0000', 사장님: '0100', 운영자: '0222', 최고관리자: '0220' },
  공지: { 비로그인: '0200', 구매자: '0200', 사장님: '0200', 운영자: '2222', 최고관리자: '2222' },
})
const CLEAN_M = () => mk({
  주문: { 비로그인: '0000', 구매자: '1110', 사장님: '0110', 운영자: '0220', 최고관리자: '0220' },
  메뉴: { 비로그인: '0200', 구매자: '0200', 사장님: '1211', 운영자: '0222', 최고관리자: '2222' },
  리뷰: { 비로그인: '0200', 구매자: '1211', 사장님: '0200', 운영자: '0202', 최고관리자: '0202' },
  정산: { 비로그인: '0000', 구매자: '0000', 사장님: '0100', 운영자: '0220', 최고관리자: '0220' },
  공지: { 비로그인: '0200', 구매자: '0200', 사장님: '0200', 운영자: '2222', 최고관리자: '2222' },
})

const ga = (w: string) => w + ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '이' : '가')
const eul = (w: string) => w + ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '을' : '를')
interface Warn { level: 'danger' | 'warn'; msg: string; cells: string[] }
const cellKey = (r: Res, ro: Role, op: Op) => `${r}|${ro}|${op}`
function lint(m: Matrix): Warn[] {
  const W: Warn[] = []
  for (const r of RES) for (const ro of ROLES) {
    const p = m[r][ro]
    for (const op of ['U', 'D'] as Op[]) {
      if (p[op] && !p.R) W.push({ level: 'danger', msg: `${ga(ro)} ${eul(r)} ${OP_NAME[op]}할 수 있는데 조회는 못 해요. 보지도 못하는 것을 고치거나 지우게 돼요.`, cells: [cellKey(r, ro, op), cellKey(r, ro, 'R')] })
      else if (p[op] > p.R) W.push({ level: 'warn', msg: `${ro}의 ${r} ${OP_NAME[op]} 범위(${LV_LABEL[p[op]]})가 조회 범위(${LV_LABEL[p.R]})보다 넓어요. 볼 수 있는 것보다 많이 건드릴 수 있다는 뜻이에요.`, cells: [cellKey(r, ro, op), cellKey(r, ro, 'R')] })
    }
    if (ro === '비로그인') for (const op of ['C', 'U', 'D'] as Op[]) if (p[op]) W.push({ level: 'danger', msg: `로그인 안 한 사람이 ${eul(r)} ${OP_NAME[op]}할 수 있어요. 누가 했는지 기록이 남지 않아요. 비회원 주문처럼 일부러 허용한 거라면, 본인 확인 방법을 정책에 적어요.`, cells: [cellKey(r, ro, op)] })
  }
  for (const r of RES) {
    if (m[r]['사장님'].U && r === '리뷰') W.push({ level: 'danger', msg: '사장님이 고객 리뷰를 고칠 수 있어요. 그러면 리뷰를 믿을 수 없게 돼요. 사장님 답글은 "리뷰 답글"이라는 별도 항목으로 나눠요.', cells: [cellKey('리뷰', '사장님', 'U')] })
    if (r === '정산') for (const ro of ROLES) if (m[r][ro].D) W.push({ level: 'warn', msg: `${ga(ro)} 정산을 삭제할 수 있어요. 돈과 관련된 기록은 지우지 않아요. 대신 "취소·정정" 기록을 새로 남겨요.`, cells: [cellKey('정산', ro, 'D')] })
    for (const op of OPS) if (m[r]['운영자'][op] > m[r]['최고관리자'][op]) W.push({ level: 'warn', msg: `${r} ${OP_NAME[op]}: 운영자가 최고관리자보다 권한이 넓어요. 윗 역할은 아랫 역할이 할 수 있는 일을 모두 할 수 있어야 해요.`, cells: [cellKey(r, '운영자', op), cellKey(r, '최고관리자', op)] })
  }
  return W
}

function RBAC() {
  const [m, setM] = useState<Matrix>(SEED_M)
  const [hl, setHl] = useState<string[]>([])
  const warns = useMemo(() => lint(m), [m])
  const bad = useMemo(() => new Set(warns.flatMap(w => w.cells)), [warns])
  const cycle = (r: Res, ro: Role, op: Op) => setM(x => ({ ...x, [r]: { ...x[r], [ro]: { ...x[r][ro], [op]: ((x[r][ro][op] + 1) % 3) as Lv } } }))
  const csv = useMemo(() => toCSV([
    ['리소스', '역할', ...OPS.map(o => `${OP_NAME[o]}(${o})`), '비고'],
    ...RES.flatMap(r => ROLES.map(ro => [r, ro, ...OPS.map(o => LV_LABEL[m[r][ro][o]]), ''])),
  ]), [m])

  return (
    <div className="po-rbac">
      <div className="po-row">
        <span className="po-lv-legend"><i className="lv0" />없음 <i className="lv1" />본인(자기 가게) 것만 <i className="lv2" />전체</span>
        <span className="po-grow" />
        <button type="button" className="btn sm ghost" onClick={() => { setM(SEED_M()); setHl([]) }}>실수 섞인 예시</button>
        <button type="button" className="btn sm ghost" onClick={() => { setM(CLEAN_M()); setHl([]) }}>고친 예시</button>
      </div>
      <div className="sys-table-wrap po-mx-wrap">
        <table className="po-mx">
          <thead>
            <tr><th rowSpan={2} className="res">리소스</th>{ROLES.map(ro => <th key={ro} colSpan={4} className="role">{ro}</th>)}</tr>
            <tr>{ROLES.map(ro => OPS.map(op => <th key={ro + op} className={'op' + (op === 'C' ? ' first' : '')} title={OP_NAME[op]}>{op}</th>))}</tr>
          </thead>
          <tbody>
            {RES.map(r => (
              <tr key={r}>
                <th className="res">{r}</th>
                {ROLES.map(ro => OPS.map(op => {
                  const k = cellKey(r, ro, op), v = m[r][ro][op]
                  return (
                    <td key={k} className={(op === 'C' ? 'first ' : '') + (bad.has(k) ? 'bad ' : '') + (hl.includes(k) ? 'hl' : '')}>
                      <button type="button" className={'po-cell lv' + v} data-cell={k} onClick={() => cycle(r, ro, op)}
                        aria-label={`${r} · ${ro} · ${OP_NAME[op]}: ${LV_LABEL[v]}. 눌러서 바꾸기`}>
                        {v === 2 ? '●' : v === 1 ? '◐' : '·'}
                      </button>
                    </td>
                  )
                }))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={'po-warns' + (warns.length ? '' : ' clean')} aria-live="polite">
        <div className="po-warns-head">
          {warns.length ? <><b>이상한 칸 {warns.length}개</b><span className="muted">문장을 누르면 그 칸이 표에서 깜빡여요.</span></> : <b>✓ 눈에 띄는 문제가 없어요</b>}
        </div>
        {warns.map((w, i) => (
          <button key={i} type="button" className={'po-warn ' + w.level} onClick={() => setHl(w.cells)}>{w.level === 'danger' ? '위험 ·' : '주의 ·'} {w.msg}</button>
        ))}
      </div>
      <div className="po-row">
        <span className="muted">칸을 누를 때마다 없음 → 본인 것만 → 전체 순서로 바뀌어요.</span>
        <span className="po-grow" />
        <CopyBtn text={csv} label="CSV 복사" />
        <button type="button" className="btn sm" data-export="rbac-csv" onClick={() => download('오늘반찬_권한매트릭스.csv', '﻿' + csv, 'text/csv;charset=utf-8')}>CSV 내려받기</button>
      </div>
    </div>
  )
}

/* ================= 3. 엣지 케이스 생성기 ================= */
type ScreenType = 'form' | 'pay' | 'list' | 'upload' | 'login'
const TYPES: { k: ScreenType; label: string; sample: string }[] = [
  { k: 'form', label: '폼', sample: 'OWN-02-01 메뉴 등록·수정' },
  { k: 'pay', label: '결제', sample: 'ORD-02 주문서 · 결제' },
  { k: 'list', label: '검색·목록', sample: 'SRCH-01 검색 결과' },
  { k: 'upload', label: '업로드', sample: 'ORD-05 리뷰 사진 첨부' },
  { k: 'login', label: '로그인', sample: 'MY-01 로그인' },
]
interface Edge { cat: string; q: string; ex: string; types: ScreenType[] | 'all' }
const EDGES: Edge[] = [
  { cat: '네트워크', q: '요청 중에 네트워크가 끊기면?', ex: '입력값은 그대로 두고 "연결이 끊겼어요. 다시 시도" 버튼을 보여줘요.', types: 'all' },
  { cat: '로그인 풀림', q: '작업 중에 로그인이 풀리면(세션 만료)?', ex: '다시 로그인하면 원래 화면으로 돌아오고, 쓰던 내용은 그대로 남아 있어요.', types: 'all' },
  { cat: '권한', q: '권한 없는 사람이 주소(URL)로 직접 들어오면?', ex: '구매자가 사장님용 화면 주소를 열면 "접근 권한이 없어요" 화면과 [홈으로 가기] 버튼을 보여줘요.', types: 'all' },
  { cat: '중복', q: '버튼을 빠르게 두 번 누르면(따닥)?', ex: '처음 누른 뒤 버튼을 막고 "처리 중"을 보여줘요. 서버는 같은 요청을 한 번만 처리해요.', types: ['form', 'pay', 'upload', 'login'] },
  { cat: '이탈', q: '쓰는 중에 뒤로 가기를 누르면? (임시 저장할까, 확인 창을 띄울까)', ex: '긴 글(메뉴 설명)은 임시 저장해요. 짧은 입력 화면은 "작성을 그만할까요?" 확인 창을 띄워요. 어느 쪽을 쓸지 화면마다 정해요.', types: ['form', 'upload'] },
  { cat: '입력', q: '필수값이 비었을 때 언제, 어디에 알려 주나요?', ex: '제출할 때 첫 번째 빈칸으로 화면을 옮기고, 칸 아래에 빨간 문구를 보여줘요. 입력하는 중에는 미리 혼내지 않아요.', types: ['form', 'pay'] },
  { cat: '입력', q: '아주 긴 값(예: 200자 상품명)이 들어오면?', ex: '최대 글자 수를 정해요. 목록에서는 2줄이 넘으면 "…"로 줄이고, 상세 화면에서는 전부 보여줘요.', types: ['form', 'list'] },
  { cat: '입력', q: '이모지·특수문자·앞뒤 공백을 붙여 넣으면?', ex: '앞뒤 공백은 저장할 때 지워요. 못 쓰는 문자는 입력할 때 바로 알려줘요.', types: ['form', 'login'] },
  { cat: '동시 수정', q: '두 사람(또는 두 기기)이 같은 걸 동시에 고치면?', ex: '사장님이 PC와 폰에서 같은 메뉴를 고치면, 나중에 저장할 때 "다른 곳에서 먼저 바뀌었어요"라고 알려요.', types: ['form'] },
  { cat: '데이터', q: '결제 직전에 품절되거나 가격이 바뀌면?', ex: '결제 버튼을 누른 순간 한 번 더 확인해요. 금액이 바뀌었으면 바뀐 금액을 보여주고 다시 동의를 받아요.', types: ['pay'] },
  { cat: '외부 연동', q: '결제 승인 응답이 늦거나 오지 않으면(타임아웃)?', ex: '"결제 확인 중" 화면을 계속 보여주고, 서버가 결과를 다시 물어봐요. 사용자가 또 결제하게 두지 않아요.', types: ['pay'] },
  { cat: '외부 연동', q: '돈은 빠져나갔는데 주문이 만들어지지 않으면?', ex: '저절로 취소(환불)하는 규칙과 운영자에게 갈 알림을 정해요. 사용자에게는 "결제가 취소됐어요"라고 분명히 알려요.', types: ['pay'] },
  { cat: '이탈', q: '결제 중 앱이 꺼지거나 전화가 오면?', ex: '앱을 다시 열면 주문 상세 화면으로 보내 결제 결과를 보여줘요.', types: ['pay'] },
  { cat: '데이터', q: '쿠폰으로 0원이 되면?', ex: '결제 수단 선택을 건너뛰고 "0원 결제" 버튼으로 바로 주문해요.', types: ['pay'] },
  { cat: '0건', q: '결과가 0건이면?', ex: '입력한 검색어를 보여주고, "철자 확인 · 다른 검색어 추천 · 동네 인기 반찬"을 함께 보여줘요.', types: ['list'] },
  { cat: '0건', q: '필터 조합 때문에 0건이면?', ex: '어떤 필터 때문에 0건인지 보여주고 "필터 하나씩 풀기" 버튼을 줘요.', types: ['list'] },
  { cat: '양', q: '결과가 아주 많으면(예: 1,000건)?', ex: '한 번에 몇 개씩 불러올지(예: 20개) 정해요. 끝에 닿으면 이어 붙일지(무한 스크롤), 페이지 번호를 둘지도 정해요.', types: ['list'] },
  { cat: '데이터', q: '목록을 보는 사이 항목이 지워지거나 품절되면?', ex: '누르면 "판매가 끝난 반찬이에요"라고 알리고 목록을 새로 불러와요.', types: ['list'] },
  { cat: '데이터', q: '이미지가 안 불러와지면?', ex: '이미지 자리에 회색 상자를 두고 반찬 이름은 그대로 보여줘요. 화면이 덜컹거리지 않게 자리를 미리 잡아 둬요.', types: ['list', 'upload'] },
  { cat: '입력', q: '오타·띄어쓰기·초성으로 검색하면?', ex: '"장 조림", "ㅈㅈㄹ"도 찾을지 개발자와 정해요. 못 찾으면 0건 화면으로.', types: ['list'] },
  { cat: '파일', q: '용량·형식이 맞지 않으면?', ex: '고르기 전에 "사진 최대 N장, 장당 N MB"를 알려줘요. 넘으면 어떤 파일이 문제인지 보여줘요(숫자는 정책으로 정해요).', types: ['upload'] },
  { cat: '파일', q: '여러 장 중 일부만 실패하면?', ex: '성공한 것은 두고, 실패한 사진에만 "다시 올리기"를 보여줘요.', types: ['upload'] },
  { cat: '파일', q: '사진에 개인정보(주소·전화번호)가 찍혀 있으면?', ex: '영수증 사진을 올리기 전에 주의 문구를 보여줘요. 신고가 들어오면 운영자가 가릴 수 있게 어드민 기능도 정해요.', types: ['upload'] },
  { cat: '보안', q: '비밀번호를 여러 번 틀리면?', ex: 'N번 틀리면 잠시 잠그거나 추가 인증을 받아요. 횟수는 정책으로 정해요 (예: 5회).', types: ['login'] },
  { cat: '계정', q: '휴면·탈퇴·정지 계정이 로그인하면?', ex: '상태마다 안내가 달라요. 휴면은 본인 인증 후 풀어 주고, 탈퇴는 다시 가입하라고 안내하고, 정지는 이유와 문의처를 알려요.', types: ['login'] },
  { cat: '계정', q: '소셜 로그인 이메일이 기존 계정과 같으면?', ex: '같은 사람인지 확인한 뒤 두 계정을 연결할지 물어봐요. 몰래 합치지 않아요.', types: ['login'] },
  { cat: '이탈', q: '로그인하고 나면 어디로 가나요?', ex: '장바구니에서 왔으면 장바구니로, 그냥 들어왔으면 홈으로 보내요. "돌아갈 곳"을 기억해 둬요.', types: ['login'] },
]

function EdgeGen() {
  const [types, setTypes] = useState<ScreenType[]>(['pay'])
  const [screen, setScreen] = useState(TYPES[1].sample)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const items = EDGES.filter(e => e.types === 'all' || e.types.some(t => types.includes(t)))
  const n = items.filter(e => done[e.q]).length
  const toggleType = (k: ScreenType) => {
    const next = types.includes(k) ? types.filter(t => t !== k) : [...types, k]
    setTypes(next.length ? next : [k])
    if (!types.includes(k)) setScreen(TYPES.find(t => t.k === k)!.sample)
  }
  const md = useMemo(() => {
    const L = [`# 엣지 케이스 체크리스트 — ${screen || '(화면 이름)'}`, '', `- 화면 유형: ${types.map(t => TYPES.find(x => x.k === t)!.label).join(', ')}`, `- 정한 항목: ${n} / ${items.length}`, '']
    const cats = [...new Set(items.map(i => i.cat))]
    for (const c of cats) {
      L.push(`## ${c}`)
      items.filter(i => i.cat === c).forEach(i => L.push(`- [${done[i.q] ? 'x' : ' '}] ${i.q}`, `  - 예: ${i.ex}`, '  - 우리 정책: '))
      L.push('')
    }
    return L.join('\n')
  }, [items, done, screen, types, n])

  return (
    <div className="po-edge">
      <div className="po-edge-ctl">
        <div className="po-edge-types">
          <span className="muted">화면 유형 (여러 개 골라도 돼요)</span>
          <div className="chips">
            {TYPES.map(t => <button key={t.k} type="button" className="chip" aria-pressed={types.includes(t.k)} data-type={t.k} onClick={() => toggleType(t.k)}>{t.label}</button>)}
          </div>
        </div>
        <label className="po-edge-name">
          <span className="muted">화면 이름 · ID</span>
          <input value={screen} onChange={e => setScreen(e.target.value)} />
        </label>
      </div>
      <div className="po-edge-prog"><span>정책을 정한 항목</span><b>{n} / {items.length}</b><div className="po-bar"><i style={{ width: `${items.length ? (n / items.length) * 100 : 0}%` }} /></div></div>
      <ul className="po-edge-list">
        {items.map(e => (
          <li key={e.q} className={done[e.q] ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={!!done[e.q]} onChange={() => setDone(d => ({ ...d, [e.q]: !d[e.q] }))} />
              <span className="po-edge-txt">
                <span className="po-edge-cat">{e.cat}</span>
                <b>{e.q}</b>
                <small>{e.ex}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="po-row">
        <span className="muted">체크한 항목은 마크다운 파일에서 <code>[x]</code>로 표시돼요. "우리 정책" 칸을 채운 뒤 화면설계서에 붙여요.</span>
        <span className="po-grow" />
        <CopyBtn text={md} label="마크다운 복사" />
        <button type="button" className="btn sm" data-export="edge-md" onClick={() => download('엣지케이스_체크리스트.md', md, 'text/markdown;charset=utf-8')}>.md 내려받기</button>
      </div>
      <CodeBlock code={md} label="미리보기 (.md)" maxHeight={200} />
    </div>
  )
}

/* ================= 4. 따닥 데모 ================= */
interface Req { n: number; key?: string; t: 'charge' | 'dup' | 'ignored'; via: string }
const PRICE = 23000
const newKey = () => 'ord-' + Math.random().toString(16).slice(2, 8)

function DoubleClick() {
  const timers = useTimers()
  const [aLog, setALog] = useState<Req[]>([])
  const [bLog, setBLog] = useState<Req[]>([])
  const [aBusy, setABusy] = useState(0)
  const [bState, setBState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [disable, setDisable] = useState(true)
  const [idem, setIdem] = useState(true)
  const [key, setKey] = useState(newKey)
  const bBusyRef = useRef(false)
  const doneKeys = useRef(new Set<string>())
  const seqA = useRef(0), seqB = useRef(0)

  const pressA = (via = '클릭') => {
    const n = ++seqA.current
    setABusy(b => b + 1)
    timers.set(() => { setALog(l => [...l, { n, t: 'charge', via }]); setABusy(b => b - 1) }, 900)
  }
  const sendB = (via: string) => {
    const n = ++seqB.current
    const k = idem ? key : undefined
    timers.set(() => {
      const dup = !!k && doneKeys.current.has(k)
      if (k) doneKeys.current.add(k)
      setBLog(l => [...l, { n, key: k, t: dup ? 'dup' : 'charge', via }])
      bBusyRef.current = false
      setBState('done')
    }, 900)
  }
  const pressB = (via = '클릭') => {
    if (disable && bBusyRef.current) { setBLog(l => [...l, { n: 0, t: 'ignored', via }]); return }
    if (disable && bState === 'done') return
    bBusyRef.current = true
    setBState('busy')
    sendB(via)
  }
  const retryB = () => { bBusyRef.current = true; setBState('busy'); sendB('자동 재전송') }
  const dadak = () => {
    pressA('따닥 1'); timers.set(() => pressA('따닥 2'), 70)
    pressB('따닥 1'); timers.set(() => pressB('따닥 2'), 70)
  }
  const reset = () => {
    timers.clear(); setALog([]); setBLog([]); setABusy(0); setBState('idle'); bBusyRef.current = false
    doneKeys.current.clear(); seqA.current = 0; seqB.current = 0; setKey(newKey())
  }
  const aCharges = aLog.filter(r => r.t === 'charge').length
  const bCharges = bLog.filter(r => r.t === 'charge').length
  const bBtnDisabled = disable && bState !== 'idle'

  const Log = ({ rows }: { rows: Req[] }) => (
    <ol className="po-log" aria-live="polite">
      {rows.length === 0 && <li className="empty">서버 기록이 비어 있어요</li>}
      {rows.map((r, i) => (
        <li key={i} className={r.t}>
          {r.t === 'charge' && <>결제 승인 #{r.n} · {won(PRICE)} <small>{r.via}{r.key ? ` · 키 ${r.key}` : ''}</small></>}
          {r.t === 'dup' && <>↩ 같은 번호표(키) → 새로 결제하지 않고 처음 결과를 돌려줌 <small>{r.via} · 키 {r.key}</small></>}
          {r.t === 'ignored' && <>버튼이 이미 막혀 있어서 요청을 보내지 않음 <small>{r.via}</small></>}
        </li>
      ))}
    </ol>
  )

  return (
    <div className="po-dd">
      <div className="po-row">
        <button type="button" className="btn sm orange" data-act="dadak" onClick={dadak}>양쪽 다 따닥 누르기 (0.07초 사이에 2번)</button>
        <button type="button" className="btn sm ghost" onClick={reset}>처음부터</button>
        <span className="muted">아래 결제 버튼을 직접 빠르게 두 번 눌러 봐도 돼요.</span>
      </div>
      <div className="po-dd-grid">
        <div className="po-dd-side bad">
          <div className="po-dd-title"><span className="po-tag bad">막지 않음</span><b>버튼이 계속 눌려요</b></div>
          <div className="po-phone">
            <div className="po-phone-top"><code>ORD-02</code> 주문서</div>
            <div className="po-phone-sum"><span>결제 금액</span><b>{won(PRICE)}</b></div>
            <button type="button" className="po-pay" data-side="a" onClick={() => pressA()}>{won(PRICE)} 결제하기</button>
            {aBusy > 0 && <small className="po-phone-hint">요청 {aBusy}개 처리 중… (화면에는 아무 표시가 없어요)</small>}
          </div>
          <Log rows={aLog} />
          <div className={'po-total' + (aCharges > 1 ? ' over' : '')} data-total="a">빠져나간 돈 <b>{won(aCharges * PRICE)}</b>{aCharges > 1 && <span> · {aCharges}번 결제됨</span>}</div>
        </div>

        <div className="po-dd-side good">
          <div className="po-dd-title"><span className="po-tag good">막음</span><b>세 겹으로 막아요</b></div>
          <div className="po-layers" role="group" aria-label="방어 장치 켜고 끄기">
            <label><input type="checkbox" checked={disable} onChange={e => setDisable(e.target.checked)} /> ① 버튼 막기 + ② 처리 중 표시 <small>(화면)</small></label>
            <label><input type="checkbox" checked={idem} onChange={e => setIdem(e.target.checked)} /> ③ 멱등키(중복 방지 번호표) <small>(서버)</small></label>
          </div>
          <div className="po-phone">
            <div className="po-phone-top"><code>ORD-02</code> 주문서 {idem && <span className="po-key" title="주문서를 열 때 한 번 만든 번호표">키 {key}</span>}</div>
            <div className="po-phone-sum"><span>결제 금액</span><b>{won(PRICE)}</b></div>
            <button type="button" className={'po-pay' + (bState === 'busy' && disable ? ' busy' : '') + (bState === 'done' && disable ? ' done' : '')}
              data-side="b" disabled={bBtnDisabled} aria-busy={bState === 'busy'} onClick={() => pressB()}>
              {disable && bState === 'busy' ? <><span className="po-spin" aria-hidden="true" />결제 중…</> : disable && bState === 'done' ? '✓ 결제 완료' : `${won(PRICE)} 결제하기`}
            </button>
            <button type="button" className="po-retry" onClick={retryB} title="응답이 늦어서 앱이 같은 요청을 한 번 더 보낸 상황">↻ 같은 요청 다시 보내기</button>
          </div>
          <Log rows={bLog} />
          <div className={'po-total' + (bCharges > 1 ? ' over' : ' ok')} data-total="b">빠져나간 돈 <b>{won(bCharges * PRICE)}</b>{bCharges > 1 ? <span> · {bCharges}번 결제됨</span> : bCharges === 1 ? <span> · 1번만 ✓</span> : null}</div>
        </div>
      </div>
      <div className="po-dd-explain">
        <div><b>① 버튼 막기</b><p>처음 누른 직후 버튼을 못 누르게 막아요(비활성화). 사람이 실수로 두 번 누르는 건 대부분 여기서 막혀요.</p></div>
        <div><b>② 처리 중 표시</b><p>"결제 중…"과 빙글빙글 도는 표시(스피너)로 지금 처리 중이라고 알려요. 표시가 없으면 사람은 안 눌린 줄 알고 또 눌러요.</p></div>
        <div><b>③ 멱등키</b><p>은행 창구 번호표와 비슷해요. 주문서를 열 때 번호표(키)를 하나 만들어 결제 요청에 붙여요. 서버는 같은 번호표를 두 번 받으면 새로 결제하지 않고 처음 결과를 돌려줘요. 그래서 앱이 요청을 다시 보내는 것처럼, 화면에서 못 막는 중복도 막아요.</p></div>
      </div>
      <Note tone="warn"><b>①만 켜고 “같은 요청 다시 보내기”를 눌러 보세요.</b> 화면에서 막는 것만으로는 앱이나 네트워크가 다시 보내는 요청을 막지 못해요. 기획서에는 "버튼 막기"와 함께 "서버에서 같은 주문이 두 번 결제되지 않게 막는다"를 꼭 적어요. 어떻게 막을지는 개발자에게 물어봐요. 버튼이 로딩 중일 때의 모양은 <a href="#/loading/loading-button">버튼 로딩</a> 카드를 보세요.</Note>
    </div>
  )
}

/* ================= 좋은 예 vs 나쁜 예 ================= */
function GoodBad() {
  const [mode, setMode] = useState<'bad' | 'good'>('bad')
  const pairs: { topic: string; bad: ReactNode; good: ReactNode; why: string }[] = [
    {
      topic: '취소 정책',
      bad: <>"주문 취소 가능"</>,
      good: <>결제대기·결제완료: 구매자가 <b>바로 취소</b>(전액 환불). 배송준비중: <b>취소 요청 → 사장님 승인</b>. 배송중부터: 취소 버튼을 숨기고, <b>배송완료 후 반품 신청</b>으로 안내.</>,
      why: '"언제, 누가, 어떻게, 그다음엔 어떤 상태"가 들어가야 개발자가 "만약 ~이면" 규칙을 코드로 옮길 수 있어요.',
    },
    {
      topic: '자동 처리',
      bad: <>"일정 기간 후 자동 구매확정"</>,
      good: <>배송완료 후 <b>N일</b>(정책으로 정해요, 예: 3일)째 0시에 저절로 구매확정. 그 전에 반품을 신청하면 자동 확정을 멈춰요. 확정 하루 전에 알림을 보낼지는 오픈 이슈로 남겨요.</>,
      why: '"일정 기간"은 숫자가 아니에요. 값을 아직 못 정했으면 N으로 두고, 누가 언제 정할지 적어요.',
    },
    {
      topic: '권한',
      bad: <>"관리자만 수정 가능"</>,
      good: <>운영자: 공지 생성·조회·수정·삭제(전체). 사장님: 메뉴 수정(<b>자기 가게만</b>). 정산은 누구도 삭제하지 않고 <b>정정 기록</b>을 남겨요.</>,
      why: '"관리자"가 운영자인지 최고관리자인지 나눠야 해요. 범위가 전체인지, 자기 것만인지도요.',
    },
    {
      topic: '중복 클릭',
      bad: <>"버튼 중복 클릭 방지"</>,
      good: <>누른 직후 버튼을 막고 "결제 중…"을 보여줘요. 응답이 오면 주문 완료 화면으로 가요. 서버는 <b>같은 주문 키</b>로 온 결제를 한 번만 처리해요. 응답이 늦으면(예: 10초) "결제 확인 중" 화면을 보여줘요.</>,
      why: '화면에서 막는 것과 서버에서 막는 것을 나눠 적어요. 둘 다 있어야 해요.',
    },
  ]
  return (
    <div className="po-gb">
      <Seg value={mode} onChange={setMode} options={[['bad', '✕ 나쁜 예'], ['good', '✓ 좋은 예']]} />
      <div className="po-gb-list">
        {pairs.map(p => (
          <div key={p.topic} className={'po-gb-item ' + mode}>
            <div className="po-gb-topic">{p.topic}</div>
            <div className="po-gb-body">{mode === 'bad' ? p.bad : p.good}</div>
            {mode === 'good' && <div className="po-gb-why">{p.why}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================= 탭 ================= */
export default function Tab() {
  return (
    <div data-plan="policy">
      <TermList keys={['정책', '행복 경로', '상태 머신', '상태 다이어그램', '전이', '권한 매트릭스', 'RBAC', 'CRUD', '리소스', '정산', '엣지 케이스', '멱등키', '어드민', '오픈 이슈']} extra={EXTRA} />
      <SysGrid>
        <Section id="plan-policy-why" wide title="“문제없는 흐름” 다음이 진짜 기획이에요"
          gist="“만약에”를 미리 정하지 않으면 개발자가 대신 정하게 돼요."
          desc={<>주니어와 시니어의 차이가 가장 크게 나는 곳이에요. 아무 문제 없이 흘러가는 흐름을 <Term k="행복 경로" d={EXTRA['행복 경로']} />라고 해요. 제 느낌으로는 이게 기획 전체의 20% 정도예요. 나머지는 전부 ‘만약에’예요.</>}>
          <div className="po-why">
            <div>
              <b>주니어가 자주 하는 실수</b>
              <p>"주문 취소 가능"이라고 한 줄 쓰고 넘어가요. 그러면 개발자가 물어요. "배송 중에도요? 사장님이 이미 만들었으면요? 환불은 언제 돼요?" 이 답을 개발자가 정하면, 그게 그대로 우리 서비스의 <Term k="정책" />이 돼요.</p>
            </div>
            <div>
              <b>정책 = 상태 × 누가 × 조건</b>
              <p>신호등을 떠올려 보세요. 빨간불일 때(상태) 사람은(누가) 건너면 안 되고, 초록불이 되면(조건) 건너요. 주문도 같아요.</p>
              <p>주문이 <b>어떤 상태</b>일 때 <b>누가</b> <b>무엇을</b> 할 수 있는지 표로 적어요. 그걸 하면 <b>어떤 상태로</b> 바뀌는지도 적어요. 이 표 하나로 화면, QA, 고객 상담 문구가 한 번에 맞춰져요.</p>
            </div>
            <div>
              <b>숫자는 비워 두지 않아요</b>
              <p>자동 확정까지 며칠인지처럼 아직 못 정한 값도 비워 두지 않아요. <b>"정책으로 정해요 (예: N일)"</b>라고 적어요. 그리고 누가 언제 정할지 <Term k="오픈 이슈" d={EXTRA['오픈 이슈']} /> 목록에 올려요.</p>
            </div>
          </div>
        </Section>

        <Section id="plan-policy-state" wide title="주문 상태 흐름 (상태 머신)"
          gist="주문은 정해진 길로만 바뀌어요. 배송이 시작되면 취소가 반품이 돼요."
          desc={<>오늘반찬 주문이 생겨서 끝날 때까지의 흐름이에요. 이렇게 상태와 길을 정해 둔 구조를 <Term k="상태 머신" d={EXTRA['상태 머신']} />이라고 해요. 상태를 누르면 할 수 있는 행동, 누가 하는지, 저절로 넘어가는 조건이 나와요.</>}>
          <StateMachine />
          <Note tone="tip"><b>상태 이름은 하나로 통일해요.</b> 기획서엔 "배송준비중", 앱엔 "준비 중", <Term k="어드민" />엔 "접수완료"라고 쓰면, 고객 상담 때 서로 다른 걸 말하게 돼요. 개발에서 쓰는 상태 값(코드)과 화면 문구를 함께 적어 두세요. 상태별 화면 디자인은 <a href="#/system/state">디자인 시스템 · 상태</a>에서 이어져요.</Note>
        </Section>

        <Section id="plan-policy-rbac" wide title="누가 무엇을 할 수 있나: 권한 표 (RBAC)"
          gist="역할마다 볼 수 있는 것과 고칠 수 있는 것을 칸마다 정해요."
          desc={<>아파트 출입 카드와 비슷해요. 주민 카드는 자기 집과 공용 공간만, 관리실 카드는 모든 곳을 열어요. 이 표가 <Term k="권한 매트릭스" />예요. 가로는 역할, 세로는 <Term k="리소스" d={EXTRA['리소스']} />, 각 칸은 <Term k="CRUD" d={EXTRA['CRUD']} />(생성·조회·수정·삭제)예요. 일부러 실수를 몇 개 넣어 뒀어요. 경고를 읽고 칸을 눌러 고쳐 보세요.</>}>
          <RBAC />
          <Note><b>"본인 것만"이 진짜 어려운 부분이에요.</b> 사장님의 ‘주문 조회’는 자기 가게 주문만 봐요. 구매자의 ‘리뷰 수정’은 자기가 쓴 리뷰만 고쳐요. 범위가 다르면 화면도 달라져요. 예를 들어 사장님이 보는 <Term k="어드민" /> 목록은 가게 필터가 자기 가게로 고정돼요. 어드민 설계는 <a href="#/plan/admin">07 백오피스 · 연동</a>에서 이어져요.</Note>
        </Section>

        <Section id="plan-policy-edge" wide title="“만약에” 목록 만들기 (엣지 케이스)"
          gist="화면 종류마다 꼭 물어야 할 “만약에”가 정해져 있어요."
          desc={<>화면 유형을 고르면 꼭 물어야 할 <Term k="엣지 케이스" />가 나와요. 예를 들어 오늘반찬 결제 화면이면 “결제 직전에 품절되면?”을 정해야 해요. 정한 것은 체크하고, 마크다운 파일로 내보내 화면설계서에 붙여요.</>}>
          <EdgeGen />
          <Note tone="tip">빈 화면·인터넷 끊김·권한 없음 화면은 디자인 쪽에 이미 만들어 둔 모양이 있어요. <a href="#/empty/empty-search">검색 결과 없음</a> · <a href="#/empty/empty-offline">오프라인</a> · <a href="#/empty/empty-perm">권한 없음</a> · <a href="#/feedback/feedback-modal">확인 모달</a></Note>
        </Section>

        <Section id="plan-policy-dadak" wide title="‘따닥’ 데모: 결제 버튼을 두 번 누르면"
          gist="화면에서 한 번, 서버에서 한 번 더 막아야 돈이 두 번 안 빠져요."
          desc={<>엘리베이터 버튼을 여러 번 눌러도 엘리베이터는 한 대만 와요. 결제 버튼도 그래야 해요. 양쪽 모두 같은 주문서, 같은 23,000원이에요. 왼쪽은 아무것도 막지 않았고, 오른쪽은 화면과 서버(<Term k="멱등키" d={EXTRA['멱등키']} />)에서 함께 막았어요.</>}>
          <DoubleClick />
        </Section>

        <Section id="plan-policy-gb" wide title="한 줄 정책 vs 제대로 쓴 정책"
          gist="“언제·누가·어떻게·그다음”이 들어가야 개발자가 만들 수 있어요."
          desc="같은 정책을 한 줄로 쓰면 이렇게 돼요. 위 버튼으로 나쁜 예와 좋은 예를 바꿔 보세요.">
          <GoodBad />
        </Section>

        <Section id="plan-policy-check" title="사수의 체크리스트"
          gist="이 8가지에 모두 “네”라고 답하면 정책 장표는 준비된 거예요."
          desc="정책 장표를 검토할 때 제가 실제로 묻는 질문이에요.">
          <CheckList id="po-ck" items={[
            '모든 상태마다 구매자·사장님·운영자가 각각 무엇을 할 수 있는지 표로 있나요?',
            '"취소"와 "반품"이 어느 상태에서 갈리는지, 이유와 함께 적었나요?',
            '저절로 넘어가는 시간(자동 취소·자동 확정)을 정했거나, 오픈 이슈로 올렸나요?',
            '"관리자"를 운영자/최고관리자로 나누고, "본인 것만"인지 "전체"인지 적었나요?',
            '“지울 수는 있는데 볼 수는 없는” 칸이나, 로그인 안 한 사람이 쓸 수 있는 칸이 없나요?',
            '돈과 관련된 기록(결제·정산)은 지우지 않고, 정정 기록을 새로 남기나요?',
            '버튼을 두 번 눌러도, 네트워크가 요청을 다시 보내도 한 번만 결제되나요?',
            '인터넷 끊김·로그인 풀림·권한 없음일 때 사용자가 보는 화면과 문구가 있나요?',
          ]} />
        </Section>

        <Section id="plan-policy-ref" title="참고"
          gist="상태 그림, 권한, 중복 결제 방지의 원래 자료예요."
          desc="더 깊게 보고 싶을 때 보세요.">
          <ul className="po-ref">
            <li>David Harel, “Statecharts: A Visual Formalism for Complex Systems” (1987) — <Term k="상태 다이어그램" />의 기초가 된 논문</li>
            <li>OMG UML 명세의 상태 머신 다이어그램 — 상태 · <Term k="전이" d={EXTRA['전이']} />(넘어감) · 이벤트 · 조건(guard)을 그리는 표준 기호</li>
            <li>NIST RBAC 모델 (Ferraiolo · Kuhn) — 역할마다 권한을 주는 방식(<Term k="RBAC" d={EXTRA['RBAC']} />)의 표준 개념</li>
            <li>RFC 9110 HTTP Semantics — 멱등(같은 요청을 여러 번 보내도 한 번 보낸 것과 결과가 같음) 메서드의 정의. 결제 같은 요청에 붙이는 Idempotency-Key 헤더는 IETF에서 표준으로 만들지 논의 중이에요.</li>
            <li>Atlassian Agile Coach — 인수 조건(AC)에 예외 상황을 넣는 법</li>
            <li>이 도감: <a href="#/plan/flow">02 구조 · 동선</a> · <a href="#/plan/storyboard">03 화면설계서</a> · <a href="#/plan/qa">09 QA · 출시</a> · <a href="#/loading/loading-button">버튼 로딩</a></li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
