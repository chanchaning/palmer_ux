import { useMemo, useState, type ReactNode } from 'react'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { Seg } from '../../components/ui'
import { download } from '../../system/export'
import './qa.css'

/* ================= 공용 조각 ================= */
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const toCSV = (rows: string[][]) => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n')

function DlBtn({ name, text, type = 'text/markdown', children, ghost }: { name: string; text: string; type?: string; children: ReactNode; ghost?: boolean }) {
  return <button type="button" className={'btn sm' + (ghost ? ' ghost' : '')} data-dl={name} onClick={() => download(name, text, type)}>{children}</button>
}
function Field({ label, children, hint, bad, className = '' }: { label: ReactNode; children: ReactNode; hint?: ReactNode; bad?: boolean; className?: string }) {
  return (
    <label className={'qa-fld ' + className + (bad ? ' bad' : '')}>
      <span className="qa-lab">{label}</span>
      {children}
      {hint && <span className="qa-hint">{hint}</span>}
    </label>
  )
}
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/* ================= 1. 인수 조건 → 테스트 케이스 ================= */
type Kind = '정상' | '경계' | '예외'
type Status = '미실행' | '통과' | '실패' | '보류'
type TC = { id: string; ac: string; kind: Kind; pre: string; steps: string; exp: string; act: string; st: Status }
type Sug = Omit<TC, 'id' | 'act' | 'st'> & { key: string; note?: string }

const ACS = [
  { id: 'AC1', text: '주문 내역에는 최근 6개월 주문만 최신순으로 보인다.', gwt: 'Given 6개월 이내 주문과 그 이전 주문이 있는 구매자 / When 주문 내역을 열면 / Then 6개월 이내 주문만 최신순으로 보인다' },
  { id: 'AC2', text: '취소된 주문은 회색으로 보이고 재주문 버튼이 없다.', gwt: 'Given 취소된 주문이 있는 구매자 / When 주문 내역을 열면 / Then 그 주문 카드는 회색이고 재주문 버튼이 없다' },
  { id: 'AC3', text: '재주문하면 판매 중인 메뉴만 장바구니에 담기고, 품절이 있으면 “품절된 n개 메뉴는 빼고 담았어요” 토스트가 뜬다.', gwt: 'Given 품절 메뉴가 섞인 지난 주문 / When 재주문을 누르면 / Then 판매 중인 메뉴만 담기고 뺀 개수가 토스트로 보인다' },
  { id: 'AC4', text: '가격은 재주문하는 시점의 현재 가격으로 다시 계산된다.', gwt: 'Given 지난 주문 이후 가격이 바뀐 메뉴 / When 재주문하면 / Then 장바구니에는 현재 가격이 보인다' },
] as const

const SUGS: Sug[] = [
  { key: 'a1', ac: 'AC1', kind: '정상', pre: '3개월 전 주문 1건, 어제 주문 1건이 있는 구매자 계정', steps: '1. 로그인\n2. 마이 > 주문 내역(ORD-03) 진입', exp: '두 주문이 모두 보이고 어제 주문이 맨 위에 있다' },
  { key: 'a2', ac: 'AC1', kind: '경계', pre: '정확히 6개월 전 날짜의 주문이 있는 계정', steps: '1. 주문 내역 진입\n2. 목록 맨 아래까지 스크롤', exp: '정책에 따라 보이거나 보이지 않는다 (6개월 “당일” 포함 여부 확인 필요)', note: '경계값을 쓰다 보면 정책 구멍이 보여요. “6개월 전 당일은 포함인가요?”를 기획에 물어요.' },
  { key: 'a3', ac: 'AC1', kind: '경계', pre: '6개월 + 1일 전 주문만 있는 계정', steps: '1. 주문 내역 진입', exp: '주문이 보이지 않고 빈 화면(EMP-01) “최근 6개월 동안 주문한 반찬이 없어요”가 보인다' },
  { key: 'a4', ac: 'AC2', kind: '정상', pre: '취소된 주문 1건이 있는 계정', steps: '1. 주문 내역 진입\n2. 취소된 주문 카드 확인', exp: '카드가 회색이고 ‘취소됨’ 라벨이 있으며 재주문 버튼이 없다' },
  { key: 'a5', ac: 'AC2', kind: '예외', pre: '3개 메뉴 중 1개만 부분 취소된 주문', steps: '1. 주문 내역 진입\n2. 부분 취소 주문 카드 확인', exp: '(AC에 없음) 부분 취소 주문의 표시와 재주문 가능 여부를 정책으로 정해야 한다', note: 'AC에 없는 상황이 나오면 TC를 쓰지 말고 먼저 기획에 질문을 남겨요.' },
  { key: 'a6', ac: 'AC3', kind: '정상', pre: '모든 메뉴가 판매 중인 지난 주문', steps: '1. 주문 내역 진입\n2. 재주문 탭', exp: '모든 메뉴가 같은 수량으로 장바구니에 담기고 토스트는 뜨지 않는다' },
  { key: 'a7', ac: 'AC3', kind: '예외', pre: '3개 메뉴 중 2개가 오늘 품절인 지난 주문', steps: '1. 주문 내역 진입\n2. 재주문 탭', exp: '판매 중인 1개만 담기고 “품절된 2개 메뉴는 빼고 담았어요” 토스트가 뜬다' },
  { key: 'a8', ac: 'AC3', kind: '경계', pre: '모든 메뉴가 품절인 지난 주문', steps: '1. 주문 내역 진입\n2. 재주문 탭', exp: '(AC에 없음) 담을 메뉴가 0개일 때의 안내가 정해져 있어야 한다', note: '“n개 빼고 담았어요”는 n이 전체일 때 어색해요. 0개 담김은 다른 문구가 필요해요.' },
  { key: 'a9', ac: 'AC3', kind: '예외', pre: '장바구니에 다른 가게 메뉴가 담겨 있는 상태', steps: '1. 다른 가게 메뉴를 담아 둠\n2. 주문 내역에서 재주문 탭', exp: '“장바구니에는 한 가게 메뉴만 담을 수 있어요. 비우고 담을까요?” 확인 모달이 뜬다' },
  { key: 'a10', ac: 'AC4', kind: '정상', pre: '지난 주문 때 8,000원 → 현재 8,500원인 메뉴', steps: '1. 재주문 탭\n2. 장바구니 진입', exp: '장바구니에 8,500원으로 보이고 합계도 현재 가격으로 계산된다' },
]
const VAGUE = /정상적으로|정상 동작|잘 |올바르게|적절히|문제없이|제대로/
const tcFrom = (s: Sug, n: number): TC => ({ id: `TC-REORD-${String(n).padStart(3, '0')}`, ac: s.ac, kind: s.kind, pre: s.pre, steps: s.steps, exp: s.exp, act: '', st: '미실행' })

