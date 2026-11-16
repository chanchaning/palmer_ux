import './hover.css'
import { Caption, Lift, Spotlight, Zoom } from './cards/surface'
import { DimOthers, FillSweep, IconNudge, Underline } from './cards/ink'
import { HoverCard, TooltipDelay } from './cards/timing'

/** GUIDE 34 — 호버 이펙트 */
export default function HoverGuide() {
  return (
    <>
      <div className="grid trans">
        <Lift />
        <Underline />
        <FillSweep />
        <Zoom />
        <Caption />
        <IconNudge />
        <DimOthers />
        <Spotlight />
        <TooltipDelay />
        <HoverCard />
      </div>
      <div className="hv-rules">
        <h3>호버 효과를 넣기 전에</h3>
        <ul>
          <li><b>손가락에는 호버가 없어요.</b> 휴대폰에서는 올리는 동작 자체가 없고, 톡 누르면 호버 모습이 그대로 붙어 버리기도 해요. 호버 스타일은 <code>@media (hover: hover)</code> 안에 넣고, 터치에서는 눌림 반응으로 대신해요.</li>
          <li><b>호버는 덤이에요.</b> 제목, 가격, 삭제 버튼처럼 꼭 필요한 것을 호버 뒤에 숨기지 않아요. 올리지 않아도 쓸 수 있고, 올리면 조금 더 친절해지는 정도가 맞아요.</li>
          <li><b>키보드 초점에도 똑같이.</b> <code>:hover</code>에 준 변화는 <code>:focus-visible</code>에도 줘요. Tab으로 다니는 사람도 지금 어디에 있는지 같은 신호로 알아야 해요.</li>
          <li><b>들어올 때는 빠르게, 100–300ms.</b> 커서가 올라간 순간 바로 반응해야 ‘내가 건드렸다’고 느껴요. 나갈 때는 조금 느려도 괜찮지만, 들어올 때 기다리게 하면 둔해 보여요.</li>
          <li><b>자리를 바꾸지 않아요.</b> 올렸더니 크기나 여백이 바뀌어 옆의 것이 밀려나면, 커서 아래에서 버튼이 도망가요. transform, opacity, 색만 바꿔요.</li>
          <li><b>동작 줄이기 설정 존중.</b> <code>prefers-reduced-motion</code>이 켜져 있으면 떠오르기, 확대, 밀려오는 채움은 끄고 색 변화만 남겨요. 이 페이지의 데모도 그렇게 동작해요. <a href="#/button-state">버튼 상태</a>, <a href="#/micro">마이크로 인터랙션</a>(자석 버튼, 기울어지는 카드, 굴러가는 링크)도 같이 보세요.</li>
        </ul>
      </div>
    </>
  )
}
