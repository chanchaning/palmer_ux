import { useMemo, useState, type ReactNode } from 'react'
import { Seg, useTimers } from '../../components/ui'
import { download } from '../../system/export'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { Term, TermList } from '../../components/Term'
import './map.css'

/* =================================================================
 * 데이터 — 단계 × 역할 산출물
 * ================================================================= */
type Role = 'pm' | 'ux'
type StageId = 'discover' | 'structure' | 'detail' | 'system' | 'verify'

const STAGES: { id: StageId; name: string; q: string }[] = [
  { id: 'discover', name: '발견 · 정의', q: '무엇을, 왜 풀까?' },
  { id: 'structure', name: '구조 설계', q: '어떤 화면이 어떻게 이어질까?' },
  { id: 'detail', name: '상세 설계', q: '화면마다 정확히 어떻게 동작할까?' },
  { id: 'system', name: '시스템화', q: '반복되는 규칙을 어디에 모을까?' },
  { id: 'verify', name: '검증 · 개선', q: '의도대로 됐고, 효과가 있었나?' },
]

interface Art {
  id: string; name: string; role: Role; stage: StageId
  what: string; ex: string; to: string
  href: string; hrefLabel: string
}

const ARTS: Art[] = [
  /* 발견 · 정의 */
  { id: 'prd', name: 'PRD', role: 'pm', stage: 'discover',
    what: '풀 문제, 목표, 성공 기준, 범위를 한 문서에 모아요. 범위에는 이번에 하는 것과 안 하는 것을 같이 적어요. 뒤에 나오는 모든 문서가 여기서 시작해요.',
    ex: '“재주문하려면 평균 6번 눌러야 해서 중간에 나간다 → 3번 이하로 줄인다.” 이번 범위는 ‘최근 주문에서 다시 담기’까지예요. 정기 배송은 빼요.',
    to: '디자이너·개발자·QA가 “이걸 왜 하지?”, “이것도 해야 해?”가 궁금할 때 펼쳐 봐요.',
    href: '#/plan/prd', hrefLabel: '01 문제 정의 · PRD' },
  { id: 'research', name: '유저 리서치', role: 'pm', stage: 'discover',
    what: '인터뷰, 설문, 사용 기록(로그)을 보고 사용자가 정말 겪는 문제인지 확인해요. 보통 디자이너와 같이 해요.',
    ex: '단골 구매자 인터뷰에서 “지난주에 시킨 거 또 시키고 싶은데 찾기 귀찮다”는 말이 여러 번 나와요. 사용 기록을 보면 주문 내역을 열었다가 다시 메뉴 검색으로 가는 사람이 많아요.',
    to: '디자이너가 페르소나와 고객 여정 지도를 만들 때 재료가 돼요. PRD의 ‘배경’ 칸에도 들어가요.',
    href: '#/plan/prd', hrefLabel: '01 문제 정의 · PRD' },
  { id: 'kpi', name: 'KPI · 성공 지표', role: 'pm', stage: 'discover',
    what: '성공했는지 판단할 숫자와 기준을 출시 전에 정해요. 출시 뒤에 정하면 결과가 좋아 보이는 숫자만 고르게 돼요.',
    ex: '핵심: 재주문 비율. 보조: 재주문까지 누르는 횟수(탭 수). 가드레일(나빠지면 안 되는 숫자): 주문 취소율.',
    to: '데이터 담당이 이 숫자를 모으려고 어떤 행동을 기록할지(이벤트 로그) 정해요. 출시 후 리뷰에서도 이 숫자로 판단해요.',
    href: '#/plan/metrics', hrefLabel: '06 지표 · 데이터' },
  { id: 'persona', name: '페르소나', role: 'ux', stage: 'discover',
    what: '리서치에서 나온 대표 사용자를 실제 한 사람처럼 정리해요. 회의에서 “이 사람이라면 어떻게 할까?”를 물을 때 써요.',
    ex: '‘퇴근길 맞벌이 지은’: 평일 저녁 7시에 지하철에서 주문해요. 지난주 반찬을 그대로 다시 시키고 싶어 해요.',
    to: 'PRD의 ‘대상 사용자’와 같은 사람을 가리키는지 기획자와 맞춰요.',
    href: '#/plan/prd', hrefLabel: '01 PRD의 대상 사용자' },
  { id: 'journey', name: '고객 여정 지도', role: 'ux', stage: 'discover',
    what: '사용자가 서비스를 처음 알게 된 순간부터 다시 주문하기까지 따라가요. 단계마다 무엇을 하고, 생각하고, 느끼고, 불편해하는지 한 줄로 그려요.',
    ex: '재주문 단계에서 기분이 가장 나빠요. “지난번 그 메뉴 이름이 뭐였지?”',
    to: '기분이 가장 나쁜 지점이 PRD에서 풀 문제의 후보가 돼요.',
    href: '#/bias/bias-peak', hrefLabel: '피크엔드 법칙 카드' },

  /* 구조 설계 */
  { id: 'ia', name: 'IA (정보 구조도)', role: 'pm', stage: 'structure',
    what: '서비스의 메뉴와 화면을 나무 모양(트리)으로 정리하고, 화면마다 ID를 붙여요. 화면설계서와 이벤트 로그도 이 ID를 같이 써요.',
    ex: '마이 > 주문 내역 ORD-02-01 > 주문 상세 ORD-02-02',
    to: '디자이너는 메뉴 이동 구조를, 개발자는 화면 주소(라우팅)를, QA는 어디까지 테스트할지를 정할 때 봐요.',
    href: '#/plan/flow', hrefLabel: '02 구조 · 동선' },
  { id: 'spec', name: '기능 명세서', role: 'pm', stage: 'structure',
    what: '만들 기능을 잘게 나눠 목록으로 만들어요. 기능마다 ID, 설명, 쓰는 사람, 우선순위를 적어요.',
    ex: 'F-ORD-03 다시 담기 · 구매자 · Must / F-ORD-04 품절 대체 안내 · 구매자 · Should',
    to: '개발 리드가 일이 얼마나 걸릴지(공수) 계산하고 스프린트를 나눌 때 기준이 돼요.',
    href: '#/plan/priority', hrefLabel: '05 우선순위' },
  { id: 'flowchart', name: '조건 분기 플로우차트', role: 'pm', stage: 'structure',
    what: '“만약 ~라면?”을 마름모로 그려서 길이 갈리는 곳을 모두 드러내요. 화면을 그리기 전에 빠진 경우를 찾는 도구예요.',
    ex: '다시 담기 → 품절 메뉴가 있나? → 예: 대체 안내 팝업 / 아니요: 장바구니로 이동',
    to: '디자이너는 화면과 팝업이 몇 개 필요한지, 개발자는 조건마다 어떻게 처리할지 확인해요.',
    href: '#/plan/flow', hrefLabel: '02 구조 · 동선' },
  { id: 'userflow', name: '유저 플로우', role: 'ux', stage: 'structure',
    what: '사용자가 목표까지 지나가는 화면 순서를 그려요. 모든 일이 잘 풀리는 길(행복 경로)을 중심으로 그려요.',
    ex: '홈 → 마이 → 주문 내역 → 다시 담기 → 장바구니 → 결제 완료',
    to: '기획자의 플로우차트와 겹쳐 보면 화면에 빠진 갈림길이 보여요.',
    href: '#/plan/flow', hrefLabel: '02 구조 · 동선' },
  { id: 'lowfi', name: '로우 와이어프레임', role: 'ux', stage: 'structure',
    what: '색 없이 회색 상자로 무엇을 어디에, 무엇을 더 크게 둘지만 잡아요. 빨리 그리고 빨리 버리는 게 목적이에요.',
    ex: '주문 카드 안 ‘다시 담기’ 위치 2안: 오른쪽 위 작은 버튼 vs 카드 아래 꽉 찬 버튼',
    to: '기획자가 화면설계서의 바탕 그림으로 가져가요.',
    href: '#/system/structure', hrefLabel: '디자인 시스템 · 구조' },

  /* 상세 설계 */
  { id: 'storyboard', name: '화면설계서', role: 'pm', stage: 'detail',
    what: '와이어프레임 위 요소마다 번호를 달아요. 번호마다 평소 모습, 조건, 예외, 문구, 이동할 화면을 적은 문서예요.',
    ex: 'ORD-02-01 ④ 다시 담기: 취소된 주문에는 보이지 않아요. 누르면 장바구니(CART-01)로 이동해요.',
    to: '개발자는 만들 때 기준으로, QA는 테스트 케이스(TC)를 쓸 때 기준으로 써요.',
    href: '#/plan/storyboard', hrefLabel: '03 화면설계서' },
  { id: 'statediag', name: '상태 다이어그램', role: 'pm', stage: 'detail',
    what: '주문처럼 상태가 바뀌는 대상을 그려요. 어떤 상태가 있는지, 언제 다음 상태로 넘어가는지, 누가 넘기는지 적어요.',
    ex: '결제완료 → 배송준비중으로 넘어가면 ‘주문 취소’ 버튼 대신 ‘반품 신청’ 버튼만 보여요.',
    to: '개발자는 상태 값을, 디자이너는 상태마다 어떤 버튼을 보여줄지 확인해요.',
    href: '#/plan/policy', hrefLabel: '04 정책 · 예외' },
  { id: 'exception', name: '예외 정책', role: 'pm', stage: 'detail',
    what: '인터넷 끊김, 버튼 두 번 누르기, 결과 0건, 권한 없음처럼 일이 잘 안 풀릴 때의 규칙을 정해요.',
    ex: '다시 담는 중에 가게 영업이 끝나면 “지금은 주문할 수 없는 가게예요”라고 알려 주고 담지 않아요.',
    to: '디자이너는 빈 화면과 오류 화면을 그리고, QA는 예외 테스트 케이스를 써요.',
    href: '#/plan/policy', hrefLabel: '04 정책 · 예외' },
  { id: 'proto', name: '하이파이 프로토타입', role: 'ux', stage: 'detail',
    what: '실제 색, 글꼴, 화면 부품(컴포넌트)으로 화면을 만들어요. 화면끼리 연결해서 직접 눌러 볼 수 있게 해요.',
    ex: '다시 담기를 누르면 장바구니가 아래에서 올라오는 패널(바텀시트)로 뜨는 움직임까지 연결해요.',
    to: '관련 부서 리뷰와 사용성 테스트에 그대로 써요.',
    href: '#/transition', hrefLabel: '화면 전환 가이드' },
  { id: 'interaction', name: '인터랙션', role: 'ux', stage: 'detail',
    what: '누르고, 밀고, 화면이 바뀔 때 어떻게 움직이고 얼마나 걸리는지 정해요.',
    ex: '담기가 끝나면 장바구니 아이콘의 숫자 배지가 살짝 커졌다 돌아와요.',
    to: '개발자에게 시간(ms, 1000ms = 1초)과 움직임 속도 곡선(이징) 값으로 넘겨요.',
    href: '#/easing', hrefLabel: '이징 가이드' },
  { id: 'states6', name: '6대 상태 디자인', role: 'ux', stage: 'detail',
    what: '버튼과 입력창의 여섯 가지 상태를 빠짐없이 그려요. 기본, 마우스 올림(호버), 누름, 선택됨(포커스), 못 누름(비활성), 처리 중(로딩)이에요.',
    ex: '다시 담기 버튼은 처리 중에도 폭이 그대로이고, 빙글 도는 표시(스피너)를 보여줘요. 두 번 눌러도 한 번만 처리돼요.',
    to: '기획자의 예외 정책(두 번 누르기)과 짝이 맞는지 확인해요.',
    href: '#/system/state', hrefLabel: '디자인 시스템 · 상태' },

  /* 시스템화 */
  { id: 'taxonomy', name: '이벤트 택소노미', role: 'pm', stage: 'system',
    what: '사용자의 어떤 행동을 어떤 이름으로 기록할지 정한 사전이에요. 이름 짓는 규칙을 하나로 맞춰요.',
    ex: 'reorder_button_click · 함께 남기는 값 order_id, item_count · 화면 ORD-02-01',
    to: '개발자가 기록 코드를 넣고, 데이터 담당이 대시보드를 만들어요.',
    href: '#/plan/metrics', hrefLabel: '06 지표 · 데이터' },
  { id: 'rbac', name: '권한 매트릭스', role: 'pm', stage: 'system',
    what: '역할과 기능을 표로 놓고, 누가 무엇을 보고·만들고·고치고·지울 수 있는지 정해요.',
    ex: '사장님: 자기 가게 주문만 볼 수 있어요. 리뷰에는 답글만 달 수 있고 삭제는 못 해요.',
    to: '개발자는 권한 확인 코드를, 디자이너는 역할마다 보여줄 메뉴를 맞춰요.',
    href: '#/plan/policy', hrefLabel: '04 정책 · 예외' },
  { id: 'adminpolicy', name: '어드민 정책', role: 'pm', stage: 'system',
    what: '직원이 쓰는 관리 화면(백오피스)의 규칙이에요. 검색, 한꺼번에 처리, 다운로드, 변경 기록을 어떻게 할지 정해요.',
    ex: '주문 목록을 엑셀로 받을 때는 이유를 꼭 적어요. 전화번호 가운데 4자리는 가려서(마스킹) 보여줘요.',
    to: '운영팀과 고객센터(CS)팀이 실제로 쓰고, 보안 검토도 받아요.',
    href: '#/plan/admin', hrefLabel: '07 백오피스 · 연동' },
  { id: 'ds', name: '디자인 시스템', role: 'ux', stage: 'system',
    what: '색, 글자, 간격, 화면 부품을 이름 붙인 값(토큰)과 규칙으로 모아요. 그러면 모든 화면이 같은 모습을 갖게 돼요.',
    ex: '‘주문 카드’ 부품 하나를 주문 내역과 홈의 ‘최근 주문’에 같이 써요.',
    to: '개발자는 같은 이름의 값과 부품으로 만들어요.',
    href: '#/system/type', hrefLabel: '디자인 시스템' },

  /* 검증 · 개선 */
  { id: 'tc', name: 'QA 테스트 시나리오', role: 'pm', stage: 'verify',
    what: '인수 조건(AC)을 ‘준비 상태 – 하는 순서 – 나와야 할 결과’로 바꿔요. 그러면 누가 해도 같은 방법으로 확인할 수 있어요.',
    ex: 'TC-ORD-07 · 준비: 취소된 주문 1건 · 순서: 주문 내역 들어가기 · 결과: 그 카드에 다시 담기 버튼이 없음',
    to: 'QA가 실행하고, 그 결과를 보고 출시할지 정해요.',
    href: '#/plan/qa', hrefLabel: '09 QA · 출시' },
  { id: 'ab', name: 'A/B 가설', role: 'pm', stage: 'verify',
    what: '실험 전에 “무엇을 바꾸면, 어떤 숫자가, 왜 움직일지”를 적어요.',
    ex: '다시 담기 버튼을 카드 아래 꽉 찬 버튼으로 바꾸면 재주문 비율이 오를 것이다. 인터뷰에서 버튼을 못 찾았다는 말이 나왔기 때문이다.',
    to: '데이터 담당과 실험 기간, 참여 인원(표본), 나빠지면 안 되는 숫자(가드레일)를 정해요.',
    href: '#/plan/metrics', hrefLabel: '06 지표 · 데이터' },
  { id: 'funnel', name: '퍼널 분석', role: 'pm', stage: 'verify',
    what: '사용자가 단계마다 얼마나 넘어가고 얼마나 나가는지 봐요. 가장 많이 새는 곳부터 고쳐요.',
    ex: '주문 내역 들어가기 → 다시 담기 → 장바구니 → 결제 완료 중 어디서 가장 많이 나가는지 봐요.',
    to: '다음 개선 PRD의 ‘배경’ 칸으로 돌아가요. 기획은 이렇게 한 바퀴 돌아요.',
    href: '#/plan/metrics', hrefLabel: '06 지표 · 데이터' },
  { id: 'usability', name: '사용성 테스트', role: 'ux', stage: 'verify',
    what: '실제 사용자에게 할 일을 주고 지켜보며 막히는 곳을 찾아요. 하는 말보다 실제 행동을 봐요.',
    ex: '과제: “지난주에 시킨 반찬을 다시 주문해 보세요.” 몇 번 만에 하는지, 어디서 멈추는지 적어요.',
    to: '기획자는 규칙과 문구를, 디자이너는 화면을 고쳐요.',
    href: '#/laws', hrefLabel: 'UX 법칙 가이드' },
  { id: 'dqa', name: '디자인 QA', role: 'ux', stage: 'verify',
    what: '개발된 화면이 디자인과 같은지 실제 기기에서 확인해요. 간격, 색, 상태, 문구를 봐요.',
    ex: '로딩·비활성 상태가 빠지지 않았는지, 긴 가게 이름이 “…”로 줄어드는지 개발 중인 앱에서 눌러 봐요.',
    to: '개발자에게 화면 ID와 번호를 붙여 수정 요청을 넘겨요.',
    href: '#/system/state', hrefLabel: '디자인 시스템 · 상태' },
]
const ART = Object.fromEntries(ARTS.map(a => [a.id, a])) as Record<string, Art>
const ROLE_NAME: Record<Role, string> = { pm: '기획자 (PM/PO)', ux: '디자이너 (UX/UI)' }

