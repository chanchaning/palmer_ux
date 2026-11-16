import './scroll.css'
import { FadeUp, Parallax, ScaleIn, TextReveal } from './cards/enter'
import { Horizontal, Stack, Sticky } from './cards/pin'
import { Infinite, Progress } from './cards/flow'

/** GUIDE 33 — 스크롤 이벤트 */
export default function ScrollGuide() {
  return (
    <>
      <div className="sc-two">
        <div>
          <h3>따라가기<span>Scrub</span></h3>
          <p>내린 거리가 곧 움직임의 진행률이에요. 손을 멈추면 같이 멈추고, 올리면 되감겨요. <b>패럴랙스, 텍스트 리빌, 가로 스크롤, 스태커, 진행 바</b>가 여기에 들어요.</p>
        </div>
        <div>
          <h3>한 번 재생<span>Trigger</span></h3>
          <p>스크롤은 방아쇠일 뿐이에요. 기준선을 넘는 순간 정해진 시간만큼 재생되고 끝나요. <b>페이드 업, 숨었다 나오는 헤더, 무한 스크롤</b>이 여기에 들어요. 스케일 인은 둘 다 돼요.</p>
        </div>
      </div>
      <div className="grid trans">
        <Parallax />
        <FadeUp />
        <Sticky />
        <Horizontal />
        <ScaleIn />
        <TextReveal />
        <Stack />
        <Progress />
        <Infinite />
      </div>
      <div className="sc-rules">
        <h3>스크롤에 움직임을 걸기 전에</h3>
        <ul>
          <li><b>스크롤은 사용자 거예요.</b> 속도를 바꾸거나, 한 칸씩 강제로 넘기거나, 방향을 틀면 ‘내 손이 안 먹는다’고 느껴요. 붙잡아 두는 구간(가로 스크롤, 텍스트 리빌)은 한 페이지에 한두 번, 짧게만 써요.</li>
          <li><b>안 움직여도 내용은 보여야 해요.</b> 처음부터 투명하게 숨겨 놓고 스크립트로 나타나게 하면, 스크립트가 늦거나 실패했을 때 빈 화면만 남아요. 숨기는 스타일은 스크립트가 준비된 뒤에 붙여요.</li>
          <li><b>transform과 opacity만 바꿔요.</b> 높이, 위치(top), 여백을 스크롤마다 바꾸면 화면 배치를 매번 다시 계산해서 버벅여요. 스크롤 이벤트를 직접 듣기보다 <code>IntersectionObserver</code>나 CSS <code>animation-timeline: view()</code>를 먼저 떠올려요.</li>
          <li><b>따라가기는 장식에, 한 번 재생은 등장에.</b> 읽어야 할 본문이 스크롤을 따라 계속 움직이면 눈이 쫓아가느라 못 읽어요. 본문은 한 번 나타나면 가만히 있게 해요.</li>
          <li><b>동작 줄이기 설정 존중.</b> <code>prefers-reduced-motion</code>이 켜져 있으면 패럴랙스와 크기 변화는 끄고, 나타날 때 투명도만 남겨요. 이 페이지의 데모도 그렇게 동작해요.</li>
          <li><b>휴대폰에서 먼저 확인해요.</b> 손가락으로 튕기면 한 번에 화면 몇 장을 지나가요. 효과가 그 속도를 못 따라가면 빈 자리만 보여요. <a href="#/easing">움직임·이징</a>, <a href="#/micro">마이크로 인터랙션</a>, <a href="#/gesture">제스처</a>도 같이 보세요.</li>
        </ul>
      </div>
    </>
  )
}
