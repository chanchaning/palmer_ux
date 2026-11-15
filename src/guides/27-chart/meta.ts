import type { GuideMeta } from '../registry'

export default {
  id: 'chart',
  num: '27',
  group: '컴포넌트',
  nav: '차트',
  eyebrow: 'GUIDE 27 · CHART',
  title: '숫자에도 그림 이름이 있어요',
  desc: '같은 숫자도 막대로 그리면 ‘크기 비교’, 선으로 그리면 ‘흐름’, 도넛으로 그리면 ‘비율’이 돼요. 무엇을 보여줄지 먼저 정하고 모양을 고르세요. 가상의 동네 카페 ‘달빛커피’ 데이터로 차트마다 올려 보고, 기간을 바꾸고, 흔한 실수도 직접 켜 보세요.',
  stats: [['9', '차트 모양'], ['5개 이하', '도넛 조각'], ['0', '막대 축의 시작']],
  count: 9,
} satisfies GuideMeta
