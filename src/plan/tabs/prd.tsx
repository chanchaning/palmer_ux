import { useMemo, useState, type ReactNode } from 'react'
import { Seg } from '../../components/ui'
import { download } from '../../system/export'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { Term, TermList } from '../../components/Term'
import './prd.css'

/* =================================================================
 * 공통 — 측정할 수 없는 단어 사전
 * ================================================================= */
const VAGUE: [RegExp, string, string][] = [
  [/빠르게|신속하게|신속히|빨리/g, '빠르게', '“1초 안에”, “3초 안에 첫 화면”처럼 시간으로 바꿔요.'],
  [/쉽게|간편하게|손쉽게|편하게|편리하게/g, '쉽게', '“3번 탭 안에”, “2단계 안에”처럼 횟수나 단계로 바꿔요.'],
  [/적절히|적절한|적당히|적당한/g, '적절히', '기준을 숫자로 바꿔요. (예: 20개씩, 6개월)'],
  [/충분히|충분한/g, '충분히', '“최소 N개”, “N초 이상”처럼 가장 작은 값을 적어요.'],
  [/원활하게|원활한|매끄럽게|자연스럽게/g, '원활하게', '실패하거나 오류가 나면 어떻게 되는지를 적어요.'],
  [/직관적|사용자\s?친화적/g, '직관적', '“처음 쓰는 사람이 도움 없이 끝까지 한다”처럼 눈으로 확인할 수 있는 행동으로 바꿔요.'],
  [/다양한|많은|여러\s?가지/g, '다양한', '“N개 이상”이라고 쓰거나 목록을 다 적어요.'],
  [/최대한|가급적|가능한\s?한|되도록/g, '최대한', '“반드시 한다” 또는 “하지 않는다” 중 하나로 정해요.'],
  [/개선|향상|최적화|강화/g, '개선', '무엇이 얼마에서 얼마로 바뀌는지(A → B) 적어요.'],
  [/\s등(?=[\s.,)]|$)/g, '등', '“등”을 지우고 목록을 끝까지 적어요.'],
]
type Hit = { word: string; tip: string }
function findVague(text: string): Hit[] {
  const out: Hit[] = []
  for (const [re, , tip] of VAGUE) {
    re.lastIndex = 0
    const m = text.match(re)
    if (m) for (const w of new Set(m.map(x => x.trim()))) out.push({ word: w, tip })
  }
  return out
}
/** 모호어에 <mark> */
function Marked({ text }: { text: string }) {
  const all = new RegExp(VAGUE.map(([re]) => re.source).join('|'), 'g')
  const parts: ReactNode[] = []
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = all.exec(text))) {
    if (!m[0]) { all.lastIndex++; continue }
    parts.push(text.slice(last, m.index), <mark key={i++}>{m[0]}</mark>)
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}
const hasBatchim = (s: string) => {
  const c = s.trim().slice(-1).charCodeAt(0)
  return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0
}
const ro = (s: string) => { const b = hasBatchim(s); return b && b !== 8 ? '으로서' : '로서' }
const eul = (s: string) => (hasBatchim(s) ? '을' : '를')
const lines = (s: string) => s.split('\n').map(x => x.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean)
const today = () => new Date().toISOString().slice(0, 10)

/* =================================================================
 * 1) 문제 정의 — 좋은 예 vs 해결책부터
 * ================================================================= */
const PROBLEMS: { bad: string; good: string; why: string }[] = [
  {
    bad: '주문 내역에 재주문 버튼을 추가하자.',
    good: '재주문하려는 구매자가 지난 메뉴를 다시 찾는 데 평균 6번 탭이 필요하고, 그 사이에 주문을 그만둔다.',
    why: '해결책부터 말하면 다른 답과 비교할 기회가 사라져요. 홈의 ‘최근 주문’ 카드나 메뉴 즐겨찾기도 답이 될 수 있거든요. 문제를 먼저 말하면 버튼은 여러 답 중 하나가 돼요.',
  },
  {
    bad: '주문 경험을 개선한다.',
    good: '재주문까지 탭 수를 평균 6번에서 3번 이하로 줄인다. 출시 4주 뒤 퍼널 로그로 확인한다.',
    why: '‘개선’은 언제 끝났는지 알 수 없어요. 지금 값, 목표 값, 확인할 날짜가 있어야 해요. 그래야 리뷰에서 “됐다 / 안 됐다”로 말할 수 있어요.',
  },
  {
    bad: '다른 반찬 앱에 정기 배송이 있으니 우리도 만들자.',
    good: '주문 로그를 보니 같은 요일마다 같은 반찬을 시키는 구매자가 있다. 이들이 매번 직접 주문하는 수고를 줄일 방법이 필요하다.',
    why: '경쟁사에 있다는 건 근거가 아니라 참고예요. 우리 사용자도 같은 문제를 겪는지 먼저 확인해요.',
  },
]

function ProblemCompare() {
  const [mode, setMode] = useState<'bad' | 'good'>('bad')
  return (
    <div className="pr-gb">
      <Seg value={mode} onChange={setMode} options={[['bad', '✕ 해결책부터 말하기'], ['good', '○ 문제와 목표로 말하기']] as const} />
      <ol className="pr-gb-list">
        {PROBLEMS.map((p, i) => (
          <li key={i} className={'is-' + mode}>
            <p className="pr-quote">“{mode === 'bad' ? p.bad : p.good}”</p>
            {mode === 'good' && <p className="pr-why">{p.why}</p>}
          </li>
        ))}
      </ol>
      <Note tone="tip">
        <b>문제 문장 공식:</b> [누가] [어떤 상황에서] [무엇 때문에] [어떤 손해를 본다]. 문장에 버튼·화면·기능 이름이 있으면, 문제가 아니라 해결책을 말하고 있는 거예요.
      </Note>
    </div>
  )
}

/* =================================================================
 * 2) PRD 빌더
 * ================================================================= */
