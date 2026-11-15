import './type-style.css'
import { Acid, Glitch, NeonSign, Outline, Puffy } from './cards/loud'
import { ArtDeco, Bauhaus, HandLettering, MinimalType, Monospace } from './cards/classic'

/** GUIDE 31 — 글자 스타일 */
export default function TypeStyleGuide() {
  return (
    <>
      <p className="tys-note">
        이 페이지는 <b>Pretendard 한 가지 글꼴</b>에 CSS(굵기·자간·그림자·그라디언트·테두리·SVG 필터)만 더해 느낌을 흉내 냈어요.
        실제 작업에서는 스타일에 맞는 전용 글꼴을 라이선스를 확인해 쓰면 훨씬 또렷해져요.
        화면 전체의 스타일은 <a href="#/style">디자인 스타일</a>, 읽기 좋은 숫자는 <a href="#/type">타이포그래피</a>에서 볼 수 있어요.
      </p>
      <div className="grid pairs">
        <Acid />
        <Glitch />
        <Puffy />
        <Bauhaus />
        <ArtDeco />
        <Outline />
        <MinimalType />
        <HandLettering />
        <Monospace />
        <NeonSign />
      </div>
      <div className="tys-rules">
        <h3>글자 스타일을 부탁할 때</h3>
        <ul>
          <li><b>이름 + 재료 + 분위기.</b> ‘애시드 그래픽’만 말하기보다 ‘크롬 금속 글자, 녹아 휜 형태, 검은 바탕’처럼 무엇으로 만든 느낌인지 함께 말하면 결과가 훨씬 비슷해져요.</li>
          <li><b>꾸민 글자는 제목에만.</b> 장식이 큰 스타일일수록 짧은 제목·로고 한 줄에만 쓰고, 본문·버튼·가격은 평범한 글자로 둬요.</li>
          <li><b>그림 글자에도 진짜 글자.</b> 이미지로 만든 제목은 화면 낭독기와 검색이 읽지 못해요. 같은 문구를 글자(alt, 숨긴 텍스트)로 꼭 함께 넣어요.</li>
          <li><b>대비 확인.</b> 금색·형광·속 빈 글자는 바탕에 따라 거의 안 보일 수 있어요. 큰 글자도 최소 3:1 대비를 지켜요.</li>
        </ul>
      </div>
    </>
  )
}
