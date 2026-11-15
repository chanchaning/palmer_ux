import './date.css'
import { MonthPicker, QuickChips, TimeSlots } from './cards/pick'
import { Calendar, Range, Wheel } from './cards/cal'
import { CheckInOut, DateInput, Recurrence } from './cards/form'

/** GUIDE 26 — 날짜·시간 선택 */
export default function DateGuide() {
  return (
    <>
      <div className="grid trans">
        <QuickChips />
        <TimeSlots />
        <MonthPicker />
        <Calendar />
        <Wheel />
        <Range />
        <DateInput />
        <CheckInOut />
        <Recurrence />
      </div>
      <div className="dt-rules">
        <h3>날짜 고르기 공통 규칙</h3>
        <ul>
          <li><b>얼마나 먼 날인지부터.</b> 며칠 안이면 칩, 몇 주 안이면 달력, 몇 년 전이면 직접 입력이 빨라요.</li>
          <li><b>못 고르는 날은 숨기지 말고 흐리게.</b> 누르면 ‘일요일은 쉬어요’, ‘최소 2박’처럼 이유를 알려줘요.</li>
          <li><b>요일을 같이 보여주기.</b> ‘11월 21일’보다 ‘11월 21일 (토)’가 훨씬 빨리 와닿아요.</li>
          <li><b>고른 결과는 문장으로 다시 읽어주기.</b> ‘3박 · 11월 23일 → 26일’, ‘매주 월·수 오전 9시’처럼 확인할 수 있게 해요.</li>
          <li><b>키보드와 화면 낭독기도.</b> 달력 칸은 방향키로 움직이고, 각 칸에는 ‘11월 20일 (금)’처럼 전체 날짜를 읽어줘요.</li>
        </ul>
      </div>
    </>
  )
}