interface Metric { name: string; now: string; target: string; how: string }
interface Prd {
  title: string; owner: string; status: string
  background: string; problem: string; goal: string; users: string
  metrics: Metric[]
  scopeIn: string; scopeOut: string; assumptions: string; risks: string; issues: string; schedule: string
}
const EXAMPLE: Prd = {
  title: '최근 주문에서 다시 담기 (재주문)',
  owner: 'Palmer',
  status: '리뷰 중',
  background: '오늘반찬은 같은 가게에서 반복해서 주문하는 단골 구매자가 많아요. 그런데 재주문하려면 홈 → 가게 검색 → 메뉴를 하나씩 다시 담아야 해요. 고객센터 문의와 구매자 인터뷰에서 “지난번 그 메뉴 다시 찾기 귀찮다”는 말이 반복해서 나왔어요.',
  problem: '재주문하려는 구매자가 지난 주문 메뉴를 다시 찾는 데 평균 6번 탭이 필요하고, 그 과정에서 주문을 그만둔다.',
  goal: '출시 4주 안에 재주문까지 필요한 탭 수를 평균 6번에서 3번 이하로 줄이고, 재주문 비율을 18%에서 22%로 올린다.',
  users: '최근 6개월 안에 같은 가게에서 2번 이상 주문한 구매자 (사장님·운영자 화면은 이번에 바꾸지 않음)',
  metrics: [
    { name: '재주문까지 탭 수 (핵심)', now: '평균 6번', target: '3번 이하', how: '퍼널: order_history_view → reorder_button_click → checkout_complete' },
    { name: '30일 내 같은 가게 재주문 비율', now: '18%', target: '22%', how: '주간 대시보드, 출시 전 4주와 비교' },
    { name: '주문 취소율 (가드레일)', now: '3.0%', target: '3.0% 이하 유지', how: '다시 담기로 들어온 주문만 따로 세기' },
  ],
  scopeIn: '- 주문 내역(ORD-02-01) 카드에 ‘다시 담기’ 버튼\n- 지난 주문의 메뉴·옵션·수량을 장바구니에 한 번에 담기\n- 품절·판매 중지 메뉴가 있을 때 안내',
  scopeOut: '- 정기 배송(구독) — 다음 분기에 따로 검토\n- 여러 가게 주문을 합쳐 담기\n- 사장님 앱 변경',
  assumptions: '- 재주문하는 구매자는 지난번과 같은 메뉴·옵션을 원한다 (인터뷰 근거, 출시 후 장바구니 수정률로 확인)\n- 주문 내역 API에 옵션 정보가 남아 있다 (개발 리드 확인 필요)',
  risks: '- 지난 주문 뒤 가격이 바뀌면 결제 금액이 달라 혼란 → 장바구니에서 “가격이 바뀌었어요” 안내\n- 품절 메뉴가 많으면 다시 담기가 오히려 실망을 줌 → 품절 비율 모니터링',
  issues: '- 품절 메뉴는 빼고 담을지, 담지 않고 안내만 할지 — 기획·디자인, 11/14까지\n- 6개월보다 오래된 주문도 보여줄지 — 데이터팀, 11/18까지',
  schedule: '- 11/11 PRD 리뷰\n- 11/18 화면설계서 v1.0\n- 11/25 개발 착수\n- 12/16 QA 시작\n- 12/23 출시',
}
const EMPTY: Prd = {
  title: '', owner: '', status: '초안', background: '', problem: '', goal: '', users: '',
  metrics: [{ name: '', now: '', target: '', how: '' }],
  scopeIn: '', scopeOut: '', assumptions: '', risks: '', issues: '', schedule: '',
}
type TextKey = Exclude<keyof Prd, 'metrics'>
const FIELDS: { k: TextKey; label: string; hint: string; rows?: number }[] = [
  { k: 'background', label: '배경', hint: '왜 지금 이 이야기를 하나요? 근거(고객 문의, 인터뷰, 사용 기록)를 적어요.', rows: 3 },
  { k: 'problem', label: '문제 정의', hint: '[누가] [어떤 상황에서] [무엇 때문에] [어떤 손해를 보나]. 해결책은 쓰지 않아요.', rows: 2 },
  { k: 'goal', label: '목표', hint: '지금 값 → 목표 값, 그리고 언제까지.', rows: 2 },
  { k: 'users', label: '대상 사용자', hint: '누구를 위한 것인지, 누구는 아닌지 적어요.', rows: 2 },
  { k: 'scopeIn', label: '이번에 하는 것 (Scope In)', hint: '한 줄에 하나씩 적어요.', rows: 3 },
  { k: 'scopeOut', label: '이번에 하지 않는 것 (Scope Out)', hint: '회의에서 나온 “이것도 하면 좋겠다”를 여기에 적어요.', rows: 3 },
  { k: 'assumptions', label: '가정', hint: '맞다고 믿지만 아직 확인 안 한 것이에요. 어떻게 확인할지도 적어요.', rows: 2 },
  { k: 'risks', label: '리스크', hint: '잘못될 수 있는 일 → 그때 할 대응.', rows: 2 },
  { k: 'issues', label: '오픈 이슈', hint: '아직 정하지 못한 것이에요. 누가, 언제까지 정할지 적어요.', rows: 2 },
  { k: 'schedule', label: '일정', hint: '날짜와 중요한 단계(마일스톤)를 한 줄에 하나씩 적어요.', rows: 3 },
]

type Lint = { level: 'err' | 'warn' | 'info'; field: string; msg: ReactNode }
const hasNum = (s: string) => /\d/.test(s)
const hasDate = (s: string) => /\d{1,2}\s*[/.월]\s*\d{1,2}|\d{4}-\d{2}|\d+\s*(주|일|개월)|까지/.test(s)

