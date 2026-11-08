import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Note, Section, SysGrid } from '../../system/ui'
import { Device, Seg } from '../../components/ui'
import { download } from '../../system/export'
import { Term, TermList } from '../../components/Term'
import './admin.css'

/* ---------- 이 탭에만 쓰는 용어 풀이 (공용 사전에 없거나 뜻이 다른 말) ---------- */
const D: Record<string, string> = {
  '운영자': '어드민 화면으로 서비스를 관리하는 회사 직원이에요. 예: CS 상담원, 운영 매니저.',
  '마스킹': '개인정보 일부를 *로 가려서 보여주는 것이에요. 김민지 → 김*지, 010-1234-5678 → 010-****-5678.',
  '감사 로그': '누가·언제·무엇을 했는지 자동으로 남는 기록이에요. 건물 출입 기록부처럼, 나중에 문제가 생기면 확인하는 근거가 돼요. 운영자도 지울 수 없어요.',
  '일괄 처리': '여러 건을 체크해서 한 번에 같은 처리를 하는 것이에요. 예: 주문 10건을 한꺼번에 ‘배송준비중’으로 바꾸기.',
  '외부 연동': '우리 서비스가 다른 회사 시스템과 데이터를 주고받는 것이에요. 예: 결제는 PG사, 본인인증은 인증 기관에 맡겨요.',
  '시퀀스 다이어그램': '여러 주체(앱, 서버, 바깥 회사)가 어떤 순서로 메시지를 주고받는지 위에서 아래로 그린 그림이에요. 단체 채팅방 대화를 시간순으로 펼쳐 놓은 것과 비슷해요.',
  'PG': '결제 대행사(Payment Gateway)예요. 카드사와 우리 서비스 사이에서 결제를 대신 처리해 줘요.',
  '타임아웃': '정해진 시간 안에 답이 오지 않아 기다리기를 멈추는 것이에요. 전화를 걸었는데 신호만 계속 가는 상황이에요.',
  'CI': '연계정보예요. 본인인증을 하면 받는 값으로, 같은 사람이면 어느 서비스에서든 항상 같아요. 중복 가입을 막을 때 써요.',
  '망취소': '결제 승인을 요청했는데 답을 못 받았을 때, 혹시 승인됐을지 몰라 취소 요청을 보내는 것이에요. “돈은 빠졌는데 주문은 없는” 상황을 막아요.',
  '고유키': '요청마다 붙이는 하나뿐인 번호예요. 같은 번호로 다시 요청하면 상대가 “이미 받은 요청”으로 알아보고 한 번만 처리해요.',
  '따닥': '버튼을 빠르게 두 번 누르는 것이에요. 결제나 주문이 두 번 되는 사고로 이어질 수 있어요.',
  '준실시간': '바로는 아니지만 몇 분에서 한 시간 간격으로 자주 다시 계산하는 것이에요.',
  '기준 시각': '화면의 숫자가 언제 계산된 값인지 알려주는 시각이에요. 예: “11/9 00:20 기준”.',
}
/** 사전(D → 공용 glossary) 순서로 뜻을 찾는 Term */
const T = ({ k, children }: { k: string; children?: ReactNode }) => <Term k={k} d={D[k]}>{children}</Term>

/* ---------- 공용 작은 도구 ---------- */
const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
const toCSV = (rows: (string | number)[][]) => '﻿' + rows.map(r => r.map(cell).join(',')).join('\n')
const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const clock = () => { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':') }

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
    <div className="ad-gb">
      <Seg value={v} onChange={setV} options={[['bad', '✕ ' + badLabel], ['good', '✓ ' + goodLabel]]} />
      <div className={'ad-gb-body is-' + v} aria-live="polite">{v === 'bad' ? bad : good}</div>
    </div>
  )
}

function Checklist({ items, name, file }: { items: [string, string][]; name: string; file?: string }) {
  const [on, setOn] = useState<Set<number>>(new Set())
  const md = `# ${name}\n\n` + items.map(([q, w], i) => `- [${on.has(i) ? 'x' : ' '}] ${q}\n  - ${w}`).join('\n') + '\n'
  return (
    <div className="ad-check">
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
      <div className="ad-row">
        <div className="ad-progress" aria-live="polite"><i style={{ width: (on.size / items.length) * 100 + '%' }} /><span>{on.size} / {items.length}</span></div>
        <div className="ad-btns">
          <CopyBtn text={md} label="마크다운 복사" />
          {file && <button type="button" className="btn ghost sm" data-export={file} onClick={() => download(file, md, 'text/markdown;charset=utf-8')}>.md 내려받기</button>}
        </div>
      </div>
    </div>
  )
}

/* =====================================================================
 * 1) 운영자 콘솔 미니 목업
 * ===================================================================== */
type Role = 'cs' | 'ops' | 'super'
const ROLES: [Role, string][] = [['cs', 'CS 상담원'], ['ops', '운영 매니저'], ['super', '최고관리자']]
const MENUS: { id: string; name: string; roles: Role[] }[] = [
  { id: 'dash', name: '대시보드', roles: ['cs', 'ops', 'super'] },
  { id: 'order', name: '주문 관리', roles: ['cs', 'ops', 'super'] },
  { id: 'review', name: '리뷰 관리', roles: ['cs', 'ops', 'super'] },
  { id: 'menu', name: '메뉴·상품', roles: ['ops', 'super'] },
  { id: 'banner', name: '공지·배너', roles: ['ops', 'super'] },
  { id: 'settle', name: '정산', roles: ['super'] },
  { id: 'admin', name: '운영자 계정', roles: ['super'] },
]
type St = '결제완료' | '배송준비중' | '배송중' | '배송완료'
type Order = { no: string; buyer: string; phone: string; store: string; amount: number; status: St; at: string }
const ORDERS: Order[] = [
  { no: 'OB-1108-0012', buyer: '김민지', phone: '010-2384-5678', store: '정다운 반찬', amount: 23500, status: '결제완료', at: '11/08 13:42' },
  { no: 'OB-1108-0011', buyer: '이서준', phone: '010-9172-3311', store: '엄마손 찬방', amount: 18000, status: '결제완료', at: '11/08 13:10' },
  { no: 'OB-1108-0010', buyer: '박하은', phone: '010-5521-0907', store: '정다운 반찬', amount: 41200, status: '배송준비중', at: '11/08 12:55' },
  { no: 'OB-1108-0009', buyer: '최도윤', phone: '010-3008-4412', store: '골목 반찬가게', amount: 15800, status: '결제완료', at: '11/08 12:31' },
  { no: 'OB-1108-0008', buyer: '정예린', phone: '010-7745-2290', store: '엄마손 찬방', amount: 32600, status: '배송중', at: '11/08 11:58' },
  { no: 'OB-1108-0007', buyer: '한지호', phone: '010-6630-1185', store: '골목 반찬가게', amount: 12900, status: '배송완료', at: '11/08 10:20' },
  { no: 'OB-1108-0006', buyer: '윤서아', phone: '010-2219-7704', store: '정다운 반찬', amount: 27400, status: '결제완료', at: '11/08 09:47' },
  { no: 'OB-1108-0005', buyer: '장우진', phone: '010-8813-5520', store: '엄마손 찬방', amount: 19700, status: '배송완료', at: '11/08 09:05' },
]
const maskName = (s: string) => (s.length <= 2 ? s[0] + '*' : s[0] + '*'.repeat(s.length - 2) + s[s.length - 1])
const maskPhone = (s: string) => s.replace(/^(\d{3})-\d{4}-(\d{4})$/, '$1-****-$2')

