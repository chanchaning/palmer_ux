import './text.css'
import { CountUp, FadeUp, Scramble, Stagger, Typing } from './cards/enter'
import { BlurIn, Highlight, MaskReveal, WordRotate } from './cards/accent'

/** GUIDE 21 — 글자 모션 */
export default function TextGuide() {
  return (
    <>
      <div className="grid pairs">
        <Typing />
        <Stagger />
        <Scramble />
        <FadeUp />
        <CountUp />
        <MaskReveal />
        <BlurIn />
        <WordRotate />
        <Highlight />
      </div>
      <div className="tx-rules">
        <h3>글자 모션 공통 규칙</h3>
        <ul>
          <li><b>한 화면에 하나만.</b> 제목·숫자·문구가 동시에 움직이면 어디를 봐야 할지 몰라요. 가장 중요한 한 곳에만 써요.</li>
          <li><b>읽는 속도를 이기지 않기.</b> 글자가 다 나타나기 전에는 읽을 수 없어요. 본문 전체를 움직이지 말고 제목·숫자처럼 짧은 곳에만 써요.</li>
          <li><b>동작 줄이기 설정 존중.</b> 사용자가 기기에서 ‘동작 줄이기’를 켰다면(<code>prefers-reduced-motion</code>) 최종 글자를 바로 보여줘요.</li>
          <li><b>화면 낭독기에는 완성된 문장.</b> 글자를 쪼갠 조각은 <code>aria-hidden</code>으로 숨기고, 바깥에 완성 문장을 <code>aria-label</code>로 줘요.</li>
          <li><b>다시 볼 때는 생략.</b> 첫 방문 때 한 번이면 충분해요. 탭을 오갈 때마다 다시 타이핑되면 금방 지쳐요.</li>
        </ul>
      </div>
    </>
  )
}
