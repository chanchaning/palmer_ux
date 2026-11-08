import type { GuideMeta } from '../registry'

export default {
  id: 'easing',
  num: '08',
  group: '모션',
  nav: '움직임·이징',
  eyebrow: 'GUIDE 08 · EASING',
  title: '같은 거리도 곡선 따라 느낌이 달라요',
  desc: '움직임의 성격은 ‘시간에 따라 얼마나 갔나’를 그린 곡선이 정해요. 그래프의 점과 아래 물체는 같은 곡선으로 움직이고, 흐린 점선은 비교용 직선(Linear)이에요. 재생을 누르고 시간 칩으로 길이를 바꿔보세요.',
  stats: [['9', '모션 패턴'], ['150–400ms', 'UI 권장 시간'], ['LIVE', '곡선 = 실제 움직임']],
  count: 9,
  motion: true,
} satisfies GuideMeta
