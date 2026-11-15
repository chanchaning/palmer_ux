import './done.css'
import { ButtonMorph, CheckDraw, ProgressDone, StrikeThrough } from './cards/small'
import { BadgeUnlock, Sent, Stamp } from './cards/mark'
import { Confetti, SuccessScreen } from './cards/big'

/** GUIDE 30 — 완료 표현 */
export default function DoneGuide() {
  return (
    <>
      <div className="grid trans">
        <CheckDraw />
        <StrikeThrough />
        <ButtonMorph />
        <ProgressDone />
        <Sent />
        <Stamp />
        <BadgeUnlock />
        <Confetti />
        <SuccessScreen />
      </div>
      <div className="dn-rules">
        <h3>완료의 무게는 일의 크기에 맞춰요</h3>
        <div className="dn-scale">
          <div><b>작은 일</b><span>저장, 체크, 복사</span><em>체크 그리기 · 줄긋기 · 0.3–0.6초</em></div>
          <div><b>중간 일</b><span>보내기, 올리기, 결제</span><em>버튼 모핑 · 진행률 · 보냄 · 결과 문구</em></div>
          <div><b>큰 일</b><span>첫 주문, 목표 달성, 수료</span><em>배지 · 컨페티 · 완료 화면 · 흐름에 한 번</em></div>
        </div>
        <ul>
          <li><b>너무 큰 축하는 오히려 가벼워요.</b> 메모 하나 저장했는데 색종이가 터지면 장난처럼 보이고, 매일 보면 귀찮아져요. 큰 축하는 드물어야 값어치가 있어요.</li>
          <li><b>끝이 기억을 정해요.</b> 사람은 경험 전체의 평균이 아니라 가장 강한 순간과 마지막 순간으로 기억해요. <a href="#/bias/bias-peak">피크엔드 법칙(인지 편향)</a>, <a href="#/laws/laws-peak">피크엔드 법칙(UX 법칙)</a>도 같이 보세요.</li>
          <li><b>모션은 거들 뿐, 글이 본체.</b> ‘저장했어요’, ‘보냈어요’처럼 무엇이 끝났는지 글로 꼭 남기고, 화면 낭독기에도 <code>aria-live</code>로 알려요.</li>
          <li><b>동작 줄이기 설정 존중.</b> <code>prefers-reduced-motion</code>이 켜져 있으면 날아가고 튀는 대신 바로 결과를 보여주거나 조용히 밝아지게 해요.</li>
          <li><b>축하 다음엔 다음 할 일.</b> 완료 화면에는 ‘주문 내역 보기’처럼 이어서 할 행동을 하나 크게 둬요.</li>
        </ul>
      </div>
    </>
  )
}
