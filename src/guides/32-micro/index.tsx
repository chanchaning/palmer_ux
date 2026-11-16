import './micro.css'
import { LikeBurst, Magnetic, Otp, Stepper } from './cards/press'
import { Dock, Dots, Fan, Tilt } from './cards/move'
import { Ghost, RollLinks, Thinking, WeightWave } from './cards/words'

/** GUIDE 32 — 마이크로 인터랙션 */
export default function MicroGuide() {
  return (
    <>
      <div className="grid trans">
        <Magnetic />
        <LikeBurst />
        <Otp />
        <Stepper />
        <Dock />
        <Dots />
        <Tilt />
        <Fan />
        <Thinking />
        <Ghost />
        <WeightWave />
        <RollLinks />
      </div>
      <div className="mc-rules">
        <h3>작은 움직임을 넣기 전에</h3>
        <ul>
          <li><b>없어도 쓸 수 있어야 해요.</b> 자석 버튼이 안 끌려와도 눌리고, 카드가 안 기울어도 읽혀야 해요. 움직임이 기능을 대신하면 그 순간부터 장식이 아니라 장애물이에요.</li>
          <li><b>손가락에는 커서가 없어요.</b> 자석, 독 확대, 기울기, 굴러가는 링크는 전부 ‘커서를 올린다’는 전제 위에 있어요. 터치 화면에서는 눌림 반응처럼 다른 표현으로 바꾸거나 과감히 빼요.</li>
          <li><b>한 화면에 한두 개.</b> 버튼은 끌려오고 카드는 기울고 글자는 굴러가면 어디에도 눈이 머물지 않아요. 가장 중요한 행동 하나에만 써요.</li>
          <li><b>동작 줄이기 설정 존중.</b> <code>prefers-reduced-motion</code>이 켜져 있으면 끌림, 기울기, 튀는 조각은 끄고 색이나 굵기 변화만 남겨요. 이 페이지의 데모도 그렇게 동작해요.</li>
          <li><b>자주 보는 것일수록 짧게.</b> 하루에 수십 번 누르는 좋아요는 0.4초도 길 수 있어요. 처음엔 즐겁던 움직임이 열 번째엔 기다림이 돼요. <a href="#/easing">움직임·이징</a>, <a href="#/done">완료 표현</a>도 같이 보세요.</li>
        </ul>
        <p className="mc-credit">
          어떤 움직임을 다룰지는 <a href="https://designbookmark.com/motion" target="_blank" rel="noreferrer">DesignBookmark Motion</a>, <a href="https://kokonutui.com" target="_blank" rel="noreferrer">Kokonut UI</a>, <a href="https://smoothui.dev" target="_blank" rel="noreferrer">SmoothUI</a>의 목록을 참고해 골랐어요. 데모 코드는 모두 이 도감에서 CSS와 Web Animations API로 새로 짰어요.
        </p>
      </div>
    </>
  )
}
