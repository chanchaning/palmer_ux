import { Note, Section, SysGrid } from '../ui'

/** 역할 · Material 3 · Apple HIG · 비교 카드 */
const ROWS: [string, string, string, string][] = [
  ['화면 최상단 바', 'Top App Bar', 'Navigation Bar', 'platforms-topbar'],
  ['화면 최하단 메뉴 바', 'Navigation Bar (구 Bottom Navigation)', 'Tab Bar', 'platforms-bottombar'],
  ['화면 내 가로 탭 전환', 'Tabs / Segmented Button', 'Segmented Control', 'platforms-tabs'],
  ['중앙 팝업 알림창', 'Dialog', 'Alert', 'platforms-dialog'],
  ['하단에서 올라오는 선택창', 'Bottom Sheet', 'Action Sheet / Sheet', 'platforms-sheet'],
  ['잠깐 뜨고 사라지는 알림', 'Snackbar / Toast(안드로이드 OS)', '공식 명칭 없음 (배너·커스텀 뷰)', 'platforms-snack'],
  ['온/오프 스위치', 'Switch', 'Toggle', 'platforms-switch'],
  ['단일 항목 선택', 'Radio Button', '별도 구분 없음 (목록 체크마크)', 'platforms-radio'],
  ['다중 항목 선택', 'Checkbox', 'Toggle(체크박스 스타일) / 다중 선택 목록', 'platforms-check'],
  ['로딩 중 회전 표시', 'Circular Progress Indicator', 'Activity Indicator', 'platforms-spin'],
  ['진행률 막대', 'Linear Progress Indicator', 'Progress View', 'platforms-linear'],
  ['누르면 펼쳐지는 메뉴', 'Menus / Exposed Dropdown Menu', 'Pull-Down Button / Pop-Up Button', 'platforms-menu'],
  ['날짜·시간 선택', 'Date Picker / Time Picker', 'Pickers (휠 · 캘린더)', 'platforms-picker'],
  ['텍스트 입력창', 'Text Fields', 'Text Fields(한 줄) / Text Views(여러 줄)', 'platforms-field'],
]
const M3_ONLY: [string, string][] = [
  ['FAB', '오른쪽 아래 떠 있는 핵심 액션 버튼 (Small · Large · Extended)'],
  ['Navigation Drawer', '왼쪽에서 서랍처럼 나오는 전체 메뉴'],
  ['Navigation Rail', '태블릿·데스크톱 왼쪽의 얇은 세로 메뉴'],
  ['Chips (4종)', 'Assist · Filter · Input · Suggestion'],
  ['Badges', '작은 점(Small) 또는 숫자 캡슐(Large)'],
  ['Divider', '목록·영역을 나누는 얇은 선'],
]
const HIG_ONLY: [string, string][] = [
  ['Toolbar', '맨 아래, 현재 화면의 액션(공유·삭제·글쓰기)'],
  ['Context Menu', '길게 누르면 배경이 흐려지며 미리보기와 함께 뜨는 메뉴'],
  ['Edit Menu', '글자 선택 시 위에 뜨는 복사·붙여넣기 캡슐'],
  ['Popover', '버튼을 가리키는 꼬리가 달린 임시 창 (iPad·Mac)'],
  ['Page Control', '캐러셀 아래 • • • 점'],
  ['Stepper', '[− | +] 1씩 늘리고 줄이는 버튼'],
  ['Color Well', '누르면 팔레트가 열리는 동그란 색 버튼'],
  ['Live Activities', '잠금 화면·다이내믹 아일랜드의 실시간 현황'],
]

export default function Components() {
  return (
    <SysGrid>
      <Section id="sys-dict" wide title="같은 역할, 다른 이름" desc="역할을 누르면 두 플랫폼의 실제 동작을 나란히 비교하는 카드로 이동해요.">
        <div className="sys-table-wrap">
          <table className="sys-table">
            <thead><tr><th>역할</th><th>Material 3 (Android)</th><th>Apple HIG (iOS)</th></tr></thead>
            <tbody>
              {ROWS.map(([role, m, h, id]) => (
                <tr key={id}><td><a href={`#/platforms/${id}`}>{role} →</a></td><td className="m">{m}</td><td className="h">{h}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note><b>헷갈리기 쉬운 이름:</b> “Navigation Bar”는 머티리얼에선 <b>화면 아래</b> 메뉴, HIG에선 <b>화면 위</b> 제목 바예요. 기획서·디자인 파일에 쓸 때는 “하단 탭 바”처럼 역할로 적으면 오해가 없어요.</Note>
      </Section>
      <Section id="sys-m3only" title="머티리얼에만 있는 이름" desc={<><a href="#/material">머티리얼 디자인 가이드 →</a></>}>
        <table className="sys-table"><tbody>{M3_ONLY.map(([n, d]) => <tr key={n}><td className="m" style={{ width: '38%' }}>{n}</td><td>{d}</td></tr>)}</tbody></table>
      </Section>
      <Section id="sys-higonly" title="HIG에만 있는 이름" desc={<><a href="#/hig">애플 HIG 가이드 →</a></>}>
        <table className="sys-table"><tbody>{HIG_ONLY.map(([n, d]) => <tr key={n}><td className="h" style={{ width: '38%' }}>{n}</td><td>{d}</td></tr>)}</tbody></table>
      </Section>
    </SysGrid>
  )
}