type PKey = 'menu' | 'search' | 'filter' | 'sort' | 'list' | 'bulk' | 'excel' | 'page' | 'detail' | 'log'
const POLICY: Record<PKey, { n: number; t: string; body: string[] }> = {
  menu: { n: 1, t: '역할별 메뉴', body: ['역할마다 보이는 메뉴가 달라요. 메뉴만 숨기면 안 돼요. 주소를 직접 쳐서 들어와도 서버에서 막아야 해요.', 'CS 상담원은 주문 조회만 해요. 운영 매니저는 상태 변경과 다운로드까지 해요. 정산과 운영자 계정은 최고관리자만 봐요.', '역할 × 메뉴 × 행동 표는 정책 탭의 권한 매트릭스에서 따로 관리해요.'] },
  search: { n: 2, t: '검색', body: ['무엇으로 찾을 수 있는지 적어요. 주문번호는 전부 똑같아야 찾아요. 연락처는 뒤 4자리로, 이름은 일부만 맞아도 찾아요.', '기본 조회 기간을 정해요(예: 최근 7일). 기간 없이 전체를 찾으면 느려지고, 개인정보도 더 많이 보여요.', '결과가 0건일 때 문구: “조건에 맞는 주문이 없어요. 기간을 넓혀 보세요.”'] },
  filter: { n: 3, t: '필터', body: ['상태·기간·가게처럼 자주 쓰는 조건만 밖에 꺼내 둬요. 나머지는 “상세 조건” 안에 접어 둬요.', '필터를 바꾸면 1페이지로 돌아가고, 체크했던 칸은 풀어요. 화면에 안 보이는 주문이 체크된 채 처리되면 사고가 나요.', '새로고침해도 조건이 남게 할지 개발자와 정해요. 남기려면 조건을 주소(URL)에 담아요.'] },
  sort: { n: 4, t: '정렬', body: ['기본 정렬을 꼭 적어요. 예: 주문일시 최신순.', '정렬할 수 있는 열에만 ▲▼를 붙여요. 값이 같을 때 쓸 두 번째 기준(주문번호)도 정해요.'] },
  list: { n: 5, t: '목록 · 개인정보 가리기(마스킹)', body: ['이름은 김*지, 연락처는 010-****-5678처럼 일부를 가려서 보여줘요.', '전체를 봐야 할 때는 “마스킹 해제” 버튼 → 사유 입력 → 감사 로그 기록 순서로 해요.', '한 페이지에 몇 건 보일지(20/50/100), 금액·날짜를 어떻게 쓸지는 모든 목록에 같은 규칙으로 정해요.'] },
  bulk: { n: 6, t: '여러 건 한 번에 처리(일괄 처리)', body: ['처리하기 전에 “선택한 N건을 ○○로 바꿔요”라고 한 번 더 확인받아요. 몇 건이 어떻게 바뀌는지 문장으로 보여줘요.', '바꿀 수 없는 주문이 섞여 있으면(예: 이미 배송완료) 어떤 주문이 왜 빠졌는지 알려줘요.', '실수했을 때 되돌릴 수 있게 잠깐 “되돌리기”를 보여줘요. 되돌릴 수 없는 일이라면 더 강하게 확인받아요.', '상태가 바뀌면 구매자에게 알림이 가는지도 적어요. 이미 보낸 알림은 되돌릴 수 없어요.'] },
  excel: { n: 7, t: '엑셀 다운로드', body: ['다운로드 사유를 고르게 해요. 누가·언제·몇 건·무슨 사유로 받았는지 기록해요.', '파일 속 개인정보도 가린 상태로 내려가요. 원본이 꼭 필요하면 따로 승인을 받게 해요.', '최대 건수(예: 1만 건)를 넘으면 기간을 나눠 받으라고 안내해요. 또는 파일을 미리 만들어 두고, 다 되면 알림으로 알려줘요.'] },
  page: { n: 8, t: '페이지 나누기(페이지네이션)', body: ['총 건수를 함께 보여줘요. 예: “총 128건 · 1/7”.', '목록에서 상세로 갔다가 돌아오면, 보던 페이지와 필터를 그대로 둬요.'] },
  detail: { n: 9, t: '상세 · 변경 이력', body: ['줄을 누르면 상세가 열려요. 상세에는 그 주문의 상태가 바뀐 기록을 시간순으로 보여줘요.', '“누가(운영자 ID) · 언제 · 무엇을 · 이전 값 → 바뀐 값 · 사유”를 남겨요. CS 상담원이 고객에게 설명할 근거가 돼요.'] },
  log: { n: 10, t: '감사 로그', body: ['조회·다운로드·마스킹 해제·상태 변경처럼 민감한 행동은 모두 기록해요.', '감사 로그는 운영자가 지울 수 없어요. 얼마나 오래 보관할지는 법무·보안 담당과 정해요.'] },
}
type Log = { at: string; who: string; what: string; order?: string }

function Hot({ k, on, pick }: { k: PKey; on: PKey; pick: (k: PKey) => void }) {
  return <button type="button" className={'ad-hot' + (on === k ? ' on' : '')} aria-label={`${POLICY[k].n}번 ${POLICY[k].t} 정책 보기`} onClick={e => { e.stopPropagation(); pick(k) }} data-hot={k}>{POLICY[k].n}</button>
}

