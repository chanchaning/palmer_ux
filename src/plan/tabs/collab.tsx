import { useMemo, useState, type ReactNode } from 'react'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { Seg } from '../../components/ui'
import { download } from '../../system/export'
import './collab.css'

/* ================= 공용 조각 ================= */
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const toCSV = (rows: string[][]) => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n')

function DlBtn({ name, text, type = 'text/markdown', children }: { name: string; text: string; type?: string; children: ReactNode }) {
  return <button type="button" className="btn sm" data-dl={name} onClick={() => download(name, text, type)}>{children}</button>
}

function Field({ label, children, hint, bad }: { label: ReactNode; children: ReactNode; hint?: ReactNode; bad?: boolean }) {
  return (
    <label className={'cb-fld' + (bad ? ' bad' : '')}>
      <span className="cb-lab">{label}</span>
      {children}
      {hint && <span className="cb-hint">{hint}</span>}
    </label>
  )
}

function Check({ items, storeKey }: { items: string[]; storeKey: string }) {
  const [on, setOn] = useState<boolean[]>(() => items.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <div className="cb-check" data-k={storeKey}>
      <div className="cb-check-top"><b>{n} / {items.length}</b><span className="muted">리뷰 전에 스스로 답해 보세요</span></div>
      <div className="cb-bar"><i style={{ width: (n / items.length) * 100 + '%' }} /></div>
      <ul>
        {items.map((t, i) => (
          <li key={i}>
            <label className="opt">
              <input type="checkbox" checked={on[i]} onChange={() => setOn(o => o.map((v, j) => (j === i ? !v : v)))} />
              <span>{t}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ================= 1. 요구사항 받을 때 묻는 질문 ================= */
const INTAKE = [
  { k: 'who', tag: '누가', q: '누가 요청했고, 실제로 쓰는 사람은 누구예요?', why: '요청자와 사용자가 다를 때가 많아요. 운영팀이 요청해도 매일 쓰는 건 사장님이에요.', ex: '요청: 운영팀 / 실제 사용자: 사장님(가게 앱) / 영향받는 사람: 구매자', crit: true },
  { k: 'why', tag: '왜', q: '지금 어떤 문제가 생기고 있어요? 근거가 있나요?', why: '“버튼을 크게”는 해결책이에요. 문제를 들어야 더 나은 해결책이 보여요.', ex: '품절된 메뉴가 주문된 뒤 사장님이 직접 취소 → 구매자 CS 문의로 이어짐. 지난달 CS 로그에서 확인(건수는 운영팀이 공유하기로 함)', crit: true },
  { k: 'when', tag: '언제까지', q: '언제까지 필요해요? 그 날짜인 이유는요?', why: '이유를 알아야 “범위를 줄여 날짜를 지킬지, 날짜를 옮길지” 협상할 수 있어요.', ex: '12월 첫 주. 연말 주문이 몰리기 전에 사장님들이 기능에 익숙해져야 해서', crit: true },
  { k: 'success', tag: '성공 기준', q: '무엇이 바뀌면 성공이에요? 숫자로 말하면요?', why: '성공 기준이 없으면 출시 후 “잘 됐나요?”에 아무도 답하지 못해요.', ex: '“품절 메뉴 주문 후 취소” 관련 CS 문의 수가 출시 전 4주 평균보다 줄어든다', crit: true },
  { k: 'out', tag: '하지 않을 것', q: '이번에 하지 않을 것은 뭐예요?', why: '범위 밖을 적어 두면 “이것도 되는 줄 알았는데요”를 막아요.', ex: '남은 수량 표시(“3개 남음”), 품절 자동 예측은 이번에 하지 않음', crit: false },
  { k: 'people', tag: '이해관계자', q: '누가 결정하고, 누가 의견을 주고, 누가 알기만 하면 돼요?', why: '결정권자를 모르면 리뷰 때마다 결론이 뒤집혀요.', ex: '결정: PO / 의견: 운영팀, 사장님 CS 담당 / 공유: 개발 리드, 디자이너, QA', crit: false },
  { k: 'fixed', tag: '정해진 것', q: '이미 정해진 것(기술·법·예산·다른 팀 일정)이 있나요?', why: '나중에 알면 설계를 다시 해야 해요. 처음에 물어 두세요.', ex: '사장님 앱 다음 정기 배포는 11월 넷째 주. 그 뒤로는 연말까지 배포 동결', crit: false },
] as const
const MEASURABLE = /\d|줄어|늘어|이하|이상|미만|초과|%|건|명|배|감소|증가/

function Intake() {
  const [req, setReq] = useState('사장님들이 품절 처리를 너무 늦게 해요. 품절 버튼 좀 크게 만들어 주세요.')
  const [ans, setAns] = useState<Record<string, string>>(() => Object.fromEntries(INTAKE.map(x => [x.k, x.ex])))
  const done = INTAKE.filter(x => ans[x.k].trim()).length
  const missCrit = INTAKE.filter(x => x.crit && !ans[x.k].trim())
  const vagueSuccess = ans.success.trim() !== '' && !MEASURABLE.test(ans.success)
  const md = useMemo(() => [
    `# 요구사항 정리`, '', `## 받은 요청`, `> ${req || '(요청 원문을 그대로 붙여 넣어요)'}`, '',
    ...INTAKE.flatMap((x, i) => [`## ${i + 1}. ${x.tag} — ${x.q}`, ans[x.k].trim() || '- [ ] (아직 못 물어봄)', '']),
    `---`, `정리: 기획 / 요청자 확인: [ ]`,
  ].join('\n'), [req, ans])

  return (
    <Section id="plan-collab-intake" wide title="요구사항 받을 때 묻는 질문 7가지"
      desc="요청을 받자마자 화면부터 그리면, 일주일 뒤에 “제가 원한 건 이게 아닌데요”를 들어요. 그리기 전에 이 7가지를 먼저 물어요. 예시 답이 채워져 있으니 지우고 쓰면 돼요.">
      <div className="cb-intake">
        <div className="cb-col">
          <Field label="받은 요청 (원문 그대로)">
            <textarea className="cb-in" rows={2} value={req} onChange={e => setReq(e.target.value)} />
          </Field>
          <Note tone="tip"><b>사수 한마디:</b> “품절 버튼을 크게”는 <b>해결책</b>이에요. 문제는 “사장님이 품절 처리를 늦게 한다”예요. 왜 늦을까요? 버튼이 작아서일 수도, 주방에서 폰을 안 봐서일 수도 있어요. 원인에 따라 해결책이 완전히 달라져요.</Note>
          <ol className="cb-qs">
            {INTAKE.map(x => {
              const empty = !ans[x.k].trim()
              return (
                <li key={x.k} className={empty ? 'empty' : 'ok'}>
                  <div className="cb-q-head">
                    <span className="cb-tag">{x.tag}</span>
                    <b>{x.q}</b>
                    {x.crit && <span className="cb-must">필수</span>}
                  </div>
                  <p className="cb-why">{x.why}</p>
                  <textarea className="cb-in" rows={2} aria-label={x.q} value={ans[x.k]} placeholder="요청자에게 물어보고 받은 답을 적어요"
                    onChange={e => setAns(a => ({ ...a, [x.k]: e.target.value }))} />
                  {x.k === 'success' && vagueSuccess && <span className="cb-warn">숫자나 방향(줄어든다·늘어난다)이 없어요. 출시 후에 확인할 수 있는 문장인가요?</span>}
                </li>
              )
            })}
          </ol>
        </div>
        <div className="cb-col cb-sticky">
          <div className="cb-score">
            <div className="cb-score-num"><b>{done}</b> / {INTAKE.length} 답했어요</div>
            <div className="cb-bar"><i style={{ width: (done / INTAKE.length) * 100 + '%' }} /></div>
            {missCrit.length > 0
              ? <p className="cb-warn">아직 <b>{missCrit.map(x => x.tag).join(', ')}</b>을(를) 모르면 착수하지 마세요. 이 네 가지가 비면 범위와 일정을 정할 수 없어요.</p>
              : <p className="cb-good">필수 4가지(누가·왜·언제까지·성공 기준)를 모두 알아요. 이제 요청자에게 이 정리본을 보내 “제가 이해한 게 맞나요?”를 확인받으세요.</p>}
            <div className="cb-row">
              <DlBtn name="요구사항-정리.md" text={md}>↓ 마크다운 받기</DlBtn>
              <button type="button" className="btn ghost sm" onClick={() => setAns(Object.fromEntries(INTAKE.map(x => [x.k, ''])))}>답 비우기</button>
              <button type="button" className="btn ghost sm" onClick={() => setAns(Object.fromEntries(INTAKE.map(x => [x.k, x.ex])))}>예시로 되돌리기</button>
            </div>
          </div>
          <CodeBlock code={md} label="요구사항-정리.md" maxHeight={420} />
        </div>
      </div>
    </Section>
  )
}

/* ================= 2. 회의록 ================= */
type Act = { what: string; owner: string; due: string }
const MEET0 = {
  title: '재주문 기능 정책 리뷰',
  date: '2026-11-05 14:00 (30분)',
  who: 'PO, 기획(Palmer), 디자인, 서버, 앱, QA',
  decisions: ['재주문 시 품절 메뉴는 빼고 나머지만 장바구니에 담는다. 뺀 개수는 토스트로 알린다.', '주문 내역은 최근 6개월만 보여준다.', '가격은 재주문하는 시점의 현재 가격으로 다시 계산한다.'],
  actions: [
    { what: '품절 안내 토스트 문구 3안', owner: '기획 Palmer', due: '11/07(금)' },
    { what: '주문 내역 API 6개월 필터 공수 확인', owner: '서버', due: '11/06(목)' },
    { what: '재주문 버튼 위치 2안 (목록 / 상세)', owner: '디자인', due: '' },
  ] as Act[],
  issues: [{ what: '재주문할 때 지난 주문에 쓴 쿠폰을 다시 적용하나?', owner: 'PO (마케팅팀 확인)', due: '11/07(금)' }] as Act[],
}
const TRANSCRIPT = `재주문 회의 (11/5)

디자인: 품절이면 어떻게 하죠? 회색으로 보여줄까요?
서버: 그건 담을 때 체크하면 될 것 같은데, 결제할 때 막아도 되고요.
PO: 음, 둘 다 장단점이 있네요.
기획: 토스트로 알려주는 방법도 있어요.
앱: 토스트는 금방 사라져서 못 볼 수도 있어요.
PO: 그럼 그건 좀 더 고민해 봐요.
QA: 6개월 전 주문은요? 그날 포함인가요?
서버: 아마 될 거예요.
PO: 쿠폰도 궁금하긴 하네요. 마케팅 쪽에 물어봐야 하나?
기획: 네 알아볼게요.
(이하 20분 대화 계속...)`

function MeetingNotes() {
  const [m, setM] = useState(MEET0)
  const [view, setView] = useState<'decision' | 'transcript'>('decision')
  const setList = <K extends 'decisions' | 'actions' | 'issues'>(k: K, v: (typeof MEET0)[K]) => setM(s => ({ ...s, [k]: v }))
  const badActs = m.actions.filter(a => a.what.trim() && (!a.owner.trim() || !a.due.trim())).length
  const md = useMemo(() => [
    `# ${m.title}`, `- 일시: ${m.date}`, `- 참석: ${m.who}`, '',
    `## 결정 사항`, ...(m.decisions.filter(d => d.trim()).length ? m.decisions.filter(d => d.trim()).map((d, i) => `${i + 1}. ${d}`) : ['- 결정 없음 (다음 회의에서 결정할 것을 미결 이슈에 적어요)']), '',
    `## 액션 아이템`, `| 할 일 | 담당 | 기한 |`, `|---|---|---|`, ...m.actions.filter(a => a.what.trim()).map(a => `| ${a.what} | ${a.owner || '❗담당 없음'} | ${a.due || '❗기한 없음'} |`), '',
    `## 미결 이슈`, ...m.issues.filter(a => a.what.trim()).map(a => `- [ ] ${a.what} — ${a.owner || '담당 미정'}, ${a.due || '기한 미정'}까지 답`), '',
    `---`, `회의록은 회의 당일에 공유하고, 바뀐 결정은 의사결정 기록(D-번호)에 옮겨요.`,
  ].join('\n'), [m])

  const actRows = (k: 'actions' | 'issues', ph: [string, string, string]) => (
    <div className="cb-acts">
      {m[k].map((a, i) => {
        const miss = k === 'actions' && a.what.trim() !== '' && (!a.owner.trim() || !a.due.trim())
        const upd = (p: Partial<Act>) => setList(k, m[k].map((x, j) => (j === i ? { ...x, ...p } : x)))
        return (
          <div key={i} className={'cb-act' + (miss ? ' bad' : '')}>
            <input className="cb-in" aria-label={ph[0]} placeholder={ph[0]} value={a.what} onChange={e => upd({ what: e.target.value })} />
            <input className={'cb-in' + (k === 'actions' && !a.owner.trim() ? ' need' : '')} aria-label={ph[1]} placeholder={ph[1]} value={a.owner} onChange={e => upd({ owner: e.target.value })} />
            <input className={'cb-in' + (k === 'actions' && !a.due.trim() ? ' need' : '')} aria-label={ph[2]} placeholder={ph[2]} value={a.due} onChange={e => upd({ due: e.target.value })} />
            <button type="button" className="cb-x" aria-label="삭제" onClick={() => setList(k, m[k].filter((_, j) => j !== i))}>×</button>
          </div>
        )
      })}
      <button type="button" className="btn ghost sm cb-add" onClick={() => setList(k, [...m[k], { what: '', owner: '', due: '' }])}>+ 한 줄 추가</button>
    </div>
  )

  return (
    <Section id="plan-collab-meeting" wide title="회의록 템플릿 — 결정만 남겨요"
      desc="회의록은 대화를 받아 적는 문서가 아니에요. 회의에 오지 않은 사람이 1분 안에 “뭐가 정해졌고, 내가 뭘 해야 하지?”를 알 수 있어야 해요.">
      <div className="cb-compare">
        <Seg value={view} onChange={setView} options={[['decision', '결정만 남기는 회의록'], ['transcript', '받아 적기 회의록']]} />
        {view === 'transcript' ? (
          <div className="cb-cmp bad">
            <pre className="cb-pre">{TRANSCRIPT}</pre>
            <ul className="cb-verdict">
              <li><b>뭐가 정해졌어요?</b> 알 수 없어요. “고민해 봐요”로 끝났어요.</li>
              <li><b>누가 뭘 해요?</b> “알아볼게요”는 할 일이 아니에요. 기한이 없어요.</li>
              <li><b>“아마 될 거예요”</b>는 결정이 아니라 미결 이슈예요. 확인할 사람과 날짜가 필요해요.</li>
              <li>이 회의록을 3주 뒤에 읽으면 같은 회의를 한 번 더 해야 해요.</li>
            </ul>
          </div>
        ) : (
          <div className="cb-cmp good">
            <p className="cb-cmp-lead">같은 회의를 <b>결정 / 할 일(담당·기한) / 미결 이슈</b> 세 칸으로 정리했어요. 아래 편집기에서 바로 고쳐 보세요.</p>
            <ul className="cb-verdict">
              <li><b>결정:</b> 문장 하나에 하나만. 주어와 조건까지 적어요.</li>
              <li><b>할 일:</b> 담당자 이름과 날짜가 없으면 할 일이 아니에요.</li>
              <li><b>미결 이슈:</b> “누가 언제까지 답을 가져오는지”까지 적어야 닫혀요.</li>
              <li>회의 끝나기 5분 전에 결정 사항을 소리 내어 읽고 “이거 맞죠?”를 확인해요.</li>
            </ul>
          </div>
        )}
      </div>

      <div className="cb-meet">
        <div className="cb-col">
          <div className="cb-meta">
            <Field label="회의 이름"><input className="cb-in" value={m.title} onChange={e => setM({ ...m, title: e.target.value })} /></Field>
            <Field label="일시"><input className="cb-in" value={m.date} onChange={e => setM({ ...m, date: e.target.value })} /></Field>
            <Field label="참석"><input className="cb-in" value={m.who} onChange={e => setM({ ...m, who: e.target.value })} /></Field>
          </div>
          <h4 className="cb-h4"><span className="cb-dot d" />결정 사항</h4>
          <div className="cb-acts">
            {m.decisions.map((d, i) => (
              <div key={i} className="cb-act one">
                <span className="cb-n">{i + 1}</span>
                <textarea className="cb-in auto" rows={1} aria-label={`결정 ${i + 1}`} value={d} onChange={e => setList('decisions', m.decisions.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" className="cb-x" aria-label="삭제" onClick={() => setList('decisions', m.decisions.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button type="button" className="btn ghost sm cb-add" onClick={() => setList('decisions', [...m.decisions, ''])}>+ 결정 추가</button>
          </div>
          <h4 className="cb-h4"><span className="cb-dot a" />액션 아이템 <small>할 일 · 담당 · 기한</small></h4>
          {actRows('actions', ['할 일', '담당', '기한'])}
          {badActs > 0 && <p className="cb-warn" data-warn="acts">담당이나 기한이 빈 할 일이 {badActs}개 있어요. 회의가 끝나기 전에 채워야 해요. 비어 있으면 아무도 안 해요.</p>}
          <h4 className="cb-h4"><span className="cb-dot i" />미결 이슈 <small>누가 · 언제까지 답</small></h4>
          {actRows('issues', ['아직 못 정한 것', '답을 가져올 사람', '언제까지'])}
        </div>
        <div className="cb-col cb-sticky">
          <CodeBlock code={md} label="회의록.md" maxHeight={520} />
          <div className="cb-row"><DlBtn name="회의록.md" text={md}>↓ 회의록 .md 받기</DlBtn><button type="button" className="btn ghost sm" onClick={() => setM(MEET0)}>예시로 되돌리기</button></div>
        </div>
      </div>
    </Section>
  )
}

/* ================= 3. 의사결정 기록 ================= */
type Dec = { id: string; date: string; title: string; choice: string; alts: string; why: string; by: string; revisit: string }
const DECS0: Dec[] = [
  { id: 'D-001', date: '2026-11-05', title: '재주문 시 품절 메뉴 처리', choice: '품절 메뉴는 빼고 담고, 뺀 개수를 토스트로 알린다', alts: 'A. 품절이 하나라도 있으면 재주문을 막는다 / B. 모두 담고 결제 단계에서 막는다', why: 'A는 나머지 메뉴도 못 사서 이탈해요. B는 결제 직전에 실패를 겪게 해요. 빼고 담는 쪽이 실패 경험이 가장 짧아요.', by: 'PO', revisit: '품절 때문에 빠지는 메뉴가 많다는 데이터가 나오면 “대체 메뉴 추천”을 검토' },
  { id: 'D-002', date: '2026-11-05', title: '주문 내역 노출 기간', choice: '최근 6개월', alts: '전체 기간 / 최근 3개월', why: '사장님 메뉴가 계절마다 바뀌어 오래된 주문은 재주문해도 담을 메뉴가 거의 없어요. 서버 조회 부담도 줄어요.', by: 'PO · 서버 리드', revisit: '6개월보다 오래된 주문을 찾는 CS 문의가 생기면' },
  { id: 'D-003', date: '2026-11-05', title: '재주문 가격 기준', choice: '재주문하는 시점의 현재 가격', alts: '지난 주문 당시 가격 유지', why: '당시 가격을 보장하면 가격을 올린 사장님이 손해를 보고, 정산 규칙이 복잡해져요.', by: 'PO', revisit: '가격 차이로 인한 불만이 CS에 반복되면 “가격이 바뀌었어요” 안내 추가' },
]

function DecisionLog() {
  const [list, setList] = useState(DECS0)
  const [later, setLater] = useState<'none' | 'log'>('log')
  const [f, setF] = useState({ title: '', choice: '', alts: '', why: '', by: '' })
  const canAdd = f.title.trim() && f.choice.trim() && f.why.trim()
  const add = () => {
    if (!canAdd) return
    const id = 'D-' + String(list.length + 1).padStart(3, '0')
    setList([...list, { id, date: new Date().toISOString().slice(0, 10), revisit: '', ...f }])
    setF({ title: '', choice: '', alts: '', why: '', by: '' })
  }
  const md = useMemo(() => ['# 의사결정 기록 (Decision Log)', '', ...list.flatMap(d => [
    `## ${d.id} ${d.title}`, `- 날짜: ${d.date}`, `- 결정: ${d.choice}`, `- 검토한 대안: ${d.alts || '-'}`, `- 이유: ${d.why}`, `- 결정자: ${d.by || '-'}`, `- 다시 볼 조건: ${d.revisit || '-'}`, '']),
  ].join('\n'), [list])

  return (
    <Section id="plan-collab-decision" wide title="의사결정 기록 — 3개월 뒤의 같은 논쟁을 막아요"
      desc="회의록은 시간이 지나면 묻혀요. ‘왜 그렇게 정했는지’만 따로 모아 번호를 붙여 두면, 새로 온 사람도 같은 질문을 다시 하지 않아요.">
      <div className="cb-later">
        <div className="cb-later-top">
          <span className="muted">3개월 뒤, 새로 온 디자이너가 묻습니다</span>
          <Seg value={later} onChange={setLater} options={[['none', '기록이 없을 때'], ['log', '기록이 있을 때']]} />
        </div>
        <div className="cb-chat">
          <div className="cb-bubble q">재주문할 때 왜 지난번 가격이 아니라 지금 가격으로 계산돼요? 구매자는 헷갈릴 것 같은데요.</div>
          {later === 'none' ? (
            <>
              <div className="cb-bubble a">음… 그때 회의에서 그렇게 정했던 것 같은데, 이유는 잘 기억이 안 나요. 다시 한번 모여서 얘기해 볼까요?</div>
              <div className="cb-bubble sys bad">→ 30분짜리 회의가 다시 잡히고, 같은 논쟁을 처음부터 반복해요.</div>
            </>
          ) : (
            <>
              <div className="cb-bubble a"><b>D-003</b> 보시면 돼요. 당시 가격을 보장하면 가격을 올린 사장님이 손해를 보고 정산이 복잡해져서 현재 가격으로 정했어요. 대신 “CS에 반복되면 안내 문구 추가”가 다시 볼 조건이에요.</div>
              <div className="cb-bubble sys good">→ 1분 만에 끝나요. 조건이 맞으면 결정을 다시 열 수도 있어요.</div>
            </>
          )}
        </div>
      </div>

      <div className="sys-table-wrap">
        <table className="sys-table cb-dtable">
          <thead><tr><th style={{ width: 80 }}>번호</th><th style={{ width: '16%' }}>무엇을</th><th style={{ width: '18%' }}>결정</th><th>검토한 대안</th><th>이유</th><th style={{ width: 96 }}>결정자</th><th style={{ width: '16%' }}>다시 볼 조건</th></tr></thead>
          <tbody>
            {list.map(d => (
              <tr key={d.id} className={d.id === 'D-003' && later === 'log' ? 'hl' : ''}>
                <td><b>{d.id}</b><div className="muted">{d.date}</div></td>
                <td><b className="cb-dt">{d.title}</b></td><td>{d.choice}</td><td>{d.alts || '—'}</td><td>{d.why}</td><td>{d.by || '—'}</td><td>{d.revisit || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cb-decform">
        <Field label="무엇을 정했나요"><input className="cb-in" value={f.title} placeholder="예: 재주문 버튼 위치" onChange={e => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="결정"><input className="cb-in" value={f.choice} placeholder="예: 주문 내역 목록의 각 주문 오른쪽" onChange={e => setF({ ...f, choice: e.target.value })} /></Field>
        <Field label="검토한 대안"><input className="cb-in" value={f.alts} placeholder="예: 주문 상세 화면 하단" onChange={e => setF({ ...f, alts: e.target.value })} /></Field>
        <Field label="이유" hint={!f.why.trim() && f.title.trim() ? '이유가 없는 기록은 3개월 뒤에 쓸모가 없어요.' : undefined} bad={!f.why.trim() && !!f.title.trim()}><input className="cb-in" value={f.why} placeholder="예: 목록에서 바로 누를 수 있어 탭 수가 줄어요" onChange={e => setF({ ...f, why: e.target.value })} /></Field>
        <Field label="결정자"><input className="cb-in" value={f.by} placeholder="예: PO" onChange={e => setF({ ...f, by: e.target.value })} /></Field>
        <div className="cb-row end">
          <button type="button" className="btn sm" disabled={!canAdd} onClick={add}>+ 기록 추가</button>
          <DlBtn name="의사결정-기록.md" text={md}>↓ .md 받기</DlBtn>
        </div>
      </div>
      <Note>개발 쪽에서는 같은 생각을 <b>ADR(Architecture Decision Record)</b>이라고 불러요. 형식보다 중요한 건 <b>대안과 이유</b>를 남기는 거예요. 결정 자체는 회의록에도 있지만, “왜 다른 걸 안 골랐는지”는 여기에만 남아요.</Note>
    </Section>
  )
}

/* ================= 4. 일정 · 의존성 간트 ================= */
type Task = { id: string; name: string; who: string; dur: number; deps: string[] }
const TASKS: Task[] = [
  { id: 'plan', name: '기획 확정', who: '기획', dur: 4, deps: [] },
  { id: 'design', name: 'UI 디자인', who: '디자인', dur: 5, deps: ['plan'] },
  { id: 'api', name: '서버 API', who: '서버', dur: 8, deps: ['plan'] },
  { id: 'app', name: '앱 화면 개발', who: '앱', dur: 6, deps: ['design'] },
  { id: 'int', name: '연동 · 통합', who: '앱 · 서버', dur: 2, deps: ['app', 'api'] },
  { id: 'qa', name: 'QA', who: 'QA', dur: 4, deps: ['int'] },
  { id: 'rel', name: '출시 준비', who: '전원', dur: 2, deps: ['qa'] },
]
type Sched = Record<string, { es: number; ef: number; slack: number; dur: number }>
function schedule(delay: Record<string, number>): { s: Sched; end: number } {
  const s: Sched = {}
  for (const t of TASKS) {
    const dur = t.dur + (delay[t.id] ?? 0)
    const es = Math.max(0, ...t.deps.map(d => s[d].ef))
    s[t.id] = { es, ef: es + dur, slack: 0, dur }
  }
  const end = Math.max(...TASKS.map(t => s[t.id].ef))
  const lf: Record<string, number> = {}
  for (const t of [...TASKS].reverse()) {
    const succ = TASKS.filter(x => x.deps.includes(t.id))
    lf[t.id] = succ.length ? Math.min(...succ.map(x => lf[x.id] - s[x.id].dur)) : end
    s[t.id].slack = lf[t.id] - s[t.id].ef
  }
  return { s, end }
}
const PRESETS: [string, string, Record<string, number>][] = [
  ['ok', '계획대로', {}],
  ['design', '디자인 3일 지연', { design: 3 }],
  ['api', '서버 3일 지연', { api: 3 }],
  ['both', '디자인 2일 + QA 재테스트 3일', { design: 2, qa: 3 }],
]

function Gantt() {
  const [delay, setDelay] = useState<Record<string, number>>({})
  const [buffer, setBuffer] = useState(3)
  const base = useMemo(() => schedule({}), [])
  const cur = useMemo(() => schedule(delay), [delay])
  const target = base.end + buffer
  const total = Math.max(target, cur.end) + 1
  const used = cur.end - base.end
  const over = cur.end - target
  const pct = (d: number) => (d / total) * 100
  const bump = (id: string, v: number) => setDelay(d => ({ ...d, [id]: Math.max(0, Math.min(8, (d[id] ?? 0) + v)) }))
  const preset = PRESETS.find(p => JSON.stringify(p[2]) === JSON.stringify(Object.fromEntries(Object.entries(delay).filter(([, v]) => v > 0))))?.[0] ?? ''

  let msg: ReactNode, tone: 'good' | 'mid' | 'bad'
  if (used <= 0) { msg = <>계획대로 <b>{base.end}일차</b>에 끝나요. 버퍼 {buffer}일은 그대로 남아 있어요. 지연이 하나도 없어도 버퍼는 지우지 마세요. 아직 모르는 일이 반드시 생겨요.</>; tone = 'good' }
  else if (over <= 0) { msg = <><b>{cur.end}일차</b>에 끝나요. 버퍼 {buffer}일 중 <b>{used}일</b>을 썼어요. 남은 버퍼 {buffer - used}일을 팀에 공유하세요. 버퍼를 쓰는 건 실패가 아니라 버퍼가 제 역할을 한 거예요.</>; tone = 'mid' }
  else { msg = <>출시 목표일보다 <b>{over}일 늦어요.</b> 지금 결정해야 해요. ① 범위를 줄이거나(무엇을 다음 버전으로 뺄지) ② 날짜를 옮기거나 ③ 사람을 더하거나. 마지막 날에 알리면 선택지가 사라져요.</>; tone = 'bad' }

  return (
    <Section id="plan-collab-gantt" wide title="일정 산정과 의존성 — 하나가 밀리면 뒤가 밀려요"
      desc="‘재주문 기능’의 작업 7개예요. 각 작업 오른쪽 +1을 눌러 지연을 만들어 보세요. 앞 작업이 끝나야 시작하는 작업(의존성)은 함께 밀리고, 여유가 있는 작업은 밀려도 출시일이 그대로예요.">
      <div className="cb-gantt-ctl">
        <Seg value={preset} onChange={v => setDelay({ ...(PRESETS.find(p => p[0] === v)?.[2] ?? {}) })} options={PRESETS.map(p => [p[0], p[1]] as const)} />
        <label className="cb-buf">버퍼
          <button type="button" className="cb-step" aria-label="버퍼 줄이기" onClick={() => setBuffer(b => Math.max(0, b - 1))}>−</button>
          <b data-buf>{buffer}일</b>
          <button type="button" className="cb-step" aria-label="버퍼 늘리기" onClick={() => setBuffer(b => Math.min(8, b + 1))}>+</button>
        </label>
      </div>
      <div className="cb-gantt" role="img" aria-label={`간트 차트. 출시 준비 완료 ${cur.end}일차, 목표 ${target}일차`}>
        <div className="cb-g-axis">
          <span className="cb-g-lab" />
          <div className="cb-g-track">
            {Array.from({ length: Math.ceil(total / 5) }, (_, w) => (
              <span key={w} className="cb-g-week" style={{ left: pct(w * 5) + '%', width: pct(5) + '%' }}>{w + 1}주차</span>
            ))}
          </div>
          <span className="cb-g-ctl" />
        </div>
        {TASKS.map(t => {
          const b = base.s[t.id], c = cur.s[t.id], dl = delay[t.id] ?? 0
          const pushed = c.ef - b.ef
          const crit = c.slack === 0
          return (
            <div key={t.id} className={'cb-g-row' + (crit ? ' crit' : '')} data-task={t.id}>
              <span className="cb-g-lab"><b>{t.name}</b><small>{t.who} · {t.dur}일{crit ? ' · 핵심 경로' : ` · 여유 ${c.slack}일`}</small></span>
              <div className="cb-g-track">
                {Array.from({ length: Math.ceil(total / 5) }, (_, w) => <i key={w} className="cb-g-grid" style={{ left: pct(w * 5) + '%' }} />)}
                <i className="cb-g-buf" style={{ left: pct(base.end) + '%', width: pct(buffer) + '%' }} />
                <i className="cb-g-ghost" style={{ left: pct(b.es) + '%', width: pct(t.dur) + '%' }} />
                <div className="cb-g-bar" style={{ left: pct(c.es) + '%', width: pct(c.dur) + '%' }}>
                  <span className="cb-g-plan" style={{ width: (t.dur / c.dur) * 100 + '%' }} />
                  {dl > 0 && <span className="cb-g-late" style={{ width: (dl / c.dur) * 100 + '%' }} />}
                </div>
                {pushed > 0 && <span className="cb-g-push" style={{ left: pct(c.ef) + '%' }}>+{pushed}일</span>}
                <i className="cb-g-target" style={{ left: pct(target) + '%' }} />
              </div>
              <span className="cb-g-ctl">
                <button type="button" className="cb-step" aria-label={`${t.name} 지연 줄이기`} disabled={!dl} onClick={() => bump(t.id, -1)}>−</button>
                <b className={dl ? 'late' : ''}>{dl ? `+${dl}` : '0'}</b>
                <button type="button" className="cb-step" aria-label={`${t.name} 1일 지연`} data-plus={t.id} onClick={() => bump(t.id, 1)}>+1</button>
              </span>
            </div>
          )
        })}
        <div className="cb-g-legend">
          <span><i className="lg plan" />계획</span><span><i className="lg late" />지연</span><span><i className="lg ghost" />원래 계획 위치</span>
          <span><i className="lg buf" />버퍼</span><span><i className="lg tgt" />출시 목표일 ({target}일차)</span><span><i className="lg crit" />핵심 경로(여유 0일)</span>
        </div>
      </div>
      <p className={'cb-result ' + tone} data-result={tone}>{msg}</p>

      <div className="cb-two">
        <div>
          <h4 className="cb-h4">공수를 묻는 법</h4>
          <ol className="cb-list">
            <li><b>통째로 묻지 말고 쪼개서 물어요.</b> “재주문 며칠 걸려요?” 대신 “주문 내역 6개월 필터, 품절 체크, 장바구니 담기 각각 며칠이에요?”</li>
            <li><b>확정된 자료를 주고 물어요.</b> 화면설계서와 정책이 없으면 개발자는 최악을 가정하거나, 반대로 너무 낙관해요. 무엇을 기준으로 산정했는지 함께 적어요.</li>
            <li><b>세 가지 숫자로 물어요.</b> “잘 되면 / 보통 / 꼬이면 며칠이에요?” 차이가 크면 그 작업에 모르는 게 많다는 신호예요.</li>
            <li><b>의존성을 물어요.</b> “이거 시작하려면 뭐가 먼저 끝나야 해요?” 다른 팀(결제·마케팅) 일이 끼면 따로 표시해요.</li>
            <li><b>버퍼는 숨기지 말고 따로 적어요.</b> 작업마다 몰래 하루씩 얹으면 아무도 위험을 못 봐요. 맨 끝에 ‘버퍼 n일’로 보이게 둬요.</li>
          </ol>
        </div>
        <div>
          <h4 className="cb-h4">이 차트에서 배울 것</h4>
          <ul className="cb-list">
            <li><b>핵심 경로</b>(굵은 테두리)는 여유가 0일인 작업이에요. 여기가 하루 밀리면 출시도 하루 밀려요.</li>
            <li>‘서버 3일 지연’을 눌러 보세요. 서버 API는 여유가 있어서 출시일이 그대로예요. 대신 여유를 다 써서 이제 서버도 핵심 경로가 돼요.</li>
            <li>‘디자인 3일 지연’은 앱 개발·통합·QA·출시를 전부 밀어요. 디자인 확정일을 일정표에 꼭 적어야 하는 이유예요.</li>
            <li>QA 재테스트는 자주 빠뜨리는 일정이에요. 버그가 나오면 고치고 <b>다시 테스트하는 시간</b>이 필요해요. <a href="#/plan/qa">QA · 출시 →</a></li>
          </ul>
        </div>
      </div>
    </Section>
  )
}

/* ================= 5. 변경 요청 처리 ================= */
const IMPACT = [
  { g: '화면', items: ['새 화면이 생기거나 기존 화면 구성이 바뀐다', '디자인을 다시 해야 한다', '빈 화면·오류 같은 상태 화면이 추가된다'] },
  { g: '정책', items: ['기존 정책(취소·환불·쿠폰·정산)과 부딪힌다', '어드민 또는 사장님 화면도 바뀐다', '약관·개인정보 안내 문구가 바뀐다'] },
  { g: '일정', items: ['이미 끝난 작업을 다시 해야 한다', '다른 팀(결제·마케팅·CS)의 일이 생긴다', '핵심 경로 작업이 늘어난다'] },
  { g: 'QA', items: ['테스트 케이스를 새로 써야 한다', '이미 통과한 테스트를 다시 해야 한다(회귀)', '이벤트 로그를 새로 정의해야 한다'] },
] as const
const STAGES = [['plan', '기획 중'], ['dev', '개발 중'], ['qa', 'QA 중 (출시 1주 전)']] as const
const NEEDS = [['must', '법·장애·결제 오류'], ['goal', '이번 목표 지표에 직접 영향'], ['nice', '있으면 좋음']] as const

function ChangeRequest() {
  const [req, setReq] = useState('재주문할 때 지난 주문에 쓴 쿠폰도 자동으로 다시 적용되게 해주세요.')
  const [from, setFrom] = useState('마케팅팀')
  const [stage, setStage] = useState<(typeof STAGES)[number][0]>('qa')
  const [need, setNeed] = useState<(typeof NEEDS)[number][0]>('nice')
  const [on, setOn] = useState<Record<string, boolean>>({ '정책-0': true, '정책-1': true, '일정-1': true, 'QA-0': true, 'QA-1': true, '화면-2': true })
  const score = Object.values(on).filter(Boolean).length
  const groups = IMPACT.map(g => ({ g: g.g, n: g.items.filter((_, i) => on[`${g.g}-${i}`]).length }))

  let verdict: { k: 'accept' | 'trade' | 'defer'; t: string; d: string }
  if (need === 'must') verdict = { k: 'accept', t: '받아요 — 대신 일정이나 범위를 다시 합의해요', d: '법·장애·결제 오류는 미룰 수 없어요. 다만 “그냥 추가”가 아니라, 늘어난 공수만큼 무엇을 빼거나 날짜를 얼마나 옮길지 결정자와 같이 정해요.' }
  else if (stage === 'qa' || (stage === 'dev' && score >= 5)) verdict = { k: 'defer', t: '다음 버전으로 미뤄요', d: `지금 받으면 이미 통과한 테스트를 다시 해야 하고 출시가 흔들려요. 거절이 아니라 “v1.1 후보”로 백로그에 올리고, 요청자에게 언제 검토할지 날짜를 알려줘요.` }
  else if (score <= 2 && stage === 'plan') verdict = { k: 'accept', t: '이번에 받아요', d: '아직 기획 중이고 영향 범위가 작아요. 문서(화면설계서·정책)에 반영하고 변경 이력에 남겨요.' }
  else verdict = { k: 'trade', t: '받는다면, 무엇을 뺄지 같이 정해요', d: `영향이 ${score}곳이에요. 일정이 그대로라면 다른 기능 하나를 빼야 해요. ‘받는다/안 받는다’ 대신 “이걸 넣으면 저걸 빼야 하는데 어느 쪽이 목표에 더 중요해요?”라고 물어요. 우선순위 비교는 RICE로 해요.` }

  const list = groups.filter(g => g.n).map(g => `${g.g} ${g.n}곳`).join(', ')
  const moved = list ? `${list}이 다시 움직여서` : '막바지 단계라'
  const say = verdict.k === 'defer'
    ? `좋은 아이디어예요. 지금 넣으면 ${moved} 출시가 흔들려요. 이번엔 v1.1 후보로 올리고, 출시 2주 리뷰 때 데이터와 같이 다시 볼게요. 괜찮으세요?`
    : verdict.k === 'trade'
      ? `넣을 수 있어요. 다만 ${moved}, 일정을 지키려면 다른 기능 하나를 빼야 해요. 어느 쪽이 이번 목표에 더 중요할까요?`
      : need === 'must'
        ? `바로 반영할게요. 대신 ${moved} 일정을 다시 잡아야 해요. 오늘 안에 새 일정과 뺄 범위를 공유드릴게요.`
        : `지금 단계라 반영할 수 있어요. 문서에 넣고 변경 이력에 남겨서 공유드릴게요.`
  const md = [
    `# 변경 요청: ${req}`, `- 요청자: ${from}`, `- 받은 시점: ${STAGES.find(s => s[0] === stage)?.[1]}`, `- 필요한 이유: ${NEEDS.find(s => s[0] === need)?.[1]}`, '',
    '## 영향도', ...IMPACT.flatMap(g => [`### ${g.g}`, ...g.items.map((t, i) => `- [${on[`${g.g}-${i}`] ? 'x' : ' '}] ${t}`)]), '',
    `## 판단: ${verdict.t}`, verdict.d, '', '## 결정', '- 결정자: ', '- 결정일: ', '- 의사결정 기록 번호: D-',
  ].join('\n')

  return (
    <Section id="plan-collab-change" wide title="변경 요청 처리 — 영향도를 보고 정해요"
      desc="출시 1주 전에 들어온 “간단한 거 하나만요”는 간단하지 않아요. 바로 ‘네’나 ‘안 돼요’라고 하지 말고, 영향도를 체크해서 숫자로 보여 주세요.">
      <div className="cb-change">
        <div className="cb-col">
          <Field label="변경 요청"><textarea className="cb-in" rows={2} value={req} onChange={e => setReq(e.target.value)} /></Field>
          <Field label="요청자"><input className="cb-in" value={from} onChange={e => setFrom(e.target.value)} /></Field>
          <div className="cb-fld"><span className="cb-lab">지금 단계</span><Seg value={stage} onChange={setStage} options={STAGES} /></div>
          <div className="cb-fld"><span className="cb-lab">필요한 이유</span><Seg value={need} onChange={setNeed} options={NEEDS} /></div>
          <div className="cb-impact">
            {IMPACT.map(g => (
              <fieldset key={g.g}>
                <legend>{g.g} <small>{groups.find(x => x.g === g.g)?.n}</small></legend>
                {g.items.map((t, i) => {
                  const k = `${g.g}-${i}`
                  return <label key={k} className="opt"><input type="checkbox" checked={!!on[k]} onChange={() => setOn(o => ({ ...o, [k]: !o[k] }))} /><span>{t}</span></label>
                })}
              </fieldset>
            ))}
          </div>
        </div>
        <div className="cb-col cb-sticky">
          <div className="cb-meter">
            {groups.map(g => (
              <div key={g.g} className="cb-meter-row"><span>{g.g}</span><div className="cb-bar"><i style={{ width: (g.n / 3) * 100 + '%' }} /></div><b>{g.n}/3</b></div>
            ))}
          </div>
          <div className={'cb-verdict-box ' + verdict.k} data-verdict={verdict.k}>
            <small>영향 {score}곳 · {STAGES.find(s => s[0] === stage)?.[1]}</small>
            <b>{verdict.t}</b>
            <p>{verdict.d}</p>
          </div>
          <Note><b>요청자에게 이렇게 말해요:</b> “{say}” — 영향 범위와 다음 일정을 함께 말하면 거절처럼 들리지 않아요.</Note>
          <div className="cb-row"><DlBtn name="변경-요청.md" text={md}>↓ 변경 요청서 .md</DlBtn><a className="cb-link" href="#/plan/priority">우선순위 비교(RICE) →</a></div>
        </div>
      </div>
    </Section>
  )
}

/* ================= 6. 용어 사전 ================= */
type Term = { term: string; avoid: string; def: string; code: string }
const TERMS0: Term[] = [
  { term: '구매자', avoid: '고객, 유저, 이용자', def: '반찬을 주문하는 사람. 로그인 여부는 ‘회원/비회원’으로 따로 말해요.', code: 'buyer' },
  { term: '사장님', avoid: '판매자, 셀러, 업주', def: '오늘반찬에 가게를 연 반찬가게 주인. 문서와 화면 문구 모두 ‘사장님’으로 써요.', code: 'seller' },
  { term: '운영자', avoid: '관리자, 운영팀원', def: '오늘반찬 본사 직원. 권한이 더 넓은 ‘최고관리자’와 구분해요.', code: 'operator' },
  { term: '운영자 센터', avoid: '어드민, 백오피스, 관리자 페이지', def: '운영자가 쓰는 내부 화면. 사장님이 쓰는 ‘사장님 앱’과 헷갈리지 않게 불러요.', code: 'admin' },
  { term: '품절', avoid: '매진, 재고없음', def: '오늘은 더 팔 수 없는 상태. 메뉴를 아예 내린 ‘판매중지’와 다른 상태예요.', code: 'sold_out' },
  { term: '판매중지', avoid: '숨김, 비활성', def: '사장님이 메뉴를 목록에서 내린 상태. 다시 올리기 전까지 보이지 않아요.', code: 'suspended' },
  { term: '구매확정', avoid: '거래완료, 수령확인', def: '구매자가 받았다고 확인했거나 자동으로 확정된 상태. 이후 취소가 안 되고 리뷰를 쓸 수 있어요.', code: 'confirmed' },
]
const hasBatchim = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 }
const PARTICLE: Record<string, [string, string]> = { 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'] }
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function Glossary() {
  const [terms, setTerms] = useState(TERMS0)
  const [text, setText] = useState('고객이 재주문을 누르면 매진된 메뉴는 빠지고, 판매자에게 주문 알림이 가요. 관리자는 어드민에서 확인해요.')
  const map = useMemo(() => {
    const m = new Map<string, string>()
    terms.forEach(t => t.avoid.split(',').map(s => s.trim()).filter(Boolean).forEach(a => m.set(a, t.term)))
    return m
  }, [terms])
  const parts = useMemo(() => {
    const keys = [...map.keys()].sort((a, b) => b.length - a.length)
    if (!keys.length) return [text]
    return text.split(new RegExp(`(${keys.map(escRe).join('|')})`, 'g'))
  }, [text, map])
  const hits = parts.filter(p => map.has(p)).length
  const fixed = parts.map((p, i) => {
    const prev = i > 0 ? map.get(parts[i - 1]) : undefined
    if (prev && PARTICLE[p[0]] && (p.length === 1 || /[\s.,!?]/.test(p[1]))) return PARTICLE[p[0]][hasBatchim(prev) ? 0 : 1] + p.slice(1)
    return map.get(p) ?? p
  }).join('')
  const upd = (i: number, p: Partial<Term>) => setTerms(ts => ts.map((t, j) => (j === i ? { ...t, ...p } : t)))
  const csv = toCSV([['표준 용어', '쓰지 않는 말', '정의', '코드·DB 이름'], ...terms.map(t => [t.term, t.avoid, t.def, t.code])])

  return (
    <Section id="plan-collab-glossary" wide title="팀 용어 사전 — 같은 것을 다르게 부르지 않기"
      desc="기획서엔 ‘고객’, 디자인엔 ‘회원’, 개발 코드엔 ‘user’라고 쓰면 세 사람이 다른 걸 떠올려요. 표준 용어 하나를 정하고, 쓰지 않을 말도 같이 적어요.">
      <div className="cb-lint">
        <Field label="문장 검사 — 문서나 티켓 문장을 붙여 넣어 보세요"><textarea className="cb-in" rows={2} value={text} onChange={e => setText(e.target.value)} /></Field>
        <div className="cb-lint-out" aria-live="polite">
          <p className="cb-lint-p">{parts.map((p, i) => (map.has(p) ? <mark key={i} title={`→ ${map.get(p)}`}>{p}<sup>{map.get(p)}</sup></mark> : <span key={i}>{p}</span>))}</p>
          {hits ? <p className="cb-lint-fix"><b>고친 문장 ({hits}곳):</b> {fixed}</p> : <p className="cb-good">사전과 다른 말이 없어요.</p>}
        </div>
      </div>
      <div className="sys-table-wrap">
        <table className="sys-table cb-gtable">
          <thead><tr><th style={{ width: '14%' }}>표준 용어</th><th style={{ width: '22%' }}>쓰지 않는 말 (쉼표로 구분)</th><th>정의</th><th style={{ width: '14%' }}>코드·DB 이름</th><th style={{ width: 40 }} /></tr></thead>
          <tbody>
            {terms.map((t, i) => (
              <tr key={i}>
                <td><input className="cb-in b" aria-label="표준 용어" value={t.term} onChange={e => upd(i, { term: e.target.value })} /></td>
                <td><input className="cb-in" aria-label="쓰지 않는 말" value={t.avoid} onChange={e => upd(i, { avoid: e.target.value })} /></td>
                <td><input className="cb-in" aria-label="정의" value={t.def} onChange={e => upd(i, { def: e.target.value })} /></td>
                <td><input className="cb-in mono" aria-label="코드 이름" value={t.code} onChange={e => upd(i, { code: e.target.value })} /></td>
                <td><button type="button" className="cb-x" aria-label="삭제" onClick={() => setTerms(ts => ts.filter((_, j) => j !== i))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cb-row">
        <button type="button" className="btn ghost sm" onClick={() => setTerms([...terms, { term: '', avoid: '', def: '', code: '' }])}>+ 용어 추가</button>
        <DlBtn name="용어-사전.csv" text={csv} type="text/csv">↓ 용어 사전 CSV</DlBtn>
      </div>
      <Note tone="tip"><b>‘회원’은 왜 표준 용어가 아닐까요?</b> 회원은 사람이 아니라 <b>상태</b>예요(회원/비회원). “구매자가 비회원이면 주문 조회에 휴대폰 인증을 받는다”처럼 쓰면 헷갈리지 않아요. 용어 사전은 화면 문구의 기준도 돼요. 디자이너와 개발자가 컴포넌트 이름을 다르게 부르는 것도 같은 문제예요. <a href="#/system/components">컴포넌트 사전 →</a></Note>
    </Section>
  )
}

/* ================= 7. 좋은 티켓 vs 나쁜 티켓 ================= */
const BAD_TICKET = `제목: 재주문 버튼

재주문 버튼 만들어 주세요.
디자인은 피그마 보시면 됩니다.
급합니다!!`
const GOOD_TICKET = `[ORD-03] 주문 내역 목록에 ‘재주문’ 버튼 추가

## 왜
최근 주문을 다시 사려면 가게 → 메뉴 → 담기를 반복해야 해요.
목표: 주문 내역에서 재주문 완료까지 3번 탭 이하. (PRD: 재주문 v1)

## 무엇을
- 화면: ORD-03 주문 내역 목록, 각 주문 카드 오른쪽 하단
- 디자인: 피그마 ‘재주문 v1 / ORD-03’ 프레임 (11/8 확정본)
- 정책: D-001 품절 처리, D-003 가격 기준

## 인수 조건
- [ ] 최근 6개월 주문만 최신순으로 보인다
- [ ] 취소된 주문에는 버튼이 없고 카드가 회색이다
- [ ] 품절 메뉴는 빼고 담고, “품절된 n개 메뉴는 빼고 담았어요” 토스트를 띄운다
- [ ] 가격은 현재 가격으로 다시 계산한다

## 하지 않음
- 쿠폰 재적용 (v1.1 후보)

## 이벤트 로그
- reorder_button_click { order_id, item_count, soldout_count }

담당: 앱 / 리뷰: 기획 Palmer / 기한: 11/21 (QA 시작 11/24)`
const TICKET_TPL = `[화면 ID] 한 줄로 무엇을 하는지

## 왜
(문제와 목표 한두 줄. PRD 링크)

## 무엇을
- 화면:
- 디자인: (확정본 링크와 날짜)
- 정책: (의사결정 기록 번호)

## 인수 조건
- [ ]
- [ ]

## 하지 않음
-

## 이벤트 로그
-

담당: / 리뷰: / 기한:`
const TICKET_NOTES = [
  ['제목', '“재주문 버튼”만으론 어느 화면인지 몰라요.', '화면 ID + 동사로 시작해요. 검색도 잘 돼요.'],
  ['이유', '왜 하는지 없으면 개발자가 더 나은 방법을 제안할 수 없어요.', '문제와 목표 숫자를 한 줄로.'],
  ['디자인', '“피그마 보세요”는 어느 버전인지 몰라요.', '프레임 이름과 확정 날짜를 적어요.'],
  ['완료 기준', '언제 끝난 건지 아무도 몰라요. QA도 무엇을 확인할지 몰라요.', '인수 조건 체크리스트가 곧 완료 기준이에요.'],
  ['범위', '쿠폰도 되는 줄 알고 만들 수 있어요.', '‘하지 않음’을 적어요.'],
  ['기한', '“급합니다”는 날짜가 아니에요.', '날짜와 그 이유(QA 시작일)를 적어요.'],
] as const

function Tickets() {
  const [v, setV] = useState<'bad' | 'good'>('bad')
  return (
    <Section id="plan-collab-ticket" wide title="개발자·디자이너에게 전달하는 법 — 좋은 티켓 vs 나쁜 티켓"
      desc="티켓은 ‘말로 다 설명했으니 대충 써도 되는 메모’가 아니에요. 담당자가 휴가 간 사이에 다른 사람이 받아도 일할 수 있어야 해요.">
      <Seg value={v} onChange={setV} options={[['bad', '나쁜 티켓'], ['good', '좋은 티켓']]} />
      <div className="cb-ticket">
        <pre className={'cb-pre ' + v} data-ticket={v}>{v === 'bad' ? BAD_TICKET : GOOD_TICKET}</pre>
        <ul className="cb-tnotes">
          {TICKET_NOTES.map(([k, bad, good]) => (
            <li key={k} className={v}><b>{k}</b><span>{v === 'bad' ? bad : good}</span></li>
          ))}
        </ul>
      </div>
      <div className="cb-two">
        <CodeBlock code={TICKET_TPL} label="티켓 템플릿.md" maxHeight={300} />
        <div>
          <h4 className="cb-h4">전달할 때 같이 하는 것</h4>
          <ul className="cb-list">
            <li><b>티켓만 던지지 말고 10분 같이 읽어요.</b> 읽으면서 나오는 질문이 곧 빠진 정책이에요.</li>
            <li><b>디자이너에게는 화면보다 상황을 먼저 줘요.</b> “품절 메뉴가 섞인 주문을 재주문할 때”처럼. 해결책(“토스트로 해주세요”)은 열어 둬요.</li>
            <li><b>질문 답은 티켓에 다시 적어요.</b> 메신저에만 남은 답은 사라져요.</li>
            <li><b>바뀌면 바뀌었다고 알려요.</b> 조용히 문서만 고치면 이미 만든 사람이 몰라요.</li>
          </ul>
          <DlBtn name="티켓-템플릿.md" text={TICKET_TPL}>↓ 티켓 템플릿 받기</DlBtn>
        </div>
      </div>
    </Section>
  )
}

/* ================= 탭 ================= */
export default function Tab() {
  return (
    <div data-plan="collab">
      <SysGrid>
        <Section id="plan-collab-why" wide title="협업은 ‘말’이 아니라 ‘남기는 것’이에요"
          desc="기획자의 산출물은 문서지만, 기획자의 진짜 일은 사람들이 같은 그림을 보게 만드는 거예요. 그 방법은 대부분 아무도 가르쳐 주지 않아요.">
          <div className="cb-mistakes">
            {[
              ['요청을 받자마자 화면부터 그려요', '문제·성공 기준·범위를 묻지 않으면 다시 그리게 돼요.', 'plan-collab-intake'],
              ['회의록에 대화를 받아 적어요', '결정과 할 일이 묻혀서 같은 회의를 또 해요.', 'plan-collab-meeting'],
              ['“일단 해볼게요”로 일정을 정해요', '의존성을 모르면 하나가 밀릴 때 전부 밀려요.', 'plan-collab-gantt'],
              ['변경 요청에 바로 “네”라고 해요', '영향도를 안 보면 출시 직전에 QA가 무너져요.', 'plan-collab-change'],
            ].map(([t, d, id]) => (
              <a key={id} className="cb-mistake" href={`#${id}`} onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
                <b>{t}</b><span>{d}</span><small>바로 가기 ↓</small>
              </a>
            ))}
          </div>
        </Section>
        <Intake />
        <MeetingNotes />
        <DecisionLog />
        <Gantt />
        <ChangeRequest />
        <Glossary />
        <Tickets />
        <Section id="plan-collab-check" title="사수의 체크리스트" desc="부사수가 문서를 들고 오면 제가 실제로 묻는 질문이에요.">
          <Check storeKey="collab" items={[
            '요청자에게 “제가 이해한 게 맞나요?”를 글로 확인받았나요?',
            '성공 기준이 출시 후에 숫자로 확인할 수 있는 문장인가요?',
            '‘이번에 하지 않을 것’을 적었나요?',
            '회의록의 모든 할 일에 담당자와 날짜가 있나요?',
            '“아마”, “일단”으로 끝난 이야기를 미결 이슈로 옮겼나요?',
            '일정표에 디자인 확정일, QA 재테스트, 버퍼가 따로 보이나요?',
            '변경 요청을 받을 때 영향도와 “무엇을 뺄지”를 같이 말했나요?',
            '문서·화면 문구·코드에서 같은 것을 같은 이름으로 부르나요?',
          ]} />
        </Section>
        <Section id="plan-collab-ref" title="참고" desc="더 깊이 보고 싶을 때 읽어요.">
          <ul className="cb-list">
            <li>Marty Cagan, 『인스파이어드(INSPIRED)』 — 제품팀에서 PM이 맡는 역할과 이해관계자 관리</li>
            <li>Atlassian Agile Coach / Team Playbook — 회의 진행, 의사결정(DACI), 일정·의존성 관리</li>
            <li>Michael Nygard, “Documenting Architecture Decisions” — ADR(의사결정 기록) 형식의 시작점</li>
            <li>이 노트의 다른 탭: <a href="#/plan/prd">문제 정의 · PRD</a>, <a href="#/plan/priority">우선순위</a>, <a href="#/plan/qa">QA · 출시</a></li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
