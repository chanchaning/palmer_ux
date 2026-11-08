import { useMemo, useState, type ReactNode } from 'react'
import { Seg, useTimers } from '../../components/ui'
import { download } from '../../system/export'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
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
    what: '풀 문제, 목표, 성공 지표, 범위(하는 것·안 하는 것)를 한 문서에 모아요. 뒤에 나오는 모든 산출물의 출발점이에요.',
    ex: '“재주문하려면 평균 6번 탭해야 해서 중간에 나간다 → 3번 이하로 줄인다.” 이번 범위는 ‘최근 주문에서 다시 담기’까지, 정기 배송은 제외.',
    to: '디자이너·개발자·QA가 “이걸 왜 하지?”, “이것도 해야 해?”가 궁금할 때 펼쳐 봐요.',
    href: '#/plan/prd', hrefLabel: '01 문제 정의 · PRD' },
  { id: 'research', name: '유저 리서치', role: 'pm', stage: 'discover',
    what: '인터뷰·설문·로그로 사용자가 실제로 겪는 문제인지 확인해요. 디자이너와 같이 하는 경우가 많아요.',
    ex: '단골 구매자 인터뷰에서 “지난주에 시킨 거 또 시키고 싶은데 찾기 귀찮다”는 말이 반복돼요. 로그에서는 주문 내역 화면을 연 뒤 메뉴 검색으로 다시 가는 흐름이 보여요.',
    to: '디자이너의 페르소나·여정 지도와 PRD의 ‘배경’ 칸의 재료가 돼요.',
    href: '#/plan/prd', hrefLabel: '01 문제 정의 · PRD' },
  { id: 'kpi', name: 'KPI · 성공 지표', role: 'pm', stage: 'discover',
    what: '성공을 판단할 숫자와 기준을 출시 전에 정해요. 출시 뒤에 정하면 결과에 맞는 지표만 고르게 돼요.',
    ex: '핵심: 재주문 비율. 보조: 재주문까지 탭 수. 가드레일(나빠지면 안 되는 것): 주문 취소율.',
    to: '데이터 담당이 이벤트 로그를 설계하고, 출시 후 리뷰에서 이 숫자로 판단해요.',
    href: '#/plan/metrics', hrefLabel: '06 지표 · 데이터' },
  { id: 'persona', name: '페르소나', role: 'ux', stage: 'discover',
    what: '리서치에서 나온 대표 사용자를 한 사람처럼 정리해요. 회의에서 “이 사람이라면?”을 묻는 도구예요.',
    ex: '‘퇴근길 맞벌이 지은’: 평일 저녁 7시에 지하철에서 주문, 지난주 반찬을 그대로 다시 시키고 싶어 해요.',
    to: 'PRD의 ‘대상 사용자’ 칸과 같은 사람을 가리키는지 기획자와 맞춰요.',
    href: '#/plan/prd', hrefLabel: '01 PRD의 대상 사용자' },
  { id: 'journey', name: '고객 여정 지도', role: 'ux', stage: 'discover',
    what: '인지 → 탐색 → 주문 → 수령 → 재주문까지 단계마다 행동·생각·감정·불편을 한 줄로 그려요.',
    ex: '재주문 단계에서 감정 곡선이 가장 낮아요. “지난번 그 메뉴 이름이 뭐였지?”',
    to: '가장 낮은 지점이 PRD의 문제 정의 후보가 돼요.',
    href: '#/bias/bias-peak', hrefLabel: '피크엔드 법칙 카드' },

  /* 구조 설계 */
  { id: 'ia', name: 'IA (정보 구조도)', role: 'pm', stage: 'structure',
    what: '서비스의 메뉴와 화면을 트리로 정리하고 화면마다 ID를 붙여요. 화면설계서·이벤트 로그가 이 ID를 함께 써요.',
    ex: '마이 > 주문 내역 ORD-02-01 > 주문 상세 ORD-02-02',
    to: '디자이너는 내비게이션을, 개발자는 라우팅을, QA는 TC 범위를 정할 때 봐요.',
    href: '#/plan/flow', hrefLabel: '02 구조 · 동선' },
  { id: 'spec', name: '기능 명세서', role: 'pm', stage: 'structure',
    what: '만들 기능을 쪼개 목록으로 만들고 기능마다 ID·설명·대상 역할·우선순위를 적어요.',
    ex: 'F-ORD-03 다시 담기 · 구매자 · Must / F-ORD-04 품절 대체 안내 · 구매자 · Should',
    to: '개발 리드가 공수를 산정하고 스프린트를 나눌 때 기준이 돼요.',
    href: '#/plan/priority', hrefLabel: '05 우선순위' },
  { id: 'flowchart', name: '조건 분기 플로우차트', role: 'pm', stage: 'structure',
    what: '“만약 ~라면”을 마름모로 그려 갈림길을 모두 드러내요. 화면을 그리기 전에 빠진 경우를 찾는 도구예요.',
    ex: '다시 담기 → 품절 메뉴가 있나? → 예: 대체 안내 팝업 / 아니요: 장바구니로 이동',
    to: '디자이너는 필요한 화면·팝업 수를, 개발자는 분기 로직을 확인해요.',
    href: '#/plan/flow', hrefLabel: '02 구조 · 동선' },
  { id: 'userflow', name: '유저 플로우', role: 'ux', stage: 'structure',
    what: '사용자가 목표까지 지나가는 화면 순서를 행복 경로 중심으로 그려요.',
    ex: '홈 → 마이 → 주문 내역 → 다시 담기 → 장바구니 → 결제 완료',
    to: '기획자의 플로우차트와 겹쳐 보면 화면에 없는 분기가 보여요.',
    href: '#/plan/flow', hrefLabel: '02 구조 · 동선' },
  { id: 'lowfi', name: '로우 와이어프레임', role: 'ux', stage: 'structure',
    what: '색 없이 회색 상자로 배치와 위계만 잡아요. 빨리 그리고 빨리 버리는 게 목적이에요.',
    ex: '주문 카드 안 ‘다시 담기’ 위치 2안: 오른쪽 위 작은 버튼 vs 카드 아래 꽉 찬 버튼',
    to: '기획자가 화면설계서의 바탕 그림으로 가져가요.',
    href: '#/system/structure', hrefLabel: '디자인 시스템 · 구조' },

  /* 상세 설계 */
  { id: 'storyboard', name: '화면설계서', role: 'pm', stage: 'detail',
    what: '와이어프레임에 번호를 달고, 번호마다 기본 상태·조건·예외·문구·연결 화면을 적은 장표예요.',
    ex: 'ORD-02-01 ④ 다시 담기: 취소된 주문에는 보이지 않음. 누르면 장바구니(CART-01)로 이동.',
    to: '개발자가 구현 기준으로, QA가 TC 기준으로 써요.',
    href: '#/plan/storyboard', hrefLabel: '03 화면설계서' },
  { id: 'statediag', name: '상태 다이어그램', role: 'pm', stage: 'detail',
    what: '주문처럼 상태가 바뀌는 대상의 상태와 전이 조건, 행위자를 그려요.',
    ex: '결제완료 → 배송준비중 이후에는 ‘주문 취소’ 대신 ‘반품 신청’만 보여요.',
    to: '개발자는 상태 값을, 디자이너는 상태별 버튼 노출을 확인해요.',
    href: '#/plan/policy', hrefLabel: '04 정책 · 예외' },
  { id: 'exception', name: '예외 정책', role: 'pm', stage: 'detail',
    what: '네트워크 끊김, 중복 클릭, 0건, 권한 없음처럼 행복 경로 밖의 일을 정해요.',
    ex: '다시 담기 중 가게가 영업을 마치면 “지금은 주문할 수 없는 가게예요” 안내 후 담지 않음.',
    to: '디자이너는 빈 화면·오류 화면을 그리고, QA는 예외 TC를 써요.',
    href: '#/plan/policy', hrefLabel: '04 정책 · 예외' },
  { id: 'proto', name: '하이파이 프로토타입', role: 'ux', stage: 'detail',
    what: '실제 색·글꼴·컴포넌트로 만들고 화면끼리 연결해 직접 눌러 볼 수 있게 해요.',
    ex: '다시 담기 → 장바구니 바텀시트가 올라오는 전환까지 연결',
    to: '이해관계자 리뷰와 사용성 테스트에 그대로 써요.',
    href: '#/transition', hrefLabel: '화면 전환 가이드' },
  { id: 'interaction', name: '인터랙션', role: 'ux', stage: 'detail',
    what: '누르고, 밀고, 전환될 때의 움직임과 시간을 정해요.',
    ex: '담기가 끝나면 장바구니 아이콘의 숫자 배지가 살짝 커졌다 돌아와요.',
    to: '개발자에게 시간(ms)과 이징 값으로 넘겨요.',
    href: '#/easing', hrefLabel: '이징 가이드' },
  { id: 'states6', name: '6대 상태 디자인', role: 'ux', stage: 'detail',
    what: '버튼·입력창의 기본·호버·누름·포커스·비활성·로딩 상태를 빠짐없이 그려요.',
    ex: '다시 담기 버튼은 로딩 중에 폭을 유지하고 스피너를 보여요. 두 번 눌러도 한 번만 처리돼요.',
    to: '기획자의 예외 정책(중복 클릭)과 짝이 맞는지 확인해요.',
    href: '#/system/state', hrefLabel: '디자인 시스템 · 상태' },

  /* 시스템화 */
  { id: 'taxonomy', name: '이벤트 택소노미', role: 'pm', stage: 'system',
    what: '어떤 행동을 어떤 이름과 속성으로 기록할지 정한 사전이에요. 이름 규칙을 하나로 통일해요.',
    ex: 'reorder_button_click · 속성 order_id, item_count · 화면 ORD-02-01',
    to: '개발자가 로그를 심고, 데이터 담당이 대시보드를 만들어요.',
    href: '#/plan/metrics', hrefLabel: '06 지표 · 데이터' },
  { id: 'rbac', name: '권한 매트릭스', role: 'pm', stage: 'system',
    what: '역할 × 기능 표로 누가 무엇을 보고·만들고·고치고·지울 수 있는지 정해요.',
    ex: '사장님: 자기 가게 주문만 조회 가능, 리뷰는 답글만 가능하고 삭제는 불가',
    to: '개발자는 권한 체크를, 디자이너는 역할별 메뉴 노출을 맞춰요.',
    href: '#/plan/policy', hrefLabel: '04 정책 · 예외' },
  { id: 'adminpolicy', name: '어드민 정책', role: 'pm', stage: 'system',
    what: '운영자가 쓰는 백오피스의 검색·일괄 처리·다운로드·변경 이력 규칙이에요.',
    ex: '주문 목록 엑셀 다운로드 시 사유 입력 필수, 전화번호는 가운데 4자리 마스킹',
    to: '운영팀·CS팀이 실제로 쓰고, 보안 검토의 대상이 돼요.',
    href: '#/plan/admin', hrefLabel: '07 백오피스 · 연동' },
  { id: 'ds', name: '디자인 시스템', role: 'ux', stage: 'system',
    what: '색·글자·간격·컴포넌트를 토큰과 규칙으로 모아 모든 화면이 같은 모습으로 말하게 해요.',
    ex: '‘주문 카드’ 컴포넌트 하나를 주문 내역과 홈의 ‘최근 주문’에 함께 써요.',
    to: '개발자는 같은 이름의 토큰·컴포넌트로 구현해요.',
    href: '#/system/type', hrefLabel: '디자인 시스템' },

  /* 검증 · 개선 */
  { id: 'tc', name: 'QA 테스트 시나리오', role: 'pm', stage: 'verify',
    what: '인수 조건(AC)을 ‘전제 조건 – 절차 – 기대 결과’로 바꿔 누가 해도 같은 방법으로 확인하게 해요.',
    ex: 'TC-ORD-07 · 전제: 취소된 주문 1건 · 절차: 주문 내역 진입 · 기대: 그 카드에 다시 담기 버튼이 없음',
    to: 'QA가 실행하고, 결과가 출시 판단의 근거가 돼요.',
    href: '#/plan/qa', hrefLabel: '09 QA · 출시' },
  { id: 'ab', name: 'A/B 가설', role: 'pm', stage: 'verify',
    what: '“무엇을 바꾸면 어떤 지표가 왜 움직일지”를 실험 전에 적어요.',
    ex: '다시 담기 버튼을 카드 아래 꽉 찬 버튼으로 바꾸면 재주문 비율이 오를 것이다. 왜냐하면 인터뷰에서 버튼을 못 찾았다는 말이 나왔기 때문이다.',
    to: '데이터 담당과 실험 기간·표본·가드레일을 정해요.',
    href: '#/plan/metrics', hrefLabel: '06 지표 · 데이터' },
  { id: 'funnel', name: '퍼널 분석', role: 'pm', stage: 'verify',
    what: '단계별 전환과 이탈을 보고 가장 크게 새는 곳부터 고쳐요.',
    ex: '주문 내역 진입 → 다시 담기 → 장바구니 → 결제 완료 중 어디서 가장 많이 나가는지 봐요.',
    to: '다음 개선의 PRD ‘배경’ 칸으로 돌아가요. 기획은 이렇게 순환해요.',
    href: '#/plan/metrics', hrefLabel: '06 지표 · 데이터' },
  { id: 'usability', name: '사용성 테스트', role: 'ux', stage: 'verify',
    what: '실제 사용자에게 과제를 주고 지켜보며 막히는 곳을 찾아요. 말보다 행동을 봐요.',
    ex: '과제: “지난주에 시킨 반찬을 다시 주문해 보세요.” 몇 번 만에, 어디서 멈추는지 기록',
    to: '기획자는 정책·문구를, 디자이너는 화면을 고쳐요.',
    href: '#/laws', hrefLabel: 'UX 법칙 가이드' },
  { id: 'dqa', name: '디자인 QA', role: 'ux', stage: 'verify',
    what: '개발된 화면이 디자인과 같은지 간격·색·상태·문구를 실제 기기에서 확인해요.',
    ex: '로딩·비활성 상태가 빠지지 않았는지, 긴 가게 이름이 말줄임 되는지 개발 빌드에서 눌러 봐요.',
    to: '개발자에게 화면 ID·번호와 함께 수정 요청을 넘겨요.',
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
  { k: '핵심 질문', pm: '무엇을 만들어야 가치가 있고, 사업이 되나?', po: '이번 스프린트에 무엇을 먼저 만드나?', sp: '이 기능이 화면과 정책으로 정확히 어떻게 동작하나?' },
  { k: '주로 만드는 것', pm: '문제 정의, PRD, 목표·지표, 로드맵', po: '백로그, 유저 스토리, 인수 조건(AC)', sp: 'PRD, IA, 플로우차트, 화면설계서, 정책서' },
  { k: '자주 마주하는 사람', pm: '경영진, 디자이너, 개발 리드, 고객', po: '개발팀, QA (매일)', sp: '디자이너, 개발자, QA, 운영·CS' },
  { k: '잘했다는 기준', pm: '출시 후 지표가 목표만큼 움직였다', po: '팀이 막힘 없이 가치 순서대로 만들었다', sp: '개발·QA가 추측 없이 만들고 예외에서 사고가 안 났다' },
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
        <b>현실은 이름보다 회사마다 달라요.</b> 『인스파이어드』는 PM이 가치(사려는가)와 사업성(회사에 맞는가)을, 디자이너가 사용성을, 개발 리드가 실현 가능성을 맡는다고 말해요.
        PO는 스크럼에서 백로그의 순서를 책임지는 역할이라, PM이 PO를 겸하는 팀도 많아요. 국내에서 ‘서비스 기획자’라고 부르는 자리는 PRD와 화면설계서, 정책서를 한 사람이 함께 쓰는 경우가 많아요.
        그래서 이 노트는 문제 정의부터 QA까지 전부 다뤄요.
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
  { lane: 'dev', from: 7, to: 7, label: '결함 수정' },
  { lane: 'qa', from: 4, to: 4, label: '이벤트 설계' },
  { lane: 'qa', from: 6, to: 7, label: '테스트' },
  { lane: 'qa', from: 8, to: 8, label: '모니터링' },
]
const WEEKS: { w: number; title: string; items: [Lane, string, string?][] }[] = [
  { w: 1, title: '문제를 확인해요', items: [['pm', 'PRD 초안 (문제·목표·범위)', 'prd'], ['pm', '성공 지표 정의 — 재주문 비율, 탭 수', 'kpi'], ['ux', '구매자 인터뷰 · 고객 여정 지도', 'journey']] },
  { w: 2, title: '구조를 정해요', items: [['pm', 'PRD 리뷰 후 확정 (범위 동결)', 'prd'], ['pm', 'IA에 ORD-02-01 추가 · 기능 명세 · 분기 플로우차트', 'flowchart'], ['ux', '유저 플로우 · 로우 와이어 2안', 'lowfi']] },
  { w: 3, title: '자세히 그려요', items: [['pm', '화면설계서 v1.0 · 예외 정책', 'storyboard'], ['ux', '하이파이 시안', 'proto'], ['dev', '기술 검토 · 공수 산정 (API에 조회 기간 파라미터 필요?)']] },
  { w: 4, title: '만들기 시작해요', items: [['pm', '화면설계서 v1.1 (리뷰 반영, 변경 이력 기록)', 'storyboard'], ['ux', '프로토타입 · 6대 상태', 'states6'], ['dev', '구현 착수'], ['qa', '이벤트 택소노미 확정 (reorder_button_click)', 'taxonomy']] },
  { w: 5, title: '검증을 준비해요', items: [['pm', 'QA 테스트 시나리오 작성 (AC → TC)', 'tc'], ['pm', '어드민 · CS 안내 문구', 'adminpolicy'], ['dev', '구현 계속']] },
  { w: 6, title: '맞는지 확인해요', items: [['ux', '디자인 QA 시작', 'dqa'], ['dev', '구현 완료 → QA 빌드 전달'], ['qa', 'TC 실행 · 결함 등록', 'tc']] },
  { w: 7, title: '다듬어요', items: [['dev', 'Blocker · Critical 결함 수정'], ['qa', '회귀 테스트'], ['ux', '디자인 QA 마무리', 'dqa'], ['pm', '출시 체크리스트 · 롤백 계획']] },
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
        <b>보아야 할 것은 날짜가 아니라 순서와 겹침이에요.</b> 기획이 3주차에 화면설계서를 내야 개발이 4주차에 시작할 수 있고, 이벤트 로그는 개발 착수와 같은 주에 확정해야 다시 심는 일이 없어요.
        실제 기간은 팀과 기능 크기에 따라 달라요. 하나가 밀리면 뒤가 어떻게 밀리는지는 <a href="#/plan/collab">08 협업 · 소통</a>에서 다뤄요.
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
  small: '문구·버튼 위치처럼 작은 개선이에요. PRD는 한 쪽짜리로 줄이고, 바뀌는 장표와 예외만 챙겨요.',
  feature: '‘재주문’처럼 기존 서비스에 기능 하나를 더해요. 구조와 상세 설계가 대부분을 차지해요.',
  service: '새 서비스를 처음부터 만들어요. 페르소나, 디자인 시스템, 권한, 어드민까지 전부 필요해요.',
}
const WEEK_OF: Record<StageId, string> = { discover: '1~2주', structure: '2~3주', detail: '3~4주', system: '4~5주', verify: '5~8주' }