function Console() {
  const [role, setRole] = useState<Role>('ops')
  const [orders, setOrders] = useState<Order[]>(ORDERS)
  const [q, setQ] = useState('')
  const [fs, setFs] = useState<'all' | St>('all')
  const [sort, setSort] = useState<{ k: 'at' | 'amount'; d: 1 | -1 }>({ k: 'at', d: -1 })
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)
  const [unmasked, setUnmasked] = useState<Set<string>>(new Set())
  const [pol, setPol] = useState<PKey>('list')
  const [modal, setModal] = useState<null | { kind: 'bulk' | 'excel' | 'unmask'; order?: string }>(null)
  const [reason, setReason] = useState('')
  const [undo, setUndo] = useState<null | { prev: Order[]; n: number }>(null)
  const [logs, setLogs] = useState<Log[]>([{ at: '09:00:12', who: 'ops_kim', what: '로그인' }])
  const undoTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(undoTimer.current), [])

  const who = role === 'cs' ? 'cs_lee' : role === 'ops' ? 'ops_kim' : 'admin_park'
  const can = { change: role !== 'cs', excel: role !== 'cs', unmask: role === 'super' || role === 'ops' }
  const addLog = (what: string, order?: string) => setLogs(l => [{ at: clock(), who, what, order }, ...l].slice(0, 30))
  const PER = 5

  const list = useMemo(() => {
    const t = q.trim()
    return orders
      .filter(o => fs === 'all' || o.status === fs)
      .filter(o => !t || o.no.toLowerCase().includes(t.toLowerCase()) || o.phone.endsWith(t) || o.buyer.includes(t))
      .sort((a, b) => (sort.k === 'amount' ? (a.amount - b.amount) : a.at.localeCompare(b.at)) * sort.d || a.no.localeCompare(b.no))
  }, [orders, q, fs, sort])
  const pages = Math.max(1, Math.ceil(list.length / PER))
  const cur = Math.min(page, pages)
  const rows = list.slice((cur - 1) * PER, cur * PER)
  const selected = orders.filter(o => sel.has(o.no))
  const movable = selected.filter(o => o.status === '결제완료')

  const resetSel = () => setSel(new Set())
  const toggleSort = (k: 'at' | 'amount') => { setPol('sort'); setSort(s => ({ k, d: s.k === k ? (s.d === 1 ? -1 : 1) : -1 })) }
  const openModal = (kind: 'bulk' | 'excel' | 'unmask', order?: string) => { setReason(''); setModal({ kind, order }); setPol(kind === 'unmask' ? 'list' : kind) }
  const confirm = () => {
    if (!modal) return
    if (modal.kind === 'bulk') {
      const prev = orders
      const ids = new Set(movable.map(o => o.no))
      setOrders(os => os.map(o => (ids.has(o.no) ? { ...o, status: '배송준비중' } : o)))
      movable.forEach(o => addLog('상태 변경: 결제완료 → 배송준비중 (일괄)', o.no))
      setUndo({ prev, n: ids.size }); resetSel()
      window.clearTimeout(undoTimer.current)
      undoTimer.current = window.setTimeout(() => setUndo(null), 8000)
    } else if (modal.kind === 'excel') {
      const csv = toCSV([['주문번호', '구매자', '연락처', '가게', '금액', '상태', '주문일시'], ...list.map(o => [o.no, maskName(o.buyer), maskPhone(o.phone), o.store, o.amount, o.status, o.at])])
      download('오늘반찬_주문목록_마스킹.csv', csv, 'text/csv;charset=utf-8')
      addLog(`엑셀 다운로드 ${list.length}건 · 사유: ${reason}`)
    } else if (modal.kind === 'unmask' && modal.order) {
      setUnmasked(s => new Set(s).add(modal.order!))
      addLog(`마스킹 해제 · 사유: ${reason}`, modal.order)
    }
    setModal(null)
  }
  const doUndo = () => {
    if (!undo) return
    setOrders(undo.prev); addLog(`일괄 처리 되돌리기 ${undo.n}건`); setUndo(null)
  }
  const detail = orders.find(o => o.no === open)
  const needReason = modal && modal.kind !== 'bulk'

  return (
    <div className="ad-console-wrap">
      <div className="ad-console" role="group" aria-label="오늘반찬 운영자 콘솔 목업">
        <aside className="ad-side">
          <div className="ad-brand">오늘반찬 <small>운영자</small></div>
          <label className="ad-role">
            <span>역할로 보기</span>
            <select value={role} onChange={e => { setRole(e.target.value as Role); setPol('menu'); resetSel() }} aria-label="운영자 역할">
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <nav className="ad-menu" onClick={() => setPol('menu')}>
            {MENUS.map(m => {
              const ok = m.roles.includes(role)
              return <span key={m.id} className={(m.id === 'order' ? 'on ' : '') + (ok ? '' : 'locked')} title={ok ? '' : '이 역할에는 보이지 않는 메뉴예요'}>{ok ? '' : '🔒 '}{m.name}</span>
            })}
          </nav>
          <Hot k="menu" on={pol} pick={setPol} />
        </aside>

        <div className="ad-main">
          <div className="ad-head"><b>주문 관리</b><span className="muted">{who} 님 · {ROLES.find(r => r[0] === role)![1]}</span></div>

          <div className="ad-tools">
            <div className="ad-search" onClick={() => setPol('search')}>
              <input value={q} onChange={e => { setQ(e.target.value); setPage(1); resetSel(); setPol('search') }} placeholder="주문번호 · 연락처 뒤 4자리 · 이름" aria-label="주문 검색" />
              <span className="ad-period">최근 7일</span>
              <Hot k="search" on={pol} pick={setPol} />
            </div>
            <div className="ad-filter" onClick={() => setPol('filter')}>
              <select value={fs} onChange={e => { setFs(e.target.value as 'all' | St); setPage(1); resetSel(); setPol('filter') }} aria-label="상태 필터">
                <option value="all">상태: 전체</option>
                {(['결제완료', '배송준비중', '배송중', '배송완료'] as St[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Hot k="filter" on={pol} pick={setPol} />
            </div>
          </div>

          <div className="ad-actions">
            <span className="ad-count">총 <b>{list.length}</b>건 · 선택 <b>{sel.size}</b>건</span>
            <span className="ad-act">
              <button type="button" className="btn sm" disabled={!can.change || movable.length === 0} onClick={() => openModal('bulk')} data-act="bulk"
                title={can.change ? '' : 'CS 상담원은 상태를 바꿀 수 없어요'}>배송준비중으로 변경</button>
              <Hot k="bulk" on={pol} pick={setPol} />
            </span>
            <span className="ad-act">
              <button type="button" className="btn ghost sm" disabled={!can.excel} onClick={() => openModal('excel')} data-act="excel"
                title={can.excel ? '' : 'CS 상담원은 다운로드할 수 없어요'}>⤓ 엑셀 다운로드</button>
              <Hot k="excel" on={pol} pick={setPol} />
            </span>
          </div>

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input type="checkbox" aria-label="이 페이지 전체 선택" disabled={!can.change}
                      checked={rows.length > 0 && rows.every(r => sel.has(r.no))}
                      onChange={e => setSel(s => { const n = new Set(s); rows.forEach(r => (e.target.checked ? n.add(r.no) : n.delete(r.no))); return n })} />
                  </th>
                  <th>주문번호</th>
                  <th>구매자 <Hot k="list" on={pol} pick={setPol} /></th>
                  <th>연락처</th>
                  <th>가게</th>
                  <th><button type="button" className="ad-sort" onClick={() => toggleSort('amount')}>금액 {sort.k === 'amount' ? (sort.d === 1 ? '▲' : '▼') : '↕'}</button></th>
                  <th>상태</th>
                  <th><button type="button" className="ad-sort" onClick={() => toggleSort('at')}>주문일시 {sort.k === 'at' ? (sort.d === 1 ? '▲' : '▼') : '↕'}</button> <Hot k="sort" on={pol} pick={setPol} /></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={8} className="ad-empty">조건에 맞는 주문이 없어요. 기간을 넓혀 보세요.</td></tr>}
                {rows.map(o => {
                  const um = unmasked.has(o.no)
                  return (
                    <tr key={o.no} className={(open === o.no ? 'open ' : '') + (sel.has(o.no) ? 'sel' : '')} onClick={() => { setOpen(x => (x === o.no ? null : o.no)); setPol('detail') }} data-order={o.no}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" aria-label={o.no + ' 선택'} disabled={!can.change} checked={sel.has(o.no)}
                          onChange={() => { setPol('bulk'); setSel(s => { const n = new Set(s); if (n.has(o.no)) n.delete(o.no); else n.add(o.no); return n }) }} />
                      </td>
                      <td className="mono">{o.no}</td>
                      <td>{um ? o.buyer : maskName(o.buyer)}</td>
                      <td className="mono">{um ? o.phone : maskPhone(o.phone)}</td>
                      <td>{o.store}</td>
                      <td className="num">{won(o.amount)}</td>
                      <td><span className={'ad-st s-' + ['결제완료', '배송준비중', '배송중', '배송완료'].indexOf(o.status)}>{o.status}</span></td>
                      <td className="mono">{o.at}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="ad-pager" onClick={() => setPol('page')}>
            <button type="button" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="이전 페이지">‹</button>
            {Array.from({ length: pages }, (_, i) => <button key={i} type="button" className={cur === i + 1 ? 'on' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
            <button type="button" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="다음 페이지">›</button>
            <span className="muted">총 {list.length}건 · {cur}/{pages}</span>
            <Hot k="page" on={pol} pick={setPol} />
          </div>

          {detail && (
            <div className="ad-detail">
              <div className="ad-detail-head">
                <b>{detail.no}</b><span className={'ad-st s-' + ['결제완료', '배송준비중', '배송중', '배송완료'].indexOf(detail.status)}>{detail.status}</span>
                <Hot k="detail" on={pol} pick={setPol} />
                <button type="button" className="ad-close" onClick={() => setOpen(null)} aria-label="상세 닫기">×</button>
              </div>
              <div className="ad-detail-body">
                <dl>
                  <dt>구매자</dt><dd>{unmasked.has(detail.no) ? `${detail.buyer} · ${detail.phone}` : `${maskName(detail.buyer)} · ${maskPhone(detail.phone)}`}
                    {!unmasked.has(detail.no) && <button type="button" className="ad-link" disabled={!can.unmask} onClick={() => openModal('unmask', detail.no)} data-act="unmask">마스킹 해제</button>}</dd>
                  <dt>가게 · 금액</dt><dd>{detail.store} · {won(detail.amount)}</dd>
                </dl>
                <div className="ad-hist">
                  <small>변경 이력</small>
                  <ol>
                    {logs.filter(l => l.order === detail.no).map((l, i) => <li key={i}><span className="mono">{l.at}</span> {l.who} · {l.what}</li>)}
                    <li><span className="mono">{detail.at.split(' ')[1]}:00</span> system · 주문 생성 (결제완료)</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {undo && (
            <div className="ad-snack" role="status">
              {undo.n}건을 배송준비중으로 바꿨어요.
              <button type="button" onClick={doUndo} data-act="undo">되돌리기</button>
            </div>
          )}

          {modal && (
            <div className="ad-modal-bg" onClick={() => setModal(null)}>
              <div className="ad-modal" role="dialog" aria-modal="true" aria-label="확인" onClick={e => e.stopPropagation()}>
                {modal.kind === 'bulk' && <>
                  <b>선택한 {movable.length}건을 ‘배송준비중’으로 바꿀까요?</b>
                  <p>구매자에게 “사장님이 반찬을 준비하고 있어요” 알림이 발송돼요. 알림은 되돌릴 수 없어요.</p>
                  {selected.length > movable.length && <p className="ad-warn">결제완료가 아닌 {selected.length - movable.length}건은 바꿀 수 없어서 제외했어요.</p>}
                </>}
                {modal.kind === 'excel' && <><b>엑셀로 {list.length}건을 내려받아요</b><p>이름·연락처는 가려진 채로 내려가요. 누가·언제·몇 건·무슨 사유로 받았는지 기록이 남아요.</p></>}
                {modal.kind === 'unmask' && <><b>{modal.order} 구매자 정보를 전체 표시할까요?</b><p>누가 언제 봤는지 감사 로그에 남아요.</p></>}
                {needReason && (
                  <select value={reason} onChange={e => setReason(e.target.value)} aria-label="사유" data-field="reason">
                    <option value="">사유를 골라 주세요</option>
                    <option>CS 문의 응대</option><option>배송 사고 확인</option><option>정산 대조</option>
                  </select>
                )}
                <div className="ad-modal-btns">
                  <button type="button" className="btn ghost sm" onClick={() => setModal(null)}>취소</button>
                  <button type="button" className="btn sm" disabled={!!needReason && !reason} onClick={confirm} data-act="confirm">
                    {modal.kind === 'bulk' ? `${movable.length}건 변경` : modal.kind === 'excel' ? '내려받기' : '표시하기'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ad-policy">
        <div className="ad-policy-tabs" role="tablist" aria-label="정책 번호">
          {(Object.keys(POLICY) as PKey[]).map(k => (
            <button key={k} type="button" role="tab" aria-selected={pol === k} className={pol === k ? 'on' : ''} onClick={() => setPol(k)}>{POLICY[k].n}</button>
          ))}
        </div>
        <div className="ad-policy-body" aria-live="polite">
          <small>정책 {POLICY[pol].n}</small>
          <b>{POLICY[pol].t}</b>
          <ul>{POLICY[pol].body.map((t, i) => <li key={i}>{t}</li>)}</ul>
          {pol === 'menu' && <a href="#/plan/policy">권한 매트릭스 편집기 →</a>}
          {pol === 'bulk' && <a href="#/feedback/feedback-snack">되돌리기가 있는 스낵바 →</a>}
        </div>
        <div className="ad-log" onClick={() => setPol('log')}>
          <div className="ad-log-head"><b>감사 로그</b><Hot k="log" on={pol} pick={setPol} /></div>
          <ol>{logs.slice(0, 6).map((l, i) => <li key={logs.length - i}><span className="mono">{l.at}</span> <b>{l.who}</b> {l.what}{l.order ? ` (${l.order})` : ''}</li>)}</ol>
        </div>
      </div>
    </div>
  )
}

/* =====================================================================
 * 2) 배너 · 공지 CMS
 * ===================================================================== */
type Target = 'all' | 'new' | 'repeat'
type Banner = { id: number; title: string; start: number; end: number; prio: number; target: Target; tone: number }
const TG: Record<Target, string> = { all: '전체', new: '신규(첫 주문 전)', repeat: '재구매 고객' }
const BSEED: Banner[] = [
  { id: 1, title: '김장철 반찬 기획전', start: 3, end: 20, prio: 2, target: 'all', tone: 0 },
  { id: 2, title: '첫 주문 배송비 무료', start: 1, end: 30, prio: 3, target: 'new', tone: 1 },
  { id: 3, title: '단골 고객 재주문 10% 쿠폰', start: 10, end: 16, prio: 1, target: 'repeat', tone: 2 },
  { id: 4, title: '[공지] 11/25 새벽 시스템 점검', start: 22, end: 25, prio: 1, target: 'all', tone: 3 },
]
function bannerLint(b: Banner, all: Banner[]): string[] {
  const w: string[] = []
  if (!b.title.trim()) w.push('제목이 비었어요.')
  if (b.end < b.start) w.push('종료일이 시작일보다 빨라요.')
  if (b.title.length > 20) w.push('제목이 20자를 넘어요. 홈 배너에서 뒷부분이 “…”로 잘려요.')
  const clash = all.filter(o => o.id !== b.id && o.prio === b.prio && o.start <= b.end && b.start <= o.end && (o.target === b.target || o.target === 'all' || b.target === 'all'))
  if (clash.length) w.push(`“${clash[0].title}”와 기간·대상이 겹치고 우선순위도 같아요. 이러면 나중에 등록한 쪽이 보여요. 의도한 건가요?`)
  return w
}
function Cms() {
  const [bs, setBs] = useState<Banner[]>(BSEED)
  const [day, setDay] = useState(12)
  const [user, setUser] = useState<'new' | 'repeat'>('repeat')
  const upd = (id: number, p: Partial<Banner>) => setBs(a => a.map(b => (b.id === id ? { ...b, ...p } : b)))
  const state = (b: Banner) => (day < b.start ? '예약' : day > b.end ? '종료' : '노출 중')
  const live = bs.filter(b => b.start <= day && day <= b.end && (b.target === 'all' || b.target === user)).sort((a, b) => a.prio - b.prio || b.id - a.id)
  const win = live[0]
  const md = `# 배너·공지 CMS 정책 — 오늘반찬\n\n## 노출 규칙\n- 노출 기간: 시작일 00:00 ~ 종료일 23:59 (KST). 종료일은 필수예요.\n- 같은 자리에 여러 개가 걸리면 우선순위 숫자가 가장 작은 1개만 보여줘요.\n- 우선순위가 같으면 나중에 등록한 것이 먼저예요.\n- 대상: 전체 / 신규(첫 주문 전) / 재구매 고객. 비로그인은 ‘전체’만 봐요.\n- 상태: 예약 → 노출 중 → 종료 (기간에 따라 자동으로 바뀌어요).\n\n## 등록 규칙\n- 제목 20자 이내, 이미지 비율과 용량은 디자인 가이드를 따라요.\n- 링크는 앱 내부 화면 ID 또는 https 주소만 허용해요.\n- 저장 전 ‘미리보기’로 대상·날짜를 바꿔 실제 노출 모습을 확인해요.\n- 노출 중인 배너를 수정하면 변경 이력(누가·언제·무엇을)이 남아요.\n\n## 현재 등록 목록\n| 제목 | 기간 | 우선순위 | 대상 |\n|---|---|---|---|\n` +
    bs.map(b => `| ${b.title} | 11/${b.start} ~ 11/${b.end} | ${b.prio} | ${TG[b.target]} |`).join('\n') + '\n'
  return (
    <div className="ad-cms">
      <div className="ad-cms-main">
        <div className="ad-cms-ctl">
          <label className="ad-day"><span>미리보기 날짜 <b>11월 {day}일</b></span>
            <input type="range" min={1} max={30} value={day} onChange={e => setDay(+e.target.value)} aria-label="미리보기 날짜" style={{ ['--p' as string]: ((day - 1) / 29) * 100 + '%' }} />
          </label>
          <div><small className="ad-lbl">보는 사람</small><Seg value={user} onChange={setUser} options={[['new', '신규'], ['repeat', '재구매']]} /></div>
        </div>
        <div className="ad-gantt" aria-label="배너 노출 기간">
          <div className="ad-gantt-scale"><span>11/1</span><span>11/10</span><span>11/20</span><span>11/30</span></div>
          <div className="ad-gantt-in">
          {bs.map(b => {
            const isWin = win?.id === b.id
            return (
              <div key={b.id} className={'ad-gantt-row' + (isWin ? ' win' : '')}>
                <span className={'ad-bar t' + b.tone} style={{ left: ((Math.min(b.start, b.end) - 1) / 30) * 100 + '%', width: (Math.max(1, Math.abs(b.end - b.start) + 1) / 30) * 100 + '%' }}>
                  <em>{b.prio}</em>{b.title}
                </span>
              </div>
            )
          })}
          <i className="ad-now" style={{ left: ((day - 0.5) / 30) * 100 + '%' }} />
          </div>
        </div>
        <div className="ad-scroll">
          <table className="ad-btable">
            <thead><tr><th>제목</th><th style={{ width: 150 }}>기간 (11월)</th><th style={{ width: 80 }}>우선순위</th><th style={{ width: 150 }}>대상</th><th style={{ width: 80 }}>상태</th></tr></thead>
            <tbody>
              {bs.map(b => {
                const w = bannerLint(b, bs)
                return (
                  <tr key={b.id} className={w.length ? 'has-warn' : ''}>
                    <td><input className="ad-in" value={b.title} onChange={e => upd(b.id, { title: e.target.value })} aria-label="배너 제목" />
                      {w.length > 0 && <ul className="ad-lint">{w.map((m, i) => <li key={i}>{m}</li>)}</ul>}</td>
                    <td className="ad-dates">
                      <input className="ad-in num" type="number" min={1} max={30} value={b.start} onChange={e => upd(b.id, { start: Math.min(30, Math.max(1, +e.target.value)) })} aria-label="시작일" />
                      <span>~</span>
                      <input className="ad-in num" type="number" min={1} max={30} value={b.end} onChange={e => upd(b.id, { end: Math.min(30, Math.max(1, +e.target.value)) })} aria-label="종료일" />
                    </td>
                    <td><input className="ad-in num" type="number" min={1} max={9} value={b.prio} onChange={e => upd(b.id, { prio: Math.max(1, +e.target.value) })} aria-label="우선순위" /></td>
                    <td><select className="ad-in" value={b.target} onChange={e => upd(b.id, { target: e.target.value as Target })} aria-label="대상">
                      {(Object.keys(TG) as Target[]).map(t => <option key={t} value={t}>{TG[t]}</option>)}
                    </select></td>
                    <td><span className={'ad-bstate ' + (state(b) === '노출 중' ? 'on' : state(b) === '예약' ? 'wait' : 'off')}>{state(b)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="ad-row">
          <span className="muted">우선순위는 숫자가 작을수록 먼저예요. 같은 날·같은 대상이면 한 개만 보여요.</span>
          <div className="ad-btns">
            <button type="button" className="btn ghost sm" onClick={() => setBs(BSEED)}>예시로 되돌리기</button>
            <CopyBtn text={md} label="정책 마크다운 복사" />
            <button type="button" className="btn ghost sm" data-export="cms" onClick={() => download('배너_공지_CMS_정책.md', md, 'text/markdown;charset=utf-8')}>.md 내려받기</button>
          </div>
        </div>
      </div>
      <div className="ad-cms-preview">
        <Device>
          <div className="scr ad-phone">
            <div className="ad-phone-top"><b>오늘반찬</b><span>역삼동 ▾</span></div>
            {win
              ? <div key={win.id} className={'ad-phone-banner t' + win.tone}><small>{win.target === 'all' ? '모두에게' : TG[win.target]}</small><b>{win.title}</b><span>11/{win.start} ~ 11/{win.end}</span></div>
              : <div className="ad-phone-banner none"><b>노출할 배너가 없어요</b><span>기본 이미지를 보여줘요</span></div>}
            <div className="ad-phone-list">{['오늘의 국·찌개', '밑반찬 모음', '아이 반찬'].map(t => <div key={t}><i />{t}</div>)}</div>
          </div>
        </Device>
        <p className="muted">11월 {day}일 · {user === 'new' ? '신규' : '재구매'} 고객이 보는 홈이에요.{live.length > 1 && <> 조건에 맞는 배너 {live.length}개 중 우선순위가 가장 높은 1개만 보여요.</>}</p>
      </div>
    </div>
  )
}

/* =====================================================================
 * 3) 외부 연동 시퀀스
 * ===================================================================== */
type A = 0 | 1 | 2
type Step = { f: A; t: A; label: string; note?: string; fail?: boolean; dash?: boolean }
type Scenario = { id: string; name: string; actors: [string, string, string]; base: Step[]; paths: Record<'ok' | 'fail' | 'timeout', Step[]>; decide: string[] }
const SCN: Scenario[] = [
  {
    id: 'auth', name: '본인인증', actors: ['구매자 앱', '오늘반찬 서버', '본인인증 기관'],
    base: [
      { f: 0, t: 1, label: '본인인증 시작 요청', note: '회원가입 3단계에서 ‘휴대폰 본인인증’을 눌러요.' },
      { f: 1, t: 1, label: '요청 ID 생성 · 유효 시간 기록', note: '요청마다 하나뿐인 번호(요청 ID)를 붙여요. 나중에 결과가 오면 어느 요청의 결과인지 이 번호로 맞춰요. 유효 시간은 정책으로 정해요.' },
      { f: 1, t: 0, label: '인증 창 열기' },
      { f: 0, t: 2, label: '이름·생년월일·휴대폰 입력, 문자 인증', note: '이 화면은 인증 기관이 만든 화면이에요. 우리가 문구나 디자인을 바꿀 수 없어요. 이 점을 화면설계서에 적어 둬요.' },
    ],
    paths: {
      ok: [
        { f: 2, t: 1, label: '인증 결과 (이름, 생년월일, 휴대폰, CI)', note: 'CI(연계정보)는 같은 사람이면 어디서든 항상 같은 값이에요. 그래서 중복 가입을 확인할 때 써요.' },
        { f: 1, t: 1, label: 'CI로 중복 가입 확인 · 결과 저장', note: '이미 가입한 사람이면 “이미 가입된 계정이 있어요. 로그인할까요?”로 안내해요.' },
        { f: 1, t: 0, label: '인증 완료 → 다음 단계' },
      ],
      fail: [
        { f: 2, t: 0, label: '인증 실패 (정보 불일치 · 창 닫음)', fail: true },
        { f: 0, t: 1, label: '실패 결과 전달' },
        { f: 1, t: 1, label: '실패 사유 기록 · 시도 횟수 +1', note: '정해진 횟수를 넘으면 잠시 막아요. 횟수와 잠금 시간은 정책으로 정해요.' },
        { f: 1, t: 0, label: '“인증하지 못했어요. 입력한 정보를 확인해 주세요.”', note: '창을 닫은 경우와 정보가 틀린 경우는 문구를 다르게 써요.' },
      ],
      timeout: [
        { f: 2, t: 1, label: '응답 없음', fail: true, dash: true },
        { f: 1, t: 1, label: '유효 시간 지남 → 요청 만료', note: '시간이 지난 요청의 결과가 늦게 도착해도 받지 않아요.' },
        { f: 1, t: 0, label: '“인증 시간이 지났어요. 다시 시작해 주세요.”', note: '입력하던 가입 정보(아이디 등)는 지우지 않고 남겨 둬요.' },
      ],
    },
    decide: ['인증 유효 시간과 재시도 횟수', '이미 가입한 사람(CI 중복)일 때 안내 문구와 이동할 화면', '만 14세 미만 등 가입 제한 조건', '외부 창을 닫았을 때 돌아올 화면'],
  },
  {
    id: 'pg', name: 'PG 결제', actors: ['구매자 앱', '오늘반찬 서버', 'PG사'],
    base: [
      { f: 0, t: 1, label: '결제하기', note: '구매자가 장바구니에서 결제하기를 눌러요. 버튼은 바로 “처리 중”으로 바꿔요. 두 번 눌러 결제가 두 번 되는 일(따닥)을 막아요.' },
      { f: 1, t: 1, label: '주문 생성: 결제대기 · 금액 저장', note: '금액은 서버가 직접 계산해서 저장해요. 앱이 보낸 금액을 그대로 믿지 않아요.' },
      { f: 1, t: 0, label: '결제창 정보 (주문번호, 금액)' },
      { f: 0, t: 2, label: '결제창에서 카드 선택 · 인증' },
      { f: 2, t: 0, label: '인증 결과' },
      { f: 0, t: 1, label: '인증 결과 전달' },
      { f: 1, t: 2, label: '승인 요청 (주문번호, 금액)', note: '서버에 저장한 금액과 같은지 먼저 확인해요. 같을 때만 승인을 요청하고, 다르면 승인하지 않아요.' },
    ],
    paths: {
      ok: [
        { f: 2, t: 1, label: '승인 완료 (거래 ID)' },
        { f: 1, t: 1, label: '결제완료 · 재고 차감 · 사장님 알림' },
        { f: 1, t: 0, label: '주문 완료 화면' },
      ],
      fail: [
        { f: 2, t: 1, label: '승인 거절 (한도 초과 · 잔액 부족)', fail: true },
        { f: 1, t: 1, label: '주문 결제실패 · 장바구니 유지' },
        { f: 1, t: 0, label: '“결제하지 못했어요. 다른 결제 수단을 선택해 주세요.”', note: 'PG사가 보낸 오류 코드를 그대로 보여주지 않아요. 사용자가 할 수 있는 행동으로 바꿔 말해요. 오류 코드별 문구 표를 따로 만들어요.' },
      ],
      timeout: [
        { f: 2, t: 1, label: '응답 없음 (타임아웃)', fail: true, dash: true },
        { f: 1, t: 2, label: '거래 상태 조회', note: '바로 실패로 처리하면 “돈은 빠졌는데 주문은 실패”가 생길 수 있어요. 먼저 PG사에 실제로 어떻게 됐는지 물어요.' },
        { f: 2, t: 1, label: '승인됨 / 승인 안 됨' },
        { f: 1, t: 1, label: '승인됨 → 완료 · 확인 불가 → 승인 취소', note: '답을 못 받은 승인 요청을 혹시 몰라 취소하는 것을 실무에서 ‘망취소’라고 해요.' },
        { f: 1, t: 0, label: '“결제를 확인하고 있어요” → 결과 안내', note: '확인 중 화면에서 결제 버튼을 다시 누르지 못하게 해요.' },
      ],
    },
    decide: ['결제 수단별 실패 문구 표', '확인 중 화면의 최대 대기 시간과 그 뒤 안내', '결제는 됐는데 재고가 없을 때(자동 취소·환불 정책)', '결제대기 주문을 언제 자동 취소할지'],
  },
  {
    id: 'msg', name: '알림톡 · 이메일', actors: ['구매자', '오늘반찬 서버', '발송 대행사'],
    base: [
      { f: 1, t: 1, label: '배송 출발 → 발송 요청을 대기열에 저장', note: '사장님이 ‘배송 출발’을 누르면 알림을 바로 보내지 않고 대기열(차례를 기다리는 목록)에 넣어요. 그래서 발송이 느려도 주문 처리는 멈추지 않아요.' },
      { f: 1, t: 2, label: '알림톡 발송 요청 (템플릿 코드 + 변수 + 고유키)', note: '알림톡은 미리 검수(심사)받은 문구, 즉 템플릿만 보낼 수 있어요. 문구를 바꾸면 다시 검수받아야 해요. 그 기간을 일정에 넣어요.' },
    ],
    paths: {
      ok: [
        { f: 2, t: 1, label: '접수 완료', note: '“접수했다”는 “도착했다”가 아니에요. 도착했는지는 결과를 따로 받아야 알아요.' },
        { f: 2, t: 0, label: '알림톡 도착' },
        { f: 2, t: 1, label: '발송 결과: 성공' },
        { f: 1, t: 1, label: '발송 이력 저장', note: '“알림 못 받았어요” 문의에 답할 수 있게 어드민 주문 상세에 발송 이력을 보여줘요.' },
      ],
      fail: [
        { f: 2, t: 1, label: '접수 완료' },
        { f: 2, t: 0, label: '알림톡 실패 (수신 불가 등)', fail: true },
        { f: 2, t: 1, label: '발송 결과: 실패 · 사유 코드' },
        { f: 1, t: 2, label: '대체 발송 요청: 문자', note: '알림톡이 실패하면 문자로 대신 보낼지, 그 비용은 어떻게 할지 정책으로 정해요. 광고성 메시지는 받는 사람이 동의해야 보낼 수 있어요.' },
        { f: 2, t: 0, label: '문자 도착' },
      ],
      timeout: [
        { f: 2, t: 1, label: '응답 없음', fail: true, dash: true },
        { f: 1, t: 1, label: '잠시 뒤 재시도 (같은 고유키)', note: '처음과 같은 고유키(요청 번호)로 다시 보내요. 그래야 대행사가 같은 요청인 걸 알아보고 두 번 보내지 않아요. 몇 번, 얼마 간격으로 다시 보낼지는 개발자와 정해요.' },
        { f: 1, t: 2, label: '재요청' },
        { f: 2, t: 1, label: '접수 완료' },
        { f: 2, t: 0, label: '알림톡 도착 (한 번만)', note: '이메일도 구조는 같아요. 반송된 주소는 다음 발송 대상에서 빼요.' },
      ],
    },
    decide: ['주문 상태가 바뀔 때마다 어떤 템플릿을 보낼지 정리한 표(발송 매트릭스)', '알림톡이 실패하면 다른 채널(문자 등)로 대신 보낼지', '야간 발송 제한 시간', '실패 건을 어드민에서 다시 보낼 수 있는지'],
  },
]
const PATHS: ['ok' | 'fail' | 'timeout', string][] = [['ok', '성공'], ['fail', '실패'], ['timeout', '응답 없음']]

function Sequence() {
  const [sid, setSid] = useState('pg')
  const [path, setPath] = useState<'ok' | 'fail' | 'timeout'>('ok')
  const [cur, setCur] = useState(0)
  const [play, setPlay] = useState(false)
  const s = SCN.find(x => x.id === sid)!
  const steps = [...s.base, ...s.paths[path]]
  const last = steps.length - 1
  useEffect(() => {
    if (!play) return
    const id = window.setInterval(() => setCur(c => { if (c >= last) { setPlay(false); return c } return c + 1 }), 1100)
    return () => window.clearInterval(id)
  }, [play, last])
  const reset = () => { setCur(0); setPlay(false) }
  const X = [100, 360, 620], TOP = 52, ROW = 44
  const H = TOP + steps.length * ROW + 20
  const st = steps[Math.min(cur, last)]
  return (
    <div className="ad-seq">
      <div className="ad-row">
        <Seg value={sid} onChange={v => { setSid(v); reset() }} options={SCN.map(x => [x.id, x.name] as const)} />
        <Seg value={path} onChange={v => { setPath(v); setCur(s.base.length); setPlay(false) }} options={PATHS} className="ad-path" />
      </div>
      <p className="muted ad-swipe">← 옆으로 밀어서 전체를 보세요</p>
      <div className="ad-scroll">
        <svg className="ad-seq-svg" viewBox={`0 0 720 ${H}`} role="img" aria-label={`${s.name} ${PATHS.find(p => p[0] === path)![1]} 시퀀스 다이어그램, ${steps.length}단계`}>
          <defs>
            {['n', 'c', 'f'].map(k => <marker key={k} id={'ad-ar-' + k} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" className={'ad-ar-' + k} /></marker>)}
          </defs>
          {s.actors.map((a, i) => (
            <g key={a}>
              <rect x={X[i] - 70} y={6} width={140} height={32} rx={9} className={'ad-actor a' + i} />
              <text x={X[i]} y={27} textAnchor="middle" className="ad-actor-t">{a}</text>
              <line x1={X[i]} y1={38} x2={X[i]} y2={H - 6} className="ad-life" />
            </g>
          ))}
          {steps.map((p, i) => {
            const y = TOP + i * ROW + 22
            const cls = 'ad-msg' + (i === cur ? ' cur' : i > cur ? ' later' : '') + (p.fail ? ' fail' : '') + (i >= s.base.length ? ' br' : '')
            if (p.f === p.t) {
              const x = X[p.f]
              return (
                <g key={sid + path + i} className={cls} onClick={() => { setCur(i); setPlay(false) }}>
                  <rect x={x + 6} y={y - 16} width={Math.min(350, p.label.length * 12 + 22)} height={26} rx={7} className="ad-self" />
                  <text x={x + 15} y={y + 1} className="ad-msg-t">{i + 1}. {p.label}</text>
                </g>
              )
            }
            const x1 = X[p.f], x2 = X[p.t], dir = x2 > x1 ? 1 : -1
            const tx = (x1 + x2) / 2
            return (
              <g key={sid + path + i} className={cls} onClick={() => { setCur(i); setPlay(false) }}>
                <line x1={x1 + dir * 4} y1={y + 6} x2={x2 - dir * 4} y2={y + 6} className={'ad-arrow' + (p.dash ? ' dash' : '')} markerEnd={`url(#ad-ar-${p.fail ? 'f' : i === cur ? 'c' : 'n'})`} />
                <text x={tx} y={y} textAnchor="middle" className="ad-msg-t">{i + 1}. {p.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="ad-seq-ctl">
        <button type="button" className="btn ghost sm" onClick={reset}>처음</button>
        <button type="button" className="btn ghost sm" disabled={cur === 0} onClick={() => { setPlay(false); setCur(c => Math.max(0, c - 1)) }}>‹ 이전</button>
        <button type="button" className="btn sm" data-act="seq-next" disabled={cur >= last} onClick={() => { setPlay(false); setCur(c => Math.min(last, c + 1)) }}>다음 ›</button>
        <button type="button" className="btn ghost sm" onClick={() => { if (cur >= last) setCur(0); setPlay(p => !p) }}>{play ? '❚❚ 멈춤' : '▶ 자동 재생'}</button>
        <span className="muted">{Math.min(cur, last) + 1} / {steps.length}</span>
      </div>
      <div className={'ad-seq-note' + (st.fail ? ' fail' : '')} aria-live="polite">
        <small>{Math.min(cur, last) + 1}단계 · {s.actors[st.f]} → {s.actors[st.t]}</small>
        <b>{st.label}</b>
        {st.note && <p>{st.note}</p>}
      </div>
      <div className="ad-decide"><b>기획자가 정해서 적어야 할 것 · {s.name}</b><ul>{s.decide.map(d => <li key={d}>{d}</li>)}</ul></div>
    </div>
  )
}

/* =====================================================================
 * 4) 실시간 vs 배치
 * ===================================================================== */
// t: 분 (0 = 11/8 09:00, 1440 = 11/9 09:00)
const EVTS = [
  { t: 140, amt: 23500 }, { t: 185, amt: 18000 }, { t: 220, amt: 41200 }, { t: 530, amt: 15800 },
  { t: 570, amt: 32600 }, { t: 605, amt: 27400 }, { t: 675, amt: 19700 },
]
const BATCH_T = 900, BATCH_DONE = 920 // 00:00 시작, 00:20 완료
const hhmm = (t: number) => { const m = (540 + t) % 1440; return `${t + 540 >= 1440 ? '11/9' : '11/8'} ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }

function RealtimeBatch() {
  const [t, setT] = useState(300)
  const [play, setPlay] = useState(false)
  useEffect(() => {
    if (!play) return
    const id = window.setInterval(() => setT(v => { if (v >= 1440) { setPlay(false); return v } return Math.min(1440, v + 8) }), 50)
    return () => window.clearInterval(id)
  }, [play])
  const done = EVTS.filter(e => e.t <= t)
  const rtSum = done.reduce((a, e) => a + e.amt, 0)
  const batchRan = t >= BATCH_DONE
  const batching = t >= BATCH_T && t < BATCH_DONE
  const daySum = EVTS.reduce((a, e) => a + e.amt, 0)
  const rankAt = Math.floor((t + 540) / 60) * 60 - 540
  const P = (v: number) => (v / 1440) * 100 + '%'
  return (
    <div className="ad-rb">
      <div className="ad-row">
        <div className="ad-btns">
          <button type="button" className="btn sm" data-act="rb-play" onClick={() => { if (t >= 1440) setT(0); setPlay(p => !p) }}>{play ? '❚❚ 멈춤' : '▶ 하루 재생'}</button>
          <button type="button" className="btn ghost sm" onClick={() => { setPlay(false); setT(880) }}>자정 직전으로</button>
        </div>
        <b className="ad-clock" aria-live="off">{hhmm(t)}</b>
      </div>
      <div className="ad-tl">
        <div className="ad-tl-lane"><span className="ad-tl-name">실시간 · 결제 승인</span>
          <div className="ad-tl-track"><i className="ad-tl-now" style={{ left: P(t) }} />{EVTS.map((e, i) => <i key={i} className={'ad-tl-dot' + (e.t <= t ? ' on' : '')} style={{ left: P(e.t) }} />)}</div>
        </div>
        <div className="ad-tl-lane"><span className="ad-tl-name"><T k="준실시간" /> · 인기 랭킹 (매시 정각)</span>
          <div className="ad-tl-track"><i className="ad-tl-now" style={{ left: P(t) }} />{Array.from({ length: 24 }, (_, h) => h * 60 + 0).map(m => <i key={m} className={'ad-tl-tick' + (m <= t ? ' on' : '')} style={{ left: P(m) }} />)}</div>
        </div>
        <div className="ad-tl-lane"><span className="ad-tl-name">배치 · 정산·매출 통계 (매일 0시)</span>
          <div className="ad-tl-track"><i className="ad-tl-now" style={{ left: P(t) }} /><i className={'ad-tl-batch' + (batching ? ' run' : batchRan ? ' on' : '')} style={{ left: P(BATCH_T), width: P(BATCH_DONE - BATCH_T) }} /></div>
        </div>
        <div className="ad-tl-axis">{['09:00', '15:00', '21:00', '03:00', '09:00'].map((l, i) => <span key={i} style={{ left: P(i * 360) }}>{l}</span>)}</div>
        <input type="range" min={0} max={1440} step={5} value={t} onChange={e => { setPlay(false); setT(+e.target.value) }} aria-label="시각" style={{ ['--p' as string]: (t / 1440) * 100 + '%' }} />
      </div>
      <div className="ad-rb-cards">
        <div className="ad-rb-card rt"><small>사장님 앱 · 오늘 주문 <em>실시간</em></small><b>{done.length}건 · {won(rtSum)}</b><p>결제 승인 즉시 반영돼요. 사장님이 바로 반찬을 준비해야 하니까요.</p></div>
        <div className="ad-rb-card nr"><small>구매자 앱 · 인기 반찬 랭킹 <em>매시 갱신</em></small><b>{hhmm(Math.max(0, rankAt)).split(' ')[1]} 기준</b><p>몇십 분 늦어도 괜찮은 정보예요. 주문 때마다 다시 계산하면 서버 비용만 커져요.</p></div>
        <div className={'ad-rb-card bt' + (batchRan ? ' fresh' : '')}><small>어드민 · 11/8 매출 통계 <em>배치</em></small>
          <b>{batchRan ? won(daySum) : batching ? '집계 중…' : '집계 전'}</b>
          <p>{batchRan ? '11/9 00:20 계산 완료. 언제 계산한 숫자인지(기준 시각) 화면에 꼭 적어요.' : '매일 0시에 전날 주문을 모아 계산해요. 그 전에는 비어 있어요.'}</p></div>
      </div>
      {!batchRan && done.length > 0 && <Note tone="warn"><b>CS가 이렇게 물어요.</b> “사장님이 오늘 주문은 {done.length}건인데 매출 통계에는 왜 없냐고 하세요.” → 통계 화면에 <b>“매일 0시 집계 · 마지막 집계 11/8 00:20”</b>을 적어 두면 이런 문의가 사라져요.</Note>}
    </div>
  )
}

export default function Tab() {
  return (
    <div data-plan="admin">
      <TermList keys={['어드민', '운영자', '마스킹', '감사 로그', '일괄 처리', '권한 매트릭스', 'CMS', '외부 연동', '시퀀스 다이어그램', 'PG', '타임아웃', '망취소', '배치', '기준 시각']} extra={D} />
      <SysGrid>
        <Section id="plan-admin-why" wide title="고객은 못 보는 절반, 어드민"
          gist="어드민은 직원이 하루 종일 쓰는 화면이에요. 사고도 대부분 여기서 나요."
          desc={<>식당으로 치면 손님이 앉는 홀이 구매자 화면이고, 주방이 <T k="어드민" />이에요. 실무에서는 기획 시간의 절반 이상이 이 주방 쪽에 들어가요.</>}>
          <div className="ad-intro">
            <div className="ad-quote">
              <b>주니어가 자주 하는 실수</b>
              <p>“어드민은 개발자가 알아서 표로 만들어 주세요.” 이렇게 넘기면 위험한 화면이 만들어져요. 개인정보가 그대로 보이는 목록, 이유를 묻지 않고 내려받는 엑셀, 되돌릴 수 없는 <T k="일괄 처리" /> 같은 것들이에요. 사고는 대부분 어드민에서 나요.</p>
            </div>
            <ul className="ad-points">
              <li><b><T k="운영자" />도 사용자예요.</b> 하루 8시간 이 화면을 쓰는 사람이에요. 그 사람이 실수하기 어렵게 만들어요.</li>
              <li><b><T k="외부 연동" />은 실패부터 그려요.</b> 성공하는 길은 하나뿐이에요. 실패하거나 응답이 없는 경우는 여러 가지예요.</li>
              <li><b>“언제 반영되나요?”를 정해요.</b> 바로 반영하는지(실시간), 모아서 나중에 반영하는지(<T k="배치" />)에 따라 화면 문구와 CS 답변이 달라져요.</li>
            </ul>
          </div>
        </Section>

        <Section id="plan-admin-console" wide title="어드민 목록 화면 직접 써 보기 (오늘반찬 주문 관리)"
          gist="검색·다운로드·일괄 처리마다 규칙을 적어 둬야 사고가 안 나요."
          desc={<>화면 위의 번호를 누르거나, 직접 검색·정렬·선택·다운로드를 해 보세요. 옆(작은 화면에서는 아래)에 그 부분의 <T k="정책" />이 나와요. ‘역할로 보기’에서 역할을 바꾸면 보이는 메뉴와 누를 수 있는 버튼이 달라져요. 이름·연락처는 <T k="마스킹" />돼 있고, 하는 일은 모두 <T k="감사 로그" />에 남아요.</>}>
          <Console />
          <GoodBad
            bad={<><b>“주문 목록에 엑셀 다운로드 버튼 추가해 주세요.”</b><p>이 요청에는 정해진 게 하나도 없어요. 누가 받을 수 있나요? 몇 건까지인가요? 개인정보는 어떻게 하나요? 기록은 남나요? 개발자가 하나하나 되묻거나, 아무도 안 묻고 그대로 만들어져요.</p></>}
            good={<><b>엑셀 다운로드 (ORD-01, 정책 7)</b><p>권한: 운영 매니저 이상<br />범위: 지금 검색 결과 전체(최대 1만 건, 넘으면 기간을 나누라고 안내)<br />개인정보: 이름·연락처 가리기(마스킹)<br />사유: 꼭 고르게 함(CS 응대/배송 사고/정산 대조)<br />기록: 운영자 ID, 일시, 건수, 사유를 감사 로그에 저장<br />파일명: 오늘반찬_주문목록_YYYYMMDD.csv</p></>}
          />
        </Section>

        <Section id="plan-admin-check" title="어드민 기획 체크리스트"
          gist="넘기기 전에 개인정보·권한·기록·되돌리기, 이 네 가지를 꼭 봐요."
          desc="어드민 화면설계서를 넘기기 전에 하나씩 확인해요.">
          <Checklist name="어드민 기획 체크리스트" file="어드민_기획_체크리스트.md" items={[
            ['개인정보를 가렸나요(마스킹)?', '이름·연락처·주소는 처음부터 가려서 보여줘요. 가린 걸 풀 때는 사유를 받고 기록해요.'],
            ['다운로드 사유를 기록하나요?', '누가·언제·몇 건·무슨 사유로 받았는지 남겨요. 파일 속 개인정보도 가려요.'],
            ['여러 건을 한 번에 바꿀 때 확인 단계가 있나요?', '“선택한 N건을 ○○로 바꿔요”를 보여줘요. 빠지는 주문과 그 이유도 보여줘요.'],
            ['실수를 되돌릴 수 있나요?', '되돌리기를 얼마나 보여줄지 정해요. 되돌릴 수 없는 것(이미 보낸 알림)은 따로 구분해요.'],
            ['운영자 권한을 나눴나요?', 'CS·운영·정산·최고관리자로 나눠요. 메뉴만 숨기지 말고 서버에서도 막아요.'],
            ['변경 이력(감사 로그)이 남나요?', '이전 값 → 바뀐 값, 운영자 ID, 사유를 남겨요. 운영자가 지울 수 없어요.'],
            ['검색 기본 기간과 0건 문구가 있나요?', '기간 없이 전체를 검색하면 느리고, 개인정보도 많이 보여서 위험해요.'],
            ['목록 → 상세 → 목록으로 돌아와도 필터가 그대로인가요?', '운영자가 하루에 수백 번 하는 동작이에요.'],
          ]} />
        </Section>

        <Section id="plan-admin-cms-note" title="배너·공지 올리기 규칙 한눈에"
          gist="언제, 누구에게, 여러 개면 무엇을 보여줄지 세 가지만 정하면 돼요."
          desc={<>가게 앞 입간판을 직원이 직접 바꿔 다는 것처럼, <T k="CMS" />로는 개발자 없이 직원이 배너와 공지를 직접 올려요. 그래서 ‘언제·누구에게·여러 개면 무엇을’ 보여줄지 규칙이 필요해요.</>}>
          <dl className="ad-rules">
            <dt>노출 기간</dt><dd>시작·종료 일시를 꼭 적어요. 끝나는 날이 없는 배너는 잊혀서 몇 달씩 걸려 있어요.</dd>
            <dt>우선순위</dt><dd>같은 자리에 여러 개가 걸리면 숫자가 작은 것 하나만 보여요. 숫자도 같으면 나중에 등록한 것이 보여요.</dd>
            <dt>대상</dt><dd>전체 / 신규 / 재구매 고객 중에 골라요. 로그인하지 않은 사람은 ‘전체’ 배너만 봐요.</dd>
            <dt>미리보기</dt><dd>날짜와 대상을 바꿔 가며 실제 화면에서 확인한 뒤 저장해요.</dd>
            <dt>상태</dt><dd>예약 → 노출 중 → 종료. 기간에 따라 자동으로 바뀌어요.</dd>
            <dt>공지</dt><dd>점검·장애 공지는 배너보다 먼저 보여요. 우선순위를 1로 고정해요. <a href="#/feedback/feedback-banner">배너형 알림 패턴 →</a></dd>
          </dl>
        </Section>

        <Section id="plan-admin-cms" wide title="어떤 배너가 보일지 미리 보기"
          gist="같은 날 배너가 여러 개 겹치면, 우선순위 숫자가 가장 작은 하나만 보여요."
          desc="날짜와 보는 사람을 바꿔 보세요. 기간·대상·우선순위에 따라 홈에 걸릴 배너 하나가 정해져요. 아래 표를 고치면 바로 반영돼요.">
          <Cms />
        </Section>

        <Section id="plan-admin-seq" wide title="다른 회사 시스템과 주고받는 순서 (외부 연동)"
          gist="성공하는 길은 하나뿐이에요. 실패하거나 응답이 없을 때 화면부터 정해요."
          desc={<>택배를 맡기면 접수 → 배송 → 도착 알림이 차례로 오가요. 중간에 분실되거나 연락이 끊길 수도 있어요. 이 그림(<T k="시퀀스 다이어그램" />)은 우리 앱 – 우리 서버 – 바깥 회사 사이에 무엇이 오가는지 순서대로 보여줘요. 성공·실패·응답 없음(<T k="타임아웃" />)을 바꿔 보고, 화살표를 눌러 단계 설명을 읽어요. 결제는 <T k="PG" />, 본인인증은 <T k="CI" />, 알림 재전송은 <T k="고유키" />를 눈여겨봐요.</>}>
          <Sequence />
          <Note tone="tip">
            <b>기획서에 꼭 넣어야 할 것</b><br />
            ① 단계마다 사용자가 보는 화면과 문구<br />
            ② 실패 이유별 안내 문구<br />
            ③ 기다리는 동안 보이는 화면(<a href="#/loading/loading-button">버튼 로딩</a>)<br />
            ④ 다시 시도할 수 있는지<br />
            버튼을 두 번 눌러 결제가 두 번 되는 일(<T k="따닥" />)을 막는 법은 <a href="#/plan/policy">정책 · 예외</a> 탭을 보세요. 결제 응답을 못 받았을 때의 <T k="망취소" />도 이 흐름에 나와요.
          </Note>
        </Section>

        <Section id="plan-admin-batch" wide title="바로 반영할까, 모아서 반영할까 (실시간 vs 배치)"
          gist="숫자마다 얼마나 최신이어야 하는지 정하고, 화면에 기준 시각을 적어요."
          desc={<>우체부가 편지가 생길 때마다 오면 실시간, 하루치를 모아 정해진 시각에 한 번 오면 <T k="배치" />예요. 모든 숫자가 실시간일 필요는 없어요. 오늘반찬에서는 결제 승인은 실시간, 인기 랭킹은 매시 정각, 정산·통계는 매일 0시에 배치로 계산해요. ‘하루 재생’을 눌러 보세요. 배치 숫자에는 <T k="기준 시각" />을 꼭 붙여요.</>}>
          <RealtimeBatch />
        </Section>

        <Section id="plan-admin-dev" title="개발자와 같이 정할 질문"
          gist="“실시간이에요?” 대신, 얼마나 최신이어야 하는지부터 같이 정해요."
          desc="“이거 실시간이에요?”만 묻지 말고, 이 목록으로 하나씩 같이 정해요.">
          <Checklist name="실시간·배치·연동 협의 질문" file="개발_협의_질문.md" items={[
            ['이 데이터는 얼마나 최신이어야 하나요?', '즉시 / 몇 분 / 하루 중에 골라요. 사용자가 그 숫자를 보고 무엇을 결정하는지부터 말해요.'],
            ['배치는 언제 돌고, 얼마나 걸리나요?', '계산하는 동안 화면에는 무엇을 보여주나요?'],
            ['배치가 실패하면 누가 알고, 어떻게 다시 돌리나요?', '다시 돌릴 때 같은 주문이 두 번 더해지지 않나요?'],
            ['화면에 기준 시각을 어떻게 표시하나요?', '예: “11/9 00:20 기준”. 시간은 한국 시간(KST)으로 통일해요.'],
            ['계산이 끝난 뒤 들어온 취소·환불은 어떻게 반영하나요?', '다음 배치 때 반영하나요, 그날 다시 계산하나요?'],
            ['외부 API의 타임아웃과 재시도 정책은요?', '몇 초까지 기다리고, 몇 번, 얼마 간격으로 다시 시도하나요?'],
            ['외부 API를 부를 수 있는 횟수 제한이나 비용이 있나요?', '예: 알림 한 건당 비용, 1초에 부를 수 있는 횟수.'],
            ['외부 회사에 장애가 나면 우리 서비스는 어떻게 보이나요?', '예: PG사 장애 때는 결제 버튼을 막고 공지 배너를 띄워요.'],
          ]} />
        </Section>

        <Section id="plan-admin-ref" title="참고"
          gist="이 탭의 내용은 아래 자료와 각 회사의 공식 연동 문서를 바탕으로 해요."
          desc="확인된 자료만 적었어요.">
          <ul className="ad-ref">
            <li><b>Marty Cagan, 『인스파이어드』(SVPG)</b> — 직원이 쓰는 내부 도구와 일하는 효율도 제품의 일부라는 관점.</li>
            <li><b>Atlassian Agile Coach</b> — 요구사항과 인수 조건(AC)을 작업 티켓으로 나누는 법. 어드민 정책도 같은 방식으로 티켓에 담아요.</li>
            <li>외부 연동의 자세한 규격(주고받는 항목, 오류 코드, 타임아웃 값)은 각 기관·PG사·발송 대행사의 공식 연동 문서를 기준으로 해요. 개발자와 함께 확인해요. 이 노트의 흐름은 흔히 쓰는 구조를 설명한 거예요.</li>
            <li>함께 보기: <a href="#/plan/policy">정책 · 예외 (권한 매트릭스, 따닥 방지)</a> · <a href="#/feedback/feedback-modal">확인 모달</a> · <a href="#/feedback/feedback-snack">되돌리기 스낵바</a></li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