function lintPrd(p: Prd): Lint[] {
  const L: Lint[] = []
  if (!p.title.trim()) L.push({ level: 'err', field: 'title', msg: '제목이 비어 있어요.' })
  for (const f of FIELDS) if (!p[f.k].trim()) L.push({ level: f.k === 'risks' || f.k === 'assumptions' ? 'warn' : 'err', field: f.k, msg: <><b>{f.label}</b> 칸이 비어 있어요.</> })
  if (/(추가|도입|만들|개발|구현|넣|붙이)/.test(p.problem)) L.push({ level: 'warn', field: 'problem', msg: <>문제 정의에 해결책을 뜻하는 말(추가·도입·만들기)이 있어요. 해결책 대신 사용자가 겪는 손해를 적어요.</> })
  if (p.goal.trim() && !hasNum(p.goal)) L.push({ level: 'err', field: 'goal', msg: <>목표에 숫자가 없어요. “A에서 B로, 언제까지”로 써요.</> })
  if (p.goal.trim() && hasNum(p.goal) && !hasDate(p.goal)) L.push({ level: 'info', field: 'goal', msg: <>목표에 기한이 없어요. 언제 확인할지 적어요.</> })
  for (const k of ['problem', 'goal', 'users', 'scopeIn'] as const)
    for (const h of findVague(p[k])) L.push({ level: 'warn', field: k, msg: <><b>{FIELDS.find(f => f.k === k)!.label}</b>의 “{h.word}”는 잴 수 없는 말이에요 → {h.tip}</> })
  const filled = p.metrics.filter(m => m.name.trim())
  if (!filled.length) L.push({ level: 'err', field: 'metrics', msg: '핵심 지표가 하나도 없어요.' })
  p.metrics.forEach((m, i) => {
    if (!m.name.trim()) return
    if (!hasNum(m.target)) L.push({ level: 'err', field: 'metrics', msg: <>지표 {i + 1} “{m.name}”의 목표값에 숫자가 없어요.</> })
    if (!m.now.trim()) L.push({ level: 'warn', field: 'metrics', msg: <>지표 {i + 1}의 현재값이 비었어요. 시작 값을 모르면 얼마나 좋아졌는지 알 수 없어요. 아직 모르면 “출시 전 측정”이라고 적어요.</> })
    if (!m.how.trim()) L.push({ level: 'warn', field: 'metrics', msg: <>지표 {i + 1}의 측정 방법이 비었어요. 어떤 기록이나 대시보드로 볼지 적어요.</> })
  })
  if (filled.length && !p.metrics.some(m => /가드레일|유지|이하로 유지/.test(m.name + m.target))) L.push({ level: 'info', field: 'metrics', msg: '가드레일 지표를 하나 두면 좋아요. 나빠지면 안 되는 숫자예요(예: 취소율).' })
  lines(p.issues).forEach(l => { if (!hasDate(l)) L.push({ level: 'warn', field: 'issues', msg: <>오픈 이슈 “{l.slice(0, 18)}…”에 기한이 없어요.</> }) })
  lines(p.schedule).forEach(l => { if (!hasDate(l)) L.push({ level: 'warn', field: 'schedule', msg: <>일정 “{l.slice(0, 18)}”에 날짜가 없어요.</> }) })
  return L
}

function prdMd(p: Prd) {
  const li = (s: string) => (lines(s).length ? lines(s).map(x => `- ${x}`).join('\n') : '- (작성)')
  const t = (s: string) => s.trim() || '(작성)'
  return `# [PRD] ${t(p.title)}

| 작성자 | 상태 | 최종 수정 |
| --- | --- | --- |
| ${t(p.owner)} | ${t(p.status)} | ${today()} |

## 1. 배경
${t(p.background)}

## 2. 문제 정의
> ${t(p.problem)}

## 3. 목표
${t(p.goal)}

## 4. 대상 사용자
${t(p.users)}

## 5. 성공 지표
| 지표 | 현재 | 목표 | 측정 방법 |
| --- | --- | --- | --- |
${p.metrics.map(m => `| ${m.name || ' '} | ${m.now || ' '} | ${m.target || ' '} | ${m.how || ' '} |`).join('\n')}

## 6. 범위
### 이번에 하는 것 (Scope In)
${li(p.scopeIn)}

### 이번에 하지 않는 것 (Scope Out)
${li(p.scopeOut)}

## 7. 가정과 리스크
### 가정 (확인 방법)
${li(p.assumptions)}

### 리스크 → 대응
${li(p.risks)}

## 8. 오픈 이슈
${lines(p.issues).length ? lines(p.issues).map(x => `- [ ] ${x}`).join('\n') : '- [ ] (작성) — 담당, 기한'}

## 9. 일정
${li(p.schedule)}

## 10. 관련 문서
- 화면설계서: (링크)
- 디자인: (링크)
- 이벤트 정의: (링크)

## 변경 이력
| 버전 | 날짜 | 변경 내용 | 작성자 |
| --- | --- | --- | --- |
| v0.1 | ${today()} | 초안 작성 | ${t(p.owner)} |
`
}