/* ================= 2. 결함 등급 ================= */
const LEVELS = [
  { k: 'Blocker', ko: '막힘', def: '핵심 흐름이 막히고 우회할 방법이 없어요. 다음 테스트도 진행할 수 없어요.', ex: '재주문 버튼을 누르면 앱이 꺼져요. / 결제하기를 누르면 무한 로딩이에요.', act: '출시 불가 · 즉시 수정' },
  { k: 'Critical', ko: '치명', def: '핵심 기능이 틀리게 동작하거나 돈·개인정보·데이터가 잘못돼요.', ex: '쿠폰이 두 번 적용돼 결제 금액이 틀려요. / 주문 내역에 다른 사람의 주문이 보여요.', act: '출시 불가 · 우선 수정' },
  { k: 'Major', ko: '주요', def: '주요 기능이 안 되지만 우회할 방법이 있어요.', ex: '재주문 버튼이 안 눌려서 가게에 들어가 메뉴를 직접 다시 담아야 해요.', act: '출시 전 수정이 원칙 · 못 고치면 PO가 위험을 알고 결정' },
  { k: 'Minor', ko: '보통', def: '기능은 되지만 일부 상황에서 어긋나거나 불편해요.', ex: '품절 토스트의 개수가 실제와 1개 다르게 나와요. / 가로 모드에서 버튼 일부가 잘려요.', act: '일정에 맞춰 수정 · 다음 버전 가능' },
  { k: 'Trivial', ko: '사소', def: '사용에 영향은 없고 보기에만 거슬려요.', ex: '여백이 시안보다 2px 넓어요. / 안내 문구 띄어쓰기가 틀려요.', act: '여유 있을 때 수정' },
] as const
type Lv = (typeof LEVELS)[number]['k']
const QUIZ: { bug: string; a: Lv; why: string }[] = [
  { bug: 'iOS에서 결제 완료 후 “주문 완료” 화면 대신 흰 화면이 뜨고, 앱을 다시 켜야 해요. 주문은 정상 접수돼요.', a: 'Major', why: '주문은 들어갔고 앱을 다시 켜면 확인할 수 있어서 우회가 돼요. 다만 구매자는 결제가 됐는지 몰라 불안해요. 중복 결제로 이어지면 Critical로 올려요.' },
  { bug: '사장님 앱에서 품절 처리한 메뉴가 구매자 앱에선 30분 동안 계속 주문 가능해요.', a: 'Critical', why: '팔 수 없는 메뉴가 결제돼요. 돈이 오가고 취소·환불이 생기는 데이터 오류예요.' },
  { bug: '주문 내역의 재주문 버튼 글자가 다크 모드에서 배경과 비슷한 색이라 잘 안 보여요.', a: 'Minor', why: '기능은 되지만 일부 환경에서 불편해요. 대비 기준을 못 넘으면 접근성 문제라 우선순위를 높일 수 있어요.' },
  { bug: '로그인 후 첫 화면에서 아무 버튼도 눌리지 않아요. 다른 테스트를 진행할 수 없어요.', a: 'Blocker', why: '모든 흐름이 막히고 우회가 없어요. 테스트도 멈춰요.' },
  { bug: '토스트 문구가 “빼고 담았어요.”로 끝나는데, 다른 토스트들은 마침표가 없어요.', a: 'Trivial', why: '사용에 영향이 없는 표기 불일치예요. 모아서 한 번에 고쳐요.' },
]

/* ================= 탭 ================= */
type Bug = { title: string; env: string; pre: string; steps: string; exp: string; act: string; freq: string; sev: Lv; shot: string }
const BUG0: Bug = {
  title: '[ORD-03] 품절 메뉴가 섞인 주문을 재주문하면 토스트 개수가 1개 적게 나옴',
  env: 'iOS 18.1 / iPhone 15 / 오늘반찬 1.4.0 (QA 서버)',
  pre: '테스트 계정 qa_buyer01, 11/3 “엄마손반찬” 주문(메뉴 3개 중 2개 오늘 품절)',
  steps: '1. 마이 > 주문 내역 진입\n2. 11/3 주문의 재주문 탭\n3. 토스트 문구 확인',
  exp: '“품절된 2개 메뉴는 빼고 담았어요”',
  act: '“품절된 1개 메뉴는 빼고 담았어요” (장바구니에는 1개만 담김 — 담긴 것은 맞음)',
  freq: '5번 중 5번 (항상)',
  sev: 'Minor',
  shot: 'toast_count.png, 화면 녹화 12초',
}
const BAD_BUG = `제목: 재주문 이상해요

재주문 눌렀는데 이상하게 나와요.
확인 부탁드려요!`

