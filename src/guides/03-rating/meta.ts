import type { GuideMeta } from '../registry'

export default {
  id: 'rating',
  num: '03',
  group: '컴포넌트',
  nav: '평점·평가',
  eyebrow: 'GUIDE 03 · RATING',
  title: '점수를 묻는 방법도 여러 가지예요',
  desc: '별 다섯 개, 얼굴 다섯 개, 0부터 10까지의 숫자. 무엇을 알고 싶은지에 따라 평가 UI가 달라져요. 입력하는 쪽(별점·NPS)과 보여주는 쪽(요약·배지)을 모두 직접 눌러보세요.',
  stats: [['9', '평가 방식'], ['5 · 10 · 11', '척도 단계'], ['LIVE', '전부 실제 동작']],
  count: 9,
} satisfies GuideMeta
