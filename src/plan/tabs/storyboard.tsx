import { useMemo, useState, type ReactNode } from 'react'
import { Seg } from '../../components/ui'
import { download } from '../../system/export'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { Term, TermList } from '../../components/Term'
import './storyboard.css'

/* 사전(glossary.ts)에 없는 말 — 이 탭에서만 쓰는 쉬운 뜻 */
const EXTRA: Record<string, string> = {
  '장표': '화면설계서의 한 페이지예요. 화면 하나(또는 팝업 하나)를 그림과 설명으로 담아요.',
  '화면 ID': '화면마다 붙이는 고유 번호예요. 아파트 동·호수처럼 “ORD-02-01”만 말해도 모두 같은 화면을 떠올려요.',
  '무한 스크롤': '목록 끝에 닿으면 다음 묶음을 자동으로 불러와 이어 붙이는 방식이에요. 인스타그램 피드처럼요.',
  '토스트': '화면 아래에 잠깐 떴다가 저절로 사라지는 짧은 알림이에요.',
  '말줄임': '글이 칸보다 길면 뒷부분을 자르고 “…”로 표시하는 규칙이에요.',
}

/* =================================================================
 * 1) 문서 구성
 * ================================================================= */
const DOC: { id: string; name: string; put: string[]; why: string }[] = [
  { id: 'cover', name: '표지', put: ['프로젝트 이름 · 문서 버전', '작성자 · 마지막으로 고친 날', '관련 문서 링크 (PRD, 디자인, 이벤트 정의)', '검토하는 사람 (디자인·개발·QA 담당)'],
    why: '파일이 메신저로 여기저기 돌아다녀도, 표지만 보면 “이게 최신인가?”를 알 수 있어요.' },
  { id: 'history', name: '변경 이력', put: ['버전 · 날짜', '바뀐 화면 ID와 번호', '변경 내용 (전 → 후)', '요청한 사람 · 이유'],
    why: '개발 중에 바뀐 내용을 놓치는 사고가 가장 흔해요. 맨 앞에 두면 문서를 열 때마다 눈에 들어와요.' },
  { id: 'ia', name: 'IA', put: ['메뉴 트리 (어떤 메뉴 아래 어떤 화면이 있나)', '화면 ID · 화면 이름', '볼 수 있는 사람 (비회원 / 구매자 / 사장님)', '이번 작업에 들어가는 화면 표시'],
    why: '장표가 50장을 넘으면 지도 없이는 길을 잃어요. 이번에 바뀌는 화면만 색으로 칠해 두면 찾기 쉬워요.' },
  { id: 'common', name: '공통 정책', put: ['날짜·시간 · 금액을 적는 방법', '말줄임 규칙', '빈 화면 · 오류 · 로딩의 기본 모양', '여러 화면에서 쓰는 팝업 · 토스트 문구'],
    why: '“금액은 천 단위마다 쉼표”를 모든 장표에 반복해 쓰지 않으려고 있어요. 장표에는 “P-02 참고”라고만 적어요.' },
  { id: 'screens', name: '화면별 장표', put: ['화면 ID · 화면 이름 · 경로', '와이어프레임 + 번호 배지', '번호별 디스크립션 (동작 설명)', '이어지는 팝업 · 빈 화면 장표'],
    why: '문서의 대부분을 차지해요. 아래 연습용 장표에서 직접 눌러 보세요.' },
]