export default function Tab() {
  const [tcs, setTcs] = useState<TC[]>(() => ['a1', 'a3', 'a4', 'a7'].map((k, i) => tcFrom(SUGS.find(s => s.key === k)!, i + 1)))
  const [bug, setBug] = useState<Bug>(BUG0)
  const [fromTc, setFromTc] = useState<string>('')
  const sendToBug = (t: TC) => {
    setBug({ ...BUG0, title: `[${t.id}] ${t.exp.slice(0, 40)}${t.exp.length > 40 ? '…' : ''} — 기대와 다름`, pre: t.pre, steps: t.steps, exp: t.exp, act: t.act || '(실제 결과를 적어요)', freq: '', shot: '' })
    setFromTc(t.id)
    setTimeout(() => scrollTo('plan-qa-bug'), 30)
  }
  return (
    <div data-plan="qa">
      <SysGrid>
        <Section id="plan-qa-why" wide title="QA는 QA팀만의 일이 아니에요"
          desc="주니어가 가장 많이 하는 오해가 “테스트는 QA가 알아서 하겠지”예요. 무엇이 맞는 동작인지 정한 사람은 기획자예요. 기대 결과를 쓸 수 있는 사람도 기획자뿐이에요.">
          <div className="qa-flow" aria-label="인수 조건에서 회고까지 흐름">
            {[
              ['인수 조건(AC)', 'PRD에서 “무엇이 되면 끝인가”', 'plan-qa-tc'],
              ['테스트 케이스', 'AC마다 정상·경계·예외', 'plan-qa-tc'],
              ['결함 등급', '무엇을 먼저 고칠까', 'plan-qa-sev'],
              ['출시 체크리스트', '기능 밖의 준비까지', 'plan-qa-release'],
              ['출시 후 2주', '지표로 결과 확인', 'plan-qa-review'],
              ['회고', '다음엔 무엇을 다르게', 'plan-qa-kpt'],
            ].map(([t, d, id], i) => (
              <button type="button" key={t} className="qa-flow-step" onClick={() => scrollTo(id)}>
                <span className="qa-flow-n">{i + 1}</span><b>{t}</b><small>{d}</small>
              </button>
            ))}
          </div>
        </Section>
        <TcWriter tcs={tcs} setTcs={setTcs} onBug={sendToBug} />
        <Severity />
        <BugReport bug={bug} setBug={setBug} fromTc={fromTc} />
        <Release />
        <Review />
        <Kpt />
        <Section id="plan-qa-design" title="디자인 QA도 같이 봐요" desc="기능 QA가 “동작이 맞나”라면, 디자인 QA는 “시안대로, 모든 상태가 있나”예요.">
          <ul className="qa-list">
            <li><b>6대 상태가 다 있나요?</b> 기본·눌림·비활성·로딩·오류·빈 화면. 개발자는 시안에 없는 상태를 임의로 만들어요. <a href="#/system/state">상태·모션 →</a></li>
            <li><b>빈 화면이 정책과 맞나요?</b> 첫 사용, 검색 결과 0건, 필터 0건은 문구가 달라요. <a href="#/empty">빈 화면 가이드 →</a></li>
            <li><b>토스트·모달이 맞는 자리에 쓰였나요?</b> 품절 안내처럼 놓치면 안 되는 내용을 금방 사라지는 토스트로 보내도 되는지 봐요. <a href="#/feedback">피드백 가이드 →</a></li>
            <li><b>긴 글자·큰 글씨에서 깨지지 않나요?</b> 200자 메뉴 이름, 시스템 글자 크기 최대로 확인해요.</li>
          </ul>
        </Section>
        <Section id="plan-qa-check" title="사수의 체크리스트" desc="출시 전 리뷰에서 제가 실제로 묻는 질문이에요.">
          <Check items={[
            'AC 하나마다 정상·경계·예외 테스트 케이스가 하나 이상 있나요?',
            '기대 결과에 “정상적으로”, “잘” 대신 보이는 결과(문구·숫자·화면 ID)를 적었나요?',
            'TC를 쓰다가 나온 정책 질문을 기획 문서에 반영했나요?',
            '결함 등급 기준을 출시 전에 팀과 합의했나요?',
            '남은 Major 이상 결함마다 “안 고치고 출시”를 누가 결정했는지 남겼나요?',
            '기능 플래그나 롤백 방법, 그리고 롤백을 결정할 사람이 정해져 있나요?',
            '출시 2주 뒤에 볼 지표와 목표 숫자가 출시 전에 정해져 있나요?',
            '회고의 Try마다 담당자와 다음 확인 날짜가 있나요?',
          ]} />
        </Section>
        <Section id="plan-qa-ref" title="참고" desc="더 깊이 보고 싶을 때 읽어요.">
          <ul className="qa-list">
            <li>ISTQB Glossary — 결함 심각도(severity)와 우선순위(priority)의 구분, 경계값 분석</li>
            <li>Atlassian Team Playbook — 회고(Retrospective) 진행 방법</li>
            <li>Marty Cagan, 『인스파이어드(INSPIRED)』 — 출시가 아니라 결과(outcome)로 제품을 판단하기</li>
            <li>이 노트의 다른 탭: <a href="#/plan/prd">유저 스토리 · 인수 조건</a>, <a href="#/plan/policy">엣지 케이스</a>, <a href="#/plan/metrics">지표 · 이벤트 로그</a>, <a href="#/plan/collab">협업 · 소통</a></li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}

/* ---------- TC 작성기 ---------- */
function TcWriter({ tcs, setTcs, onBug }: { tcs: TC[]; setTcs: (f: (t: TC[]) => TC[]) => void; onBug: (t: TC) => void }) {
  const [ac, setAc] = useState<string>('AC3')
  const used = new Set(tcs.map(t => t.pre + '|' + t.exp))
  const nextN = () => Math.max(0, ...tcs.map(t => +t.id.split('-').pop()! || 0)) + 1
  const add = (s: Sug) => setTcs(t => [...t, tcFrom(s, nextN())])
  const upd = (id: string, p: Partial<TC>) => setTcs(t => t.map(x => (x.id === id ? { ...x, ...p } : x)))
  const counts = (['통과', '실패', '보류', '미실행'] as Status[]).map(s => [s, tcs.filter(t => t.st === s).length] as const)
  const covered = ACS.map(a => ({ id: a.id, n: tcs.filter(t => t.ac === a.id).length }))
  const csv = toCSV([['ID', 'AC', '유형', '전제 조건', '절차', '기대 결과', '실제 결과', '상태'], ...tcs.map(t => [t.id, t.ac, t.kind, t.pre, t.steps, t.exp, t.act, t.st])])
  const sugs = SUGS.filter(s => s.ac === ac)
  const cur = ACS.find(a => a.id === ac)!

  return (
    <Section id="plan-qa-tc" wide title="테스트 시나리오(TC) 작성기 — 인수 조건에서 뽑아요"
      desc="TC는 상상으로 쓰지 않아요. 인수 조건(AC) 한 줄마다 ① 정상 ② 경계(딱 그 숫자, 하나 넘친 숫자) ③ 예외(없을 때, 겹칠 때)를 물어 뽑아요. ‘재주문’ 유저 스토리의 AC 4개로 해 봐요.">
      <div className="qa-story"><span className="qa-pill">유저 스토리</span> 구매자로서, 재구매를 쉽게 하기 위해 주문 내역에서 바로 재주문하길 원한다. <a href="#/plan/prd">AC 쓰는 법 →</a></div>
      <div className="qa-derive">
        <div className="qa-acs" role="tablist" aria-label="인수 조건">
          {ACS.map(a => (
            <button key={a.id} type="button" role="tab" aria-selected={ac === a.id} className={'qa-ac' + (ac === a.id ? ' on' : '')} onClick={() => setAc(a.id)}>
              <b>{a.id}</b><span>{a.text}</span><small>TC {covered.find(c => c.id === a.id)?.n}개</small>
            </button>
          ))}
        </div>
        <div className="qa-sugs">
          <p className="qa-gwt"><b>{cur.id}</b> {cur.gwt}</p>
          {sugs.map(s => {
            const has = used.has(s.pre + '|' + s.exp)
            return (
              <div key={s.key} className={'qa-sug k-' + s.kind}>
                <div className="qa-sug-top"><span className={'qa-kind k-' + s.kind}>{s.kind}</span><b>{s.pre}</b>
                  <button type="button" className="btn sm" data-sug={s.key} disabled={has} onClick={() => add(s)}>{has ? '✓ 추가됨' : '+ 표에 추가'}</button>
                </div>
                <p>→ {s.exp}</p>
                {s.note && <p className="qa-sug-note"><b>사수 메모</b> {s.note}</p>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="qa-tc-bar">
        <div className="qa-counts">
          {counts.map(([s, n]) => <span key={s} className={'qa-st s-' + s}>{s} <b>{n}</b></span>)}
          <span className="muted">전체 {tcs.length}개</span>
        </div>
        <div className="qa-row">
          <button type="button" className="btn ghost sm" onClick={() => setTcs(t => [...t, { id: `TC-REORD-${String(nextN()).padStart(3, '0')}`, ac, kind: '정상', pre: '', steps: '1. ', exp: '', act: '', st: '미실행' }])}>+ 빈 TC</button>
          <DlBtn name="테스트케이스-재주문.csv" text={csv} type="text/csv">↓ CSV 받기</DlBtn>
        </div>
      </div>
      <div className="qa-tcs">
        <div className="qa-tc head" aria-hidden="true"><span>ID · AC</span><span>전제 조건</span><span>절차</span><span>기대 결과</span><span>실제 결과</span><span>상태</span></div>
        {tcs.map(t => {
          const vague = VAGUE.test(t.exp)
          return (
            <div key={t.id} className={'qa-tc s-' + t.st} data-tc={t.id}>
              <div className="qa-tc-id">
                <b>{t.id}</b>
                <span className="qa-row"><span className="qa-tag">{t.ac}</span><span className={'qa-kind k-' + t.kind}>{t.kind}</span></span>
                <button type="button" className="qa-x" aria-label={`${t.id} 삭제`} onClick={() => setTcs(x => x.filter(y => y.id !== t.id))}>삭제</button>
              </div>
              <Field label="전제 조건"><textarea className="qa-in" rows={3} value={t.pre} onChange={e => upd(t.id, { pre: e.target.value })} /></Field>
              <Field label="절차"><textarea className="qa-in" rows={3} value={t.steps} onChange={e => upd(t.id, { steps: e.target.value })} /></Field>
              <Field label="기대 결과" bad={vague || !t.exp.trim()} hint={vague ? '“정상적으로”는 기대 결과가 아니에요. 보이는 결과를 적어요.' : !t.exp.trim() ? '기대 결과가 비었어요.' : undefined}>
                <textarea className="qa-in" rows={3} value={t.exp} onChange={e => upd(t.id, { exp: e.target.value })} />
              </Field>
              <Field label="실제 결과"><textarea className="qa-in" rows={3} value={t.act} placeholder="테스트하고 본 그대로" onChange={e => upd(t.id, { act: e.target.value })} /></Field>
              <div className="qa-fld">
                <span className="qa-lab">상태</span>
                <select className="qa-in" aria-label={`${t.id} 상태`} value={t.st} onChange={e => upd(t.id, { st: e.target.value as Status })}>
                  {(['미실행', '통과', '실패', '보류'] as Status[]).map(s => <option key={s}>{s}</option>)}
                </select>
                {t.st === '실패' && <button type="button" className="btn sm orange" data-tobug={t.id} onClick={() => onBug(t)}>버그 리포트 쓰기 →</button>}
              </div>
            </div>
          )
        })}
      </div>
      <Note tone="tip"><b>상태를 ‘실패’로 바꿔 보세요.</b> 버그 리포트 버튼이 생기고, 누르면 TC의 전제 조건·절차·기대 결과가 리포트로 그대로 넘어가요. TC를 잘 써 두면 버그 리포트의 절반이 이미 써져 있는 거예요.</Note>
    </Section>
  )
}

/* ---------- 결함 등급 ---------- */
function Severity() {
  const [sel, setSel] = useState<Lv>('Critical')
  const [qi, setQi] = useState(0)
  const [pick, setPick] = useState<Lv | null>(null)
  const [score, setScore] = useState<boolean[]>([])
  const q = QUIZ[qi]
  const choose = (l: Lv) => { if (pick) return; setPick(l); setScore(s => [...s, l === q.a]) }
  const next = () => { setPick(null); setQi(i => (i + 1) % QUIZ.length); if (qi === QUIZ.length - 1) setScore([]) }
  const lv = LEVELS.find(l => l.k === sel)!
  return (
    <Section id="plan-qa-sev" wide title="결함 등급 — Blocker부터 Trivial까지"
      desc="등급(심각도)은 “사용자와 사업에 얼마나 나쁜가”예요. 등급이 있어야 출시 직전에 “이건 고치고, 이건 다음 버전”을 싸우지 않고 정할 수 있어요.">
      <div className="qa-sev">
        <div className="qa-levels" role="tablist" aria-label="결함 등급">
          {LEVELS.map((l, i) => (
            <button key={l.k} type="button" role="tab" aria-selected={sel === l.k} className={'qa-lv lv' + i + (sel === l.k ? ' on' : '')} onClick={() => setSel(l.k)}>
              <b>{l.k}</b><small>{l.ko}</small>
            </button>
          ))}
        </div>
        <div className={'qa-lv-detail lv' + LEVELS.findIndex(l => l.k === sel)}>
          <p className="qa-lv-def">{lv.def}</p>
          <p><span className="qa-lab">오늘반찬 예시</span><br />{lv.ex}</p>
          <p><span className="qa-lab">보통 이렇게 대응해요</span><br /><b>{lv.act}</b></p>
        </div>
      </div>
      <Note><b>등급(Severity)과 우선순위(Priority)는 달라요.</b> 메인 화면 로고 오타는 등급으로는 Trivial이지만, 모든 사람이 보니까 우선순위는 높아요. 반대로 1년에 한 번 생기는 Major 버그는 우선순위가 낮을 수 있어요. 등급은 QA가 제안하고, 우선순위는 PO·기획이 정해요. 그리고 등급의 정확한 기준은 팀마다 달라요. <b>출시 전에 팀에서 한 번 합의하세요.</b></Note>

      <div className="qa-quiz">
        <div className="qa-quiz-top"><span className="qa-pill">연습 {qi + 1} / {QUIZ.length}</span><span className="muted">맞힌 수 {score.filter(Boolean).length} / {score.length}</span></div>
        <p className="qa-quiz-q">{q.bug}</p>
        <div className="qa-quiz-opts">
          {LEVELS.map((l, i) => (
            <button key={l.k} type="button" data-quiz={l.k} className={'qa-qopt lv' + i + (pick ? (l.k === q.a ? ' right' : l.k === pick ? ' wrong' : ' dim') : '')} onClick={() => choose(l.k)} disabled={!!pick && l.k !== pick && l.k !== q.a}>{l.k}</button>
          ))}
        </div>
        {pick && (
          <div className={'qa-quiz-a ' + (pick === q.a ? 'right' : 'wrong')} aria-live="polite">
            <b>{pick === q.a ? '맞아요.' : `보통은 ${q.a}로 봐요.`}</b> {q.why}
            <button type="button" className="btn sm ghost" onClick={next}>{qi === QUIZ.length - 1 ? '처음부터' : '다음 버그 →'}</button>
          </div>
        )}
      </div>
    </Section>
  )
}

/* ---------- 버그 리포트 ---------- */
function BugReport({ bug, setBug, fromTc }: { bug: Bug; setBug: (b: Bug) => void; fromTc: string }) {
  const [v, setV] = useState<'good' | 'bad'>('good')
  const nSteps = bug.steps.split('\n').filter(s => s.trim()).length
  const warns = [
    !bug.env.trim() && '환경(기기·OS·앱 버전·서버)이 없으면 개발자가 재현을 못 해요.',
    nSteps < 2 && '재현 절차가 한 줄이에요. 처음 보는 사람이 그대로 따라 할 수 있게 번호로 쪼개요.',
    bug.exp.trim() && bug.exp.trim() === bug.act.trim() && '기대 결과와 실제 결과가 같아요.',
    !bug.act.trim() && '실제 결과가 비었어요.',
    !bug.freq.trim() && '재현 빈도(5번 중 몇 번)를 적어요. “가끔”은 원인 찾기가 훨씬 어려워요.',
  ].filter(Boolean) as string[]
  const md = [
    `# ${bug.title}`, '', `- 등급: ${bug.sev}`, `- 환경: ${bug.env}`, `- 재현 빈도: ${bug.freq}`, '',
    '## 전제 조건', bug.pre, '', '## 재현 절차', bug.steps, '', '## 기대 결과', bug.exp, '', '## 실제 결과', bug.act, '',
    '## 첨부', bug.shot || '- (스크린샷·화면 녹화)', '', '---', '보고: QA / 담당: / 확인: 기획',
  ].join('\n')
  const f = (k: keyof Bug) => (e: { target: { value: string } }) => setBug({ ...bug, [k]: e.target.value })
  return (
    <Section id="plan-qa-bug" wide title="버그 리포트 템플릿"
      desc="좋은 버그 리포트는 개발자가 질문 없이 바로 재현할 수 있는 리포트예요. “이상해요”라고 쓰면 물어보고 답하는 데만 반나절이 가요.">
      <div className="qa-bug-top">
        <Seg value={v} onChange={setV} options={[['bad', '나쁜 리포트'], ['good', '좋은 리포트 (편집 가능)']]} />
        {fromTc && <span className="qa-pill ok" data-from={fromTc}>{fromTc}에서 가져왔어요</span>}
      </div>
      {v === 'bad' ? (
        <div className="qa-badbug">
          <pre className="qa-pre bad">{BAD_BUG}</pre>
          <ul className="qa-list">
            <li><b>어느 화면?</b> 주문 내역인지 장바구니인지 몰라요.</li>
            <li><b>무엇이 이상?</b> 기대와 실제가 없어서 버그인지 정책인지조차 판단할 수 없어요.</li>
            <li><b>어떤 환경?</b> iOS만인지, 특정 버전만인지 몰라요.</li>
            <li><b>다시 되나?</b> 재현 절차가 없으면 “제 폰에선 되는데요”로 끝나요.</li>
          </ul>
        </div>
      ) : (
        <div className="qa-bug">
          <div className="qa-bug-form">
            <Field label="제목 — [화면 ID] 어디서 무엇이 어떻게" className="span2"><input className="qa-in" value={bug.title} onChange={f('title')} /></Field>
            <Field label="환경" bad={!bug.env.trim()}><input className="qa-in" value={bug.env} onChange={f('env')} /></Field>
            <div className="qa-fld"><span className="qa-lab">등급</span>
              <Seg value={bug.sev} onChange={s => setBug({ ...bug, sev: s })} options={LEVELS.map(l => [l.k, l.k] as const)} />
            </div>
            <Field label="전제 조건 (계정·데이터)" className="span2"><input className="qa-in" value={bug.pre} onChange={f('pre')} /></Field>
            <Field label="재현 절차" className="span2" bad={nSteps < 2}><textarea className="qa-in" rows={4} value={bug.steps} onChange={f('steps')} /></Field>
            <Field label="기대 결과"><textarea className="qa-in" rows={2} value={bug.exp} onChange={f('exp')} /></Field>
            <Field label="실제 결과" bad={!bug.act.trim()}><textarea className="qa-in" rows={2} value={bug.act} onChange={f('act')} /></Field>
            <Field label="재현 빈도" bad={!bug.freq.trim()}><input className="qa-in" value={bug.freq} placeholder="예: 5번 중 5번" onChange={f('freq')} /></Field>
            <Field label="스크린샷 · 화면 녹화"><input className="qa-in" value={bug.shot} placeholder="파일 이름이나 링크" onChange={f('shot')} /></Field>
          </div>
          <div className="qa-col">
            {warns.length ? <ul className="qa-warns">{warns.map(w => <li key={w}>{w}</li>)}</ul> : <p className="qa-good">개발자가 질문 없이 재현할 수 있는 리포트예요.</p>}
            <CodeBlock code={md} label="버그 리포트.md" maxHeight={360} />
            <div className="qa-row"><DlBtn name="버그-리포트.md" text={md}>↓ .md 받기</DlBtn><button type="button" className="btn ghost sm" onClick={() => setBug(BUG0)}>예시로 되돌리기</button></div>
          </div>
        </div>
      )}
    </Section>
  )
}

/* ---------- 출시 체크리스트 ---------- */
const REL = [
  { g: '기능', items: [['Blocker·Critical 결함 0건', true], ['AC별 TC 통과 (보류는 사유와 결정자 기록)', true], ['남은 Major 결함의 출시 여부를 PO가 결정하고 기록', true], ['앱 스토어 심사 제출·승인 (앱 배포일 경우)', false]] },
  { g: '정책 · 문구', items: [['품절 토스트·빈 화면·오류 문구 최종본 반영', true], ['약관·개인정보 처리방침 변경 여부 확인', false], ['용어 사전과 화면 문구 일치 (구매자·사장님)', false]] },
  { g: '이벤트 로그', items: [['reorder_button_click 등 이벤트가 QA 서버에서 실제로 찍히는지 확인', true], ['출시 후 볼 대시보드·쿼리 준비', false]] },
  { g: '어드민 준비', items: [['운영자 화면에서 재주문 주문을 구분해 볼 수 있음', false], ['사장님 앱에 미치는 영향(주문 알림 등) 확인', false]] },
  { g: 'CS 공지', items: [['CS팀에 기능 설명과 예상 문의·답변(FAQ) 공유', true], ['사장님 공지 (필요할 때)', false]] },
  { g: '롤백 계획', items: [['기능 플래그로 재주문 버튼을 끌 수 있음', true], ['롤백 기준(예: 결제 오류 급증)과 결정할 사람 지정', true]] },
  { g: '모니터링', items: [['출시 당일 오류·결제 실패 모니터링 담당자와 시간대', true], ['출시 후 2주 리뷰 날짜를 캘린더에 잡음', false]] },
] as const

function Release() {
  const all = REL.flatMap(g => g.items.map(([t, must], i) => ({ k: `${g.g}-${i}`, g: g.g, t, must })))
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(all.slice(0, 7).map(x => [x.k, true])))
  const done = all.filter(x => on[x.k]).length
  const blockers = all.filter(x => x.must && !on[x.k])
  const md = ['# 출시 체크리스트 — 오늘반찬 1.4.0 재주문', '', `진행: ${done}/${all.length} · 출시 차단 항목 남음: ${blockers.length}`, '',
    ...REL.flatMap(g => [`## ${g.g}`, ...g.items.map(([t, must], i) => `- [${on[`${g.g}-${i}`] ? 'x' : ' '}] ${t}${must ? ' (필수)' : ''}`), '']),
    '---', '최종 출시 결정: PO / 일시:'].join('\n')
  const pct = Math.round((done / all.length) * 100)
  return (
    <Section id="plan-qa-release" wide title="출시 체크리스트 — 기능만 되면 출시가 아니에요"
      desc="QA를 통과해도 CS팀이 모르고, 로그가 안 찍히고, 끌 방법이 없으면 출시 첫날이 사고가 돼요. ‘필수’ 표시가 하나라도 남으면 출시하지 않아요.">
      <div className="qa-rel-top">
        <div className="qa-rel-prog">
          <div className="qa-rel-num"><b data-pct>{pct}%</b><span>{done} / {all.length} 완료</span></div>
          <div className="qa-bar big"><i style={{ width: pct + '%' }} /></div>
        </div>
        <div className={'qa-rel-state ' + (blockers.length ? 'no' : 'go')} data-go={blockers.length ? 'no' : 'go'}>
          {blockers.length ? <><b>아직 출시 불가</b><span>필수 {blockers.length}개 남음: {blockers.slice(0, 2).map(b => b.t).join(' · ')}{blockers.length > 2 ? ' 외' : ''}</span></> : <><b>출시 가능</b><span>필수 항목을 모두 확인했어요. 최종 결정은 PO가 기록해요.</span></>}
        </div>
        <div className="qa-row">
          <button type="button" className="btn ghost sm" onClick={() => setOn(Object.fromEntries(all.map(x => [x.k, true])))}>모두 체크</button>
          <button type="button" className="btn ghost sm" onClick={() => setOn({})}>초기화</button>
          <DlBtn name="출시-체크리스트.md" text={md}>↓ .md 받기</DlBtn>
        </div>
      </div>
      <div className="qa-rel">
        {REL.map(g => {
          const n = g.items.filter((_, i) => on[`${g.g}-${i}`]).length
          return (
            <fieldset key={g.g} className={n === g.items.length ? 'full' : ''}>
              <legend>{g.g} <small>{n}/{g.items.length}</small></legend>
              {g.items.map(([t, must], i) => {
                const k = `${g.g}-${i}`
                return (
                  <label key={k} className="opt">
                    <input type="checkbox" checked={!!on[k]} data-rel={k} onChange={() => setOn(o => ({ ...o, [k]: !o[k] }))} />
                    <span>{t}{must && <em className="qa-must">필수</em>}</span>
                  </label>
                )
              })}
            </fieldset>
          )
        })}
      </div>
    </Section>
  )
}

/* ---------- 출시 후 2주 리뷰 ---------- */
type Met = { name: string; kind: '핵심' | '보조' | '가드레일'; goal: string; actual: string; dir: 'up' | 'down'; unit: string }
const METS0: Met[] = [
  { name: '주문 내역 방문자 중 재주문 이용 비율', kind: '핵심', goal: '15', actual: '11', dir: 'up', unit: '%' },
  { name: '주문 내역 → 결제 완료까지 탭 수 (중앙값)', kind: '보조', goal: '3', actual: '3', dir: 'down', unit: '번' },
  { name: '주문 취소율', kind: '가드레일', goal: '3.0', actual: '3.1', dir: 'down', unit: '%' },
  { name: '재주문 관련 CS 문의 (주간)', kind: '가드레일', goal: '20', actual: '12', dir: 'down', unit: '건' },
]
const judge = (m: Met) => {
  const g = parseFloat(m.goal), a = parseFloat(m.actual)
  if (isNaN(g) || isNaN(a)) return { k: 'none', t: '입력 필요' }
  const ok = m.dir === 'up' ? a >= g : a <= g
  if (ok) return { k: 'ok', t: '달성' }
  const gap = Math.abs(a - g) / (g || 1)
  return gap <= 0.05 ? { k: 'mid', t: '주의' } : { k: 'bad', t: '미달' }
}

function Review() {
  const [mets, setMets] = useState(METS0)
  const upd = (i: number, p: Partial<Met>) => setMets(ms => ms.map((m, j) => (j === i ? { ...m, ...p } : m)))
  const res = mets.map(judge)
  const md = ['# 출시 후 2주 리뷰 — 재주문 v1', '- 기간: 출시일 ~ D+14', '', '| 지표 | 종류 | 목표 | 실제 | 판단 |', '|---|---|---|---|---|',
    ...mets.map((m, i) => `| ${m.name} | ${m.kind} | ${m.dir === 'up' ? '≥' : '≤'} ${m.goal}${m.unit} | ${m.actual}${m.unit} | ${res[i].t} |`), '',
    '## 해석', '- 데이터가 제대로 찍혔나:', '- 사용자가 기능을 발견했나 (노출 → 클릭 → 완료):', '- 가드레일이 나빠졌나:', '',
    '## 다음 행동', '- [ ] 유지 / 개선 / 롤백 중 결정:', '- [ ] 다음 실험:', '- 결정자:'].join('\n')
  return (
    <Section id="plan-qa-review" wide title="출시 후 2주 리뷰 — 출시는 끝이 아니라 확인의 시작"
      desc="PRD에 적은 성공 기준을 2주 뒤에 실제 숫자와 나란히 놓고 봐요. 아래 숫자는 설명을 위한 가상 예시예요. 목표와 실제를 바꿔 보세요. (목표와 5% 안쪽 차이는 이 도구에서 ‘주의’로 표시해요.)">
      <div className="qa-timeline">
        {[['D+1', '오류·결제 실패·CS 폭주가 없는지. 롤백 기준을 넘었는지'], ['D+3', '이벤트 로그가 기대한 만큼 찍히는지. 0이면 기능보다 로그를 먼저 의심'], ['D+7', '노출 → 클릭 → 완료 퍼널. 어디서 빠지는지'], ['D+14', '목표 대비 판단, 가드레일 확인, 다음 행동 결정']].map(([d, t]) => (
          <div key={d} className="qa-tl"><b>{d}</b><span>{t}</span></div>
        ))}
      </div>
      <div className="qa-mets">
        {mets.map((m, i) => {
          const r = res[i]
          const g = parseFloat(m.goal), a = parseFloat(m.actual)
          const max = Math.max(g, a, 0.0001) * 1.15
          return (
            <div key={i} className={'qa-met r-' + r.k} data-met={i}>
              <div className="qa-met-head"><span className={'qa-mk ' + (m.kind === '가드레일' ? 'g' : m.kind === '핵심' ? 'c' : 's')}>{m.kind}</span><b>{m.name}</b><span className={'qa-judge r-' + r.k}>{r.t}</span></div>
              <div className="qa-met-in">
                <label>목표 {m.dir === 'up' ? '≥' : '≤'}<input className="qa-in" inputMode="decimal" aria-label={`${m.name} 목표`} value={m.goal} onChange={e => upd(i, { goal: e.target.value })} /><span>{m.unit}</span></label>
                <label>실제<input className="qa-in" inputMode="decimal" aria-label={`${m.name} 실제`} value={m.actual} onChange={e => upd(i, { actual: e.target.value })} /><span>{m.unit}</span></label>
              </div>
              {!isNaN(g) && !isNaN(a) && (
                <div className="qa-met-bar"><i className="act" style={{ width: (a / max) * 100 + '%' }} /><i className="goal" style={{ left: (g / max) * 100 + '%' }} /></div>
              )}
            </div>
          )
        })}
      </div>
      <div className="qa-two">
        <div>
          <h4 className="qa-h4">목표에 못 미치면, 이 순서로 의심해요</h4>
          <ol className="qa-list">
            <li><b>데이터가 맞게 찍혔나?</b> 이벤트 이름·조건이 정의와 같은지 먼저 봐요. <a href="#/plan/metrics">이벤트 택소노미 →</a></li>
            <li><b>사람들이 기능을 발견했나?</b> 버튼 노출 수 대비 클릭 수를 봐요. 안 보이면 기능이 아니라 위치 문제예요.</li>
            <li><b>눌렀는데 끝까지 갔나?</b> 품절 때문에 빈 장바구니가 되는 경우처럼, 정책이 흐름을 끊는지 봐요.</li>
            <li><b>2주가 충분한가?</b> 반찬은 주기적으로 사는 상품이라, 재구매 주기보다 짧은 기간이면 판단을 미뤄요.</li>
          </ol>
        </div>
        <div>
          <h4 className="qa-h4">가드레일이 나빠졌다면</h4>
          <p className="qa-p">핵심 지표가 좋아져도 <b>주문 취소율·CS 문의</b> 같은 가드레일이 나빠지면 성공이 아니에요. 출시 전에 정한 롤백 기준을 넘었는지부터 확인해요. 차이가 작으면 원래 흔들리는 범위인지, 비교 기간이 같은지(요일·명절)도 봐요.</p>
          <DlBtn name="출시후-2주-리뷰.md" text={md}>↓ 2주 리뷰 .md 받기</DlBtn>
        </div>
      </div>
    </Section>
  )
}

/* ---------- KPT 회고 ---------- */
type Col = 'K' | 'P' | 'T'
type Card = { id: number; col: Col; text: string; owner?: string }
const COLS: { k: Col; name: string; sub: string; ph: string }[] = [
  { k: 'K', name: 'Keep', sub: '좋았고, 계속할 것', ph: '예: 매일 10분 QA 스탠드업' },
  { k: 'P', name: 'Problem', sub: '아쉬웠던 것 (사람이 아니라 일)', ph: '예: 디자인 확정본이 두 번 바뀜' },
  { k: 'T', name: 'Try', sub: '다음에 해 볼 것 · 담당 필수', ph: '예: 디자인 확정일을 일정표에 표시' },
]
const CARDS0: Card[] = [
  { id: 1, col: 'K', text: 'AC를 Given/When/Then으로 써 둬서 TC 뽑기가 빨랐어요' },
  { id: 2, col: 'K', text: '매일 10분 QA 스탠드업으로 결함 등급을 바로 합의했어요' },
  { id: 3, col: 'P', text: '품절 정책이 개발 중에 바뀌어 화면 2개를 다시 만들었어요' },
  { id: 4, col: 'P', text: '이벤트 로그 확인을 출시 전날에 해서 급하게 고쳤어요' },
  { id: 5, col: 'T', text: '정책 미결 이슈는 디자인 착수 전에 닫기', owner: '기획 Palmer' },
  { id: 6, col: 'T', text: '이벤트 로그 확인을 출시 체크리스트 필수 항목으로', owner: '' },
]

function Kpt() {
  const [cards, setCards] = useState(CARDS0)
  const [draft, setDraft] = useState<Record<Col, string>>({ K: '', P: '', T: '' })
  const [owner, setOwner] = useState('')
  const [nid, setNid] = useState(100)
  const add = (col: Col, text = draft[col], own?: string) => {
    if (!text.trim()) return
    setCards(c => [...c, { id: nid, col, text: text.trim(), owner: col === 'T' ? (own ?? owner) : undefined }])
    setNid(n => n + 1)
    if (text === draft[col]) setDraft(d => ({ ...d, [col]: '' }))
    if (col === 'T' && own === undefined) setOwner('')
  }
  const toTry = (c: Card) => add('T', `(${c.text.slice(0, 18)}${c.text.length > 18 ? '…' : ''}) 해결: `, '')
  const noOwner = cards.filter(c => c.col === 'T' && !c.owner?.trim()).length
  const md = useMemo(() => ['# 회고 (KPT) — 재주문 v1', '', ...COLS.flatMap(col => [`## ${col.name} — ${col.sub}`, ...cards.filter(c => c.col === col.k).map(c => `- ${c.text}${col.k === 'T' ? ` (담당: ${c.owner?.trim() || '미정'})` : ''}`), '']), '다음 회고에서 Try를 먼저 확인해요.'].join('\n'), [cards])
  return (
    <Section id="plan-qa-kpt" wide title="회고 — KPT 보드"
      desc="회고는 잘잘못을 따지는 자리가 아니라, 다음 프로젝트에서 같은 문제를 안 겪기 위한 자리예요. 카드를 직접 추가해 보세요. Problem 카드의 ‘→ Try’를 누르면 해결 카드로 이어 쓸 수 있어요.">
      <div className="qa-kpt">
        {COLS.map(col => (
          <div key={col.k} className={'qa-kcol c-' + col.k} data-col={col.k}>
            <header><b>{col.name}</b><small>{col.sub}</small><span className="qa-kn">{cards.filter(c => c.col === col.k).length}</span></header>
            <div className="qa-kcards">
              {cards.filter(c => c.col === col.k).map(c => (
                <div key={c.id} className="qa-kcard">
                  {col.k === 'T'
                    ? <input className="qa-in qa-ktext" aria-label="Try 내용" value={c.text} onChange={e => setCards(cs => cs.map(x => (x.id === c.id ? { ...x, text: e.target.value } : x)))} />
                    : <p>{c.text}</p>}
                  {col.k === 'T' && (
                    <label className={'qa-owner' + (!c.owner?.trim() ? ' none' : '')}>담당
                      <input className="qa-in" value={c.owner ?? ''} placeholder="누가?" aria-label="담당" onChange={e => setCards(cs => cs.map(x => (x.id === c.id ? { ...x, owner: e.target.value } : x)))} />
                    </label>
                  )}
                  <div className="qa-kact">
                    {col.k === 'P' && <button type="button" className="qa-link" onClick={() => toTry(c)}>→ Try</button>}
                    <button type="button" className="qa-x" aria-label="카드 삭제" onClick={() => setCards(cs => cs.filter(x => x.id !== c.id))}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
            <form className="qa-kadd" onSubmit={e => { e.preventDefault(); add(col.k) }}>
              <input className="qa-in" aria-label={`${col.name} 카드 추가`} placeholder={col.ph} value={draft[col.k]} onChange={e => setDraft(d => ({ ...d, [col.k]: e.target.value }))} />
              {col.k === 'T' && <input className="qa-in sm" aria-label="Try 담당" placeholder="담당" value={owner} onChange={e => setOwner(e.target.value)} />}
              <button type="submit" className="btn sm" data-kadd={col.k} disabled={!draft[col.k].trim()}>추가</button>
            </form>
          </div>
        ))}
      </div>
      <div className="qa-kfoot">
        {noOwner ? <p className="qa-warn">담당이 없는 Try가 {noOwner}개 있어요. 담당이 없으면 다음 회고에서도 같은 Problem이 나와요.</p> : <p className="qa-good">모든 Try에 담당이 있어요. 다음 회고는 이 Try들을 확인하는 것부터 시작해요.</p>}
        <DlBtn name="회고-KPT.md" text={md}>↓ 회고 .md 받기</DlBtn>
      </div>
      <Note tone="tip"><b>진행 팁:</b> ① 5분간 각자 조용히 카드를 써요(목소리 큰 사람에게 끌려가지 않게). ② 비슷한 카드를 묶어요. ③ Problem 중 2~3개만 골라 Try를 만들어요. 전부 고치겠다는 Try는 아무것도 안 고쳐요. ④ Problem에는 사람 이름 대신 상황을 적어요.</Note>
    </Section>
  )
}

/* ---------- 체크리스트 ---------- */
function Check({ items }: { items: string[] }) {
  const [on, setOn] = useState<boolean[]>(() => items.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <div className="qa-check">
      <div className="qa-check-top"><b>{n} / {items.length}</b><span className="muted">출시 리뷰 전에 스스로 답해 보세요</span></div>
      <div className="qa-bar"><i style={{ width: (n / items.length) * 100 + '%' }} /></div>
      <ul>
        {items.map((t, i) => (
          <li key={i}><label className="opt"><input type="checkbox" checked={on[i]} onChange={() => setOn(o => o.map((v, j) => (j === i ? !v : v)))} /><span>{t}</span></label></li>
        ))}
      </ul>
    </div>
  )
}
