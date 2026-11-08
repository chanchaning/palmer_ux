import './hig.css'
import { Clarity, Deference, Depth, Hardware } from './cards/principles'
import { EdgeSwipe, LargeTitle, Rubber, TabBar, ToolVsTab } from './cards/navigation'
import { ContextMenu, EditMenu, Popover } from './cards/menus'
import { Controls, LiveActivity } from './cards/controls'

/** GUIDE 17 — 애플 휴먼 인터페이스 가이드라인 */
export default function HigGuide() {
  return (
    <>
      <div className="grid trans">
        <Clarity />
        <Deference />
        <Depth />
        <Hardware />
        <TabBar />
        <EdgeSwipe />
        <Rubber />
        <LargeTitle />
        <ToolVsTab />
        <ContextMenu />
        <EditMenu />
        <Popover />
        <Controls />
        <LiveActivity />
      </div>
      <p className="hig-src">
        규격 요약 · 단위 pt · 최소 터치 영역 44×44pt · 서체 San Francisco(SF Pro) / Apple SD 산돌고딕 · 뒤로가기 = 좌측 끝 스와이프 + ‹ 뒤로 · 입체감 = 반투명 블러와 레이어 겹침 · 상단 바 = 중앙 정렬 또는 Large Title<br />
        데모는 웹으로 재현한 학습용이에요. 데모 글꼴은 시스템 글꼴이라 애플 기기에서는 SF로 보여요.
      </p>
    </>
  )
}
