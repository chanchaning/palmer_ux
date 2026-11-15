import './collection.css'
import { CardsView, GridView, ListView } from './cards/basic'
import { Carousel, Table, Timeline } from './cards/flow'
import { Accordion, Infinite, Masonry } from './cards/more'

/** GUIDE 22 — 목록 보여주기 */
export default function CollectionGuide() {
  return (
    <>
      <div className="grid trans">
        <ListView />
        <GridView />
        <CardsView />
        <Carousel />
        <Table />
        <Timeline />
        <Accordion />
        <Masonry />
        <Infinite />
      </div>
      <div className="cl-rules">
        <h3>무엇을 고를까요</h3>
        <ul>
          <li><b>글로 비교하면 리스트, 그림으로 고르면 그리드.</b> 이름과 가격을 내려가며 보는지, 사진을 훑어보는지 먼저 정해요.</li>
          <li><b>기준이 여러 개면 테이블.</b> 가격 · 칼로리 · 주문 수를 동시에 비교하고 정렬해야 한다면 칸을 맞춰야 해요.</li>
          <li><b>순서가 의미면 타임라인, 묶음이 의미면 아코디언.</b> ‘언제’가 중요한지 ‘어느 분류’가 중요한지에 따라 나눠요.</li>
          <li><b>캐러셀과 무한 스크롤은 둘러보기용.</b> 꼭 찾아야 하는 항목을 여기에 숨기면 대부분은 못 보고 지나가요.</li>
          <li><b>하나만 고르기 어렵다면 보기 전환.</b> 리스트 ↔ 그리드처럼 같은 데이터를 두 모양으로 바꿔 볼 수 있게 해도 좋아요. 대신 사용자가 고른 보기는 기억해 두세요.</li>
        </ul>
      </div>
    </>
  )
}