function DocStructure() {
  const [cur, setCur] = useState('history')
  const d = DOC.find(x => x.id === cur)!
  return (
    <div className="sb-doc">
      <ol className="sb-doc-steps" role="tablist" aria-label="문서 구성 순서">
        {DOC.map((x, i) => (
          <li key={x.id}>
            <button type="button" role="tab" aria-selected={x.id === cur} data-doc={x.id} className={x.id === cur ? 'on' : ''} onClick={() => setCur(x.id)}>
              <span className={'sb-thumb t-' + x.id} aria-hidden="true"><i /><i /><i /><i /></span>
              <b><small>{i + 1}</small>{x.name}</b>
            </button>
          </li>
        ))}
      </ol>
      <div className="sb-doc-detail" role="tabpanel" aria-live="polite">
        <div>
          <h4>{d.name}에 넣는 것</h4>
          <ul>{d.put.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
        <p><b>왜 필요해요?</b> {d.why}</p>
      </div>
    </div>
  )
}

/* =================================================================
 * 2) 인터랙티브 장표
 * ================================================================= */
type Tag = '기본' | '조건' | '예외' | '문구' | '연결'
type Line = { tag: Tag; text: ReactNode; chg?: 'add' | 'del' }
interface Desc { n: number; name: string; bad: string; good: Line[]; changed?: boolean; empty?: boolean; normal?: boolean }

const DESCS: Desc[] = [
  { n: 1, name: '상단 바', bad: '상단 바', good: [
    { tag: '기본', text: '화면 이름은 ‘주문 내역’으로 고정. 스크롤해도 맨 위에 붙어 있음.' },
    { tag: '연결', text: '← 를 누르면 이전 화면(MY-01)으로 돌아감.' },
    { tag: '예외', text: '푸시 알림을 눌러 바로 들어왔다면 ← 는 홈(HOME-01)으로 감.' },
  ] },
  { n: 2, name: '상태 탭', bad: '탭 노출', good: [
    { tag: '기본', text: '처음엔 ‘전체’가 선택됨. 탭은 전체 / 진행 중 / 완료 / 취소, 4개.' },
    { tag: '조건', text: '탭을 바꾸면 목록을 맨 위로 올리고 새로 불러옴.' },
    { tag: '예외', text: '그 탭에 주문이 0건이면 탭은 그대로 둠. 목록 자리에 빈 화면(EMP-01)을 보여주고 문구만 바꿈.' },
  ] },
  { n: 3, name: '주문 카드', bad: '목록 노출', normal: true, good: [
    { tag: '기본', text: '최근 6개월 주문을 주문일 최신순으로. 20개씩 무한 스크롤(끝에 닿으면 다음 20개).' },
    { tag: '문구', text: '“[대표 메뉴] 외 N건” (메뉴가 1개면 “외 N건”은 뺌). 가게 이름은 1줄을 넘으면 “…”. 날짜·금액은 공통 정책 P-01·P-02를 따름.' },
    { tag: '연결', text: '카드를 누르면 주문 상세(ORD-02-02)로 감.' },
  ] },
  { n: 4, name: '다시 담기 버튼', bad: '재주문 버튼', changed: true, normal: true, good: [
    { tag: '조건', text: '주문 상태가 배송완료·구매확정일 때만 보임.' },
    { tag: '예외', text: '품절 메뉴가 있으면 팝업 POP-ORD-01 “품절된 메뉴 1개를 빼고 담을까요?” [빼고 담기 / 취소].', chg: 'add' },
    { tag: '예외', text: '가게가 문을 닫았으면 토스트 “지금은 주문할 수 없는 가게예요”를 띄우고 담지 않음.' },
    { tag: '기본', text: '누른 뒤 처리하는 동안 버튼을 못 누르게 막고 스피너를 보여줌 (두 번 눌림 방지).' },
    { tag: '연결', text: '담기에 성공하면 장바구니(CART-01)로 이동.' },
  ] },
  { n: 5, name: '취소된 주문', bad: '취소 주문 표시', changed: true, normal: true, good: [
    { tag: '조건', text: '상태가 ‘주문 취소’면 카드 전체를 회색으로, 라벨 “주문 취소”를 붙임.' },
    { tag: '기본', text: '‘다시 담기’ 버튼은 회색으로 보이되 못 누름(비활성).', chg: 'del' },
    { tag: '기본', text: '‘다시 담기’ 버튼을 아예 보여주지 않음.', chg: 'add' },
    { tag: '연결', text: '카드를 누르면 주문 상세(ORD-02-02)로는 갈 수 있음 (취소 이유 확인용).' },
  ] },
  { n: 6, name: '목록 끝', bad: '더 보기', normal: true, good: [
    { tag: '기본', text: '목록 끝에 닿으면 다음 20개를 불러옴. 불러오는 동안 아래에 스피너.' },
    { tag: '예외', text: '불러오지 못하면 “주문 내역을 불러오지 못했어요” + [다시 시도].' },
    { tag: '문구', text: '6개월 치를 다 보여줬으면 “최근 6개월 주문까지 보여드려요”.' },
  ] },
  { n: 7, name: '빈 화면 EMP-01', bad: '빈 화면 노출', empty: true, good: [
    { tag: '조건', text: '최근 6개월 주문이 0건일 때.' },
    { tag: '문구', text: '“아직 주문한 반찬이 없어요” / 아래 작은 글씨 “동네 반찬가게를 둘러보세요”.' },
    { tag: '연결', text: '[반찬 둘러보기]를 누르면 홈(HOME-01)으로.' },
    { tag: '예외', text: '탭을 골라서 0건이면 문구만 탭에 맞게 바꿈(예: “취소한 주문이 없어요”). 버튼은 숨김.' },
  ] },
]
const TAGS: Tag[] = ['기본', '조건', '예외', '문구', '연결']

function Badge({ n, active, onPick }: { n: number; active: number; onPick: (n: number) => void }) {
  return (
    <button type="button" className={'sb-badge' + (active === n ? ' on' : '')} data-badge={n} aria-label={`${n}번 설명 보기`} aria-pressed={active === n}
      onClick={() => onPick(n)}>{n}</button>
  )
}

function Slide() {
  const [quality, setQuality] = useState<'bad' | 'good'>('good')
  const [state, setState] = useState<'normal' | 'empty'>('normal')
  const [showChg, setShowChg] = useState(true)
  const [active, setActive] = useState(4)
  const visible = DESCS.filter(d => (state === 'empty' ? !d.normal : !d.empty))
  const pick = (n: number) => setActive(a => (a === n ? 0 : n))
  const pickFromWire = (n: number) => {
    pick(n)
    if (window.innerWidth < 900) requestAnimationFrame(() => document.querySelector(`[data-plan="storyboard"] [data-desc="${n}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }
  const hot = (n: number) => (active === n ? ' hot' : '')
  const chg = (n: number) => (showChg && quality === 'good' && DESCS.find(d => d.n === n)?.changed ? ' chg' : '')
  const switchState = (s: 'normal' | 'empty') => { setState(s); setActive(s === 'empty' ? 7 : 4) }

  const covered = (d: Desc) => new Set(d.good.filter(l => l.chg !== 'del').map(l => l.tag))

  return (
    <div className="sb-slide-wrap">
      <div className="sb-slide-bar">
        <Seg value={quality} onChange={setQuality} options={[['bad', '✕ 나쁜 디스크립션'], ['good', '○ 좋은 디스크립션']] as const} />
        <Seg value={state} onChange={switchState} options={[['normal', '주문 있음'], ['empty', '주문 0건']] as const} />
        <label className="sb-check"><input type="checkbox" checked={showChg} onChange={e => setShowChg(e.target.checked)} data-act="show-chg" /> v1.2에서 바뀐 곳 표시</label>
      </div>

      <div className="sb-slide" data-quality={quality}>
        <header className="sb-slide-head">
          <div><small>화면 ID</small><b>{state === 'empty' ? 'ORD-02-01 / EMP-01' : 'ORD-02-01'}</b></div>
          <div><small>화면 이름</small><b>주문 내역</b></div>
          <div className="wide"><small>경로</small><b>마이(MY-01) &gt; 주문 내역</b></div>
          <div><small>버전</small><b>v1.2 · 2026-11-20</b></div>
          <div><small>작성</small><b>Palmer</b></div>
        </header>
        <div className="sb-slide-body">
          <div className="sb-wire-col">
            <div className="sb-phone" aria-label="주문 내역 와이어프레임">
              <div className={'sb-w sb-w-top' + hot(1)}><span>←</span><b>주문 내역</b><Badge n={1} active={active} onPick={pickFromWire} /></div>
              <div className={'sb-w sb-w-tabs' + hot(2)}>
                {['전체', '진행 중', '완료', '취소'].map((t, i) => <span key={t} className={i === 0 ? 'on' : ''}>{t}</span>)}
                <Badge n={2} active={active} onPick={pickFromWire} />
              </div>
              {state === 'normal' ? (
                <div className="sb-w-list">
                  <div className={'sb-w sb-w-card' + hot(3)}>
                    <Badge n={3} active={active} onPick={pickFromWire} />
                    <div className="sb-w-thumb" />
                    <div className="sb-w-lines"><b>엄마손 반찬가게 망원점</b><span>2026.11.02 (월)</span><span>멸치볶음 외 2건 · 18,500원</span></div>
                    <div className={'sb-w-btn' + hot(4) + chg(4)}>다시 담기<Badge n={4} active={active} onPick={pickFromWire} /></div>
                  </div>
                  <div className={'sb-w sb-w-card is-off' + hot(5) + chg(5)}>
                    <Badge n={5} active={active} onPick={pickFromWire} />
                    <div className="sb-w-thumb" />
                    <div className="sb-w-lines"><b>오늘의 집밥 합정점</b><span>2026.10.28 (화)</span><span>주문 취소 · 12,000원</span></div>
                  </div>
                  <div className="sb-w sb-w-card">
                    <div className="sb-w-thumb" />
                    <div className="sb-w-lines"><b>할머니 손맛</b><span>2026.10.15 (수)</span><span>장조림 외 1건 · 9,800원</span></div>
                    <div className="sb-w-btn">다시 담기</div>
                  </div>
                  <div className={'sb-w sb-w-more' + hot(6)}><i className="sb-w-spin" />불러오는 중<Badge n={6} active={active} onPick={pickFromWire} /></div>
                </div>
              ) : (
                <div className={'sb-w sb-w-empty' + hot(7)}>
                  <Badge n={7} active={active} onPick={pickFromWire} />
                  <div className="sb-w-illu" />
                  <b>아직 주문한 반찬이 없어요</b>
                  <span>동네 반찬가게를 둘러보세요</span>
                  <div className="sb-w-btn wide">반찬 둘러보기</div>
                </div>
              )}
            </div>
            <p className="muted">번호를 누르면 오른쪽 설명이, 설명을 누르면 와이어프레임이 강조돼요.</p>
          </div>

          <ol className="sb-desc">
            {visible.map(d => (
              <li key={d.n} className={(active === d.n ? 'on' : '') + (showChg && quality === 'good' && d.changed ? ' chg' : '')}>
                <button type="button" data-desc={d.n} aria-pressed={active === d.n} onClick={() => pick(d.n)}>
                  <span className="sb-desc-n">{d.n}</span>
                  <span className="sb-desc-body">
                    <b>{d.name}{showChg && quality === 'good' && d.changed && <em className="sb-ver">v1.2</em>}</b>
                    {quality === 'bad' ? (
                      <span className="sb-bad">{d.bad}</span>
                    ) : (
                      <span className="sb-lines">
                        {d.good.filter(l => showChg || l.chg !== 'del').map((l, i) => (
                          <span key={i} className={'sb-line' + (showChg && l.chg ? ' ' + l.chg : '')}><i className={'tg tg-' + TAGS.indexOf(l.tag)}>{l.tag}</i><span>{l.text}</span></span>
                        ))}
                      </span>
                    )}
                    {quality === 'bad' && <span className="sb-miss">채워야 할 칸: {TAGS.filter(t => covered(d).has(t)).join(' · ')}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <Note tone={quality === 'bad' ? 'warn' : 'tip'}>
        {quality === 'bad'
          ? <><b>“목록 노출”만 보고 개발자는 무엇을 만들까요?</b> 몇 개월 치를 보여주나요? 어떤 순서로, 몇 개씩요? 0건이면요? 답이 없으면 개발자가 짐작하거나 메신저로 물어봐요. 그 대화는 문서에 남지 않아요.</>
          : <><b>좋은 디스크립션은 다섯 칸을 채워요.</b> 기본 상태, 조건(언제 보이나), 예외(안 될 때), 문구(실제 문장), 연결(누르면 어디로)이에요. 모든 번호가 다섯 칸을 다 채울 필요는 없어요. 다만 비운 칸은 “여기엔 필요 없다”고 확인하고 비워야 해요.</>}
      </Note>
    </div>
  )
}

/* =================================================================
 * 3) 디스크립션 직접 써보기
 * ================================================================= */
const DETECT: [Tag, RegExp, string][] = [
  ['기본', /(기본|노출|보여|보임|정렬|최신순|개씩|표시|고정)/, '처음 들어왔을 때 무엇이 어떻게 보이나요? (정렬, 개수, 기본 선택)'],
  ['조건', /(경우|일 때|이면|이라면|면\s|만\s|에만|조건|상태가)/, '언제 보이고 언제 숨나요? 역할·상태에 따라 달라지나요?'],
  ['예외', /(0건|없으면|없을 때|실패|오류|에러|품절|만료|권한|초과|끊|중복)/, '결과가 0건이거나, 실패하거나, 권한이 없거나, 인터넷이 끊기면요?'],
  ['문구', /[“"‘'][^”"’']{2,}[”"’']|문구/, '사용자가 실제로 읽는 문장을 따옴표로 적었나요?'],
  ['연결', /([A-Z]{2,6}-\d{2}|이동|연결|팝업|토스트)/, '누르면 어디로 가나요? 화면 ID로 적어요.'],
]
const DRAFTS: [string, string][] = [
  ['나쁜 예', '목록 노출'],
  ['보통', '최근 주문 목록을 최신순으로 보여준다. 카드를 누르면 상세로 이동.'],
  ['좋은 예', '최근 6개월 주문, 최신순, 20개씩 무한 스크롤. 0건이면 빈 화면 EMP-01. 가게 이름은 1줄 말줄임, 메뉴는 “[대표 메뉴] 외 N건”. 카드를 누르면 주문 상세 ORD-02-02로 이동.'],
]

function DescWriter() {
  const [text, setText] = useState(DRAFTS[0][1])
  const res = DETECT.map(([tag, re, q]) => ({ tag, ok: re.test(text), q }))
  const n = res.filter(r => r.ok).length
  return (
    <div className="sb-writer">
      <div className="sb-writer-in">
        <div className="sb-drafts">
          {DRAFTS.map(([k, v]) => <button key={k} type="button" className="btn ghost sm" data-draft={k} onClick={() => setText(v)}>{k} 넣기</button>)}
        </div>
        <label className="sb-field">
          <span>ORD-02-01 ③ 주문 카드 디스크립션</span>
          <textarea className="sb-input" rows={4} value={text} data-act="desc-input" onChange={e => setText(e.target.value)} />
        </label>
      </div>
      <div className="sb-writer-out" aria-live="polite">
        <div className="sb-cover"><b data-cover={n}>{n}</b> / 5칸</div>
        <ul>
          {res.map((r, i) => (
            <li key={r.tag} className={r.ok ? 'ok' : ''}>
              <i className={'tg tg-' + i}>{r.tag}</i>
              <span>{r.ok ? '있어요' : r.q}</span>
            </li>
          ))}
        </ul>
        <p className="muted">들어 있는 단어만 보고 짐작하는 간단한 검사예요. 진짜 기준은 “개발자가 묻지 않고 만들 수 있는가”예요.</p>
      </div>
    </div>
  )
}

/* =================================================================
 * 4) 변경 이력
 * ================================================================= */
interface Rev { ver: string; date: string; where: string; what: string; who: string }
const REVS: Rev[] = [
  { ver: 'v1.0', date: '2026-11-18', where: '전체', what: '최초 작성 (리뷰 확정)', who: 'Palmer' },
  { ver: 'v1.1', date: '2026-11-19', where: 'ORD-02-01 ④', what: '품절 메뉴가 있을 때 띄울 팝업 POP-ORD-01 추가', who: '디자인 지은' },
  { ver: 'v1.2', date: '2026-11-20', where: 'ORD-02-01 ⑤', what: '취소된 주문의 다시 담기: 회색으로 표시(못 누름) → 아예 숨김 (QA 문의 반영)', who: 'QA 민수' },
]
const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

function History() {
  const [rows, setRows] = useState<Rev[]>(REVS)
  const [draft, setDraft] = useState<Rev>({ ver: 'v1.3', date: new Date().toISOString().slice(0, 10), where: 'ORD-02-01 ⑥', what: '', who: '' })
  const add = () => {
    if (!draft.what.trim()) return
    setRows(r => [...r, draft])
    const [maj, min] = draft.ver.replace(/^v/, '').split('.').map(Number)
    setDraft(d => ({ ...d, ver: `v${maj || 1}.${(min || 0) + 1}`, what: '', where: '' }))
  }
  const md = '| 버전 | 날짜 | 위치 | 변경 내용 | 요청자 |\n| --- | --- | --- | --- | --- |\n' + rows.map(r => `| ${r.ver} | ${r.date} | ${r.where} | ${r.what} | ${r.who} |`).join('\n')
  const csv = '﻿버전,날짜,위치,변경 내용,요청자\n' + rows.map(r => [r.ver, r.date, r.where, r.what, r.who].map(csvCell).join(',')).join('\n')
  const latest = rows[rows.length - 1]?.ver
  return (
    <div className="sb-hist">
      <div className="sb-table-wrap">
        <table className="sys-table sb-hist-table">
          <thead><tr><th>버전</th><th>날짜</th><th>위치</th><th>변경 내용</th><th>요청자</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.ver === latest ? 'latest' : ''}>
                <td><b>{r.ver}</b></td><td>{r.date}</td><td><code>{r.where}</code></td><td>{r.what}</td><td>{r.who}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="sb-hist-form" onSubmit={e => { e.preventDefault(); add() }}>
        <input className="sb-input" aria-label="버전" value={draft.ver} onChange={e => setDraft(d => ({ ...d, ver: e.target.value }))} />
        <input className="sb-input" aria-label="위치 (화면 ID · 번호)" placeholder="ORD-02-01 ⑥" value={draft.where} onChange={e => setDraft(d => ({ ...d, where: e.target.value }))} />
        <input className="sb-input grow" aria-label="변경 내용" placeholder="무엇이 → 어떻게 바뀌었나요?" data-act="hist-what" value={draft.what} onChange={e => setDraft(d => ({ ...d, what: e.target.value }))} />
        <input className="sb-input" aria-label="요청자" placeholder="요청자" value={draft.who} onChange={e => setDraft(d => ({ ...d, who: e.target.value }))} />
        <button type="submit" className="btn sm" disabled={!draft.what.trim()} data-act="hist-add">추가</button>
      </form>
      <div className="sb-actions">
        <button type="button" className="btn ghost sm" data-act="hist-csv" onClick={() => download('변경이력.csv', csv, 'text/csv')}>CSV 다운로드</button>
        <button type="button" className="btn ghost sm" onClick={() => download('변경이력.md', md, 'text/markdown')}>.md 다운로드</button>
      </div>
      <ul className="sb-rules">
        <li><b>버전 규칙:</b> 검토를 거쳐 확정하면 앞자리를 올려요(v1.0 → v2.0). 확정한 뒤에 고치면 뒷자리를 올려요(v1.1, v1.2).</li>
        <li><b>색 표시:</b> 이번 버전에서 바뀐 곳은 주황색으로 칠해요. 지운 내용은 <s>취소선</s>을 그어 남겨요. 다음 버전을 올릴 때 이전 표시는 지워요.</li>
        <li><b>위치는 <Term k="화면 ID" d={EXTRA['화면 ID']} /> + 번호로:</b> “주문 내역 버튼 수정”이 아니라 “ORD-02-01 ④”라고 써요. 그래야 개발자가 바로 찾아요.</li>
        <li><b>이유와 요청한 사람:</b> 3개월 뒤 “이거 누가 바꾸자고 했죠?”라는 질문에 답할 수 있어야 해요.</li>
      </ul>
    </div>
  )
}

/* =================================================================
 * 5) 화면 ID 명명 규칙
 * ================================================================= */
const AREAS: [string, string][] = [['HOME', '홈'], ['STORE', '가게'], ['CART', '장바구니'], ['ORD', '주문'], ['MY', '마이'], ['SET', '설정']]
type Kind = 'screen' | 'pop' | 'emp'

function IdBuilder() {
  const [area, setArea] = useState('ORD')
  const [kind, setKind] = useState<Kind>('screen')
  const [d1, setD1] = useState(2)
  const [d2, setD2] = useState(1)
  const pad = (n: number) => String(n).padStart(2, '0')
  const id = kind === 'pop' ? `POP-${area}-${pad(d1)}` : kind === 'emp' ? `EMP-${pad(d1)}` : d2 > 0 ? `${area}-${pad(d1)}-${pad(d2)}` : `${area}-${pad(d1)}`
  return (
    <div className="sb-id">
      <div className="sb-id-form">
        <label className="sb-field"><span>영역</span>
          <select className="sb-input" value={area} onChange={e => setArea(e.target.value)} data-act="id-area">
            {AREAS.map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
          </select>
        </label>
        <div className="sb-field"><span>종류</span>
          <Seg value={kind} onChange={setKind} options={[['screen', '화면'], ['pop', '팝업'], ['emp', '빈 화면']] as const} />
        </div>
        <label className="sb-field"><span>{kind === 'screen' ? '1단계 번호' : '번호'}</span>
          <input className="sb-input" type="number" min={1} max={99} value={d1} onChange={e => setD1(Math.max(1, Math.min(99, +e.target.value || 1)))} />
        </label>
        {kind === 'screen' && (
          <label className="sb-field"><span>2단계 번호 (0이면 없음)</span>
            <input className="sb-input" type="number" min={0} max={99} value={d2} onChange={e => setD2(Math.max(0, Math.min(99, +e.target.value || 0)))} />
          </label>
        )}
      </div>
      <div className="sb-id-out">
        <code className="sb-id-code" data-id={id}>{id}</code>
        <ul className="sb-id-tree">
          <li><code>MY-01</code> 마이</li>
          <li className="d2"><code>ORD-02-01</code> 주문 내역</li>
          <li className="d3"><code>ORD-02-02</code> 주문 상세</li>
          <li className="d3"><code>POP-ORD-01</code> 품절 메뉴 팝업</li>
          <li className="d3"><code>EMP-01</code> 주문 내역 0건</li>
        </ul>
      </div>
      <ul className="sb-rules">
        <li>영역 코드는 대문자 영어 2~5자로 써요. 번호는 두 자리(01, 02)로 맞춰요. 그래야 이름순으로 정렬해도 순서가 맞아요.</li>
        <li>깊이는 하이픈(-)으로 이어요. <code>ORD-02-01</code>은 ‘주문 영역 → 2번 메뉴 → 1번 화면’이에요.</li>
        <li>팝업·빈 화면·바텀시트처럼 여러 화면에서 같이 쓰는 것은 앞에 따로 표시(POP, EMP)를 붙여요.</li>
        <li>화면이 없어져도 그 ID는 다른 화면에 다시 쓰지 않아요(결번). 예전 로그나 QA 기록과 헷갈리지 않게 하려고요.</li>
        <li>디자인 파일의 프레임 이름, 이벤트 로그의 <code>screen_id</code>, QA 버그 보고에 모두 같은 ID를 써요. <Term k="IA" />를 만드는 법은 <a href="#/plan/flow">02 구조 · 동선</a>에 있어요.</li>
      </ul>
    </div>
  )
}

/* =================================================================
 * 6) 공통 정책 장표 — 실시간 미리보기
 * ================================================================= */
const DAYS = ['일', '월', '화', '수', '목', '금', '토']
function fmtDate(iso: string, now: Date) {
  const d = new Date(iso)
  if (isNaN(+d)) return '—'
  const same = d.toDateString() === now.toDateString()
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0')
  if (same) return `오늘 ${hh}:${mm}`
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${DAYS[d.getDay()]})`
}
const fmtWon = (n: number) => (n <= 0 ? '무료' : n.toLocaleString('ko-KR') + '원')

function CommonPolicy() {
  const [store, setStore] = useState('엄마손 반찬가게 망원시장 본점 (주말 특가 진행 중)')
  const [menu, setMenu] = useState('국내산 멸치 아몬드 볶음')
  const [count, setCount] = useState(3)
  const [price, setPrice] = useState(18500)
  const [when, setWhen] = useState('2026-11-02T18:40')
  const now = new Date()
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T12:30`
  return (
    <div className="sb-pol">
      <div className="sb-pol-form">
        <label className="sb-field"><span>가게 이름</span><input className="sb-input" value={store} onChange={e => setStore(e.target.value)} data-act="pol-store" /></label>
        <label className="sb-field"><span>대표 메뉴</span><input className="sb-input" value={menu} onChange={e => setMenu(e.target.value)} /></label>
        <div className="sb-pol-row">
          <label className="sb-field"><span>메뉴 수</span><input className="sb-input" type="number" min={1} max={30} value={count} onChange={e => setCount(Math.max(1, +e.target.value || 1))} /></label>
          <label className="sb-field"><span>결제 금액</span><input className="sb-input" type="number" min={0} step={100} value={price} onChange={e => setPrice(+e.target.value || 0)} data-act="pol-price" /></label>
        </div>
        <label className="sb-field"><span>주문 일시</span><input className="sb-input" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} /></label>
        <div className="sb-drafts">
          <button type="button" className="btn ghost sm" onClick={() => setWhen(todayIso)}>오늘로</button>
          <button type="button" className="btn ghost sm" onClick={() => setPrice(0)}>0원으로</button>
          <button type="button" className="btn ghost sm" onClick={() => setCount(1)}>메뉴 1개로</button>
        </div>
      </div>
      <div className="sb-pol-out">
        <div className="sb-pol-card" data-act="pol-card">
          <div className="sb-w-thumb" />
          <div className="sb-pol-lines">
            <b className="ell" title={store}>{store || '—'}</b>
            <span>{fmtDate(when, now)}</span>
            <span className="ell">{menu}{count > 1 ? ` 외 ${count - 1}건` : ''} · <b data-won>{fmtWon(price)}</b></span>
          </div>
        </div>
        <table className="sys-table sb-pol-table">
          <tbody>
            <tr><th>P-01 날짜</th><td>YYYY.MM.DD (요일). 오늘이면 “오늘 HH:MM”. 시간은 24시간제</td></tr>
            <tr><th>P-02 금액</th><td>천 단위마다 쉼표 + “원”. 0원은 “무료”</td></tr>
            <tr><th>P-03 말줄임</th><td>가게 이름·메뉴는 1줄을 넘으면 “…”로 줄임. 전체는 상세 화면에서 보여줌</td></tr>
            <tr><th>P-04 메뉴 요약</th><td>“[대표 메뉴] 외 N건”. 메뉴가 1개면 “외 N건”은 뺌</td></tr>
            <tr><th>P-05 빈 화면</th><td>그림 + 지금 상황을 알리는 문구 + 다음에 할 일 버튼 1개</td></tr>
          </tbody>
        </table>
      </div>
      <Note>
        <b>공통 정책 장표가 없으면</b> 같은 금액이 어떤 화면에선 “18500원”, 다른 화면에선 “18,500 원”으로 나가요. 장표마다 따로 적으면 반드시 어딘가 어긋나요.
        빈 화면을 상황별로 그리는 법은 <a href="#/empty">빈 화면 가이드</a>를, 로딩·오류 화면은 <a href="#/system/state">디자인 시스템 · 상태</a>를 보세요.
      </Note>
    </div>
  )
}

/* =================================================================
 * 7) 표준 템플릿 (전체 문서)
 * ================================================================= */
function storyboardMd(project: string, owner: string) {
  const today = new Date().toISOString().slice(0, 10)
  const rows = DESCS.filter(d => !d.empty).map(d => d.good.filter(l => l.chg !== 'del').map((l, i) => `| ${i === 0 ? d.n : ''} | ${i === 0 ? d.name : ''} | ${l.tag} | ${plain(l.text)} |`).join('\n')).join('\n')
  const empty = DESCS.find(d => d.empty)!.good.map((l, i) => `| ${i === 0 ? 1 : ''} | ${i === 0 ? '빈 화면' : ''} | ${l.tag} | ${plain(l.text)} |`).join('\n')
  return `# ${project} 화면설계서

## 0. 표지
| 항목 | 내용 |
| --- | --- |
| 프로젝트 | ${project} |
| 문서 버전 | v1.2 |
| 작성자 | ${owner} |
| 최종 수정 | ${today} |
| 관련 문서 | PRD (링크) · 디자인 (링크) · 이벤트 정의 (링크) |
| 리뷰어 | 디자인 (이름) · 개발 (이름) · QA (이름) |

## 1. 변경 이력
| 버전 | 날짜 | 위치 | 변경 내용 | 요청자 |
| --- | --- | --- | --- | --- |
${REVS.map(r => `| ${r.ver} | ${r.date} | ${r.where} | ${r.what} | ${r.who} |`).join('\n')}

> 이번 버전에서 바뀐 곳은 색으로, 지운 내용은 ~~취소선~~으로 표시해요.

## 2. IA (이번 범위)
| 화면 ID | 화면 이름 | 경로 | 접근 권한 | 이번 범위 |
| --- | --- | --- | --- | --- |
| MY-01 | 마이 | 탭바 > 마이 | 구매자 |  |
| ORD-02-01 | 주문 내역 | 마이 > 주문 내역 | 구매자 | ● |
| ORD-02-02 | 주문 상세 | 주문 내역 > 카드 | 구매자 |  |
| POP-ORD-01 | 품절 메뉴 팝업 | 다시 담기 | 구매자 | ● |
| EMP-01 | 주문 내역 0건 | 주문 내역 | 구매자 | ● |

## 3. 공통 정책
| ID | 항목 | 규칙 |
| --- | --- | --- |
| P-01 | 날짜 | YYYY.MM.DD (요일). 오늘이면 “오늘 HH:MM”. 시간은 24시간제 |
| P-02 | 금액 | 천 단위마다 쉼표 + “원”. 0원은 “무료” |
| P-03 | 말줄임 | 가게 이름·메뉴는 1줄을 넘으면 “…”로 줄임 |
| P-04 | 메뉴 요약 | “[대표 메뉴] 외 N건”. 메뉴가 1개면 “외 N건”은 뺌 |
| P-05 | 빈 화면 | 그림 + 지금 상황을 알리는 문구 + 다음에 할 일 버튼 1개 |

## 4. 화면 장표

### ORD-02-01 주문 내역
- 경로: 마이(MY-01) > 주문 내역
- 와이어프레임: (이미지 링크 또는 피그마 프레임 ORD-02-01)

| 번호 | 요소 | 구분 | 디스크립션 |
| --- | --- | --- | --- |
${rows}

### EMP-01 주문 내역 0건
| 번호 | 요소 | 구분 | 디스크립션 |
| --- | --- | --- | --- |
${empty}

---
디스크립션 구분: 기본(처음 모습) · 조건(언제 보이나) · 예외(안 될 때) · 문구(실제 문장) · 연결(누르면 어디로)
`
}
function plain(n: ReactNode): string {
  if (typeof n === 'string' || typeof n === 'number') return String(n).replace(/\|/g, '/')
  return ''
}

function Template() {
  const [project, setProject] = useState('오늘반찬 재주문')
  const [owner, setOwner] = useState('Palmer')
  const md = useMemo(() => storyboardMd(project, owner), [project, owner])
  return (
    <div className="sb-tpl">
      <div className="sb-tpl-form">
        <label className="sb-field"><span>프로젝트</span><input className="sb-input" value={project} onChange={e => setProject(e.target.value)} /></label>
        <label className="sb-field"><span>작성자</span><input className="sb-input" value={owner} onChange={e => setOwner(e.target.value)} /></label>
      </div>
      <CodeBlock code={md} label="화면설계서.md" maxHeight={380} />
      <div className="sb-actions">
        <button type="button" className="btn sm" data-act="sb-download" onClick={() => download('화면설계서.md', md, 'text/markdown')}>.md 다운로드</button>
        <span className="muted">와이어프레임은 그림이라 링크 넣을 자리만 남겨 뒀어요. 장표 그림은 피그마나 파워포인트로 그리고, 디스크립션 표는 이 형식을 그대로 써요.</span>
      </div>
    </div>
  )
}

/* =================================================================
 * 8) 체크리스트
 * ================================================================= */
const CHECKS = [
  '모든 장표에 화면 ID · 경로 · 버전이 있나요?',
  '번호마다 기본 상태 · 조건 · 예외 · 문구 · 연결을 확인했나요? (필요 없는 칸도 “없음”을 확인하고 비웠나요?)',
  '0건 · 로딩 · 실패 · 권한 없음 화면이 장표로 따로 있나요?',
  '사용자가 읽는 문장을 따옴표 안에 그대로 적었나요? (“적절한 안내 문구”는 문구가 아니에요)',
  '이어지는 화면을 이름이 아니라 화면 ID로 적었나요?',
  '날짜 · 금액 · 말줄임 규칙을 장표마다 쓰지 않고 공통 정책 한 곳에 모았나요?',
  '이번 버전에서 바뀐 곳에 색 표시가 있고, 변경 이력에도 적었나요?',
  '디자이너 시안과 장표가 다른 곳은 없나요? 디자인 작업 중에 바뀐 결정도 장표에 옮겼나요?',
]
function Checklist() {
  const [on, setOn] = useState<boolean[]>(() => CHECKS.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <>
      <ul className="sb-checklist">
        {CHECKS.map((t, i) => <li key={i}><label><input type="checkbox" checked={on[i]} onChange={e => setOn(o => o.map((v, j) => (j === i ? e.target.checked : v)))} /><span>{t}</span></label></li>)}
      </ul>
      <div className="sb-progress" aria-live="polite"><div style={{ width: (n / CHECKS.length) * 100 + '%' }} /><span>{n} / {CHECKS.length}</span></div>
    </>
  )
}

/* ================================================================= */
export default function StoryboardTab() {
  return (
    <div data-plan="storyboard">
      <TermList keys={['화면설계서', '와이어프레임', '디스크립션', '장표', '화면 ID', 'IA', 'PRD', 'QA', '인수 조건', '엣지 케이스', '무한 스크롤', '토스트', '말줄임']} extra={EXTRA} />
      <SysGrid>
        <Section id="plan-sb-intro" wide title="화면설계서는 “묻지 않고 만들 수 있게” 하는 문서예요"
          gist="그림보다 설명이 중요해요. 번호마다 동작을 빠짐없이 적어요."
          desc={<>주니어 화면설계서에서 가장 자주 보는 설명은 “목록 노출” 한 마디예요. 그림이 예뻐도 설명이 한 단어면, 나머지는 개발자가 짐작해서 채워요.</>}>
          <div className="sb-intro">
            <p>
              화면설계서는 가구 조립 설명서와 비슷해요. 그림만 있고 “어느 나사를 어디에”가 없으면, 조립하는 사람이 짐작해야 해요.
            </p>
            <p>
              <Term k="화면설계서" />(스토리보드)는 국내 실무에서 지금도 가장 많이 쓰는 상세 설계 문서예요. 회색 <Term k="와이어프레임" /> 위에 번호를 붙이고, 번호마다 <b>어떻게 동작하는지</b> 적어요.
              이 설명을 <Term k="디스크립션" />이라고 불러요.
            </p>
            <p>
              디자이너는 이걸 보고 화면을 그려요. 개발자는 이걸 보고 만들고, <Term k="QA" /> 담당은 테스트 목록을 써요. 그래서 설명 한 줄이 세 사람의 일을 정해요.
            </p>
            <div className="sb-intro-tags" aria-label="디스크립션 다섯 칸">
              {TAGS.map((t, i) => <span key={t} className={'tg tg-' + i}>{t}</span>)}
            </div>
          </div>
        </Section>

        <Section id="plan-sb-doc" wide title="문서 순서: 표지 → 변경 이력 → IA → 공통 정책 → 화면별 장표"
          gist="앞쪽 장은 “최신인지, 뭐가 바뀌었는지, 어디 있는지”를 알려줘요."
          desc={<>순서에는 이유가 있어요. 단계를 눌러 각 <Term k="장표" d={EXTRA['장표']}>장</Term>에 무엇을 넣는지 보세요. <Term k="IA" />는 메뉴와 화면의 지도예요.</>}>
          <DocStructure />
        </Section>

        <Section id="plan-sb-slide" wide title="직접 눌러 보는 장표: ORD-02-01 주문 내역"
          gist="한 단어 설명은 질문을 남기고, 다섯 칸 설명은 답을 남겨요."
          desc={<>오늘반찬 ‘재주문’ 기능의 <Term k="장표" d={EXTRA['장표']} />예요. 그림의 번호를 누르면 오른쪽 설명이, 설명을 누르면 그림이 강조돼요. 위 버튼으로 나쁜 설명과 좋은 설명을 바꿔 보세요.</>}>
          <Slide />
        </Section>

        <Section id="plan-sb-writer" wide title="디스크립션 쓰는 법: 다섯 칸 채우기"
          gist="기본·조건·예외·문구·연결, 다섯 가지를 빠짐없이 적어요."
          desc={<><Term k="디스크립션" />은 다섯 칸으로 나눠 생각해요. 기본 상태, 조건(언제 보이나), 예외(안 될 때), 문구(실제 문장), 연결(누르면 어디로)이에요. 직접 써 보면 무엇이 빠졌는지 바로 알려줘요.</>}>
          <DescWriter />
        </Section>

        <Section id="plan-sb-history" title="변경 이력 남기는 법"
          gist="무엇이 언제 왜 바뀌었는지 한 줄씩 남겨야 사고가 안 나요."
          desc="버전, 날짜, 위치, 변경 내용, 요청한 사람. 이 다섯 칸이면 충분해요.">
          <History />
        </Section>

        <Section id="plan-sb-id" title="화면 ID 짓는 규칙"
          gist="화면마다 주소를 붙이면 모두가 같은 화면을 가리킬 수 있어요."
          desc={<><Term k="화면 ID" d={EXTRA['화면 ID']} />는 아파트 동·호수 같은 주소예요. 기획·디자인·개발·QA·데이터 담당이 모두 같은 ID로 화면을 불러요. 아래에서 규칙대로 만들어 보세요.</>}>
          <IdBuilder />
        </Section>

        <Section id="plan-sb-policy" wide title="공통 정책 장표: 날짜 · 금액 · 말줄임 · 빈 화면"
          gist="표기 규칙을 한 장에 모으면 모든 화면이 똑같이 보여요."
          desc={<>예를 들어 오늘반찬에서는 금액을 어느 화면에서든 “18,500원”으로 보여줘요. 아래 값을 바꿔 보세요. 규칙 한 장이 카드의 날짜·금액·<Term k="말줄임" d={EXTRA['말줄임']} />을 모두 맞춰요.</>}>
          <CommonPolicy />
        </Section>

        <Section id="plan-sb-tpl" wide title="바로 쓰는 템플릿: 화면설계서(.md)"
          gist="오늘반찬 예시가 채워진 양식이에요. 내용만 바꿔 쓰면 돼요."
          desc="표지부터 디스크립션 표까지 오늘반찬 예시로 채워 뒀어요. 내려받아서 내용만 바꿔 쓰면 돼요.">
          <Template />
        </Section>

        <Section id="plan-sb-check" title="사수의 체크리스트"
          gist="검토 전에 이 8가지에 모두 “네”라고 답할 수 있어야 해요."
          desc="화면설계서를 검토할 때 제가 실제로 묻는 질문이에요.">
          <Checklist />
        </Section>

        <Section id="plan-sb-ref" title="참고 · 이어서 보기"
          gist="상태·빈 화면·예외를 더 자세히 다룬 곳으로 이어져요.">
          <ul className="sb-ref">
            <li><a href="#/system/state">디자인 시스템 · 상태</a> — 버튼 같은 부품의 6가지 상태와, 데이터의 4가지 상태(로딩·빈·오류·정상)</li>
            <li><a href="#/empty">빈 화면 가이드</a> — 처음 쓸 때, 검색 0건, 필터 0건, 인터넷 끊김 등 상황별 빈 화면</li>
            <li><a href="#/layout/layout-infinite">무한 스크롤 카드</a> — 페이지 번호 방식과 <Term k="무한 스크롤" d={EXTRA['무한 스크롤']} />의 차이</li>
            <li><a href="#/plan/policy">04 정책 · 예외</a> — 디스크립션의 ‘예외’ 칸을 채울 <Term k="엣지 케이스" /> 목록</li>
            <li>Atlassian Agile Coach — <Term k="인수 조건" />(AC)은 디스크립션과 짝을 이뤄 QA의 확인 기준이 돼요</li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