function PrdBuilder() {
  const [p, setP] = useState<Prd>(EXAMPLE)
  const set = <K extends keyof Prd>(k: K, v: Prd[K]) => setP(o => ({ ...o, [k]: v }))
  const lint = useMemo(() => lintPrd(p), [p])
  const md = useMemo(() => prdMd(p), [p])
  const errN = lint.filter(l => l.level === 'err').length
  const warnN = lint.filter(l => l.level === 'warn').length
  const byField = (k: string) => lint.filter(l => l.field === k)
  const focus = (k: string) => { const el = document.getElementById('prd-f-' + k); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus({ preventScroll: true }) }
  const setMetric = (i: number, k: keyof Metric, v: string) => set('metrics', p.metrics.map((m, j) => (j === i ? { ...m, [k]: v } : m)))
  const fieldCls = (k: string) => 'pr-field' + (byField(k).some(l => l.level === 'err') ? ' is-err' : byField(k).some(l => l.level === 'warn') ? ' is-warn' : '')

  return (
    <div className="pr-builder">
      <div className="pr-form">
        <div className="pr-form-bar">
          <button type="button" className="btn ghost sm" data-act="prd-example" onClick={() => setP(EXAMPLE)}>예시로 채우기</button>
          <button type="button" className="btn ghost sm" data-act="prd-clear" onClick={() => setP(EMPTY)}>모두 비우기</button>
        </div>
        <div className="pr-row3">
          <label className={fieldCls('title')}><span>제목</span><input id="prd-f-title" className="pr-input" value={p.title} placeholder="예: 최근 주문에서 다시 담기" onChange={e => set('title', e.target.value)} /></label>
          <label className="pr-field"><span>작성자</span><input className="pr-input" value={p.owner} onChange={e => set('owner', e.target.value)} /></label>
          <label className="pr-field"><span>상태</span>
            <select className="pr-input" value={p.status} onChange={e => set('status', e.target.value)}>
              {['초안', '리뷰 중', '확정', '보류'].map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
        {FIELDS.slice(0, 4).map(f => (
          <label key={f.k} className={fieldCls(f.k)}>
            <span>{f.label}</span>
            <textarea id={'prd-f-' + f.k} data-field={f.k} className="pr-input" rows={f.rows} value={p[f.k]} placeholder={f.hint} onChange={e => set(f.k, e.target.value)} />
            <small>{f.hint}</small>
          </label>
        ))}
        <div className={fieldCls('metrics')}>
          <span>핵심 지표 (성공 기준)</span>
          <div className="pr-metrics" id="prd-f-metrics" tabIndex={-1}>
            <div className="pr-m-head" aria-hidden="true"><span>지표</span><span>현재</span><span>목표</span><span>측정 방법</span><span /></div>
            {p.metrics.map((m, i) => (
              <div key={i} className="pr-m-row">
                <input className="pr-input" aria-label={`지표 ${i + 1} 이름`} value={m.name} placeholder="지표 이름" onChange={e => setMetric(i, 'name', e.target.value)} />
                <input className="pr-input" aria-label={`지표 ${i + 1} 현재값`} value={m.now} placeholder="현재" onChange={e => setMetric(i, 'now', e.target.value)} />
                <input className="pr-input" aria-label={`지표 ${i + 1} 목표값`} data-metric-target={i} value={m.target} placeholder="목표" onChange={e => setMetric(i, 'target', e.target.value)} />
                <input className="pr-input" aria-label={`지표 ${i + 1} 측정 방법`} value={m.how} placeholder="어떤 기록으로" onChange={e => setMetric(i, 'how', e.target.value)} />
                <button type="button" className="pr-x" aria-label={`지표 ${i + 1} 삭제`} disabled={p.metrics.length < 2} onClick={() => set('metrics', p.metrics.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button type="button" className="btn ghost sm pr-add" onClick={() => set('metrics', [...p.metrics, { name: '', now: '', target: '', how: '' }])}>+ 지표 추가</button>
          </div>
          <small>핵심 지표 1개, 보조 지표, 가드레일(나빠지면 안 되는 숫자)로 나눠요.</small>
        </div>
        <div className="pr-row2">
          {FIELDS.slice(4).map(f => (
            <label key={f.k} className={fieldCls(f.k)}>
              <span>{f.label}</span>
              <textarea id={'prd-f-' + f.k} data-field={f.k} className="pr-input" rows={f.rows} value={p[f.k]} placeholder={f.hint} onChange={e => set(f.k, e.target.value)} />
              <small>{f.hint}</small>
            </label>
          ))}
        </div>
      </div>

      <aside className="pr-side">
        <div className={'pr-score' + (errN ? ' is-err' : warnN ? ' is-warn' : ' is-ok')} data-lint-count={lint.length}>
          <b>{errN ? '리뷰 전에 채워야 해요' : warnN ? '거의 다 왔어요' : '리뷰에 올릴 수 있어요'}</b>
          <span>필수 {errN} · 경고 {warnN} · 제안 {lint.length - errN - warnN}</span>
        </div>
        <ul className="pr-lint" aria-live="polite">
          {lint.length === 0 && <li className="ok">빈칸도, 잴 수 없는 표현도 없어요.</li>}
          {lint.map((l, i) => (
            <li key={i} className={l.level}>
              <button type="button" onClick={() => focus(l.field)}><i aria-hidden="true">{l.level === 'err' ? '!' : l.level === 'warn' ? '△' : 'i'}</i><span>{l.msg}</span></button>
            </li>
          ))}
        </ul>
        <CodeBlock code={md} label="PRD.md" maxHeight={340} />
        <div className="pr-actions">
          <button type="button" className="btn sm" data-act="prd-download" onClick={() => download(`PRD-${(p.title || '제목없음').replace(/[\\/:*?"<>|\s]+/g, '_')}.md`, md, 'text/markdown')}>.md 다운로드</button>
          <span className="muted">경고를 누르면 그 칸으로 이동해요.</span>
        </div>
      </aside>
    </div>
  )
}

/* =================================================================
 * 3) 유저 스토리 + 인수 조건
 * ================================================================= */
interface Gwt { g: string; w: string; t: string }
const STORY_EX = {
  who: '구매자', why: '재구매를 쉽게 하기', what: '최근 주문 내역 조회',
  list: [
    '최근 6개월 안의 주문만 최신순으로 보여준다.',
    '한 번에 20개씩 불러오고, 목록 끝에 닿으면 다음 20개를 불러온다.',
    '취소된 주문은 회색으로 표시하고 ‘다시 담기’ 버튼을 보여주지 않는다.',
    '6개월 안의 주문이 0건이면 빈 화면(EMP-01)을 보여준다.',
    '목록은 적절히 빠르게 불러온다.',
  ],
  gwt: [
    { g: '최근 6개월 안에 주문 3건(그중 1건 취소)이 있는 구매자가', w: '마이 > 주문 내역에 들어가면', t: '3건이 최신순으로 보이고, 취소된 1건은 회색이며 ‘다시 담기’ 버튼이 없다.' },
    { g: '6개월 안의 주문이 0건인 구매자가', w: '주문 내역에 들어가면', t: '빈 화면 EMP-01과 ‘반찬 둘러보기’ 버튼이 보인다.' },
    { g: '주문 내역 화면에서', w: '‘다시 담기’를 누르면', t: '편하게 장바구니로 이동한다.' },
  ] as Gwt[],
}

function StoryWriter() {
  const [who, setWho] = useState(STORY_EX.who)
  const [why, setWhy] = useState(STORY_EX.why)
  const [what, setWhat] = useState(STORY_EX.what)
  const [mode, setMode] = useState<'list' | 'gwt'>('list')
  const [list, setList] = useState<string[]>(STORY_EX.list)
  const [gwt, setGwt] = useState<Gwt[]>(STORY_EX.gwt)

  const story = `${who || '[누구]'}${who ? ro(who) : '로서'}, ${why || '[목적]'} 위해 ${what || '[기능]'}${what ? eul(what) : '을'} 원한다.`
  const acTexts = mode === 'list' ? list : gwt.map(x => `${x.g} ${x.w} ${x.t}`)

  const lint = useMemo(() => {
    const L: Lint[] = []
    if (!who.trim()) L.push({ level: 'err', field: 'who', msg: '‘누구’ 칸이 비어 있어요. ‘사용자’보다 역할(구매자·사장님·운영자)로 써요.' })
    else if (/^(사용자|유저|고객|회원)$/.test(who.trim())) L.push({ level: 'warn', field: 'who', msg: `“${who}”는 너무 넓어요. 오늘반찬이라면 구매자, 사장님, 운영자 중 누구인가요?` })
    if (!why.trim()) L.push({ level: 'err', field: 'why', msg: '목적이 비어 있어요. 목적을 알아야 더 나은 해결책을 고를 수 있어요.' })
    if (!what.trim()) L.push({ level: 'err', field: 'what', msg: '원하는 기능이 비어 있어요.' })
    for (const h of findVague(why)) L.push({ level: 'info', field: 'why', msg: <>목적의 “{h.word}”는 하고 싶은 이유라서 괜찮아요. 대신 아래 인수 조건에서는 숫자로 바꿔야 해요.</> })
    for (const h of findVague(what)) L.push({ level: 'warn', field: 'what', msg: <>기능의 “{h.word}” → {h.tip}</> })
    if (/(및|그리고|와\s|과\s)/.test(what)) L.push({ level: 'info', field: 'what', msg: '기능에 ‘및·그리고’가 있어요. 스토리 하나에 기능 하나만 담도록 나눌 수 있는지 봐요.' })
    const n = acTexts.filter(s => s.trim()).length
    if (n === 0) L.push({ level: 'err', field: 'ac', msg: '인수 조건이 없어요. 언제 ‘완료’인지 아무도 몰라요.' })
    else if (n < 3) L.push({ level: 'info', field: 'ac', msg: '인수 조건이 적어요. 0건, 실패, 권한 없음 같은 예외도 넣었나요?' })
    if (n > 8) L.push({ level: 'info', field: 'ac', msg: '인수 조건이 8개를 넘으면 스토리를 나눌 때가 됐다는 신호예요.' })
    acTexts.forEach((s, i) => findVague(s).forEach(h => L.push({ level: 'warn', field: 'ac', msg: <>AC {i + 1}의 “{h.word}” → {h.tip}</> })))
    if (mode === 'gwt') gwt.forEach((x, i) => { if (!x.g.trim() || !x.w.trim() || !x.t.trim()) L.push({ level: 'err', field: 'ac', msg: `시나리오 ${i + 1}에 Given/When/Then 중 빈 칸이 있어요.` }) })
    return L
  }, [who, why, what, acTexts, mode, gwt])

  const md = useMemo(() => {
    const head = `## [스토리] ${what || '(기능)'}\n\n> ${story}\n\n- 에픽: 재주문 경험 개선\n- 화면: ORD-02-01 주문 내역\n- 우선순위: Must\n\n### 인수 조건 (Acceptance Criteria)\n`
    const body = mode === 'list'
      ? list.filter(s => s.trim()).map(s => `- [ ] ${s}`).join('\n')
      : gwt.map((x, i) => `**시나리오 ${i + 1}**\n- Given ${x.g}\n- When ${x.w}\n- Then ${x.t}`).join('\n\n')
    return head + body + '\n\n### 참고\n- 디자인: (링크)\n- 관련 정책: (링크)\n'
  }, [story, what, mode, list, gwt])

  const vagueN = lint.filter(l => l.field === 'ac' && l.level === 'warn').length

  return (
    <div className="pr-story">
      <div className="pr-story-form">
        <div className="pr-story-inputs">
          <label className="pr-field"><span>누구 (역할)</span><input className="pr-input" data-story="who" value={who} onChange={e => setWho(e.target.value)} placeholder="구매자" /></label>
          <label className="pr-field"><span>목적 (~하기)</span><input className="pr-input" data-story="why" value={why} onChange={e => setWhy(e.target.value)} placeholder="재구매를 쉽게 하기" /></label>
          <label className="pr-field"><span>기능</span><input className="pr-input" data-story="what" value={what} onChange={e => setWhat(e.target.value)} placeholder="최근 주문 내역 조회" /></label>
        </div>
        <div className="pr-ac-head">
          <b>인수 조건 (AC)</b>
          <Seg value={mode} onChange={setMode} options={[['list', '체크리스트'], ['gwt', 'Given / When / Then']] as const} />
        </div>
        {mode === 'list' ? (
          <ol className="pr-ac-list">
            {list.map((s, i) => (
              <li key={i}>
                <input className="pr-input" data-ac={i} aria-label={`AC ${i + 1}`} value={s} onChange={e => setList(l => l.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" className="pr-x" aria-label={`AC ${i + 1} 삭제`} onClick={() => setList(l => l.filter((_, j) => j !== i))}>×</button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="pr-gwt-list">
            {gwt.map((x, i) => (
              <div key={i} className="pr-gwt">
                <div className="pr-gwt-top"><b>시나리오 {i + 1}</b><button type="button" className="pr-x" aria-label={`시나리오 ${i + 1} 삭제`} onClick={() => setGwt(l => l.filter((_, j) => j !== i))}>×</button></div>
                {(['g', 'w', 't'] as const).map(k => (
                  <label key={k}><span>{k === 'g' ? 'Given' : k === 'w' ? 'When' : 'Then'}</span>
                    <input className="pr-input" value={x[k]} data-gwt={`${i}-${k}`} onChange={e => setGwt(l => l.map((y, j) => (j === i ? { ...y, [k]: e.target.value } : y)))}
                      placeholder={k === 'g' ? '어떤 상황의 누가 (전제)' : k === 'w' ? '무엇을 하면 (행동)' : '무엇이 보인다 (결과)'} />
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="pr-ac-actions">
          <button type="button" className="btn ghost sm" onClick={() => (mode === 'list' ? setList(l => [...l, '']) : setGwt(l => [...l, { g: '', w: '', t: '' }]))}>+ {mode === 'list' ? '조건' : '시나리오'} 추가</button>
          <button type="button" className="btn ghost sm" onClick={() => { setWho(STORY_EX.who); setWhy(STORY_EX.why); setWhat(STORY_EX.what); setList(STORY_EX.list); setGwt(STORY_EX.gwt) }}>예시로 되돌리기</button>
        </div>
      </div>

      <div className="pr-story-out">
        <article className="pr-card" data-vague={vagueN}>
          <span className="pr-card-tag">STORY · ORD-02-01</span>
          <p className="pr-card-story"><Marked text={story} /></p>
          <h5>인수 조건</h5>
          {mode === 'list' ? (
            <ul>{list.filter(s => s.trim()).map((s, i) => <li key={i}><Marked text={s} /></li>)}</ul>
          ) : (
            <div className="pr-card-gwt">{gwt.map((x, i) => (
              <dl key={i}>
                <dt>Given</dt><dd><Marked text={x.g} /></dd>
                <dt>When</dt><dd><Marked text={x.w} /></dd>
                <dt>Then</dt><dd><Marked text={x.t} /></dd>
              </dl>
            ))}</div>
          )}
        </article>
        <ul className="pr-lint" aria-live="polite">
          {lint.length === 0 && <li className="ok">잴 수 없는 단어가 없어요. QA가 그대로 테스트할 수 있어요.</li>}
          {lint.map((l, i) => <li key={i} className={l.level}><div><i aria-hidden="true">{l.level === 'err' ? '!' : l.level === 'warn' ? '△' : 'i'}</i><span>{l.msg}</span></div></li>)}
        </ul>
        <CodeBlock code={md} label="user-story.md" maxHeight={240} />
        <div className="pr-actions">
          <button type="button" className="btn sm" data-act="story-download" onClick={() => download('user-story.md', md, 'text/markdown')}>.md 다운로드</button>
          <span className="muted">주황 밑줄은 QA가 “통과/실패”를 정할 수 없는 단어예요.</span>
        </div>
      </div>
    </div>
  )
}

/* =================================================================
 * 4) 에픽 · 스토리 · 태스크
 * ================================================================= */
type Size = 'epic' | 'story' | 'task'
const SIZE_NAME: Record<Size, string> = { epic: '에픽', story: '스토리', task: '태스크' }
const QUIZ: { text: string; a: Size; why: string }[] = [
  { text: '재주문 경험 개선', a: 'epic', why: '여러 스토리(조회, 다시 담기, 품절 안내)로 나뉘어요. 여러 스프린트에 걸쳐 만들어요.' },
  { text: '구매자로서, 지난 주문을 한 번에 장바구니에 담기 위해 ‘다시 담기’를 원한다.', a: 'story', why: '사용자가 얻는 가치가 하나 있고, 한 스프린트 안에 끝낼 수 있어요.' },
  { text: '주문 내역 API에 조회 기간 파라미터 추가', a: 'task', why: '스토리를 만들기 위한 개발 작업이에요. 이것만으로는 사용자가 달라진 걸 느끼지 못해요.' },
  { text: '빈 화면 EMP-01 문구와 일러스트 확정', a: 'task', why: '스토리(주문 내역 조회)에 딸린 디자인 작업이에요.' },
  { text: '사장님 정산 화면 전면 개편', a: 'epic', why: '목록, 상세, 엑셀, 세금계산서처럼 여러 스토리로 나눠야 해요.' },
  { text: '구매자로서, 지난 주문 중 취소된 것을 구분하기 위해 취소 주문이 회색으로 보이길 원한다.', a: 'story', why: '역할, 목적, 기능이 다 있는 작은 사용자 가치예요. 앞 스토리의 인수 조건 한 줄로 합쳐도 돼요.' },
]

function SizeQuiz() {
  const [ans, setAns] = useState<(Size | null)[]>(() => QUIZ.map(() => null))
  const right = ans.filter((a, i) => a === QUIZ[i].a).length
  const done = ans.filter(Boolean).length
  return (
    <div className="pr-size">
      <div className="pr-tree" aria-label="에픽 아래 스토리, 스토리 아래 태스크">
        <div className="pr-node epic"><b>에픽</b> 재주문 경험 개선 <small>여러 스프린트 · 큰 목표</small></div>
        <div className="pr-tree-kids">
          <div className="pr-node story"><b>스토리</b> 최근 주문 내역 조회 <small>한 스프린트 안 · 사용자 가치 하나</small></div>
          <div className="pr-tree-kids">
            <div className="pr-node task"><b>태스크</b> 조회 기간 값 추가 (개발)</div>
            <div className="pr-node task"><b>태스크</b> EMP-01 빈 화면 (디자인)</div>
            <div className="pr-node task"><b>태스크</b> order_history_view 기록 넣기 (개발)</div>
          </div>
          <div className="pr-node story"><b>스토리</b> 다시 담기</div>
          <div className="pr-node story"><b>스토리</b> 품절 메뉴 안내</div>
        </div>
      </div>
      <div className="pr-quiz">
        <p className="pr-quiz-head"><b>크기 맞히기</b> <span className="muted">{done}/{QUIZ.length} 답함 · 정답 {right}</span></p>
        <ol>
          {QUIZ.map((q, i) => (
            <li key={i}>
              <p>{q.text}</p>
              <div className="pr-quiz-opts" role="group" aria-label={`${i + 1}번 크기 고르기`}>
                {(['epic', 'story', 'task'] as Size[]).map(s => (
                  <button key={s} type="button" data-quiz={`${i}-${s}`}
                    className={ans[i] === s ? (s === q.a ? 'right' : 'wrong') : ans[i] && s === q.a ? 'answer' : ''}
                    aria-pressed={ans[i] === s} onClick={() => setAns(a => a.map((x, j) => (j === i ? s : x)))}>{SIZE_NAME[s]}</button>
                ))}
              </div>
              {ans[i] && <p className={'pr-quiz-why ' + (ans[i] === q.a ? 'right' : 'wrong')}>{ans[i] === q.a ? '맞아요. ' : `${SIZE_NAME[q.a]}에 가까워요. `}{q.why}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

/* =================================================================
 * 5) 좋은 AC vs 나쁜 AC
 * ================================================================= */
const AC_PAIRS: [string, string][] = [
  ['목록이 빠르게 뜬다.', '주문 내역 첫 20개가 3초 안에 보인다. 3초가 넘으면 회색 뼈대 화면(스켈레톤)을 보여준다.'],
  ['취소 주문은 적절히 표시한다.', '취소된 주문은 카드 전체를 회색(비활성)으로 바꾼다. ‘주문 취소’ 라벨을 붙이고, ‘다시 담기’ 버튼은 숨긴다.'],
  ['다양한 예외 상황을 처리한다.', '네트워크 오류면 “주문 내역을 불러오지 못했어요”와 ‘다시 시도’ 버튼을 보여준다. 0건이면 EMP-01을 보여준다. 로그인이 만료되면 로그인 화면에 갔다가 다시 돌아온다.'],
]
function AcCompare() {
  const [mode, setMode] = useState<'bad' | 'good'>('bad')
  return (
    <div className="pr-gb">
      <Seg value={mode} onChange={setMode} options={[['bad', '✕ 나쁜 AC'], ['good', '○ 좋은 AC']] as const} />
      <ol className="pr-gb-list">
        {AC_PAIRS.map(([b, g], i) => <li key={i} className={'is-' + mode}><p className="pr-quote">{mode === 'bad' ? <Marked text={b} /> : g}</p></li>)}
      </ol>
      <Note>좋은 <Term k="AC" />인지 보는 기준은 하나예요. <b>QA가 읽고 통과인지 실패인지 판단할 수 있나요?</b> 그렇다면 이 문장이 그대로 테스트 시나리오(<Term k="TC" />)가 돼요. <a href="#/plan/qa">09 QA · 출시에서 AC → TC 보기 →</a></Note>
    </div>
  )
}

/* =================================================================
 * 6) 체크리스트
 * ================================================================= */
const CHECKS = [
  '문제 문장에 버튼·화면·기능 이름(해결책)이 들어 있지 않나요?',
  '목표에 지금 값, 목표 값, 확인할 날짜가 모두 있나요?',
  '나빠지면 안 되는 숫자(가드레일 지표)를 정했나요?',
  '‘이번에 하지 않을 것’을 적었나요? 회의에서 나온 “이것도 하면 좋겠다”는 여기에 적어요.',
  '가정마다 어떻게 확인할지 적었나요?',
  '오픈 이슈마다 담당자와 기한이 있나요?',
  '모든 AC를 QA가 그대로 테스트할 수 있나요? (빠르게·적절히·편하게 같은 말이 0개)',
  '확정하기 전에 디자이너와 개발 리드가 리뷰했나요?',
]
function Checklist() {
  const [on, setOn] = useState<boolean[]>(() => CHECKS.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <>
      <ul className="pr-checklist">
        {CHECKS.map((t, i) => <li key={i}><label><input type="checkbox" checked={on[i]} onChange={e => setOn(o => o.map((v, j) => (j === i ? e.target.checked : v)))} /><span>{t}</span></label></li>)}
      </ul>
      <div className="pr-progress" aria-live="polite"><div style={{ width: (n / CHECKS.length) * 100 + '%' }} /><span>{n} / {CHECKS.length}</span></div>
    </>
  )
}

/* ================================================================= */
const OPP: [string, string][] = [
  ['어떤 사업 목표를 다루나요?', '목표'],
  ['성공을 어떻게 알 수 있나요?', '핵심 지표'],
  ['어떤 고객 문제를 푸나요?', '문제 정의'],
  ['누구를 위한 것인가요?', '대상 사용자'],
]

export default function PrdTab() {
  return (
    <div data-plan="prd">
      <TermList keys={['PRD', '유저 스토리', 'AC', '에픽', '태스크', '스프린트', 'KPI', '가드레일 지표', '범위(Scope)', '오픈 이슈', '퍼널', 'QA', 'TC', 'Given/When/Then']}
        extra={{
          '태스크': '스토리 하나를 만들기 위해 하는 실제 작업이에요. 예: API 수정, 빈 화면 그리기. 이것만으로는 사용자가 달라진 걸 못 느껴요.',
          '가드레일 지표': '목표를 쫓다가 망가지면 안 되는 숫자예요. 도로의 가드레일처럼 선 밖으로 나가지 않게 지켜요. 예: 주문 취소율.',
          '범위(Scope)': '이번에 하는 것과 하지 않는 것의 경계예요. 하지 않는 것을 적어 두어야 “이것도 해 주세요”에 흔들리지 않아요.',
          '오픈 이슈': '아직 정하지 못한 문제예요. 누가 언제까지 정할지 함께 적어요.',
          'Given/When/Then': '인수 조건을 ‘어떤 상황에서(Given) – 무엇을 하면(When) – 이렇게 된다(Then)’ 세 칸으로 쓰는 방식이에요.',
        }} />
      <SysGrid>
        <Section id="plan-prd-intro" wide title="기획은 화면이 아니라 문제와 목표에서 시작해요"
          gist="“무엇을 만들까”보다 “누가 왜 불편한가”를 먼저 적어요."
          desc="“재주문 버튼 하나 추가해 주세요.” 이런 요청을 받으면 주니어는 바로 와이어프레임을 열어요. 저는 먼저 “왜요? 지금 뭐가 불편한데요?”를 물어요.">
          <div className="pr-intro">
            <div className="pr-intro-text">
              <p>
                <Term k="PRD" />(제품 요구사항 문서)는 여행 전에 쓰는 계획표와 같아요. 어디로 가는지(목표), 왜 가는지(문제), 누구와 가는지(대상 사용자)를 적어 두면 가는 길에 헤매지 않아요.
              </p>
              <p>
                PRD는 <b>무엇을 왜 만들고, 무엇이 되면 성공인지</b>를 팀 전체가 같은 문장으로 기억하게 해요.
                화면설계서, 디자인, QA가 모두 이 문서에서 출발해요. 그래서 PRD의 문제가 흐리면 그 뒤 문서가 모두 흔들려요.
              </p>
            </div>
            <div className="pr-opp">
              <b>“만들 가치가 있나?”를 따지는 4가지 질문과, 답을 적는 PRD 칸 (『인스파이어드』)</b>
              <ul>{OPP.map(([q, f]) => <li key={q}><span>{q}</span><i aria-hidden="true">→</i><em>{f}</em></li>)}</ul>
            </div>
          </div>
        </Section>

        <Section id="plan-prd-problem" wide title="해결책 말고 문제부터 말하기"
          gist="“버튼 추가하자” 말고 “누가 무엇 때문에 손해 본다”로 써요."
          desc="같은 상황을 두 가지 방식으로 써 봤어요. 위 버튼으로 바꿔 보세요.">
          <ProblemCompare />
        </Section>

        <Section id="plan-prd-builder" wide title="PRD 직접 써 보기 (표준 양식)"
          gist="빈칸 없이 채우고, 목표와 지표는 꼭 숫자로 써요."
          desc={<>오늘반찬 ‘재주문’ 예시가 채워져 있어요. 칸을 지우거나 고쳐 보세요. 빈칸과 잴 수 없는 표현을 옆에서 바로 알려줘요. 특히 <Term k="가드레일 지표" d="목표를 쫓다가 망가지면 안 되는 숫자예요. 도로의 가드레일처럼 선 밖으로 나가지 않게 지켜요. 예: 주문 취소율." />와 <Term k="오픈 이슈" d="아직 정하지 못한 문제예요. 누가 언제까지 정할지 함께 적어요." /> 칸을 눈여겨보세요. 다 쓰면 .md 파일로 내려받아요.</>}>
          <PrdBuilder />
        </Section>

        <Section id="plan-prd-story" wide title="유저 스토리와 인수 조건(AC) 써 보기"
          gist="스토리는 누가 왜 원하는지, 인수 조건은 언제 ‘완료’인지 정해요."
          desc={<>식당 주문으로 치면 <Term k="유저 스토리" />는 “아이가 먹을 거라 안 맵게 해 주세요”예요. <Term k="인수 조건" />은 “고춧가루 없이, 간장은 반 숟가락”처럼 확인할 수 있는 약속이에요. 스토리는 “[누구]로서, [목적]을 위해 [기능]을 원한다” 한 문장으로 써요. 예시에 일부러 나쁜 줄을 넣어 뒀어요. 찾아서 고쳐 보세요.</>}>
          <StoryWriter />
        </Section>

        <Section id="plan-prd-size" wide title="에픽 · 스토리 · 태스크, 크기 구분하기"
          gist="한 스프린트에 못 끝나면 에픽, 사용자가 못 느끼면 태스크예요."
          desc={<>이사로 치면 <Term k="에픽" />은 “이사하기”, 스토리는 “부엌 짐 옮기기”, <Term k="태스크" d="스토리 하나를 만들기 위해 하는 실제 작업이에요. 예: API 수정, 빈 화면 그리기." />는 “그릇 상자 포장하기”예요. 에픽은 큰 목표 덩어리예요. 스토리는 한 <Term k="스프린트" /> 안에 끝나는 사용자 가치 하나예요. 태스크는 스토리를 만들기 위한 작업이에요. 퀴즈 문장의 크기를 맞혀 보세요.</>}>
          <SizeQuiz />
          <Note tone="tip">
            <b>스토리가 너무 큰지 볼 때는 INVEST 여섯 가지를 확인해요.</b> 다른 스토리 없이 만들 수 있고(Independent), 내용을 조정할 수 있고(Negotiable), 사용자에게 가치가 있어야 해요(Valuable).
            또 기간을 짐작할 수 있고(Estimable), 작고(Small), 테스트할 수 있어야(Testable) 해요.
            개발자가 “이건 얼마나 걸릴지 모르겠어요”라고 하면 대부분 나눌 때가 된 거예요.
          </Note>
        </Section>

        <Section id="plan-prd-ac" title="좋은 AC vs 나쁜 AC"
          gist="‘빠르게’ 대신 ‘3초 안에’처럼 숫자와 동작으로 써요."
          desc="같은 요구를 잴 수 있게 바꾸면 이렇게 돼요.">
          <AcCompare />
        </Section>

        <Section id="plan-prd-check" title="사수의 체크리스트"
          gist="문제, 숫자 목표, 안 할 것, 기한이 다 있는지 봐요."
          desc="PRD 리뷰에서 제가 실제로 묻는 질문이에요.">
          <Checklist />
        </Section>

        <Section id="plan-prd-ref" wide title="참고" gist="PRD와 스토리 쓰는 법을 더 깊이 볼 때 읽을 자료예요.">
          <ul className="pr-ref">
            <li>Marty Cagan, 『인스파이어드(Inspired)』, SVPG — 기회 평가(Opportunity Assessment), 문제와 해결책을 나눠서 생각하기</li>
            <li>Atlassian Agile Coach — User stories, Epics, Acceptance criteria</li>
            <li>Bill Wake, “INVEST in Good Stories, and SMART Tasks” — 좋은 스토리의 6가지 조건</li>
            <li>Given/When/Then — 행동 주도 개발(BDD)에서 쓰는 ‘상황 – 행동 – 결과’ 시나리오 형식</li>
          </ul>
          <p className="muted">이어서 보기: <a href="#/plan/flow">02 구조 · 동선</a> · <a href="#/plan/priority">05 우선순위</a> · <a href="#/plan/metrics">06 지표 · 데이터</a></p>
        </Section>
      </SysGrid>
    </div>
  )
}