function buildMd(project: string, owner: string, picked: Set<string>) {
  const L: string[] = []
  L.push(`# ${project || '(프로젝트 이름)'} — 산출물 체크리스트`, '')
  L.push(`- 작성: ${owner || '(이름)'}`, `- 작성일: ${new Date().toISOString().slice(0, 10)}`, `- 상태: 초안`, '')
  L.push('> 받는 사람이 없는 산출물은 만들지 않아요. 행마다 “누가 받아서 무엇을 하나”를 확인하세요.', '')
  for (const s of STAGES) {
    const rows = ARTS.filter(a => a.stage === s.id && picked.has(a.id))
    if (!rows.length) continue
    L.push(`## ${s.name} (${WEEK_OF[s.id]})`, '', '| 완료 | 산출물 | 담당 | 받는 사람과 쓰임 | 위치(링크) |', '| --- | --- | --- | --- | --- |')
    for (const a of rows) L.push(`| [ ] | ${a.name} | ${a.role === 'pm' ? '기획' : '디자인'} | ${a.to} | (링크) |`)
    L.push('')
  }
  const skipped = ARTS.filter(a => !picked.has(a.id))
  if (skipped.length) L.push('## 이번에 만들지 않는 것', '', skipped.map(a => `- ${a.name} — (안 만드는 이유)`).join('\n'), '')
  L.push('## 메모', '', '- 최신 버전은 위 링크 한 곳에만 둬요. 파일 이름에 “최종”을 붙이지 않아요.')
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
        <p className="muted mp-hint">{SCALE_HINT[scale]} 프리셋을 고른 뒤 하나씩 켜고 끌 수 있어요.</p>
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
          <span className="muted">노션·컨플루언스에 붙여 넣으면 표로 바뀌어요.</span>
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
          <li>v1.0에서 바뀐 곳: ORD-02-01 ④ 취소 주문에는 다시 담기 비노출 (주황색 표시)</li>
          <li>결정이 필요해요: 품절 메뉴는 빼고 담을지, 담지 않고 안내만 할지 — 목요일까지</li>
          <li>이번 범위 아님: 정기 배송</li>
        </ul>
        <p>디자인 리뷰는 금요일 2시에 같이 봐요.”</p>
      </div>
    ),
    why: '무엇이 바뀌었는지, 받는 사람이 무엇을 언제까지 해야 하는지가 적혀 있어야 다시 묻지 않아요.',
  },
  {
    title: '화면부터 그릴 때',
    bad: <p className="mp-msg">요청을 받자마자 피그마에서 주문 내역 화면을 그리고, 다 그린 뒤에 “품절이면요?”라는 질문을 받아요.</p>,
    good: <p className="mp-msg">PRD로 목표(탭 수 6 → 3)와 범위를 먼저 합의하고, 플로우차트로 품절·영업 종료·취소 주문 분기를 찾은 뒤 화면을 그려요.</p>,
    why: '갈림길을 모르고 그린 화면은 대부분 다시 그려요. 산출물의 순서는 다시 하는 일을 줄이려고 있어요.',
  },
  {
    title: '디자이너와 일을 나눌 때',
    bad: <p className="mp-msg">기획서에 색과 아이콘까지 넣은 완성 화면을 그려 “이대로 해 주세요”라고 넘겨요.</p>,
    good: <p className="mp-msg">기획서 와이어는 회색으로 두고 “무엇이·언제·왜 보이는지”를 적어요. 배치와 시각 표현은 디자이너가 정하고, 바뀐 결정은 다시 기획서에 반영해요.</p>,
    why: '기획은 동작과 정책을, 디자인은 표현과 사용성을 책임져요. 경계가 흐리면 둘 다 책임지지 않게 돼요.',
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
  '이 산출물은 누가 받아서 무엇을 결정하나요? 받는 사람이 없으면 만들지 않아도 돼요.',
  'PRD에 ‘이번에 하지 않을 것’이 적혀 있나요?',
  '화면을 그리기 전에 조건 분기(플로우차트)를 먼저 확인했나요?',
  '같은 단계에서 디자이너와 무엇을 주고받는지 일정에 적었나요?',
  '성공 지표와 기준 숫자를 출시 전에 정했나요?',
  '이벤트 로그 정의가 개발 착수 전에 나왔나요?',
  '산출물마다 최신본이 한 곳(링크 하나)에만 있나요?',
  '작은 개선인데 모든 산출물을 다 만들고 있진 않나요?',
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
      <SysGrid>
        <Section id="plan-map-intro" wide title="한 줄 요약: 산출물은 ‘다음 사람이 결정할 수 있게’ 만드는 기록이에요"
          desc="주니어 때 가장 많이 하는 실수는 두 가지예요. 요청을 받자마자 화면부터 그리는 것, 그리고 ‘기획서’라는 이름으로 모든 걸 한 파일에 몰아넣는 것이에요.">
          <div className="mp-intro">
            <p>
              기획과 디자인은 같은 다섯 단계를 함께 지나요. 단계마다 기획자는 <b>무엇을·왜·어떤 규칙으로</b>를, 디자이너는 <b>어떻게 보이고·어떻게 느껴지는지</b>를 문서로 남겨요.
              이 지도를 보면 지금 내가 만드는 문서가 어느 단계의 것인지, 옆자리 디자이너는 같은 시기에 무엇을 만들고 있는지 알 수 있어요.
            </p>
            <ol className="mp-flow-mini" aria-label="다섯 단계">
              {STAGES.map((s, i) => <li key={s.id}><span>{i + 1}</span>{s.name}</li>)}
            </ol>
          </div>
        </Section>

        <Section id="plan-map-table" wide title="단계별 산출물 지도" desc="왼쪽은 기획자, 오른쪽은 디자이너의 산출물이에요. 같은 줄에 있는 것끼리 서로 주고받아요.">
          <DeliverableMap />
        </Section>

        <Section id="plan-map-timeline" wide title="프로젝트 타임라인: 오늘반찬 ‘재주문’ 8주" desc="주차를 누르거나 재생해 보세요. 그 주에 누가 무엇을 내놓는지 보여요.">
          <Timeline />
        </Section>

        <Section id="plan-map-roles" wide title="PM · PO · 서비스 기획자는 뭐가 달라요?" desc="채용 공고에서 섞여 쓰이는 이름이에요. 차이는 ‘무엇을 책임지느냐’에 있어요.">
          <RoleCompare />
        </Section>

        <Section id="plan-map-pick" wide title="표준 템플릿: 우리 프로젝트 산출물 체크리스트" desc="킥오프 날 이 목록부터 정해요. 규모를 고르면 필요한 산출물이 켜지고, 마크다운으로 바로 내보낼 수 있어요.">
          <ProjectPicker />
        </Section>

        <Section id="plan-map-gb" title="좋은 예 vs 나쁜 예" desc="같은 산출물도 넘기는 방식에 따라 다시 묻는 횟수가 달라져요.">
          <GoodBad />
        </Section>

        <Section id="plan-map-check" title="사수의 체크리스트" desc="킥오프나 중간 리뷰 때 제가 실제로 묻는 질문이에요.">
          <Checklist />
        </Section>

        <Section id="plan-map-ref" wide title="참고">
          <ul className="mp-ref">
            <li>Marty Cagan, 『인스파이어드(Inspired)』, SVPG — 제품팀의 역할(PM·디자이너·개발 리드)과 프로덕트 디스커버리</li>
            <li>Ken Schwaber · Jeff Sutherland, 『스크럼 가이드(The Scrum Guide)』 — 프로덕트 오너의 책임과 백로그</li>
            <li>Atlassian Agile Coach — 에픽 · 유저 스토리 · 인수 조건</li>
          </ul>
        </Section>
      </SysGrid>
    </div>
  )
}