/* =================================================================
 * 1) 산출물 지도
 * ================================================================= */
function DeliverableMap() {
  const [sel, setSel] = useState('prd')
  const [view, setView] = useState<'all' | Role>('all')
  const a = ART[sel]
  const stage = STAGES.find(s => s.id === a.stage)!
  const roles: Role[] = view === 'all' ? ['pm', 'ux'] : [view]
  return (
    <div className="mp-map">
      <div className="mp-map-bar">
        <Seg value={view} onChange={setView} options={[['all', '전체'], ['pm', '기획자만'], ['ux', '디자이너만']] as const} />
        <span className="muted">칸 안의 이름을 누르면 아래에 설명과 이동 링크가 나와요.</span>
      </div>
      <div className="mp-table-wrap">
        <table className={'mp-table cols-' + roles.length}>
          <thead>
            <tr>
              <th scope="col">단계</th>
              {roles.map(r => <th key={r} scope="col" className={'r-' + r}>{ROLE_NAME[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {STAGES.map((s, i) => (
              <tr key={s.id} className={s.id === a.stage ? 'on' : ''}>
                <th scope="row"><span className="mp-step">{i + 1}</span><b>{s.name}</b><small>{s.q}</small></th>
                {roles.map(r => (
                  <td key={r} className={'r-' + r} data-label={ROLE_NAME[r]}>
                    <div className="mp-chips">
                      {ARTS.filter(x => x.stage === s.id && x.role === r).map(x => (
                        <button key={x.id} type="button" data-art={x.id} className={'mp-chip r-' + r + (x.id === sel ? ' on' : '')}
                          aria-pressed={x.id === sel} onClick={() => setSel(x.id)}>{x.name}</button>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <article className={'mp-detail r-' + a.role} aria-live="polite" data-detail={a.id}>
        <header>
          <span className={'mp-tag r-' + a.role}>{ROLE_NAME[a.role]}</span>
          <span className="mp-tag">{stage.name}</span>
          <h4>{a.name}</h4>
        </header>
        <p className="mp-what">{a.what}</p>
        <dl>
          <div><dt>오늘반찬 ‘재주문’ 예시</dt><dd>{a.ex}</dd></div>
          <div><dt>누가 받아서 무엇을 하나</dt><dd>{a.to}</dd></div>
        </dl>
        <a className="mp-go" href={a.href}>{a.hrefLabel}에서 자세히 보기 →</a>
      </article>
    </div>
  )
}

/* =================================================================
 * 2) 역할 구분
 * ================================================================= */
const ROLES_CMP: { k: string; pm: ReactNode; po: ReactNode; sp: ReactNode }[] = [
  { k: '핵심 질문', pm: '무엇을 만들어야 사용자에게 가치가 있고, 돈이 되나?', po: '이번 스프린트에 무엇부터 만드나?', sp: '이 기능이 화면에서 어떤 규칙으로 정확히 어떻게 동작하나?' },
  { k: '주로 만드는 것', pm: '문제 정의, PRD, 목표와 지표, 로드맵(앞으로의 계획표)', po: '백로그(할 일 목록), 유저 스토리, 인수 조건(AC)', sp: 'PRD, IA, 플로우차트, 화면설계서, 정책서' },
  { k: '자주 만나는 사람', pm: '경영진, 디자이너, 개발 리드, 고객', po: '개발팀, QA (매일)', sp: '디자이너, 개발자, QA, 운영팀, 고객센터(CS)' },
  { k: '잘했다는 기준', pm: '출시 후 숫자가 목표만큼 움직였다', po: '팀이 막힘 없이 중요한 것부터 만들었다', sp: '개발자와 QA가 짐작하지 않고 만들었다. 예외 상황에서도 사고가 안 났다' },
]

function RoleCompare() {
  return (
    <>
      <div className="mp-table-wrap">
        <table className="sys-table mp-roles">
          <thead><tr><th style={{ width: '16%' }}></th><th>PM (프로덕트 매니저)</th><th>PO (프로덕트 오너)</th><th>서비스 기획자</th></tr></thead>
          <tbody>
            {ROLES_CMP.map(r => <tr key={r.k}><th scope="row">{r.k}</th><td>{r.pm}</td><td>{r.po}</td><td>{r.sp}</td></tr>)}
          </tbody>
        </table>
      </div>
      <Note tone="tip">
        <b>실제로는 이름보다 회사마다 맡는 일이 달라요.</b> 『인스파이어드』는 일을 이렇게 나눠요.
        PM은 가치(사람들이 살까?)와 사업성(회사에 맞을까?)을 맡아요. 디자이너는 사용성(쓰기 쉬울까?)을, 개발 리드는 실현 가능성(만들 수 있을까?)을 맡아요.
        PO는 <Term k="스크럼" d="2주 안팎의 짧은 기간(스프린트)을 반복하며 일하는 팀 운영 방식이에요. 정해진 역할과 회의가 있어요." />에서 <Term k="백로그" />의 순서를 정하는 역할이에요. 그래서 PM이 PO를 함께 맡는 팀도 많아요.
        국내의 ‘서비스 기획자’는 보통 PRD, 화면설계서, 정책서를 혼자 다 써요. 그래서 이 노트는 문제 정의부터 QA까지 전부 다뤄요.
      </Note>
    </>
  )
}

/* =================================================================
 * 3) 프로젝트 타임라인 — 재주문 기능
 * ================================================================= */
type Lane = 'pm' | 'ux' | 'dev' | 'qa'
const LANES: { id: Lane; name: string }[] = [
  { id: 'pm', name: '기획' }, { id: 'ux', name: '디자인' }, { id: 'dev', name: '개발' }, { id: 'qa', name: 'QA · 데이터' },
]
const BARS: { lane: Lane; from: number; to: number; label: string }[] = [
  { lane: 'pm', from: 1, to: 1, label: 'PRD · KPI' },
  { lane: 'pm', from: 2, to: 2, label: 'IA · 명세 · 분기' },
  { lane: 'pm', from: 3, to: 4, label: '화면설계서 · 정책' },
  { lane: 'pm', from: 5, to: 5, label: 'TC · 어드민' },
  { lane: 'pm', from: 7, to: 7, label: '출시 준비' },
  { lane: 'pm', from: 8, to: 8, label: '출시 · 지표' },
  { lane: 'ux', from: 1, to: 1, label: '리서치 · 여정' },
  { lane: 'ux', from: 2, to: 2, label: '플로우 · 로우' },
  { lane: 'ux', from: 3, to: 4, label: '하이파이 · 프로토' },
  { lane: 'ux', from: 6, to: 7, label: '디자인 QA' },
  { lane: 'dev', from: 3, to: 3, label: '기술 검토' },
  { lane: 'dev', from: 4, to: 6, label: '구현' },
  { lane: 'dev', from: 7, to: 7, label: '버그 수정' },
  { lane: 'qa', from: 4, to: 4, label: '이벤트 설계' },
  { lane: 'qa', from: 6, to: 7, label: '테스트' },
  { lane: 'qa', from: 8, to: 8, label: '모니터링' },
]
const WEEKS: { w: number; title: string; items: [Lane, string, string?][] }[] = [
  { w: 1, title: '문제를 확인해요', items: [['pm', 'PRD 초안 (문제·목표·범위)', 'prd'], ['pm', '성공 지표 정의 — 재주문 비율, 탭 수', 'kpi'], ['ux', '구매자 인터뷰 · 고객 여정 지도', 'journey']] },
  { w: 2, title: '구조를 정해요', items: [['pm', 'PRD 리뷰 후 확정 (이제 범위를 더 늘리지 않음)', 'prd'], ['pm', 'IA에 ORD-02-01 추가 · 기능 명세 · 분기 플로우차트', 'flowchart'], ['ux', '유저 플로우 · 로우 와이어프레임 2안', 'lowfi']] },
  { w: 3, title: '자세히 그려요', items: [['pm', '화면설계서 v1.0 · 예외 정책', 'storyboard'], ['ux', '하이파이 시안', 'proto'], ['dev', '기술 검토 · 작업 기간 계산 (API에 조회 기간 값을 새로 받아야 하나?)']] },
  { w: 4, title: '만들기 시작해요', items: [['pm', '화면설계서 v1.1 (리뷰 반영, 변경 이력 기록)', 'storyboard'], ['ux', '프로토타입 · 6대 상태', 'states6'], ['dev', '개발 시작'], ['qa', '이벤트 택소노미 확정 (reorder_button_click)', 'taxonomy']] },
  { w: 5, title: '검증을 준비해요', items: [['pm', 'QA 테스트 시나리오 작성 (AC → TC)', 'tc'], ['pm', '어드민 · CS 안내 문구', 'adminpolicy'], ['dev', '구현 계속']] },
  { w: 6, title: '맞는지 확인해요', items: [['ux', '디자인 QA 시작', 'dqa'], ['dev', '개발 완료 → 테스트용 앱(QA 빌드) 전달'], ['qa', 'TC 실행 · 버그 등록', 'tc']] },
  { w: 7, title: '다듬어요', items: [['dev', '출시를 막는 심각한 버그(Blocker · Critical) 수정'], ['qa', '회귀 테스트'], ['ux', '디자인 QA 마무리', 'dqa'], ['pm', '출시 체크리스트 · 되돌리기(롤백) 계획']] },
  { w: 8, title: '내보내고 지켜봐요', items: [['pm', '출시 · A/B 또는 퍼널 모니터링 시작', 'funnel'], ['qa', '이벤트 로그 수집 확인'], ['pm', '2주 뒤 출시 리뷰 일정 잡기', 'ab']] },
]
const LANE_NAME = Object.fromEntries(LANES.map(l => [l.id, l.name])) as Record<Lane, string>

function Timeline() {
  const T = useTimers()
  const [week, setWeek] = useState(1)
  const [playing, setPlaying] = useState(false)
  const cur = WEEKS[week - 1]
  const play = () => {
    if (playing) { T.clear(); setPlaying(false); return }
    setPlaying(true)
    const step = (w: number) => {
      setWeek(w)
      if (w < 8) T.set(() => step(w + 1), 1100)
      else T.set(() => setPlaying(false), 600)
    }
    step(1)
  }
  return (
    <div className="mp-tl">
      <div className="mp-tl-bar">
        <div className="mp-weeks" role="radiogroup" aria-label="주차 선택">
          {WEEKS.map(x => (
            <button key={x.w} type="button" role="radio" aria-checked={x.w === week} data-week={x.w}
              className={x.w === week ? 'on' : ''} onClick={() => { T.clear(); setPlaying(false); setWeek(x.w) }}>{x.w}주</button>
          ))}
        </div>
        <button type="button" className="btn ghost sm" onClick={play} data-act="tl-play">{playing ? '■ 멈춤' : '▶ 1주부터 재생'}</button>
      </div>
      <div className="mp-gantt-wrap">
        <div className="mp-gantt" style={{ ['--wk' as string]: week }}>
          <div className="mp-g-head"><span />{WEEKS.map(x => <span key={x.w} className={x.w === week ? 'on' : ''}>W{x.w}</span>)}</div>
          {LANES.map(l => (
            <div key={l.id} className="mp-g-row">
              <span className="mp-g-lane">{l.name}</span>
              <div className="mp-g-track">
                <i className="mp-g-now" aria-hidden="true" />
                {BARS.filter(b => b.lane === l.id).map(b => (
                  <span key={b.label} className={'mp-g-bar l-' + l.id + (week >= b.from && week <= b.to ? ' on' : week > b.to ? ' done' : '')}
                    style={{ gridColumn: `${b.from} / ${b.to + 1}` }}>{b.label}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mp-week-card" aria-live="polite" data-week-card={week}>
        <h4><span>{week}주차</span>{cur.title}</h4>
        <ul>
          {cur.items.map(([lane, text, id], i) => (
            <li key={i}>
              <span className={'mp-lane-tag l-' + lane}>{LANE_NAME[lane]}</span>
              <span>{text}</span>
              {id && <a href={ART[id].href} className="muted">{ART[id].hrefLabel} →</a>}
            </li>
          ))}
        </ul>
      </div>
      <Note>
        <b>날짜보다 순서와 겹치는 구간을 보세요.</b> 이어달리기처럼 앞사람이 바통을 넘겨야 뒷사람이 뛸 수 있어요.
        기획이 3주차에 화면설계서를 내야 개발이 4주차에 시작해요. <Term k="이벤트 로그" d="사용자가 앱에서 한 행동(버튼 누름, 화면 봄)을 이름 붙여 남긴 기록이에요. 나중에 숫자를 셀 때 써요." /> 이름은 개발을 시작하는 주에 정해요. 늦게 정하면 개발자가 기록 코드를 다시 넣어야 해요.
        실제 기간은 팀과 기능 크기에 따라 달라요. 한 단계가 밀릴 때 뒤가 어떻게 밀리는지는 <a href="#/plan/collab">08 협업 · 소통</a>에서 다뤄요.
      </Note>
    </div>
  )
}

/* =================================================================
 * 4) 우리 프로젝트 산출물 고르기 → 마크다운
 * ================================================================= */
type Scale = 'small' | 'feature' | 'service'
const PRESET: Record<Scale, string[]> = {
  small: ['prd', 'storyboard', 'exception', 'states6', 'tc', 'dqa'],
  feature: ['prd', 'research', 'kpi', 'journey', 'ia', 'spec', 'flowchart', 'userflow', 'lowfi', 'storyboard', 'statediag', 'exception', 'proto', 'states6', 'taxonomy', 'tc', 'ab', 'dqa'],
  service: ARTS.map(a => a.id),
}
const SCALE_HINT: Record<Scale, string> = {
  small: '문구나 버튼 위치를 바꾸는 작은 개선이에요. PRD는 한 쪽으로 줄여요. 바뀌는 화면과 예외만 챙겨요.',
  feature: '‘재주문’처럼 지금 서비스에 기능 하나를 더해요. 구조 설계와 상세 설계에 시간을 가장 많이 써요.',
  service: '새 서비스를 처음부터 만들어요. 페르소나, 디자인 시스템, 권한, 어드민까지 전부 필요해요.',
}
const WEEK_OF: Record<StageId, string> = { discover: '1~2주', structure: '2~3주', detail: '3~4주', system: '4~5주', verify: '5~8주' }

function buildMd(project: string, owner: string, picked: Set<string>) {
  const L: string[] = []
  L.push(`# ${project || '(프로젝트 이름)'} — 산출물 체크리스트`, '')
  L.push(`- 작성: ${owner || '(이름)'}`, `- 작성일: ${new Date().toISOString().slice(0, 10)}`, `- 상태: 초안`, '')
  L.push('> 받는 사람이 없는 산출물은 만들지 않아요. 줄마다 “누가 받아서 무엇을 하나”를 확인하세요.', '')
  for (const s of STAGES) {
    const rows = ARTS.filter(a => a.stage === s.id && picked.has(a.id))
    if (!rows.length) continue
    L.push(`## ${s.name} (${WEEK_OF[s.id]})`, '', '| 완료 | 산출물 | 담당 | 받는 사람과 쓰임 | 위치(링크) |', '| --- | --- | --- | --- | --- |')
    for (const a of rows) L.push(`| [ ] | ${a.name} | ${a.role === 'pm' ? '기획' : '디자인'} | ${a.to} | (링크) |`)
    L.push('')
  }
  const skipped = ARTS.filter(a => !picked.has(a.id))
  if (skipped.length) L.push('## 이번에 만들지 않는 것', '', skipped.map(a => `- ${a.name} — (안 만드는 이유)`).join('\n'), '')
  L.push('## 메모', '', '- 최신 버전은 위 링크 한 곳에만 둬요.', '- 파일 이름에 “최종”을 붙이지 않아요. “최종_진짜최종”이 생기면 어느 게 맞는지 아무도 몰라요.')
  return L.join('\n')
}

function ProjectPicker() {
  const [scale, setScale] = useState<Scale>('feature')
  const [picked, setPicked] = useState<Set<string>>(() => new Set(PRESET.feature))
  const [project, setProject] = useState('오늘반찬 재주문 기능')
  const [owner, setOwner] = useState('Palmer')
  const md = useMemo(() => buildMd(project, owner, picked), [project, owner, picked])
  const pickScale = (s: Scale) => { setScale(s); setPicked(new Set(PRESET[s])) }
  const toggle = (id: string) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <div className="mp-pick">
      <div className="mp-pick-form">
        <div className="mp-fields">
          <label><span>프로젝트</span><input className="mp-input" value={project} onChange={e => setProject(e.target.value)} /></label>
          <label><span>작성자</span><input className="mp-input" value={owner} onChange={e => setOwner(e.target.value)} /></label>
        </div>
        <Seg value={scale} onChange={pickScale} options={[['small', '작은 개선'], ['feature', '신규 기능'], ['service', '신규 서비스']] as const} />
        <p className="muted mp-hint">{SCALE_HINT[scale]} 규모를 고르면 기본 목록이 켜져요. 그다음 하나씩 켜고 끌 수 있어요.</p>
        <div className="mp-pick-list">
          {STAGES.map(s => (
            <fieldset key={s.id}>
              <legend>{s.name}</legend>
              {ARTS.filter(a => a.stage === s.id).map(a => (
                <label key={a.id} className={'mp-pick-item r-' + a.role}>
                  <input type="checkbox" checked={picked.has(a.id)} onChange={() => toggle(a.id)} data-pick={a.id} />
                  <span>{a.name}</span><small>{a.role === 'pm' ? '기획' : '디자인'}</small>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <div className="mp-pick-count"><b>{picked.size}</b> / {ARTS.length}개 산출물</div>
      </div>
      <div className="mp-pick-out">
        <CodeBlock code={md} label="산출물-체크리스트.md" maxHeight={460} />
        <div className="mp-out-actions">
          <button type="button" className="btn sm" data-act="map-download" onClick={() => download('산출물-체크리스트.md', md, 'text/markdown')}>.md 다운로드</button>
          <span className="muted">노션이나 컨플루언스에 붙여 넣으면 표로 바뀌어요.</span>
        </div>
      </div>
    </div>
  )
}

/* =================================================================
 * 5) 좋은 예 vs 나쁜 예
 * ================================================================= */
const PAIRS: { title: string; bad: ReactNode; good: ReactNode; why: ReactNode }[] = [
  {
    title: '산출물을 넘길 때',
    bad: <p className="mp-msg">“기획서 올렸어요~ 확인 부탁드려요!”</p>,
    good: (
      <div className="mp-msg">
        <p>“<b>재주문 화면설계서 v1.1</b> 올렸어요. (링크)</p>
        <ul>
          <li>v1.0에서 바뀐 곳: ORD-02-01 ④ 취소된 주문에는 다시 담기 버튼을 숨겨요 (주황색 표시)</li>
          <li>결정이 필요해요: 품절 메뉴는 빼고 담을지, 담지 않고 안내만 할지 — 목요일까지</li>
          <li>이번 범위 아님: 정기 배송</li>
        </ul>
        <p>디자인 리뷰는 금요일 2시에 같이 봐요.”</p>
      </div>
    ),
    why: '무엇이 바뀌었는지 적어요. 받는 사람이 무엇을 언제까지 해야 하는지도 적어요. 그래야 다시 묻지 않아요.',
  },
  {
    title: '화면부터 그릴 때',
    bad: <p className="mp-msg">요청을 받자마자 피그마에서 주문 내역 화면을 그리고, 다 그린 뒤에 “품절이면요?”라는 질문을 받아요.</p>,
    good: <p className="mp-msg">PRD로 목표(누르는 횟수 6 → 3)와 범위를 먼저 합의해요. 그다음 플로우차트로 품절·영업 종료·취소 주문 같은 갈림길을 찾아요. 화면은 그 뒤에 그려요.</p>,
    why: '갈림길을 모르고 그린 화면은 대부분 다시 그려요. 산출물에 순서가 있는 건 다시 하는 일을 줄이기 위해서예요.',
  },
  {
    title: '디자이너와 일을 나눌 때',
    bad: <p className="mp-msg">기획서에 색과 아이콘까지 넣은 완성 화면을 그려 “이대로 해 주세요”라고 넘겨요.</p>,
    good: <p className="mp-msg">기획서의 와이어프레임은 회색 그대로 둬요. 대신 “무엇이, 언제, 왜 보이는지”를 적어요. 배치와 모양은 디자이너가 정해요. 같이 바꾼 결정은 다시 기획서에 적어요.</p>,
    why: '기획은 동작과 규칙을, 디자인은 모양과 쓰기 편함을 책임져요. 경계가 흐리면 아무도 책임지지 않게 돼요.',
  },
]

function GoodBad() {
  const [mode, setMode] = useState<'bad' | 'good'>('bad')
  return (
    <div className="mp-gb">
      <Seg value={mode} onChange={setMode} options={[['bad', '✕ 나쁜 예'], ['good', '○ 좋은 예']] as const} className="mp-gb-seg" />
      <div className="mp-gb-list">
        {PAIRS.map(p => (
          <div key={p.title} className={'mp-gb-item is-' + mode}>
            <h4>{p.title}</h4>
            {mode === 'bad' ? p.bad : p.good}
            {mode === 'good' && <p className="mp-why">{p.why}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* =================================================================
 * 6) 사수의 체크리스트
 * ================================================================= */
const CHECKS: string[] = [
  '이 산출물은 누가 받아서 무엇을 정하나요? 받는 사람이 없으면 만들지 않아도 돼요.',
  'PRD에 ‘이번에 하지 않을 것’이 적혀 있나요?',
  '화면을 그리기 전에 갈림길(플로우차트)을 먼저 확인했나요?',
  '같은 단계에서 디자이너와 무엇을 주고받는지 일정에 적었나요?',
  '성공 지표와 목표 숫자를 출시 전에 정했나요?',
  '어떤 행동을 기록할지(이벤트 로그) 개발 시작 전에 정했나요?',
  '산출물마다 최신본이 한 곳(링크 하나)에만 있나요?',
  '작은 개선인데 산출물을 전부 만들고 있진 않나요?',
]

function Checklist() {
  const [on, setOn] = useState<boolean[]>(() => CHECKS.map(() => false))
  const n = on.filter(Boolean).length
  return (
    <>
      <ul className="mp-checklist">
        {CHECKS.map((t, i) => (
          <li key={i}><label><input type="checkbox" checked={on[i]} onChange={e => setOn(o => o.map((v, j) => (j === i ? e.target.checked : v)))} /><span>{t}</span></label></li>
        ))}
      </ul>
      <div className="mp-progress" aria-live="polite"><div style={{ width: (n / CHECKS.length) * 100 + '%' }} /><span>{n} / {CHECKS.length}</span></div>
    </>
  )
}

/* ================================================================= */
export default function MapTab() {
  return (
    <div data-plan="map">
      <TermList keys={['산출물', 'PRD', 'KPI', 'IA', '유저 플로우', '플로우차트', '와이어프레임', '화면설계서', '행복 경로', '이벤트 택소노미', '권한 매트릭스', 'TC', '퍼널', '스프린트']}
        extra={{
          '산출물': '일하면서 다음 사람에게 넘기는 문서나 그림이에요. 이어달리기의 바통처럼, 받은 사람이 바로 이어서 일할 수 있게 해요.',
          '행복 경로': '사용자가 아무 문제 없이 목표까지 가는 가장 순탄한 길이에요. 로그인돼 있고, 품절도 없고, 결제도 한 번에 되는 경우예요.',
        }} />
      <SysGrid>
        <Section id="plan-map-intro" wide title="산출물은 ‘다음 사람이 결정할 수 있게’ 남기는 기록이에요"
          gist="문서는 받을 사람이 있어야 의미가 있어요. 누가 받아서 무엇을 정할지부터 생각해요."
          desc="주니어가 가장 많이 하는 실수는 두 가지예요. 하나는 요청을 받자마자 화면부터 그리는 것이에요. 다른 하나는 ‘기획서’ 한 파일에 모든 걸 몰아넣는 것이에요.">
          <div className="mp-intro">
            <p>
              <Term k="산출물" d="일하면서 다음 사람에게 넘기는 문서나 그림이에요. 이어달리기의 바통처럼, 받은 사람이 바로 이어서 일할 수 있게 해요." />은 이어달리기의 바통과 같아요. 내가 들고 뛰다가 다음 사람에게 넘기면, 그 사람이 멈추지 않고 바로 이어서 뛰어요.
            </p>
            <p>
              기획과 디자인은 같은 다섯 단계를 함께 지나요. 단계마다 기획자는 <b>무엇을, 왜, 어떤 규칙으로</b> 만들지 적어요. 디자이너는 <b>어떻게 보이고 어떻게 느껴질지</b> 그려요.
              이 지도를 보면 내가 지금 만드는 문서가 몇 단계 것인지 알 수 있어요. 같은 때 옆자리 디자이너가 무엇을 만드는지도 보여요.
            </p>
            <ol className="mp-flow-mini" aria-label="다섯 단계">
              {STAGES.map((s, i) => <li key={s.id}><span>{i + 1}</span>{s.name}</li>)}
            </ol>
          </div>
        </Section>

        <Section id="plan-map-table" wide title="단계별 산출물 지도"
          gist="같은 단계에서 기획자와 디자이너가 만드는 문서는 서로 짝이에요."
          desc={<>왼쪽 열은 기획자, 오른쪽 열은 디자이너의 <Term k="산출물" d="일하면서 다음 사람에게 넘기는 문서나 그림이에요." />이에요. 같은 줄에 있는 것끼리 서로 주고받아요. 예를 들어 오늘반찬에서 기획자의 <Term k="플로우차트" />와 디자이너의 <Term k="유저 플로우" />는 같은 주에 만들어 서로 맞춰 봐요.</>}>
          <DeliverableMap />
        </Section>

        <Section id="plan-map-timeline" wide title="8주 일정 예시: 오늘반찬 ‘재주문’ 기능"
          gist="날짜보다 순서가 중요해요. 앞 단계가 밀리면 뒤 단계가 다 밀려요."
          desc="주차 버튼을 누르거나 ▶ 재생을 눌러 보세요. 그 주에 누가 무엇을 내놓는지 보여요.">
          <Timeline />
        </Section>

        <Section id="plan-map-roles" wide title="PM · PO · 서비스 기획자는 뭐가 달라요?"
          gist="PM은 만들 가치, PO는 만드는 순서, 서비스 기획자는 동작 규칙을 책임져요."
          desc="채용 공고에서 섞어 쓰는 이름이에요. 차이는 ‘무엇을 책임지느냐’예요. 예를 들어 오늘반찬에서 “재주문 기능을 만들까?”는 PM이, “이번 2주에 무엇부터?”는 PO가, “취소된 주문엔 버튼을 숨길까?”는 서비스 기획자가 정해요.">
          <RoleCompare />
        </Section>

        <Section id="plan-map-pick" wide title="우리 프로젝트에 필요한 산출물 고르기 (체크리스트 양식)"
          gist="프로젝트 크기에 맞는 산출물만 골라요. 작은 개선에 문서를 다 만들 필요는 없어요."
          desc={<>프로젝트 첫 회의(<Term k="킥오프" />)에서 이 목록부터 정해요. 규모를 고르면 필요한 산출물이 켜져요. 결과는 .md 파일(마크다운)로 바로 내려받을 수 있어요.</>}>
          <ProjectPicker />
        </Section>

        <Section id="plan-map-gb" title="좋은 예 vs 나쁜 예"
          gist="넘길 때는 바뀐 점, 상대가 할 일, 기한을 같이 적어요."
          desc="같은 산출물도 어떻게 넘기느냐에 따라 다시 묻는 횟수가 달라져요.">
          <GoodBad />
        </Section>

        <Section id="plan-map-check" title="사수의 체크리스트"
          gist="받을 사람이 없는 문서는 만들지 않고, 최신본은 한 곳에만 둬요."
          desc="프로젝트 첫 회의나 중간 리뷰 때 제가 실제로 묻는 질문이에요.">
          <Checklist />
        </Section>

        <Section id="plan-map-ref" wide title="참고" gist="역할 나누기와 스크럼을 더 깊이 알고 싶을 때 볼 자료예요.">
          <ul className="mp-ref">
            <li>Marty Cagan, 『인스파이어드(Inspired)』, SVPG — 제품팀의 역할(PM·디자이너·개발 리드), 그리고 만들기 전에 만들 가치를 확인하는 법(프로덕트 디스커버리)</li>
            <li>Ken Schwaber · Jeff Sutherland, 『스크럼 가이드(The Scrum Guide)』 — 프로덕트 오너(PO)가 맡는 일과 백로그(할 일 목록)</li>
            <li>Atlassian Agile Coach — 에픽(큰 기능 묶음) · 유저 스토리 · 인수 조건</li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
