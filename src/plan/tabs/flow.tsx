import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Seg, useTimers } from '../../components/ui'
import { download } from '../../system/export'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { Term, TermList } from '../../components/Term'
import './flow.css'

/* ================= 공용 작은 조각 ================= */
const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCSV = (rows: (string | number)[][]) => rows.map(r => r.map(csvCell).join(',')).join('\n')

function CheckList({ id, items }: { id: string; items: string[] }) {
  const [on, setOn] = useState<boolean[]>(() => items.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <div className="fl-check">
      <div className="fl-check-top"><span>리뷰 전에 스스로 답해 보세요</span><b className={n === items.length ? 'is-ok' : ''}>{n} / {items.length}</b></div>
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

function GoodBad({ pairs }: { pairs: { topic: string; bad: ReactNode; good: ReactNode; why: ReactNode }[] }) {
  const [mode, setMode] = useState<'bad' | 'good'>('bad')
  return (
    <div className="fl-gb">
      <Seg value={mode} onChange={setMode} options={[['bad', '✕ 나쁜 예'], ['good', '✓ 좋은 예']]} />
      <div className="fl-gb-list">
        {pairs.map(p => (
          <div key={p.topic} className={'fl-gb-item ' + mode}>
            <div className="fl-gb-topic">{p.topic}</div>
            <div className="fl-gb-body">{mode === 'bad' ? p.bad : p.good}</div>
            {mode === 'good' && <div className="fl-gb-why">{p.why}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================= 1. IA 트리 편집기 ================= */
type Perm = 'guest' | 'member' | 'owner' | 'admin'
const PERMS: { k: Perm; label: string }[] = [
  { k: 'guest', label: '비회원' }, { k: 'member', label: '회원' }, { k: 'owner', label: '사장님' }, { k: 'admin', label: '관리자' },
]
interface IANode { k: number; name: string; depth: number; code: string; perms: Perm[] }

let seq = 0
const N = (depth: number, name: string, perms: Perm[], code = ''): IANode => ({ k: ++seq, depth, name, perms, code })
const SEED = (): IANode[] => [
  N(0, '홈', ['guest', 'member'], 'HOME'),
  N(1, '메인', ['guest', 'member']),
  N(1, '동네 가게 목록', ['guest', 'member']),
  N(2, '가게 상세', ['guest', 'member']),
  N(3, '메뉴 상세', ['guest', 'member']),
  N(0, '검색', ['guest', 'member'], 'SRCH'),
  N(1, '검색 결과', ['guest', 'member']),
  N(0, '주문', ['member'], 'ORD'),
  N(1, '장바구니', ['member']),
  N(1, '주문서', ['member']),
  N(2, '결제', ['member']),
  N(1, '주문 완료', ['member']),
  N(1, '주문 내역', ['member']),
  N(2, '주문 상세', ['member']),
  N(1, '리뷰 작성', ['member']),
  N(0, '마이', ['guest', 'member'], 'MY'),
  N(1, '로그인 · 회원가입', ['guest']),
  N(1, '내 정보', ['member']),
  N(1, '쿠폰함', ['member']),
  N(0, '사장님 센터', ['owner'], 'OWN'),
  N(1, '주문 접수', ['owner']),
  N(1, '메뉴 관리', ['owner']),
  N(2, '메뉴 등록 · 수정', ['owner']),
  N(1, '정산 내역', ['owner']),
  N(0, '운영 어드민', ['admin'], 'ADM'),
  N(1, '회원 관리', ['admin']),
  N(1, '가게 심사', ['admin']),
  N(1, '정산 관리', ['admin']),
]

const pad2 = (n: number) => String(n).padStart(2, '0')
const subEnd = (a: IANode[], i: number) => { let j = i + 1; while (j < a.length && a[j].depth > a[i].depth) j++; return j }

interface Computed { id: string; path: string[]; warn: string[] }
function computeIA(a: IANode[]): Computed[] {
  const out: Computed[] = []
  let top = 'MENU'
  const cnt: number[] = []
  const names: string[] = []
  const permStack: Perm[][] = []
  let topCount = 0
  a.forEach(n => {
    const warn: string[] = []
    if (n.depth === 0) {
      topCount++
      top = (n.code.trim() || `MENU${topCount}`).toUpperCase()
      cnt.length = 0
    } else {
      cnt[n.depth] = (cnt[n.depth] ?? 0) + 1
      cnt.length = n.depth + 1
    }
    names[n.depth] = n.name || '(이름 없음)'
    names.length = n.depth + 1
    permStack[n.depth] = n.perms
    permStack.length = n.depth + 1
    const id = n.depth === 0 ? top : top + '-' + cnt.slice(1, n.depth + 1).map(pad2).join('-')
    if (n.depth >= 3) warn.push(`${n.depth + 1}단계예요. 3단계 안에서 찾을 수 있게 묶어 보세요. 탭이나 필터로 펼치는 방법도 있어요.`)
    if (!n.name.trim()) warn.push('화면 이름이 비어 있어요.')
    if (n.perms.length === 0) warn.push('들어갈 수 있는 사람이 하나도 없어요. 아무도 못 여는 화면이에요.')
    if (n.depth > 0) {
      const parent = permStack[n.depth - 1] ?? []
      const extra = n.perms.filter(p => !parent.includes(p))
      if (extra.length && parent.length) warn.push(`윗 메뉴에는 못 들어가는 사람(${extra.map(p => PERMS.find(x => x.k === p)!.label).join('·')})이 이 화면에는 들어갈 수 있어요. 공유 링크처럼 따로 들어오는 길이 있는지 적어 두세요.`)
    }
    out.push({ id, path: [...names], warn })
  })
  return out
}

function IAEditor() {
  const [nodes, setNodes] = useState<IANode[]>(SEED)
  const [undo, setUndo] = useState<IANode[] | null>(null)
  const [focusK, setFocusK] = useState<number | null>(null)
  const comp = useMemo(() => computeIA(nodes), [nodes])
  const maxDepth = Math.max(0, ...nodes.map(n => n.depth)) + 1
  const warnCount = comp.reduce((s, c) => s + c.warn.length, 0)

  const edit = (fn: (a: IANode[]) => IANode[]) => setNodes(fn)
  const patch = (i: number, p: Partial<IANode>) => edit(a => a.map((n, j) => (j === i ? { ...n, ...p } : n)))
  const shift = (i: number, d: 1 | -1) => edit(a => {
    const e = subEnd(a, i)
    if (d === 1 && (i === 0 || a[i].depth > a[i - 1].depth)) return a
    if (d === -1 && a[i].depth === 0) return a
    return a.map((n, j) => (j >= i && j < e ? { ...n, depth: n.depth + d, code: n.depth + d === 0 && !n.code ? 'NEW' : n.code } : n))
  })
  const move = (i: number, d: 1 | -1) => edit(a => {
    const dep = a[i].depth, e = subEnd(a, i)
    if (d === -1) {
      let j = i - 1
      while (j >= 0 && a[j].depth > dep) j--
      if (j < 0 || a[j].depth !== dep) return a
      return [...a.slice(0, j), ...a.slice(i, e), ...a.slice(j, i), ...a.slice(e)]
    }
    if (e >= a.length || a[e].depth !== dep) return a
    const e2 = subEnd(a, e)
    return [...a.slice(0, i), ...a.slice(e, e2), ...a.slice(i, e), ...a.slice(e2)]
  })
  const add = (i: number, child: boolean) => {
    const n = nodes[i]
    const nn = N(child ? n.depth + 1 : n.depth, child ? '새 하위 화면' : '새 화면', [...n.perms], child || n.depth > 0 ? '' : 'NEW')
    setFocusK(nn.k)
    edit(a => { const e = subEnd(a, i); return [...a.slice(0, e), nn, ...a.slice(e)] })
  }
  const addTop = () => { const nn = N(0, '새 메뉴', ['member'], 'NEW'); setFocusK(nn.k); edit(a => [...a, nn]) }
  const remove = (i: number) => { setUndo(nodes); edit(a => { const e = subEnd(a, i); return [...a.slice(0, i), ...a.slice(e)] }) }

  const csv = useMemo(() => {
    const L = Math.max(4, maxDepth)
    const head = ['화면 ID', ...Array.from({ length: L }, (_, i) => `${i + 1}단계`), '화면명', '깊이', ...PERMS.map(p => p.label), '검토 메모']
    const rows = nodes.map((n, i) => [
      comp[i].id, ...Array.from({ length: L }, (_, d) => (d <= n.depth ? comp[i].path[d] : '')), n.name, n.depth + 1,
      ...PERMS.map(p => (n.perms.includes(p.k) ? 'O' : '-')), comp[i].warn.join(' / '),
    ])
    return toCSV([head, ...rows])
  }, [nodes, comp, maxDepth])

  return (
    <div className="fl-ia">
      <div className="fl-ia-stats">
        <span>화면 <b>{nodes.length}</b>개</span>
        <span>최대 깊이 <b className={maxDepth >= 4 ? 'is-bad' : 'is-ok'}>{maxDepth}단계</b></span>
        <span>검토할 곳 <b className={warnCount ? 'is-bad' : 'is-ok'}>{warnCount}</b>개</span>
        <span className="fl-ia-legend">{PERMS.map(p => <i key={p.k} className={'fl-perm on ' + p.k}>{p.label}</i>)}</span>
      </div>
      <ol className="fl-ia-tree" aria-label="IA 트리">
        {nodes.map((n, i) => {
          const c = comp[i]
          const deep = n.depth >= 3
          return (
            <li key={n.k} className={'fl-ia-row' + (deep ? ' deep' : '') + (c.warn.length ? ' has-warn' : '') + (n.depth === 0 ? ' top' : '')} style={{ ['--d' as string]: n.depth }}>
              <div className="fl-ia-main">
                <span className="fl-ia-guides" aria-hidden="true">{Array.from({ length: n.depth }, (_, d) => <i key={d} />)}</span>
                <code className="fl-ia-id" title="자동으로 붙는 화면 ID">{c.id}</code>
                {n.depth === 0 && (
                  <input className="fl-ia-code" value={n.code} maxLength={6} aria-label="메뉴 코드 (화면 ID 앞부분)"
                    onChange={e => patch(i, { code: e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase() })} />
                )}
                <input className="fl-ia-name" value={n.name} aria-label={`${c.id} 화면 이름`} autoFocus={focusK === n.k}
                  onFocus={e => { if (focusK === n.k) { e.currentTarget.select(); setFocusK(null) } }}
                  onChange={e => patch(i, { name: e.target.value })} />
                {deep && <span className="fl-ia-depth">⚠ {n.depth + 1}단계</span>}
              </div>
              <div className="fl-ia-side">
                <span className="fl-ia-perms" role="group" aria-label="접근 권한">
                  {PERMS.map(p => {
                    const on = n.perms.includes(p.k)
                    return (
                      <button key={p.k} type="button" className={'fl-perm ' + p.k + (on ? ' on' : '')} aria-pressed={on}
                        onClick={() => patch(i, { perms: on ? n.perms.filter(x => x !== p.k) : PERMS.map(x => x.k).filter(x => x === p.k || n.perms.includes(x)) })}>{p.label}</button>
                    )
                  })}
                </span>
                <span className="fl-ia-acts">
                  <button type="button" title="내어쓰기" aria-label="내어쓰기" disabled={n.depth === 0} onClick={() => shift(i, -1)}>⇤</button>
                  <button type="button" title="들여쓰기" aria-label="들여쓰기" disabled={i === 0 || n.depth > nodes[i - 1].depth} onClick={() => shift(i, 1)}>⇥</button>
                  <button type="button" title="위로" aria-label="위로" onClick={() => move(i, -1)}>↑</button>
                  <button type="button" title="아래로" aria-label="아래로" onClick={() => move(i, 1)}>↓</button>
                  <button type="button" title="같은 단계에 추가" aria-label="같은 단계에 화면 추가" onClick={() => add(i, false)}>＋</button>
                  <button type="button" title="하위 화면 추가" aria-label="하위 화면 추가" onClick={() => add(i, true)}>↳</button>
                  <button type="button" title="삭제 (하위 포함)" aria-label="삭제" className="del" onClick={() => remove(i)}>✕</button>
                </span>
              </div>
              {c.warn.length > 0 && <ul className="fl-ia-warn">{c.warn.map(w => <li key={w}>{w}</li>)}</ul>}
            </li>
          )
        })}
      </ol>
      <div className="fl-row">
        <button type="button" className="btn sm ghost" onClick={addTop}>＋ 1단계 메뉴 추가</button>
        {undo && <button type="button" className="btn sm ghost" onClick={() => { setNodes(undo); setUndo(null) }}>↶ 삭제 되돌리기</button>}
        <button type="button" className="btn sm ghost" onClick={() => { setNodes(SEED()); setUndo(null) }}>예시로 초기화</button>
        <span className="fl-grow" />
        <button type="button" className="btn sm" data-export="ia-csv" onClick={() => download('오늘반찬_IA.csv', '﻿' + csv, 'text/csv;charset=utf-8')}>CSV 내려받기</button>
      </div>
      <CodeBlock code={csv} label="IA.csv 미리보기 (엑셀·시트에 그대로 붙여 넣어요)" maxHeight={220} />
    </div>
  )
}

/* ================= 2. 유저 플로우 ↔ 플로우차트 ================= */
type FType = 'term' | 'scr' | 'dec' | 'sys'
interface FNode { t: FType; x: number; y: number; label: string[]; info: string }
const FN: Record<string, FNode> = {
  start: { t: 'term', x: 150, y: 40, label: ['시작', '장바구니 · 주문하기'], info: '구매자가 장바구니(ORD-01)에서 [주문하기]를 눌렀어요.' },
  d_login: { t: 'dec', x: 150, y: 140, label: ['로그인했나요?'], info: '로그인 안 한 사람은 로그인 화면으로 보내요. 로그인이 끝나면 장바구니로 되돌리지 말고 다음 단계로 바로 이어가요. 담은 반찬을 다시 담게 하면 사람들이 떠나요.' },
  login: { t: 'scr', x: 360, y: 140, label: ['로그인 · 회원가입', 'MY-01'], info: '로그인 화면이에요. 로그인 뒤 돌아갈 곳(주문 진행 중)을 기억해 두는 게 규칙이에요.' },
  d_stock: { t: 'dec', x: 150, y: 250, label: ['재고가 있나요?'], info: '반찬은 하루에 만드는 양이 정해져 있어요. 그래서 장바구니에 담은 뒤에 품절될 수 있어요. 주문서로 넘어가기 직전에 한 번 더 확인해요.' },
  soldout: { t: 'scr', x: 360, y: 250, label: ['품절 안내', '품절 반찬 빼기'], info: '어떤 반찬이 품절인지 이름으로 알려 줘요. 나머지만 주문할지 고르게 해요.' },
  end_cart: { t: 'term', x: 360, y: 340, label: ['끝', '장바구니로'], info: '주문이 멈췄어요. 품절 반찬을 뺀 장바구니로 돌아가요.' },
  order: { t: 'scr', x: 150, y: 350, label: ['주문서', 'ORD-02'], info: '배송지·요청사항·결제 수단을 확인하는 화면이에요.' },
  d_bal: { t: 'dec', x: 150, y: 455, label: ['반찬머니 잔액이', '결제 금액 이상?'], info: '잔액이 모자라면 충전 팝업을 띄워요. 충전이 끝나면 주문서를 처음부터 다시 띄우지 말고 결제로 바로 이어가요.' },
  charge: { t: 'scr', x: 360, y: 455, label: ['충전 팝업', '부족한 금액 자동 입력'], info: '모자란 금액을 미리 채워 두면 사용자가 직접 계산하지 않아도 돼요.' },
  approve: { t: 'sys', x: 150, y: 560, label: ['결제 승인 요청', '잔액 차감 · 주문 생성'], info: '사용자에게 보이지 않는 서버 쪽 처리예요. 처리 중에는 결제 버튼을 못 누르게 막아요. 두 번 눌려 두 번 결제되는 걸 막기 위해서예요(정책·예외 탭의 ‘따닥’ 데모).' },
  d_ok: { t: 'dec', x: 150, y: 662, label: ['승인에 성공했나요?'], info: '실패 이유(한도 초과, 통신 오류)마다 안내 문구가 달라요. 이유별 문구를 표로 정리해 두세요.' },
  fail: { t: 'scr', x: 360, y: 662, label: ['결제 실패 안내', '이유 + 다시 시도'], info: '무엇 때문에 실패했는지, 돈이 빠져나갔는지를 먼저 알려 줘요.' },
  end_fail: { t: 'term', x: 360, y: 752, label: ['끝', '주문서로 돌아가기'], info: '입력한 배송지·요청사항은 그대로 남아 있어야 해요.' },
  done: { t: 'scr', x: 150, y: 765, label: ['주문 완료', 'ORD-03'], info: '주문 번호, 도착 예정 시간, 주문 상세로 가는 버튼을 보여줘요.' },
  end_ok: { t: 'term', x: 150, y: 855, label: ['끝', '주문 접수'], info: '사장님 센터(OWN-01)에 새 주문이 들어가요.' },
}
const DECS = ['d_login', 'd_stock', 'd_bal', 'd_ok'] as const
type DecId = typeof DECS[number]
const BRANCH: Record<DecId, { yes: string; no: string; noLabel: string }> = {
  d_login: { yes: 'd_stock', no: 'login', noLabel: '비로그인' },
  d_stock: { yes: 'order', no: 'soldout', noLabel: '품절' },
  d_bal: { yes: 'approve', no: 'charge', noLabel: '잔액 부족' },
  d_ok: { yes: 'done', no: 'fail', noLabel: '승인 실패' },
}
const NEXT: Record<string, string | null> = { start: 'd_login', login: 'd_stock', soldout: 'end_cart', order: 'd_bal', charge: 'approve', approve: 'd_ok', fail: 'end_fail', done: 'end_ok', end_cart: null, end_fail: null, end_ok: null }
const EDGES: { from: string; to: string; d: string; lab?: [number, number, string] }[] = [
  { from: 'start', to: 'd_login', d: 'M150 62 V104' },
  { from: 'd_login', to: 'd_stock', d: 'M150 176 V214', lab: [160, 188, '예'] },
  { from: 'd_login', to: 'login', d: 'M232 140 H282', lab: [257, 132, '아니오'] },
  { from: 'login', to: 'd_stock', d: 'M360 164 V196 H156' },
  { from: 'd_stock', to: 'order', d: 'M150 286 V325', lab: [160, 308, '예'] },
  { from: 'd_stock', to: 'soldout', d: 'M232 250 H282', lab: [257, 242, '아니오'] },
  { from: 'soldout', to: 'end_cart', d: 'M360 274 V317' },
  { from: 'order', to: 'd_bal', d: 'M150 375 V417' },
  { from: 'd_bal', to: 'approve', d: 'M150 493 V535', lab: [160, 506, '예'] },
  { from: 'd_bal', to: 'charge', d: 'M232 455 H282', lab: [257, 447, '아니오'] },
  { from: 'charge', to: 'approve', d: 'M360 479 V512 H156' },
  { from: 'approve', to: 'd_ok', d: 'M150 585 V626' },
  { from: 'd_ok', to: 'done', d: 'M150 698 V740', lab: [160, 722, '예'] },
  { from: 'd_ok', to: 'fail', d: 'M232 662 H282', lab: [257, 654, '아니오'] },
  { from: 'fail', to: 'end_fail', d: 'M360 686 V729' },
  { from: 'done', to: 'end_ok', d: 'M150 790 V832' },
]
const HAPPY: Record<DecId, boolean> = { d_login: true, d_stock: true, d_bal: true, d_ok: true }
const PRESETS: { label: string; v: Partial<Record<DecId, boolean>> }[] = [
  { label: '행복 경로', v: {} },
  { label: '비로그인', v: { d_login: false } },
  { label: '품절', v: { d_stock: false } },
  { label: '잔액 부족', v: { d_bal: false } },
  { label: '승인 실패', v: { d_ok: false } },
]

function walk(ch: Record<DecId, boolean>) {
  const nodes: string[] = []
  let cur: string | null = 'start'
  while (cur) {
    nodes.push(cur)
    cur = (DECS as readonly string[]).includes(cur) ? (ch[cur as DecId] ? BRANCH[cur as DecId].yes : BRANCH[cur as DecId].no) : NEXT[cur]
  }
  const edges = new Set<string>()
  for (let i = 1; i < nodes.length; i++) edges.add(nodes[i - 1] + '>' + nodes[i])
  return { nodes, edges }
}

function Shape({ n, on, cur }: { n: FNode; on: boolean; cur: boolean }) {
  const cls = 'fc-shape t-' + n.t + (on ? ' on' : '') + (cur ? ' cur' : '')
  const { x, y } = n
  if (n.t === 'dec') return <polygon className={cls} points={`${x},${y - 36} ${x + 82},${y} ${x},${y + 36} ${x - 82},${y}`} />
  if (n.t === 'term') return <rect className={cls} x={x - 75} y={y - 22} width="150" height="44" rx="22" />
  if (n.t === 'sys') return (
    <g className={cls}>
      <rect x={x - 80} y={y - 24} width="160" height="48" rx="3" />
      <line x1={x - 70} y1={y - 24} x2={x - 70} y2={y + 24} />
      <line x1={x + 70} y1={y - 24} x2={x + 70} y2={y + 24} />
    </g>
  )
  return (
    <g className={cls}>
      <rect x={x - 78} y={y - 24} width="156" height="48" rx="6" />
      <line className="hd" x1={x - 78} y1={y - 15} x2={x + 78} y2={y - 15} />
    </g>
  )
}

function FlowLab() {
  const [mode, setMode] = useState<'user' | 'chart'>('chart')
  const [ch, setCh] = useState<Record<DecId, boolean>>(HAPPY)
  const [sel, setSel] = useState<string>('d_bal')
  const [step, setStep] = useState<number | null>(null)
  const timers = useTimers()
  const path = useMemo(() => walk(ch), [ch])
  const shown = step === null ? path.nodes.length : step + 1
  const visible = new Set(path.nodes.slice(0, shown))
  const visEdges = new Set(path.nodes.slice(1, shown).map((n, i) => path.nodes[i] + '>' + n))
  const screens = path.nodes.filter(n => FN[n].t === 'scr').length

  const toggle = (d: DecId) => { timers.clear(); setStep(null); setSel(d); setCh(c => ({ ...c, [d]: !c[d] })) }
  const preset = (v: Partial<Record<DecId, boolean>>) => { timers.clear(); setStep(null); setCh({ ...HAPPY, ...v }); const k = Object.keys(v)[0]; if (k) setSel(k) }
  const play = () => {
    timers.clear()
    setStep(0)
    path.nodes.forEach((_, i) => timers.set(() => setStep(i === path.nodes.length - 1 ? null : i + 1), 520 * (i + 1)))
  }
  const onKey = (d: DecId) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(d) } }
  const curNode = step === null ? null : path.nodes[step]

  return (
    <div className="fl-lab">
      <div className="fl-row">
        <Seg value={mode} onChange={setMode} options={[['user', '유저 플로우 (화면 순서)'], ['chart', '플로우차트 (갈림길)']]} />
        <span className="fl-grow" />
        <span className="muted">시나리오: <b>첫 주문 결제</b></span>
      </div>

      {mode === 'user' ? (
        <div className="fl-user">
          <ol className="fl-user-list">
            {[
              ['HOME-02-01', '가게 상세', '반찬 담기'],
              ['ORD-01', '장바구니', '주문하기'],
              ['ORD-02', '주문서', '결제하기'],
              ['ORD-02-01', '결제 진행', '승인 완료'],
              ['ORD-03', '주문 완료', ''],
            ].map(([id, name, act], i) => (
              <li key={id}>
                <div className="fl-scr">
                  <code>{id}</code>
                  <b>{name}</b>
                  <div className="fl-wire" aria-hidden="true"><i /><i /><i className="s" />{i < 4 && <i className="btn-w" />}</div>
                </div>
                {act && <span className="fl-user-act" aria-label={`다음: ${act}`}><small>{act}</small><span aria-hidden="true">→</span></span>}
              </li>
            ))}
          </ol>
          <Note tone="tip">
            <b>유저 플로우는 ‘모든 질문에 예라고 답한’ 길이에요.</b> 화면이 몇 개이고 어떤 순서인지 디자이너와 맞출 때 좋아요. 그런데 이 그림 뒤에는 질문 4개가 숨어 있어요. 눌러서 확인해 보세요.
            <span className="fl-hidden-q">
              {DECS.map(d => (
                <button key={d} type="button" className="chip" onClick={() => { setMode('chart'); preset({ [d]: false }) }}>
                  {FN[d].label.join(' ')} → {BRANCH[d].noLabel}이면?
                </button>
              ))}
            </span>
          </Note>
        </div>
      ) : (
        <div className="fl-chart">
          <div className="fl-svg-wrap">
            <svg viewBox="0 0 460 885" role="img" aria-label="첫 주문 결제 플로우차트. 마름모를 누르면 예/아니오가 바뀌어요.">
              <defs>
                <marker id="fl-arr" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="fc-arrhead" /></marker>
                <marker id="fl-arr-on" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="fc-arrhead on" /></marker>
              </defs>
              {EDGES.map(e => {
                const on = visEdges.has(e.from + '>' + e.to)
                return (
                  <g key={e.from + e.to} className={'fc-edge' + (on ? ' on' : '')}>
                    <path d={e.d} markerEnd={`url(#${on ? 'fl-arr-on' : 'fl-arr'})`} />
                    {e.lab && <text x={e.lab[0]} y={e.lab[1]} textAnchor={e.lab[2] === '예' ? 'start' : 'middle'}>{e.lab[2]}</text>}
                  </g>
                )
              })}
              {Object.entries(FN).map(([id, n]) => {
                const isDec = (DECS as readonly string[]).includes(id)
                const on = visible.has(id)
                const inner = (
                  <>
                    <Shape n={n} on={on} cur={curNode === id} />
                    <text className={'fc-label' + (on ? ' on' : '')} x={n.x} y={n.y + (n.label.length === 1 ? 5 : n.t === 'scr' ? 0 : -3)} textAnchor="middle">
                      {n.label.map((l, i) => <tspan key={i} x={n.x} dy={i ? 16 : 0} className={i ? 'sub' : ''}>{l}</tspan>)}
                    </text>
                  </>
                )
                if (!isDec) return <g key={id} className="fc-node" onClick={() => setSel(id)}>{inner}</g>
                const d = id as DecId
                return (
                  <g key={id} className={'fc-node fc-dec' + (sel === id ? ' sel' : '')} role="button" tabIndex={0}
                    aria-label={`${n.label.join(' ')} 지금 ${ch[d] ? '예' : '아니오'}. 눌러서 바꾸기`} aria-pressed={!ch[d]}
                    onClick={() => toggle(d)} onKeyDown={onKey(d)}>
                    {inner}
                    <g className={'fc-pill ' + (ch[d] ? 'yes' : 'no')}>
                      <rect x={n.x + 48} y={n.y - 46} width="48" height="20" rx="10" />
                      <text x={n.x + 72} y={n.y - 32} textAnchor="middle">{ch[d] ? '예' : '아니오'}</text>
                    </g>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="fl-panel">
            <div className="fl-presets">
              <span className="muted">경로 고르기</span>
              <div className="chips">
                {PRESETS.map(p => {
                  const on = DECS.every(d => ch[d] === (p.v[d] ?? true))
                  return <button key={p.label} type="button" className="chip" aria-pressed={on} onClick={() => preset(p.v)}>{p.label}</button>
                })}
              </div>
              <span className="muted">또는 그림의 <b>마름모</b>를 눌러 예/아니오를 바꿔 보세요.</span>
            </div>
            <div className="fl-row">
              <button type="button" className="btn sm orange" onClick={play} data-act="play">▶ 경로 따라가기</button>
              <span className="muted">이 경로: 단계 {path.nodes.length}개 · 화면 {screens}개</span>
            </div>
            <ol className="fl-steps">
              {path.nodes.map((n, i) => (
                <li key={n} className={(i < shown ? 'on ' : '') + 't-' + FN[n].t + (curNode === n ? ' cur' : '')}>
                  <span className="fl-step-ic" aria-hidden="true" />
                  <span>{FN[n].label.join(' · ')}</span>
                  {(DECS as readonly string[]).includes(n) && <em className={ch[n as DecId] ? 'yes' : 'no'}>{ch[n as DecId] ? '예' : '아니오'}</em>}
                </li>
              ))}
            </ol>
            <div className="fl-info" aria-live="polite">
              <small>{FN[sel].t === 'dec' ? '판단 (갈림길)' : FN[sel].t === 'sys' ? '시스템 처리 (안 보이는 서버 일)' : FN[sel].t === 'term' ? '시작/끝' : '화면'}</small>
              <b>{FN[sel].label.join(' ')}</b>
              <p>{FN[sel].info}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= 3. 도형 규칙 ================= */
function Legend() {
  const S = ({ t }: { t: FType | 'arrow' | 'conn' }) => (
    <svg viewBox="0 0 120 64" className="fl-sym" aria-hidden="true">
      {t === 'term' && <rect className="fc-shape t-term on" x="14" y="14" width="92" height="36" rx="18" />}
      {t === 'scr' && <g className="fc-shape t-scr on"><rect x="14" y="12" width="92" height="40" rx="5" /><line className="hd" x1="14" y1="21" x2="106" y2="21" /></g>}
      {t === 'dec' && <polygon className="fc-shape t-dec on" points="60,6 108,32 60,58 12,32" />}
      {t === 'sys' && <g className="fc-shape t-sys on"><rect x="14" y="12" width="92" height="40" rx="2" /><line x1="22" y1="12" x2="22" y2="52" /><line x1="98" y1="12" x2="98" y2="52" /></g>}
      {t === 'arrow' && <g className="fc-edge on"><path d="M14 32 H100" markerEnd="url(#fl-arr-legend)" /><text x="56" y="24" textAnchor="middle">예</text></g>}
      {t === 'conn' && <g className="fc-shape t-term on"><circle cx="60" cy="32" r="18" /><text x="60" y="37" textAnchor="middle" className="fc-label on">A</text></g>}
      <defs><marker id="fl-arr-legend" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 0 L10 5 L0 10 z" className="fc-arrhead on" /></marker></defs>
    </svg>
  )
  const rows: [FType | 'arrow' | 'conn', string, string, string][] = [
    ['term', '시작 / 끝', '흐름이 어디서 시작하고 어디서 끝나는지 보여줘요. 끝은 여러 개일 수 있어요.', '끝마다 “그다음 사용자는 어디 있나”를 적어요. (예: 장바구니로)'],
    ['scr', '화면', '사용자가 보는 화면 하나예요. IA에서 붙인 화면 ID를 꼭 같이 적어요.', '주문서 · ORD-02'],
    ['dec', '판단 (갈림길)', '예/아니오로 답할 수 있는 질문 하나예요. 나가는 화살표는 2개 이상이고, 화살표마다 이름을 붙여요.', '잔액이 결제 금액 이상?'],
    ['sys', '시스템 처리', '사용자에게 안 보이는 서버 처리나 다른 회사 시스템과 주고받는 일(외부 연동)이에요. 실패하거나 오래 걸릴 때도 같이 생각해요.', '결제 승인 요청'],
    ['arrow', '흐름선', '다음 단계로 가는 방향이에요. 갈림길에서 나온 선에는 조건을 적어요.', '예 / 아니오 / 품절'],
    ['conn', '연결자', '그림이 길어져 다음 장으로 넘어갈 때, 같은 글자를 써서 이어요.', 'A → 다음 장의 A'],
  ]
  return (
    <div className="sys-table-wrap">
      <table className="sys-table fl-legend">
        <thead><tr><th style={{ width: 130 }}>기호</th><th style={{ width: '14%' }}>이름</th><th>뜻</th><th style={{ width: '30%' }}>이렇게 써요</th></tr></thead>
        <tbody>{rows.map(([t, name, mean, ex]) => <tr key={name}><td><S t={t} /></td><td><b>{name}</b></td><td>{mean}</td><td>{ex}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

/* ================= 탭 ================= */
export default function Tab() {
  return (
    <div data-plan="flow">
      <TermList keys={['IA', '유저 플로우', '플로우차트', '와이어프레임', '화면설계서', 'QA', '화면 ID', '깊이(단계)', '행복 경로', '분기', '시스템 처리', '바텀시트', '범례', 'CSV']}
        extra={{
          '화면 ID': '화면마다 붙이는 고유 번호예요. 아파트 동·호수처럼 ‘ORD-02’라고 하면 모두가 같은 화면을 떠올려요.',
          '깊이(단계)': '첫 메뉴에서 몇 번 들어가야 그 화면에 닿는지예요. 홈 → 가게 목록 → 가게 상세면 3단계예요.',
          '행복 경로': '사용자가 아무 문제 없이 목표까지 가는 가장 순탄한 길이에요. 로그인돼 있고, 품절도 없고, 결제도 한 번에 되는 경우예요.',
          '분기': '조건에 따라 길이 둘 이상으로 갈라지는 곳이에요. 갈림길이라고 생각하면 돼요.',
          '시스템 처리': '사용자 눈에는 안 보이지만 서버가 뒤에서 하는 일이에요. 예: 결제 승인 요청. 실패하거나 늦을 수 있어요.',
          '바텀시트': '화면 아래에서 위로 올라오는 패널이에요. 지금 화면을 떠나지 않고 내용을 더 보여줄 때 써요.',
          '범례': '그림에 쓴 기호가 무슨 뜻인지 모아 둔 설명표예요. 지도 귀퉁이의 기호 설명과 같아요.',
          'CSV': '쉼표로 칸을 나눈 표 파일이에요. 엑셀이나 구글 시트에서 바로 열 수 있어요.',
        }} />
      <SysGrid>
        <Section id="plan-flow-why" wide title="화면보다 먼저: 메뉴 지도(IA)와 이동 길(플로우)"
          gist="메뉴 구조와 갈림길을 먼저 정하면 화면을 덜 다시 그려요."
          desc={<>처음 가는 동네를 떠올려 보세요. <Term k="IA" />는 ‘무엇이 어디에 있나’를 보여주는 동네 지도예요. <Term k="유저 플로우" />는 집에서 가게까지 걸어가는 길이에요. <Term k="플로우차트" />는 “신호등이 빨간불이면?”처럼 길이 갈라지는 조건이에요.</>}>
          <div className="fl-why">
            <div>
              <b>주니어가 자주 하는 실수</b>
              <p><Term k="와이어프레임" />부터 그려요. 그러면 10장쯤 그렸을 때 막혀요. “쿠폰함은 마이에 있어요, 주문에 있어요?” 같은 질문에 답을 못 해요. 같은 화면 이름도 쿠폰함 / 내 쿠폰 / 쿠폰 목록처럼 제각각이 돼요.</p>
            </div>
            <div>
              <b>화면 ID가 왜 중요한가요</b>
              <p>IA에서 붙인 <Term k="화면 ID" d="화면마다 붙이는 고유 번호예요. 아파트 동·호수처럼 ‘ORD-02’라고 하면 모두가 같은 화면을 떠올려요." />는 화면설계서, QA 시나리오, 이벤트 로그까지 그대로 쓰여요. 한 번 정해 두면 개발자와 “ORD-02 버튼이요”처럼 짧게 말할 수 있어요.</p>
            </div>
            <div>
              <b>이 탭의 순서</b>
              <p>① IA 트리로 화면 목록과 ID를 정해요. ② 같은 상황을 유저 플로우와 플로우차트로 그려 봐요. ③ 도형 규칙을 팀과 맞춰요.</p>
            </div>
          </div>
        </Section>

        <Section id="plan-flow-ia" wide title="IA 트리 직접 고쳐 보기"
          gist="화면 ID는 한 번 정하면 바꾸지 않고, 메뉴는 3단계 안에 둬요."
          desc={<>오늘반찬의 구매자 앱, 사장님 센터, 운영 <Term k="어드민" /> 메뉴예요. 이름을 고쳐 보세요. 들여쓰기(⇥)·내어쓰기(⇤)로 단계를 바꾸면 화면 ID가 자동으로 다시 붙어요. 다 고치면 <Term k="CSV" d="쉼표로 칸을 나눈 표 파일이에요. 엑셀이나 구글 시트에서 바로 열 수 있어요." /> 파일로 내려받을 수 있어요.</>}>
          <IAEditor />
          <Note tone="tip"><b>화면 ID 규칙(예시):</b> 1단계 메뉴 코드(영문 대문자) 뒤에 단계마다 두 자리 번호를 붙여요. <code>ORD</code> → <code>ORD-02</code>(주문서) → <code>ORD-02-01</code>(결제). 팝업은 <code>ORD-02-P1</code>처럼 따로 붙여요.
            규칙은 팀마다 달라도 괜찮아요. 중요한 건 <b>한 번 정하면 바꾸지 않는 것</b>이에요. 화면을 지워도 뒤 번호를 당기지 말고 빈 번호로 남겨 두세요. 아파트에서 한 집이 비어도 옆집 호수를 바꾸지 않는 것과 같아요.
            화면설계서 쓰는 법은 <a href="#/plan/storyboard">03 화면설계서</a>에서 이어져요.</Note>
          <Note tone="warn"><b>4단계부터는 사용자가 길을 잃어요.</b> 홈 → 동네 가게 → 가게 상세 → 메뉴 상세처럼 <Term k="깊이(단계)" d="첫 메뉴에서 몇 번 들어가야 그 화면에 닿는지예요. 홈 → 가게 목록 → 가게 상세면 3단계예요." />가 깊어질 때가 그래요.
            이럴 땐 디자이너와 같이 방법을 찾아요. 메뉴 상세를 아래에서 올라오는 패널(<Term k="바텀시트" d="화면 아래에서 위로 올라오는 패널이에요. 지금 화면을 떠나지 않고 내용을 더 보여줄 때 써요." />)로 띄우거나, 가게 상세 안의 탭으로 펼칠 수 있어요.
            “몇 단계가 정답”이라는 숫자보다 “사용자가 지금 어디 있는지 알 수 있나”가 기준이에요. 길 찾기 패턴은 <a href="#/layout/layout-breadcrumb">브레드크럼</a>, <a href="#/layout/layout-tabbar">탭바</a> 카드를 보세요.</Note>
        </Section>

        <Section id="plan-flow-chart" wide title="같은 결제를 두 가지로 그려 보기: 유저 플로우 vs 플로우차트"
          gist="유저 플로우는 화면 순서를, 플로우차트는 “만약 ~라면?”을 보여줘요."
          desc={<>같은 ‘첫 주문 결제’를 두 가지로 그렸어요. 유저 플로우는 화면 순서를 보여줘요. 플로우차트는 조건에 따라 길이 갈라지는 곳(<Term k="분기" d="조건에 따라 길이 둘 이상으로 갈라지는 곳이에요. 갈림길이라고 생각하면 돼요." />)을 보여줘요. 마름모를 눌러 다른 길로 가 보세요. ‘<Term k="행복 경로" d="사용자가 아무 문제 없이 목표까지 가는 가장 순탄한 길이에요. 로그인돼 있고, 품절도 없고, 결제도 한 번에 되는 경우예요." />’ 버튼은 모든 질문에 ‘예’인 길이에요.</>}>
          <FlowLab />
        </Section>

        <Section id="plan-flow-compare" title="유저 플로우와 플로우차트, 언제 무엇을 그리나요"
          gist="구조를 잡는 초반엔 유저 플로우, 규칙을 정할 땐 플로우차트를 그려요."
          desc="둘 다 그려요. 다만 읽는 사람과 목적이 달라요.">
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead><tr><th style={{ width: '22%' }} /><th>유저 플로우</th><th>플로우차트</th></tr></thead>
              <tbody>
                <tr><td><b>상자 하나가 뜻하는 것</b></td><td>화면</td><td>판단 · 처리 · 화면</td></tr>
                <tr><td><b>보여주는 것</b></td><td>모든 게 잘 풀리는 길(행복 경로)의 순서와 화면 수</td><td>조건에 따라 갈라지는 모든 길과 그 끝</td></tr>
                <tr><td><b>주로 읽는 사람</b></td><td>디자이너, 관련 부서 사람들</td><td>개발자, QA</td></tr>
                <tr><td><b>언제</b></td><td>구조를 잡는 초반</td><td>규칙을 확정하는 상세 설계 때</td></tr>
                <tr><td><b>다음에 만들 문서</b></td><td>와이어프레임</td><td>예외 정책, 테스트 시나리오</td></tr>
              </tbody>
            </table>
          </div>
          <Note>플로우차트의 마름모 하나는 보통 <b>테스트 시나리오 2개 이상</b>이 돼요(예일 때, 아니오일 때). 마름모 수를 세면 <Term k="QA" />가 확인할 양을 미리 짐작할 수 있어요.</Note>
        </Section>

        <Section id="plan-flow-legend" title="플로우차트 도형, 무슨 뜻일까요"
          gist="마름모는 질문, 네모는 화면, 둥근 상자는 시작과 끝이에요."
          desc={<>기호 뜻이 사람마다 다르면 그림이 오히려 헷갈려요. 그래서 문서 첫 장에 기호 설명표(<Term k="범례" d="그림에 쓴 기호가 무슨 뜻인지 모아 둔 설명표예요. 지도 귀퉁이의 기호 설명과 같아요." />)를 붙여요.</>}>
          <Legend />
        </Section>

        <Section id="plan-flow-gb" wide title="좋은 예 vs 나쁜 예"
          gist="메뉴 이름은 사용자 말로, 마름모는 질문으로, 모든 길에는 끝을 둬요."
          desc="리뷰에서 가장 자주 돌려보내는 세 가지예요.">
          <GoodBad pairs={[
            {
              topic: 'IA 메뉴 이름',
              bad: <>1단계: <i>주문하기 · 주문 관련 · 기타</i>. ‘기타’ 안에 쿠폰함·공지·설정이 섞여 있어요.</>,
              good: <>1단계: <i>홈 · 검색 · 주문 · 마이</i>. 쿠폰함은 <code>MY-03</code>, 공지는 <code>MY-04</code>. 모든 화면이 한 곳에만 있어요.</>,
              why: '“기타”와 “관련”은 분류를 미룬 거예요. 사용자가 쓰는 말로 된 이름인지 봐요. 한 화면이 두 곳에 들어가 있지 않은지도 봐요.',
            },
            {
              topic: '판단 기호(마름모)',
              bad: <>마름모 안에 <i>“결제”</i>라고만 적혀 있어요. 나가는 선도 하나뿐이에요.</>,
              good: <>마름모 안에 <i>“반찬머니 잔액이 결제 금액 이상?”</i>이라는 질문이 있어요. 나가는 선은 <b>예 → 승인</b>, <b>아니오 → 충전 팝업</b> 두 개예요.</>,
              why: '마름모 안은 예/아니오로 답할 수 있는 질문이어야 해요. 그리고 모든 답에 갈 곳이 있어야 해요.',
            },
            {
              topic: '흐름의 끝',
              bad: <>품절이면 <i>“품절 알림”</i>에서 선이 끊겨요. 그다음 사용자가 어디 있는지 몰라요.</>,
              good: <>품절 안내 → <b>끝: 품절 반찬을 뺀 장바구니로</b>. 결제 실패 → <b>끝: 주문서로(입력값 유지)</b>.</>,
              why: '모든 길은 끝이나 다른 흐름으로 이어져야 해요. 선이 끊겨 있으면 그다음은 개발자가 마음대로 정하게 돼요.',
            },
          ]} />
        </Section>

        <Section id="plan-flow-check" title="사수의 체크리스트"
          gist="모든 화면에 ID와 권한이, 모든 길에 끝이 있는지 봐요."
          desc="IA와 플로우를 리뷰할 때 제가 실제로 묻는 질문이에요.">
          <CheckList id="fl-ck" items={[
            '모든 화면에 ID가 있고, 화면설계서·QA 문서와 같은 ID를 쓰나요?',
            '한 화면이 IA의 두 곳에 들어가 있지 않나요?',
            '각 화면에 누가 들어갈 수 있는지(비회원/회원/사장님/관리자) 적었나요?',
            '4단계 이상 깊은 화면이 있다면, 더 얕게 만들 방법을 디자이너와 이야기했나요?',
            '마름모가 모두 예/아니오로 답할 수 있는 질문이고, 나가는 선에 이름이 있나요?',
            '모든 길이 "끝"에 닿고, 끝마다 사용자가 어디 있는지 적었나요?',
            '로그인·결제처럼 중간에 다른 화면에 다녀오면, 돌아올 자리를 정했나요?',
            '서버나 외부 연동(시스템 처리)이 실패하거나 늦을 때의 길도 그렸나요?',
          ]} />
        </Section>

        <Section id="plan-flow-ref" title="참고" gist="IA와 순서도를 더 깊이 볼 때 읽을 책과 표준이에요." desc="더 깊게 보고 싶을 때요.">
          <ul className="fl-ref">
            <li>Louis Rosenfeld · Peter Morville 외, 『Information Architecture』 — IA를 이루는 네 가지: 분류하기, 이름 붙이기, 메뉴 이동, 검색</li>
            <li>Jesse James Garrett, 『The Elements of User Experience』 — UX를 전략부터 겉모습까지 5개 층으로 나눠 봐요. IA와 인터랙션 설계가 어디쯤에 있는지 알 수 있어요.</li>
            <li>ISO 5807 — 순서도 기호 표준(시작/끝, 처리, 판단, 연결자). 화면 기호는 표준이 아니라 팀끼리 정한 약속이에요.</li>
            <li>Atlassian Agile Coach — 유저 스토리와 플로우를 작업 단위로 나누는 법</li>
            <li>이 도감: <a href="#/layout/layout-breadcrumb">브레드크럼</a> · <a href="#/layout/layout-back">뒤로 가기</a> · <a href="#/plan/storyboard">화면설계서</a> · <a href="#/plan/policy">정책 · 예외</a></li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
